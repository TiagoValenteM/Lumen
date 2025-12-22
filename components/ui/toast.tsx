interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose?: () => void;
}

export function Toast({ message, type }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <div
        className={`rounded-lg px-4 py-3 shadow-lg ${
          type === "success"
            ? "bg-green-600 text-white"
            : "bg-red-600 text-white"
        }`}
      >
        {message}
      </div>
    </div>
  );
}
