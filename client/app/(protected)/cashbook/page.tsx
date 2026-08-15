'use client';
import { useEffect, useState } from 'react';
import { getCashbook, type DaybookDto } from "@/lib/api/accounting";
import { nf } from "@/lib/i18n";
import Link from "next/link";

function todayISO() {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Dhaka",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
}

function money(n: number) {
	return `৳ ${nf(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CashbookPage() {
	const [date, setDate] = useState<string>(todayISO());
	const [data, setData] = useState<DaybookDto | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		let mounted = true;
		setLoading(true);
		setError("");
		getCashbook(date)
			.then((value) => {
				if (mounted) setData(value);
			})
			.catch((err) => {
				if (mounted) setError(err?.message || "Failed to load daybook");
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});
		return () => {
			mounted = false;
		};
	}, [date]);


	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">দৈনিক ক্যাশবুক</h2>
				<div className="flex items-center gap-2">
					<input
						type="date"
						className="input"
						value={date}
						onChange={(e) => setDate(e.target.value)}
					/>
					<Link href="/cashbook/new" className="btn btn-primary">
						+ নতুন ভাউচার
					</Link>
					<button className="btn btn-ghost" onClick={() => window.print()}>
						Print
					</button>
				</div>
			</div>

			<div className="card overflow-x-auto">
				{loading && <div className="p-6 text-slate-500">Loading…</div>}
				{error && <div className="p-6 text-red-600">{error}</div>}
				<table className="min-w-full text-sm">
					<thead>
						<tr className="text-left text-slate-600">
							<th className="py-2 px-3">Voucher</th>
							<th className="py-2 px-3">Type</th>
							<th className="py-2 px-3">Narration</th>
							<th className="py-2 px-3 text-right">Debit</th>
							<th className="py-2 px-3 text-right">Credit</th>
						</tr>
					</thead>
					<tbody>
						{data && (
							<tr className="border-t bg-slate-50 font-medium">
								<td className="py-2 px-3" colSpan={3}>
									Opening Balance
								</td>
								<td className="py-2 px-3 text-right">
									{data.opening > 0 ? money(data.opening) : ""}
								</td>
								<td className="py-2 px-3 text-right">
									{data.opening < 0 ? money(Math.abs(data.opening)) : ""}
								</td>
							</tr>
						)}
						{data?.list?.map((v) => {
							return (
								<tr key={v.id} className="border-t">
									<td className="py-2 px-3">{v.voucherNo}</td>
									<td className="py-2 px-3">{v.vtype}</td>
									<td className="py-2 px-3">{v.narration || "-"}</td>
									<td className="py-2 px-3 text-right">{money(v.debit)}</td>
									<td className="py-2 px-3 text-right">{money(v.credit)}</td>
								</tr>
							);
						})}
						{!loading && (!data || data.list.length === 0) && (
							<tr>
								<td colSpan={5} className="py-6 text-center text-slate-500">
									এই দিনে কোনো ভাউচার নেই
								</td>
							</tr>
						)}
					</tbody>
					<tfoot>
						{/* <tr className="border-t font-semibold">
							<td className="py-2 px-3" colSpan={3}>
								আজকের মোট
							</td>
							<td className="py-2 px-3 text-right">
								{money(data?.totals.debit ?? 0)}
							</td>
							<td className="py-2 px-3 text-right">
								{money(data?.totals.credit ?? 0)}
							</td>
						</tr> */}

						{(() => {
							const balance = data?.closing ?? 0;

							return (
								<tr className="border-t font-semibold">
									<td className="py-2 px-3" colSpan={3}>
										Closing Balance
									</td>

									<td className="py-2 px-3 text-right">
										{balance > 0 ? money(balance) : ""}
									</td>

									<td className="py-2 px-3 text-right">
										{balance < 0 ? money(Math.abs(balance)) : ""}
									</td>
								</tr>
							);
						})()}
					</tfoot>
				</table>
			</div>
		</div>
	);
}
