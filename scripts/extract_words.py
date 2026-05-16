"""
extract_words.py — Extract English/Hebrew word pairs from the Kempus PDF.

Usage:
    pip install pdfplumber
    python scripts/extract_words.py path/to/words.pdf

Output:
    scripts/extracted_words.json — [{ "word": "...", "hebrewShort": "..." }, ...]
"""

import sys
import json
import re
from pathlib import Path
from collections import defaultdict

try:
    import pdfplumber
except ImportError:
    print("pdfplumber not installed. Run: pip install pdfplumber")
    sys.exit(1)

# Characters to strip from the start of English words (checkbox symbols)
CHECKBOX_RE = re.compile(r'^[☐☑☒□■◻-◾�\s ]+')

# Lines to skip entirely
SKIP_RE = re.compile(
    r'^\s*$'                      # blank
    r'|^-?\s*\d+\s*-?$'          # page numbers like "- 160 -"
    r'|^Unit\s+\d+',              # "Unit 10"
    re.IGNORECASE
)


def strip_checkboxes(text: str) -> str:
    return CHECKBOX_RE.sub('', text).strip()


def is_skip(text: str) -> bool:
    return bool(SKIP_RE.match(text.strip()))


def fix_rtl(text: str) -> str:
    # pdfplumber extracts Hebrew in visual (left-to-right) order; reverse to logical
    return text[::-1]


def extract_pairs(pdf_path: str) -> list[dict]:
    pairs = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            mid_x = page.width / 2

            # extract_words gives per-word bounding boxes
            raw_words = page.extract_words(
                x_tolerance=5,
                y_tolerance=4,
                keep_blank_chars=False,
            )

            # Group words by approximate vertical position (bucket to 4pt rows)
            lines: dict[int, list] = defaultdict(list)
            for w in raw_words:
                y_key = round(w['top'] / 4) * 4
                lines[y_key].append(w)

            for y_key in sorted(lines):
                row = sorted(lines[y_key], key=lambda w: w['x0'])

                left = [w for w in row if w['x0'] < mid_x]
                right = [w for w in row if w['x0'] >= mid_x]

                if not left or not right:
                    continue

                english = strip_checkboxes(' '.join(w['text'] for w in left))
                # Hebrew words are in visual RTL order from the PDF; reverse to logical
                hebrew = fix_rtl(' '.join(w['text'] for w in right).strip())

                if not english or not hebrew:
                    continue
                if is_skip(english) or is_skip(hebrew):
                    continue
                # Skip pure-digit, single-char, or multi-word extraction artifacts
                if re.match(r'^[\d\W]+$', english):
                    continue
                # Skip lines where digits crept in (e.g. "venture - 6 wagon - 9")
                if re.search(r'\d', english):
                    continue
                # Skip if more than 3 tokens (legit max: "give up", "using up")
                if len(english.split()) > 3:
                    continue

                pairs.append({'word': english.lower(), 'hebrewShort': hebrew})

    # Deduplicate preserving first occurrence
    seen: set[str] = set()
    unique = []
    for p in pairs:
        if p['word'] not in seen:
            seen.add(p['word'])
            unique.append(p)

    return unique


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/extract_words.py path/to/words.pdf")
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not Path(pdf_path).exists():
        print(f"File not found: {pdf_path}")
        sys.exit(1)

    print(f"Reading {pdf_path} ...")
    pairs = extract_pairs(pdf_path)
    print(f"Extracted {len(pairs)} unique word pairs.")

    out_path = Path(__file__).parent / 'extracted_words.json'
    out_path.write_text(
        json.dumps(pairs, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )
    print(f"Saved to {out_path}")
    print("\nFirst 5 entries:")
    for p in pairs[:5]:
        print(f"  {p['word']!r:25} → {p['hebrewShort']}")


if __name__ == '__main__':
    main()
