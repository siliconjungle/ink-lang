; ModuleID = 'baseline.51bb3f60e43ae751-cgu.0'
source_filename = "baseline.51bb3f60e43ae751-cgu.0"
target datalayout = "e-m:o-p270:32:32-p271:32:32-p272:64:64-i64:64-i128:128-n32:64-S128-Fn32"
target triple = "arm64-apple-macosx11.0.0"

@lang_fn_subtract_self = unnamed_addr alias i64 (i64), ptr @lang_fn_multiply_zero
@lang_fn_unsigned_reflexive = unnamed_addr alias i1 (i64), ptr @lang_fn_unsigned_maximum

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none)
define noundef i64 @lang_fn_add_commute(i64 noundef %x, i64 noundef %y) unnamed_addr #0 !guid !3 {
start:
  %_0 = add i64 %y, %x
  ret i64 %_0
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none)
define noundef i64 @lang_fn_add_zero(i64 noundef returned %x) unnamed_addr #0 !guid !4 {
start:
  ret i64 %x
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none)
define noundef i64 @lang_fn_cancel_add(i64 noundef returned %x, i64 noundef %y) unnamed_addr #0 !guid !5 {
start:
  ret i64 %x
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none)
define noundef i64 @lang_fn_choose_equal(i64 noundef returned %x, i1 noundef zeroext %b) unnamed_addr #0 !guid !6 {
start:
  ret i64 %x
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none)
define noundef i64 @lang_fn_multiply_zero(i64 noundef %x) unnamed_addr #0 !guid !7 {
start:
  ret i64 0
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none)
define noundef zeroext i1 @lang_fn_unsigned_maximum(i64 noundef %x) unnamed_addr #0 !guid !8 {
start:
  ret i1 true
}

attributes #0 = { mustprogress nofree norecurse nosync nounwind willreturn memory(none) "frame-pointer"="non-leaf" "probe-stack"="inline-asm" "target-cpu"="apple-m4" }

!llvm.module.flags = !{!0, !1}
!llvm.ident = !{!2}

!0 = !{i32 8, !"PIC Level", i32 2}
!1 = !{i32 7, !"frame-pointer", i32 1}
!2 = !{!"rustc version 1.99.0 (b940084d7 2026-09-28)"}
!3 = !{i64 -3402614841203792532}
!4 = !{i64 -4338163536747885274}
!5 = !{i64 -1491210564143599202}
!6 = !{i64 -2074800191585095866}
!7 = !{i64 -5639323756443749981}
!8 = !{i64 -2078037096804708009}
