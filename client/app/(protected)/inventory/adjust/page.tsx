'use client';

import { useEffect, useMemo, useState } from 'react';
import { getLots, type LotDto } from '@/lib/api/sales';
import { adjustStock } from '@/lib/api/inventory';
import { nf } from '@/lib/i18n';
import Link from 'next/link';
import { showError, showSuccess } from '@/lib/swal';

export default function AdjustPage() {
  const [lots, setLots] = useState<LotDto[]>([]);
  const [lotId, setLotId] = useState<string>('');
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [qty, setQty] = useState<number>(0);
  const [reason, setReason] = useState<string>('adjustment');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const rows = await getLots();
        if (!mounted) return;
        setLots(rows);
        setLotId((prev) => prev || rows[0]?.id || '');
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load lots');
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

  const lot = useMemo(() => lots.find((x) => x.id === lotId), [lots, lotId]);

  async function reloadLots() {
    const rows = await getLots();
    setLots(rows);
  }

  async function doAdjust() {
    if (!lot) return void (await showError('Select lot'));
    const q = Math.max(0, +qty || 0);
    if (!q) return void (await showError('Enter qty'));

    setSaving(true);
    setError('');
    try {
      await adjustStock({
        lotId: lot.id,
        mode,
        qtyKg: q,
        reason: reason.trim() || undefined
      });
      await reloadLots();
      setQty(0);
      await showSuccess('Adjustment saved');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save adjustment';
      setError(message);
      await showError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stock Adjustment</h1>
        <Link href="/inventory" className="btn btn-ghost">Back</Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <div className="text-xs mb-1">Lot</div>
            <select className="input" value={lotId} onChange={(e) => setLotId(e.target.value)} disabled={loading}>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label || l.id} — {l.product?.name || l.productType || 'Product'}
                </option>
              ))}
            </select>
            {lot && (
              <div className="text-xs text-slate-500 mt-1">
                Qty: {nf(Number(lot.availableKg || 0))} kg | Avg: ৳{nf(Number(lot.avgCostPerKg || 0))}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs mb-1">Mode</div>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value as 'add' | 'remove')}>
              <option value="add">Add (+)</option>
              <option value="remove">Remove (-)</option>
            </select>
          </div>

          <div>
            <div className="text-xs mb-1">Qty (kg)</div>
            <input className="input" type="number" value={qty} onChange={(e) => setQty(+e.target.value)} placeholder="0" min={0} />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs mb-1">Reason</div>
            <input className="input w-full" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Shrinkage / Gain / Audit" />
          </div>
        </div>

        <div className="mt-4">
          <button className="btn btn-primary" onClick={doAdjust} disabled={saving || loading || !lotId}>
            {saving ? 'Saving...' : 'Save Adjustment'}
          </button>
        </div>
      </div>

      <div className="text-sm text-slate-500">Note: Adjustment changes lot quantity and creates an adjustment move.</div>
    </div>
  );
}
