"use client";

import { useState } from "react";

export function HelpFeedback({ question, yes, no, thanks }: { question: string; yes: string; no: string; thanks: string }) {
  const [answer, setAnswer] = useState<boolean | null>(null);
  return (
    <div className="mt-8 border-t pt-4 text-sm" role="group" aria-label={question}>
      {answer === null ? (
        <>
          <p className="font-medium">{question}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setAnswer(true)} className="h-10 rounded-md border border-black px-5 hover:bg-black hover:text-white">{yes}</button>
            <button type="button" onClick={() => setAnswer(false)} className="h-10 rounded-md border border-black px-5 hover:bg-black hover:text-white">{no}</button>
          </div>
        </>
      ) : (
        <p role="status">{thanks}</p>
      )}
    </div>
  );
}
