"use client";

import Link from "next/link";
import { type ReactNode, useSyncExternalStore } from "react";
import { appendOutreachSearch } from "@/lib/outreach-attribution";
import { FILE_TRIAGE_HREF } from "@/lib/site";

type TrackedTriageLinkProps = {
  children: ReactNode;
  className: string;
};

export function TrackedTriageLink({ children, className }: TrackedTriageLinkProps) {
  const href = useTrackedHref(FILE_TRIAGE_HREF);

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
