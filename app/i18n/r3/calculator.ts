/**
 * The CLT × PJ calculator is Brazil-only, so its copy is Portuguese only (written for Brazil).
 */
export const calcCopy = {
  eyebrow: "Grátis · tabelas de 2026",
  h1: "CLT ou PJ? Faz a conta antes de responder a proposta",
  intro: "Coloca o salário CLT e o valor da nota PJ e vê o líquido de cada um, o pacote do ano e quanto a nota PJ precisa ser pra empatar com a CLT. Tudo roda no seu navegador — nada é salvo.",
  clt: "CLT", pj: "PJ (Simples Nacional)",
  fields: {
    gross: "Salário bruto (R$/mês)", meal: "VR/VA (R$/mês)", health: "Plano de saúde pago pela empresa (R$/mês)", plr: "PLR (R$/ano)", deps: "Dependentes",
    invoice: "Nota fiscal (R$/mês)", accountant: "Contador (R$/mês)", healthPj: "Plano de saúde por sua conta (R$/mês)", months: "Meses faturados no ano",
  },
  out: {
    monthlyNet: "Líquido por mês", yearNet: "Líquido no ano", package: "Pacote do ano", fgts: "FGTS do ano", benefits: "Benefícios do ano", plr: "PLR (bruta)",
    thirteenth: "13º líquido", vacation: "1/3 de férias líquido", inss: "INSS", irrf: "IR retido", das: "DAS (Simples)", proLabore: "Pró-labore", costs: "Contador + plano",
    annex: (a: string, rate: number) => `Anexo ${a} · alíquota efetiva ${rate.toLocaleString("pt-BR")}%`,
    fatorR: "Com pró-labore de 28% (Fator R) a empresa cai no Anexo III.",
    noFatorR: "Com pró-labore mínimo a empresa fica no Anexo V — aqui compensa mais.",
    diff: (v: string, better: string) => `Diferença no ano: ${v} a favor de ${better}`,
    equal: "Empate técnico no ano.",
    equivalent: "PJ equivalente a esta CLT",
    equivalentHint: (pct: number) => `Nota mensal que empata com o pacote CLT (${pct >= 0 ? "+" : ""}${pct}% sobre o bruto). A regra de bolso do mercado é de 40% a 50% a mais.`,
  },
  ask: {
    title: "Pretensão salarial",
    intro: "Quanto você quer ver na conta todo mês? A gente diz quanto pedir em cada modelo.",
    want: "Quero receber líquido (R$/mês)",
    clt: "Peça na CLT (bruto)", pj: "Peça no PJ (nota)",
  },
  share: "Copiar link com estes valores", shared: "Link copiado",
  print: "Imprimir",
  disclaimer: "Estimativa com as tabelas de 2026 — não substitui um contador. PLR tem tabela própria de IR e aparece bruta. 2026 é ano de teste da CBS/IBS; para quem está no Simples Nacional isso não muda o valor pago este ano — confirme com seu contador.",
  sourcesTitle: "De onde vêm os números",
  faqTitle: "Perguntas frequentes",
  faq: [
    { q: "Quanto a mais preciso ganhar no PJ pra valer a pena?", a: "Depende do pacote. Na CLT entram 13º, 1/3 de férias, FGTS e benefícios; no PJ, você paga imposto do Simples, INSS do pró-labore, contador e o próprio plano de saúde. A calculadora mostra o valor exato de empate pro seu caso — a regra de bolso costuma ficar entre 40% e 50% acima do bruto CLT." },
    { q: "O que mudou em 2026 no Imposto de Renda?", a: "A Lei 15.270/2025 zerou o IR retido pra quem ganha até R$ 5.000 por mês e reduziu o imposto de quem ganha até R$ 7.350. A calculadora já aplica essa redução." },
    { q: "O que é o Fator R?", a: "No Simples Nacional, empresas de serviço intelectual pagam pelo Anexo V (mais caro), a não ser que a folha — incluindo o pró-labore — seja pelo menos 28% do faturamento. Aí caem no Anexo III. A calculadora testa os dois jeitos e mostra o melhor." },
    { q: "E o que eu respondo quando perguntam minha pretensão?", a: "Decida o líquido que você quer e use a seção Pretensão: ela diz o bruto CLT e a nota PJ que chegam nesse valor. Responda com um número (ou uma faixa curta), não com “a combinar”." },
  ],
  trackerCta: "Tem proposta em mãos? Salva no seu tracker e compara de lá.",
};
