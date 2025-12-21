"use client";

import { useState, useEffect } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionStatus: "granted" | "denied" | "prompt" | null;
}

export function useGeolocation() {
  const [location, setLocation] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    permissionStatus: null,
  });

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
      }));
      return;
    }

    setLocation((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
          permissionStatus: "granted",
        });
      },
      (error) => {
        let errorMessage = "Unable to retrieve your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions.";
            setLocation((prev) => ({
              ...prev,
              error: errorMessage,
              loading: false,
              permissionStatus: "denied",
            }));
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            setLocation((prev) => ({
              ...prev,
              error: errorMessage,
              loading: false,
            }));
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            setLocation((prev) => ({
              ...prev,
              error: errorMessage,
              loading: false,
            }));
            break;
          default:
            setLocation((prev) => ({
              ...prev,
              error: errorMessage,
              loading: false,
            }));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((permissionStatus) => {
          setLocation((prev) => ({
            ...prev,
            permissionStatus: permissionStatus.state as "granted" | "denied" | "prompt",
          }));

          permissionStatus.onchange = () => {
            setLocation((prev) => ({
              ...prev,
              permissionStatus: permissionStatus.state as "granted" | "denied" | "prompt",
            }));
          };
        })
        .catch(() => {
          setLocation((prev) => ({
            ...prev,
            permissionStatus: "prompt",
          }));
        });
    }
  }, []);

  return {
    ...location,
    requestLocation,
  };
}
