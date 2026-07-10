import React, { useState, useEffect } from "react";

function WalletModal({
    show,
    onClose,
    onSave,
    customer
}) {

    const [money, setMoney] = useState("");

    const [note, setNote] = useState("Nạp tiền");
    const formatCurrency = (value) => {
        if (!value) return "";

        const number = value.toString().replace(/\D/g, "");

        return Number(number).toLocaleString("vi-VN");
    };
    useEffect(() => {

        if (show) {

            setMoney("");

            setNote("Nạp tiền");

        }

    }, [show]);

    if (!show) return null;

    return (

        <div
            className="modal fade show"
            style={{
                display: "block",
                background: "rgba(0,0,0,.5)"
            }}
        >

            <div className="modal-dialog modal-dialog-centered">

                <div className="modal-content">

                    <div className="modal-header bg-success text-white">

                        <h5>

                            💰 Nạp tiền

                        </h5>

                        <button
                            className="btn-close btn-close-white"
                            onClick={onClose}
                        />

                    </div>

                    <div className="modal-body">

                        <div className="mb-3">

                            <label>

                                Khách hàng

                            </label>

                            <input

                                className="form-control"

                                value={customer?.name || ""}

                                disabled

                            />

                        </div>

                        <div className="mb-3">

                            <label>

                                Số tiền

                            </label>

                            <div className="position-relative">
    <input
        type="text"
        className="form-control pe-5 text-end"
        value={formatCurrency(money)}
        onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            setMoney(raw);
        }}
    />

    <span
        className="position-absolute top-50 translate-middle-y"
        style={{
            right: "12px",
            color: "#198754",
            fontWeight: 600,
            pointerEvents: "none"
        }}
    >
        ₫
    </span>
</div>

                        </div>

                        <div className="mb-3">

                            <label>

                                Ghi chú

                            </label>

                            <input

                                className="form-control"

                                value={note}

                                onChange={(e) => setNote(e.target.value)}

                            />

                        </div>

                    </div>

                    <div className="modal-footer">

                        <button

                            className="btn btn-secondary"

                            onClick={onClose}

                        >

                            Huỷ

                        </button>

                        <button

                            className="btn btn-success"

                            onClick={() => {

                                onSave(

                                    Number(money),

                                    note

                                );

                            }}

                        >

                            Xác nhận

                        </button>

                    </div>

                </div>

            </div>

        </div>

    );

}

export default WalletModal;