import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../firebase";
import { doc, updateDoc, setDoc, collection, getDocs } from "firebase/firestore";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver"; // nếu muốn tải file ảnh xuống


// Hàm parse chuỗi "dd/MM/yyyy HH:mm" thành Date
function parseVNDate(str) {
  if (!str) return null;
  const [datePart, timePart] = str.split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour = 0, minute = 0] = timePart ? timePart.split(":").map(Number) : [];
  return new Date(year, month - 1, day, hour, minute);
}



function InfoModal({ show, title, message, onClose, onConfirm }) {
  if (!show) return null;
  return (
    <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">{title || "Thông báo"}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body fs-6">
            <div dangerouslySetInnerHTML={{ __html: message }} />
          </div>
          <div className="modal-footer">
            {onConfirm && (
              <>
                <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
                <button className="btn btn-primary" onClick={onConfirm}>Đồng ý</button>
              </>
            )}
            {!onConfirm && <button className="btn btn-primary" onClick={onClose}>Đóng</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

const ThongKeTable = ({ data, khachHangList }) => {
  const [selectedKhach, setSelectedKhach] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [partialPayment, setPartialPayment] = useState("");
  const [unpaidCountMap, setUnpaidCountMap] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalConfirm, setModalConfirm] = useState(null);

  // --- Thống kê ngày hiện tại ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayData = data.filter((d) => {
    const date = parseVNDate(d.thoigian);
    if (!date) return false;
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    return dateOnly.getTime() === today.getTime();
  });


  const todayTotal = todayData.reduce((sum, d) => {
    const tien = typeof d.tien === "number" ? d.tien : parseInt(d.tien, 10) || 0;
    return sum + tien;
  }, 0);

  const todayNoCount = todayData.filter((d) => d.thanhtoan === "Nợ").length;

  const todayNoTotal = todayData.reduce((sum, d) => {
    const tien = typeof d.tien === "number" ? d.tien : parseInt(d.tien, 10) || 0;
    return d.thanhtoan === "Nợ" ? sum + tien : sum;
  }, 0);
  console.log("📅 Dữ liệu hôm nay:", todayData);

  // --- Thống kê theo tháng ---
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const yearList = useMemo(() => {
    const years = data
      .map((d) => {
        const date = parseVNDate(d.thoigian);
        return date ? date.getFullYear() : NaN;
      })
      .filter((y) => !isNaN(y));
    return [...new Set(years)].sort((a, b) => b - a);
  }, [data]);


  const monthStats = useMemo(() => {
    const stats = {};
    data.forEach((d) => {
      const date = parseVNDate(d.thoigian);
      if (!date) return;
      const year = date.getFullYear();
      if (year !== parseInt(selectedYear)) return;
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const key = `${m}-${year}`;
      if (!stats[key]) stats[key] = { total: 0, no: 0 };
      const tien = typeof d.tien === "number" ? d.tien : parseInt(d.tien, 10) || 0;
stats[key].total += tien;
if (d.thanhtoan === "Nợ") stats[key].no += tien;

    });



    return Object.entries(stats)
      .sort((a, b) => {
    const [ma, ya] = a[0].split("-").map(Number);
    const [mb, yb] = b[0].split("-").map(Number);
    return yb - ya || mb - ma; // Năm giảm dần, cùng năm thì tháng giảm dần
  })
      .map(([month, { total, no }]) => ({ month, total, no }));
  }, [data, selectedYear]);

  useEffect(() => {
    const counts = {};
    khachHangList.forEach((kh) => {
      const debtItems = data.filter((item) => item.name === kh.name && item.thanhtoan === "Nợ");
      counts[kh.name] = debtItems.length;
    });
    setUnpaidCountMap(counts);
  }, [data, khachHangList]);

  useEffect(() => {
    const baseItems = selectedKhach
      ? data.filter((item) => item.name === selectedKhach && item.sms !== "Send")
      : data.filter((item) => item.sms !== "Send");
    setFilteredData(baseItems);
  }, [selectedKhach, data]);

  const tongTien = filteredData.reduce((sum, item) => {
    if (item.thanhtoan === "Ok" || item.thanhtoan === "Nợ") {
      const tien = typeof item.tien === "number" ? item.tien : parseInt(item.tien, 10) || 0;
      return sum + tien;
    }
    return sum;
  }, 0);

  const tongNo = filteredData.reduce((sum, item) => {
    if (item.thanhtoan === "Nợ") {
      const tien = typeof item.tien === "number" ? item.tien : parseInt(item.tien, 10) || 0;
      return sum + tien;
    }
    return sum;
  }, 0);

  const handleTatToan = async () => {
    const unpaidItems = filteredData.filter((item) => item.thanhtoan === "Nợ");
    unpaidItems.sort((a, b) => (b.tien || 0) - (a.tien || 0));

    let remaining = partialPayment.toLowerCase() === "all" ? tongNo : parseInt(partialPayment, 10);
    if (
      partialPayment.trim() === "" ||
      (partialPayment.toLowerCase() !== "all" && isNaN(remaining))
    ) {
      setModalTitle("Lỗi");
      setModalMessage("<span class='text-danger'>Vui lòng nhập số tiền hợp lệ hoặc 'all'</span>");
      setModalConfirm(null);
      setShowModal(true);
      return;
    }

    let countCanPay = 0;
    let totalUsed = 0;
    let tempRemaining = remaining;
    for (const item of unpaidItems) {
      const tien = typeof item.tien === "number" ? item.tien : parseInt(item.tien, 10) || 0;
      if (partialPayment.toLowerCase() === "all" || tempRemaining >= tien) {
        countCanPay++;
        totalUsed += tien;
        if (partialPayment.toLowerCase() !== "all") tempRemaining -= tien;
      }
      if (partialPayment.toLowerCase() !== "all" && tempRemaining <= 0) break;
    }

    const hoanTra =
      partialPayment.toLowerCase() === "all"
        ? 0
        : parseInt(partialPayment, 10) - totalUsed;

    const formatVND = (num) => num.toLocaleString('vi-VN') + ' ₫';
    await handleExportImage();
    setTimeout(() => {
      setModalTitle("Xác nhận tất toán");
      setModalMessage(
        `<div class='text-start'>
        <p>💵 Bạn chắc chắn tất toán <strong class='text-primary'>${formatVND(remaining)}</strong> cho <strong class='text-success'>${selectedKhach}</strong>?</p>
        <p>📦 Số mục nợ: <span class='text-danger fw-bold'>${unpaidItems.length}</span> &nbsp;&nbsp; Số mục có thể thanh toán: <span class='text-info fw-bold'>${countCanPay}</span></p>
        <p>🏷️ Tổng nợ: <span class='text-danger fw-bold'>${formatVND(tongNo)}</span></p>
        ${hoanTra > 0 ? `<p>💰 Trả lại <strong class='text-success'>${selectedKhach}</strong> số tiền dư: <strong class='text-warning'>${formatVND(hoanTra)}</strong></p>` : ''}
      </div>`
      );
      setModalConfirm(() => () => executeTatToan(unpaidItems, remaining));
      setShowModal(true);
    }, 500);
  };

  const executeTatToan = async (unpaidItems, remaining) => {
    let count = 0;
    let totalUsed = 0;
    const updates = [];
    for (const item of unpaidItems) {
      const tien = typeof item.tien === "number" ? item.tien : parseInt(item.tien, 10) || 0;
      if (partialPayment.toLowerCase() === "all" || remaining >= tien) {
        updates.push(updateDoc(doc(db, "roitai", item.id.toString()), { thanhtoan: "Ok" }));
        count++;
        totalUsed += tien;
        if (partialPayment.toLowerCase() !== "all") remaining -= tien;
      }
      if (partialPayment.toLowerCase() !== "all" && remaining <= 0) break;
    }

    if (count === 0) {
      setModalTitle("❌ Thanh toán thất bại");
      setModalMessage("<span class='text-danger'>Không đủ tiền để thanh toán cho bất kỳ mục nào!</span>");
      setModalConfirm(null);
      setShowModal(true);
      return;
    }

    await Promise.all(updates);

    const roitaiRef = collection(db, "roitai");
    const snapshot = await getDocs(roitaiRef);
    const idNumbers = snapshot.docs
      .map((docSnap) => parseInt(docSnap.id, 10))
      .filter((n) => !isNaN(n));
    const nextId = idNumbers.length ? Math.max(...idNumbers) + 1 : 0;
    const now = new Date();
    const formattedTime = now.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
const khachInfo = khachHangList.find(kh => kh.name === selectedKhach);
const phone = khachInfo ? khachInfo.phone || "" : "";
    await setDoc(doc(roitaiRef, nextId.toString()), {
  id: nextId,
  name: selectedKhach,
  phone: phone, // thêm số điện thoại
  loi: `Thanh toán ${totalUsed.toLocaleString()} ₫ cho ${count} máy `,
  
  thanhtoan: "TT",
  thoigian: formattedTime,
  sms: "Send",
});
    setModalTitle("✅ Thành công");
    setModalMessage(`<span class='text-success'>Đã tất toán ${count} mục cho ${selectedKhach}</span>`);
    setModalConfirm(null);
    setShowModal(true);
    setPartialPayment("");
  };

  const printRef = useRef();

  const handleExportImage = async () => {
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current);
    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, `cong-no-${selectedKhach}.png`);
      }
    });
  };


  return (
    <div className="p-2">
      {/* Thống kê ngày hiện tại */}
      <div className="mb-3 p-2 border rounded bg-light text-center">
        <div className="d-flex justify-content-center flex-wrap gap-3 mb-2">
          <div className="fw-bold text-primary">📅 Hôm nay: {todayData.length} đơn</div>
          <div className="fw-bold text-danger">🏷️ Nợ: {todayNoCount} đơn</div>
        </div>
        <div className="d-flex justify-content-center flex-wrap gap-3">
          <div>💰 Tổng tiền: <span className="text-success fw-bold">{todayTotal.toLocaleString("vi-VN")} ₫</span></div>
          <div>💵 Tổng nợ: <span className="text-danger fw-bold">{todayNoTotal.toLocaleString("vi-VN")} ₫</span></div>
        </div>
      </div>

      {/* Phần tất toán */}
      <div className="mb-2">
        <label className="form-label fw-bold small">Chọn khách hàng:</label>
        <input
          list="datalist-khach"
          className="form-control form-control-sm"
          value={selectedKhach}
          onChange={(e) => setSelectedKhach(e.target.value)}
          placeholder="Chọn hoặc nhập tên"
        />
        <datalist id="datalist-khach">
          {khachHangList.map((kh) => (
            <option key={kh.id} value={kh.name}>
              {unpaidCountMap[kh.name] > 0 ? `(${unpaidCountMap[kh.name]} nợ)` : ""}
            </option>
          ))}
        </datalist>
      </div>

      <p>🙍‍♂️ <span className="text-secondary">Công nợ của:</span> <strong className="text-primary">{selectedKhach || "Tất cả"}</strong>
        {selectedKhach && unpaidCountMap[selectedKhach] !== undefined && (
          <span className="ms-2 text-muted">({unpaidCountMap[selectedKhach]} nợ)</span>
        )}
      </p>

      <p>💰 <span className="text-success">Tổng tiền:</span> <strong className="text-success">{tongTien > 0 ? `${tongTien.toLocaleString()} ₫` : "0 ₫"}</strong></p>
      <p>🏷️ <span className="text-danger">Tổng Nợ:</span> <strong className="text-danger">{tongNo > 0 ? `${tongNo.toLocaleString()} ₫` : "0 ₫"}</strong></p>

      {selectedKhach && (
        <div className="d-flex gap-2 mb-2 align-items-end">
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ maxWidth: '160px' }}
            placeholder="Nhập tiền hoặc 'all'"
            value={partialPayment}
            onChange={(e) => setPartialPayment(e.target.value)}
          />
          <button className="btn btn-sm btn-secondary" onClick={handleTatToan}>✅ Tất toán</button>
        </div>
      )}

      {/* Thống kê theo tháng đặt dưới cùng */}
      <div className="mt-4 mb-2 d-flex justify-content-between align-items-center bg-info bg-opacity-25 p-2 rounded">
        <h6 className="fw-bold m-0 text-info">📊 Thống kê theo tháng</h6>
        <select
          className="form-select form-select-sm w-auto border-info text-info"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {yearList.map((y) => (
            <option key={y} value={y || ""}>{y || "N/A"}</option>
          ))}
        </select>
      </div>

      <table className="table table-bordered table-striped table-sm text-center mb-3 border-info">
        <thead className="table-info text-dark">
          <tr>
            <th>Tháng</th>
            <th>Tổng Tiền</th>
            <th>Nợ</th>
          </tr>
        </thead>
        <tbody>
          {monthStats.map((m) => (
            <tr key={m.month}>
              <td className="fw-bold text-info">{m.month}</td>
              <td className="text-success">{m.total.toLocaleString("vi-VN")} ₫</td>
              <td className="text-danger">{m.no.toLocaleString("vi-VN")} ₫</td>
            </tr>
          ))}
        </tbody>
      </table>

      <InfoModal show={showModal} title={modalTitle} message={modalMessage} onClose={() => setShowModal(false)} onConfirm={modalConfirm} />

      <div style={{ position: 'absolute', top: -9999, left: -9999 }}>
        <div ref={printRef} style={{ width: 600, padding: 20, background: '#fff', fontSize: '14px' }}>
          <h5 style={{ textAlign: 'center', color: '#2c3e50' }}>📋 Công nợ của {selectedKhach}</h5>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '10px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f8ff' }}>
                <th style={{ border: '1px solid #ccc', padding: '6px' }}>STT</th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Tên máy</th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Tình Trạng</th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Tiền</th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Ngày</th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Thanh toán</th>
              </tr>
            </thead>
            <tbody>
              {filteredData
                .filter(i => i.thanhtoan === "Nợ")
                .map((item, idx) => {
                  const date = parseVNDate(item.thoigian);
                  const ngay = date
                    ? date.toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    : item.thoigian;


                  return (
                    <tr key={item.id}>
                      <td style={{ border: '1px solid #ccc', padding: '6px' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px' }}>{item.iphone || "-"}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px' }}>{item.loi || "-"}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>
                        {(item.tien || 0).toLocaleString("vi-VN")} ₫
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '6px' }}>{ngay}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>{item.thanhtoan}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          <p style={{ marginTop: 12, fontWeight: 'bold', color: '#c0392b', textAlign: 'right' }}>
            🏷️ Tổng nợ: {tongNo.toLocaleString("vi-VN")} ₫
          </p>


        </div>
      </div>


    </div>
  );
};

export default ThongKeTable;
