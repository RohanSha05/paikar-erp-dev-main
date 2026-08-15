import { Request, Response, NextFunction } from 'express';
import {
  listAccounts,
  createParty,
  listParties,
  resolvePartyAccount,
  createVoucher,
  listVouchers,
} from './module.service';

/**
 * GET /api/v1/cashbook/parties
 * List all party accounts, optionally filtered by kind
 */
export async function getParties(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const kind = req.query.kind as string | undefined;
    const parties = await listParties(kind);

    res.json({
      success: true,
      data: parties,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/cashbook/parties
 * Create a party
 */
export async function createPartyHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const party = await createParty(req.body);

    res.status(201).json({
      success: true,
      data: party,
      message: 'Party created successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/cashbook/parties/:partyId/account
 * Resolve (or create) ledger account for a party
 */
export async function resolvePartyAccountHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const partyId = req.params.partyId as string;
    const account = await resolvePartyAccount(partyId);

    res.json({
      success: true,
      data: account,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/cashbook/accounts
 * List all active accounts, optionally filtered by type
 */
export async function getAccounts(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const filterByType = req.query.type as string | undefined;
    const accounts = await listAccounts(filterByType);

    res.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/cashbook/vouchers
 * Create a new voucher (payment, receipt, journal, contra)
 */
export async function createVoucherHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = req.body;
    const voucher = await createVoucher(input);

    res.status(201).json({
      success: true,
      data: voucher,
      message: `Voucher ${voucher.voucherNo} created successfully`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/cashbook/vouchers
 * List vouchers with optional date range
 */
export async function getVouchers(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const vouchers = await listVouchers(startDate, endDate);

    res.json({
      success: true,
      data: vouchers,
    });
  } catch (error) {
    next(error);
  }
}
