process.env.TZ = 'Indian/Maldives';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { db, verifyPin, hashPin } from './src/server/db';
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Active In-Memory Sessions with DB Persistence
interface Session {
  token: string;
  userId: string;
  expiresAt: number;
}
const sessions = new Map<string, Session>();

// Restore persistent sessions from DB
try {
  const storedSessions = db.getSessions();
  const now = Date.now();
  storedSessions.forEach(s => {
    if (s.expiresAt > now) {
      sessions.set(s.token, s);
    }
  });
} catch (e) {
  console.error('Error restoring sessions from DB:', e);
}

function syncSessionsToDb() {
  try {
    db.saveSessions(Array.from(sessions.values()));
  } catch (e) {
    console.error('Error saving sessions to DB:', e);
  }
}

// Session cleanup interval
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [token, sess] of sessions.entries()) {
    if (sess.expiresAt < now) {
      sessions.delete(token);
      changed = true;
    }
  }
  if (changed) syncSessionsToDb();
}, 60000);

// Background activity process: auto-score submissions when deadline passes & auto-draw winner at winner announcement time
function runQuizBackgroundProcess() {
  try {
    const questions = db.getQuizQuestions();
    const submissions = db.getQuizSubmissions();
    const winners = db.getQuizWinners();
    const ineligibleSet = new Set(db.getIneligibleParticipantIds());
    const nowMs = getSystemNow().getTime();
    let hasChanges = false;

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

          if (Boolean(sub.isCorrect) !== Boolean(isCorrect)) {
            sub.isCorrect = isCorrect;
            hasChanges = true;
          }
          const isEligible = Boolean(isCorrect && !isDisqualified);
          if (Boolean(sub.isEligible) !== isEligible) {
            sub.isEligible = isEligible;
            hasChanges = true;
          }
        }
      }

      // 2. When winner announcement time (revealMs) arrives, auto-draw winner if not already drawn
      if (revealMs > 0 && nowMs >= revealMs) {
        const existingWinner = winners.find(w => w.questionId === q.id && w.publicStatus === 'published' && !w.isReplaced);
        if (!existingWinner) {
          const eligibleSubmissions = submissions.filter(s =>
            s.questionId === q.id &&
            s.isCorrect &&
            s.isEligible &&
            !s.isDisqualified &&
            !s.isInvalid &&
            !ineligibleSet.has((s.normalizedIdNumber || '').toUpperCase())
          );

          if (eligibleSubmissions.length > 0) {
            const randomIndex = Math.floor(Math.random() * eligibleSubmissions.length);
            const selectedSub = eligibleSubmissions[randomIndex];
            const auditRef = `SYS-AUTO-DRAW-${Date.now()}`;

            const newWinner: any = {
              id: `winner_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              questionId: q.id,
              questionNumber: q.questionNumber,
              submissionId: selectedSub.id,
              participantNumber: selectedSub.participantNumber,
              participantName: selectedSub.maskedIdNumber,
              idNumber: selectedSub.normalizedIdNumber || selectedSub.maskedIdNumber,
              contactNumber: selectedSub.contactNumber,
              maskedIdNumber: selectedSub.maskedIdNumber,
              maskedContactNumber: selectedSub.maskedContactNumber,
              prizeId: q.prizeId || '',
              prizeTitle: q.prizeTitle || 'Quiz Winner Prize',
              prizeDescription: q.prizeDescription || '',
              sponsorName: q.sponsorName || '',
              sponsorLogo: q.sponsorLogo || '',
              eligibleCount: eligibleSubmissions.length,
              selectedAt: new Date().toISOString(),
              selectedBy: 'system',
              selectionMethod: 'random',
              auditReference: auditRef,
              contactedStatus: 'not_contacted',
              prizeCollectionStatus: 'pending',
              publicStatus: 'published',
              internalNotes: 'Auto-drawn by background activity system at Winner Announcement Time.'
            };

            winners.push(newWinner);
            q.status = 'winner_announced';
            q.updatedAt = new Date().toISOString();
            hasChanges = true;

            db.logAudit({
              userId: 'system',
              username: 'system',
              fullName: 'Background System Activity',
              action: 'AUTO_SELECT_QUIZ_WINNER',
              module: 'ramazan_quiz',
              recordId: newWinner.id,
              newValue: { winner: selectedSub.participantNumber, auditReference: auditRef, eligibleCount: eligibleSubmissions.length },
              reason: 'Automatic background draw at Winner Announcement Time'
            });
          } else {
            if (q.status !== 'completed' && q.status !== 'winner_announced') {
              q.status = 'completed';
              q.updatedAt = new Date().toISOString();
              hasChanges = true;
            }
          }
        } else if (q.status !== 'winner_announced') {
          q.status = 'winner_announced';
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      db.saveData();
    }
  } catch (err) {
    console.error('Error in runQuizBackgroundProcess:', err);
  }
}

// Start background activity runner every 15 seconds
setInterval(runQuizBackgroundProcess, 15000);

// Rate-limiting login attempts map
const failedLogins = new Map<string, { count: number; lockedUntil: number }>();

// Helper to create default full admin permissions
function createAdminPermissions(userId: string): ModulePermission[] {
  const modules: ModuleKey[] = [
    'dashboard', 'slideshow', 'content', 'vision_mission', 'contact', 'social_media',
    'exco_team', 'ramazan_quiz', 'quiz_participants', 'quiz_winners', 'users',
    'roles_permissions', 'audit_logs', 'club_rules', 'settings'
  ];
  return modules.map((m, idx) => ({
    id: `perm_${userId}_${idx}`,
    userId,
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

// Helper to sanitize User object for client response (stripping pinHash/pinSalt)
function sanitizeUser(u: any): User {
  const { pinHash, pinSalt, ...safeUser } = u;
  return safeUser as User;
}

// Authentication Middleware
function authenticateSession(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  const token = authHeader.substring(7);
  const session = sessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    if (session) sessions.delete(token);
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }

  // Extend session (30 minutes default)
  session.expiresAt = Date.now() + 30 * 60 * 1000;

  const users = db.getUsers();
  const user = users.find(u => u.id === session.userId);

  if (!user || user.status !== 'active') {
    sessions.delete(token);
    return res.status(403).json({ error: 'Account is deactivated or locked.' });
  }

  (req as any).user = user;
  (req as any).token = token;
  next();
}

// Module Permission Middleware Creator
function requirePermission(moduleKey: ModuleKey, actionKey: keyof Omit<ModulePermission, 'id' | 'userId' | 'moduleKey'> = 'canView') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user: User = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    // Admin role has full access
    const roleName = (user.roleName || '').toLowerCase();
    const roleId = (user.roleId || '').toLowerCase();
    const isAdmin = roleName === 'admin' || roleId === 'role_admin' || roleId === 'admin';
    if (isAdmin) return next();

    if (moduleKey === 'audit_logs') {
      return res.status(403).json({ error: 'System Audit Logs are restricted to Admin users only.' });
    }

    const perm = user.permissions?.find(p => p.moduleKey === moduleKey);
    if (!perm || !perm[actionKey]) {
      return res.status(403).json({ error: `Permission denied. Required: ${moduleKey} (${actionKey}).` });
    }

    next();
  };
}

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, pin } = req.body;

  if (!username || !pin) {
    return res.status(400).json({ error: 'Incorrect username or PIN.' });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  const lockInfo = failedLogins.get(cleanUsername);

  if (lockInfo && lockInfo.lockedUntil > Date.now()) {
    const remainingSecs = Math.ceil((lockInfo.lockedUntil - Date.now()) / 1000);
    return res.status(429).json({ error: `Account temporarily locked due to failed login attempts. Try again in ${remainingSecs}s.` });
  }

  const users = db.getUsers();
  const user = users.find(u => u.username.toLowerCase() === cleanUsername);

  if (!user || user.status === 'inactive') {
    return res.status(400).json({ error: 'Incorrect username or PIN.' });
  }

  if (user.status === 'locked' || (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now())) {
    return res.status(403).json({ error: 'This user account is currently locked by an administrator.' });
  }

  const isValid = verifyPin(String(pin), user.pinHash, user.pinSalt);

  if (!isValid) {
    const currentFailed = (lockInfo?.count || 0) + 1;
    if (currentFailed >= 5) {
      const lockDuration = 15 * 60 * 1000; // 15 mins
      failedLogins.set(cleanUsername, { count: currentFailed, lockedUntil: Date.now() + lockDuration });
      db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'ACCOUNT_LOCKED_FAILED_LOGINS',
        module: 'auth',
        reason: '5 consecutive failed PIN attempts'
      });
      return res.status(429).json({ error: 'Too many failed login attempts. Account temporarily locked for 15 minutes.' });
    } else {
      failedLogins.set(cleanUsername, { count: currentFailed, lockedUntil: 0 });
      db.logAudit({
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

  // Clear failed logins
  failedLogins.delete(cleanUsername);

  // Update user last login
  user.failedLoginCount = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date().toISOString();

  // Create session token
  const token = crypto.randomBytes(32).toString('hex');
  const newSession = {
    token,
    userId: user.id,
    expiresAt: Date.now() + 8 * 60 * 60 * 1000 // 8 hours
  };
  sessions.set(token, newSession);
  syncSessionsToDb();

  db.saveData();

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: 'USER_LOGIN',
    module: 'auth'
  });

  return res.json({
    token,
    user: sanitizeUser(user)
  });
});

app.get('/api/auth/me', authenticateSession, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/change-pin', authenticateSession, (req: Request, res: Response) => {
  const user = (req as any).user;
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

  const isValidCurrent = verifyPin(String(currentPin), user.pinHash, user.pinSalt);
  if (!isValidCurrent) {
    return res.status(400).json({ error: 'Current PIN is incorrect.' });
  }

  const newSaltHash = hashPin(String(newPin));
  user.pinHash = newSaltHash.hash;
  user.pinSalt = newSaltHash.salt;
  user.requirePinChange = false;
  user.updatedAt = new Date().toISOString();

  db.saveData();

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: 'CHANGE_PIN',
    module: 'auth'
  });

  return res.json({ message: 'PIN updated successfully.', user: sanitizeUser(user) });
});

app.put('/api/auth/profile', authenticateSession, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { fullName, contactNumber, designation, profileImage, notes } = req.body;

  if (fullName && fullName.trim()) user.fullName = fullName.trim();
  if (contactNumber !== undefined) user.contactNumber = contactNumber;
  if (designation !== undefined) user.designation = designation;
  if (profileImage !== undefined) user.profileImage = profileImage;
  if (notes !== undefined) user.notes = notes;
  user.updatedAt = new Date().toISOString();

  db.saveData();

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: 'UPDATE_PROFILE',
    module: 'auth'
  });

  return res.json({ message: 'Profile updated successfully.', user: sanitizeUser(user) });
});

app.post('/api/auth/logout', authenticateSession, (req: Request, res: Response) => {
  const token = (req as any).token;
  const user = (req as any).user;
  sessions.delete(token);
  syncSessionsToDb();

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: 'USER_LOGOUT',
    module: 'auth'
  });

  return res.json({ message: 'Logged out successfully.' });
});

// ==========================================
// 2. PUBLIC SITE ENDPOINTS
// ==========================================

app.get('/api/public/site', (req: Request, res: Response) => {
  const data = db.getData();
  
  const getSetting = (group: string, key: string, defaultVal: any) => {
    const found = data.settings.find(s => s.group === group && s.key === key);
    return found ? found.value : defaultVal;
  };

  const publicData: PublicSiteData = {
    branding: {
      clubName: getSetting('branding', 'clubName', 'ARC Club'),
      clubAbbreviation: getSetting('branding', 'clubAbbreviation', 'ARC'),
      logo: getSetting('branding', 'logo', ''),
      useLogo: getSetting('branding', 'useLogo', false),
      welcomeHeading: getSetting('branding', 'welcomeHeading', 'Welcome to ARC Club'),
      welcomeMessage: getSetting('branding', 'welcomeMessage', 'Connecting hearts and encouraging excellence.'),
      aboutText: getSetting('branding', 'aboutText', 'ARC Club is a community organization.'),
      headerTitle: getSetting('branding', 'headerTitle', 'ARC Club'),
      headerSubtitle: getSetting('branding', 'headerSubtitle', 'Community & Youth Empowerment Portal'),
      footerDescription: getSetting('branding', 'footerDescription', 'Official community club website and Ramazan Quiz platform.'),
      copyrightText: getSetting('branding', 'copyrightText', `© ${new Date().getFullYear()} ARC Club. All Rights Reserved.`),
      announcement: getSetting('branding', 'announcement', ''),
      announcementActive: getSetting('branding', 'announcementActive', false)
    },
    sectionOrder: getSetting('public_site', 'sectionOrder', ['slideshow', 'welcome', 'vision_mission', 'ramazan_quiz', 'exco_team', 'reach_us', 'social_links']),
    sectionVisibility: getSetting('public_site', 'sectionVisibility', { slideshow: true, welcome: true, vision_mission: true, ramazan_quiz: true, exco_team: true, reach_us: true, social_links: true }),
    slideshow: data.slideshow.filter(s => s.status === 'active').sort((a, b) => a.displayOrder - b.displayOrder),
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
    contacts: (data.contacts as any[]).filter(c => c.status === 'active').sort((a, b) => a.displayOrder - b.displayOrder),
    socialLinks: data.socialLinks.filter(s => s.status === 'active').sort((a, b) => a.displayOrder - b.displayOrder),
    excoMembers: data.excoMembers.filter(e => e.status === 'active').sort((a, b) => a.displayOrder - b.displayOrder),
    events: db.getEvents().filter(e => e.status === 'active').sort((a, b) => a.displayOrder - b.displayOrder)
  };

  res.json(publicData);
});

// Helper to get system hosting time incorporating offset settings
function getSystemNow(): Date {
  const settings = db.getSettings();
  const offsetMinutesSetting = Number(settings.find(s => s.key === 'timeOffsetMinutes')?.value || 0);
  return new Date(Date.now() + (offsetMinutesSetting * 60 * 1000));
}

// Helper to compute quiz state based on server hosting time
function getComputedQuizState(q: QuizQuestion) {
  const now = getSystemNow().getTime();
  const publishTime = q.publishAt ? new Date(q.publishAt).getTime() : 0;
  const closeTime = q.closeAt ? new Date(q.closeAt).getTime() : 0;
  
  const parsedDraw = q.drawStartAt ? new Date(q.drawStartAt).getTime() : NaN;
  const drawTime = !isNaN(parsedDraw) ? parsedDraw : closeTime;

  const parsedReveal = q.revealAt ? new Date(q.revealAt).getTime() : NaN;
  const defaultRevealOffset = (q.rollingDurationSeconds || 10) * 1000;
  const revealTime = !isNaN(parsedReveal) ? parsedReveal : (drawTime + defaultRevealOffset);

  if (q.status === 'cancelled') return 'cancelled';
  if (q.status === 'completed') return 'completed';
  if (q.status === 'winner_announced') return 'winner_announced';

  if (publishTime && now < publishTime) return 'scheduled';
  if (closeTime && now >= publishTime && now < closeTime) return 'open';
  if (closeTime && now >= closeTime && now < drawTime) return 'closed';
  if (drawTime && now >= drawTime && now < revealTime) return 'draw_running';
  if (revealTime && now >= revealTime) return 'winner_announced';

  return q.status;
}

// PUBLIC SYSTEM TIME (Hosting Timezone & Server Offset)
app.get('/api/public/time', (req: Request, res: Response) => {
  const settings = db.getSettings();
  const timezoneSetting = settings.find(s => s.key === 'timezone' || s.key === 'hostingTimezone')?.value || 'Indian/Maldives (GMT+05:00)';
  const offsetMinutesSetting = Number(settings.find(s => s.key === 'timeOffsetMinutes')?.value || 0);

  const now = getSystemNow();
  res.json({
    ok: true,
    serverTimeIso: now.toISOString(),
    serverEpoch: now.getTime(),
    timezone: timezoneSetting,
    offsetMinutes: offsetMinutesSetting
  });
});

// PUBLIC ACTIVE QUIZ
app.get('/api/public/quiz/current', (req: Request, res: Response) => {
  const questions = db.getQuizQuestions();
  const winners = db.getQuizWinners();
  const now = getSystemNow();
  const settings = db.getSettings();
  const timezoneSetting = settings.find(s => s.key === 'timezone' || s.key === 'hostingTimezone')?.value || 'Indian/Maldives (GMT+05:00)';
  const offsetMinutesSetting = Number(settings.find(s => s.key === 'timeOffsetMinutes')?.value || 0);

  // Helper to check if winner announcement is completed for a question
  const isWinnerAnnounced = (q: QuizQuestion) => {
    if (q.status === 'winner_announced' || q.status === 'completed') return true;
    const publishedWinner = winners.find(w => w.questionId === q.id && w.publicStatus === 'published' && !w.isReplaced);
    return Boolean(publishedWinner);
  };

  const nonCancelled = questions.filter(q => q.status !== 'cancelled');
  const publishedQuestions = nonCancelled.filter(q => q.publishAt && new Date(q.publishAt).getTime() <= now.getTime());

  // Find published questions whose winner announcement has NOT been done yet
  const pendingAnnouncementQuestions = publishedQuestions.filter(q => !isWinnerAnnounced(q));

  let activeQuestion: QuizQuestion | undefined;

  if (pendingAnnouncementQuestions.length > 0) {
    // If winner announcement is not done for a published question, keep showing that question (earliest first)
    activeQuestion = pendingAnnouncementQuestions.sort((a, b) => new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime())[0];
  } else if (publishedQuestions.length > 0) {
    // All published questions have had their winners announced; show the latest published question
    activeQuestion = publishedQuestions.sort((a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime())[0];
  } else {
    // Do NOT fall back to future unpublished questions
    activeQuestion = undefined;
  }

  if (!activeQuestion) {
    if (nonCancelled.length > 0) {
      const firstScheduled = nonCancelled.sort((a, b) => {
        const timeA = a.publishAt ? new Date(a.publishAt).getTime() : Infinity;
        const timeB = b.publishAt ? new Date(b.publishAt).getTime() : Infinity;
        if (timeA !== timeB) return timeA - timeB;
        return (a.questionNumber || 0) - (b.questionNumber || 0);
      })[0];

      const settings = db.getSettings();
      const quizHeaderTitleSetting = settings.find(s => s.key === 'quizHeaderTitle' || s.key === 'quizMainTitle')?.value;
      const quizHeaderDescriptionSetting = settings.find(s => s.key === 'quizHeaderDescription' || s.key === 'quizMainDescription')?.value;
      const quizTermsAndRulesSetting = settings.find(s => s.key === 'quizTermsAndRules' || s.key === 'quizRules')?.value;

      return res.json({
        quizAvailable: true,
        serverTime: now.toISOString(),
        question: null,
        nextQuestion: {
          id: firstScheduled.id,
          title: firstScheduled.title,
          questionNumber: firstScheduled.questionNumber,
          questionText: firstScheduled.questionText,
          publishAt: firstScheduled.publishAt,
          prizeTitle: firstScheduled.prizeTitle,
          sponsorName: firstScheduled.sponsorName
        },
        state: 'scheduled',
        quizHeaderTitle: quizHeaderTitleSetting || 'ރަމަޟާން 1447 ދުވަހުގެ ކުއިޒް',
        quizHeaderDescription: quizHeaderDescriptionSetting || 'މިއަދުގެ ސުވާލަށް ރަނގަޅު ޖަވާބު ދެއްވައިގެން ގުރާތުގައި ބައިވެރިވެ އަގުހުރި އިނާމު ހޯއްދަވާ!',
        quizTermsAndRules: quizTermsAndRulesSetting || ''
      });
    }

    return res.json({ quizAvailable: false, state: 'no_quiz' });
  }

  const computedState = getComputedQuizState(activeQuestion);

  // Strip sensitive fields if before reveal
  const isRevealed = ['closed', 'answer_revealed', 'draw_scheduled', 'draw_running', 'winner_announced', 'completed'].includes(computedState);

  const safeQuestion = {
    ...activeQuestion,
    status: computedState,
    correctOptionId: isRevealed ? activeQuestion.correctOptionId : undefined,
    answerExplanation: isRevealed ? activeQuestion.answerExplanation : undefined
  };

  // Get current statistics if enabled in settings
  const showParticipantTotals = settings.find(s => s.key === 'showParticipantTotals')?.value ?? true;
  const rollingDurationSetting = settings.find(s => s.key === 'rollingDurationSeconds')?.value;
  const rollingDurationSeconds = typeof rollingDurationSetting === 'number' ? rollingDurationSetting : (activeQuestion.rollingDurationSeconds || 10);

  const safeQuestionWithSettings = {
    ...safeQuestion,
    rollingDurationSeconds
  };

  const submissions = db.getQuizSubmissions().filter(s => s.questionId === activeQuestion.id && !s.isInvalid && !s.isDisqualified);
  const totalSubmissions = submissions.length;
  const correctSubmissions = isRevealed ? submissions.filter(s => s.isCorrect).length : undefined;

  // Get winner info if announced
  const winner = db.getQuizWinners().find(w => w.questionId === activeQuestion.id && w.publicStatus === 'published' && !w.isReplaced);

  const defaultQuestionImageSetting = settings.find(s => s.key === 'defaultQuestionImage')?.value;
  const showQuestionImageSetting = settings.find(s => s.key === 'showQuestionImage')?.value;
  const quizTermsAndRulesSetting = settings.find(s => s.key === 'quizTermsAndRules' || s.key === 'quizRules')?.value;
  const quizHeaderTitleSetting = settings.find(s => s.key === 'quizHeaderTitle' || s.key === 'quizMainTitle')?.value;
  const quizHeaderDescriptionSetting = settings.find(s => s.key === 'quizHeaderDescription' || s.key === 'quizMainDescription')?.value;

  // Find next upcoming / future question for countdown timer after winner is announced
  const upcomingQuestions = nonCancelled
    .filter(q => q.id !== activeQuestion.id)
    .filter(q => q.publishAt && new Date(q.publishAt).getTime() > now.getTime())
    .sort((a, b) => {
      const timeA = new Date(a.publishAt).getTime();
      const timeB = new Date(b.publishAt).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return (a.questionNumber || 0) - (b.questionNumber || 0);
    });

  const nextQuestionObj = upcomingQuestions[0] ? {
    id: upcomingQuestions[0].id,
    title: upcomingQuestions[0].title,
    questionNumber: upcomingQuestions[0].questionNumber,
    questionText: upcomingQuestions[0].questionText,
    publishAt: upcomingQuestions[0].publishAt,
    prizeTitle: upcomingQuestions[0].prizeTitle,
    sponsorName: upcomingQuestions[0].sponsorName
  } : null;

  res.json({
    quizAvailable: true,
    serverTime: now.toISOString(),
    serverTimeEpoch: now.getTime(),
    timezone: timezoneSetting,
    offsetMinutes: offsetMinutesSetting,
    question: safeQuestionWithSettings,
    nextQuestion: nextQuestionObj,
    state: computedState,
    quizHeaderTitle: quizHeaderTitleSetting || 'ރަމަޟާން 1447 ދުވަހުގެ ކުއިޒް',
    quizHeaderDescription: quizHeaderDescriptionSetting || 'މިއަދުގެ ސުވާލަށް ރަނގަޅު ޖަވާބު ދެއްވައިގެން ގުރާތުގައި ބައިވެރިވެ އަގުހުރި އިނާމު ހޯއްދަވާ!',
    defaultQuestionImage: defaultQuestionImageSetting || '',
    showQuestionImage: showQuestionImageSetting !== false,
    quizTermsAndRules: quizTermsAndRulesSetting || '1. ކޮންމެ ބައިވެރިއަކަށްވެސް ދުވާލަކު ބައިވެރިވެވޭނީ 1 ފަހަރުއެވެ.\n2. ނަސީބުވެރިޔާ ހޮވޭނީ ރަނގަޅު ޖަވާބު ދެއްވާ ބައިވެރިންގެ ތެރެއިން ގުރާތުންނެވެ.\n3. ވަނަ ލިބޭ ފަރާތުގެ އައިޑީ ކާޑާއި ފޯނު ނަންބަރު ސައްޙަވާންޖެހޭނެއެވެ.',
    sponsors: db.getSponsors().filter(s => s.status === 'active').sort((a, b) => a.displayOrder - b.displayOrder),
    prizes: db.getPrizes().filter(p => p.status === 'active'),
    allQuestions: publishedQuestions.map(q => {
      const cState = getComputedQuizState(q);
      const isRev = ['answer_revealed', 'draw_scheduled', 'draw_running', 'winner_announced', 'completed'].includes(cState);
      return {
        id: q.id,
        title: q.title,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        questionImage: q.questionImage,
        showQuestionImage: q.showQuestionImage,
        options: q.options,
        correctOptionId: isRev ? q.correctOptionId : undefined,
        answerExplanation: isRev ? q.answerExplanation : undefined,
        publishAt: q.publishAt,
        closeAt: q.closeAt,
        revealAt: q.revealAt,
        drawStartAt: q.drawStartAt,
        prizeId: q.prizeId,
        prizeTitle: q.prizeTitle,
        prizeDescription: q.prizeDescription,
        sponsorId: q.sponsorId,
        sponsorName: q.sponsorName,
        sponsorLogo: q.sponsorLogo,
        status: cState
      };
    }),
    stats: showParticipantTotals ? {
      totalParticipants: totalSubmissions,
      correctCount: correctSubmissions,
      eligibleCount: isRevealed ? correctSubmissions : undefined
    } : undefined,
    winner: winner ? {
      participantNumber: winner.participantNumber,
      maskedIdNumber: winner.maskedIdNumber,
      maskedContactNumber: winner.maskedContactNumber,
      prizeTitle: winner.prizeTitle,
      prizeDescription: winner.prizeDescription,
      sponsorName: winner.sponsorName,
      sponsorLogo: winner.sponsorLogo,
      auditReference: winner.auditReference,
      selectedAt: winner.selectedAt
    } : undefined
  });
});

// PUBLIC QUIZ SUBMISSION
app.post('/api/public/quiz/submit', (req: Request, res: Response) => {
  const { questionId, idNumber, contactNumber, selectedOptionId, consentAccepted } = req.body;

  if (!questionId || !idNumber || !contactNumber || !selectedOptionId || !consentAccepted) {
    return res.status(400).json({ error: 'Please fill in all required fields and accept the consent agreement.' });
  }

  const questions = db.getQuizQuestions();
  const question = questions.find(q => q.id === questionId);

  if (!question) {
    return res.status(404).json({ error: 'Quiz question not found.' });
  }

  const computedState = getComputedQuizState(question);
  if (computedState !== 'open') {
    return res.status(400).json({ error: 'Submissions are currently closed for this quiz question.' });
  }

  // Normalize ID and Contact
  const normId = String(idNumber).trim().toUpperCase().replace(/\s+/g, '');
  const normContact = String(contactNumber).trim().replace(/[^\d+]/g, '');

  if (normId.length < 5) {
    return res.status(400).json({ error: 'Please enter a valid ID / Passport number.' });
  }

  if (normContact.length < 7) {
    return res.status(400).json({ error: 'Please enter a valid contact phone number.' });
  }

  // Duplicate Check
  const submissions = db.getQuizSubmissions();
  const existingIdSub = submissions.find(s => s.questionId === questionId && s.normalizedIdNumber === normId && !s.isInvalid);
  const existingContactSub = submissions.find(s => s.questionId === questionId && s.maskedContactNumber.includes(normContact.slice(-4)) && !s.isInvalid);

  const settings = db.getSettings();
  const allowAnswerUpdate = settings.find(s => s.key === 'allowAnswerUpdate')?.value ?? false;

  if ((existingIdSub || existingContactSub) && !allowAnswerUpdate) {
    return res.status(400).json({ error: 'This ID or contact number has already submitted an answer for this quiz.' });
  }

  // Validate option choice
  const selectedOption = question.options.find(o => o.id === selectedOptionId);
  if (!selectedOption) {
    return res.status(400).json({ error: 'Invalid answer option selected.' });
  }

  const isCorrect = selectedOptionId === question.correctOptionId;

  let submissionToSave: QuizSubmission;

  if (existingIdSub && allowAnswerUpdate) {
    // Update existing submission
    existingIdSub.selectedOptionId = selectedOptionId;
    existingIdSub.isCorrect = isCorrect;
    existingIdSub.isEligible = isCorrect;
    existingIdSub.selectedOptionLabel = selectedOption.optionLabel;
    existingIdSub.selectedOptionText = selectedOption.optionText;
    existingIdSub.updatedAt = new Date().toISOString();
    submissionToSave = existingIdSub;
  } else {
    // Generate unique participant number e.g. RQ-0042
    const questionSubmissionsCount = submissions.filter(s => s.questionId === questionId).length + 1;
    const participantNumber = `RQ-${questionSubmissionsCount.toString().padStart(4, '0')}`;

    const maskedId = `${normId.substring(0, 3)}***${normId.slice(-2)}`;
    const maskedPhone = `${normContact.substring(0, 2)}***${normContact.slice(-2)}`;

    const excoMembers = db.getExcoMembers();
    const clubMembers = db.getMembers();
    const allUsers = db.getUsers();

    const isExcoMember = excoMembers.some(ex => ex.idCardNumber && ex.idCardNumber.trim().toUpperCase() === normId) ||
      clubMembers.some(cm => cm.idCardNumber && cm.idCardNumber.trim().toUpperCase() === normId && (cm.memberType === 'exco' || Boolean(cm.excoDesignation))) ||
      allUsers.some(u => {
        const isExcoRole = u.roleName === 'EXCO Member' || u.roleId === 'role_exco' || ['role_president', 'role_vp', 'role_treasurer', 'role_secretary'].includes(u.roleId);
        if (!isExcoRole) return false;
        const linkedM = clubMembers.find(m => m.id === u.memberId);
        return Boolean(linkedM && linkedM.idCardNumber && linkedM.idCardNumber.trim().toUpperCase() === normId);
      });

    const isMasterIneligible = db.getIneligibleParticipantIds().includes(normId);
    const isDisqualified = isExcoMember || isMasterIneligible;
    const disqualificationReason = isExcoMember 
      ? 'exco member' 
      : (isMasterIneligible ? 'Participant marked as Not Eligible by Admin' : undefined);

    submissionToSave = {
      id: `sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      questionId,
      participantNumber,
      normalizedIdNumber: normId,
      contactNumber: normContact,
      maskedIdNumber: maskedId,
      maskedContactNumber: maskedPhone,
      selectedOptionId,
      isCorrect,
      isEligible: Boolean(isCorrect && !isDisqualified),
      isInvalid: false,
      isDisqualified,
      disqualificationReason,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      selectedOptionLabel: selectedOption.optionLabel,
      selectedOptionText: selectedOption.optionText
    };

    submissions.push(submissionToSave);
  }

  db.saveData();

  return res.json({
    success: true,
    message: 'Your answer has been submitted successfully. Please return after the correct-answer reveal time to check the result and lucky draw.',
    participantNumber: submissionToSave.participantNumber
  });
});

// PUBLIC QUIZ RESULTS HISTORY
app.get('/api/public/quiz/results', (req: Request, res: Response) => {
  const questions = db.getQuizQuestions();
  const winners = db.getQuizWinners();

  const completedQuestions = questions.filter(q => 
    winners.some(w => w.questionId === q.id && w.publicStatus === 'published' && !w.isReplaced) ||
    ['winner_announced', 'completed', 'answer_revealed'].includes(getComputedQuizState(q))
  );

  const results = completedQuestions.map(q => {
    const winner = winners.find(w => w.questionId === q.id && w.publicStatus === 'published' && !w.isReplaced);
    return {
      id: q.id,
      title: q.title,
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      publishAt: q.publishAt,
      closeAt: q.closeAt,
      revealAt: q.revealAt,
      drawStartAt: q.drawStartAt,
      correctOption: q.options.find(o => o.id === q.correctOptionId),
      answerExplanation: q.answerExplanation,
      prizeTitle: q.prizeTitle,
      sponsorName: q.sponsorName,
      winner: winner ? {
        participantNumber: winner.participantNumber,
        maskedIdNumber: winner.maskedIdNumber,
        maskedContactNumber: winner.maskedContactNumber,
        prizeTitle: winner.prizeTitle,
        sponsorName: winner.sponsorName,
        selectedAt: winner.selectedAt,
        prizeCollectionStatus: winner.prizeCollectionStatus || (winner.isPrizeCollected ? 'collected' : 'pending')
      } : null
    };
  });

  res.json({ results });
});

// PUBLIC ELIGIBLE NUMBERS FOR ROLLING LUCKY DRAW
app.get('/api/public/quiz/eligible-numbers/:questionId', (req: Request, res: Response) => {
  const { questionId } = req.params;
  const question = db.getQuizQuestions().find(q => q.id === questionId);

  if (!question) return res.status(404).json({ error: 'Question not found' });

  const ineligibleSet = new Set(db.getIneligibleParticipantIds());
  const allCorrectSubmissions = db.getQuizSubmissions().filter(s => s.questionId === questionId && !s.isInvalid && s.isCorrect);

  const contacts = allCorrectSubmissions.map(s => {
    const normId = (s.normalizedIdNumber || '').toUpperCase();
    const isMasterIneligible = ineligibleSet.has(normId);
    const isNotEligible = Boolean(s.isDisqualified || isMasterIneligible || s.isEligible === false);
    return {
      participantNumber: s.participantNumber,
      contactNumber: s.maskedContactNumber || (s.contactNumber ? `${s.contactNumber.slice(0, 2)}***${s.contactNumber.slice(-2)}` : '***'),
      isEligible: !isNotEligible,
      isDisqualified: isNotEligible,
      disqualificationReason: s.disqualificationReason || (isMasterIneligible ? 'Not Eligible (Admin Master List)' : undefined)
    };
  });

  const eligibleContacts = contacts.filter(c => c.isEligible && !c.isDisqualified);
  const numbers = eligibleContacts.map(c => c.participantNumber);

  const settings = db.getSettings();
  const rollingDurationSetting = settings.find(s => s.key === 'rollingDurationSeconds')?.value;
  const rollingDurationSeconds = typeof rollingDurationSetting === 'number' ? rollingDurationSetting : (question.rollingDurationSeconds || 10);

  res.json({
    questionId,
    totalEligible: numbers.length,
    totalCorrect: contacts.length,
    participantNumbers: numbers,
    participantContacts: contacts,
    rollingDurationSeconds
  });
});

// ==========================================
// 3. PORTAL DASHBOARD & OPERATIONS
// ==========================================

app.get('/api/portal/dashboard/stats', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const data = db.getData();

  const activeQuiz = data.quizQuestions.find(q => getComputedQuizState(q) === 'open');
  const totalSubmissions = data.quizSubmissions.length;
  const correctSubmissions = data.quizSubmissions.filter(s => s.isCorrect).length;
  const totalWinners = data.quizWinners.filter(w => !w.isReplaced).length;
  const activeSlides = data.slideshow.filter(s => s.status === 'active').length;
  const publishedExco = data.excoMembers.filter(e => e.status === 'active').length;
  const activeUsers = data.users.filter(u => u.status === 'active').length;
  const totalUsers = data.users.length;
  const totalMembers = (data.members || []).length;
  const totalEvents = (data.eventItems || []).length;
  const totalMeetings = (data.meetingItems || []).length;
  const pendingMessages = (data.messages || []).filter(m => m.status === 'pending').length;

  res.json({
    activeQuiz: activeQuiz ? { title: activeQuiz.title, questionNumber: activeQuiz.questionNumber } : null,
    totalQuestions: data.quizQuestions.length,
    totalParticipants: totalSubmissions,
    correctParticipants: correctSubmissions,
    totalWinners,
    activeSlideshowImages: activeSlides,
    publishedExcoMembers: publishedExco,
    activeUsers,
    totalUsers,
    totalMembers,
    totalEvents,
    totalMeetings,
    pendingMessages,
    recentSubmissions: data.quizSubmissions.slice(-5).reverse(),
    recentWinners: data.quizWinners.slice(-5).reverse(),
    recentAuditLogs: data.auditLogs.slice(-5)
  });
});

// SLIDESHOW MANAGMENT
app.get('/api/portal/slideshow', authenticateSession, requirePermission('slideshow', 'canView'), (req: Request, res: Response) => {
  const slides = db.getSlideshow().sort((a, b) => a.displayOrder - b.displayOrder);
  res.json(slides);
});

app.post('/api/portal/slideshow', authenticateSession, requirePermission('slideshow', 'canCreate'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const newSlide = req.body;

  const slides = db.getSlideshow();
  const slideToSave = {
    ...newSlide,
    id: `slide_${Date.now()}`,
    displayOrder: slides.length + 1,
    status: newSlide.status || 'active',
    createdBy: user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  slides.push(slideToSave);
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'CREATE_SLIDESHOW', module: 'slideshow', recordId: slideToSave.id
  });

  res.json(slideToSave);
});

app.put('/api/portal/slideshow/:id', authenticateSession, requirePermission('slideshow', 'canEdit'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const slides = db.getSlideshow();
  const idx = slides.findIndex(s => s.id === id);

  if (idx === -1) return res.status(404).json({ error: 'Slide not found' });

  slides[idx] = { ...slides[idx], ...req.body, updatedAt: new Date().toISOString() };
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'UPDATE_SLIDESHOW', module: 'slideshow', recordId: id
  });

  res.json(slides[idx]);
});

app.delete('/api/portal/slideshow/:id', authenticateSession, requirePermission('slideshow', 'canDelete'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  let slides = db.getSlideshow();
  const filtered = slides.filter(s => s.id !== id);

  db.getData().slideshow = filtered;
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'DELETE_SLIDESHOW', module: 'slideshow', recordId: id
  });

  res.json({ message: 'Slide deleted' });
});

// CONTENT & BRANDING MANAGEMENT
app.get('/api/portal/content', authenticateSession, requirePermission('content', 'canView'), (req: Request, res: Response) => {
  res.json({ settings: db.getSettings() });
});

app.put('/api/portal/content', authenticateSession, requirePermission('content', 'canEdit'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { settings } = req.body;

  if (Array.isArray(settings)) {
    const currentSettings = db.getSettings();
    settings.forEach((item: any) => {
      const idx = currentSettings.findIndex(s => s.group === item.group && s.key === item.key);
      if (idx !== -1) {
        currentSettings[idx].value = item.value;
        currentSettings[idx].updatedBy = user.id;
        currentSettings[idx].updatedAt = new Date().toISOString();
      } else {
        currentSettings.push({
          id: `set_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          group: item.group,
          key: item.key,
          value: item.value,
          updatedBy: user.id,
          updatedAt: new Date().toISOString()
        });
      }
    });

    // Auto sync global quiz prize & sponsor to all questions if updated
    const defaultPrizeTitle = currentSettings.find(s => s.key === 'defaultPrizeTitle')?.value;
    const defaultPrizeDescription = currentSettings.find(s => s.key === 'defaultPrizeDescription')?.value;
    const defaultSponsorName = currentSettings.find(s => s.key === 'defaultSponsorName')?.value;
    const defaultSponsorLogo = currentSettings.find(s => s.key === 'defaultSponsorLogo')?.value;
    const defaultPrizeId = currentSettings.find(s => s.key === 'defaultPrizeId')?.value;
    const defaultSponsorId = currentSettings.find(s => s.key === 'defaultSponsorId')?.value;

    if (defaultPrizeTitle || defaultSponsorName) {
      const questions = db.getQuizQuestions();
      questions.forEach(q => {
        if (defaultPrizeTitle) q.prizeTitle = defaultPrizeTitle;
        if (defaultPrizeDescription !== undefined) q.prizeDescription = defaultPrizeDescription;
        if (defaultSponsorName) q.sponsorName = defaultSponsorName;
        if (defaultSponsorLogo !== undefined) q.sponsorLogo = defaultSponsorLogo;
        if (defaultPrizeId) q.prizeId = defaultPrizeId;
        if (defaultSponsorId) q.sponsorId = defaultSponsorId;
      });
    }

    db.saveData();
    db.logAudit({
      userId: user.id, username: user.username, fullName: user.fullName,
      action: 'UPDATE_CONTENT', module: 'content'
    });
  }

  res.json({ message: 'Content updated successfully' });
});

// EXCO TEAM MANAGEMENT
app.get('/api/portal/exco-team', authenticateSession, requirePermission('exco_team', 'canView'), (req: Request, res: Response) => {
  const members = db.getExcoMembers().sort((a, b) => a.displayOrder - b.displayOrder);
  res.json(members);
});

app.post('/api/portal/exco-team', authenticateSession, requirePermission('exco_team', 'canCreate'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const members = db.getExcoMembers();
  const newMember = {
    ...req.body,
    id: `exco_${Date.now()}`,
    displayOrder: members.length + 1,
    status: req.body.status || 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  members.push(newMember);
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'CREATE_EXCO', module: 'exco_team', recordId: newMember.id
  });

  res.json(newMember);
});

app.put('/api/portal/exco-team/:id', authenticateSession, requirePermission('exco_team', 'canEdit'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const members = db.getExcoMembers();
  const idx = members.findIndex(m => m.id === id);

  if (idx === -1) return res.status(404).json({ error: 'EXCO member not found' });

  members[idx] = { ...members[idx], ...req.body, updatedAt: new Date().toISOString() };
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'UPDATE_EXCO', module: 'exco_team', recordId: id
  });

  res.json(members[idx]);
});

app.delete('/api/portal/exco-team/:id', authenticateSession, requirePermission('exco_team', 'canDelete'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const members = db.getExcoMembers();
  db.getData().excoMembers = members.filter(m => m.id !== id);
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'DELETE_EXCO', module: 'exco_team', recordId: id
  });

  res.json({ message: 'Member deleted' });
});

// EVENTS & PHOTO ALBUMS MANAGEMENT
app.get('/api/portal/events', authenticateSession, (req: Request, res: Response) => {
  const events = db.getEvents().sort((a, b) => a.displayOrder - b.displayOrder);
  res.json(events);
});

app.post('/api/portal/events', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { title, summary, description, eventDate, location, coverImage, photoAlbum, displayOrder, status } = req.body;
  
  if (!title || !summary) {
    return res.status(400).json({ message: 'Title and summary are required.' });
  }

  const newEvt = db.createEvent({
    title,
    summary,
    description: description || '',
    eventDate: eventDate || '',
    location: location || '',
    coverImage: coverImage || (Array.isArray(photoAlbum) && photoAlbum[0]) || '',
    photoAlbum: Array.isArray(photoAlbum) ? photoAlbum : [],
    displayOrder: Number(displayOrder) || 1,
    status: status || 'active',
    createdBy: user.id
  });

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'CREATE_EVENT', module: 'content', recordId: newEvt.id, newValue: newEvt
  });

  res.json(newEvt);
});

app.put('/api/portal/events/:id', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  
  const updated = db.updateEvent(id, req.body);
  if (!updated) return res.status(404).json({ message: 'Event not found.' });

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'UPDATE_EVENT', module: 'content', recordId: id, newValue: updated
  });

  res.json(updated);
});

app.delete('/api/portal/events/:id', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;

  const deleted = db.deleteEvent(id);
  if (!deleted) return res.status(404).json({ message: 'Event not found.' });

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'DELETE_EVENT', module: 'content', recordId: id
  });

  res.json({ message: 'Event deleted' });
});

// RAMAZAN QUIZ QUESTION MANAGEMENT
app.get('/api/portal/ramazan-quiz', authenticateSession, requirePermission('ramazan_quiz', 'canView'), (req: Request, res: Response) => {
  const questions = db.getQuizQuestions().map(q => {
    const subs = db.getQuizSubmissions().filter(s => s.questionId === q.id && !s.isInvalid && !s.isDisqualified);
    const correct = subs.filter(s => s.isCorrect);
    return {
      ...q,
      totalParticipants: subs.length,
      correctCount: correct.length,
      eligibleCount: correct.length
    };
  });
  res.json(questions);
});

app.post('/api/portal/ramazan-quiz', authenticateSession, requirePermission('ramazan_quiz', 'canCreate'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const questions = db.getQuizQuestions();

  const settings = db.getSettings();
  const defaultPrizeTitle = settings.find(s => s.key === 'defaultPrizeTitle')?.value || 'ARC Club Ramazan Gift Pack';
  const defaultPrizeDesc = settings.find(s => s.key === 'defaultPrizeDescription')?.value || '';
  const defaultSponsorName = settings.find(s => s.key === 'defaultSponsorName')?.value || 'Ananda Recreation Club';
  const defaultSponsorLogo = settings.find(s => s.key === 'defaultSponsorLogo')?.value || '';
  const rollingDurSetting = settings.find(s => s.key === 'rollingDurationSeconds')?.value || 12;

  const rollingDurationSeconds = Number(req.body.rollingDurationSeconds) || Number(rollingDurSetting) || 12;
  const revealAt = req.body.revealAt;
  let drawStartAt = req.body.drawStartAt;

  if (!drawStartAt && revealAt) {
    const revDate = new Date(revealAt);
    if (!isNaN(revDate.getTime())) {
      drawStartAt = new Date(revDate.getTime() - rollingDurationSeconds * 1000).toISOString();
    }
  }

  let finalDrawStartAt = drawStartAt || revealAt || req.body.closeAt;
  let finalRevealAt = revealAt || drawStartAt || req.body.closeAt;
  if (new Date(finalRevealAt).getTime() <= new Date(finalDrawStartAt).getTime()) {
    finalRevealAt = new Date(new Date(finalDrawStartAt).getTime() + rollingDurationSeconds * 1000).toISOString();
  }

  const newQ: QuizQuestion = {
    ...req.body,
    prizeTitle: req.body.prizeTitle || defaultPrizeTitle,
    prizeDescription: req.body.prizeDescription || defaultPrizeDesc,
    sponsorName: req.body.sponsorName || defaultSponsorName,
    sponsorLogo: req.body.sponsorLogo || defaultSponsorLogo,
    rollingDurationSeconds,
    drawStartAt: finalDrawStartAt,
    revealAt: finalRevealAt,
    id: `q_ramazan_${Date.now()}`,
    createdBy: user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  questions.push(newQ);
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'CREATE_QUIZ_QUESTION', module: 'ramazan_quiz', recordId: newQ.id
  });

  res.json(newQ);
});

app.put('/api/portal/ramazan-quiz/:id', authenticateSession, requirePermission('ramazan_quiz', 'canEdit'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const questions = db.getQuizQuestions();
  const idx = questions.findIndex(q => q.id === id);

  if (idx === -1) return res.status(404).json({ error: 'Quiz question not found' });

  const settings = db.getSettings();
  const defaultPrizeTitle = settings.find(s => s.key === 'defaultPrizeTitle')?.value || 'ARC Club Ramazan Gift Pack';
  const defaultPrizeDesc = settings.find(s => s.key === 'defaultPrizeDescription')?.value || '';
  const defaultSponsorName = settings.find(s => s.key === 'defaultSponsorName')?.value || 'Ananda Recreation Club';
  const defaultSponsorLogo = settings.find(s => s.key === 'defaultSponsorLogo')?.value || '';
  const rollingDurSetting = settings.find(s => s.key === 'rollingDurationSeconds')?.value || 12;

  const rollingDurationSeconds = Number(req.body.rollingDurationSeconds) || questions[idx].rollingDurationSeconds || Number(rollingDurSetting) || 12;
  const revealAt = req.body.revealAt || questions[idx].revealAt;
  let drawStartAt = req.body.drawStartAt || questions[idx].drawStartAt;

  if (!drawStartAt && revealAt) {
    const revDate = new Date(revealAt);
    if (!isNaN(revDate.getTime())) {
      drawStartAt = new Date(revDate.getTime() - rollingDurationSeconds * 1000).toISOString();
    }
  }

  let finalDrawStartAt = drawStartAt || questions[idx].closeAt;
  let finalRevealAt = revealAt || finalDrawStartAt;
  if (new Date(finalRevealAt).getTime() <= new Date(finalDrawStartAt).getTime()) {
    finalRevealAt = new Date(new Date(finalDrawStartAt).getTime() + rollingDurationSeconds * 1000).toISOString();
  }

  questions[idx] = {
    ...questions[idx],
    ...req.body,
    prizeTitle: req.body.prizeTitle || defaultPrizeTitle,
    prizeDescription: req.body.prizeDescription || defaultPrizeDesc,
    sponsorName: req.body.sponsorName || defaultSponsorName,
    sponsorLogo: req.body.sponsorLogo || defaultSponsorLogo,
    rollingDurationSeconds,
    drawStartAt: finalDrawStartAt,
    revealAt: finalRevealAt,
    updatedAt: new Date().toISOString()
  };
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'UPDATE_QUIZ_QUESTION', module: 'ramazan_quiz', recordId: id
  });

  res.json(questions[idx]);
});

app.delete('/api/portal/ramazan-quiz/:id', authenticateSession, requirePermission('ramazan_quiz', 'canDelete'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const questions = db.getQuizQuestions();
  const idx = questions.findIndex(q => q.id === id);

  if (idx === -1) return res.status(404).json({ error: 'Quiz question not found' });

  const deletedQ = questions[idx];
  db.getData().quizQuestions = questions.filter(q => q.id !== id);

  // Clear recorded winners for deleted question
  const winners = db.getQuizWinners();
  db.getData().quizWinners = winners.filter(w => w.questionId !== id);

  // Clear submissions for deleted question
  const submissions = db.getQuizSubmissions();
  db.getData().quizSubmissions = submissions.filter(s => s.questionId !== id);

  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'DELETE_QUIZ_QUESTION', module: 'ramazan_quiz', recordId: id,
    previousValue: { title: deletedQ.title, questionNumber: deletedQ.questionNumber }
  });

  res.json({ message: 'Quiz question and associated recorded winner deleted successfully.' });
});

// MANUAL QUIZ ACTIONS (Publish, Open, Close, Reveal, Trigger Secure Lucky Draw)
app.post('/api/portal/ramazan-quiz/:id/action', authenticateSession, requirePermission('ramazan_quiz', 'canPublish'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const { action, reason } = req.body;

  const questions = db.getQuizQuestions();
  const q = questions.find(item => item.id === id);

  if (!q) return res.status(404).json({ error: 'Question not found' });

  const now = new Date();

  if (action === 'open_now') {
    q.status = 'open';
    q.publishAt = now.toISOString();
  } else if (action === 'close_now') {
    q.status = 'closed';
    q.closeAt = now.toISOString();
  } else if (action === 'reveal_now') {
    q.status = 'answer_revealed';
    q.revealAt = now.toISOString();
  } else if (action === 'start_draw_now') {
    q.status = 'draw_running';
    q.drawStartAt = now.toISOString();

    // Check if an active winner is ALREADY recorded for this question
    const existingWinner = db.getQuizWinners().find(w => w.questionId === id && !w.isReplaced);
    if (existingWinner) {
      q.status = 'winner_announced';
      q.updatedAt = new Date().toISOString();
      db.saveData();
      return res.json({ message: 'Winner already recorded for this question.', winner: existingWinner, question: q });
    }

    // SECURE SERVER-SIDE WINNER SELECTION
    const eligibleSubmissions = db.getQuizSubmissions().filter(s => s.questionId === id && !s.isInvalid && !s.isDisqualified && s.isCorrect);

    if (eligibleSubmissions.length === 0) {
      db.saveData();
      return res.json({ message: 'Draw started, but no eligible participants were available.', question: q });
    }

    // Secure cryptographic random selection
    const randomIndex = crypto.randomInt(0, eligibleSubmissions.length);
    const selectedSub = eligibleSubmissions[randomIndex];

    // Audit Reference Code
    const auditRef = `AUD-DRAW-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newWinner: QuizWinner = {
      id: `win_${Date.now()}`,
      questionId: id,
      questionNumber: q.questionNumber,
      submissionId: selectedSub.id,
      participantNumber: selectedSub.participantNumber,
      maskedIdNumber: selectedSub.maskedIdNumber,
      maskedContactNumber: selectedSub.maskedContactNumber,
      fullName: 'Winner Participant',
      contactNumber: selectedSub.contactNumber || selectedSub.maskedContactNumber,
      idNumber: selectedSub.normalizedIdNumber || selectedSub.maskedIdNumber,
      prizeTitle: q.prizeTitle,
      prizeDescription: q.prizeDescription,
      sponsorName: q.sponsorName,
      sponsorLogo: q.sponsorLogo,
      eligibleCount: eligibleSubmissions.length,
      selectedAt: new Date().toISOString(),
      selectedBy: user.id,
      selectionMethod: 'random',
      auditReference: auditRef,
      contactedStatus: 'not_contacted',
      prizeCollectionStatus: 'pending',
      publicStatus: 'published',
      internalNotes: `Winner drawn by ${user.fullName} (${user.username}).`
    };

    db.getQuizWinners().push(newWinner);
    q.status = 'winner_announced';

    db.logAudit({
      userId: user.id, username: user.username, fullName: user.fullName,
      action: 'SELECT_QUIZ_WINNER', module: 'ramazan_quiz', recordId: newWinner.id,
      newValue: { winner: selectedSub.participantNumber, auditReference: auditRef, eligibleCount: eligibleSubmissions.length },
      reason
    });
  } else if (action === 'cancel') {
    q.status = 'cancelled';
  }

  q.updatedAt = new Date().toISOString();
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: `QUIZ_ACTION_${action.toUpperCase()}`, module: 'ramazan_quiz', recordId: id, reason
  });

  res.json({ message: `Action ${action} executed successfully`, question: q });
});

// ==========================================
// QUIZ PRIZES MANAGEMENT API
// ==========================================
app.get('/api/portal/quiz-prizes', authenticateSession, requirePermission('ramazan_quiz', 'canView'), (req: Request, res: Response) => {
  res.json(db.getPrizes());
});

app.post('/api/portal/quiz-prizes', authenticateSession, requirePermission('ramazan_quiz', 'canCreate'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const prizes = db.getPrizes();
  const newPrize: QuizPrize = {
    ...req.body,
    id: `prz_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    status: req.body.status || 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  prizes.push(newPrize);
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'CREATE_PRIZE', module: 'ramazan_quiz', recordId: newPrize.id
  });

  res.json(newPrize);
});

app.put('/api/portal/quiz-prizes/:id', authenticateSession, requirePermission('ramazan_quiz', 'canEdit'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const prizes = db.getPrizes();
  const idx = prizes.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Prize not found' });

  prizes[idx] = { ...prizes[idx], ...req.body, updatedAt: new Date().toISOString() };
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'UPDATE_PRIZE', module: 'ramazan_quiz', recordId: id
  });

  res.json(prizes[idx]);
});

app.delete('/api/portal/quiz-prizes/:id', authenticateSession, requirePermission('ramazan_quiz', 'canDelete'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const prizes = db.getPrizes();
  const idx = prizes.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Prize not found' });

  prizes.splice(idx, 1);
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'DELETE_PRIZE', module: 'ramazan_quiz', recordId: id
  });

  res.json({ message: 'Prize deleted' });
});

// ==========================================
// QUIZ SPONSORS MANAGEMENT API
// ==========================================
app.get('/api/portal/quiz-sponsors', authenticateSession, requirePermission('ramazan_quiz', 'canView'), (req: Request, res: Response) => {
  res.json(db.getSponsors());
});

app.post('/api/portal/quiz-sponsors', authenticateSession, requirePermission('ramazan_quiz', 'canCreate'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const sponsors = db.getSponsors();
  const newSponsor: QuizSponsor = {
    ...req.body,
    id: `spn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    status: req.body.status || 'active',
    displayOrder: req.body.displayOrder || (sponsors.length + 1),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  sponsors.push(newSponsor);
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'CREATE_SPONSOR', module: 'ramazan_quiz', recordId: newSponsor.id
  });

  res.json(newSponsor);
});

app.put('/api/portal/quiz-sponsors/:id', authenticateSession, requirePermission('ramazan_quiz', 'canEdit'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const sponsors = db.getSponsors();
  const idx = sponsors.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Sponsor not found' });

  sponsors[idx] = { ...sponsors[idx], ...req.body, updatedAt: new Date().toISOString() };
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'UPDATE_SPONSOR', module: 'ramazan_quiz', recordId: id
  });

  res.json(sponsors[idx]);
});

app.delete('/api/portal/quiz-sponsors/:id', authenticateSession, requirePermission('ramazan_quiz', 'canDelete'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const sponsors = db.getSponsors();
  const idx = sponsors.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Sponsor not found' });

  sponsors.splice(idx, 1);
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'DELETE_SPONSOR', module: 'ramazan_quiz', recordId: id
  });

  res.json({ message: 'Sponsor deleted' });
});

// QUIZ PARTICIPANTS MANAGEMENT
app.get('/api/portal/quiz-participants', authenticateSession, requirePermission('quiz_participants', 'canView'), (req: Request, res: Response) => {
  let submissions = db.getQuizSubmissions();
  const { search, questionId, status } = req.query;
  const ineligibleSet = new Set(db.getIneligibleParticipantIds());

  // Enrich with computed fields
  submissions = submissions.map(s => {
    const isMasterIneligible = ineligibleSet.has((s.normalizedIdNumber || '').toUpperCase());
    const isDisqualified = Boolean(s.isDisqualified || isMasterIneligible);
    const isEligible = Boolean(s.isCorrect && !isDisqualified && !s.isInvalid);
    return {
      ...s,
      isDisqualified,
      isEligible,
      isEligibleForDraw: isEligible,
      disqualificationReason: isMasterIneligible ? 'Not Eligible (Master Participant List)' : s.disqualificationReason
    };
  });

  if (questionId && questionId !== 'all') {
    submissions = submissions.filter(s => s.questionId === String(questionId));
  }

  if (status && status !== 'all') {
    if (status === 'correct') {
      submissions = submissions.filter(s => s.isCorrect);
    } else if (status === 'eligible') {
      submissions = submissions.filter(s => s.isEligible);
    } else if (status === 'disqualified' || status === 'not_eligible') {
      submissions = submissions.filter(s => s.isDisqualified);
    } else if (status === 'ineligible') {
      submissions = submissions.filter(s => !s.isEligible && !s.isDisqualified);
    }
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    const q = search.trim().toLowerCase();
    submissions = submissions.filter(s => 
      (s.participantNumber && s.participantNumber.toLowerCase().includes(q)) ||
      (s.normalizedIdNumber && s.normalizedIdNumber.toLowerCase().includes(q)) ||
      (s.idNumber && s.idNumber.toLowerCase().includes(q)) ||
      (s.maskedIdNumber && s.maskedIdNumber.toLowerCase().includes(q)) ||
      (s.contactNumber && s.contactNumber.toLowerCase().includes(q)) ||
      (s.maskedContactNumber && s.maskedContactNumber.toLowerCase().includes(q)) ||
      (s.selectedOptionLabel && s.selectedOptionLabel.toLowerCase().includes(q))
    );
  }

  res.json(submissions);
});

// ALL TIME MASTER PARTICIPANTS LIST
app.get('/api/portal/master-participants', authenticateSession, requirePermission('quiz_participants', 'canView'), (req: Request, res: Response) => {
  const submissions = db.getQuizSubmissions();
  const ineligibleSet = new Set(db.getIneligibleParticipantIds());
  const { search, status } = req.query;

  const map = new Map<string, {
    idNumber: string;
    normalizedIdNumber: string;
    contactNumber: string;
    maskedIdNumber: string;
    maskedContactNumber: string;
    totalSubmissions: number;
    correctCount: number;
    isNotEligible: boolean;
    lastSubmittedAt: string;
  }>();

  for (const s of submissions) {
    const key = (s.normalizedIdNumber || s.idNumber || s.maskedIdNumber || '').trim().toUpperCase();
    if (!key) continue;

    const isMasterNotEligible = ineligibleSet.has(key);

    if (!map.has(key)) {
      map.set(key, {
        idNumber: s.normalizedIdNumber || s.idNumber || s.maskedIdNumber,
        normalizedIdNumber: key,
        contactNumber: s.contactNumber || s.maskedContactNumber || '',
        maskedIdNumber: s.maskedIdNumber || key,
        maskedContactNumber: s.maskedContactNumber || '',
        totalSubmissions: 1,
        correctCount: s.isCorrect ? 1 : 0,
        isNotEligible: isMasterNotEligible || Boolean(s.isDisqualified),
        lastSubmittedAt: s.submittedAt || ''
      });
    } else {
      const existing = map.get(key)!;
      existing.totalSubmissions += 1;
      if (s.isCorrect) existing.correctCount += 1;
      if (s.submittedAt > existing.lastSubmittedAt) {
        existing.lastSubmittedAt = s.submittedAt;
      }
      if (isMasterNotEligible) existing.isNotEligible = true;
    }
  }

  for (const ineligId of ineligibleSet) {
    if (!map.has(ineligId)) {
      map.set(ineligId, {
        idNumber: ineligId,
        normalizedIdNumber: ineligId,
        contactNumber: 'N/A',
        maskedIdNumber: ineligId,
        maskedContactNumber: 'N/A',
        totalSubmissions: 0,
        correctCount: 0,
        isNotEligible: true,
        lastSubmittedAt: ''
      });
    }
  }

  let list = Array.from(map.values());

  if (status && status !== 'all') {
    if (status === 'eligible') {
      list = list.filter(p => !p.isNotEligible);
    } else if (status === 'not_eligible' || status === 'disqualified') {
      list = list.filter(p => p.isNotEligible);
    }
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    const q = search.trim().toLowerCase();
    list = list.filter(p =>
      p.normalizedIdNumber.toLowerCase().includes(q) ||
      p.contactNumber.toLowerCase().includes(q) ||
      p.maskedIdNumber.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => b.totalSubmissions - a.totalSubmissions || a.normalizedIdNumber.localeCompare(b.normalizedIdNumber));

  res.json({ participants: list });
});

// TOGGLE MASTER PARTICIPANT ELIGIBILITY
app.post('/api/portal/master-participants/toggle-eligibility', authenticateSession, requirePermission('quiz_participants', 'canEdit'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { idNumber, isNotEligible, reason } = req.body;

  if (!idNumber) return res.status(400).json({ error: 'ID Number is required' });

  const normId = String(idNumber).trim().toUpperCase().replace(/\s+/g, '');
  db.setIneligibleParticipantStatus(normId, Boolean(isNotEligible));

  const submissions = db.getQuizSubmissions();
  submissions.forEach(s => {
    if ((s.normalizedIdNumber || '').toUpperCase() === normId) {
      s.isDisqualified = Boolean(isNotEligible);
      s.isEligible = Boolean(!isNotEligible && s.isCorrect);
      if (isNotEligible) {
        s.disqualificationReason = reason || 'Marked Not Eligible in Master Participant List';
      }
      s.updatedAt = new Date().toISOString();
    }
  });

  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: isNotEligible ? 'MARK_PARTICIPANT_NOT_ELIGIBLE' : 'MARK_PARTICIPANT_ELIGIBLE',
    module: 'quiz_participants', recordId: normId,
    newValue: { normId, isNotEligible, reason }
  });

  res.json({ message: isNotEligible ? 'Participant marked as Not Eligible.' : 'Participant restored to Eligible.', isNotEligible });
});

app.put('/api/portal/quiz-participants/:id', authenticateSession, requirePermission('quiz_participants', 'canEdit'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const { isInvalid, isDisqualified, disqualificationReason, internalNotes } = req.body;

  const submissions = db.getQuizSubmissions();
  const sub = submissions.find(s => s.id === id);

  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  if (typeof isInvalid === 'boolean') sub.isInvalid = isInvalid;
  if (typeof isDisqualified === 'boolean') sub.isDisqualified = isDisqualified;
  if (disqualificationReason !== undefined) sub.disqualificationReason = disqualificationReason;
  if (internalNotes !== undefined) sub.internalNotes = internalNotes;

  sub.updatedAt = new Date().toISOString();
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'UPDATE_SUBMISSION_STATUS', module: 'quiz_participants', recordId: id
  });

  res.json(sub);
});

// QUIZ WINNERS MANAGEMENT
app.get('/api/portal/quiz-winners', authenticateSession, requirePermission('quiz_winners', 'canView'), (req: Request, res: Response) => {
  runQuizBackgroundProcess();
  const winners = db.getQuizWinners();
  res.json({ winners });
});

app.put('/api/portal/quiz-winners/:id', authenticateSession, requirePermission('quiz_winners', 'canEdit'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const winners = db.getQuizWinners();
  const win = winners.find(w => w.id === id);

  if (!win) return res.status(404).json({ error: 'Winner record not found' });

  const {
    contactedStatus,
    isContacted,
    participantName,
    fullName,
    prizeCollectionStatus,
    isPrizeCollected,
    paymentSlipUrl,
    ...rest
  } = req.body;

  // Requirement 2: To change contact status of winner, need to write name of participant.
  const nextContactedStatus = contactedStatus !== undefined
    ? contactedStatus
    : (isContacted !== undefined ? (isContacted ? 'contacted' : 'not_contacted') : undefined);

  if (nextContactedStatus !== undefined && nextContactedStatus !== win.contactedStatus) {
    const nameProvided = (participantName || fullName || '').trim();
    if (!nameProvided) {
      return res.status(400).json({
        error: ' To change contact status of winner, you must write/type the name of the participant.'
      });
    }
    win.fullName = nameProvided;
    win.contactedStatus = nextContactedStatus;
    win.isContacted = nextContactedStatus === 'contacted';
  } else if (participantName || fullName) {
    win.fullName = (participantName || fullName).trim();
  }

  // Requirement 3: To change prize collection status, need to upload payment slip.
  const nextPrizeStatus = prizeCollectionStatus !== undefined
    ? prizeCollectionStatus
    : (isPrizeCollected !== undefined ? (isPrizeCollected ? 'collected' : 'pending') : undefined);

  if (nextPrizeStatus !== undefined && nextPrizeStatus !== win.prizeCollectionStatus) {
    if (nextPrizeStatus === 'collected' || nextPrizeStatus === 'forfeited') {
      const slipUrl = (paymentSlipUrl || win.paymentSlipUrl || '').trim();
      if (nextPrizeStatus === 'collected' && !slipUrl) {
        return res.status(400).json({
          error: ' To change prize collection status to Collected, you must upload a payment slip or proof document.'
        });
      }
      if (slipUrl) win.paymentSlipUrl = slipUrl;
      win.prizeCollectionDate = new Date().toISOString();
    }
    win.prizeCollectionStatus = nextPrizeStatus;
    win.isPrizeCollected = nextPrizeStatus === 'collected';
  } else if (paymentSlipUrl) {
    win.paymentSlipUrl = paymentSlipUrl.trim();
  }

  Object.assign(win, rest);
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'UPDATE_WINNER_STATUS', module: 'quiz_winners', recordId: id
  });

  res.json(win);
});

// WINNER RE-SELECTION (WITH WRITTEN REASON & AUDIT LOGGING)
app.post('/api/portal/quiz-winners/:id/reselect', authenticateSession, requirePermission('quiz_winners', 'canApprove'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || String(reason).trim().length < 5) {
    return res.status(400).json({ error: 'A valid written reason is required to re-select a winner.' });
  }

  const winners = db.getQuizWinners();
  const oldWinner = winners.find(w => w.id === id);

  if (!oldWinner) return res.status(404).json({ error: 'Winner record not found' });

  // Mark old winner as replaced
  oldWinner.isReplaced = true;
  oldWinner.replacementReason = reason;

  // Find remaining eligible participants excluding previous winner
  const eligibleSubmissions = db.getQuizSubmissions().filter(s =>
    s.questionId === oldWinner.questionId &&
    !s.isInvalid &&
    !s.isDisqualified &&
    s.isCorrect &&
    s.id !== oldWinner.submissionId
  );

  if (eligibleSubmissions.length === 0) {
    return res.status(400).json({ error: 'No other eligible participants available for re-selection.' });
  }

  const randomIndex = crypto.randomInt(0, eligibleSubmissions.length);
  const newSub = eligibleSubmissions[randomIndex];

  const auditRef = `AUD-RESELECT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newWinner: QuizWinner = {
    id: `win_${Date.now()}`,
    questionId: oldWinner.questionId,
    submissionId: newSub.id,
    participantNumber: newSub.participantNumber,
    maskedIdNumber: newSub.maskedIdNumber,
    maskedContactNumber: newSub.maskedContactNumber,
    fullName: 'Replacement Winner',
    contactNumber: newSub.maskedContactNumber,
    idNumber: newSub.maskedIdNumber,
    prizeTitle: oldWinner.prizeTitle,
    prizeDescription: oldWinner.prizeDescription,
    sponsorName: oldWinner.sponsorName,
    sponsorLogo: oldWinner.sponsorLogo,
    eligibleCount: eligibleSubmissions.length,
    selectedAt: new Date().toISOString(),
    selectedBy: user.id,
    selectionMethod: 'manual_reselect',
    auditReference: auditRef,
    contactedStatus: 'not_contacted',
    prizeCollectionStatus: 'pending',
    publicStatus: 'published',
    internalNotes: `Re-selected due to: ${reason}`
  };

  winners.push(newWinner);
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'RESELECT_QUIZ_WINNER', module: 'quiz_winners', recordId: newWinner.id,
    previousValue: oldWinner.participantNumber, newValue: newSub.participantNumber, reason
  });

  res.json({ message: 'New winner successfully re-selected', newWinner });
});

// USER MANAGEMENT MODULE
app.get('/api/portal/users', authenticateSession, requirePermission('users', 'canView'), (req: Request, res: Response) => {
  const users = db.getUsers().map(sanitizeUser);
  res.json(users);
});

app.post('/api/portal/users', authenticateSession, requirePermission('users', 'canCreate'), (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { fullName, username, pin, designation, contactNumber, roleId, permissions, notes, memberId } = req.body;
  const confirmPin = req.body.confirmPin || pin;

  if (!username || !pin || !roleId) {
    return res.status(400).json({ error: 'Please provide all required user details.' });
  }

  // Enforce linking with existing club member
  if (!memberId) {
    return res.status(400).json({ error: 'To create a user account, you must select an existing club member to link with.' });
  }

  const members = db.getMembers();
  const linkedMember = members.find(m => m.id === memberId);
  if (!linkedMember) {
    return res.status(400).json({ error: 'The selected club member record was not found.' });
  }

  if (pin !== confirmPin) {
    return res.status(400).json({ error: 'PIN and Confirm PIN do not match.' });
  }

  if (!/^\d+$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be numeric digits only.' });
  }

  const users = db.getUsers();
  if (users.some(u => u.username.toLowerCase() === String(username).toLowerCase().trim())) {
    return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
  }

  const roles = db.getRoles();
  const matchedRole = roles.find(r => r.id === roleId);
  const derivedRoleName = req.body.roleName || matchedRole?.name || 'EXCO Member';

  // Admin and Club Member roles do NOT need Designation
  const isAdminOrMemberRole = derivedRoleName === 'Admin' || derivedRoleName === 'Club Member' || roleId === 'role_admin' || roleId === 'role_member';
  const cleanDesignation = isAdminOrMemberRole ? '' : (designation || linkedMember.excoDesignation || derivedRoleName);

  const { hash, salt } = hashPin(String(pin));
  const newUserId = `usr_${Date.now()}`;

  const newUser: User & { pinHash: string; pinSalt: string } = {
    id: newUserId,
    fullName: fullName || linkedMember.fullName,
    username: String(username).trim().toLowerCase(),
    designation: cleanDesignation,
    contactNumber: contactNumber || linkedMember.phoneNumber || '',
    roleId,
    roleName: derivedRoleName,
    status: 'active',
    requirePinChange: false,
    failedLoginCount: 0,
    lockedUntil: null,
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: notes || '',
    memberId: linkedMember.id,
    permissions: Array.isArray(permissions) ? permissions : createAdminPermissions(newUserId),
    pinHash: hash,
    pinSalt: salt
  };

  users.push(newUser);
  db.saveData();

  db.logAudit({
    userId: currentUser.id, username: currentUser.username, fullName: currentUser.fullName,
    action: 'CREATE_USER', module: 'users', recordId: newUser.id,
    newValue: { username: newUser.username, role: newUser.roleName, memberId: newUser.memberId }
  });

  res.json(sanitizeUser(newUser));
});

app.put('/api/portal/users/:id', authenticateSession, requirePermission('users', 'canEdit'), (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const users = db.getUsers();
  const userToUpdate = users.find(u => u.id === id);

  if (!userToUpdate) return res.status(404).json({ error: 'User not found' });

  // Users cannot change their own role or grant themselves additional permissions
  if (currentUser.id === userToUpdate.id && req.body.roleId && req.body.roleId !== currentUser.roleId) {
    return res.status(403).json({ error: 'You are not allowed to change your own role.' });
  }

  // Prevent demoting the last active Admin account
  if (userToUpdate.roleName === 'Admin' && req.body.roleName && req.body.roleName !== 'Admin') {
    const adminCount = users.filter(u => u.roleName === 'Admin' && u.status === 'active').length;
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot demote or alter the final active Admin account.' });
    }
  }

  const { pin, ...fieldsToUpdate } = req.body;

  const isAdmin = currentUser.roleName === 'Admin' || currentUser.roleId === 'role_admin' || currentUser.roleName?.toLowerCase().includes('admin');

  if (userToUpdate.memberId && ('memberId' in req.body) && (!req.body.memberId || req.body.memberId !== userToUpdate.memberId)) {
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only Admin users can unlink or change the member profile linked to a user account.' });
    }
  }

  const targetRoleName = fieldsToUpdate.roleName || userToUpdate.roleName;
  const targetRoleId = fieldsToUpdate.roleId || userToUpdate.roleId;
  if (targetRoleName === 'Admin' || targetRoleName === 'Club Member' || targetRoleId === 'role_admin' || targetRoleId === 'role_member') {
    fieldsToUpdate.designation = '';
  }

  if (pin) {
    if (!/^\d+$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be numeric.' });
    }
    const { hash, salt } = hashPin(String(pin));
    userToUpdate.pinHash = hash;
    userToUpdate.pinSalt = salt;
  }

  Object.assign(userToUpdate, fieldsToUpdate, { updatedAt: new Date().toISOString() });
  db.saveData();

  db.logAudit({
    userId: currentUser.id, username: currentUser.username, fullName: currentUser.fullName,
    action: 'UPDATE_USER', module: 'users', recordId: id
  });

  res.json(sanitizeUser(userToUpdate));
});

// CONNECT USER ACCOUNT TO EXISTING MEMBER RECORD
app.post('/api/portal/users/connect-member', authenticateSession, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { query, memberId } = req.body;

  const members = db.getMembers();
  let matchedMember = memberId ? members.find(m => m.id === memberId) : undefined;

  if (!matchedMember && query) {
    const q = String(query).toLowerCase().trim();
    const cleanNum = q.replace(/\D/g, '');
    matchedMember = members.find(m => 
      m.memberNumber.toLowerCase().trim() === q ||
      m.fullName.toLowerCase().trim() === q ||
      (cleanNum.length > 3 && m.phoneNumber.replace(/\D/g, '').includes(cleanNum)) ||
      m.id.toLowerCase() === q
    );
  }

  if (!matchedMember) {
    return res.status(404).json({ error: 'ނެތް މެންބަރެއް. އިތުރަށް މެންބަރު ނަންބަރު ނުވަތަ ފޯނު ނަންބަރު ޔަޤީންކޮށްލައްވާ. (Member record not found with the provided details).' });
  }

  const users = db.getUsers();
  const userToUpdate = users.find(u => u.id === currentUser.id);
  if (!userToUpdate) return res.status(404).json({ error: 'User not found' });

  userToUpdate.memberId = matchedMember.id;
  if (!userToUpdate.contactNumber && matchedMember.phoneNumber) {
    userToUpdate.contactNumber = matchedMember.phoneNumber;
  }
  userToUpdate.updatedAt = new Date().toISOString();
  db.saveData();

  db.logAudit({
    userId: currentUser.id, username: currentUser.username, fullName: currentUser.fullName,
    action: 'CONNECT_MEMBER', module: 'users', recordId: matchedMember.id,
    newValue: { memberNumber: matchedMember.memberNumber, fullName: matchedMember.fullName }
  });

  res.json({ message: 'Member profile linked successfully!', member: matchedMember, user: sanitizeUser(userToUpdate) });
});

app.post('/api/portal/users/disconnect-member', authenticateSession, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const isAdmin = currentUser.roleName === 'Admin' || currentUser.roleId === 'role_admin' || currentUser.roleName?.toLowerCase().includes('admin');

  if (!isAdmin) {
    return res.status(403).json({ error: 'Only Admin users can unlink a member profile from a user account (އެކައުންޓުން މެންބަރު ވަކިކުރެވޭނީ އެޑްމިނިސްޓްރޭޓަރަކަށް އެކަނި).' });
  }

  const targetUserId = req.body.userId || currentUser.id;
  const users = db.getUsers();
  const userToUpdate = users.find(u => u.id === targetUserId);
  if (!userToUpdate) return res.status(404).json({ error: 'User not found' });

  userToUpdate.memberId = undefined;
  userToUpdate.updatedAt = new Date().toISOString();
  db.saveData();

  db.logAudit({
    userId: currentUser.id, username: currentUser.username, fullName: currentUser.fullName,
    action: 'DISCONNECT_MEMBER', module: 'users', recordId: targetUserId
  });

  res.json({ message: 'Member unlinked successfully', user: sanitizeUser(userToUpdate) });
});

// USER PERFORMANCE DASHBOARD ENDPOINT
app.get('/api/portal/users/:id/performance', authenticateSession, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;

  const targetUserId = (id === 'me' || id === 'current') ? currentUser.id : id;
  const users = db.getUsers();
  const targetUser = users.find(u => u.id === targetUserId);

  if (!targetUser) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  // Linked Club Member lookup
  const members = db.getMembers();
  let linkedMember = targetUser.memberId ? members.find(m => m.id === targetUser.memberId) : undefined;
  if (!linkedMember) {
    const normName = targetUser.fullName.toLowerCase().trim();
    const normPhone = (targetUser.contactNumber || '').replace(/\D/g, '');
    linkedMember = members.find(m => 
      m.fullName.toLowerCase().trim() === normName ||
      (normPhone.length > 0 && m.phoneNumber.replace(/\D/g, '') === normPhone)
    );
  }

  // 1. Attendance Performance across Events & Meetings
  const eventItems = db.getEventItems();
  const meetingItems = db.getMeetingItems();

  const attendanceRecords: Array<{
    type: 'event' | 'meeting';
    id: string;
    title: string;
    date: string;
    venue?: string;
    status: 'present' | 'absent' | 'excused';
    notes?: string;
  }> = [];

  let eventsAttended = 0;
  let meetingsAttended = 0;
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalExcused = 0;

  // Process Events
  eventItems.forEach(ev => {
    if (!ev.attendance || !Array.isArray(ev.attendance)) return;
    const match = ev.attendance.find(a => 
      (linkedMember && (a.memberId === linkedMember.id || a.memberNumber === linkedMember.memberNumber)) ||
      a.memberName.toLowerCase().trim() === targetUser.fullName.toLowerCase().trim()
    );
    if (match) {
      if (match.status === 'present') {
        eventsAttended++;
        totalPresent++;
      } else if (match.status === 'absent') {
        totalAbsent++;
      } else if (match.status === 'excused') {
        totalExcused++;
      }
      attendanceRecords.push({
        type: 'event',
        id: ev.id,
        title: ev.title,
        date: ev.heldDate || ev.createdAt,
        venue: ev.venue,
        status: match.status,
        notes: match.notes
      });
    }
  });

  // Process Meetings
  meetingItems.forEach(mt => {
    if (!mt.attendance || !Array.isArray(mt.attendance)) return;
    const match = mt.attendance.find(a => 
      (linkedMember && (a.memberId === linkedMember.id || a.memberNumber === linkedMember.memberNumber)) ||
      a.memberName.toLowerCase().trim() === targetUser.fullName.toLowerCase().trim()
    );
    if (match) {
      if (match.status === 'present') {
        meetingsAttended++;
        totalPresent++;
      } else if (match.status === 'absent') {
        totalAbsent++;
      } else if (match.status === 'excused') {
        totalExcused++;
      }
      attendanceRecords.push({
        type: 'meeting',
        id: mt.id,
        title: mt.title,
        date: mt.heldDate || mt.createdAt,
        venue: mt.venue,
        status: match.status,
        notes: match.notes
      });
    }
  });

  const totalMarked = totalPresent + totalAbsent + totalExcused;
  const attendanceRate = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : (totalPresent > 0 ? 100 : 0);

  // 2. Ramazan Quiz Submissions & Wins
  const submissions = db.getQuizSubmissions();
  const winners = db.getQuizWinners();
  const questions = db.getQuizQuestions();

  const userPhone = (targetUser.contactNumber || linkedMember?.phoneNumber || '').replace(/\D/g, '');
  const memberIdCard = (linkedMember?.idCardNumber || '').trim().toUpperCase();
  const userSubmissions = submissions.filter(s => {
    const sPhone = (s.contactNumber || '').replace(/\D/g, '');
    const sId = (s.normalizedIdNumber || '').trim().toUpperCase();
    return (memberIdCard && sId && sId === memberIdCard) ||
           (userPhone && sPhone && sPhone === userPhone) || 
           s.participantNumber === targetUser.username ||
           s.maskedIdNumber === targetUser.fullName;
  });

  const correctAnswers = userSubmissions.filter(s => s.isCorrect).length;
  const accuracyRate = userSubmissions.length > 0 ? Math.round((correctAnswers / userSubmissions.length) * 100) : 0;

  const quizSubmissionRecords = userSubmissions.map(s => {
    const q = questions.find(qItem => qItem.id === s.questionId);
    return {
      id: s.id,
      questionNumber: q?.questionNumber || 0,
      questionTitle: q?.title || 'Quiz Question',
      selectedOptionText: s.selectedOptionText || s.selectedOptionLabel,
      isCorrect: Boolean(s.isCorrect),
      submittedAt: s.submittedAt
    };
  });

  const userWins = winners.filter(w => {
    const wPhone = (w.contactNumber || '').replace(/\D/g, '');
    return userSubmissions.some(s => s.id === w.submissionId) ||
           (userPhone && wPhone && wPhone === userPhone) ||
           w.fullName?.toLowerCase().trim() === targetUser.fullName.toLowerCase().trim();
  }).map(w => ({
    id: w.id,
    questionNumber: w.questionNumber || 0,
    prizeTitle: w.prizeTitle || 'Quiz Winner Prize',
    sponsorName: w.sponsorName,
    selectedAt: w.selectedAt,
    prizeCollectionStatus: w.prizeCollectionStatus || 'pending'
  }));

  // 3. System Messages & Audit Log Activity
  const messages = db.getMessages();
  const userMessagesCount = messages.filter(m => m.senderId === targetUser.id || m.recipientId === targetUser.id).length;

  const auditLogs = db.getAuditLogs();
  const userAuditCount = auditLogs.filter(a => a.userId === targetUser.id).length;

  // 4. Calculate Overall Performance Score (0 - 100)
  let score = 50;
  if (totalMarked > 0) score += (attendanceRate * 0.4);
  if (userSubmissions.length > 0) score += Math.min(20, userSubmissions.length * 4);
  if (accuracyRate > 0) score += (accuracyRate * 0.15);
  if (userWins.length > 0) score += (userWins.length * 5);
  if (userAuditCount > 0) score += Math.min(10, userAuditCount * 2);
  const overallScore = Math.min(100, Math.round(score));

  // 5. Generate Performance Badges
  const badges: any[] = [];
  if (attendanceRate >= 90 && totalPresent >= 1) {
    badges.push({
      id: 'b_attendance',
      title: 'Top Attendance (އެންމެ ގަވާއިދުން)',
      description: 'Maintained excellent attendance record in club events and meetings',
      icon: 'Award',
      color: 'emerald'
    });
  }
  if (userSubmissions.length >= 1) {
    badges.push({
      id: 'b_quiz_active',
      title: 'Quiz Active (ކުއިޒް ބައިވެރިޔާ)',
      description: 'Active participant in Ramazan Quiz questions',
      icon: 'HelpCircle',
      color: 'amber'
    });
  }
  if (userWins.length > 0) {
    badges.push({
      id: 'b_winner',
      title: 'Quiz Winner (ކުއިޒް ކާމިޔާބު ކުރި)',
      description: 'Won an official Ramazan Quiz lucky draw prize',
      icon: 'Sparkles',
      color: 'purple'
    });
  }
  if (linkedMember && linkedMember.memberType === 'exco') {
    badges.push({
      id: 'b_exco',
      title: 'EXCO Leader (ހިންގާ ކޮމިޓީ)',
      description: 'Serving as active Executive Committee leadership member',
      icon: 'Shield',
      color: 'orange'
    });
  }
  if (badges.length === 0) {
    badges.push({
      id: 'b_member',
      title: 'Active Member (އެކްޓިވް މެންބަރު)',
      description: 'Registered user participating in club activities',
      icon: 'UserCheck',
      color: 'sky'
    });
  }

  res.json({
    userId: targetUser.id,
    fullName: targetUser.fullName,
    username: targetUser.username,
    designation: targetUser.designation,
    roleName: targetUser.roleName,
    profileImage: targetUser.profileImage,
    status: targetUser.status,
    member: linkedMember,
    attendance: {
      eventsAttended,
      totalEvents: eventItems.length,
      meetingsAttended,
      totalMeetings: meetingItems.length,
      totalPresent,
      totalAbsent,
      totalExcused,
      attendanceRate,
      records: attendanceRecords
    },
    quiz: {
      totalAttempts: userSubmissions.length,
      correctAnswers,
      accuracyRate,
      submissions: quizSubmissionRecords,
      wins: userWins
    },
    activity: {
      messagesCount: userMessagesCount,
      auditLogsCount: userAuditCount
    },
    overallScore,
    badges
  });
});

app.post('/api/portal/users/:id/reset-pin', authenticateSession, requirePermission('users', 'canEdit'), (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const { newPin } = req.body;

  if (!newPin || !/^\d+$/.test(newPin)) {
    return res.status(400).json({ error: 'Valid numeric PIN is required.' });
  }

  const users = db.getUsers();
  const userToUpdate = users.find(u => u.id === id);

  if (!userToUpdate) return res.status(404).json({ error: 'User not found' });

  const { hash, salt } = hashPin(String(newPin));
  userToUpdate.pinHash = hash;
  userToUpdate.pinSalt = salt;
  userToUpdate.requirePinChange = true;
  userToUpdate.failedLoginCount = 0;
  userToUpdate.lockedUntil = null;
  userToUpdate.updatedAt = new Date().toISOString();

  db.saveData();

  db.logAudit({
    userId: currentUser.id, username: currentUser.username, fullName: currentUser.fullName,
    action: 'RESET_USER_PIN', module: 'users', recordId: id
  });

  res.json({ message: 'User PIN reset successfully.' });
});

app.delete('/api/portal/users/:id', authenticateSession, requirePermission('users', 'canDelete'), (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;

  if (currentUser.id === id) {
    return res.status(400).json({ error: 'You cannot delete your own logged-in account.' });
  }

  const users = db.getUsers();
  const userToDelete = users.find(u => u.id === id);

  if (!userToDelete) return res.status(404).json({ error: 'User not found' });

  if (userToDelete.roleName === 'Admin') {
    const adminCount = users.filter(u => u.roleName === 'Admin' && u.status === 'active').length;
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the final active Admin account.' });
    }
  }

  db.getData().users = users.filter(u => u.id !== id);
  db.saveData();

  db.logAudit({
    userId: currentUser.id, username: currentUser.username, fullName: currentUser.fullName,
    action: 'DELETE_USER', module: 'users', recordId: id
  });

  res.json({ message: 'User deleted.' });
});

// ROLES & PERMISSIONS MODULE
app.get('/api/portal/roles', authenticateSession, requirePermission('roles_permissions', 'canView'), (req: Request, res: Response) => {
  res.json({ roles: db.getRoles() });
});

app.post('/api/portal/roles', authenticateSession, requirePermission('roles_permissions', 'canCreate'), (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { name, description, defaultPermissions } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Role name is required.' });
  }

  const newRole = db.createRole({
    name,
    description: description || '',
    isSystemRole: false,
    defaultPermissions: Array.isArray(defaultPermissions) ? defaultPermissions : []
  });

  db.logAudit({
    userId: currentUser.id, username: currentUser.username, fullName: currentUser.fullName,
    action: 'CREATE_ROLE', module: 'roles_permissions', recordId: newRole.id,
    newValue: { name: newRole.name }
  });

  res.json({ role: newRole, roles: db.getRoles() });
});

app.put('/api/portal/roles/:id', authenticateSession, requirePermission('roles_permissions', 'canEdit'), (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  const { id } = req.params;
  const { name, description, defaultPermissions } = req.body;

  const updatedRole = db.updateRole(id, {
    ...(name ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(Array.isArray(defaultPermissions) ? { defaultPermissions } : {})
  });

  if (!updatedRole) {
    return res.status(404).json({ error: 'Role not found.' });
  }

  db.logAudit({
    userId: currentUser.id, username: currentUser.username, fullName: currentUser.fullName,
    action: 'UPDATE_ROLE_PERMISSIONS', module: 'roles_permissions', recordId: id,
    newValue: { name: updatedRole.name, permissionsCount: defaultPermissions?.length }
  });

  res.json({ role: updatedRole, roles: db.getRoles() });
});

// AUDIT LOGS MODULE
app.get('/api/portal/audit-logs', authenticateSession, requirePermission('audit_logs', 'canView'), (req: Request, res: Response) => {
  const { search, module: modFilter } = req.query;
  let logs = db.getAuditLogs();

  if (modFilter) {
    logs = logs.filter(l => l.module === modFilter);
  }

  if (search) {
    const q = String(search).toLowerCase();
    logs = logs.filter(l =>
      l.username.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.fullName.toLowerCase().includes(q)
    );
  }

  res.json(logs);
});

// ==========================================
// MEMBERS MODULE API
// ==========================================
app.get('/api/portal/members', authenticateSession, (req: Request, res: Response) => {
  const { search, memberType, status } = req.query;
  let members = db.getMembers();

  if (memberType && memberType !== 'all') {
    members = members.filter(m => m.memberType === memberType);
  }
  if (status && status !== 'all') {
    members = members.filter(m => m.status === status);
  }
  if (search) {
    const q = String(search).toLowerCase();
    members = members.filter(m =>
      m.fullName.toLowerCase().includes(q) ||
      m.memberNumber.toLowerCase().includes(q) ||
      m.phoneNumber.toLowerCase().includes(q) ||
      m.address.toLowerCase().includes(q) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  }

  res.json(members);
});

app.post('/api/portal/members', authenticateSession, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { memberNumber, fullName, address, phoneNumber, email, memberType, excoDesignation, status, joinedDate, notes } = req.body;

  if (!fullName || !phoneNumber || !address) {
    return res.status(400).json({ error: 'Name, address, and phone number are required.' });
  }

  const existingNum = db.getMembers().find(m => m.memberNumber.toLowerCase() === String(memberNumber || '').toLowerCase());
  if (memberNumber && existingNum) {
    return res.status(400).json({ error: 'Member number already exists.' });
  }

  const genNumber = memberNumber || `ARC-M-${String(db.getMembers().length + 1).padStart(3, '0')}`;

  const newMember = db.createMember({
    memberNumber: genNumber,
    fullName,
    address,
    phoneNumber,
    email: email || '',
    memberType: memberType || 'standard',
    excoDesignation: excoDesignation || '',
    status: status || 'active',
    joinedDate: joinedDate || new Date().toISOString().split('T')[0],
    notes: notes || ''
  });

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: `Created member ${fullName} (${genNumber})`,
    module: 'members',
    recordId: newMember.id
  });

  res.status(201).json(newMember);
});

app.put('/api/portal/members/:id', authenticateSession, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const updated = db.updateMember(id, req.body);

  if (!updated) {
    return res.status(404).json({ error: 'Member not found.' });
  }

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: `Updated member ${updated.fullName} (${updated.memberNumber})`,
    module: 'members',
    recordId: id
  });

  res.json(updated);
});

app.delete('/api/portal/members/:id', authenticateSession, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const member = db.getMemberById(id);
  
  if (!member) {
    return res.status(404).json({ error: 'Member not found.' });
  }

  db.deleteMember(id);

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: `Deleted member ${member.fullName} (${member.memberNumber})`,
    module: 'members',
    recordId: id
  });

  res.json({ message: 'Member deleted successfully.' });
});

// ==========================================
// EVENTS & MEETINGS MODULE API
// ==========================================

// --- Event Items API ---
app.get('/api/portal/event-items', authenticateSession, (req: Request, res: Response) => {
  const { search, status, eventType } = req.query;
  let items = db.getEventItems();

  if (status && status !== 'all') {
    items = items.filter(e => e.status === status);
  }
  if (eventType && eventType !== 'all') {
    items = items.filter(e => e.eventType === eventType);
  }
  if (search) {
    const q = String(search).toLowerCase();
    items = items.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.venue.toLowerCase().includes(q) ||
      e.summary.toLowerCase().includes(q)
    );
  }

  res.json(items);
});

app.post('/api/portal/event-items', authenticateSession, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { title, heldDate, startTime, endTime, venue, summary, description, eventType, status, photoGallery, attendance } = req.body;

  if (!title || !heldDate || !venue) {
    return res.status(400).json({ error: 'Event title, date, and venue are required.' });
  }

  const newEvent = db.createEventItem({
    title,
    heldDate,
    startTime: startTime || '16:00',
    endTime: endTime || '18:00',
    venue,
    summary: summary || '',
    description: description || '',
    eventType: eventType || 'community',
    status: status || 'upcoming',
    photoGallery: Array.isArray(photoGallery) ? photoGallery : [],
    attendance: Array.isArray(attendance) ? attendance : [],
    createdBy: user.fullName
  });

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: `Created event item ${title}`,
    module: 'events_meetings',
    recordId: newEvent.id
  });

  res.status(201).json(newEvent);
});

app.put('/api/portal/event-items/:id', authenticateSession, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const updated = db.updateEventItem(id, req.body);

  if (!updated) {
    return res.status(404).json({ error: 'Event item not found.' });
  }

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: `Updated event item ${updated.title}`,
    module: 'events_meetings',
    recordId: id
  });

  res.json(updated);
});

app.delete('/api/portal/event-items/:id', authenticateSession, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const item = db.getEventItemById(id);

  if (!item) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  db.deleteEventItem(id);

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: `Deleted event item ${item.title}`,
    module: 'events_meetings',
    recordId: id
  });

  res.json({ message: 'Event item deleted.' });
});

app.post('/api/portal/event-items/:id/attendance', authenticateSession, (req: Request, res: Response) => {
  const { id } = req.params;
  const { attendance } = req.body;

  if (!Array.isArray(attendance)) {
    return res.status(400).json({ error: 'Attendance array required.' });
  }

  const updated = db.updateEventItem(id, { attendance });
  if (!updated) return res.status(404).json({ error: 'Event item not found.' });

  res.json(updated);
});

// --- Meeting Items API ---
app.get('/api/portal/meeting-items', authenticateSession, (req: Request, res: Response) => {
  const { search, status, meetingType } = req.query;
  let items = db.getMeetingItems();

  if (status && status !== 'all') {
    items = items.filter(m => m.status === status);
  }
  if (meetingType && meetingType !== 'all') {
    items = items.filter(m => m.meetingType === meetingType);
  }
  if (search) {
    const q = String(search).toLowerCase();
    items = items.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.venue.toLowerCase().includes(q) ||
      m.summary.toLowerCase().includes(q)
    );
  }

  res.json(items);
});

app.post('/api/portal/meeting-items', authenticateSession, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { title, meetingType, heldDate, startTime, endTime, venue, summary, status, attendance, votings, finalizedActions } = req.body;

  if (!title || !heldDate || !venue) {
    return res.status(400).json({ error: 'Meeting title, date, and venue are required.' });
  }

  const newMeeting = db.createMeetingItem({
    title,
    meetingType: meetingType === 'exco' ? 'exco' : 'general_members',
    heldDate,
    startTime: startTime || '20:00',
    endTime: endTime || '21:30',
    venue,
    summary: summary || '',
    status: status || 'scheduled',
    attendance: Array.isArray(attendance) ? attendance : [],
    votings: Array.isArray(votings) ? votings : [],
    finalizedActions: Array.isArray(finalizedActions) ? finalizedActions : [],
    createdBy: user.fullName
  });

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: `Created meeting item ${title} (${newMeeting.meetingType})`,
    module: 'events_meetings',
    recordId: newMeeting.id
  });

  res.status(201).json(newMeeting);
});

app.put('/api/portal/meeting-items/:id', authenticateSession, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const updated = db.updateMeetingItem(id, req.body);

  if (!updated) {
    return res.status(404).json({ error: 'Meeting item not found.' });
  }

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: `Updated meeting item ${updated.title}`,
    module: 'events_meetings',
    recordId: id
  });

  res.json(updated);
});

app.delete('/api/portal/meeting-items/:id', authenticateSession, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const item = db.getMeetingItemById(id);

  if (!item) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }

  db.deleteMeetingItem(id);

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: `Deleted meeting item ${item.title}`,
    module: 'events_meetings',
    recordId: id
  });

  res.json({ message: 'Meeting item deleted.' });
});

app.post('/api/portal/meeting-items/:id/attendance', authenticateSession, (req: Request, res: Response) => {
  const { id } = req.params;
  const { attendance } = req.body;

  if (!Array.isArray(attendance)) {
    return res.status(400).json({ error: 'Attendance array required.' });
  }

  const updated = db.updateMeetingItem(id, { attendance });
  if (!updated) return res.status(404).json({ error: 'Meeting item not found.' });

  res.json(updated);
});

app.post('/api/portal/meeting-items/:id/votings', authenticateSession, (req: Request, res: Response) => {
  const { id } = req.params;
  const { topic, description, status, votes, finalizedAction } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Voting topic is required.' });
  }

  const meeting = db.getMeetingItemById(id);
  if (!meeting) return res.status(404).json({ error: 'Meeting item not found.' });

  const newVoteItem = {
    id: `vote_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    topic,
    description: description || '',
    status: status || 'open',
    votes: votes || { inFavor: 0, against: 0, abstain: 0 },
    finalizedAction: finalizedAction || '',
    createdAt: new Date().toISOString()
  };

  const updatedVotings = [...(meeting.votings || []), newVoteItem];
  const updatedActions = [...(meeting.finalizedActions || [])];
  if (finalizedAction && !updatedActions.includes(finalizedAction)) {
    updatedActions.push(finalizedAction);
  }

  const updated = db.updateMeetingItem(id, { votings: updatedVotings, finalizedActions: updatedActions });
  res.status(201).json(updated);
});

app.put('/api/portal/meeting-items/:id/votings/:votingId', authenticateSession, (req: Request, res: Response) => {
  const { id, votingId } = req.params;
  const meeting = db.getMeetingItemById(id);

  if (!meeting) return res.status(404).json({ error: 'Meeting item not found.' });

  const votings = meeting.votings || [];
  const idx = votings.findIndex(v => v.id === votingId);
  if (idx === -1) return res.status(404).json({ error: 'Voting item not found.' });

  votings[idx] = {
    ...votings[idx],
    ...req.body
  };

  const finalizedActions = votings
    .map(v => v.finalizedAction)
    .filter((act): act is string => Boolean(act && act.trim()));

  const updated = db.updateMeetingItem(id, { votings, finalizedActions });
  res.json(updated);
});

// --- Dashboard Stats & Reports API for Events & Meetings ---
app.get('/api/portal/events-meetings/stats', authenticateSession, (req: Request, res: Response) => {
  const members = db.getMembers();
  const events = db.getEventItems();
  const meetings = db.getMeetingItems();

  const totalMembers = members.length;
  const activeExcoMembers = members.filter(m => m.memberType === 'exco' && m.status === 'active').length;
  const totalEvents = events.length;
  const totalMeetings = meetings.length;
  const excoMeetings = meetings.filter(m => m.meetingType === 'exco').length;

  // Calculate total attendance rate
  let totalPresent = 0;
  let totalMarked = 0;

  events.forEach(e => {
    (e.attendance || []).forEach(a => {
      totalMarked++;
      if (a.status === 'present') totalPresent++;
    });
  });

  meetings.forEach(m => {
    (m.attendance || []).forEach(a => {
      totalMarked++;
      if (a.status === 'present') totalPresent++;
    });
  });

  const overallAttendanceRate = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 100;

  const upcomingEvents = events.filter(e => e.status === 'upcoming').length;
  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled' || m.status === 'in_progress').length;

  // Extract recent resolutions / finalized actions
  const recentFinalizedActions: Array<{ meetingTitle: string; date: string; action: string }> = [];
  meetings.forEach(m => {
    (m.votings || []).forEach(v => {
      if (v.finalizedAction) {
        recentFinalizedActions.push({
          meetingTitle: m.title,
          date: m.heldDate,
          action: v.finalizedAction
        });
      }
    });
  });

  res.json({
    totalMembers,
    activeExcoMembers,
    totalEvents,
    totalMeetings,
    excoMeetings,
    overallAttendanceRate,
    upcomingEvents,
    upcomingMeetings,
    recentFinalizedActions: recentFinalizedActions.slice(0, 5)
  });
});

// CONTACTS MANAGEMENT
app.get('/api/portal/contacts', (req: Request, res: Response) => {
  res.json(db.getData().contacts || []);
});

app.post('/api/portal/contacts', authenticateSession, requirePermission('contact', 'canCreate'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const contacts = db.getData().contacts || [];
  const newContact = { id: `cnt_${Date.now()}`, displayOrder: contacts.length + 1, status: 'active', ...req.body };
  contacts.push(newContact);
  db.saveData();
  db.logAudit({ userId: user.id, username: user.username, fullName: user.fullName, action: 'CREATE_CONTACT', module: 'contact', recordId: newContact.id });
  res.json(newContact);
});

app.put('/api/portal/contacts/:id', authenticateSession, requirePermission('contact', 'canEdit'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const contacts = db.getData().contacts || [];
  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Contact not found' });
  contacts[idx] = { ...contacts[idx], ...req.body };
  db.saveData();
  db.logAudit({ userId: user.id, username: user.username, fullName: user.fullName, action: 'UPDATE_CONTACT', module: 'contact', recordId: id });
  res.json(contacts[idx]);
});

app.delete('/api/portal/contacts/:id', authenticateSession, requirePermission('contact', 'canDelete'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  let contacts = db.getData().contacts || [];
  db.getData().contacts = contacts.filter(c => c.id !== id);
  db.saveData();
  db.logAudit({ userId: user.id, username: user.username, fullName: user.fullName, action: 'DELETE_CONTACT', module: 'contact', recordId: id });
  res.json({ message: 'Contact deleted' });
});

// SOCIAL MEDIA MANAGEMENT
app.get('/api/portal/social-media', (req: Request, res: Response) => {
  res.json(db.getData().socialLinks || []);
});

app.post('/api/portal/social-media', authenticateSession, requirePermission('social_media', 'canCreate'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const links = db.getData().socialLinks || [];
  const newLink = { id: `soc_${Date.now()}`, displayOrder: links.length + 1, status: 'active', openInNewTab: true, ...req.body };
  links.push(newLink);
  db.saveData();
  db.logAudit({ userId: user.id, username: user.username, fullName: user.fullName, action: 'CREATE_SOCIAL_LINK', module: 'social_media', recordId: newLink.id });
  res.json(newLink);
});

app.put('/api/portal/social-media/:id', authenticateSession, requirePermission('social_media', 'canEdit'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const links = db.getData().socialLinks || [];
  const idx = links.findIndex(l => l.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Social link not found' });
  links[idx] = { ...links[idx], ...req.body };
  db.saveData();
  db.logAudit({ userId: user.id, username: user.username, fullName: user.fullName, action: 'UPDATE_SOCIAL_LINK', module: 'social_media', recordId: id });
  res.json(links[idx]);
});

app.delete('/api/portal/social-media/:id', authenticateSession, requirePermission('social_media', 'canDelete'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  let links = db.getData().socialLinks || [];
  db.getData().socialLinks = links.filter(l => l.id !== id);
  db.saveData();
  db.logAudit({ userId: user.id, username: user.username, fullName: user.fullName, action: 'DELETE_SOCIAL_LINK', module: 'social_media', recordId: id });
  res.json({ message: 'Social link deleted' });
});

// QUIZ STATUS ALIAS
app.post('/api/portal/ramazan-quiz/:id/status', authenticateSession, requirePermission('ramazan_quiz', 'canPublish'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const { state } = req.body;
  const questions = db.getQuizQuestions();
  const q = questions.find(item => item.id === id);
  if (!q) return res.status(404).json({ error: 'Question not found' });
  q.status = state;
  q.updatedAt = new Date().toISOString();
  db.saveData();
  db.logAudit({ userId: user.id, username: user.username, fullName: user.fullName, action: `SET_QUIZ_STATUS_${state.toUpperCase()}`, module: 'ramazan_quiz', recordId: id });
  res.json(q);
});

// QUIZ DRAW TRIGGER ALIAS
app.post('/api/portal/ramazan-quiz/:id/draw', authenticateSession, requirePermission('ramazan_quiz', 'canPublish'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const questions = db.getQuizQuestions();
  const q = questions.find(item => item.id === id);
  if (!q) return res.status(404).json({ error: 'Question not found' });

  // Check if an active winner is ALREADY recorded for this question
  const existingWinner = db.getQuizWinners().find(w => w.questionId === id && !w.isReplaced);
  if (existingWinner) {
    q.status = 'winner_announced';
    q.updatedAt = new Date().toISOString();
    db.saveData();
    return res.json({ message: 'Winner already recorded for this question.', winner: existingWinner });
  }

  q.status = 'draw_running';
  q.drawStartAt = new Date().toISOString();

  const eligibleSubmissions = db.getQuizSubmissions().filter(s => s.questionId === id && !s.isInvalid && !s.isDisqualified && s.isCorrect);

  if (eligibleSubmissions.length === 0) {
    db.saveData();
    return res.status(400).json({ error: 'No eligible participants available for lucky draw.' });
  }

  const randomIndex = crypto.randomInt(0, eligibleSubmissions.length);
  const selectedSub = eligibleSubmissions[randomIndex];
  const auditRef = `AUD-DRAW-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newWinner: QuizWinner = {
    id: `win_${Date.now()}`,
    questionId: id,
    questionNumber: q.questionNumber,
    submissionId: selectedSub.id,
    participantNumber: selectedSub.participantNumber,
    maskedIdNumber: selectedSub.maskedIdNumber,
    maskedContactNumber: selectedSub.maskedContactNumber,
    fullName: 'Winner Participant',
    contactNumber: selectedSub.contactNumber || selectedSub.maskedContactNumber,
    idNumber: selectedSub.normalizedIdNumber || selectedSub.maskedIdNumber,
    prizeTitle: q.prizeTitle,
    prizeDescription: q.prizeDescription,
    sponsorName: q.sponsorName,
    sponsorLogo: q.sponsorLogo,
    eligibleCount: eligibleSubmissions.length,
    selectedAt: new Date().toISOString(),
    selectedBy: user.id,
    selectionMethod: 'random',
    auditReference: auditRef,
    contactedStatus: 'not_contacted',
    prizeCollectionStatus: 'pending',
    publicStatus: 'published',
    internalNotes: `Winner drawn by ${user.fullName} (${user.username}).`
  };

  db.getQuizWinners().push(newWinner);
  q.status = 'winner_announced';
  q.updatedAt = new Date().toISOString();
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'SELECT_QUIZ_WINNER', module: 'ramazan_quiz', recordId: newWinner.id,
    newValue: { winner: selectedSub.participantNumber, auditReference: auditRef }
  });

  res.json({ message: 'Winner drawn successfully', winner: newWinner });
});

// DISQUALIFY PARTICIPANT
app.post('/api/portal/quiz-participants/:id/disqualify', authenticateSession, requirePermission('quiz_participants', 'canEdit'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const { isDisqualified, reason } = req.body;

  const submissions = db.getQuizSubmissions();
  const sub = submissions.find(s => s.id === id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  sub.isDisqualified = isDisqualified;
  if (reason) sub.disqualificationReason = reason;
  sub.updatedAt = new Date().toISOString();
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: isDisqualified ? 'DISQUALIFY_PARTICIPANT' : 'RESTORE_PARTICIPANT', module: 'quiz_participants', recordId: id, reason
  });

  res.json(sub);
});

// EXPORT PARTICIPANTS CSV
app.get('/api/portal/quiz-participants/export/csv', authenticateSession, requirePermission('quiz_participants', 'canExport'), (req: Request, res: Response) => {
  const { questionId } = req.query;
  let submissions = db.getQuizSubmissions();
  if (questionId) {
    submissions = submissions.filter(s => s.questionId === questionId);
  }

  let csv = 'ParticipantNumber,MaskedID,MaskedContact,IsCorrect,IsEligible,IsDisqualified,SubmittedAt\n';
  submissions.forEach(s => {
    csv += `"${s.participantNumber}","${s.maskedIdNumber}","${s.maskedContactNumber}",${s.isCorrect},${!s.isDisqualified && s.isCorrect},${s.isDisqualified},"${s.submittedAt}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=quiz_submissions.csv');
  res.send(csv);
});

// MANUAL DB & FIRESTORE SYNC ENDPOINT
app.post('/api/portal/sync-db', authenticateSession, (req: Request, res: Response) => {
  try {
    db.saveData();
    res.json({ success: true, message: 'All application records, images, settings, and data synced to database and Firestore successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Sync failed: ' + (err.message || 'Unknown error') });
  }
});

// CLUB RULES & REGULATIONS API
app.get('/api/portal/club-rules', authenticateSession, (req: Request, res: Response) => {
  try {
    const rules = db.getClubRules();
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch club rules: ' + err.message });
  }
});

app.put('/api/portal/club-rules', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  
  // Admin role check
  const isAdmin = user && (user.roleName === 'Admin' || user.roleId === 'role_admin' || user.roleName.toLowerCase().includes('admin'));
  if (!isAdmin) {
    return res.status(403).json({ error: 'Access Denied: Only Admin users can update Club Rules & Regulations.' });
  }

  try {
    const updatedRules = db.updateClubRules(req.body, user.fullName);
    
    db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'UPDATE_CLUB_RULES',
      module: 'club_rules',
      recordId: 'club_rules'
    });

    res.json(updatedRules);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update club rules: ' + err.message });
  }
});

// USER STATUS UPDATE
app.put('/api/portal/users/:id/status', authenticateSession, requirePermission('users', 'canEdit'), (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const { isLocked, isActive } = req.body;

  const users = db.getUsers();
  const userToUpdate = users.find(u => u.id === id);
  if (!userToUpdate) return res.status(404).json({ error: 'User not found' });

  if (typeof isLocked === 'boolean') userToUpdate.status = isLocked ? 'locked' : 'active';
  if (typeof isActive === 'boolean') userToUpdate.status = isActive ? 'active' : 'inactive';

  userToUpdate.updatedAt = new Date().toISOString();
  db.saveData();

  db.logAudit({
    userId: user.id, username: user.username, fullName: user.fullName,
    action: 'UPDATE_USER_STATUS', module: 'users', recordId: id
  });

  res.json(sanitizeUser(userToUpdate));
});

// CSV EXPORT FOR PARTICIPANTS
app.get('/api/portal/export/participants', authenticateSession, requirePermission('quiz_participants', 'canExport'), (req: Request, res: Response) => {
  const submissions = db.getQuizSubmissions();
  let csv = 'ParticipantNumber,NormalizedID,MaskedID,MaskedContact,IsCorrect,IsEligible,IsInvalid,SubmittedAt\n';
  submissions.forEach(s => {
    csv += `"${s.participantNumber}","${s.normalizedIdNumber}","${s.maskedIdNumber}","${s.maskedContactNumber}",${s.isCorrect},${s.isEligible},${s.isInvalid},"${s.submittedAt}"\n`;
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=quiz_participants.csv');
  res.send(csv);
});

// CSV EXPORT FOR WINNERS
app.get('/api/portal/export/winners', authenticateSession, requirePermission('quiz_winners', 'canExport'), (req: Request, res: Response) => {
  const winners = db.getQuizWinners();
  let csv = 'QuestionId,ParticipantNumber,MaskedID,MaskedContact,Prize,Sponsor,AuditReference,SelectedAt,ContactedStatus,CollectionStatus\n';
  winners.forEach(w => {
    csv += `"${w.questionId}","${w.participantNumber}","${w.maskedIdNumber}","${w.maskedContactNumber}","${w.prizeTitle}","${w.sponsorName || ''}","${w.auditReference}","${w.selectedAt}","${w.contactedStatus}","${w.prizeCollectionStatus}"\n`;
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=quiz_winners.csv');
  res.send(csv);
});

// ==========================================
// MESSAGE INBOX & NOTIFICATION API ENDPOINTS
// ==========================================

// PUBLIC SUBMIT CONTACT MESSAGE
app.post('/api/public/contact-messages', (req: Request, res: Response) => {
  const { fullName, contactInfo, subject, message } = req.body;
  if (!fullName || !message) {
    return res.status(400).json({ error: 'Full name and message content are required.' });
  }

  const newMsg = db.createMessage({
    senderName: String(fullName).trim(),
    contactInfo: contactInfo ? String(contactInfo).trim() : '',
    subject: subject ? String(subject).trim() : 'Public Contact Message',
    body: String(message).trim(),
    category: 'general',
    priority: 'normal',
    status: 'pending',
    actions: []
  });

  // Create notification for portal admins
  db.createNotification({
    recipientId: 'all',
    title: `New Contact Message from ${fullName}`,
    message: subject || String(message).substring(0, 60),
    type: 'message',
    link: '/portal/messages'
  });

  db.logAudit({
    userId: 'public_visitor',
    username: 'public',
    fullName: String(fullName).trim(),
    action: 'SUBMIT_CONTACT_MESSAGE',
    module: 'messages',
    recordId: newMsg.id,
    newValue: { fullName, subject }
  });

  res.status(201).json({ success: true, message: 'Message submitted successfully.', data: newMsg });
});

// GET MESSAGES & UNREAD COUNT (FOR PUBLIC CONTACT MESSAGES VIEW)
app.get('/api/portal/messages', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const allMessages = db.getMessages();

  // All active contact messages not archived by user
  const inbox = allMessages.filter(m => !(m.archivedBy || []).includes(user.id));
  const unreadCount = inbox.filter(m => !(m.readBy || []).includes(user.id)).length;

  res.json({ inbox, messages: inbox, unreadCount });
});

// RECORD ACTION TAKEN FOR MESSAGE
app.post('/api/portal/messages/:id/action', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const { actionTaken, replyMethod, replyDetails, status } = req.body;

  if (!replyMethod || !replyDetails) {
    return res.status(400).json({ error: 'Reply method and details are required.' });
  }

  const updatedMsg = db.addMessageAction(id, {
    actionTaken: actionTaken || `Action via ${replyMethod}`,
    actionByUserId: user.id,
    actionByName: `${user.fullName} (${user.designation || user.roleName})`,
    replyMethod,
    replyDetails,
    status: status || 'resolved'
  });

  if (!updatedMsg) {
    return res.status(404).json({ error: 'Message not found.' });
  }

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: 'RECORD_MESSAGE_ACTION',
    module: 'messages',
    recordId: id,
    newValue: { replyMethod, replyDetails, status }
  });

  res.json(updatedMsg);
});

// UPDATE MESSAGE STATUS
app.put('/api/portal/messages/:id/status', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  const updatedMsg = db.updateMessageStatus(id, status);
  if (!updatedMsg) {
    return res.status(404).json({ error: 'Message not found.' });
  }

  res.json(updatedMsg);
});

// SEND MESSAGE
app.post('/api/portal/messages', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { recipientType, recipientId, recipientName, subject, body, category, priority, replyToId } = req.body;

  if (!subject || !body) {
    return res.status(400).json({ error: 'Subject and message body are required.' });
  }

  const newMsg = db.createMessage({
    senderId: user.id,
    senderName: user.fullName,
    senderRole: user.roleName,
    recipientType: recipientType || 'all',
    recipientId: recipientId || 'all',
    recipientName: recipientName || (recipientType === 'all' ? 'All Users' : recipientId),
    subject: subject.trim(),
    body: body.trim(),
    category: category || 'general',
    priority: priority || 'normal',
    replyToId
  });

  // Create corresponding app notification
  const snippet = body.length > 70 ? body.substring(0, 70) + '...' : body;
  db.createNotification({
    recipientId: recipientId || 'all',
    title: `New Message: ${subject}`,
    message: `${user.fullName} (${user.roleName}): ${snippet}`,
    type: 'message',
    link: '/portal/messages'
  });

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: 'SEND_MESSAGE',
    module: 'messages',
    recordId: newMsg.id,
    newValue: { subject, recipientType, recipientId }
  });

  res.status(201).json(newMsg);
});

// MARK MESSAGE AS READ
app.put('/api/portal/messages/:id/read', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const messages = db.getMessages();
  const msg = messages.find(m => m.id === id);

  if (!msg) {
    return res.status(404).json({ error: 'Message not found.' });
  }

  if (!msg.readBy) msg.readBy = [];
  if (!msg.readBy.includes(user.id)) {
    msg.readBy.push(user.id);
    msg.updatedAt = new Date().toISOString();
    db.saveData();
  }

  res.json(msg);
});

// ARCHIVE / DELETE MESSAGE FROM USER INBOX
app.delete('/api/portal/messages/:id', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const { permanent } = req.query;
  const isAdmin = user && (user.roleName === 'Admin' || user.roleId === 'role_admin' || user.roleName?.toLowerCase().includes('admin'));

  if (permanent === 'true' || isAdmin) {
    const deleted = db.deleteMessage(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Message not found.' });
    }
    db.logAudit({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'DELETE_MESSAGE_PERMANENT',
      module: 'messages',
      recordId: id
    });
    return res.json({ success: true, message: 'Message deleted permanently.' });
  }

  const messages = db.getMessages();
  const msg = messages.find(m => m.id === id);

  if (!msg) {
    return res.status(404).json({ error: 'Message not found.' });
  }

  if (!msg.archivedBy) msg.archivedBy = [];
  if (!msg.archivedBy.includes(user.id)) {
    msg.archivedBy.push(user.id);
    msg.updatedAt = new Date().toISOString();
    db.saveData();
  }

  res.json({ success: true, message: 'Message archived.' });
});

// GET NOTIFICATIONS & UNREAD COUNT
app.get('/api/portal/notifications', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const allNotifs = db.getNotifications();

  const userNotifs = allNotifs.filter(n => n.recipientId === 'all' || n.recipientId === user.id);
  const unreadCount = userNotifs.filter(n => !(n.readBy || []).includes(user.id)).length;

  res.json({ notifications: userNotifs, unreadCount });
});

// MARK ALL NOTIFICATIONS AS READ
app.put('/api/portal/notifications/mark-all-read', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const allNotifs = db.getNotifications();

  let count = 0;
  allNotifs.forEach(n => {
    if (n.recipientId === 'all' || n.recipientId === user.id) {
      if (!n.readBy) n.readBy = [];
      if (!n.readBy.includes(user.id)) {
        n.readBy.push(user.id);
        count++;
      }
    }
  });

  if (count > 0) {
    db.saveData();
  }

  res.json({ success: true, markedCount: count });
});

// MARK SINGLE NOTIFICATION AS READ
app.put('/api/portal/notifications/:id/read', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const allNotifs = db.getNotifications();
  const notif = allNotifs.find(n => n.id === id);

  if (!notif) {
    return res.status(404).json({ error: 'Notification not found.' });
  }

  if (!notif.readBy) notif.readBy = [];
  if (!notif.readBy.includes(user.id)) {
    notif.readBy.push(user.id);
    db.saveData();
  }

  res.json(notif);
});

// BROADCAST NOTIFICATION (ADMIN / BROADCAST ROLE)
app.post('/api/portal/notifications/broadcast', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { title, message, type, link, sendAsMessage } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message content are required.' });
  }

  const notif = db.createNotification({
    recipientId: 'all',
    title: title.trim(),
    message: message.trim(),
    type: type || 'info',
    link: link || '/portal/messages'
  });

  if (sendAsMessage) {
    db.createMessage({
      senderId: user.id,
      senderName: user.fullName,
      senderRole: user.roleName,
      recipientType: 'all',
      recipientId: 'all',
      recipientName: 'All System Users',
      subject: title.trim(),
      body: message.trim(),
      category: 'announcement',
      priority: 'high'
    });
  }

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: 'BROADCAST_NOTIFICATION',
    module: 'messages',
    recordId: notif.id,
    newValue: { title, type }
  });

  res.status(201).json(notif);
});

// ==========================================
// DATABASE TABLES, RECORDS COLLECTION & SYNC API
// ==========================================

// Sync Database endpoint
app.post('/api/portal/sync-db', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  db.saveData();

  const fullData = db.getData();
  const totalRecordsCount =
    (fullData.users?.length || 0) +
    (fullData.roles?.length || 0) +
    (fullData.members?.length || 0) +
    (fullData.events?.length || 0) +
    (fullData.eventItems?.length || 0) +
    (fullData.meetingItems?.length || 0) +
    (fullData.excoMembers?.length || 0) +
    (fullData.quizQuestions?.length || 0) +
    (fullData.quizSubmissions?.length || 0) +
    (fullData.quizWinners?.length || 0) +
    (fullData.prizes?.length || 0) +
    (fullData.sponsors?.length || 0) +
    (fullData.messages?.length || 0) +
    (fullData.notifications?.length || 0) +
    (fullData.auditLogs?.length || 0) +
    (fullData.contacts?.length || 0) +
    (fullData.socialLinks?.length || 0) +
    (fullData.slideshow?.length || 0);

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: 'SYNC_DATABASE',
    module: 'system',
    recordId: `sync_${Date.now()}`
  });

  res.json({
    success: true,
    message: 'Database synced and persisted across local disk storage and Cloud Firestore.',
    syncedAt: new Date().toISOString(),
    totalRecordsCount
  });
});

// Detailed Database Tables Summary
app.get('/api/portal/db/tables', authenticateSession, (req: Request, res: Response) => {
  const fullData = db.getData();

  const tables = [
    { key: 'users', name: 'Users & Admins', nameDh: 'ޔޫޒަރުން އަދި އެޑްމިން', count: fullData.users?.length || 0, schema: 'id, username, fullName, roleName, status, designation', sample: (fullData.users || []).slice(0, 3) },
    { key: 'roles', name: 'Roles & Permissions', nameDh: 'ރޯލްތަކާއި ޕާމިޝަން', count: fullData.roles?.length || 0, schema: 'id, name, permissions', sample: (fullData.roles || []).slice(0, 3) },
    { key: 'members', name: 'Club Members Registry', nameDh: 'ކްލަބް މެންބަރުންගේ ދަފްތަރު', count: fullData.members?.length || 0, schema: 'id, memberNumber, fullName, memberType, status, phoneNumber', sample: (fullData.members || []).slice(0, 3) },
    { key: 'eventItems', name: 'Club Events Catalog', nameDh: 'ކްލަބް އީވެންޓްތައް', count: fullData.eventItems?.length || 0, schema: 'id, title, eventType, eventDate, venue, status, attendance', sample: (fullData.eventItems || []).slice(0, 3) },
    { key: 'meetingItems', name: 'Committee Meetings & Minutes', nameDh: 'ޖަލްސާތަކާއި ޔައުމިއްޔާ', count: fullData.meetingItems?.length || 0, schema: 'id, title, meetingType, heldDate, status, votings', sample: (fullData.meetingItems || []).slice(0, 3) },
    { key: 'excoMembers', name: 'Executive Committee (EXCO)', nameDh: 'ހިންގާ ކޮމިޓީ', count: fullData.excoMembers?.length || 0, schema: 'id, name, designation, term, photo, status', sample: (fullData.excoMembers || []).slice(0, 3) },
    { key: 'quizQuestions', name: 'Ramazan Quiz Questions', nameDh: 'ރަމަޟާން ކުއިޒް ސުވާލު', count: fullData.quizQuestions?.length || 0, schema: 'id, questionNumber, questionText, isPublished, status', sample: (fullData.quizQuestions || []).slice(0, 3) },
    { key: 'quizSubmissions', name: 'Quiz Answer Submissions', nameDh: 'ކުއިޒް ޖަވާބު ސަބްމިޝަން', count: fullData.quizSubmissions?.length || 0, schema: 'id, questionId, participantNumber, isCorrect, maskedIdNumber', sample: (fullData.quizSubmissions || []).slice(0, 3) },
    { key: 'quizWinners', name: 'Quiz Winners Register', nameDh: 'ކުއިޒް ނަސީބުވެރިން', count: fullData.quizWinners?.length || 0, schema: 'id, questionId, fullName, prizeTitle, selectedAt', sample: (fullData.quizWinners || []).slice(0, 3) },
    { key: 'prizes', name: 'Quiz Prizes', nameDh: 'ކުއިޒް އިނާމުތައް', count: fullData.prizes?.length || 0, schema: 'id, title, value, sponsorName', sample: (fullData.prizes || []).slice(0, 3) },
    { key: 'sponsors', name: 'Quiz Sponsors', nameDh: 'ކުއިޒް ސްޕޮންސަރުން', count: fullData.sponsors?.length || 0, schema: 'id, name, logo, tier', sample: (fullData.sponsors || []).slice(0, 3) },
    { key: 'messages', name: 'Portal Messages & Inbox', nameDh: 'މެސެޖުތަކާއި އިންބޮކްސް', count: fullData.messages?.length || 0, schema: 'id, senderName, subject, priority, status, actions', sample: (fullData.messages || []).slice(0, 3) },
    { key: 'notifications', name: 'System Notifications', nameDh: 'ނޮޓިފިކޭޝަން', count: fullData.notifications?.length || 0, schema: 'id, recipientId, title, type, readBy', sample: (fullData.notifications || []).slice(0, 3) },
    { key: 'auditLogs', name: 'Audit & System Logs', nameDh: 'އޮޑިޓް ލޮގް', count: fullData.auditLogs?.length || 0, schema: 'id, userId, action, module, createdAt', sample: (fullData.auditLogs || []).slice(0, 3) },
    { key: 'slideshow', name: 'Website Slideshow Banners', nameDh: 'ސްލައިޑްޝޯ ބެނާ', count: fullData.slideshow?.length || 0, schema: 'id, title, imageUrl, displayOrder, status', sample: (fullData.slideshow || []).slice(0, 3) },
    { key: 'contacts', name: 'Contact Information', nameDh: 'ގުޅޭނެ މަޢުލޫމާތު', count: fullData.contacts?.length || 0, schema: 'id, label, value, type, status', sample: (fullData.contacts || []).slice(0, 3) },
    { key: 'socialLinks', name: 'Social Media Channels', nameDh: 'ސޯޝަލް މީޑިއާ ލިންކު', count: fullData.socialLinks?.length || 0, schema: 'id, platform, url, status', sample: (fullData.socialLinks || []).slice(0, 3) },
    { key: 'clubRules', name: 'Club Official Rules Document', nameDh: 'ކްލަބް ޤަވާޢިދު', count: fullData.clubRules?.chapters?.length ? 1 : 0, schema: 'titleDhivehi, version, effectiveDate, chapters', sample: [fullData.clubRules] }
  ];

  const totalRecords = tables.reduce((acc, t) => acc + t.count, 0);

  res.json({
    tables,
    totalTables: tables.length,
    totalRecords,
    lastSyncedAt: new Date().toISOString()
  });
});

// Full Database Backup Export (JSON)
app.get('/api/portal/db/export', authenticateSession, (req: Request, res: Response) => {
  const fullData = db.getData();
  const exportPayload = {
    app: 'Ananda Recreation Club Portal',
    exportedAt: new Date().toISOString(),
    version: '2.0',
    data: fullData
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=ARC_Club_DB_Backup_${new Date().toISOString().slice(0,10)}.json`);
  res.send(JSON.stringify(exportPayload, null, 2));
});

// Full Database SQL Dump Export
app.get('/api/portal/db/export-sql', authenticateSession, (req: Request, res: Response) => {
  const fullData = db.getData();
  
  const escapeSqlStr = (val: string | null | undefined) => {
    if (val === null || val === undefined) return 'NULL';
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  const escapeSqlJson = (val: any) => {
    if (val === null || val === undefined) return 'NULL';
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  };

  let sqlDump = `-- Ananda Recreation Club Portal - SQL Database Dump\n`;
  sqlDump += `-- Exported At: ${new Date().toISOString()}\n\n`;

  sqlDump += `CREATE TABLE IF NOT EXISTS app_store (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW());\n`;
  sqlDump += `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT, full_name TEXT, role_id TEXT, data JSONB, updated_at TIMESTAMPTZ DEFAULT NOW());\n`;
  sqlDump += `CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, member_number TEXT, full_name TEXT, id_card_number TEXT, data JSONB, updated_at TIMESTAMPTZ DEFAULT NOW());\n`;
  sqlDump += `CREATE TABLE IF NOT EXISTS exco_members (id TEXT PRIMARY KEY, name TEXT, id_card_number TEXT, data JSONB, updated_at TIMESTAMPTZ DEFAULT NOW());\n`;
  sqlDump += `CREATE TABLE IF NOT EXISTS quiz_questions (id TEXT PRIMARY KEY, title TEXT, question_number INT, data JSONB, updated_at TIMESTAMPTZ DEFAULT NOW());\n`;
  sqlDump += `CREATE TABLE IF NOT EXISTS quiz_submissions (id TEXT PRIMARY KEY, question_id TEXT, full_name TEXT, phone TEXT, id_card_number TEXT, data JSONB, updated_at TIMESTAMPTZ DEFAULT NOW());\n\n`;

  // Insert Members
  if (Array.isArray(fullData.members)) {
    fullData.members.forEach(m => {
      sqlDump += `INSERT INTO members (id, member_number, full_name, id_card_number, data) VALUES (${escapeSqlStr(m.id)}, ${escapeSqlStr(m.memberNumber)}, ${escapeSqlStr(m.fullName)}, ${escapeSqlStr(m.idCardNumber)}, ${escapeSqlJson(m)}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, id_card_number = EXCLUDED.id_card_number;\n`;
    });
  }

  // Insert EXCO Members
  if (Array.isArray(fullData.excoMembers)) {
    fullData.excoMembers.forEach(e => {
      sqlDump += `INSERT INTO exco_members (id, name, id_card_number, data) VALUES (${escapeSqlStr(e.id)}, ${escapeSqlStr(e.fullName)}, ${escapeSqlStr(e.idCardNumber)}, ${escapeSqlJson(e)}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, id_card_number = EXCLUDED.id_card_number;\n`;
    });
  }

  // Insert Quiz Submissions
  if (Array.isArray(fullData.quizSubmissions)) {
    fullData.quizSubmissions.forEach(s => {
      sqlDump += `INSERT INTO quiz_submissions (id, question_id, full_name, phone, id_card_number, data) VALUES (${escapeSqlStr(s.id)}, ${escapeSqlStr(s.questionId)}, ${escapeSqlStr(s.maskedIdNumber)}, ${escapeSqlStr(s.contactNumber)}, ${escapeSqlStr(s.normalizedIdNumber)}, ${escapeSqlJson(s)}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;\n`;
    });
  }

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename=ARC_Club_SQL_Backup_${new Date().toISOString().slice(0,10)}.sql`);
  res.send(sqlDump);
});

// Import / Restore Database Data
app.post('/api/portal/db/import', authenticateSession, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { data: importedData } = req.body;

  if (!importedData || typeof importedData !== 'object') {
    return res.status(400).json({ error: 'Invalid database import payload format.' });
  }

  // Preserve core users & admin safety
  const currentUsers = db.getUsers();
  const mergedData = {
    ...db.getData(),
    ...importedData,
    users: (importedData.users && Array.isArray(importedData.users) && importedData.users.length > 0)
      ? importedData.users
      : currentUsers
  };

  db.saveData(mergedData);

  db.logAudit({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    action: 'RESTORE_DATABASE',
    module: 'system',
    recordId: `restore_${Date.now()}`
  });

  res.json({
    success: true,
    message: 'Database snapshot successfully restored and synchronized.',
    restoredAt: new Date().toISOString()
  });
});

// Global Error Handler for API Routes
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled API Server Error:', err);
  res.status(500).json({
    error: 'An unexpected server error occurred.',
    message: err?.message || 'Server error'
  });
});

// ==========================================
// VITE DEV MIDDLEWARE / PRODUCTION SERVING
// ==========================================

async function startServer() {
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
    console.log(`ARC Club server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
