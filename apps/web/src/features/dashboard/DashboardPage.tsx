import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";
import { useEnvironment } from "../../hooks/useEnvironment";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { useRealtime } from "../../hooks/useRealtime";
import { Activity, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

export function DashboardPage() {
  const { currentEnvironment } = useEnvironment();
  useRealtime(currentEnvironment?.id);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics", currentEnvironment?.id],
    queryFn: async () => {
      // In a real app we'd pass timeframe parameters, e.g. last 24 hours
      const res = await apiFetch(`/api/v1/environments/${currentEnvironment?.id}/analytics?period=24h`);
      return res;
    },
    enabled: !!currentEnvironment,
  });

  if (isLoading) return <div>Loading dashboard...</div>;

  const stats = analytics || {
    totalEvents: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    inFlightDeliveries: 0
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Overview</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events Ingested</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground mt-1">last 24 hours</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Deliveries</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successfulDeliveries}</div>
            <p className="text-xs text-muted-foreground mt-1">last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Deliveries</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failedDeliveries}</div>
            <p className="text-xs text-muted-foreground mt-1">last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Flight</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inFlightDeliveries}</div>
            <p className="text-xs text-muted-foreground mt-1">currently queued or retrying</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground text-sm">
            Interactive chart rendering requires Recharts (Phase 2).
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
