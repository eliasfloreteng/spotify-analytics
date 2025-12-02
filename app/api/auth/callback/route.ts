import { type NextRequest, NextResponse } from "next/server"
import { exchangeCode, setTokens } from "@/lib/spotify"

export async function GET(request: NextRequest) {
	const code = request.nextUrl.searchParams.get("code")
	const error = request.nextUrl.searchParams.get("error")

	if (error || !code) {
		console.error("Authentication failed:", error)
		return NextResponse.redirect(
			new URL("/?error=auth_failed", process.env.SPOTIFY_REDIRECT_URI),
		)
	}

	const tokens = await exchangeCode(code)
	if (!tokens) {
		console.error("Failed to exchange code for tokens")
		return NextResponse.redirect(
			new URL("/?error=token_failed", process.env.SPOTIFY_REDIRECT_URI),
		)
	}

	await setTokens(tokens)
	return NextResponse.redirect(new URL("/", process.env.SPOTIFY_REDIRECT_URI))
}
