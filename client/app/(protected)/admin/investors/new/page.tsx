'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createInvestor } from "@/lib/api/investors";
import { showError, showSuccess } from "@/lib/swal";

export default function NewInvestorPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [address, setAddress] = useState("");
	const [profitSharePct, setProfitSharePct] = useState("20");
	const [nidNo, setNidNo] = useState("");
	const [nomineeName, setNomineeName] = useState("");
	const [startDate, setStartDate] = useState(
		new Date().toISOString().slice(0, 10),
	);
	const [photoUrl, setPhotoUrl] = useState("");
	const [notes, setNotes] = useState("");

	async function onSave() {
		if (!name.trim()) {
			await showError("ইনভেস্টরের নাম দিন");
			return;
		}
		try {
			await createInvestor({
				name: name.trim(),
				phone: phone.trim() || undefined,
				address: address.trim() || undefined,
				nidNo: nidNo.trim() || undefined,
				nomineeName: nomineeName.trim() || undefined,
				startDate: startDate || undefined,
				photoUrl: photoUrl.trim() || undefined,
				agreementPct: Number(profitSharePct || 0),
				profitSharePct: Number(profitSharePct || 0),
				notes: notes.trim() || undefined,
				active: true,
			});
			await showSuccess("নতুন ইনভেস্টর সেভ হয়েছে");
			router.push("/admin/investors");
		} catch (error) {
			await showError(
				error instanceof Error ? error.message : "Failed to save investor",
			);
		}
	}

	return (
		<div className="flex flex-col gap-4 max-w-3xl">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">নতুন ইনভেস্টর</h2>
			</div>

			<section className="card grid grid-cols-1 md:grid-cols-2 gap-4">
				<Input label="নাম *" value={name} onChange={setName} />
				<Input label="মোবাইল" value={phone} onChange={setPhone} />
				<Input label="NID" value={nidNo} onChange={setNidNo} />
				<Input label="এড্রেস" value={address} onChange={setAddress} />
				<Input
					label="নমিনি নাম"
					value={nomineeName}
					onChange={setNomineeName}
				/>
				<Input
					label="প্রফিট শেয়ার (%)"
					value={profitSharePct}
					onChange={setProfitSharePct}
				/>
				<div>
					<label className="block text-sm mb-1">চুক্তির শুরু</label>
					<input
						type="date"
						className="input"
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
					/>
				</div>
				<Input label="Photo URL" value={photoUrl} onChange={setPhotoUrl} />
				<div className="md:col-span-2">
					<label className="block text-sm mb-1">নোট</label>
					<textarea
						className="input min-h-[80px]"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
					/>
				</div>
			</section>

			<div className="flex gap-2">
				<button className="btn btn-ghost" onClick={() => router.back()}>
					Cancel
				</button>
				<button className="btn btn-primary" onClick={onSave}>
					Save Investor
				</button>
			</div>
		</div>
	);
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
