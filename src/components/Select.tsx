import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = "", ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full min-h-[44px] px-4 border border-gray-200 rounded-xl outline-none focus:border-[#17251c] focus:ring-0 text-gray-900 text-sm bg-white transition appearance-none ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-red-500 mt-1.5 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
