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
exports.RetailPurchaseDraftController = void 0;
const retailPurchaseDraft_service_1 = require("./retailPurchaseDraft.service");
class RetailPurchaseDraftController {
    static updateDraft(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const draft = yield retailPurchaseDraft_service_1.RetailPurchaseDraftService.updateDraft(id, req.body);
                res.json({ success: true, data: draft });
            }
            catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
        });
    }
    static deleteDraft(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                yield retailPurchaseDraft_service_1.RetailPurchaseDraftService.deleteDraft(id);
                res.json({ success: true });
            }
            catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
        });
    }
    static listDrafts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { date } = req.query;
                if (!date || typeof date !== 'string') {
                    return res.status(400).json({ success: false, message: 'Missing or invalid date parameter' });
                }
                const drafts = yield retailPurchaseDraft_service_1.RetailPurchaseDraftService.listDraftsByDate(date);
                res.json({ success: true, data: drafts });
            }
            catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
        });
    }
    static createDraft(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const draft = yield retailPurchaseDraft_service_1.RetailPurchaseDraftService.createDraft(Object.assign(Object.assign({}, req.body), { createdBy: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'system' }));
                res.status(201).json({ success: true, data: draft });
            }
            catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
        });
    }
    static finalizeDrafts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { date, warehouseId } = req.body;
                const createdBy = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'system';
                const po = yield retailPurchaseDraft_service_1.RetailPurchaseDraftService.finalizeDraftsForDate(date, warehouseId, createdBy);
                res.json({ success: true, data: po });
            }
            catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
        });
    }
}
exports.RetailPurchaseDraftController = RetailPurchaseDraftController;
