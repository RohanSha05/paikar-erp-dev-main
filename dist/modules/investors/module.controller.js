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
function list(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const investors = yield service.listInvestors();
            res.json({
                success: true,
                data: investors,
            });
        }
        catch (err) {
            next(err);
        }
    });
}
function create(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const investor = yield service.createInvestor(req.body);
            res.status(201).json({
                success: true,
                data: investor,
            });
        }
        catch (err) {
            next(err);
        }
    });
}
function get(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string' || !id.trim()) {
                throw new httpError_1.HttpError(400, 'Invalid investor ID');
            }
            const investor = yield service.getInvestor(id);
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
    });
}
function update(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string' || !id.trim()) {
                throw new httpError_1.HttpError(400, 'Invalid investor ID');
            }
            const investor = yield service.updateInvestor(id, req.body);
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
    });
}
function remove(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string' || !id.trim()) {
                throw new httpError_1.HttpError(400, 'Invalid investor ID');
            }
            const deleted = yield service.deleteInvestor(id);
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
    });
}
function getTxns(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const txns = yield service.getInvestorTxns(req.params.id);
            res.json({
                success: true,
                data: txns,
            });
        }
        catch (err) {
            next(err);
        }
    });
}
function postTxn(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { kind, amount, date, instrument, memo, payAccountId } = req.body;
            if (!amount || amount <= 0) {
                throw new httpError_1.HttpError(400, 'Amount must be positive');
            }
            const today = new Date().toISOString().split('T')[0];
            const txn = yield service.createInvestorTxn({
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
    });
}
function getBalance(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const balance = yield service.getInvestorBalance(req.params.id);
            res.json({
                success: true,
                data: balance,
            });
        }
        catch (err) {
            next(err);
        }
    });
}
