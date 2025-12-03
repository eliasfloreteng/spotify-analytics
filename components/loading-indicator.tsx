"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Music2, Disc, Radio, Sparkles } from "lucide-react"

interface FetchProgress {
  phase: string
  message: string
}

interface LoadingIndicatorProps {
  progress: number
  loadingProgress?: FetchProgress
}

export default function LoadingIndicator({
  progress,
  loadingProgress,
}: LoadingIndicatorProps) {
  const getPhaseInfo = () => {
    if (!loadingProgress) {
      return { icon: Music2, message: "Initializing..." }
    }

    switch (loadingProgress.phase) {
      case "user":
        return { icon: Music2, message: "Fetching user profile..." }
      case "liked-songs":
        return { icon: Music2, message: loadingProgress.message }
      case "playlists":
        return { icon: Disc, message: loadingProgress.message }
      case "playlist-tracks":
        return { icon: Radio, message: loadingProgress.message }
      case "deduplication":
        return { icon: Sparkles, message: loadingProgress.message }
      case "complete":
        return { icon: Sparkles, message: "Complete!" }
      default:
        return { icon: Music2, message: "Loading..." }
    }
  }

  const { icon: Icon, message } = getPhaseInfo()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <Icon className="h-16 w-16 animate-pulse text-primary" />
                <div className="absolute inset-0 animate-ping opacity-20">
                  <Icon className="h-16 w-16 text-primary" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {loadingProgress?.phase === "complete"
                    ? "All done!"
                    : "Loading your music library..."}
                </span>
                <span className="text-muted-foreground">{`${Math.round(progress)}%`}</span>
              </div>

              <div className="relative h-3 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                {message}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
