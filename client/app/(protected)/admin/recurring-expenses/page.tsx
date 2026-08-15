'use client';

import Link from 'next/link';
import { useEffect, useState } from "react";
import { getAccounts, type AccountDto } from "@/lib/api/accounting";
import {
	deleteRecurringTemplate,
	getRecurringTemplates,
	postRecurringTemplate,
	updateRecurringTemplate,
	type RecurringTemplateDto,
} from "@/lib/api/recurring";
import { showConfirm, showError, showSuccess } from "@/lib/swal";
import { nf } from "@/lib/i18n";

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

export default function RecurringExpenseListPage() {
	const [templates, setTemplates] = useState<RecurringTemplateDto[]>([]);
	const [accounts, setAccounts] = useState<AccountDto[]>([]);
	const [postDate, setPostDate] = useState(todayISO());

	useEffect(() => {
		Promise.all([getRecurringTemplates(), getAccounts()])
			.then(([templateRows, accountRows]) => {
				setTemplates(templateRows);
				setAccounts(accountRows);
			})
			.catch(() => {
				setTemplates([]);
				setAccounts([]);
			});
	}, []);

	const accountLabel = (id?: string) =>
		accounts.find((a) => a.id === id)?.name || id || "Cash";

	function isAlreadyPosted(template: RecurringTemplateDto) {
		if (!template.lastPostedDate) return false;
		if (template.frequency === "daily") {
			return template.lastPostedDate === postDate;
		}
		return template.lastPostedDate.slice(0, 7) === postDate.slice(0, 7);
	}

	async function toggleActive(template: RecurringTemplateDto) {
		try {
			await updateRecurringTemplate(template.id, { active: !template.active });
			setTemplates(await getRecurringTemplates());
		} catch (error: any) {
			await showError(error?.message || "Failed to update template");
		}
	}

	async function updatePayFromAccount(template: RecurringTemplateDto, payFromAccountId: string) {
		try {
			await updateRecurringTemplate(template.id, { payFromAccountId });
			setTemplates(await getRecurringTemplates());
		} catch (error: any) {
			await showError(error?.message || "Failed to update pay from account");
		}
	}

	async function handlePost(template: RecurringTemplateDto) {
		const result = await showConfirm(
			"Recurring expense পোস্ট করতে চান?",
			`Date: ${postDate}\nTemplate: ${template.name}`,
		);
		if (!result.isConfirmed) return;
		try {
			const [year, month] = postDate.split("-").map(Number);
			await postRecurringTemplate(template.id, year, month, postDate);
			await showSuccess("Recurring expense পোস্ট হয়েছে (voucher created)");
			setTemplates(await getRecurringTemplates());
		} catch (error: any) {
			await showError(error?.message || "Posting failed");
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

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold">Recurring Expense Templates</h2>
					<p className="text-xs text-slate-500">
						মাসিক / দৈনিক ফিক্সড খরচ টেমপ্লেট আকারে রাখুন।
					</p>
				</div>
				<Link href="/admin/recurring-expenses/new" className="btn btn-primary">
					নতুন Template
				</Link>
			</div>

			<div className="card">
				<div className="flex items-center justify-between mb-3 text-sm">
					<div className="flex items-center gap-2">
						<span className="text-xs text-slate-500">Post Date:</span>
						<input
							type="date"
							className="input"
							value={postDate}
							onChange={(e) => setPostDate(e.target.value)}
						/>
					</div>
					<span className="text-xs text-slate-500">
						মোট টেমপ্লেট: {templates.length}
					</span>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b bg-slate-50">
								<th className="px-2 py-2 text-left">নাম</th>
								<th className="px-2 py-2 text-left">Expense Account</th>
								<th className="px-2 py-2 text-left">Pay From</th>
								<th className="px-2 py-2 text-right">Amount</th>
								<th className="px-2 py-2 text-left">Frequency</th>
								<th className="px-2 py-2 text-left">Last Payment Date</th>
								<th className="px-2 py-2 text-center">Status</th>
								<th className="px-2 py-2 text-center">Action</th>
								<th className="px-2 py-2 text-center">Delete</th>
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
										<select
											className="input min-w-[180px]"
											value={template.payFromAccountId || ""}
											onChange={(e) => updatePayFromAccount(template, e.target.value)}
										>
											<option value="" disabled>
												Select account
											</option>
											{accounts
												.filter((a) => a.type === "cash" || a.type === "bank")
												.map((a) => (
													<option key={a.id} value={a.id}>
														{a.name} ({a.code})
													</option>
												))}
										</select>
									</td>
									<td className="px-2 py-1 text-right">
										{fmt(template.amount)}
									</td>
									<td className="px-2 py-1">
										{template.frequency === "monthly"
											? `Monthly${template.dayOfMonth ? ` (Day ${template.dayOfMonth})` : ""}`
											: "Daily"}
									</td>
									<td className="px-2 py-1">
										{template.lastPostedDate || "-"}
									</td>
									<td className="px-2 py-1 text-center">
										<button
											className={`text-xs px-2 py-1 rounded-full ${template.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
											onClick={() => toggleActive(template)}
										>
											{template.active ? "Active" : "Inactive"}
										</button>
									</td>
									<td className="px-2 py-1 text-center">
										{isAlreadyPosted(template) ? (
											<span className="text-xs rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
												Paid
											</span>
										) : (
											<button
												className="text-xs text-brand underline"
												onClick={() => handlePost(template)}
											>
												Pay Now
											</button>
										)}
									</td>
									<td className="px-2 py-1 text-center">
										<button
											className="text-xs text-red-500 underline"
											onClick={() => handleDelete(template.id)}
										>
											Delete
										</button>
									</td>
								</tr>
							))}
							{templates.length === 0 && (
								<tr>
									<td
										colSpan={9}
										className="px-2 py-4 text-center text-slate-500 text-sm"
									>
										এখনও কোনো Recurring Template নেই। উপরে থেকে “নতুন Template”
										তৈরি করুন।
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
