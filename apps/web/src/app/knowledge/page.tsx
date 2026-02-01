'use client';

import { useState } from 'react';
import { Upload, FileText, Search, Loader2, Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

export default function KnowledgePage() {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Simplified document list (in a real app, fetch from backend)
    const [documents, setDocuments] = useState<string[]>([]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await uploadFile(files[0]);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await uploadFile(e.target.files[0]);
        }
    };

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        setUploadStatus('idle');
        setStatusMessage('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:3001/knowledge/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setUploadStatus('success');
                setStatusMessage(`Successfully processed ${file.name} (${data.data.chunks} chunks)`);
                setDocuments(prev => [...prev, file.name]);
            } else {
                setUploadStatus('error');
                setStatusMessage(data.error || 'Upload failed');
            }
        } catch (error) {
            setUploadStatus('error');
            setStatusMessage('Network error. Is the backend running?');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const response = await fetch('http://localhost:3001/knowledge/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery }),
            });

            const data = await response.json();
            if (data.success) {
                setSearchResults(data.data);
            }
        } catch (error) {
            console.error('Search failed', error);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F1117] text-gray-100 p-8 font-sans selection:bg-purple-500/30">
            <div className="max-w-5xl mx-auto space-y-12">

                {/* Back Button */}
                <a
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-colors group"
                >
                    <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Chat
                </a>

                {/* Header */}
                <div className="space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Knowledge Base
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl">
                        Upload documents to train your agents. They can retrieve this information during conversations using RAG.
                    </p>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Left Column: Upload */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-xl font-semibold text-purple-200">
                            <Upload className="w-5 h-5" />
                            <h2>Upload Documents</h2>
                        </div>

                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={twMerge(
                                "relative group border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ease-out cursor-pointer overflow-hidden",
                                "flex flex-col items-center justify-center text-center gap-4",
                                isDragging
                                    ? "border-purple-400 bg-purple-500/10 scale-[1.02]"
                                    : "border-gray-700 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50"
                            )}
                        >
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileSelect}
                                accept=".pdf,.txt,.md,.json"
                            />

                            <div className={twMerge(
                                "p-4 rounded-full bg-gray-800 transition-transform duration-300 group-hover:scale-110",
                                isDragging ? "bg-purple-500/20 text-purple-300" : "text-gray-400"
                            )}>
                                {isUploading ? (
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                ) : (
                                    <Upload className="w-8 h-8" />
                                )}
                            </div>

                            <div className="space-y-1">
                                <p className="text-lg font-medium text-gray-200">
                                    {isDragging ? "Drop to upload" : "Click or drag files here"}
                                </p>
                                <p className="text-sm text-gray-500">
                                    Support for PDF, TXT, MD, JSON
                                </p>
                            </div>
                        </div>

                        {/* Status Messages */}
                        {uploadStatus !== 'idle' && (
                            <div className={twMerge(
                                "p-4 rounded-lg flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2",
                                uploadStatus === 'success' ? "bg-green-500/10 text-green-300 border border-green-500/20" : "bg-red-500/10 text-red-300 border border-red-500/20"
                            )}>
                                {uploadStatus === 'success' ? (
                                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                )}
                                <div>
                                    <p className="font-medium">{uploadStatus === 'success' ? 'Upload Complete' : 'Upload Failed'}</p>
                                    <p className="opacity-80 mt-1">{statusMessage}</p>
                                </div>
                            </div>
                        )}

                        {/* Recent Uploads List */}
                        {documents.length > 0 && (
                            <div className="space-y-3 pt-4">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Indexed Documents</h3>
                                <div className="space-y-2">
                                    {documents.map((doc, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                                            <FileText className="w-4 h-4 text-purple-400" />
                                            <span className="text-sm text-gray-300">{doc}</span>
                                            <span className="ml-auto text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Indexed</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Search Playground */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-xl font-semibold text-blue-200">
                            <Database className="w-5 h-5" />
                            <h2>Semantic Search Playground</h2>
                        </div>

                        <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-6 space-y-6">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Ask a question about your documents..."
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 pl-11 text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-500" />

                                <button
                                    onClick={handleSearch}
                                    disabled={isSearching || !searchQuery}
                                    className="absolute right-2 top-2 p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                </button>
                            </div>

                            <div className="space-y-4">
                                {searchResults.length === 0 && !isSearching ? (
                                    <div className="text-center py-12 text-gray-600">
                                        <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>Search results will appear here</p>
                                    </div>
                                ) : (
                                    searchResults.map((result, idx) => (
                                        <div key={idx} className="group p-4 rounded-xl bg-gray-900/50 border border-gray-700/50 hover:border-purple-500/30 transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-mono text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded">
                                                    {(result.similarity * 100).toFixed(1)}% Match
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {result.metadata?.source || 'Unknown Source'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-300 leading-relaxed">
                                                {result.content}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
