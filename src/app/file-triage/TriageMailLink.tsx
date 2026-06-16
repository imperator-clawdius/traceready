"use client";

import { type ReactNode } from "react";
import { buildTriageMailto } from "@/lib/triage-mail";
import { useLocationSearch } from "@/lib/use-location-search";

type TriageMailLinkProps = {
  children: ReactNode;
  className: string;
};

export function TriageMailLink({ children, className }: TriageMailLinkProps) {
  const href = buildTriageMailto(useLocationSearch());

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
