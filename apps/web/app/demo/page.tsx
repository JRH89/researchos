import type { Metadata } from "next";
import { InteractiveDemo } from "@/components/interactive-demo";

export const metadata: Metadata = {
  title: "Interactive demo",
  description: "Try a guided, simulated ResearchOS workflow from a research question to a cited paper.",
  alternates: { canonical: "/demo" }
};

export default function DemoPage() {
  return <InteractiveDemo />;
}
