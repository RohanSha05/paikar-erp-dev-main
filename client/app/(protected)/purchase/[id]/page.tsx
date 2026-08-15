'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from "react";
import {
	getPurchaseOrderById,
	approvePurchaseOrder,
	deletePurchaseOrder,
	PurchaseOrderDetailsDto,
} from "@/lib/api/purchase";
import { getBusinessInfo } from "@/lib/api/businessInfo";
import {
	promptPassword,
	showConfirm,
	showError,
	showSuccess,
} from "@/lib/swal";
import { bnMoney, bnNumber } from "@/lib/format";

const KG_PER_MON = 40;
const fmt = bnMoney;
const n2 = (n: number) => bnNumber(Math.round((n || 0) * 100) / 100, 2);

function num(v: unknown): number {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

// function calcDynamicTotals(po: any) {
// 	const items =
// 		Array.isArray(po?.items) && po.items.length
// 			? po.items
// 			: [
// 					{
// 						bagCount: po?.bagCount,
// 						actualKgPerBag: po?.actualKgPerBag,
// 						accountingKgPerBag: po?.accountingKgPerBag,
// 						weightPolicy: po?.weightPolicy,
// 						rateBasis: po?.rateBasis,
// 						rateValue: po?.rateValue,
// 					},
// 				];

// 	let totalBags = 0;
// 	let totalActualKg = 0;
// 	let totalAccountingKg = 0;
// 	let stockKg = 0;
// 	let basePurchase = 0;

// 	for (const it of items) {
// 		const bags = num(it?.bagCount);
// 		const actualKg = bags * num(it?.actualKgPerBag);
// 		const accountingKg = bags * num(it?.accountingKgPerBag);
// 		const weightPolicy = (it?.weightPolicy ||
// 			po?.weightPolicy ||
// 			"accounting") as string;
// 		const rateBasis = (it?.rateBasis || po?.rateBasis || "perMon") as string;
// 		const rateValue = num(it?.rateValue);

// 		const lineStockKg = weightPolicy === "actual" ? actualKg : accountingKg;

// 		totalBags += bags;
// 		totalActualKg += actualKg;
// 		totalAccountingKg += accountingKg;
// 		stockKg += lineStockKg;

// 		if (rateBasis === "perBag") {
// 			basePurchase += bags * rateValue;
// 		} else {
// 			const ratePerKg =
// 				rateBasis === "perKg" ? rateValue : rateValue / KG_PER_MON;

// 			basePurchase += lineStockKg * ratePerKg;
// 		}
// 	}
// 	const bagCostMode = (po?.bagCostMode || "paid") as string;
// 	const bagCostPerBag = num(po?.bagCostPerBag);
// 	const transport = num(po?.transport);
// 	const loadingUnloading = num(po?.loadingUnloading);
// 	const misc = num(po?.misc);

// 	const bagCostTotal = bagCostMode === "self" ? 0 : totalBags * bagCostPerBag;
// 	const extraCosts = transport + loadingUnloading + misc + bagCostTotal;
// 	const totalCostFromCalc = basePurchase + extraCosts;
// 	const totalCostFromApi = num(po?.totalCost ?? po?.totals?.totalCost);
// 	const totalCost = totalCostFromApi > 0 ? totalCostFromApi : totalCostFromCalc;
// 	const avgPerKg = stockKg > 0 ? totalCost / stockKg : 0;

// 	return {
// 		totalActualKg,
// 		totalAccountingKg,
// 		stockKg,
// 		basePurchase,
// 		extraCosts,
// 		totalCost,
// 		avgPerKg,
// 		avgPerMon: avgPerKg * KG_PER_MON,
// 		totalBags,
// 	};
// }

function calcDynamicTotals(po: any) {
	const items =
		Array.isArray(po?.items) && po.items.length
			? po.items
			: [
					{
						productType: po?.productType,
						bagCount: po?.bagCount,
						actualKgPerBag: po?.actualKgPerBag,
						accountingKgPerBag: po?.accountingKgPerBag,
						weightPolicy: po?.weightPolicy,
						rateBasis: po?.rateBasis,
						rateValue: po?.rateValue,
					},
				];

	let totalBags = 0;
	let totalActualKg = 0;
	let totalAccountingKg = 0;
	let stockKg = 0;
	let basePurchase = 0;
	const headerExtraCosts =
		num(po?.transport) + num(po?.loadingUnloading) + num(po?.misc);
	const bagCostMode = (po?.bagCostMode || "paid") as string;
	const bagCostPerBag = num(po?.bagCostPerBag);
	const totalLineStockKg = items.reduce((sum: number, it: any) => {
		const bags = num(it?.bagCount);
		const actualKg = bags * num(it?.actualKgPerBag);
		const accountingKg = bags * num(it?.accountingKgPerBag);
		const weightPolicy = (it?.weightPolicy ||
			po?.weightPolicy ||
			"accounting") as string;
		return sum + (weightPolicy === "actual" ? actualKg : accountingKg);
	}, 0);

	const productSummaries = items.map((it: any) => {
		const bags = num(it?.bagCount);

		const actualKg = bags * num(it?.actualKgPerBag);

		const accountingKg = bags * num(it?.accountingKgPerBag);

		const weightPolicy = (it?.weightPolicy ||
			po?.weightPolicy ||
			"accounting") as string;

		const rateBasis = (it?.rateBasis || po?.rateBasis || "perMon") as string;

		const rateValue = num(it?.rateValue);

		const lineStockKg = weightPolicy === "actual" ? actualKg : accountingKg;

		let baseLineCost = 0;

		if (rateBasis === "perBag") {
			baseLineCost = bags * rateValue;
		} else {
			const ratePerKg =
				rateBasis === "perKg" ? rateValue : rateValue / KG_PER_MON;

			baseLineCost = lineStockKg * ratePerKg;
		}

		totalBags += bags;
		totalActualKg += actualKg;
		totalAccountingKg += accountingKg;
		stockKg += lineStockKg;
		basePurchase += baseLineCost;
		const bagCost = bagCostMode === "self" ? 0 : bags * bagCostPerBag;
		const headerCostShare =
			totalLineStockKg > 0
				? headerExtraCosts * (lineStockKg / totalLineStockKg)
				: 0;
		const lineCost = baseLineCost + bagCost + headerCostShare;
		const avgPerKg = lineStockKg > 0 ? lineCost / lineStockKg : 0;

		return {
			product: it?.productType || it?.productName || it?.product?.name || "-",

			bags,

			actualKg,

			accountingKg,

			stockKg: lineStockKg,

			baseLineCost,
			bagCost,
			headerCostShare,
			lineCost,

			avgPerKg,

			avgPerMon: avgPerKg * KG_PER_MON,
		};
	});

	const transport = num(po?.transport);

	const loadingUnloading = num(po?.loadingUnloading);

	const misc = num(po?.misc);

	const bagCostTotal = bagCostMode === "self" ? 0 : totalBags * bagCostPerBag;

	const extraCosts = transport + loadingUnloading + misc + bagCostTotal;

	const totalCostFromCalc = basePurchase + extraCosts;

	const totalCostFromApi = num(po?.totalCost ?? po?.totals?.totalCost);

	const totalCost = totalCostFromApi > 0 ? totalCostFromApi : totalCostFromCalc;

	const avgPerKg = stockKg > 0 ? totalCost / stockKg : 0;

	return {
		productSummaries,

		totalActualKg,

		totalAccountingKg,

		stockKg,

		basePurchase,

		extraCosts,

		totalCost,

		avgPerKg,

		avgPerMon: avgPerKg * KG_PER_MON,

		totalBags,
	};
}

export default function Page() {
	const router = useRouter();
	const params = useParams();
	const id = params?.id as string;

	const [po, setPo] = useState<PurchaseOrderDetailsDto | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [deleting, setDeleting] = useState(false);

	async function requestOperationPass() {
		const entered = await promptPassword(
			"Operation Password দিন",
			"এডিট/ডিলিট করতে operation password দিন।",
		);
		if (!entered) return null;

		const info = await getBusinessInfo();
		const expected = String(info?.operationPass || "").trim();
		if (!expected) {
			await showError("Business info-তে operation password সেট করা নেই।");
			return null;
		}

		if (entered !== expected) {
			await showError("Operation password ভুল।");
			return null;
		}

		return entered;
	}

	useEffect(() => {
		let mounted = true;
		async function loadRemote() {
			setLoading(true);
			try {
				const found = await getPurchaseOrderById(id);
				if (mounted) {
					setPo(found);
					setError("");
				}
			} catch (e: any) {
				if (mounted) {
					setPo(null);
					setError(e?.message || "Failed to load purchase order");
				}
			} finally {
				if (mounted) setLoading(false);
			}
		}
		loadRemote();
		return () => {
			mounted = false;
		};
	}, [id]);

	if (loading) {
		return <div className="p-6 text-slate-600">Loading PO...</div>;
	}

	if (!po) {
		return (
			<div className="p-6">
				<div className="text-lg font-semibold text-red-600">PO not found</div>
				{error && <div className="mt-1 text-sm text-slate-600">{error}</div>}
				<Link href="/purchase" className="link mt-2 inline-block">
					Back to PO List
				</Link>
			</div>
		);
	}
	async function onApprove() {
		const targetId = po?.id;
		if (!targetId) return;
		const poDisplayNo = (po as any)?.poNo || targetId;
		const result = await showConfirm(
			"Are you sure to approve?",
			`PO No: ${poDisplayNo}`,
		);
		if (!result.isConfirmed) return;

		try {
			await approvePurchaseOrder(targetId);
			await showSuccess("PO Approved & Lots created.");
			router.push(`/purchase`);
			router.refresh?.();
		} catch (apiError: any) {
			await showError(apiError?.message || "Failed to approve purchase order");
		}
	}
	const fullySold = po?.soldState === "full";
	const actionBlockReason = (() => {
		if (!po || po.status !== "approved") return null;
		if ((po.soldState || "none") === "none") return null;
		const stateLabel =
			po.soldState === "full" ? "fully sold" : "partially sold";
		return `এই অনুমোদিত PO সম্পাদনা করা যাচ্ছে না, কারণ এর স্টক ইতোমধ্যে ${stateLabel} হয়েছে। অনুগ্রহ করে আগে সংশ্লিষ্ট সেলসগুলো মুছে ফেলুন বা সম্পাদনা করুন।`;
	})();

	async function handleEdit() {
		if (!po) return;
		if (actionBlockReason) {
			await showError(actionBlockReason);
			return;
		}

		router.push(`/purchase/${po.id}/edit`);
	}

	async function handleDelete() {
		if (!po) return;
		if (actionBlockReason) {
			await showError(actionBlockReason.replace("সম্পাদনা", "ডিলিট"));
			return;
		}

		const needsPassword = String(po.status || "").toLowerCase() !== "draft";
		let operationPass: string | null = null;
		if (needsPassword) {
			operationPass = await requestOperationPass();
			if (!operationPass) return;
		}

		const poNo = (po as any).poNo || po.id;
		const result = await showConfirm(
			"PO delete করতে চান?",
			po.status === "approved"
				? `PO ${poNo} approved. Delete করলে stock, vouchers, এবং accounts reverse হবে. নিশ্চিত করুন এটিতে কোনো active sales নেই।`
				: `PO ${poNo} delete হবে এবং আর ফেরত আনা যাবে না.`,
		);
		if (!result.isConfirmed) return;

		try {
			setDeleting(true);
			await deletePurchaseOrder(po.id, operationPass || undefined);
			await showSuccess("PO deleted");
			router.push("/purchase");
		} catch (e: any) {
			await showError(e?.message || "Failed to delete PO");
		} finally {
			setDeleting(false);
		}
	}
	const totals = calcDynamicTotals(po as any);
	const {
		totalActualKg,
		totalAccountingKg,
		stockKg,
		basePurchase,
		extraCosts,
		totalBags = 0,
		totalCost,
		avgPerKg,
		avgPerMon,
		productSummaries,
	} = totals;

	const sellerRef = (po as any)?.seller || {};
	const sellerName =
		(po as any)?.sellerSnapshot?.name ||
		sellerRef?.name ||
		sellerRef?.code ||
		(po as any)?.sellerId ||
		"-";
	const sellerDistrict =
		(po as any)?.sellerSnapshot?.district || sellerRef?.district || "-";
	const sellerMarket =
		(po as any)?.sellerSnapshot?.market || sellerRef?.market || "-";
	const sellerAddress =
		(po as any)?.sellerSnapshot?.address || sellerRef?.address || "-";

	const rateFromHeaderBasis = (po as any)?.rateBasis as string | undefined;
	const rateFromHeaderValue = num((po as any)?.rateValue);

	const itemsForRate: any[] = Array.isArray((po as any)?.items)
		? (po as any).items
		: [];
	const hasHeaderRate =
		(rateFromHeaderBasis === "perKg" ||
			rateFromHeaderBasis === "perMon" ||
			rateFromHeaderBasis === "perBag") &&
		rateFromHeaderValue > 0;

	let displayRateBasis: "perKg" | "perMon" | "perBag" | null = hasHeaderRate
		? (rateFromHeaderBasis as "perKg" | "perMon" | "perBag")
		: null;
	let displayRateValue = hasHeaderRate ? rateFromHeaderValue : 0;

	if (!hasHeaderRate && itemsForRate.length === 1) {
		displayRateBasis = itemsForRate[0]?.rateBasis || null;
		displayRateValue = num(itemsForRate[0]?.rateValue);
	} else if (!hasHeaderRate && itemsForRate.length > 1) {
		const firstBasis = itemsForRate[0]?.rateBasis;
		const firstValue = num(itemsForRate[0]?.rateValue);
		const sameRate = itemsForRate.every(
			(it) => it?.rateBasis === firstBasis && num(it?.rateValue) === firstValue,
		);
		if (
			sameRate &&
			(firstBasis === "perKg" ||
				firstBasis === "perMon" ||
				firstBasis === "perBag")
		) {
			displayRateBasis = firstBasis;
			displayRateValue = firstValue;
		}
	}

	const rateBaseText = displayRateBasis
		? displayRateBasis === "perKg"
			? `${n2(displayRateValue)} ৳/কেজি`
			: displayRateBasis === "perBag"
				? `${n2(displayRateValue)} ৳/বস্তা`
				: `${n2(displayRateValue)} ৳/মণ`
		: itemsForRate.length > 1
			? "Multiple item rates"
			: "-";

	const destLabel = (() => {
		const warehouseObj =
			typeof (po as any).warehouse === "object" ? (po as any).warehouse : null;
		const warehouseFromPo =
			typeof (po as any).warehouse === "string"
				? (po as any).warehouse
				: warehouseObj?.name || warehouseObj?.code || "";
		if (po.destinationKind === "mill") {
			return `Direct Mill: ${(po as any).destinationCustomer?.name || warehouseFromPo || "Mill"}`;
		}
		if (po.destinationKind === "warehouse") {
			return `Warehouse: ${warehouseFromPo || "Warehouse"}`;
		}
		// পুরনো ডেটা হ্যান্ডেল
		return warehouseFromPo || "Warehouse";
	})();


	return (
		<div className="flex flex-col gap-4">
			{/* Header */}
			<div className="flex gap-2 items-center justify-between">
				<div>
					{fullySold && (
						<span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
							✅ Fully Sold
						</span>
					)}

					<Link href="/purchase" className="btn btn-ghost">
						Back to List
					</Link>
				</div>
				<div>
					<button
						className="btn btn-ghost mx-5"
						onClick={() => void handleEdit()}
					>
						Edit
					</button>
					<button
						className="btn btn-ghost text-red-600 disabled:opacity-70 disabled:brightness-90 disabled:cursor-not-allowed"
						onClick={() => void handleDelete()}
						disabled={Boolean(actionBlockReason) || deleting}
					>
						{deleting ? "Deleting..." : "Delete"}
					</button>
				</div>
				{po.status !== "approved" && (
					<button
						className="btn btn-primary"
						onClick={onApprove}
						disabled={fullySold} // ✅ disable when fully sold
						title={
							fullySold ? "This PO is fully sold. No stock remaining." : ""
						}
					>
						Approve &amp; Send to Sales
					</button>
				)}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{/* LEFT: Summary + Seller + Destination */}
				<section className="card lg:col-span-2 p-4 lg:p-6">
					<h2 className="text-lg font-semibold mb-4">PO Summary</h2>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
						{/* Block 1 */}
						<div className="space-y-1">
							<Row label="Status" value={po.status} />
							<Row label="Purchase টাইপ" value={po.purchaseType} />
							<Row label="মোট বস্তা" value={totalBags.toString()} />
							<Row label="আসল (মোট)" value={`${n2(totalActualKg)} কেজি`} />
							<Row
								label="হিসাব (মোট)"
								value={`${n2(totalAccountingKg)} কেজি`}
							/>
							<Row
								label="স্টকে ধরা"
								value={`${n2(stockKg)} কেজি (~${n2(stockKg / KG_PER_MON)} মণ)`}
							/>
						</div>

						{/* Block 2 */}
						<div className="space-y-1">
							<Row label="Rate (Base)" value={rateBaseText} />
							<Row label="Transport" value={fmt(po.transport || 0)} />
							<Row
								label="Bag Mode"
								value={
									po.bagCostMode === "self" ? "আমার বস্তা" : "বস্তার দাম দিলাম"
								}
							/>
							<Row
								label="Bag Price"
								value={`${po.bagCostPerBag || 0} ৳/বস্তা`}
							/>
							<Row
								label="Loading/Unloading"
								value={fmt(po.loadingUnloading || 0)}
							/>
							<Row label="Misc" value={fmt(po.misc || 0)} />
						</div>

						{/* Seller */}
						<div className="space-y-1">
							<h3 className="font-semibold mt-2">Seller</h3>
							<Row label="নাম" value={sellerName} />
							<Row label="ডিস্ট্রিক্ট" value={sellerDistrict} />
							<Row label="বাজার" value={sellerMarket} />
							<Row label="এড্রেস" value={sellerAddress} />
						</div>

						{/* Destination */}
						<div className="space-y-1">
							<h3 className="font-semibold mt-2">Destination</h3>
							<Row
								label="ধরন"
								value={
									po.destinationKind === "mill"
										? "Direct Mill / Factory"
										: "Warehouse"
								}
							/>
							<Row label="Location" value={destLabel} />
							<Row label="Remark" value={po.remarks || "-"} />
							<Row label="Truck/Variety Note" value={po.varietyNote || "-"} />
						</div>
					</div>

					{/* Combined Product Table */}
					<div className="mt-6">
						<h3 className="text-sm font-semibold mb-2">
							Product Lines & Average Cost
						</h3>

						<div className="overflow-x-auto rounded border">
							<table className="w-full text-xs">
								<thead className="bg-slate-50 text-slate-600">
									<tr>
										<th className="py-1 px-2 text-left">প্রোডাক্ট</th>
										<th className="py-1 px-2 text-right">বস্তা</th>
										<th className="py-1 px-2 text-right">আসল kg/বস্তা</th>
										<th className="py-1 px-2 text-right">হিসাব kg/বস্তা</th>
										<th className="py-1 px-2 text-center">ওজন পলিসি</th>
										<th className="py-1 px-2 text-center">Rate Basis</th>
										<th className="py-1 px-2 text-right">Rate</th>
										<th className="py-1 px-2 text-right">Stock Kg</th>
										<th className="py-1 px-2 text-right">Line Cost</th>
										<th className="py-1 px-2 text-right">Avg ৳/Kg</th>
										<th className="py-1 px-2 text-right">Avg ৳/মণ</th>
									</tr>
								</thead>

								<tbody>
									{(po.items && po.items.length
										? po.items
										: [
												{
													id: "LEGACY",
													productType: po.productType,
													bagCount: po.bagCount,
													actualKgPerBag: po.actualKgPerBag,
													accountingKgPerBag: po.accountingKgPerBag,
													weightPolicy: po.weightPolicy,
													rateBasis: po.rateBasis,
													rateValue: po.rateValue,
												},
											]
									).map((it: any, idx: number) => {
										const ps = productSummaries[idx] || {};
										return (
											<tr key={it.id || idx} className="border-t">
												<td className="py-1 px-2">
													{it.productType ||
														it.productName ||
														it.product?.name ||
														"-"}
												</td>
												<td className="py-1 px-2 text-right">{it.bagCount}</td>
												<td className="py-1 px-2 text-right">
													{it.actualKgPerBag}
												</td>
												<td className="py-1 px-2 text-right">
													{it.accountingKgPerBag}
												</td>
												<td className="py-1 px-2 text-center">
													{it.weightPolicy === "actual" ? "আসল" : "হিসাব"}
												</td>
												<td className="py-1 px-2 text-center">
													{it.rateBasis === "perKg"
														? "৳/কেজি"
														: it.rateBasis === "perBag"
															? "৳/বস্তা"
															: "৳/মণ"}
												</td>
												<td className="py-1 px-2 text-right">{it.rateValue}</td>

												{/* Computed fields from productSummaries */}
												<td className="py-1 px-2 text-right">
													{n2(ps.stockKg)}
												</td>
												<td className="py-1 px-2 text-right">
													{fmt(ps.lineCost)}
												</td>
												<td className="py-1 px-2 text-right">
													{fmt(ps.avgPerKg)}
												</td>
												<td className="py-1 px-2 text-right">
													{fmt(ps.avgPerMon)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</section>

				{/* RIGHT: Computation */}
				<aside className="card p-4 lg:p-6 h-max lg:sticky lg:top-6 text-sm">
					<h2 className="text-lg font-semibold mb-3">Computation</h2>
					<div className="space-y-1">
						<Row label="আসল (মোট)" value={`${n2(totalActualKg)} কেজি`} strong />
						<Row
							label="হিসাব (মোট)"
							value={`${n2(totalAccountingKg)} কেজি`}
							strong
						/>
						<Row
							label="স্টক কেজি (ব্যবহৃত)"
							value={`${n2(stockKg)} কেজি`}
							strong
						/>
						<Row label="ক্রয় (বেস)" value={fmt(basePurchase)} />
						<Row label="Extra Costs" value={fmt(extraCosts)} />
						<hr className="my-2" />
						<Row label="মোট খরচ" value={fmt(totalCost)} strong />
						{/* <Row label="Avg (৳/কেজি)" value={fmt(avgPerKg)} />
						<Row label="Avg (৳/মণ)" value={fmt(avgPerMon)} /> */}
						{/* <p className="text-[11px] text-slate-500 mt-2">
							* Avg cost অনুযায়ী বিক্রয় মূল্য নির্ধারণ করুন।
						</p> */}
					</div>
					{po.soldState && (
						<div className="mt-4 rounded-lg border bg-slate-50 p-3 text-sm">
							<div className="font-semibold mb-1">Sold Status</div>
							<div className="text-slate-700">{po.soldState}</div>
						</div>
					)}
				</aside>
			</div>
		</div>
	);
}

/** small helper for label/value rows */
function Row({
	label,
	value,
	strong,
}: {
	label: string;
	value: unknown;
	strong?: boolean;
}) {
	const asText = (v: unknown): string => {
		if (v === null || v === undefined || v === "") return "-";
		if (
			typeof v === "string" ||
			typeof v === "number" ||
			typeof v === "boolean"
		) {
			return String(v);
		}
		if (Array.isArray(v)) {
			return v.map((x) => asText(x)).join(", ");
		}
		if (typeof v === "object") {
			const o = v as Record<string, unknown>;
			const byName = o.name;
			const byCode = o.code;
			const byId = o.id;
			if (typeof byName === "string" && byName) return byName;
			if (typeof byCode === "string" && byCode) return byCode;
			if (typeof byId === "string" && byId) return byId;
			try {
				return JSON.stringify(o);
			} catch {
				return "[object]";
			}
		}
		return String(v);
	};

	return (
		<div className="flex justify-between gap-3">
			<span className="text-slate-500">{label}</span>
			<span className={strong ? "font-semibold" : ""}>{asText(value)}</span>
		</div>
	);
}
