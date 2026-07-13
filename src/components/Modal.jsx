import React from "react";

export default function Modal({ show, title, message, onClose, onConfirm }) {
  if (!show) return null;

  return (
    <div
      className="modal fade show"
      style={{
        display: "block",
        position: "fixed",
        inset: 0,
        zIndex: 1045,
        overflowY: "auto",
        padding: "1rem",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.32)",
          opacity: 1,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          zIndex: 1040,
        }}
      />
      <div className="modal-dialog modal-dialog-centered" style={{ position: "relative", zIndex: 1050 }}>
        <div className="modal-content shadow-lg">
          {/* Header */}
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">{title || "Thông báo"}</h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body">
            <p className="mb-0">{message || "Bạn có chắc chắn muốn tiếp tục?"}</p>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            {onConfirm && (
              <button className="btn btn-danger" onClick={onConfirm}>
                Đồng ý
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
