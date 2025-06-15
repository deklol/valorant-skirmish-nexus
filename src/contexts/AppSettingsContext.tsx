
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppSettingsContextType = {
  appName: string;
  refresh: () => Promise<void>;
};

const DEFAULT_APP_NAME = "TLRHub";

const AppSettingsContext = createContext<AppSettingsContextType>({
  appName: DEFAULT_APP_NAME, // fallback
  refresh: async () => {},
});

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [appName, setAppName] = useState(DEFAULT_APP_NAME);

  // Fetch the current app name from the db
  const fetchAppName = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("app_name")
      .limit(1)
      .maybeSingle();

    // Defensive: ensure data has proper structure
    if (data && typeof data === "object" && typeof data.app_name === "string") {
      setAppName(data.app_name);
    }
  };

  // Subscribe to realtime updates for changes in app_settings
  useEffect(() => {
    fetchAppName();
    const channel = supabase
      .channel('app_settings-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings'
        },
        (payload: any) => {
          // Defensive: ensure new or old has correct type
          const nextAppName =
            (payload?.new && typeof payload.new.app_name === "string"
              ? payload.new.app_name
              : undefined) ||
            (payload?.old && typeof payload.old.app_name === "string"
              ? payload.old.app_name
              : undefined) ||
            DEFAULT_APP_NAME;
          setAppName(nextAppName);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AppSettingsContext.Provider value={{ appName, refresh: fetchAppName }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export const useAppSettings = () => useContext(AppSettingsContext);

