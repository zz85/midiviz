#!/usr/bin/env bash
# Renders the frame the desktop app exports with ThreeRT (meshy-dev/ThreeRT, Rust on wgpu), with its own BVH and
# with hardware ray queries, and writes the images and one JSON line of timings for each run.
#   ./threert.sh <export dir> [samples] [bounces] [sizes...]
#   ./threert.sh ~/pt_export 4 10 1280x720 3840x2160
# Needs git, Node 24 or later and stable Rust. Results go to <export dir>/threert/.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
export_dir="$(cd "${1:?usage: threert.sh <export dir> [samples] [bounces] [sizes...]}" && pwd)"
spp="${2:-4}"; bounces="${3:-10}"; shift $(( $# < 3 ? $# : 3 ))
sizes=("$@"); [ ${#sizes[@]} -gt 0 ] || sizes=(1280x720 3840x2160)
commit="${THREERT_COMMIT:-8964dc407c4412a6f717c3ac7805ed791becdd9d}"   # the commit tested on lavapipe (14 Nov 2026)
src="$here/threert-src"
out="$export_dir/threert"
for f in scene.glb scene.json; do [ -f "$export_dir/$f" ] || { echo "no $f in $export_dir: run node run.mjs --export in pathtrace/desktop first" >&2; exit 2; }; done
mkdir -p "$out"

if [ ! -d "$src/.git" ]; then git clone -q https://github.com/meshy-dev/ThreeRT "$src"; fi
git -C "$src" fetch -q origin "$commit" 2>/dev/null || git -C "$src" fetch -q origin
git -C "$src" -c advice.detachedHead=false checkout -q "$commit"
echo "ThreeRT $(git -C "$src" rev-parse --short HEAD)"
(cd "$src" && npm ci --no-audit --no-fund --loglevel=error)
# (--no-default-features leaves out the network client, which a local render doesn't use)
(cd "$src/renderer" && cargo build --release --no-default-features)
bin="$src/renderer/target/release/threert-render"; [ -x "$bin" ] || bin="$bin.exe"

cp "$here/threert/midiviz-pianist.ts" "$src/scenes/midiviz-pianist.ts"
cp "$export_dir/scene.json" "$src/scenes/midiviz-pianist.json"
(cd "$src" && node -e "import('./tools/bundle-game.ts').then(m => m.bundleGame('scenes/midiviz-pianist.ts', 'out/bundles/midiviz-pianist.js'))")

"$bin" info | tee "$out/info.json"
# A first render compiles the shaders (ThreeRT caches the pipelines afterwards) inside its trace time, so each
# backend renders once, small, before the timed runs.
for hwrt in 0 1; do
  THREERT_HWRT=$hwrt "$bin" render "$src/out/bundles/midiviz-pianist.js" --assets "$export_dir" -o "$out/warmup.png" \
    --spp 1 --width 320 --height 180 --no-denoise > /dev/null 2>&1 || true
done
rm -f "$out/warmup.png"
: > "$out/results.jsonl"
for size in "${sizes[@]}"; do
  w="${size%x*}"; h="${size#*x}"
  for hwrt in 0 1; do
    name="hwrt${hwrt}_${size}_${spp}spp"
    echo "== $size, ${spp} spp, $bounces bounces, $([ $hwrt = 1 ] && echo 'ray queries' || echo 'software BVH')"
    if THREERT_HWRT=$hwrt "$bin" render "$src/out/bundles/midiviz-pianist.js" --assets "$export_dir" -o "$out/$name.png" \
        --spp "$spp" --width "$w" --height "$h" --no-denoise --override "{\"native\":{\"maxBounces\":$bounces}}" > "$out/$name.log" 2>&1; then
      tail -1 "$out/$name.log" | tee -a "$out/results.jsonl" | node -e "
        const r = JSON.parse(require('fs').readFileSync(0, 'utf8'))
        console.log('   ' + r.adapter + ' · ray queries ' + r.hwrt + ' · trace ' + (r.timings_ms.trace_ms / 1000).toFixed(1) + ' s · total ' + (r.timings_ms.total_ms / 1000).toFixed(1) + ' s')"
    else
      echo "   failed: $(tail -1 "$out/$name.log")"
    fi
  done
done
echo "results in $out"
