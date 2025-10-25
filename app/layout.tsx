import type React from "react"
import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpotifyProvider } from "@/contexts/spotify-context"
import "./globals.css"

const montserrat = Montserrat({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Spotify Analytics",
  description: "Analyze your Spotify library with detailed insights",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${montserrat.className}`}>
        <SpotifyProvider>{children}</SpotifyProvider>
        <Analytics />
      </body>
    </html>
  )
}
