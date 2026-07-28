import { Outlet, Navigate, Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { LogOut, LayoutDashboard, Send, Activity, ShieldAlert, Settings } from "lucide-react";
import { Button } from "../components/ui/Button";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-border">
          <span className="font-bold text-lg tracking-tight">RelayHub</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link to="/" className="flex items-center space-x-2 px-3 py-2 rounded-md bg-accent text-accent-foreground">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>
          <Link to="/events" className="flex items-center space-x-2 px-3 py-2 rounded-md text-muted-foreground hover:bg-accent/50 hover:text-foreground">
            <Activity size={18} />
            <span>Events</span>
          </Link>
          <Link to="/destinations" className="flex items-center space-x-2 px-3 py-2 rounded-md text-muted-foreground hover:bg-accent/50 hover:text-foreground">
            <Send size={18} />
            <span>Destinations</span>
          </Link>
          <Link to="/audit-logs" className="flex items-center space-x-2 px-3 py-2 rounded-md text-muted-foreground hover:bg-accent/50 hover:text-foreground">
            <ShieldAlert size={18} />
            <span>Audit Logs</span>
          </Link>
          <Link to="/settings" className="flex items-center space-x-2 px-3 py-2 rounded-md text-muted-foreground hover:bg-accent/50 hover:text-foreground">
            <Settings size={18} />
            <span>Settings</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="text-sm truncate">
              <p className="font-medium">{user?.name}</p>
              <p className="text-muted-foreground text-xs">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title="Log out">
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border flex items-center px-6">
          <h1 className="text-sm font-medium">Dashboard</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
