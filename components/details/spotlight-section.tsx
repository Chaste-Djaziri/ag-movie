"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { getTMDBImageUrl } from "@/lib/tmdb"
import type { Movie, TVShow } from "@/lib/types"
import { getShareCaption, getShareFileName, getShareImageUrl, getSharePromoLines, getShareTitle, getShareUrl } from "@/lib/share-content"
import { Play, ThumbsUp, Plus, Eye, Download, Share2 } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { WatchlistButton } from "@/components/watchlist-button"

interface SpotlightSectionProps {
  item: Movie | TVShow
  mediaType: "movie" | "tv"
  isLoading?: boolean
  onWatchClick?: () => void
  onTrailerClick?: () => void
  showDownloads?: boolean
}

// Extract YouTube key from trailer URL
function pickYouTubeKey(item: Movie | TVShow | null): string | null {
  if (!item?.trailer_url) return null
  const url = item.trailer_url
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
  return match ? match[1] : null
}

// Format release date
function formatReleaseDate(date?: string): string {
  if (!date) return ""
  const d = new Date(date)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// Check if device is mobile
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    image.src = src
  })
}

async function fetchShareImageBlob(imageUrl: string, fallbackUrl: string) {
  const primaryResponse = await fetch(imageUrl, { cache: "force-cache" }).catch(() => null)
  if (primaryResponse?.ok) {
    return primaryResponse.blob()
  }

  const fallbackResponse = await fetch(fallbackUrl, { cache: "force-cache" })
  if (!fallbackResponse.ok) {
    throw new Error("Failed to fetch both share image and fallback image.")
  }

  return fallbackResponse.blob()
}

function createObjectUrlImage(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob)

  return loadImage(objectUrl).then(
    (image) => ({ image, objectUrl }),
    (error) => {
      URL.revokeObjectURL(objectUrl)
      throw error
    },
  )
}

function clipRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()

  if (typeof context.roundRect === "function") {
    context.roundRect(x, y, width, height, radius)
    context.clip()
    return
  }

  const r = Math.min(radius, width / 2, height / 2)
  context.moveTo(x + r, y)
  context.lineTo(x + width - r, y)
  context.quadraticCurveTo(x + width, y, x + width, y + r)
  context.lineTo(x + width, y + height - r)
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  context.lineTo(x + r, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - r)
  context.lineTo(x, y + r)
  context.quadraticCurveTo(x, y, x + r, y)
  context.closePath()
  context.clip()
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(" ")
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word
    const width = context.measureText(candidate).width

    if (width <= maxWidth) {
      currentLine = candidate
      continue
    }

    if (currentLine) {
      lines.push(currentLine)
    }
    currentLine = word

    if (lines.length === maxLines - 1) {
      break
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine)
  }

  const visibleLines = lines.slice(0, maxLines).map((line, index, array) => {
    if (index !== array.length - 1) return line
    if (context.measureText(line).width <= maxWidth) return line

    let trimmed = line
    while (trimmed.length > 0 && context.measureText(`${trimmed}...`).width > maxWidth) {
      trimmed = trimmed.slice(0, -1).trimEnd()
    }
    return `${trimmed}...`
  })

  visibleLines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight)
  })

  return visibleLines.length
}

async function createSharePromoImage(
  imageUrl: string,
  item: Movie | TVShow,
  mediaType: "movie" | "tv",
  fallbackUrl: string,
) {
  const canvas = document.createElement("canvas")
  canvas.width = 1080
  canvas.height = 1350
  const context = canvas.getContext("2d")

  if (!context) {
    throw new Error("Canvas is unavailable for share image generation.")
  }

  const sourceBlob = await fetchShareImageBlob(imageUrl, fallbackUrl)
  const { image: sourceImage, objectUrl } = await createObjectUrlImage(sourceBlob)
  const { eyebrow, title, tagline, teaser, linkLabel, brand } = getSharePromoLines(item, mediaType)

  try {
    context.fillStyle = "#090a0a"
    context.fillRect(0, 0, canvas.width, canvas.height)

    const imageAreaWidth = 860
    const imageAreaHeight = 860
    const imageX = (canvas.width - imageAreaWidth) / 2
    const imageY = 78
    const scale = Math.max(imageAreaWidth / sourceImage.width, imageAreaHeight / sourceImage.height)
    const drawWidth = sourceImage.width * scale
    const drawHeight = sourceImage.height * scale
    const drawX = imageX + (imageAreaWidth - drawWidth) / 2
    const drawY = imageY + (imageAreaHeight - drawHeight) / 2

    context.save()
    clipRoundedRect(context, imageX, imageY, imageAreaWidth, imageAreaHeight, 32)
    context.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight)

    const overlay = context.createLinearGradient(0, imageY + 420, 0, imageY + imageAreaHeight)
    overlay.addColorStop(0, "rgba(9, 10, 10, 0)")
    overlay.addColorStop(1, "rgba(9, 10, 10, 0.88)")
    context.fillStyle = overlay
    context.fillRect(imageX, imageY, imageAreaWidth, imageAreaHeight)
    context.restore()

    context.fillStyle = "rgba(255,255,255,0.92)"
    context.font = "700 30px Arial, sans-serif"
    context.fillText(eyebrow, 110, 1000)

    context.fillStyle = "#ffffff"
    context.font = "700 76px Arial, sans-serif"
    const titleLines = drawWrappedText(context, title, 110, 1070, 860, 86, 3)

    context.fillStyle = "rgba(255,255,255,0.86)"
    context.font = "600 34px Arial, sans-serif"
    const taglineY = 1070 + titleLines * 86 + 16
    const taglineLines = drawWrappedText(context, tagline, 110, taglineY, 860, 44, 3)

    if (teaser) {
      context.fillStyle = "rgba(255,255,255,0.72)"
      context.font = "400 28px Arial, sans-serif"
      drawWrappedText(context, teaser, 110, taglineY + taglineLines * 44 + 24, 860, 38, 2)
    }

    context.fillStyle = "#ffffff"
    context.fillRect(110, 1240, 860, 2)
    context.font = "700 30px Arial, sans-serif"
    context.fillText(brand, 110, 1292)
    context.textAlign = "right"
    context.fillText(linkLabel, 970, 1292)
    context.textAlign = "left"

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    })

    if (!blob) {
      throw new Error("Failed to generate share image.")
    }

    return blob
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function SpotlightSection({
  item,
  mediaType,
  isLoading,
  onWatchClick,
  onTrailerClick,
  showDownloads = false,
}: SpotlightSectionProps) {
  const [watched, setWatched] = useState(false)
  const [liked, setLiked] = useState(false)
  const [heroImgLoaded, setHeroImgLoaded] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [inView, setInView] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [isWatching, setIsWatching] = useState(false)

  const heroRef = useRef<HTMLElement>(null)
  const desktopVideoRef = useRef<HTMLIFrameElement>(null)
  const startTimerRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const ytKey = item ? pickYouTubeKey(item) : null
  const title = getShareTitle(item, mediaType)
  const backdropPath = item?.backdrop_path
  const backgroundImage = backdropPath ? getTMDBImageUrl(backdropPath, "original") : ""
  const releaseDate = mediaType === "movie" ? (item as Movie).release_date : (item as TVShow).first_air_date
  const runtime = mediaType === "movie" ? (item as Movie).runtime : undefined

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileDevice())
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Intersection observer for hero visibility
  useEffect(() => {
    if (!heroRef.current) return
    const io = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting
        setInView(isIntersecting)

        if (ytKey && showVideo) {
          if (!isIntersecting) {
            setShowVideo(false)
          }
        }
      },
      {
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0],
      }
    )
    io.observe(heroRef.current)
    return () => io.disconnect()
  }, [ytKey, showVideo])

  // Scroll listener to stop video when out of view
  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current || !ytKey || !showVideo) return

      const heroRect = heroRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const isCompletelyOutOfView = heroRect.top >= windowHeight || heroRect.bottom <= 0

      if (isCompletelyOutOfView) {
        setShowVideo(false)
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [ytKey, showVideo])

  // Stop video when hero goes out of view
  useEffect(() => {
    if (!inView && showVideo) {
      setShowVideo(false)
    }
  }, [inView, showVideo])

  // Update iframe src when mute state changes (Desktop only)
  useEffect(() => {
    if (ytKey && showVideo && !isMobile && desktopVideoRef.current) {
      const muteValue = isMuted ? 1 : 0
      const newSrc = `https://www.youtube.com/embed/${ytKey}?autoplay=1&loop=1&playlist=${ytKey}&mute=${muteValue}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&fs=0&cc_load_policy=0&start=0`

      if (desktopVideoRef.current.src !== newSrc) {
        desktopVideoRef.current.src = newSrc
      }
    }
  }, [isMuted, ytKey, showVideo, isMobile])

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted)
  }, [isMuted])

  const handleLikeClick = useCallback(() => {
    if (!item?.id) return
    setLiked(!liked)
    // TODO: Implement like functionality
  }, [item, liked])

  const handleWatchedClick = useCallback(() => {
    if (!item?.id) return
    setWatched(!watched)
    // TODO: Implement watched functionality
  }, [item, watched])

  const handleDownloadClick = () => {
    const newParams = new URLSearchParams(searchParams.toString())
    if (showDownloads) {
      newParams.delete("dl")
    } else {
      newParams.set("dl", "1")
    }
    router.push(`?${newParams.toString()}`)
  }

  const handleShareClick = useCallback(async () => {
    if (typeof window === "undefined" || isSharing) return

    const shareUrl = getShareUrl(item, mediaType)
    const shareTitle = title
    const shareText = getShareCaption(item, mediaType)
    const shareClipboardText = `${shareText}\n\n${shareUrl}`

    const shareTextAndLink = async () => {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        })
        return "shared"
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareClipboardText)
        toast({
          title: "Caption copied",
          description: "Your caption and link are copied. You can paste them into Instagram, TikTok, or anywhere else.",
        })
        return "copied"
      }

      throw new Error("Sharing is not available on this device.")
    }

    setIsSharing(true)

    try {
      const origin = window.location.origin
      const imageUrl = getShareImageUrl(item, origin)
      const fallbackUrl = `${origin}/placeholder.jpg`
      let blob: Blob

      try {
        blob = await createSharePromoImage(imageUrl, item, mediaType, fallbackUrl)
      } catch (promoError) {
        console.warn("Failed to generate branded share image, falling back to raw artwork:", promoError)
        blob = await fetchShareImageBlob(imageUrl, fallbackUrl)
      }

      const contentType = blob.type || "image/jpeg"
      const file = new File([blob], getShareFileName(item, mediaType, contentType), { type: contentType })
      const fileShareData = {
        files: [file],
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      }

      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(shareClipboardText)
          } catch {
            // Ignore clipboard failures and continue with share.
          }
        }

        await navigator.share(fileShareData)
        if (navigator.clipboard?.writeText) {
          toast({
            title: "Ready to post",
            description: "The image was shared, and your caption is copied so you can paste it into Reels, Posts, or Stories.",
          })
        }
        return
      }

      await shareTextAndLink()
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(shareClipboardText)
          toast({
            title: "Caption copied",
            description: "We couldn't open the share sheet, so the caption and link are ready to paste instead.",
          })
          return
        } catch {
          // Fall through to generic error toast.
        }
      }

      console.error("Failed to share content:", error)
      toast({
        title: "Share unavailable",
        description: "We couldn't prepare the share right now. Please try again in a moment.",
        variant: "destructive",
      })
    } finally {
      setIsSharing(false)
    }
  }, [isSharing, item, mediaType, title, toast])

  if (isLoading || !item) {
    return (
      <section className="relative w-full h-screen overflow-hidden flex items-end">
        <div className="absolute inset-0 bg-gradient-to-b from-[#121212] to-[#090a0a]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090a0a]/70 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0a]/80 via-black/40 md:via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#090a0a]/80 md:from-[#090a0a]/60 via-[#090a0a]/10 to-transparent" />
      </section>
    )
  }

  return (
    <section
      ref={heroRef}
      id="spotlight"
      className="relative w-full h-screen overflow-hidden flex items-end"
    >
      {/* Base image */}
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover will-change-transform scale-[1.02]"
          onLoad={() => setHeroImgLoaded(true)}
          fetchPriority="high"
        />
      )}

      {/* YouTube clip preview - Desktop only */}
      {showVideo && ytKey && !isMobile && (
        <iframe
          ref={desktopVideoRef}
          src={`https://www.youtube.com/embed/${ytKey}?autoplay=1&loop=1&playlist=${ytKey}&mute=${isMuted ? 1 : 0}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&fs=0&cc_load_policy=0&start=0`}
          className="absolute inset-0 w-full h-full object-cover will-change-transform scale-[1.02]"
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          frameBorder="0"
          title="Clip"
          onError={() => {
            setShowVideo(false)
          }}
        />
      )}

      {!backgroundImage && <div className="absolute inset-0 bg-gradient-to-b from-[#121212] to-[#090a0a]" />}
      <div className="absolute inset-0 bg-gradient-to-r from-[#090a0a]/70 via-black/20 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#090a0a]/80 via-black/40 md:via-black/20 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#090a0a]/80 md:from-[#090a0a]/60 via-[#090a0a]/10 to-transparent"></div>

      {/* Mute Button - Top Right Corner (Desktop Only) */}
      {showVideo && ytKey && (
        <button
          onClick={toggleMute}
          className="hidden md:block absolute top-20 right-4 bg-white/10 text-white p-2 rounded-lg hover:bg-white/20 transition-all duration-200 shadow-lg border border-white/20 backdrop-blur-sm z-30"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          )}
        </button>
      )}

      {/* Content container */}
      <div
        className="relative z-10 p-6 sm:p-8 md:p-12 w-full md:pr-0 text-center md:text-left pb-24 md:pb-8"
        style={{ zIndex: 15 }}
      >
        {/* Title */}
        <h1
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white w-full md:w-[28rem] mb-4 sm:mb-6"
        >
          {title}
        </h1>

        {/* Details section */}
        <div className="opacity-100 max-h-screen">
          {/* Rating and info */}
          <div className="flex items-center gap-2 mb-3 sm:mb-4 justify-center md:justify-start flex-wrap">
            <div className="bg-[#0071eb] text-white px-2 py-1 rounded font-bold tracking-tight text-xs uppercase shadow-[0_0_15px_rgba(0,113,235,0.3)] border border-[#0071eb]/50">
              Agasobanuye
            </div>
            <span className="text-neutral-300 font-medium text-sm sm:text-base">
              {item.vote_average?.toFixed(1) || "8.0"}
            </span>
            {item.narrator && (
              <>
                <span className="text-neutral-400">•</span>
                <span className="bg-[#0071eb] text-white px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(0,113,235,0.4)] border border-white/10">
                  {item.narrator}
                </span>
              </>
            )}
            <span className="text-neutral-400">•</span>
            <span className="text-neutral-300 text-sm sm:text-base">{formatReleaseDate(releaseDate)}</span>
            <span className="text-neutral-400">•</span>
            <span className="text-neutral-300 text-sm sm:text-base">
              {runtime
                ? `${Math.floor(runtime / 60)}h ${runtime % 60}m`
                : mediaType === "tv"
                  ? `${(item as TVShow).number_of_seasons || 0} seasons`
                  : "0-100 seasons"}
            </span>
            <span className="text-neutral-400">•</span>
            <span className="text-green-400 font-semibold text-sm sm:text-base">98% Match</span>
          </div>

          {/* Description */}
          <p className="text-white text-sm sm:text-base md:text-lg mb-6 sm:mb-8 md:mb-16 leading-5 sm:leading-6 max-w-xl line-clamp-3 overflow-ellipsis mx-auto md:mx-0">
            {item.overview}
          </p>

          {/* Genre tags */}
          {Array.isArray(item.genres) && item.genres.length > 0 && (
            <div className="flex gap-2 text-neutral-400 text-xs sm:text-sm mb-3 justify-center md:justify-start flex-wrap">
              {item.genres.slice(0, 3).map((genre: any, index) => (
                <span key={genre.id || index} className="flex items-center gap-2">
                  <span className="text-neutral-300">{genre.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons - Always visible */}
        <div
          className="flex flex-col md:flex-row w-full md:justify-between items-center gap-4 md:gap-6 mb-6"
        >
          <div className="flex flex-wrap items-center gap-2 md:gap-3 justify-center md:justify-start w-full md:w-auto">
            {/* Play Button */}
            {onWatchClick && (mediaType === 'tv' || (item as Movie).embed_url) && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (isWatching) return
                  setIsWatching(true)
                  onWatchClick()
                }}
                disabled={isWatching}
                className={`bg-white text-black px-5 sm:px-8 md:px-10 py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-lg flex items-center gap-2 sm:gap-3 hover:bg-gray-200 active:bg-gray-300 shadow-lg justify-center touch-manipulation cursor-pointer relative z-20 min-w-[140px] sm:min-w-[180px] transition-all ${
                  isWatching ? "pointer-events-none opacity-80 cursor-default" : ""
                }`}
              >
                {isWatching ? (
                  <>
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 sm:w-6 sm:h-6" fill="currentColor" />
                    <span>Watch Now</span>
                  </>
                )}
              </button>
            )}

            {/* Download Button */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDownloadClick()
              }}
              className="bg-[#0071eb]/80 text-white px-3 sm:px-6 py-2 sm:py-4 rounded-lg font-bold text-sm sm:text-lg flex items-center gap-2 sm:gap-3 hover:bg-[#0071eb] active:bg-[#0071eb]/60 shadow-lg w-auto justify-center touch-manipulation cursor-pointer relative z-20"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">{showDownloads ? "Hide Downloads" : "Downloads"}</span>
            </button>

            {/* Watchlist Button */}
            <div
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              className="relative z-20"
            >
              <WatchlistButton
                id={item.id}
                type={mediaType}
                title={mediaType === "movie" ? (item as Movie).title : (item as TVShow).name}
                poster_path={item.poster_path || null}
                vote_average={item.vote_average || 0}
                release_date={mediaType === "movie" ? (item as Movie).release_date : undefined}
                first_air_date={mediaType === "tv" ? (item as TVShow).first_air_date : undefined}
                number_of_episodes={mediaType === "tv" ? (item as TVShow).number_of_episodes : undefined}
                variant="ghost"
                size="default"
                iconOnly={false}
                showText={true}
                className="bg-white/10 text-white px-3 sm:px-6 py-2 sm:py-4 rounded-lg font-bold text-sm sm:text-lg flex items-center gap-2 sm:gap-3 hover:bg-white/20 shadow-lg border border-white/20 backdrop-blur-sm transition-all h-auto"
              />
            </div>

            {/* Share Button */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                void handleShareClick()
              }}
              disabled={isSharing}
              className={`flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-4 rounded-lg font-bold text-sm sm:text-lg shadow-lg border backdrop-blur-sm cursor-pointer relative z-20 ${
                isSharing
                  ? "bg-white/5 border-white/10 text-white/70 cursor-wait"
                  : "bg-white/10 hover:bg-white/20 border-white/20 text-white hover:border-white/30"
              }`}
              title="Share to Instagram, TikTok, or another app"
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="whitespace-nowrap hidden sm:inline">{isSharing ? "Preparing..." : "Share"}</span>
            </button>
          </div>

          {/* Content Rating */}
          <div className="hidden md:flex items-center gap-2">
            <span className="bg-gray-800/80 text-white px-3 py-2 rounded border border-gray-600/50 font-medium text-sm shadow-lg">
              {mediaType === "movie" ? "PG-13" : "TV-14"}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
