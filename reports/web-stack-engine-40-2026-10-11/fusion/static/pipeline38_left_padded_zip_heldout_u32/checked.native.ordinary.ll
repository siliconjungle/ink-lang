; ModuleID = '/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_heldout_u32/checked/cpu.c'
source_filename = "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_heldout_u32/checked/cpu.c"
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
define [2 x i64] @lang_fn_pipeline38_left_padded_zip_heldout_u32([2 x i64] %0, [2 x i64] %1, i32 %2, i32 %3) local_unnamed_addr #0 !dbg !74 {
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
  br i1 %12, label %89, label %28, !dbg !95

28:                                               ; preds = %23
  %29 = icmp eq i32 %3, 0
  br i1 %29, label %30, label %93, !dbg !95

30:                                               ; preds = %28
  %31 = icmp ult i64 %8, 4, !dbg !95
  br i1 %31, label %74, label %32, !dbg !95

32:                                               ; preds = %30
  %33 = getelementptr i8, i8* %19, i64 16, !dbg !95
  %34 = add i64 %13, 16, !dbg !95
  %35 = getelementptr i8, i8* %19, i64 %34, !dbg !95
  %36 = getelementptr i32, i32* %6, i64 %8, !dbg !95
  %37 = bitcast i32* %36 to i8*, !dbg !95
  %38 = icmp ult i8* %33, %37, !dbg !95
  %39 = icmp ugt i8* %35, %7, !dbg !95
  %40 = and i1 %38, %39, !dbg !95
  br i1 %40, label %74, label %41, !dbg !95

41:                                               ; preds = %32
  %42 = and i64 %8, -4, !dbg !95
  %43 = insertelement <2 x i32> poison, i32 %2, i32 0, !dbg !95
  %44 = shufflevector <2 x i32> %43, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !95
  br label %45, !dbg !95

45:                                               ; preds = %45, %41
  %46 = phi i64 [ 0, %41 ], [ %69, %45 ], !dbg !96
  %47 = phi <2 x i32> [ <i32 0, i32 1>, %41 ], [ %70, %45 ], !dbg !97
  %48 = add <2 x i32> %47, <i32 2, i32 2>, !dbg !97
  %49 = getelementptr inbounds i32, i32* %6, i64 %46, !dbg !96
  %50 = bitcast i32* %49 to <2 x i32>*, !dbg !98
  %51 = load <2 x i32>, <2 x i32>* %50, align 4, !dbg !98, !tbaa !99, !alias.scope !101
  %52 = getelementptr inbounds i32, i32* %49, i64 2, !dbg !98
  %53 = bitcast i32* %52 to <2 x i32>*, !dbg !98
  %54 = load <2 x i32>, <2 x i32>* %53, align 4, !dbg !98, !tbaa !99, !alias.scope !101
  %55 = icmp ult <2 x i32> %47, %44, !dbg !104
  %56 = icmp ult <2 x i32> %48, %44, !dbg !104
  %57 = mul <2 x i32> %51, <i32 3, i32 3>, !dbg !105
  %58 = mul <2 x i32> %54, <i32 3, i32 3>, !dbg !105
  %59 = select <2 x i1> %55, <2 x i32> %51, <2 x i32> %57, !dbg !105
  %60 = select <2 x i1> %56, <2 x i32> %54, <2 x i32> %58, !dbg !105
  %61 = icmp ugt <2 x i32> %59, %44, !dbg !106
  %62 = icmp ugt <2 x i32> %60, %44, !dbg !106
  %63 = select <2 x i1> %61, <2 x i32> %59, <2 x i32> %44, !dbg !107
  %64 = select <2 x i1> %62, <2 x i32> %60, <2 x i32> %44, !dbg !107
  %65 = getelementptr inbounds i32, i32* %27, i64 %46, !dbg !96
  %66 = bitcast i32* %65 to <2 x i32>*, !dbg !108
  store <2 x i32> %63, <2 x i32>* %66, align 4, !dbg !108, !tbaa !99, !alias.scope !109, !noalias !101
  %67 = getelementptr inbounds i32, i32* %65, i64 2, !dbg !108
  %68 = bitcast i32* %67 to <2 x i32>*, !dbg !108
  store <2 x i32> %64, <2 x i32>* %68, align 4, !dbg !108, !tbaa !99, !alias.scope !109, !noalias !101
  %69 = add nuw i64 %46, 4, !dbg !96
  %70 = add <2 x i32> %47, <i32 4, i32 4>, !dbg !97
  %71 = icmp eq i64 %69, %42, !dbg !96
  br i1 %71, label %72, label %45, !dbg !96, !llvm.loop !111

72:                                               ; preds = %45
  %73 = icmp eq i64 %8, %42, !dbg !95
  br i1 %73, label %89, label %74, !dbg !95

74:                                               ; preds = %32, %30, %72
  %75 = phi i64 [ 0, %32 ], [ 0, %30 ], [ %42, %72 ]
  br label %76, !dbg !95

76:                                               ; preds = %74, %76
  %77 = phi i64 [ %87, %76 ], [ %75, %74 ]
  %78 = trunc i64 %77 to i32, !dbg !97
  %79 = getelementptr inbounds i32, i32* %6, i64 %77, !dbg !114
  %80 = load i32, i32* %79, align 4, !dbg !98, !tbaa !99
  %81 = icmp ult i32 %78, %2, !dbg !104
  %82 = mul i32 %80, 3, !dbg !105
  %83 = select i1 %81, i32 %80, i32 %82, !dbg !105
  %84 = icmp ugt i32 %83, %2, !dbg !106
  %85 = select i1 %84, i32 %83, i32 %2, !dbg !107
  %86 = getelementptr inbounds i32, i32* %27, i64 %77, !dbg !115
  store i32 %85, i32* %86, align 4, !dbg !108, !tbaa !99
  %87 = add nuw i64 %77, 1, !dbg !96
  %88 = icmp eq i64 %87, %8, !dbg !116
  br i1 %88, label %89, label %76, !dbg !95, !llvm.loop !117

89:                                               ; preds = %113, %76, %72, %23
  %90 = ptrtoint %struct.ink_block* %26 to i64, !dbg !118
  %91 = insertvalue [2 x i64] undef, i64 %90, 0, !dbg !118
  %92 = insertvalue [2 x i64] %91, i64 %8, 1, !dbg !118
  ret [2 x i64] %92, !dbg !118

93:                                               ; preds = %28, %113
  %94 = phi i64 [ %116, %113 ], [ 0, %28 ]
  %95 = trunc i64 %94 to i32, !dbg !97
  %96 = getelementptr inbounds i32, i32* %6, i64 %94, !dbg !114
  %97 = load i32, i32* %96, align 4, !dbg !114, !tbaa !99
  %98 = udiv i32 %97, %3, !dbg !119
  %99 = urem i32 %95, %3, !dbg !120
  %100 = add i32 %98, %2, !dbg !121
  %101 = add i32 %100, %99, !dbg !122
  %102 = icmp ult i32 %95, %2, !dbg !104
  %103 = add i32 %97, %3, !dbg !105
  %104 = mul i32 %97, 3, !dbg !105
  %105 = select i1 %102, i32 %103, i32 %104, !dbg !105
  %106 = icmp ult i32 %101, %105, !dbg !106
  br i1 %106, label %107, label %110, !dbg !107

107:                                              ; preds = %93
  %108 = udiv i32 %101, %3, !dbg !123
  %109 = add i32 %108, %105, !dbg !124
  br label %113, !dbg !125

110:                                              ; preds = %93
  %111 = urem i32 %105, %3, !dbg !126
  %112 = add i32 %111, %101, !dbg !127
  br label %113

113:                                              ; preds = %110, %107
  %114 = phi i32 [ %109, %107 ], [ %112, %110 ], !dbg !128
  %115 = getelementptr inbounds i32, i32* %27, i64 %94, !dbg !115
  store i32 %114, i32* %115, align 4, !dbg !108, !tbaa !99
  %116 = add nuw i64 %94, 1, !dbg !96
  %117 = icmp eq i64 %116, %8, !dbg !116
  br i1 %117, label %89, label %93, !dbg !95, !llvm.loop !129
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_left_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !130 {
  %5 = icmp eq i32 %3, 0, !dbg !131
  br i1 %5, label %9, label %6, !dbg !132

6:                                                ; preds = %4
  %7 = udiv i32 %1, %3, !dbg !133
  %8 = urem i32 %0, %3, !dbg !134
  br label %9

9:                                                ; preds = %4, %6
  %10 = phi i32 [ %7, %6 ], [ 0, %4 ]
  %11 = phi i32 [ %8, %6 ], [ 0, %4 ], !dbg !135
  %12 = add i32 %10, %2, !dbg !136
  %13 = add i32 %12, %11, !dbg !137
  ret i32 %13, !dbg !138
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_left_signal(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !139 {
  %5 = icmp eq i32 %3, 0, !dbg !140
  br i1 %5, label %9, label %6, !dbg !141

6:                                                ; preds = %4
  %7 = udiv i32 %1, %3, !dbg !142
  %8 = urem i32 %0, %3, !dbg !143
  br label %9

9:                                                ; preds = %4, %6
  %10 = phi i32 [ %7, %6 ], [ 0, %4 ]
  %11 = phi i32 [ %8, %6 ], [ 0, %4 ], !dbg !144
  %12 = add i32 %10, %2, !dbg !145
  %13 = add i32 %12, %11, !dbg !146
  ret i32 %13, !dbg !147
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_right_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !148 {
  %5 = icmp ult i32 %0, %2, !dbg !149
  %6 = add i32 %3, %1, !dbg !150
  %7 = mul i32 %1, 3, !dbg !150
  %8 = select i1 %5, i32 %6, i32 %7, !dbg !150
  ret i32 %8, !dbg !151
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_right_signal(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !152 {
  %5 = icmp ult i32 %0, %2, !dbg !153
  %6 = add i32 %3, %1, !dbg !154
  %7 = mul i32 %1, 3, !dbg !154
  %8 = select i1 %5, i32 %6, i32 %7, !dbg !154
  ret i32 %8, !dbg !155
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_pair_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !156 {
  %5 = icmp ult i32 %0, %1, !dbg !157
  %6 = icmp eq i32 %3, 0, !dbg !158
  br i1 %5, label %7, label %13, !dbg !159

7:                                                ; preds = %4
  br i1 %6, label %10, label %8, !dbg !160

8:                                                ; preds = %7
  %9 = udiv i32 %0, %3, !dbg !161
  br label %10

10:                                               ; preds = %7, %8
  %11 = phi i32 [ %9, %8 ], [ 0, %7 ], !dbg !158
  %12 = add i32 %11, %1, !dbg !162
  br label %19, !dbg !163

13:                                               ; preds = %4
  br i1 %6, label %16, label %14, !dbg !164

14:                                               ; preds = %13
  %15 = urem i32 %1, %3, !dbg !165
  br label %16

16:                                               ; preds = %13, %14
  %17 = phi i32 [ %15, %14 ], [ 0, %13 ], !dbg !158
  %18 = add i32 %17, %0, !dbg !166
  br label %19

19:                                               ; preds = %16, %10
  %20 = phi i32 [ %12, %10 ], [ %18, %16 ], !dbg !158
  ret i32 %20, !dbg !167
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_pair_signal(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !168 {
  %5 = icmp ult i32 %0, %1, !dbg !169
  %6 = icmp eq i32 %3, 0, !dbg !170
  br i1 %5, label %7, label %13, !dbg !171

7:                                                ; preds = %4
  br i1 %6, label %10, label %8, !dbg !172

8:                                                ; preds = %7
  %9 = udiv i32 %0, %3, !dbg !173
  br label %10

10:                                               ; preds = %7, %8
  %11 = phi i32 [ %9, %8 ], [ 0, %7 ], !dbg !170
  %12 = add i32 %11, %1, !dbg !174
  br label %19, !dbg !175

13:                                               ; preds = %4
  br i1 %6, label %16, label %14, !dbg !176

14:                                               ; preds = %13
  %15 = urem i32 %1, %3, !dbg !177
  br label %16

16:                                               ; preds = %13, %14
  %17 = phi i32 [ %15, %14 ], [ 0, %13 ], !dbg !170
  %18 = add i32 %17, %0, !dbg !178
  br label %19

19:                                               ; preds = %16, %10
  %20 = phi i32 [ %12, %10 ], [ %18, %16 ], !dbg !170
  ret i32 %20, !dbg !179
}

; Function Attrs: nofree norecurse nosync nounwind ssp uwtable
define i64 @lang_fn_pipeline38_left_padded_zip_heldout_u32_into([2 x i64] %0, [2 x i64] %1, i32 %2, i32 %3, i32* nocapture %4) local_unnamed_addr #6 !dbg !180 {
  %6 = extractvalue [2 x i64] %0, 0
  %7 = inttoptr i64 %6 to i32*
  %8 = inttoptr i64 %6 to i8*
  %9 = extractvalue [2 x i64] %0, 1
  %10 = icmp eq i64 %9, 0, !dbg !181
  br i1 %10, label %70, label %11, !dbg !182

11:                                               ; preds = %5
  %12 = icmp eq i32 %3, 0
  br i1 %12, label %13, label %71, !dbg !182

13:                                               ; preds = %11
  %14 = icmp ult i64 %9, 4, !dbg !182
  br i1 %14, label %55, label %15, !dbg !182

15:                                               ; preds = %13
  %16 = getelementptr i32, i32* %4, i64 %9, !dbg !182
  %17 = bitcast i32* %16 to i8*, !dbg !182
  %18 = getelementptr i32, i32* %7, i64 %9, !dbg !182
  %19 = icmp ugt i32* %18, %4, !dbg !182
  %20 = icmp ult i8* %8, %17, !dbg !182
  %21 = and i1 %19, %20, !dbg !182
  br i1 %21, label %55, label %22, !dbg !182

22:                                               ; preds = %15
  %23 = and i64 %9, -4, !dbg !182
  %24 = insertelement <2 x i32> poison, i32 %2, i32 0, !dbg !182
  %25 = shufflevector <2 x i32> %24, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !182
  br label %26, !dbg !182

26:                                               ; preds = %26, %22
  %27 = phi i64 [ 0, %22 ], [ %50, %26 ], !dbg !183
  %28 = phi <2 x i32> [ <i32 0, i32 1>, %22 ], [ %51, %26 ], !dbg !184
  %29 = add <2 x i32> %28, <i32 2, i32 2>, !dbg !184
  %30 = getelementptr inbounds i32, i32* %7, i64 %27, !dbg !183
  %31 = bitcast i32* %30 to <2 x i32>*, !dbg !185
  %32 = load <2 x i32>, <2 x i32>* %31, align 4, !dbg !185, !tbaa !99, !alias.scope !186
  %33 = getelementptr inbounds i32, i32* %30, i64 2, !dbg !185
  %34 = bitcast i32* %33 to <2 x i32>*, !dbg !185
  %35 = load <2 x i32>, <2 x i32>* %34, align 4, !dbg !185, !tbaa !99, !alias.scope !186
  %36 = icmp ult <2 x i32> %28, %25, !dbg !189
  %37 = icmp ult <2 x i32> %29, %25, !dbg !189
  %38 = mul <2 x i32> %32, <i32 3, i32 3>, !dbg !190
  %39 = mul <2 x i32> %35, <i32 3, i32 3>, !dbg !190
  %40 = select <2 x i1> %36, <2 x i32> %32, <2 x i32> %38, !dbg !190
  %41 = select <2 x i1> %37, <2 x i32> %35, <2 x i32> %39, !dbg !190
  %42 = icmp ugt <2 x i32> %40, %25, !dbg !191
  %43 = icmp ugt <2 x i32> %41, %25, !dbg !191
  %44 = select <2 x i1> %42, <2 x i32> %40, <2 x i32> %25, !dbg !192
  %45 = select <2 x i1> %43, <2 x i32> %41, <2 x i32> %25, !dbg !192
  %46 = getelementptr inbounds i32, i32* %4, i64 %27, !dbg !183
  %47 = bitcast i32* %46 to <2 x i32>*, !dbg !193
  store <2 x i32> %44, <2 x i32>* %47, align 4, !dbg !193, !tbaa !99, !alias.scope !194, !noalias !186
  %48 = getelementptr inbounds i32, i32* %46, i64 2, !dbg !193
  %49 = bitcast i32* %48 to <2 x i32>*, !dbg !193
  store <2 x i32> %45, <2 x i32>* %49, align 4, !dbg !193, !tbaa !99, !alias.scope !194, !noalias !186
  %50 = add nuw i64 %27, 4, !dbg !183
  %51 = add <2 x i32> %28, <i32 4, i32 4>, !dbg !184
  %52 = icmp eq i64 %50, %23, !dbg !183
  br i1 %52, label %53, label %26, !dbg !183, !llvm.loop !196

53:                                               ; preds = %26
  %54 = icmp eq i64 %9, %23, !dbg !182
  br i1 %54, label %70, label %55, !dbg !182

55:                                               ; preds = %15, %13, %53
  %56 = phi i64 [ 0, %15 ], [ 0, %13 ], [ %23, %53 ]
  br label %57, !dbg !182

57:                                               ; preds = %55, %57
  %58 = phi i64 [ %68, %57 ], [ %56, %55 ]
  %59 = trunc i64 %58 to i32, !dbg !184
  %60 = getelementptr inbounds i32, i32* %7, i64 %58, !dbg !198
  %61 = load i32, i32* %60, align 4, !dbg !185, !tbaa !99
  %62 = icmp ult i32 %59, %2, !dbg !189
  %63 = mul i32 %61, 3, !dbg !190
  %64 = select i1 %62, i32 %61, i32 %63, !dbg !190
  %65 = icmp ugt i32 %64, %2, !dbg !191
  %66 = select i1 %65, i32 %64, i32 %2, !dbg !192
  %67 = getelementptr inbounds i32, i32* %4, i64 %58, !dbg !199
  store i32 %66, i32* %67, align 4, !dbg !193, !tbaa !99
  %68 = add nuw i64 %58, 1, !dbg !183
  %69 = icmp eq i64 %68, %9, !dbg !181
  br i1 %69, label %70, label %57, !dbg !182, !llvm.loop !200

70:                                               ; preds = %91, %57, %53, %5
  ret i64 %9, !dbg !201

71:                                               ; preds = %11, %91
  %72 = phi i64 [ %94, %91 ], [ 0, %11 ]
  %73 = trunc i64 %72 to i32, !dbg !184
  %74 = getelementptr inbounds i32, i32* %7, i64 %72, !dbg !198
  %75 = load i32, i32* %74, align 4, !dbg !198, !tbaa !99
  %76 = udiv i32 %75, %3, !dbg !202
  %77 = urem i32 %73, %3, !dbg !203
  %78 = add i32 %76, %2, !dbg !204
  %79 = add i32 %78, %77, !dbg !205
  %80 = icmp ult i32 %73, %2, !dbg !189
  %81 = add i32 %75, %3, !dbg !190
  %82 = mul i32 %75, 3, !dbg !190
  %83 = select i1 %80, i32 %81, i32 %82, !dbg !190
  %84 = icmp ult i32 %79, %83, !dbg !191
  br i1 %84, label %85, label %88, !dbg !192

85:                                               ; preds = %71
  %86 = udiv i32 %79, %3, !dbg !206
  %87 = add i32 %86, %83, !dbg !207
  br label %91, !dbg !208

88:                                               ; preds = %71
  %89 = urem i32 %83, %3, !dbg !209
  %90 = add i32 %89, %79, !dbg !210
  br label %91

91:                                               ; preds = %88, %85
  %92 = phi i32 [ %87, %85 ], [ %90, %88 ], !dbg !211
  %93 = getelementptr inbounds i32, i32* %4, i64 %72, !dbg !199
  store i32 %92, i32* %93, align 4, !dbg !193, !tbaa !99
  %94 = add nuw i64 %72, 1, !dbg !183
  %95 = icmp eq i64 %94, %9, !dbg !181
  br i1 %95, label %70, label %71, !dbg !182, !llvm.loop !212
}

; Function Attrs: nounwind ssp uwtable
define i64 @ink_compute_into(i32 %0, i8** nocapture readonly %1, i64* nocapture readonly %2, i8* nocapture %3) local_unnamed_addr #0 !dbg !213 {
  %5 = icmp eq i32 %0, 0, !dbg !214
  br i1 %5, label %6, label %136, !dbg !214

6:                                                ; preds = %4
  %7 = bitcast i8** %1 to i32**, !dbg !215
  %8 = load i32*, i32** %7, align 8, !dbg !215, !tbaa !18
  %9 = bitcast i32* %8 to i8*, !dbg !216
  %10 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !216
  %11 = load i8*, i8** %10, align 8, !dbg !216, !tbaa !18
  %12 = load i8, i8* %11, align 1, !dbg !217, !tbaa !220
  %13 = getelementptr inbounds i8, i8* %11, i64 1, !dbg !217
  %14 = load i8, i8* %13, align 1, !dbg !217, !tbaa !220
  %15 = getelementptr inbounds i8, i8* %11, i64 2, !dbg !217
  %16 = load i8, i8* %15, align 1, !dbg !217, !tbaa !220
  %17 = getelementptr inbounds i8, i8* %11, i64 3, !dbg !217
  %18 = load i8, i8* %17, align 1, !dbg !217, !tbaa !220
  %19 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !221
  %20 = load i8*, i8** %19, align 8, !dbg !221, !tbaa !18
  %21 = load i8, i8* %20, align 1, !dbg !222, !tbaa !220
  %22 = getelementptr inbounds i8, i8* %20, i64 1, !dbg !222
  %23 = load i8, i8* %22, align 1, !dbg !222, !tbaa !220
  %24 = getelementptr inbounds i8, i8* %20, i64 2, !dbg !222
  %25 = load i8, i8* %24, align 1, !dbg !222, !tbaa !220
  %26 = getelementptr inbounds i8, i8* %20, i64 3, !dbg !222
  %27 = load i8, i8* %26, align 1, !dbg !222, !tbaa !220
  %28 = load i64, i64* %2, align 8, !dbg !224, !tbaa !225
  %29 = zext i8 %18 to i32, !dbg !227
  %30 = shl nuw i32 %29, 24, !dbg !227
  %31 = zext i8 %16 to i32, !dbg !227
  %32 = shl nuw nsw i32 %31, 16, !dbg !227
  %33 = zext i8 %14 to i32, !dbg !227
  %34 = shl nuw nsw i32 %33, 8, !dbg !227
  %35 = zext i8 %12 to i32, !dbg !227
  %36 = or i32 %34, %35, !dbg !227
  %37 = or i32 %36, %32, !dbg !227
  %38 = or i32 %37, %30, !dbg !227
  %39 = zext i8 %27 to i32, !dbg !228
  %40 = shl nuw i32 %39, 24, !dbg !228
  %41 = zext i8 %25 to i32, !dbg !228
  %42 = shl nuw nsw i32 %41, 16, !dbg !228
  %43 = zext i8 %23 to i32, !dbg !228
  %44 = shl nuw nsw i32 %43, 8, !dbg !228
  %45 = zext i8 %21 to i32, !dbg !228
  %46 = or i32 %44, %45, !dbg !228
  %47 = or i32 %46, %42, !dbg !228
  %48 = or i32 %47, %40, !dbg !228
  %49 = bitcast i8* %3 to i32*, !dbg !228
  %50 = icmp eq i64 %28, 0, !dbg !229
  br i1 %50, label %137, label %51, !dbg !231

51:                                               ; preds = %6
  %52 = icmp eq i32 %48, 0
  br i1 %52, label %53, label %111, !dbg !231

53:                                               ; preds = %51
  %54 = icmp ult i64 %28, 4, !dbg !231
  br i1 %54, label %96, label %55, !dbg !231

55:                                               ; preds = %53
  %56 = shl i64 %28, 2, !dbg !231
  %57 = getelementptr i8, i8* %3, i64 %56, !dbg !231
  %58 = getelementptr i32, i32* %8, i64 %28, !dbg !231
  %59 = bitcast i32* %58 to i8*, !dbg !231
  %60 = icmp ugt i8* %59, %3, !dbg !231
  %61 = icmp ugt i8* %57, %9, !dbg !231
  %62 = and i1 %60, %61, !dbg !231
  br i1 %62, label %96, label %63, !dbg !231

63:                                               ; preds = %55
  %64 = and i64 %28, -4, !dbg !231
  %65 = insertelement <2 x i32> poison, i32 %38, i32 0, !dbg !231
  %66 = shufflevector <2 x i32> %65, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !231
  br label %67, !dbg !231

67:                                               ; preds = %67, %63
  %68 = phi i64 [ 0, %63 ], [ %91, %67 ], !dbg !232
  %69 = phi <2 x i32> [ <i32 0, i32 1>, %63 ], [ %92, %67 ], !dbg !233
  %70 = add <2 x i32> %69, <i32 2, i32 2>, !dbg !233
  %71 = getelementptr inbounds i32, i32* %8, i64 %68, !dbg !232
  %72 = bitcast i32* %71 to <2 x i32>*, !dbg !234
  %73 = load <2 x i32>, <2 x i32>* %72, align 4, !dbg !234, !tbaa !99, !alias.scope !235
  %74 = getelementptr inbounds i32, i32* %71, i64 2, !dbg !234
  %75 = bitcast i32* %74 to <2 x i32>*, !dbg !234
  %76 = load <2 x i32>, <2 x i32>* %75, align 4, !dbg !234, !tbaa !99, !alias.scope !235
  %77 = icmp ugt <2 x i32> %66, %69, !dbg !238
  %78 = icmp ugt <2 x i32> %66, %70, !dbg !238
  %79 = mul <2 x i32> %73, <i32 3, i32 3>, !dbg !239
  %80 = mul <2 x i32> %76, <i32 3, i32 3>, !dbg !239
  %81 = select <2 x i1> %77, <2 x i32> %73, <2 x i32> %79, !dbg !239
  %82 = select <2 x i1> %78, <2 x i32> %76, <2 x i32> %80, !dbg !239
  %83 = icmp ugt <2 x i32> %81, %66, !dbg !240
  %84 = icmp ugt <2 x i32> %82, %66, !dbg !240
  %85 = select <2 x i1> %83, <2 x i32> %81, <2 x i32> %66, !dbg !241
  %86 = select <2 x i1> %84, <2 x i32> %82, <2 x i32> %66, !dbg !241
  %87 = getelementptr inbounds i32, i32* %49, i64 %68, !dbg !232
  %88 = bitcast i32* %87 to <2 x i32>*, !dbg !242
  store <2 x i32> %85, <2 x i32>* %88, align 4, !dbg !242, !tbaa !99, !alias.scope !243, !noalias !235
  %89 = getelementptr inbounds i32, i32* %87, i64 2, !dbg !242
  %90 = bitcast i32* %89 to <2 x i32>*, !dbg !242
  store <2 x i32> %86, <2 x i32>* %90, align 4, !dbg !242, !tbaa !99, !alias.scope !243, !noalias !235
  %91 = add nuw i64 %68, 4, !dbg !232
  %92 = add <2 x i32> %69, <i32 4, i32 4>, !dbg !233
  %93 = icmp eq i64 %91, %64, !dbg !232
  br i1 %93, label %94, label %67, !dbg !232, !llvm.loop !245

94:                                               ; preds = %67
  %95 = icmp eq i64 %28, %64, !dbg !231
  br i1 %95, label %137, label %96, !dbg !231

96:                                               ; preds = %55, %53, %94
  %97 = phi i64 [ 0, %55 ], [ 0, %53 ], [ %64, %94 ]
  br label %98, !dbg !231

98:                                               ; preds = %96, %98
  %99 = phi i64 [ %109, %98 ], [ %97, %96 ]
  %100 = trunc i64 %99 to i32, !dbg !233
  %101 = getelementptr inbounds i32, i32* %8, i64 %99, !dbg !247
  %102 = load i32, i32* %101, align 4, !dbg !234, !tbaa !99
  %103 = icmp ugt i32 %38, %100, !dbg !238
  %104 = mul i32 %102, 3, !dbg !239
  %105 = select i1 %103, i32 %102, i32 %104, !dbg !239
  %106 = icmp ugt i32 %105, %38, !dbg !240
  %107 = select i1 %106, i32 %105, i32 %38, !dbg !241
  %108 = getelementptr inbounds i32, i32* %49, i64 %99, !dbg !248
  store i32 %107, i32* %108, align 4, !dbg !242, !tbaa !99
  %109 = add nuw i64 %99, 1, !dbg !232
  %110 = icmp eq i64 %109, %28, !dbg !229
  br i1 %110, label %137, label %98, !dbg !231, !llvm.loop !249

111:                                              ; preds = %51, %131
  %112 = phi i64 [ %134, %131 ], [ 0, %51 ]
  %113 = trunc i64 %112 to i32, !dbg !233
  %114 = getelementptr inbounds i32, i32* %8, i64 %112, !dbg !247
  %115 = load i32, i32* %114, align 4, !dbg !247, !tbaa !99
  %116 = udiv i32 %115, %48, !dbg !250
  %117 = urem i32 %113, %48, !dbg !251
  %118 = add i32 %116, %38, !dbg !252
  %119 = add i32 %118, %117, !dbg !253
  %120 = icmp ugt i32 %38, %113, !dbg !238
  %121 = add i32 %115, %48, !dbg !239
  %122 = mul i32 %115, 3, !dbg !239
  %123 = select i1 %120, i32 %121, i32 %122, !dbg !239
  %124 = icmp ult i32 %119, %123, !dbg !240
  br i1 %124, label %125, label %128, !dbg !241

125:                                              ; preds = %111
  %126 = udiv i32 %119, %48, !dbg !254
  %127 = add i32 %126, %123, !dbg !255
  br label %131, !dbg !256

128:                                              ; preds = %111
  %129 = urem i32 %123, %48, !dbg !257
  %130 = add i32 %129, %119, !dbg !258
  br label %131

131:                                              ; preds = %128, %125
  %132 = phi i32 [ %127, %125 ], [ %130, %128 ], !dbg !259
  %133 = getelementptr inbounds i32, i32* %49, i64 %112, !dbg !248
  store i32 %132, i32* %133, align 4, !dbg !242, !tbaa !99
  %134 = add nuw i64 %112, 1, !dbg !232
  %135 = icmp eq i64 %134, %28, !dbg !229
  br i1 %135, label %137, label %111, !dbg !231, !llvm.loop !260

136:                                              ; preds = %4
  tail call fastcc void @ink_fail(), !dbg !261
  unreachable

137:                                              ; preds = %131, %98, %94, %6
  ret i64 %28, !dbg !262
}

; Function Attrs: nounwind ssp uwtable
define void @ink_compute_call(i32 %0, i8** readonly %1, i64* nocapture readonly %2, i8** nocapture %3, i64* nocapture %4) local_unnamed_addr #0 !dbg !263 {
  switch i32 %0, label %591 [
    i32 0, label %6
    i32 1, label %55
    i32 2, label %150
    i32 3, label %245
    i32 4, label %335
    i32 5, label %425
    i32 6, label %508
  ], !dbg !264

6:                                                ; preds = %5
  %7 = bitcast i8** %1 to i32**, !dbg !265
  %8 = load i32*, i32** %7, align 8, !dbg !265, !tbaa !18
  %9 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !266
  %10 = load i8*, i8** %9, align 8, !dbg !266, !tbaa !18
  %11 = load i8, i8* %10, align 1, !dbg !267, !tbaa !220
  %12 = getelementptr inbounds i8, i8* %10, i64 1, !dbg !267
  %13 = load i8, i8* %12, align 1, !dbg !267, !tbaa !220
  %14 = getelementptr inbounds i8, i8* %10, i64 2, !dbg !267
  %15 = load i8, i8* %14, align 1, !dbg !267, !tbaa !220
  %16 = getelementptr inbounds i8, i8* %10, i64 3, !dbg !267
  %17 = load i8, i8* %16, align 1, !dbg !267, !tbaa !220
  %18 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !269
  %19 = load i8*, i8** %18, align 8, !dbg !269, !tbaa !18
  %20 = load i8, i8* %19, align 1, !dbg !270, !tbaa !220
  %21 = getelementptr inbounds i8, i8* %19, i64 1, !dbg !270
  %22 = load i8, i8* %21, align 1, !dbg !270, !tbaa !220
  %23 = getelementptr inbounds i8, i8* %19, i64 2, !dbg !270
  %24 = load i8, i8* %23, align 1, !dbg !270, !tbaa !220
  %25 = getelementptr inbounds i8, i8* %19, i64 3, !dbg !270
  %26 = load i8, i8* %25, align 1, !dbg !270, !tbaa !220
  %27 = load i64, i64* %2, align 8, !dbg !272, !tbaa !225
  %28 = zext i8 %17 to i32, !dbg !273
  %29 = shl nuw i32 %28, 24, !dbg !273
  %30 = zext i8 %15 to i32, !dbg !273
  %31 = shl nuw nsw i32 %30, 16, !dbg !273
  %32 = zext i8 %13 to i32, !dbg !273
  %33 = shl nuw nsw i32 %32, 8, !dbg !273
  %34 = zext i8 %11 to i32, !dbg !273
  %35 = or i32 %33, %34, !dbg !273
  %36 = or i32 %35, %31, !dbg !273
  %37 = or i32 %36, %29, !dbg !273
  %38 = zext i8 %26 to i32, !dbg !274
  %39 = shl nuw i32 %38, 24, !dbg !274
  %40 = zext i8 %24 to i32, !dbg !274
  %41 = shl nuw nsw i32 %40, 16, !dbg !274
  %42 = zext i8 %22 to i32, !dbg !274
  %43 = shl nuw nsw i32 %42, 8, !dbg !274
  %44 = zext i8 %20 to i32, !dbg !274
  %45 = or i32 %43, %44, !dbg !274
  %46 = or i32 %45, %41, !dbg !274
  %47 = or i32 %46, %39, !dbg !274
  %48 = ptrtoint i32* %8 to i64, !dbg !274
  %49 = insertvalue [2 x i64] undef, i64 %48, 0, !dbg !274
  %50 = insertvalue [2 x i64] %49, i64 %27, 1, !dbg !274
  %51 = tail call [2 x i64] @lang_fn_pipeline38_left_padded_zip_heldout_u32([2 x i64] %50, [2 x i64] undef, i32 %37, i32 %47), !dbg !274
  %52 = extractvalue [2 x i64] %51, 0, !dbg !274
  %53 = extractvalue [2 x i64] %51, 1, !dbg !274
  %54 = inttoptr i64 %52 to i8*, !dbg !275
  store i8* %54, i8** %3, align 8, !dbg !276, !tbaa !18
  br label %592

55:                                               ; preds = %5
  %56 = load i8*, i8** %1, align 8, !dbg !277, !tbaa !18
  %57 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !278
  %58 = load i8*, i8** %57, align 8, !dbg !278, !tbaa !18
  %59 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !279
  %60 = load i8*, i8** %59, align 8, !dbg !279, !tbaa !18
  %61 = load i8, i8* %60, align 1, !dbg !280, !tbaa !220
  %62 = getelementptr inbounds i8, i8* %60, i64 1, !dbg !280
  %63 = load i8, i8* %62, align 1, !dbg !280, !tbaa !220
  %64 = getelementptr inbounds i8, i8* %60, i64 2, !dbg !280
  %65 = load i8, i8* %64, align 1, !dbg !280, !tbaa !220
  %66 = getelementptr inbounds i8, i8* %60, i64 3, !dbg !280
  %67 = load i8, i8* %66, align 1, !dbg !280, !tbaa !220
  %68 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !282
  %69 = load i8*, i8** %68, align 8, !dbg !282, !tbaa !18
  %70 = load i8, i8* %69, align 1, !dbg !283, !tbaa !220
  %71 = getelementptr inbounds i8, i8* %69, i64 1, !dbg !283
  %72 = load i8, i8* %71, align 1, !dbg !283, !tbaa !220
  %73 = getelementptr inbounds i8, i8* %69, i64 2, !dbg !283
  %74 = load i8, i8* %73, align 1, !dbg !283, !tbaa !220
  %75 = getelementptr inbounds i8, i8* %69, i64 3, !dbg !283
  %76 = load i8, i8* %75, align 1, !dbg !283, !tbaa !220
  %77 = zext i8 %67 to i32, !dbg !285
  %78 = shl nuw i32 %77, 24, !dbg !285
  %79 = zext i8 %65 to i32, !dbg !285
  %80 = shl nuw nsw i32 %79, 16, !dbg !285
  %81 = zext i8 %63 to i32, !dbg !285
  %82 = shl nuw nsw i32 %81, 8, !dbg !285
  %83 = zext i8 %61 to i32, !dbg !285
  %84 = or i32 %82, %83, !dbg !285
  %85 = or i32 %84, %80, !dbg !285
  %86 = or i32 %85, %78, !dbg !285
  %87 = zext i8 %76 to i32, !dbg !286
  %88 = shl nuw i32 %87, 24, !dbg !286
  %89 = zext i8 %74 to i32, !dbg !286
  %90 = shl nuw nsw i32 %89, 16, !dbg !286
  %91 = zext i8 %72 to i32, !dbg !286
  %92 = shl nuw nsw i32 %91, 8, !dbg !286
  %93 = zext i8 %70 to i32, !dbg !286
  %94 = or i32 %92, %93, !dbg !286
  %95 = or i32 %94, %90, !dbg !286
  %96 = or i32 %95, %88, !dbg !286
  %97 = icmp eq i32 %96, 0, !dbg !286
  br i1 %97, label %135, label %98, !dbg !288

98:                                               ; preds = %55
  %99 = getelementptr inbounds i8, i8* %58, i64 3, !dbg !289
  %100 = load i8, i8* %99, align 1, !dbg !289, !tbaa !220
  %101 = zext i8 %100 to i32, !dbg !291
  %102 = shl nuw i32 %101, 24, !dbg !291
  %103 = getelementptr inbounds i8, i8* %58, i64 2, !dbg !289
  %104 = load i8, i8* %103, align 1, !dbg !289, !tbaa !220
  %105 = zext i8 %104 to i32, !dbg !291
  %106 = shl nuw nsw i32 %105, 16, !dbg !291
  %107 = or i32 %106, %102, !dbg !291
  %108 = getelementptr inbounds i8, i8* %58, i64 1, !dbg !289
  %109 = load i8, i8* %108, align 1, !dbg !289, !tbaa !220
  %110 = zext i8 %109 to i32, !dbg !291
  %111 = shl nuw nsw i32 %110, 8, !dbg !291
  %112 = or i32 %107, %111, !dbg !291
  %113 = load i8, i8* %58, align 1, !dbg !289, !tbaa !220
  %114 = zext i8 %113 to i32, !dbg !291
  %115 = or i32 %112, %114, !dbg !291
  %116 = getelementptr inbounds i8, i8* %56, i64 3, !dbg !292
  %117 = load i8, i8* %116, align 1, !dbg !292, !tbaa !220
  %118 = zext i8 %117 to i32, !dbg !294
  %119 = shl nuw i32 %118, 24, !dbg !294
  %120 = getelementptr inbounds i8, i8* %56, i64 2, !dbg !292
  %121 = load i8, i8* %120, align 1, !dbg !292, !tbaa !220
  %122 = zext i8 %121 to i32, !dbg !294
  %123 = shl nuw nsw i32 %122, 16, !dbg !294
  %124 = or i32 %123, %119, !dbg !294
  %125 = getelementptr inbounds i8, i8* %56, i64 1, !dbg !292
  %126 = load i8, i8* %125, align 1, !dbg !292, !tbaa !220
  %127 = zext i8 %126 to i32, !dbg !294
  %128 = shl nuw nsw i32 %127, 8, !dbg !294
  %129 = or i32 %124, %128, !dbg !294
  %130 = load i8, i8* %56, align 1, !dbg !292, !tbaa !220
  %131 = zext i8 %130 to i32, !dbg !294
  %132 = or i32 %129, %131, !dbg !294
  %133 = udiv i32 %115, %96, !dbg !295
  %134 = urem i32 %132, %96, !dbg !296
  br label %135

135:                                              ; preds = %55, %98
  %136 = phi i32 [ %133, %98 ], [ 0, %55 ]
  %137 = phi i32 [ %134, %98 ], [ 0, %55 ], !dbg !297
  %138 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !298
  %139 = bitcast i8* %138 to %struct.ink_block*, !dbg !298
  %140 = icmp eq i8* %138, null, !dbg !300
  br i1 %140, label %141, label %142, !dbg !301

141:                                              ; preds = %135
  tail call fastcc void @ink_fail() #11, !dbg !302
  unreachable

142:                                              ; preds = %135
  %143 = add i32 %136, %86, !dbg !303
  %144 = add i32 %143, %137, !dbg !304
  %145 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !305, !tbaa !18
  %146 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %139, i64 0, i32 0, !dbg !306
  store %struct.ink_block* %145, %struct.ink_block** %146, align 8, !dbg !307, !tbaa !24
  store i8* %138, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !308, !tbaa !18
  %147 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %139, i64 1, !dbg !309
  %148 = bitcast %struct.ink_block* %147 to i32*, !dbg !310
  store i32 %144, i32* %148, align 4, !dbg !311, !tbaa !99
  %149 = bitcast i8** %3 to %struct.ink_block**, !dbg !312
  store %struct.ink_block* %147, %struct.ink_block** %149, align 8, !dbg !312, !tbaa !18
  br label %592

150:                                              ; preds = %5
  %151 = load i8*, i8** %1, align 8, !dbg !313, !tbaa !18
  %152 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !314
  %153 = load i8*, i8** %152, align 8, !dbg !314, !tbaa !18
  %154 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !315
  %155 = load i8*, i8** %154, align 8, !dbg !315, !tbaa !18
  %156 = load i8, i8* %155, align 1, !dbg !316, !tbaa !220
  %157 = getelementptr inbounds i8, i8* %155, i64 1, !dbg !316
  %158 = load i8, i8* %157, align 1, !dbg !316, !tbaa !220
  %159 = getelementptr inbounds i8, i8* %155, i64 2, !dbg !316
  %160 = load i8, i8* %159, align 1, !dbg !316, !tbaa !220
  %161 = getelementptr inbounds i8, i8* %155, i64 3, !dbg !316
  %162 = load i8, i8* %161, align 1, !dbg !316, !tbaa !220
  %163 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !318
  %164 = load i8*, i8** %163, align 8, !dbg !318, !tbaa !18
  %165 = load i8, i8* %164, align 1, !dbg !319, !tbaa !220
  %166 = getelementptr inbounds i8, i8* %164, i64 1, !dbg !319
  %167 = load i8, i8* %166, align 1, !dbg !319, !tbaa !220
  %168 = getelementptr inbounds i8, i8* %164, i64 2, !dbg !319
  %169 = load i8, i8* %168, align 1, !dbg !319, !tbaa !220
  %170 = getelementptr inbounds i8, i8* %164, i64 3, !dbg !319
  %171 = load i8, i8* %170, align 1, !dbg !319, !tbaa !220
  %172 = zext i8 %162 to i32, !dbg !321
  %173 = shl nuw i32 %172, 24, !dbg !321
  %174 = zext i8 %160 to i32, !dbg !321
  %175 = shl nuw nsw i32 %174, 16, !dbg !321
  %176 = zext i8 %158 to i32, !dbg !321
  %177 = shl nuw nsw i32 %176, 8, !dbg !321
  %178 = zext i8 %156 to i32, !dbg !321
  %179 = or i32 %177, %178, !dbg !321
  %180 = or i32 %179, %175, !dbg !321
  %181 = or i32 %180, %173, !dbg !321
  %182 = zext i8 %171 to i32, !dbg !322
  %183 = shl nuw i32 %182, 24, !dbg !322
  %184 = zext i8 %169 to i32, !dbg !322
  %185 = shl nuw nsw i32 %184, 16, !dbg !322
  %186 = zext i8 %167 to i32, !dbg !322
  %187 = shl nuw nsw i32 %186, 8, !dbg !322
  %188 = zext i8 %165 to i32, !dbg !322
  %189 = or i32 %187, %188, !dbg !322
  %190 = or i32 %189, %185, !dbg !322
  %191 = or i32 %190, %183, !dbg !322
  %192 = icmp eq i32 %191, 0, !dbg !322
  br i1 %192, label %230, label %193, !dbg !324

193:                                              ; preds = %150
  %194 = getelementptr inbounds i8, i8* %153, i64 3, !dbg !325
  %195 = load i8, i8* %194, align 1, !dbg !325, !tbaa !220
  %196 = zext i8 %195 to i32, !dbg !327
  %197 = shl nuw i32 %196, 24, !dbg !327
  %198 = getelementptr inbounds i8, i8* %153, i64 2, !dbg !325
  %199 = load i8, i8* %198, align 1, !dbg !325, !tbaa !220
  %200 = zext i8 %199 to i32, !dbg !327
  %201 = shl nuw nsw i32 %200, 16, !dbg !327
  %202 = or i32 %201, %197, !dbg !327
  %203 = getelementptr inbounds i8, i8* %153, i64 1, !dbg !325
  %204 = load i8, i8* %203, align 1, !dbg !325, !tbaa !220
  %205 = zext i8 %204 to i32, !dbg !327
  %206 = shl nuw nsw i32 %205, 8, !dbg !327
  %207 = or i32 %202, %206, !dbg !327
  %208 = load i8, i8* %153, align 1, !dbg !325, !tbaa !220
  %209 = zext i8 %208 to i32, !dbg !327
  %210 = or i32 %207, %209, !dbg !327
  %211 = getelementptr inbounds i8, i8* %151, i64 3, !dbg !328
  %212 = load i8, i8* %211, align 1, !dbg !328, !tbaa !220
  %213 = zext i8 %212 to i32, !dbg !330
  %214 = shl nuw i32 %213, 24, !dbg !330
  %215 = getelementptr inbounds i8, i8* %151, i64 2, !dbg !328
  %216 = load i8, i8* %215, align 1, !dbg !328, !tbaa !220
  %217 = zext i8 %216 to i32, !dbg !330
  %218 = shl nuw nsw i32 %217, 16, !dbg !330
  %219 = or i32 %218, %214, !dbg !330
  %220 = getelementptr inbounds i8, i8* %151, i64 1, !dbg !328
  %221 = load i8, i8* %220, align 1, !dbg !328, !tbaa !220
  %222 = zext i8 %221 to i32, !dbg !330
  %223 = shl nuw nsw i32 %222, 8, !dbg !330
  %224 = or i32 %219, %223, !dbg !330
  %225 = load i8, i8* %151, align 1, !dbg !328, !tbaa !220
  %226 = zext i8 %225 to i32, !dbg !330
  %227 = or i32 %224, %226, !dbg !330
  %228 = udiv i32 %210, %191, !dbg !331
  %229 = urem i32 %227, %191, !dbg !332
  br label %230

230:                                              ; preds = %150, %193
  %231 = phi i32 [ %228, %193 ], [ 0, %150 ]
  %232 = phi i32 [ %229, %193 ], [ 0, %150 ], !dbg !333
  %233 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !334
  %234 = bitcast i8* %233 to %struct.ink_block*, !dbg !334
  %235 = icmp eq i8* %233, null, !dbg !336
  br i1 %235, label %236, label %237, !dbg !337

236:                                              ; preds = %230
  tail call fastcc void @ink_fail() #11, !dbg !338
  unreachable

237:                                              ; preds = %230
  %238 = add i32 %231, %181, !dbg !339
  %239 = add i32 %238, %232, !dbg !340
  %240 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !341, !tbaa !18
  %241 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %234, i64 0, i32 0, !dbg !342
  store %struct.ink_block* %240, %struct.ink_block** %241, align 8, !dbg !343, !tbaa !24
  store i8* %233, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !344, !tbaa !18
  %242 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %234, i64 1, !dbg !345
  %243 = bitcast %struct.ink_block* %242 to i32*, !dbg !346
  store i32 %239, i32* %243, align 4, !dbg !347, !tbaa !99
  %244 = bitcast i8** %3 to %struct.ink_block**, !dbg !348
  store %struct.ink_block* %242, %struct.ink_block** %244, align 8, !dbg !348, !tbaa !18
  br label %592

245:                                              ; preds = %5
  %246 = load i8*, i8** %1, align 8, !dbg !349, !tbaa !18
  %247 = load i8, i8* %246, align 1, !dbg !350, !tbaa !220
  %248 = getelementptr inbounds i8, i8* %246, i64 1, !dbg !350
  %249 = load i8, i8* %248, align 1, !dbg !350, !tbaa !220
  %250 = getelementptr inbounds i8, i8* %246, i64 2, !dbg !350
  %251 = load i8, i8* %250, align 1, !dbg !350, !tbaa !220
  %252 = getelementptr inbounds i8, i8* %246, i64 3, !dbg !350
  %253 = load i8, i8* %252, align 1, !dbg !350, !tbaa !220
  %254 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !352
  %255 = load i8*, i8** %254, align 8, !dbg !352, !tbaa !18
  %256 = load i8, i8* %255, align 1, !dbg !353, !tbaa !220
  %257 = getelementptr inbounds i8, i8* %255, i64 1, !dbg !353
  %258 = load i8, i8* %257, align 1, !dbg !353, !tbaa !220
  %259 = getelementptr inbounds i8, i8* %255, i64 2, !dbg !353
  %260 = load i8, i8* %259, align 1, !dbg !353, !tbaa !220
  %261 = getelementptr inbounds i8, i8* %255, i64 3, !dbg !353
  %262 = load i8, i8* %261, align 1, !dbg !353, !tbaa !220
  %263 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !355
  %264 = load i8*, i8** %263, align 8, !dbg !355, !tbaa !18
  %265 = load i8, i8* %264, align 1, !dbg !356, !tbaa !220
  %266 = getelementptr inbounds i8, i8* %264, i64 1, !dbg !356
  %267 = load i8, i8* %266, align 1, !dbg !356, !tbaa !220
  %268 = getelementptr inbounds i8, i8* %264, i64 2, !dbg !356
  %269 = load i8, i8* %268, align 1, !dbg !356, !tbaa !220
  %270 = getelementptr inbounds i8, i8* %264, i64 3, !dbg !356
  %271 = load i8, i8* %270, align 1, !dbg !356, !tbaa !220
  %272 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !358
  %273 = load i8*, i8** %272, align 8, !dbg !358, !tbaa !18
  %274 = load i8, i8* %273, align 1, !dbg !359, !tbaa !220
  %275 = getelementptr inbounds i8, i8* %273, i64 1, !dbg !359
  %276 = load i8, i8* %275, align 1, !dbg !359, !tbaa !220
  %277 = getelementptr inbounds i8, i8* %273, i64 2, !dbg !359
  %278 = load i8, i8* %277, align 1, !dbg !359, !tbaa !220
  %279 = getelementptr inbounds i8, i8* %273, i64 3, !dbg !359
  %280 = load i8, i8* %279, align 1, !dbg !359, !tbaa !220
  %281 = zext i8 %262 to i32, !dbg !361
  %282 = shl nuw i32 %281, 24, !dbg !361
  %283 = zext i8 %260 to i32, !dbg !361
  %284 = shl nuw nsw i32 %283, 16, !dbg !361
  %285 = zext i8 %258 to i32, !dbg !361
  %286 = shl nuw nsw i32 %285, 8, !dbg !361
  %287 = zext i8 %256 to i32, !dbg !361
  %288 = or i32 %286, %287, !dbg !361
  %289 = or i32 %288, %284, !dbg !361
  %290 = or i32 %289, %282, !dbg !361
  %291 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !362
  %292 = bitcast i8* %291 to %struct.ink_block*, !dbg !362
  %293 = icmp eq i8* %291, null, !dbg !364
  br i1 %293, label %294, label %295, !dbg !365

294:                                              ; preds = %245
  tail call fastcc void @ink_fail() #11, !dbg !366
  unreachable

295:                                              ; preds = %245
  %296 = zext i8 %253 to i32, !dbg !367
  %297 = shl nuw i32 %296, 24, !dbg !367
  %298 = zext i8 %251 to i32, !dbg !367
  %299 = shl nuw nsw i32 %298, 16, !dbg !367
  %300 = zext i8 %249 to i32, !dbg !367
  %301 = shl nuw nsw i32 %300, 8, !dbg !367
  %302 = zext i8 %247 to i32, !dbg !367
  %303 = or i32 %301, %302, !dbg !367
  %304 = or i32 %303, %299, !dbg !367
  %305 = or i32 %304, %297, !dbg !367
  %306 = zext i8 %271 to i32, !dbg !368
  %307 = shl nuw i32 %306, 24, !dbg !368
  %308 = zext i8 %269 to i32, !dbg !368
  %309 = shl nuw nsw i32 %308, 16, !dbg !368
  %310 = zext i8 %267 to i32, !dbg !368
  %311 = shl nuw nsw i32 %310, 8, !dbg !368
  %312 = zext i8 %265 to i32, !dbg !368
  %313 = or i32 %311, %312, !dbg !368
  %314 = or i32 %313, %309, !dbg !368
  %315 = or i32 %314, %307, !dbg !368
  %316 = icmp ult i32 %305, %315, !dbg !369
  %317 = zext i8 %280 to i32, !dbg !369
  %318 = shl nuw i32 %317, 24, !dbg !369
  %319 = zext i8 %278 to i32, !dbg !369
  %320 = shl nuw nsw i32 %319, 16, !dbg !369
  %321 = zext i8 %276 to i32, !dbg !369
  %322 = shl nuw nsw i32 %321, 8, !dbg !369
  %323 = zext i8 %274 to i32, !dbg !369
  %324 = or i32 %322, %323, !dbg !369
  %325 = or i32 %324, %320, !dbg !369
  %326 = or i32 %325, %318, !dbg !369
  %327 = add i32 %326, %290, !dbg !371
  %328 = mul i32 %290, 3, !dbg !371
  %329 = select i1 %316, i32 %327, i32 %328, !dbg !371
  %330 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !372, !tbaa !18
  %331 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %292, i64 0, i32 0, !dbg !373
  store %struct.ink_block* %330, %struct.ink_block** %331, align 8, !dbg !374, !tbaa !24
  store i8* %291, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !375, !tbaa !18
  %332 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %292, i64 1, !dbg !376
  %333 = bitcast %struct.ink_block* %332 to i32*, !dbg !377
  store i32 %329, i32* %333, align 4, !dbg !378, !tbaa !99
  %334 = bitcast i8** %3 to %struct.ink_block**, !dbg !379
  store %struct.ink_block* %332, %struct.ink_block** %334, align 8, !dbg !379, !tbaa !18
  br label %592

335:                                              ; preds = %5
  %336 = load i8*, i8** %1, align 8, !dbg !380, !tbaa !18
  %337 = load i8, i8* %336, align 1, !dbg !381, !tbaa !220
  %338 = getelementptr inbounds i8, i8* %336, i64 1, !dbg !381
  %339 = load i8, i8* %338, align 1, !dbg !381, !tbaa !220
  %340 = getelementptr inbounds i8, i8* %336, i64 2, !dbg !381
  %341 = load i8, i8* %340, align 1, !dbg !381, !tbaa !220
  %342 = getelementptr inbounds i8, i8* %336, i64 3, !dbg !381
  %343 = load i8, i8* %342, align 1, !dbg !381, !tbaa !220
  %344 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !383
  %345 = load i8*, i8** %344, align 8, !dbg !383, !tbaa !18
  %346 = load i8, i8* %345, align 1, !dbg !384, !tbaa !220
  %347 = getelementptr inbounds i8, i8* %345, i64 1, !dbg !384
  %348 = load i8, i8* %347, align 1, !dbg !384, !tbaa !220
  %349 = getelementptr inbounds i8, i8* %345, i64 2, !dbg !384
  %350 = load i8, i8* %349, align 1, !dbg !384, !tbaa !220
  %351 = getelementptr inbounds i8, i8* %345, i64 3, !dbg !384
  %352 = load i8, i8* %351, align 1, !dbg !384, !tbaa !220
  %353 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !386
  %354 = load i8*, i8** %353, align 8, !dbg !386, !tbaa !18
  %355 = load i8, i8* %354, align 1, !dbg !387, !tbaa !220
  %356 = getelementptr inbounds i8, i8* %354, i64 1, !dbg !387
  %357 = load i8, i8* %356, align 1, !dbg !387, !tbaa !220
  %358 = getelementptr inbounds i8, i8* %354, i64 2, !dbg !387
  %359 = load i8, i8* %358, align 1, !dbg !387, !tbaa !220
  %360 = getelementptr inbounds i8, i8* %354, i64 3, !dbg !387
  %361 = load i8, i8* %360, align 1, !dbg !387, !tbaa !220
  %362 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !389
  %363 = load i8*, i8** %362, align 8, !dbg !389, !tbaa !18
  %364 = load i8, i8* %363, align 1, !dbg !390, !tbaa !220
  %365 = getelementptr inbounds i8, i8* %363, i64 1, !dbg !390
  %366 = load i8, i8* %365, align 1, !dbg !390, !tbaa !220
  %367 = getelementptr inbounds i8, i8* %363, i64 2, !dbg !390
  %368 = load i8, i8* %367, align 1, !dbg !390, !tbaa !220
  %369 = getelementptr inbounds i8, i8* %363, i64 3, !dbg !390
  %370 = load i8, i8* %369, align 1, !dbg !390, !tbaa !220
  %371 = zext i8 %352 to i32, !dbg !392
  %372 = shl nuw i32 %371, 24, !dbg !392
  %373 = zext i8 %350 to i32, !dbg !392
  %374 = shl nuw nsw i32 %373, 16, !dbg !392
  %375 = zext i8 %348 to i32, !dbg !392
  %376 = shl nuw nsw i32 %375, 8, !dbg !392
  %377 = zext i8 %346 to i32, !dbg !392
  %378 = or i32 %376, %377, !dbg !392
  %379 = or i32 %378, %374, !dbg !392
  %380 = or i32 %379, %372, !dbg !392
  %381 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !393
  %382 = bitcast i8* %381 to %struct.ink_block*, !dbg !393
  %383 = icmp eq i8* %381, null, !dbg !395
  br i1 %383, label %384, label %385, !dbg !396

384:                                              ; preds = %335
  tail call fastcc void @ink_fail() #11, !dbg !397
  unreachable

385:                                              ; preds = %335
  %386 = zext i8 %343 to i32, !dbg !398
  %387 = shl nuw i32 %386, 24, !dbg !398
  %388 = zext i8 %341 to i32, !dbg !398
  %389 = shl nuw nsw i32 %388, 16, !dbg !398
  %390 = zext i8 %339 to i32, !dbg !398
  %391 = shl nuw nsw i32 %390, 8, !dbg !398
  %392 = zext i8 %337 to i32, !dbg !398
  %393 = or i32 %391, %392, !dbg !398
  %394 = or i32 %393, %389, !dbg !398
  %395 = or i32 %394, %387, !dbg !398
  %396 = zext i8 %361 to i32, !dbg !399
  %397 = shl nuw i32 %396, 24, !dbg !399
  %398 = zext i8 %359 to i32, !dbg !399
  %399 = shl nuw nsw i32 %398, 16, !dbg !399
  %400 = zext i8 %357 to i32, !dbg !399
  %401 = shl nuw nsw i32 %400, 8, !dbg !399
  %402 = zext i8 %355 to i32, !dbg !399
  %403 = or i32 %401, %402, !dbg !399
  %404 = or i32 %403, %399, !dbg !399
  %405 = or i32 %404, %397, !dbg !399
  %406 = icmp ult i32 %395, %405, !dbg !400
  %407 = zext i8 %370 to i32, !dbg !400
  %408 = shl nuw i32 %407, 24, !dbg !400
  %409 = zext i8 %368 to i32, !dbg !400
  %410 = shl nuw nsw i32 %409, 16, !dbg !400
  %411 = zext i8 %366 to i32, !dbg !400
  %412 = shl nuw nsw i32 %411, 8, !dbg !400
  %413 = zext i8 %364 to i32, !dbg !400
  %414 = or i32 %412, %413, !dbg !400
  %415 = or i32 %414, %410, !dbg !400
  %416 = or i32 %415, %408, !dbg !400
  %417 = add i32 %416, %380, !dbg !402
  %418 = mul i32 %380, 3, !dbg !402
  %419 = select i1 %406, i32 %417, i32 %418, !dbg !402
  %420 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !403, !tbaa !18
  %421 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %382, i64 0, i32 0, !dbg !404
  store %struct.ink_block* %420, %struct.ink_block** %421, align 8, !dbg !405, !tbaa !24
  store i8* %381, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !406, !tbaa !18
  %422 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %382, i64 1, !dbg !407
  %423 = bitcast %struct.ink_block* %422 to i32*, !dbg !408
  store i32 %419, i32* %423, align 4, !dbg !409, !tbaa !99
  %424 = bitcast i8** %3 to %struct.ink_block**, !dbg !410
  store %struct.ink_block* %422, %struct.ink_block** %424, align 8, !dbg !410, !tbaa !18
  br label %592

425:                                              ; preds = %5
  %426 = load i8*, i8** %1, align 8, !dbg !411, !tbaa !18
  %427 = load i8, i8* %426, align 1, !dbg !412, !tbaa !220
  %428 = getelementptr inbounds i8, i8* %426, i64 1, !dbg !412
  %429 = load i8, i8* %428, align 1, !dbg !412, !tbaa !220
  %430 = getelementptr inbounds i8, i8* %426, i64 2, !dbg !412
  %431 = load i8, i8* %430, align 1, !dbg !412, !tbaa !220
  %432 = getelementptr inbounds i8, i8* %426, i64 3, !dbg !412
  %433 = load i8, i8* %432, align 1, !dbg !412, !tbaa !220
  %434 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !414
  %435 = load i8*, i8** %434, align 8, !dbg !414, !tbaa !18
  %436 = load i8, i8* %435, align 1, !dbg !415, !tbaa !220
  %437 = getelementptr inbounds i8, i8* %435, i64 1, !dbg !415
  %438 = load i8, i8* %437, align 1, !dbg !415, !tbaa !220
  %439 = getelementptr inbounds i8, i8* %435, i64 2, !dbg !415
  %440 = load i8, i8* %439, align 1, !dbg !415, !tbaa !220
  %441 = getelementptr inbounds i8, i8* %435, i64 3, !dbg !415
  %442 = load i8, i8* %441, align 1, !dbg !415, !tbaa !220
  %443 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !417
  %444 = load i8*, i8** %443, align 8, !dbg !417, !tbaa !18
  %445 = load i8, i8* %444, align 1, !dbg !418, !tbaa !220
  %446 = getelementptr inbounds i8, i8* %444, i64 1, !dbg !418
  %447 = load i8, i8* %446, align 1, !dbg !418, !tbaa !220
  %448 = getelementptr inbounds i8, i8* %444, i64 2, !dbg !418
  %449 = load i8, i8* %448, align 1, !dbg !418, !tbaa !220
  %450 = getelementptr inbounds i8, i8* %444, i64 3, !dbg !418
  %451 = load i8, i8* %450, align 1, !dbg !418, !tbaa !220
  %452 = zext i8 %433 to i32, !dbg !420
  %453 = shl nuw i32 %452, 24, !dbg !420
  %454 = zext i8 %431 to i32, !dbg !420
  %455 = shl nuw nsw i32 %454, 16, !dbg !420
  %456 = zext i8 %429 to i32, !dbg !420
  %457 = shl nuw nsw i32 %456, 8, !dbg !420
  %458 = zext i8 %427 to i32, !dbg !420
  %459 = or i32 %457, %458, !dbg !420
  %460 = or i32 %459, %455, !dbg !420
  %461 = or i32 %460, %453, !dbg !420
  %462 = zext i8 %442 to i32, !dbg !421
  %463 = shl nuw i32 %462, 24, !dbg !421
  %464 = zext i8 %440 to i32, !dbg !421
  %465 = shl nuw nsw i32 %464, 16, !dbg !421
  %466 = zext i8 %438 to i32, !dbg !421
  %467 = shl nuw nsw i32 %466, 8, !dbg !421
  %468 = zext i8 %436 to i32, !dbg !421
  %469 = or i32 %467, %468, !dbg !421
  %470 = or i32 %469, %465, !dbg !421
  %471 = or i32 %470, %463, !dbg !421
  %472 = zext i8 %451 to i32, !dbg !422
  %473 = shl nuw i32 %472, 24, !dbg !422
  %474 = zext i8 %449 to i32, !dbg !422
  %475 = shl nuw nsw i32 %474, 16, !dbg !422
  %476 = zext i8 %447 to i32, !dbg !422
  %477 = shl nuw nsw i32 %476, 8, !dbg !422
  %478 = zext i8 %445 to i32, !dbg !422
  %479 = or i32 %477, %478, !dbg !422
  %480 = or i32 %479, %475, !dbg !422
  %481 = or i32 %480, %473, !dbg !422
  %482 = icmp ult i32 %461, %471, !dbg !422
  %483 = icmp eq i32 %481, 0, !dbg !424
  br i1 %482, label %484, label %490, !dbg !425

484:                                              ; preds = %425
  br i1 %483, label %487, label %485, !dbg !426

485:                                              ; preds = %484
  %486 = udiv i32 %461, %481, !dbg !427
  br label %487

487:                                              ; preds = %485, %484
  %488 = phi i32 [ %486, %485 ], [ 0, %484 ], !dbg !424
  %489 = add i32 %488, %471, !dbg !428
  br label %496, !dbg !429

490:                                              ; preds = %425
  br i1 %483, label %493, label %491, !dbg !430

491:                                              ; preds = %490
  %492 = urem i32 %471, %481, !dbg !431
  br label %493

493:                                              ; preds = %491, %490
  %494 = phi i32 [ %492, %491 ], [ 0, %490 ], !dbg !424
  %495 = add i32 %494, %461, !dbg !432
  br label %496

496:                                              ; preds = %487, %493
  %497 = phi i32 [ %489, %487 ], [ %495, %493 ], !dbg !424
  %498 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !433
  %499 = bitcast i8* %498 to %struct.ink_block*, !dbg !433
  %500 = icmp eq i8* %498, null, !dbg !435
  br i1 %500, label %501, label %502, !dbg !436

501:                                              ; preds = %496
  tail call fastcc void @ink_fail() #11, !dbg !437
  unreachable

502:                                              ; preds = %496
  %503 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !438, !tbaa !18
  %504 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %499, i64 0, i32 0, !dbg !439
  store %struct.ink_block* %503, %struct.ink_block** %504, align 8, !dbg !440, !tbaa !24
  store i8* %498, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !441, !tbaa !18
  %505 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %499, i64 1, !dbg !442
  %506 = bitcast %struct.ink_block* %505 to i32*, !dbg !443
  store i32 %497, i32* %506, align 4, !dbg !444, !tbaa !99
  %507 = bitcast i8** %3 to %struct.ink_block**, !dbg !445
  store %struct.ink_block* %505, %struct.ink_block** %507, align 8, !dbg !445, !tbaa !18
  br label %592

508:                                              ; preds = %5
  %509 = load i8*, i8** %1, align 8, !dbg !446, !tbaa !18
  %510 = load i8, i8* %509, align 1, !dbg !447, !tbaa !220
  %511 = getelementptr inbounds i8, i8* %509, i64 1, !dbg !447
  %512 = load i8, i8* %511, align 1, !dbg !447, !tbaa !220
  %513 = getelementptr inbounds i8, i8* %509, i64 2, !dbg !447
  %514 = load i8, i8* %513, align 1, !dbg !447, !tbaa !220
  %515 = getelementptr inbounds i8, i8* %509, i64 3, !dbg !447
  %516 = load i8, i8* %515, align 1, !dbg !447, !tbaa !220
  %517 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !449
  %518 = load i8*, i8** %517, align 8, !dbg !449, !tbaa !18
  %519 = load i8, i8* %518, align 1, !dbg !450, !tbaa !220
  %520 = getelementptr inbounds i8, i8* %518, i64 1, !dbg !450
  %521 = load i8, i8* %520, align 1, !dbg !450, !tbaa !220
  %522 = getelementptr inbounds i8, i8* %518, i64 2, !dbg !450
  %523 = load i8, i8* %522, align 1, !dbg !450, !tbaa !220
  %524 = getelementptr inbounds i8, i8* %518, i64 3, !dbg !450
  %525 = load i8, i8* %524, align 1, !dbg !450, !tbaa !220
  %526 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !452
  %527 = load i8*, i8** %526, align 8, !dbg !452, !tbaa !18
  %528 = load i8, i8* %527, align 1, !dbg !453, !tbaa !220
  %529 = getelementptr inbounds i8, i8* %527, i64 1, !dbg !453
  %530 = load i8, i8* %529, align 1, !dbg !453, !tbaa !220
  %531 = getelementptr inbounds i8, i8* %527, i64 2, !dbg !453
  %532 = load i8, i8* %531, align 1, !dbg !453, !tbaa !220
  %533 = getelementptr inbounds i8, i8* %527, i64 3, !dbg !453
  %534 = load i8, i8* %533, align 1, !dbg !453, !tbaa !220
  %535 = zext i8 %516 to i32, !dbg !455
  %536 = shl nuw i32 %535, 24, !dbg !455
  %537 = zext i8 %514 to i32, !dbg !455
  %538 = shl nuw nsw i32 %537, 16, !dbg !455
  %539 = zext i8 %512 to i32, !dbg !455
  %540 = shl nuw nsw i32 %539, 8, !dbg !455
  %541 = zext i8 %510 to i32, !dbg !455
  %542 = or i32 %540, %541, !dbg !455
  %543 = or i32 %542, %538, !dbg !455
  %544 = or i32 %543, %536, !dbg !455
  %545 = zext i8 %525 to i32, !dbg !456
  %546 = shl nuw i32 %545, 24, !dbg !456
  %547 = zext i8 %523 to i32, !dbg !456
  %548 = shl nuw nsw i32 %547, 16, !dbg !456
  %549 = zext i8 %521 to i32, !dbg !456
  %550 = shl nuw nsw i32 %549, 8, !dbg !456
  %551 = zext i8 %519 to i32, !dbg !456
  %552 = or i32 %550, %551, !dbg !456
  %553 = or i32 %552, %548, !dbg !456
  %554 = or i32 %553, %546, !dbg !456
  %555 = zext i8 %534 to i32, !dbg !457
  %556 = shl nuw i32 %555, 24, !dbg !457
  %557 = zext i8 %532 to i32, !dbg !457
  %558 = shl nuw nsw i32 %557, 16, !dbg !457
  %559 = zext i8 %530 to i32, !dbg !457
  %560 = shl nuw nsw i32 %559, 8, !dbg !457
  %561 = zext i8 %528 to i32, !dbg !457
  %562 = or i32 %560, %561, !dbg !457
  %563 = or i32 %562, %558, !dbg !457
  %564 = or i32 %563, %556, !dbg !457
  %565 = icmp ult i32 %544, %554, !dbg !457
  %566 = icmp eq i32 %564, 0, !dbg !459
  br i1 %565, label %567, label %573, !dbg !460

567:                                              ; preds = %508
  br i1 %566, label %570, label %568, !dbg !461

568:                                              ; preds = %567
  %569 = udiv i32 %544, %564, !dbg !462
  br label %570

570:                                              ; preds = %568, %567
  %571 = phi i32 [ %569, %568 ], [ 0, %567 ], !dbg !459
  %572 = add i32 %571, %554, !dbg !463
  br label %579, !dbg !464

573:                                              ; preds = %508
  br i1 %566, label %576, label %574, !dbg !465

574:                                              ; preds = %573
  %575 = urem i32 %554, %564, !dbg !466
  br label %576

576:                                              ; preds = %574, %573
  %577 = phi i32 [ %575, %574 ], [ 0, %573 ], !dbg !459
  %578 = add i32 %577, %544, !dbg !467
  br label %579

579:                                              ; preds = %570, %576
  %580 = phi i32 [ %572, %570 ], [ %578, %576 ], !dbg !459
  %581 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !468
  %582 = bitcast i8* %581 to %struct.ink_block*, !dbg !468
  %583 = icmp eq i8* %581, null, !dbg !470
  br i1 %583, label %584, label %585, !dbg !471

584:                                              ; preds = %579
  tail call fastcc void @ink_fail() #11, !dbg !472
  unreachable

585:                                              ; preds = %579
  %586 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !473, !tbaa !18
  %587 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %582, i64 0, i32 0, !dbg !474
  store %struct.ink_block* %586, %struct.ink_block** %587, align 8, !dbg !475, !tbaa !24
  store i8* %581, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !476, !tbaa !18
  %588 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %582, i64 1, !dbg !477
  %589 = bitcast %struct.ink_block* %588 to i32*, !dbg !478
  store i32 %580, i32* %589, align 4, !dbg !479, !tbaa !99
  %590 = bitcast i8** %3 to %struct.ink_block**, !dbg !480
  store %struct.ink_block* %588, %struct.ink_block** %590, align 8, !dbg !480, !tbaa !18
  br label %592

591:                                              ; preds = %5
  tail call fastcc void @ink_fail(), !dbg !481
  unreachable

592:                                              ; preds = %585, %502, %385, %295, %237, %142, %6
  %593 = phi i64 [ 1, %585 ], [ 1, %502 ], [ 1, %385 ], [ 1, %295 ], [ 1, %237 ], [ 1, %142 ], [ %53, %6 ]
  store i64 %593, i64* %4, align 8, !dbg !482, !tbaa !225
  ret void, !dbg !483
}

; Function Attrs: nounwind ssp uwtable
define i32 @ink_compute_scalar32(i32 %0, i8** readonly %1, i64* nocapture readnone %2) local_unnamed_addr #0 !dbg !484 {
  switch i32 %0, label %476 [
    i32 1, label %4
    i32 2, label %89
    i32 3, label %174
    i32 4, label %254
    i32 5, label %334
    i32 6, label %405
  ], !dbg !485

4:                                                ; preds = %3
  %5 = load i8*, i8** %1, align 8, !dbg !486, !tbaa !18
  %6 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !487
  %7 = load i8*, i8** %6, align 8, !dbg !487, !tbaa !18
  %8 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !488
  %9 = load i8*, i8** %8, align 8, !dbg !488, !tbaa !18
  %10 = load i8, i8* %9, align 1, !dbg !489, !tbaa !220
  %11 = getelementptr inbounds i8, i8* %9, i64 1, !dbg !489
  %12 = load i8, i8* %11, align 1, !dbg !489, !tbaa !220
  %13 = getelementptr inbounds i8, i8* %9, i64 2, !dbg !489
  %14 = load i8, i8* %13, align 1, !dbg !489, !tbaa !220
  %15 = getelementptr inbounds i8, i8* %9, i64 3, !dbg !489
  %16 = load i8, i8* %15, align 1, !dbg !489, !tbaa !220
  %17 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !491
  %18 = load i8*, i8** %17, align 8, !dbg !491, !tbaa !18
  %19 = load i8, i8* %18, align 1, !dbg !492, !tbaa !220
  %20 = getelementptr inbounds i8, i8* %18, i64 1, !dbg !492
  %21 = load i8, i8* %20, align 1, !dbg !492, !tbaa !220
  %22 = getelementptr inbounds i8, i8* %18, i64 2, !dbg !492
  %23 = load i8, i8* %22, align 1, !dbg !492, !tbaa !220
  %24 = getelementptr inbounds i8, i8* %18, i64 3, !dbg !492
  %25 = load i8, i8* %24, align 1, !dbg !492, !tbaa !220
  %26 = zext i8 %16 to i32, !dbg !494
  %27 = shl nuw i32 %26, 24, !dbg !494
  %28 = zext i8 %14 to i32, !dbg !494
  %29 = shl nuw nsw i32 %28, 16, !dbg !494
  %30 = zext i8 %12 to i32, !dbg !494
  %31 = shl nuw nsw i32 %30, 8, !dbg !494
  %32 = zext i8 %10 to i32, !dbg !494
  %33 = or i32 %31, %32, !dbg !494
  %34 = or i32 %33, %29, !dbg !494
  %35 = or i32 %34, %27, !dbg !494
  %36 = zext i8 %25 to i32, !dbg !495
  %37 = shl nuw i32 %36, 24, !dbg !495
  %38 = zext i8 %23 to i32, !dbg !495
  %39 = shl nuw nsw i32 %38, 16, !dbg !495
  %40 = zext i8 %21 to i32, !dbg !495
  %41 = shl nuw nsw i32 %40, 8, !dbg !495
  %42 = zext i8 %19 to i32, !dbg !495
  %43 = or i32 %41, %42, !dbg !495
  %44 = or i32 %43, %39, !dbg !495
  %45 = or i32 %44, %37, !dbg !495
  %46 = icmp eq i32 %45, 0, !dbg !495
  br i1 %46, label %84, label %47, !dbg !497

47:                                               ; preds = %4
  %48 = getelementptr inbounds i8, i8* %7, i64 3, !dbg !498
  %49 = load i8, i8* %48, align 1, !dbg !498, !tbaa !220
  %50 = zext i8 %49 to i32, !dbg !500
  %51 = shl nuw i32 %50, 24, !dbg !500
  %52 = getelementptr inbounds i8, i8* %7, i64 2, !dbg !498
  %53 = load i8, i8* %52, align 1, !dbg !498, !tbaa !220
  %54 = zext i8 %53 to i32, !dbg !500
  %55 = shl nuw nsw i32 %54, 16, !dbg !500
  %56 = or i32 %55, %51, !dbg !500
  %57 = getelementptr inbounds i8, i8* %7, i64 1, !dbg !498
  %58 = load i8, i8* %57, align 1, !dbg !498, !tbaa !220
  %59 = zext i8 %58 to i32, !dbg !500
  %60 = shl nuw nsw i32 %59, 8, !dbg !500
  %61 = or i32 %56, %60, !dbg !500
  %62 = load i8, i8* %7, align 1, !dbg !498, !tbaa !220
  %63 = zext i8 %62 to i32, !dbg !500
  %64 = or i32 %61, %63, !dbg !500
  %65 = getelementptr inbounds i8, i8* %5, i64 3, !dbg !501
  %66 = load i8, i8* %65, align 1, !dbg !501, !tbaa !220
  %67 = zext i8 %66 to i32, !dbg !503
  %68 = shl nuw i32 %67, 24, !dbg !503
  %69 = getelementptr inbounds i8, i8* %5, i64 2, !dbg !501
  %70 = load i8, i8* %69, align 1, !dbg !501, !tbaa !220
  %71 = zext i8 %70 to i32, !dbg !503
  %72 = shl nuw nsw i32 %71, 16, !dbg !503
  %73 = or i32 %72, %68, !dbg !503
  %74 = getelementptr inbounds i8, i8* %5, i64 1, !dbg !501
  %75 = load i8, i8* %74, align 1, !dbg !501, !tbaa !220
  %76 = zext i8 %75 to i32, !dbg !503
  %77 = shl nuw nsw i32 %76, 8, !dbg !503
  %78 = or i32 %73, %77, !dbg !503
  %79 = load i8, i8* %5, align 1, !dbg !501, !tbaa !220
  %80 = zext i8 %79 to i32, !dbg !503
  %81 = or i32 %78, %80, !dbg !503
  %82 = udiv i32 %64, %45, !dbg !504
  %83 = urem i32 %81, %45, !dbg !505
  br label %84

84:                                               ; preds = %4, %47
  %85 = phi i32 [ %82, %47 ], [ 0, %4 ]
  %86 = phi i32 [ %83, %47 ], [ 0, %4 ], !dbg !506
  %87 = add i32 %85, %35, !dbg !507
  %88 = add i32 %87, %86, !dbg !508
  br label %477

89:                                               ; preds = %3
  %90 = load i8*, i8** %1, align 8, !dbg !509, !tbaa !18
  %91 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !510
  %92 = load i8*, i8** %91, align 8, !dbg !510, !tbaa !18
  %93 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !511
  %94 = load i8*, i8** %93, align 8, !dbg !511, !tbaa !18
  %95 = load i8, i8* %94, align 1, !dbg !512, !tbaa !220
  %96 = getelementptr inbounds i8, i8* %94, i64 1, !dbg !512
  %97 = load i8, i8* %96, align 1, !dbg !512, !tbaa !220
  %98 = getelementptr inbounds i8, i8* %94, i64 2, !dbg !512
  %99 = load i8, i8* %98, align 1, !dbg !512, !tbaa !220
  %100 = getelementptr inbounds i8, i8* %94, i64 3, !dbg !512
  %101 = load i8, i8* %100, align 1, !dbg !512, !tbaa !220
  %102 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !514
  %103 = load i8*, i8** %102, align 8, !dbg !514, !tbaa !18
  %104 = load i8, i8* %103, align 1, !dbg !515, !tbaa !220
  %105 = getelementptr inbounds i8, i8* %103, i64 1, !dbg !515
  %106 = load i8, i8* %105, align 1, !dbg !515, !tbaa !220
  %107 = getelementptr inbounds i8, i8* %103, i64 2, !dbg !515
  %108 = load i8, i8* %107, align 1, !dbg !515, !tbaa !220
  %109 = getelementptr inbounds i8, i8* %103, i64 3, !dbg !515
  %110 = load i8, i8* %109, align 1, !dbg !515, !tbaa !220
  %111 = zext i8 %101 to i32, !dbg !517
  %112 = shl nuw i32 %111, 24, !dbg !517
  %113 = zext i8 %99 to i32, !dbg !517
  %114 = shl nuw nsw i32 %113, 16, !dbg !517
  %115 = zext i8 %97 to i32, !dbg !517
  %116 = shl nuw nsw i32 %115, 8, !dbg !517
  %117 = zext i8 %95 to i32, !dbg !517
  %118 = or i32 %116, %117, !dbg !517
  %119 = or i32 %118, %114, !dbg !517
  %120 = or i32 %119, %112, !dbg !517
  %121 = zext i8 %110 to i32, !dbg !518
  %122 = shl nuw i32 %121, 24, !dbg !518
  %123 = zext i8 %108 to i32, !dbg !518
  %124 = shl nuw nsw i32 %123, 16, !dbg !518
  %125 = zext i8 %106 to i32, !dbg !518
  %126 = shl nuw nsw i32 %125, 8, !dbg !518
  %127 = zext i8 %104 to i32, !dbg !518
  %128 = or i32 %126, %127, !dbg !518
  %129 = or i32 %128, %124, !dbg !518
  %130 = or i32 %129, %122, !dbg !518
  %131 = icmp eq i32 %130, 0, !dbg !518
  br i1 %131, label %169, label %132, !dbg !520

132:                                              ; preds = %89
  %133 = getelementptr inbounds i8, i8* %92, i64 3, !dbg !521
  %134 = load i8, i8* %133, align 1, !dbg !521, !tbaa !220
  %135 = zext i8 %134 to i32, !dbg !523
  %136 = shl nuw i32 %135, 24, !dbg !523
  %137 = getelementptr inbounds i8, i8* %92, i64 2, !dbg !521
  %138 = load i8, i8* %137, align 1, !dbg !521, !tbaa !220
  %139 = zext i8 %138 to i32, !dbg !523
  %140 = shl nuw nsw i32 %139, 16, !dbg !523
  %141 = or i32 %140, %136, !dbg !523
  %142 = getelementptr inbounds i8, i8* %92, i64 1, !dbg !521
  %143 = load i8, i8* %142, align 1, !dbg !521, !tbaa !220
  %144 = zext i8 %143 to i32, !dbg !523
  %145 = shl nuw nsw i32 %144, 8, !dbg !523
  %146 = or i32 %141, %145, !dbg !523
  %147 = load i8, i8* %92, align 1, !dbg !521, !tbaa !220
  %148 = zext i8 %147 to i32, !dbg !523
  %149 = or i32 %146, %148, !dbg !523
  %150 = getelementptr inbounds i8, i8* %90, i64 3, !dbg !524
  %151 = load i8, i8* %150, align 1, !dbg !524, !tbaa !220
  %152 = zext i8 %151 to i32, !dbg !526
  %153 = shl nuw i32 %152, 24, !dbg !526
  %154 = getelementptr inbounds i8, i8* %90, i64 2, !dbg !524
  %155 = load i8, i8* %154, align 1, !dbg !524, !tbaa !220
  %156 = zext i8 %155 to i32, !dbg !526
  %157 = shl nuw nsw i32 %156, 16, !dbg !526
  %158 = or i32 %157, %153, !dbg !526
  %159 = getelementptr inbounds i8, i8* %90, i64 1, !dbg !524
  %160 = load i8, i8* %159, align 1, !dbg !524, !tbaa !220
  %161 = zext i8 %160 to i32, !dbg !526
  %162 = shl nuw nsw i32 %161, 8, !dbg !526
  %163 = or i32 %158, %162, !dbg !526
  %164 = load i8, i8* %90, align 1, !dbg !524, !tbaa !220
  %165 = zext i8 %164 to i32, !dbg !526
  %166 = or i32 %163, %165, !dbg !526
  %167 = udiv i32 %149, %130, !dbg !527
  %168 = urem i32 %166, %130, !dbg !528
  br label %169

169:                                              ; preds = %89, %132
  %170 = phi i32 [ %167, %132 ], [ 0, %89 ]
  %171 = phi i32 [ %168, %132 ], [ 0, %89 ], !dbg !529
  %172 = add i32 %170, %120, !dbg !530
  %173 = add i32 %172, %171, !dbg !531
  br label %477

174:                                              ; preds = %3
  %175 = load i8*, i8** %1, align 8, !dbg !532, !tbaa !18
  %176 = load i8, i8* %175, align 1, !dbg !533, !tbaa !220
  %177 = getelementptr inbounds i8, i8* %175, i64 1, !dbg !533
  %178 = load i8, i8* %177, align 1, !dbg !533, !tbaa !220
  %179 = getelementptr inbounds i8, i8* %175, i64 2, !dbg !533
  %180 = load i8, i8* %179, align 1, !dbg !533, !tbaa !220
  %181 = getelementptr inbounds i8, i8* %175, i64 3, !dbg !533
  %182 = load i8, i8* %181, align 1, !dbg !533, !tbaa !220
  %183 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !535
  %184 = load i8*, i8** %183, align 8, !dbg !535, !tbaa !18
  %185 = load i8, i8* %184, align 1, !dbg !536, !tbaa !220
  %186 = getelementptr inbounds i8, i8* %184, i64 1, !dbg !536
  %187 = load i8, i8* %186, align 1, !dbg !536, !tbaa !220
  %188 = getelementptr inbounds i8, i8* %184, i64 2, !dbg !536
  %189 = load i8, i8* %188, align 1, !dbg !536, !tbaa !220
  %190 = getelementptr inbounds i8, i8* %184, i64 3, !dbg !536
  %191 = load i8, i8* %190, align 1, !dbg !536, !tbaa !220
  %192 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !538
  %193 = load i8*, i8** %192, align 8, !dbg !538, !tbaa !18
  %194 = load i8, i8* %193, align 1, !dbg !539, !tbaa !220
  %195 = getelementptr inbounds i8, i8* %193, i64 1, !dbg !539
  %196 = load i8, i8* %195, align 1, !dbg !539, !tbaa !220
  %197 = getelementptr inbounds i8, i8* %193, i64 2, !dbg !539
  %198 = load i8, i8* %197, align 1, !dbg !539, !tbaa !220
  %199 = getelementptr inbounds i8, i8* %193, i64 3, !dbg !539
  %200 = load i8, i8* %199, align 1, !dbg !539, !tbaa !220
  %201 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !541
  %202 = load i8*, i8** %201, align 8, !dbg !541, !tbaa !18
  %203 = load i8, i8* %202, align 1, !dbg !542, !tbaa !220
  %204 = getelementptr inbounds i8, i8* %202, i64 1, !dbg !542
  %205 = load i8, i8* %204, align 1, !dbg !542, !tbaa !220
  %206 = getelementptr inbounds i8, i8* %202, i64 2, !dbg !542
  %207 = load i8, i8* %206, align 1, !dbg !542, !tbaa !220
  %208 = getelementptr inbounds i8, i8* %202, i64 3, !dbg !542
  %209 = load i8, i8* %208, align 1, !dbg !542, !tbaa !220
  %210 = zext i8 %182 to i32, !dbg !544
  %211 = shl nuw i32 %210, 24, !dbg !544
  %212 = zext i8 %180 to i32, !dbg !544
  %213 = shl nuw nsw i32 %212, 16, !dbg !544
  %214 = zext i8 %178 to i32, !dbg !544
  %215 = shl nuw nsw i32 %214, 8, !dbg !544
  %216 = zext i8 %176 to i32, !dbg !544
  %217 = or i32 %215, %216, !dbg !544
  %218 = or i32 %217, %213, !dbg !544
  %219 = or i32 %218, %211, !dbg !544
  %220 = zext i8 %191 to i32, !dbg !545
  %221 = shl nuw i32 %220, 24, !dbg !545
  %222 = zext i8 %189 to i32, !dbg !545
  %223 = shl nuw nsw i32 %222, 16, !dbg !545
  %224 = zext i8 %187 to i32, !dbg !545
  %225 = shl nuw nsw i32 %224, 8, !dbg !545
  %226 = zext i8 %185 to i32, !dbg !545
  %227 = or i32 %225, %226, !dbg !545
  %228 = or i32 %227, %223, !dbg !545
  %229 = or i32 %228, %221, !dbg !545
  %230 = zext i8 %200 to i32, !dbg !546
  %231 = shl nuw i32 %230, 24, !dbg !546
  %232 = zext i8 %198 to i32, !dbg !546
  %233 = shl nuw nsw i32 %232, 16, !dbg !546
  %234 = zext i8 %196 to i32, !dbg !546
  %235 = shl nuw nsw i32 %234, 8, !dbg !546
  %236 = zext i8 %194 to i32, !dbg !546
  %237 = or i32 %235, %236, !dbg !546
  %238 = or i32 %237, %233, !dbg !546
  %239 = or i32 %238, %231, !dbg !546
  %240 = zext i8 %209 to i32, !dbg !547
  %241 = shl nuw i32 %240, 24, !dbg !547
  %242 = zext i8 %207 to i32, !dbg !547
  %243 = shl nuw nsw i32 %242, 16, !dbg !547
  %244 = zext i8 %205 to i32, !dbg !547
  %245 = shl nuw nsw i32 %244, 8, !dbg !547
  %246 = zext i8 %203 to i32, !dbg !547
  %247 = or i32 %245, %246, !dbg !547
  %248 = or i32 %247, %243, !dbg !547
  %249 = or i32 %248, %241, !dbg !547
  %250 = icmp ult i32 %219, %239, !dbg !547
  %251 = add i32 %249, %229, !dbg !549
  %252 = mul i32 %229, 3, !dbg !549
  %253 = select i1 %250, i32 %251, i32 %252, !dbg !549
  br label %477

254:                                              ; preds = %3
  %255 = load i8*, i8** %1, align 8, !dbg !550, !tbaa !18
  %256 = load i8, i8* %255, align 1, !dbg !551, !tbaa !220
  %257 = getelementptr inbounds i8, i8* %255, i64 1, !dbg !551
  %258 = load i8, i8* %257, align 1, !dbg !551, !tbaa !220
  %259 = getelementptr inbounds i8, i8* %255, i64 2, !dbg !551
  %260 = load i8, i8* %259, align 1, !dbg !551, !tbaa !220
  %261 = getelementptr inbounds i8, i8* %255, i64 3, !dbg !551
  %262 = load i8, i8* %261, align 1, !dbg !551, !tbaa !220
  %263 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !553
  %264 = load i8*, i8** %263, align 8, !dbg !553, !tbaa !18
  %265 = load i8, i8* %264, align 1, !dbg !554, !tbaa !220
  %266 = getelementptr inbounds i8, i8* %264, i64 1, !dbg !554
  %267 = load i8, i8* %266, align 1, !dbg !554, !tbaa !220
  %268 = getelementptr inbounds i8, i8* %264, i64 2, !dbg !554
  %269 = load i8, i8* %268, align 1, !dbg !554, !tbaa !220
  %270 = getelementptr inbounds i8, i8* %264, i64 3, !dbg !554
  %271 = load i8, i8* %270, align 1, !dbg !554, !tbaa !220
  %272 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !556
  %273 = load i8*, i8** %272, align 8, !dbg !556, !tbaa !18
  %274 = load i8, i8* %273, align 1, !dbg !557, !tbaa !220
  %275 = getelementptr inbounds i8, i8* %273, i64 1, !dbg !557
  %276 = load i8, i8* %275, align 1, !dbg !557, !tbaa !220
  %277 = getelementptr inbounds i8, i8* %273, i64 2, !dbg !557
  %278 = load i8, i8* %277, align 1, !dbg !557, !tbaa !220
  %279 = getelementptr inbounds i8, i8* %273, i64 3, !dbg !557
  %280 = load i8, i8* %279, align 1, !dbg !557, !tbaa !220
  %281 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !559
  %282 = load i8*, i8** %281, align 8, !dbg !559, !tbaa !18
  %283 = load i8, i8* %282, align 1, !dbg !560, !tbaa !220
  %284 = getelementptr inbounds i8, i8* %282, i64 1, !dbg !560
  %285 = load i8, i8* %284, align 1, !dbg !560, !tbaa !220
  %286 = getelementptr inbounds i8, i8* %282, i64 2, !dbg !560
  %287 = load i8, i8* %286, align 1, !dbg !560, !tbaa !220
  %288 = getelementptr inbounds i8, i8* %282, i64 3, !dbg !560
  %289 = load i8, i8* %288, align 1, !dbg !560, !tbaa !220
  %290 = zext i8 %262 to i32, !dbg !562
  %291 = shl nuw i32 %290, 24, !dbg !562
  %292 = zext i8 %260 to i32, !dbg !562
  %293 = shl nuw nsw i32 %292, 16, !dbg !562
  %294 = zext i8 %258 to i32, !dbg !562
  %295 = shl nuw nsw i32 %294, 8, !dbg !562
  %296 = zext i8 %256 to i32, !dbg !562
  %297 = or i32 %295, %296, !dbg !562
  %298 = or i32 %297, %293, !dbg !562
  %299 = or i32 %298, %291, !dbg !562
  %300 = zext i8 %271 to i32, !dbg !563
  %301 = shl nuw i32 %300, 24, !dbg !563
  %302 = zext i8 %269 to i32, !dbg !563
  %303 = shl nuw nsw i32 %302, 16, !dbg !563
  %304 = zext i8 %267 to i32, !dbg !563
  %305 = shl nuw nsw i32 %304, 8, !dbg !563
  %306 = zext i8 %265 to i32, !dbg !563
  %307 = or i32 %305, %306, !dbg !563
  %308 = or i32 %307, %303, !dbg !563
  %309 = or i32 %308, %301, !dbg !563
  %310 = zext i8 %280 to i32, !dbg !564
  %311 = shl nuw i32 %310, 24, !dbg !564
  %312 = zext i8 %278 to i32, !dbg !564
  %313 = shl nuw nsw i32 %312, 16, !dbg !564
  %314 = zext i8 %276 to i32, !dbg !564
  %315 = shl nuw nsw i32 %314, 8, !dbg !564
  %316 = zext i8 %274 to i32, !dbg !564
  %317 = or i32 %315, %316, !dbg !564
  %318 = or i32 %317, %313, !dbg !564
  %319 = or i32 %318, %311, !dbg !564
  %320 = zext i8 %289 to i32, !dbg !565
  %321 = shl nuw i32 %320, 24, !dbg !565
  %322 = zext i8 %287 to i32, !dbg !565
  %323 = shl nuw nsw i32 %322, 16, !dbg !565
  %324 = zext i8 %285 to i32, !dbg !565
  %325 = shl nuw nsw i32 %324, 8, !dbg !565
  %326 = zext i8 %283 to i32, !dbg !565
  %327 = or i32 %325, %326, !dbg !565
  %328 = or i32 %327, %323, !dbg !565
  %329 = or i32 %328, %321, !dbg !565
  %330 = icmp ult i32 %299, %319, !dbg !565
  %331 = add i32 %329, %309, !dbg !567
  %332 = mul i32 %309, 3, !dbg !567
  %333 = select i1 %330, i32 %331, i32 %332, !dbg !567
  br label %477

334:                                              ; preds = %3
  %335 = load i8*, i8** %1, align 8, !dbg !568, !tbaa !18
  %336 = load i8, i8* %335, align 1, !dbg !569, !tbaa !220
  %337 = getelementptr inbounds i8, i8* %335, i64 1, !dbg !569
  %338 = load i8, i8* %337, align 1, !dbg !569, !tbaa !220
  %339 = getelementptr inbounds i8, i8* %335, i64 2, !dbg !569
  %340 = load i8, i8* %339, align 1, !dbg !569, !tbaa !220
  %341 = getelementptr inbounds i8, i8* %335, i64 3, !dbg !569
  %342 = load i8, i8* %341, align 1, !dbg !569, !tbaa !220
  %343 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !571
  %344 = load i8*, i8** %343, align 8, !dbg !571, !tbaa !18
  %345 = load i8, i8* %344, align 1, !dbg !572, !tbaa !220
  %346 = getelementptr inbounds i8, i8* %344, i64 1, !dbg !572
  %347 = load i8, i8* %346, align 1, !dbg !572, !tbaa !220
  %348 = getelementptr inbounds i8, i8* %344, i64 2, !dbg !572
  %349 = load i8, i8* %348, align 1, !dbg !572, !tbaa !220
  %350 = getelementptr inbounds i8, i8* %344, i64 3, !dbg !572
  %351 = load i8, i8* %350, align 1, !dbg !572, !tbaa !220
  %352 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !574
  %353 = load i8*, i8** %352, align 8, !dbg !574, !tbaa !18
  %354 = load i8, i8* %353, align 1, !dbg !575, !tbaa !220
  %355 = getelementptr inbounds i8, i8* %353, i64 1, !dbg !575
  %356 = load i8, i8* %355, align 1, !dbg !575, !tbaa !220
  %357 = getelementptr inbounds i8, i8* %353, i64 2, !dbg !575
  %358 = load i8, i8* %357, align 1, !dbg !575, !tbaa !220
  %359 = getelementptr inbounds i8, i8* %353, i64 3, !dbg !575
  %360 = load i8, i8* %359, align 1, !dbg !575, !tbaa !220
  %361 = zext i8 %342 to i32, !dbg !577
  %362 = shl nuw i32 %361, 24, !dbg !577
  %363 = zext i8 %340 to i32, !dbg !577
  %364 = shl nuw nsw i32 %363, 16, !dbg !577
  %365 = zext i8 %338 to i32, !dbg !577
  %366 = shl nuw nsw i32 %365, 8, !dbg !577
  %367 = zext i8 %336 to i32, !dbg !577
  %368 = or i32 %366, %367, !dbg !577
  %369 = or i32 %368, %364, !dbg !577
  %370 = or i32 %369, %362, !dbg !577
  %371 = zext i8 %351 to i32, !dbg !578
  %372 = shl nuw i32 %371, 24, !dbg !578
  %373 = zext i8 %349 to i32, !dbg !578
  %374 = shl nuw nsw i32 %373, 16, !dbg !578
  %375 = zext i8 %347 to i32, !dbg !578
  %376 = shl nuw nsw i32 %375, 8, !dbg !578
  %377 = zext i8 %345 to i32, !dbg !578
  %378 = or i32 %376, %377, !dbg !578
  %379 = or i32 %378, %374, !dbg !578
  %380 = or i32 %379, %372, !dbg !578
  %381 = zext i8 %360 to i32, !dbg !579
  %382 = shl nuw i32 %381, 24, !dbg !579
  %383 = zext i8 %358 to i32, !dbg !579
  %384 = shl nuw nsw i32 %383, 16, !dbg !579
  %385 = zext i8 %356 to i32, !dbg !579
  %386 = shl nuw nsw i32 %385, 8, !dbg !579
  %387 = zext i8 %354 to i32, !dbg !579
  %388 = or i32 %386, %387, !dbg !579
  %389 = or i32 %388, %384, !dbg !579
  %390 = or i32 %389, %382, !dbg !579
  %391 = icmp ult i32 %370, %380, !dbg !579
  %392 = icmp eq i32 %390, 0, !dbg !581
  br i1 %391, label %393, label %399, !dbg !582

393:                                              ; preds = %334
  br i1 %392, label %396, label %394, !dbg !583

394:                                              ; preds = %393
  %395 = udiv i32 %370, %390, !dbg !584
  br label %396

396:                                              ; preds = %394, %393
  %397 = phi i32 [ %395, %394 ], [ 0, %393 ], !dbg !581
  %398 = add i32 %397, %380, !dbg !585
  br label %477, !dbg !586

399:                                              ; preds = %334
  br i1 %392, label %402, label %400, !dbg !587

400:                                              ; preds = %399
  %401 = urem i32 %380, %390, !dbg !588
  br label %402

402:                                              ; preds = %400, %399
  %403 = phi i32 [ %401, %400 ], [ 0, %399 ], !dbg !581
  %404 = add i32 %403, %370, !dbg !589
  br label %477

405:                                              ; preds = %3
  %406 = load i8*, i8** %1, align 8, !dbg !590, !tbaa !18
  %407 = load i8, i8* %406, align 1, !dbg !591, !tbaa !220
  %408 = getelementptr inbounds i8, i8* %406, i64 1, !dbg !591
  %409 = load i8, i8* %408, align 1, !dbg !591, !tbaa !220
  %410 = getelementptr inbounds i8, i8* %406, i64 2, !dbg !591
  %411 = load i8, i8* %410, align 1, !dbg !591, !tbaa !220
  %412 = getelementptr inbounds i8, i8* %406, i64 3, !dbg !591
  %413 = load i8, i8* %412, align 1, !dbg !591, !tbaa !220
  %414 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !593
  %415 = load i8*, i8** %414, align 8, !dbg !593, !tbaa !18
  %416 = load i8, i8* %415, align 1, !dbg !594, !tbaa !220
  %417 = getelementptr inbounds i8, i8* %415, i64 1, !dbg !594
  %418 = load i8, i8* %417, align 1, !dbg !594, !tbaa !220
  %419 = getelementptr inbounds i8, i8* %415, i64 2, !dbg !594
  %420 = load i8, i8* %419, align 1, !dbg !594, !tbaa !220
  %421 = getelementptr inbounds i8, i8* %415, i64 3, !dbg !594
  %422 = load i8, i8* %421, align 1, !dbg !594, !tbaa !220
  %423 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !596
  %424 = load i8*, i8** %423, align 8, !dbg !596, !tbaa !18
  %425 = load i8, i8* %424, align 1, !dbg !597, !tbaa !220
  %426 = getelementptr inbounds i8, i8* %424, i64 1, !dbg !597
  %427 = load i8, i8* %426, align 1, !dbg !597, !tbaa !220
  %428 = getelementptr inbounds i8, i8* %424, i64 2, !dbg !597
  %429 = load i8, i8* %428, align 1, !dbg !597, !tbaa !220
  %430 = getelementptr inbounds i8, i8* %424, i64 3, !dbg !597
  %431 = load i8, i8* %430, align 1, !dbg !597, !tbaa !220
  %432 = zext i8 %413 to i32, !dbg !599
  %433 = shl nuw i32 %432, 24, !dbg !599
  %434 = zext i8 %411 to i32, !dbg !599
  %435 = shl nuw nsw i32 %434, 16, !dbg !599
  %436 = zext i8 %409 to i32, !dbg !599
  %437 = shl nuw nsw i32 %436, 8, !dbg !599
  %438 = zext i8 %407 to i32, !dbg !599
  %439 = or i32 %437, %438, !dbg !599
  %440 = or i32 %439, %435, !dbg !599
  %441 = or i32 %440, %433, !dbg !599
  %442 = zext i8 %422 to i32, !dbg !600
  %443 = shl nuw i32 %442, 24, !dbg !600
  %444 = zext i8 %420 to i32, !dbg !600
  %445 = shl nuw nsw i32 %444, 16, !dbg !600
  %446 = zext i8 %418 to i32, !dbg !600
  %447 = shl nuw nsw i32 %446, 8, !dbg !600
  %448 = zext i8 %416 to i32, !dbg !600
  %449 = or i32 %447, %448, !dbg !600
  %450 = or i32 %449, %445, !dbg !600
  %451 = or i32 %450, %443, !dbg !600
  %452 = zext i8 %431 to i32, !dbg !601
  %453 = shl nuw i32 %452, 24, !dbg !601
  %454 = zext i8 %429 to i32, !dbg !601
  %455 = shl nuw nsw i32 %454, 16, !dbg !601
  %456 = zext i8 %427 to i32, !dbg !601
  %457 = shl nuw nsw i32 %456, 8, !dbg !601
  %458 = zext i8 %425 to i32, !dbg !601
  %459 = or i32 %457, %458, !dbg !601
  %460 = or i32 %459, %455, !dbg !601
  %461 = or i32 %460, %453, !dbg !601
  %462 = icmp ult i32 %441, %451, !dbg !601
  %463 = icmp eq i32 %461, 0, !dbg !603
  br i1 %462, label %464, label %470, !dbg !604

464:                                              ; preds = %405
  br i1 %463, label %467, label %465, !dbg !605

465:                                              ; preds = %464
  %466 = udiv i32 %441, %461, !dbg !606
  br label %467

467:                                              ; preds = %465, %464
  %468 = phi i32 [ %466, %465 ], [ 0, %464 ], !dbg !603
  %469 = add i32 %468, %451, !dbg !607
  br label %477, !dbg !608

470:                                              ; preds = %405
  br i1 %463, label %473, label %471, !dbg !609

471:                                              ; preds = %470
  %472 = urem i32 %451, %461, !dbg !610
  br label %473

473:                                              ; preds = %471, %470
  %474 = phi i32 [ %472, %471 ], [ 0, %470 ], !dbg !603
  %475 = add i32 %474, %441, !dbg !611
  br label %477

476:                                              ; preds = %3
  tail call fastcc void @ink_fail(), !dbg !612
  unreachable

477:                                              ; preds = %473, %467, %402, %396, %254, %174, %169, %84
  %478 = phi i32 [ %333, %254 ], [ %253, %174 ], [ %173, %169 ], [ %88, %84 ], [ %398, %396 ], [ %404, %402 ], [ %469, %467 ], [ %475, %473 ], !dbg !613
  ret i32 %478, !dbg !614
}

; Function Attrs: noreturn nounwind ssp uwtable
define i64 @ink_compute_scalar64(i32 %0, i8** nocapture readnone %1, i64* nocapture readnone %2) local_unnamed_addr #3 !dbg !615 {
  tail call fastcc void @ink_fail(), !dbg !616
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
!11 = !DIFile(filename: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_heldout_u32/checked/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
!12 = !{!"Apple clang version 14.0.0 (clang-1400.0.29.202)"}
!13 = distinct !DISubprogram(name: "ink_compute_reset", scope: !14, file: !14, line: 29, type: !15, scopeLine: 29, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!14 = !DIFile(filename: "reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_heldout_u32/checked/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
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
!74 = distinct !DISubprogram(name: "lang_fn_pipeline38_left_padded_zip_heldout_u32", scope: !14, file: !14, line: 85, type: !15, scopeLine: 85, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!75 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !76)
!76 = distinct !DILocation(line: 92, column: 18, scope: !74)
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
!94 = !DILocation(line: 92, column: 18, scope: !74)
!95 = !DILocation(line: 93, column: 1, scope: !74)
!96 = !DILocation(line: 93, column: 29, scope: !74)
!97 = !DILocation(line: 94, column: 13, scope: !74)
!98 = !DILocation(line: 136, column: 14, scope: !74)
!99 = !{!100, !100, i64 0}
!100 = !{!"int", !20, i64 0}
!101 = !{!102}
!102 = distinct !{!102, !103}
!103 = distinct !{!103, !"LVerDomain"}
!104 = !DILocation(line: 155, column: 10, scope: !74)
!105 = !DILocation(line: 155, column: 5, scope: !74)
!106 = !DILocation(line: 183, column: 10, scope: !74)
!107 = !DILocation(line: 183, column: 5, scope: !74)
!108 = !DILocation(line: 208, column: 12, scope: !74)
!109 = !{!110}
!110 = distinct !{!110, !103}
!111 = distinct !{!111, !95, !112, !32, !113}
!112 = !DILocation(line: 209, column: 1, scope: !74)
!113 = !{!"llvm.loop.isvectorized", i32 1}
!114 = !DILocation(line: 96, column: 13, scope: !74)
!115 = !DILocation(line: 208, column: 1, scope: !74)
!116 = !DILocation(line: 93, column: 19, scope: !74)
!117 = distinct !{!117, !95, !112, !32, !113}
!118 = !DILocation(line: 211, column: 1, scope: !74)
!119 = !DILocation(line: 119, column: 18, scope: !74)
!120 = !DILocation(line: 129, column: 18, scope: !74)
!121 = !DILocation(line: 130, column: 19, scope: !74)
!122 = !DILocation(line: 132, column: 19, scope: !74)
!123 = !DILocation(line: 191, column: 18, scope: !74)
!124 = !DILocation(line: 194, column: 10, scope: !74)
!125 = !DILocation(line: 195, column: 1, scope: !74)
!126 = !DILocation(line: 203, column: 18, scope: !74)
!127 = !DILocation(line: 206, column: 10, scope: !74)
!128 = !DILocation(line: 0, scope: !74)
!129 = distinct !{!129, !95, !112, !32}
!130 = distinct !DISubprogram(name: "lang_fn_left_word", scope: !14, file: !14, line: 212, type: !15, scopeLine: 212, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!131 = !DILocation(line: 231, column: 7, scope: !130)
!132 = !DILocation(line: 231, column: 5, scope: !130)
!133 = !DILocation(line: 233, column: 16, scope: !130)
!134 = !DILocation(line: 243, column: 17, scope: !130)
!135 = !DILocation(line: 0, scope: !130)
!136 = !DILocation(line: 244, column: 18, scope: !130)
!137 = !DILocation(line: 246, column: 13, scope: !130)
!138 = !DILocation(line: 246, column: 1, scope: !130)
!139 = distinct !DISubprogram(name: "lang_fn_left_signal", scope: !14, file: !14, line: 248, type: !15, scopeLine: 248, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!140 = !DILocation(line: 258, column: 7, scope: !139)
!141 = !DILocation(line: 258, column: 5, scope: !139)
!142 = !DILocation(line: 260, column: 16, scope: !139)
!143 = !DILocation(line: 270, column: 16, scope: !139)
!144 = !DILocation(line: 0, scope: !139)
!145 = !DILocation(line: 271, column: 17, scope: !139)
!146 = !DILocation(line: 273, column: 12, scope: !139)
!147 = !DILocation(line: 273, column: 1, scope: !139)
!148 = distinct !DISubprogram(name: "lang_fn_right_word", scope: !14, file: !14, line: 275, type: !15, scopeLine: 275, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!149 = !DILocation(line: 292, column: 9, scope: !148)
!150 = !DILocation(line: 292, column: 5, scope: !148)
!151 = !DILocation(line: 301, column: 1, scope: !148)
!152 = distinct !DISubprogram(name: "lang_fn_right_signal", scope: !14, file: !14, line: 303, type: !15, scopeLine: 303, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!153 = !DILocation(line: 311, column: 9, scope: !152)
!154 = !DILocation(line: 311, column: 5, scope: !152)
!155 = !DILocation(line: 320, column: 1, scope: !152)
!156 = distinct !DISubprogram(name: "lang_fn_pair_word", scope: !14, file: !14, line: 322, type: !15, scopeLine: 322, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!157 = !DILocation(line: 339, column: 9, scope: !156)
!158 = !DILocation(line: 0, scope: !156)
!159 = !DILocation(line: 339, column: 5, scope: !156)
!160 = !DILocation(line: 345, column: 5, scope: !156)
!161 = !DILocation(line: 347, column: 16, scope: !156)
!162 = !DILocation(line: 350, column: 8, scope: !156)
!163 = !DILocation(line: 351, column: 1, scope: !156)
!164 = !DILocation(line: 357, column: 5, scope: !156)
!165 = !DILocation(line: 359, column: 18, scope: !156)
!166 = !DILocation(line: 362, column: 9, scope: !156)
!167 = !DILocation(line: 364, column: 1, scope: !156)
!168 = distinct !DISubprogram(name: "lang_fn_pair_signal", scope: !14, file: !14, line: 366, type: !15, scopeLine: 366, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!169 = !DILocation(line: 374, column: 9, scope: !168)
!170 = !DILocation(line: 0, scope: !168)
!171 = !DILocation(line: 374, column: 5, scope: !168)
!172 = !DILocation(line: 380, column: 5, scope: !168)
!173 = !DILocation(line: 382, column: 16, scope: !168)
!174 = !DILocation(line: 385, column: 8, scope: !168)
!175 = !DILocation(line: 386, column: 1, scope: !168)
!176 = !DILocation(line: 392, column: 5, scope: !168)
!177 = !DILocation(line: 394, column: 16, scope: !168)
!178 = !DILocation(line: 397, column: 8, scope: !168)
!179 = !DILocation(line: 399, column: 1, scope: !168)
!180 = distinct !DISubprogram(name: "lang_fn_pipeline38_left_padded_zip_heldout_u32_into", scope: !14, file: !14, line: 401, type: !15, scopeLine: 401, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!181 = !DILocation(line: 409, column: 19, scope: !180)
!182 = !DILocation(line: 409, column: 1, scope: !180)
!183 = !DILocation(line: 409, column: 29, scope: !180)
!184 = !DILocation(line: 410, column: 13, scope: !180)
!185 = !DILocation(line: 452, column: 14, scope: !180)
!186 = !{!187}
!187 = distinct !{!187, !188}
!188 = distinct !{!188, !"LVerDomain"}
!189 = !DILocation(line: 471, column: 10, scope: !180)
!190 = !DILocation(line: 471, column: 5, scope: !180)
!191 = !DILocation(line: 499, column: 10, scope: !180)
!192 = !DILocation(line: 499, column: 5, scope: !180)
!193 = !DILocation(line: 524, column: 12, scope: !180)
!194 = !{!195}
!195 = distinct !{!195, !188}
!196 = distinct !{!196, !182, !197, !32, !113}
!197 = !DILocation(line: 525, column: 1, scope: !180)
!198 = !DILocation(line: 412, column: 13, scope: !180)
!199 = !DILocation(line: 524, column: 1, scope: !180)
!200 = distinct !{!200, !182, !197, !32, !113}
!201 = !DILocation(line: 526, column: 1, scope: !180)
!202 = !DILocation(line: 435, column: 18, scope: !180)
!203 = !DILocation(line: 445, column: 18, scope: !180)
!204 = !DILocation(line: 446, column: 19, scope: !180)
!205 = !DILocation(line: 448, column: 19, scope: !180)
!206 = !DILocation(line: 507, column: 18, scope: !180)
!207 = !DILocation(line: 510, column: 10, scope: !180)
!208 = !DILocation(line: 511, column: 1, scope: !180)
!209 = !DILocation(line: 519, column: 18, scope: !180)
!210 = !DILocation(line: 522, column: 10, scope: !180)
!211 = !DILocation(line: 0, scope: !180)
!212 = distinct !{!212, !182, !197, !32}
!213 = distinct !DISubprogram(name: "ink_compute_into", scope: !14, file: !14, line: 528, type: !15, scopeLine: 528, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!214 = !DILocation(line: 528, column: 151, scope: !213)
!215 = !DILocation(line: 529, column: 34, scope: !213)
!216 = !DILocation(line: 529, column: 100, scope: !213)
!217 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !219)
!218 = distinct !DISubprogram(name: "ink_copy", scope: !14, file: !14, line: 37, type: !15, scopeLine: 37, flags: DIFlagPrototyped, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!219 = distinct !DILocation(line: 529, column: 87, scope: !213)
!220 = !{!20, !20, i64 0}
!221 = !DILocation(line: 529, column: 145, scope: !213)
!222 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !223)
!223 = distinct !DILocation(line: 529, column: 132, scope: !213)
!224 = !DILocation(line: 529, column: 242, scope: !213)
!225 = !{!226, !226, i64 0}
!226 = !{!"long", !20, i64 0}
!227 = !DILocation(line: 529, column: 287, scope: !213)
!228 = !DILocation(line: 529, column: 290, scope: !213)
!229 = !DILocation(line: 409, column: 19, scope: !180, inlinedAt: !230)
!230 = distinct !DILocation(line: 529, column: 172, scope: !213)
!231 = !DILocation(line: 409, column: 1, scope: !180, inlinedAt: !230)
!232 = !DILocation(line: 409, column: 29, scope: !180, inlinedAt: !230)
!233 = !DILocation(line: 410, column: 13, scope: !180, inlinedAt: !230)
!234 = !DILocation(line: 452, column: 14, scope: !180, inlinedAt: !230)
!235 = !{!236}
!236 = distinct !{!236, !237}
!237 = distinct !{!237, !"LVerDomain"}
!238 = !DILocation(line: 471, column: 10, scope: !180, inlinedAt: !230)
!239 = !DILocation(line: 471, column: 5, scope: !180, inlinedAt: !230)
!240 = !DILocation(line: 499, column: 10, scope: !180, inlinedAt: !230)
!241 = !DILocation(line: 499, column: 5, scope: !180, inlinedAt: !230)
!242 = !DILocation(line: 524, column: 12, scope: !180, inlinedAt: !230)
!243 = !{!244}
!244 = distinct !{!244, !237}
!245 = distinct !{!245, !231, !246, !32, !113}
!246 = !DILocation(line: 525, column: 1, scope: !180, inlinedAt: !230)
!247 = !DILocation(line: 412, column: 13, scope: !180, inlinedAt: !230)
!248 = !DILocation(line: 524, column: 1, scope: !180, inlinedAt: !230)
!249 = distinct !{!249, !231, !246, !32, !113}
!250 = !DILocation(line: 435, column: 18, scope: !180, inlinedAt: !230)
!251 = !DILocation(line: 445, column: 18, scope: !180, inlinedAt: !230)
!252 = !DILocation(line: 446, column: 19, scope: !180, inlinedAt: !230)
!253 = !DILocation(line: 448, column: 19, scope: !180, inlinedAt: !230)
!254 = !DILocation(line: 507, column: 18, scope: !180, inlinedAt: !230)
!255 = !DILocation(line: 510, column: 10, scope: !180, inlinedAt: !230)
!256 = !DILocation(line: 511, column: 1, scope: !180, inlinedAt: !230)
!257 = !DILocation(line: 519, column: 18, scope: !180, inlinedAt: !230)
!258 = !DILocation(line: 522, column: 10, scope: !180, inlinedAt: !230)
!259 = !DILocation(line: 0, scope: !180, inlinedAt: !230)
!260 = distinct !{!260, !231, !246, !32}
!261 = !DILocation(line: 530, column: 9, scope: !213)
!262 = !DILocation(line: 530, column: 30, scope: !213)
!263 = distinct !DISubprogram(name: "ink_compute_call", scope: !14, file: !14, line: 531, type: !15, scopeLine: 531, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!264 = !DILocation(line: 531, column: 142, scope: !263)
!265 = !DILocation(line: 532, column: 34, scope: !263)
!266 = !DILocation(line: 532, column: 100, scope: !263)
!267 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !268)
!268 = distinct !DILocation(line: 532, column: 87, scope: !263)
!269 = !DILocation(line: 532, column: 145, scope: !263)
!270 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !271)
!271 = distinct !DILocation(line: 532, column: 132, scope: !263)
!272 = !DILocation(line: 532, column: 250, scope: !263)
!273 = !DILocation(line: 532, column: 295, scope: !263)
!274 = !DILocation(line: 532, column: 185, scope: !263)
!275 = !DILocation(line: 532, column: 307, scope: !263)
!276 = !DILocation(line: 532, column: 306, scope: !263)
!277 = !DILocation(line: 533, column: 34, scope: !263)
!278 = !DILocation(line: 533, column: 79, scope: !263)
!279 = !DILocation(line: 533, column: 124, scope: !263)
!280 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !281)
!281 = distinct !DILocation(line: 533, column: 111, scope: !263)
!282 = !DILocation(line: 533, column: 169, scope: !263)
!283 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !284)
!284 = distinct !DILocation(line: 533, column: 156, scope: !263)
!285 = !DILocation(line: 533, column: 232, scope: !263)
!286 = !DILocation(line: 231, column: 7, scope: !130, inlinedAt: !287)
!287 = distinct !DILocation(line: 533, column: 205, scope: !263)
!288 = !DILocation(line: 231, column: 5, scope: !130, inlinedAt: !287)
!289 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !290)
!290 = distinct !DILocation(line: 533, column: 66, scope: !263)
!291 = !DILocation(line: 533, column: 229, scope: !263)
!292 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !293)
!293 = distinct !DILocation(line: 533, column: 21, scope: !263)
!294 = !DILocation(line: 533, column: 226, scope: !263)
!295 = !DILocation(line: 233, column: 16, scope: !130, inlinedAt: !287)
!296 = !DILocation(line: 243, column: 17, scope: !130, inlinedAt: !287)
!297 = !DILocation(line: 0, scope: !130, inlinedAt: !287)
!298 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !299)
!299 = distinct !DILocation(line: 533, column: 251, scope: !263)
!300 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !299)
!301 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !299)
!302 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !299)
!303 = !DILocation(line: 244, column: 18, scope: !130, inlinedAt: !287)
!304 = !DILocation(line: 246, column: 13, scope: !130, inlinedAt: !287)
!305 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !299)
!306 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !299)
!307 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !299)
!308 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !299)
!309 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !299)
!310 = !DILocation(line: 533, column: 251, scope: !263)
!311 = !DILocation(line: 533, column: 284, scope: !263)
!312 = !DILocation(line: 533, column: 299, scope: !263)
!313 = !DILocation(line: 534, column: 34, scope: !263)
!314 = !DILocation(line: 534, column: 79, scope: !263)
!315 = !DILocation(line: 534, column: 124, scope: !263)
!316 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !317)
!317 = distinct !DILocation(line: 534, column: 111, scope: !263)
!318 = !DILocation(line: 534, column: 169, scope: !263)
!319 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !320)
!320 = distinct !DILocation(line: 534, column: 156, scope: !263)
!321 = !DILocation(line: 534, column: 234, scope: !263)
!322 = !DILocation(line: 258, column: 7, scope: !139, inlinedAt: !323)
!323 = distinct !DILocation(line: 534, column: 205, scope: !263)
!324 = !DILocation(line: 258, column: 5, scope: !139, inlinedAt: !323)
!325 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !326)
!326 = distinct !DILocation(line: 534, column: 66, scope: !263)
!327 = !DILocation(line: 534, column: 231, scope: !263)
!328 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !329)
!329 = distinct !DILocation(line: 534, column: 21, scope: !263)
!330 = !DILocation(line: 534, column: 228, scope: !263)
!331 = !DILocation(line: 260, column: 16, scope: !139, inlinedAt: !323)
!332 = !DILocation(line: 270, column: 16, scope: !139, inlinedAt: !323)
!333 = !DILocation(line: 0, scope: !139, inlinedAt: !323)
!334 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !335)
!335 = distinct !DILocation(line: 534, column: 253, scope: !263)
!336 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !335)
!337 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !335)
!338 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !335)
!339 = !DILocation(line: 271, column: 17, scope: !139, inlinedAt: !323)
!340 = !DILocation(line: 273, column: 12, scope: !139, inlinedAt: !323)
!341 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !335)
!342 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !335)
!343 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !335)
!344 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !335)
!345 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !335)
!346 = !DILocation(line: 534, column: 253, scope: !263)
!347 = !DILocation(line: 534, column: 286, scope: !263)
!348 = !DILocation(line: 534, column: 301, scope: !263)
!349 = !DILocation(line: 535, column: 34, scope: !263)
!350 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !351)
!351 = distinct !DILocation(line: 535, column: 21, scope: !263)
!352 = !DILocation(line: 535, column: 79, scope: !263)
!353 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !354)
!354 = distinct !DILocation(line: 535, column: 66, scope: !263)
!355 = !DILocation(line: 535, column: 124, scope: !263)
!356 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !357)
!357 = distinct !DILocation(line: 535, column: 111, scope: !263)
!358 = !DILocation(line: 535, column: 169, scope: !263)
!359 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !360)
!360 = distinct !DILocation(line: 535, column: 156, scope: !263)
!361 = !DILocation(line: 535, column: 230, scope: !263)
!362 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !363)
!363 = distinct !DILocation(line: 535, column: 252, scope: !263)
!364 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !363)
!365 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !363)
!366 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !363)
!367 = !DILocation(line: 535, column: 227, scope: !263)
!368 = !DILocation(line: 535, column: 233, scope: !263)
!369 = !DILocation(line: 292, column: 9, scope: !148, inlinedAt: !370)
!370 = distinct !DILocation(line: 535, column: 205, scope: !263)
!371 = !DILocation(line: 292, column: 5, scope: !148, inlinedAt: !370)
!372 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !363)
!373 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !363)
!374 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !363)
!375 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !363)
!376 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !363)
!377 = !DILocation(line: 535, column: 252, scope: !263)
!378 = !DILocation(line: 535, column: 285, scope: !263)
!379 = !DILocation(line: 535, column: 300, scope: !263)
!380 = !DILocation(line: 536, column: 34, scope: !263)
!381 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !382)
!382 = distinct !DILocation(line: 536, column: 21, scope: !263)
!383 = !DILocation(line: 536, column: 79, scope: !263)
!384 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !385)
!385 = distinct !DILocation(line: 536, column: 66, scope: !263)
!386 = !DILocation(line: 536, column: 124, scope: !263)
!387 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !388)
!388 = distinct !DILocation(line: 536, column: 111, scope: !263)
!389 = !DILocation(line: 536, column: 169, scope: !263)
!390 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !391)
!391 = distinct !DILocation(line: 536, column: 156, scope: !263)
!392 = !DILocation(line: 536, column: 232, scope: !263)
!393 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !394)
!394 = distinct !DILocation(line: 536, column: 254, scope: !263)
!395 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !394)
!396 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !394)
!397 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !394)
!398 = !DILocation(line: 536, column: 229, scope: !263)
!399 = !DILocation(line: 536, column: 235, scope: !263)
!400 = !DILocation(line: 311, column: 9, scope: !152, inlinedAt: !401)
!401 = distinct !DILocation(line: 536, column: 205, scope: !263)
!402 = !DILocation(line: 311, column: 5, scope: !152, inlinedAt: !401)
!403 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !394)
!404 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !394)
!405 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !394)
!406 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !394)
!407 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !394)
!408 = !DILocation(line: 536, column: 254, scope: !263)
!409 = !DILocation(line: 536, column: 287, scope: !263)
!410 = !DILocation(line: 536, column: 302, scope: !263)
!411 = !DILocation(line: 537, column: 34, scope: !263)
!412 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !413)
!413 = distinct !DILocation(line: 537, column: 21, scope: !263)
!414 = !DILocation(line: 537, column: 79, scope: !263)
!415 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !416)
!416 = distinct !DILocation(line: 537, column: 66, scope: !263)
!417 = !DILocation(line: 537, column: 169, scope: !263)
!418 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !419)
!419 = distinct !DILocation(line: 537, column: 156, scope: !263)
!420 = !DILocation(line: 537, column: 226, scope: !263)
!421 = !DILocation(line: 537, column: 232, scope: !263)
!422 = !DILocation(line: 339, column: 9, scope: !156, inlinedAt: !423)
!423 = distinct !DILocation(line: 537, column: 205, scope: !263)
!424 = !DILocation(line: 0, scope: !156, inlinedAt: !423)
!425 = !DILocation(line: 339, column: 5, scope: !156, inlinedAt: !423)
!426 = !DILocation(line: 345, column: 5, scope: !156, inlinedAt: !423)
!427 = !DILocation(line: 347, column: 16, scope: !156, inlinedAt: !423)
!428 = !DILocation(line: 350, column: 8, scope: !156, inlinedAt: !423)
!429 = !DILocation(line: 351, column: 1, scope: !156, inlinedAt: !423)
!430 = !DILocation(line: 357, column: 5, scope: !156, inlinedAt: !423)
!431 = !DILocation(line: 359, column: 18, scope: !156, inlinedAt: !423)
!432 = !DILocation(line: 362, column: 9, scope: !156, inlinedAt: !423)
!433 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !434)
!434 = distinct !DILocation(line: 537, column: 251, scope: !263)
!435 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !434)
!436 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !434)
!437 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !434)
!438 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !434)
!439 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !434)
!440 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !434)
!441 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !434)
!442 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !434)
!443 = !DILocation(line: 537, column: 251, scope: !263)
!444 = !DILocation(line: 537, column: 284, scope: !263)
!445 = !DILocation(line: 537, column: 299, scope: !263)
!446 = !DILocation(line: 538, column: 34, scope: !263)
!447 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !448)
!448 = distinct !DILocation(line: 538, column: 21, scope: !263)
!449 = !DILocation(line: 538, column: 79, scope: !263)
!450 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !451)
!451 = distinct !DILocation(line: 538, column: 66, scope: !263)
!452 = !DILocation(line: 538, column: 169, scope: !263)
!453 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !454)
!454 = distinct !DILocation(line: 538, column: 156, scope: !263)
!455 = !DILocation(line: 538, column: 228, scope: !263)
!456 = !DILocation(line: 538, column: 234, scope: !263)
!457 = !DILocation(line: 374, column: 9, scope: !168, inlinedAt: !458)
!458 = distinct !DILocation(line: 538, column: 205, scope: !263)
!459 = !DILocation(line: 0, scope: !168, inlinedAt: !458)
!460 = !DILocation(line: 374, column: 5, scope: !168, inlinedAt: !458)
!461 = !DILocation(line: 380, column: 5, scope: !168, inlinedAt: !458)
!462 = !DILocation(line: 382, column: 16, scope: !168, inlinedAt: !458)
!463 = !DILocation(line: 385, column: 8, scope: !168, inlinedAt: !458)
!464 = !DILocation(line: 386, column: 1, scope: !168, inlinedAt: !458)
!465 = !DILocation(line: 392, column: 5, scope: !168, inlinedAt: !458)
!466 = !DILocation(line: 394, column: 16, scope: !168, inlinedAt: !458)
!467 = !DILocation(line: 397, column: 8, scope: !168, inlinedAt: !458)
!468 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !469)
!469 = distinct !DILocation(line: 538, column: 253, scope: !263)
!470 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !469)
!471 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !469)
!472 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !469)
!473 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !469)
!474 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !469)
!475 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !469)
!476 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !469)
!477 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !469)
!478 = !DILocation(line: 538, column: 253, scope: !263)
!479 = !DILocation(line: 538, column: 286, scope: !263)
!480 = !DILocation(line: 538, column: 301, scope: !263)
!481 = !DILocation(line: 539, column: 9, scope: !263)
!482 = !DILocation(line: 0, scope: !263)
!483 = !DILocation(line: 539, column: 21, scope: !263)
!484 = distinct !DISubprogram(name: "ink_compute_scalar32", scope: !14, file: !14, line: 540, type: !15, scopeLine: 540, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!485 = !DILocation(line: 540, column: 122, scope: !484)
!486 = !DILocation(line: 541, column: 34, scope: !484)
!487 = !DILocation(line: 541, column: 79, scope: !484)
!488 = !DILocation(line: 541, column: 124, scope: !484)
!489 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !490)
!490 = distinct !DILocation(line: 541, column: 111, scope: !484)
!491 = !DILocation(line: 541, column: 169, scope: !484)
!492 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !493)
!493 = distinct !DILocation(line: 541, column: 156, scope: !484)
!494 = !DILocation(line: 541, column: 232, scope: !484)
!495 = !DILocation(line: 231, column: 7, scope: !130, inlinedAt: !496)
!496 = distinct !DILocation(line: 541, column: 205, scope: !484)
!497 = !DILocation(line: 231, column: 5, scope: !130, inlinedAt: !496)
!498 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !499)
!499 = distinct !DILocation(line: 541, column: 66, scope: !484)
!500 = !DILocation(line: 541, column: 229, scope: !484)
!501 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !502)
!502 = distinct !DILocation(line: 541, column: 21, scope: !484)
!503 = !DILocation(line: 541, column: 226, scope: !484)
!504 = !DILocation(line: 233, column: 16, scope: !130, inlinedAt: !496)
!505 = !DILocation(line: 243, column: 17, scope: !130, inlinedAt: !496)
!506 = !DILocation(line: 0, scope: !130, inlinedAt: !496)
!507 = !DILocation(line: 244, column: 18, scope: !130, inlinedAt: !496)
!508 = !DILocation(line: 246, column: 13, scope: !130, inlinedAt: !496)
!509 = !DILocation(line: 542, column: 34, scope: !484)
!510 = !DILocation(line: 542, column: 79, scope: !484)
!511 = !DILocation(line: 542, column: 124, scope: !484)
!512 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !513)
!513 = distinct !DILocation(line: 542, column: 111, scope: !484)
!514 = !DILocation(line: 542, column: 169, scope: !484)
!515 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !516)
!516 = distinct !DILocation(line: 542, column: 156, scope: !484)
!517 = !DILocation(line: 542, column: 234, scope: !484)
!518 = !DILocation(line: 258, column: 7, scope: !139, inlinedAt: !519)
!519 = distinct !DILocation(line: 542, column: 205, scope: !484)
!520 = !DILocation(line: 258, column: 5, scope: !139, inlinedAt: !519)
!521 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !522)
!522 = distinct !DILocation(line: 542, column: 66, scope: !484)
!523 = !DILocation(line: 542, column: 231, scope: !484)
!524 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !525)
!525 = distinct !DILocation(line: 542, column: 21, scope: !484)
!526 = !DILocation(line: 542, column: 228, scope: !484)
!527 = !DILocation(line: 260, column: 16, scope: !139, inlinedAt: !519)
!528 = !DILocation(line: 270, column: 16, scope: !139, inlinedAt: !519)
!529 = !DILocation(line: 0, scope: !139, inlinedAt: !519)
!530 = !DILocation(line: 271, column: 17, scope: !139, inlinedAt: !519)
!531 = !DILocation(line: 273, column: 12, scope: !139, inlinedAt: !519)
!532 = !DILocation(line: 543, column: 34, scope: !484)
!533 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !534)
!534 = distinct !DILocation(line: 543, column: 21, scope: !484)
!535 = !DILocation(line: 543, column: 79, scope: !484)
!536 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !537)
!537 = distinct !DILocation(line: 543, column: 66, scope: !484)
!538 = !DILocation(line: 543, column: 124, scope: !484)
!539 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !540)
!540 = distinct !DILocation(line: 543, column: 111, scope: !484)
!541 = !DILocation(line: 543, column: 169, scope: !484)
!542 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !543)
!543 = distinct !DILocation(line: 543, column: 156, scope: !484)
!544 = !DILocation(line: 543, column: 227, scope: !484)
!545 = !DILocation(line: 543, column: 230, scope: !484)
!546 = !DILocation(line: 543, column: 233, scope: !484)
!547 = !DILocation(line: 292, column: 9, scope: !148, inlinedAt: !548)
!548 = distinct !DILocation(line: 543, column: 205, scope: !484)
!549 = !DILocation(line: 292, column: 5, scope: !148, inlinedAt: !548)
!550 = !DILocation(line: 544, column: 34, scope: !484)
!551 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !552)
!552 = distinct !DILocation(line: 544, column: 21, scope: !484)
!553 = !DILocation(line: 544, column: 79, scope: !484)
!554 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !555)
!555 = distinct !DILocation(line: 544, column: 66, scope: !484)
!556 = !DILocation(line: 544, column: 124, scope: !484)
!557 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !558)
!558 = distinct !DILocation(line: 544, column: 111, scope: !484)
!559 = !DILocation(line: 544, column: 169, scope: !484)
!560 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !561)
!561 = distinct !DILocation(line: 544, column: 156, scope: !484)
!562 = !DILocation(line: 544, column: 229, scope: !484)
!563 = !DILocation(line: 544, column: 232, scope: !484)
!564 = !DILocation(line: 544, column: 235, scope: !484)
!565 = !DILocation(line: 311, column: 9, scope: !152, inlinedAt: !566)
!566 = distinct !DILocation(line: 544, column: 205, scope: !484)
!567 = !DILocation(line: 311, column: 5, scope: !152, inlinedAt: !566)
!568 = !DILocation(line: 545, column: 34, scope: !484)
!569 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !570)
!570 = distinct !DILocation(line: 545, column: 21, scope: !484)
!571 = !DILocation(line: 545, column: 79, scope: !484)
!572 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !573)
!573 = distinct !DILocation(line: 545, column: 66, scope: !484)
!574 = !DILocation(line: 545, column: 169, scope: !484)
!575 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !576)
!576 = distinct !DILocation(line: 545, column: 156, scope: !484)
!577 = !DILocation(line: 545, column: 226, scope: !484)
!578 = !DILocation(line: 545, column: 232, scope: !484)
!579 = !DILocation(line: 339, column: 9, scope: !156, inlinedAt: !580)
!580 = distinct !DILocation(line: 545, column: 205, scope: !484)
!581 = !DILocation(line: 0, scope: !156, inlinedAt: !580)
!582 = !DILocation(line: 339, column: 5, scope: !156, inlinedAt: !580)
!583 = !DILocation(line: 345, column: 5, scope: !156, inlinedAt: !580)
!584 = !DILocation(line: 347, column: 16, scope: !156, inlinedAt: !580)
!585 = !DILocation(line: 350, column: 8, scope: !156, inlinedAt: !580)
!586 = !DILocation(line: 351, column: 1, scope: !156, inlinedAt: !580)
!587 = !DILocation(line: 357, column: 5, scope: !156, inlinedAt: !580)
!588 = !DILocation(line: 359, column: 18, scope: !156, inlinedAt: !580)
!589 = !DILocation(line: 362, column: 9, scope: !156, inlinedAt: !580)
!590 = !DILocation(line: 546, column: 34, scope: !484)
!591 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !592)
!592 = distinct !DILocation(line: 546, column: 21, scope: !484)
!593 = !DILocation(line: 546, column: 79, scope: !484)
!594 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !595)
!595 = distinct !DILocation(line: 546, column: 66, scope: !484)
!596 = !DILocation(line: 546, column: 169, scope: !484)
!597 = !DILocation(line: 37, column: 172, scope: !218, inlinedAt: !598)
!598 = distinct !DILocation(line: 546, column: 156, scope: !484)
!599 = !DILocation(line: 546, column: 228, scope: !484)
!600 = !DILocation(line: 546, column: 234, scope: !484)
!601 = !DILocation(line: 374, column: 9, scope: !168, inlinedAt: !602)
!602 = distinct !DILocation(line: 546, column: 205, scope: !484)
!603 = !DILocation(line: 0, scope: !168, inlinedAt: !602)
!604 = !DILocation(line: 374, column: 5, scope: !168, inlinedAt: !602)
!605 = !DILocation(line: 380, column: 5, scope: !168, inlinedAt: !602)
!606 = !DILocation(line: 382, column: 16, scope: !168, inlinedAt: !602)
!607 = !DILocation(line: 385, column: 8, scope: !168, inlinedAt: !602)
!608 = !DILocation(line: 386, column: 1, scope: !168, inlinedAt: !602)
!609 = !DILocation(line: 392, column: 5, scope: !168, inlinedAt: !602)
!610 = !DILocation(line: 394, column: 16, scope: !168, inlinedAt: !602)
!611 = !DILocation(line: 397, column: 8, scope: !168, inlinedAt: !602)
!612 = !DILocation(line: 547, column: 9, scope: !484)
!613 = !DILocation(line: 0, scope: !484)
!614 = !DILocation(line: 547, column: 30, scope: !484)
!615 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !14, file: !14, line: 548, type: !15, scopeLine: 548, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!616 = !DILocation(line: 549, column: 9, scope: !615)
