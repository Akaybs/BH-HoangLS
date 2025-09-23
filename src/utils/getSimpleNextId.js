import { collection, getDocs } from "firebase/firestore";

export async function getSimpleNextId(db) {
  const snapshot = await getDocs(collection(db, "roitai"));

  if (snapshot.empty) {
    return 1; // chưa có sản phẩm nào
  }

  // Lấy tất cả ID dạng số
  const ids = snapshot.docs
    .map(doc => parseInt(doc.id, 10))
    .filter(num => !isNaN(num));

  const maxId = Math.max(...ids, 0);
  return maxId + 1;
}
