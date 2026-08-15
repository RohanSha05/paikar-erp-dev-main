'use client';
import React from 'react';
import { nf } from "@/lib/i18n";

type Props = {
	data: number[];
	width?: number;
	height?: number;
	className?: string;
	gradient?: boolean;
};

export default function AreaWave({
	data,
	width = 560,
	height = 200,
	className = "",
	gradient = true,
}: Props) {
	if (!data || data.length === 0) {
		return (
			<svg
				viewBox={`0 0 ${width} ${height}`}
				className={`w-full h-auto ${className}`}
			/>
		);
	}
	const max = Math.max(...data, 1);
	const min = Math.min(...data, 0);
	const span = max - min || 1;

	const padding = { top: 8, right: 8, bottom: 18, left: 28 };
	const W = width - padding.left - padding.right;
	const H = height - padding.top - padding.bottom;

	const stepX = W / (data.length - 1);
	const points = data.map((v, i) => {
		const x = padding.left + i * stepX;
		const y = padding.top + H - ((v - min) / span) * H;
		return [x, y] as const;
	});

	const line = points
		.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
		.join(" ");
	const area = `${line} L ${padding.left + W} ${padding.top + H} L ${padding.left} ${padding.top + H} Z`;

	return (
		<svg
			viewBox={`0 0 ${width} ${height}`}
			preserveAspectRatio="xMidYMid meet"
			className={`w-full h-auto ${className}`}
		>
			{gradient && (
				<defs>
					<linearGradient id="aw" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
						<stop offset="100%" stopColor="#4f46e5" stopOpacity="0.02" />
					</linearGradient>
				</defs>
			)}

			{/* grid Y */}
			{[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
				const y = padding.top + H - H * t;
				const val = nf(Math.round(min + span * t));

				return (
					<g key={i}>
						<line
							x1={padding.left}
							y1={y}
							x2={padding.left + W}
							y2={y}
							stroke="#f3f4f6"
						/>

						<text
							x={padding.left - 6}
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

			<path d={area} fill={gradient ? "url(#aw)" : "#4f46e5"} opacity={1} />

			<path d={line} fill="none" stroke="#4f46e5" strokeWidth={2} />
		</svg>
	);
}
