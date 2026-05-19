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
const openaiApiKey = defineSecret('OPENAI_API_KEY');

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

      const cacheKey = `${track_name.toLowerCase().replace(/\s+/g, '_')}_${artist_name.toLowerCase().replace(/\s+/g, '_')}`;
      const lyricsCache = await db.collection('lyrics_cache').doc(cacheKey).get();
      if (lyricsCache.exists) {
        return res.status(200).json(lyricsCache.data().lyrics);
      }

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
      const lyricsPayload = {
        synced: data.syncedLyrics || null,
        plain: data.plainLyrics || null,
      };

      db.collection('lyrics_cache').doc(cacheKey).set({
        lyrics: lyricsPayload,
        track_name,
        artist_name,
        cached_at: FieldValue.serverTimestamp(),
      }).catch(e => console.error('Failed to cache lyrics:', e));

      res.status(200).json(lyricsPayload);

    } catch (error) {
      console.error('Error in lyricsFetch:', error);
      res.status(500).send('Internal Server Error');
    }
  });
});

exports.translateLyrics = onRequest({ secrets: [openaiApiKey] }, (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      if (!(await verifyAppCheck(req, res))) return;

      const user = await verifyAuth(req, res);
      if (!user) return;

      const allowed = await checkRateLimit(user.uid, 'translate_lyrics', 20);
      if (!allowed) return res.status(429).send('Too Many Requests');

      const { track_id, lyrics, track_name, artist_name } = req.body;
      if (!validateTrackId(track_id)) return res.status(400).send('Invalid track ID');

      const sanitizedLyrics = validateAndSanitizeLyrics(lyrics);
      if (!sanitizedLyrics) return res.status(400).send('Invalid lyrics payload');

      const safeTrackName = typeof track_name === 'string' ? track_name.substring(0, 200) : 'Unknown';
      const safeArtistName = typeof artist_name === 'string' ? artist_name.substring(0, 200) : 'Unknown';

      // Set SSE headers before any async work
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Check cache first — return immediately if found
      const cacheRef = db.collection('translations').doc(track_id);
      const cacheDoc = await cacheRef.get();
      if (cacheDoc.exists) {
        res.write(`data: ${JSON.stringify({ translated_lyrics: cacheDoc.data().translated_lyrics })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      // AbortController so we can cancel the API request if client disconnects
      const controller = new AbortController();
      req.on('close', () => controller.abort());

      const apiKey = process.env.OPENAI_API_KEY || openaiApiKey.value();

      // System prompt: lyric lines are passed as data in the user message,
      // never interpolated into the system string (prevents prompt injection).
     const systemPrompt =
  'You are a professional Hebrew song lyrics translator with deep knowledge of music genres, cultural slang, and idiomatic English expressions. ' +
  'INPUT: a JSON object with "artist", "track", and "lyrics" (array of lines from that song). ' +
  'OUTPUT: a JSON array of Hebrew strings — one per input lyric line, identical length, same order. ' +
  'RULES: ' +
  '1. Use the artist and track name to understand the genre, era, and cultural context (e.g. hip-hop AAVE, pop, R&B, rock). Use this to correctly interpret slang and idioms. ' +
  '2. Translate the MEANING, not the words. Treat multi-word phrases, idioms, and slang as a whole unit — never translate them word-by-word. E.g. "ride or die" → loyalty concept in Hebrew, not literally "ride" and "die". ' +
  '3. Use the surrounding lyric lines in the array for context — they are from the same song and help clarify ambiguous phrases. ' +
  '4. Translate to natural, spoken Israeli Hebrew (not formal or biblical). Preserve emotional tone and poetic rhythm. ' +
  '5. Every output string MUST contain ONLY Hebrew characters and spaces. No other language characters (not English, Malay, Chinese, Arabic, French, or any other). Proper nouns may be transliterated into Hebrew letters. ' +
  '6. If a line is empty or a section marker (e.g. "[Chorus]"), return an empty string for that index. ' +
  '7. Output a raw JSON array only — no markdown fences, no object keys, no explanation, no preamble. ' +
  'EXAMPLE INPUT: {"artist":"The Weeknd","track":"Blinding Lights","lyrics":["I\'ve been alone all night","She\'s touching my elusive heart"]} ' +
  'EXAMPLE OUTPUT: ["הייתי לבד כל הלילה","היא נוגעת בלבי החמקמק"]';

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 4096,
          temperature: 0.3,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify({ artist: safeArtistName, track: safeTrackName, lyrics: sanitizedLyrics }) },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        res.write(`data: ${JSON.stringify({ error: 'Translation failed' })}\n\n`);
        return res.end();
      }

      let fullText = '';
      let buffer = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;
          try {
            const event = JSON.parse(dataStr);
            // OpenAI streaming: choices[0].delta.content
            if (event.choices && event.choices[0] && event.choices[0].delta && event.choices[0].delta.content) {
              fullText += event.choices[0].delta.content;
              res.write(`data: ${JSON.stringify({ text: event.choices[0].delta.content })}\n\n`);
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
        // Reject translations that contain non-Hebrew/non-Latin scripts (Malay, Chinese, Arabic, etc.)
        // Hebrew: ֐-׿, Latin:  -ɏ, spaces/punctuation allowed
        const hasForeignScript = translatedArray.some(
          line => typeof line === 'string' && /[؀-ۿ一-鿿　-〿Ѐ-ӿ]/.test(line)
        );
        if (hasForeignScript) {
          console.error('Translation rejected — contains non-Hebrew foreign script:', translatedArray);
        } else {
          // Optimistic check: skip write if a concurrent request already populated the cache
          const existingCache = await cacheRef.get();
          if (!existingCache.exists) {
            await cacheRef.set({
              translated_lyrics: translatedArray,
              updated_at: FieldValue.serverTimestamp(),
              model: 'gpt-4o-mini',
            });
          }
        }
      } catch (e) {
        console.error('Failed to parse OpenAI output or save to cache:', fullText);
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

exports.translateWord = onRequest({ secrets: [openaiApiKey] }, (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      if (!(await verifyAppCheck(req, res))) return;
      const user = await verifyAuth(req, res);
      if (!user) return;

      const allowed = await checkRateLimit(user.uid, 'translate_word', 30);
      if (!allowed) return res.status(429).send('Too Many Requests');

      const { word } = req.body;
      if (!word || typeof word !== 'string') return res.status(400).send('Missing word');
      const sanitized = word.replace(/[^a-zA-Z\s'-]/g, '').substring(0, 60).trim();
      if (!sanitized) return res.status(400).send('Invalid word');

      const wordCacheKey = sanitized.toLowerCase().replace(/\s+/g, '_');
      const wordCacheDoc = await db.collection('word_translations').doc(wordCacheKey).get();
      if (wordCacheDoc.exists) {
        return res.json({ translation: wordCacheDoc.data().translation });
      }

      const apiKey = process.env.OPENAI_API_KEY || openaiApiKey.value();
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Translate the given English word to Hebrew. Respond with only the Hebrew word or short phrase. No explanations, no transliteration, no punctuation.' },
            { role: 'user', content: sanitized },
          ],
          max_tokens: 30,
        }),
      });

      if (!response.ok) {
        console.error('OpenAI error:', await response.text());
        return res.status(500).send('Translation failed');
      }

      const data = await response.json();
      const translation = data.choices?.[0]?.message?.content?.trim() || '';

      if (translation) {
        db.collection('word_translations').doc(wordCacheKey).set({
          translation,
          cached_at: FieldValue.serverTimestamp(),
        }).catch(e => console.error('Failed to cache word translation:', e));
      }

      res.json({ translation });

    } catch (error) {
      console.error('Error in translateWord:', error);
      res.status(500).send('Internal Server Error');
    }
  });
});

exports.spotifyControl = onRequest({ secrets: [spotifyClientId, spotifyClientSecret] }, (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      if (!(await verifyAppCheck(req, res))) return;
      const user = await verifyAuth(req, res);
      if (!user) return;

      const allowed = await checkRateLimit(user.uid, 'spotify_control', 60);
      if (!allowed) return res.status(429).send('Too Many Requests');

      const { action } = req.body;
      const validActions = ['play', 'pause', 'next', 'previous', 'seek'];
      if (!validActions.includes(action)) {
        return res.status(400).send('Invalid action');
      }

      const clientId = process.env.SPOTIFY_CLIENT_ID || spotifyClientId.value();
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || spotifyClientSecret.value();
      const accessToken = await getValidSpotifyAccessToken(user.uid, clientId, clientSecret);

      let spotifyUrl, method, body;

      switch (action) {
        case 'play':
          spotifyUrl = 'https://api.spotify.com/v1/me/player/play';
          method = 'PUT';
          break;
        case 'pause':
          spotifyUrl = 'https://api.spotify.com/v1/me/player/pause';
          method = 'PUT';
          break;
        case 'next':
          spotifyUrl = 'https://api.spotify.com/v1/me/player/next';
          method = 'POST';
          break;
        case 'previous':
          spotifyUrl = 'https://api.spotify.com/v1/me/player/previous';
          method = 'POST';
          break;
        case 'seek':
          const position = parseInt(req.body.position_ms, 10);
          if (isNaN(position) || position < 0) return res.status(400).send('Invalid position_ms');
          spotifyUrl = `https://api.spotify.com/v1/me/player/seek?position_ms=${position}`;
          method = 'PUT';
          break;
      }

      const response = await fetch(spotifyUrl, {
        method,
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.status === 204 || response.ok) {
        return res.status(200).json({ success: true });
      }

      const err = await response.text();
      console.error('Spotify control error:', err);
      return res.status(response.status).send('Spotify control failed');

    } catch (error) {
      console.error('Error in spotifyControl:', error);
      res.status(500).send('Internal Server Error');
    }
  });
});