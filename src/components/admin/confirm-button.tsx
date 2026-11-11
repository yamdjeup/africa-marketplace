"use client";

import type { ReactNode } from "react";

export function ConfirmButton({ message, title, className, children }: { message: string; title?: string; className?: string; children: ReactNode }) {
  return (
    <button className={className} title={title} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
