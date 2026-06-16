"use client";

import { type ReactNode, useMemo } from "react";
import { appendOutreachSearch } from "@/lib/outreach-attribution";
import { PILOT_PROOF_HREF } from "@/lib/site";

type TrackedPilotProofLinkProps = {
  children: ReactNode;
  className: string;
};

export function TrackedPilotProofLink({ children, className }: TrackedPilotProofLinkProps) {
  const href = useMemo(() => {
    if (typeof window === "undefined") {
      return PILOT_PROOF_HREF;
    }

    return appendOutreachSearch(PILOT_PROOF_HREF, window.location.search);
  }, []);

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
