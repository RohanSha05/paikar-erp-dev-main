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
