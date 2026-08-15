'use client';
import React from 'react';
import { nf } from "@/lib/i18n";

type Props = {
	series: { name: string; data: number[] }[];
	categories?: string[]; // optional x-axis labels
	width?: number;
	height?: number;
	className?: string;
	barGap?: number; // pixel gap between bars in a group
};

export default function BarChart({
	series,
	categories,
	width = 560,
	height = 220,
	className = "",
	barGap = 4,
}: Props) {
	const count = Math.max(...series.map((s) => s.data.length), 0);
	const labels =
		categories && categories.length === count
			? categories
			: Array.from({ length: count }, (_, i) => `${i + 1}`);

	const maxVal = Math.max(
		1,
		...series.flatMap((s) => s.data.map((v) => Math.max(0, v))),
	);

	const padding = { top: 10, right: 10, bottom: 22, left: 36 };
	const chartW = width - padding.left - padding.right;
	const chartH = height - padding.top - padding.bottom;

	const groupWidth = chartW / Math.max(count, 1);
	const barWidth =
		(groupWidth - (series.length - 1) * barGap) / Math.max(series.length, 1);

	const colors = ["#4f46e5", "#16a34a", "#f59e0b", "#ef4444", "#06b6d4"];

	return (
		<svg width={width} height={height} className={className}>
			{/* axes */}
			<line
				x1={padding.left}
				y1={padding.top}
				x2={padding.left}
				y2={height - padding.bottom}
				stroke="#e5e7eb"
			/>
			<line
				x1={padding.left}
				y1={height - padding.bottom}
				x2={width - padding.right}
				y2={height - padding.bottom}
				stroke="#e5e7eb"
			/>

			{/* y ticks (0%, 25%, 50%, 75%, 100%) */}
			{[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
				const y = padding.top + chartH - chartH * t;
				const val = nf(Math.round(maxVal * t));
				return (
					<g key={i}>
						<line
							x1={padding.left}
							y1={y}
							x2={width - padding.right}
							y2={y}
							stroke="#f3f4f6"
						/>
						<text
							x={padding.left - 8}
							y={y + 4}
							fontSize="10"
							textAnchor="end"
							fill="#6b7280"
						>
							{val}
						</text>
					</g>
				);
			})}

			{/* bars */}
			{labels.map((_, i) => {
				const gx = padding.left + i * groupWidth;
				return (
					<g key={i}>
						{series.map((s, sIdx) => {
							const v = Math.max(0, s.data[i] || 0);
							const barH = (v / maxVal) * chartH;
							const x =
								gx +
								sIdx * (barWidth + barGap) +
								(groupWidth -
									(barWidth * series.length + barGap * (series.length - 1))) /
									2;
							const y = padding.top + chartH - barH;
							return (
								<rect
									key={sIdx}
									x={x}
									y={y}
									width={Math.max(1, barWidth)}
									height={barH}
									fill={colors[sIdx % colors.length]}
									rx={3}
								/>
							);
						})}
					</g>
				);
			})}

			{/* x labels */}
			{labels.map((lbl, i) => (
				<text
					key={i}
					x={padding.left + i * groupWidth + groupWidth / 2}
					y={height - 6}
					fontSize="10"
					textAnchor="middle"
					fill="#6b7280"
				>
					{lbl}
				</text>
			))}
		</svg>
	);
}
