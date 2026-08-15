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
exports.getById = getById;
exports.createDraft = createDraft;
exports.updateDraft = updateDraft;
exports.approve = approve;
const service = __importStar(require("./purchase.service"));
function list(_req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const orders = yield service.listPurchaseOrders();
            return res.json({
                success: true,
                data: orders
            });
        }
        catch (error) {
            next(error);
        }
    });
}
function getById(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const order = yield service.getPurchaseOrderById(req.params.id);
            return res.json({
                success: true,
                data: order
            });
        }
        catch (error) {
            next(error);
        }
    });
}
function createDraft(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const po = yield service.createDraft(req.body);
            return res.status(201).json({
                success: true,
                message: 'Purchase draft created',
                data: po
            });
        }
        catch (error) {
            next(error);
        }
    });
}
function updateDraft(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const updated = yield service.updatePurchaseOrderDraft(req.params.id, req.body);
            return res.json({
                success: true,
                message: 'Purchase draft updated',
                data: updated
            });
        }
        catch (error) {
            next(error);
        }
    });
}
function approve(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield service.approvePurchaseOrder(req.params.id);
            return res.json({
                success: true,
                message: 'Purchase approved',
                data: result
            });
        }
        catch (error) {
            next(error);
        }
    });
}
