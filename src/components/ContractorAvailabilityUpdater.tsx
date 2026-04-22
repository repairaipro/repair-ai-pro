"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { doc, setDoc } from "firebase/firestore";

export default function ContractorAvailabilityUpdater() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const markOnline = async () => {
      try {
        await setDoc(
          doc(db, "users", user.uid),
          {
            availability: "available",
            lastSeenAt: new Date(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error(err);
      }
    };

    markOnline();

    const onVisibilityChange = async () => {
      try {
        await setDoc(
          doc(db, "users", user.uid),
          {
            availability: document.hidden ? "busy" : "available",
            lastSeenAt: new Date(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error(err);
      }
    };

    window.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user]);

  return null;
}