"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ValueLine({ data, domain, label, height = 160, unit = "" }: { data: { name: string; value: number | null }[]; domain: [number, number]; label: string; height?: number; unit?: string }) {
  return (
    <figure aria-label={label} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#303740" strokeDasharray="3 4" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#AAB2BC", fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis domain={domain} tickLine={false} axisLine={false} tick={{ fill: "#AAB2BC", fontSize: 11 }} width={44} allowDecimals={false} />
          <Tooltip contentStyle={{ background: "#1C2128", border: "1px solid #303740", borderRadius: 12, color: "#F6F7F9" }} formatter={(v) => [`${v}${unit}`, ""]} separator="" />
          <Line type="monotone" dataKey="value" stroke="#D7DEE7" strokeWidth={2} dot={{ r: 3, fill: "#D7DEE7" }} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">{data.filter((d) => d.value !== null).map((d) => `${d.name}: ${d.value}${unit}`).join(", ")}</figcaption>
    </figure>
  );
}
