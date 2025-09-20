import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../firebase";
import {
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  writeBatch
} from "firebase/firestore";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";

import { getNextRoiTaiId } from "../utils/roitaiCounter";

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

  const [selectedDateOffset, setSelectedDateOffset] = useState(0);

  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - selectedDateOffset);
  currentDate.setHours(0, 0, 0, 0);

  const todayData = data.filter((d) => {
    const date = parseVNDate(d.thoigian);
    if (!date) return false;
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    return dateOnly.getTime() === currentDate.getTime();
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
        return yb - ya || mb - ma;
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
    const batch = writeBatch(db);

    for (const item of unpaidItems) {
      const tien = typeof item.tien === "number" ? item.tien : parseInt(item.tien, 10) || 0;
      if (partialPayment.toLowerCase() === "all" || remaining >= tien) {
        batch.update(doc(db, "roitai", item.id.toString()), { thanhtoan: "Ok" });
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

    await batch.commit();

  const roitaiRef = collection(db, "roitai");
const nextId = await getNextRoiTaiId(db);



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
      phone,
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

  const getKhachPassword = (name) => {
    const kh = khachHangList.find(k => k.name === name);
    if (!kh) return "liên hệ";
    return kh.pass || "liên hệ";
  };

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
      {/* Thống kê ngày hiện tại hoặc ngày chọn */}
      <div className="mb-3 p-3 border rounded bg-light">
        {/* Tiêu đề + chọn ngày */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold text-primary m-0">📊 Thống kê ngày</h6>
          <div className="d-flex align-items-center gap-2">
            <label className="form-label m-0 fw-bold text-secondary small">Ngày:</label>
            <select
              className="form-select form-select-sm w-auto"
              value={selectedDateOffset}
              onChange={(e) => setSelectedDateOffset(Number(e.target.value))}
            >
              <option value={0}>Hôm nay</option>
              <option value={1}>Hôm qua</option>
              <option value={2}>Hôm kia</option>
            </select>
          </div>
        </div>

        {/* Bố cục 2 cột */}
        <div className="row text-center g-3">
          {/* Cột trái */}
          <div className="col-md-6">
            <div className="p-2 mb-3 bg-white rounded shadow-sm">
              📅 {selectedDateOffset === 0
                ? "Hôm nay"
                : selectedDateOffset === 1
                  ? "Hôm qua"
                  : selectedDateOffset === 2
                    ? "Hôm kia"
                    : `${selectedDateOffset} ngày trước`}
              <div className="fw-bold text-primary">{todayData.length} đơn</div>
            </div>
            <div className="p-2 bg-white rounded shadow-sm">
              🏷️ Nợ
              <div className="fw-bold text-danger">{todayNoCount} đơn</div>
            </div>
          </div>

          {/* Cột phải */}
          <div className="col-md-6">
            <div className="p-2 mb-3 bg-white rounded shadow-sm">
              💰 Tổng tiền
              <div className="fw-bold text-success">
                {todayTotal.toLocaleString("vi-VN")} ₫
              </div>
            </div>
            <div className="p-2 bg-white rounded shadow-sm">
              💵 Tổng nợ
              <div className="fw-bold text-danger">
                {todayNoTotal.toLocaleString("vi-VN")} ₫
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Phần tất toán */}
      <div className="mb-2">
        <label className="form-label fw-bold small">Chọn khách hàng:</label>
        <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
          <input
            list="datalist-khach"
            className="form-control form-control-sm pe-4" // thêm padding để không bị che
            value={selectedKhach}
            onChange={(e) => setSelectedKhach(e.target.value)}
            placeholder="Chọn hoặc nhập tên"
          />
          {selectedKhach && (
            <span
              onClick={() => setSelectedKhach("")}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "red",
                fontWeight: "bold",
                fontSize: "16px",
              }}
            >
              ✖
            </span>
          )}
        </div>

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
          <button className="btn btn-sm btn-info" onClick={handleExportImage}>
            📷 Xuất ảnh
          </button>
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
        <div
          ref={printRef}
          style={{
            width: 720,
            padding: 20,
            background: '#f8f9fa',       // nền tổng thể nhã nhặn
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            borderRadius: '12px',
            border: '1px solid #ddd'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            {/* Thông tin khách hàng */}
            <div style={{ flex: 1 }}>
              <p style={{ margin: '4px 0', fontWeight: 'bold' }}>
                Khách hàng: <span style={{ color: '#2980b9' }}>{selectedKhach}</span>
              </p>
              <p style={{ margin: '4px 0' }}>📞 SĐT: {khachHangList.find(kh => kh.name === selectedKhach)?.phone || "-"}</p>
              <p style={{ margin: '4px 0' }}>🧾 Tổng số máy nợ: {filteredData.filter(i => i.thanhtoan === "Nợ").length}</p>
              <p style={{ margin: '4px 0', color: '#c0392b', fontWeight: 'bold' }}>
                💰 Tổng nợ: {tongNo.toLocaleString("vi-VN")} ₫
              </p>
            </div>

            {/* Logo */}
            <div style={{ textAlign: 'right' }}>
              <img
                src="/logo.png"
                alt="Logo"
                style={{ width: 100, height: 'auto', borderRadius: '10px', border: '1px solid #eee' }}
              />
            </div>
          </div>

          {/* Bảng */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              fontSize: '13px',
              border: '1px solid #e0e0e0',
              borderRadius: '10px',
              overflow: 'hidden',
              background: '#fff'
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#eaf4fc', color: '#2c3e50' }}>
                <th style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>STT</th>
                <th style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Tên máy</th>
                <th style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Tình trạng</th>
                <th style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>IMEI</th>
                <th style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>T.Tiền</th>
                <th style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>Thời Gian</th>
                <th style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>T.Toán</th>
              </tr>
            </thead>
            <tbody>
              {filteredData
                .filter(i => i.thanhtoan === "Nợ")
                .sort((a, b) => b.id - a.id)   // 👉 Sắp xếp theo ID giảm dần
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
                    <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fbfc' }}>
                      <td style={{ padding: '6px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '6px' }}>{item.iphone || "-"}</td>
                      <td style={{ padding: '6px' }}>{item.loi || "-"}</td>
                      <td style={{ padding: '6px' }}>{item.imei || "-"}</td>
                      <td style={{ padding: '6px', textAlign: 'center', color: '#27ae60', fontWeight: 'bold' }}>
                        {Number(item.tien || 0).toLocaleString("vi-VN")} ₫
                      </td>

                      <td style={{ padding: '6px', textAlign: 'center' }}>{ngay}</td>
                      <td
                        style={{
                          padding: '6px',
                          textAlign: 'center',
                          color: item.thanhtoan === "Nợ" ? '#e74c3c' : '#2c3e50',
                          fontWeight: item.thanhtoan === "Nợ" ? 'bold' : 'normal'
                        }}
                      >
                        {item.thanhtoan}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {/* Footer: thêm chữ Xem chi tiết và mật khẩu khách hàng ở cuối ảnh */}
          <div style={{ marginTop: 14, borderTop: '1px dashed #ccc', paddingTop: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#2c3e50' }}>
              🔗 <span style={{ fontStyle: 'italic', color: '#2980b9', fontWeight: 'bold' }}>Xem chi tiết tại:</span>
              <span style={{ color: '#8e44ad', fontWeight: 'bold' }}> https://hoanglsls.web.app </span>&nbsp;|&nbsp;
              🔑 <span style={{ fontStyle: 'italic', color: '#0b5229ff', fontWeight: 'bold' }}>Mật khẩu: </span>
              <strong style={{ color: '#c0392b' }}>{getKhachPassword(selectedKhach)}</strong>
            </div>
          </div>

        </div>
      </div>






    </div>
  );
};

export default ThongKeTable;
