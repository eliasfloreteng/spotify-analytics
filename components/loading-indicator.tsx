"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Music2, Disc, Radio } from "lucide-react"

interface LoadingIndicatorProps {
  progress: number
}

export default function LoadingIndicator({ progress }: LoadingIndicatorProps) {
  const icons = [Music2, Disc, Radio]
  const currentIcon = icons[Math.floor((progress / 100) * icons.length)] || Music2
  const Icon = currentIcon

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
                <span className="font-medium">{"Fetching your music library..."}</span>
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
                {progress < 30 && "Loading liked songs..."}
                {progress >= 30 && progress < 60 && "Fetching playlists..."}
                {progress >= 60 && progress < 90 && "Processing tracks..."}
                {progress >= 90 && "Almost there..."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
