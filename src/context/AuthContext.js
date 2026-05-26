"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "firebase/auth";

import { ref, set, get } from "firebase/database";

import { auth, database } from "../lib/firebase";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const userRef = ref(
              database,
              `users/${firebaseUser.uid}`
            );

            const snapshot = await get(userRef);

            let profile = {};

            if (snapshot.exists()) {
              profile = snapshot.val();
            }

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              companyName:
                profile.companyName || "My Workshop",
              name:
                profile.name ||
                firebaseUser.email.split("@")[0],
              ...profile,
            });
          } catch (error) {
            console.error(
              "Error fetching user profile",
              error
            );

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              companyName: "My Workshop",
              name:
                firebaseUser.email.split("@")[0],
            });
          }
        } else {
          setUser(null);
        }

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    return userCredential.user;
  };

  const signup = async (
    email,
    password,
    companyName
  ) => {
    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const firebaseUser = userCredential.user;

    await set(
      ref(database, `users/${firebaseUser.uid}`),
      {
        name: email.split("@")[0],
        email: email,
        companyName: companyName,
        createdAt: new Date().toISOString(),
      }
    );

    return firebaseUser;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const forgotPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        forgotPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};