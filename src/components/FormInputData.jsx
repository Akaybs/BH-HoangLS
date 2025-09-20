import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import "./input.css";
import VirtualKeyboard from "./VirtualKeyboard"; // đường dẫn đúng với nơi bạn đặt file
import RoiTaiTable from "./RoiTaiTable";
import FormNhapLieu from "./FormNhapLieu";
import ThongKeTable from "./ThongKeTable";
import DanhSachDropdown from "./DanhSachDropdown";
import { getNextRoiTaiId } from "../utils/roitaiCounter";


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

const formatDisplayTime = (datetimeValue) => {
  if (!datetimeValue) return "";
  const date = new Date(datetimeValue);
  if (isNaN(date)) return datetimeValue; // fallback nếu không phải ISO format
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
};




const FormInputData = () => {


  const [form, setForm] = useState({
    sms: "Yes"
  });


  const [data, setData] = useState([]);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const roitaiRef = collection(db, "roitai");
  const [hienThongKe, setHienThongKe] = useState(false);
  const [hienDropdown, setHienDropdown] = useState(false);


  useEffect(() => {
    const unsubscribe = onSnapshot(roitaiRef, (snapshot) => {
      const newData = snapshot.docs.map((docSnap) => ({
        id: parseInt(docSnap.id, 10), // ép về number
        ...docSnap.data(),
      }));
      setData(newData);
    });

    return () => unsubscribe();
  }, []);



  const [khachHangList, setKhachHangList] = useState([]);

  useEffect(() => {
    const fetchDropKH = async () => {
      try {
        const snapshot = await getDocs(collection(db, "dropkh"));
        const khachHang = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setKhachHangList(khachHang);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách khách hàng từ dropkh:", error);
      }
    };

    fetchDropKH();
  }, []);




  const [benhList, setbenhList] = useState([]);
  const [selectedBenh, setSelectedBenh] = useState(""); // lưu giá trị đã chọn

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
      const benh = benhList.find((b) => b.ten === value);
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
    const nextId = await getNextRoiTaiId(db);

    // ✅ Chuyển định dạng thời gian từ yyyy-MM-ddTHH:mm sang dd/MM/yyyy HH:mm
    let formattedTime = form.thoigian;
    if (form.thoigian && form.thoigian.includes("T")) {
      const [datePart, timePart] = form.thoigian.split("T"); // "2025-08-06", "18:45"
      const [yyyy, mm, dd] = datePart.split("-");
      formattedTime = `${dd}/${mm}/${yyyy} ${timePart}`; // "06/08/2025 18:45"
    }

    await setDoc(doc(roitaiRef, nextId.toString()), {
      ...form,
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

    setForm({
      sms: "Yes",
      tien: 0,
      tienText: "",
      thoigian: defaultTime,
    });

    setEditId(null);

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
      setForm({});
      setEditId(null);
    } catch (err) {
      console.error("Lỗi khi cập nhật:", err);
    }
  };

  const handleCancel = () => {
    setEditId(null);
    setForm({});
  };

  return (
    <div className="container-fluid py-4">
      <div className="row justify-content-center">

        {/* ✅ Cột bên trái: Gồm cả Form nhập liệu và bảng thống kê */}
        <div className="col-lg-3 col-md-4" style={{ marginTop: "10px" }}>
          <div className="card shadow-sm mt-6">
            <div style={{ marginTop: "1px" }}>
              <div className="card-header bg-primary text-white fw-bold text-center">
                📝 Nhập Thông Tin
              </div>

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
          </div>

          {/* ✅ Thống kê nằm dưới form, cùng 1 cột */}
          <div className="card mt-3 shadow-sm">

            <button
              className={`btn btn-sm fw-bold mb-3 w-100 ${hienThongKe ? "btn-warning" : "btn-outline-primary"
                }`}
              onClick={() => setHienThongKe(!hienThongKe)}
            >
              {hienThongKe ? (
                <>
                  Ẩn thống kê ▲
                </>
              ) : (
                <>
                  Hiện thống kê ▼
                </>
              )}
            </button>


            {hienThongKe && (
              <div className="card-body p-2">
                <ThongKeTable data={data} khachHangList={khachHangList} />
              </div>
            )}
          </div>
          {/* ✅ Bổ sung phần này bên trong col-lg-3 */}


          <button
            className={`btn btn-sm w-100 fw-bold ${hienDropdown ? "btn-danger" : "btn-outline-secondary"
              }`}
            onClick={() => setHienDropdown(!hienDropdown)}
          >
            {hienDropdown ? "Đóng Tùy Chỉnh ▲" : "Tùy Chỉnh ▼"}
          </button>



          {hienDropdown && (
            <DanhSachDropdown
              khachHangList={khachHangList}
              setKhachHangList={setKhachHangList}
              benhList={benhList}
              setBenhList={setbenhList}
            />
          )}
        </div>



        {/* ✅ Cột bên phải: Bảng chính */}
        <div className="col-lg-8 col-md-8">
         

          <RoiTaiTable
            data={data}
            className="data-table-custom-size"
            onEdit={(row) => {
              setEditId(row.id);
              setForm(row); // đổ dữ liệu lên form
            }}
            onDelete={handleDelete}
            editId={editId}
            handleAddData={handleAddData}
          />
        </div>
      </div>
    </div>

  );
};


export default FormInputData;
