import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import { useEnvironment } from "../../hooks/useEnvironment";
import { useRealtime } from "../../hooks/useRealtime";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  useRealtime(currentEnvironment?.id);

  const { data: events = [] } = useQuery({
    queryKey: ["events", currentEnvironment?.id],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/environments/${currentEnvironment?.id}/events?limit=100`);
      return res.data;
    },
    enabled: !!currentEnvironment,
  });

  const event = events.find((e: any) => e.id === id);

  const { data: attempts = [], isLoading: isLoadingAttempts } = useQuery({
    queryKey: ["eventAttempts", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/environments/${currentEnvironment?.id}/analytics/events/${id}/attempts`);
      return res;
    },
    enabled: !!currentEnvironment && !!id,
  });

  const retryMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/environments/${currentEnvironment?.id}/events/${id}/retry`, {
        method: "POST",
      }),
    onSuccess: () => {
      // Realtime will update the lists, but we can also invalidate locally
      queryClient.invalidateQueries({ queryKey: ["eventAttempts", id] });
    },
    onError: (error: any) => {
      alert(`Retry failed: ${error.data?.message || "Unknown error"}`);
    }
  });

  if (!event) return <div>Loading or not found...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/events">
            <Button variant="outline" size="sm">&larr; Back</Button>
          </Link>
          <h2 className="text-xl font-bold tracking-tight">Event: {event.id}</h2>
          <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs">{event.eventType}</span>
        </div>
        {event.status !== "completed" && (
          <Button onClick={() => retryMutation.mutate()} disabled={retryMutation.isPending}>
            {retryMutation.isPending ? "Retrying..." : "Retry Failed Deliveries"}
          </Button>
        )}
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
            <div className="text-sm text-muted-foreground mb-4">
              Event Status: <span className="font-bold text-foreground capitalize">{event.status}</span>
            </div>
            {isLoadingAttempts ? (
              <div className="text-sm">Loading attempts...</div>
            ) : attempts.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 border border-border border-dashed rounded text-center">
                No delivery attempts found. (It might still be in the queue, or there are no active destinations).
              </div>
            ) : (
              <div className="space-y-3">
                {attempts.map((a: any) => (
                  <div key={a.id} className="p-3 border border-border rounded-lg text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium truncate mr-2" title={a.destinationId}>
                        Dest: {a.destinationId}
                      </div>
                      <div className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${
                        a.responseStatusCode >= 200 && a.responseStatusCode < 300
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {a.responseStatusCode || 'Error'}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2 flex justify-between">
                      <span>{new Date(a.createdAt).toLocaleString()}</span>
                      <span>Latency: {a.latencyMs}ms</span>
                    </div>
                    {a.responseBody && (
                      <pre className="text-xs bg-muted p-2 rounded max-h-32 overflow-auto">
                        {a.responseBody}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
