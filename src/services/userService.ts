import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { User } from "../types";

export const getUserData = async (uid: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    return userDoc.data() as User;
  }
  return null;
};

export const saveUserData = async (uid: string, data: Partial<User>) => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, data, { merge: true });
};

export const subscribeToUserData = (uid: string, callback: (data: User) => void) => {
  return onSnapshot(doc(db, "users", uid), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as User);
    }
  });
};
