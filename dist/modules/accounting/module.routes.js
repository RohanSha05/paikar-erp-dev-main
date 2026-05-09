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
const express_1 = require("express");
const controller = __importStar(require("./module.controller"));
const auth_1 = require("../../common/middleware/auth");
const validate_1 = require("../../common/middleware/validate");
const module_validator_1 = require("./module.validator");
const module_service_1 = require("./module.service");
const router = (0, express_1.Router)();
router.get('/accounts', auth_1.requireAuth, controller.listAccounts);
router.post('/accounts', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN', 'OPERATOR']), (0, validate_1.validate)(module_validator_1.createAccountSchema), controller.createAccount);
router.get('/daybook', auth_1.requireAuth, controller.getDaybook);
router.get('/ledger', auth_1.requireAuth, controller.getLedger);
router.get('/trial-balance', auth_1.requireAuth, controller.getTrialBalance);
router.get('/expenses', auth_1.requireAuth, controller.getExpenseSummary);
router.get('/report-meta', auth_1.requireAuth, controller.getReportMeta);
router.post('/party-account/upsert-opening', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN', 'OPERATOR']), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, module_service_1.upsertPartyAccountOpening)(req.body);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
}));
exports.default = router;
