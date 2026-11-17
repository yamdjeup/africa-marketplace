// Affiche l'avis "reservee par un autre client" seulement si plus rien n'est disponible.
export function showHoldNotice({ soldOut, reserved, ownHold }: { soldOut: boolean; reserved: number; ownHold: boolean }): boolean {
  return soldOut && reserved > 0 && !ownHold;
}
