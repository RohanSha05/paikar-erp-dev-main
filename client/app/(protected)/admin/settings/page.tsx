'use client';

import { useEffect, useState } from 'react';
import { loadSettings, saveSettings, type AppSettings } from '@/lib/admin';
import {
	getBusinessInfo,
	createOrUpdateBusinessInfo,
	deleteBusinessInfo,
	type BusinessInfoDto,
} from "@/lib/api/businessInfo";
import { getCurrentUserRole } from "@/lib/auth";
import { setLocale, t } from "@/lib/i18n";
import { showSuccess, showError, showConfirm } from "@/lib/swal";

export default function SettingsPage() {
	const [s, setS] = useState<AppSettings | null>(null);
	const [currentRole] = useState<string>(() => getCurrentUserRole());
	const [businessInfo, setBusinessInfo] = useState<BusinessInfoDto | null>(
		null,
	);
	const [businessInfoLoading, setBusinessInfoLoading] = useState(false);
	const isAdmin = currentRole === "ADMIN";

	useEffect(() => {
		setS(loadSettings());
		loadBusinessInfo();
	}, []);

	async function loadBusinessInfo() {
		try {
			setBusinessInfoLoading(true);
			const info = await getBusinessInfo();
			// Initialize with default empty values to ensure all fields exist
			setBusinessInfo(
				info || {
					id: "",
					businessName: "",
					proprietorName: "",
					additionalProprietor: "",
					address: "",
					phone1: "",
					phone2: "",
					operationPass: "",
				},
			);
		} catch (err) {
			showError("Failed to load business info");
		} finally {
			setBusinessInfoLoading(false);
		}
	}

	async function onSave() {
		if (!s) return;
		saveSettings(s);
		// language switch reflect immediately
		setLocale(s.defaultLocale);
		await showSuccess("Settings saved");
	}

	async function onSaveBusinessInfo() {
		if (!businessInfo) return;
		try {
			// Prepare data without the id field (API handles it)
			const { id, createdAt, updatedAt, ...dataToSend } = businessInfo;
			await createOrUpdateBusinessInfo(dataToSend as any);
			await showSuccess("Business info saved");
			// Reload to get the latest data
			await loadBusinessInfo();
		} catch (err) {
			console.error("Save error:", err);
			showError("Failed to save business info");
		}
	}

	async function onDeleteBusinessInfo() {
		if (!businessInfo?.id) return;
		const result = await showConfirm(
			"Delete Business Info?",
			"This action cannot be undone.",
		);
		if (!result.isConfirmed) return;
		try {
			await deleteBusinessInfo(businessInfo.id);
			setBusinessInfo(null);
			await showSuccess("Business info deleted");
		} catch (err) {
			showError("Failed to delete business info");
		}
	}

	if (!s) return null;

	return (
		<div className="flex flex-col gap-6">
			<h1 className="text-2xl font-semibold">
				{t("menu.settings") || "Settings"}
			</h1>

			{/* Business Information Section */}
			<div className="card p-4">
				<h2 className="text-lg font-semibold mb-3">Business Information</h2>
				{businessInfoLoading ? (
					<div className="text-sm text-slate-500">Loading...</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div>
							<div className="text-xs mb-1">Business Name</div>
							<input
								className="input w-full"
								value={businessInfo?.businessName || ""}
								disabled={!isAdmin}
								onChange={(e) =>
									setBusinessInfo({
										...businessInfo,
										businessName: e.target.value,
									} as any)
								}
								placeholder="Enter business name"
							/>
						</div>
						<div>
							<div className="text-xs mb-1">Proprietor Name</div>
							<input
								className="input w-full"
								value={businessInfo?.proprietorName || ""}
								disabled={!isAdmin}
								onChange={(e) =>
									setBusinessInfo({
										...businessInfo,
										proprietorName: e.target.value,
									} as any)
								}
								placeholder="Enter proprietor name"
							/>
						</div>
						<div>
							<div className="text-xs mb-1">Additional Proprietor</div>
							<input
								className="input w-full"
								value={businessInfo?.additionalProprietor || ""}
								disabled={!isAdmin}
								onChange={(e) =>
									setBusinessInfo({
										...businessInfo,
										additionalProprietor: e.target.value,
									} as any)
								}
								placeholder="Optional"
							/>
						</div>
						<div>
							<div className="text-xs mb-1">Address</div>
							<input
								className="input w-full"
								value={businessInfo?.address || ""}
								disabled={!isAdmin}
								onChange={(e) =>
									setBusinessInfo({
										...businessInfo,
										address: e.target.value,
									} as any)
								}
								placeholder="Enter address"
							/>
						</div>
						<div>
							<div className="text-xs mb-1">Phone 1</div>
							<input
								className="input w-full"
								value={businessInfo?.phone1 || ""}
								disabled={!isAdmin}
								onChange={(e) =>
									setBusinessInfo({
										...businessInfo,
										phone1: e.target.value,
									} as any)
								}
								placeholder="Enter phone number"
							/>
						</div>
						<div>
							<div className="text-xs mb-1">Phone 2</div>
							<input
								className="input w-full"
								value={businessInfo?.phone2 || ""}
								disabled={!isAdmin}
								onChange={(e) =>
									setBusinessInfo({
										...businessInfo,
										phone2: e.target.value,
									} as any)
								}
								placeholder="Optional"
							/>
						</div>
						{isAdmin && (
							<div>
								<div className="text-xs mb-1">Operation Pass</div>
								<input
									type="password"
									className="input w-full"
									value={businessInfo?.operationPass || ""}
									onChange={(e) =>
										setBusinessInfo({
											...businessInfo,
											operationPass: e.target.value,
										} as any)
									}
									placeholder="Enter operation pass"
								/>
							</div>
						)}
					</div>
				)}

				<div className="mt-4">
					<button
						className="btn btn-primary"
						onClick={onSaveBusinessInfo}
						disabled={businessInfoLoading || !isAdmin}
					>
						{t("common.save") || "Save Business Info"}
					</button>
					{isAdmin && businessInfo?.id && (
						<button
							className="btn btn-ghost btn-sm ml-2 text-red-600"
							onClick={onDeleteBusinessInfo}
							disabled={businessInfoLoading}
						>
							Delete
						</button>
					)}
				</div>
			</div>
			{/* <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div>
						<div className="text-xs mb-1">Org Name</div>
						<input
							className="input w-full"
							value={s.orgName}
							onChange={(e) => setS({ ...s, orgName: e.target.value })}
						/>
					</div>
					<div>
						<div className="text-xs mb-1">Phone</div>
						<input
							className="input w-full"
							value={s.orgPhone || ""}
							onChange={(e) => setS({ ...s, orgPhone: e.target.value })}
						/>
					</div>
					<div className="md:col-span-1">
						<div className="text-xs mb-1">Default Language</div>
						<select
							className="input w-full"
							value={s.defaultLocale}
							onChange={(e) =>
								setS({ ...s, defaultLocale: e.target.value as any })
							}
						>
							<option value="bn">বাংলা</option>
							<option value="en">English</option>
						</select>
					</div>

					<div className="md:col-span-3">
						<div className="text-xs mb-1">Address</div>
						<input
							className="input w-full"
							value={s.orgAddress || ""}
							onChange={(e) => setS({ ...s, orgAddress: e.target.value })}
						/>
					</div>

					<div>
						<div className="text-xs mb-1">Number Format</div>
						<select
							className="input w-full"
							value={s.numberFormat}
							onChange={(e) =>
								setS({ ...s, numberFormat: e.target.value as any })
							}
						>
							<option value="bn">Bangla</option>
							<option value="en">English</option>
						</select>
					</div>

					<div>
						<div className="text-xs mb-1">Weight Policy (Default)</div>
						<select
							className="input w-full"
							value={s.weightPolicyDefault}
							onChange={(e) =>
								setS({ ...s, weightPolicyDefault: e.target.value as any })
							}
						>
							<option value="actual">Actual</option>
							<option value="accounting">Accounting</option>
						</select>
					</div>

					<div>
						<div className="text-xs mb-1">Rate Basis (Default)</div>
						<div className="flex gap-2">
							<select
								className="input"
								value={s.rateDefault.purchase}
								onChange={(e) =>
									setS({
										...s,
										rateDefault: {
											...s.rateDefault,
											purchase: e.target.value as any,
										},
									})
								}
							>
								<option value="perMon">Purchase: per মন</option>
								<option value="perKg">Purchase: per kg</option>
							</select>
							<select
								className="input"
								value={s.rateDefault.sales}
								onChange={(e) =>
									setS({
										...s,
										rateDefault: {
											...s.rateDefault,
											sales: e.target.value as any,
										},
									})
								}
							>
								<option value="perMon">Sales: per মন</option>
								<option value="perKg">Sales: per kg</option>
							</select>
						</div>
					</div>

					<div>
						<div className="text-xs mb-1">Stock Valuation</div>
						<select
							className="input w-full"
							value={s.stockValuation}
							onChange={(e) =>
								setS({ ...s, stockValuation: e.target.value as any })
							}
						>
							<option value="movingAvgLot">Lot-wise Moving Average</option>
							<option value="globalAvg">Global Average</option>
						</select>
					</div>

					<div>
						<div className="text-xs mb-1">Negative Stock</div>
						<select
							className="input w-full"
							value={s.negativeStock}
							onChange={(e) =>
								setS({ ...s, negativeStock: e.target.value as any })
							}
						>
							<option value="block">Block</option>
							<option value="allow">Allow</option>
						</select>
					</div>

					<div>
						<div className="text-xs mb-1">Day Close Required</div>
						<select
							className="input w-full"
							value={s.dayCloseRequired ? "yes" : "no"}
							onChange={(e) =>
								setS({ ...s, dayCloseRequired: e.target.value === "yes" })
							}
						>
							<option value="yes">Yes</option>
							<option value="no">No</option>
						</select>
					</div>

					<div>
						<div className="text-xs mb-1">Print Paper</div>
						<select
							className="input w-full"
							value={s.printPaper}
							onChange={(e) =>
								setS({ ...s, printPaper: e.target.value as any })
							}
						>
							<option value="A4">A4</option>
							<option value="THERMAL">Thermal</option>
						</select>
					</div>

					<div className="md:col-span-2">
						<div className="text-xs mb-1">Logo (PNG/JPG)</div>
						<input
							type="file"
							className="input w-full"
							accept="image/*"
							onChange={async (e) => {
								const f = e.target.files?.[0];
								if (!f) return;
								const b64 = await fileToDataURL(f);
								setS({ ...s, logoDataUrl: b64 });
							}}
						/>
						{s.logoDataUrl && (
							<img src={s.logoDataUrl} alt="logo" className="mt-2 h-10" />
						)}
					</div>
				</div>

				<div className="mt-4">
					<button className="btn btn-primary" onClick={onSave}>
						{t("common.save") || "Save"}
					</button>
				</div> */}
		</div>
	);
}

function fileToDataURL(file:File){
  return new Promise<string>((resolve,reject)=>{
    const r = new FileReader();
    r.onload = ()=> resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
