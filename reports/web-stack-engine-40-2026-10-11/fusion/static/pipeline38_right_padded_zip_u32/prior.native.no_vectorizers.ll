; ModuleID = '/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_u32/prior/cpu.c'
source_filename = "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_u32/prior/cpu.c"
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

; Function Attrs: argmemonly mustprogress nofree nosync nounwind willreturn
declare void @llvm.lifetime.start.p0i8(i64 immarg, i8* nocapture) #1

; Function Attrs: inaccessiblemem_or_argmemonly mustprogress nounwind willreturn
declare void @free(i8* nocapture noundef) local_unnamed_addr #2

; Function Attrs: argmemonly mustprogress nofree nosync nounwind willreturn
declare void @llvm.lifetime.end.p0i8(i64 immarg, i8* nocapture) #1

; Function Attrs: mustprogress nofree norecurse nosync nounwind readonly ssp uwtable willreturn
define i64 @ink_compute_mark() local_unnamed_addr #3 !dbg !34 {
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
  %16 = tail call i8* @malloc(i64 %15) #10, !dbg !61
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
define internal fastcc void @ink_fail() unnamed_addr #4 !dbg !72 {
  tail call void @abort() #11, !dbg !73
  unreachable, !dbg !73
}

; Function Attrs: inaccessiblememonly mustprogress nofree nounwind willreturn allocsize(0)
declare noalias noundef i8* @malloc(i64 noundef) local_unnamed_addr #5

; Function Attrs: nounwind ssp uwtable
define [2 x i64] @lang_fn_pipeline38_right_padded_zip_u32([2 x i64] %0, [2 x i64] %1, i32 %2, i32 %3) local_unnamed_addr #0 !dbg !74 {
  %5 = extractvalue [2 x i64] %0, 0
  %6 = inttoptr i64 %5 to i32*
  %7 = extractvalue [2 x i64] %0, 1
  %8 = extractvalue [2 x i64] %1, 0
  %9 = extractvalue [2 x i64] %1, 1
  %10 = icmp ugt i64 %7, 4611686018427387903, !dbg !75
  br i1 %10, label %11, label %12, !dbg !77

11:                                               ; preds = %4
  tail call fastcc void @ink_fail() #12, !dbg !78
  unreachable

12:                                               ; preds = %4
  %13 = icmp eq i64 %7, 0, !dbg !79
  %14 = shl nuw i64 %7, 2, !dbg !80
  %15 = select i1 %13, i64 4, i64 %14, !dbg !80
  %16 = icmp ugt i64 %15, -17, !dbg !81
  br i1 %16, label %17, label %18, !dbg !82

17:                                               ; preds = %12
  tail call fastcc void @ink_fail() #12, !dbg !83
  unreachable

18:                                               ; preds = %12
  %19 = add nuw i64 %15, 16, !dbg !84
  %20 = tail call i8* @malloc(i64 %19) #13, !dbg !85
  %21 = bitcast i8* %20 to %struct.ink_block*, !dbg !85
  %22 = icmp eq i8* %20, null, !dbg !86
  br i1 %22, label %23, label %24, !dbg !87

23:                                               ; preds = %18
  tail call fastcc void @ink_fail() #12, !dbg !88
  unreachable

24:                                               ; preds = %18
  %25 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !89, !tbaa !18
  %26 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %21, i64 0, i32 0, !dbg !90
  store %struct.ink_block* %25, %struct.ink_block** %26, align 8, !dbg !91, !tbaa !24
  store i8* %20, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !92, !tbaa !18
  %27 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %21, i64 1, !dbg !93
  %28 = bitcast %struct.ink_block* %27 to i32*, !dbg !94
  %29 = sub i32 0, %2
  br i1 %13, label %30, label %40, !dbg !95

30:                                               ; preds = %40, %24
  %31 = tail call i8* @malloc(i64 %19) #13, !dbg !96
  %32 = icmp eq i8* %31, null, !dbg !98
  br i1 %32, label %33, label %34, !dbg !99

33:                                               ; preds = %30
  tail call fastcc void @ink_fail() #12, !dbg !100
  unreachable

34:                                               ; preds = %30
  %35 = bitcast i8* %31 to %struct.ink_block*, !dbg !96
  %36 = bitcast i8* %31 to i8**, !dbg !101
  store i8* %20, i8** %36, align 8, !dbg !101, !tbaa !24
  store i8* %31, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !102, !tbaa !18
  %37 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %35, i64 1, !dbg !103
  %38 = bitcast %struct.ink_block* %37 to i8*, !dbg !104
  %39 = bitcast %struct.ink_block* %37 to i32*, !dbg !105
  br i1 %13, label %51, label %54, !dbg !106

40:                                               ; preds = %24, %40
  %41 = phi i64 [ %49, %40 ], [ 0, %24 ]
  %42 = trunc i64 %41 to i32, !dbg !107
  %43 = getelementptr inbounds i32, i32* %6, i64 %41, !dbg !108
  %44 = load i32, i32* %43, align 4, !dbg !108, !tbaa !109
  %45 = icmp ult i32 %42, %2, !dbg !111
  %46 = select i1 %45, i32 %3, i32 %29, !dbg !112
  %47 = add i32 %44, %46, !dbg !112
  %48 = getelementptr inbounds i32, i32* %28, i64 %41, !dbg !113
  store i32 %47, i32* %48, align 4, !dbg !114, !tbaa !109
  %49 = add nuw i64 %41, 1, !dbg !115
  %50 = icmp eq i64 %49, %7, !dbg !116
  br i1 %50, label %30, label %40, !dbg !95, !llvm.loop !117

51:                                               ; preds = %54, %34
  %52 = xor i64 %9, -1, !dbg !119
  %53 = icmp ugt i64 %7, %52, !dbg !120
  br i1 %53, label %67, label %68, !dbg !121

54:                                               ; preds = %34, %54
  %55 = phi i64 [ %65, %54 ], [ 0, %34 ]
  %56 = getelementptr inbounds i32, i32* %6, i64 %55, !dbg !122
  %57 = load i32, i32* %56, align 4, !dbg !122, !tbaa !109
  %58 = trunc i64 %55 to i32, !dbg !123
  %59 = urem i32 %58, 3, !dbg !124
  %60 = icmp eq i32 %59, 0, !dbg !125
  %61 = mul i32 %57, %3, !dbg !126
  %62 = add i32 %57, %2, !dbg !126
  %63 = select i1 %60, i32 %61, i32 %62, !dbg !126
  %64 = getelementptr inbounds i32, i32* %39, i64 %55, !dbg !127
  store i32 %63, i32* %64, align 4, !dbg !128, !tbaa !109
  %65 = add nuw i64 %55, 1, !dbg !129
  %66 = icmp eq i64 %65, %7, !dbg !130
  br i1 %66, label %51, label %54, !dbg !106, !llvm.loop !131

67:                                               ; preds = %51
  tail call fastcc void @ink_fail(), !dbg !133
  unreachable

68:                                               ; preds = %51
  %69 = add i64 %9, %7, !dbg !134
  %70 = icmp ugt i64 %69, 4611686018427387903, !dbg !135
  br i1 %70, label %71, label %72, !dbg !137

71:                                               ; preds = %68
  tail call fastcc void @ink_fail() #12, !dbg !138
  unreachable

72:                                               ; preds = %68
  %73 = icmp eq i64 %69, 0, !dbg !139
  %74 = shl nuw i64 %69, 2, !dbg !140
  %75 = select i1 %73, i64 4, i64 %74, !dbg !140
  %76 = icmp ugt i64 %75, -17, !dbg !141
  br i1 %76, label %77, label %78, !dbg !142

77:                                               ; preds = %72
  tail call fastcc void @ink_fail() #12, !dbg !143
  unreachable

78:                                               ; preds = %72
  %79 = add nuw i64 %75, 16, !dbg !144
  %80 = tail call i8* @malloc(i64 %79) #13, !dbg !145
  %81 = icmp eq i8* %80, null, !dbg !146
  br i1 %81, label %82, label %83, !dbg !147

82:                                               ; preds = %78
  tail call fastcc void @ink_fail() #12, !dbg !148
  unreachable

83:                                               ; preds = %78
  %84 = bitcast i8* %80 to %struct.ink_block*, !dbg !145
  %85 = bitcast i8* %80 to i8**, !dbg !149
  store i8* %31, i8** %85, align 8, !dbg !149, !tbaa !24
  store i8* %80, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !150, !tbaa !18
  %86 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %84, i64 1, !dbg !151
  %87 = bitcast %struct.ink_block* %86 to i32*, !dbg !152
  br i1 %13, label %90, label %88, !dbg !153

88:                                               ; preds = %83
  %89 = bitcast %struct.ink_block* %86 to i8*, !dbg !156
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* nonnull align 1 %89, i8* nonnull align 1 %38, i64 %14, i1 false), !dbg !157
  br label %90, !dbg !158

90:                                               ; preds = %88, %83
  %91 = getelementptr inbounds i32, i32* %87, i64 %7, !dbg !158
  %92 = bitcast i32* %91 to i8*, !dbg !159
  %93 = inttoptr i64 %8 to i8*, !dbg !160
  %94 = shl i64 %9, 2, !dbg !161
  %95 = icmp eq i64 %94, 0, !dbg !162
  br i1 %95, label %103, label %96, !dbg !164

96:                                               ; preds = %90, %96
  %97 = phi i64 [ %101, %96 ], [ 0, %90 ]
  %98 = getelementptr inbounds i8, i8* %93, i64 %97, !dbg !165
  %99 = load i8, i8* %98, align 1, !dbg !165, !tbaa !166
  %100 = getelementptr inbounds i8, i8* %92, i64 %97, !dbg !167
  store i8 %99, i8* %100, align 1, !dbg !168, !tbaa !166
  %101 = add nuw i64 %97, 1, !dbg !169
  %102 = icmp eq i64 %101, %94, !dbg !162
  br i1 %102, label %103, label %96, !dbg !164, !llvm.loop !170

103:                                              ; preds = %96, %90
  %104 = icmp ult i64 %7, %69, !dbg !172
  %105 = select i1 %104, i64 %7, i64 %69, !dbg !173
  %106 = icmp ugt i64 %105, 4611686018427387903, !dbg !174
  br i1 %106, label %107, label %108, !dbg !176

107:                                              ; preds = %103
  tail call fastcc void @ink_fail() #12, !dbg !177
  unreachable

108:                                              ; preds = %103
  %109 = icmp eq i64 %105, 0, !dbg !178
  %110 = shl nuw i64 %105, 2, !dbg !179
  %111 = select i1 %109, i64 4, i64 %110, !dbg !179
  %112 = icmp ugt i64 %111, -17, !dbg !180
  br i1 %112, label %113, label %114, !dbg !181

113:                                              ; preds = %108
  tail call fastcc void @ink_fail() #12, !dbg !182
  unreachable

114:                                              ; preds = %108
  %115 = add nuw i64 %111, 16, !dbg !183
  %116 = tail call i8* @malloc(i64 %115) #13, !dbg !184
  %117 = icmp eq i8* %116, null, !dbg !185
  br i1 %117, label %118, label %119, !dbg !186

118:                                              ; preds = %114
  tail call fastcc void @ink_fail() #12, !dbg !187
  unreachable

119:                                              ; preds = %114
  %120 = bitcast i8* %116 to %struct.ink_block*, !dbg !184
  %121 = bitcast i8* %116 to i8**, !dbg !188
  store i8* %80, i8** %121, align 8, !dbg !188, !tbaa !24
  store i8* %116, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !189, !tbaa !18
  %122 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %120, i64 1, !dbg !190
  %123 = bitcast %struct.ink_block* %122 to i32*, !dbg !191
  br i1 %109, label %124, label %128, !dbg !192

124:                                              ; preds = %128, %119
  %125 = ptrtoint %struct.ink_block* %122 to i64, !dbg !193
  %126 = insertvalue [2 x i64] undef, i64 %125, 0, !dbg !193
  %127 = insertvalue [2 x i64] %126, i64 %105, 1, !dbg !193
  ret [2 x i64] %127, !dbg !193

128:                                              ; preds = %119, %128
  %129 = phi i64 [ %141, %128 ], [ 0, %119 ]
  %130 = getelementptr inbounds i32, i32* %28, i64 %129, !dbg !194
  %131 = load i32, i32* %130, align 4, !dbg !194, !tbaa !109
  %132 = getelementptr inbounds i32, i32* %87, i64 %129, !dbg !195
  %133 = load i32, i32* %132, align 4, !dbg !195, !tbaa !109
  %134 = icmp ult i32 %131, %133, !dbg !196
  %135 = mul i32 %133, %3, !dbg !197
  %136 = add i32 %135, %131, !dbg !197
  %137 = add i32 %131, %2, !dbg !197
  %138 = sub i32 %137, %133, !dbg !197
  %139 = select i1 %134, i32 %136, i32 %138, !dbg !197
  %140 = getelementptr inbounds i32, i32* %123, i64 %129, !dbg !198
  store i32 %139, i32* %140, align 4, !dbg !199, !tbaa !109
  %141 = add nuw i64 %129, 1, !dbg !200
  %142 = icmp eq i64 %141, %105, !dbg !201
  br i1 %142, label %124, label %128, !dbg !192, !llvm.loop !202
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_left_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #6 !dbg !204 {
  %5 = icmp ult i32 %0, %2, !dbg !205
  %6 = sub i32 0, %2, !dbg !206
  %7 = select i1 %5, i32 %3, i32 %6, !dbg !206
  %8 = add i32 %7, %1, !dbg !206
  ret i32 %8, !dbg !207
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_right_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #6 !dbg !208 {
  %5 = urem i32 %0, 3, !dbg !209
  %6 = icmp eq i32 %5, 0, !dbg !210
  %7 = mul i32 %3, %1, !dbg !211
  %8 = add i32 %2, %1, !dbg !211
  %9 = select i1 %6, i32 %7, i32 %8, !dbg !211
  ret i32 %9, !dbg !212
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_pair_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #6 !dbg !213 {
  %5 = icmp ult i32 %0, %1, !dbg !214
  %6 = mul i32 %3, %1, !dbg !215
  %7 = add i32 %6, %0, !dbg !215
  %8 = sub i32 %0, %1, !dbg !215
  %9 = add i32 %8, %2, !dbg !215
  %10 = select i1 %5, i32 %7, i32 %9, !dbg !215
  ret i32 %10, !dbg !216
}

; Function Attrs: nounwind ssp uwtable
define i64 @lang_fn_pipeline38_right_padded_zip_u32_into([2 x i64] %0, [2 x i64] %1, i32 %2, i32 %3, i32* nocapture %4) local_unnamed_addr #0 !dbg !217 {
  %6 = extractvalue [2 x i64] %0, 0
  %7 = inttoptr i64 %6 to i32*
  %8 = extractvalue [2 x i64] %0, 1
  %9 = extractvalue [2 x i64] %1, 0
  %10 = extractvalue [2 x i64] %1, 1
  %11 = icmp ugt i64 %8, 4611686018427387903, !dbg !218
  br i1 %11, label %12, label %13, !dbg !220

12:                                               ; preds = %5
  tail call fastcc void @ink_fail() #12, !dbg !221
  unreachable

13:                                               ; preds = %5
  %14 = icmp eq i64 %8, 0, !dbg !222
  %15 = shl nuw i64 %8, 2, !dbg !223
  %16 = select i1 %14, i64 4, i64 %15, !dbg !223
  %17 = icmp ugt i64 %16, -17, !dbg !224
  br i1 %17, label %18, label %19, !dbg !225

18:                                               ; preds = %13
  tail call fastcc void @ink_fail() #12, !dbg !226
  unreachable

19:                                               ; preds = %13
  %20 = add nuw i64 %16, 16, !dbg !227
  %21 = tail call i8* @malloc(i64 %20) #13, !dbg !228
  %22 = bitcast i8* %21 to %struct.ink_block*, !dbg !228
  %23 = icmp eq i8* %21, null, !dbg !229
  br i1 %23, label %24, label %25, !dbg !230

24:                                               ; preds = %19
  tail call fastcc void @ink_fail() #12, !dbg !231
  unreachable

25:                                               ; preds = %19
  %26 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !232, !tbaa !18
  %27 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %22, i64 0, i32 0, !dbg !233
  store %struct.ink_block* %26, %struct.ink_block** %27, align 8, !dbg !234, !tbaa !24
  store i8* %21, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !235, !tbaa !18
  %28 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %22, i64 1, !dbg !236
  %29 = bitcast %struct.ink_block* %28 to i32*, !dbg !237
  %30 = sub i32 0, %2
  br i1 %14, label %31, label %41, !dbg !238

31:                                               ; preds = %41, %25
  %32 = tail call i8* @malloc(i64 %20) #13, !dbg !239
  %33 = icmp eq i8* %32, null, !dbg !241
  br i1 %33, label %34, label %35, !dbg !242

34:                                               ; preds = %31
  tail call fastcc void @ink_fail() #12, !dbg !243
  unreachable

35:                                               ; preds = %31
  %36 = bitcast i8* %32 to %struct.ink_block*, !dbg !239
  %37 = bitcast i8* %32 to i8**, !dbg !244
  store i8* %21, i8** %37, align 8, !dbg !244, !tbaa !24
  store i8* %32, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !245, !tbaa !18
  %38 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %36, i64 1, !dbg !246
  %39 = bitcast %struct.ink_block* %38 to i8*, !dbg !247
  %40 = bitcast %struct.ink_block* %38 to i32*, !dbg !248
  br i1 %14, label %52, label %55, !dbg !249

41:                                               ; preds = %25, %41
  %42 = phi i64 [ %50, %41 ], [ 0, %25 ]
  %43 = trunc i64 %42 to i32, !dbg !250
  %44 = getelementptr inbounds i32, i32* %7, i64 %42, !dbg !251
  %45 = load i32, i32* %44, align 4, !dbg !251, !tbaa !109
  %46 = icmp ult i32 %43, %2, !dbg !252
  %47 = select i1 %46, i32 %3, i32 %30, !dbg !253
  %48 = add i32 %45, %47, !dbg !253
  %49 = getelementptr inbounds i32, i32* %29, i64 %42, !dbg !254
  store i32 %48, i32* %49, align 4, !dbg !255, !tbaa !109
  %50 = add nuw i64 %42, 1, !dbg !256
  %51 = icmp eq i64 %50, %8, !dbg !257
  br i1 %51, label %31, label %41, !dbg !238, !llvm.loop !258

52:                                               ; preds = %55, %35
  %53 = xor i64 %10, -1, !dbg !260
  %54 = icmp ugt i64 %8, %53, !dbg !261
  br i1 %54, label %68, label %69, !dbg !262

55:                                               ; preds = %35, %55
  %56 = phi i64 [ %66, %55 ], [ 0, %35 ]
  %57 = getelementptr inbounds i32, i32* %7, i64 %56, !dbg !263
  %58 = load i32, i32* %57, align 4, !dbg !263, !tbaa !109
  %59 = trunc i64 %56 to i32, !dbg !264
  %60 = urem i32 %59, 3, !dbg !265
  %61 = icmp eq i32 %60, 0, !dbg !266
  %62 = mul i32 %58, %3, !dbg !267
  %63 = add i32 %58, %2, !dbg !267
  %64 = select i1 %61, i32 %62, i32 %63, !dbg !267
  %65 = getelementptr inbounds i32, i32* %40, i64 %56, !dbg !268
  store i32 %64, i32* %65, align 4, !dbg !269, !tbaa !109
  %66 = add nuw i64 %56, 1, !dbg !270
  %67 = icmp eq i64 %66, %8, !dbg !271
  br i1 %67, label %52, label %55, !dbg !249, !llvm.loop !272

68:                                               ; preds = %52
  tail call fastcc void @ink_fail(), !dbg !274
  unreachable

69:                                               ; preds = %52
  %70 = add i64 %10, %8, !dbg !275
  %71 = icmp ugt i64 %70, 4611686018427387903, !dbg !276
  br i1 %71, label %72, label %73, !dbg !278

72:                                               ; preds = %69
  tail call fastcc void @ink_fail() #12, !dbg !279
  unreachable

73:                                               ; preds = %69
  %74 = icmp eq i64 %70, 0, !dbg !280
  %75 = shl nuw i64 %70, 2, !dbg !281
  %76 = select i1 %74, i64 4, i64 %75, !dbg !281
  %77 = icmp ugt i64 %76, -17, !dbg !282
  br i1 %77, label %78, label %79, !dbg !283

78:                                               ; preds = %73
  tail call fastcc void @ink_fail() #12, !dbg !284
  unreachable

79:                                               ; preds = %73
  %80 = add nuw i64 %76, 16, !dbg !285
  %81 = tail call i8* @malloc(i64 %80) #13, !dbg !286
  %82 = icmp eq i8* %81, null, !dbg !287
  br i1 %82, label %83, label %84, !dbg !288

83:                                               ; preds = %79
  tail call fastcc void @ink_fail() #12, !dbg !289
  unreachable

84:                                               ; preds = %79
  %85 = bitcast i8* %81 to %struct.ink_block*, !dbg !286
  %86 = bitcast i8* %81 to i8**, !dbg !290
  store i8* %32, i8** %86, align 8, !dbg !290, !tbaa !24
  store i8* %81, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !291, !tbaa !18
  %87 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %85, i64 1, !dbg !292
  %88 = bitcast %struct.ink_block* %87 to i32*, !dbg !293
  br i1 %14, label %91, label %89, !dbg !294

89:                                               ; preds = %84
  %90 = bitcast %struct.ink_block* %87 to i8*, !dbg !296
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* nonnull align 1 %90, i8* nonnull align 1 %39, i64 %15, i1 false), !dbg !297
  br label %91, !dbg !298

91:                                               ; preds = %89, %84
  %92 = getelementptr inbounds i32, i32* %88, i64 %8, !dbg !298
  %93 = bitcast i32* %92 to i8*, !dbg !299
  %94 = inttoptr i64 %9 to i8*, !dbg !300
  %95 = shl i64 %10, 2, !dbg !301
  %96 = icmp eq i64 %95, 0, !dbg !302
  br i1 %96, label %104, label %97, !dbg !304

97:                                               ; preds = %91, %97
  %98 = phi i64 [ %102, %97 ], [ 0, %91 ]
  %99 = getelementptr inbounds i8, i8* %94, i64 %98, !dbg !305
  %100 = load i8, i8* %99, align 1, !dbg !305, !tbaa !166
  %101 = getelementptr inbounds i8, i8* %93, i64 %98, !dbg !306
  store i8 %100, i8* %101, align 1, !dbg !307, !tbaa !166
  %102 = add nuw i64 %98, 1, !dbg !308
  %103 = icmp eq i64 %102, %95, !dbg !302
  br i1 %103, label %104, label %97, !dbg !304, !llvm.loop !309

104:                                              ; preds = %97, %91
  %105 = icmp ult i64 %8, %70, !dbg !311
  %106 = select i1 %105, i64 %8, i64 %70, !dbg !312
  %107 = icmp eq i64 %106, 0, !dbg !313
  br i1 %107, label %108, label %109, !dbg !314

108:                                              ; preds = %109, %104
  ret i64 %106, !dbg !315

109:                                              ; preds = %104, %109
  %110 = phi i64 [ %122, %109 ], [ 0, %104 ]
  %111 = getelementptr inbounds i32, i32* %29, i64 %110, !dbg !316
  %112 = load i32, i32* %111, align 4, !dbg !316, !tbaa !109
  %113 = getelementptr inbounds i32, i32* %88, i64 %110, !dbg !317
  %114 = load i32, i32* %113, align 4, !dbg !317, !tbaa !109
  %115 = icmp ult i32 %112, %114, !dbg !318
  %116 = mul i32 %114, %3, !dbg !319
  %117 = add i32 %116, %112, !dbg !319
  %118 = add i32 %112, %2, !dbg !319
  %119 = sub i32 %118, %114, !dbg !319
  %120 = select i1 %115, i32 %117, i32 %119, !dbg !319
  %121 = getelementptr inbounds i32, i32* %4, i64 %110, !dbg !320
  store i32 %120, i32* %121, align 4, !dbg !321, !tbaa !109
  %122 = add nuw i64 %110, 1, !dbg !322
  %123 = icmp eq i64 %122, %106, !dbg !313
  br i1 %123, label %108, label %109, !dbg !314, !llvm.loop !323
}

; Function Attrs: nounwind ssp uwtable
define i64 @ink_compute_into(i32 %0, i8** nocapture readonly %1, i64* nocapture readonly %2, i8* nocapture %3) local_unnamed_addr #0 !dbg !325 {
  %5 = icmp eq i32 %0, 0, !dbg !326
  br i1 %5, label %6, label %31, !dbg !326

6:                                                ; preds = %4
  %7 = bitcast i8** %1 to i32**, !dbg !327
  %8 = load i32*, i32** %7, align 8, !dbg !327, !tbaa !18
  %9 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !328
  %10 = bitcast i8** %9 to i32**, !dbg !328
  %11 = load i32*, i32** %10, align 8, !dbg !328, !tbaa !18
  %12 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !329
  %13 = bitcast i8** %12 to i32**, !dbg !329
  %14 = load i32*, i32** %13, align 8, !dbg !329, !tbaa !18
  %15 = load i32, i32* %14, align 1, !dbg !330
  %16 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !332
  %17 = bitcast i8** %16 to i32**, !dbg !332
  %18 = load i32*, i32** %17, align 8, !dbg !332, !tbaa !18
  %19 = load i32, i32* %18, align 1, !dbg !333
  %20 = load i64, i64* %2, align 8, !dbg !335, !tbaa !336
  %21 = getelementptr inbounds i64, i64* %2, i64 1, !dbg !338
  %22 = load i64, i64* %21, align 8, !dbg !338, !tbaa !336
  %23 = bitcast i8* %3 to i32*, !dbg !339
  %24 = ptrtoint i32* %8 to i64, !dbg !340
  %25 = insertvalue [2 x i64] undef, i64 %24, 0, !dbg !340
  %26 = insertvalue [2 x i64] %25, i64 %20, 1, !dbg !340
  %27 = ptrtoint i32* %11 to i64, !dbg !340
  %28 = insertvalue [2 x i64] undef, i64 %27, 0, !dbg !340
  %29 = insertvalue [2 x i64] %28, i64 %22, 1, !dbg !340
  %30 = tail call i64 @lang_fn_pipeline38_right_padded_zip_u32_into([2 x i64] %26, [2 x i64] %29, i32 %15, i32 %19, i32* %23), !dbg !340
  ret i64 %30, !dbg !341

31:                                               ; preds = %4
  tail call fastcc void @ink_fail(), !dbg !342
  unreachable
}

; Function Attrs: nounwind ssp uwtable
define void @ink_compute_call(i32 %0, i8** nocapture readonly %1, i64* nocapture readonly %2, i8** nocapture %3, i64* nocapture %4) local_unnamed_addr #0 !dbg !343 {
  %6 = alloca i32, align 4
  %7 = bitcast i32* %6 to i8*
  %8 = alloca i32, align 4
  %9 = bitcast i32* %8 to i8*
  %10 = alloca i32, align 4
  %11 = bitcast i32* %10 to i8*
  switch i32 %0, label %135 [
    i32 0, label %12
    i32 1, label %39
    i32 2, label %70
    i32 3, label %102
  ], !dbg !344

12:                                               ; preds = %5
  %13 = bitcast i8** %1 to i32**, !dbg !345
  %14 = load i32*, i32** %13, align 8, !dbg !345, !tbaa !18
  %15 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !346
  %16 = bitcast i8** %15 to i32**, !dbg !346
  %17 = load i32*, i32** %16, align 8, !dbg !346, !tbaa !18
  %18 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !347
  %19 = bitcast i8** %18 to i32**, !dbg !347
  %20 = load i32*, i32** %19, align 8, !dbg !347, !tbaa !18
  %21 = load i32, i32* %20, align 1, !dbg !348
  %22 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !350
  %23 = bitcast i8** %22 to i32**, !dbg !350
  %24 = load i32*, i32** %23, align 8, !dbg !350, !tbaa !18
  %25 = load i32, i32* %24, align 1, !dbg !351
  %26 = load i64, i64* %2, align 8, !dbg !353, !tbaa !336
  %27 = getelementptr inbounds i64, i64* %2, i64 1, !dbg !354
  %28 = load i64, i64* %27, align 8, !dbg !354, !tbaa !336
  %29 = ptrtoint i32* %14 to i64, !dbg !355
  %30 = insertvalue [2 x i64] undef, i64 %29, 0, !dbg !355
  %31 = insertvalue [2 x i64] %30, i64 %26, 1, !dbg !355
  %32 = ptrtoint i32* %17 to i64, !dbg !355
  %33 = insertvalue [2 x i64] undef, i64 %32, 0, !dbg !355
  %34 = insertvalue [2 x i64] %33, i64 %28, 1, !dbg !355
  %35 = tail call [2 x i64] @lang_fn_pipeline38_right_padded_zip_u32([2 x i64] %31, [2 x i64] %34, i32 %21, i32 %25), !dbg !355
  %36 = extractvalue [2 x i64] %35, 0, !dbg !355
  %37 = extractvalue [2 x i64] %35, 1, !dbg !355
  %38 = inttoptr i64 %36 to i8*, !dbg !356
  store i8* %38, i8** %3, align 8, !dbg !357, !tbaa !18
  store i64 %37, i64* %4, align 8, !dbg !358, !tbaa !336
  br label %136

39:                                               ; preds = %5
  call void @llvm.lifetime.start.p0i8(i64 4, i8* nonnull %7) #12, !dbg !359
  %40 = bitcast i8** %1 to i32**, !dbg !360
  %41 = load i32*, i32** %40, align 8, !dbg !360, !tbaa !18
  %42 = load i32, i32* %41, align 1, !dbg !361
  store i32 %42, i32* %6, align 4, !dbg !361
  %43 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !363
  %44 = bitcast i8** %43 to i32**, !dbg !363
  %45 = load i32*, i32** %44, align 8, !dbg !363, !tbaa !18
  %46 = load i32, i32* %45, align 1, !dbg !364
  %47 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !366
  %48 = bitcast i8** %47 to i32**, !dbg !366
  %49 = load i32*, i32** %48, align 8, !dbg !366, !tbaa !18
  %50 = load i32, i32* %49, align 1, !dbg !367
  %51 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !369
  %52 = bitcast i8** %51 to i32**, !dbg !369
  %53 = load i32*, i32** %52, align 8, !dbg !369, !tbaa !18
  %54 = load i32, i32* %53, align 1, !dbg !370
  %55 = load i32, i32* %6, align 4, !dbg !372, !tbaa !109
  %56 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #13, !dbg !373
  %57 = bitcast i8* %56 to %struct.ink_block*, !dbg !373
  %58 = icmp eq i8* %56, null, !dbg !375
  br i1 %58, label %59, label %60, !dbg !376

59:                                               ; preds = %39
  tail call fastcc void @ink_fail() #12, !dbg !377
  unreachable

60:                                               ; preds = %39
  %61 = icmp ult i32 %55, %50, !dbg !378
  %62 = sub i32 0, %50, !dbg !380
  %63 = select i1 %61, i32 %54, i32 %62, !dbg !380
  %64 = add i32 %63, %46, !dbg !380
  %65 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !381, !tbaa !18
  %66 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %57, i64 0, i32 0, !dbg !382
  store %struct.ink_block* %65, %struct.ink_block** %66, align 8, !dbg !383, !tbaa !24
  store i8* %56, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !384, !tbaa !18
  %67 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %57, i64 1, !dbg !385
  %68 = bitcast %struct.ink_block* %67 to i32*, !dbg !386
  store i32 %64, i32* %68, align 4, !dbg !387, !tbaa !109
  %69 = bitcast i8** %3 to %struct.ink_block**, !dbg !388
  store %struct.ink_block* %67, %struct.ink_block** %69, align 8, !dbg !388, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !389, !tbaa !336
  call void @llvm.lifetime.end.p0i8(i64 4, i8* nonnull %7) #12, !dbg !390
  br label %136

70:                                               ; preds = %5
  call void @llvm.lifetime.start.p0i8(i64 4, i8* nonnull %9) #12, !dbg !391
  %71 = bitcast i8** %1 to i32**, !dbg !392
  %72 = load i32*, i32** %71, align 8, !dbg !392, !tbaa !18
  %73 = load i32, i32* %72, align 1, !dbg !393
  store i32 %73, i32* %8, align 4, !dbg !393
  %74 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !395
  %75 = bitcast i8** %74 to i32**, !dbg !395
  %76 = load i32*, i32** %75, align 8, !dbg !395, !tbaa !18
  %77 = load i32, i32* %76, align 1, !dbg !396
  %78 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !398
  %79 = bitcast i8** %78 to i32**, !dbg !398
  %80 = load i32*, i32** %79, align 8, !dbg !398, !tbaa !18
  %81 = load i32, i32* %80, align 1, !dbg !399
  %82 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !401
  %83 = bitcast i8** %82 to i32**, !dbg !401
  %84 = load i32*, i32** %83, align 8, !dbg !401, !tbaa !18
  %85 = load i32, i32* %84, align 1, !dbg !402
  %86 = load i32, i32* %8, align 4, !dbg !404, !tbaa !109
  %87 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #13, !dbg !405
  %88 = bitcast i8* %87 to %struct.ink_block*, !dbg !405
  %89 = icmp eq i8* %87, null, !dbg !407
  br i1 %89, label %90, label %91, !dbg !408

90:                                               ; preds = %70
  tail call fastcc void @ink_fail() #12, !dbg !409
  unreachable

91:                                               ; preds = %70
  %92 = urem i32 %86, 3, !dbg !410
  %93 = icmp eq i32 %92, 0, !dbg !412
  %94 = mul i32 %85, %77, !dbg !413
  %95 = add i32 %81, %77, !dbg !413
  %96 = select i1 %93, i32 %94, i32 %95, !dbg !413
  %97 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !414, !tbaa !18
  %98 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %88, i64 0, i32 0, !dbg !415
  store %struct.ink_block* %97, %struct.ink_block** %98, align 8, !dbg !416, !tbaa !24
  store i8* %87, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !417, !tbaa !18
  %99 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %88, i64 1, !dbg !418
  %100 = bitcast %struct.ink_block* %99 to i32*, !dbg !419
  store i32 %96, i32* %100, align 4, !dbg !420, !tbaa !109
  %101 = bitcast i8** %3 to %struct.ink_block**, !dbg !421
  store %struct.ink_block* %99, %struct.ink_block** %101, align 8, !dbg !421, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !422, !tbaa !336
  call void @llvm.lifetime.end.p0i8(i64 4, i8* nonnull %9) #12, !dbg !423
  br label %136

102:                                              ; preds = %5
  call void @llvm.lifetime.start.p0i8(i64 4, i8* nonnull %11) #12, !dbg !424
  %103 = bitcast i8** %1 to i32**, !dbg !425
  %104 = load i32*, i32** %103, align 8, !dbg !425, !tbaa !18
  %105 = load i32, i32* %104, align 1, !dbg !426
  store i32 %105, i32* %10, align 4, !dbg !426
  %106 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !428
  %107 = bitcast i8** %106 to i32**, !dbg !428
  %108 = load i32*, i32** %107, align 8, !dbg !428, !tbaa !18
  %109 = load i32, i32* %108, align 1, !dbg !429
  %110 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !431
  %111 = bitcast i8** %110 to i32**, !dbg !431
  %112 = load i32*, i32** %111, align 8, !dbg !431, !tbaa !18
  %113 = load i32, i32* %112, align 1, !dbg !432
  %114 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !434
  %115 = bitcast i8** %114 to i32**, !dbg !434
  %116 = load i32*, i32** %115, align 8, !dbg !434, !tbaa !18
  %117 = load i32, i32* %116, align 1, !dbg !435
  %118 = load i32, i32* %10, align 4, !dbg !437, !tbaa !109
  %119 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #13, !dbg !438
  %120 = bitcast i8* %119 to %struct.ink_block*, !dbg !438
  %121 = icmp eq i8* %119, null, !dbg !440
  br i1 %121, label %122, label %123, !dbg !441

122:                                              ; preds = %102
  tail call fastcc void @ink_fail() #12, !dbg !442
  unreachable

123:                                              ; preds = %102
  %124 = icmp ult i32 %118, %109, !dbg !443
  %125 = mul i32 %117, %109, !dbg !445
  %126 = add i32 %125, %118, !dbg !445
  %127 = sub i32 %118, %109, !dbg !445
  %128 = add i32 %127, %113, !dbg !445
  %129 = select i1 %124, i32 %126, i32 %128, !dbg !445
  %130 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !446, !tbaa !18
  %131 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %120, i64 0, i32 0, !dbg !447
  store %struct.ink_block* %130, %struct.ink_block** %131, align 8, !dbg !448, !tbaa !24
  store i8* %119, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !449, !tbaa !18
  %132 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %120, i64 1, !dbg !450
  %133 = bitcast %struct.ink_block* %132 to i32*, !dbg !451
  store i32 %129, i32* %133, align 4, !dbg !452, !tbaa !109
  %134 = bitcast i8** %3 to %struct.ink_block**, !dbg !453
  store %struct.ink_block* %132, %struct.ink_block** %134, align 8, !dbg !453, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !454, !tbaa !336
  call void @llvm.lifetime.end.p0i8(i64 4, i8* nonnull %11) #12, !dbg !455
  br label %136

135:                                              ; preds = %5
  tail call fastcc void @ink_fail(), !dbg !456
  unreachable

136:                                              ; preds = %123, %91, %60, %12
  ret void, !dbg !457
}

; Function Attrs: nounwind ssp uwtable
define i32 @ink_compute_scalar32(i32 %0, i8** nocapture readonly %1, i64* nocapture readnone %2) local_unnamed_addr #0 !dbg !458 {
  %4 = alloca i32, align 4
  %5 = bitcast i32* %4 to i8*
  %6 = alloca i32, align 4
  %7 = bitcast i32* %6 to i8*
  %8 = alloca i32, align 4
  %9 = bitcast i32* %8 to i8*
  switch i32 %0, label %76 [
    i32 1, label %10
    i32 2, label %31
    i32 3, label %53
  ], !dbg !459

10:                                               ; preds = %3
  call void @llvm.lifetime.start.p0i8(i64 4, i8* nonnull %5) #12, !dbg !460
  %11 = bitcast i8** %1 to i32**, !dbg !461
  %12 = load i32*, i32** %11, align 8, !dbg !461, !tbaa !18
  %13 = load i32, i32* %12, align 1, !dbg !462
  store i32 %13, i32* %4, align 4, !dbg !462
  %14 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !464
  %15 = bitcast i8** %14 to i32**, !dbg !464
  %16 = load i32*, i32** %15, align 8, !dbg !464, !tbaa !18
  %17 = load i32, i32* %16, align 1, !dbg !465
  %18 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !467
  %19 = bitcast i8** %18 to i32**, !dbg !467
  %20 = load i32*, i32** %19, align 8, !dbg !467, !tbaa !18
  %21 = load i32, i32* %20, align 1, !dbg !468
  %22 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !470
  %23 = bitcast i8** %22 to i32**, !dbg !470
  %24 = load i32*, i32** %23, align 8, !dbg !470, !tbaa !18
  %25 = load i32, i32* %24, align 1, !dbg !471
  %26 = load i32, i32* %4, align 4, !dbg !473, !tbaa !109
  %27 = icmp ult i32 %26, %21, !dbg !474
  %28 = sub i32 0, %21, !dbg !476
  %29 = select i1 %27, i32 %25, i32 %28, !dbg !476
  %30 = add i32 %29, %17, !dbg !476
  call void @llvm.lifetime.end.p0i8(i64 4, i8* nonnull %5) #12, !dbg !477
  br label %77

31:                                               ; preds = %3
  call void @llvm.lifetime.start.p0i8(i64 4, i8* nonnull %7) #12, !dbg !478
  %32 = bitcast i8** %1 to i32**, !dbg !479
  %33 = load i32*, i32** %32, align 8, !dbg !479, !tbaa !18
  %34 = load i32, i32* %33, align 1, !dbg !480
  store i32 %34, i32* %6, align 4, !dbg !480
  %35 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !482
  %36 = bitcast i8** %35 to i32**, !dbg !482
  %37 = load i32*, i32** %36, align 8, !dbg !482, !tbaa !18
  %38 = load i32, i32* %37, align 1, !dbg !483
  %39 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !485
  %40 = bitcast i8** %39 to i32**, !dbg !485
  %41 = load i32*, i32** %40, align 8, !dbg !485, !tbaa !18
  %42 = load i32, i32* %41, align 1, !dbg !486
  %43 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !488
  %44 = bitcast i8** %43 to i32**, !dbg !488
  %45 = load i32*, i32** %44, align 8, !dbg !488, !tbaa !18
  %46 = load i32, i32* %45, align 1, !dbg !489
  %47 = load i32, i32* %6, align 4, !dbg !491, !tbaa !109
  %48 = urem i32 %47, 3, !dbg !492
  %49 = icmp eq i32 %48, 0, !dbg !494
  %50 = mul i32 %46, %38, !dbg !495
  %51 = add i32 %42, %38, !dbg !495
  %52 = select i1 %49, i32 %50, i32 %51, !dbg !495
  call void @llvm.lifetime.end.p0i8(i64 4, i8* nonnull %7) #12, !dbg !496
  br label %77

53:                                               ; preds = %3
  call void @llvm.lifetime.start.p0i8(i64 4, i8* nonnull %9) #12, !dbg !497
  %54 = bitcast i8** %1 to i32**, !dbg !498
  %55 = load i32*, i32** %54, align 8, !dbg !498, !tbaa !18
  %56 = load i32, i32* %55, align 1, !dbg !499
  store i32 %56, i32* %8, align 4, !dbg !499
  %57 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !501
  %58 = bitcast i8** %57 to i32**, !dbg !501
  %59 = load i32*, i32** %58, align 8, !dbg !501, !tbaa !18
  %60 = load i32, i32* %59, align 1, !dbg !502
  %61 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !504
  %62 = bitcast i8** %61 to i32**, !dbg !504
  %63 = load i32*, i32** %62, align 8, !dbg !504, !tbaa !18
  %64 = load i32, i32* %63, align 1, !dbg !505
  %65 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !507
  %66 = bitcast i8** %65 to i32**, !dbg !507
  %67 = load i32*, i32** %66, align 8, !dbg !507, !tbaa !18
  %68 = load i32, i32* %67, align 1, !dbg !508
  %69 = load i32, i32* %8, align 4, !dbg !510, !tbaa !109
  %70 = icmp ult i32 %69, %60, !dbg !511
  %71 = mul i32 %68, %60, !dbg !513
  %72 = add i32 %71, %69, !dbg !513
  %73 = sub i32 %69, %60, !dbg !513
  %74 = add i32 %73, %64, !dbg !513
  %75 = select i1 %70, i32 %72, i32 %74, !dbg !513
  call void @llvm.lifetime.end.p0i8(i64 4, i8* nonnull %9) #12, !dbg !514
  br label %77

76:                                               ; preds = %3
  tail call fastcc void @ink_fail(), !dbg !515
  unreachable

77:                                               ; preds = %53, %31, %10
  %78 = phi i32 [ %75, %53 ], [ %52, %31 ], [ %30, %10 ], !dbg !516
  ret i32 %78, !dbg !517
}

; Function Attrs: noreturn nounwind ssp uwtable
define i64 @ink_compute_scalar64(i32 %0, i8** nocapture readnone %1, i64* nocapture readnone %2) local_unnamed_addr #4 !dbg !518 {
  tail call fastcc void @ink_fail(), !dbg !519
  unreachable
}

; Function Attrs: cold noreturn
declare void @abort() local_unnamed_addr #7

; Function Attrs: mustprogress nofree nosync nounwind readnone speculatable willreturn
declare { i64, i1 } @llvm.umul.with.overflow.i64(i64, i64) #8

; Function Attrs: argmemonly nofree nounwind willreturn
declare void @llvm.memcpy.p0i8.p0i8.i64(i8* noalias nocapture writeonly, i8* noalias nocapture readonly, i64, i1 immarg) #9

attributes #0 = { nounwind ssp uwtable "frame-pointer"="non-leaf" "min-legal-vector-width"="0" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #1 = { argmemonly mustprogress nofree nosync nounwind willreturn }
attributes #2 = { inaccessiblemem_or_argmemonly mustprogress nounwind willreturn "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #3 = { mustprogress nofree norecurse nosync nounwind readonly ssp uwtable willreturn "frame-pointer"="non-leaf" "min-legal-vector-width"="0" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #4 = { noreturn nounwind ssp uwtable "frame-pointer"="non-leaf" "min-legal-vector-width"="0" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #5 = { inaccessiblememonly mustprogress nofree nounwind willreturn allocsize(0) "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #6 = { mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn "frame-pointer"="non-leaf" "min-legal-vector-width"="0" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #7 = { cold noreturn "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #8 = { mustprogress nofree nosync nounwind readnone speculatable willreturn }
attributes #9 = { argmemonly nofree nounwind willreturn }
attributes #10 = { allocsize(0) }
attributes #11 = { cold noreturn nounwind }
attributes #12 = { nounwind }
attributes #13 = { nounwind allocsize(0) }

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
!11 = !DIFile(filename: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_u32/prior/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
!12 = !{!"Apple clang version 14.0.0 (clang-1400.0.29.202)"}
!13 = distinct !DISubprogram(name: "ink_compute_reset", scope: !14, file: !14, line: 29, type: !15, scopeLine: 29, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!14 = !DIFile(filename: "reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_u32/prior/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
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
!96 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !97)
!97 = distinct !DILocation(line: 118, column: 19, scope: !74)
!98 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !97)
!99 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !97)
!100 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !97)
!101 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !97)
!102 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !97)
!103 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !97)
!104 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !97)
!105 = !DILocation(line: 118, column: 19, scope: !74)
!106 = !DILocation(line: 119, column: 1, scope: !74)
!107 = !DILocation(line: 91, column: 13, scope: !74)
!108 = !DILocation(line: 93, column: 13, scope: !74)
!109 = !{!110, !110, i64 0}
!110 = !{!"int", !20, i64 0}
!111 = !DILocation(line: 103, column: 9, scope: !74)
!112 = !DILocation(line: 103, column: 5, scope: !74)
!113 = !DILocation(line: 112, column: 1, scope: !74)
!114 = !DILocation(line: 112, column: 12, scope: !74)
!115 = !DILocation(line: 90, column: 29, scope: !74)
!116 = !DILocation(line: 90, column: 19, scope: !74)
!117 = distinct !{!117, !95, !118, !32}
!118 = !DILocation(line: 113, column: 1, scope: !74)
!119 = !DILocation(line: 155, column: 20, scope: !74)
!120 = !DILocation(line: 155, column: 11, scope: !74)
!121 = !DILocation(line: 155, column: 4, scope: !74)
!122 = !DILocation(line: 122, column: 14, scope: !74)
!123 = !DILocation(line: 120, column: 14, scope: !74)
!124 = !DILocation(line: 136, column: 18, scope: !74)
!125 = !DILocation(line: 140, column: 10, scope: !74)
!126 = !DILocation(line: 140, column: 5, scope: !74)
!127 = !DILocation(line: 149, column: 1, scope: !74)
!128 = !DILocation(line: 149, column: 14, scope: !74)
!129 = !DILocation(line: 119, column: 33, scope: !74)
!130 = !DILocation(line: 119, column: 21, scope: !74)
!131 = distinct !{!131, !106, !132, !32}
!132 = !DILocation(line: 150, column: 1, scope: !74)
!133 = !DILocation(line: 155, column: 30, scope: !74)
!134 = !DILocation(line: 156, column: 19, scope: !74)
!135 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !136)
!136 = distinct !DILocation(line: 157, column: 19, scope: !74)
!137 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !136)
!138 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !136)
!139 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !136)
!140 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !136)
!141 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !136)
!142 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !136)
!143 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !136)
!144 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !136)
!145 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !136)
!146 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !136)
!147 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !136)
!148 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !136)
!149 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !136)
!150 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !136)
!151 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !136)
!152 = !DILocation(line: 157, column: 19, scope: !74)
!153 = !DILocation(line: 37, column: 138, scope: !154, inlinedAt: !155)
!154 = distinct !DISubprogram(name: "ink_copy", scope: !14, file: !14, line: 37, type: !15, scopeLine: 37, flags: DIFlagPrototyped, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!155 = distinct !DILocation(line: 158, column: 1, scope: !74)
!156 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !136)
!157 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !155)
!158 = !DILocation(line: 159, column: 18, scope: !74)
!159 = !DILocation(line: 159, column: 10, scope: !74)
!160 = !DILocation(line: 159, column: 27, scope: !74)
!161 = !DILocation(line: 159, column: 43, scope: !74)
!162 = !DILocation(line: 37, column: 154, scope: !154, inlinedAt: !163)
!163 = distinct !DILocation(line: 159, column: 1, scope: !74)
!164 = !DILocation(line: 37, column: 138, scope: !154, inlinedAt: !163)
!165 = !DILocation(line: 37, column: 172, scope: !154, inlinedAt: !163)
!166 = !{!20, !20, i64 0}
!167 = !DILocation(line: 37, column: 165, scope: !154, inlinedAt: !163)
!168 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !163)
!169 = !DILocation(line: 37, column: 162, scope: !154, inlinedAt: !163)
!170 = distinct !{!170, !164, !171, !32}
!171 = !DILocation(line: 37, column: 177, scope: !154, inlinedAt: !163)
!172 = !DILocation(line: 162, column: 38, scope: !74)
!173 = !DILocation(line: 162, column: 30, scope: !74)
!174 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !175)
!175 = distinct !DILocation(line: 162, column: 19, scope: !74)
!176 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !175)
!177 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !175)
!178 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !175)
!179 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !175)
!180 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !175)
!181 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !175)
!182 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !175)
!183 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !175)
!184 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !175)
!185 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !175)
!186 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !175)
!187 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !175)
!188 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !175)
!189 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !175)
!190 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !175)
!191 = !DILocation(line: 162, column: 19, scope: !74)
!192 = !DILocation(line: 163, column: 1, scope: !74)
!193 = !DILocation(line: 192, column: 1, scope: !74)
!194 = !DILocation(line: 164, column: 14, scope: !74)
!195 = !DILocation(line: 166, column: 14, scope: !74)
!196 = !DILocation(line: 176, column: 10, scope: !74)
!197 = !DILocation(line: 176, column: 5, scope: !74)
!198 = !DILocation(line: 189, column: 1, scope: !74)
!199 = !DILocation(line: 189, column: 14, scope: !74)
!200 = !DILocation(line: 163, column: 65, scope: !74)
!201 = !DILocation(line: 163, column: 21, scope: !74)
!202 = distinct !{!202, !192, !203, !32}
!203 = !DILocation(line: 190, column: 1, scope: !74)
!204 = distinct !DISubprogram(name: "lang_fn_left_word", scope: !14, file: !14, line: 193, type: !15, scopeLine: 193, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!205 = !DILocation(line: 201, column: 9, scope: !204)
!206 = !DILocation(line: 201, column: 5, scope: !204)
!207 = !DILocation(line: 210, column: 1, scope: !204)
!208 = distinct !DISubprogram(name: "lang_fn_right_word", scope: !14, file: !14, line: 212, type: !15, scopeLine: 212, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!209 = !DILocation(line: 224, column: 16, scope: !208)
!210 = !DILocation(line: 228, column: 9, scope: !208)
!211 = !DILocation(line: 228, column: 5, scope: !208)
!212 = !DILocation(line: 237, column: 1, scope: !208)
!213 = distinct !DISubprogram(name: "lang_fn_pair_word", scope: !14, file: !14, line: 239, type: !15, scopeLine: 239, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!214 = !DILocation(line: 247, column: 9, scope: !213)
!215 = !DILocation(line: 247, column: 5, scope: !213)
!216 = !DILocation(line: 260, column: 1, scope: !213)
!217 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_u32_into", scope: !14, file: !14, line: 262, type: !15, scopeLine: 262, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!218 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !219)
!219 = distinct !DILocation(line: 269, column: 18, scope: !217)
!220 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !219)
!221 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !219)
!222 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !219)
!223 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !219)
!224 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !219)
!225 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !219)
!226 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !219)
!227 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !219)
!228 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !219)
!229 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !219)
!230 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !219)
!231 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !219)
!232 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !219)
!233 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !219)
!234 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !219)
!235 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !219)
!236 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !219)
!237 = !DILocation(line: 269, column: 18, scope: !217)
!238 = !DILocation(line: 270, column: 1, scope: !217)
!239 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !240)
!240 = distinct !DILocation(line: 298, column: 19, scope: !217)
!241 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !240)
!242 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !240)
!243 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !240)
!244 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !240)
!245 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !240)
!246 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !240)
!247 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !240)
!248 = !DILocation(line: 298, column: 19, scope: !217)
!249 = !DILocation(line: 299, column: 1, scope: !217)
!250 = !DILocation(line: 271, column: 13, scope: !217)
!251 = !DILocation(line: 273, column: 13, scope: !217)
!252 = !DILocation(line: 283, column: 9, scope: !217)
!253 = !DILocation(line: 283, column: 5, scope: !217)
!254 = !DILocation(line: 292, column: 1, scope: !217)
!255 = !DILocation(line: 292, column: 12, scope: !217)
!256 = !DILocation(line: 270, column: 29, scope: !217)
!257 = !DILocation(line: 270, column: 19, scope: !217)
!258 = distinct !{!258, !238, !259, !32}
!259 = !DILocation(line: 293, column: 1, scope: !217)
!260 = !DILocation(line: 335, column: 20, scope: !217)
!261 = !DILocation(line: 335, column: 11, scope: !217)
!262 = !DILocation(line: 335, column: 4, scope: !217)
!263 = !DILocation(line: 302, column: 14, scope: !217)
!264 = !DILocation(line: 300, column: 14, scope: !217)
!265 = !DILocation(line: 316, column: 18, scope: !217)
!266 = !DILocation(line: 320, column: 10, scope: !217)
!267 = !DILocation(line: 320, column: 5, scope: !217)
!268 = !DILocation(line: 329, column: 1, scope: !217)
!269 = !DILocation(line: 329, column: 14, scope: !217)
!270 = !DILocation(line: 299, column: 33, scope: !217)
!271 = !DILocation(line: 299, column: 21, scope: !217)
!272 = distinct !{!272, !249, !273, !32}
!273 = !DILocation(line: 330, column: 1, scope: !217)
!274 = !DILocation(line: 335, column: 30, scope: !217)
!275 = !DILocation(line: 336, column: 19, scope: !217)
!276 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !277)
!277 = distinct !DILocation(line: 337, column: 19, scope: !217)
!278 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !277)
!279 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !277)
!280 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !277)
!281 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !277)
!282 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !277)
!283 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !277)
!284 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !277)
!285 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !277)
!286 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !277)
!287 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !277)
!288 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !277)
!289 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !277)
!290 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !277)
!291 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !277)
!292 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !277)
!293 = !DILocation(line: 337, column: 19, scope: !217)
!294 = !DILocation(line: 37, column: 138, scope: !154, inlinedAt: !295)
!295 = distinct !DILocation(line: 338, column: 1, scope: !217)
!296 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !277)
!297 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !295)
!298 = !DILocation(line: 339, column: 18, scope: !217)
!299 = !DILocation(line: 339, column: 10, scope: !217)
!300 = !DILocation(line: 339, column: 27, scope: !217)
!301 = !DILocation(line: 339, column: 43, scope: !217)
!302 = !DILocation(line: 37, column: 154, scope: !154, inlinedAt: !303)
!303 = distinct !DILocation(line: 339, column: 1, scope: !217)
!304 = !DILocation(line: 37, column: 138, scope: !154, inlinedAt: !303)
!305 = !DILocation(line: 37, column: 172, scope: !154, inlinedAt: !303)
!306 = !DILocation(line: 37, column: 165, scope: !154, inlinedAt: !303)
!307 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !303)
!308 = !DILocation(line: 37, column: 162, scope: !154, inlinedAt: !303)
!309 = distinct !{!309, !304, !310, !32}
!310 = !DILocation(line: 37, column: 177, scope: !154, inlinedAt: !303)
!311 = !DILocation(line: 342, column: 40, scope: !217)
!312 = !DILocation(line: 342, column: 32, scope: !217)
!313 = !DILocation(line: 343, column: 21, scope: !217)
!314 = !DILocation(line: 343, column: 1, scope: !217)
!315 = !DILocation(line: 371, column: 1, scope: !217)
!316 = !DILocation(line: 344, column: 14, scope: !217)
!317 = !DILocation(line: 346, column: 14, scope: !217)
!318 = !DILocation(line: 356, column: 10, scope: !217)
!319 = !DILocation(line: 356, column: 5, scope: !217)
!320 = !DILocation(line: 369, column: 1, scope: !217)
!321 = !DILocation(line: 369, column: 14, scope: !217)
!322 = !DILocation(line: 343, column: 65, scope: !217)
!323 = distinct !{!323, !314, !324, !32}
!324 = !DILocation(line: 370, column: 1, scope: !217)
!325 = distinct !DISubprogram(name: "ink_compute_into", scope: !14, file: !14, line: 373, type: !15, scopeLine: 373, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!326 = !DILocation(line: 373, column: 151, scope: !325)
!327 = !DILocation(line: 374, column: 34, scope: !325)
!328 = !DILocation(line: 374, column: 67, scope: !325)
!329 = !DILocation(line: 374, column: 100, scope: !325)
!330 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !331)
!331 = distinct !DILocation(line: 374, column: 87, scope: !325)
!332 = !DILocation(line: 374, column: 145, scope: !325)
!333 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !334)
!334 = distinct !DILocation(line: 374, column: 132, scope: !325)
!335 = !DILocation(line: 374, column: 235, scope: !325)
!336 = !{!337, !337, i64 0}
!337 = !{!"long", !20, i64 0}
!338 = !DILocation(line: 374, column: 265, scope: !325)
!339 = !DILocation(line: 374, column: 283, scope: !325)
!340 = !DILocation(line: 374, column: 172, scope: !325)
!341 = !DILocation(line: 375, column: 30, scope: !325)
!342 = !DILocation(line: 375, column: 9, scope: !325)
!343 = distinct !DISubprogram(name: "ink_compute_call", scope: !14, file: !14, line: 376, type: !15, scopeLine: 376, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!344 = !DILocation(line: 376, column: 142, scope: !343)
!345 = !DILocation(line: 377, column: 34, scope: !343)
!346 = !DILocation(line: 377, column: 67, scope: !343)
!347 = !DILocation(line: 377, column: 100, scope: !343)
!348 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !349)
!349 = distinct !DILocation(line: 377, column: 87, scope: !343)
!350 = !DILocation(line: 377, column: 145, scope: !343)
!351 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !352)
!352 = distinct !DILocation(line: 377, column: 132, scope: !343)
!353 = !DILocation(line: 377, column: 243, scope: !343)
!354 = !DILocation(line: 377, column: 273, scope: !343)
!355 = !DILocation(line: 377, column: 185, scope: !343)
!356 = !DILocation(line: 377, column: 300, scope: !343)
!357 = !DILocation(line: 377, column: 299, scope: !343)
!358 = !DILocation(line: 377, column: 318, scope: !343)
!359 = !DILocation(line: 378, column: 9, scope: !343)
!360 = !DILocation(line: 378, column: 34, scope: !343)
!361 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !362)
!362 = distinct !DILocation(line: 378, column: 21, scope: !343)
!363 = !DILocation(line: 378, column: 79, scope: !343)
!364 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !365)
!365 = distinct !DILocation(line: 378, column: 66, scope: !343)
!366 = !DILocation(line: 378, column: 124, scope: !343)
!367 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !368)
!368 = distinct !DILocation(line: 378, column: 111, scope: !343)
!369 = !DILocation(line: 378, column: 169, scope: !343)
!370 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !371)
!371 = distinct !DILocation(line: 378, column: 156, scope: !343)
!372 = !DILocation(line: 378, column: 223, scope: !343)
!373 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !374)
!374 = distinct !DILocation(line: 378, column: 251, scope: !343)
!375 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !374)
!376 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !374)
!377 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !374)
!378 = !DILocation(line: 201, column: 9, scope: !204, inlinedAt: !379)
!379 = distinct !DILocation(line: 378, column: 205, scope: !343)
!380 = !DILocation(line: 201, column: 5, scope: !204, inlinedAt: !379)
!381 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !374)
!382 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !374)
!383 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !374)
!384 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !374)
!385 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !374)
!386 = !DILocation(line: 378, column: 251, scope: !343)
!387 = !DILocation(line: 378, column: 284, scope: !343)
!388 = !DILocation(line: 378, column: 299, scope: !343)
!389 = !DILocation(line: 378, column: 311, scope: !343)
!390 = !DILocation(line: 378, column: 320, scope: !343)
!391 = !DILocation(line: 379, column: 9, scope: !343)
!392 = !DILocation(line: 379, column: 34, scope: !343)
!393 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !394)
!394 = distinct !DILocation(line: 379, column: 21, scope: !343)
!395 = !DILocation(line: 379, column: 79, scope: !343)
!396 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !397)
!397 = distinct !DILocation(line: 379, column: 66, scope: !343)
!398 = !DILocation(line: 379, column: 124, scope: !343)
!399 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !400)
!400 = distinct !DILocation(line: 379, column: 111, scope: !343)
!401 = !DILocation(line: 379, column: 169, scope: !343)
!402 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !403)
!403 = distinct !DILocation(line: 379, column: 156, scope: !343)
!404 = !DILocation(line: 379, column: 224, scope: !343)
!405 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !406)
!406 = distinct !DILocation(line: 379, column: 252, scope: !343)
!407 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !406)
!408 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !406)
!409 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !406)
!410 = !DILocation(line: 224, column: 16, scope: !208, inlinedAt: !411)
!411 = distinct !DILocation(line: 379, column: 205, scope: !343)
!412 = !DILocation(line: 228, column: 9, scope: !208, inlinedAt: !411)
!413 = !DILocation(line: 228, column: 5, scope: !208, inlinedAt: !411)
!414 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !406)
!415 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !406)
!416 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !406)
!417 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !406)
!418 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !406)
!419 = !DILocation(line: 379, column: 252, scope: !343)
!420 = !DILocation(line: 379, column: 285, scope: !343)
!421 = !DILocation(line: 379, column: 300, scope: !343)
!422 = !DILocation(line: 379, column: 312, scope: !343)
!423 = !DILocation(line: 379, column: 321, scope: !343)
!424 = !DILocation(line: 380, column: 9, scope: !343)
!425 = !DILocation(line: 380, column: 34, scope: !343)
!426 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !427)
!427 = distinct !DILocation(line: 380, column: 21, scope: !343)
!428 = !DILocation(line: 380, column: 79, scope: !343)
!429 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !430)
!430 = distinct !DILocation(line: 380, column: 66, scope: !343)
!431 = !DILocation(line: 380, column: 124, scope: !343)
!432 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !433)
!433 = distinct !DILocation(line: 380, column: 111, scope: !343)
!434 = !DILocation(line: 380, column: 169, scope: !343)
!435 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !436)
!436 = distinct !DILocation(line: 380, column: 156, scope: !343)
!437 = !DILocation(line: 380, column: 223, scope: !343)
!438 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !439)
!439 = distinct !DILocation(line: 380, column: 251, scope: !343)
!440 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !439)
!441 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !439)
!442 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !439)
!443 = !DILocation(line: 247, column: 9, scope: !213, inlinedAt: !444)
!444 = distinct !DILocation(line: 380, column: 205, scope: !343)
!445 = !DILocation(line: 247, column: 5, scope: !213, inlinedAt: !444)
!446 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !439)
!447 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !439)
!448 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !439)
!449 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !439)
!450 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !439)
!451 = !DILocation(line: 380, column: 251, scope: !343)
!452 = !DILocation(line: 380, column: 284, scope: !343)
!453 = !DILocation(line: 380, column: 299, scope: !343)
!454 = !DILocation(line: 380, column: 311, scope: !343)
!455 = !DILocation(line: 380, column: 320, scope: !343)
!456 = !DILocation(line: 381, column: 9, scope: !343)
!457 = !DILocation(line: 381, column: 21, scope: !343)
!458 = distinct !DISubprogram(name: "ink_compute_scalar32", scope: !14, file: !14, line: 382, type: !15, scopeLine: 382, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!459 = !DILocation(line: 382, column: 122, scope: !458)
!460 = !DILocation(line: 383, column: 9, scope: !458)
!461 = !DILocation(line: 383, column: 34, scope: !458)
!462 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !463)
!463 = distinct !DILocation(line: 383, column: 21, scope: !458)
!464 = !DILocation(line: 383, column: 79, scope: !458)
!465 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !466)
!466 = distinct !DILocation(line: 383, column: 66, scope: !458)
!467 = !DILocation(line: 383, column: 124, scope: !458)
!468 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !469)
!469 = distinct !DILocation(line: 383, column: 111, scope: !458)
!470 = !DILocation(line: 383, column: 169, scope: !458)
!471 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !472)
!472 = distinct !DILocation(line: 383, column: 156, scope: !458)
!473 = !DILocation(line: 383, column: 223, scope: !458)
!474 = !DILocation(line: 201, column: 9, scope: !204, inlinedAt: !475)
!475 = distinct !DILocation(line: 383, column: 205, scope: !458)
!476 = !DILocation(line: 201, column: 5, scope: !204, inlinedAt: !475)
!477 = !DILocation(line: 383, column: 260, scope: !458)
!478 = !DILocation(line: 384, column: 9, scope: !458)
!479 = !DILocation(line: 384, column: 34, scope: !458)
!480 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !481)
!481 = distinct !DILocation(line: 384, column: 21, scope: !458)
!482 = !DILocation(line: 384, column: 79, scope: !458)
!483 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !484)
!484 = distinct !DILocation(line: 384, column: 66, scope: !458)
!485 = !DILocation(line: 384, column: 124, scope: !458)
!486 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !487)
!487 = distinct !DILocation(line: 384, column: 111, scope: !458)
!488 = !DILocation(line: 384, column: 169, scope: !458)
!489 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !490)
!490 = distinct !DILocation(line: 384, column: 156, scope: !458)
!491 = !DILocation(line: 384, column: 224, scope: !458)
!492 = !DILocation(line: 224, column: 16, scope: !208, inlinedAt: !493)
!493 = distinct !DILocation(line: 384, column: 205, scope: !458)
!494 = !DILocation(line: 228, column: 9, scope: !208, inlinedAt: !493)
!495 = !DILocation(line: 228, column: 5, scope: !208, inlinedAt: !493)
!496 = !DILocation(line: 384, column: 261, scope: !458)
!497 = !DILocation(line: 385, column: 9, scope: !458)
!498 = !DILocation(line: 385, column: 34, scope: !458)
!499 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !500)
!500 = distinct !DILocation(line: 385, column: 21, scope: !458)
!501 = !DILocation(line: 385, column: 79, scope: !458)
!502 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !503)
!503 = distinct !DILocation(line: 385, column: 66, scope: !458)
!504 = !DILocation(line: 385, column: 124, scope: !458)
!505 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !506)
!506 = distinct !DILocation(line: 385, column: 111, scope: !458)
!507 = !DILocation(line: 385, column: 169, scope: !458)
!508 = !DILocation(line: 37, column: 171, scope: !154, inlinedAt: !509)
!509 = distinct !DILocation(line: 385, column: 156, scope: !458)
!510 = !DILocation(line: 385, column: 223, scope: !458)
!511 = !DILocation(line: 247, column: 9, scope: !213, inlinedAt: !512)
!512 = distinct !DILocation(line: 385, column: 205, scope: !458)
!513 = !DILocation(line: 247, column: 5, scope: !213, inlinedAt: !512)
!514 = !DILocation(line: 385, column: 260, scope: !458)
!515 = !DILocation(line: 386, column: 9, scope: !458)
!516 = !DILocation(line: 0, scope: !458)
!517 = !DILocation(line: 386, column: 30, scope: !458)
!518 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !14, file: !14, line: 387, type: !15, scopeLine: 387, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!519 = !DILocation(line: 388, column: 9, scope: !518)
