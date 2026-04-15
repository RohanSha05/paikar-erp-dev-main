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
exports.getById = getById;
exports.createDraft = createDraft;
exports.updateDraft = updateDraft;
exports.approve = approve;
const service = __importStar(require("./purchase.service"));
async function list(_req, res, next) {
    try {
        const orders = await service.listPurchaseOrders();
        return res.json({
            success: true,
            data: orders
        });
    }
    catch (error) {
        next(error);
    }
}
async function getById(req, res, next) {
    try {
        const order = await service.getPurchaseOrderById(req.params.id);
        return res.json({
            success: true,
            data: order
        });
    }
    catch (error) {
        next(error);
    }
}
async function createDraft(req, res, next) {
    try {
        const po = await service.createDraft(req.body);
        return res.status(201).json({
            success: true,
            message: 'Purchase draft created',
            data: po
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateDraft(req, res, next) {
    try {
        const updated = await service.updatePurchaseOrderDraft(req.params.id, req.body);
        return res.json(updated);
    }
    catch (error) {
        next(error);
    }
}
async function approve(req, res, next) {
    try {
        const result = await service.approvePurchaseOrder(req.params.id);
        return res.json({
            success: true,
            message: 'Purchase approved',
            data: result
        });
    }
    catch (error) {
        next(error);
    }
}
