import React, { useState } from "react";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

const DanhSachDropdown = ({ khachHangList, setKhachHangList, benhList, setBenhList }) => {
    const [newKhach, setNewKhach] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newBenh, setNewBenh] = useState("");

    const handleAddKhach = async () => {
        const name = newKhach.trim();
        const phone = newPhone.trim();

        if (!name || !phone) {
            alert("Vui lòng nhập đủ tên và số điện thoại khách hàng.");
            return;
        }

        try {
            const docRef = await addDoc(collection(db, "dropkh"), { name, phone });
            setKhachHangList([...khachHangList, { id: docRef.id, name, phone }]);
            setNewKhach("");
            setNewPhone("");
        } catch (err) {
            console.error("Lỗi khi thêm khách hàng:", err);
        }
    };

    const handleAddBenh = async () => {
        const ten = newBenh.trim();
        if (!ten) return;

        try {
            const docRef = await addDoc(collection(db, "dropb"), { ten });
            setBenhList([...benhList, { id: docRef.id, ten }]);
            setNewBenh("");
        } catch (err) {
            console.error("Lỗi khi thêm lỗi:", err);
        }
    };

    const handleDeleteKhach = async (id) => {
        try {
            await deleteDoc(doc(db, "dropkh", id));
            setKhachHangList(khachHangList.filter((k) => k.id !== id));
        } catch (err) {
            console.error("Lỗi khi xoá khách hàng:", err);
        }
    };

    const handleDeleteBenh = async (id) => {
        try {
            await deleteDoc(doc(db, "dropb", id));
            setBenhList(benhList.filter((b) => b.id !== id));
        } catch (err) {
            console.error("Lỗi khi xoá lỗi:", err);
        }
    };

    return (
        <div className="card mt-3 shadow-sm">
            


            <div className="mb-3">
                <h6>👤 Khách Hàng</h6>
                <div className="d-flex gap-2 mb-2 flex-wrap">
                    <input
                        className="form-control"
                        placeholder="Tên khách hàng"
                        value={newKhach}
                        onChange={(e) => setNewKhach(e.target.value)}
                        style={{ flex: "1 1 40%" }}
                    />
                    <input
                        className="form-control"
                        placeholder="Số điện thoại"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                      //  style={{ flex: "1 1 40%" }}
                    />
                    <button className="btn btn-success" onClick={handleAddKhach}>Thêm</button>
                </div>
                <ul className="list-group">
                    {khachHangList.map((khach) => (
                        <li key={khach.id} className="list-group-item d-flex justify-content-between align-items-center">
                            <span>{khach.name} <small className="text-muted">({khach.phone})</small></span>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteKhach(khach.id)}>Xóa</button>
                        </li>
                    ))}
                </ul>
            </div>

            <div>
                <h6>⚠️ Lỗi / Tình trạng</h6>
                <div className="d-flex gap-2 mb-2">
                    <input
                        className="form-control"
                        placeholder="Nhập lỗi mới..."
                        value={newBenh}
                        onChange={(e) => setNewBenh(e.target.value)}
                    />
                    <button className="btn btn-success" onClick={handleAddBenh}>Thêm</button>
                </div>
                <ul className="list-group">
                    {benhList.map((benh) => (
                        <li key={benh.id} className="list-group-item d-flex justify-content-between align-items-center">
                            {benh.ten}
                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteBenh(benh.id)}>Xóa</button>
                        </li>
                    ))}
                </ul>
            </div>

        </div>
    );
};

export default DanhSachDropdown;
