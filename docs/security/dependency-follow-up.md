# Dependency Security Follow-up

After `npm audit fix --omit=dev`, the backend audit is reduced to the direct `xlsx` advisory with no upstream fix. The frontend audit still includes vulnerabilities that require breaking dependency changes or package replacement.

## Backend

- `xlsx` remains vulnerable and has no fixed upstream release in the current package line.
- Follow-up: replace `xlsx` in parsing/export code with a maintained library such as `exceljs`, or isolate XLSX parsing/export behind a constrained worker with strict file-size, timeout, and worksheet limits.

## Frontend

- `xlsx` remains vulnerable and should be removed from browser export code or replaced with a maintained writer.
- The `intlayer`/`next-intlayer` dependency chain retains vulnerable transitive packages including `simple-git`; npm reports the available fix as a breaking `next-intlayer` upgrade.
- `next` remains flagged through a nested `postcss` advisory; npm reports a breaking fix path rather than a safe in-range update.

## Acceptance Criteria For Follow-up

- `npm --prefix backend audit --omit=dev` has no non-accepted runtime advisories.
- `npm --prefix frontend audit --omit=dev` has no critical advisories.
- Any intentionally accepted residual advisory has a documented reachability analysis and owner.
