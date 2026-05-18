import type { ReactNode } from "react";
import { SourceBadge } from "./SourceBadge";

interface SectionHeaderProps {
  title: string;
  description?: string;
  source: "postgres" | "mongo" | "neo4j";
  right?: ReactNode;
}

export function SectionHeader({ title, description, source, right }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <SourceBadge source={source} />
          {right}
        </div>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
