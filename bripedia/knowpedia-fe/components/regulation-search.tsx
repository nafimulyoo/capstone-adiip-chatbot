"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Loader2,
  LayoutGrid,
  List,
  Sparkles,
  Bot,
  BookOpen,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RegulationResultCard from "@/components/regulation-result-card";
import AISummaryBox from "@/components/ai-summary-box";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "../components/ui/language-toggle";
import { useLanguage } from "@/contexts/language-context";
import type { SearchSummaryResponse, ContentHighlightData } from "@/lib/api-types";
import { fetchWithAuth } from "@/lib/api-client";

const capitalize = (str: string) => str.replace(/\b\w/g, l => l.toUpperCase());

type ArticleItem = {
  id: string;
  title: string;
  description: string;
  snippet: string;
  lastUpdated: string;
  tags: string[];
  content: string;
  source_type: "internal" | "external";
  score: number;
  highlightLoading?: boolean;
  search_snippet_highlighted?: string[];
  relevant_chunks?: string[];
  allowed_groups?: string[];
  allowed_levels?: string[];
};



export default function RegulationSearch() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [query, setQuery] = useState(searchParams.get('q') || "");
  const [results, setResults] = useState<ArticleItem[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!searchParams.get('q'));
  const [resultLimit, setResultLimit] = useState(Number(searchParams.get('size')) || 10);
  const [columns, setColumns] = useState<1 | 2>(2);
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [totalResults, setTotalResults] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchSummary, setSearchSummary] = useState<any[]>([]);
  const [showAiSummary, setShowAiSummary] = useState(searchParams.get('ai_summary') !== 'false');
  const [searchType, setSearchType] = useState<"all" | "internal" | "external">((searchParams.get('type') as any) || "all");
  const [useRelevantChunks, setUseRelevantChunks] = useState(false); // Disabled for now as we don't have highlight endpoint for global search yet
  const [citedPosts, setCitedPosts] = useState<Record<string, string> | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const fetchedHighlights = useRef<Set<string>>(new Set());
  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Update URL with current search state
  const updateURL = useCallback((params: Record<string, string | number | boolean>) => {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      urlParams.set(key, String(value));
    });
    router.push(`/search?${urlParams.toString()}`);
  }, [router]);

  // Update URL and show refresh button (don't auto-fetch)
  const updateURLWithRefresh = useCallback((params: Record<string, string | number | boolean>) => {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      urlParams.set(key, String(value));
    });
    router.push(`/search?${urlParams.toString()}`);
    setNeedsRefresh(true);
  }, [router]);

  const fetchSearchFromAPI = useCallback(
    async (searchQuery: string, page: number) => {
      try {
        const response = await fetchWithAuth(
          `/api/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`
        );
        if (!response.ok) throw new Error("Search failed");

        const data = await response.json();
        const results = data.results || [];

        // Mock pagination for now since backend returns all
        const limit = resultLimit;
        const offset = (page - 1) * limit;
        const paginated = results.slice(offset, offset + limit);
        const total = results.length;

        const articles: ArticleItem[] = paginated.map((result: any) => {
          return {
            id: result.id,
            title: result.title,
            description: result.metadata?.description ? capitalize(result.metadata.description) : "",
            snippet: result.content.substring(0, 200) + "...",
            lastUpdated: new Date().toISOString(), // Mock
            tags: result.metadata?.tags || [], // Use correct tags from metadata
            content: result.content,
            source_type: result.source_type,
            score: result.score,
            highlightLoading: false,
            relevant_chunks: result.relevant_chunks || [],
            allowed_groups: result.metadata?.allowed_groups || [],
            allowed_levels: result.metadata?.allowed_levels || [],
          };
        });

        return {
          articles,
          total: total,
        };
      } catch (error) {
        console.error("API Error:", error);
        return null;
      }
    },
    [resultLimit, useRelevantChunks, searchType]
  );

  const fetchSummaryFromAPI = useCallback(
    async (searchQuery: string, topK: number) => {
      try {
        const response = await fetchWithAuth(
          `/api/search/overview?q=${encodeURIComponent(searchQuery)}&type=${searchType}&top_k=${topK}`
        );
        if (!response.ok) throw new Error("Summary failed");

        const data: SearchSummaryResponse = await response.json();
        return {
          search_summary: data.search_summary || [],
          cited_posts: data.cited_files || null,
          cited_files: data.cited_files || null,
        };
      } catch (error) {
        console.error("Summary API Error:", error);
        return null;
      }
    },
    [searchType]
  );

  const fetchHighlightFromAPI = useCallback(
    async (postId: string, searchQuery: string) => {
      try {
        const response = await fetchWithAuth(
          `/api/posts/search/highlight/${postId}?q=${encodeURIComponent(searchQuery)}`
        );
        if (!response.ok) throw new Error("Highlight failed");
        const data = await response.json();
        return data as ContentHighlightData;
      } catch (error) {
        console.error("Highlight API Error:", error);
        return null;
      }
    },
    []
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingResults &&
          !loadingMore &&
          hasSearched &&
          results.length < totalResults
        ) {
          loadMoreResults();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [results.length, totalResults, loadingResults, loadingMore, hasSearched]);

  // Perform search when URL params change
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery) {
      performSearch(urlQuery, Number(searchParams.get('page')) || 1);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery: string, page: number) => {
    setLoadingResults(true);
    setLoadingSummary(showAiSummary && page === 1);
    setHasSearched(true);
    setCurrentPage(page);
    if (page === 1) {
      setResults([]);
      setSearchSummary([]);
      setCitedPosts(null);
    }

    const summaryPromise = showAiSummary && page === 1
      ? fetchSummaryFromAPI(searchQuery, 10)
      : null;

    const data = await fetchSearchFromAPI(searchQuery, page);
    if (data) {
      const newIds: string[] = [];
      if (page === 1) {
        // Reset and mark highlights loading
        const prepared = useRelevantChunks
          ? data.articles.map((a) => ({ ...a, highlightLoading: true }))
          : data.articles.map((a) => ({ ...a, highlightLoading: false, snippet: a.description }));
        setResults(prepared);
        newIds.push(...data.articles.map((a) => a.id));
        fetchedHighlights.current = new Set();
      } else {
        setResults((prev) => {
          const merged = [
            ...prev,
            ...data.articles.map((a) => ({
              ...a,
              highlightLoading: useRelevantChunks,
              snippet: useRelevantChunks ? "" : a.description,
            })),
          ];
          newIds.push(...data.articles.map((a) => a.id));
          return merged;
        });
      }
      setTotalResults(data.total);

      if (useRelevantChunks) {
        newIds.forEach((id) => {
          if (fetchedHighlights.current.has(id)) return;
          fetchedHighlights.current.add(id);
          fetchHighlightFromAPI(id, searchQuery).then((highlight) => {
            if (!highlight) return;
            setResults((prev) =>
              prev.map((r) =>
                r.id === id
                  ? {
                    ...r,
                    snippet: highlight.search_snippet || r.snippet,
                    content: highlight.search_snippet || r.content,
                    search_snippet_highlighted: highlight.search_snippet_highlighted || [],
                    relevant_chunks: highlight.relevant_chunks || [],
                    highlightLoading: false,
                  }
                  : r
              )
            );
          });
        });
      }
    }

    setLoadingResults(false);

    if (summaryPromise) {
      const summary = await summaryPromise;
      if (summary) {
        setSearchSummary(summary.search_summary || []);
        setCitedPosts(summary.cited_posts || summary.cited_files || null);
      }
      setLoadingSummary(false);
    } else {
      setLoadingSummary(false);
    }
  };

  const loadMoreResults = async () => {
    if (!query.trim()) return;

    setLoadingMore(true);
    const nextPage = currentPage + 1;

    const data = await fetchSearchFromAPI(query, nextPage);
    if (data) {
      setResults((prev) => {
        const merged = [
          ...prev,
          ...data.articles.map((a) => ({
            ...a,
            highlightLoading: useRelevantChunks,
            snippet: useRelevantChunks ? "" : a.description,
          })),
        ];
        return merged;
      });
      setTotalResults(data.total);
      setCurrentPage(nextPage);

      if (useRelevantChunks) {
        data.articles.forEach((article) => {
          if (fetchedHighlights.current.has(article.id)) return;
          fetchedHighlights.current.add(article.id);
          fetchHighlightFromAPI(article.id, query).then((highlight) => {
            if (!highlight) return;
            setResults((prev) =>
              prev.map((r) =>
                r.id === article.id
                  ? {
                    ...r,
                    snippet: highlight.search_snippet || r.snippet,
                    content: highlight.search_snippet || r.content,
                    search_snippet_highlighted: highlight.search_snippet_highlighted || [],
                    relevant_chunks: highlight.relevant_chunks || [],
                    highlightLoading: false,
                  }
                  : r
              )
            );
          });
        });
      }
      // Don't update search_summary on pagination
    }

    setLoadingMore(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Update URL with search params
    updateURL({
      q: query,
      page: 1,
      size: resultLimit,
      type: searchType
    });
  };

  const handleExampleSearch = (example: string) => {
    setQuery(example);
    // Update URL which will trigger the search
    updateURL({
      q: example,
      page: 1,
      size: resultLimit,
      type: searchType
    });
  };

  const exampleSearches = [
    t("example.privacy"),
    t("example.management"),
    t("example.ai"),
    t("example.finance"),
  ];

  return (
    <div className="min-h-screen">
      <div className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl blur-md opacity-60 animate-pulse" />
                  <div className="relative bg-gradient-to-br from-primary to-accent p-4 rounded-2xl shadow-lg">
                    <Search className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
                <h1 className="text-5xl md:text-6xl font-bold text-balance animate-in fade-in slide-in-from-bottom-4 duration-700">
                  Search
                </h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-10 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100">
            <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
            <p className="text-muted-foreground text-lg">
              {t("search.headerSubtitle")}
            </p>
          </div>
          <form
            onSubmit={handleSearch}
            className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200"
          >
            <div className="relative">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <Input
                    type="text"
                    placeholder={t("search.placeholder")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-12 h-14 text-base bg-card border-2 border-border hover:border-primary/30 focus:border-primary transition-all duration-300 rounded-xl shadow-sm"
                    disabled={loadingResults}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="h-14 px-8 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                  disabled={loadingResults || !query.trim()}
                >
                  {loadingResults ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      {t("search.button")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-1 duration-700 delay-300">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <span className="text-sm font-medium text-foreground">
                {t("search.trySearching")}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {exampleSearches.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => handleExampleSearch(example)}
                  className="px-4 py-2 text-sm font-medium rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground border border-border transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm animate-in fade-in slide-in-from-bottom duration-700 delay-400">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-medium">
                {t("filters.results")}
              </span>
              {[5, 10, 15, 20].map((limit) => (
                <button
                  key={limit}
                  type="button"
                  onClick={() => setResultLimit(limit)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${resultLimit === limit
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                    }`}
                >
                  {limit}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-medium">
                {t("filters.layout")}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setColumns(1)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer ${columns === 1
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                    }`}
                  title="Single column"
                >
                  <List className="h-4 w-4" />
                  {t("filters.oneCol")}
                </button>
                <button
                  type="button"
                  onClick={() => setColumns(2)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer ${columns === 2
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                    }`}
                  title="Two columns"
                >
                  <LayoutGrid className="h-4 w-4" />
                  {t("filters.twoCol")}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Bot className="h-4 w-4" />
                AI Summary
              </span>
              <button
                type="button"
                onClick={() => {
                  const newValue = !showAiSummary;
                  setShowAiSummary(newValue);
                  if (query) {
                    updateURLWithRefresh({
                      q: query,
                      page: 1,
                      size: resultLimit,
                      ai_summary: newValue,
                      ai_highlights: useRelevantChunks
                    });
                  }
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer ${showAiSummary
                  ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                  }`}
                title={showAiSummary ? "Disable AI summary" : "Enable AI summary"}
              >
                <Sparkles className="h-4 w-4" />
                {showAiSummary ? "On" : "Off"}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                Filter
              </span>
              <div className="flex gap-2">
                {["all", "internal", "external"].map((tOption) => (
                  <button
                    key={tOption}
                    type="button"
                    onClick={() => {
                      setSearchType(tOption as any);
                      if (query) {
                        updateURLWithRefresh({
                          q: query,
                          page: 1,
                          size: resultLimit,
                          type: tOption
                        })
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 capitalize hover:scale-105 active:scale-95 cursor-pointer ${searchType === tOption
                      ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                      }`}
                  >
                    {tOption}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Refresh button when settings change */}
        {needsRefresh && (
          <div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-right-4 duration-500">
            <Button
              onClick={() => {
                setNeedsRefresh(false);
                performSearch(query, 1);
              }}
              className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Zap className="h-5 w-5" />
              Refresh Results
            </Button>
          </div>
        )}
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loadingResults && (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-300">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-gradient-to-br from-primary to-accent p-6 rounded-full">
                <Bot className="h-12 w-12 text-primary-foreground animate-bounce" />
              </div>
            </div>
            <p className="text-muted-foreground font-medium">
              {t("search.searching")}
            </p>
          </div>
        )}
        {!loadingResults && hasSearched && results.length === 0 && (
          <div className="text-center py-20 animate-in fade-in zoom-in-95 duration-500">
            <div className="mb-6 inline-block">
              <div className="relative">
                <div className="absolute inset-0 bg-muted rounded-full blur-xl opacity-50" />
                <div className="relative bg-muted p-8 rounded-full">
                  <Search className="h-16 w-16 text-muted-foreground" />
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-lg font-medium">
              {t("results.noResults")}
            </p>
          </div>
        )}
        {!loadingResults && results.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground font-medium">
                {t("results.found")}{" "}
                <span className="text-foreground font-semibold">
                  {totalResults}
                </span>{" "}
                {totalResults === 1
                  ? t("results.result")
                  : t("results.results")}
                <span className="text-muted-foreground">
                  {" "}
                  ({t("results.showing")} {results.length})
                </span>
              </p>
            </div>

            {/* AI Summary Box with skeleton loading */}
            {showAiSummary && (
              <div className="mb-8">
                <AISummaryBox
                  summary={searchSummary}
                  citedPosts={citedPosts}
                  onCitationClick={(postId) => {
                    router.push(`/blog/${postId}`);
                  }}
                  loading={loadingSummary}
                />
              </div>
            )}

            <div className={columns === 2 ? "grid md:grid-cols-2 gap-6" : "space-y-6"}>
              {results.map((result, index) => (
                <div
                  key={result.id}
                  id={`result-${result.id}`}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-500 transition-all"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <RegulationResultCard
                    result={result}
                    searchQuery={query}
                    highlightLoading={Boolean(useRelevantChunks && result.highlightLoading)}
                  />
                </div>
              ))}
            </div>
            {results.length < totalResults && (
              <div ref={observerTarget} className="flex justify-center py-8">
                {loadingMore && (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                )}
              </div>
            )}
          </div>
        )}
        {!hasSearched && !loadingResults && (
          <div className="text-center py-20 animate-in fade-in zoom-in-95 duration-700 delay-500">
            <div className="mb-8 inline-block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl animate-pulse" />
                <div className="relative bg-gradient-to-br from-primary/10 to-accent/10 p-12 rounded-3xl border border-border">
                  <Bot className="h-20 w-20 text-primary mx-auto" />
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-lg font-medium mb-2">
              {t("results.ready")}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("results.getStarted")}
            </p>
          </div>
        )}
      </div>
    </div >
  );
}
