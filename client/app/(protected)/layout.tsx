"use client";
import Protected from "@/components/Protected";
import Sidebar from "@/components/Sidebar";
import "../../styles/globals.css";
export default function ProtectedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<Protected>
			<div className="min-h-dvh flex overflow-x-hidden">
				<Sidebar />
				<main className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">{children}</main>
			</div>
			<footer className="footer">JMJ Paikar</footer>
		</Protected>
	);
}
