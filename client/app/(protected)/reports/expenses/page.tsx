'use client';

import { useEffect, useState } from "react";
import { t, nf } from "@/lib/i18n";
import {
	getExpenseSummary,
	getReportMeta,
	type ExpenseMonthSummaryDto,
} from "@/lib/api/accounting";
import { getBusinessInfo, type BusinessInfoDto } from "@/lib/api/businessInfo";

const MONTH_NAMES_EN = [
	"",
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

export default function ExpenseReportPage() {
	const now = new Date();
	const [year, setYear] = useState(now.getFullYear());

	const [summary, setSummary] = useState<ExpenseMonthSummaryDto[]>([]);
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
				if (meta.latestVoucherYear) setYear(meta.latestVoucherYear);
			})
			.catch(() => {
				// Keep current year fallback on metadata errors.
			});

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		getExpenseSummary(year)
			.then(setSummary)
			.catch(() => setSummary([]));
	}, [year]);

	const totalFixed = summary.reduce((s, m) => s + m.fixed, 0);
	const totalVar = summary.reduce((s, m) => s + m.variable, 0);
	const totalAll = totalFixed + totalVar;

	function downloadCsv() {
		const header = "Month,Fixed,Variable,Total,FixedPercent\n";
		const rows = summary
			.map((m) => {
				const fixed = m.fixed || 0;
				const variable = m.variable || 0;
				const total = m.total || fixed + variable;
				const pct = total > 0 ? Math.round((fixed / total) * 100) : 0;
				return `${MONTH_NAMES_EN[m.month]}-${year},${fixed},${variable},${total},${pct}`;
			})
			.join("\n");

		const csv = header + rows;
		const blob = new Blob([csv], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `expenses-${year}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

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
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold">{t("menu.expenseReport")}</h2>
					<p className="text-xs text-slate-500">
						Recurring (Fixed) বনাম Daily/Variable খরচ — মাসওয়ারি বিশ্লেষণ।
					</p>
				</div>
				<div className="flex items-center gap-2 no-print">
					<select
						className="input h-9 text-sm w-24"
						value={year}
						onChange={(e) =>
							setYear(Number(e.target.value) || now.getFullYear())
						}
					>
						{Array.from({ length: 6 }).map((_, i) => {
							const y = now.getFullYear() - 3 + i;
							return (
								<option key={y} value={y}>
									{y}
								</option>
							);
						})}
					</select>
					<button
						className="btn btn-ghost h-9 text-xs"
						onClick={() => window.print()}
					>
						Print
					</button>
					<button className="btn btn-ghost h-9 text-xs" onClick={downloadCsv}>
						Export CSV
					</button>
				</div>
			</div>

			{/* Summary cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div className="card">
					<div className="text-xs text-slate-500 mb-1">
						Total Expense ({year})
					</div>
					<div className="text-lg font-semibold">
						{nf(totalAll, { maximumFractionDigits: 0 })} ৳
					</div>
				</div>
				<div className="card">
					<div className="text-xs text-slate-500 mb-1">Fixed (Recurring)</div>
					<div className="text-lg font-semibold">
						{nf(totalFixed, { maximumFractionDigits: 0 })} ৳
					</div>
					{totalAll > 0 && (
						<div className="text-[11px] text-emerald-600 mt-1">
							{Math.round((totalFixed / totalAll) * 100)}% of total
						</div>
					)}
				</div>
				<div className="card">
					<div className="text-xs text-slate-500 mb-1">
						Variable (Daily + Others)
					</div>
					<div className="text-lg font-semibold">
						{nf(totalVar, { maximumFractionDigits: 0 })} ৳
					</div>
					{totalAll > 0 && (
						<div className="text-[11px] text-amber-600 mt-1">
							{Math.round((totalVar / totalAll) * 100)}% of total
						</div>
					)}
				</div>
			</div>

			{/* Table */}
			<div className="card">
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-sm font-semibold">Month-wise breakdown</h3>
					<p className="text-[11px] text-slate-500">
						Fixed = Recurring (RC:...), Variable = অন্যান্য expense vouchers।
					</p>
				</div>

				<div className="overflow-x-auto">
					<table className="table-auto w-full text-xs">
						<thead>
							<tr className="border-b bg-slate-50">
								<th className="text-left px-2 py-1">Month</th>
								<th className="text-right px-2 py-1">Fixed (৳)</th>
								<th className="text-right px-2 py-1">Variable (৳)</th>
								<th className="text-right px-2 py-1">Total (৳)</th>
								<th className="text-left px-2 py-1">Visual</th>
							</tr>
						</thead>
						<tbody>
							{summary.map((m) => {
								const total = m.total || m.fixed + m.variable;
								const fixedPct = total > 0 ? (m.fixed / total) * 100 : 0;
								const varPct = total > 0 ? (m.variable / total) * 100 : 0;

								return (
									<tr key={m.month} className="border-b last:border-0">
										<td className="px-2 py-1">
											{MONTH_NAMES_EN[m.month]} {year}
										</td>
										<td className="px-2 py-1 text-right">
											{m.fixed
												? nf(m.fixed, { maximumFractionDigits: 0 })
												: "-"}
										</td>
										<td className="px-2 py-1 text-right">
											{m.variable
												? nf(m.variable, { maximumFractionDigits: 0 })
												: "-"}
										</td>
										<td className="px-2 py-1 text-right">
											{total ? nf(total, { maximumFractionDigits: 0 }) : "-"}
										</td>
										<td className="px-2 py-1">
											{total > 0 ? (
												<div>
													<div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
														<div className="h-full flex">
															<div
																style={{ width: `${fixedPct}%` }}
																className="bg-emerald-500"
															/>
															<div
																style={{ width: `${varPct}%` }}
																className="bg-amber-400"
															/>
														</div>
													</div>
													<div className="flex justify-between text-[10px] text-slate-500 mt-1">
														<span>Fixed {Math.round(fixedPct)}%</span>
														<span>Var {Math.round(varPct)}%</span>
													</div>
												</div>
											) : (
												<span className="text-[10px] text-slate-400">
													No data
												</span>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
