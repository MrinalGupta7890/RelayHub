import React, { createContext, useContext, useState, useEffect } from "react";
import { setAccessToken, apiFetch } from "../../lib/api";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen for forced logouts from the API client (e.g. refresh failed)
    const handleLogoutEvent = () => {
      setUser(null);
      setAccessToken(null);
    };

    window.addEventListener("auth:logout", handleLogoutEvent);

    // Initial check: Try to refresh on load to see if we have an active session
    const checkSession = async () => {
      try {
        const data = await apiFetch("/api/v1/auth/refresh", { method: "POST" });
        if (data.accessToken) {
          setAccessToken(data.accessToken);
          // In a real app we might fetch /me here to get user details, 
          // or have the backend return user info on refresh.
          // For MVP, we just assume logged in if we get a token.
          setUser({ id: "unknown", email: "user@relayhub.io", name: "User" });
        }
      } catch (err) {
        // Not logged in
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    return () => window.removeEventListener("auth:logout", handleLogoutEvent);
  }, []);

  const login = (accessToken: string, loggedInUser: User) => {
    setAccessToken(accessToken);
    setUser(loggedInUser);
  };

  const logout = async () => {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout failed", err);
    }
    setUser(null);
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
