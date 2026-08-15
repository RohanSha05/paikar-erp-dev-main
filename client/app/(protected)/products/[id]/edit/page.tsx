'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import {
	getProducts,
	updateProduct,
	type ProductDto,
} from "@/lib/api/products";
import { showError } from "@/lib/swal";

export default function EditProductPage() {
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const id = params.id;
	const [p, setP] = useState<ProductDto | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let mounted = true;

		async function load() {
			setLoading(true);
			setError("");
			try {
				const all = await getProducts();
				const found = all.find((x) => x.id === id) || null;
				if (mounted) setP(found);
			} catch (err: unknown) {
				if (mounted) {
					setError(
						err instanceof Error ? err.message : "Failed to load product",
					);
				}
			} finally {
				if (mounted) setLoading(false);
			}
		}

		void load();
		return () => {
			mounted = false;
		};
	}, [id]);

	if (loading) {
		return (
			<div className="p-6">
				<h2 className="text-xl font-semibold">Loading product...</h2>
			</div>
		);
	}

	if (!p) {
		return (
			<div className="p-6">
				<h2 className="text-xl font-semibold">Product not found</h2>
				{error && <p className="text-sm text-red-600 mt-2">{error}</p>}
				<p className="text-sm text-slate-500">ID: {id}</p>
				<button
					className="btn btn-ghost mt-3"
					onClick={() => router.push("/products")}
				>
					Back
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Edit Product</h1>
					<p className="text-sm text-slate-500">
						{p.name} • {p.id}
					</p>
				</div>
				<button
					className="btn btn-ghost"
					onClick={() => router.push("/products")}
				>
					Back
				</button>
			</div>

			<ProductForm
				initial={p}
				submitText="Update"
				onSubmit={async (next) => {
					try {
						await updateProduct(id, {
							name: next.name,
							category: next.category,
							unit: next.unit,
							active: next.active,
						});
						router.push("/products");
					} catch (err: unknown) {
						await showError(
							err instanceof Error ? err.message : "Failed to update product",
						);
					}
				}}
			/>
		</div>
	);
}
