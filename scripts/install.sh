#!/usr/bin/env bash
set -euo pipefail

dry_run=0

usage() {
  cat <<'EOF'
Vivarium Agent installer

Usage:
  bash scripts/install.sh [--dry-run]

Environment:
  VIVARIUM_REPO_URL           Agent repository URL.
  VIVARIUM_INSTALL_DIR        Agent checkout directory.
  VIVARIUM_BIN_DIR            Directory for the vivarium command.
  VIVARIUM_WORLD_REPO_URL     World repository URL.
  VIVARIUM_WORLD_ROOT         World checkout directory.
  VIVARIUM_DOMAIN             Initial setup domain.
  VIVARIUM_STATE_PATH         State database path relative to the agent checkout.

Example:
  curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/main/scripts/install.sh | bash
EOF
}

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      dry_run=1
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

absolute_path() {
  local path="$1"
  local parent
  local leaf

  case "$path" in
    /*)
      ;;
    *)
      path="$PWD/$path"
      ;;
  esac

  parent="$(dirname "$path")"
  leaf="$(basename "$path")"

  if [ -d "$parent" ]; then
    printf '%s/%s\n' "$(cd "$parent" && pwd)" "$leaf"
    return 0
  fi

  printf '%s\n' "$path"
}

home_dir="${HOME:?HOME must be set}"
repo_url="${VIVARIUM_REPO_URL:-https://github.com/idanmann10/vivarium-agent.git}"
install_dir="$(absolute_path "${VIVARIUM_INSTALL_DIR:-$home_dir/.vivarium/vivarium-agent}")"
bin_dir="$(absolute_path "${VIVARIUM_BIN_DIR:-$home_dir/.local/bin}")"
command_path="$bin_dir/vivarium"
world_repo_url="${VIVARIUM_WORLD_REPO_URL:-https://github.com/idanmann10/vivarium-world.git}"
default_world_root="$(dirname "$install_dir")/the-world"
world_root="$(absolute_path "${VIVARIUM_WORLD_ROOT:-$default_world_root}")"
domain="${VIVARIUM_DOMAIN:-coding}"
state_path="${VIVARIUM_STATE_PATH:-.vivarium/state.db}"

banner() {
  cat <<'EOF'
          .-""""-.
       .-'  .--.  '-.
      /   .' VI '.   \
     |    | VAR |    |
      \   '.IUM.'   /
       '-.  '--'  .-'
          '-.__.-'

Vivarium Agent Installer
------------------------
EOF
}

need_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    if [ "$1" = "bun" ]; then
      echo "Install Bun first: https://bun.sh/docs/installation" >&2
    fi
    exit 1
  fi
}

run() {
  if [ "$dry_run" -eq 1 ]; then
    echo "Would run: $*"
    return 0
  fi

  "$@"
}

checkout_or_update() {
  local repo="$1"
  local destination="$2"

  if [ -d "$destination/.git" ]; then
    run git -C "$destination" pull --ff-only
    return 0
  fi

  if [ -e "$destination" ]; then
    echo "Refusing to overwrite non-git path: $destination" >&2
    exit 1
  fi

  run git clone "$repo" "$destination"
}

write_vivarium_command() {
  if [ "$dry_run" -eq 1 ]; then
    echo "Would write vivarium command: $command_path"
    return 0
  fi

  {
    printf '#!/usr/bin/env bash\n'
    printf 'set -euo pipefail\n'
    printf 'cd %q\n' "$install_dir"
    printf 'exec bun apps/cli/src/main.ts "$@"\n'
  } >"$command_path"
  chmod +x "$command_path"
}

banner
echo "Install directory: $install_dir"
echo "Command path: $command_path"
echo "Repository: $repo_url"
echo "World directory: $world_root"
echo "World repository: $world_repo_url"
echo "Domain: $domain"
echo "State path: $state_path"
echo

if [ "$dry_run" -eq 0 ]; then
  need_command git
  need_command bun
fi

run mkdir -p "$(dirname "$install_dir")"
checkout_or_update "$repo_url" "$install_dir"

run mkdir -p "$(dirname "$world_root")"
checkout_or_update "$world_repo_url" "$world_root"

if [ "$dry_run" -eq 0 ]; then
  cd "$install_dir"
fi

run bun install --frozen-lockfile
run mkdir -p "$bin_dir"
write_vivarium_command
run mkdir -p "$(dirname "$state_path")"
run bun apps/cli/src/main.ts setup --domain "$domain" --world-root "$world_root" --state-path "$state_path"

echo
echo "After installation:"
echo "  vivarium run --goal \"validate local setup\""
echo "  vivarium live env-init --path live-readiness.local.env"
echo "  vivarium status"
echo "  vivarium help"
echo "  vivarium model"
echo "  vivarium doctor"
echo "  vivarium setup"
echo "  vivarium update"
echo
echo "Command path fallback:"
echo "  $command_path status"
echo
echo "If 'vivarium' is not found, add $bin_dir to PATH or run the command path above."
