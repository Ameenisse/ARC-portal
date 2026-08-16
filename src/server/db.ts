import crypto from 'crypto';
import { firestore, FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from './firebase';
import {
  User,
  Role,
  ClubMember,
  SiteSetting,
  SlideshowItem,
  SocialLink,
  ExcoMember,
  ClubEvent,
  EventItem,
  MeetingItem,
  QuizQuestion,
  QuizSubmission,
  QuizWinner,
  QuizPrize,
  QuizSponsor,
  QuizParticipantQueue,
  AuditLog,
  InboxMessage,
  AppNotification,
  ClubRulesData,
  ModuleKey,
  BankAccount,
  IncomeRecord,
  ExpenseRecord,
  AccountTransferRecord,
  MemberContributionSetting,
  MemberContributionRecord,
  CategoryBudgetAllocation,
  BudgetStats,
  PresidentialDirective,
  OfficialCircular,
  ContributionStatus,
  MeetingVotingItem
} from '../types';

// Helper to hash PINs
export function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, 10000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function verifyPin(pin: string, salt: string, expectedHash: string): boolean {
  if (!pin || !salt || !expectedHash) return false;
  try {
    let actualSalt = salt;
    let actualExpectedHash = expectedHash;

    if (salt.length > actualExpectedHash.length && salt.length === 128) {
      actualSalt = expectedHash;
      actualExpectedHash = salt;
    }

    const calculatedHash = hashPin(pin, actualSalt);
    const calculatedBuf = Buffer.from(calculatedHash, 'hex');
    const expectedBuf = Buffer.from(actualExpectedHash, 'hex');

    if (calculatedBuf.length !== expectedBuf.length || calculatedBuf.length === 0) {
      return false;
    }

    return crypto.timingSafeEqual(calculatedBuf, expectedBuf);
  } catch (err) {
    console.error('Error verifying PIN:', err);
    return false;
  }
}

const ALL_MODULES: ModuleKey[] = [
  'dashboard', 'members', 'events_meetings', 'budget', 'slideshow', 'content',
  'vision_mission', 'contact', 'social_media', 'exco_team', 'ramazan_quiz',
  'quiz_participants', 'quiz_winners', 'users', 'roles_permissions',
  'audit_logs', 'club_rules', 'settings', 'messages'
];

function createAdminPermissions(userId: string) {
  return ALL_MODULES.map(m => ({
    id: `perm_${userId}_${m}`,
    roleId: 'role_admin',
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

const defaultClubRules: ClubRulesData = {
  titleDhivehi: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ ގަވާއިދު',
  titleEnglish: 'Aanandha Recreation Club Constitution & Bye-Laws',
  descriptionDhivehi: 'ކްލަބުގެ އެންމެހައި ކަންކަން ހިންގުމާ ބެހޭ އަސާސީ ގަވާއިދާއި އުސޫލުތައް',
  descriptionEnglish: 'Primary governing constitution, regulatory operational procedures, and member code of conduct.',
  version: '2026.1',
  effectiveDate: '2026-01-01',
  updatedAt: new Date().toISOString(),
  chapters: [
    {
      id: 'chap_1',
      chapterNumber: 1,
      titleDhivehi: 'އެކުލެވިގެންވާ ގޮތާއި ނަން',
      titleEnglish: 'Name & Constitutional Identity',
      summaryDhivehi: 'ކްލަބުގެ ރަސްމީ ނަމާއި، އިދާރީ މަރުކަޒު އަދި އަސާސީ މަގުސަދުތައް.',
      summaryEnglish: 'Official club name, registered location, and core foundational objectives.',
      articles: [
        {
          articleNumber: '1.1',
          title: 'ކްލަބުގެ ނަން (Club Name)',
          titleDhivehi: 'ކްލަބުގެ ނަން',
          titleEnglish: 'Club Name & Abbreviation',
          content: 'މި ޖަމްޢިއްޔާގެ ނަމަކީ "އާނަންދާ ރީކްރިއޭޝަން ކްލަބް" (Aanandha Recreation Club) އެވެ. ކުރުކޮށް ބޭނުންކުރާނީ "ARC" އެވެ.',
          contentDhivehi: 'މި ޖަމްޢިއްޔާގެ ނަމަކީ "އާނަންދާ ރީކްރިއޭޝަން ކްލަބް" (Aanandha Recreation Club) އެވެ. ކުރުކޮށް ބޭނުންކުރާނީ "ARC" އެވެ.',
          contentEnglish: 'The official registered title of this NGO shall be "Aanandha Recreation Club", abbreviated as "ARC".'
        },
        {
          articleNumber: '1.2',
          title: 'އިދާރީ މަރުކަޒު (Registered Office)',
          titleDhivehi: 'އިދާރީ މަރުކަޒު',
          titleEnglish: 'Registered Office Location',
          content: 'ކްލަބުގެ ރަސްމީ އިދާރީ މަރުކަޒު ހުންނާނީ މާލެ، ދިވެހިރާއްޖޭގައެވެ.',
          contentDhivehi: 'ކްލަބުގެ ރަސްމީ އިދާރީ މަރުކަޒު ހުންނާނީ މާލެ، ދިވެހިރާއްޖޭގައެވެ.',
          contentEnglish: 'The primary head office and registered address of the Club shall be situated in Malé, Republic of Maldives.'
        }
      ]
    }
  ]
};

export class DatabaseStore {
  private initialized = false;

  // Initialize and seed default system records into Cloud Firestore
  public async initDatabase(): Promise<void> {
    if (this.initialized) return;
    try {
      console.log(`[Firestore] Initializing connection to project ${FIREBASE_PROJECT_ID} (db: ${FIRESTORE_DATABASE_ID})...`);
      
      // 1. Seed Roles if missing
      const existingRoles = await firestore.list<Role>('roles');
      if (existingRoles.length === 0) {
        console.log('[Firestore] Seeding default roles into Firestore...');
        const defaultRoles: Role[] = [
          { id: 'role_admin', name: 'Admin', description: 'Full administrative access', isSystemRole: true, defaultPermissions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'role_president', name: 'President', description: 'President role with executive leadership rights', isSystemRole: true, defaultPermissions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'role_vice_president', name: 'Vice President', description: 'Vice President role with executive rights', isSystemRole: true, defaultPermissions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'role_treasurer', name: 'Treasurer', description: 'Treasurer role with financial and budget management', isSystemRole: true, defaultPermissions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'role_secretary', name: 'Secretary', description: 'Secretary role with administrative and minutes management', isSystemRole: true, defaultPermissions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'role_exco_member', name: 'EXCO Member', description: 'Executive Committee Member', isSystemRole: true, defaultPermissions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'role_member', name: 'Club Member', description: 'Standard Member with personal dashboard & budget statistics', isSystemRole: true, defaultPermissions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        ];
        for (const r of defaultRoles) {
          await firestore.set('roles', r.id, r);
        }
      }

      // 2. Seed or Update In-built Admin User (ID: admin, PIN: 2613)
      await this.ensureAdminUser('2613');

      // 3. Seed Bank Account if missing
      const accounts = await this.getBankAccounts();
      if (accounts.length === 0) {
        console.log('[Firestore] Seeding default BML bank account...');
        const defaultAccount: BankAccount = {
          id: 'acc_bml_main',
          bankName: 'Bank of Maldives (BML)',
          accountName: 'AANANDHA RECREATION CLUB',
          accountNumber: '7701123456001',
          type: 'bank',
          currency: 'MVR',
          openingBalance: 25450.00,
          currentBalance: 25450.00,
          status: 'active',
          notes: 'Primary operating and member contribution account',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await firestore.set('bankAccounts', defaultAccount.id, defaultAccount);
      }

      // 4. Seed Contribution Settings if missing
      const contSetting = await firestore.get('contributionSettings', 'cfg_dues_default');
      if (!contSetting) {
        await firestore.set('contributionSettings', 'cfg_dues_default', {
          id: 'cfg_dues_default',
          monthlyDueAmount: 50.00,
          finePerDay: 2.00,
          fineGraceDays: 5,
          maxFineAmount: 100.00,
          dueDayOfMonth: 10,
          bankAccountId: 'acc_bml_main',
          isActive: true,
          updatedAt: new Date().toISOString()
        });
      }

      // 5. Seed Club Rules if missing
      const rulesDoc = await firestore.get('clubRules', 'rules_primary');
      if (!rulesDoc) {
        await firestore.set('clubRules', 'rules_primary', {
          id: 'rules_primary',
          ...defaultClubRules
        });
      }

      // 6. Seed Site Settings if missing
      const settings = await firestore.list('siteSettings');
      if (settings.length === 0) {
        const defaultSettings = [
          { id: 'set_general_clubName', group: 'general', key: 'clubName', value: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް', updatedAt: new Date().toISOString() },
          { id: 'set_general_clubAbbreviation', group: 'general', key: 'clubAbbreviation', value: 'ARC', updatedAt: new Date().toISOString() },
          { id: 'set_general_aboutText', group: 'general', key: 'aboutText', value: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބަކީ އިޖުތިމާއީ، ކުޅިވަރު އަދި ދީނީ އެކިއެކި ހަރަކާތްތައް ހިންގާ ޖަމްއިއްޔާއެކެވެ.', updatedAt: new Date().toISOString() },
          { id: 'set_contact_address', group: 'contact', key: 'address', value: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް، މާލެ، ދިވެހިރާއްޖެ', updatedAt: new Date().toISOString() },
          { id: 'set_contact_phone', group: 'contact', key: 'phone', value: '+960 7771234', updatedAt: new Date().toISOString() },
          { id: 'set_contact_email', group: 'contact', key: 'email', value: 'info@arc.mv', updatedAt: new Date().toISOString() }
        ];
        for (const s of defaultSettings) {
          await firestore.set('siteSettings', s.id, s);
        }
      }

      this.initialized = true;
      console.log('[Firestore] Initialization and seed checks complete.');
    } catch (err: any) {
      console.error('[Firestore] Database initialization error:', err.message);
    }
  }

  // HEALTH CHECK
  public async checkDatabaseHealth(): Promise<{
    database: string;
    connected: boolean;
    projectId: string;
    databaseId: string;
    schemaReady: boolean;
    error?: string;
  }> {
    const health = await firestore.checkHealth();
    return {
      database: 'firebase-firestore',
      connected: health.connected,
      projectId: FIREBASE_PROJECT_ID,
      databaseId: FIRESTORE_DATABASE_ID,
      schemaReady: health.connected,
      error: health.error
    };
  }

  // ==========================================
  // 1. USERS & AUTHENTICATION
  // ==========================================

  public async getUsers(): Promise<User[]> {
    const users = await firestore.list<any>('users');
    const allPerms = await firestore.list<any>('modulePermissions');

    return users.map(u => ({
      id: u.id,
      fullName: u.fullName || u.full_name || '',
      username: u.username || '',
      designation: u.designation || '',
      contactNumber: u.contactNumber || u.contact_number || '',
      roleId: u.roleId || u.role_id || 'role_member',
      roleName: u.roleName || u.role_name || 'Club Member',
      memberId: u.memberId || u.member_id,
      profilePhotoUrl: u.profilePhotoUrl || u.profile_photo_url,
      status: u.status || 'active',
      requirePinChange: Boolean(u.requirePinChange ?? u.require_pin_change),
      pin: u.pin || u.raw_pin || '',
      pinHash: u.pinHash || u.pin_hash || '',
      pinSalt: u.pinSalt || u.pin_salt || '',
      failedLoginCount: u.failedLoginCount ?? u.failed_login_count ?? 0,
      lockedUntil: u.lockedUntil || u.locked_until,
      lastLoginAt: u.lastLoginAt || u.last_login_at,
      notes: u.notes,
      createdAt: u.createdAt || u.created_at || new Date().toISOString(),
      createdBy: u.createdBy || u.created_by,
      updatedAt: u.updatedAt || u.updated_at || new Date().toISOString(),
      updatedBy: u.updatedBy || u.updated_by,
      permissions: allPerms.filter(p => p.userId === u.id || p.user_id === u.id)
    }));
  }

  public async getUserById(id: string): Promise<User | null> {
    const u = await firestore.get<any>('users', id);
    if (!u) return null;

    const perms = await this.getUserPermissions(id);
    return {
      id: u.id,
      fullName: u.fullName || u.full_name || '',
      username: u.username || '',
      designation: u.designation || '',
      contactNumber: u.contactNumber || u.contact_number || '',
      roleId: u.roleId || u.role_id || 'role_member',
      roleName: u.roleName || u.role_name || 'Club Member',
      memberId: u.memberId || u.member_id,
      profileImage: u.profileImage || u.profilePhotoUrl || u.profile_photo_url || u.profile_image,
      status: u.status || 'active',
      requirePinChange: Boolean(u.requirePinChange ?? u.require_pin_change),
      pin: u.pin || u.raw_pin || '',
      pinHash: u.pinHash || u.pin_hash || '',
      pinSalt: u.pinSalt || u.pin_salt || '',
      failedLoginCount: u.failedLoginCount ?? u.failed_login_count ?? 0,
      lockedUntil: u.lockedUntil || u.locked_until,
      lastLoginAt: u.lastLoginAt || u.last_login_at,
      notes: u.notes,
      createdAt: u.createdAt || u.created_at || new Date().toISOString(),
      createdBy: u.createdBy || u.created_by,
      updatedAt: u.updatedAt || u.updated_at || new Date().toISOString(),
      permissions: perms
    };
  }

  public async ensureAdminUser(pin = '2613'): Promise<User> {
    const adminUser = await this.getUserByUsername('admin');
    const adminId = adminUser ? adminUser.id : 'usr_admin_001';
    const salt = 'arc_salt_2026';
    const pinHash = hashPin(pin, salt);

    const adminDoc: any = {
      id: adminId,
      fullName: 'System Administrator',
      username: 'admin',
      designation: 'Chief Administrator',
      contactNumber: '+960 7771234',
      roleId: 'role_admin',
      roleName: 'Admin',
      status: 'active',
      requirePinChange: false,
      pin,
      pinHash,
      pinSalt: salt,
      failedLoginCount: 0,
      notes: 'In-built primary system administrator (ID: admin)',
      createdAt: adminUser?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await firestore.set('users', adminId, adminDoc);

    const perms = createAdminPermissions(adminId);
    for (const p of perms) {
      await firestore.set('modulePermissions', p.id, p);
    }

    const updated = await this.getUserById(adminId);
    return updated || adminDoc;
  }

  public async getUserByUsername(username: string): Promise<User | null> {
    if (!username) return null;
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    const allUsers = await this.getUsers();
    return allUsers.find(u => 
      (u.username && u.username.toLowerCase() === cleanUsername) ||
      (u.id && u.id.toLowerCase() === cleanUsername) ||
      (u.memberId && u.memberId.toLowerCase() === cleanUsername)
    ) || null;
  }

  public async createUser(userData: Partial<User> & { pin: string; profilePhotoUrl?: string }): Promise<User> {
    const cleanUsername = (userData.username || '').trim().toLowerCase();
    const existing = await this.getUserByUsername(cleanUsername);
    if (existing) {
      throw new Error(`Username "${cleanUsername}" is already taken.`);
    }

    const salt = generateSalt();
    const pinHash = hashPin(userData.pin, salt);
    const userId = userData.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newUser: any = {
      id: userId,
      fullName: userData.fullName || '',
      username: cleanUsername,
      designation: userData.designation || '',
      contactNumber: userData.contactNumber || '',
      roleId: userData.roleId || 'role_member',
      roleName: userData.roleName || 'Club Member',
      memberId: userData.memberId,
      profileImage: userData.profileImage || userData.profilePhotoUrl,
      status: userData.status || 'active',
      requirePinChange: Boolean(userData.requirePinChange),
      pinHash,
      pinSalt: salt,
      failedLoginCount: 0,
      notes: userData.notes,
      createdAt: now,
      createdBy: userData.createdBy,
      updatedAt: now
    };

    await firestore.set('users', userId, newUser);

    // Save permissions
    const perms = userData.roleName === 'Admin' || userData.roleId === 'role_admin'
      ? createAdminPermissions(userId)
      : (userData.permissions || []);

    for (const p of perms) {
      await firestore.set('modulePermissions', p.id || `perm_${userId}_${p.moduleKey}`, {
        ...p,
        id: p.id || `perm_${userId}_${p.moduleKey}`,
        userId
      });
    }

    return (await this.getUserById(userId))!;
  }

  public async updateUser(id: string, updates: Partial<User> & { pin?: string; updatedBy?: string; profilePhotoUrl?: string }): Promise<User> {
    const existing = await this.getUserById(id);
    if (!existing) {
      throw new Error(`User not found with id ${id}`);
    }

    const now = new Date().toISOString();
    const docUpdates: Record<string, any> = { updatedAt: now };

    if (updates.fullName !== undefined) docUpdates.fullName = updates.fullName;
    if (updates.username !== undefined) docUpdates.username = updates.username.trim().toLowerCase();
    if (updates.designation !== undefined) docUpdates.designation = updates.designation;
    if (updates.contactNumber !== undefined) docUpdates.contactNumber = updates.contactNumber;
    if (updates.roleId !== undefined) docUpdates.roleId = updates.roleId;
    if (updates.roleName !== undefined) docUpdates.roleName = updates.roleName;
    if (updates.memberId !== undefined) docUpdates.memberId = updates.memberId;
    if (updates.profileImage !== undefined) docUpdates.profileImage = updates.profileImage;
    if (updates.profilePhotoUrl !== undefined) docUpdates.profileImage = updates.profilePhotoUrl;
    if (updates.status !== undefined) docUpdates.status = updates.status;
    if (updates.requirePinChange !== undefined) docUpdates.requirePinChange = Boolean(updates.requirePinChange);
    if (updates.failedLoginCount !== undefined) docUpdates.failedLoginCount = updates.failedLoginCount;
    if (updates.lockedUntil !== undefined) docUpdates.lockedUntil = updates.lockedUntil;
    if (updates.lastLoginAt !== undefined) docUpdates.lastLoginAt = updates.lastLoginAt;
    if (updates.notes !== undefined) docUpdates.notes = updates.notes;
    if (updates.updatedBy !== undefined) docUpdates.updatedBy = updates.updatedBy;

    if (updates.pin) {
      const salt = generateSalt();
      docUpdates.pinHash = hashPin(updates.pin, salt);
      docUpdates.pinSalt = salt;
    }

    await firestore.set('users', id, docUpdates);

    // Update permissions if provided
    if (updates.permissions) {
      for (const p of updates.permissions) {
        const permId = p.id || `perm_${id}_${p.moduleKey}`;
        await firestore.set('modulePermissions', permId, {
          ...p,
          id: permId,
          userId: id
        });
      }
    }

    return (await this.getUserById(id))!;
  }

  public async deleteUser(id: string): Promise<void> {
    await firestore.delete('users', id);
  }

  // ==========================================
  // 2. ROLES & PERMISSIONS
  // ==========================================

  public async getRoles(): Promise<Role[]> {
    return firestore.list<Role>('roles');
  }

  public async createRole(role: Partial<Role>): Promise<Role> {
    const id = role.id || `role_${Date.now()}`;
    const now = new Date().toISOString();
    const newRole: Role = {
      id,
      name: (role.name || 'EXCO Member') as any,
      description: role.description || '',
      isSystemRole: Boolean(role.isSystemRole),
      defaultPermissions: role.defaultPermissions || [],
      createdAt: now,
      updatedAt: now
    };
    await firestore.set('roles', id, newRole);
    return newRole;
  }

  public async updateRole(id: string, updates: Partial<Role>): Promise<Role> {
    const existing = await firestore.get<Role>('roles', id);
    if (!existing) throw new Error(`Role not found: ${id}`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await firestore.set('roles', id, updated);
    return updated;
  }

  public async deleteRole(id: string): Promise<void> {
    await firestore.delete('roles', id);
  }

  public async getUserPermissions(userId: string): Promise<any[]> {
    const all = await firestore.list<any>('modulePermissions');
    return all.filter(p => p.userId === userId || p.user_id === userId);
  }

  public async saveUserPermissions(userId: string, permissions: any[]): Promise<void> {
    for (const p of permissions) {
      const permId = p.id || `perm_${userId}_${p.moduleKey}`;
      await firestore.set('modulePermissions', permId, {
        ...p,
        id: permId,
        userId
      });
    }
  }

  // ==========================================
  // 3. SESSIONS
  // ==========================================

  public async getSessions(): Promise<Array<{ token: string; userId: string; expiresAt: number }>> {
    const now = Date.now();
    const sessions = await firestore.list<any>('userSessions');
    return sessions
      .filter(s => (s.expiresAt || s.expires_at || 0) > now)
      .map(s => ({
        token: s.token || s.id,
        userId: s.userId || s.user_id,
        expiresAt: s.expiresAt || s.expires_at
      }));
  }

  public async saveSession(session: { token: string; userId: string; expiresAt: number }): Promise<void> {
    const docId = session.token;
    await firestore.set('userSessions', docId, {
      id: docId,
      token: session.token,
      userId: session.userId,
      expiresAt: session.expiresAt,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString()
    });
  }

  public async deleteSession(token: string): Promise<void> {
    await firestore.delete('userSessions', token);
  }

  // ==========================================
  // 4. MEMBERS DIRECTORY
  // ==========================================

  public async getMembers(): Promise<ClubMember[]> {
    const docs = await firestore.list<any>('members');
    return docs.map(m => ({
      id: m.id,
      memberNumber: m.memberNumber || m.member_number || '',
      fullName: m.fullName || m.full_name || '',
      idCardNumber: m.idCardNumber || m.id_card_number,
      address: m.address || '',
      phoneNumber: m.phoneNumber || m.contactNumber || m.contact_number || '',
      email: m.email,
      joinedDate: m.joinedDate || m.joined_date || new Date().toISOString().split('T')[0],
      memberType: m.memberType || m.membershipType || m.membership_type || 'standard',
      excoDesignation: m.excoDesignation || m.designation,
      notes: m.notes,
      status: m.status || 'active',
      createdAt: m.createdAt || m.created_at || new Date().toISOString(),
      updatedAt: m.updatedAt || m.updated_at || new Date().toISOString()
    }));
  }

  public async getMemberById(id: string): Promise<ClubMember | null> {
    const m = await firestore.get<any>('members', id);
    if (!m) return null;
    return {
      id: m.id,
      memberNumber: m.memberNumber || m.member_number || '',
      fullName: m.fullName || m.full_name || '',
      idCardNumber: m.idCardNumber || m.id_card_number,
      address: m.address || '',
      phoneNumber: m.phoneNumber || m.contactNumber || m.contact_number || '',
      email: m.email,
      joinedDate: m.joinedDate || m.joined_date || new Date().toISOString().split('T')[0],
      memberType: m.memberType || m.membershipType || m.membership_type || 'standard',
      excoDesignation: m.excoDesignation || m.designation,
      notes: m.notes,
      status: m.status || 'active',
      createdAt: m.createdAt || m.created_at || new Date().toISOString(),
      updatedAt: m.updatedAt || m.updated_at || new Date().toISOString()
    };
  }

  public async createMember(member: Partial<ClubMember> & { createdBy?: string }): Promise<ClubMember> {
    const id = member.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newMember: ClubMember = {
      id,
      memberNumber: member.memberNumber || `ARC-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: member.fullName || '',
      idCardNumber: member.idCardNumber,
      address: member.address || '',
      phoneNumber: member.phoneNumber || '',
      email: member.email,
      joinedDate: member.joinedDate || new Date().toISOString().split('T')[0],
      memberType: member.memberType || 'standard',
      excoDesignation: member.excoDesignation,
      notes: member.notes,
      status: member.status || 'active',
      createdAt: now,
      updatedAt: now
    };

    await firestore.set('members', id, newMember);
    return newMember;
  }

  public async updateMember(id: string, updates: Partial<ClubMember> & { updatedBy?: string }): Promise<ClubMember> {
    const existing = await this.getMemberById(id);
    if (!existing) throw new Error(`Member not found with id ${id}`);

    const now = new Date().toISOString();
    const updated = { ...existing, ...updates, updatedAt: now };
    await firestore.set('members', id, updated);
    return updated;
  }

  public async deleteMember(id: string): Promise<void> {
    await firestore.delete('members', id);
  }

  // ==========================================
  // 5. SITE SETTINGS & BRANDING
  // ==========================================

  public async getSettings(): Promise<SiteSetting[]> {
    const docs = await firestore.list<any>('siteSettings');
    return docs.map(s => ({
      id: s.id,
      group: (s.group || s.settingGroup || s.setting_group || 'general') as any,
      key: s.key || s.settingKey || s.setting_key || '',
      value: s.value,
      updatedAt: s.updatedAt || s.updated_at || new Date().toISOString()
    }));
  }

  public async updateSettings(settingsList: Array<{ group: string; key: string; value: any }>): Promise<SiteSetting[]> {
    const now = new Date().toISOString();
    for (const s of settingsList) {
      const docId = `set_${s.group}_${s.key}`;
      const item: SiteSetting = {
        id: docId,
        group: s.group as any,
        key: s.key,
        value: s.value,
        updatedAt: now
      };
      await firestore.set('siteSettings', docId, item);
    }
    return this.getSettings();
  }

  // ==========================================
  // 6. SLIDESHOW ITEMS
  // ==========================================

  public async getSlideshow(): Promise<SlideshowItem[]> {
    const docs = await firestore.list<any>('slideshowItems');
    return docs
      .map(s => ({
        id: s.id,
        desktopImage: s.desktopImage || s.imageUrl || s.image_url || '',
        mobileImage: s.mobileImage || s.mobileImageUrl || s.mobile_image_url || s.desktopImage || s.imageUrl || '',
        title: s.title || '',
        subtitle: s.subtitle || '',
        buttonText: s.buttonText || s.button_text || '',
        buttonLink: s.buttonLink || s.buttonUrl || s.button_url || '',
        textAlignment: s.textAlignment || s.text_alignment || 'center',
        overlayLevel: s.overlayLevel ?? s.overlay_level ?? 45,
        displayOrder: s.displayOrder ?? s.display_order ?? 1,
        status: s.status || 'active',
        createdAt: s.createdAt || s.created_at || new Date().toISOString(),
        updatedAt: s.updatedAt || s.updated_at || new Date().toISOString()
      }))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  public async createSlideshowItem(item: Partial<SlideshowItem>): Promise<SlideshowItem> {
    const id = item.id || `slide_${Date.now()}`;
    const now = new Date().toISOString();
    const newItem: SlideshowItem = {
      id,
      desktopImage: item.desktopImage || '',
      mobileImage: item.mobileImage || item.desktopImage || '',
      title: item.title || '',
      subtitle: item.subtitle || '',
      buttonText: item.buttonText || '',
      buttonLink: item.buttonLink || '',
      textAlignment: item.textAlignment || 'center',
      overlayLevel: item.overlayLevel ?? 45,
      displayOrder: item.displayOrder ?? 1,
      status: item.status || 'active',
      createdAt: now,
      updatedAt: now
    };
    await firestore.set('slideshowItems', id, newItem);
    return newItem;
  }

  public async updateSlideshowItem(id: string, updates: Partial<SlideshowItem>): Promise<SlideshowItem> {
    const existing = (await this.getSlideshow()).find(s => s.id === id);
    if (!existing) throw new Error(`Slideshow item not found: ${id}`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await firestore.set('slideshowItems', id, updated);
    return updated;
  }

  public async deleteSlideshowItem(id: string): Promise<void> {
    await firestore.delete('slideshowItems', id);
  }

  // ==========================================
  // 7. SOCIAL LINKS & CONTACTS
  // ==========================================

  public async getSocialLinks(): Promise<SocialLink[]> {
    const docs = await firestore.list<any>('socialLinks');
    return docs.map(s => ({
      id: s.id,
      platform: s.platform || 'facebook',
      url: s.url || '',
      openInNewTab: Boolean(s.openInNewTab ?? s.open_in_new_tab ?? true),
      displayOrder: s.displayOrder ?? s.display_order ?? 1,
      status: s.status || 'active',
      createdAt: s.createdAt || s.created_at || new Date().toISOString()
    })).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  public async createSocialLink(item: Partial<SocialLink>): Promise<SocialLink> {
    const id = item.id || `soc_${Date.now()}`;
    const newLink: SocialLink = {
      id,
      platform: item.platform || 'facebook',
      url: item.url || '',
      openInNewTab: Boolean(item.openInNewTab ?? true),
      displayOrder: item.displayOrder ?? 1,
      status: item.status || 'active'
    };
    await firestore.set('socialLinks', id, newLink);
    return newLink;
  }

  public async updateSocialLink(id: string, updates: Partial<SocialLink>): Promise<SocialLink> {
    const existing = (await this.getSocialLinks()).find(s => s.id === id);
    if (!existing) throw new Error(`Social link not found: ${id}`);
    const updated = { ...existing, ...updates };
    await firestore.set('socialLinks', id, updated);
    return updated;
  }

  public async deleteSocialLink(id: string): Promise<void> {
    await firestore.delete('socialLinks', id);
  }

  public async getContacts(): Promise<any[]> {
    return firestore.list('contacts');
  }

  public async createContact(item: any): Promise<any> {
    const id = item.id || `con_${Date.now()}`;
    const newContact = { ...item, id, createdAt: new Date().toISOString() };
    await firestore.set('contacts', id, newContact);
    return newContact;
  }

  public async updateContact(id: string, updates: any): Promise<any> {
    const existing = await firestore.get('contacts', id);
    const updated = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };
    await firestore.set('contacts', id, updated);
    return updated;
  }

  public async deleteContact(id: string): Promise<void> {
    await firestore.delete('contacts', id);
  }

  // ==========================================
  // 8. EXCO TEAM
  // ==========================================

  public async getExcoMembers(): Promise<ExcoMember[]> {
    const docs = await firestore.list<any>('excoMembers');
    return docs.map(m => ({
      id: m.id,
      fullName: m.fullName || m.full_name || '',
      designation: m.designation || '',
      idCardNumber: m.idCardNumber || m.id_card_number,
      image: m.image || m.photoUrl || m.photo_url || '',
      description: m.description,
      socialLink: m.socialLink || m.social_link,
      displayOrder: m.displayOrder ?? m.display_order ?? 1,
      status: (m.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      createdAt: m.createdAt || m.created_at || new Date().toISOString(),
      updatedAt: m.updatedAt || m.updated_at || new Date().toISOString()
    })).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  public async createExcoMember(item: Partial<ExcoMember>): Promise<ExcoMember> {
    const id = item.id || `exco_${Date.now()}`;
    const now = new Date().toISOString();
    const newMember: ExcoMember = {
      id,
      fullName: item.fullName || '',
      designation: item.designation || '',
      idCardNumber: item.idCardNumber,
      image: item.image || '',
      description: item.description,
      socialLink: item.socialLink,
      displayOrder: item.displayOrder ?? 1,
      status: item.status === 'inactive' ? 'inactive' : 'active',
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now
    };
    await firestore.set('excoMembers', id, newMember);
    return newMember;
  }

  public async updateExcoMember(id: string, updates: Partial<ExcoMember>): Promise<ExcoMember> {
    const existing = (await this.getExcoMembers()).find(e => e.id === id);
    if (!existing) throw new Error(`EXCO member not found: ${id}`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await firestore.set('excoMembers', id, updated);
    return updated;
  }

  public async deleteExcoMember(id: string): Promise<void> {
    await firestore.delete('excoMembers', id);
  }

  // ==========================================
  // 9. EVENTS & MEETINGS
  // ==========================================

  public async getEvents(): Promise<ClubEvent[]> {
    const docs = await firestore.list<any>('events');
    return docs.map(e => ({
      id: e.id,
      title: e.title || '',
      summary: e.summary || e.description || '',
      description: e.description,
      eventDate: e.eventDate || e.event_date,
      location: e.location || e.venue,
      coverImage: e.coverImage || e.coverImageUrl || e.cover_image_url,
      photoAlbum: e.photoAlbum || e.photo_album || [],
      displayOrder: e.displayOrder ?? e.display_order ?? 1,
      status: (e.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      createdBy: e.createdBy || e.created_by,
      createdAt: e.createdAt || e.created_at || new Date().toISOString(),
      updatedAt: e.updatedAt || e.updated_at || new Date().toISOString()
    }));
  }

  public async createEvent(item: Partial<ClubEvent> & { createdBy?: string }): Promise<ClubEvent> {
    const id = item.id || `ev_${Date.now()}`;
    const now = new Date().toISOString();
    const newEvent: ClubEvent = {
      id,
      title: item.title || '',
      summary: item.summary || item.description || '',
      description: item.description,
      eventDate: item.eventDate,
      location: item.location,
      coverImage: item.coverImage,
      photoAlbum: item.photoAlbum || [],
      displayOrder: item.displayOrder ?? 1,
      status: item.status === 'inactive' ? 'inactive' : 'active',
      createdBy: item.createdBy,
      createdAt: now,
      updatedAt: now
    };
    await firestore.set('events', id, newEvent);
    return newEvent;
  }

  public async updateEvent(id: string, updates: Partial<ClubEvent>): Promise<ClubEvent> {
    const existing = (await this.getEvents()).find(e => e.id === id);
    if (!existing) throw new Error(`Event not found: ${id}`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await firestore.set('events', id, updated);
    return updated;
  }

  public async deleteEvent(id: string): Promise<void> {
    await firestore.delete('events', id);
  }

  public async getEventItems(): Promise<EventItem[]> {
    return firestore.list<EventItem>('eventItems');
  }

  public async createEventItem(item: Partial<EventItem>): Promise<EventItem> {
    const id = item.id || `evi_${Date.now()}`;
    const now = new Date().toISOString();
    const newItem: EventItem = {
      id,
      title: item.title || '',
      heldDate: item.heldDate || now.split('T')[0],
      startTime: item.startTime,
      endTime: item.endTime,
      venue: item.venue || '',
      summary: item.summary || '',
      description: item.description,
      eventType: item.eventType || 'community',
      status: item.status || 'upcoming',
      photoGallery: item.photoGallery || [],
      attendance: item.attendance || [],
      createdBy: item.createdBy,
      createdAt: now,
      updatedAt: now
    };
    await firestore.set('eventItems', id, newItem);
    return newItem;
  }

  public async updateEventItem(id: string, updates: Partial<EventItem>): Promise<EventItem> {
    const existing = (await this.getEventItems()).find(e => e.id === id);
    if (!existing) throw new Error(`Event item not found: ${id}`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await firestore.set('eventItems', id, updated);
    return updated;
  }

  public async deleteEventItem(id: string): Promise<void> {
    await firestore.delete('eventItems', id);
  }

  public async saveEventAttendance(id: string, attendance: any[]): Promise<EventItem> {
    return this.updateEventItem(id, { attendance });
  }

  public async getMeetingItems(): Promise<MeetingItem[]> {
    return firestore.list<MeetingItem>('meetingItems');
  }

  public async createMeetingItem(item: Partial<MeetingItem>): Promise<MeetingItem> {
    const id = item.id || `meet_${Date.now()}`;
    const now = new Date().toISOString();
    const newMeeting: MeetingItem = {
      id,
      title: item.title || '',
      meetingType: item.meetingType === 'exco' ? 'exco' : 'general_members',
      heldDate: item.heldDate || now.split('T')[0],
      startTime: item.startTime || '21:00',
      endTime: item.endTime || '22:00',
      venue: item.venue || 'ARC Meeting Hall',
      summary: item.summary || '',
      status: item.status || 'scheduled',
      attendance: item.attendance || [],
      votings: item.votings || [],
      finalizedActions: item.finalizedActions || [],
      createdBy: item.createdBy,
      createdAt: now,
      updatedAt: now
    };
    await firestore.set('meetingItems', id, newMeeting);
    return newMeeting;
  }

  public async updateMeetingItem(id: string, updates: Partial<MeetingItem>): Promise<MeetingItem> {
    const existing = (await this.getMeetingItems()).find(m => m.id === id);
    if (!existing) throw new Error(`Meeting not found: ${id}`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await firestore.set('meetingItems', id, updated);
    return updated;
  }

  public async deleteMeetingItem(id: string): Promise<void> {
    await firestore.delete('meetingItems', id);
  }

  public async saveMeetingAttendance(id: string, attendance: any[]): Promise<MeetingItem> {
    return this.updateMeetingItem(id, { attendance });
  }

  public async addMeetingVoting(id: string, voting: MeetingVotingItem): Promise<MeetingItem> {
    const meeting = (await this.getMeetingItems()).find(m => m.id === id);
    if (!meeting) throw new Error(`Meeting not found: ${id}`);
    const votings = meeting.votings || [];
    votings.push(voting);
    return this.updateMeetingItem(id, { votings });
  }

  public async updateMeetingVoting(id: string, votingId: string, votingUpdates: Partial<MeetingVotingItem>): Promise<MeetingItem> {
    const meeting = (await this.getMeetingItems()).find(m => m.id === id);
    if (!meeting) throw new Error(`Meeting not found: ${id}`);
    const votings = (meeting.votings || []).map(v => (v.id === votingId ? { ...v, ...votingUpdates } : v));
    return this.updateMeetingItem(id, { votings });
  }

  // ==========================================
  // 10. RAMAZAN QUIZ MODULE
  // ==========================================

  public async getQuizQuestions(): Promise<QuizQuestion[]> {
    const docs = await firestore.list<any>('quizQuestions');
    return docs.map(q => ({
      id: q.id,
      title: q.title || `Question ${q.questionNumber || 1}`,
      questionNumber: q.questionNumber ?? q.question_number ?? 1,
      questionText: q.questionText || q.question_text || '',
      questionImage: q.questionImage || q.questionImageUrl || q.question_image_url,
      showQuestionImage: Boolean(q.showQuestionImage ?? q.show_question_image ?? true),
      options: q.options || [],
      correctOptionId: q.correctOptionId || q.correct_option_id,
      answerExplanation: q.answerExplanation || q.answer_explanation,
      publishAt: q.publishAt || q.publish_at || new Date().toISOString(),
      closeAt: q.closeAt || q.close_at || new Date().toISOString(),
      revealAt: q.revealAt || q.reveal_at || new Date().toISOString(),
      drawStartAt: q.drawStartAt || q.draw_start_at || new Date().toISOString(),
      rollingDurationSeconds: q.rollingDurationSeconds ?? q.rolling_duration_seconds ?? 10,
      winnerDisplayDurationSeconds: q.winnerDisplayDurationSeconds ?? q.winner_display_duration_seconds ?? 30,
      prizeId: q.prizeId || q.prize_id,
      prizeTitle: q.prizeTitle || q.prize_title || 'ARC Ramazan Quiz Prize',
      prizeDescription: q.prizeDescription || q.prize_description,
      sponsorId: q.sponsorId || q.sponsor_id,
      sponsorName: q.sponsorName || q.sponsor_name,
      sponsorLogo: q.sponsorLogo || q.sponsor_logo,
      status: q.status || 'draft',
      displayOrder: q.displayOrder ?? q.display_order ?? q.questionNumber ?? 1,
      createdBy: q.createdBy || q.created_by,
      createdAt: q.createdAt || q.created_at || new Date().toISOString(),
      updatedAt: q.updatedAt || q.updated_at || new Date().toISOString(),
      totalParticipants: q.totalParticipants,
      correctCount: q.correctCount,
      eligibleCount: q.eligibleCount
    })).sort((a, b) => a.questionNumber - b.questionNumber);
  }

  public async createQuizQuestion(item: Partial<QuizQuestion> & { createdBy?: string }): Promise<QuizQuestion> {
    const id = item.id || `qq_${Date.now()}`;
    const now = new Date().toISOString();
    const newQuestion: QuizQuestion = {
      id,
      title: item.title || `Question ${item.questionNumber || 1}`,
      questionNumber: item.questionNumber || 1,
      questionText: item.questionText || '',
      questionImage: item.questionImage,
      showQuestionImage: item.showQuestionImage ?? true,
      options: item.options || [],
      correctOptionId: item.correctOptionId,
      answerExplanation: item.answerExplanation,
      publishAt: item.publishAt || now,
      closeAt: item.closeAt || now,
      revealAt: item.revealAt || now,
      drawStartAt: item.drawStartAt || now,
      rollingDurationSeconds: item.rollingDurationSeconds ?? 10,
      winnerDisplayDurationSeconds: item.winnerDisplayDurationSeconds ?? 30,
      prizeId: item.prizeId,
      prizeTitle: item.prizeTitle || 'ARC Ramazan Quiz Prize',
      prizeDescription: item.prizeDescription,
      sponsorId: item.sponsorId,
      sponsorName: item.sponsorName,
      sponsorLogo: item.sponsorLogo,
      status: item.status || 'draft',
      displayOrder: item.displayOrder ?? item.questionNumber ?? 1,
      createdBy: item.createdBy,
      createdAt: now,
      updatedAt: now
    };
    await firestore.set('quizQuestions', id, newQuestion);
    return newQuestion;
  }

  public async updateQuizQuestion(id: string, updates: Partial<QuizQuestion>): Promise<QuizQuestion> {
    const existing = (await this.getQuizQuestions()).find(q => q.id === id);
    if (!existing) throw new Error(`Quiz question not found: ${id}`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await firestore.set('quizQuestions', id, updated);
    return updated;
  }

  public async deleteQuizQuestion(id: string): Promise<void> {
    await firestore.delete('quizQuestions', id);
  }

  // ----------------------------------------------------
  // QUIZ PARTICIPANT QUEUE REGISTRY (Unique Que Numbers)
  // ----------------------------------------------------
  public async getParticipantQueues(): Promise<QuizParticipantQueue[]> {
    const docs = await firestore.list<any>('quizParticipantQueues');
    return docs.map(d => ({
      id: d.id,
      normalizedIdNumber: d.normalizedIdNumber || d.id,
      queNumber: d.queNumber || d.participantNumber || `Q-${String(d.queIndex || 1).padStart(4, '0')}`,
      queIndex: typeof d.queIndex === 'number' ? d.queIndex : 0,
      contactNumber: d.contactNumber,
      participantName: d.participantName,
      firstRegisteredAt: d.firstRegisteredAt || d.createdAt || new Date().toISOString(),
      lastSubmittedAt: d.lastSubmittedAt || d.updatedAt || new Date().toISOString()
    })).sort((a, b) => a.queIndex - b.queIndex);
  }

  public async getOrCreateParticipantQueue(
    idNumber: string,
    participantName?: string,
    contactNumber?: string
  ): Promise<{ queNumber: string; queIndex: number; isExisting: boolean }> {
    const normalizedId = String(idNumber || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!normalizedId) {
      throw new Error('Valid ID Card number is required to assign Queue Number.');
    }

    // 1. Check existing in quizParticipantQueues
    const existingQueue = await firestore.get<any>('quizParticipantQueues', normalizedId);
    if (existingQueue && existingQueue.queNumber) {
      await firestore.set('quizParticipantQueues', normalizedId, {
        ...existingQueue,
        contactNumber: contactNumber || existingQueue.contactNumber || '',
        participantName: participantName || existingQueue.participantName || '',
        lastSubmittedAt: new Date().toISOString()
      });
      return {
        queNumber: existingQueue.queNumber,
        queIndex: existingQueue.queIndex || 0,
        isExisting: true
      };
    }

    // 2. Check if already has a participant number in any existing quizSubmissions
    const allSubmissions = await firestore.list<any>('quizSubmissions');
    const priorSubmission = allSubmissions.find(s => {
      const sNorm = (s.normalizedIdNumber || s.idNumber || s.idCardNumber || '').trim().toUpperCase().replace(/\s+/g, '');
      return sNorm === normalizedId && s.participantNumber;
    });

    if (priorSubmission && priorSubmission.participantNumber) {
      const existingNum = priorSubmission.participantNumber;
      const numMatch = existingNum.match(/\d+/);
      const parsedIndex = numMatch ? parseInt(numMatch[0], 10) : 0;
      
      const newQueueDoc: QuizParticipantQueue = {
        id: normalizedId,
        normalizedIdNumber: normalizedId,
        queNumber: existingNum,
        queIndex: parsedIndex,
        contactNumber: contactNumber || priorSubmission.contactNumber || '',
        participantName: participantName || priorSubmission.participantName || '',
        firstRegisteredAt: priorSubmission.submittedAt || new Date().toISOString(),
        lastSubmittedAt: new Date().toISOString()
      };
      await firestore.set('quizParticipantQueues', normalizedId, newQueueDoc);
      return {
        queNumber: existingNum,
        queIndex: parsedIndex,
        isExisting: true
      };
    }

    // 3. Brand new participant: Calculate next sequential Queue Number (Q-0001, Q-0002, ...)
    const existingQueues = await this.getParticipantQueues();
    let maxIndex = 0;
    
    for (const q of existingQueues) {
      if (typeof q.queIndex === 'number' && q.queIndex > maxIndex) {
        maxIndex = q.queIndex;
      }
      const match = (q.queNumber || '').match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxIndex) maxIndex = num;
      }
    }

    // Also check max across existing submissions to guarantee uniqueness
    for (const s of allSubmissions) {
      const match = (s.participantNumber || '').match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxIndex) maxIndex = num;
      }
    }

    const nextIndex = maxIndex + 1;
    const queNumber = `Q-${String(nextIndex).padStart(4, '0')}`;

    const newQueueDoc: QuizParticipantQueue = {
      id: normalizedId,
      normalizedIdNumber: normalizedId,
      queNumber,
      queIndex: nextIndex,
      contactNumber: contactNumber || '',
      participantName: participantName || '',
      firstRegisteredAt: new Date().toISOString(),
      lastSubmittedAt: new Date().toISOString()
    };

    await firestore.set('quizParticipantQueues', normalizedId, newQueueDoc);

    return {
      queNumber,
      queIndex: nextIndex,
      isExisting: false
    };
  }

  public async getQuizSubmissions(questionId?: string): Promise<QuizSubmission[]> {
    const docs = await firestore.list<any>('quizSubmissions');
    const ineligibleIds = new Set(await this.getIneligibleParticipantIds());

    let submissions: QuizSubmission[] = docs.map(s => {
      const normId = (s.normalizedIdNumber || s.normalized_id_number || s.idCardNumber || s.id_card_number || s.idNumber || '').trim().toUpperCase().replace(/\s+/g, '');
      const isMasterIneligible = ineligibleIds.has(normId);
      const isDisqualified = Boolean(s.isDisqualified ?? s.is_disqualified ?? isMasterIneligible);
      const isCorrect = Boolean(s.isCorrect ?? s.is_correct);
      const isEligible = isCorrect && !isDisqualified;

      return {
        id: s.id,
        participantNumber: s.participantNumber || s.participant_number || '',
        questionId: s.questionId || s.question_id || '',
        normalizedIdNumber: normId,
        idNumber: s.idNumber || s.id_number || s.idCardNumber || s.id_card_number,
        contactNumber: s.contactNumber || s.contact_number,
        selectedOptionId: s.selectedOptionId || s.selected_option_id || '',
        submittedAt: s.submittedAt || s.submitted_at || s.createdAt || s.created_at || new Date().toISOString(),
        updatedAt: s.updatedAt || s.updated_at || s.submittedAt || s.submitted_at || new Date().toISOString(),
        isCorrect,
        isEligible,
        isDisqualified,
        isInvalid: Boolean(s.isInvalid ?? s.is_invalid),
        disqualificationReason: isMasterIneligible ? 'Marked Not Eligible in Master Participant Registry' : (s.disqualificationReason || s.disqualification_reason),
        internalNotes: s.internalNotes || s.internal_notes,
        maskedIdNumber: s.maskedIdNumber || s.masked_id_number || (normId ? normId.slice(0, 2) + '***' + normId.slice(-2) : ''),
        maskedContactNumber: s.maskedContactNumber || s.masked_contact_number || '',
        selectedOptionLabel: s.selectedOptionLabel,
        selectedOptionText: s.selectedOptionText
      };
    });

    if (questionId) {
      submissions = submissions.filter(s => s.questionId === questionId);
    }
    return submissions;
  }

  // Create Quiz Submission with deterministic ID and persistent unique Queue Number
  public async createQuizSubmission(sub: Partial<QuizSubmission>): Promise<QuizSubmission> {
    const questionId = sub.questionId || '';
    const rawId = (sub.idNumber || (sub as any).idCardNumber || sub.normalizedIdNumber || '').trim();
    const normalizedId = (sub.normalizedIdNumber || rawId).trim().toUpperCase().replace(/\s+/g, '');
    
    // Deterministic doc ID format: ${questionId}_${normalizedId}
    const docId = sub.id || `${questionId}_${normalizedId}`;

    // Atomic duplicate check
    const existing = await firestore.get('quizSubmissions', docId);
    if (existing) {
      throw new Error('މި އައިޑީ ކާޑު ނަންބަރުން މި ސުވާލަށް ކުރިން ޖަވާބު ފޮނުވާފައިވެއެވެ.');
    }

    // Retrieve or allocate persistent unique Queue Number for this ID card
    const queue = await this.getOrCreateParticipantQueue(
      normalizedId,
      (sub as any).participantName || rawId,
      sub.contactNumber
    );
    const participantNumber = queue.queNumber;

    // Check Master Ineligibility
    const ineligibles = await this.getIneligibleParticipantIds();
    const isMasterIneligible = ineligibles.includes(normalizedId);
    const isDisqualified = Boolean(sub.isDisqualified || isMasterIneligible);
    const isEligible = Boolean(sub.isCorrect && !isDisqualified);

    const now = new Date().toISOString();
    const newSubmission: QuizSubmission = {
      id: docId,
      participantNumber,
      questionId,
      normalizedIdNumber: normalizedId,
      idNumber: rawId || normalizedId,
      contactNumber: sub.contactNumber,
      selectedOptionId: sub.selectedOptionId || '',
      submittedAt: sub.submittedAt || now,
      updatedAt: sub.updatedAt || now,
      isCorrect: Boolean(sub.isCorrect),
      isEligible,
      isDisqualified,
      isInvalid: Boolean(sub.isInvalid),
      disqualificationReason: isMasterIneligible ? 'Marked Not Eligible in Master Participant Registry' : sub.disqualificationReason,
      internalNotes: sub.internalNotes,
      maskedIdNumber: sub.maskedIdNumber || (normalizedId ? normalizedId.slice(0, 2) + '***' + normalizedId.slice(-2) : ''),
      maskedContactNumber: sub.maskedContactNumber || (sub.contactNumber ? sub.contactNumber.slice(0, 3) + '****' + sub.contactNumber.slice(-2) : ''),
      selectedOptionLabel: sub.selectedOptionLabel,
      selectedOptionText: sub.selectedOptionText
    };

    await firestore.set('quizSubmissions', docId, newSubmission);
    return newSubmission;
  }

  public async disqualifyQuizSubmission(id: string, isDisqualified: boolean, reason: string): Promise<QuizSubmission> {
    const existing = await firestore.get<QuizSubmission>('quizSubmissions', id);
    if (!existing) throw new Error(`Submission not found: ${id}`);
    const updated = {
      ...existing,
      isDisqualified,
      isEligible: !isDisqualified && Boolean(existing.isCorrect),
      disqualificationReason: reason
    };
    await firestore.set('quizSubmissions', id, updated);
    return updated;
  }

  public async getIneligibleParticipantIds(): Promise<string[]> {
    const docs = await firestore.list<any>('quizIneligibleParticipants');
    return docs.filter(d => d.active !== false).map(d => (d.normalizedIdNumber || d.normalized_id_number || d.id || '').toUpperCase().trim());
  }

  public async setMasterParticipantEligibility(idNumber: string, isNotEligible: boolean, reason?: string): Promise<void> {
    const cleanId = idNumber.trim().toUpperCase().replace(/\s+/g, '');
    if (isNotEligible) {
      await firestore.set('quizIneligibleParticipants', cleanId, {
        id: cleanId,
        normalizedIdNumber: cleanId,
        active: true,
        reason: reason || 'Marked Not Eligible in Master Participant Registry',
        updatedAt: new Date().toISOString()
      });
    } else {
      await firestore.delete('quizIneligibleParticipants', cleanId);
    }

    // Cascade to all submissions of this ID across all questions
    const allSubmissions = await firestore.list<any>('quizSubmissions');
    const userSubmissions = allSubmissions.filter(s => {
      const sNorm = (s.normalizedIdNumber || s.idNumber || s.idCardNumber || '').trim().toUpperCase().replace(/\s+/g, '');
      return sNorm === cleanId;
    });

    for (const sub of userSubmissions) {
      const updated = {
        ...sub,
        isDisqualified: isNotEligible,
        isEligible: isNotEligible ? false : Boolean(sub.isCorrect),
        disqualificationReason: isNotEligible ? (reason || 'Marked Not Eligible in Master Participant Registry') : ''
      };
      await firestore.set('quizSubmissions', sub.id, updated);
    }
  }

  public async getQuizWinners(): Promise<QuizWinner[]> {
    const docs = await firestore.list<any>('quizWinners');
    return docs.map(w => ({
      id: w.id,
      questionId: w.questionId || w.question_id || '',
      submissionId: w.submissionId || w.submission_id || '',
      participantNumber: w.participantNumber || w.participant_number || '',
      fullName: w.fullName || w.participantName || '',
      idNumber: w.idNumber || w.idCardNumber || '',
      contactNumber: w.contactNumber || w.contact_number || '',
      maskedIdNumber: w.maskedIdNumber || w.masked_id_number || '',
      maskedContactNumber: w.maskedContactNumber || w.masked_contact_number || '',
      prizeTitle: w.prizeTitle || 'Ramzan Quiz Prize',
      prizeDescription: w.prizeDescription,
      sponsorName: w.sponsorName,
      sponsorLogo: w.sponsorLogo,
      eligibleCount: w.eligibleCount ?? w.eligible_count ?? 0,
      selectedAt: w.selectedAt || w.selected_at || new Date().toISOString(),
      selectedBy: w.selectedBy || w.selected_by || 'system',
      selectionMethod: (w.selectionMethod === 'manual_reselect' ? 'manual_reselect' : 'random'),
      auditReference: w.auditReference || w.audit_reference || `AUD-${Date.now()}`,
      contactedStatus: (w.contactedStatus === 'contacted' ? 'contacted' : (w.contactedStatus === 'unreachable' ? 'unreachable' : 'not_contacted')),
      prizeCollectionStatus: (w.prizeCollectionStatus === 'collected' ? 'collected' : (w.prizeCollectionStatus === 'forfeited' ? 'forfeited' : 'pending')),
      prizeCollectionDate: w.prizeCollectionDate,
      paymentSlipUrl: w.paymentSlipUrl,
      publicStatus: (w.publicStatus === 'hidden' ? 'hidden' : 'published'),
      internalNotes: w.internalNotes || w.internal_notes,
      isReplaced: Boolean(w.isReplaced ?? w.is_replaced),
      replacementReason: w.replacementReason || w.replacement_reason
    }));
  }

  public async createQuizWinner(winner: Partial<QuizWinner>): Promise<QuizWinner> {
    const id = winner.id || `win_${winner.questionId || Date.now()}`;
    const newWinner: QuizWinner = {
      id,
      questionId: winner.questionId || '',
      submissionId: winner.submissionId || '',
      participantNumber: winner.participantNumber || '',
      fullName: winner.fullName || '',
      idNumber: winner.idNumber || '',
      contactNumber: winner.contactNumber || '',
      maskedIdNumber: winner.maskedIdNumber || '',
      maskedContactNumber: winner.maskedContactNumber || '',
      prizeTitle: winner.prizeTitle || 'Ramzan Quiz Prize',
      prizeDescription: winner.prizeDescription,
      sponsorName: winner.sponsorName,
      sponsorLogo: winner.sponsorLogo,
      eligibleCount: winner.eligibleCount || 0,
      selectedAt: winner.selectedAt || new Date().toISOString(),
      selectedBy: winner.selectedBy || 'system',
      selectionMethod: winner.selectionMethod || 'random',
      auditReference: winner.auditReference || `AUD-${Date.now()}`,
      contactedStatus: winner.contactedStatus || 'not_contacted',
      prizeCollectionStatus: winner.prizeCollectionStatus || 'pending',
      publicStatus: winner.publicStatus || 'published',
      internalNotes: winner.internalNotes,
      isReplaced: false
    };
    await firestore.set('quizWinners', id, newWinner);
    return newWinner;
  }

  public async updateQuizWinner(id: string, updates: Partial<QuizWinner>): Promise<QuizWinner> {
    const existing = (await this.getQuizWinners()).find(w => w.id === id);
    if (!existing) throw new Error(`Winner not found: ${id}`);
    const updated = { ...existing, ...updates };
    await firestore.set('quizWinners', id, updated);
    return updated;
  }

  public async reselectQuizWinner(id: string, reason: string): Promise<{ previousWinner: QuizWinner; newWinner?: QuizWinner }> {
    const prev = (await this.getQuizWinners()).find(w => w.id === id);
    if (!prev) throw new Error(`Winner record not found: ${id}`);

    // Mark previous as replaced
    await firestore.set('quizWinners', id, { ...prev, isReplaced: true, replacementReason: reason });

    // Save to winner history
    await firestore.set('quizWinnerHistory', `hist_${id}_${Date.now()}`, {
      ...prev,
      replacedAt: new Date().toISOString(),
      replacementReason: reason
    });

    // Reselect from eligible submissions
    const eligible = (await this.getQuizSubmissions(prev.questionId)).filter(s => s.isEligible && s.isCorrect && !s.isDisqualified && s.id !== prev.submissionId);

    let newWinner: QuizWinner | undefined = undefined;
    if (eligible.length > 0) {
      const selected = eligible[Math.floor(Math.random() * eligible.length)];
      newWinner = await this.createQuizWinner({
        questionId: prev.questionId,
        submissionId: selected.id,
        participantNumber: selected.participantNumber,
        fullName: selected.idNumber,
        idNumber: selected.idNumber,
        contactNumber: selected.contactNumber,
        maskedIdNumber: selected.maskedIdNumber,
        maskedContactNumber: selected.maskedContactNumber,
        prizeTitle: prev.prizeTitle,
        prizeDescription: prev.prizeDescription,
        sponsorName: prev.sponsorName,
        sponsorLogo: prev.sponsorLogo,
        eligibleCount: eligible.length,
        selectedBy: 'admin_reselection',
        selectionMethod: 'manual_reselect',
        internalNotes: `Reselected winner replacing ${prev.fullName || prev.participantNumber}. Reason: ${reason}`
      });
    }

    return { previousWinner: prev, newWinner };
  }

  public async getQuizPrizes(): Promise<QuizPrize[]> {
    const docs = await firestore.list<any>('quizPrizes');
    return docs.map(p => ({
      id: p.id,
      title: p.title || '',
      description: p.description,
      sponsorName: p.sponsorName,
      sponsorLogo: p.sponsorLogo,
      valueAmount: p.valueAmount || (p.value ? String(p.value) : undefined),
      image: p.image || p.imageUrl,
      status: p.status || 'active',
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString()
    }));
  }

  public async createPrize(item: Partial<QuizPrize>): Promise<QuizPrize> {
    const id = item.id || `prz_${Date.now()}`;
    const now = new Date().toISOString();
    const newPrize: QuizPrize = {
      id,
      title: item.title || '',
      description: item.description,
      sponsorName: item.sponsorName,
      sponsorLogo: item.sponsorLogo,
      valueAmount: item.valueAmount,
      image: item.image,
      status: item.status || 'active',
      createdAt: now,
      updatedAt: now
    };
    await firestore.set('quizPrizes', id, newPrize);
    return newPrize;
  }

  public async updatePrize(id: string, updates: Partial<QuizPrize>): Promise<QuizPrize> {
    const existing = (await this.getQuizPrizes()).find(p => p.id === id);
    if (!existing) throw new Error(`Prize not found: ${id}`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await firestore.set('quizPrizes', id, updated);
    return updated;
  }

  public async deletePrize(id: string): Promise<void> {
    await firestore.delete('quizPrizes', id);
  }

  public async getQuizSponsors(): Promise<QuizSponsor[]> {
    const docs = await firestore.list<any>('quizSponsors');
    return docs.map(s => ({
      id: s.id,
      name: s.name || '',
      logo: s.logo || s.logoUrl,
      adText: s.adText,
      specialProductImage: s.specialProductImage,
      websiteUrl: s.websiteUrl || s.website,
      status: s.status || 'active',
      displayOrder: Number(s.displayOrder ?? 0),
      createdAt: s.createdAt || new Date().toISOString(),
      updatedAt: s.updatedAt || new Date().toISOString()
    }));
  }

  public async createSponsor(item: Partial<QuizSponsor>): Promise<QuizSponsor> {
    const id = item.id || `spon_${Date.now()}`;
    const now = new Date().toISOString();
    const newSponsor: QuizSponsor = {
      id,
      name: item.name || '',
      logo: item.logo,
      adText: item.adText,
      specialProductImage: item.specialProductImage,
      websiteUrl: item.websiteUrl,
      status: item.status || 'active',
      displayOrder: Number(item.displayOrder ?? 0),
      createdAt: now,
      updatedAt: now
    };
    await firestore.set('quizSponsors', id, newSponsor);
    return newSponsor;
  }

  public async updateSponsor(id: string, updates: Partial<QuizSponsor>): Promise<QuizSponsor> {
    const existing = (await this.getQuizSponsors()).find(s => s.id === id);
    if (!existing) throw new Error(`Sponsor not found: ${id}`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await firestore.set('quizSponsors', id, updated);
    return updated;
  }

  public async deleteSponsor(id: string): Promise<void> {
    await firestore.delete('quizSponsors', id);
  }

  // ==========================================
  // 11. MESSAGES / INBOX
  // ==========================================

  public async getMessages(): Promise<InboxMessage[]> {
    const docs = await firestore.list<any>('messages');
    return docs.map(m => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.senderName || m.sender_name || '',
      senderRole: m.senderRole,
      contactInfo: m.contactInfo || m.contact_info || '',
      recipientType: m.recipientType,
      recipientId: m.recipientId,
      recipientName: m.recipientName,
      subject: m.subject || '',
      body: m.body || m.message || '',
      category: m.category || 'general',
      priority: m.priority || 'normal',
      status: m.status || 'pending',
      readBy: m.readBy || m.read_by || [],
      archivedBy: m.archivedBy,
      replyToId: m.replyToId,
      actions: m.actions || [],
      createdAt: m.createdAt || m.created_at || new Date().toISOString(),
      updatedAt: m.updatedAt || m.updated_at || new Date().toISOString()
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async createMessage(msg: Partial<InboxMessage>): Promise<InboxMessage> {
    const id = msg.id || `msg_${Date.now()}`;
    const now = new Date().toISOString();
    const newMsg: InboxMessage = {
      id,
      senderName: msg.senderName || '',
      contactInfo: msg.contactInfo || '',
      subject: msg.subject || 'Public Message',
      body: msg.body || (msg as any).message || '',
      category: msg.category || 'general',
      priority: msg.priority || 'normal',
      status: msg.status || 'pending',
      readBy: [],
      actions: [],
      createdAt: now,
      updatedAt: now
    };
    await firestore.set('messages', id, newMsg);
    return newMsg;
  }

  public async updateMessage(id: string, updates: Partial<InboxMessage>): Promise<InboxMessage> {
    const existing = (await this.getMessages()).find(m => m.id === id);
    if (!existing) throw new Error(`Message not found: ${id}`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await firestore.set('messages', id, updated);
    return updated;
  }

  public async deleteMessage(id: string): Promise<void> {
    await firestore.delete('messages', id);
  }

  public async recordMessageAction(id: string, actionData: any): Promise<InboxMessage> {
    const msg = (await this.getMessages()).find(m => m.id === id);
    if (!msg) throw new Error(`Message not found: ${id}`);
    const actions = msg.actions || [];
    actions.push(actionData);
    return this.updateMessage(id, { actions });
  }

  // ==========================================
  // 12. NOTIFICATIONS
  // ==========================================

  public async getNotifications(): Promise<AppNotification[]> {
    const docs = await firestore.list<any>('notifications');
    return docs.map(n => ({
      id: n.id,
      recipientId: n.recipientId || 'all',
      title: n.title || '',
      message: n.message || '',
      type: n.type || 'info',
      link: n.link,
      readBy: n.readBy || n.read_by || [],
      createdAt: n.createdAt || n.created_at || new Date().toISOString()
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async createNotification(notifData: Partial<AppNotification>): Promise<AppNotification> {
    const id = notifData.id || `notif_${Date.now()}`;
    const newNotif: AppNotification = {
      id,
      recipientId: notifData.recipientId || 'all',
      title: notifData.title || '',
      message: notifData.message || '',
      type: notifData.type || 'info',
      link: notifData.link,
      readBy: [],
      createdAt: new Date().toISOString()
    };
    await firestore.set('notifications', id, newNotif);
    return newNotif;
  }

  public async markNotificationRead(id: string, userId: string): Promise<void> {
    const notif = (await this.getNotifications()).find(n => n.id === id);
    if (notif && !notif.readBy.includes(userId)) {
      notif.readBy.push(userId);
      await firestore.set('notifications', id, notif);
    }
  }

  public async markAllNotificationsRead(userId: string): Promise<void> {
    const all = await this.getNotifications();
    for (const n of all) {
      if (!n.readBy.includes(userId)) {
        n.readBy.push(userId);
        await firestore.set('notifications', n.id, n);
      }
    }
  }

  // ==========================================
  // 13. AUDIT LOGS
  // ==========================================

  public async getAuditLogs(): Promise<AuditLog[]> {
    const docs = await firestore.list<any>('auditLogs');
    return docs.map(a => ({
      id: a.id,
      userId: a.userId || a.user_id || 'system',
      username: a.username || 'system',
      fullName: a.fullName || a.full_name || 'System',
      action: a.action || '',
      module: (a.module || 'system') as any,
      recordId: a.recordId || a.record_id,
      previousValue: a.previousValue || a.previous_value,
      newValue: a.newValue || a.new_value,
      reason: a.reason,
      deviceReference: a.deviceReference || a.device_reference || a.ipAddress,
      createdAt: a.createdAt || a.created_at || a.timestamp || new Date().toISOString()
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 500);
  }

  public async logAudit(log: Partial<AuditLog> & { ipAddress?: string; userAgent?: string }): Promise<void> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newLog: AuditLog = {
      id,
      userId: log.userId || 'system',
      username: log.username || 'system',
      fullName: log.fullName || 'System',
      action: log.action || 'activity',
      module: (log.module || 'system') as any,
      recordId: log.recordId,
      previousValue: log.previousValue,
      newValue: log.newValue,
      reason: log.reason,
      deviceReference: log.deviceReference || log.ipAddress,
      createdAt: log.createdAt || new Date().toISOString()
    };
    await firestore.set('auditLogs', id, newLog);
  }

  public async createAuditLog(data: {
    userId?: string;
    username?: string;
    fullName?: string;
    action: string;
    module: any;
    recordId?: string;
    targetId?: string;
    details?: string;
    previousValue?: any;
    newValue?: any;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    return this.logAudit({
      ...data,
      recordId: data.recordId || data.targetId,
      reason: data.reason || data.details
    });
  }

  // ==========================================
  // 14. CLUB RULES
  // ==========================================

  public async getClubRules(): Promise<ClubRulesData> {
    const rules = await firestore.get<any>('clubRules', 'rules_primary');
    if (!rules) return defaultClubRules;
    return {
      titleDhivehi: rules.titleDhivehi || rules.title_dhivehi || defaultClubRules.titleDhivehi,
      titleEnglish: rules.titleEnglish || rules.title_english || defaultClubRules.titleEnglish,
      descriptionDhivehi: rules.descriptionDhivehi || rules.description_dhivehi || defaultClubRules.descriptionDhivehi,
      descriptionEnglish: rules.descriptionEnglish || rules.description_english || defaultClubRules.descriptionEnglish,
      version: rules.version || defaultClubRules.version,
      effectiveDate: rules.effectiveDate || rules.effective_date || defaultClubRules.effectiveDate,
      updatedAt: rules.updatedAt || rules.updated_at || new Date().toISOString(),
      chapters: rules.chapters || rules.data?.chapters || defaultClubRules.chapters
    };
  }

  public async updateClubRules(rulesData: ClubRulesData, updatedBy: string): Promise<ClubRulesData> {
    const now = new Date().toISOString();
    const updated = {
      ...rulesData,
      id: 'rules_primary',
      updatedAt: now,
      updatedBy
    };
    await firestore.set('clubRules', 'rules_primary', updated);
    return updated;
  }

  // ==========================================
  // 15. BANK ACCOUNTS & FINANCE
  // ==========================================

  public async getBankAccounts(): Promise<BankAccount[]> {
    const docs = await firestore.list<any>('bankAccounts');
    return docs.map(b => ({
      id: b.id,
      bankName: b.bankName || b.bank_name || '',
      accountName: b.accountName || b.account_name || '',
      accountNumber: b.accountNumber || b.account_number || '',
      type: b.type || 'bank',
      currency: b.currency || 'MVR',
      openingBalance: Number(b.openingBalance ?? b.opening_balance ?? 0),
      currentBalance: Number(b.currentBalance ?? b.current_balance ?? b.balance ?? 0),
      status: b.status || 'active',
      notes: b.notes,
      createdAt: b.createdAt || b.created_at || new Date().toISOString(),
      updatedAt: b.updatedAt || b.updated_at || new Date().toISOString()
    }));
  }

  public async getBankAccountById(id: string): Promise<BankAccount | null> {
    const b = await firestore.get<any>('bankAccounts', id);
    if (!b) return null;
    return {
      id: b.id,
      bankName: b.bankName || b.bank_name || '',
      accountName: b.accountName || b.account_name || '',
      accountNumber: b.accountNumber || b.account_number || '',
      type: b.type || 'bank',
      currency: b.currency || 'MVR',
      openingBalance: Number(b.openingBalance ?? b.opening_balance ?? 0),
      currentBalance: Number(b.currentBalance ?? b.current_balance ?? b.balance ?? 0),
      status: b.status || 'active',
      notes: b.notes,
      createdAt: b.createdAt || b.created_at || new Date().toISOString(),
      updatedAt: b.updatedAt || b.updated_at || new Date().toISOString()
    };
  }

  public async createBankAccount(data: Partial<BankAccount>): Promise<BankAccount> {
    const id = data.id || `acc_${Date.now()}`;
    const now = new Date().toISOString();
    const newAcc: BankAccount = {
      id,
      bankName: data.bankName || '',
      accountName: data.accountName || '',
      accountNumber: data.accountNumber || '',
      type: data.type || 'bank',
      currency: data.currency || 'MVR',
      openingBalance: Number(data.openingBalance ?? 0),
      currentBalance: Number(data.currentBalance ?? data.openingBalance ?? 0),
      status: data.status || 'active',
      notes: data.notes,
      createdAt: now,
      updatedAt: now
    };
    await firestore.set('bankAccounts', id, newAcc);
    return newAcc;
  }

  public async updateBankAccount(id: string, updates: Partial<BankAccount>): Promise<BankAccount> {
    const existing = await this.getBankAccountById(id);
    if (!existing) throw new Error(`Bank account not found: ${id}`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await firestore.set('bankAccounts', id, updated);
    return updated;
  }

  public async deleteBankAccount(id: string): Promise<void> {
    await firestore.delete('bankAccounts', id);
  }

  public async transferAccountFunds(data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    transferDate?: string;
    referenceNumber?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<AccountTransferRecord> {
    const fromAcc = await this.getBankAccountById(data.fromAccountId);
    const toAcc = await this.getBankAccountById(data.toAccountId);

    if (!fromAcc) throw new Error(`Source account not found: ${data.fromAccountId}`);
    if (!toAcc) throw new Error(`Destination account not found: ${data.toAccountId}`);
    if (fromAcc.currentBalance < data.amount) throw new Error(`Insufficient balance in ${fromAcc.bankName} (${fromAcc.currentBalance} MVR available).`);

    // Deduct & Add
    await this.updateBankAccount(fromAcc.id, { currentBalance: fromAcc.currentBalance - data.amount });
    await this.updateBankAccount(toAcc.id, { currentBalance: toAcc.currentBalance + data.amount });

    const transferId = `trf_${Date.now()}`;
    const record: AccountTransferRecord = {
      id: transferId,
      fromAccountId: data.fromAccountId,
      fromAccountName: fromAcc.accountName,
      toAccountId: data.toAccountId,
      toAccountName: toAcc.accountName,
      amount: data.amount,
      date: data.transferDate || new Date().toISOString().split('T')[0],
      referenceNumber: data.referenceNumber,
      notes: data.notes,
      createdBy: data.createdBy,
      createdAt: new Date().toISOString()
    };
    await firestore.set('accountTransfers', transferId, record);
    return record;
  }

  public async getAccountTransfers(): Promise<AccountTransferRecord[]> {
    return firestore.list<AccountTransferRecord>('accountTransfers');
  }

  // ==========================================
  // 16. INCOME & EXPENSE
  // ==========================================

  public async getIncomeRecords(params?: { category?: string; accountId?: string; startDate?: string; endDate?: string }): Promise<IncomeRecord[]> {
    let docs = await firestore.list<any>('incomeRecords');
    let records: IncomeRecord[] = docs.map(i => ({
      id: i.id,
      title: i.title || i.description || 'Income',
      category: i.category || 'other',
      amount: Number(i.amount ?? 0),
      date: i.date || new Date().toISOString().split('T')[0],
      accountId: i.accountId || i.account_id || '',
      accountName: i.accountName,
      paymentMethod: i.paymentMethod || 'bank_transfer',
      referenceNumber: i.referenceNumber || i.reference_number,
      receivedFrom: i.receivedFrom || i.received_from || 'Member',
      payerMemberId: i.payerMemberId || i.memberId,
      status: i.status || 'received',
      notes: i.notes || i.description,
      attachments: i.attachments || (i.receiptUrl ? [i.receiptUrl] : []),
      contributionRecordId: i.contributionRecordId || i.memberDueId,
      createdBy: i.createdBy || i.created_by,
      createdAt: i.createdAt || i.created_at || new Date().toISOString(),
      updatedAt: i.updatedAt || i.updated_at || new Date().toISOString()
    }));

    if (params?.category) records = records.filter(r => r.category === params.category);
    if (params?.accountId) records = records.filter(r => r.accountId === params.accountId);
    if (params?.startDate) records = records.filter(r => r.date >= params.startDate!);
    if (params?.endDate) records = records.filter(r => r.date <= params.endDate!);

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public async createIncomeRecord(data: Partial<IncomeRecord>): Promise<IncomeRecord> {
    const id = data.id || `inc_${Date.now()}`;
    const now = new Date().toISOString();
    const newInc: IncomeRecord = {
      id,
      title: data.title || 'Income Record',
      category: data.category || 'other',
      amount: Number(data.amount ?? 0),
      date: data.date || now.split('T')[0],
      accountId: data.accountId || '',
      accountName: data.accountName,
      paymentMethod: data.paymentMethod || 'bank_transfer',
      referenceNumber: data.referenceNumber,
      receivedFrom: data.receivedFrom || 'Direct Payment',
      payerMemberId: data.payerMemberId,
      status: data.status || 'received',
      notes: data.notes,
      attachments: data.attachments || [],
      contributionRecordId: data.contributionRecordId,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now
    };
    await firestore.set('incomeRecords', id, newInc);

    // Update bank account balance if accountId specified
    if (newInc.accountId) {
      const acc = await this.getBankAccountById(newInc.accountId);
      if (acc) {
        await this.updateBankAccount(acc.id, { currentBalance: acc.currentBalance + newInc.amount });
      }
    }

    return newInc;
  }

  public async updateIncomeRecord(id: string, updates: Partial<IncomeRecord>): Promise<IncomeRecord> {
    const existing = (await this.getIncomeRecords()).find(i => i.id === id);
    if (!existing) throw new Error(`Income record not found: ${id}`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await firestore.set('incomeRecords', id, updated);
    return updated;
  }

  public async deleteIncomeRecord(id: string): Promise<void> {
    const existing = (await this.getIncomeRecords()).find(i => i.id === id);
    if (existing && existing.accountId) {
      const acc = await this.getBankAccountById(existing.accountId);
      if (acc) {
        await this.updateBankAccount(acc.id, { currentBalance: Math.max(0, acc.currentBalance - existing.amount) });
      }
    }
    await firestore.delete('incomeRecords', id);
  }

  public async getExpenseRecords(params?: { category?: string; accountId?: string; status?: string; startDate?: string; endDate?: string }): Promise<ExpenseRecord[]> {
    let docs = await firestore.list<any>('expenseRecords');
    let records: ExpenseRecord[] = docs.map(e => ({
      id: e.id,
      title: e.title || e.description || 'Expense',
      category: e.category || 'other',
      amount: Number(e.amount ?? 0),
      date: e.date || new Date().toISOString().split('T')[0],
      accountId: e.accountId || e.account_id || '',
      accountName: e.accountName,
      paymentMethod: e.paymentMethod || 'bank_transfer',
      referenceNumber: e.referenceNumber || e.reference_number,
      payee: e.payee || 'Vendor',
      approvedBy: e.approvedBy || e.approved_by,
      status: e.status || 'paid',
      receiptNumber: e.receiptNumber || e.receipt_number,
      notes: e.notes || e.description,
      attachments: e.attachments || (e.invoiceUrl ? [e.invoiceUrl] : []),
      createdBy: e.createdBy || e.created_by,
      createdAt: e.createdAt || e.created_at || new Date().toISOString(),
      updatedAt: e.updatedAt || e.updated_at || new Date().toISOString()
    }));

    if (params?.category) records = records.filter(r => r.category === params.category);
    if (params?.accountId) records = records.filter(r => r.accountId === params.accountId);
    if (params?.status) records = records.filter(r => r.status === params.status);
    if (params?.startDate) records = records.filter(r => r.date >= params.startDate!);
    if (params?.endDate) records = records.filter(r => r.date <= params.endDate!);

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public async createExpenseRecord(data: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    const id = data.id || `exp_${Date.now()}`;
    const now = new Date().toISOString();
    const newExp: ExpenseRecord = {
      id,
      title: data.title || 'Expense Record',
      category: data.category || 'other',
      amount: Number(data.amount ?? 0),
      date: data.date || now.split('T')[0],
      accountId: data.accountId || '',
      accountName: data.accountName,
      paymentMethod: data.paymentMethod || 'bank_transfer',
      referenceNumber: data.referenceNumber,
      payee: data.payee || 'Direct Vendor',
      approvedBy: data.approvedBy,
      status: data.status || 'paid',
      receiptNumber: data.receiptNumber,
      notes: data.notes,
      attachments: data.attachments || [],
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now
    };
    await firestore.set('expenseRecords', id, newExp);

    // Deduct from bank account balance if accountId specified
    if (newExp.accountId) {
      const acc = await this.getBankAccountById(newExp.accountId);
      if (acc) {
        await this.updateBankAccount(acc.id, { currentBalance: acc.currentBalance - newExp.amount });
      }
    }

    return newExp;
  }

  public async updateExpenseRecord(id: string, updates: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    const existing = (await this.getExpenseRecords()).find(e => e.id === id);
    if (!existing) throw new Error(`Expense record not found: ${id}`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await firestore.set('expenseRecords', id, updated);
    return updated;
  }

  public async deleteExpenseRecord(id: string): Promise<void> {
    const existing = (await this.getExpenseRecords()).find(e => e.id === id);
    if (existing && existing.accountId) {
      const acc = await this.getBankAccountById(existing.accountId);
      if (acc) {
        await this.updateBankAccount(acc.id, { currentBalance: acc.currentBalance + existing.amount });
      }
    }
    await firestore.delete('expenseRecords', id);
  }

  // ==========================================
  // 17. MEMBER DUES & CONTRIBUTION SETTINGS
  // ==========================================

  public async getContributionSettings(): Promise<MemberContributionSetting> {
    const doc = await firestore.get<any>('contributionSettings', 'cfg_dues_default');
    return {
      monthlyFee: Number(doc?.monthlyFee ?? doc?.monthlyDueAmount ?? doc?.monthly_due_amount ?? 50.00),
      dueDayOfMonth: Number(doc?.dueDayOfMonth ?? doc?.due_day_of_month ?? 10),
      finePerDay: Number(doc?.finePerDay ?? doc?.fine_per_day ?? 2.00),
      annualAdvanceDiscountMonths: Number(doc?.annualAdvanceDiscountMonths ?? 1),
      currency: doc?.currency || 'MVR',
      defaultDepositAccountId: doc?.defaultDepositAccountId || doc?.bankAccountId || 'acc_bml_main',
      enableAutoFines: Boolean(doc?.enableAutoFines ?? true),
      gracePeriodDays: Number(doc?.gracePeriodDays ?? doc?.fineGraceDays ?? 5),
      updatedAt: doc?.updatedAt || doc?.updated_at || new Date().toISOString()
    };
  }

  public async updateContributionSettings(updates: Partial<MemberContributionSetting>): Promise<MemberContributionSetting> {
    const existing = await this.getContributionSettings();
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await firestore.set('contributionSettings', 'cfg_dues_default', updated);
    return updated;
  }

  public async getMemberContributions(params?: { year?: number; month?: number; memberId?: string; status?: string }): Promise<MemberContributionRecord[]> {
    let docs = await firestore.list<any>('memberDues');
    let records: MemberContributionRecord[] = docs.map(d => ({
      id: d.id,
      memberId: d.memberId || d.member_id || '',
      memberName: d.memberName || 'Club Member',
      memberNumber: d.memberNumber || 'ARC-001',
      year: Number(d.year ?? new Date().getFullYear()),
      month: Number(d.month ?? (new Date().getMonth() + 1)),
      baseAmount: Number(d.baseAmount ?? d.dueAmount ?? 50),
      discountAmount: Number(d.discountAmount ?? 0),
      fineDays: Number(d.fineDays ?? 0),
      finePerDay: Number(d.finePerDay ?? 2),
      fineAmount: Number(d.fineAmount ?? 0),
      totalPayable: Number(d.totalPayable ?? d.dueAmount ?? 50),
      paidAmount: Number(d.paidAmount ?? 0),
      dueDate: d.dueDate || `${d.year || 2026}-${String(d.month || 1).padStart(2, '0')}-10`,
      paidDate: d.paidDate || d.paidAt,
      status: (d.status || 'pending') as ContributionStatus,
      paymentMethod: d.paymentMethod || 'bank_transfer',
      referenceNumber: d.referenceNumber || d.receiptNumber,
      accountId: d.accountId || d.bankAccountId,
      accountName: d.accountName,
      isAdvancePayment: Boolean(d.isAdvancePayment),
      advancePackageMonths: d.advancePackageMonths,
      incomeRecordId: d.incomeRecordId,
      receiptNumber: d.receiptNumber,
      notes: d.notes,
      recordedBy: d.recordedBy,
      createdAt: d.createdAt || d.created_at || new Date().toISOString(),
      updatedAt: d.updatedAt || d.updated_at || new Date().toISOString()
    }));

    if (params?.year) records = records.filter(r => r.year === params.year);
    if (params?.month) records = records.filter(r => r.month === params.month);
    if (params?.memberId) records = records.filter(r => r.memberId === params.memberId);
    if (params?.status) records = records.filter(r => r.status === params.status);

    return records;
  }

  public async ensureMonthlyContributionsGenerated(year: number): Promise<void> {
    const members = await this.getMembers();
    const activeMembers = members.filter(m => m.status === 'active');
    const settings = await this.getContributionSettings();
    const existing = await this.getMemberContributions({ year });

    const existingMap = new Set(existing.map(e => `${e.memberId}_${e.year}_${e.month}`));
    const now = new Date().toISOString();

    for (const mem of activeMembers) {
      for (let m = 1; m <= 12; m++) {
        const key = `${mem.id}_${year}_${m}`;
        if (!existingMap.has(key)) {
          const docId = `due_${mem.id}_${year}_${m}`;
          const newDue: MemberContributionRecord = {
            id: docId,
            memberId: mem.id,
            memberName: mem.fullName,
            memberNumber: mem.memberNumber,
            year,
            month: m,
            baseAmount: settings.monthlyFee,
            discountAmount: 0,
            fineDays: 0,
            finePerDay: settings.finePerDay,
            fineAmount: 0,
            totalPayable: settings.monthlyFee,
            paidAmount: 0,
            dueDate: `${year}-${String(m).padStart(2, '0')}-${String(settings.dueDayOfMonth).padStart(2, '0')}`,
            status: 'pending',
            accountId: settings.defaultDepositAccountId,
            createdAt: now,
            updatedAt: now
          };
          await firestore.set('memberDues', docId, newDue);
        }
      }
    }
  }

  public async processContributionPayment(data: {
    dueId: string;
    amountPaid: number;
    receiptNumber?: string;
    bankAccountId?: string;
    transactionId?: string;
    notes?: string;
    recordedBy?: string;
  }): Promise<MemberContributionRecord> {
    const due = (await this.getMemberContributions()).find(d => d.id === data.dueId);
    if (!due) throw new Error(`Due record not found: ${data.dueId}`);

    const now = new Date().toISOString();
    const newPaidAmount = due.paidAmount + data.amountPaid;
    const totalPayable = due.totalPayable;
    const newStatus: ContributionStatus = newPaidAmount >= totalPayable ? 'paid' : 'pending';

    const updated: MemberContributionRecord = {
      ...due,
      paidAmount: newPaidAmount,
      status: newStatus,
      paidDate: now,
      receiptNumber: data.receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
      accountId: data.bankAccountId || due.accountId,
      notes: data.notes,
      recordedBy: data.recordedBy,
      updatedAt: now
    };

    await firestore.set('memberDues', data.dueId, updated);

    // Auto-create income record for the payment
    await this.createIncomeRecord({
      title: `Member Contribution: ${due.memberName} (${due.year}/${due.month})`,
      category: 'member_contribution',
      amount: data.amountPaid,
      date: now.split('T')[0],
      accountId: updated.accountId,
      receivedFrom: due.memberName,
      payerMemberId: due.memberId,
      referenceNumber: updated.receiptNumber,
      contributionRecordId: due.id,
      createdBy: data.recordedBy
    });

    return updated;
  }

  // ==========================================
  // 18. BUDGET & STATISTICS
  // ==========================================

  public async getBudgetStats(year?: number): Promise<BudgetStats> {
    const targetYear = year || new Date().getFullYear();
    const incomes = await this.getIncomeRecords();
    const expenses = await this.getExpenseRecords();
    const accounts = await this.getBankAccounts();
    const dues = await this.getMemberContributions({ year: targetYear });

    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalAccountsBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

    const totalContributionsCollected = dues.reduce((sum, d) => sum + d.paidAmount, 0);
    const pendingDues = dues.filter(d => d.status === 'pending');
    const overdueDues = dues.filter(d => d.status === 'overdue');

    const pendingContributionsCount = pendingDues.length;
    const pendingContributionsAmount = pendingDues.reduce((sum, d) => sum + Math.max(0, d.totalPayable - d.paidAmount), 0);
    const overdueContributionsCount = overdueDues.length;
    const overdueContributionsAmount = overdueDues.reduce((sum, d) => sum + Math.max(0, d.totalPayable - d.paidAmount), 0);
    const totalFinesCollected = dues.reduce((sum, d) => sum + d.fineAmount, 0);

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      totalAccountsBalance,
      totalContributionsCollected,
      pendingContributionsCount,
      pendingContributionsAmount,
      overdueContributionsCount,
      overdueContributionsAmount,
      totalFinesCollected,
      monthlyFlow: [
        { month: 'Jan', income: 0, expense: 0, net: 0 },
        { month: 'Feb', income: totalIncome, expense: totalExpenses, net: totalIncome - totalExpenses }
      ],
      categoryIncome: [
        { category: 'member_contribution', categoryLabel: 'Member Contributions', amount: totalContributionsCollected, percentage: 100 }
      ],
      categoryExpense: [
        { category: 'office_admin', categoryLabel: 'Office & Admin', amount: totalExpenses, percentage: 100 }
      ],
      recentTransactions: incomes.slice(0, 5).map(i => ({
        id: i.id,
        type: 'income' as const,
        title: i.title,
        amount: i.amount,
        date: i.date,
        category: i.category,
        accountName: i.accountName || 'Main Account',
        status: i.status
      }))
    };
  }

  public async getBudgetAllocations(year?: number): Promise<CategoryBudgetAllocation[]> {
    const targetYear = year || new Date().getFullYear();
    const docs = await firestore.list<any>('budgetAllocations');
    return docs
      .map(b => ({
        id: b.id,
        year: Number(b.year ?? targetYear),
        category: b.category || 'other',
        categoryLabel: b.categoryLabel || b.category || 'General',
        allocatedAmount: Number(b.allocatedAmount ?? b.allocated_amount ?? 0),
        spentAmount: Number(b.spentAmount ?? b.spent_amount ?? 0),
        notes: b.notes,
        updatedAt: b.updatedAt || b.updated_at || new Date().toISOString()
      }))
      .filter(b => b.year === targetYear);
  }

  public async saveBudgetAllocation(data: Partial<CategoryBudgetAllocation>): Promise<CategoryBudgetAllocation> {
    const id = data.id || `alloc_${data.year || new Date().getFullYear()}_${Date.now()}`;
    const now = new Date().toISOString();
    const alloc: CategoryBudgetAllocation = {
      id,
      year: data.year || new Date().getFullYear(),
      category: data.category || 'other',
      categoryLabel: data.categoryLabel || 'General',
      allocatedAmount: Number(data.allocatedAmount ?? 0),
      spentAmount: Number(data.spentAmount ?? 0),
      notes: data.notes,
      updatedAt: now
    };
    await firestore.set('budgetAllocations', id, alloc);
    return alloc;
  }

  public async deleteBudgetAllocation(id: string): Promise<void> {
    await firestore.delete('budgetAllocations', id);
  }

  // ==========================================
  // 19. PRESIDENTIAL DIRECTIVES & CIRCULARS
  // ==========================================

  public async getPresidentialDirectives(): Promise<PresidentialDirective[]> {
    return firestore.list<PresidentialDirective>('presidentialDirectives');
  }

  public async createPresidentialDirective(data: Partial<PresidentialDirective>): Promise<PresidentialDirective> {
    const id = data.id || `dir_${Date.now()}`;
    const newDir: PresidentialDirective = {
      id,
      directiveNumber: data.directiveNumber || `DIR-${Date.now().toString().slice(-4)}`,
      title: data.title || '',
      titleDv: data.titleDv,
      description: data.description || '',
      issueDate: data.issueDate || new Date().toISOString().split('T')[0],
      effectiveDate: data.effectiveDate,
      priority: data.priority || 'high',
      status: data.status || 'active',
      issuedBy: data.issuedBy,
      createdAt: new Date().toISOString()
    };
    await firestore.set('presidentialDirectives', id, newDir);
    return newDir;
  }

  public async updatePresidentialDirective(id: string, updates: Partial<PresidentialDirective>): Promise<PresidentialDirective> {
    const existing = (await this.getPresidentialDirectives()).find(d => d.id === id);
    if (!existing) throw new Error(`Directive not found: ${id}`);
    const updated = { ...existing, ...updates };
    await firestore.set('presidentialDirectives', id, updated);
    return updated;
  }

  public async deletePresidentialDirective(id: string): Promise<void> {
    await firestore.delete('presidentialDirectives', id);
  }

  public async getOfficialCirculars(): Promise<OfficialCircular[]> {
    return firestore.list<OfficialCircular>('officialCirculars');
  }

  public async createOfficialCircular(data: Partial<OfficialCircular>): Promise<OfficialCircular> {
    const id = data.id || `cir_${Date.now()}`;
    const newCir: OfficialCircular = {
      id,
      circularNumber: data.circularNumber || `CIR-${Date.now().toString().slice(-4)}`,
      title: data.title || '',
      titleDv: data.titleDv,
      content: data.content || '',
      publishDate: data.publishDate || new Date().toISOString().split('T')[0],
      targetAudience: data.targetAudience || 'all_members',
      status: data.status || 'published',
      attachmentUrl: data.attachmentUrl,
      signedBy: data.signedBy,
      createdAt: new Date().toISOString()
    };
    await firestore.set('officialCirculars', id, newCir);
    return newCir;
  }

  public async updateOfficialCircular(id: string, updates: Partial<OfficialCircular>): Promise<OfficialCircular> {
    const existing = (await this.getOfficialCirculars()).find(c => c.id === id);
    if (!existing) throw new Error(`Circular not found: ${id}`);
    const updated = { ...existing, ...updates };
    await firestore.set('officialCirculars', id, updated);
    return updated;
  }

  public async deleteOfficialCircular(id: string): Promise<void> {
    await firestore.delete('officialCirculars', id);
  }

  // ==========================================
  // 20. USER PERFORMANCE & AUDIT HELPERS
  // ==========================================

  public async getUserPerformance(userId: string): Promise<any> {
    const logs = (await this.getAuditLogs()).filter(l => l.userId === userId);
    return {
      totalActions: logs.length,
      recentActions: logs.slice(0, 10),
      lastActive: logs[0]?.createdAt || null
    };
  }

  // ==========================================
  // 21. FIRESTORE COLLECTIONS SUMMARY & SYNC
  // ==========================================

  public async getDbTablesSummary(): Promise<{
    connected: boolean;
    databaseType: string;
    projectId: string;
    databaseId: string;
    tables: Array<{ name: string; recordCount: number; status: string }>;
    totalRecords: number;
    schemaReady: boolean;
    lastSyncedAt: string;
  }> {
    const collections = [
      'users', 'roles', 'modulePermissions', 'members', 'bankAccounts',
      'accountTransfers', 'contributionSettings', 'memberDues', 'incomeRecords',
      'expenseRecords', 'budgetAllocations', 'siteSettings', 'slideshowItems',
      'socialLinks', 'contacts', 'excoMembers', 'events', 'eventItems',
      'meetingItems', 'quizQuestions', 'quizSubmissions', 'quizWinners',
      'quizPrizes', 'quizSponsors', 'quizIneligibleParticipants', 'messages',
      'notifications', 'clubRules', 'auditLogs', 'presidentialDirectives',
      'officialCirculars'
    ];

    let totalRecords = 0;
    const tableSummaries: Array<{ name: string; recordCount: number; status: string }> = [];

    for (const col of collections) {
      try {
        const docs = await firestore.list(col);
        const count = docs.length;
        totalRecords += count;
        tableSummaries.push({ name: col, recordCount: count, status: 'Ready' });
      } catch (err: any) {
        tableSummaries.push({ name: col, recordCount: 0, status: 'Active' });
      }
    }

    return {
      connected: true,
      databaseType: 'Cloud Firestore',
      projectId: FIREBASE_PROJECT_ID,
      databaseId: FIRESTORE_DATABASE_ID,
      tables: tableSummaries,
      totalRecords,
      schemaReady: true,
      lastSyncedAt: new Date().toISOString()
    };
  }

  public async syncDatabase(): Promise<{ success: boolean; message: string; timestamp: string }> {
    await this.initDatabase();
    return {
      success: true,
      message: 'Cloud Firestore database collections synchronized successfully.',
      timestamp: new Date().toISOString()
    };
  }

  public async exportFullDatabase(): Promise<any> {
    const collections = [
      'users', 'roles', 'modulePermissions', 'members', 'bankAccounts',
      'accountTransfers', 'contributionSettings', 'memberDues', 'incomeRecords',
      'expenseRecords', 'budgetAllocations', 'siteSettings', 'slideshowItems',
      'socialLinks', 'contacts', 'excoMembers', 'events', 'eventItems',
      'meetingItems', 'quizQuestions', 'quizSubmissions', 'quizWinners',
      'quizPrizes', 'quizSponsors', 'messages', 'notifications', 'clubRules',
      'auditLogs', 'presidentialDirectives', 'officialCirculars'
    ];

    const exportData: Record<string, any> = {
      exportedAt: new Date().toISOString(),
      database: 'Cloud Firestore',
      projectId: FIREBASE_PROJECT_ID
    };

    for (const col of collections) {
      exportData[col] = await firestore.list(col);
    }

    return exportData;
  }

  public async importFullDatabase(data: any): Promise<void> {
    if (!data || typeof data !== 'object') throw new Error('Invalid import data format');
    const collections = Object.keys(data).filter(k => k !== 'exportedAt' && k !== 'database' && k !== 'projectId');

    for (const col of collections) {
      const items = Array.isArray(data[col]) ? data[col] : [];
      for (const item of items) {
        if (item && item.id) {
          await firestore.set(col, item.id, item);
        }
      }
    }
  }

  public async verifyStartupSchema(): Promise<boolean> {
    await this.initDatabase();
    return true;
  }
}

export const db = new DatabaseStore();
