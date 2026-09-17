import type { ParsedJobUrl } from "@/lib/jobs/import";

/**
 * Canned provider responses for tests and keyless demos (JOB_IMPORT_MOCK=1). Fictional companies.
 */
const LEVER_ID = "5ac2d7a4-0000-4000-8000-000000000001";
export const FIXTURE_URLS = {
  lever: `https://jobs.lever.co/northwind/${LEVER_ID}`,
  greenhouse: "https://boards.greenhouse.io/contoso/jobs/4012345",
  ashby: "https://jobs.ashbyhq.com/fabrikam/5ac2d7a4-0000-4000-8000-000000000002",
};

export function jobFixture(p: ParsedJobUrl): unknown {
  if (p.provider === "lever") {
    return {
      text: "Lifecycle Marketing Manager", categories: { location: "Remote — Brazil", team: "Growth" }, createdAt: Date.parse("2026-09-01T00:00:00Z"),
      descriptionPlain: "Northwind is hiring a Lifecycle Marketing Manager to own onboarding and retention journeys. [fixture]",
      lists: [
        { text: "What you'll do", content: "<li>Run lifecycle campaigns in HubSpot</li><li>Own A/B testing and attribution reporting</li><li>Lead a team of two</li>" },
        { text: "Requirements", content: "<li>4+ years in lifecycle or CRM marketing</li><li>SQL for self-serve analysis</li>" },
      ],
      salaryRange: { currency: "BRL", min: 14000, max: 18000, interval: "per-month" },
    };
  }
  if (p.provider === "greenhouse") {
    return {
      title: "Growth Analyst", company_name: "Contoso", location: { name: "São Paulo" }, updated_at: "2026-09-10T12:00:00Z",
      content: "&lt;p&gt;Contoso is looking for a Growth Analyst.&lt;/p&gt;&lt;h3&gt;Responsibilities&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;Build dashboards in Power BI&lt;/li&gt;&lt;li&gt;Analyse funnels with SQL&lt;/li&gt;&lt;/ul&gt;",
    };
  }
  return {
    jobs: [{
      id: p.jobId, title: "Product Marketing Lead", location: "Remote", publishedAt: "2026-06-01T00:00:00Z",
      descriptionPlain: "Fabrikam needs a Product Marketing Lead. Responsibilities: positioning, launches, sales enablement. Requirements: 6+ years in B2B SaaS.",
      compensation: { compensationTierSummary: "US$ 90K – 120K" },
    }],
  };
}
