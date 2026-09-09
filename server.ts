process.env.TZ = 'Indian/Maldives';
import express, { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { db, verifyPin, hashPin, generateSalt } from './src/server/db';
import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';
import { ALL_MODULES } from './src/server/seedData';
import { bucket, firestore } from './src/server/firebase';
import { realtimeBroadcaster } from './src/server/realtime';
import { rentalDb } from './src/server/rentalDb';
import { registerRentalRoutes } from './src/server/rentalRoutes';
import {
  User,
  PublicSiteData,
  QuizQuestion,
  QuizSubmission,
  QuizWinner,
  QuizPrize,
  QuizSponsor,
  ModuleKey,
  ModulePermission
} from './src/types';

const app = express();
const PORT = 3000;

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure fresh data on every API request - prevent any client or intermediary caching
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

app.get('/favicon.ico', (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'public', 'favicon.ico'));
});

app.get('/api/public/app-icon', (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'public', 'arc-app-icon.png'));
});

// Active In-Memory Sessions cache with Cloud Firestore persistence
interface Session {
  token: string;
  userId: string;
  expiresAt: number;
  lastSavedAt?: number;
  cachedUser?: User;
  cachedUserAt?: number;
}
const sessions = new Map<string, Session>();

// Session cleanup interval
setInterval(async () => {
  const now = Date.now();
  for (const [token, sess] of sessions.entries()) {
    if (sess.expiresAt < now) {
      sessions.delete(token);
      await db.deleteSession(token).catch(err => console.error('Error deleting session:', err));
    }
  }
}, 60000);

// Background activity process: auto-score submissions when deadline passes & auto-draw winner at winner announcement time
async function runQuizBackgroundProcess() {
  try {
    const questions = await db.getQuizQuestions();
    const submissions = await db.getQuizSubmissions();
    const winners = await db.getQuizWinners();
    const ineligibleSet = new Set(await db.getIneligibleParticipantIds());
    const settings = await db.getSettings();
    const offsetMinutesSetting = Number(settings.find(s => s.key === 'timeOffsetMinutes')?.value || 0);
    const nowMs = Date.now() + (offsetMinutesSetting * 60 * 1000);

    for (const q of questions) {
      if (q.status === 'cancelled') continue;

      const closeMs = q.closeAt ? new Date(q.closeAt).getTime() : 0;
      const parsedDraw = q.drawStartAt ? new Date(q.drawStartAt).getTime() : NaN;
      const drawMs = !isNaN(parsedDraw) ? parsedDraw : closeMs;
      const parsedReveal = q.revealAt ? new Date(q.revealAt).getTime() : NaN;
      const revealMs = !isNaN(parsedReveal) ? parsedReveal : (drawMs + (q.rollingDurationSeconds || 10) * 1000);

      // 1. When submission deadline passes, evaluate all submissions for this question
      if (closeMs > 0 && nowMs >= closeMs) {
        const qSubmissions = submissions.filter(s => s.questionId === q.id && !s.isInvalid);
        for (const sub of qSubmissions) {
          const isCorrect = sub.selectedOptionId === q.correctOptionId;
          const normId = (sub.normalizedIdNumber || '').toUpperCase();
          const isMasterIneligible = ineligibleSet.has(normId);
          const isDisqualified = Boolean(sub.isDisqualified || isMasterIneligible);

          const isEligible = Boolean(isCorrect && !isDisqualified);
          if (sub.isCorrect !== isCorrect || sub.isEligible !== isEligible) {
            // Update submission evaluation in Firestore
            await db.createQuizSubmission({
              ...sub,
              isCorrect,
              isEligible
            }).catch(e => console.error('Error updating submission evaluation:', e));
          }
        }
      }

      // 2. When winner announcement time (revealMs) arrives, auto-draw winner if not already drawn
      if (revealMs > 0 && nowMs >= revealMs) {
        const existingWinner = winners.find(w => w.questionId === q.id && w.publicStatus === 'published' && !w.isReplaced);
        if (!existingWinner) {
          try {
            const drawResult = await db.drawQuizWinner(q.id, 'system');
            if (drawResult?.winner) {
              await db.logAudit({
                userId: 'system',
                username: 'system',
                fullName: 'Background System Activity',
                action: 'AUTO_SELECT_QUIZ_WINNER',
                module: 'quiz',
                recordId: drawResult.winner.id,
                reason: 'Automatic background draw at Winner Announcement Time'
              });
              realtimeBroadcaster.broadcast('quiz_winners', 'create', drawResult.winner);
              realtimeBroadcaster.broadcast('quiz_questions', 'update', { id: q.id, status: 'completed' });
            }
          } catch (autoDrawErr: any) {
            // No eligible submissions or already drawn - ignore
          }
        }
      }
    }
  } catch (err: any) {
    // Gracefully handle database or permission errors without noisy stack traces
    if (!err?.message?.includes('PERMISSION_DENIED')) {
      console.error('Notice in runQuizBackgroundProcess:', err?.message || err);
    }
  }
}

// Start background activity runner every 60 seconds (quota-friendly)
setInterval(runQuizBackgroundProcess, 60000);

// Global Admin Checker Helper
function isUserAdmin(user: any): boolean {
  if (!user) return false;
  const roleName = (user.roleName || '').toLowerCase();
  const roleId = (user.roleId || '').toLowerCase();
  const username = (user.username || '').toLowerCase();
  const role = (user.role || '').toLowerCase();
  return (
    roleName === 'admin' ||
    roleName.includes('admin') ||
    roleId === 'role_admin' ||
    roleId === 'admin' ||
    roleId.includes('admin') ||
    username === 'admin' ||
    role === 'admin' ||
    role === 'super_admin' ||
    user.isAdmin === true
  );
}

// Helper to sanitize User object for client response
function sanitizeUser(u: any): User {
  const { pinHash, pinSalt, ...safeUser } = u;
  if (isUserAdmin(safeUser)) {
    // Admin must have all modules and actions authorized
    safeUser.permissions = ALL_MODULES.map(m => ({
      id: `perm_admin_${m}`,
      userId: safeUser.id,
      moduleKey: m,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canPublish: true,
      canApprove: true,
      canExport: true,
      canManageSettings: true
    }));
  }
  return safeUser as User;
}

// Authentication Middleware
async function authenticateSession(req: Request, res: Response, next: NextFunction) {
  try {
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.headers['x-auth-token']) {
      token = String(req.headers['x-auth-token']).trim();
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:arc_auth_token|sessionToken|token)=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]).trim();
      }
    }

    if (!token && typeof req.query.token === 'string') {
      token = req.query.token.trim();
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    let session = sessions.get(token);

    if (!session) {
      const dbSession = await db.getSessionByToken(token);
      if (dbSession && !dbSession.revokedAt && dbSession.expiresAt > Date.now()) {
        session = {
          token,
          userId: dbSession.userId,
          expiresAt: dbSession.expiresAt
        };
        sessions.set(token, session);
      }
    }

    if (!session || session.expiresAt < Date.now()) {
      if (session) {
        sessions.delete(token);
        await db.deleteSession(token).catch(() => {});
      }
      return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    }

    // Touch session non-blocking
    db.touchSession(token);

    const now = Date.now();
    // Check user cache with 60s TTL
    let user = session.cachedUser;
    if (!user || !session.cachedUserAt || (now - session.cachedUserAt > 60 * 1000)) {
      user = (await db.getUserById(session.userId)) || undefined;
      if (user) {
        session.cachedUser = user;
        session.cachedUserAt = now;
      }
    }

    if (!user || user.status !== 'active') {
      sessions.delete(token);
      await db.deleteSession(token).catch(() => {});
      return res.status(403).json({ error: 'Account is deactivated or locked.' });
    }

    if (user.lockedUntil && Number(user.lockedUntil) > Date.now()) {
      sessions.delete(token);
      await db.deleteSession(token).catch(() => {});
      return res.status(403).json({ error: 'Account is temporarily locked.' });
    }

    (req as any).user = user;
    (req as any).token = token;
    next();
  } catch (err: any) {
    console.error('Authentication middleware error:', err);
    return res.status(500).json({ error: `Authentication Error: ${err.message}` });
  }
}

// Module Permission Middleware Creator
function requirePermission(moduleKey: ModuleKey, actionKey: keyof Omit<ModulePermission, 'id' | 'userId' | 'moduleKey'> = 'canView') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user: User = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    // Admin user has universal authorization across all modules and all actions
    if (isUserAdmin(user)) return next();

    if (moduleKey === 'audit_logs') {
      return res.status(403).json({ error: 'System Audit Logs are restricted to Admin users only.' });
    }

    const aliases: Record<string, string[]> = {
      contacts: ['contacts', 'contact', 'content'],
      contact: ['contacts', 'contact', 'content'],
      slideshow: ['slideshow', 'content'],
      vision_mission: ['vision_mission', 'content'],
      social_media: ['social_media', 'content'],
      exco_team: ['exco_team', 'content'],
      content: ['content', 'slideshow', 'vision_mission', 'contacts', 'contact', 'social_media', 'exco_team'],
      events: ['events', 'events_meetings'],
      events_meetings: ['events_meetings', 'events'],
      quiz: ['quiz', 'ramazan_quiz'],
      ramazan_quiz: ['ramazan_quiz', 'quiz', 'quiz_participants', 'quiz_winners'],
      users: ['users', 'roles_permissions', 'roles'],
      roles_permissions: ['roles_permissions', 'roles', 'users'],
      health_awareness: ['health_awareness', 'content'],
      rental_service: ['rental_service']
    };

    const keysToCheck = aliases[moduleKey] || [moduleKey];
    const hasPerm = keysToCheck.some(k => {
      const perm = user.permissions?.find(p => p.moduleKey === k);
      return perm && perm[actionKey];
    });

    if (!hasPerm) {
      return res.status(403).json({ error: `Permission denied. Required: ${moduleKey} (${actionKey}).` });
    }

    next();
  };
}

// ==========================================
// RENTAL SERVICE MODULE ROUTES
// ==========================================
registerRentalRoutes(app, authenticateSession, requirePermission);

// ==========================================
// 0. HEALTH CHECK & DIAGNOSTICS ENDPOINTS
// ==========================================

app.get('/api/health', (req: Request, res: Response) => {
  return res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health/database', async (req: Request, res: Response) => {
  const health = await db.checkDatabaseHealth();
  if (health.schemaReady && health.connected) {
    return res.status(200).json({
      backend: 'firebase-admin',
      projectId: 'gen-lang-client-0224683648',
      databaseId: 'ai-studio-arc-1ed79364-547a-408d-9326-df4162ee21d6',
      database: 'cloud-firestore',
      storage: 'firebase-storage',
      connected: true,
      ready: true
    });
  } else {
    return res.status(503).json({
      backend: 'firebase-admin',
      projectId: 'gen-lang-client-0224683648',
      databaseId: 'ai-studio-arc-1ed79364-547a-408d-9326-df4162ee21d6',
      database: 'cloud-firestore',
      storage: 'firebase-storage',
      connected: health.connected,
      ready: false,
      error: health.error || 'Cloud Firestore database connection is not ready.'
    });
  }
});

app.get('/api/health/db-test', async (req: Request, res: Response) => {
  try {
    const testId = `test_${Date.now()}`;
    await db.logAudit({
      id: testId,
      action: 'DB_HEALTH_DIAGNOSTIC_TEST',
      module: 'settings',
      reason: 'Testing Cloud Firestore persistence write operation'
    });

    const logs = await db.getAuditLogs();
    const found = logs.find(l => l.id === testId);

    if (!found) {
      return res.status(500).json({ ok: false, error: 'Test log inserted but not found on read.' });
    }

    return res.json({
      ok: true,
      backend: 'express-firebase-admin',
      database: 'cloud-firestore',
      message: 'Cloud Firestore database read and write operations verified successfully!',
      testRecord: found
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: `Diagnostic Persistence Error: ${err.message}`
    });
  }
});

app.get('/api/system/db-status', async (req: Request, res: Response) => {
  try {
    const status = await db.getDatabaseStatus();
    return res.json({ ok: true, ...status });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/system/sync', async (req: Request, res: Response) => {
  try {
    const status = await db.syncDatabase();
    realtimeBroadcaster.broadcastSyncAll('system_sync_api');
    return res.json({ ok: true, message: 'Database tables synchronized and persisted successfully.', ...status });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ==========================================
// 0.5. REALTIME DATABASE SYNC STREAM (SSE)
// ==========================================

// Real-time Server-Sent Events (SSE) stream for live database table updates
app.get(['/api/realtime/stream', '/api/realtime/events'], (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || undefined;
  realtimeBroadcaster.addClient(req, res, userId);
});

// Real-time synchronization status & metrics
app.get('/api/realtime/status', (req: Request, res: Response) => {
  res.json({
    ok: true,
    realtimeEngine: 'server-sent-events',
    ...realtimeBroadcaster.getStatus()
  });
});

// Trigger full tables resync broadcast across all connected clients
app.post('/api/realtime/sync-all', (req: Request, res: Response) => {
  const reason = (req.body?.reason as string) || 'client_requested_sync';
  realtimeBroadcaster.broadcastSyncAll(reason);
  res.json({ ok: true, message: 'Full database tables sync signal broadcasted to all connected clients.' });
});

// Broadcast custom table change event (for testing or external webhook updates)
app.post('/api/realtime/broadcast', (req: Request, res: Response) => {
  const { table, action = 'update', id, data } = req.body || {};
  if (!table) {
    return res.status(400).json({ error: 'Table name is required for broadcast.' });
  }
  realtimeBroadcaster.broadcastTableChange(table, action, id, data);
  res.json({ ok: true, message: `Broadcasted ${action} on table ${table}` });
});

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, pin } = req.body;

    if (!username || !pin) {
      return res.status(400).json({ error: 'Incorrect username or PIN.' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const user = await db.getUserByUsername(cleanUsername);

    if (!user || user.status === 'inactive') {
      return res.status(400).json({ error: 'Incorrect username or PIN.' });
    }

    if (user.status === 'locked') {
      return res.status(403).json({ error: 'This user account is currently locked by an administrator.' });
    }

    if (user.lockedUntil && Number(user.lockedUntil) > Date.now()) {
      const remainingSecs = Math.ceil((Number(user.lockedUntil) - Date.now()) / 1000);
      return res.status(429).json({ error: `Account temporarily locked due to failed login attempts. Try again in ${remainingSecs}s.` });
    }

    const isValid = verifyPin(String(pin), user.pinSalt || '', user.pinHash || '');

    if (!isValid) {
      const { count, lockedUntil } = await db.recordFailedLogin(user.id);
      if (lockedUntil) {
        await db.logAudit({
          userId: user.id,
          username: user.username,
          fullName: user.fullName,
          action: 'ACCOUNT_LOCKED_FAILED_LOGINS',
          module: 'auth',
          reason: '5 consecutive failed PIN attempts'
        });
        return res.status(429).json({ error: 'Too many failed login attempts. Account temporarily locked for 15 minutes.' });
      } else {
        await db.logAudit({
          userId: user.id,
          username: user.username,
          fullName: user.fullName,
          action: 'FAILED_LOGIN',
          module: 'auth',
          reason: 'Incorrect PIN provided'
        });
        return res.status(400).json({ error: 'Incorrect username or PIN.' });
      }
    }

    await db.clearFailedLogin(user.id);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
    const sessionObj = { token, userId: user.id, expiresAt };

    sessions.set(token, sessionObj);
    await db.saveSession(sessionObj);

    await db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'USER_LOGIN',
      module: 'auth'
    });

    res.cookie('arc_auth_token', token, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000
    });

    return res.json({
      token,
      user: sanitizeUser(user)
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: `Login Error: ${err.message}` });
  }
});

app.get('/api/auth/me', authenticateSession, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/change-pin', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const isUserAdmin = (user.roleName || user.roleId || '').toLowerCase().includes('admin') || user.roleId === 'role_admin' || user.role === 'admin';

    // Only Admin can change PINs; user panels have PIN changing disabled
    if (!isUserAdmin) {
      return res.status(403).json({
        error: 'Only administrators are authorized to change PIN numbers (ޕިން ބަދަލުކުރެވޭނީ ހަމައެކަނި އެޑްމިނުންނަށެވެ).'
      });
    }

    const { currentPin, newPin, confirmPin } = req.body;

    if (!currentPin || !newPin || !confirmPin) {
      return res.status(400).json({ error: 'All PIN fields are required.' });
    }

    if (newPin !== confirmPin) {
      return res.status(400).json({ error: 'New PIN and Confirm PIN do not match.' });
    }

    if (!/^\d+$/.test(newPin)) {
      return res.status(400).json({ error: 'PIN must contain numeric digits only.' });
    }

    if (newPin.length < 4) {
      return res.status(400).json({ error: 'PIN must be at least 4 digits long.' });
    }

    const isValidCurrent = verifyPin(String(currentPin), user.pinSalt, user.pinHash);
    if (!isValidCurrent) {
      return res.status(400).json({ error: 'Current PIN is incorrect.' });
    }

    const newSalt = generateSalt();
    const newHash = hashPin(String(newPin), newSalt);
    const updatedUser = await db.updateUser(user.id, {
      pinHash: newHash,
      pinSalt: newSalt,
      requirePinChange: false
    });

    await db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'ADMIN_CHANGE_OWN_PIN',
      module: 'auth'
    });

    return res.json({ message: 'PIN updated successfully.', user: sanitizeUser(updatedUser) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/profile', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const isUserAdmin = (user.roleName || user.roleId || '').toLowerCase().includes('admin') || user.roleId === 'role_admin';
    if (!isUserAdmin) {
      return res.status(403).json({ error: 'Only administrators can modify profile information (ޕްރޯފައިލް ބަދަލުކުރުމުގެ ހުއްދަ އޮންނާނީ ހަމައެކަނި އެޑްމިނުންނަށެވެ).' });
    }

    const { fullName, contactNumber, designation, notes } = req.body;

    const updates: any = {};
    if (fullName && fullName.trim()) updates.fullName = fullName.trim();
    if (contactNumber !== undefined) updates.contactNumber = contactNumber;
    if (designation !== undefined) updates.designation = designation;
    if (notes !== undefined) updates.notes = notes;

    const updatedUser = await db.updateUser(user.id, updates);

    await db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'UPDATE_PROFILE',
      module: 'auth'
    });

    return res.json({ message: 'Profile updated successfully.', user: sanitizeUser(updatedUser) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', authenticateSession, async (req: Request, res: Response) => {
  try {
    const token = (req as any).token;
    const user = (req as any).user;

    sessions.delete(token);
    await db.deleteSession(token);

    await db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'USER_LOGOUT',
      module: 'auth'
    });

    res.clearCookie('arc_auth_token', { path: '/' });

    return res.json({ message: 'Logged out successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. PUBLIC SITE ENDPOINTS
// ==========================================

const handlePublicSiteData = async (req: Request, res: Response) => {
  try {
    const settings = await db.getSettings();
    const slideshow = await db.getSlideshow();
    const contacts = await db.getContacts();
    const socialLinks = await db.getSocialLinks();
    const excoMembers = await db.getExcoMembers();
    const events = await db.getEvents();
    const healthAwareness = await db.getHealthAwareness();

    const getSetting = (group: string, key: string, defaultVal: any) => {
      const found = settings.find(s => (s.group === group || (!s.group && group === 'branding')) && s.key === key);
      return (found && found.value !== undefined && found.value !== null) ? found.value : defaultVal;
    };

    const publicData: PublicSiteData = {
      branding: {
        clubName: getSetting('branding', 'clubName', 'ARC - community portal'),
        clubAbbreviation: getSetting('branding', 'clubAbbreviation', 'ARC'),
        logo: getSetting('branding', 'logo', '/arc-app-icon.png'),
        useLogo: Boolean(getSetting('branding', 'useLogo', true)),
        appIcon: getSetting('branding', 'appIcon', '') || getSetting('branding', 'logo', '/arc-app-icon.png'),
        useCustomAppIcon: Boolean(getSetting('branding', 'useCustomAppIcon', false)),
        welcomeHeading: getSetting('branding', 'welcomeHeading', 'އާނަންދަ ރިކުރިއޭޝަން ކުލަބު (ARC) ގެ ވެބްސައިޓަށް މަރުޙަބާ!'),
        welcomeMessage: getSetting('branding', 'welcomeMessage', 'Connecting hearts and encouraging excellence.'),
        aboutText: getSetting('branding', 'aboutText', 'ARC Club is a community organization.'),
        headerTitle: getSetting('branding', 'headerTitle', 'ARC Club'),
        headerSubtitle: getSetting('branding', 'headerSubtitle', 'Community & Youth Empowerment Portal'),
        footerDescription: getSetting('branding', 'footerDescription', 'Official community club website and Ramazan Quiz platform.'),
        copyrightText: getSetting('branding', 'copyrightText', `© ${new Date().getFullYear()} ARC Club. All Rights Reserved.`),
        announcement: getSetting('branding', 'announcement', ''),
        announcementActive: Boolean(getSetting('branding', 'announcementActive', false))
      },
      sectionOrder: getSetting('public_site', 'sectionOrder', ['slideshow', 'welcome', 'vision_mission', 'ramazan_quiz', 'exco_team', 'reach_us', 'social_links']),
      sectionVisibility: getSetting('public_site', 'sectionVisibility', { slideshow: true, welcome: true, vision_mission: true, ramazan_quiz: true, exco_team: true, reach_us: true, social_links: true }),
      slideshow: slideshow.filter(s => s.status === 'active').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
      slideshowSettings: {
        autoplay: true,
        slideDuration: 5000,
        transitionDuration: 800,
        showArrows: true,
        showDots: true,
        pauseOnHover: true
      },
      visionMission: {
        heading: getSetting('branding', 'vmHeading', 'Vision & Mission'),
        introduction: getSetting('branding', 'vmIntro', 'Guiding principles that inspire everything we do.'),
        visionTitle: getSetting('branding', 'visionTitle', 'Our Vision'),
        visionContent: getSetting('branding', 'visionContent', 'To be a beacon of youth engagement, social development, and cultural unity.'),
        missionTitle: getSetting('branding', 'missionTitle', 'Our Mission'),
        missionContent: getSetting('branding', 'missionContent', 'Empowering individuals through recreational, educational, and spiritual opportunities.'),
        bgImage: getSetting('branding', 'vmBgImage', '')
      },
      contacts: contacts.filter(c => c.status === 'active').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
      socialLinks: socialLinks.filter(s => s.status === 'active').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
      excoMembers: excoMembers.filter(e => e.status === 'active').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
      events: events.filter(e => e.status === 'active').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
      healthAwareness: healthAwareness.filter(h => h.status === 'active').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    };

    return res.json(publicData);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

app.get('/api/public/site', handlePublicSiteData);
app.get('/api/public/site-data', handlePublicSiteData);

app.get('/api/public/health-awareness', async (req: Request, res: Response) => {
  try {
    const items = await db.getHealthAwareness();
    return res.json(items.filter(h => h.status === 'active').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Prayer Times Calculation for Today's Date & Auto Device Location
interface PrayerTimeItem {
  key: string;
  nameDv: string;
  time: string;
  isNext: boolean;
}

interface PrayerTimesPayload {
  ok: boolean;
  dateStr: string;
  locationName: string;
  isAutoLocation: boolean;
  coordinates: { latitude: number; longitude: number };
  prayers: PrayerTimeItem[];
  nextPrayer: PrayerTimeItem | null;
  fetchedAt: number;
}

app.get('/api/public/prayer-times', async (req: Request, res: Response) => {
  try {
    const latParam = req.query.lat ? parseFloat(req.query.lat as string) : NaN;
    const lngParam = req.query.lng ? parseFloat(req.query.lng as string) : NaN;
    const tzParam = (req.query.tz as string) || 'Indian/Maldives';

    const isAutoLocation = !isNaN(latParam) && !isNaN(lngParam);
    const latitude = isAutoLocation ? latParam : 4.1755;
    const longitude = isAutoLocation ? lngParam : 73.5093;

    const coordinates = new Coordinates(latitude, longitude);
    const params = CalculationMethod.MuslimWorldLeague();
    params.madhab = Madhab.Shafi;

    const today = new Date();
    const pt = new PrayerTimes(coordinates, today, params);

    const formatTime = (d: Date) => {
      try {
        return new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: tzParam
        }).format(d);
      } catch {
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
      }
    };

    const rawPrayers = [
      { key: 'fajr', nameDv: 'ފަތިސް', date: pt.fajr },
      { key: 'sunrise', nameDv: 'އިރުއަރާ', date: pt.sunrise },
      { key: 'duhr', nameDv: 'މެންދުރު', date: pt.dhuhr },
      { key: 'asr', nameDv: 'ޢަޞްރު', date: pt.asr },
      { key: 'maghrib', nameDv: 'މަޣްރިބް', date: pt.maghrib },
      { key: 'isha', nameDv: 'ޢިޝާ', date: pt.isha }
    ];

    const now = new Date();
    let nextKey = 'fajr';
    if (now < pt.fajr) nextKey = 'fajr';
    else if (now < pt.sunrise) nextKey = 'sunrise';
    else if (now < pt.dhuhr) nextKey = 'dhuhr';
    else if (now < pt.asr) nextKey = 'asr';
    else if (now < pt.maghrib) nextKey = 'maghrib';
    else if (now < pt.isha) nextKey = 'isha';
    else nextKey = 'fajr';

    const prayers: PrayerTimeItem[] = rawPrayers.map((p) => ({
      key: p.key,
      nameDv: p.nameDv,
      time: formatTime(p.date),
      isNext: p.key === nextKey
    }));

    const nextPrayer = prayers.find((p) => p.key === nextKey) || prayers[0];

    const dhivehiDays = ['އާދީއްތަ', 'ހޯމަ', 'އަންގާރަ', 'ބުދަ', 'ބުރާސްފަތި', 'ހުކުރު', 'ހޮނިހިރު'];
    const dhivehiMonths = [
      'ޖެނުއަރީ', 'ފެބްރުއަރީ', 'މާރިޗު', 'އޭޕްރީލް', 'މެއި', 'ޖޫން',
      'ޖުލައި', 'އޯގަސްޓް', 'ސެޕްޓެމްބަރ', 'އޮކްޓޯބަރ', 'ނޮވެމްބަރ', 'ޑިސެމްބަރ'
    ];
    const dateStr = `${dhivehiDays[today.getDay()]}، ${today.getDate()} ${dhivehiMonths[today.getMonth()]} ${today.getFullYear()}`;

    let locationName = 'މާލެ އަދި ކައިރި ސަރަޙައްދު';
    if (isAutoLocation) {
      if (latitude >= -1.5 && latitude <= 7.5 && longitude >= 72.0 && longitude <= 74.5) {
        if (latitude > 6.0) locationName = 'ހއ. / ހދ. ސަރަޙައްދު';
        else if (latitude > 4.8) locationName = 'ށ. / ނ. / ރ. / ބ. ސަރަޙައްދު';
        else if (latitude > 3.8 && latitude <= 4.8) locationName = 'މާލެ އަދި ކައިރި ސަރަޙައްދު';
        else if (latitude > 2.5 && latitude <= 3.8) locationName = 'ވ. / މ. / ފ. / ދ. ސަރަޙައްދު';
        else if (latitude > 1.0 && latitude <= 2.5) locationName = 'ތ. / ލ. ސަރަޙައްދު';
        else if (latitude > -0.2 && latitude <= 1.0) locationName = 'ގއ. / ގދ. ސަރަޙައްދު';
        else locationName = 'ޏ. ފުވައްމުލައް / ސ. އައްޑޫ';
      } else {
        locationName = `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
      }
    }

    const payload: PrayerTimesPayload = {
      ok: true,
      dateStr,
      locationName,
      isAutoLocation,
      coordinates: { latitude, longitude },
      prayers,
      nextPrayer,
      fetchedAt: Date.now()
    };

    return res.json(payload);
  } catch (err: any) {
    console.error('Error calculating prayer times:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/public/time', async (req: Request, res: Response) => {
  try {
    const settings = await db.getSettings();
    const timezoneSetting = settings.find(s => s.key === 'timezone' || s.key === 'hostingTimezone')?.value || 'Indian/Maldives (GMT+05:00)';
    const offsetMinutesSetting = Number(settings.find(s => s.key === 'timeOffsetMinutes')?.value || 0);

    const now = new Date(Date.now() + (offsetMinutesSetting * 60 * 1000));
    return res.json({
      ok: true,
      serverTimeIso: now.toISOString(),
      serverEpoch: now.getTime(),
      timezone: timezoneSetting,
      offsetMinutes: offsetMinutesSetting
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/public/quiz/current', async (req: Request, res: Response) => {
  try {
    const questions = await db.getQuizQuestions();
    const winners = await db.getQuizWinners();
    const settings = await db.getSettings();
    const sponsors = await db.getSponsors();
    const submissions = await db.getQuizSubmissions();
    const offsetMinutesSetting = Number(settings.find(s => s.key === 'timeOffsetMinutes')?.value || 0);
    const timezoneSetting = settings.find(s => s.key === 'timezone' || s.key === 'hostingTimezone')?.value || 'Indian/Maldives (GMT+05:00)';
    const headerTitle = settings.find(s => s.key === 'quizHeaderTitle')?.value || 'ރަމަޟާން 1447 ދުވަހުގެ ކުއިޒް';
    const headerDesc = settings.find(s => s.key === 'quizHeaderDescription')?.value || 'މިއަދުގެ ސުވާލަށް ރަނގަޅު ޖަވާބު ދެއްވައިގެން ގުރާތުގައި ބައިވެރިވެ އަގުހުރި އިނާމު ހޯއްދަވާ!';
    const defaultQuestionImage = settings.find(s => s.key === 'defaultQuestionImage')?.value || '';
    const showQuestionImageSetting = settings.find(s => s.key === 'showQuestionImage')?.value !== 'false';

    const now = new Date(Date.now() + (offsetMinutesSetting * 60 * 1000));
    const nowEpoch = now.getTime();

    const isWinnerAnnounced = (q: QuizQuestion) => {
      if (q.status === 'winner_announced' || q.status === 'completed') return true;
      const publishedWinner = winners.find(w => w.questionId === q.id && w.publicStatus === 'published' && !w.isReplaced);
      return Boolean(publishedWinner);
    };

    const nonCancelled = questions.filter(q => q.status !== 'cancelled');
    const publishedQuestions = nonCancelled
      .filter(q => q.publishAt && new Date(q.publishAt).getTime() <= nowEpoch)
      .sort((a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime());

    const upcomingQuestions = nonCancelled
      .filter(q => q.publishAt && new Date(q.publishAt).getTime() > nowEpoch)
      .sort((a, b) => new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime());

    let activeQuestion: QuizQuestion | undefined;
    let nextUpcoming: QuizQuestion | null = null;
    let isUpcomingScheduled = false;

    if (publishedQuestions.length > 0) {
      // When a new question's publishing time arrives, it becomes activeQuestion immediately.
      // All previous questions are hidden from the active question board.
      activeQuestion = publishedQuestions[0];
      nextUpcoming = upcomingQuestions[0] || null;
    } else if (upcomingQuestions.length > 0) {
      // If no question has reached publishing time yet, show the earliest upcoming scheduled question
      activeQuestion = upcomingQuestions[0];
      nextUpcoming = upcomingQuestions[1] || null;
      isUpcomingScheduled = true;
    }

    if (!activeQuestion) {
      return res.json({
        quizAvailable: false,
        question: null,
        nextQuestion: null,
        winner: null,
        serverTimeEpoch: nowEpoch,
        timezone: timezoneSetting
      });
    }

    const questionWinner = winners.find(w => w.questionId === activeQuestion!.id && w.publicStatus === 'published' && !w.isReplaced) || null;

    // Submission stats for this question
    const qSubmissions = submissions.filter(s => s.questionId === activeQuestion!.id && !s.isInvalid);
    const eligibleCount = qSubmissions.filter(s => s.isCorrect && s.isEligible && !s.isDisqualified).length;
    const correctCount = qSubmissions.filter(s => s.isCorrect).length;
    const hasZeroParticipants = eligibleCount === 0;

    // Determine state based on exact lifecycle times:
    // 1. publishAt: visible question + options + answering enabled (before publishAt: scheduled)
    // 2. closeAt: deadline passed, answering disabled
    // 3. If zero participants, automatically reveal answer right at deadline (closeAt), with no number rolling or winner announcement
    // 4. If participants exist:
    //    - drawStartAt: reveal correct answer & start rolling correct-answered numbers
    //    - revealAt: stop rolling numbers, pick & announce winner
    const pubMs = activeQuestion.publishAt ? new Date(activeQuestion.publishAt).getTime() : 0;
    const closeMs = activeQuestion.closeAt ? new Date(activeQuestion.closeAt).getTime() : 0;
    const drawMs = hasZeroParticipants ? closeMs : (activeQuestion.drawStartAt ? new Date(activeQuestion.drawStartAt).getTime() : closeMs);
    const revealMs = hasZeroParticipants ? closeMs : (activeQuestion.revealAt ? new Date(activeQuestion.revealAt).getTime() : (drawMs + (activeQuestion.rollingDurationSeconds || 10) * 1000));

    let state: 'scheduled' | 'open' | 'closed' | 'draw_running' | 'winner_announced' | 'completed' = 'open';

    if (pubMs > 0 && nowEpoch < pubMs) {
      state = 'scheduled';
    } else if (closeMs > 0 && nowEpoch < closeMs) {
      state = 'open';
    } else if (hasZeroParticipants && closeMs > 0 && nowEpoch >= closeMs) {
      // For zero participants, deadline passed means answer is immediately revealed, marked completed with no winner
      state = 'completed';
    } else if (drawMs > 0 && nowEpoch < drawMs) {
      state = 'closed';
    } else if (revealMs > 0 && nowEpoch < revealMs && !questionWinner) {
      state = 'draw_running';
    } else {
      state = 'winner_announced';
    }

    // Mask correctOptionId and explanation if not yet reached drawStartAt/answer reveal time (or deadline if zero participants)
    const canRevealAnswer = (closeMs > 0 && nowEpoch >= closeMs && hasZeroParticipants) ||
      (drawMs > 0 && nowEpoch >= drawMs) ||
      Boolean(questionWinner) ||
      ['draw_running', 'winner_announced', 'completed'].includes(state);

    const safeQuestion = {
      ...activeQuestion,
      // For zero participants, reveal answer right at deadline
      drawStartAt: hasZeroParticipants && activeQuestion.closeAt ? activeQuestion.closeAt : activeQuestion.drawStartAt,
      revealAt: hasZeroParticipants && activeQuestion.closeAt ? activeQuestion.closeAt : activeQuestion.revealAt,
      correctOptionId: canRevealAnswer ? activeQuestion.correctOptionId : undefined,
      answerExplanation: canRevealAnswer ? activeQuestion.answerExplanation : undefined
    };

    return res.json({
      quizAvailable: true,
      question: safeQuestion,
      nextQuestion: nextUpcoming,
      state,
      winner: questionWinner,
      stats: {
        totalParticipants: qSubmissions.length,
        eligibleCount,
        correctCount
      },
      sponsors: sponsors.filter(s => s.status === 'active'),
      serverTimeEpoch: nowEpoch,
      timezone: timezoneSetting,
      quizHeaderTitle: headerTitle,
      quizHeaderDescription: headerDesc,
      defaultQuestionImage,
      showQuestionImage: showQuestionImageSetting
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/public/quiz/eligible-numbers/:questionId', async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    const questions = await db.getQuizQuestions();
    const q = questions.find(item => item.id === questionId);
    if (!q) {
      return res.status(404).json({ error: 'Quiz question not found.' });
    }

    const settings = await db.getSettings();
    const offsetMinutesSetting = Number(settings.find(s => s.key === 'timeOffsetMinutes')?.value || 0);
    const now = new Date(Date.now() + (offsetMinutesSetting * 60 * 1000));
    const nowEpoch = now.getTime();

    const submissions = await db.getQuizSubmissions();
    const ineligibleSet = new Set(await db.getIneligibleParticipantIds());

    const qSubmissions = submissions.filter(s => s.questionId === questionId && !s.isInvalid);

    // Eligible candidates who submitted the correct answer and are not disqualified
    const eligibleSubmissions = qSubmissions.filter(s =>
      s.isCorrect &&
      !s.isDisqualified &&
      !ineligibleSet.has((s.normalizedIdNumber || '').toUpperCase())
    );

    const participantNumbers = eligibleSubmissions.map(s => s.participantNumber);
    const participantContacts = eligibleSubmissions.map(s => ({
      participantNumber: s.participantNumber,
      contactNumber: s.maskedContactNumber || (s.contactNumber ? `${s.contactNumber.substring(0, 3)}****${s.contactNumber.slice(-2)}` : '****'),
      isEligible: true
    }));

    return res.json({
      questionId,
      totalCount: qSubmissions.length,
      eligibleCount: eligibleSubmissions.length,
      participantNumbers,
      participantContacts,
      rollingDurationSeconds: q.rollingDurationSeconds || 10
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/public/quiz/results', async (req: Request, res: Response) => {
  try {
    const questions = await db.getQuizQuestions();
    const winners = await db.getQuizWinners();
    const publishedWinners = winners.filter(w => w.publicStatus === 'published' && !w.isReplaced);

    const results = questions
      .filter(q => q.status !== 'cancelled')
      .map(q => {
        const winner = publishedWinners.find(w => w.questionId === q.id);
        const correctOpt = (q.options || []).find((o: any) => o.id === q.correctOptionId);
        return {
          questionId: q.id,
          questionNumber: q.questionNumber,
          title: q.title || `Day ${q.questionNumber}`,
          questionText: q.questionText,
          publishAt: q.publishAt,
          closeAt: q.closeAt,
          prizeTitle: q.prizeTitle || winner?.prizeTitle,
          sponsorName: q.sponsorName || winner?.sponsorName,
          correctOptionText: correctOpt?.optionText || '',
          winner: winner ? {
            id: winner.id,
            participantNumber: winner.participantNumber,
            maskedContactNumber: winner.maskedContactNumber,
            prizeTitle: winner.prizeTitle,
            selectedAt: winner.selectedAt
          } : null
        };
      })
      .sort((a, b) => b.questionNumber - a.questionNumber);

    return res.json({ results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/public/quiz/submit', async (req: Request, res: Response) => {
  try {
    const {
      questionId,
      participantName,
      idNumber,
      idCardNumber,
      contactNumber,
      selectedOptionId
    } = req.body;

    const rawId = String(idNumber || idCardNumber || '').trim().toUpperCase();
    const rawContact = String(contactNumber || '').trim().replace(/[\s-]/g, '');

    if (!questionId || !rawId || !rawContact || !selectedOptionId) {
      return res.status(400).json({ error: 'އައިޑީ ކާޑު ނަންބަރާއި ފޯނު ނަންބަރު އަދި ރަނގަޅު ޖަވާބު ޚިޔާރުކުރައްވަން ޖެހޭނެއެވެ (All required fields must be provided).' });
    }

    const questions = await db.getQuizQuestions();
    const q = questions.find(item => item.id === questionId);

    if (!q || q.status === 'cancelled') {
      return res.status(404).json({ error: 'ކުއިޒް ސުވާލު ނުފެނުނު (Quiz question not found or cancelled).' });
    }

    // Check quiz schedule timing
    const settings = await db.getSettings();
    const offsetMinutesSetting = Number(settings.find(s => s.key === 'timeOffsetMinutes')?.value || 0);
    const nowMs = Date.now() + (offsetMinutesSetting * 60 * 1000);

    if (q.publishAt && new Date(q.publishAt).getTime() > nowMs) {
      return res.status(400).json({ error: 'މި ސުވާލު އަދި ޝާއިޢުނުކުރެއެވެ (This question has not yet been published).' });
    }

    if (q.closeAt && new Date(q.closeAt).getTime() <= nowMs) {
      return res.status(400).json({ error: 'މި ސުވާލަށް ޖަވާބު ފޮނުވުމުގެ ސުންގަޑި ހަމަވެއްޖެ (The submission deadline for this question has expired).' });
    }

    const submissions = await db.getQuizSubmissions();
    const existing = submissions.find(s => s.questionId === questionId && s.normalizedIdNumber === rawId && !s.isInvalid);

    if (existing) {
      return res.status(400).json({
        error: `ތިޔަ އައިޑީ ކާޑު ނަންބަރުން (${rawId}) މި ސުވާލަށް ކުރިން ޖަވާބު ފޮނުވާފައިވެއެވެ. (You have already submitted an entry with Participant Number: ${existing.participantNumber}).`,
        existingParticipantNumber: existing.participantNumber
      });
    }

    const maskedId = rawId.length > 4 ? `${rawId.substring(0, 2)}***${rawId.substring(rawId.length - 2)}` : '***';
    const maskedContact = rawContact.length > 4 ? `${rawContact.substring(0, 3)}****${rawContact.substring(rawContact.length - 2)}` : '****';

    const ineligibleSet = new Set(await db.getIneligibleParticipantIds());
    const isMasterIneligible = ineligibleSet.has(rawId);
    const isCorrect = selectedOptionId === q.correctOptionId;
    const isEligible = Boolean(isCorrect && !isMasterIneligible);

    const displayName = (participantName && String(participantName).trim()) ? String(participantName).trim() : maskedId;

    const createdSub = await db.createQuizSubmission({
      questionId,
      participantName: displayName,
      idNumber: rawId,
      normalizedIdNumber: rawId,
      contactNumber: rawContact,
      selectedOptionId,
      isCorrect,
      isEligible,
      isDisqualified: isMasterIneligible,
      maskedIdNumber: maskedId,
      maskedContactNumber: maskedContact
    });

    return res.json({
      ok: true,
      message: 'ޖަވާބު ކާމިޔާބުކަމާއެކު ފޮނުވިއްޖެ! ގުރާތުގައި ބައިވެރިވެވިއްޖެއެވެ.',
      participantNumber: createdSub.participantNumber,
      submission: {
        id: createdSub.id,
        participantNumber: createdSub.participantNumber,
        questionId: createdSub.questionId,
        submittedAt: createdSub.submittedAt,
        maskedIdNumber: createdSub.maskedIdNumber,
        maskedContactNumber: createdSub.maskedContactNumber
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error processing quiz submission' });
  }
});

// ==========================================
// 3. PORTAL MANAGEMENT ENDPOINTS
// ==========================================

app.get('/api/portal/members', authenticateSession, async (req: Request, res: Response) => {
  try {
    const members = await db.getMembers();
    return res.json(members);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/members', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const memberData = req.body;

    if (!memberData.fullName || !memberData.memberNumber) {
      return res.status(400).json({ error: 'Full name and Member Number are required.' });
    }

    const createdMember = await db.createMember({
      ...memberData,
      createdBy: user.fullName
    });

    await db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'CREATE_MEMBER',
      module: 'members',
      recordId: createdMember.id,
      newValue: createdMember
    });

    return res.status(201).json(createdMember);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/members/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const updatedMember = await db.updateMember(id, {
      ...req.body,
      updatedBy: user.fullName
    });

    await db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'UPDATE_MEMBER',
      module: 'members',
      recordId: id,
      newValue: updatedMember
    });

    return res.json(updatedMember);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/members/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    await db.deleteMember(id);

    await db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'DELETE_MEMBER',
      module: 'members',
      recordId: id
    });

    return res.json({ message: 'Member deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/users', authenticateSession, requirePermission('users', 'canView'), async (req: Request, res: Response) => {
  try {
    const users = await db.getUsers();
    return res.json(users.map(sanitizeUser));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/users', authenticateSession, requirePermission('users', 'canCreate'), async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user;
    const { fullName, username, pin, roleId, roleName, designation, contactNumber, memberId, permissions, notes, isActive, status } = req.body;

    if (!username || !pin) {
      return res.status(400).json({ error: 'Username and initial PIN are required.' });
    }

    const cleanUsername = String(username).trim();
    const existing = await db.getUserByUsername(cleanUsername);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
    }

    const roles = await db.getRoles();
    const targetRoleId = roleId || 'role_member';
    const foundRole = roles.find(r => r.id === targetRoleId);
    const resolvedRoleName = (roleName || foundRole?.name || (targetRoleId === 'role_admin' ? 'Admin' : (targetRoleId === 'role_exco' ? 'EXCO Member' : 'Club Member')));
    const isAdmin = targetRoleId === 'role_admin' || resolvedRoleName.toLowerCase() === 'admin';

    // Member linking: Non-admin users must be linked with existing club member
    const members = await db.getMembers();
    let linkedMember = memberId ? members.find(m => m.id === memberId) : undefined;

    if (!isAdmin && !linkedMember) {
      // Try to find matching member by contact number or username
      const contactClean = contactNumber ? String(contactNumber).replace(/[^0-9]/g, '') : '';
      linkedMember = members.find(m => {
        const mPhone = (m.phoneNumber || '').replace(/[^0-9]/g, '');
        const mNum = (m.memberNumber || '').toLowerCase().trim();
        return (contactClean && mPhone && contactClean === mPhone) || (cleanUsername && mNum === cleanUsername.toLowerCase());
      });

      if (!linkedMember) {
        return res.status(400).json({ error: 'Non-admin users must be linked with an existing club member (އެގްޒިސްޓިންގ މެންބަރަކާ ގުޅުވަންޖެހޭނެ).' });
      }
    }

    const resolvedFullName = (fullName || linkedMember?.fullName || cleanUsername).trim();
    const resolvedContact = (contactNumber || linkedMember?.phoneNumber || '').trim();
    const resolvedDesignation = designation || linkedMember?.excoDesignation || '';

    const newSalt = generateSalt();
    const newHash = hashPin(String(pin), newSalt);
    const createdUser = await db.createUser({
      fullName: resolvedFullName,
      username: cleanUsername,
      designation: resolvedDesignation,
      contactNumber: resolvedContact,
      memberId: linkedMember?.id || memberId || undefined,
      memberNumber: linkedMember?.memberNumber || undefined,
      idCardNumber: linkedMember?.idCardNumber || undefined,
      roleId: targetRoleId,
      roleName: resolvedRoleName as any,
      status: status || (isActive === false ? 'inactive' : 'active'),
      requirePinChange: true,
      notes: notes || '',
      pinHash: newHash,
      pinSalt: newSalt,
      permissions: Array.isArray(permissions) ? permissions : (foundRole?.defaultPermissions || [])
    });

    await db.logAudit({
      userId: admin.id,
      username: admin.username,
      fullName: admin.fullName,
      action: 'CREATE_USER',
      module: 'users',
      recordId: createdUser.id,
      newValue: { username: cleanUsername, fullName: resolvedFullName, roleName: resolvedRoleName, memberId: linkedMember?.id }
    });

    return res.status(201).json(sanitizeUser(createdUser));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/users/:id', authenticateSession, requirePermission('users', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user;
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.pin) {
      const newSalt = generateSalt();
      updateData.pinSalt = newSalt;
      updateData.pinHash = hashPin(String(updateData.pin), newSalt);
      delete updateData.pin;
      delete updateData.confirmPin;
    }

    // If memberId is updated or provided, sync member details
    if (updateData.memberId) {
      const members = await db.getMembers();
      const member = members.find(m => m.id === updateData.memberId);
      if (member) {
        updateData.memberNumber = member.memberNumber;
        updateData.idCardNumber = member.idCardNumber || updateData.idCardNumber;
        if (!updateData.contactNumber && member.phoneNumber) updateData.contactNumber = member.phoneNumber;
        if (!updateData.fullName && member.fullName) updateData.fullName = member.fullName;
      }
    }

    const updatedUser = await db.updateUser(id, updateData);

    await db.logAudit({
      userId: admin.id,
      username: admin.username,
      fullName: admin.fullName,
      action: 'UPDATE_USER',
      module: 'users',
      recordId: id,
      newValue: sanitizeUser(updatedUser)
    });

    return res.json(sanitizeUser(updatedUser));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only PIN Change / Reset Endpoint for any user
app.post('/api/portal/users/:id/reset-pin', authenticateSession, requirePermission('users', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user;
    const isUserAdmin = (admin.roleName || admin.roleId || '').toLowerCase().includes('admin') || admin.roleId === 'role_admin' || admin.role === 'admin';
    if (!isUserAdmin) {
      return res.status(403).json({ error: 'Only administrators can change or reset user PINs (ޕިން ބަދަލުކުރެވޭނީ ހަމައެކަނި އެޑްމިނުންނަށެވެ).' });
    }

    const { id } = req.params;
    const { newPin, confirmPin, pin, requirePinChange = true } = req.body;
    const targetPin = String(newPin || pin || '').trim();

    if (!targetPin || !/^\d{4,8}$/.test(targetPin)) {
      return res.status(400).json({ error: 'PIN must be between 4 and 8 numeric digits.' });
    }

    if (confirmPin !== undefined && confirmPin !== null && String(confirmPin).trim() !== targetPin) {
      return res.status(400).json({ error: 'New PIN and Confirm PIN do not match.' });
    }

    const targetUser = await db.getUserById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const newSalt = generateSalt();
    const newHash = hashPin(targetPin, newSalt);
    const updatedUser = await db.updateUser(id, {
      pinHash: newHash,
      pinSalt: newSalt,
      requirePinChange: Boolean(requirePinChange)
    });

    // Revoke all active sessions for that user so they must re-authenticate with new credentials
    const revokedSessionsCount = await db.revokeAllUserSessions(id);

    // Audit Log: USER_PIN_RESET without storing newPin, pinHash, or pinSalt
    await db.logAudit({
      userId: admin.id,
      username: admin.username,
      fullName: admin.fullName,
      action: 'USER_PIN_RESET',
      module: 'users',
      recordId: id,
      newValue: {
        targetUserId: id,
        targetUsername: updatedUser.username,
        performedBy: admin.username,
        performedAt: new Date().toISOString(),
        requirePinChange: Boolean(requirePinChange),
        revokedSessionsCount
      }
    });

    return res.json({
      success: true,
      message: `PIN for user @${updatedUser.username} has been reset successfully. ${revokedSessionsCount} active session(s) revoked.`,
      user: sanitizeUser(updatedUser)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only User Status (Lock/Unlock/Status toggle)
app.put('/api/portal/users/:id/status', authenticateSession, requirePermission('users', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user;
    const { id } = req.params;
    const { isLocked, status } = req.body;

    const newStatus = status ? status : (isLocked ? 'locked' : 'active');
    const updatedUser = await db.updateUser(id, { status: newStatus });

    await db.logAudit({
      userId: admin.id,
      username: admin.username,
      fullName: admin.fullName,
      action: 'UPDATE_USER_STATUS',
      module: 'users',
      recordId: id,
      newValue: { status: newStatus }
    });

    return res.json(sanitizeUser(updatedUser));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/users/:id', authenticateSession, requirePermission('users', 'canDelete'), async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user;
    const { id } = req.params;

    if (id === admin.id) {
      return res.status(400).json({ error: 'You cannot delete your own account while logged in.' });
    }

    await db.deleteUser(id);

    await db.logAudit({
      userId: admin.id,
      username: admin.username,
      fullName: admin.fullName,
      action: 'DELETE_USER',
      module: 'users',
      recordId: id
    });

    return res.json({ message: 'User deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/audit-logs', authenticateSession, requirePermission('audit_logs', 'canView'), async (req: Request, res: Response) => {
  try {
    const logs = await db.getAuditLogs();
    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/settings', authenticateSession, async (req: Request, res: Response) => {
  try {
    const settings = await db.getSettings();
    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/settings', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const settingsList = req.body;

    if (!Array.isArray(settingsList)) {
      return res.status(400).json({ error: 'Payload must be an array of settings objects.' });
    }

    const updated = await db.updateSettings(settingsList);

    await db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'UPDATE_SETTINGS',
      module: 'settings'
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CLOUD FIRESTORE DATABASE TABLES, SYNC & UPLOAD ENDPOINTS
// ==========================================

const uploadsRootDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsRootDir)) {
  fs.mkdirSync(uploadsRootDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsRootDir));

function generateReceiptSvg(reqData: any): string {
  const reqNum = reqData?.requestNumber || reqData?.id || 'ARC-CP-00001';
  const member = reqData?.memberName || 'Club Member';
  const memberNo = reqData?.memberNumber || 'ARC-M';
  const amount = Number(reqData?.totalAmount || 50).toFixed(2);
  const ref = reqData?.referenceNumber || `BML-${Date.now().toString().slice(-8)}`;
  const dateStr = reqData?.submittedAt
    ? new Date(reqData.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = reqData?.submittedAt
    ? new Date(reqData.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '12:00 PM';
  const month = reqData?.month ? `Month ${reqData.month}` : 'Contribution Fee';
  const year = reqData?.contributionYear || reqData?.year || new Date().getFullYear();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 860" width="600" height="860">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#020617"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="50%" stop-color="#0d9488"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
  </defs>

  <rect width="600" height="860" rx="24" fill="url(#bgGrad)" stroke="#1e293b" stroke-width="3"/>
  <rect x="24" y="24" width="552" height="130" rx="16" fill="url(#headerGrad)"/>
  <text x="50" y="70" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="22" font-weight="900" fill="#ffffff" letter-spacing="1">BANK TRANSFER ADVICE</text>
  <text x="50" y="96" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="13" font-weight="700" fill="#a7f3d0">BANK OF MALDIVES (BML) INTERNET BANKING</text>
  <text x="50" y="124" font-family="monospace" font-size="12" font-weight="600" fill="#ecfdf5">STATUS: SUCCESSFUL TRANSFER</text>

  <rect x="24" y="170" width="552" height="100" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
  <text x="50" y="202" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="700" fill="#94a3b8">AMOUNT TRANSFERRED</text>
  <text x="50" y="245" font-family="monospace" font-size="34" font-weight="900" fill="#34d399">${amount} <tspan font-size="18" fill="#6ee7b7">MVR</tspan></text>
  <text x="540" y="235" font-family="monospace" font-size="12" font-weight="700" fill="#38bdf8" text-anchor="end">FEE CONTRIBUTION</text>

  <rect x="24" y="286" width="552" height="420" rx="16" fill="#0b1329" stroke="#1e293b" stroke-width="1.5"/>

  <text x="50" y="322" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="11" font-weight="700" fill="#64748b">TRANSACTION REFERENCE</text>
  <text x="50" y="346" font-family="monospace" font-size="15" font-weight="800" fill="#fbbf24">${ref}</text>
  <line x1="50" y1="366" x2="550" y2="366" stroke="#1e293b" stroke-width="1"/>

  <text x="50" y="396" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="11" font-weight="700" fill="#64748b">MEMBER / SENDER NAME</text>
  <text x="50" y="420" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="16" font-weight="800" fill="#f8fafc">${member}</text>
  <text x="540" y="420" font-family="monospace" font-size="13" font-weight="700" fill="#34d399" text-anchor="end">#${memberNo}</text>
  <line x1="50" y1="440" x2="550" y2="440" stroke="#1e293b" stroke-width="1"/>

  <text x="50" y="470" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="11" font-weight="700" fill="#64748b">BENEFICIARY ACCOUNT</text>
  <text x="50" y="494" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="700" fill="#f8fafc">ARC CLUB MAIN ACCOUNT (BML)</text>
  <text x="540" y="494" font-family="monospace" font-size="13" font-weight="600" fill="#94a3b8" text-anchor="end">7730000123456</text>
  <line x1="50" y1="514" x2="550" y2="514" stroke="#1e293b" stroke-width="1"/>

  <text x="50" y="544" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="11" font-weight="700" fill="#64748b">CONTRIBUTION TARGET</text>
  <text x="50" y="568" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="700" fill="#f8fafc">${month}, Year ${year}</text>
  <text x="540" y="568" font-family="monospace" font-size="12" font-weight="600" fill="#38bdf8" text-anchor="end">ID: ${reqNum}</text>
  <line x1="50" y1="588" x2="550" y2="588" stroke="#1e293b" stroke-width="1"/>

  <text x="50" y="618" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="11" font-weight="700" fill="#64748b">TRANSACTION DATE &amp; TIME</text>
  <text x="50" y="642" font-family="monospace" font-size="14" font-weight="700" fill="#f8fafc">${dateStr}  ${timeStr}</text>
  <line x1="50" y1="662" x2="550" y2="662" stroke="#1e293b" stroke-width="1"/>

  <text x="50" y="692" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="11" font-weight="700" fill="#64748b">PAYMENT CHANNEL</text>
  <text x="50" y="716" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="13" font-weight="700" fill="#a7f3d0">BML Mobile App / Internet Banking Transfer</text>

  <rect x="24" y="722" width="552" height="114" rx="16" fill="#020617" stroke="#334155" stroke-width="1"/>
  <circle cx="60" cy="779" r="16" fill="#059669" fill-opacity="0.2"/>
  <path d="M53 779 l5 5 l10 -10" stroke="#10b981" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="90" y="772" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="800" fill="#34d399">OFFICIALLY RECORDED IN ARC PORTAL</text>
  <text x="90" y="792" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="10" font-weight="500" fill="#94a3b8">Verified electronic transfer advice recorded with member contribution ledger.</text>
</svg>`;
}

// Serve uploaded files securely with Firestore fallback
app.get('/api/portal/uploads/:folder/:fileName(*)', async (req: Request, res: Response) => {
  try {
    const { folder } = req.params;
    const rawFileNameParam = String(req.params.fileName || (req.params as any)[0] || '');
    let decoded = decodeURIComponent(rawFileNameParam);
    if (decoded.includes('/')) {
      decoded = decoded.split('/').pop()!;
    }
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
    const safeFileName = decoded.replace(/[^a-zA-Z0-9._-]/g, '');
    const targetDir = path.join(uploadsRootDir, safeFolder);
    const localPath = path.join(targetDir, safeFileName);
    const baseWithoutExt = safeFileName.replace(/\.[^/.]+$/, '');

    // 1. Check local disk exact
    if (fs.existsSync(localPath)) {
      if (localPath.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
      return res.sendFile(localPath);
    }

    // Check with alternative extensions (.svg, .png, .jpg, .jpeg, .webp, .pdf)
    for (const ext of ['.svg', '.jpg', '.jpeg', '.png', '.webp', '.pdf']) {
      const altPath = path.join(targetDir, `${baseWithoutExt}${ext}`);
      if (fs.existsSync(altPath)) {
        if (ext === '.svg') res.setHeader('Content-Type', 'image/svg+xml');
        return res.sendFile(altPath);
      }
    }

    // Check if any file in targetDir contains baseWithoutExt
    if (fs.existsSync(targetDir)) {
      const dirFiles = fs.readdirSync(targetDir);
      const matched = dirFiles.find(
        f => (baseWithoutExt && f.includes(baseWithoutExt)) || (f && baseWithoutExt.includes(f.replace(/\.[^/.]+$/, '')))
      );
      if (matched) {
        const found = path.join(targetDir, matched);
        if (matched.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
        return res.sendFile(found);
      }
    }

    // 2. Check Firestore uploadedFiles collection (persists across container restarts)
    const docId = `${safeFolder}_${baseWithoutExt}`;
    let fileDoc: any = await firestore.collection('uploadedFiles').doc(docId).get();
    if (!fileDoc.exists) {
      const snap = await firestore.collection('uploadedFiles')
        .where('folder', '==', safeFolder)
        .where('fileName', '==', safeFileName)
        .limit(1)
        .get();
      if (!snap.empty) {
        fileDoc = snap.docs[0];
      }
    }

    if (fileDoc && fileDoc.exists) {
      const data = fileDoc.data() as any;
      if (data.fileData) {
        const mimeType = data.fileType || (safeFileName.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg');
        const base64Data = data.fileData.includes(',') ? data.fileData.split(',')[1] : data.fileData;
        const buffer = Buffer.from(base64Data, 'base64');
        
        try {
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
          fs.writeFileSync(localPath, buffer);
        } catch (_) {}

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(buffer);
      }
    }

    // 3. Fallback for contribution slips: if file is not on disk or in uploadedFiles,
    // look up contributionPaymentRequests to generate authentic SVG voucher!
    if (safeFolder === 'contribution-slips') {
      try {
        let reqData: any = null;
        const docById = await firestore.collection('contributionPaymentRequests').doc(baseWithoutExt).get();
        if (docById.exists) {
          reqData = docById.data();
          reqData.id = docById.id;
        } else {
          const allSnap = await firestore.collection('contributionPaymentRequests').limit(100).get();
          for (const d of allSnap.docs) {
            const data = d.data();
            if (
              d.id === baseWithoutExt ||
              data.slipFileName === safeFileName ||
              data.slipDownloadUrl?.includes(safeFileName) ||
              (baseWithoutExt && data.slipFileName?.includes(baseWithoutExt))
            ) {
              reqData = data;
              reqData.id = d.id;
              break;
            }
          }
        }

        if (reqData) {
          // If reqData already has a data: URL stored, serve that data directly!
          if (reqData.slipDownloadUrl?.startsWith('data:')) {
            const match = reqData.slipDownloadUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              const mime = match[1];
              const buf = Buffer.from(match[2], 'base64');
              res.setHeader('Content-Type', mime);
              res.setHeader('Cache-Control', 'public, max-age=86400');
              return res.send(buf);
            }
          }

          const svgString = generateReceiptSvg(reqData);
          try {
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            fs.writeFileSync(path.join(targetDir, `${baseWithoutExt}.svg`), svgString, 'utf8');
          } catch (_) {}

          res.setHeader('Content-Type', 'image/svg+xml');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(svgString);
        }
      } catch (fbErr) {
        console.warn('[Uploads] Fallback SVG generation failed:', fbErr);
      }
    }

    return res.status(404).json({ error: 'File not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Proxy route to resolve legacy or external storage links
app.get('/api/portal/storage-proxy', async (req: Request, res: Response) => {
  try {
    const targetUrl = String(req.query.url || '').trim();
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing url query parameter' });
    }

    const urlParts = targetUrl.split('/');
    const rawFileName = urlParts[urlParts.length - 1];
    const safeFileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '');

    const candidateFolders = ['contribution-slips', 'uploads'];
    for (const f of candidateFolders) {
      const p = path.join(uploadsRootDir, f, safeFileName);
      if (fs.existsSync(p)) {
        return res.sendFile(p);
      }
      const pSvg = path.join(uploadsRootDir, f, `${safeFileName.replace(/\.[^/.]+$/, '')}.svg`);
      if (fs.existsSync(pSvg)) {
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.sendFile(pSvg);
      }
    }

    try {
      const fetchRes = await fetch(targetUrl);
      if (fetchRes.ok) {
        const contentType = fetchRes.headers.get('content-type') || 'application/octet-stream';
        const arrayBuffer = await fetchRes.arrayBuffer();
        res.setHeader('Content-Type', contentType);
        return res.send(Buffer.from(arrayBuffer));
      }
    } catch (_) {}

    // Fallback: If targetUrl was a contribution slip, generate authentic SVG voucher
    try {
      const allSnap = await firestore.collection('contributionPaymentRequests').limit(100).get();
      let reqData: any = null;
      for (const d of allSnap.docs) {
        const data = d.data();
        if (data.slipDownloadUrl === targetUrl || data.slipDownloadUrl?.includes(safeFileName)) {
          reqData = data;
          reqData.id = d.id;
          break;
        }
      }

      if (reqData) {
        const svgString = generateReceiptSvg(reqData);
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(svgString);
      }
    } catch (_) {}

    return res.status(404).send('Resource not found');
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/upload', authenticateSession, async (req: Request, res: Response) => {
  try {
    const { fileName, fileType, fileData, folder = 'uploads' } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: 'fileData is required' });
    }

    const safeFolder = (folder || 'uploads').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanFileName = `${Date.now()}_${(fileName || 'file').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const targetDir = path.join(uploadsRootDir, safeFolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const localFilePath = path.join(targetDir, cleanFileName);
    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 1. Write file to local disk
    fs.writeFileSync(localFilePath, buffer);

    // 2. Persist in Firestore uploadedFiles so file data survives container refreshes
    const docId = `${safeFolder}_${cleanFileName.replace(/\.[^/.]+$/, '')}`;
    try {
      await firestore.collection('uploadedFiles').doc(docId).set({
        folder: safeFolder,
        fileName: cleanFileName,
        fileType: fileType || 'application/octet-stream',
        fileSize: buffer.length,
        fileData: fileData.startsWith('data:') ? fileData : `data:${fileType || 'image/jpeg'};base64,${base64Data}`,
        createdAt: new Date().toISOString()
      });
    } catch (dbErr) {
      console.warn('[Upload] Notice: Firestore uploadedFiles sync skipped:', dbErr);
    }

    const servedUrl = `/api/portal/uploads/${safeFolder}/${cleanFileName}`;
    return res.json({
      url: servedUrl,
      storagePath: servedUrl,
      fileName: cleanFileName,
      storage: 'local-firestore'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/db/tables', authenticateSession, async (req: Request, res: Response) => {
  try {
    const summary = await db.getDbTablesSummary();
    return res.json(summary);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/sync-db', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await db.syncDatabase();

    await db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'SYNC_DATABASE',
      module: 'settings',
      newValue: { result }
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/db/health', async (req: Request, res: Response) => {
  try {
    const health = await db.checkDatabaseHealth();
    return res.json(health);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/db/export', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const backup = await db.exportFullDatabase();

    await db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'EXPORT_DATABASE_BACKUP',
      module: 'settings'
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=arc_portal_backup_${new Date().toISOString().split('T')[0]}.json`);
    return res.send(JSON.stringify(backup, null, 2));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/db/import', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.roleName !== 'Admin') {
      return res.status(403).json({ error: 'Only administrators can restore database backups.' });
    }

    const { data } = req.body;
    await db.importFullDatabase(data);

    await db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'RESTORE_DATABASE_BACKUP',
      module: 'settings'
    });

    return res.json({ success: true, message: 'Database backup imported successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DASHBOARD STATS
app.get('/api/portal/dashboard/stats', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const members = await db.getMembers();
    const activeMembers = members.filter(m => m.status === 'active').length;
    const pendingMembers = members.filter(m => (m.status as string) === 'pending').length;
    const excoMembers = await db.getExcoMembers();
    const eventItems = await db.getEventItems();
    const meetingItems = await db.getMeetingItems();
    const quizSubmissions = await db.getQuizSubmissions();
    const quizWinners = await db.getQuizWinners();
    const quizQuestions = await db.getQuizQuestions();
    const users = await db.getUsers();
    const messages = await db.getMessages();

    const activeQuestionsList = quizQuestions.filter(q => q.status === 'open' || (q.status as string) === 'published' || (q.status as string) === 'active');
    const activeQuiz = activeQuestionsList.length > 0 ? activeQuestionsList[0] : null;

    const budgetStats = await db.getBudgetStats().catch(() => ({
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      totalAccountsBalance: 0,
      totalContributionsCollected: 0
    }));

    return res.json({
      // Quiz Module
      totalQuizQuestions: quizQuestions.length,
      totalQuestions: quizQuestions.length,
      activeQuizQuestions: activeQuestionsList.length,
      closedQuizQuestions: quizQuestions.filter(q => q.status === 'closed' || q.status === 'completed' || q.status === 'winner_announced' || q.status === 'answer_revealed').length,
      totalQuizParticipants: quizSubmissions.length,
      totalParticipants: quizSubmissions.length,
      correctQuizParticipants: quizSubmissions.filter(s => s.isCorrect).length,
      correctParticipants: quizSubmissions.filter(s => s.isCorrect).length,
      totalQuizWinners: quizWinners.length,
      totalWinners: quizWinners.length,
      collectedPrizes: quizWinners.filter(w => w.prizeCollectionStatus === 'collected').length,
      activeQuiz,

      // Members Module
      totalMembers: members.length,
      activeMembers,
      pendingMembers,
      totalExco: excoMembers.length,

      // Budget & Finance Module
      budget: budgetStats,
      totalIncome: budgetStats?.totalIncome || 0,
      totalExpenses: budgetStats?.totalExpenses || 0,
      netBalance: budgetStats?.netBalance || 0,
      totalAccountsBalance: budgetStats?.totalAccountsBalance || 0,
      totalContributionsCollected: budgetStats?.totalContributionsCollected || 0,

      // Events & Meetings Module
      totalEvents: eventItems.length,
      upcomingEvents: eventItems.filter(e => e.status === 'upcoming').length,
      completedEvents: eventItems.filter(e => e.status === 'completed').length,
      totalMeetings: meetingItems.length,
      upcomingMeetings: meetingItems.filter(m => m.status === 'scheduled').length,
      completedMeetings: meetingItems.filter(m => m.status === 'completed').length,

      // Inbox & Action Records Module
      totalMessages: messages.length,
      unreadMessages: messages.filter(m => m.status === 'pending' || (m.status as string) === 'in_review' || (m.status as string) === 'in_progress').length,
      pendingMessages: messages.filter(m => m.status === 'pending' || (m.status as string) === 'in_review' || (m.status as string) === 'in_progress').length,
      resolvedMessages: messages.filter(m => (m.status as string) === 'resolved' || (m.status as string) === 'archived' || (m.status as string) === 'closed').length,

      // Users & Access Module
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'active').length,
      adminUsers: users.filter(u => u.roleName === 'Admin' || u.roleId === 'role_admin' || u.roleName?.toLowerCase().includes('admin')).length
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// USER PERFORMANCE & CONNECTIONS
app.get('/api/portal/users/:userId/performance', authenticateSession, async (req: Request, res: Response) => {
  try {
    let { userId } = req.params;
    if (userId === 'me' || !userId) {
      userId = (req as any).user.id;
    }
    const performance = await db.getUserPerformance(userId);
    return res.json(performance);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/users/connect-member', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const isUserAdmin = (user.roleName || user.roleId || '').toLowerCase().includes('admin') || user.roleId === 'role_admin';
    if (!isUserAdmin) {
      return res.status(403).json({ error: 'Only administrators can connect or change member profiles (މެންބަރ ޕްރޮފައިލް ގުޅުވައި ބަދަލުކުރެވޭނީ ހަމައެކަނި އެޑްމިނުންނަށެވެ).' });
    }

    const { memberId, query, targetUserId } = req.body;
    const effectiveUserId = (isUserAdmin && targetUserId) ? targetUserId : user.id;
    const members = await db.getMembers();
    let target = memberId ? members.find(m => m.id === memberId) : undefined;
    if (!target && query) {
      const q = String(query).toLowerCase().trim();
      const numOnly = q.replace(/[^0-9]/g, '');
      const idOnly = q.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      target = members.find(m => {
        const memNum = (m.memberNumber || (m as any).membershipNumber || '').toLowerCase().trim();
        const memNumOnly = memNum.replace(/[^0-9]/g, '');
        const idCard = (m.idCardNumber || '').toLowerCase().trim();
        const idCardClean = (m.idCardNumber || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const phone = (m.phoneNumber || '').replace(/[^0-9]/g, '');
        const name = (m.fullName || '').toLowerCase().trim();

        if (memNum === q || idCard === q || name === q || name.includes(q)) return true;
        if (idOnly && idCardClean && (idOnly === idCardClean || idCardClean.includes(idOnly))) return true;
        if (phone && q && phone.includes(q.replace(/[^0-9]/g, ''))) return true;
        if (numOnly && memNumOnly && (numOnly === memNumOnly || parseInt(numOnly, 10) === parseInt(memNumOnly, 10))) return true;
        return false;
      });
    }
    if (!target) {
      return res.status(404).json({ error: 'No matching club member record found. Please verify your National ID card number, Member ID, or registered phone number.' });
    }
    const updated = await db.updateUser(effectiveUserId, {
      memberId: target.id,
      memberNumber: target.memberNumber,
      idCardNumber: target.idCardNumber || user.idCardNumber || '',
      contactNumber: target.phoneNumber || user.contactNumber,
      fullName: user.fullName || target.fullName
    });
    return res.json({
      success: true,
      user: sanitizeUser(updated),
      member: target,
      message: `Successfully connected to member ${target.fullName} (${target.memberNumber || target.idCardNumber})`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/users/disconnect-member', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const isUserAdmin = (user.roleName || user.roleId || '').toLowerCase().includes('admin') || user.roleId === 'role_admin';
    if (!isUserAdmin) {
      return res.status(403).json({ error: 'Only administrators can disconnect member profiles (މެންބަރ ޕްރޮފައިލް ވަކިކުރެވޭނީ ހަމައެކަނި އެޑްމިނުންނަށެވެ).' });
    }

    const { targetUserId } = req.body;
    const effectiveUserId = (isUserAdmin && targetUserId) ? targetUserId : user.id;
    const updated = await db.updateUser(effectiveUserId, {
      memberId: undefined,
      memberNumber: undefined,
      idCardNumber: undefined
    });
    return res.json({ success: true, user: sanitizeUser(updated) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


app.put('/api/portal/users/:id/status', authenticateSession, requirePermission('users', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await db.updateUser(id, { status });
    return res.json(sanitizeUser(updated));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ROLES
app.get('/api/portal/roles', authenticateSession, async (req: Request, res: Response) => {
  try {
    const roles = await db.getRoles();
    return res.json(roles);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/roles', authenticateSession, requirePermission('roles', 'canCreate'), async (req: Request, res: Response) => {
  try {
    const created = await db.createRole(req.body);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/roles/:id', authenticateSession, requirePermission('roles', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const updated = await db.updateRole(req.params.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// SLIDESHOW
app.get('/api/portal/slideshow', authenticateSession, async (req: Request, res: Response) => {
  try {
    const items = await db.getSlideshow();
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/slideshow', authenticateSession, requirePermission('content', 'canCreate'), async (req: Request, res: Response) => {
  try {
    const created = await db.createSlideshowItem(req.body);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/slideshow/:id', authenticateSession, requirePermission('content', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const updated = await db.updateSlideshowItem(req.params.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/slideshow/:id', authenticateSession, requirePermission('content', 'canDelete'), async (req: Request, res: Response) => {
  try {
    await db.deleteSlideshowItem(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// HEALTH AWARENESS PORTAL ROUTES
app.get('/api/portal/health-awareness', authenticateSession, requirePermission('health_awareness', 'canView'), async (req: Request, res: Response) => {
  try {
    const items = await db.getHealthAwareness();
    return res.json(items.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/health-awareness', authenticateSession, requirePermission('health_awareness', 'canCreate'), async (req: Request, res: Response) => {
  try {
    const created = await db.createHealthAwarenessItem(req.body);
    realtimeBroadcaster.broadcastTableChange('health_awareness', 'create', created.id, created);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/health-awareness/:id', authenticateSession, requirePermission('health_awareness', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const updated = await db.updateHealthAwarenessItem(req.params.id, req.body);
    realtimeBroadcaster.broadcastTableChange('health_awareness', 'update', req.params.id, updated);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/health-awareness/:id', authenticateSession, requirePermission('health_awareness', 'canDelete'), async (req: Request, res: Response) => {
  try {
    await db.deleteHealthAwarenessItem(req.params.id);
    realtimeBroadcaster.broadcastTableChange('health_awareness', 'delete', req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// CONTENT / GENERAL SETTINGS
app.get('/api/portal/content', authenticateSession, async (req: Request, res: Response) => {
  try {
    const settings = await db.getSettings();
    const contentSettings: any = { settings };
    settings.forEach(s => {
      if (!contentSettings[s.group]) contentSettings[s.group] = {};
      contentSettings[s.group][s.key] = s.value;
    });
    return res.json(contentSettings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

function syncAppIconFiles(imageVal: string) {
  let tmpSrc = '';
  try {
    if (!imageVal || typeof imageVal !== 'string') return;
    if (!imageVal.startsWith('data:image/')) return;
    const base64Data = imageVal.replace(/^data:image\/\w+;base64,/, '');
    if (!base64Data || base64Data.length < 100) return;
    const buffer = Buffer.from(base64Data, 'base64');
    // Verify PNG/JPEG header magic bytes (PNG: 89 50 4E 47, JPEG: FF D8)
    if (buffer.length < 8) return;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isJpg = buffer[0] === 0xFF && buffer[1] === 0xD8;
    const isWebp = buffer.length > 12 && buffer.toString('ascii', 8, 12) === 'WEBP';
    if (!isPng && !isJpg && !isWebp) return;

    const publicDir = path.join(process.cwd(), 'public');
    tmpSrc = path.join('/tmp', `uploaded_logo_${Date.now()}.png`);
    fs.writeFileSync(tmpSrc, buffer);

    fs.writeFileSync(path.join(publicDir, 'arc-app-icon.png'), buffer);
    fs.writeFileSync(path.join(publicDir, 'logo.png'), buffer);

    try {
      execSync(`convert "${tmpSrc}" -resize 512x512 "${path.join(publicDir, 'pwa-512x512.png')}"`, { stdio: 'pipe' });
      execSync(`convert "${tmpSrc}" -resize 192x192 "${path.join(publicDir, 'pwa-192x192.png')}"`, { stdio: 'pipe' });
      execSync(`convert "${tmpSrc}" -resize 180x180 "${path.join(publicDir, 'apple-touch-icon.png')}"`, { stdio: 'pipe' });
      execSync(`convert "${tmpSrc}" -resize 64x64 "${path.join(publicDir, 'favicon-64.png')}"`, { stdio: 'pipe' });
      execSync(`convert "${tmpSrc}" -resize 32x32 "${path.join(publicDir, 'favicon-32.png')}"`, { stdio: 'pipe' });
      execSync(`convert "${tmpSrc}" -resize 16x16 "${path.join(publicDir, 'favicon-16.png')}"`, { stdio: 'pipe' });
      fs.copyFileSync(path.join(publicDir, 'favicon-64.png'), path.join(publicDir, 'favicon.ico'));
      fs.copyFileSync(path.join(publicDir, 'favicon-64.png'), path.join(process.cwd(), 'app-favicon.ico'));
      console.log('Successfully synchronized app icon and favicons from updated branding!');
    } catch (cmdErr) {
      console.warn('ImageMagick resize skipped.');
    }
  } catch (err) {
    console.error('Failed to sync app icon files:', err);
  } finally {
    if (tmpSrc && fs.existsSync(tmpSrc)) {
      try { fs.unlinkSync(tmpSrc); } catch (_) {}
    }
  }
}

app.put('/api/portal/content', authenticateSession, requirePermission('content', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const raw = req.body;
    let settingsList: any[] = [];

    if (Array.isArray(raw)) {
      settingsList = raw;
    } else if (Array.isArray(raw.settings)) {
      settingsList = raw.settings;
    } else if (typeof raw === 'object' && raw !== null) {
      Object.keys(raw).forEach(group => {
        if (typeof raw[group] === 'object' && raw[group] !== null) {
          Object.keys(raw[group]).forEach(key => {
            settingsList.push({ group, key, value: raw[group][key] });
          });
        }
      });
    }

    const result = await db.updateSettings(settingsList);

    // Sync app icon files if logo or appIcon was updated
    const updatedAppIcon = settingsList.find(s => s.group === 'branding' && s.key === 'appIcon');
    const updatedLogo = settingsList.find(s => s.group === 'branding' && s.key === 'logo');
    const targetImage = updatedAppIcon?.value || updatedLogo?.value;
    if (targetImage && typeof targetImage === 'string' && targetImage.startsWith('data:image/')) {
      syncAppIconFiles(targetImage);
    }

    if (user) {
      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'UPDATE_CONTENT_SETTINGS',
        module: 'content'
      });
    }

    return res.json({ success: true, settings: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// SOCIAL MEDIA
app.get('/api/portal/social-media', authenticateSession, async (req: Request, res: Response) => {
  try {
    const links = await db.getSocialLinks();
    return res.json(links);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/social-media', authenticateSession, requirePermission('social_media', 'canCreate'), async (req: Request, res: Response) => {
  try {
    const created = await db.createSocialLink(req.body);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/social-media/:id', authenticateSession, requirePermission('social_media', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const updated = await db.updateSocialLink(req.params.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/social-media/:id', authenticateSession, requirePermission('social_media', 'canDelete'), async (req: Request, res: Response) => {
  try {
    await db.deleteSocialLink(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// CONTACTS
app.get('/api/portal/contacts', authenticateSession, async (req: Request, res: Response) => {
  try {
    const contacts = await db.getContacts();
    return res.json(contacts);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/contacts', authenticateSession, requirePermission('contacts', 'canCreate'), async (req: Request, res: Response) => {
  try {
    const created = await db.createContact(req.body);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/contacts/:id', authenticateSession, requirePermission('contacts', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const updated = await db.updateContact(req.params.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/contacts/:id', authenticateSession, requirePermission('contacts', 'canDelete'), async (req: Request, res: Response) => {
  try {
    await db.deleteContact(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// EXCO TEAM
app.get('/api/portal/exco-team', authenticateSession, async (req: Request, res: Response) => {
  try {
    const exco = await db.getExcoMembers();
    return res.json(exco);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/exco-team', authenticateSession, requirePermission('exco_team', 'canCreate'), async (req: Request, res: Response) => {
  try {
    const created = await db.createExcoMember(req.body);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/exco-team/:id', authenticateSession, requirePermission('exco_team', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const updated = await db.updateExcoMember(req.params.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/exco-team/:id', authenticateSession, requirePermission('exco_team', 'canDelete'), async (req: Request, res: Response) => {
  try {
    await db.deleteExcoMember(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// EVENTS & MEETINGS
app.get('/api/portal/events', authenticateSession, async (req: Request, res: Response) => {
  try {
    const events = await db.getEvents();
    return res.json(events);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/events', authenticateSession, requirePermission('events', 'canCreate'), async (req: Request, res: Response) => {
  try {
    const created = await db.createEvent(req.body);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/events/:id', authenticateSession, requirePermission('events', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const updated = await db.updateEvent(req.params.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/events/:id', authenticateSession, requirePermission('events', 'canDelete'), async (req: Request, res: Response) => {
  try {
    await db.deleteEvent(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/event-items', authenticateSession, async (req: Request, res: Response) => {
  try {
    const items = await db.getEventItems();
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/event-items', authenticateSession, requirePermission('events', 'canCreate'), async (req: Request, res: Response) => {
  try {
    const created = await db.createEventItem(req.body);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/event-items/:id', authenticateSession, requirePermission('events', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const updated = await db.updateEventItem(req.params.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/event-items/:id', authenticateSession, requirePermission('events', 'canDelete'), async (req: Request, res: Response) => {
  try {
    await db.deleteEventItem(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/event-items/:id/attendance', authenticateSession, requirePermission('events', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const { attendance } = req.body;
    const updated = await db.saveEventAttendance(req.params.id, attendance || []);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/meeting-items', authenticateSession, async (req: Request, res: Response) => {
  try {
    const items = await db.getMeetingItems();
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/meeting-items', authenticateSession, requirePermission('events', 'canCreate'), async (req: Request, res: Response) => {
  try {
    const created = await db.createMeetingItem(req.body);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/meeting-items/:id', authenticateSession, requirePermission('events', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const updated = await db.updateMeetingItem(req.params.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/meeting-items/:id', authenticateSession, requirePermission('events', 'canDelete'), async (req: Request, res: Response) => {
  try {
    await db.deleteMeetingItem(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/meeting-items/:id/attendance', authenticateSession, requirePermission('events', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const { attendance } = req.body;
    const updated = await db.saveMeetingAttendance(req.params.id, attendance || []);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/meeting-items/:id/votings', authenticateSession, requirePermission('events', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const updated = await db.addMeetingVoting(req.params.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/meeting-items/:id/votings/:votingId', authenticateSession, requirePermission('events', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const updated = await db.updateMeetingVoting(req.params.id, req.params.votingId, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/events-meetings/stats', authenticateSession, async (req: Request, res: Response) => {
  try {
    const eventItems = await db.getEventItems();
    const meetingItems = await db.getMeetingItems();
    return res.json({
      totalEvents: eventItems.length,
      upcomingEvents: eventItems.filter(e => e.status === 'upcoming').length,
      totalMeetings: meetingItems.length,
      upcomingMeetings: meetingItems.filter(m => m.status === 'scheduled').length
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// RAMAZAN QUIZ MANAGEMENT
app.get('/api/portal/ramazan-quiz', authenticateSession, async (req: Request, res: Response) => {
  try {
    const questions = await db.getQuizQuestions();
    return res.json(questions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/ramazan-quiz', authenticateSession, requirePermission('quiz', 'canCreate'), async (req: Request, res: Response) => {
  try {
    const created = await db.createQuizQuestion(req.body);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/ramazan-quiz/:id', authenticateSession, requirePermission('quiz', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const updated = await db.updateQuizQuestion(req.params.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/ramazan-quiz/:id', authenticateSession, requirePermission('quiz', 'canDelete'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const result = await db.deleteQuizQuestion(id);

    await db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'DELETE_QUIZ_QUESTION',
      module: 'quiz',
      recordId: id,
      reason: `Deleted quiz question #${id} with ${result.deletedSubmissionsCount} submissions and ${result.deletedWinnersCount} winners automatically removed.`
    });

    realtimeBroadcaster.broadcast('quiz_questions', 'delete', { id });
    realtimeBroadcaster.broadcast('quiz_submissions', 'delete', { questionId: id });
    realtimeBroadcaster.broadcast('quiz_winners', 'delete', { questionId: id });

    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/ramazan-quiz/:id/status', authenticateSession, requirePermission('quiz', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const updated = await db.updateQuizQuestion(req.params.id, { status });
    realtimeBroadcaster.broadcast('quiz_questions', 'update', { id: req.params.id, status });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/ramazan-quiz/:id/draw', authenticateSession, requirePermission('quiz', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const questions = await db.getQuizQuestions();
    const question = questions.find(q => q.id === id);
    if (!question) return res.status(404).json({ error: 'Quiz question not found.' });

    const submissions = await db.getQuizSubmissions();
    const ineligible = await db.getIneligibleParticipantIds();

    const candidates = submissions.filter(s =>
      s.questionId === id &&
      s.isCorrect &&
      !s.isDisqualified &&
      !s.isInvalid &&
      (!s.normalizedIdNumber || !ineligible.includes(s.normalizedIdNumber.toUpperCase()))
    );

    if (candidates.length === 0) {
      return res.status(400).json({ error: 'No eligible candidates found for this lucky draw.' });
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    const chosen = candidates[randomIndex];

    const winner = await db.createQuizWinner({
      questionId: id,
      submissionId: chosen.id,
      participantNumber: chosen.participantNumber,
      participantName: (chosen as any).participant_name || chosen.maskedIdNumber || 'Participant',
      idNumber: chosen.idNumber || chosen.normalizedIdNumber,
      contactNumber: chosen.contactNumber,
      maskedIdNumber: chosen.maskedIdNumber,
      maskedContactNumber: chosen.maskedContactNumber,
      prizeTitle: question.prizeTitle || 'Quiz Prize',
      eligibleCount: candidates.length,
      selectedBy: user.username,
      selectionMethod: 'random',
      auditReference: `DRAW-${Date.now().toString(36).toUpperCase()}`
    });

    await db.updateQuizQuestion(id, { status: 'completed' });

    realtimeBroadcaster.broadcast('quiz_winners', 'create', winner);
    realtimeBroadcaster.broadcast('quiz_questions', 'update', { id, status: 'completed' });

    return res.json({ winner, eligibleCount: candidates.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// QUIZ PARTICIPANTS
app.get('/api/portal/quiz-participants', authenticateSession, async (req: Request, res: Response) => {
  try {
    const submissions = await db.getQuizSubmissions();
    return res.json(submissions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/quiz-participants/:id/disqualify', authenticateSession, requirePermission('quiz', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const { isDisqualified, reason } = req.body;
    const updated = await db.disqualifyQuizSubmission(req.params.id, Boolean(isDisqualified), reason || '');
    realtimeBroadcaster.broadcast('quiz_submissions', 'update', updated);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/quiz-participants/:id', authenticateSession, requirePermission('quiz', 'canDelete'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await db.deleteQuizSubmission(req.params.id);
    await db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'DELETE_QUIZ_SUBMISSION',
      module: 'quiz',
      recordId: req.params.id,
      reason: `Deleted quiz submission #${req.params.id}`
    });
    realtimeBroadcaster.broadcast('quiz_submissions', 'delete', { id: req.params.id });
    realtimeBroadcaster.broadcast('quiz_winners', 'update', {});
    realtimeBroadcaster.broadcast('quiz_questions', 'update', {});
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/quiz-participants/export/csv', authenticateSession, async (req: Request, res: Response) => {
  try {
    const submissions = await db.getQuizSubmissions();
    const csvHeader = 'ID,ParticipantNumber,QuestionId,MaskedID,MaskedContact,IsCorrect,IsEligible,IsDisqualified,SubmittedAt\n';
    const csvRows = submissions.map(s => `"${s.id}","${s.participantNumber}","${s.questionId}","${s.maskedIdNumber}","${s.maskedContactNumber}",${s.isCorrect},${s.isEligible},${s.isDisqualified},"${s.submittedAt}"`).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=quiz_participants.csv');
    return res.send(csvHeader + csvRows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// MASTER PARTICIPANTS
app.get('/api/portal/master-participants', authenticateSession, async (req: Request, res: Response) => {
  try {
    const { search, status } = req.query;
    const submissions = await db.getQuizSubmissions();
    const ineligible = await db.getIneligibleParticipantIds();
    const ineligibleSet = new Set(ineligible);
    const participantMap: { [key: string]: any } = {};

    submissions.forEach(s => {
      const normId = (s.normalizedIdNumber || s.idNumber || '').toUpperCase().trim();
      const key = normId || (s.contactNumber ? `PHONE_${s.contactNumber}` : s.id);
      
      if (!participantMap[key]) {
        const isMasterBlocked = ineligibleSet.has(normId);
        participantMap[key] = {
          id: key,
          idNumber: s.idNumber || s.normalizedIdNumber || 'N/A',
          normalizedIdNumber: normId,
          contactNumber: s.contactNumber || '',
          maskedIdNumber: s.maskedIdNumber || '***',
          maskedContactNumber: s.maskedContactNumber || '****',
          fullName: (s as any).participantName || (s as any).fullName || '',
          totalSubmissions: 0,
          correctCount: 0,
          disqualifiedCount: 0,
          isBlocked: isMasterBlocked,
          isNotEligible: isMasterBlocked,
          lastSubmittedAt: s.submittedAt,
          questionIds: [] as string[]
        };
      }

      participantMap[key].totalSubmissions++;
      if (s.isCorrect) participantMap[key].correctCount++;
      if (s.isDisqualified) participantMap[key].disqualifiedCount++;
      if (s.questionId && !participantMap[key].questionIds.includes(s.questionId)) {
        participantMap[key].questionIds.push(s.questionId);
      }
      if (s.submittedAt && (!participantMap[key].lastSubmittedAt || new Date(s.submittedAt) > new Date(participantMap[key].lastSubmittedAt))) {
        participantMap[key].lastSubmittedAt = s.submittedAt;
      }
    });

    let result = Object.values(participantMap);

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(p =>
        (p.idNumber && p.idNumber.toLowerCase().includes(q)) ||
        (p.normalizedIdNumber && p.normalizedIdNumber.toLowerCase().includes(q)) ||
        (p.contactNumber && p.contactNumber.includes(q)) ||
        (p.maskedIdNumber && p.maskedIdNumber.toLowerCase().includes(q)) ||
        (p.maskedContactNumber && p.maskedContactNumber.includes(q)) ||
        (p.fullName && p.fullName.toLowerCase().includes(q))
      );
    }

    if (status === 'eligible') {
      result = result.filter(p => !p.isNotEligible);
    } else if (status === 'not_eligible' || status === 'disqualified') {
      result = result.filter(p => p.isNotEligible);
    }

    // Sort by latest submission date descending
    result.sort((a, b) => new Date(b.lastSubmittedAt || 0).getTime() - new Date(a.lastSubmittedAt || 0).getTime());

    return res.json({ participants: result, total: result.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/master-participants/toggle-eligibility', authenticateSession, requirePermission('quiz', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { idNumber, isBlocked, isNotEligible, reason } = req.body;
    const blocked = typeof isBlocked === 'boolean' ? isBlocked : Boolean(isNotEligible);
    const norm = String(idNumber || '').trim().toUpperCase();

    await db.setMasterParticipantEligibility(norm, blocked, reason);

    await db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: blocked ? 'DISQUALIFY_MASTER_PARTICIPANT' : 'RESTORE_MASTER_PARTICIPANT',
      module: 'quiz',
      recordId: norm,
      reason: reason || (blocked ? 'Participant ID marked Not Eligible across all questions.' : 'Participant ID eligibility restored.')
    });

    realtimeBroadcaster.broadcast('masterIneligibleParticipants', 'update', { idNumber: norm, isBlocked: blocked });
    realtimeBroadcaster.broadcast('quiz_submissions', 'update', { idNumber: norm });
    realtimeBroadcaster.broadcast('quiz_questions', 'update', {});

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/master-participants/:idNumber', authenticateSession, requirePermission('quiz', 'canDelete'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const idNumber = decodeURIComponent(req.params.idNumber);
    const result = await db.deleteMasterParticipant(idNumber);

    await db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'DELETE_MASTER_PARTICIPANT',
      module: 'quiz',
      recordId: idNumber,
      reason: `Deleted master participant ID ${idNumber} along with ${result.deletedSubmissionsCount} submissions and ${result.deletedWinnersCount} winners.`
    });

    realtimeBroadcaster.broadcast('masterIneligibleParticipants', 'delete', { idNumber });
    realtimeBroadcaster.broadcast('quiz_submissions', 'delete', { idNumber });
    realtimeBroadcaster.broadcast('quiz_winners', 'delete', { idNumber });
    realtimeBroadcaster.broadcast('quiz_questions', 'update', {});

    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// QUIZ WINNERS
app.get('/api/portal/quiz-winners', authenticateSession, async (req: Request, res: Response) => {
  try {
    const winners = await db.getQuizWinners();
    return res.json(winners);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/quiz-winners/:id', authenticateSession, requirePermission('quiz', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const updated = await db.updateQuizWinner(req.params.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/quiz-winners/:id/reselect', authenticateSession, requirePermission('quiz', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const result = await db.reselectQuizWinner(req.params.id, reason || 'Winner reselection');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/quiz-winners/:id', authenticateSession, requirePermission('quiz', 'canDelete'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const isUserAdmin = (user.roleName || user.roleId || '').toLowerCase().includes('admin') || user.roleId === 'role_admin';
    if (!isUserAdmin) {
      return res.status(403).json({ error: 'Only administrators can delete quiz winners (ކުއިޒް ނަސީބުވެރިޔާ ފޮހެލެވޭނީ ހަމައެކަނި އެޑްމިނުންނަށެވެ).' });
    }

    await db.deleteQuizWinner(req.params.id);
    await db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'DELETE_QUIZ_WINNER',
      module: 'quiz',
      recordId: req.params.id,
      reason: `Deleted quiz winner record #${req.params.id}`
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PRIZES & SPONSORS
app.get('/api/portal/quiz-prizes', authenticateSession, async (req: Request, res: Response) => {
  try {
    const prizes = await db.getPrizes();
    return res.json(prizes);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/quiz-prizes', authenticateSession, requirePermission('quiz', 'canCreate'), async (req: Request, res: Response) => {
  try {
    const created = await db.createPrize(req.body);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/quiz-prizes/:id', authenticateSession, requirePermission('quiz', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const updated = await db.updatePrize(req.params.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/quiz-prizes/:id', authenticateSession, requirePermission('quiz', 'canDelete'), async (req: Request, res: Response) => {
  try {
    await db.deletePrize(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/quiz-sponsors', authenticateSession, async (req: Request, res: Response) => {
  try {
    const sponsors = await db.getSponsors();
    return res.json(sponsors);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/quiz-sponsors', authenticateSession, requirePermission('quiz', 'canCreate'), async (req: Request, res: Response) => {
  try {
    const created = await db.createSponsor(req.body);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/quiz-sponsors/:id', authenticateSession, requirePermission('quiz', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const updated = await db.updateSponsor(req.params.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/quiz-sponsors/:id', authenticateSession, requirePermission('quiz', 'canDelete'), async (req: Request, res: Response) => {
  try {
    await db.deleteSponsor(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// MESSAGES & INBOX
app.get('/api/portal/messages', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const all = await db.getMessages();
    const inbox = all.filter(m => m.recipientType === 'all' || m.recipientId === user.id || (m.recipientType === 'role' && m.recipientId === user.roleId));
    const sent = all.filter(m => m.senderId === user.id);
    const unreadCount = inbox.filter(m => !m.readBy?.includes(user.id)).length;
    return res.json({ inbox, messages: inbox, sent, unreadCount });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/messages', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const msg = await db.createMessage({
      ...req.body,
      senderId: user.id,
      senderName: user.fullName || user.username,
      senderRole: user.roleName
    });
    return res.status(201).json(msg);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/messages/:id/action', authenticateSession, requirePermission('messages', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const updated = await db.recordMessageAction(req.params.id, {
      ...req.body,
      actionByUserId: user.id,
      actionByName: user.fullName || user.username
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/messages/:id/status', authenticateSession, requirePermission('messages', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const updated = await db.updateMessage(req.params.id, { status });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/messages/:id/read', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const all = await db.getMessages();
    const msg = all.find(m => m.id === req.params.id);
    if (msg && !msg.readBy.includes(user.id)) {
      msg.readBy.push(user.id);
      await db.updateMessage(req.params.id, { readBy: msg.readBy });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/messages/:id', authenticateSession, requirePermission('messages', 'canDelete'), async (req: Request, res: Response) => {
  try {
    await db.deleteMessage(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// NOTIFICATIONS
app.get('/api/portal/notifications', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const notifs = await db.getNotifications();
    const unreadCount = notifs.filter(n => !n.readBy.includes(user.id)).length;
    return res.json({ notifications: notifs, unreadCount });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/notifications/mark-all-read', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await db.markAllNotificationsRead(user.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/notifications/:id/read', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await db.markNotificationRead(req.params.id, user.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/notifications/broadcast', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, message, type, link, sendAsMessage } = req.body;
    const notif = await db.createNotification({
      title,
      message,
      type: type || 'info',
      link
    });

    if (sendAsMessage) {
      await db.createMessage({
        senderId: user.id,
        senderName: user.fullName || user.username,
        senderRole: user.roleName,
        recipientType: 'all',
        subject: title,
        body: message,
        category: 'announcement',
        priority: 'high'
      });
    }

    return res.status(201).json(notif);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// CLUB RULES & REGULATIONS
app.get('/api/portal/club-rules', authenticateSession, async (req: Request, res: Response) => {
  try {
    const rules = await db.getClubRules();
    return res.json(rules);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/club-rules', authenticateSession, requirePermission('club_rules', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const updated = await db.updateClubRules(req.body, user.username);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// --- BUDGET MODULE API ENDPOINTS ---
// ==========================================

// Budget Overview Stats
app.get('/api/portal/budget/stats', authenticateSession, async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const stats = await db.getBudgetStats(year);
    return res.json(stats);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Bank Accounts
app.get('/api/portal/budget/accounts', authenticateSession, async (req: Request, res: Response) => {
  try {
    const accounts = await db.getBankAccounts();
    return res.json(accounts);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/budget/accounts', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const account = await db.createBankAccount(req.body);
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'create',
      module: 'budget',
      targetId: account.id,
      details: `Created bank account: ${account.accountName}`
    });
    return res.status(201).json(account);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/budget/accounts/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const account = await db.updateBankAccount(req.params.id, req.body);
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'update',
      module: 'budget',
      targetId: account.id,
      details: `Updated bank account: ${account.accountName}`
    });
    return res.json(account);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/budget/accounts/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await db.deleteBankAccount(req.params.id);
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'delete',
      module: 'budget',
      targetId: req.params.id,
      details: `Deleted bank account: ${req.params.id}`
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/budget/transfers', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const transfer = await db.transferAccountFunds({
      ...req.body,
      createdBy: user.fullName || user.username
    });
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'create',
      module: 'budget',
      targetId: transfer.id,
      details: `Transferred ${transfer.amount} MVR from ${transfer.fromAccountName} to ${transfer.toAccountName}`
    });
    return res.status(201).json(transfer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/budget/transfers', authenticateSession, async (req: Request, res: Response) => {
  try {
    const transfers = await db.getAccountTransfers();
    return res.json(transfers);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Income Tracker
app.get('/api/portal/budget/income', authenticateSession, async (req: Request, res: Response) => {
  try {
    const { category, accountId, startDate, endDate } = req.query as Record<string, string>;
    const list = await db.getIncomeRecords({ category, accountId, startDate, endDate });
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/budget/income', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const income = await db.createIncomeRecord({
      ...req.body,
      createdBy: user.fullName || user.username
    });
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'create',
      module: 'budget',
      targetId: income.id,
      details: `Recorded income: ${income.title} (${income.amount} MVR)`
    });
    return res.status(201).json(income);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/budget/income/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const income = await db.updateIncomeRecord(req.params.id, req.body);
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'update',
      module: 'budget',
      targetId: income.id,
      details: `Updated income: ${income.title}`
    });
    return res.json(income);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/budget/income/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await db.deleteIncomeRecord(req.params.id);
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'delete',
      module: 'budget',
      targetId: req.params.id,
      details: `Deleted income record: ${req.params.id}`
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Expense Tracker
app.get('/api/portal/budget/expenses', authenticateSession, async (req: Request, res: Response) => {
  try {
    const { category, accountId, status, startDate, endDate } = req.query as Record<string, string>;
    const list = await db.getExpenseRecords({ category, accountId, status, startDate, endDate });
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/budget/expenses', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const expense = await db.createExpenseRecord({
      ...req.body,
      createdBy: user.fullName || user.username
    });
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'create',
      module: 'budget',
      targetId: expense.id,
      details: `Recorded expense: ${expense.title} (${expense.amount} MVR)`
    });
    return res.status(201).json(expense);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/budget/expenses/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const expense = await db.updateExpenseRecord(req.params.id, req.body);
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'update',
      module: 'budget',
      targetId: expense.id,
      details: `Updated expense: ${expense.title}`
    });
    return res.json(expense);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/budget/expenses/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await db.deleteExpenseRecord(req.params.id);
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'delete',
      module: 'budget',
      targetId: req.params.id,
      details: `Deleted expense record: ${req.params.id}`
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Expense Payment Release Approval (President / Vice President / Admin)
app.post('/api/portal/budget/expenses/:id/approve', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, releasePayment, accountId, remarks } = req.body;

    const expense = await db.approveExpensePayment(
      req.params.id,
      { id: user.id, fullName: user.fullName, username: user.username },
      status || 'approved',
      releasePayment !== undefined ? releasePayment : true,
      accountId,
      remarks
    );

    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'approve',
      module: 'budget',
      targetId: expense.id,
      details: `Executive payment release approval for expense "${expense.title}" (${expense.amount} MVR) -> Status: ${expense.status}`
    });

    return res.json(expense);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// INVOICES & QUOTATIONS API
// -------------------------------------------------------------
app.get('/api/portal/budget/invoices/next-number', authenticateSession, async (req: Request, res: Response) => {
  try {
    const type = (req.query.type as 'invoice' | 'quotation') || 'invoice';
    const nextNumber = await db.getNextInvoiceNumber(type);
    return res.json({ nextNumber });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/budget/invoices', authenticateSession, async (req: Request, res: Response) => {
  try {
    const { type, status, startDate, endDate, search } = req.query as Record<string, string>;
    const list = await db.getInvoices({ type, status, startDate, endDate, search });
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/budget/invoices/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    const item = await db.getInvoiceById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Invoice or quotation not found' });
    }
    return res.json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/budget/invoices', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // User creating the invoice cannot approve immediately upon creation; all invoices start in pending_approval
    const invoice = await db.createInvoice({
      ...req.body,
      status: 'pending_approval',
      approvalStatus: 'pending',
      approvedBy: undefined,
      approvedByName: undefined,
      approvedAt: undefined,
      createdBy: user.id,
      createdByName: user.fullName || user.username
    });

    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'create',
      module: 'budget',
      targetId: invoice.id,
      details: `Generated ${invoice.type}: ${invoice.invoiceNumber} for "${invoice.billTo}" (${invoice.totalNetPayments} MVR) -> Pending Executive Approval`
    });

    return res.status(201).json(invoice);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/budget/invoices/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const invoice = await db.updateInvoice(req.params.id, req.body);
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'update',
      module: 'budget',
      targetId: invoice.id,
      details: `Updated ${invoice.type}: ${invoice.invoiceNumber}`
    });
    return res.json(invoice);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/budget/invoices/:id/approve', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const isPresidentOrVP = (user.roleName || user.roleId || '').toLowerCase().includes('president') ||
      (user.roleName || user.roleId || '').toLowerCase().includes('admin') ||
      (user.permissions || []).some((p: any) => p.module === 'budget' && p.canApprove);

    if (!isPresidentOrVP) {
      return res.status(403).json({ error: 'Executive signing privileges (President / Vice President) required to approve invoices.' });
    }

    const { status, remarks } = req.body;

    const invoice = await db.approveInvoice(
      req.params.id,
      { id: user.id, fullName: user.fullName, username: user.username },
      status || 'approved',
      remarks
    );

    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'approve',
      module: 'budget',
      targetId: invoice.id,
      details: `Executive approval for ${invoice.type} ${invoice.invoiceNumber} (${invoice.totalNetPayments} MVR) -> Status: ${invoice.status}`
    });

    return res.json(invoice);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/budget/invoices/:id/collect', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { amount, paymentMethod, accountId, category, receivedBy, receivedDate, referenceNumber, notes, status } = req.body;

    const result = await db.collectInvoicePayment(req.params.id, {
      amount: Number(amount),
      paymentMethod,
      accountId,
      category,
      receivedBy: (receivedBy || '').trim() || user.fullName || user.username || 'Treasurer',
      receivedDate,
      referenceNumber,
      notes,
      status,
      recordedBy: user.fullName || user.username || 'Treasurer'
    });

    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'create',
      module: 'budget',
      targetId: result.invoice.id,
      details: `Collected payment of ${result.incomeRecord.amount} MVR for ${result.invoice.type} ${result.invoice.invoiceNumber} (${result.invoice.billTo}) -> Added to Income. Receiver: ${result.invoice.receivedBy}`
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.delete('/api/portal/budget/invoices/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await db.deleteInvoice(req.params.id);
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'delete',
      module: 'budget',
      targetId: req.params.id,
      details: `Deleted invoice/quotation record: ${req.params.id}`
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Member Contributions & Funds Manager
app.get('/api/portal/budget/contributions/settings', authenticateSession, async (req: Request, res: Response) => {
  try {
    const settings = await db.getContributionSettings();
    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/budget/contributions/settings', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const updated = await db.updateContributionSettings({
      ...req.body,
      updatedBy: user.username
    });
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'update',
      module: 'budget',
      targetId: 'settings',
      details: `Updated contribution settings (Monthly fee: ${updated.monthlyFee}, Fine/day: ${updated.finePerDay})`
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/budget/contributions', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { year, month, memberId, status } = req.query as Record<string, string>;

    // Permission and privacy check:
    // If the user is a standard club member and not an Admin or EXCO with budget permission,
    // enforce that they can ONLY see their own member contribution records!
    const isAdminOrExco = user && (
      user.roleName === 'Admin' ||
      user.roleName === 'EXCO Member' ||
      user.roleId === 'role_admin' ||
      user.roleId === 'role_exco' ||
      user.roleName?.toLowerCase().includes('admin') ||
      user.roleName?.toLowerCase().includes('treasurer') ||
      user.permissions?.some((p: any) => p.module === 'budget' && (p.canView || p.canManage))
    );

    let effectiveMemberId = memberId;
    if (!isAdminOrExco) {
      if (!user.memberId) {
        return res.json([]);
      }
      effectiveMemberId = user.memberId;
    }

    const list = await db.getMemberContributions({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      memberId: effectiveMemberId,
      status
    });
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/budget/contributions/pay', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await db.processContributionPayment({
      ...req.body,
      recordedBy: user.fullName || user.username
    });
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'create',
      module: 'budget',
      targetId: result.incomeRecord.id,
      details: `Processed contribution payment of ${result.totalPaid} MVR for member ${req.body.memberId} (Discount: ${result.discountGiven}, Fines: ${result.finesCollected})`
    });
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================
// MEMBER CONTRIBUTION SELF-PAYMENT & APPROVAL WORKFLOW
// ============================================================

// GET /api/portal/my-contributions - Load member profile, accounts, contributions & payment requests
app.get('/api/portal/my-contributions', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    let member = null;
    if (user.memberId) {
      member = await db.getMemberById(user.memberId);
    }
    if (!member) {
      const members = await db.getMembers();
      member = members.find((m: any) =>
        m.userId === user.id ||
        m.linkedUserId === user.id ||
        (m.idCardNumber && user.username && m.idCardNumber.toLowerCase() === user.username.toLowerCase())
      );
      // Fallback: if user is admin or exco without explicitly linked member, check if there is an active member or first member to test with
      if (!member && isUserAdmin(user) && members.length > 0) {
        member = members[0];
      }
    }

    const [settings, bankAccounts] = await Promise.all([
      db.getContributionSettings(),
      db.getBankAccounts()
    ]);

    const depositAccount = bankAccounts.find(a => a.id === settings.defaultDepositAccountId) ||
      bankAccounts.find(a => a.status === 'active') ||
      bankAccounts[0] ||
      {
        id: 'acc_primary_001',
        accountName: 'Aanandha Recreation Club',
        accountNumber: '7730000308018',
        bankName: 'Bank of Maldives (BML)',
        currentBalance: 0,
        status: 'active'
      };

    if (!member) {
      return res.json({
        member: null,
        settings,
        depositAccount,
        contributions: [],
        paymentRequests: [],
        summary: {
          paidCount: 0,
          totalPaid: 0,
          pendingRequestsCount: 0,
          hasPendingPayment: false
        }
      });
    }

    const [contributions, paymentRequests] = await Promise.all([
      db.getMemberContributions({ memberId: member.id }),
      db.getContributionPaymentRequests({ memberId: member.id })
    ]);

    const paidCount = contributions.filter(c => c.status === 'paid').length;
    const totalPaid = contributions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.paidAmount || 0), 0);
    const pendingRequestsCount = paymentRequests.filter(r => r.status === 'pending').length;

    return res.json({
      member,
      settings,
      depositAccount,
      contributions,
      paymentRequests,
      summary: {
        paidCount,
        totalPaid,
        pendingRequestsCount,
        hasPendingPayment: pendingRequestsCount > 0
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/portal/my-contributions/payment-request - Submit payment slip for review
app.post('/api/portal/my-contributions/payment-request', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    let member = null;
    if (req.body.memberId && isUserAdmin(user)) {
      member = await db.getMemberById(req.body.memberId);
    }
    if (!member && user.memberId) {
      member = await db.getMemberById(user.memberId);
    }
    if (!member) {
      const members = await db.getMembers();
      member = members.find((m: any) =>
        m.userId === user.id ||
        m.linkedUserId === user.id ||
        (m.idCardNumber && user.username && m.idCardNumber.toLowerCase() === user.username.toLowerCase())
      );
      if (!member && isUserAdmin(user) && members.length > 0) {
        member = members[0];
      }
    }

    if (!member) {
      return res.status(400).json({
        error: 'No linked ARC Club Member found for your account.'
      });
    }

    const {
      slipDownloadUrl,
      slipDataUrl = '',
      slipStoragePath = '',
      slipFileName = '',
      slipMimeType = '',
      slipFileSize = 0,
      memberNote = '',
      amountPaid = 0
    } = req.body;

    if (!slipDownloadUrl && !slipDataUrl) {
      return res.status(400).json({ error: 'A valid bank payment slip image or document is required.' });
    }

    const currentYear = new Date().getFullYear();
    const parsedAmountPaid = Number(amountPaid) > 0 ? Number(amountPaid) : null;
    let provisionalWaterfall: any = null;
    if (parsedAmountPaid && parsedAmountPaid > 0) {
      try {
        provisionalWaterfall = await db.previewContributionWaterfall(member.id, parsedAmountPaid, true);
      } catch (_) {}
    }

    // Create pending request with optional waterfall calculation
    const newRequest = await db.createContributionPaymentRequest({
      userId: user.id,
      memberId: member.id,
      memberNumber: member.memberNumber,
      memberName: member.fullName,
      contributionYear: currentYear,
      year: currentYear,
      paymentType: provisionalWaterfall ? 'waterfall' : null,
      month: null,
      months: provisionalWaterfall ? provisionalWaterfall.allocations.map((a: any) => a.month) : [],
      calculatedAmount: parsedAmountPaid,
      amountPaid: parsedAmountPaid || undefined,
      baseAmount: provisionalWaterfall ? provisionalWaterfall.totalBasePaid : null,
      fineAmount: provisionalWaterfall ? provisionalWaterfall.totalFinesPaid : 0,
      discountAmount: 0,
      totalAmount: parsedAmountPaid,
      splitAllocations: provisionalWaterfall?.allocations,
      carryForwardBalance: provisionalWaterfall?.carryForwardBalance,
      referenceNumber: null,
      normalizedReference: null,
      referenceLock: null,
      accountId: null,
      accountName: null,
      accountNumber: null,
      bankName: null,
      paymentMethod: 'bank_transfer',
      slipStoragePath,
      slipDownloadUrl: slipDownloadUrl || slipDataUrl,
      slipDataUrl: slipDataUrl || (slipDownloadUrl?.startsWith('data:') ? slipDownloadUrl : ''),
      slipFileName,
      slipMimeType,
      slipFileSize: Number(slipFileSize) || 0,
      memberNote: typeof memberNote === 'string' ? memberNote.trim() : '',
      status: 'pending',
      contributionRecordIds: []
    });

    // Create Audit Log
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'create',
      module: 'budget',
      targetId: newRequest.id,
      details: `Submitted contribution payment slip ${newRequest.requestNumber} for ${member.fullName}. Pending finance review.`
    });

    // Send notification to Budget reviewers
    try {
      await db.createAppNotification({
        title: 'New Member Contribution Payment Slip',
        message: `${member.fullName} (${member.memberNumber}) submitted a payment slip (${newRequest.requestNumber}). Awaiting verification.`,
        type: 'info',
        link: '/portal/budget?tab=contributions'
      });
    } catch (_) {}

    return res.status(201).json(newRequest);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/portal/my-contributions/payment-request/:id/cancel - Cancel pending request
app.post('/api/portal/my-contributions/payment-request/:id/cancel', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let memberId = user.memberId;
    if (!memberId) {
      const members = await db.getMembers();
      const m = members.find((m: any) => m.userId === user.id || m.linkedUserId === user.id);
      if (m) memberId = m.id;
    }

    if (!memberId) {
      return res.status(403).json({ error: 'No linked member profile found.' });
    }

    const cancelled = await db.cancelContributionPaymentRequest(req.params.id, memberId);
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'cancel',
      module: 'budget',
      targetId: cancelled.id,
      details: `Cancelled contribution payment request ${cancelled.requestNumber}`
    });

    return res.json(cancelled);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// GET /api/portal/budget/contribution-payment-requests/summary - Summary metrics for dashboard and approvals
app.get('/api/portal/budget/contribution-payment-requests/summary', authenticateSession, requirePermission('budget', 'canView'), async (req: Request, res: Response) => {
  try {
    const summary = await db.getContributionPaymentRequestsSummary();
    return res.json(summary);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/portal/budget/contribution-payment-requests - Reviewer list of requests
app.get('/api/portal/budget/contribution-payment-requests', authenticateSession, requirePermission('budget', 'canView'), async (req: Request, res: Response) => {
  try {
    const { status, memberId, year } = req.query as Record<string, string>;
    const requests = await db.getContributionPaymentRequests({
      status,
      memberId,
      year: year ? Number(year) : undefined
    });

    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const approvedCount = requests.filter(r => r.status === 'approved').length;
    const rejectedCount = requests.filter(r => r.status === 'rejected').length;

    return res.json({
      requests,
      pendingCount,
      approvedCount,
      rejectedCount,
      totalCount: requests.length
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/portal/budget/members/:memberId/waterfall-preview - Preview payment split across unpaid months, fines & credit balance
app.get('/api/portal/budget/members/:memberId/waterfall-preview', authenticateSession, async (req: Request, res: Response) => {
  try {
    const amount = Number(req.query.amount || 0);
    const preview = await db.previewContributionWaterfall(req.params.memberId, amount, true);
    return res.json(preview);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/portal/budget/contribution-payment-requests/:id/approve - Approve request atomically
app.post('/api/portal/budget/contribution-payment-requests/:id/approve', authenticateSession, requirePermission('budget', 'canApprove'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { referenceNumber, paymentType, month, accountId, approvalNote, amountPaid, approvedAmount } = req.body;
    const cleanRef = String(referenceNumber || '').trim();

    if (!cleanRef) {
      return res.status(400).json({ error: 'Payment Reference Number is mandatory before approving payment request.' });
    }

    const result = await db.approveContributionPaymentRequest(
      req.params.id,
      { id: user.id, fullName: user.fullName || user.username },
      {
        referenceNumber: cleanRef,
        paymentType: paymentType || 'waterfall',
        month: month !== undefined ? Number(month) : undefined,
        accountId,
        approvalNote,
        approvedAmount: Number(approvedAmount || amountPaid || 0)
      }
    );

    // Audit Log
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'approve',
      module: 'budget',
      targetId: result.request.id,
      details: `Approved contribution payment ${result.request.requestNumber} for ${result.request.memberName} (${result.request.totalAmount} MVR). Ref: ${cleanRef}. Income record ${result.incomeRecord.id} generated.`
    });

    // Notify member user
    if (result.request.userId) {
      try {
        await db.createAppNotification({
          recipientId: result.request.userId,
          title: 'Contribution Payment Approved',
          message: `Your ARC membership contribution payment (${result.request.requestNumber}) for MVR ${result.request.totalAmount} has been verified and approved.`,
          type: 'success',
          link: '/portal'
        });
      } catch (_) {}
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/portal/budget/contribution-payment-requests/:id/reject - Reject request
app.post('/api/portal/budget/contribution-payment-requests/:id/reject', authenticateSession, requirePermission('budget', 'canApprove'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ error: 'A reason for rejection must be provided.' });
    }

    const updated = await db.rejectContributionPaymentRequest(
      req.params.id,
      { id: user.id, fullName: user.fullName || user.username },
      rejectionReason.trim()
    );

    // Audit Log
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'reject',
      module: 'budget',
      targetId: updated.id,
      details: `Rejected contribution payment ${updated.requestNumber} for ${updated.memberName}. Reason: ${rejectionReason}`
    });

    // Notify member user
    if (updated.userId) {
      try {
        await db.createAppNotification({
          recipientId: updated.userId,
          title: 'Contribution Payment Rejected',
          message: `Your ARC membership contribution payment (${updated.requestNumber}) was not approved. Reason: ${rejectionReason}`,
          type: 'error',
          link: '/portal'
        });
      } catch (_) {}
    }

    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/portal/budget/contribution-payment-requests/:id/slip - Update or replace slip image/document
app.post('/api/portal/budget/contribution-payment-requests/:id/slip', authenticateSession, requirePermission('budget', 'canView'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { slipDownloadUrl, slipDataUrl, slipStoragePath, slipFileName, slipMimeType, slipFileSize, referenceNumber } = req.body;
    
    if (!slipDownloadUrl && !slipDataUrl) {
      return res.status(400).json({ error: 'slipDownloadUrl or slipDataUrl is required' });
    }

    const updated = await db.updateContributionPaymentRequestSlip(req.params.id, {
      slipDownloadUrl: slipDownloadUrl || slipDataUrl,
      slipDataUrl: slipDataUrl || (slipDownloadUrl?.startsWith('data:') ? slipDownloadUrl : undefined),
      slipStoragePath,
      slipFileName,
      slipMimeType,
      slipFileSize,
      referenceNumber
    });

    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'update',
      module: 'budget',
      targetId: updated.id,
      details: `Updated transfer slip for contribution request ${updated.requestNumber} (${updated.memberName}). File: ${slipFileName || 'slip'}`
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Category Budget Allocations
app.get('/api/portal/budget/allocations', authenticateSession, async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const list = await db.getBudgetAllocations(year);
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/budget/allocations', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const item = await db.saveBudgetAllocation(req.body);
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'update',
      module: 'budget',
      targetId: item.id,
      details: `Saved budget allocation: ${item.categoryLabel} (${item.allocatedAmount} MVR)`
    });
    return res.status(200).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/budget/allocations/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await db.deleteBudgetAllocation(req.params.id);
    await db.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'delete',
      module: 'budget',
      targetId: req.params.id,
      details: `Deleted budget allocation: ${req.params.id}`
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// --- EXECUTIVE PANELS & ROLES API ---
// ==========================================

// Presidential Directives
app.get('/api/portal/executive/directives', authenticateSession, async (req: Request, res: Response) => {
  try {
    const list = await db.getPresidentialDirectives();
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/executive/directives', authenticateSession, async (req: Request, res: Response) => {
  try {
    const item = await db.createPresidentialDirective(req.body);
    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/executive/directives/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    const item = await db.updatePresidentialDirective(req.params.id, req.body);
    return res.json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/executive/directives/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    await db.deletePresidentialDirective(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Official Circulars
app.get('/api/portal/executive/circulars', authenticateSession, async (req: Request, res: Response) => {
  try {
    const list = await db.getOfficialCirculars();
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/portal/executive/circulars', authenticateSession, async (req: Request, res: Response) => {
  try {
    const item = await db.createOfficialCircular(req.body);
    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/portal/executive/circulars/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    const item = await db.updateOfficialCircular(req.params.id, req.body);
    return res.json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portal/executive/circulars/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    await db.deleteOfficialCircular(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Fallback for unmatched API routes to ensure JSON 404 response instead of HTML
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});


// Serve frontend assets or Vite middleware in dev
async function startServer() {
  try {
    console.log('[Startup] Verifying Firestore database schema...');
    await db.verifyStartupSchema();
    console.log('[Startup] Firestore verification successful.');
    await rentalDb.ensureRentalSeedData();
  } catch (err) {
    console.error('[Startup] Critical error during Firestore schema verification:', err);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ARC Portal server running on port ${PORT}`);
  });
}

startServer();
