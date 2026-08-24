import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAGBOu6zVaGRimF21TBZQpThgOoyYqw5cU",
  authDomain: "farmerai-8cb32.firebaseapp.com",
  projectId: "farmerai-8cb32",
  storageBucket: "farmerai-8cb32.firebasestorage.app",
  messagingSenderId: "758743627088",
  appId: "1:758743627088:web:91959cedee0f8368506855",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;