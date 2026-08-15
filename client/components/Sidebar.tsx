'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from "react";
import { logout } from "@/lib/auth";
import {
	LayoutDashboard,
	Banknote,
	ShoppingCart,
	Package,
	FileText,
	Settings,
	Users,
	Languages,
	Shield,
	BadgePercent,
	Printer,
	PlusCircle,
	List as ListIcon,
	PaintBucket,
	CalendarDays,
	BarChart3,
	Truck,
	User,
	ChevronDown,
	Menu,
	X,
} from "lucide-react";
import { t, getLocale, setLocale, type Locale } from "@/lib/i18n";

export default function Sidebar() {
	const pathname = usePathname();
	const locale = getLocale();

	const [open, setOpen] = useState(false);

	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	useEffect(() => {
		if (!open) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [open]);

	const isActive = (href: string) =>
		pathname === href || pathname.startsWith(href + "/");

	// Details detection for conditional Print buttons
	const onPODetail = /^\/purchase\/[^/]+$/.test(pathname || "");
	const onSODetail = /^\/sales\/[^/]+$/.test(pathname || "");

	return (
		<>
			{/* Mobile toggle button */}
			<button
				className="md:hidden fixed top-3 left-3 z-50 btn btn-ghost p-2 shadow-sm"
				type="button"
				aria-label="Open sidebar menu"
				aria-expanded={open}
				onClick={() => setOpen(true)}
			>
				<Menu size={18} />
			</button>

			{/* Overlay for mobile when sidebar open */}
			{open && (
				<div
					className="fixed inset-0 bg-black/40 z-40 md:hidden"
					onClick={() => setOpen(false)}
				/>
			)}

			<aside
				className={`sidebar p-4 flex flex-col bg-white z-50 transform transition-transform duration-200 md:relative md:translate-x-0 ${
					open
						? "fixed inset-y-0 left-0 h-dvh w-72 max-w-[85vw] overflow-y-auto shadow-2xl"
						: "hidden md:flex"
				}`}
			>
				{/* Close button for mobile */}
				<div className="md:hidden mb-4 flex justify-end">
					<button
						type="button"
						className="btn btn-ghost p-2"
						onClick={() => setOpen(false)}
						aria-label="Close sidebar menu"
					>
						<X size={18} />
					</button>
				</div>
				{/* Brand */}
				<Link href="/dashboard" className="flex items-center gap-2 mb-6">
					<div className="h-9 w-9 rounded-lg bg-brand text-white grid place-items-center font-bold">
						JMJ
					</div>
					<div className="flex flex-col">
						<div className="text-lg font-semibold leading-tight">
							Paikar POS
						</div>
						<div className="text-[10px] uppercase tracking-wide text-slate-400">
							Grain & Rice SaaS
						</div>
					</div>
				</Link>

				{/* Lang Switch */}
				<div className="flex items-center gap-2 mb-4">
					<LangPill
						code="bn"
						active={locale === "bn"}
						onClick={() => setLocale("bn")}
					/>
					<LangPill
						code="en"
						active={locale === "en"}
						onClick={() => setLocale("en")}
					/>
				</div>

				{/* MAIN */}
				<nav className="flex flex-col gap-1">
					<Link
						href="/dashboard"
						className={`nav-link ${isActive("/dashboard") ? "active" : ""}`}
					>
						<LayoutDashboard size={18} />
						{t("menu.dashboard")}
					</Link>
				</nav>

				{/* CASHBOOK SECTION */}
				<SectionDropdown
					title={t("menu.cashbook")}
					icon={<Banknote size={18} />}
					defaultOpen={
						isActive("/cashbook") || isActive("/admin/recurring-expenses")
					}
				>
					<Link
						href="/cashbook"
						className={`nav-link ${pathname === "/cashbook" ? "active" : ""}`}
					>
						<Banknote size={18} />
						{t("menu.cashBookReport")}
					</Link>

					<Link
						href="/cashbook/expense/new"
						className={`nav-link ${
							isActive("/cashbook/expense") ? "active" : ""
						}`}
					>
						<PlusCircle size={18} />
						{t("menu.cashbookDailyExpense")}
					</Link>

					<Link
						href="/admin/recurring-expenses"
						className={`nav-link ${
							isActive("/admin/recurring-expenses") ? "active" : ""
						}`}
					>
						<CalendarDays size={18} />
						{t("menu.recurringExpense")}
					</Link>

					<Link
						href="/cashbook/party-settlement"
						className={`nav-link ${
							isActive("/cashbook/party-settlement") ? "active" : ""
						}`}
					>
						<ListIcon size={18} />
						পার্টি সেটেলমেন্ট
					</Link>
				</SectionDropdown>

				<SectionDropdown
					title={t("menu.purchase")}
					icon={<ShoppingCart size={18} />}
					defaultOpen={isActive("/purchase")}
				>
					<Link
						href="/purchase/new"
						className={`nav-link ${isActive("/purchase/new") ? "active" : ""}`}
					>
						<PlusCircle size={18} />
						{t("menu.purchaseNew")}
					</Link>
					<Link
						href="/purchase/retail/new"
						className={`nav-link ${isActive("/purchase/retail/new") ? "active" : ""}`}
					>
						<PlusCircle size={18} />
						খুচরা ক্রয় (নতুন)
					</Link>

					<Link
						href="/purchase/retail/drafts"
						className={`nav-link ${isActive("/purchase/retail/drafts") ? "active" : ""}`}
					>
						<ListIcon size={18} />
						খুচরা ক্রয় ফাইনালাইজ
					</Link>
					<Link
						href="/purchase"
						className={`nav-link ${pathname === "/purchase" ? "active" : ""}`}
					>
						<ListIcon size={18} />
						{t("menu.purchaseList")}
					</Link>
					{/* {onPODetail && (
					<Link href={`${pathname}/print`} target="_blank" className="nav-link">
						<Printer size={18} />
						{t("menu.purchasePrint")}
					</Link>
				)} */}
				</SectionDropdown>

				<SectionDropdown
					title={t("menu.sales")}
					icon={<Package size={18} />}
					defaultOpen={isActive("/sales")}
				>
					<Link
						href="/sales/new"
						className={`nav-link ${isActive("/sales/new") ? "active" : ""}`}
					>
						<PlusCircle size={18} />
						{t("menu.salesNew")}
					</Link>

					<Link
						href="/sales"
						className={`nav-link ${pathname === "/sales" ? "active" : ""}`}
					>
						<ListIcon size={18} />
						{t("menu.salesList")}
					</Link>

					{/* {onSODetail && (
					<Link href={`${pathname}/print`} target="_blank" className="nav-link">
						<Printer size={18} />
						{t("menu.salesPrint")}
					</Link>
				)} */}
				</SectionDropdown>

				<Link
					href="/parties"
					className={`nav-link ${isActive("/parties") ? "active" : ""}`}
				>
					<Users size={18} />
					{t("menu.parties")}
				</Link>

				{/* TRANSPORT SECTION */}
				<div className="mt-6 text-xs uppercase text-slate-500 px-3">
					{t("menu.transport")}
				</div>
				<nav className="mt-2 flex flex-col gap-1">
					<Link
						href="/transport/trips"
						className={`nav-link ${isActive("/transport/trips") ? "active" : ""}`}
					>
						<Truck size={18} />
						{t("menu.transportTrips")}
					</Link>
				</nav>
				<nav className="mt-2 flex flex-col gap-1">
					<Link
						href="/transport/drivers"
						className={`nav-link ${isActive("/transport/drivers") ? "active" : ""}`}
					>
						<User size={18} />
						{t("menu.transportDrivers")}
					</Link>
				</nav>

				<SectionDropdown
					title={t("menu.reports")}
					icon={<FileText size={18} />}
					defaultOpen={isActive("/reports")}
				>
					<Link
						href="/reports/daybook"
						className={`nav-link ${isActive("/reports/daybook") ? "active" : ""}`}
					>
						<ListIcon size={18} />
						{t("menu.reportsDaybook")}
					</Link>

					<Link
						href="/reports/ledger"
						className={`nav-link ${isActive("/reports/ledger") ? "active" : ""}`}
					>
						<ListIcon size={18} />
						{t("menu.ledger")}
					</Link>

					<Link
						href="/reports/cash-book"
						className={`nav-link ${isActive("/reports/cash-book") ? "active" : ""}`}
					>
						<ListIcon size={18} />
						{t("menu.cashBookReport")}
					</Link>

					<Link
						href="/reports/bank-book"
						className={`nav-link ${isActive("/reports/bank-book") ? "active" : ""}`}
					>
						<ListIcon size={18} />
						{t("menu.bankBookReport")}
					</Link>

					<Link
						href="/reports/trial-balance"
						className={`nav-link ${isActive("/reports/trial-balance") ? "active" : ""}`}
					>
						<ListIcon size={18} />
						{t("menu.trialBalance")}
					</Link>

					<Link
						href="/reports/expenses"
						className={`nav-link ${isActive("/reports/expenses") ? "active" : ""}`}
					>
						<BarChart3 size={18} />
						{t("menu.expenseReport")}
					</Link>
				</SectionDropdown>

				<SectionDropdown
					title={t("menu.inventory")}
					icon={<Package size={18} />}
					defaultOpen={isActive("/inventory") || isActive("/products")}
				>
					<Link
						href="/inventory"
						className={`nav-link ${isActive("/inventory") ? "active" : ""}`}
					>
						<ListIcon size={18} />
						{t("menu.inventory")}
					</Link>
					<Link
						href="/inventory/report"
						className={`nav-link ${isActive("/inventory/report") ? "active" : ""}`}
					>
						<ListIcon size={18} />
						{t("menu.inventoryReports")}
					</Link>

					<Link
						href="/inventory/stock-card"
						className={`nav-link ${isActive("/inventory/stock-card") ? "active" : ""}`}
					>
						<ListIcon size={18} />
						{t("menu.stockCard")}
					</Link>
					<Link
						href="/inventory/warehouses"
						className={`nav-link ${isActive("/inventory/warehouses") ? "active" : ""}`}
					>
						<ListIcon size={18} />
						{t("menu.warehouses")}
					</Link>
					<Link
						href="/products"
						className={`nav-link ${isActive("/products") ? "active" : ""}`}
					>
						<ListIcon size={18} />
						{t("menu.products")}
					</Link>
				</SectionDropdown>

				{/* ADMIN SECTION */}
				<div className="mt-6 text-xs uppercase text-slate-500 px-3">
					{t("menu.admin")}
				</div>
				<nav className="mt-2 flex flex-col gap-1">
					<Link
						href="/admin/settings"
						className={`nav-link ${isActive("/admin/settings") ? "active" : ""}`}
					>
						<Settings size={18} />
						{t("menu.settings")}
					</Link>
					<Link
						href="/admin/accounts"
						className={`nav-link ${isActive("/admin/accounts") ? "active" : ""}`}
					>
						<Banknote size={18} />
						অ্যাকাউন্টস
					</Link>
					<Link
						href="/admin/investors"
						className={`nav-link ${isActive("/admin/investors") ? "active" : ""}`}
					>
						<Users size={18} />
						{t("menu.investors")}
					</Link>
					<Link
						href="/admin/users"
						className={`nav-link ${isActive("/admin/users") ? "active" : ""}`}
					>
						<Users size={18} />
						{t("menu.users")}
					</Link>
					<Link
						href="/admin/dictionaries"
						className={`nav-link ${isActive("/admin/dictionaries") ? "active" : ""}`}
					>
						<Languages size={18} />
						{t("menu.dictionaries")}
					</Link>
					{/* <Link
					href="/admin/cost-components"
					className={`nav-link ${isActive("/admin/cost-components") ? "active" : ""}`}
				>
					<BadgePercent size={18} />
					{t("menu.costComponents")}
				</Link> */}
					{/* <Link
					href="/admin/permissions"
					className={`nav-link ${isActive("/admin/permissions") ? "active" : ""}`}
				>
					<Shield size={18} />
					{t("menu.permissions")}
				</Link> */}
					<Link
						href="/admin/backup"
						className={`nav-link ${isActive("/admin/backup") ? "active" : ""}`}
					>
						<PaintBucket size={18} />
						{t("menu.backup")}
					</Link>
				</nav>

				{/* Logout bottom */}
				<div className="mt-auto pt-4">
					<button className="btn btn-ghost w-full" onClick={() => logout()}>
						Logout
					</button>
				</div>
			</aside>
		</>
	);
}

function LangPill({
	code,
	active,
	onClick,
}: {
	code: Locale;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`h-7 rounded-full px-3 text-xs border ${
				active
					? "bg-slate-900 text-white border-slate-900"
					: "hover:bg-slate-100"
			}`}
			title={code.toUpperCase()}
		>
			{code.toUpperCase()}
		</button>
	);
}

function SectionDropdown({
	title,
	icon,
	defaultOpen,
	children,
}: {
	title: string;
	icon: React.ReactNode;
	defaultOpen?: boolean;
	children: React.ReactNode;
}) {
	return (
		<details className="mt-6" open={defaultOpen}>
			<summary className="nav-link list-none cursor-pointer select-none">
				{icon}
				<span className="flex-1">{title}</span>
				<ChevronDown
					size={16}
					className="transition-transform group-open:rotate-180"
				/>
			</summary>
			<nav className="mt-2 ml-4 flex flex-col gap-1">{children}</nav>
		</details>
	);
}
