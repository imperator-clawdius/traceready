"use client";

import { type ReactNode, useMemo } from "react";
import { appendOutreachSearch } from "@/lib/outreach-attribution";

type TrackedHomeLinkProps = {
  children: ReactNode;
  className: string;
};

export function TrackedHomeLink({ children, className }: TrackedHomeLinkProps) {
  const href = useMemo(() => {
    if (typeof window === "undefined") {
      return "/";
    }

    return appendOutreachSearch("/", window.location.search);
  }, []);

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
