import React, { useState, useEffect } from "react";
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const DanhSachDropdown = ({ khachHangList, setKhachHangList, benhList, setBenhList }) => {
    const [newKhach, setNewKhach] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newPass, setNewPass] = useState("");
    const [newBenh, setNewBenh] = useState("");

    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editPass, setEditPass] = useState("");

    // 👉 Lắng nghe real-time collection KHÁCH HÀNG
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "dropkh"), (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setKhachHangList(list);
        });
        return () => unsub();
    }, [setKhachHangList]);

    // 👉 Lắng nghe real-time collection LỖI
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "dropb"), (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setBenhList(list);
        });
        return () => unsub();
    }, [setBenhList]);

    const handleAddKhach = async () => {
        const name = newKhach.trim();
        const phone = newPhone.trim();
        const pass = newPass.trim();
        if (!name || !phone || !pass) {
            alert("Vui lòng nhập đủ tên, số điện thoại và mật khẩu.");
            return;
        }
        try {
            await addDoc(collection(db, "dropkh"), { name, phone, pass });
            setNewKhach("");
            setNewPhone("");
            setNewPass("");
        } catch (err) {
            console.error("Lỗi khi thêm khách hàng:", err);
        }
    };

    const handleAddBenh = async () => {
        const ten = newBenh.trim();
        if (!ten) {
            alert("Vui lòng nhập nội dung lỗi/tình trạng.");
            return;
        }
        try {
            await addDoc(collection(db, "dropb"), { ten });
            setNewBenh("");
        } catch (err) {
            console.error("Lỗi khi thêm lỗi:", err);
        }
    };

    const handleDeleteKhach = async (id) => {
        try {
            await deleteDoc(doc(db, "dropkh", id));
        } catch (err) {
            console.error("Lỗi khi xoá khách hàng:", err);
        }
    };

    const handleDeleteBenh = async (id) => {
        try {
            await deleteDoc(doc(db, "dropb", id));
        } catch (err) {
            console.error("Lỗi khi xoá lỗi:", err);
        }
    };

    const handleEditKhach = (khach) => {
        setEditingId(khach.id);
        setEditName(khach.name || "");
        setEditPhone(khach.phone || "");
        setEditPass(khach.pass || "");
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        const name = editName.trim();
        const phone = editPhone.trim();
        const pass = editPass.trim();
        if (!name || !phone || !pass) {
            alert("Vui lòng nhập đủ tên, số điện thoại và mật khẩu trước khi lưu.");
            return;
        }
        try {
            const khachDoc = doc(db, "dropkh", editingId);
            await updateDoc(khachDoc, { name, phone, pass });
            setEditingId(null);
        } catch (err) {
            console.error("Lỗi khi cập nhật khách hàng:", err);
        }
    };

    // 👉 Return giữ nguyên như bạn gửi
    return (
        <div className="card mt-3 shadow-sm">

            {/* KHÁCH HÀNG */}
            <div className="mb-3 p-3">
                <h6>👤 Khách Hàng</h6>

                {/* Tên khách hàng trên đầu */}
                <div className="mb-2">
                    <input
                        className="form-control"
                        placeholder="Tên khách hàng"
                        value={newKhach}
                        onChange={(e) => setNewKhach(e.target.value)}
                    />
                </div>

                {/* Hàng ngang: Số điện thoại + Mật khẩu + nút Thêm */}
                <div className="d-flex gap-2 mb-3">
                    <input
                        className="form-control"
                        placeholder="Số điện thoại"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        style={{ flex: "1 1 50%" }}
                    />
                    <input
                        className="form-control"
                        placeholder="Mật khẩu"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        style={{ flex: "1 1 40%" }}
                    />
                    <button className="btn btn-success" onClick={handleAddKhach}>Thêm</button>
                </div>

                <ul className="list-group">
                    {khachHangList.map((khach) => (
                        <li key={khach.id} className="list-group-item">
                            {editingId === khach.id ? (
                                <>
                                    {/* Khi đang sửa: tên trên đầu */}
                                    <div className="mb-2">
                                        <input
                                            className="form-control"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="Tên khách hàng"
                                        />
                                    </div>
                                    {/* Hàng ngang khi sửa: phone + pass + Lưu/Hủy */}
                                    <div className="d-flex gap-2 mb-2">
                                        <input
                                            className="form-control"
                                            value={editPhone}
                                            onChange={(e) => setEditPhone(e.target.value)}
                                            placeholder="Số điện thoại"
                                            style={{ flex: "1 1 50%" }}
                                        />
                                        <input
                                            className="form-control"
                                            value={editPass}
                                            onChange={(e) => setEditPass(e.target.value)}
                                            placeholder="Mật khẩu"
                                            style={{ flex: "1 1 40%" }}
                                        />
                                        <button className="btn btn-primary" onClick={handleSaveEdit}>Lưu</button>
                                        <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Hủy</button>
                                    </div>
                                </>
                            ) : (
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <strong>{khach.name}</strong>
                                        <div className="small text-muted">
                                            ({khach.phone}) — Pass: <span>{khach.pass}</span>
                                        </div>
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-sm btn-warning" onClick={() => handleEditKhach(khach)}>Sửa</button>
                                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteKhach(khach.id)}>Xóa</button>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {/* LỖI / TÌNH TRẠNG */}
            <div className="p-3">
                <h6>⚠️ Lỗi / Tình trạng</h6>

                {/* Ô nhập + nút thêm */}
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
