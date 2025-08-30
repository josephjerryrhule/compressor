# Media Compressor

A web application for compressing and converting images and videos with optimized file sizes while maintaining quality.

## Features

### Images
- Convert JPEG, PNG, GIF, SVG to optimized WebP format
- Adjustable quality settings (50-100)
- Lossless WebP option
- Typical savings: 25-40% smaller than originals

### Videos
- Compress MP4, MOV videos
- H.264 (MP4) codec
- Adjustable bitrate (1-6 Mbps)
- Resolution options (480p, 720p, 1080p, or original)
- Framerate options (24, 30, 60 fps, or original)

### User Experience
- Drag-and-drop + file picker for batch uploads
- Preview before/after compression with file size difference
- Download individual files or as a ZIP package
- Mobile-friendly responsive UI

## Tech Stack

- **Frontend**: Next.js (React), TailwindCSS
- **Backend**: Node.js/Express
- **Image Processing**: Sharp
- **Video Processing**: FFmpeg
- **Container**: Docker support

## Getting Started

### Prerequisites

- Node.js 18+ installed
- FFmpeg installed (automatically included via npm dependencies)
- For development: Git

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/media-compressor.git
cd media-compressor

# Install dependencies for all components
npm install
npm run install-deps

# OR manually install dependencies
npm install
cd frontend && npm install
cd ../backend && npm install
```

### Running with Docker

```bash
# Build and run with Docker Compose
npm run docker
```

### Running Locally

```bash
# Start the development server (concurrent backend + frontend)
npm run dev
```

Then open http://localhost:3000 in your browser.

## API Endpoints

- `POST /api/compress/image` - Compress and convert images to WebP
- `POST /api/compress/video` - Compress videos with custom settings
- `POST /api/download/zip` - Download multiple compressed files as ZIP

## Development

### Backend

The Express backend handles media processing with:
- Sharp for image optimization and WebP conversion
- FFmpeg for video transcoding and compression
- File system operations for storing compressed media

### Frontend

The Next.js frontend provides:
- Drag-and-drop file uploading
- Media type detection (image/video)
- Compression options based on media type
- Before/after preview with file size savings
- Download functionality

## License

MIT
