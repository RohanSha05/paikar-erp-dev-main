"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { getBusinessInfo, type BusinessInfoDto } from "@/lib/api/businessInfo";

const DUMMY_ROWS = [
	{ product: "Rice 28", warehouse: "Main", stockKg: 1200, stockMon: 30 },
	{ product: "Rice Miniket", warehouse: "Depot", stockKg: 800, stockMon: 20 },
	{ product: "Wheat", warehouse: "Main", stockKg: 500, stockMon: 12.5 },
];

export default function Page() {
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

	return (
		<div className="flex flex-col gap-4 print:gap-0 print:p-0 print:bg-white print:max-w-full">
			<style>{`
				@media print {
					.no-print { display: none !important; }
					.print-only { display: block !important; }
					 body { margin: 0; padding: 0; background: white; }
				}
				@media screen {
					.print-only { display: none; }
				}
				.print-table { width: 100%; border-collapse: collapse; }
				.print-table th, .print-table td { border: 1px solid #e5e7eb; padding: 8px; font-size: 13px; }
				.print-table th { background: #f8fafc; text-align: left; }
				.right { text-align: right; }
			`}</style>
			<div className="print-only mb-4" style={{ display: "none" }}>
				<div className="flex items-center justify-between">
					<div>
						<div className="font-bold text-slate-900">{t("reports.stock")}</div>
					</div>
					<div className="text-right">
						<div className="font-semibold">
							{businessInfo?.businessName || "Grain SaaS"}
						</div>
						<div className="text-xs text-slate-600">
							{businessInfo?.proprietorName || "Default name"}
						</div>
					</div>
				</div>
			</div>
			<div className="flex items-center justify-between no-print">
				<h2 className="text-xl font-semibold">{t("reports.stock")}</h2>
				<button className="btn btn-ghost" onClick={() => window.print()}>
					Print
				</button>
			</div>
			<div className="card">
				<table className="print-table w-full">
					<thead>
						<tr>
							<th>Product</th>
							<th>Warehouse</th>
							<th className="right">Stock (kg)</th>
							<th className="right">Stock (mon)</th>
						</tr>
					</thead>
					<tbody>
						{DUMMY_ROWS.map((row, idx) => (
							<tr key={idx}>
								<td>{row.product}</td>
								<td>{row.warehouse}</td>
								<td className="right">{row.stockKg}</td>
								<td className="right">{row.stockMon}</td>
							</tr>
						))}
					</tbody>
				</table>
				<p className="text-slate-600 text-xs mt-2 no-print">
					(This is a prototype. Replace with live stock data.)
				</p>
			</div>
		</div>
	);
}
