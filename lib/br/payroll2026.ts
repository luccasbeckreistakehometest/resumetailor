/**
 * Brazilian payroll math for 2026: CLT take-home and package vs PJ (Simples Nacional) take-home.
 * An ESTIMATE for comparing offers — not accounting advice. Every constant carries its source.
 * Pure functions; the calculator page runs them in the browser.
 */
export const TABLES_2026 = {
  verifiedAt: "2026-09-17",
  sources: {
    inss: "Portaria Interministerial MPS/MF nº 13/2026 (faixas e teto do INSS 2026)",
    irrf: "Receita Federal — tabelas de 2026 (gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026)",
    reducao: "Lei nº 15.270/2025 — redução do IR mensal para rendimentos até R$ 7.350",
    simples: "Lei Complementar nº 123/2006, Anexos III e V (redação da LC 155/2016); Fator R (art. 18, § 5º-J)",
    fgts: "Lei nº 8.036/1990, art. 15 (8%)",
  },
  minimumWage: 1621.0,
  /** INSS employee brackets: [upper limit, rate]. Progressive; the last limit is the ceiling. */
  inss: [[1621.0, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]] as [number, number][],
  /** IRRF monthly table: [upper limit, rate, deduction]. */
  irrf: [[2428.8, 0, 0], [2826.65, 0.075, 182.16], [3751.05, 0.15, 394.16], [4664.68, 0.225, 675.49], [Infinity, 0.275, 908.73]] as [number, number, number][],
  simplifiedDiscount: 607.2,
  dependant: 189.59,
  /** Lei 15.270/2025: up to 5.000 → no tax; 5.000,01–7.350 → reduction = 978,62 − 0,133145 × taxable income. */
  reduction: { zeroUpTo: 5000, upTo: 7350, a: 978.62, b: 0.133145 },
  fgts: 0.08,
  proLaboreInss: 0.11,
  /** Simples Nacional: [RBT12 upper limit, nominal rate, deduction]. */
  anexoIII: [[180_000, 0.06, 0], [360_000, 0.112, 9_360], [720_000, 0.135, 17_640], [1_800_000, 0.16, 35_640], [3_600_000, 0.21, 125_640], [4_800_000, 0.33, 648_000]] as [number, number, number][],
  anexoV: [[180_000, 0.155, 0], [360_000, 0.18, 4_500], [720_000, 0.195, 9_900], [1_800_000, 0.205, 17_100], [3_600_000, 0.23, 62_100], [4_800_000, 0.305, 540_000]] as [number, number, number][],
  fatorR: 0.28,
};
const T = TABLES_2026;
/** Currency rounding, half up (121.575 → 121.58) despite binary floats. */
export const round2 = (n: number) => Math.round(n * 100 + (n >= 0 ? 1e-6 : -1e-6)) / 100;

export function inss(gross: number): number {
  let prev = 0, total = 0;
  for (const [limit, rate] of T.inss) {
    if (gross <= prev) break;
    total += (Math.min(gross, limit) - prev) * rate;
    prev = limit;
  }
  return round2(total);
}

/** Table tax on a calculation base (no Lei 15.270 reduction). */
export function irrfTable(base: number): number {
  for (const [limit, rate, ded] of T.irrf) if (base <= limit) return round2(Math.max(0, base * rate - ded));
  return 0;
}

/**
 * Monthly withholding on a salary: base = gross − max(INSS + dependants, simplified discount);
 * then the Lei 15.270 reduction, which is computed on the gross taxable income.
 */
export function irrf(gross: number, dependants = 0, inssPaid = inss(gross)): number {
  const legal = inssPaid + dependants * T.dependant;
  const base = Math.max(0, gross - Math.max(legal, T.simplifiedDiscount));
  const tax = irrfTable(base);
  const r = T.reduction;
  const reduction = gross <= r.zeroUpTo ? tax : gross <= r.upTo ? Math.max(0, r.a - r.b * gross) : 0;
  return round2(Math.max(0, tax - reduction));
}

export const cltNet = (gross: number, dependants = 0) => round2(gross - inss(gross) - irrf(gross, dependants));

export interface CltInput { gross: number; dependants?: number; mealMonthly?: number; healthMonthly?: number; plrYear?: number }
/**
 * A year of CLT: 12 salaries, the 13th, the vacation third, FGTS on all of it, and benefits.
 * PLR has its own exclusive tax table and is shown gross (noted on the page).
 */
export function cltAnnual(i: CltInput) {
  const deps = i.dependants ?? 0;
  const monthlyNet = cltNet(i.gross, deps);
  const thirteenthNet = cltNet(i.gross, deps);
  const vacationThirdNet = round2(cltNet(i.gross * (4 / 3), deps) - cltNet(i.gross, deps));
  const fgts = round2(i.gross * (12 + 1 + 1 / 3) * T.fgts);
  const benefits = round2(((i.mealMonthly ?? 0) + (i.healthMonthly ?? 0)) * 12);
  const plr = round2(i.plrYear ?? 0);
  const netYear = round2(monthlyNet * 12 + thirteenthNet + vacationThirdNet);
  return { monthlyNet, inss: inss(i.gross), irrf: irrf(i.gross, deps), thirteenthNet, vacationThirdNet, fgts, benefits, plr, netYear, packageYear: round2(netYear + fgts + benefits + plr) };
}

/** Effective Simples rate for a 12-month revenue in one annex. */
export function simplesRate(rbt12: number, annex: "III" | "V"): number {
  const table = annex === "III" ? T.anexoIII : T.anexoV;
  const row = table.find(([limit]) => rbt12 <= limit) ?? table[table.length - 1];
  const [, nominal, ded] = row;
  return rbt12 <= 0 ? 0 : Math.max(0, (rbt12 * nominal - ded) / rbt12);
}

export interface PjInput { invoice: number; accountant?: number; healthMonthly?: number; monthsBilled?: number }
/**
 * PJ take-home in the Simples Nacional, both ways, and the better one: Anexo III with a pró-labore
 * of 28% of revenue (Fator R), or Anexo V with the minimum-wage pró-labore. Pró-labore pays 11%
 * INSS (to the ceiling) and IRRF; the remaining profit is distributed tax-free.
 */
export function pjNet(i: PjInput) {
  const rbt12 = i.invoice * 12;
  const costs = (i.accountant ?? 0) + (i.healthMonthly ?? 0);
  const scenario = (annex: "III" | "V") => {
    const proLabore = annex === "III" ? Math.max(T.minimumWage, round2(i.invoice * T.fatorR)) : T.minimumWage;
    const rate = simplesRate(rbt12, annex);
    const das = round2(i.invoice * rate);
    const inssPl = round2(Math.min(proLabore, T.inss[T.inss.length - 1][0]) * T.proLaboreInss);
    const irPl = irrf(proLabore, 0, inssPl);
    const monthlyNet = round2(i.invoice - das - inssPl - irPl - costs);
    return { annex, rate: round2(rate * 10000) / 100, das, proLabore, inss: inssPl, irrf: irPl, costs: round2(costs), monthlyNet };
  };
  const iii = scenario("III");
  const v = scenario("V");
  const best = iii.monthlyNet >= v.monthlyNet ? iii : v;
  const months = i.monthsBilled ?? 12;
  return { best, anexoIII: iii, anexoV: v, netYear: round2(best.monthlyNet * months) };
}

/** Smallest x in [lo, hi] with f(x) ≥ target (f increasing). */
function solve(f: (x: number) => number, target: number, lo = 0, hi = 1_000_000): number {
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (f(mid) >= target) hi = mid; else lo = mid;
  }
  return round2(hi);
}

/** The PJ monthly invoice whose year matches this CLT year (net + FGTS + benefits + PLR). */
export const pjEquivalent = (clt: CltInput, pj: Omit<PjInput, "invoice"> = {}) =>
  solve((x) => pjNet({ ...pj, invoice: x }).netYear, cltAnnual(clt).packageYear);

/** The CLT gross that pays a target monthly net. */
export const grossForNet = (net: number, dependants = 0) => solve((x) => cltNet(x, dependants), net);

/** The PJ invoice that pays a target monthly net. */
export const invoiceForNet = (net: number, pj: Omit<PjInput, "invoice"> = {}) => solve((x) => pjNet({ ...pj, invoice: x }).best.monthlyNet, net);
