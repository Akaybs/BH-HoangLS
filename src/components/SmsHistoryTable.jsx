import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

const getTypeLabel = (item) => {
  if (item.source === "wallet") {
    if (item.type === "deposit") return "Nạp tiền";
    if (item.type === "payment") return "Thanh toán Ví";
    if (item.type === "settlement") return "Tất toán";
    if (item.type === "sms" || item.relatedThanhtoan === "SMS") return "Tin nhắn";
    return "Ví";
  }
  return item.type || item.thanhtoan || "RoiTai";
};

const getStatusBadge = (status) => {
  if (!status) return <span className="badge bg-secondary">Chưa gửi</span>;
  if (status === "pending") return <span className="badge bg-warning text-dark">Đang chờ</span>;
  if (status === "Yes") return <span className="badge bg-warning text-dark">Chờ gửi</span>;
  if (status === "Send") return <span className="badge bg-info text-dark">Đã gửi</span>;
  if (status === "Done" || status === "sent") return <span className="badge bg-success">Thành công</span>;
  if (status === "Error" || status === "error") return <span className="badge bg-danger">Lỗi</span>;
  return <span className="badge bg-secondary">{status}</span>;
};

const parseVNDateTime = (value) => {
  if (!value) return null;
  if (typeof value !== "string") return null;
  const parts = value.split(" ");
  if (parts.length < 2) return null;
  const [datePart, timePart] = parts;
  const [dd, mm, yyyy] = datePart.split("/");
  const [hh, min] = timePart.split(":");
  if (!dd || !mm || !yyyy || !hh || !min) return null;
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00`);
};

const getItemTimestamp = (item) => {
  if (item.createdAt?.toDate) return item.createdAt.toDate().getTime();
  if (item.createdAt instanceof Date) return item.createdAt.getTime();
  if (item.localCreatedAt?.toDate) return item.localCreatedAt.toDate().getTime();
  if (item.localCreatedAt instanceof Date) return item.localCreatedAt.getTime();
  return parseVNDateTime(item.thoigian)?.getTime() || 0;
};

const SmsHistoryTable = () => {
  const [walletItems, setWalletItems] = useState([]);
  const [roitaiItems, setRoitaiItems] = useState([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const walletQuery = query(
      collection(db, "wallet_history"),
      orderBy("createdAt", "desc"),
      limit(12)
    );

    const roitaiQuery = query(
      collection(db, "roitai"),
      limit(50)
    );

    const walletUnsub = onSnapshot(walletQuery, (snapshot) => {
      setWalletItems(snapshot.docs.map((doc) => ({
        id: doc.id,
        source: "wallet",
        ...doc.data(),
      })));
    });

    const roitaiUnsub = onSnapshot(roitaiQuery, (snapshot) => {
      setRoitaiItems(snapshot.docs
        .map((doc) => ({
          id: doc.id,
          source: "roitai",
          ...doc.data(),
        }))
        .filter((item) => item.sms));
    });

    return () => {
      walletUnsub();
      roitaiUnsub();
    };
  }, []);

  const items = useMemo(() => {
    return [...walletItems, ...roitaiItems]
      .sort((a, b) => getItemTimestamp(b) - getItemTimestamp(a))
      .slice(0, 20);
  }, [walletItems, roitaiItems]);

  const renderMessageText = (item) => {
    const directSmsText = item.smsMessage || item.message || item.description;
    if (directSmsText) return directSmsText;

    if (item.type === "manual" || item.note === "Tin nhắn SMS thủ công" || item.relatedThanhtoan === "SMS") {
      return item.note || "Không có nội dung";
    }

    if (item.source === "wallet" && item.relatedId) {
      return `ID: ${item.relatedId || item.id}\nKhách hàng: ${item.relatedCustomerName || item.customerName || "-"}\nTên máy: ${item.relatedDeviceName || "-"}\nTình Trạng: ${item.relatedStatus || "-"}\nIMEI: ${item.relatedImei || "-"}\nT.T: ${item.relatedThanhtoan || item.type || "-"}\nSố Tiền: ${(Number(item.relatedAmount || item.amount) || 0).toLocaleString("vi-VN")} ₫`;
    }

    if (item.source === "roitai") {
      return `ID: ${item.id}\nKhách hàng: ${item.name || item.customerName || "-"}\nTên máy: ${item.iphone || item.imei || "-"}`;
    }

    if (item.note) return item.note;
    if (item.description) return item.thanhtoan || item.loi || "Không có nội dung";
    return "Không có nội dung";
  };

  return (
    <div
      className="card shadow-sm"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: collapsed ? "320px" : "380px",
        maxHeight: collapsed ? "60px" : "600px",
        zIndex: 900,
        transition: "all 0.2s ease",
      }}
    >
      <div
        className="card-header d-flex justify-content-between align-items-center bg-primary text-white"
        onClick={() => setCollapsed((prev) => !prev)}
        style={{ cursor: "pointer" }}
      >
        <div>
          <strong>SMS Log</strong>
        </div>
        <span className="small opacity-75">{collapsed ? "Mở" : "Thu nhỏ"}</span>
      </div>

      {!collapsed && (
        <div className="card-body p-2" style={{ overflowY: "auto", maxHeight: "520px" }}>
          {items.length === 0 ? (
            <div className="text-center text-muted py-4">Chưa có lịch sử SMS</div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {items.map((item) => {
                const timeValue = getItemTimestamp(item);
                const time = timeValue ? new Date(timeValue).toLocaleString("vi-VN") : "-";
                const isWallet = item.source === "wallet";
                const bubbleClass = isWallet ? "bg-primary text-white" : "bg-light text-dark";
                const alignClass = isWallet ? "align-self-end" : "align-self-start";

                return (
                  <div
                    key={`${item.source}-${item.id}`}
                    className={`p-3 rounded-3 shadow-sm ${bubbleClass} ${alignClass}`}
                    style={{ maxWidth: "100%", minWidth: "220px", width: "100%", wordBreak: "break-word" }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                      <div>
                        <strong>{item.customerName || item.name || item.customerId || "Khách"}</strong>
                      </div>
                      <div className="small text-end">
                        {getStatusBadge(isWallet ? item.smsStatus : item.sms)}
                      </div>
                    </div>
                    <div className="mb-2" style={{ whiteSpace: "pre-wrap" }}>
                      {renderMessageText(item)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmsHistoryTable;
