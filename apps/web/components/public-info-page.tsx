import { PublicSiteFooter, PublicSiteHeader } from "@/components/public-site-chrome";

type PageProps = {
  eyebrow: string;
  title: string;
  lede: string;
  image: string;
  children: React.ReactNode;
};

export function PublicInfoPage({ eyebrow, title, lede, image, children }: PageProps) {
  return <main className="site-page info-page">
    <PublicSiteHeader />
    <section className="info-hero" style={{ "--info-hero-image": `url(${image})` } as React.CSSProperties}>
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{lede}</p><a className="info-hero-cta" href="/?signin=1">Start researching</a></div>
    </section>
    <article className="info-content">{children}</article>
    <PublicSiteFooter />
  </main>;
}
