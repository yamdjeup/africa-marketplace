"use client";

import { useState } from "react";

type Props = {
  mode: string;
  from: string;
  to: string;
  today: string;
  disabled: boolean;
  labels: { decision: string; today: string; d7: string; d30: string; custom: string; all: string; from: string; to: string; invalid: string };
  inputCls: string;
  prefix?: string;
};

const addDays = (ymd: string, n: number) => new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10) + n)).toISOString().slice(0, 10);

export function DateRangeFields({ mode: m0, from: f0, to: t0, today, disabled, labels, inputCls, prefix = "" }: Props) {
  const [mode, setMode] = useState(m0);
  const [from, setFrom] = useState(f0);
  const [to, setTo] = useState(t0);
  const invalid = mode === "custom" && !!from && !!to && from > to;

  function onMode(v: string) {
    setMode(v);
    if (v === "all") { setFrom(""); setTo(""); }
    else if (v === "today") { setFrom(today); setTo(today); }
    else if (v === "7" || v === "30") { setFrom(addDays(today, -(Number(v) - 1))); setTo(today); }
    else if (!from || !to) { setFrom(today); setTo(today); }
  }

  return (
    <>
      <label className="text-sm font-medium">{labels.decision}
        <select name={prefix + "d"} value={mode} onChange={(e) => { const f = e.target.form; onMode(e.target.value); if (e.target.value !== "custom") setTimeout(() => f?.requestSubmit(), 50); }} disabled={disabled} className={inputCls}>
          <option value="today">{labels.today}</option>
          <option value="7">{labels.d7}</option>
          <option value="30">{labels.d30}</option>
          <option value="custom">{labels.custom}</option>
          <option value="all">{labels.all}</option>
        </select></label>
      <label className="text-sm font-medium">{labels.from}
        <input type="date" name={prefix + "from"} disabled={disabled} value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setMode("custom"); }} className={inputCls} aria-invalid={invalid} /></label>
      <label className="text-sm font-medium">{labels.to}
        <input type="date" name={prefix + "to"} disabled={disabled} value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setMode("custom"); }} className={inputCls} aria-invalid={invalid} /></label>
      {invalid && <p role="alert" className="text-xs font-medium text-red-700 sm:col-span-4">{labels.invalid}</p>}
    </>
  );
}
