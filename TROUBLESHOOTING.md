# Media Compressor Troubleshooting Guide

If you encounter issues with the Media Compressor app, this guide may help you resolve them.

## Trace Trap and Segmentation Fault Errors

If you're experiencing "trace trap" (SIGTRAP) or "segmentation fault" (SIGSEGV) errors when launching the app:

1. **Install the latest version**: Make sure you're using the latest version of the app.

2. **Run the debug helper**: Open Terminal and run:
   ```
   cd /Users/joeseph/Desktop/Dev/public/compressor
   node debug-helper.js
   ```

3. **Clean app data**: Sometimes corrupted app data can cause issues:
   ```
   rm -rf ~/Library/Application\ Support/Media\ Compressor
   ```

4. **Check system resources**: Make sure your system has enough free memory and disk space.

5. **Launch with debug flags**: Open Terminal and run:
   ```
   /Applications/Media\ Compressor.app/Contents/MacOS/Media\ Compressor --js-flags="--max-old-space-size=4096 --expose-gc" --disable-gpu-vsync --disable-features=OutOfBlinkCors --disable-site-isolation-trials
   ```

6. **Check the logs**: Examine the app logs at:
   ```
   ~/Library/Logs/Media\ Compressor/
   ```

7. **Check for segfault logs**: Look for segfault crash logs at:
   ```
   ~/Library/Application\ Support/Media\ Compressor/crash-logs/segfault.log
   ```

## Common Issues

### App Crashes on Startup

If the app crashes immediately after launching:

1. **Reinstall the application**: Download the latest version and reinstall.
2. **Check permissions**: Make sure the app has proper permissions.
3. **Clear cache**: Delete the app's cache files.
4. **Check for system requirements**: Ensure your Mac meets the minimum requirements.
5. **Check system integrity**: Run `sudo tmutil repair` to fix any system inconsistencies.

### Memory Issues

If the app is slow or crashes during operation:

1. **Restart your computer**: This clears memory and can resolve temporary issues.
2. **Close other applications**: Free up system resources.
3. **Monitor memory usage**: Use Activity Monitor to check if the app is using excessive memory.
4. **Update macOS**: Make sure your operating system is up to date.

### File Processing Issues

If the app fails to process files correctly:

1. **Check file permissions**: Ensure the app has permission to access your files.
2. **Try smaller files first**: If processing large files fails, try with smaller files.
3. **Check available disk space**: Ensure you have enough free disk space.
4. **Make sure ffmpeg is working**: The app uses ffmpeg for video processing. You can check if it's available by running the debug helper script.

## Getting Support

If you continue to experience issues, please reach out for support:

1. Create an issue on the GitHub repository with details about your problem.
2. Include the log files located at: ~/Library/Logs/Media Compressor/
3. Specify your macOS version and computer specifications.
4. Attach the output from the debug helper script.
