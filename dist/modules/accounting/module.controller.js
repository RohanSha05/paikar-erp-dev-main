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
exports.listAccounts = listAccounts;
exports.createAccount = createAccount;
exports.getDaybook = getDaybook;
exports.getLedger = getLedger;
exports.getTrialBalance = getTrialBalance;
exports.getExpenseSummary = getExpenseSummary;
const service = __importStar(require("./module.service"));
function listAccounts(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const accounts = yield service.listAccounts(typeof req.query.type === 'string' ? req.query.type : undefined);
        return res.json({ success: true, data: accounts });
    });
}
function createAccount(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const account = yield service.createAccount(req.body);
        return res.status(201).json({
            success: true,
            message: 'Account created',
            data: account,
        });
    });
}
function getDaybook(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const date = typeof req.query.date === 'string' ? req.query.date : undefined;
        if (!date) {
            return res.status(400).json({ success: false, message: 'date query is required' });
        }
        const data = yield service.getDaybook(date);
        return res.json({ success: true, data });
    });
}
function getLedger(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
        if (!accountId) {
            return res.status(400).json({ success: false, message: 'accountId query is required' });
        }
        const from = typeof req.query.from === 'string' ? req.query.from : undefined;
        const to = typeof req.query.to === 'string' ? req.query.to : undefined;
        const data = yield service.getLedger(accountId, from, to);
        return res.json({ success: true, data });
    });
}
function getTrialBalance(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield service.getTrialBalance();
        return res.json({ success: true, data });
    });
}
function getExpenseSummary(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const yearValue = typeof req.query.year === 'string' ? Number(req.query.year) : new Date().getFullYear();
        const year = Number.isFinite(yearValue) ? yearValue : new Date().getFullYear();
        const data = yield service.getExpenseSummary(year);
        return res.json({ success: true, data });
    });
}
