"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("../modules/auth/auth.routes"));
const products_routes_1 = __importDefault(require("../modules/products/products.routes"));
const purchase_routes_1 = __importDefault(require("../modules/purchase/purchase.routes"));
const module_routes_1 = __importDefault(require("../modules/users/module.routes"));
const module_routes_2 = __importDefault(require("../modules/parties/module.routes"));
const module_routes_3 = __importDefault(require("../modules/warehouses/module.routes"));
const router = (0, express_1.Router)();
router.get('/health', (_req, res) => {
    res.json({ success: true, message: 'OK' });
});
router.use('/auth', auth_routes_1.default);
router.use('/products', products_routes_1.default);
router.use('/purchase-orders', purchase_routes_1.default);
router.use('/users', module_routes_1.default);
router.use('/parties', module_routes_2.default);
router.use('/warehouses', module_routes_3.default);
exports.default = router;
