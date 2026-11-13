import { Link, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  Clock,
  Globe,
  House,
  LayoutGrid,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  useEffect,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CURRENCIES, isCurrency, useCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { TONE, type Tone } from "@/lib/tone";
import { track } from "@/lib/analytics";
import { isLangValue, useLang, useT } from "@/lib/i18n";
import { PENSION_KEY } from "@/lib/pension";
import { PLAN_KEY } from "@/lib/plan";
import { SALARY_KEY } from "@/lib/salary";

function HeaderSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <span className="relative inline-flex w-full">
      <select
        {...props}
        className={cn(
          "h-10 w-full appearance-none rounded-lg border border-input bg-card pl-3 pr-9 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  );
}

/** Language and currency behind one chip, so the header stays one row on a phone. */
function SettingsChip() {
  const { lang, setLang } = useLang();
  const { currency, setCurrency } = useCurrency();
  const { t } = useT();
  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={t("Language and currency")}
      >
        <Globe className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="tnum">
          {lang.toUpperCase()} · {symbol}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-4 rounded-xl p-4 shadow-card">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("Language")}
          </span>
          <HeaderSelect
            value={lang}
            onChange={(e) => {
              if (!isLangValue(e.target.value)) return;
              track("language_changed", { from: lang, to: e.target.value });
              setLang(e.target.value);
            }}
          >
            <option value="en">English</option>
            <option value="cs">Čeština</option>
          </HeaderSelect>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("Currency")}
          </span>
          <HeaderSelect
            value={currency}
            onChange={(e) => {
              if (!isCurrency(e.target.value)) return;
              track("currency_changed", { from: currency, to: e.target.value });
              setCurrency(e.target.value);
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol})
              </option>
            ))}
          </HeaderSelect>
        </label>
      </PopoverContent>
    </Popover>
  );
}

function Logomark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" className="shrink-0">
      <rect width="30" height="30" rx="9" className="fill-primary" />
      <rect x="7" y="16" width="4" height="7" rx="1.5" fill="#fff" opacity="0.55" />
      <rect x="13" y="11" width="4" height="12" rx="1.5" fill="#fff" opacity="0.8" />
      <rect x="19" y="6" width="4" height="17" rx="1.5" fill="#fff" />
    </svg>
  );
}

type Tab = {
  label: string;
  to: "/mzda" | "/duchod" | "/invest" | "/mortgage" | "/plan" | "/dashboard";
  Icon: ComponentType<{ className?: string }>;
  /** localStorage key that means "this tab has numbers". */
  storageKey?: string;
  tone: Tone;
};

const TABS: Tab[] = [
  { label: "Salary", to: "/mzda", Icon: Wallet, storageKey: SALARY_KEY, tone: "green" },
  { label: "Retirement", to: "/duchod", Icon: Clock, storageKey: PENSION_KEY, tone: "amber" },
  {
    label: "Invest",
    to: "/invest",
    Icon: TrendingUp,
    storageKey: "finbuddy.invest",
    tone: "green",
  },
  {
    label: "Mortgage",
    to: "/mortgage",
    Icon: House,
    storageKey: "finbuddy.mortgage",
    tone: "blue",
  },
  {
    label: "Financial independence",
    to: "/plan",
    Icon: Target,
    storageKey: PLAN_KEY,
    tone: "green",
  },
  { label: "Dashboard", to: "/dashboard", Icon: LayoutGrid, tone: "green" },
];

/** Which tabs already hold numbers. Re-read on every navigation and on cross-tab storage events. */
function useFilledTabs(pathname: string) {
  const [filled, setFilled] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const read = () => {
      try {
        setFilled(
          new Set(
            TABS.filter(
              (t) => t.storageKey && window.localStorage.getItem(t.storageKey) !== null,
            ).map((t) => t.to),
          ),
        );
      } catch {
        /* ignore */
      }
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, [pathname]);
  return filled;
}

function NavPills({ pathname, filled }: { pathname: string; filled: Set<string> }) {
  const { t } = useT();
  const filledCount = TABS.filter((tab) => filled.has(tab.to)).length;
  const dataTabs = TABS.filter((tab) => tab.storageKey).length;
  return (
    <>
      <Link
        to="/"
        aria-label={t("Home")}
        title={t("Home")}
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors",
          pathname === "/"
            ? "bg-accent-soft text-primary-deep"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
      >
        <House className="size-[18px]" />
      </Link>
      {TABS.map(({ label, to, Icon, tone }) => {
        const active = pathname.startsWith(to);
        const hasData = filled.has(to);
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-sm transition-colors",
              active
                ? cn("font-semibold", TONE[tone].pill)
                : "font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {t(label)}
            {to === "/dashboard" ? (
              <span
                className={cn(
                  "tnum inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                  active ? TONE[tone].badge : "bg-secondary text-muted-foreground",
                )}
                aria-label={t("{n} of {total} tabs filled", { n: filledCount, total: dataTabs })}
              >
                {filledCount}/{dataTabs}
              </span>
            ) : (
              hasData && (
                <span
                  className={cn("size-1.5 rounded-full", TONE[tone].dot)}
                  role="img"
                  aria-label={t("Has your numbers")}
                />
              )
            )}
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const filled = useFilledTabs(pathname);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-5">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <Logomark />
            <span className="font-display text-lg font-semibold tracking-tight">
              Money Kalkulačka
            </span>
          </Link>
          <nav
            aria-label="Primary"
            className="hidden flex-1 items-center justify-center gap-1 lg:flex"
          >
            <NavPills pathname={pathname} filled={filled} />
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <SettingsChip />
          </div>
        </div>
        <div className="mx-auto max-w-[1200px] px-5 pb-2 lg:hidden">
          <nav
            aria-label="Primary"
            className="-mx-5 flex items-center gap-1 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <NavPills pathname={pathname} filled={filled} />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-5 py-8 sm:py-10">{children}</main>
    </div>
  );
}
