# Methodology

This folder is the **brain** of Here's What I See. The interface never hard-codes
how the diagnosis works — it reads these files at request time and hands them to
the model as its operating instructions.

Edit these files to improve the diagnosis. You do **not** need to touch the
application code.

| File | Controls |
|---|---|
| `persona.md` | Voice and stance of the strategist |
| `diagnostic-lens.md` | The frameworks used to see the problem |
| `questioning.md` | How each diagnostic question is chosen and phrased |
| `analysis.md` | How each section of "Here's What I See" and the Leverage Map is written |
| `config.json` | Question limits, model, effort levels, loading phrases |

## How changes take effect

- **Local / self-hosted (`npm run dev` or `npm start`)**: edits apply on the next
  request. No rebuild.
- **Remote methodology (no redeploy)**: set `METHODOLOGY_URL` to a base URL that
  serves these same file names (for example a raw GitHub URL to this folder on a
  branch). The app fetches it at request time (cached for 60 seconds), so you can
  ship methodology changes by pushing to that branch.
- **Serverless hosts (e.g. Vercel) without `METHODOLOGY_URL`**: the files are
  bundled with each deploy, so a push triggers a redeploy that picks them up.

## The contract

The only thing the interface depends on is the **output shape**, defined in
`src/lib/schema.ts` (question turn + analysis). As long as the output keeps that
shape, you can rewrite the methodology freely. If you want a new section in the
analysis, that's a schema change plus a small UI change.
