import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Base glassmorphism surface. Use it as a wrapper for any panel
 * that should sit on top of the gradient backdrop.
 */
export const GlassCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("glass rounded-2xl", className)}
      {...props}
    />
  ),
);
GlassCard.displayName = "GlassCard";
