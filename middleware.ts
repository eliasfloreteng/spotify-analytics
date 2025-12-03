import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { refreshTokensIfNeeded } from "./lib/spotify-actions";

export async function middleware(request: NextRequest) {
	// Skip middleware for API routes, auth callback, and static files
	const path = request.nextUrl.pathname;
	if (
		path.startsWith("/api/auth/callback") ||
		path.startsWith("/_next") ||
		path === "/icon.svg"
	) {
		return NextResponse.next();
	}

	try {
		const response = NextResponse.next();

		await refreshTokensIfNeeded();

		return response;
	} catch (error) {
		console.error("Middleware error:", error);
		return NextResponse.next();
	}
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		"/((?!_next/static|_next/image|favicon.ico).*)",
	],
};
