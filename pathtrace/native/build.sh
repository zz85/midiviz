#!/usr/bin/env bash
# Builds native-bench: native MuTracer (Rust, wgpu) rendering the frame the desktop app exports.
#   ./build.sh     then     target/release/native-bench <export dir> [samples] [bounces] [WxH] [software|hardware|both]
# Needs git, Node 24+, stable Rust and a C++ compiler. macOS: Xcode 26 selected with xcode-select.
# Windows: run it from Git Bash inside a Visual Studio developer shell (MuTracer's MSVC setup).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
tag="${MUTRACER_TAG:-v0.3.0}"   # the version vendor/mutracer holds for the browser
src="$here/mutracer"
out="$here/.build"
mkdir -p "$out"

if [ ! -d "$src/.git" ]; then
  git clone -q --depth 1 --branch "$tag" https://github.com/pissang/mutracer "$src"
fi
git -C "$src" fetch -q --depth 1 origin "refs/tags/$tag:refs/tags/$tag" 2>/dev/null || true
git -C "$src" -c advice.detachedHead=false checkout -q "$tag"
echo "MuTracer $tag ($(git -C "$src" rev-parse --short HEAD))"

(cd "$src" && npm ci --no-audit --no-fund --loglevel=error)
(cd "$src" && npm ci --prefix native/toolchain --include=optional --no-audit --no-fund --loglevel=error)

# Linux on ARM64: MuTracer's toolchain lists no scriptc for it, though npm has one, and the
# denoiser crate (oidn-webgpu-native) ships no prebuilt core for it, so it is built from source.
cargo_config=()
if [ "$(uname -s)" = Linux ] && [ "$(uname -m)" = aarch64 ]; then
  arm="process.platform==='linux'\&\&process.arch==='arm64'?'linux-arm64-gnu':"
  grep -q linux-arm64-gnu "$src/native/toolchain/compiler.mjs" ||
    sed -i "s#process.platform==='linux'&&process.arch==='x64'?'linux-x64-gnu':#&$arm#" "$src/native/toolchain/compiler.mjs"
  v=$(node -p "require('$src/native/toolchain/package.json').optionalDependencies['@scriptc/cli-linux-x64-gnu']")
  [ -d "$src/native/toolchain/node_modules/@scriptc/cli-linux-arm64-gnu" ] ||
    (cd "$src/native/toolchain" && npm i --no-save --no-audit --no-fund --loglevel=error "@scriptc/cli-linux-arm64-gnu@$v")
  if [ ! -f "$out/oidn/liboidn_webgpu_core.a" ]; then
    (cd "$here" && cargo fetch -q)
    crate=$(ls -d "${CARGO_HOME:-$HOME/.cargo}"/registry/src/*/oidn-webgpu-native-0.2.0 | head -1)
    commit=$(node -p "require('$crate/prebuilt/manifest.json').source_commit")
    [ -d "$out/oidn-src/.git" ] || git clone -q https://github.com/pissang/oidn-webgpu "$out/oidn-src"
    git -C "$out/oidn-src" -c advice.detachedHead=false checkout -q "$commit"
    oc="$out/oidn-src/native/toolchain/compiler.mjs"
    grep -q linux-arm64-gnu "$oc" || node -e "
      const fs=require('fs'),p='$oc';let s=fs.readFileSync(p,'utf8')
      s=s.replace(\"? 'linux-x64-gnu'\",\"? 'linux-x64-gnu'\n  : process.platform === 'linux' && process.arch === 'arm64'\n    ? 'linux-arm64-gnu'\");fs.writeFileSync(p,s)"
    ov=$(node -p "require('$out/oidn-src/native/toolchain/package.json').optionalDependencies['@scriptc/cli-linux-x64-gnu']")
    (cd "$out/oidn-src/native/toolchain" && npm i --no-save --no-audit --no-fund --loglevel=error "@scriptc/cli-linux-arm64-gnu@$ov")
    (cd "$out/oidn-src" && OIDN_WEBGPU_SCRIPTC="$(node native/toolchain/compiler.mjs)" node scripts/native-core-build.mjs --output "$out/oidn/liboidn_webgpu_core.a")
  fi
  export OIDN_WEBGPU_CORE_ARCHIVE="$out/oidn/liboidn_webgpu_core.a"
  cargo_config=(--config "patch.crates-io.oidn-webgpu-native.path=\"$out/oidn-src/native\"")
fi

# The render core: MuTracer's TypeScript compiled ahead of time to a static library.
export MUTRACER_SCRIPTC="$(cd "$src" && node native/toolchain/compiler.mjs)"
archive="$out/render-core.lib.a"; case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) archive="$out/render-core.lib";; esac
if [ ! -f "$archive" ] || [ "$archive" -ot "$src/.git/HEAD" ]; then
  echo "compiling the render core (a few minutes)..."
  (cd "$src" && node --input-type=module -e "
    import {spawnCompiler} from './native/scripts/compiler.mjs'
    import {prepareTinyBvh} from './scripts/fetch-tinybvh.mjs'
    import {nativeToolchainEnv} from './native/scripts/platform.mjs'
    await prepareTinyBvh()
    const r = spawnCompiler(process.env.MUTRACER_SCRIPTC, ['build', '--lib', '--profile', 'native/src/render-core-profile.json', '-o', '$archive'],
      { cwd: process.cwd(), env: nativeToolchainEnv(), encoding: 'utf8', maxBuffer: 64 << 20 })
    if (r.status !== 0) { console.error(r.stderr || r.stdout || r.error); process.exit(1) }")
fi
export MUTRACER_AOT_ARCHIVE="$archive"

(cd "$here" && cargo build --release ${cargo_config[@]+"${cargo_config[@]}"})
echo "built $here/target/release/native-bench"
