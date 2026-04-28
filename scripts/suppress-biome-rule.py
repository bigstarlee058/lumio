#!/usr/bin/env python3
"""
Adds biome-ignore comments for a specific rule's warnings.
Usage: ./suppress-biome-rule.py <rule_category> [reason]
Example: ./suppress-biome-rule.py useExhaustiveDependencies "deps are intentionally constrained"
"""
import json
import subprocess
import sys
from pathlib import Path

rule_keyword = sys.argv[1] if len(sys.argv) > 1 else "useExhaustiveDependencies"
reason = sys.argv[2] if len(sys.argv) > 2 else "deps are intentionally constrained"

# Run biome with JSON reporter
result = subprocess.run(
    ["./node_modules/.bin/biome", "check", ".", "--max-diagnostics=2000", "--reporter=json"],
    capture_output=True, text=True, cwd=str(Path(__file__).resolve().parent.parent / "frontend")
)

data = json.loads(result.stdout or "{}") if result.stdout else {}
diagnostics = data.get("diagnostics", [])

# Collect unique file+byte_offset pairs
file_offsets = {}  # file -> set of byte offsets
for d in diagnostics:
    category = d.get("category", "")
    if rule_keyword not in category:
        continue
    loc = d.get("location", {})
    path = loc.get("path", {}).get("file", "")
    span = loc.get("span", [0, 0])
    if not path:
        continue
    # Normalize path
    if path.startswith("./"):
        path = path[2:]
    if path not in file_offsets:
        file_offsets[path] = set()
    file_offsets[path].add(span[0])

# Find the full rule name from the category
full_rule = None
for d in diagnostics:
    cat = d.get("category", "")
    if rule_keyword in cat:
        full_rule = cat
        break

if not full_rule:
    print(f"No diagnostics found for rule containing '{rule_keyword}'")
    sys.exit(0)

print(f"Found {sum(len(v) for v in file_offsets.values())} unique locations in {len(file_offsets)} files for {full_rule}")

total_inserted = 0
frontend_dir = Path(__file__).resolve().parent.parent / "frontend"

for rel_path, offsets in file_offsets.items():
    filepath = frontend_dir / rel_path
    if not filepath.exists():
        continue

    content = filepath.read_text(encoding="utf-8")
    lines = content.split("\n")

    # Convert byte offsets to line numbers
    line_numbers = set()
    byte_pos = 0
    for i, line in enumerate(lines):
        line_len = len(line.encode("utf-8")) + 1  # +1 for newline
        for offset in offsets:
            if byte_pos <= offset < byte_pos + line_len:
                line_numbers.add(i)
        byte_pos += line_len

    # Insert comments (descending order to preserve line numbers)
    for line_idx in sorted(line_numbers, reverse=True):
        if line_idx < 0 or line_idx >= len(lines):
            continue

        # Skip if already suppressed
        if line_idx > 0 and "biome-ignore" in lines[line_idx - 1] and rule_keyword in lines[line_idx - 1]:
            continue

        indent = len(lines[line_idx]) - len(lines[line_idx].lstrip())
        indent_str = lines[line_idx][:indent]
        comment = f"{indent_str}// biome-ignore {full_rule}: {reason}"
        lines.insert(line_idx, comment)
        total_inserted += 1

    filepath.write_text("\n".join(lines), encoding="utf-8")

print(f"Inserted {total_inserted} suppression comments")
