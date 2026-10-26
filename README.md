# Claude AI Code Review Bot

An automated, multi-platform AI code reviewer powered by Claude. It inspects PR diffs, checks against your project's `CLAUDE.md` invariants and custom rules, and posts actionable inline comments and summary reviews on pull requests.

Works with **GitHub Actions** and **Bitbucket Pipelines**.

---

## Features

- **Inline Code Comments:** Anchors high/medium/low severity findings directly to modified lines.
- **Project Rules & Invariants:** Automatically checks against `CLAUDE.md` (specifically `## Critical backend invariants`) and optional custom rules files.
- **Diff Noise Filtering:** Automatically excludes lockfiles (`package-lock.json`), build bundles, SVGs, and binary assets.
- **Fail-Safe Execution:** Swallows internal errors (`exit 0`) so reviews never block PR merges.

---

## Prerequisites: Getting `CLAUDE_CODE_OAUTH_TOKEN`

This action runs the headless Claude Code CLI, which requires an authenticated OAuth token.

1. Install and log in to Claude CLI locally:
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude login
   ```
2. Retrieve your token:
   - **macOS/Linux:** Check `~/.claude.json` or your system keychain.
   - Alternatively, check the `CLAUDE_CODE_OAUTH_TOKEN` environment variable on your machine.
3. Add this token as a secret in your GitHub repository:
   - Go to **Settings** > **Secrets and variables** > **Actions**.
   - Create a new repository secret named `CLAUDE_OAUTH_TOKEN`.

---

## How to Use

### GitHub Actions

Add the following workflow file to your repo at `.github/workflows/ai-review.yml`:

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Required to fetch git history for base...head diff

      - name: Run Claude Review Bot
        uses: AyushShuklaAxeno/reviewCheckerBot@main
        with:
          anthropic-api-key: ${{ secrets.CLAUDE_OAUTH_TOKEN }}
          # Optional: path to custom rules file in your repo (default: 'customRules')
          custom-rules-path: 'customRules'
```

---

### Optional: Project Invariants & Custom Rules

1. **`CLAUDE.md` Invariants:**
   Add a `CLAUDE.md` file in the root of your repository with a section titled `## Critical backend invariants`:
   ```markdown
   ## Critical backend invariants
   - Never write raw SQL; always use parameterized queries.
   - All mutations must be wrapped in transactions.
   ## Migrations
   ```
2. **Custom Rules File:**
   Create a file (e.g. `customRules` or `.review-rules.md`) in your repo root with team-specific review guidelines, and pass its path to `custom-rules-path`.

---

## Inputs

| Input | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `anthropic-api-key` | **Yes** | — | Your Claude OAuth Token (`CLAUDE_CODE_OAUTH_TOKEN`). |
| `custom-rules-path` | No | `customRules` | Path to a custom review rules file in the consumer repo. |

---

## License

MIT
