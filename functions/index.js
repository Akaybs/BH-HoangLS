const admin = require("firebase-admin");
const { region } = require("firebase-functions/v2");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onValueUpdated } = require("firebase-functions/v2/database");

admin.initializeApp();
const firestore = admin.firestore();
const realtime = admin.database();

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("vi-VN").format(amount);
};

const buildSmsMessage = ({
  type,
  customerName,
  amount,
  after,
  paidCount = 0,
  deviceCount = 0,
  note = "",
}) => {
  const amountText = `${formatMoney(amount)} ₫`;
  const afterText = `${formatMoney(after)} ₫`;
  const count = type === "settlement" ? deviceCount : paidCount;

  if (type === "deposit") {
    return `TB: ${customerName}\n\nQuy khach vua nap tien vao Vi.\n\nSo tien: ${amountText}\n\nSo du Vi: ${afterText}\n\nCam on Quy khach!`;
  }

  if (type === "payment") {
    return `TB: ${customerName}\n\nQuy khach da thanh toan ${count} may bang Vi.\n\nSo tien: ${amountText}\n\nSo du Vi: ${afterText}\n\nCam on Quy khach!`;
  }

  if (type === "settlement") {
    return `TB: ${customerName}\n\nQuy khach da tat toan ${count} may.\n\nSo tien: ${amountText}\n\nSo du Vi: ${afterText}\n\nCam on Quy khach!`;
  }

  return note || "";
};

// Normalize various provider/legacy status strings to a canonical set:
// 'pending' | 'sent' | 'failed' | 'no'
const normalizeStatus = (value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim().toLowerCase();
  if (!s) return null;

  const sentValues = new Set(["done", "sent", "send", "ok", "success"]);
  const failedValues = new Set(["error", "err", "failed", "failure"]);
  const pendingValues = new Set(["yes", "pending", "wait", "waiting", "queue"]);
  const noValues = new Set(["no", "none", "n/a"]);

  if (sentValues.has(s)) return "sent";
  if (failedValues.has(s)) return "failed";
  if (pendingValues.has(s)) return "pending";
  if (noValues.has(s)) return "no";
  return s;
};

exports.syncWalletHistoryToSmsQueue = onDocumentCreated(
  {
    region: "us-central1",
    document: "wallet_history/{docId}",
  },
  async (event) => {
    const docId = event.params.docId;
    const data = event.data.data();
    if (!data) {
      console.log(`wallet_history/${docId} không có dữ liệu`);
      return;
    }

    const { customerId, customerName, type, amount, after, paidCount, deviceCount, note, phone, smsMessage } = data;
    if (!customerName || !type) {
      console.log(`wallet_history/${docId} thiếu customerName hoặc type`);
      return;
    }

    let phoneNumber = phone || "";
    if (!phoneNumber && customerId) {
      const customerSnap = await firestore.collection("dropkh").doc(customerId).get();
      if (customerSnap.exists) {
        phoneNumber = customerSnap.data().phone || "";
      }
    }

    if (!phoneNumber) {
      console.log(`wallet_history/${docId} không tìm thấy số điện thoại`);
      return;
    }

    const message = smsMessage || buildSmsMessage({
      type,
      customerName,
      amount,
      after,
      paidCount,
      deviceCount,
      note,
    });

    await realtime.ref(`smsQueue/${docId}`).set({
      walletHistoryId: docId,
      customerId: customerId || "",
      customerName,
      phone: phoneNumber,
      type: type || "",
      amount: Number(amount || 0),
      note: note || "",
      smsMessage: message,
      status: "pending",
      createdAt: admin.database.ServerValue.TIMESTAMP,
    });

    console.log(`Đã tạo smsQueue/${docId} từ wallet_history/${docId}`);
  }
);

exports.syncSmsQueueStatusToWalletHistory = onValueUpdated(
  {
    region: "asia-southeast1",
    ref: "/smsQueue/{docId}/status",
  },
  async (event) => {
    const docId = event.params.docId;
    const afterValue = event.data.after.val();
      const normalized = normalizeStatus(afterValue);
      if (!normalized) return;

      if (normalized === "sent" || normalized === "failed") {
        const updateData = {
          smsStatus: normalized,
          smsSentAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await firestore.collection("wallet_history").doc(docId).update(updateData);
        console.log(`Cập nhật wallet_history/${docId} smsStatus=${normalized}`);
      }
  }
);
