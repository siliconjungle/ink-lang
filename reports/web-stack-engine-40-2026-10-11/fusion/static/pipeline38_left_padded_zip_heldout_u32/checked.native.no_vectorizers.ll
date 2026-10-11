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
  br i1 %11, label %42, label %27, !dbg !95

27:                                               ; preds = %22
  %28 = icmp eq i32 %3, 0
  br i1 %28, label %29, label %46, !dbg !95

29:                                               ; preds = %27, %29
  %30 = phi i64 [ %40, %29 ], [ 0, %27 ]
  %31 = trunc i64 %30 to i32, !dbg !96
  %32 = getelementptr inbounds i32, i32* %6, i64 %30, !dbg !97
  %33 = load i32, i32* %32, align 4, !dbg !98, !tbaa !99
  %34 = icmp ult i32 %31, %2, !dbg !101
  %35 = mul i32 %33, 3, !dbg !102
  %36 = select i1 %34, i32 %33, i32 %35, !dbg !102
  %37 = icmp ugt i32 %36, %2, !dbg !103
  %38 = select i1 %37, i32 %36, i32 %2, !dbg !104
  %39 = getelementptr inbounds i32, i32* %26, i64 %30, !dbg !105
  store i32 %38, i32* %39, align 4, !dbg !106, !tbaa !99
  %40 = add nuw i64 %30, 1, !dbg !107
  %41 = icmp eq i64 %40, %7, !dbg !108
  br i1 %41, label %42, label %29, !dbg !95, !llvm.loop !109

42:                                               ; preds = %66, %29, %22
  %43 = ptrtoint %struct.ink_block* %25 to i64, !dbg !111
  %44 = insertvalue [2 x i64] undef, i64 %43, 0, !dbg !111
  %45 = insertvalue [2 x i64] %44, i64 %7, 1, !dbg !111
  ret [2 x i64] %45, !dbg !111

46:                                               ; preds = %27, %66
  %47 = phi i64 [ %69, %66 ], [ 0, %27 ]
  %48 = trunc i64 %47 to i32, !dbg !96
  %49 = getelementptr inbounds i32, i32* %6, i64 %47, !dbg !97
  %50 = load i32, i32* %49, align 4, !dbg !97, !tbaa !99
  %51 = udiv i32 %50, %3, !dbg !112
  %52 = urem i32 %48, %3, !dbg !113
  %53 = add i32 %51, %2, !dbg !114
  %54 = add i32 %53, %52, !dbg !115
  %55 = icmp ult i32 %48, %2, !dbg !101
  %56 = add i32 %50, %3, !dbg !102
  %57 = mul i32 %50, 3, !dbg !102
  %58 = select i1 %55, i32 %56, i32 %57, !dbg !102
  %59 = icmp ult i32 %54, %58, !dbg !103
  br i1 %59, label %60, label %63, !dbg !104

60:                                               ; preds = %46
  %61 = udiv i32 %54, %3, !dbg !116
  %62 = add i32 %61, %58, !dbg !117
  br label %66, !dbg !118

63:                                               ; preds = %46
  %64 = urem i32 %58, %3, !dbg !119
  %65 = add i32 %64, %54, !dbg !120
  br label %66

66:                                               ; preds = %63, %60
  %67 = phi i32 [ %62, %60 ], [ %65, %63 ], !dbg !121
  %68 = getelementptr inbounds i32, i32* %26, i64 %47, !dbg !105
  store i32 %67, i32* %68, align 4, !dbg !106, !tbaa !99
  %69 = add nuw i64 %47, 1, !dbg !107
  %70 = icmp eq i64 %69, %7, !dbg !108
  br i1 %70, label %42, label %46, !dbg !95, !llvm.loop !109
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_left_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !122 {
  %5 = icmp eq i32 %3, 0, !dbg !123
  br i1 %5, label %9, label %6, !dbg !124

6:                                                ; preds = %4
  %7 = udiv i32 %1, %3, !dbg !125
  %8 = urem i32 %0, %3, !dbg !126
  br label %9

9:                                                ; preds = %4, %6
  %10 = phi i32 [ %7, %6 ], [ 0, %4 ]
  %11 = phi i32 [ %8, %6 ], [ 0, %4 ], !dbg !127
  %12 = add i32 %10, %2, !dbg !128
  %13 = add i32 %12, %11, !dbg !129
  ret i32 %13, !dbg !130
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_left_signal(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !131 {
  %5 = icmp eq i32 %3, 0, !dbg !132
  br i1 %5, label %9, label %6, !dbg !133

6:                                                ; preds = %4
  %7 = udiv i32 %1, %3, !dbg !134
  %8 = urem i32 %0, %3, !dbg !135
  br label %9

9:                                                ; preds = %4, %6
  %10 = phi i32 [ %7, %6 ], [ 0, %4 ]
  %11 = phi i32 [ %8, %6 ], [ 0, %4 ], !dbg !136
  %12 = add i32 %10, %2, !dbg !137
  %13 = add i32 %12, %11, !dbg !138
  ret i32 %13, !dbg !139
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_right_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !140 {
  %5 = icmp ult i32 %0, %2, !dbg !141
  %6 = add i32 %3, %1, !dbg !142
  %7 = mul i32 %1, 3, !dbg !142
  %8 = select i1 %5, i32 %6, i32 %7, !dbg !142
  ret i32 %8, !dbg !143
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_right_signal(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !144 {
  %5 = icmp ult i32 %0, %2, !dbg !145
  %6 = add i32 %3, %1, !dbg !146
  %7 = mul i32 %1, 3, !dbg !146
  %8 = select i1 %5, i32 %6, i32 %7, !dbg !146
  ret i32 %8, !dbg !147
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_pair_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !148 {
  %5 = icmp ult i32 %0, %1, !dbg !149
  %6 = icmp eq i32 %3, 0, !dbg !150
  br i1 %5, label %7, label %13, !dbg !151

7:                                                ; preds = %4
  br i1 %6, label %10, label %8, !dbg !152

8:                                                ; preds = %7
  %9 = udiv i32 %0, %3, !dbg !153
  br label %10

10:                                               ; preds = %7, %8
  %11 = phi i32 [ %9, %8 ], [ 0, %7 ], !dbg !150
  %12 = add i32 %11, %1, !dbg !154
  br label %19, !dbg !155

13:                                               ; preds = %4
  br i1 %6, label %16, label %14, !dbg !156

14:                                               ; preds = %13
  %15 = urem i32 %1, %3, !dbg !157
  br label %16

16:                                               ; preds = %13, %14
  %17 = phi i32 [ %15, %14 ], [ 0, %13 ], !dbg !150
  %18 = add i32 %17, %0, !dbg !158
  br label %19

19:                                               ; preds = %16, %10
  %20 = phi i32 [ %12, %10 ], [ %18, %16 ], !dbg !150
  ret i32 %20, !dbg !159
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_pair_signal(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !160 {
  %5 = icmp ult i32 %0, %1, !dbg !161
  %6 = icmp eq i32 %3, 0, !dbg !162
  br i1 %5, label %7, label %13, !dbg !163

7:                                                ; preds = %4
  br i1 %6, label %10, label %8, !dbg !164

8:                                                ; preds = %7
  %9 = udiv i32 %0, %3, !dbg !165
  br label %10

10:                                               ; preds = %7, %8
  %11 = phi i32 [ %9, %8 ], [ 0, %7 ], !dbg !162
  %12 = add i32 %11, %1, !dbg !166
  br label %19, !dbg !167

13:                                               ; preds = %4
  br i1 %6, label %16, label %14, !dbg !168

14:                                               ; preds = %13
  %15 = urem i32 %1, %3, !dbg !169
  br label %16

16:                                               ; preds = %13, %14
  %17 = phi i32 [ %15, %14 ], [ 0, %13 ], !dbg !162
  %18 = add i32 %17, %0, !dbg !170
  br label %19

19:                                               ; preds = %16, %10
  %20 = phi i32 [ %12, %10 ], [ %18, %16 ], !dbg !162
  ret i32 %20, !dbg !171
}

; Function Attrs: nofree norecurse nosync nounwind ssp uwtable
define i64 @lang_fn_pipeline38_left_padded_zip_heldout_u32_into([2 x i64] %0, [2 x i64] %1, i32 %2, i32 %3, i32* nocapture %4) local_unnamed_addr #6 !dbg !172 {
  %6 = extractvalue [2 x i64] %0, 0
  %7 = inttoptr i64 %6 to i32*
  %8 = extractvalue [2 x i64] %0, 1
  %9 = icmp eq i64 %8, 0, !dbg !173
  br i1 %9, label %25, label %10, !dbg !174

10:                                               ; preds = %5
  %11 = icmp eq i32 %3, 0
  br i1 %11, label %12, label %26, !dbg !174

12:                                               ; preds = %10, %12
  %13 = phi i64 [ %23, %12 ], [ 0, %10 ]
  %14 = trunc i64 %13 to i32, !dbg !175
  %15 = getelementptr inbounds i32, i32* %7, i64 %13, !dbg !176
  %16 = load i32, i32* %15, align 4, !dbg !177, !tbaa !99
  %17 = icmp ult i32 %14, %2, !dbg !178
  %18 = mul i32 %16, 3, !dbg !179
  %19 = select i1 %17, i32 %16, i32 %18, !dbg !179
  %20 = icmp ugt i32 %19, %2, !dbg !180
  %21 = select i1 %20, i32 %19, i32 %2, !dbg !181
  %22 = getelementptr inbounds i32, i32* %4, i64 %13, !dbg !182
  store i32 %21, i32* %22, align 4, !dbg !183, !tbaa !99
  %23 = add nuw i64 %13, 1, !dbg !184
  %24 = icmp eq i64 %23, %8, !dbg !173
  br i1 %24, label %25, label %12, !dbg !174, !llvm.loop !185

25:                                               ; preds = %46, %12, %5
  ret i64 %8, !dbg !187

26:                                               ; preds = %10, %46
  %27 = phi i64 [ %49, %46 ], [ 0, %10 ]
  %28 = trunc i64 %27 to i32, !dbg !175
  %29 = getelementptr inbounds i32, i32* %7, i64 %27, !dbg !176
  %30 = load i32, i32* %29, align 4, !dbg !176, !tbaa !99
  %31 = udiv i32 %30, %3, !dbg !188
  %32 = urem i32 %28, %3, !dbg !189
  %33 = add i32 %31, %2, !dbg !190
  %34 = add i32 %33, %32, !dbg !191
  %35 = icmp ult i32 %28, %2, !dbg !178
  %36 = add i32 %30, %3, !dbg !179
  %37 = mul i32 %30, 3, !dbg !179
  %38 = select i1 %35, i32 %36, i32 %37, !dbg !179
  %39 = icmp ult i32 %34, %38, !dbg !180
  br i1 %39, label %40, label %43, !dbg !181

40:                                               ; preds = %26
  %41 = udiv i32 %34, %3, !dbg !192
  %42 = add i32 %41, %38, !dbg !193
  br label %46, !dbg !194

43:                                               ; preds = %26
  %44 = urem i32 %38, %3, !dbg !195
  %45 = add i32 %44, %34, !dbg !196
  br label %46

46:                                               ; preds = %43, %40
  %47 = phi i32 [ %42, %40 ], [ %45, %43 ], !dbg !197
  %48 = getelementptr inbounds i32, i32* %4, i64 %27, !dbg !182
  store i32 %47, i32* %48, align 4, !dbg !183, !tbaa !99
  %49 = add nuw i64 %27, 1, !dbg !184
  %50 = icmp eq i64 %49, %8, !dbg !173
  br i1 %50, label %25, label %26, !dbg !174, !llvm.loop !185
}

; Function Attrs: nounwind ssp uwtable
define i64 @ink_compute_into(i32 %0, i8** nocapture readonly %1, i64* nocapture readonly %2, i8* nocapture %3) local_unnamed_addr #0 !dbg !198 {
  %5 = icmp eq i32 %0, 0, !dbg !199
  br i1 %5, label %6, label %90, !dbg !199

6:                                                ; preds = %4
  %7 = bitcast i8** %1 to i32**, !dbg !200
  %8 = load i32*, i32** %7, align 8, !dbg !200, !tbaa !18
  %9 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !201
  %10 = load i8*, i8** %9, align 8, !dbg !201, !tbaa !18
  %11 = load i8, i8* %10, align 1, !dbg !202, !tbaa !205
  %12 = getelementptr inbounds i8, i8* %10, i64 1, !dbg !202
  %13 = load i8, i8* %12, align 1, !dbg !202, !tbaa !205
  %14 = getelementptr inbounds i8, i8* %10, i64 2, !dbg !202
  %15 = load i8, i8* %14, align 1, !dbg !202, !tbaa !205
  %16 = getelementptr inbounds i8, i8* %10, i64 3, !dbg !202
  %17 = load i8, i8* %16, align 1, !dbg !202, !tbaa !205
  %18 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !206
  %19 = load i8*, i8** %18, align 8, !dbg !206, !tbaa !18
  %20 = load i8, i8* %19, align 1, !dbg !207, !tbaa !205
  %21 = getelementptr inbounds i8, i8* %19, i64 1, !dbg !207
  %22 = load i8, i8* %21, align 1, !dbg !207, !tbaa !205
  %23 = getelementptr inbounds i8, i8* %19, i64 2, !dbg !207
  %24 = load i8, i8* %23, align 1, !dbg !207, !tbaa !205
  %25 = getelementptr inbounds i8, i8* %19, i64 3, !dbg !207
  %26 = load i8, i8* %25, align 1, !dbg !207, !tbaa !205
  %27 = load i64, i64* %2, align 8, !dbg !209, !tbaa !210
  %28 = zext i8 %17 to i32, !dbg !212
  %29 = shl nuw i32 %28, 24, !dbg !212
  %30 = zext i8 %15 to i32, !dbg !212
  %31 = shl nuw nsw i32 %30, 16, !dbg !212
  %32 = zext i8 %13 to i32, !dbg !212
  %33 = shl nuw nsw i32 %32, 8, !dbg !212
  %34 = zext i8 %11 to i32, !dbg !212
  %35 = or i32 %33, %34, !dbg !212
  %36 = or i32 %35, %31, !dbg !212
  %37 = or i32 %36, %29, !dbg !212
  %38 = zext i8 %26 to i32, !dbg !213
  %39 = shl nuw i32 %38, 24, !dbg !213
  %40 = zext i8 %24 to i32, !dbg !213
  %41 = shl nuw nsw i32 %40, 16, !dbg !213
  %42 = zext i8 %22 to i32, !dbg !213
  %43 = shl nuw nsw i32 %42, 8, !dbg !213
  %44 = zext i8 %20 to i32, !dbg !213
  %45 = or i32 %43, %44, !dbg !213
  %46 = or i32 %45, %41, !dbg !213
  %47 = or i32 %46, %39, !dbg !213
  %48 = bitcast i8* %3 to i32*, !dbg !213
  %49 = icmp eq i64 %27, 0, !dbg !214
  br i1 %49, label %91, label %50, !dbg !216

50:                                               ; preds = %6
  %51 = icmp eq i32 %47, 0
  br i1 %51, label %52, label %65, !dbg !216

52:                                               ; preds = %50, %52
  %53 = phi i64 [ %63, %52 ], [ 0, %50 ]
  %54 = trunc i64 %53 to i32, !dbg !217
  %55 = getelementptr inbounds i32, i32* %8, i64 %53, !dbg !218
  %56 = load i32, i32* %55, align 4, !dbg !219, !tbaa !99
  %57 = icmp ugt i32 %37, %54, !dbg !220
  %58 = mul i32 %56, 3, !dbg !221
  %59 = select i1 %57, i32 %56, i32 %58, !dbg !221
  %60 = icmp ugt i32 %59, %37, !dbg !222
  %61 = select i1 %60, i32 %59, i32 %37, !dbg !223
  %62 = getelementptr inbounds i32, i32* %48, i64 %53, !dbg !224
  store i32 %61, i32* %62, align 4, !dbg !225, !tbaa !99
  %63 = add nuw i64 %53, 1, !dbg !226
  %64 = icmp eq i64 %63, %27, !dbg !214
  br i1 %64, label %91, label %52, !dbg !216, !llvm.loop !227

65:                                               ; preds = %50, %85
  %66 = phi i64 [ %88, %85 ], [ 0, %50 ]
  %67 = trunc i64 %66 to i32, !dbg !217
  %68 = getelementptr inbounds i32, i32* %8, i64 %66, !dbg !218
  %69 = load i32, i32* %68, align 4, !dbg !218, !tbaa !99
  %70 = udiv i32 %69, %47, !dbg !229
  %71 = urem i32 %67, %47, !dbg !230
  %72 = add i32 %70, %37, !dbg !231
  %73 = add i32 %72, %71, !dbg !232
  %74 = icmp ugt i32 %37, %67, !dbg !220
  %75 = add i32 %69, %47, !dbg !221
  %76 = mul i32 %69, 3, !dbg !221
  %77 = select i1 %74, i32 %75, i32 %76, !dbg !221
  %78 = icmp ult i32 %73, %77, !dbg !222
  br i1 %78, label %79, label %82, !dbg !223

79:                                               ; preds = %65
  %80 = udiv i32 %73, %47, !dbg !233
  %81 = add i32 %80, %77, !dbg !234
  br label %85, !dbg !235

82:                                               ; preds = %65
  %83 = urem i32 %77, %47, !dbg !236
  %84 = add i32 %83, %73, !dbg !237
  br label %85

85:                                               ; preds = %82, %79
  %86 = phi i32 [ %81, %79 ], [ %84, %82 ], !dbg !238
  %87 = getelementptr inbounds i32, i32* %48, i64 %66, !dbg !224
  store i32 %86, i32* %87, align 4, !dbg !225, !tbaa !99
  %88 = add nuw i64 %66, 1, !dbg !226
  %89 = icmp eq i64 %88, %27, !dbg !214
  br i1 %89, label %91, label %65, !dbg !216, !llvm.loop !239

90:                                               ; preds = %4
  tail call fastcc void @ink_fail(), !dbg !240
  unreachable

91:                                               ; preds = %85, %52, %6
  ret i64 %27, !dbg !241
}

; Function Attrs: nounwind ssp uwtable
define void @ink_compute_call(i32 %0, i8** readonly %1, i64* nocapture readonly %2, i8** nocapture %3, i64* nocapture %4) local_unnamed_addr #0 !dbg !242 {
  switch i32 %0, label %591 [
    i32 0, label %6
    i32 1, label %55
    i32 2, label %150
    i32 3, label %245
    i32 4, label %335
    i32 5, label %425
    i32 6, label %508
  ], !dbg !243

6:                                                ; preds = %5
  %7 = bitcast i8** %1 to i32**, !dbg !244
  %8 = load i32*, i32** %7, align 8, !dbg !244, !tbaa !18
  %9 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !245
  %10 = load i8*, i8** %9, align 8, !dbg !245, !tbaa !18
  %11 = load i8, i8* %10, align 1, !dbg !246, !tbaa !205
  %12 = getelementptr inbounds i8, i8* %10, i64 1, !dbg !246
  %13 = load i8, i8* %12, align 1, !dbg !246, !tbaa !205
  %14 = getelementptr inbounds i8, i8* %10, i64 2, !dbg !246
  %15 = load i8, i8* %14, align 1, !dbg !246, !tbaa !205
  %16 = getelementptr inbounds i8, i8* %10, i64 3, !dbg !246
  %17 = load i8, i8* %16, align 1, !dbg !246, !tbaa !205
  %18 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !248
  %19 = load i8*, i8** %18, align 8, !dbg !248, !tbaa !18
  %20 = load i8, i8* %19, align 1, !dbg !249, !tbaa !205
  %21 = getelementptr inbounds i8, i8* %19, i64 1, !dbg !249
  %22 = load i8, i8* %21, align 1, !dbg !249, !tbaa !205
  %23 = getelementptr inbounds i8, i8* %19, i64 2, !dbg !249
  %24 = load i8, i8* %23, align 1, !dbg !249, !tbaa !205
  %25 = getelementptr inbounds i8, i8* %19, i64 3, !dbg !249
  %26 = load i8, i8* %25, align 1, !dbg !249, !tbaa !205
  %27 = load i64, i64* %2, align 8, !dbg !251, !tbaa !210
  %28 = zext i8 %17 to i32, !dbg !252
  %29 = shl nuw i32 %28, 24, !dbg !252
  %30 = zext i8 %15 to i32, !dbg !252
  %31 = shl nuw nsw i32 %30, 16, !dbg !252
  %32 = zext i8 %13 to i32, !dbg !252
  %33 = shl nuw nsw i32 %32, 8, !dbg !252
  %34 = zext i8 %11 to i32, !dbg !252
  %35 = or i32 %33, %34, !dbg !252
  %36 = or i32 %35, %31, !dbg !252
  %37 = or i32 %36, %29, !dbg !252
  %38 = zext i8 %26 to i32, !dbg !253
  %39 = shl nuw i32 %38, 24, !dbg !253
  %40 = zext i8 %24 to i32, !dbg !253
  %41 = shl nuw nsw i32 %40, 16, !dbg !253
  %42 = zext i8 %22 to i32, !dbg !253
  %43 = shl nuw nsw i32 %42, 8, !dbg !253
  %44 = zext i8 %20 to i32, !dbg !253
  %45 = or i32 %43, %44, !dbg !253
  %46 = or i32 %45, %41, !dbg !253
  %47 = or i32 %46, %39, !dbg !253
  %48 = ptrtoint i32* %8 to i64, !dbg !253
  %49 = insertvalue [2 x i64] undef, i64 %48, 0, !dbg !253
  %50 = insertvalue [2 x i64] %49, i64 %27, 1, !dbg !253
  %51 = tail call [2 x i64] @lang_fn_pipeline38_left_padded_zip_heldout_u32([2 x i64] %50, [2 x i64] undef, i32 %37, i32 %47), !dbg !253
  %52 = extractvalue [2 x i64] %51, 0, !dbg !253
  %53 = extractvalue [2 x i64] %51, 1, !dbg !253
  %54 = inttoptr i64 %52 to i8*, !dbg !254
  store i8* %54, i8** %3, align 8, !dbg !255, !tbaa !18
  br label %592

55:                                               ; preds = %5
  %56 = load i8*, i8** %1, align 8, !dbg !256, !tbaa !18
  %57 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !257
  %58 = load i8*, i8** %57, align 8, !dbg !257, !tbaa !18
  %59 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !258
  %60 = load i8*, i8** %59, align 8, !dbg !258, !tbaa !18
  %61 = load i8, i8* %60, align 1, !dbg !259, !tbaa !205
  %62 = getelementptr inbounds i8, i8* %60, i64 1, !dbg !259
  %63 = load i8, i8* %62, align 1, !dbg !259, !tbaa !205
  %64 = getelementptr inbounds i8, i8* %60, i64 2, !dbg !259
  %65 = load i8, i8* %64, align 1, !dbg !259, !tbaa !205
  %66 = getelementptr inbounds i8, i8* %60, i64 3, !dbg !259
  %67 = load i8, i8* %66, align 1, !dbg !259, !tbaa !205
  %68 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !261
  %69 = load i8*, i8** %68, align 8, !dbg !261, !tbaa !18
  %70 = load i8, i8* %69, align 1, !dbg !262, !tbaa !205
  %71 = getelementptr inbounds i8, i8* %69, i64 1, !dbg !262
  %72 = load i8, i8* %71, align 1, !dbg !262, !tbaa !205
  %73 = getelementptr inbounds i8, i8* %69, i64 2, !dbg !262
  %74 = load i8, i8* %73, align 1, !dbg !262, !tbaa !205
  %75 = getelementptr inbounds i8, i8* %69, i64 3, !dbg !262
  %76 = load i8, i8* %75, align 1, !dbg !262, !tbaa !205
  %77 = zext i8 %67 to i32, !dbg !264
  %78 = shl nuw i32 %77, 24, !dbg !264
  %79 = zext i8 %65 to i32, !dbg !264
  %80 = shl nuw nsw i32 %79, 16, !dbg !264
  %81 = zext i8 %63 to i32, !dbg !264
  %82 = shl nuw nsw i32 %81, 8, !dbg !264
  %83 = zext i8 %61 to i32, !dbg !264
  %84 = or i32 %82, %83, !dbg !264
  %85 = or i32 %84, %80, !dbg !264
  %86 = or i32 %85, %78, !dbg !264
  %87 = zext i8 %76 to i32, !dbg !265
  %88 = shl nuw i32 %87, 24, !dbg !265
  %89 = zext i8 %74 to i32, !dbg !265
  %90 = shl nuw nsw i32 %89, 16, !dbg !265
  %91 = zext i8 %72 to i32, !dbg !265
  %92 = shl nuw nsw i32 %91, 8, !dbg !265
  %93 = zext i8 %70 to i32, !dbg !265
  %94 = or i32 %92, %93, !dbg !265
  %95 = or i32 %94, %90, !dbg !265
  %96 = or i32 %95, %88, !dbg !265
  %97 = icmp eq i32 %96, 0, !dbg !265
  br i1 %97, label %135, label %98, !dbg !267

98:                                               ; preds = %55
  %99 = getelementptr inbounds i8, i8* %58, i64 3, !dbg !268
  %100 = load i8, i8* %99, align 1, !dbg !268, !tbaa !205
  %101 = zext i8 %100 to i32, !dbg !270
  %102 = shl nuw i32 %101, 24, !dbg !270
  %103 = getelementptr inbounds i8, i8* %58, i64 2, !dbg !268
  %104 = load i8, i8* %103, align 1, !dbg !268, !tbaa !205
  %105 = zext i8 %104 to i32, !dbg !270
  %106 = shl nuw nsw i32 %105, 16, !dbg !270
  %107 = or i32 %106, %102, !dbg !270
  %108 = getelementptr inbounds i8, i8* %58, i64 1, !dbg !268
  %109 = load i8, i8* %108, align 1, !dbg !268, !tbaa !205
  %110 = zext i8 %109 to i32, !dbg !270
  %111 = shl nuw nsw i32 %110, 8, !dbg !270
  %112 = or i32 %107, %111, !dbg !270
  %113 = load i8, i8* %58, align 1, !dbg !268, !tbaa !205
  %114 = zext i8 %113 to i32, !dbg !270
  %115 = or i32 %112, %114, !dbg !270
  %116 = getelementptr inbounds i8, i8* %56, i64 3, !dbg !271
  %117 = load i8, i8* %116, align 1, !dbg !271, !tbaa !205
  %118 = zext i8 %117 to i32, !dbg !273
  %119 = shl nuw i32 %118, 24, !dbg !273
  %120 = getelementptr inbounds i8, i8* %56, i64 2, !dbg !271
  %121 = load i8, i8* %120, align 1, !dbg !271, !tbaa !205
  %122 = zext i8 %121 to i32, !dbg !273
  %123 = shl nuw nsw i32 %122, 16, !dbg !273
  %124 = or i32 %123, %119, !dbg !273
  %125 = getelementptr inbounds i8, i8* %56, i64 1, !dbg !271
  %126 = load i8, i8* %125, align 1, !dbg !271, !tbaa !205
  %127 = zext i8 %126 to i32, !dbg !273
  %128 = shl nuw nsw i32 %127, 8, !dbg !273
  %129 = or i32 %124, %128, !dbg !273
  %130 = load i8, i8* %56, align 1, !dbg !271, !tbaa !205
  %131 = zext i8 %130 to i32, !dbg !273
  %132 = or i32 %129, %131, !dbg !273
  %133 = udiv i32 %115, %96, !dbg !274
  %134 = urem i32 %132, %96, !dbg !275
  br label %135

135:                                              ; preds = %55, %98
  %136 = phi i32 [ %133, %98 ], [ 0, %55 ]
  %137 = phi i32 [ %134, %98 ], [ 0, %55 ], !dbg !276
  %138 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !277
  %139 = bitcast i8* %138 to %struct.ink_block*, !dbg !277
  %140 = icmp eq i8* %138, null, !dbg !279
  br i1 %140, label %141, label %142, !dbg !280

141:                                              ; preds = %135
  tail call fastcc void @ink_fail() #11, !dbg !281
  unreachable

142:                                              ; preds = %135
  %143 = add i32 %136, %86, !dbg !282
  %144 = add i32 %143, %137, !dbg !283
  %145 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !284, !tbaa !18
  %146 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %139, i64 0, i32 0, !dbg !285
  store %struct.ink_block* %145, %struct.ink_block** %146, align 8, !dbg !286, !tbaa !24
  store i8* %138, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !287, !tbaa !18
  %147 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %139, i64 1, !dbg !288
  %148 = bitcast %struct.ink_block* %147 to i32*, !dbg !289
  store i32 %144, i32* %148, align 4, !dbg !290, !tbaa !99
  %149 = bitcast i8** %3 to %struct.ink_block**, !dbg !291
  store %struct.ink_block* %147, %struct.ink_block** %149, align 8, !dbg !291, !tbaa !18
  br label %592

150:                                              ; preds = %5
  %151 = load i8*, i8** %1, align 8, !dbg !292, !tbaa !18
  %152 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !293
  %153 = load i8*, i8** %152, align 8, !dbg !293, !tbaa !18
  %154 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !294
  %155 = load i8*, i8** %154, align 8, !dbg !294, !tbaa !18
  %156 = load i8, i8* %155, align 1, !dbg !295, !tbaa !205
  %157 = getelementptr inbounds i8, i8* %155, i64 1, !dbg !295
  %158 = load i8, i8* %157, align 1, !dbg !295, !tbaa !205
  %159 = getelementptr inbounds i8, i8* %155, i64 2, !dbg !295
  %160 = load i8, i8* %159, align 1, !dbg !295, !tbaa !205
  %161 = getelementptr inbounds i8, i8* %155, i64 3, !dbg !295
  %162 = load i8, i8* %161, align 1, !dbg !295, !tbaa !205
  %163 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !297
  %164 = load i8*, i8** %163, align 8, !dbg !297, !tbaa !18
  %165 = load i8, i8* %164, align 1, !dbg !298, !tbaa !205
  %166 = getelementptr inbounds i8, i8* %164, i64 1, !dbg !298
  %167 = load i8, i8* %166, align 1, !dbg !298, !tbaa !205
  %168 = getelementptr inbounds i8, i8* %164, i64 2, !dbg !298
  %169 = load i8, i8* %168, align 1, !dbg !298, !tbaa !205
  %170 = getelementptr inbounds i8, i8* %164, i64 3, !dbg !298
  %171 = load i8, i8* %170, align 1, !dbg !298, !tbaa !205
  %172 = zext i8 %162 to i32, !dbg !300
  %173 = shl nuw i32 %172, 24, !dbg !300
  %174 = zext i8 %160 to i32, !dbg !300
  %175 = shl nuw nsw i32 %174, 16, !dbg !300
  %176 = zext i8 %158 to i32, !dbg !300
  %177 = shl nuw nsw i32 %176, 8, !dbg !300
  %178 = zext i8 %156 to i32, !dbg !300
  %179 = or i32 %177, %178, !dbg !300
  %180 = or i32 %179, %175, !dbg !300
  %181 = or i32 %180, %173, !dbg !300
  %182 = zext i8 %171 to i32, !dbg !301
  %183 = shl nuw i32 %182, 24, !dbg !301
  %184 = zext i8 %169 to i32, !dbg !301
  %185 = shl nuw nsw i32 %184, 16, !dbg !301
  %186 = zext i8 %167 to i32, !dbg !301
  %187 = shl nuw nsw i32 %186, 8, !dbg !301
  %188 = zext i8 %165 to i32, !dbg !301
  %189 = or i32 %187, %188, !dbg !301
  %190 = or i32 %189, %185, !dbg !301
  %191 = or i32 %190, %183, !dbg !301
  %192 = icmp eq i32 %191, 0, !dbg !301
  br i1 %192, label %230, label %193, !dbg !303

193:                                              ; preds = %150
  %194 = getelementptr inbounds i8, i8* %153, i64 3, !dbg !304
  %195 = load i8, i8* %194, align 1, !dbg !304, !tbaa !205
  %196 = zext i8 %195 to i32, !dbg !306
  %197 = shl nuw i32 %196, 24, !dbg !306
  %198 = getelementptr inbounds i8, i8* %153, i64 2, !dbg !304
  %199 = load i8, i8* %198, align 1, !dbg !304, !tbaa !205
  %200 = zext i8 %199 to i32, !dbg !306
  %201 = shl nuw nsw i32 %200, 16, !dbg !306
  %202 = or i32 %201, %197, !dbg !306
  %203 = getelementptr inbounds i8, i8* %153, i64 1, !dbg !304
  %204 = load i8, i8* %203, align 1, !dbg !304, !tbaa !205
  %205 = zext i8 %204 to i32, !dbg !306
  %206 = shl nuw nsw i32 %205, 8, !dbg !306
  %207 = or i32 %202, %206, !dbg !306
  %208 = load i8, i8* %153, align 1, !dbg !304, !tbaa !205
  %209 = zext i8 %208 to i32, !dbg !306
  %210 = or i32 %207, %209, !dbg !306
  %211 = getelementptr inbounds i8, i8* %151, i64 3, !dbg !307
  %212 = load i8, i8* %211, align 1, !dbg !307, !tbaa !205
  %213 = zext i8 %212 to i32, !dbg !309
  %214 = shl nuw i32 %213, 24, !dbg !309
  %215 = getelementptr inbounds i8, i8* %151, i64 2, !dbg !307
  %216 = load i8, i8* %215, align 1, !dbg !307, !tbaa !205
  %217 = zext i8 %216 to i32, !dbg !309
  %218 = shl nuw nsw i32 %217, 16, !dbg !309
  %219 = or i32 %218, %214, !dbg !309
  %220 = getelementptr inbounds i8, i8* %151, i64 1, !dbg !307
  %221 = load i8, i8* %220, align 1, !dbg !307, !tbaa !205
  %222 = zext i8 %221 to i32, !dbg !309
  %223 = shl nuw nsw i32 %222, 8, !dbg !309
  %224 = or i32 %219, %223, !dbg !309
  %225 = load i8, i8* %151, align 1, !dbg !307, !tbaa !205
  %226 = zext i8 %225 to i32, !dbg !309
  %227 = or i32 %224, %226, !dbg !309
  %228 = udiv i32 %210, %191, !dbg !310
  %229 = urem i32 %227, %191, !dbg !311
  br label %230

230:                                              ; preds = %150, %193
  %231 = phi i32 [ %228, %193 ], [ 0, %150 ]
  %232 = phi i32 [ %229, %193 ], [ 0, %150 ], !dbg !312
  %233 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !313
  %234 = bitcast i8* %233 to %struct.ink_block*, !dbg !313
  %235 = icmp eq i8* %233, null, !dbg !315
  br i1 %235, label %236, label %237, !dbg !316

236:                                              ; preds = %230
  tail call fastcc void @ink_fail() #11, !dbg !317
  unreachable

237:                                              ; preds = %230
  %238 = add i32 %231, %181, !dbg !318
  %239 = add i32 %238, %232, !dbg !319
  %240 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !320, !tbaa !18
  %241 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %234, i64 0, i32 0, !dbg !321
  store %struct.ink_block* %240, %struct.ink_block** %241, align 8, !dbg !322, !tbaa !24
  store i8* %233, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !323, !tbaa !18
  %242 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %234, i64 1, !dbg !324
  %243 = bitcast %struct.ink_block* %242 to i32*, !dbg !325
  store i32 %239, i32* %243, align 4, !dbg !326, !tbaa !99
  %244 = bitcast i8** %3 to %struct.ink_block**, !dbg !327
  store %struct.ink_block* %242, %struct.ink_block** %244, align 8, !dbg !327, !tbaa !18
  br label %592

245:                                              ; preds = %5
  %246 = load i8*, i8** %1, align 8, !dbg !328, !tbaa !18
  %247 = load i8, i8* %246, align 1, !dbg !329, !tbaa !205
  %248 = getelementptr inbounds i8, i8* %246, i64 1, !dbg !329
  %249 = load i8, i8* %248, align 1, !dbg !329, !tbaa !205
  %250 = getelementptr inbounds i8, i8* %246, i64 2, !dbg !329
  %251 = load i8, i8* %250, align 1, !dbg !329, !tbaa !205
  %252 = getelementptr inbounds i8, i8* %246, i64 3, !dbg !329
  %253 = load i8, i8* %252, align 1, !dbg !329, !tbaa !205
  %254 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !331
  %255 = load i8*, i8** %254, align 8, !dbg !331, !tbaa !18
  %256 = load i8, i8* %255, align 1, !dbg !332, !tbaa !205
  %257 = getelementptr inbounds i8, i8* %255, i64 1, !dbg !332
  %258 = load i8, i8* %257, align 1, !dbg !332, !tbaa !205
  %259 = getelementptr inbounds i8, i8* %255, i64 2, !dbg !332
  %260 = load i8, i8* %259, align 1, !dbg !332, !tbaa !205
  %261 = getelementptr inbounds i8, i8* %255, i64 3, !dbg !332
  %262 = load i8, i8* %261, align 1, !dbg !332, !tbaa !205
  %263 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !334
  %264 = load i8*, i8** %263, align 8, !dbg !334, !tbaa !18
  %265 = load i8, i8* %264, align 1, !dbg !335, !tbaa !205
  %266 = getelementptr inbounds i8, i8* %264, i64 1, !dbg !335
  %267 = load i8, i8* %266, align 1, !dbg !335, !tbaa !205
  %268 = getelementptr inbounds i8, i8* %264, i64 2, !dbg !335
  %269 = load i8, i8* %268, align 1, !dbg !335, !tbaa !205
  %270 = getelementptr inbounds i8, i8* %264, i64 3, !dbg !335
  %271 = load i8, i8* %270, align 1, !dbg !335, !tbaa !205
  %272 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !337
  %273 = load i8*, i8** %272, align 8, !dbg !337, !tbaa !18
  %274 = load i8, i8* %273, align 1, !dbg !338, !tbaa !205
  %275 = getelementptr inbounds i8, i8* %273, i64 1, !dbg !338
  %276 = load i8, i8* %275, align 1, !dbg !338, !tbaa !205
  %277 = getelementptr inbounds i8, i8* %273, i64 2, !dbg !338
  %278 = load i8, i8* %277, align 1, !dbg !338, !tbaa !205
  %279 = getelementptr inbounds i8, i8* %273, i64 3, !dbg !338
  %280 = load i8, i8* %279, align 1, !dbg !338, !tbaa !205
  %281 = zext i8 %262 to i32, !dbg !340
  %282 = shl nuw i32 %281, 24, !dbg !340
  %283 = zext i8 %260 to i32, !dbg !340
  %284 = shl nuw nsw i32 %283, 16, !dbg !340
  %285 = zext i8 %258 to i32, !dbg !340
  %286 = shl nuw nsw i32 %285, 8, !dbg !340
  %287 = zext i8 %256 to i32, !dbg !340
  %288 = or i32 %286, %287, !dbg !340
  %289 = or i32 %288, %284, !dbg !340
  %290 = or i32 %289, %282, !dbg !340
  %291 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !341
  %292 = bitcast i8* %291 to %struct.ink_block*, !dbg !341
  %293 = icmp eq i8* %291, null, !dbg !343
  br i1 %293, label %294, label %295, !dbg !344

294:                                              ; preds = %245
  tail call fastcc void @ink_fail() #11, !dbg !345
  unreachable

295:                                              ; preds = %245
  %296 = zext i8 %253 to i32, !dbg !346
  %297 = shl nuw i32 %296, 24, !dbg !346
  %298 = zext i8 %251 to i32, !dbg !346
  %299 = shl nuw nsw i32 %298, 16, !dbg !346
  %300 = zext i8 %249 to i32, !dbg !346
  %301 = shl nuw nsw i32 %300, 8, !dbg !346
  %302 = zext i8 %247 to i32, !dbg !346
  %303 = or i32 %301, %302, !dbg !346
  %304 = or i32 %303, %299, !dbg !346
  %305 = or i32 %304, %297, !dbg !346
  %306 = zext i8 %271 to i32, !dbg !347
  %307 = shl nuw i32 %306, 24, !dbg !347
  %308 = zext i8 %269 to i32, !dbg !347
  %309 = shl nuw nsw i32 %308, 16, !dbg !347
  %310 = zext i8 %267 to i32, !dbg !347
  %311 = shl nuw nsw i32 %310, 8, !dbg !347
  %312 = zext i8 %265 to i32, !dbg !347
  %313 = or i32 %311, %312, !dbg !347
  %314 = or i32 %313, %309, !dbg !347
  %315 = or i32 %314, %307, !dbg !347
  %316 = icmp ult i32 %305, %315, !dbg !348
  %317 = zext i8 %280 to i32, !dbg !348
  %318 = shl nuw i32 %317, 24, !dbg !348
  %319 = zext i8 %278 to i32, !dbg !348
  %320 = shl nuw nsw i32 %319, 16, !dbg !348
  %321 = zext i8 %276 to i32, !dbg !348
  %322 = shl nuw nsw i32 %321, 8, !dbg !348
  %323 = zext i8 %274 to i32, !dbg !348
  %324 = or i32 %322, %323, !dbg !348
  %325 = or i32 %324, %320, !dbg !348
  %326 = or i32 %325, %318, !dbg !348
  %327 = add i32 %326, %290, !dbg !350
  %328 = mul i32 %290, 3, !dbg !350
  %329 = select i1 %316, i32 %327, i32 %328, !dbg !350
  %330 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !351, !tbaa !18
  %331 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %292, i64 0, i32 0, !dbg !352
  store %struct.ink_block* %330, %struct.ink_block** %331, align 8, !dbg !353, !tbaa !24
  store i8* %291, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !354, !tbaa !18
  %332 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %292, i64 1, !dbg !355
  %333 = bitcast %struct.ink_block* %332 to i32*, !dbg !356
  store i32 %329, i32* %333, align 4, !dbg !357, !tbaa !99
  %334 = bitcast i8** %3 to %struct.ink_block**, !dbg !358
  store %struct.ink_block* %332, %struct.ink_block** %334, align 8, !dbg !358, !tbaa !18
  br label %592

335:                                              ; preds = %5
  %336 = load i8*, i8** %1, align 8, !dbg !359, !tbaa !18
  %337 = load i8, i8* %336, align 1, !dbg !360, !tbaa !205
  %338 = getelementptr inbounds i8, i8* %336, i64 1, !dbg !360
  %339 = load i8, i8* %338, align 1, !dbg !360, !tbaa !205
  %340 = getelementptr inbounds i8, i8* %336, i64 2, !dbg !360
  %341 = load i8, i8* %340, align 1, !dbg !360, !tbaa !205
  %342 = getelementptr inbounds i8, i8* %336, i64 3, !dbg !360
  %343 = load i8, i8* %342, align 1, !dbg !360, !tbaa !205
  %344 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !362
  %345 = load i8*, i8** %344, align 8, !dbg !362, !tbaa !18
  %346 = load i8, i8* %345, align 1, !dbg !363, !tbaa !205
  %347 = getelementptr inbounds i8, i8* %345, i64 1, !dbg !363
  %348 = load i8, i8* %347, align 1, !dbg !363, !tbaa !205
  %349 = getelementptr inbounds i8, i8* %345, i64 2, !dbg !363
  %350 = load i8, i8* %349, align 1, !dbg !363, !tbaa !205
  %351 = getelementptr inbounds i8, i8* %345, i64 3, !dbg !363
  %352 = load i8, i8* %351, align 1, !dbg !363, !tbaa !205
  %353 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !365
  %354 = load i8*, i8** %353, align 8, !dbg !365, !tbaa !18
  %355 = load i8, i8* %354, align 1, !dbg !366, !tbaa !205
  %356 = getelementptr inbounds i8, i8* %354, i64 1, !dbg !366
  %357 = load i8, i8* %356, align 1, !dbg !366, !tbaa !205
  %358 = getelementptr inbounds i8, i8* %354, i64 2, !dbg !366
  %359 = load i8, i8* %358, align 1, !dbg !366, !tbaa !205
  %360 = getelementptr inbounds i8, i8* %354, i64 3, !dbg !366
  %361 = load i8, i8* %360, align 1, !dbg !366, !tbaa !205
  %362 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !368
  %363 = load i8*, i8** %362, align 8, !dbg !368, !tbaa !18
  %364 = load i8, i8* %363, align 1, !dbg !369, !tbaa !205
  %365 = getelementptr inbounds i8, i8* %363, i64 1, !dbg !369
  %366 = load i8, i8* %365, align 1, !dbg !369, !tbaa !205
  %367 = getelementptr inbounds i8, i8* %363, i64 2, !dbg !369
  %368 = load i8, i8* %367, align 1, !dbg !369, !tbaa !205
  %369 = getelementptr inbounds i8, i8* %363, i64 3, !dbg !369
  %370 = load i8, i8* %369, align 1, !dbg !369, !tbaa !205
  %371 = zext i8 %352 to i32, !dbg !371
  %372 = shl nuw i32 %371, 24, !dbg !371
  %373 = zext i8 %350 to i32, !dbg !371
  %374 = shl nuw nsw i32 %373, 16, !dbg !371
  %375 = zext i8 %348 to i32, !dbg !371
  %376 = shl nuw nsw i32 %375, 8, !dbg !371
  %377 = zext i8 %346 to i32, !dbg !371
  %378 = or i32 %376, %377, !dbg !371
  %379 = or i32 %378, %374, !dbg !371
  %380 = or i32 %379, %372, !dbg !371
  %381 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !372
  %382 = bitcast i8* %381 to %struct.ink_block*, !dbg !372
  %383 = icmp eq i8* %381, null, !dbg !374
  br i1 %383, label %384, label %385, !dbg !375

384:                                              ; preds = %335
  tail call fastcc void @ink_fail() #11, !dbg !376
  unreachable

385:                                              ; preds = %335
  %386 = zext i8 %343 to i32, !dbg !377
  %387 = shl nuw i32 %386, 24, !dbg !377
  %388 = zext i8 %341 to i32, !dbg !377
  %389 = shl nuw nsw i32 %388, 16, !dbg !377
  %390 = zext i8 %339 to i32, !dbg !377
  %391 = shl nuw nsw i32 %390, 8, !dbg !377
  %392 = zext i8 %337 to i32, !dbg !377
  %393 = or i32 %391, %392, !dbg !377
  %394 = or i32 %393, %389, !dbg !377
  %395 = or i32 %394, %387, !dbg !377
  %396 = zext i8 %361 to i32, !dbg !378
  %397 = shl nuw i32 %396, 24, !dbg !378
  %398 = zext i8 %359 to i32, !dbg !378
  %399 = shl nuw nsw i32 %398, 16, !dbg !378
  %400 = zext i8 %357 to i32, !dbg !378
  %401 = shl nuw nsw i32 %400, 8, !dbg !378
  %402 = zext i8 %355 to i32, !dbg !378
  %403 = or i32 %401, %402, !dbg !378
  %404 = or i32 %403, %399, !dbg !378
  %405 = or i32 %404, %397, !dbg !378
  %406 = icmp ult i32 %395, %405, !dbg !379
  %407 = zext i8 %370 to i32, !dbg !379
  %408 = shl nuw i32 %407, 24, !dbg !379
  %409 = zext i8 %368 to i32, !dbg !379
  %410 = shl nuw nsw i32 %409, 16, !dbg !379
  %411 = zext i8 %366 to i32, !dbg !379
  %412 = shl nuw nsw i32 %411, 8, !dbg !379
  %413 = zext i8 %364 to i32, !dbg !379
  %414 = or i32 %412, %413, !dbg !379
  %415 = or i32 %414, %410, !dbg !379
  %416 = or i32 %415, %408, !dbg !379
  %417 = add i32 %416, %380, !dbg !381
  %418 = mul i32 %380, 3, !dbg !381
  %419 = select i1 %406, i32 %417, i32 %418, !dbg !381
  %420 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !382, !tbaa !18
  %421 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %382, i64 0, i32 0, !dbg !383
  store %struct.ink_block* %420, %struct.ink_block** %421, align 8, !dbg !384, !tbaa !24
  store i8* %381, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !385, !tbaa !18
  %422 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %382, i64 1, !dbg !386
  %423 = bitcast %struct.ink_block* %422 to i32*, !dbg !387
  store i32 %419, i32* %423, align 4, !dbg !388, !tbaa !99
  %424 = bitcast i8** %3 to %struct.ink_block**, !dbg !389
  store %struct.ink_block* %422, %struct.ink_block** %424, align 8, !dbg !389, !tbaa !18
  br label %592

425:                                              ; preds = %5
  %426 = load i8*, i8** %1, align 8, !dbg !390, !tbaa !18
  %427 = load i8, i8* %426, align 1, !dbg !391, !tbaa !205
  %428 = getelementptr inbounds i8, i8* %426, i64 1, !dbg !391
  %429 = load i8, i8* %428, align 1, !dbg !391, !tbaa !205
  %430 = getelementptr inbounds i8, i8* %426, i64 2, !dbg !391
  %431 = load i8, i8* %430, align 1, !dbg !391, !tbaa !205
  %432 = getelementptr inbounds i8, i8* %426, i64 3, !dbg !391
  %433 = load i8, i8* %432, align 1, !dbg !391, !tbaa !205
  %434 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !393
  %435 = load i8*, i8** %434, align 8, !dbg !393, !tbaa !18
  %436 = load i8, i8* %435, align 1, !dbg !394, !tbaa !205
  %437 = getelementptr inbounds i8, i8* %435, i64 1, !dbg !394
  %438 = load i8, i8* %437, align 1, !dbg !394, !tbaa !205
  %439 = getelementptr inbounds i8, i8* %435, i64 2, !dbg !394
  %440 = load i8, i8* %439, align 1, !dbg !394, !tbaa !205
  %441 = getelementptr inbounds i8, i8* %435, i64 3, !dbg !394
  %442 = load i8, i8* %441, align 1, !dbg !394, !tbaa !205
  %443 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !396
  %444 = load i8*, i8** %443, align 8, !dbg !396, !tbaa !18
  %445 = load i8, i8* %444, align 1, !dbg !397, !tbaa !205
  %446 = getelementptr inbounds i8, i8* %444, i64 1, !dbg !397
  %447 = load i8, i8* %446, align 1, !dbg !397, !tbaa !205
  %448 = getelementptr inbounds i8, i8* %444, i64 2, !dbg !397
  %449 = load i8, i8* %448, align 1, !dbg !397, !tbaa !205
  %450 = getelementptr inbounds i8, i8* %444, i64 3, !dbg !397
  %451 = load i8, i8* %450, align 1, !dbg !397, !tbaa !205
  %452 = zext i8 %433 to i32, !dbg !399
  %453 = shl nuw i32 %452, 24, !dbg !399
  %454 = zext i8 %431 to i32, !dbg !399
  %455 = shl nuw nsw i32 %454, 16, !dbg !399
  %456 = zext i8 %429 to i32, !dbg !399
  %457 = shl nuw nsw i32 %456, 8, !dbg !399
  %458 = zext i8 %427 to i32, !dbg !399
  %459 = or i32 %457, %458, !dbg !399
  %460 = or i32 %459, %455, !dbg !399
  %461 = or i32 %460, %453, !dbg !399
  %462 = zext i8 %442 to i32, !dbg !400
  %463 = shl nuw i32 %462, 24, !dbg !400
  %464 = zext i8 %440 to i32, !dbg !400
  %465 = shl nuw nsw i32 %464, 16, !dbg !400
  %466 = zext i8 %438 to i32, !dbg !400
  %467 = shl nuw nsw i32 %466, 8, !dbg !400
  %468 = zext i8 %436 to i32, !dbg !400
  %469 = or i32 %467, %468, !dbg !400
  %470 = or i32 %469, %465, !dbg !400
  %471 = or i32 %470, %463, !dbg !400
  %472 = zext i8 %451 to i32, !dbg !401
  %473 = shl nuw i32 %472, 24, !dbg !401
  %474 = zext i8 %449 to i32, !dbg !401
  %475 = shl nuw nsw i32 %474, 16, !dbg !401
  %476 = zext i8 %447 to i32, !dbg !401
  %477 = shl nuw nsw i32 %476, 8, !dbg !401
  %478 = zext i8 %445 to i32, !dbg !401
  %479 = or i32 %477, %478, !dbg !401
  %480 = or i32 %479, %475, !dbg !401
  %481 = or i32 %480, %473, !dbg !401
  %482 = icmp ult i32 %461, %471, !dbg !401
  %483 = icmp eq i32 %481, 0, !dbg !403
  br i1 %482, label %484, label %490, !dbg !404

484:                                              ; preds = %425
  br i1 %483, label %487, label %485, !dbg !405

485:                                              ; preds = %484
  %486 = udiv i32 %461, %481, !dbg !406
  br label %487

487:                                              ; preds = %485, %484
  %488 = phi i32 [ %486, %485 ], [ 0, %484 ], !dbg !403
  %489 = add i32 %488, %471, !dbg !407
  br label %496, !dbg !408

490:                                              ; preds = %425
  br i1 %483, label %493, label %491, !dbg !409

491:                                              ; preds = %490
  %492 = urem i32 %471, %481, !dbg !410
  br label %493

493:                                              ; preds = %491, %490
  %494 = phi i32 [ %492, %491 ], [ 0, %490 ], !dbg !403
  %495 = add i32 %494, %461, !dbg !411
  br label %496

496:                                              ; preds = %487, %493
  %497 = phi i32 [ %489, %487 ], [ %495, %493 ], !dbg !403
  %498 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !412
  %499 = bitcast i8* %498 to %struct.ink_block*, !dbg !412
  %500 = icmp eq i8* %498, null, !dbg !414
  br i1 %500, label %501, label %502, !dbg !415

501:                                              ; preds = %496
  tail call fastcc void @ink_fail() #11, !dbg !416
  unreachable

502:                                              ; preds = %496
  %503 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !417, !tbaa !18
  %504 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %499, i64 0, i32 0, !dbg !418
  store %struct.ink_block* %503, %struct.ink_block** %504, align 8, !dbg !419, !tbaa !24
  store i8* %498, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !420, !tbaa !18
  %505 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %499, i64 1, !dbg !421
  %506 = bitcast %struct.ink_block* %505 to i32*, !dbg !422
  store i32 %497, i32* %506, align 4, !dbg !423, !tbaa !99
  %507 = bitcast i8** %3 to %struct.ink_block**, !dbg !424
  store %struct.ink_block* %505, %struct.ink_block** %507, align 8, !dbg !424, !tbaa !18
  br label %592

508:                                              ; preds = %5
  %509 = load i8*, i8** %1, align 8, !dbg !425, !tbaa !18
  %510 = load i8, i8* %509, align 1, !dbg !426, !tbaa !205
  %511 = getelementptr inbounds i8, i8* %509, i64 1, !dbg !426
  %512 = load i8, i8* %511, align 1, !dbg !426, !tbaa !205
  %513 = getelementptr inbounds i8, i8* %509, i64 2, !dbg !426
  %514 = load i8, i8* %513, align 1, !dbg !426, !tbaa !205
  %515 = getelementptr inbounds i8, i8* %509, i64 3, !dbg !426
  %516 = load i8, i8* %515, align 1, !dbg !426, !tbaa !205
  %517 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !428
  %518 = load i8*, i8** %517, align 8, !dbg !428, !tbaa !18
  %519 = load i8, i8* %518, align 1, !dbg !429, !tbaa !205
  %520 = getelementptr inbounds i8, i8* %518, i64 1, !dbg !429
  %521 = load i8, i8* %520, align 1, !dbg !429, !tbaa !205
  %522 = getelementptr inbounds i8, i8* %518, i64 2, !dbg !429
  %523 = load i8, i8* %522, align 1, !dbg !429, !tbaa !205
  %524 = getelementptr inbounds i8, i8* %518, i64 3, !dbg !429
  %525 = load i8, i8* %524, align 1, !dbg !429, !tbaa !205
  %526 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !431
  %527 = load i8*, i8** %526, align 8, !dbg !431, !tbaa !18
  %528 = load i8, i8* %527, align 1, !dbg !432, !tbaa !205
  %529 = getelementptr inbounds i8, i8* %527, i64 1, !dbg !432
  %530 = load i8, i8* %529, align 1, !dbg !432, !tbaa !205
  %531 = getelementptr inbounds i8, i8* %527, i64 2, !dbg !432
  %532 = load i8, i8* %531, align 1, !dbg !432, !tbaa !205
  %533 = getelementptr inbounds i8, i8* %527, i64 3, !dbg !432
  %534 = load i8, i8* %533, align 1, !dbg !432, !tbaa !205
  %535 = zext i8 %516 to i32, !dbg !434
  %536 = shl nuw i32 %535, 24, !dbg !434
  %537 = zext i8 %514 to i32, !dbg !434
  %538 = shl nuw nsw i32 %537, 16, !dbg !434
  %539 = zext i8 %512 to i32, !dbg !434
  %540 = shl nuw nsw i32 %539, 8, !dbg !434
  %541 = zext i8 %510 to i32, !dbg !434
  %542 = or i32 %540, %541, !dbg !434
  %543 = or i32 %542, %538, !dbg !434
  %544 = or i32 %543, %536, !dbg !434
  %545 = zext i8 %525 to i32, !dbg !435
  %546 = shl nuw i32 %545, 24, !dbg !435
  %547 = zext i8 %523 to i32, !dbg !435
  %548 = shl nuw nsw i32 %547, 16, !dbg !435
  %549 = zext i8 %521 to i32, !dbg !435
  %550 = shl nuw nsw i32 %549, 8, !dbg !435
  %551 = zext i8 %519 to i32, !dbg !435
  %552 = or i32 %550, %551, !dbg !435
  %553 = or i32 %552, %548, !dbg !435
  %554 = or i32 %553, %546, !dbg !435
  %555 = zext i8 %534 to i32, !dbg !436
  %556 = shl nuw i32 %555, 24, !dbg !436
  %557 = zext i8 %532 to i32, !dbg !436
  %558 = shl nuw nsw i32 %557, 16, !dbg !436
  %559 = zext i8 %530 to i32, !dbg !436
  %560 = shl nuw nsw i32 %559, 8, !dbg !436
  %561 = zext i8 %528 to i32, !dbg !436
  %562 = or i32 %560, %561, !dbg !436
  %563 = or i32 %562, %558, !dbg !436
  %564 = or i32 %563, %556, !dbg !436
  %565 = icmp ult i32 %544, %554, !dbg !436
  %566 = icmp eq i32 %564, 0, !dbg !438
  br i1 %565, label %567, label %573, !dbg !439

567:                                              ; preds = %508
  br i1 %566, label %570, label %568, !dbg !440

568:                                              ; preds = %567
  %569 = udiv i32 %544, %564, !dbg !441
  br label %570

570:                                              ; preds = %568, %567
  %571 = phi i32 [ %569, %568 ], [ 0, %567 ], !dbg !438
  %572 = add i32 %571, %554, !dbg !442
  br label %579, !dbg !443

573:                                              ; preds = %508
  br i1 %566, label %576, label %574, !dbg !444

574:                                              ; preds = %573
  %575 = urem i32 %554, %564, !dbg !445
  br label %576

576:                                              ; preds = %574, %573
  %577 = phi i32 [ %575, %574 ], [ 0, %573 ], !dbg !438
  %578 = add i32 %577, %544, !dbg !446
  br label %579

579:                                              ; preds = %570, %576
  %580 = phi i32 [ %572, %570 ], [ %578, %576 ], !dbg !438
  %581 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !447
  %582 = bitcast i8* %581 to %struct.ink_block*, !dbg !447
  %583 = icmp eq i8* %581, null, !dbg !449
  br i1 %583, label %584, label %585, !dbg !450

584:                                              ; preds = %579
  tail call fastcc void @ink_fail() #11, !dbg !451
  unreachable

585:                                              ; preds = %579
  %586 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !452, !tbaa !18
  %587 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %582, i64 0, i32 0, !dbg !453
  store %struct.ink_block* %586, %struct.ink_block** %587, align 8, !dbg !454, !tbaa !24
  store i8* %581, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !455, !tbaa !18
  %588 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %582, i64 1, !dbg !456
  %589 = bitcast %struct.ink_block* %588 to i32*, !dbg !457
  store i32 %580, i32* %589, align 4, !dbg !458, !tbaa !99
  %590 = bitcast i8** %3 to %struct.ink_block**, !dbg !459
  store %struct.ink_block* %588, %struct.ink_block** %590, align 8, !dbg !459, !tbaa !18
  br label %592

591:                                              ; preds = %5
  tail call fastcc void @ink_fail(), !dbg !460
  unreachable

592:                                              ; preds = %585, %502, %385, %295, %237, %142, %6
  %593 = phi i64 [ 1, %585 ], [ 1, %502 ], [ 1, %385 ], [ 1, %295 ], [ 1, %237 ], [ 1, %142 ], [ %53, %6 ]
  store i64 %593, i64* %4, align 8, !dbg !461, !tbaa !210
  ret void, !dbg !462
}

; Function Attrs: nounwind ssp uwtable
define i32 @ink_compute_scalar32(i32 %0, i8** readonly %1, i64* nocapture readnone %2) local_unnamed_addr #0 !dbg !463 {
  switch i32 %0, label %476 [
    i32 1, label %4
    i32 2, label %89
    i32 3, label %174
    i32 4, label %254
    i32 5, label %334
    i32 6, label %405
  ], !dbg !464

4:                                                ; preds = %3
  %5 = load i8*, i8** %1, align 8, !dbg !465, !tbaa !18
  %6 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !466
  %7 = load i8*, i8** %6, align 8, !dbg !466, !tbaa !18
  %8 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !467
  %9 = load i8*, i8** %8, align 8, !dbg !467, !tbaa !18
  %10 = load i8, i8* %9, align 1, !dbg !468, !tbaa !205
  %11 = getelementptr inbounds i8, i8* %9, i64 1, !dbg !468
  %12 = load i8, i8* %11, align 1, !dbg !468, !tbaa !205
  %13 = getelementptr inbounds i8, i8* %9, i64 2, !dbg !468
  %14 = load i8, i8* %13, align 1, !dbg !468, !tbaa !205
  %15 = getelementptr inbounds i8, i8* %9, i64 3, !dbg !468
  %16 = load i8, i8* %15, align 1, !dbg !468, !tbaa !205
  %17 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !470
  %18 = load i8*, i8** %17, align 8, !dbg !470, !tbaa !18
  %19 = load i8, i8* %18, align 1, !dbg !471, !tbaa !205
  %20 = getelementptr inbounds i8, i8* %18, i64 1, !dbg !471
  %21 = load i8, i8* %20, align 1, !dbg !471, !tbaa !205
  %22 = getelementptr inbounds i8, i8* %18, i64 2, !dbg !471
  %23 = load i8, i8* %22, align 1, !dbg !471, !tbaa !205
  %24 = getelementptr inbounds i8, i8* %18, i64 3, !dbg !471
  %25 = load i8, i8* %24, align 1, !dbg !471, !tbaa !205
  %26 = zext i8 %16 to i32, !dbg !473
  %27 = shl nuw i32 %26, 24, !dbg !473
  %28 = zext i8 %14 to i32, !dbg !473
  %29 = shl nuw nsw i32 %28, 16, !dbg !473
  %30 = zext i8 %12 to i32, !dbg !473
  %31 = shl nuw nsw i32 %30, 8, !dbg !473
  %32 = zext i8 %10 to i32, !dbg !473
  %33 = or i32 %31, %32, !dbg !473
  %34 = or i32 %33, %29, !dbg !473
  %35 = or i32 %34, %27, !dbg !473
  %36 = zext i8 %25 to i32, !dbg !474
  %37 = shl nuw i32 %36, 24, !dbg !474
  %38 = zext i8 %23 to i32, !dbg !474
  %39 = shl nuw nsw i32 %38, 16, !dbg !474
  %40 = zext i8 %21 to i32, !dbg !474
  %41 = shl nuw nsw i32 %40, 8, !dbg !474
  %42 = zext i8 %19 to i32, !dbg !474
  %43 = or i32 %41, %42, !dbg !474
  %44 = or i32 %43, %39, !dbg !474
  %45 = or i32 %44, %37, !dbg !474
  %46 = icmp eq i32 %45, 0, !dbg !474
  br i1 %46, label %84, label %47, !dbg !476

47:                                               ; preds = %4
  %48 = getelementptr inbounds i8, i8* %7, i64 3, !dbg !477
  %49 = load i8, i8* %48, align 1, !dbg !477, !tbaa !205
  %50 = zext i8 %49 to i32, !dbg !479
  %51 = shl nuw i32 %50, 24, !dbg !479
  %52 = getelementptr inbounds i8, i8* %7, i64 2, !dbg !477
  %53 = load i8, i8* %52, align 1, !dbg !477, !tbaa !205
  %54 = zext i8 %53 to i32, !dbg !479
  %55 = shl nuw nsw i32 %54, 16, !dbg !479
  %56 = or i32 %55, %51, !dbg !479
  %57 = getelementptr inbounds i8, i8* %7, i64 1, !dbg !477
  %58 = load i8, i8* %57, align 1, !dbg !477, !tbaa !205
  %59 = zext i8 %58 to i32, !dbg !479
  %60 = shl nuw nsw i32 %59, 8, !dbg !479
  %61 = or i32 %56, %60, !dbg !479
  %62 = load i8, i8* %7, align 1, !dbg !477, !tbaa !205
  %63 = zext i8 %62 to i32, !dbg !479
  %64 = or i32 %61, %63, !dbg !479
  %65 = getelementptr inbounds i8, i8* %5, i64 3, !dbg !480
  %66 = load i8, i8* %65, align 1, !dbg !480, !tbaa !205
  %67 = zext i8 %66 to i32, !dbg !482
  %68 = shl nuw i32 %67, 24, !dbg !482
  %69 = getelementptr inbounds i8, i8* %5, i64 2, !dbg !480
  %70 = load i8, i8* %69, align 1, !dbg !480, !tbaa !205
  %71 = zext i8 %70 to i32, !dbg !482
  %72 = shl nuw nsw i32 %71, 16, !dbg !482
  %73 = or i32 %72, %68, !dbg !482
  %74 = getelementptr inbounds i8, i8* %5, i64 1, !dbg !480
  %75 = load i8, i8* %74, align 1, !dbg !480, !tbaa !205
  %76 = zext i8 %75 to i32, !dbg !482
  %77 = shl nuw nsw i32 %76, 8, !dbg !482
  %78 = or i32 %73, %77, !dbg !482
  %79 = load i8, i8* %5, align 1, !dbg !480, !tbaa !205
  %80 = zext i8 %79 to i32, !dbg !482
  %81 = or i32 %78, %80, !dbg !482
  %82 = udiv i32 %64, %45, !dbg !483
  %83 = urem i32 %81, %45, !dbg !484
  br label %84

84:                                               ; preds = %4, %47
  %85 = phi i32 [ %82, %47 ], [ 0, %4 ]
  %86 = phi i32 [ %83, %47 ], [ 0, %4 ], !dbg !485
  %87 = add i32 %85, %35, !dbg !486
  %88 = add i32 %87, %86, !dbg !487
  br label %477

89:                                               ; preds = %3
  %90 = load i8*, i8** %1, align 8, !dbg !488, !tbaa !18
  %91 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !489
  %92 = load i8*, i8** %91, align 8, !dbg !489, !tbaa !18
  %93 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !490
  %94 = load i8*, i8** %93, align 8, !dbg !490, !tbaa !18
  %95 = load i8, i8* %94, align 1, !dbg !491, !tbaa !205
  %96 = getelementptr inbounds i8, i8* %94, i64 1, !dbg !491
  %97 = load i8, i8* %96, align 1, !dbg !491, !tbaa !205
  %98 = getelementptr inbounds i8, i8* %94, i64 2, !dbg !491
  %99 = load i8, i8* %98, align 1, !dbg !491, !tbaa !205
  %100 = getelementptr inbounds i8, i8* %94, i64 3, !dbg !491
  %101 = load i8, i8* %100, align 1, !dbg !491, !tbaa !205
  %102 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !493
  %103 = load i8*, i8** %102, align 8, !dbg !493, !tbaa !18
  %104 = load i8, i8* %103, align 1, !dbg !494, !tbaa !205
  %105 = getelementptr inbounds i8, i8* %103, i64 1, !dbg !494
  %106 = load i8, i8* %105, align 1, !dbg !494, !tbaa !205
  %107 = getelementptr inbounds i8, i8* %103, i64 2, !dbg !494
  %108 = load i8, i8* %107, align 1, !dbg !494, !tbaa !205
  %109 = getelementptr inbounds i8, i8* %103, i64 3, !dbg !494
  %110 = load i8, i8* %109, align 1, !dbg !494, !tbaa !205
  %111 = zext i8 %101 to i32, !dbg !496
  %112 = shl nuw i32 %111, 24, !dbg !496
  %113 = zext i8 %99 to i32, !dbg !496
  %114 = shl nuw nsw i32 %113, 16, !dbg !496
  %115 = zext i8 %97 to i32, !dbg !496
  %116 = shl nuw nsw i32 %115, 8, !dbg !496
  %117 = zext i8 %95 to i32, !dbg !496
  %118 = or i32 %116, %117, !dbg !496
  %119 = or i32 %118, %114, !dbg !496
  %120 = or i32 %119, %112, !dbg !496
  %121 = zext i8 %110 to i32, !dbg !497
  %122 = shl nuw i32 %121, 24, !dbg !497
  %123 = zext i8 %108 to i32, !dbg !497
  %124 = shl nuw nsw i32 %123, 16, !dbg !497
  %125 = zext i8 %106 to i32, !dbg !497
  %126 = shl nuw nsw i32 %125, 8, !dbg !497
  %127 = zext i8 %104 to i32, !dbg !497
  %128 = or i32 %126, %127, !dbg !497
  %129 = or i32 %128, %124, !dbg !497
  %130 = or i32 %129, %122, !dbg !497
  %131 = icmp eq i32 %130, 0, !dbg !497
  br i1 %131, label %169, label %132, !dbg !499

132:                                              ; preds = %89
  %133 = getelementptr inbounds i8, i8* %92, i64 3, !dbg !500
  %134 = load i8, i8* %133, align 1, !dbg !500, !tbaa !205
  %135 = zext i8 %134 to i32, !dbg !502
  %136 = shl nuw i32 %135, 24, !dbg !502
  %137 = getelementptr inbounds i8, i8* %92, i64 2, !dbg !500
  %138 = load i8, i8* %137, align 1, !dbg !500, !tbaa !205
  %139 = zext i8 %138 to i32, !dbg !502
  %140 = shl nuw nsw i32 %139, 16, !dbg !502
  %141 = or i32 %140, %136, !dbg !502
  %142 = getelementptr inbounds i8, i8* %92, i64 1, !dbg !500
  %143 = load i8, i8* %142, align 1, !dbg !500, !tbaa !205
  %144 = zext i8 %143 to i32, !dbg !502
  %145 = shl nuw nsw i32 %144, 8, !dbg !502
  %146 = or i32 %141, %145, !dbg !502
  %147 = load i8, i8* %92, align 1, !dbg !500, !tbaa !205
  %148 = zext i8 %147 to i32, !dbg !502
  %149 = or i32 %146, %148, !dbg !502
  %150 = getelementptr inbounds i8, i8* %90, i64 3, !dbg !503
  %151 = load i8, i8* %150, align 1, !dbg !503, !tbaa !205
  %152 = zext i8 %151 to i32, !dbg !505
  %153 = shl nuw i32 %152, 24, !dbg !505
  %154 = getelementptr inbounds i8, i8* %90, i64 2, !dbg !503
  %155 = load i8, i8* %154, align 1, !dbg !503, !tbaa !205
  %156 = zext i8 %155 to i32, !dbg !505
  %157 = shl nuw nsw i32 %156, 16, !dbg !505
  %158 = or i32 %157, %153, !dbg !505
  %159 = getelementptr inbounds i8, i8* %90, i64 1, !dbg !503
  %160 = load i8, i8* %159, align 1, !dbg !503, !tbaa !205
  %161 = zext i8 %160 to i32, !dbg !505
  %162 = shl nuw nsw i32 %161, 8, !dbg !505
  %163 = or i32 %158, %162, !dbg !505
  %164 = load i8, i8* %90, align 1, !dbg !503, !tbaa !205
  %165 = zext i8 %164 to i32, !dbg !505
  %166 = or i32 %163, %165, !dbg !505
  %167 = udiv i32 %149, %130, !dbg !506
  %168 = urem i32 %166, %130, !dbg !507
  br label %169

169:                                              ; preds = %89, %132
  %170 = phi i32 [ %167, %132 ], [ 0, %89 ]
  %171 = phi i32 [ %168, %132 ], [ 0, %89 ], !dbg !508
  %172 = add i32 %170, %120, !dbg !509
  %173 = add i32 %172, %171, !dbg !510
  br label %477

174:                                              ; preds = %3
  %175 = load i8*, i8** %1, align 8, !dbg !511, !tbaa !18
  %176 = load i8, i8* %175, align 1, !dbg !512, !tbaa !205
  %177 = getelementptr inbounds i8, i8* %175, i64 1, !dbg !512
  %178 = load i8, i8* %177, align 1, !dbg !512, !tbaa !205
  %179 = getelementptr inbounds i8, i8* %175, i64 2, !dbg !512
  %180 = load i8, i8* %179, align 1, !dbg !512, !tbaa !205
  %181 = getelementptr inbounds i8, i8* %175, i64 3, !dbg !512
  %182 = load i8, i8* %181, align 1, !dbg !512, !tbaa !205
  %183 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !514
  %184 = load i8*, i8** %183, align 8, !dbg !514, !tbaa !18
  %185 = load i8, i8* %184, align 1, !dbg !515, !tbaa !205
  %186 = getelementptr inbounds i8, i8* %184, i64 1, !dbg !515
  %187 = load i8, i8* %186, align 1, !dbg !515, !tbaa !205
  %188 = getelementptr inbounds i8, i8* %184, i64 2, !dbg !515
  %189 = load i8, i8* %188, align 1, !dbg !515, !tbaa !205
  %190 = getelementptr inbounds i8, i8* %184, i64 3, !dbg !515
  %191 = load i8, i8* %190, align 1, !dbg !515, !tbaa !205
  %192 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !517
  %193 = load i8*, i8** %192, align 8, !dbg !517, !tbaa !18
  %194 = load i8, i8* %193, align 1, !dbg !518, !tbaa !205
  %195 = getelementptr inbounds i8, i8* %193, i64 1, !dbg !518
  %196 = load i8, i8* %195, align 1, !dbg !518, !tbaa !205
  %197 = getelementptr inbounds i8, i8* %193, i64 2, !dbg !518
  %198 = load i8, i8* %197, align 1, !dbg !518, !tbaa !205
  %199 = getelementptr inbounds i8, i8* %193, i64 3, !dbg !518
  %200 = load i8, i8* %199, align 1, !dbg !518, !tbaa !205
  %201 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !520
  %202 = load i8*, i8** %201, align 8, !dbg !520, !tbaa !18
  %203 = load i8, i8* %202, align 1, !dbg !521, !tbaa !205
  %204 = getelementptr inbounds i8, i8* %202, i64 1, !dbg !521
  %205 = load i8, i8* %204, align 1, !dbg !521, !tbaa !205
  %206 = getelementptr inbounds i8, i8* %202, i64 2, !dbg !521
  %207 = load i8, i8* %206, align 1, !dbg !521, !tbaa !205
  %208 = getelementptr inbounds i8, i8* %202, i64 3, !dbg !521
  %209 = load i8, i8* %208, align 1, !dbg !521, !tbaa !205
  %210 = zext i8 %182 to i32, !dbg !523
  %211 = shl nuw i32 %210, 24, !dbg !523
  %212 = zext i8 %180 to i32, !dbg !523
  %213 = shl nuw nsw i32 %212, 16, !dbg !523
  %214 = zext i8 %178 to i32, !dbg !523
  %215 = shl nuw nsw i32 %214, 8, !dbg !523
  %216 = zext i8 %176 to i32, !dbg !523
  %217 = or i32 %215, %216, !dbg !523
  %218 = or i32 %217, %213, !dbg !523
  %219 = or i32 %218, %211, !dbg !523
  %220 = zext i8 %191 to i32, !dbg !524
  %221 = shl nuw i32 %220, 24, !dbg !524
  %222 = zext i8 %189 to i32, !dbg !524
  %223 = shl nuw nsw i32 %222, 16, !dbg !524
  %224 = zext i8 %187 to i32, !dbg !524
  %225 = shl nuw nsw i32 %224, 8, !dbg !524
  %226 = zext i8 %185 to i32, !dbg !524
  %227 = or i32 %225, %226, !dbg !524
  %228 = or i32 %227, %223, !dbg !524
  %229 = or i32 %228, %221, !dbg !524
  %230 = zext i8 %200 to i32, !dbg !525
  %231 = shl nuw i32 %230, 24, !dbg !525
  %232 = zext i8 %198 to i32, !dbg !525
  %233 = shl nuw nsw i32 %232, 16, !dbg !525
  %234 = zext i8 %196 to i32, !dbg !525
  %235 = shl nuw nsw i32 %234, 8, !dbg !525
  %236 = zext i8 %194 to i32, !dbg !525
  %237 = or i32 %235, %236, !dbg !525
  %238 = or i32 %237, %233, !dbg !525
  %239 = or i32 %238, %231, !dbg !525
  %240 = zext i8 %209 to i32, !dbg !526
  %241 = shl nuw i32 %240, 24, !dbg !526
  %242 = zext i8 %207 to i32, !dbg !526
  %243 = shl nuw nsw i32 %242, 16, !dbg !526
  %244 = zext i8 %205 to i32, !dbg !526
  %245 = shl nuw nsw i32 %244, 8, !dbg !526
  %246 = zext i8 %203 to i32, !dbg !526
  %247 = or i32 %245, %246, !dbg !526
  %248 = or i32 %247, %243, !dbg !526
  %249 = or i32 %248, %241, !dbg !526
  %250 = icmp ult i32 %219, %239, !dbg !526
  %251 = add i32 %249, %229, !dbg !528
  %252 = mul i32 %229, 3, !dbg !528
  %253 = select i1 %250, i32 %251, i32 %252, !dbg !528
  br label %477

254:                                              ; preds = %3
  %255 = load i8*, i8** %1, align 8, !dbg !529, !tbaa !18
  %256 = load i8, i8* %255, align 1, !dbg !530, !tbaa !205
  %257 = getelementptr inbounds i8, i8* %255, i64 1, !dbg !530
  %258 = load i8, i8* %257, align 1, !dbg !530, !tbaa !205
  %259 = getelementptr inbounds i8, i8* %255, i64 2, !dbg !530
  %260 = load i8, i8* %259, align 1, !dbg !530, !tbaa !205
  %261 = getelementptr inbounds i8, i8* %255, i64 3, !dbg !530
  %262 = load i8, i8* %261, align 1, !dbg !530, !tbaa !205
  %263 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !532
  %264 = load i8*, i8** %263, align 8, !dbg !532, !tbaa !18
  %265 = load i8, i8* %264, align 1, !dbg !533, !tbaa !205
  %266 = getelementptr inbounds i8, i8* %264, i64 1, !dbg !533
  %267 = load i8, i8* %266, align 1, !dbg !533, !tbaa !205
  %268 = getelementptr inbounds i8, i8* %264, i64 2, !dbg !533
  %269 = load i8, i8* %268, align 1, !dbg !533, !tbaa !205
  %270 = getelementptr inbounds i8, i8* %264, i64 3, !dbg !533
  %271 = load i8, i8* %270, align 1, !dbg !533, !tbaa !205
  %272 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !535
  %273 = load i8*, i8** %272, align 8, !dbg !535, !tbaa !18
  %274 = load i8, i8* %273, align 1, !dbg !536, !tbaa !205
  %275 = getelementptr inbounds i8, i8* %273, i64 1, !dbg !536
  %276 = load i8, i8* %275, align 1, !dbg !536, !tbaa !205
  %277 = getelementptr inbounds i8, i8* %273, i64 2, !dbg !536
  %278 = load i8, i8* %277, align 1, !dbg !536, !tbaa !205
  %279 = getelementptr inbounds i8, i8* %273, i64 3, !dbg !536
  %280 = load i8, i8* %279, align 1, !dbg !536, !tbaa !205
  %281 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !538
  %282 = load i8*, i8** %281, align 8, !dbg !538, !tbaa !18
  %283 = load i8, i8* %282, align 1, !dbg !539, !tbaa !205
  %284 = getelementptr inbounds i8, i8* %282, i64 1, !dbg !539
  %285 = load i8, i8* %284, align 1, !dbg !539, !tbaa !205
  %286 = getelementptr inbounds i8, i8* %282, i64 2, !dbg !539
  %287 = load i8, i8* %286, align 1, !dbg !539, !tbaa !205
  %288 = getelementptr inbounds i8, i8* %282, i64 3, !dbg !539
  %289 = load i8, i8* %288, align 1, !dbg !539, !tbaa !205
  %290 = zext i8 %262 to i32, !dbg !541
  %291 = shl nuw i32 %290, 24, !dbg !541
  %292 = zext i8 %260 to i32, !dbg !541
  %293 = shl nuw nsw i32 %292, 16, !dbg !541
  %294 = zext i8 %258 to i32, !dbg !541
  %295 = shl nuw nsw i32 %294, 8, !dbg !541
  %296 = zext i8 %256 to i32, !dbg !541
  %297 = or i32 %295, %296, !dbg !541
  %298 = or i32 %297, %293, !dbg !541
  %299 = or i32 %298, %291, !dbg !541
  %300 = zext i8 %271 to i32, !dbg !542
  %301 = shl nuw i32 %300, 24, !dbg !542
  %302 = zext i8 %269 to i32, !dbg !542
  %303 = shl nuw nsw i32 %302, 16, !dbg !542
  %304 = zext i8 %267 to i32, !dbg !542
  %305 = shl nuw nsw i32 %304, 8, !dbg !542
  %306 = zext i8 %265 to i32, !dbg !542
  %307 = or i32 %305, %306, !dbg !542
  %308 = or i32 %307, %303, !dbg !542
  %309 = or i32 %308, %301, !dbg !542
  %310 = zext i8 %280 to i32, !dbg !543
  %311 = shl nuw i32 %310, 24, !dbg !543
  %312 = zext i8 %278 to i32, !dbg !543
  %313 = shl nuw nsw i32 %312, 16, !dbg !543
  %314 = zext i8 %276 to i32, !dbg !543
  %315 = shl nuw nsw i32 %314, 8, !dbg !543
  %316 = zext i8 %274 to i32, !dbg !543
  %317 = or i32 %315, %316, !dbg !543
  %318 = or i32 %317, %313, !dbg !543
  %319 = or i32 %318, %311, !dbg !543
  %320 = zext i8 %289 to i32, !dbg !544
  %321 = shl nuw i32 %320, 24, !dbg !544
  %322 = zext i8 %287 to i32, !dbg !544
  %323 = shl nuw nsw i32 %322, 16, !dbg !544
  %324 = zext i8 %285 to i32, !dbg !544
  %325 = shl nuw nsw i32 %324, 8, !dbg !544
  %326 = zext i8 %283 to i32, !dbg !544
  %327 = or i32 %325, %326, !dbg !544
  %328 = or i32 %327, %323, !dbg !544
  %329 = or i32 %328, %321, !dbg !544
  %330 = icmp ult i32 %299, %319, !dbg !544
  %331 = add i32 %329, %309, !dbg !546
  %332 = mul i32 %309, 3, !dbg !546
  %333 = select i1 %330, i32 %331, i32 %332, !dbg !546
  br label %477

334:                                              ; preds = %3
  %335 = load i8*, i8** %1, align 8, !dbg !547, !tbaa !18
  %336 = load i8, i8* %335, align 1, !dbg !548, !tbaa !205
  %337 = getelementptr inbounds i8, i8* %335, i64 1, !dbg !548
  %338 = load i8, i8* %337, align 1, !dbg !548, !tbaa !205
  %339 = getelementptr inbounds i8, i8* %335, i64 2, !dbg !548
  %340 = load i8, i8* %339, align 1, !dbg !548, !tbaa !205
  %341 = getelementptr inbounds i8, i8* %335, i64 3, !dbg !548
  %342 = load i8, i8* %341, align 1, !dbg !548, !tbaa !205
  %343 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !550
  %344 = load i8*, i8** %343, align 8, !dbg !550, !tbaa !18
  %345 = load i8, i8* %344, align 1, !dbg !551, !tbaa !205
  %346 = getelementptr inbounds i8, i8* %344, i64 1, !dbg !551
  %347 = load i8, i8* %346, align 1, !dbg !551, !tbaa !205
  %348 = getelementptr inbounds i8, i8* %344, i64 2, !dbg !551
  %349 = load i8, i8* %348, align 1, !dbg !551, !tbaa !205
  %350 = getelementptr inbounds i8, i8* %344, i64 3, !dbg !551
  %351 = load i8, i8* %350, align 1, !dbg !551, !tbaa !205
  %352 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !553
  %353 = load i8*, i8** %352, align 8, !dbg !553, !tbaa !18
  %354 = load i8, i8* %353, align 1, !dbg !554, !tbaa !205
  %355 = getelementptr inbounds i8, i8* %353, i64 1, !dbg !554
  %356 = load i8, i8* %355, align 1, !dbg !554, !tbaa !205
  %357 = getelementptr inbounds i8, i8* %353, i64 2, !dbg !554
  %358 = load i8, i8* %357, align 1, !dbg !554, !tbaa !205
  %359 = getelementptr inbounds i8, i8* %353, i64 3, !dbg !554
  %360 = load i8, i8* %359, align 1, !dbg !554, !tbaa !205
  %361 = zext i8 %342 to i32, !dbg !556
  %362 = shl nuw i32 %361, 24, !dbg !556
  %363 = zext i8 %340 to i32, !dbg !556
  %364 = shl nuw nsw i32 %363, 16, !dbg !556
  %365 = zext i8 %338 to i32, !dbg !556
  %366 = shl nuw nsw i32 %365, 8, !dbg !556
  %367 = zext i8 %336 to i32, !dbg !556
  %368 = or i32 %366, %367, !dbg !556
  %369 = or i32 %368, %364, !dbg !556
  %370 = or i32 %369, %362, !dbg !556
  %371 = zext i8 %351 to i32, !dbg !557
  %372 = shl nuw i32 %371, 24, !dbg !557
  %373 = zext i8 %349 to i32, !dbg !557
  %374 = shl nuw nsw i32 %373, 16, !dbg !557
  %375 = zext i8 %347 to i32, !dbg !557
  %376 = shl nuw nsw i32 %375, 8, !dbg !557
  %377 = zext i8 %345 to i32, !dbg !557
  %378 = or i32 %376, %377, !dbg !557
  %379 = or i32 %378, %374, !dbg !557
  %380 = or i32 %379, %372, !dbg !557
  %381 = zext i8 %360 to i32, !dbg !558
  %382 = shl nuw i32 %381, 24, !dbg !558
  %383 = zext i8 %358 to i32, !dbg !558
  %384 = shl nuw nsw i32 %383, 16, !dbg !558
  %385 = zext i8 %356 to i32, !dbg !558
  %386 = shl nuw nsw i32 %385, 8, !dbg !558
  %387 = zext i8 %354 to i32, !dbg !558
  %388 = or i32 %386, %387, !dbg !558
  %389 = or i32 %388, %384, !dbg !558
  %390 = or i32 %389, %382, !dbg !558
  %391 = icmp ult i32 %370, %380, !dbg !558
  %392 = icmp eq i32 %390, 0, !dbg !560
  br i1 %391, label %393, label %399, !dbg !561

393:                                              ; preds = %334
  br i1 %392, label %396, label %394, !dbg !562

394:                                              ; preds = %393
  %395 = udiv i32 %370, %390, !dbg !563
  br label %396

396:                                              ; preds = %394, %393
  %397 = phi i32 [ %395, %394 ], [ 0, %393 ], !dbg !560
  %398 = add i32 %397, %380, !dbg !564
  br label %477, !dbg !565

399:                                              ; preds = %334
  br i1 %392, label %402, label %400, !dbg !566

400:                                              ; preds = %399
  %401 = urem i32 %380, %390, !dbg !567
  br label %402

402:                                              ; preds = %400, %399
  %403 = phi i32 [ %401, %400 ], [ 0, %399 ], !dbg !560
  %404 = add i32 %403, %370, !dbg !568
  br label %477

405:                                              ; preds = %3
  %406 = load i8*, i8** %1, align 8, !dbg !569, !tbaa !18
  %407 = load i8, i8* %406, align 1, !dbg !570, !tbaa !205
  %408 = getelementptr inbounds i8, i8* %406, i64 1, !dbg !570
  %409 = load i8, i8* %408, align 1, !dbg !570, !tbaa !205
  %410 = getelementptr inbounds i8, i8* %406, i64 2, !dbg !570
  %411 = load i8, i8* %410, align 1, !dbg !570, !tbaa !205
  %412 = getelementptr inbounds i8, i8* %406, i64 3, !dbg !570
  %413 = load i8, i8* %412, align 1, !dbg !570, !tbaa !205
  %414 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !572
  %415 = load i8*, i8** %414, align 8, !dbg !572, !tbaa !18
  %416 = load i8, i8* %415, align 1, !dbg !573, !tbaa !205
  %417 = getelementptr inbounds i8, i8* %415, i64 1, !dbg !573
  %418 = load i8, i8* %417, align 1, !dbg !573, !tbaa !205
  %419 = getelementptr inbounds i8, i8* %415, i64 2, !dbg !573
  %420 = load i8, i8* %419, align 1, !dbg !573, !tbaa !205
  %421 = getelementptr inbounds i8, i8* %415, i64 3, !dbg !573
  %422 = load i8, i8* %421, align 1, !dbg !573, !tbaa !205
  %423 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !575
  %424 = load i8*, i8** %423, align 8, !dbg !575, !tbaa !18
  %425 = load i8, i8* %424, align 1, !dbg !576, !tbaa !205
  %426 = getelementptr inbounds i8, i8* %424, i64 1, !dbg !576
  %427 = load i8, i8* %426, align 1, !dbg !576, !tbaa !205
  %428 = getelementptr inbounds i8, i8* %424, i64 2, !dbg !576
  %429 = load i8, i8* %428, align 1, !dbg !576, !tbaa !205
  %430 = getelementptr inbounds i8, i8* %424, i64 3, !dbg !576
  %431 = load i8, i8* %430, align 1, !dbg !576, !tbaa !205
  %432 = zext i8 %413 to i32, !dbg !578
  %433 = shl nuw i32 %432, 24, !dbg !578
  %434 = zext i8 %411 to i32, !dbg !578
  %435 = shl nuw nsw i32 %434, 16, !dbg !578
  %436 = zext i8 %409 to i32, !dbg !578
  %437 = shl nuw nsw i32 %436, 8, !dbg !578
  %438 = zext i8 %407 to i32, !dbg !578
  %439 = or i32 %437, %438, !dbg !578
  %440 = or i32 %439, %435, !dbg !578
  %441 = or i32 %440, %433, !dbg !578
  %442 = zext i8 %422 to i32, !dbg !579
  %443 = shl nuw i32 %442, 24, !dbg !579
  %444 = zext i8 %420 to i32, !dbg !579
  %445 = shl nuw nsw i32 %444, 16, !dbg !579
  %446 = zext i8 %418 to i32, !dbg !579
  %447 = shl nuw nsw i32 %446, 8, !dbg !579
  %448 = zext i8 %416 to i32, !dbg !579
  %449 = or i32 %447, %448, !dbg !579
  %450 = or i32 %449, %445, !dbg !579
  %451 = or i32 %450, %443, !dbg !579
  %452 = zext i8 %431 to i32, !dbg !580
  %453 = shl nuw i32 %452, 24, !dbg !580
  %454 = zext i8 %429 to i32, !dbg !580
  %455 = shl nuw nsw i32 %454, 16, !dbg !580
  %456 = zext i8 %427 to i32, !dbg !580
  %457 = shl nuw nsw i32 %456, 8, !dbg !580
  %458 = zext i8 %425 to i32, !dbg !580
  %459 = or i32 %457, %458, !dbg !580
  %460 = or i32 %459, %455, !dbg !580
  %461 = or i32 %460, %453, !dbg !580
  %462 = icmp ult i32 %441, %451, !dbg !580
  %463 = icmp eq i32 %461, 0, !dbg !582
  br i1 %462, label %464, label %470, !dbg !583

464:                                              ; preds = %405
  br i1 %463, label %467, label %465, !dbg !584

465:                                              ; preds = %464
  %466 = udiv i32 %441, %461, !dbg !585
  br label %467

467:                                              ; preds = %465, %464
  %468 = phi i32 [ %466, %465 ], [ 0, %464 ], !dbg !582
  %469 = add i32 %468, %451, !dbg !586
  br label %477, !dbg !587

470:                                              ; preds = %405
  br i1 %463, label %473, label %471, !dbg !588

471:                                              ; preds = %470
  %472 = urem i32 %451, %461, !dbg !589
  br label %473

473:                                              ; preds = %471, %470
  %474 = phi i32 [ %472, %471 ], [ 0, %470 ], !dbg !582
  %475 = add i32 %474, %441, !dbg !590
  br label %477

476:                                              ; preds = %3
  tail call fastcc void @ink_fail(), !dbg !591
  unreachable

477:                                              ; preds = %473, %467, %402, %396, %254, %174, %169, %84
  %478 = phi i32 [ %333, %254 ], [ %253, %174 ], [ %173, %169 ], [ %88, %84 ], [ %398, %396 ], [ %404, %402 ], [ %469, %467 ], [ %475, %473 ], !dbg !592
  ret i32 %478, !dbg !593
}

; Function Attrs: noreturn nounwind ssp uwtable
define i64 @ink_compute_scalar64(i32 %0, i8** nocapture readnone %1, i64* nocapture readnone %2) local_unnamed_addr #3 !dbg !594 {
  tail call fastcc void @ink_fail(), !dbg !595
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
!96 = !DILocation(line: 94, column: 13, scope: !74)
!97 = !DILocation(line: 96, column: 13, scope: !74)
!98 = !DILocation(line: 136, column: 14, scope: !74)
!99 = !{!100, !100, i64 0}
!100 = !{!"int", !20, i64 0}
!101 = !DILocation(line: 155, column: 10, scope: !74)
!102 = !DILocation(line: 155, column: 5, scope: !74)
!103 = !DILocation(line: 183, column: 10, scope: !74)
!104 = !DILocation(line: 183, column: 5, scope: !74)
!105 = !DILocation(line: 208, column: 1, scope: !74)
!106 = !DILocation(line: 208, column: 12, scope: !74)
!107 = !DILocation(line: 93, column: 29, scope: !74)
!108 = !DILocation(line: 93, column: 19, scope: !74)
!109 = distinct !{!109, !95, !110, !32}
!110 = !DILocation(line: 209, column: 1, scope: !74)
!111 = !DILocation(line: 211, column: 1, scope: !74)
!112 = !DILocation(line: 119, column: 18, scope: !74)
!113 = !DILocation(line: 129, column: 18, scope: !74)
!114 = !DILocation(line: 130, column: 19, scope: !74)
!115 = !DILocation(line: 132, column: 19, scope: !74)
!116 = !DILocation(line: 191, column: 18, scope: !74)
!117 = !DILocation(line: 194, column: 10, scope: !74)
!118 = !DILocation(line: 195, column: 1, scope: !74)
!119 = !DILocation(line: 203, column: 18, scope: !74)
!120 = !DILocation(line: 206, column: 10, scope: !74)
!121 = !DILocation(line: 0, scope: !74)
!122 = distinct !DISubprogram(name: "lang_fn_left_word", scope: !14, file: !14, line: 212, type: !15, scopeLine: 212, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!123 = !DILocation(line: 231, column: 7, scope: !122)
!124 = !DILocation(line: 231, column: 5, scope: !122)
!125 = !DILocation(line: 233, column: 16, scope: !122)
!126 = !DILocation(line: 243, column: 17, scope: !122)
!127 = !DILocation(line: 0, scope: !122)
!128 = !DILocation(line: 244, column: 18, scope: !122)
!129 = !DILocation(line: 246, column: 13, scope: !122)
!130 = !DILocation(line: 246, column: 1, scope: !122)
!131 = distinct !DISubprogram(name: "lang_fn_left_signal", scope: !14, file: !14, line: 248, type: !15, scopeLine: 248, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!132 = !DILocation(line: 258, column: 7, scope: !131)
!133 = !DILocation(line: 258, column: 5, scope: !131)
!134 = !DILocation(line: 260, column: 16, scope: !131)
!135 = !DILocation(line: 270, column: 16, scope: !131)
!136 = !DILocation(line: 0, scope: !131)
!137 = !DILocation(line: 271, column: 17, scope: !131)
!138 = !DILocation(line: 273, column: 12, scope: !131)
!139 = !DILocation(line: 273, column: 1, scope: !131)
!140 = distinct !DISubprogram(name: "lang_fn_right_word", scope: !14, file: !14, line: 275, type: !15, scopeLine: 275, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!141 = !DILocation(line: 292, column: 9, scope: !140)
!142 = !DILocation(line: 292, column: 5, scope: !140)
!143 = !DILocation(line: 301, column: 1, scope: !140)
!144 = distinct !DISubprogram(name: "lang_fn_right_signal", scope: !14, file: !14, line: 303, type: !15, scopeLine: 303, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!145 = !DILocation(line: 311, column: 9, scope: !144)
!146 = !DILocation(line: 311, column: 5, scope: !144)
!147 = !DILocation(line: 320, column: 1, scope: !144)
!148 = distinct !DISubprogram(name: "lang_fn_pair_word", scope: !14, file: !14, line: 322, type: !15, scopeLine: 322, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!149 = !DILocation(line: 339, column: 9, scope: !148)
!150 = !DILocation(line: 0, scope: !148)
!151 = !DILocation(line: 339, column: 5, scope: !148)
!152 = !DILocation(line: 345, column: 5, scope: !148)
!153 = !DILocation(line: 347, column: 16, scope: !148)
!154 = !DILocation(line: 350, column: 8, scope: !148)
!155 = !DILocation(line: 351, column: 1, scope: !148)
!156 = !DILocation(line: 357, column: 5, scope: !148)
!157 = !DILocation(line: 359, column: 18, scope: !148)
!158 = !DILocation(line: 362, column: 9, scope: !148)
!159 = !DILocation(line: 364, column: 1, scope: !148)
!160 = distinct !DISubprogram(name: "lang_fn_pair_signal", scope: !14, file: !14, line: 366, type: !15, scopeLine: 366, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!161 = !DILocation(line: 374, column: 9, scope: !160)
!162 = !DILocation(line: 0, scope: !160)
!163 = !DILocation(line: 374, column: 5, scope: !160)
!164 = !DILocation(line: 380, column: 5, scope: !160)
!165 = !DILocation(line: 382, column: 16, scope: !160)
!166 = !DILocation(line: 385, column: 8, scope: !160)
!167 = !DILocation(line: 386, column: 1, scope: !160)
!168 = !DILocation(line: 392, column: 5, scope: !160)
!169 = !DILocation(line: 394, column: 16, scope: !160)
!170 = !DILocation(line: 397, column: 8, scope: !160)
!171 = !DILocation(line: 399, column: 1, scope: !160)
!172 = distinct !DISubprogram(name: "lang_fn_pipeline38_left_padded_zip_heldout_u32_into", scope: !14, file: !14, line: 401, type: !15, scopeLine: 401, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!173 = !DILocation(line: 409, column: 19, scope: !172)
!174 = !DILocation(line: 409, column: 1, scope: !172)
!175 = !DILocation(line: 410, column: 13, scope: !172)
!176 = !DILocation(line: 412, column: 13, scope: !172)
!177 = !DILocation(line: 452, column: 14, scope: !172)
!178 = !DILocation(line: 471, column: 10, scope: !172)
!179 = !DILocation(line: 471, column: 5, scope: !172)
!180 = !DILocation(line: 499, column: 10, scope: !172)
!181 = !DILocation(line: 499, column: 5, scope: !172)
!182 = !DILocation(line: 524, column: 1, scope: !172)
!183 = !DILocation(line: 524, column: 12, scope: !172)
!184 = !DILocation(line: 409, column: 29, scope: !172)
!185 = distinct !{!185, !174, !186, !32}
!186 = !DILocation(line: 525, column: 1, scope: !172)
!187 = !DILocation(line: 526, column: 1, scope: !172)
!188 = !DILocation(line: 435, column: 18, scope: !172)
!189 = !DILocation(line: 445, column: 18, scope: !172)
!190 = !DILocation(line: 446, column: 19, scope: !172)
!191 = !DILocation(line: 448, column: 19, scope: !172)
!192 = !DILocation(line: 507, column: 18, scope: !172)
!193 = !DILocation(line: 510, column: 10, scope: !172)
!194 = !DILocation(line: 511, column: 1, scope: !172)
!195 = !DILocation(line: 519, column: 18, scope: !172)
!196 = !DILocation(line: 522, column: 10, scope: !172)
!197 = !DILocation(line: 0, scope: !172)
!198 = distinct !DISubprogram(name: "ink_compute_into", scope: !14, file: !14, line: 528, type: !15, scopeLine: 528, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!199 = !DILocation(line: 528, column: 151, scope: !198)
!200 = !DILocation(line: 529, column: 34, scope: !198)
!201 = !DILocation(line: 529, column: 100, scope: !198)
!202 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !204)
!203 = distinct !DISubprogram(name: "ink_copy", scope: !14, file: !14, line: 37, type: !15, scopeLine: 37, flags: DIFlagPrototyped, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!204 = distinct !DILocation(line: 529, column: 87, scope: !198)
!205 = !{!20, !20, i64 0}
!206 = !DILocation(line: 529, column: 145, scope: !198)
!207 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !208)
!208 = distinct !DILocation(line: 529, column: 132, scope: !198)
!209 = !DILocation(line: 529, column: 242, scope: !198)
!210 = !{!211, !211, i64 0}
!211 = !{!"long", !20, i64 0}
!212 = !DILocation(line: 529, column: 287, scope: !198)
!213 = !DILocation(line: 529, column: 290, scope: !198)
!214 = !DILocation(line: 409, column: 19, scope: !172, inlinedAt: !215)
!215 = distinct !DILocation(line: 529, column: 172, scope: !198)
!216 = !DILocation(line: 409, column: 1, scope: !172, inlinedAt: !215)
!217 = !DILocation(line: 410, column: 13, scope: !172, inlinedAt: !215)
!218 = !DILocation(line: 412, column: 13, scope: !172, inlinedAt: !215)
!219 = !DILocation(line: 452, column: 14, scope: !172, inlinedAt: !215)
!220 = !DILocation(line: 471, column: 10, scope: !172, inlinedAt: !215)
!221 = !DILocation(line: 471, column: 5, scope: !172, inlinedAt: !215)
!222 = !DILocation(line: 499, column: 10, scope: !172, inlinedAt: !215)
!223 = !DILocation(line: 499, column: 5, scope: !172, inlinedAt: !215)
!224 = !DILocation(line: 524, column: 1, scope: !172, inlinedAt: !215)
!225 = !DILocation(line: 524, column: 12, scope: !172, inlinedAt: !215)
!226 = !DILocation(line: 409, column: 29, scope: !172, inlinedAt: !215)
!227 = distinct !{!227, !216, !228, !32}
!228 = !DILocation(line: 525, column: 1, scope: !172, inlinedAt: !215)
!229 = !DILocation(line: 435, column: 18, scope: !172, inlinedAt: !215)
!230 = !DILocation(line: 445, column: 18, scope: !172, inlinedAt: !215)
!231 = !DILocation(line: 446, column: 19, scope: !172, inlinedAt: !215)
!232 = !DILocation(line: 448, column: 19, scope: !172, inlinedAt: !215)
!233 = !DILocation(line: 507, column: 18, scope: !172, inlinedAt: !215)
!234 = !DILocation(line: 510, column: 10, scope: !172, inlinedAt: !215)
!235 = !DILocation(line: 511, column: 1, scope: !172, inlinedAt: !215)
!236 = !DILocation(line: 519, column: 18, scope: !172, inlinedAt: !215)
!237 = !DILocation(line: 522, column: 10, scope: !172, inlinedAt: !215)
!238 = !DILocation(line: 0, scope: !172, inlinedAt: !215)
!239 = distinct !{!239, !216, !228, !32}
!240 = !DILocation(line: 530, column: 9, scope: !198)
!241 = !DILocation(line: 530, column: 30, scope: !198)
!242 = distinct !DISubprogram(name: "ink_compute_call", scope: !14, file: !14, line: 531, type: !15, scopeLine: 531, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!243 = !DILocation(line: 531, column: 142, scope: !242)
!244 = !DILocation(line: 532, column: 34, scope: !242)
!245 = !DILocation(line: 532, column: 100, scope: !242)
!246 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !247)
!247 = distinct !DILocation(line: 532, column: 87, scope: !242)
!248 = !DILocation(line: 532, column: 145, scope: !242)
!249 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !250)
!250 = distinct !DILocation(line: 532, column: 132, scope: !242)
!251 = !DILocation(line: 532, column: 250, scope: !242)
!252 = !DILocation(line: 532, column: 295, scope: !242)
!253 = !DILocation(line: 532, column: 185, scope: !242)
!254 = !DILocation(line: 532, column: 307, scope: !242)
!255 = !DILocation(line: 532, column: 306, scope: !242)
!256 = !DILocation(line: 533, column: 34, scope: !242)
!257 = !DILocation(line: 533, column: 79, scope: !242)
!258 = !DILocation(line: 533, column: 124, scope: !242)
!259 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !260)
!260 = distinct !DILocation(line: 533, column: 111, scope: !242)
!261 = !DILocation(line: 533, column: 169, scope: !242)
!262 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !263)
!263 = distinct !DILocation(line: 533, column: 156, scope: !242)
!264 = !DILocation(line: 533, column: 232, scope: !242)
!265 = !DILocation(line: 231, column: 7, scope: !122, inlinedAt: !266)
!266 = distinct !DILocation(line: 533, column: 205, scope: !242)
!267 = !DILocation(line: 231, column: 5, scope: !122, inlinedAt: !266)
!268 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !269)
!269 = distinct !DILocation(line: 533, column: 66, scope: !242)
!270 = !DILocation(line: 533, column: 229, scope: !242)
!271 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !272)
!272 = distinct !DILocation(line: 533, column: 21, scope: !242)
!273 = !DILocation(line: 533, column: 226, scope: !242)
!274 = !DILocation(line: 233, column: 16, scope: !122, inlinedAt: !266)
!275 = !DILocation(line: 243, column: 17, scope: !122, inlinedAt: !266)
!276 = !DILocation(line: 0, scope: !122, inlinedAt: !266)
!277 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !278)
!278 = distinct !DILocation(line: 533, column: 251, scope: !242)
!279 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !278)
!280 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !278)
!281 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !278)
!282 = !DILocation(line: 244, column: 18, scope: !122, inlinedAt: !266)
!283 = !DILocation(line: 246, column: 13, scope: !122, inlinedAt: !266)
!284 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !278)
!285 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !278)
!286 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !278)
!287 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !278)
!288 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !278)
!289 = !DILocation(line: 533, column: 251, scope: !242)
!290 = !DILocation(line: 533, column: 284, scope: !242)
!291 = !DILocation(line: 533, column: 299, scope: !242)
!292 = !DILocation(line: 534, column: 34, scope: !242)
!293 = !DILocation(line: 534, column: 79, scope: !242)
!294 = !DILocation(line: 534, column: 124, scope: !242)
!295 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !296)
!296 = distinct !DILocation(line: 534, column: 111, scope: !242)
!297 = !DILocation(line: 534, column: 169, scope: !242)
!298 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !299)
!299 = distinct !DILocation(line: 534, column: 156, scope: !242)
!300 = !DILocation(line: 534, column: 234, scope: !242)
!301 = !DILocation(line: 258, column: 7, scope: !131, inlinedAt: !302)
!302 = distinct !DILocation(line: 534, column: 205, scope: !242)
!303 = !DILocation(line: 258, column: 5, scope: !131, inlinedAt: !302)
!304 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !305)
!305 = distinct !DILocation(line: 534, column: 66, scope: !242)
!306 = !DILocation(line: 534, column: 231, scope: !242)
!307 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !308)
!308 = distinct !DILocation(line: 534, column: 21, scope: !242)
!309 = !DILocation(line: 534, column: 228, scope: !242)
!310 = !DILocation(line: 260, column: 16, scope: !131, inlinedAt: !302)
!311 = !DILocation(line: 270, column: 16, scope: !131, inlinedAt: !302)
!312 = !DILocation(line: 0, scope: !131, inlinedAt: !302)
!313 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !314)
!314 = distinct !DILocation(line: 534, column: 253, scope: !242)
!315 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !314)
!316 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !314)
!317 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !314)
!318 = !DILocation(line: 271, column: 17, scope: !131, inlinedAt: !302)
!319 = !DILocation(line: 273, column: 12, scope: !131, inlinedAt: !302)
!320 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !314)
!321 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !314)
!322 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !314)
!323 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !314)
!324 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !314)
!325 = !DILocation(line: 534, column: 253, scope: !242)
!326 = !DILocation(line: 534, column: 286, scope: !242)
!327 = !DILocation(line: 534, column: 301, scope: !242)
!328 = !DILocation(line: 535, column: 34, scope: !242)
!329 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !330)
!330 = distinct !DILocation(line: 535, column: 21, scope: !242)
!331 = !DILocation(line: 535, column: 79, scope: !242)
!332 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !333)
!333 = distinct !DILocation(line: 535, column: 66, scope: !242)
!334 = !DILocation(line: 535, column: 124, scope: !242)
!335 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !336)
!336 = distinct !DILocation(line: 535, column: 111, scope: !242)
!337 = !DILocation(line: 535, column: 169, scope: !242)
!338 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !339)
!339 = distinct !DILocation(line: 535, column: 156, scope: !242)
!340 = !DILocation(line: 535, column: 230, scope: !242)
!341 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !342)
!342 = distinct !DILocation(line: 535, column: 252, scope: !242)
!343 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !342)
!344 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !342)
!345 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !342)
!346 = !DILocation(line: 535, column: 227, scope: !242)
!347 = !DILocation(line: 535, column: 233, scope: !242)
!348 = !DILocation(line: 292, column: 9, scope: !140, inlinedAt: !349)
!349 = distinct !DILocation(line: 535, column: 205, scope: !242)
!350 = !DILocation(line: 292, column: 5, scope: !140, inlinedAt: !349)
!351 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !342)
!352 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !342)
!353 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !342)
!354 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !342)
!355 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !342)
!356 = !DILocation(line: 535, column: 252, scope: !242)
!357 = !DILocation(line: 535, column: 285, scope: !242)
!358 = !DILocation(line: 535, column: 300, scope: !242)
!359 = !DILocation(line: 536, column: 34, scope: !242)
!360 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !361)
!361 = distinct !DILocation(line: 536, column: 21, scope: !242)
!362 = !DILocation(line: 536, column: 79, scope: !242)
!363 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !364)
!364 = distinct !DILocation(line: 536, column: 66, scope: !242)
!365 = !DILocation(line: 536, column: 124, scope: !242)
!366 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !367)
!367 = distinct !DILocation(line: 536, column: 111, scope: !242)
!368 = !DILocation(line: 536, column: 169, scope: !242)
!369 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !370)
!370 = distinct !DILocation(line: 536, column: 156, scope: !242)
!371 = !DILocation(line: 536, column: 232, scope: !242)
!372 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !373)
!373 = distinct !DILocation(line: 536, column: 254, scope: !242)
!374 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !373)
!375 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !373)
!376 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !373)
!377 = !DILocation(line: 536, column: 229, scope: !242)
!378 = !DILocation(line: 536, column: 235, scope: !242)
!379 = !DILocation(line: 311, column: 9, scope: !144, inlinedAt: !380)
!380 = distinct !DILocation(line: 536, column: 205, scope: !242)
!381 = !DILocation(line: 311, column: 5, scope: !144, inlinedAt: !380)
!382 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !373)
!383 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !373)
!384 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !373)
!385 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !373)
!386 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !373)
!387 = !DILocation(line: 536, column: 254, scope: !242)
!388 = !DILocation(line: 536, column: 287, scope: !242)
!389 = !DILocation(line: 536, column: 302, scope: !242)
!390 = !DILocation(line: 537, column: 34, scope: !242)
!391 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !392)
!392 = distinct !DILocation(line: 537, column: 21, scope: !242)
!393 = !DILocation(line: 537, column: 79, scope: !242)
!394 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !395)
!395 = distinct !DILocation(line: 537, column: 66, scope: !242)
!396 = !DILocation(line: 537, column: 169, scope: !242)
!397 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !398)
!398 = distinct !DILocation(line: 537, column: 156, scope: !242)
!399 = !DILocation(line: 537, column: 226, scope: !242)
!400 = !DILocation(line: 537, column: 232, scope: !242)
!401 = !DILocation(line: 339, column: 9, scope: !148, inlinedAt: !402)
!402 = distinct !DILocation(line: 537, column: 205, scope: !242)
!403 = !DILocation(line: 0, scope: !148, inlinedAt: !402)
!404 = !DILocation(line: 339, column: 5, scope: !148, inlinedAt: !402)
!405 = !DILocation(line: 345, column: 5, scope: !148, inlinedAt: !402)
!406 = !DILocation(line: 347, column: 16, scope: !148, inlinedAt: !402)
!407 = !DILocation(line: 350, column: 8, scope: !148, inlinedAt: !402)
!408 = !DILocation(line: 351, column: 1, scope: !148, inlinedAt: !402)
!409 = !DILocation(line: 357, column: 5, scope: !148, inlinedAt: !402)
!410 = !DILocation(line: 359, column: 18, scope: !148, inlinedAt: !402)
!411 = !DILocation(line: 362, column: 9, scope: !148, inlinedAt: !402)
!412 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !413)
!413 = distinct !DILocation(line: 537, column: 251, scope: !242)
!414 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !413)
!415 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !413)
!416 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !413)
!417 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !413)
!418 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !413)
!419 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !413)
!420 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !413)
!421 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !413)
!422 = !DILocation(line: 537, column: 251, scope: !242)
!423 = !DILocation(line: 537, column: 284, scope: !242)
!424 = !DILocation(line: 537, column: 299, scope: !242)
!425 = !DILocation(line: 538, column: 34, scope: !242)
!426 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !427)
!427 = distinct !DILocation(line: 538, column: 21, scope: !242)
!428 = !DILocation(line: 538, column: 79, scope: !242)
!429 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !430)
!430 = distinct !DILocation(line: 538, column: 66, scope: !242)
!431 = !DILocation(line: 538, column: 169, scope: !242)
!432 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !433)
!433 = distinct !DILocation(line: 538, column: 156, scope: !242)
!434 = !DILocation(line: 538, column: 228, scope: !242)
!435 = !DILocation(line: 538, column: 234, scope: !242)
!436 = !DILocation(line: 374, column: 9, scope: !160, inlinedAt: !437)
!437 = distinct !DILocation(line: 538, column: 205, scope: !242)
!438 = !DILocation(line: 0, scope: !160, inlinedAt: !437)
!439 = !DILocation(line: 374, column: 5, scope: !160, inlinedAt: !437)
!440 = !DILocation(line: 380, column: 5, scope: !160, inlinedAt: !437)
!441 = !DILocation(line: 382, column: 16, scope: !160, inlinedAt: !437)
!442 = !DILocation(line: 385, column: 8, scope: !160, inlinedAt: !437)
!443 = !DILocation(line: 386, column: 1, scope: !160, inlinedAt: !437)
!444 = !DILocation(line: 392, column: 5, scope: !160, inlinedAt: !437)
!445 = !DILocation(line: 394, column: 16, scope: !160, inlinedAt: !437)
!446 = !DILocation(line: 397, column: 8, scope: !160, inlinedAt: !437)
!447 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !448)
!448 = distinct !DILocation(line: 538, column: 253, scope: !242)
!449 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !448)
!450 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !448)
!451 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !448)
!452 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !448)
!453 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !448)
!454 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !448)
!455 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !448)
!456 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !448)
!457 = !DILocation(line: 538, column: 253, scope: !242)
!458 = !DILocation(line: 538, column: 286, scope: !242)
!459 = !DILocation(line: 538, column: 301, scope: !242)
!460 = !DILocation(line: 539, column: 9, scope: !242)
!461 = !DILocation(line: 0, scope: !242)
!462 = !DILocation(line: 539, column: 21, scope: !242)
!463 = distinct !DISubprogram(name: "ink_compute_scalar32", scope: !14, file: !14, line: 540, type: !15, scopeLine: 540, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!464 = !DILocation(line: 540, column: 122, scope: !463)
!465 = !DILocation(line: 541, column: 34, scope: !463)
!466 = !DILocation(line: 541, column: 79, scope: !463)
!467 = !DILocation(line: 541, column: 124, scope: !463)
!468 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !469)
!469 = distinct !DILocation(line: 541, column: 111, scope: !463)
!470 = !DILocation(line: 541, column: 169, scope: !463)
!471 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !472)
!472 = distinct !DILocation(line: 541, column: 156, scope: !463)
!473 = !DILocation(line: 541, column: 232, scope: !463)
!474 = !DILocation(line: 231, column: 7, scope: !122, inlinedAt: !475)
!475 = distinct !DILocation(line: 541, column: 205, scope: !463)
!476 = !DILocation(line: 231, column: 5, scope: !122, inlinedAt: !475)
!477 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !478)
!478 = distinct !DILocation(line: 541, column: 66, scope: !463)
!479 = !DILocation(line: 541, column: 229, scope: !463)
!480 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !481)
!481 = distinct !DILocation(line: 541, column: 21, scope: !463)
!482 = !DILocation(line: 541, column: 226, scope: !463)
!483 = !DILocation(line: 233, column: 16, scope: !122, inlinedAt: !475)
!484 = !DILocation(line: 243, column: 17, scope: !122, inlinedAt: !475)
!485 = !DILocation(line: 0, scope: !122, inlinedAt: !475)
!486 = !DILocation(line: 244, column: 18, scope: !122, inlinedAt: !475)
!487 = !DILocation(line: 246, column: 13, scope: !122, inlinedAt: !475)
!488 = !DILocation(line: 542, column: 34, scope: !463)
!489 = !DILocation(line: 542, column: 79, scope: !463)
!490 = !DILocation(line: 542, column: 124, scope: !463)
!491 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !492)
!492 = distinct !DILocation(line: 542, column: 111, scope: !463)
!493 = !DILocation(line: 542, column: 169, scope: !463)
!494 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !495)
!495 = distinct !DILocation(line: 542, column: 156, scope: !463)
!496 = !DILocation(line: 542, column: 234, scope: !463)
!497 = !DILocation(line: 258, column: 7, scope: !131, inlinedAt: !498)
!498 = distinct !DILocation(line: 542, column: 205, scope: !463)
!499 = !DILocation(line: 258, column: 5, scope: !131, inlinedAt: !498)
!500 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !501)
!501 = distinct !DILocation(line: 542, column: 66, scope: !463)
!502 = !DILocation(line: 542, column: 231, scope: !463)
!503 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !504)
!504 = distinct !DILocation(line: 542, column: 21, scope: !463)
!505 = !DILocation(line: 542, column: 228, scope: !463)
!506 = !DILocation(line: 260, column: 16, scope: !131, inlinedAt: !498)
!507 = !DILocation(line: 270, column: 16, scope: !131, inlinedAt: !498)
!508 = !DILocation(line: 0, scope: !131, inlinedAt: !498)
!509 = !DILocation(line: 271, column: 17, scope: !131, inlinedAt: !498)
!510 = !DILocation(line: 273, column: 12, scope: !131, inlinedAt: !498)
!511 = !DILocation(line: 543, column: 34, scope: !463)
!512 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !513)
!513 = distinct !DILocation(line: 543, column: 21, scope: !463)
!514 = !DILocation(line: 543, column: 79, scope: !463)
!515 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !516)
!516 = distinct !DILocation(line: 543, column: 66, scope: !463)
!517 = !DILocation(line: 543, column: 124, scope: !463)
!518 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !519)
!519 = distinct !DILocation(line: 543, column: 111, scope: !463)
!520 = !DILocation(line: 543, column: 169, scope: !463)
!521 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !522)
!522 = distinct !DILocation(line: 543, column: 156, scope: !463)
!523 = !DILocation(line: 543, column: 227, scope: !463)
!524 = !DILocation(line: 543, column: 230, scope: !463)
!525 = !DILocation(line: 543, column: 233, scope: !463)
!526 = !DILocation(line: 292, column: 9, scope: !140, inlinedAt: !527)
!527 = distinct !DILocation(line: 543, column: 205, scope: !463)
!528 = !DILocation(line: 292, column: 5, scope: !140, inlinedAt: !527)
!529 = !DILocation(line: 544, column: 34, scope: !463)
!530 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !531)
!531 = distinct !DILocation(line: 544, column: 21, scope: !463)
!532 = !DILocation(line: 544, column: 79, scope: !463)
!533 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !534)
!534 = distinct !DILocation(line: 544, column: 66, scope: !463)
!535 = !DILocation(line: 544, column: 124, scope: !463)
!536 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !537)
!537 = distinct !DILocation(line: 544, column: 111, scope: !463)
!538 = !DILocation(line: 544, column: 169, scope: !463)
!539 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !540)
!540 = distinct !DILocation(line: 544, column: 156, scope: !463)
!541 = !DILocation(line: 544, column: 229, scope: !463)
!542 = !DILocation(line: 544, column: 232, scope: !463)
!543 = !DILocation(line: 544, column: 235, scope: !463)
!544 = !DILocation(line: 311, column: 9, scope: !144, inlinedAt: !545)
!545 = distinct !DILocation(line: 544, column: 205, scope: !463)
!546 = !DILocation(line: 311, column: 5, scope: !144, inlinedAt: !545)
!547 = !DILocation(line: 545, column: 34, scope: !463)
!548 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !549)
!549 = distinct !DILocation(line: 545, column: 21, scope: !463)
!550 = !DILocation(line: 545, column: 79, scope: !463)
!551 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !552)
!552 = distinct !DILocation(line: 545, column: 66, scope: !463)
!553 = !DILocation(line: 545, column: 169, scope: !463)
!554 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !555)
!555 = distinct !DILocation(line: 545, column: 156, scope: !463)
!556 = !DILocation(line: 545, column: 226, scope: !463)
!557 = !DILocation(line: 545, column: 232, scope: !463)
!558 = !DILocation(line: 339, column: 9, scope: !148, inlinedAt: !559)
!559 = distinct !DILocation(line: 545, column: 205, scope: !463)
!560 = !DILocation(line: 0, scope: !148, inlinedAt: !559)
!561 = !DILocation(line: 339, column: 5, scope: !148, inlinedAt: !559)
!562 = !DILocation(line: 345, column: 5, scope: !148, inlinedAt: !559)
!563 = !DILocation(line: 347, column: 16, scope: !148, inlinedAt: !559)
!564 = !DILocation(line: 350, column: 8, scope: !148, inlinedAt: !559)
!565 = !DILocation(line: 351, column: 1, scope: !148, inlinedAt: !559)
!566 = !DILocation(line: 357, column: 5, scope: !148, inlinedAt: !559)
!567 = !DILocation(line: 359, column: 18, scope: !148, inlinedAt: !559)
!568 = !DILocation(line: 362, column: 9, scope: !148, inlinedAt: !559)
!569 = !DILocation(line: 546, column: 34, scope: !463)
!570 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !571)
!571 = distinct !DILocation(line: 546, column: 21, scope: !463)
!572 = !DILocation(line: 546, column: 79, scope: !463)
!573 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !574)
!574 = distinct !DILocation(line: 546, column: 66, scope: !463)
!575 = !DILocation(line: 546, column: 169, scope: !463)
!576 = !DILocation(line: 37, column: 172, scope: !203, inlinedAt: !577)
!577 = distinct !DILocation(line: 546, column: 156, scope: !463)
!578 = !DILocation(line: 546, column: 228, scope: !463)
!579 = !DILocation(line: 546, column: 234, scope: !463)
!580 = !DILocation(line: 374, column: 9, scope: !160, inlinedAt: !581)
!581 = distinct !DILocation(line: 546, column: 205, scope: !463)
!582 = !DILocation(line: 0, scope: !160, inlinedAt: !581)
!583 = !DILocation(line: 374, column: 5, scope: !160, inlinedAt: !581)
!584 = !DILocation(line: 380, column: 5, scope: !160, inlinedAt: !581)
!585 = !DILocation(line: 382, column: 16, scope: !160, inlinedAt: !581)
!586 = !DILocation(line: 385, column: 8, scope: !160, inlinedAt: !581)
!587 = !DILocation(line: 386, column: 1, scope: !160, inlinedAt: !581)
!588 = !DILocation(line: 392, column: 5, scope: !160, inlinedAt: !581)
!589 = !DILocation(line: 394, column: 16, scope: !160, inlinedAt: !581)
!590 = !DILocation(line: 397, column: 8, scope: !160, inlinedAt: !581)
!591 = !DILocation(line: 547, column: 9, scope: !463)
!592 = !DILocation(line: 0, scope: !463)
!593 = !DILocation(line: 547, column: 30, scope: !463)
!594 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !14, file: !14, line: 548, type: !15, scopeLine: 548, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!595 = !DILocation(line: 549, column: 9, scope: !594)
