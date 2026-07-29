// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAxMAYQAb_kmhv_GyO7QkxDK21k9qzBLPo",
  authDomain: "sidequest-b73eb.firebaseapp.com",
  projectId: "sidequest-b73eb",
  storageBucket: "sidequest-b73eb.firebasestorage.app",
  messagingSenderId: "782270745789",
  appId: "1:782270745789:web:6cb98e86ec1e91d84ebbd4",
  measurementId: "G-8DDMQ2TJ8R"
};

// Initialize Firebase
export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);