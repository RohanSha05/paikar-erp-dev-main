'use client';
import React from 'react';
type Props = { data: number[]; width?: number; height?: number; strokeWidth?: number; className?: string; };
export default function Sparkline({ data, width = 140, height = 36, strokeWidth = 2, className = '' }: Props) {
  if (!data || data.length === 0) return <svg width={width} height={height} className={className} />;
  const max = Math.max(...data); const min = Math.min(...data); const span = (max - min) || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX; const y = height - ((v - min) / span) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className={className}>
      <polyline fill="none" stroke="currentColor" strokeWidth={strokeWidth} points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
