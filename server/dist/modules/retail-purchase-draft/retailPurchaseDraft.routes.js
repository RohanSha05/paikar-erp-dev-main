"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const retailPurchaseDraft_controller_1 = require("./retailPurchaseDraft.controller");
const router = (0, express_1.Router)();
// GET /api/v1/retail-purchase-drafts?date=YYYY-MM-DD
router.get('/', retailPurchaseDraft_controller_1.RetailPurchaseDraftController.listDrafts);
// POST /api/v1/retail-purchase-drafts
// Create draft
router.post('/', retailPurchaseDraft_controller_1.RetailPurchaseDraftController.createDraft);
// Edit draft
router.put('/:id', retailPurchaseDraft_controller_1.RetailPurchaseDraftController.updateDraft);
// Delete draft
router.delete('/:id', retailPurchaseDraft_controller_1.RetailPurchaseDraftController.deleteDraft);
// POST /api/v1/retail-purchase-drafts/finalize
router.post('/finalize', retailPurchaseDraft_controller_1.RetailPurchaseDraftController.finalizeDrafts);
exports.default = router;
