import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string | null;
  className?: string;
}

const statusMap: Record<string, { label: string; className: string }> = {
  working: { label: "Working", className: "bg-green-100 text-green-700 border-green-200" },
  suspended: { label: "Suspended", className: "bg-red-100 text-red-700 border-red-200" },
  "48h_waiting": { label: "48h Waiting", className: "bg-blue-100 text-blue-700 border-blue-200" },
  account_status_problem: { label: "Status Problem", className: "bg-orange-100 text-orange-700 border-orange-200" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = (status || "").toLowerCase();
  const config = statusMap[key] || { label: status || "Unknown", className: "bg-gray-100 text-gray-700 border-gray-200" };

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", config.className, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5",
        key === "working" ? "bg-green-500" :
        key === "suspended" ? "bg-red-500" :
        key === "48h_waiting" ? "bg-blue-500" :
        key === "account_status_problem" ? "bg-orange-500" : "bg-gray-500"
      )} />
      {config.label}
    </span>
  );
}
