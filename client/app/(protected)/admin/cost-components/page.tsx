'use client';

import { useEffect, useState } from 'react';
import { loadCostComponents, saveCostComponent, toggleCostActive, type CostComponent, uid } from '@/lib/admin';
import { t } from '@/lib/i18n';
import { showError, showSuccess } from "@/lib/swal";

export default function CostComponentsPage() {
	const [rows, setRows] = useState<CostComponent[]>([]);
	const [form, setForm] = useState<CostComponent>({
		id: "",
		name: "",
		code: "",
		active: true,
		required: false,
		affectsAvg: true,
	});

	useEffect(() => {
		setRows(loadCostComponents());
	}, []);

	async function save() {
		if (!form.name.trim() || !form.code.trim())
			return void (await showError("Name/Code required"));
		const c: CostComponent = { ...form, id: form.id || uid("CC") };
		saveCostComponent(c);
		setRows(loadCostComponents());
		setForm({
			id: "",
			name: "",
			code: "",
			active: true,
			required: false,
			affectsAvg: true,
		});
		await showSuccess("Saved");
	}

	function toggleActive(id: string, v: boolean) {
		toggleCostActive(id, v);
		setRows(loadCostComponents());
	}

	return (
		<div className="flex flex-col gap-6">
			<h1 className="text-2xl font-semibold">
				{t("menu.costComponents") || "Cost Components"}
			</h1>

			<div className="card p-4">
				<div className="grid grid-cols-1 md:grid-cols-5 gap-3">
					<div>
						<div className="text-xs mb-1">Name</div>
						<input
							className="input"
							value={form.name}
							onChange={(e) => setForm({ ...form, name: e.target.value })}
						/>
					</div>
					<div>
						<div className="text-xs mb-1">Code</div>
						<input
							className="input"
							value={form.code}
							onChange={(e) => setForm({ ...form, code: e.target.value })}
							placeholder="e.g., transport"
						/>
					</div>
					<div>
						<div className="text-xs mb-1">Active</div>
						<select
							className="input"
							value={form.active ? "yes" : "no"}
							onChange={(e) =>
								setForm({ ...form, active: e.target.value === "yes" })
							}
						>
							<option value="yes">Yes</option>
							<option value="no">No</option>
						</select>
					</div>
					<div>
						<div className="text-xs mb-1">Required</div>
						<select
							className="input"
							value={form.required ? "yes" : "no"}
							onChange={(e) =>
								setForm({ ...form, required: e.target.value === "yes" })
							}
						>
							<option value="yes">Yes</option>
							<option value="no">No</option>
						</select>
					</div>
					<div>
						<div className="text-xs mb-1">Affects Average Cost</div>
						<select
							className="input"
							value={form.affectsAvg ? "yes" : "no"}
							onChange={(e) =>
								setForm({ ...form, affectsAvg: e.target.value === "yes" })
							}
						>
							<option value="yes">Yes</option>
							<option value="no">No</option>
						</select>
					</div>
				</div>
				<div className="mt-3">
					<button className="btn btn-primary" onClick={save}>
						{t("common.save") || "Save"}
					</button>
				</div>
			</div>

			<div className="card p-0 overflow-x-auto">
				<div className="p-3 border-b font-medium">Components</div>
				<table className="w-full text-sm">
					<thead>
						<tr className="text-left text-slate-500 border-b">
							<th className="py-2 px-3">Name</th>
							<th className="py-2 px-3">Code</th>
							<th className="py-2 px-3">Active</th>
							<th className="py-2 px-3">Required</th>
							<th className="py-2 px-3">Affects Avg</th>
							<th className="py-2 px-3">Action</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((r) => (
							<tr key={r.id} className="border-t">
								<td className="py-2 px-3">{r.name}</td>
								<td className="py-2 px-3">{r.code}</td>
								<td className="py-2 px-3">{r.active ? "Yes" : "No"}</td>
								<td className="py-2 px-3">{r.required ? "Yes" : "No"}</td>
								<td className="py-2 px-3">{r.affectsAvg ? "Yes" : "No"}</td>
								<td className="py-2 px-3">
									<button className="link" onClick={() => setForm(r)}>
										Edit
									</button>
									<span className="mx-2 text-slate-400">|</span>
									<button
										className="link"
										onClick={() => toggleActive(r.id, !r.active)}
									>
										{r.active ? "Deactivate" : "Activate"}
									</button>
								</td>
							</tr>
						))}
						{rows.length === 0 && (
							<tr>
								<td className="py-6 text-center text-slate-400" colSpan={6}>
									No components
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
