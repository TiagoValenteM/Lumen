export default function CoffeeLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Steam lines */}
      <path
        d="M12 6C12 6 11 4 11 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M16 6C16 6 15 4 15 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M20 6C20 6 19 4 19 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Cup body with gradient effect */}
      <path
        d="M6 12H26V22C26 24.2091 24.2091 26 22 26H10C7.79086 26 6 24.2091 6 22V12Z"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M6 12H26V22C26 24.2091 24.2091 26 22 26H10C7.79086 26 6 24.2091 6 22V12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Handle */}
      <path
        d="M26 14H28C29.1046 14 30 14.8954 30 16V18C30 19.1046 29.1046 20 28 20H26"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Coffee level */}
      <path
        d="M8 18H24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}
