'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { downloadCSV } from '@/lib/csv';
import { getCustomers, getSellers } from '@/lib/api/masters';
import { getProducts } from '@/lib/api/products';
import { getWarehouses } from '@/lib/api/warehouses';
import {
	getInventoryReport,
	type InventoryReportResponse,
	type InventoryReportRow,
} from "@/lib/api/inventory";
import { nf } from "@/lib/i18n";

type PartyOption = { id: string; name: string };

function isoDate(date: Date) {
	const df = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Dhaka",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	return df.format(date);
}

export default function InventoryReportPage() {
	const [rows, setRows] = useState<InventoryReportRow[]>([]);
	const [summary, setSummary] = useState<
		InventoryReportResponse["summary"] | null
	>(null);
	const [warehouses, setWarehouses] = useState<
		Array<{ id: string; name?: string }>
	>([]);
	const [products, setProducts] = useState<
		Array<{ id: string; name: string; category?: string }>
	>([]);
	const [sellers, setSellers] = useState<PartyOption[]>([]);
	const [customers, setCustomers] = useState<PartyOption[]>([]);
	const [from, setFrom] = useState(() => {
		const date = new Date();
		date.setDate(date.getDate() - 30);
		return isoDate(date);
	});
	const [to, setTo] = useState(() => isoDate(new Date()));
	const [transactionType, setTransactionType] = useState<
		"all" | "purchase" | "sale"
	>("all");
	const [partyId, setPartyId] = useState("");
	const [warehouseId, setWarehouseId] = useState("");
	const [productCategory, setProductCategory] = useState("");
	const [productId, setProductId] = useState("");
	const [q, setQ] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let mounted = true;
		async function loadOptions() {
			try {
				const [warehouseRows, productRows, sellerRows, customerRows] =
					await Promise.all([
						getWarehouses(),
						getProducts(),
						getSellers(),
						getCustomers(),
					]);

				if (!mounted) return;
				setWarehouses(warehouseRows || []);
				setProducts(productRows || []);
				setSellers(
					(sellerRows || []).map((row: any) => ({
						id: row.id,
						name: row.name,
					})),
				);
				setCustomers(
					(customerRows || []).map((row: any) => ({
						id: row.id,
						name: row.name,
					})),
				);
			} catch (err: unknown) {
				if (mounted) {
					setError(
						err instanceof Error
							? err.message
							: "Failed to load filter options",
					);
				}
			}
		}

		void loadOptions();
		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		if (transactionType === "all") {
			setPartyId("");
		}
	}, [transactionType]);

	useEffect(() => {
		setProductId("");
	}, [productCategory]);

	const categories = useMemo(() => {
		return Array.from(
			new Set(
				products.map((product) => product.category).filter(Boolean) as string[],
			),
		);
	}, [products]);

	const filteredProducts = useMemo(() => {
		if (!productCategory) return products;
		return products.filter(
			(product) =>
				(product.category || "").toLowerCase() ===
				productCategory.toLowerCase(),
		);
	}, [products, productCategory]);

	const filteredRows = useMemo(() => {
		if (!productCategory) return rows;
		const selectedCategory = productCategory.toLowerCase();
		return rows.filter((row) => {
			const product = products.find((item) => item.id === row.productId);
			return (product?.category || "").toLowerCase() === selectedCategory;
		});
	}, [rows, products, productCategory]);

	const displayRows = useMemo(() => {
		const counters = new Map<string, number>();

		return filteredRows.map((row) => {
			const refNo = row.transactionType === "purchase" ? row.poNo : row.soNo;
			const baseRef =
				refNo || (row.transactionType === "purchase" ? "PO" : "SO");
			// const key = `${row.transactionType}:${baseRef}`;
			// // const next = (counters.get(key) || 0) + 1;
			// counters.set(key, next);
			const displayRef = baseRef;
			const partyRole =
				row.transactionType === "purchase" ? "বিক্রেতা" : "ক্রেতা";
			const partyName =
				row.transactionType === "purchase"
					? row.sellerName || row.partyName || "—"
					: row.customerName || row.partyName || "—";

			return {
				...row,
				displayRef,
				partyName: `${partyName} (${partyRole})`,
				typeLabel: row.transactionType === "purchase" ? "ক্রয়" : "বিক্রয়",
			};
		});
	}, [filteredRows]);

	const totalKg = useMemo(
		() => displayRows.reduce((sum, row) => sum + Number(row.qtyKg || 0), 0),
		[displayRows],
	);

	const totalMon = useMemo(
		() => displayRows.reduce((sum, row) => sum + Number(row.mon || 0), 0),
		[displayRows],
	);

	const totalBags = useMemo(
		() => displayRows.reduce((sum, row) => sum + Number(row.bagCount || 0), 0),
		[displayRows],
	);

	const totalLots = useMemo(
		() => new Set(displayRows.map((row) => row.lotId)).size,
		[displayRows],
	);

	const purchaseRows = useMemo(
		() => displayRows.filter((row) => row.transactionType === "purchase"),
		[displayRows],
	);

	const salesRows = useMemo(
		() => displayRows.filter((row) => row.transactionType === "sale"),
		[displayRows],
	);

	const purchaseTotals = useMemo(
		() => ({
			rows: purchaseRows.length,
			kg: purchaseRows.reduce((sum, row) => sum + Number(row.qtyKg || 0), 0),
			bags: purchaseRows.reduce(
				(sum, row) => sum + Number(row.bagCount || 0),
				0,
			),
			mon: purchaseRows.reduce((sum, row) => sum + Number(row.mon || 0), 0),
			price: purchaseRows.reduce(
				(sum, row) => sum + Number(row.totalPrice || 0),
				0,
			),
		}),
		[purchaseRows],
	);

	const salesTotals = useMemo(
		() => ({
			rows: salesRows.length,
			kg: salesRows.reduce((sum, row) => sum + Number(row.qtyKg || 0), 0),
			bags: salesRows.reduce((sum, row) => sum + Number(row.bagCount || 0), 0),
			mon: salesRows.reduce((sum, row) => sum + Number(row.mon || 0), 0),
			price: salesRows.reduce(
				(sum, row) => sum + Number(row.totalPrice || 0),
				0,
			),
		}),
		[salesRows],
	);

	const netTotals = useMemo(
		() => ({
			rows: displayRows.length,
			kg: purchaseTotals.kg - salesTotals.kg,
			bags: purchaseTotals.bags - salesTotals.bags,
			mon: purchaseTotals.mon - salesTotals.mon,
			price: purchaseTotals.price - salesTotals.price,
		}),
		[displayRows.length, purchaseTotals, salesTotals],
	);

	const closingQtyKg = summary?.closingQtyKg ?? totalKg;
	const closingBags = summary?.closingBagCount ?? totalBags;
	const closingMon = summary?.closingMon ?? totalMon;
	const closingLots = summary?.totalLots ?? totalLots;
	const closingAmount =
		summary?.closingPriceByFlow ??
		displayRows.reduce((sum, row) => sum + Number(row.totalPrice || 0), 0);
	const netMonAbs = Math.abs(closingMon);
	const netDirection =
		closingMon > 0 ? "positive" : closingMon < 0 ? "negative" : "balanced";
	const netReasonText =
		closingMon > 0
			? `এই সময়সীমায় ক্রয়ের পরিমাণ বিক্রয়ের তুলনায় ${nf(netMonAbs)} মণ বেশি।`
			: closingMon < 0
				? `এই সময়সীমায় বিক্রয়ের পরিমাণ ক্রয়ের তুলনায় ${nf(netMonAbs)} মণ বেশি।`
				: "এই সময়সীমায় ক্রয় ও বিক্রয়ের পরিমাণ সমান।";

	const partyOptions =
		transactionType === "purchase"
			? sellers
			: transactionType === "sale"
				? customers
				: [];
	const partyLabel =
		transactionType === "purchase"
			? "বিক্রেতার নাম"
			: transactionType === "sale"
				? "ক্রেতার নাম"
				: "পক্ষের নাম";

	useEffect(() => {
		let mounted = true;
		async function loadReport() {
			setLoading(true);
			setError("");
			try {
				const data = await getInventoryReport({
					from,
					to,
					transactionType,
					partyId: partyId || undefined,
					warehouseId: warehouseId || undefined,
					productCategory: productCategory || undefined,
					productId: productId || undefined,
					q: q || undefined,
					pageSize: 500,
				});

				if (!mounted) return;
				setRows(data.items || []);
				setSummary(data.summary || null);
			} catch (err: unknown) {
				if (mounted) {
					setError(
						err instanceof Error
							? err.message
							: "Failed to load inventory report",
					);
				}
			} finally {
				if (mounted) setLoading(false);
			}
		}

		const timer = setTimeout(() => void loadReport(), 200);
		return () => {
			mounted = false;
			clearTimeout(timer);
		};
	}, [
		from,
		to,
		transactionType,
		partyId,
		warehouseId,
		productCategory,
		productId,
		q,
	]);

	function exportCsv() {
		const csvRows = displayRows.map((row) => ({
			Date: row.createdAt.slice(0, 10),
			Type: row.typeLabel,
			"PO / SO": row.displayRef,
			"Seller / Buyer": row.partyName || "",
			"Product Name": row.productName || "",
			Warehouse: row.warehouseName || "",
			QtyKg: row.qtyKg,
			Bags: row.bagCount,
			Mon: row.mon,
			"Unit Cost": row.unitCost,
			"Total Price": row.totalPrice,
		}));

		downloadCSV("inventory-report.csv", csvRows, [
			"Date",
			"Type",
			"PO / SO",
			"Seller / Buyer",
			"Product Name",
			"Warehouse",
			"QtyKg",
			"Bags",
			"Mon",
			"Unit Cost",
			"Total Price",
		]);
	}

	const selectedPartyName =
		partyOptions.find((party) => party.id === partyId)?.name || "";

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold">ইনভেন্টরি রিপোর্ট</h1>
					<p className="text-sm text-slate-500">
						{from} to {to}
						{transactionType !== "all"
							? ` • ${transactionType === "purchase" ? "ক্রয়" : "বিক্রয়"}`
							: " • সব ক্রয় ও বিক্রয়"}
						{selectedPartyName ? ` • ${selectedPartyName}` : ""}
					</p>
				</div>
				<div className="flex gap-2">
					<button className="btn btn-ghost" onClick={exportCsv}>
						সিএসভি এক্সপোর্ট
					</button>
					<Link href="/inventory" className="btn btn-ghost">
						ফিরে যান
					</Link>
				</div>
			</div>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
					{error}
				</div>
			)}

			<div className="card p-3">
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
					<div>
						<div className="text-xs mb-1">শুরুর তারিখ</div>
						<input
							className="input w-full"
							type="date"
							value={from}
							onChange={(e) => setFrom(e.target.value)}
						/>
					</div>
					<div>
						<div className="text-xs mb-1">শেষের তারিখ</div>
						<input
							className="input w-full"
							type="date"
							value={to}
							onChange={(e) => setTo(e.target.value)}
						/>
					</div>
					<div>
						<div className="text-xs mb-1">বিক্রয় / ক্রয়</div>
						<select
							className="input w-full"
							value={transactionType}
							onChange={(e) =>
								setTransactionType(
									e.target.value as "all" | "purchase" | "sale",
								)
							}
						>
							<option value="all">সব</option>
							<option value="purchase">ক্রয়</option>
							<option value="sale">বিক্রয়</option>
						</select>
					</div>
					<div>
						<div className="text-xs mb-1">{partyLabel}</div>
						<select
							className="input w-full"
							value={partyId}
							onChange={(e) => setPartyId(e.target.value)}
							disabled={transactionType === "all"}
						>
							<option value="">সব</option>
							{partyOptions.map((party) => (
								<option key={party.id} value={party.id}>
									{party.name}
								</option>
							))}
						</select>
					</div>
					<div>
						<div className="text-xs mb-1">Warehouse (গুদাম)</div>
						<select
							className="input w-full"
							value={warehouseId}
							onChange={(e) => setWarehouseId(e.target.value)}
						>
							<option value="">সব গুদাম</option>
							{warehouses.map((warehouse) => (
								<option key={warehouse.id} value={warehouse.id}>
									{warehouse.name || warehouse.id}
								</option>
							))}
						</select>
					</div>
					<div>
						<div className="text-xs mb-1">প্রোডাক্ট ক্যাটাগরি</div>
						<select
							className="input w-full"
							value={productCategory}
							onChange={(e) => setProductCategory(e.target.value)}
						>
							<option value="">সব ক্যাটাগরি</option>
							{categories.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</select>
					</div>
					<div>
						<div className="text-xs mb-1">প্রোডাক্ট নাম</div>
						<select
							className="input w-full"
							value={productId}
							onChange={(e) => setProductId(e.target.value)}
						>
							<option value="">সব প্রোডাক্ট</option>
							{filteredProducts.map((product) => (
								<option key={product.id} value={product.id}>
									{product.name}
								</option>
							))}
						</select>
					</div>
					<div className="xl:col-span-7">
						<div className="text-xs mb-1">খুঁজুন</div>
						<input
							className="input w-full"
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="PO/SO, বিক্রেতা, ক্রেতা, প্রোডাক্ট, গুদাম দিয়ে খুঁজুন..."
						/>
					</div>
					<div className="xl:col-span-7 text-xs text-slate-500">
						উদাহরণ: 10 kg, 10 mon, 10 bosta
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
				<div className="card p-4">
					<div className="text-xs text-slate-500">তারিখভিত্তিক নেট মণ</div>
					<div className="mt-1 text-xl font-semibold">{nf(closingMon)}</div>
				</div>
				<div className="card p-4">
					<div className="text-xs text-slate-500">তারিখভিত্তিক নেট কেজি</div>
					<div className="mt-1 text-xl font-semibold">{nf(closingQtyKg)}</div>
				</div>
				<div className="card p-4">
					<div className="text-xs text-slate-500">তারিখভিত্তিক নেট বস্তা</div>
					<div className="mt-1 text-xl font-semibold">{nf(closingBags)}</div>
				</div>
				<div className="card p-4">
					<div className="text-xs text-slate-500">তারিখভিত্তিক নেট লট</div>
					<div className="mt-1 text-xl font-semibold">{nf(closingLots)}</div>
				</div>
			</div>

			<div className="card p-0 overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b text-left text-slate-500">
							<th className="px-3 py-2">তারিখ</th>
							<th className="px-3 py-2">PO / SO</th>
							<th className="px-3 py-2">ধরণ</th>
							<th className="px-3 py-2">বিক্রেতা / ক্রেতা</th>
							<th className="px-3 py-2">প্রোডাক্ট</th>
							<th className="px-3 py-2">গুদাম</th>
							<th className="px-3 py-2 text-right">পরিমাণ (যেমন 10 kg)</th>
							<th className="px-3 py-2 text-right">বস্তা (যেমন 10 bosta)</th>
							<th className="px-3 py-2 text-right">মণ (যেমন 10 mon)</th>
							<th className="px-3 py-2 text-right">মোট মূল্য</th>
						</tr>
					</thead>
					<tbody>
						{loading && (
							<tr>
								<td className="py-6 text-center text-slate-400" colSpan={10}>
									রিপোর্ট লোড হচ্ছে...
								</td>
							</tr>
						)}

						{!loading &&
							displayRows.map((row) => (
								<tr key={row.id} className="border-t">
									<td className="px-3 py-2">{row.createdAt.slice(0, 10)}</td>
									<td className="px-3 py-2 font-medium">{row.displayRef}</td>
									<td className="px-3 py-2">{row.typeLabel}</td>
									<td className="px-3 py-2">{row.partyName || "—"}</td>
									<td className="px-3 py-2">{row.productName || "—"}</td>
									<td className="px-3 py-2">{row.warehouseName || "—"}</td>
									<td className="px-3 py-2 text-right">{nf(row.qtyKg)} kg</td>
									<td className="px-3 py-2 text-right">{nf(row.bagCount)}</td>
									<td className="px-3 py-2 text-right">{nf(row.mon)}</td>
									<td className="px-3 py-2 text-right">
										৳ {nf(row.totalPrice)}
									</td>
								</tr>
							))}

						{!loading && filteredRows.length === 0 && (
							<tr>
								<td className="py-6 text-center text-slate-400" colSpan={10}>
									কোনো ক্রয় বা বিক্রয় পাওয়া যায়নি
								</td>
							</tr>
						)}
					</tbody>
					<tfoot>
						<tr className="border-t bg-emerald-50/70 font-semibold">
							<td className="px-3 py-2">মোট ক্রয়</td>
							<td className="px-3 py-2">{nf(purchaseTotals.rows)} টি</td>
							<td className="px-3 py-2" colSpan={4}></td>
							<td className="px-3 py-2 text-right">
								{nf(purchaseTotals.kg)} কেজি
							</td>
							<td className="px-3 py-2 text-right">
								{nf(purchaseTotals.bags)} বস্তা
							</td>
							<td className="px-3 py-2 text-right">
								{nf(purchaseTotals.mon)} মণ
							</td>
							<td className="px-3 py-2 text-right">
								৳ {nf(purchaseTotals.price)}
							</td>
						</tr>
						<tr className="border-t bg-amber-50/70 font-semibold">
							<td className="px-3 py-2">মোট বিক্রয়</td>
							<td className="px-3 py-2">{nf(salesTotals.rows)} টি</td>
							<td className="px-3 py-2" colSpan={4}></td>
							<td className="px-3 py-2 text-right">
								{nf(salesTotals.kg)} কেজি
							</td>
							<td className="px-3 py-2 text-right">
								{nf(salesTotals.bags)} বস্তা
							</td>
							<td className="px-3 py-2 text-right">{nf(salesTotals.mon)} মণ</td>
							<td className="px-3 py-2 text-right">
								৳ {nf(salesTotals.price)}
							</td>
						</tr>
						<tr className="border-t bg-slate-100 font-semibold">
							<td className="px-3 py-2">তারিখভিত্তিক নেট</td>
							<td className="px-3 py-2">{nf(netTotals.rows)} টি</td>
							<td className="px-3 py-2" colSpan={4}></td>
							<td className="px-3 py-2 text-right">{nf(netTotals.kg)} কেজি</td>
							<td className="px-3 py-2 text-right">
								{nf(netTotals.bags)} বস্তা
							</td>
							<td className="px-3 py-2 text-right">{nf(netTotals.mon)} মণ</td>
							<td className="px-3 py-2 text-right">৳ {nf(netTotals.price)}</td>
						</tr>
						<tr className="border-t bg-slate-50/70 font-semibold">
							<td className="px-3 py-2">তারিখভিত্তিক সারাংশ</td>
							<td className="px-3 py-2">—</td>
							<td className="px-3 py-2" colSpan={4}></td>
							<td className="px-3 py-2 text-right">{nf(closingQtyKg)} কেজি</td>
							<td className="px-3 py-2 text-right">{nf(closingBags)} বস্তা</td>
							<td className="px-3 py-2 text-right">{nf(closingMon)} মণ</td>
							<td className="px-3 py-2 text-right">
								মোট ৳ {nf(closingAmount)}
							</td>
						</tr>
					</tfoot>
				</table>
				<div
					className={`rounded-lg border px-4 py-3 text-sm ${
						netDirection === "negative"
							? "border-rose-200 bg-rose-50 text-rose-700"
							: netDirection === "positive"
								? "border-emerald-200 bg-emerald-50 text-emerald-700"
								: "border-slate-200 bg-slate-50 text-slate-700"
					}`}
				>
					<div className="font-medium capitalize">
						মোট মজুদ পরিবর্তন: {netDirection}
					</div>
					<div className="mt-1">
						{netReasonText} রিপোর্টে শুধুমাত্র নির্বাচিত শুরু এবং শেষ তারিখের
						মধ্যে হওয়া ক্রয় ও বিক্রয় গণনা করা হয়, তাই তারিখের সীমা পরিবর্তন
						করলে এই সংখ্যাটিও পরিবর্তিত হয়।
					</div>
				</div>
			</div>
		</div>
	);
}
