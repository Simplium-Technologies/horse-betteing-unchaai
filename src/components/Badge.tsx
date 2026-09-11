interface BadgeProps {
  text: string;
  className?: string;
}

export default function Badge({ text, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase border flex-shrink-0 ${className}`}
    >
      {text}
    </span>
  );
}
