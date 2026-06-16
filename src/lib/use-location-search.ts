"use client";

import { useSyncExternalStore } from "react";

function subscribeToLocationSearch(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
  };
}

function getLocationSearch() {
  return window.location.search;
}

function getServerLocationSearch() {
  return "";
}

export function useLocationSearch() {
  return useSyncExternalStore(subscribeToLocationSearch, getLocationSearch, getServerLocationSearch);
}
