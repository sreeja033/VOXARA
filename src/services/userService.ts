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

// Helper to recursively remove undefined values from an object
const stripUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc: any, [key, value]) => {
      if (value !== undefined) {
        acc[key] = stripUndefined(value);
      }
      return acc;
    }, {});
  }
  return obj;
};

export const saveUserData = async (uid: string, data: Partial<User>) => {
  const userRef = doc(db, "users", uid);
  const cleanData = stripUndefined(data);
  await setDoc(userRef, cleanData, { merge: true });
};

export const subscribeToUserData = (uid: string, callback: (data: User) => void) => {
  return onSnapshot(doc(db, "users", uid), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as User);
    }
  });
};
