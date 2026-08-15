"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getSalesOrderById, type SalesOrderDto } from "@/lib/api/sales";
import { getBusinessInfo, type BusinessInfoDto } from "@/lib/api/businessInfo";
import { getAccounts, getLedger } from "@/lib/api/accounting";
import { bnDateTime, bnMoney, bnNumber } from "@/lib/format";

type PrintRow = {
	key: string;
	lotLabel: string;
	productType: string;
	bagCount: number;
	qtyKg: number;
	qtyMon: number;
	ratePerKg: number;
	ratePerMon: number;
	base: number;
};

const fmt = bnMoney;
const fmtNum = (n: number) => bnNumber(Number(n || 0), 2);
const KG_PER_MON = 40;

function ratePerKgFromBasis(
	rateBasis: "perKg" | "perMon" | undefined,
	rateValue: number | string | undefined,
) {
	const n = Number(rateValue || 0);
	return rateBasis === "perKg" ? n : n / KG_PER_MON;
}

function safeRatePerKg(rateBasis: any, rateValue: any) {
	try {
		return ratePerKgFromBasis(rateBasis, rateValue);
	} catch {
		const v = Number(rateValue || 0);
		return rateBasis === "perKg" ? v : v / (KG_PER_MON || 40);
	}
}

export default function Page() {
	const params = useParams();
	const id = (params as any)?.id as string | undefined;
	const salesOrderId = typeof id === "string" ? id : "";

	const [so, setSo] = useState<any>(null);
	const [businessInfo, setBusinessInfo] = useState<BusinessInfoDto | null>(
		null,
	);
	const [customerBalance, setCustomerBalance] = useState<number>(0);

	useEffect(() => {
		let mounted = true;

		async function loadBusinessInfo() {
			try {
				const info = await getBusinessInfo();
				if (mounted) setBusinessInfo(info);
			} catch {
				if (mounted) setBusinessInfo(null);
			}
		}

		loadBusinessInfo();

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		if (!salesOrderId) return;

		let mounted = true;

		async function loadSO() {
			try {
				const remote = await getSalesOrderById(salesOrderId);
				if (mounted) setSo(remote);
			} catch {
				if (mounted) setSo(null);
			}
		}

		loadSO();

		return () => {
			mounted = false;
		};
	}, [salesOrderId]);

	useEffect(() => {
		if (!so?.customerId) return;

		let mounted = true;

		async function loadCustomerBalance() {
			try {
				const accounts = await getAccounts();

				const customerAccount = accounts.find(
					(acc) =>
						acc.partyRefId === so.customerId && acc.partyKind === "customer",
				);

				if (customerAccount) {
					const ledger = await getLedger(customerAccount.id);

					if (mounted) {
						setCustomerBalance(ledger.closing || 0);
					}
				}
			} catch {
				if (mounted) setCustomerBalance(0);
			}
		}

		loadCustomerBalance();

		return () => {
			mounted = false;
		};
	}, [so?.customerId]);

	const totals = useMemo(() => {
		if (!so) return null;

		const items = Array.isArray(so.items) ? so.items : [];
		const base = items.reduce((sum: number, item: any) => {
			const lineBase = Number(item?.lineBase || 0);
			if (lineBase > 0) return sum + lineBase;
			const qtyKg = Number(item?.qtyKg || 0);
			const rate = ratePerKgFromBasis(item?.rateBasis, item?.rateValue);
			return sum + qtyKg * rate;
		}, 0);
		const totalKg = items.reduce(
			(sum: number, item: any) => sum + Number(item?.qtyKg || 0),
			0,
		);
		const extras =
			Number(so.transport || 0) +
			Number(so.loadingUnloading || 0) +
			Number(so.misc || 0);

		const totalsJson = (so as SalesOrderDto)?.totals;

		if (totalsJson && typeof totalsJson === "object") {
			return {
				totalKg: Number(totalsJson.totalKg || totalKg),
				base,
				extras: Number(totalsJson.extras || extras),
				total: base + Number(totalsJson.extras || extras),
				avgPerKg:
					totalKg > 0
						? (base + Number(totalsJson.extras || extras)) / totalKg
						: 0,
				avgPerMon:
					totalKg > 0
						? ((base + Number(totalsJson.extras || extras)) / totalKg) *
							KG_PER_MON
						: 0,
			};
		}
		const total = base + extras;

		const avgPerKg = totalKg > 0 ? total / totalKg : 0;

		return {
			totalKg,
			base,
			extras,
			total,
			avgPerKg,
			avgPerMon: avgPerKg * (KG_PER_MON || 40),
		};
	}, [so]);

	const itemRows = useMemo<PrintRow[]>(() => {
		if (!so) return [];

		return (so.items || []).map((it: any, idx: number) => {
			const qtyKg = Number(it.qtyKg || 0);
			const rpk = safeRatePerKg(it.rateBasis, it.rateValue);
			const base = Number(it.lineBase || 0) || rpk * qtyKg;
			const qtyMon = qtyKg / (KG_PER_MON || 40);

			return {
				key: `${it.lotId || "NA"}-${idx}`,
				lotLabel: it?.lot?.label
					? it.lot.label.split("-").slice(0, 2).join("-")
					: it.lotId || "-",
				productType: it.productType || it?.lot?.productType || "-",
				bagCount: Number(it.bagCount || 0),
				qtyKg,
				qtyMon,
				ratePerKg: rpk,
				ratePerMon: rpk * (KG_PER_MON || 40),
				base,
			};
		});
	}, [so]);

	if (!so) {
		return <div className="p-6">অবৈধ সেলস অর্ডার</div>;
	}

	const createdAt = so.createdAt ? new Date(so.createdAt) : null;
	const isDraft = String(so.status || "").toLowerCase() === "draft";
	const previousBalance = isDraft
		? customerBalance
		: customerBalance - (totals?.total || 0);
	const totalPayable = isDraft
		? customerBalance + (totals?.total || 0)
		: customerBalance;

	return (
		<div className="mx-auto max-w-[820px] bg-white p-6 print:p-0 print:max-w-full print:w-full print:bg-white print:m-0">
			<style>{`
        @page { size: A4; margin: 10mm; }

        @media print {
          .no-print { display: none !important; }

          body {
            background: #fff;
            margin: 0;
            padding: 0;
          }

          main {
            margin: 0;
            padding: 0;
          }

          .sidebar,
          .footer,
          nav,
          button,
          input,
          select {
            display: none !important;
          }

          .card {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }
        }

        .title {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: .2px;
        }

        .muted {
          color: #64748b;
          font-size: 12px;
        }

        .small {
          font-size: 12px;
        }

        .hr {
          height: 1px;
          background: #e5e7eb;
          margin: 12px 0;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
        }

        .table th,
        .table td {
          border: 1px solid #e5e7eb;
          padding: 8px;
          font-size: 12.5px;
          vertical-align: top;
        }

        .table th {
          background: #f8fafc;
          text-align: left;
        }

        .right {
          text-align: right;
        }

        .center {
          text-align: center;
        }

        .nowrap {
          white-space: nowrap;
        }

        .totals td {
          font-weight: 700;
        }

        .badge {
          display: inline-block;
          border: 1px solid #e2e8f0;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          color: #0f172a;
          background: #f8fafc;
        }
      `}</style>

			{/* Top actions */}
			<div className="no-print mb-4 flex justify-between">
				<button className="btn btn-ghost">
					<link href="/sales">ফিরে যান</link>
				</button>

				<div className="flex gap-2">
					<button
						className="btn btn-ghost"
						onClick={() => window.location.reload()}
					>
						রিফ্রেশ
					</button>

					<button className="btn btn-primary" onClick={() => window.print()}>
						প্রিন্ট
					</button>
				</div>
			</div>

			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-start gap-3">
					{/* <div className="h-11 w-11 rounded bg-brand text-white grid place-items-center font-extrabold">
						G
					</div> */}

					<div>
						<div className="title">সেলস ইনভয়েস / চালান</div>

						<div className="muted">
							এসও নম্বর: <b className="text-slate-900">{so.soNo || ""}</b>{" "}
							{createdAt ? `• তারিখ: ${bnDateTime(createdAt)}` : ""}
						</div>

						<div className="muted">
							স্ট্যাটাস: <span className="badge">{so.status || "-"}</span>
						</div>
					</div>
				</div>

				<div className="text-right">
					<div className="font-extrabold text-slate-900">
						{businessInfo?.businessName}
					</div>

					<div className="muted">প্রোঃ {businessInfo?.proprietorName}</div>

					{businessInfo?.additionalProprietor && (
						<div className="muted">{businessInfo.additionalProprietor}</div>
					)}

					<div className="muted">{businessInfo?.address}</div>

					<div className="muted">ফোন: {businessInfo?.phone1}</div>

					{businessInfo?.phone2 && (
						<div className="muted">ফোন ২: {businessInfo.phone2}</div>
					)}
				</div>
			</div>

			<div className="hr" />

			{/* Customer & Summary */}
			<div className="grid grid-cols-2 gap-4">
				<div className="card border rounded p-3">
					<div className="font-semibold mb-1">ক্রেতার তথ্য</div>

					<div className="text-sm font-medium">{so.customer?.name || "-"}</div>

					<div className="muted">
						{[so.customer?.district, so.customer?.market, so.customer?.address]
							.filter(Boolean)
							.join(" • ") || "-"}
					</div>

					{so.customer?.phone && (
						<div className="muted">ফোন: {so.customer.phone}</div>
					)}
				</div>

				<div className="card border rounded p-3">
					<div className="font-semibold mb-1">অর্ডার সারাংশ</div>

					<div className="small">
						মোট আইটেম: <b>{(so.items || []).length}</b>
					</div>

					<div className="small">
						পরিবহন খরচ: <b>{fmt(Number(so.transport || 0))}</b>
					</div>

					<div className="small">
						লোডিং/আনলোডিং: <b>{fmt(Number(so.loadingUnloading || 0))}</b>
					</div>

					<div className="small">
						বিবিধ খরচ: <b>{fmt(Number(so.misc || 0))}</b>
					</div>
				</div>
			</div>

			{/* Items table */}
			<div className="mt-4">
				<table className="table">
					<thead>
						<tr>
							<th style={{ width: "26%" }}>লট</th>

							<th style={{ width: "18%" }}>পণ্যের ধরন</th>

							<th className="right nowrap" style={{ width: "10%" }}>
								পরিমাণ (কেজি)
							</th>

							<th className="right nowrap" style={{ width: "10%" }}>
								পরিমাণ (মণ)
							</th>

							<th className="right nowrap" style={{ width: "12%" }}>
								দর (৳/কেজি)
							</th>

							<th className="right nowrap" style={{ width: "12%" }}>
								দর (৳/মণ)
							</th>

							<th className="right nowrap" style={{ width: "8%" }}>
								বস্তা
							</th>

							<th className="right nowrap" style={{ width: "12%" }}>
								মোট মূল্য
							</th>
						</tr>
					</thead>

					<tbody>
						{itemRows.map((r) => (
							<tr key={r.key}>
								<td>{r.lotLabel}</td>

								<td>{r.productType}</td>

								<td className="right nowrap">{fmtNum(r.qtyKg)}</td>

								<td className="right nowrap">{fmtNum(r.qtyMon)}</td>

								<td className="right nowrap">{fmtNum(r.ratePerKg)}</td>

								<td className="right nowrap">{fmtNum(r.ratePerMon)}</td>

								<td className="right nowrap">{fmtNum(r.bagCount)} বস্তা</td>

								<td className="right nowrap">{fmt(r.base)}</td>
							</tr>
						))}

						{!itemRows.length && (
							<tr>
								<td colSpan={8} className="center muted">
									কোনো আইটেম পাওয়া যায়নি
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* Totals */}
			{totals && (
				<div className="mt-4 grid grid-cols-2 gap-4">
					<div className="border rounded p-3">
						<div className="font-semibold mb-2">নোট / মন্তব্য</div>

						<div className="small text-slate-700">
							{so.remarks?.trim() ? so.remarks : "—"}
						</div>

						<div className="hr" />

						<div className="muted">
							শর্তাবলী: নগদ/ব্যাংক/এমএফএস গ্রহণযোগ্য • বিক্রিত পণ্য ফেরতযোগ্য
							নয়।
						</div>
					</div>

					<div className="border rounded p-3">
						<table className="table">
							<tbody className="totals">
								<tr>
									<td>মোট পরিমাণ</td>

									<td className="right nowrap">
										{fmtNum(totals.totalKg)} কেজি
									</td>
								</tr>

								<tr>
									<td>প্রোডাক্ট মূল্য</td>

									<td className="right nowrap">{fmt(totals.base)}</td>
								</tr>

								<tr>
									<td>অতিরিক্ত খরচ</td>

									<td className="right nowrap">{fmt(totals.extras)}</td>
								</tr>

								<tr>
									<td>মোট বিক্রয়</td>

									<td className="right nowrap">{fmt(totals.total)}</td>
								</tr>

								<tr
									style={{
										backgroundColor: "#f0f9ff",
									}}
								>
									<td>পূর্বের বকেয়া</td>

									<td
										className="right nowrap"
										style={{
											color: customerBalance >= 0 ? "#059669" : "#dc2626",
										}}
									>
										{fmt(previousBalance)}
									</td>
								</tr>

								<tr
									style={{
										backgroundColor: "#fef3c7",
									}}
								>
									<td
										style={{
											fontWeight: "bold",
										}}
									>
										মোট পাওনা
									</td>

									<td
										className="right nowrap"
										style={{
											fontWeight: "bold",
										}}
									>
										{fmt(totalPayable)}
									</td>
								</tr>

								<tr>
									<td>গড় দর</td>

									<td className="right nowrap">
										{fmtNum(totals.avgPerKg)} /কেজি &nbsp; • &nbsp;
										{fmtNum(totals.avgPerMon)} /মণ
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Signatures */}
			<div className="mt-6 grid grid-cols-3 gap-4">
				<div className="border rounded p-3">
					<div className="muted mb-10">প্রস্তুতকারী</div>

					<div className="hr" />

					<div className="small">স্বাক্ষর</div>
				</div>

				<div className="border rounded p-3">
					<div className="muted mb-10">যাচাইকারী</div>

					<div className="hr" />

					<div className="small">স্বাক্ষর</div>
				</div>

				<div className="border rounded p-3">
					<div className="muted mb-10">গ্রাহক গ্রহণ করেছেন</div>

					<div className="hr" />

					<div className="small">স্বাক্ষর</div>
				</div>
			</div>

			<div className="mt-4 muted center">
				Grain SaaS দ্বারা পরিচালিত • প্রিন্ট কপি
			</div>
		</div>
	);
}
