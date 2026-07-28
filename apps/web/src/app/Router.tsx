import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { Layout, RequireAuth } from "./Layout";
import { useAuth } from "../features/auth/AuthContext";

// A temporary placeholder for the dashboard home
function DashboardHome() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
      <p className="text-muted-foreground">Welcome to your RelayHub workspace.</p>
    </div>
  );
}

// Redirects to dashboard if already logged in
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <PublicOnlyRoute>
        <RegisterPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <DashboardHome />,
      }
      // Future routes (Events, Destinations, etc.) will go here
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
