// REMOVED: require('dotenv').config()
// Firebase Functions v2 loads .env automatically. Calling dotenv on top
// causes a double-parse conflict that can crash the emulator.

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, p) => {
  console.error('UNHANDLED REJECTION:', reason);
});

if (process.env.FUNCTIONS_EMULATOR === 'true') {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  admin.initializeApp({ projectId: 'wordmusa' });
} else {
  admin.initializeApp();
}
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const db = getFirestore(); 



const spotifyClientId = defineSecret('SPOTIFY_CLIENT_ID');
const spotifyClientSecret = defineSecret('SPOTIFY_CLIENT_SECRET');
const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

// Helper to verify App Check token
async function verifyAppCheck(req, res) {
  // Bypass App Check in local emulator environment
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    return true;
  }

  const appCheckToken = req.header('X-Firebase-AppCheck');
  if (!appCheckToken) {
    res.status(401).send('Unauthorized: App Check token missing.');
    return false;
  }
  try {
    await admin.appCheck().verifyToken(appCheckToken);
    return true;
  } catch (err) {
    console.error('App Check Error:', err);
    res.status(401).send('Unauthorized: App Check token invalid.');
    return false;
  }
}

// Helper to verify auth token
async function verifyAuth(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).send('Unauthorized');
    return null;
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(401).send('Unauthorized');
    return null;
  }
}

// Validation helper
function validateTrackId(trackId) {
  return typeof trackId === 'string' && /^[a-zA-Z0-9\-]{1,64}$/.test(trackId);
}

// Lyrics validation and sanitization
function validateAndSanitizeLyrics(lyricsArray) {
  if (!Array.isArray(lyricsArray)) return null;
  if (lyricsArray.length > 200) return null;
  
  return lyricsArray.map(line => {
    if (typeof line !== 'string') return '';
    // Strip HTML tags to prevent prompt injection, limit length
    let sanitized = line.replace(/<[^>]*>?/gm, '');
    return sanitized.substring(0, 500);
  });
}

// Rate Limiting helper
async function checkRateLimit(uid, endpoint, maxRequests) {
  const minute = Math.floor(Date.now() / 60000);
  const docRef = db.collection('rate_limits').doc(`${uid}_${endpoint}_${minute}`);
  
  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      let count = 1;
      if (doc.exists) {
        count = doc.data().count + 1;
      }
      if (count > maxRequests) {
        return false;
      }
      transaction.set(docRef, { count, timestamp: FieldValue.serverTimestamp() }, { merge: true });
      return true;
    });
  } catch (error) {
    console.error('Rate limit error:', error);
    return false;
  }
}

async function getValidSpotifyAccessToken(uid, clientId, clientSecret) {
  const userRef = db.collection('users').doc(uid);
  
  let needsRefresh = false;
  let currentToken = null;
  let refreshToken = null;

  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const data = userDoc.data();
    if (!data.spotifyAccessToken || !data.spotifyRefreshToken) {
      throw new Error('Spotify tokens missing');
    }

    if (Date.now() > data.spotifyTokenExpiresAt - 60000) {
      if (data.spotifyRefreshInProgress) {
        needsRefresh = false;
      } else {
        transaction.set(userRef, { 
          spotifyRefreshInProgress: FieldValue.serverTimestamp() 
        }, { merge: true });
        needsRefresh = true;
        refreshToken = data.spotifyRefreshToken;
      }
    } else {
      currentToken = data.spotifyAccessToken;
    }
  });

  if (currentToken) {
    return currentToken;
  }

  if (needsRefresh) {
    try {
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Spotify token refresh failed:', errorText);
        throw new Error('Spotify token refresh failed');
      }

      const tokenData = await tokenResponse.json();
      const { access_token, refresh_token, expires_in } = tokenData;

      const expiresAt = Date.now() + expires_in * 1000;
      const updateData = {
        spotifyAccessToken: access_token,
        spotifyTokenExpiresAt: expiresAt,
        spotifyRefreshInProgress: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (refresh_token) {
        updateData.spotifyRefreshToken = refresh_token;
      }

      await userRef.set(updateData, { merge: true });
      return access_token;
    } catch (error) {
      await userRef.set({ 
        spotifyRefreshInProgress: FieldValue.delete() 
      }, { merge: true });
      throw error;
    }
  }

  // Wait for concurrent refresh to complete
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const userDoc = await userRef.get();
    const data = userDoc.data();
    if (data && !data.spotifyRefreshInProgress && Date.now() <= data.spotifyTokenExpiresAt - 60000) {
      return data.spotifyAccessToken;
    }
  }

  throw new Error('Timeout waiting for Spotify token refresh');
}

exports.spotifyAuth = onRequest({ secrets: [spotifyClientId, spotifyClientSecret] }, (req, res) => {
  cors(req, res, async () => {
    try {
      console.log('--- spotifyAuth START ---');
      if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
      }
      
      if (!(await verifyAppCheck(req, res))) return;

      const { code, redirectUri } = req.body;
      if (!code || !redirectUri) {
        return res.status(400).send('Missing code or redirectUri');
      }

      const clientId = process.env.SPOTIFY_CLIENT_ID || spotifyClientId.value();
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || spotifyClientSecret.value();

      if (!clientId || !clientSecret) {
        console.error('Missing Spotify credentials');
        return res.status(500).send('Internal Server Error');
      }

      // 1. Exchange code for tokens
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Spotify token exchange failed:', errorText);
        return res.status(400).send('Spotify token exchange failed');
      }

      const tokenData = await tokenResponse.json();
      const { access_token, refresh_token, expires_in } = tokenData;

      // 2. Get Spotify user profile
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${access_token}` },
      });

      if (!userResponse.ok) {
        console.error('Failed to get Spotify user profile');
        return res.status(400).send('Failed to get user profile');
      }

      const userData = await userResponse.json();
      const spotifyId = userData.id;
      const uid = `spotify:${spotifyId}`;

      // 3. Create or update Firebase Auth user
      try {
        await admin.auth().getUser(uid);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          await admin.auth().createUser({
            uid,
            displayName: userData.display_name,
            photoURL: userData.images?.[0]?.url,
          });
        } else {
          throw error;
        }
      }

      // 4. Store tokens in Firestore (refresh token stays server-side only)
      const expiresAt = Date.now() + expires_in * 1000;
      await db.collection('users').doc(uid).set({
        spotifyAccessToken: access_token,
        spotifyRefreshToken: refresh_token,
        spotifyTokenExpiresAt: expiresAt,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      // 5. Generate Firebase Custom Auth Token
      const firebaseToken = await admin.auth().createCustomToken(uid);
      res.status(200).json({ firebaseToken });

    } catch (error) {
      console.error('Error in spotifyAuth:', error);
      res.status(500).send('Internal Server Error');
    }
  });
});

exports.spotifyPlayer = onRequest({ secrets: [spotifyClientId, spotifyClientSecret] }, (req, res) => {
  cors(req, res, async () => {
    try {
      if (!(await verifyAppCheck(req, res))) return;
      
      const user = await verifyAuth(req, res);
      if (!user) return;

      const allowed = await checkRateLimit(user.uid, 'spotify_player', 120);
      if (!allowed) return res.status(429).send('Too Many Requests');

      const clientId = process.env.SPOTIFY_CLIENT_ID || spotifyClientId.value();
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || spotifyClientSecret.value();
      const accessToken = await getValidSpotifyAccessToken(user.uid, clientId, clientSecret);

      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response.status === 204) {
        return res.status(200).json({ is_playing: false });
      }

      if (!response.ok) {
        const err = await response.text();
        console.error('Spotify API error:', err);
        return res.status(response.status).send('Spotify API error');
      }

      const data = await response.json();
      if (!data || !data.item) {
        return res.status(200).json({ is_playing: false });
      }

      res.status(200).json({
        track_id: data.item.id,
        track_name: data.item.name,
        artist: data.item.artists.map(a => a.name).join(', '),
        album_art: data.item.album.images?.[0]?.url,
        position_ms: data.progress_ms,
        duration_ms: data.item.duration_ms,
        is_playing: data.is_playing,
        shuffle_state: data.shuffle_state,
      });

    } catch (error) {
      console.error('Error in spotifyPlayer:', error);
      res.status(500).send('Internal Server Error');
    }
  });
});

exports.lyricsFetch = onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (!(await verifyAppCheck(req, res))) return;

      const user = await verifyAuth(req, res);
      if (!user) return;

      const allowed = await checkRateLimit(user.uid, 'lyrics_fetch', 60);
      if (!allowed) return res.status(429).send('Too Many Requests');

      let { track_name, artist_name, duration } = req.query;

      if (!track_name || typeof track_name !== 'string' || track_name.trim().length === 0 || track_name.length > 200 ||
          !artist_name || typeof artist_name !== 'string' || artist_name.trim().length === 0 || artist_name.length > 200) {
        return res.status(400).send('Invalid track_name or artist_name');
      }

      // Strip HTML
      track_name = track_name.replace(/<[^>]*>?/gm, '').trim();
      artist_name = artist_name.replace(/<[^>]*>?/gm, '').trim();

      const params = new URLSearchParams({
        track_name,
        artist_name
      });

      if (duration && !isNaN(parseInt(duration)) && parseInt(duration) > 0) {
        params.append('duration', parseInt(duration).toString());
      }

      const url = `https://lrclib.net/api/get?${params.toString()}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'LyricLearn/1.0'
        }
      });
      
      if (response.status === 404) {
        return res.status(404).json({ error: 'Lyrics not found', synced: null, plain: null });
      }

      if (!response.ok) {
         return res.status(502).send('Error from LRCLIB');
      }

      const data = await response.json();

      res.status(200).json({
        synced: data.syncedLyrics || null,
        plain: data.plainLyrics || null,
      });

    } catch (error) {
      console.error('Error in lyricsFetch:', error);
      res.status(500).send('Internal Server Error');
    }
  });
});

exports.translateLyrics = onRequest({ secrets: [anthropicApiKey] }, (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      if (!(await verifyAppCheck(req, res))) return;

      const user = await verifyAuth(req, res);
      if (!user) return;

      const allowed = await checkRateLimit(user.uid, 'translate_lyrics', 20);
      if (!allowed) return res.status(429).send('Too Many Requests');

      const { track_id, lyrics } = req.body;
      if (!validateTrackId(track_id)) return res.status(400).send('Invalid track ID');

      const sanitizedLyrics = validateAndSanitizeLyrics(lyrics);
      if (!sanitizedLyrics) return res.status(400).send('Invalid lyrics payload');

      // Set SSE headers before any async work
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Check cache first — return immediately if found
      const cacheRef = db.collection('translations').doc(track_id);
      const cacheDoc = await cacheRef.get();
      if (cacheDoc.exists) {
        res.write(`data: ${JSON.stringify({ translated_lyrics: cacheDoc.data().translated_lyrics })}\n\n`);
        res.end();
        return;
      }

      // AbortController so we can cancel the Claude request if client disconnects
      const controller = new AbortController();
      req.on('close', () => controller.abort());

      const apiKey = process.env.ANTHROPIC_API_KEY || anthropicApiKey.value();

      // System prompt: lyric lines are passed as data in the user message,
      // never interpolated into the system string (prevents prompt injection).
      const systemPrompt =
        'You are a Hebrew translator for song lyrics. ' +
        'The user message will be a JSON array of English lyric lines. ' +
        'Translate each line to natural, colloquial Hebrew preserving tone and meaning. ' +
        'Return ONLY a valid JSON array of Hebrew strings, same length as input. ' +
        'No markdown, no preamble, no explanation.';

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          // FIX: updated anthropic-version header to current stable
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          // FIX: claude-3-haiku-20240307 is deprecated — use current Haiku model
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          system: systemPrompt,
          stream: true,
          messages: [
            { role: 'user', content: JSON.stringify(sanitizedLyrics) },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Anthropic API error:', errorText);
        res.write(`data: ${JSON.stringify({ error: 'Translation failed' })}\n\n`);
        return res.end();
      }

      let fullText = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;
          try {
            const event = JSON.parse(dataStr);
            // Anthropic streaming: type=content_block_delta, delta.type=text_delta
            if (
              event.type === 'content_block_delta' &&
              event.delta?.type === 'text_delta' &&
              event.delta?.text
            ) {
              fullText += event.delta.text;
              res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
            }
          } catch (e) {
            // Incomplete chunk — safe to ignore
          }
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();

      // Write to cache after streaming completes (non-blocking for client)
      try {
        const translatedArray = JSON.parse(fullText);
        await cacheRef.set({
          translated_lyrics: translatedArray,
          updated_at: FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.error('Failed to parse Claude output or save to cache:', fullText);
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Client disconnected — translation not cached (incomplete).');
      } else {
        console.error('Error in translateLyrics:', error);
        if (!res.headersSent) res.status(500).send('Internal Server Error');
        else res.end();
      }
    }
  });
});

exports.tracksMissing = onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      if (!(await verifyAppCheck(req, res))) return;

      const user = await verifyAuth(req, res);
      if (!user) return;

      const allowed = await checkRateLimit(user.uid, 'tracks_missing', 20);
      if (!allowed) return res.status(429).send('Too Many Requests');

      const { track_id, track_name } = req.body;
      if (
        !validateTrackId(track_id) ||
        typeof track_name !== 'string' ||
        track_name.length === 0 ||
        track_name.length > 500
      ) {
        return res.status(400).send('Invalid parameters');
      }

      await db.collection('missing_tracks').add({
        track_id,
        track_name: track_name.trim().substring(0, 500),
        reported_by: user.uid,
        reported_at: FieldValue.serverTimestamp(),
      });

      res.status(200).send('Reported successfully');

    } catch (error) {
      console.error('Error in tracksMissing:', error);
      res.status(500).send('Internal Server Error');
    }
  });
});