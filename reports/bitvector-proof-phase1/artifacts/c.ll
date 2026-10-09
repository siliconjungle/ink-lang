; ModuleID = 'bench/arithmetic/baseline.c'
source_filename = "bench/arithmetic/baseline.c"
target datalayout = "e-m:o-i64:64-i128:128-n32:64-S128-Fn32"
target triple = "arm64-apple-macosx15.0.0"

; Function Attrs: mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync)
define noundef i64 @lang_fn_add_zero(i64 noundef returned %0) local_unnamed_addr #0 {
  ret i64 %0
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync)
define noundef i64 @lang_fn_subtract_self(i64 noundef %0) local_unnamed_addr #0 {
  ret i64 0
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync)
define noundef i64 @lang_fn_add_commute(i64 noundef %0, i64 noundef %1) local_unnamed_addr #0 {
  %3 = add i64 %1, %0
  ret i64 %3
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync)
define noundef i64 @lang_fn_cancel_add(i64 noundef returned %0, i64 noundef %1) local_unnamed_addr #0 {
  ret i64 %0
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync)
define noundef i64 @lang_fn_multiply_zero(i64 noundef %0) local_unnamed_addr #0 {
  ret i64 0
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync)
define noundef zeroext i1 @lang_fn_unsigned_reflexive(i64 noundef %0) local_unnamed_addr #0 {
  ret i1 true
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync)
define noundef zeroext i1 @lang_fn_unsigned_maximum(i64 noundef %0) local_unnamed_addr #0 {
  ret i1 true
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync)
define noundef i64 @lang_fn_choose_equal(i64 noundef returned %0, i1 noundef zeroext %1) local_unnamed_addr #0 {
  ret i64 %0
}

attributes #0 = { mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync) "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-m3" "target-features"="+aes,+bf16,+bti,+ccidx,+complxnum,+crc,+dit,+dotprod,+flagm,+fp-armv8,+fp16fml,+fpac,+fullfp16,+hcx,+i8mm,+jsconv,+lse,+neon,+pauth,+perfmon,+predres,+ras,+rcpc,+rdm,+sb,+sha2,+sha3,+ssbs,+v8.1a,+v8.2a,+v8.3a,+v8.4a,+v8.5a,+v8.6a,+v8a,+zcm,+zcz" }

!llvm.module.flags = !{!0, !1, !2, !3, !4}
!llvm.ident = !{!5}

!0 = !{i32 2, !"SDK Version", [2 x i32] [i32 26, i32 2]}
!1 = !{i32 1, !"wchar_size", i32 4}
!2 = !{i32 8, !"PIC Level", i32 2}
!3 = !{i32 7, !"uwtable", i32 1}
!4 = !{i32 7, !"frame-pointer", i32 1}
!5 = !{!"Apple clang version 17.0.0 (clang-1700.6.3.2)"}
