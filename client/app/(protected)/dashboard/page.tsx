"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
	getPurchaseOrders,
	getPurchaseOrderById,
	PurchaseOrderListItemDto,
} from "@/lib/api/purchase";
import {
	getSalesOrders,
	getLots,
	type LotDto,
	type SalesOrderDto,
} from "@/lib/api/sales";
import { getVouchers, getParties, type VoucherDto } from "@/lib/api/cashbook";
import { getAccounts, getLedger, type AccountDto } from "@/lib/api/accounting";
import {
	ShoppingCart,
	Package,
	Banknote,
	FileText,
	TrendingUp,
	Users,
	Truck,
	Repeat,
} from "lucide-react";
import Sparkline from "@/components/Sparkline";
import BarChart from "@/components/BarChart";
import PieChart from "@/components/PieChart";
import AreaWave from "@/components/AreaWave";
import { nf } from "@/lib/i18n";

function todayISO() {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Dhaka",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
}
function daysAgoISO(n: number) {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d.toISOString().slice(0, 10);
}
function monthStartISO() {
	const d = new Date();
	d.setDate(1);
	return d.toISOString().slice(0, 10);
}
function n2(n: number) {
	return nf(Math.round((n || 0) * 100) / 100, {
		maximumFractionDigits: 2,
	});
}
function num(v: unknown): number {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}
function datePart(v?: string) {
	return (v || "").slice(0, 10);
}
function looksLikeUuid(v?: string) {
	if (!v) return false;
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		v,
	);
}
function stockRefLabel(
	refType: string | undefined,
	refId: string | undefined,
	poNoById: Map<string, string>,
	soNoById: Map<string, string>,
) {
	const type = (refType || "").trim().toUpperCase();
	const rawRef = (refId || "").trim();
	if (!type && !rawRef) return "-";

	let refNo = rawRef;
	if (rawRef && type === "PO") {
		refNo = poNoById.get(rawRef) || rawRef;
	} else if (rawRef && type === "SO") {
		refNo = soNoById.get(rawRef) || rawRef;
	}

	const compactRef = looksLikeUuid(refNo) ? `${refNo.slice(0, 8)}...` : refNo;
	if (!type) return compactRef || "-";
	if (!compactRef) return type;
	return `${type} ${compactRef}`;
}
function salesTotal(so: SalesOrderDto): number {
	const direct = num(so?.totals?.total ?? so?.total);
	if (direct > 0) return direct;
	const items = Array.isArray(so?.items) ? so.items : [];
	const base = items.reduce((s, item) => {
		const qtyKg = num(item?.qtyKg);
		const ratePerKg =
			item?.rateBasis === "perKg"
				? num(item?.rateValue)
				: num(item?.rateValue) / 40;
		return s + qtyKg * ratePerKg;
	}, 0);
	return base + num(so?.transport) + num(so?.loadingUnloading) + num(so?.misc);
}
function purchaseTotal(po: PurchaseOrderListItemDto): number {
	const direct = num(
		(po as any)?.totalCost ??
			(po as any)?.totals?.totalCost ??
			(po as any)?.total ??
			(po as any)?.grandTotal,
	);
	if (direct > 0) return direct;

	const items = Array.isArray((po as any)?.items) ? (po as any).items : [];
	let basePurchase = 0;
	let totalBags = 0;
	for (const item of items) {
		const bags = num(item?.bagCount);
		const actualKg = bags * num(item?.actualKgPerBag);
		const accountingKg = bags * num(item?.accountingKgPerBag);
		const stockKg =
			(item?.weightPolicy || (po as any)?.weightPolicy || "accounting") ===
			"actual"
				? actualKg
				: accountingKg;
		const ratePerKg =
			(item?.rateBasis || (po as any)?.rateBasis || "perMon") === "perKg"
				? num(item?.rateValue)
				: num(item?.rateValue) / 40;
		basePurchase += stockKg * ratePerKg;
		totalBags += bags;
	}

	const bagCostMode = (po as any)?.bagCostMode || "paid";
	const bagCostPerBag = num((po as any)?.bagCostPerBag);
	const bagCostTotal = bagCostMode === "self" ? 0 : totalBags * bagCostPerBag;
	const extraCosts =
		num((po as any)?.transport) +
		num((po as any)?.loadingUnloading) +
		num((po as any)?.misc) +
		bagCostTotal;

	return basePurchase + extraCosts;
}
function purchaseSeller(po: PurchaseOrderListItemDto): string {
	return (
		(po as any)?.sellerSnapshot?.name ||
		(po as any)?.seller?.name ||
		(po as any)?.sellerName ||
		"-"
	);
}

type KPI = {
	label: string;
	value: string;
	hint?: string;
	trend?: number[];
	href?: string;
};

type Summary = {
	totalReceivable: number;
	totalPayable: number;
	driverNet: number;
	investorNet: number;
};

type TodayStats = {
	poCount: number;
	soCount: number;
	voucherCount: number;
};

export default function DashboardPage() {
	const [kpis, setKpis] = useState<KPI[]>([]);
	const [alerts, setAlerts] = useState<string[]>([]);
	const [recentPO, setRecentPO] = useState<PurchaseOrderListItemDto[]>([]);
	const [recentSO, setRecentSO] = useState<SalesOrderDto[]>([]);
	const [recentVch, setRecentVch] = useState<VoucherDto[]>([]);
	const [recentMoves, setRecentMoves] = useState<
		{ date: string; moveNo: string; ref: string; lot: string; qty: number }[]
	>([]);
	const [topDue, setTopDue] = useState<{ name: string; balance: number }[]>([]);
	const [topPayable, setTopPayable] = useState<
		{ name: string; balance: number }[]
	>([]);
	const [salesTrend, setSalesTrend] = useState<number[]>([]);
	const [purchTrend, setPurchTrend] = useState<number[]>([]);
	const [days14, setDays14] = useState<string[]>([]);
	const [invPie, setInvPie] = useState<{ label: string; value: number }[]>([]);
	const [cashPie, setCashPie] = useState<{ label: string; value: number }[]>(
		[],
	);
	const [summary, setSummary] = useState<Summary>({
		totalReceivable: 0,
		totalPayable: 0,
		driverNet: 0,
		investorNet: 0,
	});
	const [todayStats, setTodayStats] = useState<TodayStats>({
		poCount: 0,
		soCount: 0,
		voucherCount: 0,
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let mounted = true;

		async function loadDashboard() {
			setLoading(true);
			setError("");

			const [poRes, soRes, lotRes, voucherRes, accountRes, partyRes] =
				await Promise.allSettled([
					getPurchaseOrders(10),
					getSalesOrders({ limit: 10 }),
					getLots(),
					getVouchers(undefined, undefined, 10),
					getAccounts(),
					getParties(),
				]);

			const pos = poRes.status === "fulfilled" ? poRes.value : [];
			const sos = soRes.status === "fulfilled" ? soRes.value : [];
			const lots = lotRes.status === "fulfilled" ? lotRes.value : [];
			const vchs = voucherRes.status === "fulfilled" ? voucherRes.value : [];
			const accounts =
				accountRes.status === "fulfilled" ? accountRes.value : [];
			const parties = partyRes.status === "fulfilled" ? partyRes.value : [];

			const today = todayISO();
			const from = monthStartISO();

			const inventoryVal = lots.reduce(
				(s, l) => s + num(l.availableKg) * num(l.avgCostPerKg),
				0,
			);

			const tPurch = pos
				.filter(
					(p) => p.status === "approved" && datePart(p.createdAt) === today,
				)
				.reduce((s, p) => s + purchaseTotal(p), 0);

			const tSales = sos
				.filter(
					(s) => s.status === "confirmed" && datePart(s.createdAt) === today,
				)
				.reduce((s, o) => s + salesTotal(o), 0);

			const days = Array.from({ length: 14 }, (_, i) => daysAgoISO(13 - i));
			const sTrend = days.map((ds) =>
				sos
					.filter(
						(o) => o.status === "confirmed" && datePart(o.createdAt) === ds,
					)
					.reduce((s, o) => s + salesTotal(o), 0),
			);
			const pTrend = days.map((ds) =>
				pos
					.filter(
						(p) => p.status === "approved" && datePart(p.createdAt) === ds,
					)
					.reduce((s, o) => s + purchaseTotal(o), 0),
			);

			const cashAccounts = accounts.filter((a) => a.type === "cash");
			const bankAccounts = accounts.filter((a) => a.type === "bank");

			// console.log(cashAccount, bankAccount);

			// const [cashLedgerRes, bankLedgerRes] = await Promise.allSettled([
			// 	cashAccount
			// 		? getLedger(cashAccount.id, from, today)
			// 		: Promise.resolve(null),
			// 	bankAccount
			// 		? getLedger(bankAccount.id, from, today)
			// 		: Promise.resolve(null),
			// ]);

			const cashLedgers = await Promise.all(
				cashAccounts.map((acc) => getLedger(acc.id, from, today)),
			);

			const bankLedgers = await Promise.all(
				bankAccounts.map((acc) => getLedger(acc.id, from, today)),
			);

			const cash = cashLedgers.reduce((sum, r) => sum + num(r?.closing), 0);

			const bank = bankLedgers.reduce((sum, r) => sum + num(r?.closing), 0);

			const partyAccounts = accounts.filter((a) => a.type === "party");
			const partyTypeByAccountId = new Map(
				parties
					.filter((p) => p.accountId)
					.map((p) => [p.accountId as string, p.type]),
			);
			const partyLedgerRows = await Promise.all(
				partyAccounts.map(async (account) => {
					try {
						const led = await getLedger(account.id, from, today);
						return { account, closing: num(led.closing) };
					} catch {
						return { account, closing: 0 };
					}
				}),
			);

			setDays14(days);
			setSalesTrend(sTrend);
			setPurchTrend(pTrend);

			setKpis([
				{
					label: "আজকের বিক্রয়",
					value: `৳ ${n2(tSales)}`,
					trend: sTrend,
					href: "/sales",
				},
				{
					label: "আজকের ক্রয়",
					value: `৳ ${n2(tPurch)}`,
					trend: pTrend,
					href: "/purchase",
				},
				{
					label: "ইনভেন্টরি ভ্যালু",
					value: `৳ ${n2(inventoryVal)}`,
					href: "/inventory",
				},
				{
					label: "ক্যাশ + ব্যাঙ্ক",
					value: `৳ ${n2(cash + bank)}`,
					hint: `ক্যাশ: ৳${n2(cash)} | ব্যাঙ্ক: ৳${n2(bank)}`,
					href: "/reports/cash-book",
				},
			]);

			// Alerts
			const al: string[] = [];
			const negLots = lots.filter((l) => num(l.availableKg) < 0);
			if (negLots.length > 0) {
				al.push(
					`নেগেটিভ স্টক পাওয়া গেছে: ${negLots.map((l) => l.label || l.id).join(", ")}`,
				);
			}
			if (
				poRes.status === "rejected" ||
				soRes.status === "rejected" ||
				lotRes.status === "rejected" ||
				voucherRes.status === "rejected" ||
				accountRes.status === "rejected"
			) {
				al.push("কিছু ডাটা লোড হয়নি, আংশিক তথ্য দেখানো হচ্ছে।");
			}
			setAlerts(al);

			// Party balances: Receivable/Payable + Driver/Investor
			const receivables = partyLedgerRows
				.map((x) => ({ name: x.account.name, balance: x.closing }))
				.filter((x) => x.balance > 0)
				.sort((a, b) => b.balance - a.balance)
				.slice(0, 5);

			const payables = partyLedgerRows
				.map((x) => ({ name: x.account.name, balance: x.closing }))
				.filter((x) => x.balance < 0)
				.sort((a, b) => a.balance - b.balance)
				.slice(0, 5);

			setTopDue(receivables);
			setTopPayable(payables);

			const totalReceivableAll = partyLedgerRows
				.filter((x) => x.closing > 0)
				.reduce((s, x) => s + x.closing, 0);

			const totalPayableAll = partyLedgerRows
				.filter((x) => x.closing < 0)
				.reduce((s, x) => s + x.closing, 0);

			const driverNet = partyLedgerRows
				.filter((x) => partyTypeByAccountId.get(x.account.id) === "driver")
				.reduce((s, x) => s + x.closing, 0);

			const investorNet = partyLedgerRows
				.filter((x) => partyTypeByAccountId.get(x.account.id) === "investor")
				.reduce((s, x) => s + x.closing, 0);

			setSummary({
				totalReceivable: totalReceivableAll,
				totalPayable: totalPayableAll,
				driverNet,
				investorNet,
			});

			// Recent tables
			const sortedPO = [...pos]
				.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
				.slice(0, 5);
			const enrichedPO = await Promise.all(
				sortedPO.map(async (po) => {
					const hasSeller = !!purchaseSeller(po) && purchaseSeller(po) !== "-";
					const hasCost = purchaseTotal(po) > 0;
					if (hasSeller && hasCost) return po;
					try {
						const details = await getPurchaseOrderById(po.id);
						if (!details) return po;
						return {
							...po,
							...details,
							sellerSnapshot: details.sellerSnapshot || po.sellerSnapshot,
							totalCost:
								purchaseTotal(details as any) || purchaseTotal(po as any),
						};
					} catch {
						return po;
					}
				}),
			);
			if (mounted) setRecentPO(enrichedPO);
			setRecentSO(
				[...sos]
					.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
					.slice(0, 5),
			);
			setRecentVch(
				[...vchs]
					.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
					.slice(0, 5),
			);

			const poNoById = new Map(
				pos.map((po) => [po.id, (po as any).poNo || po.id] as const),
			);
			const soNoById = new Map(
				sos.map((so) => [so.id, so.soNo || so.id] as const),
			);

			const moveRows = lots
				.flatMap((lot: LotDto) =>
					(lot.stockMoves || []).map((move) => ({
						date: datePart(move.createdAt),
						moveNo: move.moveNo || move.id || "-",
						ref: stockRefLabel(move.refType, move.refId, poNoById, soNoById),
						lot: lot.label || lot.id,
						qty: num(move.qtyKg),
					})),
				)
				.sort((a, b) => b.date.localeCompare(a.date))
				.slice(0, 8);
			setRecentMoves(moveRows);

			// Today counts
			const todayPOCount = pos.filter(
				(p) => datePart(p.createdAt) === today,
			).length;
			const todaySOCount = sos.filter(
				(s) => datePart(s.createdAt) === today,
			).length;
			const todayVchCount = vchs.filter((v) => v.vdate === today).length;
			if (mounted)
				setTodayStats({
					poCount: todayPOCount,
					soCount: todaySOCount,
					voucherCount: todayVchCount,
				});

			// Pie data: Inventory by productType
			const byType: Record<string, number> = {};
			for (const l of lots) {
				const productType = l.productType || "Unknown";
				byType[productType] =
					(byType[productType] || 0) + num(l.availableKg) * num(l.avgCostPerKg);
			}
			const invSlices = Object.entries(byType).map(([k, v]) => ({
				label: k || "Unknown",
				value: Math.max(0, v),
			}));
			if (mounted)
				setInvPie(
					invSlices.length ? invSlices : [{ label: "No Stock", value: 1 }],
				);

			// Pie data: Cash vs Bank
			if (mounted)
				setCashPie([
					{ label: "Cash", value: Math.max(0, cash) },
					{ label: "Bank", value: Math.max(0, bank) },
				]);

			if (mounted) {
				setLoading(false);
			}
		}

		loadDashboard();
		return () => {
			mounted = false;
		};
	}, []);

	// keyboard shortcuts (extended)
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (
				(e.target as HTMLElement)?.tagName === "INPUT" ||
				(e.target as HTMLElement)?.tagName === "TEXTAREA"
			)
				return;
			if (e.ctrlKey || e.metaKey || e.altKey) return;
			const key = e.key.toLowerCase();
			if (key === "p") window.location.href = "/purchase/new";
			else if (key === "s") window.location.href = "/sales/new";
			else if (key === "v") window.location.href = "/cashbook/new";
			else if (key === "g") window.location.href = "/cashbook";
			else if (key === "r") window.location.href = "/reports/daybook";
			else if (key === "l") window.location.href = "/reports/ledger";
			else if (key === "e") window.location.href = "/cashbook/expense/new";
			else if (key === "x") window.location.href = "/cashbook/recurring";
			else if (key === "i") window.location.href = "/admin/investors";
			else if (key === "t") window.location.href = "/transport/trips";
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const driverDue = Math.abs(summary.driverNet || 0);
	const investorCapital = Math.abs(summary.investorNet || 0);

	return (
		<div className="flex min-w-0 flex-col gap-6">
			{loading && (
				<div className="card p-3 text-sm text-slate-500">ডাটা লোড হচ্ছে...</div>
			)}
			{error && (
				<div className="card border-red-300 bg-red-50 p-3 text-sm text-red-700">
					{error}
				</div>
			)}
			{/* Header */}
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="min-w-0">
					<h1 className="text-2xl font-semibold">ড্যাশবোর্ড</h1>
					<p className="mt-1 text-sm leading-6 text-slate-500">
						শর্টকাট:&nbsp;
						<kbd className="kbd">P</kbd> Purchase,&nbsp;
						<kbd className="kbd">S</kbd> Sales,&nbsp;
						<kbd className="kbd">V</kbd> Voucher,&nbsp;
						<kbd className="kbd">G</kbd> Cashbook,&nbsp;
						<kbd className="kbd">R</kbd> Daybook,&nbsp;
						<kbd className="kbd">L</kbd> Ledger,&nbsp;
						<kbd className="kbd">E</kbd> Daily Exp,&nbsp;
						<kbd className="kbd">X</kbd> Recurring,&nbsp;
						<kbd className="kbd">I</kbd> Investor,&nbsp;
						<kbd className="kbd">T</kbd> Trips
					</p>
				</div>
				<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
					<Link
						href="/purchase/new"
						className="btn btn-primary w-full sm:w-auto"
					>
						<ShoppingCart className="mr-2" size={16} /> নতুন ক্রয়
					</Link>
					<Link href="/sales/new" className="btn btn-primary w-full sm:w-auto">
						<Package className="mr-2" size={16} /> নতুন বিক্রয়
					</Link>
					{/* <Link href="/cashbook/new" className="btn btn-primary">
						<Banknote className="mr-2" size={16} /> নতুন ভাউচার
					</Link> */}
					<Link
						href="/reports/daybook"
						className="btn btn-primary w-full sm:w-auto"
					>
						<FileText className="mr-2" size={16} /> Day Book
					</Link>
				</div>
			</div>

			{/* Alerts */}
			{alerts.length > 0 && (
				<div className="card border-amber-300 bg-amber-50">
					<div className="p-3 text-amber-800 text-sm">
						<ul className="list-disc ml-5">
							{alerts.map((a, i) => (
								<li key={i}>{a}</li>
							))}
						</ul>
					</div>
				</div>
			)}

			{/* KPIs */}
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
				{kpis.map((k, i) => (
					<Link
						href={k.href || "#"}
						key={i}
						className="card p-4 hover:shadow-md transition"
					>
						<div className="text-xs text-slate-500 flex items-center gap-1">
							<TrendingUp size={14} className="opacity-60" />
							{k.label}
						</div>
						<div className="text-xl font-semibold mt-1">{k.value}</div>
						{k.hint && (
							<div className="text-xs text-slate-400 mt-1">{k.hint}</div>
						)}
						{k.trend && (
							<Sparkline data={k.trend} className="mt-2 opacity-70" />
						)}
					</Link>
				))}
			</div>

			{/* Today snapshot + party summary + driver/investor */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{/* Today summary */}
				<div className="card p-3">
					<div className="text-sm font-semibold mb-2">আজকের সারাংশ</div>
					<div className="space-y-1 text-sm">
						<div className="flex justify-between">
							<span>আজকের PO</span>
							<b>{todayStats.poCount}</b>
						</div>
						<div className="flex justify-between">
							<span>আজকের SO</span>
							<b>{todayStats.soCount}</b>
						</div>
						<div className="flex justify-between">
							<span>আজকের ভাউচার</span>
							<b>{todayStats.voucherCount}</b>
						</div>
					</div>
				</div>

				{/* Party summary */}
				<div className="card p-3">
					<div className="text-sm font-semibold mb-2">Party Summary</div>
					<div className="space-y-1 text-sm">
						<div className="flex justify-between">
							<span>মোট পাওনা (Receivable)</span>
							<b>৳ {n2(summary.totalReceivable)}</b>
						</div>
						<div className="flex justify-between">
							<span>মোট দেনা (Payable)</span>
							<b>৳ {n2(Math.abs(summary.totalPayable))}</b>
						</div>
					</div>
				</div>

				{/* Driver & Investor */}
				<div className="card p-3">
					<div className="text-sm font-semibold mb-2">ড্রাইভার & ইনভেস্টর</div>
					<div className="space-y-1 text-sm">
						<div className="flex justify-between items-center">
							<div className="flex items-center gap-1">
								<Truck size={14} />
								<span>ড্রাইভার দেনা</span>
							</div>
							<b>৳ {n2(driverDue)}</b>
						</div>
						<div className="flex justify-between items-center">
							<div className="flex items-center gap-1">
								<Users size={14} />
								<span>ইনভেস্টর ক্যাপিটাল/ডিউ</span>
							</div>
							<b>৳ {n2(investorCapital)}</b>
						</div>
						<div className="text-[11px] text-slate-500 mt-1">
							* ড্রাইভার / ইনভেস্টর হিসাব স্বয়ংক্রিয়ভাবে voucher থেকে আসছে।
						</div>
					</div>
				</div>
			</div>

			{/* Quick links to key modules */}
			<div className="card p-3">
				<div className="flex items-center justify-between mb-2">
					<div className="text-sm font-semibold flex items-center gap-1">
						<Repeat size={16} />
						<span>Quick Links</span>
					</div>
				</div>
				<div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
					<Link
						href="/cashbook/expense/new"
						className="btn btn-ghost justify-start"
					>
						<Banknote size={14} className="mr-1" /> Daily Expense
					</Link>
					<Link
						href="/cashbook/recurring"
						className="btn btn-ghost justify-start"
					>
						<Repeat size={14} className="mr-1" /> Recurring Expense
					</Link>
					<Link
						href="/cashbook/party-settlement"
						className="btn btn-ghost justify-start"
					>
						<Users size={14} className="mr-1" /> Party Settlement
					</Link>
					<Link href="/admin/investors" className="btn btn-ghost justify-start">
						<Users size={14} className="mr-1" /> Investors
					</Link>
					<Link href="/transport/trips" className="btn btn-ghost justify-start">
						<Truck size={14} className="mr-1" /> Driver Trips
					</Link>
					<Link href="/inventory" className="btn btn-ghost justify-start">
						<Package size={14} className="mr-1" /> Inventory
					</Link>
				</div>
			</div>

			{/* Recent + Balances */}
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
				<div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
					<div className="card">
						<div className="p-3 border-b font-medium">সাম্প্রতিক ক্রয় (PO)</div>
						<div className="overflow-x-auto">
							<div
								className={`p-3 ${recentPO.length > 5 ? "max-h-64 overflow-y-auto" : ""}`}
							>
								<table className="min-w-[520px] w-full text-sm">
									<thead>
										<tr className="text-left text-slate-500">
											<th className="py-1">PO</th>
											<th className="py-1">Seller</th>
											<th className="py-1 text-right">Cost</th>
											<th className="py-1">Status</th>
										</tr>
									</thead>
									<tbody>
										{recentPO.map((p) => {
											const tot = Number(
												(p as any)?.totalCost ??
													(p as any)?.totals?.totalCost ??
													0,
											);
											return (
												<tr key={p.id} className="border-t">
													<td className="py-1">
														<Link className="link" href={`/purchase/${p.id}`}>
															{(p as any).poNo || p.id}
														</Link>
													</td>
													<td className="py-1">{purchaseSeller(p)}</td>
													<td className="py-1 text-right">৳ {n2(tot)}</td>
													<td className="py-1">{p.status}</td>
												</tr>
											);
										})}
										{recentPO.length === 0 && (
											<tr>
												<td
													colSpan={4}
													className="py-6 text-center text-slate-400"
												>
													No purchase yet
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>

					<div className="card">
						<div className="p-3 border-b font-medium">
							সাম্প্রতিক বিক্রয় (SO)
						</div>
						<div className="overflow-x-auto">
							<div
								className={`p-3 ${recentPO.length > 5 ? "max-h-64 overflow-y-auto" : ""}`}
							>
								<table className="min-w-[520px] w-full text-sm">
									<thead>
										<tr className="text-left text-slate-500">
											<th className="py-1">SO</th>
											<th className="py-1">Customer</th>
											<th className="py-1 text-right">Total</th>
											<th className="py-1">Status</th>
										</tr>
									</thead>
									<tbody>
										{recentSO.map((s) => {
											const tot = salesTotal(s);
											return (
												<tr key={s.id} className="border-t">
													<td className="py-1">
														<Link className="link" href={`/sales/${s.id}`}>
															{s.soNo || s.id}
														</Link>
													</td>
													<td className="py-1">
														{s.customerSnapshot?.name || "-"}
													</td>
													<td className="py-1 text-right">৳ {n2(tot)}</td>
													<td className="py-1">{s.status}</td>
												</tr>
											);
										})}
										{recentSO.length === 0 && (
											<tr>
												<td
													colSpan={4}
													className="py-6 text-center text-slate-400"
												>
													No sales yet
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>

					<div className="card">
						<div className="p-3 border-b font-medium">সাম্প্রতিক ভাউচার</div>
						<div className="overflow-x-auto">
							<div
								className={`p-3 ${recentPO.length > 5 ? "max-h-64 overflow-y-auto" : ""}`}
							>
								<table className="min-w-[520px] w-full text-sm">
									<thead>
										<tr className="text-left text-slate-500">
											<th className="py-1">Voucher</th>
											<th className="py-1">Date</th>
											<th className="py-1">Type</th>
											<th className="py-1 text-right">Amount</th>
										</tr>
									</thead>
									<tbody>
										{recentVch.map((v) => {
											const amt = (v.rows || []).reduce(
												(s: number, r: any) => s + (r.dr || 0),
												0,
											);
											return (
												<tr key={v.id} className="border-t">
													<td className="py-1">{v.voucherNo || v.id}</td>
													<td className="py-1">{v.vdate}</td>
													<td className="py-1">{v.vtype}</td>
													<td className="py-1 text-right">৳ {n2(amt)}</td>
												</tr>
											);
										})}
										{recentVch.length === 0 && (
											<tr>
												<td
													colSpan={4}
													className="py-6 text-center text-slate-400"
												>
													No vouchers
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>

					<div className="card">
						<div className="p-3 border-b font-medium">
							স্টক মুভমেন্ট (সাম্প্রতিক)
						</div>

						<div
							className={`p-3 ${
								recentMoves.length > 5 ? "max-h-64 overflow-y-auto" : ""
							}`}
						>
							<RecentMoves rows={recentMoves} />
						</div>
					</div>
				</div>

				{/* Balances */}
				<div className="card p-3">
					<div className="font-medium border-b pb-2">Receivables (Top 5)</div>
					<div className="overflow-x-auto">
						<table className="min-w-[260px] w-full text-sm mt-2">
							<tbody>
								{topDue.map((x, i) => (
									<tr key={i} className="border-t">
										<td className="py-1">{x.name}</td>
										<td className="py-1 text-right">৳ {n2(x.balance)}</td>
									</tr>
								))}
								{topDue.length === 0 && (
									<tr>
										<td className="py-6 text-center text-slate-400">
											No receivables
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>

					<div className="font-medium border-b pb-2 mt-6">Payables (Top 5)</div>
					<div className="overflow-x-auto">
						<table className="min-w-[260px] w-full text-sm mt-2">
							<tbody>
								{topPayable.map((x, i) => (
									<tr key={i} className="border-t">
										<td className="py-1">{x.name}</td>
										<td className="py-1 text-right">
											৳ {n2(Math.abs(x.balance))}
										</td>
									</tr>
								))}
								{topPayable.length === 0 && (
									<tr>
										<td className="py-6 text-center text-slate-400">
											No payables
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>

					<div className="mt-6">
						<Link href="/reports/ledger" className="btn btn-ghost w-full">
							See Full Ledger
						</Link>
					</div>
				</div>
			</div>

			{/* =================== Charts Section =================== */}
			<div className="grid grid-cols-1 2xl:grid-cols-3 gap-4">
				{/* Bar: Sales vs Purchase (14 days) */}
				<div className="card p-3">
					<div className="font-medium border-b pb-2">
						Sales vs Purchase (Last 14 days)
					</div>
					<div className="overflow-x-auto">
						<div className="min-w-[560px]">
							<BarChart
								series={[
									{ name: "Sales", data: salesTrend },
									{ name: "Purchase", data: purchTrend },
								]}
								categories={days14.map((d) => d.slice(5))} // MM-DD
								width={560}
								height={240}
								className="mt-2"
							/>
						</div>
					</div>
				</div>

				{/* Pie: Inventory by Product Type */}
				{/* <div className="card p-3">
					<div className="font-medium border-b pb-2">
						Inventory Value by Product
					</div>
					<PieChart
						data={invPie}
						width={280}
						height={220}
						innerRadius={0.55}
						className="mt-3"
						legend
					/>
				</div> */}

				{/* Wave: Sales Trend Area */}
				<div className="card p-3">
					<div className="font-medium border-b pb-2">Sales Trend (Wave)</div>
					<div className="overflow-x-auto">
						<div className="min-w-[560px]">
							<AreaWave
								data={salesTrend}
								width={560}
								height={220}
								className="mt-3"
							/>
						</div>
					</div>
				</div>

				{/* Bonus Pie: Cash vs Bank composition */}
				<div className="card p-3 2xl:col-span-1">
					<div className="font-medium border-b pb-2">Cash vs Bank</div>
					<PieChart
						data={cashPie}
						width={280}
						height={220}
						innerRadius={0.4}
						className="mt-3"
						legend
					/>
				</div>
			</div>
		</div>
	);
}

function RecentMoves({
	rows,
}: {
	rows: {
		date: string;
		moveNo: string;
		ref: string;
		lot: string;
		qty: number;
	}[];
}) {
	return (
		<div className="overflow-x-auto">
			<table className="min-w-[700px] w-full text-sm">
				<thead>
					<tr className="text-left text-slate-500">
						<th className="py-1">Date</th>
						<th className="py-1">Move</th>
						<th className="py-1">Ref</th>
						<th className="py-1">Lot</th>
						<th className="py-1 text-right">Qty (kg)</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((r, i) => (
						<tr key={i} className="border-t">
							<td className="py-1">{r.date}</td>
							<td className="py-1">{r.moveNo}</td>
							<td className="py-1">{r.ref}</td>
							<td className="py-1">{r.lot}</td>
							<td className="py-1 text-right">{n2(r.qty)}</td>
						</tr>
					))}
					{rows.length === 0 && (
						<tr>
							<td className="py-6 text-center text-slate-400" colSpan={5}>
								No moves
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}
