'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { MessageSquare, Loader2, Bot, User, Send, Search, GitCompare, ArrowRight, RotateCcw, FileText } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { fetchWithAuth } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type ChatAction = {
    action: string
    query: string
    url: string
    message: string
}

type ChatSource = {
    ref: number
    title: string
    source_id: string
    source_type: string
}

type ChatMessage = {
    id: string
    role: 'user' | 'assistant'
    content: string
    actions?: ChatAction[]
    sources?: ChatSource[]
    timestamp: Date
}

export default function ChatPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [sessionId, setSessionId] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isLoading])

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
        e?.preventDefault()
        const query = overrideInput ?? input
        if (!query.trim() || isLoading) return

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: query,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsLoading(true)

        try {
            const response = await fetchWithAuth('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: query,
                    session_id: sessionId
                }),
            })

            if (!response.ok) throw new Error('Failed to fetch answer')

            const data = await response.json()

            if (data.session_id) {
                setSessionId(data.session_id)
            }

            const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                actions: data.actions || [],
                sources: data.sources || [],
                timestamp: new Date()
            }

            setMessages(prev => [...prev, assistantMsg])
        } catch (error) {
            console.error('Chat error:', error)
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Sorry, I encountered an error. Please try again.",
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setIsLoading(false)
        }
    }

    const handleNewChat = () => {
        setMessages([])
        setSessionId(null)
        inputRef.current?.focus()
    }

    const handleActionClick = (action: ChatAction) => {
        router.push(action.url)
    }

    // Render text with [1] references as clickable tooltips
    const renderTextWithReferences = (text: string, sources: ChatSource[]) => {
        const parts: React.ReactNode[] = []
        const regex = /\[(\d+)\]/g
        let lastIndex = 0
        let match

        while ((match = regex.exec(text)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                parts.push(text.substring(lastIndex, match.index))
            }

            const refNum = parseInt(match[1], 10)
            const source = sources?.find(s => s.ref === refNum)

            if (source) {
                const docUrl = source.source_id ? `/files/${source.source_id}/view` : '#'
                parts.push(
                    <TooltipProvider key={`ref-${match.index}`}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link
                                    href={docUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-primary hover:text-primary/80 font-semibold hover:underline decoration-primary/30 transition-colors mx-0.5 text-[11px] bg-primary/10 px-1 py-0.5 rounded"
                                >
                                    [{refNum}]
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                                <div className="flex items-center gap-1.5">
                                    <FileText className="h-3 w-3 flex-shrink-0" />
                                    <span className="text-xs">{source.title}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground capitalize">{source.source_type}</span>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )
            } else {
                // No matching source, render as plain text
                parts.push(
                    <span key={`ref-plain-${match.index}`} className="text-muted-foreground text-[11px] font-semibold mx-0.5">
                        [{refNum}]
                    </span>
                )
            }

            lastIndex = regex.lastIndex
        }

        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex))
        }

        return parts.length > 0 ? <>{parts}</> : text
    }

    // Simple markdown-like text rendering with reference support
    const renderMessageContent = (text: string, sources: ChatSource[] = []) => {
        const lines = text.split('\n')
        const elements: React.ReactNode[] = []
        let listItems: React.ReactNode[] = []

        const flushList = () => {
            if (listItems.length > 0) {
                elements.push(
                    <ul key={`list-${elements.length}`} className="space-y-1.5 my-2">
                        {listItems}
                    </ul>
                )
                listItems = []
            }
        }

        lines.forEach((line, idx) => {
            const trimmed = line.trim()

            // Bullet point
            if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.match(/^\d+\.\s/)) {
                const bulletContent = trimmed.replace(/^[-•]\s/, '').replace(/^\d+\.\s/, '')
                listItems.push(
                    <li key={`li-${idx}`} className="flex items-start gap-2">
                        <span className="text-primary mt-1.5 text-[8px]">●</span>
                        <span>{renderInlineWithRefs(bulletContent, sources)}</span>
                    </li>
                )
                return
            }

            flushList()

            if (!trimmed) {
                elements.push(<div key={`br-${idx}`} className="h-2" />)
                return
            }

            // Bold heading-like lines
            if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                elements.push(
                    <p key={`h-${idx}`} className="font-semibold mt-2 mb-1">
                        {trimmed.replace(/\*\*/g, '')}
                    </p>
                )
                return
            }

            // Regular paragraph
            elements.push(
                <p key={`p-${idx}`} className="leading-relaxed">
                    {renderInlineWithRefs(trimmed, sources)}
                </p>
            )
        })

        flushList()

        return <div className="space-y-1">{elements}</div>
    }

    // Format inline bold/italic AND [N] references
    const renderInlineWithRefs = (text: string, sources: ChatSource[]): React.ReactNode => {
        // First handle bold markers
        const boldParts: React.ReactNode[] = []
        const boldRegex = /\*\*(.*?)\*\*/g
        let lastBoldIdx = 0
        let boldMatch

        while ((boldMatch = boldRegex.exec(text)) !== null) {
            if (boldMatch.index > lastBoldIdx) {
                boldParts.push(
                    <React.Fragment key={`t-${boldMatch.index}`}>
                        {renderTextWithReferences(text.substring(lastBoldIdx, boldMatch.index), sources)}
                    </React.Fragment>
                )
            }
            boldParts.push(
                <strong key={`b-${boldMatch.index}`}>
                    {renderTextWithReferences(boldMatch[1], sources)}
                </strong>
            )
            lastBoldIdx = boldRegex.lastIndex
        }

        if (lastBoldIdx < text.length) {
            boldParts.push(
                <React.Fragment key={`t-end`}>
                    {renderTextWithReferences(text.substring(lastBoldIdx), sources)}
                </React.Fragment>
            )
        }

        return boldParts.length > 0 ? <>{boldParts}</> : renderTextWithReferences(text, sources)
    }

    // Render sources footer
    const renderSourcesFooter = (sources: ChatSource[]) => {
        if (!sources || sources.length === 0) return null

        return (
            <div className="mt-3 pt-3 border-t border-border/30">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Sources</p>
                <div className="space-y-1">
                    {sources.map((source) => {
                        const docUrl = source.source_id ? `/files/${source.source_id}/view` : '#'
                        return (
                            <Link
                                key={source.ref}
                                href={docUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group"
                            >
                                <span className="font-semibold text-primary/70 group-hover:text-primary">[{source.ref}]</span>
                                <FileText className="h-3 w-3 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                                <span className="truncate">{source.title}</span>
                                <span className="text-[10px] opacity-50 capitalize">({source.source_type})</span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            {/* Header */}
            <header className="flex-none h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 flex items-center px-4 md:px-6 justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-base leading-none">KnowPedia AI</h1>
                        <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Regulation Assistant</p>
                    </div>
                </div>
                {messages.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleNewChat}
                        className="text-muted-foreground hover:text-foreground gap-1.5"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        New Chat
                    </Button>
                )}
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto scroll-smooth">
                <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
                    {messages.length === 0 ? (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                    <MessageSquare className="h-10 w-10 text-primary" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                                    <span className="text-[10px] text-white">✓</span>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">How can I help you?</h2>
                                <p className="text-muted-foreground mt-1.5 max-w-sm">
                                    Ask me anything about your regulation documents. I can search, explain, and help you navigate policies.
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-lg">
                                {[
                                    "What are the data privacy requirements?",
                                    "Explain AI governance policies",
                                    "ESG regulation overview",
                                    "Risk management guidelines",
                                ].map((q) => (
                                    <Button
                                        key={q}
                                        variant="outline"
                                        className="rounded-full text-sm h-auto py-2 px-4 border-dashed hover:border-primary hover:text-primary transition-colors"
                                        onClick={() => handleSubmit(undefined, q)}
                                    >
                                        {q}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Messages */
                        <div className="space-y-5">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                                        msg.role === 'user' ? "justify-end" : "justify-start"
                                    )}
                                >
                                    {/* Assistant Avatar */}
                                    {msg.role === 'assistant' && (
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                                            <Bot className="h-4 w-4 text-primary-foreground" />
                                        </div>
                                    )}

                                    {/* Message Bubble */}
                                    <div className={cn(
                                        "max-w-[80%] rounded-2xl",
                                        msg.role === 'user'
                                            ? "bg-primary text-primary-foreground px-4 py-2.5 rounded-br-md shadow-sm"
                                            : "bg-muted/60 text-foreground px-4 py-3 rounded-bl-md border border-border/50"
                                    )}>
                                        {msg.role === 'user' ? (
                                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                                        ) : (
                                            <div className="text-sm">
                                                {renderMessageContent(msg.content, msg.sources || [])}

                                                {/* Sources Footer */}
                                                {renderSourcesFooter(msg.sources || [])}

                                                {/* Action Buttons */}
                                                {msg.actions && msg.actions.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/30">
                                                        {msg.actions.map((action, idx) => (
                                                            <Button
                                                                key={idx}
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleActionClick(action)}
                                                                className={cn(
                                                                    "rounded-full text-xs h-8 gap-1.5 shadow-sm transition-all hover:scale-[1.02]",
                                                                    action.action === 'link_document'
                                                                        ? "border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
                                                                        : "border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
                                                                )}
                                                            >
                                                                {action.action === 'link_document' ? (
                                                                    <><Search className="h-3 w-3" /> Search Documents</>
                                                                ) : (
                                                                    <><GitCompare className="h-3 w-3" /> Compare Regulations</>
                                                                )}
                                                                <ArrowRight className="h-3 w-3" />
                                                            </Button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* User Avatar */}
                                    {msg.role === 'user' && (
                                        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm border border-border/50">
                                            <User className="h-4 w-4 text-accent-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="flex gap-3 animate-in fade-in duration-300">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <Bot className="h-4 w-4 text-primary-foreground" />
                                    </div>
                                    <div className="bg-muted/60 rounded-2xl rounded-bl-md border border-border/50 px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0ms]" />
                                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:150ms]" />
                                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:300ms]" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* Input Area */}
            <div className="flex-none p-4 md:p-6 bg-background/95 backdrop-blur border-t">
                <div className="max-w-3xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                            ref={inputRef}
                            placeholder="Ask about regulations..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                            className="flex-1 h-12 text-sm rounded-xl border-2 focus-visible:ring-0 focus-visible:border-primary px-4 bg-muted/30"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={isLoading || !input.trim()}
                            className="h-12 w-12 rounded-xl shrink-0 shadow-sm transition-all hover:scale-105 active:scale-95"
                        >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </Button>
                    </form>
                    <p className="text-[10px] text-muted-foreground text-center mt-2 opacity-60">
                        AI can make mistakes. Verify important information from sources.
                    </p>
                </div>
            </div>
        </div>
    )
}
