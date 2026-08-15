'use client';

import { useEffect, useMemo, useState } from "react";
import {
	createDriver,
	getDrivers,
	type DriverDto,
	updateDriver,
} from "@/lib/api/drivers";
import { nf } from "@/lib/i18n";
import { showError, showSuccess } from "@/lib/swal";

type FormDriver = {
	id: string;
	name: string;
	phone: string;
	truckNo: string;
	licenseNo: string;
	active: boolean;
};

const emptyForm: FormDriver = {
	id: "",
	name: "",
	phone: "",
	truckNo: "",
	licenseNo: "",
	active: true,
};

export default function DriverMasterPage() {
	const [drivers, setDrivers] = useState<DriverDto[]>([]);
	const [form, setForm] = useState<FormDriver>(emptyForm);
	const [filter, setFilter] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [showCreateForm, setShowCreateForm] = useState(false);

	useEffect(() => {
		let mounted = true;

		async function load() {
			setLoading(true);
			setError("");
			try {
				const rows = await getDrivers();
				if (mounted) setDrivers(rows);
			} catch (err: unknown) {
				if (mounted) {
					setError(
						err instanceof Error ? err.message : "Failed to load drivers",
					);
				}
			} finally {
				if (mounted) setLoading(false);
			}
		}

		void load();
		return () => {
			mounted = false;
		};
	}, []);

	function resetForm() {
		setForm(emptyForm);
		setEditingId(null);
		setShowCreateForm(false);
	}

	function onEdit(d: DriverDto) {
		setEditingId(d.id);
		setShowCreateForm(true);
		setForm({
			id: d.id,
			name: d.name || "",
			phone: d.phone || "",
			truckNo: d.truckNo || "",
			licenseNo: d.licenseNo || "",
			active: d.active !== false,
		});
	}

	async function refreshDrivers() {
		const rows = await getDrivers();
		setDrivers(rows);
	}

	async function onSubmit() {
		if (!form.name.trim()) {
			await showError("ড্রাইভার নাম দিন");
			return;
		}

		setSaving(true);
		setError("");

		try {
			if (editingId) {
				await updateDriver(editingId, {
					name: form.name.trim(),
					phone: form.phone.trim() || undefined,
					truckNo: form.truckNo.trim() || undefined,
					licenseNo: form.licenseNo.trim() || undefined,
					active: form.active,
				});
			} else {
				await createDriver({
					id: form.id.trim() || undefined,
					name: form.name.trim(),
					phone: form.phone.trim() || undefined,
					truckNo: form.truckNo.trim() || undefined,
					licenseNo: form.licenseNo.trim() || undefined,
					active: form.active,
				});
			}

			await refreshDrivers();
			await showSuccess(editingId ? "Driver updated" : "Driver added");
			resetForm();
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Failed to save driver";
			setError(message);
			await showError(message);
		} finally {
			setSaving(false);
		}
	}

	const filtered = useMemo(() => {
		const q = filter.trim().toLowerCase();
		if (!q) return drivers;
		return drivers.filter((d) => {
			return (
				(d.name || "").toLowerCase().includes(q) ||
				(d.id || "").toLowerCase().includes(q) ||
				(d.phone || "").toLowerCase().includes(q) ||
				(d.truckNo || "").toLowerCase().includes(q)
			);
		});
	}, [drivers, filter]);

	const showForm = Boolean(editingId) || showCreateForm;

	const activeCount = drivers.filter((d) => d.active !== false).length;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Driver Master</h1>
					<p className="text-sm text-slate-500">
						নিজের ট্রাক / ট্রলি ড্রাইভারদের প্রোফাইল, ট্রাক নম্বর ও স্ট্যাটাস
						ম্যানেজ করুন।
					</p>
				</div>
				<div className="text-right text-xs text-slate-500">
					<div>মোট ড্রাইভার: {drivers.length}</div>
					<div>Active: {activeCount}</div>
				</div>
			</div>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
					{error}
				</div>
			)}

			<div className="grid grid-cols-1 gap-4 items-start">
				<section className="card">
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-lg font-semibold">Driver List</h2>
						<div className="flex items-center gap-2">
							<button
								className="btn btn-primary h-8 text-sm whitespace-nowrap"
								type="button"
								onClick={() => {
									setEditingId(null);
									setForm(emptyForm);
									setShowCreateForm(true);
								}}
							>
								নতুন ড্রাইভার যোগ
							</button>
							<input
								className="input h-8 text-sm"
								placeholder="Search: নাম / ID / মোবাইল / ট্রাক"
								value={filter}
								onChange={(e) => setFilter(e.target.value)}
							/>
						</div>
					</div>

					<div className="overflow-x-auto rounded-lg border">
						<table className="w-full text-sm">
							<thead>
								<tr className="bg-slate-50 text-left text-xs text-slate-500">
									<th className="px-3 py-2">ID</th>
									<th className="px-3 py-2">Driver</th>
									<th className="px-3 py-2">Mobile</th>
									<th className="px-3 py-2">Truck</th>
									<th className="px-3 py-2">License/NID</th>
									<th className="px-3 py-2 text-right">পাওনা</th>
									<th className="px-3 py-2 text-right">দেনা</th>
									<th className="px-3 py-2 text-center">Status</th>
									<th className="px-3 py-2 text-right">Action</th>
								</tr>
							</thead>
							<tbody>
								{loading && (
									<tr>
										<td
											className="py-6 text-center text-sm text-slate-400"
											colSpan={9}
										>
											Loading drivers...
										</td>
									</tr>
								)}
								{filtered.map((d) => (
									<tr key={d.id} className="border-t hover:bg-slate-50">
										<td className="px-3 py-2 text-xs text-slate-500">{d.id}</td>
										<td className="px-3 py-2">
											<div className="font-medium">{d.name}</div>
										</td>
										<td className="px-3 py-2">{d.phone || "—"}</td>
										<td className="px-3 py-2">{d.truckNo || "—"}</td>
										<td className="px-3 py-2 text-xs">{d.licenseNo || "—"}</td>
										<td className="px-3 py-2 text-right text-emerald-700">
											৳ {nf(Number(d.pawna || 0))}
										</td>
										<td className="px-3 py-2 text-right text-red-700">
											৳ {nf(Number(d.dena || 0))}
										</td>
										<td className="px-3 py-2 text-center">
											<span
												className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
													d.active === false
														? "border-red-100 bg-red-50 text-red-600"
														: "border-emerald-100 bg-emerald-50 text-emerald-700"
												}`}
											>
												{d.active === false ? "Inactive" : "Active"}
											</span>
										</td>
										<td className="px-3 py-2 text-right">
											<div className="inline-flex items-center gap-3 whitespace-nowrap">
												<button
													className="text-xs text-brand hover:underline whitespace-nowrap"
													type="button"
													onClick={() => onEdit(d)}
												>
													Edit
												</button>
											</div>
										</td>
									</tr>
								))}
								{!loading && !filtered.length && (
									<tr>
										<td
											className="py-6 text-center text-sm text-slate-400"
											colSpan={9}
										>
											কোনো ড্রাইভার পাওয়া যায়নি
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</section>
			</div>

			{showForm && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
					<div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
						<div className="mb-3 flex items-center justify-between">
							<h3 className="text-lg font-semibold">
								{editingId ? "ড্রাইভার আপডেট" : "নতুন ড্রাইভার যোগ"}
							</h3>
							<button
								className="btn btn-ghost text-xs whitespace-nowrap"
								type="button"
								onClick={resetForm}
							>
								বন্ধ করুন
							</button>
						</div>
						<div className="space-y-3">
							<div>
								<label className="mb-1 block text-sm">ড্রাইভার নাম *</label>
								<input
									className="input w-full"
									value={form.name}
									onChange={(e) => setForm({ ...form, name: e.target.value })}
									placeholder="যেমন: Ali Hossain"
								/>
							</div>
							<div>
								<label className="mb-1 block text-sm">
									Driver ID (Auto / Optional)
								</label>
								<input
									className="input w-full"
									value={form.id}
									onChange={(e) => setForm({ ...form, id: e.target.value })}
									placeholder="খালি রাখলে সিস্টেম নিজে ID দেবে"
									disabled={!!editingId}
								/>
							</div>
							<div>
								<label className="mb-1 block text-sm">মোবাইল</label>
								<input
									className="input w-full"
									value={form.phone}
									onChange={(e) => setForm({ ...form, phone: e.target.value })}
									placeholder="যেমন: 017XXXXXXXX"
								/>
							</div>
							<div>
								<label className="mb-1 block text-sm">ট্রাক/ট্রলি নম্বর</label>
								<input
									className="input w-full"
									value={form.truckNo}
									onChange={(e) =>
										setForm({ ...form, truckNo: e.target.value })
									}
									placeholder="যেমন: DHA-11-1234"
								/>
							</div>
							<div>
								<label className="mb-1 block text-sm">
									লাইসেন্স / NID নম্বর (Optional)
								</label>
								<input
									className="input w-full"
									value={form.licenseNo}
									onChange={(e) =>
										setForm({ ...form, licenseNo: e.target.value })
									}
									placeholder="যেমন: DL-2025-XXXX"
								/>
							</div>

							<div className="mt-2 flex items-center justify-between">
								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={form.active}
										onChange={(e) =>
											setForm({ ...form, active: e.target.checked })
										}
									/>
									Active Driver
								</label>
								<div className="flex gap-2">
									<button
										className="btn btn-primary text-sm whitespace-nowrap"
										type="button"
										onClick={onSubmit}
										disabled={saving}
									>
										{saving
											? "Saving..."
											: editingId
												? "Update Driver"
												: "Save Driver"}
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
