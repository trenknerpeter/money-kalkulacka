export const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  if (!isFinite(n) || isNaN(n)) return fallback;
  return n < 0 ? 0 : n;
};

/* ---------------------------------- Invest --------------------------------- */

export type InvestYear = {
  year: number;
  contributedThisYear: number;
  totalContributed: number;
  growth: number;
  balance: number;
};

export type InvestResult = {
  finalValue: number;
  totalContributed: number;
  totalGrowth: number;
  realValue: number;
  growthShare: number;
  rows: InvestYear[];
};

export function computeInvest(input: {
  initial: number;
  monthly: number;
  rate: number;
  years: number;
  inflation: number;
}): InvestResult {
  const P0 = num(input.initial);
  const PMT = num(input.monthly);
  const years = Math.max(0, Math.round(num(input.years)));
  const r = num(input.rate) / 100 / 12;
  const n = years * 12;

  const fvAt = (months: number) =>
    r === 0
      ? P0 + PMT * months
      : P0 * Math.pow(1 + r, months) + PMT * ((Math.pow(1 + r, months) - 1) / r);

  const rows: InvestYear[] = [];
  for (let y = 0; y <= years; y++) {
    const months = y * 12;
    const balance = fvAt(months);
    const totalContributed = P0 + PMT * months;
    rows.push({
      year: y,
      contributedThisYear: y === 0 ? P0 : PMT * 12,
      totalContributed,
      growth: balance - totalContributed,
      balance,
    });
  }

  const finalValue = fvAt(n);
  const totalContributed = P0 + PMT * n;
  const totalGrowth = finalValue - totalContributed;
  const realValue = finalValue / Math.pow(1 + num(input.inflation) / 100, years);

  return {
    finalValue,
    totalContributed,
    totalGrowth,
    realValue,
    growthShare: finalValue > 0 ? totalGrowth / finalValue : 0,
    rows,
  };
}

/* --------------------------------- Mortgage -------------------------------- */

export type MortgageYear = {
  year: number;
  interestPaid: number;
  principalPaid: number;
  balance: number;
};

export type MortgageScenario = {
  rate: number;
  monthly: number;
  months: number;
  totalPaid: number;
  totalInterest: number;
  rows: MortgageYear[];
  balanceByYear: number[];
};

export function solvePayment(principal: number, annualRate: number, years: number): number {
  const P = num(principal);
  const n = Math.max(0, num(years)) * 12;
  if (n === 0) return 0;
  const r = num(annualRate) / 100 / 12;
  if (r === 0) return P / n;
  return (P * r) / (1 - Math.pow(1 + r, -n));
}

/** Returns months, or null when the payment never amortises the loan. */
export function solveMonths(principal: number, annualRate: number, monthly: number): number | null {
  const P = num(principal);
  const M = num(monthly);
  if (P === 0) return 0;
  if (M <= 0) return null;
  const r = num(annualRate) / 100 / 12;
  if (r === 0) return P / M;
  if (M <= P * r) return null;
  return -Math.log(1 - (P * r) / M) / Math.log(1 + r);
}

export function buildScenario(
  principal: number,
  annualRate: number,
  months: number,
  monthly: number,
  extra?: { amount: number; month: number; yearly?: boolean },
): MortgageScenario {
  const P = num(principal);
  const r = num(annualRate) / 100 / 12;
  const maxN = Math.max(0, Math.round(months));
  const M = num(monthly);
  const extraAmt = extra ? num(extra.amount) : 0;
  const extraMonth = extra ? Math.max(0, Math.round(extra.month)) : -1;

  let balance = P;
  let totalPaid = 0;
  let m = 0;
  let yearInterest = 0;
  let yearPrincipal = 0;
  const rows: MortgageYear[] = [];
  const balanceByYear: number[] = [P];

  while (balance > 0 && m < maxN) {
    m++;
    const interest = balance * r;
    const pay = Math.min(M, balance + interest);
    const principalPart = pay - interest;
    balance -= principalPart;
    totalPaid += pay;
    yearInterest += interest;
    yearPrincipal += principalPart;

    const isExtraMonth =
      extraMonth > 0 && (extra?.yearly ? m >= extraMonth && (m - extraMonth) % 12 === 0 : m === extraMonth);
    if (isExtraMonth && extraAmt > 0 && balance > 0) {
      const e = Math.min(extraAmt, balance);
      balance -= e;
      totalPaid += e;
      yearPrincipal += e;
    }

    if (m % 12 === 0 || balance === 0 || m === maxN) {
      rows.push({
        year: Math.ceil(m / 12),
        interestPaid: Math.max(0, yearInterest),
        principalPaid: Math.max(0, yearPrincipal),
        balance,
      });
      balanceByYear.push(balance);
      yearInterest = 0;
      yearPrincipal = 0;
    }
  }

  return {
    rate: num(annualRate),
    monthly: M,
    months: m,
    totalPaid,
    totalInterest: Math.max(0, totalPaid - P),
    rows,
    balanceByYear,
  };
}

/**
 * First year in which what the investment earns beats what you paid in that year.
 * Rows run from year 0; null if growth never overtakes the deposits in the horizon.
 */
export function growthCrossoverYear(rows: InvestYear[]): number | null {
  for (let i = 1; i < rows.length; i++) {
    const gain = rows[i]!.growth - rows[i - 1]!.growth;
    if (rows[i]!.contributedThisYear > 0 && gain > rows[i]!.contributedThisYear) return rows[i]!.year;
  }
  return null;
}
