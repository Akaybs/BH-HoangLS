# 📊 Tóm Tắt Thực Hiện - React Phần Thanh Toán Ví

## ✅ Đã Hoàn Thành

### 1. File Utilities Mới: `src/utils/walletPaymentUtils.js`
Chứa toàn bộ logic xử lý ví và ghi lịch sử:

**Hàm:**
- `autoPayFromWallet(db, customerId, customerName, selectedDevices)`
  - Lấy danh sách máy cần thanh toán
  - Tính tổng tiền
  - Kiểm tra ví có đủ không
  - Cập nhật từng máy: `thanhtoan="Ví"`, `paymentMethod="wallet"`
  - Cập nhật ví: trừ tiền
  - Ghi `wallet_history` (type='payment', paidCount=số máy)

- `depositToWallet(db, customerId, customerName, amount)`
  - Nạp tiền vào ví
  - Cập nhật dropkh
  - Ghi `wallet_history` (type='deposit')

- `recordWalletHistory(db, customerId, customerName, type, amount, before, after, paidCount)`
  - Ghi chi tiết giao dịch vào collection wallet_history
  - Tự động tạo document ID

- `getWalletHistory(db, customerId)`
  - Lấy lịch sử giao dịch của một khách hàng

### 2. FormInputData.jsx - Cập Nhật

**Thay đổi:**
- Import `recordWalletHistory` từ walletPaymentUtils
- Sửa hàm `handleAddData()`:
  - Khi thêm máy mới mà `thanhtoan="Nợ"` và ví đủ tiền:
    - Trừ ví
    - Ghi `wallet_history` (type='payment', paidCount=1)
    - Thêm `paymentMethod="wallet"` vào document
    - Cập nhật `thanhtoan="Ví"`
  - Máy không nợ hoặc ví không đủ → giữ nguyên logic cũ

### 3. ThongKeTable.jsx - Cập Nhật

**Thay đổi:**
- Import `autoPayFromWallet as payFromWalletUtil` và `depositToWallet` từ walletPaymentUtils
- Thay thế hàm `autoPayFromWallet()`:
  - Gọi `payFromWalletUtil()` từ utils
  - Xử lý kết quả và cập nhật UI
  - Ghi lịch sử tự động (utils lo)

- Sửa hàm `handleWalletSave()`:
  - Gọi `depositToWallet()` từ utils thay vì update trực tiếp
  - Lịch sử nạp ví tự động được ghi (utils lo)

- Sửa hàm `executePayFromWallet()`:
  - Gọi hàm `autoPayFromWallet()` cập nhật
  - Hiển thị thông báo chi tiết

---

## 📊 Firestore Collections

### Collection `wallet_history` (Mới)
```
wallet_history/
  {autoId}/
    customerId: "kh001"
    customerName: "Khách A"
    type: "payment" | "deposit"
    amount: 400000
    before: 1000000
    after: 600000
    paidCount: 1 (khi type='payment')
    createdAt: Timestamp
```

### Collection `notification_sms` (Mới - Sắp tạo)
```
notification_sms/
  {autoId}/
    phone: "0901234567"
    message: "..."
    status: "Yes"
    createdAt: Timestamp
```

### Cập Nhật Collection `roitai`
Thêm trường:
- `paymentMethod`: "cash" | "wallet" | "wallet_partial"

---

## 🔄 Luồng Hiện Tại

### Scenario 1: Thêm Máy (Ví Đủ)
```
FormInputData.handleAddData()
  ├─ Kiểm tra: thanhtoan="Nợ"?
  ├─ Kiểm tra: ví >= giá máy?
  ├─ Trừ ví
  ├─ Ghi wallet_history (type='payment', paidCount=1)
  ├─ Cập nhật roitai: thanhtoan="Ví", paymentMethod="wallet"
  └─ Reset form
```

### Scenario 2: Nạp Tiền
```
ThongKeTable.handleWalletSave()
  ├─ Gọi depositToWallet()
  ├─ Utils cập nhật dropkh
  ├─ Utils ghi wallet_history (type='deposit')
  ├─ Cập nhật UI
  └─ Hỏi: Thanh toán từ ví?
    └─ If Đồng ý → Gọi autoPayFromWallet()
```

### Scenario 3: Thanh Toán Nhiều Máy Từ Ví
```
ThongKeTable.handlePayFromWallet()
  ├─ Kiểm tra: ví > 0?
  ├─ Modal hỏi xác nhận
  └─ executePayFromWallet()
    ├─ Lấy danh sách máy nợ
    ├─ Gọi autoPayFromWallet()
    ├─ Utils:
    │   ├─ Tính tổng tiền
    │   ├─ Kiểm tra ví
    │   ├─ Cập nhật từng máy: thanhtoan="Ví"
    │   ├─ Trừ ví
    │   └─ Ghi wallet_history (type='payment', paidCount=n)
    ├─ Cập nhật UI
    └─ Alert thành công
```

---

## 🚨 Lưu Ý Quan Trọng

1. **Không Sửa Logic CSV Cũ**: Logic thanh toán cash "Ok" giữ nguyên
2. **Ghi Lịch Sử Tự Động**: Hàm utils tự lo việc ghi wallet_history
3. **paymentMethod Mới**: Để sau này mở rộng (wallet_partial, etc)
4. **SMS Để Sau**: Cloud Function sẽ tạo SMS thanh toán ví

---

## ⏳ Bước Tiếp Theo

1. **Cloud Function** (updateWalletHistoryListener)
   - Theo dõi wallet_history
   - Tạo notification_sms
   - Xác định format SMS

2. **ESP32**
   - Stream thứ 2: /notification_sms
   - Gửi SMS theo status="Yes"

3. **Kiểm Thử E2E**
   - Test tất cả scenarios
   - Verify SMS nhận được

4. **Release Production**

---

## 🔗 File Liên Quan

```
src/
├─ components/
│  ├─ FormInputData.jsx ✅ (Cập nhật)
│  ├─ ThongKeTable.jsx ✅ (Cập nhật)
│  └─ WalletModal.jsx (Giữ nguyên)
├─ utils/
│  ├─ walletPaymentUtils.js ✅ (Mới)
│  ├─ getSimpleNextId.js (Giữ nguyên)
│  └─ formatDisplayTime.jsx (Giữ nguyên)
└─ firebase.js (Giữ nguyên)

IMPLEMENTATION_GUIDE.md ✅ (Hướng dẫn triển khai)
```

---

**Ngày**: 10/07/2026  
**Trạng Thái**: React ✅ Hoàn Thành | Chờ Cloud Functions  
**Tiếp Theo**: Deploy Cloud Function updateWalletHistoryListener()
