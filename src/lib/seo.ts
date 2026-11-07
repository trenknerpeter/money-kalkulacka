/** Public origin. Must match the URLs in public/sitemap.xml. */
export const SITE_URL = "https://moneykalkulacka.lovable.app";
export const SITE_NAME = "Money Kalkulačka";

const urlFor = (path: string) => `${SITE_URL}${path === "/" ? "/" : path}`;

/**
 * Canonical URL without query strings, so shared links with scenario params
 * (?gross=…) don't compete with the clean page in search results.
 */
export function canonical(path: string) {
  return {
    link: { rel: "canonical", href: urlFor(path) },
    meta: { property: "og:url", content: urlFor(path) },
  };
}

// The helpers below return JSON-LD <script> entries for a route head's `scripts` array.

/** schema.org WebApplication for a calculator page. */
export function webAppLd(path: string, name: string, description: string) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name,
      description,
      url: urlFor(path),
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      inLanguage: "cs",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "CZK" },
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: urlFor("/") },
    }),
  };
}

/** schema.org WebSite for the homepage. */
export function webSiteLd(description: string) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: urlFor("/"),
      description,
      inLanguage: "cs",
    }),
  };
}

/** schema.org FAQPage. Questions must match the FAQ visible on the page. */
export function faqLd(faq: { q: string; a: string }[]) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    }),
  };
}
