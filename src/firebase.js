// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';






// Cấu hình Firebase
// Your web app's Firebase configuration




// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Firestore
const db = getFirestore(app);

// Khởi tạo Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Export
export {
  db,
  auth,
  provider,
  signInWithPopup,
  signOut
};
