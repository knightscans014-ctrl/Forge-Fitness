// Server-authority security context.
// Holds the authoritative premium/admin state fetched from the server.
// Components use this instead of local `state.premium` for anything security-
// sensitive. A modded APK cannot influence this — it comes from Supabase.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { fetchPremiumStatus, isAdmin, ServerPremiumStatus } from '../services/secureAuth';

interface SecurityState {
  premium: ServerPremiumStatus;
  admin: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SecurityState>({
  premium: { isPremium: false, tier: null },
  admin: false,
  refreshing: false,
  refresh: async () => {},
});

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const signedIn = useAuth(s => s.auth.status === 'signedIn');
  const [premium, setPremium] = useState<ServerPremiumStatus>({ isPremium: false, tier: null });
  const [admin, setAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    if (!signedIn) { setPremium({ isPremium: false, tier: null }); setAdmin(false); return; }
    setRefreshing(true);
    const [p, a] = await Promise.all([fetchPremiumStatus(), isAdmin()]);
    setPremium(p);
    setAdmin(a);
    setRefreshing(false);
  }

  useEffect(() => { refresh(); }, [signedIn]);

  return (
    <Ctx.Provider value={{ premium, admin, refreshing, refresh }}>{children}</Ctx.Provider>
  );
}

export function useSecurity() {
  return useContext(Ctx);
}
