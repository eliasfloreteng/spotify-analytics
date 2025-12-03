import SpotifyLogo from "@/components/spotify-logo";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { login } from "@/lib/spotify-actions";

export default function Login() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background">
			<Card className="w-full max-w-md shadow-lg">
				<CardHeader>
					<CardTitle>🎵 Spotfiy Listening Insights</CardTitle>
					<CardDescription>
						Welcome! Sign in with your Spotify account to view your personalized
						listening insights, stats, and music analytics. We'll only access
						your library and playlists. No posting or modifications
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant="outline"
						type="button"
						className="flex w-full items-center justify-center gap-2"
						onClick={login}
					>
						<SpotifyLogo className="h-5 w-5" />
						Login with Spotify
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
