// frontend/src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCZjgW9LNbh1lUFbBNF2w_-6DC4MERKVFM",
  authDomain: "student-predictor-app.firebaseapp.com",
  projectId: "student-predictor-app",
  storageBucket: "student-predictor-app.firebasestorage.app",
  messagingSenderId: "810328675754",
  appId: "1:810328675754:web:2f06c74a6baf45062447d3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication and export it so App.jsx can use it
export const auth = getAuth(app);