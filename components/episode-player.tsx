"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading"
import { NativeHlsPlayer } from "@/components/native-hls-player"
import { getTMDBImageUrl } from "@/lib/tmdb"
import type { Episode, TVShow } from "@/lib/types"
import { Play, X, Volume2, VolumeX, ArrowLeft, Calendar, Clock, Download } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface EpisodePlayerProps {
  episode: Episode
  tvShow: TVShow
  nextEpisode?: Episode
  episodes?: Episode[]
  onNextEpisode?: () => void
  autoPlay?: boolean
}

export function EpisodePlayer({ episode, tvShow, nextEpisode, episodes = [], onNextEpisode, autoPlay = false }: EpisodePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isMuted, setIsMuted] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [initialProgress, setInitialProgress] = useState(0)
  const [loadingProgress, setLoadingProgress] = useState(true)
  const [showNextEpisode, setShowNextEpisode] = useState(false)
  const [autoNextEnabled, setAutoNextEnabled] = useState(false) // Disabled by default
  const [nextEpisodeTimer, setNextEpisodeTimer] = useState(10)
  const [videoEnded, setVideoEnded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastSavedTimeRef = useRef<number>(0)
  const latestProgressRef = useRef<{ time: number; duration: number }>({ time: 0, duration: 0 })
  const supabase = createClient()

  useEffect(() => {
    const fetchInitialProgress = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from("watch_progress_entries")
          .select("progress_seconds")
          .eq("user_id", user.id)
          .eq("episode_id", episode.id)
          .maybeSingle()
        
        if (data) {
          setInitialProgress(data.progress_seconds)
          lastSavedTimeRef.current = data.progress_seconds
        }
      }
      setLoadingProgress(false)
    }
    fetchInitialProgress()
  }, [episode.id, supabase])

  const persistProgress = async (
    { time, duration }: { time: number; duration: number },
    options?: { force?: boolean },
  ) => {
    const now = Math.floor(time)
    const roundedDuration = Math.floor(duration)

    if (now <= 0 || roundedDuration <= 0) return
    if (!options?.force && (now % 10 !== 0 || now === lastSavedTimeRef.current)) return

    lastSavedTimeRef.current = now

    try {
      await fetch("/api/watch-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: "episode",
          tv_show_id: tvShow.id,
          season_id: episode.season_id,
          episode_id: episode.id,
          progress_seconds: now,
          duration_seconds: roundedDuration,
        }),
      })
    } catch (err) {
      console.error("Failed to save watch progress:", err)
    }
  }

  const handleProgress = async ({ time, duration }: { time: number; duration: number }) => {
    latestProgressRef.current = { time, duration }
    await persistProgress({ time, duration })
  }

  useEffect(() => {
    const flushProgress = () => {
      const { time, duration } = latestProgressRef.current
      if (time > 0 && duration > 0) {
        void persistProgress({ time, duration }, { force: true })
      }
    }

    window.addEventListener("pagehide", flushProgress)
    window.addEventListener("beforeunload", flushProgress)

    return () => {
      window.removeEventListener("pagehide", flushProgress)
      window.removeEventListener("beforeunload", flushProgress)
    }
  }, [episode.id, tvShow.id])

  const playerPlaylistItems = useMemo(() => {
    const orderedEpisodes = episodes.length ? episodes : [episode]
    const currentIndex = Math.max(
      0,
      orderedEpisodes.findIndex((item) => item.id === episode.id),
    )
    const playlistOrder = [
      ...orderedEpisodes.slice(currentIndex),
      ...orderedEpisodes.slice(0, currentIndex),
    ]

    return playlistOrder.map((item) => ({
      id: item.id,
      embedUrl: item.embed_url,
      title: `S${item.season_number}E${item.episode_number} - ${item.name || `Episode ${item.episode_number}`}`,
      poster: getTMDBImageUrl(item.still_path || tvShow.backdrop_path || tvShow.poster_path || "", "w780"),
    }))
  }, [episode, episodes, tvShow.backdrop_path, tvShow.poster_path])

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true)
    if (autoPlay) {
      setIsPlaying(true)
    }
  }, [autoPlay])

  // Intercept iframe fullscreen and make container fullscreen instead
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const iframe = container.querySelector('iframe')

    // Function to enter fullscreen on container
    const enterFullscreen = async () => {
      try {
        // Use the most modern API first
        if (container.requestFullscreen) {
          await container.requestFullscreen()
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen((Element as any).ALLOW_KEYBOARD_INPUT)
        } else if ((container as any).mozRequestFullScreen) {
          await (container as any).mozRequestFullScreen()
        } else if ((container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen()
        }
      } catch (error) {
        console.error('Failed to enter fullscreen:', error)
      }
    }

    // Listen for fullscreen changes
    const handleFullscreenChange = async () => {
      const fullscreenElement = 
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement

      // If iframe is in fullscreen, exit it and make container fullscreen instead
      if (iframe && fullscreenElement === iframe) {
        // Exit iframe fullscreen immediately
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {})
        } else if ((document as any).webkitExitFullscreen) {
          ;(document as any).webkitExitFullscreen()
        } else if ((document as any).mozCancelFullScreen) {
          ;(document as any).mozCancelFullScreen()
        } else if ((document as any).msExitFullscreen) {
          ;(document as any).msExitFullscreen()
        }

        // Immediately make container fullscreen
        setTimeout(() => {
          enterFullscreen()
        }, 50)
      }
    }

    // Also listen for clicks on iframe that might trigger fullscreen
    const handleIframeClick = () => {
      setTimeout(() => {
        const fullscreenElement = 
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement

        if (iframe && fullscreenElement === iframe) {
          handleFullscreenChange()
        }
      }, 100)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)
    
    // Monitor for iframe fullscreen attempts
    const observer = new MutationObserver(() => {
      handleIframeClick()
    })
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true
    })

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
      observer.disconnect()
    }
  }, [])

  const handlePlay = () => {
    setIsPlaying(true)
  }

  const handleClose = () => {
    setIsPlaying(false)
    setVideoEnded(false)
    setShowNextEpisode(false)
    if (autoPlay) {
      // If auto-played, go back to details page
      window.history.back()
    }
  }

  // Auto-next functionality - DISABLED
  // useEffect(() => {
  //   if (isPlaying && nextEpisode && autoNextEnabled) {
  //     const timer = setInterval(() => {
  //       setNextEpisodeTimer((prev) => {
  //         if (prev <= 1) {
  //           // Use setTimeout to avoid setState during render
  //           setTimeout(() => {
  //             onNextEpisode?.()
  //           }, 0)
  //           return 10
  //         }
  //         return prev - 1
  //       })
  //     }, 1000)

  //     return () => clearInterval(timer)
  //   }
  // }, [isPlaying, nextEpisode, autoNextEnabled, onNextEpisode])

  // Show next episode after 5 minutes - DISABLED
  // useEffect(() => {
  //   if (isPlaying && nextEpisode) {
  //     const timer = setTimeout(() => {
  //       setShowNextEpisode(true)
  //     }, 5 * 60 * 1000) // 5 minutes

  //     return () => clearTimeout(timer)
  //   }
  // }, [isPlaying, nextEpisode])

  // Handle video end detection - DISABLED
  // useEffect(() => {
  //   if (videoEnded && nextEpisode && autoNextEnabled) {
  //     const timer = setInterval(() => {
  //       setNextEpisodeTimer((prev) => {
  //         if (prev <= 1) {
  //           // Use setTimeout to avoid setState during render
  //           setTimeout(() => {
  //             onNextEpisode?.()
  //           }, 0)
  //           return 10
  //         }
  //         return prev - 1
  //       })
  //     }, 1000)

  //     return () => clearInterval(timer)
  //   } else if (videoEnded && nextEpisode) {
  //     setShowNextEpisode(true)
  //   }
  // }, [videoEnded, nextEpisode, autoNextEnabled, onNextEpisode])

  // Listen for video end events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data)
          if (data.event === 'video-ended' || data.event === 'ended') {
            setVideoEnded(true)
          }
        } catch (e) {
          if (event.data.includes('ended') || event.data.includes('complete')) {
            setVideoEnded(true)
          }
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  if (!mounted || loadingProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" className="text-[#0071eb]" />
          <div className="text-white text-lg font-medium">Resolving stream...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {!isPlaying ? (
        // Episode Info with Play Button
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6">
            <Link href={`/tv/${tvShow.id}`}>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {tvShow.name}
              </Button>
            </Link>
          </div>

          {/* Episode Content */}
          <div className="container mx-auto px-4 md:px-6 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* TV Show Thumbnail */}
              <div className="lg:col-span-1">
                <div className="relative">
                  <img
                    src={getTMDBImageUrl(tvShow.backdrop_path || tvShow.poster_path || "", "w780") || "/placeholder.svg"}
                    alt={tvShow.name}
                    className="w-full h-64 md:h-80 object-cover rounded-lg shadow-2xl animate-fade-in"
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-lg" />
                  
                  {/* Episode Info Overlay - Only show if episode has a still image */}
                  {episode.still_path && (
                    <div className="absolute top-4 left-4">
                      <div className="flex items-center gap-3 bg-black/80 backdrop-blur-sm rounded-lg p-3 animate-slide-in-left">
                        <img
                          src={getTMDBImageUrl(episode.still_path, "w92")}
                          alt={episode.name}
                          className="w-12 h-16 object-cover rounded-md hover-scale"
                        />
                        <div className="text-white">
                          <h3 className="font-semibold text-sm truncate max-w-32">{episode.name}</h3>
                          <p className="text-xs text-gray-300">S{episode.season_number}E{episode.episode_number}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Episode Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* TV Show Info */}
                <div className="flex items-center gap-4 mb-6 animate-stagger-2">
                  <img
                    src={getTMDBImageUrl(tvShow.poster_path || "", "w154") || "/placeholder.svg"}
                    alt={tvShow.name}
                    className="w-16 h-20 object-cover rounded-lg shadow-lg hover-scale"
                  />
                  <div>
                    <Link href={`/tv/${tvShow.id}`} className="hover:text-primary transition-colors">
                      <h2 className="text-xl font-bold text-white hover:text-primary">{tvShow.name}</h2>
                    </Link>
                    <p className="text-gray-400 text-sm">
                      {tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : ""}
                      {tvShow.vote_average && ` • ★ ${tvShow.vote_average.toFixed(1)}`}
                    </p>
                  </div>
                </div>

                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 animate-hero-text">
                    {episode.name}
                  </h1>
                  <div className="flex items-center gap-4 mb-4 flex-wrap animate-stagger-3">
                    <Badge variant="secondary" className="text-sm hover-scale">
                      S{episode.season_number}E{episode.episode_number}
                    </Badge>
                    {episode.air_date && (
                      <Badge variant="outline" className="text-sm hover-scale">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(episode.air_date).toLocaleDateString()}
                      </Badge>
                    )}
                    {episode.runtime && (
                      <Badge variant="outline" className="text-sm hover-scale">
                        <Clock className="h-3 w-3 mr-1" />
                        {episode.runtime}min
                      </Badge>
                    )}
                  </div>
                </div>

                {episode.overview && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Overview</h3>
                    <p className="text-gray-300 leading-relaxed">{episode.overview}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 flex-wrap animate-stagger-4">
                  <Button 
                    size="lg" 
                    onClick={handlePlay}
                    className="bg-primary hover:bg-primary/90 text-lg font-semibold px-8 py-3 hover-lift btn-primary-animated animate-play-button"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Play Episode
                  </Button>
                  
                  {episode.download_url && (
                    <Button 
                      asChild 
                      variant="outline" 
                      size="lg" 
                      className="text-white border-white hover:bg-white hover:text-black hover-lift"
                    >
                      <a href={episode.download_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-5 w-5 mr-2" />
                        Download Episode
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Video Player
        <div ref={containerRef} className="fixed inset-0 w-full h-full bg-black">
          {/* Go Back Button - Always visible */}
          <div className="absolute top-4 left-4 z-10">
            <Button variant="secondary" size="sm" onClick={handleClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          {/* Player Controls */}
          {!autoPlay && (
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Episode Details - Top Center */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="text-white text-center">
              <span className="text-sm font-semibold">
                S{episode.season_number}E{episode.episode_number} - {episode.name || `Episode ${episode.episode_number}`}
              </span>
            </div>
          </div>

          {/* Auto-next Settings - REMOVED */}
          {/* No auto-next functionality */}

          {/* Next Episode Popup - REMOVED */}
          {/* No automatic next episode popup */}

          {/* Video Player */}
          <div className="absolute inset-0 w-full h-full">
            <NativeHlsPlayer
              embedUrl={episode.embed_url}
              title={`S${episode.season_number}E${episode.episode_number} - ${episode.name || `Episode ${episode.episode_number}`}`}
              poster={getTMDBImageUrl(episode.still_path || tvShow.backdrop_path || tvShow.poster_path || "", "w780")}
              playlistItems={playerPlaylistItems}
              autoPlay={autoPlay}
              muted={isMuted}
              initialTime={initialProgress}
              onProgress={handleProgress}
              onPlayerEvent={({ type, time, duration }) => {
                latestProgressRef.current = { time, duration }

                if (type === "pause" || type === "seek" || type === "seeked") {
                  void persistProgress({ time, duration }, { force: true })
                }
              }}
              onEnded={() => {
                const duration = latestProgressRef.current.duration
                if (duration > 0) {
                  void persistProgress({ time: duration, duration }, { force: true })
                }
                setVideoEnded(true)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
