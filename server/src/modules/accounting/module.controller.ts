import { Request, Response } from 'express';
import * as service from './module.service';

export async function listAccounts(req: Request, res: Response) {
	const accounts = await service.listAccounts(typeof req.query.type === 'string' ? req.query.type : undefined);
	return res.json({ success: true, data: accounts });
}

export async function createAccount(req: Request, res: Response) {
	const account = await service.createAccount(req.body);
	return res.status(201).json({
		success: true,
		message: 'Account created',
		data: account,
	});
}

export async function getDaybook(req: Request, res: Response) {
	const date = typeof req.query.date === 'string' ? req.query.date : undefined;
	const meta = await service.getReportMeta();
	const effectiveDate = date || meta.latestVoucherDate;
	if (!effectiveDate) {
		return res.json({
			success: true,
			data: {
				list: [],
				totals: { debit: 0, credit: 0 },
			},
		});
	}
	const data = await service.getDaybook(effectiveDate);
	return res.json({ success: true, data });
}

export async function getLedger(req: Request, res: Response) {
	const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
	if (!accountId) {
		return res.status(400).json({ success: false, message: 'accountId query is required' });
	}
	const from = typeof req.query.from === 'string' ? req.query.from : undefined;
	const to = typeof req.query.to === 'string' ? req.query.to : undefined;
	const data = await service.getLedger(accountId, from, to);
	return res.json({ success: true, data });
}

export async function getTrialBalance(_req: Request, res: Response) {
	const data = await service.getTrialBalance();
	return res.json({ success: true, data });
}

export async function getExpenseSummary(req: Request, res: Response) {
	const yearValue = typeof req.query.year === 'string' ? Number(req.query.year) : NaN;
	const year = Number.isFinite(yearValue) ? yearValue : NaN;
	const data = await service.getExpenseSummary(year);
	return res.json({ success: true, data });
}

export async function getReportMeta(_req: Request, res: Response) {
	const data = await service.getReportMeta();
	return res.json({ success: true, data });
}
