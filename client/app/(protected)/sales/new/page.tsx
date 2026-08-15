// app/(protected)/sales/new/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import CostWarning from "@/components/CostWarning";
import BuyerPicker from "@/components/BuyerPicker";
import { createSalesOrderDraft, getLots } from "@/lib/api/sales";
import { getPurchaseOrderById } from "@/lib/api/purchase";
import { getProducts, type ProductDto } from "@/lib/api/products";
import {
	createCustomer,
	getCustomers,
	type CustomerDto,
} from "@/lib/api/masters";
import { nf } from "@/lib/i18n";
import { showError, showSuccess } from "@/lib/swal";
import { dhakaIso } from "@/lib/dhaka";

type RateBasis = "perMon" | "perKg" | "perBag";
const PRODUCT_CATEGORIES = [
	{ value: "ধান", label: "ধান" },
	{ value: "চাল", label: "চাল" },
	{ value: "গম", label: "গম" },
	{ value: "ভুট্টা", label: "ভুট্টা" },
	{ value: "সরিষা", label: "সরিষা" },
	{ value: "অন্যান্য", label: "অন্যান্য" },
];

type Customer = {
	id: string;
	name: string;
	address?: string;
	district?: string;
	market?: string;
	phone?: string;
	type?: CustomerDto["type"];
};
type SalesOrder = {
	id: string;
	status: "draft" | "confirmed";
	customerId: string;
	customerSnapshot: Customer;
	items: Array<{
		lotId: string;
		productType: string;
		qtyKg: number;
		rateBasis: RateBasis;
		rateValue: number;
		bagCount: number;
	}>;
	transport: number;
	loadingUnloading: number;
	misc: number;
	remarks?: string;
	createdAt: string;
};
type Lot = {
	id: string;
	label?: string;
	productId: string;
	productType: string;
	availableKg: number;
	avgCostPerKg: number;
	createdAt: string;
	meta?: Record<string, unknown>;
};

function resolveCustomerType(
	value: unknown,
	fallback: CustomerDto["type"] = "mill",
): CustomerDto["type"] {
	return value === "mill" || value === "retailer" || value === "other"
		? value
		: fallback;
}

function getLotDefaultKgPerBag(lot: Lot): number {
	const raw = lot.meta?.kgPerBag;
	const parsed = Number(raw);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getLotDefaultBagCount(lot: Lot): number {
	const raw = lot.meta?.bagCount;
	const parsed = Number(raw);
	if (Number.isFinite(parsed) && parsed > 0) return parsed;

	const kgPerBag = getLotDefaultKgPerBag(lot);
	const availableKg = Number(lot.availableKg || 0);
	return kgPerBag > 0 ? Math.floor(availableKg / kgPerBag) : 0;
}

function getLotDisplaySummary(lot: Lot) {
	const availableKg = Number(lot.availableKg || 0);
	const kgPerBag = getLotDefaultKgPerBag(lot);
	const bagCount = getLotDefaultBagCount(lot);
	const mon = availableKg / KG_PER_MON;

	return { availableKg, kgPerBag, bagCount, mon };
}

function toFiniteNumber(value: unknown, fallback = 0): number {
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function sumLotMovesKg(moves: unknown): number {
	if (!Array.isArray(moves)) return 0;
	return moves.reduce(
		(sum, move) => sum + toFiniteNumber((move as any)?.qtyKg),
		0,
	);
}

function deriveAvgCostPerKg(lot: any, poMap: Record<string, any>): number {
	const direct = toFiniteNumber(lot?.avgCostPerKg, NaN);
	if (Number.isFinite(direct) && direct > 0) return direct;

	const poId = lot?.sourcePo?.id || lot?.meta?.poId;
	const po = poId ? poMap[poId] : null;
	const totalCost = toFiniteNumber(po?.totals?.totalCost ?? po?.totalCost, NaN);
	const totalStockKg = toFiniteNumber(
		po?.totals?.totalStockKg ?? po?.remainingStockKg ?? po?.initialStockKg,
		NaN,
	);
	if (
		Number.isFinite(totalCost) &&
		Number.isFinite(totalStockKg) &&
		totalStockKg > 0
	) {
		return totalCost / totalStockKg;
	}

	return 0;
}

function normalizeLotRecord(lot: any, poMap: Record<string, any>): Lot {
	const availableKg = toFiniteNumber(lot?.availableKg, NaN);
	const moveBasedAvailableKg = sumLotMovesKg(lot?.stockMoves);
	const resolvedAvailableKg =
		Number.isFinite(availableKg) && availableKg > 0
			? availableKg
			: moveBasedAvailableKg;

	return {
		id: String(lot?.id || ""),
		label: lot?.label || "",
		productType: lot?.productType || lot?.product?.name || "-",
		availableKg: resolvedAvailableKg,
		avgCostPerKg: deriveAvgCostPerKg(lot, poMap),
		productId: lot?.productId || lot?.product?.id || "",
		createdAt: lot?.createdAt || dhakaIso(),
		meta: lot?.meta || {},
	} as Lot;
}

function toBuyerPickerValue(customer: Customer | null): CustomerDto | null {
	if (!customer) return null;
	return {
		id: customer.id,
		name: customer.name,
		address: customer.address,
		district: customer.district,
		market: customer.market,
		phone: customer.phone,
		type: resolveCustomerType(customer.type, "mill"),
	};
}

const KG_PER_MON = 40;

let salesLocalIdSeq = 0;

function makeId(prefix: string) {
	salesLocalIdSeq += 1;
	const now = new Date();
	const df = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Dhaka",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	const date = df.format(now).replace(/-/g, "");
	return `${prefix}-${date}-${String(salesLocalIdSeq).padStart(3, "0")}`;
}

const fmtMoney = (n: number) =>
	`৳ ${nf(Math.round((n || 0) * 100) / 100, { maximumFractionDigits: 2 })}`;
const fmtNum = (n: number, max = 2) =>
	nf(Number(n || 0), { maximumFractionDigits: max });

type SalesLine = {
	id: string;

	lotId: string;
	lotLabel: string;

	productId: string; // ✅ NEW (main)
	productType: string; // display only

	availableKg: number;
	avgCostPerKg: number;

	bagCount: number;
	kgPerBag: number;
	qtyKg: number;

	rateBasis: RateBasis;
	rateValue: number;

	warn?: string;
};

export default function SalesNewPage() {
	const router = useRouter();
	const [step, setStep] = useState(1);

	// Customer
	const [customer, setCustomer] = useState<Customer | null>(null);
	const [customers, setCustomers] = useState<CustomerDto[]>([]);
	const [customerAddress, setCustomerAddress] = useState("");
	const [customerDistrict, setCustomerDistrict] = useState("");
	const [customerMarket, setCustomerMarket] = useState("");

	// Lots + Lines
	const [lotCache, setLotCache] = useState<Lot[]>([]);
	const [lotsByLine, setLotsByLine] = useState<Record<string, Lot[]>>({});
	const [lotLoadingByLine, setLotLoadingByLine] = useState<
		Record<string, boolean>
	>({});
	const [lotErrorByLine, setLotErrorByLine] = useState<Record<string, string>>(
		{},
	);
	const [lotLoadedByLine, setLotLoadedByLine] = useState<
		Record<string, boolean>
	>({});
	const [products, setProducts] = useState<ProductDto[]>([]);
	const [lines, setLines] = useState<SalesLine[]>([]);
	const [productCategoryByLine, setProductCategoryByLine] = useState<
		Record<string, string>
	>({});
	const [productNameByLine, setProductNameByLine] = useState<
		Record<string, string>
	>({});
	const [activeLotLineId, setActiveLotLineId] = useState<string | null>(null);
	const [lotSearchByLine, setLotSearchByLine] = useState<
		Record<string, string>
	>({});
	const [openLotDropdown, setOpenLotDropdown] = useState<
		Record<string, boolean>
	>({});

	// Extras
	const [transport, setTransport] = useState("0");
	const [loadingUnloading, setLoadingUnloading] = useState("0");
	const [misc, setMisc] = useState("0");
	const [remarks, setRemarks] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const lotRequestSeqRef = useRef<Record<string, number>>({});

	useEffect(() => {
		let mounted = true;

		if (!lines.length) {
			setLines([
				{
					id: `L1`,
					lotId: "",
					lotLabel: "",
					productId: "", // ✅ add
					productType: "",
					availableKg: 0,
					avgCostPerKg: 0,
					bagCount: 0,
					kgPerBag: 0,
					qtyKg: 0,
					rateBasis: "perMon",
					rateValue: 0,
					warn: "",
				},
			]);
		}

		async function loadProducts() {
			try {
				const items = await getProducts();
				if (mounted) setProducts(items.filter((p) => p.active));
			} catch {
				if (mounted) setProducts([]);
			}
		}

		loadProducts();

		return () => {
			mounted = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const activeLotSearch = activeLotLineId
		? (lotSearchByLine[activeLotLineId] || "").trim()
		: "";
	const activeLineCategory = activeLotLineId
		? (productCategoryByLine[activeLotLineId] || "").trim()
		: "";
	const activeLineProductName = activeLotLineId
		? (productNameByLine[activeLotLineId] || "").trim()
		: "";
	const activeLotQueryKey = `${activeLotSearch}|${activeLineCategory}|${activeLineProductName}|${customer?.id || ""}`;

	useEffect(() => {
		const lineId = activeLotLineId;
		if (!lineId) {
			return;
		}

		let cancelled = false;
		setLotLoadingByLine((prev) => ({ ...prev, [lineId]: true }));
		setLotErrorByLine((prev) => ({ ...prev, [lineId]: "" }));
		setLotLoadedByLine((prev) => ({ ...prev, [lineId]: false }));
		lotRequestSeqRef.current[lineId] =
			(lotRequestSeqRef.current[lineId] || 0) + 1;
		const requestSeq = lotRequestSeqRef.current[lineId];
		const timeout = window.setTimeout(
			() => {
				void (async () => {
					try {
						const apiLots = await getLots({
							available: true,
							limit: activeLotSearch ? 25 : 10,
							search: activeLotSearch || undefined,
							productCategory: activeLineCategory || undefined,
							productName: activeLineProductName || undefined,
							timeoutMs: 30000,
						});
						const missingPoIds = Array.from(
							new Set(apiLots.map((x: any) => x?.meta?.poId).filter(Boolean)),
						).filter((id) => {
							const lot = apiLots.find((l: any) => l?.meta?.poId === id);
							return lot && !lot.sourcePo;
						});

						const poMap: Record<string, any> = {};
						if (missingPoIds.length) {
							await Promise.all(
								missingPoIds.map(async (pid) => {
									try {
										const po = await getPurchaseOrderById(pid as string);
										if (po) poMap[pid as string] = po;
									} catch {
										// ignore missing purchase orders
									}
								}),
							);
						}

						const lotRows = Array.isArray(apiLots)
							? apiLots.filter(Boolean)
							: [];

						const mapped = lotRows
							.slice()
							.sort((a, b) =>
								String(b?.createdAt || "").localeCompare(
									String(a?.createdAt || ""),
								),
							)
							.map((lot) => {
								const normalized = normalizeLotRecord(lot, poMap) as Lot & {
									sourcePo?: any;
								};
								const sourcePo =
									lot.sourcePo ||
									(lot.meta?.poId
										? {
												id: lot.meta.poId,
												poNo: poMap[lot.meta.poId]?.poNo,
												destinationCustomerId:
													poMap[lot.meta.poId]?.destinationCustomerId,
												destinationCustomer:
													poMap[lot.meta.poId]?.destinationCustomer,
											}
										: undefined);

								return {
									...normalized,
									sourcePo,
								} as Lot;
							});
						if (!cancelled && lotRequestSeqRef.current[lineId] === requestSeq) {
							setLotsByLine((prev) => ({
								...prev,
								[lineId]: mapped,
							}));
							setLotCache((prev) => {
								const next = new Map(prev.map((lot) => [lot.id, lot]));
								for (const lot of mapped) next.set(lot.id, lot);
								return Array.from(next.values());
							});
							setLotErrorByLine((prev) => ({ ...prev, [lineId]: "" }));
							setLotLoadedByLine((prev) => ({ ...prev, [lineId]: true }));
						}
					} catch (error) {
						if (!cancelled && lotRequestSeqRef.current[lineId] === requestSeq) {
							setLotsByLine((prev) => ({
								...prev,
								[lineId]: [],
							}));
							setLotErrorByLine((prev) => ({
								...prev,
								[lineId]:
									error instanceof Error && /timeout/i.test(error.message)
										? "লোট লোড করা যাচ্ছে, একটু অপেক্ষা করুন।"
										: "লোট লোড করা যায়নি। আবার চেষ্টা করুন।",
							}));
							setLotLoadedByLine((prev) => ({ ...prev, [lineId]: true }));
						}
					} finally {
						if (!cancelled && lotRequestSeqRef.current[lineId] === requestSeq) {
							setLotLoadingByLine((prev) => ({ ...prev, [lineId]: false }));
						}
					}
				})();
			},
			activeLotSearch ? 300 : 150,
		);

		return () => {
			cancelled = true;
			window.clearTimeout(timeout);
		};
	}, [activeLotQueryKey, activeLotLineId]);

	function getRemainingLotForLine(lot: Lot, lineIndex: number) {
		const allocatedBefore = lines.slice(0, lineIndex).reduce((sum, line) => {
			if (line.lotId !== lot.id) return sum;
			return sum + Number(line.qtyKg || 0);
		}, 0);

		return Math.max(0, Number(lot.availableKg || 0) - allocatedBefore);
	}

	function getRemainingBagsForLine(lot: Lot, lineIndex: number) {
		const kgPerBag = getLotDefaultKgPerBag(lot);
		if (kgPerBag <= 0) return 0;

		const remainingKg = getRemainingLotForLine(lot, lineIndex);
		return Math.max(0, Math.floor(remainingKg / kgPerBag));
	}

	function onBuyerChange(c: CustomerDto) {
		setCustomer({
			id: c.id,
			name: c.name,
			address: c.address,
			district: c.district,
			market: c.market,
			phone: c.phone,
			type: c.type || "mill",
		});
		setCustomerAddress(c.address || "");
		setCustomerDistrict(c.district || "");
		setCustomerMarket(c.market || "");
	}

	// helpers
	const kgToMon = (kg: number) => kg / KG_PER_MON;

	function clampQtyToStock(cur: SalesLine): SalesLine {
		const avail = Number(cur.availableKg || 0);
		let bagCount = Number(cur.bagCount || 0);
		let kgPerBag = Number(cur.kgPerBag || 0);

		// derive qty
		let qtyKg = bagCount * kgPerBag;

		let warn = "";

		if (avail > 0) {
			// If kgPerBag is known, clamp bags so that qty <= stock
			if (kgPerBag > 0) {
				const maxBags = Math.floor(avail / kgPerBag);
				if (bagCount > maxBags) {
					bagCount = Math.max(0, maxBags);
					qtyKg = bagCount * kgPerBag;
					warn = `স্টক ${fmtNum(avail, 3)} kg এর বেশি দেয়া যাবে না। Max bags: ${maxBags}`;
				}
			} else {
				// kgPerBag unknown: we can’t compute max bags, but still ensure qtyKg (currently 0) is ok
				// If user typed bagCount but kgPerBag 0 => qty stays 0; show hint only
				if (bagCount > 0) {
					warn = "kg/Bag সেট না থাকায় বস্তা থেকে Qty হিসাব করা যাচ্ছে না।";
				}
			}

			// Extra safety: if qtyKg somehow exceeds avail, clamp qtyKg
			if (qtyKg > avail) {
				qtyKg = avail;
				warn = `স্টক ${fmtNum(avail, 3)} kg এর বেশি দেয়া যাবে না।`;
				// adjust bags down if possible
				if (kgPerBag > 0) {
					bagCount = Math.floor(avail / kgPerBag);
					qtyKg = bagCount * kgPerBag;
				}
			}
		}

		return { ...cur, bagCount, kgPerBag, qtyKg, warn };
	}

	function revalidateLines(lines: SalesLine[], lots: Lot[]): SalesLine[] {
		const remainingByLot: Record<string, number> = {};

		return lines.map((line) => {
			if (!line.lotId) {
				return { ...line, warn: line.warn || "" };
			}

			const lot = lots.find((item) => item.id === line.lotId);
			const lotAvailable = Number(lot?.availableKg || 0);
			const alreadyRemaining =
				remainingByLot[line.lotId] === undefined
					? lotAvailable
					: remainingByLot[line.lotId];

			const normalized: SalesLine = {
				...line,
				availableKg: alreadyRemaining,
				bagCount: Number(line.bagCount || 0),
				kgPerBag: Number(line.kgPerBag || 0),
				qtyKg: Number(line.qtyKg || 0),
				rateValue: Number(line.rateValue || 0),
			};

			const wantedQty = Number(normalized.qtyKg || 0);
			let nextQty = wantedQty;
			let warn = "";

			if (wantedQty > alreadyRemaining) {
				nextQty = Math.max(0, alreadyRemaining);
				warn = `Only ${fmtNum(alreadyRemaining, 3)} kg is available in this lot.`;
			}

			if (normalized.kgPerBag > 0) {
				normalized.bagCount = Math.floor(nextQty / normalized.kgPerBag);
			}

			normalized.qtyKg = nextQty;
			normalized.warn = warn;
			remainingByLot[line.lotId] = Math.max(0, alreadyRemaining - nextQty);

			return normalized;
		});
	}

	function updateLine(index: number, patch: Partial<SalesLine>) {
		setLines((prev) => {
			const next = [...prev];
			const base = next[index];
			let cur: SalesLine = { ...base, ...patch };

			// normalize numbers
			cur.bagCount = Number(cur.bagCount || 0);
			cur.kgPerBag = Number(cur.kgPerBag || 0);

			const shouldClamp =
				patch.bagCount !== undefined ||
				patch.kgPerBag !== undefined ||
				patch.availableKg !== undefined ||
				patch.lotId !== undefined;

			if (shouldClamp) {
				cur = clampQtyToStock(cur);
			} else {
				// 👇 just recalc qty, don't clamp
				cur.qtyKg = cur.bagCount * cur.kgPerBag;
			}

			next[index] = cur;
			return revalidateLines(next, lotCache);
		});
	}
	function onLotChange(index: number, lotId: string) {
		const lot = lotCache.find((l) => l.id === lotId);

		if (!lot) {
			updateLine(index, {
				lotId: "",
				lotLabel: "",
				productId: "",
				productType: "",
				availableKg: 0,
				avgCostPerKg: 0,
				bagCount: 0,
				kgPerBag: 0,
				qtyKg: 0,
				warn: "",
			});
			return;
		}

		const available = getRemainingLotForLine(lot, index);
		const mon = available / KG_PER_MON;
		const remainingBags = getRemainingBagsForLine(lot, index);

		const uniqueLabel = lot.label?.trim()
			? `${lot.label} (${lot.productType}) • ${mon.toFixed(2)} MON`
			: `${lot.id} — ${lot.productType} • ${mon.toFixed(2)} MON`;

		const calculatedKgPerBag = getLotDefaultKgPerBag(lot);
		const defaultBagCount = remainingBags > 0 ? remainingBags : 0;

		const product = products.find((p) => p.id === lot.productId);

		updateLine(index, {
			lotId: lot.id,
			lotLabel: uniqueLabel,
			productId: product?.id || "",
			productType: product?.name || lot.productType || "",
			availableKg: available,
			avgCostPerKg: Number(lot.avgCostPerKg || 0),
			kgPerBag: calculatedKgPerBag,
			bagCount: defaultBagCount,
		});

		setLotSearchByLine((prev) => ({
			...prev,
			[lines[index]?.id || ""]: uniqueLabel,
		}));
		setActiveLotLineId(lines[index]?.id || null);
	}
	useEffect(() => {
		if (!products.length) return;

		setLines((prev) =>
			prev.map((line) => {
				// skip if already filled
				if (!line.lotId || line.productId) return line;

				const lot = lotCache.find((l) => l.id === line.lotId);
				if (!lot) return line;

				const product = products.find((p) => p.id === lot.productId);
				if (!product) return line;

				return {
					...line,
					productId: product.id,
					productType: product.name,
				};
			}),
		);
	}, [products, lotCache]);

	const productValues = Array.from(
		new Set([
			...products.map((product) => product.name),
			...lines.map((line) => line.productType).filter(Boolean),
		]),
	).filter(Boolean) as string[];

	function addLine() {
		const id = `L${lines.length + 1}`;
		setLines((prev) =>
			revalidateLines(
				[
					...prev,
					{
						id,
						lotId: "",
						lotLabel: "",
						productId: "", // ✅ add
						productType: "",
						availableKg: 0,
						avgCostPerKg: 0,
						bagCount: 0,
						kgPerBag: 0,
						qtyKg: 0,
						rateBasis: "perMon",
						rateValue: 0,
						warn: "",
					},
				],
				lotCache,
			),
		);
	}

	function removeLine(idx: number) {
		const removedId = lines[idx]?.id;
		setLines((prev) => {
			const next = prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx);
			return revalidateLines(next, lotCache);
		});
		if (removedId) {
			setLotSearchByLine((prev) => {
				const next = { ...prev };
				delete next[removedId];
				return next;
			});
			setLotsByLine((prev) => {
				const next = { ...prev };
				delete next[removedId];
				return next;
			});
			setLotLoadingByLine((prev) => {
				const next = { ...prev };
				delete next[removedId];
				return next;
			});
			setLotErrorByLine((prev) => {
				const next = { ...prev };
				delete next[removedId];
				return next;
			});
			setLotLoadedByLine((prev) => {
				const next = { ...prev };
				delete next[removedId];
				return next;
			});
			setProductCategoryByLine((prev) => {
				const next = { ...prev };
				delete next[removedId];
				return next;
			});
			setProductNameByLine((prev) => {
				const next = { ...prev };
				delete next[removedId];
				return next;
			});
		}
	}

	// Summary
	const summary = useMemo(() => {
		const rows = lines.filter((l) => l.lotId && l.qtyKg > 0 && l.rateValue > 0);

		let totalKg = 0;
		let grossSales = 0;
		let estCost = 0;
		let hasLoss = false;

		for (const l of rows) {
			let ratePerKg = 0;
			if (l.rateBasis === "perKg") ratePerKg = l.rateValue;
			else if (l.rateBasis === "perMon") ratePerKg = l.rateValue / KG_PER_MON;
			else if (l.rateBasis === "perBag") {
				const kpb = Number(l.kgPerBag || 0);
				ratePerKg = kpb > 0 ? l.rateValue / kpb : l.rateValue / KG_PER_MON;
			}
			totalKg += l.qtyKg;
			grossSales += l.qtyKg * ratePerKg;
			estCost += l.qtyKg * (l.avgCostPerKg || 0);

			if (l.avgCostPerKg && ratePerKg < l.avgCostPerKg) hasLoss = true;
		}

		return {
			totalKg,
			grossSales,
			estCost,
			grossMargin: grossSales - estCost,
			hasLoss,
		};
	}, [lines]);

	function buildSO(status: "draft" | "confirmed" = "draft"): SalesOrder {
		if (!customer) throw new Error("কাস্টমার নির্বাচন করুন");

		const activeLines = lines.filter(
			(l) => l.lotId && l.qtyKg > 0 && l.rateValue > 0,
		);
		if (!activeLines.length) throw new Error("কমপক্ষে একটি লাইন পূরণ করুন");

		// ✅ 3) server-side guard: cannot sell more than stock
		for (const l of activeLines) {
			if (l.availableKg > 0 && l.qtyKg > l.availableKg + 1e-9) {
				throw new Error(`স্টকের বেশি বিক্রি করা যাবে না: ${l.lotLabel}`);
			}
		}

		const items = activeLines.map((l) => ({
			lotId: l.lotId,
			productType: l.productType || "অন্যান্য",
			qtyKg: l.qtyKg,
			rateBasis: l.rateBasis,
			rateValue: l.rateValue,
			bagCount: Number(l.bagCount || 0),
		}));

		const so: SalesOrder = {
			id: makeId("SO"),
			status,
			customerId: customer.id,
			customerSnapshot: {
				...customer,
				address: customerAddress,
				district: customerDistrict,
				market: customerMarket,
			},
			items,
			transport: Number(transport || 0),
			loadingUnloading: Number(loadingUnloading || 0),
			misc: Number(misc || 0),
			remarks,
			createdAt: dhakaIso(),
		};

		return so;
	}

	async function ensureBackendCustomerId(): Promise<string> {
		if (!customer) throw new Error("কাস্টমার নির্বাচন করুন");

		const normalize = (v?: string) => (v || "").trim().toLowerCase();
		const freshCustomers = await getCustomers().catch(() => customers);
		setCustomers(freshCustomers);

		const existing = freshCustomers.find(
			(c: CustomerDto) => c.id === customer.id,
		);
		if (existing?.id) return existing.id;

		const matched = freshCustomers.find((c: CustomerDto) => {
			if (normalize(c.name) !== normalize(customer.name)) return false;
			if (
				normalize(customer.phone) &&
				normalize(c.phone) !== normalize(customer.phone)
			)
				return false;
			if (
				normalize(customer.district) &&
				normalize(c.district) !== normalize(customer.district)
			)
				return false;
			return true;
		});

		if (matched?.id) {
			setCustomer((prev: Customer | null) =>
				prev
					? {
							...prev,
							id: matched.id,
							type: resolveCustomerType(matched.type, prev.type || "mill"),
						}
					: prev,
			);
			return matched.id;
		}

		const name = (customer.name || "").trim();
		if (!name) throw new Error("কাস্টমারের নাম প্রয়োজন");

		const created = await createCustomer({
			name,
			address: customerAddress || undefined,
			district: customerDistrict || undefined,
			market: customerMarket || undefined,
			phone: customer.phone || undefined,
			type: resolveCustomerType(customer.type, "mill"),
		});

		setCustomers((prev: CustomerDto[]) => {
			if (prev.some((c: CustomerDto) => c.id === created.id)) return prev;
			return [created, ...prev];
		});

		setCustomer((prev: Customer | null) =>
			prev
				? {
						...prev,
						id: created.id,
						type: resolveCustomerType(created.type, prev.type || "mill"),
					}
				: {
						id: created.id,
						name: created.name,
						address: created.address,
						district: created.district,
						market: created.market,
						phone: created.phone,
						type: resolveCustomerType(created.type, "mill"),
					},
		);

		return created.id;
	}

	async function saveDraft(goReview: boolean) {
		try {
			setIsSaving(true);
			const customerId = await ensureBackendCustomerId();
			const so = buildSO("draft");
			so.customerId = customerId;
			so.customerSnapshot = {
				...(so.customerSnapshot || {}),
				id: customerId,
			};
			// Check for reserved lots before saving
			for (const item of so.items || []) {
				const lot = (lotCache as any[]).find((l) => l.id === item.lotId);
				if (!lot) continue;

				const sourcePo = (lot as any).sourcePo;
				if (
					sourcePo?.destinationCustomerId &&
					sourcePo.destinationCustomerId !== customerId
				) {
					const reservedFor = sourcePo.destinationCustomer?.name || "unknown";
					throw new Error(
						`এই lot "${lot.label || lot.id}" ${reservedFor}-এর জন্য বরাদ্দ। এটি শুধু ওই customer-এর কাছেই বিক্রি করা যাবে।`,
					);
				}
			}

			const created = await createSalesOrderDraft({
				customerId: so.customerId,
				customerSnapshot: so.customerSnapshot,
				transport: Number(so.transport || 0),
				loadingUnloading: Number(so.loadingUnloading || 0),
				misc: Number(so.misc || 0),
				remarks: so.remarks,
				items: (so.items || []).map((it) => ({
					lotId: it.lotId,
					productType: it.productType,
					qtyKg: Number(it.qtyKg || 0),
					rateBasis: it.rateBasis,
					rateValue: Number(it.rateValue || 0),
					bagCount: Number(it.bagCount || 0),
					kgPerBag: Number((it as any).kgPerBag || 0),
				})),
			});

			const displayNo = created.soNo || created.id;
			await showSuccess(`SO Draft Saved: ${displayNo}`);
			if (goReview && created.id) router.push(`/sales/${created.id}`);
		} catch (e: any) {
			await showError(e?.message || "Unable to save sales order");
		} finally {
			setIsSaving(false);
		}
	}

	function cleanBaseLabel(label?: string) {
		if (!label) return "";

		return label
			.replace(/•.*$/, "") // remove everything after bullet
			.replace(/(\d+(\.\d+)?\s*(MON|KG|মণ|কেজি).*)/gi, "")
			.trim();
	}

	function formatLotLabel(l: Lot) {
		const base = cleanBaseLabel(l.label) || `${l.id} — ${l.productType}`;
		const { availableKg, kgPerBag, bagCount, mon } = getLotDisplaySummary(l);

		// Add restriction indicator if lot is reserved for a specific customer
		const sourcePo = (l as any).sourcePo;
		const restriction = sourcePo?.destinationCustomer
			? ` [সংরক্ষিত: ${sourcePo.destinationCustomer.name}]`
			: "";

		return `${base} • ${fmtNum(availableKg, 3)} kg • ${fmtNum(mon, 2)} মণ • ${bagCount} বস্তা${kgPerBag > 0 ? ` (kg/Bag ${fmtNum(kgPerBag, 0)})` : ""}${restriction}`;
	}

	const productMap = useMemo(() => {
		return new Map(products.map((p) => [p.name, p]));
	}, [products]);

	return (
		<div className="flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">নতুন বিক্রয় (SO)</h1>
					<p className="text-sm text-slate-500">
						এক ইনভয়েসে মাল্টিপল প্রোডাক্ট/লট সেল করতে পারবেন।
					</p>
				</div>
				<div className="flex gap-2">
					<button
						className="btn btn-ghost"
						onClick={() => saveDraft(false)}
						disabled={isSaving}
					>
						Draft Save
					</button>
					<button
						className="btn btn-primary"
						onClick={() => saveDraft(true)}
						disabled={isSaving}
					>
						Save & Review
					</button>
				</div>
			</div>

			{/* Stepper */}
			<div className="card">
				<div className="flex items-center gap-6 text-sm">
					<Step n={1} label="Customer & Details" step={step} />
					<Step n={2} label="Lines (Product / Lot)" step={step} />
					<Step n={3} label="Extra Costs & Review" step={step} />
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{/* Left */}
				<div className="lg:col-span-2 flex flex-col gap-4">
					{/* STEP 1 */}
					{step === 1 && (
						<section className="card">
							<h3 className="text-lg font-semibold mb-3">
								Customer & Basic Info
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="md:col-span-2">
									<label className="block text-sm mb-1">Customer / Buyer</label>
									<BuyerPicker
										value={toBuyerPickerValue(customer)}
										onChange={(c) => onBuyerChange(c)}
									/>
								</div>
								<div>
									<label className="block text-sm mb-1">ডিস্ট্রিক্ট</label>
									<input
										className="input"
										value={customerDistrict}
										onChange={(e) => setCustomerDistrict(e.target.value)}
									/>
								</div>
								<div>
									<label className="block text-sm mb-1">এরিয়া / বাজার</label>
									<input
										className="input"
										value={customerMarket}
										onChange={(e) => setCustomerMarket(e.target.value)}
									/>
								</div>
								<div className="md:col-span-2">
									<label className="block text-sm mb-1">Address</label>
									<input
										className="input"
										value={customerAddress}
										onChange={(e) => setCustomerAddress(e.target.value)}
									/>
								</div>
							</div>

							<div className="flex items-center justify-end mt-4">
								<button className="btn btn-primary" onClick={() => setStep(2)}>
									Next
								</button>
							</div>
						</section>
					)}

					{/* STEP 2 */}
					{step === 2 && (
						<section className="card">
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-lg font-semibold">Sales Lines</h3>
							</div>

							<div className="space-y-4">
								{lines.map((ln, idx) => {
									const lineCategory = productCategoryByLine[ln.id] || "";
									const lineProductName = productNameByLine[ln.id] || "";
									const lineFilteredProducts = lineCategory
										? products.filter((p) => p.category === lineCategory)
										: [];
									const selectedLot = ln.lotId
										? lotCache.find((item) => item.id === ln.lotId) || null
										: null;
									const ratePerKg = ln.rateValue / KG_PER_MON;
									const lineSales = ln.qtyKg * ratePerKg;
									const lineCost = ln.qtyKg * (ln.avgCostPerKg || 0);
									const lineMargin = lineSales - lineCost;
									const isLoss =
										ln.qtyKg > 0 &&
										ln.avgCostPerKg > 0 &&
										ratePerKg < ln.avgCostPerKg;

									// ✅ Stock details
									const remainingKg = selectedLot
										? getRemainingLotForLine(selectedLot, idx)
										: Number(ln.availableKg || 0);
									const availMon = kgToMon(remainingKg);
									const availBags =
										ln.kgPerBag > 0
											? Math.floor(remainingKg / ln.kgPerBag)
											: null;
									const qtyExceeded = ln.qtyKg > 0 && ln.qtyKg > remainingKg;

									return (
										<div
											key={ln.id}
											className="border rounded-lg p-3 bg-slate-50/60"
										>
											<div className="flex items-center justify-between mb-2">
												<div className="text-xs font-medium text-slate-500">
													Line #{idx + 1}
												</div>
												{lines.length > 1 && (
													<button
														type="button"
														className="text-xs text-red-500 hover:underline"
														onClick={() => removeLine(idx)}
													>
														Remove
													</button>
												)}
											</div>

											<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
												{/* Lot */}

												<div className="md:col-span-1">
													<div>
														<label className="block text-xs mb-1">
															Product Category
														</label>
														<select
															className="input"
															value={lineCategory}
															onChange={(e) => {
																const nextCategory = e.target.value;
																setProductCategoryByLine((prev) => ({
																	...prev,
																	[ln.id]: nextCategory,
																}));
																setProductNameByLine((prev) => ({
																	...prev,
																	[ln.id]: "",
																}));
																setActiveLotLineId(ln.id);
																updateLine(idx, {
																	lotId: "",
																	lotLabel: "",
																	productId: "",
																	productType: "",
																	availableKg: 0,
																	avgCostPerKg: 0,
																	bagCount: 0,
																	kgPerBag: 0,
																	qtyKg: 0,
																	warn: "",
																});
															}}
														>
															<option value="">All Categories</option>
															{PRODUCT_CATEGORIES.map((category) => (
																<option
																	key={category.value}
																	value={category.value}
																>
																	{category.label}
																</option>
															))}
														</select>
													</div>
												</div>
												<div className="md:col-span-1">
													<label className="block text-xs mb-1">
														Product Name
													</label>

													<select
														className="input"
														value={lineProductName}
														onChange={(e) => {
															setProductNameByLine((prev) => ({
																...prev,
																[ln.id]: e.target.value,
															}));
															setActiveLotLineId(ln.id);
															updateLine(idx, {
																lotId: "",
																lotLabel: "",
																productId: "",
																productType: "",
																availableKg: 0,
																avgCostPerKg: 0,
																bagCount: 0,
																kgPerBag: 0,
																qtyKg: 0,
																warn: "",
															});
														}}
														disabled={!lineCategory}
													>
														<option value="">
															{lineCategory
																? "Select Product"
																: "Select category first"}
														</option>

														{lineFilteredProducts.map((product) => (
															<option key={product.id} value={product.name}>
																{product.name}
															</option>
														))}
													</select>
												</div>

												<div className="md:col-span-2 relative">
													<label className="block text-xs mb-1">
														Lot / Source
													</label>
													<input
														className="input"
														value={lotSearchByLine[ln.id] || ""}
														onFocus={() => {
															setActiveLotLineId(ln.id);
															setOpenLotDropdown((prev) => ({
																...prev,
																[ln.id]: true,
															}));
															if (!lotLoadedByLine[ln.id]) {
																setActiveLotLineId(ln.id);
															}
														}}
														onBlur={() => {
															setOpenLotDropdown((prev) => ({
																...prev,
																[ln.id]: false,
															}));
														}}
														onChange={(e) => {
															const nextValue = e.target.value;
															const prev = lotSearchByLine[ln.id] || "";

															setLotSearchByLine((p) => ({
																...p,
																[ln.id]: nextValue,
															}));
															setOpenLotDropdown((p) => ({
																...p,
																[ln.id]: true,
															}));

															// Only retrigger fetch if search text actually changed
															if (nextValue !== prev) {
																setActiveLotLineId(ln.id);
															}

															if (!nextValue) {
																updateLine(idx, {
																	lotId: "",
																	lotLabel: "",
																	productId: "",
																	productType: "",
																	availableKg: 0,
																	avgCostPerKg: 0,
																	bagCount: 0,
																	kgPerBag: 0,
																	qtyKg: 0,
																	warn: "",
																});
															}
														}}
														placeholder="Search or select lot..."
													/>
													{openLotDropdown[ln.id] && (
														<div
															className="absolute top-full left-0 right-0 mt-1 rounded-md border bg-white z-50 shadow-lg"
															onMouseDown={(e) => e.preventDefault()}
														>
															{(() => {
																const lotQuery = (lotSearchByLine[ln.id] || "")
																	.trim()
																	.toLowerCase();
																const dropdownLots = lotsByLine[ln.id] || [];
																const lineLotLoading = Boolean(
																	lotLoadingByLine[ln.id],
																);
																const lineLotError =
																	lotErrorByLine[ln.id] || "";
																const lineLotLoaded = Boolean(
																	lotLoadedByLine[ln.id],
																);
																const loadingLabel = lotQuery
																	? "লোট খোঁজা হচ্ছে..."
																	: "লোট লোড করা হচ্ছে...";

																return (
																	<>
																		<div className="flex items-center justify-between border-b px-3 py-2 text-[11px] text-slate-500">
																			<span>
																				{lotQuery
																					? "Search Results"
																					: "Recent Lots"}
																			</span>
																			<span>{dropdownLots.length} found</span>
																		</div>
																		<div className="max-h-44 overflow-auto">
																			{lineLotLoading ? (
																				<div className="px-3 py-2 text-xs text-slate-500">
																					{lotQuery
																						? "লোট খোঁজা হচ্ছে..."
																						: "লোট লোড করা হচ্ছে..."}
																				</div>
																			) : lineLotError ? (
																				<div className="px-3 py-2 text-xs text-red-600">
																					{lineLotError}
																				</div>
																			) : !lineLotLoaded ? (
																				// Not started loading yet — show spinner, not "not found"
																				<div className="px-3 py-2 text-xs text-slate-500">
																					লোট লোড করা হচ্ছে...
																				</div>
																			) : dropdownLots.length ? (
																				dropdownLots.map((lot) => {
																					const selected = lot.id === ln.lotId;
																					const remainingForLine =
																						getRemainingLotForLine(lot, idx);
																					const disabled =
																						!selected && remainingForLine <= 0;
																					return (
																						<button
																							key={lot.id}
																							type="button"
																							className={`w-full px-3 py-2 text-left text-xs border-b last:border-b-0 hover:bg-slate-50 ${
																								selected
																									? "bg-slate-100 font-medium"
																									: ""
																							} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
																							disabled={disabled}
																							onClick={() => {
																								onLotChange(idx, lot.id);
																								setOpenLotDropdown((prev) => ({
																									...prev,
																									[ln.id]: false,
																								}));
																							}}
																						>
																							<div>{formatLotLabel(lot)}</div>
																							<div className="text-[11px] text-slate-500">
																								{lot.productType} •{" "}
																								{fmtNum(remainingForLine, 3)} kg
																								remaining
																							</div>
																						</button>
																					);
																				})
																			) : (
																				<div className="px-3 py-2 text-xs text-slate-500">
																					কোনো লট পাওয়া যায়নি।
																				</div>
																			)}
																		</div>
																	</>
																);
															})()}
														</div>
													)}

													{lineCategory && (
														<p className="mt-1 text-[11px] text-slate-500">
															Showing lots for category: <b>{lineCategory}</b>
														</p>
													)}

													{/* ✅ show stock details */}
													{ln.lotId && (
														<div className="mt-1 text-[11px] text-slate-600 space-y-0.5">
															<div>
																Stock: <b>{fmtNum(remainingKg, 3)} kg</b> •{" "}
																<b>{fmtNum(availMon, 2)} মণ</b>
																{availBags !== null ? (
																	<>
																		{" "}
																		• <b>{availBags} বস্তা</b> (kg/Bag{" "}
																		{ln.kgPerBag})
																	</>
																) : (
																	<>
																		{" "}
																		•{" "}
																		<span className="text-slate-500">
																			বস্তা দেখতে kg/Bag দিন
																		</span>
																	</>
																)}
															</div>
															{ln.avgCostPerKg > 0 && (
																<div>
																	Avg Cost: {fmtMoney(ln.avgCostPerKg)} /kg (
																	{fmtMoney(ln.avgCostPerKg * KG_PER_MON)} /মণ)
																</div>
															)}
														</div>
													)}

													{/* ✅ warning when clamped */}
													{ln.warn && (
														<div className="mt-1 text-[11px] text-red-600">
															{ln.warn}
														</div>
													)}
													{qtyExceeded && (
														<div className="mt-1 text-[11px] text-red-600">
															এই ইনপুট remaining stock এর বেশি হচ্ছে।
														</div>
													)}
												</div>

												{/* Product */}
												{/* <div>
													<label className="block text-xs mb-1">Product</label>
													<select
														className="input"
														value={ln.productId}
														onChange={(e) => {
															const p = products.find(
																(p) => p.id === e.target.value,
															);

															updateLine(idx, {
																productId: p?.id || "",
																productType: p?.name || "",
															});
														}}
													>
														<option value="">Select Product</option>
														{products.map((p) => (
															<option key={p.id} value={p.id}>
																{p.name} ({p.code})
															</option>
														))}
													</select>

													<input
														className="input bg-slate-100"
														value={ln.productType || ""}
														placeholder="Auto from lot"
														readOnly
													/>
												</div> */}

												{/* Bags */}
												<div>
													<label className="block text-xs mb-1">Bags</label>
													<input
														className="input"
														type="number"
														min={0}
														max={availBags ?? undefined} // ✅ browser-level guard
														value={ln.bagCount || ""}
														onChange={(e) =>
															updateLine(idx, {
																bagCount: Number(e.target.value || 0),
															})
														}
													/>
													{availBags !== null && (
														<p className="text-[11px] text-slate-500 mt-1">
															Max: <b>{availBags} বস্তা</b>
														</p>
													)}
												</div>

												{/* kg per bag */}
												<div>
													<label className="block text-xs mb-1">kg / Bag</label>
													<input
														className="input"
														type="number"
														value={ln.kgPerBag || ""}
														readOnly
													/>
													<p className="text-[11px] text-slate-500 mt-1">
														Qty: <b>{fmtNum(ln.qtyKg, 3)} kg</b> •{" "}
														<b>{fmtNum(ln.qtyKg / KG_PER_MON, 2)} মণ</b>
													</p>
													{ln.availableKg > 0 &&
														ln.qtyKg > 0 &&
														ln.qtyKg > ln.availableKg && (
															<p className="text-[11px] text-red-600 mt-1">
																⚠ Stock এর বেশি দেয়া যাবে না
															</p>
														)}
												</div>

												{/* Rate */}
												<div>
													<label className="block text-xs mb-1">
														Rate Basis
													</label>
													<div className="flex rounded-lg border overflow-hidden bg-white">
														<button
															type="button"
															className={`flex-1 text-xs py-1 ${ln.rateBasis === "perMon" ? "bg-slate-900 text-white" : ""}`}
															onClick={() =>
																updateLine(idx, { rateBasis: "perMon" })
															}
														>
															৳/মণ
														</button>
														<button
															type="button"
															className={`flex-1 text-xs py-1 ${ln.rateBasis === "perKg" ? "bg-slate-900 text-white" : ""}`}
															onClick={() =>
																updateLine(idx, { rateBasis: "perKg" })
															}
														>
															৳/কেজি
														</button>
														<button
															type="button"
															className={`flex-1 text-xs py-1 ${ln.rateBasis === "perBag" ? "bg-slate-900 text-white" : ""}`}
															onClick={() =>
																updateLine(idx, { rateBasis: "perBag" })
															}
														>
															৳/বস্তা
														</button>
													</div>

													<input
														className="input mt-1"
														type="number"
														value={ln.rateValue || ""}
														onChange={(e) =>
															updateLine(idx, {
																rateValue: Number(e.target.value || 0),
															})
														}
														placeholder={
															ln.rateBasis === "perMon"
																? "যেমন: 1600"
																: ln.rateBasis === "perKg"
																	? "যেমন: 40"
																	: "যেমন: 2000"
														}
													/>

													{ln.rateValue > 0 && (
														<p className="text-[11px] text-slate-500 mt-1">
															{ln.rateBasis === "perBag" && ln.kgPerBag > 0 ? (
																<>
																	Effective:{" "}
																	{fmtMoney(ln.rateValue / ln.kgPerBag)} /kg
																</>
															) : ln.rateBasis === "perMon" ? (
																<>
																	Effective:{" "}
																	{fmtMoney(ln.rateValue / KG_PER_MON)} /kg
																</>
															) : (
																<>Effective: {fmtMoney(ln.rateValue)} /kg</>
															)}
														</p>
													)}
												</div>
											</div>

											<CostWarning
												lotId={ln.lotId}
												avgCostPerKg={ln.avgCostPerKg}
												rateBasis={ln.rateBasis}
												rateValue={Number(ln.rateValue || 0)}
												kgPerBag={ln.kgPerBag}
											/>

											{ln.qtyKg > 0 && ln.rateValue > 0 && (
												<div className="mt-2 text-xs flex flex-wrap justify-between gap-2">
													<div>
														Sales: <b>{fmtMoney(lineSales)}</b> | Est. Cost:{" "}
														<b>{fmtMoney(lineCost)}</b> | Margin:{" "}
														<b
															className={
																lineMargin < 0
																	? "text-red-500"
																	: "text-emerald-600"
															}
														>
															{fmtMoney(lineMargin)}
														</b>
													</div>
													{isLoss && (
														<div className="text-red-600 font-medium">
															⚠ এই লাইনে আপনি লসে বিক্রি করছেন
														</div>
													)}
												</div>
											)}
										</div>
									);
								})}
							</div>

							<div className="flex justify-between mt-4">
								<button className="btn btn-ghost btn-sm" onClick={addLine}>
									+ Add Sell
								</button>
								<div>
									<button
										className="btn btn-ghost mx-5"
										onClick={() => setStep(1)}
									>
										Back
									</button>
									<button
										className="btn btn-primary"
										onClick={() => setStep(3)}
									>
										Next
									</button>
								</div>
							</div>
						</section>
					)}

					{/* STEP 3 */}
					{step === 3 && (
						<section className="card">
							<h3 className="text-lg font-semibold mb-3">
								Extra Costs & Review
							</h3>

							<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
								<Input
									label="Transport"
									value={transport}
									onChange={setTransport}
									placeholder="যেমন: 5000"
								/>
								<Input
									label="Loading/Unloading"
									value={loadingUnloading}
									onChange={setLoadingUnloading}
									placeholder="যেমন: 2000"
								/>
								<Input
									label="Misc"
									value={misc}
									onChange={setMisc}
									placeholder="যেমন: 500"
								/>
								<Input
									label="Remarks"
									value={remarks}
									onChange={setRemarks}
									placeholder="ঐচ্ছিক"
								/>
							</div>

							<div className="mt-4 p-3 rounded-lg border bg-slate-50 text-sm space-y-1">
								<div>
									মোট Qty: <b>{fmtNum(summary.totalKg, 3)} kg</b> •{" "}
									<b>{fmtNum(summary.totalKg / KG_PER_MON, 2)} মণ</b>
								</div>
								<div>
									Gross Sales: <b>{fmtMoney(summary.grossSales)}</b>
								</div>
								<div>
									Est. Cost: <b>{fmtMoney(summary.estCost)}</b>
								</div>
								<div>
									Gross Margin:{" "}
									<b
										className={
											summary.grossMargin < 0
												? "text-red-600"
												: "text-emerald-600"
										}
									>
										{fmtMoney(summary.grossMargin)}
									</b>
								</div>
								{summary.hasLoss && (
									<div className="text-red-600 font-semibold mt-1">
										⚠ কিছু লাইন লসে সেল হচ্ছে — নিশ্চিত হয়ে সেভ করুন।
									</div>
								)}
							</div>

							<div className="flex items-center justify-between mt-4">
								<button className="btn btn-ghost" onClick={() => setStep(2)}>
									Back
								</button>
								<div className="flex gap-2">
									<button
										className="btn btn-ghost"
										onClick={() => saveDraft(false)}
										disabled={isSaving}
									>
										Draft Save
									</button>
									<button
										className="btn btn-primary"
										onClick={() => saveDraft(true)}
										disabled={isSaving}
									>
										Save & Review
									</button>
								</div>
							</div>
						</section>
					)}
				</div>

				{/* Sidebar */}
				<aside className="card h-max sticky top-6">
					<h3 className="text-lg font-semibold mb-3">সারাংশ</h3>
					<ul className="text-sm space-y-2">
						<li className="flex justify-between">
							<span>Customer</span>
							<b>{customer?.name || "-"}</b>
						</li>
						<li className="flex justify-between">
							<span>Address</span>
							<b className="text-right">
								{[customerDistrict, customerMarket, customerAddress]
									.filter(Boolean)
									.join(" • ") || "-"}
							</b>
						</li>
						<li className="flex justify-between border-t pt-2">
							<span>Total Lines</span>
							<b>{lines.length}</b>
						</li>
						<li className="flex justify-between">
							<span>Total Qty (kg)</span>
							<b>{fmtNum(summary.totalKg, 3)}</b>
						</li>
						<li className="flex justify-between">
							<span>Gross Sales</span>
							<b>{fmtMoney(summary.grossSales)}</b>
						</li>
						<li className="flex justify-between">
							<span>Est. Cost</span>
							<b>{fmtMoney(summary.estCost)}</b>
						</li>
						<li className="flex justify-between">
							<span>Gross Margin</span>
							<b
								className={
									summary.grossMargin < 0 ? "text-red-600" : "text-emerald-600"
								}
							>
								{fmtMoney(summary.grossMargin)}
							</b>
						</li>
						<li className="flex justify-between">
							<span>Transport</span>
							<b>{fmtMoney(Number(transport || 0))}</b>
						</li>
						<li className="flex justify-between">
							<span>L/UL + Misc</span>
							<b>
								{fmtMoney(Number(loadingUnloading || 0) + Number(misc || 0))}
							</b>
						</li>
					</ul>
				</aside>
			</div>
		</div>
	);
}

/* helpers */
function Step({ n, label, step }: { n: number; label: string; step: number }) {
	return (
		<div className="flex items-center gap-2">
			<span
				className={`h-7 w-7 grid place-items-center rounded-full border ${
					step >= n
						? "border-brand bg-brand text-white"
						: "border-slate-300 text-slate-600"
				}`}
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
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
}) {
	return (
		<div>
			<label className="block text-sm mb-1">{label}</label>
			<input
				className="input"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
			/>
		</div>
	);
}
