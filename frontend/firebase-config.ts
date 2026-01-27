/*
Copyright 2026 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgYWlrkSDLaUBtxYXDIQT-T8qzScFIluk",
  authDomain: "wz-case-worker-mentor.firebaseapp.com",
  projectId: "wz-case-worker-mentor",
  storageBucket: "wz-case-worker-mentor.firebasestorage.app",
  messagingSenderId: "338448352008",
  appId: "1:338448352008:web:55fbfffee4810cd105e2bd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export default app;
