'use client';
import { useEffect, useState } from 'react';
import {
	getAccounts,
	getLedger,
	getReportMeta,
	type LedgerReportDto,
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
function monthStartISO() {
	const d = new Date();
	d.setDate(1);
	return d.toISOString().slice(0, 10);
}

function monthStartFromISO(dateISO: string) {
	if (!dateISO) return monthStartISO();
	return `${dateISO.slice(0, 8)}01`;
}

function money(n: number) {
	return `৳ ${nf(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BankBookReport() {
	const [from, setFrom] = useState<string>("");
	const [to, setTo] = useState<string>("");
	const [data, setData] = useState<LedgerReportDto | null>(null);
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
				const latestDate = meta.latestVoucherDate || todayISO();
				setFrom(monthStartFromISO(latestDate));
				setTo(latestDate);
			})
			.catch(() => {
				if (!mounted) return;
				setFrom(monthStartISO());
				setTo(todayISO());
			});
		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		getAccounts().then((rows) => {
			const bank = rows.find((a) => a.code === "AC-BANK" || a.type === "bank");
			if (bank) return getLedger(bank.id, from, to).then(setData);
			setData(null);
		});
	}, [from, to]);

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
				<h2 className="text-xl font-semibold">Bank Book</h2>
				<div className="flex gap-2 items-center">
					<input
						type="date"
						className="input no-print"
						value={from}
						onChange={(e) => setFrom(e.target.value)}
					/>
					<input
						type="date"
						className="input no-print"
						value={to}
						onChange={(e) => setTo(e.target.value)}
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
				{!data && <div className="p-6 text-slate-500">Loading…</div>}
				{data && (
					<table className="min-w-full text-sm">
						<thead>
							<tr className="text-left text-slate-600">
								<th className="py-2 px-3">Date</th>
								<th className="py-2 px-3">Voucher</th>
								<th className="py-2 px-3">Narration</th>
								<th className="py-2 px-3 text-right">Debit</th>
								<th className="py-2 px-3 text-right">Credit</th>
								<th className="py-2 px-3 text-right">Balance</th>
							</tr>
						</thead>
						<tbody>
							<tr className="border-t bg-slate-50">
								<td className="py-2 px-3" colSpan={5}>
									Opening
								</td>
								<td className="py-2 px-3 text-right">
									{money(Number(data.opening || 0))}
								</td>
							</tr>
							{data?.rows.map((r) => (
								<tr key={r.vId + r.date} className="border-t">
									<td className="py-2 px-3">{r.date}</td>
									<td className="py-2 px-3">{r.vId}</td>
									<td className="py-2 px-3">{r.memo || "-"}</td>
									<td className="py-2 px-3 text-right">
										{r.dr ? money(r.dr) : ""}
									</td>
									<td className="py-2 px-3 text-right">
										{r.cr ? money(r.cr) : ""}
									</td>
									<td className="py-2 px-3 text-right">{money(r.balance)}</td>
								</tr>
							))}
							<tr className="border-t font-semibold">
								<td className="py-2 px-3" colSpan={5}>
									Closing
								</td>
								<td className="py-2 px-3 text-right">
									{money(Number(data.closing || 0))}
								</td>
							</tr>
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
