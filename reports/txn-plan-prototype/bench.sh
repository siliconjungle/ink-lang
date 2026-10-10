#!/bin/bash
# usage: bench.sh REPO OUTDIR [emit-flags...]  -> builds language (+bounded) and rust baseline, links driver
set -e
REPO=$1; OUT=$2; shift 2
mkdir -p $OUT
cd $REPO; BIN=${INK_BIN:-./target/release/ink}
$BIN prove-maintenance knowledge/sum-maintenance.lang -o $OUT/maintenance.json >/dev/null 2>&1 || cp knowledge/exact-maintenance/canonical.json $OUT/maintenance.json
for variant in language language_bounded; do
  extra=""; feat=""
  if [ $variant = language_bounded ]; then extra="--bounded-totals"; feat="--features bounded-abi"; fi
  rm -rf $OUT/$variant; $BIN emit-state examples/state-benchmark.lang -o $OUT/$variant --maintenance $OUT/maintenance.json $extra >/dev/null
  cat bench/state/generated_abi.rs >> $OUT/$variant/src/lib.rs
  sed -i 's/crate-type = \["rlib", "cdylib"\]/crate-type = ["staticlib"]/; s/lto = "thin"/lto = false/' $OUT/$variant/Cargo.toml
  printf '\n[features]\nbounded-abi=[]\n' >> $OUT/$variant/Cargo.toml
  (cd $OUT/$variant && RUSTFLAGS='-C target-cpu=native -C panic=abort' CARGO_TARGET_DIR=$OUT/target-$variant cargo build -q --release --offline --lib $feat)
  clang -O3 -std=c11 -c bench/state/driver.c -o $OUT/driver.o -I bench/state
  clang $OUT/driver.o $OUT/target-$variant/release/libcompiled_state.a -o $OUT/$variant.bin -lpthread -ldl -lm
done
if [ ! -f $OUT/rust_tree.bin ]; then
  mkdir -p $OUT/rb/src; cp bench/state/baseline.rs $OUT/rb/src/lib.rs
  printf '[package]\nname="baseline-state"\nversion="0.1.0"\nedition="2021"\n[lib]\ncrate-type=["staticlib"]\n[features]\nbigint=[]\n[dependencies]\nnum-bigint="=0.4.8"\n[profile.release]\nlto=false\ncodegen-units=1\npanic="abort"\n' > $OUT/rb/Cargo.toml
  (cd $OUT/rb && RUSTFLAGS='-C target-cpu=native' CARGO_TARGET_DIR=$OUT/target-rb cargo build -q --release --offline)
  clang $OUT/driver.o $OUT/target-rb/release/libbaseline_state.a -o $OUT/rust_tree.bin -lpthread -ldl -lm
fi
echo built
