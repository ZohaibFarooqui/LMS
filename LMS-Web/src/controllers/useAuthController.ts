"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/services/authService";
import { useAuth } from "@/context/AuthContext";

export function useAuthController() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useAuth();
  const router = useRouter();

  async function handleLogin(username: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await login({ username, password });
      if (response.status === "SUCCESS") {
        const user = {
          card_no: response.card_no,
          emp_name: response.emp_name,
          face_registered: response.face_registered,
          hr_admin: response.hr_admin,
        };
        setUser(user);
        localStorage.setItem("lms_user", JSON.stringify(user));
        router.push("/dashboard");
      } else {
        setError("Invalid credentials. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setUser(null);
    localStorage.removeItem("lms_user");
    router.push("/");
  }

  return { handleLogin, handleLogout, loading, error };
}
