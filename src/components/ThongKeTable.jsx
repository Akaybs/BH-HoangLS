import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../firebase";
import WalletModal from "./WalletModal";
import WalletHistoryModal from "./WalletHistoryModal";
import {
  doc,
  collection,
  getDocs,
  query,
  where,
  documentId,
  orderBy,
  writeBatch
} from "firebase/firestore";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";

import { autoPayFromWallet as payFromWalletUtil, depositToWallet, recordSettlementHistory } from "../utils/walletPaymentUtils";


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
    <div className="modal fade show" style={{ display: "block", position: "fixed", inset: 0, zIndex: 1045, overflowY: "auto", padding: "1rem" }}>
      <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.32)", opacity: 1, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: 1040 }} />
      <div className="modal-dialog modal-dialog-centered" style={{ position: "relative", zIndex: 1050 }}>
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

const ThongKeTable = ({ data, khachHangList, setKhachHangList }) => {
  const [selectedKhach, setSelectedKhach] = useState("");
  const [selectedKhachInfo, setSelectedKhachInfo] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [partialPayment, setPartialPayment] = useState("");
  const [unpaidCountMap, setUnpaidCountMap] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalConfirm, setModalConfirm] = useState(null);

  const [selectedDateOffset, setSelectedDateOffset] = useState(0);
  const autoPayFromWallet = async (customer) => {
    // Lấy danh sách máy Nợ của khách hàng
    const q = query(
      collection(db, "roitai"),
      where("name", "==", customer.name),
      where("thanhtoan", "==", "Nợ"),
      orderBy(documentId())
    );

    const snapshot = await getDocs(q);

    const deviceList = snapshot.docs.map((d) => ({
      id: parseInt(d.id, 10),
      ...d.data(),
    }));

    if (deviceList.length === 0) {
      return customer.wallet; // Không có máy nào nợ
    }

    // Gọi hàm từ walletPaymentUtils
    const result = await payFromWalletUtil(
      db,
      customer.id,
      customer.name,
      deviceList
    );

    if (result.success) {
      console.log("Thanh toán thành công:", result);
      return result.walletAfter;
    } else {
      console.warn("Lỗi thanh toán:", result.message);
      throw new Error(result.message);
    }
  };

  const handleWalletSave = async (money, note) => {
    try {
      if (!selectedKhachInfo) return;

      if (money <= 0) {
        alert("Vui lòng nhập số tiền lớn hơn 0!");
        return;
      }

      // Gọi hàm từ walletPaymentUtils để nạp tiền vào ví
      const result = await depositToWallet(
        db,
        selectedKhachInfo.id,
        selectedKhachInfo.name,
        money,
        note
      );

      if (!result.success) {
        alert(result.message);
        return;
      }

      // Cập nhật giao diện
      setSelectedKhachInfo((prev) => ({
        ...prev,
        wallet: result.walletAfter,
      }));

      setKhachHangList((prev) =>
        prev.map((item) =>
          item.id === selectedKhachInfo.id
            ? {
              ...item,
              wallet: result.walletAfter,
            }
            : item
        )
      );

      // Đóng cửa sổ nạp tiền
      setShowWalletModal(false);
      // Nếu sau khi nạp tiền khách hàng không còn nợ thì chỉ hiển thị thông báo
      const customerDebtTotal = data
        .filter((d) => d.name === selectedKhachInfo?.name && d.thanhtoan === "Nợ")
        .reduce((s, item) => {
          const tien = typeof item.tien === "number" ? item.tien : parseInt(item.tien, 10) || 0;
          return s + tien;
        }, 0);

      setModalTitle("Nạp tiền thành công");

      setModalMessage(`
      <div class="text-start">
        <p>✅ Đã nạp thành công:</p>

        <h5 class="text-success">
          ${Number(money).toLocaleString("vi-VN")} ₫
        </h5>

        <hr>

        <p>Số dư Ví hiện tại:</p>

        <h5 class="text-primary">
          ${result.walletAfter.toLocaleString("vi-VN")} ₫
        </h5>

        <hr>
        ${customerDebtTotal === 0 ? '<p>🎉 Khách hàng không còn khoản nợ nào.</p>' : '<p>Bạn có muốn dùng số dư Ví để thanh toán các khoản nợ còn lại không?</p>'}
      </div>
    `);

      if (customerDebtTotal === 0) {
        // Không cần hỏi thanh toán từ ví
        setModalConfirm(null);
        setShowModal(true);
      } else {
        // Khi bấm "Đồng ý" sẽ thực hiện thanh toán từ ví
        setModalConfirm(() => () =>
          executePayFromWallet({
            ...selectedKhachInfo,
            wallet: result.walletAfter,
          })
        );

        setShowModal(true);
      }

    } catch (error) {
      console.error(error);
      alert("Có lỗi khi nạp tiền!");
    }
  };
  const executePayFromWallet = async (customer) => {
    try {
      if (!customer) return;

      const newWallet = await autoPayFromWallet(customer);

      setSelectedKhachInfo((prev) => ({
        ...prev,
        wallet: newWallet,
      }));

      setKhachHangList((prev) =>
        prev.map((item) =>
          item.id === customer.id
            ? { ...item, wallet: newWallet }
            : item
        )
      );

      setShowModal(false);

      // Hiển thị thông báo chi tiết
      const message = `✅ Đã thanh toán thành công các khoản nợ!\n\nSố dư ví mới: ${newWallet.toLocaleString("vi-VN")} ₫`;
      alert(message);

    } catch (err) {
      console.error(err);
      alert("Có lỗi khi thanh toán: " + err.message);
    }
  };

  const handlePayFromWallet = () => {

    if (!selectedKhachInfo) return;

    if ((selectedKhachInfo.wallet || 0) <= 0) {
      alert("Ví không còn tiền!");
      return;
    }

    setModalTitle("Thanh toán từ Ví");

    setModalMessage(`
    <div class="text-start">
      <p>Bạn muốn dùng <strong>Ví</strong> để thanh toán các khoản nợ?</p>

      <p>Khách hàng:
      <strong class="text-primary">
      ${selectedKhachInfo.name}
      </strong></p>

      <p>Số dư Ví:
      <strong class="text-success">
      ${(selectedKhachInfo.wallet || 0).toLocaleString("vi-VN")} ₫
      </strong></p>
    </div>
  `);

    setModalConfirm(() => () =>
      executePayFromWallet(selectedKhachInfo)
    );

    setShowModal(true);
  };


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
    if (d.thanhtoan === "Ok" || d.thanhtoan === "Nợ" || d.thanhtoan === "Ví") {
      const tien = typeof d.tien === "number" ? d.tien : parseInt(d.tien, 10) || 0;
      return sum + tien;
    }
    return sum;
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





  const debtCustomers = Array.from(
    new Set(
      data
        .filter((d) => d.thanhtoan === "Nợ")
        .map((d) => d.name)
    )
  );




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
      // ✅ Chỉ cộng tổng tiền nếu trạng thái là "Ok", "Nợ" hoặc "Ví"
      if (["Ok", "Nợ", "Ví"].includes(d.thanhtoan)) {
        stats[key].total += tien;
      }

      // ✅ Riêng phần "Nợ" giữ nguyên
      if (d.thanhtoan === "Nợ") {
        stats[key].no += tien;
      }
    });

    return Object.entries(stats)
      .sort((a, b) => {
        const [ma, ya] = a[0].split("-").map(Number);
        const [mb, yb] = b[0].split("-").map(Number);
        return yb - ya || mb - ma;
      })
      .map(([month, { total, no }]) => ({ month, total, no }));
  }, [data, selectedYear]);

  const yearTotal = useMemo(() => {
    return monthStats.reduce(
      (sum, item) => ({
        total: sum.total + item.total,
        no: sum.no + item.no,
      }),
      { total: 0, no: 0 }
    );
  }, [monthStats]);


  useEffect(() => {
    const counts = {};
    khachHangList.forEach((kh) => {
      const debtItems = data.filter((item) => item.name === kh.name && item.thanhtoan === "Nợ");
      counts[kh.name] = debtItems.length;
    });
    setUnpaidCountMap(counts);
  }, [data, khachHangList]);
  useEffect(() => {

    const kh = khachHangList.find(
      item => item.name === selectedKhach
    );

    setSelectedKhachInfo(kh || null);

  }, [selectedKhach, khachHangList]);
  useEffect(() => {
    const baseItems = selectedKhach
      ? data.filter((item) => item.name === selectedKhach && item.sms !== "Send")
      : data.filter((item) => item.sms !== "Send");
    setFilteredData(baseItems);
  }, [selectedKhach, data]);

  const tongTien = filteredData.reduce((sum, item) => {
    if (item.thanhtoan === "Ok" || item.thanhtoan === "Nợ" || item.thanhtoan === "Ví") {
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
        ${hoanTra > 0 ? `<p>💰 Nạp tiền vào ví của <strong class='text-success'>${selectedKhach}</strong> số tiền dư: <strong class='text-warning'>${formatVND(hoanTra)}</strong></p>` : ''}
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
    const originalRemaining = remaining; // Lưu lại số tiền ban đầu

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

    // ✅ Tính số tiền dư và nạp vào ví nếu có
    const tienDu = originalRemaining - totalUsed;
    let walletAfter = khachInfo ? (khachInfo.wallet || 0) : 0; // Số dư ví ban đầu
    let walletDepositMessage = "";

    if (tienDu > 0) {
      try {
        // Nạp số tiền dư vào ví
        const deployResult = await depositToWallet(
          db,
          khachInfo.id,
          khachInfo.name,
          tienDu,
          `Tiền dư từ tất toán ${formattedTime}`
        );

        if (deployResult.success) {
          walletAfter = deployResult.walletAfter; // Cập nhật số dư ví sau nạp
          walletDepositMessage = `<p class='text-success mt-2'>✅ Đã nạp <strong>${tienDu.toLocaleString("vi-VN")} ₫</strong> vào ví khách hàng</p>`;
          
          // Cập nhật UI
          setKhachHangList((prev) =>
            prev.map((item) =>
              item.id === khachInfo.id
                ? { ...item, wallet: deployResult.walletAfter }
                : item
            )
          );
        }
      } catch (error) {
        console.error("Lỗi khi nạp tiền vào ví:", error);
      }
    }

    // ✅ Ghi lịch sử "Tất Toán" vào wallet_history với số dư ví
    try {
      await recordSettlementHistory(
        db,
        khachInfo.id,
        selectedKhach,
        totalUsed,
        count,
        formattedTime,
        walletAfter, // Lưu số tiền ví sau tất toán
        khachInfo.phone || '',
        `Tất toán ${count} máy với tổng tiền ${totalUsed.toLocaleString("vi-VN")} ₫`
      );
    } catch (error) {
      console.error("Lỗi khi ghi lịch sử tất toán:", error);
    }

    setModalTitle("✅ Thành công");
    setModalMessage(`<div class='text-success'>
      <p>✅ Đã tất toán ${count} mục cho ${selectedKhach}</p>
      <p>💰 Tổng tiền thanh toán: <strong>${totalUsed.toLocaleString("vi-VN")} ₫</strong></p>
      ${walletDepositMessage}
    </div>`);
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
    const canvas = await html2canvas(printRef.current, {
      scale: 3, // chất lượng cao hơn (thử 3 nếu muốn nét hơn nữa)
      useCORS: true
    });
    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, `cong-no-${selectedKhach}.png`);
      }
    });
  };

  // 👉 Tạo danh sách khách hàng đã sắp xếp
  const sortedKhachHang = [...khachHangList].sort((a, b) => {
    const noA = unpaidCountMap[a.name] || 0;
    const noB = unpaidCountMap[b.name] || 0;

    // Ưu tiên khách có nợ > 0 lên đầu
    if (noA > 0 && noB === 0) return -1;
    if (noA === 0 && noB > 0) return 1;

    // Nếu cùng trạng thái nợ thì sắp xếp theo tên A → Z
    return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
  });

  return (
    <div className="p-2">
      <div className="row g-3 mb-3">
        <div className="col-12 col-xl-6">
          <div className="p-3 border rounded bg-light h-100">
            {/* Tiêu đề + chọn ngày */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold text-primary m-0">📊 Thống Kê Ngày</h6>
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

            <div className="row text-center g-3">
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
        </div>

        <div className="col-12 col-xl-6">
          <div className="p-3 border rounded bg-light h-100">
            <div className="mb-2 d-flex justify-content-between align-items-center bg-info bg-opacity-25 p-2 rounded">
              <h6 className="fw-bold m-0 text-info">📊 Thống Kê Theo Tháng</h6>
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

            <table className="table table-bordered table-striped table-sm text-center mb-0 border-info">
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
                    <td className="text-success">
                      {m.total.toLocaleString("vi-VN")} ₫
                    </td>
                    <td className="text-danger">
                      {m.no.toLocaleString("vi-VN")} ₫
                    </td>
                  </tr>
                ))}

                <tr className="table-warning fw-bold">
                  <td>Tổng {selectedYear}</td>
                  <td className="text-success">
                    {yearTotal.total.toLocaleString("vi-VN")} ₫
                  </td>
                  <td className="text-danger">
                    {yearTotal.no.toLocaleString("vi-VN")} ₫
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12 col-xl-6">
          <div className="p-3 border rounded bg-light h-100">
            <label className="form-label fw-bold small">Chọn khách hàng:</label>
            <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
              <input
                list="datalist-khach"
                className="form-control form-control-sm pe-4"
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
              {sortedKhachHang.map((kh) => (
                <option key={kh.id} value={kh.name}>
                  {unpaidCountMap[kh.name] > 0 ? `(${unpaidCountMap[kh.name]} nợ)` : ""}
                </option>
              ))}
            </datalist>

            <p className="mt-3 mb-2">🙍‍♂️ <span className="text-secondary">Công nợ: </span>
              <strong className="text-primary">{selectedKhach || "Tất cả"}</strong>
              {selectedKhach && unpaidCountMap[selectedKhach] !== undefined && (
                <span className="ms-2 text-muted">({unpaidCountMap[selectedKhach]} nợ)</span>
              )}
            </p>

            {selectedKhachInfo && (
              <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                <div>
                  💳 Ví:
                  <strong className="text-success ms-2">
                    {(selectedKhachInfo.wallet || 0).toLocaleString("vi-VN")} ₫
                  </strong>
                </div>

                <div className="d-flex gap-2 flex-wrap">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={handlePayFromWallet}
                    disabled={(selectedKhachInfo.wallet || 0) <= 0 || tongNo <= 0}
                  >
                    💳 T.T Ví
                  </button>

                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => setShowWalletModal(true)}
                  >
                    💰 Nạp
                  </button>

                  <button
                    className="btn btn-sm btn-outline-info"
                    onClick={() => setShowHistoryModal(true)}
                    disabled={!selectedKhachInfo}
                  >
                    🕘
                  </button>
                </div>
              </div>
            )}

            <p>💰 <span className="text-success">Tổng tiền:</span> <strong className="text-success">{tongTien > 0 ? `${tongTien.toLocaleString()} ₫` : "0 ₫"}</strong></p>
            <p>🏷️ <span className="text-danger">Tổng Nợ:</span> <strong className="text-danger">{tongNo > 0 ? `${tongNo.toLocaleString()} ₫` : "0 ₫"}</strong></p>

            {selectedKhach && (
              <div className="d-flex gap-2 mb-2 align-items-end flex-wrap">
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
          </div>
        </div>

        <div className="col-12 col-xl-6">
          <div className="p-3 border rounded bg-light h-100">
            <div className="mb-2 d-flex justify-content-between align-items-center p-2 rounded shadow-sm" style={{ background: "linear-gradient(90deg, #ebc520ff, #e3f2fd)" }}>
              <h6 className="fw-bold m-0 text-primary">
                🙍‍♂️ Danh sách khách hàng đang nợ
              </h6>
            </div>

            <table className="table table-bordered table-striped table-sm text-center mb-0 border-warning">
              <thead className="table-warning text-dark">
                <tr>
                  <th>Khách hàng</th>
                  <th>Số đơn nợ</th>
                  <th>Tổng nợ</th>
                </tr>
              </thead>
              <tbody>
                {debtCustomers.map((name) => {
                  const debtItems = data.filter((d) => {
                    const date = parseVNDate(d.thoigian);
                    if (!date) return false;
                    const year = date.getFullYear();
                    return (
                      year === selectedYear &&
                      d.name === name &&
                      d.thanhtoan === "Nợ"
                    );
                  });

                  if (debtItems.length === 0) return null;

                  const totalDebt = debtItems.reduce((sum, d) => {
                    const tien = typeof d.tien === "number" ? d.tien : parseInt(d.tien, 10) || 0;
                    return sum + tien;
                  }, 0);

                  return (
                    <tr key={name}>
                      <td className="fw-bold text-start" style={{ color: "#76889cff" }}>
                        {name}
                      </td>
                      <td className="text-center">{debtItems.length}</td>
                      <td className="text-danger text-end">
                        {totalDebt.toLocaleString("vi-VN")} ₫
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>



      <InfoModal show={showModal} title={modalTitle} message={modalMessage} onClose={() => setShowModal(false)} onConfirm={modalConfirm} />
      <WalletModal
        show={showWalletModal}
        customer={selectedKhachInfo}
        onClose={() => setShowWalletModal(false)}
        onSave={handleWalletSave}
      />
      <WalletHistoryModal
        show={showHistoryModal}
        customerId={selectedKhachInfo?.id}
        customerName={selectedKhachInfo?.name}
        db={db}
        onClose={() => setShowHistoryModal(false)}
      />
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
              {(selectedKhachInfo?.wallet || 0) > 0 && (
                <p style={{ margin: '4px 0', color: '#27ae60', fontWeight: 'bold' }}>
                  💳 Ví: {(selectedKhachInfo?.wallet || 0).toLocaleString("vi-VN")} ₫
                </p>
              )}
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
