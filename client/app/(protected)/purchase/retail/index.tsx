import Link from "next/link";

export default function RetailPurchaseMenu() {
  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-2">Retail Purchase</h2>
      <Link href="/purchase/retail/new" className="btn btn-primary">New Retail Draft</Link>
      <Link href="/purchase/retail/drafts" className="btn btn-secondary">View & Finalize Drafts</Link>
    </div>
  );
}
