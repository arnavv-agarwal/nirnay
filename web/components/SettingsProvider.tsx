"use client";

// Shares the live settings (threshold, model, API-key status) across pages,
// so changing the threshold on the Quality page shows everywhere at once.
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

  // Once the first page has loaded, quietly fetch what the other tabs need (about 40 KB),
  // so the first visit to Quality or the Knowledge base is instant too.
  const model = settings?.model;
  useEffect(() => {
    if (!model) return;
    const timer = setTimeout(() => {
      void api.evalRuns().catch(() => {});
      void api.evalRun(`${model}_test`).catch(() => {});
      void api.kb().catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [model]);

  return <SettingsContext.Provider value={{ settings, error, refresh, update }}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside SettingsProvider");
  return value;
}
