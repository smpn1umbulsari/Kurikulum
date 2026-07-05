import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { ToastContainer } from './components/ui/Toast';
import { supabase } from './infrastructure/supabase/client';
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes default
    },
  },
});

function App() {
  // Sync Supabase session with auth store
  useEffect(() => {
    // Get initial session from localStorage (persisted by authStore)
    const restoreSession = async () => {
      const storedSession = useAuthStore.getState().session;
      if (storedSession?.access_token) {
        // Cast to any to handle type mismatch between Supabase and custom Session
        await (supabase.auth.setSession as any)({
          access_token: storedSession.access_token,
          refresh_token: storedSession.refresh_token || '',
        });
      }
    };

    restoreSession();

    // Listen for auth state changes and sync with Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Cast to any to handle type mismatch between Supabase and custom Session
        useAuthStore.getState().setSession(session as any);
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.getState().logout();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ToastContainer />
    </QueryClientProvider>
  );
}

export default App;
