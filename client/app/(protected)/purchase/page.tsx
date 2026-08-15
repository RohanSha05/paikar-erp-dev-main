'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import {
	getPurchaseOrders,
	type PurchaseOrderListItemDto,
} from "@/lib/api/purchase";
import { bnDateTime, bnMoney, bnNumber } from "@/lib/format";

type POUiRow = PurchaseOrderListItemDto;

const KG_PER_MON = 40;

function num(v: unknown): number {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

function text(v: unknown, fallback = "-") {
	if (v === null || v === undefined || v === "") return fallback;
	if (
		typeof v === "string" ||
		typeof v === "number" ||
		typeof v === "boolean"
	) {
		return String(v);
	}
	if (v instanceof Date) {
		return bnDateTime(v);
	}
	if (typeof v === "object") {
		try {
			return JSON.stringify(v);
		} catch {
			return fallback;
		}
	}
	return String(v);
}

function computeMetrics(po: any) {
	const remainingFromApi = num(po?.remainingStockKg);
	if (remainingFromApi > 0 || po?.soldState === "full") {
		const initialFromApi = num(po?.initialStockKg);
		const totalCostFromApi = num(po?.totalCost ?? po?.totals?.totalCost);
		const stockKg = remainingFromApi;
		const mon = stockKg / KG_PER_MON;
		const totalPrice = totalCostFromApi;
		// attempt to get bosta if provided
		const totalBags =
			Array.isArray(po?.items) && po.items.length
				? po.items.reduce((s: number, it: any) => s + num(it?.bagCount), 0)
				: num(po?.bagCount);
		return { mon, totalPrice, totalBags };
	}

	const items =
		Array.isArray(po?.items) && po.items.length
			? po.items
			: [
					{
						bagCount: po?.bagCount,
						actualKgPerBag: po?.actualKgPerBag,
						accountingKgPerBag: po?.accountingKgPerBag,
						weightPolicy: po?.weightPolicy,
						rateBasis: po?.rateBasis,
						rateValue: po?.rateValue,
					},
				];

	let stockKg = 0;
	let totalBags = 0;
	let basePurchase = 0;
	for (const it of items) {
		const bagCount = num(it?.bagCount);
		const actual = bagCount * num(it?.actualKgPerBag);
		const accounting = bagCount * num(it?.accountingKgPerBag);
		const wp = (it?.weightPolicy || po?.weightPolicy || "accounting") as string;
		const stock = wp === "actual" ? actual : accounting;
		const basis = (it?.rateBasis || po?.rateBasis || "perMon") as string;
		const rateValue = num(it?.rateValue);
		const ratePerKg = basis === "perKg" ? rateValue : rateValue / KG_PER_MON;

		totalBags += bagCount;
		stockKg += stock;
		basePurchase += stock * ratePerKg;
	}

	const bagCostMode = (po?.bagCostMode || "paid") as string;
	const bagCostTotal =
		bagCostMode === "self" ? 0 : totalBags * num(po?.bagCostPerBag);
	const extraCosts =
		num(po?.transport) +
		num(po?.loadingUnloading) +
		num(po?.misc) +
		bagCostTotal;
	const totalCostFromCalc = basePurchase + extraCosts;
	const totalCostFromApi = num(po?.totalCost ?? po?.totals?.totalCost);
	const totalPrice =
		totalCostFromApi > 0 ? totalCostFromApi : totalCostFromCalc;
	const mon = stockKg / KG_PER_MON;

	return { mon, totalPrice, totalBags };
}

export default function Page() {
	const [pos, setPos] = useState<POUiRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let mounted = true;

		async function loadList() {
			try {
				setLoading(true);
				setError("");
				const apiRows = await getPurchaseOrders();
				if (!mounted) return;
				setPos(apiRows);
			} catch (e: any) {
				if (!mounted) return;
				setError(e?.message || "PO list load failed");
				setPos([]);
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
				<h2 className="text-xl font-semibold">ক্রয় অর্ডার (PO) লিস্ট</h2>
				<Link className="btn btn-primary" href="/purchase/new">
					+ নতুন PO
				</Link>
			</div>

			{error && (
				<div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
					{error}
				</div>
			)}

			<div className="card overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead>
						<tr className="text-left text-slate-600">
							<th className="py-2 px-3">PO</th>
							<th className="py-2 px-3">স্ট্যাটাস</th>
							<th className="py-2 px-3">Sold Status</th>
							<th className="py-2 px-3">সেলার</th>
							<th className="py-2 px-3">টাইপ</th>
							<th className="py-2 px-3">প্রোডাক্ট</th>
							<th className="py-2 px-3">বস্তা</th>
							<th className="py-2 px-3">মন</th>
							<th className="py-2 px-3">Total (৳)</th>
							<th className="py-2 px-3">তারিখ</th>
							<th className="py-2 px-3 text-right">অ্যাকশন</th>
						</tr>
					</thead>

					<tbody>
						{pos.map((po) => {
							const created = po.createdAt ? bnDateTime(po.createdAt) : "-";

							const { mon, totalPrice, totalBags } = computeMetrics(po);

							const soldState = po.soldState || "none";

							const soldBadge =
								soldState === "full" ? (
									<span className="text-emerald-600 text-xs font-medium">
										Fully Sold
									</span>
								) : soldState === "partial" ? (
									<span className="text-blue-600 text-xs font-medium">
										Partially Sold
									</span>
								) : (
									<span className="text-amber-600 text-xs font-medium">
										In Stock
									</span>
								);

							return (
								<tr key={po.id} className="border-t">
									<td className="py-2 px-3 font-medium">
										{text((po as any).poNo, po.id)}
									</td>

									<td className="py-2 px-3">
										<span
											className={`px-2 py-1 rounded text-xs ${
												po.status === "approved"
													? "bg-emerald-100 text-emerald-700"
													: "bg-slate-100 text-slate-700"
											}`}
										>
											{text(po.status)}
										</span>
									</td>

									<td className="py-2 px-3">{soldBadge}</td>

									<td className="py-2 px-3">{text(po.sellerSnapshot?.name)}</td>
									<td className="py-2 px-3">
										{text((po as any).purchaseType)}
									</td>

									{/* ✅ Multi-product friendly display */}
									<td className="py-2 px-3">
										{(po as any).items?.length
											? `Multiple (${(po as any).items.length})`
											: text((po as any).productType)}
									</td>

									<td className="py-2 px-3">{bnNumber(totalBags, 0)}</td>
									<td className="py-2 px-3">{bnNumber(mon, 3)}</td>
									<td className="py-2 px-3">{bnMoney(totalPrice)}</td>
									<td className="py-2 px-3 text-slate-600">{created}</td>

									<td className="py-2 px-3">
										<div className="flex items-center justify-end gap-2">
											<Link
												className="btn btn-ghost"
												href={`/purchase/${po.id}`}
											>
												View
											</Link>
											<Link
												className="btn btn-ghost"
												href={`/purchase/${po.id}/print`}
												target="_blank"
											>
												Print
											</Link>
										</div>
									</td>
								</tr>
							);
						})}

						{!loading && pos.length === 0 && (
							<tr>
								<td colSpan={11} className="py-6 text-center text-slate-500">
									কোন PO নেই
								</td>
							</tr>
						)}
						{loading && (
							<tr>
								<td colSpan={11} className="py-6 text-center text-slate-500">
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
