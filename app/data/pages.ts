// app/data/pages.ts
export type SitePage = {
  id: string;
  title: string;
  url: string;           // absolute or relative is fine
  keywords: string[];    // synonyms users might say
  description?: string;  // for prompting / tooltips
};

export const PAGES: SitePage[] = [
  {
    id: "license-manager",
    title: "License Manager",
    url: "/license-manager",
    keywords: ["license", "licenses", "licence", "licensing", "keys", "manage license", "seat", "subscription"],
    description: "View, assign, and revoke VaultedByU seats/licenses."
  },
  {
    id: "investors",
    title: "Investor Welcome",
    url: "/investors",
    keywords: ["investor", "investors", "invest", "fund", "funding", "cap table"]
  },
  {
    id: "vault",
    title: "Secure Vault",
    url: "/vault",
    keywords: ["vault", "secure storage", "documents", "files", "upload"]
  },
  {
    id: "support",
    title: "Help & Support",
    url: "/help",
    keywords: ["help", "support", "contact", "faq", "guide", "documentation"]
  },
  // add as many as you like...
];
