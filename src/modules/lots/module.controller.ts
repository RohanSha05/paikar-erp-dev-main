import { Request, Response } from 'express';
import * as service from './module.service';

export async function list(req: Request, res: Response) {
  const availableOnly = Boolean(req.query.available);
  const lots = await service.listLots({
    availableOnly,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    productCategory: typeof req.query.productCategory === 'string' ? req.query.productCategory : undefined,
    productName: typeof req.query.productName === 'string' ? req.query.productName : undefined,
    customerId: typeof req.query.customerId === 'string' ? req.query.customerId : undefined,
  });

  return res.json({
    success: true,
    data: lots
  });
}
