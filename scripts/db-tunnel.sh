#!/usr/bin/env bash
#
# Open a local port to the private RDS instance through SSM.
#
#   npm run db:tunnel              # localhost:5433 -> RDS:5432
#   LOCAL_PORT=5440 npm run db:tunnel
#   INSTANCE_ID=i-... npm run db:tunnel
#
# The container instances have no SSH key pair and expose no port 22, so this
# uses AWS Systems Manager instead of an SSH tunnel: same local port, no key,
# no inbound rule. Requires the AWS CLI and the session-manager-plugin
# (https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html).
#
# Keep it running in one terminal, then in another:
#   PGHOST=localhost PGPORT=5433 npm run dev
#   PGHOST=localhost PGPORT=5433 npx prisma studio
#   psql "host=localhost port=5433 dbname=enigma_form user=enigma_admin sslmode=require"
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

# Value from the environment, else from the outer .env (the same precedence the
# app and CDK use). PGHOST in .env is the RDS endpoint, so read the file rather
# than trusting an override meant for a tunnelled run.
env_value() {
  local key="$1" value
  value="$(printenv "${key}" || true)"
  if [[ -z "${value}" && -f "${REPO_ROOT}/.env" ]]; then
    value="$(grep -E "^${key}=" "${REPO_ROOT}/.env" | tail -n 1 | cut -d= -f2- | tr -d '\r' || true)"
    value="${value%\'}"; value="${value#\'}"
  fi
  printf '%s' "${value}"
}

RDS_HOST="${RDS_HOST:-$(env_value PGHOST)}"
REGION="${AWS_REGION:-${CDK_REGION:-ap-south-1}}"
LOCAL_PORT="${LOCAL_PORT:-5433}"
INSTANCE_ID="${INSTANCE_ID:-}"

[[ -n "${RDS_HOST}" ]] || { echo "error: RDS_HOST (or PGHOST in .env) is required" >&2; exit 1; }
command -v aws >/dev/null || { echo "error: aws CLI not found on PATH" >&2; exit 1; }
command -v session-manager-plugin >/dev/null || {
  echo "error: session-manager-plugin not found on PATH" >&2
  echo "       install: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html" >&2
  exit 1
}

if [[ -z "${INSTANCE_ID}" ]]; then
  INSTANCE_ID="$(aws ssm describe-instance-information --region "${REGION}" \
    --query 'InstanceInformationList[?PingStatus==`Online`].InstanceId' --output text 2>/dev/null | awk '{print $1}')"
fi
[[ -n "${INSTANCE_ID}" ]] || {
  echo "error: no online SSM-managed instance in ${REGION}; pass INSTANCE_ID=i-..." >&2
  exit 1
}

echo "localhost:${LOCAL_PORT} -> ${RDS_HOST}:5432 via ${INSTANCE_ID} (${REGION})"
echo "In another shell:  PGHOST=localhost PGPORT=${LOCAL_PORT} npm run dev"
echo

exec aws ssm start-session \
  --target "${INSTANCE_ID}" \
  --region "${REGION}" \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "{\"host\":[\"${RDS_HOST}\"],\"portNumber\":[\"5432\"],\"localPortNumber\":[\"${LOCAL_PORT}\"]}"
