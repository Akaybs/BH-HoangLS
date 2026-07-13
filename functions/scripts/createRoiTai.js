const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp();
const firestore = admin.firestore();

async function main() {
  const id = process.argv[2] || 'r001';
  await firestore.collection('roitai').doc(id).set({
    name: 'A Linh',
    iphone: 'Máy A',
    imei: '1234567890',
    tien: 0,
    thanhtoan: 'Nợ',
    sms: 'Yes',
    thoigian: '13/7/2026 12:30'
  });
  console.log('Đã tạo roitai/' + id);
}

main().catch(err => { console.error(err); process.exit(1); });
