"use server"

import { redirect } from "next/navigation"
import { clearSession, getSession, SPOTIFY_SCOPES } from "./spotify"

export async function isAuthenticated(): Promise<boolean> {
	const session = await getSession()
	return !!session.spotify
}

export async function login() {
	const params = new URLSearchParams({
		client_id: process.env.SPOTIFY_CLIENT_ID,
		response_type: "code",
		redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
		scope: SPOTIFY_SCOPES.join(" "),
	})

	return redirect(`https://accounts.spotify.com/authorize?${params}`)
}

export async function logout() {
	await clearSession()
	redirect("/")
}
