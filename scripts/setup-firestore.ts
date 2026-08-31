import { firestore } from '../src/server/firebase';
import { hashPin, generateSalt } from '../src/server/db';
import { ALL_MODULES, defaultClubRules, defaultSiteSettingsList, defaultRoles } from '../src/server/seedData';

export async function setupFirestore() {
  console.log('🚀 Starting Cloud Firestore Initialization...');

  try {
    // 1. Check if Admin user exists
    const usersRef = firestore.collection('users');
    const adminSnap = await usersRef.where('username', '==', 'admin').get();

    if (adminSnap.empty) {
      console.log('👤 Seeding default Administrator (admin / 2613)...');
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
      console.log('✅ Admin user created.');
    } else {
      console.log('ℹ️ Admin user already exists. Preserving existing credentials and PIN.');
    }

    // 2. Roles
    const rolesRef = firestore.collection('roles');
    for (const r of defaultRoles) {
      const docSnap = await rolesRef.doc(r.id).get();
      if (!docSnap.exists) {
        await rolesRef.doc(r.id).set(r);
      }
    }
    console.log('✅ Roles verified.');

    // 3. Site Settings
    const settingsRef = firestore.collection('siteSettings');
    for (const s of defaultSiteSettingsList) {
      const docSnap = await settingsRef.doc(s.id).get();
      if (!docSnap.exists) {
        await settingsRef.doc(s.id).set(s);
      }
    }
    console.log('✅ Site settings verified.');

    // 4. Club Rules
    const rulesRef = firestore.collection('clubRules');
    const rulesDoc = await rulesRef.doc('main').get();
    if (!rulesDoc.exists) {
      await rulesRef.doc('main').set(defaultClubRules);
      console.log('✅ Default club rules initialized.');
    }

    // 5. Default Bank Account
    const accountsRef = firestore.collection('budgetAccounts');
    const accSnap = await accountsRef.get();
    if (accSnap.empty) {
      await accountsRef.doc('acc_primary_001').set({
        id: 'acc_primary_001',
        accountName: 'ARC Main BML Account',
        accountNumber: '7730000123456',
        bankName: 'Bank of Maldives (BML)',
        currency: 'MVR',
        balance: 15450,
        isDefault: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Primary bank account created.');
    }

    // 6. Contribution Settings
    const contribSettingsRef = firestore.collection('contributionSettings');
    const contribDoc = await contribSettingsRef.doc('current').get();
    if (!contribDoc.exists) {
      await contribSettingsRef.doc('current').set({
        id: 'current',
        monthlyFee: 50,
        currency: 'MVR',
        finePerDay: 5,
        gracePeriodDays: 5,
        fineGraceDays: 5,
        dueDayOfMonth: 10,
        enableFines: true,
        enableDiscounts: true,
        annualDiscountMonths: 1,
        advancePaymentMonths: 12,
        updatedAt: new Date().toISOString(),
        updatedBy: 'system'
      });
      console.log('✅ Contribution settings initialized.');
    }

    // 7. Initial Counters
    const countersRef = firestore.collection('counters');
    const memCounter = await countersRef.doc('members').get();
    if (!memCounter.exists) {
      await countersRef.doc('members').set({ count: 1 });
    }
    const quizCounter = await countersRef.doc('quizParticipants').get();
    if (!quizCounter.exists) {
      await countersRef.doc('quizParticipants').set({ count: 1 });
    }

    console.log('🎉 Cloud Firestore setup completed successfully!');
  } catch (err: any) {
    console.error('❌ Firestore setup error:', err);
    throw err;
  }
}

if (process.argv[1] && process.argv[1].includes('setup-firestore')) {
  setupFirestore().then(() => process.exit(0)).catch(() => process.exit(1));
}
