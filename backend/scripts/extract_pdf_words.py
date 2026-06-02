"""
Extract words + unit numbers from ENG_DIC_CAMPUS PDF.
Hebrew text is stored reversed (RTL artifact) — we reverse it back.
Output: pdf_words.json  {word_lower: {unit, hebrew}}
"""

import sys, io, re, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pdfplumber

PDF_PATH = r'c:\DEV\LyricLearn\docs\other\ENG_DIC_CAMPUS (1).pdf'
OUT_PATH = r'c:\DEV\LyricLearn\backend\scripts\pdf_words.json'

# Hebrew unicode range for detection
def is_hebrew_char(c):
    return 'א' <= c <= 'ת' or c in ' װױײ'

def reverse_hebrew(text):
    """Reverse a string to fix RTL extraction artifact."""
    return text[::-1].strip()

def looks_like_category_header(line):
    """Category headers are Hebrew-only lines with dashes."""
    stripped = line.strip()
    if not stripped:
        return True
    # Page header like "Unit 1 - 15 -"
    if re.match(r'^Unit \d+', stripped):
        return True
    # Pure Hebrew line (category header)
    non_hebrew = re.sub(r'[א-תװ-״\s\-/]', '', stripped)
    if not non_hebrew and any('א' <= c <= 'ת' for c in stripped):
        return True
    return False

results = {}  # {english_lower: {unit, hebrew, english_original}}
current_unit = 0

with pdfplumber.open(PDF_PATH) as pdf:
    for page in pdf.pages:
        text = page.extract_text()
        if not text:
            continue

        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Detect unit header
            m = re.match(r'^Unit (\d+)', line)
            if m:
                current_unit = int(m.group(1))
                continue

            if looks_like_category_header(line):
                continue

            # Split into tokens
            tokens = line.split()
            if len(tokens) < 2:
                continue

            # Find split point: first token that has Hebrew chars
            split_idx = None
            for i, tok in enumerate(tokens):
                if any('א' <= c <= 'ת' for c in tok):
                    split_idx = i
                    break

            if split_idx is None or split_idx == 0:
                continue

            english_tokens = tokens[:split_idx]
            hebrew_tokens = tokens[split_idx:]

            english = ' '.join(english_tokens).lower().strip()
            # Reverse each Hebrew token then join (handles multi-word)
            hebrew_reversed = ' '.join(reverse_hebrew(t) for t in reversed(hebrew_tokens))
            # Also try full-string reversal which sometimes works better
            hebrew_full_rev = reverse_hebrew(' '.join(hebrew_tokens))

            # Skip obvious junk
            if len(english) < 2 or len(english) > 40:
                continue
            if re.search(r'[א-ת]', english):
                continue  # English part contains Hebrew = parsing error

            key = english
            if key not in results:
                results[key] = {
                    'unit': current_unit,
                    'hebrew': hebrew_full_rev,
                    'english': english
                }

print(f'Extracted {len(results)} unique words from PDF')

# Show sample from each unit
for u in range(1, 11):
    words_in_unit = [v for v in results.values() if v['unit'] == u]
    print(f'Unit {u}: {len(words_in_unit)} words. Sample: {[w["english"] for w in words_in_unit[:5]]}')

with open(OUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f'\nSaved to {OUT_PATH}')
