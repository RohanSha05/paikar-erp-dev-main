"use client";
import { useEffect, useState, useMemo } from "react";
import SellerPicker from "@/components/SellerPicker";
import { getSellers, createSeller } from "@/lib/api/masters";
import { showSuccess, showError } from "@/lib/swal";
import { useRouter } from "next/navigation";
import { createRetailPurchaseDraft } from "@/lib/api/retailPurchaseDraft";
import { getProducts, ProductDto } from "@/lib/api/products";

type RetailDraftItem = {
	id: string;
	productId: string;
	productName: string;
	productCategory: string;
	mon: string;
	price: string;
	notes: string;
};

const PRODUCT_CATEGORIES = [
	{ value: "ধান", label: "ধান" },
	{ value: "চাল", label: "চাল" },
	{ value: "গম", label: "গম" },
	{ value: "ভুট্টা", label: "ভুট্টা" },
	{ value: "সরিষা", label: "সরিষা" },
	{ value: "অন্যান্য", label: "অন্যান্য" },
];

export default function RetailPurchaseDraftNewPage() {
	const router = useRouter();
	const [step, setStep] = useState(1);
	const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [seller, setSeller] = useState<any>(null);
	const [market, setMarket] = useState("");
	const [district, setDistrict] = useState("");

	const [items, setItems] = useState<RetailDraftItem[]>([
		{
			id: "item-1",
			productId: "",
			productName: "",
			productCategory: "",
			mon: "",
			price: "",
			notes: "",
		},
	]);
	const [products, setProducts] = useState<ProductDto[]>([]);

	const [paidAmount, setPaidAmount] = useState("");
	const [dueAmount, setDueAmount] = useState("0");
	const [isDue, setIsDue] = useState(false);
	const [sellerName, setSellerName] = useState("");
	const [sellerAddress, setSellerAddress] = useState("");
	const [sellerPhone, setSellerPhone] = useState("");

	const [calculatingDueSeller, setCalculatingDueSeller] = useState(false);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		getProducts().then(setProducts);
	}, []);

	// Derived totals
	const totalPrice = useMemo(
		() =>
			items.reduce(
				(sum, it) =>
					sum + (parseFloat(it.mon) || 0) * (parseFloat(it.price) || 0),
				0,
			),
		[items],
	);
	useEffect(() => {
		const paid = parseFloat(paidAmount) || 0;
		const due = Math.max(totalPrice - paid, 0);

		setDueAmount(due.toFixed(2));
	}, [paidAmount, totalPrice]);
	const totalMon = useMemo(
		() => items.reduce((sum, it) => sum + (parseFloat(it.mon) || 0), 0),
		[items],
	);

	function updateItem(idx: number, patch: Partial<RetailDraftItem>) {
		setItems((prev) =>
			prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
		);
	}
	function addItem() {
		setItems((prev) => [
			...prev,
			{
				id: `item-${Date.now()}`,
				productId: "",
				productName: "",
				productCategory: "",
				mon: "",
				price: "",
				notes: "",
			},
		]);
	}
	function removeItem(idx: number) {
		setItems((prev) =>
			prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx),
		);
	}

	function getFilteredProducts(category: string) {
		if (!category) return products;
		return products.filter((p) => p.category === category);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		try {
			for (const it of items) {
				await createRetailPurchaseDraft({
					date,
					sellerId: seller?.id,
					market,
					mon: parseFloat(it.mon) || 0,
					price: parseFloat(it.price) || 0,
					notes: it.notes,
					paidAmount: parseFloat(paidAmount) || 0,
					dueAmount: parseFloat(dueAmount) || 0,
					isDue,
					sellerName: isDue ? sellerName : undefined,
					sellerAddress: isDue ? sellerAddress : undefined,
					sellerPhone: isDue ? sellerPhone : undefined,
					sellerDistrict: isDue ? district : undefined,
					sellerMarket: isDue ? market : undefined,
					productId: it.productId,
					productName: it.productName,
					productCategory: it.productCategory,
				});
			}
			await showSuccess("ড্রাফট সফলভাবে সংরক্ষণ হয়েছে!");
			router.push("/purchase/retail/drafts");
		} catch (e: any) {
			showError("সংরক্ষণ ব্যর্থ হয়েছে", e.message || "Failed to save draft");
		} finally {
			setLoading(false);
		}
	}

	async function goToStep4() {
		if (isDue && sellerName.trim()) {
			setCalculatingDueSeller(true);
			try {
				let sellers = await getSellers();
				let found = sellers.find((s) => s.name === sellerName.trim());
				if (!found) {
					found = await createSeller({
						name: sellerName.trim(),
						district: sellerAddress.trim() || undefined,
						phone: sellerPhone.trim() || undefined,
					});
				}
				setSeller(found);
			} catch {
				// continue anyway
			} finally {
				setCalculatingDueSeller(false);
				setStep(4);
			}
		} else {
			setStep(4);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			{/* Header — matches purchase page */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold">নতুন খুচরা ক্রয় ড্রাফট</h2>
					<p className="text-xs text-slate-500">
						বাজার থেকে বিক্রেতার কাছ থেকে খুচরা ক্রয়ের তথ্য লিপিবদ্ধ করুন।
					</p>
				</div>
				<div className="flex gap-2">
					{step > 1 && (
						<button
							type="button"
							className="btn btn-ghost"
							onClick={() => setStep((s) => s - 1)}
						>
							← Back
						</button>
					)}
					{step < 4 ? (
						<button
							type="button"
							className="btn btn-primary"
							onClick={() => (step === 3 ? goToStep4() : setStep((s) => s + 1))}
							disabled={calculatingDueSeller}
						>
							{calculatingDueSeller ? "Checking..." : "Next →"}
						</button>
					) : (
						<button
							type="submit"
							className="btn btn-primary"
							disabled={loading}
						>
							{loading ? "Saving..." : "Save Drafts"}
						</button>
					)}
				</div>
			</div>

			{/* Stepper — identical to purchase page */}
			<div className="card">
				<div className="flex items-center gap-6 text-sm">
					<StepIndicator n={1} label="সেলার / তারিখ" step={step} />
					<StepIndicator n={2} label="প্রোডাক্ট" step={step} />
					<StepIndicator n={3} label="পেমেন্ট" step={step} />
					<StepIndicator n={4} label="রিভিউ" step={step} />
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{/* Main form — 2 cols */}
				<div className="lg:col-span-2 flex flex-col gap-4">
					{/* STEP 1 — Seller / Date */}
					{step === 1 && (
						<section className="card">
							<h3 className="text-lg font-semibold mb-3">সেলার ও তারিখ</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm mb-1">তারিখ</label>
									<input
										type="date"
										className="input w-full"
										value={date}
										onChange={(e) => setDate(e.target.value)}
										required
									/>
								</div>
								<div className="md:col-span-2">
									<label className="block text-sm mb-1">বিক্রেতা</label>
									<SellerPicker
										value={seller}
										onChange={setSeller}
										hideAddNew
									/>
								</div>
								<div>
									<label className="block text-sm mb-1">বাজার</label>
									<input
										className="input w-full"
										value={market}
										onChange={(e) => setMarket(e.target.value)}
										placeholder="যেমন: মান্দা বাজার"
									/>
								</div>
								<div>
									<label className="block text-sm mb-1">জেলা</label>
									<input
										className="input w-full"
										value={district}
										onChange={(e) => setDistrict(e.target.value)}
										placeholder="যেমন: নওগাঁ"
									/>
								</div>
							</div>
							<div className="flex justify-end mt-4">
								<button
									type="button"
									className="btn btn-primary"
									onClick={() => setStep(2)}
								>
									Next →
								</button>
							</div>
						</section>
					)}

					{/* STEP 2 — Products, matches purchase Step 2 layout */}
					{step === 2 && (
						<section className="card">
							<h3 className="text-lg font-semibold mb-3">
								প্রোডাক্ট + মন / দর
							</h3>
							<div className="overflow-x-auto">
								<table className="min-w-full text-sm">
									<thead>
										<tr className="text-left text-slate-600">
											<th className="py-2 px-2">ক্যাটাগরি</th>
											<th className="py-2 px-2">প্রোডাক্ট</th>
											<th className="py-2 px-2 w-[90px]">মন</th>
											<th className="py-2 px-2 w-[100px]">দর (৳/মন)</th>
											<th className="py-2 px-2">নোট</th>
											<th className="py-2 px-2 w-[40px]"></th>
										</tr>
									</thead>
									<tbody>
										{items.map((it, idx) => (
											<tr key={it.id} className="border-t align-top">
												{/* Category */}
												<td className="py-2 px-2 min-w-[140px]">
													<select
														className="input h-9 text-xs w-full"
														value={it.productCategory}
														onChange={(e) =>
															updateItem(idx, {
																productCategory: e.target.value,
																productId: "",
																productName: "",
															})
														}
													>
														<option value="">সব</option>
														{PRODUCT_CATEGORIES.map((c) => (
															<option key={c.value} value={c.value}>
																{c.label}
															</option>
														))}
													</select>
												</td>
												{/* Product */}
												<td className="py-2 px-2 min-w-[180px]">
													<select
														className="input h-9 text-xs w-full"
														value={it.productId}
														onChange={(e) => {
															const pid = e.target.value;
															const p = products.find((pr) => pr.id === pid);
															updateItem(idx, {
																productId: pid,
																productName: p?.name || "",
																productCategory:
																	p?.category || it.productCategory,
															});
														}}
														required
													>
														<option value="">প্রোডাক্ট নির্বাচন করুন</option>
														{getFilteredProducts(it.productCategory).map(
															(p) => (
																<option key={p.id} value={p.id}>
																	{p.name}
																</option>
															),
														)}
													</select>
												</td>
												{/* Mon */}
												<td className="py-2 px-2">
													<input
														className="input h-9 text-right w-full"
														type="number"
														value={it.mon}
														onChange={(e) =>
															updateItem(idx, { mon: e.target.value })
														}
														placeholder="0"
														required
													/>
												</td>
												{/* Price */}
												<td className="py-2 px-2">
													<input
														className="input h-9 text-right w-full"
														type="number"
														value={it.price}
														onChange={(e) =>
															updateItem(idx, { price: e.target.value })
														}
														placeholder="0"
														required
													/>
												</td>
												{/* Notes */}
												<td className="py-2 px-2 min-w-[120px]">
													<input
														className="input h-9 w-full"
														value={it.notes}
														onChange={(e) =>
															updateItem(idx, { notes: e.target.value })
														}
														placeholder="ঐচ্ছিক"
													/>
												</td>
												{/* Remove */}
												<td className="py-2 px-2 text-center pt-3">
													{items.length > 1 && (
														<button
															type="button"
															className="text-red-500 hover:text-red-700 text-lg leading-none"
															onClick={() => removeItem(idx)}
														>
															✕
														</button>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							<div className="flex justify-between items-center mt-3">
								<button
									type="button"
									className="btn btn-ghost btn-sm"
									onClick={addItem}
								>
									+ Add Product
								</button>
								<div className="text-xs text-slate-600">
									Total: <b>{totalMon.toFixed(2)} মন</b> •{" "}
									<b>৳ {totalPrice.toFixed(2)}</b>
								</div>
							</div>

							<div className="flex items-center justify-between mt-4">
								<button
									type="button"
									className="btn btn-ghost"
									onClick={() => setStep(1)}
								>
									← Back
								</button>
								<button
									type="button"
									className="btn btn-primary"
									onClick={() => setStep(3)}
								>
									Next →
								</button>
							</div>
						</section>
					)}

					{/* STEP 3 — Payment */}
					{step === 3 && (
						<section className="card">
							<h3 className="text-lg font-semibold mb-3">পেমেন্ট</h3>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Total (read-only) */}
								<div>
									<label className="block text-sm mb-1">মোট মূল্য</label>
									<div className="input bg-slate-50 font-medium">
										৳ {totalPrice.toFixed(2)}
									</div>
								</div>

								{/* Paid */}
								<div>
									<label className="block text-sm mb-1">পরিশোধিত (৳)</label>
									<input
										type="number"
										className="input w-full"
										value={paidAmount}
										onChange={(e) => {
											const paid = e.target.value;

											setPaidAmount(paid);

											const paidNumber = parseFloat(paid) || 0;
											const due = Math.max(totalPrice - paidNumber, 0);

											setDueAmount(due.toFixed(2));
										}}
										placeholder="0"
									/>
								</div>
							</div>

							{/* Due toggle */}
							<div className="mt-4">
								<label className="block text-sm mb-2">বাকি আছে?</label>
								<div className="flex rounded-lg border overflow-hidden w-fit">
									<button
										type="button"
										className={`px-4 py-2 text-sm ${!isDue ? "bg-brand text-white" : "bg-white"}`}
										onClick={() => setIsDue(false)}
									>
										না
									</button>
									<button
										type="button"
										className={`px-4 py-2 text-sm ${isDue ? "bg-brand text-white" : "bg-white"}`}
										onClick={() => setIsDue(true)}
									>
										হ্যাঁ, বাকি আছে
									</button>
								</div>
							</div>

							{/* Due details */}
							{isDue && (
								<div className="mt-4 border rounded-lg p-4 bg-slate-50 flex flex-col gap-3">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										<div>
											<label className="block text-sm mb-1">
												বাকি পরিমাণ (৳)
											</label>
											<input
												type="number"
												className="input w-full bg-slate-50"
												value={dueAmount}
												onChange={(e) => setDueAmount(e.target.value)}
												placeholder="0"
												required={isDue}
											/>
										</div>
									</div>
									<div className="text-xs font-medium text-slate-600 mt-1">
										বাকি বিক্রেতার তথ্য
									</div>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										<div>
											<label className="block text-sm mb-1">
												বিক্রেতার নাম
											</label>
											<input
												className="input w-full"
												value={sellerName}
												onChange={(e) => setSellerName(e.target.value)}
												required={isDue}
												placeholder="পূর্ণ নাম"
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">ফোন নম্বর</label>
											<input
												className="input w-full"
												value={sellerPhone}
												onChange={(e) => setSellerPhone(e.target.value)}
												placeholder="01XXXXXXXXX"
											/>
										</div>
										<div className="md:col-span-2">
											<label className="block text-sm mb-1">ঠিকানা</label>
											<input
												className="input w-full"
												value={sellerAddress}
												onChange={(e) => setSellerAddress(e.target.value)}
												placeholder="গ্রাম, উপজেলা"
											/>
										</div>
									</div>
								</div>
							)}

							<div className="flex items-center justify-between mt-4">
								<button
									type="button"
									className="btn btn-ghost"
									onClick={() => setStep(2)}
								>
									← Back
								</button>
								<button
									type="button"
									className="btn btn-primary"
									onClick={goToStep4}
									disabled={calculatingDueSeller}
								>
									{calculatingDueSeller ? "Checking seller..." : "Next →"}
								</button>
							</div>
						</section>
					)}

					{/* STEP 4 — Review */}
					{step === 4 && (
						<section className="card">
							<h3 className="text-lg font-semibold mb-3">রিভিউ ও সংরক্ষণ</h3>

							{/* Meta */}
							<div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
								{[
									{ label: "তারিখ", value: date || "-" },
									{ label: "বিক্রেতা", value: seller?.name || "-" },
									{ label: "বাজার", value: market || "-" },
									{ label: "জেলা", value: district || "-" },
								].map(({ label, value }) => (
									<div
										key={label}
										className="rounded-lg border p-3 bg-slate-50"
									>
										<div className="text-xs text-slate-500 mb-1">{label}</div>
										<div className="font-medium">{value}</div>
									</div>
								))}
							</div>

							{/* Products table */}
							<div className="overflow-x-auto mb-4">
								<table className="min-w-full text-sm">
									<thead>
										<tr className="text-left text-slate-600">
											<th className="py-2 px-3">প্রোডাক্ট</th>
											<th className="py-2 px-3">ক্যাটাগরি</th>
											<th className="py-2 px-3 text-right">মন</th>
											<th className="py-2 px-3 text-right">দর</th>
											<th className="py-2 px-3 text-right">মোট</th>
											<th className="py-2 px-3">নোট</th>
										</tr>
									</thead>
									<tbody>
										{items.map((it, idx) => (
											<tr key={it.id} className="border-t">
												<td className="py-2 px-3">{it.productName || "-"}</td>
												<td className="py-2 px-3">
													{it.productCategory || "-"}
												</td>
												<td className="py-2 px-3 text-right">{it.mon || 0}</td>
												<td className="py-2 px-3 text-right">
													{it.price || 0}
												</td>
												<td className="py-2 px-3 text-right font-medium">
													{(
														(parseFloat(it.mon) || 0) *
														(parseFloat(it.price) || 0)
													).toFixed(2)}
												</td>
												<td className="py-2 px-3 text-slate-500">
													{it.notes || "-"}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Payment summary */}
							<div className="rounded-lg border p-4 bg-slate-50 text-sm space-y-2">
								<div className="flex justify-between">
									<span>মোট মূল্য</span>
									<b>৳ {totalPrice.toFixed(2)}</b>
								</div>
								<div className="flex justify-between">
									<span>পরিশোধিত</span>
									<b>৳ {parseFloat(paidAmount || "0").toFixed(2)}</b>
								</div>
								{isDue && (
									<>
										<div className="flex justify-between text-orange-700">
											<span>বাকি</span>
											<b>৳ {parseFloat(dueAmount || "0").toFixed(2)}</b>
										</div>
										<div className="text-xs text-slate-500 pt-1 border-t">
											বাকি বিক্রেতা: {sellerName} • {sellerPhone} •{" "}
											{sellerAddress}
										</div>
									</>
								)}
							</div>

							<div className="flex items-center justify-between mt-4">
								<button
									type="button"
									className="btn btn-ghost"
									onClick={() => setStep(3)}
								>
									← Back
								</button>
								<button
									type="submit"
									className="btn btn-primary"
									disabled={loading}
								>
									{loading ? "Saving..." : "Save Drafts"}
								</button>
							</div>
						</section>
					)}
				</div>

				{/* Sidebar summary — same sticky pattern as purchase page */}
				<aside className="card h-max sticky top-6">
					<h3 className="text-lg font-semibold mb-3">সারাংশ</h3>
					<ul className="text-sm space-y-2">
						<li className="flex justify-between">
							<span>তারিখ</span>
							<b>{date || "-"}</b>
						</li>
						<li className="flex justify-between">
							<span>বিক্রেতা</span>
							<b>{seller?.name || "-"}</b>
						</li>
						<li className="flex justify-between">
							<span>বাজার</span>
							<b>{market || "-"}</b>
						</li>
					</ul>

					{items.some((it) => it.productName) && (
						<div className="mt-3 border-t pt-3">
							<div className="text-xs font-semibold mb-2">প্রোডাক্টসমূহ</div>
							<ul className="text-xs space-y-1">
								{items.map((it, idx) =>
									it.productName ? (
										<li key={idx} className="flex justify-between">
											<span>{it.productName}</span>
											<span>
												{it.mon || 0} মন @ ৳{it.price || 0}
											</span>
										</li>
									) : null,
								)}
							</ul>
						</div>
					)}

					<div className="mt-3 border-t pt-3 text-sm space-y-2">
						<div className="flex justify-between">
							<span>মোট মন</span>
							<b>{totalMon.toFixed(2)}</b>
						</div>
						<div className="flex justify-between">
							<span>মোট কেজি</span>
							<b>{(totalMon * 40).toFixed(0)}</b>
						</div>
						<div className="flex justify-between border-t pt-2">
							<span>মোট মূল্য</span>
							<b>৳ {totalPrice.toFixed(2)}</b>
						</div>
						<div className="flex justify-between">
							<span>পরিশোধিত</span>
							<b>৳ {parseFloat(paidAmount || "0").toFixed(2)}</b>
						</div>
						{isDue && (
							<div className="flex justify-between text-orange-700">
								<span>বাকি</span>
								<b>৳ {parseFloat(dueAmount || "0").toFixed(2)}</b>
							</div>
						)}
					</div>
				</aside>
			</div>
		</form>
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
