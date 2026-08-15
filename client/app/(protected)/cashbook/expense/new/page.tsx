'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import {
	getAccounts,
	createVoucher,
	type AccountDto as Account,
	type CreateVoucherInput,
} from "@/lib/api/cashbook";
import {
	useAccountBalance,
	validateAmount,
} from "@/lib/hooks/useAccountBalance";
import { nf } from "@/lib/i18n";
import { showError, showSuccess } from "@/lib/swal";

const fmt = (n: number) =>
	`৳ ${nf(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function todayISO() {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Dhaka",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
}

function isExpenseAccount(account: Account) {
	const code = (account.code || "").toUpperCase();
	if (code === "AC-INVENTORY") return false;
	return account.type === "expense" || account.type === "transport";
}

function buildExpenseNarration(remark: string) {
	const fixedTitle = "Daily Expense";
	const customRemark = remark.trim();

	return customRemark ? `${fixedTitle} - ${customRemark}` : fixedTitle;
}

export default function DailyExpensePage() {
	const router = useRouter();

	const [accounts, setAccounts] = useState<Account[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [loadError, setLoadError] = useState("");
	const [date, setDate] = useState<string>(todayISO());
	const [expenseAccId, setExpenseAccId] = useState<string>("");
	const [payFromAccId, setPayFromAccId] = useState<string>("");
	const [amount, setAmount] = useState<string>("0");
	const [remark, setRemark] = useState<string>("");

	// Fetch balance for the selected pay-from account
	const { balance: payFromBalance, loading: balanceLoading } =
		useAccountBalance(payFromAccId);

	useEffect(() => {
		let mounted = true;

		async function loadData() {
			try {
				setLoading(true);
				setLoadError("");
				const accs = await getAccounts();
				if (!mounted) return;
				setAccounts(accs);

				// Default নির্বাচন
				const expenseAcc = accs.find((a) => isExpenseAccount(a));
				const cashAcc =
					accs.find((a) => a.type === "cash") ||
					accs.find((a) => a.type === "bank");
				if (expenseAcc) setExpenseAccId(expenseAcc.id);
				if (cashAcc) setPayFromAccId(cashAcc.id);
			} catch (error) {
				console.error("Failed to load accounts:", error);
				if (mounted) {
					setLoadError(
						error instanceof Error ? error.message : "Failed to load accounts",
					);
				}
				await showError("অ্যাকাউন্ট লোড করতে ব্যর্থ হয়েছে");
			} finally {
				if (mounted) setLoading(false);
			}
		}
		loadData();

		return () => {
			mounted = false;
		};
	}, []);

	const expenseAccounts = accounts.filter((a) => isExpenseAccount(a));
	const payFromAccounts = accounts.filter(
		(a) => a.type === "cash" || a.type === "bank",
	);
	const hasRequiredAccounts =
		expenseAccounts.length > 0 && payFromAccounts.length > 0;

	// Validate amount against available balance
	const amountValidation = validateAmount(Number(amount), payFromBalance);
	const isAmountValid = amountValidation.isValid;

	async function handleSave(goBackToCashbook: boolean) {
		const amt = Number(amount);
		if (!date) {
			await showError("তারিখ সিলেক্ট করুন");
			return;
		}
		if (!hasRequiredAccounts) {
			await showError(
				"Operational Expense/Transport এবং Cash/Bank account আগে সেটআপ করুন",
			);
			return;
		}
		if (!expenseAccId) {
			await showError("Expense Account সিলেক্ট করুন");
			return;
		}
		if (!payFromAccId) {
			await showError(
				"কোন একাউন্ট থেকে পেমেন্ট করবেন (Cash/Bank) সিলেক্ট করুন",
			);
			return;
		}
		if (!Number.isFinite(amt) || amt <= 0) {
			await showError("Amount শূন্যের বেশি দিন");
			return;
		}
		if (expenseAccId === payFromAccId) {
			await showError("Expense account এবং Pay From account এক হতে পারবে না");
			return;
		}

		// Validate amount against available balance
		const validation = validateAmount(amt, payFromBalance);
		if (!validation.isValid) {
			await showError(validation.errorMessage || "Invalid amount");
			return;
		}

		const rows: CreateVoucherInput["rows"] = [
			{
				accountId: expenseAccId,
				dr: amt,
				memo: remark || buildExpenseNarration(remark),
			},
			{
				accountId: payFromAccId,
				cr: amt,
				memo: remark || buildExpenseNarration(remark),
			},
		];

		const voucherInput: CreateVoucherInput = {
			vtype: "payment",
			vdate: date,
			rows,
			narration: buildExpenseNarration(remark),
		};

		try {
			setSaving(true);
			await createVoucher(voucherInput);
			await showSuccess(
				`Daily expense voucher পোস্ট হয়েছে`,
				`Amount: ${fmt(amt)}`,
			);

			// ফর্ম reset
			setAmount("0");
			setRemark("");
			// যদি cashbook এ ফিরে যেতে চাও
			if (goBackToCashbook) {
				router.push("/cashbook");
			}
		} catch (e: any) {
			console.error(e);
			await showError(e?.message || "Error saving voucher");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="flex flex-col gap-4 max-w-3xl">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold">দৈনিক খরচ এন্ট্রি</h2>
					<p className="text-xs text-slate-500">
						ছোট ছোট দৈনিক খরচ (চা-নাস্তা, লেবার, অফিস খরচ ইত্যাদি) দ্রুত এন্ট্রি
						করে Payment Voucher তৈরি করুন।
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Link className="btn btn-ghost" href="/admin/accounts">
						Manage Accounts
					</Link>
					<button
						className="btn btn-ghost"
						type="button"
						onClick={() => router.push("/cashbook")}
					>
						Back to Cashbook
					</button>
				</div>
			</div>

			{loadError && (
				<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
					{loadError}
				</div>
			)}

			{/* Form Card */}
			<section className="card grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
				{/* Date */}
				<div>
					<label className="block text-sm mb-1">তারিখ</label>
					<input
						type="date"
						className="input"
						value={date}
						onChange={(e) => setDate(e.target.value)}
					/>
				</div>

				{/* Amount */}
				<div>
					<label className="block text-sm mb-1">Amount (৳)</label>
					<input
						type="number"
						min="0"
						step="0.01"
						className="input"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						placeholder="যেমন: 850"
					/>
					{payFromAccId &&
						!balanceLoading &&
						(() => {
							const validation = validateAmount(Number(amount), payFromBalance);
							return validation.errorMessage ? (
								<p className="text-[11px] text-red-600 mt-1">
									⚠️ {validation.errorMessage}
								</p>
							) : null;
						})()}
				</div>

				{/* Expense Account */}
				<div>
					<label className="block text-sm mb-1">Expense Account</label>
					<select
						className="input"
						value={expenseAccId}
						onChange={(e) => setExpenseAccId(e.target.value)}
						disabled={loading || expenseAccounts.length === 0}
					>
						{expenseAccounts.map((a) => (
							<option key={a.id} value={a.id}>
								{a.name}
							</option>
						))}
						{expenseAccounts.length === 0 && (
							<option value="">
								কোন Expense Account পাওয়া যায়নি (Manage Accounts এ যোগ করুন)
							</option>
						)}
					</select>
					<p className="text-[11px] text-slate-500 mt-1">
						যেমন: গদি খরচ, চা-নাস্তা, অফিস খরচ, ডিজেল ইত্যাদি (Inventory account
						বাদ থাকবে)।
					</p>
				</div>

				{/* Pay From Account */}
				<div>
					<label className="block text-sm mb-1">Pay From (Cash/Bank)</label>
					<select
						className="input"
						value={payFromAccId}
						onChange={(e) => setPayFromAccId(e.target.value)}
						disabled={loading || payFromAccounts.length === 0}
					>
						{payFromAccounts.map((a) => (
							<option key={a.id} value={a.id}>
								{a.name}
							</option>
						))}
						{payFromAccounts.length === 0 && (
							<option value="">
								কোন Cash/Bank Account পাওয়া যায়নি (Manage Accounts এ যোগ করুন)
							</option>
						)}
					</select>
					{payFromAccId && (
						<p className="text-[11px] text-slate-500 mt-1">
							{balanceLoading ? (
								"Loading balance..."
							) : (
								<>
									Current Balance:{" "}
									<span className="font-semibold">{fmt(payFromBalance)}</span>
								</>
							)}
						</p>
					)}
				</div>

				{/* Remark */}
				<div className="md:col-span-2">
					<label className="block text-sm mb-1">Remarks</label>
					<textarea
						className="input min-h-[80px]"
						value={remark}
						onChange={(e) => setRemark(e.target.value)}
						placeholder="যেমন: আজকের গুদামের চা-নাস্তা ও লেবার খরচ"
					/>
				</div>
			</section>

			{/* Preview + Actions */}
			<section className="card flex flex-col gap-2 text-sm">
				<div className="flex items-center justify-between">
					<div>
						<div className="text-xs text-slate-500 mb-1">Preview</div>
						<div className="text-sm">
							<span className="font-medium">Debit: </span>
							{expenseAccounts.find((a) => a.id === expenseAccId)?.name ||
								"N/A"}{" "}
							— {fmt(Number(amount || 0))}
						</div>
						<div className="text-sm">
							<span className="font-medium">Credit: </span>
							{payFromAccounts.find((a) => a.id === payFromAccId)?.name ||
								"N/A"}{" "}
							— {fmt(Number(amount || 0))}
						</div>
					</div>
				</div>

				<div className="flex gap-2 mt-3">
					<button
						className="btn btn-primary"
						type="button"
						onClick={() => handleSave(false)}
						disabled={loading || saving || !hasRequiredAccounts}
					>
						{saving ? "Saving..." : "Save & New"}
					</button>
					<button
						className="btn btn-ghost"
						type="button"
						onClick={() => handleSave(true)}
						disabled={loading || saving || !hasRequiredAccounts}
					>
						Save & Back to Cashbook
					</button>
				</div>
			</section>
		</div>
	);
}
