'use client'

import { useEffect, useState, useRef, forwardRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  FileText,
  Sparkles,
  BookOpen,
  ArrowLeft,
  Download,
  Loader2,
  Search,
  List,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Target,
  ArrowUpDown,
  Hash,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/language-context'
import { fetchWithAuth } from '@/lib/api-client'



// Types
interface PDFHighlightChunk {
  id: string
  page_number: number
  title: string
  text: string
  highlight_text: string
  relevance_summary: string
}

interface PDFHighlightResponse {
  file_id: string
  filename: string
  question: string
  total_pages: number
  highlights: PDFHighlightChunk[]
  summary: string
}

interface FileInfo {
  id: string
  filename: string
  document_type: string
  size: string
  uploaded_at: string
  description?: string
  tags?: string[]
  total_pages: number
}

// Types for PDF Viewer Component
interface PDFViewerComponentProps {
  url: string
  currentPage: number
  scale: number
  highlightData: { page: number; text: string; summary: string; id: string }[]
  selectedHighlightId?: string | null
  scrollTrigger?: number
  onLoadSuccess: (numPages: number) => void
  onPageChange: (page: number) => void
  onHighlightClick: (id: string, summary: string) => void
}

const PDFViewerComponent = dynamic<PDFViewerComponentProps>(
  () => import('./pdf-viewer').then(mod => mod.default) as any,
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8 w-full h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
)

export default function PDFViewerPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const fileId = params.id as string
  const question = searchParams.get('q') || ''

  const { t } = useLanguage()

  // State
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [highlights, setHighlights] = useState<PDFHighlightResponse | null>(null)
  const [isLoadingFile, setIsLoadingFile] = useState(true)
  const [isLoadingHighlights, setIsLoadingHighlights] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)
  const [selectedChunk, setSelectedChunk] = useState<string | null>(null)
  const [scrollTrigger, setScrollTrigger] = useState(0)
  const [searchQuestion, setSearchQuestion] = useState(question)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'relevance' | 'page'>('relevance')

  // Refs
  const chunkRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Sidebar resize handlers
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = e.clientX
      setSidebarWidth(Math.max(200, Math.min(600, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  // Fetch file info
  useEffect(() => {
    const fetchFileInfo = async () => {
      try {
        const response = await fetchWithAuth(`/api/files/${fileId}/info`)
        if (!response.ok) throw new Error('Failed to fetch file info')
        const data = await response.json()
        setFileInfo(data)

        // Fetch PDF blob to handle authentication
        const pdfResponse = await fetchWithAuth(`/api/files/${fileId}/view`)
        if (!pdfResponse.ok) throw new Error('Failed to fetch PDF')
        const blob = await pdfResponse.blob()
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file')
      } finally {
        setIsLoadingFile(false)
      }
    }

    fetchFileInfo()
  }, [fileId])

  // Fetch highlights when question is provided
  useEffect(() => {
    if (!question || !fileId) return

    const fetchHighlights = async () => {
      setIsLoadingHighlights(true)
      try {
        const response = await fetchWithAuth(
          `/api/files/${fileId}/highlights?question=${encodeURIComponent(question)}`,
          { method: 'POST' }
        )
        if (!response.ok) throw new Error('Failed to fetch highlights')
        const data = await response.json()
        setHighlights(data)
      } catch (err) {
        console.error('Failed to fetch highlights:', err)
      } finally {
        setIsLoadingHighlights(false)
      }
    }

    fetchHighlights()
  }, [fileId, question])

  // Handle search with new question
  const handleSearch = async () => {
    if (!searchQuestion.trim()) return

    setIsLoadingHighlights(true)
    try {
      const response = await fetchWithAuth(
        `/api/files/${fileId}/highlights?question=${encodeURIComponent(searchQuestion)}`,
        { method: 'POST' }
      )
      if (!response.ok) throw new Error('Failed to fetch highlights')
      const data = await response.json()
      setHighlights(data)

      // Update URL without reload
      const url = new URL(window.location.href)
      url.searchParams.set('q', searchQuestion)
      window.history.pushState({}, '', url.toString())
    } catch (err) {
      console.error('Failed to fetch highlights:', err)
    } finally {
      setIsLoadingHighlights(false)
    }
  }

  // PDF load success handler
  const onDocumentLoadSuccess = (pages: number) => {
    setNumPages(pages)
  }

  // Handle page change from PDF viewer (user scroll)
  const onPageChange = (page: number) => {
    setCurrentPage(page)
    // Don't auto-select chunks when user scrolls - only update page number
  }

  // Navigate to chunk - scroll PDF to that highlight
  const navigateToChunk = (chunk: PDFHighlightChunk) => {
    setSelectedChunk(chunk.id)
    setCurrentPage(chunk.page_number)
    setScrollTrigger(prev => prev + 1) // Trigger scroll to highlight
  }

  // Zoom controls
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3))
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))

  // Build highlight data for PDF viewer - use highlight_text for precise matching
  const getHighlightData = () => {
    if (!highlights) return []
    return highlights.highlights.map(h => ({
      page: h.page_number,
      text: h.highlight_text,  // Use the LLM-refined highlight text for matching
      summary: h.relevance_summary,
      id: h.id,
      title: h.title  // Include title for tooltip
    }))
  }

  // Handle highlight click from PDF viewer - scroll to chunk in sidebar
  const handleHighlightClick = (id: string, summary: string) => {
    setSelectedChunk(id)

    // Scroll to the chunk in sidebar
    if (sidebarRef.current && chunkRefs.current[id]) {
      const chunkElement = chunkRefs.current[id]
      const sidebarElement = sidebarRef.current

      if (chunkElement && sidebarElement) {
        const scrollOffset = chunkElement.offsetTop - sidebarElement.offsetTop - 20
        sidebarElement.scrollTo({
          top: scrollOffset,
          behavior: 'smooth'
        })
      }
    }
  }

  if (isLoadingFile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading PDF viewer...</p>
        </div>
      </div>
    )
  }

  if (error || !fileInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">File Not Found</h2>
            <p className="text-muted-foreground">{error || 'The requested file could not be loaded.'}</p>
            <Button asChild>
              <Link href="/files">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Files
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-none bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b z-50">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left: Back button and file info */}
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-md hover:shadow-primary/30" asChild>
                    <Link href="/inquiry">
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back to Inquiry</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-6" />

            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-medium truncate max-w-[200px] md:max-w-[400px]">
                {fileInfo.filename}
              </span>
              <Badge variant="outline" className="text-xs">
                {numPages || fileInfo.total_pages} pages
              </Badge>
            </div>
          </div>

          {/* Center: Page navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-md hover:shadow-primary/30  disabled:hover:scale-100 disabled:hover:bg-transparent disabled:hover:shadow-none"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 px-2">
              <input
                type="number"
                min={1}
                max={numPages || 1}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value)
                  if (page >= 1 && page <= numPages) {
                    setCurrentPage(page)
                  }
                }}
                className="w-12 text-center text-sm font-medium bg-transparent border rounded px-1 py-0.5"
              />
              <span className="text-sm text-muted-foreground">/ {numPages || '?'}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className="cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-md hover:shadow-primary/30  disabled:hover:scale-100 disabled:hover:bg-transparent disabled:hover:shadow-none"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={zoomOut} className="cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-md hover:shadow-primary/30 ">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <span className="text-sm text-muted-foreground w-12 text-center">
              {Math.round(scale * 100)}%
            </span>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={zoomIn} className="cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-md hover:shadow-primary/30 ">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-6 mx-2" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-md hover:shadow-primary/30 ">
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{sidebarOpen ? 'Hide' : 'Show'} Sidebar</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-md hover:shadow-primary/30" onClick={async () => {
                    try {
                      const response = await fetchWithAuth(`/api/files/${fileId}/download`);
                      if (!response.ok) throw new Error("Download failed");
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = fileInfo.filename;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch (error) {
                      console.error("Download error", error);
                    }
                  }}>
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download PDF</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          ref={sidebarRef}
          className={cn(
            "flex-none bg-card border-r transition-[width] overflow-y-auto relative",
            sidebarOpen ? "" : "w-0 border-r-0 overflow-hidden"
          )}
          style={{ width: sidebarOpen ? sidebarWidth : 0 }}
        >
          {sidebarOpen && (
            <>
              <div className="p-4 space-y-4">
                {/* Search Box */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Ask about this document..."
                      value={searchQuestion}
                      onChange={(e) => setSearchQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSearch}
                    disabled={isLoadingHighlights || !searchQuestion.trim()}
                    className="cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-to-r from-primary to-accent hover:shadow-md hover:shadow-primary/30 disabled:hover:scale-100 disabled:hover:shadow-none"
                  >
                    {isLoadingHighlights ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* AI Summary */}
                {highlights && (
                  <div className="p-3 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-accent flex-none">
                        <Sparkles className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1.5">
                          AI Summary
                        </h3>
                        <p className="text-xs text-foreground/80 leading-relaxed">
                          {highlights.summary}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Relevant Chunks List */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Relevant Sections
                      {highlights && (
                        <Badge variant="secondary" className="text-xs">
                          {highlights.highlights.length}
                        </Badge>
                      )}
                    </h3>

                    {/* Sort Toggle */}
                    {highlights && highlights.highlights.length > 1 && (
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={sortBy === 'relevance' ? 'default' : 'outline'}
                                size="sm"
                                className={cn(
                                  "h-7 px-2 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95",
                                  sortBy === 'relevance'
                                    ? "bg-gradient-to-r from-primary to-accent shadow-md shadow-primary/30 border-primary/30"
                                    : "hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-md hover:shadow-primary/30"
                                )}
                                onClick={() => setSortBy('relevance')}
                              >
                                <TrendingUp className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Sort by Relevance</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={sortBy === 'page' ? 'default' : 'outline'}
                                size="sm"
                                className={cn(
                                  "h-7 px-2 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95",
                                  sortBy === 'page'
                                    ? "bg-gradient-to-r from-primary to-accent shadow-md shadow-primary/30"
                                    : "hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-md hover:shadow-primary/30"
                                )}
                                onClick={() => setSortBy('page')}
                              >
                                <Hash className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Sort by Page Number</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>

                  {isLoadingHighlights ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-16 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : highlights && highlights.highlights.length > 0 ? (
                    <div className="space-y-3">
                      {[...highlights.highlights]
                        .sort((a, b) => {
                          if (sortBy === 'page') {
                            return a.page_number - b.page_number
                          }
                          // Keep original order for relevance (already sorted by AI)
                          return 0
                        })
                        .map((chunk, index) => {
                          return (
                            <ChunkCard
                              key={chunk.id}
                              ref={(el) => { chunkRefs.current[chunk.id] = el }}
                              chunk={chunk}
                              index={index}
                              isSelected={selectedChunk === chunk.id}
                              onClick={() => navigateToChunk(chunk)}
                            />
                          )
                        })}
                    </div>
                  ) : question ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No relevant sections found</p>
                      <p className="text-xs mt-1">Try a different question</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Ask a question to find relevant sections</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Resize Handle */}
              <div
                onMouseDown={startResizing}
                className={cn(
                  "absolute top-0 right-0 w-1 h-full cursor-col-resize group",
                  "hover:bg-primary/20 active:bg-primary/30 transition-colors",
                  isResizing && "bg-primary/30"
                )}
              >
                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </>
          )}
        </aside>

        {/* PDF Viewer */}
        <main className="flex-1 overflow-hidden bg-muted/30 relative">
          {pdfUrl && (
            <PDFViewerComponent
              url={pdfUrl}
              currentPage={currentPage}
              scale={scale}
              highlightData={getHighlightData()}
              selectedHighlightId={selectedChunk}
              scrollTrigger={scrollTrigger}
              onLoadSuccess={onDocumentLoadSuccess}
              onPageChange={onPageChange}
              onHighlightClick={handleHighlightClick}
            />
          )}
        </main>
      </div>
    </div>
  )
}

// Orange theme color for highlights (matching pdf-viewer)
const HIGHLIGHT_COLOR = 'rgba(249, 115, 22, 0.35)'  // Orange theme color

// Chunk Card Component
interface ChunkCardProps {
  chunk: PDFHighlightChunk
  index: number
  isSelected: boolean
  onClick: () => void
}

const ChunkCard = forwardRef<HTMLDivElement, ChunkCardProps>(
  ({ chunk, index, isSelected, onClick }, ref) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              ref={ref}
              role="button"
              tabIndex={0}
              onClick={onClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClick()
                }
              }}
              className={cn(
                "w-full text-left rounded-lg border transition-all duration-200 cursor-pointer group",
                "hover:border-primary hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                isSelected
                  ? "border-primary shadow-md ring-2 ring-primary/20 bg-gradient-to-br from-primary/10 to-accent/10 scale-[1.01]"
                  : "border-border bg-card hover:bg-gradient-to-br hover:from-primary/5 hover:to-accent/5"
              )}
            >
              {/* Header */}
              <div className="p-3">
                <div className="flex items-start gap-2">
                  {/* Color indicator with pulse animation on hover */}
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full flex-none mt-0.5 transition-all",
                      "group-hover:ring-2 group-hover:ring-primary/30",
                      isSelected && "ring-2 ring-primary/50"
                    )}
                    style={{ backgroundColor: HIGHLIGHT_COLOR }}
                  />
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                      {chunk.title}
                    </h4>
                    {/* Page badge */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs group-hover:border-primary/50 transition-colors">
                        Page {chunk.page_number}
                      </Badge>
                      <span className="text-xs text-muted-foreground">#{index + 1}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary & Insight */}
              <div className="px-3 pb-3">
                <div className="p-2 rounded-md bg-primary/5 border border-primary/10 group-hover:border-primary/20 transition-colors">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary flex-none mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary mb-1">Summary & Insight</p>
                      <p className="text-xs text-foreground/80 leading-relaxed">
                        {chunk.relevance_summary}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[250px]">
            <p className="text-xs">Click to navigate to this section in the PDF</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
)

ChunkCard.displayName = 'ChunkCard'
