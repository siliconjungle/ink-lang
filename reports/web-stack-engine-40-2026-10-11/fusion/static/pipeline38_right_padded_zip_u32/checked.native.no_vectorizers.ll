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
  %7 = extractvalue [2 x i64] %0, 1
  %8 = icmp ugt i64 %7, 4611686018427387903, !dbg !75
  br i1 %8, label %9, label %10, !dbg !77

9:                                                ; preds = %4
  tail call fastcc void @ink_fail() #11, !dbg !78
  unreachable

10:                                               ; preds = %4
  %11 = icmp eq i64 %7, 0, !dbg !79
  %12 = shl nuw i64 %7, 2, !dbg !80
  %13 = select i1 %11, i64 4, i64 %12, !dbg !80
  %14 = icmp ugt i64 %13, -17, !dbg !81
  br i1 %14, label %15, label %16, !dbg !82

15:                                               ; preds = %10
  tail call fastcc void @ink_fail() #11, !dbg !83
  unreachable

16:                                               ; preds = %10
  %17 = add nuw i64 %13, 16, !dbg !84
  %18 = tail call i8* @malloc(i64 %17) #12, !dbg !85
  %19 = bitcast i8* %18 to %struct.ink_block*, !dbg !85
  %20 = icmp eq i8* %18, null, !dbg !86
  br i1 %20, label %21, label %22, !dbg !87

21:                                               ; preds = %16
  tail call fastcc void @ink_fail() #11, !dbg !88
  unreachable

22:                                               ; preds = %16
  %23 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !89, !tbaa !18
  %24 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %19, i64 0, i32 0, !dbg !90
  store %struct.ink_block* %23, %struct.ink_block** %24, align 8, !dbg !91, !tbaa !24
  store i8* %18, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !92, !tbaa !18
  %25 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %19, i64 1, !dbg !93
  %26 = bitcast %struct.ink_block* %25 to i32*, !dbg !94
  %27 = sub i32 0, %2
  br i1 %11, label %28, label %32, !dbg !95

28:                                               ; preds = %32, %22
  %29 = ptrtoint %struct.ink_block* %25 to i64, !dbg !96
  %30 = insertvalue [2 x i64] undef, i64 %29, 0, !dbg !96
  %31 = insertvalue [2 x i64] %30, i64 %7, 1, !dbg !96
  ret [2 x i64] %31, !dbg !96

32:                                               ; preds = %22, %32
  %33 = phi i64 [ %52, %32 ], [ 0, %22 ]
  %34 = trunc i64 %33 to i32, !dbg !97
  %35 = getelementptr inbounds i32, i32* %6, i64 %33, !dbg !98
  %36 = load i32, i32* %35, align 4, !dbg !98, !tbaa !99
  %37 = icmp ult i32 %34, %2, !dbg !101
  %38 = select i1 %37, i32 %3, i32 %27, !dbg !102
  %39 = add i32 %36, %38, !dbg !102
  %40 = urem i32 %34, 3, !dbg !103
  %41 = icmp eq i32 %40, 0, !dbg !104
  %42 = mul i32 %36, %3, !dbg !105
  %43 = add i32 %36, %2, !dbg !105
  %44 = select i1 %41, i32 %42, i32 %43, !dbg !105
  %45 = icmp ult i32 %39, %44, !dbg !106
  %46 = mul i32 %44, %3, !dbg !107
  %47 = add i32 %46, %39, !dbg !107
  %48 = add i32 %39, %2, !dbg !107
  %49 = sub i32 %48, %44, !dbg !107
  %50 = select i1 %45, i32 %47, i32 %49, !dbg !107
  %51 = getelementptr inbounds i32, i32* %26, i64 %33, !dbg !108
  store i32 %50, i32* %51, align 4, !dbg !109, !tbaa !99
  %52 = add nuw i64 %33, 1, !dbg !110
  %53 = icmp eq i64 %52, %7, !dbg !111
  br i1 %53, label %28, label %32, !dbg !95, !llvm.loop !112
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_left_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !114 {
  %5 = icmp ult i32 %0, %2, !dbg !115
  %6 = sub i32 0, %2, !dbg !116
  %7 = select i1 %5, i32 %3, i32 %6, !dbg !116
  %8 = add i32 %7, %1, !dbg !116
  ret i32 %8, !dbg !117
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_right_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !118 {
  %5 = urem i32 %0, 3, !dbg !119
  %6 = icmp eq i32 %5, 0, !dbg !120
  %7 = mul i32 %3, %1, !dbg !121
  %8 = add i32 %2, %1, !dbg !121
  %9 = select i1 %6, i32 %7, i32 %8, !dbg !121
  ret i32 %9, !dbg !122
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_pair_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !123 {
  %5 = icmp ult i32 %0, %1, !dbg !124
  %6 = mul i32 %3, %1, !dbg !125
  %7 = add i32 %6, %0, !dbg !125
  %8 = sub i32 %0, %1, !dbg !125
  %9 = add i32 %8, %2, !dbg !125
  %10 = select i1 %5, i32 %7, i32 %9, !dbg !125
  ret i32 %10, !dbg !126
}

; Function Attrs: nofree norecurse nosync nounwind ssp uwtable
define i64 @lang_fn_pipeline38_right_padded_zip_u32_into([2 x i64] %0, [2 x i64] %1, i32 %2, i32 %3, i32* nocapture %4) local_unnamed_addr #6 !dbg !127 {
  %6 = extractvalue [2 x i64] %0, 0
  %7 = inttoptr i64 %6 to i32*
  %8 = extractvalue [2 x i64] %0, 1
  %9 = sub i32 0, %2
  %10 = icmp eq i64 %8, 0, !dbg !128
  br i1 %10, label %11, label %12, !dbg !129

11:                                               ; preds = %12, %5
  ret i64 %8, !dbg !130

12:                                               ; preds = %5, %12
  %13 = phi i64 [ %32, %12 ], [ 0, %5 ]
  %14 = trunc i64 %13 to i32, !dbg !131
  %15 = getelementptr inbounds i32, i32* %7, i64 %13, !dbg !132
  %16 = load i32, i32* %15, align 4, !dbg !132, !tbaa !99
  %17 = icmp ult i32 %14, %2, !dbg !133
  %18 = select i1 %17, i32 %3, i32 %9, !dbg !134
  %19 = add i32 %16, %18, !dbg !134
  %20 = urem i32 %14, 3, !dbg !135
  %21 = icmp eq i32 %20, 0, !dbg !136
  %22 = mul i32 %16, %3, !dbg !137
  %23 = add i32 %16, %2, !dbg !137
  %24 = select i1 %21, i32 %22, i32 %23, !dbg !137
  %25 = icmp ult i32 %19, %24, !dbg !138
  %26 = mul i32 %24, %3, !dbg !139
  %27 = add i32 %26, %19, !dbg !139
  %28 = add i32 %19, %2, !dbg !139
  %29 = sub i32 %28, %24, !dbg !139
  %30 = select i1 %25, i32 %27, i32 %29, !dbg !139
  %31 = getelementptr inbounds i32, i32* %4, i64 %13, !dbg !140
  store i32 %30, i32* %31, align 4, !dbg !141, !tbaa !99
  %32 = add nuw i64 %13, 1, !dbg !142
  %33 = icmp eq i64 %32, %8, !dbg !128
  br i1 %33, label %11, label %12, !dbg !129, !llvm.loop !143
}

; Function Attrs: nounwind ssp uwtable
define i64 @ink_compute_into(i32 %0, i8** nocapture readonly %1, i64* nocapture readonly %2, i8* nocapture %3) local_unnamed_addr #0 !dbg !145 {
  %5 = icmp eq i32 %0, 0, !dbg !146
  br i1 %5, label %6, label %73, !dbg !146

6:                                                ; preds = %4
  %7 = bitcast i8** %1 to i32**, !dbg !147
  %8 = load i32*, i32** %7, align 8, !dbg !147, !tbaa !18
  %9 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !148
  %10 = load i8*, i8** %9, align 8, !dbg !148, !tbaa !18
  %11 = load i8, i8* %10, align 1, !dbg !149, !tbaa !152
  %12 = getelementptr inbounds i8, i8* %10, i64 1, !dbg !149
  %13 = load i8, i8* %12, align 1, !dbg !149, !tbaa !152
  %14 = getelementptr inbounds i8, i8* %10, i64 2, !dbg !149
  %15 = load i8, i8* %14, align 1, !dbg !149, !tbaa !152
  %16 = getelementptr inbounds i8, i8* %10, i64 3, !dbg !149
  %17 = load i8, i8* %16, align 1, !dbg !149, !tbaa !152
  %18 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !153
  %19 = load i8*, i8** %18, align 8, !dbg !153, !tbaa !18
  %20 = load i8, i8* %19, align 1, !dbg !154, !tbaa !152
  %21 = getelementptr inbounds i8, i8* %19, i64 1, !dbg !154
  %22 = load i8, i8* %21, align 1, !dbg !154, !tbaa !152
  %23 = getelementptr inbounds i8, i8* %19, i64 2, !dbg !154
  %24 = load i8, i8* %23, align 1, !dbg !154, !tbaa !152
  %25 = getelementptr inbounds i8, i8* %19, i64 3, !dbg !154
  %26 = load i8, i8* %25, align 1, !dbg !154, !tbaa !152
  %27 = load i64, i64* %2, align 8, !dbg !156, !tbaa !157
  %28 = zext i8 %17 to i32, !dbg !159
  %29 = shl nuw i32 %28, 24, !dbg !159
  %30 = zext i8 %15 to i32, !dbg !159
  %31 = shl nuw nsw i32 %30, 16, !dbg !159
  %32 = zext i8 %13 to i32, !dbg !159
  %33 = shl nuw nsw i32 %32, 8, !dbg !159
  %34 = zext i8 %11 to i32, !dbg !159
  %35 = or i32 %33, %34, !dbg !159
  %36 = or i32 %35, %31, !dbg !159
  %37 = or i32 %36, %29, !dbg !159
  %38 = zext i8 %26 to i32, !dbg !160
  %39 = shl nuw i32 %38, 24, !dbg !160
  %40 = zext i8 %24 to i32, !dbg !160
  %41 = shl nuw nsw i32 %40, 16, !dbg !160
  %42 = zext i8 %22 to i32, !dbg !160
  %43 = shl nuw nsw i32 %42, 8, !dbg !160
  %44 = zext i8 %20 to i32, !dbg !160
  %45 = or i32 %43, %44, !dbg !160
  %46 = or i32 %45, %41, !dbg !160
  %47 = or i32 %46, %39, !dbg !160
  %48 = bitcast i8* %3 to i32*, !dbg !160
  %49 = sub i32 0, %37
  %50 = icmp eq i64 %27, 0, !dbg !161
  br i1 %50, label %74, label %51, !dbg !163

51:                                               ; preds = %6, %51
  %52 = phi i64 [ %71, %51 ], [ 0, %6 ]
  %53 = trunc i64 %52 to i32, !dbg !164
  %54 = getelementptr inbounds i32, i32* %8, i64 %52, !dbg !165
  %55 = load i32, i32* %54, align 4, !dbg !165, !tbaa !99
  %56 = icmp ugt i32 %37, %53, !dbg !166
  %57 = select i1 %56, i32 %47, i32 %49, !dbg !167
  %58 = add i32 %57, %55, !dbg !167
  %59 = urem i32 %53, 3, !dbg !168
  %60 = icmp eq i32 %59, 0, !dbg !169
  %61 = mul i32 %55, %47, !dbg !170
  %62 = add i32 %55, %37, !dbg !170
  %63 = select i1 %60, i32 %61, i32 %62, !dbg !170
  %64 = icmp ult i32 %58, %63, !dbg !171
  %65 = mul i32 %63, %47, !dbg !172
  %66 = add i32 %65, %58, !dbg !172
  %67 = add i32 %58, %37, !dbg !172
  %68 = sub i32 %67, %63, !dbg !172
  %69 = select i1 %64, i32 %66, i32 %68, !dbg !172
  %70 = getelementptr inbounds i32, i32* %48, i64 %52, !dbg !173
  store i32 %69, i32* %70, align 4, !dbg !174, !tbaa !99
  %71 = add nuw i64 %52, 1, !dbg !175
  %72 = icmp eq i64 %71, %27, !dbg !161
  br i1 %72, label %74, label %51, !dbg !163, !llvm.loop !176

73:                                               ; preds = %4
  tail call fastcc void @ink_fail(), !dbg !178
  unreachable

74:                                               ; preds = %51, %6
  ret i64 %27, !dbg !179
}

; Function Attrs: nounwind ssp uwtable
define void @ink_compute_call(i32 %0, i8** nocapture readonly %1, i64* nocapture readonly %2, i8** nocapture %3, i64* nocapture %4) local_unnamed_addr #0 !dbg !180 {
  switch i32 %0, label %328 [
    i32 0, label %6
    i32 1, label %55
    i32 2, label %145
    i32 3, label %236
  ], !dbg !181

6:                                                ; preds = %5
  %7 = bitcast i8** %1 to i32**, !dbg !182
  %8 = load i32*, i32** %7, align 8, !dbg !182, !tbaa !18
  %9 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !183
  %10 = load i8*, i8** %9, align 8, !dbg !183, !tbaa !18
  %11 = load i8, i8* %10, align 1, !dbg !184, !tbaa !152
  %12 = getelementptr inbounds i8, i8* %10, i64 1, !dbg !184
  %13 = load i8, i8* %12, align 1, !dbg !184, !tbaa !152
  %14 = getelementptr inbounds i8, i8* %10, i64 2, !dbg !184
  %15 = load i8, i8* %14, align 1, !dbg !184, !tbaa !152
  %16 = getelementptr inbounds i8, i8* %10, i64 3, !dbg !184
  %17 = load i8, i8* %16, align 1, !dbg !184, !tbaa !152
  %18 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !186
  %19 = load i8*, i8** %18, align 8, !dbg !186, !tbaa !18
  %20 = load i8, i8* %19, align 1, !dbg !187, !tbaa !152
  %21 = getelementptr inbounds i8, i8* %19, i64 1, !dbg !187
  %22 = load i8, i8* %21, align 1, !dbg !187, !tbaa !152
  %23 = getelementptr inbounds i8, i8* %19, i64 2, !dbg !187
  %24 = load i8, i8* %23, align 1, !dbg !187, !tbaa !152
  %25 = getelementptr inbounds i8, i8* %19, i64 3, !dbg !187
  %26 = load i8, i8* %25, align 1, !dbg !187, !tbaa !152
  %27 = load i64, i64* %2, align 8, !dbg !189, !tbaa !157
  %28 = zext i8 %17 to i32, !dbg !190
  %29 = shl nuw i32 %28, 24, !dbg !190
  %30 = zext i8 %15 to i32, !dbg !190
  %31 = shl nuw nsw i32 %30, 16, !dbg !190
  %32 = zext i8 %13 to i32, !dbg !190
  %33 = shl nuw nsw i32 %32, 8, !dbg !190
  %34 = zext i8 %11 to i32, !dbg !190
  %35 = or i32 %33, %34, !dbg !190
  %36 = or i32 %35, %31, !dbg !190
  %37 = or i32 %36, %29, !dbg !190
  %38 = zext i8 %26 to i32, !dbg !191
  %39 = shl nuw i32 %38, 24, !dbg !191
  %40 = zext i8 %24 to i32, !dbg !191
  %41 = shl nuw nsw i32 %40, 16, !dbg !191
  %42 = zext i8 %22 to i32, !dbg !191
  %43 = shl nuw nsw i32 %42, 8, !dbg !191
  %44 = zext i8 %20 to i32, !dbg !191
  %45 = or i32 %43, %44, !dbg !191
  %46 = or i32 %45, %41, !dbg !191
  %47 = or i32 %46, %39, !dbg !191
  %48 = ptrtoint i32* %8 to i64, !dbg !191
  %49 = insertvalue [2 x i64] undef, i64 %48, 0, !dbg !191
  %50 = insertvalue [2 x i64] %49, i64 %27, 1, !dbg !191
  %51 = tail call [2 x i64] @lang_fn_pipeline38_right_padded_zip_u32([2 x i64] %50, [2 x i64] undef, i32 %37, i32 %47), !dbg !191
  %52 = extractvalue [2 x i64] %51, 0, !dbg !191
  %53 = extractvalue [2 x i64] %51, 1, !dbg !191
  %54 = inttoptr i64 %52 to i8*, !dbg !192
  store i8* %54, i8** %3, align 8, !dbg !193, !tbaa !18
  br label %329

55:                                               ; preds = %5
  %56 = load i8*, i8** %1, align 8, !dbg !194, !tbaa !18
  %57 = load i8, i8* %56, align 1, !dbg !195, !tbaa !152
  %58 = getelementptr inbounds i8, i8* %56, i64 1, !dbg !195
  %59 = load i8, i8* %58, align 1, !dbg !195, !tbaa !152
  %60 = getelementptr inbounds i8, i8* %56, i64 2, !dbg !195
  %61 = load i8, i8* %60, align 1, !dbg !195, !tbaa !152
  %62 = getelementptr inbounds i8, i8* %56, i64 3, !dbg !195
  %63 = load i8, i8* %62, align 1, !dbg !195, !tbaa !152
  %64 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !197
  %65 = load i8*, i8** %64, align 8, !dbg !197, !tbaa !18
  %66 = load i8, i8* %65, align 1, !dbg !198, !tbaa !152
  %67 = getelementptr inbounds i8, i8* %65, i64 1, !dbg !198
  %68 = load i8, i8* %67, align 1, !dbg !198, !tbaa !152
  %69 = getelementptr inbounds i8, i8* %65, i64 2, !dbg !198
  %70 = load i8, i8* %69, align 1, !dbg !198, !tbaa !152
  %71 = getelementptr inbounds i8, i8* %65, i64 3, !dbg !198
  %72 = load i8, i8* %71, align 1, !dbg !198, !tbaa !152
  %73 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !200
  %74 = load i8*, i8** %73, align 8, !dbg !200, !tbaa !18
  %75 = load i8, i8* %74, align 1, !dbg !201, !tbaa !152
  %76 = getelementptr inbounds i8, i8* %74, i64 1, !dbg !201
  %77 = load i8, i8* %76, align 1, !dbg !201, !tbaa !152
  %78 = getelementptr inbounds i8, i8* %74, i64 2, !dbg !201
  %79 = load i8, i8* %78, align 1, !dbg !201, !tbaa !152
  %80 = getelementptr inbounds i8, i8* %74, i64 3, !dbg !201
  %81 = load i8, i8* %80, align 1, !dbg !201, !tbaa !152
  %82 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !203
  %83 = load i8*, i8** %82, align 8, !dbg !203, !tbaa !18
  %84 = load i8, i8* %83, align 1, !dbg !204, !tbaa !152
  %85 = getelementptr inbounds i8, i8* %83, i64 1, !dbg !204
  %86 = load i8, i8* %85, align 1, !dbg !204, !tbaa !152
  %87 = getelementptr inbounds i8, i8* %83, i64 2, !dbg !204
  %88 = load i8, i8* %87, align 1, !dbg !204, !tbaa !152
  %89 = getelementptr inbounds i8, i8* %83, i64 3, !dbg !204
  %90 = load i8, i8* %89, align 1, !dbg !204, !tbaa !152
  %91 = zext i8 %81 to i32, !dbg !206
  %92 = shl nuw i32 %91, 24, !dbg !206
  %93 = zext i8 %79 to i32, !dbg !206
  %94 = shl nuw nsw i32 %93, 16, !dbg !206
  %95 = zext i8 %77 to i32, !dbg !206
  %96 = shl nuw nsw i32 %95, 8, !dbg !206
  %97 = zext i8 %75 to i32, !dbg !206
  %98 = or i32 %96, %97, !dbg !206
  %99 = or i32 %98, %94, !dbg !206
  %100 = or i32 %99, %92, !dbg !206
  %101 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !207
  %102 = bitcast i8* %101 to %struct.ink_block*, !dbg !207
  %103 = icmp eq i8* %101, null, !dbg !209
  br i1 %103, label %104, label %105, !dbg !210

104:                                              ; preds = %55
  tail call fastcc void @ink_fail() #11, !dbg !211
  unreachable

105:                                              ; preds = %55
  %106 = zext i8 %63 to i32, !dbg !212
  %107 = shl nuw i32 %106, 24, !dbg !212
  %108 = zext i8 %61 to i32, !dbg !212
  %109 = shl nuw nsw i32 %108, 16, !dbg !212
  %110 = zext i8 %59 to i32, !dbg !212
  %111 = shl nuw nsw i32 %110, 8, !dbg !212
  %112 = zext i8 %57 to i32, !dbg !212
  %113 = or i32 %111, %112, !dbg !212
  %114 = or i32 %113, %109, !dbg !212
  %115 = or i32 %114, %107, !dbg !212
  %116 = icmp ult i32 %115, %100, !dbg !213
  %117 = zext i8 %90 to i32, !dbg !213
  %118 = shl nuw i32 %117, 24, !dbg !213
  %119 = zext i8 %88 to i32, !dbg !213
  %120 = shl nuw nsw i32 %119, 16, !dbg !213
  %121 = zext i8 %86 to i32, !dbg !213
  %122 = shl nuw nsw i32 %121, 8, !dbg !213
  %123 = zext i8 %84 to i32, !dbg !213
  %124 = or i32 %122, %123, !dbg !213
  %125 = or i32 %124, %120, !dbg !213
  %126 = or i32 %125, %118, !dbg !213
  %127 = sub i32 0, %100, !dbg !215
  %128 = select i1 %116, i32 %126, i32 %127, !dbg !215
  %129 = zext i8 %72 to i32, !dbg !216
  %130 = shl nuw i32 %129, 24, !dbg !216
  %131 = zext i8 %70 to i32, !dbg !216
  %132 = shl nuw nsw i32 %131, 16, !dbg !216
  %133 = zext i8 %68 to i32, !dbg !216
  %134 = shl nuw nsw i32 %133, 8, !dbg !216
  %135 = zext i8 %66 to i32, !dbg !216
  %136 = or i32 %134, %135, !dbg !216
  %137 = or i32 %136, %132, !dbg !216
  %138 = or i32 %137, %130, !dbg !216
  %139 = add i32 %128, %138, !dbg !215
  %140 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !217, !tbaa !18
  %141 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %102, i64 0, i32 0, !dbg !218
  store %struct.ink_block* %140, %struct.ink_block** %141, align 8, !dbg !219, !tbaa !24
  store i8* %101, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !220, !tbaa !18
  %142 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %102, i64 1, !dbg !221
  %143 = bitcast %struct.ink_block* %142 to i32*, !dbg !222
  store i32 %139, i32* %143, align 4, !dbg !223, !tbaa !99
  %144 = bitcast i8** %3 to %struct.ink_block**, !dbg !224
  store %struct.ink_block* %142, %struct.ink_block** %144, align 8, !dbg !224, !tbaa !18
  br label %329

145:                                              ; preds = %5
  %146 = load i8*, i8** %1, align 8, !dbg !225, !tbaa !18
  %147 = load i8, i8* %146, align 1, !dbg !226, !tbaa !152
  %148 = getelementptr inbounds i8, i8* %146, i64 1, !dbg !226
  %149 = load i8, i8* %148, align 1, !dbg !226, !tbaa !152
  %150 = getelementptr inbounds i8, i8* %146, i64 2, !dbg !226
  %151 = load i8, i8* %150, align 1, !dbg !226, !tbaa !152
  %152 = getelementptr inbounds i8, i8* %146, i64 3, !dbg !226
  %153 = load i8, i8* %152, align 1, !dbg !226, !tbaa !152
  %154 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !228
  %155 = load i8*, i8** %154, align 8, !dbg !228, !tbaa !18
  %156 = load i8, i8* %155, align 1, !dbg !229, !tbaa !152
  %157 = getelementptr inbounds i8, i8* %155, i64 1, !dbg !229
  %158 = load i8, i8* %157, align 1, !dbg !229, !tbaa !152
  %159 = getelementptr inbounds i8, i8* %155, i64 2, !dbg !229
  %160 = load i8, i8* %159, align 1, !dbg !229, !tbaa !152
  %161 = getelementptr inbounds i8, i8* %155, i64 3, !dbg !229
  %162 = load i8, i8* %161, align 1, !dbg !229, !tbaa !152
  %163 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !231
  %164 = load i8*, i8** %163, align 8, !dbg !231, !tbaa !18
  %165 = load i8, i8* %164, align 1, !dbg !232, !tbaa !152
  %166 = getelementptr inbounds i8, i8* %164, i64 1, !dbg !232
  %167 = load i8, i8* %166, align 1, !dbg !232, !tbaa !152
  %168 = getelementptr inbounds i8, i8* %164, i64 2, !dbg !232
  %169 = load i8, i8* %168, align 1, !dbg !232, !tbaa !152
  %170 = getelementptr inbounds i8, i8* %164, i64 3, !dbg !232
  %171 = load i8, i8* %170, align 1, !dbg !232, !tbaa !152
  %172 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !234
  %173 = load i8*, i8** %172, align 8, !dbg !234, !tbaa !18
  %174 = load i8, i8* %173, align 1, !dbg !235, !tbaa !152
  %175 = getelementptr inbounds i8, i8* %173, i64 1, !dbg !235
  %176 = load i8, i8* %175, align 1, !dbg !235, !tbaa !152
  %177 = getelementptr inbounds i8, i8* %173, i64 2, !dbg !235
  %178 = load i8, i8* %177, align 1, !dbg !235, !tbaa !152
  %179 = getelementptr inbounds i8, i8* %173, i64 3, !dbg !235
  %180 = load i8, i8* %179, align 1, !dbg !235, !tbaa !152
  %181 = zext i8 %162 to i32, !dbg !237
  %182 = shl nuw i32 %181, 24, !dbg !237
  %183 = zext i8 %160 to i32, !dbg !237
  %184 = shl nuw nsw i32 %183, 16, !dbg !237
  %185 = zext i8 %158 to i32, !dbg !237
  %186 = shl nuw nsw i32 %185, 8, !dbg !237
  %187 = zext i8 %156 to i32, !dbg !237
  %188 = or i32 %186, %187, !dbg !237
  %189 = or i32 %188, %184, !dbg !237
  %190 = or i32 %189, %182, !dbg !237
  %191 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !238
  %192 = bitcast i8* %191 to %struct.ink_block*, !dbg !238
  %193 = icmp eq i8* %191, null, !dbg !240
  br i1 %193, label %194, label %195, !dbg !241

194:                                              ; preds = %145
  tail call fastcc void @ink_fail() #11, !dbg !242
  unreachable

195:                                              ; preds = %145
  %196 = zext i8 %153 to i32, !dbg !243
  %197 = shl nuw i32 %196, 24, !dbg !243
  %198 = zext i8 %151 to i32, !dbg !243
  %199 = shl nuw nsw i32 %198, 16, !dbg !243
  %200 = zext i8 %149 to i32, !dbg !243
  %201 = shl nuw nsw i32 %200, 8, !dbg !243
  %202 = zext i8 %147 to i32, !dbg !243
  %203 = or i32 %201, %202, !dbg !243
  %204 = or i32 %203, %199, !dbg !243
  %205 = or i32 %204, %197, !dbg !243
  %206 = urem i32 %205, 3, !dbg !244
  %207 = icmp eq i32 %206, 0, !dbg !246
  %208 = zext i8 %180 to i32, !dbg !244
  %209 = shl nuw i32 %208, 24, !dbg !244
  %210 = zext i8 %178 to i32, !dbg !244
  %211 = shl nuw nsw i32 %210, 16, !dbg !244
  %212 = zext i8 %176 to i32, !dbg !244
  %213 = shl nuw nsw i32 %212, 8, !dbg !244
  %214 = zext i8 %174 to i32, !dbg !244
  %215 = or i32 %213, %214, !dbg !244
  %216 = or i32 %215, %211, !dbg !244
  %217 = or i32 %216, %209, !dbg !244
  %218 = mul i32 %217, %190, !dbg !247
  %219 = zext i8 %171 to i32, !dbg !248
  %220 = shl nuw i32 %219, 24, !dbg !248
  %221 = zext i8 %169 to i32, !dbg !248
  %222 = shl nuw nsw i32 %221, 16, !dbg !248
  %223 = zext i8 %167 to i32, !dbg !248
  %224 = shl nuw nsw i32 %223, 8, !dbg !248
  %225 = zext i8 %165 to i32, !dbg !248
  %226 = or i32 %224, %225, !dbg !248
  %227 = or i32 %226, %222, !dbg !248
  %228 = or i32 %227, %220, !dbg !248
  %229 = add i32 %228, %190, !dbg !247
  %230 = select i1 %207, i32 %218, i32 %229, !dbg !247
  %231 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !249, !tbaa !18
  %232 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %192, i64 0, i32 0, !dbg !250
  store %struct.ink_block* %231, %struct.ink_block** %232, align 8, !dbg !251, !tbaa !24
  store i8* %191, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !252, !tbaa !18
  %233 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %192, i64 1, !dbg !253
  %234 = bitcast %struct.ink_block* %233 to i32*, !dbg !254
  store i32 %230, i32* %234, align 4, !dbg !255, !tbaa !99
  %235 = bitcast i8** %3 to %struct.ink_block**, !dbg !256
  store %struct.ink_block* %233, %struct.ink_block** %235, align 8, !dbg !256, !tbaa !18
  br label %329

236:                                              ; preds = %5
  %237 = load i8*, i8** %1, align 8, !dbg !257, !tbaa !18
  %238 = load i8, i8* %237, align 1, !dbg !258, !tbaa !152
  %239 = getelementptr inbounds i8, i8* %237, i64 1, !dbg !258
  %240 = load i8, i8* %239, align 1, !dbg !258, !tbaa !152
  %241 = getelementptr inbounds i8, i8* %237, i64 2, !dbg !258
  %242 = load i8, i8* %241, align 1, !dbg !258, !tbaa !152
  %243 = getelementptr inbounds i8, i8* %237, i64 3, !dbg !258
  %244 = load i8, i8* %243, align 1, !dbg !258, !tbaa !152
  %245 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !260
  %246 = load i8*, i8** %245, align 8, !dbg !260, !tbaa !18
  %247 = load i8, i8* %246, align 1, !dbg !261, !tbaa !152
  %248 = getelementptr inbounds i8, i8* %246, i64 1, !dbg !261
  %249 = load i8, i8* %248, align 1, !dbg !261, !tbaa !152
  %250 = getelementptr inbounds i8, i8* %246, i64 2, !dbg !261
  %251 = load i8, i8* %250, align 1, !dbg !261, !tbaa !152
  %252 = getelementptr inbounds i8, i8* %246, i64 3, !dbg !261
  %253 = load i8, i8* %252, align 1, !dbg !261, !tbaa !152
  %254 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !263
  %255 = load i8*, i8** %254, align 8, !dbg !263, !tbaa !18
  %256 = load i8, i8* %255, align 1, !dbg !264, !tbaa !152
  %257 = getelementptr inbounds i8, i8* %255, i64 1, !dbg !264
  %258 = load i8, i8* %257, align 1, !dbg !264, !tbaa !152
  %259 = getelementptr inbounds i8, i8* %255, i64 2, !dbg !264
  %260 = load i8, i8* %259, align 1, !dbg !264, !tbaa !152
  %261 = getelementptr inbounds i8, i8* %255, i64 3, !dbg !264
  %262 = load i8, i8* %261, align 1, !dbg !264, !tbaa !152
  %263 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !266
  %264 = load i8*, i8** %263, align 8, !dbg !266, !tbaa !18
  %265 = load i8, i8* %264, align 1, !dbg !267, !tbaa !152
  %266 = getelementptr inbounds i8, i8* %264, i64 1, !dbg !267
  %267 = load i8, i8* %266, align 1, !dbg !267, !tbaa !152
  %268 = getelementptr inbounds i8, i8* %264, i64 2, !dbg !267
  %269 = load i8, i8* %268, align 1, !dbg !267, !tbaa !152
  %270 = getelementptr inbounds i8, i8* %264, i64 3, !dbg !267
  %271 = load i8, i8* %270, align 1, !dbg !267, !tbaa !152
  %272 = zext i8 %244 to i32, !dbg !269
  %273 = shl nuw i32 %272, 24, !dbg !269
  %274 = zext i8 %242 to i32, !dbg !269
  %275 = shl nuw nsw i32 %274, 16, !dbg !269
  %276 = zext i8 %240 to i32, !dbg !269
  %277 = shl nuw nsw i32 %276, 8, !dbg !269
  %278 = zext i8 %238 to i32, !dbg !269
  %279 = or i32 %277, %278, !dbg !269
  %280 = or i32 %279, %275, !dbg !269
  %281 = or i32 %280, %273, !dbg !269
  %282 = zext i8 %253 to i32, !dbg !270
  %283 = shl nuw i32 %282, 24, !dbg !270
  %284 = zext i8 %251 to i32, !dbg !270
  %285 = shl nuw nsw i32 %284, 16, !dbg !270
  %286 = zext i8 %249 to i32, !dbg !270
  %287 = shl nuw nsw i32 %286, 8, !dbg !270
  %288 = zext i8 %247 to i32, !dbg !270
  %289 = or i32 %287, %288, !dbg !270
  %290 = or i32 %289, %285, !dbg !270
  %291 = or i32 %290, %283, !dbg !270
  %292 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !271
  %293 = bitcast i8* %292 to %struct.ink_block*, !dbg !271
  %294 = icmp eq i8* %292, null, !dbg !273
  br i1 %294, label %295, label %296, !dbg !274

295:                                              ; preds = %236
  tail call fastcc void @ink_fail() #11, !dbg !275
  unreachable

296:                                              ; preds = %236
  %297 = icmp ult i32 %281, %291, !dbg !276
  %298 = zext i8 %271 to i32, !dbg !276
  %299 = shl nuw i32 %298, 24, !dbg !276
  %300 = zext i8 %269 to i32, !dbg !276
  %301 = shl nuw nsw i32 %300, 16, !dbg !276
  %302 = zext i8 %267 to i32, !dbg !276
  %303 = shl nuw nsw i32 %302, 8, !dbg !276
  %304 = zext i8 %265 to i32, !dbg !276
  %305 = or i32 %303, %304, !dbg !276
  %306 = or i32 %305, %301, !dbg !276
  %307 = or i32 %306, %299, !dbg !276
  %308 = mul i32 %307, %291, !dbg !278
  %309 = add i32 %308, %281, !dbg !278
  %310 = sub i32 %281, %291, !dbg !278
  %311 = zext i8 %262 to i32, !dbg !279
  %312 = shl nuw i32 %311, 24, !dbg !279
  %313 = zext i8 %260 to i32, !dbg !279
  %314 = shl nuw nsw i32 %313, 16, !dbg !279
  %315 = zext i8 %258 to i32, !dbg !279
  %316 = shl nuw nsw i32 %315, 8, !dbg !279
  %317 = zext i8 %256 to i32, !dbg !279
  %318 = or i32 %316, %317, !dbg !279
  %319 = or i32 %318, %314, !dbg !279
  %320 = or i32 %319, %312, !dbg !279
  %321 = add i32 %310, %320, !dbg !278
  %322 = select i1 %297, i32 %309, i32 %321, !dbg !278
  %323 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !280, !tbaa !18
  %324 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %293, i64 0, i32 0, !dbg !281
  store %struct.ink_block* %323, %struct.ink_block** %324, align 8, !dbg !282, !tbaa !24
  store i8* %292, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !283, !tbaa !18
  %325 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %293, i64 1, !dbg !284
  %326 = bitcast %struct.ink_block* %325 to i32*, !dbg !285
  store i32 %322, i32* %326, align 4, !dbg !286, !tbaa !99
  %327 = bitcast i8** %3 to %struct.ink_block**, !dbg !287
  store %struct.ink_block* %325, %struct.ink_block** %327, align 8, !dbg !287, !tbaa !18
  br label %329

328:                                              ; preds = %5
  tail call fastcc void @ink_fail(), !dbg !288
  unreachable

329:                                              ; preds = %296, %195, %105, %6
  %330 = phi i64 [ 1, %296 ], [ 1, %195 ], [ 1, %105 ], [ %53, %6 ]
  store i64 %330, i64* %4, align 8, !dbg !289, !tbaa !157
  ret void, !dbg !290
}

; Function Attrs: nounwind ssp uwtable
define i32 @ink_compute_scalar32(i32 %0, i8** nocapture readonly %1, i64* nocapture readnone %2) local_unnamed_addr #0 !dbg !291 {
  switch i32 %0, label %247 [
    i32 1, label %4
    i32 2, label %84
    i32 3, label %165
  ], !dbg !292

4:                                                ; preds = %3
  %5 = load i8*, i8** %1, align 8, !dbg !293, !tbaa !18
  %6 = load i8, i8* %5, align 1, !dbg !294, !tbaa !152
  %7 = getelementptr inbounds i8, i8* %5, i64 1, !dbg !294
  %8 = load i8, i8* %7, align 1, !dbg !294, !tbaa !152
  %9 = getelementptr inbounds i8, i8* %5, i64 2, !dbg !294
  %10 = load i8, i8* %9, align 1, !dbg !294, !tbaa !152
  %11 = getelementptr inbounds i8, i8* %5, i64 3, !dbg !294
  %12 = load i8, i8* %11, align 1, !dbg !294, !tbaa !152
  %13 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !296
  %14 = load i8*, i8** %13, align 8, !dbg !296, !tbaa !18
  %15 = load i8, i8* %14, align 1, !dbg !297, !tbaa !152
  %16 = getelementptr inbounds i8, i8* %14, i64 1, !dbg !297
  %17 = load i8, i8* %16, align 1, !dbg !297, !tbaa !152
  %18 = getelementptr inbounds i8, i8* %14, i64 2, !dbg !297
  %19 = load i8, i8* %18, align 1, !dbg !297, !tbaa !152
  %20 = getelementptr inbounds i8, i8* %14, i64 3, !dbg !297
  %21 = load i8, i8* %20, align 1, !dbg !297, !tbaa !152
  %22 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !299
  %23 = load i8*, i8** %22, align 8, !dbg !299, !tbaa !18
  %24 = load i8, i8* %23, align 1, !dbg !300, !tbaa !152
  %25 = getelementptr inbounds i8, i8* %23, i64 1, !dbg !300
  %26 = load i8, i8* %25, align 1, !dbg !300, !tbaa !152
  %27 = getelementptr inbounds i8, i8* %23, i64 2, !dbg !300
  %28 = load i8, i8* %27, align 1, !dbg !300, !tbaa !152
  %29 = getelementptr inbounds i8, i8* %23, i64 3, !dbg !300
  %30 = load i8, i8* %29, align 1, !dbg !300, !tbaa !152
  %31 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !302
  %32 = load i8*, i8** %31, align 8, !dbg !302, !tbaa !18
  %33 = load i8, i8* %32, align 1, !dbg !303, !tbaa !152
  %34 = getelementptr inbounds i8, i8* %32, i64 1, !dbg !303
  %35 = load i8, i8* %34, align 1, !dbg !303, !tbaa !152
  %36 = getelementptr inbounds i8, i8* %32, i64 2, !dbg !303
  %37 = load i8, i8* %36, align 1, !dbg !303, !tbaa !152
  %38 = getelementptr inbounds i8, i8* %32, i64 3, !dbg !303
  %39 = load i8, i8* %38, align 1, !dbg !303, !tbaa !152
  %40 = zext i8 %12 to i32, !dbg !305
  %41 = shl nuw i32 %40, 24, !dbg !305
  %42 = zext i8 %10 to i32, !dbg !305
  %43 = shl nuw nsw i32 %42, 16, !dbg !305
  %44 = zext i8 %8 to i32, !dbg !305
  %45 = shl nuw nsw i32 %44, 8, !dbg !305
  %46 = zext i8 %6 to i32, !dbg !305
  %47 = or i32 %45, %46, !dbg !305
  %48 = or i32 %47, %43, !dbg !305
  %49 = or i32 %48, %41, !dbg !305
  %50 = zext i8 %21 to i32, !dbg !306
  %51 = shl nuw i32 %50, 24, !dbg !306
  %52 = zext i8 %19 to i32, !dbg !306
  %53 = shl nuw nsw i32 %52, 16, !dbg !306
  %54 = zext i8 %17 to i32, !dbg !306
  %55 = shl nuw nsw i32 %54, 8, !dbg !306
  %56 = zext i8 %15 to i32, !dbg !306
  %57 = or i32 %55, %56, !dbg !306
  %58 = or i32 %57, %53, !dbg !306
  %59 = or i32 %58, %51, !dbg !306
  %60 = zext i8 %30 to i32, !dbg !307
  %61 = shl nuw i32 %60, 24, !dbg !307
  %62 = zext i8 %28 to i32, !dbg !307
  %63 = shl nuw nsw i32 %62, 16, !dbg !307
  %64 = zext i8 %26 to i32, !dbg !307
  %65 = shl nuw nsw i32 %64, 8, !dbg !307
  %66 = zext i8 %24 to i32, !dbg !307
  %67 = or i32 %65, %66, !dbg !307
  %68 = or i32 %67, %63, !dbg !307
  %69 = or i32 %68, %61, !dbg !307
  %70 = zext i8 %39 to i32, !dbg !308
  %71 = shl nuw i32 %70, 24, !dbg !308
  %72 = zext i8 %37 to i32, !dbg !308
  %73 = shl nuw nsw i32 %72, 16, !dbg !308
  %74 = zext i8 %35 to i32, !dbg !308
  %75 = shl nuw nsw i32 %74, 8, !dbg !308
  %76 = zext i8 %33 to i32, !dbg !308
  %77 = or i32 %75, %76, !dbg !308
  %78 = or i32 %77, %73, !dbg !308
  %79 = or i32 %78, %71, !dbg !308
  %80 = icmp ult i32 %49, %69, !dbg !308
  %81 = sub i32 0, %69, !dbg !310
  %82 = select i1 %80, i32 %79, i32 %81, !dbg !310
  %83 = add i32 %82, %59, !dbg !310
  br label %248

84:                                               ; preds = %3
  %85 = load i8*, i8** %1, align 8, !dbg !311, !tbaa !18
  %86 = load i8, i8* %85, align 1, !dbg !312, !tbaa !152
  %87 = getelementptr inbounds i8, i8* %85, i64 1, !dbg !312
  %88 = load i8, i8* %87, align 1, !dbg !312, !tbaa !152
  %89 = getelementptr inbounds i8, i8* %85, i64 2, !dbg !312
  %90 = load i8, i8* %89, align 1, !dbg !312, !tbaa !152
  %91 = getelementptr inbounds i8, i8* %85, i64 3, !dbg !312
  %92 = load i8, i8* %91, align 1, !dbg !312, !tbaa !152
  %93 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !314
  %94 = load i8*, i8** %93, align 8, !dbg !314, !tbaa !18
  %95 = load i8, i8* %94, align 1, !dbg !315, !tbaa !152
  %96 = getelementptr inbounds i8, i8* %94, i64 1, !dbg !315
  %97 = load i8, i8* %96, align 1, !dbg !315, !tbaa !152
  %98 = getelementptr inbounds i8, i8* %94, i64 2, !dbg !315
  %99 = load i8, i8* %98, align 1, !dbg !315, !tbaa !152
  %100 = getelementptr inbounds i8, i8* %94, i64 3, !dbg !315
  %101 = load i8, i8* %100, align 1, !dbg !315, !tbaa !152
  %102 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !317
  %103 = load i8*, i8** %102, align 8, !dbg !317, !tbaa !18
  %104 = load i8, i8* %103, align 1, !dbg !318, !tbaa !152
  %105 = getelementptr inbounds i8, i8* %103, i64 1, !dbg !318
  %106 = load i8, i8* %105, align 1, !dbg !318, !tbaa !152
  %107 = getelementptr inbounds i8, i8* %103, i64 2, !dbg !318
  %108 = load i8, i8* %107, align 1, !dbg !318, !tbaa !152
  %109 = getelementptr inbounds i8, i8* %103, i64 3, !dbg !318
  %110 = load i8, i8* %109, align 1, !dbg !318, !tbaa !152
  %111 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !320
  %112 = load i8*, i8** %111, align 8, !dbg !320, !tbaa !18
  %113 = load i8, i8* %112, align 1, !dbg !321, !tbaa !152
  %114 = getelementptr inbounds i8, i8* %112, i64 1, !dbg !321
  %115 = load i8, i8* %114, align 1, !dbg !321, !tbaa !152
  %116 = getelementptr inbounds i8, i8* %112, i64 2, !dbg !321
  %117 = load i8, i8* %116, align 1, !dbg !321, !tbaa !152
  %118 = getelementptr inbounds i8, i8* %112, i64 3, !dbg !321
  %119 = load i8, i8* %118, align 1, !dbg !321, !tbaa !152
  %120 = zext i8 %92 to i32, !dbg !323
  %121 = shl nuw i32 %120, 24, !dbg !323
  %122 = zext i8 %90 to i32, !dbg !323
  %123 = shl nuw nsw i32 %122, 16, !dbg !323
  %124 = zext i8 %88 to i32, !dbg !323
  %125 = shl nuw nsw i32 %124, 8, !dbg !323
  %126 = zext i8 %86 to i32, !dbg !323
  %127 = or i32 %125, %126, !dbg !323
  %128 = or i32 %127, %123, !dbg !323
  %129 = or i32 %128, %121, !dbg !323
  %130 = zext i8 %101 to i32, !dbg !324
  %131 = shl nuw i32 %130, 24, !dbg !324
  %132 = zext i8 %99 to i32, !dbg !324
  %133 = shl nuw nsw i32 %132, 16, !dbg !324
  %134 = zext i8 %97 to i32, !dbg !324
  %135 = shl nuw nsw i32 %134, 8, !dbg !324
  %136 = zext i8 %95 to i32, !dbg !324
  %137 = or i32 %135, %136, !dbg !324
  %138 = or i32 %137, %133, !dbg !324
  %139 = or i32 %138, %131, !dbg !324
  %140 = zext i8 %110 to i32, !dbg !325
  %141 = shl nuw i32 %140, 24, !dbg !325
  %142 = zext i8 %108 to i32, !dbg !325
  %143 = shl nuw nsw i32 %142, 16, !dbg !325
  %144 = zext i8 %106 to i32, !dbg !325
  %145 = shl nuw nsw i32 %144, 8, !dbg !325
  %146 = zext i8 %104 to i32, !dbg !325
  %147 = or i32 %145, %146, !dbg !325
  %148 = or i32 %147, %143, !dbg !325
  %149 = or i32 %148, %141, !dbg !325
  %150 = zext i8 %119 to i32, !dbg !326
  %151 = shl nuw i32 %150, 24, !dbg !326
  %152 = zext i8 %117 to i32, !dbg !326
  %153 = shl nuw nsw i32 %152, 16, !dbg !326
  %154 = zext i8 %115 to i32, !dbg !326
  %155 = shl nuw nsw i32 %154, 8, !dbg !326
  %156 = zext i8 %113 to i32, !dbg !326
  %157 = or i32 %155, %156, !dbg !326
  %158 = or i32 %157, %153, !dbg !326
  %159 = or i32 %158, %151, !dbg !326
  %160 = urem i32 %129, 3, !dbg !326
  %161 = icmp eq i32 %160, 0, !dbg !328
  %162 = mul i32 %159, %139, !dbg !329
  %163 = add i32 %149, %139, !dbg !329
  %164 = select i1 %161, i32 %162, i32 %163, !dbg !329
  br label %248

165:                                              ; preds = %3
  %166 = load i8*, i8** %1, align 8, !dbg !330, !tbaa !18
  %167 = load i8, i8* %166, align 1, !dbg !331, !tbaa !152
  %168 = getelementptr inbounds i8, i8* %166, i64 1, !dbg !331
  %169 = load i8, i8* %168, align 1, !dbg !331, !tbaa !152
  %170 = getelementptr inbounds i8, i8* %166, i64 2, !dbg !331
  %171 = load i8, i8* %170, align 1, !dbg !331, !tbaa !152
  %172 = getelementptr inbounds i8, i8* %166, i64 3, !dbg !331
  %173 = load i8, i8* %172, align 1, !dbg !331, !tbaa !152
  %174 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !333
  %175 = load i8*, i8** %174, align 8, !dbg !333, !tbaa !18
  %176 = load i8, i8* %175, align 1, !dbg !334, !tbaa !152
  %177 = getelementptr inbounds i8, i8* %175, i64 1, !dbg !334
  %178 = load i8, i8* %177, align 1, !dbg !334, !tbaa !152
  %179 = getelementptr inbounds i8, i8* %175, i64 2, !dbg !334
  %180 = load i8, i8* %179, align 1, !dbg !334, !tbaa !152
  %181 = getelementptr inbounds i8, i8* %175, i64 3, !dbg !334
  %182 = load i8, i8* %181, align 1, !dbg !334, !tbaa !152
  %183 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !336
  %184 = load i8*, i8** %183, align 8, !dbg !336, !tbaa !18
  %185 = load i8, i8* %184, align 1, !dbg !337, !tbaa !152
  %186 = getelementptr inbounds i8, i8* %184, i64 1, !dbg !337
  %187 = load i8, i8* %186, align 1, !dbg !337, !tbaa !152
  %188 = getelementptr inbounds i8, i8* %184, i64 2, !dbg !337
  %189 = load i8, i8* %188, align 1, !dbg !337, !tbaa !152
  %190 = getelementptr inbounds i8, i8* %184, i64 3, !dbg !337
  %191 = load i8, i8* %190, align 1, !dbg !337, !tbaa !152
  %192 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !339
  %193 = load i8*, i8** %192, align 8, !dbg !339, !tbaa !18
  %194 = load i8, i8* %193, align 1, !dbg !340, !tbaa !152
  %195 = getelementptr inbounds i8, i8* %193, i64 1, !dbg !340
  %196 = load i8, i8* %195, align 1, !dbg !340, !tbaa !152
  %197 = getelementptr inbounds i8, i8* %193, i64 2, !dbg !340
  %198 = load i8, i8* %197, align 1, !dbg !340, !tbaa !152
  %199 = getelementptr inbounds i8, i8* %193, i64 3, !dbg !340
  %200 = load i8, i8* %199, align 1, !dbg !340, !tbaa !152
  %201 = zext i8 %173 to i32, !dbg !342
  %202 = shl nuw i32 %201, 24, !dbg !342
  %203 = zext i8 %171 to i32, !dbg !342
  %204 = shl nuw nsw i32 %203, 16, !dbg !342
  %205 = zext i8 %169 to i32, !dbg !342
  %206 = shl nuw nsw i32 %205, 8, !dbg !342
  %207 = zext i8 %167 to i32, !dbg !342
  %208 = or i32 %206, %207, !dbg !342
  %209 = or i32 %208, %204, !dbg !342
  %210 = or i32 %209, %202, !dbg !342
  %211 = zext i8 %182 to i32, !dbg !343
  %212 = shl nuw i32 %211, 24, !dbg !343
  %213 = zext i8 %180 to i32, !dbg !343
  %214 = shl nuw nsw i32 %213, 16, !dbg !343
  %215 = zext i8 %178 to i32, !dbg !343
  %216 = shl nuw nsw i32 %215, 8, !dbg !343
  %217 = zext i8 %176 to i32, !dbg !343
  %218 = or i32 %216, %217, !dbg !343
  %219 = or i32 %218, %214, !dbg !343
  %220 = or i32 %219, %212, !dbg !343
  %221 = zext i8 %191 to i32, !dbg !344
  %222 = shl nuw i32 %221, 24, !dbg !344
  %223 = zext i8 %189 to i32, !dbg !344
  %224 = shl nuw nsw i32 %223, 16, !dbg !344
  %225 = zext i8 %187 to i32, !dbg !344
  %226 = shl nuw nsw i32 %225, 8, !dbg !344
  %227 = zext i8 %185 to i32, !dbg !344
  %228 = or i32 %226, %227, !dbg !344
  %229 = or i32 %228, %224, !dbg !344
  %230 = or i32 %229, %222, !dbg !344
  %231 = zext i8 %200 to i32, !dbg !345
  %232 = shl nuw i32 %231, 24, !dbg !345
  %233 = zext i8 %198 to i32, !dbg !345
  %234 = shl nuw nsw i32 %233, 16, !dbg !345
  %235 = zext i8 %196 to i32, !dbg !345
  %236 = shl nuw nsw i32 %235, 8, !dbg !345
  %237 = zext i8 %194 to i32, !dbg !345
  %238 = or i32 %236, %237, !dbg !345
  %239 = or i32 %238, %234, !dbg !345
  %240 = or i32 %239, %232, !dbg !345
  %241 = icmp ult i32 %210, %220, !dbg !345
  %242 = mul i32 %240, %220, !dbg !347
  %243 = add i32 %242, %210, !dbg !347
  %244 = sub i32 %210, %220, !dbg !347
  %245 = add i32 %244, %230, !dbg !347
  %246 = select i1 %241, i32 %243, i32 %245, !dbg !347
  br label %248

247:                                              ; preds = %3
  tail call fastcc void @ink_fail(), !dbg !348
  unreachable

248:                                              ; preds = %165, %84, %4
  %249 = phi i32 [ %246, %165 ], [ %164, %84 ], [ %83, %4 ], !dbg !349
  ret i32 %249, !dbg !350
}

; Function Attrs: noreturn nounwind ssp uwtable
define i64 @ink_compute_scalar64(i32 %0, i8** nocapture readnone %1, i64* nocapture readnone %2) local_unnamed_addr #3 !dbg !351 {
  tail call fastcc void @ink_fail(), !dbg !352
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
!96 = !DILocation(line: 169, column: 1, scope: !74)
!97 = !DILocation(line: 91, column: 13, scope: !74)
!98 = !DILocation(line: 93, column: 13, scope: !74)
!99 = !{!100, !100, i64 0}
!100 = !{!"int", !20, i64 0}
!101 = !DILocation(line: 103, column: 9, scope: !74)
!102 = !DILocation(line: 103, column: 5, scope: !74)
!103 = !DILocation(line: 130, column: 18, scope: !74)
!104 = !DILocation(line: 134, column: 10, scope: !74)
!105 = !DILocation(line: 134, column: 5, scope: !74)
!106 = !DILocation(line: 153, column: 10, scope: !74)
!107 = !DILocation(line: 153, column: 5, scope: !74)
!108 = !DILocation(line: 166, column: 1, scope: !74)
!109 = !DILocation(line: 166, column: 12, scope: !74)
!110 = !DILocation(line: 90, column: 29, scope: !74)
!111 = !DILocation(line: 90, column: 19, scope: !74)
!112 = distinct !{!112, !95, !113, !32}
!113 = !DILocation(line: 167, column: 1, scope: !74)
!114 = distinct !DISubprogram(name: "lang_fn_left_word", scope: !14, file: !14, line: 170, type: !15, scopeLine: 170, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!115 = !DILocation(line: 178, column: 9, scope: !114)
!116 = !DILocation(line: 178, column: 5, scope: !114)
!117 = !DILocation(line: 187, column: 1, scope: !114)
!118 = distinct !DISubprogram(name: "lang_fn_right_word", scope: !14, file: !14, line: 189, type: !15, scopeLine: 189, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!119 = !DILocation(line: 201, column: 16, scope: !118)
!120 = !DILocation(line: 205, column: 9, scope: !118)
!121 = !DILocation(line: 205, column: 5, scope: !118)
!122 = !DILocation(line: 214, column: 1, scope: !118)
!123 = distinct !DISubprogram(name: "lang_fn_pair_word", scope: !14, file: !14, line: 216, type: !15, scopeLine: 216, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!124 = !DILocation(line: 224, column: 9, scope: !123)
!125 = !DILocation(line: 224, column: 5, scope: !123)
!126 = !DILocation(line: 237, column: 1, scope: !123)
!127 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_u32_into", scope: !14, file: !14, line: 239, type: !15, scopeLine: 239, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!128 = !DILocation(line: 247, column: 19, scope: !127)
!129 = !DILocation(line: 247, column: 1, scope: !127)
!130 = !DILocation(line: 325, column: 1, scope: !127)
!131 = !DILocation(line: 248, column: 13, scope: !127)
!132 = !DILocation(line: 250, column: 13, scope: !127)
!133 = !DILocation(line: 260, column: 9, scope: !127)
!134 = !DILocation(line: 260, column: 5, scope: !127)
!135 = !DILocation(line: 287, column: 18, scope: !127)
!136 = !DILocation(line: 291, column: 10, scope: !127)
!137 = !DILocation(line: 291, column: 5, scope: !127)
!138 = !DILocation(line: 310, column: 10, scope: !127)
!139 = !DILocation(line: 310, column: 5, scope: !127)
!140 = !DILocation(line: 323, column: 1, scope: !127)
!141 = !DILocation(line: 323, column: 12, scope: !127)
!142 = !DILocation(line: 247, column: 29, scope: !127)
!143 = distinct !{!143, !129, !144, !32}
!144 = !DILocation(line: 324, column: 1, scope: !127)
!145 = distinct !DISubprogram(name: "ink_compute_into", scope: !14, file: !14, line: 327, type: !15, scopeLine: 327, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!146 = !DILocation(line: 327, column: 151, scope: !145)
!147 = !DILocation(line: 328, column: 34, scope: !145)
!148 = !DILocation(line: 328, column: 100, scope: !145)
!149 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !151)
!150 = distinct !DISubprogram(name: "ink_copy", scope: !14, file: !14, line: 37, type: !15, scopeLine: 37, flags: DIFlagPrototyped, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!151 = distinct !DILocation(line: 328, column: 87, scope: !145)
!152 = !{!20, !20, i64 0}
!153 = !DILocation(line: 328, column: 145, scope: !145)
!154 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !155)
!155 = distinct !DILocation(line: 328, column: 132, scope: !145)
!156 = !DILocation(line: 328, column: 235, scope: !145)
!157 = !{!158, !158, i64 0}
!158 = !{!"long", !20, i64 0}
!159 = !DILocation(line: 328, column: 280, scope: !145)
!160 = !DILocation(line: 328, column: 283, scope: !145)
!161 = !DILocation(line: 247, column: 19, scope: !127, inlinedAt: !162)
!162 = distinct !DILocation(line: 328, column: 172, scope: !145)
!163 = !DILocation(line: 247, column: 1, scope: !127, inlinedAt: !162)
!164 = !DILocation(line: 248, column: 13, scope: !127, inlinedAt: !162)
!165 = !DILocation(line: 250, column: 13, scope: !127, inlinedAt: !162)
!166 = !DILocation(line: 260, column: 9, scope: !127, inlinedAt: !162)
!167 = !DILocation(line: 260, column: 5, scope: !127, inlinedAt: !162)
!168 = !DILocation(line: 287, column: 18, scope: !127, inlinedAt: !162)
!169 = !DILocation(line: 291, column: 10, scope: !127, inlinedAt: !162)
!170 = !DILocation(line: 291, column: 5, scope: !127, inlinedAt: !162)
!171 = !DILocation(line: 310, column: 10, scope: !127, inlinedAt: !162)
!172 = !DILocation(line: 310, column: 5, scope: !127, inlinedAt: !162)
!173 = !DILocation(line: 323, column: 1, scope: !127, inlinedAt: !162)
!174 = !DILocation(line: 323, column: 12, scope: !127, inlinedAt: !162)
!175 = !DILocation(line: 247, column: 29, scope: !127, inlinedAt: !162)
!176 = distinct !{!176, !163, !177, !32}
!177 = !DILocation(line: 324, column: 1, scope: !127, inlinedAt: !162)
!178 = !DILocation(line: 329, column: 9, scope: !145)
!179 = !DILocation(line: 329, column: 30, scope: !145)
!180 = distinct !DISubprogram(name: "ink_compute_call", scope: !14, file: !14, line: 330, type: !15, scopeLine: 330, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!181 = !DILocation(line: 330, column: 142, scope: !180)
!182 = !DILocation(line: 331, column: 34, scope: !180)
!183 = !DILocation(line: 331, column: 100, scope: !180)
!184 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !185)
!185 = distinct !DILocation(line: 331, column: 87, scope: !180)
!186 = !DILocation(line: 331, column: 145, scope: !180)
!187 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !188)
!188 = distinct !DILocation(line: 331, column: 132, scope: !180)
!189 = !DILocation(line: 331, column: 243, scope: !180)
!190 = !DILocation(line: 331, column: 288, scope: !180)
!191 = !DILocation(line: 331, column: 185, scope: !180)
!192 = !DILocation(line: 331, column: 300, scope: !180)
!193 = !DILocation(line: 331, column: 299, scope: !180)
!194 = !DILocation(line: 332, column: 34, scope: !180)
!195 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !196)
!196 = distinct !DILocation(line: 332, column: 21, scope: !180)
!197 = !DILocation(line: 332, column: 79, scope: !180)
!198 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !199)
!199 = distinct !DILocation(line: 332, column: 66, scope: !180)
!200 = !DILocation(line: 332, column: 124, scope: !180)
!201 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !202)
!202 = distinct !DILocation(line: 332, column: 111, scope: !180)
!203 = !DILocation(line: 332, column: 169, scope: !180)
!204 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !205)
!205 = distinct !DILocation(line: 332, column: 156, scope: !180)
!206 = !DILocation(line: 332, column: 232, scope: !180)
!207 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !208)
!208 = distinct !DILocation(line: 332, column: 251, scope: !180)
!209 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !208)
!210 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !208)
!211 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !208)
!212 = !DILocation(line: 332, column: 226, scope: !180)
!213 = !DILocation(line: 178, column: 9, scope: !114, inlinedAt: !214)
!214 = distinct !DILocation(line: 332, column: 205, scope: !180)
!215 = !DILocation(line: 178, column: 5, scope: !114, inlinedAt: !214)
!216 = !DILocation(line: 332, column: 229, scope: !180)
!217 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !208)
!218 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !208)
!219 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !208)
!220 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !208)
!221 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !208)
!222 = !DILocation(line: 332, column: 251, scope: !180)
!223 = !DILocation(line: 332, column: 284, scope: !180)
!224 = !DILocation(line: 332, column: 299, scope: !180)
!225 = !DILocation(line: 333, column: 34, scope: !180)
!226 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !227)
!227 = distinct !DILocation(line: 333, column: 21, scope: !180)
!228 = !DILocation(line: 333, column: 79, scope: !180)
!229 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !230)
!230 = distinct !DILocation(line: 333, column: 66, scope: !180)
!231 = !DILocation(line: 333, column: 124, scope: !180)
!232 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !233)
!233 = distinct !DILocation(line: 333, column: 111, scope: !180)
!234 = !DILocation(line: 333, column: 169, scope: !180)
!235 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !236)
!236 = distinct !DILocation(line: 333, column: 156, scope: !180)
!237 = !DILocation(line: 333, column: 230, scope: !180)
!238 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !239)
!239 = distinct !DILocation(line: 333, column: 252, scope: !180)
!240 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !239)
!241 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !239)
!242 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !239)
!243 = !DILocation(line: 333, column: 227, scope: !180)
!244 = !DILocation(line: 201, column: 16, scope: !118, inlinedAt: !245)
!245 = distinct !DILocation(line: 333, column: 205, scope: !180)
!246 = !DILocation(line: 205, column: 9, scope: !118, inlinedAt: !245)
!247 = !DILocation(line: 205, column: 5, scope: !118, inlinedAt: !245)
!248 = !DILocation(line: 333, column: 233, scope: !180)
!249 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !239)
!250 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !239)
!251 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !239)
!252 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !239)
!253 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !239)
!254 = !DILocation(line: 333, column: 252, scope: !180)
!255 = !DILocation(line: 333, column: 285, scope: !180)
!256 = !DILocation(line: 333, column: 300, scope: !180)
!257 = !DILocation(line: 334, column: 34, scope: !180)
!258 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !259)
!259 = distinct !DILocation(line: 334, column: 21, scope: !180)
!260 = !DILocation(line: 334, column: 79, scope: !180)
!261 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !262)
!262 = distinct !DILocation(line: 334, column: 66, scope: !180)
!263 = !DILocation(line: 334, column: 124, scope: !180)
!264 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !265)
!265 = distinct !DILocation(line: 334, column: 111, scope: !180)
!266 = !DILocation(line: 334, column: 169, scope: !180)
!267 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !268)
!268 = distinct !DILocation(line: 334, column: 156, scope: !180)
!269 = !DILocation(line: 334, column: 226, scope: !180)
!270 = !DILocation(line: 334, column: 229, scope: !180)
!271 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !272)
!272 = distinct !DILocation(line: 334, column: 251, scope: !180)
!273 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !272)
!274 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !272)
!275 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !272)
!276 = !DILocation(line: 224, column: 9, scope: !123, inlinedAt: !277)
!277 = distinct !DILocation(line: 334, column: 205, scope: !180)
!278 = !DILocation(line: 224, column: 5, scope: !123, inlinedAt: !277)
!279 = !DILocation(line: 334, column: 232, scope: !180)
!280 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !272)
!281 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !272)
!282 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !272)
!283 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !272)
!284 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !272)
!285 = !DILocation(line: 334, column: 251, scope: !180)
!286 = !DILocation(line: 334, column: 284, scope: !180)
!287 = !DILocation(line: 334, column: 299, scope: !180)
!288 = !DILocation(line: 335, column: 9, scope: !180)
!289 = !DILocation(line: 0, scope: !180)
!290 = !DILocation(line: 335, column: 21, scope: !180)
!291 = distinct !DISubprogram(name: "ink_compute_scalar32", scope: !14, file: !14, line: 336, type: !15, scopeLine: 336, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!292 = !DILocation(line: 336, column: 122, scope: !291)
!293 = !DILocation(line: 337, column: 34, scope: !291)
!294 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !295)
!295 = distinct !DILocation(line: 337, column: 21, scope: !291)
!296 = !DILocation(line: 337, column: 79, scope: !291)
!297 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !298)
!298 = distinct !DILocation(line: 337, column: 66, scope: !291)
!299 = !DILocation(line: 337, column: 124, scope: !291)
!300 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !301)
!301 = distinct !DILocation(line: 337, column: 111, scope: !291)
!302 = !DILocation(line: 337, column: 169, scope: !291)
!303 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !304)
!304 = distinct !DILocation(line: 337, column: 156, scope: !291)
!305 = !DILocation(line: 337, column: 226, scope: !291)
!306 = !DILocation(line: 337, column: 229, scope: !291)
!307 = !DILocation(line: 337, column: 232, scope: !291)
!308 = !DILocation(line: 178, column: 9, scope: !114, inlinedAt: !309)
!309 = distinct !DILocation(line: 337, column: 205, scope: !291)
!310 = !DILocation(line: 178, column: 5, scope: !114, inlinedAt: !309)
!311 = !DILocation(line: 338, column: 34, scope: !291)
!312 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !313)
!313 = distinct !DILocation(line: 338, column: 21, scope: !291)
!314 = !DILocation(line: 338, column: 79, scope: !291)
!315 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !316)
!316 = distinct !DILocation(line: 338, column: 66, scope: !291)
!317 = !DILocation(line: 338, column: 124, scope: !291)
!318 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !319)
!319 = distinct !DILocation(line: 338, column: 111, scope: !291)
!320 = !DILocation(line: 338, column: 169, scope: !291)
!321 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !322)
!322 = distinct !DILocation(line: 338, column: 156, scope: !291)
!323 = !DILocation(line: 338, column: 227, scope: !291)
!324 = !DILocation(line: 338, column: 230, scope: !291)
!325 = !DILocation(line: 338, column: 233, scope: !291)
!326 = !DILocation(line: 201, column: 16, scope: !118, inlinedAt: !327)
!327 = distinct !DILocation(line: 338, column: 205, scope: !291)
!328 = !DILocation(line: 205, column: 9, scope: !118, inlinedAt: !327)
!329 = !DILocation(line: 205, column: 5, scope: !118, inlinedAt: !327)
!330 = !DILocation(line: 339, column: 34, scope: !291)
!331 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !332)
!332 = distinct !DILocation(line: 339, column: 21, scope: !291)
!333 = !DILocation(line: 339, column: 79, scope: !291)
!334 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !335)
!335 = distinct !DILocation(line: 339, column: 66, scope: !291)
!336 = !DILocation(line: 339, column: 124, scope: !291)
!337 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !338)
!338 = distinct !DILocation(line: 339, column: 111, scope: !291)
!339 = !DILocation(line: 339, column: 169, scope: !291)
!340 = !DILocation(line: 37, column: 172, scope: !150, inlinedAt: !341)
!341 = distinct !DILocation(line: 339, column: 156, scope: !291)
!342 = !DILocation(line: 339, column: 226, scope: !291)
!343 = !DILocation(line: 339, column: 229, scope: !291)
!344 = !DILocation(line: 339, column: 232, scope: !291)
!345 = !DILocation(line: 224, column: 9, scope: !123, inlinedAt: !346)
!346 = distinct !DILocation(line: 339, column: 205, scope: !291)
!347 = !DILocation(line: 224, column: 5, scope: !123, inlinedAt: !346)
!348 = !DILocation(line: 340, column: 9, scope: !291)
!349 = !DILocation(line: 0, scope: !291)
!350 = !DILocation(line: 340, column: 30, scope: !291)
!351 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !14, file: !14, line: 341, type: !15, scopeLine: 341, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!352 = !DILocation(line: 342, column: 9, scope: !351)
