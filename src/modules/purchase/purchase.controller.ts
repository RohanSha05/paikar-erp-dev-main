import { NextFunction, Request, Response } from 'express';
import * as service from './purchase.service';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const orders = await service.listPurchaseOrders();
    return res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await service.getPurchaseOrderById(req.params.id);
    return res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
}

export async function createDraft(req: Request, res: Response, next: NextFunction) {
  try {
    const po = await service.createDraft(req.body);
    return res.status(201).json({
      success: true,
      message: 'Purchase draft created',
      data: po
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDraft(req: Request, res: Response, next: NextFunction) {
  try {
    const updated = await service.updatePurchaseOrderDraft(req.params.id, req.body);
    return res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.approvePurchaseOrder(req.params.id);
    return res.json({
      success: true,
      message: 'Purchase approved',
      data: result
    });
  } catch (error) {
    next(error);
  }
}
