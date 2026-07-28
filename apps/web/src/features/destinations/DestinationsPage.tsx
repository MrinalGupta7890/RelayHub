import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "../../lib/api";
import { useEnvironment } from "../../hooks/useEnvironment";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";

export function DestinationsPage() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: destinations = [], isLoading } = useQuery({
    queryKey: ["destinations", currentEnvironment?.id],
    queryFn: () => apiFetch(`/api/v1/environments/${currentEnvironment?.id}/destinations`),
    enabled: !!currentEnvironment,
  });

  const createMutation = useMutation({
    mutationFn: (newDest: any) =>
      apiFetch(`/api/v1/environments/${currentEnvironment?.id}/destinations`, {
        method: "POST",
        body: JSON.stringify(newDest),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destinations", currentEnvironment?.id] });
      setShowCreate(false);
    },
  });

  if (isLoading) return <div>Loading destinations...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Destinations</h2>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "Add Destination"}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create Destination</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                createMutation.mutate({
                  name: fd.get("name"),
                  url: fd.get("url"),
                  eventTypeFilters: (fd.get("eventTypes") as string).split(",").map((s) => s.trim()).filter(Boolean),
                });
              }}
              className="space-y-4 max-w-md"
            >
              <Input name="name" placeholder="Destination Name (e.g. My Backend)" required />
              <Input name="url" placeholder="https://api.example.com/webhook" required />
              <Input name="eventTypes" placeholder="Event types (comma separated, or empty for all)" />
              <Button type="submit" disabled={createMutation.isPending}>
                Save Destination
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {destinations.length === 0 && (
          <div className="text-muted-foreground p-4 border border-dashed border-border rounded-lg text-center">
            No destinations configured.
          </div>
        )}
        {destinations.map((d: any) => (
          <Card key={d.id}>
            <CardHeader className="py-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{d.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{d.url}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${d.isActive ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                  {d.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-0 pb-4">
              <p className="text-sm text-muted-foreground">
                Filters: {d.eventTypeFilters.length > 0 ? d.eventTypeFilters.join(", ") : "All events"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
