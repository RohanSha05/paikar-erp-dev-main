'use client';

import { useEffect, useState } from 'react';
import { createWarehouse, getWarehouses, type WarehouseDto } from '@/lib/api/warehouses';
import { t } from '@/lib/i18n';
import Link from 'next/link';
import { showError, showSuccess } from "@/lib/swal";

function makeWarehouseCode(name: string) {
	const base = name
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 18);
	const stamp = new Date()
		.toISOString()
		.replace(/[-:TZ.]/g, "")
		.slice(0, 14);
	return `WH-${base || "NEW"}-${stamp}`;
}

export default function WarehousesPage() {
	const [rows, setRows] = useState<WarehouseDto[]>([]);
	const [name, setName] = useState("");
	const [address, setAddress] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		let mounted = true;

		async function load() {
			setLoading(true);
			setError("");
			try {
				const data = await getWarehouses();
				if (mounted) setRows(data);
			} catch (err: unknown) {
				if (mounted) {
					setError(err instanceof Error ? err.message : 'Failed to load warehouses');
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
		const data = await getWarehouses();
		setRows(data);
	}

	async function addWH() {
		const nm = name.trim();
		if (!nm)
			return void (await showError(t("wh.form.name") || "Name required"));

		setSaving(true);
		setError("");
		try {
			await createWarehouse({
				code: makeWarehouseCode(nm),
				name: nm,
				address: address.trim() || undefined,
			});
			await refresh();
			setName("");
			setAddress("");
			await showSuccess(t("wh.msg.saved") || "Warehouse saved");
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Failed to save warehouse';
			setError(message);
			await showError(message);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">
					{t("wh.title") || "Warehouses"}
				</h1>
				<Link href="/inventory" className="btn btn-ghost">
					{t("stock.btn.back") || "Back"}
				</Link>
			</div>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
					{error}
				</div>
			)}

			{/* New form */}
			<div className="card p-4">
				<div className="font-medium mb-3">
					{t("wh.btn.new") || "New Warehouse"}
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div>
						<div className="text-xs mb-1">{t("wh.form.name") || "Name"}</div>
						<input
							className="input w-full"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={t("wh.form.name") || "Name"}
						/>
					</div>
					<div className="md:col-span-2">
						<div className="text-xs mb-1">
							{t("wh.form.address") || "Address"}
						</div>
						<input
							className="input w-full"
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							placeholder={t("wh.form.address") || "Address"}
						/>
					</div>
				</div>
				<div className="mt-3">
					<button className="btn btn-primary" onClick={addWH} disabled={saving}>
						{t("wh.btn.save") || "Save"}
					</button>
				</div>
			</div>

			{/* List */}
			<div className="card p-0 overflow-x-auto">
				<div className="p-3 border-b font-medium">
					{t("wh.list.title") || "Warehouse List"}
				</div>
				<table className="w-full text-sm">
					<thead>
						<tr className="text-left text-slate-500 border-b">
							<th className="py-2 px-3">{t("wh.table.name") || "Name"}</th>
							<th className="py-2 px-3">
								{t("wh.table.address") || "Address"}
							</th>
							<th className="py-2 px-3">{t("wh.table.action") || "Action"}</th>
						</tr>
					</thead>
					<tbody>
						{loading && (
							<tr>
								<td className="py-6 text-center text-slate-400" colSpan={3}>
									Loading warehouses...
								</td>
							</tr>
						)}
						{rows.map((w) => (
							<tr key={w.id} className="border-t">
								<td className="py-2 px-3">{w.name}</td>
								<td className="py-2 px-3">{w.address || "—"}</td>
								<td className="py-2 px-3">
									{/* Future: Edit/Delete */}
									<span className="text-slate-400">—</span>
								</td>
							</tr>
						))}
						{!loading && rows.length === 0 && (
							<tr>
								<td className="py-6 text-center text-slate-400" colSpan={3}>
									{t("inventory.empty") || "No data"}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
