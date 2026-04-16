import { Request, Response } from 'express';
import * as service from './module.service';
import { HttpError } from '../../common/httpError';

export async function list(req: Request, res: Response, next: any) {
  try {
    const investors = await service.listInvestors();
    res.json({
      success: true,
      data: investors,
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: any) {
  try {
    const investor = await service.createInvestor(req.body);
    res.status(201).json({
      success: true,
      data: investor,
    });
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: any) {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new HttpError(400, 'Invalid investor ID');
    }
    const investor = await service.getInvestor(id);
    if (!investor) {
      throw new HttpError(404, 'Investor not found');
    }
    res.json({
      success: true,
      data: investor,
    });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: any) {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new HttpError(400, 'Invalid investor ID');
    }
    const investor = await service.updateInvestor(id, req.body);
    if (!investor) {
      throw new HttpError(404, 'Investor not found');
    }
    res.json({
      success: true,
      data: investor,
    });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: any) {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new HttpError(400, 'Invalid investor ID');
    }
    const deleted = await service.deleteInvestor(id);
    if (!deleted) {
      throw new HttpError(404, 'Investor not found');
    }
    res.json({
      success: true,
      message: 'Investor deleted',
    });
  } catch (err) {
    next(err);
  }
}

export async function getTxns(req: Request, res: Response, next: any) {
  try {
    const txns = await service.getInvestorTxns(req.params.id);
    res.json({
      success: true,
      data: txns,
    });
  } catch (err) {
    next(err);
  }
}

export async function postTxn(req: Request, res: Response, next: any) {
  try {
    const { kind, amount, date, instrument, memo, payAccountId } = req.body;

    if (!amount || amount <= 0) {
      throw new HttpError(400, 'Amount must be positive');
    }

    const today = new Date().toISOString().split('T')[0];
    const txn = await service.createInvestorTxn({
      investorId: req.params.id,
      kind,
      date: date || today,
      amount,
      instrument,
      memo,
    });

    res.status(201).json({
      success: true,
      data: txn,
    });
  } catch (err) {
    next(err);
  }
}

export async function getBalance(req: Request, res: Response, next: any) {
  try {
    const balance = await service.getInvestorBalance(req.params.id);
    res.json({
      success: true,
      data: balance,
    });
  } catch (err) {
    next(err);
  }
}
