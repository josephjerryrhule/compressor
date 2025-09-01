'use client';

import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';

// Function to determine API endpoint (Electron or web)
const getAPIEndpoint = () => {
  // Check if we're in Electron
  if (typeof window !== 'undefined' && (window as any).isElectron) {
    return 'http://localhost:4000/api';
  }
  
  // For Netlify deployments, use the Netlify Function
  if (typeof window !== 'undefined' && window.location.hostname.includes('netlify.app')) {
    return '/.netlify/functions/api-proxy';
  }
  
  // For production web environment, use the environment variable
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`;
  }
  
  // Fallback for development
  return '/api';
};

// Function to handle failed requests with retries
const apiRequestWithRetry = async (url: string, method: string, data: any, retries = 3, delay = 1000) => {
  try {
    return await axios({
      url,
      method,
      data,
      timeout: 30000, // 30 second timeout
    });
  } catch (error) {
    if (retries > 0) {
      console.log(`Request failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiRequestWithRetry(url, method, data, retries - 1, delay * 1.5);
    }
    throw error;
  }
};

type MediaFile = File;
type MediaType = 'image' | 'video';
type ResultFile = {
  originalName: string;
  outputName: string;
  originalSize: number;
  compressedSize: number;
  outputPath: string;
  error?: string; // Optional error message for failed compressions
};

export default function CompressorClient() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [results, setResults] = useState<ResultFile[]>([]);
  const [quality, setQuality] = useState<number>(80);
  const [lossless, setLossless] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [processingFiles, setProcessingFiles] = useState<{[key: string]: boolean}>({});
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [videoSettings, setVideoSettings] = useState({
    bitrate: '2M',
    resolution: '720',
    framerate: '30',
    codec: 'h264'
  });
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Handle file selection
  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length > 0) {
      processFiles(selected);
    }
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selected = Array.from(e.dataTransfer.files);
      processFiles(selected);
    }
  };
  
  // Process files (common code for both drag-drop and file input)
  const processFiles = (selected: File[]) => {
    // Store the files and create previews
    setFiles(prevFiles => [...prevFiles, ...selected]);
    setPreviews(prevPreviews => [
      ...prevPreviews,
      ...selected.map(file => URL.createObjectURL(file))
    ]);
    
    // Auto-detect media type from first file
    if (selected.length > 0) {
      const firstType = selected[0].type.split('/')[0];
      setMediaType(firstType === 'video' ? 'video' : 'image');
    }
    
    // Note: We no longer auto-start compression
    // Users will need to click the "Compress & Convert" button
  };

  // Determine the API base URL dynamically
  const getApiBaseUrl = () => {
    // Check if we're in Electron environment by looking for a global variable
    if (typeof window !== 'undefined' && (window as any).isElectron) {
      return 'http://localhost:4000/api'; // In Electron, always use the localhost URL
    }
    
    // For Netlify deployments, use the Netlify Function
    if (typeof window !== 'undefined' && window.location.hostname.includes('netlify.app')) {
      return '/.netlify/functions/api-proxy';
    }
    
    // For production web environment, use the environment variable
    if (process.env.NEXT_PUBLIC_BACKEND_URL) {
      return `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`;
    }
    
    // In web development environment, use a relative path without trailing slash
    return '/api';
  };
  
  // Function to handle failed requests with retries
  const apiRequestWithRetry = async (url: string, method: string, data: any, retries = 3, delay = 1000) => {
    try {
      return await axios({
        url,
        method,
        data,
        timeout: 30000, // 30 second timeout
      });
    } catch (error) {
      if (retries > 0) {
        console.log(`Request failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return apiRequestWithRetry(url, method, data, retries - 1, delay * 1.5);
      }
      throw error;
    }
  };
  
  // Upload and compress a single file
  const compressFile = async (file: File) => {
    // Create a safe filename by removing problematic characters
    const safeFileName = file.name.replace(/[^\w\d.-]/g, '_');
    
    const formData = new FormData();
    // Use the original file but with a sanitized filename for the server
    const safeFile = new File([file], safeFileName, { type: file.type });
    formData.append('files', safeFile);
    
    // Show warning if the original filename contained problematic characters
    if (safeFileName !== file.name) {
      console.warn(`Filename "${file.name}" contains special characters that may cause issues. Using "${safeFileName}" instead.`);
    }
    
    let endpoint = '';
    // Use the correct API URL based on environment
    const apiBaseUrl = getApiBaseUrl();
    
    if (file.type.startsWith('image')) {
      endpoint = `${apiBaseUrl}/compress/image`;
      formData.append('quality', String(quality));
      formData.append('lossless', String(lossless));
    } else {
      endpoint = `${apiBaseUrl}/compress/video`;
      formData.append('bitrate', videoSettings.bitrate);
      formData.append('resolution', videoSettings.resolution);
      formData.append('framerate', videoSettings.framerate);
      formData.append('codec', videoSettings.codec);
    }
    
    try {
      // First check if server is running with a health check
      try {
        await axios.get(`${apiBaseUrl}/health`);
      } catch (healthErr) {
        // Try alternative endpoint format without trailing slash
        try {
          await axios.get(`${apiBaseUrl.replace(/\/$/, '')}/health`);
        } catch (err) {
          console.error('Backend server not available:', healthErr);
          throw new Error('Backend server not responding. Please make sure it is running on port 4000.');
        }
      }
      
      // Check file type compatibility before sending
      if (file.type.startsWith('video/')) {
        // Video file validation
        if (file.size > 1024 * 1024 * 500) {  // 500MB limit
          throw new Error('Video file is too large (max 500MB)');
        }
        
        // Check for potential problematic video filenames with spaces and special chars
        if (/[\s&$#@!()\[\]{}%^*]/.test(file.name)) {
          console.warn('Video filename contains special characters which may cause issues:', file.name);
          // The sanitized filename should handle this, but warn the user
        }
        
        // Warn about certain video formats that are known to cause issues
        const problematicExtensions = ['.mov', '.avi', '.wmv', '.flv'];
        if (problematicExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
          console.warn(`The video format ${file.name.split('.').pop()} might have compatibility issues. Consider using MP4 instead.`);
        }
      }
      
      // Now attempt the actual compression
      const res = await axios.post(endpoint, formData, {
        onUploadProgress: (progressEvent) => {
          console.log(`Upload Progress for ${file.name}: ${Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))}%`);
        },
        timeout: 300000, // Increase timeout to 5 minutes for large files
        headers: {
          'X-Original-Filename': encodeURIComponent(file.name) // Send original filename for better error reporting
        }
      });
      
      // Add new result to results list
      if (res.data.results && res.data.results.length > 0) {
        const newResult = res.data.results[0];
        setResults(prevResults => [...prevResults, newResult]);
      } else {
        throw new Error('Server response did not include compression results');
      }
      
      // Remove file from processing state
      setProcessingFiles(prev => {
        const updated = {...prev};
        delete updated[file.name];
        return updated;
      });
      
    } catch (err) {
      console.error(`Error compressing ${file.name}:`, err);
      
      // Display a more helpful error message to the user
      let errorMessage = 'Unknown server error';
      let errorDetails = '';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (axios.isAxiosError(err)) {
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
          errorDetails = err.response.data.details || '';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        // Specific handling for common video compression issues
        if (errorMessage.includes('FFmpeg failed')) {
          errorMessage = 'Video compression failed. The file may be corrupted or in an unsupported format.';
        }
      }
      
      // Create a more descriptive error message for the user
      let userMessage = `Failed to compress ${file.name}: ${errorMessage}`;
      
      // Display error in UI
      setResults(prevResults => [
        ...prevResults, 
        {
          originalName: file.name,
          outputName: 'Compression failed',
          originalSize: file.size,
          compressedSize: 0,
          outputPath: '',
          error: userMessage // Add error field to identify failed results
        }
      ]);
      
      // Remove file from processing state even if it failed
      setProcessingFiles(prev => {
        const updated = {...prev};
        delete updated[file.name];
        return updated;
      });
    }
  };

  // Batch compress all files when user clicks the button
  const compressMedia = async () => {
    setLoading(true);
    
    // Check if backend server is running first
    try {
      const apiBaseUrl = getApiBaseUrl();
      await axios.get(`${apiBaseUrl}/health`);
    } catch (err) {
      setLoading(false);
      alert('Backend server not responding. Please make sure it is running on port 4000.');
      return;
    }
    
    // Create a map to track which files are being processed
    const processingMap = { ...processingFiles };
    
    // Mark all files as processing
    files.forEach(file => {
      processingMap[file.name] = true;
    });
    setProcessingFiles(processingMap);
    
    // Count successfully processed files and failures
    let successCount = 0;
    let errorCount = 0;
    
    // Process all files with proper error handling
    try {
      // Process files sequentially to avoid overwhelming the server
      for (const file of files) {
        try {
          await compressFile(file);
          successCount++;
        } catch (fileErr) {
          console.error(`Error compressing ${file.name}:`, fileErr);
          errorCount++;
          
          // Even if one file fails, continue with others
          // The compressFile function already adds the error to results
          
          // Remove file from processing state
          setProcessingFiles(prev => {
            const updated = {...prev};
            delete updated[file.name];
            return updated;
          });
        }
      }
      
      // Show a summary of compression results
      if (successCount > 0 && errorCount === 0) {
        // All files compressed successfully
        alert(`Successfully compressed ${successCount} file${successCount !== 1 ? 's' : ''}`);
      } else if (successCount > 0 && errorCount > 0) {
        // Some files compressed, some failed
        alert(`Compressed ${successCount} file${successCount !== 1 ? 's' : ''}, but ${errorCount} file${errorCount !== 1 ? 's' : ''} failed. Check the results for details.`);
      } else if (successCount === 0 && errorCount > 0) {
        // All files failed
        alert(`Failed to compress ${errorCount} file${errorCount !== 1 ? 's' : ''}. Check the results for details.`);
      }
      
    } catch (err) {
      console.error('Batch compression error:', err);
      alert('An unexpected error occurred during compression.');
    } finally {
      setLoading(false);
    }
  };

  // Format file size to readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Download ZIP
  const downloadZip = async () => {
    try {
      const filePaths = results.map(r => r.outputPath);
      const apiBaseUrl = getApiBaseUrl();
      
      // For Netlify deployments, use the API proxy
      let zipEndpoint;
      if (typeof window !== 'undefined' && window.location.hostname.includes('netlify.app')) {
        zipEndpoint = `/.netlify/functions/api-proxy/download/zip`;
      } else {
        zipEndpoint = `${apiBaseUrl}/download/zip`;
      }
      
      // Use retry logic for better reliability
      const res = await apiRequestWithRetry(
        zipEndpoint, 
        'post', 
        { files: filePaths }, 
        3, // 3 retries
        1500 // 1.5 second initial delay
      );
      
      // Create a blob from the response data
      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      
      // Create and trigger download link
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'compressed_media.zip');
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        link.remove();
      }, 100);
    } catch (err) {
      console.error('Error downloading ZIP file:', err);
      alert('Failed to download ZIP file. Please try again or download files individually.');
    }
  };
  
  // No codec checking needed since we only support H.264 now

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Media Compressor</h1>
      <p className="text-gray-500 mb-6 text-center max-w-lg">Optimize images and videos with WebP conversion and advanced compression</p>
      
      {/* Main Container */}
      <div className="w-full max-w-6xl bg-white shadow border border-gray-200">
        <div className="flex flex-col lg:flex-row">
          {/* Left Panel: Upload and Settings */}
          <div 
            className={`lg:w-1/3 p-6 ${dragActive ? 'bg-blue-50' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="sticky top-6">
              {/* File Upload */}
              <div className="mb-6 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="w-16 h-16 bg-blue-50 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-lg font-medium mb-2 text-gray-700">Drop files here</h2>
                <p className="text-xs text-gray-500 mb-4">Images (JPEG, PNG, GIF)<br/>Videos (MP4, MOV)</p>
                <label className="cursor-pointer">
                  <input type="file" multiple accept="image/*,video/*" onChange={handleFiles} className="hidden" />
                  <span className="inline-block px-4 py-2 bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors">
                    Select Files
                  </span>
                </label>
              </div>
              
              {/* Compression Settings */}
              {files.length > 0 && (
                <>
                  {/* File Type Selector */}
                  <div className="flex justify-center mb-4">
                    <button 
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${mediaType === 'image' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'}`}
                      onClick={() => setMediaType('image')}
                    >
                      Image
                    </button>
                    <button 
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ml-2 ${mediaType === 'video' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'}`}
                      onClick={() => setMediaType('video')}
                    >
                      Video
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 p-4 mb-4 border border-gray-200">
                    <h3 className="font-medium text-sm mb-3 text-gray-700">Compression Settings</h3>
                    
                    {mediaType === 'image' ? (
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <label className="text-sm text-gray-600">Quality: {quality}%</label>
                            <span className="text-xs text-gray-500">{quality < 65 ? 'Smaller file' : quality > 85 ? 'Better quality' : 'Balanced'}</span>
                          </div>
                          <input 
                            type="range" 
                            min={50} 
                            max={100} 
                            value={quality} 
                            onChange={e => setQuality(Number(e.target.value))} 
                            className="w-full h-2 bg-gray-200 appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            id="lossless" 
                            checked={lossless} 
                            onChange={e => setLossless(e.target.checked)} 
                            className="w-4 h-4 accent-blue-600"
                          />
                          <label htmlFor="lossless" className="ml-2 text-xs text-gray-700">Lossless compression (larger file, perfect quality)</label>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Bitrate</label>
                          <select 
                            className="w-full p-1.5 text-sm border border-gray-300 bg-white" 
                            value={videoSettings.bitrate}
                            onChange={(e) => setVideoSettings({...videoSettings, bitrate: e.target.value})}
                          >
                            <option value="1M">1 Mbps (Smaller file)</option>
                            <option value="2M">2 Mbps (Balanced)</option>
                            <option value="4M">4 Mbps (Better quality)</option>
                            <option value="6M">6 Mbps (High quality)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Resolution</label>
                          <select 
                            className="w-full p-1.5 text-sm border border-gray-300 bg-white" 
                            value={videoSettings.resolution}
                            onChange={(e) => setVideoSettings({...videoSettings, resolution: e.target.value})}
                          >
                            <option value="480">480p</option>
                            <option value="720">720p</option>
                            <option value="1080">1080p</option>
                            <option value="original">Original (no resize)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Framerate</label>
                          <select 
                            className="w-full p-1.5 text-sm border border-gray-300 bg-white" 
                            value={videoSettings.framerate}
                            onChange={(e) => setVideoSettings({...videoSettings, framerate: e.target.value})}
                          >
                            <option value="24">24 fps</option>
                            <option value="30">30 fps</option>
                            <option value="60">60 fps</option>
                            <option value="original">Original</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Codec</label>
                          <select 
                            className="w-full p-1.5 text-sm border border-gray-300 bg-white" 
                            value={videoSettings.codec}
                            onChange={(e) => setVideoSettings({...videoSettings, codec: e.target.value})}
                          >
                            <option value="h264">H.264 (MP4, best compatibility)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Compress Button */}
                  <div className="flex justify-center">
                    <button 
                      onClick={compressMedia} 
                      disabled={loading || files.length === 0} 
                      className={`w-full py-3 font-medium text-sm text-white transition-colors ${
                        loading ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Compressing...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Compress & Convert
                        </span>
                      )}
                    </button>
                  </div>
                  
                  {/* ZIP Download */}
                  {results.length > 0 && (
                    <div className="flex justify-center mt-4">
                      <button 
                        onClick={downloadZip}
                        className="flex items-center justify-center w-full py-3 bg-green-600 text-white text-sm hover:bg-green-700 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download All (ZIP)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Right Panel: Files and Results */}
          <div className="lg:w-2/3 border-t lg:border-t-0 lg:border-l border-gray-200">
            {files.length > 0 ? (
              <div className="p-6">
                <h2 className="text-lg font-medium mb-3 text-gray-700">Files ({files.length})</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {previews.map((src, i) => {
                    const file = files[i];
                    const result = results.find(r => r.originalName === file.name);
                    const isProcessing = processingFiles[file.name];
                    
                    return (
                      <div key={i} className="group bg-white overflow-hidden border border-gray-200 hover:shadow transition-shadow">
                        <div className="aspect-square bg-gray-100 relative">
                          {file?.type.startsWith('image/') ? (
                            <img src={src} alt="preview" className="w-full h-full object-contain" />
                          ) : (
                            <video src={src} className="w-full h-full object-contain" controls />
                          )}
                          
                          {/* Processing overlay */}
                          {isProcessing && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                              <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-2 text-xs">
                          <div className="truncate font-medium text-gray-700">{file?.name}</div>
                          <div className="text-gray-500">{formatFileSize(file?.size || 0)}</div>
                          
                          {/* Compressed result */}
                          {result && (
                            <>
                              {result.error ? (
                                // Show error message
                                <div className="mt-2 bg-red-50 border border-red-200 p-2 rounded">
                                  <div className="text-red-600 text-xs font-medium flex items-start">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span>Compression failed</span>
                                  </div>
                                  <div className="text-red-500 text-xs mt-1 break-words">
                                    {result.error.includes(':') ? result.error.split(':').slice(1).join(':').trim() : result.error || 'Unknown error'}
                                  </div>
                                </div>
                              ) : (
                                // Show compression result
                                <>
                                  <div className="h-1 w-full bg-gray-200 mt-2 overflow-hidden">
                                    <div 
                                      className="h-full bg-green-500" 
                                      style={{ width: `${100 - Math.min(((1 - result.compressedSize / result.originalSize) * 100), 100)}%` }}
                                    ></div>
                                  </div>
                                  <div className="flex justify-between mt-1">
                                    <span className="text-green-600 font-bold">{((1 - result.compressedSize / result.originalSize) * 100).toFixed(1)}%</span>
                                    <span>{formatFileSize(result.compressedSize)}</span>
                                  </div>
                                  <a 
                                    href={`/.netlify/functions/download-proxy?filename=${encodeURIComponent(result.outputName)}`}
                                    download={result.outputName}
                                    onClick={(e) => {
                                      // Handle the download with error fallback
                                      e.preventDefault();
                                      const downloadUrl = `/.netlify/functions/download-proxy?filename=${encodeURIComponent(result.outputName)}`;
                                      const fallbackUrl = `/.netlify/functions/static-file?filename=${encodeURIComponent(result.outputName)}`;
                                      
                                      // Try to download with fetch first
                                      fetch(downloadUrl)
                                        .then(response => {
                                          if (!response.ok) {
                                            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
                                          }
                                          return response.blob();
                                        })
                                        .then(blob => {
                                          // Create and trigger a download link
                                          const url = window.URL.createObjectURL(blob);
                                          const link = document.createElement('a');
                                          link.href = url;
                                          link.setAttribute('download', result.outputName);
                                          document.body.appendChild(link);
                                          link.click();
                                          
                                          // Clean up
                                          setTimeout(() => {
                                            window.URL.revokeObjectURL(url);
                                            link.remove();
                                          }, 100);
                                        })
                                        .catch(error => {
                                          console.error('Download error:', error);
                                          // Try the fallback
                                          console.log('Trying fallback download method...');
                                          window.location.href = fallbackUrl;
                                        });
                                    }}
                                    className="block text-center text-white bg-blue-600 text-xs py-1 px-2 mt-1 hover:bg-blue-700"
                                  >
                                    Download
                                  </a>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Results Summary - shows up directly below the file grid */}
                {results.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-md font-medium text-gray-700">Compression Results</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {results.slice(0, 4).map((r, i) => {
                        // Check if this result has an error
                        if (r.error) {
                          return (
                            <div key={i} className="bg-red-50 p-3 border border-red-200 flex justify-between items-center">
                              <div className="truncate mr-2">
                                <div className="truncate text-xs font-medium text-red-700">{r.originalName}</div>
                                <div className="text-xs text-red-600">
                                  Compression failed: {r.error.split(':')[1]?.trim() || 'Unknown error'}
                                </div>
                              </div>
                              <div className="flex-shrink-0 text-xs bg-red-100 text-red-800 py-1 px-2 border border-red-200 rounded">
                                Failed
                              </div>
                            </div>
                          );
                        }
                        
                        // For successful compressions
                        const savingsPercent = ((1 - r.compressedSize / r.originalSize) * 100);
                        const isGoodSaving = savingsPercent > 25;
                        
                        return (
                          <div key={i} className="bg-gray-50 p-3 border border-gray-200 flex justify-between items-center">
                            <div className="truncate mr-2">
                              <div className="truncate text-xs font-medium text-gray-700">{r.outputName}</div>
                              <div className="text-xs">
                                <span className={`font-bold ${isGoodSaving ? 'text-green-600' : 'text-yellow-600'}`}>
                                  {savingsPercent.toFixed(1)}% smaller
                                </span>
                                <span className="text-gray-500 ml-1 text-xxs">
                                  ({formatFileSize(r.originalSize)} → {formatFileSize(r.compressedSize)})
                                </span>
                              </div>
                            </div>
                            <a 
                              href={`/.netlify/functions/download-proxy?filename=${encodeURIComponent(r.outputName)}`}
                              download={r.outputName}
                              onClick={(e) => {
                                // Handle the download with error fallback
                                e.preventDefault();
                                const downloadUrl = `/.netlify/functions/download-proxy?filename=${encodeURIComponent(r.outputName)}`;
                                const fallbackUrl = `/.netlify/functions/static-file?filename=${encodeURIComponent(r.outputName)}`;
                                
                                // Try to download with fetch first
                                fetch(downloadUrl)
                                  .then(response => {
                                    if (!response.ok) {
                                      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
                                    }
                                    return response.blob();
                                  })
                                  .then(blob => {
                                    // Create and trigger a download link
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.setAttribute('download', r.outputName);
                                    document.body.appendChild(link);
                                    link.click();
                                    
                                    // Clean up
                                    setTimeout(() => {
                                      window.URL.revokeObjectURL(url);
                                      link.remove();
                                    }, 100);
                                  })
                                  .catch(error => {
                                    console.error('Download error:', error);
                                    // Try the fallback
                                    console.log('Trying fallback download method...');
                                    window.location.href = fallbackUrl;
                                  });
                              }}
                              className="flex-shrink-0 flex items-center text-xs bg-blue-600 text-white py-1 px-2 hover:bg-blue-700 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download
                            </a>
                          </div>
                        );
                      })}
                    </div>
                    
                    {results.length > 4 && (
                      <div className="text-center mt-3 text-sm text-gray-500">
                        +{results.length - 4} more files compressed
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full p-6 text-center text-gray-400">
                <div className="max-w-xs py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">No files selected</p>
                  <p className="text-sm">Upload your images or videos to start compressing</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center text-gray-500 text-sm mt-6 border-t border-gray-200 pt-6 w-full max-w-6xl">
        <p>Compress images and videos with optimized quality and file size</p>
        <p className="mt-1">All processing happens locally - your files never leave your device</p>
      </div>
    </div>
  );
}
