'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import SellerPicker from "@/components/SellerPicker";
import ProductForm from "@/components/ProductForm";

import {
	getPurchaseOrderById,
	updatePurchaseOrderDraft,
	type PurchaseOrderDetailsDto,
} from "@/lib/api/purchase";
import { getBusinessInfo } from "@/lib/api/businessInfo";
import {
	getDrivers,
	getMillCustomers,
	getWarehouses,
	type CustomerDto,
	type DriverDto,
	type SellerDto,
	type WarehouseDto,
} from "@/lib/api/masters";
import {
	createProduct,
	getProducts,
	type ProductDto,
} from "@/lib/api/products";
import { getAccounts, getLedger } from "@/lib/api/accounting";
import type { AccountDto } from "@/lib/api/accounting";
import { bnMoney, bnNumber } from "@/lib/format";
import { promptPassword, showError, showSuccess } from "@/lib/swal";
import { dhakaIso } from "@/lib/dhaka";
import { postDriverAdvance } from "@/lib/api/cashbook";

type PurchaseType = "district" | "trolley" | "retail";
type WeightPolicy = "actual" | "accounting";
type RateBasis = "perKg" | "perMon" | "perBag";
type PurchaseDestinationKind = "warehouse" | "mill";
type TransportMode = "sellerIncluded" | "marketTruck" | "ownTruck";

const KG_PER_MON = 40;
const fmt = bnMoney;
const fmtNum = bnNumber;

let purchaseEditIdSeq = 0;
function makeTempItemId(prefix = "POL") {
	purchaseEditIdSeq += 1;
	const now = new Date();
	const df = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Dhaka",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	const date = df.format(now).replace(/-/g, "");
	return `${prefix}-${date}-${String(purchaseEditIdSeq).padStart(3, "0")}`;
}

type ItemForm = {
	id: string;
	productId: string;
	productType: string;
	productCategory: string;
	bagCount: string;
	actualKgPerBag: string;
	accountingKgPerBag: string;
	weightPolicy: WeightPolicy;
	rateBasis: RateBasis;
	rateValue: string;
};

const PRODUCT_CATEGORIES = [
	{ value: "ধান", label: "ধান" },
	{ value: "চাল", label: "চাল" },
	{ value: "গম", label: "গম" },
	{ value: "ভুট্টা", label: "ভুট্টা" },
	{ value: "সরিষা", label: "সরিষা" },
	{ value: "অন্যান্য", label: "অন্যান্য" },
];

export default function EditPOPage() {
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const poId = (params?.id || "") as string;

	const [po, setPo] = useState<PurchaseOrderDetailsDto | null>(null);
	const [operationPass, setOperationPass] = useState("");
	const [operationPassReady, setOperationPassReady] = useState(false);
	const [products, setProducts] = useState<ProductDto[]>([]);
	const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
	const [mills, setMills] = useState<CustomerDto[]>([]);
	const [drivers, setDrivers] = useState<DriverDto[]>([]);
	const [accounts, setAccounts] = useState<AccountDto[]>([]);
	const [pageLoading, setPageLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [showProductPopup, setShowProductPopup] = useState(false);
	const [productTargetRow, setProductTargetRow] = useState<number | null>(null);
	const [isCreatingProduct, setIsCreatingProduct] = useState(false);
	const [lockedCategory, setLockedCategory] = useState<string>("");

	// Driver balance
	const [driverBalance, setDriverBalance] = useState<number>(0);
	const [driverBalanceLoading, setDriverBalanceLoading] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);
	const [giveDriverAdvance, setGiveDriverAdvance] = useState(false);
	const [adv, setAdv] = useState({ amount: 0, instrumentId: "" });

	// Stepper
	const [step, setStep] = useState(1);

	// Purchase meta
	const [purchaseType, setPurchaseType] = useState<PurchaseType>("district");

	// Seller
	const [seller, setSeller] = useState<SellerDto | null>(null);
	const [sellerAddress, setSellerAddress] = useState("");
	const [sellerDistrict, setSellerDistrict] = useState("");
	const [sellerMarket, setSellerMarket] = useState("");

	const [items, setItems] = useState<ItemForm[]>([
		{
			id: makeTempItemId(),
			productId: "",
			productType: "",
			productCategory: "",
			bagCount: "",
			actualKgPerBag: "",
			accountingKgPerBag: "",
			weightPolicy: "accounting",
			rateBasis: "perMon",
			rateValue: "",
		},
	]);

	// Transport & Costs
	const [transportMode, setTransportMode] =
		useState<TransportMode>("marketTruck");
	const [transport, setTransport] = useState("0");
	const [bagCostMode, setBagCostMode] = useState<"paid" | "self" | "mixed">(
		"self",
	);
	const [bagCostPerBag, setBagCostPerBag] = useState("0");
	const [paidBagCount, setPaidBagCount] = useState("");
	const [loadingUnloading, setLoadingUnloading] = useState("0");
	const [misc, setMisc] = useState("0");

	// Own Truck: Driver info
	const [driverMode, setDriverMode] = useState<"select" | "manual">("select");
	const [driverId, setDriverId] = useState("");
	const [driverName, setDriverName] = useState("");
	const [truckNo, setTruckNo] = useState("");
	const [route, setRoute] = useState("");

	// Destination
	const [destKind, setDestKind] =
		useState<PurchaseDestinationKind>("warehouse");
	const [destWarehouseId, setDestWarehouseId] = useState("");
	const [destMill, setDestMill] = useState<CustomerDto | null>(null);

	// Remarks
	const [varietyNote, setVarietyNote] = useState("");
	const [remarks, setRemarks] = useState("");

	useEffect(() => {
		if (!poId) return;
		let mounted = true;
		(async () => {
			try {
				const poRow = await getPurchaseOrderById(poId);
				if (!mounted) return;

				// Draft PO can be edited without operation password.
				const isDraft =
					String((poRow as any)?.status || "").toLowerCase() === "draft";
				if (isDraft) {
					setOperationPass("");
					setOperationPassReady(true);
					return;
				}

				const entered = await promptPassword(
					"Operation Password দিন",
					"PO edit page-এ ঢুকতে operation password দিন।",
				);
				if (!mounted) return;
				if (!entered) {
					router.push(`/purchase/${poId}`);
					return;
				}

				const info = await getBusinessInfo();
				if (!mounted) return;
				const expected = String(info?.operationPass || "").trim();
				if (!expected) {
					await showError("Business info-তে operation password সেট করা নেই।");
					router.push(`/purchase/${poId}`);
					return;
				}

				if (entered !== expected) {
					await showError("Operation password ভুল।");
					router.push(`/purchase/${poId}`);
					return;
				}

				setOperationPass(entered);
				setOperationPassReady(true);
			} catch (e: any) {
				if (!mounted) return;
				await showError(e?.message || "Operation password যাচাই ব্যর্থ হয়েছে");
				router.push(`/purchase/${poId}`);
			}
		})();

		return () => {
			mounted = false;
		};
	}, [poId, router]);

	// ── Load PO + masters ──────────────────────────────────────────────────────
	useEffect(() => {
		if (!operationPassReady) return;
		let mounted = true;
		(async () => {
			try {
				setPageLoading(true);
				const poRow = await getPurchaseOrderById(poId);
				if (!mounted) return;
				if (!poRow) {
					setPo(null);
					setPageLoading(false);
					return;
				}

				const [
					productRowsResult,
					warehouseRowsResult,
					millRowsResult,
					driverRowsResult,
					accountRowsResult,
				] = await Promise.allSettled([
					getProducts(),
					getWarehouses(),
					getMillCustomers(),
					getDrivers(),
					getAccounts(),
				]);

				const productRows =
					productRowsResult.status === "fulfilled"
						? productRowsResult.value
						: [];
				const warehouseRows =
					warehouseRowsResult.status === "fulfilled"
						? warehouseRowsResult.value
						: [];
				const millRows =
					millRowsResult.status === "fulfilled" ? millRowsResult.value : [];
				const driverRows =
					driverRowsResult.status === "fulfilled" ? driverRowsResult.value : [];
				const accountRows =
					accountRowsResult.status === "fulfilled"
						? accountRowsResult.value
						: [];

				const activeProducts = productRows.filter((p) => p.active);

				setPo(poRow);
				setProducts(activeProducts);
				setWarehouses(warehouseRows);
				setMills(millRows);
				setDrivers(driverRows);
				setAccounts(accountRows);

				const defaultInstrument =
					accountRows.find((a) => a.type === "cash")?.id ||
					accountRows.find((a) => a.type === "bank")?.id ||
					"";
				setAdv((prev) => ({ ...prev, instrumentId: defaultInstrument }));

				const sellerSnapshot = poRow.sellerSnapshot || null;
				const sellerSnapshotAny = sellerSnapshot as any;
				const poAny = poRow as any;

				setPurchaseType((poRow.purchaseType as PurchaseType) || "district");
				setSeller(
					sellerSnapshot
						? {
								id: sellerSnapshot.id || poRow.sellerId || "",
								name: sellerSnapshot.name || "",
								address: sellerSnapshot.address,
								district: sellerSnapshot.district,
								market: sellerSnapshot.market,
								phone: sellerSnapshotAny?.phone,
							}
						: null,
				);
				setSellerAddress(sellerSnapshot?.address || "");
				setSellerDistrict(sellerSnapshot?.district || "");
				setSellerMarket(sellerSnapshot?.market || "");

				const poItems =
					Array.isArray(poRow.items) && poRow.items.length
						? poRow.items
						: [
								{
									id: makeTempItemId(),
									productId: poAny.productId,
									productType: poAny.productType,
									bagCount: poRow.bagCount,
									actualKgPerBag: poRow.actualKgPerBag,
									accountingKgPerBag: poRow.accountingKgPerBag,
									weightPolicy: poRow.weightPolicy,
									rateBasis: poRow.rateBasis,
									rateValue: poRow.rateValue,
								},
							];

				const mappedItems: ItemForm[] = poItems.map((it: any) => {
					const matchedProduct = activeProducts.find(
						(p) => p.id === String(it.productId || ""),
					);
					return {
						id: String(it.id || makeTempItemId()),
						productId: String(it.productId || ""),
						productType: String(
							it.productType || it.productName || matchedProduct?.name || "",
						),
						productCategory: String(
							it.productCategory || matchedProduct?.category || "",
						),
						bagCount: String(it.bagCount ?? ""),
						actualKgPerBag: String(it.actualKgPerBag ?? ""),
						accountingKgPerBag: String(it.accountingKgPerBag ?? ""),
						weightPolicy: (it.weightPolicy || "accounting") as WeightPolicy,
						rateBasis: (it.rateBasis || "perMon") as RateBasis,
						rateValue: String(it.rateValue ?? ""),
					};
				});
				setItems(mappedItems);

				const firstWithCategory = mappedItems.find((it) => it.productCategory);
				if (firstWithCategory?.productCategory) {
					setLockedCategory(firstWithCategory.productCategory);
				}

				setTransportMode(
					(poAny.transportMode as TransportMode) || "marketTruck",
				);
				setTransport(String(poRow.transport || 0));
				setTransport(String(poRow.transport || 0));

				// Parse remarks for Bag mix pattern: "Bag mix: own 150, paid 50 @ 30/bag"
				const remarksText = String(poRow.remarks || "");
				const bagMixMatch = remarksText.match(
					/Bag\s*mix:\s*own\s*(\d+)\s*,\s*paid\s*(\d+)\s*@\s*([\d.]+)/i,
				);
				if (bagMixMatch) {
					const own = Number(bagMixMatch[1] || 0);
					const paid = Number(bagMixMatch[2] || 0);
					const price = Number(bagMixMatch[3] || 0);
					setBagCostMode("mixed");
					setPaidBagCount(String(paid));
					setBagCostPerBag(String(price || 0));
				} else {
					const rawBagMode = poRow.bagCostMode as string;
					setBagCostPerBag(String(poRow.bagCostPerBag || 0));
					// If backend didn't set bagCostMode, derive from price
					const priceNum = Number(poRow.bagCostPerBag || 0);
					if (
						rawBagMode === "paid" ||
						rawBagMode === "self" ||
						rawBagMode === "mixed"
					) {
						setBagCostMode(rawBagMode as any);
					} else {
						setBagCostMode(priceNum > 0 ? "paid" : "self");
					}
				}
				setLoadingUnloading(String(poRow.loadingUnloading || 0));
				setMisc(String(poRow.misc || 0));
				setDriverId(poAny.driverId || "");
				setDriverName(poAny.driverName || "");
				setTruckNo(poAny.truckNo || "");
				setRoute(poAny.route || "");
				setDestKind(
					(poRow.destinationKind as PurchaseDestinationKind) || "warehouse",
				);
				setDestWarehouseId(
					poRow.destinationWarehouseId || warehouseRows[0]?.id || "",
				);
				setDestMill(
					millRows.find((m) => m.id === poRow.destinationCustomerId) || null,
				);
				setVarietyNote(poRow.varietyNote || "");
				setRemarks(poRow.remarks || "");
			} catch (e: any) {
				if (!mounted) return;
				await showError(e?.message || "Failed to load purchase draft");
				setPo(null);
			} finally {
				if (mounted) setPageLoading(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, [poId, operationPassReady]);

	// ── Driver balance ─────────────────────────────────────────────────────────
	useEffect(() => {
		let mounted = true;
		async function load() {
			if (!driverId || !accounts.length) {
				setDriverBalance(0);
				return;
			}
			const account = accounts.find(
				(a) => a.partyKind === "driver" && a.partyRefId === driverId,
			);
			if (!account) {
				setDriverBalance(0);
				return;
			}
			try {
				setDriverBalanceLoading(true);
				const res = await getLedger(account.id);
				if (!mounted) return;
				setDriverBalance(res?.closing || 0);
			} catch {
				if (mounted) setDriverBalance(0);
			} finally {
				if (mounted) setDriverBalanceLoading(false);
			}
		}
		load();
		return () => {
			mounted = false;
		};
	}, [driverId, accounts, refreshKey]);

	// ── Helpers ────────────────────────────────────────────────────────────────
	function getFilteredProducts(category: string) {
		if (!category) return [];
		return products.filter((p) => p.category === category);
	}

	function onSellerChange(s: SellerDto) {
		setSeller(s);
		setSellerAddress(s.address || "");
		setSellerDistrict(s.district || "");
		setSellerMarket(s.market || "");
	}

	function onMillSelect(id: string) {
		setDestMill(mills.find((m) => m.id === id) || null);
	}

	function updateItem(index: number, patch: Partial<ItemForm>) {
		setItems((prev) =>
			prev.map((it, i) => (i === index ? { ...it, ...patch } : it)),
		);
	}

	function addItem() {
		setItems((prev) => [
			...prev,
			{
				id: makeTempItemId(),
				productId: "",
				productType: "",
				productCategory: lockedCategory,
				bagCount: "",
				actualKgPerBag: "",
				accountingKgPerBag: "",
				weightPolicy: "accounting",
				rateBasis: "perMon",
				rateValue: "",
			},
		]);
	}

	function removeItem(index: number) {
		setItems((prev) =>
			prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
		);
	}

	function resetProducts() {
		setItems((prev) =>
			prev.map((it) => ({
				...it,
				productCategory: "",
				productId: "",
				productType: "",
				bagCount: "",
				actualKgPerBag: "",
				accountingKgPerBag: "",
				rateValue: "",
			})),
		);
		setLockedCategory("");
	}

	function openCreateProductPopup(rowIndex: number) {
		setProductTargetRow(rowIndex);
		setShowProductPopup(true);
	}

	const newProductInitial: ProductDto = {
		id: "",
		name: "",
		code: "",
		category: "",
		unit: "bag",
		active: true,
		createdAt: dhakaIso(),
		updatedAt: dhakaIso(),
	};

	async function onCreateProduct(draft: ProductDto) {
		if (!draft.category?.trim()) {
			await showError("Product category is required.");
			return;
		}
		try {
			setIsCreatingProduct(true);
			const created = await createProduct({
				name: draft.name,
				code: draft.code,
				category: draft.category,
				unit: draft.unit,
				active: draft.active,
			});
			setProducts((prev) => [...prev, created]);
			if (productTargetRow !== null) {
				updateItem(productTargetRow, {
					productId: created.id,
					productType: created.name,
				});
			}
			setShowProductPopup(false);
			setProductTargetRow(null);
			await showSuccess(`Product created: ${created.name}`);
		} catch (e: any) {
			await showError(e?.message || "Unable to create product");
		} finally {
			setIsCreatingProduct(false);
		}
	}

	function onExistingDriverChange(id: string) {
		setDriverId(id);
		const d = drivers.find((x: any) => x.id === id);
		if (d) {
			setDriverName(d.name || "");
			setTruckNo(d.truckNo || "");
			if (!route && (sellerDistrict || destWarehouseId || sellerMarket)) {
				const whLabel =
					warehouses.find((w) => w.id === destWarehouseId)?.name ||
					destWarehouseId;
				const districtWithMarket =
					sellerDistrict && sellerMarket
						? `${sellerDistrict} (${sellerMarket})`
						: sellerDistrict || sellerMarket;
				setRoute([districtWithMarket, whLabel].filter(Boolean).join(" → "));
			}
		} else {
			setDriverName("");
			setTruckNo("");
		}
	}

	async function giveAdvance() {
		if (!driverId || !driverName) {
			await showError("Driver ID ও Name আগে দিন");
			return;
		}
		const amt = +adv.amount || 0;
		if (!amt) {
			await showError("Advance amount দিন");
			return;
		}
		if (!adv.instrumentId) {
			await showError("Instrument নির্বাচন করুন (যেমন Cash / Bank / bKash)");
			return;
		}
		const instrumentName =
			accounts.find((a) => a.id === adv.instrumentId)?.name || "Instrument";
		await postDriverAdvance({
			driverId,
			driverName,
			amount: amt,
			instrumentId: adv.instrumentId,
			memo: `Driver Advance — ${driverName} via ${instrumentName}`,
		});
		setRefreshKey((k) => k + 1);
		await showSuccess("Advance posted (Dr Driver | Cr Instrument)");
		setAdv({ ...adv, amount: 0 });
	}

	// ── Derived totals ─────────────────────────────────────────────────────────
	const derived = useMemo(() => {
		let totalBags = 0,
			totalActualKg = 0,
			totalAccountingKg = 0,
			stockKg = 0,
			basePurchase = 0;

		const totalLineStockKg = items.reduce((sum, it) => {
			const bags = Number(it.bagCount || 0);
			const actual = bags * Number(it.actualKgPerBag || 0);
			const acc = bags * Number(it.accountingKgPerBag || 0);
			return sum + (it.weightPolicy === "actual" ? actual : acc);
		}, 0);

		const linePrices: Array<{
			product: string;
			cost: number;
			stock: number;
			rateBasis: RateBasis;
			rateValue: number;
			avgPerKg: number;
			avgPerMon: number;
			baseCost: number;
			bagCost: number;
			headerCostShare: number;
		}> = [];

		for (const it of items) {
			const bags = Number(it.bagCount || 0);
			const actual = bags * Number(it.actualKgPerBag || 0);
			const acc = bags * Number(it.accountingKgPerBag || 0);
			const stock = it.weightPolicy === "actual" ? actual : acc;
			const rv = Number(it.rateValue || 0);

			let lineBase = 0;
			if (it.rateBasis === "perBag") {
				lineBase = bags * rv;
			} else {
				const rKg = it.rateBasis === "perKg" ? rv : rv / KG_PER_MON;
				lineBase = stock * rKg;
			}
			basePurchase += lineBase;

			const enteredPaidBags = Math.max(0, Number(paidBagCount || 0));
			const paidBagsCapped =
				bagCostMode === "self"
					? 0
					: bagCostMode === "paid"
						? bags
						: Math.min(bags, enteredPaidBags);
			const bagCost = paidBagsCapped * Number(bagCostPerBag || 0);

			const headerCostShare =
				totalLineStockKg > 0
					? ((transportMode === "sellerIncluded" ? 0 : Number(transport || 0)) +
							Number(loadingUnloading || 0) +
							Number(misc || 0)) *
						(stock / totalLineStockKg)
					: 0;

			const lineCost = lineBase + bagCost + headerCostShare;
			const lineAvgPerKg = stock > 0 ? lineCost / stock : 0;

			linePrices.push({
				product: it.productType || "Unknown",
				cost: lineCost,
				stock,
				rateBasis: it.rateBasis,
				rateValue: rv,
				avgPerKg: lineAvgPerKg,
				avgPerMon: lineAvgPerKg * KG_PER_MON,
				baseCost: lineBase,
				bagCost,
				headerCostShare,
			});

			totalBags += bags;
			totalActualKg += actual;
			totalAccountingKg += acc;
			stockKg += stock;
		}

		const enteredPaidBags = Math.max(0, Number(paidBagCount || 0));
		const paidBags =
			bagCostMode === "self"
				? 0
				: bagCostMode === "paid"
					? totalBags
					: Math.min(totalBags, enteredPaidBags);
		const ownBags = Math.max(0, totalBags - paidBags);
		const bagCostTotal = paidBags * Number(bagCostPerBag || 0);
		const transportCost =
			transportMode === "sellerIncluded" ? 0 : Number(transport || 0);
		const extraCosts =
			transportCost +
			Number(loadingUnloading || 0) +
			Number(misc || 0) +
			bagCostTotal;
		const totalCost = basePurchase + extraCosts;
		const avgPerKg = stockKg > 0 ? totalCost / stockKg : 0;

		return {
			totalBags,
			paidBags,
			ownBags,
			totalActualKg,
			totalAccountingKg,
			stockKg,
			basePurchase,
			transportCost,
			bagCostTotal,
			extraCosts,
			totalCost,
			avgPerKg,
			avgPerMon: avgPerKg * KG_PER_MON,
			linePrices,
		};
	}, [
		items,
		transport,
		transportMode,
		bagCostMode,
		bagCostPerBag,
		paidBagCount,
		loadingUnloading,
		misc,
	]);

	const {
		totalBags,
		paidBags,
		ownBags,
		stockKg,
		basePurchase,
		transportCost,
		bagCostTotal,
		totalCost,
		linePrices,
	} = derived;
	const hasSelectedDriver =
		transportMode === "ownTruck" && Boolean(driverId && driverName);

	// ── Build update payload ───────────────────────────────────────────────────
	function buildUpdateInput() {
		if (!seller) throw new Error("বিক্রেতা নির্বাচন করুন");
		if (!items.length) throw new Error("কমপক্ষে ১টা প্রোডাক্ট দিন");
		if (stockKg <= 0) throw new Error("স্টকের ওজন শূন্য হতে পারে না");

		const poItems = items.map((it) => ({
			id: it.id.startsWith("POL-") ? undefined : it.id || undefined,
			productId: it.productId,
			productType: it.productType,
			bagCount: Number(it.bagCount || 0),
			actualKgPerBag: Number(it.actualKgPerBag || 0),
			accountingKgPerBag: Number(it.accountingKgPerBag || 0),
			weightPolicy: it.weightPolicy,
			rateBasis: it.rateBasis,
			rateValue: Number(it.rateValue || 0),
		}));

		const wh =
			warehouses.find((w) => w.id === destWarehouseId) || warehouses[0];
		const effectiveBagCostPerBag =
			bagCostMode === "mixed"
				? paidBags > 0
					? bagCostTotal / paidBags
					: 0
				: totalBags > 0
					? bagCostTotal / totalBags
					: 0;
		const backendBagCostMode: "paid" | "self" =
			bagCostTotal > 0 ? "paid" : "self";
		const bagMixNote =
			bagCostMode === "mixed"
				? `Bag mix: own ${ownBags}, paid ${paidBags} @ ${Number(bagCostPerBag || 0)}/bag`
				: "";
		const mergedRemarks = [remarks, bagMixNote].filter(Boolean).join(" | ");

		return {
			purchaseType,
			sellerId: seller.id,
			sellerSnapshot: {
				...seller,
				address: sellerAddress,
				district: sellerDistrict,
				market: sellerMarket,
			},
			warehouseId: wh?.id || destWarehouseId,
			warehouseName: wh?.name,
			transport: transportCost,
			transportMode,
			advancePaid: Number((po as any)?.advancePaid || 0),
			advanceInstrumentId: (po as any)?.advanceInstrumentId || undefined,
			loading: Number(loadingUnloading || 0),
			bagCostMode: backendBagCostMode,
			bagCostPerBag: effectiveBagCostPerBag,
			paidBags: paidBags,
			loadingUnloading: Number(loadingUnloading || 0),
			misc: Number(misc || 0),
			destinationKind: destKind,
			destinationWarehouseId: destKind === "warehouse" ? wh?.id || null : null,
			destinationCustomerId: destKind === "mill" ? destMill?.id || null : null,
			destinationRef:
				destKind === "mill"
					? destMill
						? { type: "mill" as const, id: destMill.id, name: destMill.name }
						: null
					: { type: "warehouse" as const, id: wh?.id || "", name: wh?.name },
			varietyNote,
			remarks: mergedRemarks,
			driverId:
				transportMode === "ownTruck" ? driverId || undefined : undefined,
			driverName:
				transportMode === "ownTruck" ? driverName || undefined : undefined,
			truckNo: transportMode === "ownTruck" ? truckNo || undefined : undefined,
			route: transportMode === "ownTruck" ? route || undefined : undefined,
			items: poItems,
		};
	}

	async function saveChanges(goToDetails: boolean) {
		try {
			if (!po?.id) throw new Error("PO not found");
			setIsSaving(true);

			if (items.some((it) => !it.productId)) {
				await showError("প্রতিটি লাইনে প্রোডাক্ট নির্বাচন করুন");
				return;
			}
			if (
				items.some(
					(it) =>
						Number(it.bagCount || 0) <= 0 || Number(it.rateValue || 0) <= 0,
				)
			) {
				await showError("প্রতিটি লাইনে বস্তা ও দর শূন্যের বেশি হতে হবে");
				return;
			}
			if (bagCostMode === "mixed") {
				const paid = Math.max(0, Number(paidBagCount || 0));
				if (!Number.isFinite(paid)) {
					await showError("Paid bags সংখ্যা সঠিক দিন");
					return;
				}
				if (paid > totalBags) {
					await showError("Paid bags মোট বস্তার চেয়ে বেশি হতে পারবে না");
					return;
				}
			}

			const payload = buildUpdateInput();

			if (po.status === "approved") {
				await updatePurchaseOrderDraft(po.id, {
					...payload,
					editPassword: operationPass,
				});
			} else {
				await updatePurchaseOrderDraft(po.id, payload);
			}

			await showSuccess(`PO Updated: ${(po as any).poNo || po.id}`);
			if (goToDetails) router.push(`/purchase/${po.id}`);
		} catch (e: any) {
			await showError(e?.message || "Unable to save");
		} finally {
			setIsSaving(false);
		}
	}

	// ── Loading / not found ────────────────────────────────────────────────────
	if (!operationPassReady) {
		return (
			<div className="p-6">
				<h2 className="text-xl font-semibold">
					Checking operation password...
				</h2>
			</div>
		);
	}

	if (pageLoading) {
		return (
			<div className="p-6">
				<h2 className="text-xl font-semibold">Loading purchase draft...</h2>
			</div>
		);
	}

	if (!po) {
		return (
			<div className="p-6">
				<h2 className="text-xl font-semibold">PO not found</h2>
				<p className="text-sm text-slate-500">ID: {poId}</p>
			</div>
		);
	}

	// ── Render ─────────────────────────────────────────────────────────────────
	return (
		<div className="flex flex-col gap-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold">
						Edit Purchase Order – {(po as any).poNo || po.id}
					</h2>
					<p className="text-xs text-slate-500">
						একি সেলার থেকে একাধিক প্রোডাক্ট (২৮ ধান, ২৯ ধান, চাল...) একসাথে এডিট
						করতে পারবেন।
					</p>
				</div>
				<div className="flex gap-2">
					<button
						className="btn btn-ghost"
						disabled={isSaving}
						onClick={() => router.push(`/purchase/${po.id}`)}
					>
						Back to Details
					</button>
					<button
						className="btn btn-ghost"
						disabled={isSaving}
						onClick={() => saveChanges(false)}
					>
						Save Changes
					</button>
					<button
						className="btn btn-primary"
						disabled={isSaving}
						onClick={() => saveChanges(true)}
					>
						{isSaving ? "Saving..." : "Save & Review"}
					</button>
				</div>
			</div>

			{/* Stepper */}
			<div className="card">
				<div className="flex items-center gap-6 text-sm">
					<Step n={1} label="টাইপ/সেলার" step={step} />
					<Step n={2} label="প্রোডাক্ট + বস্তা/দর" step={step} />
					<Step n={3} label="খরচ" step={step} />
					<Step n={4} label="ডেস্টিনেশন/রিভিউ" step={step} />
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{/* LEFT: form */}
				<div className="lg:col-span-2 flex flex-col gap-4">
					{/* STEP 1 */}
					{step === 1 && (
						<section className="card">
							<h3 className="text-lg font-semibold mb-3">
								Purchase টাইপ ও বিক্রেতা
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm mb-1">Purchase টাইপ</label>
									<div className="flex rounded-lg border overflow-hidden">
										<button
											type="button"
											className={`px-3 py-2 text-sm ${purchaseType === "district" ? "bg-brand text-white" : "bg-white"}`}
											onClick={() => setPurchaseType("district")}
										>
											District
										</button>
										<button
											type="button"
											className={`px-3 py-2 text-sm ${purchaseType === "trolley" ? "bg-brand text-white" : "bg-white"}`}
											onClick={() => setPurchaseType("trolley")}
										>
											Trolley
										</button>
										<button
											type="button"
											className={`px-3 py-2 text-sm ${purchaseType === "retail" ? "bg-brand text-white" : "bg-white"}`}
											onClick={() => setPurchaseType("retail")}
										>
											Retail
										</button>
									</div>
								</div>

								<div className="md:col-span-2">
									<label className="block text-sm mb-1">বিক্রেতা</label>
									<SellerPicker
										value={seller || undefined}
										onChange={onSellerChange}
									/>
								</div>

								<div>
									<label className="block text-sm mb-1">ডিস্ট্রিক্ট</label>
									<input
										className="input"
										value={sellerDistrict}
										onChange={(e) => setSellerDistrict(e.target.value)}
										placeholder="যেমন: Naogaon"
									/>
								</div>
								<div>
									<label className="block text-sm mb-1">বাজার</label>
									<input
										className="input"
										value={sellerMarket}
										onChange={(e) => setSellerMarket(e.target.value)}
										placeholder="যেমন: Manda"
									/>
								</div>
								<div className="md:col-span-2">
									<label className="block text-sm mb-1">এড্রেস</label>
									<input
										className="input"
										value={sellerAddress}
										onChange={(e) => setSellerAddress(e.target.value)}
										placeholder="বিস্তারিত এড্রেস"
									/>
								</div>
								<div className="md:col-span-2">
									<label className="block text-sm mb-1">
										ট্রাক/ভ্যারাইটি নোট (ঐচ্ছিক)
									</label>
									<input
										className="input"
										value={varietyNote}
										onChange={(e) => setVarietyNote(e.target.value)}
										placeholder="যেমন: Truck DHA-11-1234 / ২৮+২৯ মিক্স"
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

					{/* STEP 2 – two-row card layout (mirrors create page exactly) */}
					{step === 2 && (
						<section className="card">
							<h3 className="text-lg font-semibold mb-3">
								প্রোডাক্ট + বস্তা/ওজন/দর
							</h3>

							<div className="overflow-x-auto">
								<tbody>
									{items.map((it, idx) => (
										<>
											{/* ROW 1 – category / product / bag / kg */}
											<tr
												key={`${idx}-row1`}
												className="border-t bg-white align-top"
											>
												<td className="py-2 px-2 min-w-[220px]">
													<label className="block text-[10px] text-slate-500 mb-1">
														প্রোডাক্ট ক্যাটেগরি
													</label>
													<select
														className="input h-9 text-xs w-full"
														value={it.productCategory}
														disabled={!!lockedCategory && items.length > 1}
														onChange={(e) => {
															const value = e.target.value;
															updateItem(idx, {
																productCategory: value,
																productId: "",
																productType: "",
															});
															if (items.length === 1) setLockedCategory(value);
														}}
													>
														<option value="">সব ক্যাটেগরি</option>
														{PRODUCT_CATEGORIES.map((c) => (
															<option key={c.value} value={c.value}>
																{c.label}
															</option>
														))}
													</select>
												</td>

												<td className="py-2 px-2 min-w-[240px]">
													<label className="block text-[10px] text-slate-500 mb-1">
														প্রোডাক্ট
													</label>
													<select
														className="input h-9 text-xs w-full"
														value={it.productId}
														disabled={!it.productCategory}
														onChange={(e) => {
															const pid = e.target.value;
															if (pid === "__add_new__") {
																openCreateProductPopup(idx);
																return;
															}
															const p = products.find((pr) => pr.id === pid);
															updateItem(idx, {
																productId: pid,
																productType: p?.name || "",
																productCategory:
																	p?.category || it.productCategory,
															});
															if (p?.category && !lockedCategory)
																setLockedCategory(p.category);
														}}
													>
														<option value="">
															{it.productCategory
																? "প্রোডাক্ট নির্বাচন করুন"
																: "আগে ক্যাটেগরি নির্বাচন করুন"}
														</option>
														{getFilteredProducts(it.productCategory).map(
															(p) => (
																<option key={p.id} value={p.id}>
																	{p.name} {p.category ? `(${p.category})` : ""}
																</option>
															),
														)}
														<option value="__add_new__">
															+ নতুন প্রোডাক্ট যোগ করুন...
														</option>
													</select>
												</td>

												<td className="py-2 px-2 w-[100px]">
													<label className="block text-[10px] text-slate-500 mb-1">
														বস্তা
													</label>
													<input
														className="input h-9 text-right w-full"
														value={it.bagCount}
														onChange={(e) =>
															updateItem(idx, { bagCount: e.target.value })
														}
													/>
												</td>

												<td className="py-2 px-2 w-[130px]">
													<label className="block text-[10px] text-slate-500 mb-1">
														আসল kg/বস্তা
													</label>
													<input
														className="input h-9 text-right w-full"
														value={it.actualKgPerBag}
														onChange={(e) =>
															updateItem(idx, {
																actualKgPerBag: e.target.value,
															})
														}
													/>
												</td>

												<td className="py-2 px-2 w-[130px]">
													<label className="block text-[10px] text-slate-500 mb-1">
														হিসাব kg/বস্তা
													</label>
													<input
														className="input h-9 text-right w-full"
														value={it.accountingKgPerBag}
														onChange={(e) =>
															updateItem(idx, {
																accountingKgPerBag: e.target.value,
															})
														}
													/>
												</td>

												<td colSpan={4}></td>
											</tr>

											{/* ROW 2 – weight policy / rate basis / rate / remove */}
											<tr key={`${idx}-row2`} className="bg-white border-b">
												<td className="py-1 px-2">
													<label className="block text-[10px] text-slate-500 mb-1">
														ওজন ধরন
													</label>
													<div className="flex rounded border overflow-hidden h-9">
														<button
															type="button"
															className={`flex-1 text-xs ${it.weightPolicy === "actual" ? "bg-brand text-white" : "bg-white"}`}
															onClick={() =>
																updateItem(idx, { weightPolicy: "actual" })
															}
														>
															আসল
														</button>
														<button
															type="button"
															className={`flex-1 text-xs ${it.weightPolicy === "accounting" ? "bg-brand text-white" : "bg-white"}`}
															onClick={() =>
																updateItem(idx, { weightPolicy: "accounting" })
															}
														>
															হিসাব
														</button>
													</div>
												</td>

												<td className="py-1 px-2" colSpan={2}>
													<label className="block text-[10px] text-slate-500 mb-1">
														রেট ভিত্তি
													</label>
													<div className="flex rounded border overflow-hidden h-9">
														<button
															className={`flex-1 text-xs ${it.rateBasis === "perMon" ? "bg-brand text-white" : "bg-white"}`}
															onClick={() =>
																updateItem(idx, { rateBasis: "perMon" })
															}
														>
															৳/মণ
														</button>
														<button
															className={`flex-1 text-xs ${it.rateBasis === "perKg" ? "bg-brand text-white" : "bg-white"}`}
															onClick={() =>
																updateItem(idx, { rateBasis: "perKg" })
															}
														>
															৳/কেজি
														</button>
														<button
															className={`flex-1 text-xs ${it.rateBasis === "perBag" ? "bg-brand text-white" : "bg-white"}`}
															onClick={() =>
																updateItem(idx, { rateBasis: "perBag" })
															}
														>
															৳/বস্তা
														</button>
													</div>
												</td>

												<td className="py-1 px-2">
													<label className="block text-[10px] text-slate-500 mb-1">
														দর
													</label>
													<input
														className="input h-9 text-right w-full"
														value={it.rateValue}
														onChange={(e) =>
															updateItem(idx, { rateValue: e.target.value })
														}
													/>
												</td>

												<td className="py-1 px-2 text-center">
													<label className="block text-[10px] text-slate-500 mb-1">
														অ্যাকশন
													</label>
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
										</>
									))}
								</tbody>
							</div>

							<div className="flex justify-between items-center mt-3 text-xs text-slate-600">
								<div className="flex gap-2">
									<button
										type="button"
										className="btn btn-ghost btn-sm"
										onClick={addItem}
									>
										+ Add Product
									</button>
									<button
										type="button"
										className="btn btn-warning btn-sm"
										onClick={resetProducts}
									>
										Reset Selection
									</button>
								</div>
								<div>
									Total Bags: <b>{totalBags}</b> • Stock:{" "}
									<b>
										{fmtNum(stockKg, 3)} kg ({fmtNum(stockKg / KG_PER_MON, 2)}{" "}
										মণ)
									</b>
								</div>
							</div>

							<div className="flex items-center justify-between mt-4">
								<button className="btn btn-ghost" onClick={() => setStep(1)}>
									Back
								</button>
								<button className="btn btn-primary" onClick={() => setStep(3)}>
									Next
								</button>
							</div>
						</section>
					)}

					{/* STEP 3 – Cost & transport */}
					{step === 3 && (
						<section className="card">
							<h3 className="text-lg font-semibold mb-3">খরচ ও ট্রান্সপোর্ট</h3>

							<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
								{/* Transport Mode row */}
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
											<button
												type="button"
												className={`flex-1 px-3 py-2 text-sm ${transportMode === "sellerIncluded" ? "bg-brand text-white" : "bg-white"}`}
												onClick={() => setTransportMode("sellerIncluded")}
											>
												Seller Included
											</button>
											<button
												type="button"
												className={`flex-1 px-3 py-2 text-sm ${transportMode === "marketTruck" ? "bg-brand text-white" : "bg-white"}`}
												onClick={() => setTransportMode("marketTruck")}
											>
												Market Truck
											</button>
											<button
												type="button"
												className={`flex-1 px-3 py-2 text-sm ${transportMode === "ownTruck" ? "bg-brand text-white" : "bg-white"}`}
												onClick={() => setTransportMode("ownTruck")}
											>
												Own Truck
											</button>
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
										<button
											type="button"
											className={`flex-1 px-3 py-2 text-sm ${bagCostMode === "paid" ? "bg-brand text-white" : "bg-white"}`}
											onClick={() => setBagCostMode("paid")}
										>
											বস্তার দাম দিলাম
										</button>
										<button
											type="button"
											className={`flex-1 px-3 py-2 text-sm ${bagCostMode === "self" ? "bg-brand text-white" : "bg-white"}`}
											onClick={() => setBagCostMode("self")}
										>
											আমার বস্তা
										</button>
										<button
											type="button"
											className={`flex-1 px-3 py-2 text-sm ${bagCostMode === "mixed" ? "bg-brand text-white" : "bg-white"}`}
											onClick={() => setBagCostMode("mixed")}
										>
											মিশ্র
										</button>
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
										label="Paid Bags (মোট কত বস্তার দাম দিলাম)"
										value={paidBagCount}
										onChange={setPaidBagCount}
										placeholder={`যেমন: ${totalBags || 10}`}
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

							{/* Own Truck Driver Info */}
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
													{drivers.map((d: any) => (
														<option key={d.id} value={d.id}>
															{d.name} ({d.id})
														</option>
													))}
												</select>
												{driverId && (
													<div className="mt-2 text-sm">
														<strong
															className={
																driverBalance < 0
																	? "text-red-500"
																	: "text-green-600"
															}
														>
															{driverBalanceLoading ? (
																"লোড হচ্ছে..."
															) : (
																<span className="text-nowrap">
																	{driverBalance > 0
																		? "পাওনা ব্যালেন্স: "
																		: "দেনা ব্যালেন্স: "}
																	{driverBalance > 0 ? "+" : "-"}
																	{bnMoney(Math.abs(driverBalance))} টাকা
																</span>
															)}
														</strong>
													</div>
												)}
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

									{hasSelectedDriver && (
										<div className="mt-4 border rounded-lg p-4 bg-slate-50">
											<label className="flex items-center gap-2 text-sm font-medium">
												<input
													type="checkbox"
													checked={giveDriverAdvance}
													onChange={(e) =>
														setGiveDriverAdvance(e.target.checked)
													}
												/>
												ড্রাইভারকে অগ্রিম দিন
											</label>

											{giveDriverAdvance && (
												<div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
													<div className="md:col-span-2">
														<div className="text-xs mb-1">Advance / Loan</div>
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
																{accounts
																	.filter(
																		(a) =>
																			a.type === "cash" || a.type === "bank",
																	)
																	.map((a) => (
																		<option key={a.id} value={a.id}>
																			{a.name}
																		</option>
																	))}
															</select>
															<button
																type="button"
																className="btn"
																onClick={giveAdvance}
															>
																Post Advance
															</button>
														</div>
														<div className="text-xs text-slate-500 mt-1">
															Advance posting: <b>Dr Driver | Cr Instrument</b>
														</div>
													</div>
												</div>
											)}
										</div>
									)}
								</div>
							)}

							<div className="flex items-center justify-between mt-4">
								<button className="btn btn-ghost" onClick={() => setStep(2)}>
									Back
								</button>
								<button className="btn btn-primary" onClick={() => setStep(4)}>
									Next
								</button>
							</div>
						</section>
					)}

					{/* STEP 4 – Destination / Review */}
					{step === 4 && (
						<section className="card">
							<h3 className="text-lg font-semibold mb-3">ডেস্টিনেশন / রিভিউ</h3>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm mb-1">
										পণ্য কোথায় যাবে?
									</label>
									<div className="flex rounded-lg border overflow-hidden">
										<button
											type="button"
											className={`flex-1 px-3 py-1 text-sm ${destKind === "warehouse" ? "bg-brand text-white" : "bg-white"}`}
											onClick={() => setDestKind("warehouse")}
										>
											ওয়্যারহাউস
										</button>
										<button
											type="button"
											className={`flex-1 px-3 py-1 text-sm ${destKind === "mill" ? "bg-brand text-white" : "bg-white"}`}
											onClick={() => setDestKind("mill")}
										>
											Direct Mill / Factory
										</button>
									</div>
								</div>

								{destKind === "warehouse" && (
									<div>
										<label className="block text-sm mb-1">
											ওয়্যারহাউস সিলেক্ট
										</label>
										<select
											className="input"
											value={destWarehouseId}
											onChange={(e) => setDestWarehouseId(e.target.value)}
										>
											{warehouses.map((w) => (
												<option key={w.id} value={w.id}>
													{w.name}
												</option>
											))}
										</select>
									</div>
								)}

								{destKind === "mill" && (
									<div className="md:col-span-1">
										<label className="block text-sm mb-1">
											মিল / ফ্যাক্টরি (কাস্টমার)
										</label>
										<select
											className="input"
											value={destMill?.id || ""}
											onChange={(e) => onMillSelect(e.target.value)}
										>
											<option value="">মিল / কাস্টমার নির্বাচন করুন</option>
											{mills.map((m) => (
												<option key={m.id} value={m.id}>
													{m.name}
												</option>
											))}
										</select>
									</div>
								)}

								<div className="md:col-span-2">
									<Input
										label="মন্তব্য"
										value={remarks}
										onChange={setRemarks}
										placeholder="ঐচ্ছিক"
									/>
								</div>
							</div>

							<div className="text-sm text-slate-600 mt-4 space-y-1">
								<div>
									মোট খরচ: <b>{fmt(totalCost)}</b>
								</div>
								<div className="text-xs text-slate-500">
									Dest:{" "}
									{destKind === "warehouse"
										? `Warehouse: ${warehouses.find((w) => w.id === destWarehouseId)?.name || "N/A"}`
										: `Direct Mill: ${destMill?.name || "না নির্বাচিত"}`}
								</div>
							</div>

							<div className="flex items-center justify-between mt-4">
								<button className="btn btn-ghost" onClick={() => setStep(3)}>
									Back
								</button>
								<div className="flex gap-2">
									<button
										className="btn btn-ghost"
										disabled={isSaving}
										onClick={() => saveChanges(false)}
									>
										Save Changes
									</button>
									<button
										className="btn btn-primary"
										disabled={isSaving}
										onClick={() => saveChanges(true)}
									>
										{isSaving ? "Saving..." : "Save & Review"}
									</button>
								</div>
							</div>
						</section>
					)}
				</div>

				{/* RIGHT: Summary (mirrors create page exactly) */}
				<aside className="card h-max sticky top-6">
					<h3 className="text-lg font-semibold mb-3">সারাংশ</h3>
					<ul className="text-sm space-y-2">
						<li className="flex justify-between">
							<span>টাইপ</span>
							<b>{purchaseType}</b>
						</li>
						<li className="flex justify-between">
							{showProductPopup && (
								<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
									<div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
										<div className="flex items-center justify-between border-b px-4 py-3">
											<h3 className="text-base font-semibold">
												নতুন প্রোডাক্ট যোগ করুন
											</h3>
											<button
												type="button"
												className="btn btn-ghost btn-sm"
												onClick={() => {
													if (isCreatingProduct) return;
													setShowProductPopup(false);
													setProductTargetRow(null);
												}}
											>
												Close
											</button>
										</div>
										<div className="p-4">
											<ProductForm
												initial={newProductInitial}
												onSubmit={onCreateProduct}
												submitText={
													isCreatingProduct ? "Saving..." : "Create Product"
												}
											/>
										</div>
									</div>
								</div>
							)}
							<span>সেলার</span>
							<b>{seller?.name || "-"}</b>
						</li>
						<li className="flex justify-between">
							<span>এড্রেস</span>
							<b className="text-right">
								{[sellerDistrict, sellerMarket, sellerAddress]
									.filter(Boolean)
									.join(" • ") || "-"}
							</b>
						</li>
					</ul>

					<div className="mt-3 border-t pt-2">
						<div className="text-xs font-semibold mb-1">প্রোডাক্টসমূহ</div>
						<ul className="text-xs space-y-1 max-h-40 overflow-auto pr-1">
							{items.map((it, idx) => (
								<li key={idx} className="flex justify-between">
									<span>
										{it.productType} • {it.bagCount || 0} বস্তা
									</span>
									<span>
										{it.weightPolicy === "actual" ? "আসল" : "হিসাব"} •{" "}
										{it.rateBasis === "perKg"
											? `${it.rateValue || 0} ৳/kg`
											: it.rateBasis === "perBag"
												? `${it.rateValue || 0} ৳/বস্তা`
												: `${it.rateValue || 0} ৳/মণ`}
									</span>
								</li>
							))}
						</ul>
					</div>

					{/* Per-product cost breakdown cards — same as create page */}
					<div className="mt-3 border-t pt-2 text-xs space-y-2">
						<div className="font-semibold mb-1">প্রোডাক্ট খরচ ও হার</div>
						{linePrices.map((line, idx) => {
							const rateBasisLabel =
								line.rateBasis === "perKg"
									? "৳/kg"
									: line.rateBasis === "perBag"
										? "৳/বস্তা"
										: "৳/মণ";
							return (
								<div key={idx} className="border rounded p-2 bg-slate-50">
									<div className="flex justify-between font-medium mb-1">
										<span>{line.product}</span>
										<span>{fmt(line.cost)}</span>
									</div>
									<div className="flex justify-between text-slate-600 text-[11px] mb-1">
										<span>
											হার: {line.rateValue} {rateBasisLabel}
										</span>
										<span>স্টক: {fmtNum(line.stock, 2)} kg</span>
									</div>
									<div className="flex justify-between text-slate-600 text-[11px]">
										<span>Avg: {fmt(line.avgPerKg)} ৳/kg</span>
										<span>Avg: {fmt(line.avgPerMon)} ৳/মণ</span>
									</div>
								</div>
							);
						})}
					</div>

					<div className="mt-3 border-t pt-2 text-sm space-y-1">
						<div className="flex justify-between">
							<span>মোট বস্তা</span>
							<b>{totalBags}</b>
						</div>
						<div className="flex justify-between">
							<span>স্টক (কেজি)</span>
							<b>{fmtNum(stockKg, 3)}</b>
						</div>
						<div className="flex justify-between">
							<span>ক্রয় (বেস)</span>
							<b>{fmt(basePurchase)}</b>
						</div>
						<div className="flex justify-between">
							<span>Transport</span>
							<b>{fmt(transportCost)}</b>
						</div>
						<div className="flex justify-between">
							<span>Bag</span>
							<b>
								{fmt(bagCostTotal)} {bagCostMode === "self" ? "(Self)" : ""}
							</b>
						</div>
						{bagCostMode === "mixed" && (
							<div className="flex justify-between text-xs text-slate-500">
								<span>Bag Split</span>
								<b>
									Own {ownBags} | Paid {paidBags}
								</b>
							</div>
						)}
						<div className="flex justify-between">
							<span>L/UL + Misc</span>
							<b>{fmt(Number(loadingUnloading || 0) + Number(misc || 0))}</b>
						</div>
						<div className="flex justify-between border-t pt-2">
							<span>মোট</span>
							<b>{fmt(totalCost)}</b>
						</div>
					</div>
				</aside>
			</div>
		</div>
	);
}

/** UI helpers */
function Step({ n, label, step }: { n: number; label: string; step: number }) {
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
