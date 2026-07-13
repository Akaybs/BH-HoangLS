# 🏗️ Hướng Dẫn Triển Khai Kiến Trúc Thống Nhất - Thanh Toán Ví

## 📋 Tình Trạng Triển Khai

### ✅ Hoàn Thành - React (FormInputData, ThongKeTable, walletPaymentUtils)

1. **File Utils**: `src/utils/walletPaymentUtils.js`
   - ✅ `autoPayFromWallet()` - Thanh toán bằng ví cho nhiều máy
   - ✅ `depositToWallet()` - Nạp tiền vào ví
   - ✅ `recordWalletHistory()` - Ghi lịch sử giao dịch ví
   - ✅ `getWalletHistory()` - Lấy lịch sử giao dịch

2. **FormInputData.jsx**: Cập nhật hàm `handleAddData()`
   - ✅ Khi thêm máy mới, nếu ví đủ tiền → tự động thanh toán bằng ví
   - ✅ Ghi vào `wallet_history` (type: 'payment', paidCount: 1)
   - ✅ Thêm trường `paymentMethod` ('wallet' hoặc 'cash')

3. **ThongKeTable.jsx**: Cập nhật hàm thanh toán từ ví
   - ✅ `autoPayFromWallet()` - Gọi từ utils thay vì logic cũ
   - ✅ `handleWalletSave()` - Gọi `depositToWallet()` từ utils
   - ✅ Ghi `wallet_history` (type: 'deposit')
   - ✅ `executePayFromWallet()` - Cập nhật UI & thông báo

### ⏳ Bước Tiếp Theo - Cloud Functions

#### Function mới: `updateWalletHistoryListener()`

**Mục đích**: Theo dõi collection `wallet_history` và tạo SMS từ `notification_sms`

**Logic**:
```
Khi document được tạo/cập nhật trong wallet_history:
  IF type == 'payment':
    → Lấy customerName, amount, walletAfter, paidCount
    → Tạo message SMS (xem chi tiết bên dưới)
    → Tạo document mới trong notification_sms:
      {
        phone: customer.phone,
        message: "...",
        status: "Yes"
      }
  ELSE IF type == 'deposit':
    → Tạo message SMS cho nạp ví
    → Tạo document trong notification_sms
```

**Chi Tiết Message SMS**:

1. **Nạp Ví** (type: 'deposit'):
```
TB: Test

Quy khach vua nap thanh cong vao Vi.

So tien:
500.000 VND

So du Vi:
1.200.000 VND

Cam on Quy khach!
```

2. **Thanh Toán 1 Máy** (type: 'payment', paidCount: 1):
```
TB: Test

Quy khach da thanh toan 1 may bang Vi.

So tien:
400.000 VND

So du Vi:
300.000 VND

Cam on Quy khach!
```

3. **Thanh Toán Nhiều Máy** (type: 'payment', paidCount: 3):
```
TB: Test

Quy khach da thanh toan 3 may bang Vi.

So tien:
1.250.000 VND

So du Vi:
150.000 VND

Cam on Quy khach!
```

**Code Skeleton**:
```javascript
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.updateWalletHistoryListener = functions.firestore
  .document("wallet_history/{docId}")
  .onCreate(async (snap, context) => {
    try {
      const history = snap.data();
      const { customerId, customerName, type, amount, before, after, paidCount } = history;

      // Lấy customer để có phone
      const customerRef = db.collection("dropkh").doc(customerId);
      const customerSnap = await customerRef.get();
      
      if (!customerSnap.exists) {
        console.error("Customer not found:", customerId);
        return;
      }

      const customer = customerSnap.data();
      const phone = customer.phone || "";

      let message = "";

      if (type === "payment") {
        // Format thông báo thanh toán
        message = `TB: Test\n\n`;
        message += `Quy khach da thanh toan ${paidCount} may bang Vi.\n\n`;
        message += `So tien:\n${amount.toLocaleString("vi-VN")} VND\n\n`;
        message += `So du Vi:\n${after.toLocaleString("vi-VN")} VND\n\n`;
        message += `Cam on Quy khach!`;
      } 
      else if (type === "deposit") {
        // Format thông báo nạp ví
        message = `TB: Test\n\n`;
        message += `Quy khach vua nap thanh cong vao Vi.\n\n`;
        message += `So tien:\n${amount.toLocaleString("vi-VN")} VND\n\n`;
        message += `So du Vi:\n${after.toLocaleString("vi-VN")} VND\n\n`;
        message += `Cam on Quy khach!`;
      }

      // Tạo document trong notification_sms
      const notificationRef = db.collection("notification_sms").doc();
      await notificationRef.set({
        phone,
        message,
        status: "Yes",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("SMS notification created:", notificationRef.id);
    } 
    catch (error) {
      console.error("Error in updateWalletHistoryListener:", error);
    }
  });
```

---

## 🔑 Firestore Collections Schema

### `wallet_history`
```
wallet_history/
  {autoId}/
    customerId: "kh001"
    customerName: "Khách A"
    type: "payment" | "deposit"
    amount: 400000
    before: 1000000
    after: 600000
    paidCount: 1 (chỉ khi type='payment')
    createdAt: Timestamp
```

### `notification_sms`
```
notification_sms/
  {autoId}/
    phone: "0901234567"
    message: "..."
    status: "Yes"
    createdAt: Timestamp
```

---

## 🔄 Luồng Hoạt Động

### 1️⃣ Thêm Máy Mới (Nếu Ví Đủ)
```
User nhập máy → FormInputData
         ↓
Gọi handleAddData()
         ↓
Kiểm tra ví vs giá sửa
         ↓
Ví >= Giá sửa?
  ↙ YES                    ↘ NO
Trừ ví                    Để là "Nợ"
Ghi wallet_history        thanhtoan="Nợ"
(type='payment')
paymentMethod='wallet'
```

### 2️⃣ Nạp Tiền Vào Ví
```
ThongKeTable → handleWalletSave()
         ↓
Gọi depositToWallet() từ utils
         ↓
Cập nhật dropkh.wallet
Ghi wallet_history (type='deposit')
         ↓
Hiển thị modal hỏi thanh toán từ ví?
```

### 3️⃣ Thanh Toán Từ Ví
```
ThongKeTable → handlePayFromWallet()
         ↓
Gọi autoPayFromWallet() từ utils
         ↓
Lấy danh sách máy nợ
Tính tổng tiền
Kiểm tra ví >= tổng?
  ↙ YES                    ↘ NO
Cập nhật thanhtoan→"Ví"   Thông báo không đủ ví
Trừ ví
Ghi wallet_history
(type='payment', paidCount=số máy)
```

### 4️⃣ Cloud Function (Sắp Triển Khai)
```
wallet_history doc được tạo
  ↓
Cloud Function updateWalletHistoryListener()
  ↓
Tạo message SMS
  ↓
Tạo doc trong notification_sms
  ↓
status: "Yes" → ESP32 đọc & gửi SMS
```

---

## 📝 Firestore Rules Update

Thêm vào `firestore.rules`:

```javascript
match /wallet_history/{document=**} {
  allow read: if request.auth != null;
  allow create: if request.auth != null; // Cloud Function ghi
  allow update, delete: if false; // Chỉ được tạo mới, không sửa/xóa
}

match /notification_sms/{document=**} {
  allow read: if request.auth != null; // Cho ESP32 và mobile app
  allow create: if false; // Chỉ Cloud Function tạo
  allow update: if request.auth != null; // Mobile/Web cập nhật status
  allow delete: if false;
}
```

---

## 🧪 Quá Trình Kiểm Thử

### Test 1: Thêm Máy Mới (Ví Đủ Tiền)
- [ ] Tạo khách hàng với wallet > 0
- [ ] Thêm máy mới với giá < wallet
- [ ] Kiểm tra: thanhtoan = "Ví", paymentMethod = "wallet"
- [ ] Kiểm tra: ví được trừ
- [ ] Kiểm tra: wallet_history được ghi (type='payment', paidCount=1)

### Test 2: Nạp Tiền
- [ ] Mở ThongKeTable, chọn khách hàng
- [ ] Bấm "Nạp Tiền"
- [ ] Nhập số tiền, bấm "Lưu"
- [ ] Kiểm tra: ví tăng
- [ ] Kiểm tra: wallet_history được ghi (type='deposit')
- [ ] Kiểm tra: Modal hỏi "Thanh toán từ ví?"

### Test 3: Thanh Toán Từ Ví (Nhiều Máy)
- [ ] Chọn khách hàng có ≥2 máy nợ
- [ ] Bấm "Thanh Toán Từ Ví"
- [ ] Kiểm tra: Các máy được cập nhật thanhtoan="Ví"
- [ ] Kiểm tra: ví được trừ (tổng tiền)
- [ ] Kiểm tra: wallet_history được ghi (type='payment', paidCount=2)

### Test 4: ESP32 Stream
- [ ] Sau khi ghi wallet_history
- [ ] Cloud Function tạo notification_sms
- [ ] ESP32 đọc /notification_sms
- [ ] Gửi SMS theo format

---

## 🚀 Tiếp Theo

1. **Deploy Cloud Function**: `updateWalletHistoryListener()`
2. **Update ESP32**: Stream thứ 2 để listener /notification_sms
3. **Kiểm Thử E2E**: Thêm máy → SMS giao dịch ví
4. **Release**: Triển khai lên production

---

## 📚 Tham Khảo

📌 Architecture Blueprint: Xem yêu cầu gốc
📌 Utils API: `src/utils/walletPaymentUtils.js`
📌 React Components: `FormInputData.jsx`, `ThongKeTable.jsx`

---

**Trạng Thái**: React ✅ | Cloud Functions ⏳ | ESP32 ⏳
