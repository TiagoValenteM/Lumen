import { useState, useCallback } from "react";

export interface ToastMessage {
  message: string;
  type: "success" | "error";
}

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  const showSuccess = useCallback((message: string, duration = 3000) => {
    showToast(message, "success", duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration = 3000) => {
    showToast(message, "error", duration);
  }, [showToast]);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return {
    toast,
    showToast,
    showSuccess,
    showError,
    hideToast,
  };
}
