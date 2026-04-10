import { Request, Response } from 'express';
import * as service from './module.service';

export async function list(req: Request, res: Response) {
  const availableOnly = req.query.available === true;
  const lots = await service.listLots(availableOnly);

  return res.json({
    success: true,
    data: lots
  });
}
