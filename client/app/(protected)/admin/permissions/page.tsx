'use client';

import { useEffect, useState } from 'react';
import { loadRoles, saveRole, type Role, type Permission } from '@/lib/admin';
import { t } from '@/lib/i18n';

const ALL_PERMS: Permission[] = [
  'purchase.create','purchase.approve','purchase.view',
  'sales.create','sales.confirm','sales.view',
  'inventory.view','inventory.adjust','inventory.transfer',
  'cashbook.view','cashbook.post',
  'ledger.view','reports.view',
  'admin.settings','admin.users','admin.dict','admin.cost','admin.permissions','admin.backup'
];

export default function PermissionsPage(){
  const [roles, setRoles] = useState<Role[]>([]);
  const [sel, setSel] = useState<string>('');

  useEffect(()=>{
    const r = loadRoles();
    setRoles(r);
    setSel(r[0]?.id || '');
  },[]);

  const role = roles.find(r=>r.id===sel);

  function toggle(p:Permission){
    if(!role) return;
    const has = role.permissions.includes(p);
    const next = has ? role.permissions.filter(x=>x!==p) : [...role.permissions, p];
    const updated: Role = { ...role, permissions: next };
    saveRole(updated);
    setRoles(loadRoles());
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t('menu.permissions') || 'Permissions'}</h1>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <div className="text-xs mb-1">Role</div>
            <select className="input" value={sel} onChange={e=>setSel(e.target.value)}>
              {roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>

        {role && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {ALL_PERMS.map(p=>(
              <label key={p} className="flex items-center gap-2 p-2 rounded border">
                <input type="checkbox" checked={role.permissions.includes(p)} onChange={()=>toggle(p)}/>
                <span className="text-sm">{p}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
