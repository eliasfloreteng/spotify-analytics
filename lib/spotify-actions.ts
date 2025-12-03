"use server";

import { redirect } from "next/navigation";
import {
	clearSession,
	getSession,
	SPOTIFY_SCOPES,
	type SpotifyTokens,
	setTokens,
} from "./spotify";

async function refreshTokens(
	refreshToken: string,
): Promise<SpotifyTokens | null> {
	const res = await fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${Buffer.from(
				`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
			).toString("base64")}`,
		},
		body: new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
		}),
	});

	if (!res.ok) return null;
	const data = await res.json();

	return {
		access_token: data.access_token,
		refresh_token: data.refresh_token ?? refreshToken,
		expires_at: Date.now() + data.expires_in * 1000,
	};
}

export async function refreshTokensIfNeeded(): Promise<boolean> {
	const session = await getSession();
	const tokens = session.spotify;

	if (!tokens) return false;

	if (tokens.expires_at > Date.now() + 5 * 60 * 1000) {
		return true;
	}

	const refreshed = await refreshTokens(tokens.refresh_token);
	if (!refreshed) {
		await clearSession();
		return false;
	}

	await setTokens(refreshed);
	return true;
}

export async function isAuthenticated(): Promise<boolean> {
	const session = await getSession();
	return !!session.spotify;
}

export async function login() {
	const params = new URLSearchParams({
		client_id: process.env.SPOTIFY_CLIENT_ID,
		response_type: "code",
		redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
		scope: SPOTIFY_SCOPES.join(" "),
	});

	return redirect(`https://accounts.spotify.com/authorize?${params}`);
}

export async function logout() {
	await clearSession();
	redirect("/");
}
