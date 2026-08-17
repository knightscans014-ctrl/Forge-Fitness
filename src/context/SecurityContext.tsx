// Server-authority security context.
// Holds the authoritative premium/admin state fetched from the server.
// Components use this instead of local `state.premium` for anything security-
// sensitive. A modded APK cannot influence this — it comes from Supabase.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { fetchPremiumStatus, isAdmin, ServerPremiumStatus } from '../services/secureAuth';
import { setServerEntitlement, clearServerAuthority } from '../engine/state';
import { isConfigured } from '../services/supabaseClient';

interface SecurityState {
  premium: ServerPremiumStatus;
  admin: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SecurityState>({
  premium: { isPremium: false, tier: null, expiresAt: null },
  admin: false,
  refreshing: false,
  refresh: async () => {},
});

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const signedIn = useAuth(s => s.auth.status === 'signedIn');
  const [premium, setPremium] = useState<ServerPremiumStatus>({ isPremium: false, tier: null, expiresAt: null });
  const [admin, setAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    // No backend configured -> let the engine fall back to local save state,
    // otherwise a dev build would show nobody as premium.
    if (!isConfigured()) {
      clearServerAuthority();
      setPremium({ isPremium: false, tier: null, expiresAt: null });
      setAdmin(false);
      return;
    }
    if (!signedIn) {
      const none: ServerPremiumStatus = { isPremium: false, tier: null, expiresAt: null };
      setServerEntitlement(none); // signed out is authoritative: no premium
      setPremium(none);
      setAdmin(false);
      return;
    }
    setRefreshing(true);
    const [p, a] = await Promise.all([fetchPremiumStatus(), isAdmin()]);
    // Push the server verdict into the engine so XP/gold multipliers stop
    // trusting the (editable) local save file.
    setServerEntitlement({ isPremium: p.isPremium, tier: p.tier });
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
