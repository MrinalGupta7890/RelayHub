import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useEnvironment() {
  const { data: envs, isLoading, error } = useQuery({
    queryKey: ["environments"],
    queryFn: () => apiFetch("/api/v1/environments"),
  });

  // For MVP, just return the first environment.
  // In a real app, this would be selected via a dropdown in the UI.
  const currentEnvironment = envs && envs.length > 0 ? envs[0] : null;

  return {
    environments: envs || [],
    currentEnvironment,
    isLoading,
    error,
  };
}
