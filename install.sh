#!/usr/bin/env bash
#
# One-shot installer for the Markdown Archive engine.
# Bootstraps a new content-only archive repository anywhere:
#
#   curl -fsSL https://raw.githubusercontent.com/SpreadSheets600/markdown-archive-engine/main/install.sh | bash -s -- my-archive
#
# or, from a checkout of this branch:
#
#   ./install.sh my-archive [--base /my-archive] [--url https://me.github.io]
#
set -euo pipefail

REPO="${ARCHIVE_REPO:-SpreadSheets600/markdown-archive-engine}"
ENGINE_BRANCH="${ARCHIVE_ENGINE_BRANCH:-main}"
TARGET=""
BASE_ARG=""
URL_ARG=""

usage() {
  cat <<EOF
Usage: install.sh <target-dir> [--base /repo-name] [--url https://owner.github.io]

Creates <target-dir> as a new archive repository whose main branch holds
only Markdown content; the site engine is fetched onto a separate folder
(.engine/) and never touches your content.

Environment overrides:
  ARCHIVE_REPO           GitHub repo to fetch the engine from
                         (default: $REPO)
  ARCHIVE_ENGINE_BRANCH  Branch holding the engine (default: $ENGINE_BRANCH)
  SKIP_INSTALL=1         Skip npm install inside .engine/
EOF
  exit 1
}

TARGET="${1:-}"
[ -z "$TARGET" ] && usage
shift || true
while [ $# -gt 0 ]; do
  case "$1" in
    --base) BASE_ARG="$2"; shift 2 ;;
    --url) URL_ARG="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; usage ;;
  esac
done

if [ -e "$TARGET" ] && [ -n "$(ls -A "$TARGET" 2>/dev/null)" ]; then
  echo "error: '$TARGET' exists and is not empty" >&2
  exit 1
fi

mkdir -p "$TARGET"
TARGET="$(cd "$TARGET" && pwd)"
echo "==> Scaffolding archive in $TARGET"

# 1. Git repository with a content-only main branch
git init -q -b main "$TARGET"

# 2. Fetch the engine branch tarball
echo "==> Fetching engine ($REPO@$ENGINE_BRANCH)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
curl -fsSL "https://github.com/$REPO/archive/refs/heads/$ENGINE_BRANCH.tar.gz" | tar -xz -C "$TMP"
SRC="$(find "$TMP" -maxdepth 1 -mindepth 1 -type d | head -n1)"

mkdir "$TARGET/.engine"
cp -R "$SRC/src" "$SRC/public" "$TARGET/.engine/" 2>/dev/null || true
for f in astro.config.mjs tsconfig.json package.json package-lock.json; do
  [ -f "$SRC/$f" ] && cp "$SRC/$f" "$TARGET/.engine/"
done

# 3. Point the engine at the parent folder as its content root,
#    and configure the Pages sub-path for this project.
PROJECT_NAME="$(basename "$TARGET")"
{
  echo "dir=.."
  echo "base=${BASE_ARG:-/$PROJECT_NAME}"
  [ -n "$URL_ARG" ] && echo "url=$URL_ARG"
} > "$TARGET/.engine/.contentdir"

# 4. Content skeleton on main
cat > "$TARGET/README.md" <<EOF
# $PROJECT_NAME

A maintained, Markdown-first archive.

## Sessions

| Folder | Topic |
| ------ | ----- |
EOF
mkdir -p "$TARGET/.github/workflows"
if [ -f "$SRC/template/workflow.yml" ]; then
  cp "$SRC/template/workflow.yml" "$TARGET/.github/workflows/docs.yml"
fi

cat > "$TARGET/.gitignore" <<'EOF'
.engine/
dist/
node_modules/
.astro/
EOF

# 5. Install engine dependencies unless skipped
if [ "${SKIP_INSTALL:-0}" != "1" ] && command -v npm >/dev/null 2>&1; then
  echo "==> Installing engine dependencies"
  (cd "$TARGET/.engine" && npm ci --silent 2>/dev/null || npm install --silent)
else
  echo "==> Skipping npm install (SKIP_INSTALL=1 or npm missing)"
fi

cat <<EOF

Done! Your archive lives in:

    $TARGET

Layout:
    main     -> only your Markdown + assets (this working directory)
    .engine/ -> site generator (git-ignored; re-fetchable any time)

Next steps:
    cd $TARGET/.engine && npm run dev   # live preview at localhost:4321
    Write Markdown next to README.md, then push main to GitHub -
    Actions builds and publishes the site automatically.
EOF
