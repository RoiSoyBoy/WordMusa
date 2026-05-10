import { useEffect, useRef } from 'react';
import {
  doc, getDoc, setDoc, updateDoc, increment, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

function toWordId(word) {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function getTodayJerusalem() {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // DD/MM/YYYY
}

function parseDDMMYYYY(str) {
  const [d, m, y] = str.split('/');
  return new Date(`${y}-${m}-${d}`);
}

export function useWordTracking() {
  const seenTrackIds = useRef(new Set());
  const streakUpdated = useRef(false);

  // Run streak check once per mount (app open / foreground)
  useEffect(() => {
    if (!streakUpdated.current) {
      streakUpdated.current = true;
      updateStreak();
    }
  }, []);

  // ── recordWordEncounter ────────────────────────────────────────────────────
  // Called automatically when a word enters the active lyric line.

  async function recordWordEncounter(wordData, trackContext) {
    const user = auth.currentUser;
    if (!user || !wordData?.word) return;

    const wordId = toWordId(wordData.word);
    const wordRef = doc(db, 'users', user.uid, 'wordHistory', wordId);
    const userRef = doc(db, 'users', user.uid);

    try {
      const snap = await getDoc(wordRef);

      const contextEntry = {
        trackName: trackContext?.trackName || '',
        artistName: trackContext?.artistName || '',
        lyricLine: trackContext?.lyricLine || '',
      };

      if (!snap.exists()) {
        // First encounter — create the document
        await setDoc(wordRef, {
          word: wordData.word,
          encounterCount: 1,
          firstEncounteredAt: serverTimestamp(),
          lastEncounteredAt: serverTimestamp(),
          tappedAt: null,
          learnedAt: null,
          songContexts: [contextEntry],
        });
        // Increment unique word counter on the user doc
        await updateDoc(userRef, { totalWordsEncountered: increment(1) }).catch(() => {});
      } else {
        const existing = snap.data();
        const newCount = (existing.encounterCount || 0) + 1;

        // Keep last 5 unique contexts (deduplicate by trackName+lyricLine)
        const prev = existing.songContexts || [];
        const merged = [contextEntry, ...prev].filter(
          (ctx, idx, arr) =>
            arr.findIndex(c => c.trackName === ctx.trackName && c.lyricLine === ctx.lyricLine) === idx
        ).slice(0, 5);

        const update = {
          encounterCount: increment(1),
          lastEncounteredAt: serverTimestamp(),
          songContexts: merged,
        };

        // Mark as learned if conditions are met (use pre-read data + projected count)
        if (newCount >= 3 && existing.tappedAt && !existing.learnedAt) {
          update.learnedAt = serverTimestamp();
        }

        await updateDoc(wordRef, update);

        if (newCount >= 3 && existing.tappedAt && !existing.learnedAt) {
          await updateDoc(userRef, { totalWordsLearned: increment(1) }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('recordWordEncounter error:', err.message);
    }
  }

  // ── recordWordTap ──────────────────────────────────────────────────────────
  // Called when the user taps the WordCard. Sets tappedAt and checks learned.

  async function recordWordTap(wordData) {
    const user = auth.currentUser;
    if (!user || !wordData?.word) return;

    const wordId = toWordId(wordData.word);
    const wordRef = doc(db, 'users', user.uid, 'wordHistory', wordId);
    const userRef = doc(db, 'users', user.uid);

    try {
      const snap = await getDoc(wordRef);
      if (!snap.exists()) return;

      const d = snap.data();
      if (d.tappedAt) return; // already tapped — nothing to do

      await updateDoc(wordRef, { tappedAt: serverTimestamp() });

      // tappedAt is now set — check if learned condition is met
      if (d.encounterCount >= 3 && !d.learnedAt) {
        await updateDoc(wordRef, { learnedAt: serverTimestamp() });
        await updateDoc(userRef, { totalWordsLearned: increment(1) }).catch(() => {});
      }
    } catch (err) {
      console.warn('recordWordTap error:', err.message);
    }
  }

  // ── recordTrackSeen ────────────────────────────────────────────────────────
  // Called once per unique track_id per session.

  async function recordTrackSeen(trackId) {
    if (!trackId || seenTrackIds.current.has(trackId)) return;
    seenTrackIds.current.add(trackId);

    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        totalSongs: increment(1),
      }).catch(() => {});
    } catch (err) {
      console.warn('recordTrackSeen error:', err.message);
    }
  }

  // ── updateStreak ───────────────────────────────────────────────────────────
  // Runs once on mount. Reads the user doc and updates streak if the date changed.

  async function updateStreak() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const today = getTodayJerusalem();
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const lastUpdated = data.streakLastUpdated;

      // Same day — nothing to update
      if (lastUpdated === today) return;

      let newStreak = 1;
      if (lastUpdated) {
        const daysDiff = Math.round(
          (parseDDMMYYYY(today) - parseDDMMYYYY(lastUpdated)) / 86_400_000
        );
        newStreak = daysDiff === 1 ? (data.streakCount || 0) + 1 : 1;
      }

      await updateDoc(userRef, {
        streakCount: newStreak,
        streakLastUpdated: today,
      });
    } catch (err) {
      console.warn('updateStreak error:', err.message);
    }
  }

  return { recordWordEncounter, recordWordTap, recordTrackSeen };
}
