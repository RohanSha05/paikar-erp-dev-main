'use client';

import { useEffect, useMemo, useState } from 'react';
import { getLots, type LotDto } from '@/lib/api/sales';
import { getWarehouses, type WarehouseDto } from '@/lib/api/warehouses';
import { transferStock } from '@/lib/api/inventory';
import { nf } from '@/lib/i18n';
import Link from 'next/link';
import { showError, showSuccess } from '@/lib/swal';

type TransferForm = {
  fromWarehouseId: string;
  lotId: string;
  qtyKg: string;
  toWarehouseId: string;
  memo: string;
};

type MoveLite = {
  id: string;
  createdAt?: string;
  refType?: string;
  refId?: string;
  lotId: string;
  lotLabel?: string;
  qtyKg: number;
};

export default function StockTransferPage() {
  const [allLots, setAllLots] = useState<LotDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<TransferForm>({
    fromWarehouseId: '',
    lotId: '',
    qtyKg: '',
    toWarehouseId: '',
    memo: ''
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [lots, whs] = await Promise.all([getLots(), getWarehouses()]);
        if (!mounted) return;

        const firstWh = whs[0]?.id || '';
        const firstLot = lots.find((l) => (l.warehouseId || l.warehouse?.id || '') === firstWh)?.id || lots[0]?.id || '';

        setAllLots(lots);
        setWarehouses(whs);
        setForm({
          fromWarehouseId: firstWh,
          lotId: firstLot,
          qtyKg: '',
          toWarehouseId: whs[1]?.id || whs[0]?.id || '',
          memo: ''
        });
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load transfer data');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  async function reloadLots() {
    const lots = await getLots();
    setAllLots(lots);
  }

  const lotsInFromWh = useMemo(
    () => allLots.filter((l) => (l.warehouseId || l.warehouse?.id || '') === form.fromWarehouseId),
    [allLots, form.fromWarehouseId]
  );

  const selectedLot = useMemo(
    () => lotsInFromWh.find((l) => l.id === form.lotId) || lotsInFromWh[0],
    [lotsInFromWh, form.lotId]
  );

  const maxKg = Number(selectedLot?.availableKg || 0);

  const recentTransfers = useMemo(() => {
    const moves: MoveLite[] = allLots.flatMap((lot) =>
			(lot.stockMoves || [])
				.filter((m) => m.refType === "TRF" || m.refType === "TRANSFER")
				.map((m, idx) => ({
					id: m.id || `${lot.id}-${m.createdAt || "NA"}-${idx + 1}`,
					createdAt: m.createdAt,
					refType: m.refType,
					refId: m.refId,
					lotId: lot.id,
					lotLabel: lot.label || lot.id,
					qtyKg: Number(m.qtyKg || 0),
				})),
		);

    return moves
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 10);
  }, [allLots]);

  function update<K extends keyof TransferForm>(key: K, value: TransferForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit() {
    try {
      if (!form.fromWarehouseId) return void (await showError('Source warehouse নির্বাচন করুন'));
      if (!form.toWarehouseId) return void (await showError('Destination warehouse নির্বাচন করুন'));
      if (form.fromWarehouseId === form.toWarehouseId) return void (await showError('Source ও Destination আলাদা হতে হবে'));
      if (!selectedLot) return void (await showError('Lot নির্বাচন করুন'));

      const qty = Number(form.qtyKg || 0);
      if (!(qty > 0)) return void (await showError('Qty (kg) দিতে হবে'));
      if (qty > maxKg) return void (await showError(`আপনি ${nf(maxKg)} kg এর বেশি ট্রান্সফার করতে পারবেন না`));

      setSubmitting(true);
      setError('');

      await transferStock({
        lotId: selectedLot.id,
        toWarehouseId: form.toWarehouseId,
        qtyKg: qty,
        memo: form.memo?.trim() || 'Stock transfer'
      });

      await reloadLots();
      await showSuccess('Stock transfer সফল হয়েছে');

      setForm((prev) => ({
        ...prev,
        qtyKg: '',
        memo: ''
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transfer করতে সমস্যা হয়েছে';
      setError(message);
      await showError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stock Transfer (Warehouse ↔ Warehouse)</h1>
          <p className="text-sm text-slate-500">একই পণ্যের stock এক warehouse থেকে অন্য warehouse এ সরানোর জন্য এই ফর্ম ব্যবহার করুন।</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory" className="btn btn-ghost">Inventory</Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-4">
          <h2 className="text-lg font-semibold mb-3">New Transfer</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">From Warehouse</label>
              <select className="input" value={form.fromWarehouseId} onChange={(e) => update('fromWarehouseId', e.target.value)}>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name || w.id}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">যেখান থেকে stock কমবে</p>
            </div>

            <div>
              <label className="block text-sm mb-1">To Warehouse</label>
              <select className="input" value={form.toWarehouseId} onChange={(e) => update('toWarehouseId', e.target.value)}>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name || w.id}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">যেখানে stock বাড়বে</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Lot নির্বাচন করুন</label>
              <select className="input" value={selectedLot?.id || ''} onChange={(e) => update('lotId', e.target.value)}>
                {lotsInFromWh.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label || l.id} - {l.product?.name || l.productType || 'Product'} - {nf(Number(l.availableKg || 0))} kg
                  </option>
                ))}
              </select>
              {lotsInFromWh.length === 0 && <p className="text-xs text-red-500 mt-1">এই warehouse-এ কোনো stock নেই।</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">Qty (kg) to transfer</label>
              <input
                type="number"
                className="input"
                value={form.qtyKg}
                onChange={(e) => update('qtyKg', e.target.value)}
                placeholder={maxKg ? `Max: ${nf(maxKg)}` : 'যেমন: 1200'}
              />
              <p className="text-[11px] text-slate-500 mt-1">Available: {nf(maxKg)} kg</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Memo / Reason (optional)</label>
              <input className="input" value={form.memo} onChange={(e) => update('memo', e.target.value)} placeholder="যেমন: Direct mill থেকে warehouse এ আনলাম" />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button className="btn btn-primary" onClick={onSubmit} disabled={submitting || loading || lotsInFromWh.length === 0}>
              {submitting ? 'Transferring...' : 'Transfer & Post'}
            </button>
          </div>
        </div>

        <aside className="card p-4 h-max sticky top-6">
          <h3 className="text-lg font-semibold mb-3">Summary</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span>From</span><b>{warehouses.find((w) => w.id === form.fromWarehouseId)?.name || '-'}</b></div>
            <div className="flex justify-between"><span>To</span><b>{warehouses.find((w) => w.id === form.toWarehouseId)?.name || '-'}</b></div>
            <div className="flex justify-between"><span>Lot</span><b>{selectedLot?.label || '-'}</b></div>
            <div className="flex justify-between"><span>Product</span><b>{selectedLot?.product?.name || selectedLot?.productType || '—'}</b></div>
            <div className="flex justify-between"><span>Qty (kg)</span><b>{form.qtyKg ? nf(Number(form.qtyKg)) : '0'}</b></div>
            <div className="flex justify-between"><span>Available (kg)</span><b>{nf(maxKg)}</b></div>
          </div>
        </aside>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Recent Transfers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 px-2">Date</th>
                <th className="py-2 px-2">Ref</th>
                <th className="py-2 px-2">Lot</th>
                <th className="py-2 px-2 text-right">Qty (kg)</th>
              </tr>
            </thead>
            <tbody>
              {recentTransfers.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="py-1 px-2">{m.createdAt ? m.createdAt.slice(0, 10) : ''}</td>
                  <td className="py-1 px-2">{m.refId || m.refType || ''}</td>
                  <td className="py-1 px-2">{m.lotLabel || m.lotId || ''}</td>
                  <td className="py-1 px-2 text-right">{nf(m.qtyKg || 0)}</td>
                </tr>
              ))}
              {!loading && recentTransfers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">এখনো কোনো transfer করা হয়নি</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
