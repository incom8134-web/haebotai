import { HelpHome } from "@/components/help/help-pages";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("도움말", "Help");

export default function HelpPage() {
  return <HelpHome />;
}
