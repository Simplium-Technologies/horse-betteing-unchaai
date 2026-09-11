import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = "", ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full min-h-[44px] ${icon ? "pl-10" : "px-4"} pr-4 border border-gray-200 rounded-xl outline-none focus:border-[#17251c] focus:ring-0 text-gray-900 text-sm placeholder:text-gray-400 bg-white transition ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-1.5 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
