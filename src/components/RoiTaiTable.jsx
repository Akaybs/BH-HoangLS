import React, { useState } from "react";
import formatDisplayTime from "../utils/formatDisplayTime";
import "bootstrap/dist/css/bootstrap.min.css";

function ConfirmModal({ show, title, message, onClose, onConfirm }) {
  if (!show) return null;

  return (
    <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">{title || "Xác nhận"}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p className="mb-0">{message || "Bạn có chắc chắn muốn xóa?"}</p>
          </div>
         <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button className="btn btn-danger" onClick={onConfirm}>Xóa</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const TableHeader = ({ filterText, setFilterText, handleAddData, editId }) => (
  <div className="row mb-3 align-items-center gx-2">
    <div className="col-md-3 col-sm-12 position-relative">
      <input
        type="text"
        className="form-control pe-5 fs-6"
        placeholder="Tìm kiếm theo tên, IMEI, lỗi, thời gian..."
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        style={{ border: "2px solid #ccc", borderRadius: "8px" }}
      />
      {filterText && (
        <button
          type="button"
          onClick={() => setFilterText("")}
          className="btn btn-sm position-absolute end-0 top-50 translate-middle-y me-2 border-0 bg-transparent text-secondary"
          style={{ zIndex: 2 }}
          aria-label="Xóa tìm kiếm"
        >
          <i className="bi bi-x-circle-fill fs-3"></i>
        </button>
      )}
    </div>
     
    <div className="col-md-5 col-sm-3 mt-0">
      
    {/* Tiêu đề căn giữa */}
    <h4 className="text-center fw-bold text-danger my-3">
      📋 Danh Sách Bảo Hành
    </h4>
    </div>
    
  </div>
);

const RoiTaiTable = ({ data, onEdit, onDelete, editId, handleAddData }) => {
  const [filterText, setFilterText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const onAskDelete = (id) => {
    setDeleteId(id);
    setShowModal(true);
  };

  const handleConfirmDelete = () => {
    if (deleteId !== null) onDelete(deleteId);
    setShowModal(false);
    setDeleteId(null);
  };

  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredItems = data
  .filter((item) => {
    const thoigian = item.thoigian?.toLowerCase() || "";
    const ngayThang = thoigian.split(" ")[0]; // lấy phần "07/08/2025"
    const gioPhut = thoigian.split(" ")[1] || ""; // lấy phần "12:32"

    return (
      item.name?.toLowerCase().includes(filterText.toLowerCase()) ||
      item.iphone?.toLowerCase().includes(filterText.toLowerCase()) ||
      item.imei?.toLowerCase().includes(filterText.toLowerCase()) ||
      item.loi?.toLowerCase().includes(filterText.toLowerCase()) ||
      item.thanhtoan?.toLowerCase().includes(filterText.toLowerCase()) ||
      thoigian.includes(filterText.toLowerCase()) ||        // toàn chuỗi
      ngayThang.includes(filterText.toLowerCase()) ||       // chỉ ngày
      gioPhut.includes(filterText.toLowerCase())            // chỉ giờ
    );
  })
  .sort((a, b) => b.id - a.id);


  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);


  return (
    <div className="container-fluid">
      <TableHeader
        filterText={filterText}
        setFilterText={setFilterText}
        handleAddData={handleAddData}
        editId={editId}
      />

      <div className="table-responsive">
        <table className="table table-bordered table-hover align-middle">
          <thead className="table-dark text-center">
            <tr>
              <th>TT</th>
              <th>Khách Hàng</th>
              <th>Tên Máy</th>
              <th>Tình Trạng</th>
              <th>IMEI</th>
              <th>T.T</th>
              <th>Số Tiền</th>
              <th>Ngày</th>
              <th>SMS</th>
              <th>S-X</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((row) => (
              <tr key={row.id}>
                <td className="text-center">{row.id}</td>
                <td>{row.name}</td>
                <td>{row.iphone}</td>
                <td style={{ maxWidth: "250px", wordBreak: "break-word" }}>{row.loi}</td>
                <td>{row.imei}</td>
                <td className={
                  (row.thanhtoan === "Ok" ? "text-success" :
                    row.thanhtoan === "Nợ" ? "text-danger" :
                      row.thanhtoan === "Back" ? "text-back" :
                        row.thanhtoan === "TT" ? "text-tratien" : "") + " text-center" // căn giữa
                }>
                  {row.thanhtoan}
                </td>
                <td className="text-end">
                  {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(row.tien)}
                </td>
                <td className="text-center">{row.thoigian}</td>

                <td className="text-center">{row.sms}</td>
                <td className="text-center">
                  <button className="btn btn-warning btn-sm me-1" onClick={() => onEdit(row)}>✏️</button>
                  <button className="btn btn-danger btn-sm" onClick={() => onAskDelete(row.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="d-flex align-items-center gap-2">
          <select
            className="form-select form-select-sm w-auto"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            {[5, 10, 15, 20, 50].map((n) => (
              <option key={n} value={n}>{n} hàng</option>
            ))}
          </select>
          <span>
           Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredItems.length)} trong tổng {filteredItems.length} mục
          </span>
          
          <nav>
  <ul className="pagination mb-0">
    {/* Nút Previous */}
    <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
      <button
        className="page-link"
        onClick={() => setCurrentPage(currentPage - 1)}
      >
        &laquo;
      </button>
    </li>

    {(() => {
      const pages = [];
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, startPage + 4);

      // Điều chỉnh khi gần cuối danh sách
      if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(
          <li
            key={i}
            className={`page-item ${currentPage === i ? "active" : ""}`}
          >
            <button
              className="page-link"
              onClick={() => setCurrentPage(i)}
            >
              {i}
            </button>
          </li>
        );
      }
      return pages;
    })()}

    {/* Nút Next */}
    <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
      <button
        className="page-link"
        onClick={() => setCurrentPage(currentPage + 1)}
      >
        &raquo;
      </button>
    </li>
  </ul>
</nav>

        </div>
      </div>

      <ConfirmModal
        show={showModal}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa mục này không?"
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default RoiTaiTable;
