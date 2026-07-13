const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp();
const db = admin.database();

async function main() {
  const id = process.argv[2] || 'test_sms_1';
  const status = process.argv[3] || 'Done';
  await db.ref(`smsQueue/${id}/status`).set(status);
  console.log(`Đã set status ${status} cho smsQueue/${id}`);
}

main().catch(err => { console.error(err); process.exit(1); });
