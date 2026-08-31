import { firestore, firebaseConfig } from '../src/server/firebase';

export async function checkFirestore() {
  console.log('🔍 Checking Cloud Firestore Connectivity & Collections...');
  console.log(`📌 Project ID: ${firebaseConfig.projectId || '(auto)'}`);
  console.log(`📌 Database ID: ${firebaseConfig.firestoreDatabaseId || '(default)'}`);

  try {
    const collections = [
      'users',
      'roles',
      'clubMembers',
      'events',
      'eventItems',
      'meetingItems',
      'budgetAccounts',
      'incomeRecords',
      'expenseRecords',
      'accountTransfers',
      'contributionSettings',
      'memberContributions',
      'budgetAllocations',
      'slideshow',
      'siteSettings',
      'contacts',
      'socialLinks',
      'excoMembers',
      'quizQuestions',
      'quizSubmissions',
      'quizWinners',
      'quizPrizes',
      'quizSponsors',
      'masterIneligibleParticipants',
      'auditLogs',
      'inboxMessages',
      'appNotifications',
      'clubRules',
      'presidentialDirectives',
      'officialCirculars',
      'invoices'
    ];

    const results: Record<string, number> = {};

    for (const col of collections) {
      const snap = await firestore.collection(col).limit(10).get();
      results[col] = snap.size;
    }

    console.log('📊 Cloud Firestore Status:');
    console.table(results);

    // Test a write and read in a diagnostic audit log
    const testId = `diag_check_${Date.now()}`;
    await firestore.collection('auditLogs').doc(testId).set({
      id: testId,
      action: 'FIRESTORE_CONNECTIVITY_TEST',
      module: 'settings',
      timestamp: new Date().toISOString(),
      reason: 'CLI diagnostics test run'
    });

    const testDoc = await firestore.collection('auditLogs').doc(testId).get();
    if (testDoc.exists) {
      await firestore.collection('auditLogs').doc(testId).delete();
      console.log('✅ Write/Read/Delete diagnostic test: PASSED');
    } else {
      console.error('❌ Write/Read test: FAILED');
    }

    console.log('✅ Cloud Firestore is fully operational and connected.');
    return { ok: true, results };
  } catch (err: any) {
    console.error('❌ Firestore check failed:', err.message);
    return { ok: false, error: err.message };
  }
}

if (process.argv[1] && process.argv[1].includes('check-firestore')) {
  checkFirestore().then((res) => {
    process.exit(res.ok ? 0 : 1);
  });
}
