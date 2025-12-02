"use server"

import { redirect } from "next/navigation"
import {
	clearSession,
	getSession,
	getSpotifyClient,
	SPOTIFY_SCOPES,
} from "./spotify"

export async function isAuthenticated(): Promise<boolean> {
	const session = await getSession()
	return !!session.spotify
}

export async function getCurrentUser() {
	const spotify = await getSpotifyClient()
	if (!spotify) return null

	try {
		const user = await spotify.currentUser.profile()
		return {
			id: user.id,
			name: user.display_name,
			email: user.email,
			image: user.images?.[0]?.url,
		}
	} catch {
		return null
	}
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
