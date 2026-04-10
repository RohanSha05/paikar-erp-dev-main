import { NextFunction, Request, Response } from 'express';
import {
  confirmSalesOrder,
  createSalesOrderDraft,
  getSalesOrderById,
  listSalesOrders,
  updateSalesOrderDraft
} from './sales.service';

export async function listSalesOrdersHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await listSalesOrders();
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getSalesOrderByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getSalesOrderById(req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createSalesOrderHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body;
    const userId = req.authUser?.userId;
    const data = await createSalesOrderDraft(body, userId);
    return res.status(201).json({ success: true, message: 'SO draft saved', data });
  } catch (error) {
    next(error);
  }
}

export async function updateSalesOrderHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body;
    const data = await updateSalesOrderDraft(req.params.id, body);
    return res.json({ success: true, message: 'SO draft updated', data });
  } catch (error) {
    next(error);
  }
}

export async function confirmSalesOrderHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.authUser?.userId;
    const data = await confirmSalesOrder(id, userId);
    return res.json({ success: true, message: 'SO confirmed', data });
  } catch (error) {
    next(error);
  }
}