'use client';

import { useEffect, useMemo, useState } from "react";
import { getAccounts, getLedger, type AccountDto } from "@/lib/api/accounting";
import {
	getParties,
	listDraftVouchers,
	createDraftVoucher,
	updateDraftVoucher,
	deleteDraftVoucher,
	approveDraftVoucher,
	resolvePartyAccount,
	type CreatePartyInput,
	type PartyDto,
	type VoucherDto,
} from "@/lib/api/cashbook";
import { t, nf } from "@/lib/i18n";
import { showConfirm, showError, showSuccess } from "@/lib/swal";

type SettlementMode = "pay" | "receive";

const PARTY_TYPE_OPTIONS: CreatePartyInput["type"][] = [
	"seller",
	"customer",
	"driver",
	"investor",
];

const LOAN_PARTY_TYPE = "loan";

type SettlementDraft = {
	id: string;
	mode: SettlementMode;
	partyType: string;
	partyId: string;
	amount: number;
	instrumentId: string;
	memo: string;
	createdAt: string;
	updatedAt: string;
};

type SettlementOption = {
	id: string;
	name: string;
	type: string;
	accountId?: string;
	source: "party" | "account";
};

function buildSettlementRows(params: {
	mode: SettlementMode;
	partyAccountId: string;
	instrumentId: string;
	amount: number;
	memo: string;
}) {
	const memo = params.memo || undefined;

	return params.mode === "pay"
		? [
				{
					accountId: params.partyAccountId,
					dr: params.amount,
					cr: 0,
					memo,
				},
				{
					accountId: params.instrumentId,
					dr: 0,
					cr: params.amount,
					memo,
				},
			]
		: [
				{
					accountId: params.instrumentId,
					dr: params.amount,
					cr: 0,
					memo,
				},
				{
					accountId: params.partyAccountId,
					dr: 0,
					cr: params.amount,
					memo,
				},
			];
}

function buildSettlementNarration(params: {
	mode: SettlementMode;
	partyTypeLabel: string;
	partyName: string;
	memo?: string;
}) {
	const fixedNarration = `${params.partyTypeLabel} ${params.mode === "pay" ? "payment" : "receipt"} - ${params.partyName}`;
	const customNarration = params.memo?.trim();

	return customNarration
		? `${fixedNarration} - ${customNarration}`
		: fixedNarration;
}

function compactLabel(label: string, maxLength: number) {
	const trimmed = (label || "").trim();
	if (trimmed.length <= maxLength) return trimmed;
	return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export default function PartySettlementPage() {
	const [tab, setTab] = useState<SettlementMode>("pay");

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-semibold leading-tight">
					{t("menu.cashbook") || "Cashbook"} — Party Settlement
				</h1>
				<div className="btn-group w-full sm:w-auto">
					<button
						className={`btn w-1/2 sm:w-auto ${tab === "pay" ? "btn-primary" : ""}`}
						onClick={() => setTab("pay")}
					>
						Pay
					</button>
					<button
						className={`btn w-1/2 sm:w-auto ${tab === "receive" ? "btn-primary" : ""}`}
						onClick={() => setTab("receive")}
					>
						Receive
					</button>
				</div>
			</div>

			<SettlementForm mode={tab} />
		</div>
	);
}

function SettlementForm({ mode }: { mode: SettlementMode }) {
	const [partyType, setPartyType] = useState<string>("");
	const [partyId, setPartyId] = useState<string>("");
	const [parties, setParties] = useState<PartyDto[]>([]);
	const [loanAccounts, setLoanAccounts] = useState<AccountDto[]>([]);
	const [amount, setAmount] = useState<number>(0);
	const [accounts, setAccounts] = useState<AccountDto[]>([]);
	const [instrumentId, setInstrumentId] = useState("");
	const [memo, setMemo] = useState("");
	const [saving, setSaving] = useState(false);
	const [loadingParties, setLoadingParties] = useState(true);
	const [loadingLoanAccounts, setLoadingLoanAccounts] = useState(false);
	const [loadingAccounts, setLoadingAccounts] = useState(true);
	const [loadingDrafts, setLoadingDrafts] = useState(true);
	const [resolvedPartyAccountId, setResolvedPartyAccountId] =
		useState<string>("");
	const [showAddParty, setShowAddParty] = useState(false);
	const [balanceVersion, setBalanceVersion] = useState(0);
	const [drafts, setDrafts] = useState<SettlementDraft[]>([]);
	const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
	const [approvingDraftId, setApprovingDraftId] = useState<string | null>(null);
	const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
	const [newPartyType, setNewPartyType] =
		useState<CreatePartyInput["type"]>("seller");
	const [newPartyName, setNewPartyName] = useState("");
	const [addingParty, setAddingParty] = useState(false);
	const [balanceError, setBalanceError] = useState<string>("");
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const media = window.matchMedia("(max-width: 640px)");
		const update = () => setIsMobile(media.matches);
		update();
		media.addEventListener("change", update);
		return () => media.removeEventListener("change", update);
	}, []);

	useEffect(() => {
		getAccounts()
			.then((rows) => {
				setAccounts(rows);
				setInstrumentId(
					rows.find((a) => a.type === "cash")?.id ||
						rows.find((a) => a.type === "bank")?.id ||
						"",
				);
			})
			.finally(() => setLoadingAccounts(false));
	}, []);

	useEffect(() => {
		setLoadingParties(true);
		getParties()
			.then((rows) => {
				setParties(rows);
				const types = Array.from(
					new Set(rows.map((party) => party.type)),
				).sort();
				setPartyType((prev) => {
					if (prev) return prev;
					return mode === "pay" ? "seller" : "customer";
				});
			})
			.catch(() => setParties([]))
			.finally(() => setLoadingParties(false));
	}, []);

	useEffect(() => {
		if (mode !== "pay" || partyType !== LOAN_PARTY_TYPE) {
			setLoanAccounts([]);
			setLoadingLoanAccounts(false);
			return;
		}

		let mounted = true;
		setLoadingLoanAccounts(true);

		getAccounts("loan")
			.then((rows) => {
				if (!mounted) return;
				setLoanAccounts(rows || []);
			})
			.catch(() => {
				if (mounted) setLoanAccounts([]);
			})
			.finally(() => {
				if (mounted) setLoadingLoanAccounts(false);
			});

		return () => {
			mounted = false;
		};
	}, [mode, partyType]);

	const partyTypes = useMemo(() => {
		const merged = new Set<string>([
			...PARTY_TYPE_OPTIONS,
			...parties.map((party) => party.type),
		]);

		let filtered = Array.from(merged);

		if (mode === "pay") {
			// Pay → hide only customer
			filtered = filtered.filter((type) => type !== "customer");
			if (!filtered.includes(LOAN_PARTY_TYPE)) {
				filtered.push(LOAN_PARTY_TYPE);
			}
		} else {
			// Receive → hide only seller
			filtered = filtered.filter((type) => type !== "seller");
		}

		return filtered.sort((a, b) => {
			if (a === LOAN_PARTY_TYPE) return -1;
			if (b === LOAN_PARTY_TYPE) return 1;
			return a.localeCompare(b);
		});
	}, [parties, mode]);

	useEffect(() => {
		if (!partyTypes.includes(partyType)) {
			setPartyType(partyTypes[0] || "");
		}
	}, [partyTypes, partyType]);

	const filteredParties = useMemo(() => {
		if (!partyType) return parties;
		if (partyType === LOAN_PARTY_TYPE) {
			return loanAccounts;
		}
		return parties.filter((party) => party.type === partyType);
	}, [parties, partyType, loanAccounts]);

	const partyOptions = useMemo<SettlementOption[]>(() => {
		if (!partyType) return [];

		if (partyType === LOAN_PARTY_TYPE) {
			return loanAccounts.map((account) => ({
				id: account.id,
				name: account.name,
				type: LOAN_PARTY_TYPE,
				accountId: account.id,
				source: "account",
			}));
		}

		return parties
			.filter((party) => party.type === partyType)
			.map((party) => ({
				id: party.id,
				name: party.name,
				type: party.type,
				accountId: party.accountId,
				source: "party",
			}));
	}, [loanAccounts, parties, partyType]);

	const visibleDrafts = useMemo(
		() => drafts.filter((draft) => draft.mode === mode),
		[drafts, mode],
	);

	useEffect(() => {
		if (loadingParties || loadingAccounts) return;

		let mounted = true;
		setLoadingDrafts(true);

		async function loadDrafts() {
			try {
				const vouchers = await listDraftVouchers();
				if (!mounted) return;
				setDrafts(
					vouchers.map((voucher) =>
						mapVoucherToDraft(voucher, parties, accounts),
					),
				);
			} catch {
				if (mounted) setDrafts([]);
			} finally {
				if (mounted) setLoadingDrafts(false);
			}
		}
		loadDrafts();

		return () => {
			mounted = false;
		};
	}, [accounts, loadingAccounts, loadingParties, parties]);

	useEffect(() => {
		if (!partyOptions.find((party) => party.id === partyId)) {
			setPartyId(partyOptions[0]?.id || "");
		}
	}, [partyOptions, partyId]);

	const selectedParty = useMemo(
		() => partyOptions.find((party) => party.id === partyId) || null,
		[partyOptions, partyId],
	);

	async function reloadParties(
		preferredType?: string,
		preferredPartyId?: string,
	) {
		setLoadingParties(true);
		try {
			const rows = await getParties();
			setParties(rows);

			const mergedTypes = Array.from(
				new Set<string>([
					...PARTY_TYPE_OPTIONS,
					...rows.map((party) => party.type),
				]),
			).sort();

			const nextType = preferredType || partyType || mergedTypes[0] || "seller";
			setPartyType(nextType);

			const nextParties = rows.filter((party) => party.type === nextType);
			const canKeepPreferred =
				!!preferredPartyId &&
				nextParties.some((party) => party.id === preferredPartyId);
			setPartyId(
				canKeepPreferred ? preferredPartyId! : nextParties[0]?.id || "",
			);
		} finally {
			setLoadingParties(false);
		}
	}

	useEffect(() => {
		setPartyType((prev) => {
			// if current selection is still valid, keep it
			if (partyTypes.includes(prev)) return prev;

			// otherwise reset based on mode
			return mode === "pay" ? "seller" : "customer";
		});
	}, [mode, partyTypes]);

	useEffect(() => {
		setPartyType(mode === "pay" ? "seller" : "customer");
	}, [mode]);

	useEffect(() => {
		setResolvedPartyAccountId(selectedParty?.accountId || "");
	}, [selectedParty]);

	useEffect(() => {
		setEditingDraftId(null);
	}, [mode]);

	const balance = usePartyBalance(
		resolvedPartyAccountId || null,
		balanceVersion,
	);

	const instrumentBalance = useAccountBalance(
		instrumentId || null,
		balanceVersion,
	);

	function useAccountBalance(id?: string | null, refreshKey?: number) {
		const [st, setSt] = useState<{ loading: boolean; value: number }>({
			loading: false,
			value: 0,
		});

		useEffect(() => {
			let mounted = true;

			if (!id) {
				setSt({ loading: false, value: 0 });
				return;
			}

			setSt({ loading: true, value: 0 });

			getLedger(id)
				.then((data) => {
					if (mounted) {
						setSt({ loading: false, value: data.closing || 0 });
					}
				})
				.catch(() => {
					if (mounted) setSt({ loading: false, value: 0 });
				});

			return () => {
				mounted = false;
			};
		}, [id, refreshKey]);

		return st;
	}

	useEffect(() => {
		if (mode === "pay" && amount > 0 && amount > instrumentBalance.value) {
			setBalanceError("আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নাই");
		} else {
			setBalanceError("");
		}
	}, [amount, instrumentBalance.value, mode]);

	function resetDraftForm(nextParty?: SettlementOption | null) {
		setEditingDraftId(null);
		setAmount(0);
		setMemo("");
		if (nextParty) {
			setPartyType(nextParty.type);
			setPartyId(nextParty.id);
		}
	}

	function startEditingDraft(draft: SettlementDraft) {
		setEditingDraftId(draft.id);
		setPartyType(draft.partyType || (mode === "pay" ? "seller" : "customer"));
		setPartyId(draft.partyId);
		setAmount(draft.amount);
		setInstrumentId(draft.instrumentId);
		setMemo(draft.memo);
	}

	async function handleSaveDraft() {
		if (!partyId) return void (await showError("Select party"));
		if (!amount) return void (await showError("Amount required"));
		if (!instrumentId) return void (await showError("Select instrument"));

		setSaving(true);
		try {
			const selectedOption = partyOptions.find((p) => p.id === partyId);
			if (!selectedOption) {
				throw new Error("Selected party not found");
			}
			const isLoanAccount = selectedOption.type === LOAN_PARTY_TYPE;
			const partyAccount = isLoanAccount
				? accounts.find((account) => account.id === selectedOption.id) || null
				: await resolvePartyAccount(selectedOption.id);
			if (!partyAccount) {
				throw new Error("Selected account not found");
			}
			const partyTypeLabel = isLoanAccount ? "loan" : selectedOption.type;
			setResolvedPartyAccountId(partyAccount.id);
			const narration = buildSettlementNarration({
				mode,
				partyTypeLabel,
				partyName: selectedOption.name,
				memo,
			});
			const voucher = editingDraftId
				? await updateDraftVoucher(editingDraftId, {
						vtype: mode === "pay" ? "payment" : "receipt",
						vdate: todayISO(),
						narration,
						rows: buildSettlementRows({
							mode,
							partyAccountId: partyAccount.id,
							instrumentId,
							amount,
							memo,
						}),
					})
				: await createDraftVoucher({
						vtype: mode === "pay" ? "payment" : "receipt",
						vdate: todayISO(),
						narration,
						rows: buildSettlementRows({
							mode,
							partyAccountId: partyAccount.id,
							instrumentId,
							amount,
							memo,
						}),
					});

			const mappedDraft = mapVoucherToDraft(
				voucher,
				parties,
				accounts,
				selectedOption,
			);
			setDrafts((prev) => {
				const next = prev.filter((draft) => draft.id !== mappedDraft.id);
				return [mappedDraft, ...next];
			});

			resetDraftForm(selectedOption);
			await showSuccess(editingDraftId ? "Draft updated" : "Draft added");
		} catch (error: any) {
			await showError(
				error?.message ||
					(mode === "pay"
						? "Failed to save payment draft"
						: "Failed to save collection draft"),
			);
		} finally {
			setSaving(false);
		}
	}

	async function handleDeleteDraft(draft: SettlementDraft) {
		const result = await showConfirm("এই draft delete করতে চান?");
		if (!result.isConfirmed) return;

		try {
			setDeletingDraftId(draft.id);
			await deleteDraftVoucher(draft.id);
			setDrafts((prev) => prev.filter((item) => item.id !== draft.id));
			if (editingDraftId === draft.id) {
				setEditingDraftId(null);
			}
			await showSuccess("Draft deleted");
		} catch (error: any) {
			await showError(error?.message || "Failed to delete draft");
		} finally {
			setDeletingDraftId(null);
		}
	}

	async function handleApproveDraft(draft: SettlementDraft) {
		const party =
			parties.find((item) => item.id === draft.partyId) ||
			accounts.find((item) => item.id === draft.partyId) ||
			null;
		if (!party) {
			await showError("Selected party not found");
			return;
		}

		const result = await showConfirm(
			`আপনি কি ${party.name}-কে ${nf(draft.amount)} ${draft.mode === "pay" ? "পরিশোধ" : "গ্রহণ"} করতে চান?`,
		);
		if (!result.isConfirmed) return;

		try {
			setApprovingDraftId(draft.id);
			const voucher = await approveDraftVoucher(draft.id);

			setDrafts((prev) => prev.filter((item) => item.id !== draft.id));
			if (editingDraftId === draft.id) {
				setEditingDraftId(null);
			}
			setBalanceVersion((value) => value + 1);
			await showSuccess(`Approved: ${voucher.voucherNo}`);
		} catch (error: any) {
			await showError(error?.message || "Failed to approve draft");
		} finally {
			setApprovingDraftId(null);
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="card p-4">
				<div className="grid grid-cols-1 gap-3 md:grid-cols-5">
					<div>
						<div className="text-xs mb-1">Party Type</div>
						<select
							className="input h-11 w-full text-sm"
							value={partyType}
							onChange={(e) => setPartyType(e.target.value)}
						>
							{partyTypes.map((type) => (
								<option key={type} value={type}>
									{compactLabel(type, isMobile ? 14 : 24)}
								</option>
							))}
						</select>
					</div>
					<div className="md:col-span-2">
						<div className="text-xs mb-1">
							{partyType === LOAN_PARTY_TYPE
								? "Select Loan Account"
								: "Select Party"}
						</div>
						<select
							className="input h-11 w-full text-sm"
							value={partyId}
							onChange={(e) => setPartyId(e.target.value)}
							disabled={loadingParties || loadingLoanAccounts}
						>
							<option value="">
								{loadingParties || loadingLoanAccounts
									? "Loading..."
									: partyType === LOAN_PARTY_TYPE
										? "-- Select a loan account --"
										: "-- Select a party --"}
							</option>
							{partyOptions.map((p) => (
								<option key={p.id} value={p.id}>
									{compactLabel(p.name, isMobile ? 28 : 44)}
								</option>
							))}
						</select>
						{!loadingParties &&
							!loadingLoanAccounts &&
							partyOptions.length === 0 && (
								<p className="mt-1 text-[11px] text-red-500">
									{partyType === LOAN_PARTY_TYPE
										? "No loan accounts found. Create a loan account first."
										: "No parties found for this type. Use Add Party below."}
								</p>
							)}
						{/* <div className="mt-2">
						<button
							type="button"
							className="btn btn-ghost btn-xs"
							onClick={() => {
								setShowAddParty((prev) => !prev);
								setNewPartyType(
									(partyType as CreatePartyInput["type"]) || "seller",
								);
							}}
						>
							{showAddParty ? "Cancel" : "+ Add Party"}
						</button>
					</div> */}
					</div>
					<div>
						<div className="text-xs mb-1">Amount</div>
						<input
							className={`input h-11 w-full text-sm ${balanceError ? "border-red-500" : ""}`}
							type="number"
							value={amount || ""}
							onChange={(e) => setAmount(+e.target.value || 0)}
						/>

						{/* ✅ REAL-TIME ERROR */}
						{balanceError && (
							<div className="text-xs text-red-500 mt-1">{balanceError}</div>
						)}
					</div>
					<div>
						<div className="text-xs mb-1">Instrument</div>
						<select
							className="input h-11 w-full text-sm"
							value={instrumentId}
							onChange={(e) => setInstrumentId(e.target.value)}
						>
							{accounts
								.filter((a) => a.type === "cash" || a.type === "bank")
								.map((i) => (
									<option key={i.id} value={i.id}>
										{compactLabel(i.name, isMobile ? 28 : 44)}
									</option>
								))}
						</select>
						<div className="text-xs mt-1 text-slate-600">
							{instrumentBalance.loading ? (
								"..."
							) : (
								<>ব্যালেন্স: {nf(instrumentBalance.value)} টাকা</>
							)}
						</div>
					</div>
					<div className="md:col-span-5">
						<div className="text-xs mb-1">Memo (optional)</div>
						<input
							className="input h-11 w-full text-sm"
							value={memo}
							onChange={(e) => setMemo(e.target.value)}
						/>
					</div>
					{/* {showAddParty && (
					<div className="md:col-span-5 rounded-lg border border-slate-200 p-3">
						<div className="text-xs font-medium mb-2">Add New Party</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
							<select
								className="input w-full"
								value={newPartyType}
								onChange={(e) =>
									setNewPartyType(e.target.value as CreatePartyInput["type"])
								}
							>
								{PARTY_TYPE_OPTIONS.map((type) => (
									<option key={type} value={type}>
										{type}
									</option>
								))}
							</select>
							<input
								className="input w-full md:col-span-2"
								value={newPartyName}
								onChange={(e) => setNewPartyName(e.target.value)}
								placeholder="Party name"
							/>
						</div>
						<div className="mt-2 flex justify-end">
							<button
								type="button"
								className="btn btn-primary"
								onClick={handleAddParty}
								disabled={addingParty}
							>
								{addingParty ? "Adding..." : "Add Party"}
							</button>
						</div>
					</div>
				)} */}
				</div>

				<div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="text-sm text-slate-600">
						{/* <strong>{balance.loading ? "…" : nf(balance.value)}</strong> */}
						<strong>
							{balance.value > 0 ? "পাওনা ব্যালেন্স: " : "দেনা ব্যালেন্স: "}
							{nf(balance.value)}
						</strong>
					</div>
					<button
						className="btn btn-primary w-full sm:w-auto"
						onClick={handleSaveDraft}
						disabled={!partyId || !!balanceError || saving}
					>
						{saving
							? editingDraftId
								? "Updating…"
								: "Saving…"
							: editingDraftId
								? "Update Draft"
								: "Add Draft"}
					</button>
				</div>
			</div>

			<div className="card overflow-x-auto p-4">
				<div className="mb-3 flex items-center justify-between">
					<div>
						<h2 className="text-lg font-semibold">Draft Transactions</h2>
						<p className="text-xs text-slate-500">
							Posted drafts stay here until you approve them.
						</p>
					</div>
					<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
						{visibleDrafts.length} items
					</span>
				</div>

				{loadingDrafts ? (
					<div className="rounded border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
						Loading drafts...
					</div>
				) : visibleDrafts.length === 0 ? (
					<div className="rounded border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
						No draft transactions yet.
					</div>
				) : (
					<table className="min-w-full text-sm">
						<thead>
							<tr className="text-left text-slate-600">
								<th className="py-2 px-3">Party</th>
								<th className="py-2 px-3">Type</th>
								<th className="py-2 px-3">Amount</th>
								<th className="py-2 px-3">Instrument</th>
								<th className="py-2 px-3">Memo</th>
								<th className="py-2 px-3">Updated</th>
								<th className="py-2 px-3 text-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{visibleDrafts.map((draft) => {
								const draftParty = parties.find(
									(item) => item.id === draft.partyId,
								);
								const draftInstrument = accounts.find(
									(item) => item.id === draft.instrumentId,
								);

								return (
									<tr key={draft.id} className="border-t">
										<td className="py-2 px-3 font-medium">
											{draftParty?.name || draft.partyId}
										</td>
										<td className="py-2 px-3 capitalize">{draft.mode}</td>
										<td className="py-2 px-3">{nf(draft.amount)}</td>
										<td className="py-2 px-3">
											{draftInstrument?.name || draft.instrumentId}
										</td>
										<td className="py-2 px-3 text-slate-600">
											{draft.memo || "-"}
										</td>
										<td className="py-2 px-3 text-slate-600">
											{draft.updatedAt || draft.createdAt}
										</td>
										<td className="py-2 px-3">
											<div className="flex items-center justify-end gap-2">
												<button
													className="btn btn-ghost btn-sm"
													onClick={() => startEditingDraft(draft)}
												>
													Update
												</button>
												<button
													className="btn btn-ghost btn-sm"
													onClick={() => handleDeleteDraft(draft)}
													disabled={
														deletingDraftId === draft.id ||
														approvingDraftId === draft.id
													}
												>
													{deletingDraftId === draft.id
														? "Deleting…"
														: "Delete"}
												</button>
												<button
													className="btn btn-primary btn-sm"
													onClick={() => handleApproveDraft(draft)}
													disabled={
														approvingDraftId === draft.id ||
														deletingDraftId === draft.id
													}
												>
													{approvingDraftId === draft.id
														? "Approving…"
														: "Approve"}
												</button>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}

function todayISO() {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Dhaka",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
}

function mapVoucherToDraft(
	voucher: VoucherDto,
	parties: PartyDto[],
	accounts: AccountDto[],
	fallbackParty?: SettlementOption | PartyDto | null,
): SettlementDraft {
	const partyRow = voucher.rows.find((row) => {
		return (
			parties.some((party) => party.accountId === row.accountId) ||
			accounts.some((account) => account.id === row.accountId)
		);
	});
	const partyAccountId =
		partyRow?.accountId || voucher.rows[0]?.accountId || "";
	const party =
		parties.find((item) => item.accountId === partyAccountId) || null;
	const loanAccount =
		accounts.find((item) => item.id === partyAccountId) || null;
	const instrumentRow =
		voucher.rows.find((row) => row.accountId !== partyAccountId) ||
		voucher.rows[1] ||
		voucher.rows[0];
	const amount = Number(
		voucher.rows.reduce((max, row) => {
			const value = Number(row.dr || row.cr || 0);
			return value > max ? value : max;
		}, 0),
	);

	return {
		id: voucher.id,
		mode: voucher.vtype === "payment" ? "pay" : "receive",
		partyType:
			party?.type ||
			loanAccount?.type ||
			fallbackParty?.type ||
			inferPartyType(voucher),
		partyId:
			party?.id || loanAccount?.id || fallbackParty?.id || partyAccountId,
		amount,
		instrumentId: instrumentRow?.accountId || "",
		memo: instrumentRow?.memo || voucher.narration || "",
		createdAt: voucher.createdAt,
		updatedAt: voucher.updatedAt || voucher.createdAt,
	};
}

function inferPartyType(voucher: VoucherDto) {
	const narration = (voucher.narration || "").toLowerCase();
	if (narration.includes("seller")) return "seller";
	if (narration.includes("customer")) return "customer";
	if (narration.includes("driver")) return "driver";
	if (narration.includes("investor")) return "investor";
	return voucher.vtype === "payment" ? "seller" : "customer";
}

function usePartyBalance(id?: string | null, refreshKey?: number) {
	const [st, setSt] = useState<{ loading: boolean; value: number }>({
		loading: false,
		value: 0,
	});
	useEffect(() => {
		let mounted = true;
		if (!id) {
			setSt({ loading: false, value: 0 });
			return;
		}
		setSt({ loading: true, value: 0 });
		getLedger(id)
			.then((data) => {
				if (mounted) setSt({ loading: false, value: data.closing || 0 });
			})
			.catch(() => {
				if (mounted) setSt({ loading: false, value: 0 });
			});
		return () => {
			mounted = false;
		};
	}, [id, refreshKey]);
	return st;
}


