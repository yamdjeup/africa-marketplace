export const CONTACT_EMAIL = "contact@epomta.com";

// Phone numbers are shown only when real values are configured.
export function contactPhones(): { local?: string; intl?: string } {
  return {
    local: process.env.CONTACT_PHONE_LOCAL?.trim() || undefined,
    intl: process.env.CONTACT_PHONE_INTL?.trim() || undefined,
  };
}
