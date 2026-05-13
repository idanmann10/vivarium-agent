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
  VIVARIUM_COLOR              Set to always or never to control ANSI output.
  VIVARIUM_THEME              Set to matrix or amber for alternate ASCII palettes.

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

use_color() {
  case "${VIVARIUM_COLOR:-}" in
    always)
      return 0
      ;;
    never)
      return 1
      ;;
  esac

  if [ "${FORCE_COLOR:-}" != "" ] && [ "${FORCE_COLOR:-}" != "0" ]; then
    return 0
  fi

  if [ "${NO_COLOR:-}" != "" ]; then
    return 1
  fi

  [ -t 1 ]
}

paint_line() {
  local style="$1"
  local text="$2"

  if use_color; then
    printf '\033[%sm%s\033[0m\n' "$style" "$text"
    return 0
  fi

  printf '%s\n' "$text"
}

theme_line_style() {
  local index="$1"

  case "${VIVARIUM_THEME:-vivarium}" in
    matrix)
      printf '32'
      ;;
    amber)
      printf '33'
      ;;
    *)
      case "$index" in
        1 | 2)
          printf '36'
          ;;
        3 | 5)
          printf '34'
          ;;
        4)
          printf '35'
          ;;
        *)
          printf '33'
          ;;
      esac
      ;;
  esac
}

banner() {
  paint_line "$(theme_line_style 1)" ' __      __ _____ __      __    _     ____  ___  _   _  __  __'
  paint_line "$(theme_line_style 2)" ' \ \    / /|_   _|\ \    / /   / \   |  _ \|_ _|| | | ||  \/  |'
  paint_line "$(theme_line_style 3)" '  \ \  / /   | |   \ \  / /   / _ \  | |_) || | | | | || |\/| |'
  paint_line "$(theme_line_style 4)" '   \ \/ /    | |    \ \/ /   / ___ \ |  _ < | | | |_| || |  | |'
  paint_line "$(theme_line_style 5)" '    \__/    |____|   \__/   /_/   \_\|_| \_\___| \___/ |_|  |_|'
  paint_line "$(theme_line_style 6)" '            VIVARIUM // local memory // world culture'
  echo
  paint_line "1;36" "Vivarium Agent Installer"
  echo "------------------------"
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

stage_label() {
  paint_line 33 "  [$1] $2"
}

print_launch_sequence() {
  local command="$1"

  stage_label 1 "Prove the local loop"
  printf '      %q run --goal "validate local setup" --state-path %q\n' "$command" "$state_path"
  stage_label 2 "Prepare live readiness"
  printf '      Edit live-readiness.local.env locally. Keep it out of git.\n'
  printf '      %q setup --env-file live-readiness.local.env --domain %q --world-root %q --state-path %q\n' "$command" "$domain" "$world_root" "$state_path"
  printf '      %q setup --env-file live-readiness.local.env --domain %q --world-root %q --state-path %q --confirm-write\n' "$command" "$domain" "$world_root" "$state_path"
  stage_label 3 "Inspect configured models"
  printf '      %q model --env-file live-readiness.local.env\n' "$command"
  stage_label 4 "Prepare live evidence"
  printf '      %q live evidence-init --path v1-evidence.json\n' "$command"
  stage_label 5 "Run the readiness gate"
  printf '      %q doctor --live --env-file live-readiness.local.env\n' "$command"
  stage_label 6 "Keep moving"
  printf '      %q status\n' "$command"
  printf '      %q help\n' "$command"
  printf '      %q update\n' "$command"
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
run bun apps/cli/src/main.ts setup --quick --domain "$domain" --world-root "$world_root" --state-path "$state_path"

echo
echo "After installation:"
print_launch_sequence "vivarium"
echo
echo "Command path fallback:"
print_launch_sequence "$command_path"
echo
echo "If 'vivarium' is not found, add $bin_dir to PATH or run a command path above."
