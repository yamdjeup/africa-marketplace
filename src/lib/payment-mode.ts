/** Paiement : autorisation à la commande, encaissement à la confirmation du créateur (drapeau PAYMENT_CAPTURE_ON_CONFIRM=1) ; sinon ancien flux (paiement immédiat). */
export const captureOnConfirm = () => process.env.PAYMENT_CAPTURE_ON_CONFIRM === "1";

/** Délai laissé au créateur pour confirmer, en heures. */
export const creatorWindowHours = () => (captureOnConfirm() ? 24 : 48);
