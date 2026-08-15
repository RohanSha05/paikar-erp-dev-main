"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getWarehouses } from "@/lib/api/warehouses";
import {
	getInventoryDashboard,
	type InventoryDashboardItem,
} from "@/lib/api/inventory";
import { nf, t } from "@/lib/i18n";
import PieChart from "@/components/PieChart";
import { downloadCSV } from "@/lib/csv";
import { getProducts } from "@/lib/api/products";

function getLotKgPerBag(row: InventoryDashboardItem): number {
	const fromItem = Number(row.kgPerBag || 0);
	if (Number.isFinite(fromItem) && fromItem > 0) return fromItem;

	return 0;
}

function getLotRemainingBags(row: InventoryDashboardItem): number {
	const liveMetaBagCount = row.remainingBagCount ?? row.bagCount;
	if (liveMetaBagCount !== undefined && liveMetaBagCount !== null) {
		const parsed = Number(liveMetaBagCount);
		if (Number.isFinite(parsed)) return parsed;
	}

	const kgPerBag = getLotKgPerBag(row);
	const availableKg = Number(row.availableKg || 0);
	return kgPerBag > 0 ? availableKg / kgPerBag : 0;
}

const CATEGORIES = [
	{ value: "", label: "সব ক্যাটাগরি" },
	{ value: "ধান", label: "ধান" },
	{ value: "চাল", label: "চাল" },
	{ value: "গম", label: "গম" },
	{ value: "ভুট্টা", label: "ভুট্টা" },
	{ value: "সরিষা", label: "সরিষা" },
	{ value: "অন্যান্য", label: "অন্যান্য" },
];

export default function InventoryPage() {
	const [rows, setRows] = useState<InventoryDashboardItem[]>([]);
	const [summary, setSummary] = useState({
		totalLots: 0,
		totalQtyKg: 0,
		totalValue: 0,
	});
	const [breakdown, setBreakdown] = useState<
		Array<{
			productId: string;
			productName: string;
			lotCount: number;
			qtyKg: number;
		}>
	>([]);
	const [q, setQ] = useState("");
	const [wh, setWh] = useState<string>("");
	const [category, setCategory] = useState<string>("");
	const [warehouses, setWarehouses] = useState<
		Array<{ id: string; name?: string }>
	>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [productId, setProductId] = useState("");

	useEffect(() => {
		let mounted = true;

		async function load() {
			setLoading(true);
			setError("");

			try {
				const [dashData, warehouseRows, productRows] = await Promise.all([
					getInventoryDashboard({
						q: q.trim() || undefined,
						warehouseId: wh || undefined,
						pageSize: 100,
						sortBy: "createdAt",
						sortDir: "desc",
					}),
					getWarehouses(),
					getProducts(),
				]);

				if (!mounted) return;

				setRows(dashData.items);
				setSummary(dashData.summary);
				setBreakdown(dashData.breakdownByProduct);
				setWarehouses(warehouseRows || []);
				setProducts(productRows || []);
			} catch (err: unknown) {
				if (mounted) {
					setError(
						err instanceof Error ? err.message : "Failed to load inventory",
					);
				}
			} finally {
				if (mounted) setLoading(false);
			}
		}

		const debounceTimer = setTimeout(() => {
			void load();
		}, 300);

		return () => {
			clearTimeout(debounceTimer);
			mounted = false;
		};
	}, [q, wh]);

	const [products, setProducts] = useState<
		Array<{
			id: string;
			name: string;
			category?: string;
		}>
	>([]);

	const lotsByProduct = useMemo(() => {
		if (!productId) return [];

		return rows.filter(
			(r) => r.productId === productId && Number(r.availableKg || 0) > 0,
		);
	}, [rows, productId]);

	const productsByCategory = useMemo(() => {
		if (!category) return products;

		return products.filter(
			(p) => p.category?.toLowerCase().trim() === category.toLowerCase().trim(),
		);
	}, [products, category]);

	useEffect(() => {
		setProductId("");
	}, [category]);

	// Filter rows by category
	const filteredRows = useMemo(() => {
		return rows
			.filter((r) => Number(r.availableKg || 0) > 0)
			.filter((r) => (productId ? r.productId === productId : true))
			.filter((r) => {
				if (!category) return true;
				// match via productsByCategory ids when no specific product selected
				return productsByCategory.some((p) => p.id === r.productId);
			});
	}, [rows, productId, category, productsByCategory]);

	// Dynamic summary based on selected category
	const filteredSummary = useMemo(() => {
		return filteredRows.reduce(
			(acc, row) => {
				acc.totalLots += 1;
				acc.totalRemainingBags += getLotRemainingBags(row);
				acc.totalQtyKg += Number(row.availableKg || 0);
				acc.totalValue += Number(row.value || 0);
				return acc;
			},
			{
				totalLots: 0,
				totalRemainingBags: 0,
				totalQtyKg: 0,
				totalValue: 0,
			},
		);
	}, [filteredRows]);

	// Pie chart data based on filtered rows
	const pieByType = useMemo(() => {
		const grouped: Record<string, number> = {};

		filteredRows.forEach((row) => {
			const key = row.productName || "Unknown";

			grouped[key] = (grouped[key] || 0) + Number(row.availableKg || 0);
		});

		return Object.entries(grouped).map(([label, value]) => ({
			label,
			value,
		}));
	}, [filteredRows]);

	function exportInventoryCSV() {
		const csvRows = filteredRows.map((r) => ({
			Lot: r.label,
			Product: r.productName,
			RemainingBags: getLotRemainingBags(r),
			KgPerBag: getLotKgPerBag(r),
			QtyKg: r.availableKg,
			AvgPerKg: r.avgCostPerKg,
			Value: r.value,
			Warehouse: r.warehouseName || "",
			CreatedAt: r.createdAt?.slice(0, 10) || "",
		}));

		downloadCSV("inventory.csv", csvRows, [
			"Lot",
			"Product",
			"RemainingBags",
			"KgPerBag",
			"QtyKg",
			"AvgPerKg",
			"Value",
			"Warehouse",
			"CreatedAt",
		]);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">
						{t("menu.inventory") || "Inventory"}
					</h1>
					<p className="text-sm text-slate-500">
						{t("dashboard.chart_inventoryByProduct") ||
							"Inventory Value by Product"}
					</p>
				</div>

				<div className="flex gap-2">
					<Link href="/inventory/adjust" className="btn btn-primary">
						Adjust
					</Link>

					<Link href="/inventory/transfer" className="btn btn-primary">
						Transfer
					</Link>

					<Link href="/inventory/stock-card" className="btn btn-ghost">
						{t("menu.stockCard") || "Stock Card"}
					</Link>

					<Link href="/inventory/report" className="btn btn-ghost">
						Report
					</Link>

					<button className="btn btn-ghost" onClick={exportInventoryCSV}>
						{t("inventory.exportCsv") || "Export CSV"}
					</button>
				</div>
			</div>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
					{error}
				</div>
			)}

			{/* Filters */}
			<div className="card p-3">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					{/* Product Category Filter */}
					<select
						className="input w-full min-w-0"
						value={category}
						onChange={(e) => setCategory(e.target.value)}
					>
						{CATEGORIES.map((cat) => (
							<option key={cat.value} value={cat.value}>
								{cat.label}
							</option>
						))}
					</select>

					{/* Product Name Filter */}
					<select
						className="input w-full min-w-0"
						value={productId}
						onChange={(e) => setProductId(e.target.value)}
					>
						<option value="">সব পণ্য</option>

						{productsByCategory.map((p) => (
							<option key={p.id} value={p.id}>
								{p.name}
							</option>
						))}
					</select>

					{/* Search input */}
					<input
						className="input w-full min-w-0"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="Search by lot, product, warehouse..."
					/>

					{/* Warehouse selector */}
					<select
						className="input w-full min-w-0"
						value={wh}
						onChange={(e) => setWh(e.target.value)}
					>
						<option value="">All Warehouses</option>

						{warehouses.map((w) => (
							<option key={w.id} value={w.id}>
								{w.name || w.id}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Summary */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="card p-4">
					<div className="text-xs text-slate-500">লট সমুহ</div>
					<div className="text-xl font-semibold mt-1">
						{nf(filteredSummary.totalLots)}
					</div>
				</div>

				<div className="card p-4">
					<div className="text-xs text-slate-500">মোট বস্তা</div>
					<div className="text-xl font-semibold mt-1">
						{nf(filteredSummary.totalRemainingBags)} বস্তা
					</div>
				</div>

				<div className="card p-4">
					<div className="text-xs text-slate-500">মোট মন</div>
					<div className="text-xl font-semibold mt-1">
						{nf(filteredSummary.totalQtyKg / 40)} মন
					</div>
				</div>

				<div className="card p-4">
					<div className="text-xs text-slate-500">ইনভেন্টরি মূল্য</div>
					<div className="text-xl font-semibold mt-1">
						৳ {nf(filteredSummary.totalValue)}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 2xl:grid-cols-3 gap-4">
				<div className="card p-0 2xl:col-span-2 overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-slate-500 border-b">
								<th className="py-2 px-3">Lot</th>
								<th className="py-2 px-3">Product</th>
								<th className="py-2 px-3 text-right">Remaining bags</th>
								<th className="py-2 px-3 text-right">Available (kg)</th>
								<th className="py-2 px-3 text-right">Available (mon)</th>
								<th className="py-2 px-3 text-right">Avg/ kg</th>
								<th className="py-2 px-3 text-right">Value</th>
								<th className="py-2 px-3">WH</th>
								<th className="py-2 px-3">Action</th>
							</tr>
						</thead>

						<tbody>
							{loading && (
								<tr>
									<td className="py-6 text-center text-slate-400" colSpan={9}>
										Loading inventory...
									</td>
								</tr>
							)}

							{!loading &&
								filteredRows.map((r) => (
									<tr key={r.id} className="border-t">
										<td className="py-2 px-3">{r.label}</td>

										<td className="py-2 px-3">{r.productName}</td>

										<td className="py-2 px-3 text-right">
											{nf(getLotRemainingBags(r))}
										</td>

										<td className="py-2 px-3 text-right">
											{nf(r.availableKg)}
										</td>

										<td className="py-2 px-3 text-right">
											{nf(r.availableKg / 40)}
										</td>

										<td className="py-2 px-3 text-right">
											৳ {nf(r.avgCostPerKg)}
										</td>

										<td className="py-2 px-3 text-right">৳ {nf(r.value)}</td>

										<td className="py-2 px-3">{r.warehouseName}</td>

										<td className="py-2 px-3">
											<Link href={`/inventory/${r.id}`} className="link">
												View
											</Link>
										</td>
									</tr>
								))}

							{!loading && filteredRows.length === 0 && (
								<tr>
									<td className="py-6 text-center text-slate-400" colSpan={9}>
										No lots found
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				<div className="card p-3">
					<div className="font-medium border-b pb-2">
						{t("dashboard.chart_inventoryByProduct") ||
							"Inventory Value by Product"}
					</div>

					<PieChart
						data={pieByType}
						width={280}
						height={220}
						innerRadius={0.5}
						className="mt-3  flex-col"
						legend
					/>
				</div>
			</div>
		</div>
	);
}
