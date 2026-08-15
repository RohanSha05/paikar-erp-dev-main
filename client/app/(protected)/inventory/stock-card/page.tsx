'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLots } from "@/lib/api/sales";
import { getWarehouses } from "@/lib/api/warehouses";
import { getStockCard, type StockCardItem } from "@/lib/api/inventory";
import { nf, t } from "@/lib/i18n";

type ApiLot = {
	id: string;
	label?: string;
	productType?: string;
	product?: {
		name?: string;
	};
};

function isoDate(d: Date) {
	return d.toISOString().slice(0, 10);
}

export default function StockCardPage() {
	const [lots, setLots] = useState<ApiLot[]>([]);
	const [whs, setWhs] = useState<Array<{ id: string; name?: string }>>([]);
	const [cardData, setCardData] = useState<{
		items: StockCardItem[];
		summary: any;
	} | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const [lotId, setLotId] = useState<string>("");
	const [wh, setWh] = useState<string>("");
	const [from, setFrom] = useState<string>(() => {
		const d = new Date();
		d.setDate(d.getDate() - 30);
		return isoDate(d);
	});
	const [to, setTo] = useState<string>(() => isoDate(new Date()));

	useEffect(() => {
		let mounted = true;

		async function loadInitial() {
			setLoading(true);
			setError("");
			try {
				const [lotRows, warehouseRows] = await Promise.all([
					getLots(),
					getWarehouses(),
				]);

				if (!mounted) return;
				setLots(lotRows as any);
				setWhs(warehouseRows || []);
				setLotId((prev) => prev || (lotRows && lotRows[0]?.id) || "");
			} catch (err: unknown) {
				if (mounted) {
					setError(
						err instanceof Error
							? err.message
							: "Failed to load stock card data",
					);
				}
			} finally {
				if (mounted) setLoading(false);
			}
		}

		void loadInitial();

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		if (!lotId) return;

		let mounted = true;

		async function loadStockCard() {
			setLoading(true);
			setError("");
			try {
				const data = await getStockCard({
					lotId: lotId || undefined,
					warehouseId: wh || undefined,
					from,
					to,
					pageSize: 100,
					sortDir: "asc",
				});

				if (mounted) {
					setCardData(data);
				}
			} catch (err: unknown) {
				if (mounted) {
					setError(
						err instanceof Error ? err.message : "Failed to load stock card",
					);
				}
			} finally {
				if (mounted) setLoading(false);
			}
		}

		void loadStockCard();

		return () => {
			mounted = false;
		};
	}, [lotId, wh, from, to]);

	const selectedLot = lots.find((x) => x.id === lotId);
	const lotLabel = selectedLot?.label || lotId || "—";

	function resetFilters() {
		setWh("");
		const d = new Date();
		const t = isoDate(d);
		d.setDate(d.getDate() - 30);
		setFrom(isoDate(d));
		setTo(t);
	}

	function printCard() {
		window.print();
	}

	const summary = cardData?.summary || {
		openingQtyKg: 0,
		totalInKg: 0,
		totalOutKg: 0,
		netMovementKg: 0,
		closingQtyKg: 0,
	};
	const items = cardData?.items || [];

	return (
		<div className="flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center justify-between print:hidden">
				<div>
					<h1 className="text-2xl font-semibold">
						{t("menu.stockCard") || "Stock Card"}
					</h1>
					<p className="text-sm text-slate-500">
						Lot: <span className="font-medium">{lotLabel}</span>
						{wh ? (
							<>
								{" "}
								• WH: <span className="font-medium">{wh}</span>
							</>
						) : (
							" • All Warehouses"
						)}
					</p>
				</div>
				<div className="flex gap-2">
					<button className="btn btn-ghost" onClick={resetFilters}>
						Reset
					</button>
					<button className="btn btn-primary" onClick={printCard}>
						Print
					</button>
					<Link href="/inventory" className="btn btn-ghost">
						Back
					</Link>
				</div>
			</div>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 print:hidden">
					{error}
				</div>
			)}

			{/* Filters */}
			<div className="card p-4 print:hidden">
				<div className="grid grid-cols-1 md:grid-cols-5 gap-3">
					<div>
						<div className="text-xs mb-1">Lot</div>
						<select
							className="input w-full"
							value={lotId}
							onChange={(e) => setLotId(e.target.value)}
						>
							{lots.map((l) => (
								<option key={l.id} value={l.id}>
									{l.label || l.id} —{" "}
									{l.product?.name || l.productType || "Product"}
								</option>
							))}
						</select>
					</div>

					<div>
						<div className="text-xs mb-1">Warehouse</div>
						<select
							className="input w-full"
							value={wh}
							onChange={(e) => setWh(e.target.value)}
						>
							<option value="">All Warehouses</option>
							{whs.map((w) => (
								<option key={w.id} value={w.id}>
									{w.name || w.id}
								</option>
							))}
						</select>
					</div>

					<div>
						<div className="text-xs mb-1">From</div>
						<input
							type="date"
							className="input w-full"
							value={from}
							onChange={(e) => setFrom(e.target.value)}
						/>
					</div>

					<div>
						<div className="text-xs mb-1">To</div>
						<input
							type="date"
							className="input w-full"
							value={to}
							onChange={(e) => setTo(e.target.value)}
						/>
					</div>

					<div className="flex items-end">
						<div className="text-xs text-slate-500">
							Showing movement & running balance for selected period.
						</div>
					</div>
				</div>
			</div>

			{/* Summary */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="card p-4">
					<div className="text-xs text-slate-500">Opening (kg)</div>
					<div className="text-xl font-semibold mt-1">
						{nf(summary.openingQtyKg)}
					</div>
				</div>
				<div className="card p-4">
					<div className="text-xs text-slate-500">In (kg)</div>
					<div className="text-xl font-semibold mt-1">
						{nf(summary.totalInKg)}
					</div>
				</div>
				<div className="card p-4">
					<div className="text-xs text-slate-500">Out (kg)</div>
					<div className="text-xl font-semibold mt-1">
						{nf(summary.totalOutKg)}
					</div>
				</div>
				<div className="card p-4">
					<div className="text-xs text-slate-500">Closing (kg)</div>
					<div className="text-xl font-semibold mt-1">
						{nf(summary.closingQtyKg)}
					</div>
				</div>
			</div>

			{/* Table */}
			<div className="card p-0">
				<div className="p-3 border-b font-medium flex items-center justify-between">
					<div>Transactions</div>
					<div className="text-xs text-slate-500 hidden print:block">
						Period: {from} — {to} | Lot: {lotLabel}{" "}
						{wh ? `| WH: ${wh}` : "| WH: All"}
					</div>
				</div>
				<div className="p-3 overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-slate-500 border-b">
								<th className="py-2 px-3">Date</th>
								<th className="py-2 px-3">Ref</th>
								<th className="py-2 px-3">Warehouse</th>
								<th className="py-2 px-3 text-right">Qty (kg)</th>
								<th className="py-2 px-3">Reason</th>
							</tr>
						</thead>
						<tbody>
							{/* Opening row */}
							<tr className="border-t bg-slate-50/60">
								<td className="py-2 px-3" colSpan={4}>
									Opening
								</td>
								<td className="py-2 px-3 text-right font-medium">
									{nf(summary.openingQtyKg)}
								</td>
							</tr>

							{items.map((m) => (
								<tr key={m.id} className="border-t">
									<td className="py-2 px-3">{m.createdAt.slice(0, 10)}</td>
									<td className="py-2 px-3">
										{m.refType} {m.refId || "—"}
									</td>
									<td className="py-2 px-3">{m.warehouseName || "—"}</td>
									<td className="py-2 px-3 text-right">
										{nf(Math.abs(m.qtyKg))}
									</td>
									<td className="py-2 px-3">{m.reason}</td>
								</tr>
							))}

							{!loading && items.length === 0 && (
								<tr>
									<td className="py-6 text-center text-slate-400" colSpan={5}>
										No movement in selected period
									</td>
								</tr>
							)}

							{loading && (
								<tr>
									<td className="py-6 text-center text-slate-400" colSpan={5}>
										Loading stock card...
									</td>
								</tr>
							)}

							{/* Closing row */}
							<tr className="border-t bg-slate-50/60">
								<td className="py-2 px-3" colSpan={4}>
									Closing
								</td>
								<td className="py-2 px-3 text-right font-semibold">
									{nf(summary.closingQtyKg)}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			{/* Print styles */}
			<style jsx global>{`
				@media print {
					.print\\:hidden {
						display: none !important;
					}
					.btn,
					.input,
					select {
						display: none !important;
					}
					header,
					aside {
						display: none !important;
					}
					main {
						margin: 0 !important;
						padding: 0 !important;
					}
					.card {
						box-shadow: none !important;
						border: 0 !important;
					}
				}
			`}</style>
		</div>
	);
}
