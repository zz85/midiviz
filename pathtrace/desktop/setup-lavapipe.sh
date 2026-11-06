#!/usr/bin/env bash
# Unpack Mesa's lavapipe (CPU Vulkan) into ~/.cache/midiviz/lavapipe without root, for --backend=lavapipe.
# Not needed if mesa-vulkan-drivers is installed system-wide. Uses the distro's own packages (dnf or apt).
set -euo pipefail
dest="${LAVAPIPE_DIR:-$HOME/.cache/midiviz/lavapipe}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$dest"
cd "$work"
if command -v dnf >/dev/null; then
  dnf download -q mesa-vulkan-drivers vulkan-loader
  for f in *.rpm; do rpm2cpio "$f" | (cd "$dest" && cpio -idm --quiet); done
elif command -v apt-get >/dev/null; then
  apt-get download -q mesa-vulkan-drivers libvulkan1
  for f in *.deb; do dpkg-deb -x "$f" "$dest"; done
  # Debian puts libraries under usr/lib/<triplet>; main.cjs looks in usr/lib64
  mkdir -p "$dest/usr/lib64"
  find "$dest/usr/lib" -maxdepth 2 \( -name 'libvulkan*.so*' \) -exec ln -sf {} "$dest/usr/lib64/" \;
else
  echo "need dnf or apt-get" >&2; exit 1
fi
# The ICD names an absolute library path; point it into $dest.
for icd in "$dest"/usr/share/vulkan/icd.d/lvp_icd.*.json; do
  lib="$(sed -n 's/.*"library_path": *"\([^"]*\)".*/\1/p' "$icd")"
  sed -i "s#\"library_path\": *\"[^\"]*\"#\"library_path\": \"$dest/usr/lib64/$(basename "$lib")\"#" "$icd"
  [ -e "$dest/usr/lib64/$(basename "$lib")" ] || ln -sf "$(find "$dest" -name "$(basename "$lib")" | head -1)" "$dest/usr/lib64/"
  echo "lavapipe ICD: $icd"
done
