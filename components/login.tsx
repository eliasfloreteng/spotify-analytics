import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card"
import SpotifyLogo from "@/components/spotify-logo"
import { login } from "@/lib/spotify-actions"

export default function Login() {
	return (
		<div className="flex flex-col min-h-screen items-center justify-center bg-background">
			<Card className="w-full max-w-md shadow-lg">
				<CardHeader>
					<CardTitle>🎵 Spotfiy Listening Insights</CardTitle>
					<CardDescription>
						Welcome! Sign in with your Spotify account to view your personalized
						listening insights, stats, and music analytics.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant="outline"
						type="button"
						className="w-full flex items-center justify-center gap-2"
						onClick={login}
					>
						<SpotifyLogo className="h-5 w-5" />
						Login with Spotify
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
