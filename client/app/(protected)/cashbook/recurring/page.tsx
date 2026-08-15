'use client';

import { useEffect, useMemo, useState } from "react";
import { t, nf } from "@/lib/i18n";
import { getAccounts, type AccountDto } from "@/lib/api/accounting";
import {
	createRecurringTemplate,
	deleteRecurringTemplate,
	getRecurringTemplates,
	postRecurringTemplate,
	updateRecurringTemplate,
	type RecurringTemplateDto,
} from "@/lib/api/recurring";
import { showConfirm, showError, showSuccess } from "@/lib/swal";

function getDefaultMonthValue() {
	const now = new Date();
	const df = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Dhaka",
		year: "numeric",
		month: "2-digit",
	});
	const parts = df.formatToParts(now);
	const year =
		parts.find((p) => p.type === "year")?.value || String(now.getFullYear());
	const month =
		parts.find((p) => p.type === "month")?.value ||
		String(now.getMonth() + 1).padStart(2, "0");
	return `${year}-${month}`;
}

function todayMonthParts(monthValue: string) {
	const [year, month] = monthValue.split("-").map(Number);
	return {
		year: year || new Date().getFullYear(),
		month: month || new Date().getMonth() + 1,
	};
}

export default function RecurringPage() {
	const [monthValue, setMonthValue] = useState<string>(getDefaultMonthValue());
	const [templates, setTemplates] = useState<RecurringTemplateDto[]>([]);
	const [accounts, setAccounts] = useState<AccountDto[]>([]);
	const [loading, setLoading] = useState(true);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [name, setName] = useState("");
	const [expenseAccountId, setExpenseAccountId] = useState("");
	const [payFromAccountId, setPayFromAccountId] = useState("");
	const [amount, setAmount] = useState("");
	const [dayOfMonth, setDayOfMonth] = useState("1");
	const [active, setActive] = useState(true);
	const [notes, setNotes] = useState("");

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const [templateRows, accountRows] = await Promise.all([
					getRecurringTemplates(),
					getAccounts(),
				]);
				if (!mounted) return;
				setTemplates(templateRows);
				setAccounts(accountRows);
				if (!expenseAccountId) {
					setExpenseAccountId(
						accountRows.find((a) => a.type === "expense")?.id || "",
					);
				}
				if (!payFromAccountId) {
					setPayFromAccountId(
						accountRows.find((a) => a.type === "cash")?.id ||
							accountRows.find((a) => a.type === "bank")?.id ||
							"",
					);
				}
			} catch {
				if (mounted) {
					setTemplates([]);
					setAccounts([]);
				}
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	const expenseAccounts = useMemo(
		() =>
			accounts.filter((a) => a.type === "expense" || a.type === "transport"),
		[accounts],
	);
	const payFromAccounts = useMemo(
		() => accounts.filter((a) => a.type === "cash" || a.type === "bank"),
		[accounts],
	);
	const monthParts = todayMonthParts(monthValue);

	function resetForm() {
		setEditingId(null);
		setName("");
		setExpenseAccountId(accounts.find((a) => a.type === "expense")?.id || "");
		setPayFromAccountId(
			accounts.find((a) => a.type === "cash")?.id ||
				accounts.find((a) => a.type === "bank")?.id ||
				"",
		);
		setAmount("");
		setDayOfMonth("1");
		setActive(true);
		setNotes("");
	}

	function handleEdit(template: RecurringTemplateDto) {
		setEditingId(template.id);
		setName(template.name);
		setExpenseAccountId(template.expenseAccountId);
		setPayFromAccountId(template.payFromAccountId || "");
		setAmount(String(template.amount));
		setDayOfMonth(String(template.dayOfMonth || 1));
		setActive(template.active);
		setNotes(template.notes || "");
	}

	async function handleSave() {
		if (!name.trim()) return void (await showError("টেমপ্লেট নাম দিন"));
		if (!expenseAccountId)
			return void (await showError("Expense account নির্বাচন করুন"));
		if (!payFromAccountId)
			return void (await showError("Pay from account নির্বাচন করুন"));
		if (!(Number(amount || 0) > 0))
			return void (await showError("Amount শূন্য হতে পারে না"));
		try {
			if (editingId) {
				await updateRecurringTemplate(editingId, {
					name: name.trim(),
					expenseAccountId,
					payFromAccountId,
					amount: Number(amount || 0),
					frequency: "monthly",
					dayOfMonth: Number(dayOfMonth || 1),
					active,
					notes: notes.trim() || undefined,
				});
			} else {
				await createRecurringTemplate({
					name: name.trim(),
					expenseAccountId,
					payFromAccountId,
					amount: Number(amount || 0),
					frequency: "monthly",
					dayOfMonth: Number(dayOfMonth || 1),
					active,
					notes: notes.trim() || undefined,
				});
			}
			setTemplates(await getRecurringTemplates());
			resetForm();
			await showSuccess("Recurring template saved");
		} catch (error: any) {
			await showError(error?.message || "Failed to save template");
		}
	}

	async function handleDelete(id: string) {
		const result = await showConfirm("এই টেমপ্লেটটি ডিলিট করতে চান?");
		if (!result.isConfirmed) return;
		try {
			await deleteRecurringTemplate(id);
			setTemplates(await getRecurringTemplates());
			await showSuccess("Template deleted");
		} catch (error: any) {
			await showError(error?.message || "Failed to delete template");
		}
	}

	async function handlePost(template: RecurringTemplateDto) {
		const result = await showConfirm(
			"Recurring expense পোস্ট করতে চান?",
			`Month: ${monthValue}\nTemplate: ${template.name}`,
		);
		if (!result.isConfirmed) return;
		try {
			const posted = await postRecurringTemplate(
				template.id,
				monthParts.year,
				monthParts.month,
			);
			await showSuccess(`Posted: ${posted.voucherNo}`);
			setTemplates(await getRecurringTemplates());
		} catch (error: any) {
			await showError(error?.message || "Posting failed");
		}
	}

	async function handlePostAll() {
		let posted = 0;
		for (const template of templates.filter((item) => item.active)) {
			try {
				await postRecurringTemplate(
					template.id,
					monthParts.year,
					monthParts.month,
				);
				posted += 1;
			} catch {
				// skip duplicates and validation issues per template
			}
		}
		setTemplates(await getRecurringTemplates());
		await showSuccess(`মোট ${posted} টি template পোস্ট হয়েছে`);
	}

	function accountLabel(accountId?: string) {
		if (!accountId) return "Cash";
		return (
			accounts.find((account) => account.id === accountId)?.name || accountId
		);
	}

	if (loading) {
		return <div className="p-4 text-slate-500">Loading…</div>;
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold">
						{t("menu.recurringExpense")} (Fixed Monthly)
					</h2>
					<p className="text-xs text-slate-500">
						ভাড়া, বেতন, EMI ইত্যাদি মাসিক ফিক্সড খরচ টেমপ্লেট করে রাখুন।
					</p>
				</div>
				<div className="flex items-center gap-2">
					<input
						type="month"
						className="input h-9 text-sm"
						value={monthValue}
						onChange={(e) =>
							setMonthValue(e.target.value || getDefaultMonthValue())
						}
					/>
					<button className="btn btn-primary h-9" onClick={handlePostAll}>
						এই মাসের সব Active টেমপ্লেট Post করুন
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<section className="card lg:col-span-1">
					<div className="flex items-center justify-between mb-3">
						<h3 className="text-sm font-semibold">
							{editingId ? "টেমপ্লেট এডিট" : "নতুন টেমপ্লেট"}
						</h3>
						{editingId && (
							<button
								className="text-xs text-slate-500 hover:underline"
								onClick={resetForm}
							>
								New
							</button>
						)}
					</div>

					<div className="space-y-3 text-sm">
						<div>
							<label className="block text-xs mb-1">টেমপ্লেট নাম</label>
							<input
								className="input"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div>
							<label className="block text-xs mb-1">Expense Account</label>
							<select
								className="input"
								value={expenseAccountId}
								onChange={(e) => setExpenseAccountId(e.target.value)}
							>
								<option value="">-- নির্বাচন করুন --</option>
								{expenseAccounts.map((account) => (
									<option key={account.id} value={account.id}>
										{account.name}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-xs mb-1">Pay From Account</label>
							<select
								className="input"
								value={payFromAccountId}
								onChange={(e) => setPayFromAccountId(e.target.value)}
							>
								<option value="">-- নির্বাচন করুন --</option>
								{payFromAccounts.map((account) => (
									<option key={account.id} value={account.id}>
										{account.name}
									</option>
								))}
							</select>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-xs mb-1">Amount (৳)</label>
								<input
									className="input"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									type="number"
									min={0}
								/>
							</div>
							<div>
								<label className="block text-xs mb-1">Day of Month</label>
								<input
									className="input"
									value={dayOfMonth}
									onChange={(e) => setDayOfMonth(e.target.value)}
									type="number"
									min={1}
									max={31}
								/>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<input
								id="recur-active"
								type="checkbox"
								checked={active}
								onChange={(e) => setActive(e.target.checked)}
							/>
							<label htmlFor="recur-active" className="text-xs">
								Active
							</label>
						</div>
						<div>
							<label className="block text-xs mb-1">Notes (ঐচ্ছিক)</label>
							<textarea
								className="input min-h-[60px]"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
							/>
						</div>
						<div className="flex gap-2 pt-1">
							<button className="btn btn-primary" onClick={handleSave}>
								{editingId ? "Update" : "Save"}
							</button>
							{editingId && (
								<button className="btn btn-ghost" onClick={resetForm}>
									Cancel
								</button>
							)}
						</div>
					</div>
				</section>

				<section className="card lg:col-span-2">
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b bg-slate-50">
									<th className="px-2 py-2 text-left">নাম</th>
									<th className="px-2 py-2 text-left">Expense Account</th>
									<th className="px-2 py-2 text-left">Pay From</th>
									<th className="px-2 py-2 text-right">Amount</th>
									<th className="px-2 py-2 text-left">Last Posted</th>
									<th className="px-2 py-2 text-center">Status</th>
									<th className="px-2 py-2 text-center">Action</th>
									<th className="px-2 py-2 text-center">Edit</th>
								</tr>
							</thead>
							<tbody>
								{templates.map((template) => (
									<tr key={template.id} className="border-b last:border-0">
										<td className="px-2 py-1">
											<div className="font-medium">{template.name}</div>
											{template.notes && (
												<div className="text-xs text-slate-500">
													{template.notes}
												</div>
											)}
										</td>
										<td className="px-2 py-1">
											{accountLabel(template.expenseAccountId)}
										</td>
										<td className="px-2 py-1">
											{accountLabel(template.payFromAccountId)}
										</td>
										<td className="px-2 py-1 text-right">
											{fmt(template.amount)}
										</td>
										<td className="px-2 py-1">
											{template.lastPostedDate || "-"}
										</td>
										<td className="px-2 py-1 text-center">
											<button
												className={`text-xs px-2 py-1 rounded-full ${template.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
												onClick={async () => {
													try {
														await updateRecurringTemplate(template.id, {
															active: !template.active,
														});
														setTemplates(await getRecurringTemplates());
													} catch (error: any) {
														await showError(
															error?.message || "Failed to update template",
														);
													}
												}}
											>
												{template.active ? "Active" : "Inactive"}
											</button>
										</td>
										<td className="px-2 py-1 text-center">
											<button
												className="text-xs text-brand underline"
												onClick={() => handlePost(template)}
											>
												Pay Now
											</button>
										</td>
										<td className="px-2 py-1 text-center">
											<div className="flex items-center justify-center gap-2">
												<button
													className="text-xs text-slate-500 underline"
													onClick={() => handleEdit(template)}
												>
													Edit
												</button>
												<button
													className="text-xs text-red-500 underline"
													onClick={() => handleDelete(template.id)}
												>
													Delete
												</button>
											</div>
										</td>
									</tr>
								))}
								{templates.length === 0 && (
									<tr>
										<td
											colSpan={8}
											className="px-2 py-4 text-center text-slate-500 text-sm"
										>
											এখনও কোনো Recurring Template নেই।
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</section>
			</div>
		</div>
	);
}

function fmt(n: number) {
	return `৳ ${nf(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
