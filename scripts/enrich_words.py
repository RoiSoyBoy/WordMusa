"""
enrich_words.py — Enrich extracted words to full schema using GPT-4o-mini,
then merge into backend/words.json and frontend/src/data/words.json.

Usage:
    pip install openai
    set OPENAI_API_KEY=sk-...
    python scripts/enrich_words.py

Resumes automatically from scripts/enriched_checkpoint.json if interrupted.
"""

import asyncio
import json
import os
import sys
import time
from pathlib import Path

try:
    import openai
except ImportError:
    print("openai not installed. Run: pip install openai")
    sys.exit(1)

SCRIPTS_DIR = Path(__file__).parent
REPO_ROOT = SCRIPTS_DIR.parent
BACKEND_JSON = REPO_ROOT / 'backend' / 'words.json'
FRONTEND_JSON = REPO_ROOT / 'frontend' / 'assets' / 'words.json'
EXTRACTED_JSON = SCRIPTS_DIR / 'extracted_words.json'
CHECKPOINT_JSON = SCRIPTS_DIR / 'enriched_checkpoint.json'

BATCH_SIZE = 50
MAX_CONCURRENT = 10
MODEL = 'gpt-4o-mini'

SYSTEM_PROMPT = """\
You are a vocabulary database builder for Israeli students studying for the Psychometric Entrance Test.
You will receive a JSON array of English words with their Hebrew short translations.
Return a JSON object with a single key "words" whose value is an array (same length, same order).
Each item must have EXACTLY these fields:
  "word"            — the original English word (lowercase, unchanged)
  "partOfSpeech"    — one of: noun, verb, adjective, adverb
  "hebrewShort"     — the original Hebrew short translation (unchanged from input)
  "hebrewFull"      — a natural Hebrew explanation of the word (5–12 words)
  "ipa"             — standard IPA pronunciation string (e.g. "ˈwɜːd")
  "frequencyTier"   — "HIGH" (very common in psychometric exams), "MEDIUM", or "LOW"
  "synonyms"        — array of exactly 4 English synonyms
  "exampleSentence" — one clear English sentence using the word naturally\
"""


def load_existing_words() -> tuple[list, set]:
    with open(BACKEND_JSON, encoding='utf-8') as f:
        existing = json.load(f)
    return existing, {w['word'].lower() for w in existing}


def load_checkpoint() -> dict[str, dict]:
    if CHECKPOINT_JSON.exists():
        with open(CHECKPOINT_JSON, encoding='utf-8') as f:
            return {w['word']: w for w in json.load(f)}
    return {}


def save_checkpoint(enriched: dict[str, dict]) -> None:
    CHECKPOINT_JSON.write_text(
        json.dumps(list(enriched.values()), ensure_ascii=False, indent=2),
        encoding='utf-8'
    )


async def enrich_batch(
    client: openai.AsyncOpenAI,
    sem: asyncio.Semaphore,
    batch: list[dict],
    batch_num: int,
    total: int,
) -> list[dict]:
    async with sem:
        for attempt in range(3):
            try:
                response = await client.chat.completions.create(
                    model=MODEL,
                    max_tokens=16384,
                    messages=[
                        {'role': 'system', 'content': SYSTEM_PROMPT},
                        {'role': 'user', 'content': json.dumps(batch, ensure_ascii=False)},
                    ],
                    response_format={'type': 'json_object'},
                )
                raw = response.choices[0].message.content.strip()
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    parsed = next(v for v in parsed.values() if isinstance(v, list))
                if len(parsed) != len(batch):
                    raise ValueError(f"Expected {len(batch)}, got {len(parsed)}")
                print(f"  ✓ Batch {batch_num}/{total} ({len(parsed)} words)")
                return parsed
            except Exception as e:
                print(f"  ✗ Batch {batch_num}/{total} attempt {attempt + 1}: {e}")
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
        print(f"  Skipping batch {batch_num} after 3 failures.")
        return []


async def run(api_key: str, new_words: list[dict], checkpoint: dict[str, dict]) -> list[dict]:
    client = openai.AsyncOpenAI(api_key=api_key)
    sem = asyncio.Semaphore(MAX_CONCURRENT)

    remaining = [w for w in new_words if w['word'] not in checkpoint]
    print(f"Already checkpointed: {len(checkpoint)}, remaining: {len(remaining)}\n")

    batches = [remaining[i:i + BATCH_SIZE] for i in range(0, len(remaining), BATCH_SIZE)]
    print(f"Processing {len(batches)} batches (×{BATCH_SIZE} words, {MAX_CONCURRENT} concurrent)...\n")

    tasks = [
        enrich_batch(client, sem, batch, i + 1, len(batches))
        for i, batch in enumerate(batches)
    ]

    enriched_all = list(checkpoint.values())
    start = time.time()

    for coro in asyncio.as_completed(tasks):
        result = await coro
        enriched_all.extend(result)
        # Checkpoint after every completed batch
        save_checkpoint({w['word']: w for w in enriched_all})

    elapsed = time.time() - start
    print(f"\nFinished in {elapsed:.0f}s. Total enriched: {len(enriched_all)}")
    return enriched_all


def main():
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print("OPENAI_API_KEY not set. Run: set OPENAI_API_KEY=sk-...")
        sys.exit(1)

    if not EXTRACTED_JSON.exists():
        print(f"Missing {EXTRACTED_JSON}. Run extract_words.py first.")
        sys.exit(1)

    with open(EXTRACTED_JSON, encoding='utf-8') as f:
        extracted: list[dict] = json.load(f)

    existing_words, existing_set = load_existing_words()
    print(f"Existing words in words.json: {len(existing_words)}")

    new_words = [w for w in extracted if w['word'].lower() not in existing_set]
    print(f"New words to enrich: {len(new_words)}")

    if not new_words:
        print("No new words to add. Done.")
        return

    checkpoint = load_checkpoint()
    if checkpoint:
        print(f"Resuming from checkpoint ({len(checkpoint)} words already done)")

    enriched_all = asyncio.run(run(api_key, new_words, checkpoint))

    if not enriched_all:
        print("No words enriched.")
        sys.exit(1)

    merged = existing_words + enriched_all
    merged.sort(key=lambda w: w['word'].lower())

    lines = ['[']
    for i, word in enumerate(merged):
        suffix = ',' if i < len(merged) - 1 else ''
        lines.append(json.dumps(word, ensure_ascii=False) + suffix)
    lines.append(']')
    output = '\n'.join(lines) + '\n'

    BACKEND_JSON.write_text(output, encoding='utf-8')
    FRONTEND_JSON.write_text(output, encoding='utf-8')

    # Clean up checkpoint now that we're done
    if CHECKPOINT_JSON.exists():
        CHECKPOINT_JSON.unlink()

    print(f"\nDone. Total words: {len(merged)} (+{len(enriched_all)} new)")
    print(f"Updated: {BACKEND_JSON}")
    print(f"Updated: {FRONTEND_JSON}")


if __name__ == '__main__':
    main()
