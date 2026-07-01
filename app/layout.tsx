import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AntiAdblockGate } from "@/components/anti-adblock-gate"
import { Toaster } from "@/components/ui/toaster"
import { ContentRefreshProvider } from "@/components/content-refresh-provider"
import { Navigation } from "@/components/navigation"
import { Suspense } from "react"
import Script from "next/script"
import "@/lib/disable-debug"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL("https://ag.micorp.pro"),
  title: {
    default: "Agasobanuye Movies - Watch Agasobanuye Films & TV Shows Online",
    template: "%s | Agasobanuye Movies",
  },
  description: "Experience the best of Agasobanuye movies and TV shows. Stream your favorite translated films, action movies, and trending series in HD quality. The ultimate destination for the Agasobanuye community.",
  keywords: [
    "Agasobanuye",
    "Agasobanuye Movies",
    "Agasobanuye TV Shows",
    "Filme Agasobanuye",
    "Agasobanuye Action Movies",
    "Kinyarwanda Translated Movies",
    "Translated Films Rwanda",
    "Watch Movies Online HD",
    "Stream Agasobanuye",
    "Agasobanuye Community",
    "Best Agasobanuye Films",
    "Agasobanuye Series",
    "Trending Agasobanuye",
    "New Agasobanuye 2026",
    "Agasobanuye Cinema",
    "Entertainment Rwanda",
    "Movie Streaming Rwanda",
  ],
  authors: [{ name: "Agasobanuye Movies Team" }],
  creator: "Agasobanuye Movies",
  publisher: "Agasobanuye Movies",
  generator: "Next.js",
  applicationName: "Agasobanuye Movies",
  referrer: "origin-when-cross-origin",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/image.png", sizes: "16x16", type: "image/png" },
      { url: "/image.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/image.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#0071eb" },
    ],
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ag.micorp.pro",
    siteName: "Agasobanuye Movies",
    title: "Agasobanuye Movies - Stream Your Favorite Translated Films Online",
    description: "Join thousands of fans streaming the latest Agasobanuye movies and TV shows. High-quality translated entertainment at your fingertips.",
    images: [
      {
        url: "/image.png",
        width: 1200,
        height: 630,
        alt: "Agasobanuye Movies - The Best Translated Films",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agasobanuye Movies - Best Translated Films & Series",
    description: "Stream the latest Agasobanuye movies and TV shows in HD. Watch translated action, drama, and comedy anytime.",
    images: ["/image.png"],
    creator: "@agmovies",
  },
  verification: {
    google: "your-google-verification-code",
  },
  alternates: {
    canonical: "https://ag.micorp.pro",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0071eb",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#0071eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="#0071eb" />
        <Script id="aclib" strategy="beforeInteractive" src="//acscdn.com/script/aclib.js" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Agasobanuye Movies",
              "url": "https://ag.micorp.pro",
              "description": "Stream the best Agasobanuye movies and TV shows online.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://ag.micorp.pro/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ContentRefreshProvider />
        <Suspense fallback={null}>
          <AntiAdblockGate />
          <Navigation />
        </Suspense>
        <Suspense fallback={null}>
          {children}
          <Toaster />
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
