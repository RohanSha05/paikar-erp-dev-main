"use strict";
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
exports.listSalesOrdersHandler = listSalesOrdersHandler;
exports.getSalesOrderByIdHandler = getSalesOrderByIdHandler;
exports.createSalesOrderHandler = createSalesOrderHandler;
exports.updateSalesOrderHandler = updateSalesOrderHandler;
exports.confirmSalesOrderHandler = confirmSalesOrderHandler;
exports.deleteSalesOrderHandler = deleteSalesOrderHandler;
const sales_service_1 = require("./sales.service");
function listSalesOrdersHandler(_req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const data = yield (0, sales_service_1.listSalesOrders)();
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
}
function getSalesOrderByIdHandler(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const data = yield (0, sales_service_1.getSalesOrderById)(req.params.id);
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
}
function createSalesOrderHandler(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const body = req.body;
            const userId = (_a = req.authUser) === null || _a === void 0 ? void 0 : _a.userId;
            const data = yield (0, sales_service_1.createSalesOrderDraft)(body, userId);
            return res.status(201).json({ success: true, message: 'SO draft saved', data });
        }
        catch (error) {
            next(error);
        }
    });
}
function updateSalesOrderHandler(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const body = req.body;
            const userId = (_a = req.authUser) === null || _a === void 0 ? void 0 : _a.userId;
            const data = yield (0, sales_service_1.updateSalesOrderDraft)(req.params.id, body, userId);
            return res.json({ success: true, message: 'SO draft updated', data });
        }
        catch (error) {
            next(error);
        }
    });
}
function confirmSalesOrderHandler(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const { id } = req.params;
            const userId = (_a = req.authUser) === null || _a === void 0 ? void 0 : _a.userId;
            const data = yield (0, sales_service_1.confirmSalesOrder)(id, userId);
            return res.json({ success: true, message: 'SO confirmed', data });
        }
        catch (error) {
            next(error);
        }
    });
}
function deleteSalesOrderHandler(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const { id } = req.params;
            const userId = (_a = req.authUser) === null || _a === void 0 ? void 0 : _a.userId;
            const data = yield (0, sales_service_1.deleteSalesOrder)(id, req.body, userId);
            return res.json({ success: true, message: 'SO deleted', data });
        }
        catch (error) {
            next(error);
        }
    });
}
