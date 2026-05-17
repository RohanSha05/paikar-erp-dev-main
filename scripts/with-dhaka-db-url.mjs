import { spawn } from 'node:child_process';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error('Usage: node scripts/with-dhaka-db-url.mjs <command> [args...]');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const url = new URL(databaseUrl);
const existingOptions = url.searchParams.get('options');
const timezoneOption = '-c timezone=Asia/Dhaka';

if (!existingOptions) {
  url.searchParams.set('options', timezoneOption);
} else if (!existingOptions.includes('timezone=Asia/Dhaka')) {
  url.searchParams.set('options', `${existingOptions} ${timezoneOption}`);
}

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    DATABASE_URL: url.toString(),
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
