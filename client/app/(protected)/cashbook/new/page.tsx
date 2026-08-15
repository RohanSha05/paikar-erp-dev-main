'use client';
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { nf } from "@/lib/i18n";
import { showError, showSuccess } from "@/lib/swal";
import {
	createVoucher,
	getAccounts,
	type AccountDto,
	type CreateVoucherInput,
} from "@/lib/api/cashbook";

function todayISO() {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Dhaka",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
}

function money(n: number) {
	return `৳ ${nf(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function NewVoucherPage() {
	const router = useRouter();
	const [date, setDate] = useState<string>(todayISO());
	const [vtype, setVtype] = useState<CreateVoucherInput["vtype"]>("receipt");
	const [rows, setRows] = useState<
		{ accountId: string; dr?: string; cr?: string; memo?: string }[]
	>([
		{ accountId: "", dr: "0", cr: "" },
		{ accountId: "", dr: "", cr: "0" },
	]);
	const [narration, setNarration] = useState("");
	const [accounts, setAccounts] = useState<AccountDto[]>([]);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let mounted = true;
		getAccounts()
			.then((data) => {
				if (mounted) setAccounts(data);
			})
			.catch(() => {
				if (mounted) setAccounts([]);
			});
		return () => {
			mounted = false;
		};
	}, []);

	function addRow() {
		setRows((r) => [...r, { accountId: "", dr: "", cr: "", memo: "" }]);
	}
	function setRow(
		i: number,
		p: Partial<{ accountId: string; dr?: string; cr?: string; memo?: string }>,
	) {
		setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
	}
	function removeRow(i: number) {
		setRows((prev) => prev.filter((_, idx) => idx !== i));
	}

	async function save() {
		if (saving) return;
		const parsed = rows.map((r) => ({
			accountId: r.accountId,
			dr: Number(r.dr || 0),
			cr: Number(r.cr || 0),
			memo: r.memo || "",
		}));
		const dr = parsed.reduce((s, x) => s + (x.dr || 0), 0);
		const cr = parsed.reduce((s, x) => s + (x.cr || 0), 0);
		if (!date) return void (await showError("তারিখ নির্বাচন করুন"));
		if (Math.round(dr * 100) !== Math.round(cr * 100))
			return void (await showError("ডেবিট/ক্রেডিট সমান হতে হবে"));
		if (parsed.some((r) => !r.accountId))
			return void (await showError("সব লাইনে অ্যাকাউন্ট দিন"));
		setSaving(true);
		try {
			const voucher = await createVoucher({
				vtype,
				vdate: date,
				rows: parsed,
				narration,
			});
			await showSuccess(`Saved: ${voucher.voucherNo}`);
			router.push("/cashbook");
		} catch (error: any) {
			await showError(error?.message || "Failed to save voucher");
		} finally {
			setSaving(false);
		}
	}

	const totals = useMemo(() => {
		const dr = rows.reduce((s, x) => s + Number(x.dr || 0), 0);
		const cr = rows.reduce((s, x) => s + Number(x.cr || 0), 0);
		return { dr, cr };
	}, [rows]);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">নতুন ভাউচার</h2>
				<div className="flex items-center gap-2">
					<button className="btn btn-ghost" onClick={() => history.back()}>
						Cancel
					</button>
					<button className="btn btn-primary" onClick={save}>
						{saving ? "Saving…" : "Save"}
					</button>
				</div>
			</div>

			<section className="card">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
						<label className="block text-sm mb-1">ধরণ</label>
						<select
							className="input"
							value={vtype}
							onChange={(e) =>
								setVtype(e.target.value as CreateVoucherInput["vtype"])
							}
						>
							<option value="receipt">Receipt</option>
							<option value="payment">Payment</option>
							<option value="journal">Journal</option>
						</select>
					</div>
					<div className="md:col-span-2">
						<label className="block text-sm mb-1">Narration</label>
						<input
							className="input"
							value={narration}
							onChange={(e) => setNarration(e.target.value)}
							placeholder="বিবরণ..."
						/>
					</div>
				</div>

				<div className="mt-4">
					<div className="flex items-center justify-between">
						<div className="font-semibold">লাইন আইটেম</div>
						<button className="btn btn-ghost" onClick={addRow}>
							+ Add Row
						</button>
					</div>

					<div className="mt-2 overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead>
								<tr className="text-left text-slate-600">
									<th className="py-2 px-3">Account</th>
									<th className="py-2 px-3 text-right">Debit</th>
									<th className="py-2 px-3 text-right">Credit</th>
									<th className="py-2 px-3">Memo</th>
									<th className="py-2 px-3"></th>
								</tr>
							</thead>
							<tbody>
								{rows.map((r, i) => (
									<tr key={i} className="border-t">
										<td className="py-2 px-3">
											<select
												className="input"
												value={r.accountId}
												onChange={(e) =>
													setRow(i, { accountId: e.target.value })
												}
											>
												<option value="">— choose —</option>
												{accounts.map((a) => (
													<option key={a.id} value={a.id}>
														{a.name} ({a.code})
													</option>
												))}
											</select>
										</td>
										<td className="py-2 px-3">
											<input
												className="input text-right"
												type="number"
												value={r.dr || ""}
												onChange={(e) =>
													setRow(i, { dr: e.target.value, cr: "" })
												}
											/>
										</td>
										<td className="py-2 px-3">
											<input
												className="input text-right"
												type="number"
												value={r.cr || ""}
												onChange={(e) =>
													setRow(i, { cr: e.target.value, dr: "" })
												}
											/>
										</td>
										<td className="py-2 px-3">
											<input
												className="input"
												value={r.memo || ""}
												onChange={(e) => setRow(i, { memo: e.target.value })}
											/>
										</td>
										<td className="py-2 px-3">
											<button
												className="btn btn-ghost"
												onClick={() => removeRow(i)}
											>
												Remove
											</button>
										</td>
									</tr>
								))}
							</tbody>
							<tfoot>
								<tr className="border-t font-semibold">
									<td className="py-2 px-3 text-right">Totals</td>
									<td className="py-2 px-3 text-right">{money(totals.dr)}</td>
									<td className="py-2 px-3 text-right">{money(totals.cr)}</td>
									<td className="py-2 px-3" colSpan={2}></td>
								</tr>
							</tfoot>
						</table>
					</div>
				</div>
			</section>
		</div>
	);
}
