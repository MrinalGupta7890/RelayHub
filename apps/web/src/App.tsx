/**
 * Phase 1 placeholder shell — proves the Vite/React/Tailwind/TS toolchain
 * builds and renders end to end. Real routing, auth pages, and the
 * dashboard layout are built in Phase 18 (Frontend Foundation) once the
 * API has endpoints worth calling.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./features/auth/AuthContext";
import { AppRouter } from "./app/Router";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
