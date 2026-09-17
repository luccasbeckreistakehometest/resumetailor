import { describe, expect, it } from "vitest";
import { htmlToText, normaliseJob, parseJobUrl } from "@/lib/jobs/import";
import { FIXTURE_URLS, jobFixture } from "@/lib/jobs/fixtures";
import { redFlags } from "@/lib/jobs/redflags";

describe("job link import", () => {
  it("maps the three providers to their public APIs", () => {
    expect(parseJobUrl("https://boards.greenhouse.io/contoso/jobs/4012345")?.apiUrl).toBe("https://boards-api.greenhouse.io/v1/boards/contoso/jobs/4012345");
    expect(parseJobUrl("https://job-boards.greenhouse.io/contoso/jobs/4012345?gh_src=x")?.provider).toBe("greenhouse");
    expect(parseJobUrl(FIXTURE_URLS.lever)?.apiUrl).toBe("https://api.lever.co/v0/postings/northwind/5ac2d7a4-0000-4000-8000-000000000001");
    expect(parseJobUrl(FIXTURE_URLS.ashby)?.apiUrl).toBe("https://api.ashbyhq.com/posting-api/job-board/fabrikam?includeCompensation=true");
  });
  it("refuses everything else", () => {
    for (const bad of [
      "https://boards.greenhouse.io.evil.com/contoso/jobs/4012345", "https://evil.com/boards.greenhouse.io/contoso/jobs/1",
      "https://www.linkedin.com/jobs/view/1", "http://169.254.169.254/latest/meta-data", "http://boards.greenhouse.io/contoso/jobs/4012345",
      "https://user:pw@jobs.lever.co/x/5ac2d7a4-0000-4000-8000-000000000001", "https://jobs.lever.co:8443/x/5ac2d7a4-0000-4000-8000-000000000001",
      "https://jobs.lever.co/x/not-a-uuid", "https://portal.gupy.io/job/123", "not a url", "https://127.0.0.1/jobs/1",
    ]) expect(parseJobUrl(bad), bad).toBeNull();
  });
  it("normalises each provider's payload into plain text", () => {
    const lever = normaliseJob(parseJobUrl(FIXTURE_URLS.lever)!, jobFixture(parseJobUrl(FIXTURE_URLS.lever)!))!;
    expect(lever).toMatchObject({ title: "Lifecycle Marketing Manager", location: "Remote — Brazil" });
    expect(lever.text).toContain("- Run lifecycle campaigns in HubSpot");
    expect(lever.salary).toContain("14000");
    const gh = normaliseJob(parseJobUrl(FIXTURE_URLS.greenhouse)!, jobFixture(parseJobUrl(FIXTURE_URLS.greenhouse)!))!;
    expect(gh.text).toContain("- Build dashboards in Power BI");
    expect(gh.company).toBe("Contoso");
    expect(normaliseJob(parseJobUrl(FIXTURE_URLS.ashby)!, { jobs: [] })).toBeNull();
    expect(htmlToText("&lt;b&gt;Hi&lt;/b&gt; &amp; <script>x</script>bye")).toBe("Hi & bye");
  });
});

describe("red flags", () => {
  it("flags the fake-job patterns as high", () => {
    expect(redFlags("Vaga de assistente. É necessário pagar a taxa de R$ 60 do curso de capacitação antes de começar.")).toMatchObject({ level: "high", flags: expect.arrayContaining(["fee"]) });
    expect(redFlags("Interessados chamar somente pelo WhatsApp (11) 99999-0000").flags).toContain("messaging");
    expect(redFlags("Envie seu currículo para rh.vagas2026@gmail.com").flags).toContain("freemail");
    expect(redFlags("Renda extra: curtir vídeos e ganhe até R$ 300 por dia").flags).toContain("tasks");
    expect(redFlags("Para a admissão, envie seu CPF e dados bancários hoje").flags).toContain("data");
    expect(redFlags("Sem experiência, início imediato, salário de R$ 8.500").flags).toContain("toogood");
  });
  it("flags maybe-not-real openings as soft, and leaves a normal posting alone", () => {
    expect(redFlags("Cadastre-se no nosso banco de talentos para futuras oportunidades na área comercial.")).toMatchObject({ level: "soft", flags: expect.arrayContaining(["pool"]) });
    expect(redFlags("Analista", { postedAt: "2026-01-01T00:00:00Z", now: Date.parse("2026-09-17T00:00:00Z") }).flags).toContain("stale");
    const normal = "Buscamos Analista de Dados para o time de Growth. Responsabilidades: construir dashboards em Power BI, analisar funis com SQL, apoiar testes A/B e apresentar resultados para a liderança. Requisitos: 3 anos de experiência com análise de dados, SQL avançado e boa comunicação. Benefícios: vale-refeição, plano de saúde e trabalho híbrido em São Paulo. Processo seletivo: entrevista com RH, case técnico e conversa com a gestora.";
    expect(redFlags(normal)).toEqual({ level: null, flags: [] });
  });
  it("never calls benefits, a plain WhatsApp number or an ordinary address a scam", () => {
    const normal = "Buscamos Analista de Dados para o time de Growth. Responsabilidades: construir dashboards em Power BI, analisar funis com SQL, apoiar testes A/B e apresentar resultados para a liderança. Requisitos: 3 anos de experiência com análise de dados, SQL avançado e boa comunicação. Processo seletivo: entrevista com RH, case técnico e conversa com a gestora.";
    const benign = [
      "Benefícios: vale-refeição, plano de saúde, investimento em treinamentos e certificações.",
      "Oferecemos auxílio para pagamento de cursos de idiomas.",
      "A empresa cobre 100% do custo do curso de inglês.",
      "Envie seu currículo pelo e-mail ou WhatsApp: (11) 98888-7777",
      "Chame no WhatsApp para tirar dúvidas sobre o curso pelo WhatsApp da escola.",
      "Informe no assunto do e-mail o cargo e a cidade.",
      "Dúvidas: christopher.silva@gmail.com",
      "We pay for your training and cover your certification exam fee.",
      "La empresa paga el curso de inglés y ofrece ayuda para capacitación.",
    ];
    for (const line of benign) expect(redFlags(`${normal} ${line}`).level, line).not.toBe("high");
    expect(redFlags(`${normal} Benefícios: auxílio para pagamento de cursos de idiomas.`)).toEqual({ level: null, flags: [] });
  });
  it("still catches the charge when it is aimed at the candidate", () => {
    for (const line of [
      "Para começar, você precisa pagar o kit de boas-vindas.",
      "Taxa de inscrição: R$ 49,90.",
      "Faça um pix de R$ 50 para garantir sua vaga.",
      "Applicants must pay a registration fee before the interview.",
      "Debes pagar el curso de capacitación antes de empezar.",
    ]) expect(redFlags(line).flags, line).toContain("fee");
    expect(redFlags("Contato apenas via WhatsApp.").flags).toContain("messaging");
    expect(redFlags("Envie o currículo para recrutamento.vagas@hotmail.com").flags).toContain("freemail");
  });
});
