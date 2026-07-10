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
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrGFgsjC2dRMVB4StwAC5xPdmi71wOBFc",
  authDomain: "hoangbhtn.firebaseapp.com",
  databaseURL: "https://hoangbhtn-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hoangbhtn",
  storageBucket: "hoangbhtn.firebasestorage.app",
  messagingSenderId: "19332775533",
  appId: "1:19332775533:web:bba03dc2753d2355c28964"
};



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
