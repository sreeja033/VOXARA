import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxlPLltuo6ivJizXo8m6_ah0se2W7BybQ",
  authDomain: "voxara-e07ec.firebaseapp.com",
  projectId: "voxara-e07ec",
  storageBucket: "voxara-e07ec.firebasestorage.app",
  messagingSenderId: "788073327882",
  appId: "1:788073327882:web:dddf1b9d3ed749010b1ef3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
