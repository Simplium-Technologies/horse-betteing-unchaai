import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "accent";
}

export default function Button({
  loading,
  variant = "primary",
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "min-h-[44px] px-6 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]";

  const variants = {
    primary: "bg-[#17251c] text-white hover:bg-[#24372b] shadow-sm hover:shadow-md",
    secondary: "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
    accent: "bg-[#c9a84c] text-white hover:bg-[#b8963f] shadow-sm",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Please wait...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
