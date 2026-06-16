"use client";

import { type ReactNode, useMemo } from "react";
import { appendOutreachSearch } from "@/lib/outreach-attribution";
import { FILE_TRIAGE_HREF } from "@/lib/site";

type TrackedTriageLinkProps = {
  children: ReactNode;
  className: string;
};

export function TrackedTriageLink({ children, className }: TrackedTriageLinkProps) {
  const href = useMemo(() => {
    if (typeof window === "undefined") {
      return FILE_TRIAGE_HREF;
    }

    return appendOutreachSearch(FILE_TRIAGE_HREF, window.location.search);
  }, []);

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
