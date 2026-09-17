import { lpRoute } from "@/components/localized/LpRoute";

// Unknown slugs render on demand and hit notFound() (dynamicParams=false made Next log an
// internal NoFallbackError for every stray URL).
const route = lpRoute("es");
export const generateStaticParams = route.generateStaticParams;
export const generateMetadata = route.generateMetadata;
export default route.Page;
