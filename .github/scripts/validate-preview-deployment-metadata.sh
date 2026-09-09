#!/usr/bin/env bash
set -euo pipefail

if [[ "${DEPLOYMENT_ENVIRONMENT:-}" != "preview" ]]; then
  echo "DEPLOYMENT_ENVIRONMENT must be preview for Preview deployments." >&2
  exit 1
fi

if ! [[ "${DEPLOYMENT_COMMIT_SHA:-}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "DEPLOYMENT_COMMIT_SHA must be a full lowercase 40-character SHA." >&2
  exit 1
fi

if [[ -n "${RELEASE_VERSION+x}" ]]; then
  echo "RELEASE_VERSION must be unset for Preview deployments." >&2
  exit 1
fi

environment_file=".vercel/.env.preview.local"
if [[ ! -f "${environment_file}" ]]; then
  echo "Pulled Preview environment file is required before deployment." >&2
  exit 1
fi

if command -v rg >/dev/null 2>&1; then
  if rg -q '^[[:space:]]*(export[[:space:]]+)?RELEASE_VERSION[[:space:]]*=' "${environment_file}"; then
    echo "Pulled Preview environment must not define RELEASE_VERSION." >&2
    exit 1
  fi
  exit 0
fi

if grep -Eq '^[[:space:]]*(export[[:space:]]+)?RELEASE_VERSION[[:space:]]*=' "${environment_file}"; then
  echo "Pulled Preview environment must not define RELEASE_VERSION." >&2
  exit 1
fi
