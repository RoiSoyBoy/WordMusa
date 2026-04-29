require('dotenv').config();
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();
const db = admin.firestore();

const spotifyClientId = defineSecret('SPOTIFY_CLIENT_ID');
const spotifyClientSecret = defineSecret('SPOTIFY_CLIENT_SECRET');
const musixmatchApiKey = defineSecret('MUSIXMATCH_API_KEY');
const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

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
      transaction.set(docRef, { count, timestamp: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return true;
    });
  } catch (error) {
    console.error('Rate limit error:', error);
    return false; // Fail safe
  }
}

async function getValidSpotifyAccessToken(uid, clientId, clientSecret) {
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const data = userDoc.data();
  if (!data.spotifyAccessToken || !data.spotifyRefreshToken) {
    throw new Error('Spotify tokens missing');
  }

  // Check if token is expired or expiring within 1 minute
  if (Date.now() > data.spotifyTokenExpiresAt - 60000) {
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: data.spotifyRefreshToken,
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
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (refresh_token) {
      updateData.spotifyRefreshToken = refresh_token;
    }

    await db.collection('users').doc(uid).set(updateData, { merge: true });
    return access_token;
  }

  return data.spotifyAccessToken;
}

exports.spotifyAuth = onRequest({ secrets: [spotifyClientId, spotifyClientSecret] }, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const { code, redirectUri } = req.body;
    if (!code || !redirectUri) {
      return res.status(400).send('Missing code or redirectUri');
    }

    const clientId = spotifyClientId.value();
    const clientSecret = spotifyClientSecret.value();

    if (!clientId || !clientSecret) {
      console.error('Missing Spotify credentials');
      return res.status(500).send('Internal Server Error');
    }

    try {
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
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
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
            photoURL: userData.images && userData.images.length > 0 ? userData.images[0].url : undefined,
          });
        } else {
          throw error;
        }
      }

      // 4. Store tokens in Firestore
      const expiresAt = Date.now() + expires_in * 1000;
      await db.collection('users').doc(uid).set({
        spotifyAccessToken: access_token,
        spotifyRefreshToken: refresh_token,
        spotifyTokenExpiresAt: expiresAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
    const user = await verifyAuth(req, res);
    if (!user) return;

    const allowed = await checkRateLimit(user.uid, 'spotify_player', 120);
    if (!allowed) {
      return res.status(429).send('Too Many Requests');
    }

    try {
      const accessToken = await getValidSpotifyAccessToken(user.uid, spotifyClientId.value(), spotifyClientSecret.value());

      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
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

      const result = {
        track_id: data.item.id,
        track_name: data.item.name,
        artist: data.item.artists.map(a => a.name).join(', '),
        album_art: data.item.album.images?.[0]?.url,
        position_ms: data.progress_ms,
        duration_ms: data.item.duration_ms,
        is_playing: data.is_playing,
        shuffle_state: data.shuffle_state
      };

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in spotifyPlayer:', error);
      res.status(500).send('Internal Server Error');
    }
  });
});

exports.lyricsFetch = onRequest({ secrets: [musixmatchApiKey] }, (req, res) => {
  cors(req, res, async () => {
    const user = await verifyAuth(req, res);
    if (!user) return;

    const trackId = req.query.track_id || req.body.track_id;
    if (!validateTrackId(trackId)) {
      return res.status(400).send('Invalid track ID');
    }

    try {
      const apiKey = musixmatchApiKey.value();
      // Use matcher.lyrics.get or track.lyrics.get depending on Musixmatch API spec.
      // Usually track.lyrics.get works with a track_id.
      const url = `https://api.musixmatch.com/ws/1.1/track.lyrics.get?track_id=${trackId}&apikey=${apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return res.status(502).send('Error from Musixmatch');
      }

      const data = await response.json();
      if (data.message.header.status_code !== 200) {
        return res.status(404).send('Lyrics not found');
      }

      const lyricsBody = data.message.body.lyrics.lyrics_body;
      res.status(200).json({ lyrics: lyricsBody });
    } catch (error) {
      console.error('Error in lyricsFetch:', error);
      res.status(500).send('Internal Server Error');
    }
  });
});

exports.translateLyrics = onRequest({ secrets: [anthropicApiKey] }, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const user = await verifyAuth(req, res);
    if (!user) return;

    const allowed = await checkRateLimit(user.uid, 'translate_lyrics', 20);
    if (!allowed) {
      return res.status(429).send('Too Many Requests');
    }

    const { track_id, lyrics } = req.body;
    if (!validateTrackId(track_id) || !Array.isArray(lyrics)) {
      return res.status(400).send('Invalid parameters');
    }

    try {
      const cacheRef = db.collection('translations').doc(track_id);
      const cacheDoc = await cacheRef.get();
      if (cacheDoc.exists) {
        return res.status(200).json(cacheDoc.data().translated_lyrics);
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const controller = new AbortController();
      req.on('close', () => {
        controller.abort();
      });

      const apiKey = anthropicApiKey.value();
      
      const prompt = `Translate the following English song lyrics into Hebrew. Return ONLY a JSON array of strings corresponding to each line. Do not wrap in markdown or explain.\n\n${JSON.stringify(lyrics)}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          stream: true,
          messages: [
            { role: 'user', content: prompt }
          ]
        }),
        signal: controller.signal
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
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'content_block_delta' && data.delta.text) {
                fullText += data.delta.text;
                res.write(`data: ${JSON.stringify({ text: data.delta.text })}\n\n`);
              }
            } catch (e) {
              // ignore parse error on incomplete chunks
            }
          }
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();

      try {
        const translatedArray = JSON.parse(fullText);
        await cacheRef.set({ translated_lyrics: translatedArray, updated_at: admin.firestore.FieldValue.serverTimestamp() });
      } catch (e) {
        console.error('Failed to parse Claude output as JSON or save to cache:', fullText);
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Client aborted request, translation not saved.');
      } else {
        console.error('Error in translateLyrics:', error);
        if (!res.headersSent) {
          res.status(500).send('Internal Server Error');
        } else {
          res.end();
        }
      }
    }
  });
});

exports.tracksMissing = onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const user = await verifyAuth(req, res);
    if (!user) return;

    const { track_id, track_name } = req.body;
    if (!validateTrackId(track_id) || typeof track_name !== 'string') {
      return res.status(400).send('Invalid parameters');
    }

    try {
      await db.collection('missing_tracks').add({
        track_id,
        track_name,
        reported_by: user.uid,
        reported_at: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(200).send('Reported successfully');
    } catch (error) {
      console.error('Error in tracksMissing:', error);
      res.status(500).send('Internal Server Error');
    }
  });
});
