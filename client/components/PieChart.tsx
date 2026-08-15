'use client';
import React from 'react';

type Slice = { label: string; value: number; color?: string };
type Props = {
  data: Slice[];
  width?: number;
  height?: number;
  innerRadius?: number; // >0 হলে donut
  className?: string;
  legend?: boolean;
};

export default function PieChart({
  data,
  width = 260,
  height = 220,
  innerRadius = 0,
  className = '',
  legend = true,
}: Props) {
  const total = Math.max(1, data.reduce((s, d) => s + Math.max(0, d.value || 0), 0));
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(cx, cy) - 4;
  const colors = ['#4f46e5', '#16a34a', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#22c55e'];

  let angle = -Math.PI / 2;
  const pathFor = (start: number, end: number) => {
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);

    if (innerRadius > 0) {
      const ir = r * innerRadius;
      const xi2 = cx + ir * Math.cos(end);
      const yi2 = cy + ir * Math.sin(end);
      const xi1 = cx + ir * Math.cos(start);
      const yi1 = cy + ir * Math.sin(start);
      return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ir} ${ir} 0 ${large} 0 ${xi1} ${yi1} Z`;
    }
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  };

  const slices = data.map((d, i) => {
    const fraction = (Math.max(0, d.value) || 0) / total;
    const start = angle;
    const end = start + 2 * Math.PI * fraction;
    angle = end;
    return {
      path: pathFor(start, end),
      color: d.color || colors[i % colors.length],
      label: d.label,
      value: d.value,
      percent: Math.round(fraction * 100),
    };
  });

  return (
		<div
			className={className}
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: 12,
			}}
		>
			<svg width={width} height={height}>
				{slices.map((s, i) => (
					<path
						key={i}
						d={s.path}
						fill={s.color}
						stroke="white"
						strokeWidth={1}
					/>
				))}
			</svg>

			{legend && (
				<div className="w-full text-xs text-slate-600 space-y-2">
					{slices.map((s, i) => (
						<div key={i} className="flex items-center gap-2">
							<span
								className="inline-block w-3 h-3 rounded"
								style={{ background: s.color }}
							/>
							<span className="flex-1">{s.label}</span>
							<span className="font-medium">{s.percent}%</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
