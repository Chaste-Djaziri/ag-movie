import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path")
  const size = searchParams.get("size") || "w500"

  if (!path) {
    return new NextResponse("Missing path", { status: 400 })
  }

  // Ensure path starts with a slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`
  const imageUrl = `https://image.tmdb.org/t/p/${size}${cleanPath}`

  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      return new NextResponse(`Failed to fetch image from TMDB: ${response.statusText}`, { status: response.status })
    }

    const contentType = response.headers.get("content-type") || "image/jpeg"
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Error proxying TMDB image:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
