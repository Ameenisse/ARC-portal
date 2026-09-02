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
  IncomeCategory,
  InvoiceStatus
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

export class FirestoreDatabaseStore {
  // -------------------------------------------------------------
  // STARTUP & HEALTH
  // -------------------------------------------------------------
  async verifyStartupSchema(): Promise<void> {
    console.log('[Firestore] Checking system installation status...');
    const installRef = firestore.collection('system').doc('installation');
    const installDoc = await installRef.get();

    if (installDoc.exists && installDoc.data()?.initialized === true) {
      console.log('[Firestore] System is permanently initialized in Cloud Firestore.');
      return;
    }

    console.log('[Firestore] System installation record not found. Please run "npm run db:setup" if this is a fresh environment.');
  }

  async checkDatabaseHealth() {
    try {
      await firestore.collection('system').limit(1).get();
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
    const snap = await firestore.collection('users').get();
    return snap.docs.map(d => d.data() as User);
  }

  async getUserById(id: string): Promise<User | null> {
    const doc = await firestore.collection('users').doc(id).get();
    if (doc.exists) {
      return doc.data() as User;
    }
    return null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const clean = username.trim().toLowerCase();
    const snap = await firestore.collection('users').where('username', '==', clean).get();
    if (!snap.empty) {
      return snap.docs[0].data() as User;
    }
    const allSnap = await firestore.collection('users').get();
    const match = allSnap.docs.find(d => (d.data().username || '').toLowerCase() === clean);
    if (match) {
      return match.data() as User;
    }
    return null;
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

    await firestore.collection('users').doc(id).set(user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const userDocRef = firestore.collection('users').doc(id);
    const updated = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await userDocRef.set(updated, { merge: true });
    const snap = await userDocRef.get();
    return snap.data() as User;
  }

  async deleteUser(id: string): Promise<void> {
    await firestore.collection('users').doc(id).delete();
  }

  async recordFailedLogin(userId: string): Promise<{ count: number; lockedUntil: string | null }> {
    const userRef = firestore.collection('users').doc(userId);
    return await firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(userRef);
      if (!doc.exists) {
        throw new Error('User not found.');
      }
      const userData = doc.data() as User;
      const newCount = (userData.failedLoginCount || 0) + 1;
      let lockTimestamp: string | null = null;
      if (newCount >= 5) {
        lockTimestamp = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      transaction.update(userRef, {
        failedLoginCount: newCount,
        lockedUntil: lockTimestamp,
        updatedAt: new Date().toISOString()
      });
      return { count: newCount, lockedUntil: lockTimestamp };
    });
  }

  async clearFailedLogin(userId: string): Promise<void> {
    await firestore.collection('users').doc(userId).update({
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // SESSIONS
  async getSessions(): Promise<{ token: string; userId: string; expiresAt: number }[]> {
    const snap = await firestore.collection('userSessions').get();
    return snap.docs.map(d => d.data() as { token: string; userId: string; expiresAt: number });
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
    await firestore.collection('userSessions').doc(tokenHash).set(sessObj);
  }

  async getSessionByToken(token: string): Promise<{ tokenHash: string; userId: string; expiresAt: number; revokedAt: string | null } | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const doc = await firestore.collection('userSessions').doc(tokenHash).get();
    if (doc.exists) return doc.data() as any;
    return null;
  }

  async deleteSession(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await firestore.collection('userSessions').doc(tokenHash).delete();
  }

  async touchSession(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    try {
      await firestore.collection('userSessions').doc(tokenHash).update({
        lastSeenAt: new Date().toISOString()
      });
    } catch (err) {
      // ignore transient touch error
    }
  }

  // -------------------------------------------------------------
  // ROLES
  // -------------------------------------------------------------
  async getRoles(): Promise<Role[]> {
    const snap = await firestore.collection('roles').get();
    return snap.docs.map(d => d.data() as Role);
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
    await firestore.collection('roles').doc(id).set(role);
    return role;
  }

  async updateRole(id: string, updates: Partial<Role>): Promise<Role> {
    const docRef = firestore.collection('roles').doc(id);
    const updated = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as Role;
  }

  async deleteRole(id: string): Promise<void> {
    await firestore.collection('roles').doc(id).delete();
  }

  // -------------------------------------------------------------
  // MEMBERS
  // -------------------------------------------------------------
  async getMembers(): Promise<ClubMember[]> {
    const snap = await firestore.collection('clubMembers').get();
    return snap.docs.map(d => d.data() as ClubMember);
  }

  async getMemberById(id: string): Promise<ClubMember | null> {
    const doc = await firestore.collection('clubMembers').doc(id).get();
    if (doc.exists) {
      return doc.data() as ClubMember;
    }
    return null;
  }

  async createMember(data: Partial<ClubMember>): Promise<ClubMember> {
    const id = data.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const memberDocRef = firestore.collection('clubMembers').doc(id);
    const counterDocRef = firestore.collection('counters').doc('members');

    return await firestore.runTransaction(async (transaction) => {
      let memberNumber = data.memberNumber;
      if (!memberNumber) {
        const counterDoc = await transaction.get(counterDocRef);
        const currentCount = counterDoc.exists ? (counterDoc.data()?.count || 1) : 1;
        memberNumber = `ARC-M-${String(currentCount).padStart(3, '0')}`;
        transaction.set(counterDocRef, { count: currentCount + 1 }, { merge: true });
      }

      const member: ClubMember = {
        id,
        memberNumber,
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

      transaction.set(memberDocRef, member);
      return member;
    });
  }

  async updateMember(id: string, updates: Partial<ClubMember>): Promise<ClubMember> {
    const docRef = firestore.collection('clubMembers').doc(id);
    const updated = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as ClubMember;
  }

  async deleteMember(id: string): Promise<void> {
    await firestore.collection('clubMembers').doc(id).delete();
  }

  // -------------------------------------------------------------
  // EVENTS & MEETINGS
  // -------------------------------------------------------------
  async getEvents(): Promise<ClubEvent[]> {
    const snap = await firestore.collection('events').get();
    return snap.docs.map(d => d.data() as ClubEvent);
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
    await firestore.collection('events').doc(id).set(event);
    return event;
  }

  async updateEvent(id: string, updates: Partial<ClubEvent>): Promise<ClubEvent> {
    const docRef = firestore.collection('events').doc(id);
    const updated = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as ClubEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    await firestore.collection('events').doc(id).delete();
  }

  async getEventItems(): Promise<EventItem[]> {
    const snap = await firestore.collection('eventItems').get();
    return snap.docs.map(d => d.data() as EventItem);
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
      eventType: data.eventType || ('activity' as any),
      status: data.status || 'upcoming',
      photoGallery: data.photoGallery || [],
      attendance: data.attendance || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    await firestore.collection('eventItems').doc(id).set(item);
    return item;
  }

  async updateEventItem(id: string, updates: Partial<EventItem>): Promise<EventItem> {
    const docRef = firestore.collection('eventItems').doc(id);
    const updated = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as EventItem;
  }

  async deleteEventItem(id: string): Promise<void> {
    await firestore.collection('eventItems').doc(id).delete();
  }

  async saveEventAttendance(id: string, attendance: any[]): Promise<EventItem> {
    return this.updateEventItem(id, { attendance });
  }

  async getMeetingItems(): Promise<MeetingItem[]> {
    const snap = await firestore.collection('meetingItems').get();
    return snap.docs.map(d => d.data() as MeetingItem);
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
    await firestore.collection('meetingItems').doc(id).set(item);
    return item;
  }

  async updateMeetingItem(id: string, updates: Partial<MeetingItem>): Promise<MeetingItem> {
    const docRef = firestore.collection('meetingItems').doc(id);
    const updated = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as MeetingItem;
  }

  async deleteMeetingItem(id: string): Promise<void> {
    await firestore.collection('meetingItems').doc(id).delete();
  }

  async saveMeetingAttendance(id: string, attendance: any[]): Promise<MeetingItem> {
    return this.updateMeetingItem(id, { attendance });
  }

  async addMeetingVoting(id: string, voting: any): Promise<MeetingItem> {
    const docRef = firestore.collection('meetingItems').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Meeting not found.');
    const meeting = doc.data() as MeetingItem;
    const votings = [...(meeting.votings || [])];
    const voteId = voting.id || `vote_${Date.now()}`;
    votings.push({ ...voting, id: voteId });
    return this.updateMeetingItem(id, { votings });
  }

  async updateMeetingVoting(id: string, votingId: string, voting: any): Promise<MeetingItem> {
    const docRef = firestore.collection('meetingItems').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Meeting not found.');
    const meeting = doc.data() as MeetingItem;
    const votings = (meeting.votings || []).map(v => (v.id === votingId ? { ...v, ...voting } : v));
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
      category: data.category || ('other' as any),
      date: data.date || new Date().toISOString(),
      accountId: data.accountId || 'acc_primary_001',
      notes: data.notes || (data as any).description || '',
      referenceNumber: data.referenceNumber || (data as any).receiptNumber || '',
      receivedFrom: data.receivedFrom || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };

    const incomeRef = firestore.collection('incomeRecords').doc(id);

    return await firestore.runTransaction(async (transaction) => {
      transaction.set(incomeRef, record);

      if (record.accountId && record.amount) {
        const accRef = firestore.collection('budgetAccounts').doc(record.accountId);
        const accSnap = await transaction.get(accRef);
        if (accSnap.exists) {
          const curBal = (accSnap.data() as BankAccount).currentBalance || 0;
          transaction.update(accRef, { currentBalance: curBal + record.amount, updatedAt: new Date().toISOString() });
        }
      }
      return record;
    });
  }

  async updateIncomeRecord(id: string, updates: Partial<IncomeRecord>): Promise<IncomeRecord> {
    const incomeRef = firestore.collection('incomeRecords').doc(id);

    return await firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(incomeRef);
      if (!doc.exists) throw new Error('Income record not found.');
      const oldRecord = doc.data() as IncomeRecord;
      const newAmount = updates.amount !== undefined ? updates.amount : oldRecord.amount;
      const newAccountId = updates.accountId || oldRecord.accountId;

      // Reverse previous balance
      if (oldRecord.accountId && oldRecord.amount) {
        const oldAccRef = firestore.collection('budgetAccounts').doc(oldRecord.accountId);
        const oldAccSnap = await transaction.get(oldAccRef);
        if (oldAccSnap.exists) {
          const oldBal = (oldAccSnap.data() as BankAccount).currentBalance || 0;
          transaction.update(oldAccRef, { currentBalance: oldBal - oldRecord.amount, updatedAt: new Date().toISOString() });
        }
      }

      // Apply new balance
      if (newAccountId && newAmount) {
        const newAccRef = firestore.collection('budgetAccounts').doc(newAccountId);
        const newAccSnap = await transaction.get(newAccRef);
        if (newAccSnap.exists) {
          const curBal = (newAccSnap.data() as BankAccount).currentBalance || 0;
          transaction.update(newAccRef, { currentBalance: curBal + newAmount, updatedAt: new Date().toISOString() });
        }
      }

      const updatedRecord: IncomeRecord = {
        ...oldRecord,
        ...updates,
        id,
        updatedAt: new Date().toISOString()
      };
      transaction.set(incomeRef, updatedRecord, { merge: true });
      return updatedRecord;
    });
  }

  async deleteIncomeRecord(id: string): Promise<void> {
    const incomeRef = firestore.collection('incomeRecords').doc(id);

    await firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(incomeRef);
      if (!doc.exists) return;
      const record = doc.data() as IncomeRecord;

      if (record.accountId && record.amount) {
        const accRef = firestore.collection('budgetAccounts').doc(record.accountId);
        const accSnap = await transaction.get(accRef);
        if (accSnap.exists) {
          const curBal = (accSnap.data() as BankAccount).currentBalance || 0;
          transaction.update(accRef, { currentBalance: Math.max(0, curBal - record.amount), updatedAt: new Date().toISOString() });
        }
      }
      transaction.delete(incomeRef);
    });
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

    const expRef = firestore.collection('expenseRecords').doc(id);

    return await firestore.runTransaction(async (transaction) => {
      transaction.set(expRef, record);

      if (record.accountId && record.amount) {
        const accRef = firestore.collection('budgetAccounts').doc(record.accountId);
        const accSnap = await transaction.get(accRef);
        if (accSnap.exists) {
          const curBal = (accSnap.data() as BankAccount).currentBalance || 0;
          transaction.update(accRef, { currentBalance: Math.max(0, curBal - record.amount), updatedAt: new Date().toISOString() });
        }
      }
      return record;
    });
  }

  async updateExpenseRecord(id: string, updates: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    const expRef = firestore.collection('expenseRecords').doc(id);

    return await firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(expRef);
      if (!doc.exists) throw new Error('Expense record not found.');
      const oldRecord = doc.data() as ExpenseRecord;
      const newAmount = updates.amount !== undefined ? updates.amount : oldRecord.amount;
      const newAccountId = updates.accountId || oldRecord.accountId;

      // Reverse previous expense from account balance
      if (oldRecord.accountId && oldRecord.amount) {
        const oldAccRef = firestore.collection('budgetAccounts').doc(oldRecord.accountId);
        const oldAccSnap = await transaction.get(oldAccRef);
        if (oldAccSnap.exists) {
          const oldBal = (oldAccSnap.data() as BankAccount).currentBalance || 0;
          transaction.update(oldAccRef, { currentBalance: oldBal + oldRecord.amount, updatedAt: new Date().toISOString() });
        }
      }

      // Deduct new expense
      if (newAccountId && newAmount) {
        const newAccRef = firestore.collection('budgetAccounts').doc(newAccountId);
        const newAccSnap = await transaction.get(newAccRef);
        if (newAccSnap.exists) {
          const curBal = (newAccSnap.data() as BankAccount).currentBalance || 0;
          transaction.update(newAccRef, { currentBalance: Math.max(0, curBal - newAmount), updatedAt: new Date().toISOString() });
        }
      }

      const updatedRecord: ExpenseRecord = {
        ...oldRecord,
        ...updates,
        id,
        updatedAt: new Date().toISOString()
      };
      transaction.set(expRef, updatedRecord, { merge: true });
      return updatedRecord;
    });
  }

  async deleteExpenseRecord(id: string): Promise<void> {
    const expRef = firestore.collection('expenseRecords').doc(id);

    await firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(expRef);
      if (!doc.exists) return;
      const record = doc.data() as ExpenseRecord;

      if (record.accountId && record.amount) {
        const accRef = firestore.collection('budgetAccounts').doc(record.accountId);
        const accSnap = await transaction.get(accRef);
        if (accSnap.exists) {
          const curBal = (accSnap.data() as BankAccount).currentBalance || 0;
          transaction.update(accRef, { currentBalance: curBal + record.amount, updatedAt: new Date().toISOString() });
        }
      }
      transaction.delete(expRef);
    });
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

    const trfRef = firestore.collection('accountTransfers').doc(id);

    return await firestore.runTransaction(async (transaction) => {
      transaction.set(trfRef, transfer);

      if (transfer.fromAccountId && transfer.amount) {
        const fromRef = firestore.collection('budgetAccounts').doc(transfer.fromAccountId);
        const fromSnap = await transaction.get(fromRef);
        if (fromSnap.exists) {
          const bal = (fromSnap.data() as BankAccount).currentBalance || 0;
          transaction.update(fromRef, { currentBalance: bal - transfer.amount, updatedAt: new Date().toISOString() });
        }
      }

      if (transfer.toAccountId && transfer.amount) {
        const toRef = firestore.collection('budgetAccounts').doc(transfer.toAccountId);
        const toSnap = await transaction.get(toRef);
        if (toSnap.exists) {
          const bal = (toSnap.data() as BankAccount).currentBalance || 0;
          transaction.update(toRef, { currentBalance: bal + transfer.amount, updatedAt: new Date().toISOString() });
        }
      }

      return transfer;
    });
  }

  async deleteAccountTransfer(id: string): Promise<void> {
    const trfRef = firestore.collection('accountTransfers').doc(id);

    await firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(trfRef);
      if (!doc.exists) return;
      const transfer = doc.data() as AccountTransferRecord;

      if (transfer.fromAccountId && transfer.amount) {
        const fromRef = firestore.collection('budgetAccounts').doc(transfer.fromAccountId);
        const fromSnap = await transaction.get(fromRef);
        if (fromSnap.exists) {
          const bal = (fromSnap.data() as BankAccount).currentBalance || 0;
          transaction.update(fromRef, { currentBalance: bal + transfer.amount, updatedAt: new Date().toISOString() });
        }
      }

      if (transfer.toAccountId && transfer.amount) {
        const toRef = firestore.collection('budgetAccounts').doc(transfer.toAccountId);
        const toSnap = await transaction.get(toRef);
        if (toSnap.exists) {
          const bal = (toSnap.data() as BankAccount).currentBalance || 0;
          transaction.update(toRef, { currentBalance: Math.max(0, bal - transfer.amount), updatedAt: new Date().toISOString() });
        }
      }

      transaction.delete(trfRef);
    });
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
    const snap = await firestore.collection('invoices').get();
    let list = snap.docs.map(d => d.data() as InvoiceRecord);

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
    const doc = await firestore.collection('invoices').doc(id).get();
    if (doc.exists) {
      return doc.data() as InvoiceRecord;
    }
    return null;
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

    await firestore.collection('invoices').doc(id).set(invoice);
    return invoice;
  }

  async updateInvoice(id: string, updates: Partial<InvoiceRecord>): Promise<InvoiceRecord> {
    const docRef = firestore.collection('invoices').doc(id);
    const updated = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as InvoiceRecord;
  }

  async deleteInvoice(id: string): Promise<void> {
    await firestore.collection('invoices').doc(id).delete();
  }

  // -------------------------------------------------------------
  // SITE SETTINGS & CONTENT
  // -------------------------------------------------------------
  async getSettings(): Promise<SiteSetting[]> {
    const snap = await firestore.collection('siteSettings').get();
    return snap.docs.map(d => d.data() as SiteSetting);
  }

  async updateSettings(settingsList: any[]): Promise<SiteSetting[]> {
    const batch = firestore.batch();
    for (const s of settingsList) {
      const docId = s.id || `setting_${s.group || 'general'}_${s.key}`;
      const docRef = firestore.collection('siteSettings').doc(docId);
      batch.set(docRef, { ...s, id: docId, updatedAt: new Date().toISOString() }, { merge: true });
    }
    await batch.commit();
    return this.getSettings();
  }

  async updateSettingsGroup(group: string, values: Record<string, any>): Promise<void> {
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
  }

  async updateSetting(id: string, value: any): Promise<void> {
    await firestore.collection('siteSettings').doc(id).set({
      id,
      value,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  async getSlideshow(): Promise<SlideshowItem[]> {
    const snap = await firestore.collection('slideshow').get();
    return snap.docs.map(d => d.data() as SlideshowItem);
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
    await firestore.collection('slideshow').doc(id).set(slide);
    return slide;
  }

  async updateSlideshowItem(id: string, updates: Partial<SlideshowItem>): Promise<SlideshowItem> {
    const docRef = firestore.collection('slideshow').doc(id);
    const updated = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as SlideshowItem;
  }

  async deleteSlideshowItem(id: string): Promise<void> {
    await firestore.collection('slideshow').doc(id).delete();
  }

  async getContacts(): Promise<any[]> {
    const snap = await firestore.collection('contacts').get();
    return snap.docs.map(d => d.data());
  }

  async createContact(data: any): Promise<any> {
    const id = data.id || `contact_${Date.now()}`;
    const item = { ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await firestore.collection('contacts').doc(id).set(item);
    return item;
  }

  async updateContact(id: string, updates: any): Promise<any> {
    const docRef = firestore.collection('contacts').doc(id);
    const updated = { ...updates, id, updatedAt: new Date().toISOString() };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data();
  }

  async deleteContact(id: string): Promise<void> {
    await firestore.collection('contacts').doc(id).delete();
  }

  async getSocialLinks(): Promise<SocialLink[]> {
    const snap = await firestore.collection('socialLinks').get();
    return snap.docs.map(d => d.data() as SocialLink);
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
    await firestore.collection('socialLinks').doc(id).set(item);
    return item;
  }

  async updateSocialLink(id: string, updates: Partial<SocialLink>): Promise<SocialLink> {
    const docRef = firestore.collection('socialLinks').doc(id);
    const updated = {
      ...updates,
      id
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as SocialLink;
  }

  async deleteSocialLink(id: string): Promise<void> {
    await firestore.collection('socialLinks').doc(id).delete();
  }

  async getExcoMembers(): Promise<ExcoMember[]> {
    const snap = await firestore.collection('excoMembers').get();
    return snap.docs.map(d => d.data() as ExcoMember);
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
    await firestore.collection('excoMembers').doc(id).set(member);
    return member;
  }

  async updateExcoMember(id: string, updates: Partial<ExcoMember>): Promise<ExcoMember> {
    const docRef = firestore.collection('excoMembers').doc(id);
    const updated = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as ExcoMember;
  }

  async deleteExcoMember(id: string): Promise<void> {
    await firestore.collection('excoMembers').doc(id).delete();
  }

  async getClubRules(): Promise<ClubRulesData> {
    const doc = await firestore.collection('clubRules').doc('main').get();
    if (doc.exists) {
      return doc.data() as ClubRulesData;
    }
    return {
      titleDhivehi: 'އަސާސީ ޤަވާޢިދު',
      titleEnglish: 'ARC Constitution & Rules',
      version: '1.0',
      effectiveDate: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
      chapters: []
    };
  }

  async updateClubRules(data: Partial<ClubRulesData>, updatedBy?: string): Promise<ClubRulesData> {
    const current = await this.getClubRules();
    const payload = { ...current, ...data, updatedBy: updatedBy || 'system', updatedAt: new Date().toISOString() };
    await firestore.collection('clubRules').doc('main').set(payload, { merge: true });
    return payload as ClubRulesData;
  }

  async getPresidentialDirectives(): Promise<PresidentialDirective[]> {
    const snap = await firestore.collection('presidentialDirectives').get();
    return snap.docs.map(d => d.data() as PresidentialDirective);
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
    await firestore.collection('presidentialDirectives').doc(id).set(item);
    return item;
  }

  async updatePresidentialDirective(id: string, updates: Partial<PresidentialDirective>): Promise<PresidentialDirective> {
    const docRef = firestore.collection('presidentialDirectives').doc(id);
    const updated = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as PresidentialDirective;
  }

  async deletePresidentialDirective(id: string): Promise<void> {
    await firestore.collection('presidentialDirectives').doc(id).delete();
  }

  async getOfficialCirculars(): Promise<OfficialCircular[]> {
    const snap = await firestore.collection('officialCirculars').get();
    return snap.docs.map(d => d.data() as OfficialCircular);
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
    await firestore.collection('officialCirculars').doc(id).set(item);
    return item;
  }

  async updateOfficialCircular(id: string, updates: Partial<OfficialCircular>): Promise<OfficialCircular> {
    const docRef = firestore.collection('officialCirculars').doc(id);
    const updated = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as OfficialCircular;
  }

  async deleteOfficialCircular(id: string): Promise<void> {
    await firestore.collection('officialCirculars').doc(id).delete();
  }

  // -------------------------------------------------------------
  // RAMAZAN QUIZ
  // -------------------------------------------------------------
  async getQuizQuestions(): Promise<QuizQuestion[]> {
    const snap = await firestore.collection('quizQuestions').get();
    return snap.docs.map(d => d.data() as QuizQuestion);
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
    await firestore.collection('quizQuestions').doc(id).set(question);
    return question;
  }

  async updateQuizQuestion(id: string, updates: Partial<QuizQuestion>): Promise<QuizQuestion> {
    const docRef = firestore.collection('quizQuestions').doc(id);
    const updated = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as QuizQuestion;
  }

  async deleteQuizQuestion(id: string): Promise<{ deletedSubmissionsCount: number; deletedWinnersCount: number }> {
    const subSnap = await firestore.collection('quizSubmissions').where('questionId', '==', id).get();
    const winSnap = await firestore.collection('quizWinners').where('questionId', '==', id).get();

    const batch = firestore.batch();
    batch.delete(firestore.collection('quizQuestions').doc(id));
    subSnap.docs.forEach(d => batch.delete(d.ref));
    winSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return { deletedSubmissionsCount: subSnap.size, deletedWinnersCount: winSnap.size };
  }

  async getQuizSubmissions(): Promise<QuizSubmission[]> {
    const snap = await firestore.collection('quizSubmissions').get();
    return snap.docs.map(d => d.data() as QuizSubmission);
  }

  async createQuizSubmission(data: Partial<QuizSubmission>): Promise<QuizSubmission> {
    const questionId = data.questionId || '';
    const normId = (data.normalizedIdNumber || data.idNumber || '').toUpperCase().trim();
    const docId = data.id || `sub_${questionId}_${normId}`;
    const subDocRef = firestore.collection('quizSubmissions').doc(docId);
    const counterDocRef = firestore.collection('counters').doc('quizParticipants');

    return await firestore.runTransaction(async (transaction) => {
      let participantNumber = data.participantNumber;
      if (!participantNumber) {
        const counterDoc = await transaction.get(counterDocRef);
        const currentCount = counterDoc.exists ? (counterDoc.data()?.count || 1) : 1;
        participantNumber = `ARC-Q-${String(currentCount).padStart(5, '0')}`;
        transaction.set(counterDocRef, { count: currentCount + 1 }, { merge: true });
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

      transaction.set(subDocRef, resultSubmission, { merge: true });
      return resultSubmission;
    });
  }

  async updateQuizSubmission(id: string, updates: Partial<QuizSubmission>): Promise<QuizSubmission> {
    const docRef = firestore.collection('quizSubmissions').doc(id);
    const updated = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as QuizSubmission;
  }

  async deleteQuizSubmission(id: string): Promise<void> {
    await firestore.collection('quizSubmissions').doc(id).delete();
  }

  async disqualifyQuizSubmission(id: string, isDisqualified: boolean, reason: string): Promise<QuizSubmission> {
    const docRef = firestore.collection('quizSubmissions').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Submission not found.');
    const existing = doc.data() as QuizSubmission;
    const isEligible = Boolean(existing.isCorrect && !isDisqualified);
    const updated: QuizSubmission = {
      ...existing,
      id,
      isDisqualified,
      disqualificationReason: reason,
      isEligible,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    return updated;
  }

  async getQuizWinners(): Promise<QuizWinner[]> {
    const snap = await firestore.collection('quizWinners').get();
    return snap.docs.map(d => d.data() as QuizWinner);
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
    await firestore.collection('quizWinners').doc(id).set(winner);
    return winner;
  }

  async updateQuizWinner(id: string, updates: Partial<QuizWinner>): Promise<QuizWinner> {
    const docRef = firestore.collection('quizWinners').doc(id);
    const updated = {
      ...updates,
      id
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as QuizWinner;
  }

  async deleteQuizWinner(id: string): Promise<void> {
    await firestore.collection('quizWinners').doc(id).delete();
  }

  async drawQuizWinner(questionId: string, selectedByUsername: string = 'system'): Promise<{ winner: QuizWinner; eligibleCount: number }> {
    const qDoc = await firestore.collection('quizQuestions').doc(questionId).get();
    if (!qDoc.exists) throw new Error('Quiz question not found.');
    const q = qDoc.data() as QuizQuestion;

    const ineligible = await this.getIneligibleParticipantIds();
    const ineligibleSet = new Set(ineligible);

    const submissionsSnap = await firestore.collection('quizSubmissions').where('questionId', '==', questionId).get();
    const submissions = submissionsSnap.docs.map(d => d.data() as QuizSubmission);

    const candidates = submissions.filter(s =>
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

  async reselectQuizWinner(winnerIdOrQuestionId: string, reason: string, replacedByUsername: string = 'system'): Promise<{ oldWinner: QuizWinner; newWinner: QuizWinner; winner: QuizWinner }> {
    let oldWinner: QuizWinner | null = null;
    let actualWinnerId = winnerIdOrQuestionId;

    // 1. Try finding by direct document ID
    const winDoc = await firestore.collection('quizWinners').doc(winnerIdOrQuestionId).get();
    if (winDoc.exists) {
      oldWinner = winDoc.data() as QuizWinner;
      actualWinnerId = winDoc.id || oldWinner.id || winnerIdOrQuestionId;
    } else {
      // 2. Try querying by 'id' field
      const byIdSnap = await firestore.collection('quizWinners').where('id', '==', winnerIdOrQuestionId).get();
      if (byIdSnap.docs.length > 0) {
        oldWinner = byIdSnap.docs[0].data() as QuizWinner;
        actualWinnerId = byIdSnap.docs[0].id || oldWinner.id;
      } else {
        // 3. Try finding by questionId (target the active / non-replaced published winner for this question)
        const byQSnap = await firestore.collection('quizWinners').where('questionId', '==', winnerIdOrQuestionId).get();
        if (byQSnap.docs.length > 0) {
          const activeDoc = byQSnap.docs.find(d => !(d.data() as QuizWinner).isReplaced) || byQSnap.docs[0];
          oldWinner = activeDoc.data() as QuizWinner;
          actualWinnerId = activeDoc.id || oldWinner.id;
        } else {
          // 4. Fallback search across all winners by participantNumber or maskedIdNumber
          const allWinners = await this.getQuizWinners();
          const found = allWinners.find(w => 
            w.id === winnerIdOrQuestionId || 
            w.questionId === winnerIdOrQuestionId || 
            w.participantNumber === winnerIdOrQuestionId ||
            (w as any).submissionId === winnerIdOrQuestionId
          );
          if (found) {
            oldWinner = found;
            actualWinnerId = found.id;
          }
        }
      }
    }

    if (!oldWinner) {
      throw new Error('Existing winner record not found.');
    }

    const questionId = oldWinner.questionId;
    const qDoc = await firestore.collection('quizQuestions').doc(questionId).get();
    const q = qDoc.exists ? (qDoc.data() as QuizQuestion) : undefined;

    const ineligible = await this.getIneligibleParticipantIds();
    const ineligibleSet = new Set(ineligible);

    const winnersSnap = await firestore.collection('quizWinners').where('questionId', '==', questionId).get();
    const winners = winnersSnap.docs.map(d => d.data() as QuizWinner);
    const usedSubmissionIds = new Set(winners.map(w => w.submissionId));

    const submissionsSnap = await firestore.collection('quizSubmissions').where('questionId', '==', questionId).get();
    const submissions = submissionsSnap.docs.map(d => d.data() as QuizSubmission);

    const candidates = submissions.filter(s =>
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

    await this.updateQuizWinner(actualWinnerId, {
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

    return { oldWinner, newWinner, winner: newWinner };
  }

  async getPrizes(): Promise<QuizPrize[]> {
    const snap = await firestore.collection('quizPrizes').get();
    return snap.docs.map(d => d.data() as QuizPrize);
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
    await firestore.collection('quizPrizes').doc(id).set(prize);
    return prize;
  }

  async updatePrize(id: string, updates: Partial<QuizPrize>): Promise<QuizPrize> {
    const docRef = firestore.collection('quizPrizes').doc(id);
    const updated = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as QuizPrize;
  }

  async deletePrize(id: string): Promise<void> {
    await firestore.collection('quizPrizes').doc(id).delete();
  }

  async getSponsors(): Promise<QuizSponsor[]> {
    const snap = await firestore.collection('quizSponsors').get();
    return snap.docs.map(d => d.data() as QuizSponsor);
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
    await firestore.collection('quizSponsors').doc(id).set(sponsor);
    return sponsor;
  }

  async updateSponsor(id: string, updates: Partial<QuizSponsor>): Promise<QuizSponsor> {
    const docRef = firestore.collection('quizSponsors').doc(id);
    const updated = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as QuizSponsor;
  }

  async deleteSponsor(id: string): Promise<void> {
    await firestore.collection('quizSponsors').doc(id).delete();
  }

  async getIneligibleParticipantIds(): Promise<string[]> {
    const doc = await firestore.collection('masterIneligibleParticipants').doc('main').get();
    if (doc.exists) {
      return (doc.data()?.ineligibleIds || []) as string[];
    }
    return [];
  }

  async addIneligibleParticipantId(idNumber: string, reason?: string): Promise<void> {
    const cleanId = (idNumber || '').trim().toUpperCase();
    const docRef = firestore.collection('masterIneligibleParticipants').doc('main');
    await firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      const currentIds: string[] = doc.exists ? (doc.data()?.ineligibleIds || []) : [];
      if (!currentIds.includes(cleanId)) {
        currentIds.push(cleanId);
        transaction.set(docRef, { ineligibleIds: currentIds, updatedAt: new Date().toISOString() }, { merge: true });
      }
    });
  }

  async removeIneligibleParticipantId(idNumber: string): Promise<void> {
    const cleanId = (idNumber || '').trim().toUpperCase();
    const docRef = firestore.collection('masterIneligibleParticipants').doc('main');
    await firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (doc.exists) {
        const currentIds: string[] = doc.data()?.ineligibleIds || [];
        const filtered = currentIds.filter(id => id !== cleanId);
        transaction.set(docRef, { ineligibleIds: filtered, updatedAt: new Date().toISOString() }, { merge: true });
      }
    });
  }

  async setMasterParticipantEligibility(idNumber: string, isBlocked: boolean, reason?: string): Promise<void> {
    const cleanId = (idNumber || '').trim().toUpperCase();
    if (isBlocked) {
      await this.addIneligibleParticipantId(cleanId, reason || 'Disqualified by administrator');
    } else {
      await this.removeIneligibleParticipantId(cleanId);
    }

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
  }

  async deleteMasterParticipant(idNumber: string): Promise<{ deletedSubmissionsCount: number; deletedWinnersCount: number }> {
    const cleanId = (idNumber || '').trim().toUpperCase();
    await this.removeIneligibleParticipantId(cleanId);

    const subSnap = await firestore.collection('quizSubmissions').where('normalizedIdNumber', '==', cleanId).get();
    const winSnap = await firestore.collection('quizWinners').where('idNumber', '==', cleanId).get();
    const batch = firestore.batch();
    subSnap.docs.forEach(d => batch.delete(d.ref));
    winSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return { deletedSubmissionsCount: subSnap.size, deletedWinnersCount: winSnap.size };
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
    const docRef = firestore.collection('inboxMessages').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Message not found.');
    const msg = doc.data() as InboxMessage;
    const actions = [...(msg.actions || [])];
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
    const docRef = firestore.collection('expenseRecords').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Expense record not found.');
    const existing = doc.data() as ExpenseRecord;

    const updates: Partial<ExpenseRecord> & { [key: string]: any } = {
      ...existing,
      id,
      status: status as any,
      approvedBy: user.id,
      approvalStatus: status === 'approved' ? 'approved' : 'rejected',
      paymentReleaseApproved: releasePayment,
      paymentReleasedAt: releasePayment ? new Date().toISOString() : undefined,
      paymentReleasedBy: releasePayment ? user.id : undefined,
      approvalRemarks: remarks || existing.notes,
      updatedAt: new Date().toISOString()
    };
    if (accountId) updates.accountId = accountId;

    await docRef.set(updates, { merge: true });
    return updates as ExpenseRecord;
  }

  async getNextInvoiceNumber(type: 'invoice' | 'quotation' = 'invoice'): Promise<string> {
    const prefix = type === 'quotation' ? 'QTN' : 'INV';
    const year = new Date().getFullYear();
    const snap = await firestore.collection('invoices').where('type', '==', type).get();
    const count = snap.size + 1;
    return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
  }

  async approveInvoice(
    id: string,
    user: { id: string; fullName?: string; username: string },
    status: string = 'approved',
    remarks?: string
  ): Promise<InvoiceRecord> {
    const docRef = firestore.collection('invoices').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Invoice not found.');
    const existing = doc.data() as InvoiceRecord;

    const updates: any = {
      ...existing,
      id,
      status: status === 'approved' ? 'approved' : status,
      approvalStatus: status,
      approvedBy: user.id,
      approvedByName: user.fullName || user.username,
      approvedAt: new Date().toISOString(),
      approvalRemarks: remarks || '',
      updatedAt: new Date().toISOString()
    };

    await docRef.set(updates, { merge: true });
    return updates;
  }

  async collectInvoicePayment(id: string, paymentData: any): Promise<{ invoice: InvoiceRecord; incomeRecord: IncomeRecord }> {
    const docRef = firestore.collection('invoices').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Invoice not found.');
    const invoice = doc.data() as InvoiceRecord;

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

    await docRef.set(updatedInvoice, { merge: true });

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

    const member = await this.getMemberById(memberId);

    const totalPaid = Number(amount || 0);
    const discountGiven = Number(discount || 0);
    const finesCollected = Number(fines || 0);

    const docRef = firestore.collection('memberContributions').doc(docId);
    const existingDoc = await docRef.get();
    const existing = existingDoc.exists ? (existingDoc.data() as MemberContributionRecord) : null;

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

    await docRef.set(record, { merge: true });

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
    await firestore.collection('budgetAllocations').doc(id).set(alloc, { merge: true });
    return alloc;
  }

  async deleteBudgetAllocation(id: string): Promise<void> {
    await firestore.collection('budgetAllocations').doc(id).delete();
  }

  async setIneligibleParticipantIds(ineligibleIds: string[]): Promise<void> {
    await firestore.collection('masterIneligibleParticipants').doc('main').set({
      ineligibleIds,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  // -------------------------------------------------------------
  // AUDIT LOGS, INBOX & NOTIFICATIONS
  // -------------------------------------------------------------
  async getAuditLogs(): Promise<AuditLog[]> {
    const snap = await firestore.collection('auditLogs').orderBy('createdAt', 'desc').limit(200).get();
    return snap.docs.map(d => d.data() as AuditLog);
  }

  async logAudit(data: Partial<AuditLog>): Promise<void> {
    const id = data.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const log: AuditLog = {
      id,
      createdAt: data.createdAt || (data as any).timestamp || new Date().toISOString(),
      userId: data.userId || 'system',
      username: data.username || 'system',
      fullName: data.fullName || 'System',
      action: data.action || 'GENERAL_ACTION',
      module: data.module || ('system' as any),
      recordId: data.recordId,
      previousValue: data.previousValue,
      newValue: data.newValue,
      reason: data.reason || ''
    };
    await firestore.collection('auditLogs').doc(id).set(log);
  }

  async getInboxMessages(): Promise<InboxMessage[]> {
    const snap = await firestore.collection('inboxMessages').get();
    return snap.docs.map(d => d.data() as InboxMessage);
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
    await firestore.collection('inboxMessages').doc(id).set(msg);
    return msg;
  }

  async updateInboxMessage(id: string, updates: Partial<InboxMessage>): Promise<InboxMessage> {
    const docRef = firestore.collection('inboxMessages').doc(id);
    const updated = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as InboxMessage;
  }

  async updateInboxMessageStatus(id: string, status: 'read' | 'unread' | 'archived'): Promise<InboxMessage> {
    const docRef = firestore.collection('inboxMessages').doc(id);
    const updated = {
      id,
      status: (status === 'read' ? 'resolved' : 'pending') as any,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    const snap = await docRef.get();
    return snap.data() as InboxMessage;
  }

  async deleteInboxMessage(id: string): Promise<void> {
    await firestore.collection('inboxMessages').doc(id).delete();
  }

  async getAppNotifications(userId?: string): Promise<AppNotification[]> {
    const snap = await firestore.collection('appNotifications').get();
    const all = snap.docs.map(d => d.data() as AppNotification);
    if (!userId) return all;
    return all.filter(n => !n.recipientId || n.recipientId === userId || n.recipientId === 'all');
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
    await firestore.collection('appNotifications').doc(id).set(notif);
    return notif;
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
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
      const snap = await firestore.collection(def.key).get();
      const count = snap.size;
      const sample = snap.docs.slice(0, 3).map(d => d.data());
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
    await this.verifyStartupSchema();
    const meta = getDatabaseMetadata();
    return {
      status: 'success',
      syncedAt: new Date().toISOString(),
      collectionsSynced: 30,
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
      'presidentialDirectives', 'officialCirculars', 'invoices'
    ];

    const backup: Record<string, any[]> = {};
    for (const col of collections) {
      const snap = await firestore.collection(col).get();
      backup[col] = snap.docs.map(d => d.data());
    }

    return backup;
  }

  async importFullDatabase(data: Record<string, any[]>): Promise<void> {
    for (const [colName, docs] of Object.entries(data)) {
      if (Array.isArray(docs)) {
        // Break into batches of max 400 operations
        const chunkSize = 400;
        for (let i = 0; i < docs.length; i += chunkSize) {
          const chunk = docs.slice(i, i + chunkSize);
          const batch = firestore.batch();
          for (const doc of chunk) {
            const docId = doc.id || doc.key || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const docRef = firestore.collection(colName).doc(docId);
            batch.set(docRef, doc, { merge: true });
          }
          await batch.commit();
        }
      }
    }
  }
}

export const db = new FirestoreDatabaseStore();
