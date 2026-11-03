export type SocialProvider = "google" | "apple" | "facebook";

// Les comptes créés par connexion sociale reçoivent un « hash » préfixé (jamais valide pour bcrypt) : pas de mot de passe local.
export const SOCIAL_HASH_PREFIX = "social:";
export const isSocialAccount = (passwordHash: string) => passwordHash.startsWith(SOCIAL_HASH_PREFIX);

export const SOCIAL_PROVIDERS: SocialProvider[] = ["google", "apple", "facebook"];

// Un fournisseur est actif seulement si son identifiant et son secret sont définis (jamais de valeur dans le dépôt).
export const SOCIAL_ENABLED: Record<SocialProvider, boolean> = {
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  apple: Boolean(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET),
  facebook: Boolean(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET),
};
