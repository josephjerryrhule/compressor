const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const ffmpegPath = require('ffmpeg-static');
const archiver = require('archiver');
const child_process = require('child_process');
const { spawn } = child_process;
const path = require('path');
const fs = require('fs');

const app = express();
const uploadsDir = path.join(__dirname, 'uploads');
// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const upload = multer({ dest: uploadsDir });
app.use(cors());
app.use(express.json());

// Serve static files with appropriate headers to encourage downloading
app.use('/uploads', (req, res, next) => {
  // Set Content-Disposition header to attachment to encourage browser to download
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(req.path)}"`);
  // Set Content-Type based on file extension
  const ext = path.extname(req.path).toLowerCase();
  if (ext === '.webp') {
    res.setHeader('Content-Type', 'image/webp');
  } else if (ext === '.mp4') {
    res.setHeader('Content-Type', 'video/mp4');
  } else if (ext === '.mp4') {
    res.setHeader('Content-Type', 'video/mp4');
  }
  next();
}, express.static(uploadsDir));

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Additional health check at root path for Electron app
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Function to check if a codec is available
const checkCodecAvailability = async (codec) => {
  try {
    // Run a simple ffmpeg command to check if the codec is available
    const result = await child_process.execSync(`${ffmpegPath} -hide_banner -codecs`, { encoding: 'utf8' });
    return result.includes(codec);
  } catch (err) {
    console.error(`Error checking codec availability for ${codec}:`, err.message);
    return false;
  }
};

// Codec availability cache
const codecAvailability = {
  'libx264': null,
  'aac': null
};

// Check codec availability at startup
(async () => {
  try {
    console.log('Checking codec availability...');
    codecAvailability['libx264'] = await checkCodecAvailability('libx264');
    codecAvailability['aac'] = await checkCodecAvailability('aac');
    console.log('Codec availability:', codecAvailability);
  } catch (err) {
    console.error('Error during codec availability check:', err);
  }
})();

// Image compression endpoint
app.post('/api/compress/image', upload.array('files'), async (req, res) => {
  try {
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded' });
    }

    const quality = parseInt(req.body.quality) || 80;
    const lossless = req.body.lossless === 'true';
    const files = req.files;
    const results = [];

    for (const file of files) {
      try {
        const inputPath = file.path;
        const outputPath = `${inputPath}.webp`;
        
        // Log file information for debugging
        console.log(`Processing image: ${file.originalname}, size: ${file.size}, path: ${inputPath}`);
        
        let transformer = sharp(inputPath).webp({ quality, lossless });
        await transformer.toFile(outputPath);
        
        const originalSize = fs.statSync(inputPath).size;
        const compressedSize = fs.statSync(outputPath).size;
        
        results.push({
          originalName: file.originalname,
          outputName: path.basename(outputPath),
          originalSize,
          compressedSize,
          outputPath
        });
        
        // Clean up original
        fs.unlinkSync(inputPath);
        
        console.log(`Successfully compressed ${file.originalname} to WebP format`);
      } catch (fileErr) {
        console.error(`Error processing file ${file.originalname}:`, fileErr);
        // Continue with other files even if one fails
        continue;
      }
    }
    
    if (results.length === 0) {
      return res.status(500).json({ error: 'Failed to process any of the uploaded files' });
    }
    
    res.json({ results });
  } catch (err) {
    console.error('Image compression endpoint error:', err);
    res.status(500).json({ error: err.message || 'Unknown server error in image compression' });
  }
});

// Video compression endpoint
app.post('/api/compress/video', upload.array('files'), async (req, res) => {
  try {
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded' });
    }

    const bitrate = req.body.bitrate || '2M';
    const resolution = req.body.resolution || 'original';
    const framerate = req.body.framerate || 'original';
    const codec = 'h264'; // Only supporting H.264 now
    const files = req.files;
    const results = [];

    // Log FFmpeg path for debugging
    console.log(`Using FFmpeg at: ${ffmpegPath}`);
    if (!fs.existsSync(ffmpegPath)) {
      return res.status(500).json({ error: 'FFmpeg not found. Please check your installation.' });
    }

    for (const file of files) {
      try {
        const inputPath = file.path;
        
        // Ensure the file exists and is readable
        if (!fs.existsSync(inputPath)) {
          console.error(`File does not exist: ${inputPath}`);
          continue;
        }
        
        // Check if file is empty
        const stats = fs.statSync(inputPath);
        if (stats.size === 0) {
          console.error(`File is empty: ${file.originalname}`);
          continue;
        }
        
        const outputPath = `${inputPath}.mp4`;
        
        // Log file information for debugging
        console.log(`Processing video: ${file.originalname}, size: ${stats.size}, path: ${inputPath}`);
        
        // Additional diagnostics to check file permissions and path validity
        try {
          // Check if we have read permissions on the file
          fs.accessSync(inputPath, fs.constants.R_OK);
          
          // Check if we have write permissions in the directory
          const outputDir = path.dirname(inputPath);
          fs.accessSync(outputDir, fs.constants.W_OK);
          
          // Try to determine the file type more accurately
          const buffer = Buffer.alloc(12);
          const fd = fs.openSync(inputPath, 'r');
          fs.readSync(fd, buffer, 0, 12, 0);
          fs.closeSync(fd);
          
          // Check for common video file signatures
          const signature = buffer.toString('hex', 0, 12);
          console.log(`File signature for ${file.originalname}: ${signature}`);
          
          // Check if file extension matches content
          const fileExt = path.extname(file.originalname).toLowerCase();
          console.log(`File extension: ${fileExt}`);
        } catch (diagErr) {
          console.error(`Diagnostic error for ${file.originalname}:`, diagErr);
          // We continue despite diagnostic errors
        }
        
        // First run a simpler FFmpeg command to check if the file is valid
        try {
          await new Promise((resolve, reject) => {
            const probe = spawn(ffmpegPath, ['-i', inputPath]);
            let stderr = '';
            
            probe.stderr.on('data', (data) => {
              stderr += data.toString();
            });
            
            probe.on('close', (code) => {
              // FFmpeg returns non-zero when just probing, but the stderr should contain info
              if (stderr.includes('Invalid data found') || stderr.includes('Error')) {
                reject(new Error(`Invalid video file: ${stderr}`));
              } else {
                resolve();
              }
            });
            
            probe.on('error', (err) => {
              reject(new Error(`Failed to start FFmpeg probe: ${err.message}`));
            });
          });
        } catch (probeErr) {
          console.error(`Probe error for ${file.originalname}:`, probeErr.message);
          continue;
        }
        
        let ffmpegArgs = [
          '-i', inputPath,
          '-b:v', bitrate,
        ];
        
        // H.264 specific settings (MP4)
        ffmpegArgs = ffmpegArgs.concat([
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-movflags', '+faststart'
        ]);
        
        // MP4 audio codec
        ffmpegArgs.push('-c:a', 'aac', '-b:a', '128k');
        
        // Handle resolution scaling if needed
        if (resolution !== 'original') {
          ffmpegArgs.push('-vf', `scale=-1:${resolution}`);
        }
        
        // Handle framerate if needed
        if (framerate !== 'original') {
          ffmpegArgs.push('-r', framerate);
        }
        
        // Add output file path and overwrite flag
        ffmpegArgs.push('-y', outputPath);
        
        // Log the ffmpeg command for debugging
        console.log('FFmpeg command:', [ffmpegPath, ...ffmpegArgs].join(' '));
        
        // Execute ffmpeg with proper error handling
        try {
          await new Promise((resolve, reject) => {
            const ffmpeg = spawn(ffmpegPath, ffmpegArgs);
            let stdoutData = '';
            let stderrData = '';
            
            ffmpeg.stdout.on('data', (data) => {
              stdoutData += data.toString();
            });
            
            ffmpeg.stderr.on('data', (data) => {
              stderrData += data.toString();
              // FFmpeg writes progress to stderr, so we don't consider this an error
            });
            
            ffmpeg.on('close', code => {
              if (code === 0) resolve();
              else reject(new Error(`FFmpeg failed with code ${code}. Error: ${stderrData}`));
            });
            
            ffmpeg.on('error', (err) => {
              reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
            });
          });
        } catch (encodeErr) {
          console.error(`Encoding error for ${file.originalname}:`, encodeErr.message);
          throw encodeErr;
        }
        
        // Verify the output file was created
        if (!fs.existsSync(outputPath)) {
          throw new Error(`Output file was not created: ${outputPath}`);
        }
        
        const originalSize = fs.statSync(inputPath).size;
        const compressedSize = fs.statSync(outputPath).size;
        
        results.push({
          originalName: file.originalname,
          outputName: path.basename(outputPath),
          originalSize,
          compressedSize,
          outputPath
        });
        
        // Clean up original
        fs.unlinkSync(inputPath);
        
        console.log(`Successfully compressed ${file.originalname} to ${codec} format`);
      } catch (fileErr) {
        console.error(`Error processing file ${file.originalname}:`, fileErr);
        
        // Specific error handling for common issues
        let errorMessage = fileErr.message;
        let errorDetails = fileErr.stack || '';
        
        // Check for specific error patterns and provide more user-friendly messages
        if (errorMessage.includes('No such file or directory')) {
          errorMessage = 'File access error: Unable to read or write the video file';
        } else if (errorMessage.includes('Invalid data found')) {
          errorMessage = 'The video file appears to be corrupted or in an unsupported format';
        } else if (errorMessage.includes('FFmpeg failed with code')) {
          // Extract the most relevant part of the FFmpeg error
          const ffmpegError = errorMessage.split('Error:')[1]?.trim() || errorMessage;
          
          if (ffmpegError.includes('Conversion failed!')) {
            errorMessage = 'Video conversion failed. The file may be corrupted or in an unsupported format.';
          } else if (ffmpegError.includes('Invalid argument')) {
            errorMessage = 'Invalid video file or compression settings';
          } else if (ffmpegError.toLowerCase().includes('permission denied')) {
            errorMessage = 'Permission denied while accessing or creating video files';
          } else {
            // Provide a more generic but still helpful message
            errorMessage = 'Video compression failed: ' + 
              (ffmpegError.split('\n')[0]?.substring(0, 100) || 'Unknown FFmpeg error');
          }
        }
        
        // Send a more detailed error message back to the client
        return res.status(500).json({ 
          error: `Failed to process video: ${errorMessage}`,
          details: errorDetails
        });
      }
    }
    
    if (results.length === 0) {
      return res.status(500).json({ error: 'Failed to process any of the uploaded files' });
    }
    
    res.json({ results });
  } catch (err) {
    console.error('Video compression endpoint error:', err);
    res.status(500).json({ error: err.message || 'Unknown server error in video compression' });
  }
});

// Download ZIP endpoint
app.post('/api/download/zip', express.json(), async (req, res) => {
  try {
    const files = req.body.files; // Array of file paths
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="compressed.zip"'
    });
    const archive = archiver('zip');
    archive.pipe(res);
    for (const file of files) {
      archive.file(file, { name: path.basename(file) });
    }
    await archive.finalize();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a diagnostic endpoint to help with troubleshooting
app.get('/api/diagnostic', (req, res) => {
  try {
    const os = require('os');
    const child_process = require('child_process');
    
    const diagnosticInfo = {
      serverInfo: {
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime()
      },
      ffmpeg: {
        path: ffmpegPath,
        exists: fs.existsSync(ffmpegPath),
        executable: false,
        version: null
      },
      directoryAccess: {
        uploads: false,
        temp: false
      },
      codecAvailability: codecAvailability,
      environmentVars: {
        path: process.env.PATH?.split(path.delimiter).join('\n'),
        tempDir: os.tmpdir(),
        homeDir: os.homedir()
      }
    };
    
    // Check directory access
    try {
      fs.accessSync(uploadsDir, fs.constants.W_OK);
      diagnosticInfo.directoryAccess.uploads = true;
    } catch (err) {
      diagnosticInfo.directoryAccess.uploads = false;
    }
    
    try {
      fs.accessSync(os.tmpdir(), fs.constants.W_OK);
      diagnosticInfo.directoryAccess.temp = true;
    } catch (err) {
      diagnosticInfo.directoryAccess.temp = false;
    }
    
    // Try to get FFmpeg version
    try {
      const result = child_process.execSync(`"${ffmpegPath}" -version`).toString().split('\n')[0];
      diagnosticInfo.ffmpeg.version = result;
      diagnosticInfo.ffmpeg.executable = true;
    } catch (err) {
      diagnosticInfo.ffmpeg.error = err.message;
    }
    
    res.json(diagnosticInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a codec info endpoint
app.get('/api/codec-info', async (req, res) => {
  try {
    // Return the critical codec availability
    res.json({
      criticalCodecs: {
        'libx264': codecAvailability['libx264'],
        'aac': codecAvailability['aac']
      }
    });
  } catch (err) {
    console.error('Error in codec info endpoint:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Compressor backend running on port ${PORT}`);
});
