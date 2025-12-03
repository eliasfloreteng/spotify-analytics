import { type AccessToken, SpotifyApi } from "@spotify/web-api-ts-sdk";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SpotifyTokens {
	access_token: string;
	refresh_token: string;
	expires_at: number;
}

export interface SessionData {
	spotify?: SpotifyTokens;
}

const sessionOptions: SessionOptions = {
	password: process.env.SESSION_SECRET,
	cookieName: "spotify-session",
	cookieOptions: {
		secure: process.env.NODE_ENV === "production",
		httpOnly: true,
		sameSite: "lax",
	},
};

export const SPOTIFY_SCOPES = [
	"user-read-email",
	"user-read-private",
	"user-library-read",
	"playlist-read-private",
	"playlist-read-collaborative",
];

// === Session Management ===
export async function getSession() {
	return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function setTokens(tokens: SpotifyTokens) {
	const session = await getSession();
	session.spotify = tokens;
	await session.save();
}

export async function clearSession() {
	const session = await getSession();
	session.destroy();
}

// === Token Management ===
async function getValidTokens(): Promise<SpotifyTokens | null> {
	const session = await getSession();
	const tokens = session.spotify;
	if (!tokens) return null;

	if (tokens.expires_at < Date.now() + 5 * 60 * 1000) {
		return null;
	}

	return tokens;
}

export async function exchangeCode(
	code: string,
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
			grant_type: "authorization_code",
			code,
			redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
		}),
	});

	if (!res.ok) return null;
	const data = await res.json();

	return {
		access_token: data.access_token,
		refresh_token: data.refresh_token,
		expires_at: Date.now() + data.expires_in * 1000,
	};
}

// === Spotify Client ===
export async function getSpotifyClient() {
	const tokens = await getValidTokens();
	if (!tokens) return null;

	const accessToken: AccessToken = {
		access_token: tokens.access_token,
		token_type: "Bearer",
		expires_in: Math.floor((tokens.expires_at - Date.now()) / 1000),
		refresh_token: tokens.refresh_token,
	};

	return SpotifyApi.withAccessToken(process.env.SPOTIFY_CLIENT_ID, accessToken);
}
