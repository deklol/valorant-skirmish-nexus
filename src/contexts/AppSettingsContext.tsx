
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppSettingsContextType = {
  appName: string;
  refresh: () => Promise<void>;
};

const AppSettingsContext = createContext<AppSettingsContextType>({
  appName: "ValTourneys", // fallback
  refresh: async () => {},
});

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [appName, setAppName] = useState("ValTourneys");

  // Fetch the current app name from the db
  const fetchAppName = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("app_name")
      .limit(1)
      .maybeSingle();
    if (data?.app_name) {
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
        (payload) => {
          // Whenever app_settings changes, update appName
          const nextAppName =
            payload?.new?.app_name ??
            payload?.old?.app_name ??
            "ValTourneys";
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
