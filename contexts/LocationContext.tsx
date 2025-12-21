"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";

interface LocationContextType {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionStatus: "granted" | "denied" | "prompt" | null;
  requestLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const geolocation = useGeolocation();

  return (
    <LocationContext.Provider value={geolocation}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
