import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function ReviewSection({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return <section className={cn("document-card", className)} {...props} />;
}

export function ReviewSectionLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return <p className={cn("review-sidebar-label", className)} {...props} />;
}

export function ReviewFileStack({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("review-file-stack", className)} {...props} />;
}

export function ReviewFileCard({
  className,
  ...props
}: ComponentPropsWithoutRef<"details">) {
  return <details className={cn("review-file-card", className)} {...props} />;
}

export function ReviewFileSummary({
  className,
  ...props
}: ComponentPropsWithoutRef<"summary">) {
  return <summary className={cn("review-file-summary", className)} {...props} />;
}
