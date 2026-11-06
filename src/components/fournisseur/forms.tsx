"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { COUNTRIES, CURRENCIES, tr } from "@/lib/supplier-mock";
import type { Locale } from "@/lib/i18n";
import { inputCls } from "./parts";

const CATS = ["Peinture", "Sculpture", "Photographie", "Couture et mode", "Textile", "Accessoires"];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function Done({ title, text }: { title: string; text: string }) {
  return (
    <div role="status" className="rounded-lg border border-accent bg-accent/15 p-6 text-center">
      <p className="font-heading text-xl text-primary">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

const btn = buttonVariants({ size: "lg", className: "min-h-11" });

export function ApplicationForm({ locale }: { locale: Locale }) {
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <Done
        title={tr(locale, "Candidature enregistrée (maquette)", "Application recorded (mockup)")}
        text={tr(locale, "Rien n'a été envoyé : dans la vraie version, l'équipe examine le dossier sous 5 jours.", "Nothing was sent: in the real version, our team reviews the file within 5 days.")}
      />
    );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr(locale, "Nom / nom d'artiste", "Name / artist name")}>
          <input required name="name" className={inputCls} />
        </Field>
        <Field label={tr(locale, "Adresse e-mail", "Email address")}>
          <input required type="email" name="email" className={inputCls} />
        </Field>
        <Field label={tr(locale, "Pays", "Country")}>
          <select required name="country" className={inputCls} defaultValue="">
            <option value="" disabled>{tr(locale, "Choisir…", "Choose…")}</option>
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label={tr(locale, "Type d'œuvres", "Type of work")}>
          <select required name="type" className={inputCls} defaultValue="">
            <option value="" disabled>{tr(locale, "Choisir…", "Choose…")}</option>
            {CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field label={tr(locale, "Lien vers votre portfolio (site, Instagram…)", "Portfolio link (website, Instagram…)")}>
        <input required type="url" name="portfolio" placeholder="https://" className={inputCls} />
      </Field>
      <Field label={tr(locale, "Présentez votre démarche", "Tell us about your work")}>
        <textarea required name="about" rows={4} className={inputCls} />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input required type="checkbox" className="mt-1 size-4" />
        <span>{tr(locale, "Je certifie être l'auteur des œuvres proposées.", "I confirm I am the author of the works submitted.")}</span>
      </label>
      <button type="submit" className={btn}>{tr(locale, "Envoyer ma candidature", "Submit my application")}</button>
    </form>
  );
}

export function ArtworkForm({ locale }: { locale: Locale }) {
  const [saved, setSaved] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [unique, setUnique] = useState(true);
  if (saved)
    return (
      <Done
        title={tr(locale, "Œuvre enregistrée en brouillon (maquette)", "Artwork saved as draft (mockup)")}
        text={tr(locale, "Rien n'est stocké : la vraie version enverra les photos vers un stockage dédié.", "Nothing is stored: the real version will upload photos to dedicated storage.")}
      />
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(true);
      }}
      className="space-y-4"
    >
      <Field label={tr(locale, "Photos (jusqu'à 6)", "Photos (up to 6)")}>
        <input
          type="file"
          accept="image/*"
          multiple
          className={inputCls}
          onChange={(e) => {
            previews.forEach((u) => URL.revokeObjectURL(u));
            setPreviews(Array.from(e.target.files ?? []).slice(0, 6).map((f) => URL.createObjectURL(f)));
          }}
        />
      </Field>
      {previews.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {previews.map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <li key={u}><img src={u} alt="" className="aspect-square w-full rounded-md border object-cover" /></li>
          ))}
        </ul>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr(locale, "Titre", "Title")}>
          <input required name="title" className={inputCls} />
        </Field>
        <Field label={tr(locale, "Catégorie", "Category")}>
          <select name="cat" className={inputCls}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <Field label={tr(locale, "Prix", "Price")}>
          <input required type="number" min={1} name="price" className={inputCls} />
        </Field>
        <Field label={tr(locale, "Devise locale", "Local currency")}>
          <select name="cur" className={inputCls}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <Field label={tr(locale, "Dimensions (cm) ou tailles", "Dimensions (cm) or sizes")}>
          <input name="size" placeholder="80 × 60" className={inputCls} />
        </Field>
        <Field label="Stock">
          <div className="mt-1 flex min-h-11 items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-normal">
              <input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} className="size-4" />
              {tr(locale, "Pièce unique", "One-of-a-kind")}
            </label>
            {!unique && <input type="number" min={1} defaultValue={5} aria-label="Stock" className={`${inputCls} !mt-0 w-24`} />}
          </div>
        </Field>
      </div>
      <Field label={tr(locale, "Histoire de l'œuvre", "Story behind the work")}>
        <textarea name="story" rows={4} className={inputCls} />
      </Field>
      <button type="submit" className={btn}>{tr(locale, "Enregistrer le brouillon", "Save draft")}</button>
    </form>
  );
}

export function TrackingForm({ locale, initial }: { locale: Locale; initial?: string }) {
  const [saved, setSaved] = useState(Boolean(initial));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(true);
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tr(locale, "Transporteur", "Carrier")}>
          <select name="carrier" className={inputCls}>{["DHL", "UPS", "Colissimo", "Poste locale"].map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <Field label={tr(locale, "N° de suivi", "Tracking number")}>
          <input required name="tracking" defaultValue={initial} className={inputCls} />
        </Field>
      </div>
      <button type="submit" className={btn}>{tr(locale, "Enregistrer le suivi", "Save tracking")}</button>
      {saved && (
        <p role="status" className="text-sm text-muted-foreground">
          {tr(locale, "Suivi enregistré (maquette, aucun e-mail envoyé à l'acheteur).", "Tracking saved (mockup, no email sent to the buyer).")}
        </p>
      )}
    </form>
  );
}
