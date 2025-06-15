
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

  const fetchAppName = async () => {
    const { data, error } = await supabase.from("app_settings").select("app_name").limit(1).maybeSingle();
    if (data?.app_name) setAppName(data.app_name);
  };

  useEffect(() => {
    fetchAppName();
  }, []);

  return (
    <AppSettingsContext.Provider value={{ appName, refresh: fetchAppName }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export const useAppSettings = () => useContext(AppSettingsContext);
