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
  VIVARIUM_AGENT_REF          Agent git branch, tag, or commit to checkout.
  VIVARIUM_INSTALL_DIR        Agent checkout directory.
  VIVARIUM_BIN_DIR            Directory for the vivarium command.
  VIVARIUM_WORLD_REPO_URL     World repository URL.
  VIVARIUM_WORLD_ROOT         World checkout directory.
  VIVARIUM_DAEMON             Set to launchd to install and start the macOS daemon.
  VIVARIUM_DAEMON_LABEL       macOS LaunchAgent label.
  VIVARIUM_DAEMON_PORT        Local daemon port.
  VIVARIUM_DOMAIN             Initial setup domain.
  VIVARIUM_STATE_PATH         State database path. Defaults to ~/.vivarium/state.db.
  VIVARIUM_LIVE_ENV_PATH      Live readiness env path. Defaults to ~/.vivarium/live/live-readiness.local.env.
  VIVARIUM_GITHUB_OWNER       Prefill non-secret live env GitHub owner.
  VIVARIUM_AGENT_REPO_NAME    Prefill non-secret live env agent repository name.
  VIVARIUM_WORLD_REPO_NAME    Prefill non-secret live env world repository name.
  VIVARIUM_CANONICAL_WORLD_REF Prefill non-secret canonical world remote URL.
  VIVARIUM_PRIVATE_WORLD_REF  Prefill non-secret private world remote URL.
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

github_path_from_url() {
  local url="$1"
  local path

  case "$url" in
    https://github.com/*)
      path="${url#https://github.com/}"
      ;;
    http://github.com/*)
      path="${url#http://github.com/}"
      ;;
    git@github.com:*)
      path="${url#git@github.com:}"
      ;;
    ssh://git@github.com/*)
      path="${url#ssh://git@github.com/}"
      ;;
    *)
      return 1
      ;;
  esac

  path="${path%%\?*}"
  path="${path%%#*}"
  path="${path%.git}"

  case "$path" in
    */*)
      printf '%s\n' "$path"
      ;;
    *)
      return 1
      ;;
  esac
}

github_owner_from_url() {
  local path
  path="$(github_path_from_url "$1")" || return 1
  printf '%s\n' "${path%%/*}"
}

github_repo_from_url() {
  local path
  local repo
  path="$(github_path_from_url "$1")" || return 1
  repo="${path#*/}"
  printf '%s\n' "${repo%%/*}"
}

home_dir="${HOME:?HOME must be set}"
repo_url="${VIVARIUM_REPO_URL:-https://github.com/idanmann10/vivarium-agent.git}"
agent_ref="${VIVARIUM_AGENT_REF:-}"
install_dir="$(absolute_path "${VIVARIUM_INSTALL_DIR:-$home_dir/.vivarium/vivarium-agent}")"
bin_dir="$(absolute_path "${VIVARIUM_BIN_DIR:-$home_dir/.local/bin}")"
command_path="$bin_dir/vivarium"
world_repo_url="${VIVARIUM_WORLD_REPO_URL:-https://github.com/idanmann10/vivarium-world.git}"
default_world_root="$(dirname "$install_dir")/the-world"
world_root="$(absolute_path "${VIVARIUM_WORLD_ROOT:-$default_world_root}")"
daemon_mode="${VIVARIUM_DAEMON:-none}"
daemon_label="${VIVARIUM_DAEMON_LABEL:-com.vivarium.agent.daemon}"
daemon_host="${VIVARIUM_DAEMON_HOST:-127.0.0.1}"
daemon_port="${VIVARIUM_DAEMON_PORT:-8787}"
launch_agents_dir="$home_dir/Library/LaunchAgents"
daemon_plist_path="$launch_agents_dir/$daemon_label.plist"
daemon_log_dir="$home_dir/.vivarium/logs"
bun_command="${VIVARIUM_BUN_PATH:-bun}"
domain="${VIVARIUM_DOMAIN:-coding}"
state_path="${VIVARIUM_STATE_PATH:-$home_dir/.vivarium/state.db}"
live_env_path="${VIVARIUM_LIVE_ENV_PATH:-$home_dir/.vivarium/live/live-readiness.local.env}"
github_owner="${VIVARIUM_GITHUB_OWNER:-}"
agent_repo_name="${VIVARIUM_AGENT_REPO_NAME:-}"
world_repo_name="${VIVARIUM_WORLD_REPO_NAME:-}"
canonical_world_ref="${VIVARIUM_CANONICAL_WORLD_REF:-}"
private_world_ref="${VIVARIUM_PRIVATE_WORLD_REF:-}"
starter_goal="build a tiny local agent"

if [ "$github_owner" = "" ]; then
  github_owner="$(github_owner_from_url "$repo_url" || true)"
fi
if [ "$agent_repo_name" = "" ]; then
  agent_repo_name="$(github_repo_from_url "$repo_url" || true)"
fi
if [ "$world_repo_name" = "" ]; then
  world_repo_name="$(github_repo_from_url "$world_repo_url" || true)"
fi
if [ "$canonical_world_ref" = "" ]; then
  canonical_world_ref="$world_repo_url"
fi

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
      echo "Command: curl -fsSL https://bun.sh/install | bash" >&2
      echo "Then reload your shell and rerun the Vivarium installer." >&2
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

remote_default_branch() {
  local destination="$1"
  local head
  local branch

  git -C "$destination" remote set-head origin --auto >/dev/null 2>&1 || true
  head="$(git -C "$destination" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)"
  branch="${head#origin/}"

  if [ "$branch" != "" ] && git -C "$destination" show-ref --verify --quiet "refs/remotes/origin/$branch"; then
    printf '%s\n' "$branch"
    return 0
  fi

  if git -C "$destination" show-ref --verify --quiet refs/remotes/origin/main; then
    printf 'main\n'
    return 0
  fi

  if git -C "$destination" show-ref --verify --quiet refs/remotes/origin/master; then
    printf 'master\n'
    return 0
  fi

  return 1
}

checkout_default_branch() {
  local destination="$1"
  local branch
  local upstream

  branch="$(remote_default_branch "$destination")" || {
    echo "Unable to determine remote default branch for $destination" >&2
    exit 1
  }

  if git -C "$destination" show-ref --verify --quiet "refs/heads/$branch"; then
    run git -C "$destination" checkout "$branch"
  else
    run git -C "$destination" checkout -B "$branch" "origin/$branch"
  fi

  upstream="$(git -C "$destination" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
  if [ "$upstream" = "" ]; then
    run git -C "$destination" branch --set-upstream-to "origin/$branch" "$branch"
  fi
}

checkout_ref() {
  local destination="$1"
  local ref="$2"

  if git -C "$destination" show-ref --verify --quiet "refs/remotes/origin/$ref"; then
    run git -C "$destination" checkout -B "$ref" "origin/$ref"
    return 0
  fi

  run git -C "$destination" checkout "$ref"
}

checkout_or_update() {
  local repo="$1"
  local destination="$2"
  local ref="${3:-}"
  local upstream

  if [ -d "$destination/.git" ]; then
    if [ "$dry_run" -eq 1 ]; then
      echo "Would ensure git origin for $destination: $repo"
    elif git -C "$destination" remote get-url origin >/dev/null 2>&1; then
      run git -C "$destination" remote set-url origin "$repo"
    else
      run git -C "$destination" remote add origin "$repo"
    fi

    if [ "$ref" != "" ]; then
      run git -C "$destination" fetch --all --prune
      checkout_ref "$destination" "$ref"
      if [ "$dry_run" -eq 0 ]; then
        upstream="$(git -C "$destination" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
        if [ "$upstream" != "" ]; then
          run git -C "$destination" pull --ff-only
        fi
      fi
      return 0
    fi

    if [ "$dry_run" -eq 1 ]; then
      echo "Would run: git -C $destination fetch --all --prune"
      echo "Would run: git -C $destination checkout default branch"
      echo "Would run: git -C $destination pull --ff-only"
      return 0
    fi

    run git -C "$destination" fetch --all --prune
    checkout_default_branch "$destination"
    run git -C "$destination" pull --ff-only
    return 0
  fi

  if [ -e "$destination" ]; then
    echo "Refusing to overwrite non-git path: $destination" >&2
    exit 1
  fi

  run git clone "$repo" "$destination"
  if [ "$ref" != "" ]; then
    run git -C "$destination" fetch --all --prune
    checkout_ref "$destination" "$ref"
    if [ "$dry_run" -eq 0 ]; then
      upstream="$(git -C "$destination" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
      if [ "$upstream" != "" ]; then
        run git -C "$destination" pull --ff-only
      fi
    fi
  fi
}

display_home_path() {
  case "$1" in
    "$home_dir"/*)
      printf '~/%s\n' "${1#"$home_dir"/}"
      ;;
    *)
      printf '%s\n' "$1"
      ;;
  esac
}

xml_escape() {
  local value="$1"
  value="${value//&/&amp;}"
  value="${value//</&lt;}"
  value="${value//>/&gt;}"
  value="${value//\"/&quot;}"
  value="${value//\'/&apos;}"
  printf '%s' "$value"
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
    printf 'exec %q apps/cli/src/main.ts "$@"\n' "$bun_command"
  } >"$command_path"
  chmod +x "$command_path"
}

write_launch_agent() {
  if [ "$daemon_mode" = "none" ]; then
    return 0
  fi

  if [ "$daemon_mode" != "launchd" ]; then
    echo "Invalid VIVARIUM_DAEMON: $daemon_mode" >&2
    echo "Supported values: none, launchd" >&2
    exit 2
  fi

  if [ "$dry_run" -eq 0 ] && [ "$(uname -s)" != "Darwin" ]; then
    echo "VIVARIUM_DAEMON=launchd requires macOS." >&2
    exit 1
  fi

  local display_plist
  display_plist="$(display_home_path "$daemon_plist_path")"

  if [ "$dry_run" -eq 1 ]; then
    echo "Daemon deployment: launchd"
    echo "Would write macOS LaunchAgent: $display_plist"
    echo "Would run: launchctl bootout gui/\$UID $display_plist"
    echo "Would run: launchctl bootstrap gui/\$UID $display_plist"
    echo "Would run: launchctl kickstart -k gui/\$UID/$daemon_label"
    return 0
  fi

  run mkdir -p "$launch_agents_dir"
  run mkdir -p "$daemon_log_dir"

  cat >"$daemon_plist_path" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "https://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$(xml_escape "$daemon_label")</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(xml_escape "$bun_command")</string>
    <string>apps/daemon/src/main.ts</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$(xml_escape "$install_dir")</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>VIVARIUM_DAEMON_HOST</key>
    <string>$(xml_escape "$daemon_host")</string>
    <key>VIVARIUM_DAEMON_PORT</key>
    <string>$(xml_escape "$daemon_port")</string>
    <key>VIVARIUM_WORLD_ROOT</key>
    <string>$(xml_escape "$world_root")</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$(xml_escape "$daemon_log_dir/daemon.out.log")</string>
  <key>StandardErrorPath</key>
  <string>$(xml_escape "$daemon_log_dir/daemon.err.log")</string>
</dict>
</plist>
EOF

  launchctl bootout "gui/$(id -u)" "$daemon_plist_path" >/dev/null 2>&1 || true
  run launchctl bootstrap "gui/$(id -u)" "$daemon_plist_path"
  run launchctl kickstart -k "gui/$(id -u)/$daemon_label"
  echo "Daemon deployment: launchd"
  echo "LaunchAgent: $daemon_plist_path"
  echo "Status URL: http://$daemon_host:$daemon_port/status"
}

stage_label() {
  paint_line 33 "  [$1] $2"
}

print_launch_handoff_command() {
  local command="$1"

  printf '      %q launch handoff' "$command"
  if [ "$daemon_host" != "127.0.0.1" ]; then
    printf ' --daemon-host %q' "$daemon_host"
  fi
  if [ "$daemon_port" != "8787" ]; then
    printf ' --daemon-port %q' "$daemon_port"
  fi
  printf '\n'
}

run_launch_handoff_summary() {
  if [ "$daemon_host" != "127.0.0.1" ] && [ "$daemon_port" != "8787" ]; then
    run "$command_path" launch handoff --daemon-host "$daemon_host" --daemon-port "$daemon_port"
    return 0
  fi

  if [ "$daemon_host" != "127.0.0.1" ]; then
    run "$command_path" launch handoff --daemon-host "$daemon_host"
    return 0
  fi

  if [ "$daemon_port" != "8787" ]; then
    run "$command_path" launch handoff --daemon-port "$daemon_port"
    return 0
  fi

  run "$command_path" launch handoff
}

print_launch_sequence() {
  local command="$1"
  local keep_moving_stage=2

  stage_label 1 "Run the local agent"
  printf '      %q local run --goal "%s" --domain %q --state-path %q --world-root %q --live-env-path %q\n' "$command" "$starter_goal" "$domain" "$state_path" "$world_root" "$live_env_path"
  if [ "$daemon_mode" = "launchd" ]; then
    stage_label 2 "Verify the Mac daemon"
    printf '      %q daemon smoke --status-url %q\n' "$command" "http://$daemon_host:$daemon_port/status"
    keep_moving_stage=3
  fi
  stage_label "$keep_moving_stage" "Review launch handoff"
  print_launch_handoff_command "$command"
  keep_moving_stage=$((keep_moving_stage + 1))
  stage_label "$keep_moving_stage" "Keep moving"
  printf '      %q status\n' "$command"
  printf '      %q help\n' "$command"
  printf '      %q update\n' "$command"
}

print_live_setup_sequence() {
  local command="$1"

  stage_label 1 "Generate local setup files"
  printf '      %q setup live\n' "$command"
  stage_label 2 "Open account and key handoff"
  printf '      %q connect signup\n' "$command"
  stage_label 3 "Review readiness"
  printf '      %q connect\n' "$command"
  printf '      %q connect setup --confirm-write\n' "$command"
  stage_label 4 "Prove live readiness"
  printf '      %q connect smoke\n' "$command"
  printf '      %q proof init\n' "$command"
  printf '      %q proof\n' "$command"
  printf '      %q doctor --live\n' "$command"
}

banner
echo "Install directory: $install_dir"
echo "Command path: $command_path"
echo "Repository: $repo_url"
if [ "$agent_ref" != "" ]; then
  echo "Agent ref: $agent_ref"
fi
echo "World directory: $world_root"
echo "World repository: $world_repo_url"
echo "Domain: $domain"
echo "State path: $state_path"
echo "Live readiness path: $live_env_path"
echo

if [ "$dry_run" -eq 0 ]; then
  need_command git
  need_command "$bun_command"
  bun_command="${VIVARIUM_BUN_PATH:-$(command -v bun)}"
fi

run mkdir -p "$(dirname "$install_dir")"
checkout_or_update "$repo_url" "$install_dir" "$agent_ref"

run mkdir -p "$(dirname "$world_root")"
checkout_or_update "$world_repo_url" "$world_root"

if [ "$dry_run" -eq 0 ]; then
  cd "$install_dir"
fi

run "$bun_command" install --frozen-lockfile
run mkdir -p "$bin_dir"
write_vivarium_command
run mkdir -p "$(dirname "$state_path")"
run mkdir -p "$(dirname "$live_env_path")"
setup_args=(apps/cli/src/main.ts local --domain "$domain" --world-root "$world_root" --state-path "$state_path" --live-env-path "$live_env_path")
if [ "$github_owner" != "" ]; then
  setup_args+=(--github-owner "$github_owner")
fi
if [ "$agent_repo_name" != "" ]; then
  setup_args+=(--agent-repo "$agent_repo_name")
fi
if [ "$world_repo_name" != "" ]; then
  setup_args+=(--world-repo "$world_repo_name")
fi
if [ "$canonical_world_ref" != "" ]; then
  setup_args+=(--canonical-world-ref "$canonical_world_ref")
fi
if [ "$private_world_ref" != "" ]; then
  setup_args+=(--private-world-ref "$private_world_ref")
fi
run "$bun_command" "${setup_args[@]}"
write_launch_agent

echo
echo "After installation:"
print_launch_sequence "vivarium"
echo
echo "Command path fallback:"
print_launch_sequence "$command_path"
echo
echo "Live setup when ready:"
print_live_setup_sequence "vivarium"
echo
echo "Live setup fallback:"
print_live_setup_sequence "$command_path"
echo
echo "Launch handoff summary:"
run_launch_handoff_summary
echo
echo "If 'vivarium' is not found, add $bin_dir to PATH or run a command path above."
