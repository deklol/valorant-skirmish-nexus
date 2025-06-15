
import { Badge } from "@/components/ui/badge";

export function parseMapVetoRounds(value: any): number[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'number') return item;
      if (typeof item === 'string') {
        const parsed = parseInt(item, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    }).filter(num => num > 0);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item: any) => parseInt(item, 10)).filter(num => !isNaN(num)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function getStatusBadge(status: string) {
  const variants: { [key: string]: string } = {
    draft: "bg-gray-500/20 text-gray-400",
    open: "bg-green-500/20 text-green-400",
    balancing: "bg-yellow-500/20 text-yellow-400",
    live: "bg-red-500/20 text-red-400",
    completed: "bg-blue-500/20 text-blue-400",
    archived: "bg-slate-500/20 text-slate-400"
  };
  const badgeClass =
    variants[status] !== undefined ? variants[status] : variants["draft"];
  return (
    <Badge className={badgeClass}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
