import type React from "react"
import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import "./globals.css"
import Providers from "@/components/providers"

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
      <body className={`dark font-sans antialiased ${montserrat.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
