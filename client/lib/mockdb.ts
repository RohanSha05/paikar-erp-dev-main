'use client';
export const KG_PER_MON = 40;

/** Domain Types (existing + keep compatible) */
export type PurchaseType = 'district' | 'trolley' | 'retail';
export type PurchaseDestinationType = 'Warehouse' | 'Mill/Factory' | 'undecided';
export type TransportMode = 'seller' | 'self' | 'none';
export type PurchaseLine = {
  lineId: string;
  productId:string;
  productName: string;
  weightPolicy: WeightPolicy;

  bagCount: number;
  actualKgPerBag: number;
  accountingKgPerBag: number;

  rateBasis: RateBasis;
  rateValue: number;

  transportMode: TransportMode;
  transportCost: number;

  loadingUnloading: number;
  misc: number;

  destinationType: PurchaseDestinationType;
  destinationRefId?: string;
};
export type WeightPolicy = 'actual' | 'accounting';
export type RateBasis = 'perMon' | 'perKg';

export type Seller = { id:string; name:string; address?:string; district?:string; market?:string; phone?:string; };
export type Customer = { id:string; name:string; address?:string; district?:string; market?:string; phone?:string; type?: 'mill'|'retailer'|'other'; };
export type PurchaseDestinationKind = 'warehouse' | 'mill';
export type PurchaseOrder = {
  productId: any;
  id:string; status:'draft'|'approved'; purchaseType:PurchaseType;
  sellerId:string; sellerSnapshot:Seller;
  // NEW: multi-line products
  items?: PurchaseItem[];
  bagCount:number; actualKgPerBag:number; accountingKgPerBag:number; weightPolicy:WeightPolicy;
  rateBasis:RateBasis; rateValue:number; transport:number; 
  bagCostMode:'paid'|'self'; bagCostPerBag:number;
  loadingUnloading:number; misc:number; warehouse:string; remarks?:string; 
  productType:string; varietyNote?:string; createdAt:string;
  destinationRef?: { type: 'warehouse' | 'mill'; id: string; name?: string };
  advancePaid?: number;              // optional advance at PO time
  advanceInstrumentId?: string;      // Instrument.id
  // 🚚 নতুন ফিল্ড — Transport / Driver Integration
  transportMode?: 'sellerIncluded' | 'marketTruck' | 'ownTruck';
  lotIds?: string[]; // ✅ approved হলে কোন কোন Lot তৈরি হলো – track
  driverId?: string;
  driverName?: string;
  truckNo?: string;
  route?: string;
  driverTripId?: string;
  // Destination
  destinationKind?: PurchaseDestinationKind;   // 'warehouse' | 'mill'
  destinationWarehouseId?: string | null;      // warehouse.id যদি warehouse এ স্টক যায়
  destinationCustomerId?: string | null;       // customer.id যদি direct mill এ যায়
    // NEW: multi-line + destination
  lines?: PurchaseLine[];
  destinationType?: PurchaseDestinationType;
  destinationRefId?: string;

};
export type PurchaseItem = {
  id: string;
  productId?: string;      // NEW: master product id
  productType: string;     // display name, fallback
  bagCount: number;
  actualKgPerBag: number;
  accountingKgPerBag: number;
  weightPolicy: WeightPolicy;
  rateBasis: RateBasis;
  rateValue: number;
};

export type Lot = {
  id: string;
  label: string;

  productId?: string;     // NEW
  productType: string;

  warehouseId?: string;   // NEW (source of truth)
  warehouseName?: string; // optional UI convenience

  availableKg: number;
  avgCostPerKg: number;

  meta: any;
  createdAt: string;
};

export type SalesItem = { lotId:string; productType:string; qtyKg:number; rateBasis:RateBasis; rateValue:number; };
export type SalesOrder = {
  id:string; status:'draft'|'confirmed'; customerId:string; customerSnapshot:Customer;
  items:SalesItem[]; transport:number; loadingUnloading:number; misc:number; remarks?:string; createdAt:string;
};

export type Warehouse = { id:string; name:string; address?:string };

/** Accounts / Cashbook */
export type VoucherType = 'receipt'|'payment'|'contra'|'journal';
export type AccountType = 'cash'|'bank'|'party'|'expense'|'income'|'loan'|'equity'|'transport';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  partyRef?: { kind: PartyKind; id: string }; // <-- widened here
  bankInfo?: string;
  opening?: number;
  active?: boolean;
};
export type TxnRow = { accountId:string; dr?:number; cr?:number; memo?:string };
export type Voucher = { id:string; vtype:VoucherType; vdate:string; rows:TxnRow[]; narration?:string; createdAt:string; locked?:boolean };
export type DayLock = { date:string; lockedAt:string };
// ---------- PRODUCT MASTER ----------
// -------------------- PRODUCT MASTER (CRUD) --------------------
export type Product = {
  id: string;            // immutable
  name: string;          // e.g. "২৮ ধান"
  code: string;          // e.g. "P28"
  category?: string;     // e.g. "ধান", "চাল"
  unit: 'kg' | 'mon' | 'bag';
  active: boolean;
  createdAt: string;
  updatedAt?: string;
};

const PRODUCT_KEY = 'paikar-products';
let uidSafeSeq = 0;

// safer unique id (avoid same-second duplicates)
function uidSafe(prefix = 'ID') {
  const t = new Date();
  const base =
    `${prefix}-${t.getFullYear().toString().slice(2)}` +
    `${String(t.getMonth() + 1).padStart(2, '0')}` +
    `${String(t.getDate()).padStart(2, '0')}` +
    `-${String(t.getHours()).padStart(2, '0')}` +
    `${String(t.getMinutes()).padStart(2, '0')}` +
    `${String(t.getSeconds()).padStart(2, '0')}` +
    `-${String(t.getMilliseconds()).padStart(3, '0')}`;
  uidSafeSeq = (uidSafeSeq % 999) + 1;
  return `${base}-${String(uidSafeSeq).padStart(3, '0')}`;
}

// If you already have uid() exported, keep it. But for product id use uidSafe('PRD').
export function newProductId() {
  return uidSafe('PRD');
}

export function loadProducts(): Product[] {
  if (typeof localStorage === 'undefined') return [];
  ensureSeedProducts();
  const raw = localStorage.getItem(PRODUCT_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as Product[]) : [];
  } catch {
    return [];
  }
}

export function saveProducts(list: Product[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PRODUCT_KEY, JSON.stringify(list));
}

export function getProduct(id: string): Product | undefined {
  return loadProducts().find(p => p.id === id);
}

export function upsertProduct(p: Product) {
  const all = loadProducts();
  const now = new Date().toISOString();
  const next: Product = {
    ...p,
    updatedAt: now,
    createdAt: p.createdAt || now,
  };

  const idx = all.findIndex(x => x.id === next.id);
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);

  saveProducts(all);
}

export function softDeleteProduct(id: string) {
  const all = loadProducts();
  const idx = all.findIndex(x => x.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], active: false, updatedAt: new Date().toISOString() };
    saveProducts(all);
  }
}

export function restoreProduct(id: string) {
  const all = loadProducts();
  const idx = all.findIndex(x => x.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], active: true, updatedAt: new Date().toISOString() };
    saveProducts(all);
  }
}

export function ensureSeedProducts() {
  if (typeof localStorage === 'undefined') return;

  const raw = localStorage.getItem(PRODUCT_KEY);
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return;
    } catch {
      // continue seeding
    }
  }

  const now = new Date().toISOString();
  const seed: Product[] = [
    { id: 'PRD-28',   name: '২৮ ধান', code: 'P28',   category: 'ধান', unit: 'bag', active: true, createdAt: now },
    { id: 'PRD-29',   name: '২৯ ধান', code: 'P29',   category: 'ধান', unit: 'bag', active: true, createdAt: now },
    { id: 'PRD-CHAL', name: 'চাল',    code: 'CHAL',  category: 'চাল', unit: 'bag', active: true, createdAt: now },
  ];
  localStorage.setItem(PRODUCT_KEY, JSON.stringify(seed));
}

/** Inventory Moves (for stock card) */
export type StockMove = {
  id: string;
  lotId: string;
  warehouseId: string;
  qtyKg: number; // +in / -out
  reason: 'purchase' | 'sale' | 'transfer' | 'adjustment';
  refType?: 'PO' | 'SO' | 'ADJ' | 'TRF';
  refId?: string;
  createdAt: string;

  // ✅ optional extras (safe)
  memo?: string;
  lotLabel?: string;
};

/**
 * Transfer stock between warehouses.
 * - lotId: source lot
 * - toWarehouseId: destination warehouse
 * - qtyKg: weight to transfer
 */
/**
 * Transfer stock between warehouses (Lot split supported).
 * - Uses lot.meta.warehouseId (fallback: lot.meta.warehouse)
 * - Keeps avgCostPerKg same (no weighted avg here; that's fine for transfer)
 * - Creates StockMove via recordMove() (reason: 'transfer', refType: 'TRF')
 */
export function transferLot(
  lotId: string,
  toWarehouseId: string,
  qtyKg: number,
  memo: string = 'Stock transfer'
) {
  const q = Number(qtyKg || 0);
  if (!(q > 0)) throw new Error('Qty must be positive');

  const lots = loadLots();
  const from = lots.find((l) => l.id === lotId);
  if (!from) throw new Error(`Lot not found: ${lotId}`);

  if (q > Number(from.availableKg || 0))
    throw new Error('Not enough stock in source lot');

  // warehouse master
  const whs = loadWarehouses();
  const toWhName =
    whs.find((w) => w.id === toWarehouseId)?.name || toWarehouseId;

  // ---- 1) source reduce ----
  from.availableKg = Math.max(0, Number(from.availableKg || 0) - q);

  // ---- 2) destination lot find/create ----
  const fromMeta = from.meta || {};
  const poId = fromMeta.poId;
  const poItemId = fromMeta.poItemId;

  const dest = lots.find((l) => {
    const m = l.meta || {};
    return (
      l.productType === from.productType &&
      m.poId === poId &&
      m.poItemId === poItemId &&
      m.warehouseId === toWarehouseId
    );
  });

  if (dest) {
    dest.availableKg = Number(dest.availableKg || 0) + q;
  } else {
    const newLot: Lot = {
      id: uid('LOT'),
      productType: from.productType,
      availableKg: q,
      avgCostPerKg: Number(from.avgCostPerKg || 0),
      label: `LOT-${(from.productType || 'ITEM').slice(0, 6)}-${toWhName}`,
      meta: {
        ...(fromMeta || {}),
        warehouseId: toWarehouseId,
        warehouseName: toWhName,
        transferredFromLotId: from.id,
      },
      createdAt: new Date().toISOString(),
    };
    lots.unshift(newLot);
  }

  // ---- 3) save ----
  saveLots(lots);

  // ---- 4) record moves ----
  const ref = uid('TRF');

  recordMove(
    from.id,
    fromMeta?.warehouseId || 'WH',
    -q,
    'transfer',
    'TRF',
    ref
  );

  // find dest again (after create)
  const dest2 = loadLots().find((l) => {
    const m = l.meta || {};
    return (
      l.productType === from.productType &&
      m.poId === poId &&
      m.poItemId === poItemId &&
      m.warehouseId === toWarehouseId
    );
  });

  if (dest2) {
    recordMove(
      dest2.id,
      toWarehouseId,
      q,
      'transfer',
      'TRF',
      ref
    );
  }

  return true;
}

export function saveLots(lots: Lot[]) {
  _writeLotsBoth(lots);
}
/** Storage helpers */
function get<T>(k:string, fb:T):T{ try{ return JSON.parse(localStorage.getItem(k)||'') as T }catch{ return fb } }
function set<T>(k:string, v:T){ localStorage.setItem(k, JSON.stringify(v)); }
let __uidCounter = 0;

export function uid(prefix = 'ID') {
  const d = new Date();
  const yy = d.getFullYear().toString().slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  __uidCounter = (__uidCounter % 999) + 1;

  return `${prefix}-${yy}${mm}${dd}-${hh}${mi}${ss}${ms}-${String(__uidCounter).padStart(3, '0')}`;
}

/** Sellers/Customers */
export function loadSellers():Seller[]{ return get<Seller[]>('grain_sellers',[]); }
export function saveSeller(s:Seller){ const all=loadSellers(); const i=all.findIndex(x=>x.id===s.id); if(i>=0) all[i]=s; else all.unshift(s); set('grain_sellers',all); ensurePartyAccount('seller', s.id, s.name); }
export function searchSellers(k:string){ k=k.trim().toLowerCase(); if(!k) return loadSellers().slice(0,10); return loadSellers().filter(s=>(s.name||'').toLowerCase().includes(k) || (s.district||'').toLowerCase().includes(k) || (s.market||'').toLowerCase().includes(k)).slice(0,10); }

export function loadCustomers():Customer[]{ return get<Customer[]>('grain_customers',[]); }
export function saveCustomer(c:Customer){ const all=loadCustomers(); const i=all.findIndex(x=>x.id===c.id); if(i>=0) all[i]=c; else all.unshift(c); set('grain_customers',all); ensurePartyAccount('customer', c.id, c.name); }
export function searchCustomers(k:string){ k=k.trim().toLowerCase(); if(!k) return loadCustomers().slice(0,10); return loadCustomers().filter(c=>(c.name||'').toLowerCase().includes(k) || (c.district||'').toLowerCase().includes(k) || (c.market||'').toLowerCase().includes(k)).slice(0,10); }

/** Warehouses */
export function loadWarehouses():Warehouse[]{ return get<Warehouse[]>('grain_wh',[]); }
export function saveWarehouse(w:Warehouse){ const all=loadWarehouses(); const i=all.findIndex(x=>x.id===w.id); if(i>=0) all[i]=w; else all.unshift(w); set('grain_wh', all); }

/** Purchase Orders */
export function loadPOs():PurchaseOrder[]{ return get<PurchaseOrder[]>('grain_pos',[]); }
export function savePO(po:PurchaseOrder){ const all=loadPOs(); const i=all.findIndex(x=>x.id===po.id); if(i>=0) all[i]=po; else all.unshift(po); set('grain_pos',all); }
export function getPO(id:string){ return loadPOs().find(p=>p.id===id); }
export function updatePOStatus(id:string, status:PurchaseOrder['status']){ const all=loadPOs(); const i=all.findIndex(x=>x.id===id); if(i>=0){ all[i].status=status; set('grain_pos', all); } }


// Helper: rate per kg করবো basis অনুযায়ী
export function ratePerKgFromBasis(basis: RateBasis, v: number) {
  return basis === 'perKg' ? v : v / KG_PER_MON;
}

// ⬇️ পুরোনো calcTotalsForPO রিপ্লেস করুন
export function calcTotalsForPO(po: PurchaseOrder) {
  // ✅ NEW: items based (multi-product)
  if (po.items && po.items.length > 0) {
    let totalActualKg = 0;
    let totalAccountingKg = 0;
    let totalStockKg = 0;
    let basePurchase = 0;
    let totalBags = 0;

    for (const it of po.items) {
      const bags = it.bagCount || 0;

      const actualKg = bags * (it.actualKgPerBag || 0);
      const accountingKg = bags * (it.accountingKgPerBag || 0);

      totalActualKg += actualKg;
      totalAccountingKg += accountingKg;
      totalBags += bags;

      const stockKgLine =
        (it.weightPolicy || 'accounting') === 'actual'
          ? actualKg
          : accountingKg;

      totalStockKg += stockKgLine;

      const rkg = ratePerKgFromBasis(it.rateBasis, it.rateValue || 0);
      basePurchase += stockKgLine * rkg;
    }

    const bagCostTotal =
      po.bagCostMode === 'self' ? 0 : totalBags * (po.bagCostPerBag || 0);

    const extraCosts =
      (po.transport || 0) +
      (po.loadingUnloading || 0) +
      (po.misc || 0) +
      bagCostTotal;

    const totalCost = basePurchase + extraCosts;
    const avgPerKg = totalStockKg > 0 ? totalCost / totalStockKg : 0;

    return {
      totalActualKg,
      totalAccountingKg,
      stockKg: totalStockKg,
      basePurchase,
      bagCostTotal,
      extraCosts,
      totalCost,
      avgPerKg,
      avgPerMon: avgPerKg * KG_PER_MON,
      totalBags,
    };
  }

  // 🔙 fallback single-head (legacy)
  const totalActualKg = (po.actualKgPerBag || 0) * (po.bagCount || 0);
  const totalAccountingKg = (po.accountingKgPerBag || 0) * (po.bagCount || 0);
  const stockKg =
    (po.weightPolicy || 'accounting') === 'actual'
      ? totalActualKg
      : totalAccountingKg;

  const ratePerKg = ratePerKgFromBasis(po.rateBasis, po.rateValue || 0);
  const basePurchase = stockKg * ratePerKg;

  const bagCostTotal =
    po.bagCostMode === 'self'
      ? 0
      : (po.bagCount || 0) * (po.bagCostPerBag || 0);

  const extraCosts =
    (po.transport || 0) +
    (po.loadingUnloading || 0) +
    (po.misc || 0) +
    bagCostTotal;

  const totalCost = basePurchase + extraCosts;
  const avgPerKg = stockKg > 0 ? totalCost / stockKg : 0;

  return {
    totalActualKg,
    totalAccountingKg,
    stockKg,
    basePurchase,
    bagCostTotal,
    extraCosts,
    totalCost,
    avgPerKg,
    avgPerMon: avgPerKg * KG_PER_MON,
  };
}

/** Lots (dual-key compatible) */
function _readLotsPrimary():Lot[]{ return get<Lot[]>('grain_lots',[]); }
function _readLotsLegacy():Lot[]{ return get<Lot[]>('grain_mock_lots',[]); }
export function loadLots():Lot[]{ const a=_readLotsPrimary(); if(a && a.length) return a; const b=_readLotsLegacy(); return b||[]; }
// === Cost helpers ===
export function getLotAverageCost(lotId: string): { perKg: number; perMon: number } {
  const lots = loadLots();
  const lot = lots.find(l => l.id === lotId);
  if (!lot) return { perKg: 0, perMon: 0 };

  const perKg = Number(lot.avgCostPerKg || 0);
  const perMon = perKg * 40; // ১ মণ = ৪০ কেজি
  return { perKg, perMon };
}

function _writeLotsBoth(lots:Lot[]){ set('grain_lots', lots); set('grain_mock_lots', lots); }

export function saveLot(l: Lot) {
  const all = loadLots();
  const i = all.findIndex(x => x.id === l.id);
  if (i >= 0) all[i] = l;
  else all.unshift(l);
  _writeLotsBoth(all);
}
export function updateLotQty(lotId: string, deltaKg: number) {
  const lot = getLot(lotId);
  if (!lot) return;

  const cur = Number(lot.availableKg || 0);
  const next = Math.max(0, cur + Number(deltaKg || 0)); // ✅ add delta (delta can be negative)

  saveLot({ ...lot, availableKg: next });               // ✅ do NOT delete lot
}
export function getLot(id:string){ return loadLots().find(l=>l.id===id); }

/** Stock Moves */
export function loadMoves():StockMove[]{ return get<StockMove[]>('grain_moves',[]); }
export function saveMove(m:StockMove){ const all=loadMoves(); all.unshift(m); set('grain_moves', all); }
function recordMove(lotId:string, warehouseId:string, qtyKg:number, reason:StockMove['reason'], refType?:StockMove['refType'], refId?:string){
  const m:StockMove = { id:uid('MV'), lotId, warehouseId, qtyKg, reason, refType, refId, createdAt:new Date().toISOString() };
  saveMove(m);
}

/** Approve PO → Create Lot + Move + Auto-post */
export function approvePOAndCreateLot(poId: string): Lot {
  const po = getPO(poId);
  if (!po) throw new Error('PO not found');

  // Status update
  //updatePOStatus(poId, 'approved');

  const now = new Date().toISOString();

  // destination determine
  const whs = loadWarehouses();
  const destKind = po.destinationKind || 'warehouse';

  const whId =
    destKind === 'warehouse'
      ? (po.destinationWarehouseId || whs[0]?.id || 'WH-1')
      : 'MILL';

  const whName =
    destKind === 'warehouse'
      ? (whs.find(w => w.id === whId)?.name || po.warehouse || whId)
      : (po.destinationCustomerId ? `MILL:${po.destinationCustomerId}` : 'Direct Mill');

  // items source (new preferred)
  const items: PurchaseItem[] = (po.items && po.items.length) ? po.items : [];

  // fallback: old lines
  const lines: PurchaseLine[] = (po.lines && po.lines.length) ? po.lines : [];

  const lotsCreated: Lot[] = [];

  // helper to create one lot
  const createLot = (
    productType: string,
    stockKg: number,
    avgPerKg: number,
    poItemId?: string,
    line?: PurchaseLine
  ) => {
    const kgPerBag =
      (po.weightPolicy || 'accounting') === 'actual'
        ? (line?.actualKgPerBag ?? po.actualKgPerBag ?? 0)
        : (line?.accountingKgPerBag ?? po.accountingKgPerBag ?? 0);

    const lot: Lot = {
      id: uid('LOT'),
      productId: (line as any)?.productId || (poItemId ? (items.find(x => x.id === poItemId)?.productId) : undefined),
      productType: productType || po.productType || 'ITEM',

      warehouseId: whId,          // ✅ root
      warehouseName: whName,      // ✅ root

      availableKg: Math.round(stockKg),
      avgCostPerKg: Number((avgPerKg || 0).toFixed(4)),

      label: makeLotLabel({
        createdAtISO: now,
        sellerName: po.sellerSnapshot?.name || po.sellerId,
        productType: productType || po.productType || 'ITEM',
        productId: (poItemId ? (items.find(x => x.id === poItemId)?.productId) : undefined),
        warehouseName: whName,
        bagCount: Number((line?.bagCount ?? (items.find(x => x.id === poItemId)?.bagCount) ?? 0)),
      }),

      meta: {
        poId: po.id,
        poItemId: poItemId || null,
        warehouseId: whId,
        warehouseName: whName,
        initialKg: Math.round(stockKg),
        seller: po.sellerSnapshot,
        lineId: line?.lineId || null,
        kgPerBag,
        bagCount: Number((line?.bagCount ?? (items.find(x => x.id === poItemId)?.bagCount) ?? 0)),
        weightPolicy: (line?.weightPolicy ?? (items.find(x => x.id === poItemId)?.weightPolicy) ?? po.weightPolicy ?? 'accounting'),
      },

      createdAt: now,
    };


    saveLot(lot);
    lotsCreated.push(lot);

    // stock move (IN)
    recordMove(lot.id, whId, Math.round(stockKg), 'purchase', 'PO', po.id);

    return lot;
  };

  // =========================
  // ✅ NEW: by po.items
  // =========================
  if (items.length) {
    let grandTotalCost = 0;

    for (const it of items) {
      const bags = Number(it.bagCount || 0);

      const actualKg = bags * Number(it.actualKgPerBag || 0);
      const accountingKg = bags * Number(it.accountingKgPerBag || 0);

      const wp = it.weightPolicy || po.weightPolicy || 'accounting';
      const stockKg = wp === 'actual' ? actualKg : accountingKg;

      const ratePerKg = ratePerKgFromBasis(it.rateBasis || po.rateBasis, Number(it.rateValue || 0));
      const basePurchase = stockKg * ratePerKg;

      const bagCostPerBag = (po.bagCostMode === 'paid') ? Number(po.bagCostPerBag || 0) : 0;
      const bagCostTotal = bags * bagCostPerBag;

      // header-level extra costs (later allocate if needed)
      const extraCosts = 0;

      const totalCostItem = basePurchase + bagCostTotal + extraCosts;
      grandTotalCost += totalCostItem;

      const avgPerKg = stockKg > 0 ? totalCostItem / stockKg : 0;

      createLot(it.productType, stockKg, avgPerKg, it.id);
    }

    // ✅ PO lotIds update MUST be here (after lots created)
        const updatedPO: PurchaseOrder = {
        ...po,
        status: 'approved',
        lotIds: lotsCreated.map(x => x.id),
      };
      savePO(updatedPO);


    // auto postings (PO level)
    if (grandTotalCost > 0) {
      autoPostPO(po, grandTotalCost);
      try { autoPayAdvanceForPO(po); } catch {}
    }

    if (!lotsCreated.length) throw new Error('No lot created from PO items');
    return lotsCreated[0];
  }

  // =========================
  // 🔙 fallback: by po.lines
  // =========================
  if (lines.length) {
    let grandTotalCost = 0;

    lines.forEach((line, idx) => {
      const bags = Number(line.bagCount || 0);

      const actualKg = bags * Number(line.actualKgPerBag ?? po.actualKgPerBag ?? 0);
      const accountingKg = bags * Number(line.accountingKgPerBag ?? po.accountingKgPerBag ?? 0);

      const wp = line.weightPolicy || po.weightPolicy || 'accounting';
      const stockKg = wp === 'actual' ? actualKg : accountingKg;

      const ratePerKg = ratePerKgFromBasis(line.rateBasis || po.rateBasis, Number(line.rateValue || po.rateValue || 0));
      const basePurchase = stockKg * ratePerKg;

      const bagCostPerBag = (po.bagCostMode === 'paid') ? Number(po.bagCostPerBag || 0) : 0;
      const bagCostTotal = bags * bagCostPerBag;

      const extraCosts =
        Number(line.transportCost || 0) +
        Number(line.loadingUnloading || 0) +
        Number(line.misc || 0);

      const totalCostLine = basePurchase + extraCosts + bagCostTotal;
      grandTotalCost += totalCostLine;

      const avgPerKg = stockKg > 0 ? totalCostLine / stockKg : 0;

      createLot(
        line.productName || po.productType,
        stockKg,
        avgPerKg,
        line.lineId || `LINE-${idx + 1}`,
        line
      );
    });

    // ✅ PO lotIds update MUST be here (after lots created)
    const updatedPO: PurchaseOrder = {
      ...po,
      lotIds: lotsCreated.map(x => x.id),
    };
    savePO(updatedPO);

    if (grandTotalCost > 0) {
      autoPostPO(po, grandTotalCost);
      try { autoPayAdvanceForPO(po); } catch {}
    }

    if (!lotsCreated.length) throw new Error('No lot created from PO lines');
    return lotsCreated[0];
  }

  // nothing to create
  throw new Error('PO has no items/lines to create lots');
}
function yymmdd(d = new Date()) {
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

function nextLotSeqForDate(dateKey: string) {
  const lots = loadLots();
  const prefix = `LOT-${dateKey}-`;
  let max = 0;
  for (const l of lots) {
    const head = (l.label || '').split('|')[0]?.trim(); // LOT-YYMMDD-0001
    if (!head?.startsWith(prefix)) continue;
    const seq = Number(head.split('-')[2] || 0);
    if (seq > max) max = seq;
  }
  return max + 1;
}

function shortTxt(s: string, max = 12) {
  const t = (s || '').trim().replace(/\s+/g, ' ');
  if (!t) return 'NA';
  return t.length <= max ? t : t.slice(0, max);
}

function makeLotLabel(args: {
  createdAtISO: string;
  sellerName: string;
  productType: string;
  productId?: string;
  warehouseName: string;
  bagCount: number;
}) {
  const d = new Date(args.createdAtISO);
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(nextLotSeqForDate(dateStr)).padStart(2, '0');

  // Get product details
  const product = args.productId ? getProduct(args.productId) : undefined;
  const productType = shortTxt(args.productType || product?.category || 'ITEM', 12);
  const productName = shortTxt(product?.name || '', 12);
  const seller = shortTxt(args.sellerName, 12);

  // Calculate quantities
  const bagCount = Number(args.bagCount || 0);
  // Try to get kg per bag from product or fallback
  const kgPerBag = product?.unit === 'kg' ? 1 : (product?.unit === 'mon' ? KG_PER_MON : 1);
  const qtyKg = bagCount * (kgPerBag || 1);
  const qtyMon = qtyKg / KG_PER_MON;

  // Format: LOT[seq]-date-Seller name-Date-Product type-Product name-quantity in MON-quantity in kg
  return `LOT${seq}-${dateStr}-${seller}-${dateStr}-${productType}-${productName}-${qtyMon.toFixed(2)}MON-${qtyKg}KG`;
}

export function lotsByPO(poId: string): Lot[] {
  return loadLots().filter(l => l?.meta?.poId === poId);
}
export function getSoldQtyForLot(lotId: string): number {
  const allSO = loadSOs();
  let sold = 0;

  for (const so of allSO) {
    if (so.status === 'confirmed') {
      for (const it of so.items || []) {
        if (it.lotId === lotId) {
          sold += Number(it.qtyKg || 0);
        }
      }
    }
  }

  return sold;
}


export function poFulfillment(poId: string) {
  const po = getPO(poId);
  if (!po) throw new Error('PO not found');

  const items: PurchaseItem[] = (po.items && po.items.length) ? po.items : [];
  const lots = lotsByPO(poId);

  const itemRows = items.map(it => {
    const itemLots = lots.filter(l => (l.meta?.poItemId || null) === it.id);

    const initialKg = itemLots.reduce((s, l) => s + Number(l.meta?.initialKg || 0), 0);
    const remainingKg = itemLots.reduce((s, l) => s + Number(l.availableKg || 0), 0);

    return {
      poItemId: it.id,
      productType: it.productType,
      initialKg,
      remainingKg,
      isSoldOut: remainingKg <= 0.00001,
      lots: itemLots.map(l => ({
        id: l.id,
        label: l.label,
        warehouseId: l.meta?.warehouseId,
        warehouseName: l.meta?.warehouseName,
        remainingKg: Number(l.availableKg || 0),
      })),
    };
  });

  const remainingTotalKg = itemRows.reduce((s, r) => s + r.remainingKg, 0);

  return {
    poId,
    isFullySold: remainingTotalKg <= 0.00001,
    remainingTotalKg,
    items: itemRows,
  };
}
// ---- PO Lot helpers ----
export function getPOLotIds(po: PurchaseOrder): string[] {
  const anyPo: any = po as any;
  const ids = (anyPo.lotIds || anyPo.lots || []) as string[];
  return Array.isArray(ids) ? ids : [];
}

export function isPOFullySold(po: PurchaseOrder): boolean {
  const ids = getPOLotIds(po);
  if (!ids.length) return false;

  for (const lotId of ids) {
    const lot = getLot(lotId);
    if (!lot) continue;
    if (Number(lot.availableKg || 0) > 0) return false;
  }
  return true;
}

export function poRemainingStock(po: PurchaseOrder) {
  const ids = getPOLotIds(po);
  const lots = ids.map(id => getLot(id)).filter(Boolean) as Lot[];

  const totalKg = lots.reduce((s, l) => s + Number(l.availableKg || 0), 0);

  // warehouse-wise
  const byWarehouse: Record<string, { warehouse: string; kg: number }> = {};
  for (const l of lots) {
    const wh = (l.meta?.warehouseName || l.meta?.warehouseId || l.meta?.warehouse || 'Warehouse') as string;
    if (!byWarehouse[wh]) byWarehouse[wh] = { warehouse: wh, kg: 0 };
    byWarehouse[wh].kg += Number(l.availableKg || 0);
  }

  // product-wise
  const byProduct: Record<string, { productType: string; kg: number }> = {};
  for (const l of lots) {
    const p = (l.productType || 'ITEM') as string;
    if (!byProduct[p]) byProduct[p] = { productType: p, kg: 0 };
    byProduct[p].kg += Number(l.availableKg || 0);
  }

  return {
    totalKg,
    totalMon: totalKg / KG_PER_MON,
    lots,
    byWarehouse: Object.values(byWarehouse).sort((a, b) => b.kg - a.kg),
    byProduct: Object.values(byProduct).sort((a, b) => b.kg - a.kg),
  };
}

export function poSoldPercent(poId: string) {
  const f = poFulfillment(poId);
  const initial = f.items.reduce((s, x) => s + x.initialKg, 0);
  const rem = f.remainingTotalKg;
  const sold = Math.max(0, initial - rem);
  const pct = initial > 0 ? (sold / initial) * 100 : 0;

  return {
    initialKg: initial,
    soldKg: sold,
    remainingKg: rem,
    soldPct: Math.round(pct * 10) / 10,
    isFullySold: f.isFullySold,
  };
}
/** Sales */
export function loadSOs():SalesOrder[]{ return get<SalesOrder[]>('grain_sos',[]); }
export function getSO(id:string){ return loadSOs().find(s=>s.id===id); }
export function saveSO(so:SalesOrder){ const all=loadSOs(); const i=all.findIndex(x=>x.id===so.id); if(i>=0) all[i]=so; else all.unshift(so); set('grain_sos', all); }
export function confirmSO(id: string) {
  const all = loadSOs();
  const i = all.findIndex(x => x.id === id);
  if (i < 0) return;

  // ✅ prevent double-confirm deduction
  if (all[i].status === 'confirmed') return;

  all[i].status = 'confirmed';
  set('grain_sos', all);

  applySOToLots(all[i]);
  autoPostSO(all[i]);
}

export function getPOSoldState(po: PurchaseOrder): 'none'|'partial'|'full' {
  const totalStock = Number(calcTotalsForPO(po)?.stockKg || 0);
  const remaining = Number(poRemainingStock(po)?.totalKg || 0);

  if (totalStock <= 0) return 'none';
  if (remaining <= 0) return 'full';
  if (remaining < totalStock) return 'partial';
  return 'none';
}

//export function ratePerKgFrom(basis:RateBasis, v:number){ return basis==='perKg'?v:(v/KG_PER_MON); }
export function calcSOAmounts(so:SalesOrder){
  const base=(so.items||[]).reduce((s,it)=> s + ratePerKgFromBasis(it.rateBasis,it.rateValue)*it.qtyKg,0);
  const extras=(so.transport||0)+(so.loadingUnloading||0)+(so.misc||0);
  const total=base+extras; const totalKg=(so.items||[]).reduce((s,it)=>s+it.qtyKg,0);
  const apk=totalKg>0? total/totalKg:0; 
  return { base, extras, total, totalKg, avgPerKg:apk, avgPerMon:apk*KG_PER_MON };
}
export function applySOToLots(so: SalesOrder) {
  for (const it of (so.items || [])) {
    updateLotQty(it.lotId, -Math.abs(it.qtyKg));

    const lot = getLot(it.lotId);
    const whId = lot?.warehouseId || lot?.meta?.warehouseId || 'WH-1';

    recordMove(it.lotId, whId, -Math.abs(it.qtyKg), 'sale', 'SO', so.id);
  }
}

/** Accounts & Vouchers */
export function defaultAccountsSeed():Account[]{
  return [
    { id:'AC-CASH', name:'ক্যাশ', type:'cash', opening:0, active:true },
    { id:'AC-BANK', name:'ব্যাঙ্ক', type:'bank', opening:0, active:true },
    { id:'AC-INVENTORY', name:'ইনভেন্টরি', type:'expense', opening:0, active:true }, // <-- add
    { id:'AC-PAYABLES', name:'Payables', type:'loan', opening:0, active:true },       // <-- add (fallback)
    { id:'AC-TRANSPORT', name:'ট্রান্সপোর্ট খরচ', type:'transport', opening:0, active:true },
    { id:'AC-EXP', name:'বিবিধ খরচ', type:'expense', opening:0, active:true },
    { id:'AC-INC', name:'অন্যান্য আয়', type:'income', opening:0, active:true },
    { id:'AC-ROUND', name:'Rounding Diff', type:'income', opening:0, active:true },   // <-- add (rounding adjust)
  ];
}

export function loadAccounts():Account[]{ let all=get<Account[]>('grain_accounts',[]); if(all.length===0){ all=defaultAccountsSeed(); set('grain_accounts', all);} return all; }
export function saveAccount(a:Account){ const all=loadAccounts(); const i=all.findIndex(x=>x.id===a.id); if(i>=0) all[i]=a; else all.unshift(a); set('grain_accounts', all); }

export function loadVouchers():Voucher[]{ return get<Voucher[]>('grain_vouchers',[]); }
export function saveVoucher(v:Voucher){
  const dr=round2(sum(v.rows.map(r=>r.dr||0)));
  const cr=round2(sum(v.rows.map(r=>r.cr||0)));
  const diff = round2(dr - cr);

  if (Math.abs(diff) > 0.01) {
    throw new Error(`Debit/Credit must be equal (DR=${dr}, CR=${cr}, diff=${diff})`);
  }
  if (Math.abs(diff) > 0) {
    const amt = Math.abs(diff);
    if (diff > 0) v.rows.push({ accountId:'AC-ROUND', cr: amt, memo:'Auto rounding (CR)' });
    else v.rows.push({ accountId:'AC-ROUND', dr: amt, memo:'Auto rounding (DR)' });
  }

  const all=loadVouchers();
  const i=all.findIndex(x=>x.id===v.id);
  if(i>=0) all[i]=v; else all.unshift(v);
  set('grain_vouchers', all);
}

export function dayBook(dateISO:string){
  const list=loadVouchers().filter(v=>v.vdate===dateISO).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const dr=list.reduce((s,v)=> s+sum(v.rows.map(r=>r.dr||0)),0);
  return { list, totals:{ debit:round2(dr), credit:round2(dr) } };
}
export function dayLock(dateISO:string){ const locks=get<DayLock[]>('grain_daylocks',[]); if(!locks.find(l=>l.date===dateISO)){ locks.push({date:dateISO, lockedAt:new Date().toISOString()}); set('grain_daylocks', locks);} }
export function isLocked(dateISO:string){ const locks=get<DayLock[]>('grain_daylocks',[]); return !!locks.find(l=>l.date===dateISO); }
export function trialBalance(){
  const accs=loadAccounts(); const map:Record<string,{name:string;dr:number;cr:number}>={};
  for(const a of accs) map[a.id]={name:a.name,dr:0,cr:0};
  for(const v of loadVouchers()){ for(const r of v.rows){ if(!map[r.accountId]) continue; map[r.accountId].dr+=(r.dr||0); map[r.accountId].cr+=(r.cr||0);} }
  const rows=Object.entries(map).map(([id,x])=>({id,name:x.name,dr:round2(x.dr),cr:round2(x.cr)}));
  const sums=rows.reduce((s,x)=>({dr:s.dr+x.dr,cr:s.cr+x.cr}),{dr:0,cr:0});
  return { rows, totals:{dr:round2(sums.dr), cr:round2(sums.cr)} };
}
export function ledgerOf(accountId:string, from?:string, to?:string){
  const acc=loadAccounts().find(a=>a.id===accountId);
  const opening=acc?.opening||0; let balance=opening; const entries:any[]=[];
  const vouchers=loadVouchers().filter(v=>(!from||v.vdate>=from)&&(!to||v.vdate<=to)).sort((a,b)=> a.vdate.localeCompare(b.vdate) || b.createdAt.localeCompare(a.createdAt));
  for(const v of vouchers){ for(const r of v.rows){ if(r.accountId!==accountId) continue; const dr=r.dr||0, cr=r.cr||0; balance=round2(balance+dr-cr); entries.push({ vId:v.id, date:v.vdate, memo:r.memo||v.narration||'', dr, cr, balance }); } }
  return { account:acc, opening, rows:entries, closing:balance };
}
/** EXPENSE REPORT: Monthly vs Daily (Fixed vs Variable) */
export function expensesReportByMonth(year: number, month: number) {
  const yyyy = year.toString().padStart(4, '0');
  const mm = month.toString().padStart(2, '0');

  const from = `${yyyy}-${mm}-01`;

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  const to = `${nextYear.toString().padStart(4, '0')}-${nextMonth
    .toString()
    .padStart(2, '0')}-01`;

  const accs = loadAccounts();
  const accTypeMap: Record<string, AccountType> = {};
  for (const a of accs) {
    accTypeMap[a.id] = a.type;
  }

  const vouchers = loadVouchers().filter(
    (v) => v.vdate >= from && v.vdate < to
  );

  // daily map: প্রতি দিন কত fixed / variable
  const daily: Record<string, { fixed: number; variable: number }> = {};
  let fixedTotal = 0;
  let variableTotal = 0;

  for (const v of vouchers) {
    const isRecurring = (v.narration || '').startsWith('Recurring expense:');
    let vFixed = 0;
    let vVar = 0;

    for (const r of v.rows) {
      const dr = r.dr || 0;
      if (!dr) continue;
      const t = accTypeMap[r.accountId];
      if (t !== 'expense') continue;

      if (isRecurring) vFixed += dr;
      else vVar += dr;
    }

    if (!vFixed && !vVar) continue;

    if (!daily[v.vdate]) {
      daily[v.vdate] = { fixed: 0, variable: 0 };
    }
    daily[v.vdate].fixed += vFixed;
    daily[v.vdate].variable += vVar;

    fixedTotal += vFixed;
    variableTotal += vVar;
  }

  const rows = Object.entries(daily)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, vals]) => {
      const fixed = round2(vals.fixed);
      const variable = round2(vals.variable);
      return {
        date,
        fixed,
        variable,
        total: round2(fixed + variable),
      };
    });

  return {
    summary: {
      fixedTotal: round2(fixedTotal),
      variableTotal: round2(variableTotal),
      grandTotal: round2(fixedTotal + variableTotal),
    },
    rows,
  };
}

/** Party account helpers */
export type PartyKind = 'customer' | 'seller' | 'driver' | 'employee' | 'investor';

export function partyAccountId(kind: PartyKind, id: string) {
  return `AC-PARTY-${kind.toUpperCase()}-${id}`;
}

export function ensurePartyAccount(kind: PartyKind, id: string, name: string) {
  const accId = partyAccountId(kind, id);
  const all = loadAccounts();
  if (all.find(a => a.id === accId)) return accId;
  const a: Account = { id: accId, name: `${name}`, type: 'party', partyRef: { kind, id }, opening: 0, active: true };
  saveAccount(a);
  return accId;
}

/** Auto-postings */
function todayISO(){ const d=new Date(); return d.toISOString().slice(0,10); }

function addVoucher(rows:TxnRow[], narration:string){
  const v:Voucher = { id:uid('VCH'), vtype:'journal', vdate:todayISO(), rows, narration, createdAt:new Date().toISOString() };
  saveVoucher(v);
}
export function autoPostPO(po:PurchaseOrder, totalCost:number){
  // Party account নিশ্চিত করুন
  const sellerAcc = ensurePartyAccount('seller', po.sellerId, po.sellerSnapshot.name);

  // সব খরচসহ totalCost ইনভেন্টরি ক্যাপিটালাইজ; Payable তৈরি
  const rows:TxnRow[] = [
    { accountId: 'AC-INVENTORY', dr: totalCost, memo: `PO ${po.id} Inventory capitalization` },
    { accountId: sellerAcc || 'AC-PAYABLES', cr: totalCost, memo: `PO ${po.id} Payable to seller` },
  ];

  addVoucher(rows, `Auto: Purchase PO ${po.id}`);
}

export function autoPostSO(so:SalesOrder){
  // Dr Party (Customer), Cr Income (simplified total)
  const { total } = calcSOAmounts(so);
  const custAcc = ensurePartyAccount('customer', so.customerId, so.customerSnapshot.name);
  const rows:TxnRow[] = [
    { accountId: custAcc, dr: total, memo:`SO ${so.id} Receivable` },
    { accountId: 'AC-INC', cr: total, memo:`SO ${so.id} Income` },
  ];
  addVoucher(rows, `Auto: Sales SO ${so.id}`);
}
/** Driver Finance Helpers */

// শুধু advance (loan) — ড্রাইভারকে অগ্রিম টাকা দিলেন
// শুধু advance (loan) — ড্রাইভারকে অগ্রিম টাকা দিলেন
export function postDriverAdvance(
  driver: { id: string; name: string },
  amount: number,
  payAccountId: string,
  memo?: string
) {
  if (!(amount > 0)) throw new Error('Amount must be positive');
  
  // master list থেকে না পেলেও সমস্যা নেই, আমরা ensurePartyAccount দিয়েই অ্যাকাউন্ট বানিয়ে ফেলব
  const drvAcc = ensurePartyAccount('driver', driver.id, driver.name);
  const text = (memo?.trim() || `Driver advance ${driver.name}`).trim();

  const rows: TxnRow[] = [
    { accountId: drvAcc, dr: amount, memo: text },
    { accountId: payAccountId, cr: amount, memo: text },
  ];

  addVoucher(rows, text);
}


/**
 * Trip settlement:
 * - পুরো trip amount Transport expense হিসেবে ধরবো
 * - চাইলে একই ভাউচারে driver-কে extra payment দিতে পারি
 */
export function settleDriverTrip(
  tripId: string,
  payAccountId?: string,
  payNowAmount?: number,
  memo?: string
) {
  const all = loadDriverTrips();
  const idx = all.findIndex(t => t.id === tripId);
  if (idx < 0) throw new Error('Trip not found');
  const trip = all[idx];
  if (trip.settled) return; // already settled

  const drv = loadDrivers().find(d => d.id === trip.driverId);
  if (!drv) throw new Error('Driver not found');

  const drvAcc = ensurePartyAccount('driver', drv.id, drv.name);
  const text = memo?.trim() || `Trip ${trip.id} transport`;

  const rows: TxnRow[] = [];

  // যদি এই সাথে কিছু টাকা দিতে চান (নতুন payment)
  if (payAccountId && payNowAmount && payNowAmount > 0) {
    rows.push({
      accountId: drvAcc,
      dr: payNowAmount,
      memo: `${text} pay`,
    });
    rows.push({
      accountId: payAccountId,
      cr: payNowAmount,
      memo: `${text} pay`,
    });
  }

  // Trip amount → Transport expense
  if (trip.amount > 0) {
    rows.push({
      accountId: 'AC-TRANSPORT',
      dr: trip.amount,
      memo: text,
    });
    rows.push({
      accountId: drvAcc,
      cr: trip.amount,
      memo: text,
    });
  }

  if (rows.length === 0) return;

  addVoucher(rows, `Driver trip ${trip.id}`);

  all[idx] = {
    ...trip,
    settled: true,
    settledAt: new Date().toISOString(),
  };
  set('grain_trips', all);
}

export function autoPostInvestorTxn(tx: InvestorTxn) {
  const inv = getInvestor(tx.investorId);
  const name = inv?.name || 'Investor';
  const invAcc = ensurePartyAccount('investor', tx.investorId, name);

  const cashAccId = 'AC-CASH'; // এখন Simple: সবকিছু Cash ধরে নিচ্ছি

  const rows: TxnRow[] = [];

  if (tx.kind === 'capitalIn') {
    // Investor টাকা দিল → Cash বাড়লো, Investor liability বাড়লো
    rows.push({ accountId: cashAccId, dr: tx.amount, memo: `Investor capital in: ${name}` });
    rows.push({ accountId: invAcc, cr: tx.amount, memo: `Investor liability` });
  } else if (tx.kind === 'capitalOut' || tx.kind === 'profitPay') {
    // Investor কে টাকা দিলাম → liability কমলো, Cash কমলো
    rows.push({ accountId: invAcc, dr: tx.amount, memo: `Pay to investor: ${name}` });
    rows.push({ accountId: cashAccId, cr: tx.amount, memo: `Investor payment (${tx.kind})` });
  } else if (tx.kind === 'adjustment') {
    // Simple adjustment: আমরা expense ধরে inventory নয়
    rows.push({ accountId: invAcc, dr: tx.amount, memo: `Investor adj: ${name}` });
    rows.push({ accountId: 'AC-EXP', cr: tx.amount, memo: `Investor adjustment expense` });
  }

  if (rows.length >= 2) {
    const v: Voucher = {
      id: uid('VCH'),
      vtype: 'journal',
      vdate: tx.date || todayISO(),
      rows,
      narration: `Investor ${tx.kind} – ${name}`,
      createdAt: new Date().toISOString(),
    };
    saveVoucher(v);
    tx.voucherId = v.id;
  }

  saveInvestorTxn(tx);
}
export function postRecurringExpense(templateId: string, dateISO: string) {
  const tpl = getRecurringExpense(templateId);
  if (!tpl) return;
  if (!tpl.active) return;

  const expAccId = tpl.accountId;
  const payAccId = tpl.payFromAccountId || 'AC-CASH';

  const rows: TxnRow[] = [
    { accountId: expAccId, dr: tpl.amount, memo: `Recurring ${tpl.name}` },
    { accountId: payAccId, cr: tpl.amount, memo: `Pay recurring ${tpl.name}` },
  ];

  const v: Voucher = {
    id: uid('VCH'),
    vtype: 'payment',
    vdate: dateISO || todayISO(),
    rows,
    narration: `Recurring expense: ${tpl.name}`,
    createdAt: new Date().toISOString(),
  };

  saveVoucher(v);

  // lastPostedDate আপডেট
  const updated: RecurringExpense = { ...tpl, lastPostedDate: dateISO };
  saveRecurringExpense(updated);
}

/** Utils */
function sum(a:number[]){ return a.reduce((s,x)=> s+(+x||0),0); }
function round2(n:number){ return Math.round(n*100)/100; }

// --- NEW: Instruments (Cash/Bank/MFS) ---------------------------------------
export type InstrumentKind = 'cash'|'bank'|'mfs';
export type Instrument = { id:string; kind:InstrumentKind; name:string; accountId:string; active:boolean };

function ensureAccount(a:Account){
  const all = loadAccounts();
  if (!all.find(x=>x.id===a.id)) { all.unshift(a); set('grain_accounts', all); }
}

export function seedInstruments():Instrument[]{
  let list = get<Instrument[]>('adm_instruments', []);
  if (list.length) return list;
  // default cash/bank/mfs
  list = [
    { id:'CASH-1', kind:'cash', name:'Cash Counter', accountId:'AC-CASH', active:true },
    { id:'BANK-1', kind:'bank', name:'Bank A/C',     accountId:'AC-BANK', active:true },
    { id:'MFS-1',  kind:'mfs',  name:'bKash',        accountId:'AC-MFS-BKASH', active:true },
  ];
  ensureAccount({ id:'AC-MFS-BKASH', name:'MFS - bKash', type:'bank', opening:0, active:true });
  set('adm_instruments', list);
  return list;
}
export function loadInstruments():Instrument[]{ return seedInstruments(); }
export function saveInstrument(i:Instrument){
  const all = loadInstruments();
  const idx = all.findIndex(x=>x.id===i.id);
  if (idx>=0) all[idx]=i; else all.push(i);
  set('adm_instruments', all);
}

// Approve PO: simple (Expense + Payable) already exists via autoPostPO(po,totalCost)

// Extra: If advance at PO time specified → auto payment to seller
export function autoPayAdvanceForPO(po: PurchaseOrder){
  const adv = Math.max(0, +(po.advancePaid||0));
  if (!adv) return;
  const instId = po.advanceInstrumentId || 'CASH-1';
  const inst = loadInstruments().find(x=>x.id===instId) || loadInstruments()[0];
  const sellerAcc = ensurePartyAccount('seller', po.sellerId, po.sellerSnapshot?.name||po.sellerId);
  addVoucher(
    [
      { accountId: sellerAcc,  dr: adv, memo:`Advance on PO ${po.id}` },
      { accountId: inst.accountId, cr: adv, memo:`Instrument ${inst.name}` },
    ],
    `Auto: Advance for PO ${po.id}`
  );
}

// Hook into your approve flow (call after autoPostPO):
//   autoPostPO(po, totalCost);
//   autoPayAdvanceForPO(po);

// --- NEW: Generic Payment/Receipt (Party Settlement) -------------------------
export function postPayment(params:{
  party:{ kind:'seller'|'driver'|'employee'|'investor'; id:string; name:string },
  amount:number,
  instrumentId:string,
  memo?:string
}){
  const amt = Math.max(0, +params.amount||0); if (!amt) throw new Error('Amount required');
  const inst = loadInstruments().find(x=>x.id===params.instrumentId) || loadInstruments()[0];
  const partyAcc = ensurePartyAccount(params.party.kind, params.party.id, params.party.name);
  addVoucher(
    [
      { accountId: partyAcc,       dr: amt, memo: params.memo||'Party Payment' },
      { accountId: inst.accountId, cr: amt, memo: inst.name },
    ],
    `Payment to ${params.party.name}`
  );
}

export function postReceipt(params:{
  party:{ kind:'customer'|'investor'| 'employee'; id:string; name:string },
  amount:number,
  instrumentId:string,
  memo?:string
}){
  const amt = Math.max(0, +params.amount||0);
  if (!amt) throw new Error('Amount required');

  const inst = loadInstruments().find(x=>x.id===params.instrumentId) || loadInstruments()[0];
  const partyAcc = ensurePartyAccount(params.party.kind, params.party.id, params.party.name);

  const rows:TxnRow[] = [
    { accountId: inst.accountId, dr: amt, memo: inst.name },
    { accountId: partyAcc,       cr: amt, memo: params.memo||'Party Collection' },
  ];

  addVoucher(rows, `Collection from ${params.party.name}`);
}

// --- NEW: Drivers – Trips & Settlement (Trolley case only) -------------------
// Driver & Trip Types
export type Driver = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;truckNo?:string; licenseNo?:string; 
};

export type DriverTrip = {
  id: string;
  date: string;          // yyyy-mm-dd
  driverId: string;
  amount: number;        // এই ট্রিপের মোট বিল
  poId?: string;         // কোন PO-র সাথে লিঙ্ক (optional)
  from?: string;
  to?: string;
  remarks?: string;
  settled: boolean;      // বিল সেটল হয়েছে কি না
  createdAt: string;
  settledAt?: string;
  route?:string;
  truckNo?:string;
  memo?:string
};
/** Drivers */
export function loadDrivers(): Driver[] {
  return get<Driver[]>('grain_drivers', []);
}
export function saveDriver(d: Driver) {
  const all = loadDrivers();
  const i = all.findIndex(x => x.id === d.id);
  if (i >= 0) all[i] = d; else all.unshift(d);
  set('grain_drivers', all);
  // party account নিশ্চিত করা
  ensurePartyAccount('driver', d.id, d.name);
}
export function deleteDriver(id: string) {
  const all = loadDrivers().filter(d => d.id !== id);
  set('grain_drivers', all);
}
export function searchDrivers(k: string) {
  k = k.trim().toLowerCase();
  if (!k) return loadDrivers().slice(0, 10);
  return loadDrivers()
    .filter(d =>
      (d.name || '').toLowerCase().includes(k) ||
      (d.phone || '').toLowerCase().includes(k) ||
      (d.address || '').toLowerCase().includes(k)
    )
    .slice(0, 10);
}
export function loadDriverTrips(): DriverTrip[] {
  return get<DriverTrip[]>('grain_trips', []);
}
export function saveDriverTrip(trip: DriverTrip) {
  const all = loadDriverTrips();
  const i = all.findIndex(t => t.id === trip.id);
  if (i >= 0) all[i] = trip; else all.unshift(trip);
  set('grain_trips', all);
}
export function tripsByDriver(driverId: string): DriverTrip[] {
  return loadDriverTrips().filter(t => t.driverId === driverId);
}

export function tripsByPO(poId: string): DriverTrip[] {
  return loadDriverTrips().filter(t => t.poId === poId);
}

// পোস্টিং: Dr Transport Expense | Cr Driver  (trip settle)
// NOTE: এটি trolley/own-driver কেসে ব্যবহার করবেন। district কেসে নয়।
export function postDriverTripVoucher(tr: DriverTrip) {
  // এখন expense ফিল্ড নেই, amount-ই ব্যবহার করব
  const exp = Math.max(0, tr.amount || 0);
  if (!exp) return;

  // ড্রাইভারের নাম লোড করব master থেকে
  const drv = loadDrivers().find(d => d.id === tr.driverId);
  const driverName = drv?.name || 'Driver';

  // party account নিশ্চিত করি
  const drvAccId = ensurePartyAccount('driver', tr.driverId, driverName);

  const rows: TxnRow[] = [
    { accountId: 'AC-TRANSPORT', dr: exp, memo: `Trip ${tr.id}` },
    { accountId: drvAccId,       cr: exp, memo: `Driver ${driverName}` },
  ];

  addVoucher(rows, `Driver Trip Bill ${tr.id}`);
}


/** INVESTORS */
export type Investor = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  nidNo?: string;
  nid?: string;
  photoUrl?: string;
  notes?: string;
  agreementPct?: number; // profit share %
  profitSharePct?: number;
  nomineeName?: string;
  startDate?: string;
  files?: string[];
  active: boolean;
  createdAt: string;
  updatedAt?: string;
};
const INVESTOR_KEY = 'grain_investors';
export function loadInvestors(): Investor[] {
  return get<Investor[]>(INVESTOR_KEY, []);
}

export type InvestorTxnKind = 'capitalIn' | 'capitalOut' | 'profitPay' | 'adjustment'| 'payout';

export type InvestorTxn = {
  id: string;
  investorId: string;
  kind: InvestorTxnKind;
  date: string;         // ISO (yyyy-mm-dd)
  amount: number;
  instrument?: string;  // cash/bank/bkash etc (free text for now)
  memo?: string;
  voucherId?: string;
  createdAt: string;
};
// ----- INVESTOR STORE -----
function _loadAllInvestors(): Investor[] {
  return get<Investor[]>('grain_investors', []);
}

export function getInvestor(id: string): Investor | undefined {
  return _loadAllInvestors().find(i => i.id === id);
}

export function saveInvestor(inv: Investor) {
  const all = loadInvestors();
  const idx = all.findIndex(x => x.id === inv.id);
  const now = new Date().toISOString();
  const next: Investor = {
    ...inv,
    createdAt: inv.createdAt || now,
    updatedAt: now,
  };
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);
  set(INVESTOR_KEY, all);

  // ensure party account for this investor
  ensurePartyAccount('investor', next.id, next.name);
}
export function deleteInvestor(id: string) {
  const all = loadInvestors().filter(i => i.id !== id);
  set(INVESTOR_KEY, all);
}
export function postInvestorTxn(
  investorId: string,
  kind: InvestorTxnKind,
  amount: number,
  payAccountId: string,
  extraMemo?: string
) {
  if (!(amount > 0)) throw new Error('Amount must be positive');
  const investor = loadInvestors().find(i => i.id === investorId);
  if (!investor) throw new Error('Investor not found');

  const invAccId = ensurePartyAccount('investor', investor.id, investor.name);
  const vdate = todayISO();

  let memo =
    extraMemo?.trim() || {
      capitalIn: 'Capital In',
      capitalOut: 'Capital Out',
      profitPay: 'Profit Distribution',
      adjustment: 'Adjustment',
      payout: 'Payout',
    }[kind];

  let rows: TxnRow[];

  switch (kind) {
    case 'capitalIn':
      rows = [
        { accountId: payAccountId, dr: amount, memo },
        { accountId: invAccId, cr: amount, memo },
      ];
      break;

    case 'capitalOut':
    case 'profitPay':
    case 'payout':
      rows = [
        { accountId: invAccId, dr: amount, memo },
        { accountId: payAccountId, cr: amount, memo },
      ];
      break;

    case 'adjustment':
      rows = [
        { accountId: invAccId, dr: amount, memo },
      ];
      break;

    default:
      throw new Error('Unknown investor transaction type');
  }

  const v: Voucher = {
    id: uid('VCH'),
    vtype: 'journal',
    vdate,
    rows,
    narration: `${kind}: ${memo}`,
    createdAt: new Date().toISOString(),
  };

  saveVoucher(v);
}


// ----- INVESTOR TRANSACTIONS -----
function _loadAllInvestorTxns(): InvestorTxn[] {
  return get<InvestorTxn[]>('grain_investor_txns', []);
}

export function loadInvestorTxns(investorId?: string): InvestorTxn[] {
  const all = _loadAllInvestorTxns();
  if (!investorId) return all;
  return all
    .filter(t => t.investorId === investorId)
    .sort((a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt.localeCompare(a.createdAt)
    );
}

export function saveInvestorTxn(tx: InvestorTxn) {
  const all = _loadAllInvestorTxns();
  const i = all.findIndex(x => x.id === tx.id);
  if (i >= 0) all[i] = tx; else all.unshift(tx);
  set('grain_investor_txns', all);
}
export function investorBalance(investorId: string) {
  const txs = loadInvestorTxns(investorId);
  let capital = 0;
  let profitPaid = 0;

  for (const t of txs) {
    if (t.kind === 'capitalIn') capital += t.amount;
    if (t.kind === 'capitalOut') capital -= t.amount;
    if (t.kind === 'profitPay') profitPaid += t.amount;
  }

  return {
    capital: round2(capital),
    profitPaid: round2(profitPaid),
    net: round2(capital - profitPaid),
  };
}
/** RECURRING EXPENSE TEMPLATE */
export type RecurringExpense = {
  id: string;
  name: string;
  accountId: string;        // কোন Expense account-এ যাবে
  payFromAccountId?: string; // Cash/Bank account
  amount: number;
  frequency: 'monthly' | 'daily';
  dayOfMonth?: number;      // monthly হলে, কোন তারিখে সাধারণত due
  active: boolean;
  createdAt: string;
  lastPostedDate?: string;
  notes?: string;
};
// ----- RECURRING EXPENSE STORE -----
function _loadAllRecurring(): RecurringExpense[] {
  return get<RecurringExpense[]>('grain_rec_exp', []);
}

export function loadRecurringExpenses(): RecurringExpense[] {
  return _loadAllRecurring();
}

export function getRecurringExpense(id: string): RecurringExpense | undefined {
  return _loadAllRecurring().find(t => t.id === id);
}

export function saveRecurringExpense(t: RecurringExpense) {
  const all = _loadAllRecurring();
  const i = all.findIndex(x => x.id === t.id);
  if (i >= 0) all[i] = t; else all.unshift(t);
  set('grain_rec_exp', all);
}
// --- Recurring Expense Templates & Posting ---

export type RecurringExpenseTemplate = {
  id: string;
  name: string;
  expenseAccountId: string;
  payFromAccountId: string;
  amount: number;
  dayOfMonth: number; // 1-31
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
};

const RECUR_KEY = 'grain_recurring_exp';

export function loadRecurringTemplates(): RecurringExpenseTemplate[] {
  return get<RecurringExpenseTemplate[]>(RECUR_KEY, []);
}

export function saveRecurringTemplate(tpl: RecurringExpenseTemplate) {
  const all = loadRecurringTemplates();
  const idx = all.findIndex(x => x.id === tpl.id);
  const now = new Date().toISOString();
  const next: RecurringExpenseTemplate = {
    ...tpl,
    createdAt: tpl.createdAt || now,
    updatedAt: now,
  };
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);
  set(RECUR_KEY, all);
}

export function deleteRecurringTemplate(id: string) {
  const all = loadRecurringTemplates().filter(x => x.id !== id);
  set(RECUR_KEY, all);
}

function recurringVoucherTag(tplId: string, year: number, month: number) {
  const mm = String(month).padStart(2, '0');
  return `RC:${tplId}:${year}-${mm}`;
}

export function isRecurringPostedForMonth(
  tplId: string,
  year: number,
  month: number
): boolean {
  const tag = recurringVoucherTag(tplId, year, month);
  return loadVouchers().some(v => v.narration?.startsWith(tag));
}

function daysInMonth(year: number, month: number) {
  // month: 1-12
  return new Date(year, month, 0).getDate();
}

export function postRecurringForMonth(
  tplId: string,
  year: number,
  month: number
) {
  const tpl = loadRecurringTemplates().find(t => t.id === tplId);
  if (!tpl) throw new Error('Template not found');
  const tag = recurringVoucherTag(tpl.id, year, month);
  if (isRecurringPostedForMonth(tpl.id, year, month)) {
    throw new Error('This recurring expense is already posted for this month');
  }

  const dm = Math.min(tpl.dayOfMonth || 1, daysInMonth(year, month));
  const dd = String(dm).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const vdate = `${year}-${mm}-${dd}`;

  const rows: TxnRow[] = [
    {
      accountId: tpl.expenseAccountId,
      dr: tpl.amount,
      memo: tpl.name,
    },
    {
      accountId: tpl.payFromAccountId,
      cr: tpl.amount,
      memo: tpl.name,
    },
  ];

  const narration = `${tag} ${tpl.name}`;

  const v: Voucher = {
    id: uid('VCH'),
    vtype: 'payment',
    vdate,
    rows,
    narration,
    createdAt: new Date().toISOString(),
  };

  saveVoucher(v);
}

// --- Expense summary for reports (Fixed vs Variable) ---

export type ExpenseMonthSummary = {
  month: number; // 1-12
  fixed: number;
  variable: number;
  total: number;
};

export function summarizeExpensesByMonth(year: number): ExpenseMonthSummary[] {
  const accs = loadAccounts();
  const accMap = new Map<string, Account>();
  for (const a of accs) accMap.set(a.id, a);

  const vouchers = loadVouchers().filter(v => {
    return v.vdate.startsWith(String(year));
  });

  const result: ExpenseMonthSummary[] = [];

  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    let fixed = 0;
    let variable = 0;

    for (const v of vouchers) {
      if (!v.vdate.startsWith(`${year}-${mm}-`)) continue;
      const isFixed = v.narration?.startsWith('RC:') || false;

      for (const r of v.rows) {
        const acc = accMap.get(r.accountId);
        if (!acc || acc.type !== 'expense') continue;
        const amt = r.dr || 0;
        if (amt <= 0) continue;
        if (isFixed) fixed += amt;
        else variable += amt;
      }
    }

    const total = round2(fixed + variable);
    result.push({
      month: m,
      fixed: round2(fixed),
      variable: round2(variable),
      total,
    });
  }

  return result;
}
