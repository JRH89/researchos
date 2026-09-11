import type { Metadata } from "next";
import "./styles.css";
import "./theme.css";

export const metadata: Metadata = {
  title: "ResearchOS — evidence, not just answers",
  description: "An MCP-powered technical research agent with inspectable provenance."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
