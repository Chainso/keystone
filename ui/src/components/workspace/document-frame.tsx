import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function DocumentFrame({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return <section className={cn("document-card", className)} {...props} />;
}

export function DocumentFrameTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<"h3">) {
  return <h3 className={cn("document-viewer-title", className)} {...props} />;
}

export function DocumentFramePath({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return <p className={cn("document-name", className)} {...props} />;
}

export function DocumentFrameRule({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div aria-hidden="true" className={cn("document-rule", className)} {...props} />;
}

export function DocumentFrameBody({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("document-copy", className)} {...props} />;
}

export function DocumentFrameSummary({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return <p className={cn("document-card-summary", className)} {...props} />;
}
