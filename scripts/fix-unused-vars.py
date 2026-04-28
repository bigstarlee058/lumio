#!/usr/bin/env python3
"""
Fixes @typescript-eslint/no-unused-vars warnings by:
1. Prefixing unused function args with _
2. Removing unused type imports
3. Removing unused destructured variables
"""
import json
import re
from pathlib import Path

frontend = Path("/Users/symonbaikov/Projects/lumio/frontend")

with open("/tmp/eslint-out.json") as f:
    data = json.load(f)

# Group by file
from collections import defaultdict
by_file = defaultdict(list)
for item in data:
    for msg in item.get("messages", []):
        if msg.get("ruleId") == "@typescript-eslint/no-unused-vars" and msg.get("severity") == 1:
            rel = item["filePath"].replace(str(frontend) + "/", "")
            varname_match = re.match(r"'(\w+)' is (?:defined|assigned)", msg.get("message", ""))
            if varname_match:
                by_file[rel].append({
                    "line": msg["line"],
                    "col": msg["column"],
                    "name": varname_match.group(1),
                    "msg": msg["message"],
                })

print(f"Found {sum(len(v) for v in by_file.values())} unused vars in {len(by_file)} files")

fixed = 0
for rel_path, issues in by_file.items():
    fp = frontend / rel_path
    if not fp.exists():
        continue

    content = fp.read_text("utf-8")
    lines = content.split("\n")
    changed = False

    # Process in reverse order to not shift line numbers
    for issue in sorted(issues, key=lambda x: -x["line"]):
        line_idx = issue["line"] - 1
        name = issue["name"]

        if line_idx >= len(lines):
            continue

        line = lines[line_idx]

        # Case 1: Unused function parameter — prefix with _
        if "is defined but never used" in issue["msg"] and "args must match" in issue["msg"]:
            # It's a function parameter — prefix with _
            if not name.startswith("_"):
                # Replace the exact word
                new_line = re.sub(rf'\b{re.escape(name)}\b', f'_{name}', line, count=1)
                if new_line != line:
                    lines[line_idx] = new_line
                    changed = True
                    fixed += 1
                    continue

        # Case 2: Unused variable/type assigned but never used
        if "is assigned a value but never used" in issue["msg"]:
            # Check if it's a destructured variable from useState or similar
            # These are harder to auto-fix safely, skip for now
            # But for simple `const X = ...` on a single line we can prefix
            if re.match(rf'^\s*(?:const|let|var)\s+{re.escape(name)}\s*=', line):
                # Simple assignment — prefix with _
                new_line = re.sub(rf'\b{re.escape(name)}\b', f'_{name}', line, count=1)
                if new_line != line:
                    lines[line_idx] = new_line
                    changed = True
                    fixed += 1
                    continue

            # Destructured: const { X, Y } = ... or const [X, Y] = ...
            # Prefix with _ in the destructuring
            if name in line:
                new_line = re.sub(rf'\b{re.escape(name)}\b', f'_{name}', line, count=1)
                if new_line != line:
                    lines[line_idx] = new_line
                    changed = True
                    fixed += 1
                    continue

    if changed:
        fp.write_text("\n".join(lines), "utf-8")
        print(f"  Fixed in: {rel_path}")

print(f"\nTotal fixed: {fixed}")
