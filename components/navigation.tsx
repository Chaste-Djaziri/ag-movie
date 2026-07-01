"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useWatchlist } from "@/hooks/use-watchlist"
import {
  Search,
  Bookmark,
  Home,
  Tv,
  Film,
  Clock,
  Grid3X3,
  Plus,
  MoreHorizontal,
  X,
  User,
  LogOut,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const navItems = [
  { href: "/browse", label: "Home", icon: Home },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/tv-shows", label: "TV Shows", icon: Tv },
  { href: "/categories", label: "Categories", icon: Grid3X3 },
  { href: "/coming-soon", label: "Coming Soon", icon: Clock },
  { href: "/request-movie", label: "Request", icon: Plus },
]

const headerIcons = [
  { href: "/user-watchlist", label: "Watchlist", icon: Bookmark },
]

export function Navigation() {
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { watchlist } = useWatchlist()
  const supabase = createClient()

  const watchCount = watchlist?.length || 0

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  useEffect(() => {
    const q = searchParams.get("q")
    if (q) setSearchQuery(q)
  }, [searchParams])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false)
      }
      if (isSearchExpanded && searchInputRef.current && !searchInputRef.current.contains(event.target as Node) && !searchQuery) {
        setIsSearchExpanded(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isSearchExpanded, searchQuery])

  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchExpanded])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    if (value.trim()) {
      router.push(`/search?q=${encodeURIComponent(value)}`)
    } else if (pathname === "/search") {
      router.push("/browse")
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const visibleItems = navItems.slice(0, 4)
  const moreItems = [
    ...navItems.slice(4),
    ...headerIcons,
  ]

  if (pathname === "/" || pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password" || pathname === "/verify" || pathname === "/complete-profile" || pathname === "/subscribe" || pathname?.startsWith("/admin")) return null

  return (
    <>
      {/* Mobile Logo & Buttons Wrapper (Floating) */}
      <div className="fixed top-4 left-4 right-4 z-50 md:hidden flex items-center justify-between pointer-events-none">
        <Link href="/browse" className="pointer-events-auto bg-zinc-900/80 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-xl">
          <Image
            src="/image.png"
            alt="Agasobanuye Movies Logo"
            width={32}
            height={32}
            className="object-contain"
            style={{ height: "auto" }}
          />
        </Link>

        <div className="flex items-center gap-2 pointer-events-auto">
          <Link
            href="/search"
            className="w-10 h-10 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 text-zinc-300 flex items-center justify-center shadow-xl active:scale-95 transition-all"
          >
            <Search className="w-5 h-5" />
          </Link>
          <Link
            href="/user-watchlist"
            className="relative w-10 h-10 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 text-zinc-300 flex items-center justify-center shadow-xl active:scale-95 transition-all"
          >
            <Bookmark className="w-5 h-5" />
            {watchCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shadow-lg border border-zinc-900">
                {watchCount > 99 ? "99+" : watchCount}
              </span>
            )}
          </Link>
          {user ? (
             <button
              onClick={() => router.push("/profile")}
              className="w-10 h-10 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 text-zinc-300 flex items-center justify-center shadow-xl overflow-hidden"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-[#0071eb] text-white text-[10px] font-bold">
                  {user.email?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          ) : (
            <Link
              href="/login"
              className="w-10 h-10 rounded-2xl bg-[#0071eb] text-white flex items-center justify-center shadow-xl active:scale-95 transition-all"
            >
              <User className="w-5 h-5" />
            </Link>
          )}
        </div>
      </div>

      {/* Desktop Header (Floating) */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-50 hidden md:flex items-center justify-between bg-zinc-900/70 backdrop-blur-xl border border-white/10 py-2.5 px-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-8">
          <Link href="/browse" className="flex-shrink-0 hover:scale-105 transition-transform">
            <Image
              src="/image.png"
              alt="Agasobanuye Movies Logo"
              width={36}
              height={32}
              className="object-contain"
              style={{ height: "auto" }}
            />
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map(({ href, label }, idx) => {
              const isActive = pathname === href
              return (
                <Link
                  key={idx}
                  href={href}
                  className={`px-4 py-2 rounded-2xl text-[14px] font-black tracking-wide transition-all ${
                    isActive
                      ? "bg-[#0071eb] text-white shadow-[0_0_20px_rgba(0,113,235,0.4)]"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Expanding Search */}
          <div 
            className={`relative flex items-center transition-all duration-300 ${
              isSearchExpanded ? "w-64" : "w-10"
            }`}
          >
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search movies, TV shows..."
              value={searchQuery}
              onChange={handleSearch}
              className={`w-full h-10 bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#0071eb] transition-all ${
                isSearchExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            />
            <button
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              className={`absolute left-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                isSearchExpanded || pathname === "/search"
                  ? "text-[#0071eb]"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Search className="w-5 h-5" />
            </button>
            {isSearchExpanded && searchQuery && (
              <button 
                onClick={() => { setSearchQuery(""); router.push("/browse"); }}
                className="absolute right-3 text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {headerIcons.map(({ href, label, icon: Icon }, idx) => {
            const isActive = pathname === href
            return (
              <Link
                key={idx}
                href={href}
                className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-[#0071eb] text-white"
                    : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label === "Watchlist" && watchCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shadow-lg border-2 border-zinc-900">
                    {watchCount > 99 ? "99+" : watchCount}
                  </span>
                )}
              </Link>
            )
          })}

          {/* User Auth Section */}
          <div className="ml-2">
            {!loading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 outline-none">
                      <Avatar className="h-10 w-10 border border-white/10 ring-2 ring-transparent hover:ring-[#0071eb] transition-all">
                        <AvatarImage src={user.user_metadata?.avatar_url} />
                        <AvatarFallback className="bg-[#0071eb] text-white font-black">
                          {user.email?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-xl">
                    <DropdownMenuLabel className="px-3 py-2">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-black text-white leading-none">Account</p>
                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem className="rounded-xl px-3 py-2 text-zinc-300 hover:bg-[#0071eb] hover:text-white cursor-pointer transition-colors font-bold" onClick={() => router.push("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-xl px-3 py-2 text-red-500 hover:bg-red-500/20 cursor-pointer transition-colors font-bold" onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login">
                  <button className="h-10 px-6 bg-[#0071eb] hover:bg-[#0071eb]/90 text-white text-sm font-black uppercase tracking-wide rounded-2xl shadow-[0_0_20px_rgba(0,113,235,0.3)] transition-all active:scale-95">
                    Sign In
                  </button>
                </Link>
              )
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden flex justify-around items-center py-3 bg-zinc-900/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] safe-area-pb">
        {visibleItems.map(({ href, label, icon: Icon }, idx) => {
          const isActive = pathname === href
          return (
            <Link
              key={idx}
              href={href}
              className={`flex flex-col items-center px-3 py-1 rounded-2xl transition-all ${
                isActive ? "text-[#0071eb] scale-110" : "text-zinc-500 hover:text-white"
              }`}
            >
              {Icon && <Icon className="w-6 h-6 mb-0.5" />}
              <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
            </Link>
          )
        })}

        <button
          onClick={() => setShowMoreMenu(true)}
          className="flex flex-col items-center px-3 py-1 text-zinc-500 hover:text-white transition-all"
        >
          <MoreHorizontal className="w-6 h-6 mb-0.5" />
          <span className="text-[10px] font-black uppercase tracking-tighter">More</span>
        </button>
      </div>

      {/* Mobile More Menu */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowMoreMenu(false)} />
          <div className="absolute inset-x-4 bottom-24 bg-zinc-900 border border-white/10 rounded-[2rem] p-6 max-h-[70vh] overflow-auto shadow-2xl" ref={moreMenuRef}>
            <div className="flex items-center justify-between mb-6">
              <div className="text-white font-black text-xl uppercase tracking-tight">Navigation</div>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {moreItems.map(({ href, label, icon: Icon }, idx) => {
                const isActive = pathname === href
                const isWatch = href === "/user-watchlist"
                const showBadge = isWatch && watchCount > 0

                return (
                  <Link
                    key={idx}
                    href={href}
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                      isActive ? "bg-[#0071eb]/20 border-[#0071eb]/50 text-white" : "bg-white/5 border-white/5 text-zinc-300"
                    }`}
                  >
                    <div className="relative">
                      {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                      {showBadge && (
                        <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary text-[8px] font-black flex items-center justify-center">
                          {watchCount}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold">{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
