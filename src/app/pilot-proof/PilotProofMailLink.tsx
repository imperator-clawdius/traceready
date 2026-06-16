"use client";

import { type ReactNode } from "react";
import { buildPilotProofMailto } from "@/lib/pilot-proof-mail";
import { useLocationSearch } from "@/lib/use-location-search";

type PilotProofMailLinkProps = {
  children: ReactNode;
  className: string;
};

export function PilotProofMailLink({ children, className }: PilotProofMailLinkProps) {
  const href = buildPilotProofMailto(useLocationSearch());

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
