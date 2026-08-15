// app/login/page.tsx
// Better frontend error display with field styling

"use client";

import { loginWithApi } from "@/lib/auth";
import { showSuccess } from "@/lib/swal";
import { useState } from "react";

export default function Page() {
	const [phone, setPhone] = useState("");
	const [pwd, setPwd] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();

		if (!phone.trim() || !pwd.trim()) {
			setError("Phone number and password are required");
			return;
		}

		setLoading(true);
		setError("");

		try {
			await loginWithApi(phone.trim(), pwd);
			await showSuccess("Signed in successfully");
			window.location.href = "/dashboard";
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Invalid phone number or password";

			setError(message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-dvh grid place-items-center bg-slate-50 px-4">
			<form onSubmit={onSubmit} className="card w-full max-w-md p-6 shadow-lg">
				<h1 className="text-2xl font-semibold mb-4 text-center">লগইন</h1>

				<label className="block text-sm mb-1">ফোন নম্বর</label>
				<input
					type="tel"
					required
					className={`input mb-3 w-full ${error ? "border-red-500" : ""}`}
					value={phone}
					onChange={(e) => setPhone(e.target.value)}
					autoComplete="tel"
				/>

				<label className="block text-sm mb-1">পাসওয়ার্ড</label>
				<input
					type="password"
					required
					className={`input mb-2 w-full ${error ? "border-red-500" : ""}`}
					value={pwd}
					onChange={(e) => setPwd(e.target.value)}
					autoComplete="current-password"
				/>

				{error && (
					<div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2">
						<p className="text-sm text-red-600 font-medium">{error}</p>
					</div>
				)}

				<button
					type="submit"
					className="btn btn-primary w-full"
					disabled={loading}
				>
					{loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
				</button>

				<p className="text-xs text-slate-500 mt-3 text-center">
					Backend login ব্যবহার হচ্ছে। ব্যাকএন্ড চালু না থাকলে লগইন ব্যর্থ হবে।
				</p>
			</form>
		</div>
	);
}
