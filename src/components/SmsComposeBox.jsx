import React, { useMemo, useState } from "react";
import { recordWalletHistory } from "../utils/walletPaymentUtils";
import { db } from "../firebase";

const SmsComposeBox = ({ khachHangList }) => {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return khachHangList;
    return khachHangList.filter((customer) => {
      const name = (customer.name || "").toLowerCase();
      const phone = (customer.phone || "").toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
  }, [khachHangList, search]);

  const selectedCustomers = useMemo(
    () => khachHangList.filter((customer) => selectedIds.has(customer.id)),
    [khachHangList, selectedIds]
  );

  const toggleSelect = (customerId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredCustomers.map((customer) => customer.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const canSend = selectedCustomers.length > 0 && message.trim().length > 0;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setLastResult(null);

    const results = [];
    for (const customer of selectedCustomers) {
      if (!customer.phone) {
        results.push({ customer, success: false, error: "Không có số điện thoại" });
        continue;
      }

      try {
        await recordWalletHistory(
          db,
          customer.id?.toString?.() || "",
          customer.name || "Khách",
          "sms",
          0,
          0,
          0,
          0,
          message.trim(),
          customer.phone || "",
          message.trim(),
          "pending",
          0,
          {
            relatedId: customer.id?.toString?.() || null,
            relatedCustomerName: customer.name,
            relatedDeviceName: null,
            relatedStatus: null,
            relatedImei: null,
            relatedThanhtoan: "SMS",
            relatedAmount: 0,
          }
        );
        results.push({ customer, success: true });
      } catch (error) {
        results.push({ customer, success: false, error: error.message });
      }
    }

    const successCount = results.filter((item) => item.success).length;
    const failedCount = results.filter((item) => !item.success).length;

    setLastResult({ successCount, failedCount, details: results });
    setSending(false);
    if (successCount > 0) {
      setMessage("");
      clearSelection();
    }
  };

  return (
    <div className="card mt-3 shadow-sm">

     
        <div className="row g-3">
          <div className="col-12 col-xl-6">
            <div className="border rounded p-3 h-100 bg-light">
              <label className="form-label fw-bold">Tìm khách hàng</label>
              <input
                type="text"
                className="form-control"
                placeholder="Tìm theo tên hoặc số điện thoại"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div className="d-flex align-items-center justify-content-between mt-3 mb-2">
                <div className="small text-muted">{filteredCustomers.length} khách hàng tìm được</div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={selectAllVisible}>
                    Chọn tất cả
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearSelection}>
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <div className="border rounded overflow-hidden" style={{ maxHeight: "320px", overflowY: "auto" }}>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th style={{ width: "40px" }}></th>
                        <th>Tên</th>
                        <th>SĐT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="text-center text-muted py-3">Không có khách hàng phù hợp</td>
                        </tr>
                      ) : (
                        filteredCustomers.map((customer) => (
                          <tr key={customer.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(customer.id)}
                                onChange={() => toggleSelect(customer.id)}
                              />
                            </td>
                            <td>
                              <div className="fw-semibold">{customer.name || "Khách"}</div>
                            </td>
                            <td>
                              <div className="small text-muted">{customer.phone || "Chưa có số"}</div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-xl-6">
            <div className="border rounded p-3 h-100">
              <label className="form-label fw-bold">Nội dung tin nhắn</label>
              <textarea
                className="form-control"
                rows={8}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nhập nội dung SMS muốn gửi..."
              />
              <div className="small text-muted mt-1">{message.length} ký tự</div>

              <div className="alert alert-info mt-3 mb-3">
                <div className="small">Đã chọn: <strong>{selectedCustomers.length}</strong> khách hàng</div>
                {selectedCustomers.length > 0 && (
                  <div className="small text-muted mt-1">
                    {selectedCustomers.slice(0, 3).map((customer) => customer.name || "Khách").join(", ")}
                    {selectedCustomers.length > 3 ? " ..." : ""}
                  </div>
                )}
              </div>

              <div className="d-flex justify-content-between align-items-center gap-2">
                <div className="small text-muted">
                  Sẵn sàng gửi khi có khách hàng và nội dung.
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSend}
                  disabled={!canSend || sending}
                >
                  {sending ? "Đang gửi..." : "Gửi SMS"}
                </button>
              </div>

              {lastResult && (
                <div className="alert alert-info mt-3 mb-0">
                  Đã gửi {lastResult.successCount} / {lastResult.details.length} tin nhắn.
                  {lastResult.failedCount > 0 && (
                    <div className="small text-danger">Lỗi: {lastResult.failedCount} khách hàng.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      
    </div>
  );
};

export default SmsComposeBox;
