import crypto from 'crypto';
import { firestore, getDatabaseMetadata } from './firebase';
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
  AuditLog,
  InboxMessage,
  AppNotification,
  ClubRulesData,
  UserRoleName,
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
  UserPerformanceData,
  UserPerformanceBadge,
  InvoiceRecord,
  InvoiceLineItem,
  IncomeCategory,
  InvoiceStatus
} from '../types';
import {
  ALL_MODULES,
  defaultClubRules,
  defaultSiteSettingsList,
  defaultRoles,
  defaultSlideshow,
  defaultContacts,
  defaultSocialLinks,
  defaultExcoMembers,
  defaultEvents,
  defaultInvoices
} from './seedData';
import { fallbackStore, logFallbackNotice } from './memoryFallback';

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

export class FirestoreDatabaseStore {
  // -------------------------------------------------------------
  // STARTUP & HEALTH
  // -------------------------------------------------------------
  async verifyStartupSchema(): Promise<void> {
    try {
      console.log('[Firestore] Checking system installation status...');
      const installRef = firestore.collection('system').doc('installation');
      const installDoc = await installRef.get();

      if (installDoc.exists && installDoc.data()?.initialized === true) {
        console.log('[Firestore] System is permanently initialized. Preserving all live records.');
        return;
      }

      console.log('[Firestore] System installation record not found. Please run "npm run db:setup" if this is a fresh environment.');
    } catch (err: any) {
      console.error('[Firestore] Startup check error:', err.message);
    }
  }

  async checkDatabaseHealth() {
    try {
      const meta = getDatabaseMetadata();
      return {
        database: 'cloud-firestore-direct',
        connected: true,
        schemaReady: true,
        missingTables: [],
        metadata: meta
      };
    } catch (err: any) {
      return {
        database: 'cloud-firestore-direct',
        connected: false,
        schemaReady: false,
        missingTables: [],
        error: err.message
      };
    }
  }

  async getDatabaseStatus() {
    return getDatabaseMetadata();
  }

  // -------------------------------------------------------------
  // USERS & SESSIONS
  // -------------------------------------------------------------
  async getUsers(): Promise<User[]> {
    try {
      const snap = await firestore.collection('users').get();
      const list = snap.docs.map(d => d.data() as User);
      list.forEach(u => fallbackStore.users.set(u.id, u));
      return list;
    } catch (err: any) {
      logFallbackNotice('getUsers', err);
      return Array.from(fallbackStore.users.values());
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const doc = await firestore.collection('users').doc(id).get();
      if (doc.exists) {
        const u = doc.data() as User;
        fallbackStore.users.set(u.id, u);
        return u;
      }
      return null;
    } catch (err: any) {
      logFallbackNotice(`getUserById:${id}`, err);
      return fallbackStore.users.get(id) || null;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const clean = username.trim().toLowerCase();
    try {
      const snap = await firestore.collection('users').where('username', '==', clean).get();
      if (!snap.empty) {
        const u = snap.docs[0].data() as User;
        fallbackStore.users.set(u.id, u);
        return u;
      }
      const allSnap = await firestore.collection('users').get();
      const match = allSnap.docs.find(d => (d.data().username || '').toLowerCase() === clean);
      if (match) {
        const u = match.data() as User;
        fallbackStore.users.set(u.id, u);
        return u;
      }
      return null;
    } catch (err: any) {
      logFallbackNotice(`getUserByUsername:${clean}`, err);
      for (const u of fallbackStore.users.values()) {
        if ((u.username || '').toLowerCase() === clean) return u;
      }
      return null;
    }
  }

  async createUser(data: Partial<User>): Promise<User> {
    const id = data.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const user: User = {
      id,
      fullName: data.fullName || '',
      username: (data.username || '').toLowerCase().trim(),
      designation: data.designation || '',
      contactNumber: data.contactNumber || '',
      roleId: data.roleId || 'role_member',
      roleName: data.roleName || 'Club Member',
      status: data.status || 'active',
      requirePinChange: data.requirePinChange ?? true,
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      notes: data.notes || '',
      permissions: data.permissions || [],
      memberId: data.memberId,
      pinHash: data.pinHash,
      pinSalt: data.pinSalt,
      ...(data as any)
    };

    fallbackStore.users.set(id, user);
    try {
      await firestore.collection('users').doc(id).set(user);
    } catch (err) {
      logFallbackNotice(`createUser:${id}`, err);
    }
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const existing = fallbackStore.users.get(id);
    const updated: User = {
      ...(existing || {} as User),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.users.set(id, updated);

    try {
      const userDoc = firestore.collection('users').doc(id);
      await userDoc.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateUser:${id}`, err);
    }
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    fallbackStore.users.delete(id);
    try {
      await firestore.collection('users').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteUser:${id}`, err);
    }
  }

  async recordFailedLogin(userId: string): Promise<{ count: number; lockedUntil: string | null }> {
    const existing = fallbackStore.users.get(userId);
    let newCount = (existing?.failedLoginCount || 0) + 1;
    let lockTimestamp: string | null = null;
    if (newCount >= 5) {
      lockTimestamp = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }
    if (existing) {
      existing.failedLoginCount = newCount;
      existing.lockedUntil = lockTimestamp;
      fallbackStore.users.set(userId, existing);
    }

    try {
      const userRef = firestore.collection('users').doc(userId);
      await userRef.update({
        failedLoginCount: newCount,
        lockedUntil: lockTimestamp,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      logFallbackNotice(`recordFailedLogin:${userId}`, err);
    }

    return { count: newCount, lockedUntil: lockTimestamp };
  }

  async clearFailedLogin(userId: string): Promise<void> {
    const existing = fallbackStore.users.get(userId);
    if (existing) {
      existing.failedLoginCount = 0;
      existing.lockedUntil = null;
      existing.lastLoginAt = new Date().toISOString();
      existing.updatedAt = new Date().toISOString();
      fallbackStore.users.set(userId, existing);
    }
    try {
      await firestore.collection('users').doc(userId).update({
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      logFallbackNotice(`clearFailedLogin:${userId}`, err);
    }
  }

  // SESSIONS
  async getSessions(): Promise<{ token: string; userId: string; expiresAt: number }[]> {
    try {
      const snap = await firestore.collection('userSessions').get();
      return snap.docs.map(d => d.data() as { token: string; userId: string; expiresAt: number });
    } catch (err) {
      return Array.from(fallbackStore.sessions.values()).map(s => ({
        token: s.tokenHash,
        userId: s.userId,
        expiresAt: s.expiresAt
      }));
    }
  }

  async saveSession(session: { token: string; userId: string; expiresAt: number; userAgent?: string }): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(session.token).digest('hex');
    const sessObj = {
      tokenHash,
      userId: session.userId,
      expiresAt: session.expiresAt,
      revokedAt: null,
      userAgent: session.userAgent || '',
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    fallbackStore.sessions.set(tokenHash, sessObj);

    try {
      await firestore.collection('userSessions').doc(tokenHash).set(sessObj);
    } catch (err) {
      logFallbackNotice('saveSession', err);
    }
  }

  async getSessionByToken(token: string): Promise<{ tokenHash: string; userId: string; expiresAt: number; revokedAt: string | null } | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    try {
      const doc = await firestore.collection('userSessions').doc(tokenHash).get();
      if (doc.exists) return doc.data() as any;
      return fallbackStore.sessions.get(tokenHash) || null;
    } catch (err) {
      return fallbackStore.sessions.get(tokenHash) || null;
    }
  }

  async deleteSession(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    fallbackStore.sessions.delete(tokenHash);
    try {
      await firestore.collection('userSessions').doc(tokenHash).delete();
    } catch (err) {
      logFallbackNotice('deleteSession', err);
    }
  }

  async touchSession(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const sess = fallbackStore.sessions.get(tokenHash);
    if (sess) {
      sess.lastSeenAt = new Date().toISOString();
      fallbackStore.sessions.set(tokenHash, sess);
    }
    try {
      await firestore.collection('userSessions').doc(tokenHash).update({
        lastSeenAt: new Date().toISOString()
      });
    } catch (err) {
      // ignore
    }
  }

  // -------------------------------------------------------------
  // ROLES
  // -------------------------------------------------------------
  async getRoles(): Promise<Role[]> {
    try {
      const snap = await firestore.collection('roles').get();
      const list = snap.docs.map(d => d.data() as Role);
      list.forEach(r => fallbackStore.roles.set(r.id, r));
      return list;
    } catch (err) {
      logFallbackNotice('getRoles', err);
      return Array.from(fallbackStore.roles.values());
    }
  }

  async createRole(data: Partial<Role>): Promise<Role> {
    const id = data.id || `role_${Date.now()}`;
    const role: Role = {
      id,
      name: data.name || ('Custom Role' as UserRoleName),
      description: data.description || '',
      isSystemRole: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      defaultPermissions: data.defaultPermissions || []
    };
    fallbackStore.roles.set(id, role);
    try {
      await firestore.collection('roles').doc(id).set(role);
    } catch (err) {
      logFallbackNotice(`createRole:${id}`, err);
    }
    return role;
  }

  async updateRole(id: string, updates: Partial<Role>): Promise<Role> {
    const existing = fallbackStore.roles.get(id);
    const updated: Role = {
      ...(existing || {} as Role),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.roles.set(id, updated);
    try {
      const docRef = firestore.collection('roles').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateRole:${id}`, err);
    }
    return updated;
  }

  async deleteRole(id: string): Promise<void> {
    fallbackStore.roles.delete(id);
    try {
      await firestore.collection('roles').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteRole:${id}`, err);
    }
  }

  // -------------------------------------------------------------
  // MEMBERS
  // -------------------------------------------------------------
  async getMembers(): Promise<ClubMember[]> {
    try {
      const snap = await firestore.collection('clubMembers').get();
      const list = snap.docs.map(d => d.data() as ClubMember);
      list.forEach(m => fallbackStore.members.set(m.id, m));
      return list;
    } catch (err) {
      logFallbackNotice('getMembers', err);
      return Array.from(fallbackStore.members.values());
    }
  }

  async getMemberById(id: string): Promise<ClubMember | null> {
    try {
      const doc = await firestore.collection('clubMembers').doc(id).get();
      if (doc.exists) {
        const m = doc.data() as ClubMember;
        fallbackStore.members.set(m.id, m);
        return m;
      }
      return null;
    } catch (err) {
      return fallbackStore.members.get(id) || null;
    }
  }

  async createMember(data: Partial<ClubMember>): Promise<ClubMember> {
    const id = data.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let memberNumber = data.memberNumber;
    if (!memberNumber) {
      const nextNum = (fallbackStore.counters.get('members') || 1);
      fallbackStore.counters.set('members', nextNum + 1);
      memberNumber = `ARC-M-${String(nextNum).padStart(3, '0')}`;
      try {
        const counterRef = firestore.collection('counters').doc('members');
        await counterRef.set({ count: nextNum + 1 }, { merge: true });
      } catch (e) {}
    }

    const member: ClubMember = {
      id,
      memberNumber: memberNumber || `ARC-M-${Date.now().toString().slice(-3)}`,
      fullName: data.fullName || '',
      idCardNumber: data.idCardNumber || '',
      address: data.address || '',
      phoneNumber: data.phoneNumber || '',
      email: data.email || '',
      status: data.status || 'active',
      memberType: data.memberType || 'standard',
      joinedDate: data.joinedDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };

    fallbackStore.members.set(id, member);
    try {
      await firestore.collection('clubMembers').doc(id).set(member);
    } catch (err) {
      logFallbackNotice(`createMember:${id}`, err);
    }
    return member;
  }

  async updateMember(id: string, updates: Partial<ClubMember>): Promise<ClubMember> {
    const existing = fallbackStore.members.get(id);
    const updated: ClubMember = {
      ...(existing || {} as ClubMember),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.members.set(id, updated);
    try {
      const docRef = firestore.collection('clubMembers').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateMember:${id}`, err);
    }
    return updated;
  }

  async deleteMember(id: string): Promise<void> {
    fallbackStore.members.delete(id);
    try {
      await firestore.collection('clubMembers').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteMember:${id}`, err);
    }
  }

  // -------------------------------------------------------------
  // EVENTS & MEETINGS
  // -------------------------------------------------------------
  async getEvents(): Promise<ClubEvent[]> {
    try {
      const snap = await firestore.collection('events').get();
      const list = snap.docs.map(d => d.data() as ClubEvent);
      list.forEach(e => fallbackStore.events.set(e.id, e));
      return list;
    } catch (err) {
      logFallbackNotice('getEvents', err);
      return Array.from(fallbackStore.events.values());
    }
  }

  async createEvent(data: Partial<ClubEvent>): Promise<ClubEvent> {
    const id = data.id || `evt_${Date.now()}`;
    const event: ClubEvent = {
      id,
      title: data.title || '',
      summary: data.summary || '',
      description: data.description || '',
      eventDate: data.eventDate || new Date().toISOString(),
      location: data.location || '',
      photoAlbum: data.photoAlbum || [],
      displayOrder: data.displayOrder || 1,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    fallbackStore.events.set(id, event);
    try {
      await firestore.collection('events').doc(id).set(event);
    } catch (err) {
      logFallbackNotice(`createEvent:${id}`, err);
    }
    return event;
  }

  async updateEvent(id: string, updates: Partial<ClubEvent>): Promise<ClubEvent> {
    const existing = fallbackStore.events.get(id);
    const updated: ClubEvent = {
      ...(existing || {} as ClubEvent),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.events.set(id, updated);
    try {
      const docRef = firestore.collection('events').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateEvent:${id}`, err);
    }
    return updated;
  }

  async deleteEvent(id: string): Promise<void> {
    fallbackStore.events.delete(id);
    try {
      await firestore.collection('events').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteEvent:${id}`, err);
    }
  }

  async getEventItems(): Promise<EventItem[]> {
    try {
      const snap = await firestore.collection('eventItems').get();
      const list = snap.docs.map(d => d.data() as EventItem);
      list.forEach(e => fallbackStore.eventItems.set(e.id, e));
      return list;
    } catch (err) {
      return Array.from(fallbackStore.eventItems.values());
    }
  }

  async createEventItem(data: Partial<EventItem>): Promise<EventItem> {
    const id = data.id || `item_evt_${Date.now()}`;
    const item: EventItem = {
      id,
      title: data.title || '',
      heldDate: data.heldDate || new Date().toISOString(),
      venue: data.venue || '',
      summary: data.summary || '',
      description: data.description || '',
      eventType: data.eventType || 'activity' as any,
      status: data.status || 'upcoming',
      photoGallery: data.photoGallery || [],
      attendance: data.attendance || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    fallbackStore.eventItems.set(id, item);
    try {
      await firestore.collection('eventItems').doc(id).set(item);
    } catch (err) {
      logFallbackNotice(`createEventItem:${id}`, err);
    }
    return item;
  }

  async updateEventItem(id: string, updates: Partial<EventItem>): Promise<EventItem> {
    const existing = fallbackStore.eventItems.get(id);
    const updated: EventItem = {
      ...(existing || {} as EventItem),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.eventItems.set(id, updated);
    try {
      const docRef = firestore.collection('eventItems').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateEventItem:${id}`, err);
    }
    return updated;
  }

  async deleteEventItem(id: string): Promise<void> {
    fallbackStore.eventItems.delete(id);
    try {
      await firestore.collection('eventItems').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteEventItem:${id}`, err);
    }
  }

  async saveEventAttendance(id: string, attendance: any[]): Promise<EventItem> {
    return this.updateEventItem(id, { attendance });
  }

  async getMeetingItems(): Promise<MeetingItem[]> {
    try {
      const snap = await firestore.collection('meetingItems').get();
      const list = snap.docs.map(d => d.data() as MeetingItem);
      list.forEach(m => fallbackStore.meetings.set(m.id, m));
      return list;
    } catch (err) {
      return Array.from(fallbackStore.meetings.values());
    }
  }

  async createMeetingItem(data: Partial<MeetingItem>): Promise<MeetingItem> {
    const id = data.id || `meet_${Date.now()}`;
    const item: MeetingItem = {
      id,
      title: data.title || '',
      meetingType: data.meetingType || 'exco',
      heldDate: data.heldDate || new Date().toISOString(),
      venue: data.venue || '',
      summary: data.summary || '',
      status: data.status || 'scheduled',
      attendance: data.attendance || [],
      votings: data.votings || [],
      finalizedActions: data.finalizedActions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    fallbackStore.meetings.set(id, item);
    try {
      await firestore.collection('meetingItems').doc(id).set(item);
    } catch (err) {
      logFallbackNotice(`createMeetingItem:${id}`, err);
    }
    return item;
  }

  async updateMeetingItem(id: string, updates: Partial<MeetingItem>): Promise<MeetingItem> {
    const existing = fallbackStore.meetings.get(id);
    const updated: MeetingItem = {
      ...(existing || {} as MeetingItem),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.meetings.set(id, updated);
    try {
      const docRef = firestore.collection('meetingItems').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateMeetingItem:${id}`, err);
    }
    return updated;
  }

  async deleteMeetingItem(id: string): Promise<void> {
    fallbackStore.meetings.delete(id);
    try {
      await firestore.collection('meetingItems').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteMeetingItem:${id}`, err);
    }
  }

  async saveMeetingAttendance(id: string, attendance: any[]): Promise<MeetingItem> {
    return this.updateMeetingItem(id, { attendance });
  }

  async addMeetingVoting(id: string, voting: any): Promise<MeetingItem> {
    const existing = fallbackStore.meetings.get(id);
    const votings = [...(existing?.votings || [])];
    const voteId = voting.id || `vote_${Date.now()}`;
    votings.push({ ...voting, id: voteId });
    return this.updateMeetingItem(id, { votings });
  }

  async updateMeetingVoting(id: string, votingId: string, voting: any): Promise<MeetingItem> {
    const existing = fallbackStore.meetings.get(id);
    const votings = (existing?.votings || []).map(v => (v.id === votingId ? { ...v, ...voting } : v));
    return this.updateMeetingItem(id, { votings });
  }

  // -------------------------------------------------------------
  // BUDGET & FINANCIALS
  // -------------------------------------------------------------
  async getBankAccounts(): Promise<BankAccount[]> {
    const snap = await firestore.collection('budgetAccounts').get();
    return snap.docs.map(d => d.data() as BankAccount);
  }

  async getBankAccountById(id: string): Promise<BankAccount | null> {
    const doc = await firestore.collection('budgetAccounts').doc(id).get();
    return doc.exists ? (doc.data() as BankAccount) : null;
  }

  async createBankAccount(data: Partial<BankAccount>): Promise<BankAccount> {
    const id = data.id || `acc_${Date.now()}`;
    const account: BankAccount = {
      id,
      accountName: data.accountName || '',
      accountNumber: data.accountNumber || '',
      bankName: data.bankName || 'Bank of Maldives (BML)',
      currency: data.currency || 'MVR',
      openingBalance: data.openingBalance || 0,
      currentBalance: data.currentBalance !== undefined ? data.currentBalance : (data.openingBalance || 0),
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    await firestore.collection('budgetAccounts').doc(id).set(account);
    return account;
  }

  async updateBankAccount(id: string, updates: Partial<BankAccount>): Promise<BankAccount> {
    const docRef = firestore.collection('budgetAccounts').doc(id);
    await docRef.update({ ...updates, updatedAt: new Date().toISOString() });
    const snap = await docRef.get();
    return snap.data() as BankAccount;
  }

  async deleteBankAccount(id: string): Promise<void> {
    await firestore.collection('budgetAccounts').doc(id).delete();
  }

  async getIncomeRecords(filter?: { category?: string; accountId?: string; startDate?: string; endDate?: string }): Promise<IncomeRecord[]> {
    const snap = await firestore.collection('incomeRecords').get();
    let list = snap.docs.map(d => d.data() as IncomeRecord);
    if (filter) {
      if (filter.category) list = list.filter(i => i.category === filter.category);
      if (filter.accountId) list = list.filter(i => i.accountId === filter.accountId);
      if (filter.startDate) list = list.filter(i => i.date >= filter.startDate!);
      if (filter.endDate) list = list.filter(i => i.date <= filter.endDate!);
    }
    return list;
  }

  async createIncomeRecord(data: Partial<IncomeRecord>): Promise<IncomeRecord> {
    const id = data.id || `inc_${Date.now()}`;
    const record: IncomeRecord = {
      id,
      title: data.title || '',
      amount: data.amount || 0,
      category: data.category || 'other' as any,
      date: data.date || new Date().toISOString(),
      accountId: data.accountId || 'acc_primary_001',
      notes: data.notes || (data as any).description || '',
      referenceNumber: data.referenceNumber || (data as any).receiptNumber || '',
      receivedFrom: data.receivedFrom || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };

    const batch = firestore.batch();
    batch.set(firestore.collection('incomeRecords').doc(id), record);

    if (record.accountId && record.amount) {
      const accRef = firestore.collection('budgetAccounts').doc(record.accountId);
      const accSnap = await accRef.get();
      if (accSnap.exists) {
        const curBal = (accSnap.data() as BankAccount).currentBalance || 0;
        batch.update(accRef, { currentBalance: curBal + record.amount, updatedAt: new Date().toISOString() });
      }
    }

    await batch.commit();
    return record;
  }

  async updateIncomeRecord(id: string, updates: Partial<IncomeRecord>): Promise<IncomeRecord> {
    const docRef = firestore.collection('incomeRecords').doc(id);
    await docRef.update({ ...updates, updatedAt: new Date().toISOString() });
    const snap = await docRef.get();
    return snap.data() as IncomeRecord;
  }

  async deleteIncomeRecord(id: string): Promise<void> {
    await firestore.collection('incomeRecords').doc(id).delete();
  }

  async getExpenseRecords(filter?: { category?: string; accountId?: string; status?: string; startDate?: string; endDate?: string }): Promise<ExpenseRecord[]> {
    const snap = await firestore.collection('expenseRecords').get();
    let list = snap.docs.map(d => d.data() as ExpenseRecord);
    if (filter) {
      if (filter.category) list = list.filter(e => e.category === filter.category);
      if (filter.accountId) list = list.filter(e => e.accountId === filter.accountId);
      if (filter.status) list = list.filter(e => e.status === filter.status);
      if (filter.startDate) list = list.filter(e => e.date >= filter.startDate!);
      if (filter.endDate) list = list.filter(e => e.date <= filter.endDate!);
    }
    return list;
  }

  async createExpenseRecord(data: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    const id = data.id || `exp_${Date.now()}`;
    const record: ExpenseRecord = {
      id,
      title: data.title || '',
      amount: data.amount || 0,
      category: data.category || 'other',
      date: data.date || new Date().toISOString(),
      accountId: data.accountId || 'acc_primary_001',
      payee: (data as any).payee || (data as any).paidTo || '',
      notes: (data as any).notes || (data as any).description || '',
      receiptNumber: (data as any).receiptNumber || (data as any).invoiceNumber || '',
      paymentMethod: (data as any).paymentMethod || 'bank_transfer',
      status: data.status || 'paid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };

    const batch = firestore.batch();
    batch.set(firestore.collection('expenseRecords').doc(id), record);

    if (record.accountId && record.amount) {
      const accRef = firestore.collection('budgetAccounts').doc(record.accountId);
      const accSnap = await accRef.get();
      if (accSnap.exists) {
        const curBal = (accSnap.data() as BankAccount).currentBalance || 0;
        batch.update(accRef, { currentBalance: Math.max(0, curBal - record.amount), updatedAt: new Date().toISOString() });
      }
    }

    await batch.commit();
    return record;
  }

  async updateExpenseRecord(id: string, updates: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    const docRef = firestore.collection('expenseRecords').doc(id);
    await docRef.update({ ...updates, updatedAt: new Date().toISOString() });
    const snap = await docRef.get();
    return snap.data() as ExpenseRecord;
  }

  async deleteExpenseRecord(id: string): Promise<void> {
    await firestore.collection('expenseRecords').doc(id).delete();
  }

  async getAccountTransfers(): Promise<AccountTransferRecord[]> {
    const snap = await firestore.collection('accountTransfers').get();
    return snap.docs.map(d => d.data() as AccountTransferRecord);
  }

  async createAccountTransfer(data: Partial<AccountTransferRecord>): Promise<AccountTransferRecord> {
    const id = data.id || `trf_${Date.now()}`;
    const transfer: AccountTransferRecord = {
      id,
      fromAccountId: data.fromAccountId || '',
      fromAccountName: (data as any).fromAccountName || '',
      toAccountId: data.toAccountId || '',
      toAccountName: (data as any).toAccountName || '',
      amount: data.amount || 0,
      date: data.date || new Date().toISOString(),
      notes: (data as any).notes || (data as any).description || '',
      referenceNumber: (data as any).referenceNumber || (data as any).reference || '',
      createdAt: new Date().toISOString(),
      ...(data as any)
    };

    const batch = firestore.batch();
    batch.set(firestore.collection('accountTransfers').doc(id), transfer);

    if (transfer.fromAccountId && transfer.amount) {
      const fromRef = firestore.collection('budgetAccounts').doc(transfer.fromAccountId);
      const fromSnap = await fromRef.get();
      if (fromSnap.exists) {
        const bal = (fromSnap.data() as BankAccount).currentBalance || 0;
        batch.update(fromRef, { currentBalance: bal - transfer.amount, updatedAt: new Date().toISOString() });
      }
    }

    if (transfer.toAccountId && transfer.amount) {
      const toRef = firestore.collection('budgetAccounts').doc(transfer.toAccountId);
      const toSnap = await toRef.get();
      if (toSnap.exists) {
        const bal = (toSnap.data() as BankAccount).currentBalance || 0;
        batch.update(toRef, { currentBalance: bal + transfer.amount, updatedAt: new Date().toISOString() });
      }
    }

    await batch.commit();
    return transfer;
  }

  async deleteAccountTransfer(id: string): Promise<void> {
    await firestore.collection('accountTransfers').doc(id).delete();
  }

  async getContributionSettings(): Promise<MemberContributionSetting> {
    const doc = await firestore.collection('contributionSettings').doc('current').get();
    if (doc.exists) return doc.data() as MemberContributionSetting;
    return {
      monthlyFee: 50,
      dueDayOfMonth: 10,
      finePerDay: 5,
      annualAdvanceDiscountMonths: 1,
      currency: 'MVR',
      defaultDepositAccountId: 'acc_primary_001',
      enableAutoFines: true,
      gracePeriodDays: 5,
      updatedAt: new Date().toISOString()
    };
  }

  async updateContributionSettings(data: Partial<MemberContributionSetting>): Promise<MemberContributionSetting> {
    const payload = { ...data, updatedAt: new Date().toISOString() };
    await firestore.collection('contributionSettings').doc('current').set(payload, { merge: true });
    return this.getContributionSettings();
  }

  async getMemberContributions(filter?: { year?: number; month?: number; memberId?: string; status?: string }): Promise<MemberContributionRecord[]> {
    const snap = await firestore.collection('memberContributions').get();
    let list = snap.docs.map(d => d.data() as MemberContributionRecord);
    if (filter) {
      if (filter.year !== undefined && !isNaN(filter.year)) list = list.filter(c => c.year === filter.year);
      if (filter.month !== undefined && !isNaN(filter.month)) list = list.filter(c => c.month === filter.month);
      if (filter.memberId) list = list.filter(c => c.memberId === filter.memberId);
      if (filter.status) list = list.filter(c => c.status === filter.status);
    }
    return list;
  }

  async createMemberContribution(data: Partial<MemberContributionRecord>): Promise<MemberContributionRecord> {
    const id = data.id || `contrib_${data.memberId}_${data.year}_${data.month}`;
    const record: MemberContributionRecord = {
      id,
      memberId: data.memberId || '',
      memberNumber: data.memberNumber || '',
      memberName: data.memberName || '',
      year: data.year || new Date().getFullYear(),
      month: data.month || (new Date().getMonth() + 1),
      baseAmount: (data as any).baseAmount || (data as any).amount || 50,
      fineDays: (data as any).fineDays || 0,
      finePerDay: (data as any).finePerDay || 5,
      fineAmount: data.fineAmount || 0,
      discountAmount: data.discountAmount || 0,
      totalPayable: data.totalPayable || (data as any).amount || 50,
      paidAmount: data.paidAmount || 0,
      dueDate: (data as any).dueDate || new Date().toISOString().split('T')[0],
      status: data.status || 'pending',
      paidDate: (data as any).paidDate || (data as any).paidAt,
      paymentMethod: data.paymentMethod,
      receiptNumber: data.receiptNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    await firestore.collection('memberContributions').doc(id).set(record);
    return record;
  }

  async updateMemberContribution(id: string, updates: Partial<MemberContributionRecord>): Promise<MemberContributionRecord> {
    const docRef = firestore.collection('memberContributions').doc(id);
    await docRef.update({ ...updates, updatedAt: new Date().toISOString() });
    const snap = await docRef.get();
    return snap.data() as MemberContributionRecord;
  }

  async deleteMemberContribution(id: string): Promise<void> {
    await firestore.collection('memberContributions').doc(id).delete();
  }

  async batchGenerateContributions(year: number, month: number): Promise<{ generated: number; skipped: number }> {
    const members = await this.getMembers();
    const settings = await this.getContributionSettings();
    const activeMembers = members.filter(m => m.status === 'active');
    let generated = 0;
    let skipped = 0;

    const batch = firestore.batch();
    for (const m of activeMembers) {
      const docId = `contrib_${m.id}_${year}_${month}`;
      const docRef = firestore.collection('memberContributions').doc(docId);
      const existing = await docRef.get();
      if (existing.exists) {
        skipped++;
      } else {
        const record: MemberContributionRecord = {
          id: docId,
          memberId: m.id,
          memberNumber: m.memberNumber,
          memberName: m.fullName,
          year,
          month,
          baseAmount: settings.monthlyFee || 50,
          fineDays: 0,
          finePerDay: settings.finePerDay || 5,
          fineAmount: 0,
          discountAmount: 0,
          totalPayable: settings.monthlyFee || 50,
          paidAmount: 0,
          dueDate: `${year}-${String(month).padStart(2, '0')}-${String(settings.dueDayOfMonth || 10).padStart(2, '0')}`,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        batch.set(docRef, record);
        generated++;
      }
    }
    if (generated > 0) {
      await batch.commit();
    }
    return { generated, skipped };
  }

  async getBudgetAllocations(year?: number): Promise<CategoryBudgetAllocation[]> {
    const snap = await firestore.collection('budgetAllocations').get();
    let list = snap.docs.map(d => d.data() as CategoryBudgetAllocation);
    if (year !== undefined && !isNaN(year)) {
      list = list.filter(a => a.year === year);
    }
    return list;
  }

  async saveBudgetAllocations(allocations: CategoryBudgetAllocation[]): Promise<void> {
    const batch = firestore.batch();
    for (const alloc of allocations) {
      const id = alloc.id || `alloc_${alloc.year}_${alloc.category}`;
      batch.set(firestore.collection('budgetAllocations').doc(id), { ...alloc, id }, { merge: true });
    }
    await batch.commit();
  }

  async getBudgetStats(year?: number): Promise<BudgetStats> {
    const [accounts, income, expenses, contributions] = await Promise.all([
      this.getBankAccounts(),
      this.getIncomeRecords(),
      this.getExpenseRecords(),
      this.getMemberContributions()
    ]);

    const totalAccountsBalance = accounts.reduce((acc, a) => acc + (a.currentBalance || 0), 0);
    const totalIncome = income.reduce((acc, i) => acc + (i.amount || 0), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const totalContributionsCollected = contributions
      .filter(c => c.status === 'paid')
      .reduce((acc, c) => acc + (c.paidAmount || 0), 0);

    const pending = contributions.filter(c => c.status === 'pending');
    const overdue = contributions.filter(c => c.status === 'overdue');

    return {
      totalAccountsBalance,
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      totalContributionsCollected,
      pendingContributionsCount: pending.length,
      pendingContributionsAmount: pending.reduce((sum, c) => sum + (c.totalPayable - c.paidAmount), 0),
      overdueContributionsCount: overdue.length,
      overdueContributionsAmount: overdue.reduce((sum, c) => sum + (c.totalPayable - c.paidAmount), 0),
      totalFinesCollected: contributions.reduce((sum, c) => sum + (c.fineAmount || 0), 0),
      monthlyFlow: [],
      categoryIncome: [],
      categoryExpense: [],
      recentTransactions: []
    };
  }

  // INVOICES
  async getInvoices(filter?: { type?: string; status?: string; startDate?: string; endDate?: string; search?: string }): Promise<InvoiceRecord[]> {
    let list: InvoiceRecord[] = [];
    try {
      const snap = await firestore.collection('invoices').get();
      list = snap.docs.map(d => d.data() as InvoiceRecord);
      list.forEach(i => fallbackStore.invoices.set(i.id, i));
    } catch (err) {
      logFallbackNotice('getInvoices', err);
      list = Array.from(fallbackStore.invoices.values());
    }

    if (filter) {
      if (filter.type) list = list.filter(i => i.type === filter.type);
      if (filter.status) list = list.filter(i => i.status === filter.status);
      if (filter.startDate) list = list.filter(i => i.invoiceDate >= filter.startDate!);
      if (filter.endDate) list = list.filter(i => i.invoiceDate <= filter.endDate!);
      if (filter.search) {
        const s = filter.search.toLowerCase();
        list = list.filter(i => (i.invoiceNumber && i.invoiceNumber.toLowerCase().includes(s)) || (i.billTo && i.billTo.toLowerCase().includes(s)));
      }
    }
    return list;
  }

  async getInvoiceById(id: string): Promise<InvoiceRecord | null> {
    try {
      const doc = await firestore.collection('invoices').doc(id).get();
      if (doc.exists) {
        const inv = doc.data() as InvoiceRecord;
        fallbackStore.invoices.set(inv.id, inv);
        return inv;
      }
      return null;
    } catch (err) {
      return fallbackStore.invoices.get(id) || null;
    }
  }

  async createInvoice(data: Partial<InvoiceRecord>): Promise<InvoiceRecord> {
    const id = data.id || `inv_${Date.now()}`;
    const subTotal = (data as any).subTotal || (data as any).subtotal || 0;
    const discount = data.discount || 0;
    const totalNetPayments = (data as any).totalNetPayments || (data as any).totalAmount || Math.max(0, subTotal - discount);
    const amountPaid = (data as any).amountPaid || (data as any).paidAmount || 0;
    const amountDue = Math.max(0, totalNetPayments - amountPaid);

    const invoice: InvoiceRecord = {
      id,
      invoiceNumber: data.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
      type: data.type || 'invoice',
      invoiceDate: (data as any).invoiceDate || (data as any).issueDate || new Date().toISOString().split('T')[0],
      dueDate: data.dueDate || new Date().toISOString().split('T')[0],
      status: data.status || 'draft',
      billTo: (data as any).billTo || (data as any).clientName || '',
      items: data.items || [],
      subTotal,
      discount,
      totalNetPayments,
      amountPaid,
      amountDue,
      paymentMethod: (data as any).paymentMethod || 'online',
      remark: (data as any).remark || (data as any).notes || '',
      createdBy: data.createdBy || 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    fallbackStore.invoices.set(id, invoice);
    try {
      await firestore.collection('invoices').doc(id).set(invoice);
    } catch (err) {
      logFallbackNotice(`createInvoice:${id}`, err);
    }
    return invoice;
  }

  async updateInvoice(id: string, updates: Partial<InvoiceRecord>): Promise<InvoiceRecord> {
    const existing = fallbackStore.invoices.get(id);
    const updated: InvoiceRecord = {
      ...(existing || {} as InvoiceRecord),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.invoices.set(id, updated);
    try {
      const docRef = firestore.collection('invoices').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateInvoice:${id}`, err);
    }
    return updated;
  }

  async deleteInvoice(id: string): Promise<void> {
    fallbackStore.invoices.delete(id);
    try {
      await firestore.collection('invoices').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteInvoice:${id}`, err);
    }
  }

  // -------------------------------------------------------------
  // SITE SETTINGS & CONTENT
  // -------------------------------------------------------------
  async getSettings(): Promise<SiteSetting[]> {
    try {
      const snap = await firestore.collection('siteSettings').get();
      const list = snap.docs.map(d => d.data() as SiteSetting);
      list.forEach(s => fallbackStore.settings.set(s.id, s));
      return list;
    } catch (err) {
      logFallbackNotice('getSettings', err);
      return Array.from(fallbackStore.settings.values());
    }
  }

  async updateSettings(settingsList: any[]): Promise<SiteSetting[]> {
    for (const s of settingsList) {
      const docId = s.id || `setting_${s.group || 'general'}_${s.key}`;
      const item = { ...s, id: docId, updatedAt: new Date().toISOString() };
      fallbackStore.settings.set(docId, item);
    }
    try {
      const batch = firestore.batch();
      for (const s of settingsList) {
        const docId = s.id || `setting_${s.group || 'general'}_${s.key}`;
        const docRef = firestore.collection('siteSettings').doc(docId);
        batch.set(docRef, { ...s, id: docId, updatedAt: new Date().toISOString() }, { merge: true });
      }
      await batch.commit();
    } catch (err) {
      logFallbackNotice('updateSettings', err);
    }
    return this.getSettings();
  }

  async updateSettingsGroup(group: string, values: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(values)) {
      const docId = `setting_${group}_${key}`;
      const item: SiteSetting = {
        id: docId,
        group,
        key,
        value,
        updatedAt: new Date().toISOString()
      } as any;
      fallbackStore.settings.set(docId, item);
    }
    try {
      const batch = firestore.batch();
      for (const [key, value] of Object.entries(values)) {
        const docId = `setting_${group}_${key}`;
        const docRef = firestore.collection('siteSettings').doc(docId);
        batch.set(docRef, {
          id: docId,
          group,
          key,
          value,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      await batch.commit();
    } catch (err) {
      logFallbackNotice(`updateSettingsGroup:${group}`, err);
    }
  }

  async updateSetting(id: string, value: any): Promise<void> {
    const existing = fallbackStore.settings.get(id);
    if (existing) {
      existing.value = value;
      existing.updatedAt = new Date().toISOString();
      fallbackStore.settings.set(id, existing);
    }
    try {
      await firestore.collection('siteSettings').doc(id).set({
        id,
        value,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateSetting:${id}`, err);
    }
  }

  async getSlideshow(): Promise<SlideshowItem[]> {
    try {
      const snap = await firestore.collection('slideshow').get();
      const list = snap.docs.map(d => d.data() as SlideshowItem);
      list.forEach(s => fallbackStore.slideshow.set(s.id, s));
      return list;
    } catch (err) {
      logFallbackNotice('getSlideshow', err);
      return Array.from(fallbackStore.slideshow.values());
    }
  }

  async createSlideshowItem(data: Partial<SlideshowItem>): Promise<SlideshowItem> {
    const id = data.id || `slide_${Date.now()}`;
    const slide: SlideshowItem = {
      id,
      title: data.title || '',
      subtitle: data.subtitle || '',
      desktopImage: (data as any).desktopImage || (data as any).imageUrl || '',
      buttonLink: (data as any).buttonLink || (data as any).linkUrl || '',
      buttonText: data.buttonText || '',
      textAlignment: (data as any).textAlignment || 'left',
      overlayLevel: (data as any).overlayLevel || 30,
      displayOrder: data.displayOrder || 1,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    fallbackStore.slideshow.set(id, slide);
    try {
      await firestore.collection('slideshow').doc(id).set(slide);
    } catch (err) {
      logFallbackNotice(`createSlideshowItem:${id}`, err);
    }
    return slide;
  }

  async updateSlideshowItem(id: string, updates: Partial<SlideshowItem>): Promise<SlideshowItem> {
    const existing = fallbackStore.slideshow.get(id);
    const updated: SlideshowItem = {
      ...(existing || {} as SlideshowItem),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.slideshow.set(id, updated);
    try {
      const docRef = firestore.collection('slideshow').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateSlideshowItem:${id}`, err);
    }
    return updated;
  }

  async deleteSlideshowItem(id: string): Promise<void> {
    fallbackStore.slideshow.delete(id);
    try {
      await firestore.collection('slideshow').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteSlideshowItem:${id}`, err);
    }
  }

  async getContacts(): Promise<any[]> {
    try {
      const snap = await firestore.collection('contacts').get();
      const list = snap.docs.map(d => d.data());
      list.forEach(c => fallbackStore.contacts.set(c.id, c));
      return list;
    } catch (err) {
      logFallbackNotice('getContacts', err);
      return Array.from(fallbackStore.contacts.values());
    }
  }

  async createContact(data: any): Promise<any> {
    const id = data.id || `contact_${Date.now()}`;
    const item = { ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    fallbackStore.contacts.set(id, item);
    try {
      await firestore.collection('contacts').doc(id).set(item);
    } catch (err) {
      logFallbackNotice(`createContact:${id}`, err);
    }
    return item;
  }

  async updateContact(id: string, updates: any): Promise<any> {
    const existing = fallbackStore.contacts.get(id);
    const updated = { ...(existing || {}), ...updates, id, updatedAt: new Date().toISOString() };
    fallbackStore.contacts.set(id, updated);
    try {
      const docRef = firestore.collection('contacts').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateContact:${id}`, err);
    }
    return updated;
  }

  async deleteContact(id: string): Promise<void> {
    fallbackStore.contacts.delete(id);
    try {
      await firestore.collection('contacts').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteContact:${id}`, err);
    }
  }

  async getSocialLinks(): Promise<SocialLink[]> {
    try {
      const snap = await firestore.collection('socialLinks').get();
      const list = snap.docs.map(d => d.data() as SocialLink);
      list.forEach(s => fallbackStore.socialLinks.set(s.id, s));
      return list;
    } catch (err) {
      logFallbackNotice('getSocialLinks', err);
      return Array.from(fallbackStore.socialLinks.values());
    }
  }

  async createSocialLink(data: Partial<SocialLink>): Promise<SocialLink> {
    const id = data.id || `social_${Date.now()}`;
    const item: SocialLink = {
      id,
      platform: data.platform || 'facebook',
      url: data.url || '',
      displayOrder: data.displayOrder || 1,
      status: data.status || 'active',
      openInNewTab: (data as any).openInNewTab ?? true,
      ...(data as any)
    };
    fallbackStore.socialLinks.set(id, item);
    try {
      await firestore.collection('socialLinks').doc(id).set(item);
    } catch (err) {
      logFallbackNotice(`createSocialLink:${id}`, err);
    }
    return item;
  }

  async updateSocialLink(id: string, updates: Partial<SocialLink>): Promise<SocialLink> {
    const existing = fallbackStore.socialLinks.get(id);
    const updated: SocialLink = {
      ...(existing || {} as SocialLink),
      ...updates,
      id
    };
    fallbackStore.socialLinks.set(id, updated);
    try {
      const docRef = firestore.collection('socialLinks').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateSocialLink:${id}`, err);
    }
    return updated;
  }

  async deleteSocialLink(id: string): Promise<void> {
    fallbackStore.socialLinks.delete(id);
    try {
      await firestore.collection('socialLinks').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteSocialLink:${id}`, err);
    }
  }

  async getExcoMembers(): Promise<ExcoMember[]> {
    try {
      const snap = await firestore.collection('excoMembers').get();
      const list = snap.docs.map(d => d.data() as ExcoMember);
      list.forEach(e => fallbackStore.excoMembers.set(e.id, e));
      return list;
    } catch (err) {
      logFallbackNotice('getExcoMembers', err);
      return Array.from(fallbackStore.excoMembers.values());
    }
  }

  async createExcoMember(data: Partial<ExcoMember>): Promise<ExcoMember> {
    const id = data.id || `exco_${Date.now()}`;
    const member: ExcoMember = {
      id,
      fullName: data.fullName || '',
      designation: data.designation || '',
      image: (data as any).image || (data as any).photoUrl || '',
      description: (data as any).description || (data as any).bio || '',
      displayOrder: data.displayOrder || 1,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    fallbackStore.excoMembers.set(id, member);
    try {
      await firestore.collection('excoMembers').doc(id).set(member);
    } catch (err) {
      logFallbackNotice(`createExcoMember:${id}`, err);
    }
    return member;
  }

  async updateExcoMember(id: string, updates: Partial<ExcoMember>): Promise<ExcoMember> {
    const existing = fallbackStore.excoMembers.get(id);
    const updated: ExcoMember = {
      ...(existing || {} as ExcoMember),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.excoMembers.set(id, updated);
    try {
      const docRef = firestore.collection('excoMembers').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateExcoMember:${id}`, err);
    }
    return updated;
  }

  async deleteExcoMember(id: string): Promise<void> {
    fallbackStore.excoMembers.delete(id);
    try {
      await firestore.collection('excoMembers').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteExcoMember:${id}`, err);
    }
  }

  async getClubRules(): Promise<ClubRulesData> {
    try {
      const doc = await firestore.collection('clubRules').doc('main').get();
      if (doc.exists) {
        const r = doc.data() as ClubRulesData;
        fallbackStore.rules = r;
        return r;
      }
      return fallbackStore.rules;
    } catch (err) {
      logFallbackNotice('getClubRules', err);
      return fallbackStore.rules;
    }
  }

  async updateClubRules(data: Partial<ClubRulesData>, updatedBy?: string): Promise<ClubRulesData> {
    const payload = { ...fallbackStore.rules, ...data, updatedBy: updatedBy || 'system', updatedAt: new Date().toISOString() };
    fallbackStore.rules = payload as ClubRulesData;
    try {
      await firestore.collection('clubRules').doc('main').set(payload, { merge: true });
    } catch (err) {
      logFallbackNotice('updateClubRules', err);
    }
    return payload as ClubRulesData;
  }

  async getPresidentialDirectives(): Promise<PresidentialDirective[]> {
    try {
      const snap = await firestore.collection('presidentialDirectives').get();
      const list = snap.docs.map(d => d.data() as PresidentialDirective);
      list.forEach(p => fallbackStore.directives.set(p.id, p));
      return list;
    } catch (err) {
      logFallbackNotice('getPresidentialDirectives', err);
      return Array.from(fallbackStore.directives.values());
    }
  }

  async createPresidentialDirective(data: Partial<PresidentialDirective>): Promise<PresidentialDirective> {
    const id = data.id || `dir_${Date.now()}`;
    const item: PresidentialDirective = {
      id,
      directiveNumber: data.directiveNumber || '',
      title: data.title || '',
      issueDate: data.issueDate || new Date().toISOString().split('T')[0],
      effectiveDate: data.effectiveDate || new Date().toISOString().split('T')[0],
      body: data.body || (data as any).content || '',
      description: data.description || '',
      priority: data.priority || 'normal',
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    fallbackStore.directives.set(id, item);
    try {
      await firestore.collection('presidentialDirectives').doc(id).set(item);
    } catch (err) {
      logFallbackNotice(`createPresidentialDirective:${id}`, err);
    }
    return item;
  }

  async updatePresidentialDirective(id: string, updates: Partial<PresidentialDirective>): Promise<PresidentialDirective> {
    const existing = fallbackStore.directives.get(id);
    const updated: PresidentialDirective = {
      ...(existing || {} as PresidentialDirective),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.directives.set(id, updated);
    try {
      const docRef = firestore.collection('presidentialDirectives').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updatePresidentialDirective:${id}`, err);
    }
    return updated;
  }

  async deletePresidentialDirective(id: string): Promise<void> {
    fallbackStore.directives.delete(id);
    try {
      await firestore.collection('presidentialDirectives').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deletePresidentialDirective:${id}`, err);
    }
  }

  async getOfficialCirculars(): Promise<OfficialCircular[]> {
    try {
      const snap = await firestore.collection('officialCirculars').get();
      const list = snap.docs.map(d => d.data() as OfficialCircular);
      list.forEach(c => fallbackStore.circulars.set(c.id, c));
      return list;
    } catch (err) {
      logFallbackNotice('getOfficialCirculars', err);
      return Array.from(fallbackStore.circulars.values());
    }
  }

  async createOfficialCircular(data: Partial<OfficialCircular>): Promise<OfficialCircular> {
    const id = data.id || `circ_${Date.now()}`;
    const item: OfficialCircular = {
      id,
      circularNumber: data.circularNumber || '',
      title: data.title || '',
      issueDate: (data as any).issueDate || (data as any).publishDate || new Date().toISOString().split('T')[0],
      content: data.content || '',
      targetAudience: data.targetAudience || 'all_members',
      status: data.status || 'published',
      attachmentUrl: (data as any).attachmentUrl || ((data as any).attachments?.[0] || ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    fallbackStore.circulars.set(id, item);
    try {
      await firestore.collection('officialCirculars').doc(id).set(item);
    } catch (err) {
      logFallbackNotice(`createOfficialCircular:${id}`, err);
    }
    return item;
  }

  async updateOfficialCircular(id: string, updates: Partial<OfficialCircular>): Promise<OfficialCircular> {
    const existing = fallbackStore.circulars.get(id);
    const updated: OfficialCircular = {
      ...(existing || {} as OfficialCircular),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.circulars.set(id, updated);
    try {
      const docRef = firestore.collection('officialCirculars').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateOfficialCircular:${id}`, err);
    }
    return updated;
  }

  async deleteOfficialCircular(id: string): Promise<void> {
    fallbackStore.circulars.delete(id);
    try {
      await firestore.collection('officialCirculars').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteOfficialCircular:${id}`, err);
    }
  }

  // -------------------------------------------------------------
  // RAMAZAN QUIZ
  // -------------------------------------------------------------
  async getQuizQuestions(): Promise<QuizQuestion[]> {
    try {
      const snap = await firestore.collection('quizQuestions').get();
      const list = snap.docs.map(d => d.data() as QuizQuestion);
      list.forEach(q => fallbackStore.quizQuestions.set(q.id, q));
      return list;
    } catch (err) {
      logFallbackNotice('getQuizQuestions', err);
      return Array.from(fallbackStore.quizQuestions.values());
    }
  }

  async createQuizQuestion(data: Partial<QuizQuestion>): Promise<QuizQuestion> {
    const id = data.id || `quiz_${Date.now()}`;
    const question: QuizQuestion = {
      id,
      questionNumber: data.questionNumber || 1,
      title: data.title || '',
      questionText: data.questionText || '',
      options: data.options || [],
      correctOptionId: data.correctOptionId || '',
      answerExplanation: data.answerExplanation || '',
      prizeTitle: data.prizeTitle || '',
      prizeId: data.prizeId || '',
      sponsorName: data.sponsorName || '',
      sponsorId: data.sponsorId || '',
      status: data.status || 'draft',
      publishAt: data.publishAt || new Date().toISOString(),
      closeAt: data.closeAt || new Date().toISOString(),
      drawStartAt: data.drawStartAt || data.closeAt || new Date().toISOString(),
      revealAt: data.revealAt || data.closeAt || new Date().toISOString(),
      rollingDurationSeconds: data.rollingDurationSeconds || 10,
      winnerDisplayDurationSeconds: data.winnerDisplayDurationSeconds || 10,
      displayOrder: data.displayOrder || 1,
      questionImage: (data as any).questionImage || (data as any).bannerImage || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    fallbackStore.quizQuestions.set(id, question);
    try {
      await firestore.collection('quizQuestions').doc(id).set(question);
    } catch (err) {
      logFallbackNotice(`createQuizQuestion:${id}`, err);
    }
    return question;
  }

  async updateQuizQuestion(id: string, updates: Partial<QuizQuestion>): Promise<QuizQuestion> {
    const existing = fallbackStore.quizQuestions.get(id);
    const updated: QuizQuestion = {
      ...(existing || {} as QuizQuestion),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.quizQuestions.set(id, updated);
    try {
      const docRef = firestore.collection('quizQuestions').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateQuizQuestion:${id}`, err);
    }
    return updated;
  }

  async deleteQuizQuestion(id: string): Promise<{ deletedSubmissionsCount: number; deletedWinnersCount: number }> {
    let subCount = 0;
    let winCount = 0;
    fallbackStore.quizQuestions.delete(id);

    for (const [subId, sub] of fallbackStore.quizSubmissions.entries()) {
      if (sub.questionId === id) {
        fallbackStore.quizSubmissions.delete(subId);
        subCount++;
      }
    }
    for (const [winId, win] of fallbackStore.quizWinners.entries()) {
      if (win.questionId === id) {
        fallbackStore.quizWinners.delete(winId);
        winCount++;
      }
    }

    try {
      const subSnap = await firestore.collection('quizSubmissions').where('questionId', '==', id).get();
      const winSnap = await firestore.collection('quizWinners').where('questionId', '==', id).get();

      const batch = firestore.batch();
      batch.delete(firestore.collection('quizQuestions').doc(id));
      subSnap.docs.forEach(d => batch.delete(d.ref));
      winSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      return { deletedSubmissionsCount: subSnap.size, deletedWinnersCount: winSnap.size };
    } catch (err) {
      logFallbackNotice(`deleteQuizQuestion:${id}`, err);
      return { deletedSubmissionsCount: subCount, deletedWinnersCount: winCount };
    }
  }

  async getQuizSubmissions(): Promise<QuizSubmission[]> {
    try {
      const snap = await firestore.collection('quizSubmissions').get();
      const list = snap.docs.map(d => d.data() as QuizSubmission);
      list.forEach(s => fallbackStore.quizSubmissions.set(s.id, s));
      return list;
    } catch (err) {
      logFallbackNotice('getQuizSubmissions', err);
      return Array.from(fallbackStore.quizSubmissions.values());
    }
  }

  async createQuizSubmission(data: Partial<QuizSubmission>): Promise<QuizSubmission> {
    const questionId = data.questionId || '';
    const normId = (data.normalizedIdNumber || data.idNumber || '').toUpperCase().trim();
    const docId = data.id || `sub_${questionId}_${normId}`;

    let participantNumber = data.participantNumber;
    if (!participantNumber) {
      const nextNum = (fallbackStore.counters.get('quizParticipants') || 1);
      fallbackStore.counters.set('quizParticipants', nextNum + 1);
      participantNumber = `ARC-Q-${String(nextNum).padStart(5, '0')}`;
    }

    const resultSubmission: QuizSubmission = {
      id: docId,
      participantNumber,
      questionId,
      participantName: data.participantName || '',
      idNumber: data.idNumber || normId,
      normalizedIdNumber: normId,
      contactNumber: data.contactNumber || '',
      selectedOptionId: data.selectedOptionId || '',
      isCorrect: Boolean(data.isCorrect),
      isEligible: Boolean(data.isEligible),
      isInvalid: Boolean(data.isInvalid),
      isDisqualified: Boolean(data.isDisqualified),
      disqualificationReason: data.disqualificationReason || '',
      maskedIdNumber: data.maskedIdNumber || (normId.length > 4 ? `${normId.substring(0, 2)}***${normId.substring(normId.length - 2)}` : '***'),
      maskedContactNumber: data.maskedContactNumber || (data.contactNumber ? `${data.contactNumber.substring(0, 3)}****${data.contactNumber.slice(-2)}` : '****'),
      submittedAt: data.submittedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };

    fallbackStore.quizSubmissions.set(docId, resultSubmission);

    try {
      const subRef = firestore.collection('quizSubmissions').doc(docId);
      await subRef.set(resultSubmission, { merge: true });
    } catch (err) {
      logFallbackNotice(`createQuizSubmission:${docId}`, err);
    }

    return resultSubmission;
  }

  async updateQuizSubmission(id: string, updates: Partial<QuizSubmission>): Promise<QuizSubmission> {
    const existing = fallbackStore.quizSubmissions.get(id);
    const updated: QuizSubmission = {
      ...(existing || {} as QuizSubmission),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.quizSubmissions.set(id, updated);
    try {
      const docRef = firestore.collection('quizSubmissions').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateQuizSubmission:${id}`, err);
    }
    return updated;
  }

  async deleteQuizSubmission(id: string): Promise<void> {
    fallbackStore.quizSubmissions.delete(id);
    try {
      await firestore.collection('quizSubmissions').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteQuizSubmission:${id}`, err);
    }
  }

  async disqualifyQuizSubmission(id: string, isDisqualified: boolean, reason: string): Promise<QuizSubmission> {
    const existing = fallbackStore.quizSubmissions.get(id);
    const isEligible = Boolean(existing?.isCorrect && !isDisqualified);
    const updated: QuizSubmission = {
      ...(existing || {} as QuizSubmission),
      id,
      isDisqualified,
      disqualificationReason: reason,
      isEligible,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.quizSubmissions.set(id, updated);
    try {
      const docRef = firestore.collection('quizSubmissions').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`disqualifyQuizSubmission:${id}`, err);
    }
    return updated;
  }

  async getQuizWinners(): Promise<QuizWinner[]> {
    try {
      const snap = await firestore.collection('quizWinners').get();
      const list = snap.docs.map(d => d.data() as QuizWinner);
      list.forEach(w => fallbackStore.quizWinners.set(w.id, w));
      return list;
    } catch (err) {
      logFallbackNotice('getQuizWinners', err);
      return Array.from(fallbackStore.quizWinners.values());
    }
  }

  async createQuizWinner(data: Partial<QuizWinner>): Promise<QuizWinner> {
    const id = data.id || `win_${Date.now()}`;
    const winner: QuizWinner = {
      id,
      questionId: data.questionId || '',
      submissionId: data.submissionId || '',
      participantNumber: data.participantNumber || '',
      participantName: (data as any).participantName || '',
      idNumber: (data as any).idNumber || '',
      contactNumber: (data as any).contactNumber || '',
      maskedIdNumber: data.maskedIdNumber || '***',
      maskedContactNumber: data.maskedContactNumber || '****',
      prizeTitle: data.prizeTitle || '',
      prizeId: data.prizeId || '',
      sponsorName: data.sponsorName || '',
      sponsorId: data.sponsorId || '',
      eligibleCount: data.eligibleCount || 0,
      selectedAt: data.selectedAt || new Date().toISOString(),
      selectedBy: data.selectedBy || 'system',
      selectionMethod: data.selectionMethod || 'random',
      auditReference: data.auditReference || `DRAW-${Date.now()}`,
      contactedStatus: data.contactedStatus || 'not_contacted',
      prizeCollectionStatus: data.prizeCollectionStatus || 'pending',
      publicStatus: data.publicStatus || 'published',
      isReplaced: Boolean(data.isReplaced),
      replacementReason: data.replacementReason || '',
      internalNotes: data.internalNotes || '',
      ...(data as any)
    };
    fallbackStore.quizWinners.set(id, winner);
    try {
      await firestore.collection('quizWinners').doc(id).set(winner);
    } catch (err) {
      logFallbackNotice(`createQuizWinner:${id}`, err);
    }
    return winner;
  }

  async updateQuizWinner(id: string, updates: Partial<QuizWinner>): Promise<QuizWinner> {
    const existing = fallbackStore.quizWinners.get(id);
    const updated: QuizWinner = {
      ...(existing || {} as QuizWinner),
      ...updates,
      id
    };
    fallbackStore.quizWinners.set(id, updated);
    try {
      const docRef = firestore.collection('quizWinners').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateQuizWinner:${id}`, err);
    }
    return updated;
  }

  async deleteQuizWinner(id: string): Promise<void> {
    fallbackStore.quizWinners.delete(id);
    try {
      await firestore.collection('quizWinners').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteQuizWinner:${id}`, err);
    }
  }

  async drawQuizWinner(questionId: string, selectedByUsername: string = 'system'): Promise<{ winner: QuizWinner; eligibleCount: number }> {
    const q = (await this.getQuizQuestions()).find(item => item.id === questionId);
    if (!q) throw new Error('Quiz question not found.');

    const ineligible = await this.getIneligibleParticipantIds();
    const ineligibleSet = new Set(ineligible);

    const submissions = await this.getQuizSubmissions();
    const candidates = submissions
      .filter(s =>
        s.questionId === questionId &&
        s.isCorrect &&
        !s.isDisqualified &&
        !s.isInvalid &&
        !ineligibleSet.has((s.normalizedIdNumber || '').toUpperCase())
      );

    if (candidates.length === 0) {
      throw new Error('No eligible candidates found for this lucky draw.');
    }

    const randomIndex = crypto.randomInt(0, candidates.length);
    const chosen = candidates[randomIndex];
    const auditRef = `SYS-DRAW-${Date.now().toString(36).toUpperCase()}`;

    const winner = await this.createQuizWinner({
      questionId,
      submissionId: chosen.id,
      participantNumber: chosen.participantNumber,
      participantName: (chosen as any).participantName || chosen.maskedIdNumber || 'Participant',
      idNumber: chosen.normalizedIdNumber || chosen.idNumber,
      contactNumber: chosen.contactNumber,
      maskedIdNumber: chosen.maskedIdNumber,
      maskedContactNumber: chosen.maskedContactNumber,
      prizeTitle: q.prizeTitle || 'Quiz Prize',
      prizeId: q.prizeId || '',
      sponsorName: q.sponsorName || '',
      sponsorId: q.sponsorId || '',
      eligibleCount: candidates.length,
      selectedAt: new Date().toISOString(),
      selectedBy: selectedByUsername,
      selectionMethod: 'random',
      auditReference: auditRef,
      contactedStatus: 'not_contacted',
      prizeCollectionStatus: 'pending',
      publicStatus: 'published'
    });

    await this.updateQuizQuestion(questionId, { status: 'completed' });
    return { winner, eligibleCount: candidates.length };
  }

  async reselectQuizWinner(winnerId: string, reason: string, replacedByUsername: string = 'system'): Promise<{ oldWinner: QuizWinner; newWinner: QuizWinner }> {
    const winners = await this.getQuizWinners();
    const oldWinner = winners.find(w => w.id === winnerId);
    if (!oldWinner) throw new Error('Existing winner record not found.');

    const questionId = oldWinner.questionId;
    const questions = await this.getQuizQuestions();
    const q = questions.find(item => item.id === questionId);

    const ineligible = await this.getIneligibleParticipantIds();
    const ineligibleSet = new Set(ineligible);

    const usedSubmissionIds = new Set(winners.filter(w => w.questionId === questionId).map(w => w.submissionId));

    const submissions = await this.getQuizSubmissions();
    const candidates = submissions
      .filter(s =>
        s.questionId === questionId &&
        s.isCorrect &&
        !s.isDisqualified &&
        !s.isInvalid &&
        !usedSubmissionIds.has(s.id) &&
        !ineligibleSet.has((s.normalizedIdNumber || '').toUpperCase())
      );

    if (candidates.length === 0) {
      throw new Error('No additional eligible candidates available for replacement.');
    }

    const randomIndex = crypto.randomInt(0, candidates.length);
    const chosen = candidates[randomIndex];
    const auditRef = `RESELECT-${Date.now().toString(36).toUpperCase()}`;

    await this.updateQuizWinner(winnerId, {
      isReplaced: true,
      replacementReason: reason,
      publicStatus: 'hidden'
    });

    const newWinner = await this.createQuizWinner({
      questionId,
      submissionId: chosen.id,
      participantNumber: chosen.participantNumber,
      participantName: (chosen as any).participantName || chosen.maskedIdNumber || 'Participant',
      idNumber: chosen.normalizedIdNumber || chosen.idNumber,
      contactNumber: chosen.contactNumber,
      maskedIdNumber: chosen.maskedIdNumber,
      maskedContactNumber: chosen.maskedContactNumber,
      prizeTitle: q?.prizeTitle || oldWinner.prizeTitle || 'Quiz Prize',
      prizeId: q?.prizeId || oldWinner.prizeId || '',
      sponsorName: q?.sponsorName || oldWinner.sponsorName || '',
      sponsorId: q?.sponsorId || oldWinner.sponsorId || '',
      eligibleCount: candidates.length,
      selectedAt: new Date().toISOString(),
      selectedBy: replacedByUsername,
      selectionMethod: 'manual_reselect',
      auditReference: auditRef,
      contactedStatus: 'not_contacted',
      prizeCollectionStatus: 'pending',
      publicStatus: 'published',
      internalNotes: `Replacement for winner #${oldWinner.participantNumber}. Reason: ${reason}`
    });

    return { oldWinner, newWinner };
  }

  async getPrizes(): Promise<QuizPrize[]> {
    try {
      const snap = await firestore.collection('quizPrizes').get();
      const list = snap.docs.map(d => d.data() as QuizPrize);
      list.forEach(p => fallbackStore.quizPrizes.set(p.id, p));
      return list;
    } catch (err) {
      logFallbackNotice('getPrizes', err);
      return Array.from(fallbackStore.quizPrizes.values());
    }
  }

  async createPrize(data: Partial<QuizPrize>): Promise<QuizPrize> {
    const id = data.id || `prize_${Date.now()}`;
    const prize: QuizPrize = {
      id,
      title: data.title || '',
      description: data.description || '',
      image: (data as any).image || (data as any).imageUrl || '',
      sponsorName: data.sponsorName || '',
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    fallbackStore.quizPrizes.set(id, prize);
    try {
      await firestore.collection('quizPrizes').doc(id).set(prize);
    } catch (err) {
      logFallbackNotice(`createPrize:${id}`, err);
    }
    return prize;
  }

  async updatePrize(id: string, updates: Partial<QuizPrize>): Promise<QuizPrize> {
    const existing = fallbackStore.quizPrizes.get(id);
    const updated: QuizPrize = {
      ...(existing || {} as QuizPrize),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.quizPrizes.set(id, updated);
    try {
      const docRef = firestore.collection('quizPrizes').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updatePrize:${id}`, err);
    }
    return updated;
  }

  async deletePrize(id: string): Promise<void> {
    fallbackStore.quizPrizes.delete(id);
    try {
      await firestore.collection('quizPrizes').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deletePrize:${id}`, err);
    }
  }

  async getSponsors(): Promise<QuizSponsor[]> {
    try {
      const snap = await firestore.collection('quizSponsors').get();
      const list = snap.docs.map(d => d.data() as QuizSponsor);
      list.forEach(s => fallbackStore.quizSponsors.set(s.id, s));
      return list;
    } catch (err) {
      logFallbackNotice('getSponsors', err);
      return Array.from(fallbackStore.quizSponsors.values());
    }
  }

  async createSponsor(data: Partial<QuizSponsor>): Promise<QuizSponsor> {
    const id = data.id || `sponsor_${Date.now()}`;
    const sponsor: QuizSponsor = {
      id,
      name: data.name || '',
      logo: (data as any).logo || (data as any).logoUrl || '',
      websiteUrl: data.websiteUrl || '',
      status: data.status || 'active',
      displayOrder: data.displayOrder || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    fallbackStore.quizSponsors.set(id, sponsor);
    try {
      await firestore.collection('quizSponsors').doc(id).set(sponsor);
    } catch (err) {
      logFallbackNotice(`createSponsor:${id}`, err);
    }
    return sponsor;
  }

  async updateSponsor(id: string, updates: Partial<QuizSponsor>): Promise<QuizSponsor> {
    const existing = fallbackStore.quizSponsors.get(id);
    const updated: QuizSponsor = {
      ...(existing || {} as QuizSponsor),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.quizSponsors.set(id, updated);
    try {
      const docRef = firestore.collection('quizSponsors').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateSponsor:${id}`, err);
    }
    return updated;
  }

  async deleteSponsor(id: string): Promise<void> {
    fallbackStore.quizSponsors.delete(id);
    try {
      await firestore.collection('quizSponsors').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteSponsor:${id}`, err);
    }
  }

  async getIneligibleParticipantIds(): Promise<string[]> {
    try {
      const doc = await firestore.collection('masterIneligibleParticipants').doc('main').get();
      if (doc.exists) {
        const ids = (doc.data()?.ineligibleIds || []) as string[];
        fallbackStore.ineligibleIds = ids;
        return ids;
      }
      return fallbackStore.ineligibleIds;
    } catch (err) {
      logFallbackNotice('getIneligibleParticipantIds', err);
      return fallbackStore.ineligibleIds;
    }
  }

  async addIneligibleParticipantId(idNumber: string, reason?: string): Promise<void> {
    const cleanId = (idNumber || '').trim().toUpperCase();
    if (!fallbackStore.ineligibleIds.includes(cleanId)) {
      fallbackStore.ineligibleIds.push(cleanId);
    }
    try {
      const docRef = firestore.collection('masterIneligibleParticipants').doc('main');
      await docRef.set({ ineligibleIds: fallbackStore.ineligibleIds, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      logFallbackNotice(`addIneligibleParticipantId:${cleanId}`, err);
    }
  }

  async removeIneligibleParticipantId(idNumber: string): Promise<void> {
    const cleanId = (idNumber || '').trim().toUpperCase();
    fallbackStore.ineligibleIds = fallbackStore.ineligibleIds.filter(id => id !== cleanId);
    try {
      const docRef = firestore.collection('masterIneligibleParticipants').doc('main');
      await docRef.set({ ineligibleIds: fallbackStore.ineligibleIds, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      logFallbackNotice(`removeIneligibleParticipantId:${cleanId}`, err);
    }
  }

  async setMasterParticipantEligibility(idNumber: string, isBlocked: boolean, reason?: string): Promise<void> {
    const cleanId = (idNumber || '').trim().toUpperCase();
    if (isBlocked) {
      await this.addIneligibleParticipantId(cleanId, reason || 'Disqualified by administrator');
    } else {
      await this.removeIneligibleParticipantId(cleanId);
    }

    for (const [subId, sub] of fallbackStore.quizSubmissions.entries()) {
      if ((sub.normalizedIdNumber || '').toUpperCase() === cleanId) {
        sub.isDisqualified = isBlocked;
        sub.isEligible = isBlocked ? false : Boolean(sub.isCorrect);
        sub.disqualificationReason = isBlocked ? (reason || 'Master participant ID blocked') : '';
        sub.updatedAt = new Date().toISOString();
        fallbackStore.quizSubmissions.set(subId, sub);
      }
    }

    try {
      const snap = await firestore.collection('quizSubmissions').where('normalizedIdNumber', '==', cleanId).get();
      if (!snap.empty) {
        const batch = firestore.batch();
        snap.docs.forEach(doc => {
          const sub = doc.data() as QuizSubmission;
          const isEligible = isBlocked ? false : Boolean(sub.isCorrect);
          batch.update(doc.ref, {
            isDisqualified: isBlocked,
            isEligible,
            disqualificationReason: isBlocked ? (reason || 'Master participant ID blocked') : '',
            updatedAt: new Date().toISOString()
          });
        });
        await batch.commit();
      }
    } catch (err) {
      logFallbackNotice(`setMasterParticipantEligibility:${cleanId}`, err);
    }
  }

  async deleteMasterParticipant(idNumber: string): Promise<{ deletedSubmissionsCount: number; deletedWinnersCount: number }> {
    const cleanId = (idNumber || '').trim().toUpperCase();
    await this.removeIneligibleParticipantId(cleanId);

    let subCount = 0;
    let winCount = 0;

    for (const [subId, sub] of fallbackStore.quizSubmissions.entries()) {
      if ((sub.normalizedIdNumber || '').toUpperCase() === cleanId) {
        fallbackStore.quizSubmissions.delete(subId);
        subCount++;
      }
    }
    for (const [winId, win] of fallbackStore.quizWinners.entries()) {
      if ((win.idNumber || '').toUpperCase() === cleanId) {
        fallbackStore.quizWinners.delete(winId);
        winCount++;
      }
    }

    try {
      const subSnap = await firestore.collection('quizSubmissions').where('normalizedIdNumber', '==', cleanId).get();
      const winSnap = await firestore.collection('quizWinners').where('idNumber', '==', cleanId).get();
      const batch = firestore.batch();
      subSnap.docs.forEach(d => batch.delete(d.ref));
      winSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      return { deletedSubmissionsCount: subSnap.size, deletedWinnersCount: winSnap.size };
    } catch (err) {
      logFallbackNotice(`deleteMasterParticipant:${cleanId}`, err);
      return { deletedSubmissionsCount: subCount, deletedWinnersCount: winCount };
    }
  }

  // ALIAS FOR AUDIT LOGS
  async createAuditLog(data: any): Promise<void> {
    await this.logAudit({
      userId: data.userId,
      username: data.username,
      action: data.action,
      module: data.module,
      recordId: data.targetId || data.recordId,
      reason: data.details || data.reason
    });
  }

  // MESSAGES & INBOX ALIASES
  async getMessages(): Promise<any[]> {
    return this.getInboxMessages();
  }

  async createMessage(data: any): Promise<any> {
    return this.createInboxMessage(data);
  }

  async updateMessage(id: string, updates: any): Promise<any> {
    return this.updateInboxMessage(id, updates);
  }

  async deleteMessage(id: string): Promise<void> {
    await this.deleteInboxMessage(id);
  }

  async recordMessageAction(id: string, actionData: any): Promise<any> {
    const list = await this.getInboxMessages();
    const msg = list.find(m => m.id === id);
    const actions = [...(msg?.actions || [])];
    actions.push({ ...actionData, timestamp: new Date().toISOString() });
    return this.updateInboxMessage(id, { actions });
  }

  // NOTIFICATIONS ALIASES
  async getNotifications(userId?: string): Promise<any[]> {
    return this.getAppNotifications(userId);
  }

  async createNotification(data: any): Promise<any> {
    return this.createAppNotification(data);
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    for (const [id, notif] of fallbackStore.appNotifications.entries()) {
      const readBy = notif.readBy || [];
      if (!readBy.includes(userId)) {
        readBy.push(userId);
        notif.readBy = readBy;
        fallbackStore.appNotifications.set(id, notif);
      }
    }
    try {
      const snap = await firestore.collection('appNotifications').get();
      if (snap.empty) return;
      const batch = firestore.batch();
      snap.docs.forEach(doc => {
        const data = doc.data() as AppNotification;
        const readBy = data.readBy || [];
        if (!readBy.includes(userId)) {
          readBy.push(userId);
          batch.update(doc.ref, { readBy });
        }
      });
      await batch.commit();
    } catch (err) {
      logFallbackNotice('markAllNotificationsRead', err);
    }
  }

  // BUDGET ADVANCED METHODS
  async transferAccountFunds(data: Partial<AccountTransferRecord>): Promise<AccountTransferRecord> {
    return this.createAccountTransfer(data);
  }

  async approveExpensePayment(
    id: string,
    user: { id: string; fullName?: string; username: string },
    status: string = 'approved',
    releasePayment: boolean = true,
    accountId?: string,
    remarks?: string
  ): Promise<ExpenseRecord> {
    const existing = fallbackStore.expenseRecords.get(id);
    const updates: Partial<ExpenseRecord> & { [key: string]: any } = {
      ...(existing || {} as ExpenseRecord),
      id,
      status: status as any,
      approvedBy: user.id,
      approvalStatus: status === 'approved' ? 'approved' : 'rejected',
      paymentReleaseApproved: releasePayment,
      paymentReleasedAt: releasePayment ? new Date().toISOString() : undefined,
      paymentReleasedBy: releasePayment ? user.id : undefined,
      approvalRemarks: remarks || existing?.notes,
      updatedAt: new Date().toISOString()
    };
    if (accountId) updates.accountId = accountId;
    fallbackStore.expenseRecords.set(id, updates as ExpenseRecord);

    try {
      const docRef = firestore.collection('expenseRecords').doc(id);
      await docRef.set(updates, { merge: true });
    } catch (err) {
      logFallbackNotice(`approveExpensePayment:${id}`, err);
    }
    return updates as ExpenseRecord;
  }

  async getNextInvoiceNumber(type: 'invoice' | 'quotation' = 'invoice'): Promise<string> {
    const prefix = type === 'quotation' ? 'QTN' : 'INV';
    const year = new Date().getFullYear();
    try {
      const snap = await firestore.collection('invoices').where('type', '==', type).get();
      const count = snap.size + 1;
      return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
    } catch (err) {
      logFallbackNotice('getNextInvoiceNumber', err);
      const count = Array.from(fallbackStore.invoices.values()).filter(i => i.type === type).length + 1;
      return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
    }
  }

  async approveInvoice(
    id: string,
    user: { id: string; fullName?: string; username: string },
    status: string = 'approved',
    remarks?: string
  ): Promise<InvoiceRecord> {
    const existing = fallbackStore.invoices.get(id);
    const updates: any = {
      ...(existing || {} as InvoiceRecord),
      id,
      status: status === 'approved' ? 'approved' : status,
      approvalStatus: status,
      approvedBy: user.id,
      approvedByName: user.fullName || user.username,
      approvedAt: new Date().toISOString(),
      approvalRemarks: remarks || '',
      updatedAt: new Date().toISOString()
    };
    fallbackStore.invoices.set(id, updates);

    try {
      const docRef = firestore.collection('invoices').doc(id);
      await docRef.set(updates, { merge: true });
    } catch (err) {
      logFallbackNotice(`approveInvoice:${id}`, err);
    }
    return updates;
  }

  async collectInvoicePayment(id: string, paymentData: any): Promise<{ invoice: InvoiceRecord; incomeRecord: IncomeRecord }> {
    const existing = fallbackStore.invoices.get(id);
    const invoice = existing || {} as InvoiceRecord;

    const amount = Number(paymentData.amount || invoice.totalNetPayments || 0);
    const newPaidAmount = (invoice.amountPaid || 0) + amount;
    const newStatus: InvoiceStatus = newPaidAmount >= (invoice.totalNetPayments || 0) ? 'paid' : 'sent';

    const updatedInvoice: InvoiceRecord = {
      ...invoice,
      id,
      amountPaid: newPaidAmount,
      amountDue: Math.max(0, (invoice.totalNetPayments || 0) - newPaidAmount),
      status: newStatus,
      paymentMethod: paymentData.paymentMethod || 'online',
      receivedBy: paymentData.receivedBy,
      receivedDate: paymentData.receivedDate || new Date().toISOString(),
      referenceNumber: paymentData.referenceNumber,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.invoices.set(id, updatedInvoice);

    try {
      const docRef = firestore.collection('invoices').doc(id);
      await docRef.set(updatedInvoice, { merge: true });
    } catch (err) {
      logFallbackNotice(`collectInvoicePayment:${id}`, err);
    }

    const incomeRecord = await this.createIncomeRecord({
      title: `Payment received for ${invoice.type || 'invoice'} ${invoice.invoiceNumber || id} (${invoice.billTo || 'Client'})`,
      amount,
      category: (paymentData.category || 'other') as IncomeCategory,
      accountId: paymentData.accountId || 'acc_primary_001',
      date: paymentData.receivedDate || new Date().toISOString(),
      notes: paymentData.notes || `Invoice Payment Reference: ${paymentData.referenceNumber || invoice.invoiceNumber}`,
      receivedFrom: invoice.billTo || 'Client',
      referenceNumber: paymentData.referenceNumber || `REC-${Date.now().toString().slice(-5)}`
    });

    return { invoice: updatedInvoice, incomeRecord };
  }

  async processContributionPayment(data: any): Promise<{ contribution: MemberContributionRecord; incomeRecord: IncomeRecord; totalPaid: number; discountGiven: number; finesCollected: number }> {
    const { memberId, year, month, amount, discount = 0, fines = 0, accountId = 'acc_primary_001', paymentMethod = 'bank_transfer', receiptNumber, recordedBy } = data;
    const docId = `contrib_${memberId}_${year}_${month}`;

    const members = await this.getMembers();
    const member = members.find(m => m.id === memberId);

    const totalPaid = Number(amount || 0);
    const discountGiven = Number(discount || 0);
    const finesCollected = Number(fines || 0);

    const existing = fallbackStore.memberContributions.get(docId);
    const record: MemberContributionRecord = {
      id: docId,
      memberId,
      memberNumber: member?.memberNumber || '',
      memberName: member?.fullName || '',
      year: Number(year),
      month: Number(month),
      baseAmount: totalPaid,
      fineDays: 0,
      finePerDay: 5,
      fineAmount: finesCollected,
      discountAmount: discountGiven,
      totalPayable: totalPaid,
      paidAmount: totalPaid,
      dueDate: `${year}-${String(month).padStart(2, '0')}-10`,
      status: 'paid',
      paidDate: new Date().toISOString(),
      paymentMethod,
      receiptNumber: receiptNumber || `REC-CONTRIB-${Date.now().toString().slice(-4)}`,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    fallbackStore.memberContributions.set(docId, record);
    try {
      const docRef = firestore.collection('memberContributions').doc(docId);
      await docRef.set(record, { merge: true });
    } catch (err) {
      logFallbackNotice(`processContributionPayment:${docId}`, err);
    }

    const incomeRecord = await this.createIncomeRecord({
      title: `Monthly Contribution (${month}/${year}) - ${member?.fullName || memberId}`,
      amount: totalPaid,
      category: 'membership_fees' as IncomeCategory,
      accountId,
      date: new Date().toISOString(),
      notes: `Membership contribution payment recorded by ${recordedBy}. Fines: ${finesCollected} MVR, Discount: ${discountGiven} MVR`,
      receivedFrom: member?.fullName || 'Member',
      referenceNumber: record.receiptNumber
    });

    return { contribution: record, incomeRecord, totalPaid, discountGiven, finesCollected };
  }

  async saveBudgetAllocation(data: Partial<CategoryBudgetAllocation>): Promise<CategoryBudgetAllocation> {
    const id = data.id || `alloc_${data.year || new Date().getFullYear()}_${data.category}`;
    const alloc: CategoryBudgetAllocation = {
      id,
      year: data.year || new Date().getFullYear(),
      category: data.category || 'other',
      categoryLabel: data.categoryLabel || data.category || 'General',
      allocatedAmount: data.allocatedAmount || 0,
      spentAmount: data.spentAmount || 0,
      notes: data.notes || '',
      updatedAt: new Date().toISOString()
    };
    fallbackStore.budgetAllocations.set(id, alloc);
    try {
      await firestore.collection('budgetAllocations').doc(id).set(alloc, { merge: true });
    } catch (err) {
      logFallbackNotice(`saveBudgetAllocation:${id}`, err);
    }
    return alloc;
  }

  async deleteBudgetAllocation(id: string): Promise<void> {
    fallbackStore.budgetAllocations.delete(id);
    try {
      await firestore.collection('budgetAllocations').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteBudgetAllocation:${id}`, err);
    }
  }

  async setIneligibleParticipantIds(ineligibleIds: string[]): Promise<void> {
    fallbackStore.ineligibleIds = ineligibleIds;
    try {
      await firestore.collection('masterIneligibleParticipants').doc('main').set({
        ineligibleIds,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      logFallbackNotice('setIneligibleParticipantIds', err);
    }
  }

  // -------------------------------------------------------------
  // AUDIT LOGS, INBOX & NOTIFICATIONS
  // -------------------------------------------------------------
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const snap = await firestore.collection('auditLogs').orderBy('createdAt', 'desc').limit(200).get();
      const list = snap.docs.map(d => d.data() as AuditLog);
      list.forEach(l => fallbackStore.auditLogs.set(l.id, l));
      return list;
    } catch (err) {
      logFallbackNotice('getAuditLogs', err);
      return Array.from(fallbackStore.auditLogs.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  async logAudit(data: Partial<AuditLog>): Promise<void> {
    try {
      const id = data.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const log: AuditLog = {
        id,
        createdAt: data.createdAt || (data as any).timestamp || new Date().toISOString(),
        userId: data.userId || 'system',
        username: data.username || 'system',
        fullName: data.fullName || 'System',
        action: data.action || 'GENERAL_ACTION',
        module: data.module || 'system' as any,
        recordId: data.recordId,
        previousValue: data.previousValue,
        newValue: data.newValue,
        reason: data.reason || ''
      };
      fallbackStore.auditLogs.set(id, log);
      await firestore.collection('auditLogs').doc(id).set(log);
    } catch (err: any) {
      logFallbackNotice('logAudit', err);
    }
  }

  async getInboxMessages(): Promise<InboxMessage[]> {
    try {
      const snap = await firestore.collection('inboxMessages').get();
      const list = snap.docs.map(d => d.data() as InboxMessage);
      list.forEach(m => fallbackStore.inboxMessages.set(m.id, m));
      return list;
    } catch (err) {
      logFallbackNotice('getInboxMessages', err);
      return Array.from(fallbackStore.inboxMessages.values());
    }
  }

  async createInboxMessage(data: Partial<InboxMessage>): Promise<InboxMessage> {
    const id = data.id || `msg_${Date.now()}`;
    const msg: InboxMessage = {
      id,
      senderName: data.senderName || '',
      contactInfo: data.contactInfo || '',
      subject: data.subject || '',
      body: data.body || '',
      category: data.category || 'general',
      priority: data.priority || 'normal',
      readBy: data.readBy || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    fallbackStore.inboxMessages.set(id, msg);
    try {
      await firestore.collection('inboxMessages').doc(id).set(msg);
    } catch (err) {
      logFallbackNotice(`createInboxMessage:${id}`, err);
    }
    return msg;
  }

  async updateInboxMessage(id: string, updates: Partial<InboxMessage>): Promise<InboxMessage> {
    const existing = fallbackStore.inboxMessages.get(id);
    const updated: InboxMessage = {
      ...(existing || {} as InboxMessage),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.inboxMessages.set(id, updated);
    try {
      const docRef = firestore.collection('inboxMessages').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateInboxMessage:${id}`, err);
    }
    return updated;
  }

  async updateInboxMessageStatus(id: string, status: 'read' | 'unread' | 'archived'): Promise<InboxMessage> {
    const existing = fallbackStore.inboxMessages.get(id);
    const updated: InboxMessage = {
      ...(existing || {} as InboxMessage),
      id,
      status: (status === 'read' ? 'resolved' : 'pending') as any,
      updatedAt: new Date().toISOString()
    };
    fallbackStore.inboxMessages.set(id, updated);
    try {
      const docRef = firestore.collection('inboxMessages').doc(id);
      await docRef.set(updated, { merge: true });
    } catch (err) {
      logFallbackNotice(`updateInboxMessageStatus:${id}`, err);
    }
    return updated;
  }

  async deleteInboxMessage(id: string): Promise<void> {
    fallbackStore.inboxMessages.delete(id);
    try {
      await firestore.collection('inboxMessages').doc(id).delete();
    } catch (err) {
      logFallbackNotice(`deleteInboxMessage:${id}`, err);
    }
  }

  async getAppNotifications(userId?: string): Promise<AppNotification[]> {
    try {
      const snap = await firestore.collection('appNotifications').get();
      const all = snap.docs.map(d => d.data() as AppNotification);
      all.forEach(n => fallbackStore.appNotifications.set(n.id, n));
      if (!userId) return all;
      return all.filter(n => !n.recipientId || n.recipientId === userId || n.recipientId === 'all');
    } catch (err) {
      logFallbackNotice('getAppNotifications', err);
      const all = Array.from(fallbackStore.appNotifications.values());
      if (!userId) return all;
      return all.filter(n => !n.recipientId || n.recipientId === userId || n.recipientId === 'all');
    }
  }

  async createAppNotification(data: Partial<AppNotification>): Promise<AppNotification> {
    const id = data.id || `notif_${Date.now()}`;
    const notif: AppNotification = {
      id,
      title: data.title || '',
      message: data.message || '',
      type: data.type || 'info',
      recipientId: data.recipientId || 'all',
      readBy: data.readBy || [],
      link: data.link || (data as any).linkUrl || '',
      createdAt: new Date().toISOString(),
      ...(data as any)
    };
    fallbackStore.appNotifications.set(id, notif);
    try {
      await firestore.collection('appNotifications').doc(id).set(notif);
    } catch (err) {
      logFallbackNotice(`createAppNotification:${id}`, err);
    }
    return notif;
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
    const existing = fallbackStore.appNotifications.get(id);
    if (existing) {
      const readBy = existing.readBy || [];
      if (!readBy.includes(userId)) {
        readBy.push(userId);
        existing.readBy = readBy;
        fallbackStore.appNotifications.set(id, existing);
      }
    }
    try {
      const docRef = firestore.collection('appNotifications').doc(id);
      const snap = await docRef.get();
      if (snap.exists) {
        const notif = snap.data() as AppNotification;
        const readBy = notif.readBy || [];
        if (!readBy.includes(userId)) {
          readBy.push(userId);
          await docRef.update({ readBy });
        }
      }
    } catch (err) {
      logFallbackNotice(`markNotificationRead:${id}`, err);
    }
  }

  // -------------------------------------------------------------
  // USER PERFORMANCE PROFILE
  // -------------------------------------------------------------
  async getUserPerformance(userId: string): Promise<UserPerformanceData> {
    const user = await this.getUserById(userId);
    const allMembers = await this.getMembers();
    const linkedMember = allMembers.find(m => m.id === user?.memberId || m.phoneNumber === user?.contactNumber || (m.fullName && m.fullName.toLowerCase() === (user?.fullName || '').toLowerCase()));

    const memberId = user?.memberId || linkedMember?.id;
    const memberNum = linkedMember?.memberNumber;
    const contactClean = (user?.contactNumber || linkedMember?.phoneNumber || '').replace(/[\s-]/g, '');
    const userFullName = (user?.fullName || linkedMember?.fullName || '').trim();

    // 1. QUIZ DATA
    const [questions, submissions, winners] = await Promise.all([
      this.getQuizQuestions(),
      this.getQuizSubmissions(),
      this.getQuizWinners()
    ]);

    const userSubs = submissions.filter(s => {
      const sContact = (s.contactNumber || '').replace(/[\s-]/g, '');
      const matchContact = Boolean(contactClean && sContact && sContact === contactClean);
      const matchMember = Boolean(memberId && (s as any).memberId === memberId);
      const matchName = Boolean(userFullName && s.participantName && s.participantName.toLowerCase().trim() === userFullName.toLowerCase().trim());
      return matchContact || matchMember || matchName;
    });

    const mappedSubmissions = userSubs.map(s => {
      const q = questions.find(item => item.id === s.questionId);
      const nowMs = Date.now();
      const closeMs = q?.closeAt ? new Date(q.closeAt).getTime() : 0;
      const isAnswerRevealed = Boolean(closeMs > 0 && nowMs >= closeMs);

      return {
        id: s.id,
        questionId: s.questionId,
        questionNumber: q ? q.questionNumber : 1,
        questionTitle: q ? (q.title || `Day ${q.questionNumber}`) : 'Quiz Question',
        participantNumber: s.participantNumber,
        submittedAt: s.submittedAt,
        selectedOptionId: s.selectedOptionId,
        isCorrect: s.isCorrect,
        isEligible: s.isEligible,
        isAnswerRevealed,
        prizeTitle: q?.prizeTitle
      };
    });

    const userWins = winners.filter(w => {
      const wContact = (w.contactNumber || '').replace(/[\s-]/g, '');
      const matchContact = Boolean(contactClean && wContact && wContact === contactClean);
      const matchMember = Boolean(memberId && (w as any).memberId === memberId);
      const matchSubmission = userSubs.some(s => s.id === w.submissionId);
      return matchContact || matchMember || matchSubmission;
    });

    const mappedWins = userWins.map((w, i) => {
      const q = questions.find(item => item.id === w.questionId);
      return {
        id: w.id,
        questionNumber: q ? q.questionNumber : (i + 1),
        prizeTitle: w.prizeTitle || 'Lucky Draw Prize',
        sponsorName: w.sponsorName || '',
        selectedAt: w.selectedAt || '',
        prizeCollectionStatus: w.prizeCollectionStatus || 'pending'
      };
    });

    const revealedSubs = mappedSubmissions.filter(s => s.isAnswerRevealed);
    const correctCount = revealedSubs.filter(s => s.isCorrect).length;
    const accuracyRate = revealedSubs.length > 0 ? Math.round((correctCount / revealedSubs.length) * 100) : 0;
    const pendingRevealCount = mappedSubmissions.length - revealedSubs.length;

    // 2. ATTENDANCE DATA
    const events = await this.getEventItems();
    const meetings = await this.getMeetingItems();
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

    events.forEach(e => {
      const record = e.attendance?.find(a => 
        (memberId && a.memberId === memberId) ||
        (userId && a.userId === userId) ||
        (memberNum && a.memberNumber === memberNum) ||
        (userFullName && a.memberName && a.memberName.toLowerCase().trim() === userFullName.toLowerCase().trim())
      );
      if (record) {
        if (record.status === 'present') {
          eventsAttended++;
          totalPresent++;
        } else if (record.status === 'absent') {
          totalAbsent++;
        } else if (record.status === 'excused') {
          totalExcused++;
        }
        attendanceRecords.push({
          type: 'event',
          id: e.id,
          title: e.title,
          date: e.heldDate || '',
          venue: e.venue || '',
          status: record.status,
          notes: record.notes || ''
        });
      }
    });

    meetings.forEach(m => {
      const record = m.attendance?.find(a => 
        (memberId && a.memberId === memberId) ||
        (userId && a.userId === userId) ||
        (memberNum && a.memberNumber === memberNum) ||
        (userFullName && a.memberName && a.memberName.toLowerCase().trim() === userFullName.toLowerCase().trim())
      );
      if (record) {
        if (record.status === 'present') {
          meetingsAttended++;
          totalPresent++;
        } else if (record.status === 'absent') {
          totalAbsent++;
        } else if (record.status === 'excused') {
          totalExcused++;
        }
        attendanceRecords.push({
          type: 'meeting',
          id: m.id,
          title: m.title,
          date: m.heldDate || (m as any).date || '',
          venue: m.venue || '',
          status: record.status,
          notes: record.notes || ''
        });
      }
    });

    attendanceRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalMarked = totalPresent + totalAbsent + totalExcused;
    const attendanceRate = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 100;

    // 3. BUDGET DATA
    let budgetData: any = undefined;
    try {
      const [allContribs, setting, accounts, budgetStats] = await Promise.all([
        this.getMemberContributions(),
        this.getContributionSettings(),
        this.getBankAccounts(),
        this.getBudgetStats().catch(() => null)
      ]);

      const memberContribs = allContribs.filter(c => 
        (memberId && c.memberId === memberId) ||
        (memberNum && c.memberNumber === memberNum)
      );

      const totalPaid = memberContribs.filter(c => c.status === 'paid').reduce((acc, c) => acc + (c.paidAmount || 0), 0);
      const totalFines = memberContribs.reduce((acc, c) => acc + (c.fineAmount || 0), 0);
      const pendingContribs = memberContribs.filter(c => c.status === 'pending');
      const overdueContribs = memberContribs.filter(c => c.status === 'overdue');
      const paidContribs = memberContribs.filter(c => c.status === 'paid');
      const waivedContribs = memberContribs.filter(c => c.status === 'waived');

      const totalPending = pendingContribs.reduce((acc, c) => acc + Math.max(0, (c.totalPayable || 0) - (c.paidAmount || 0)), 0) +
                           overdueContribs.reduce((acc, c) => acc + Math.max(0, (c.totalPayable || 0) - (c.paidAmount || 0)), 0);

      const depositAcc = accounts.find(a => a.id === setting.defaultDepositAccountId) || accounts[0];

      budgetData = {
        summary: {
          totalPaid,
          totalFines,
          totalPending,
          pendingCount: pendingContribs.length,
          overdueCount: overdueContribs.length,
          paidCount: paidContribs.length,
          waivedCount: waivedContribs.length,
          totalMonths: memberContribs.length,
          isUpToDate: overdueContribs.length === 0 && pendingContribs.length === 0,
          monthlyFee: setting.monthlyFee || 100,
          dueDayOfMonth: setting.dueDayOfMonth || 10,
          annualAdvanceDiscountMonths: setting.annualAdvanceDiscountMonths || 2,
          status: overdueContribs.length > 0 ? 'overdue' : (pendingContribs.length > 0 ? 'pending' : 'good_standing'),
          depositAccount: depositAcc ? {
            id: depositAcc.id,
            accountName: depositAcc.accountName,
            accountNumber: depositAcc.accountNumber,
            bankName: depositAcc.bankName,
            currency: depositAcc.currency || 'MVR'
          } : undefined
        },
        contributions: memberContribs.sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month)),
        clubStats: {
          totalClubIncome: budgetStats?.totalIncome || 0,
          totalClubExpenses: budgetStats?.totalExpenses || 0,
          netReserve: budgetStats?.netBalance || 0,
          totalContributionsCollected: budgetStats?.totalContributionsCollected || 0,
          currentYear: new Date().getFullYear()
        }
      };
    } catch (bErr) {
      console.warn('Could not load budget data for user', bErr);
    }

    // 4. BADGES
    const badges: UserPerformanceBadge[] = [
      { id: 'badge_active', title: 'Active Member', description: 'Registered member of ARC Club', icon: 'award', color: 'emerald' }
    ];
    if (userSubs.length >= 5) {
      badges.push({ id: 'badge_quiz', title: 'Quiz Enthusiast', description: 'Participated in 5+ Ramazan Quizzes', icon: 'sparkles', color: 'orange' });
    }
    if (userWins.length > 0) {
      badges.push({ id: 'badge_winner', title: 'Lucky Winner', description: 'Won Ramazan Quiz Lucky Draw Prize', icon: 'trophy', color: 'amber' });
    }
    if (totalPresent >= 3) {
      badges.push({ id: 'badge_attendance', title: 'Dedicated Attendee', description: 'Attended 3+ Club Events & Meetings', icon: 'userCheck', color: 'sky' });
    }
    if (budgetData?.summary?.isUpToDate && budgetData.summary.paidCount > 0) {
      badges.push({ id: 'badge_dues', title: 'Dues Paid', description: 'Membership fees fully up-to-date', icon: 'shield', color: 'purple' });
    }

    const overallScore = Math.min(100, Math.max(10, (totalPresent * 15) + (correctCount * 10) + (userWins.length * 20) + (budgetData?.summary?.isUpToDate ? 15 : 0)));

    return {
      userId,
      username: user?.username || '',
      fullName: user?.fullName || linkedMember?.fullName || '',
      designation: user?.designation || linkedMember?.excoDesignation || '',
      roleName: user?.roleName || (linkedMember?.memberType === 'exco' ? 'EXCO Member' : 'Club Member'),
      status: user?.status || 'active',
      member: linkedMember,
      attendance: {
        eventsAttended,
        totalEvents: events.length,
        meetingsAttended,
        totalMeetings: meetings.length,
        totalPresent,
        totalAbsent,
        totalExcused,
        attendanceRate,
        records: attendanceRecords
      },
      quiz: {
        totalAttempts: mappedSubmissions.length,
        revealedAnswersCount: revealedSubs.length,
        pendingRevealCount,
        correctAnswers: correctCount,
        accuracyRate,
        submissions: mappedSubmissions,
        wins: mappedWins
      },
      activity: {
        messagesCount: 0,
        auditLogsCount: 0
      },
      budget: budgetData,
      overallScore,
      badges
    };
  }

  // -------------------------------------------------------------
  // BACKUP & RESTORE
  // -------------------------------------------------------------
  async getDbTablesSummary(): Promise<{ tables: any[]; totalRecords: number; lastSyncedAt: string }> {
    const tableDefinitions = [
      { key: 'users', name: 'Users & Accounts', nameDh: 'ޔޫޒަރުންނާއި އެކައުންޓްތައް', schema: 'id, username, fullName, roleName, status, pinHash, permissions' },
      { key: 'roles', name: 'Roles & Permissions', nameDh: 'ރޯލްތަކާއި ހުއްދަތައް', schema: 'id, name, description, defaultPermissions' },
      { key: 'clubMembers', name: 'Club Members Registry', nameDh: 'މެންބަރުންގެ ދަފްތަރު', schema: 'id, memberNumber, fullName, idCardNumber, contactNumber, status' },
      { key: 'events', name: 'Public Events & Activities', nameDh: 'އާންމު ހަރަކާތްތަކާއި އިވެންޓްތައް', schema: 'id, title, summary, eventDate, location, status' },
      { key: 'eventItems', name: 'Internal Events & Attendance', nameDh: 'އިވެންޓްތަކާއި ހާޒިރީ', schema: 'id, title, eventType, startDate, venue, attendees' },
      { key: 'meetingItems', name: 'Meetings & Minutes', nameDh: 'ބައްދަލުވުންތަކާއި ޔައުމިއްޔާ', schema: 'id, meetingNumber, title, meetingType, date, attendees, votings' },
      { key: 'budgetAccounts', name: 'Bank & Cash Accounts', nameDh: 'ބޭންކް އަދި ފައިސާގެ އެކައުންޓްތައް', schema: 'id, accountName, accountNumber, bankName, balance, status' },
      { key: 'incomeRecords', name: 'Income & Revenues', nameDh: 'ލިބުނު އާމްދަނީ', schema: 'id, date, title, amount, category, accountId' },
      { key: 'expenseRecords', name: 'Expenses & Payments', nameDh: 'ޚަރަދުތަކާއި ފައިސާ ދެއްކުން', schema: 'id, date, title, amount, category, accountId, status' },
      { key: 'accountTransfers', name: 'Account Fund Transfers', nameDh: 'އެކައުންޓް ބަދަލުކުރުންތައް', schema: 'id, date, fromAccountId, toAccountId, amount' },
      { key: 'contributionSettings', name: 'Membership Fee Rules', nameDh: 'މެންބަރޝިޕް ފީ އުސޫލުތައް', schema: 'monthlyFee, finePerDay, dueDayOfMonth, currency' },
      { key: 'memberContributions', name: 'Member Monthly Fees', nameDh: 'މެންބަރުންގެ މަހު ފީ ރެކޯޑްތައް', schema: 'id, memberId, year, month, amount, status' },
      { key: 'budgetAllocations', name: 'Annual Budget Allocations', nameDh: 'އަހަރީ ބަޖެޓް ކަނޑައެޅުން', schema: 'id, year, category, allocatedAmount' },
      { key: 'slideshow', name: 'Hero Slideshow & Banners', nameDh: 'ސްލައިޑްޝޯ އާއި ބެނަރތައް', schema: 'id, title, subtitle, desktopImage, displayOrder, status' },
      { key: 'siteSettings', name: 'Branding & System Settings', nameDh: 'ބްރޭންޑިންގ އާއި ސިސްޓަމް ސެޓިންގސް', schema: 'id, group, key, value, updatedAt' },
      { key: 'contacts', name: 'Contact Information', nameDh: 'ގުޅޭނެ މަޢުލޫމާތު', schema: 'id, type, label, value, displayOrder, status' },
      { key: 'socialLinks', name: 'Social Media Channels', nameDh: 'ސޯޝަލް މީޑިއާ ލިންކްތައް', schema: 'id, platform, label, url, displayOrder, status' },
      { key: 'excoMembers', name: 'EXCO Board Members', nameDh: 'ހިންގާ ކޮމިޓީގެ މެންބަރުން', schema: 'id, fullName, designation, designationDhivehi, image, displayOrder' },
      { key: 'quizQuestions', name: 'Ramazan Quiz Questions', nameDh: 'ރަމަޟާން ކުއިޒް ސުވާލުތައް', schema: 'id, questionNumber, title, options, correctOptionId, prizeTitle, status' },
      { key: 'quizSubmissions', name: 'Quiz Answer Submissions', nameDh: 'ކުއިޒް ބައިވެރިވުންތައް', schema: 'id, questionId, fullName, contactNumber, selectedOptionId, isWinner' },
      { key: 'quizWinners', name: 'Quiz Winners Registry', nameDh: 'ކުއިޒުގެ ނަސީބުވެރިން', schema: 'id, questionNumber, winnerName, contactNumber, prizeTitle, status' },
      { key: 'quizPrizes', name: 'Quiz Prizes Catalog', nameDh: 'ކުއިޒުގެ އިނާމުތައް', schema: 'id, title, description, sponsorName, imageUrl, status' },
      { key: 'quizSponsors', name: 'Quiz Sponsors & Partners', nameDh: 'ކުއިޒުގެ ސްޕޮންސަރުން', schema: 'id, name, logo, contactPerson, contactNumber, status' },
      { key: 'auditLogs', name: 'System Security & Audit Trail', nameDh: 'ސެކިއުރިޓީ އޮޑިޓް ލޮގްތައް', schema: 'id, timestamp, action, module, userId, details' },
      { key: 'inboxMessages', name: 'Visitor Contact Messages', nameDh: 'ޒިޔާރަތްކުރި ފަރާތްތަކުގެ މެސެޖުތައް', schema: 'id, senderName, contactInfo, subject, body, status' },
      { key: 'appNotifications', name: 'System & Portal Notifications', nameDh: 'ނޮޓިފިކޭޝަންތައް', schema: 'id, recipientId, title, message, type, readBy' },
      { key: 'clubRules', name: 'Constitution & Bye-Laws', nameDh: 'އަސާސީ ޤަވާޢިދު', schema: 'titleDhivehi, version, chapters, articles' },
      { key: 'presidentialDirectives', name: 'Presidential Directives', nameDh: 'ރައީސްގެ ޤަރާރުތައް', schema: 'id, directiveNumber, title, issuedDate, status' },
      { key: 'officialCirculars', name: 'Official Club Circulars', nameDh: 'ރަސްމީ ސަރކިއުލަރތައް', schema: 'id, circularNumber, title, issuedDate, status' },
      { key: 'invoices', name: 'Invoices & Quotations', nameDh: 'އިންވޮއިސް އަދި ކޯޓޭޝަންތައް', schema: 'id, type, invoiceNumber, invoiceDate, billTo, items, totalNetPayments, status, approvedBy' }
    ];

    let total = 0;
    const tables = [];
    for (const def of tableDefinitions) {
      let count = 0;
      let sample: any[] = [];
      try {
        const snap = await firestore.collection(def.key).get();
        count = snap.size;
        sample = snap.docs.slice(0, 3).map(d => d.data());
      } catch (err) {
        logFallbackNotice(`getDbTablesSummary:${def.key}`, err);
        const mapProp = (fallbackStore as any)[def.key];
        if (mapProp instanceof Map) {
          count = mapProp.size;
          sample = Array.from(mapProp.values()).slice(0, 3);
        } else if (Array.isArray(mapProp)) {
          count = mapProp.length;
          sample = mapProp.slice(0, 3);
        }
      }
      total += count;
      tables.push({
        key: def.key,
        name: def.name,
        nameDh: def.nameDh,
        count,
        schema: def.schema,
        sample
      });
    }

    return {
      tables,
      totalRecords: total,
      lastSyncedAt: new Date().toISOString()
    };
  }

  async syncDatabase(): Promise<{ status: string; syncedAt: string; collectionsSynced: number; metadata: any }> {
    try {
      await this.verifyStartupSchema();
    } catch (err) {
      logFallbackNotice('syncDatabase', err);
    }
    const meta = getDatabaseMetadata();
    return {
      status: 'success',
      syncedAt: new Date().toISOString(),
      collectionsSynced: 28,
      metadata: meta
    };
  }

  async exportFullDatabase(): Promise<Record<string, any[]>> {
    const collections = [
      'users', 'roles', 'clubMembers', 'events', 'eventItems',
      'meetingItems', 'budgetAccounts', 'incomeRecords', 'expenseRecords',
      'accountTransfers', 'contributionSettings', 'memberContributions',
      'budgetAllocations', 'slideshow', 'siteSettings', 'contacts',
      'socialLinks', 'excoMembers', 'quizQuestions', 'quizSubmissions',
      'quizWinners', 'quizPrizes', 'quizSponsors', 'masterIneligibleParticipants',
      'auditLogs', 'inboxMessages', 'appNotifications', 'clubRules',
      'presidentialDirectives', 'officialCirculars'
    ];

    const backup: Record<string, any[]> = {};
    for (const col of collections) {
      try {
        const snap = await firestore.collection(col).get();
        backup[col] = snap.docs.map(d => d.data());
      } catch (err) {
        logFallbackNotice(`exportFullDatabase:${col}`, err);
        const mapProp = (fallbackStore as any)[col];
        if (mapProp instanceof Map) {
          backup[col] = Array.from(mapProp.values());
        } else if (Array.isArray(mapProp)) {
          backup[col] = mapProp;
        } else {
          backup[col] = [];
        }
      }
    }

    return backup;
  }

  async importFullDatabase(data: Record<string, any[]>): Promise<void> {
    for (const [colName, docs] of Object.entries(data)) {
      if (Array.isArray(docs)) {
        try {
          const batch = firestore.batch();
          for (const doc of docs) {
            const docId = doc.id || doc.key || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const docRef = firestore.collection(colName).doc(docId);
            batch.set(docRef, doc, { merge: true });
          }
          await batch.commit();
        } catch (err) {
          logFallbackNotice(`importFullDatabase:${colName}`, err);
        }
      }
    }
  }
}

export const db = new FirestoreDatabaseStore();
