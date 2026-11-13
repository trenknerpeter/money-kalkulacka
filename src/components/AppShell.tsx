import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, House } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { CURRENCIES, isCurrency, useCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { isLangValue, useLang, useT } from "@/lib/i18n";

function HeaderSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <span className="relative inline-flex">
      <select
        {...props}
        className={cn(
          "h-9 appearance-none rounded-md border border-border bg-card pl-3 pr-9 text-sm font-medium text-foreground outline-none focus:border-primary",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  );
}

function LangSelect() {
  const { lang, setLang } = useLang();
  const { t } = useT();
  return (
    <HeaderSelect
      value={lang}
      onChange={(e) => {
        if (!isLangValue(e.target.value)) return;
        track("language_changed", { from: lang, to: e.target.value });
        setLang(e.target.value);
      }}
      aria-label={t("Language")}
    >
      <option value="en">EN</option>
      <option value="cs">CZ</option>
    </HeaderSelect>
  );
}

function CurrencySelect() {
  const { currency, setCurrency } = useCurrency();
  const { t } = useT();
  return (
    <HeaderSelect
      value={currency}
      onChange={(e) => {
        if (!isCurrency(e.target.value)) return;
        track("currency_changed", { from: currency, to: e.target.value });
        setCurrency(e.target.value);
      }}
      aria-label={t("Currency")}
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.code} ({c.symbol})
        </option>
      ))}
    </HeaderSelect>
  );
}

const TABS = [
  { label: "Salary", to: "/mzda" },
  { label: "Invest", to: "/invest" },
  { label: "Mortgage", to: "/mortgage" },
  { label: "Plan", to: "/plan" },
  { label: "Dashboard", to: "/dashboard" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            <span className="text-base font-semibold tracking-tight">Money Kalkulačka</span>
          </Link>
          <div className="flex items-center gap-2">
            <LangSelect />
            <CurrencySelect />
          </div>
        </div>
        <div className="mx-auto max-w-[1200px] px-5">
          <nav className="flex items-center gap-5 overflow-x-auto [scrollbar-width:none] sm:gap-7">
            <Link
              to="/"
              aria-label={t("Home")}
              title={t("Home")}
              className={cn(
                "-mb-px flex h-11 shrink-0 items-center border-b-2 transition-colors",
                pathname === "/"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <House className="size-[18px]" />
            </Link>
            {TABS.map((tab) => {
              const active = pathname.startsWith(tab.to);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    "-mb-px flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 text-sm transition-colors",
                    active
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(tab.label)}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-5 py-10">{children}</main>
    </div>
  );
}
