import type { Metadata } from "next";
import { ToolsHub } from "@/components/ToolsHub";
import { seoCopy } from "@/app/i18n/r3/seo";
import { pageMetadata } from "@/lib/i18n/metadata";

export const metadata: Metadata = pageMetadata("tools", "es", seoCopy.es.tools);

export default function ToolsPage() {
  return <ToolsHub />;
}
