export function toTitleCase(value: string): string {
	const text = value.trim();
	if (!text) return '';
	return text
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.split(' ')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
		.join(' ');
}

export function formatVoucherNarration(
	prefix: string,
	subject?: string | null,
	detail?: string | null,
	separator = ' - ',
): string {
	const parts = [prefix, subject, detail]
		.map((part) => part?.trim())
		.filter((part): part is string => Boolean(part));

	if (parts.length === 0) return '';
	if (parts.length === 1) return parts[0];
	return parts.join(separator);
}
