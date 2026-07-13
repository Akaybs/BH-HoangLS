import React, { useEffect, useState } from 'react';
import './input.css';
import { getWalletHistory } from '../utils/walletPaymentUtils';

const WalletHistoryModal = ({ show, customerId, customerName, db, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);

  const getTypeBadge = (type, item = null) => {
    if (type === 'deposit') {
      return <span className="badge bg-success">Nạp tiền</span>;
    } else if (type === 'payment') {
      return <span className="badge bg-warning text-dark">Thanh toán</span>;
    } else if (type === 'settlement') {
      return <span className="badge bg-info">Tất Toán</span>;
    } else if (type === 'sms' || item?.relatedThanhtoan === 'SMS' || item?.type === 'manual') {
      return <span className="badge bg-secondary">Tin nhắn</span>;
    }
    return <span className="badge bg-secondary">Khác</span>;
  };

  const getAmountColor = (type, item = null) => {
    if (type === 'deposit') {
      return 'text-success fw-bold';
    }
    if (type === 'sms' || item?.relatedThanhtoan === 'SMS' || item?.type === 'manual') {
      return 'text-muted';
    }
    return 'text-danger fw-bold';
  };

  const getAmountSign = (type, item = null) => {
    if (type === 'deposit') {
      return '+';
    }
    if (type === 'sms' || item?.relatedThanhtoan === 'SMS' || item?.type === 'manual') {
      return '';
    }
    return '-';
  };

  const isSmsOnlyEntry = (item) => {
    return item?.type === 'sms' || item?.relatedThanhtoan === 'SMS' || item?.type === 'manual';
  };

  useEffect(() => {
    if (!show) return;
    let mounted = true;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const h = await getWalletHistory(db, customerId);
        if (mounted) {
          setHistory(h);
          // Lấy số dư cuối cùng từ giao dịch mới nhất
          if (h.length > 0) {
            setCurrentBalance(h[0].after || 0);
          }
        }
      } catch (err) {
        console.error('Lỗi khi lấy lịch sử ví:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (customerId) fetchHistory();
    return () => { mounted = false; };
  }, [show, customerId, db]);

  if (!show) return null;

  return (
    <div className="modal fade show" style={{ display: 'block', position: 'fixed', inset: 0, zIndex: 1045, overflowY: 'auto', padding: '1rem' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.32)', opacity: 1, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 1040 }} />
      <div className="modal-dialog modal-dialog-centered modal-lg" style={{ position: 'relative', zIndex: 1050 }}>
        <div className="modal-content shadow-lg">
          <div className="modal-header bg-primary text-white border-bottom-0 pb-0">
            <div className="w-100">
              <h5 className="modal-title mb-2">📱 Giao Dịch Của {customerName || customerId}</h5>
              
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          {/* Balance Summary */}
          {!loading && history.length > 0 && (
            <div className="bg-light border-bottom p-3">
              <div className="row align-items-center">
                <div className="col">
                  <small className="text-muted d-block">Số dư Ví hiện tại</small>
                  <h5 className="mb-0 text-success fw-bold">
                    {currentBalance.toLocaleString('vi-VN')} ₫
                  </h5>
                </div>
                <div className="col-auto">
                  <small className="badge bg-info">
                    {history.length} giao dịch
                  </small>
                </div>
              </div>
            </div>
          )}

          <div className="modal-body p-0">
            {loading && (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Đang tải...</span>
                </div>
                <p className="text-muted">Đang tải lịch sử ví...</p>
              </div>
            )}

            {!loading && history.length === 0 && (
              <div className="text-center py-5">
                <p className="text-muted mb-0">📋 Chưa có giao dịch nào</p>
              </div>
            )}

            {!loading && history.length > 0 && (
              <div className="table-responsive">
  <table className="table table-hover mb-0">

  <colgroup>
    {/* Thời gian */}
    <col style={{ width: "160px" }} />

    {/* Loại */}
    <col style={{ width: "80px" }} />

    {/* Số tiền */}
    <col style={{ width: "100px" }} />

    {/* Ví */}
    <col style={{ width: "100px" }} />

    {/* Ghi chú - tự động chiếm phần còn lại */}
    <col />
  </colgroup>

  <thead className="bg-light sticky-top">
    <tr>
      <th className="small text-muted">
        Thời gian
      </th>

      <th className="small text-muted text-center">
        Loại
      </th>

      <th className="small text-muted text-end">
        Số tiền
      </th>

      <th className="small text-muted text-center">
        Ví
      </th>

      <th className="small text-muted">
        Ghi chú
      </th>
    </tr>
  </thead>

    <tbody>
      {history.map((h) => (
        <tr key={h.id} className="align-middle">
          {/* Thời gian */}
          <td className="small">
            <span className="text-secondary">
              {h.createdAt?.toDate
                ? h.createdAt.toDate().toLocaleString("vi-VN")
                : "-"}
            </span>
          </td>

          {/* Loại */}
          <td className="small text-left">
            {getTypeBadge(h.type, h)}

            {h.paidCount > 0 && h.type !== 'settlement' && (
              <div>
                <small className="text-muted">
                  ({h.paidCount} máy)
                </small>
              </div>
            )}

            {h.deviceCount > 0 && h.type === 'settlement' && (
              <div>
                <small className="text-muted">
                  ({h.deviceCount} máy)
                </small>
              </div>
            )}
          </td>

          {/* Số tiền */}
          <td className={`text-end small ${getAmountColor(h.type, h)}`}>
            {isSmsOnlyEntry(h) ? (
              <span className="text-muted">—</span>
            ) : (
              <>
                {getAmountSign(h.type, h)} {" "}
                {(h.amount || 0).toLocaleString("vi-VN")} ₫
              </>
            )}
          </td>

          {/* Số dư */}
          <td className="text-end small">
            {isSmsOnlyEntry(h) ? (
              <span className="text-muted">—</span>
            ) : (
              <span className="badge bg-light text-dark">
                {(h.after || 0).toLocaleString("vi-VN")} ₫
              </span>
            )}
          </td>

          {/* Ghi chú */}
          <td className="small">
            {h.note ? (
              <span
                title={h.note}
                className="d-inline-block text-truncate"
                style={{
                  maxWidth: "100%",
                  width: "100%",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {h.note}
              </span>
            ) : (
              <span className="text-muted">-</span>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
            )}
          </div>

          <div className="modal-footer bg-light border-top-0">
            <button 
              className="btn btn-primary" 
              onClick={onClose}
            >
              ✓ Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletHistoryModal;
