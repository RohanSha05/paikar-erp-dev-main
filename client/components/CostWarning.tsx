'use client';

import { AlertTriangle } from "lucide-react";
import { nf } from "@/lib/i18n";

type RateBasis = "perMon" | "perKg" | "perBag";

interface CostWarningProps {
	lotId?: string;
	avgCostPerKg?: number;
	rateBasis: RateBasis;
	rateValue: number; // user যেটা ইনপুট দিয়েছে
	kgPerBag?: number;
}

export default function CostWarning({
	lotId,
	avgCostPerKg = 0,
	rateBasis,
	rateValue,
	kgPerBag,
}: CostWarningProps) {
	const avg = {
		perKg: Number(avgCostPerKg || 0),
		perMon: Number(avgCostPerKg || 0) * 40,
	};

	let effectivePerKg = 0;
	if (rateBasis === "perKg") effectivePerKg = rateValue;
	else if (rateBasis === "perMon") effectivePerKg = rateValue / 40;
	else if (rateBasis === "perBag") {
		const kpb = Number(kgPerBag || 0);
		effectivePerKg = kpb > 0 ? rateValue / kpb : rateValue / 40;
	}

	const sellingBelow = !!lotId && rateValue > 0 && effectivePerKg < avg.perKg;

	if (!lotId) {
		return (
			<p className="mt-1 text-[11px] text-slate-400">
				লট সিলেক্ট করলে গড় ক্রয় মূল্য এখানে দেখাবে।
			</p>
		);
	}

	return (
		<div className="mt-1 space-y-1 text-[11px]">
			<div className="text-slate-500">
				Avg Cost:{" "}
				<b>
					{nf(avg.perKg, {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}{" "}
					৳/কেজি (
					{nf(avg.perMon, {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}{" "}
					৳/মণ)
				</b>
			</div>

			{sellingBelow && (
				<div className="flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-800">
					<AlertTriangle className="h-3 w-3" />
					<span>
						আপনি গড় ক্রয় মূল্যের নিচে বিক্রি করছেন। নিশ্চিত হয়ে সেভ করুন।
					</span>
				</div>
			)}
		</div>
	);
}
