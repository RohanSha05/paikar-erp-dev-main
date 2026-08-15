"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
	getPurchaseOrderById,
	type PurchaseOrderDetailsDto,
} from "@/lib/api/purchase";
import { getBusinessInfo, type BusinessInfoDto } from "@/lib/api/businessInfo";
import { bnDateTime, bnMoney, bnNumber } from "@/lib/format";

const KG_PER_MON = 40;
const fmt = bnMoney;
const fmtNum = (n: number) => bnNumber(Number(n || 0), 2);

function num(v: unknown): number {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

function productLabel(it: any): string {
	return (
		it?.productName ||
		it?.productType ||
		it?.product?.name ||
		it?.productId ||
		"-"
	);
}

function calcTotalsForPO(po: PurchaseOrderDetailsDto) {
	const items =
		Array.isArray(po.items) && po.items.length
			? po.items
			: [
					{
						productName: po.productType,
						bagCount: po.bagCount,
						actualKgPerBag: po.actualKgPerBag,
						accountingKgPerBag: po.accountingKgPerBag,
						weightPolicy: po.weightPolicy,
						rateBasis: po.rateBasis,
						rateValue: po.rateValue,
					},
				];

	let totalBags = 0;
	let stockKg = 0;
	let basePurchase = 0;

	const productSummaries = items.map((it: any) => {
		const bags = num(it.bagCount);

		const actualKg = bags * num(it.actualKgPerBag);
		const accKg = bags * num(it.accountingKgPerBag);

		const lineStockKg =
			(it.weightPolicy || po.weightPolicy || "accounting") === "actual"
				? actualKg
				: accKg;

		const rateBasis = (it.rateBasis || po.rateBasis || "perMon") as
			| "perMon"
			| "perKg"
			| "perBag";

		const rateValue = num(it.rateValue);

		let lineCost = 0;

		if (rateBasis === "perBag") {
			lineCost = bags * rateValue;
		} else {
			const ratePerKg =
				rateBasis === "perKg" ? rateValue : rateValue / KG_PER_MON;

			lineCost = lineStockKg * ratePerKg;
		}

		totalBags += bags;
		stockKg += lineStockKg;
		basePurchase += lineCost;

		const avgPerKg = lineStockKg > 0 ? lineCost / lineStockKg : 0;

		return {
			product: productLabel(it),
			bags,
			stockKg: lineStockKg,
			lineCost,
			avgPerKg,
			avgPerMon: avgPerKg * KG_PER_MON,
		};
	});

	const bagCostMode = po.bagCostMode || "paid";

	const bagCostTotal =
		bagCostMode === "self" ? 0 : totalBags * num(po.bagCostPerBag);

	const extraCosts =
		num(po.transport) + num(po.loadingUnloading) + num(po.misc) + bagCostTotal;

	const totalCostFromApi = num(po.totalCost ?? po.totals?.totalCost);

	const totalCost =
		totalCostFromApi > 0 ? totalCostFromApi : basePurchase + extraCosts;

	const avgPerKg = stockKg > 0 ? totalCost / stockKg : 0;

	return {
		productSummaries,

		totalBags,
		stockKg,
		basePurchase,
		bagCostTotal,
		extraCosts,
		totalCost,

		avgPerKg,
		avgPerMon: avgPerKg * KG_PER_MON,
	};
}

export default function Page() {
	const params = useParams<{ id: string }>();
	const id = params?.id;

	const [po, setPo] = useState<PurchaseOrderDetailsDto | null>(null);
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
		if (!id) return;

		let mounted = true;

		(async () => {
			try {
				const found = await getPurchaseOrderById(id);
				if (mounted) setPo(found);
			} catch {
				if (mounted) setPo(null);
			}
		})();

		return () => {
			mounted = false;
		};
	}, [id]);

	const totals = useMemo(() => (po ? calcTotalsForPO(po) : null), [po]);

	if (!po) return <div className="p-6">অবৈধ ক্রয় অর্ডার</div>;

	const destText = (() => {
		if (po.destinationKind === "mill") {
			return `সরাসরি মিল: ${
				(po as any).destinationCustomer?.name ||
				(typeof po.warehouse === "string"
					? po.warehouse
					: po.warehouse?.name || "মিল")
			}`;
		}

		return `গুদাম: ${
			typeof po.warehouse === "string"
				? po.warehouse
				: po.warehouse?.name || "-"
		}`;
	})();

	return (
		<div className="mx-auto max-w-[900px] bg-white p-6 print:p-0 print:bg-white print:max-w-full print:w-full print:m-0">
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
        }

        .title {
          font-size: 20px;
          font-weight: 700;
        }

        .muted {
          color: #64748b;
          font-size: 12px;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
        }

        .table th,
        .table td {
          border: 1px solid #e5e7eb;
          padding: 8px;
          font-size: 13px;
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

        .totals td {
          font-weight: 600;
        }
      `}</style>

			<div className="no-print mb-4 flex justify-between">
				<button className="btn btn-ghost" onClick={() => history.back()}>
					ফিরে যান
				</button>

				<button className="btn btn-primary" onClick={() => window.print()}>
					প্রিন্ট
				</button>
			</div>

			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					{/* <div className="h-10 w-10 rounded bg-brand text-white grid place-items-center font-bold">
						G
					</div> */}

					<div>
						<div className="title">ক্রয় ভাউচার</div>

						<div className="muted">
							পিও: {(po as any).poNo || po.id} • তারিখ:{" "}
							{bnDateTime(po.createdAt || new Date().toISOString())}
						</div>
					</div>
				</div>

				<div className="text-right">
					<div className="font-semibold">
						{businessInfo?.businessName || "Grain SaaS"}
					</div>

					<div className="muted">
						{businessInfo?.proprietorName || "ডিফল্ট নাম"}
					</div>

					{businessInfo?.address && (
						<div className="muted">{businessInfo.address}</div>
					)}

					{businessInfo?.phone1 && (
						<div className="muted">ফোন: {businessInfo.phone1}</div>
					)}
				</div>
			</div>

			<div className="mt-4 grid grid-cols-2 gap-4 text-sm">
				<div className="border rounded p-3">
					<div className="font-semibold mb-1">বিক্রেতা</div>

					<div>{po.seller?.name || "-"}</div>

					<div className="muted">
						{[po.seller?.district, po.seller?.market, po.seller?.address]
							.filter(Boolean)
							.join(" • ")}
					</div>

					<div className="muted">{po.seller?.phone}</div>
				</div>

				<div className="border rounded p-3">
					<div className="font-semibold mb-1">ক্রয়ের তথ্য</div>

					<div>ধরণ: {po.purchaseType || "-"}</div>

					<div>গন্তব্য: {destText}</div>

					<div>স্ট্যাটাস: {po.status || "-"}</div>
				</div>
			</div>

			<div className="mt-4">
				{totals?.productSummaries?.length ? (
					<div className="mt-4">
						<div className="font-semibold mb-2">পণ্যভিত্তিক গড় ক্রয় মূল্য</div>

						<table className="table">
							<thead>
								<tr>
									<th>পণ্য</th>
									<th className="right">বস্তা</th>
									<th className="right">মোট কেজি</th>
									<th className="right">মোট মূল্য</th>
									<th className="right">গড় ৳/কেজি</th>
									<th className="right">গড় ৳/মণ</th>
								</tr>
							</thead>

							<tbody>
								{totals.productSummaries.map((p: any, idx: number) => (
									<tr key={idx}>
										<td>{p.product}</td>

										<td className="right">{fmtNum(p.bags)}</td>

										<td className="right">{fmtNum(p.stockKg)}</td>

										<td className="right">{fmt(p.lineCost)}</td>

										<td className="right">{fmt(p.avgPerKg)}</td>

										<td className="right">{fmt(p.avgPerMon)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}
			</div>

			{totals && (
				<div className="mt-4">
					<table className="table">
						<tbody className="totals">
							<tr>
								<td>মোট কেজি</td>

								<td className="right">{fmtNum(totals.stockKg)}</td>
							</tr>

							<tr>
								<td>মোট বস্তা</td>

								<td className="right">{fmtNum(totals.totalBags)}</td>
							</tr>

							<tr>
								<td>মূল ক্রয় মূল্য</td>

								<td className="right">{fmt(totals.basePurchase)}</td>
							</tr>

							<tr>
								<td>বস্তা খরচ</td>

								<td className="right">{fmt(totals.bagCostTotal)}</td>
							</tr>

							<tr>
								<td>অতিরিক্ত খরচ</td>

								<td className="right">{fmt(totals.extraCosts)}</td>
							</tr>

							<tr>
								<td>সর্বমোট খরচ</td>

								<td className="right">{fmt(totals.totalCost)}</td>
							</tr>
						</tbody>
					</table>

					<div className="mt-2 text-xs text-slate-500">
						নোট: ১ মণ = {KG_PER_MON} কেজি
					</div>
				</div>
			)}
		</div>
	);
}