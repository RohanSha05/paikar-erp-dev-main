'use client';

import { useEffect, useState } from 'react';
import { loadDict, saveDict, type Dictionary } from '@/lib/admin';
import { t } from '@/lib/i18n';

export default function DictionariesPage(){
  const [d, setD] = useState<Dictionary | null>(null);
  const [newItem, setNewItem] = useState<{key: keyof Dictionary; value: string}>({ key:'productTypes', value:'' });

  useEffect(()=>{ setD(loadDict()); },[]);

  function addItem(){
    if(!d) return;
    const v = newItem.value.trim();
    if(!v) return;
    const arr = [...(d[newItem.key] as string[])];
    if(!arr.includes(v)) arr.push(v);
    const nd = { ...d, [newItem.key]: arr } as Dictionary;
    setD(nd); saveDict(nd);
    setNewItem({ key: newItem.key, value:'' });
  }

  function removeItem(k:keyof Dictionary, v:string){
    if(!d) return;
    const arr = (d[k] as string[]).filter(x=>x!==v);
    const nd = { ...d, [k]: arr } as Dictionary;
    setD(nd); saveDict(nd);
  }

  if(!d) return null;

  const sections: Array<{title:string; key: keyof Dictionary; hint?:string}> = [
    { title:'Product Types', key:'productTypes' },
    { title:'Varieties', key:'varieties' },
    { title:'Purchase Types', key:'purchaseTypes' },
    { title:'Warehouses (names)', key:'warehouses', hint:'(Manager পেজে আলাদা বিস্তারিত আছে)' },
    { title:'Units', key:'units' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t('menu.dictionaries') || 'Dictionaries'}</h1>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <div className="text-xs mb-1">Section</div>
            <select className="input" value={newItem.key} onChange={e=>setNewItem({ ...newItem, key: e.target.value as any })}>
              {sections.map(s=><option key={s.key as string} value={s.key as string}>{s.title}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs mb-1">New Value</div>
            <input className="input" value={newItem.value} onChange={e=>setNewItem({...newItem, value:e.target.value})} placeholder="e.g., ধান"/>
          </div>
          <button className="btn btn-primary" onClick={addItem}>{t('common.save') || 'Add'}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map(sec=>{
          const arr = d[sec.key] as string[];
          return (
            <div key={sec.key as string} className="card p-4">
              <div className="font-medium">{sec.title} {sec.hint && <span className="text-xs text-slate-500">{sec.hint}</span>}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {arr.map(v=>(
                  <span key={v} className="inline-flex items-center gap-1 bg-slate-100 rounded px-2 py-1 text-sm">
                    {v}
                    <button className="text-slate-500 hover:text-red-600" onClick={()=>removeItem(sec.key, v)}>×</button>
                  </span>
                ))}
                {!arr?.length && <div className="text-slate-400 text-sm">Empty</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
