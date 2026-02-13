'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { Loader2 } from 'lucide-react'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface HighlightData {
  page: number
  text: string
  summary: string
  id: string
  title?: string
}

// Orange theme color for highlights - consistent with app theme
const HIGHLIGHT_COLOR = 'rgba(249, 115, 22, 0.2)'  // Orange with low transparency
const HIGHLIGHT_COLOR_HOVER = 'rgba(249, 115, 22, 0.35)'  // Orange darker on hover
const HIGHLIGHT_COLOR_SELECTED = 'rgba(249, 115, 22, 0.5)'  // Orange darkest when selected

interface PDFViewerProps {
  url: string
  currentPage: number
  scale: number
  highlightData: HighlightData[]
  selectedHighlightId?: string | null
  scrollTrigger?: number
  onLoadSuccess: (numPages: number) => void
  onPageChange: (page: number) => void
  onHighlightClick: (id: string, summary: string) => void
}

export default function PDFViewer({
  url,
  currentPage,
  scale,
  highlightData,
  selectedHighlightId: externalSelectedId,
  scrollTrigger,
  onLoadSuccess,
  onPageChange,
  onHighlightClick,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const [numPages, setNumPages] = useState<number>(0)
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set())
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null)
  const [hoveredHighlightId, setHoveredHighlightId] = useState<string | null>(null)
  const [tooltipData, setTooltipData] = useState<{ title: string; x: number; y: number } | null>(null)
  const isUserScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastRequestedPageRef = useRef<number>(currentPage)
  const lastScrollTriggerRef = useRef<number>(0)
  
  // Handle document load success
  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    onLoadSuccess(numPages)
  }
  
  // Scroll to current page when it changes from parent (button click)
  useEffect(() => {
    if (!containerRef.current || numPages === 0) return
    
    // Only scroll if the page change came from parent (button click), not from scroll detection
    if (lastRequestedPageRef.current === currentPage) return
    lastRequestedPageRef.current = currentPage
    
    const pageElement = pageRefs.current[currentPage]
    if (pageElement) {
      // Temporarily disable scroll detection
      isUserScrollingRef.current = false
      
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      
      // Re-enable scroll detection after animation completes
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = true
      }, 600)
    }
  }, [currentPage, numPages])
  
  // Sync selected highlight with external prop (without scrolling)
  useEffect(() => {
    if (externalSelectedId) {
      setSelectedHighlightId(externalSelectedId)
    }
  }, [externalSelectedId])
  
  // Scroll to highlight only when scrollTrigger changes (user clicked a chunk)
  useEffect(() => {
    if (!scrollTrigger || scrollTrigger === lastScrollTriggerRef.current) return
    if (!externalSelectedId || !containerRef.current) return
    
    lastScrollTriggerRef.current = scrollTrigger
    
    // Find the first span with this highlight ID and scroll to it
    setTimeout(() => {
      const highlightSpan = containerRef.current?.querySelector(
        `span[data-highlight-id="${externalSelectedId}"]`
      ) as HTMLElement
      
      if (highlightSpan) {
        isUserScrollingRef.current = false
        
        highlightSpan.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        })
        
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        scrollTimeoutRef.current = setTimeout(() => {
          isUserScrollingRef.current = true
        }, 600)
      }
    }, 100)
  }, [scrollTrigger, externalSelectedId])
  
  // Enable scroll detection after initial load
  useEffect(() => {
    if (numPages > 0) {
      setTimeout(() => {
        isUserScrollingRef.current = true
      }, 1000)
    }
  }, [numPages])
  
  // Handle scroll to detect current visible page
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !isUserScrollingRef.current) return
    
    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()
    const containerTop = containerRect.top
    
    // Find the page that's most visible at the top
    let visiblePage = 1
    
    for (let i = 1; i <= numPages; i++) {
      const pageElement = pageRefs.current[i]
      if (pageElement) {
        const pageRect = pageElement.getBoundingClientRect()
        // Check if page top is above container center
        if (pageRect.top <= containerTop + 100) {
          visiblePage = i
        }
      }
    }
    
    if (visiblePage !== lastRequestedPageRef.current) {
      lastRequestedPageRef.current = visiblePage
      onPageChange(visiblePage)
    }
  }, [numPages, onPageChange])
  
  // Add scroll listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }
    
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', onScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [handleScroll])
  
  // Extract words from text for matching
  const extractWords = (text: string): string[] => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Replace punctuation with space
      .split(/\s+/)
      .filter(w => w.length > 2)  // Only words with 3+ chars
  }
  
  // Check if two words match (simple substring matching like Ctrl+F)
  const wordsMatch = (word1: string, word2: string): boolean => {
    return word1.includes(word2) || word2.includes(word1)
  }
  
  // Find word position in span array
  const findWordInSpans = (
    targetWord: string, 
    spanData: { index: number; words: string[] }[],
    afterIndex: number = -1,
    beforeIndex: number = Infinity
  ): number[] => {
    const positions: number[] = []
    for (const span of spanData) {
      if (span.index <= afterIndex || span.index >= beforeIndex) continue
      if (span.words.some(w => wordsMatch(w, targetWord))) {
        positions.push(span.index)
      }
    }
    return positions
  }
  
  // Apply highlight styles using bracket narrowing algorithm
  const applyHighlights = useCallback(() => {
    // Collect all spans from all rendered pages
    const allSpans: { span: HTMLElement; pageNum: number; localIndex: number }[] = []
    
    renderedPages.forEach(pageNum => {
      const pageElement = pageRefs.current[pageNum]
      if (!pageElement) return
      
      const textLayer = pageElement.querySelector('.react-pdf__Page__textContent')
      if (!textLayer) return
      
      const textSpans = Array.from(textLayer.querySelectorAll('span')) as HTMLElement[]
      
      // Clear previous highlights from these spans
      textSpans.forEach(span => {
        span.style.backgroundColor = ''
        span.style.borderRadius = ''
        span.style.cursor = ''
        span.title = ''
        delete span.dataset.highlightId
        delete span.dataset.highlightSummary
        delete span.dataset.highlightTitle
        span.onclick = null
        span.onmouseenter = null
        span.onmouseleave = null
      })
      
      textSpans.forEach((span, idx) => {
        allSpans.push({ span, pageNum, localIndex: idx })
      })
    })
    
    if (allSpans.length === 0) return
    
    // Build global span data with extracted words
    const spanData = allSpans.map((spanInfo, idx) => ({
      index: idx,
      words: extractWords(spanInfo.span.textContent || ''),
      span: spanInfo.span
    }))
    
    // Try to match ALL highlights across the entire document 
    highlightData.forEach((highlight) => {
    //   console.log('🎯 Processing highlight:', highlight.id)
    //   console.log('   Text to match:', highlight.text)
      
      const highlightWords = extractWords(highlight.text)
    //   console.log('   Extracted words:', highlightWords.length, 'words')
    //   console.log('   First/Last:', highlightWords[0], '/', highlightWords[highlightWords.length - 1])
      
      if (highlightWords.length < 2) {
        // console.log('   ❌ Too few words, skipping')
        return
      }
      
      const firstWord = highlightWords[0]
      const lastWord = highlightWords[highlightWords.length - 1]
      
      // Step 1: Find all start word positions and end word positions
      const startPositions = findWordInSpans(firstWord, spanData)
      const endPositions = findWordInSpans(lastWord, spanData)
      
    //   console.log('   Start positions found:', startPositions.length)
    //   console.log('   End positions found:', endPositions.length)
      
      if (startPositions.length === 0 || endPositions.length === 0) {
        console.log('   ❌ No start/end positions found')
        return
      }
      
      // Step 2: Generate all valid combinations (start before end, max 500 spans apart)
      let candidates: { start: number; end: number }[] = []
      
      for (const start of startPositions) {
        for (const end of endPositions) {
          if (end > start && (end - start) <= 500) {
            candidates.push({ start, end })
          }
        }
      }
      
      candidates.sort((a, b) => (a.end - a.start) - (b.end - b.start))
      
    //   console.log('   Initial candidates:', candidates.length)
      
      if (candidates.length === 0) {
        // console.log('   ❌ No valid candidates')
        return
      }
      
      // Step 3: Filter candidates - must contain ALL words from highlight text
      // Get unique words (skip very common words that don't help)
      const commonWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'are', 'was', 'will', 'from', 'have', 'has'])
      const uniqueWords = [...new Set(highlightWords)].filter(w => !commonWords.has(w))
      
      console.log(`   🔍 Checking for ${uniqueWords.length} unique words (filtered out common words)`)
      
      candidates = candidates.filter(cand => {
        // Collect all words in this candidate's range
        const rangeWords = new Set<string>()
        for (let i = cand.start; i <= cand.end; i++) {
          spanData[i]?.words.forEach(w => rangeWords.add(w))
        }
        
        // Check if all unique highlight words appear in this range
        for (const word of uniqueWords) {
          let found = false
          for (const rw of rangeWords) {
            if (wordsMatch(word, rw)) {
              found = true
              break
            }
          }
          if (!found) return false
        }
        return true
      })
      
      console.log(`   ✓ After word filtering: ${candidates.length} candidates remain`)
      
      if (candidates.length === 0) {
        console.log('   ❌ No candidates contain all required words')
        return
      }
      
      // Pick the smallest range (candidates are already sorted)
      const bestCandidate = candidates[0]
      console.log('   → Selected candidate (smallest range):', candidates.length, 'total candidates')
      
      console.log('   ✅ Selected range:', bestCandidate.start, '-', bestCandidate.end, `(${bestCandidate.end - bestCandidate.start + 1} spans)`)
      console.log('   Full Text Snippet:', spanData.slice(bestCandidate.start, bestCandidate.end + 1).map(s => s.span.textContent).join(' ')) 
      
      // Apply highlight with hover and click states
      if (bestCandidate) {
        for (let i = bestCandidate.start; i <= bestCandidate.end; i++) {
          const spanInfo = spanData[i]
          if (spanInfo && spanInfo.span) {
            const el = spanInfo.span
            const isSelected = selectedHighlightId === highlight.id || externalSelectedId === highlight.id
            const isHovered = hoveredHighlightId === highlight.id
            
            el.style.backgroundColor = isSelected ? HIGHLIGHT_COLOR_SELECTED : (isHovered ? HIGHLIGHT_COLOR_HOVER : HIGHLIGHT_COLOR)
            el.style.borderRadius = '2px'
            el.style.cursor = 'pointer'
            el.style.transition = 'all 0.2s ease'
            el.style.transform = isHovered ? 'scale(1.002)' : 'scale(1)'
            el.style.boxShadow = isSelected ? '0 2px 8px rgba(249, 115, 22, 0.30)' : (isHovered ? '0 1px 4px rgba(249, 115, 22, 0.25)' : 'none')
            el.dataset.highlightId = highlight.id
            el.dataset.highlightSummary = highlight.summary
            if (highlight.title) {
              el.dataset.highlightTitle = highlight.title
            }
            
            el.onmouseenter = (e) => {
              setHoveredHighlightId(highlight.id)
              // Show tooltip
              const rect = el.getBoundingClientRect()
              setTooltipData({
                title: highlight.title || highlight.summary,
                x: rect.left + rect.width / 2,
                y: rect.top - 8
              })
            }
            
            el.onmouseleave = () => {
              setHoveredHighlightId(null)
              setTooltipData(null)
            }
            
            el.onclick = (e) => {
              e.stopPropagation()
              setSelectedHighlightId(highlight.id)
              onHighlightClick(highlight.id, highlight.summary)
            }
          }
        }
      }
    })
  }, [highlightData, onHighlightClick, renderedPages, selectedHighlightId, hoveredHighlightId, externalSelectedId])
  
  // Update highlight colors when hover/selection changes
  useEffect(() => {
    if (renderedPages.size === 0) return
    
    renderedPages.forEach(pageNum => {
      const pageElement = pageRefs.current[pageNum]
      if (!pageElement) return
      
      const textLayer = pageElement.querySelector('.react-pdf__Page__textContent')
      if (!textLayer) return
      
      const textSpans = Array.from(textLayer.querySelectorAll('span[data-highlight-id]')) as HTMLElement[]
      
      textSpans.forEach(el => {
        const highlightId = el.dataset.highlightId
        if (!highlightId) return
        
        const isSelected = selectedHighlightId === highlightId || externalSelectedId === highlightId
        const isHovered = hoveredHighlightId === highlightId
        
        el.style.backgroundColor = isSelected ? HIGHLIGHT_COLOR_SELECTED : (isHovered ? HIGHLIGHT_COLOR_HOVER : HIGHLIGHT_COLOR)
        el.style.transform = isHovered ? 'scale(1.01)' : 'scale(1)'
        el.style.boxShadow = isSelected ? '0 2px 8px rgba(249, 115, 22, 0.3)' : (isHovered ? '0 1px 4px rgba(249, 115, 22, 0.2)' : 'none')
      })
    })
  }, [hoveredHighlightId, selectedHighlightId, externalSelectedId, renderedPages])
  
  // Re-apply highlights when highlightData or rendered pages change
  useEffect(() => {
    if (highlightData.length === 0 || renderedPages.size === 0) return
    
    // Apply highlights across all pages at once
    applyHighlights()
  }, [highlightData, renderedPages, applyHighlights])
  
  // Handle page render success
  const handlePageRenderSuccess = (pageNumber: number) => {
    setRenderedPages(prev => new Set([...prev, pageNumber]))
  }
  
  return (
    <div 
      ref={containerRef}
      className="h-full overflow-auto scroll-smooth relative"
    >
      {/* Custom Tooltip */}
      {tooltipData && (
        <div
          className="fixed z-[100] px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg pointer-events-none max-w-[280px] text-center animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            left: tooltipData.x,
            top: tooltipData.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {tooltipData.title}
          <div 
            className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
          />
        </div>
      )}
      
      <Document
        file={url}
        onLoadSuccess={handleDocumentLoadSuccess}
        loading={
          <div className="flex items-center justify-center p-8 min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
        error={
          <div className="flex items-center justify-center p-8 min-h-[400px] text-destructive">
            Failed to load PDF document
          </div>
        }
        className="flex flex-col items-center gap-4 p-4"
      >
        {Array.from(new Array(numPages), (_, index) => {
          const pageNumber = index + 1
          return (
            <div
              key={`page_${pageNumber}`}
              ref={(el) => { pageRefs.current[pageNumber] = el }}
              className="relative shadow-lg"
              id={`pdf-page-${pageNumber}`}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                loading={
                  <div className="flex items-center justify-center bg-white" style={{ width: 595 * scale, height: 842 * scale }}>
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                }
                onRenderSuccess={() => handlePageRenderSuccess(pageNumber)}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
              {/* Page number indicator */}
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                {pageNumber} / {numPages}
              </div>
            </div>
          )
        })}
      </Document>
    </div>
  )
}
