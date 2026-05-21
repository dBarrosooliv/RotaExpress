import { cn } from "@/lib/utils";
import { Database, Network, Layers } from "lucide-react";

type Source = "postgres" | "mongo" | "neo4j";

const META: Record<Source, { label: string; color: string; Icon: typeof Database }> = {
  postgres: {
    label: "PostgreSQL",
    color: "text-[oklch(0.85_0.12_260)] bg-[oklch(0.4_0.18_260/35%)] border-[oklch(0.7_0.18_260/40%)]",
    Icon: Database,
  },
  mongo: {
    label: "MongoDB",
    color: "text-[oklch(0.9_0.12_200)] bg-[oklch(0.4_0.15_200/35%)] border-[oklch(0.7_0.15_200/40%)]",
    Icon: Layers,
  },
  neo4j: {
    label: "Neo4j",
    color: "text-[oklch(0.9_0.18_150)] bg-[oklch(0.4_0.18_150/35%)] border-[oklch(0.7_0.18_150/40%)]",
    Icon: Network,
  },
};

/**
 * Tiny badge showing which database a piece of data originates from.
 * Useful for demoing the polyglot architecture to stakeholders.
 */
export function SourceBadge({
  source,
  className,
}: {
  source: Source;
  className?: string;
}) {
  const { label, color, Icon } = META[source];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-md",
        color,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
