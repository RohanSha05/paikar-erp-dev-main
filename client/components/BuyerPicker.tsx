'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	createCustomer,
	getCustomers,
	sanitizeSellerBuyerName,
	type CustomerDto,
} from '@/lib/api/masters';
import { showError, showSuccess } from '@/lib/swal';

export default function BuyerPicker({
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
	const [allBuyers, setAllBuyers] = useState<CustomerDto[]>([]);
	const [creating, setCreating] = useState(false);
	const [showCreatePopup, setShowCreatePopup] = useState(false);
	const [newName, setNewName] = useState("");
	const [newDistrict, setNewDistrict] = useState("");
	const [newMarket, setNewMarket] = useState("");
	const [newPhone, setNewPhone] = useState("");

	// Initial load on mount with cleanup
	useEffect(() => {
		let mounted = true;
		setLoading(true);
		getCustomers()
			.then((list) => {
				if (mounted) {
					setAllBuyers(list);
					setResults(list);
					setLoading(false);
				}
			})
			.catch((err) => {
				console.error("Failed to load buyers:", err);
				if (mounted) {
					setAllBuyers([]);
					setResults([]);
					setLoading(false);
				}
			});
		return () => {
			mounted = false;
		};
	}, []);

	// Search filter effect
	useEffect(() => {
		const search = q.toLowerCase();
		const filtered = allBuyers.filter(
			(b) =>
				(b.name || "").toLowerCase().includes(search) ||
				(b.district || "").toLowerCase().includes(search) ||
				(b.market || "").toLowerCase().includes(search),
		);
		setResults(filtered);
	}, [q, allBuyers]);

	// Update search text when value prop changes
	useEffect(() => {
		setQ(value?.name || "");
	}, [value?.name]);

	function pick(b: CustomerDto) {
		setQ(b.name || "");
		onChange(b);
		setOpen(false);
		setResults([]);
	}

	function openCreatePopup() {
		const name = sanitizeSellerBuyerName(q);
		setNewName(name);
		setNewDistrict("");
		setNewMarket("");
		setNewPhone("");
		setShowCreatePopup(true);
	}

	async function createFromPopup() {
		const name = sanitizeSellerBuyerName(newName);
		if (creating) return;
		if (!name) {
			await showError("Buyer name is required");
			return;
		}

		const exact = allBuyers.find(
			(b) => (b.name || "").trim().toLowerCase() === name.toLowerCase(),
		);
		if (exact) {
			pick(exact);
			setShowCreatePopup(false);
			return;
		}

		try {
			setCreating(true);
			setNewName(name);
			const created = await createCustomer({
				name,
				type: "mill",
				district: newDistrict.trim() || undefined,
				market: newMarket.trim() || undefined,
				phone: newPhone.trim() || undefined,
			});
			setAllBuyers((prev) => [
				created,
				...prev.filter((b) => b.id !== created.id),
			]);
			setResults((prev) => [
				created,
				...prev.filter((b) => b.id !== created.id),
			]);
			onChange(created);
			setQ(created.name || name);
			setOpen(false);
			setShowCreatePopup(false);
			await showSuccess("Buyer created");
		} catch (error: any) {
			console.error("Failed to create buyer:", error);
			await showError(error?.message || "Failed to create buyer");
		} finally {
			setCreating(false);
		}
	}

	const showAddNew = useMemo(() => {
		if (!q.trim()) return false;
		const found = results.some(
			(r) => r.name.toLowerCase() === q.trim().toLowerCase(),
		);
		return !found;
	}, [q, results]);

	return (
		<div className="relative">
			<div className="flex gap-2">
				<input
					className="input flex-1"
					placeholder="ক্রেতার নাম টাইপ করুন"
					value={q}
					disabled={loading || creating}
					onFocus={() => setOpen(true)}
					onChange={(e) => {
						setQ(e.target.value);
						setOpen(true);
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							const exact = allBuyers.find(
								(b) =>
									(b.name || "").trim().toLowerCase() ===
									q.trim().toLowerCase(),
							);
							if (!q.trim()) return;
							e.preventDefault();
							if (exact) {
								pick(exact);
							} else {
								openCreatePopup();
							}
						}
					}}
				/>
				{/* <button
					type="button"
					className="btn btn-outline btn-sm flex-shrink-0"
					onClick={() => {
						setNewName("");
						setNewDistrict("");
						setNewMarket("");
						setNewPhone("");
						setShowCreatePopup(true);
					}}
					disabled={creating}
				>
					+ নতুন
				</button> */}
			</div>
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
								className="w-full px-3 py-2 text-left text-sm bg-slate-50 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
								onClick={openCreatePopup}
								disabled={creating}
							>
								{`+ Create buyer "${q.trim()}"`}
							</button>
						</div>
					)}
				</div>
			)}

			{showCreatePopup && (
				<>
					<div
						className="fixed inset-0 z-30 bg-black/30"
						onClick={() => {
							if (!creating) setShowCreatePopup(false);
						}}
					/>
					<div className="fixed z-40 left-1/2 top-10 w-[92vw] max-w-md -translate-x-1/2 rounded-lg border bg-white shadow-xl">
						<div className="px-4 py-3 border-b">
							<h4 className="text-sm font-semibold">নতুন ক্রেতা তৈরি করুন</h4>
						</div>
						<div className="p-4 grid grid-cols-1 gap-3">
							<div>
								<label className="block text-xs mb-1">নাম</label>
								<input
									className="input w-full"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									placeholder="ক্রেতার নাম"
									disabled={creating}
								/>
							</div>
							<div>
								<label className="block text-xs mb-1">ডিস্ট্রিক্ট</label>
								<input
									className="input w-full"
									value={newDistrict}
									onChange={(e) => setNewDistrict(e.target.value)}
									placeholder="যেমন: Naogaon"
									disabled={creating}
								/>
							</div>
							<div>
								<label className="block text-xs mb-1">বাজার</label>
								<input
									className="input w-full"
									value={newMarket}
									onChange={(e) => setNewMarket(e.target.value)}
									placeholder="যেমন: Manda"
									disabled={creating}
								/>
							</div>
							<div>
								<label className="block text-xs mb-1">ফোন</label>
								<input
									className="input w-full"
									value={newPhone}
									onChange={(e) => setNewPhone(e.target.value)}
									placeholder="01XXXXXXXXX"
									disabled={creating}
								/>
							</div>
						</div>
						<div className="px-4 py-3 border-t flex items-center justify-end gap-2">
							<button
								type="button"
								className="btn btn-ghost"
								onClick={() => setShowCreatePopup(false)}
								disabled={creating}
							>
								Cancel
							</button>
							<button
								type="button"
								className="btn btn-primary"
								onClick={() => void createFromPopup()}
								disabled={creating || !newName.trim()}
							>
								{creating ? "Creating..." : "Create Buyer"}
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
