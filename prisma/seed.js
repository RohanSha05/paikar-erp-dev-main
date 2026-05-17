"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
	const saltRounds = 10;
	const adminPassword = await bcrypt_1.default.hash("admin123", saltRounds);
	await prisma.user.upsert({
		where: { email: "admin@paikar.local" },
		update: {},
		create: {
			name: "System Admin",
			email: "admin@paikar.local",
			passwordHash: adminPassword,
			role: client_1.UserRole.ADMIN,
		},
	});
	// await prisma.account.upsert({
	//     where: { code: 'AC-INVENTORY' },
	//     update: {},
	//     create: { code: 'AC-INVENTORY', name: 'Inventory', type: 'asset' }
	// });
	// await prisma.account.upsert({
	//     where: { code: 'AC-PAYABLES' },
	//     update: {},
	//     create: { code: 'AC-PAYABLES', name: 'Payables', type: 'liability' }
	// });
	// await prisma.account.upsert({
	//     where: { code: 'AC-CASH' },
	//     update: {},
	//     create: { code: 'AC-CASH', name: 'Cash', type: 'cash' }
	// });
	// await prisma.account.upsert({
	//     where: { code: 'AC-BANK' },
	//     update: {},
	//     create: { code: 'AC-BANK', name: 'Bank', type: 'bank' }
	// });
	await prisma.account.upsert({
		where: { code: "AC-EXP" },
		update: {},
		create: { code: "AC-EXP", name: "Expenses", type: "expense" },
	});
	const retailSellerName = "খুচরা পাইকার";
	const existingRetailSeller = await prisma.seller.findFirst({
		where: { name: retailSellerName },
		select: { id: true },
	});

	if (!existingRetailSeller) {
		await prisma.seller.create({
			data: {
				name: retailSellerName,
			},
		});
	}
	// await prisma.account.upsert({
	//     where: { code: 'AC-TRANSPORT' },
	//     update: {},
	//     create: { code: 'AC-TRANSPORT', name: 'Transport Expense', type: 'transport' }
	// });
	// await prisma.account.upsert({
	//     where: { code: 'AC-ROUND' },
	//     update: {},
	//     create: { code: 'AC-ROUND', name: 'Rounding Difference', type: 'income' }
	// });
	await prisma.warehouse.upsert({
		where: { code: "WH-1" },
		update: {},
		create: { code: "WH-1", name: "Main Warehouse" },
	});

	await prisma.product.upsert({
		where: { code: "P28" },
		update: {},
		create: {
			code: "P28",
			name: "२८ ধান",
			category: "ধান",
			unit: "bag",
			active: true,
		},
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
