"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Loader2, Scale, Sparkles, ChevronDown, ChevronRight,
    CheckCircle2, AlertTriangle, XCircle, MinusCircle, ShieldCheck, SearchX, FileText
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api-client";

// ─── Types ──────────────────────────────────────────────────────────────────

type ComparisonClause = {
    benchmark_clause: string;
    comparison_clause: string;
    status: string;
    analysis: string;
};

type ComparisonTheme = {
    theme_name: string;
    theme_description: string;
    theme_status: string;
    clauses: ComparisonClause[];
};

type ComparisonSummary = {
    overall_compliance_score: number;
    total_themes: number;
    total_clauses: number;
    aligned_count: number;
    gap_count: number;
    conflict_count: number;
    text: string;
};

type InquirySource = {
    id: string;
    title: string;
    type: string;
    url: string;
    snippet?: string;
};

type ComparisonResponse = {
    themes: ComparisonTheme[];
    summary: ComparisonSummary;
    benchmark_type: string;
    analysis_direction: string;
    internal_sources: InquirySource[];
    external_sources: InquirySource[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusConfig(status: string) {
    switch (status) {
        case "Aligned":
        case "Fully Aligned":
            return { color: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800", icon: CheckCircle2, dotColor: "bg-emerald-500" };
        case "Partially Aligned":
            return { color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800", icon: AlertTriangle, dotColor: "bg-amber-500" };
        case "Gap":
        case "Missing":
            return { color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800", icon: MinusCircle, dotColor: "bg-red-500" };
        case "Conflict":
            return { color: "bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800", icon: XCircle, dotColor: "bg-rose-600" };
        default:
            return { color: "bg-muted text-muted-foreground", icon: MinusCircle, dotColor: "bg-muted-foreground" };
    }
}

function getScoreColor(score: number) {
    if (score >= 80) return { ring: "text-emerald-500", bg: "bg-emerald-500/10", label: "text-emerald-600 dark:text-emerald-400" };
    if (score >= 50) return { ring: "text-amber-500", bg: "bg-amber-500/10", label: "text-amber-600 dark:text-amber-400" };
    return { ring: "text-red-500", bg: "bg-red-500/10", label: "text-red-600 dark:text-red-400" };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ComparePage() {
    const searchParams = useSearchParams();
    const [topic, setTopic] = useState("");
    const [benchmarkType, setBenchmarkType] = useState<"internal" | "external">("external");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ComparisonResponse | null>(null);
    const [error, setError] = useState("");
    const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());

    useEffect(() => {
        const q = searchParams.get("q");
        if (q) setTopic(q);
    }, [searchParams]);

    const handleCompare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setLoading(true);
        setError("");
        setData(null);
        setExpandedThemes(new Set());

        try {
            const response = await fetchWithAuth("/api/compare", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic, benchmark_type: benchmarkType }),
            });

            if (!response.ok) throw new Error("Failed to fetch comparison");

            const result = await response.json();
            // Normalize response with safe defaults
            const normalized: ComparisonResponse = {
                themes: result.themes || [],
                summary: {
                    overall_compliance_score: result.summary?.overall_compliance_score ?? 0,
                    total_themes: result.summary?.total_themes ?? 0,
                    total_clauses: result.summary?.total_clauses ?? 0,
                    aligned_count: result.summary?.aligned_count ?? 0,
                    gap_count: result.summary?.gap_count ?? 0,
                    conflict_count: result.summary?.conflict_count ?? 0,
                    text: result.summary?.text || "Analysis complete.",
                },
                benchmark_type: result.benchmark_type || benchmarkType,
                analysis_direction: result.analysis_direction || (benchmarkType === "external" ? "compliance_check" : "necessity_audit"),
                internal_sources: result.internal_sources || [],
                external_sources: result.external_sources || [],
            };
            setData(normalized);
            // Auto-expand themes with issues
            const issues = new Set<string>();
            normalized.themes.forEach((t: ComparisonTheme) => {
                if (t.theme_status !== "Fully Aligned") issues.add(t.theme_name);
            });
            setExpandedThemes(issues);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const toggleTheme = (name: string) => {
        setExpandedThemes(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const directionLabel = benchmarkType === "external" ? "Compliance Check" : "Necessity Audit";
    const directionDesc = benchmarkType === "external"
        ? "Check if internal policies satisfy all external regulation requirements"
        : "Identify unnecessary internal regulations with no external mandate";

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Scale className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Regulation Compare</h1>
                        <p className="text-xs text-muted-foreground">Comprehensive theme-by-theme compliance analysis</p>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Form Card */}
                <div className="mb-8 max-w-2xl mx-auto">
                    <Card className="p-6 shadow-lg border-2 border-primary/10">
                        <form onSubmit={handleCompare} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Topic to Compare</label>
                                <Input
                                    placeholder="e.g. Data Privacy, AI Ethics, Financial Regulation"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="bg-background text-lg h-12"
                                />
                            </div>

                            {/* Direction Toggle */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${benchmarkType === 'external' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40'}`}
                                    onClick={() => setBenchmarkType("external")}
                                >
                                    <div className="font-semibold mb-1 flex items-center gap-2 text-sm">
                                        <ShieldCheck className="h-4 w-4" /> Compliance Check
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-snug">
                                        Does our internal policy meet all external requirements?
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${benchmarkType === 'internal' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40'}`}
                                    onClick={() => setBenchmarkType("internal")}
                                >
                                    <div className="font-semibold mb-1 flex items-center gap-2 text-sm">
                                        <SearchX className="h-4 w-4" /> Necessity Audit
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-snug">
                                        Do we have unnecessary internal regulations?
                                    </p>
                                </button>
                            </div>

                            <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={loading || !topic.trim()}>
                                {loading ? (
                                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing themes...</>
                                ) : (
                                    <><Scale className="mr-2 h-5 w-5" /> Run {directionLabel}</>
                                )}
                            </Button>
                        </form>
                    </Card>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="max-w-2xl mx-auto">
                        <Card className="p-8">
                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                </div>
                                <div>
                                    <p className="font-semibold text-lg">Comprehensive Analysis in Progress</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Extracting themes → Analyzing each theme → Generating report...
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2 opacity-60">
                                        This may take 30-60 seconds for thorough analysis
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-8 text-center max-w-2xl mx-auto">
                        {error}
                    </div>
                )}

                {/* Results */}
                {data && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

                        {/* Compliance Score + Stats */}
                        <div className="grid md:grid-cols-[280px_1fr] gap-6">
                            {/* Score Ring */}
                            <Card className={`p-6 flex flex-col items-center justify-center ${getScoreColor(data.summary.overall_compliance_score).bg}`}>
                                <div className="relative w-36 h-36">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-border/30" />
                                        <circle
                                            cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                                            strokeLinecap="round"
                                            strokeDasharray={`${data.summary.overall_compliance_score * 2.64} 264`}
                                            className={`${getScoreColor(data.summary.overall_compliance_score).ring} transition-all duration-1000`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className={`text-3xl font-bold ${getScoreColor(data.summary.overall_compliance_score).label}`}>
                                            {Math.round(data.summary.overall_compliance_score)}%
                                        </span>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</span>
                                    </div>
                                </div>
                                <p className="text-sm font-medium mt-3 text-center">
                                    {data.analysis_direction === "compliance_check" ? "Compliance Score" : "Necessity Score"}
                                </p>
                                <p className="text-[10px] text-muted-foreground text-center mt-0.5">{directionDesc}</p>
                            </Card>

                            {/* Stats + Summary */}
                            <Card className="p-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                    <h3 className="font-semibold text-lg">Executive Summary</h3>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{data.summary.text}</p>

                                {/* Stats Bar */}
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold">{data.summary.total_clauses}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Clauses</p>
                                    </div>
                                    <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.summary.aligned_count}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Aligned</p>
                                    </div>
                                    <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.summary.gap_count}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gaps</p>
                                    </div>
                                    <div className="bg-red-500/10 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data.summary.conflict_count}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conflicts</p>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Themes Accordion */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-lg">Theme-by-Theme Analysis</h3>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => setExpandedThemes(new Set(data.themes.map(t => t.theme_name)))}
                                    >
                                        Expand All
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => setExpandedThemes(new Set())}
                                    >
                                        Collapse All
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {data.themes.map((theme) => {
                                    const isExpanded = expandedThemes.has(theme.theme_name);
                                    const statusCfg = getStatusConfig(theme.theme_status);
                                    const StatusIcon = statusCfg.icon;

                                    return (
                                        <Card key={theme.theme_name} className="overflow-hidden">
                                            {/* Theme Header */}
                                            <button
                                                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                                                onClick={() => toggleTheme(theme.theme_name)}
                                            >
                                                <div className={`w-2 h-2 rounded-full ${statusCfg.dotColor} flex-shrink-0`} />
                                                {isExpanded
                                                    ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                    : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                }
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-sm">{theme.theme_name}</span>
                                                        <Badge variant="outline" className={`text-[10px] py-0 ${statusCfg.color}`}>
                                                            <StatusIcon className="h-3 w-3 mr-1" />
                                                            {theme.theme_status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{theme.theme_description}</p>
                                                </div>
                                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                                    {theme.clauses.length} clause{theme.clauses.length !== 1 ? 's' : ''}
                                                </span>
                                            </button>

                                            {/* Expanded Clause Table */}
                                            {isExpanded && theme.clauses.length > 0 && (
                                                <div className="border-t">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="bg-muted/40 border-b">
                                                                    <th className="text-left p-3 font-medium text-xs uppercase tracking-wider w-[30%]">Benchmark Clause</th>
                                                                    <th className="text-left p-3 font-medium text-xs uppercase tracking-wider w-[30%]">Comparison Clause</th>
                                                                    <th className="text-center p-3 font-medium text-xs uppercase tracking-wider w-[12%]">Status</th>
                                                                    <th className="text-left p-3 font-medium text-xs uppercase tracking-wider w-[28%]">Analysis</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {theme.clauses.map((clause, idx) => {
                                                                    const clauseStatus = getStatusConfig(clause.status);
                                                                    const ClauseIcon = clauseStatus.icon;
                                                                    return (
                                                                        <tr key={idx} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                                                                            <td className="p-3 text-sm">{clause.benchmark_clause}</td>
                                                                            <td className="p-3 text-sm text-muted-foreground">{clause.comparison_clause}</td>
                                                                            <td className="p-3 text-center">
                                                                                <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${clauseStatus.color}`}>
                                                                                    <ClauseIcon className="h-3 w-3 mr-1" />
                                                                                    {clause.status}
                                                                                </Badge>
                                                                            </td>
                                                                            <td className="p-3 text-xs text-muted-foreground">{clause.analysis}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {isExpanded && theme.clauses.length === 0 && (
                                                <div className="border-t p-4 text-sm text-muted-foreground italic text-center">
                                                    No clause-level analysis available for this theme.
                                                </div>
                                            )}
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Sources */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <FileText className="h-4 w-4" /> Internal Sources
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {data.internal_sources.length > 0 ? (
                                        <ul className="space-y-1.5">
                                            {data.internal_sources.map((s, i) => (
                                                <li key={i} className="flex items-center gap-2 text-sm">
                                                    <span className="text-primary">•</span>
                                                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary truncate">{s.title}</a>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No internal documents found.</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <FileText className="h-4 w-4" /> External Sources
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {data.external_sources.length > 0 ? (
                                        <ul className="space-y-1.5">
                                            {data.external_sources.map((s, i) => (
                                                <li key={i} className="flex items-center gap-2 text-sm">
                                                    <span className="text-primary">•</span>
                                                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary truncate">{s.title}</a>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No external documents found.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
