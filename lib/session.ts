import type { SessionOptions } from "iron-session";

export interface SpotifyTokens {
	access_token: string;
	refresh_token: string;
	expires_at: number;
}

export interface SessionData {
	spotify?: SpotifyTokens;
}

if (!process.env.SESSION_SECRET) {
	throw new Error("SESSION_SECRET is not set");
}

export const sessionOptions: SessionOptions = {
	password: process.env.SESSION_SECRET,
	cookieName: "spotify-session",
	cookieOptions: {
		secure: process.env.NODE_ENV === "production",
		httpOnly: true,
		sameSite: "lax",
	},
};
