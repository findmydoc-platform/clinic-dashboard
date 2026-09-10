#!/usr/bin/env bash
set -euo pipefail

target="${1:-}"

validate_deployment_metadata() {
  if [[ "${DEPLOYMENT_ENVIRONMENT:-}" != "${target}" ]]; then
    echo "DEPLOYMENT_ENVIRONMENT must equal the deployment target '${target}'." >&2
    exit 1
  fi

  if ! [[ "${DEPLOYMENT_COMMIT_SHA:-}" =~ ^[0-9a-f]{40}$ ]]; then
    echo "DEPLOYMENT_COMMIT_SHA must be a full lowercase 40-character SHA." >&2
    exit 1
  fi

  case "${target}" in
    preview)
      if [[ -n "${RELEASE_VERSION+x}" ]]; then
        echo "RELEASE_VERSION must be unset for Preview deployments." >&2
        exit 1
      fi
      ;;
    production)
      if ! [[ "${RELEASE_VERSION:-}" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
        echo "RELEASE_VERSION must be a vX.Y.Z version for Production deployments." >&2
        exit 1
      fi
      ;;
    *)
      echo "Unsupported target '${target}'. Use 'preview' or 'production'." >&2
      exit 1
      ;;
  esac
}

if [[ -z "${VERCEL_CLI_VERSION:-}" ]]; then
  echo "VERCEL_CLI_VERSION is required." >&2
  exit 1
fi

validate_deployment_metadata

case "${target}" in
  preview)
    exec pnpm dlx "vercel@${VERCEL_CLI_VERSION}" build
    ;;
  production)
    exec pnpm dlx "vercel@${VERCEL_CLI_VERSION}" build --prod
    ;;
esac
