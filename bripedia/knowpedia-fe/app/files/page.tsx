"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Upload,
  FileText,
  MoreVertical,
  Download,
  Trash2,
  Edit,
  File,
  BookOpen,
  ArrowRight,
  FolderOpen,
  Folder,
  FolderPlus,
  X,
  Tag,
  Loader2,
  ChevronRight,
  Home,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import type { FolderItem, FileItem as ApiFileItem } from "@/lib/api-types";
import { fetchWithAuth } from "@/lib/api-client";



interface FileItem extends ApiFileItem {
  name: string;
  format: string;
  downloadUrl: string;
}

interface FolderContents {
  folder: FolderItem | null;
  breadcrumbs: FolderItem[];
  folders: FolderItem[];
  files: ApiFileItem[];
}

type PendingFile = {
  file: File;
  tempId: string;
};

export default function FilesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user } = useAuth();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Protect Files page - only admins can access
  useEffect(() => {
    if (user && !user.groups.includes("admin")) {
      router.push("/");
    }
  }, [user, router]);
  const [folderContents, setFolderContents] = useState<FolderContents | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Dialog states
  const [uploadDialog, setUploadDialog] = useState(false);
  const [createFolderDialog, setCreateFolderDialog] = useState(false);
  const [renameFolderDialog, setRenameFolderDialog] = useState<{
    open: boolean;
    folderId: string;
    currentName: string;
  }>({
    open: false,
    folderId: "",
    currentName: "",
  });
  const [moveFolderDialog, setMoveFolderDialog] = useState<{
    open: boolean;
    folderId: string;
  }>({
    open: false,
    folderId: "",
  });
  const [moveFileDialog, setMoveFileDialog] = useState<{
    open: boolean;
    fileId: string;
  }>({
    open: false,
    fileId: "",
  });
  const [renameFileDialog, setRenameFileDialog] = useState<{
    open: boolean;
    fileId: string;
    currentName: string;
  }>({
    open: false,
    fileId: "",
    currentName: "",
  });
  const [metadataDialog, setMetadataDialog] = useState<{
    open: boolean;
    fileId: string;
    currentDescription: string;
    currentTags: string[];
  }>({
    open: false,
    fileId: "",
    currentDescription: "",
    currentTags: [],
  });

  // Input states
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFolderName, setRenameFolderName] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Upload states
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFileType, setUploadFileType] = useState<"internal" | "external">(
    "internal"
  );
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState<string[]>([]);
  const [uploadAllowedLevels, setUploadAllowedLevels] = useState<string[]>([]);
  const [uploadAllowedGroups, setUploadAllowedGroups] = useState<string[]>([]);
  const [uploadNewTag, setUploadNewTag] = useState("");
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);

  // Fetch folder contents
  const fetchFolderContents = async (folderId: string | null = null) => {
    setIsLoading(true);
    try {
      const endpoint = folderId
        ? `/api/files/folders/${folderId}/contents`
        : "/api/files/browse";
      const response = await fetchWithAuth(`${endpoint}`);
      if (!response.ok) throw new Error("Failed to fetch folder contents");
      const data: FolderContents = await response.json();
      setFolderContents(data);
      setCurrentFolderId(folderId);
    } catch (error) {
      console.error("Error loading folder contents", error);
      toast.error(t("files.loading"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFolderContents();
  }, []);

  // File operations
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileUpload(droppedFiles);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFileUpload(selectedFiles);
    }
  };

  const handleFileUpload = async (uploadedFiles: File[]) => {
    const pending: PendingFile[] = uploadedFiles.map((file, index) => ({
      file,
      tempId: Date.now().toString() + index,
    }));

    setPendingFiles(pending);
    setCurrentFileIndex(0);
    setUploadFolderId(currentFolderId);

    if (pending.length > 0) {
      const firstFile = pending[0].file;
      setUploadFileName(firstFile.name);
      setUploadFileType("internal");
      setUploadDescription("");
      setUploadTags([]);
      setUploadDialog(true);

      await generateMetadataPreview(firstFile);
    }
  };

  const generateMetadataPreview = async (file: File) => {
    setIsGeneratingMetadata(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetchWithAuth("/api/files/preview-metadata", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.description) setUploadDescription(data.description);
        if (data.tags) setUploadTags(data.tags);
      }
    } catch (error) {
      console.error("Error generating metadata preview:", error);
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  const confirmFileUpload = async () => {
    if (pendingFiles.length === 0 || currentFileIndex >= pendingFiles.length)
      return;

    setIsLoading(true);
    const currentFile = pendingFiles[currentFileIndex].file;

    const formData = new FormData();
    formData.append("file", currentFile);
    formData.append("document_type", uploadFileType);
    formData.append("allowed_levels", JSON.stringify(uploadAllowedLevels));
    formData.append("allowed_groups", JSON.stringify(uploadAllowedGroups));
    if (currentFolderId) formData.append("folder_id", currentFolderId);

    const loadingToast = toast.loading(t("files.uploading"));

    try {
      const response = await fetchWithAuth("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const uploadedFile = await response.json();

      await fetchWithAuth(`/api/files/${uploadedFile.id}/metadata`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: uploadDescription || null,
          tags: uploadTags,
        }),
      });

      toast.success(t("files.uploadSuccess"), { id: loadingToast });

      const nextIndex = currentFileIndex + 1;
      if (nextIndex < pendingFiles.length) {
        // More files to upload - continue to next file
        setCurrentFileIndex(nextIndex);
        const nextFile = pendingFiles[nextIndex].file;
        setUploadFileName(nextFile.name);
        setUploadDescription("");
        setUploadTags([]);
        await generateMetadataPreview(nextFile);
      } else {
        // All files uploaded - close dialog and refresh
        setUploadDialog(false);
        setPendingFiles([]);
        setCurrentFileIndex(0);
        setUploadFileType("internal");
        setUploadDescription("");
        setUploadTags([]);
        // Reset file inputs
        const fileInput1 = document.getElementById(
          "file-upload"
        ) as HTMLInputElement;
        const fileInput2 = document.getElementById(
          "file-upload-card"
        ) as HTMLInputElement;
        if (fileInput1) fileInput1.value = "";
        if (fileInput2) fileInput2.value = "";

        // Refresh folder contents after all uploads complete
        await fetchFolderContents(currentFolderId);
      }
    } catch (error) {
      console.error("Upload error", error);
      toast.error(t("files.uploadFailed"), { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  const skipFileUpload = async () => {
    const nextIndex = currentFileIndex + 1;
    if (nextIndex < pendingFiles.length) {
      setCurrentFileIndex(nextIndex);
      const nextFile = pendingFiles[nextIndex].file;
      setUploadFileName(nextFile.name);
      setUploadDescription("");
      setUploadTags([]);
      await generateMetadataPreview(nextFile);
    } else {
      setUploadDialog(false);
      setPendingFiles([]);
      setCurrentFileIndex(0);
    }
  };

  // Folder operations
  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Please enter a folder name");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`/api/files/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName,
          parent_id: currentFolderId || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create folder");

      await fetchFolderContents(currentFolderId);
      toast.success(t("folders.folderCreated"));
      setCreateFolderDialog(false);
      setNewFolderName("");
    } catch (error) {
      console.error("Error creating folder", error);
      toast.error(t("folders.folderCreateFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const renameFolder = async () => {
    if (!renameFolderName.trim()) return;

    try {
      setIsLoading(true);
      const response = await fetchWithAuth(
        `/api/files/folders/${renameFolderDialog.folderId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: renameFolderName }),
        }
      );

      if (!response.ok) throw new Error("Failed to rename folder");

      await fetchFolderContents(currentFolderId);
      toast.success(t("folders.folderRenamed"));
      setRenameFolderDialog({ open: false, folderId: "", currentName: "" });
    } catch (error) {
      console.error("Error renaming folder", error);
      toast.error(t("folders.folderRenameFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm(t("folders.confirmDelete"))) return;

    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`/api/files/folders/${folderId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete folder");

      await fetchFolderContents(currentFolderId);
      toast.success(t("folders.folderDeleted"));
    } catch (error) {
      console.error("Error deleting folder", error);
      toast.error(t("folders.folderDeleteFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const moveFolder = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(
        `/api/files/folders/${moveFolderDialog.folderId}/move`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parent_id: selectedFolder || null }),
        }
      );

      if (!response.ok) throw new Error("Failed to move folder");

      await fetchFolderContents(currentFolderId);
      toast.success(t("folders.folderMoved"));
      setMoveFolderDialog({ open: false, folderId: "" });
      setSelectedFolder(null);
    } catch (error) {
      console.error("Error moving folder", error);
      toast.error(t("folders.folderMoveFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  // File operations
  const deleteFile = async (fileId: string) => {
    if (!confirm(t("files.confirmDelete"))) return;

    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`/api/files/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      await fetchFolderContents(currentFolderId);
      toast.success(t("files.deleteSuccess"));
    } catch (error) {
      console.error("Delete error", error);
      toast.error(t("files.deleteFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const renameFile = async () => {
    if (!newFileName.trim()) return;

    try {
      setIsLoading(true);
      const response = await fetchWithAuth(
        `/api/files/${renameFileDialog.fileId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: newFileName }),
        }
      );

      if (!response.ok) throw new Error("Rename failed");

      await fetchFolderContents(currentFolderId);
      toast.success("File renamed successfully");
      setRenameFileDialog({ open: false, fileId: "", currentName: "" });
    } catch (error) {
      console.error("Rename error", error);
      toast.error("Failed to rename file");
    } finally {
      setIsLoading(false);
    }
  };

  const moveFile = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(
        `/api/files/${moveFileDialog.fileId}/move`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder_id: selectedFolder || null }),
        }
      );

      if (!response.ok) throw new Error("Move failed");

      await fetchFolderContents(currentFolderId);
      toast.success(t("folders.fileMoved"));
      setMoveFileDialog({ open: false, fileId: "" });
      setSelectedFolder(null);
    } catch (error) {
      console.error("Move error", error);
      toast.error(t("folders.fileMoveFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const updateFileMetadata = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(
        `/api/files/${metadataDialog.fileId}/metadata`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: editDescription,
            tags: editTags,
          }),
        }
      );

      if (!response.ok) throw new Error("Update failed");

      await fetchFolderContents(currentFolderId);
      toast.success("Metadata updated successfully");
      setMetadataDialog({
        open: false,
        fileId: "",
        currentDescription: "",
        currentTags: [],
      });
    } catch (error) {
      console.error("Update error", error);
      toast.error("Failed to update metadata");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const response = await fetchWithAuth(`/api/files/${fileId}/download`);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error", error);
      toast.error("Failed to download file");
    }
  };

  // Helper functions
  const addUploadTag = () => {
    if (uploadNewTag.trim() && !uploadTags.includes(uploadNewTag.trim())) {
      setUploadTags([...uploadTags, uploadNewTag.trim()]);
      setUploadNewTag("");
    }
  };

  const removeUploadTag = (tagToRemove: string) => {
    setUploadTags(uploadTags.filter((tag) => tag !== tagToRemove));
  };

  const addTag = () => {
    if (newTag.trim() && !editTags.includes(newTag.trim())) {
      setEditTags([...editTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditTags(editTags.filter((tag) => tag !== tagToRemove));
  };

  if (!folderContents) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
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
                    <FolderOpen className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
                <h1 className="text-5xl md:text-6xl font-bold text-balance animate-in fade-in slide-in-from-bottom-4 duration-700">
                  Files
                </h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-10 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100">
            <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
            <p className="text-muted-foreground text-lg">
              {t("files.headerSubtitle")}
            </p>
          </div>

          {/* Upload Section */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200",
              isDragging
                ? "border-primary bg-primary/10 scale-105"
                : "border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-accent/5"
            )}
          >
            <div
              className={cn(
                "mb-4 h-16 w-16 rounded-full flex items-center justify-center transition-colors",
                isDragging
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/50 text-muted-foreground"
              )}
            >
              <Upload className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">
              {isDragging ? t("files.uploadTitleDrop") : t("files.uploadTitle")}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {t("files.uploadSubtitle")}
            </p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf"
              multiple
              onChange={handleFileInputChange}
            />
            <Button
              asChild
              className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg"
            >
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-4 w-4" />
                {t("files.selectFiles")}
                <ArrowRight className="h-4 w-4" />
              </label>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Breadcrumbs and Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => fetchFolderContents(null)}
                className="flex items-center gap-1 text-primary hover:underline cursor-pointer"
              >
                <Home className="h-4 w-4" />
                {t("folders.home")}
              </button>
              {folderContents.breadcrumbs.map((breadcrumb, index) => (
                <div key={breadcrumb.id} className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <button
                    onClick={() => fetchFolderContents(breadcrumb.id)}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    {breadcrumb.name}
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setUploadFolderId(currentFolderId);
                  const fileInput = document.getElementById(
                    "file-upload"
                  ) as HTMLInputElement;
                  if (fileInput) fileInput.click();
                }}
                className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                {t("files.selectFiles")}
              </Button>
              <Button
                onClick={() => setCreateFolderDialog(true)}
                className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all cursor-pointer"
              >
                <FolderPlus className="h-4 w-4" />
                {t("folders.createFolder")}
              </Button>
            </div>
          </div>

          {/* Folders and Files Section */}
          <Card className="border-none shadow-md">
            <CardContent className="px-8 py-4">
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                  {t("files.yourFiles")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {folderContents.folders.length}{" "}
                  {t("folders.newFolder").toLowerCase()} •{" "}
                  {folderContents.files.length} {t("files.filesStored")}
                </p>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">{t("files.loading")}</p>
                </div>
              ) : folderContents.folders.length === 0 &&
                folderContents.files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    {t("files.noFiles")}
                  </h3>
                  <p className="text-sm text-muted-foreground text-center mb-6">
                    {t("files.noFilesDesc")}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        setUploadFolderId(currentFolderId);
                        const fileInput = document.getElementById(
                          "file-upload"
                        ) as HTMLInputElement;
                        if (fileInput) fileInput.click();
                      }}
                      className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all cursor-pointer"
                    >
                      <Upload className="h-4 w-4" />
                      {t("files.selectFiles")}
                    </Button>
                    {currentFolderId && (
                      <Button
                        onClick={() =>
                          fetchFolderContents(
                            folderContents.folder?.parent_id || null
                          )
                        }
                        variant="outline"
                        className="gap-2 cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4 rotate-180" />
                        {t("folders.back")}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>{t("files.name")}</TableHead>
                        <TableHead className="w-[100px]">
                          {t("files.format")}
                        </TableHead>
                        <TableHead className="w-[120px]">
                          {t("files.size")}
                        </TableHead>
                        <TableHead className="w-[100px]">Description</TableHead>
                        <TableHead className="w-[150px]">
                          {t("files.documentType")}
                        </TableHead>
                        <TableHead className="w-[120px]">
                          {t("files.uploaded")}
                        </TableHead>
                        <TableHead className="w-[80px] text-right">
                          {t("files.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentFolderId &&
                        folderContents.folder?.parent_id !== null && (
                          <TableRow
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() =>
                              fetchFolderContents(
                                folderContents.folder?.parent_id || null
                              )
                            }
                          >
                            <TableCell>
                              <ChevronRight className="h-5 w-5 text-muted-foreground rotate-180" />
                            </TableCell>
                            <TableCell className="font-medium">
                              <span className="text-primary">..</span>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                Folder
                              </span>
                            </TableCell>
                            <TableCell />
                            <TableCell />
                            <TableCell />
                            <TableCell />
                            <TableCell className="text-right" />
                          </TableRow>
                        )}
                      {currentFolderId && !folderContents.folder?.parent_id && (
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => fetchFolderContents(null)}
                        >
                          <TableCell>
                            <ChevronRight className="h-5 w-5 text-muted-foreground rotate-180" />
                          </TableCell>
                          <TableCell className="font-medium">
                            <span className="text-primary">
                              {t("folders.back")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                              Folder
                            </span>
                          </TableCell>
                          <TableCell />
                          <TableCell />
                          <TableCell />
                          <TableCell />
                          <TableCell className="text-right" />
                        </TableRow>
                      )}
                      {folderContents.folders.map((folder) => (
                        <TableRow
                          key={folder.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => fetchFolderContents(folder.id)}
                        >
                          <TableCell>
                            <Folder className="h-5 w-5 text-primary" />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{folder.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                              Folder
                            </span>
                          </TableCell>
                          <TableCell />
                          <TableCell />
                          <TableCell />
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(folder.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="cursor-pointer bg-transparent hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-md hover:shadow-primary/30"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenameFolderDialog({
                                      open: true,
                                      folderId: folder.id,
                                      currentName: folder.name,
                                    });
                                    setRenameFolderName(folder.name);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  {t("folders.renameFolder")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMoveFolderDialog({
                                      open: true,
                                      folderId: folder.id,
                                    });
                                    setSelectedFolder(null);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <FolderOpen className="mr-2 h-4 w-4" />
                                  {t("folders.moveFolder")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteFolder(folder.id);
                                  }}
                                  className="text-red-600 cursor-pointer"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t("folders.deleteFolder")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {folderContents.files.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell>
                            <File className="h-5 w-5 text-red-500" />
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px]">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="truncate cursor-default">
                                    {file.filename}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs break-words">
                                    {file.filename}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                              PDF
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {file.size}
                          </TableCell>
                          <TableCell className="max-w-[500px]">
                            <div className="space-y-1">
                              {file.description && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="text-sm text-muted-foreground truncate cursor-default">
                                        {file.description}
                                      </p>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs break-words">
                                        {file.description}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {file.tags && file.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {file.tags.slice(0, 3).map((tag, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {file.tags.length > 3 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      +{file.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                file.document_type === "internal"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              )}
                            >
                              {file.document_type === "internal"
                                ? t("files.internalKnowledge")
                                : t("files.externalKnowledge")}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {file.uploaded_at?.split("T")[0] || ""}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="cursor-pointer bg-transparent hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-md hover:shadow-primary/30"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/files/${file.id}/view`)
                                  }
                                  className="cursor-pointer"
                                >
                                  <BookOpen className="mr-2 h-4 w-4" />
                                  {t("files.view")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDownload(file.id, file.filename)
                                  }
                                  className="cursor-pointer"
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  {t("files.download")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setRenameFileDialog({
                                      open: true,
                                      fileId: file.id,
                                      currentName: file.filename,
                                    });
                                    setNewFileName(file.filename);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  {t("files.rename")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setMoveFileDialog({
                                      open: true,
                                      fileId: file.id,
                                    });
                                    setSelectedFolder(null);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <FolderOpen className="mr-2 h-4 w-4" />
                                  {t("folders.moveFile")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setMetadataDialog({
                                      open: true,
                                      fileId: file.id,
                                      currentDescription:
                                        file.description || "",
                                      currentTags: file.tags || [],
                                    });
                                    setEditDescription(file.description || "");
                                    setEditTags(file.tags || []);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Tag className="mr-2 h-4 w-4" />
                                  Edit Metadata
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => deleteFile(file.id)}
                                  className="text-red-600 cursor-pointer"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t("files.delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      {/* Create Folder Dialog */}
      <Dialog open={createFolderDialog} onOpenChange={setCreateFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("folders.createFolder")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="folder-name">{t("folders.folderName")}</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") createFolder();
                }}
                placeholder={t("folders.enterFolderName")}
                className="border-muted-foreground/50"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateFolderDialog(false);
                setNewFolderName("");
              }}
              className="cursor-pointer"
            >
              {t("files.cancel")}
            </Button>
            <Button
              onClick={createFolder}
              disabled={isLoading}
              className="cursor-pointer bg-gradient-to-r from-primary to-accent"
            >
              {t("folders.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog
        open={renameFolderDialog.open}
        onOpenChange={(open) =>
          setRenameFolderDialog({ ...renameFolderDialog, open })
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("folders.renameFolder")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rename-folder">{t("folders.folderName")}</Label>
              <Input
                id="rename-folder"
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                placeholder={t("folders.enterFolderName")}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setRenameFolderDialog({
                  open: false,
                  folderId: "",
                  currentName: "",
                })
              }
              className="cursor-pointer"
            >
              {t("files.cancel")}
            </Button>
            <Button
              onClick={renameFolder}
              disabled={isLoading}
              className="cursor-pointer bg-gradient-to-r from-primary to-accent"
            >
              {t("folders.renameFolder")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Folder Dialog */}
      <Dialog
        open={moveFolderDialog.open}
        onOpenChange={(open) =>
          setMoveFolderDialog({ ...moveFolderDialog, open })
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("folders.moveFolder")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("folders.selectDestination")}</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-2">
                <div
                  className={cn(
                    "p-2 rounded cursor-pointer hover:bg-accent",
                    selectedFolder === null
                      ? "bg-primary text-primary-foreground"
                      : ""
                  )}
                  onClick={() => setSelectedFolder(null)}
                >
                  {t("folders.root")}
                </div>
                {folderContents.folder && (
                  <div
                    className={cn(
                      "p-2 rounded cursor-pointer hover:bg-accent",
                      selectedFolder === folderContents.folder.parent_id
                        ? "bg-primary text-primary-foreground"
                        : ""
                    )}
                    onClick={() =>
                      setSelectedFolder(
                        folderContents.folder?.parent_id || null
                      )
                    }
                  >
                    ..
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setMoveFolderDialog({ open: false, folderId: "" })}
              className="cursor-pointer"
            >
              {t("files.cancel")}
            </Button>
            <Button
              onClick={moveFolder}
              disabled={isLoading}
              className="cursor-pointer bg-gradient-to-r from-primary to-accent"
            >
              {t("folders.moveTo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move File Dialog */}
      <Dialog
        open={moveFileDialog.open}
        onOpenChange={(open) => setMoveFileDialog({ ...moveFileDialog, open })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("folders.moveFile")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("folders.selectDestination")}</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-2">
                <div
                  className={cn(
                    "p-2 rounded cursor-pointer hover:bg-accent",
                    selectedFolder === null
                      ? "bg-primary text-primary-foreground"
                      : ""
                  )}
                  onClick={() => setSelectedFolder(null)}
                >
                  {t("folders.root")}
                </div>
                {folderContents.folders.map((folder) => (
                  <div
                    key={folder.id}
                    className={cn(
                      "p-2 rounded cursor-pointer hover:bg-accent",
                      selectedFolder === folder.id
                        ? "bg-primary text-primary-foreground"
                        : ""
                    )}
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    {folder.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setMoveFileDialog({ open: false, fileId: "" })}
              className="cursor-pointer"
            >
              {t("files.cancel")}
            </Button>
            <Button
              onClick={moveFile}
              disabled={isLoading}
              className="cursor-pointer bg-gradient-to-r from-primary to-accent"
            >
              {t("folders.moveTo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("files.configureUpload")}</DialogTitle>
          </DialogHeader>
          {isGeneratingMetadata && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">
                {t("files.generatingMetadata")}
              </p>
            </div>
          )}
          {!isGeneratingMetadata && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="upload-name">{t("files.fileName")}</Label>
                <Input
                  id="upload-name"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  disabled={isLoading}
                  className="border-muted-foreground/50"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="doc-type">{t("files.documentType")}</Label>
                <Select
                  value={uploadFileType}
                  onValueChange={(value: "internal" | "external") =>
                    setUploadFileType(value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger id="doc-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">
                      {t("files.internalKnowledge")}
                    </SelectItem>
                    <SelectItem value="external">
                      {t("files.externalKnowledge")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Allowed Levels (Visible to these levels)</Label>
                <div className="flex flex-wrap gap-4 p-2 border rounded-md">
                  {["director", "manager", "staff"].map((l) => (
                    <div key={l} className="flex items-center space-x-2">
                      <Checkbox
                        id={`level-${l}`}
                        checked={uploadAllowedLevels.includes(l)}
                        onCheckedChange={(checked) => {
                          if (checked) setUploadAllowedLevels([...uploadAllowedLevels, l]);
                          else setUploadAllowedLevels(uploadAllowedLevels.filter(x => x !== l));
                        }}
                      />
                      <Label htmlFor={`level-${l}`} className="text-sm font-normal capitalize">{l}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Allowed Groups (Visible to these groups)</Label>
                <div className="flex flex-wrap gap-4 p-2 border rounded-md">
                  {["ESG", "IT", "admin"].map((g) => (
                    <div key={g} className="flex items-center space-x-2">
                      <Checkbox
                        id={`group-${g}`}
                        checked={uploadAllowedGroups.includes(g)}
                        onCheckedChange={(checked) => {
                          if (checked) setUploadAllowedGroups([...uploadAllowedGroups, g]);
                          else setUploadAllowedGroups(uploadAllowedGroups.filter(x => x !== g));
                        }}
                      />
                      <Label htmlFor={`group-${g}`} className="text-sm font-normal capitalize">{g}</Label>
                    </div>
                  ))}
                </div>
              </div>


              <div className="grid gap-2">
                <Label htmlFor="upload-description">Description</Label>
                <Textarea
                  id="upload-description"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  disabled={isLoading}
                  className="border-muted-foreground/50 min-h-[100px]"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="upload-tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="upload-tags"
                    value={uploadNewTag}
                    onChange={(e) => setUploadNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addUploadTag();
                      }
                    }}
                    disabled={isLoading}
                    placeholder="Add a tag and press Enter"
                    className="border-muted-foreground/50"
                  />
                  <Button
                    onClick={addUploadTag}
                    disabled={isLoading}
                    className="cursor-pointer"
                  >
                    Add
                  </Button>
                </div>
                {uploadTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {uploadTags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm">
                        {tag}
                        <button
                          className="ml-1 hover:text-destructive"
                          onClick={() => removeUploadTag(tag)}
                          disabled={isLoading}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialog(false);
                setPendingFiles([]);
                setCurrentFileIndex(0);
              }}
              disabled={isLoading || isGeneratingMetadata}
              className="cursor-pointer"
            >
              {t("files.cancel")}
            </Button>
            <Button
              onClick={confirmFileUpload}
              disabled={isLoading || isGeneratingMetadata}
              className="cursor-pointer bg-gradient-to-r from-primary to-accent"
            >
              {isLoading
                ? "Uploading..."
                : currentFileIndex < pendingFiles.length - 1
                  ? t("files.next")
                  : t("files.upload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename File Dialog */}
      <Dialog
        open={renameFileDialog.open}
        onOpenChange={(open) =>
          setRenameFileDialog({ ...renameFileDialog, open })
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("files.renameFile")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder={t("files.enterFileName")}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRenameFileDialog({
                  open: false,
                  fileId: "",
                  currentName: "",
                })
              }
              className="cursor-pointer"
            >
              {t("files.cancel")}
            </Button>
            <Button
              onClick={renameFile}
              disabled={isLoading}
              className="cursor-pointer"
            >
              {t("files.rename")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Metadata Dialog */}
      <Dialog
        open={metadataDialog.open}
        onOpenChange={(open) => setMetadataDialog({ ...metadataDialog, open })}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Metadata</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="grid gap-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add a tag"
                />
                <Button onClick={addTag} className="cursor-pointer">
                  Add
                </Button>
              </div>
              {editTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editTags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tag}
                      <button className="ml-1" onClick={() => removeTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setMetadataDialog({
                  open: false,
                  fileId: "",
                  currentDescription: "",
                  currentTags: [],
                })
              }
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={updateFileMetadata}
              disabled={isLoading}
              className="cursor-pointer"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
