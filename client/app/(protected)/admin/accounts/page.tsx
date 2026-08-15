"use client";
import { useEffect, useMemo, useState } from "react";
import {
	createAccount,
	getAccounts,
	type AccountDto,
} from "@/lib/api/accounting";
import { dhakaDate } from "@/lib/dhaka";
import { nf } from "@/lib/i18n";
import { useAccountBalance } from "@/lib/hooks/useAccountBalance";
import {
	createVoucher,
	getAccounts as getCashbookAccounts,
} from "@/lib/api/cashbook";
import { showError, showSuccess } from "@/lib/swal";

export default function AccountsPage() {
	const [rows, setRows] = useState<AccountDto[]>([]);
	const [name, setName] = useState("");
	const [type, setType] = useState("cash");
	const [paona, setPaona] = useState("");
	const [dena, setDena] = useState("");
	const [instrumentId, setInstrumentId] = useState("");
	const [instrumentAccounts, setInstrumentAccounts] = useState<AccountDto[]>(
		[],
	);

	// Fetch ledger balance for selected instrument account
	const { balance: instrumentBalance, loading: instrumentBalanceLoading } =
		useAccountBalance(instrumentId);
	const [saving, setSaving] = useState(false);
	const [filterType, setFilterType] = useState<string>("");

	useEffect(() => {
		Promise.all([
			getAccounts(),
			getCashbookAccounts("cash"),
			getCashbookAccounts("bank"),
		])
			.then(([allRows, cashRows, bankRows]) => {
				setRows(allRows);
				setInstrumentAccounts([...(cashRows || []), ...(bankRows || [])]);
				const firstInstrument = [...(cashRows || []), ...(bankRows || [])][0];
				if (firstInstrument) setInstrumentId(firstInstrument.id);
			})
			.catch(() => {
				setRows([]);
				setInstrumentAccounts([]);
			});
	}, []);

	const bankTotal = useMemo(
		() =>
			rows
				.filter((a) => a.type === "bank")
				.reduce((sum, a) => sum + (a.openingDr || 0) - (a.openingCr || 0), 0),
		[rows],
	);

	const cashTotal = useMemo(
		() =>
			rows
				.filter((a) => a.type === "cash")
				.reduce((sum, a) => sum + (a.openingDr || 0) - (a.openingCr || 0), 0),
		[rows],
	);

	function handleTypeChange(val: string) {
		setType(val);
		setName("");
		setPaona("");
		setDena("");
		const firstInstrument = instrumentAccounts[0];
		if (firstInstrument) setInstrumentId(firstInstrument.id);
	}

	async function add() {
		setSaving(true);

		try {
			const paonaAmount = Number(paona || 0);
			const denaAmount = Number(dena || 0);
			const amount = type === "loan" ? paonaAmount : paonaAmount || denaAmount;

			if (type !== "loan" && paonaAmount && denaAmount) {
				return await showError("Only one allowed");
			}

			if (
				(type !== "loan" && !paonaAmount && !denaAmount) ||
				(type === "loan" && !amount)
			) {
				return await showError(
					type === "loan" ? "Loan amount required" : "Enter paona or dena",
				);
			}

			if (!name.trim()) {
				return await showError("Name is required");
			}

			if (type === "loan" && !instrumentId) {
				return await showError("Select instrument account");
			}

			const account = await createAccount({
				name: name.trim(),
				type,
				openingDr: type === "loan" ? 0 : paonaAmount,
				openingCr: type === "loan" ? 0 : denaAmount,
			});

			if (type === "loan") {
				await createVoucher({
					vtype: "journal",
					vdate: dhakaDate(new Date()),
					narration: `Loan account created: ${name.trim()}`,
					rows: [
						{
							accountId: instrumentId,
							dr: amount,
							cr: 0,
							memo: "Loan received",
						},
						{
							accountId: account.id,
							dr: 0,
							cr: amount,
							memo: "Loan liability",
						},
					],
				});
			}

			await showSuccess("Account created");
			setPaona("");
			setDena("");
			setName("");
			setInstrumentId("");
			setRows(await getAccounts());
		} catch (err: any) {
			await showError(err?.message || "Failed");
		} finally {
			setSaving(false);
		}
	}

	const filterOptions = Array.from(new Set(rows.map((a) => a.type)));

	const filteredRows = rows.filter((a) => {
		if (!filterType) return true;
		return a.type === filterType;
	});

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">Chart of Accounts</h2>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div className="card p-4">
					<div className="text-sm text-slate-500">Total Bank Accounts</div>
					<div className="text-2xl font-semibold mt-1">
						{bankTotal.toLocaleString()}
					</div>
				</div>

				<div className="card p-4">
					<div className="text-sm text-slate-500">Total Cash Accounts</div>
					<div className="text-2xl font-semibold mt-1">
						{cashTotal.toLocaleString()}
					</div>
				</div>
			</div>

			<div className="card p-4">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<div>
						<label className="block text-sm mb-1">ধরন</label>
						<select
							className="input w-full"
							value={type}
							onChange={(e) => handleTypeChange(e.target.value)}
						>
							<option value="cash">ক্যাশ</option>
							<option value="bank">ব্যাংক</option>
							<option value="loan">লোন</option>
						</select>
					</div>

					<div>
						<label className="block text-sm mb-1">অ্যাকাউন্ট নাম</label>
						<input
							className="input w-full"
							value={name}
							placeholder="অ্যাকাউন্ট নাম"
							onChange={(e) => setName(e.target.value)}
						/>
					</div>

					<div>
						{type === "loan" ? (
							<>
								<label className="block text-sm mb-1">পরিমাণ</label>
								<input
									className="input w-full"
									type="number"
									value={paona}
									placeholder="যেমন: 10000"
									onChange={(e) => setPaona(e.target.value)}
								/>
							</>
						) : (
							<>
								<label className="block text-sm mb-1">ডেবিট / ওপেনিং</label>
								<input
									className="input w-full"
									type="number"
									value={paona}
									onChange={(e) => {
										setPaona(e.target.value);
										if (e.target.value) setDena("");
									}}
								/>
							</>
						)}
					</div>
					{type === "loan" ? (
						<div>
							<label className="block text-sm mb-1">ইনস্ট্রুমেন্ট</label>

							<select
								className="input w-full"
								value={instrumentId}
								onChange={(e) => setInstrumentId(e.target.value)}
							>
								<option value="">ক্যাশ / ব্যাংক নির্বাচন করুন</option>

								{instrumentAccounts.map((account) => (
									<option key={account.id} value={account.id}>
										{account.name} ({account.type})
									</option>
								))}
							</select>

							{instrumentId && (
								<p className="text-[11px] text-slate-500 mt-1">
									{instrumentBalanceLoading ? (
										"Loading balance..."
									) : (
										<>ব্যালেন্স: {nf(instrumentBalance)}</>
									)}
								</p>
							)}
						</div>
					) : null}

					<div className="flex items-end">
						<button
							className="btn btn-primary w-full"
							onClick={add}
							disabled={saving}
						>
							{saving ? "সেভ হচ্ছে…" : "যোগ করুন"}
						</button>
					</div>
				</div>
			</div>

			<div className="card overflow-x-auto">
				<div className="flex gap-2 items-center mb-3">
					<select
						className="input w-56"
						value={filterType}
						onChange={(e) => setFilterType(e.target.value)}
					>
						<option value="">সব</option>
						{filterOptions.map((f) => (
							<option key={f} value={f}>
								{f}
							</option>
						))}
					</select>
				</div>

				<table className="min-w-full text-sm">
					<thead>
						<tr className="text-left text-slate-600">
							<th className="py-2 px-3">কোড</th>
							<th className="py-2 px-3">নাম</th>
							<th className="py-2 px-3">ধরন</th>
							<th className="py-2 px-3">ওপেনিং</th>
						</tr>
					</thead>

					<tbody>
						{filteredRows.map((a) => (
							<tr key={a.id} className="border-t">
								<td className="py-2 px-3">{a.code}</td>
								<td className="py-2 px-3">{a.name}</td>
								<td className="py-2 px-3">{a.type}</td>
								<td className="py-2 px-3">{`${a.openingDr || 0} Dr / ${a.openingCr || 0} Cr`}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
