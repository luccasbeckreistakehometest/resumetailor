import { describe, expect, it } from "vitest";
import { cltAnnual, cltNet, grossForNet, inss, invoiceForNet, irrf, irrfTable, pjEquivalent, pjNet, simplesRate } from "@/lib/br/payroll2026";

describe("CLT 2026", () => {
  it("INSS is progressive and capped", () => {
    expect(inss(3000)).toBe(248.6);
    expect(inss(10000)).toBe(988.09);
    expect(inss(1621)).toBe(121.58);
  });
  it("IRRF applies the Lei 15.270 reduction on gross taxable income", () => {
    expect(irrf(5000)).toBe(0);
    expect(irrf(2000)).toBe(0);
    // 7.350: the reduction is ~0, so the plain table applies.
    const plain7350 = irrfTable(7350 - inss(7350));
    expect(Math.abs(irrf(7350) - plain7350)).toBeLessThanOrEqual(0.01);
    // 6.000: table tax minus (978,62 − 0,133145 × 6.000).
    const table6000 = irrfTable(6000 - inss(6000));
    expect(irrf(6000)).toBeCloseTo(table6000 - (978.62 - 0.133145 * 6000), 1);
    expect(irrf(6000)).toBeCloseTo(385.1, 1);
    // A dependant lowers the tax above the reduction band.
    expect(irrf(12000, 1)).toBeLessThan(irrf(12000, 0));
  });
  it("gross for a target net inverts the net within R$ 1", () => {
    for (const g of [2500, 4800, 8000, 15000]) expect(Math.abs(grossForNet(cltNet(g)) - g)).toBeLessThanOrEqual(1);
  });
  it("the year includes the 13th, the vacation third, FGTS and benefits", () => {
    const y = cltAnnual({ gross: 8000, mealMonthly: 800, healthMonthly: 500 });
    expect(y.fgts).toBeCloseTo(8000 * (13 + 1 / 3) * 0.08, 1);
    expect(y.benefits).toBe(15600);
    expect(y.packageYear).toBeGreaterThan(y.monthlyNet * 13);
  });
});

describe("PJ 2026 (Simples Nacional)", () => {
  it("Fator R switches Anexo V to Anexo III when the pró-labore reaches 28%", () => {
    expect(simplesRate(180_000, "III")).toBeCloseTo(0.06, 5);
    expect(simplesRate(180_000, "V")).toBeCloseTo(0.155, 5);
    expect(simplesRate(300_000, "III")).toBeCloseTo((300_000 * 0.112 - 9_360) / 300_000, 6);
    const p = pjNet({ invoice: 15000 });
    expect(p.anexoIII.proLabore).toBe(4200);
    expect(p.anexoV.proLabore).toBe(1621);
    expect(p.best.annex).toBe("III");
  });
  it("the PJ equivalent grows with the CLT salary, and the invoice for a net inverts", () => {
    const a = pjEquivalent({ gross: 6000 });
    const b = pjEquivalent({ gross: 9000 });
    const c = pjEquivalent({ gross: 12000 });
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(a).toBeGreaterThan(6000);
    const inv = invoiceForNet(10000, { accountant: 150 });
    expect(Math.abs(pjNet({ invoice: inv, accountant: 150 }).best.monthlyNet - 10000)).toBeLessThanOrEqual(1);
  });
});
