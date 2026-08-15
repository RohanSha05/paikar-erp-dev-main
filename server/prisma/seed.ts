import bcrypt from 'bcrypt';
import { PrismaClient, UserRole, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const saltRounds = 10;
  const adminPassword = await bcrypt.hash('admin123', saltRounds);

  await prisma.user.upsert({
    where: { email: 'admin@paikar.local' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@paikar.local',
      passwordHash: adminPassword,
      role: UserRole.ADMIN
    }
  });

  await prisma.account.upsert({
    where: { code: 'AC-INVENTORY' },
    update: {},
    create: { code: 'AC-INVENTORY', name: 'Inventory', type: 'asset' }
  });

  await prisma.account.upsert({
    where: { code: 'AC-PAYABLES' },
    update: {},
    create: { code: 'AC-PAYABLES', name: 'Payables', type: 'liability' }
  });

  await prisma.account.upsert({
    where: { code: 'AC-CASH' },
    update: {},
    create: { code: 'AC-CASH', name: 'Cash', type: 'cash' }
  });

  await prisma.account.upsert({
    where: { code: 'AC-BANK' },
    update: {},
    create: { code: 'AC-BANK', name: 'Bank', type: 'bank' }
  });

  await prisma.account.upsert({
    where: { code: 'AC-EXP' },
    update: {},
    create: { code: 'AC-EXP', name: 'Expenses', type: 'expense' }
  });

  await prisma.account.upsert({
    where: { code: 'AC-TRANSPORT' },
    update: {},
    create: { code: 'AC-TRANSPORT', name: 'Transport Expense', type: 'transport' }
  });

  await prisma.account.upsert({
    where: { code: 'AC-ROUND' },
    update: {},
    create: { code: 'AC-ROUND', name: 'Rounding Difference', type: 'income' }
  });

  await prisma.account.upsert({
    where: { code: 'AC-INC' },
    update: {},
    create: { code: 'AC-INC', name: 'Income', type: 'income' }
  });

  await prisma.warehouse.upsert({
    where: { code: 'WH-1' },
    update: {},
    create: { code: 'WH-1', name: 'Main Warehouse' }
  });

  await prisma.seller.create({
    data: { name: 'Default Seller', district: 'Naogaon', market: 'Manda' }
  }).catch(() => {});

  await prisma.product.upsert({
    where: { code: 'P28' },
    update: {},
    create: {
      code: 'P28',
      name: '२८ ধান',
      category: 'ধান',
      unit: 'bag',
      active: true
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
