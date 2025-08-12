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
const firebaseConfig = { 
  apiKey : "AIzaSyD-f2CMpJkrXrjttgoPAouLPQon4jd5PWE" , 
  authDomain : "hoanglsls.firebaseapp.com" , 
  databaseURL : "https://hoanglsls-default-rtdb.asia-southeast1.firebasedatabase.app" , 
  projectId : "hoanglsls" , 
  storageBucket : "hoanglsls.firebasestorage.app" , 
  messagingSenderId : "372270820186" , 
  appId : "1:372270820186:web:a38eb86172e63d0266e163" , 
  measurementId : "G-47DYM0JKT7" 
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
