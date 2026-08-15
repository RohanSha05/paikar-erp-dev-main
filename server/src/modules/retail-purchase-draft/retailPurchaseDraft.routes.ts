import { Router } from 'express';
import { RetailPurchaseDraftController } from './retailPurchaseDraft.controller';

const router = Router();

// GET /api/v1/retail-purchase-drafts?date=YYYY-MM-DD
router.get('/', RetailPurchaseDraftController.listDrafts);

// POST /api/v1/retail-purchase-drafts

// Create draft
router.post('/', RetailPurchaseDraftController.createDraft);

// Edit draft
router.put('/:id', RetailPurchaseDraftController.updateDraft);

// Delete draft
router.delete('/:id', RetailPurchaseDraftController.deleteDraft);

// POST /api/v1/retail-purchase-drafts/finalize
router.post('/finalize', RetailPurchaseDraftController.finalizeDrafts);

export default router;
