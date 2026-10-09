; ModuleID = '/Users/jamesaddison/Documents/Codex/2026-10-09/wha/outputs/verified-language/build/collection-proof/lang_checked.o.c'
source_filename = "/Users/jamesaddison/Documents/Codex/2026-10-09/wha/outputs/verified-language/build/collection-proof/lang_checked.o.c"
target datalayout = "e-m:o-i64:64-i128:128-n32:64-S128-Fn32"
target triple = "arm64-apple-macosx15.0.0"

; Function Attrs: nofree norecurse nosync nounwind ssp memory(argmem: read) uwtable(sync)
define i64 @lang_fn_two_maps(ptr nocapture noundef readonly %0, i64 noundef %1, i64 noundef %2, i64 noundef %3) local_unnamed_addr #0 {
  %5 = getelementptr i8, ptr %0, i64 -8
  %6 = icmp eq i64 %1, 0
  br i1 %6, label %49, label %7

7:                                                ; preds = %4
  %8 = icmp ult i64 %1, 4
  br i1 %8, label %9, label %12

9:                                                ; preds = %44, %7
  %10 = phi i64 [ 0, %7 ], [ %47, %44 ]
  %11 = phi i64 [ %1, %7 ], [ %14, %44 ]
  br label %51

12:                                               ; preds = %7
  %13 = and i64 %1, -4
  %14 = and i64 %1, 3
  br label %15

15:                                               ; preds = %15, %12
  %16 = phi i64 [ 0, %12 ], [ %42, %15 ]
  %17 = phi i64 [ 0, %12 ], [ %38, %15 ]
  %18 = phi i64 [ 0, %12 ], [ %39, %15 ]
  %19 = phi i64 [ 0, %12 ], [ %40, %15 ]
  %20 = phi i64 [ 0, %12 ], [ %41, %15 ]
  %21 = sub i64 %1, %16
  %22 = getelementptr i64, ptr %5, i64 %21
  %23 = getelementptr i8, ptr %22, i64 -8
  %24 = getelementptr i8, ptr %22, i64 -16
  %25 = getelementptr i8, ptr %22, i64 -24
  %26 = load i64, ptr %22, align 8, !tbaa !6
  %27 = load i64, ptr %23, align 8, !tbaa !6
  %28 = load i64, ptr %24, align 8, !tbaa !6
  %29 = load i64, ptr %25, align 8, !tbaa !6
  %30 = mul i64 %26, %2
  %31 = mul i64 %27, %2
  %32 = mul i64 %28, %2
  %33 = mul i64 %29, %2
  %34 = add i64 %17, %3
  %35 = add i64 %18, %3
  %36 = add i64 %19, %3
  %37 = add i64 %20, %3
  %38 = add i64 %34, %30
  %39 = add i64 %35, %31
  %40 = add i64 %36, %32
  %41 = add i64 %37, %33
  %42 = add nuw i64 %16, 4
  %43 = icmp eq i64 %42, %13
  br i1 %43, label %44, label %15, !llvm.loop !10

44:                                               ; preds = %15
  %45 = add i64 %39, %38
  %46 = add i64 %40, %45
  %47 = add i64 %41, %46
  %48 = icmp eq i64 %13, %1
  br i1 %48, label %49, label %9

49:                                               ; preds = %51, %44, %4
  %50 = phi i64 [ 0, %4 ], [ %47, %44 ], [ %58, %51 ]
  ret i64 %50

51:                                               ; preds = %9, %51
  %52 = phi i64 [ %58, %51 ], [ %10, %9 ]
  %53 = phi i64 [ %59, %51 ], [ %11, %9 ]
  %54 = getelementptr i64, ptr %5, i64 %53
  %55 = load i64, ptr %54, align 8, !tbaa !6
  %56 = mul i64 %55, %2
  %57 = add i64 %52, %3
  %58 = add i64 %57, %56
  %59 = add i64 %53, -1
  %60 = icmp eq i64 %59, 0
  br i1 %60, label %49, label %51, !llvm.loop !14
}

; Function Attrs: nofree norecurse nosync nounwind ssp memory(argmem: read) uwtable(sync)
define i64 @lang_fn_three_maps(ptr nocapture noundef readonly %0, i64 noundef %1, i64 noundef %2, i64 noundef %3) local_unnamed_addr #0 {
  %5 = getelementptr i8, ptr %0, i64 -8
  %6 = icmp eq i64 %1, 0
  br i1 %6, label %45, label %7

7:                                                ; preds = %4
  %8 = icmp ult i64 %1, 4
  br i1 %8, label %9, label %12

9:                                                ; preds = %40, %7
  %10 = phi i64 [ 0, %7 ], [ %43, %40 ]
  %11 = phi i64 [ %1, %7 ], [ %14, %40 ]
  br label %47

12:                                               ; preds = %7
  %13 = and i64 %1, -4
  %14 = and i64 %1, 3
  br label %15

15:                                               ; preds = %15, %12
  %16 = phi i64 [ 0, %12 ], [ %38, %15 ]
  %17 = phi i64 [ 0, %12 ], [ %34, %15 ]
  %18 = phi i64 [ 0, %12 ], [ %35, %15 ]
  %19 = phi i64 [ 0, %12 ], [ %36, %15 ]
  %20 = phi i64 [ 0, %12 ], [ %37, %15 ]
  %21 = sub i64 %1, %16
  %22 = getelementptr i64, ptr %5, i64 %21
  %23 = getelementptr i8, ptr %22, i64 -8
  %24 = getelementptr i8, ptr %22, i64 -16
  %25 = getelementptr i8, ptr %22, i64 -24
  %26 = load i64, ptr %22, align 8, !tbaa !6
  %27 = load i64, ptr %23, align 8, !tbaa !6
  %28 = load i64, ptr %24, align 8, !tbaa !6
  %29 = load i64, ptr %25, align 8, !tbaa !6
  %30 = mul i64 %26, %2
  %31 = mul i64 %27, %2
  %32 = mul i64 %28, %2
  %33 = mul i64 %29, %2
  %34 = add i64 %30, %17
  %35 = add i64 %31, %18
  %36 = add i64 %32, %19
  %37 = add i64 %33, %20
  %38 = add nuw i64 %16, 4
  %39 = icmp eq i64 %38, %13
  br i1 %39, label %40, label %15, !llvm.loop !15

40:                                               ; preds = %15
  %41 = add i64 %35, %34
  %42 = add i64 %36, %41
  %43 = add i64 %37, %42
  %44 = icmp eq i64 %13, %1
  br i1 %44, label %45, label %9

45:                                               ; preds = %47, %40, %4
  %46 = phi i64 [ 0, %4 ], [ %43, %40 ], [ %53, %47 ]
  ret i64 %46

47:                                               ; preds = %9, %47
  %48 = phi i64 [ %53, %47 ], [ %10, %9 ]
  %49 = phi i64 [ %54, %47 ], [ %11, %9 ]
  %50 = getelementptr i64, ptr %5, i64 %49
  %51 = load i64, ptr %50, align 8, !tbaa !6
  %52 = mul i64 %51, %2
  %53 = add i64 %52, %48
  %54 = add i64 %49, -1
  %55 = icmp eq i64 %54, 0
  br i1 %55, label %45, label %47, !llvm.loop !16
}

; Function Attrs: nofree norecurse nosync nounwind ssp memory(argmem: read) uwtable(sync)
define i64 @lang_fn_shadow_maps(ptr nocapture noundef readonly %0, i64 noundef %1, i64 noundef %2, i64 noundef %3) local_unnamed_addr #0 {
  %5 = getelementptr i8, ptr %0, i64 -8
  %6 = icmp eq i64 %1, 0
  br i1 %6, label %49, label %7

7:                                                ; preds = %4
  %8 = icmp ult i64 %1, 4
  br i1 %8, label %9, label %12

9:                                                ; preds = %44, %7
  %10 = phi i64 [ 0, %7 ], [ %47, %44 ]
  %11 = phi i64 [ %1, %7 ], [ %14, %44 ]
  br label %51

12:                                               ; preds = %7
  %13 = and i64 %1, -4
  %14 = and i64 %1, 3
  br label %15

15:                                               ; preds = %15, %12
  %16 = phi i64 [ 0, %12 ], [ %42, %15 ]
  %17 = phi i64 [ 0, %12 ], [ %38, %15 ]
  %18 = phi i64 [ 0, %12 ], [ %39, %15 ]
  %19 = phi i64 [ 0, %12 ], [ %40, %15 ]
  %20 = phi i64 [ 0, %12 ], [ %41, %15 ]
  %21 = sub i64 %1, %16
  %22 = getelementptr i64, ptr %5, i64 %21
  %23 = getelementptr i8, ptr %22, i64 -8
  %24 = getelementptr i8, ptr %22, i64 -16
  %25 = getelementptr i8, ptr %22, i64 -24
  %26 = load i64, ptr %22, align 8, !tbaa !6
  %27 = load i64, ptr %23, align 8, !tbaa !6
  %28 = load i64, ptr %24, align 8, !tbaa !6
  %29 = load i64, ptr %25, align 8, !tbaa !6
  %30 = add i64 %26, %3
  %31 = add i64 %27, %3
  %32 = add i64 %28, %3
  %33 = add i64 %29, %3
  %34 = mul i64 %30, %2
  %35 = mul i64 %31, %2
  %36 = mul i64 %32, %2
  %37 = mul i64 %33, %2
  %38 = add i64 %34, %17
  %39 = add i64 %35, %18
  %40 = add i64 %36, %19
  %41 = add i64 %37, %20
  %42 = add nuw i64 %16, 4
  %43 = icmp eq i64 %42, %13
  br i1 %43, label %44, label %15, !llvm.loop !17

44:                                               ; preds = %15
  %45 = add i64 %39, %38
  %46 = add i64 %40, %45
  %47 = add i64 %41, %46
  %48 = icmp eq i64 %13, %1
  br i1 %48, label %49, label %9

49:                                               ; preds = %51, %44, %4
  %50 = phi i64 [ 0, %4 ], [ %47, %44 ], [ %58, %51 ]
  ret i64 %50

51:                                               ; preds = %9, %51
  %52 = phi i64 [ %58, %51 ], [ %10, %9 ]
  %53 = phi i64 [ %59, %51 ], [ %11, %9 ]
  %54 = getelementptr i64, ptr %5, i64 %53
  %55 = load i64, ptr %54, align 8, !tbaa !6
  %56 = add i64 %55, %3
  %57 = mul i64 %56, %2
  %58 = add i64 %57, %52
  %59 = add i64 %53, -1
  %60 = icmp eq i64 %59, 0
  br i1 %60, label %49, label %51, !llvm.loop !18
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync)
define noundef i64 @lang_fn_mapped_count(ptr nocapture noundef readnone %0, i64 noundef returned %1, i64 noundef %2, i64 noundef %3) local_unnamed_addr #1 {
  ret i64 %1
}

attributes #0 = { nofree norecurse nosync nounwind ssp memory(argmem: read) uwtable(sync) "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-m3" "target-features"="+aes,+bf16,+bti,+ccidx,+complxnum,+crc,+dit,+dotprod,+flagm,+fp-armv8,+fp16fml,+fpac,+fullfp16,+hcx,+i8mm,+jsconv,+lse,+neon,+pauth,+perfmon,+predres,+ras,+rcpc,+rdm,+sb,+sha2,+sha3,+ssbs,+v8.1a,+v8.2a,+v8.3a,+v8.4a,+v8.5a,+v8.6a,+v8a,+zcm,+zcz" }
attributes #1 = { mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync) "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-m3" "target-features"="+aes,+bf16,+bti,+ccidx,+complxnum,+crc,+dit,+dotprod,+flagm,+fp-armv8,+fp16fml,+fpac,+fullfp16,+hcx,+i8mm,+jsconv,+lse,+neon,+pauth,+perfmon,+predres,+ras,+rcpc,+rdm,+sb,+sha2,+sha3,+ssbs,+v8.1a,+v8.2a,+v8.3a,+v8.4a,+v8.5a,+v8.6a,+v8a,+zcm,+zcz" }

!llvm.module.flags = !{!0, !1, !2, !3, !4}
!llvm.ident = !{!5}

!0 = !{i32 2, !"SDK Version", [2 x i32] [i32 26, i32 2]}
!1 = !{i32 1, !"wchar_size", i32 4}
!2 = !{i32 8, !"PIC Level", i32 2}
!3 = !{i32 7, !"uwtable", i32 1}
!4 = !{i32 7, !"frame-pointer", i32 1}
!5 = !{!"Apple clang version 17.0.0 (clang-1700.6.3.2)"}
!6 = !{!7, !7, i64 0}
!7 = !{!"long long", !8, i64 0}
!8 = !{!"omnipotent char", !9, i64 0}
!9 = !{!"Simple C/C++ TBAA"}
!10 = distinct !{!10, !11, !12, !13}
!11 = !{!"llvm.loop.mustprogress"}
!12 = !{!"llvm.loop.isvectorized", i32 1}
!13 = !{!"llvm.loop.unroll.runtime.disable"}
!14 = distinct !{!14, !11, !12}
!15 = distinct !{!15, !11, !12, !13}
!16 = distinct !{!16, !11, !12}
!17 = distinct !{!17, !11, !12, !13}
!18 = distinct !{!18, !11, !12}
