'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  createCustomer,
  createSeller,
  deleteCustomer,
  deleteSeller,
  getCustomers,
  getSellers,
  updateCustomer,
  updateSeller,
  type CustomerDto,
  type SellerDto,
} from '@/lib/api/masters';
import { showConfirm, showError, showSuccess } from '@/lib/swal';
import { getParties as getCashbookParties } from "@/lib/api/cashbook";
import { getLedger } from "@/lib/api/accounting";

type PartyMode = "seller" | "customer";
type CustomerType = "mill" | "retailer" | "other";

export default function PartiesPage() {
	const [mode, setMode] = useState<PartyMode>("seller");
	const [name, setName] = useState("");
	const [district, setDistrict] = useState("");
	const [market, setMarket] = useState("");
	const [phone, setPhone] = useState("");
	const [openingSide, setOpeningSide] = useState<"dr" | "cr">("dr");
	const [openingAmount, setOpeningAmount] = useState("");
	const [customerType, setCustomerType] = useState<CustomerType>("retailer");
	const [editingId, setEditingId] = useState<string | null>(null);

	const [sellers, setSellers] = useState<SellerDto[]>([]);
	const [customers, setCustomers] = useState<CustomerDto[]>([]);
	const [balances, setBalances] = useState<Record<string, number>>({});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const [nidNumber, setNidNumber] = useState("");
	const [emergencyPhone, setEmergencyPhone] = useState("");
	const [address, setAddress] = useState("");

	useEffect(() => {
		let mounted = true;

		async function loadAll() {
			try {
				setLoading(true);
				const [sellerRes, customerRes] = await Promise.allSettled([
					getSellers(),
					getCustomers(),
				]);

				if (!mounted) return;

				setSellers(sellerRes.status === "fulfilled" ? sellerRes.value : []);
				setCustomers(
					customerRes.status === "fulfilled" ? customerRes.value : [],
				);

				// fetch cashbook party account ids to compute balances
				try {
					const [cbSellers, cbCustomers] = await Promise.all([
						getCashbookParties("seller"),
						getCashbookParties("customer"),
					]);

					const accountMap: Record<string, string> = {};
					(cbSellers || []).forEach((p: any) => {
						if (p.accountId) accountMap[p.id] = p.accountId;
					});
					(cbCustomers || []).forEach((p: any) => {
						if (p.accountId) accountMap[p.id] = p.accountId;
					});

					const accountIds = Array.from(new Set(Object.values(accountMap)));
					if (accountIds.length) {
						const ledgerResults = await Promise.allSettled(
							accountIds.map((a) => getLedger(a).catch(() => null)),
						);
						const accountBalances: Record<string, number> = {};
						for (let i = 0; i < accountIds.length; i++) {
							const a = accountIds[i];
							const r = ledgerResults[i];
							if (r.status === "fulfilled" && r.value)
								accountBalances[a] = Number(r.value.closing || 0);
						}

						const partyBalances: Record<string, number> = {};
						Object.keys(accountMap).forEach((partyId) => {
							const acc = accountMap[partyId];
							partyBalances[partyId] = accountBalances[acc] ?? 0;
						});
						if (mounted) setBalances(partyBalances);
					}
				} catch (err) {
					// ignore balance errors, don't block page
				}
			} finally {
				if (mounted) setLoading(false);
			}
		}

		loadAll();
		return () => {
			mounted = false;
		};
	}, []);

	const visibleRows = useMemo(() => {
		if (mode === "seller") {
			return sellers.map((row) => ({
				id: row.id,
				name: row.name,
				district: row.district,
				market: row.market,
				phone: row.phone,
				type: "seller",

				// NEW FIELDS
				nidNumber: row.nidNumber,
				emergencyPhone: row.emergencyPhone,
				address: row.address,
				balance: balances[row.id] ?? 0,
			}));
		}

		return customers.map((row) => ({
			id: row.id,
			name: row.name,
			district: row.district,
			market: row.market,
			phone: row.phone,
			type: row.type || "other",

			// NEW FIELDS
			nidNumber: row.nidNumber,
			emergencyPhone: row.emergencyPhone,
			address: row.address,
			balance: balances[row.id] ?? 0,
		}));
	}, [customers, mode, sellers, balances]);

	async function onSave() {
		if (saving) return;

		const partyName = name.trim();
		if (!partyName) {
			await showError("নাম দিন");
			return;
		}

		const amount = Number(openingAmount || 0);
		if (!editingId && !amount) {
			await showError("পাওনা/দেনার পরিমাণ দিন");
			return;
		}

		try {
			setSaving(true);

			if (mode === "seller") {
				if (editingId) {
					const updated = await updateSeller(editingId, {
						name: partyName,
						district: district.trim() || undefined,
						market: market.trim() || undefined,
						phone: phone.trim() || undefined,
						nidNumber: nidNumber.trim() || undefined,
						emergencyPhone: emergencyPhone.trim() || undefined,
						address: address.trim() || undefined,
					});

					setSellers((prev) =>
						prev.map((x) => (x.id === updated.id ? updated : x)),
					);
					await showSuccess("বিক্রেতা আপডেট হয়েছে");
				} else {
					const created = await createSeller({
						name: partyName,
						district: district.trim() || undefined,
						market: market.trim() || undefined,
						phone: phone.trim() || undefined,
						paona: openingSide === "dr" ? amount : 0,
						dena: openingSide === "cr" ? amount : 0,
						nidNumber: nidNumber.trim() || undefined,
						emergencyPhone: emergencyPhone.trim() || undefined,
						address: address.trim() || undefined,
					});

					setSellers((prev) => [
						created,
						...prev.filter((x) => x.id !== created.id),
					]);
					await showSuccess("বিক্রেতা তৈরি হয়েছে");
				}
			} else {
				if (editingId) {
					const updated = await updateCustomer(editingId, {
						name: partyName,
						district: district.trim() || undefined,
						market: market.trim() || undefined,
						phone: phone.trim() || undefined,
						type: customerType,
						nidNumber: nidNumber.trim() || undefined,
						emergencyPhone: emergencyPhone.trim() || undefined,
						address: address.trim() || undefined,
					});

					setCustomers((prev) =>
						prev.map((x) => (x.id === updated.id ? updated : x)),
					);
					await showSuccess("ক্রেতা আপডেট হয়েছে");
				} else {
					const created = await createCustomer({
						name: partyName,
						district: district.trim() || undefined,
						market: market.trim() || undefined,
						phone: phone.trim() || undefined,
						paona: openingSide === "dr" ? amount : 0,
						dena: openingSide === "cr" ? amount : 0,
						type: customerType,
						nidNumber: nidNumber.trim() || undefined,
						emergencyPhone: emergencyPhone.trim() || undefined,
						address: address.trim() || undefined,
					});

					setCustomers((prev) => [
						created,
						...prev.filter((x) => x.id !== created.id),
					]);
					await showSuccess("ক্রেতা তৈরি হয়েছে");
				}
			}

			setEditingId(null);
			setName("");
			setDistrict("");
			setMarket("");
			setPhone("");
			setOpeningSide("dr");
			setOpeningAmount("");
			setNidNumber("");
			setEmergencyPhone("");
			setAddress("");
		} catch (error: any) {
			await showError(error?.message || "Create failed");
		} finally {
			setSaving(false);
		}
	}

	function onEditRow(row: {
		id: string;
		name?: string;
		district?: string;
		market?: string;
		phone?: string;
		type?: string;
		nidNumber?: string;
		emergencyPhone?: string;
		address?: string;
	}) {
		setEditingId(row.id);
		setName(row.name || "");
		setDistrict(row.district || "");
		setMarket(row.market || "");
		setPhone(row.phone || "");
		setOpeningSide("dr");
		setOpeningAmount("");
		setNidNumber(row.nidNumber || "");
		setEmergencyPhone(row.emergencyPhone || "");
		setAddress(row.address || "");

		if (mode === "customer") {
			const nextType = (row.type || "retailer") as CustomerType;
			setCustomerType(
				nextType === "mill" || nextType === "retailer" ? nextType : "other",
			);
		}
	}

	function onCancelEdit() {
		setEditingId(null);
		setName("");
		setDistrict("");
		setMarket("");
		setPhone("");
		setCustomerType("retailer");
		setOpeningSide("dr");
		setOpeningAmount("");
	}

	async function onDeleteRow(row: { id: string; name?: string }) {
		if (saving) return;

		const result = await showConfirm(
			mode === "seller" ? "বিক্রেতা ডিলিট করবেন?" : "ক্রেতা ডিলিট করবেন?",
			row.name || row.id,
		);
		if (!result.isConfirmed) return;

		try {
			setSaving(true);
			if (mode === "seller") {
				await deleteSeller(row.id);
				setSellers((prev) => prev.filter((x) => x.id !== row.id));
				await showSuccess("বিক্রেতা ডিলিট হয়েছে");
			} else {
				await deleteCustomer(row.id);
				setCustomers((prev) => prev.filter((x) => x.id !== row.id));
				await showSuccess("ক্রেতা ডিলিট হয়েছে");
			}

			if (editingId === row.id) {
				onCancelEdit();
			}
		} catch (error: any) {
			await showError(error?.message || "Delete failed");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold">ক্রেতা / বিক্রেতা</h2>
					<p className="text-xs text-slate-500">
						নতুন বিক্রেতা বা ক্রেতা তৈরি করুন
					</p>
				</div>
			</div>

			<section className="card">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="md:col-span-2">
						<label className="block text-sm mb-1">ধরণ</label>
						<div className="flex rounded-lg border overflow-hidden w-fit">
							<button
								type="button"
								className={`px-4 py-2 text-sm ${mode === "seller" ? "bg-brand text-white" : "bg-white"}`}
								onClick={() => {
									setMode("seller");
									onCancelEdit();
								}}
							>
								বিক্রেতা
							</button>
							<button
								type="button"
								className={`px-4 py-2 text-sm ${mode === "customer" ? "bg-brand text-white" : "bg-white"}`}
								onClick={() => {
									setMode("customer");
									onCancelEdit();
								}}
							>
								ক্রেতা
							</button>
						</div>
					</div>

					<div>
						<label className="block text-sm mb-1">নাম</label>
						<input
							className="input"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={mode === "seller" ? "বিক্রেতার নাম" : "ক্রেতার নাম"}
						/>
					</div>

					{mode === "customer" && (
						<div>
							<label className="block text-sm mb-1">ক্রেতার ধরণ</label>
							<select
								className="input"
								value={customerType}
								onChange={(e) =>
									setCustomerType(e.target.value as CustomerType)
								}
							>
								<option value="retailer">Retailer</option>
								<option value="mill">Mill</option>
								<option value="other">Other</option>
							</select>
						</div>
					)}

					<div>
						<label className="block text-sm mb-1">ডিস্ট্রিক্ট</label>
						<input
							className="input"
							value={district}
							onChange={(e) => setDistrict(e.target.value)}
							placeholder="যেমন: Naogaon"
						/>
					</div>

					<div>
						<label className="block text-sm mb-1">বাজার</label>
						<input
							className="input"
							value={market}
							onChange={(e) => setMarket(e.target.value)}
							placeholder="যেমন: Manda"
						/>
					</div>

					<div>
						<label className="block text-sm mb-1">ফোন</label>
						<input
							className="input"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							placeholder="01XXXXXXXXX"
						/>
					</div>

					{/* Only show on create */}

					<div>
						<label className="block text-sm mb-1">NID Number</label>
						<input
							className="input"
							value={nidNumber}
							onChange={(e) => setNidNumber(e.target.value)}
							placeholder="জাতীয় পরিচয়পত্র নম্বর"
						/>
					</div>

					<div>
						<label className="block text-sm mb-1">Emergency Phone</label>
						<input
							className="input"
							value={emergencyPhone}
							onChange={(e) => setEmergencyPhone(e.target.value)}
							placeholder="জরুরি ফোন নাম্বার"
						/>
					</div>

					<div className="md:col-span-2">
						<label className="block text-sm mb-1">Address</label>
						<textarea
							className="input"
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							placeholder="পূর্ণ ঠিকানা"
						/>
					</div>
					{!editingId && (
						<>
							<div>
								<label className="block text-sm mb-1">ওপেনিং টাইপ</label>
								<select
									className="input"
									value={openingSide}
									onChange={(e) =>
										setOpeningSide(e.target.value as "dr" | "cr")
									}
								>
									<option value="dr">পাওনা (Dr)</option>
									<option value="cr">দেনা (Cr)</option>
								</select>
							</div>

							<div>
								<label className="block text-sm mb-1">
									পূর্বের {openingSide === "dr" ? "পাওনা" : "দেনা"}
								</label>

								<input
									className="input"
									type="number"
									value={openingAmount}
									onChange={(e) => setOpeningAmount(e.target.value)}
									placeholder="যেমন: 5000"
								/>
							</div>
						</>
					)}

					<div className="md:col-span-2 flex justify-end">
						<div className="flex items-center gap-2">
							{editingId && (
								<button
									className="btn btn-ghost"
									onClick={onCancelEdit}
									disabled={saving}
								>
									Cancel Edit
								</button>
							)}
							<button
								className="btn btn-primary"
								onClick={onSave}
								disabled={saving}
							>
								{saving
									? "Saving..."
									: editingId
										? mode === "seller"
											? "বিক্রেতা আপডেট করুন"
											: "ক্রেতা আপডেট করুন"
										: mode === "seller"
											? "বিক্রেতা তৈরি করুন"
											: "ক্রেতা তৈরি করুন"}
							</button>
						</div>
					</div>
				</div>
			</section>

			<section className="card overflow-x-auto">
				<h3 className="text-base font-semibold mb-3">
					{mode === "seller" ? "বিক্রেতা তালিকা" : "ক্রেতা তালিকা"}
				</h3>

				{loading ? (
					<div className="text-sm text-slate-500">Loading...</div>
				) : (
					<table className="min-w-full text-sm">
						<thead>
							<tr className="text-left text-slate-600">
								<th className="py-2 px-3">নাম</th>
								<th className="py-2 px-3">ধরণ</th>
								<th className="py-2 px-3">ডিস্ট্রিক্ট</th>
								<th className="py-2 px-3">বাজার</th>
								<th className="py-2 px-3">ফোন</th>
								<th>NID</th>
								<th>Emergency Phone</th>
								<th>Address</th>
								<th className="py-2 px-3 text-right">Balance</th>
								<th className="py-2 px-3 text-right">অ্যাকশন</th>
							</tr>
						</thead>
						<tbody>
							{visibleRows.map((row) => (
								<tr key={row.id} className="border-t">
									<td className="py-2 px-3 font-medium">{row.name || "-"}</td>
									<td className="py-2 px-3">{row.type || "-"}</td>
									<td className="py-2 px-3">{row.district || "-"}</td>
									<td className="py-2 px-3">{row.market || "-"}</td>
									<td className="py-2 px-3">{row.phone || "-"}</td>

									{/* NEW FIELDS */}
									<td className="py-2 px-3">{row.nidNumber || "-"}</td>
									<td className="py-2 px-3">{row.emergencyPhone || "-"}</td>
									<td className="py-2 px-3">{row.address || "-"}</td>

									<td className="py-2 px-3 text-right">
										{row.balance
											? row.balance < 0
												? `দেনা: ${Math.abs(row.balance).toLocaleString()}`
												: `পাওনা: ${row.balance.toLocaleString()}`
											: "-"}
									</td>

									<td className="py-2 px-3 text-right">
										<div className="flex items-center justify-end gap-2">
											<button
												className="btn btn-ghost"
												onClick={() => onEditRow(row)}
											>
												Edit
											</button>
											<button
												className="btn btn-ghost text-red-600"
												onClick={() => void onDeleteRow(row)}
											>
												Delete
											</button>
										</div>
									</td>
								</tr>
							))}

							{!visibleRows.length && (
								<tr>
									<td className="py-4 px-3 text-slate-500" colSpan={10}>
										কোনো তথ্য নেই
									</td>
								</tr>
							)}
						</tbody>
					</table>
				)}
			</section>
		</div>
	);
}
