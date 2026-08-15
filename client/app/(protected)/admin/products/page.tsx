'use client';

import { useEffect, useState } from "react";
import {
	createProduct,
	getProducts,
	updateProduct,
	updateProductStatus,
	type ProductDto,
} from "@/lib/api/products";
import { showConfirm, showError } from "@/lib/swal";

let productCodeSeq = 0;

function nextAutoProductCode() {
	productCodeSeq += 1;
	const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	return `PR-${date}-${String(productCodeSeq).padStart(3, "0")}`;
}

export default function ProductsPage() {
	const [rows, setRows] = useState<ProductDto[]>([]);
	const [form, setForm] = useState({
		id: "",
		name: "",
		code: "",
		category: "",
		unit: "bag" as ProductDto["unit"],
		active: true,
	});

	useEffect(() => {
		void refresh();
	}, []);

	async function refresh() {
		const data = await getProducts();
		setRows(data);
	}

	function resetForm() {
		setForm({
			id: "",
			name: "",
			code: "",
			category: "",
			unit: "bag",
			active: true,
		});
	}

	function editRow(p: ProductDto) {
		setForm({
			id: p.id,
			name: p.name,
			code: p.code,
			category: p.category || "",
			unit: p.unit,
			active: p.active,
		});
	}

	async function save() {
		if (!form.name.trim()) {
			await showError("Product name required");
			return;
		}

		try {
			if (form.id) {
				await updateProduct(form.id, {
					name: form.name.trim(),
					category: form.category?.trim() || undefined,
					unit: form.unit,
					active: form.active,
				});
			} else {
				await createProduct({
					name: form.name.trim(),
					code: form.code.trim() || nextAutoProductCode(),
					category: form.category?.trim() || undefined,
					unit: form.unit,
					active: form.active,
				});
			}

			await refresh();
			resetForm();
		} catch (err: unknown) {
			await showError(
				err instanceof Error ? err.message : "Failed to save product",
			);
		}
	}

	async function deactivate(id: string) {
		const result = await showConfirm("এই প্রোডাক্টটি inactive করতে চান?");
		if (!result.isConfirmed) return;
		try {
			await updateProductStatus(id, false);
			await refresh();
		} catch (err: unknown) {
			await showError(
				err instanceof Error ? err.message : "Failed to inactive product",
			);
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Product Master</h1>
				<p className="text-xs text-slate-500">
					এখানে থেকে ধান/চাল/অন্যান্য সব প্রোডাক্ট define করা হবে – Purchase ও
					Sales ফর্মে dropdown হিসেবে আসবে।
				</p>
			</div>

			{/* Form */}
			<div className="card p-4">
				<div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
					<div className="md:col-span-2">
						<label className="block text-xs mb-1">Name</label>
						<input
							className="input w-full"
							value={form.name}
							onChange={(e) => setForm({ ...form, name: e.target.value })}
							placeholder="যেমন: ২৮ ধান"
						/>
					</div>
					<div>
						<label className="block text-xs mb-1">Code</label>
						<input
							className="input w-full"
							value={form.code}
							onChange={(e) => setForm({ ...form, code: e.target.value })}
							placeholder="Auto / Optional"
						/>
					</div>
					<div>
						<label className="block text-xs mb-1">Category</label>
						<input
							className="input w-full"
							value={form.category}
							onChange={(e) => setForm({ ...form, category: e.target.value })}
							placeholder="যেমন: ধান / চাল"
						/>
					</div>
					<div>
						<label className="block text-xs mb-1">Unit</label>
						<select
							className="input w-full"
							value={form.unit}
							onChange={(e) =>
								setForm({ ...form, unit: e.target.value as ProductDto["unit"] })
							}
						>
							<option value="bag">Bag</option>
							<option value="kg">Kg</option>
							<option value="mon">Mon</option>
						</select>
					</div>
					<div className="flex items-center gap-2">
						<input
							id="p-active"
							type="checkbox"
							checked={form.active}
							onChange={(e) => setForm({ ...form, active: e.target.checked })}
						/>
						<label htmlFor="p-active" className="text-xs">
							Active
						</label>
					</div>
				</div>

				<div className="mt-4 flex gap-2">
					<button className="btn btn-primary" onClick={save}>
						{form.id ? "Update Product" : "Save Product"}
					</button>
					{form.id && (
						<button className="btn btn-ghost" onClick={resetForm}>
							Clear
						</button>
					)}
				</div>
			</div>

			{/* List */}
			<div className="card p-0 overflow-x-auto">
				<div className="p-3 border-b font-medium text-sm">
					Products ({rows.length})
				</div>
				<table className="w-full text-xs">
					<thead>
						<tr className="text-left text-slate-500 border-b">
							<th className="py-2 px-3">Name</th>
							<th className="py-2 px-3">Code</th>
							<th className="py-2 px-3">Category</th>
							<th className="py-2 px-3">Unit</th>
							<th className="py-2 px-3">Status</th>
							<th className="py-2 px-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((r) => (
							<tr key={r.id} className="border-t">
								<td className="py-1 px-3">{r.name}</td>
								<td className="py-1 px-3">{r.code}</td>
								<td className="py-1 px-3">{r.category || "—"}</td>
								<td className="py-1 px-3">{r.unit}</td>
								<td className="py-1 px-3">
									{r.active ? (
										<span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] text-green-700">
											Active
										</span>
									) : (
										<span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
											Inactive
										</span>
									)}
								</td>
								<td className="py-1 px-3 text-right space-x-2">
									<button
										className="text-xs text-brand"
										onClick={() => editRow(r)}
									>
										Edit
									</button>
									{r.active && (
										<button
											className="text-xs text-red-500"
											onClick={() => deactivate(r.id)}
										>
											Inactive
										</button>
									)}
								</td>
							</tr>
						))}
						{!rows.length && (
							<tr>
								<td colSpan={6} className="py-6 text-center text-slate-400">
									No products yet
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
