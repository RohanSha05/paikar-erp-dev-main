'use client';

import { useEffect, useState } from 'react';
import { getLedger } from '@/lib/api/accounting';

interface AccountBalance {
	balance: number;
	loading: boolean;
	error: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend.paikarpos.com';

/**
 * Hook to fetch and validate account balance
 * Returns current balance, loading state, and any errors
 */
export function useAccountBalance(
	accountId: string | undefined | null,
	refreshKey?: any,
): AccountBalance {
	const [balance, setBalance] = useState<number>(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!accountId) {
			setBalance(0);
			setError(null);
			return;
		}

		let mounted = true;

		async function fetchBalance() {
			try {
				setLoading(true);
				setError(null);

				const res = await getLedger(accountId as string);
				if (mounted) {
					setBalance(res?.closing || 0);
				}
			} catch (err) {
				if (mounted) {
					setError(err instanceof Error ? err.message : 'Failed to fetch balance');
					setBalance(0);
				}
			} finally {
				if (mounted) setLoading(false);
			}
		}

		fetchBalance();

		return () => {
			mounted = false;
		};
	}, [accountId, refreshKey]);

	return { balance, loading, error };
}

/**
 * Validate if the amount is within available balance
 * Returns { isValid, errorMessage }
 */
export function validateAmount(
	amount: number,
	balance: number,
): { isValid: boolean; errorMessage?: string } {
	if (!Number.isFinite(amount) || amount <= 0) {
		return { isValid: false, errorMessage: 'Amount must be greater than 0' };
	}

	if (amount > balance) {
		return {
			isValid: false,
			errorMessage: `Amount exceeds available balance (৳ ${balance.toLocaleString('en-IN', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})})`,
		};
	}

	return { isValid: true };
}
