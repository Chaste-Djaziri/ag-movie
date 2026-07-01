"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getTMDBImageUrl } from "@/lib/tmdb"
import type { TVShow, Season, Episode } from "@/lib/types"
import { Play, Calendar, Clock, Download } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface EpisodeListProps {
  tvShow: TVShow
  seasons: Season[]
  episodes: Episode[]
}

export function EpisodeList({ tvShow, seasons, episodes }: EpisodeListProps) {
  const router = useRouter()
  const [selectedSeason, setSelectedSeason] = useState(seasons[0]?.season_number?.toString() || "1")
  const [loadingEpisodeId, setLoadingEpisodeId] = useState<string | null>(null)

  const currentSeasonEpisodes = episodes.filter((episode) => episode.season_number.toString() === selectedSeason)

  if (seasons.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">No Episodes Available</h3>
            <p className="text-muted-foreground">Episodes for this TV show haven't been added yet.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Episodes</h2>
        {seasons.length > 1 && (
          <Select value={selectedSeason} onValueChange={setSelectedSeason}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((season) => (
                <SelectItem key={season.id} value={season.season_number.toString()}>
                  Season {season.season_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-4">
        {currentSeasonEpisodes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">No Episodes in Season {selectedSeason}</h3>
              <p className="text-muted-foreground">Episodes for this season haven't been added yet.</p>
            </CardContent>
          </Card>
        ) : (
          currentSeasonEpisodes.map((episode) => (
            <Card key={episode.id} className="overflow-hidden hover:bg-accent/50 transition-colors">
              <CardContent className="p-0">
                <div className="flex gap-4 p-6">
                  {/* Episode Still */}
                  <div className="flex-shrink-0">
                    <div className="relative w-40 h-24 bg-muted rounded-lg overflow-hidden">
                      <img
                        src={getTMDBImageUrl(episode.still_path, "w300") || "/placeholder.svg?height=96&width=160"}
                        alt={episode.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Button asChild size="sm">
                          <Link href={`/tv/${tvShow.id}/episode/${episode.id}`}>
                            <Play className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Episode Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground truncate">
                          {episode.episode_number}. {episode.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          {episode.air_date && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(episode.air_date).toLocaleDateString()}
                            </div>
                          )}
                          {episode.runtime && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {episode.runtime}min
                            </div>
                          )}
                          {episode.vote_average && (
                            <Badge variant="secondary" className="text-xs">
                              ★ {episode.vote_average.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={(e) => {
                            e.preventDefault()
                            if (loadingEpisodeId) return
                            setLoadingEpisodeId(episode.id)
                            router.push(`/tv/${tvShow.id}/episode/${episode.id}`)
                          }}
                          disabled={loadingEpisodeId !== null}
                          size="sm"
                          className="min-w-[75px]"
                        >
                          {loadingEpisodeId === episode.id ? (
                            <>
                              <svg className="animate-spin h-3 w-3 mr-1 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Loading</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Play
                            </>
                          )}
                        </Button>
                        {episode.download_url && (
                          <Button asChild size="sm" variant="outline">
                            <a href={episode.download_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{episode.overview}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
