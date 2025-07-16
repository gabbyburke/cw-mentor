import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration for cw-mentor-demo
// You can get the full config from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: "your-api-key", // Get from Firebase Console
  authDomain: "cw-mentor-demo-320c4.firebaseapp.com",
  projectId: "cw-mentor-demo-320c4",
  storageBucket: "cw-mentor-demo-320c4.firebasestorage.app",
  messagingSenderId: "your-sender-id", // Get from Firebase Console
  appId: "your-app-id", // Get from Firebase Console
  measurementId: "your-measurement-id" // Get from Firebase Console
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
