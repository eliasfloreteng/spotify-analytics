import { logout } from "@/lib/spotify-actions"
import { Button } from "@/components/ui/button"
import { getSpotifyClient } from "@/lib/spotify"
import { LogOut } from "lucide-react"
import Login from "@/components/login"
// import { fetchSpotifyData } from "@/lib/spotify-fetching"

export default async function HomePage() {
	const spotify = await getSpotifyClient()
	if (!spotify) {
		return <Login />
	}

	// const data = await fetchSpotifyData(spotify)

	return (
		<div>
			<h1 className="text-2xl font-bold">Hello user</h1>
			<Button variant="outline" type="button" onClick={logout}>
				<LogOut className="mr-2 h-4 w-4" />
				Logout
			</Button>
		</div>
	)
}
