'use client';

import { useRouter } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import { createProduct, type ProductDto } from "@/lib/api/products";
import { showError } from "@/lib/swal";

export default function NewProductPage() {
	const router = useRouter();
	const now = new Date().toISOString();

	const initial: ProductDto = {
		id: "new",
		name: "",
		code: "",
		category: "",
		unit: "bag" as const,
		active: true,
		createdAt: now,
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-semibold">New Product</h1>
					<p className="text-sm text-slate-500">
						Create a product for Purchase/Sales dropdown
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
				initial={initial}
				submitText="Create"
				onSubmit={async (p) => {
					try {
						await createProduct({
							name: p.name,
							code: p.code,
							category: p.category,
							unit: p.unit,
							active: p.active,
						});
						router.push("/products");
					} catch (err: unknown) {
						await showError(
							err instanceof Error ? err.message : "Failed to create product",
						);
					}
				}}
			/>
		</div>
	);
}
