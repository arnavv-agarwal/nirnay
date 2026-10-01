"use client";

// Shares the live settings (threshold, model, API-key status) across pages,
// so changing the threshold on the Answer Key updates the top bar and the Inbox.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, type Settings } from "@/lib/api";

interface SettingsState {
  settings: Settings | null;
  error: string | null;
  refresh: () => Promise<void>;
  update: (change: { threshold?: number; model?: string }) => Promise<Settings>;
}

const SettingsContext = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    () =>
      api.settings().then(
        (s) => { setSettings(s); setError(null); },
        (e: Error) => setError(e.message),
      ),
    [],
  );

  const update = useCallback(async (change: { threshold?: number; model?: string }) => {
    const next = await api.updateSettings(change);
    setSettings(next);
    return next;
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return <SettingsContext.Provider value={{ settings, error, refresh, update }}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside SettingsProvider");
  return value;
}
