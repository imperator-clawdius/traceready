"use client";

import { type ReactNode, useMemo } from "react";
import { buildPilotProofMailto } from "@/lib/pilot-proof-mail";

type PilotProofMailLinkProps = {
  children: ReactNode;
  className: string;
};

export function PilotProofMailLink({ children, className }: PilotProofMailLinkProps) {
  const href = useMemo(() => {
    if (typeof window === "undefined") {
      return buildPilotProofMailto();
    }

    return buildPilotProofMailto(window.location.search);
  }, []);

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
