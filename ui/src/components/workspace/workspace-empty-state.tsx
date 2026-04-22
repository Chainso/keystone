import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function WorkspaceEmptyState({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return <section className={cn("empty-state-card", className)} {...props} />;
}

export function WorkspaceEmptyStateTitle({
  as: Comp = "h2",
  className,
  ...props
}: ComponentPropsWithoutRef<"h2"> & {
  as?: "h1" | "h2" | "h3";
}) {
  return <Comp className={cn("document-card-title", className)} {...props} />;
}

export function WorkspaceEmptyStateDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return <p className={cn("document-card-summary", className)} {...props} />;
}

export function WorkspaceEmptyStateActions({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("shell-state-actions", className)} {...props} />;
}
