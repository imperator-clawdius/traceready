"use client";

import Link from "next/link";
import { type ReactNode, useSyncExternalStore } from "react";
import { appendOutreachSearch } from "@/lib/outreach-attribution";

type TrackedHomeLinkProps = {
  children: ReactNode;
  className: string;
};

export function TrackedHomeLink({ children, className }: TrackedHomeLinkProps) {
  const href = useTrackedHref("/");

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
