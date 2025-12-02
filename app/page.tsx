import { logout } from "@/lib/spotify-actions"
import { Button } from "@/components/ui/button"
import { getSpotifyClient } from "@/lib/spotify"
import { LogOut } from "lucide-react"
import Login from "@/components/login"

export default async function Page() {
	const spotify = await getSpotifyClient()
	if (!spotify) {
		return <Login />
	}

	const user = await spotify.currentUser.profile()

	return (
		<div>
			<h1 className="text-2xl font-bold">Hello {user.display_name}</h1>
			<Button variant="outline" type="button" onClick={logout}>
				<LogOut className="mr-2 h-4 w-4" />
				Logout
			</Button>
		</div>
	)
}
