'use client'

import React, { JSX, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Sparkles, Zap, BookOpen, Loader2, ExternalLink, Link as LinkIcon, Bot, Search } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { fetchWithAuth } from '@/lib/api-client'



type InquirySource = {
    id: string
    title: string
    type: 'post' | 'pdf'
    url: string
    snippet?: string
}

type InquiryAnswerResponse = {
    summary: string
    internal: {
        content: string
        sources: InquirySource[]
    }
    external: {
        content: string
        sources: InquirySource[]
    }
    gap: string
}

export default function InquiryPage() {
    const { t } = useLanguage()
    const [question, setQuestion] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [answer, setAnswer] = useState<InquiryAnswerResponse | null>(null)

    // Helper function to parse and linkify [Source X] references in content
    const linkifySourceReferences = (content: string, sources: InquirySource[]) => {
        const parts: (string | JSX.Element)[] = []
        const regex = /\[(\d+)\]/g
        let lastIndex = 0
        let match

        while ((match = regex.exec(content)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                parts.push(content.substring(lastIndex, match.index))
            }

            const sourceNum = parseInt(match[1], 10)
            const sourceIndex = sourceNum - 1
            const source = sources[sourceIndex]

            if (source) {
                const isPost = source.type === 'post'
                const isPDF = source.type === 'pdf'
                const linkUrl = isPDF && source.id !== 'none'
                    ? buildPDFViewerUrl(source)
                    : source.url

                parts.push(
                    <TooltipProvider key={match.index}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link
                                    href={linkUrl}
                                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium underline decoration-primary/30 hover:decoration-primary transition-colors"
                                >
                                    [{sourceNum}]
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs">{source.title}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )
            } else {
                parts.push(match[0])
            }

            lastIndex = regex.lastIndex
        }

        // Add remaining text
        if (lastIndex < content.length) {
            parts.push(content.substring(lastIndex))
        }

        return parts.length > 0 ? parts : content
    }

    const handleSubmit = async (overrideQuestion?: string) => {
        const queryToSubmit = overrideQuestion ?? question
        if (!queryToSubmit.trim()) return
        setIsLoading(true)
        setHasSearched(false)
        try {
            const response = await fetchWithAuth('/api/inquiry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: queryToSubmit }),
            })

            if (!response.ok) {
                throw new Error('Failed to fetch inquiry answer')
            }

            const data: InquiryAnswerResponse = await response.json()
            setAnswer(data)
            setHasSearched(true)
        } catch (error) {
            // Surface a lightweight error state without blocking the UI
            console.error('Failed to fetch inquiry answer', error)
            setAnswer(null)
            setHasSearched(true)
        } finally {
            setIsLoading(false)
        }
    }

    // Build URL for PDF viewer with question context
    const buildPDFViewerUrl = (source: InquirySource) => {
        // Extract file ID from the download URL
        // URL format: /api/files/{file_id}/download
        const urlParts = source.url.split('/')
        const downloadIndex = urlParts.findIndex(p => p === 'download')
        const fileId = downloadIndex > 0 ? urlParts[downloadIndex - 1] : source.id

        return `/files/${fileId}/view?q=${encodeURIComponent(question)}`
    }

    const renderSources = (sources: InquirySource[], accentClass: string) => {
        if (!sources || sources.length === 0) {
            return (
                <div className="text-sm text-muted-foreground italic py-4 text-center bg-muted/30 rounded-md">
                    No references found in the content
                </div>
            )
        }

        return (
            <ul className="space-y-2.5">
                {sources.map((source) => {
                    const isPost = source.type === 'post'
                    const isPDF = source.type === 'pdf'

                    const content = (
                        <div className="flex items-start gap-2 group">
                            <span className={`${accentClass} text-base leading-none mt-0.5`}>•</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium capitalize px-1.5 py-0.5"
                                    >
                                        {isPost ? 'Post' : 'PDF'}
                                    </Badge>
                                    <span className="font-medium text-sm group-hover:text-primary transition-colors">
                                        {source.title}
                                    </span>
                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                {source.snippet && (
                                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                                        {source.snippet}
                                    </p>
                                )}
                                {isPDF && source.id !== 'none' && (
                                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                        <Sparkles className="h-3 w-3" />
                                        Click to view with AI highlights
                                    </p>
                                )}
                            </div>
                        </div>
                    )

                    return (
                        <li key={source.id} className="text-sm">
                            {isPost ? (
                                <Link
                                    href={source.url}
                                    className="block hover:bg-accent/5 rounded-md p-2 -m-2 transition-colors"
                                >
                                    {content}
                                </Link>
                            ) : isPDF && source.id !== 'none' ? (
                                <Link
                                    href={buildPDFViewerUrl(source)}
                                    className="block hover:bg-accent/5 rounded-md p-2 -m-2 transition-colors"
                                >
                                    {content}
                                </Link>
                            ) : (
                                <a
                                    href={source.url}
                                    className="block hover:bg-accent/5 rounded-md p-2 -m-2 transition-colors"
                                    target="_blank"
                                    rel="noreferrer"
                                    download
                                >
                                    {content}
                                </a>
                            )}
                        </li>
                    )
                })}
            </ul>
        )
    }

    const renderLoadingState = () => (
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
    );

    const renderEmptyState = () => (
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
    );

    const renderInitialState = () => (
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
    );

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <div className="relative border-b border-border overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background pointer-events-none" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-3xl pointer-events-none" />

                <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
                    <div className="flex-1 mb-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl blur-md opacity-60 animate-pulse" />
                                <div className="relative bg-gradient-to-br from-primary to-accent p-4 rounded-2xl shadow-lg">
                                    <MessageSquare className="h-8 w-8 text-primary-foreground" />
                                </div>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-bold text-balance animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {t("inquiry.title")}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-10 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100">
                        <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
                        <p className="text-muted-foreground text-lg">
                            {t("search.headerSubtitle")}
                        </p>
                    </div>
                    {/* Search Input */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleSubmit()
                        }}
                        className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200"
                    >
                        <div className="relative">
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <MessageSquare className="h-5 w-5 text-primary" />
                                    </div>
                                    <Input
                                        type="text"
                                        placeholder={t("inquiry.placeholder")}
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        className="pl-12 h-14 text-base bg-card border-2 border-border hover:border-primary/30 focus:border-primary transition-all duration-300 rounded-xl shadow-sm"
                                        disabled={isLoading}
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="h-14 px-8 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                                    disabled={isLoading || !question.trim()}
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Zap className="h-5 w-5 mr-2" />
                                            {t("inquiry.searchButton")}
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
                            {[
                                t("example.privacy"),
                                t("example.management"),
                                t("example.ai"),
                                t("example.finance"),
                            ].map((example) => (
                                <button
                                    key={example}
                                    type="button"
                                    onClick={() => {
                                        setQuestion(example)
                                        handleSubmit(example)
                                    }}
                                    className="px-4 py-2 text-sm font-medium rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground border border-border transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer"
                                >
                                    {example}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Initial State - Robot Icon */}
            {!hasSearched && !isLoading && renderInitialState()}

            {/* Loading State */}
            {isLoading && renderLoadingState()}

            {/* Results Section */}
            {hasSearched && answer && !isLoading && (
                <div className="relative max-w-7xl mx-auto px-4 py-12">
                    <div className="space-y-8">
                        <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-accent/5 to-background relative px-0 py-4">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse" />

                            <CardContent className="px-8 pt-4 relative">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-md animate-pulse" />
                                            <div className="relative bg-gradient-to-br from-primary to-accent p-2.5 rounded-full">
                                                <Sparkles className="h-5 w-5 text-primary-foreground" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-3">
                                            <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">
                                                {t("inquiry.aiSummary")}
                                            </h3>
                                            <Badge
                                                variant="secondary"
                                                className="bg-gradient-to-r from-primary/10 to-accent/10 text-xs font-medium"
                                            >
                                                AI Generated
                                            </Badge>
                                        </div>

                                        <div className="relative">
                                            <div className="prose prose-sm dark:prose-invert max-w-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                <div className="text-sm leading-relaxed text-foreground/90 space-y-2">
                                                    <p>{answer.summary}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-border/50">
                                            <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                                                <ExternalLink className="h-3 w-3" />
                                                View detailed sources below
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Two Column Answers */}
                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Internal Knowledge */}
                            <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 border-2 hover:border-primary/30 h-full flex flex-col group relative">
                                <CardContent className="p-6 pt-4">
                                    <CardTitle className="text-xl mb-2 leading-tight break-words group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent transition-all duration-300 font-bold">
                                        {t("inquiry.internalKnowledge")}
                                    </CardTitle>
                                    <div className="space-y-4 py-4">
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <p className="text-sm leading-relaxed text-foreground/90">
                                                {linkifySourceReferences(answer.internal.content, answer.internal.sources)}
                                            </p>
                                        </div>
                                        <Separator />
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t("inquiry.sources")}</p>
                                            <TooltipProvider>
                                                {renderSources(answer.internal.sources, 'text-blue-500')}
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* External Knowledge */}
                            <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 border-2 hover:border-primary/30 h-full flex flex-col group relative ">
                                <CardContent className="p-6 pt-4">
                                    <CardTitle className="text-xl mb-2 leading-tight break-words group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent transition-all duration-300 font-bold">
                                        {t("inquiry.externalKnowledge")}
                                    </CardTitle>
                                    <div className="space-y-4 py-4">
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <p className="text-sm leading-relaxed text-foreground/90">
                                                {linkifySourceReferences(answer.external.content, answer.external.sources)}
                                            </p>
                                        </div>
                                        <Separator />
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t("inquiry.sources")}</p>
                                            <TooltipProvider>
                                                {renderSources(answer.external.sources, 'text-green-500')}
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
            {!isLoading && hasSearched && (!answer || !answer.internal.sources.length) && renderEmptyState()}
        </div>
    )
}