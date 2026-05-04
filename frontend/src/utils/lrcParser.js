/**
 * Parses an LRC format string into a sorted array of timed lyric lines.
 * LRC format: [mm:ss.xx] lyric text
 * Returns: [{ time_ms: number, text: string }]
 * Sorted ascending by time_ms.
 * Filters out empty lines and metadata tags.
 */
export function parseLRC(lrcString) {
  if (!lrcString) return [];
  
  const lines = lrcString.split('\n');
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  for (const line of lines) {
    const text = line.replace(/\[.*?\]/g, '').trim();
    if (!text) continue;

    let match;
    timeRegex.lastIndex = 0;
    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const centiseconds = match[3].length === 2
        ? parseInt(match[3], 10) * 10
        : parseInt(match[3], 10);
      const time_ms = (minutes * 60 + seconds) * 1000 + centiseconds;
      result.push({ time_ms, text });
    }
  }

  return result.sort((a, b) => a.time_ms - b.time_ms);
}

/**
 * Given a sorted array of parsed LRC lines and a current position in ms,
 * returns the index of the currently active line.
 * Returns -1 if position is before the first line.
 */
export function getActiveLyricIndex(lines, position_ms) {
  if (!lines || lines.length === 0) return -1;
  let activeIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time_ms <= position_ms) {
      activeIndex = i;
    } else {
      break;
    }
  }
  return activeIndex;
}
