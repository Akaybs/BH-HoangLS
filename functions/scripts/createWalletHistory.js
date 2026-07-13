const admin = require('firebase-admin');

// Use application default credentials when running against emulator or real project
if (!admin.apps.length) admin.initializeApp();
const firestore = admin.firestore();

async function main() {
  const id = 'test_sms_1';
  await firestore.collection('wallet_history').doc(id).set({
    customerId: 'c123',
    customerName: 'A Linh',
    type: 'manual',
    amount: 0,
    note: 'Nội dung SMS test',
    phone: '+84123456789',
    smsMessage: 'Tin nhắn thử nghiệm từ emulator',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log('Đã tạo wallet_history/' + id);
}

main().catch(err => { console.error(err); process.exit(1); });
