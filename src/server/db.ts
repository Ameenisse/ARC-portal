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
  async verifyStartupSchema() {
    try {
      console.log('[Firestore] Checking system installation status...');
      const installRef = firestore.collection('system').doc('installation');
      const installDoc = await installRef.get();

      if (installDoc.exists && installDoc.data()?.initialized === true) {
        console.log('[Firestore] System is permanently initialized. Preserving all live records.');
        return;
      }

      console.log('[Firestore] Performing initial one-time startup check...');
      const usersRef = firestore.collection('users');
      const adminSnap = await usersRef.where('username', '==', 'admin').get();

      // Only bootstrap initial master Admin credentials if completely no admin user exists
      if (adminSnap.empty) {
        console.log('[Firestore] No admin found. Bootstrapping initial Admin account (admin / 2613)...');
        const salt = generateSalt();
        const pinHash = hashPin('2613', salt);
        const adminId = 'usr_admin_001';

        const adminPermissions = ALL_MODULES.map(m => ({
          id: `perm_${adminId}_${m}`,
          roleId: 'role_admin',
          userId: adminId,
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

        await usersRef.doc(adminId).set({
          id: adminId,
          fullName: 'System Administrator',
          username: 'admin',
          designation: 'Chief Administrator',
          contactNumber: '+960 7771234',
          roleId: 'role_admin',
          roleName: 'Admin',
          status: 'active',
          requirePinChange: false,
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          notes: 'In-built primary system administrator account',
          permissions: adminPermissions,
          pinHash,
          pinSalt: salt
        });
      }

      await installRef.set({
        initialized: true,
        timestamp: new Date().toISOString(),
        databaseId: 'ai-studio-arc-1ed79364-547a-408d-9326-df4162ee21d6'
      });

      console.log('[Firestore] One-time startup verification complete.');
    } catch (err: any) {
      console.error('[Firestore] Startup schema check error:', err);
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
    const snap = await firestore.collection('users').get();
    return snap.docs.map(d => d.data() as User);
  }

  async getUserById(id: string): Promise<User | null> {
    const doc = await firestore.collection('users').doc(id).get();
    return doc.exists ? (doc.data() as User) : null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const clean = username.trim().toLowerCase();
    const snap = await firestore.collection('users').where('username', '==', clean).get();
    if (!snap.empty) {
      return snap.docs[0].data() as User;
    }
    // Also try case-insensitive lookup
    const allSnap = await firestore.collection('users').get();
    const match = allSnap.docs.find(d => (d.data().username || '').toLowerCase() === clean);
    return match ? (match.data() as User) : null;
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
    const userDoc = firestore.collection('users').doc(id);
    const existing = await userDoc.get();
    if (!existing.exists) {
      throw new Error(`User with ID ${id} not found.`);
    }

    const payload = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await userDoc.update(payload);
    const updated = await userDoc.get();
    return updated.data() as User;
  }

  async deleteUser(id: string): Promise<void> {
    await firestore.collection('users').doc(id).delete();
  }

  // SESSIONS
  async getSessions(): Promise<{ token: string; userId: string; expiresAt: number }[]> {
    const snap = await firestore.collection('userSessions').get();
    return snap.docs.map(d => d.data() as { token: string; userId: string; expiresAt: number });
  }

  async saveSession(session: { token: string; userId: string; expiresAt: number }): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(session.token).digest('hex');
    await firestore.collection('userSessions').doc(tokenHash).set({
      id: tokenHash,
      token: session.token,
      tokenHash,
      userId: session.userId,
      expiresAt: session.expiresAt,
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
  }

  async deleteSession(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await firestore.collection('userSessions').doc(tokenHash).delete();
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
    await docRef.update({ ...updates, updatedAt: new Date().toISOString() });
    const snap = await docRef.get();
    return snap.data() as Role;
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
    return doc.exists ? (doc.data() as ClubMember) : null;
  }

  async createMember(data: Partial<ClubMember>): Promise<ClubMember> {
    const id = data.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Generate atomic member number if not provided (e.g. ARC-M-001)
    let memberNumber = data.memberNumber;
    if (!memberNumber) {
      const counterRef = firestore.collection('counters').doc('members');
      await firestore.runTransaction(async (t) => {
        const doc = await t.get(counterRef);
        const nextNum = (doc.exists ? (doc.data()?.count || 1) : 1);
        memberNumber = `ARC-M-${String(nextNum).padStart(3, '0')}`;
        t.set(counterRef, { count: nextNum + 1 }, { merge: true });
      });
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

    await firestore.collection('clubMembers').doc(id).set(member);
    return member;
  }

  async updateMember(id: string, updates: Partial<ClubMember>): Promise<ClubMember> {
    const docRef = firestore.collection('clubMembers').doc(id);
    await docRef.update({ ...updates, updatedAt: new Date().toISOString() });
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
    await docRef.update(updates);
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
      eventType: data.eventType || 'activity' as any,
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
    await docRef.update({ ...updates, updatedAt: new Date().toISOString() });
    const snap = await docRef.get();
    return snap.data() as EventItem;
  }

  async deleteEventItem(id: string): Promise<void> {
    await firestore.collection('eventItems').doc(id).delete();
  }

  async saveEventAttendance(id: string, attendance: any[]): Promise<EventItem> {
    const docRef = firestore.collection('eventItems').doc(id);
    await docRef.update({ attendance, updatedAt: new Date().toISOString() });
    const snap = await docRef.get();
    return snap.data() as EventItem;
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
    await docRef.update({ ...updates, updatedAt: new Date().toISOString() });
    const snap = await docRef.get();
    return snap.data() as MeetingItem;
  }

  async deleteMeetingItem(id: string): Promise<void> {
    await firestore.collection('meetingItems').doc(id).delete();
  }

  async saveMeetingAttendance(id: string, attendance: any[]): Promise<MeetingItem> {
    const docRef = firestore.collection('meetingItems').doc(id);
    await docRef.update({ attendance, updatedAt: new Date().toISOString() });
    const snap = await docRef.get();
    return snap.data() as MeetingItem;
  }

  async addMeetingVoting(id: string, votingData: any): Promise<MeetingItem> {
    const docRef = firestore.collection('meetingItems').doc(id);
    const snap = await docRef.get();
    const current = snap.data() as MeetingItem;
    const votings = current.votings || [];
    const newVoting = {
      id: `vote_${Date.now()}`,
      topic: votingData.topic || votingData.title || 'Voting Motion',
      description: votingData.description || '',
      status: 'open' as const,
      votes: votingData.votes || { inFavor: 0, against: 0, abstain: 0 },
      votedMembers: [],
      createdAt: new Date().toISOString(),
      ...votingData
    };
    votings.push(newVoting);
    await docRef.update({ votings, updatedAt: new Date().toISOString() });
    const updatedSnap = await docRef.get();
    return updatedSnap.data() as MeetingItem;
  }

  async updateMeetingVoting(id: string, votingId: string, votingData: any): Promise<MeetingItem> {
    const docRef = firestore.collection('meetingItems').doc(id);
    const snap = await docRef.get();
    const current = snap.data() as MeetingItem;
    const votings = (current.votings || []).map(v => (v.id === votingId ? { ...v, ...votingData } : v));
    await docRef.update({ votings, updatedAt: new Date().toISOString() });
    const updatedSnap = await docRef.get();
    return updatedSnap.data() as MeetingItem;
  }

  // -------------------------------------------------------------
  // SLIDESHOW, CONTACTS, SOCIAL LINKS, EXCO
  // -------------------------------------------------------------
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
      desktopImage: data.desktopImage || (data as any).imageUrl || '',
      textAlignment: data.textAlignment || 'center',
      overlayLevel: data.overlayLevel || 40,
      displayOrder: data.displayOrder ?? 1,
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
    await docRef.update(updates);
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
    const item = { id, displayOrder: 1, status: 'active', ...data };
    await firestore.collection('contacts').doc(id).set(item);
    return item;
  }

  async updateContact(id: string, updates: any): Promise<any> {
    const docRef = firestore.collection('contacts').doc(id);
    await docRef.update(updates);
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

  async createSocialLink(data: any): Promise<SocialLink> {
    const id = data.id || `soc_${Date.now()}`;
    const item: SocialLink = { id, displayOrder: 1, status: 'active', openInNewTab: true, platform: 'website', url: '', ...data };
    await firestore.collection('socialLinks').doc(id).set(item);
    return item;
  }

  async updateSocialLink(id: string, updates: any): Promise<SocialLink> {
    const docRef = firestore.collection('socialLinks').doc(id);
    await docRef.update(updates);
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

  async createExcoMember(data: any): Promise<ExcoMember> {
    const id = data.id || `exco_${Date.now()}`;
    const item: ExcoMember = {
      id,
      fullName: data.fullName || '',
      designation: data.designation || '',
      image: data.image || '',
      displayOrder: 1,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };
    await firestore.collection('excoMembers').doc(id).set(item);
    return item;
  }

  async updateExcoMember(id: string, updates: any): Promise<ExcoMember> {
    const docRef = firestore.collection('excoMembers').doc(id);
    await docRef.update(updates);
    const snap = await docRef.get();
    return snap.data() as ExcoMember;
  }

  async deleteExcoMember(id: string): Promise<void> {
    await firestore.collection('excoMembers').doc(id).delete();
  }

  // -------------------------------------------------------------
  // SETTINGS & CLUB RULES
  // -------------------------------------------------------------
  async getSettings(): Promise<SiteSetting[]> {
    const snap = await firestore.collection('siteSettings').get();
    return snap.docs.map(d => d.data() as SiteSetting);
  }

  async updateSettings(settingsList: { group: string; key: string; value: any }[]): Promise<SiteSetting[]> {
    const batch = firestore.batch();
    const updatedList: SiteSetting[] = [];

    for (const item of settingsList) {
      const id = `set_${item.group}_${item.key}`;
      const docRef = firestore.collection('siteSettings').doc(id);
      const validGroup = (['branding', 'public_site', 'security', 'quiz', 'system', 'budget', 'invoice', 'widgets', 'content'].includes(item.group)
        ? item.group
        : (item.group || 'branding')) as 'branding' | 'public_site' | 'security' | 'quiz' | 'system' | 'budget' | 'invoice' | 'widgets' | 'content';

      const record: SiteSetting = {
        id,
        group: validGroup,
        key: item.key,
        value: item.value,
        updatedAt: new Date().toISOString()
      };
      batch.set(docRef, record, { merge: true });
      updatedList.push(record);
    }

    await batch.commit();
    return updatedList;
  }

  async getClubRules(): Promise<ClubRulesData> {
    const doc = await firestore.collection('clubRules').doc('main').get();
    if (doc.exists) {
      return doc.data() as ClubRulesData;
    }
    return defaultClubRules;
  }

  async updateClubRules(data: Partial<ClubRulesData>, updatedBy?: string): Promise<ClubRulesData> {
    const payload = {
      ...data,
      updatedByName: updatedBy,
      updatedAt: new Date().toISOString()
    };
    await firestore.collection('clubRules').doc('main').set(payload, { merge: true });
    return this.getClubRules();
  }

  // -------------------------------------------------------------
  // RAMAZAN QUIZ, SUBMISSIONS, WINNERS, PRIZES, SPONSORS
  // -------------------------------------------------------------
  async getQuizQuestions(): Promise<QuizQuestion[]> {
    const snap = await firestore.collection('quizQuestions').get();
    const list = snap.docs.map(d => {
      const q = d.data() as QuizQuestion;
      if (!q.createdAt) {
        q.createdAt = q.publishAt || new Date().toISOString();
      }
      return q;
    });
    return list.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
  }

  async createQuizQuestion(data: Partial<QuizQuestion>): Promise<QuizQuestion> {
    const id = data.id || `quiz_q_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const question: QuizQuestion = {
      id,
      title: data.title || `Day ${(data.questionNumber || (data as any).dayNumber || 1)} Quiz`,
      questionNumber: data.questionNumber || (data as any).dayNumber || 1,
      questionText: data.questionText || '',
      options: data.options || [],
      correctOptionId: data.correctOptionId || '',
      status: data.status || 'draft',
      publishAt: data.publishAt || nowIso,
      closeAt: data.closeAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      revealAt: data.revealAt || new Date(Date.now() + 24 * 60 * 60 * 1000 + 60000).toISOString(),
      drawStartAt: data.drawStartAt || data.closeAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      rollingDurationSeconds: data.rollingDurationSeconds || 10,
      winnerDisplayDurationSeconds: data.winnerDisplayDurationSeconds || 30,
      prizeTitle: data.prizeTitle || 'Daily Prize',
      displayOrder: data.displayOrder || 1,
      createdAt: data.createdAt || nowIso,
      updatedAt: nowIso,
      ...(data as any)
    };
    if (!question.createdAt) {
      question.createdAt = nowIso;
    }
    await firestore.collection('quizQuestions').doc(id).set(question);
    return question;
  }

  async updateQuizQuestion(id: string, updates: Partial<QuizQuestion>): Promise<QuizQuestion> {
    const docRef = firestore.collection('quizQuestions').doc(id);
    const existingSnap = await docRef.get();
    const existing = existingSnap.exists ? (existingSnap.data() as QuizQuestion) : null;
    const createdAt = existing?.createdAt || updates.createdAt || existing?.publishAt || new Date().toISOString();
    const payload = {
      ...updates,
      createdAt,
      updatedAt: new Date().toISOString()
    };
    await docRef.update(payload);
    const snap = await docRef.get();
    return snap.data() as QuizQuestion;
  }

  async deleteQuizQuestion(id: string): Promise<{ deletedSubmissionsCount: number; deletedWinnersCount: number }> {
    // 1. Delete the question document
    await firestore.collection('quizQuestions').doc(id).delete();

    // 2. Cascade delete all submissions for this question
    const submissionsSnap = await firestore.collection('quizSubmissions')
      .where('questionId', '==', id)
      .get();
    
    let deletedSubmissionsCount = 0;
    if (!submissionsSnap.empty) {
      const batch = firestore.batch();
      submissionsSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedSubmissionsCount++;
      });
      await batch.commit();
    }

    // 3. Cascade delete all winners for this question
    const winnersSnap = await firestore.collection('quizWinners')
      .where('questionId', '==', id)
      .get();

    let deletedWinnersCount = 0;
    if (!winnersSnap.empty) {
      const batch = firestore.batch();
      winnersSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedWinnersCount++;
      });
      await batch.commit();
    }

    return { deletedSubmissionsCount, deletedWinnersCount };
  }

  async getQuizSubmissions(): Promise<QuizSubmission[]> {
    const snap = await firestore.collection('quizSubmissions').get();
    return snap.docs.map(d => d.data() as QuizSubmission);
  }

  async createQuizSubmission(data: Partial<QuizSubmission>): Promise<QuizSubmission> {
    const normId = (data.normalizedIdNumber || data.idNumber || '').toUpperCase().trim();
    const questionId = data.questionId || '';
    const id = data.id || `${questionId}_${normId}` || `sub_${Date.now()}`;

    // Atomically increment participant counter if participant number is not set
    let participantNumber = data.participantNumber;
    if (!participantNumber) {
      const counterRef = firestore.collection('counters').doc('quizParticipants');
      await firestore.runTransaction(async (t) => {
        const doc = await t.get(counterRef);
        const nextNum = (doc.exists ? (doc.data()?.count || 1) : 1);
        participantNumber = `ARC-Q-${String(nextNum).padStart(5, '0')}`;
        t.set(counterRef, { count: nextNum + 1 }, { merge: true });
      });
    }

    const submission: QuizSubmission = {
      id,
      participantNumber: participantNumber || `SUB-${Date.now().toString().slice(-4)}`,
      questionId,
      idNumber: data.idNumber || normId,
      normalizedIdNumber: normId,
      contactNumber: data.contactNumber || '',
      selectedOptionId: data.selectedOptionId || '',
      isCorrect: Boolean(data.isCorrect),
      isEligible: Boolean(data.isEligible),
      isInvalid: Boolean(data.isInvalid),
      isDisqualified: Boolean(data.isDisqualified),
      maskedIdNumber: data.maskedIdNumber || '***',
      maskedContactNumber: data.maskedContactNumber || '****',
      submittedAt: data.submittedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };

    await firestore.collection('quizSubmissions').doc(id).set(submission);
    return submission;
  }

  async disqualifyQuizSubmission(id: string, isDisqualified: boolean, reason: string): Promise<QuizSubmission> {
    const docRef = firestore.collection('quizSubmissions').doc(id);
    await docRef.update({
      isDisqualified,
      isEligible: !isDisqualified,
      disqualificationReason: reason,
      updatedAt: new Date().toISOString()
    });
    const snap = await docRef.get();
    return snap.data() as QuizSubmission;
  }

  async deleteQuizSubmission(id: string): Promise<void> {
    // 1. Check if submission was recorded as a winner
    const winnersSnap = await firestore.collection('quizWinners')
      .where('submissionId', '==', id)
      .get();
    
    if (!winnersSnap.empty) {
      for (const wDoc of winnersSnap.docs) {
        await this.deleteQuizWinner(wDoc.id);
      }
    }

    await firestore.collection('quizSubmissions').doc(id).delete();
  }

  async getQuizWinners(): Promise<QuizWinner[]> {
    const snap = await firestore.collection('quizWinners').get();
    return snap.docs.map(d => d.data() as QuizWinner);
  }

  async createQuizWinner(data: Partial<QuizWinner>): Promise<QuizWinner> {
    const id = data.id || `win_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const winner: QuizWinner = {
      id,
      questionId: data.questionId || '',
      submissionId: data.submissionId || '',
      participantNumber: data.participantNumber || '',
      maskedIdNumber: data.maskedIdNumber || '',
      maskedContactNumber: data.maskedContactNumber || '',
      fullName: data.fullName || (data as any).participantName || '',
      contactNumber: data.contactNumber || '',
      idNumber: data.idNumber || '',
      prizeTitle: data.prizeTitle || 'Prize',
      eligibleCount: data.eligibleCount || 1,
      selectedAt: data.selectedAt || new Date().toISOString(),
      selectedBy: data.selectedBy || 'system',
      selectionMethod: data.selectionMethod || 'random',
      auditReference: data.auditReference || `DRAW-${Date.now()}`,
      contactedStatus: data.contactedStatus || 'not_contacted',
      prizeCollectionStatus: data.prizeCollectionStatus || 'pending',
      publicStatus: data.publicStatus || 'published',
      isReplaced: false,
      ...(data as any)
    };
    await firestore.collection('quizWinners').doc(id).set(winner);
    return winner;
  }

  async updateQuizWinner(id: string, updates: Partial<QuizWinner>): Promise<QuizWinner> {
    const docRef = firestore.collection('quizWinners').doc(id);
    await docRef.update(updates);
    const snap = await docRef.get();
    return snap.data() as QuizWinner;
  }

  async reselectQuizWinner(winnerId: string, reason: string): Promise<{ oldWinner: QuizWinner; newWinner: QuizWinner }> {
    const oldWinnerDoc = firestore.collection('quizWinners').doc(winnerId);
    const oldWinnerSnap = await oldWinnerDoc.get();
    if (!oldWinnerSnap.exists) {
      throw new Error(`Winner ${winnerId} not found.`);
    }

    const oldWinner = oldWinnerSnap.data() as QuizWinner;
    await oldWinnerDoc.update({
      isReplaced: true,
      publicStatus: 'hidden',
      replacementReason: reason
    });

    // Find new eligible winner
    const submissions = await this.getQuizSubmissions();
    const ineligible = await this.getIneligibleParticipantIds();
    const previousWinners = await this.getQuizWinners();
    const usedSubmissionIds = new Set(previousWinners.filter(w => !w.isReplaced).map(w => w.submissionId));

    const candidates = submissions.filter(s =>
      s.questionId === oldWinner.questionId &&
      s.isCorrect &&
      !s.isDisqualified &&
      !s.isInvalid &&
      !usedSubmissionIds.has(s.id) &&
      !ineligible.includes((s.normalizedIdNumber || '').toUpperCase())
    );

    if (candidates.length === 0) {
      throw new Error('No alternative eligible submissions available for redraw.');
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    const chosen = candidates[randomIndex];
    const auditRef = `RESELECT-${Date.now().toString(36).toUpperCase()}`;

    const newWinner = await this.createQuizWinner({
      questionId: oldWinner.questionId,
      submissionId: chosen.id,
      participantNumber: chosen.participantNumber,
      fullName: (chosen as any).participantName || chosen.maskedIdNumber,
      idNumber: chosen.normalizedIdNumber || chosen.idNumber,
      contactNumber: chosen.contactNumber,
      maskedIdNumber: chosen.maskedIdNumber,
      maskedContactNumber: chosen.maskedContactNumber,
      prizeTitle: oldWinner.prizeTitle,
      eligibleCount: candidates.length,
      selectedBy: 'system (reselection)',
      selectionMethod: 'random' as any,
      auditReference: auditRef,
      internalNotes: `Reselected replacing ${oldWinner.participantNumber}. Reason: ${reason}`
    });

    return { oldWinner: { ...oldWinner, isReplaced: true, publicStatus: 'hidden' }, newWinner };
  }

  async deleteQuizWinner(id: string): Promise<void> {
    const docRef = firestore.collection('quizWinners').doc(id);
    const snap = await docRef.get();
    if (snap.exists) {
      const winnerData = snap.data() as QuizWinner;
      await docRef.delete();

      // If question had its status as completed, check if other active winners exist
      if (winnerData.questionId) {
        const remainingSnap = await firestore.collection('quizWinners')
          .where('questionId', '==', winnerData.questionId)
          .where('isReplaced', '==', false)
          .get();

        if (remainingSnap.empty) {
          const qRef = firestore.collection('quizQuestions').doc(winnerData.questionId);
          const qSnap = await qRef.get();
          if (qSnap.exists) {
            const qData = qSnap.data() as QuizQuestion;
            if (qData.status === 'completed') {
              await qRef.update({ status: 'closed', updatedAt: new Date().toISOString() });
            }
          }
        }
      }
    }
  }

  async getPrizes(): Promise<QuizPrize[]> {
    const snap = await firestore.collection('quizPrizes').get();
    return snap.docs.map(d => d.data() as QuizPrize);
  }

  async createPrize(data: any): Promise<QuizPrize> {
    const id = data.id || `prize_${Date.now()}`;
    const prize: QuizPrize = { id, title: data.title || 'Prize', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
    await firestore.collection('quizPrizes').doc(id).set(prize);
    return prize;
  }

  async updatePrize(id: string, updates: any): Promise<QuizPrize> {
    const docRef = firestore.collection('quizPrizes').doc(id);
    await docRef.update({ ...updates, updatedAt: new Date().toISOString() });
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

  async createSponsor(data: any): Promise<QuizSponsor> {
    const id = data.id || `spons_${Date.now()}`;
    const sponsor: QuizSponsor = { id, name: data.name || 'Sponsor', displayOrder: 1, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
    await firestore.collection('quizSponsors').doc(id).set(sponsor);
    return sponsor;
  }

  async updateSponsor(id: string, updates: any): Promise<QuizSponsor> {
    const docRef = firestore.collection('quizSponsors').doc(id);
    await docRef.update({ ...updates, updatedAt: new Date().toISOString() });
    const snap = await docRef.get();
    return snap.data() as QuizSponsor;
  }

  async deleteSponsor(id: string): Promise<void> {
    await firestore.collection('quizSponsors').doc(id).delete();
  }

  async getIneligibleParticipantIds(): Promise<string[]> {
    const snap = await firestore.collection('masterIneligibleParticipants').where('isBlocked', '==', true).get();
    return snap.docs.map(d => (d.data().idNumber || '').toUpperCase());
  }

  async setMasterParticipantEligibility(idNumber: string, isBlocked: boolean, reason?: string): Promise<void> {
    const norm = idNumber.toUpperCase().trim();
    await firestore.collection('masterIneligibleParticipants').doc(norm).set({
      idNumber: norm,
      isBlocked,
      reason: reason || '',
      updatedAt: new Date().toISOString()
    });

    // Cascade update all submissions across all questions for this participant ID
    const allSubsSnap = await firestore.collection('quizSubmissions').get();
    if (!allSubsSnap.empty) {
      const matchingDocs = allSubsSnap.docs.filter(d => {
        const data = d.data() as QuizSubmission;
        const subNorm = (data.normalizedIdNumber || data.idNumber || '').toUpperCase().trim();
        return subNorm === norm;
      });

      if (matchingDocs.length > 0) {
        const batch = firestore.batch();
        matchingDocs.forEach(doc => {
          const data = doc.data() as QuizSubmission;
          if (isBlocked) {
            batch.update(doc.ref, {
              isDisqualified: true,
              isEligible: false,
              disqualificationReason: reason || 'Disqualified via Master Participant List',
              updatedAt: new Date().toISOString()
            });
          } else {
            const isEligible = Boolean(data.isCorrect && !data.isInvalid);
            batch.update(doc.ref, {
              isDisqualified: false,
              isEligible,
              disqualificationReason: '',
              updatedAt: new Date().toISOString()
            });
          }
        });
        await batch.commit();
      }
    }
  }

  async deleteMasterParticipant(idNumber: string): Promise<{ deletedSubmissionsCount: number; deletedWinnersCount: number }> {
    const norm = idNumber.toUpperCase().trim();

    // 1. Remove from masterIneligibleParticipants if present
    await firestore.collection('masterIneligibleParticipants').doc(norm).delete().catch(() => {});

    // 2. Query and delete all submissions with this normalizedIdNumber or idNumber
    const allSubsSnap = await firestore.collection('quizSubmissions').get();
    let deletedSubmissionsCount = 0;
    const deletedSubmissionIds = new Set<string>();

    if (!allSubsSnap.empty) {
      const matchingDocs = allSubsSnap.docs.filter(d => {
        const data = d.data() as QuizSubmission;
        const subNorm = (data.normalizedIdNumber || data.idNumber || '').toUpperCase().trim();
        return subNorm === norm;
      });

      if (matchingDocs.length > 0) {
        const batch = firestore.batch();
        matchingDocs.forEach(doc => {
          deletedSubmissionIds.add(doc.id);
          batch.delete(doc.ref);
          deletedSubmissionsCount++;
        });
        await batch.commit();
      }
    }

    // 3. Delete any winners associated with this participant (by normalizedIdNumber, idNumber, or deleted submissionId)
    const allWinnersSnap = await firestore.collection('quizWinners').get();
    let deletedWinnersCount = 0;
    const affectedQuestionIds = new Set<string>();

    if (!allWinnersSnap.empty) {
      const matchingWinners = allWinnersSnap.docs.filter(d => {
        const data = d.data() as QuizWinner;
        const winNorm = (data.idNumber || data.maskedIdNumber || '').toUpperCase().trim();
        return winNorm === norm || (data.submissionId && deletedSubmissionIds.has(data.submissionId));
      });

      if (matchingWinners.length > 0) {
        const batch = firestore.batch();
        matchingWinners.forEach(doc => {
          const data = doc.data() as QuizWinner;
          if (data.questionId) affectedQuestionIds.add(data.questionId);
          batch.delete(doc.ref);
          deletedWinnersCount++;
        });
        await batch.commit();
      }
    }

    // 4. Update status of affected questions if needed (from completed to closed if no other active winners remain)
    for (const qId of affectedQuestionIds) {
      const remainingSnap = await firestore.collection('quizWinners')
        .where('questionId', '==', qId)
        .where('isReplaced', '==', false)
        .get();

      if (remainingSnap.empty) {
        const qRef = firestore.collection('quizQuestions').doc(qId);
        const qSnap = await qRef.get();
        if (qSnap.exists) {
          const qData = qSnap.data() as QuizQuestion;
          if (qData.status === 'completed') {
            await qRef.update({ status: 'closed', updatedAt: new Date().toISOString() });
          }
        }
      }
    }

    return { deletedSubmissionsCount, deletedWinnersCount };
  }

  // -------------------------------------------------------------
  // BUDGET & ACCOUNTS & CONTRIBUTIONS
  // -------------------------------------------------------------
  async getBankAccounts(): Promise<BankAccount[]> {
    const snap = await firestore.collection('budgetAccounts').get();
    return snap.docs.map(d => d.data() as BankAccount);
  }

  async createBankAccount(data: Partial<BankAccount>): Promise<BankAccount> {
    const id = data.id || `acc_${Date.now()}`;
    const balance = Number(data.currentBalance ?? data.openingBalance ?? (data as any).balance ?? 0);
    const acc: BankAccount = {
      id,
      accountName: data.accountName || 'Bank Account',
      accountNumber: data.accountNumber || '',
      bankName: data.bankName || '',
      type: data.type || 'bank',
      currency: data.currency || 'MVR',
      openingBalance: balance,
      currentBalance: balance,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    await firestore.collection('budgetAccounts').doc(id).set(acc);
    return acc;
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

  async transferAccountFunds(data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<AccountTransferRecord> {
    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Transfer amount must be greater than zero.');
    }

    const fromRef = firestore.collection('budgetAccounts').doc(data.fromAccountId);
    const toRef = firestore.collection('budgetAccounts').doc(data.toAccountId);
    const transferId = `trf_${Date.now()}`;

    let transferRecord: AccountTransferRecord;

    await firestore.runTransaction(async (t) => {
      const fromSnap = await t.get(fromRef);
      const toSnap = await t.get(toRef);

      if (!fromSnap.exists || !toSnap.exists) {
        throw new Error('One or both bank accounts not found.');
      }

      const fromData = fromSnap.data() as BankAccount;
      const toData = toSnap.data() as BankAccount;

      const fromBalance = fromData.currentBalance ?? (fromData as any).balance ?? 0;
      const toBalance = toData.currentBalance ?? (toData as any).balance ?? 0;

      if (fromBalance < amount) {
        throw new Error(`Insufficient funds in source account (${fromData.accountName}). Available: ${fromBalance} MVR`);
      }

      t.update(fromRef, { currentBalance: fromBalance - amount, balance: fromBalance - amount, updatedAt: new Date().toISOString() });
      t.update(toRef, { currentBalance: toBalance + amount, balance: toBalance + amount, updatedAt: new Date().toISOString() });

      transferRecord = {
        id: transferId,
        fromAccountId: data.fromAccountId,
        fromAccountName: fromData.accountName,
        toAccountId: data.toAccountId,
        toAccountName: toData.accountName,
        amount,
        date: new Date().toISOString(),
        notes: data.notes || data.description || 'Account fund transfer',
        createdBy: data.createdBy || 'System',
        createdAt: new Date().toISOString()
      };

      t.set(firestore.collection('accountTransfers').doc(transferId), transferRecord);
    });

    return transferRecord!;
  }

  async getAccountTransfers(): Promise<AccountTransferRecord[]> {
    const snap = await firestore.collection('accountTransfers').get();
    return snap.docs.map(d => d.data() as AccountTransferRecord);
  }

  async getIncomeRecords(params?: { category?: string; accountId?: string; startDate?: string; endDate?: string }): Promise<IncomeRecord[]> {
    let query: any = firestore.collection('incomeRecords');
    if (params?.category) query = query.where('category', '==', params.category);
    if (params?.accountId) query = query.where('accountId', '==', params.accountId);

    const snap = await query.get();
    let records = snap.docs.map((d: any) => d.data() as IncomeRecord);

    if (params?.startDate) {
      records = records.filter(r => new Date(r.date || (r as any).incomeDate).getTime() >= new Date(params.startDate!).getTime());
    }
    if (params?.endDate) {
      records = records.filter(r => new Date(r.date || (r as any).incomeDate).getTime() <= new Date(params.endDate!).getTime());
    }

    return records.sort((a, b) => new Date(b.date || (b as any).incomeDate).getTime() - new Date(a.date || (a as any).incomeDate).getTime());
  }

  async createIncomeRecord(data: Partial<IncomeRecord>): Promise<IncomeRecord> {
    const id = data.id || `inc_${Date.now()}`;
    const amount = Number(data.amount || 0);

    const record: IncomeRecord = {
      id,
      title: data.title || 'Income Record',
      amount,
      category: data.category || 'donation',
      accountId: data.accountId || 'acc_primary_001',
      date: data.date || (data as any).incomeDate || new Date().toISOString(),
      paymentMethod: data.paymentMethod || 'bank_transfer',
      receivedFrom: data.receivedFrom || 'Donor / Member',
      status: data.status || 'received',
      createdBy: data.createdBy || 'System',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };

    await firestore.collection('incomeRecords').doc(id).set(record);

    // Update account balance
    if (record.accountId) {
      const accRef = firestore.collection('budgetAccounts').doc(record.accountId);
      const accSnap = await accRef.get();
      if (accSnap.exists) {
        const acc = accSnap.data() as BankAccount;
        const curBal = acc.currentBalance ?? (acc as any).balance ?? 0;
        await accRef.update({ currentBalance: curBal + amount, balance: curBal + amount, updatedAt: new Date().toISOString() });
      }
    }

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

  async getExpenseRecords(params?: { category?: string; accountId?: string; status?: string; startDate?: string; endDate?: string }): Promise<ExpenseRecord[]> {
    let query: any = firestore.collection('expenseRecords');
    if (params?.category) query = query.where('category', '==', params.category);
    if (params?.accountId) query = query.where('accountId', '==', params.accountId);
    if (params?.status) query = query.where('status', '==', params.status);

    const snap = await query.get();
    let records = snap.docs.map((d: any) => d.data() as ExpenseRecord);

    if (params?.startDate) {
      records = records.filter(r => new Date(r.date || (r as any).expenseDate).getTime() >= new Date(params.startDate!).getTime());
    }
    if (params?.endDate) {
      records = records.filter(r => new Date(r.date || (r as any).expenseDate).getTime() <= new Date(params.endDate!).getTime());
    }

    return records.sort((a, b) => new Date(b.date || (b as any).expenseDate).getTime() - new Date(a.date || (a as any).expenseDate).getTime());
  }

  async createExpenseRecord(data: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    const id = data.id || `exp_${Date.now()}`;
    const amount = Number(data.amount || 0);

    const record: ExpenseRecord = {
      id,
      title: data.title || 'Expense Record',
      amount,
      category: data.category || 'office_admin',
      accountId: data.accountId || 'acc_primary_001',
      date: data.date || (data as any).expenseDate || new Date().toISOString(),
      payee: data.payee || 'Vendor / Service Provider',
      status: data.status || 'paid',
      paymentMethod: data.paymentMethod || 'bank_transfer',
      createdBy: data.createdBy || 'System',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };

    await firestore.collection('expenseRecords').doc(id).set(record);

    // If marked paid, deduct from bank account balance
    if (record.status === 'paid' && record.accountId) {
      const accRef = firestore.collection('budgetAccounts').doc(record.accountId);
      const accSnap = await accRef.get();
      if (accSnap.exists) {
        const acc = accSnap.data() as BankAccount;
        const curBal = acc.currentBalance ?? (acc as any).balance ?? 0;
        await accRef.update({ currentBalance: curBal - amount, balance: curBal - amount, updatedAt: new Date().toISOString() });
      }
    }

    return record;
  }

  async updateExpenseRecord(id: string, updates: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    const docRef = firestore.collection('expenseRecords').doc(id);
    const prevSnap = await docRef.get();
    const prevData = prevSnap.exists ? (prevSnap.data() as ExpenseRecord) : null;

    await docRef.update({ ...updates, updatedAt: new Date().toISOString() });
    const snap = await docRef.get();
    const updated = snap.data() as ExpenseRecord;

    // Handle balance adjustments on status change
    if (prevData) {
      const prevPaid = prevData.status === 'paid';
      const nowPaid = updated.status === 'paid';
      const targetAccountId = updated.accountId || prevData.accountId;

      if (!prevPaid && nowPaid && targetAccountId) {
        // Newly marked paid -> deduct
        const accRef = firestore.collection('budgetAccounts').doc(targetAccountId);
        const accSnap = await accRef.get();
        if (accSnap.exists) {
          const acc = accSnap.data() as BankAccount;
          const curBal = acc.currentBalance ?? (acc as any).balance ?? 0;
          await accRef.update({ currentBalance: curBal - updated.amount, balance: curBal - updated.amount, updatedAt: new Date().toISOString() });
        }
      } else if (prevPaid && !nowPaid && prevData.accountId) {
        // Was paid, now reverted -> refund
        const accRef = firestore.collection('budgetAccounts').doc(prevData.accountId);
        const accSnap = await accRef.get();
        if (accSnap.exists) {
          const acc = accSnap.data() as BankAccount;
          const curBal = acc.currentBalance ?? (acc as any).balance ?? 0;
          await accRef.update({ currentBalance: curBal + prevData.amount, balance: curBal + prevData.amount, updatedAt: new Date().toISOString() });
        }
      }
    }

    return updated;
  }

  async approveExpensePayment(
    id: string,
    approver: { id: string; fullName?: string; username: string },
    status: 'approved' | 'paid' | 'rejected',
    releasePayment: boolean = false,
    accountId?: string,
    remarks?: string
  ): Promise<ExpenseRecord> {
    const docRef = firestore.collection('expenseRecords').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new Error(`Expense record not found: ${id}`);
    }
    const current = snap.data() as ExpenseRecord;

    const finalStatus: 'paid' | 'pending_approval' | 'rejected' =
      status === 'paid' || (status === 'approved' && releasePayment)
        ? 'paid'
        : status === 'rejected'
        ? 'rejected'
        : 'pending_approval';

    const updates: Partial<ExpenseRecord> = {
      status: finalStatus,
      approvalStatus: status === 'rejected' ? 'rejected' : 'approved',
      approvedBy: approver.fullName || approver.username,
      paymentReleaseApproved: status === 'paid' || (status === 'approved' && releasePayment),
      paymentReleasedAt: (status === 'paid' || releasePayment) ? new Date().toISOString() : undefined,
      paymentReleasedBy: (status === 'paid' || releasePayment) ? (approver.fullName || approver.username) : undefined,
      approvalRemarks: remarks || current.approvalRemarks,
      updatedAt: new Date().toISOString()
    };

    if (accountId) {
      updates.accountId = accountId;
    }

    return this.updateExpenseRecord(id, updates);
  }

  async deleteExpenseRecord(id: string): Promise<void> {
    const docRef = firestore.collection('expenseRecords').doc(id);
    const snap = await docRef.get();
    if (snap.exists) {
      const data = snap.data() as ExpenseRecord;
      // If paid, restore bank balance
      if (data.status === 'paid' && data.accountId) {
        const accRef = firestore.collection('budgetAccounts').doc(data.accountId);
        const accSnap = await accRef.get();
        if (accSnap.exists) {
          const acc = accSnap.data() as BankAccount;
          const curBal = acc.currentBalance ?? (acc as any).balance ?? 0;
          await accRef.update({ currentBalance: curBal + data.amount, balance: curBal + data.amount, updatedAt: new Date().toISOString() });
        }
      }
    }
    await docRef.delete();
  }

  // -------------------------------------------------------------
  // INVOICES & QUOTATIONS GENERATOR
  // -------------------------------------------------------------
  async getInvoices(params?: { type?: string; status?: string; startDate?: string; endDate?: string; search?: string }): Promise<InvoiceRecord[]> {
    let query: any = firestore.collection('invoices');
    if (params?.type && params.type !== 'all') {
      query = query.where('type', '==', params.type);
    }
    if (params?.status && params.status !== 'all') {
      query = query.where('status', '==', params.status);
    }

    const snap = await query.get();
    let records = snap.docs.map((d: any) => d.data() as InvoiceRecord);

    if (params?.startDate) {
      records = records.filter(r => new Date(r.invoiceDate).getTime() >= new Date(params.startDate!).getTime());
    }
    if (params?.endDate) {
      records = records.filter(r => new Date(r.invoiceDate).getTime() <= new Date(params.endDate!).getTime());
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      records = records.filter(r =>
        r.invoiceNumber.toLowerCase().includes(q) ||
        r.billTo.toLowerCase().includes(q) ||
        (r.remark && r.remark.toLowerCase().includes(q)) ||
        r.items.some(i => i.description.toLowerCase().includes(q))
      );
    }

    return records.sort((a, b) => new Date(b.createdAt || b.invoiceDate).getTime() - new Date(a.createdAt || a.invoiceDate).getTime());
  }

  async getInvoiceById(id: string): Promise<InvoiceRecord | null> {
    const doc = await firestore.collection('invoices').doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as InvoiceRecord;
  }

  async getNextInvoiceNumber(type: 'invoice' | 'quotation' = 'invoice'): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = type === 'invoice' ? `ARC/INV/${year}/` : `ARC/QUO/${year}/`;
    
    const snap = await firestore.collection('invoices').where('type', '==', type).get();
    const existing = snap.docs
      .map(d => d.data() as InvoiceRecord)
      .filter(i => i.invoiceNumber && i.invoiceNumber.startsWith(prefix));

    let maxSeq = 0;
    for (const item of existing) {
      const parts = item.invoiceNumber.split('/');
      const seqStr = parts[parts.length - 1];
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }

    const nextSeq = maxSeq + 1;
    const padded = String(nextSeq).padStart(4, '0');
    return `${prefix}${padded}`;
  }

  async createInvoice(data: Partial<InvoiceRecord>): Promise<InvoiceRecord> {
    const id = data.id || `inv_${Date.now()}`;
    const type = data.type || 'invoice';
    const invoiceNumber = data.invoiceNumber || (await this.getNextInvoiceNumber(type));
    const invoiceDate = data.invoiceDate || new Date().toISOString().slice(0, 10);

    const items: InvoiceLineItem[] = (data.items || []).map((item, idx) => {
      const qty = Number(item.qty || 1);
      const rate = Number(item.rate || 0);
      const amount = Number(item.amount !== undefined ? item.amount : (qty * rate).toFixed(2));
      return {
        id: item.id || `item_${idx + 1}_${Date.now()}`,
        description: item.description || '',
        qty,
        rate,
        amount
      };
    });

    const subTotal = Number((data.subTotal !== undefined ? data.subTotal : items.reduce((sum, it) => sum + it.amount, 0)).toFixed(2));
    const discount = Number((data.discount || 0).toFixed(2));
    const totalNetPayments = Number(Math.max(0, subTotal - discount).toFixed(2));
    const amountPaid = Number((data.amountPaid || 0).toFixed(2));
    const amountDue = Number(Math.max(0, totalNetPayments - amountPaid).toFixed(2));

    const invoice: InvoiceRecord = {
      id,
      type,
      invoiceNumber,
      invoiceDate,
      dueDate: data.dueDate,
      billTo: data.billTo || 'Client / Customer Name',
      customerAddress: data.customerAddress || '',
      tin: data.tin || '',
      remark: data.remark || '',
      items,
      subTotal,
      discount,
      totalNetPayments,
      amountPaid,
      amountDue,
      paymentMethod: data.paymentMethod || 'online',
      receivedBy: data.receivedBy || '',
      receivedDate: data.receivedDate || '',
      signature: data.signature || '',
      bankName: data.bankName || 'Bank of Maldives (BML)',
      accountName: data.accountName || 'AANANDHA RECREATION CLUB',
      accountNumber: data.accountNumber || 'BML | (MVR) 7730000308018',
      logoUrl: data.logoUrl || '',
      footerNoticeEnglish: data.footerNoticeEnglish || 'For any queries or issues related to the invoice, please notify us within 24hrs.',
      footerNoticeDhivehi: data.footerNoticeDhivehi || 'ބިލާމެދު އެއްވެސް މައްސަލައެއް އުޅޭނަމަ 24 ގަޑިއިރު ތެރޭގައި އެންގުން އެދެމެވެ.',
      clubPhone: data.clubPhone || '6580394',
      clubEmail: data.clubEmail || 'arc.rmhc@gmail.com',
      clubAddress: data.clubAddress || 'AANANDHA RECREATION CLUB\nRaa.Maduvvari, 05110\nMaldives',
      status: data.status || 'pending_approval',
      approvalStatus: data.approvalStatus || (data.status === 'approved' ? 'approved' : 'pending'),
      approvedBy: data.approvedBy,
      approvedByName: data.approvedByName,
      approvedAt: data.approvedAt,
      approvalRemarks: data.approvalRemarks,
      createdBy: data.createdBy || 'System',
      createdByName: data.createdByName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await firestore.collection('invoices').doc(id).set(invoice);
    return invoice;
  }

  async updateInvoice(id: string, updates: Partial<InvoiceRecord>): Promise<InvoiceRecord> {
    const docRef = firestore.collection('invoices').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new Error(`Invoice not found: ${id}`);
    }

    const current = snap.data() as InvoiceRecord;

    let items = updates.items || current.items;
    if (updates.items) {
      items = updates.items.map((item, idx) => {
        const qty = Number(item.qty || 1);
        const rate = Number(item.rate || 0);
        const amount = Number(item.amount !== undefined ? item.amount : (qty * rate).toFixed(2));
        return {
          id: item.id || `item_${idx + 1}_${Date.now()}`,
          description: item.description || '',
          qty,
          rate,
          amount
        };
      });
    }

    const subTotal = Number((updates.subTotal !== undefined ? updates.subTotal : items.reduce((sum, it) => sum + it.amount, 0)).toFixed(2));
    const discount = Number((updates.discount !== undefined ? updates.discount : current.discount || 0).toFixed(2));
    const totalNetPayments = Number(Math.max(0, subTotal - discount).toFixed(2));
    const amountPaid = Number((updates.amountPaid !== undefined ? updates.amountPaid : current.amountPaid || 0).toFixed(2));
    const amountDue = Number(Math.max(0, totalNetPayments - amountPaid).toFixed(2));

    const finalRecord: InvoiceRecord = {
      ...current,
      ...updates,
      items,
      subTotal,
      discount,
      totalNetPayments,
      amountPaid,
      amountDue,
      updatedAt: new Date().toISOString()
    };

    await docRef.set(finalRecord);
    return finalRecord;
  }

  async approveInvoice(
    id: string,
    approver: { id: string; fullName?: string; username: string },
    status: 'approved' | 'rejected',
    remarks?: string
  ): Promise<InvoiceRecord> {
    const docRef = firestore.collection('invoices').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new Error(`Invoice not found: ${id}`);
    }

    const updates: Partial<InvoiceRecord> = {
      status: status === 'approved' ? 'approved' : 'rejected',
      approvalStatus: status,
      approvedBy: approver.id,
      approvedByName: approver.fullName || approver.username,
      approvedAt: new Date().toISOString(),
      approvalRemarks: remarks,
      updatedAt: new Date().toISOString()
    };

    return this.updateInvoice(id, updates);
  }

  async collectInvoicePayment(
    id: string,
    data: {
      amount: number;
      paymentMethod: 'cash' | 'online' | 'both';
      accountId: string;
      category?: IncomeCategory;
      receivedBy: string;
      receivedDate?: string;
      referenceNumber?: string;
      notes?: string;
      status?: InvoiceStatus;
      recordedBy?: string;
    }
  ): Promise<{ invoice: InvoiceRecord; incomeRecord: IncomeRecord }> {
    const docRef = firestore.collection('invoices').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new Error(`Invoice not found: ${id}`);
    }

    const current = snap.data() as InvoiceRecord;
    const isApproved = current.status === 'approved' || current.approvalStatus === 'approved' || current.status === 'paid';
    if (!isApproved) {
      throw new Error('Invoice must be approved by President / Vice President before collecting payment.');
    }

    const amountToCollect = Number((data.amount > 0 ? data.amount : current.amountDue || current.totalNetPayments).toFixed(2));
    if (amountToCollect <= 0) {
      throw new Error('Please enter a valid payment amount greater than 0.');
    }

    const newAmountPaid = Number(((current.amountPaid || 0) + amountToCollect).toFixed(2));
    const newAmountDue = Number(Math.max(0, current.totalNetPayments - newAmountPaid).toFixed(2));
    const finalStatus: InvoiceStatus = data.status || (newAmountDue <= 0 ? 'paid' : 'sent');

    const paymentDate = data.receivedDate || new Date().toISOString().slice(0, 10);
    const receivedBy = (data.receivedBy || '').trim() || 'Treasurer';
    const accountId = data.accountId || 'acc_primary_001';

    // 1. Create matching Income Record
    const incomeRecord = await this.createIncomeRecord({
      title: `Invoice Payment: ${current.invoiceNumber} - ${current.billTo}`,
      amount: amountToCollect,
      category: data.category || 'service_fee',
      accountId: accountId,
      date: paymentDate,
      paymentMethod: data.paymentMethod === 'online' ? 'bank_transfer' : data.paymentMethod === 'cash' ? 'cash' : 'bank_transfer',
      referenceNumber: data.referenceNumber || current.invoiceNumber,
      receivedFrom: current.billTo,
      status: 'received',
      notes: `Payment collected for ${current.type === 'quotation' ? 'Quotation' : 'Invoice'} ${current.invoiceNumber}. Receiver: ${receivedBy}. ${data.notes || ''}`.trim(),
      createdBy: data.recordedBy || 'Treasurer'
    });

    // 2. Update Invoice with payment status, method, receiver name, and reference info
    const updatedInvoice: InvoiceRecord = {
      ...current,
      status: finalStatus,
      amountPaid: newAmountPaid,
      amountDue: newAmountDue,
      paymentMethod: data.paymentMethod || current.paymentMethod,
      receivedBy: receivedBy,
      receivedDate: paymentDate,
      referenceNumber: data.referenceNumber || current.referenceNumber,
      depositAccountId: accountId,
      collectedIncomeRecordId: incomeRecord.id,
      updatedAt: new Date().toISOString()
    };

    await docRef.set(updatedInvoice);
    return { invoice: updatedInvoice, incomeRecord };
  }

  async deleteInvoice(id: string): Promise<void> {
    await firestore.collection('invoices').doc(id).delete();
  }

  async getContributionSettings(): Promise<MemberContributionSetting> {
    const doc = await firestore.collection('contributionSettings').doc('current').get();
    if (doc.exists) {
      return doc.data() as MemberContributionSetting;
    }
    return {
      monthlyFee: 50,
      dueDayOfMonth: 10,
      finePerDay: 5,
      annualAdvanceDiscountMonths: 1,
      currency: 'MVR',
      defaultDepositAccountId: 'acc_primary_001',
      enableAutoFines: true,
      gracePeriodDays: 5,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    };
  }

  async updateContributionSettings(data: Partial<MemberContributionSetting>): Promise<MemberContributionSetting> {
    await firestore.collection('contributionSettings').doc('current').set({
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return this.getContributionSettings();
  }

  async getMemberContributions(params?: { year?: number; month?: number; memberId?: string; status?: string }): Promise<MemberContributionRecord[]> {
    let query: any = firestore.collection('memberContributions');
    if (params?.memberId) query = query.where('memberId', '==', params.memberId);
    if (params?.year) query = query.where('year', '==', Number(params.year));
    if (params?.month) query = query.where('month', '==', Number(params.month));
    if (params?.status) query = query.where('status', '==', params.status);

    const snap = await query.get();
    return snap.docs.map((d: any) => d.data() as MemberContributionRecord);
  }

  async processContributionPayment(data: {
    memberId: string;
    year: number;
    month: number;
    amount: number;
    fineAmount?: number;
    discountAmount?: number;
    accountId?: string;
    recordedBy?: string;
    remarks?: string;
  }): Promise<{ record: MemberContributionRecord; incomeRecord: IncomeRecord; totalPaid: number; discountGiven: number; finesCollected: number }> {
    const member = await this.getMemberById(data.memberId);
    const memberName = member?.fullName || 'Club Member';
    const totalPaid = Number(data.amount || 0);
    const fines = Number(data.fineAmount || 0);
    const discount = Number(data.discountAmount || 0);

    const contribId = `contrib_${data.memberId}_${data.year}_${data.month}`;
    const record: MemberContributionRecord = {
      id: contribId,
      memberId: data.memberId,
      memberName,
      memberNumber: member?.memberNumber || '',
      year: Number(data.year),
      month: Number(data.month),
      baseAmount: totalPaid + discount - fines,
      paidAmount: totalPaid,
      discountAmount: discount,
      fineDays: 0,
      finePerDay: 5,
      fineAmount: fines,
      totalPayable: totalPaid,
      dueDate: `${data.year}-${String(data.month).padStart(2, '0')}-10`,
      paidDate: new Date().toISOString(),
      status: 'paid',
      recordedBy: data.recordedBy || 'Treasurer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await firestore.collection('memberContributions').doc(contribId).set(record);

    // Create income record
    const incomeRecord = await this.createIncomeRecord({
      title: `Membership Contribution - ${memberName} (${data.month}/${data.year})`,
      amount: totalPaid,
      category: 'member_contribution',
      accountId: data.accountId || 'acc_primary_001',
      date: new Date().toISOString(),
      paymentMethod: 'bank_transfer',
      createdBy: data.recordedBy || 'Treasurer'
    });

    return { record, incomeRecord, totalPaid, discountGiven: discount, finesCollected: fines };
  }

  async getBudgetAllocations(year?: number): Promise<CategoryBudgetAllocation[]> {
    let query: any = firestore.collection('budgetAllocations');
    if (year) query = query.where('year', '==', Number(year));
    const snap = await query.get();
    return snap.docs.map((d: any) => d.data() as CategoryBudgetAllocation);
  }

  async saveBudgetAllocation(data: Partial<CategoryBudgetAllocation>): Promise<CategoryBudgetAllocation> {
    const id = data.id || `alloc_${data.year || new Date().getFullYear()}_${data.category}`;
    const item: CategoryBudgetAllocation = {
      id,
      category: data.category || 'other',
      categoryLabel: data.categoryLabel || data.category || 'General',
      year: data.year || new Date().getFullYear(),
      allocatedAmount: Number(data.allocatedAmount || 0),
      notes: data.notes || '',
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    await firestore.collection('budgetAllocations').doc(id).set(item);
    return item;
  }

  async deleteBudgetAllocation(id: string): Promise<void> {
    await firestore.collection('budgetAllocations').doc(id).delete();
  }

  async getBudgetStats(year?: number): Promise<BudgetStats> {
    const targetYear = year || new Date().getFullYear();
    const accounts = await this.getBankAccounts();
    const totalAccountsBalance = accounts.reduce((acc, a) => acc + (a.currentBalance ?? (a as any).balance ?? 0), 0);

    const incomes = await this.getIncomeRecords();
    const expenses = await this.getExpenseRecords();

    const yearIncomes = incomes.filter(i => new Date(i.date || (i as any).incomeDate).getFullYear() === targetYear);
    const yearExpenses = expenses.filter(e => new Date(e.date || (e as any).expenseDate).getFullYear() === targetYear);

    const totalIncome = yearIncomes.reduce((acc, i) => acc + (i.amount || 0), 0);
    const totalExpenses = yearExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const netBalance = totalIncome - totalExpenses;

    const contributions = await this.getMemberContributions({ year: targetYear });
    const totalContributionsCollected = contributions.filter(c => c.status === 'paid').reduce((acc, c) => acc + (c.paidAmount || 0), 0);
    const pendingContributions = contributions.filter(c => c.status === 'pending');
    const overdueContributions = contributions.filter(c => c.status === 'overdue');

    return {
      totalIncome,
      totalExpenses,
      netBalance,
      totalAccountsBalance,
      totalContributionsCollected,
      pendingContributionsCount: pendingContributions.length,
      pendingContributionsAmount: pendingContributions.reduce((acc, c) => acc + (c.totalPayable || 0), 0),
      overdueContributionsCount: overdueContributions.length,
      overdueContributionsAmount: overdueContributions.reduce((acc, c) => acc + (c.totalPayable || 0), 0),
      totalFinesCollected: contributions.reduce((acc, c) => acc + (c.fineAmount || 0), 0),
      monthlyFlow: [],
      categoryIncome: [],
      categoryExpense: [],
      recentTransactions: []
    };
  }

  // -------------------------------------------------------------
  // PRESIDENTIAL DIRECTIVES & OFFICIAL CIRCULARS
  // -------------------------------------------------------------
  async getPresidentialDirectives(): Promise<PresidentialDirective[]> {
    const snap = await firestore.collection('presidentialDirectives').get();
    return snap.docs.map(d => d.data() as PresidentialDirective);
  }

  async createPresidentialDirective(data: Partial<PresidentialDirective>): Promise<PresidentialDirective> {
    const id = data.id || `dir_${Date.now()}`;
    const item: PresidentialDirective = {
      id,
      directiveNumber: data.directiveNumber || `ARC-DIR-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`,
      title: data.title || '',
      description: data.description || data.body || (data as any).content || '',
      issuedBy: data.issuedBy || 'President',
      issueDate: data.issueDate || (data as any).issuedDate || new Date().toISOString(),
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
    await docRef.update({ ...updates, updatedAt: new Date().toISOString() });
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
      circularNumber: data.circularNumber || `ARC-CIR-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`,
      title: data.title || '',
      content: data.content || '',
      category: data.category || 'general',
      signedBy: data.signedBy || (data as any).issuedBy || 'President',
      publishDate: data.publishDate || (data as any).issuedDate || new Date().toISOString(),
      status: data.status || 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    await firestore.collection('officialCirculars').doc(id).set(item);
    return item;
  }

  async updateOfficialCircular(id: string, updates: Partial<OfficialCircular>): Promise<OfficialCircular> {
    const docRef = firestore.collection('officialCirculars').doc(id);
    await docRef.update({ ...updates, updatedAt: new Date().toISOString() });
    const snap = await docRef.get();
    return snap.data() as OfficialCircular;
  }

  async deleteOfficialCircular(id: string): Promise<void> {
    await firestore.collection('officialCirculars').doc(id).delete();
  }

  // -------------------------------------------------------------
  // MESSAGES & NOTIFICATIONS
  // -------------------------------------------------------------
  async getMessages(): Promise<InboxMessage[]> {
    const snap = await firestore.collection('inboxMessages').get();
    return snap.docs.map(d => d.data() as InboxMessage);
  }

  async createMessage(data: Partial<InboxMessage>): Promise<InboxMessage> {
    const id = data.id || `msg_${Date.now()}`;
    const msg: InboxMessage = {
      id,
      senderName: data.senderName || 'Visitor',
      subject: data.subject || 'Message',
      body: data.body || '',
      category: data.category || 'general',
      priority: data.priority || 'normal',
      status: data.status || 'pending',
      readBy: data.readBy || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data as any)
    };
    await firestore.collection('inboxMessages').doc(id).set(msg);
    return msg;
  }

  async updateMessage(id: string, updates: Partial<InboxMessage>): Promise<InboxMessage> {
    const docRef = firestore.collection('inboxMessages').doc(id);
    await docRef.update({ ...updates, updatedAt: new Date().toISOString() });
    const snap = await docRef.get();
    return snap.data() as InboxMessage;
  }

  async deleteMessage(id: string): Promise<void> {
    await firestore.collection('inboxMessages').doc(id).delete();
  }

  async recordMessageAction(id: string, action: any): Promise<InboxMessage> {
    const docRef = firestore.collection('inboxMessages').doc(id);
    const snap = await docRef.get();
    const current = snap.data() as InboxMessage;
    const actions = current.actions || [];
    const newAction = {
      id: `act_${Date.now()}`,
      actionTaken: action.actionTaken || 'Recorded action',
      actionByUserId: action.actionByUserId || '',
      actionByName: action.actionByName || '',
      replyMethod: action.replyMethod || 'other',
      replyDetails: action.replyDetails || '',
      createdAt: new Date().toISOString()
    };
    actions.push(newAction);
    await docRef.update({
      actions,
      status: action.status || 'resolved',
      updatedAt: new Date().toISOString()
    });
    const updated = await docRef.get();
    return updated.data() as InboxMessage;
  }

  async getNotifications(): Promise<AppNotification[]> {
    const snap = await firestore.collection('appNotifications').get();
    return snap.docs.map(d => d.data() as AppNotification);
  }

  async createNotification(data: Partial<AppNotification>): Promise<AppNotification> {
    const id = data.id || `notif_${Date.now()}`;
    const notif: AppNotification = {
      id,
      recipientId: data.recipientId || 'all',
      title: data.title || '',
      message: data.message || '',
      type: data.type || 'info',
      readBy: data.readBy || [],
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

  async markAllNotificationsRead(userId: string): Promise<void> {
    const snap = await firestore.collection('appNotifications').get();
    const batch = firestore.batch();
    for (const doc of snap.docs) {
      const notif = doc.data() as AppNotification;
      const readBy = notif.readBy || [];
      if (!readBy.includes(userId)) {
        readBy.push(userId);
        batch.update(doc.ref, { readBy });
      }
    }
    await batch.commit();
  }

  // -------------------------------------------------------------
  // AUDIT LOGS
  // -------------------------------------------------------------
  async getAuditLogs(): Promise<AuditLog[]> {
    const snap = await firestore.collection('auditLogs').get();
    const logs = snap.docs.map(d => d.data() as AuditLog);
    return logs.sort((a, b) => new Date(b.createdAt || (b as any).timestamp).getTime() - new Date(a.createdAt || (a as any).timestamp).getTime());
  }

  async logAudit(data: Partial<AuditLog>): Promise<AuditLog> {
    const id = data.id || `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const log: AuditLog = {
      id,
      userId: data.userId || 'system',
      username: data.username || 'system',
      fullName: data.fullName || 'System',
      action: data.action || 'ACTIVITY',
      module: (data.module as any) || 'settings',
      recordId: data.recordId,
      previousValue: data.previousValue || (data as any).oldValue,
      newValue: data.newValue,
      reason: data.reason,
      createdAt: data.createdAt || (data as any).timestamp || new Date().toISOString()
    };
    await firestore.collection('auditLogs').doc(id).set(log);
    return log;
  }

  async createAuditLog(data: any): Promise<any> {
    return this.logAudit({
      userId: data.userId,
      username: data.username,
      action: data.action,
      module: data.module,
      recordId: data.targetId,
      reason: data.details
    });
  }

  // -------------------------------------------------------------
  // USER PERFORMANCE
  // -------------------------------------------------------------
  async getUserPerformance(userId: string): Promise<UserPerformanceData> {
    const user = await this.getUserById(userId);
    const members = await this.getMembers();
    
    // Find linked member record
    let linkedMember = user?.memberId ? members.find(m => m.id === user.memberId) : undefined;
    if (!linkedMember && user) {
      // Match by ID Card Number, Contact Number, Member Number, or Full Name
      const userNormId = user.idCardNumber ? user.idCardNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
      const userContact = user.contactNumber ? user.contactNumber.replace(/[^0-9]/g, '') : '';
      linkedMember = members.find(m => {
        const mNormId = m.idCardNumber ? m.idCardNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
        const mContact = m.phoneNumber ? m.phoneNumber.replace(/[^0-9]/g, '') : '';
        return (userNormId && mNormId && userNormId === mNormId) ||
               (userContact && mContact && userContact === mContact) ||
               (user.memberNumber && m.memberNumber === user.memberNumber) ||
               (user.fullName && m.fullName && user.fullName.toLowerCase().trim() === m.fullName.toLowerCase().trim());
      });
      // If found and user had no memberId set, silently update user with member link
      if (linkedMember && user.id) {
        try {
          await firestore.collection('users').doc(user.id).set({
            memberId: linkedMember.id,
            memberNumber: linkedMember.memberNumber,
            idCardNumber: linkedMember.idCardNumber || user.idCardNumber || ''
          }, { merge: true });
        } catch (e) {
          // ignore background update error
        }
      }
    }

    const memberId = user?.memberId || linkedMember?.id;
    const memberNum = linkedMember?.memberNumber || user?.memberNumber;
    const idCardRaw = user?.idCardNumber || linkedMember?.idCardNumber || '';
    const normalizedId = idCardRaw ? idCardRaw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
    const contactClean = user?.contactNumber ? user.contactNumber.replace(/[^0-9]/g, '') : (linkedMember?.phoneNumber ? linkedMember.phoneNumber.replace(/[^0-9]/g, '') : '');
    const userName = user?.username || '';
    const userFullName = user?.fullName || linkedMember?.fullName || '';

    // 1. QUIZ DATA (Synchronized by ID card number, contact, member ID, participant number)
    const questions = await this.getQuizQuestions();
    const submissions = await this.getQuizSubmissions();
    const winners = await this.getQuizWinners();

    const userSubs = submissions.filter(s => {
      const sNormId = s.normalizedIdNumber ? s.normalizedIdNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
      const sIdRaw = s.idNumber ? s.idNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
      const sContact = s.contactNumber ? s.contactNumber.replace(/[^0-9]/g, '') : '';
      
      const matchId = Boolean(normalizedId && (sNormId === normalizedId || sIdRaw === normalizedId));
      const matchContact = Boolean(contactClean && sContact && sContact === contactClean);
      const matchMemberId = Boolean(memberId && (s as any).memberId === memberId);
      const matchMemberNum = Boolean(memberNum && s.participantNumber === memberNum);
      const matchUser = Boolean(userName && (s as any).username === userName);

      return matchId || matchContact || matchMemberId || matchMemberNum || matchUser;
    });

    // Real Answer from Public Site verification helper
    const settings = await this.getSettings();
    const offsetMinutesSetting = Number(settings.find(s => s.key === 'timeOffsetMinutes')?.value || 0);
    const nowEpoch = Date.now() + (offsetMinutesSetting * 60 * 1000);

    const isAnswerRevealedForQuestion = (q: QuizQuestion | undefined) => {
      if (!q) return false;
      if (q.status === 'cancelled') return false;

      // Statuses where the real answer is already revealed on the public site
      if (['answer_revealed', 'draw_scheduled', 'draw_running', 'winner_announced', 'completed'].includes(q.status)) {
        return true;
      }

      // Check if a published lucky draw winner exists for this question
      const publishedWinner = winners.find(w => w.questionId === q.id && w.publicStatus === 'published' && !w.isReplaced);
      if (publishedWinner) {
        return true;
      }

      // Check public site timing rules:
      const closeMs = q.closeAt ? new Date(q.closeAt).getTime() : 0;
      const drawMs = q.drawStartAt ? new Date(q.drawStartAt).getTime() : 0;
      const revealMs = q.revealAt ? new Date(q.revealAt).getTime() : 0;

      // Check if there are zero eligible participants and submission deadline has passed
      const qSubmissions = submissions.filter(s => s.questionId === q.id && !s.isInvalid);
      const eligibleCount = qSubmissions.filter(s => s.isCorrect && s.isEligible && !s.isDisqualified).length;
      if (eligibleCount === 0 && closeMs > 0 && nowEpoch >= closeMs) {
        return true;
      }

      // If drawStartAt has arrived (or revealAt), the real answer is officially revealed on public site
      if (drawMs > 0 && nowEpoch >= drawMs) {
        return true;
      }
      if (revealMs > 0 && nowEpoch >= revealMs) {
        return true;
      }

      return false;
    };

    const mappedSubmissions = userSubs.map(s => {
      const q = questions.find(q => q.id === s.questionId);
      const isRevealed = isAnswerRevealedForQuestion(q);
      const correctOpt = isRevealed && q ? (q.options || []).find((o: any) => o.id === q.correctOptionId) : undefined;

      return {
        id: s.id,
        questionId: s.questionId,
        questionNumber: q ? q.questionNumber : 1,
        questionTitle: q ? q.title : 'Ramazan Quiz Question',
        selectedOptionText: s.selectedOptionText || s.selectedOptionLabel || '',
        selectedOptionLabel: s.selectedOptionLabel || '',
        isAnswerRevealed: isRevealed,
        isCorrect: isRevealed ? Boolean(s.isCorrect) : undefined,
        correctOptionText: correctOpt ? correctOpt.optionText : undefined,
        correctOptionLabel: correctOpt ? (correctOpt.optionLabel || (correctOpt as any).label) : undefined,
        answerExplanation: isRevealed && q ? q.answerExplanation : undefined,
        status: (isRevealed ? 'evaluated' : 'pending_reveal') as ('evaluated' | 'pending_reveal'),
        submittedAt: s.submittedAt || '',
        closeAt: q?.closeAt || '',
        revealAt: q?.revealAt || q?.drawStartAt || ''
      };
    }).sort((a, b) => b.questionNumber - a.questionNumber);

    const userWins = winners.filter(w => {
      const wContact = w.contactNumber ? w.contactNumber.replace(/[^0-9]/g, '') : '';
      const wNormId = (w as any).normalizedIdNumber ? (w as any).normalizedIdNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
      const matchId = Boolean(normalizedId && wNormId && wNormId === normalizedId);
      const matchContact = Boolean(contactClean && wContact && wContact === contactClean);
      const matchMember = Boolean(memberId && (w as any).memberId === memberId);
      const matchSubmission = userSubs.some(s => s.id === w.submissionId);
      return matchId || matchContact || matchMember || matchSubmission;
    });

    const mappedWins = userWins.map((w, i) => {
      const q = questions.find(q => q.id === w.questionId);
      return {
        id: w.id,
        questionNumber: q ? q.questionNumber : (i + 1),
        prizeTitle: w.prizeTitle || 'Lucky Draw Prize',
        sponsorName: w.sponsorName || '',
        selectedAt: w.selectedAt || '',
        prizeCollectionStatus: w.prizeCollectionStatus || 'pending'
      };
    });

    // Score & accuracy only computed for submissions where real answer has been published/revealed
    const revealedSubs = mappedSubmissions.filter(s => s.isAnswerRevealed);
    const correctCount = revealedSubs.filter(s => s.isCorrect).length;
    const accuracyRate = revealedSubs.length > 0 ? Math.round((correctCount / revealedSubs.length) * 100) : 0;
    const pendingRevealCount = mappedSubmissions.length - revealedSubs.length;

    // 2. ATTENDANCE DATA (Synchronized by memberId, memberNumber, userId, or fullName)
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

    // 3. BUDGET & FINANCIALS DATA (Synchronized by memberId or memberNumber)
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
      total += count;
      const sample = snap.docs.slice(0, 3).map(d => d.data());
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
      collectionsSynced: Object.keys(meta.collectionStats).length,
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
      const snap = await firestore.collection(col).get();
      backup[col] = snap.docs.map(d => d.data());
    }

    return backup;
  }

  async importFullDatabase(data: Record<string, any[]>): Promise<void> {
    for (const [colName, docs] of Object.entries(data)) {
      if (Array.isArray(docs)) {
        const batch = firestore.batch();
        for (const doc of docs) {
          const docId = doc.id || doc.key || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const docRef = firestore.collection(colName).doc(docId);
          batch.set(docRef, doc, { merge: true });
        }
        await batch.commit();
      }
    }
  }
}

export const db = new FirestoreDatabaseStore();
