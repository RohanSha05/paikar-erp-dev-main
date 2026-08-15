"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/swal";
import {
	listRetailPurchaseDrafts,
	deleteRetailPurchaseDraft,
	updateRetailPurchaseDraft,
} from "@/lib/api/retailPurchaseDraft";
import { getProducts, ProductDto } from "@/lib/api/products";
import { getWarehouses, WarehouseDto } from "@/lib/api/masters";
import SellerPicker from "@/components/SellerPicker";
import {
	createPurchaseOrderDraft,
	CreatePurchaseOrderDraftInput,
} from "@/lib/api/purchase";
import { DriverDto, getDrivers } from "@/lib/api/drivers";

function toSafeNumber(value: unknown, fallback = 0): number {
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function toDisplayText(value: unknown, fallback = "-"): string {
	if (value === null || value === undefined) return fallback;
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean")
		return String(value);
	if (value instanceof Date) return value.toISOString();
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

const toText = toDisplayText;

type TransportMode = "sellerIncluded" | "marketTruck" | "ownTruck";

export default function Page() {
	const router = useRouter();

	// Step state — matches purchase page stepper pattern
	const [step, setStep] = useState(1);

	// Draft list state
	const [drafts, setDrafts] = useState<any[]>([]);
	const [loadingDrafts, setLoadingDrafts] = useState(false);
	const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [selectedProductType, setSelectedProductType] = useState("");

	// Edit modal state
	const [editDraft, setEditDraft] = useState<any | null>(null);
	const [editLoading, setEditLoading] = useState(false);

	// Masters
	const [products, setProducts] = useState<ProductDto[]>([]);
	const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
	const [drivers, setDrivers] = useState<DriverDto[]>([]);

	// PO Meta — Step 2
	const [seller, setSeller] = useState<any>(null);
	const [warehouseId, setWarehouseId] = useState("");
	const [remarks, setRemarks] = useState("");

	// Transport & Costs — Step 2
	const [transportMode, setTransportMode] =
		useState<TransportMode>("marketTruck");
	const [transport, setTransport] = useState("0");
	const [bagCostMode, setBagCostMode] = useState<"paid" | "self" | "mixed">(
		"paid",
	);
	const [bagCostPerBag, setBagCostPerBag] = useState("0");
	const [paidBagCount, setPaidBagCount] = useState("");
	const [loadingUnloading, setLoadingUnloading] = useState("0");
	const [misc, setMisc] = useState("0");

	// Own Truck
	const [driverMode, setDriverMode] = useState<"select" | "manual">("select");
	const [driverId, setDriverId] = useState("");
	const [driverName, setDriverName] = useState("");
	const [truckNo, setTruckNo] = useState("");
	const [route, setRoute] = useState("");

	// Bosta / finalize
	const [kgPerBosta, setKgPerBosta] = useState(0);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		getWarehouses().then((data) => {
			setWarehouses(data);
			setWarehouseId((prev) => prev || data?.[0]?.id || "");
		});

		getDrivers().then(setDrivers).catch(console.error); // ← add this

		loadDrafts();
	}, []);

	async function loadDrafts() {
		setLoadingDrafts(true);
		try {
			const res = await listRetailPurchaseDrafts(date);
			setDrafts(Array.isArray(res.data) ? res.data : []);
		} catch (e: any) {
			showError("ড্রাফট লোড করা যায়নি", e.message);
		} finally {
			setLoadingDrafts(false);
		}
	}

	function canFinalize() {
		return drafts.length > 0 && drafts.every((d) => d.productId);
	}

	// Totals
	const totalMon = drafts.reduce((sum, d) => sum + toSafeNumber(d.mon), 0);
	const totalKg = totalMon * 40;
	const totalPrice = drafts.reduce(
		(sum, d) => sum + toSafeNumber(d.mon) * toSafeNumber(d.price),
		0,
	);
	const totalPaid = drafts.reduce(
		(sum, d) => sum + toSafeNumber(d.paidAmount),
		0,
	);
	const totalDue = drafts.reduce(
		(sum, d) => sum + toSafeNumber(d.dueAmount),
		0,
	);
	const avgPricePerMon = totalMon > 0 ? totalPrice / totalMon : 0;

	const productTypes = Array.from(
		new Set(products.map((p) => p.category).filter(Boolean)),
	);
	const filteredDrafts = selectedProductType
		? drafts.filter((d) => d.productCategory === selectedProductType)
		: drafts;

	const totalBosta = kgPerBosta > 0 ? totalKg / kgPerBosta : 0;
	const hasPartialBosta = kgPerBosta > 0 && totalKg % kgPerBosta !== 0;
	const lastBostaKg = kgPerBosta > 0 ? totalKg % kgPerBosta : 0;

	function onExistingDriverChange(id: string) {
		setDriverId(id);
		const d = drivers.find((x) => x.id === id);
		if (d) {
			setDriverName(d.name || "");
			setTruckNo(d.truckNo || "");
		} else {
			setDriverName("");
			setTruckNo("");
		}
	}

	async function createPurchaseOrder() {
		if (!warehouseId || !seller || !drafts.length) {
			showError(
				"প্রয়োজনীয় তথ্য অনুপস্থিত",
				"অনুগ্রহ করে ওয়্যারহাউস, বিক্রেতা নির্বাচন করুন।",
			);
			return;
		}
		if (!kgPerBosta || kgPerBosta <= 0) {
			showError(
				"প্রতি বস্তার ওজন প্রয়োজন",
				"ফাইনালাইজ করার আগে প্রতি বস্তার ওজন নির্বাচন করুন।",
			);
			return;
		}
		const draftsToPost = drafts.filter((d) => d.status !== "FINALIZED");
		if (!draftsToPost.length) {
			showError(
				"ড্রাফট ইতিমধ্যেই ফাইনালাইজ করা হয়েছে",
				"কোনো নতুন ড্রাফট নেই।",
			);
			return;
		}
		setLoading(true);
		try {
			const payload: CreatePurchaseOrderDraftInput = {
				purchaseType: "retail",
				sellerId: seller.id,
				warehouseId,
				transport: Number(transport) || 0,
				loading: 0,
				loadingUnloading: Number(loadingUnloading) || 0,
				misc: Number(misc) || 0,
				bagCostMode,
				bagCostPerBag: Number(bagCostPerBag) || 0,
				remarks: `${remarks || ""}${hasPartialBosta && lastBostaKg > 0 ? ` | শেষ বস্তায় ${lastBostaKg} কেজি থাকবে` : ""}`,
				transportMode,
				driverId,
				driverName,
				truckNo,
				route,
				destinationWarehouseId: warehouseId,
				items: draftsToPost.map((d) => ({
					productId: d.productId,
					productType: d.productCategory || "General",
					bagCount:
						kgPerBosta > 0
							? Math.ceil((toSafeNumber(d.mon) * 40) / kgPerBosta)
							: 1,
					actualKgPerBag: kgPerBosta || 0,
					accountingKgPerBag: kgPerBosta || 0,
					weightPolicy: d.weightPolicy || "actual",
					rateBasis: d.rateBasis || "perMon",
					rateValue: toSafeNumber(d.price),
				})),
			};
			const po = await createPurchaseOrderDraft(payload);
			showSuccess(`Purchase order ${po.poNo || ""} created successfully!`);
			const postedIds = draftsToPost.map((d) => d.id);
			// Remove finalized drafts from the list so the UI clears them
			setDrafts((prev) => prev.filter((d) => !postedIds.includes(d.id)));
		} catch (err: any) {
			showError("Failed to create purchase order", err.message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Header — matches purchase page */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold">খুচরা ক্রয় ড্রাফট</h2>
					<p className="text-xs text-slate-500">
						বাজার থেকে খুচরা ক্রয়ের ড্রাফট একত্রিত করে PO তৈরি করুন।
					</p>
				</div>
				<div className="flex gap-2">
					<button
						className="btn btn-ghost"
						onClick={loadDrafts}
						disabled={loadingDrafts || !date}
					>
						{loadingDrafts ? "Loading..." : "Reload"}
					</button>
					<button
						className="btn btn-primary"
						onClick={createPurchaseOrder}
						disabled={loading || !canFinalize()}
					>
						{loading ? "Finalizing..." : "Finalize & Create PO"}
					</button>
				</div>
			</div>

			{/* Stepper — identical pattern to purchase page */}
			<div className="card">
				<div className="flex items-center gap-6 text-sm">
					<StepIndicator n={1} label="ড্রাফট লিস্ট" step={step} />
					<StepIndicator n={2} label="খরচ ও ট্রান্সপোর্ট" step={step} />
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{/* Left — 2 cols, matches purchase page */}
				<div className="lg:col-span-2 flex flex-col gap-4">
					{/* STEP 1 — Draft list */}
					{step === 1 && (
						<section className="card">
							<h3 className="text-lg font-semibold mb-3">ড্রাফটসমূহ</h3>

							{/* Date + filter row */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
								<div>
									<label className="block text-sm mb-1">তারিখ</label>
									<div className="flex gap-2">
										<input
											type="date"
											className="input flex-1"
											value={date}
											onChange={(e) => setDate(e.target.value)}
										/>
										<button
											className="btn btn-ghost"
											onClick={loadDrafts}
											disabled={loadingDrafts || !date}
										>
											{loadingDrafts ? "..." : "Load"}
										</button>
									</div>
								</div>
								<div>
									<label className="block text-sm mb-1">
										ক্যাটাগরি ফিল্টার
									</label>
									<select
										className="input w-full"
										value={selectedProductType}
										onChange={(e) => setSelectedProductType(e.target.value)}
									>
										<option value="">সব ধরনের</option>
										{productTypes.map((type) => (
											<option key={type} value={type}>
												{type}
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Draft table */}
							{filteredDrafts.length > 0 ? (
								<div className="overflow-x-auto">
									<table className="min-w-full text-sm">
										<thead>
											<tr className="text-left text-slate-600">
												<th className="py-2 px-3">বিক্রেতা</th>
												<th className="py-2 px-3">বাজার</th>
												<th className="py-2 px-3">প্রোডাক্ট</th>
												<th className="py-2 px-3">ক্যাটাগরি</th>
												<th className="py-2 px-3 text-right">মন</th>
												<th className="py-2 px-3 text-right">দর</th>
												<th className="py-2 px-3 text-right">পরিশোধিত</th>
												<th className="py-2 px-3 text-right">বাকি</th>
												<th className="py-2 px-3 text-right">অ্যাকশন</th>
											</tr>
										</thead>
										<tbody>
											{filteredDrafts.map((d) => (
												<tr
													key={d.id}
													className={`border-t ${!d.productId ? "bg-red-50" : d.status === "FINALIZED" ? "bg-slate-50 opacity-70" : ""}`}
												>
													<td className="py-2 px-3">
														{d.sellerName || d.seller?.name || "-"}
													</td>
													<td className="py-2 px-3">{toText(d.market)}</td>
													<td className="py-2 px-3">{d.productName || "-"}</td>
													<td className="py-2 px-3">
														{d.productCategory || "-"}
													</td>
													<td className="py-2 px-3 text-right">
														{toSafeNumber(d.mon).toFixed(2)}
													</td>
													<td className="py-2 px-3 text-right">
														{toSafeNumber(d.price).toFixed(2)}
													</td>
													<td className="py-2 px-3 text-right">
														{toSafeNumber(d.paidAmount).toFixed(2)}
													</td>
													<td className="py-2 px-3 text-right">
														{toSafeNumber(d.dueAmount).toFixed(2)}
													</td>
													<td className="py-2 px-3">
														<div className="flex items-center justify-end gap-2">
															{d.status === "FINALIZED" ? (
																<span className="px-2 py-1 text-xs text-white bg-emerald-600 rounded">
																	Finalized
																</span>
															) : (
																<>
																	<button
																		className="btn btn-ghost"
																		onClick={() => setEditDraft(d)}
																	>
																		Edit
																	</button>
																	<button
																		className="btn btn-ghost text-red-600"
																		onClick={async () => {
																			if (
																				window.confirm("এই ড্রাফট মুছে ফেলবেন?")
																			) {
																				await deleteRetailPurchaseDraft(d.id);
																				loadDrafts();
																			}
																		}}
																	>
																		Delete
																	</button>
																</>
															)}
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<div className="py-10 text-center text-slate-500 text-sm">
									{loadingDrafts ? "লোড হচ্ছে..." : "এই তারিখে কোনো ড্রাফট নেই"}
								</div>
							)}

							<div className="flex items-center justify-between mt-4">
								<div className="text-xs text-slate-500">
									{filteredDrafts.length} টি ড্রাফট • মোট {totalMon.toFixed(2)}{" "}
									মন
								</div>
								<button
									className="btn btn-primary"
									onClick={() => setStep(2)}
									disabled={!canFinalize()}
								>
									Next →
								</button>
							</div>
						</section>
					)}

					{/* STEP 2 — Costs & Transport, matches purchase page Step 3 exactly */}
					{step === 2 && (
						<section className="card">
							<h3 className="text-lg font-semibold mb-3">খরচ ও ট্রান্সপোর্ট</h3>

							<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
								{/* Seller */}
								<div className="md:col-span-2">
									<label className="block text-sm mb-1">বিক্রেতা</label>
									<SellerPicker
										value={seller}
										onChange={setSeller}
										hideAddNew
									/>
								</div>

								{/* Warehouse */}
								<div className="md:col-span-2">
									<label className="block text-sm mb-1">
										Destination (Warehouse)
									</label>
									<select
										className="input w-full"
										value={warehouseId}
										onChange={(e) => setWarehouseId(e.target.value)}
										required
									>
										<option value="">ওয়্যারহাউস নির্বাচন করুন</option>
										{warehouses.map((w) => (
											<option key={w.id} value={w.id}>
												{w.name}
											</option>
										))}
									</select>
								</div>

								{/* Transport Mode — full width, matches purchase */}
								<div className="md:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-4">
									<div
										className={
											transportMode === "sellerIncluded"
												? "md:col-span-4"
												: "md:col-span-3"
										}
									>
										<label className="block text-sm mb-1">Transport Mode</label>
										<div className="flex rounded-lg border overflow-hidden">
											{(
												[
													"sellerIncluded",
													"marketTruck",
													"ownTruck",
												] as TransportMode[]
											).map((mode) => (
												<button
													key={mode}
													type="button"
													className={`flex-1 px-3 py-2 text-sm ${transportMode === mode ? "bg-brand text-white" : "bg-white"}`}
													onClick={() => setTransportMode(mode)}
												>
													{mode === "sellerIncluded"
														? "Seller Included"
														: mode === "marketTruck"
															? "Market Truck"
															: "Own Truck"}
												</button>
											))}
										</div>
										<p className="text-xs text-slate-500 mt-1">
											Own Truck হলে Driver Trip অটো তৈরি হবে।
										</p>
									</div>
									{transportMode !== "sellerIncluded" && (
										<Input
											label="Transport (৳)"
											value={transport}
											onChange={setTransport}
											placeholder="যেমন: 18000"
										/>
									)}
								</div>

								{/* Bag Mode */}
								<div className="md:col-span-4">
									<label className="block text-sm mb-1">Bag Mode</label>
									<div className="flex rounded-lg border overflow-hidden">
										{[
											{ key: "paid", label: "বস্তার দাম দিলাম" },
											{ key: "self", label: "আমার বস্তা" },
											{ key: "mixed", label: "মিশ্র" },
										].map(({ key, label }) => (
											<button
												key={key}
												type="button"
												className={`flex-1 px-3 py-2 text-sm ${bagCostMode === key ? "bg-brand text-white" : "bg-white"}`}
												onClick={() =>
													setBagCostMode(key as "paid" | "self" | "mixed")
												}
											>
												{label}
											</button>
										))}
									</div>
								</div>

								{bagCostMode !== "self" && (
									<Input
										label="Bag Price (৳/বস্তা)"
										value={bagCostPerBag}
										onChange={setBagCostPerBag}
										placeholder="যেমন: 25"
									/>
								)}
								{bagCostMode === "mixed" && (
									<Input
										label="Paid Bags"
										value={paidBagCount}
										onChange={setPaidBagCount}
										placeholder={`যেমন: ${Math.ceil(totalBosta) || 10}`}
									/>
								)}
								<Input
									label="Loading/Unloading"
									value={loadingUnloading}
									onChange={setLoadingUnloading}
									placeholder="যেমন: 3000"
								/>
								<Input
									label="Misc"
									value={misc}
									onChange={setMisc}
									placeholder="যেমন: 500"
								/>
							</div>

							{/* Own Truck Driver Info — identical to purchase page */}
							{transportMode === "ownTruck" && (
								<div className="mt-4 border-t pt-4 space-y-4">
									{driverMode === "select" ? (
										<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
											<div>
												<label className="block text-sm mb-1">
													Select Driver
												</label>
												<select
													className="input"
													value={driverId}
													onChange={(e) =>
														onExistingDriverChange(e.target.value)
													}
												>
													<option value="">একজন ড্রাইভার নির্বাচন করুন</option>
													{drivers.map((d) => (
														<option key={d.id} value={d.id}>
															{d.name} ({d.id})
														</option>
													))}
												</select>
											</div>
											<div>
												<label className="block text-sm mb-1">
													Driver Name
												</label>
												<input
													className="input"
													value={driverName}
													readOnly
													placeholder="Auto from driver"
												/>
											</div>
											<div>
												<label className="block text-sm mb-1">Truck No</label>
												<input
													className="input"
													value={truckNo}
													readOnly
													placeholder="Auto from driver"
												/>
											</div>
											<div>
												<label className="block text-sm mb-1">Route</label>
												<input
													className="input"
													value={route}
													onChange={(e) => setRoute(e.target.value)}
													placeholder="যেমন: Naogaon → Dhaka"
												/>
											</div>
										</div>
									) : (
										<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
											<Input
												label="Driver ID"
												value={driverId}
												onChange={setDriverId}
												placeholder="যেমন: D-1001"
											/>
											<Input
												label="Driver Name"
												value={driverName}
												onChange={setDriverName}
												placeholder="যেমন: Ali Hossain"
											/>
											<Input
												label="Truck No"
												value={truckNo}
												onChange={setTruckNo}
												placeholder="যেমন: DHA-11-1234"
											/>
											<Input
												label="Route"
												value={route}
												onChange={setRoute}
												placeholder="যেমন: Naogaon → Dhaka"
											/>
										</div>
									)}
								</div>
							)}

							{/* Remarks */}
							<div className="mt-4">
								<Input
									label="মন্তব্য"
									value={remarks}
									onChange={setRemarks}
									placeholder="ঐচ্ছিক"
								/>
							</div>

							<div className="flex items-center justify-between mt-4">
								<button className="btn btn-ghost" onClick={() => setStep(1)}>
									← Back
								</button>
								<div className="flex gap-2">
									<button
										className="btn btn-primary"
										onClick={createPurchaseOrder}
										disabled={
											loading || !canFinalize() || !warehouseId || !seller
										}
									>
										{loading ? "Finalizing..." : "Finalize & Create PO"}
									</button>
								</div>
							</div>
						</section>
					)}
				</div>

				{/* Sidebar — same sticky card pattern as purchase page */}
				<aside className="card h-max sticky top-6">
					<h3 className="text-lg font-semibold mb-3">সারাংশ</h3>
					<ul className="text-sm space-y-2">
						<li className="flex justify-between">
							<span>ড্রাফট সংখ্যা</span>
							<b>{drafts.length}</b>
						</li>
						<li className="flex justify-between">
							<span>মোট মন</span>
							<b>{totalMon.toFixed(2)}</b>
						</li>
						<li className="flex justify-between">
							<span>মোট কেজি</span>
							<b>{totalKg.toFixed(0)}</b>
						</li>
						<li className="flex justify-between">
							<span>মোট দর</span>
							<b>{totalPrice.toFixed(2)}</b>
						</li>
						<li className="flex justify-between">
							<span>গড় দর (প্রতি মন)</span>
							<b>{avgPricePerMon.toFixed(2)}</b>
						</li>
						<li className="flex justify-between">
							<span>পরিশোধিত</span>
							<b>{totalPaid.toFixed(2)}</b>
						</li>
						<li className="flex justify-between">
							<span>বাকি</span>
							<b>{totalDue.toFixed(2)}</b>
						</li>
					</ul>

					{/* Bosta calculation */}
					<div className="mt-4 border-t pt-3">
						<div className="text-xs font-semibold mb-2">বস্তা হিসাব</div>
						<div>
							<label className="block text-sm mb-1">
								প্রতি বস্তায় কেজি (kg/বস্তা)
							</label>
							<input
								className="input w-full"
								type="number"
								min="1"
								value={kgPerBosta > 0 ? kgPerBosta : ""}
								onChange={(e) => setKgPerBosta(Number(e.target.value))}
								placeholder="প্রতি বস্তার ওজন (কেজি)"
							/>
						</div>
						<div className="mt-2 text-sm flex justify-between">
							<span>মোট বস্তা</span>
							<b>{kgPerBosta > 0 ? Math.ceil(totalBosta) : "-"}</b>
						</div>
						{hasPartialBosta && lastBostaKg > 0 && (
							<div className="text-xs text-orange-600 mt-1">
								শেষ বস্তায় {lastBostaKg} কেজি থাকবে
							</div>
						)}
					</div>

					<div className="mt-3 text-xs text-slate-500">
						ড্রাফট ফাইনালাইজ করলে সবগুলো একত্রে PO তে রূপান্তরিত হবে।
					</div>
				</aside>
			</div>

			{/* Edit Draft Modal — unchanged logic, cleaner layout */}
			{editDraft && (
				<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-xl w-full max-w-md">
						<div className="flex items-center justify-between border-b px-4 py-3">
							<h3 className="text-base font-semibold">ড্রাফট এডিট করুন</h3>
							<button
								className="btn btn-ghost btn-sm"
								onClick={() => setEditDraft(null)}
							>
								Close
							</button>
						</div>
						<div className="p-4">
							<form
								onSubmit={async (e) => {
									e.preventDefault();
									setEditLoading(true);
									try {
										await updateRetailPurchaseDraft(editDraft.id, {
											productId: editDraft.productId,
											productName: editDraft.productName,
											productCategory: editDraft.productCategory,
											mon: Number(editDraft.mon),
											price: Number(editDraft.price),
											paidAmount: Number(editDraft.paidAmount),
											dueAmount: Number(editDraft.dueAmount),
											notes: editDraft.notes,
										});
										setEditDraft(null);
										loadDrafts();
									} catch (err: any) {
										showError("Failed to update draft", err.message);
									} finally {
										setEditLoading(false);
									}
								}}
							>
								<div className="flex flex-col gap-3">
									<div>
										<label className="block text-sm mb-1">প্রোডাক্ট</label>
										<select
											className="input w-full"
											value={editDraft.productId ?? ""}
											onChange={(e) => {
												const pid = e.target.value;
												const p = products.find((pr) => pr.id === pid);
												setEditDraft((d: any) => ({
													...d,
													productId: pid,
													productName: p?.name || "",
													productCategory: p?.category || "",
												}));
											}}
											required
										>
											<option value="">প্রোডাক্ট নির্বাচন করুন</option>
											{products.map((p) => (
												<option key={p.id} value={p.id}>
													{p.name}
												</option>
											))}
										</select>
									</div>
									<div className="grid grid-cols-2 gap-3">
										{[
											{ label: "মন", key: "mon" },
											{ label: "দর", key: "price" },
											{ label: "পরিশোধিত", key: "paidAmount" },
											{ label: "বাকি", key: "dueAmount" },
										].map(({ label, key }) => (
											<div key={key}>
												<label className="block text-sm mb-1">{label}</label>
												<input
													className="input w-full"
													type="number"
													value={editDraft[key]}
													onChange={(e) =>
														setEditDraft((d: any) => ({
															...d,
															[key]: e.target.value,
														}))
													}
												/>
											</div>
										))}
									</div>
									<div>
										<label className="block text-sm mb-1">নোট</label>
										<input
											className="input w-full"
											value={editDraft.notes || ""}
											onChange={(e) =>
												setEditDraft((d: any) => ({
													...d,
													notes: e.target.value,
												}))
											}
										/>
									</div>
								</div>
								<div className="flex justify-end gap-2 mt-4">
									<button
										type="button"
										className="btn btn-ghost"
										onClick={() => setEditDraft(null)}
									>
										Cancel
									</button>
									<button
										type="submit"
										className="btn btn-primary"
										disabled={editLoading}
									>
										{editLoading ? "Saving..." : "Save"}
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function StepIndicator({
	n,
	label,
	step,
}: {
	n: number;
	label: string;
	step: number;
}) {
	return (
		<div className="flex items-center gap-2">
			<span
				className={`h-7 w-7 grid place-items-center rounded-full border ${step >= n ? "border-brand bg-brand text-white" : "border-slate-300 text-slate-600"}`}
			>
				{n}
			</span>
			<span
				className={`text-sm ${step >= n ? "text-brand font-medium" : "text-slate-500"}`}
			>
				{label}
			</span>
		</div>
	);
}

function Input({
	label,
	value,
	onChange,
	placeholder,
	disabled,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	disabled?: boolean;
}) {
	return (
		<div>
			<label className="block text-sm mb-1">{label}</label>
			<input
				className="input"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				disabled={disabled}
			/>
		</div>
	);
}
