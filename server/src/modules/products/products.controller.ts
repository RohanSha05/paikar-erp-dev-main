import { Request, Response } from 'express';
import * as service from './products.service';

export async function list(req: Request, res: Response) {
  const products = await service.listProducts();
  return res.json({ success: true, data: products });
}

export async function create(req: Request, res: Response) {
  const product = await service.createProduct(req.body);
  return res.status(201).json({
    success: true,
    message: 'Product created',
    data: product
  });
}

export async function update(req: Request, res: Response) {
  const product = await service.updateProduct(req.params.id, req.body);
  return res.json({
    success: true,
    message: 'Product updated',
    data: product
  });
}
