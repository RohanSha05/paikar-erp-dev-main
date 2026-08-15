import { z } from 'zod';

export const createInvestorSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional(),
    address: z.string().optional(),
    nidNo: z.string().optional(),
    nid: z.string().optional(),
    nomineeName: z.string().optional(),
    startDate: z.string().optional(),
    photoUrl: z.string().optional(),
    agreementPct: z.number().optional(),
    profitSharePct: z.number().optional(),
    notes: z.string().optional(),
    active: z.boolean().optional().default(true),
  }),
});

export const updateInvestorSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID is required'),
  }),
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    nidNo: z.string().optional(),
    nid: z.string().optional(),
    nomineeName: z.string().optional(),
    startDate: z.string().optional(),
    photoUrl: z.string().optional(),
    agreementPct: z.number().optional(),
    profitSharePct: z.number().optional(),
    notes: z.string().optional(),
    active: z.boolean().optional(),
  }),
});

export const postInvestorTxnSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Investor ID is required'),
  }),
  body: z.object({
    kind: z.enum(['capitalIn', 'capitalOut', 'profitPay', 'adjustment', 'payout']),
    amount: z.number().positive('Amount must be positive'),
    date: z.string().optional(),
    instrument: z.string().optional(),
    memo: z.string().optional(),
    payAccountId: z.string().optional().default('AC-CASH'),
  }),
});
