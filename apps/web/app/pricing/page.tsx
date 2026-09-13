import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/public-info-page";

export const metadata: Metadata = { title: "Pricing", description: "Flexible ResearchOS credit packs and monthly research memberships.", alternates: { canonical: "/pricing" } };

const packs = [["Starter", "60 credits", "$5", "A few focused research runs."], ["Standard", "165 credits", "$12", "Best for an active assignment."], ["Semester", "400 credits", "$25", "For a full course load of research."]];
const memberships = [["Study", "120 credits / month", "$8", "For one or two active classes."], ["Scholar", "280 credits / month", "$15", "For steady weekly research."], ["Researcher", "650 credits / month", "$29", "For intensive, ongoing work."]];

function Cards({ items }: { items: string[][] }) { return <div className="info-price-grid">{items.map(([name, credits, price, detail]) => <article key={name}><p>{name}</p><strong>{credits}</strong><span>{price}{credits.includes("month") ? " / month" : " one time"}</span><small>{detail}</small><a href="/?signin=1">Choose {name}</a></article>)}</div>; }
export default function PricingPage() { return <PublicInfoPage eyebrow="Simple, flexible pricing" title="Pay for the research you need." lede="Buy credits when you need them, or keep your balance refreshed with a monthly membership." image="/images/pages/pricing-hero.png"><section className="info-intro"><p className="eyebrow">One-time credits</p><h2>Use them when you need them.</h2><p>Credit packs do not expire. Research and paper writing reserve credits before they run and reconcile against actual usage.</p></section><Cards items={packs} /><section className="info-intro info-section-gap"><p className="eyebrow">Monthly memberships</p><h2>Keep your research moving.</h2><p>Monthly credits refresh every billing period. You can manage or cancel your subscription through the Stripe billing portal.</p></section><Cards items={memberships} /></PublicInfoPage>; }
