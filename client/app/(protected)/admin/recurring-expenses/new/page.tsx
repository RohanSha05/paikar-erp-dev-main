'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRecurringTemplate } from "@/lib/api/recurring";
import { getAccounts, type AccountDto } from "@/lib/api/accounting";
import { showError, showSuccess } from "@/lib/swal";

export default function NewRecurringExpensePage() {
	const router = useRouter();
	const [accounts, setAccounts] = useState<AccountDto[]>([]);
	const [name, setName] = useState("");
	const [amount, setAmount] = useState("1000");
	const [frequency, setFrequency] = useState<"monthly" | "daily">("monthly");
	const [dayOfMonth, setDayOfMonth] = useState("1");
	const [expenseAccountId, setExpenseAccountId] = useState("");
	const [payFromAccountId, setPayFromAccountId] = useState("");
	const [notes, setNotes] = useState("");

	useEffect(() => {
		getAccounts().then((rows) => {
			setAccounts(rows);
			setExpenseAccountId(rows.find((a) => a.type === "expense")?.id || "");
			setPayFromAccountId(
				rows.find((a) => a.type === "cash")?.id ||
					rows.find((a) => a.type === "bank")?.id ||
					"",
			);
		});
	}, []);

	const expenseAccounts = accounts.filter(
		(a) => a.type === "expense" || a.type === "transport",
	);
	const payFromAccounts = accounts.filter(
		(a) => a.type === "cash" || a.type === "bank",
	);

	async function onSave() {
		if (!name.trim()) return void (await showError("Template এর নাম দিন"));
		if (!expenseAccountId)
			return void (await showError("Expense account সিলেক্ট করুন"));
		if (!payFromAccountId)
			return void (await showError("Pay from account সিলেক্ট করুন"));
		try {
			await createRecurringTemplate({
				name: name.trim(),
				expenseAccountId,
				payFromAccountId,
				amount: Number(amount || 0),
				frequency,
				dayOfMonth:
					frequency === "monthly" ? Number(dayOfMonth || 1) : undefined,
				notes: notes.trim() || undefined,
			});
			await showSuccess("Recurring Template সেভ হয়েছে");
			router.push("/admin/recurring-expenses");
		} catch (error: any) {
			await showError(error?.message || "Failed to save template");
		}
	}

	return (
		<div className="flex flex-col gap-4 max-w-3xl">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">
					নতুন Recurring Expense Template
				</h2>
			</div>

			<section className="card grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
				<Input label="Template নাম *" value={name} onChange={setName} />
				<Input label="Amount" value={amount} onChange={setAmount} />

				<div>
					<label className="block text-sm mb-1">Frequency</label>
					<div className="flex rounded-lg border overflow-hidden">
						<button
							type="button"
							className={`px-3 text-sm ${frequency === "monthly" ? "bg-brand text-white" : "bg-white"}`}
							onClick={() => setFrequency("monthly")}
						>
							Monthly
						</button>
						<button
							type="button"
							className={`px-3 text-sm ${frequency === "daily" ? "bg-brand text-white" : "bg-white"}`}
							onClick={() => setFrequency("daily")}
						>
							Daily
						</button>
					</div>
				</div>

				{frequency === "monthly" && (
					<Input
						label="Day of Month"
						value={dayOfMonth}
						onChange={setDayOfMonth}
					/>
				)}

				<div>
					<label className="block text-sm mb-1">Expense Account</label>
					<select
						className="input"
						value={expenseAccountId}
						onChange={(e) => setExpenseAccountId(e.target.value)}
					>
						{expenseAccounts.map((a) => (
							<option key={a.id} value={a.id}>
								{a.name} ({a.code})
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="block text-sm mb-1">Pay From</label>
					<select
						className="input"
						value={payFromAccountId}
						onChange={(e) => setPayFromAccountId(e.target.value)}
					>
						{payFromAccounts.map((a) => (
							<option key={a.id} value={a.id}>
								{a.name} ({a.code})
							</option>
						))}
					</select>
				</div>

				<div className="md:col-span-2">
					<label className="block text-sm mb-1">Notes</label>
					<textarea
						className="input min-h-[80px]"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="যেমন: গদি ভাড়া, EMI, অফিস ভাড়া ইত্যাদি"
					/>
				</div>
			</section>

			<div className="flex gap-2">
				<button className="btn btn-ghost" onClick={() => router.back()}>
					Cancel
				</button>
				<button className="btn btn-primary" onClick={onSave}>
					Save Template
				</button>
			</div>
		</div>
	);
}

function Input({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<div>
			<label className="block text-sm mb-1">{label}</label>
			<input
				className="input"
				value={value}
				onChange={(e) => onChange(e.target.value)}
			/>
		</div>
	);
}
