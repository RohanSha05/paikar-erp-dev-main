import { z } from 'zod';

export const voucherRowSchema = z.object({
  accountId: z.string().trim().min(1, { message: 'Invalid account ID' }),
  dr: z.number().nonnegative().optional().default(0),
  cr: z.number().nonnegative().optional().default(0),
  memo: z.string().optional(),
});

export const createVoucherSchema = z.object({
  body: z.object({
    vtype: z.enum(['payment', 'receipt', 'journal', 'contra'], {
      errorMap: () => ({ message: 'Invalid voucher type' }),
    }),
    vdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'Date must be in YYYY-MM-DD format',
    }),
    rows: z.array(voucherRowSchema).min(2, {
      message: 'A voucher must have at least 2 rows (debit and credit)',
    }),
    narration: z.string().optional(),
  }).refine((data) => {
    const totalDr = data.rows.reduce((sum, row) => sum + (row.dr || 0), 0);
    const totalCr = data.rows.reduce((sum, row) => sum + (row.cr || 0), 0);
    const diff = Math.abs(totalDr - totalCr);
    return diff < 0.01; // Allow for floating point rounding
  }, {
    message: 'Total debits must equal total credits',
    path: ['rows'],
  }),
});

export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;
