// lib/i18n/dict.ts
export type Locale = 'bn' | 'en';
export const DEFAULT_LOCALE: Locale = 'bn';

export const dict: Record<Locale, Record<string, string>> = {
  bn: {
    // ===== Menu =====
    'menu.dashboard': 'ড্যাশবোর্ড',
    'menu.cashbook': 'ক্যাশবুক',
    'menu.purchase': 'ক্রয়',
    'menu.purchaseNew': 'নতুন ক্রয় (PO)',
    'menu.purchaseList': 'ক্রয় লিস্ট (PO)',
    'menu.purchasePrint': 'প্রিন্ট (এই PO)',
    'menu.sales': 'বিক্রয়',
    'menu.salesNew': 'নতুন বিক্রয় (SO)',
    'menu.salesList': 'বিক্রয় লিস্ট (SO)',
    'menu.salesPrint': 'প্রিন্ট (এই SO)',
    'menu.inventory': 'ইনভেন্টরি',
    'menu.reports': 'রিপোর্ট',
    'menu.admin': 'অ্যাডমিন',
    'menu.settings': 'সেটিংস',
    'menu.users': 'ইউজারস',
    'menu.dictionaries': 'ডিকশনারি',
    'menu.costComponents': 'কস্ট কম্পোনেন্টস',
    'menu.permissions': 'পারমিশন',
    'menu.backup': 'ব্যাকআপ',
    'menu.ledger': 'লেজার',
    'menu.cashBookReport': 'ক্যাশ বুক',
    'menu.bankBookReport': 'ব্যাঙ্ক বুক',
    'menu.trialBalance': 'ট্রায়াল ব্যালেন্স',
    // NEW: inventory submenu
    'menu.stockCard': 'স্টক কার্ড',
    'menu.warehouses':'ওয়্যারহাউস',
    'menu.products':'প্রোডাক্ট',

    // ===== Common =====
    'common.save': 'সেভ',
    'common.cancel': 'ক্যান্সেল',
    'common.edit': 'এডিট',
    'common.view': 'দেখুন',
    'common.delete': 'ডিলিট',

    // ===== Dashboard =====
    'dashboard.title': 'ড্যাশবোর্ড',

    // KPI
    'dashboard.kpi_todaySales': 'আজকের বিক্রয়',
    'dashboard.kpi_todayPurchase': 'আজকের ক্রয়',
    'dashboard.kpi_inventoryValue': 'ইনভেন্টরি ভ্যালু',
    'dashboard.kpi_cashBank': 'ক্যাশ + ব্যাঙ্ক',
    'dashboard.kpi_cash': 'ক্যাশ',
    'dashboard.kpi_bank': 'ব্যাঙ্ক',

    // Shortcuts
    'dashboard.shortcuts': 'শর্টকাট',
    'dashboard.sc_purchase': 'Purchase',
    'dashboard.sc_sales': 'Sales',
    'dashboard.sc_voucher': 'Voucher',
    'dashboard.sc_cashbook': 'Cashbook',
    'dashboard.sc_daybook': 'Daybook',
    'dashboard.sc_ledger': 'Ledger',

    // Alerts
    'dashboard.alert_dayOpen': 'আজকের দিনটি এখনো Day Close করা হয়নি।',
    'dashboard.alert_negative_prefix': 'নেগেটিভ স্টক পাওয়া গেছে:',

    // Recent sections
    'dashboard.recent_purchase': 'সাম্প্রতিক ক্রয় (PO)',
    'dashboard.recent_sales': 'সাম্প্রতিক বিক্রয় (SO)',
    'dashboard.recent_vouchers': 'সাম্প্রতিক ভাউচার',
    'dashboard.recent_stockMoves': 'স্টক মুভমেন্ট (সাম্প্রতিক)',

    // Table headers / cells
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

    // Empty states
    'dashboard.table_no_purchase': 'No purchase yet',
    'dashboard.table_no_sales': 'No sales yet',
    'dashboard.table_no_voucher': 'No vouchers',
    'dashboard.table_no_moves': 'No moves',

    // Buttons / links
    'dashboard.see_full_ledger': 'পুরো লেজার দেখুন',

    // Charts
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
  },

  en: {
    // ===== Menu =====
    'menu.dashboard': 'Dashboard',
    'menu.cashbook': 'Cashbook',
    'menu.purchase': 'Purchase',
    'menu.purchaseNew': 'New Purchase (PO)',
    'menu.purchaseList': 'Purchase List (PO)',
    'menu.purchasePrint': 'Print (This PO)',
    'menu.sales': 'Sales',
    'menu.salesNew': 'New Sales (SO)',
    'menu.salesList': 'Sales List (SO)',
    'menu.salesPrint': 'Print (This SO)',
    'menu.inventory': 'Inventory',
    'menu.reports': 'Reports',
    'menu.admin': 'Admin',
    'menu.settings': 'Settings',
    'menu.users': 'Users',
    'menu.dictionaries': 'Dictionaries',
    'menu.costComponents': 'Cost Components',
    'menu.permissions': 'Permissions',
    'menu.backup': 'Backup',
    'menu.ledger': 'Ledger',
    'menu.cashBookReport': 'Cash Book',
    'menu.bankBookReport': 'Bank Book',
    'menu.trialBalance': 'Trial Balance',
    // NEW: inventory submenu
    'menu.stockCard': 'Stock Card',
    'menu.warehouses':'Warehouse',
    'menu.products':'Products',
    // ===== Common =====
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.delete': 'Delete',

    // ===== Dashboard =====
    'dashboard.title': 'Dashboard',

    // KPI
    'dashboard.kpi_todaySales': "Today's Sales",
    'dashboard.kpi_todayPurchase': "Today's Purchase",
    'dashboard.kpi_inventoryValue': 'Inventory Value',
    'dashboard.kpi_cashBank': 'Cash + Bank',
    'dashboard.kpi_cash': 'Cash',
    'dashboard.kpi_bank': 'Bank',

    // Shortcuts
    'dashboard.shortcuts': 'Shortcuts',
    'dashboard.sc_purchase': 'Purchase',
    'dashboard.sc_sales': 'Sales',
    'dashboard.sc_voucher': 'Voucher',
    'dashboard.sc_cashbook': 'Cashbook',
    'dashboard.sc_daybook': 'Daybook',
    'dashboard.sc_ledger': 'Ledger',

    // Alerts
    'dashboard.alert_dayOpen': 'Day is not closed yet.',
    'dashboard.alert_negative_prefix': 'Negative stock found:',

    // Recent sections
    'dashboard.recent_purchase': 'Recent Purchases (PO)',
    'dashboard.recent_sales': 'Recent Sales (SO)',
    'dashboard.recent_vouchers': 'Recent Vouchers',
    'dashboard.recent_stockMoves': 'Recent Stock Movement',

    // Table headers / cells
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

    // Empty states
    'dashboard.table_no_purchase': 'No purchase yet',
    'dashboard.table_no_sales': 'No sales yet',
    'dashboard.table_no_voucher': 'No vouchers',
    'dashboard.table_no_moves': 'No moves',

    // Buttons / links
    'dashboard.see_full_ledger': 'See Full Ledger',

    // Charts
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
'wh.msg.saved': 'Warehouse saved' // ওয়্যারহাউস সেভ হয়েছে
  },
};
