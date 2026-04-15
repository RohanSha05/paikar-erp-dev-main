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
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.create = create;
exports.get = get;
exports.update = update;
exports.remove = remove;
exports.getTxns = getTxns;
exports.postTxn = postTxn;
exports.getBalance = getBalance;
const service = __importStar(require("./module.service"));
const httpError_1 = require("../../common/httpError");
async function list(req, res, next) {
    try {
        const investors = await service.listInvestors();
        res.json({
            success: true,
            data: investors,
        });
    }
    catch (err) {
        next(err);
    }
}
async function create(req, res, next) {
    try {
        const investor = await service.createInvestor(req.body);
        res.status(201).json({
            success: true,
            data: investor,
        });
    }
    catch (err) {
        next(err);
    }
}
async function get(req, res, next) {
    try {
        const investor = await service.getInvestor(req.params.id);
        if (!investor) {
            throw new httpError_1.HttpError(404, 'Investor not found');
        }
        res.json({
            success: true,
            data: investor,
        });
    }
    catch (err) {
        next(err);
    }
}
async function update(req, res, next) {
    try {
        const investor = await service.updateInvestor(req.params.id, req.body);
        if (!investor) {
            throw new httpError_1.HttpError(404, 'Investor not found');
        }
        res.json({
            success: true,
            data: investor,
        });
    }
    catch (err) {
        next(err);
    }
}
async function remove(req, res, next) {
    try {
        const deleted = await service.deleteInvestor(req.params.id);
        if (!deleted) {
            throw new httpError_1.HttpError(404, 'Investor not found');
        }
        res.json({
            success: true,
            message: 'Investor deleted',
        });
    }
    catch (err) {
        next(err);
    }
}
async function getTxns(req, res, next) {
    try {
        const txns = await service.getInvestorTxns(req.params.id);
        res.json({
            success: true,
            data: txns,
        });
    }
    catch (err) {
        next(err);
    }
}
async function postTxn(req, res, next) {
    try {
        const { kind, amount, date, instrument, memo, payAccountId } = req.body;
        if (!amount || amount <= 0) {
            throw new httpError_1.HttpError(400, 'Amount must be positive');
        }
        const today = new Date().toISOString().split('T')[0];
        const txn = await service.createInvestorTxn({
            investorId: req.params.id,
            kind,
            date: date || today,
            amount,
            instrument,
            memo,
        });
        res.status(201).json({
            success: true,
            data: txn,
        });
    }
    catch (err) {
        next(err);
    }
}
async function getBalance(req, res, next) {
    try {
        const balance = await service.getInvestorBalance(req.params.id);
        res.json({
            success: true,
            data: balance,
        });
    }
    catch (err) {
        next(err);
    }
}
