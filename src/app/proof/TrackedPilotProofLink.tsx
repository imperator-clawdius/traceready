"use client";

import Link from "next/link";
import { type ReactNode, useSyncExternalStore } from "react";
import { appendOutreachSearch } from "@/lib/outreach-attribution";
import { PILOT_PROOF_HREF } from "@/lib/site";

type TrackedPilotProofLinkProps = {
  children: ReactNode;
  className: string;
};

export function TrackedPilotProofLink({ children, className }: TrackedPilotProofLinkProps) {
  const href = useTrackedHref(PILOT_PROOF_HREF);

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function useTrackedHref(baseHref: string) {
  return useSyncExternalStore(subscribeToNoopStore, () => appendOutreachSearch(baseHref, window.location.search), () => baseHref);
}

function subscribeToNoopStore() {
  return () => {};
}
