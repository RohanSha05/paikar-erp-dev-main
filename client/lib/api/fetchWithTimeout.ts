'use client';

const DEFAULT_API_TIMEOUT_MS = Number(
	process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 15000,
);

function isAbortError(error: unknown): boolean {
	return (
		error instanceof DOMException &&
		error.name === 'AbortError'
	);
}

export async function apiFetch(
	input: RequestInfo | URL,
	init: RequestInit = {},
	timeoutMs: number = DEFAULT_API_TIMEOUT_MS,
): Promise<Response> {
	const controller = new AbortController();
	const externalSignal = init.signal;

	const timeout = setTimeout(() => {
		controller.abort();
	}, Math.max(1, timeoutMs));

	const abortExternal = () => controller.abort();
	if (externalSignal) {
		if (externalSignal.aborted) {
			controller.abort();
		} else {
			externalSignal.addEventListener('abort', abortExternal, { once: true });
		}
	}

	try {
		   const response = await fetch(input, {
			   ...init,
			   signal: controller.signal,
		   });
		   return response;
	} catch (error) {
		if (
			isAbortError(error) &&
			!externalSignal?.aborted &&
			controller.signal.aborted
		) {
			throw new Error(`Request timeout after ${timeoutMs}ms`);
		}
		throw error;
	} finally {
		clearTimeout(timeout);
		if (externalSignal) {
			externalSignal.removeEventListener('abort', abortExternal);
		}
	}
}
