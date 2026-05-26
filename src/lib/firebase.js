import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA9eAHiK9gY16YsD3Vwl1Yxk_cbN5_8XDU",
  authDomain: "workmate-5879d.firebaseapp.com",
  databaseURL: "https://workmate-5879d-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "workmate-5879d",
  storageBucket: "workmate-5879d.appspot.com",
  messagingSenderId: "293083876937",
  appId: "1:293083876937:web:408765d71e0138ce857998",
};

const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

export default app;