"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSalesOrdersHandler = listSalesOrdersHandler;
exports.getSalesOrderByIdHandler = getSalesOrderByIdHandler;
exports.createSalesOrderHandler = createSalesOrderHandler;
exports.updateSalesOrderHandler = updateSalesOrderHandler;
exports.confirmSalesOrderHandler = confirmSalesOrderHandler;
const sales_service_1 = require("./sales.service");
async function listSalesOrdersHandler(_req, res, next) {
    try {
        const data = await (0, sales_service_1.listSalesOrders)();
        return res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
}
async function getSalesOrderByIdHandler(req, res, next) {
    try {
        const data = await (0, sales_service_1.getSalesOrderById)(req.params.id);
        return res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
}
async function createSalesOrderHandler(req, res, next) {
    try {
        const body = req.body;
        const userId = req.authUser?.userId;
        const data = await (0, sales_service_1.createSalesOrderDraft)(body, userId);
        return res.status(201).json({ success: true, message: 'SO draft saved', data });
    }
    catch (error) {
        next(error);
    }
}
async function updateSalesOrderHandler(req, res, next) {
    try {
        const body = req.body;
        const data = await (0, sales_service_1.updateSalesOrderDraft)(req.params.id, body);
        return res.json({ success: true, message: 'SO draft updated', data });
    }
    catch (error) {
        next(error);
    }
}
async function confirmSalesOrderHandler(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.authUser?.userId;
        const data = await (0, sales_service_1.confirmSalesOrder)(id, userId);
        return res.json({ success: true, message: 'SO confirmed', data });
    }
    catch (error) {
        next(error);
    }
}
