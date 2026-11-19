"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Keeps typed values across server-side redirects (validation / refused delete) and blocks
// row actions without a selection before any reload.
export function DraftForm({ id, requireSelection, noSelectionMessage, className, action, children }: {
  id: string;
  requireSelection?: boolean;
  noSelectionMessage?: string;
  className?: string;
  action?: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const key = `motifs-draft:${id}`;
  const savedFlag = `${key}:saving`;

  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    const ok = new URLSearchParams(window.location.search).has("ok");
    if (ok && sessionStorage.getItem(savedFlag)) {
      sessionStorage.removeItem(key);
    }
    sessionStorage.removeItem(savedFlag);
    const raw = sessionStorage.getItem(key);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as Record<string, string>;
      for (const el of Array.from(form.elements)) {
        if (el instanceof HTMLInputElement && el.type === "text" && el.name in draft) el.value = draft[el.name];
      }
    } catch {
      sessionStorage.removeItem(key);
    }
  }, [key, savedFlag]);

  function store() {
    const form = ref.current;
    if (!form) return;
    const draft: Record<string, string> = {};
    for (const el of Array.from(form.elements)) {
      if (el instanceof HTMLInputElement && el.type === "text" && el.name) draft[el.name] = el.value;
    }
    sessionStorage.setItem(key, JSON.stringify(draft));
  }

  return (
    <form
      ref={ref}
      action={action}
      className={className}
      onInput={store}
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const needsRows = requireSelection && submitter?.hasAttribute("data-needs-selection");
        if (needsRows && !ref.current?.querySelector('input[name="sel"]:checked')) {
          e.preventDefault();
          setError(noSelectionMessage ?? "");
          return;
        }
        setError("");
        store();
        if (submitter?.hasAttribute("data-clears-draft") || !submitter) sessionStorage.setItem(savedFlag, "1");
      }}
    >
      {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">{error}</p>}
      {children}
    </form>
  );
}
