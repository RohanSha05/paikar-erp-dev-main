import { PrismaClient } from '@prisma/client';

function withDhakaTimezone(databaseUrl: string | undefined) {
	if (!databaseUrl) {
		return databaseUrl;
	}

	const url = new URL(databaseUrl);
	const existingOptions = url.searchParams.get('options');
	const timezoneOption = '-c timezone=Asia/Dhaka';

	if (!existingOptions) {
		url.searchParams.set('options', timezoneOption);
	} else if (!existingOptions.includes('timezone=Asia/Dhaka')) {
		url.searchParams.set('options', `${existingOptions} ${timezoneOption}`);
	}

	return url.toString();
}

export const prisma = new PrismaClient({
	datasources: {
		db: {
			url: withDhakaTimezone(process.env.DATABASE_URL),
		},
	},
});
