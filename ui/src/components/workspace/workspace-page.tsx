import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function WorkspacePage({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("page-stage", className)} {...props} />;
}

export function WorkspacePageSection({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return <section className={cn("page-section", className)} {...props} />;
}

export function WorkspacePageHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"header">) {
  return <header className={cn("workspace-page-header", className)} {...props} />;
}

export function WorkspacePageHeading({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("workspace-page-heading", className)} {...props} />;
}

export function WorkspacePageActions({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("workspace-page-actions", className)} {...props} />;
}
