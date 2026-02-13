"use client";

import { useEffect, useState, useCallback } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { Clock, User, Tag, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { highlightChunks } from "@/lib/highlight-utils";
import { fetchWithAuth } from "@/lib/api-client";



interface BlogPost {
  id: string;
  title: string;
  author: string;
  content: string;
  description: string;
  published_at: string;
  tags: string[];
}

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const searchParams = useSearchParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [relevantChunks, setRelevantChunks] = useState<string[]>([]);
  const [postId, setPostId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [showSummary, setShowSummary] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchSummaryFromAPI = useCallback(
    async (articleId: string): Promise<string> => {
      const response = await fetchWithAuth(`/api/posts/${articleId}/summarize`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch summary");
      }
      const data = await response.json();
      return data.summary;
    },
    []
  );

  const handleSummarize = async () => {
    if (showSummary) {
      setShowSummary(false);
      return;
    }

    setLoadingSummary(true);
    try {
      const data = await fetchSummaryFromAPI(postId!);
      setSummary(data);
      setShowSummary(true);
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
    setLoadingSummary(false);
  };

  useEffect(() => {
    // Unwrap params Promise
    params.then(({ id }) => {
      setPostId(id);
    });
  }, [params]);

  useEffect(() => {
    if (!postId) return;

    // Parse relevant_chunks from URL
    const chunksParam = searchParams.get('chunks');
    if (chunksParam) {
      try {
        const chunks = JSON.parse(decodeURIComponent(chunksParam));
        setRelevantChunks(Array.isArray(chunks) ? chunks : []);
      } catch (e) {
        console.error('Failed to parse chunks:', e);
      }
    }

    // Fetch blog post
    fetchWithAuth(`/api/posts/${postId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Post not found');
        }
        return response.json();
      })
      .then(data => {
        setPost(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching blog post:', error);
        setLoading(false);
      });
  }, [postId, searchParams]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      </main>
    );
  }

  if (!post) {
    notFound();
  }

  const publishedDate = new Date(post.published_at).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}

        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 mr-1">
            <Button
              variant="ghost"
              className="mb-6 cursor-pointer"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>

        {/* Blog post card */}
        <Card>
          <CardHeader className="space-y-4">
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold leading-tight">
                {post.title}
              </CardTitle>
              <CardDescription className="text-base">
                {post.description}
              </CardDescription>
            </div>

            {/* Meta information */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{publishedDate}</span>
              </div>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>

          <Separator />

          <CardContent className="pt-1">
            {/* AI Summary Button */}
            <div className="mb-6 flex flex-wrap gap-2">
              <Button
                onClick={handleSummarize}
                disabled={loadingSummary}
                variant="outline"
                size="sm"
                className="gap-2 transition-all duration-300 hover:scale-105 hover:border-primary/50 hover:bg-transparent active:scale-95 cursor-pointer font-medium bg-transparent hover:text-foreground"
              >
                {loadingSummary ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : showSummary ? (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Hide Summary
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    AI Summary
                  </>
                )}
              </Button>
            </div>

            {/* AI Summary Box */}
            {showSummary && summary && (
              <div className="mb-6 p-5 rounded-xl bg-gradient-to-br from-primary/5 via-accent/5 to-muted/50 border-2 border-primary/20 animate-in fade-in slide-in-from-top-2 duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-xl pointer-events-none" />
                <div className="relative">
                  <h4 className="text-sm font-bold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
                    <span className="w-1 h-5 bg-gradient-to-b from-primary to-accent rounded-full"></span>
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Summary
                  </h4>
                  <p className="text-sm leading-relaxed whitespace-pre-line break-words text-foreground/90">
                    {summary}
                  </p>
                </div>
              </div>
            )}
            {/* Relevant chunks indicator */}
            {relevantChunks.length > 0 && (
              <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    Relevant sections highlighted based on your search
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {relevantChunks.length} relevant {relevantChunks.length === 1 ? 'section' : 'sections'} found
                </p>
              </div>
            )}

            {/* Blog content */}
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap leading-relaxed">
                {relevantChunks.length > 0
                  ? highlightChunks(post.content, relevantChunks)
                  : post.content
                }
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
