'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from "next/navigation";
import {
	confirmSalesOrder as confirmSalesOrderApi,
	deleteSalesOrder,
	getSalesOrderById,
	type SalesOrderDto,
} from "@/lib/api/sales";
import { getBusinessInfo } from "@/lib/api/businessInfo";
import {
	promptPassword,
	showConfirm,
	showError,
	showSuccess,
} from "@/lib/swal";
import { bnDateTime, bnMoney, bnNumber } from "@/lib/format";

const fmt = bnMoney;
const num = bnNumber;
const KG_PER_MON = 40;

function ratePerKgFromBasis(
	rateBasis: "perKg" | "perMon" | undefined,
	rateValue: number | string | undefined,
) {
	const n = Number(rateValue || 0);
	return n / KG_PER_MON; // always perMon
}

export default function Page() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const [so, setSo] = useState<SalesOrderDto | null>(null);
	const [loading, setLoading] = useState(true);
	const [isConfirming, setIsConfirming] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

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
		if (!id) return;
		let mounted = true;

		async function loadSO() {
			try {
				setLoading(true);
				const remote = await getSalesOrderById(id);
				if (!mounted) return;
				setSo(remote);
			} catch {
				if (!mounted) return;
				setSo(null);
			} finally {
				if (mounted) setLoading(false);
			}
		}

		loadSO();
		return () => {
			mounted = false;
		};
	}, [id]);

	const totals = useMemo(() => {
		if (!so) return null;

		const fromApi = (so as any)?.totals ?? (so as any)?.totalsJson;
		if (fromApi && typeof fromApi === "object") {
			const base = Number((fromApi as any).base || 0);
			const extras = Number((fromApi as any).extras || 0);
			const total = Number((fromApi as any).total || 0);
			const totalKg = Number((fromApi as any).totalKg || 0);
			const avgPerKg = Number((fromApi as any).avgPerKg || 0);
			const avgPerMon = Number((fromApi as any).avgPerMon || avgPerKg * 40);
			const bagCount = Number((fromApi as any).bagCount || 0);
			return { base, extras, total, totalKg, avgPerKg, avgPerMon, bagCount };
		}

		const items = Array.isArray(so.items) ? so.items : [];
		const base = items.reduce((sum, item: any) => {
			const lineBase = Number(item?.lineBase || 0);
			if (lineBase > 0) return sum + lineBase;
			const qtyKg = Number(item?.qtyKg || 0);
			const ratePerKg =
				item?.rateBasis === "perKg"
					? Number(item?.rateValue || 0)
					: item?.rateBasis === "perBag"
						? Number(item?.rateValue || 0) /
							Number(item?.kgPerBag || KG_PER_MON)
						: Number(item?.rateValue || 0) / KG_PER_MON;
			return sum + qtyKg * ratePerKg;
		}, 0);
		const extras =
			Number(so.transport || 0) +
			Number(so.loadingUnloading || 0) +
			Number(so.misc || 0);
		const total = base + extras;
		const totalKg = items.reduce(
			(sum, item: any) => sum + Number(item?.qtyKg || 0),
			0,
		);
		const avgPerKg = totalKg > 0 ? total / totalKg : 0;
		return { base, extras, total, totalKg, avgPerKg, avgPerMon: avgPerKg * 40 };
	}, [so]);

	if (loading) {
		return (
			<div className="card">
				<h2 className="text-lg font-semibold mb-2">SO Details</h2>
				<p className="text-sm text-slate-500">Loading...</p>
			</div>
		);
	}

	if (!so) {
		return (
			<div className="card">
				<h2 className="text-lg font-semibold mb-2">SO Details</h2>
				<p className="text-sm text-slate-500">Invalid or missing SO.</p>
				<button
					className="btn btn-ghost mt-3"
					onClick={() => router.push("/sales")}
				>
					Back to Sales List
				</button>
			</div>
		);
	}

	const status = so.status ?? "draft";

	async function handleConfirm() {
		if (!so) return;
		const result = await showConfirm(
			"Confirm this sales order?",
			`SO: ${(so as any).soNo || so.id}`,
		);
		if (!result.isConfirmed) return;
		if (status !== "draft") {
			await showError("এই SO ইতিমধ্যে Confirm করা হয়েছে।");
			return;
		}
		try {
			setIsConfirming(true);
			await confirmSalesOrderApi(so.id);
			await showSuccess("SO Confirmed & Lots updated");
			router.refresh?.();
			router.push(`/sales`);
		} catch (e: any) {
			await showError(e?.message || "Failed to confirm SO");
		} finally {
			setIsConfirming(false);
		}
	}

	async function handleDelete() {
		if (!so) return;
		const needsPassword = String(so.status || "").toLowerCase() !== "draft";
		let operationPass: string | null = null;
		if (needsPassword) {
			operationPass = await requestOperationPass();
			if (!operationPass) return;
		}

		const soNo = (so as any).soNo || so.id;
		const result = await showConfirm(
			"SO delete করতে চান?",
			so.status === "confirmed"
				? `SO ${soNo} confirmed. Delete করলে stock, vouchers, and accounts reverse হবে.`
				: `SO ${soNo} delete হবে এবং আর ফেরত আনা যাবে না.`,
		);

		if (!result.isConfirmed) return;

		try {
			setIsDeleting(true);
			await deleteSalesOrder(so.id, operationPass || undefined);
			await showSuccess("SO deleted");
			router.push("/sales");
		} catch (e: any) {
			await showError(e?.message || "Failed to delete SO");
		} finally {
			setIsDeleting(false);
		}
	}

	const customer: any = so.customerSnapshot || so.customer || {};
	const createdAtLocal = so.createdAt ? bnDateTime(so.createdAt) : "-";

	async function handleEdit() {
		if (!so) return;
		router.push(`/sales/${so.id}/edit`);
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold">
						SO Details: <span className="font-mono">{(so as any).soNo}</span>
					</h2>
					<p className="text-xs text-slate-500 mt-1">
						Status:{" "}
						<span
							className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
								status === "confirmed"
									? "bg-emerald-100 text-emerald-700"
									: "bg-amber-100 text-amber-700"
							}`}
						>
							{status.toUpperCase()}
						</span>
					</p>
				</div>
				<div className="flex gap-2 ">
					<button
						className="btn btn-ghost"
						onClick={() => router.push("/sales")}
					>
						Back to List
					</button>
					<button className="btn btn-ghost" onClick={() => void handleEdit()}>
						Edit
					</button>
					<button
						className="btn btn-ghost text-red-600"
						onClick={() => void handleDelete()}
						disabled={isDeleting}
					>
						{isDeleting ? "Deleting..." : "Delete"}
					</button>
					{status === "draft" ? (
						<>
							<button className="btn btn-primary" onClick={handleConfirm}>
								{isConfirming ? "Confirming..." : "Confirm & Update Lots"}
							</button>
						</>
					) : (
						<>
							<button
								className="btn btn-ghost"
								onClick={() => router.push(`/sales/${so.id}/print`)}
							>
								Print
							</button>
						</>
					)}
				</div>
			</div>

			{/* Main layout */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{/* Left: SO info + items */}
				<section className="card lg:col-span-2">
					<h3 className="text-lg font-semibold mb-3">SO Summary</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<Field label="Customer" value={customer?.name || "-"} />
						<Field label="Customer Type" value={customer?.type || "-"} />
						<Field
							label="Customer Address"
							value={
								[customer?.district, customer?.market, customer?.address]
									.filter(Boolean)
									.join(" • ") || "-"
							}
						/>
						<Field label="Items Count" value={String(so.items?.length || 0)} />
						<Field label="Created At" value={createdAtLocal} />
						<Field label="Remarks" value={so.remarks || "-"} />
					</div>

					<h4 className="font-semibold mt-5 mb-2">Items</h4>
					<div className="border rounded">
						<table className="min-w-full text-sm">
							<thead>
								<tr className="text-left text-slate-600">
									<th className="py-2 px-3">Lot</th>
									<th className="py-2 px-3">Product</th>
									<th className="py-2 px-3 text-right">Qty (মণ)</th>
									<th className="py-2 px-3 text-right">Bags</th>
									<th className="py-2 px-3 text-right">Rate (৳/মণ)</th>
									<th className="py-2 px-3 text-right">Base</th>
								</tr>
							</thead>
							<tbody>
								{/* {(so.items || []).map((it: any, idx) => {
									const rpk = ratePerKgFromBasis(it.rateBasis, it.rateValue);
									const base = rpk * it.qtyKg;
									return (
										<tr key={idx} className="border-t">
											<td className="py-2 px-3">
												<span className="font-mono text-xs bg-slate-50 px-2 py-0.5 rounded">
													{it?.lot?.label || it.lotId}
												</span>
											</td>
											<td className="py-2 px-3">{it.productType}</td>
											<td className="py-2 px-3 text-right">
												{num(it.qtyKg, 3)}
											</td>
											<td className="py-2 px-3 text-right">
												৳{num(rpk, 2)}/kg
											</td>
											<td className="py-2 px-3 text-right">{fmt(base)}</td>
										</tr>
									);
								})} */}
								{(so.items || []).map((it: any, idx) => {
									const qtyKg = Number(it.qtyKg || 0);
									const qtyMon = qtyKg / KG_PER_MON;

									const ratePerKg =
										it.rateBasis === "perKg"
											? Number(it.rateValue || 0)
											: it.rateBasis === "perBag"
												? Number(it.rateValue || 0) /
													Number(it.kgPerBag || KG_PER_MON)
												: Number(it.rateValue || 0) / KG_PER_MON;
									const base = Number(it.lineBase || 0) || qtyKg * ratePerKg;

									// fallback if bagCount missing
									const bags =
										it.bagCount ??
										(it.kgPerBag > 0 ? Math.floor(qtyKg / it.kgPerBag) : 0);

									return (
										<tr key={idx} className="border-t">
											<td className="py-2 px-3">
												<span className="font-mono text-xs bg-slate-50 px-2 py-0.5 rounded">
													{it?.lot?.label || it.lotId}
												</span>
											</td>

											<td className="py-2 px-3">{it.productType}</td>

											<td className="py-2 px-3 text-right">
												{num(qtyMon, 2)} মণ
											</td>

											<td className="py-2 px-3 text-right">
												{num(bags, 0)} বস্তা
											</td>

											<td className="py-2 px-3 text-right">
												৳{num(it.rateValue || 0, 2)}/মণ
											</td>

											<td className="py-2 px-3 text-right">{fmt(base)}</td>
										</tr>
									);
								})}
								{(!so.items || so.items.length === 0) && (
									<tr>
										<td className="py-4 text-center text-slate-400" colSpan={5}>
											No items
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</section>

				{/* Right: totals */}
				<aside className="card h-max">
					<h3 className="text-lg font-semibold mb-3">Computation</h3>
					{totals ? (
						<ul className="text-sm space-y-2">
							<li className="flex justify-between">
								<span>মোট কেজি</span>
								<b>{num(totals.totalKg, 3)} kg</b>
							</li>
							<li className="flex justify-between">
								<span>মোট মণ</span>
								<b>{num(totals.totalKg / KG_PER_MON, 2)} মণ</b>
							</li>
							<li className="flex justify-between">
								<span>বেস</span>
								<b>{fmt(totals.base)}</b>
							</li>
							<li className="flex justify-between">
								<span>ট্রান্সপোর্ট + L/UL + Misc</span>
								<b>{fmt(totals.extras)}</b>
							</li>
							<li className="flex justify-between border-t pt-2">
								<span>মোট</span>
								<b>{fmt(totals.total)}</b>
							</li>
							<li className="flex justify-between">
								<span>Avg (৳/কেজি)</span>
								<b>{fmt(totals.avgPerKg)}</b>
							</li>
							<li className="flex justify-between">
								<span>Avg (৳/মণ)</span>
								<b>{fmt(totals.avgPerMon)}</b>
							</li>
						</ul>
					) : (
						<p className="text-sm text-slate-400">No totals available.</p>
					)}
				</aside>
			</div>
		</div>
	);
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium break-words">{value}</div>
    </div>
  );
}
