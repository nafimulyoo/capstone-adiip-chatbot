"use client";

import {
  ExternalLink,
  Tag,
  Clock,
  User,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { highlightTextFromAPI } from "@/lib/highlight-utils";
import { useLanguage } from "@/contexts/language-context";

interface ResultItem {
  id: string;
  title: string;
  description: string;
  snippet: string;
  lastUpdated: string;
  tags: string[];
  content: string;
  source_type: "internal" | "external";
  allowed_groups?: string[];
  allowed_levels?: string[];
  search_snippet_highlighted?: string[];
  relevant_chunks?: string[];
}

interface RegulationResultCardProps {
  result: ResultItem;
  searchQuery?: string;
  highlightLoading?: boolean;
}

export default function RegulationResultCard({
  result,
  searchQuery = "",
  highlightLoading = false,
}: RegulationResultCardProps) {
  const { t } = useLanguage();

  // Helper to capitalize each word
  const capitalizeWords = (str: string) => {
    return str.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Remove .pdf extension from title
  const displayTitle = result.title.replace(/\.pdf$/i, '');

  // Link to file viewer with search query
  const fileViewerUrl = searchQuery
    ? `/files/${result.id}/view?q=${encodeURIComponent(searchQuery)}`
    : `/files/${result.id}/view`;

  // Use API highlights only (no fallback to search query)
  const snippetHighlighted = result.search_snippet_highlighted && result.search_snippet_highlighted.length > 0
    ? highlightTextFromAPI(result.snippet, result.search_snippet_highlighted)
    : result.snippet;

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 border-2 hover:border-primary/30 h-full flex flex-col group relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardHeader className="pb-3 relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl mb-2 leading-tight break-words group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent transition-all duration-300 font-bold">
              {displayTitle}
            </CardTitle>
            <div className="flex flex-wrap gap-2 mb-3">
              {result.description && (
                <Badge
                  variant="secondary"
                  className="text-xs break-words max-w-full transition-all duration-300 hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 font-medium"
                >
                  {result.source_type === 'internal' ? 'Internal Regulation' : 'External Regulation'}
                </Badge>
              )}
            </div>

            {highlightLoading ? (
              <div className="mt-2 space-y-2 animate-in fade-in duration-300">
                <div className="h-3 w-full bg-muted rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-muted rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
              </div>
            ) : (
              <CardDescription className="text-sm leading-relaxed break-words animate-in fade-in slide-in-from-bottom-2 duration-500">
                {snippetHighlighted}
              </CardDescription>
            )}

            <div className="flex flex-wrap gap-2 mt-4 animate-in fade-in duration-500 delay-100">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Tag className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-xs font-medium">{t("card.tags")}</span>
              </div>
              {result.tags && result.tags.length > 0 ? result.tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs font-normal break-words transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-105 cursor-default"
                >
                  {capitalizeWords(tag)}
                </Badge>
              )) : (
                <span className="text-xs text-muted-foreground italic">No tags</span>
              )}
            </div>

            <div className="flex flex-wrap gap-4 mt-4 text-xs">
              {/* Groups and Levels */}
              {result.allowed_groups && result.allowed_groups.length > 0 && (
                <div className="flex items-center gap-1.5 text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span className="font-medium">Groups: {result.allowed_groups.map(g => capitalizeWords(g)).join(", ")}</span>
                </div>
              )}
              {result.allowed_levels && result.allowed_levels.length > 0 && (
                <div className="flex items-center gap-1.5 text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span className="font-medium">Levels: {result.allowed_levels.map(l => capitalizeWords(l)).join(", ")}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{new Date(result.lastUpdated).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 mt-auto relative">
        <div className="flex flex-wrap gap-2">
          <Link
            href={fileViewerUrl}
            className="inline-flex"
          >
            <Button
              variant="default"
              size="sm"
              className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 cursor-pointer font-medium"
            >
              {t("card.readFull")}
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
