const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const { createAuthedClient } = require('../lib/googleClient');
const { getMobileSessionTokens } = require('../lib/mobileSessions');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'tmp-uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 128 * 1024 * 1024 * 1024 } });

// uploadId -> array of SSE response objects
const progressClients = new Map();
// uploadId -> last progress event, for clients that poll instead of using SSE (e.g. mobile)
const lastStatus = new Map();

function sendProgress(uploadId, data) {
  lastStatus.set(uploadId, data);
  const clients = progressClients.get(uploadId);
  if (!clients) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach((res) => res.write(payload));
}

function closeProgress(uploadId) {
  const clients = progressClients.get(uploadId);
  if (clients) {
    clients.forEach((res) => res.end());
    progressClients.delete(uploadId);
  }
  // Keep the final status around briefly for clients that poll instead of
  // using SSE (e.g. mobile), then let it get garbage collected.
  setTimeout(() => lastStatus.delete(uploadId), 5 * 60 * 1000).unref();
}

function requireAuth(req, res, next) {
  const bearer = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  const tokens = bearer ? getMobileSessionTokens(bearer[1]) : req.session.tokens;
  if (!tokens) {
    return res.status(401).json({ error: 'Not authenticated. Sign in with Google first.' });
  }
  req.oauthTokens = tokens;
  next();
}

router.get('/upload/:uploadId/progress', (req, res) => {
  const { uploadId } = req.params;
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  const clients = progressClients.get(uploadId) || [];
  clients.push(res);
  progressClients.set(uploadId, clients);

  req.on('close', () => {
    const remaining = (progressClients.get(uploadId) || []).filter((r) => r !== res);
    if (remaining.length) {
      progressClients.set(uploadId, remaining);
    } else {
      progressClients.delete(uploadId);
    }
  });
});

router.get('/upload/:uploadId/status', (req, res) => {
  const status = lastStatus.get(req.params.uploadId);
  if (!status) {
    return res.json({ phase: 'pending' });
  }
  res.json(status);
});

router.post(
  '/upload/:uploadId',
  requireAuth,
  upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  async (req, res) => {
    const { uploadId } = req.params;
    const videoFile = req.files?.video?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];
    const { title, description, tags, privacyStatus } = req.body || {};

    const cleanup = () => {
      [videoFile, thumbnailFile].forEach((f) => {
        if (f) fs.unlink(f.path, () => {});
      });
    };

    if (!videoFile) {
      return res.status(400).json({ error: 'A video file is required.' });
    }

    // Respond immediately; progress and result are delivered over SSE.
    res.status(202).json({ uploadId });

    try {
      const auth = createAuthedClient(req.oauthTokens);
      const youtube = google.youtube({ version: 'v3', auth });
      const fileSize = fs.statSync(videoFile.path).size;

      const insertResponse = await youtube.videos.insert(
        {
          part: ['snippet', 'status'],
          notifySubscribers: false,
          requestBody: {
            snippet: {
              title: title?.trim() || videoFile.originalname,
              description: description || '',
              tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
            },
            status: {
              privacyStatus: ['public', 'unlisted', 'private'].includes(privacyStatus)
                ? privacyStatus
                : 'private',
            },
          },
          media: {
            body: fs.createReadStream(videoFile.path),
          },
        },
        {
          onUploadProgress: (evt) => {
            const bytesRead = evt.bytesRead || 0;
            const percent = fileSize ? Math.min(100, Math.round((bytesRead / fileSize) * 100)) : 0;
            sendProgress(uploadId, { phase: 'youtube_upload', percent });
          },
        }
      );

      const videoId = insertResponse.data.id;

      if (thumbnailFile) {
        sendProgress(uploadId, { phase: 'thumbnail' });
        await youtube.thumbnails.set({
          videoId,
          media: { body: fs.createReadStream(thumbnailFile.path) },
        });
      }

      sendProgress(uploadId, {
        phase: 'done',
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      });
    } catch (err) {
      console.error('Upload failed:', err.message);
      sendProgress(uploadId, { phase: 'error', message: err.message });
    } finally {
      cleanup();
      closeProgress(uploadId);
    }
  }
);

module.exports = router;
