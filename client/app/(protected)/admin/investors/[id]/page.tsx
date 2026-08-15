'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
	getInvestor,
	getInvestorBalance,
	getInvestorTxns,
	postInvestorTxn,
	type InvestorDto,
	type InvestorTxnDto,
} from "@/lib/api/investors";
import { nf } from "@/lib/i18n";
import { showError, showSuccess } from "@/lib/swal";

const fmt = (n: number) =>
	`৳ ${nf(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (n: number, max = 2) =>
	nf(Number(n || 0), { maximumFractionDigits: max });

type InvestorTxnKind =
	| "capitalIn"
	| "capitalOut"
	| "profitPay"
	| "adjustment"
	| "payout";

export default function InvestorDetailPage() {
	const params = useParams();
	const id = params?.id as string;

	const [inv, setInv] = useState<InvestorDto | null>(null);
	const [txns, setTxns] = useState<InvestorTxnDto[]>([]);
	const [balance, setBalance] = useState({
		capital: 0,
		profitPaid: 0,
		adjustment: 0,
		payout: 0,
		net: 0,
	});
	const [loading, setLoading] = useState(true);

	const [kind, setKind] = useState<InvestorTxnKind>("capitalIn");
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
	const [amount, setAmount] = useState("");
	const [instrument, setInstrument] = useState("cash");
	const [memo, setMemo] = useState("");

	async function reload(investorId: string) {
		const [investor, txnRows, bal] = await Promise.all([
			getInvestor(investorId),
			getInvestorTxns(investorId),
			getInvestorBalance(investorId),
		]);
		setInv(investor);
		setTxns(txnRows);
		setBalance(bal);
	}

	useEffect(() => {
		if (!id) return;
		let mounted = true;
		(async () => {
			try {
				await reload(id);
			} catch (e: any) {
				if (!mounted) return;
				await showError(e?.message || "Failed to load investor");
				setInv(null);
				setTxns([]);
				setBalance({
					capital: 0,
					profitPaid: 0,
					adjustment: 0,
					payout: 0,
					net: 0,
				});
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, [id]);

	if (loading) {
		return <div className="p-4">Loading...</div>;
	}
	if (!inv) {
		return (
			<div className="p-4">
				<h2 className="text-lg font-semibold mb-2">ইনভেস্টর পাওয়া যায়নি</h2>
			</div>
		);
	}

	async function addTxn() {
		if (!inv) return;
		const investorId = inv.id;
		const amt = Number(amount || 0);
		if (!amt || amt <= 0) {
			await showError("Amount দিন");
			return;
		}
		try {
			await postInvestorTxn(investorId, {
				kind,
				amount: amt,
				date,
				instrument,
				memo: memo.trim() || undefined,
			});
			await reload(investorId);
			setAmount("");
			setMemo("");
			await showSuccess("ট্রান্সেকশন সেভ হয়েছে");
		} catch (e: any) {
			await showError(e?.message || "Failed to save transaction");
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold">
						{inv.name} - ইনভেস্টর প্রোফাইল
					</h2>
					<p className="text-xs text-slate-500">
						Profit: {fmtNum(inv.agreementPct ?? inv.profitSharePct ?? 0, 2)}% -
						শুরু: {inv.startDate || inv.createdAt.slice(0, 10)}
					</p>
					<p className="text-xs text-slate-500">
						মোবাইল: {inv.phone || "-"} - NID: {inv.nidNo || inv.nid || "-"}
					</p>
				</div>
				<div className="text-right text-sm">
					<div>
						Capital: <b>{fmt(balance.capital)}</b>
					</div>
					<div>
						Profit Paid: <b>{fmt(balance.profitPaid)}</b>
					</div>
					<div>
						Adjustment: <b>{fmt(balance.adjustment)}</b>
					</div>
					<div>
						Payout: <b>{fmt(balance.payout)}</b>
					</div>
					<div>
						Net Balance:{" "}
						<b className={balance.net >= 0 ? "text-green-600" : "text-red-600"}>
							{fmt(balance.net)}
						</b>
					</div>
				</div>
			</div>

			<section className="card grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
				<Field label="এড্রেস">{inv.address}</Field>
				<Field label="নমিনি">{inv.nomineeName || "-"}</Field>
				<Field label="নোট" span={2}>
					{inv.notes || "-"}
				</Field>
			</section>

			<section className="card">
				<h3 className="text-lg font-semibold mb-3">
					নতুন ট্রান্সেকশন (Capital / Profit / Adjustment)
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
					<div>
						<label className="block text-sm mb-1">ধরন</label>
						<select
							className="input"
							value={kind}
							onChange={(e) => setKind(e.target.value as InvestorTxnKind)}
						>
							<option value="capitalIn">Capital In (Invest)</option>
							<option value="capitalOut">Capital Out (Withdraw)</option>
							<option value="profitPay">Profit Pay</option>
							<option value="adjustment">Adjustment</option>
							<option value="payout">Payout</option>
						</select>
					</div>
					<div>
						<label className="block text-sm mb-1">তারিখ</label>
						<input
							type="date"
							className="input"
							value={date}
							onChange={(e) => setDate(e.target.value)}
						/>
					</div>
					<div>
						<label className="block text-sm mb-1">Amount</label>
						<input
							className="input"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="যেমন: 50000"
						/>
					</div>
					<div>
						<label className="block text-sm mb-1">Instrument</label>
						<input
							className="input"
							value={instrument}
							onChange={(e) => setInstrument(e.target.value)}
							placeholder="cash / bank / bkash"
						/>
					</div>
					<div className="md:col-span-4">
						<label className="block text-sm mb-1">মেমো / নোট</label>
						<textarea
							className="input min-h-[60px]"
							value={memo}
							onChange={(e) => setMemo(e.target.value)}
							placeholder="ঐচ্ছিক"
						/>
					</div>
				</div>
				<div className="mt-4 flex justify-end">
					<button className="btn btn-primary" onClick={addTxn}>
						Add Transaction
					</button>
				</div>
			</section>

			<section className="card">
				<h3 className="text-lg font-semibold mb-3">ট্রান্সেকশন হিস্ট্রি</h3>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b bg-slate-50">
								<th className="px-2 py-2 text-left">Date</th>
								<th className="px-2 py-2 text-left">Type</th>
								<th className="px-2 py-2 text-right">Amount</th>
								<th className="px-2 py-2 text-left">Instrument</th>
								<th className="px-2 py-2 text-left">Memo</th>
								<th className="px-2 py-2 text-left">Voucher</th>
							</tr>
						</thead>
						<tbody>
							{txns.map((t) => (
								<tr key={t.id} className="border-b last:border-0">
									<td className="px-2 py-1">{t.date}</td>
									<td className="px-2 py-1">{t.kind}</td>
									<td className="px-2 py-1 text-right">
										{fmtNum(t.amount, 2)}
									</td>
									<td className="px-2 py-1">{t.instrument || "-"}</td>
									<td className="px-2 py-1">{t.memo || "-"}</td>
									<td className="px-2 py-1">
										{t.voucherId ? (
											<span className="text-xs text-slate-600">
												{t.voucherId}
											</span>
										) : (
											<span className="text-xs text-slate-400">-</span>
										)}
									</td>
								</tr>
							))}
							{txns.length === 0 && (
								<tr>
									<td
										colSpan={6}
										className="px-2 py-4 text-center text-slate-500 text-sm"
									>
										এখনও কোনো ট্রান্সেকশন নেই।
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
}

function Field({
	label,
	children,
	span,
}: {
	label: string;
	children?: React.ReactNode;
	span?: 1 | 2;
}) {
	return (
		<div className={span === 2 ? "md:col-span-2" : ""}>
			<div className="text-xs text-slate-500">{label}</div>
			<div className="font-medium text-slate-800">{children || "-"}</div>
		</div>
	);
}
