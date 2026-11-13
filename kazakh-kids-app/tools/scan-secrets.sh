#!/usr/bin/env bash
# Secret scan for commits. Uses gitleaks when it is installed; otherwise built-in patterns for the keys this project
# handles (Freedom Speech sk_…, Hugging Face hf_…, GitHub, AWS, private keys).
#   tools/scan-secrets.sh          staged changes (pre-commit)
#   tools/scan-secrets.sh --all    every tracked file
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
PATTERN='(sk_[A-Za-z0-9]{24,}|hf_[A-Za-z0-9]{30,}|gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'
if command -v gitleaks >/dev/null 2>&1; then
  if [ "${1:-}" = "--all" ]; then exec gitleaks detect --no-banner --redact; else exec gitleaks protect --staged --no-banner --redact; fi
fi
if [ "${1:-}" = "--all" ]; then
  hits=$(git grep -nIE "$PATTERN" -- . ':!*.mp3' ':!*.apk' ':!*.png' || true)
else
  hits=$(git diff --cached -U0 --no-color | grep -E '^\+' | grep -nE "$PATTERN" || true)
fi
if [ -n "$hits" ]; then
  echo "✖ possible secret — commit blocked:" >&2
  echo "$hits" | sed -E 's/(sk_|hf_|ghp_|github_pat_)[A-Za-z0-9_]{6}[A-Za-z0-9_]*/\1******/g' >&2
  echo "Keep keys in the environment or kazakh-kids-app/.env (git-ignored)." >&2
  exit 1
fi
echo "✔ no secrets found"
