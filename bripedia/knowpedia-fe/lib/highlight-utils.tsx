import React from "react";

/**
 * Highlights text based on an array of specific words/phrases from the API
 * @param text - The text to highlight
 * @param highlightWords - Array of exact words/phrases to highlight (from API)
 * @returns React nodes with highlighted text
 */
export function highlightTextFromAPI(
  text: string,
  highlightWords: string[]
): React.ReactNode {
  if (!text || !highlightWords || highlightWords.length === 0) {
    return text || '';
  }

  // Escape special regex characters in highlight words
  const escapedWords = highlightWords
    .filter((word) => word && word.trim().length > 0)
    .map((word) => word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (escapedWords.length === 0) {
    return text;
  }

  // Create regex pattern that matches any of the highlight words (case-insensitive)
  const pattern = new RegExp(`(${escapedWords.join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    // Check if this part matches any highlight word (case-insensitive)
    const isMatch = escapedWords.some((word) =>
      new RegExp(`^${word}$`, "i").test(part)
    );

    if (isMatch) {
      return (
        <mark
          key={index}
          className="bg-primary/20 dark:bg-primary/30 text-inherit rounded px-0.5 font-semibold"
        >
          {part}
        </mark>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

/**
 * Legacy function: Highlights text based on search query (used for fallback)
 * @param text - The text to highlight
 * @param searchQuery - The search query string
 * @returns React nodes with highlighted text
 */
export function highlightText(
  text: string,
  searchQuery: string
): React.ReactNode {
  if (!text) {
    return text || '';
  }
  if (!searchQuery || !searchQuery.trim()) {
    return text;
  }

  // Split search query into individual words and escape special regex characters
  const keywords = searchQuery
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (keywords.length === 0) {
    return text;
  }

  // Create regex pattern that matches any of the keywords (case-insensitive)
  const pattern = new RegExp(`(${keywords.join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    // Check if this part matches any keyword (case-insensitive)
    const isMatch = keywords.some((keyword) =>
      new RegExp(`^${keyword}$`, "i").test(part)
    );

    if (isMatch) {
      return (
        <mark
          key={index}
          className="bg-sky-200/60 dark:bg-sky-400/30 text-inherit rounded px-0.5"
        >
          {part}
        </mark>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

/**
 * Highlight text in blog post content based on relevant chunks
 * @param content - The full blog post content
 * @param relevantChunks - Array of text chunks to highlight
 * @returns React nodes with highlighted chunks
 */
export function highlightChunks(
  content: string,
  relevantChunks: string[]
): React.ReactNode {
  if (!content) {
    return content || '';
  }
  if (!relevantChunks || relevantChunks.length === 0) {
    return content;
  }

  // Escape special regex characters in chunks and sort by length (longest first)
  // This prevents partial matches from interfering with longer matches
  const sortedChunks = relevantChunks
    .filter((chunk) => chunk && chunk.trim().length > 0)
    .map((chunk) => chunk.trim())
    .sort((a, b) => b.length - a.length)
    .map((chunk) => chunk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (sortedChunks.length === 0) {
    return content;
  }

  // Create regex pattern that matches any of the chunks
  const pattern = new RegExp(`(${sortedChunks.join("|")})`, "gi");
  const parts = content.split(pattern);

  return parts.map((part, index) => {
    // Check if this part matches any chunk
    const isMatch = sortedChunks.some((chunk) =>
      new RegExp(`^${chunk}$`, "i").test(part)
    );

    if (isMatch) {
      return (
        <mark
          key={index}
          className="bg-primary/20 dark:bg-primary/30 text-inherit rounded px-1 font-medium transition-colors duration-200"
        >
          {part}
        </mark>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}
