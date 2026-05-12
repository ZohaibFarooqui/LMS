"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { User } from "@/models/auth";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  activeCompany: string;
  activeBranch: string;
  setActiveCompany: (code: string) => void;
  setActiveBranch: (code: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isLoading: true,
  activeCompany: "",
  activeBranch: "",
  setActiveCompany: () => {},
  setActiveBranch: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCompany, setActiveCompanyState] = useState<string>("");
  const [activeBranch, setActiveBranchState] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("lms_user");
    if (stored) {
      try {
        const u: User = JSON.parse(stored);
        setUser(u);
        const savedCo = localStorage.getItem("lms_active_company");
        const savedBr = localStorage.getItem("lms_active_branch");
        setActiveCompanyState(savedCo ?? u.company_list?.[0]?.code ?? "");
        setActiveBranchState(savedBr ?? u.branch_list?.[0]?.code ?? "");
      } catch {
        localStorage.removeItem("lms_user");
      }
    }
    setIsLoading(false);
  }, []);

  const setActiveCompany = useCallback((code: string) => {
    setActiveCompanyState(code);
    localStorage.setItem("lms_active_company", code);
  }, []);

  const setActiveBranch = useCallback((code: string) => {
    setActiveBranchState(code);
    localStorage.setItem("lms_active_branch", code);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, isLoading, activeCompany, activeBranch, setActiveCompany, setActiveBranch }),
    [user, isLoading, activeCompany, activeBranch, setActiveCompany, setActiveBranch]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
