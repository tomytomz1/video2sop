"use client";
import React, { useRef, useState } from 'react';
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
      setError(null);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setMessage(null);
      setError(null);
    }
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Upload file to backend
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setMessage(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('video', file);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/upload/file`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        setUploading(false);
        if (xhr.status === 201) {
          setMessage('Video uploaded successfully!');
          setFile(null);
          setProgress(0);
        } else {
          setError(`Upload failed: ${xhr.responseText}`);
        }
      };
      xhr.onerror = () => {
        setUploading(false);
        setError('Upload failed: Network error');
      };
      xhr.send(formData);
    } catch (err) {
      setUploading(false);
      setError('Upload failed: Unexpected error');
    }
  };

  // Submit YouTube URL
  const handleYoutubeSubmit = async () => {
    setUploading(true);
    setMessage(null);
    setError(null);
    setProgress(0);
    try {
      const res = await fetch(`${API_URL}/upload/youtube`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      setUploading(false);
      if (res.ok) {
        setMessage('YouTube video submitted successfully!');
        setYoutubeUrl('');
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to submit YouTube URL');
      }
    } catch (err) {
      setUploading(false);
      setError('Failed to submit YouTube URL: Network error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-soft px-4 py-12">
      <Card className="w-full max-w-2xl glass-card hover-scale">
        <CardContent className="p-10">
          <h1 className="text-5xl font-extrabold text-center mb-4 text-gradient">
            Video to SOP Converter
          </h1>
          <p className="prose prose-lg text-gray-600 mb-8 text-center">
            Upload a video or provide a YouTube URL to convert it into a detailed <span className="font-semibold text-primary-700">Standard Operating Procedure</span>.
          </p>
          <div className="space-y-6">
            {/* Drag and drop area */}
            <div
              className={`drop-zone rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 hover-scale ${
                file ? 'border-primary-500 bg-primary-50/50' : 'border-gray-300'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={uploading}
              />
              {file ? (
                <div>
                  <p className="text-primary-700 font-semibold text-lg">{file.name}</p>
                  <Button
                    className="mt-4 w-full text-lg btn-gradient text-white"
                    onClick={handleUpload}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload Video'}
                  </Button>
                  {uploading && (
                    <div className="mt-2 w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="progress-bar h-2.5 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-500 text-lg">Drag and drop your video here, or click to browse</p>
                </div>
              )}
            </div>
            <Separator className="my-4" />
            {/* YouTube URL input */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Input
                type="text"
                placeholder="Enter YouTube URL"
                className="flex-1 text-lg input-enhanced"
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                disabled={uploading}
              />
              <Button
                className="w-full sm:w-auto text-lg btn-gradient text-white"
                onClick={handleYoutubeSubmit}
                disabled={uploading || !youtubeUrl}
              >
                {uploading ? 'Submitting...' : 'Convert'}
              </Button>
            </div>
            {/* Feedback messages */}
            {message && (
              <div className="text-success font-medium text-center text-lg bg-green-50 p-3 rounded-lg">
                {message}
              </div>
            )}
            {error && (
              <div className="text-error font-medium text-center text-lg bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 