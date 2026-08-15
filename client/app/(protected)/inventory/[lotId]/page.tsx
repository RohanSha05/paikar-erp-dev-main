'use client';

import Link from 'next/link';
import { showError, showSuccess } from '@/lib/swal';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getLots, type LotDto } from '@/lib/api/sales';
import { getWarehouses, type WarehouseDto } from '@/lib/api/warehouses';
import { transferStock } from '@/lib/api/inventory';
import { nf } from '@/lib/i18n';

type MoveRow = {
  id: string;
  createdAt?: string;
  refType?: string;
  refId?: string;
  warehouseId?: string;
  qtyKg: number;
};

export default function LotDetailPage() {
  const { lotId } = useParams<{ lotId: string }>();
  const [lot, setLot] = useState<LotDto | null>(null);
  const [whs, setWhs] = useState<WarehouseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [toWh, setToWh] = useState('');
  const [qty, setQty] = useState<number>(0);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [lots, warehouses] = await Promise.all([getLots(), getWarehouses()]);
      const found = lots.find((l) => l.id === lotId) || null;
      setLot(found);
      setWhs(warehouses);

      if (found) {
        const currentWhId = found.warehouseId || found.warehouse?.id || '';
        const defaultTo = warehouses.find((w) => w.id !== currentWhId)?.id || warehouses[0]?.id || '';
        setToWh(defaultTo);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load lot details');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [lotId]);

  const moves = useMemo(() => {
    if (!lot) return [] as MoveRow[];
    return (lot.stockMoves || [])
			.map((m, idx) => ({
				id: m.id || `${lot.id}-${m.createdAt || "NA"}-${idx + 1}`,
				createdAt: m.createdAt,
				refType: m.refType,
				refId: m.refId,
				warehouseId: m.warehouseId,
				qtyKg: Number(m.qtyKg || 0),
			}))
			.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [lot]);

  if (!loading && !lot) {
    return (
      <div className="p-6">
        <div className="text-slate-500">Lot not found</div>
        <Link href="/inventory" className="link mt-2 inline-block">Back to Inventory</Link>
      </div>
    );
  }

  const currentWhId = lot?.warehouseId || lot?.warehouse?.id || '';
  const currentWhName = lot?.warehouse?.name || whs.find((w) => w.id === currentWhId)?.name || currentWhId;

  async function doTransfer() {
    if (!lot) return;
    const q = Math.max(0, +qty || 0);
    if (!q) return;
    if (toWh === currentWhId) return void (await showError('Select a different warehouse'));

    setSaving(true);
    setError('');
    try {
      await transferStock({
        lotId: lot.id,
        toWarehouseId: toWh,
        qtyKg: q,
        memo: 'Quick transfer'
      });
      await showSuccess('Transfer recorded');
      setQty(0);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transfer failed';
      setError(message);
      await showError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lot Detail</h1>
          <p className="text-sm text-slate-500">{lot?.label || lot?.id || ''}</p>
        </div>
        <Link href="/inventory" className="btn btn-ghost">Back</Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500">Product</div>
          <div className="text-lg font-semibold mt-1">{lot?.product?.name || lot?.productType || '—'}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Qty (kg)</div>
          <div className="text-lg font-semibold mt-1">{nf(Number(lot?.availableKg || 0))}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Avg Cost / kg</div>
          <div className="text-lg font-semibold mt-1">৳ {nf(Number(lot?.avgCostPerKg || 0))}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Warehouse</div>
          <div className="text-lg font-semibold mt-1">{currentWhName || '—'}</div>
        </div>
      </div>

      <div className="card p-4">
        <div className="font-medium border-b pb-2">Quick Transfer</div>
        <div className="mt-3 flex flex-wrap gap-3 items-end">
          <div>
            <div className="text-xs mb-1">From</div>
            <input className="input" value={currentWhName || ''} disabled />
          </div>
          <div>
            <div className="text-xs mb-1">To</div>
            <select className="input" value={toWh} onChange={(e) => setToWh(e.target.value)}>
              {whs.map((w) => (
                <option key={w.id} value={w.id}>{w.name || w.id}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs mb-1">Qty (kg)</div>
            <input className="input" type="number" value={qty} onChange={(e) => setQty(+e.target.value)} placeholder="0" min={0} />
          </div>
          <button className="btn btn-primary" onClick={doTransfer} disabled={saving || loading}>Transfer</button>
        </div>
      </div>

      <div className="card p-0">
        <div className="p-3 border-b font-medium">Stock Card (Recent)</div>
        <div className="p-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Ref</th>
                <th className="py-2 px-3">WH</th>
                <th className="py-2 px-3 text-right">Qty (kg)</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="py-2 px-3">{m.createdAt?.slice(0, 10)}</td>
                  <td className="py-2 px-3">{m.refType || ''} {m.refId || ''}</td>
                  <td className="py-2 px-3">{m.warehouseId || '—'}</td>
                  <td className="py-2 px-3 text-right">{nf(m.qtyKg)}</td>
                </tr>
              ))}
              {!loading && moves.length === 0 && (
                <tr>
                  <td className="py-6 text-center text-slate-400" colSpan={4}>No moves</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="p-3">
            <Link href="/inventory/stock-card" className="btn btn-ghost">Full Stock Card</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
