import { useLang } from "@/lib/i18n";
import { SEO_CONTENT, type SeoPage } from "@/lib/seoContent";

/**
 * Short explainer + FAQ under a calculator. Plain markup so it's all in the server HTML.
 * Two columns on desktop (explainer | FAQ) so it spans the page without overlong lines.
 */
export function SeoArticle({ page }: { page: SeoPage }) {
  const { lang } = useLang();
  const c = SEO_CONTENT[page][lang];
  return (
    <article className="mt-16 grid gap-10 border-t border-border pt-10 text-sm leading-relaxed text-muted-foreground lg:grid-cols-2 lg:gap-16">
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{c.heading}</h2>
        {c.paragraphs.map((p) => (
          <p key={p} className="mt-3">
            {p}
          </p>
        ))}
      </section>
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{c.faqHeading}</h2>
        <dl className="mt-3 space-y-4">
          {c.faq.map(({ q, a }) => (
            <div key={q}>
              <dt className="font-medium text-foreground">{q}</dt>
              <dd className="mt-1">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}
