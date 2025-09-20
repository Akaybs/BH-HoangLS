// src/utils/roitaiCounter.js
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

/**
 * Trả về ID tiếp theo cho collection "roitai".
 * - Dùng getDoc + updateDoc (không cần transaction, vì chỉ 1 user).
 * - Vẫn luôn cập nhật meta/roitai_counter với lastId mới nhất.
 */
export async function getNextRoiTaiId(db) {
  const counterRef = doc(db, "meta", "roitai_counter");
  const snap = await getDoc(counterRef);

  if (!snap.exists()) {
    // lần đầu: khởi tạo lastId = 0
    await setDoc(counterRef, { lastId: 0 });
    return 0;
  }

  const lastId = Number(snap.data().lastId) || 0;
  const newId = lastId + 1;

  // cập nhật lại meta với ID mới
  await updateDoc(counterRef, { lastId: newId });
  return newId;
}
