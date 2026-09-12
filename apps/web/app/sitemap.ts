import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://research-os.org";
  return [
    { url: siteUrl, lastModified: new Date("2026-09-12"), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/blog`, lastModified: new Date("2026-09-12"), changeFrequency: "weekly", priority: 0.9 },
    ...blogPosts.map((post) => ({ url: `${siteUrl}/blog/${post.slug}`, lastModified: new Date(post.updatedAt), changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${siteUrl}/privacy`, lastModified: new Date("2026-09-12"), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/support`, lastModified: new Date("2026-09-12"), changeFrequency: "monthly", priority: 0.5 },
  ];
}
