import { NextRequest, NextResponse } from "next/server"
import dns from "dns"

// Force Node.js to resolve DNS using IPv4 first.
// This prevents slow IPv6 connection hangs/timeouts common in Node.js (Node 17+).
try {
  dns.setDefaultResultOrder("ipv4first")
} catch (e) {
  console.warn("Could not set DNS result order to ipv4first:", e)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path")
  const size = searchParams.get("size") || "w500"

  if (!path || path === "null" || path === "undefined" || path === "") {
    return servePlaceholder()
  }

  // Ensure path starts with a slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`
  const imageUrl = `https://image.tmdb.org/t/p/${size}${cleanPath}`

  try {
    // Set a timeout of 5 seconds
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`TMDB fetch failed for ${imageUrl}: ${response.status} ${response.statusText}`)
      return servePlaceholder()
    }

    const contentType = response.headers.get("content-type") || "image/jpeg"
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200", // cache for 1 day
      },
    })
  } catch (error) {
    console.error("Error proxying TMDB image, serving placeholder:", error)
    return servePlaceholder()
  }
}

function servePlaceholder() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 750" width="100%" height="100%">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0e1726" />
        <stop offset="100%" stop-color="#030712" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect x="20" y="20" width="460" height="710" rx="16" fill="none" stroke="#0071eb" stroke-opacity="0.1" stroke-width="2"/>
    <g transform="translate(250, 320)" stroke="#0071eb" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
      <rect x="-30" y="-30" width="60" height="60" rx="6" />
      <circle cx="-10" cy="-10" r="6" />
      <path d="M-30 20 L-10 -5 L10 15 L20 5 L30 20" />
    </g>
    <text x="250" y="420" fill="#4b5563" font-family="system-ui, sans-serif" font-size="20" font-weight="700" text-anchor="middle" letter-spacing="1">IMAGE UNAVAILABLE</text>
    <text x="250" y="450" fill="#374151" font-family="system-ui, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Network Connection Issue</text>
  </svg>`

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600", // cache placeholder for 1 hour
    },
  })
}
