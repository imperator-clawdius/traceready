"use client";

import { type ReactNode, useMemo } from "react";
import { buildTriageMailto } from "@/lib/triage-mail";

type TriageMailLinkProps = {
  children: ReactNode;
  className: string;
};

export function TriageMailLink({ children, className }: TriageMailLinkProps) {
  const href = useMemo(() => {
    if (typeof window === "undefined") {
      return buildTriageMailto();
    }

    return buildTriageMailto(window.location.search);
  }, []);

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
