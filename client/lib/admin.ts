'use client';

import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n';

// ============ Storage Helpers ============
function get<T>(k:string, fb:T):T{ try{ return JSON.parse(localStorage.getItem(k) || '') as T }catch{ return fb; } }
function set<T>(k:string, v:T){ localStorage.setItem(k, JSON.stringify(v)); }
let adminUidSeq = 0;
export function uid(p='ID'){
  adminUidSeq = (adminUidSeq % 999) + 1;
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${p}-${date}-${String(adminUidSeq).padStart(3, '0')}`;
}

// ============ Settings ============
export type NumberFormat = 'en'|'bn';
export type WeightPolicyDefault = 'actual'|'accounting';
export type RateDefault = { purchase:'perMon'|'perKg'; sales:'perMon'|'perKg' };
export type PrintPaper = 'A4'|'THERMAL';

export type AppSettings = {
  orgName: string;
  orgAddress?: string;
  orgPhone?: string;
  defaultLocale: Locale;
  numberFormat: NumberFormat;
  weightPolicyDefault: WeightPolicyDefault;
  rateDefault: RateDefault;
  stockValuation: 'movingAvgLot'|'globalAvg';
  negativeStock: 'block'|'allow';
  dayCloseRequired: boolean;
  printPaper: PrintPaper;
  logoDataUrl?: string; // mock file store
};

export function loadSettings():AppSettings{
  const s = get<AppSettings>('adm_settings', null as any);
  if (s) return s;
  const def: AppSettings = {
    orgName: 'My Grain Business',
    orgAddress: '',
    orgPhone: '',
    defaultLocale: DEFAULT_LOCALE,
    numberFormat: 'bn',
    weightPolicyDefault: 'accounting',
    rateDefault: { purchase: 'perMon', sales: 'perMon' },
    stockValuation: 'movingAvgLot',
    negativeStock: 'block',
    dayCloseRequired: true,
    printPaper: 'A4',
    logoDataUrl: '',
  };
  set('adm_settings', def);
  return def;
}
export function saveSettings(s:AppSettings){ set('adm_settings', s); }

// ============ Users / Roles / Permissions ============
export type Permission =
  | 'purchase.create' | 'purchase.approve' | 'purchase.view'
  | 'sales.create'    | 'sales.confirm'    | 'sales.view'
  | 'inventory.view'  | 'inventory.adjust' | 'inventory.transfer'
  | 'cashbook.view'   | 'cashbook.post'
  | 'ledger.view'     | 'reports.view'
  | 'admin.settings'  | 'admin.users'      | 'admin.dict' | 'admin.cost' | 'admin.permissions' | 'admin.backup';

export type Role = { id:string; name:string; permissions: Permission[] };
export type User = { id:string; name:string; phone:string; roleId:string; active:boolean; };

export function seedRoles():Role[]{
  const existing = get<Role[]>('adm_roles', []);
  if (existing.length) return existing;
  const all: Role[] = [
    { id:'ROLE-ADMIN', name:'Admin', permissions: [
      'purchase.create','purchase.approve','purchase.view',
      'sales.create','sales.confirm','sales.view',
      'inventory.view','inventory.adjust','inventory.transfer',
      'cashbook.view','cashbook.post',
      'ledger.view','reports.view',
      'admin.settings','admin.users','admin.dict','admin.cost','admin.permissions','admin.backup',
    ]},
    { id:'ROLE-OP', name:'Operator', permissions: [
      'purchase.create','purchase.view',
      'sales.create','sales.view',
      'inventory.view','inventory.transfer',
      'cashbook.view',
      'reports.view'
    ]},
    { id:'ROLE-VIEW', name:'Viewer', permissions: [
      'purchase.view','sales.view','inventory.view','ledger.view','reports.view'
    ]},
  ];
  set('adm_roles', all);
  return all;
}
export function loadRoles():Role[]{ return seedRoles(); }
export function saveRole(r:Role){
  const all = loadRoles();
  const i = all.findIndex(x=>x.id===r.id);
  if (i>=0) all[i]=r; else all.push(r);
  set('adm_roles', all);
}

// users
export function seedUsers():User[]{
  const u = get<User[]>('adm_users', []);
  if (u.length) return u;
  const all: User[] = [
    { id:'U-1', name:'Owner', phone:'01700000000', roleId:'ROLE-ADMIN', active:true },
    { id:'U-2', name:'Operator 1', phone:'01800000000', roleId:'ROLE-OP', active:true },
  ];
  set('adm_users', all);
  return all;
}
export function loadUsers():User[]{ return seedUsers(); }
export function saveUser(u:User){
  const all = loadUsers();
  const i = all.findIndex(x=>x.id===u.id);
  if (i>=0) all[i]=u; else all.push(u);
  set('adm_users', all);
}

// ============ Dictionaries ============
export type Dictionary = {
  productTypes: string[];     // e.g. ধান, চাল
  varieties: string[];        // e.g. ২৮, ২৯, আতপ ...
  purchaseTypes: ('district'|'trolley'|'retail')[];
  warehouses: string[];       // simple names (manager page already exists)
  units: string[];            // kg, mon
};

export function loadDict():Dictionary{
  const d = get<Dictionary>('adm_dict', null as any);
  if (d) return d;
  const def: Dictionary = {
    productTypes: ['ধান','চাল'],
    varieties: ['২৮','২৯','আতপ','সেদ্ধ'],
    purchaseTypes: ['district','trolley','retail'],
    warehouses: ['WH-1','WH-2'],
    units: ['kg','mon'],
  };
  set('adm_dict', def);
  return def;
}
export function saveDict(d:Dictionary){ set('adm_dict', d); }

// ============ Cost Components ============
export type CostComponent = { id:string; name:string; code:string; active:boolean; required:boolean; affectsAvg:boolean };

export function seedCostComponents():CostComponent[]{
  const c = get<CostComponent[]>('adm_cost', []);
  if (c.length) return c;
  const def: CostComponent[] = [
    { id:'CC-TRANSPORT', name:'Transport', code:'transport', active:true, required:false, affectsAvg:true },
    { id:'CC-BAG',       name:'Bag',       code:'bag',       active:true, required:false, affectsAvg:true },
    { id:'CC-LOAD',      name:'Loading/Unloading', code:'loadingUnloading', active:true, required:false, affectsAvg:true },
    { id:'CC-MISC',      name:'Misc',      code:'misc',      active:true, required:false, affectsAvg:true },
  ];
  set('adm_cost', def);
  return def;
}
export function loadCostComponents():CostComponent[]{ return seedCostComponents(); }
export function saveCostComponent(c:CostComponent){
  const all = loadCostComponents();
  const i = all.findIndex(x=>x.id===c.id);
  if (i>=0) all[i]=c; else all.push(c);
  set('adm_cost', all);
}
export function toggleCostActive(id:string, active:boolean){
  const all = loadCostComponents();
  const i = all.findIndex(x=>x.id===id);
  if (i>=0){ all[i].active=active; set('adm_cost', all); }
}

// ============ Day Close (Lock) ============
export type DayLock = { date:string; lockedAt:string };
export function loadDayLocks():DayLock[]{ return get<DayLock[]>('grain_daylocks',[]); }
export function addDayLock(dateISO:string){
  const arr = loadDayLocks();
  if (!arr.find(x=>x.date===dateISO)){
    arr.push({ date:dateISO, lockedAt:new Date().toISOString()});
    set('grain_daylocks', arr);
  }
}
export function removeDayLock(dateISO:string){
  const arr = loadDayLocks().filter(x=>x.date!==dateISO);
  set('grain_daylocks', arr);
}

// ============ Print Templates ============
export type PrintTemplate = { id:string; name:string; paper:'A4'|'THERMAL'; active:boolean };
export function loadPrintTemplates():PrintTemplate[]{
  const x = get<PrintTemplate[]>('adm_prints', []);
  if (x.length) return x;
  const def: PrintTemplate[] = [
    { id:'PT-A4-SIMPLE', name:'A4 Simple (Logo+Header+Footer)', paper:'A4', active:true },
    { id:'PT-THERMAL-58', name:'Thermal 58mm', paper:'THERMAL', active:false },
  ];
  set('adm_prints', def);
  return def;
}
export function savePrintTemplate(p:PrintTemplate){
  const all = loadPrintTemplates();
  const i = all.findIndex(x=>x.id===p.id);
  if (i>=0) all[i]=p; else all.push(p);
  set('adm_prints', all);
}
export function togglePrintActive(id:string, active:boolean){
  const all = loadPrintTemplates();
  const i = all.findIndex(x=>x.id===id);
  if (i>=0){ all[i].active = active; set('adm_prints', all); }
}

// ============ Backup / Restore (Export / Import) ============
export function exportAll(){
  const keys = [
    'adm_settings','adm_roles','adm_users','adm_dict','adm_cost','adm_prints',
    // operational data (optional):
    'grain_sellers','grain_customers','grain_wh','grain_pos','grain_sos','grain_lots','grain_mock_lots','grain_moves',
    'grain_accounts','grain_vouchers','grain_daylocks'
  ];
  const out: Record<string,any> = {};
  keys.forEach(k=> out[k] = get<any>(k, null));
  return out;
}
export function importAll(obj: Record<string,any>){
  Object.entries(obj || {}).forEach(([k,v])=> set(k, v));
}
