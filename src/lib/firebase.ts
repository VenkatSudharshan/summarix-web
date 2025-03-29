import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDdZ7KBCuS_0sW71Eo4ZoQa1AlAF0uk4CA",
  authDomain: "test-58b15.firebaseapp.com",
  projectId: "test-58b15",
  storageBucket: "test-58b15.firebasestorage.app",
  messagingSenderId: "151700431458",
  appId: "1:151700431458:web:1aedb8b474cb87ace5273b",
  measurementId: "G-N45M2YHB57"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);