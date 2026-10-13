#!/usr/bin/env bash
# CI shell for `run:` steps (`shell: bash tools/ci_step.sh {0}`).
#
# Runs the step exactly like GitHub's default bash shell. On failure it also
# repeats the step's last error lines, and the free disk space, as error
# annotations. Annotations are readable through the checks API even where raw
# job logs are not, so a red run always says why it failed.
script="$1"
log="$(mktemp)"
bash --noprofile --norc -eo pipefail "$script" 2>&1 | tee "$log"
status=${PIPESTATUS[0]}
if [ "$status" -ne 0 ]; then
  # Terminal colour codes would hide `error:` at the start of a line.
  sed -i 's/\x1b\[[0-9;]*m//g' "$log"
  {
    grep -E 'panicked at|^error(\[|:)|^Error|FAILED|AssertionError|ValueError|No space left|not ok ' "$log" \
      || tail -n 5 "$log"
  } | tail -n 8 | while IFS= read -r line; do
    line="${line//'%'/%25}"
    printf '::error title=Step failed (exit %s)::%s\n' "$status" "${line:0:900}"
  done
  printf '::error title=Disk::%s\n' "$(df -h . | tail -n 1)"
fi
rm -f "$log"
exit "$status"
