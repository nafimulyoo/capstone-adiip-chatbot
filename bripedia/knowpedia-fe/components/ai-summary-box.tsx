"use client";

import React from "react";
import { Sparkles, ExternalLink, Link as LinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SearchSummaryPart } from "@/lib/api-types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { highlightTextFromAPI } from "@/lib/highlight-utils";

interface AISummaryBoxProps {
  summary: SearchSummaryPart[] | null;
  citedPosts: Record<string, string> | null;
  onCitationClick?: (postId: string) => void;
  loading?: boolean;
}

export default function AISummaryBox({
  summary,
  citedPosts,
  onCitationClick,
  loading = false,
}: AISummaryBoxProps) {
  const router = useRouter();

  return (
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
                AI Search Overview
              </h3>
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-primary/10 to-accent/10 text-xs font-medium"
              >
                AI Generated
              </Badge>
            </div>

            <div className="relative">
              {loading && (
                <div className="space-y-2">
                  <div className="h-3 w-full bg-muted rounded animate-pulse" />
                  <div className="h-3 w-5/6 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-4/5 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-full bg-muted rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                </div>
              )}
              {!loading && summary && summary.length > 0 && (
                <div className="prose prose-sm dark:prose-invert max-w-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="text-sm leading-relaxed text-foreground/90 space-y-2">
                    <TooltipProvider>
                      {summary.map((part, index) => (
                        <span key={index} className="block">
                          {part.highlighted_words && part.highlighted_words.length > 0
                            ? highlightTextFromAPI(part.text, part.highlighted_words)
                            : part.text}
                          {part.citation && part.citation.length > 0 && (
                            <span className="ml-1.5 inline-flex items-baseline gap-1 flex-wrap">
                              {part.citation.map((postId, i) => (
                                <Tooltip key={i} delayDuration={200}>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => {
                                        if (onCitationClick) {
                                          onCitationClick(postId);
                                        } else {
                                          router.push(`/files/${postId}/view`);
                                        }
                                      }}
                                      className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded border-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
                                    >
                                      <LinkIcon className="h-3 w-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="text-xs font-medium">
                                      {citedPosts?.[postId] || `File ${postId}`}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </span>
                          )}
                        </span>
                      ))}
                    </TooltipProvider>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                <ExternalLink className="h-3 w-3" />
                Click citation numbers to view the referenced files
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
