"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { showSuccess } from "@/lib/swal";
import { apiFetch } from "@/lib/api/fetchWithTimeout";
import { getAuthHeaders, getCurrentUserRole } from "@/lib/auth";

type User = {
	id: string;
	name: string;
	phone: string;
	role: string;
	active: boolean;
	createdAt?: string;
};

const API_BASE =
	process.env.NEXT_PUBLIC_API_BASE_URL || "https://backend.paikarpos.com";

export default function UsersPage() {
	const [rows, setRows] = useState<User[]>([]);
	const [currentRole] = useState<string>(() => getCurrentUserRole());
	const [form, setForm] = useState({
		id: "",
		name: "",
		phone: "",
		password: "",
		confirmPassword: "",
		role: "",
		active: true,
	});

	useEffect(() => {
		loadUsers();
	}, []);

	const isOperator = currentRole === "OPERATOR";

	async function loadUsers() {
		const res = await apiFetch(`${API_BASE}/api/v1/users`, {
			headers: getAuthHeaders(),
		});
		const data = await res.json();
		setRows(data.data || []);
	}

	function resetForm() {
		setForm({
			id: "",
			name: "",
			phone: "",
			password: "",
			confirmPassword: "",
			role: "",
			active: true,
		});
	}

	async function save() {
		if (!form.name || !form.phone) {
			alert("Name and phone number required");
			return;
		}

		if (!form.id && !form.password) {
			alert("Password required");
			return;
		}

		if (form.password !== form.confirmPassword) {
			alert("Passwords do not match");
			return;
		}

		const payload: any = {
			name: form.name,
			phone: form.phone,
			role: "OPERATOR",
			active: form.active,
		};

		if (form.password) {
			payload.password = form.password;
		}

		const url = form.id
			? `${API_BASE}/api/v1/users/${form.id}`
			: `${API_BASE}/api/v1/users`;

		const method = form.id ? "PATCH" : "POST";

		const res = await apiFetch(url, {
			method,
			headers: getAuthHeaders(),
			body: JSON.stringify(payload),
		});

		const data = await res.json();

		if (!res.ok) {
			alert(data.message || "Failed");
			return;
		}

		await showSuccess(data.message || "Saved");
		resetForm();
		loadUsers();
	}

	async function deleteUser(id: string) {
		if (!confirm("Delete this user?")) return;

		const res = await apiFetch(`${API_BASE}/api/v1/users/${id}`, {
			method: "DELETE",
			headers: getAuthHeaders(),
		});

		const data = await res.json();

		if (!res.ok) {
			alert(data.message || "Delete failed");
			return;
		}

		await showSuccess(data.message || "Deleted");
		loadUsers();
	}

	const firstUserId = rows[rows.length - 1]?.id;

	return (
		<div className="flex flex-col gap-6">
			<h1 className="text-2xl font-semibold">{t("menu.users") || "Users"}</h1>

			<div className="card p-4">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div>
						<div className="text-xs mb-1">Name</div>
						<input
							className="input w-full"
							value={form.name}
							onChange={(e) => setForm({ ...form, name: e.target.value })}
						/>
					</div>

					<div>
						<div className="text-xs mb-1">Phone Number</div>
						<input
							type="tel"
							className="input w-full"
							value={form.phone}
							onChange={(e) => setForm({ ...form, phone: e.target.value })}
						/>
					</div>

					{/* <div>
						<div className="text-xs mb-1">Role</div>
						<input
							className="input w-full bg-gray-100"
							value="ADMIN"
							disabled
						/>
					</div> */}

					<div>
						<div className="text-xs mb-1">Password</div>
						<input
							type="password"
							className="input w-full"
							value={form.password}
							onChange={(e) => setForm({ ...form, password: e.target.value })}
						/>
					</div>

					<div>
						<div className="text-xs mb-1">Confirm Password</div>
						<input
							type="password"
							className="input w-full"
							value={form.confirmPassword}
							onChange={(e) =>
								setForm({
									...form,
									confirmPassword: e.target.value,
								})
							}
						/>
					</div>

					<div>
						<div className="text-xs mb-1">Active</div>
						<select
							className="input w-full"
							value={form.active ? "yes" : "no"}
							onChange={(e) =>
								setForm({
									...form,
									active: e.target.value === "yes",
								})
							}
						>
							<option value="yes">Yes</option>
							<option value="no">No</option>
						</select>
					</div>
				</div>

				<div className="mt-3 flex gap-2">
					<button
						className="btn btn-primary"
						onClick={save}
						disabled={isOperator}
					>
						{form.id ? "Update User" : "Create User"}
					</button>

					<button className="btn" onClick={resetForm} disabled={isOperator}>
						Clear
					</button>
				</div>
			</div>

			<div className="card p-0 overflow-x-auto">
				<div className="p-3 border-b font-medium">User List</div>

				<table className="w-full text-sm">
					<thead>
						<tr className="text-left text-slate-500 border-b">
							<th className="py-2 px-3">Name</th>
							<th className="py-2 px-3">Phone Number</th>
							<th className="py-2 px-3">Role</th>
							<th className="py-2 px-3">Active</th>
							<th className="py-2 px-3">Action</th>
						</tr>
					</thead>

					<tbody>
						{rows.map((u) => (
							<tr key={u.id} className="border-t">
								<td className="py-2 px-3">{u.name}</td>
								<td className="py-2 px-3">{u.phone}</td>
								<td className="py-2 px-3">{u.role}</td>
								<td className="py-2 px-3">{u.active ? "Yes" : "No"}</td>

								<td className="py-2 px-3 flex gap-2">
									<button
										className={`link ${isOperator ? "cursor-not-allowed opacity-50" : ""}`}
										disabled={isOperator}
										onClick={() =>
											setForm({
												id: u.id,
												name: u.name,
												phone: u.phone,
												password: "",
												confirmPassword: "",
												role: u.role,
												active: u.active,
											})
										}
									>
										Edit
									</button>

									{u.id !== firstUserId && (
										<button
											className={`text-red-500 ${isOperator ? "cursor-not-allowed opacity-50" : ""}`}
											disabled={isOperator}
											onClick={() => deleteUser(u.id)}
										>
											Delete
										</button>
									)}
								</td>
							</tr>
						))}

						{rows.length === 0 && (
							<tr>
								<td className="py-6 text-center text-slate-400" colSpan={5}>
									No users
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
