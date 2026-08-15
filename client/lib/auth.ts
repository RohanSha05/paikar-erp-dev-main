'use client';

import { apiFetch } from '@/lib/api/fetchWithTimeout';

const ACCESS_TOKEN_KEY = 'grain_access_token';
const LEGACY_TOKEN_KEY = 'grain_token';
const USER_KEY = 'grain_user';

const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend.paikarpos.com';

type LoginApiResponse = {
	success?: boolean;
	message?: string;
	data?: {
		accessToken?: string;
		user?: unknown;
	};
};

export function getAccessToken() {
	if (typeof window === 'undefined') return '';
	return (
		localStorage.getItem(ACCESS_TOKEN_KEY) ||
		localStorage.getItem(LEGACY_TOKEN_KEY) ||
		''
	);
}

function getStoredUser(): any | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(USER_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function getCurrentUser() {
	return getStoredUser();
}

export function getCurrentUserRole() {
	const user = getStoredUser();
	return String(user?.role || '').trim().toUpperCase();
}

export function isAuthed() {
	if (typeof window === 'undefined') return false;
	return !!getAccessToken();
}

export function setAuthSession(token: string, user?: unknown) {
	if (typeof window === 'undefined') return;

	localStorage.setItem(ACCESS_TOKEN_KEY, token);
	localStorage.setItem(LEGACY_TOKEN_KEY, token);

	if (user !== undefined) {
		localStorage.setItem(USER_KEY, JSON.stringify(user));
	}
}

export function getAuthHeaders(extraHeaders: Record<string, string> = {}) {
	const token = getAccessToken();
	return {
		'Content-Type': 'application/json',
		...(token ? { Authorization: `Bearer ${token}` } : {}),
		...extraHeaders,
	};
}

// export async function loginWithApi(phone: string, password: string) {
// 	const res = await apiFetch(`${API_BASE_URL}/api/v1/auth/login`, {
// 		method: 'POST',
// 		headers: {
// 			'Content-Type': 'application/json',
// 		},
// 		body: JSON.stringify({ phone, password }),
// 	});

// 	const payload = (await res.json().catch(() => ({}))) as LoginApiResponse;

// 	if (!res.ok) {
// 		throw new Error(payload?.message || 'Login failed');
// 	}

// 	const token = payload?.data?.accessToken;
// 	if (!token) {
// 		throw new Error('Backend did not return access token');
// 	}

// 	setAuthSession(token, payload?.data?.user);
// 	return payload;
// }

// lib/auth.ts
// Improved loginWithApi with proper backend + network error handling

export async function loginWithApi(phone: string, password: string) {
	try {
		const res = await apiFetch(`${API_BASE_URL}/api/v1/auth/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ phone, password }),
		});

		const payload = (await res.json().catch(() => ({}))) as LoginApiResponse;

		// Invalid credentials / backend validation
		if (!res.ok) {
			if (res.status === 401) {
				throw new Error(
					payload?.message || 'Invalid phone number or password'
				);
			}

			if (res.status === 404) {
				throw new Error('Login service not found');
			}

			if (res.status >= 500) {
				throw new Error('Server error. Please try again later.');
			}

			throw new Error(payload?.message || 'Login failed');
		}

		const token = payload?.data?.accessToken;

		if (!token) {
			throw new Error('Backend did not return access token');
		}

		setAuthSession(token, payload?.data?.user);

		return payload;
	} catch (err: unknown) {
		// Network / timeout / unreachable backend
		if (err instanceof Error) {
			if (
				err.message.includes('fetch') ||
				err.message.includes('network') ||
				err.message.includes('Failed to fetch')
			) {
				throw new Error(
					'Unable to connect to server. Check internet or backend.'
				);
			}

			throw err;
		}

		throw new Error('Unexpected login error');
	}
}

export async function verifyCurrentPassword(password: string) {
	const user = getStoredUser();
	const phone = String(user?.phone || '').trim();
	if (!phone) {
		throw new Error('Current user phone number not found. Please login again.');
	}

	const res = await apiFetch(`${API_BASE_URL}/api/v1/auth/login`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ phone, password }),
	});

	const payload = (await res.json().catch(() => ({}))) as LoginApiResponse;
	if (!res.ok) {
		throw new Error(payload?.message || 'Invalid password');
	}
}

export function loginMock(phone: string) {
	setAuthSession(phone || '01700000000');
}

export function logout() {
	if (typeof window !== 'undefined') {
		localStorage.removeItem(ACCESS_TOKEN_KEY);
		localStorage.removeItem(LEGACY_TOKEN_KEY);
		localStorage.removeItem(USER_KEY);
	}
	window.location.href = '/login';
}
