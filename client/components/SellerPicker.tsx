'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	createSeller,
	getSellers,
	sanitizeSellerBuyerName,
	SellerDto,
} from "@/lib/api/masters";
import { showError, showSuccess } from "@/lib/swal";

export default function SellerPicker({
	value,
	onChange,
	hideAddNew = false,
}: {
	value?: SellerDto | null;
	onChange: (s: SellerDto) => void;
	hideAddNew?: boolean;
}) {
	const [q, setQ] = useState(value?.name || "");
	const [open, setOpen] = useState(false);
	const [results, setResults] = useState<SellerDto[]>([]);
	const [loading, setLoading] = useState(false);
	const [allSellers, setAllSellers] = useState<SellerDto[]>([]);
	const [creating, setCreating] = useState(false);
	const [showCreatePopup, setShowCreatePopup] = useState(false);
	const [newName, setNewName] = useState("");
	const [newDistrict, setNewDistrict] = useState("");
	const [newMarket, setNewMarket] = useState("");
	const [newPhone, setNewPhone] = useState("");

	useEffect(() => {
		let mounted = true;
		setLoading(true);
		getSellers()
			.then((list) => {
				if (mounted) {
					setAllSellers(list);
					setLoading(false);
				}
			})
			.catch((err) => {
				console.error("Failed to load sellers:", err);
				if (mounted) setLoading(false);
			});
		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		const search = q.toLowerCase();
		const filtered = allSellers.filter((s) =>
			(s.name || "").toLowerCase().includes(search),
		);
		setResults(filtered);
	}, [q, allSellers]);

	useEffect(() => {
		setQ(value?.name || "");
	}, [value?.name]);

	function pick(s: SellerDto) {
		onChange(s);
		setQ(s.name || "");
		setOpen(false);
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
			await showError("Seller name is required");
			return;
		}

		const exact = allSellers.find(
			(s) => (s.name || "").trim().toLowerCase() === name.toLowerCase(),
		);
		if (exact) {
			pick(exact);
			setShowCreatePopup(false);
			return;
		}

		try {
			setCreating(true);
			setNewName(name);
			const created = await createSeller({
				name,
				district: newDistrict.trim() || undefined,
				market: newMarket.trim() || undefined,
				phone: newPhone.trim() || undefined,
			});
			setAllSellers((prev) => [
				created,
				...prev.filter((s) => s.id !== created.id),
			]);
			setResults((prev) => [
				created,
				...prev.filter((s) => s.id !== created.id),
			]);
			onChange(created);
			setQ(created.name || name);
			setOpen(false);
			setShowCreatePopup(false);
			await showSuccess("Seller created");
		} catch (error: any) {
			await showError(error?.message || "Failed to create seller");
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
					placeholder="বিক্রেতার নাম টাইপ করুন"
					value={q}
					disabled={loading || creating}
					onFocus={() => setOpen(true)}
					onChange={(e) => {
						setQ(e.target.value);
						setOpen(true);
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							const exact = allSellers.find(
								(s) =>
									(s.name || "").trim().toLowerCase() ===
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
				{/* {!hideAddNew && (
					<button
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
					</button>
				)} */}
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
					{/* {showAddNew && (
						<div className="border-t">
							<button
								type="button"
								className="w-full px-3 py-2 text-left text-sm bg-slate-50 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
								onClick={openCreatePopup}
								disabled={creating}
							>
								{`+ Create seller "${q.trim()}"`}
							</button>
						</div>
					)} */}
				</div>
			)}

			{/* {showCreatePopup && (
				<>
					<div
						className="fixed inset-0 z-30 bg-black/30"
						onClick={() => {
							if (!creating) setShowCreatePopup(false);
						}}
					/>
					<div className="fixed z-40 left-1/2 top-10 w-[92vw] max-w-md -translate-x-1/2 rounded-lg border bg-white shadow-xl">
						<div className="px-4 py-3 border-b">
							<h4 className="text-sm font-semibold">নতুন বিক্রেতা তৈরি করুন</h4>
						</div>
						<div className="p-4 grid grid-cols-1 gap-3">
							<div>
								<label className="block text-xs mb-1">নাম</label>
								<input
									className="input w-full"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									placeholder="বিক্রেতার নাম"
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
								{creating ? "Creating..." : "Create Seller"}
							</button>
						</div>
					</div>
				</>
			)} */}
		</div>
	);
}
