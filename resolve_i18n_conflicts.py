#!/usr/bin/env python3
"""
Script to resolve merge conflicts in i18n JSON files.
Merges both 'conversation' (HEAD) and 'dialog' (upstream) sections,
and both 'e2b' (HEAD) and 'paddleocr' (upstream) sections.
"""

import json
import re
import sys
from pathlib import Path

def resolve_json_conflicts(file_path):
    """Resolve merge conflicts in a JSON file."""
    print(f"Processing {file_path}...")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if there are merge conflicts
    if '<<<<<<< HEAD' not in content:
        print(f"  No conflicts found in {file_path}")
        return False

    # Pattern 1: Resolve conversation vs dialog conflict (around line 1377-1400)
    # Keep both sections
    pattern1 = r'<<<<<<< HEAD\n  "conversation": \{[^}]+\}[^=]+=======\n  "dialog": \{[^}]+\}[^>]+>>>>>>> upstream/main'

    def replace_pattern1(match):
        # Extract both sections
        full_match = match.group(0)
        conversation_match = re.search(r'"conversation": (\{[^}]+\})', full_match, re.DOTALL)
        dialog_match = re.search(r'"dialog": (\{[^}]+\})', full_match, re.DOTALL)

        if conversation_match and dialog_match:
            return f'  "conversation": {conversation_match.group(1)},\n  "dialog": {dialog_match.group(1)}'
        return full_match

    content = re.sub(pattern1, replace_pattern1, content, flags=re.DOTALL)

    # Pattern 2: Resolve e2b vs paddleocr conflict (around line 5237-5280)
    # Keep both sections
    pattern2 = r'<<<<<<< HEAD\n        "e2b": \{[^}]+(\{[^}]+\}[^}]*)+\}[^=]+=======\n        "paddleocr": \{[^}]+\}[^>]+>>>>>>> upstream/main'

    def replace_pattern2(match):
        full_match = match.group(0)
        # Extract e2b section (complex nested structure)
        e2b_match = re.search(r'"e2b": (\{(?:[^{}]|\{[^{}]*\})*\})', full_match, re.DOTALL)
        # Extract paddleocr section
        paddleocr_match = re.search(r'"paddleocr": (\{[^}]+\})', full_match, re.DOTALL)

        if e2b_match and paddleocr_match:
            return f'        "e2b": {e2b_match.group(1)},\n        "paddleocr": {paddleocr_match.group(1)}'
        return full_match

    content = re.sub(pattern2, replace_pattern2, content, flags=re.DOTALL)

    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  ✓ Resolved conflicts in {file_path}")
    return True

def main():
    # Find all JSON files with conflicts
    base_dir = Path("src/renderer/src/i18n")

    json_files = list(base_dir.glob("locales/*.json")) + list(base_dir.glob("translate/*.json"))

    resolved_count = 0
    for json_file in json_files:
        if resolve_json_conflicts(json_file):
            resolved_count += 1

    print(f"\nResolved conflicts in {resolved_count} files")
    return 0

if __name__ == "__main__":
    sys.exit(main())
