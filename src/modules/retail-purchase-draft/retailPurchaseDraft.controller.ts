import { Request, Response } from 'express';
import { RetailPurchaseDraftService } from './retailPurchaseDraft.service';

export class RetailPurchaseDraftController {
    static async updateDraft(req: Request, res: Response) {
      try {
        const { id } = req.params;
        const draft = await RetailPurchaseDraftService.updateDraft(id, req.body);
        res.json({ success: true, data: draft });
      } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
      }
    }

    static async deleteDraft(req: Request, res: Response) {
      try {
        const { id } = req.params;
        await RetailPurchaseDraftService.deleteDraft(id);
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
      }
    }
  static async listDrafts(req: Request, res: Response) {
    try {
      const { date } = req.query;
      if (!date || typeof date !== 'string') {
        return res.status(400).json({ success: false, message: 'Missing or invalid date parameter' });
      }
      const drafts = await RetailPurchaseDraftService.listDraftsByDate(date);
      res.json({ success: true, data: drafts });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async createDraft(req: Request, res: Response) {
    try {
      const draft = await RetailPurchaseDraftService.createDraft({ ...req.body, createdBy: req.user?.id || 'system' });
      res.status(201).json({ success: true, data: draft });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async finalizeDrafts(req: Request, res: Response) {
    try {
      const { date, warehouseId } = req.body;
      const createdBy = req.user?.id || 'system';
      const po = await RetailPurchaseDraftService.finalizeDraftsForDate(date, warehouseId, createdBy);
      res.json({ success: true, data: po });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
