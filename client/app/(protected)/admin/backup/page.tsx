'use client';

import { exportAll, importAll } from '@/lib/admin';
import { t } from '@/lib/i18n';
import { showError, showSuccess } from "@/lib/swal";

export default function BackupPage() {
	function doExport() {
		const data = exportAll();
		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `grain-backup-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}
	async function doImport(e: React.ChangeEvent<HTMLInputElement>) {
		const f = e.target.files?.[0];
		if (!f) return;
		const txt = await f.text();
		try {
			const json = JSON.parse(txt);
			importAll(json);
			await showSuccess("Import done (please reload)");
			window.location.reload();
		} catch (e) {
			await showError("Invalid JSON");
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<h1 className="text-2xl font-semibold">
				{t("menu.admin") || "Admin"} — Backup
			</h1>

			<div className="card p-4">
				<div className="flex flex-wrap gap-3 items-center">
					<button className="btn btn-primary" onClick={doExport}>
						Export JSON
					</button>
					<label className="btn btn-ghost cursor-pointer">
						Import JSON
						<input
							type="file"
							className="hidden"
							accept="application/json"
							onChange={doImport}
						/>
					</label>
					<div className="text-sm text-slate-500">
						Export সব master+operational local data (mock) সংরক্ষণ করবে। Import
						করলে অ্যাপ reload দিন।
					</div>
				</div>
			</div>
		</div>
	);
}
