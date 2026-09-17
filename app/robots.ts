import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/library", "/applications", "/interview", "/print", "/success", "/login", "/signup"] },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
