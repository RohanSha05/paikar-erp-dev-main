'use client';

import { useEffect, useState } from "react";
import {
	createDriverTrip,
	getDriverTrips,
	settleDriverTrip,
	type DriverTripDto,
} from "@/lib/api/driverTrips";
import { getDrivers, type DriverDto } from "@/lib/api/drivers";
import {
	getAccounts,
	postDriverAdvance,
	type AccountDto,
} from "@/lib/api/cashbook";
import { nf } from "@/lib/i18n";
import { useAccountBalance } from "@/lib/hooks/useAccountBalance";
import { showError, showSuccess } from "@/lib/swal";
import { dhakaDate } from "@/lib/dhaka";

type TripFormState = {
	driverId: string;
	driverName: string;
	date: string;
	route: string;
	truckNo: string;
	amount: number; // আগের expense এর বদলে amount
	memo: string;
};

export default function DriverTripsPage() {
	const [rows, setRows] = useState<DriverTripDto[]>([]);
	const [drivers, setDrivers] = useState<DriverDto[]>([]);
	const [accounts, setAccounts] = useState<AccountDto[]>([]);
	const [form, setForm] = useState<TripFormState>({
		driverId: "",
		driverName: "",
		date: dhakaDate(new Date()),
		route: "",
		truckNo: "",
		amount: 0,
		memo: "",
	});

	const [adv, setAdv] = useState({
		amount: 0,
		instrumentId: "",
	});
	const [loading, setLoading] = useState(true);
	const [loadingDrivers, setLoadingDrivers] = useState(true);

	useEffect(() => {
		let mounted = true;

		async function load() {
			setLoading(true);
			setLoadingDrivers(true);

			try {
				const [tripRows, driverRows, accountRows] = await Promise.all([
					getDriverTrips(),
					getDrivers(),
					getAccounts(),
				]);

				if (mounted) {
					const activeDrivers = driverRows.filter((d) => d.active !== false);

					const instrumentAccounts = accountRows.filter(
						(a) => a.type === "cash" || a.type === "bank",
					);

					setRows(tripRows);
					setDrivers(activeDrivers);
					setAccounts(instrumentAccounts);

					const defaultInstrument =
						accountRows.find((a) => a.type === "cash") ||
						accountRows.find((a) => a.type === "bank") ||
						null;

					setAdv((prev) => ({
						...prev,
						instrumentId: prev.instrumentId || defaultInstrument?.id || "",
					}));

					if (!form.driverId && activeDrivers[0]) {
						setForm((prev) => ({
							...prev,
							driverId: activeDrivers[0].id,
							driverName: activeDrivers[0].name,
							truckNo: activeDrivers[0].truckNo || prev.truckNo,
						}));
					}
				}
			} catch (err: unknown) {
				if (mounted) {
					await showError(
						err instanceof Error ? err.message : "Failed to load trips",
					);
				}
			} finally {
				if (mounted) {
					setLoading(false);
					setLoadingDrivers(false);
				}
			}
		}

		void load();

		return () => {
			mounted = false;
		};
	}, []);

	async function addTrip() {
		if (!form.driverId || !form.driverName) {
			await showError("Driver ID ও Name প্রয়োজন");
			return;
		}

		const amt = +form.amount || 0;
		if (!amt) {
			await showError("Trip amount (খরচ) দিন");
			return;
		}

		const tr = {
			driverId: form.driverId,
			driverName: form.driverName,
			date: form.date,
			route: form.route,
			truckNo: form.truckNo,
			amount: amt,
			memo: form.memo,
		};

		await createDriverTrip(tr);
		setRows(await getDriverTrips());

		await showSuccess("Trip saved to database");
		// form reset চাইলে:
		// setForm({ ...form, route:'', truckNo:'', amount:0, memo:'' });
	}

	async function giveAdvance() {
		if (!form.driverId || !form.driverName) {
			await showError("Driver ID ও Name আগে দিন");
			return;
		}

		const amt = +adv.amount || 0;
		if (!amt) {
			await showError("Advance amount দিন");
			return;
		}

		if (
			instrumentBalance !== undefined &&
			instrumentBalance !== null &&
			amt > instrumentBalance
		) {
			await showError("Advance amount বেশি হচ্ছে বর্তমান ব্যালেন্স থেকে");
			return;
		}
		if (!adv.instrumentId) {
			await showError("Instrument নির্বাচন করুন (যেমন Cash / Bank / bKash)");
			return;
		}

		const instrumentName =
			accounts.find((a) => a.id === adv.instrumentId)?.name || "Instrument";

		const memoText = form.memo?.trim() || `Driver Advance - ${form.driverName}`;

		await postDriverAdvance({
			driverId: form.driverId,
			driverName: form.driverName,
			amount: amt,
			instrumentId: adv.instrumentId,
			memo: memoText,
		});

		await showSuccess("Advance posted (Dr Driver | Cr Instrument)");

		setAdv({ ...adv, amount: 0 });
	}

	async function settleTrip(tripId: string) {
		try {
			await settleDriverTrip(tripId, {
				memo: "Driver trip settle",
			});
			setRows(await getDriverTrips());
			await showSuccess("Trip settled");
		} catch (error: any) {
			await showError(error?.message || "Failed to settle trip");
		}
	}

	const hasSelectedDriver = !!form.driverId && !!form.driverName;

	const {
		balance: instrumentBalance,
		loading: instrumentBalanceLoading,
		error: instrumentBalanceError,
	} = useAccountBalance(adv.instrumentId || null);

	const balanceExceeded =
		instrumentBalance !== undefined &&
		instrumentBalance !== null &&
		adv.amount > 0 &&
		adv.amount > instrumentBalance;

	const balanceErrorMessage = balanceExceeded
		? `Advance amount exceeds current balance (৳ ${instrumentBalance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
		: "";

	return (
		<div className="flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Driver Trips</h1>
			</div>

			{/* Form */}
			<div className="card p-4">
				<div className="grid grid-cols-1 md:grid-cols-6 gap-3">
					{/* Driver Dropdown */}
					<div className="md:col-span-2">
						<div className="text-xs mb-1">Driver</div>
						<select
							className="input w-full"
							value={form.driverId}
							onChange={(e) => {
								const selectedId = e.target.value;
								const selected = drivers.find((d) => d.id === selectedId);
								setForm((prev) => ({
									...prev,
									driverId: selected?.id || "",
									driverName: selected?.name || "",
									truckNo: selected?.truckNo || prev.truckNo,
								}));
							}}
							disabled={loadingDrivers}
						>
							<option value="">
								{loadingDrivers
									? "Loading drivers..."
									: drivers.length
										? "Select driver"
										: "No active drivers"}
							</option>
							{drivers.map((d) => (
								<option key={d.id} value={d.id}>
									{d.name} ({d.id})
								</option>
							))}
						</select>
					</div>

					{/* Driver ID (auto from dropdown) */}
					<div>
						<div className="text-xs mb-1">Driver ID</div>
						<input
							className="input w-full"
							value={form.driverId}
							readOnly
							placeholder="Auto from selected driver"
						/>
					</div>

					{/* Driver Name (auto from dropdown) */}
					<div>
						<div className="text-xs mb-1">Driver Name</div>
						<input
							className="input w-full"
							value={form.driverName}
							readOnly
							placeholder="Auto from selected driver"
						/>
					</div>

					{/* Date */}
					<div>
						<div className="text-xs mb-1">Date</div>
						<input
							className="input w-full"
							type="date"
							value={form.date}
							onChange={(e) => setForm({ ...form, date: e.target.value })}
						/>
					</div>

					{/* Truck No */}
					<div>
						<div className="text-xs mb-1">Truck No</div>
						<input
							className="input w-full"
							value={form.truckNo}
							onChange={(e) => setForm({ ...form, truckNo: e.target.value })}
							placeholder="e.g., DHA-11-1234"
						/>
					</div>

					{/* Route */}
					<div>
						<div className="text-xs mb-1">Route</div>
						<input
							className="input w-full"
							value={form.route}
							onChange={(e) => setForm({ ...form, route: e.target.value })}
							placeholder="e.g., Naogaon → Dhaka"
						/>
					</div>

					{/* Trip Amount */}
					<div>
						<div className="text-xs mb-1">Trip Amount (৳)</div>
						<input
							className="input w-full"
							type="number"
							value={form.amount || ""}
							onChange={(e) =>
								setForm({
									...form,
									amount: +e.target.value || 0,
								})
							}
							placeholder="e.g., 18000"
						/>
					</div>

					{/* Memo */}
					<div className="md:col-span-3">
						<div className="text-xs mb-1">Memo</div>
						<input
							className="input w-full"
							value={form.memo}
							onChange={(e) => setForm({ ...form, memo: e.target.value })}
							placeholder="optional note"
						/>
					</div>

					{/* Add Trip */}
					<div className="md:col-span-2 flex items-end gap-2">
						<button
							className="btn btn-primary"
							onClick={addTrip}
							disabled={!hasSelectedDriver || loadingDrivers}
						>
							Add Trip (no voucher)
						</button>
					</div>
				</div>

				{/* Advance Section */}
				<div className="mt-4 p-3 rounded border bg-slate-50 grid grid-cols-1 md:grid-cols-4 gap-3">
					<div className="md:col-span-2">
						<div className="text-xs mb-1">Advance/Loan (optional)</div>
						<div className="flex gap-2">
							<input
								className="input"
								type="number"
								placeholder="Amount"
								value={adv.amount || ""}
								onChange={(e) =>
									setAdv({
										...adv,
										amount: +e.target.value || 0,
									})
								}
							/>
							<select
								className="input"
								value={adv.instrumentId}
								onChange={(e) =>
									setAdv({
										...adv,
										instrumentId: e.target.value,
									})
								}
								disabled={!accounts.length}
							>
								<option value="">
									{accounts.length
										? "Select instrument"
										: "Loading instruments..."}
								</option>
								{accounts.map((account) => (
									<option key={account.id} value={account.id}>
										{account.name}
									</option>
								))}
							</select>
							{adv.instrumentId && (
								<>
									<p className="text-[11px] text-slate-500 mt-1">
										{instrumentBalanceLoading ? (
											"Loading balance..."
										) : (
											<>ব্যালেন্স: {nf(instrumentBalance)}</>
										)}
									</p>
									{balanceExceeded && (
										<p className="text-[11px] text-red-600 mt-1">
											⚠️ {balanceErrorMessage}
										</p>
									)}
								</>
							)}
							<button
								className="btn"
								onClick={giveAdvance}
								disabled={
									!hasSelectedDriver ||
									loadingDrivers ||
									(adv.amount > 0 &&
										instrumentBalance !== undefined &&
										adv.amount > instrumentBalance)
								}
							>
								Post Advance
							</button>
						</div>
						<div className="text-xs text-slate-500 mt-1">
							Advance posting: <b>Dr Driver | Cr Instrument</b>
						</div>
					</div>
				</div>
			</div>

			{/* List */}
			<div className="card p-0 overflow-x-auto">
				<div className="p-3 border-b font-medium">Recent Trips</div>
				<table className="w-full text-sm">
					<thead>
						<tr className="text-left text-slate-500 border-b">
							<th className="py-2 px-3">Date</th>
							<th className="py-2 px-3">Driver</th>
							<th className="py-2 px-3">Truck</th>
							<th className="py-2 px-3">Route</th>
							<th className="py-2 px-3 text-right">Amount (৳)</th>
							<th className="py-2 px-3">Status</th>
						</tr>
					</thead>
					<tbody>
						{loading && (
							<tr>
								<td className="py-6 text-center text-slate-400" colSpan={6}>
									Loading trips...
								</td>
							</tr>
						)}
						{rows.map((r) => {
							const amt = Number(r.amount || 0);
							return (
								<tr key={r.id} className="border-t">
									<td className="py-2 px-3">
										{new Date(r.date).toISOString().slice(0, 10)}
									</td>
									<td className="py-2 px-3">
										{r.driverName || "—"} ({r.driverId})
									</td>
									<td className="py-2 px-3">{r.truckNo || "—"}</td>
									<td className="py-2 px-3">{r.route || "—"}</td>
									<td className="py-2 px-3 text-right">{nf(amt)}</td>
									<td className="py-2 px-3">
										{r.settled ? (
											<span className="text-xs rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
												Settled
											</span>
										) : (
											<button
												className="btn btn-ghost btn-xs"
												onClick={() => settleTrip(r.id)}
											>
												Settle
											</button>
										)}
									</td>
								</tr>
							);
						})}
						{!loading && !rows.length && (
							<tr>
								<td className="py-6 text-center text-slate-400" colSpan={6}>
									No trips
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
