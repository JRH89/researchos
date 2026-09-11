import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ResearchOS: evidence-backed research";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#f4f6f7", color: "#223640", padding: "70px", position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", width: "63%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700 }}><span style={{ display: "flex", width: 50, height: 50, alignItems: "center", justifyContent: "center", borderRadius: 25, background: "#2d4652", color: "white" }}>R</span>ResearchOS</div>
        <div style={{ marginTop: 80, fontSize: 70, lineHeight: 1.02, fontWeight: 700, letterSpacing: -3 }}>Research with evidence you can trace.</div>
        <div style={{ marginTop: 28, fontSize: 28, lineHeight: 1.35, color: "#5f7480" }}>Plan research, inspect source provenance, and write cited papers from selected research runs.</div>
      </div>
      <div style={{ position: "absolute", right: 70, top: 105, width: 310, height: 410, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {["Question", "Evidence", "Cited paper"].map((label, index) => <div key={label} style={{ display: "flex", alignItems: "center", gap: 18 }}><div style={{ width: 68, height: 68, borderRadius: 34, background: index === 1 ? "#91b7c3" : "#d9e5e9", border: "2px solid #527482" }} /><div style={{ width: 195, height: 82, display: "flex", alignItems: "center", padding: "0 22px", background: "#fff", border: "2px solid #d0dde1", borderRadius: 10, fontSize: 22, color: "#314b57" }}>{label}</div></div>)}
      </div>
    </div>,
    size,
  );
}
