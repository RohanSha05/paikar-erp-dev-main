'use client';

import Link from 'next/link';
import { useEffect, useState } from "react";
import { getSalesOrders, SalesOrderDto } from "@/lib/api/sales";
import { bnDateTime, bnMoney, bnNumber } from "@/lib/format";

type SOUiRow = SalesOrderDto & { __source?: "api" };

function num(v: unknown): number {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

const KG_PER_MON = 40;

function computeMetrics(so: any) {
	const items = Array.isArray(so?.items) ? so.items : [];

	let totalKg = 0;
	let totalBags = 0;

	for (const it of items) {
		const qtyKg = num(it?.qtyKg ?? it?.qty);
		if (qtyKg > 0) {
			totalKg += qtyKg;
		} else {
			const bagCount = num(it?.bagCount ?? it?.qty ?? 0);
			const kgPerBag = num(
				it?.kgPerBag ?? it?.actualKgPerBag ?? it?.kgPerBagPerItem ?? 0,
			);
			totalBags += bagCount;
			totalKg += bagCount * (kgPerBag || 0);
		}

		// try to account bagCount if present separately
		if (num(it?.bagCount) > 0) {
			totalBags += num(it?.bagCount);
		}
	}

	// if kg known but bags not calculated, attempt to derive
	if (totalBags === 0 && totalKg > 0) {
		totalBags = Math.round(totalKg / KG_PER_MON);
	}

	const mon = totalKg / KG_PER_MON;
	return { mon, totalBags };
}

function getTotal(so: any): number {
	const snapshot = so?.totals ?? so?.totalsJson;
	if (snapshot && typeof snapshot === "object") {
		const direct = num((snapshot as any).total);
		if (direct > 0) return direct;
		const base = num((snapshot as any).base);
		const extras = num((snapshot as any).extras);
		if (base > 0 || extras > 0) return base + extras;
	}

	const direct = num(so?.total);
	if (direct > 0) return direct;
	const items = Array.isArray(so?.items) ? so.items : [];
	return (
		items.reduce((sum: number, item: any) => {
			const qtyKg = num(item?.qtyKg);
			const rate = num(
				item?.rateBasis === "perKg"
					? item?.rateValue
					: item?.rateBasis === "perBag"
						? item?.kgPerBag > 0
							? item?.rateValue / item?.kgPerBag
							: item?.rateValue / 40
						: item?.rateValue / 40,
			);
			return sum + qtyKg * rate;
		}, 0) +
		num(so?.transport) +
		num(so?.loadingUnloading) +
		num(so?.misc)
	);
}

export default function Page() {
	const [sos, setSos] = useState<SOUiRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let mounted = true;

		async function loadList() {
			try {
				setLoading(true);
				setError("");
				const apiRows = await getSalesOrders();
				if (!mounted) return;
				setSos(apiRows.map((x) => ({ ...x, __source: "api" as const })));
			} catch (e: any) {
				if (!mounted) return;
				setError(e?.message || "SO list load failed");
				setSos([]);
			} finally {
				if (mounted) setLoading(false);
			}
		}

		loadList();
		return () => {
			mounted = false;
		};
	}, []);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">বিক্রয় অর্ডার (SO) লিস্ট</h2>
				<Link className="btn btn-primary" href="/sales/new">
					+ নতুন SO
				</Link>
			</div>

			{error && (
				<div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
					{error}. লোকাল ডেটা দেখানো হচ্ছে।
				</div>
			)}

			<div className="card overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead>
						<tr className="text-left text-slate-600">
							<th className="py-2 px-3">SO</th>
							<th className="py-2 px-3">স্ট্যাটাস</th>
							<th className="py-2 px-3">কাস্টমার</th>
							<th className="py-2 px-3">আইটেম</th>
							<th className="py-2 px-3">বস্তা</th>
							<th className="py-2 px-3">মন</th>
							<th className="py-2 px-3">মোট (৳)</th>
							<th className="py-2 px-3">তারিখ</th>
							<th className="py-2 px-3 text-right">অ্যাকশন</th>
						</tr>
					</thead>
					<tbody>
						{sos.map((so) => {
							const total = getTotal(so);
							return (
								<tr key={so.id} className="border-t">
									<td className="py-2 px-3 font-medium">
										{(so as any).soNo || so.id}
									</td>
									<td className="py-2 px-3">
										<span
											className={`px-2 py-1 rounded text-xs ${so.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
										>
											{so.status}
										</span>
									</td>
									<td className="py-2 px-3">
										{so.customerSnapshot?.name ||
											(so as any)?.customer?.name ||
											"-"}
									</td>
									<td className="py-2 px-3">{so.items?.length || 0}</td>
									{(() => {
										const { mon, totalBags } = computeMetrics(so);
										return (
											<>
												<td className="py-2 px-3">{bnNumber(totalBags, 0)}</td>
												<td className="py-2 px-3">{bnNumber(mon, 3)}</td>
											</>
										);
									})()}
									<td className="py-2 px-3">{bnMoney(total)}</td>
									<td className="py-2 px-3 text-slate-600">
										{so.createdAt ? bnDateTime(so.createdAt) : "-"}
									</td>
									<td className="py-2 px-3">
										<div className="flex items-center justify-end gap-2">
											<Link className="btn btn-ghost" href={`/sales/${so.id}`}>
												View
											</Link>
											<Link
												className="btn btn-ghost"
												href={`/sales/${so.id}/print`}
												target="_blank"
											>
												Print
											</Link>
										</div>
									</td>
								</tr>
							);
						})}
						{!loading && sos.length === 0 && (
							<tr>
								<td colSpan={9} className="py-6 text-center text-slate-500">
									কোন SO নেই
								</td>
							</tr>
						)}
						{loading && (
							<tr>
								<td colSpan={9} className="py-6 text-center text-slate-500">
									লোড হচ্ছে...
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
