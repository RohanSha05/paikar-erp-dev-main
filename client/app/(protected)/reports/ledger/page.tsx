"use client";
import { useEffect, useState } from "react";
import {
	getAccounts,
	getLedger,
	getReportMeta,
	type AccountDto,
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

function formatTime(iso: string) {
	return new Date(iso).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function LedgerReport() {
	const [accounts, setAccounts] = useState<AccountDto[]>([]);
	const [selectedType, setSelectedType] = useState<string>("");
	const [accId, setAccId] = useState<string>("");

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
			setAccounts(rows);
			setAccId(rows[0]?.id || "");
		});
	}, []);

	useEffect(() => {
		if (filteredAccounts.length > 0) {
			setAccId(filteredAccounts[0].id);
		}
	}, [selectedType]);

	const categories = Array.from(
		new Set(accounts.map((a) => (a.type === "party" ? a.partyKind : a.type))),
	);

	const filteredAccounts = accounts.filter((a) => {
		if (a.type === "party") {
			return a.partyKind === selectedType;
		}
		return a.type === selectedType;
	});

	useEffect(() => {
		if (accId) {
			getLedger(accId, from, to)
				.then(setData)
				.catch(() => setData(null));
		}
	}, [accId, from, to]);

	const sortedRows = [...(data?.rows || [])].sort((a, b) => {
		return (
			new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
			a.vId.localeCompare(b.vId)
		);
	});

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
				<h2 className="text-xl font-semibold">Ledger</h2>
				<div className="flex gap-2 items-center no-print">
					<select
						className="input w-56 min-w-[220px]"
						value={selectedType}
						onChange={(e) => {
							setSelectedType(e.target.value);
							setAccId(""); // reset second dropdown
						}}
					>
						<option value="">Select Type</option>
						{categories.map((c) => (
							<option key={c} value={c}>
								{c}
							</option>
						))}
					</select>
					<select
						className="input w-56 min-w-[220px]"
						value={accId}
						onChange={(e) => setAccId(e.target.value)}
					>
						<option value="">Select Account</option>
						{filteredAccounts.map((a) => (
							<option key={a.id} value={a.id}>
								{a.name}
							</option>
						))}
					</select>
					<input
						type="date"
						className="input"
						value={from}
						onChange={(e) => setFrom(e.target.value)}
					/>
					<input
						type="date"
						className="input"
						value={to}
						onChange={(e) => setTo(e.target.value)}
					/>
					<button className="btn btn-ghost" onClick={() => window.print()}>
						Print
					</button>
				</div>
			</div>

			<div className="card overflow-x-auto">
				{!data && (
					<div className="p-6 text-slate-500">
						ডাটার জন্য উপরে নির্বাচন করুন
					</div>
				)}
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
							{sortedRows.map((r) => (
								<tr key={r.vId + r.date} className="border-t">
									<td className="py-2 px-3">
										<div>{r.date}</div>
										<div className="text-xs text-slate-500">
											{formatTime(r.createdAt)}
										</div>
									</td>
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
