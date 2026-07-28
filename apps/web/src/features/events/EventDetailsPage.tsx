import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import { useEnvironment } from "../../hooks/useEnvironment";
import { useRealtime } from "../../hooks/useRealtime";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { currentEnvironment } = useEnvironment();
  useRealtime(currentEnvironment?.id);

  // Fetch Event details
  // Note: the backend doesn't have a GET /events/:id endpoint currently, 
  // so we might just filter the list for now, or assume the backend has it.
  // Actually, Phase 9 implemented an event viewer.
  // Let's assume GET /environments/:envId/events/:id exists. Wait, did we create it?
  // We can fetch the list and find it.
  const { data: events = [] } = useQuery({
    queryKey: ["events", currentEnvironment?.id],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/environments/${currentEnvironment?.id}/events?limit=100`);
      return res.data;
    },
    enabled: !!currentEnvironment,
  });

  const event = events.find((e: any) => e.id === id);

  if (!event) return <div>Loading or not found...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/events">
          <Button variant="outline" size="sm">&larr; Back</Button>
        </Link>
        <h2 className="text-xl font-bold tracking-tight">Event: {event.id}</h2>
        <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs">{event.eventType}</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Attempts</CardTitle>
          </CardHeader>
          <CardContent>
             {/* In a real app we'd fetch the delivery attempts from the DB for this event */}
            <div className="text-sm text-muted-foreground">
              Event Status: <span className="font-bold text-foreground">{event.status}</span>
            </div>
            {/* Mocked for now since GET /events/:id/attempts isn't exposed yet */}
            <div className="mt-4 p-4 border border-border rounded">
              <p className="text-xs text-muted-foreground">Detailed attempt history view will be integrated in Phase 20 (Observability APIs).</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
