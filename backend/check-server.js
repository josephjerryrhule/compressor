const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');

// Check server configuration and dependencies
function checkServerConfig() {
  console.log('Checking server configuration...');
  
  // Check if uploads directory exists or create it
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Uploads directory created successfully.');
    } catch (err) {
      console.error('❌ Failed to create uploads directory:', err.message);
      process.exit(1);
    }
  } else {
    console.log('✅ Uploads directory exists.');
    
    // Check if uploads directory is writable
    try {
      const testFile = path.join(uploadsDir, 'test-write.txt');
      fs.writeFileSync(testFile, 'Test file');
      fs.unlinkSync(testFile);
      console.log('✅ Uploads directory is writable.');
    } catch (err) {
      console.error('❌ Uploads directory is not writable:', err.message);
      process.exit(1);
    }
  }
  
  // Check if FFmpeg is available
  if (!ffmpegPath) {
    console.error('❌ FFmpeg not found. Please install ffmpeg-static package.');
    process.exit(1);
  }
  
  try {
    if (!fs.existsSync(ffmpegPath)) {
      console.error(`❌ FFmpeg executable not found at ${ffmpegPath}`);
      process.exit(1);
    }
    console.log(`✅ FFmpeg found at: ${ffmpegPath}`);
  } catch (err) {
    console.error('❌ Error checking FFmpeg:', err.message);
    process.exit(1);
  }
  
  // Check if Sharp is installed correctly
  try {
    const sharp = require('sharp');
    const info = sharp.versions;
    console.log(`✅ Sharp installed: v${info.sharp}`);
  } catch (err) {
    console.error('❌ Error with Sharp library:', err.message);
    console.log('Try reinstalling sharp: npm install sharp --force');
    process.exit(1);
  }
  
  console.log('✅ All checks passed. Server should be ready to run.');
}

checkServerConfig();
