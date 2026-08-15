import { Request, Response } from 'express';
import { HttpError } from '../../common/httpError';
import * as service from './module.service';

export async function list(_req: Request, res: Response) {
  const customers = await service.listCustomers();
  return res.json({ success: true, data: customers });
}

export async function create(req: Request, res: Response) {
  const customer = await service.createCustomer(req.body);
  return res.status(201).json({
    success: true,
    message: 'Customer created',
    data: customer
  });
}

export async function update(req: Request, res: Response) {
  const { id } = req.params;
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new HttpError(400, 'Invalid customer ID');
  }
  const customer = await service.updateCustomer(id, req.body);
  return res.json({
    success: true,
    message: 'Customer updated',
    data: customer
  });
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params;
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new HttpError(400, 'Invalid customer ID');
  }
  const result = await service.deleteCustomer(id);
  return res.json({
    success: true,
    message: 'Customer deleted',
    data: result
  });
}
