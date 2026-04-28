#!/usr/bin/env python3
"""
Converts // biome-ignore comments that are inside JSX to {/* biome-ignore */} format.
Reads the specific files reported by biome's noCommentText rule.
"""
import sys
from pathlib import Path

files_and_lines = [
    ("app/(main)/custom-tables/[id]/components/PastePreviewModal.tsx", 232),
    ("app/(main)/custom-tables/[id]/components/RowDrawer.tsx", 368),
    ("app/(main)/custom-tables/page.tsx", 1816),
    ("app/(main)/statements/[id]/edit/page.tsx", 581),
    ("app/(main)/statements/[id]/edit/page.tsx", 1246),
    ("app/(main)/statements/components/TablesReportsView.tsx", 611),
    ("app/(main)/workspaces/components/CategoryTree.tsx", 182),
    ("app/(main)/workspaces/components/MembersList.tsx", 105),
    ("app/(main)/workspaces/components/WorkspaceCategoriesView.tsx", 677),
    ("app/admin/users/page.tsx", 242),
    ("app/components/Breadcrumbs.tsx", 25),
    ("app/components/dashboard/FinlabTransactionCard.tsx", 101),
    ("app/components/TransactionDocumentViewer.tsx", 615),
    ("app/integrations/google-sheets/page.tsx", 772),
    ("app/settings/profile/components/SessionsSection.tsx", 98),
]

frontend_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/Users/symonbaikov/Projects/lumio/frontend")
fixed = 0

# Group by file
from collections import defaultdict
by_file = defaultdict(list)
for f, line in files_and_lines:
    by_file[f].append(line)

for rel_path, line_nums in by_file.items():
    filepath = frontend_dir / rel_path
    if not filepath.exists():
        print(f"  SKIP (not found): {rel_path}")
        continue

    content = filepath.read_text(encoding="utf-8")
    lines = content.split("\n")

    for line_num in sorted(line_nums, reverse=True):
        idx = line_num - 1
        if idx < 0 or idx >= len(lines):
            continue

        line = lines[idx]
        # Check if this line is a // biome-ignore comment
        stripped = line.strip()
        if not stripped.startswith("// biome-ignore"):
            # The comment might have shifted — search nearby
            for offset in range(-2, 3):
                check_idx = idx + offset
                if 0 <= check_idx < len(lines) and lines[check_idx].strip().startswith("// biome-ignore"):
                    idx = check_idx
                    line = lines[idx]
                    stripped = line.strip()
                    break
            else:
                print(f"  SKIP line {line_num} in {rel_path}: not a biome-ignore comment")
                continue

        # Convert // comment to {/* comment */}
        indent = len(line) - len(line.lstrip())
        indent_str = line[:indent]
        # Extract the comment content after //
        comment_content = stripped[3:]  # remove "// "
        new_line = f"{indent_str}{{/* {comment_content} */}}"
        lines[idx] = new_line
        fixed += 1

    filepath.write_text("\n".join(lines), encoding="utf-8")

print(f"Fixed {fixed} comments")
