import { nf } from "@/lib/i18n";

export function bnNumber(value: number, maximumFractionDigits = 2) {
	return nf(Number(value || 0), { maximumFractionDigits });
}

export function bnMoney(value: number) {
	return `৳ ${nf(Number(value || 0), {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

export function bnDateTime(value?: string | Date | null) {
	if (!value) return "-";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString("bn-BD");
}
