; ModuleID = '/Users/jamesaddison/Documents/Codex/2026-10-09/wha/outputs/verified-language/build/filter-proof/ink_checked.o.c'
source_filename = "/Users/jamesaddison/Documents/Codex/2026-10-09/wha/outputs/verified-language/build/filter-proof/ink_checked.o.c"
target datalayout = "e-m:o-i64:64-i128:128-n32:64-S128-Fn32"
target triple = "arm64-apple-macosx15.0.0"

; Function Attrs: mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync)
define noundef i64 @lang_fn_project(i64 noundef %0, i64 noundef %1, i64 noundef %2) local_unnamed_addr #0 {
  %4 = mul i64 %1, %0
  %5 = add i64 %4, %2
  ret i64 %5
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync)
define noundef zeroext i1 @lang_fn_under(i64 noundef %0, i64 noundef %1) local_unnamed_addr #0 {
  %3 = icmp ult i64 %0, %1
  ret i1 %3
}

; Function Attrs: nofree norecurse nosync nounwind ssp memory(argmem: read) uwtable(sync)
define i64 @lang_fn_mapped_filter_sum(ptr nocapture noundef readonly %0, i64 noundef %1, i64 noundef %2, i64 noundef %3, i64 noundef %4) local_unnamed_addr #1 {
  %6 = getelementptr i8, ptr %0, i64 -8
  %7 = icmp eq i64 %1, 0
  br i1 %7, label %58, label %8

8:                                                ; preds = %5
  %9 = icmp ult i64 %1, 4
  br i1 %9, label %10, label %13

10:                                               ; preds = %53, %8
  %11 = phi i64 [ 0, %8 ], [ %56, %53 ]
  %12 = phi i64 [ %1, %8 ], [ %15, %53 ]
  br label %60

13:                                               ; preds = %8
  %14 = and i64 %1, -4
  %15 = and i64 %1, 3
  br label %16

16:                                               ; preds = %16, %13
  %17 = phi i64 [ 0, %13 ], [ %51, %16 ]
  %18 = phi i64 [ 0, %13 ], [ %47, %16 ]
  %19 = phi i64 [ 0, %13 ], [ %48, %16 ]
  %20 = phi i64 [ 0, %13 ], [ %49, %16 ]
  %21 = phi i64 [ 0, %13 ], [ %50, %16 ]
  %22 = sub i64 %1, %17
  %23 = getelementptr i64, ptr %6, i64 %22
  %24 = getelementptr i8, ptr %23, i64 -8
  %25 = getelementptr i8, ptr %23, i64 -16
  %26 = getelementptr i8, ptr %23, i64 -24
  %27 = load i64, ptr %23, align 8, !tbaa !6
  %28 = load i64, ptr %24, align 8, !tbaa !6
  %29 = load i64, ptr %25, align 8, !tbaa !6
  %30 = load i64, ptr %26, align 8, !tbaa !6
  %31 = mul i64 %27, %2
  %32 = mul i64 %28, %2
  %33 = mul i64 %29, %2
  %34 = mul i64 %30, %2
  %35 = add i64 %31, %3
  %36 = add i64 %32, %3
  %37 = add i64 %33, %3
  %38 = add i64 %34, %3
  %39 = icmp ult i64 %35, %4
  %40 = icmp ult i64 %36, %4
  %41 = icmp ult i64 %37, %4
  %42 = icmp ult i64 %38, %4
  %43 = select i1 %39, i64 %35, i64 0
  %44 = select i1 %40, i64 %36, i64 0
  %45 = select i1 %41, i64 %37, i64 0
  %46 = select i1 %42, i64 %38, i64 0
  %47 = add i64 %43, %18
  %48 = add i64 %44, %19
  %49 = add i64 %45, %20
  %50 = add i64 %46, %21
  %51 = add nuw i64 %17, 4
  %52 = icmp eq i64 %51, %14
  br i1 %52, label %53, label %16, !llvm.loop !10

53:                                               ; preds = %16
  %54 = add i64 %48, %47
  %55 = add i64 %49, %54
  %56 = add i64 %50, %55
  %57 = icmp eq i64 %14, %1
  br i1 %57, label %58, label %10

58:                                               ; preds = %60, %53, %5
  %59 = phi i64 [ 0, %5 ], [ %56, %53 ], [ %69, %60 ]
  ret i64 %59

60:                                               ; preds = %10, %60
  %61 = phi i64 [ %69, %60 ], [ %11, %10 ]
  %62 = phi i64 [ %70, %60 ], [ %12, %10 ]
  %63 = getelementptr i64, ptr %6, i64 %62
  %64 = load i64, ptr %63, align 8, !tbaa !6
  %65 = mul i64 %64, %2
  %66 = add i64 %65, %3
  %67 = icmp ult i64 %66, %4
  %68 = select i1 %67, i64 %66, i64 0
  %69 = add i64 %68, %61
  %70 = add i64 %62, -1
  %71 = icmp eq i64 %70, 0
  br i1 %71, label %58, label %60, !llvm.loop !14
}

; Function Attrs: nofree norecurse nosync nounwind ssp memory(argmem: read) uwtable(sync)
define i64 @lang_fn_filter_map_sum(ptr nocapture noundef readonly %0, i64 noundef %1, i64 noundef %2, i64 noundef %3, i64 noundef %4) local_unnamed_addr #1 {
  %6 = getelementptr i8, ptr %0, i64 -8
  %7 = icmp eq i64 %1, 0
  br i1 %7, label %58, label %8

8:                                                ; preds = %5
  %9 = icmp ult i64 %1, 4
  br i1 %9, label %10, label %13

10:                                               ; preds = %53, %8
  %11 = phi i64 [ 0, %8 ], [ %56, %53 ]
  %12 = phi i64 [ %1, %8 ], [ %15, %53 ]
  br label %60

13:                                               ; preds = %8
  %14 = and i64 %1, -4
  %15 = and i64 %1, 3
  br label %16

16:                                               ; preds = %16, %13
  %17 = phi i64 [ 0, %13 ], [ %51, %16 ]
  %18 = phi i64 [ 0, %13 ], [ %47, %16 ]
  %19 = phi i64 [ 0, %13 ], [ %48, %16 ]
  %20 = phi i64 [ 0, %13 ], [ %49, %16 ]
  %21 = phi i64 [ 0, %13 ], [ %50, %16 ]
  %22 = sub i64 %1, %17
  %23 = getelementptr i64, ptr %6, i64 %22
  %24 = getelementptr i8, ptr %23, i64 -8
  %25 = getelementptr i8, ptr %23, i64 -16
  %26 = getelementptr i8, ptr %23, i64 -24
  %27 = load i64, ptr %23, align 8, !tbaa !6
  %28 = load i64, ptr %24, align 8, !tbaa !6
  %29 = load i64, ptr %25, align 8, !tbaa !6
  %30 = load i64, ptr %26, align 8, !tbaa !6
  %31 = icmp ult i64 %27, %4
  %32 = icmp ult i64 %28, %4
  %33 = icmp ult i64 %29, %4
  %34 = icmp ult i64 %30, %4
  %35 = mul i64 %27, %2
  %36 = mul i64 %28, %2
  %37 = mul i64 %29, %2
  %38 = mul i64 %30, %2
  %39 = add i64 %35, %3
  %40 = add i64 %36, %3
  %41 = add i64 %37, %3
  %42 = add i64 %38, %3
  %43 = select i1 %31, i64 %39, i64 0
  %44 = select i1 %32, i64 %40, i64 0
  %45 = select i1 %33, i64 %41, i64 0
  %46 = select i1 %34, i64 %42, i64 0
  %47 = add i64 %43, %18
  %48 = add i64 %44, %19
  %49 = add i64 %45, %20
  %50 = add i64 %46, %21
  %51 = add nuw i64 %17, 4
  %52 = icmp eq i64 %51, %14
  br i1 %52, label %53, label %16, !llvm.loop !15

53:                                               ; preds = %16
  %54 = add i64 %48, %47
  %55 = add i64 %49, %54
  %56 = add i64 %50, %55
  %57 = icmp eq i64 %14, %1
  br i1 %57, label %58, label %10

58:                                               ; preds = %60, %53, %5
  %59 = phi i64 [ 0, %5 ], [ %56, %53 ], [ %69, %60 ]
  ret i64 %59

60:                                               ; preds = %10, %60
  %61 = phi i64 [ %69, %60 ], [ %11, %10 ]
  %62 = phi i64 [ %70, %60 ], [ %12, %10 ]
  %63 = getelementptr i64, ptr %6, i64 %62
  %64 = load i64, ptr %63, align 8, !tbaa !6
  %65 = icmp ult i64 %64, %4
  %66 = mul i64 %64, %2
  %67 = add i64 %66, %3
  %68 = select i1 %65, i64 %67, i64 0
  %69 = add i64 %68, %61
  %70 = add i64 %62, -1
  %71 = icmp eq i64 %70, 0
  br i1 %71, label %58, label %60, !llvm.loop !16
}

; Function Attrs: nofree norecurse nosync nounwind ssp memory(argmem: read) uwtable(sync)
define i64 @lang_fn_mapped_filter_count(ptr nocapture noundef readonly %0, i64 noundef %1, i64 noundef %2, i64 noundef %3, i64 noundef %4) local_unnamed_addr #1 {
  %6 = getelementptr i8, ptr %0, i64 -8
  %7 = icmp eq i64 %1, 0
  br i1 %7, label %58, label %8

8:                                                ; preds = %5
  %9 = icmp ult i64 %1, 4
  br i1 %9, label %10, label %13

10:                                               ; preds = %53, %8
  %11 = phi i64 [ 0, %8 ], [ %56, %53 ]
  %12 = phi i64 [ %1, %8 ], [ %15, %53 ]
  br label %60

13:                                               ; preds = %8
  %14 = and i64 %1, -4
  %15 = and i64 %1, 3
  br label %16

16:                                               ; preds = %16, %13
  %17 = phi i64 [ 0, %13 ], [ %51, %16 ]
  %18 = phi i64 [ 0, %13 ], [ %47, %16 ]
  %19 = phi i64 [ 0, %13 ], [ %48, %16 ]
  %20 = phi i64 [ 0, %13 ], [ %49, %16 ]
  %21 = phi i64 [ 0, %13 ], [ %50, %16 ]
  %22 = sub i64 %1, %17
  %23 = getelementptr i64, ptr %6, i64 %22
  %24 = getelementptr i8, ptr %23, i64 -8
  %25 = getelementptr i8, ptr %23, i64 -16
  %26 = getelementptr i8, ptr %23, i64 -24
  %27 = load i64, ptr %23, align 8, !tbaa !6
  %28 = load i64, ptr %24, align 8, !tbaa !6
  %29 = load i64, ptr %25, align 8, !tbaa !6
  %30 = load i64, ptr %26, align 8, !tbaa !6
  %31 = mul i64 %27, %2
  %32 = mul i64 %28, %2
  %33 = mul i64 %29, %2
  %34 = mul i64 %30, %2
  %35 = add i64 %31, %3
  %36 = add i64 %32, %3
  %37 = add i64 %33, %3
  %38 = add i64 %34, %3
  %39 = icmp ult i64 %35, %4
  %40 = icmp ult i64 %36, %4
  %41 = icmp ult i64 %37, %4
  %42 = icmp ult i64 %38, %4
  %43 = zext i1 %39 to i64
  %44 = zext i1 %40 to i64
  %45 = zext i1 %41 to i64
  %46 = zext i1 %42 to i64
  %47 = add i64 %18, %43
  %48 = add i64 %19, %44
  %49 = add i64 %20, %45
  %50 = add i64 %21, %46
  %51 = add nuw i64 %17, 4
  %52 = icmp eq i64 %51, %14
  br i1 %52, label %53, label %16, !llvm.loop !17

53:                                               ; preds = %16
  %54 = add i64 %48, %47
  %55 = add i64 %49, %54
  %56 = add i64 %50, %55
  %57 = icmp eq i64 %14, %1
  br i1 %57, label %58, label %10

58:                                               ; preds = %60, %53, %5
  %59 = phi i64 [ 0, %5 ], [ %56, %53 ], [ %69, %60 ]
  ret i64 %59

60:                                               ; preds = %10, %60
  %61 = phi i64 [ %69, %60 ], [ %11, %10 ]
  %62 = phi i64 [ %70, %60 ], [ %12, %10 ]
  %63 = getelementptr i64, ptr %6, i64 %62
  %64 = load i64, ptr %63, align 8, !tbaa !6
  %65 = mul i64 %64, %2
  %66 = add i64 %65, %3
  %67 = icmp ult i64 %66, %4
  %68 = zext i1 %67 to i64
  %69 = add i64 %61, %68
  %70 = add i64 %62, -1
  %71 = icmp eq i64 %70, 0
  br i1 %71, label %58, label %60, !llvm.loop !18
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync)
define noundef i64 @lang_fn_constant_filter_sum(ptr nocapture noundef readnone %0, i64 noundef %1, i64 noundef %2, i64 noundef %3, i64 noundef %4) local_unnamed_addr #0 {
  %6 = icmp ult i64 %3, %4
  %7 = select i1 %6, i64 %3, i64 0
  %8 = mul i64 %7, %1
  ret i64 %8
}

attributes #0 = { mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync) "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-m3" "target-features"="+aes,+bf16,+bti,+ccidx,+complxnum,+crc,+dit,+dotprod,+flagm,+fp-armv8,+fp16fml,+fpac,+fullfp16,+hcx,+i8mm,+jsconv,+lse,+neon,+pauth,+perfmon,+predres,+ras,+rcpc,+rdm,+sb,+sha2,+sha3,+ssbs,+v8.1a,+v8.2a,+v8.3a,+v8.4a,+v8.5a,+v8.6a,+v8a,+zcm,+zcz" }
attributes #1 = { nofree norecurse nosync nounwind ssp memory(argmem: read) uwtable(sync) "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-m3" "target-features"="+aes,+bf16,+bti,+ccidx,+complxnum,+crc,+dit,+dotprod,+flagm,+fp-armv8,+fp16fml,+fpac,+fullfp16,+hcx,+i8mm,+jsconv,+lse,+neon,+pauth,+perfmon,+predres,+ras,+rcpc,+rdm,+sb,+sha2,+sha3,+ssbs,+v8.1a,+v8.2a,+v8.3a,+v8.4a,+v8.5a,+v8.6a,+v8a,+zcm,+zcz" }

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
