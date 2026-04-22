import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function WorkspaceSplit({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("workspace-split", className)} {...props} />;
}

export function WorkspaceSplitPane({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("workspace-split-pane", className)} {...props} />;
}
