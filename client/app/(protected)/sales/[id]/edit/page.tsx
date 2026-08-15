'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import CostWarning from '@/components/CostWarning';
import {
	getSalesOrderById,
	updateSalesOrderDraft,
	getLots,
	type SalesOrderDto,
} from "@/lib/api/sales";
import { getPurchaseOrderById } from "@/lib/api/purchase";
import { getBusinessInfo } from "@/lib/api/businessInfo";
import {
	createCustomer,
	getCustomers,
	type CustomerDto,
} from "@/lib/api/masters";
import { getProducts, type ProductDto } from "@/lib/api/products";
import { nf } from "@/lib/i18n";
import { promptPassword, promptText, showError, showSuccess } from "@/lib/swal";

type RateBasis = "perMon" | "perKg" | "perBag";
type Customer = {
	id: string;
	name: string;
	address?: string;
	district?: string;
	market?: string;
	phone?: string;
	type?: string;
};
type SalesOrder = {
	id: string;
	status?: "draft" | "confirmed";
	soNo?: string;
	customerId: string;
	customerSnapshot: Customer;
	items: Array<{
		lotId: string;
		productType: string;
		qtyKg: number;
		rateBasis: RateBasis;
		rateValue: number;
		bagCount?: number;
		kgPerBag?: number;
	}>;
	transport: number;
	loadingUnloading: number;
	misc: number;
	remarks?: string;
};
type Lot = {
	id: string;
	label?: string;
	productType: string;
	productId?: string;
	availableKg: number;
	avgCostPerKg: number;
	createdAt: string;
	meta?: Record<string, unknown>;
	sourcePo?: {
		id?: string;
		poNo?: string;
		destinationCustomerId?: string;
		destinationCustomer?: {
			id?: string;
			name?: string;
			district?: string;
			market?: string;
			address?: string;
			phone?: string;
			type?: string;
		};
	};
};

const KG_PER_MON = 40;

const PRODUCT_CATEGORIES = [
	{ value: "ধান", label: "ধান" },
	{ value: "চাল", label: "চাল" },
	{ value: "গম", label: "গম" },
	{ value: "ভুট্টা", label: "ভুট্টা" },
	{ value: "সরিষা", label: "সরিষা" },
	{ value: "অন্যান্য", label: "অন্যান্য" },
];

type LotLike = {
	id: string;
	avgCostPerKg?: number;
	label?: string;
};

type SaleLineLike = {
	lotId: string;
	rateBasis: "perKg" | "perMon" | "perBag";
	rateValue: number | string;
	kgPerBag?: number;
};

function calcLineCostInfo(line: SaleLineLike, lots: LotLike[]) {
	const lot = lots.find((l) => l.id === line.lotId) as any;
	const avgCostPerKg = Number(lot?.avgCostPerKg || 0);

	const rateValueNum = Number(line.rateValue || 0);
	let saleRatePerKg = 0;
	if (line.rateBasis === "perKg") saleRatePerKg = rateValueNum;
	else if (line.rateBasis === "perMon")
		saleRatePerKg = rateValueNum / KG_PER_MON;
	else if (line.rateBasis === "perBag") {
		const kpb = Number(lot?.meta?.kgPerBag || 0);
		saleRatePerKg = kpb > 0 ? rateValueNum / kpb : rateValueNum / KG_PER_MON;
	}

	const marginPerKg = saleRatePerKg - avgCostPerKg;
	const marginPct = avgCostPerKg > 0 ? (marginPerKg / avgCostPerKg) * 100 : 0;

	return { lot, avgCostPerKg, saleRatePerKg, marginPerKg, marginPct };
}

function getLotDefaultKgPerBag(lot: Lot): number {
	const raw = lot.meta?.kgPerBag;
	const parsed = Number(raw);
	if (Number.isFinite(parsed) && parsed > 0) return parsed;

	const bagCount = Number(lot.meta?.bagCount);
	const availableKg = Number(lot.availableKg || 0);
	if (Number.isFinite(bagCount) && bagCount > 0 && availableKg > 0) {
		return availableKg / bagCount;
	}

	return 0;
}

function getLotDefaultBagCount(lot: Lot): number {
	const raw = lot.meta?.remainingBagCount ?? lot.meta?.bagCount;
	const parsed = Number(raw);
	if (Number.isFinite(parsed) && parsed > 0) return parsed;

	const kgPerBag = getLotDefaultKgPerBag(lot);
	const availableKg = Number(lot.availableKg || 0);
	return kgPerBag > 0 ? Math.floor(availableKg / kgPerBag) : 0;
}

const fmtMoney = (n: number) =>
	`৳ ${nf(Math.round((n || 0) * 100) / 100, { maximumFractionDigits: 2 })}`;
const fmtNum = (n: number, max = 2) =>
	nf(Number(n || 0), { maximumFractionDigits: max });

type SalesLine = {
	id: string;
	itemId?: string;
	lotId: string;
	lotLabel: string;
	productType: string;
	availableKg: number;
	avgCostPerKg: number;

	bagCount: number;
	kgPerBag: number;
	qtyKg: number;

	rateBasis: RateBasis;
	rateValue: number;

	warn?: string;
};

function safeNum(v: any) {
	if (typeof v === "number") return Number.isFinite(v) ? v : 0;
	if (typeof v === "string") {
		const parsed = Number(v);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	if (v && typeof v === "object") {
		if (typeof v.toNumber === "function") {
			const parsed = v.toNumber();
			return Number.isFinite(parsed) ? parsed : 0;
		}
		if (typeof v.toString === "function") {
			const text = v.toString();
			if (text !== "[object Object]") {
				const parsed = Number(text);
				return Number.isFinite(parsed) ? parsed : 0;
			}
		}
		const decimalLike = v as { d?: unknown; e?: unknown; s?: unknown };
		if (Array.isArray(decimalLike.d) && typeof decimalLike.e === "number") {
			const chunks = decimalLike.d
				.map((chunk, index) => String(Math.abs(Number(chunk || 0))))
				.filter((chunk) => chunk.length > 0);
			if (chunks.length) {
				const coefficient =
					chunks[0] +
					chunks
						.slice(1)
						.map((chunk) => chunk.padStart(7, "0"))
						.join("");
				const sign = decimalLike.s === -1 ? -1 : 1;
				const digits = coefficient.replace(/^0+/, "") || "0";
				if (digits === "0") return 0;
				const exponent = decimalLike.e;
				const scaled =
					Number(digits) * Math.pow(10, exponent - digits.length + 1);
				if (Number.isFinite(scaled)) return sign * scaled;
			}
		}
	}
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

function clampToStock(line: SalesLine) {
	const availableKg = safeNum(line.availableKg);
	const bagCount = Math.max(0, safeNum(line.bagCount));
	const kgPerBag = Math.max(0, safeNum(line.kgPerBag));

	let qtyKg = bagCount * kgPerBag;
	let warn = "";

	// If both bagCount and kgPerBag are used → clamp using maxBags
	if (kgPerBag > 0 && availableKg > 0) {
		const maxBags = Math.floor(availableKg / kgPerBag);
		if (bagCount > maxBags) {
			const newBag = maxBags;
			qtyKg = newBag * kgPerBag;
			warn = `⚠ স্টক অনুযায়ী সর্বোচ্চ ${maxBags} বস্তা সম্ভব`;
			return { ...line, bagCount: newBag, qtyKg, warn };
		}
	}

	// Fallback clamp in kg
	if (qtyKg > availableKg) {
		qtyKg = availableKg;
		warn = "⚠ স্টক-এর বেশি দেয়া যাবে না";
	}

	return { ...line, qtyKg, warn };
}

function normalizeLotForEdit(lot: any): Lot {
	return {
		id: lot.id,
		label: lot.label || "",
		productType: lot.productType || "-",
		productId: lot.productId || "",
		availableKg: Number(lot.availableKg || 0),
		avgCostPerKg: Number(lot.avgCostPerKg || 0),
		createdAt: lot.createdAt || new Date().toISOString(),
		meta: lot.meta || {},
		sourcePo:
			lot.sourcePo ||
			(lot.meta?.poId
				? {
						id: lot.meta.poId,
						poNo: lot.poNo,
						destinationCustomerId: lot.destinationCustomerId,
						destinationCustomer: lot.destinationCustomer,
					}
				: undefined),
	};
}

function mergeLotsForEdit(activeLots: Lot[], so: any): Lot[] {
	const merged = new Map<string, Lot>();
	activeLots.forEach((lot) => merged.set(lot.id, lot));

	const sourceItems = Array.isArray(so?.items) ? so.items : [];
	const snapshotItems = Array.isArray(so?.itemsSnapshot)
		? so.itemsSnapshot
		: [];

	sourceItems.forEach((item: any, idx: number) => {
		const resolvedLotId = item?.lotId || item?.lot?.id || "";
		if (!resolvedLotId || merged.has(resolvedLotId)) return;

		const snapshotItem = snapshotItems[idx] || {};
		const lot = item?.lot || {};
		merged.set(
			resolvedLotId,
			normalizeLotForEdit({
				id: resolvedLotId,
				label: item?.lotLabel || lot.label || resolvedLotId,
				productType:
					item?.productType ||
					lot.productType ||
					snapshotItem.productType ||
					"-",
				productId: lot.productId || "",
				availableKg: lot.availableKg ?? 0,
				avgCostPerKg: item?.avgCostPerKg ?? lot.avgCostPerKg ?? 0,
				createdAt:
					lot.createdAt ||
					so?.createdAt ||
					so?.confirmedAt ||
					new Date().toISOString(),
				meta: {
					...(lot.meta || {}),
					kgPerBag:
						item?.kgPerBag ?? snapshotItem.kgPerBag ?? lot?.meta?.kgPerBag,
					bagCount:
						lot?.meta?.remainingBagCount ??
						lot?.meta?.bagCount ??
						item?.bagCount ??
						snapshotItem.bagCount,
					initialBagCount: lot?.meta?.initialBagCount ?? lot?.meta?.bagCount,
					remainingBagCount:
						lot?.meta?.remainingBagCount ?? lot?.meta?.bagCount,
				},
				sourcePo: lot.sourcePo,
			}),
		);
	});

	return Array.from(merged.values()).sort((a, b) =>
		(b.createdAt || "").localeCompare(a.createdAt || ""),
	);
}

export default function SalesEditPage() {
	const router = useRouter();
	const params = useParams();
	const soId = params?.id as string | undefined;

	const [loaded, setLoaded] = useState(false);
	const [sourceSO, setSourceSO] = useState<(SalesOrder | SalesOrderDto) | null>(
		null,
	);
	const [operationPass, setOperationPass] = useState("");
	const [operationPassReady, setOperationPassReady] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const [step, setStep] = useState(1);

	// Customer
	const [customer, setCustomer] = useState<Customer | null>(null);
	const [customers, setCustomers] = useState<CustomerDto[]>([]);
	const [customerAddress, setCustomerAddress] = useState("");
	const [customerDistrict, setCustomerDistrict] = useState("");
	const [customerMarket, setCustomerMarket] = useState("");

	// Lines
	const [lots, setLots] = useState<Lot[]>([]);
	const [products, setProducts] = useState<ProductDto[]>([]);
	const [lines, setLines] = useState<SalesLine[]>([]);
	const [lineCategoryByLine, setLineCategoryByLine] = useState<
		Record<string, string>
	>({});
	const [lineProductByLine, setLineProductByLine] = useState<
		Record<string, string>
	>({});
	const [lotSearchByLine, setLotSearchByLine] = useState<
		Record<string, string>
	>({});
	const [openLotDropdown, setOpenLotDropdown] = useState<
		Record<string, boolean>
	>({});

	// map of lotId -> qty originally allocated to this SO (used to show effective available when editing a confirmed SO)
	const [originalAllocatedPerLot, setOriginalAllocatedPerLot] = useState<
		Record<string, number>
	>({});
	const [historicalLotIds, setHistoricalLotIds] = useState<
		Record<string, boolean>
	>({});

	// Extras
	const [transport, setTransport] = useState("0");
	const [loadingUnloading, setLoadingUnloading] = useState("0");
	const [misc, setMisc] = useState("0");
	const [remarks, setRemarks] = useState("");

	useEffect(() => {
		if (!soId) return;
		let active = true;

		(async () => {
			try {
				const so = await getSalesOrderById(soId);
				if (!active) return;

				// Draft SO can be edited without operation password.
				const isDraft =
					String((so as any)?.status || "").toLowerCase() === "draft";
				if (isDraft) {
					setOperationPass("");
					setOperationPassReady(true);
					return;
				}

				const entered = await promptPassword(
					"Operation Password দিন",
					"SO edit page-এ ঢুকতে operation password দিন।",
				);
				if (!active) return;
				if (!entered) {
					router.push(`/sales/${soId}`);
					return;
				}

				const info = await getBusinessInfo();
				if (!active) return;
				const expected = String(info?.operationPass || "").trim();
				if (!expected) {
					await showError("Business info-তে operation password সেট করা নেই।");
					router.push(`/sales/${soId}`);
					return;
				}

				if (entered !== expected) {
					await showError("Operation password ভুল।");
					router.push(`/sales/${soId}`);
					return;
				}

				setOperationPass(entered);
				setOperationPassReady(true);
			} catch (e: any) {
				if (!active) return;
				await showError(e?.message || "Operation password যাচাই ব্যর্থ হয়েছে");
				router.push(`/sales/${soId}`);
			}
		})();

		return () => {
			active = false;
		};
	}, [router, soId]);

	// --------- LOAD EXISTING SO -------------
	useEffect(() => {
		if (!operationPassReady) return;
		if (!soId) return;
		const salesOrderId = soId;

		let mounted = true;

		async function loadSO() {
			try {
				const remote = await getSalesOrderById(salesOrderId);
				if (!mounted) return;
				if (!remote) {
					setLoaded(true);
					return;
				}

				setSourceSO(remote);

				const [apiLots, customerItems, productItems] = await Promise.all([
					getLots({ available: true }),
					getCustomers().catch(() => []),
					getProducts().catch(() => []),
				]);

				console.debug("getLots response sample:", apiLots?.slice?.(0, 5));

				// If some lots lack sourcePo but have meta.poId, prefetch those POs
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
								// ignore
							}
						}),
					);
				}

				const normalizedActiveLots = apiLots.map((lot) =>
					normalizeLotForEdit({
						...lot,
						sourcePo:
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
								: undefined),
					}),
				);

				const allLots = mergeLotsForEdit(normalizedActiveLots, remote);
				setLots(allLots);
				setCustomers(customerItems);
				setProducts(productItems.filter((product) => product.active));
				hydrateFromSO(
					remote as any,
					allLots,
					productItems.filter((product) => product.active),
				);
				setLoaded(true);
			} catch {
				if (!mounted) return;
				setLots([]);
				setCustomers([]);
				setProducts([]);
				setLoaded(true);
			}
		}

		function hydrateFromSO(
			so: any,
			lotsList: Lot[],
			productsList: ProductDto[],
		) {
			function pickText(...values: unknown[]) {
				for (const value of values) {
					if (typeof value === "string" && value.trim()) return value;
				}
				return "";
			}

			const snapshotItems = Array.isArray(so.itemsSnapshot)
				? so.itemsSnapshot
				: [];
			const originalItems = Array.isArray(so.items) ? so.items : [];
			const isConfirmed =
				String((so as any).status || "").toLowerCase() === "confirmed";

			const sourceItems =
				isConfirmed && snapshotItems.length > 0
					? snapshotItems
					: originalItems.length > 0
						? originalItems
						: snapshotItems;

			// build map of originally-allocated kg per lot for this SO
			const allocated: Record<string, number> = {};
			(originalItems.length ? originalItems : sourceItems).forEach(
				(it: any) => {
					const resolvedLotId = it?.lotId || it?.lot?.id || "";
					if (!resolvedLotId) return;
					allocated[resolvedLotId] =
						(allocated[resolvedLotId] || 0) + safeNum(it.qtyKg);
				},
			);
			setOriginalAllocatedPerLot(isConfirmed ? allocated : {});
			setHistoricalLotIds(
				Object.keys(allocated).reduce<Record<string, boolean>>((acc, key) => {
					acc[key] = true;
					return acc;
				}, {}),
			);
			const snap = so.customerSnapshot || so.customer || {};
			const cust: Customer = {
				id: so.customerId || snap.id || "",
				name: pickText(snap?.name),
				address: pickText(snap?.address) || undefined,
				district: pickText(snap?.district) || undefined,
				market: pickText(snap?.market) || undefined,
				phone: pickText(snap?.phone) || undefined,
				type: pickText(snap?.type) || undefined,
			};
			setCustomer(cust);
			setCustomerAddress(pickText(snap?.address));
			setCustomerDistrict(pickText(snap?.district));
			setCustomerMarket(pickText(snap?.market));

			const sourceItemsForLines = sourceItems;
			const usedOriginalIdx = new Set<number>();
			const hasSnapshot = snapshotItems.length > 0;

			const mappedLines: SalesLine[] = (sourceItemsForLines || []).map(
				(it: any, idx: number) => {
					// try to preserve original item id when possible
					let itemId: string | undefined = undefined;
					const matchIdx = originalItems.findIndex(
						(o: any, i: number) =>
							!usedOriginalIdx.has(i) &&
							o.lotId === it.lotId &&
							Number(o.qtyKg) === Number(it.qtyKg),
					);
					if (matchIdx >= 0) {
						itemId = originalItems[matchIdx].id;
						usedOriginalIdx.add(matchIdx);
					} else if (originalItems[idx]) {
						itemId = originalItems[idx].id;
						usedOriginalIdx.add(idx);
					}
					const origByMatch = itemId
						? originalItems.find((o: any) => o.id === itemId) || null
						: matchIdx >= 0
							? originalItems[matchIdx]
							: originalItems[idx] || null;
					const resolvedLotId = it?.lotId || it?.lot?.id || "";
					const lot = lotsList.find((l) => l.id === resolvedLotId);
					const originalProduct =
						(origByMatch as any)?.product ||
						((origByMatch as any)?.productId
							? productsList.find(
									(p) => p.id === (origByMatch as any).productId,
								)
							: null);
					const qtyKg = safeNum(it.qtyKg);

					const snapshotItem = snapshotItems[idx] || null;
					const rawBagCount = safeNum(it.bagCount ?? snapshotItem?.bagCount);
					const rawKgPerBag = safeNum(
						it.kgPerBag ??
							snapshotItem?.kgPerBag ??
							lot?.meta?.kgPerBag ??
							(lot ? getLotDefaultKgPerBag(lot) : 0),
					);
					const displayKgPerBag =
						rawKgPerBag > 0
							? rawKgPerBag
							: rawBagCount > 0 && qtyKg > 0
								? qtyKg / rawBagCount
								: 0;
					const displayBagCount =
						rawBagCount > 0
							? rawBagCount
							: displayKgPerBag > 0 && qtyKg > 0
								? qtyKg / displayKgPerBag
								: 0;

					// Add back currently-allocated qty for this SO so the editor can reallocate
					const effectiveAvailable =
						safeNum(lot?.availableKg) + (allocated[lot?.id || ""] || 0);

					const base: SalesLine = {
						id: `L${idx + 1}`,
						itemId,
						lotId: resolvedLotId,
						lotLabel:
							it.lotLabel ||
							it?.lot?.label ||
							lot?.label ||
							lot?.id ||
							resolvedLotId,
						productType:
							pickText(
								it.productType,
								originalProduct?.name,
								lot?.productType,
							) || "",
						availableKg: effectiveAvailable,
						avgCostPerKg: safeNum(it.avgCostPerKg ?? lot?.avgCostPerKg),

						bagCount: displayBagCount,
						kgPerBag: displayKgPerBag,
						qtyKg,

						rateBasis: it.rateBasis,
						rateValue: safeNum(it.rateValue),
						warn: "",
					};

					// For confirmed SOs, don't clamp to stock - use exact snapshot values
					if (isConfirmed && hasSnapshot) {
						return { ...base, warn: "" };
					}
					// For drafts, clamp to available stock
					return clampToStock(base);
				},
			);

			const finalLines = mappedLines.length
				? mappedLines
				: [
						{
							id: "L1",
							lotId: "",
							lotLabel: "",
							productType: "",
							availableKg: 0,
							avgCostPerKg: 0,
							bagCount: 0,
							kgPerBag: 0,
							qtyKg: 0,
							rateBasis: "perMon" as RateBasis,
							rateValue: 0,
							warn: "",
						},
					];

			setLines(finalLines);

			const lineCategories: Record<string, string> = {};
			const lineProducts: Record<string, string> = {};

			// Try to populate category/name from lot -> product mapping when possible.
			// If no lot or product is available, fall back to any data present in the
			// saved source items (itemsSnapshot / items) or the mapped line fields.
			finalLines.forEach((ln, idx) => {
				let setCat = "";
				let setProd = "";

				// Prefer the original saved item (so.items) which includes product relation
				const origById = originalItems.find(
					(o: any) => o.id && o.id === ln.itemId,
				);
				const origByMatch = origById
					? origById
					: originalItems.find(
							(o: any) =>
								o.lotId === ln.lotId && Number(o.qtyKg) === Number(ln.qtyKg),
						);

				if (origByMatch) {
					if ((origByMatch as any).product) {
						setCat = (origByMatch as any).product.category || "";
						setProd = (origByMatch as any).product.name || "";
					} else if ((origByMatch as any).productId) {
						const prod = productsList.find(
							(p) => p.id === (origByMatch as any).productId,
						);
						if (prod) {
							setCat = prod.category || "";
							setProd = prod.name || "";
						}
					}
				}

				// If we have a product name but no category yet, try to lookup by name
				if (!setCat && setProd) {
					const prodByName = productsList.find((p) => p.name === setProd);
					if (prodByName) setCat = prodByName.category || "";
				}

				// If still missing, try lot -> product mapping
				if (!setCat && ln.lotId) {
					const lot = lotsList.find((l) => l.id === ln.lotId);
					if (lot) {
						const product = productsList.find((p) => p.id === lot.productId);
						if (product) {
							setCat = product.category || "";
							setProd = product.name || "";
						}
					}
				}

				// Final fallback: use whatever was saved in the sourceItems (itemsSnapshot)
				const src = (sourceItems && sourceItems[idx]) || null;
				if (!setCat) {
					setCat = (src && (src.category || src.productCategory)) || "";
				}
				if (!setProd) {
					setProd =
						(src &&
							(src.productName ||
								(src.product && src.product.name) ||
								src.productType)) ||
						"";
				}

				if (setCat) lineCategories[ln.id] = setCat;
				if (setProd) lineProducts[ln.id] = setProd;
			});

			setLineCategoryByLine(lineCategories);
			setLineProductByLine(lineProducts);

			// Pre-fill lot search inputs so they show the saved lot label
			const lotLabels: Record<string, string> = {};
			finalLines.forEach((ln) => {
				if (ln.lotId && ln.lotLabel) {
					lotLabels[ln.id] = ln.lotLabel;
				}
			});
			setLotSearchByLine(lotLabels);
			setLotSearchByLine(lotLabels);

			const transportValue = safeNum(
				so.transport ?? so.totals?.transport ?? so.totalsJson?.transport,
			);
			const loadingValue = safeNum(
				so.loadingUnloading ??
					so.totals?.loadingUnloading ??
					so.totalsJson?.loadingUnloading,
			);
			const miscValue = safeNum(
				so.misc ?? so.totals?.misc ?? so.totalsJson?.misc,
			);

			setTransport(String(transportValue));
			setLoadingUnloading(String(loadingValue));
			setMisc(String(miscValue));
			setRemarks(so.remarks || "");
		}

		loadSO();

		return () => {
			mounted = false;
		};
	}, [soId, operationPassReady]);

	useEffect(() => {
		if (!products.length || !lines.length) return;

		setLineCategoryByLine((prev) => {
			const next = { ...prev };
			lines.forEach((ln) => {
				if (next[ln.id]) return; // already set
				const lot = lots.find((l) => l.id === ln.lotId);
				if (!lot) return;
				const product = products.find((p) => p.id === lot.productId);
				if (product) next[ln.id] = product.category || "";
			});
			return next;
		});

		setLineProductByLine((prev) => {
			const next = { ...prev };
			lines.forEach((ln) => {
				if (next[ln.id]) return;
				const lot = lots.find((l) => l.id === ln.lotId);
				if (!lot) return;
				const product = products.find((p) => p.id === lot.productId);
				if (product) next[ln.id] = product.name || "";
			});
			return next;
		});
	}, [products, lots, lines]);

	function onCustomerChange(c: Customer) {
		setCustomer(c);
		setCustomerAddress(c.address || "");
		setCustomerDistrict(c.district || "");
		setCustomerMarket(c.market || "");
	}

	function getRemainingLotForLine(lot: Lot, lineIndex: number) {
		const isConfirmedEdit =
			String((sourceSO as any)?.status || "").toLowerCase() === "confirmed";
		const baseAvailable =
			safeNum(lot.availableKg) +
			(isConfirmedEdit ? originalAllocatedPerLot[lot.id] || 0 : 0);
		const allocatedBefore = lines.slice(0, lineIndex).reduce((sum, line) => {
			if (line.lotId !== lot.id) return sum;
			return sum + safeNum(line.qtyKg);
		}, 0);

		return Math.max(0, baseAvailable - allocatedBefore);
	}

	function getRemainingBagsForLine(lot: Lot, lineIndex: number) {
		const kgPerBag = getLotDefaultKgPerBag(lot);
		if (kgPerBag <= 0) return 0;

		return Math.max(
			0,
			Math.floor(getRemainingLotForLine(lot, lineIndex) / kgPerBag),
		);
	}

	async function onCustomerSelect(customerId: string) {
		if (customerId === "__new__") {
			const name = await promptText("New customer name");
			if (!name?.trim()) return;
			try {
				const created = await createCustomer({
					name: name.trim(),
					type: "mill",
				});
				setCustomers((prev) => {
					if (prev.some((c) => c.id === created.id)) return prev;
					return [created, ...prev];
				});
				setCustomer({
					id: created.id,
					name: created.name,
					address: created.address,
					district: created.district,
					market: created.market,
					phone: created.phone,
					type: created.type || "mill",
				});
				setCustomerAddress(created.address || "");
				setCustomerDistrict(created.district || "");
				setCustomerMarket(created.market || "");
			} catch (e: any) {
				await showError(e?.message || "Unable to create customer");
			}
			return;
		}

		const selected = customers.find((item) => item.id === customerId);
		if (!selected) {
			setCustomer(null);
			setCustomerAddress("");
			setCustomerDistrict("");
			setCustomerMarket("");
			return;
		}

		setCustomer({
			id: selected.id,
			name: selected.name,
			address: selected.address,
			district: selected.district,
			market: selected.market,
			phone: selected.phone,
			type: selected.type || "mill",
		});
		setCustomerAddress(selected.address || "");
		setCustomerDistrict(selected.district || "");
		setCustomerMarket(selected.market || "");
	}

	function updateLine(index: number, patch: Partial<SalesLine>) {
		setLines((prev) => {
			const next = [...prev];
			const cur = { ...next[index], ...patch };

			// keep numeric
			const normalized: SalesLine = {
				...cur,
				bagCount: safeNum(cur.bagCount),
				kgPerBag: safeNum(cur.kgPerBag),
				rateValue: safeNum(cur.rateValue),
			};

			// Cross-line validation: ensure cumulative allocation for the selected lot
			if (normalized.lotId) {
				const newLines = [...next];
				newLines[index] = normalized;
			}

			next[index] = clampToStock(normalized);
			return revalidateLines(next);
		});
	}

	function onLotChange(index: number, lotId: string) {
		const lot = lots.find((l) => l.id === lotId);

		if (!lot) {
			updateLine(index, {
				lotId: "",
				lotLabel: "",
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

		// ✅ show stock details label + avoid confusion
		const uniqueLabel =
			lot.label && lot.label.trim() !== ""
				? `${lot.label} (${lot.productType})`
				: `${lot.id} — ${lot.productType}`;

		// For editing a confirmed SO, add back the qty originally allocated from this SO for that lot
		const effectiveAvailable = getRemainingLotForLine(lot, index);
		const kgPerBag = getLotDefaultKgPerBag(lot);
		const defaultBagCount = getRemainingBagsForLine(lot, index);
		setLotSearchByLine((prev) => ({
			...prev,
			[lines[index].id]: uniqueLabel,
		}));
		const product = products.find((p) => p.id === lot.productId);

		updateLine(index, {
			lotId: lot.id,
			lotLabel: uniqueLabel,
			productType: product?.code,
			availableKg: effectiveAvailable,
			avgCostPerKg: safeNum(lot.avgCostPerKg),
			bagCount: defaultBagCount,
			kgPerBag,
			qtyKg: 0,
			warn: "",
		});
	}

	function addLine() {
		const id = `L${lines.length + 1}`;
		setLines((prev) =>
			revalidateLines([
				...prev,
				{
					id,
					lotId: "",
					lotLabel: "",
					productType: "",
					availableKg: 0,
					avgCostPerKg: 0,
					bagCount: 0,
					kgPerBag: 0,
					qtyKg: 0,
					rateBasis: "perMon" as RateBasis,
					rateValue: 0,
					warn: "",
				},
			]),
		);
		setLineCategoryByLine((prev) => ({ ...prev, [id]: "" }));
		setLineProductByLine((prev) => ({ ...prev, [id]: "" }));
		setLotSearchByLine((prev) => ({ ...prev, [id]: "" }));
	}

	function removeLine(idx: number) {
		const removedId = lines[idx]?.id;
		setLines((prev) => {
			const next = prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx);
			return revalidateLines(next);
		});
		if (removedId) {
			setLotSearchByLine((prev) => {
				const n = { ...prev };
				delete n[removedId];
				return n;
			});
			setLineCategoryByLine((prev) => {
				const n = { ...prev };
				delete n[removedId];
				return n;
			});
			setLineProductByLine((prev) => {
				const n = { ...prev };
				delete n[removedId];
				return n;
			});
		}
	}

	function revalidateLines(inputLines: SalesLine[]) {
		// For each lot, ensure sum(qtyKg) across lines does not exceed available.
		// The availableKg shown in each row becomes the remaining amount after prior rows.
		const remainingByLot: Record<string, number> = {};
		const isConfirmedEdit =
			String((sourceSO as any)?.status || "").toLowerCase() === "confirmed";

		return inputLines.map((ln) => {
			if (!ln.lotId) return ln;

			const lotRow = lots.find((x) => x.id === ln.lotId);
			const baseAvailable = safeNum(lotRow?.availableKg);
			const addedBack = isConfirmedEdit
				? originalAllocatedPerLot[ln.lotId] || 0
				: 0;
			const currentAvailable =
				remainingByLot[ln.lotId] === undefined
					? baseAvailable + addedBack
					: remainingByLot[ln.lotId];

			const want = safeNum(ln.qtyKg);
			const allowed = Math.min(want, currentAvailable);
			const warn =
				want > allowed
					? `⚠ শুধু ${fmtNum(currentAvailable, 3)} kg এর বাকি আছে এই lot-এ.`
					: "";

			const nextLine = clampToStock({
				...ln,
				availableKg: currentAvailable,
				qtyKg: allowed,
				warn,
			});

			remainingByLot[ln.lotId] = Math.max(0, currentAvailable - allowed);
			return nextLine;
		});
	}

	function getFilteredLotsForLine(lineId: string): Lot[] {
		const category = lineCategoryByLine[lineId] || "";
		const productName = lineProductByLine[lineId] || "";
		const selectedLotId = lines.find((ln) => ln.id === lineId)?.lotId || "";
		const isHistoricalUsedLot = (lotId: string) =>
			Boolean(historicalLotIds[lotId]);

		let filtered = lots;

		if (category) {
			filtered = filtered.filter((lot) => {
				if (isHistoricalUsedLot(lot.id)) return true;
				if (lot.id === selectedLotId) return true;
				if (safeNum(lot.availableKg) <= 0) return false;
				const product = products.find((p) => p.id === lot.productId);
				return product?.category === category;
			});
		}

		if (productName) {
			filtered = filtered.filter((lot) => {
				if (isHistoricalUsedLot(lot.id)) return true;
				if (lot.id === selectedLotId) return true;
				if (safeNum(lot.availableKg) <= 0) return false;
				const product = products.find((p) => p.id === lot.productId);
				return product?.name === productName;
			});
		}

		if (customer?.id) {
			filtered = filtered.filter((lot) => {
				if (isHistoricalUsedLot(lot.id)) return true;
				if (lot.id === selectedLotId) return true;
				if (safeNum(lot.availableKg) <= 0) return false;
				const sourcePo = (lot as any).sourcePo;
				if (!sourcePo?.destinationCustomerId) return true;
				return sourcePo.destinationCustomerId === customer.id;
			});
		}

		return filtered;
	}

	function getRecentLotsForLine(lineId: string): Lot[] {
		return [...getFilteredLotsForLine(lineId)]
			.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
			.slice(0, 10);
	}

	function formatLotOptionLabel(l: Lot) {
		const stockMon = (l.availableKg || 0) / KG_PER_MON;
		const kgPerBag = getLotDefaultKgPerBag(l);
		const bagCount = getLotDefaultBagCount(l);
		const sourcePo = (l as any).sourcePo;
		let restriction = "";
		if (sourcePo) {
			if (sourcePo.destinationCustomer?.name) {
				restriction = ` [বরাদ্দ: ${sourcePo.destinationCustomer.name}]`;
			} else if (sourcePo.destinationCustomerId) {
				restriction = ` [বরাদ্দ (ID): ${sourcePo.destinationCustomerId}]`;
			} else if (sourcePo.poNo) {
				restriction = ` [বরাদ্দ: ${sourcePo.poNo}]`;
			}
		}

		return `${
			l.label ? `${l.label} (${l.productType})` : `${l.id} — ${l.productType}`
		} — ${fmtNum(l.availableKg, 3)}kg / ${fmtNum(stockMon, 2)} mon • ${bagCount} বস্তা${kgPerBag > 0 ? ` (kg/Bag ${fmtNum(kgPerBag, 0)})` : ""}${restriction}`;
	}

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

		// If the SO is confirmed and the backend provided a totals snapshot, prefer those
		// approved totals (totalKg, total) to avoid showing recalculated numbers.
		try {
			const status = String((sourceSO as any)?.status || "").toLowerCase();
			const totalsJson =
				(sourceSO as any)?.totals ?? (sourceSO as any)?.totalsJson;
			if (status === "confirmed" && totalsJson) {
				const snapTotalKg = Number(totalsJson.totalKg || 0);
				const snapTotal = Number(totalsJson.total || 0);
				return {
					totalKg: snapTotalKg,
					grossSales: snapTotal,
					estCost,
					grossMargin: snapTotal - estCost,
					hasLoss,
				};
			}
		} catch {
			// ignore and fallthrough to live-calculated values
		}

		return {
			totalKg,
			grossSales,
			estCost,
			grossMargin: grossSales - estCost,
			hasLoss,
		};
	}, [lines, sourceSO]);

	function buildSO(statusOverride?: "draft" | "confirmed"): SalesOrder {
		if (!sourceSO) throw new Error("Sales order not loaded");
		if (!customer) throw new Error("কাস্টমার নির্বাচন করুন");

		const activeLines = lines.filter(
			(l) => l.lotId && l.qtyKg > 0 && l.rateValue > 0,
		);
		if (!activeLines.length) throw new Error("কমপক্ষে একটি লাইন পূরণ করুন");

		const items = activeLines.map((l) => ({
			id: l.itemId,
			lotId: l.lotId,
			productType: l.productType || "অন্যান্য",
			qtyKg: l.qtyKg,
			rateBasis: l.rateBasis,
			rateValue: l.rateValue,
			bagCount: Number(l.bagCount || 0),
			kgPerBag: Number(l.kgPerBag || 0),
		}));

		return {
			...(sourceSO as any),
			status: statusOverride || sourceSO.status,
			customerId: customer.id,
			customerSnapshot: {
				...customer,
				address: customerAddress,
				district: customerDistrict,
				market: customerMarket,
			},
			items,
			transport: safeNum(transport),
			loadingUnloading: safeNum(loadingUnloading),
			misc: safeNum(misc),
			remarks,
		};
	}

	async function ensureBackendCustomerId(): Promise<string> {
		if (!customer) throw new Error("কাস্টমার নির্বাচন করুন");

		const normalize = (v?: string) => (v || "").trim().toLowerCase();
		const freshCustomers = await getCustomers().catch(() => customers);
		setCustomers(freshCustomers);

		const existing = freshCustomers.find((c) => c.id === customer.id);
		if (existing?.id) return existing.id;

		const matched = freshCustomers.find((c) => {
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
			setCustomer((prev) =>
				prev
					? {
							...prev,
							id: matched.id,
							type: (matched.type || prev.type || "mill") as any,
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
			type: (customer.type as any) || "mill",
		});

		setCustomers((prev) => {
			if (prev.some((c) => c.id === created.id)) return prev;
			return [created, ...prev];
		});

		setCustomer((prev) =>
			prev
				? {
						...prev,
						id: created.id,
						type: (created.type || prev.type || "mill") as any,
					}
				: {
						id: created.id,
						name: created.name,
						address: created.address,
						district: created.district,
						market: created.market,
						phone: created.phone,
						type: (created.type || "mill") as any,
					},
		);

		return created.id;
	}

	async function saveDraft(goReview: boolean) {
		try {
			setIsSaving(true);
			const customerId = await ensureBackendCustomerId();
			const so = buildSO("draft");
			const isConfirmedEdit =
				String((sourceSO as any)?.status || "").toLowerCase() === "confirmed";
			if (isConfirmedEdit && !operationPass) {
				throw new Error("Confirmed SO edit করতে পাসওয়ার্ড ভেরিফাই করা প্রয়োজন");
			}
			so.customerId = customerId;
			so.customerSnapshot = {
				...(so.customerSnapshot || {}),
				id: customerId,
			};

			// Check for reserved lots before saving
			for (const item of so.items || []) {
				const lot = (lots as any[]).find((l) => l.id === item.lotId);
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

			await updateSalesOrderDraft(soId!, {
				customerId: so.customerId,
				customerSnapshot: so.customerSnapshot,
				transport: Number(so.transport || 0),
				loadingUnloading: Number(so.loadingUnloading || 0),
				misc: Number(so.misc || 0),
				remarks: so.remarks,
				editPassword: isConfirmedEdit ? operationPass : undefined,
				items: (so.items || []).map((it: any) => ({
					lotId: it.lotId,
					productType: it.productType,
					qtyKg: Number(it.qtyKg || 0),
					rateBasis: it.rateBasis,
					rateValue: Number(it.rateValue || 0),
					bagCount: Number(it.bagCount || 0),
					kgPerBag: Number(it.kgPerBag || 0),
				})),
			});

			// Reload SO from backend to resync the original allocation baseline.
			try {
				const refreshedSO = await getSalesOrderById(soId!);
				if (refreshedSO) {
					setSourceSO(refreshedSO);
					const refreshedItems = Array.isArray(refreshedSO.items)
						? refreshedSO.items
						: [];
					const refreshedSnapshot = Array.isArray(
						(refreshedSO as any).itemsSnapshot,
					)
						? (refreshedSO as any).itemsSnapshot
						: [];
					const isConfirmed =
						String((refreshedSO as any).status || "").toLowerCase() ===
						"confirmed";
					const newAllocated: Record<string, number> = {};
					(refreshedItems.length ? refreshedItems : refreshedSnapshot).forEach(
						(it: any) => {
							const resolvedLotId = it?.lotId || it?.lot?.id || "";
							if (!resolvedLotId) return;
							newAllocated[resolvedLotId] =
								(newAllocated[resolvedLotId] || 0) + safeNum(it.qtyKg);
						},
					);
					setOriginalAllocatedPerLot(isConfirmed ? newAllocated : {});
					setHistoricalLotIds(
						Object.keys(newAllocated).reduce<Record<string, boolean>>(
							(acc, key) => {
								acc[key] = true;
								return acc;
							},
							{},
						),
					);
				}
			} catch {
				// Reload error - will resync on next action
			}

			await showSuccess(`SO Updated: ${so.soNo}`);
			if (goReview) router.push(`/sales/${so.id}`);
		} catch (e: any) {
			const errorMessage =
				e?.response?.data?.message ||
				e?.response?.data?.error ||
				e?.message ||
				"Unable to update sales order";

			await showError(errorMessage);
		} finally {
			setIsSaving(false);
		}
	}

	if (!operationPassReady) {
		return (
			<div className="card">
				<h2 className="text-lg font-semibold mb-2">Sales Edit</h2>
				<p className="text-sm text-slate-500">Checking operation password...</p>
			</div>
		);
	}

	if (!loaded) {
		return (
			<div className="p-6">
				<p className="text-sm text-slate-500">Loading sales order...</p>
			</div>
		);
	}

	if (loaded && !sourceSO) {
		return (
			<div className="p-6">
				<h1 className="text-xl font-semibold mb-2">Sales Order Not Found</h1>
				<p className="text-sm text-slate-500 mb-4">
					এই আইডি দিয়ে কোনো সেলস অর্ডার পাওয়া যায়নি: <b>{soId}</b>
				</p>
				<Link href="/sales" className="btn btn-primary">
					Back to Sales List
				</Link>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">
						বিক্রয় এডিট (Sales Order {sourceSO?.soNo})
					</h1>
					<p className="text-sm text-slate-500">
						0 স্টক lot dropdown-এ আসবে না। Lot select করলে স্টক info দেখাবে এবং
						স্টকের বেশি qty দেয়া যাবে না।
					</p>
				</div>
				<div className="flex gap-2">
					<Link href={`/sales/${sourceSO?.id}`} className="btn btn-ghost">
						View SO
					</Link>
					{/* <button
						className="btn btn-ghost"
						onClick={() => saveDraft(false)}
						disabled={isSaving}
					>
						Draft Save
					</button> */}
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
				<div className="lg:col-span-2 flex flex-col gap-4">
					{/* STEP 1 */}
					{step === 1 && (
						<section className="card">
							<h3 className="text-lg font-semibold mb-3">
								Customer & Basic Info
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="md:col-span-2">
									<label className="block text-sm mb-1">Customer</label>
									<select
										className="input w-full"
										value={customer?.id || ""}
										onChange={(e) => onCustomerSelect(e.target.value)}
									>
										<option value="">Select customer</option>
										<option value="__new__">+ Add new customer</option>
										{customers.map((item) => (
											<option key={item.id} value={item.id}>
												{item.name}
												{item.district ? ` • ${item.district}` : ""}
											</option>
										))}
									</select>
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
							<div className="flex items-center justify-end mt-4 gap-3">
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
									// ── rate calculations ──────────────────────────────────
									let ratePerKg = 0;
									if (ln.rateBasis === "perKg") ratePerKg = ln.rateValue;
									else if (ln.rateBasis === "perMon")
										ratePerKg = ln.rateValue / KG_PER_MON;
									else if (ln.rateBasis === "perBag") {
										const kpb = Number(ln.kgPerBag || 0);
										ratePerKg =
											kpb > 0 ? ln.rateValue / kpb : ln.rateValue / KG_PER_MON;
									}
									const lineSales = ln.qtyKg * ratePerKg;
									const lineCost = ln.qtyKg * (ln.avgCostPerKg || 0);
									const lineMargin = lineSales - lineCost;
									const isLoss =
										ln.qtyKg > 0 &&
										ln.avgCostPerKg > 0 &&
										ratePerKg < ln.avgCostPerKg;

									// ── stock display (mirrors new page) ───────────────────
									const remainingKg = ln.availableKg;
									const availMon = remainingKg / KG_PER_MON;
									const availBags =
										ln.kgPerBag > 0
											? Math.floor(remainingKg / ln.kgPerBag)
											: null;
									const qtyExceeded = ln.qtyKg > 0 && ln.qtyKg > remainingKg;

									// ── cost info for margin color ─────────────────────────
									const info = calcLineCostInfo(ln as any, lots as any);
									const color =
										info.saleRatePerKg < info.avgCostPerKg
											? "text-red-600"
											: info.saleRatePerKg > info.avgCostPerKg
												? "text-emerald-600"
												: "text-slate-400";

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
												{/* Product Category */}
												<div className="md:col-span-1">
													<label className="block text-xs mb-1">
														Product Category
													</label>
													<select
														className="input"
														value={lineCategoryByLine[ln.id] || ""}
														onChange={(e) => {
															const val = e.target.value;
															setLineCategoryByLine((prev) => ({
																...prev,
																[ln.id]: val,
															}));
															setLineProductByLine((prev) => ({
																...prev,
																[ln.id]: "",
															}));
														}}
													>
														<option value="">All Categories</option>
														{PRODUCT_CATEGORIES.map((c) => (
															<option key={c.value} value={c.value}>
																{c.label}
															</option>
														))}
														{lineCategoryByLine[ln.id] &&
															!PRODUCT_CATEGORIES.some(
																(c) => c.value === lineCategoryByLine[ln.id],
															) && (
																<option value={lineCategoryByLine[ln.id]}>
																	{lineCategoryByLine[ln.id]}
																</option>
															)}
													</select>
												</div>

												{/* Product Name */}
												<div className="md:col-span-1">
													<label className="block text-xs mb-1">
														Product Name
													</label>
													{(() => {
														const curCat = lineCategoryByLine[ln.id] || "";
														const curProd = lineProductByLine[ln.id] || "";
														const filtered = products.filter(
															(p) => p.category === curCat,
														);
														const includeExisting =
															curProd &&
															!filtered.some((p) => p.name === curProd);
														return (
															<select
																className="input"
																value={curProd}
																onChange={(e) =>
																	setLineProductByLine((prev) => ({
																		...prev,
																		[ln.id]: e.target.value,
																	}))
																}
																disabled={!curCat}
															>
																<option value="">
																	{curCat
																		? "Select Product"
																		: "Select category first"}
																</option>
																{includeExisting && (
																	<option
																		key={`existing-${ln.id}`}
																		value={curProd}
																	>
																		{curProd}
																	</option>
																)}
																{filtered.map((p) => (
																	<option key={p.id} value={p.name}>
																		{p.name}
																	</option>
																))}
															</select>
														);
													})()}
												</div>

												{/* Lot searchable dropdown — unchanged from edit page */}
												<div className="md:col-span-2 relative">
													<label className="block text-xs mb-1">
														Lot / Source
													</label>
													<input
														className="input"
														value={lotSearchByLine[ln.id] ?? ln.lotLabel ?? ""}
														onFocus={() =>
															setOpenLotDropdown((prev) => ({
																...prev,
																[ln.id]: true,
															}))
														}
														onBlur={() =>
															setOpenLotDropdown((prev) => ({
																...prev,
																[ln.id]: false,
															}))
														}
														onChange={(e) => {
															const nextValue = e.target.value;
															setLotSearchByLine((prev) => ({
																...prev,
																[ln.id]: nextValue,
															}));
															setOpenLotDropdown((prev) => ({
																...prev,
																[ln.id]: true,
															}));
															if (!nextValue) {
																updateLine(idx, {
																	lotId: "",
																	lotLabel: "",
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
																const allFiltered = getFilteredLotsForLine(
																	ln.id,
																);
																const visibleLots = allFiltered.filter(
																	(lot) => {
																		if (!lotQuery) return true;
																		const product = products.find(
																			(p) => p.id === lot.productId,
																		);
																		const haystack = [
																			lot.id,
																			lot.label,
																			lot.productType,
																			product?.name,
																			product?.code,
																		]
																			.filter(Boolean)
																			.join(" ")
																			.toLowerCase();
																		return haystack.includes(lotQuery);
																	},
																);
																const dropdownLots = lotQuery
																	? visibleLots
																	: getRecentLotsForLine(ln.id);

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
																			{dropdownLots.length ? (
																				dropdownLots.map((lot) => {
																					const selected = lot.id === ln.lotId;
																					return (
																						<button
																							key={lot.id}
																							type="button"
																							className={`w-full px-3 py-2 text-left text-xs border-b last:border-b-0 hover:bg-slate-50 ${
																								selected
																									? "bg-slate-100 font-medium"
																									: ""
																							}`}
																							onClick={() => {
																								onLotChange(idx, lot.id);
																								setLotSearchByLine((prev) => ({
																									...prev,
																									[ln.id]:
																										formatLotOptionLabel(lot),
																								}));
																								setOpenLotDropdown((prev) => ({
																									...prev,
																									[ln.id]: false,
																								}));
																							}}
																						>
																							<div>
																								{formatLotOptionLabel(lot)}
																							</div>
																							<div className="text-[11px] text-slate-500">
																								{lot.productType} •{" "}
																								{fmtNum(lot.availableKg, 3)} kg
																								available
																							</div>
																						</button>
																					);
																				})
																			) : (
																				<div className="px-3 py-2 text-xs text-slate-500">
																					No lots found.
																				</div>
																			)}
																		</div>
																	</>
																);
															})()}
														</div>
													)}

													{/* ── stock info (matches new page) ── */}
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

												{/* Product — readonly, auto from lot (matches new page) */}
												{/* <div>
													<label className="block text-xs mb-1">Product</label>
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
														max={availBags ?? undefined}
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

												{/* kg / Bag */}
												<div>
													<label className="block text-xs mb-1">kg / Bag</label>
													<input
														className="input"
														readOnly
														type="number"
														value={ln.kgPerBag || ""}
														onChange={(e) =>
															updateLine(idx, {
																kgPerBag: Number(e.target.value || 0),
															})
														}
													/>
													<p className="text-[11px] text-slate-500 mt-1">
														Qty: <b>{fmtNum(ln.qtyKg, 3)}</b> kg
													</p>
													{ln.warn && (
														<p className="text-[11px] text-red-600 mt-1">
															{ln.warn}
														</p>
													)}
												</div>

												{/* Rate */}
												<div>
													<label className="block text-xs mb-1">
														Rate Basis
													</label>
													<div className="flex rounded-lg border overflow-hidden bg-white">
														{(["perMon", "perKg", "perBag"] as RateBasis[]).map(
															(basis) => (
																<button
																	key={basis}
																	type="button"
																	className={`flex-1 text-xs py-1 ${
																		ln.rateBasis === basis
																			? "bg-slate-900 text-white"
																			: ""
																	}`}
																	onClick={() =>
																		updateLine(idx, { rateBasis: basis })
																	}
																>
																	{basis === "perMon"
																		? "৳/মণ"
																		: basis === "perKg"
																			? "৳/কেজি"
																			: "৳/বস্তা"}
																</button>
															),
														)}
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

													{/* margin color indicator — matches new page */}
													<div className={`mt-1 text-[11px] ${color}`}>
														Avg: ৳ {fmtNum(info.avgCostPerKg, 2)} /kg • Margin:{" "}
														{isFinite(info.marginPct)
															? fmtNum(info.marginPct, 1) + "%"
															: "-"}
													</div>

													{/* effective rate breakdown — matches new page */}
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
									মোট Qty: <b>{fmtNum(summary.totalKg, 3)} kg</b>
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
									{/* <button
										className="btn btn-ghost"
										onClick={() => saveDraft(false)}
										disabled={isSaving}
									>
										Draft Save
									</button> */}
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

				{/* RIGHT SIDE SUMMARY */}
				<aside className="card h-max sticky top-6">
					<h3 className="text-lg font-semibold mb-3">সারাংশ</h3>
					<ul className="text-sm space-y-2">
						<li className="flex justify-between">
							<span>SO ID</span>
							<b>{sourceSO?.id}</b>
						</li>
						<li className="flex justify-between">
							<span>Status</span>
							<b>{sourceSO?.status}</b>
						</li>
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

/* ---------- small UI helpers ---------- */

function Step({ n, label, step }: { n: number; label: string; step: number }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-7 w-7 grid place-items-center rounded-full border ${
          step >= n ? 'border-brand bg-brand text-white' : 'border-slate-300 text-slate-600'
        }`}
      >
        {n}
      </span>
      <span className={`text-sm ${step >= n ? 'text-brand font-medium' : 'text-slate-500'}`}>{label}</span>
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
      <input className="input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
