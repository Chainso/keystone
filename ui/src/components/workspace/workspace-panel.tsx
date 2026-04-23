import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function WorkspacePanel({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return <section className={cn("workspace-panel", className)} {...props} />;
}

export function WorkspacePanelHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"header">) {
  return <header className={cn("workspace-panel-header", className)} {...props} />;
}

export function WorkspacePanelHeading({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("workspace-panel-heading", className)} {...props} />;
}

export function WorkspacePanelEyebrow({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return <p className={cn("workspace-panel-eyebrow", className)} {...props} />;
}

export function WorkspacePanelTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<"h2">) {
  return <h2 className={cn("workspace-panel-title", className)} {...props} />;
}

export function WorkspacePanelSummary({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return <p className={cn("workspace-panel-summary", className)} {...props} />;
}

export function WorkspacePanelActions({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("workspace-page-actions", className)} {...props} />;
}
