import type { Metadata } from "next";
import "./styles.css";
import "./theme.css";
import "./auth.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://research-os.org"),
  title: { default: "ResearchOS | Evidence-backed research", template: "%s | ResearchOS" },
  description: "Plan research, inspect evidence provenance, and write cited papers from selected research runs.",
  keywords: ["research agent", "MCP", "source provenance", "cited papers", "academic research"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/", siteName: "ResearchOS", title: "ResearchOS | Evidence-backed research", description: "Plan, inspect, and write from traceable source evidence.", images: [{ url: "/images/landing/social-preview.png", width: 1200, height: 630, alt: "ResearchOS evidence-backed research" }] },
  twitter: { card: "summary_large_image", title: "ResearchOS | Evidence-backed research", description: "Plan, inspect, and write from traceable source evidence.", images: ["/images/landing/social-preview.png"] },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
