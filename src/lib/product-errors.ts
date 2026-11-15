const MSG: Record<string, [string, string]> = {
  reason: ["Le motif est obligatoire.", "A reason is required."],
  delta: ["Quantité invalide (entier non nul).", "Invalid quantity (non-zero integer)."],
  below: ["Correction impossible : le stock deviendrait inférieur au stock réservé ou négatif.", "Correction impossible: stock would drop below the reserved or negative."],
  invalid: ["Titre ou catégorie manquant ou invalide.", "Missing or invalid title or category."],
  price: ["Prix invalide : indiquez un prix d'au moins 1,00 €.", "Invalid price: enter at least €1.00."],
  photo: ["Ajoutez au moins une photo pour soumettre la création.", "Add at least one photo to submit the piece."],
  desc: ["La description doit faire au moins 20 caractères pour soumettre la création.", "The description must be at least 20 characters to submit the piece."],
  readonly: ["Vue en lecture seule : aucune modification possible.", "Read-only view: no changes possible."],
  decided: ["L'admin a déjà statué sur cette création : la soumission ne peut plus être annulée.", "The admin has already decided on this piece: the submission can no longer be cancelled."],
};

export function productErrorMessage(code: string, locale: string) {
  const m = MSG[code] ?? ["Action impossible (vérifiez les champs, ou le stock réservé).", "Action not possible (check fields, or reserved stock)."];
  return locale === "en" ? m[1] : m[0];
}
