import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import { useEnvironment } from "../../hooks/useEnvironment";
import { useRealtime } from "../../hooks/useRealtime";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export function EventsPage() {
  const { currentEnvironment } = useEnvironment();
  useRealtime(currentEnvironment?.id); // Subscribe to websocket updates

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", currentEnvironment?.id],
    queryFn: async () => {
      // In a real app this would have pagination
      const res = await apiFetch(`/api/v1/environments/${currentEnvironment?.id}/events?limit=50`);
      return res.data;
    },
    enabled: !!currentEnvironment,
  });

  if (isLoading) return <div>Loading events...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Events Explorer</h2>
        <Button onClick={async () => {
          // Trigger a simulated event
          await apiFetch(`/api/v1/environments/${currentEnvironment?.id}/simulate`, {
            method: "POST",
            body: JSON.stringify({
              eventType: "user.created",
              payload: { user_id: 123, email: "test@example.com" }
            })
          });
        }}>
          Simulate Event
        </Button>
      </div>

      <Card>
        <div className="divide-y divide-border">
          {events.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No events found. Send an event or simulate one to get started.
            </div>
          )}
          {events.map((e: any) => (
            <div key={e.id} className="p-4 flex items-center justify-between hover:bg-accent/20 transition-colors">
              <div>
                <div className="font-medium text-sm flex items-center gap-2">
                  <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs">{e.eventType}</span>
                  <span>{e.id}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(e.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs px-2 py-1 rounded ${
                  e.status === 'completed' ? 'bg-green-500/10 text-green-500' : 
                  e.status === 'failed' ? 'bg-destructive/10 text-destructive' :
                  'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {e.status}
                </span>
                <Link to={`/events/${e.id}`}>
                  <Button variant="outline" size="sm">Inspect</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
