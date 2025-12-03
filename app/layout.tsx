import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import type React from "react";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Spotify Listening Insights",
	description:
		"See all your tracks and albums and get insights into your listening habits over time.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={`dark font-sans antialiased ${montserrat.className}`}>
				{children}
			</body>
		</html>
	);
}
