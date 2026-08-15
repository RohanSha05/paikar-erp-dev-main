"use client";

import { useEffect, useMemo, useState } from "react";
import { nf } from "@/lib/i18n";
import { showConfirm, showError, showSuccess } from "@/lib/swal";
import { getAccounts, type AccountDto } from "@/lib/api/cashbook";
import {
	createInvestor,
	deleteInvestor,
	getInvestorBalance,
	getInvestorTxns,
	listInvestors,
	postInvestorTxn,
	updateInvestor,
	type InvestorBalanceDto,
	type InvestorDto,
	type InvestorTxnDto,
} from "@/lib/api/investors";
import { useAccountBalance } from "@/lib/hooks/useAccountBalance";

const TXN_KINDS = [
	"capitalIn",
	"capitalOut",
	"profitPay",
	"payout",
	"adjustment",
] as const;

type TxnKind = (typeof TXN_KINDS)[number];

const txnKindLabel: Record<TxnKind, string> = {
	capitalIn: "মূলধন প্রবেশ",
	capitalOut: "মূলধন বাহির",
	profitPay: "মুনাফা প্রদান",
	adjustment: "সমন্বয়",
	payout: "পেআউট",
};

export default function InvestorsPage() {
	const [loading, setLoading] = useState(true);
	const [selectedLoading, setSelectedLoading] = useState(false);

	const [investors, setInvestors] = useState<InvestorDto[]>([]);
	const [filter, setFilter] = useState("");
	const [payAccounts, setPayAccounts] = useState<AccountDto[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [selectedBalance, setSelectedBalance] =
		useState<InvestorBalanceDto | null>(null);
	const [selectedTxns, setSelectedTxns] = useState<InvestorTxnDto[]>([]);

	const [formId, setFormId] = useState<string | null>(null);
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [address, setAddress] = useState("");
	const [nidNo, setNidNo] = useState("");
	const [nomineeName, setNomineeName] = useState("");
	const [startDate, setStartDate] = useState("");
	const [photoUrl, setPhotoUrl] = useState("");
	const [notes, setNotes] = useState("");
	const [agreementPct, setAgreementPct] = useState("");
	const [active, setActive] = useState(true);

	const [txnKind, setTxnKind] = useState<TxnKind>("capitalIn");
	const [txnAmount, setTxnAmount] = useState("");
	const [txnPayAccountId, setTxnPayAccountId] = useState("");
	const [txnMemo, setTxnMemo] = useState("");

	const {
		balance: txnPayAccountBalance,
		loading: txnPayAccountBalanceLoading,
		error: txnPayAccountBalanceError,
	} = useAccountBalance(txnPayAccountId || null);

	const selectedInvestor = useMemo(
		() => investors.find((item) => item.id === selectedId) || null,
		[investors, selectedId],
	);

	const filteredInvestors = useMemo(() => {
		const q = (filter || "").trim().toLowerCase();
		if (!q) return investors;
		return investors.filter(
			(inv) =>
				(inv.name || "").toLowerCase().includes(q) ||
				(inv.phone || "").includes(q) ||
				(inv.address || "").toLowerCase().includes(q),
		);
	}, [investors, filter]);

	useEffect(() => {
		let mounted = true;
		(async () => {
			setLoading(true);
			try {
				const [rows, accounts] = await Promise.all([
					listInvestors(),
					getAccounts(),
				]);
				if (!mounted) return;
				setInvestors(rows);
				setPayAccounts(accounts);
				setSelectedId((prev) => prev ?? rows[0]?.id ?? null);
			} catch (error) {
				if (!mounted) return;
				await showError(
					error instanceof Error
						? error.message
						: "ইনভেস্টর লোড করতে ব্যর্থ হয়েছে",
				);
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		if (!selectedId) {
			setSelectedBalance(null);
			setSelectedTxns([]);
			return;
		}
		let mounted = true;
		(async () => {
			setSelectedLoading(true);
			try {
				const [balance, txns] = await Promise.all([
					getInvestorBalance(selectedId),
					getInvestorTxns(selectedId),
				]);
				if (!mounted) return;
				setSelectedBalance(balance);
				setSelectedTxns(txns);
			} catch (error) {
				if (!mounted) return;
				await showError(
					error instanceof Error
						? error.message
						: "ইনভেস্টরের বিবরণ লোড করতে ব্যর্থ হয়েছে",
				);
			} finally {
				if (mounted) setSelectedLoading(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, [selectedId]);

	function resetForm() {
		setFormId(null);
		setName("");
		setPhone("");
		setAddress("");
		setNidNo("");
		setNomineeName("");
		setStartDate("");
		setPhotoUrl("");
		setNotes("");
		setAgreementPct("");
		setActive(true);
	}

	function onEdit(inv: InvestorDto) {
		setFormId(inv.id);
		setName(inv.name || "");
		setPhone(inv.phone || "");
		setAddress(inv.address || "");
		setNidNo(inv.nidNo || "");
		setNomineeName(inv.nomineeName || "");
		setStartDate(inv.startDate ? String(inv.startDate).slice(0, 10) : "");
		setPhotoUrl(inv.photoUrl || "");
		setNotes(inv.notes || "");
		setAgreementPct(inv.agreementPct != null ? String(inv.agreementPct) : "");
		setActive(inv.active);
	}

	async function refreshInvestors(nextSelectedId?: string) {
		const rows = await listInvestors();
		setInvestors(rows);
		if (typeof nextSelectedId !== "undefined") {
			setSelectedId(nextSelectedId);
			return;
		}
		if (selectedId && !rows.some((item) => item.id === selectedId)) {
			setSelectedId(rows[0]?.id || null);
		}
	}

	async function onDelete(id: string) {
		const result = await showConfirm(
			"এই ইনভেস্টরকে ডিলিট করতে চান? (তার ভাউচার থাকবে)",
		);
		if (!result.isConfirmed) return;
		try {
			await deleteInvestor(id);
			await refreshInvestors(
				selectedId === id ? undefined : selectedId || undefined,
			);
			if (selectedId === id) {
				setSelectedId(null);
				setSelectedBalance(null);
				setSelectedTxns([]);
			}
			if (formId === id) resetForm();
			await showSuccess("ইনভেস্টর মুছে ফেলা হয়েছে");
		} catch (error) {
			await showError(
				error instanceof Error ? error.message : "ইনভেস্টর মুছতে ব্যর্থ হয়েছে",
			);
		}
	}

	async function onSave() {
		if (!name.trim()) {
			await showError("ইনভেস্টরের নাম দিন");
			return;
		}

		const payload = {
			name: name.trim(),
			phone: phone.trim() || undefined,
			address: address.trim() || undefined,
			nidNo: nidNo.trim() || undefined,
			nomineeName: nomineeName.trim() || undefined,
			startDate: startDate || undefined,
			photoUrl: photoUrl.trim() || undefined,
			notes: notes.trim() || undefined,
			agreementPct: agreementPct ? Number(agreementPct) : undefined,
			profitSharePct: agreementPct ? Number(agreementPct) : undefined,
			active,
		};

		try {
			const saved = formId
				? await updateInvestor(formId, payload)
				: await createInvestor(payload);
			await refreshInvestors(saved.id);
			resetForm();
			await showSuccess(
				formId ? "ইনভেস্টর আপডেট হয়েছে" : "ইনভেস্টর তৈরি হয়েছে",
			);
		} catch (error) {
			await showError(
				error instanceof Error
					? error.message
					: "ইনভেস্টর সংরক্ষণ করতে ব্যর্থ হয়েছে",
			);
		}
	}

	async function onPostTxn() {
		if (!selectedInvestor) {
			await showError("প্রথমে ইনভেস্টর নির্বাচন করুন");
			return;
		}
		const amt = Number(txnAmount || 0);
		if (!(amt > 0)) {
			await showError("Amount শূন্য হতে পারে না");
			return;
		}
		if (!txnPayAccountId) {
			await showError("Pay account নির্বাচন করুন");
			return;
		}

		// prevent posting if amount exceeds selected pay account balance
		if (
			typeof txnPayAccountBalance === "number" &&
			Number(txnAmount || 0) > txnPayAccountBalance
		) {
			await showError("নির্বাচিত পে অ্যাকাউন্টের ব্যালেন্স অতিক্রম করেছে");
			return;
		}

		try {
			await postInvestorTxn(selectedInvestor.id, {
				kind: txnKind,
				amount: amt,
				date: new Intl.DateTimeFormat("en-CA", {
					timeZone: "Asia/Dhaka",
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
				}).format(new Date()),
				instrument: txnPayAccountId,
				memo: txnMemo,
				payAccountId: txnPayAccountId,
			});
			const [balance, txns] = await Promise.all([
				getInvestorBalance(selectedInvestor.id),
				getInvestorTxns(selectedInvestor.id),
			]);
			setSelectedBalance(balance);
			setSelectedTxns(txns);
			setTxnAmount("");
			setTxnMemo("");
			await showSuccess("ট্রান্সেকশন পোস্ট হয়েছে");
		} catch (error) {
			await showError(
				error instanceof Error
					? error.message
					: "ট্রান্সেকশন পোস্ট করতে ব্যর্থ হয়েছে",
			);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold">বিনিয়োগকারী মডিউল</h2>
					<p className="text-xs text-slate-500">
						ইনভেস্টর প্রোফাইল, চুক্তি শতাংশ, মূলধন প্রবেশ / পেআউট ও ব্যালেন্স
						সারাংশ।
					</p>
				</div>
				{loading && <div className="text-xs text-slate-500">লোড হচ্ছে...</div>}
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
				<section className="card xl:col-span-1">
					<div className="flex items-center justify-between mb-3 gap-2">
						<div className="flex-1">
							<h3 className="text-sm font-semibold">ইনভেস্টরগণ</h3>
							<p className="text-xs text-slate-500">
								বিবরণ দেখতে একজন ইনভেস্টর নির্বাচন করুন
							</p>
						</div>
						<div className="w-40">
							<input
								className="input w-full"
								placeholder="নাম, ফোন বা ঠিকানা খুঁজুন"
								value={filter}
								onChange={(e) => setFilter(e.target.value)}
							/>
						</div>
						<button
							className="text-[11px] text-slate-500 hover:underline ml-2"
							onClick={() => {
								resetForm();
								setSelectedId(null);
							}}
						>
							নতুন
						</button>
					</div>
					{filteredInvestors.length === 0 ? (
						<p className="text-xs text-slate-500">
							এখনো কোনো ইনভেস্টর যোগ করেননি।
						</p>
					) : (
						<ul className="divide-y text-sm max-h-[60vh] overflow-y-auto">
							{filteredInvestors.map((inv) => {
								const isSelected = inv.id === selectedId;
								return (
									<li
										key={inv.id}
										className={`py-2 px-2 rounded-md cursor-pointer flex flex-col gap-1 ${isSelected ? "bg-slate-50 border border-slate-200" : ""}`}
										onClick={() => setSelectedId(inv.id)}
									>
										<div className="flex items-center justify-between gap-2">
											<div className="font-medium">
												{inv.name}
												{inv.active ? (
													<span className="ml-1 inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-[1px] text-[10px] text-emerald-600">
														সক্রিয়
													</span>
												) : (
													<span className="ml-1 inline-flex items-center rounded-full bg-slate-100 px-1.5 py-[1px] text-[10px] text-slate-500">
														নিষ্ক্রিয়
													</span>
												)}
											</div>
											<div className="flex gap-1 text-[11px]">
												<button
													className="text-slate-500 hover:underline"
													onClick={(e) => {
														e.stopPropagation();
														onEdit(inv);
													}}
												>
													সম্পাদনা
												</button>
												<button
													className="text-red-500 hover:underline"
													onClick={(e) => {
														e.stopPropagation();
														void onDelete(inv.id);
													}}
												>
													মুছুন
												</button>
											</div>
										</div>
										<div className="text-[11px] text-slate-500">
											{inv.phone || ""} {inv.phone && inv.address && "•"}{" "}
											{inv.address || ""}
										</div>
										{inv.agreementPct != null && (
											<div className="text-[11px] text-emerald-600">
												মুনাফার ভাগ: {inv.agreementPct}%
											</div>
										)}
									</li>
								);
							})}
						</ul>
					)}
				</section>

				<section className="card xl:col-span-1">
					<h3 className="mb-3 text-sm font-semibold">
						{formId ? "ইনভেস্টর সম্পাদনা" : "নতুন ইনভেস্টর"}
					</h3>
					<div className="space-y-3 text-sm">
						<div>
							<label className="mb-1 block text-xs">নাম</label>
							<input
								className="input"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="ইনভেস্টরের নাম"
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs">মোবাইল</label>
							<input
								className="input"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								placeholder="যেমন: ০১XXXXXXXXX"
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs">ঠিকানা</label>
							<input
								className="input"
								value={address}
								onChange={(e) => setAddress(e.target.value)}
								placeholder="ঠিকানা"
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="mb-1 block text-xs">
									জাতীয় পরিচয়পত্র নম্বর
								</label>
								<input
									className="input"
									value={nidNo}
									onChange={(e) => setNidNo(e.target.value)}
									placeholder="NID নম্বর"
								/>
							</div>
							<div>
								<label className="mb-1 block text-xs">
									মুনাফার ভাগ % (ঐচ্ছিক)
								</label>
								<input
									className="input"
									type="number"
									min={0}
									max={100}
									value={agreementPct}
									onChange={(e) => setAgreementPct(e.target.value)}
									placeholder="যেমন: ২০"
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="mb-1 block text-xs">নমিনির নাম</label>
								<input
									className="input"
									value={nomineeName}
									onChange={(e) => setNomineeName(e.target.value)}
									placeholder="নমিনির নাম"
								/>
							</div>
							<div>
								<label className="mb-1 block text-xs">চুক্তির শুরু</label>
								<input
									type="date"
									className="input"
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
								/>
							</div>
						</div>
						<div>
							<label className="mb-1 block text-xs">ছবির লিংক (ঐচ্ছিক)</label>
							<input
								className="input"
								value={photoUrl}
								onChange={(e) => setPhotoUrl(e.target.value)}
								placeholder="লিংক"
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs">মন্তব্য</label>
							<textarea
								className="input min-h-[70px]"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="চুক্তির সারাংশ, বিশেষ শর্ত ইত্যাদি"
							/>
						</div>
						<div className="flex items-center gap-2">
							<input
								id="inv-active"
								type="checkbox"
								checked={active}
								onChange={(e) => setActive(e.target.checked)}
							/>
							<label htmlFor="inv-active" className="text-xs">
								সক্রিয়
							</label>
						</div>
					</div>
					<div className="mt-4 flex justify-end gap-2 text-xs">
						<button className="btn btn-ghost btn-sm" onClick={resetForm}>
							রিসেট
						</button>
						<button
							className="btn btn-primary btn-sm"
							onClick={() => void onSave()}
						>
							{formId ? "আপডেট" : "সংরক্ষণ"}
						</button>
					</div>
				</section>

				<section className="card xl:col-span-2">
					{selectedInvestor ? (
						<>
							<div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
								<div>
									<h3 className="text-sm font-semibold">
										{selectedInvestor.name}
									</h3>
									<p className="text-[11px] text-slate-500">
										{selectedInvestor.phone && `${selectedInvestor.phone} • `}
										{selectedInvestor.address}
									</p>
									{selectedInvestor.agreementPct != null && (
										<p className="text-[11px] text-emerald-600">
											মুনাফার ভাগ: {selectedInvestor.agreementPct}%
										</p>
									)}
									{selectedInvestor.nomineeName && (
										<p className="text-[11px] text-slate-500">
											নমিনি: {selectedInvestor.nomineeName}
										</p>
									)}
									{selectedInvestor.startDate && (
										<p className="text-[11px] text-slate-500">
											চুক্তি শুরুর তারিখ:{" "}
											{String(selectedInvestor.startDate).slice(0, 10)}
										</p>
									)}
								</div>
								{selectedBalance && (
									<div className="text-right text-[11px] text-slate-600">
										<div>
											মূলধন:{" "}
											<span className="font-medium">
												{nf(selectedBalance.capital || 0, {
													maximumFractionDigits: 0,
												})}{" "}
												৳
											</span>
										</div>
										<div>
											মুনাফা প্রদান:{" "}
											<span className="font-medium">
												{nf(selectedBalance.profitPaid || 0, {
													maximumFractionDigits: 0,
												})}{" "}
												৳
											</span>
										</div>
										<div>
											সমন্বয়:{" "}
											<span className="font-medium">
												{nf(selectedBalance.adjustment || 0, {
													maximumFractionDigits: 0,
												})}{" "}
												৳
											</span>
										</div>
										<div>
											পেআউট:{" "}
											<span className="font-medium">
												{nf(selectedBalance.payout || 0, {
													maximumFractionDigits: 0,
												})}{" "}
												৳
											</span>
										</div>
										<div>
											নিট:{" "}
											<span className="font-medium">
												{nf(selectedBalance.net || 0, {
													maximumFractionDigits: 0,
												})}{" "}
												৳
											</span>
										</div>
									</div>
								)}
							</div>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="rounded-lg border bg-slate-50/60 p-3">
									<h4 className="mb-2 text-xs font-semibold">
										মূলধন / পেআউট / মুনাফা
									</h4>
									<div className="space-y-2 text-xs">
										<div>
											<label className="mb-1 block">লেনদেনের ধরন</label>
											<div className="grid grid-cols-3 gap-1">
												{TXN_KINDS.map((kind) => (
													<button
														key={kind}
														type="button"
														className={`rounded border px-1 py-1 text-[11px] ${txnKind === kind ? "border-slate-900 bg-slate-900 text-white" : "bg-white hover:bg-slate-100"}`}
														onClick={() => setTxnKind(kind)}
													>
														{txnKindLabel[kind]}
													</button>
												))}
											</div>
										</div>
										<div className="grid grid-cols-2 gap-2">
											<div>
												<label className="mb-1 block">পরিমাণ (৳)</label>
												<input
													className="input"
													value={txnAmount}
													onChange={(e) => setTxnAmount(e.target.value)}
													type="number"
													min={0}
												/>
											</div>
											<div>
												<label className="mb-1 block">পে অ্যাকাউন্ট</label>
												<select
													className="input"
													value={txnPayAccountId}
													onChange={(e) =>
														setTxnPayAccountId(e.target.value || "")
													}
												>
													<option value="">-- নির্বাচন --</option>
													{payAccounts
														.filter(
															(a) => a.type === "cash" || a.type === "bank",
														)
														.map((account) => (
															<option key={account.id} value={account.id}>
																{account.name}
															</option>
														))}
												</select>
												{txnPayAccountId ? (
													<div className="text-[11px] mt-1 text-slate-600">
														{txnPayAccountBalanceLoading ? (
															"ব্যালেন্স লোড হচ্ছে..."
														) : txnPayAccountBalanceError ? (
															<span className="text-red-500">
																{txnPayAccountBalanceError}
															</span>
														) : (
															<span>
																ব্যালেন্স:{" "}
																<span className="font-medium">
																	{nf(txnPayAccountBalance || 0, {
																		maximumFractionDigits: 0,
																	})}{" "}
																	৳
																</span>
															</span>
														)}
													</div>
												) : null}
											</div>
										</div>
										<div>
											<label className="mb-1 block">মেমো (ঐচ্ছিক)</label>
											<input
												className="input"
												value={txnMemo}
												onChange={(e) => setTxnMemo(e.target.value)}
												placeholder="যেমন: নভেম্বর-২৫ মূলধন"
											/>
										</div>
										<div className="mt-2 flex justify-end">
											<button
												className="btn btn-primary btn-sm"
												onClick={() => void onPostTxn()}
											>
												লেনদেন পোস্ট করুন
											</button>
										</div>
									</div>
								</div>

								<div className="rounded-lg border p-3">
									<h4 className="mb-2 text-xs font-semibold">
										সাম্প্রতিক লেজার / লেনদেন
									</h4>
									{selectedLoading ? (
										<p className="text-[11px] text-slate-500">লোড হচ্ছে...</p>
									) : selectedTxns.length === 0 ? (
										<p className="text-[11px] text-slate-500">
											এখনো কোনো ট্রান্সেকশন নেই।
										</p>
									) : (
										<div className="overflow-x-auto">
											<table className="table-auto w-full text-[11px]">
												<thead>
													<tr className="border-b bg-slate-50">
														<th className="px-1 py-1 text-left">তারিখ</th>
														<th className="px-1 py-1 text-left">ধরন</th>
														<th className="px-1 py-1 text-left">মেমো</th>
														<th className="px-1 py-1 text-right">পরিমাণ</th>
													</tr>
												</thead>
												<tbody>
													{selectedTxns.map((txn) => (
														<tr key={txn.id} className="border-b last:border-0">
															<td className="whitespace-nowrap px-1 py-1">
																{txn.date}
															</td>
															<td className="px-1 py-1">{txn.kind}</td>
															<td className="px-1 py-1">
																{txn.memo || txn.instrument || ""}
															</td>
															<td className="px-1 py-1 text-right">
																{nf(txn.amount, { maximumFractionDigits: 0 })}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</div>
							</div>
						</>
					) : (
						<p className="text-xs text-slate-500">
							বাঁ-দিক থেকে একজন ইনভেস্টর নির্বাচন করুন, অথবা উপরে নতুন ক্লিক করে
							প্রোফাইল তৈরি করুন।
						</p>
					)}
				</section>
			</div>
		</div>
	);
}