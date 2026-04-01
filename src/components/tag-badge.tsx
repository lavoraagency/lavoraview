interface TagBadgeProps {
  tag: string;
  color?: string | null;
  onRemove?: () => void;
}

export function TagBadge({ tag, color, onRemove }: TagBadgeProps) {
  const bgColor = color || "#6366f1";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: bgColor }}
    >
      {tag}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-75 transition-opacity ml-0.5">
          ×
        </button>
      )}
    </span>
  );
}
