/**
 * API Types - matching the backend response structure
 */

export interface ContentHighlightData {
  search_snippet: string;
  search_snippet_highlighted: string[];
  relevant_chunks: string[];
}

export interface BlogPostSearchResult {
  id: string;
  title: string;
  description: string;
  author: string;
  published_at: string;
  tags: string[];
  highlight: ContentHighlightData;
}

export interface SearchMetadata {
  total_results: number;
  page: number;
  size: number;
}

export interface SearchSummaryPart {
  text: string;
  citation: string[];
  highlighted_words?: string[];
}

export interface BlogPostSearchResponse {
  metadata: SearchMetadata;
  results: BlogPostSearchResult[];
  search_summary: SearchSummaryPart[] | null;
  cited_posts: Record<string, string> | null;
}

export interface SearchSummaryResponse {
  search_summary: SearchSummaryPart[] | null;
  cited_posts: Record<string, string> | null;
  cited_files: Record<string, string> | null;
  metadata?: { total_results?: number; top_k?: number };
}

export interface BlogPost {
  id: string;
  title: string;
  author: string;
  content: string;
  description: string;
  published_at: string;
  tags: string[];
}

// Folder types
export interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at?: string;
}

export interface FileItem {
  id: string;
  filename: string;
  document_type: 'internal' | 'external';
  size: string;
  uploaded_at: string;
  description?: string;
  tags?: string[];
  folder_id?: string | null;
}

export interface FolderContents {
  folder: FolderItem | null;
  breadcrumbs: FolderItem[];
  folders: FolderItem[];
  files: FileItem[];
}
