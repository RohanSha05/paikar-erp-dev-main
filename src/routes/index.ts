import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import productRoutes from '../modules/products/products.routes';
import lotsRoutes from '../modules/lots/module.routes';
import customerRoutes from '../modules/customers/module.routes';
import driverRoutes from '../modules/drivers/module.routes';
import driverTripRoutes from '../modules/driver-trips/module.routes';
import inventoryRoutes from '../modules/inventory/module.routes';
import purchaseRoutes from '../modules/purchase/purchase.routes';
import salesRoutes from '../modules/sales/sales.routes';
import userRoutes from '../modules/users/module.routes';
import partyRoutes from '../modules/parties/module.routes';
import warehouseRoutes from '../modules/warehouses/module.routes';
import accountingRoutes from '../modules/accounting/module.routes';
import recurringRoutes from '../modules/recurring/module.routes';
import cashbookRoutes from '../modules/cashbook/module.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'OK' });
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/lots', lotsRoutes);
router.use('/customers', customerRoutes);
router.use('/drivers', driverRoutes);
router.use('/driver-trips', driverTripRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/purchase-orders', purchaseRoutes);
router.use(salesRoutes);
router.use('/users', userRoutes);
router.use('/parties', partyRoutes);
router.use('/warehouses', warehouseRoutes);
router.use('/accounting', accountingRoutes);
router.use('/recurring', recurringRoutes);
router.use('/cashbook', cashbookRoutes);

export default router;
