import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";
import { useEnvironment } from "../../hooks/useEnvironment";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export function SettingsPage() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  // Fetch API Keys
  const { data: apiKeys = [] } = useQuery({
    queryKey: ["api-keys", currentEnvironment?.id],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/environments/${currentEnvironment?.id}/api-keys`);
      return res.data;
    },
    enabled: !!currentEnvironment,
  });

  // Fetch Sources
  const { data: sources = [] } = useQuery({
    queryKey: ["sources", currentEnvironment?.id],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/environments/${currentEnvironment?.id}/sources`);
      return res.data;
    },
    enabled: !!currentEnvironment,
  });

  const createApiKeyMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/environments/${currentEnvironment?.id}/api-keys`, {
        method: "POST",
        body: JSON.stringify({ name: `Key ${new Date().getTime()}` }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys", currentEnvironment?.id] });
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Settings</h2>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0">
            <CardTitle>API Keys</CardTitle>
            <Button size="sm" onClick={() => createApiKeyMutation.mutate()} disabled={createApiKeyMutation.isPending}>
              Generate Key
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border border-t border-border mt-4">
              {apiKeys.length === 0 && <p className="py-4 text-sm text-muted-foreground">No API keys.</p>}
              {apiKeys.map((k: any) => (
                <div key={k.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{k.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {k.keyHash ? "****************" : "Secret hidden"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Created: {new Date(k.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingestion Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border border-t border-border mt-4">
              {sources.length === 0 && <p className="py-4 text-sm text-muted-foreground">No sources configured.</p>}
              {sources.map((s: any) => (
                <div key={s.id} className="py-3">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">/{s.ingestionSlug}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
