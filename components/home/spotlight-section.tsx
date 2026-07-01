"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Info } from "lucide-react"
import { getTMDBImageUrl } from "@/lib/tmdb"
import type { Movie, TVShow } from "@/lib/types"
import Link from "next/link"
import { WatchlistButton } from "@/components/watchlist-button"
import { useRouter } from "next/navigation"

interface SpotlightSectionProps {
  item: Movie | TVShow | null
  isLoading: boolean
}

export function SpotlightSection({ item, isLoading }: SpotlightSectionProps) {
  const router = useRouter()
  const [heroImgLoaded, setHeroImgLoaded] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isWatching, setIsWatching] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const mt = item && "title" in item ? "movie" : "tv"

  // Handle item transitions
  useEffect(() => {
    if (item) {
      setIsTransitioning(true)
      setHeroImgLoaded(false)
      const timer = setTimeout(() => {
        setIsTransitioning(false)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [item])

  if (isLoading) {
    return (
      <section className="relative w-full h-[60vh] sm:h-[70vh] md:h-[80vh] overflow-hidden flex items-end bg-[#090a0a]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </section>
    )
  }

  if (!item) {
    return (
      <section className="relative w-full h-[60vh] sm:h-[70vh] md:h-[80vh] overflow-hidden flex items-end bg-[#090a0a]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#121212] to-[#090a0a]" />
        <div className="relative z-10 w-full px-6 sm:px-8 md:px-12 pb-16 sm:pb-20 md:pb-24 text-center md:text-left">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Ag Movies
          </h1>
          <p className="text-white/70 text-sm sm:text-base md:text-lg max-w-xl mx-auto md:mx-0 mb-6">
            We couldn't load featured content right now. Please check your connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white text-black px-6 py-3 rounded-lg font-bold text-sm sm:text-base hover:bg-gray-200 transition-all duration-200"
          >
            Reload
          </button>
        </div>
      </section>
    )
  }

  const bgImage = getTMDBImageUrl(item.backdrop_path || "", "original") || getTMDBImageUrl(item.poster_path || "", "original")
  const title = 'title' in item ? item.title : item.name
  const releaseDate = 'release_date' in item ? item.release_date : item.first_air_date
  const runtime = 'runtime' in item ? item.runtime : undefined
  const seasons = 'number_of_seasons' in item ? item.number_of_seasons : undefined

  const formatReleaseDate = (date?: string) => {
    if (!date) return ""
    try {
      return new Date(date).getFullYear().toString()
    } catch {
      return ""
    }
  }

  const watchPath = mt === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`
  const infoPath = mt === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`

  return (
    <section
      ref={heroRef}
      id="spotlight"
      className="relative w-full h-[70vh] sm:h-[80vh] md:h-[90vh] overflow-hidden flex items-end"
    >
      {/* Base image */}
      {bgImage && (
        <img
          src={bgImage}
          alt={title}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={() => setHeroImgLoaded(true)}
          fetchPriority="high"
        />
      )}

      {/* Enhanced Gradients for Natural Fade */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#090a0a] via-[#090a0a]/20 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#090a0a] via-[#090a0a]/50 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#090a0a]/40 via-transparent to-transparent z-10" />
      
      {/* Extra deep fade at the very bottom to ensure perfect transition to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#090a0a] to-transparent z-20" />

      {/* Copy + Actions */}
      <div className={`relative z-30 p-6 md:p-12 pb-12 w-full md:text-left text-center transition-all duration-700 ${
        isTransitioning ? 'opacity-0 transform translate-y-8' : 'opacity-100 transform translate-y-0'
      }`}>
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 w-full md:max-w-3xl leading-none tracking-tighter drop-shadow-2xl">
          {title}
        </h1>

        <div className="flex items-center gap-2 mb-6 justify-center md:justify-start flex-wrap">
          <div className="bg-[#0071eb] text-white px-3 py-1 rounded-md font-black tracking-tight text-xs uppercase shadow-[0_0_15px_rgba(0,113,235,0.5)]">
            Agasobanuye Exclusive
          </div>
          <span className="text-white text-sm sm:text-base font-black flex items-center gap-1">
            <svg className="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            {item.vote_average?.toFixed(1) || "8.0"}
          </span>
          {item.narrator && (
            <>
              <span className="text-neutral-500">•</span>
              <span className="bg-[#0071eb] text-white px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(0,113,235,0.4)] border border-white/10">
                {item.narrator}
              </span>
            </>
          )}
          <span className="text-neutral-500">•</span>
          <span className="text-white text-sm sm:text-base font-bold">
            {formatReleaseDate(releaseDate)}
          </span>
          {runtime && (
            <>
              <span className="text-neutral-500 hidden sm:inline">•</span>
              <span className="text-white text-sm sm:text-base font-bold hidden sm:inline">
                {`${Math.floor(runtime / 60)}h ${runtime % 60}m`}
              </span>
            </>
          )}
          {seasons && (
            <>
              <span className="text-neutral-500 hidden sm:inline">•</span>
              <span className="text-white text-sm sm:text-base font-bold hidden sm:inline">
                {`${seasons} seasons`}
              </span>
            </>
          )}
        </div>

        {/* Details section - Always visible, no collapsing */}
        <div className="opacity-100 mb-8 transition-all duration-700">
          <p className="text-white/80 text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl line-clamp-3 overflow-ellipsis mx-auto md:mx-0 drop-shadow-lg">
            {item.overview}
          </p>
        </div>

        <div className="flex flex-col md:flex-row w-full md:justify-between items-center gap-6">
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={(e) => {
                e.preventDefault()
                if (isWatching) return
                setIsWatching(true)
                router.push(watchPath)
              }}
              disabled={isWatching}
              className={`bg-white text-black px-8 sm:px-10 py-3 sm:py-4 rounded-xl font-black text-sm sm:text-base flex items-center gap-3 hover:bg-[#0071eb] hover:text-white transition-all duration-300 shadow-2xl text-center justify-center min-w-[160px] sm:min-w-[190px] ${
                isWatching ? "pointer-events-none opacity-80 cursor-default" : "active:scale-95"
              }`}
            >
              {isWatching ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>LOADING...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" />
                  <span>PLAY NOW</span>
                </>
              )}
            </button>
            <Link href={infoPath}>
              <button className="bg-white/10 text-white px-8 sm:px-10 py-3 sm:py-4 rounded-xl font-black text-sm sm:text-base flex items-center gap-3 hover:bg-white/20 transition-all duration-300 shadow-2xl backdrop-blur-md border border-white/10 text-center justify-center min-w-[160px]">
                <Info className="w-5 h-5 sm:w-6 sm:h-6" />
                DETAILS
              </button>
            </Link>
            
            <WatchlistButton
              id={item.id}
              type={mt}
              title={title}
              poster_path={item.poster_path || null}
              vote_average={item.vote_average || 0}
              release_date={"release_date" in item ? item.release_date : undefined}
              first_air_date={"first_air_date" in item ? item.first_air_date : undefined}
              number_of_episodes={"number_of_episodes" in item ? item.number_of_episodes : undefined}
              variant="ghost"
              size="lg"
              iconOnly
              showText={false}
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl border border-white/10 bg-white/10 text-white shadow-2xl backdrop-blur-md hover:bg-white/20"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
