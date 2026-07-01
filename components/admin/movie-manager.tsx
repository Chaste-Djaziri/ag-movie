"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { createClient } from "@/lib/supabase/client"
import { buildMovieWebhookPayload } from "@/lib/make-webhook"
import { searchTMDBMovie, getTMDBMovie, getTMDBImageUrl } from "@/lib/tmdb"
import type { TMDBMovie, Movie } from "@/lib/types"
import { Search, Plus, Edit, Trash2, Eye, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"

function fireMovieCreatedWebhook(movieData: {
  title: string
  overview?: string | null
  genres?: { name: string }[] | null
  release_date?: string | null
  vote_average?: number | null
  poster_path?: string | null
  embed_url: string
  download_url?: string | null
  narrator?: string | null
}) {
  void fetch("/api/admin/make-movie-webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildMovieWebhookPayload(movieData)),
  }).catch(() => {})
}

export function MovieManager() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([])
  const [selectedMovie, setSelectedMovie] = useState<TMDBMovie | null>(null)
  const [embedUrl, setEmbedUrl] = useState("")
  const [trailerUrl, setTrailerUrl] = useState("")
  const [downloadUrl, setDownloadUrl] = useState("")
  const [narrator, setNarrator] = useState("")
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState("")
  const [isMultiPart, setIsMultiPart] = useState(false)
  const [partNumber, setPartNumber] = useState(1)
  const [parentMovieId, setParentMovieId] = useState("")
  const [parentMovieSearch, setParentMovieSearch] = useState("")
  const [parentMovieResults, setParentMovieResults] = useState<Movie[]>([])
  const [selectedParentMovie, setSelectedParentMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Existing movies management
  const [existingMovies, setExistingMovies] = useState<Movie[]>([])
  const [existingSearchQuery, setExistingSearchQuery] = useState("")
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null)
  const [editEmbedUrl, setEditEmbedUrl] = useState("")
  const [editTrailerUrl, setEditTrailerUrl] = useState("")
  const [editDownloadUrl, setEditDownloadUrl] = useState("")
  const [editNarrator, setEditNarrator] = useState("")
  const [editIsScheduled, setEditIsScheduled] = useState(false)
  const [editScheduledDate, setEditScheduledDate] = useState("")
  
  // Add part to existing movie
  const [addingPartToMovie, setAddingPartToMovie] = useState<Movie | null>(null)
  const [partEmbedUrl, setPartEmbedUrl] = useState("")
  const [partDownloadUrl, setPartDownloadUrl] = useState("")
  const [newPartNumber, setNewPartNumber] = useState(2)

  // Load existing movies
  const loadExistingMovies = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .order("created_at", { ascending: false })
      
      if (error) throw error
      setExistingMovies(data || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load existing movies",
        variant: "destructive",
      })
    }
  }

  // Search existing movies for parent selection
  const searchExistingMovies = async () => {
    if (!parentMovieSearch.trim()) {
      setParentMovieResults([])
      return
    }

    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .ilike("title", `%${parentMovieSearch}%`)
        .limit(10)
        .order("created_at", { ascending: false })
      
      if (error) throw error
      setParentMovieResults(data || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search existing movies",
        variant: "destructive",
      })
    }
  }

  // Select parent movie
  const selectParentMovie = (movie: Movie) => {
    setSelectedParentMovie(movie)
    setParentMovieId(movie.id)
    setParentMovieSearch(movie.title)
    setParentMovieResults([])
  }

  // Delete movie
  const handleDeleteMovie = async (movieId: string) => {
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from("movies")
        .delete()
        .eq("id", movieId)
      
      if (error) throw error
      
      toast({
        title: "Success",
        description: "Movie deleted successfully",
      })
      loadExistingMovies()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete movie",
        variant: "destructive",
      })
    }
  }

  // Edit movie
  const handleEditMovie = (movie: Movie) => {
    setEditingMovie(movie)
    setEditEmbedUrl(movie.embed_url)
    setEditTrailerUrl(movie.trailer_url || "")
    setEditDownloadUrl(movie.download_url || "")
    setEditNarrator(movie.narrator || "")
    setEditIsScheduled(movie.status === "coming_soon")
    setEditScheduledDate(movie.scheduled_release ? new Date(movie.scheduled_release).toISOString().slice(0, 16) : "")
  }

  // Update movie
  const handleUpdateMovie = async () => {
    if (!editingMovie) return

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from("movies")
        .update({
          embed_url: editEmbedUrl,
          trailer_url: editTrailerUrl || null,
          download_url: editDownloadUrl || null,
          narrator: editNarrator || null,
          status: editIsScheduled ? "coming_soon" : "active",
          scheduled_release: editIsScheduled && editScheduledDate ? new Date(editScheduledDate).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingMovie.id)
      
      if (error) throw error
      
      toast({
        title: "Success",
        description: "Movie updated successfully",
      })
      setEditingMovie(null)
      loadExistingMovies()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update movie",
        variant: "destructive",
      })
    }
  }

  // Load movies on component mount
  useEffect(() => {
    setMounted(true)
    loadExistingMovies()
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const response = await searchTMDBMovie(searchQuery)
      setSearchResults(response.results || [])
    } catch (error) {
      toast({
        title: "Search Error",
        description: "Failed to search movies. Please check your TMDB API key.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectMovie = async (movie: TMDBMovie) => {
    setLoading(true)
    try {
      const fullMovie = await getTMDBMovie(movie.id)
      setSelectedMovie(fullMovie)
      setEmbedUrl("")
      setTrailerUrl("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch movie details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddMovie = async () => {
    if (!selectedMovie || !embedUrl.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a movie and provide an embed URL",
        variant: "destructive",
      })
      return
    }

    // For multi-part movies: Part 1 doesn't need parent, other parts do
    if (isMultiPart && partNumber > 1 && !selectedParentMovie) {
      toast({
        title: "Missing Information",
        description: "Please select a parent movie for multi-part movies (Part 2+)",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // Check if this is adding a part to an existing movie
      if (isMultiPart && partNumber > 1 && selectedParentMovie) {
        // Check if this part already exists
        const { data: existingPart, error: checkError } = await supabase
          .from("movies")
          .select("id")
          .eq("parent_movie_id", selectedParentMovie.id)
          .eq("part_number", partNumber)
          .single()

        if (checkError && checkError.code !== "PGRST116") { // PGRST116 = no rows returned
          throw checkError
        }

        if (existingPart) {
          toast({
            title: "Part Already Exists",
            description: `Part ${partNumber} of this movie already exists`,
            variant: "destructive",
          })
          return
        }
        // Add a new part to existing movie
        const movieData = {
          tmdb_id: selectedParentMovie.tmdb_id + partNumber, // Make unique by adding part number
          title: `${selectedParentMovie.title.replace(/ - Part \d+$/, '')} - Part ${partNumber}`,
          overview: selectedParentMovie.overview,
          poster_path: selectedParentMovie.poster_path,
          backdrop_path: selectedParentMovie.backdrop_path,
          release_date: selectedParentMovie.release_date,
          runtime: selectedParentMovie.runtime,
          vote_average: selectedParentMovie.vote_average,
          vote_count: selectedParentMovie.vote_count,
          genres: selectedParentMovie.genres,
          trailer_url: trailerUrl || null,
          download_url: downloadUrl || null,
          narrator: narrator || null,
          embed_url: embedUrl,
          part_number: partNumber,
          parent_movie_id: selectedParentMovie.id,
          status: isScheduled ? "coming_soon" : "active",
          scheduled_release: isScheduled && scheduledDate ? new Date(scheduledDate).toISOString() : null,
        }

        const { error } = await supabase.from("movies").insert([movieData])

        if (error) {
          if (error.code === "23505") {
            toast({
              title: "Part Already Exists",
              description: `Part ${partNumber} of this movie already exists`,
              variant: "destructive",
            })
          } else {
            throw error
          }
        } else {
          toast({
            title: "Success",
            description: `Part ${partNumber} added successfully`,
          })
          fireMovieCreatedWebhook(movieData)
          resetForm()
          loadExistingMovies()
        }
      } else {
        // Create new movie (Part 1 or standalone)
        const movieData = {
          tmdb_id: selectedMovie.id,
          title: isMultiPart ? `${selectedMovie.title} - Part ${partNumber}` : selectedMovie.title,
          overview: selectedMovie.overview,
          poster_path: selectedMovie.poster_path,
          backdrop_path: selectedMovie.backdrop_path,
          release_date: selectedMovie.release_date,
          runtime: selectedMovie.runtime,
          vote_average: selectedMovie.vote_average,
          vote_count: selectedMovie.vote_count,
          genres: selectedMovie.genres,
          trailer_url: trailerUrl || null,
          download_url: downloadUrl || null,
          narrator: narrator || null,
          embed_url: embedUrl,
          part_number: isMultiPart ? partNumber : 1,
          parent_movie_id: null, // Part 1 is the parent
          status: isScheduled ? "coming_soon" : "active",
          scheduled_release: isScheduled && scheduledDate ? new Date(scheduledDate).toISOString() : null,
        }

        const { error } = await supabase.from("movies").insert([movieData])

        if (error) {
          if (error.code === "23505") {
            toast({
              title: "Movie Already Exists",
              description: "This movie is already in the database",
              variant: "destructive",
            })
          } else {
            throw error
          }
        } else {
          toast({
            title: "Success",
            description: `Movie "${movieData.title}" added successfully`,
          })
          fireMovieCreatedWebhook(movieData)
          resetForm()
          loadExistingMovies()
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add movie to database",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedMovie(null)
    setEmbedUrl("")
    setTrailerUrl("")
    setDownloadUrl("")
    setNarrator("")
    setIsScheduled(false)
    setScheduledDate("")
    setIsMultiPart(false)
    setPartNumber(1)
    setParentMovieId("")
    setParentMovieSearch("")
    setSelectedParentMovie(null)
    setParentMovieResults([])
  }

  const handleAddPartToMovie = async () => {
    if (!addingPartToMovie || !partEmbedUrl.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide an embed URL for the new part",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // Check if this part already exists
      const { data: existingPart, error: checkError } = await supabase
        .from("movies")
        .select("id")
        .eq("parent_movie_id", addingPartToMovie.id)
        .eq("part_number", newPartNumber)
        .single()

      if (checkError && checkError.code !== "PGRST116") { // PGRST116 = no rows returned
        throw checkError
      }

      if (existingPart) {
        toast({
          title: "Part Already Exists",
          description: `Part ${newPartNumber} of this movie already exists`,
          variant: "destructive",
        })
        return
      }

      const movieData = {
        tmdb_id: addingPartToMovie.tmdb_id + newPartNumber, // Make unique by adding part number
        title: `${addingPartToMovie.title.replace(/ - Part \d+$/, '')} - Part ${newPartNumber}`,
        overview: addingPartToMovie.overview,
        poster_path: addingPartToMovie.poster_path,
        backdrop_path: addingPartToMovie.backdrop_path,
        release_date: addingPartToMovie.release_date,
        runtime: addingPartToMovie.runtime,
        vote_average: addingPartToMovie.vote_average,
        vote_count: addingPartToMovie.vote_count,
        genres: addingPartToMovie.genres,
        trailer_url: null,
        download_url: partDownloadUrl || null,
        embed_url: partEmbedUrl,
        part_number: newPartNumber,
        parent_movie_id: addingPartToMovie.id,
        status: "active",
        scheduled_release: null,
      }

      const { error } = await supabase.from("movies").insert([movieData])

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Part Already Exists",
            description: `Part ${newPartNumber} of this movie already exists`,
            variant: "destructive",
          })
        } else {
          throw error
        }
      } else {
        toast({
          title: "Success",
          description: `Part ${newPartNumber} added successfully`,
        })
        fireMovieCreatedWebhook({
          ...movieData,
          narrator: addingPartToMovie.narrator ?? null,
        })
        setAddingPartToMovie(null)
        setPartEmbedUrl("")
        setPartDownloadUrl("")
        setNewPartNumber(2)
        loadExistingMovies()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add part to movie",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredExistingMovies = existingMovies.filter((movie) =>
    movie.title.toLowerCase().includes(existingSearchQuery.toLowerCase())
  )

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="add-movie">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="add-movie">Add New Movie</TabsTrigger>
          <TabsTrigger value="manage-movies">Manage Existing Movies</TabsTrigger>
        </TabsList>

        <TabsContent value="add-movie" className="space-y-6">
          {/* Search Section */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search for movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {searchResults.map((movie) => (
                  <Card key={movie.id} className="cursor-pointer hover:bg-accent" onClick={() => handleSelectMovie(movie)}>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <img
                          src={getTMDBImageUrl(movie.poster_path, "w92") || "/placeholder.svg"}
                          alt={movie.title}
                          className="w-16 h-24 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{movie.title}</h3>
                          <p className="text-xs text-muted-foreground">{movie.release_date}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {movie.vote_average?.toFixed(1)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Selected Movie Details */}
          {selectedMovie && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Movie: {selectedMovie.title}
                </CardTitle>
                <CardDescription>Configure the movie details and embed URL</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <img
                    src={getTMDBImageUrl(selectedMovie.poster_path) || "/placeholder.svg"}
                    alt={selectedMovie.title}
                    className="w-32 h-48 object-cover rounded"
                  />
                  <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-bold">{selectedMovie.title}</h3>
                    <p className="text-sm text-muted-foreground">{selectedMovie.overview}</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedMovie.genres?.map((genre) => (
                        <Badge key={genre.id} variant="outline">
                          {genre.name}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Release: {selectedMovie.release_date}</span>
                      <span>Runtime: {selectedMovie.runtime}min</span>
                      <span>Rating: {selectedMovie.vote_average}/10</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="embed-url">Embed URL (Required)</Label>
                    <Input
                      id="embed-url"
                      placeholder="https://hglink.to/e/..."
                      value={embedUrl}
                      onChange={(e) => setEmbedUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Embed URL from auvexiug.com for the video player</p>
                  </div>

                  <div>
                    <Label htmlFor="trailer-url">Trailer URL (Optional)</Label>
                    <Input
                      id="trailer-url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={trailerUrl}
                      onChange={(e) => setTrailerUrl(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="download-url">Download URL (Optional)</Label>
                    <Input
                      id="download-url"
                      placeholder="https://example.com/download/..."
                      value={downloadUrl}
                      onChange={(e) => setDownloadUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Direct download link for offline viewing</p>
                  </div>

                  <div>
                    <Label htmlFor="narrator">Narrator (Optional)</Label>
                    <Input
                      id="narrator"
                      placeholder="Narrator name"
                      value={narrator}
                      onChange={(e) => setNarrator(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Name of the person who narrated this movie</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="multi-part"
                      checked={isMultiPart}
                      onChange={(e) => setIsMultiPart(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="multi-part">This is a multi-part movie</Label>
                  </div>

                  {isMultiPart && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="part-number">Part Number</Label>
                        <Input
                          id="part-number"
                          type="number"
                          min="1"
                          value={partNumber}
                          onChange={(e) => {
                            const newPartNumber = parseInt(e.target.value) || 1
                            setPartNumber(newPartNumber)
                            // Clear parent movie selection when switching to Part 1
                            if (newPartNumber === 1) {
                              setSelectedParentMovie(null)
                              setParentMovieId("")
                              setParentMovieSearch("")
                              setParentMovieResults([])
                            }
                          }}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {partNumber === 1 ? "Part 1 is the main movie" : "Part 2+ requires parent movie"}
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="parent-movie-search">
                          Parent Movie {partNumber === 1 ? "(Not needed for Part 1)" : "(Required for Part 2+)"}
                        </Label>
                        <div className="relative">
                          <Input
                            id="parent-movie-search"
                            placeholder={partNumber === 1 ? "Not needed for Part 1" : "Search for the main movie..."}
                            value={parentMovieSearch}
                            disabled={partNumber === 1}
                            onChange={(e) => {
                              if (partNumber === 1) return
                              setParentMovieSearch(e.target.value)
                              if (e.target.value.trim()) {
                                searchExistingMovies()
                              } else {
                                setParentMovieResults([])
                                setSelectedParentMovie(null)
                                setParentMovieId("")
                              }
                            }}
                          />
                          {parentMovieResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {parentMovieResults.map((movie) => (
                                <div
                                  key={movie.id}
                                  className="p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                                  onClick={() => selectParentMovie(movie)}
                                >
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={getTMDBImageUrl(movie.poster_path || "", "w92") || "/placeholder.svg?height=92&width=62"}
                                      alt={movie.title}
                                      className="w-12 h-16 object-cover rounded"
                                    />
                                    <div>
                                      <p className="font-medium text-sm">{movie.title}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {movie.release_date ? new Date(movie.release_date).getFullYear() : "Unknown Year"}
                                      </p>
                                      {movie.part_number && movie.part_number > 1 && (
                                        <Badge variant="secondary" className="text-xs mt-1">
                                          Part {movie.part_number}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {selectedParentMovie && (
                          <div className="mt-2 p-3 bg-muted rounded-md">
                            <div className="flex items-center gap-3">
                              <img
                                src={getTMDBImageUrl(selectedParentMovie.poster_path || "", "w92") || "/placeholder.svg?height=92&width=62"}
                                alt={selectedParentMovie.title}
                                className="w-12 h-16 object-cover rounded"
                              />
                              <div>
                                <p className="font-medium text-sm">Selected: {selectedParentMovie.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {selectedParentMovie.release_date ? new Date(selectedParentMovie.release_date).getFullYear() : "Unknown Year"}
                                </p>
                                {selectedParentMovie.part_number && selectedParentMovie.part_number > 1 && (
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    Part {selectedParentMovie.part_number}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedParentMovie(null)
                                  setParentMovieId("")
                                  setParentMovieSearch("")
                                }}
                                className="ml-auto"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Search and select the main movie for multi-part series</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="scheduled"
                      checked={isScheduled}
                      onChange={(e) => setIsScheduled(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="scheduled">Schedule for later release</Label>
                  </div>

                  {isScheduled && (
                    <div>
                      <Label htmlFor="scheduled-date">Release Date</Label>
                      <Input
                        id="scheduled-date"
                        type="datetime-local"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                      />
                    </div>
                  )}

                  <Button onClick={handleAddMovie} disabled={loading} className="w-full">
                    {loading ? "Adding..." : "Add Movie"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manage-movies" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Existing Movies ({filteredExistingMovies.length}
              {existingSearchQuery && ` matching of ${existingMovies.length}`})
            </h3>
            <Button onClick={loadExistingMovies} variant="outline">
              Refresh
            </Button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search existing movies by title..."
                value={existingSearchQuery}
                onChange={(e) => setExistingSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {existingSearchQuery && (
              <Button variant="ghost" onClick={() => setExistingSearchQuery("")}>
                Clear
              </Button>
            )}
          </div>

          {filteredExistingMovies.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  {existingSearchQuery ? "No movies match your search." : "No movies found. Add some movies to get started."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredExistingMovies.map((movie) => (
                <Card key={movie.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <img
                        src={getTMDBImageUrl(movie.poster_path || "", "w92") || "/placeholder.svg"}
                        alt={movie.title}
                        className="w-16 h-24 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{movie.title}</h3>
                        <p className="text-xs text-muted-foreground">{movie.release_date}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant={movie.status === "active" ? "default" : "secondary"} className="text-xs">
                            {movie.status}
                          </Badge>
                        </div>
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditMovie(movie)}
                            className="h-8 px-2"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAddingPartToMovie(movie)}
                            className="h-8 px-2"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-2">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Movie</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{movie.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMovie(movie.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Movie Dialog */}
          {editingMovie && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Edit Movie: {editingMovie.title}
                </CardTitle>
                <CardDescription>Update the movie details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-embed-url">Embed URL (Required)</Label>
                    <Input
                      id="edit-embed-url"
                      placeholder="https://hglink.to/e/..."
                      value={editEmbedUrl}
                      onChange={(e) => setEditEmbedUrl(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-trailer-url">Trailer URL (Optional)</Label>
                    <Input
                      id="edit-trailer-url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={editTrailerUrl}
                      onChange={(e) => setEditTrailerUrl(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-download-url">Download URL (Optional)</Label>
                    <Input
                      id="edit-download-url"
                      placeholder="https://example.com/download/..."
                      value={editDownloadUrl}
                      onChange={(e) => setEditDownloadUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Direct download link for offline viewing</p>
                  </div>

                  <div>
                    <Label htmlFor="edit-narrator">Narrator (Optional)</Label>
                    <Input
                      id="edit-narrator"
                      placeholder="Narrator name"
                      value={editNarrator}
                      onChange={(e) => setEditNarrator(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Name of the person who narrated this movie</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-scheduled"
                      checked={editIsScheduled}
                      onChange={(e) => setEditIsScheduled(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="edit-scheduled">Schedule for later release</Label>
                  </div>

                  {editIsScheduled && (
                    <div>
                      <Label htmlFor="edit-scheduled-date">Release Date</Label>
                      <Input
                        id="edit-scheduled-date"
                        type="datetime-local"
                        value={editScheduledDate}
                        onChange={(e) => setEditScheduledDate(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleUpdateMovie} disabled={loading} className="flex-1">
                      {loading ? "Updating..." : "Update Movie"}
                    </Button>
                    <Button onClick={() => setEditingMovie(null)} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Part to Existing Movie Dialog */}
          {addingPartToMovie && (
            <Card className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <Card className="w-full max-w-md mx-4">
                <CardHeader>
                  <CardTitle>Add Part to "{addingPartToMovie.title}"</CardTitle>
                  <CardDescription>Add another part to this movie</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="part-number-input">Part Number</Label>
                    <Input
                      id="part-number-input"
                      type="number"
                      min="2"
                      value={newPartNumber}
                      onChange={(e) => setNewPartNumber(parseInt(e.target.value) || 2)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Next part number (minimum 2)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="part-embed-url">Embed URL (Required)</Label>
                    <Input
                      id="part-embed-url"
                      placeholder="https://hglink.to/e/..."
                      value={partEmbedUrl}
                      onChange={(e) => setPartEmbedUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Embed URL for the new part</p>
                  </div>

                  <div>
                    <Label htmlFor="part-download-url">Download URL (Optional)</Label>
                    <Input
                      id="part-download-url"
                      placeholder="https://example.com/download/..."
                      value={partDownloadUrl}
                      onChange={(e) => setPartDownloadUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Direct download link for this part</p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleAddPartToMovie} disabled={loading} className="flex-1">
                      {loading ? "Adding..." : "Add Part"}
                    </Button>
                    <Button onClick={() => setAddingPartToMovie(null)} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
