'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	getCustomers,
	createCustomer,
	sanitizeSellerBuyerName,
	CustomerDto,
} from "@/lib/api/masters";
import { showError } from "@/lib/swal";

export default function CustomerPicker({
	value,
	onChange,
}: {
	value?: CustomerDto | null;
	onChange: (c: CustomerDto) => void;
}) {
	const [q, setQ] = useState(value?.name || "");
	const [open, setOpen] = useState(false);
	const [results, setResults] = useState<CustomerDto[]>([]);
	const [loading, setLoading] = useState(false);
	const [allCustomers, setAllCustomers] = useState<CustomerDto[]>([]);

	useEffect(() => {
		let mounted = true;
		setLoading(true);
		getCustomers()
			.then((list) => {
				if (mounted) {
					setAllCustomers(list);
					setLoading(false);
				}
			})
			.catch((err) => {
				console.error("Failed to load customers:", err);
				if (mounted) setLoading(false);
			});
		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		const search = q.toLowerCase();
		const filtered = allCustomers.filter((c) =>
			(c.name || "").toLowerCase().includes(search),
		);
		setResults(filtered);
	}, [q, allCustomers]);

	useEffect(() => {
		setQ(value?.name || "");
	}, [value?.name]);

	function pick(c: CustomerDto) {
		onChange(c);
		setOpen(false);
	}

	async function addNew() {
		const name = sanitizeSellerBuyerName(q);
		if (!name) {
			await showError("Buyer name is required");
			return;
		}
		try {
			setLoading(true);
			const newCustomer = await createCustomer({ name, type: "mill" });
			setAllCustomers([newCustomer, ...allCustomers]);
			onChange(newCustomer);
			setOpen(false);
		} catch (err) {
			await showError(
				"Failed to create customer: " +
					(err instanceof Error ? err.message : "Unknown error"),
			);
		} finally {
			setLoading(false);
		}
	}

	const showAddNew = useMemo(() => {
		if (!q.trim()) return false;
		const found = results.some(
			(r) => (r.name || "").toLowerCase() === q.trim().toLowerCase(),
		);
		return !found;
	}, [q, results]);

	return (
		<div className="relative">
			<input
				className="input w-full"
				placeholder="কাস্টমারের নাম টাইপ করুন"
				value={q}
				disabled={loading}
				onFocus={() => setOpen(true)}
				onChange={(e) => setQ(e.target.value)}
			/>
			{open && (
				<div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow">
					<div className="max-h-60 overflow-y-auto">
						{results.map((r) => (
							<button
								key={r.id}
								type="button"
								className="w-full text-left px-3 py-2 hover:bg-slate-100"
								onClick={() => pick(r)}
							>
								<div className="font-medium">{r.name}</div>
								{(r.district || r.market || r.address) && (
									<div className="text-xs text-slate-600">
										{[r.district, r.market, r.address]
											.filter(Boolean)
											.join(" • ")}
									</div>
								)}
							</button>
						))}
						{results.length === 0 && (
							<div className="px-3 py-2 text-sm text-slate-500">
								কোন ফলাফল নেই
							</div>
						)}
					</div>
					{showAddNew && (
						<div className="border-t">
							<button
								type="button"
								className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:opacity-50"
								disabled={loading}
								onClick={addNew}
							>
								“{q.trim()}” নামে নতুন কাস্টমার যোগ করুন
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
