'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from "react";
import {
	getProducts,
	updateProductStatus,
	type ProductDto,
} from "@/lib/api/products";
import { showConfirm, showError } from "@/lib/swal";

export default function ProductsPage() {
	const [q, setQ] = useState("");
	const [showInactive, setShowInactive] = useState(false);
	const [loading, setLoading] = useState(true);
	const [rows, setRows] = useState<ProductDto[]>([]);
	const [error, setError] = useState("");

	useEffect(() => {
		let mounted = true;

		async function load() {
			setLoading(true);
			setError("");
			try {
				const data = await getProducts();
				if (mounted) setRows(data);
			} catch (err: unknown) {
				if (mounted) {
					setError(
						err instanceof Error ? err.message : "Failed to load products",
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

	async function refresh() {
		const data = await getProducts();
		setRows(data);
	}

	const filtered = useMemo(() => {
		const k = q.trim().toLowerCase();
		return rows
			.filter((p) => (showInactive ? true : p.active))
			.filter((p) => {
				if (!k) return true;
				return (
					(p.name || "").toLowerCase().includes(k) ||
					(p.code || "").toLowerCase().includes(k) ||
					(p.category || "").toLowerCase().includes(k) ||
					(p.id || "").toLowerCase().includes(k)
				);
			});
	}, [rows, q, showInactive]);

	async function deactivate(id: string) {
		const result = await showConfirm("Inactive করতে চান?");
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

	async function activate(id: string) {
		try {
			await updateProductStatus(id, true);
			await refresh();
		} catch (err: unknown) {
			await showError(
				err instanceof Error ? err.message : "Failed to restore product",
			);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Products</h1>
					<p className="text-sm text-slate-500">
						Create / Edit / Inactive (soft delete)
					</p>
				</div>
				<Link href="/products/new" className="btn btn-primary">
					+ New Product
				</Link>
			</div>

			<div className="card p-3 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
				<input
					className="input md:w-[420px]"
					placeholder="Search by name/code/category/id..."
					value={q}
					onChange={(e) => setQ(e.target.value)}
				/>
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						className="h-4 w-4"
						checked={showInactive}
						onChange={(e) => setShowInactive(e.target.checked)}
					/>
					Show inactive
				</label>
			</div>

			<div className="card p-3">
				{loading && (
					<p className="text-sm text-slate-500 pb-2">Loading products...</p>
				)}
				{error && <p className="text-sm text-red-600 pb-2">{error}</p>}
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-slate-500">
								<th className="py-2">Name</th>
								<th className="py-2">Code</th>
								<th className="py-2">Category</th>
								<th className="py-2">Unit</th>
								<th className="py-2">Status</th>
								<th className="py-2 text-right">Action</th>
							</tr>
						</thead>
						<tbody>
							{filtered.map((p) => (
								<tr key={p.id} className="border-t">
									<td className="py-2">
										<div className="font-medium">{p.name}</div>
										{/* <div className="text-xs text-slate-400">{p.id}</div> */}
									</td>
									<td className="py-2">{p.code}</td>
									<td className="py-2">{p.category || "-"}</td>
									<td className="py-2">{p.unit}</td>
									<td className="py-2">
										<span
											className={`text-xs px-2 py-1 rounded ${p.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
										>
											{p.active ? "Active" : "Inactive"}
										</span>
									</td>
									<td className="py-2 text-right">
										<div className="flex justify-end gap-2">
											<Link
												className="btn btn-ghost btn-sm"
												href={`/products/${p.id}/edit`}
											>
												Edit
											</Link>
											{p.active ? (
												<button
													className="btn btn-ghost btn-sm text-red-600"
													onClick={() => deactivate(p.id)}
												>
													Inactive
												</button>
											) : (
												<button
													className="btn btn-ghost btn-sm"
													onClick={() => activate(p.id)}
												>
													Restore
												</button>
											)}
										</div>
									</td>
								</tr>
							))}
							{filtered.length === 0 && (
								<tr>
									<td colSpan={6} className="py-10 text-center text-slate-400">
										No products found
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
