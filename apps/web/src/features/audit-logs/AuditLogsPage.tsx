import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";
import { useEnvironment } from "../../hooks/useEnvironment";
import { Card } from "../../components/ui/Card";

export function AuditLogsPage() {
  const { currentEnvironment } = useEnvironment();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", currentEnvironment?.id],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/environments/${currentEnvironment?.id}/audit-logs`);
      return res.data;
    },
    enabled: !!currentEnvironment,
  });

  if (isLoading) return <div>Loading logs...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
      
      <Card>
        <div className="divide-y divide-border">
          {logs.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No audit logs recorded yet.
            </div>
          )}
          {logs.map((log: any) => (
            <div key={log.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">{log.action}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Target: {log.targetType} ({log.targetId})
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Actor: {log.actorId}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
