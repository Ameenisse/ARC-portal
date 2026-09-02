import { firestore } from '../src/server/firebase';
import { hashPin, generateSalt } from '../src/server/db';
import { ALL_MODULES, defaultClubRules, defaultSiteSettingsList } from '../src/server/seedData';
import { Role, UserRoleName } from '../src/types';

export const systemRoles: Role[] = [
  {
    id: 'role_admin',
    name: 'Admin',
    description: 'Full administrative access across all portal modules and security settings.',
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultPermissions: ALL_MODULES.map(m => ({
      roleId: 'role_admin',
      moduleKey: m,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canPublish: true,
      canApprove: true,
      canExport: true,
      canManageSettings: true
    }))
  },
  {
    id: 'role_president',
    name: 'President' as UserRoleName,
    description: 'Executive governance, presidential directives, circulars, meeting oversight and approvals.',
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultPermissions: ALL_MODULES.map(m => ({
      roleId: 'role_president',
      moduleKey: m,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canPublish: true,
      canApprove: true,
      canExport: true,
      canManageSettings: false
    }))
  },
  {
    id: 'role_vice_president',
    name: 'Vice President' as UserRoleName,
    description: 'Executive governance assistance, meeting moderation and administrative oversight.',
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultPermissions: ALL_MODULES.map(m => ({
      roleId: 'role_vice_president',
      moduleKey: m,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canPublish: true,
      canApprove: true,
      canExport: true,
      canManageSettings: false
    }))
  },
  {
    id: 'role_treasurer',
    name: 'Treasurer' as UserRoleName,
    description: 'Financial accounting, bank accounts, income/expense records, and member contributions.',
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultPermissions: ALL_MODULES.map(m => ({
      roleId: 'role_treasurer',
      moduleKey: m,
      canView: true,
      canCreate: m === 'budget' || m === 'members',
      canEdit: m === 'budget' || m === 'members',
      canDelete: false,
      canPublish: m === 'budget',
      canApprove: m === 'budget',
      canExport: true,
      canManageSettings: m === 'budget'
    }))
  },
  {
    id: 'role_secretary',
    name: 'Secretary' as UserRoleName,
    description: 'Club correspondence, event planning, meeting minutes, attendance, and member records.',
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultPermissions: ALL_MODULES.map(m => ({
      roleId: 'role_secretary',
      moduleKey: m,
      canView: true,
      canCreate: m === 'events_meetings' || m === 'members' || m === 'messages',
      canEdit: m === 'events_meetings' || m === 'members' || m === 'messages',
      canDelete: false,
      canPublish: true,
      canApprove: false,
      canExport: true,
      canManageSettings: false
    }))
  },
  {
    id: 'role_exco',
    name: 'EXCO Member' as UserRoleName,
    description: 'Executive committee access to events, meetings, internal messages, and quiz management.',
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultPermissions: ALL_MODULES.map(m => ({
      roleId: 'role_exco',
      moduleKey: m,
      canView: true,
      canCreate: m === 'events_meetings' || m === 'ramazan_quiz' || m === 'messages',
      canEdit: m === 'events_meetings' || m === 'ramazan_quiz' || m === 'messages',
      canDelete: false,
      canPublish: false,
      canApprove: false,
      canExport: true,
      canManageSettings: false
    }))
  },
  {
    id: 'role_member',
    name: 'Club Member' as UserRoleName,
    description: 'Standard member portal access to events, personal contributions, and club rules.',
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultPermissions: ALL_MODULES.map(m => ({
      roleId: 'role_member',
      moduleKey: m,
      canView: m === 'dashboard' || m === 'events_meetings' || m === 'club_rules' || m === 'budget',
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canPublish: false,
      canApprove: false,
      canExport: false,
      canManageSettings: false
    }))
  }
];

export async function setupFirestore() {
  console.log('🚀 Checking Cloud Firestore System Installation status...');

  try {
    const installRef = firestore.collection('system').doc('installation');
    const installDoc = await installRef.get();

    if (installDoc.exists && installDoc.data()?.initialized === true) {
      console.log('🔒 System is already initialized. Preserving all live records and stopping setup.');
      return;
    }

    console.log('⚙️ Performing one-time initial system installation bootstrap...');

    // 1. Initial Admin Account (admin / 2613) if not present
    const usersRef = firestore.collection('users');
    const adminSnap = await usersRef.where('username', '==', 'admin').get();

    if (adminSnap.empty) {
      console.log('👤 Seeding initial Administrator account (admin / 2613)...');
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
        notes: 'Primary system administrator account',
        permissions: adminPermissions,
        pinHash,
        pinSalt: salt
      });
      console.log('✅ Admin user initialized.');
    }

    // 2. System Roles (Admin, President, Vice President, Treasurer, Secretary, EXCO Member, Club Member)
    const rolesRef = firestore.collection('roles');
    for (const r of systemRoles) {
      const docSnap = await rolesRef.doc(r.id).get();
      if (!docSnap.exists) {
        await rolesRef.doc(r.id).set(r);
      }
    }
    console.log('✅ System roles verified.');

    // 3. Security Settings & Site Settings
    const settingsRef = firestore.collection('siteSettings');
    for (const s of defaultSiteSettingsList) {
      const docSnap = await settingsRef.doc(s.id).get();
      if (!docSnap.exists) {
        await settingsRef.doc(s.id).set(s);
      }
    }
    console.log('✅ Security & site settings verified.');

    // 4. Club Rules
    const rulesRef = firestore.collection('clubRules');
    const rulesDoc = await rulesRef.doc('main').get();
    if (!rulesDoc.exists) {
      await rulesRef.doc('main').set(defaultClubRules);
      console.log('✅ Club rules document initialized.');
    }

    // 5. Counters
    const countersRef = firestore.collection('counters');
    const memCounter = await countersRef.doc('members').get();
    if (!memCounter.exists) {
      await countersRef.doc('members').set({ count: 1 });
    }
    const quizCounter = await countersRef.doc('quizParticipants').get();
    if (!quizCounter.exists) {
      await countersRef.doc('quizParticipants').set({ count: 1 });
    }
    console.log('✅ Counters initialized.');

    // 6. Mark system as initialized permanently
    await installRef.set({
      initialized: true,
      databaseId: 'ai-studio-arc-1ed79364-547a-408d-9326-df4162ee21d6',
      initializedAt: new Date().toISOString()
    });

    console.log('🎉 Cloud Firestore one-time installation setup completed successfully!');
  } catch (err: any) {
    console.error('❌ Firestore setup error:', err);
    throw err;
  }
}

if (process.argv[1] && process.argv[1].includes('setup-firestore')) {
  setupFirestore().then(() => process.exit(0)).catch(() => process.exit(1));
}
