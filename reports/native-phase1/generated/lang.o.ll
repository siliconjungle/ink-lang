; ModuleID = '/Users/jamesaddison/Documents/Codex/2026-10-09/wha/outputs/verified-language/build/bench/lang.o.c'
source_filename = "/Users/jamesaddison/Documents/Codex/2026-10-09/wha/outputs/verified-language/build/bench/lang.o.c"
target datalayout = "e-m:o-i64:64-i128:128-n32:64-S128-Fn32"
target triple = "arm64-apple-macosx15.0.0"

; Function Attrs: nofree norecurse nosync nounwind ssp memory(argmem: read) uwtable(sync)
define i64 @lang_fn_sum_values(ptr nocapture noundef readonly %0, i64 noundef %1) local_unnamed_addr #0 {
  %3 = icmp eq i64 %1, 0
  br i1 %3, label %37, label %4

4:                                                ; preds = %2
  %5 = icmp ult i64 %1, 8
  br i1 %5, label %6, label %9

6:                                                ; preds = %31, %4
  %7 = phi i64 [ 0, %4 ], [ %35, %31 ]
  %8 = phi i64 [ 0, %4 ], [ %10, %31 ]
  br label %39

9:                                                ; preds = %4
  %10 = and i64 %1, -8
  br label %11

11:                                               ; preds = %11, %9
  %12 = phi i64 [ 0, %9 ], [ %29, %11 ]
  %13 = phi <2 x i64> [ zeroinitializer, %9 ], [ %25, %11 ]
  %14 = phi <2 x i64> [ zeroinitializer, %9 ], [ %26, %11 ]
  %15 = phi <2 x i64> [ zeroinitializer, %9 ], [ %27, %11 ]
  %16 = phi <2 x i64> [ zeroinitializer, %9 ], [ %28, %11 ]
  %17 = getelementptr inbounds i64, ptr %0, i64 %12
  %18 = getelementptr inbounds i8, ptr %17, i64 16
  %19 = getelementptr inbounds i8, ptr %17, i64 32
  %20 = getelementptr inbounds i8, ptr %17, i64 48
  %21 = load <2 x i64>, ptr %17, align 8, !tbaa !6
  %22 = load <2 x i64>, ptr %18, align 8, !tbaa !6
  %23 = load <2 x i64>, ptr %19, align 8, !tbaa !6
  %24 = load <2 x i64>, ptr %20, align 8, !tbaa !6
  %25 = add <2 x i64> %21, %13
  %26 = add <2 x i64> %22, %14
  %27 = add <2 x i64> %23, %15
  %28 = add <2 x i64> %24, %16
  %29 = add nuw i64 %12, 8
  %30 = icmp eq i64 %29, %10
  br i1 %30, label %31, label %11, !llvm.loop !10

31:                                               ; preds = %11
  %32 = add <2 x i64> %26, %25
  %33 = add <2 x i64> %27, %32
  %34 = add <2 x i64> %28, %33
  %35 = tail call i64 @llvm.vector.reduce.add.v2i64(<2 x i64> %34)
  %36 = icmp eq i64 %10, %1
  br i1 %36, label %37, label %6

37:                                               ; preds = %39, %31, %2
  %38 = phi i64 [ 0, %2 ], [ %35, %31 ], [ %44, %39 ]
  ret i64 %38

39:                                               ; preds = %6, %39
  %40 = phi i64 [ %44, %39 ], [ %7, %6 ]
  %41 = phi i64 [ %45, %39 ], [ %8, %6 ]
  %42 = getelementptr inbounds i64, ptr %0, i64 %41
  %43 = load i64, ptr %42, align 8, !tbaa !6
  %44 = add i64 %43, %40
  %45 = add nuw i64 %41, 1
  %46 = icmp eq i64 %45, %1
  br i1 %46, label %37, label %39, !llvm.loop !14
}

; Function Attrs: nofree norecurse nosync nounwind ssp memory(argmem: read) uwtable(sync)
define i64 @lang_fn_affine(ptr nocapture noundef readonly %0, i64 noundef %1, i64 noundef %2, i64 noundef %3) local_unnamed_addr #0 {
  %5 = icmp eq i64 %1, 0
  br i1 %5, label %49, label %6

6:                                                ; preds = %4
  %7 = icmp ult i64 %1, 4
  br i1 %7, label %8, label %11

8:                                                ; preds = %44, %6
  %9 = phi i64 [ 0, %6 ], [ %47, %44 ]
  %10 = phi i64 [ 0, %6 ], [ %12, %44 ]
  br label %51

11:                                               ; preds = %6
  %12 = and i64 %1, -4
  br label %13

13:                                               ; preds = %13, %11
  %14 = phi i64 [ 0, %11 ], [ %42, %13 ]
  %15 = phi i64 [ 0, %11 ], [ %38, %13 ]
  %16 = phi i64 [ 0, %11 ], [ %39, %13 ]
  %17 = phi i64 [ 0, %11 ], [ %40, %13 ]
  %18 = phi i64 [ 0, %11 ], [ %41, %13 ]
  %19 = or disjoint i64 %14, 1
  %20 = or disjoint i64 %14, 2
  %21 = or disjoint i64 %14, 3
  %22 = getelementptr inbounds i64, ptr %0, i64 %14
  %23 = getelementptr inbounds i64, ptr %0, i64 %19
  %24 = getelementptr inbounds i64, ptr %0, i64 %20
  %25 = getelementptr inbounds i64, ptr %0, i64 %21
  %26 = load i64, ptr %22, align 8, !tbaa !6
  %27 = load i64, ptr %23, align 8, !tbaa !6
  %28 = load i64, ptr %24, align 8, !tbaa !6
  %29 = load i64, ptr %25, align 8, !tbaa !6
  %30 = mul i64 %26, %2
  %31 = mul i64 %27, %2
  %32 = mul i64 %28, %2
  %33 = mul i64 %29, %2
  %34 = add i64 %15, %3
  %35 = add i64 %16, %3
  %36 = add i64 %17, %3
  %37 = add i64 %18, %3
  %38 = add i64 %34, %30
  %39 = add i64 %35, %31
  %40 = add i64 %36, %32
  %41 = add i64 %37, %33
  %42 = add nuw i64 %14, 4
  %43 = icmp eq i64 %42, %12
  br i1 %43, label %44, label %13, !llvm.loop !15

44:                                               ; preds = %13
  %45 = add i64 %39, %38
  %46 = add i64 %40, %45
  %47 = add i64 %41, %46
  %48 = icmp eq i64 %12, %1
  br i1 %48, label %49, label %8

49:                                               ; preds = %51, %44, %4
  %50 = phi i64 [ 0, %4 ], [ %47, %44 ], [ %58, %51 ]
  ret i64 %50

51:                                               ; preds = %8, %51
  %52 = phi i64 [ %58, %51 ], [ %9, %8 ]
  %53 = phi i64 [ %59, %51 ], [ %10, %8 ]
  %54 = getelementptr inbounds i64, ptr %0, i64 %53
  %55 = load i64, ptr %54, align 8, !tbaa !6
  %56 = mul i64 %55, %2
  %57 = add i64 %52, %3
  %58 = add i64 %57, %56
  %59 = add nuw i64 %53, 1
  %60 = icmp eq i64 %59, %1
  br i1 %60, label %49, label %51, !llvm.loop !16
}

; Function Attrs: nofree norecurse nosync nounwind ssp memory(argmem: read) uwtable(sync)
define i64 @lang_fn_squares(ptr nocapture noundef readonly %0, i64 noundef %1) local_unnamed_addr #0 {
  %3 = icmp eq i64 %1, 0
  br i1 %3, label %43, label %4

4:                                                ; preds = %2
  %5 = icmp ult i64 %1, 4
  br i1 %5, label %6, label %9

6:                                                ; preds = %38, %4
  %7 = phi i64 [ 0, %4 ], [ %41, %38 ]
  %8 = phi i64 [ 0, %4 ], [ %10, %38 ]
  br label %45

9:                                                ; preds = %4
  %10 = and i64 %1, -4
  br label %11

11:                                               ; preds = %11, %9
  %12 = phi i64 [ 0, %9 ], [ %36, %11 ]
  %13 = phi i64 [ 0, %9 ], [ %32, %11 ]
  %14 = phi i64 [ 0, %9 ], [ %33, %11 ]
  %15 = phi i64 [ 0, %9 ], [ %34, %11 ]
  %16 = phi i64 [ 0, %9 ], [ %35, %11 ]
  %17 = or disjoint i64 %12, 1
  %18 = or disjoint i64 %12, 2
  %19 = or disjoint i64 %12, 3
  %20 = getelementptr inbounds i64, ptr %0, i64 %12
  %21 = getelementptr inbounds i64, ptr %0, i64 %17
  %22 = getelementptr inbounds i64, ptr %0, i64 %18
  %23 = getelementptr inbounds i64, ptr %0, i64 %19
  %24 = load i64, ptr %20, align 8, !tbaa !6
  %25 = load i64, ptr %21, align 8, !tbaa !6
  %26 = load i64, ptr %22, align 8, !tbaa !6
  %27 = load i64, ptr %23, align 8, !tbaa !6
  %28 = mul i64 %24, %24
  %29 = mul i64 %25, %25
  %30 = mul i64 %26, %26
  %31 = mul i64 %27, %27
  %32 = add i64 %28, %13
  %33 = add i64 %29, %14
  %34 = add i64 %30, %15
  %35 = add i64 %31, %16
  %36 = add nuw i64 %12, 4
  %37 = icmp eq i64 %36, %10
  br i1 %37, label %38, label %11, !llvm.loop !17

38:                                               ; preds = %11
  %39 = add i64 %33, %32
  %40 = add i64 %34, %39
  %41 = add i64 %35, %40
  %42 = icmp eq i64 %10, %1
  br i1 %42, label %43, label %6

43:                                               ; preds = %45, %38, %2
  %44 = phi i64 [ 0, %2 ], [ %41, %38 ], [ %51, %45 ]
  ret i64 %44

45:                                               ; preds = %6, %45
  %46 = phi i64 [ %51, %45 ], [ %7, %6 ]
  %47 = phi i64 [ %52, %45 ], [ %8, %6 ]
  %48 = getelementptr inbounds i64, ptr %0, i64 %47
  %49 = load i64, ptr %48, align 8, !tbaa !6
  %50 = mul i64 %49, %49
  %51 = add i64 %50, %46
  %52 = add nuw i64 %47, 1
  %53 = icmp eq i64 %52, %1
  br i1 %53, label %43, label %45, !llvm.loop !18
}

; Function Attrs: nofree norecurse nosync nounwind ssp memory(argmem: read) uwtable(sync)
define i64 @lang_fn_filter_sum(ptr nocapture noundef readonly %0, i64 noundef %1, i64 noundef %2) local_unnamed_addr #0 {
  %4 = icmp eq i64 %1, 0
  br i1 %4, label %48, label %5

5:                                                ; preds = %3
  %6 = icmp ult i64 %1, 8
  br i1 %6, label %7, label %10

7:                                                ; preds = %42, %5
  %8 = phi i64 [ 0, %5 ], [ %46, %42 ]
  %9 = phi i64 [ 0, %5 ], [ %11, %42 ]
  br label %50

10:                                               ; preds = %5
  %11 = and i64 %1, -8
  %12 = insertelement <2 x i64> poison, i64 %2, i64 0
  %13 = shufflevector <2 x i64> %12, <2 x i64> poison, <2 x i32> zeroinitializer
  br label %14

14:                                               ; preds = %14, %10
  %15 = phi i64 [ 0, %10 ], [ %40, %14 ]
  %16 = phi <2 x i64> [ zeroinitializer, %10 ], [ %36, %14 ]
  %17 = phi <2 x i64> [ zeroinitializer, %10 ], [ %37, %14 ]
  %18 = phi <2 x i64> [ zeroinitializer, %10 ], [ %38, %14 ]
  %19 = phi <2 x i64> [ zeroinitializer, %10 ], [ %39, %14 ]
  %20 = getelementptr inbounds i64, ptr %0, i64 %15
  %21 = getelementptr inbounds i8, ptr %20, i64 16
  %22 = getelementptr inbounds i8, ptr %20, i64 32
  %23 = getelementptr inbounds i8, ptr %20, i64 48
  %24 = load <2 x i64>, ptr %20, align 8, !tbaa !6
  %25 = load <2 x i64>, ptr %21, align 8, !tbaa !6
  %26 = load <2 x i64>, ptr %22, align 8, !tbaa !6
  %27 = load <2 x i64>, ptr %23, align 8, !tbaa !6
  %28 = icmp ult <2 x i64> %24, %13
  %29 = icmp ult <2 x i64> %25, %13
  %30 = icmp ult <2 x i64> %26, %13
  %31 = icmp ult <2 x i64> %27, %13
  %32 = select <2 x i1> %28, <2 x i64> %24, <2 x i64> zeroinitializer
  %33 = select <2 x i1> %29, <2 x i64> %25, <2 x i64> zeroinitializer
  %34 = select <2 x i1> %30, <2 x i64> %26, <2 x i64> zeroinitializer
  %35 = select <2 x i1> %31, <2 x i64> %27, <2 x i64> zeroinitializer
  %36 = add <2 x i64> %32, %16
  %37 = add <2 x i64> %33, %17
  %38 = add <2 x i64> %34, %18
  %39 = add <2 x i64> %35, %19
  %40 = add nuw i64 %15, 8
  %41 = icmp eq i64 %40, %11
  br i1 %41, label %42, label %14, !llvm.loop !19

42:                                               ; preds = %14
  %43 = add <2 x i64> %37, %36
  %44 = add <2 x i64> %38, %43
  %45 = add <2 x i64> %39, %44
  %46 = tail call i64 @llvm.vector.reduce.add.v2i64(<2 x i64> %45)
  %47 = icmp eq i64 %11, %1
  br i1 %47, label %48, label %7

48:                                               ; preds = %50, %42, %3
  %49 = phi i64 [ 0, %3 ], [ %46, %42 ], [ %57, %50 ]
  ret i64 %49

50:                                               ; preds = %7, %50
  %51 = phi i64 [ %57, %50 ], [ %8, %7 ]
  %52 = phi i64 [ %58, %50 ], [ %9, %7 ]
  %53 = getelementptr inbounds i64, ptr %0, i64 %52
  %54 = load i64, ptr %53, align 8, !tbaa !6
  %55 = icmp ult i64 %54, %2
  %56 = select i1 %55, i64 %54, i64 0
  %57 = add i64 %56, %51
  %58 = add nuw i64 %52, 1
  %59 = icmp eq i64 %58, %1
  br i1 %59, label %48, label %50, !llvm.loop !20
}

; Function Attrs: nofree norecurse nosync nounwind ssp memory(argmem: read) uwtable(sync)
define i64 @lang_fn_pipeline(ptr nocapture noundef readonly %0, i64 noundef %1, i64 noundef %2, i64 noundef %3, i64 noundef %4) local_unnamed_addr #0 {
  %6 = icmp eq i64 %1, 0
  br i1 %6, label %66, label %7

7:                                                ; preds = %5
  %8 = icmp ult i64 %1, 4
  br i1 %8, label %9, label %12

9:                                                ; preds = %61, %7
  %10 = phi i64 [ 0, %7 ], [ %64, %61 ]
  %11 = phi i64 [ 0, %7 ], [ %13, %61 ]
  br label %68

12:                                               ; preds = %7
  %13 = and i64 %1, -4
  br label %14

14:                                               ; preds = %14, %12
  %15 = phi i64 [ 0, %12 ], [ %59, %14 ]
  %16 = phi i64 [ 0, %12 ], [ %55, %14 ]
  %17 = phi i64 [ 0, %12 ], [ %56, %14 ]
  %18 = phi i64 [ 0, %12 ], [ %57, %14 ]
  %19 = phi i64 [ 0, %12 ], [ %58, %14 ]
  %20 = or disjoint i64 %15, 1
  %21 = or disjoint i64 %15, 2
  %22 = or disjoint i64 %15, 3
  %23 = getelementptr inbounds i64, ptr %0, i64 %15
  %24 = getelementptr inbounds i64, ptr %0, i64 %20
  %25 = getelementptr inbounds i64, ptr %0, i64 %21
  %26 = getelementptr inbounds i64, ptr %0, i64 %22
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
  %43 = mul i64 %35, %35
  %44 = mul i64 %36, %36
  %45 = mul i64 %37, %37
  %46 = mul i64 %38, %38
  %47 = add i64 %43, 7
  %48 = add i64 %44, 7
  %49 = add i64 %45, 7
  %50 = add i64 %46, 7
  %51 = select i1 %39, i64 %47, i64 0
  %52 = select i1 %40, i64 %48, i64 0
  %53 = select i1 %41, i64 %49, i64 0
  %54 = select i1 %42, i64 %50, i64 0
  %55 = add i64 %51, %16
  %56 = add i64 %52, %17
  %57 = add i64 %53, %18
  %58 = add i64 %54, %19
  %59 = add nuw i64 %15, 4
  %60 = icmp eq i64 %59, %13
  br i1 %60, label %61, label %14, !llvm.loop !21

61:                                               ; preds = %14
  %62 = add i64 %56, %55
  %63 = add i64 %57, %62
  %64 = add i64 %58, %63
  %65 = icmp eq i64 %13, %1
  br i1 %65, label %66, label %9

66:                                               ; preds = %68, %61, %5
  %67 = phi i64 [ 0, %5 ], [ %64, %61 ], [ %79, %68 ]
  ret i64 %67

68:                                               ; preds = %9, %68
  %69 = phi i64 [ %79, %68 ], [ %10, %9 ]
  %70 = phi i64 [ %80, %68 ], [ %11, %9 ]
  %71 = getelementptr inbounds i64, ptr %0, i64 %70
  %72 = load i64, ptr %71, align 8, !tbaa !6
  %73 = mul i64 %72, %2
  %74 = add i64 %73, %3
  %75 = icmp ult i64 %74, %4
  %76 = mul i64 %74, %74
  %77 = add i64 %76, 7
  %78 = select i1 %75, i64 %77, i64 0
  %79 = add i64 %78, %69
  %80 = add nuw i64 %70, 1
  %81 = icmp eq i64 %80, %1
  br i1 %81, label %66, label %68, !llvm.loop !22
}

; Function Attrs: nofree norecurse nosync nounwind ssp memory(argmem: read) uwtable(sync)
define i64 @lang_fn_expanded(ptr nocapture noundef readonly %0, i64 noundef %1) local_unnamed_addr #0 {
  %3 = icmp eq i64 %1, 0
  br i1 %3, label %51, label %4

4:                                                ; preds = %2
  %5 = icmp ult i64 %1, 4
  br i1 %5, label %6, label %9

6:                                                ; preds = %46, %4
  %7 = phi i64 [ 0, %4 ], [ %49, %46 ]
  %8 = phi i64 [ 0, %4 ], [ %10, %46 ]
  br label %53

9:                                                ; preds = %4
  %10 = and i64 %1, -4
  br label %11

11:                                               ; preds = %11, %9
  %12 = phi i64 [ 0, %9 ], [ %44, %11 ]
  %13 = phi i64 [ 0, %9 ], [ %40, %11 ]
  %14 = phi i64 [ 0, %9 ], [ %41, %11 ]
  %15 = phi i64 [ 0, %9 ], [ %42, %11 ]
  %16 = phi i64 [ 0, %9 ], [ %43, %11 ]
  %17 = or disjoint i64 %12, 1
  %18 = or disjoint i64 %12, 2
  %19 = or disjoint i64 %12, 3
  %20 = getelementptr inbounds i64, ptr %0, i64 %12
  %21 = getelementptr inbounds i64, ptr %0, i64 %17
  %22 = getelementptr inbounds i64, ptr %0, i64 %18
  %23 = getelementptr inbounds i64, ptr %0, i64 %19
  %24 = load i64, ptr %20, align 8, !tbaa !6
  %25 = load i64, ptr %21, align 8, !tbaa !6
  %26 = load i64, ptr %22, align 8, !tbaa !6
  %27 = load i64, ptr %23, align 8, !tbaa !6
  %28 = add i64 %24, 6
  %29 = add i64 %25, 6
  %30 = add i64 %26, 6
  %31 = add i64 %27, 6
  %32 = mul i64 %28, %24
  %33 = mul i64 %29, %25
  %34 = mul i64 %30, %26
  %35 = mul i64 %31, %27
  %36 = add i64 %13, 9
  %37 = add i64 %14, 9
  %38 = add i64 %15, 9
  %39 = add i64 %16, 9
  %40 = add i64 %36, %32
  %41 = add i64 %37, %33
  %42 = add i64 %38, %34
  %43 = add i64 %39, %35
  %44 = add nuw i64 %12, 4
  %45 = icmp eq i64 %44, %10
  br i1 %45, label %46, label %11, !llvm.loop !23

46:                                               ; preds = %11
  %47 = add i64 %41, %40
  %48 = add i64 %42, %47
  %49 = add i64 %43, %48
  %50 = icmp eq i64 %10, %1
  br i1 %50, label %51, label %6

51:                                               ; preds = %53, %46, %2
  %52 = phi i64 [ 0, %2 ], [ %49, %46 ], [ %61, %53 ]
  ret i64 %52

53:                                               ; preds = %6, %53
  %54 = phi i64 [ %61, %53 ], [ %7, %6 ]
  %55 = phi i64 [ %62, %53 ], [ %8, %6 ]
  %56 = getelementptr inbounds i64, ptr %0, i64 %55
  %57 = load i64, ptr %56, align 8, !tbaa !6
  %58 = add i64 %57, 6
  %59 = mul i64 %58, %57
  %60 = add i64 %54, 9
  %61 = add i64 %60, %59
  %62 = add nuw i64 %55, 1
  %63 = icmp eq i64 %62, %1
  br i1 %63, label %51, label %53, !llvm.loop !24
}

; Function Attrs: nofree norecurse nosync nounwind ssp memory(argmem: read) uwtable(sync)
define i64 @lang_fn_count_under(ptr nocapture noundef readonly %0, i64 noundef %1, i64 noundef %2) local_unnamed_addr #0 {
  %4 = icmp eq i64 %1, 0
  br i1 %4, label %48, label %5

5:                                                ; preds = %3
  %6 = icmp ult i64 %1, 8
  br i1 %6, label %7, label %10

7:                                                ; preds = %42, %5
  %8 = phi i64 [ 0, %5 ], [ %46, %42 ]
  %9 = phi i64 [ 0, %5 ], [ %11, %42 ]
  br label %50

10:                                               ; preds = %5
  %11 = and i64 %1, -8
  %12 = insertelement <2 x i64> poison, i64 %2, i64 0
  %13 = shufflevector <2 x i64> %12, <2 x i64> poison, <2 x i32> zeroinitializer
  br label %14

14:                                               ; preds = %14, %10
  %15 = phi i64 [ 0, %10 ], [ %40, %14 ]
  %16 = phi <2 x i64> [ zeroinitializer, %10 ], [ %36, %14 ]
  %17 = phi <2 x i64> [ zeroinitializer, %10 ], [ %37, %14 ]
  %18 = phi <2 x i64> [ zeroinitializer, %10 ], [ %38, %14 ]
  %19 = phi <2 x i64> [ zeroinitializer, %10 ], [ %39, %14 ]
  %20 = getelementptr inbounds i64, ptr %0, i64 %15
  %21 = getelementptr inbounds i8, ptr %20, i64 16
  %22 = getelementptr inbounds i8, ptr %20, i64 32
  %23 = getelementptr inbounds i8, ptr %20, i64 48
  %24 = load <2 x i64>, ptr %20, align 8, !tbaa !6
  %25 = load <2 x i64>, ptr %21, align 8, !tbaa !6
  %26 = load <2 x i64>, ptr %22, align 8, !tbaa !6
  %27 = load <2 x i64>, ptr %23, align 8, !tbaa !6
  %28 = icmp ult <2 x i64> %24, %13
  %29 = icmp ult <2 x i64> %25, %13
  %30 = icmp ult <2 x i64> %26, %13
  %31 = icmp ult <2 x i64> %27, %13
  %32 = zext <2 x i1> %28 to <2 x i64>
  %33 = zext <2 x i1> %29 to <2 x i64>
  %34 = zext <2 x i1> %30 to <2 x i64>
  %35 = zext <2 x i1> %31 to <2 x i64>
  %36 = add <2 x i64> %16, %32
  %37 = add <2 x i64> %17, %33
  %38 = add <2 x i64> %18, %34
  %39 = add <2 x i64> %19, %35
  %40 = add nuw i64 %15, 8
  %41 = icmp eq i64 %40, %11
  br i1 %41, label %42, label %14, !llvm.loop !25

42:                                               ; preds = %14
  %43 = add <2 x i64> %37, %36
  %44 = add <2 x i64> %38, %43
  %45 = add <2 x i64> %39, %44
  %46 = tail call i64 @llvm.vector.reduce.add.v2i64(<2 x i64> %45)
  %47 = icmp eq i64 %11, %1
  br i1 %47, label %48, label %7

48:                                               ; preds = %50, %42, %3
  %49 = phi i64 [ 0, %3 ], [ %46, %42 ], [ %57, %50 ]
  ret i64 %49

50:                                               ; preds = %7, %50
  %51 = phi i64 [ %57, %50 ], [ %8, %7 ]
  %52 = phi i64 [ %58, %50 ], [ %9, %7 ]
  %53 = getelementptr inbounds i64, ptr %0, i64 %52
  %54 = load i64, ptr %53, align 8, !tbaa !6
  %55 = icmp ult i64 %54, %2
  %56 = zext i1 %55 to i64
  %57 = add i64 %51, %56
  %58 = add nuw i64 %52, 1
  %59 = icmp eq i64 %58, %1
  br i1 %59, label %48, label %50, !llvm.loop !26
}

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare i64 @llvm.vector.reduce.add.v2i64(<2 x i64>) #1

attributes #0 = { nofree norecurse nosync nounwind ssp memory(argmem: read) uwtable(sync) "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-m3" "target-features"="+aes,+bf16,+bti,+ccidx,+complxnum,+crc,+dit,+dotprod,+flagm,+fp-armv8,+fp16fml,+fpac,+fullfp16,+hcx,+i8mm,+jsconv,+lse,+neon,+pauth,+perfmon,+predres,+ras,+rcpc,+rdm,+sb,+sha2,+sha3,+ssbs,+v8.1a,+v8.2a,+v8.3a,+v8.4a,+v8.5a,+v8.6a,+v8a,+zcm,+zcz" }
attributes #1 = { nocallback nofree nosync nounwind speculatable willreturn memory(none) }

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
!14 = distinct !{!14, !11, !13, !12}
!15 = distinct !{!15, !11, !12, !13}
!16 = distinct !{!16, !11, !12}
!17 = distinct !{!17, !11, !12, !13}
!18 = distinct !{!18, !11, !12}
!19 = distinct !{!19, !11, !12, !13}
!20 = distinct !{!20, !11, !13, !12}
!21 = distinct !{!21, !11, !12, !13}
!22 = distinct !{!22, !11, !12}
!23 = distinct !{!23, !11, !12, !13}
!24 = distinct !{!24, !11, !12}
!25 = distinct !{!25, !11, !12, !13}
!26 = distinct !{!26, !11, !13, !12}
