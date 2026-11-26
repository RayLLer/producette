#!/usr/bin/env bash
# Deploy gate (Paso 7). GitHub Free has no protected branches, so deploy.yml only migrates
# staging when the pushed commit is the merge commit of a pull request into main whose CI
# check passed. Anything else (a direct push that skipped the local hook, a commit that only
# belongs to a PR branch, a PR with red or missing CI) stops here without touching anything.
#
# Usage: deploy-gate.sh <sha>
# Env:   GH_TOKEN (read access to pull requests and checks), GITHUB_REPOSITORY (owner/repo),
#        CI_CHECK_NAME (default "checks": the job id in .github/workflows/ci.yml)
# Needs only the gh CLI (its --jq flag), so it also runs locally to test the logic.
set -euo pipefail

SHA="${1:?usage: deploy-gate.sh <sha>}"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
CHECK_NAME="${CI_CHECK_NAME:-checks}"

PR=$(gh api "repos/$REPO/commits/$SHA/pulls" --jq "
  [.[] | select(.merged_at != null and .base.ref == \"main\" and .merge_commit_sha == \"$SHA\")]
  | first // empty | \"\(.number) \(.head.sha)\"")

if [ -z "$PR" ]; then
  echo "::error::$SHA is not the merge commit of a pull request into main. Nothing is migrated."
  exit 1
fi
read -r NUMBER HEAD_SHA <<<"$PR"

read -r TOTAL PASSED <<<"$(gh api "repos/$REPO/commits/$HEAD_SHA/check-runs?check_name=$CHECK_NAME&filter=latest" \
  --jq '[.check_runs[].conclusion] | "\(length) \(map(select(. == "success")) | length)"')"

if [ "$TOTAL" -eq 0 ] || [ "$PASSED" -ne "$TOTAL" ]; then
  echo "::error::CI check '$CHECK_NAME' of PR #$NUMBER is not green ($PASSED of $TOTAL passed). Nothing is migrated."
  exit 1
fi

echo "OK: $SHA merges PR #$NUMBER and its CI check '$CHECK_NAME' passed."
