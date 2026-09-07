import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: number;
  label?: string;
}

/** Small inline spinner icon, optionally with a label next to it. */
export function Spinner({ className, size = 16, label }: SpinnerProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-gray-500", className)}>
      <Loader2 className="animate-spin" width={size} height={size} />
      {label && <span className="text-sm">{label}</span>}
    </span>
  );
}

/** Centered full-height spinner for whole-page / whole-section loading states. */
export function PageSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
      <Loader2 className="animate-spin" width={28} height={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}
