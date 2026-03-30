// YTGrab Backend Server
// This file creates a small local web server on your computer
// It listens for requests from the website (index.html) and runs yt-dlp

const express = require('express');   // web server framework
const cors    = require('cors');       // allows website to talk to this server
const { exec } = require('child_process'); // lets us run terminal commands
const path   = require('path');       // helps build file paths correctly
const os     = require('os');         // detects your OS home folder

const app = express();
app.use(cors());          // allow requests from any origin (your HTML file)
app.use(express.json());

// ────────────────────────────────────────────────
// ROUTE 1: GET /info  →  fetch video details
// When you paste a URL and click "Fetch", this runs
// ────────────────────────────────────────────────
app.get('/info', (req, res) => {
  const url = req.query.url;  // get URL from request
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  // Run yt-dlp to get video info as JSON (no download)
  exec(`yt-dlp --dump-json --no-playlist "${url}"`, (err, stdout, stderr) => {
    if (err) {
      console.error('yt-dlp error:', stderr);
      return res.status(500).json({ error: 'Could not fetch video info' });
    }
    try {
      const data = JSON.parse(stdout);
      res.json(data);  // send video info back to the website
    } catch(e) {
      res.status(500).json({ error: 'Failed to parse video data' });
    }
  });
});

// ────────────────────────────────────────────────
// ROUTE 2: GET /download  →  actually download the video
// When you click "Download Now", this runs
// ────────────────────────────────────────────────
app.get('/download', (req, res) => {
  const { url, quality, format } = req.query;
  if (!url) return res.status(400).json({ error: 'No URL' });

  // Map quality labels to yt-dlp format codes
  const qualityMap = {
    '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]',
    '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
    '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
    '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
  };

  const ytFmt = format === 'mp3'
    ? 'bestaudio/best'
    : (qualityMap[quality] || qualityMap['720p']);

  const ext      = format === 'mp3' ? 'mp3' : 'mp4';
  const filename = `YTGrab_${Date.now()}.${ext}`;
  const outPath  = path.join(os.homedir(), 'Downloads', filename);

  // Tell the website we started (don't wait for it to finish)
  res.json({ message: 'Download started!', file: outPath });

  // Build the yt-dlp command
  const audioFlags = format === 'mp3'
    ? '-x --audio-format mp3'
    : '--merge-output-format mp4';

  const cmd = `yt-dlp -f "${ytFmt}" ${audioFlags} -o "${outPath}" "${url}"`;
  console.log('Running:', cmd);

  exec(cmd, (err) => {
    if (err) console.error('Download failed:', err.message);
    else console.log('✅ Saved to:', outPath);
  });
});

// ────────────────────────────────────────────────
// Start the server on port 3737
// ────────────────────────────────────────────────
const PORT = 3737;
app.listen(PORT, () => {
  console.log(`\n✅ YTGrab backend running!\n   Open your index.html in a browser\n   Server: http://localhost:${PORT}\n`);
});