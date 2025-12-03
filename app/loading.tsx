import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
	return (
		<div className="flex h-screen items-center justify-center">
			<Empty className="w-full max-w-md">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Spinner />
					</EmptyMedia>
					<EmptyTitle>Loading your music library...</EmptyTitle>
					<EmptyDescription>
						Please wait while we load your music library. Do not refresh the
						page. This may take up to five minutes if you have a lot of songs
						and playlists.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		</div>
	);
}
