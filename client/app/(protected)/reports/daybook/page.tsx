'use client';
import { useState, useEffect } from 'react';
import {
	getDaybook,
	getReportMeta,
	type DaybookDto,
} from "@/lib/api/accounting";
import { getBusinessInfo, type BusinessInfoDto } from "@/lib/api/businessInfo";
import { nf } from "@/lib/i18n";

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

export default function DaybookReport() {
	const [date, setDate] = useState<string>("");
	const [data, setData] = useState<DaybookDto | null>(null);
	const [loading, setLoading] = useState(false);
	const [businessInfo, setBusinessInfo] = useState<BusinessInfoDto | null>(
		null,
	);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const info = await getBusinessInfo();
				if (mounted) setBusinessInfo(info);
			} catch {
				if (mounted) setBusinessInfo(null);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		let mounted = true;
		getReportMeta()
			.then((meta) => {
				if (!mounted) return;
				setDate(meta.latestVoucherDate || todayISO());
			})
			.catch(() => {
				if (!mounted) return;
				setDate(todayISO());
			});
		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		if (!date) return;
		let mounted = true;
		setLoading(true);
		getDaybook(date)
			.then((value) => {
				if (mounted) setData(value);
			})
			.catch(() => {
				if (mounted) setData(null);
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});
		return () => {
			mounted = false;
		};
	}, [date]);

	return (
		<div className="flex flex-col gap-4 print:gap-0 print:p-0 print:bg-white print:max-w-full">
			<style>{`
				@media print {
					.no-print { display: none !important; }
					.print-only { display: block !important; }
					body { margin: 0; padding: 0; background: white; }
					.card { box-shadow: none !important; }
				}
				@media screen {
					.print-only { display: none; }
				}
			`}</style>
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">Day Book Report</h2>
				<div className="flex gap-2 items-center">
					<input
						type="date"
						className="input no-print"
						value={date}
						onChange={(e) => setDate(e.target.value)}
					/>
					<button
						className="btn btn-ghost no-print"
						onClick={() => window.print()}
					>
						Print
					</button>
				</div>
			</div>

			<div className="card overflow-x-auto">
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
									পূর্বদিনের অবশিষ্ট
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
									No data
								</td>
							</tr>
						)}
					</tbody>
					<tfoot>
						<tr className="border-t font-semibold">
							<td className="py-2 px-3" colSpan={3}>
								আজকের মোট
							</td>
							<td className="py-2 px-3 text-right">
								{money(data?.totals?.debit ?? 0)}
							</td>
							<td className="py-2 px-3 text-right">
								{money(data?.totals?.credit ?? 0)}
							</td>
						</tr>
						<tr className="border-t font-semibold">
							<td className="py-2 px-3" colSpan={3}>
								অবশিষ্ট
							</td>
							<td className="py-2 px-3 text-right">
								{(data?.closing ?? 0) > 0 ? money(data?.closing ?? 0) : ""}
							</td>
							<td className="py-2 px-3 text-right">
								{(data?.closing ?? 0) < 0
									? money(Math.abs(data?.closing ?? 0))
									: ""}
							</td>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	);
}
