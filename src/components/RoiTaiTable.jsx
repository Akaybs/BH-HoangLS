import React, { useState, useEffect } from "react";
import formatDisplayTime from "../utils/formatDisplayTime";
import "bootstrap/dist/css/bootstrap.min.css";

function ConfirmModal({ show, title, message, onClose, onConfirm }) {
  if (!show) return null;

  return (
    <div
      className="modal fade show"
      style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">{title || "Xác nhận"}</h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            <p className="mb-0">{message || "Bạn có chắc chắn muốn xóa?"}</p>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button className="btn btn-danger" onClick={onConfirm}>
              Xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const TableHeader = ({ filterText, setFilterText }) => (
  <div className="row mb-3 align-items-center gx-2">
    <div className="col-md-3 col-sm-12 position-relative">
      <input
        type="text"
        className="form-control pe-5 fs-6"
        placeholder="Tìm kiếm theo ID, Tên, IMEI, Lỗi..."
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

  const [detailRow, setDetailRow] = useState(null); // 👉 modal chi tiết

  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce filter
  const [debouncedFilter, setDebouncedFilter] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilter(filterText);
    }, 300);
    return () => clearTimeout(handler);
  }, [filterText]);

  const onAskDelete = (id) => {
    setDeleteId(id);
    setShowModal(true);
  };

  const handleConfirmDelete = () => {
    if (deleteId !== null) onDelete(deleteId);
    setShowModal(false);
    setDeleteId(null);
  };

  const filteredItems = data
    .filter((item) => {
      const search = debouncedFilter.toLowerCase();
      const thoigian = item.thoigian?.toLowerCase() || "";
      const ngayThang = thoigian.split(" ")[0];
      const gioPhut = thoigian.split(" ")[1] || "";

      return (
        item.id?.toString().includes(search) ||
        item.name?.toLowerCase().includes(search) ||
        item.iphone?.toLowerCase().includes(search) ||
        item.imei?.toLowerCase().includes(search) ||
        item.loi?.toLowerCase().includes(search) ||
        item.thanhtoan?.toLowerCase().includes(search) ||
        thoigian.includes(search) ||
        ngayThang.includes(search) ||
        gioPhut.includes(search)
      );
    })
    .sort((a, b) => b.id - a.id);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  return (
    <div className="container-fluid">
      <TableHeader filterText={filterText} setFilterText={setFilterText} />

      <div className="table-responsive">
        <table className="table table-bordered table-hover align-middle">
          <thead className="table-dark text-center">
            <tr>
              <th>ID</th>
              <th>Khách Hàng</th>
              <th>Tên Máy</th>
              <th className="d-none d-sm-table-cell">Tình Trạng</th>
              <th className="d-none d-md-table-cell">IMEI</th>
              <th>T.T</th>
              <th className="d-none d-md-table-cell">Số Tiền</th>
              <th className="d-none d-lg-table-cell">Ngày</th>
              <th className="d-none d-lg-table-cell">SMS</th>
              <th>S-X</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((row) => (
              <tr
                key={row.id}
                onClick={() => setDetailRow(row)}
                style={{ cursor: "pointer" }}
              >
                <td className="text-center">{row.id}</td>
                <td>{row.name}</td>
                <td>{row.iphone}</td>
                <td className="d-none d-sm-table-cell">{row.loi}</td>
                <td className="d-none d-md-table-cell">{row.imei}</td>
                <td
                  className={
                    (row.thanhtoan === "Ok"
                      ? "text-success"
                      : row.thanhtoan === "Nợ"
                      ? "text-danger"
                      : row.thanhtoan === "Back"
                      ? "text-back"
                      : row.thanhtoan === "TT"
                      ? "text-tratien"
                      : "") + " text-center"
                  }
                >
                  {row.thanhtoan}
                </td>
                <td className="d-none d-md-table-cell text-end">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(row.tien)}
                </td>
                <td className="d-none d-lg-table-cell text-center">
                  {row.thoigian}
                </td>
                <td className="d-none d-lg-table-cell text-center">
                  {row.sms}
                </td>
                <td className="text-center">
                  <button
                    className="btn btn-warning btn-sm me-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(row);
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAskDelete(row.id);
                    }}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* pagination */}
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
              <option key={n} value={n}>
                {n} hàng
              </option>
            ))}
          </select>
          <span>
            Hiển thị {indexOfFirstItem + 1} -{" "}
            {Math.min(indexOfLastItem, filteredItems.length)} trong tổng{" "}
            {filteredItems.length} mục
          </span>

          <nav>
            <ul className="pagination mb-0">
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

                if (endPage - startPage < 4) {
                  startPage = Math.max(1, endPage - 4);
                }

                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <li
                      key={i}
                      className={`page-item ${
                        currentPage === i ? "active" : ""
                      }`}
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

              <li
                className={`page-item ${
                  currentPage === totalPages ? "disabled" : ""
                }`}
              >
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

      {/* Modal Xác nhận xóa */}
      <ConfirmModal
        show={showModal}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa mục này không?"
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* Modal Chi tiết */}
      {detailRow && (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">📋 Chi tiết bảo hành</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDetailRow(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p><b>ID:</b> {detailRow.id}</p>
                <p><b>Khách hàng:</b> {detailRow.name}</p>
                <p><b>Tên máy:</b> {detailRow.iphone}</p>
                <p><b>Tình trạng:</b> {detailRow.loi}</p>
                <p><b>IMEI:</b> {detailRow.imei}</p>
                <p><b>Thanh toán:</b> {detailRow.thanhtoan}</p>
                <p>
                  <b>Số tiền:</b>{" "}
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(detailRow.tien)}
                </p>
                <p><b>Ngày:</b> {detailRow.thoigian}</p>
                <p><b>SMS:</b> {detailRow.sms}</p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setDetailRow(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoiTaiTable;
