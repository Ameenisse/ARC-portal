import { firestore } from './src/server/firebase';

async function test() {
  console.log('Testing Firestore Client health check...');
  const health = await firestore.checkHealth();
  console.log('Health result:', health);

  if (health.connected) {
    console.log('Testing write & read of a role document...');
    await firestore.set('roles', 'role_test', {
      id: 'role_test',
      name: 'Test Role',
      description: 'Testing firestore client',
      isSystem: false,
      status: 'active',
      createdAt: new Date().toISOString()
    });

    const readBack = await firestore.get('roles', 'role_test');
    console.log('Read back role:', readBack);

    const listRoles = await firestore.list('roles');
    console.log('Listed roles count:', listRoles.length);

    await firestore.delete('roles', 'role_test');
    console.log('Deleted test role successfully.');
  }
}

test();
