// FormNhapLieu.jsx
import React, { useEffect, useRef, useState } from "react";
import VirtualKeyboard from "./VirtualKeyboard";

const FormNhapLieu = ({
  form,
  setForm,
  handleAddData,
  khachHangList,
  benhList,
  imeiInputRef,
  keyboardRef,
  showKeyboard,
  setShowKeyboard,
  handleVirtualKeyPress,
  parseCurrency,
  formatCurrency,
  handleChange,
}) => {
  const [dropToan] = React.useState(["Ok", "Nợ", "Back"]);
  const [dropIphone] = React.useState([
    "iPhone 16 Pro Max",
    "iPhone 16 Pro",
    "iPhone 16 Plus",
    "iPhone 15 Pro Max",
    "iPhone 15 Pro",
    "iPhone 15 Plus",
    "iPhone 15",
    "iPhone 14 Pro Max",
    "iPhone 14 Pro",
    "iPhone 14 Plus",
    "iPhone 13 Pro Max",
    "iPhone 13 Pro",
    "iPhone 13",
    "iPhone 12 Pro Max",
    "iPhone 12 Pro",
    "iPhone 12",
    "iPhone 11 Pro Max",
    "iPhone 11 Pro",
    "iPhone 11",
    "iPhone XS Max",
    "iPhone XS",
    "iPhone X",
    "iPhone 8 PLus",
    "iPhone 8",
    "iPhone 7 Plus",
    "iPhone 7",
    "iPhone 6S Plus",
    "iPhone 6s",
    "iPhone 6",
  ]);

  // "2025-08-08T21:00" -> "08/08/2025 21:00"
  function toDisplayFormat(value) {
    if (!value) return "";
    const [date, time] = value.split("T");
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year} ${time}`;
  }

  // "08/08/2025 21:00" -> "2025-08-08T21:00"
  function toInputFormat(value) {
    if (!value) return "";
    const [date, time] = value.split(" ");
    if (!date || !time) return "";
    const [day, month, year] = date.split("/");
    if (!day || !month || !year) return "";
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${time}`;
  }

  // Hàm lấy thời gian hiện tại
  const getNowFormatted = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  const [autoUpdate, setAutoUpdate] = useState(true);
  const intervalRef = useRef(null);

  // Auto cập nhật Thời Gian mỗi phút
useEffect(() => {
  if (autoUpdate) {
    const updateNow = () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const hh = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      const formatted = `${dd}/${mm}/${yyyy} ${hh}:${min}`;
      setForm((prev) => ({ ...prev, thoigian: formatted }));
    };

    updateNow(); // chạy ngay khi mount
    intervalRef.current = setInterval(updateNow, 60 * 1000); // chạy mỗi phút
  }

  return () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
}, [autoUpdate, setForm]);


  return (
    <div className="card-body">
      <div className="mb-2 d-flex gap-2">
        {/* Khách Hàng */}
        <div className="w-70">
          <label className="form-label">Khách Hàng</label>
          <div style={{ position: "relative" }}>
            <input
              className="form-control pe-5"
              name="name"
              required
              list="khachHangOptions"
              onChange={handleChange}
              value={form.name || ""}
            />
            {form.name && (
              <button
                type="button"
                className="btn btn-sm btn-light position-absolute top-50 end-0 translate-middle-y me-2"
                onClick={() => setForm((prev) => ({ ...prev, name: "" }))}
                style={{ zIndex: 2 }}
              >
                ❌
              </button>
            )}
          </div>

          <datalist id="khachHangOptions">
            {[...khachHangList]
              .sort((a, b) =>
                a.name.localeCompare(b.name, "vi", { sensitivity: "base" })
              )
              .map((khach) => (
                <option key={khach.id} value={khach.name}>
               {/*       ({khach.phone})     */}
                </option>
              ))}
          </datalist>
        </div>

        {/* Tên Máy */}
        <div className="w-30">
          <label className="form-label">Tên Máy</label>
          <div style={{ position: "relative" }}>
            <input
              className="form-control pe-5"
              name="iphone"
              list="tenMayOptions"
              onChange={handleChange}
              value={form.iphone || ""}
              autoComplete="off"
            />
            {form.iphone && (
              <button
                type="button"
                className="btn btn-sm btn-light position-absolute top-50 end-0 translate-middle-y me-2"
                onClick={() => setForm((prev) => ({ ...prev, iphone: "" }))}
                style={{ zIndex: 2 }}
              >
                ❌
              </button>
            )}
          </div>

          <datalist id="tenMayOptions">
            {dropIphone.map((item, index) => (
              <option key={index} value={item} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="mb-2 d-flex gap-2">
        {/* Tình Trạng */}
        <div className="w-75">
          <label className="form-label">Tình Trạng</label>
          <div style={{ position: "relative" }}>
            <input
              className="form-control pe-5"
              name="loi"
              list="tinhTrangOptions"
              onChange={handleChange}
              value={form.loi || ""}
              autoComplete="off"
            />
            {form.loi && (
              <button
                type="button"
                className="btn btn-sm btn-light position-absolute top-50 end-0 translate-middle-y me-2"
                onClick={() => setForm((prev) => ({ ...prev, loi: "" }))}
                style={{ zIndex: 2 }}
              >
                ❌
              </button>
            )}
          </div>

          <datalist id="tinhTrangOptions">
            {[...benhList]
              .sort((a, b) =>
                a.ten.localeCompare(b.ten, "vi", { sensitivity: "base" })
              )
              .map((benh) => (
                <option key={benh.id} value={benh.ten} />
              ))}
          </datalist>
        </div>

        {/* IMEI */}
        <div className="w-25">
          <label className="form-label">IMEI</label>
          <div style={{ position: "relative" }}>
            <input
              ref={imeiInputRef}
              type="text"
              name="imei"
              className="form-control"
              value={form.imei || ""}
              onChange={handleChange}
              onFocus={() => setShowKeyboard(true)}
            />
          </div>
        </div>

        {showKeyboard && (
          <div
            ref={keyboardRef}
            style={{
              position: "absolute",
              top: "14%",
              left: "44%",
              zIndex: 10,
            }}
          >
            <VirtualKeyboard onKeyPress={handleVirtualKeyPress} />
          </div>
        )}
      </div>

      <div className="mb-2 d-flex gap-2">
        {/* Thành tiền */}
        <div className="w-50">
          <label className="form-label">T.Tiền</label>
          <div style={{ position: "relative" }}>
            <input
              className="form-control pe-5"
              name="tien"
              type="text"
              list="ide2"
              onChange={handleChange}
              onBlur={(e) => {
                const soTien = parseCurrency(e.target.value);
                setForm((prev) => ({
                  ...prev,
                  tien: soTien,
                  tienText: formatCurrency(soTien),
                }));
              }}
              value={form.tienText || ""}
              autoComplete="off"
            />
            {form.tienText && (
              <button
                type="button"
                className="btn btn-sm btn-light position-absolute top-50 end-0 translate-middle-y me-2"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    tien: "",
                    tienText: "",
                  }))
                }
                style={{ zIndex: 2 }}
              >
                ❌
              </button>
            )}
          </div>

          <datalist id="ide2">
            {[...Array(25).keys()].map((i) => (
              <option
                key={i}
                value={`${((i + 1) * 50_000).toLocaleString("vi-VN")} ₫`}
              />
            ))}
          </datalist>
        </div>

        {/* Thanh toán */}
        <div className="col-3">
          <label className="form-label">T.Toán</label>
          <div style={{ position: "relative" }}>
            <input
              className="form-control pe-5"
              name="thanhtoan"
              list="toanOptions"
              onChange={handleChange}
              value={form.thanhtoan || ""} // mặc định "Nợ"
              autoComplete="off"
            />
            {form.thanhtoan && (
              <button
                type="button"
                className="btn btn-sm btn-light position-absolute top-50 end-0 translate-middle-y me-2"
                onClick={() =>
                  handleChange({ target: { name: "thanhtoan", value: "" } })
                }
                style={{ zIndex: 2 }}
              >
                ❌
              </button>
            )}
            <datalist id="toanOptions">
              {dropToan.map((item, index) => (
                <option key={index} value={item} />
              ))}
            </datalist>
          </div>
        </div>

        {/* SMS */}
        <div className="col-3">
          <label className="form-label">SMS</label>
          <div style={{ position: "relative" }}>
            <input
              className="form-control pe-5"
              name="sms"
              list="smsOptions"
              onChange={handleChange}
              value={form.sms || ""} // mặc định "Yes"
              autoComplete="off"
            />
            {form.sms && (
              <button
                type="button"
                className="btn btn-sm btn-light position-absolute top-50 end-0 translate-middle-y me-2"
                onClick={() =>
                  handleChange({ target: { name: "sms", value: "" } })
                }
                style={{ zIndex: 2 }}
              >
                ❌
              </button>
            )}
            <datalist id="smsOptions">
              <option value="Yes" />
              <option value="No" />
              <option value="TT" />
              <option value="Done" />
            </datalist>
          </div>
        </div>
      </div>

      <div className="mb-3 d-flex gap-2">
        {/* Phone */}
        <div className="w-50">
          <label className="form-label">Phone</label>
          <input
            className="form-control"
            type="text"
            name="phone"
            onChange={handleChange}
            value={form.phone || ""}
          />
        </div>

        {/* Thời gian */}
        <div className="w-50 position-relative">
          <label className="form-label">Thời Gian</label>
          <input
            className="form-control pe-5"
            style={{ maxWidth: "220px" }}
            type="datetime-local"
            required
            name="thoigian"
            onChange={(e) => {
              const formatted = toDisplayFormat(e.target.value);
              handleChange({ target: { name: "thoigian", value: formatted } });
              setAutoUpdate(false); // dừng auto-update khi chọn tay
            }}
            value={toInputFormat(form.thoigian)}
          />

          {/* Icon đồng hồ */}
          <span
            className="position-absolute"
            style={{
              top: "70%",
              right: "25px",
              transform: "translateY(-50%)",
              cursor: "pointer",
              fontSize: "1.05rem",
              color: "#6c757d",
            }}
            title="Lấy thời gian hiện tại"
            onClick={() => {
              setForm((prev) => ({ ...prev, thoigian: getNowFormatted() }));
              setAutoUpdate(true); // bật lại auto-update
            }}
          >
            ⏱
          </span>
        </div>
      </div>

      <div className="d-grid gap-2">
        <button
          className="btn btn-success"
          onClick={() => {
            if (!form.thoigian || form.thoigian.trim() === "") {
              alert("⏰ Vui lòng nhập Thời Gian!");
              return;
            }
            if (
              form.tien === undefined ||
              form.tien === null ||
              form.tien === ""
            ) {
              alert("💰 Vui lòng nhập số tiền!");
              return;
            }
            if (Number(form.tien) < 0) {
              alert("💰 Số tiền không được âm!");
              return;
            }

            handleAddData();
          }}
        >
          {form.id ? "💾 Cập nhật" : "➕ Thêm"}
        </button>

        <button
          className="btn btn-outline-secondary"
          onClick={() =>
            setForm({ sms: "Yes", thanhtoan: "Nợ", thoigian: getNowFormatted() })
          }
        >
          🧹 Xóa Form
        </button>
      </div>
    </div>
  );
};

export default FormNhapLieu;
