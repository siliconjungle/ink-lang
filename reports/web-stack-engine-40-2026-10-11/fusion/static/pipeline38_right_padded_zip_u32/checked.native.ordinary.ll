; ModuleID = '/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_u32/checked/cpu.c'
source_filename = "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_u32/checked/cpu.c"
target datalayout = "e-m:o-i64:64-i128:128-n32:64-S128"
target triple = "arm64-apple-macosx13.1.0"

%struct.ink_block = type { %struct.ink_block*, i64 }

@ink_blocks = internal thread_local unnamed_addr global %struct.ink_block* null, align 8

; Function Attrs: nounwind ssp uwtable
define void @ink_compute_reset() local_unnamed_addr #0 !dbg !13 {
  %1 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !17, !tbaa !18
  %2 = icmp eq %struct.ink_block* %1, null, !dbg !22
  br i1 %2, label %9, label %3, !dbg !22

3:                                                ; preds = %0, %3
  %4 = phi %struct.ink_block* [ %6, %3 ], [ %1, %0 ]
  %5 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %4, i64 0, i32 0, !dbg !23
  %6 = load %struct.ink_block*, %struct.ink_block** %5, align 8, !dbg !23, !tbaa !24
  store %struct.ink_block* %6, %struct.ink_block** @ink_blocks, align 8, !dbg !27, !tbaa !18
  %7 = bitcast %struct.ink_block* %4 to i8*, !dbg !28
  tail call void @free(i8* %7), !dbg !29
  %8 = icmp eq %struct.ink_block* %6, null, !dbg !22
  br i1 %8, label %9, label %3, !dbg !22, !llvm.loop !30

9:                                                ; preds = %3, %0
  ret void, !dbg !33
}

; Function Attrs: inaccessiblemem_or_argmemonly mustprogress nounwind willreturn
declare void @free(i8* nocapture noundef) local_unnamed_addr #1

; Function Attrs: mustprogress nofree norecurse nosync nounwind readonly ssp uwtable willreturn
define i64 @ink_compute_mark() local_unnamed_addr #2 !dbg !34 {
  %1 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !35, !tbaa !18
  %2 = ptrtoint %struct.ink_block* %1 to i64, !dbg !36
  ret i64 %2, !dbg !37
}

; Function Attrs: nounwind ssp uwtable
define void @ink_compute_rewind(i64 %0) local_unnamed_addr #0 !dbg !38 {
  %2 = inttoptr i64 %0 to %struct.ink_block*
  %3 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !39, !tbaa !18
  %4 = icmp eq %struct.ink_block* %3, %2, !dbg !40
  br i1 %4, label %12, label %5, !dbg !41

5:                                                ; preds = %1, %5
  %6 = phi %struct.ink_block* [ %8, %5 ], [ %3, %1 ]
  %7 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %6, i64 0, i32 0, !dbg !42
  %8 = load %struct.ink_block*, %struct.ink_block** %7, align 8, !dbg !42, !tbaa !24
  %9 = bitcast %struct.ink_block* %6 to i8*, !dbg !43
  tail call void @free(i8* %9), !dbg !44
  %10 = icmp eq %struct.ink_block* %8, %2, !dbg !40
  br i1 %10, label %11, label %5, !dbg !41, !llvm.loop !45

11:                                               ; preds = %5
  store %struct.ink_block* %2, %struct.ink_block** @ink_blocks, align 8, !dbg !47, !tbaa !18
  br label %12, !dbg !41

12:                                               ; preds = %11, %1
  ret void, !dbg !48
}

; Function Attrs: nounwind ssp uwtable
define nonnull i8* @ink_alloc(i64 %0, i64 %1) local_unnamed_addr #0 !dbg !49 {
  %3 = icmp eq i64 %1, 0, !dbg !50
  br i1 %3, label %7, label %4, !dbg !51

4:                                                ; preds = %2
  %5 = tail call { i64, i1 } @llvm.umul.with.overflow.i64(i64 %1, i64 %0), !dbg !52
  %6 = extractvalue { i64, i1 } %5, 1, !dbg !52
  br i1 %6, label %7, label %8, !dbg !53

7:                                                ; preds = %4, %2
  tail call fastcc void @ink_fail(), !dbg !54
  unreachable

8:                                                ; preds = %4
  %9 = icmp eq i64 %0, 0, !dbg !55
  %10 = select i1 %9, i64 1, i64 %0, !dbg !55
  %11 = mul i64 %10, %1, !dbg !56
  %12 = icmp ugt i64 %11, -17, !dbg !57
  br i1 %12, label %13, label %14, !dbg !58

13:                                               ; preds = %8
  tail call fastcc void @ink_fail(), !dbg !59
  unreachable

14:                                               ; preds = %8
  %15 = add nuw i64 %11, 16, !dbg !60
  %16 = tail call i8* @malloc(i64 %15) #9, !dbg !61
  %17 = bitcast i8* %16 to %struct.ink_block*, !dbg !61
  %18 = icmp eq i8* %16, null, !dbg !62
  br i1 %18, label %19, label %20, !dbg !63

19:                                               ; preds = %14
  tail call fastcc void @ink_fail(), !dbg !64
  unreachable

20:                                               ; preds = %14
  %21 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !65, !tbaa !18
  %22 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %17, i64 0, i32 0, !dbg !66
  store %struct.ink_block* %21, %struct.ink_block** %22, align 8, !dbg !67, !tbaa !24
  store i8* %16, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !68, !tbaa !18
  %23 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %17, i64 1, !dbg !69
  %24 = bitcast %struct.ink_block* %23 to i8*, !dbg !70
  ret i8* %24, !dbg !71
}

; Function Attrs: noreturn nounwind ssp uwtable
define internal fastcc void @ink_fail() unnamed_addr #3 !dbg !72 {
  tail call void @abort() #10, !dbg !73
  unreachable, !dbg !73
}

; Function Attrs: inaccessiblememonly mustprogress nofree nounwind willreturn allocsize(0)
declare noalias noundef i8* @malloc(i64 noundef) local_unnamed_addr #4

; Function Attrs: nounwind ssp uwtable
define [2 x i64] @lang_fn_pipeline38_right_padded_zip_u32([2 x i64] %0, [2 x i64] %1, i32 %2, i32 %3) local_unnamed_addr #0 !dbg !74 {
  %5 = extractvalue [2 x i64] %0, 0
  %6 = inttoptr i64 %5 to i32*
  %7 = inttoptr i64 %5 to i8*
  %8 = extractvalue [2 x i64] %0, 1
  %9 = icmp ugt i64 %8, 4611686018427387903, !dbg !75
  br i1 %9, label %10, label %11, !dbg !77

10:                                               ; preds = %4
  tail call fastcc void @ink_fail() #11, !dbg !78
  unreachable

11:                                               ; preds = %4
  %12 = icmp eq i64 %8, 0, !dbg !79
  %13 = shl nuw i64 %8, 2, !dbg !80
  %14 = select i1 %12, i64 4, i64 %13, !dbg !80
  %15 = icmp ugt i64 %14, -17, !dbg !81
  br i1 %15, label %16, label %17, !dbg !82

16:                                               ; preds = %11
  tail call fastcc void @ink_fail() #11, !dbg !83
  unreachable

17:                                               ; preds = %11
  %18 = add nuw i64 %14, 16, !dbg !84
  %19 = tail call i8* @malloc(i64 %18) #12, !dbg !85
  %20 = bitcast i8* %19 to %struct.ink_block*, !dbg !85
  %21 = icmp eq i8* %19, null, !dbg !86
  br i1 %21, label %22, label %23, !dbg !87

22:                                               ; preds = %17
  tail call fastcc void @ink_fail() #11, !dbg !88
  unreachable

23:                                               ; preds = %17
  %24 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !89, !tbaa !18
  %25 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %20, i64 0, i32 0, !dbg !90
  store %struct.ink_block* %24, %struct.ink_block** %25, align 8, !dbg !91, !tbaa !24
  store i8* %19, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !92, !tbaa !18
  %26 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %20, i64 1, !dbg !93
  %27 = bitcast %struct.ink_block* %26 to i32*, !dbg !94
  %28 = sub i32 0, %2
  br i1 %12, label %77, label %29, !dbg !95

29:                                               ; preds = %23
  %30 = icmp eq i64 %8, 1, !dbg !95
  br i1 %30, label %75, label %31, !dbg !95

31:                                               ; preds = %29
  %32 = getelementptr i8, i8* %19, i64 16, !dbg !95
  %33 = add i64 %13, 16, !dbg !95
  %34 = getelementptr i8, i8* %19, i64 %33, !dbg !95
  %35 = getelementptr i32, i32* %6, i64 %8, !dbg !95
  %36 = bitcast i32* %35 to i8*, !dbg !95
  %37 = icmp ult i8* %32, %36, !dbg !95
  %38 = icmp ugt i8* %34, %7, !dbg !95
  %39 = and i1 %37, %38, !dbg !95
  br i1 %39, label %75, label %40, !dbg !95

40:                                               ; preds = %31
  %41 = and i64 %8, -2, !dbg !95
  %42 = insertelement <2 x i32> poison, i32 %2, i32 0, !dbg !95
  %43 = shufflevector <2 x i32> %42, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !95
  %44 = insertelement <2 x i32> poison, i32 %3, i32 0, !dbg !95
  %45 = shufflevector <2 x i32> %44, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !95
  %46 = insertelement <2 x i32> poison, i32 %28, i32 0, !dbg !95
  %47 = shufflevector <2 x i32> %46, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !95
  br label %48, !dbg !95

48:                                               ; preds = %48, %40
  %49 = phi i64 [ 0, %40 ], [ %70, %48 ], !dbg !96
  %50 = phi <2 x i32> [ <i32 0, i32 1>, %40 ], [ %71, %48 ], !dbg !97
  %51 = getelementptr inbounds i32, i32* %6, i64 %49, !dbg !96
  %52 = bitcast i32* %51 to <2 x i32>*, !dbg !98
  %53 = load <2 x i32>, <2 x i32>* %52, align 4, !dbg !98, !tbaa !99, !alias.scope !101
  %54 = icmp ult <2 x i32> %50, %43, !dbg !104
  %55 = select <2 x i1> %54, <2 x i32> %45, <2 x i32> %47, !dbg !105
  %56 = add <2 x i32> %53, %55, !dbg !105
  %57 = urem <2 x i32> %50, <i32 3, i32 3>, !dbg !106
  %58 = icmp eq <2 x i32> %57, zeroinitializer, !dbg !107
  %59 = mul <2 x i32> %53, %45, !dbg !108
  %60 = add <2 x i32> %53, %43, !dbg !108
  %61 = select <2 x i1> %58, <2 x i32> %59, <2 x i32> %60, !dbg !108
  %62 = icmp ult <2 x i32> %56, %61, !dbg !109
  %63 = mul <2 x i32> %61, %45, !dbg !110
  %64 = add <2 x i32> %63, %56, !dbg !110
  %65 = add <2 x i32> %56, %43, !dbg !110
  %66 = sub <2 x i32> %65, %61, !dbg !110
  %67 = select <2 x i1> %62, <2 x i32> %64, <2 x i32> %66, !dbg !110
  %68 = getelementptr inbounds i32, i32* %27, i64 %49, !dbg !96
  %69 = bitcast i32* %68 to <2 x i32>*, !dbg !111
  store <2 x i32> %67, <2 x i32>* %69, align 4, !dbg !111, !tbaa !99, !alias.scope !112, !noalias !101
  %70 = add nuw i64 %49, 2, !dbg !96
  %71 = add <2 x i32> %50, <i32 2, i32 2>, !dbg !97
  %72 = icmp eq i64 %70, %41, !dbg !96
  br i1 %72, label %73, label %48, !dbg !96, !llvm.loop !114

73:                                               ; preds = %48
  %74 = icmp eq i64 %8, %41, !dbg !95
  br i1 %74, label %77, label %75, !dbg !95

75:                                               ; preds = %31, %29, %73
  %76 = phi i64 [ 0, %31 ], [ 0, %29 ], [ %41, %73 ]
  br label %81, !dbg !95

77:                                               ; preds = %81, %73, %23
  %78 = ptrtoint %struct.ink_block* %26 to i64, !dbg !117
  %79 = insertvalue [2 x i64] undef, i64 %78, 0, !dbg !117
  %80 = insertvalue [2 x i64] %79, i64 %8, 1, !dbg !117
  ret [2 x i64] %80, !dbg !117

81:                                               ; preds = %75, %81
  %82 = phi i64 [ %101, %81 ], [ %76, %75 ]
  %83 = trunc i64 %82 to i32, !dbg !97
  %84 = getelementptr inbounds i32, i32* %6, i64 %82, !dbg !98
  %85 = load i32, i32* %84, align 4, !dbg !98, !tbaa !99
  %86 = icmp ult i32 %83, %2, !dbg !104
  %87 = select i1 %86, i32 %3, i32 %28, !dbg !105
  %88 = add i32 %85, %87, !dbg !105
  %89 = urem i32 %83, 3, !dbg !106
  %90 = icmp eq i32 %89, 0, !dbg !107
  %91 = mul i32 %85, %3, !dbg !108
  %92 = add i32 %85, %2, !dbg !108
  %93 = select i1 %90, i32 %91, i32 %92, !dbg !108
  %94 = icmp ult i32 %88, %93, !dbg !109
  %95 = mul i32 %93, %3, !dbg !110
  %96 = add i32 %95, %88, !dbg !110
  %97 = add i32 %88, %2, !dbg !110
  %98 = sub i32 %97, %93, !dbg !110
  %99 = select i1 %94, i32 %96, i32 %98, !dbg !110
  %100 = getelementptr inbounds i32, i32* %27, i64 %82, !dbg !118
  store i32 %99, i32* %100, align 4, !dbg !111, !tbaa !99
  %101 = add nuw i64 %82, 1, !dbg !96
  %102 = icmp eq i64 %101, %8, !dbg !119
  br i1 %102, label %77, label %81, !dbg !95, !llvm.loop !120
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_left_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !121 {
  %5 = icmp ult i32 %0, %2, !dbg !122
  %6 = sub i32 0, %2, !dbg !123
  %7 = select i1 %5, i32 %3, i32 %6, !dbg !123
  %8 = add i32 %7, %1, !dbg !123
  ret i32 %8, !dbg !124
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_right_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !125 {
  %5 = urem i32 %0, 3, !dbg !126
  %6 = icmp eq i32 %5, 0, !dbg !127
  %7 = mul i32 %3, %1, !dbg !128
  %8 = add i32 %2, %1, !dbg !128
  %9 = select i1 %6, i32 %7, i32 %8, !dbg !128
  ret i32 %9, !dbg !129
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_pair_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !130 {
  %5 = icmp ult i32 %0, %1, !dbg !131
  %6 = mul i32 %3, %1, !dbg !132
  %7 = add i32 %6, %0, !dbg !132
  %8 = sub i32 %0, %1, !dbg !132
  %9 = add i32 %8, %2, !dbg !132
  %10 = select i1 %5, i32 %7, i32 %9, !dbg !132
  ret i32 %10, !dbg !133
}

; Function Attrs: nofree norecurse nosync nounwind ssp uwtable
define i64 @lang_fn_pipeline38_right_padded_zip_u32_into([2 x i64] %0, [2 x i64] %1, i32 %2, i32 %3, i32* nocapture %4) local_unnamed_addr #6 !dbg !134 {
  %6 = extractvalue [2 x i64] %0, 0
  %7 = inttoptr i64 %6 to i32*
  %8 = extractvalue [2 x i64] %0, 1
  %9 = sub i32 0, %2
  switch i64 %8, label %10 [
    i64 0, label %55
    i64 1, label %53
  ], !dbg !135

10:                                               ; preds = %5
  %11 = inttoptr i64 %6 to i8*
  %12 = getelementptr i32, i32* %4, i64 %8, !dbg !135
  %13 = bitcast i32* %12 to i8*, !dbg !135
  %14 = getelementptr i32, i32* %7, i64 %8, !dbg !135
  %15 = icmp ugt i32* %14, %4, !dbg !135
  %16 = icmp ult i8* %11, %13, !dbg !135
  %17 = and i1 %15, %16, !dbg !135
  br i1 %17, label %53, label %18, !dbg !135

18:                                               ; preds = %10
  %19 = and i64 %8, -2, !dbg !135
  %20 = insertelement <2 x i32> poison, i32 %2, i32 0, !dbg !135
  %21 = shufflevector <2 x i32> %20, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !135
  %22 = insertelement <2 x i32> poison, i32 %3, i32 0, !dbg !135
  %23 = shufflevector <2 x i32> %22, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !135
  %24 = insertelement <2 x i32> poison, i32 %9, i32 0, !dbg !135
  %25 = shufflevector <2 x i32> %24, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !135
  br label %26, !dbg !135

26:                                               ; preds = %26, %18
  %27 = phi i64 [ 0, %18 ], [ %48, %26 ], !dbg !136
  %28 = phi <2 x i32> [ <i32 0, i32 1>, %18 ], [ %49, %26 ], !dbg !137
  %29 = getelementptr inbounds i32, i32* %7, i64 %27, !dbg !136
  %30 = bitcast i32* %29 to <2 x i32>*, !dbg !138
  %31 = load <2 x i32>, <2 x i32>* %30, align 4, !dbg !138, !tbaa !99, !alias.scope !139
  %32 = icmp ult <2 x i32> %28, %21, !dbg !142
  %33 = select <2 x i1> %32, <2 x i32> %23, <2 x i32> %25, !dbg !143
  %34 = add <2 x i32> %31, %33, !dbg !143
  %35 = urem <2 x i32> %28, <i32 3, i32 3>, !dbg !144
  %36 = icmp eq <2 x i32> %35, zeroinitializer, !dbg !145
  %37 = mul <2 x i32> %31, %23, !dbg !146
  %38 = add <2 x i32> %31, %21, !dbg !146
  %39 = select <2 x i1> %36, <2 x i32> %37, <2 x i32> %38, !dbg !146
  %40 = icmp ult <2 x i32> %34, %39, !dbg !147
  %41 = mul <2 x i32> %39, %23, !dbg !148
  %42 = add <2 x i32> %41, %34, !dbg !148
  %43 = add <2 x i32> %34, %21, !dbg !148
  %44 = sub <2 x i32> %43, %39, !dbg !148
  %45 = select <2 x i1> %40, <2 x i32> %42, <2 x i32> %44, !dbg !148
  %46 = getelementptr inbounds i32, i32* %4, i64 %27, !dbg !136
  %47 = bitcast i32* %46 to <2 x i32>*, !dbg !149
  store <2 x i32> %45, <2 x i32>* %47, align 4, !dbg !149, !tbaa !99, !alias.scope !150, !noalias !139
  %48 = add nuw i64 %27, 2, !dbg !136
  %49 = add <2 x i32> %28, <i32 2, i32 2>, !dbg !137
  %50 = icmp eq i64 %48, %19, !dbg !136
  br i1 %50, label %51, label %26, !dbg !136, !llvm.loop !152

51:                                               ; preds = %26
  %52 = icmp eq i64 %8, %19, !dbg !135
  br i1 %52, label %55, label %53, !dbg !135

53:                                               ; preds = %5, %10, %51
  %54 = phi i64 [ 0, %5 ], [ 0, %10 ], [ %19, %51 ]
  br label %56, !dbg !135

55:                                               ; preds = %56, %51, %5
  ret i64 %8, !dbg !154

56:                                               ; preds = %53, %56
  %57 = phi i64 [ %76, %56 ], [ %54, %53 ]
  %58 = trunc i64 %57 to i32, !dbg !137
  %59 = getelementptr inbounds i32, i32* %7, i64 %57, !dbg !138
  %60 = load i32, i32* %59, align 4, !dbg !138, !tbaa !99
  %61 = icmp ult i32 %58, %2, !dbg !142
  %62 = select i1 %61, i32 %3, i32 %9, !dbg !143
  %63 = add i32 %60, %62, !dbg !143
  %64 = urem i32 %58, 3, !dbg !144
  %65 = icmp eq i32 %64, 0, !dbg !145
  %66 = mul i32 %60, %3, !dbg !146
  %67 = add i32 %60, %2, !dbg !146
  %68 = select i1 %65, i32 %66, i32 %67, !dbg !146
  %69 = icmp ult i32 %63, %68, !dbg !147
  %70 = mul i32 %68, %3, !dbg !148
  %71 = add i32 %70, %63, !dbg !148
  %72 = add i32 %63, %2, !dbg !148
  %73 = sub i32 %72, %68, !dbg !148
  %74 = select i1 %69, i32 %71, i32 %73, !dbg !148
  %75 = getelementptr inbounds i32, i32* %4, i64 %57, !dbg !155
  store i32 %74, i32* %75, align 4, !dbg !149, !tbaa !99
  %76 = add nuw i64 %57, 1, !dbg !136
  %77 = icmp eq i64 %76, %8, !dbg !156
  br i1 %77, label %55, label %56, !dbg !135, !llvm.loop !157
}

; Function Attrs: nounwind ssp uwtable
define i64 @ink_compute_into(i32 %0, i8** nocapture readonly %1, i64* nocapture readonly %2, i8* nocapture %3) local_unnamed_addr #0 !dbg !158 {
  %5 = icmp eq i32 %0, 0, !dbg !159
  br i1 %5, label %6, label %118, !dbg !159

6:                                                ; preds = %4
  %7 = bitcast i8** %1 to i32**, !dbg !160
  %8 = load i32*, i32** %7, align 8, !dbg !160, !tbaa !18
  %9 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !161
  %10 = load i8*, i8** %9, align 8, !dbg !161, !tbaa !18
  %11 = load i8, i8* %10, align 1, !dbg !162, !tbaa !165
  %12 = getelementptr inbounds i8, i8* %10, i64 1, !dbg !162
  %13 = load i8, i8* %12, align 1, !dbg !162, !tbaa !165
  %14 = getelementptr inbounds i8, i8* %10, i64 2, !dbg !162
  %15 = load i8, i8* %14, align 1, !dbg !162, !tbaa !165
  %16 = getelementptr inbounds i8, i8* %10, i64 3, !dbg !162
  %17 = load i8, i8* %16, align 1, !dbg !162, !tbaa !165
  %18 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !166
  %19 = load i8*, i8** %18, align 8, !dbg !166, !tbaa !18
  %20 = load i8, i8* %19, align 1, !dbg !167, !tbaa !165
  %21 = getelementptr inbounds i8, i8* %19, i64 1, !dbg !167
  %22 = load i8, i8* %21, align 1, !dbg !167, !tbaa !165
  %23 = getelementptr inbounds i8, i8* %19, i64 2, !dbg !167
  %24 = load i8, i8* %23, align 1, !dbg !167, !tbaa !165
  %25 = getelementptr inbounds i8, i8* %19, i64 3, !dbg !167
  %26 = load i8, i8* %25, align 1, !dbg !167, !tbaa !165
  %27 = load i64, i64* %2, align 8, !dbg !169, !tbaa !170
  %28 = zext i8 %17 to i32, !dbg !172
  %29 = shl nuw i32 %28, 24, !dbg !172
  %30 = zext i8 %15 to i32, !dbg !172
  %31 = shl nuw nsw i32 %30, 16, !dbg !172
  %32 = zext i8 %13 to i32, !dbg !172
  %33 = shl nuw nsw i32 %32, 8, !dbg !172
  %34 = zext i8 %11 to i32, !dbg !172
  %35 = or i32 %33, %34, !dbg !172
  %36 = or i32 %35, %31, !dbg !172
  %37 = or i32 %36, %29, !dbg !172
  %38 = zext i8 %26 to i32, !dbg !173
  %39 = shl nuw i32 %38, 24, !dbg !173
  %40 = zext i8 %24 to i32, !dbg !173
  %41 = shl nuw nsw i32 %40, 16, !dbg !173
  %42 = zext i8 %22 to i32, !dbg !173
  %43 = shl nuw nsw i32 %42, 8, !dbg !173
  %44 = zext i8 %20 to i32, !dbg !173
  %45 = or i32 %43, %44, !dbg !173
  %46 = or i32 %45, %41, !dbg !173
  %47 = or i32 %46, %39, !dbg !173
  %48 = bitcast i8* %3 to i32*, !dbg !173
  %49 = sub i32 0, %37
  switch i64 %27, label %50 [
    i64 0, label %119
    i64 1, label %94
  ], !dbg !174

50:                                               ; preds = %6
  %51 = bitcast i32* %8 to i8*, !dbg !161
  %52 = shl i64 %27, 2, !dbg !174
  %53 = getelementptr i8, i8* %3, i64 %52, !dbg !174
  %54 = getelementptr i32, i32* %8, i64 %27, !dbg !174
  %55 = bitcast i32* %54 to i8*, !dbg !174
  %56 = icmp ugt i8* %55, %3, !dbg !174
  %57 = icmp ugt i8* %53, %51, !dbg !174
  %58 = and i1 %56, %57, !dbg !174
  br i1 %58, label %94, label %59, !dbg !174

59:                                               ; preds = %50
  %60 = and i64 %27, -2, !dbg !174
  %61 = insertelement <2 x i32> poison, i32 %37, i32 0, !dbg !174
  %62 = shufflevector <2 x i32> %61, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !174
  %63 = insertelement <2 x i32> poison, i32 %47, i32 0, !dbg !174
  %64 = shufflevector <2 x i32> %63, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !174
  %65 = insertelement <2 x i32> poison, i32 %49, i32 0, !dbg !174
  %66 = shufflevector <2 x i32> %65, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !174
  br label %67, !dbg !174

67:                                               ; preds = %67, %59
  %68 = phi i64 [ 0, %59 ], [ %89, %67 ], !dbg !176
  %69 = phi <2 x i32> [ <i32 0, i32 1>, %59 ], [ %90, %67 ], !dbg !177
  %70 = getelementptr inbounds i32, i32* %8, i64 %68, !dbg !176
  %71 = bitcast i32* %70 to <2 x i32>*, !dbg !178
  %72 = load <2 x i32>, <2 x i32>* %71, align 4, !dbg !178, !tbaa !99, !alias.scope !179
  %73 = icmp ugt <2 x i32> %62, %69, !dbg !182
  %74 = select <2 x i1> %73, <2 x i32> %64, <2 x i32> %66, !dbg !183
  %75 = add <2 x i32> %74, %72, !dbg !183
  %76 = urem <2 x i32> %69, <i32 3, i32 3>, !dbg !184
  %77 = icmp eq <2 x i32> %76, zeroinitializer, !dbg !185
  %78 = mul <2 x i32> %72, %64, !dbg !186
  %79 = add <2 x i32> %72, %62, !dbg !186
  %80 = select <2 x i1> %77, <2 x i32> %78, <2 x i32> %79, !dbg !186
  %81 = icmp ult <2 x i32> %75, %80, !dbg !187
  %82 = mul <2 x i32> %80, %64, !dbg !188
  %83 = add <2 x i32> %82, %75, !dbg !188
  %84 = add <2 x i32> %75, %62, !dbg !188
  %85 = sub <2 x i32> %84, %80, !dbg !188
  %86 = select <2 x i1> %81, <2 x i32> %83, <2 x i32> %85, !dbg !188
  %87 = getelementptr inbounds i32, i32* %48, i64 %68, !dbg !176
  %88 = bitcast i32* %87 to <2 x i32>*, !dbg !189
  store <2 x i32> %86, <2 x i32>* %88, align 4, !dbg !189, !tbaa !99, !alias.scope !190, !noalias !179
  %89 = add nuw i64 %68, 2, !dbg !176
  %90 = add <2 x i32> %69, <i32 2, i32 2>, !dbg !177
  %91 = icmp eq i64 %89, %60, !dbg !176
  br i1 %91, label %92, label %67, !dbg !176, !llvm.loop !192

92:                                               ; preds = %67
  %93 = icmp eq i64 %27, %60, !dbg !174
  br i1 %93, label %119, label %94, !dbg !174

94:                                               ; preds = %6, %50, %92
  %95 = phi i64 [ 0, %6 ], [ 0, %50 ], [ %60, %92 ]
  br label %96, !dbg !174

96:                                               ; preds = %94, %96
  %97 = phi i64 [ %116, %96 ], [ %95, %94 ]
  %98 = trunc i64 %97 to i32, !dbg !177
  %99 = getelementptr inbounds i32, i32* %8, i64 %97, !dbg !178
  %100 = load i32, i32* %99, align 4, !dbg !178, !tbaa !99
  %101 = icmp ugt i32 %37, %98, !dbg !182
  %102 = select i1 %101, i32 %47, i32 %49, !dbg !183
  %103 = add i32 %102, %100, !dbg !183
  %104 = urem i32 %98, 3, !dbg !184
  %105 = icmp eq i32 %104, 0, !dbg !185
  %106 = mul i32 %100, %47, !dbg !186
  %107 = add i32 %100, %37, !dbg !186
  %108 = select i1 %105, i32 %106, i32 %107, !dbg !186
  %109 = icmp ult i32 %103, %108, !dbg !187
  %110 = mul i32 %108, %47, !dbg !188
  %111 = add i32 %110, %103, !dbg !188
  %112 = add i32 %103, %37, !dbg !188
  %113 = sub i32 %112, %108, !dbg !188
  %114 = select i1 %109, i32 %111, i32 %113, !dbg !188
  %115 = getelementptr inbounds i32, i32* %48, i64 %97, !dbg !194
  store i32 %114, i32* %115, align 4, !dbg !189, !tbaa !99
  %116 = add nuw i64 %97, 1, !dbg !176
  %117 = icmp eq i64 %116, %27, !dbg !195
  br i1 %117, label %119, label %96, !dbg !174, !llvm.loop !196

118:                                              ; preds = %4
  tail call fastcc void @ink_fail(), !dbg !197
  unreachable

119:                                              ; preds = %96, %92, %6
  ret i64 %27, !dbg !198
}

; Function Attrs: nounwind ssp uwtable
define void @ink_compute_call(i32 %0, i8** nocapture readonly %1, i64* nocapture readonly %2, i8** nocapture %3, i64* nocapture %4) local_unnamed_addr #0 !dbg !199 {
  switch i32 %0, label %328 [
    i32 0, label %6
    i32 1, label %55
    i32 2, label %145
    i32 3, label %236
  ], !dbg !200

6:                                                ; preds = %5
  %7 = bitcast i8** %1 to i32**, !dbg !201
  %8 = load i32*, i32** %7, align 8, !dbg !201, !tbaa !18
  %9 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !202
  %10 = load i8*, i8** %9, align 8, !dbg !202, !tbaa !18
  %11 = load i8, i8* %10, align 1, !dbg !203, !tbaa !165
  %12 = getelementptr inbounds i8, i8* %10, i64 1, !dbg !203
  %13 = load i8, i8* %12, align 1, !dbg !203, !tbaa !165
  %14 = getelementptr inbounds i8, i8* %10, i64 2, !dbg !203
  %15 = load i8, i8* %14, align 1, !dbg !203, !tbaa !165
  %16 = getelementptr inbounds i8, i8* %10, i64 3, !dbg !203
  %17 = load i8, i8* %16, align 1, !dbg !203, !tbaa !165
  %18 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !205
  %19 = load i8*, i8** %18, align 8, !dbg !205, !tbaa !18
  %20 = load i8, i8* %19, align 1, !dbg !206, !tbaa !165
  %21 = getelementptr inbounds i8, i8* %19, i64 1, !dbg !206
  %22 = load i8, i8* %21, align 1, !dbg !206, !tbaa !165
  %23 = getelementptr inbounds i8, i8* %19, i64 2, !dbg !206
  %24 = load i8, i8* %23, align 1, !dbg !206, !tbaa !165
  %25 = getelementptr inbounds i8, i8* %19, i64 3, !dbg !206
  %26 = load i8, i8* %25, align 1, !dbg !206, !tbaa !165
  %27 = load i64, i64* %2, align 8, !dbg !208, !tbaa !170
  %28 = zext i8 %17 to i32, !dbg !209
  %29 = shl nuw i32 %28, 24, !dbg !209
  %30 = zext i8 %15 to i32, !dbg !209
  %31 = shl nuw nsw i32 %30, 16, !dbg !209
  %32 = zext i8 %13 to i32, !dbg !209
  %33 = shl nuw nsw i32 %32, 8, !dbg !209
  %34 = zext i8 %11 to i32, !dbg !209
  %35 = or i32 %33, %34, !dbg !209
  %36 = or i32 %35, %31, !dbg !209
  %37 = or i32 %36, %29, !dbg !209
  %38 = zext i8 %26 to i32, !dbg !210
  %39 = shl nuw i32 %38, 24, !dbg !210
  %40 = zext i8 %24 to i32, !dbg !210
  %41 = shl nuw nsw i32 %40, 16, !dbg !210
  %42 = zext i8 %22 to i32, !dbg !210
  %43 = shl nuw nsw i32 %42, 8, !dbg !210
  %44 = zext i8 %20 to i32, !dbg !210
  %45 = or i32 %43, %44, !dbg !210
  %46 = or i32 %45, %41, !dbg !210
  %47 = or i32 %46, %39, !dbg !210
  %48 = ptrtoint i32* %8 to i64, !dbg !210
  %49 = insertvalue [2 x i64] undef, i64 %48, 0, !dbg !210
  %50 = insertvalue [2 x i64] %49, i64 %27, 1, !dbg !210
  %51 = tail call [2 x i64] @lang_fn_pipeline38_right_padded_zip_u32([2 x i64] %50, [2 x i64] undef, i32 %37, i32 %47), !dbg !210
  %52 = extractvalue [2 x i64] %51, 0, !dbg !210
  %53 = extractvalue [2 x i64] %51, 1, !dbg !210
  %54 = inttoptr i64 %52 to i8*, !dbg !211
  store i8* %54, i8** %3, align 8, !dbg !212, !tbaa !18
  br label %329

55:                                               ; preds = %5
  %56 = load i8*, i8** %1, align 8, !dbg !213, !tbaa !18
  %57 = load i8, i8* %56, align 1, !dbg !214, !tbaa !165
  %58 = getelementptr inbounds i8, i8* %56, i64 1, !dbg !214
  %59 = load i8, i8* %58, align 1, !dbg !214, !tbaa !165
  %60 = getelementptr inbounds i8, i8* %56, i64 2, !dbg !214
  %61 = load i8, i8* %60, align 1, !dbg !214, !tbaa !165
  %62 = getelementptr inbounds i8, i8* %56, i64 3, !dbg !214
  %63 = load i8, i8* %62, align 1, !dbg !214, !tbaa !165
  %64 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !216
  %65 = load i8*, i8** %64, align 8, !dbg !216, !tbaa !18
  %66 = load i8, i8* %65, align 1, !dbg !217, !tbaa !165
  %67 = getelementptr inbounds i8, i8* %65, i64 1, !dbg !217
  %68 = load i8, i8* %67, align 1, !dbg !217, !tbaa !165
  %69 = getelementptr inbounds i8, i8* %65, i64 2, !dbg !217
  %70 = load i8, i8* %69, align 1, !dbg !217, !tbaa !165
  %71 = getelementptr inbounds i8, i8* %65, i64 3, !dbg !217
  %72 = load i8, i8* %71, align 1, !dbg !217, !tbaa !165
  %73 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !219
  %74 = load i8*, i8** %73, align 8, !dbg !219, !tbaa !18
  %75 = load i8, i8* %74, align 1, !dbg !220, !tbaa !165
  %76 = getelementptr inbounds i8, i8* %74, i64 1, !dbg !220
  %77 = load i8, i8* %76, align 1, !dbg !220, !tbaa !165
  %78 = getelementptr inbounds i8, i8* %74, i64 2, !dbg !220
  %79 = load i8, i8* %78, align 1, !dbg !220, !tbaa !165
  %80 = getelementptr inbounds i8, i8* %74, i64 3, !dbg !220
  %81 = load i8, i8* %80, align 1, !dbg !220, !tbaa !165
  %82 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !222
  %83 = load i8*, i8** %82, align 8, !dbg !222, !tbaa !18
  %84 = load i8, i8* %83, align 1, !dbg !223, !tbaa !165
  %85 = getelementptr inbounds i8, i8* %83, i64 1, !dbg !223
  %86 = load i8, i8* %85, align 1, !dbg !223, !tbaa !165
  %87 = getelementptr inbounds i8, i8* %83, i64 2, !dbg !223
  %88 = load i8, i8* %87, align 1, !dbg !223, !tbaa !165
  %89 = getelementptr inbounds i8, i8* %83, i64 3, !dbg !223
  %90 = load i8, i8* %89, align 1, !dbg !223, !tbaa !165
  %91 = zext i8 %81 to i32, !dbg !225
  %92 = shl nuw i32 %91, 24, !dbg !225
  %93 = zext i8 %79 to i32, !dbg !225
  %94 = shl nuw nsw i32 %93, 16, !dbg !225
  %95 = zext i8 %77 to i32, !dbg !225
  %96 = shl nuw nsw i32 %95, 8, !dbg !225
  %97 = zext i8 %75 to i32, !dbg !225
  %98 = or i32 %96, %97, !dbg !225
  %99 = or i32 %98, %94, !dbg !225
  %100 = or i32 %99, %92, !dbg !225
  %101 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !226
  %102 = bitcast i8* %101 to %struct.ink_block*, !dbg !226
  %103 = icmp eq i8* %101, null, !dbg !228
  br i1 %103, label %104, label %105, !dbg !229

104:                                              ; preds = %55
  tail call fastcc void @ink_fail() #11, !dbg !230
  unreachable

105:                                              ; preds = %55
  %106 = zext i8 %63 to i32, !dbg !231
  %107 = shl nuw i32 %106, 24, !dbg !231
  %108 = zext i8 %61 to i32, !dbg !231
  %109 = shl nuw nsw i32 %108, 16, !dbg !231
  %110 = zext i8 %59 to i32, !dbg !231
  %111 = shl nuw nsw i32 %110, 8, !dbg !231
  %112 = zext i8 %57 to i32, !dbg !231
  %113 = or i32 %111, %112, !dbg !231
  %114 = or i32 %113, %109, !dbg !231
  %115 = or i32 %114, %107, !dbg !231
  %116 = icmp ult i32 %115, %100, !dbg !232
  %117 = zext i8 %90 to i32, !dbg !232
  %118 = shl nuw i32 %117, 24, !dbg !232
  %119 = zext i8 %88 to i32, !dbg !232
  %120 = shl nuw nsw i32 %119, 16, !dbg !232
  %121 = zext i8 %86 to i32, !dbg !232
  %122 = shl nuw nsw i32 %121, 8, !dbg !232
  %123 = zext i8 %84 to i32, !dbg !232
  %124 = or i32 %122, %123, !dbg !232
  %125 = or i32 %124, %120, !dbg !232
  %126 = or i32 %125, %118, !dbg !232
  %127 = sub i32 0, %100, !dbg !234
  %128 = select i1 %116, i32 %126, i32 %127, !dbg !234
  %129 = zext i8 %72 to i32, !dbg !235
  %130 = shl nuw i32 %129, 24, !dbg !235
  %131 = zext i8 %70 to i32, !dbg !235
  %132 = shl nuw nsw i32 %131, 16, !dbg !235
  %133 = zext i8 %68 to i32, !dbg !235
  %134 = shl nuw nsw i32 %133, 8, !dbg !235
  %135 = zext i8 %66 to i32, !dbg !235
  %136 = or i32 %134, %135, !dbg !235
  %137 = or i32 %136, %132, !dbg !235
  %138 = or i32 %137, %130, !dbg !235
  %139 = add i32 %128, %138, !dbg !234
  %140 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !236, !tbaa !18
  %141 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %102, i64 0, i32 0, !dbg !237
  store %struct.ink_block* %140, %struct.ink_block** %141, align 8, !dbg !238, !tbaa !24
  store i8* %101, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !239, !tbaa !18
  %142 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %102, i64 1, !dbg !240
  %143 = bitcast %struct.ink_block* %142 to i32*, !dbg !241
  store i32 %139, i32* %143, align 4, !dbg !242, !tbaa !99
  %144 = bitcast i8** %3 to %struct.ink_block**, !dbg !243
  store %struct.ink_block* %142, %struct.ink_block** %144, align 8, !dbg !243, !tbaa !18
  br label %329

145:                                              ; preds = %5
  %146 = load i8*, i8** %1, align 8, !dbg !244, !tbaa !18
  %147 = load i8, i8* %146, align 1, !dbg !245, !tbaa !165
  %148 = getelementptr inbounds i8, i8* %146, i64 1, !dbg !245
  %149 = load i8, i8* %148, align 1, !dbg !245, !tbaa !165
  %150 = getelementptr inbounds i8, i8* %146, i64 2, !dbg !245
  %151 = load i8, i8* %150, align 1, !dbg !245, !tbaa !165
  %152 = getelementptr inbounds i8, i8* %146, i64 3, !dbg !245
  %153 = load i8, i8* %152, align 1, !dbg !245, !tbaa !165
  %154 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !247
  %155 = load i8*, i8** %154, align 8, !dbg !247, !tbaa !18
  %156 = load i8, i8* %155, align 1, !dbg !248, !tbaa !165
  %157 = getelementptr inbounds i8, i8* %155, i64 1, !dbg !248
  %158 = load i8, i8* %157, align 1, !dbg !248, !tbaa !165
  %159 = getelementptr inbounds i8, i8* %155, i64 2, !dbg !248
  %160 = load i8, i8* %159, align 1, !dbg !248, !tbaa !165
  %161 = getelementptr inbounds i8, i8* %155, i64 3, !dbg !248
  %162 = load i8, i8* %161, align 1, !dbg !248, !tbaa !165
  %163 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !250
  %164 = load i8*, i8** %163, align 8, !dbg !250, !tbaa !18
  %165 = load i8, i8* %164, align 1, !dbg !251, !tbaa !165
  %166 = getelementptr inbounds i8, i8* %164, i64 1, !dbg !251
  %167 = load i8, i8* %166, align 1, !dbg !251, !tbaa !165
  %168 = getelementptr inbounds i8, i8* %164, i64 2, !dbg !251
  %169 = load i8, i8* %168, align 1, !dbg !251, !tbaa !165
  %170 = getelementptr inbounds i8, i8* %164, i64 3, !dbg !251
  %171 = load i8, i8* %170, align 1, !dbg !251, !tbaa !165
  %172 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !253
  %173 = load i8*, i8** %172, align 8, !dbg !253, !tbaa !18
  %174 = load i8, i8* %173, align 1, !dbg !254, !tbaa !165
  %175 = getelementptr inbounds i8, i8* %173, i64 1, !dbg !254
  %176 = load i8, i8* %175, align 1, !dbg !254, !tbaa !165
  %177 = getelementptr inbounds i8, i8* %173, i64 2, !dbg !254
  %178 = load i8, i8* %177, align 1, !dbg !254, !tbaa !165
  %179 = getelementptr inbounds i8, i8* %173, i64 3, !dbg !254
  %180 = load i8, i8* %179, align 1, !dbg !254, !tbaa !165
  %181 = zext i8 %162 to i32, !dbg !256
  %182 = shl nuw i32 %181, 24, !dbg !256
  %183 = zext i8 %160 to i32, !dbg !256
  %184 = shl nuw nsw i32 %183, 16, !dbg !256
  %185 = zext i8 %158 to i32, !dbg !256
  %186 = shl nuw nsw i32 %185, 8, !dbg !256
  %187 = zext i8 %156 to i32, !dbg !256
  %188 = or i32 %186, %187, !dbg !256
  %189 = or i32 %188, %184, !dbg !256
  %190 = or i32 %189, %182, !dbg !256
  %191 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !257
  %192 = bitcast i8* %191 to %struct.ink_block*, !dbg !257
  %193 = icmp eq i8* %191, null, !dbg !259
  br i1 %193, label %194, label %195, !dbg !260

194:                                              ; preds = %145
  tail call fastcc void @ink_fail() #11, !dbg !261
  unreachable

195:                                              ; preds = %145
  %196 = zext i8 %153 to i32, !dbg !262
  %197 = shl nuw i32 %196, 24, !dbg !262
  %198 = zext i8 %151 to i32, !dbg !262
  %199 = shl nuw nsw i32 %198, 16, !dbg !262
  %200 = zext i8 %149 to i32, !dbg !262
  %201 = shl nuw nsw i32 %200, 8, !dbg !262
  %202 = zext i8 %147 to i32, !dbg !262
  %203 = or i32 %201, %202, !dbg !262
  %204 = or i32 %203, %199, !dbg !262
  %205 = or i32 %204, %197, !dbg !262
  %206 = urem i32 %205, 3, !dbg !263
  %207 = icmp eq i32 %206, 0, !dbg !265
  %208 = zext i8 %180 to i32, !dbg !263
  %209 = shl nuw i32 %208, 24, !dbg !263
  %210 = zext i8 %178 to i32, !dbg !263
  %211 = shl nuw nsw i32 %210, 16, !dbg !263
  %212 = zext i8 %176 to i32, !dbg !263
  %213 = shl nuw nsw i32 %212, 8, !dbg !263
  %214 = zext i8 %174 to i32, !dbg !263
  %215 = or i32 %213, %214, !dbg !263
  %216 = or i32 %215, %211, !dbg !263
  %217 = or i32 %216, %209, !dbg !263
  %218 = mul i32 %217, %190, !dbg !266
  %219 = zext i8 %171 to i32, !dbg !267
  %220 = shl nuw i32 %219, 24, !dbg !267
  %221 = zext i8 %169 to i32, !dbg !267
  %222 = shl nuw nsw i32 %221, 16, !dbg !267
  %223 = zext i8 %167 to i32, !dbg !267
  %224 = shl nuw nsw i32 %223, 8, !dbg !267
  %225 = zext i8 %165 to i32, !dbg !267
  %226 = or i32 %224, %225, !dbg !267
  %227 = or i32 %226, %222, !dbg !267
  %228 = or i32 %227, %220, !dbg !267
  %229 = add i32 %228, %190, !dbg !266
  %230 = select i1 %207, i32 %218, i32 %229, !dbg !266
  %231 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !268, !tbaa !18
  %232 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %192, i64 0, i32 0, !dbg !269
  store %struct.ink_block* %231, %struct.ink_block** %232, align 8, !dbg !270, !tbaa !24
  store i8* %191, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !271, !tbaa !18
  %233 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %192, i64 1, !dbg !272
  %234 = bitcast %struct.ink_block* %233 to i32*, !dbg !273
  store i32 %230, i32* %234, align 4, !dbg !274, !tbaa !99
  %235 = bitcast i8** %3 to %struct.ink_block**, !dbg !275
  store %struct.ink_block* %233, %struct.ink_block** %235, align 8, !dbg !275, !tbaa !18
  br label %329

236:                                              ; preds = %5
  %237 = load i8*, i8** %1, align 8, !dbg !276, !tbaa !18
  %238 = load i8, i8* %237, align 1, !dbg !277, !tbaa !165
  %239 = getelementptr inbounds i8, i8* %237, i64 1, !dbg !277
  %240 = load i8, i8* %239, align 1, !dbg !277, !tbaa !165
  %241 = getelementptr inbounds i8, i8* %237, i64 2, !dbg !277
  %242 = load i8, i8* %241, align 1, !dbg !277, !tbaa !165
  %243 = getelementptr inbounds i8, i8* %237, i64 3, !dbg !277
  %244 = load i8, i8* %243, align 1, !dbg !277, !tbaa !165
  %245 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !279
  %246 = load i8*, i8** %245, align 8, !dbg !279, !tbaa !18
  %247 = load i8, i8* %246, align 1, !dbg !280, !tbaa !165
  %248 = getelementptr inbounds i8, i8* %246, i64 1, !dbg !280
  %249 = load i8, i8* %248, align 1, !dbg !280, !tbaa !165
  %250 = getelementptr inbounds i8, i8* %246, i64 2, !dbg !280
  %251 = load i8, i8* %250, align 1, !dbg !280, !tbaa !165
  %252 = getelementptr inbounds i8, i8* %246, i64 3, !dbg !280
  %253 = load i8, i8* %252, align 1, !dbg !280, !tbaa !165
  %254 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !282
  %255 = load i8*, i8** %254, align 8, !dbg !282, !tbaa !18
  %256 = load i8, i8* %255, align 1, !dbg !283, !tbaa !165
  %257 = getelementptr inbounds i8, i8* %255, i64 1, !dbg !283
  %258 = load i8, i8* %257, align 1, !dbg !283, !tbaa !165
  %259 = getelementptr inbounds i8, i8* %255, i64 2, !dbg !283
  %260 = load i8, i8* %259, align 1, !dbg !283, !tbaa !165
  %261 = getelementptr inbounds i8, i8* %255, i64 3, !dbg !283
  %262 = load i8, i8* %261, align 1, !dbg !283, !tbaa !165
  %263 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !285
  %264 = load i8*, i8** %263, align 8, !dbg !285, !tbaa !18
  %265 = load i8, i8* %264, align 1, !dbg !286, !tbaa !165
  %266 = getelementptr inbounds i8, i8* %264, i64 1, !dbg !286
  %267 = load i8, i8* %266, align 1, !dbg !286, !tbaa !165
  %268 = getelementptr inbounds i8, i8* %264, i64 2, !dbg !286
  %269 = load i8, i8* %268, align 1, !dbg !286, !tbaa !165
  %270 = getelementptr inbounds i8, i8* %264, i64 3, !dbg !286
  %271 = load i8, i8* %270, align 1, !dbg !286, !tbaa !165
  %272 = zext i8 %244 to i32, !dbg !288
  %273 = shl nuw i32 %272, 24, !dbg !288
  %274 = zext i8 %242 to i32, !dbg !288
  %275 = shl nuw nsw i32 %274, 16, !dbg !288
  %276 = zext i8 %240 to i32, !dbg !288
  %277 = shl nuw nsw i32 %276, 8, !dbg !288
  %278 = zext i8 %238 to i32, !dbg !288
  %279 = or i32 %277, %278, !dbg !288
  %280 = or i32 %279, %275, !dbg !288
  %281 = or i32 %280, %273, !dbg !288
  %282 = zext i8 %253 to i32, !dbg !289
  %283 = shl nuw i32 %282, 24, !dbg !289
  %284 = zext i8 %251 to i32, !dbg !289
  %285 = shl nuw nsw i32 %284, 16, !dbg !289
  %286 = zext i8 %249 to i32, !dbg !289
  %287 = shl nuw nsw i32 %286, 8, !dbg !289
  %288 = zext i8 %247 to i32, !dbg !289
  %289 = or i32 %287, %288, !dbg !289
  %290 = or i32 %289, %285, !dbg !289
  %291 = or i32 %290, %283, !dbg !289
  %292 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !290
  %293 = bitcast i8* %292 to %struct.ink_block*, !dbg !290
  %294 = icmp eq i8* %292, null, !dbg !292
  br i1 %294, label %295, label %296, !dbg !293

295:                                              ; preds = %236
  tail call fastcc void @ink_fail() #11, !dbg !294
  unreachable

296:                                              ; preds = %236
  %297 = icmp ult i32 %281, %291, !dbg !295
  %298 = zext i8 %271 to i32, !dbg !295
  %299 = shl nuw i32 %298, 24, !dbg !295
  %300 = zext i8 %269 to i32, !dbg !295
  %301 = shl nuw nsw i32 %300, 16, !dbg !295
  %302 = zext i8 %267 to i32, !dbg !295
  %303 = shl nuw nsw i32 %302, 8, !dbg !295
  %304 = zext i8 %265 to i32, !dbg !295
  %305 = or i32 %303, %304, !dbg !295
  %306 = or i32 %305, %301, !dbg !295
  %307 = or i32 %306, %299, !dbg !295
  %308 = mul i32 %307, %291, !dbg !297
  %309 = add i32 %308, %281, !dbg !297
  %310 = sub i32 %281, %291, !dbg !297
  %311 = zext i8 %262 to i32, !dbg !298
  %312 = shl nuw i32 %311, 24, !dbg !298
  %313 = zext i8 %260 to i32, !dbg !298
  %314 = shl nuw nsw i32 %313, 16, !dbg !298
  %315 = zext i8 %258 to i32, !dbg !298
  %316 = shl nuw nsw i32 %315, 8, !dbg !298
  %317 = zext i8 %256 to i32, !dbg !298
  %318 = or i32 %316, %317, !dbg !298
  %319 = or i32 %318, %314, !dbg !298
  %320 = or i32 %319, %312, !dbg !298
  %321 = add i32 %310, %320, !dbg !297
  %322 = select i1 %297, i32 %309, i32 %321, !dbg !297
  %323 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !299, !tbaa !18
  %324 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %293, i64 0, i32 0, !dbg !300
  store %struct.ink_block* %323, %struct.ink_block** %324, align 8, !dbg !301, !tbaa !24
  store i8* %292, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !302, !tbaa !18
  %325 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %293, i64 1, !dbg !303
  %326 = bitcast %struct.ink_block* %325 to i32*, !dbg !304
  store i32 %322, i32* %326, align 4, !dbg !305, !tbaa !99
  %327 = bitcast i8** %3 to %struct.ink_block**, !dbg !306
  store %struct.ink_block* %325, %struct.ink_block** %327, align 8, !dbg !306, !tbaa !18
  br label %329

328:                                              ; preds = %5
  tail call fastcc void @ink_fail(), !dbg !307
  unreachable

329:                                              ; preds = %296, %195, %105, %6
  %330 = phi i64 [ 1, %296 ], [ 1, %195 ], [ 1, %105 ], [ %53, %6 ]
  store i64 %330, i64* %4, align 8, !dbg !308, !tbaa !170
  ret void, !dbg !309
}

; Function Attrs: nounwind ssp uwtable
define i32 @ink_compute_scalar32(i32 %0, i8** nocapture readonly %1, i64* nocapture readnone %2) local_unnamed_addr #0 !dbg !310 {
  switch i32 %0, label %247 [
    i32 1, label %4
    i32 2, label %84
    i32 3, label %165
  ], !dbg !311

4:                                                ; preds = %3
  %5 = load i8*, i8** %1, align 8, !dbg !312, !tbaa !18
  %6 = load i8, i8* %5, align 1, !dbg !313, !tbaa !165
  %7 = getelementptr inbounds i8, i8* %5, i64 1, !dbg !313
  %8 = load i8, i8* %7, align 1, !dbg !313, !tbaa !165
  %9 = getelementptr inbounds i8, i8* %5, i64 2, !dbg !313
  %10 = load i8, i8* %9, align 1, !dbg !313, !tbaa !165
  %11 = getelementptr inbounds i8, i8* %5, i64 3, !dbg !313
  %12 = load i8, i8* %11, align 1, !dbg !313, !tbaa !165
  %13 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !315
  %14 = load i8*, i8** %13, align 8, !dbg !315, !tbaa !18
  %15 = load i8, i8* %14, align 1, !dbg !316, !tbaa !165
  %16 = getelementptr inbounds i8, i8* %14, i64 1, !dbg !316
  %17 = load i8, i8* %16, align 1, !dbg !316, !tbaa !165
  %18 = getelementptr inbounds i8, i8* %14, i64 2, !dbg !316
  %19 = load i8, i8* %18, align 1, !dbg !316, !tbaa !165
  %20 = getelementptr inbounds i8, i8* %14, i64 3, !dbg !316
  %21 = load i8, i8* %20, align 1, !dbg !316, !tbaa !165
  %22 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !318
  %23 = load i8*, i8** %22, align 8, !dbg !318, !tbaa !18
  %24 = load i8, i8* %23, align 1, !dbg !319, !tbaa !165
  %25 = getelementptr inbounds i8, i8* %23, i64 1, !dbg !319
  %26 = load i8, i8* %25, align 1, !dbg !319, !tbaa !165
  %27 = getelementptr inbounds i8, i8* %23, i64 2, !dbg !319
  %28 = load i8, i8* %27, align 1, !dbg !319, !tbaa !165
  %29 = getelementptr inbounds i8, i8* %23, i64 3, !dbg !319
  %30 = load i8, i8* %29, align 1, !dbg !319, !tbaa !165
  %31 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !321
  %32 = load i8*, i8** %31, align 8, !dbg !321, !tbaa !18
  %33 = load i8, i8* %32, align 1, !dbg !322, !tbaa !165
  %34 = getelementptr inbounds i8, i8* %32, i64 1, !dbg !322
  %35 = load i8, i8* %34, align 1, !dbg !322, !tbaa !165
  %36 = getelementptr inbounds i8, i8* %32, i64 2, !dbg !322
  %37 = load i8, i8* %36, align 1, !dbg !322, !tbaa !165
  %38 = getelementptr inbounds i8, i8* %32, i64 3, !dbg !322
  %39 = load i8, i8* %38, align 1, !dbg !322, !tbaa !165
  %40 = zext i8 %12 to i32, !dbg !324
  %41 = shl nuw i32 %40, 24, !dbg !324
  %42 = zext i8 %10 to i32, !dbg !324
  %43 = shl nuw nsw i32 %42, 16, !dbg !324
  %44 = zext i8 %8 to i32, !dbg !324
  %45 = shl nuw nsw i32 %44, 8, !dbg !324
  %46 = zext i8 %6 to i32, !dbg !324
  %47 = or i32 %45, %46, !dbg !324
  %48 = or i32 %47, %43, !dbg !324
  %49 = or i32 %48, %41, !dbg !324
  %50 = zext i8 %21 to i32, !dbg !325
  %51 = shl nuw i32 %50, 24, !dbg !325
  %52 = zext i8 %19 to i32, !dbg !325
  %53 = shl nuw nsw i32 %52, 16, !dbg !325
  %54 = zext i8 %17 to i32, !dbg !325
  %55 = shl nuw nsw i32 %54, 8, !dbg !325
  %56 = zext i8 %15 to i32, !dbg !325
  %57 = or i32 %55, %56, !dbg !325
  %58 = or i32 %57, %53, !dbg !325
  %59 = or i32 %58, %51, !dbg !325
  %60 = zext i8 %30 to i32, !dbg !326
  %61 = shl nuw i32 %60, 24, !dbg !326
  %62 = zext i8 %28 to i32, !dbg !326
  %63 = shl nuw nsw i32 %62, 16, !dbg !326
  %64 = zext i8 %26 to i32, !dbg !326
  %65 = shl nuw nsw i32 %64, 8, !dbg !326
  %66 = zext i8 %24 to i32, !dbg !326
  %67 = or i32 %65, %66, !dbg !326
  %68 = or i32 %67, %63, !dbg !326
  %69 = or i32 %68, %61, !dbg !326
  %70 = zext i8 %39 to i32, !dbg !327
  %71 = shl nuw i32 %70, 24, !dbg !327
  %72 = zext i8 %37 to i32, !dbg !327
  %73 = shl nuw nsw i32 %72, 16, !dbg !327
  %74 = zext i8 %35 to i32, !dbg !327
  %75 = shl nuw nsw i32 %74, 8, !dbg !327
  %76 = zext i8 %33 to i32, !dbg !327
  %77 = or i32 %75, %76, !dbg !327
  %78 = or i32 %77, %73, !dbg !327
  %79 = or i32 %78, %71, !dbg !327
  %80 = icmp ult i32 %49, %69, !dbg !327
  %81 = sub i32 0, %69, !dbg !329
  %82 = select i1 %80, i32 %79, i32 %81, !dbg !329
  %83 = add i32 %82, %59, !dbg !329
  br label %248

84:                                               ; preds = %3
  %85 = load i8*, i8** %1, align 8, !dbg !330, !tbaa !18
  %86 = load i8, i8* %85, align 1, !dbg !331, !tbaa !165
  %87 = getelementptr inbounds i8, i8* %85, i64 1, !dbg !331
  %88 = load i8, i8* %87, align 1, !dbg !331, !tbaa !165
  %89 = getelementptr inbounds i8, i8* %85, i64 2, !dbg !331
  %90 = load i8, i8* %89, align 1, !dbg !331, !tbaa !165
  %91 = getelementptr inbounds i8, i8* %85, i64 3, !dbg !331
  %92 = load i8, i8* %91, align 1, !dbg !331, !tbaa !165
  %93 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !333
  %94 = load i8*, i8** %93, align 8, !dbg !333, !tbaa !18
  %95 = load i8, i8* %94, align 1, !dbg !334, !tbaa !165
  %96 = getelementptr inbounds i8, i8* %94, i64 1, !dbg !334
  %97 = load i8, i8* %96, align 1, !dbg !334, !tbaa !165
  %98 = getelementptr inbounds i8, i8* %94, i64 2, !dbg !334
  %99 = load i8, i8* %98, align 1, !dbg !334, !tbaa !165
  %100 = getelementptr inbounds i8, i8* %94, i64 3, !dbg !334
  %101 = load i8, i8* %100, align 1, !dbg !334, !tbaa !165
  %102 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !336
  %103 = load i8*, i8** %102, align 8, !dbg !336, !tbaa !18
  %104 = load i8, i8* %103, align 1, !dbg !337, !tbaa !165
  %105 = getelementptr inbounds i8, i8* %103, i64 1, !dbg !337
  %106 = load i8, i8* %105, align 1, !dbg !337, !tbaa !165
  %107 = getelementptr inbounds i8, i8* %103, i64 2, !dbg !337
  %108 = load i8, i8* %107, align 1, !dbg !337, !tbaa !165
  %109 = getelementptr inbounds i8, i8* %103, i64 3, !dbg !337
  %110 = load i8, i8* %109, align 1, !dbg !337, !tbaa !165
  %111 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !339
  %112 = load i8*, i8** %111, align 8, !dbg !339, !tbaa !18
  %113 = load i8, i8* %112, align 1, !dbg !340, !tbaa !165
  %114 = getelementptr inbounds i8, i8* %112, i64 1, !dbg !340
  %115 = load i8, i8* %114, align 1, !dbg !340, !tbaa !165
  %116 = getelementptr inbounds i8, i8* %112, i64 2, !dbg !340
  %117 = load i8, i8* %116, align 1, !dbg !340, !tbaa !165
  %118 = getelementptr inbounds i8, i8* %112, i64 3, !dbg !340
  %119 = load i8, i8* %118, align 1, !dbg !340, !tbaa !165
  %120 = zext i8 %92 to i32, !dbg !342
  %121 = shl nuw i32 %120, 24, !dbg !342
  %122 = zext i8 %90 to i32, !dbg !342
  %123 = shl nuw nsw i32 %122, 16, !dbg !342
  %124 = zext i8 %88 to i32, !dbg !342
  %125 = shl nuw nsw i32 %124, 8, !dbg !342
  %126 = zext i8 %86 to i32, !dbg !342
  %127 = or i32 %125, %126, !dbg !342
  %128 = or i32 %127, %123, !dbg !342
  %129 = or i32 %128, %121, !dbg !342
  %130 = zext i8 %101 to i32, !dbg !343
  %131 = shl nuw i32 %130, 24, !dbg !343
  %132 = zext i8 %99 to i32, !dbg !343
  %133 = shl nuw nsw i32 %132, 16, !dbg !343
  %134 = zext i8 %97 to i32, !dbg !343
  %135 = shl nuw nsw i32 %134, 8, !dbg !343
  %136 = zext i8 %95 to i32, !dbg !343
  %137 = or i32 %135, %136, !dbg !343
  %138 = or i32 %137, %133, !dbg !343
  %139 = or i32 %138, %131, !dbg !343
  %140 = zext i8 %110 to i32, !dbg !344
  %141 = shl nuw i32 %140, 24, !dbg !344
  %142 = zext i8 %108 to i32, !dbg !344
  %143 = shl nuw nsw i32 %142, 16, !dbg !344
  %144 = zext i8 %106 to i32, !dbg !344
  %145 = shl nuw nsw i32 %144, 8, !dbg !344
  %146 = zext i8 %104 to i32, !dbg !344
  %147 = or i32 %145, %146, !dbg !344
  %148 = or i32 %147, %143, !dbg !344
  %149 = or i32 %148, %141, !dbg !344
  %150 = zext i8 %119 to i32, !dbg !345
  %151 = shl nuw i32 %150, 24, !dbg !345
  %152 = zext i8 %117 to i32, !dbg !345
  %153 = shl nuw nsw i32 %152, 16, !dbg !345
  %154 = zext i8 %115 to i32, !dbg !345
  %155 = shl nuw nsw i32 %154, 8, !dbg !345
  %156 = zext i8 %113 to i32, !dbg !345
  %157 = or i32 %155, %156, !dbg !345
  %158 = or i32 %157, %153, !dbg !345
  %159 = or i32 %158, %151, !dbg !345
  %160 = urem i32 %129, 3, !dbg !345
  %161 = icmp eq i32 %160, 0, !dbg !347
  %162 = mul i32 %159, %139, !dbg !348
  %163 = add i32 %149, %139, !dbg !348
  %164 = select i1 %161, i32 %162, i32 %163, !dbg !348
  br label %248

165:                                              ; preds = %3
  %166 = load i8*, i8** %1, align 8, !dbg !349, !tbaa !18
  %167 = load i8, i8* %166, align 1, !dbg !350, !tbaa !165
  %168 = getelementptr inbounds i8, i8* %166, i64 1, !dbg !350
  %169 = load i8, i8* %168, align 1, !dbg !350, !tbaa !165
  %170 = getelementptr inbounds i8, i8* %166, i64 2, !dbg !350
  %171 = load i8, i8* %170, align 1, !dbg !350, !tbaa !165
  %172 = getelementptr inbounds i8, i8* %166, i64 3, !dbg !350
  %173 = load i8, i8* %172, align 1, !dbg !350, !tbaa !165
  %174 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !352
  %175 = load i8*, i8** %174, align 8, !dbg !352, !tbaa !18
  %176 = load i8, i8* %175, align 1, !dbg !353, !tbaa !165
  %177 = getelementptr inbounds i8, i8* %175, i64 1, !dbg !353
  %178 = load i8, i8* %177, align 1, !dbg !353, !tbaa !165
  %179 = getelementptr inbounds i8, i8* %175, i64 2, !dbg !353
  %180 = load i8, i8* %179, align 1, !dbg !353, !tbaa !165
  %181 = getelementptr inbounds i8, i8* %175, i64 3, !dbg !353
  %182 = load i8, i8* %181, align 1, !dbg !353, !tbaa !165
  %183 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !355
  %184 = load i8*, i8** %183, align 8, !dbg !355, !tbaa !18
  %185 = load i8, i8* %184, align 1, !dbg !356, !tbaa !165
  %186 = getelementptr inbounds i8, i8* %184, i64 1, !dbg !356
  %187 = load i8, i8* %186, align 1, !dbg !356, !tbaa !165
  %188 = getelementptr inbounds i8, i8* %184, i64 2, !dbg !356
  %189 = load i8, i8* %188, align 1, !dbg !356, !tbaa !165
  %190 = getelementptr inbounds i8, i8* %184, i64 3, !dbg !356
  %191 = load i8, i8* %190, align 1, !dbg !356, !tbaa !165
  %192 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !358
  %193 = load i8*, i8** %192, align 8, !dbg !358, !tbaa !18
  %194 = load i8, i8* %193, align 1, !dbg !359, !tbaa !165
  %195 = getelementptr inbounds i8, i8* %193, i64 1, !dbg !359
  %196 = load i8, i8* %195, align 1, !dbg !359, !tbaa !165
  %197 = getelementptr inbounds i8, i8* %193, i64 2, !dbg !359
  %198 = load i8, i8* %197, align 1, !dbg !359, !tbaa !165
  %199 = getelementptr inbounds i8, i8* %193, i64 3, !dbg !359
  %200 = load i8, i8* %199, align 1, !dbg !359, !tbaa !165
  %201 = zext i8 %173 to i32, !dbg !361
  %202 = shl nuw i32 %201, 24, !dbg !361
  %203 = zext i8 %171 to i32, !dbg !361
  %204 = shl nuw nsw i32 %203, 16, !dbg !361
  %205 = zext i8 %169 to i32, !dbg !361
  %206 = shl nuw nsw i32 %205, 8, !dbg !361
  %207 = zext i8 %167 to i32, !dbg !361
  %208 = or i32 %206, %207, !dbg !361
  %209 = or i32 %208, %204, !dbg !361
  %210 = or i32 %209, %202, !dbg !361
  %211 = zext i8 %182 to i32, !dbg !362
  %212 = shl nuw i32 %211, 24, !dbg !362
  %213 = zext i8 %180 to i32, !dbg !362
  %214 = shl nuw nsw i32 %213, 16, !dbg !362
  %215 = zext i8 %178 to i32, !dbg !362
  %216 = shl nuw nsw i32 %215, 8, !dbg !362
  %217 = zext i8 %176 to i32, !dbg !362
  %218 = or i32 %216, %217, !dbg !362
  %219 = or i32 %218, %214, !dbg !362
  %220 = or i32 %219, %212, !dbg !362
  %221 = zext i8 %191 to i32, !dbg !363
  %222 = shl nuw i32 %221, 24, !dbg !363
  %223 = zext i8 %189 to i32, !dbg !363
  %224 = shl nuw nsw i32 %223, 16, !dbg !363
  %225 = zext i8 %187 to i32, !dbg !363
  %226 = shl nuw nsw i32 %225, 8, !dbg !363
  %227 = zext i8 %185 to i32, !dbg !363
  %228 = or i32 %226, %227, !dbg !363
  %229 = or i32 %228, %224, !dbg !363
  %230 = or i32 %229, %222, !dbg !363
  %231 = zext i8 %200 to i32, !dbg !364
  %232 = shl nuw i32 %231, 24, !dbg !364
  %233 = zext i8 %198 to i32, !dbg !364
  %234 = shl nuw nsw i32 %233, 16, !dbg !364
  %235 = zext i8 %196 to i32, !dbg !364
  %236 = shl nuw nsw i32 %235, 8, !dbg !364
  %237 = zext i8 %194 to i32, !dbg !364
  %238 = or i32 %236, %237, !dbg !364
  %239 = or i32 %238, %234, !dbg !364
  %240 = or i32 %239, %232, !dbg !364
  %241 = icmp ult i32 %210, %220, !dbg !364
  %242 = mul i32 %240, %220, !dbg !366
  %243 = add i32 %242, %210, !dbg !366
  %244 = sub i32 %210, %220, !dbg !366
  %245 = add i32 %244, %230, !dbg !366
  %246 = select i1 %241, i32 %243, i32 %245, !dbg !366
  br label %248

247:                                              ; preds = %3
  tail call fastcc void @ink_fail(), !dbg !367
  unreachable

248:                                              ; preds = %165, %84, %4
  %249 = phi i32 [ %246, %165 ], [ %164, %84 ], [ %83, %4 ], !dbg !368
  ret i32 %249, !dbg !369
}

; Function Attrs: noreturn nounwind ssp uwtable
define i64 @ink_compute_scalar64(i32 %0, i8** nocapture readnone %1, i64* nocapture readnone %2) local_unnamed_addr #3 !dbg !370 {
  tail call fastcc void @ink_fail(), !dbg !371
  unreachable
}

; Function Attrs: cold noreturn
declare void @abort() local_unnamed_addr #7

; Function Attrs: mustprogress nofree nosync nounwind readnone speculatable willreturn
declare { i64, i1 } @llvm.umul.with.overflow.i64(i64, i64) #8

attributes #0 = { nounwind ssp uwtable "frame-pointer"="non-leaf" "min-legal-vector-width"="0" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #1 = { inaccessiblemem_or_argmemonly mustprogress nounwind willreturn "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #2 = { mustprogress nofree norecurse nosync nounwind readonly ssp uwtable willreturn "frame-pointer"="non-leaf" "min-legal-vector-width"="0" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #3 = { noreturn nounwind ssp uwtable "frame-pointer"="non-leaf" "min-legal-vector-width"="0" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #4 = { inaccessiblememonly mustprogress nofree nounwind willreturn allocsize(0) "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #5 = { mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn "frame-pointer"="non-leaf" "min-legal-vector-width"="0" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #6 = { nofree norecurse nosync nounwind ssp uwtable "frame-pointer"="non-leaf" "min-legal-vector-width"="0" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #7 = { cold noreturn "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #8 = { mustprogress nofree nosync nounwind readnone speculatable willreturn }
attributes #9 = { allocsize(0) }
attributes #10 = { cold noreturn nounwind }
attributes #11 = { nounwind }
attributes #12 = { nounwind allocsize(0) }

!llvm.module.flags = !{!0, !1, !2, !3, !4, !5, !6, !7, !8, !9}
!llvm.dbg.cu = !{!10}
!llvm.ident = !{!12}

!0 = !{i32 2, !"SDK Version", [2 x i32] [i32 13, i32 1]}
!1 = !{i32 2, !"Debug Info Version", i32 3}
!2 = !{i32 1, !"wchar_size", i32 4}
!3 = !{i32 1, !"branch-target-enforcement", i32 0}
!4 = !{i32 1, !"sign-return-address", i32 0}
!5 = !{i32 1, !"sign-return-address-all", i32 0}
!6 = !{i32 1, !"sign-return-address-with-bkey", i32 0}
!7 = !{i32 7, !"PIC Level", i32 2}
!8 = !{i32 7, !"uwtable", i32 1}
!9 = !{i32 7, !"frame-pointer", i32 1}
!10 = distinct !DICompileUnit(language: DW_LANG_C99, file: !11, producer: "Apple clang version 14.0.0 (clang-1400.0.29.202)", isOptimized: true, runtimeVersion: 0, emissionKind: NoDebug, splitDebugInlining: false, nameTableKind: None, sysroot: "/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk", sdk: "MacOSX.sdk")
!11 = !DIFile(filename: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_u32/checked/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
!12 = !{!"Apple clang version 14.0.0 (clang-1400.0.29.202)"}
!13 = distinct !DISubprogram(name: "ink_compute_reset", scope: !14, file: !14, line: 29, type: !15, scopeLine: 29, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!14 = !DIFile(filename: "reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_u32/checked/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
!15 = !DISubroutineType(types: !16)
!16 = !{}
!17 = !DILocation(line: 29, column: 36, scope: !13)
!18 = !{!19, !19, i64 0}
!19 = !{!"any pointer", !20, i64 0}
!20 = !{!"omnipotent char", !21, i64 0}
!21 = !{!"Simple C/C++ TBAA"}
!22 = !DILocation(line: 29, column: 30, scope: !13)
!23 = !DILocation(line: 29, column: 86, scope: !13)
!24 = !{!25, !19, i64 0}
!25 = !{!"ink_block", !19, i64 0, !26, i64 8}
!26 = !{!"long long", !20, i64 0}
!27 = !DILocation(line: 29, column: 82, scope: !13)
!28 = !DILocation(line: 29, column: 96, scope: !13)
!29 = !DILocation(line: 29, column: 91, scope: !13)
!30 = distinct !{!30, !22, !31, !32}
!31 = !DILocation(line: 29, column: 99, scope: !13)
!32 = !{!"llvm.loop.mustprogress"}
!33 = !DILocation(line: 29, column: 100, scope: !13)
!34 = distinct !DISubprogram(name: "ink_compute_mark", scope: !14, file: !14, line: 30, type: !15, scopeLine: 30, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!35 = !DILocation(line: 30, column: 46, scope: !34)
!36 = !DILocation(line: 30, column: 38, scope: !34)
!37 = !DILocation(line: 30, column: 31, scope: !34)
!38 = distinct !DISubprogram(name: "ink_compute_rewind", scope: !14, file: !14, line: 31, type: !15, scopeLine: 31, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!39 = !DILocation(line: 31, column: 44, scope: !38)
!40 = !DILocation(line: 31, column: 54, scope: !38)
!41 = !DILocation(line: 31, column: 38, scope: !38)
!42 = !DILocation(line: 31, column: 111, scope: !38)
!43 = !DILocation(line: 31, column: 121, scope: !38)
!44 = !DILocation(line: 31, column: 116, scope: !38)
!45 = distinct !{!45, !41, !46, !32}
!46 = !DILocation(line: 31, column: 124, scope: !38)
!47 = !DILocation(line: 0, scope: !38)
!48 = !DILocation(line: 31, column: 125, scope: !38)
!49 = distinct !DISubprogram(name: "ink_alloc", scope: !14, file: !14, line: 32, type: !15, scopeLine: 32, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!50 = !DILocation(line: 32, column: 48, scope: !49)
!51 = !DILocation(line: 32, column: 53, scope: !49)
!52 = !DILocation(line: 32, column: 60, scope: !49)
!53 = !DILocation(line: 32, column: 47, scope: !49)
!54 = !DILocation(line: 32, column: 76, scope: !49)
!55 = !DILocation(line: 32, column: 101, scope: !49)
!56 = !DILocation(line: 32, column: 115, scope: !49)
!57 = !DILocation(line: 32, column: 130, scope: !49)
!58 = !DILocation(line: 32, column: 125, scope: !49)
!59 = !DILocation(line: 32, column: 158, scope: !49)
!60 = !DILocation(line: 32, column: 198, scope: !49)
!61 = !DILocation(line: 32, column: 181, scope: !49)
!62 = !DILocation(line: 32, column: 210, scope: !49)
!63 = !DILocation(line: 32, column: 209, scope: !49)
!64 = !DILocation(line: 32, column: 212, scope: !49)
!65 = !DILocation(line: 32, column: 231, scope: !49)
!66 = !DILocation(line: 32, column: 226, scope: !49)
!67 = !DILocation(line: 32, column: 230, scope: !49)
!68 = !DILocation(line: 32, column: 252, scope: !49)
!69 = !DILocation(line: 32, column: 263, scope: !49)
!70 = !DILocation(line: 32, column: 262, scope: !49)
!71 = !DILocation(line: 32, column: 255, scope: !49)
!72 = distinct !DISubprogram(name: "ink_fail", scope: !14, file: !14, line: 28, type: !15, scopeLine: 28, flags: DIFlagPrototyped, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!73 = !DILocation(line: 28, column: 28, scope: !72)
!74 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_u32", scope: !14, file: !14, line: 82, type: !15, scopeLine: 82, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!75 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !76)
!76 = distinct !DILocation(line: 89, column: 18, scope: !74)
!77 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !76)
!78 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !76)
!79 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !76)
!80 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !76)
!81 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !76)
!82 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !76)
!83 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !76)
!84 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !76)
!85 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !76)
!86 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !76)
!87 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !76)
!88 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !76)
!89 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !76)
!90 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !76)
!91 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !76)
!92 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !76)
!93 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !76)
!94 = !DILocation(line: 89, column: 18, scope: !74)
!95 = !DILocation(line: 90, column: 1, scope: !74)
!96 = !DILocation(line: 90, column: 29, scope: !74)
!97 = !DILocation(line: 91, column: 13, scope: !74)
!98 = !DILocation(line: 93, column: 13, scope: !74)
!99 = !{!100, !100, i64 0}
!100 = !{!"int", !20, i64 0}
!101 = !{!102}
!102 = distinct !{!102, !103}
!103 = distinct !{!103, !"LVerDomain"}
!104 = !DILocation(line: 103, column: 9, scope: !74)
!105 = !DILocation(line: 103, column: 5, scope: !74)
!106 = !DILocation(line: 130, column: 18, scope: !74)
!107 = !DILocation(line: 134, column: 10, scope: !74)
!108 = !DILocation(line: 134, column: 5, scope: !74)
!109 = !DILocation(line: 153, column: 10, scope: !74)
!110 = !DILocation(line: 153, column: 5, scope: !74)
!111 = !DILocation(line: 166, column: 12, scope: !74)
!112 = !{!113}
!113 = distinct !{!113, !103}
!114 = distinct !{!114, !95, !115, !32, !116}
!115 = !DILocation(line: 167, column: 1, scope: !74)
!116 = !{!"llvm.loop.isvectorized", i32 1}
!117 = !DILocation(line: 169, column: 1, scope: !74)
!118 = !DILocation(line: 166, column: 1, scope: !74)
!119 = !DILocation(line: 90, column: 19, scope: !74)
!120 = distinct !{!120, !95, !115, !32, !116}
!121 = distinct !DISubprogram(name: "lang_fn_left_word", scope: !14, file: !14, line: 170, type: !15, scopeLine: 170, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!122 = !DILocation(line: 178, column: 9, scope: !121)
!123 = !DILocation(line: 178, column: 5, scope: !121)
!124 = !DILocation(line: 187, column: 1, scope: !121)
!125 = distinct !DISubprogram(name: "lang_fn_right_word", scope: !14, file: !14, line: 189, type: !15, scopeLine: 189, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!126 = !DILocation(line: 201, column: 16, scope: !125)
!127 = !DILocation(line: 205, column: 9, scope: !125)
!128 = !DILocation(line: 205, column: 5, scope: !125)
!129 = !DILocation(line: 214, column: 1, scope: !125)
!130 = distinct !DISubprogram(name: "lang_fn_pair_word", scope: !14, file: !14, line: 216, type: !15, scopeLine: 216, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!131 = !DILocation(line: 224, column: 9, scope: !130)
!132 = !DILocation(line: 224, column: 5, scope: !130)
!133 = !DILocation(line: 237, column: 1, scope: !130)
!134 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_u32_into", scope: !14, file: !14, line: 239, type: !15, scopeLine: 239, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!135 = !DILocation(line: 247, column: 1, scope: !134)
!136 = !DILocation(line: 247, column: 29, scope: !134)
!137 = !DILocation(line: 248, column: 13, scope: !134)
!138 = !DILocation(line: 250, column: 13, scope: !134)
!139 = !{!140}
!140 = distinct !{!140, !141}
!141 = distinct !{!141, !"LVerDomain"}
!142 = !DILocation(line: 260, column: 9, scope: !134)
!143 = !DILocation(line: 260, column: 5, scope: !134)
!144 = !DILocation(line: 287, column: 18, scope: !134)
!145 = !DILocation(line: 291, column: 10, scope: !134)
!146 = !DILocation(line: 291, column: 5, scope: !134)
!147 = !DILocation(line: 310, column: 10, scope: !134)
!148 = !DILocation(line: 310, column: 5, scope: !134)
!149 = !DILocation(line: 323, column: 12, scope: !134)
!150 = !{!151}
!151 = distinct !{!151, !141}
!152 = distinct !{!152, !135, !153, !32, !116}
!153 = !DILocation(line: 324, column: 1, scope: !134)
!154 = !DILocation(line: 325, column: 1, scope: !134)
!155 = !DILocation(line: 323, column: 1, scope: !134)
!156 = !DILocation(line: 247, column: 19, scope: !134)
!157 = distinct !{!157, !135, !153, !32, !116}
!158 = distinct !DISubprogram(name: "ink_compute_into", scope: !14, file: !14, line: 327, type: !15, scopeLine: 327, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!159 = !DILocation(line: 327, column: 151, scope: !158)
!160 = !DILocation(line: 328, column: 34, scope: !158)
!161 = !DILocation(line: 328, column: 100, scope: !158)
!162 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !164)
!163 = distinct !DISubprogram(name: "ink_copy", scope: !14, file: !14, line: 37, type: !15, scopeLine: 37, flags: DIFlagPrototyped, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!164 = distinct !DILocation(line: 328, column: 87, scope: !158)
!165 = !{!20, !20, i64 0}
!166 = !DILocation(line: 328, column: 145, scope: !158)
!167 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !168)
!168 = distinct !DILocation(line: 328, column: 132, scope: !158)
!169 = !DILocation(line: 328, column: 235, scope: !158)
!170 = !{!171, !171, i64 0}
!171 = !{!"long", !20, i64 0}
!172 = !DILocation(line: 328, column: 280, scope: !158)
!173 = !DILocation(line: 328, column: 283, scope: !158)
!174 = !DILocation(line: 247, column: 1, scope: !134, inlinedAt: !175)
!175 = distinct !DILocation(line: 328, column: 172, scope: !158)
!176 = !DILocation(line: 247, column: 29, scope: !134, inlinedAt: !175)
!177 = !DILocation(line: 248, column: 13, scope: !134, inlinedAt: !175)
!178 = !DILocation(line: 250, column: 13, scope: !134, inlinedAt: !175)
!179 = !{!180}
!180 = distinct !{!180, !181}
!181 = distinct !{!181, !"LVerDomain"}
!182 = !DILocation(line: 260, column: 9, scope: !134, inlinedAt: !175)
!183 = !DILocation(line: 260, column: 5, scope: !134, inlinedAt: !175)
!184 = !DILocation(line: 287, column: 18, scope: !134, inlinedAt: !175)
!185 = !DILocation(line: 291, column: 10, scope: !134, inlinedAt: !175)
!186 = !DILocation(line: 291, column: 5, scope: !134, inlinedAt: !175)
!187 = !DILocation(line: 310, column: 10, scope: !134, inlinedAt: !175)
!188 = !DILocation(line: 310, column: 5, scope: !134, inlinedAt: !175)
!189 = !DILocation(line: 323, column: 12, scope: !134, inlinedAt: !175)
!190 = !{!191}
!191 = distinct !{!191, !181}
!192 = distinct !{!192, !174, !193, !32, !116}
!193 = !DILocation(line: 324, column: 1, scope: !134, inlinedAt: !175)
!194 = !DILocation(line: 323, column: 1, scope: !134, inlinedAt: !175)
!195 = !DILocation(line: 247, column: 19, scope: !134, inlinedAt: !175)
!196 = distinct !{!196, !174, !193, !32, !116}
!197 = !DILocation(line: 329, column: 9, scope: !158)
!198 = !DILocation(line: 329, column: 30, scope: !158)
!199 = distinct !DISubprogram(name: "ink_compute_call", scope: !14, file: !14, line: 330, type: !15, scopeLine: 330, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!200 = !DILocation(line: 330, column: 142, scope: !199)
!201 = !DILocation(line: 331, column: 34, scope: !199)
!202 = !DILocation(line: 331, column: 100, scope: !199)
!203 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !204)
!204 = distinct !DILocation(line: 331, column: 87, scope: !199)
!205 = !DILocation(line: 331, column: 145, scope: !199)
!206 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !207)
!207 = distinct !DILocation(line: 331, column: 132, scope: !199)
!208 = !DILocation(line: 331, column: 243, scope: !199)
!209 = !DILocation(line: 331, column: 288, scope: !199)
!210 = !DILocation(line: 331, column: 185, scope: !199)
!211 = !DILocation(line: 331, column: 300, scope: !199)
!212 = !DILocation(line: 331, column: 299, scope: !199)
!213 = !DILocation(line: 332, column: 34, scope: !199)
!214 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !215)
!215 = distinct !DILocation(line: 332, column: 21, scope: !199)
!216 = !DILocation(line: 332, column: 79, scope: !199)
!217 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !218)
!218 = distinct !DILocation(line: 332, column: 66, scope: !199)
!219 = !DILocation(line: 332, column: 124, scope: !199)
!220 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !221)
!221 = distinct !DILocation(line: 332, column: 111, scope: !199)
!222 = !DILocation(line: 332, column: 169, scope: !199)
!223 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !224)
!224 = distinct !DILocation(line: 332, column: 156, scope: !199)
!225 = !DILocation(line: 332, column: 232, scope: !199)
!226 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !227)
!227 = distinct !DILocation(line: 332, column: 251, scope: !199)
!228 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !227)
!229 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !227)
!230 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !227)
!231 = !DILocation(line: 332, column: 226, scope: !199)
!232 = !DILocation(line: 178, column: 9, scope: !121, inlinedAt: !233)
!233 = distinct !DILocation(line: 332, column: 205, scope: !199)
!234 = !DILocation(line: 178, column: 5, scope: !121, inlinedAt: !233)
!235 = !DILocation(line: 332, column: 229, scope: !199)
!236 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !227)
!237 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !227)
!238 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !227)
!239 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !227)
!240 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !227)
!241 = !DILocation(line: 332, column: 251, scope: !199)
!242 = !DILocation(line: 332, column: 284, scope: !199)
!243 = !DILocation(line: 332, column: 299, scope: !199)
!244 = !DILocation(line: 333, column: 34, scope: !199)
!245 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !246)
!246 = distinct !DILocation(line: 333, column: 21, scope: !199)
!247 = !DILocation(line: 333, column: 79, scope: !199)
!248 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !249)
!249 = distinct !DILocation(line: 333, column: 66, scope: !199)
!250 = !DILocation(line: 333, column: 124, scope: !199)
!251 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !252)
!252 = distinct !DILocation(line: 333, column: 111, scope: !199)
!253 = !DILocation(line: 333, column: 169, scope: !199)
!254 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !255)
!255 = distinct !DILocation(line: 333, column: 156, scope: !199)
!256 = !DILocation(line: 333, column: 230, scope: !199)
!257 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !258)
!258 = distinct !DILocation(line: 333, column: 252, scope: !199)
!259 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !258)
!260 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !258)
!261 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !258)
!262 = !DILocation(line: 333, column: 227, scope: !199)
!263 = !DILocation(line: 201, column: 16, scope: !125, inlinedAt: !264)
!264 = distinct !DILocation(line: 333, column: 205, scope: !199)
!265 = !DILocation(line: 205, column: 9, scope: !125, inlinedAt: !264)
!266 = !DILocation(line: 205, column: 5, scope: !125, inlinedAt: !264)
!267 = !DILocation(line: 333, column: 233, scope: !199)
!268 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !258)
!269 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !258)
!270 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !258)
!271 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !258)
!272 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !258)
!273 = !DILocation(line: 333, column: 252, scope: !199)
!274 = !DILocation(line: 333, column: 285, scope: !199)
!275 = !DILocation(line: 333, column: 300, scope: !199)
!276 = !DILocation(line: 334, column: 34, scope: !199)
!277 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !278)
!278 = distinct !DILocation(line: 334, column: 21, scope: !199)
!279 = !DILocation(line: 334, column: 79, scope: !199)
!280 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !281)
!281 = distinct !DILocation(line: 334, column: 66, scope: !199)
!282 = !DILocation(line: 334, column: 124, scope: !199)
!283 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !284)
!284 = distinct !DILocation(line: 334, column: 111, scope: !199)
!285 = !DILocation(line: 334, column: 169, scope: !199)
!286 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !287)
!287 = distinct !DILocation(line: 334, column: 156, scope: !199)
!288 = !DILocation(line: 334, column: 226, scope: !199)
!289 = !DILocation(line: 334, column: 229, scope: !199)
!290 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !291)
!291 = distinct !DILocation(line: 334, column: 251, scope: !199)
!292 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !291)
!293 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !291)
!294 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !291)
!295 = !DILocation(line: 224, column: 9, scope: !130, inlinedAt: !296)
!296 = distinct !DILocation(line: 334, column: 205, scope: !199)
!297 = !DILocation(line: 224, column: 5, scope: !130, inlinedAt: !296)
!298 = !DILocation(line: 334, column: 232, scope: !199)
!299 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !291)
!300 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !291)
!301 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !291)
!302 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !291)
!303 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !291)
!304 = !DILocation(line: 334, column: 251, scope: !199)
!305 = !DILocation(line: 334, column: 284, scope: !199)
!306 = !DILocation(line: 334, column: 299, scope: !199)
!307 = !DILocation(line: 335, column: 9, scope: !199)
!308 = !DILocation(line: 0, scope: !199)
!309 = !DILocation(line: 335, column: 21, scope: !199)
!310 = distinct !DISubprogram(name: "ink_compute_scalar32", scope: !14, file: !14, line: 336, type: !15, scopeLine: 336, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!311 = !DILocation(line: 336, column: 122, scope: !310)
!312 = !DILocation(line: 337, column: 34, scope: !310)
!313 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !314)
!314 = distinct !DILocation(line: 337, column: 21, scope: !310)
!315 = !DILocation(line: 337, column: 79, scope: !310)
!316 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !317)
!317 = distinct !DILocation(line: 337, column: 66, scope: !310)
!318 = !DILocation(line: 337, column: 124, scope: !310)
!319 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !320)
!320 = distinct !DILocation(line: 337, column: 111, scope: !310)
!321 = !DILocation(line: 337, column: 169, scope: !310)
!322 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !323)
!323 = distinct !DILocation(line: 337, column: 156, scope: !310)
!324 = !DILocation(line: 337, column: 226, scope: !310)
!325 = !DILocation(line: 337, column: 229, scope: !310)
!326 = !DILocation(line: 337, column: 232, scope: !310)
!327 = !DILocation(line: 178, column: 9, scope: !121, inlinedAt: !328)
!328 = distinct !DILocation(line: 337, column: 205, scope: !310)
!329 = !DILocation(line: 178, column: 5, scope: !121, inlinedAt: !328)
!330 = !DILocation(line: 338, column: 34, scope: !310)
!331 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !332)
!332 = distinct !DILocation(line: 338, column: 21, scope: !310)
!333 = !DILocation(line: 338, column: 79, scope: !310)
!334 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !335)
!335 = distinct !DILocation(line: 338, column: 66, scope: !310)
!336 = !DILocation(line: 338, column: 124, scope: !310)
!337 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !338)
!338 = distinct !DILocation(line: 338, column: 111, scope: !310)
!339 = !DILocation(line: 338, column: 169, scope: !310)
!340 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !341)
!341 = distinct !DILocation(line: 338, column: 156, scope: !310)
!342 = !DILocation(line: 338, column: 227, scope: !310)
!343 = !DILocation(line: 338, column: 230, scope: !310)
!344 = !DILocation(line: 338, column: 233, scope: !310)
!345 = !DILocation(line: 201, column: 16, scope: !125, inlinedAt: !346)
!346 = distinct !DILocation(line: 338, column: 205, scope: !310)
!347 = !DILocation(line: 205, column: 9, scope: !125, inlinedAt: !346)
!348 = !DILocation(line: 205, column: 5, scope: !125, inlinedAt: !346)
!349 = !DILocation(line: 339, column: 34, scope: !310)
!350 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !351)
!351 = distinct !DILocation(line: 339, column: 21, scope: !310)
!352 = !DILocation(line: 339, column: 79, scope: !310)
!353 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !354)
!354 = distinct !DILocation(line: 339, column: 66, scope: !310)
!355 = !DILocation(line: 339, column: 124, scope: !310)
!356 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !357)
!357 = distinct !DILocation(line: 339, column: 111, scope: !310)
!358 = !DILocation(line: 339, column: 169, scope: !310)
!359 = !DILocation(line: 37, column: 172, scope: !163, inlinedAt: !360)
!360 = distinct !DILocation(line: 339, column: 156, scope: !310)
!361 = !DILocation(line: 339, column: 226, scope: !310)
!362 = !DILocation(line: 339, column: 229, scope: !310)
!363 = !DILocation(line: 339, column: 232, scope: !310)
!364 = !DILocation(line: 224, column: 9, scope: !130, inlinedAt: !365)
!365 = distinct !DILocation(line: 339, column: 205, scope: !310)
!366 = !DILocation(line: 224, column: 5, scope: !130, inlinedAt: !365)
!367 = !DILocation(line: 340, column: 9, scope: !310)
!368 = !DILocation(line: 0, scope: !310)
!369 = !DILocation(line: 340, column: 30, scope: !310)
!370 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !14, file: !14, line: 341, type: !15, scopeLine: 341, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!371 = !DILocation(line: 342, column: 9, scope: !370)
