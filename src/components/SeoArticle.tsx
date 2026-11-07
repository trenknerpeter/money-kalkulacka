import { useLang } from "@/lib/i18n";
import { SEO_CONTENT, type SeoPage } from "@/lib/seoContent";

/** Short explainer + FAQ under a calculator. Plain markup so it's all in the server HTML. */
export function SeoArticle({ page }: { page: SeoPage }) {
  const { lang } = useLang();
  const c = SEO_CONTENT[page][lang];
  return (
    <article className="mx-auto mt-16 max-w-2xl border-t border-border pt-10 text-sm leading-relaxed text-muted-foreground">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{c.heading}</h2>
      {c.paragraphs.map((p) => (
        <p key={p} className="mt-3">
          {p}
        </p>
      ))}
      <h2 className="mt-8 text-lg font-semibold tracking-tight text-foreground">{c.faqHeading}</h2>
      <dl className="mt-3 space-y-4">
        {c.faq.map(({ q, a }) => (
          <div key={q}>
            <dt className="font-medium text-foreground">{q}</dt>
            <dd className="mt-1">{a}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
