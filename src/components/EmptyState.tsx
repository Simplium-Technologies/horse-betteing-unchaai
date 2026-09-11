interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({
  icon = "🏇",
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 sm:p-12 text-center">
      <div className="text-4xl sm:text-5xl mb-3 sm:mb-4 grayscale opacity-60">{icon}</div>
      <h4 className="font-semibold text-gray-700 text-sm sm:text-base">{title}</h4>
      {description && (
        <p className="text-xs sm:text-sm text-gray-400 mt-1.5 max-w-sm mx-auto">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 sm:mt-4 px-4 sm:px-5 py-2 rounded-xl bg-[#17251c] text-white text-xs sm:text-sm font-medium hover:bg-[#24372b] transition min-h-[40px]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
