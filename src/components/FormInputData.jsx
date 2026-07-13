import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../firebase";
import "./input.css";
import VirtualKeyboard from "./VirtualKeyboard"; // đường dẫn đúng với nơi bạn đặt file
import RoiTaiTable from "./RoiTaiTable";
import FormNhapLieu from "./FormNhapLieu";
import ThongKeTable from "./ThongKeTable";
import DanhSachDropdown from "./DanhSachDropdown";
import SmsHistoryTable from "./SmsHistoryTable";
import SmsComposeBox from "./SmsComposeBox";
import { getSimpleNextId } from "../utils/getSimpleNextId";
import { recordWalletHistory } from "../utils/walletPaymentUtils";



import {
  collection,
  setDoc,
  getDocs,
  doc,
  deleteDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";




// 👉 Hàm chuyển "400.000 ₫" thành 400000 (số)
const parseCurrency = (value) => {
  if (typeof value !== "string") return 0;
  return Number(value.replace(/[₫.,\s]/g, ""));
};
const formatCurrency = (value) => {
  if (typeof value !== "number" || isNaN(value)) return "";
  return value.toLocaleString("vi-VN") + " ₫";
};

const getDefaultFormState = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  return {
    sms: "Yes",
    thanhtoan: "Nợ",
    thoigian: `${yyyy}-${mm}-${dd}T${hh}:${min}`,
    tien: 0,
    tienText: "",
  };
};

const FormInputData = () => {
  const [form, setForm] = useState(getDefaultFormState());
  const [showFormModal, setShowFormModal] = useState(false);
  const [modalTransform, setModalTransform] = useState(null); // inline transform for jump animation
  const [showAddButton, setShowAddButton] = useState(false);
  const [data, setData] = useState([]);
  const [editId, setEditId] = useState(null);
  const roitaiRef = useMemo(() => collection(db, "roitai"), [db]);
  const [showThongKeModal, setShowThongKeModal] = useState(false);
  const [showDropdownModal, setShowDropdownModal] = useState(false);
  const [showSmsComposeModal, setShowSmsComposeModal] = useState(false);


  useEffect(() => {
    const unsubscribe = onSnapshot(roitaiRef, (snapshot) => {
      const newData = snapshot.docs.map((docSnap) => ({
        id: parseInt(docSnap.id, 10), // ép về number
        ...docSnap.data(),
      }));
      setData(newData);
    });

    return () => unsubscribe();
  }, [roitaiRef]);



  const [khachHangList, setKhachHangList] = useState([]);

  useEffect(() => {
  const unsubscribe = onSnapshot(
    collection(db, "dropkh"),
    (snapshot) => {
      const khachHang = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setKhachHangList(khachHang);
    }
  );

  return () => unsubscribe();
}, []);




  const [benhList, setbenhList] = useState([]);

  useEffect(() => {
    const fetchDropb = async () => {
      try {
        const snapshot = await getDocs(collection(db, "dropb"));
        const benh = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setbenhList(benh);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách khách hàng từ dropb:", error);
      }
    };

    fetchDropb();
  }, []);




  const [showKeyboard, setShowKeyboard] = useState(false);
  const imeiInputRef = useRef(null);
  const keyboardRef = useRef(null);


  const handleVirtualKeyPress = (key) => {
    if (key === "Reset") {
      setForm((prevForm) => ({
        ...prevForm,
        imei: "", // Xóa toàn bộ
      }));
    } else {
      setForm((prevForm) => ({
        ...prevForm,
        imei: (prevForm.imei || "") + key,
      }));
    }
  };


  // Ẩn bàn phím khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        imeiInputRef.current &&
        !imeiInputRef.current.contains(event.target) &&
        keyboardRef.current &&
        !keyboardRef.current.contains(event.target)
      ) {
        setShowKeyboard(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  useEffect(() => {
    if (!form.thoigian) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const hh = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      const formatted = `${yyyy}-${mm}-${dd}T${hh}:${min}`; // ✅ đúng định dạng

      setForm((prev) => ({
        ...prev,
        thoigian: formatted,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleMouseMove = (event) => {
      setShowAddButton(event.clientX <= 80);
    };

    const handleMouseLeave = () => {
      setShowAddButton(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);


  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "name") {
      const khach = khachHangList.find((kh) => kh.name === value);
      setForm((prev) => ({
        ...prev,
        name: value,
        phone: khach?.phone || "",
      }));
    } else if (name === "loi") {
      setForm((prev) => ({
        ...prev,
        loi: value,

      }));
    } else if (name === "tien") {
      const soTien = parseCurrency(value); // Chuyển chuỗi thành số
      setForm((prev) => ({
        ...prev,
        tien: soTien,       // Lưu giá trị dạng số (dùng khi lưu database)
        tienText: value     // Hiển thị lại cho người dùng
      }));

    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };




  const handleAddData = async () => {
  try {
    const nextId = await getSimpleNextId(db);   // ✅ dùng hàm mới
// ======================
// Kiểm tra thanh toán bằng Ví
// ======================
let paymentStatus = form.thanhtoan;
let paymentMethod = "cash"; // mặc định thanh toán bằng tiền mặt

if (paymentStatus === "Nợ") {
  const customer = khachHangList.find(
    (item) => item.name === form.name
  );

  if (customer) {
    const wallet = Number(customer.wallet || 0);
    const repairCost = Number(form.tien || 0);

    if (wallet >= repairCost) {
      const walletAfter = wallet - repairCost;
      
      // Cập nhật ví
      await updateDoc(doc(db, "dropkh", customer.id), {
        wallet: walletAfter,
      });

      // Ghi lịch sử giao dịch ví
      await recordWalletHistory(
        db,
        customer.id,
        customer.name,
        "payment",
        repairCost,
        wallet,
        walletAfter,
        1, // paidCount = 1 vì chỉ 1 máy
        `Thanh toán từ Ví (1 máy) với số tiền ${repairCost.toLocaleString('vi-VN')} ₫`,
        customer.phone || '',
        '',
        'pending',
        0,
        {
          relatedId: nextId?.toString?.() || null,
          relatedCustomerName: customer.name,
          relatedDeviceName: form.iphone || null,
          relatedStatus: form.loi || null,
          relatedImei: form.imei || null,
          relatedThanhtoan: 'Ví',
          relatedAmount: repairCost,
        }
      );

      paymentStatus = "Ví";
      paymentMethod = "wallet";
    }
  }
}
    // ✅ Chuyển định dạng thời gian từ yyyy-MM-ddTHH:mm sang dd/MM/yyyy HH:mm
    let formattedTime = form.thoigian;
    if (form.thoigian && form.thoigian.includes("T")) {
      const [datePart, timePart] = form.thoigian.split("T"); // "2025-08-06", "18:45"
      const [yyyy, mm, dd] = datePart.split("-");
      formattedTime = `${dd}/${mm}/${yyyy} ${timePart}`; // "06/08/2025 18:45"
    }

    await setDoc(doc(roitaiRef, nextId.toString()), {
    ...form,
    thanhtoan: paymentStatus,
    paymentMethod: paymentMethod,
    thoigian: formattedTime,
    sms: form.sms || "Yes"
});

    // ✅ Reset lại form và set lại thời gian hiện tại
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const defaultTime = `${yyyy}-${mm}-${dd}T${hh}:${min}`; // để set lại input datetime-local

    setForm(getDefaultFormState());
    setEditId(null);
    setShowFormModal(false);

  } catch (error) {
    console.error("Lỗi khi thêm dữ liệu:", error);
  }
};


  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(roitaiRef, id.toString()));
    } catch (err) {
      console.error("Lỗi khi xóa:", err);
    }
  };

  const handleSave = async (id) => {
    try {
      await updateDoc(doc(roitaiRef, id.toString()), form);
      setForm(getDefaultFormState());
      setEditId(null);
      setShowFormModal(false);
    } catch (err) {
      console.error("Lỗi khi cập nhật:", err);
    }
  };

  const openAddModal = (e) => {
    // capture click origin and compute delta to viewport center
    try {
      const rect = e?.currentTarget?.getBoundingClientRect?.();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const modalWidth = Math.min(900, vw - 80);
      const modalHeight = Math.min(800, vh - 120);
      const btnCx = rect ? rect.left + rect.width / 2 : vw / 2;
      const btnCy = rect ? rect.top + rect.height / 2 : vh / 2;
      const modalCx = vw / 2;
      const modalCy = vh / 2;
      const dx = btnCx - modalCx;
      const dy = btnCy - modalCy;

      const initial = `translate(${dx}px, ${dy}px) scale(0.75)`;
      setModalTransform(initial);
    } catch (err) {
      setModalTransform(null);
    }

    setEditId(null);
    setForm(getDefaultFormState());
    setShowFormModal(true);

    // trigger transition to center
    window.requestAnimationFrame(() => {
      setTimeout(() => setModalTransform(null), 25);
    });
  };

  const openEditModal = (row) => {
    setEditId(row.id);
    setForm(row);
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditId(null);
    setForm(getDefaultFormState());
  };

  return (
    <div className="container-fluid py-4">
      <button
        type="button"
        onClick={() => openAddModal()}
        className="btn btn-primary shadow-lg"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: "20px",
          zIndex: 1200,
          opacity: showAddButton ? 1 : 0,
          pointerEvents: showAddButton ? "auto" : "none",
          transition: "opacity 0.2s ease",
          padding: "0.75rem 0.35rem",
          fontWeight: 600,
          borderRadius: "0 10px 10px 0",
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.35rem",
        }}
        aria-label="Thêm mới"
        title="Thêm mới"
      >
        <i className="bi bi-plus-lg"></i>
        <span>Thêm</span>
      </button>

      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          <RoiTaiTable
            data={data}
            className="data-table-custom-size"
            onEdit={openEditModal}
            onDelete={handleDelete}
            onAdd={openAddModal}
            onOpenThongKe={() => setShowThongKeModal(true)}
            onOpenDropdown={() => setShowDropdownModal(true)}
            onOpenSmsCompose={() => setShowSmsComposeModal(true)}
          />

          <div className="mt-4">
            <SmsHistoryTable />
          </div>
        </div>
      </div>

      {showThongKeModal && (
        <div>
          <div
                className="modal-backdrop fade show"
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.32)",
                  opacity: 1,
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  zIndex: 2000,
                }}
          />
          <div
            className="modal fade show"
                style={{
                  display: "block",
                  position: "fixed",
                  inset: 0,
                  zIndex: 2010,
                  overflowY: "auto",
                  padding: "2rem 1rem",
                }}
          >
            <div className="modal-dialog modal-dialog-centered modal-xl">
              <div className="modal-content shadow-lg modal-animate">
                <div className="modal-header bg-info text-white">
                  <div>
                    <h5 className="modal-title">📊 Thống kê</h5>
                    <div className="small opacity-75">Bảng báo cáo thống kê dữ liệu.</div>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowThongKeModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <ThongKeTable
                    data={data}
                    khachHangList={khachHangList}
                    setKhachHangList={setKhachHangList}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowThongKeModal(false)}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDropdownModal && (
        <div>
          <div
            className="modal-backdrop fade show"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.32)",
              opacity: 1,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              zIndex: 2000,
            }}
          />
          <div
            className="modal fade show"
            style={{
              display: "block",
              position: "fixed",
              inset: 0,
              zIndex: 2010,
              overflowY: "auto",
              padding: "2rem 1rem",
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-xl">
              <div className="modal-content shadow-lg modal-animate">
                <div className="modal-header bg-secondary text-white">
                  <div>
                    <h5 className="modal-title">⚙️ Tùy chỉnh dữ liệu</h5>
                    <div className="small opacity-75">Quản lý danh sách khách hàng và lỗi/tình trạng.</div>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowDropdownModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <DanhSachDropdown
                    khachHangList={khachHangList}
                    setKhachHangList={setKhachHangList}
                    benhList={benhList}
                    setBenhList={setbenhList}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowDropdownModal(false)}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSmsComposeModal && (
        <div>
          <div
            className="modal-backdrop fade show"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.32)",
              opacity: 1,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              zIndex: 2000,
            }}
          />
          <div
            className="modal fade show"
            style={{
              display: "block",
              position: "fixed",
              inset: 0,
              zIndex: 2010,
              overflowY: "auto",
              padding: "2rem 1rem",
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-xl">
              <div className="modal-content shadow-lg modal-animate">
                <div className="modal-header bg-success text-white">
                  <div>
                    <h5 className="modal-title">✉️ Soạn tin SMS</h5>
                    
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowSmsComposeModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <SmsComposeBox khachHangList={khachHangList} />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSmsComposeModal(false)}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFormModal && (
        <div>
          <div
            className="modal-backdrop fade show"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.32)",
              opacity: 1,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              zIndex: 2000,
            }}
          />
          <div
            className="modal fade show"
            style={{
              display: "block",
              position: "fixed",
              inset: 0,
              zIndex: 2010,
              overflowY: "auto",
              padding: "2rem 1rem",
            }}
          >
                <div
                  className="modal-dialog modal-dialog-centered modal-md"
                  style={{ maxWidth: "600px" }}
                >
                  <div
                    className="modal-content shadow-lg modal-animate"
                    style={{
                      transform: modalTransform || undefined,
                      transition: modalTransform ? "transform 0.35s ease-out, opacity 0.35s" : undefined,
                    }}
                  >
                <div className="modal-header bg-primary text-white">
                  <div>
                    <h5 className="modal-title">
                      {editId !== null ? "✏️ Chỉnh sửa" : "➕ Thêm mới"}
                    </h5>
                   
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={closeFormModal}
                  ></button>
                </div>
                <div className="modal-body">
                  <FormNhapLieu
                    form={form}
                    setForm={setForm}
                    handleAddData={editId !== null ? () => handleSave(editId) : handleAddData}
                    khachHangList={khachHangList}
                    benhList={benhList}
                    imeiInputRef={imeiInputRef}
                    keyboardRef={keyboardRef}
                    showKeyboard={showKeyboard}
                    setShowKeyboard={setShowKeyboard}
                    handleVirtualKeyPress={handleVirtualKeyPress}
                    parseCurrency={parseCurrency}
                    formatCurrency={formatCurrency}
                    handleChange={handleChange}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeFormModal}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default FormInputData;
