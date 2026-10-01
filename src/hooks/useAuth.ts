import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("Supabase session failed:", error);
          setSession(null);
        } else {
          setSession(currentSession);
        }
      } catch (error) {
        if (!mounted) return;
        console.error("Supabase session unavailable:", error);
        setSession(null);
      }

      setLoading(false);
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
  };
}
