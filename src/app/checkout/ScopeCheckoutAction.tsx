"use client";

import { useId, useState } from "react";

export function ScopeCheckoutAction({ stripeHref }: { stripeHref: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const confirmationId = useId();

  return (
    <fieldset data-checkout-url={stripeHref} className="mt-6 border border-emerald-200 bg-emerald-50 p-4">
      <legend className="px-1 text-sm font-semibold text-emerald-950">Ready to pay?</legend>
      <label htmlFor={confirmationId} className="flex items-start gap-3 text-sm leading-6 text-emerald-950">
        <input id={confirmationId} type="checkbox" required checked={confirmed}
          onChange={event => setConfirmed(event.target.checked)} className="mt-1 size-4 shrink-0" />
        TraceReady has confirmed my file scope and sent intake instructions by email.
      </label>
      {confirmed ? (
        <a href={stripeHref} target="_blank" rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
          Continue to Stripe checkout
        </a>
      ) : (
        <button type="button" disabled className="mt-4 min-h-11 rounded-md bg-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600">
          Confirm scope to continue
        </button>
      )}
      <noscript><p className="mt-3 text-sm">Enable JavaScript to confirm scope, or request the payment link in your scope email thread.</p></noscript>
    </fieldset>
  );
}
