'use client';

export type Locale = 'bn' | 'en';
export const DEFAULT_LOCALE: Locale = 'bn';

// --- Locale Getter/Setter ---
export function getLocale(): Locale {
  try {
    if (typeof window === 'undefined') return DEFAULT_LOCALE;
    const v = (localStorage.getItem('lang') || DEFAULT_LOCALE) as Locale;
    return v === 'en' ? 'en' : 'bn';
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function setLocale(lang: Locale) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lang', lang);
      document.cookie = `lang=${lang}; path=/; max-age=31536000`;
      window.location.reload();
    }
  } catch {}
}

// --- Number Formatter ---
export function nf(n: number, opt: Intl.NumberFormatOptions = {}) {
  const lang = getLocale();
  const localeTag = lang === 'bn' ? 'bn-BD' : 'en-US';
  return new Intl.NumberFormat(localeTag, opt).format(n || 0);
}

// --- Dictionary (Menu + Common + Dashboard) ---
const dict: Record<Locale, Record<string, string>> = {
  bn: {
    // ===== Menu =====
    'menu.dashboard': 'ড্যাশবোর্ড',
    'menu.cashbook': 'ক্যাশবুক',
    'menu.party-settlement': 'Party Settlement',
    'menu.transport': 'Transport',
    'menu.purchase': 'ক্রয়',
    'menu.purchaseNew': 'নতুন ক্রয় (PO)',
    'menu.purchaseList': 'ক্রয় লিস্ট (PO)',
    'menu.purchasePrint': 'প্রিন্ট (এই PO)',
    'menu.sales': 'বিক্রয়',
    'menu.salesNew': 'নতুন বিক্রয় (SO)',
    'menu.salesList': 'বিক্রয় লিস্ট (SO)',
    'menu.salesPrint': 'প্রিন্ট (এই SO)',
    'menu.parties': 'ক্রেতা / বিক্রেতা',
    'menu.inventory': 'ইনভেন্টরি',
    'menu.reports': 'রিপোর্ট',
    'menu.inventoryReports':'ইনভেন্টরি রিপোর্ট',
    'menu.admin': 'অ্যাডমিন',
    'menu.settings': 'সেটিংস',
    'menu.users': 'ইউজারস',
    'menu.dictionaries': 'ডিকশনারি',
    'menu.costComponents': 'কস্ট কম্পোনেন্টস',
    'menu.permissions': 'পারমিশন',
    'menu.backup': 'ব্যাকআপ',
    'menu.investors':'ইনভেস্টর',
    'menu.ledger': 'লেজার',
    'menu.cashBookReport': 'ক্যাশ বুক',
    'menu.bankBookReport': 'ব্যাঙ্ক বুক',
    'menu.trialBalance': 'ট্রায়াল ব্যালেন্স',
    'menu.stockCard': 'স্টক কার্ড',
    'menu.warehouses':'ওয়্যারহাউস',
    'menu.cashbookDailyExpense': 'দৈনিক খরচ এন্ট্রি',
'menu.recurringExpense': 'মাসিক ফিক্সড খরচ (Recurring)',
'menu.transportTrips': 'ড্রাইভার ট্রিপ',
'menu.reportsDaybook': 'ডেইবুক',
'menu.expenseReport': 'খরচ রিপোর্ট (মাসিক)',
'menu.transportDrivers':'ড্রাইভার',
'menu.products':'প্রোডাক্ট',
    // ===== Common =====
    'common.save': 'সেভ',
    'common.cancel': 'ক্যান্সেল',
    'common.edit': 'এডিট',
    'common.view': 'দেখুন',
    'common.delete': 'ডিলিট',

    // ===== Dashboard =====
    'dashboard.title': 'ড্যাশবোর্ড',
    'dashboard.kpi_todaySales': 'আজকের বিক্রয়',
    'dashboard.kpi_todayPurchase': 'আজকের ক্রয়',
    'dashboard.kpi_inventoryValue': 'ইনভেন্টরি ভ্যালু',
    'dashboard.kpi_cashBank': 'ক্যাশ + ব্যাঙ্ক',
    'dashboard.kpi_cash': 'ক্যাশ',
    'dashboard.kpi_bank': 'ব্যাঙ্ক',

   'dashboard.shortcuts': 'শর্টকাট', // Shortcuts
'dashboard.sc_purchase': 'ক্রয়', // Purchase
'dashboard.sc_sales': 'বিক্রয়', // Sales
'dashboard.sc_voucher': 'ভাউচার', // Voucher
'dashboard.sc_cashbook': 'ক্যাশ বই', // Cashbook
'dashboard.sc_daybook': 'দৈনিক খাতা', // Daybook
'dashboard.sc_ledger': 'খতিয়ান', // Ledger

    'dashboard.alert_dayOpen': 'আজকে দিনের লেনদেন এখনো শেষ করা হয়নি।',
    'dashboard.alert_negative_prefix': 'নেগেটিভ স্টক পাওয়া গেছে:',

    'dashboard.recent_purchase': 'সাম্প্রতিক ক্রয় (PO)',
    'dashboard.recent_sales': 'সাম্প্রতিক বিক্রয় (SO)',
    'dashboard.recent_vouchers': 'সাম্প্রতিক ভাউচার',
    'dashboard.recent_stockMoves': 'স্টক মুভমেন্ট (সাম্প্রতিক)',

    'dashboard.table_po': 'পিও', // PO (Purchase Order)
'dashboard.table_seller': 'বিক্রেতা', // Seller
'dashboard.table_cost': 'খরচ', // Cost
'dashboard.table_status': 'স্থিতি', // Status
'dashboard.table_so': 'এসও', // SO (Sales Order)
'dashboard.table_customer': 'গ্রাহক', // Customer
'dashboard.table_total': 'মোট', // Total
'dashboard.table_voucher': 'ভাউচার', // Voucher
'dashboard.table_date': 'তারিখ', // Date
'dashboard.table_type': 'ধরণ', // Type
'dashboard.table_amount': 'পরিমাণ', // Amount
'dashboard.table_ref': 'রেফারেন্স', // Ref
'dashboard.table_lot': 'লট', // Lot
'dashboard.table_qtyKg': 'পরিমাণ (কেজি)', // Qty (kg)
'dashboard.table_no_purchase': 'এখনো কোনো ক্রয় নেই', // No purchase yet
'dashboard.table_no_sales': 'এখনো কোনো বিক্রয় নেই', // No sales yet
'dashboard.table_no_voucher': 'কোনো ভাউচার নেই', // No vouchers
'dashboard.table_no_moves': 'কোনো মুভ নেই', // No moves

    'dashboard.see_full_ledger': 'পুরো লেজার দেখুন',
    'dashboard.receivables_top': 'গ্রাহক পাওনা (Top 5)',
    'dashboard.payables_top': 'সরবরাহকারী পাওনা (Top 5)',

    'dashboard.chart_salesVsPurchase': 'বিক্রয় বনাম ক্রয় (শেষ ১৪ দিন)',
    'dashboard.chart_inventoryByProduct': 'প্রোডাক্টভিত্তিক ইনভেন্টরি ভ্যালু',
    'dashboard.chart_salesTrend': 'বিক্রয় ট্রেন্ড (Wave)',
    'dashboard.chart_cashVsBank': 'ক্যাশ বনাম ব্যাঙ্ক',
   // ===== Inventory =====
'inventory.title': 'ইনভেন্টরি',
'inventory.kpi_lots': 'লট',
'inventory.kpi_totalQty': 'মোট পরিমাণ (কেজি)',
'inventory.kpi_totalValue': 'ইনভেন্টরি ভ্যালু',
'inventory.searchPlaceholder': 'লট / প্রোডাক্ট / ওয়্যারহাউস দিয়ে সার্চ করুন...',
'inventory.filters.warehouse': 'ওয়্যারহাউস',
'inventory.btn.transfer': 'ট্রান্সফার',
'inventory.btn.adjust': 'এডজাস্ট',
'inventory.btn.stockCard': 'স্টক কার্ড',
'inventory.btn.manageWh': 'ওয়্যারহাউস ম্যানেজ',
'inventory.table.lot': 'লট',
'inventory.table.product': 'প্রোডাক্ট',
'inventory.table.qty': 'পরিমাণ (কেজি)',
'inventory.table.avg': 'গড়/ কেজি',
'inventory.table.value': 'ভ্যালু',
'inventory.table.wh': 'ওয়্যারহাউস',
'inventory.table.action': 'অ্যাকশন',
'inventory.empty': 'কোনো লট পাওয়া যায়নি',
'inventory.recentMoves': 'সাম্প্রতিক স্টক মুভ',
'inventory.exportCsv': 'CSV এক্সপোর্ট',

// ===== Stock Card =====
'stock.title': 'স্টক কার্ড',
'stock.filters.lot': 'লট',
'stock.filters.warehouse': 'ওয়্যারহাউস',
'stock.filters.allWarehouses': 'সকল ওয়্যারহাউস',
'stock.filters.from': 'শুরু',
'stock.filters.to': 'শেষ',
'stock.btn.reset': 'রিসেট',
'stock.btn.print': 'প্রিন্ট',
'stock.btn.back': 'ব্যাক',
'stock.btn.csv': 'CSV এক্সপোর্ট',
'stock.kpi.opening': 'ওপেনিং (কেজি)',
'stock.kpi.in': 'ইন (কেজি)',
'stock.kpi.out': 'আউট (কেজি)',
'stock.kpi.closing': 'ক্লোজিং (কেজি)',
'stock.table.date': 'তারিখ',
'stock.table.ref': 'রেফারেন্স',
'stock.table.wh': 'ওয়্যারহাউস',
'stock.table.in': 'ইন (কেজি)',
'stock.table.out': 'আউট (কেজি)',
'stock.table.balance': 'ব্যালেন্স (কেজি)',
'stock.table.opening': 'ওপেনিং',
'stock.table.closing': 'ক্লোজিং',
'stock.table.empty': 'এই সময়ে কোনো মুভ নেই',

// ===== Warehouses =====
'wh.title': 'ওয়্যারহাউস',
'wh.btn.new': 'নতুন ওয়্যারহাউস',
'wh.form.name': 'নাম',
'wh.form.address': 'ঠিকানা',
'wh.btn.save': 'সেভ',
'wh.list.title': 'ওয়্যারহাউস লিস্ট',
'wh.table.name': 'নাম',
'wh.table.address': 'ঠিকানা',
'wh.table.action': 'অ্যাকশন',
'wh.msg.saved': 'ওয়্যারহাউস সেভ হয়েছে',

'cash.party.title': 'পার্টি সেটেলমেন্ট',
'cash.party.pay': 'পেমেন্ট',
'cash.party.receive': 'রিসিভ',
'cash.party.partyType': 'পার্টি টাইপ',
'cash.party.selectParty': 'পার্টি সিলেক্ট',
'cash.party.amount': 'টাকা',
'cash.party.instrument': 'ইনস্ট্রুমেন্ট',
'cash.party.memo': 'মেমো',
'cash.party.postPayment': 'পেমেন্ট পোস্ট করুন',
'cash.party.postReceipt': 'রিসিভ পোস্ট করুন',

'transport.trips.title': 'ড্রাইভার ট্রিপস',
'transport.trips.driverName': 'ড্রাইভার নাম',
'transport.trips.driverId': 'ড্রাইভার আইডি',
'transport.trips.date': 'তারিখ',
'transport.trips.truck': 'ট্রাক নং',
'transport.trips.route': 'রুট',
'transport.trips.expense': 'খরচ (৳)',
'transport.trips.memo': 'মেমো',
'transport.trips.addTrip': 'ট্রিপ অ্যাড + পোস্ট',
'transport.trips.advance': 'অ্যাডভান্স/লোন',
'transport.trips.postAdvance': 'অ্যাডভান্স পোস্ট',

'instrument.cash': 'ক্যাশ',
'instrument.bank': 'ব্যাঙ্ক',
'instrument.mfs': 'MFS',

'common.ok': 'ঠিক আছে',
'common.error': 'সমস্যা হয়েছে',
//PO
'po.destination': 'গন্তব্য',
'po.destination.warehouse': 'গুদাম (Warehouse)',
'po.destination.direct': 'ডাইরেক্ট মিল/ত্রেতা',
'po.destination.undecided': 'এখন নির্ধারিত নয়',
'po.productType': 'প্রোডাক্ট টাইপ',
'po.varietyNote': 'ভ্যারাইটি নোট',
'po.weightPolicy.actual': 'আসল ওজন',
'po.weightPolicy.accounting': 'হিসাবি ওজন',
'po.rateBasis.perMon': 'প্রতি মণ',
'po.rateBasis.perKg': 'প্রতি Kg',
'po.advance.title': 'Advance / Partial Payment',
'po.advance.amount': 'Advance Amount (Tk)',
'po.advance.instrument': 'Instrument',
'po.advance.hint': 'Approve করলে এই অংক অটো ভাউচার হবে',
'po.costPreview': 'Cost Preview',

//reports
'reports.daybook.title':'দৈনিক খাতা'

  },

  en: {
    // ===== Menu =====
    'menu.dashboard': 'Dashboard',
    'menu.cashbook': 'Cashbook',
    'menu.party-settlement': 'Party Settlement',
    'menu.transport': 'Transport',
    'menu.purchase': 'Purchase',
    'menu.purchaseNew': 'New Purchase (PO)',
    'menu.purchaseList': 'Purchase List (PO)',
    'menu.purchasePrint': 'Print (This PO)',
    'menu.sales': 'Sales',
    'menu.salesNew': 'New Sales (SO)',
    'menu.salesList': 'Sales List (SO)',
    'menu.salesPrint': 'Print (This SO)',
    'menu.parties': 'Buyers / Sellers',
    'menu.inventory': 'Inventory',
    'menu.reports': 'Reports',
    'menu.admin': 'Admin',
    'menu.settings': 'Settings',
    'menu.users': 'Users',
    'menu.dictionaries': 'Dictionaries',
    'menu.costComponents': 'Cost Components',
    'menu.permissions': 'Permissions',
    'menu.backup': 'Backup',
    'menu.investors':'Investors',
    'menu.ledger': 'Ledger',
    'menu.cashBookReport': 'Cash Book',
    'menu.bankBookReport': 'Bank Book',
    'menu.trialBalance': 'Trial Balance',
    'menu.stockCard': 'Stock Card',
    'menu.warehouses':'WareHouse',
    'menu.cashbookDailyExpense': 'Daily Expense Entry',
'menu.recurringExpense': 'Recurring Expenses',
'menu.transportTrips': 'Driver Trips',
'menu.reportsDaybook': 'Daybook',
'menu.expenseReport': 'Expense Report (Monthly)',
'menu.transportDrivers':'Driver',
'menu.products':'Product',

    // ===== Common =====
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.delete': 'Delete',

    // ===== Dashboard =====
    'dashboard.title': 'Dashboard',
    'dashboard.kpi_todaySales': "Today's Sales",
    'dashboard.kpi_todayPurchase': "Today's Purchase",
    'dashboard.kpi_inventoryValue': 'Inventory Value',
    'dashboard.kpi_cashBank': 'Cash + Bank',
    'dashboard.kpi_cash': 'Cash',
    'dashboard.kpi_bank': 'Bank',

    'dashboard.shortcuts': 'Shortcuts',
    'dashboard.sc_purchase': 'Purchase',
    'dashboard.sc_sales': 'Sales',
    'dashboard.sc_voucher': 'Voucher',
    'dashboard.sc_cashbook': 'Cashbook',
    'dashboard.sc_daybook': 'Daybook',
    'dashboard.sc_ledger': 'Ledger',

    'dashboard.alert_dayOpen': 'Day is not closed yet.',
    'dashboard.alert_negative_prefix': 'Negative stock found:',

    'dashboard.recent_purchase': 'Recent Purchases (PO)',
    'dashboard.recent_sales': 'Recent Sales (SO)',
    'dashboard.recent_vouchers': 'Recent Vouchers',
    'dashboard.recent_stockMoves': 'Recent Stock Movement',

    'dashboard.table_po': 'PO',
    'dashboard.table_seller': 'Seller',
    'dashboard.table_cost': 'Cost',
    'dashboard.table_status': 'Status',
    'dashboard.table_so': 'SO',
    'dashboard.table_customer': 'Customer',
    'dashboard.table_total': 'Total',
    'dashboard.table_voucher': 'Voucher',
    'dashboard.table_date': 'Date',
    'dashboard.table_type': 'Type',
    'dashboard.table_amount': 'Amount',
    'dashboard.table_ref': 'Ref',
    'dashboard.table_lot': 'Lot',
    'dashboard.table_qtyKg': 'Qty (kg)',
    'dashboard.table_no_purchase': 'No purchase yet',
    'dashboard.table_no_sales': 'No sales yet',
    'dashboard.table_no_voucher': 'No vouchers',
    'dashboard.table_no_moves': 'No moves',

    'dashboard.see_full_ledger': 'See Full Ledger',
    'dashboard.receivables_top': 'Receivables (Top 5)',
    'dashboard.payables_top': 'Payables (Top 5)',

    'dashboard.chart_salesVsPurchase': 'Sales vs Purchase (Last 14 days)',
    'dashboard.chart_inventoryByProduct': 'Inventory Value by Product',
    'dashboard.chart_salesTrend': 'Sales Trend (Wave)',
    'dashboard.chart_cashVsBank': 'Cash vs Bank',

    // ===== Inventory =====
'inventory.title': 'Inventory',
'inventory.kpi_lots': 'Lot',
'inventory.kpi_totalQty': 'Total Value (KG)',
'inventory.kpi_totalValue': 'Inventory Value',
'inventory.searchPlaceholder': 'Lot / Product / Search By Warehouse...',
'inventory.filters.warehouse': 'Warehouse',
'inventory.btn.transfer': 'Transfer',
'inventory.btn.adjust': 'Adjust',
'inventory.btn.stockCard': 'Stock Card',
'inventory.btn.manageWh': 'Warehouse Manage',
'inventory.table.lot': 'Lot', // লট
'inventory.table.product': 'Product', // প্রোডাক্ট
'inventory.table.qty': 'Quantity (KG)', // পরিমাণ (কেজি)
'inventory.table.avg': 'Average/ KG', // গড়/ কেজি
'inventory.table.value': 'Value', // ভ্যালু
'inventory.table.wh': 'Warehouse', // ওয়্যারহাউস
'inventory.table.action': 'Action', // অ্যাকশন
'inventory.empty': 'No lot found', // কোনো লট পাওয়া যায়নি
'inventory.recentMoves': 'Recent Stock Moves', // সাম্প্রতিক স্টক মুভ
'inventory.exportCsv': 'Export CSV', // CSV এক্সপোর্ট

// ===== Stock Card =====
'stock.title': 'Stock Card', // স্টক কার্ড
'stock.filters.lot': 'Lot', // লট
'stock.filters.warehouse': 'Warehouse', // ওয়্যারহাউস
'stock.filters.allWarehouses': 'All Warehouses', // সকল ওয়্যারহাউস
'stock.filters.from': 'From', // শুরু
'stock.filters.to': 'To', // শেষ
'stock.btn.reset': 'Reset', // রিসেট
'stock.btn.print': 'Print', // প্রিন্ট
'stock.btn.back': 'Back', // ব্যাক
'stock.btn.csv': 'Export CSV', // CSV এক্সপোর্ট
'stock.kpi.opening': 'Opening (KG)', // ওপেনিং (কেজি)
'stock.kpi.in': 'In (KG)', // ইন (কেজি)
'stock.kpi.out': 'Out (KG)', // আউট (কেজি)
'stock.kpi.closing': 'Closing (KG)', // ক্লোজিং (কেজি)
'stock.table.date': 'Date', // তারিখ
'stock.table.ref': 'Reference', // রেফারেন্স
'stock.table.wh': 'Warehouse', // ওয়্যারহাউস
'stock.table.in': 'In (KG)', // ইন (কেজি)
'stock.table.out': 'Out (KG)', // আউট (কেজি)
'stock.table.balance': 'Balance (KG)', // ব্যালেন্স (কেজি)
'stock.table.opening': 'Opening', // ওপেনিং
'stock.table.closing': 'Closing', // ক্লোজিং
'stock.table.empty': 'No moves during this period', // এই সময়ে কোনো মুভ নেই

// ===== Warehouses =====
'wh.title': 'Warehouse', // ওয়্যারহাউস
'wh.btn.new': 'New Warehouse', // নতুন ওয়্যারহাউস
'wh.form.name': 'Name', // নাম
'wh.form.address': 'Address', // ঠিকানা
'wh.btn.save': 'Save', // সেভ
'wh.list.title': 'Warehouse List', // ওয়্যারহাউস লিস্ট
'wh.table.name': 'Name', // নাম
'wh.table.address': 'Address', // ঠিকানা
'wh.table.action': 'Action', // অ্যাকশন
'wh.msg.saved': 'Warehouse saved', // ওয়্যারহাউস সেভ হয়েছে  },
'cash.party.title': 'Party Settlement',
'cash.party.pay': 'Pay',
'cash.party.receive': 'Receive',
'cash.party.partyType': 'Party Type',
'cash.party.selectParty': 'Select Party',
'cash.party.amount': 'Amount',
'cash.party.instrument': 'Instrument',
'cash.party.memo': 'Memo',
'cash.party.postPayment': 'Post Payment',
'cash.party.postReceipt': 'Post Collection',

'transport.trips.title': 'Driver Trips',
'transport.trips.driverName': 'Driver Name',
'transport.trips.driverId': 'Driver ID',
'transport.trips.date': 'Date',
'transport.trips.truck': 'Truck No',
'transport.trips.route': 'Route',
'transport.trips.expense': 'Expense',
'transport.trips.memo': 'Memo',
'transport.trips.addTrip': 'Add Trip & Post',
'transport.trips.advance': 'Advance/Loan',
'transport.trips.postAdvance': 'Post Advance',

'instrument.cash': 'Cash',
'instrument.bank': 'Bank',
'instrument.mfs': 'MFS',

'common.ok': 'OK',
'common.error': 'Error',

//PO
'po.destination': 'Destination',
'po.destination.warehouse': 'Warehouse',
'po.destination.direct': 'Direct to Mill',
'po.destination.undecided': 'Undecided',
'po.productType': 'Product Type',
'po.varietyNote': 'Variety Note',
'po.weightPolicy.actual': 'Actual weight',
'po.weightPolicy.accounting': 'Accounting weight',
'po.rateBasis.perMon': 'Per Mon',
'po.rateBasis.perKg': 'Per Kg',
'po.advance.title': 'Advance / Partial Payment',
'po.advance.amount': 'Advance Amount (Tk)',
'po.advance.instrument': 'Instrument',
'po.advance.hint': 'On approve, system will auto-post this voucher',
'po.costPreview': 'Cost Preview',

  }
};

// --- Translator ---
export function t(key: string, lang?: Locale): string {
  const l = lang || getLocale();
  const value =
    dict[l][key] ??
    dict.bn[key] ??
    dict.en[key] ??
    key;
  return value;
}
