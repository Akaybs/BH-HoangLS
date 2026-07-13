/**
 * walletPaymentUtils.js
 * 
 * Hàm xử lý thanh toán bằng ví và ghi lịch sử giao dịch ví
 */

import {
  doc,
  updateDoc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

const formatMoneyForSms = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0';
  return new Intl.NumberFormat('vi-VN').format(value);
};

const buildWalletSmsMessage = ({
  type,
  customerName,
  amount,
  after,
  paidCount = 0,
  deviceCount = 0,
  note = '',
}) => {
  const amountText = `${formatMoneyForSms(amount)} ₫`;
  const afterText = `${formatMoneyForSms(after)} ₫`;
  const count = type === 'settlement' ? deviceCount : paidCount;

  if (type === 'deposit') {
    return `TB: ${customerName}\n\nQuy khach vua nap tien vao Vi.\n\nSo tien: ${amountText}\n\nSo du Vi: ${afterText}\n\nCam on Quy khach!`;
  }

  if (type === 'payment') {
    return `TB: ${customerName}\n\nQuy khach da thanh toan ${count} may bang Vi.\n\nSo tien: ${amountText}\n\nSo du Vi: ${afterText}\n\nCam on Quy khach!`;
  }

  if (type === 'settlement') {
    return `TB: ${customerName}\n\nQuy khach da tat toan ${count} may.\n\nSo tien: ${amountText}\n\nSo du Vi: ${afterText}\n\nCam on Quy khach!`;
  }

  return note || '';
};

/**
 * Ghi lịch sử giao dịch ví
 * @param {Object} db - Firestore instance
 * @param {string} customerId - ID khách hàng
 * @param {string} customerName - Tên khách hàng
 * @param {string} type - Loại giao dịch: 'deposit' hoặc 'payment'
 * @param {number} amount - Số tiền
 * @param {number} before - Số dư trước giao dịch
 * @param {number} after - Số dư sau giao dịch
 * @param {number} paidCount - Số lượng máy đã thanh toán (cho type='payment')
 * @param {string} note - Ghi chú câu giao dịch
 * @param {string} phone - Số điện thoại khách hàng
 * @param {string} message - Nội dung SMS dự kiến
 * @param {string} status - Trạng thái SMS: pending/sent/error
 * @param {number} deviceCount - Số lượng máy tất toán (cho type='settlement')
 * @param {Object} extraData - Dữ liệu bổ sung để hiển thị chi tiết liên quan
 * @returns {Promise<string>} - ID của tài liệu được tạo
 */
export const recordWalletHistory = async (
  db,
  customerId,
  customerName,
  type,
  amount,
  before,
  after,
  paidCount = 1,
  note = '',
  phone = '',
  message = '',
  status = 'pending',
  deviceCount = 0,
  extraData = {}
) => {
  try {
    const walletHistoryRef = collection(db, 'wallet_history');
    
    // Tạo document ID tự động
    const docRef = doc(walletHistoryRef);

    const smsMessage = message || buildWalletSmsMessage({
      type,
      customerName,
      amount,
      after,
      paidCount,
      deviceCount,
      note,
    });
    
    await setDoc(docRef, {
      customerId,
      customerName,
      phone,
      type,
      amount,
      before,
      after,
      paidCount,
      deviceCount,
      note,
      smsMessage,
      smsStatus: status,
      createdAt: serverTimestamp(),
      localCreatedAt: new Date(),
      ...extraData,
    });

    return docRef.id;
  } catch (error) {
    console.error('Lỗi khi ghi wallet_history:', error);
    throw error;
  }
};

/**
 * Thanh toán bằng ví cho một hoặc nhiều máy
 * @param {Object} db - Firestore instance
 * @param {string} customerId - ID khách hàng (lấy từ dropkh)
 * @param {string} customerName - Tên khách hàng
 * @param {Array<Object>} selectedDevices - Danh sách máy được chọn
 *   Mỗi object: { id: number, tien: number, name: string, iphone: string, thanhtoan: string, ... }
 * @returns {Promise<Object>} - Kết quả thanh toán
 *   {
 *     success: boolean,
 *     paidCount: number,
 *     totalAmount: number,
 *     walletBefore: number,
 *     walletAfter: number,
 *     failedDevices: Array<{id, reason}>,
 *     message: string
 *   }
 */
export const autoPayFromWallet = async (
  db,
  customerId,
  customerName,
  selectedDevices
) => {
  const result = {
    success: false,
    paidCount: 0,
    totalAmount: 0,
    walletBefore: 0,
    walletAfter: 0,
    failedDevices: [],
    message: '',
  };

  try {
    // 1. Lấy thông tin khách hàng từ dropkh
    const customerDocRef = doc(db, 'dropkh', customerId);
    const customerDoc = await getDoc(customerDocRef);

    if (!customerDoc.exists()) {
      result.message = `Không tìm thấy khách hàng với ID: ${customerId}`;
      return result;
    }

    const customerData = customerDoc.data();
    const walletBefore = Number(customerData.wallet || 0);
    result.walletBefore = walletBefore;

    // 2. Tính tổng tiền từ các máy được chọn
    let totalAmount = 0;
    const validDevices = [];

    for (const device of selectedDevices) {
      const deviceAmount = Number(device.tien || 0);
      if (deviceAmount > 0) {
        totalAmount += deviceAmount;
        validDevices.push(device);
      }
    }

    if (validDevices.length === 0) {
      result.message = 'Không có máy nào có tiền cần thanh toán';
      return result;
    }

    // 3. Kiểm tra ví có đủ tiền không
    if (walletBefore < totalAmount) {
      result.message = `Ví không đủ tiền. Cần: ${totalAmount.toLocaleString('vi-VN')} ₫, Có: ${walletBefore.toLocaleString('vi-VN')} ₫`;
      return result;
    }

    // 4. Cập nhật từng máy
    const roitaiRef = collection(db, 'roitai');
    let paidCount = 0;

    for (const device of validDevices) {
      try {
        const deviceRef = doc(roitaiRef, device.id.toString());
        await updateDoc(deviceRef, {
          thanhtoan: 'Ví', // Cập nhật trạng thái thành 'Ví'
          paymentMethod: 'wallet', // Thêm paymentMethod
        });
        paidCount++;
      } catch (error) {
        result.failedDevices.push({
          id: device.id,
          reason: error.message,
        });
      }
    }

    // 5. Cập nhật ví của khách hàng
    const walletAfter = walletBefore - totalAmount;
    await updateDoc(customerDocRef, {
      wallet: walletAfter,
    });

    // 6. Ghi lịch sử giao dịch ví
    await recordWalletHistory(
      db,
      customerId,
      customerName,
      'payment',
      totalAmount,
      walletBefore,
      walletAfter,
      paidCount,
      `Thanh toán từ Ví (${paidCount} máy) với số tiền ${totalAmount.toLocaleString('vi-VN')} ₫`,
      customerData.phone || '',
      '',
      'pending'
    );

    result.success = true;
    result.paidCount = paidCount;
    result.totalAmount = totalAmount;
    result.walletAfter = walletAfter;
    result.message = `Thanh toán thành công cho ${paidCount} máy. Số tiền: ${totalAmount.toLocaleString('vi-VN')} ₫`;

    return result;
  } catch (error) {
    console.error('Lỗi trong autoPayFromWallet:', error);
    result.message = `Lỗi: ${error.message}`;
    return result;
  }
};

/**
 * Nạp tiền vào ví
 * @param {Object} db - Firestore instance
 * @param {string} customerId - ID khách hàng
 * @param {string} customerName - Tên khách hàng
 * @param {number} amount - Số tiền nạp
 * @param {string} note - Ghi chú
 * @returns {Promise<Object>} - Kết quả nạp tiền
 */
export const depositToWallet = async (
  db,
  customerId,
  customerName,
  amount,
  note = ''
) => {
  const result = {
    success: false,
    walletBefore: 0,
    walletAfter: 0,
    amount: 0,
    message: '',
  };

  try {
    if (amount <= 0) {
      result.message = 'Số tiền nạp phải lớn hơn 0';
      return result;
    }

    // 1. Lấy dữ liệu khách hàng
    const customerDocRef = doc(db, 'dropkh', customerId);
    const customerDoc = await getDoc(customerDocRef);

    if (!customerDoc.exists()) {
      result.message = `Không tìm thấy khách hàng với ID: ${customerId}`;
      return result;
    }

    const customerData = customerDoc.data();
    const walletBefore = Number(customerData.wallet || 0);
    const walletAfter = walletBefore + amount;

    // 2. Cập nhật ví
    await updateDoc(customerDocRef, {
      wallet: walletAfter,
    });

    // 3. Ghi lịch sử
    await recordWalletHistory(
      db,
      customerId,
      customerName,
      'deposit',
      amount,
      walletBefore,
      walletAfter,
      0,
      note,
      customerData.phone || '',
      '',
      'pending'
    );

    result.success = true;
    result.walletBefore = walletBefore;
    result.walletAfter = walletAfter;
    result.amount = amount;
    result.message = `Nạp tiền thành công. Số dư mới: ${walletAfter.toLocaleString('vi-VN')} ₫`;

    return result;
  } catch (error) {
    console.error('Lỗi trong depositToWallet:', error);
    result.message = `Lỗi: ${error.message}`;
    return result;
  }
};

/**
 * Lấy lịch sử giao dịch ví của một khách hàng
 * @param {Object} db - Firestore instance
 * @param {string} customerId - ID khách hàng
 * @returns {Promise<Array>} - Danh sách lịch sử giao dịch
 */
export const getWalletHistory = async (db, customerId) => {
  try {
    const walletHistoryRef = collection(db, 'wallet_history');
    const q = query(walletHistoryRef, where('customerId', '==', customerId));
    const snapshot = await getDocs(q);

    const history = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sắp xếp theo thời gian mới nhất trước
    history.sort((a, b) => {
      const timeA = a.createdAt?.toDate?.() || new Date(0);
      const timeB = b.createdAt?.toDate?.() || new Date(0);
      return timeB - timeA;
    });

    return history;
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử ví:', error);
    throw error;
  }
};

/**
 * Ghi lịch sử "Tất Toán" (Settlement) vào wallet_history
 * @param {Object} db - Firestore instance
 * @param {string} customerId - ID khách hàng
 * @param {string} customerName - Tên khách hàng
 * @param {number} totalAmount - Tổng số tiền thanh toán
 * @param {number} deviceCount - Số lượng máy đã thanh toán
 * @param {string} timestamp - Thời gian thanh toán
 * @param {number} walletAfter - Số tiền còn lại trong ví sau tất toán (nếu có)
 * @param {string} note - Ghi chú chi tiết (danh sách máy, etc)
 * @returns {Promise<string>} - ID của tài liệu được tạo
 */
export const recordSettlementHistory = async (
  db,
  customerId,
  customerName,
  totalAmount,
  deviceCount,
  timestamp,
  walletAfter = 0,
  phone = '',
  note = ''
) => {
  try {
    const walletHistoryRef = collection(db, 'wallet_history');
    const docRef = doc(walletHistoryRef);
    const smsMessage = buildWalletSmsMessage({
      type: 'settlement',
      customerName,
      amount: totalAmount,
      after: walletAfter,
      deviceCount,
      note,
    });
    
    await setDoc(docRef, {
      customerId,
      customerName,
      phone,
      type: 'settlement', // Loại giao dịch là "tất toán"
      amount: totalAmount,
      before: 0,
      after: walletAfter, // Số tiền ví sau tất toán
      paidCount: 0,
      deviceCount, // Số lượng máy được tất toán
      note: note || `Tất toán ${deviceCount} máy - ${timestamp}`,
      smsMessage,
      smsStatus: 'pending',
      createdAt: serverTimestamp(),
      timestamp, // Lưu thêm timestamp cho dễ đọc
      statusCode: 'SETTLEMENT', // Mã trạng thái cho ESP32
    });

    return docRef.id;
  } catch (error) {
    console.error('Lỗi khi ghi lịch sử tất toán:', error);
    throw error;
  }
};
