'use client';

import { useMemo, useState } from 'react';
import type { ProductDto } from "@/lib/api/products";
import { showError } from "@/lib/swal";

type Props = {
	initial: ProductDto;
	onSubmit: (p: ProductDto) => void;
	submitText?: string;
};

const units: ProductDto["unit"][] = ["bag", "mon", "kg"];

export default function ProductForm({
	initial,
	onSubmit,
	submitText = "Save",
}: Props) {
	const [name, setName] = useState(initial.name || "");
	const [code, setCode] = useState(initial.code || "");
	const [category, setCategory] = useState(initial.category || "");
	const [unit, setUnit] = useState<ProductDto["unit"]>(initial.unit || "bag");
	const [active, setActive] = useState<boolean>(initial.active ?? true);
	const [codeManual, setCodeManual] = useState(!!initial.code); // track if user manually edited

	const errors = useMemo(() => {
		const e: string[] = [];
		if (!name.trim()) e.push("Name required");
		if (!code.trim()) e.push("Code required");
		return e;
	}, [name, code]);

	async function submit() {
		if (errors.length) {
			await showError(errors.join("\n"));
			return;
		}
		onSubmit({
			...initial,
			name: name.trim(),
			code: code.trim(),
			category: category.trim() || undefined,
			unit,
			active,
		});
	}

	const CATEGORIES = [
		{ value: "ধান", label: "ধান" },
		{ value: "চাল", label: "চাল" },
		{ value: "গম", label: "গম" },
		{ value: "ভুট্টা", label: "ভুট্টা" },
		{ value: "সরিষা", label: "সরিষা" },
		{ value: "অন্যান্য", label: "অন্যান্য" },
	];

	function generateCode(name: string, category: string): string {
		const catMap: Record<string, string> = {
			ধান: "DH",
			চাল: "CH",
			গম: "GM",
			ভুট্টা: "BH",
			সরিষা: "SR",
		};
		const catCode =
			catMap[category] || category.slice(0, 2).toUpperCase() || "XX";
		// take first 2-3 chars of name, strip spaces
		const nameCode = name.trim().replace(/\s+/g, "").slice(0, 3).toUpperCase();
		return nameCode ? `${catCode}-${nameCode}` : catCode;
	}

	function handleNameChange(v: string) {
		setName(v);
		if (!codeManual) setCode(generateCode(v, category));
	}

	function handleCategoryChange(v: string) {
		setCategory(v);
		if (!codeManual) setCode(generateCode(name, v));
	}

	function handleCodeChange(v: string) {
		setCode(v);
		setCodeManual(true); // user took over
	}

	return (
		<div className="card p-4 flex flex-col gap-4">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="md:col-span-2">
					<label className="block text-sm mb-1">Product Name</label>
					<input
						className="input"
						value={name}
						// onChange={(e) => setName(e.target.value)}
						onChange={(e) => handleNameChange(e.target.value)}
						placeholder="যেমন: ২৮ ধান"
					/>
				</div>

				<div>
					<label className="block text-sm mb-1">
						Code
						{codeManual && (
							<button
								className="ml-2 text-xs text-slate-400 hover:text-brand"
								onClick={() => {
									setCodeManual(false);
									setCode(generateCode(name, category));
								}}
							>
								↺ auto
							</button>
						)}
					</label>
					<input
						className="input"
						value={code}
						onChange={(e) => handleCodeChange(e.target.value)}
						placeholder="যেমন: DH-28D"
					/>
				</div>

				<div>
					<label className="block text-sm mb-1">Category</label>
					<input
						className="input"
						list="category-list"
						value={category}
						onChange={(e) => handleCategoryChange(e.target.value)}
						placeholder="ধান / চাল / গম..."
					/>
					<datalist id="category-list">
						{CATEGORIES.map((c) => (
							<option key={c.value} value={c.value}>
								{c.label}
							</option>
						))}
					</datalist>
				</div>

				<div>
					<label className="block text-sm mb-1">Unit</label>
					<select
						className="input"
						value={unit}
						onChange={(e) => setUnit(e.target.value as ProductDto["unit"])}
					>
						{units.map((u) => (
							<option key={u} value={u}>
								{u}
							</option>
						))}
					</select>
				</div>

				<div className="flex items-center gap-2 mt-6">
					<input
						id="active"
						type="checkbox"
						className="h-4 w-4"
						checked={active}
						onChange={(e) => setActive(e.target.checked)}
					/>
					<label htmlFor="active" className="text-sm">
						Active
					</label>
				</div>
			</div>

			<div className="flex items-center justify-end gap-2">
				<button className="btn btn-primary" onClick={submit}>
					{submitText}
				</button>
			</div>
		</div>
	);
}
