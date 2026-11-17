"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function MinutesBars({ data, unit = "min", height = 180, label, domain }: { data: { name: string; value: number }[]; unit?: string; height?: number; label: string; domain?: [number, number] }) {
  return (
    <figure aria-label={label} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#303740" strokeDasharray="3 4" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#AAB2BC", fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis domain={domain ?? [0, "auto"]} ticks={domain ? [0, 25, 50, 75, 100] : undefined} tickLine={false} axisLine={false} tick={{ fill: "#AAB2BC", fontSize: 11 }} allowDecimals={false} width={44} />
          <Tooltip cursor={{ fill: "rgba(255,255,255,.04)" }} contentStyle={{ background: "#1C2128", border: "1px solid #303740", borderRadius: 12, color: "#F6F7F9" }} formatter={(v) => [`${v} ${unit}`, ""]} separator="" />
          <Bar dataKey="value" fill="#17BCE4" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">{data.map((d) => `${d.name}: ${d.value} ${unit}`).join(", ")}</figcaption>
    </figure>
  );
}
