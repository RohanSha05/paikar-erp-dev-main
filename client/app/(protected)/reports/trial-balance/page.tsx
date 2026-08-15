'use client';
import { useEffect, useState } from 'react';
import { getTrialBalance, type TrialBalanceDto } from "@/lib/api/accounting";
import { getBusinessInfo, type BusinessInfoDto } from "@/lib/api/businessInfo";
import { nf } from "@/lib/i18n";

function money(n: number) {
	return `৳ ${nf(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TrialBalance() {
	const [data, setData] = useState<TrialBalanceDto | null>(null);
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
		getTrialBalance()
			.then(setData)
			.catch(() => setData(null));
	}, []);

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
			<div className="print-only mb-4">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						{/* <div className="h-10 w-10 rounded bg-brand text-white grid place-items-center font-bold">
							G
						</div> */}
						<div>
							<div className="font-bold text-slate-900">Trial Balance</div>
						</div>
					</div>
					<div className="text-right">
						<div className="font-semibold">
							{businessInfo?.businessName || "Grain SaaS"}
						</div>
						<div className="text-xs text-slate-600">
							{businessInfo?.proprietorName || "Default name"}
						</div>
						{businessInfo?.address && (
							<div className="text-xs text-slate-600">
								{businessInfo.address}
							</div>
						)}
					</div>
				</div>
			</div>
			<div className="flex items-center justify-between no-print">
				<h2 className="text-xl font-semibold">Trial Balance</h2>
				<button className="btn btn-ghost" onClick={() => window.print()}>
					Print
				</button>
			</div>

			<div className="card overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead>
						<tr className="text-left text-slate-600">
							<th className="py-2 px-3">Account</th>
							<th className="py-2 px-3 text-right">Debit</th>
							<th className="py-2 px-3 text-right">Credit</th>
						</tr>
					</thead>
					<tbody>
						{data?.rows?.map((r) => (
							<tr key={r.id} className="border-t">
								<td className="py-2 px-3">{r.name}</td>
								<td className="py-2 px-3 text-right">{money(r.dr)}</td>
								<td className="py-2 px-3 text-right">{money(r.cr)}</td>
							</tr>
						))}
					</tbody>
					<tfoot>
						<tr className="border-t font-semibold">
							<td className="py-2 px-3">Total</td>
							<td className="py-2 px-3 text-right">
								{money(data?.totals?.dr ?? 0)}
							</td>
							<td className="py-2 px-3 text-right">
								{money(data?.totals?.cr ?? 0)}
							</td>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	);
}
