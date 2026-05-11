"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjust = adjust;
exports.transfer = transfer;
exports.dashboard = dashboard;
exports.report = report;
exports.stockCard = stockCard;
exports.reconcile = reconcile;
const service = __importStar(require("./module.service"));
function firstString(value) {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length ? trimmed : undefined;
    }
    if (Array.isArray(value) && typeof value[0] === 'string') {
        const trimmed = value[0].trim();
        return trimmed.length ? trimmed : undefined;
    }
    return undefined;
}
function toPositiveInt(value, fallback) {
    const text = firstString(value);
    if (!text)
        return fallback;
    const n = Number(text);
    return Number.isInteger(n) && n > 0 ? n : fallback;
}
function toBool(value) {
    var _a;
    const text = (_a = firstString(value)) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    if (!text)
        return undefined;
    if (text === 'true' || text === '1')
        return true;
    if (text === 'false' || text === '0')
        return false;
    return undefined;
}
function parseDashboardQuery(query) {
    const sortByRaw = firstString(query.sortBy);
    const sortDirRaw = firstString(query.sortDir);
    const sortBy = sortByRaw === 'availableKg' || sortByRaw === 'avgCostPerKg'
        ? sortByRaw
        : 'createdAt';
    const sortDir = sortDirRaw === 'asc' ? 'asc' : 'desc';
    return {
        q: firstString(query.q),
        warehouseId: firstString(query.warehouseId),
        productId: firstString(query.productId),
        availableOnly: toBool(query.availableOnly),
        page: toPositiveInt(query.page, 1),
        pageSize: toPositiveInt(query.pageSize, 20),
        sortBy,
        sortDir,
    };
}
function parseStockCardQuery(query) {
    const sortDirRaw = firstString(query.sortDir);
    const sortDir = sortDirRaw === 'asc' ? 'asc' : 'desc';
    return {
        lotId: firstString(query.lotId),
        warehouseId: firstString(query.warehouseId),
        from: firstString(query.from),
        to: firstString(query.to),
        page: toPositiveInt(query.page, 1),
        pageSize: toPositiveInt(query.pageSize, 100),
        sortDir,
    };
}
function parseReportQuery(query) {
    const ttRaw = firstString(query.transactionType);
    const transactionType = ttRaw === 'purchase' || ttRaw === 'sale' ? ttRaw : 'all';
    function toPositiveIntLocal(value, fallback) {
        const text = firstString(value);
        if (!text)
            return fallback;
        const n = Number(text);
        return Number.isInteger(n) && n > 0 ? n : fallback;
    }
    return {
        from: firstString(query.from),
        to: firstString(query.to),
        transactionType,
        partyId: firstString(query.partyId),
        warehouseId: firstString(query.warehouseId),
        productId: firstString(query.productId),
        q: firstString(query.q),
        page: toPositiveIntLocal(query.page, 1),
        pageSize: toPositiveIntLocal(query.pageSize, 100),
    };
}
function adjust(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield service.adjustStock(req.body);
        return res.json({
            success: true,
            message: 'Stock adjusted',
            data
        });
    });
}
function transfer(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield service.transferStock(req.body);
        return res.json({
            success: true,
            message: 'Stock transferred',
            data
        });
    });
}
function dashboard(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield service.getInventoryDashboard(parseDashboardQuery(req.query));
        return res.json({
            success: true,
            message: 'Inventory dashboard data loaded',
            data
        });
    });
}
function report(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield service.getInventoryReport(parseReportQuery(req.query));
        return res.json({
            success: true,
            message: 'Inventory report loaded',
            data
        });
    });
}
function stockCard(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield service.getStockCard(parseStockCardQuery(req.query));
        return res.json({
            success: true,
            message: 'Stock card data loaded',
            data
        });
    });
}
function reconcile(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield service.reconcileAllLots();
        return res.json({ success: true, message: 'Reconciliation complete', data });
    });
}
