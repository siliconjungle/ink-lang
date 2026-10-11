; ModuleID = '/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_heldout_u32/prior/cpu.c'
source_filename = "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_heldout_u32/prior/cpu.c"
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
define [2 x i64] @lang_fn_pipeline38_left_padded_zip_heldout_u32([2 x i64] %0, [2 x i64] %1, i32 %2, i32 %3) local_unnamed_addr #0 !dbg !74 {
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
  %28 = bitcast %struct.ink_block* %27 to i8*, !dbg !94
  %29 = bitcast %struct.ink_block* %27 to i32*, !dbg !95
  br i1 %13, label %37, label %30, !dbg !96

30:                                               ; preds = %24
  %31 = icmp eq i32 %3, 0
  br i1 %31, label %32, label %40, !dbg !96

32:                                               ; preds = %30, %32
  %33 = phi i64 [ %35, %32 ], [ 0, %30 ]
  %34 = getelementptr inbounds i32, i32* %29, i64 %33, !dbg !97
  store i32 %2, i32* %34, align 4, !dbg !98, !tbaa !99
  %35 = add nuw i64 %33, 1, !dbg !101
  %36 = icmp eq i64 %35, %7, !dbg !102
  br i1 %36, label %37, label %32, !dbg !96, !llvm.loop !103

37:                                               ; preds = %40, %32, %24
  %38 = xor i64 %9, -1, !dbg !105
  %39 = icmp ugt i64 %7, %38, !dbg !106
  br i1 %39, label %52, label %53, !dbg !107

40:                                               ; preds = %30, %40
  %41 = phi i64 [ %50, %40 ], [ 0, %30 ]
  %42 = trunc i64 %41 to i32, !dbg !108
  %43 = getelementptr inbounds i32, i32* %6, i64 %41, !dbg !109
  %44 = load i32, i32* %43, align 4, !dbg !109, !tbaa !99
  %45 = udiv i32 %44, %3, !dbg !110
  %46 = urem i32 %42, %3, !dbg !111
  %47 = add i32 %45, %2, !dbg !112
  %48 = add i32 %47, %46, !dbg !113
  %49 = getelementptr inbounds i32, i32* %29, i64 %41, !dbg !97
  store i32 %48, i32* %49, align 4, !dbg !98, !tbaa !99
  %50 = add nuw i64 %41, 1, !dbg !101
  %51 = icmp eq i64 %50, %7, !dbg !102
  br i1 %51, label %37, label %40, !dbg !96, !llvm.loop !103

52:                                               ; preds = %37
  tail call fastcc void @ink_fail(), !dbg !114
  unreachable

53:                                               ; preds = %37
  %54 = add i64 %9, %7, !dbg !115
  %55 = icmp ugt i64 %54, 4611686018427387903, !dbg !116
  br i1 %55, label %56, label %57, !dbg !118

56:                                               ; preds = %53
  tail call fastcc void @ink_fail() #12, !dbg !119
  unreachable

57:                                               ; preds = %53
  %58 = icmp eq i64 %54, 0, !dbg !120
  %59 = shl nuw i64 %54, 2, !dbg !121
  %60 = select i1 %58, i64 4, i64 %59, !dbg !121
  %61 = icmp ugt i64 %60, -17, !dbg !122
  br i1 %61, label %62, label %63, !dbg !123

62:                                               ; preds = %57
  tail call fastcc void @ink_fail() #12, !dbg !124
  unreachable

63:                                               ; preds = %57
  %64 = add nuw i64 %60, 16, !dbg !125
  %65 = tail call i8* @malloc(i64 %64) #13, !dbg !126
  %66 = icmp eq i8* %65, null, !dbg !127
  br i1 %66, label %67, label %68, !dbg !128

67:                                               ; preds = %63
  tail call fastcc void @ink_fail() #12, !dbg !129
  unreachable

68:                                               ; preds = %63
  %69 = bitcast i8* %65 to %struct.ink_block*, !dbg !126
  %70 = bitcast i8* %65 to i8**, !dbg !130
  store i8* %20, i8** %70, align 8, !dbg !130, !tbaa !24
  store i8* %65, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !131, !tbaa !18
  %71 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %69, i64 1, !dbg !132
  %72 = bitcast %struct.ink_block* %71 to i32*, !dbg !133
  br i1 %13, label %75, label %73, !dbg !134

73:                                               ; preds = %68
  %74 = bitcast %struct.ink_block* %71 to i8*, !dbg !137
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* nonnull align 1 %74, i8* nonnull align 1 %28, i64 %14, i1 false), !dbg !138
  br label %75, !dbg !139

75:                                               ; preds = %73, %68
  %76 = getelementptr inbounds i32, i32* %72, i64 %7, !dbg !139
  %77 = bitcast i32* %76 to i8*, !dbg !140
  %78 = inttoptr i64 %8 to i8*, !dbg !141
  %79 = shl i64 %9, 2, !dbg !142
  %80 = icmp eq i64 %79, 0, !dbg !143
  br i1 %80, label %88, label %81, !dbg !145

81:                                               ; preds = %75, %81
  %82 = phi i64 [ %86, %81 ], [ 0, %75 ]
  %83 = getelementptr inbounds i8, i8* %78, i64 %82, !dbg !146
  %84 = load i8, i8* %83, align 1, !dbg !146, !tbaa !147
  %85 = getelementptr inbounds i8, i8* %77, i64 %82, !dbg !148
  store i8 %84, i8* %85, align 1, !dbg !149, !tbaa !147
  %86 = add nuw i64 %82, 1, !dbg !150
  %87 = icmp eq i64 %86, %79, !dbg !143
  br i1 %87, label %88, label %81, !dbg !145, !llvm.loop !151

88:                                               ; preds = %81, %75
  %89 = tail call i8* @malloc(i64 %19) #13, !dbg !153
  %90 = icmp eq i8* %89, null, !dbg !155
  br i1 %90, label %91, label %92, !dbg !156

91:                                               ; preds = %88
  tail call fastcc void @ink_fail() #12, !dbg !157
  unreachable

92:                                               ; preds = %88
  %93 = bitcast i8* %89 to %struct.ink_block*, !dbg !153
  %94 = bitcast i8* %89 to i8**, !dbg !158
  store i8* %65, i8** %94, align 8, !dbg !158, !tbaa !24
  store i8* %89, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !159, !tbaa !18
  %95 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %93, i64 1, !dbg !160
  %96 = bitcast %struct.ink_block* %95 to i32*, !dbg !161
  br i1 %13, label %97, label %131, !dbg !162

97:                                               ; preds = %131, %92
  %98 = icmp ult i64 %54, %7, !dbg !163
  %99 = select i1 %98, i64 %54, i64 %7, !dbg !164
  %100 = icmp ugt i64 %99, 4611686018427387903, !dbg !165
  br i1 %100, label %101, label %102, !dbg !167

101:                                              ; preds = %97
  tail call fastcc void @ink_fail() #12, !dbg !168
  unreachable

102:                                              ; preds = %97
  %103 = icmp eq i64 %99, 0, !dbg !169
  %104 = shl nuw i64 %99, 2, !dbg !170
  %105 = select i1 %103, i64 4, i64 %104, !dbg !170
  %106 = icmp ugt i64 %105, -17, !dbg !171
  br i1 %106, label %107, label %108, !dbg !172

107:                                              ; preds = %102
  tail call fastcc void @ink_fail() #12, !dbg !173
  unreachable

108:                                              ; preds = %102
  %109 = add nuw i64 %105, 16, !dbg !174
  %110 = tail call i8* @malloc(i64 %109) #13, !dbg !175
  %111 = icmp eq i8* %110, null, !dbg !176
  br i1 %111, label %112, label %113, !dbg !177

112:                                              ; preds = %108
  tail call fastcc void @ink_fail() #12, !dbg !178
  unreachable

113:                                              ; preds = %108
  %114 = bitcast i8* %110 to %struct.ink_block*, !dbg !175
  %115 = bitcast i8* %110 to i8**, !dbg !179
  store i8* %89, i8** %115, align 8, !dbg !179, !tbaa !24
  store i8* %110, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !180, !tbaa !18
  %116 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %114, i64 1, !dbg !181
  %117 = bitcast %struct.ink_block* %116 to i32*, !dbg !182
  br i1 %103, label %143, label %118, !dbg !183

118:                                              ; preds = %113
  %119 = icmp eq i32 %3, 0
  br i1 %119, label %120, label %147, !dbg !183

120:                                              ; preds = %118, %120
  %121 = phi i64 [ %129, %120 ], [ 0, %118 ]
  %122 = getelementptr inbounds i32, i32* %72, i64 %121, !dbg !184
  %123 = load i32, i32* %122, align 4, !dbg !184, !tbaa !99
  %124 = getelementptr inbounds i32, i32* %96, i64 %121, !dbg !185
  %125 = load i32, i32* %124, align 4, !dbg !185, !tbaa !99
  %126 = icmp ult i32 %123, %125, !dbg !186
  %127 = select i1 %126, i32 %125, i32 %123, !dbg !187
  %128 = getelementptr inbounds i32, i32* %117, i64 %121, !dbg !188
  store i32 %127, i32* %128, align 4, !dbg !189, !tbaa !99
  %129 = add nuw i64 %121, 1, !dbg !190
  %130 = icmp eq i64 %129, %99, !dbg !191
  br i1 %130, label %143, label %120, !dbg !183, !llvm.loop !192

131:                                              ; preds = %92, %131
  %132 = phi i64 [ %141, %131 ], [ 0, %92 ]
  %133 = trunc i64 %132 to i32, !dbg !194
  %134 = getelementptr inbounds i32, i32* %6, i64 %132, !dbg !195
  %135 = load i32, i32* %134, align 4, !dbg !195, !tbaa !99
  %136 = icmp ult i32 %133, %2, !dbg !196
  %137 = add i32 %135, %3, !dbg !197
  %138 = mul i32 %135, 3, !dbg !197
  %139 = select i1 %136, i32 %137, i32 %138, !dbg !197
  %140 = getelementptr inbounds i32, i32* %96, i64 %132, !dbg !198
  store i32 %139, i32* %140, align 4, !dbg !199, !tbaa !99
  %141 = add nuw i64 %132, 1, !dbg !200
  %142 = icmp eq i64 %141, %7, !dbg !201
  br i1 %142, label %97, label %131, !dbg !162, !llvm.loop !202

143:                                              ; preds = %160, %120, %113
  %144 = ptrtoint %struct.ink_block* %116 to i64, !dbg !204
  %145 = insertvalue [2 x i64] undef, i64 %144, 0, !dbg !204
  %146 = insertvalue [2 x i64] %145, i64 %99, 1, !dbg !204
  ret [2 x i64] %146, !dbg !204

147:                                              ; preds = %118, %160
  %148 = phi i64 [ %163, %160 ], [ 0, %118 ]
  %149 = getelementptr inbounds i32, i32* %72, i64 %148, !dbg !184
  %150 = load i32, i32* %149, align 4, !dbg !184, !tbaa !99
  %151 = getelementptr inbounds i32, i32* %96, i64 %148, !dbg !185
  %152 = load i32, i32* %151, align 4, !dbg !185, !tbaa !99
  %153 = icmp ult i32 %150, %152, !dbg !186
  br i1 %153, label %154, label %157, !dbg !187

154:                                              ; preds = %147
  %155 = udiv i32 %150, %3, !dbg !205
  %156 = add i32 %155, %152, !dbg !206
  br label %160, !dbg !207

157:                                              ; preds = %147
  %158 = urem i32 %152, %3, !dbg !208
  %159 = add i32 %158, %150, !dbg !209
  br label %160

160:                                              ; preds = %157, %154
  %161 = phi i32 [ %156, %154 ], [ %159, %157 ], !dbg !210
  %162 = getelementptr inbounds i32, i32* %117, i64 %148, !dbg !188
  store i32 %161, i32* %162, align 4, !dbg !189, !tbaa !99
  %163 = add nuw i64 %148, 1, !dbg !190
  %164 = icmp eq i64 %163, %99, !dbg !191
  br i1 %164, label %143, label %147, !dbg !183, !llvm.loop !192
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_left_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #6 !dbg !211 {
  %5 = icmp eq i32 %3, 0, !dbg !212
  br i1 %5, label %9, label %6, !dbg !213

6:                                                ; preds = %4
  %7 = udiv i32 %1, %3, !dbg !214
  %8 = urem i32 %0, %3, !dbg !215
  br label %9

9:                                                ; preds = %4, %6
  %10 = phi i32 [ %7, %6 ], [ 0, %4 ]
  %11 = phi i32 [ %8, %6 ], [ 0, %4 ], !dbg !216
  %12 = add i32 %10, %2, !dbg !217
  %13 = add i32 %12, %11, !dbg !218
  ret i32 %13, !dbg !219
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_left_signal(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #6 !dbg !220 {
  %5 = icmp eq i32 %3, 0, !dbg !221
  br i1 %5, label %9, label %6, !dbg !222

6:                                                ; preds = %4
  %7 = udiv i32 %1, %3, !dbg !223
  %8 = urem i32 %0, %3, !dbg !224
  br label %9

9:                                                ; preds = %4, %6
  %10 = phi i32 [ %7, %6 ], [ 0, %4 ]
  %11 = phi i32 [ %8, %6 ], [ 0, %4 ], !dbg !225
  %12 = add i32 %10, %2, !dbg !226
  %13 = add i32 %12, %11, !dbg !227
  ret i32 %13, !dbg !228
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_right_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #6 !dbg !229 {
  %5 = icmp ult i32 %0, %2, !dbg !230
  %6 = add i32 %3, %1, !dbg !231
  %7 = mul i32 %1, 3, !dbg !231
  %8 = select i1 %5, i32 %6, i32 %7, !dbg !231
  ret i32 %8, !dbg !232
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_right_signal(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #6 !dbg !233 {
  %5 = icmp ult i32 %0, %2, !dbg !234
  %6 = add i32 %3, %1, !dbg !235
  %7 = mul i32 %1, 3, !dbg !235
  %8 = select i1 %5, i32 %6, i32 %7, !dbg !235
  ret i32 %8, !dbg !236
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_pair_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #6 !dbg !237 {
  %5 = icmp ult i32 %0, %1, !dbg !238
  %6 = icmp eq i32 %3, 0, !dbg !239
  br i1 %5, label %7, label %13, !dbg !240

7:                                                ; preds = %4
  br i1 %6, label %10, label %8, !dbg !241

8:                                                ; preds = %7
  %9 = udiv i32 %0, %3, !dbg !242
  br label %10

10:                                               ; preds = %7, %8
  %11 = phi i32 [ %9, %8 ], [ 0, %7 ], !dbg !239
  %12 = add i32 %11, %1, !dbg !243
  br label %19, !dbg !244

13:                                               ; preds = %4
  br i1 %6, label %16, label %14, !dbg !245

14:                                               ; preds = %13
  %15 = urem i32 %1, %3, !dbg !246
  br label %16

16:                                               ; preds = %13, %14
  %17 = phi i32 [ %15, %14 ], [ 0, %13 ], !dbg !239
  %18 = add i32 %17, %0, !dbg !247
  br label %19

19:                                               ; preds = %16, %10
  %20 = phi i32 [ %12, %10 ], [ %18, %16 ], !dbg !239
  ret i32 %20, !dbg !248
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_pair_signal(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #6 !dbg !249 {
  %5 = icmp ult i32 %0, %1, !dbg !250
  %6 = icmp eq i32 %3, 0, !dbg !251
  br i1 %5, label %7, label %13, !dbg !252

7:                                                ; preds = %4
  br i1 %6, label %10, label %8, !dbg !253

8:                                                ; preds = %7
  %9 = udiv i32 %0, %3, !dbg !254
  br label %10

10:                                               ; preds = %7, %8
  %11 = phi i32 [ %9, %8 ], [ 0, %7 ], !dbg !251
  %12 = add i32 %11, %1, !dbg !255
  br label %19, !dbg !256

13:                                               ; preds = %4
  br i1 %6, label %16, label %14, !dbg !257

14:                                               ; preds = %13
  %15 = urem i32 %1, %3, !dbg !258
  br label %16

16:                                               ; preds = %13, %14
  %17 = phi i32 [ %15, %14 ], [ 0, %13 ], !dbg !251
  %18 = add i32 %17, %0, !dbg !259
  br label %19

19:                                               ; preds = %16, %10
  %20 = phi i32 [ %12, %10 ], [ %18, %16 ], !dbg !251
  ret i32 %20, !dbg !260
}

; Function Attrs: nounwind ssp uwtable
define i64 @lang_fn_pipeline38_left_padded_zip_heldout_u32_into([2 x i64] %0, [2 x i64] %1, i32 %2, i32 %3, i32* nocapture %4) local_unnamed_addr #0 !dbg !261 {
  %6 = extractvalue [2 x i64] %0, 0
  %7 = inttoptr i64 %6 to i32*
  %8 = extractvalue [2 x i64] %0, 1
  %9 = extractvalue [2 x i64] %1, 0
  %10 = extractvalue [2 x i64] %1, 1
  %11 = icmp ugt i64 %8, 4611686018427387903, !dbg !262
  br i1 %11, label %12, label %13, !dbg !264

12:                                               ; preds = %5
  tail call fastcc void @ink_fail() #12, !dbg !265
  unreachable

13:                                               ; preds = %5
  %14 = icmp eq i64 %8, 0, !dbg !266
  %15 = shl nuw i64 %8, 2, !dbg !267
  %16 = select i1 %14, i64 4, i64 %15, !dbg !267
  %17 = icmp ugt i64 %16, -17, !dbg !268
  br i1 %17, label %18, label %19, !dbg !269

18:                                               ; preds = %13
  tail call fastcc void @ink_fail() #12, !dbg !270
  unreachable

19:                                               ; preds = %13
  %20 = add nuw i64 %16, 16, !dbg !271
  %21 = tail call i8* @malloc(i64 %20) #13, !dbg !272
  %22 = bitcast i8* %21 to %struct.ink_block*, !dbg !272
  %23 = icmp eq i8* %21, null, !dbg !273
  br i1 %23, label %24, label %25, !dbg !274

24:                                               ; preds = %19
  tail call fastcc void @ink_fail() #12, !dbg !275
  unreachable

25:                                               ; preds = %19
  %26 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !276, !tbaa !18
  %27 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %22, i64 0, i32 0, !dbg !277
  store %struct.ink_block* %26, %struct.ink_block** %27, align 8, !dbg !278, !tbaa !24
  store i8* %21, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !279, !tbaa !18
  %28 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %22, i64 1, !dbg !280
  %29 = bitcast %struct.ink_block* %28 to i8*, !dbg !281
  %30 = bitcast %struct.ink_block* %28 to i32*, !dbg !282
  br i1 %14, label %38, label %31, !dbg !283

31:                                               ; preds = %25
  %32 = icmp eq i32 %3, 0
  br i1 %32, label %33, label %41, !dbg !283

33:                                               ; preds = %31, %33
  %34 = phi i64 [ %36, %33 ], [ 0, %31 ]
  %35 = getelementptr inbounds i32, i32* %30, i64 %34, !dbg !284
  store i32 %2, i32* %35, align 4, !dbg !285, !tbaa !99
  %36 = add nuw i64 %34, 1, !dbg !286
  %37 = icmp eq i64 %36, %8, !dbg !287
  br i1 %37, label %38, label %33, !dbg !283, !llvm.loop !288

38:                                               ; preds = %41, %33, %25
  %39 = xor i64 %10, -1, !dbg !290
  %40 = icmp ugt i64 %8, %39, !dbg !291
  br i1 %40, label %53, label %54, !dbg !292

41:                                               ; preds = %31, %41
  %42 = phi i64 [ %51, %41 ], [ 0, %31 ]
  %43 = trunc i64 %42 to i32, !dbg !293
  %44 = getelementptr inbounds i32, i32* %7, i64 %42, !dbg !294
  %45 = load i32, i32* %44, align 4, !dbg !294, !tbaa !99
  %46 = udiv i32 %45, %3, !dbg !295
  %47 = urem i32 %43, %3, !dbg !296
  %48 = add i32 %46, %2, !dbg !297
  %49 = add i32 %48, %47, !dbg !298
  %50 = getelementptr inbounds i32, i32* %30, i64 %42, !dbg !284
  store i32 %49, i32* %50, align 4, !dbg !285, !tbaa !99
  %51 = add nuw i64 %42, 1, !dbg !286
  %52 = icmp eq i64 %51, %8, !dbg !287
  br i1 %52, label %38, label %41, !dbg !283, !llvm.loop !288

53:                                               ; preds = %38
  tail call fastcc void @ink_fail(), !dbg !299
  unreachable

54:                                               ; preds = %38
  %55 = add i64 %10, %8, !dbg !300
  %56 = icmp ugt i64 %55, 4611686018427387903, !dbg !301
  br i1 %56, label %57, label %58, !dbg !303

57:                                               ; preds = %54
  tail call fastcc void @ink_fail() #12, !dbg !304
  unreachable

58:                                               ; preds = %54
  %59 = icmp eq i64 %55, 0, !dbg !305
  %60 = shl nuw i64 %55, 2, !dbg !306
  %61 = select i1 %59, i64 4, i64 %60, !dbg !306
  %62 = icmp ugt i64 %61, -17, !dbg !307
  br i1 %62, label %63, label %64, !dbg !308

63:                                               ; preds = %58
  tail call fastcc void @ink_fail() #12, !dbg !309
  unreachable

64:                                               ; preds = %58
  %65 = add nuw i64 %61, 16, !dbg !310
  %66 = tail call i8* @malloc(i64 %65) #13, !dbg !311
  %67 = icmp eq i8* %66, null, !dbg !312
  br i1 %67, label %68, label %69, !dbg !313

68:                                               ; preds = %64
  tail call fastcc void @ink_fail() #12, !dbg !314
  unreachable

69:                                               ; preds = %64
  %70 = bitcast i8* %66 to %struct.ink_block*, !dbg !311
  %71 = bitcast i8* %66 to i8**, !dbg !315
  store i8* %21, i8** %71, align 8, !dbg !315, !tbaa !24
  store i8* %66, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !316, !tbaa !18
  %72 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %70, i64 1, !dbg !317
  %73 = bitcast %struct.ink_block* %72 to i32*, !dbg !318
  br i1 %14, label %76, label %74, !dbg !319

74:                                               ; preds = %69
  %75 = bitcast %struct.ink_block* %72 to i8*, !dbg !321
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* nonnull align 1 %75, i8* nonnull align 1 %29, i64 %15, i1 false), !dbg !322
  br label %76, !dbg !323

76:                                               ; preds = %74, %69
  %77 = getelementptr inbounds i32, i32* %73, i64 %8, !dbg !323
  %78 = bitcast i32* %77 to i8*, !dbg !324
  %79 = inttoptr i64 %9 to i8*, !dbg !325
  %80 = shl i64 %10, 2, !dbg !326
  %81 = icmp eq i64 %80, 0, !dbg !327
  br i1 %81, label %89, label %82, !dbg !329

82:                                               ; preds = %76, %82
  %83 = phi i64 [ %87, %82 ], [ 0, %76 ]
  %84 = getelementptr inbounds i8, i8* %79, i64 %83, !dbg !330
  %85 = load i8, i8* %84, align 1, !dbg !330, !tbaa !147
  %86 = getelementptr inbounds i8, i8* %78, i64 %83, !dbg !331
  store i8 %85, i8* %86, align 1, !dbg !332, !tbaa !147
  %87 = add nuw i64 %83, 1, !dbg !333
  %88 = icmp eq i64 %87, %80, !dbg !327
  br i1 %88, label %89, label %82, !dbg !329, !llvm.loop !334

89:                                               ; preds = %82, %76
  %90 = tail call i8* @malloc(i64 %20) #13, !dbg !336
  %91 = icmp eq i8* %90, null, !dbg !338
  br i1 %91, label %92, label %93, !dbg !339

92:                                               ; preds = %89
  tail call fastcc void @ink_fail() #12, !dbg !340
  unreachable

93:                                               ; preds = %89
  %94 = bitcast i8* %90 to %struct.ink_block*, !dbg !336
  %95 = bitcast i8* %90 to i8**, !dbg !341
  store i8* %66, i8** %95, align 8, !dbg !341, !tbaa !24
  store i8* %90, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !342, !tbaa !18
  %96 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %94, i64 1, !dbg !343
  %97 = bitcast %struct.ink_block* %96 to i32*, !dbg !344
  br i1 %14, label %98, label %115, !dbg !345

98:                                               ; preds = %115, %93
  %99 = icmp ult i64 %55, %8, !dbg !346
  %100 = select i1 %99, i64 %55, i64 %8, !dbg !347
  %101 = icmp eq i64 %100, 0, !dbg !348
  br i1 %101, label %127, label %102, !dbg !349

102:                                              ; preds = %98
  %103 = icmp eq i32 %3, 0
  br i1 %103, label %104, label %128, !dbg !349

104:                                              ; preds = %102, %104
  %105 = phi i64 [ %113, %104 ], [ 0, %102 ]
  %106 = getelementptr inbounds i32, i32* %73, i64 %105, !dbg !350
  %107 = load i32, i32* %106, align 4, !dbg !350, !tbaa !99
  %108 = getelementptr inbounds i32, i32* %97, i64 %105, !dbg !351
  %109 = load i32, i32* %108, align 4, !dbg !351, !tbaa !99
  %110 = icmp ult i32 %107, %109, !dbg !352
  %111 = select i1 %110, i32 %109, i32 %107, !dbg !353
  %112 = getelementptr inbounds i32, i32* %4, i64 %105, !dbg !354
  store i32 %111, i32* %112, align 4, !dbg !355, !tbaa !99
  %113 = add nuw i64 %105, 1, !dbg !356
  %114 = icmp eq i64 %113, %100, !dbg !348
  br i1 %114, label %127, label %104, !dbg !349, !llvm.loop !357

115:                                              ; preds = %93, %115
  %116 = phi i64 [ %125, %115 ], [ 0, %93 ]
  %117 = trunc i64 %116 to i32, !dbg !359
  %118 = getelementptr inbounds i32, i32* %7, i64 %116, !dbg !360
  %119 = load i32, i32* %118, align 4, !dbg !360, !tbaa !99
  %120 = icmp ult i32 %117, %2, !dbg !361
  %121 = add i32 %119, %3, !dbg !362
  %122 = mul i32 %119, 3, !dbg !362
  %123 = select i1 %120, i32 %121, i32 %122, !dbg !362
  %124 = getelementptr inbounds i32, i32* %97, i64 %116, !dbg !363
  store i32 %123, i32* %124, align 4, !dbg !364, !tbaa !99
  %125 = add nuw i64 %116, 1, !dbg !365
  %126 = icmp eq i64 %125, %8, !dbg !366
  br i1 %126, label %98, label %115, !dbg !345, !llvm.loop !367

127:                                              ; preds = %141, %104, %98
  ret i64 %100, !dbg !369

128:                                              ; preds = %102, %141
  %129 = phi i64 [ %144, %141 ], [ 0, %102 ]
  %130 = getelementptr inbounds i32, i32* %73, i64 %129, !dbg !350
  %131 = load i32, i32* %130, align 4, !dbg !350, !tbaa !99
  %132 = getelementptr inbounds i32, i32* %97, i64 %129, !dbg !351
  %133 = load i32, i32* %132, align 4, !dbg !351, !tbaa !99
  %134 = icmp ult i32 %131, %133, !dbg !352
  br i1 %134, label %135, label %138, !dbg !353

135:                                              ; preds = %128
  %136 = udiv i32 %131, %3, !dbg !370
  %137 = add i32 %136, %133, !dbg !371
  br label %141, !dbg !372

138:                                              ; preds = %128
  %139 = urem i32 %133, %3, !dbg !373
  %140 = add i32 %139, %131, !dbg !374
  br label %141

141:                                              ; preds = %138, %135
  %142 = phi i32 [ %137, %135 ], [ %140, %138 ], !dbg !375
  %143 = getelementptr inbounds i32, i32* %4, i64 %129, !dbg !354
  store i32 %142, i32* %143, align 4, !dbg !355, !tbaa !99
  %144 = add nuw i64 %129, 1, !dbg !356
  %145 = icmp eq i64 %144, %100, !dbg !348
  br i1 %145, label %127, label %128, !dbg !349, !llvm.loop !357
}

; Function Attrs: nounwind ssp uwtable
define i64 @ink_compute_into(i32 %0, i8** nocapture readonly %1, i64* nocapture readonly %2, i8* nocapture %3) local_unnamed_addr #0 !dbg !376 {
  %5 = icmp eq i32 %0, 0, !dbg !377
  br i1 %5, label %6, label %31, !dbg !377

6:                                                ; preds = %4
  %7 = bitcast i8** %1 to i32**, !dbg !378
  %8 = load i32*, i32** %7, align 8, !dbg !378, !tbaa !18
  %9 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !379
  %10 = bitcast i8** %9 to i32**, !dbg !379
  %11 = load i32*, i32** %10, align 8, !dbg !379, !tbaa !18
  %12 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !380
  %13 = bitcast i8** %12 to i32**, !dbg !380
  %14 = load i32*, i32** %13, align 8, !dbg !380, !tbaa !18
  %15 = load i32, i32* %14, align 1, !dbg !381
  %16 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !383
  %17 = bitcast i8** %16 to i32**, !dbg !383
  %18 = load i32*, i32** %17, align 8, !dbg !383, !tbaa !18
  %19 = load i32, i32* %18, align 1, !dbg !384
  %20 = load i64, i64* %2, align 8, !dbg !386, !tbaa !387
  %21 = getelementptr inbounds i64, i64* %2, i64 1, !dbg !389
  %22 = load i64, i64* %21, align 8, !dbg !389, !tbaa !387
  %23 = bitcast i8* %3 to i32*, !dbg !390
  %24 = ptrtoint i32* %8 to i64, !dbg !391
  %25 = insertvalue [2 x i64] undef, i64 %24, 0, !dbg !391
  %26 = insertvalue [2 x i64] %25, i64 %20, 1, !dbg !391
  %27 = ptrtoint i32* %11 to i64, !dbg !391
  %28 = insertvalue [2 x i64] undef, i64 %27, 0, !dbg !391
  %29 = insertvalue [2 x i64] %28, i64 %22, 1, !dbg !391
  %30 = tail call i64 @lang_fn_pipeline38_left_padded_zip_heldout_u32_into([2 x i64] %26, [2 x i64] %29, i32 %15, i32 %19, i32* %23), !dbg !391
  ret i64 %30, !dbg !392

31:                                               ; preds = %4
  tail call fastcc void @ink_fail(), !dbg !393
  unreachable
}

; Function Attrs: nounwind ssp uwtable
define void @ink_compute_call(i32 %0, i8** readonly %1, i64* nocapture readonly %2, i8** nocapture %3, i64* nocapture %4) local_unnamed_addr #0 !dbg !394 {
  %6 = alloca i32, align 4
  %7 = bitcast i32* %6 to i8*
  %8 = alloca i32, align 4
  %9 = bitcast i32* %8 to i8*
  switch i32 %0, label %245 [
    i32 0, label %10
    i32 1, label %37
    i32 2, label %72
    i32 3, label %107
    i32 4, label %138
    i32 5, label %169
    i32 6, label %207
  ], !dbg !395

10:                                               ; preds = %5
  %11 = bitcast i8** %1 to i32**, !dbg !396
  %12 = load i32*, i32** %11, align 8, !dbg !396, !tbaa !18
  %13 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !397
  %14 = bitcast i8** %13 to i32**, !dbg !397
  %15 = load i32*, i32** %14, align 8, !dbg !397, !tbaa !18
  %16 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !398
  %17 = bitcast i8** %16 to i32**, !dbg !398
  %18 = load i32*, i32** %17, align 8, !dbg !398, !tbaa !18
  %19 = load i32, i32* %18, align 1, !dbg !399
  %20 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !401
  %21 = bitcast i8** %20 to i32**, !dbg !401
  %22 = load i32*, i32** %21, align 8, !dbg !401, !tbaa !18
  %23 = load i32, i32* %22, align 1, !dbg !402
  %24 = load i64, i64* %2, align 8, !dbg !404, !tbaa !387
  %25 = getelementptr inbounds i64, i64* %2, i64 1, !dbg !405
  %26 = load i64, i64* %25, align 8, !dbg !405, !tbaa !387
  %27 = ptrtoint i32* %12 to i64, !dbg !406
  %28 = insertvalue [2 x i64] undef, i64 %27, 0, !dbg !406
  %29 = insertvalue [2 x i64] %28, i64 %24, 1, !dbg !406
  %30 = ptrtoint i32* %15 to i64, !dbg !406
  %31 = insertvalue [2 x i64] undef, i64 %30, 0, !dbg !406
  %32 = insertvalue [2 x i64] %31, i64 %26, 1, !dbg !406
  %33 = tail call [2 x i64] @lang_fn_pipeline38_left_padded_zip_heldout_u32([2 x i64] %29, [2 x i64] %32, i32 %19, i32 %23), !dbg !406
  %34 = extractvalue [2 x i64] %33, 0, !dbg !406
  %35 = extractvalue [2 x i64] %33, 1, !dbg !406
  %36 = inttoptr i64 %34 to i8*, !dbg !407
  store i8* %36, i8** %3, align 8, !dbg !408, !tbaa !18
  store i64 %35, i64* %4, align 8, !dbg !409, !tbaa !387
  br label %246

37:                                               ; preds = %5
  %38 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !410
  %39 = bitcast i8** %38 to i32**, !dbg !410
  %40 = load i32*, i32** %39, align 8, !dbg !410, !tbaa !18
  %41 = load i32, i32* %40, align 1, !dbg !411
  %42 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !413
  %43 = bitcast i8** %42 to i32**, !dbg !413
  %44 = load i32*, i32** %43, align 8, !dbg !413, !tbaa !18
  %45 = load i32, i32* %44, align 1, !dbg !414
  %46 = icmp eq i32 %45, 0, !dbg !416
  br i1 %46, label %57, label %47, !dbg !418

47:                                               ; preds = %37
  %48 = bitcast i8** %1 to i32**, !dbg !419
  %49 = load i32*, i32** %48, align 8, !dbg !419, !tbaa !18
  %50 = load i32, i32* %49, align 1, !dbg !420
  %51 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !422
  %52 = bitcast i8** %51 to i32**, !dbg !422
  %53 = load i32*, i32** %52, align 8, !dbg !422, !tbaa !18
  %54 = load i32, i32* %53, align 1, !dbg !423
  %55 = udiv i32 %54, %45, !dbg !425
  %56 = urem i32 %50, %45, !dbg !426
  br label %57

57:                                               ; preds = %37, %47
  %58 = phi i32 [ %55, %47 ], [ 0, %37 ]
  %59 = phi i32 [ %56, %47 ], [ 0, %37 ], !dbg !427
  %60 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #13, !dbg !428
  %61 = bitcast i8* %60 to %struct.ink_block*, !dbg !428
  %62 = icmp eq i8* %60, null, !dbg !430
  br i1 %62, label %63, label %64, !dbg !431

63:                                               ; preds = %57
  tail call fastcc void @ink_fail() #12, !dbg !432
  unreachable

64:                                               ; preds = %57
  %65 = add i32 %58, %41, !dbg !433
  %66 = add i32 %65, %59, !dbg !434
  %67 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !435, !tbaa !18
  %68 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %61, i64 0, i32 0, !dbg !436
  store %struct.ink_block* %67, %struct.ink_block** %68, align 8, !dbg !437, !tbaa !24
  store i8* %60, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !438, !tbaa !18
  %69 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %61, i64 1, !dbg !439
  %70 = bitcast %struct.ink_block* %69 to i32*, !dbg !440
  store i32 %66, i32* %70, align 4, !dbg !441, !tbaa !99
  %71 = bitcast i8** %3 to %struct.ink_block**, !dbg !442
  store %struct.ink_block* %69, %struct.ink_block** %71, align 8, !dbg !442, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !443, !tbaa !387
  br label %246

72:                                               ; preds = %5
  %73 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !444
  %74 = bitcast i8** %73 to i32**, !dbg !444
  %75 = load i32*, i32** %74, align 8, !dbg !444, !tbaa !18
  %76 = load i32, i32* %75, align 1, !dbg !445
  %77 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !447
  %78 = bitcast i8** %77 to i32**, !dbg !447
  %79 = load i32*, i32** %78, align 8, !dbg !447, !tbaa !18
  %80 = load i32, i32* %79, align 1, !dbg !448
  %81 = icmp eq i32 %80, 0, !dbg !450
  br i1 %81, label %92, label %82, !dbg !452

82:                                               ; preds = %72
  %83 = bitcast i8** %1 to i32**, !dbg !453
  %84 = load i32*, i32** %83, align 8, !dbg !453, !tbaa !18
  %85 = load i32, i32* %84, align 1, !dbg !454
  %86 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !456
  %87 = bitcast i8** %86 to i32**, !dbg !456
  %88 = load i32*, i32** %87, align 8, !dbg !456, !tbaa !18
  %89 = load i32, i32* %88, align 1, !dbg !457
  %90 = udiv i32 %89, %80, !dbg !459
  %91 = urem i32 %85, %80, !dbg !460
  br label %92

92:                                               ; preds = %72, %82
  %93 = phi i32 [ %90, %82 ], [ 0, %72 ]
  %94 = phi i32 [ %91, %82 ], [ 0, %72 ], !dbg !461
  %95 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #13, !dbg !462
  %96 = bitcast i8* %95 to %struct.ink_block*, !dbg !462
  %97 = icmp eq i8* %95, null, !dbg !464
  br i1 %97, label %98, label %99, !dbg !465

98:                                               ; preds = %92
  tail call fastcc void @ink_fail() #12, !dbg !466
  unreachable

99:                                               ; preds = %92
  %100 = add i32 %93, %76, !dbg !467
  %101 = add i32 %100, %94, !dbg !468
  %102 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !469, !tbaa !18
  %103 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %96, i64 0, i32 0, !dbg !470
  store %struct.ink_block* %102, %struct.ink_block** %103, align 8, !dbg !471, !tbaa !24
  store i8* %95, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !472, !tbaa !18
  %104 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %96, i64 1, !dbg !473
  %105 = bitcast %struct.ink_block* %104 to i32*, !dbg !474
  store i32 %101, i32* %105, align 4, !dbg !475, !tbaa !99
  %106 = bitcast i8** %3 to %struct.ink_block**, !dbg !476
  store %struct.ink_block* %104, %struct.ink_block** %106, align 8, !dbg !476, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !477, !tbaa !387
  br label %246

107:                                              ; preds = %5
  call void @llvm.lifetime.start.p0i8(i64 4, i8* nonnull %7) #12, !dbg !478
  %108 = bitcast i8** %1 to i32**, !dbg !479
  %109 = load i32*, i32** %108, align 8, !dbg !479, !tbaa !18
  %110 = load i32, i32* %109, align 1, !dbg !480
  store i32 %110, i32* %6, align 4, !dbg !480
  %111 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !482
  %112 = bitcast i8** %111 to i32**, !dbg !482
  %113 = load i32*, i32** %112, align 8, !dbg !482, !tbaa !18
  %114 = load i32, i32* %113, align 1, !dbg !483
  %115 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !485
  %116 = bitcast i8** %115 to i32**, !dbg !485
  %117 = load i32*, i32** %116, align 8, !dbg !485, !tbaa !18
  %118 = load i32, i32* %117, align 1, !dbg !486
  %119 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !488
  %120 = bitcast i8** %119 to i32**, !dbg !488
  %121 = load i32*, i32** %120, align 8, !dbg !488, !tbaa !18
  %122 = load i32, i32* %121, align 1, !dbg !489
  %123 = load i32, i32* %6, align 4, !dbg !491, !tbaa !99
  %124 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #13, !dbg !492
  %125 = bitcast i8* %124 to %struct.ink_block*, !dbg !492
  %126 = icmp eq i8* %124, null, !dbg !494
  br i1 %126, label %127, label %128, !dbg !495

127:                                              ; preds = %107
  tail call fastcc void @ink_fail() #12, !dbg !496
  unreachable

128:                                              ; preds = %107
  %129 = icmp ult i32 %123, %118, !dbg !497
  %130 = add i32 %122, %114, !dbg !499
  %131 = mul i32 %114, 3, !dbg !499
  %132 = select i1 %129, i32 %130, i32 %131, !dbg !499
  %133 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !500, !tbaa !18
  %134 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %125, i64 0, i32 0, !dbg !501
  store %struct.ink_block* %133, %struct.ink_block** %134, align 8, !dbg !502, !tbaa !24
  store i8* %124, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !503, !tbaa !18
  %135 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %125, i64 1, !dbg !504
  %136 = bitcast %struct.ink_block* %135 to i32*, !dbg !505
  store i32 %132, i32* %136, align 4, !dbg !506, !tbaa !99
  %137 = bitcast i8** %3 to %struct.ink_block**, !dbg !507
  store %struct.ink_block* %135, %struct.ink_block** %137, align 8, !dbg !507, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !508, !tbaa !387
  call void @llvm.lifetime.end.p0i8(i64 4, i8* nonnull %7) #12, !dbg !509
  br label %246

138:                                              ; preds = %5
  call void @llvm.lifetime.start.p0i8(i64 4, i8* nonnull %9) #12, !dbg !510
  %139 = bitcast i8** %1 to i32**, !dbg !511
  %140 = load i32*, i32** %139, align 8, !dbg !511, !tbaa !18
  %141 = load i32, i32* %140, align 1, !dbg !512
  store i32 %141, i32* %8, align 4, !dbg !512
  %142 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !514
  %143 = bitcast i8** %142 to i32**, !dbg !514
  %144 = load i32*, i32** %143, align 8, !dbg !514, !tbaa !18
  %145 = load i32, i32* %144, align 1, !dbg !515
  %146 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !517
  %147 = bitcast i8** %146 to i32**, !dbg !517
  %148 = load i32*, i32** %147, align 8, !dbg !517, !tbaa !18
  %149 = load i32, i32* %148, align 1, !dbg !518
  %150 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !520
  %151 = bitcast i8** %150 to i32**, !dbg !520
  %152 = load i32*, i32** %151, align 8, !dbg !520, !tbaa !18
  %153 = load i32, i32* %152, align 1, !dbg !521
  %154 = load i32, i32* %8, align 4, !dbg !523, !tbaa !99
  %155 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #13, !dbg !524
  %156 = bitcast i8* %155 to %struct.ink_block*, !dbg !524
  %157 = icmp eq i8* %155, null, !dbg !526
  br i1 %157, label %158, label %159, !dbg !527

158:                                              ; preds = %138
  tail call fastcc void @ink_fail() #12, !dbg !528
  unreachable

159:                                              ; preds = %138
  %160 = icmp ult i32 %154, %149, !dbg !529
  %161 = add i32 %153, %145, !dbg !531
  %162 = mul i32 %145, 3, !dbg !531
  %163 = select i1 %160, i32 %161, i32 %162, !dbg !531
  %164 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !532, !tbaa !18
  %165 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %156, i64 0, i32 0, !dbg !533
  store %struct.ink_block* %164, %struct.ink_block** %165, align 8, !dbg !534, !tbaa !24
  store i8* %155, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !535, !tbaa !18
  %166 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %156, i64 1, !dbg !536
  %167 = bitcast %struct.ink_block* %166 to i32*, !dbg !537
  store i32 %163, i32* %167, align 4, !dbg !538, !tbaa !99
  %168 = bitcast i8** %3 to %struct.ink_block**, !dbg !539
  store %struct.ink_block* %166, %struct.ink_block** %168, align 8, !dbg !539, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !540, !tbaa !387
  call void @llvm.lifetime.end.p0i8(i64 4, i8* nonnull %9) #12, !dbg !541
  br label %246

169:                                              ; preds = %5
  %170 = bitcast i8** %1 to i32**, !dbg !542
  %171 = load i32*, i32** %170, align 8, !dbg !542, !tbaa !18
  %172 = load i32, i32* %171, align 1, !dbg !543
  %173 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !545
  %174 = bitcast i8** %173 to i32**, !dbg !545
  %175 = load i32*, i32** %174, align 8, !dbg !545, !tbaa !18
  %176 = load i32, i32* %175, align 1, !dbg !546
  %177 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !548
  %178 = bitcast i8** %177 to i32**, !dbg !548
  %179 = load i32*, i32** %178, align 8, !dbg !548, !tbaa !18
  %180 = load i32, i32* %179, align 1, !dbg !549
  %181 = icmp ult i32 %172, %176, !dbg !551
  %182 = icmp eq i32 %180, 0, !dbg !553
  br i1 %181, label %183, label %189, !dbg !554

183:                                              ; preds = %169
  br i1 %182, label %186, label %184, !dbg !555

184:                                              ; preds = %183
  %185 = udiv i32 %172, %180, !dbg !556
  br label %186

186:                                              ; preds = %184, %183
  %187 = phi i32 [ %185, %184 ], [ 0, %183 ], !dbg !553
  %188 = add i32 %187, %176, !dbg !557
  br label %195, !dbg !558

189:                                              ; preds = %169
  br i1 %182, label %192, label %190, !dbg !559

190:                                              ; preds = %189
  %191 = urem i32 %176, %180, !dbg !560
  br label %192

192:                                              ; preds = %190, %189
  %193 = phi i32 [ %191, %190 ], [ 0, %189 ], !dbg !553
  %194 = add i32 %193, %172, !dbg !561
  br label %195

195:                                              ; preds = %186, %192
  %196 = phi i32 [ %188, %186 ], [ %194, %192 ], !dbg !553
  %197 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #13, !dbg !562
  %198 = bitcast i8* %197 to %struct.ink_block*, !dbg !562
  %199 = icmp eq i8* %197, null, !dbg !564
  br i1 %199, label %200, label %201, !dbg !565

200:                                              ; preds = %195
  tail call fastcc void @ink_fail() #12, !dbg !566
  unreachable

201:                                              ; preds = %195
  %202 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !567, !tbaa !18
  %203 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %198, i64 0, i32 0, !dbg !568
  store %struct.ink_block* %202, %struct.ink_block** %203, align 8, !dbg !569, !tbaa !24
  store i8* %197, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !570, !tbaa !18
  %204 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %198, i64 1, !dbg !571
  %205 = bitcast %struct.ink_block* %204 to i32*, !dbg !572
  store i32 %196, i32* %205, align 4, !dbg !573, !tbaa !99
  %206 = bitcast i8** %3 to %struct.ink_block**, !dbg !574
  store %struct.ink_block* %204, %struct.ink_block** %206, align 8, !dbg !574, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !575, !tbaa !387
  br label %246

207:                                              ; preds = %5
  %208 = bitcast i8** %1 to i32**, !dbg !576
  %209 = load i32*, i32** %208, align 8, !dbg !576, !tbaa !18
  %210 = load i32, i32* %209, align 1, !dbg !577
  %211 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !579
  %212 = bitcast i8** %211 to i32**, !dbg !579
  %213 = load i32*, i32** %212, align 8, !dbg !579, !tbaa !18
  %214 = load i32, i32* %213, align 1, !dbg !580
  %215 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !582
  %216 = bitcast i8** %215 to i32**, !dbg !582
  %217 = load i32*, i32** %216, align 8, !dbg !582, !tbaa !18
  %218 = load i32, i32* %217, align 1, !dbg !583
  %219 = icmp ult i32 %210, %214, !dbg !585
  %220 = icmp eq i32 %218, 0, !dbg !587
  br i1 %219, label %221, label %227, !dbg !588

221:                                              ; preds = %207
  br i1 %220, label %224, label %222, !dbg !589

222:                                              ; preds = %221
  %223 = udiv i32 %210, %218, !dbg !590
  br label %224

224:                                              ; preds = %222, %221
  %225 = phi i32 [ %223, %222 ], [ 0, %221 ], !dbg !587
  %226 = add i32 %225, %214, !dbg !591
  br label %233, !dbg !592

227:                                              ; preds = %207
  br i1 %220, label %230, label %228, !dbg !593

228:                                              ; preds = %227
  %229 = urem i32 %214, %218, !dbg !594
  br label %230

230:                                              ; preds = %228, %227
  %231 = phi i32 [ %229, %228 ], [ 0, %227 ], !dbg !587
  %232 = add i32 %231, %210, !dbg !595
  br label %233

233:                                              ; preds = %224, %230
  %234 = phi i32 [ %226, %224 ], [ %232, %230 ], !dbg !587
  %235 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #13, !dbg !596
  %236 = bitcast i8* %235 to %struct.ink_block*, !dbg !596
  %237 = icmp eq i8* %235, null, !dbg !598
  br i1 %237, label %238, label %239, !dbg !599

238:                                              ; preds = %233
  tail call fastcc void @ink_fail() #12, !dbg !600
  unreachable

239:                                              ; preds = %233
  %240 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !601, !tbaa !18
  %241 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %236, i64 0, i32 0, !dbg !602
  store %struct.ink_block* %240, %struct.ink_block** %241, align 8, !dbg !603, !tbaa !24
  store i8* %235, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !604, !tbaa !18
  %242 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %236, i64 1, !dbg !605
  %243 = bitcast %struct.ink_block* %242 to i32*, !dbg !606
  store i32 %234, i32* %243, align 4, !dbg !607, !tbaa !99
  %244 = bitcast i8** %3 to %struct.ink_block**, !dbg !608
  store %struct.ink_block* %242, %struct.ink_block** %244, align 8, !dbg !608, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !609, !tbaa !387
  br label %246

245:                                              ; preds = %5
  tail call fastcc void @ink_fail(), !dbg !610
  unreachable

246:                                              ; preds = %239, %201, %159, %128, %99, %64, %10
  ret void, !dbg !611
}

; Function Attrs: nounwind ssp uwtable
define i32 @ink_compute_scalar32(i32 %0, i8** readonly %1, i64* nocapture readnone %2) local_unnamed_addr #0 !dbg !612 {
  %4 = alloca i32, align 4
  %5 = bitcast i32* %4 to i8*
  %6 = alloca i32, align 4
  %7 = bitcast i32* %6 to i8*
  switch i32 %0, label %152 [
    i32 1, label %8
    i32 2, label %33
    i32 3, label %58
    i32 4, label %79
    i32 5, label %100
    i32 6, label %126
  ], !dbg !613

8:                                                ; preds = %3
  %9 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !614
  %10 = bitcast i8** %9 to i32**, !dbg !614
  %11 = load i32*, i32** %10, align 8, !dbg !614, !tbaa !18
  %12 = load i32, i32* %11, align 1, !dbg !615
  %13 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !617
  %14 = bitcast i8** %13 to i32**, !dbg !617
  %15 = load i32*, i32** %14, align 8, !dbg !617, !tbaa !18
  %16 = load i32, i32* %15, align 1, !dbg !618
  %17 = icmp eq i32 %16, 0, !dbg !620
  br i1 %17, label %28, label %18, !dbg !622

18:                                               ; preds = %8
  %19 = bitcast i8** %1 to i32**, !dbg !623
  %20 = load i32*, i32** %19, align 8, !dbg !623, !tbaa !18
  %21 = load i32, i32* %20, align 1, !dbg !624
  %22 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !626
  %23 = bitcast i8** %22 to i32**, !dbg !626
  %24 = load i32*, i32** %23, align 8, !dbg !626, !tbaa !18
  %25 = load i32, i32* %24, align 1, !dbg !627
  %26 = udiv i32 %25, %16, !dbg !629
  %27 = urem i32 %21, %16, !dbg !630
  br label %28

28:                                               ; preds = %8, %18
  %29 = phi i32 [ %26, %18 ], [ 0, %8 ]
  %30 = phi i32 [ %27, %18 ], [ 0, %8 ], !dbg !631
  %31 = add i32 %29, %12, !dbg !632
  %32 = add i32 %31, %30, !dbg !633
  br label %153

33:                                               ; preds = %3
  %34 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !634
  %35 = bitcast i8** %34 to i32**, !dbg !634
  %36 = load i32*, i32** %35, align 8, !dbg !634, !tbaa !18
  %37 = load i32, i32* %36, align 1, !dbg !635
  %38 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !637
  %39 = bitcast i8** %38 to i32**, !dbg !637
  %40 = load i32*, i32** %39, align 8, !dbg !637, !tbaa !18
  %41 = load i32, i32* %40, align 1, !dbg !638
  %42 = icmp eq i32 %41, 0, !dbg !640
  br i1 %42, label %53, label %43, !dbg !642

43:                                               ; preds = %33
  %44 = bitcast i8** %1 to i32**, !dbg !643
  %45 = load i32*, i32** %44, align 8, !dbg !643, !tbaa !18
  %46 = load i32, i32* %45, align 1, !dbg !644
  %47 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !646
  %48 = bitcast i8** %47 to i32**, !dbg !646
  %49 = load i32*, i32** %48, align 8, !dbg !646, !tbaa !18
  %50 = load i32, i32* %49, align 1, !dbg !647
  %51 = udiv i32 %50, %41, !dbg !649
  %52 = urem i32 %46, %41, !dbg !650
  br label %53

53:                                               ; preds = %33, %43
  %54 = phi i32 [ %51, %43 ], [ 0, %33 ]
  %55 = phi i32 [ %52, %43 ], [ 0, %33 ], !dbg !651
  %56 = add i32 %54, %37, !dbg !652
  %57 = add i32 %56, %55, !dbg !653
  br label %153

58:                                               ; preds = %3
  call void @llvm.lifetime.start.p0i8(i64 4, i8* nonnull %5) #12, !dbg !654
  %59 = bitcast i8** %1 to i32**, !dbg !655
  %60 = load i32*, i32** %59, align 8, !dbg !655, !tbaa !18
  %61 = load i32, i32* %60, align 1, !dbg !656
  store i32 %61, i32* %4, align 4, !dbg !656
  %62 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !658
  %63 = bitcast i8** %62 to i32**, !dbg !658
  %64 = load i32*, i32** %63, align 8, !dbg !658, !tbaa !18
  %65 = load i32, i32* %64, align 1, !dbg !659
  %66 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !661
  %67 = bitcast i8** %66 to i32**, !dbg !661
  %68 = load i32*, i32** %67, align 8, !dbg !661, !tbaa !18
  %69 = load i32, i32* %68, align 1, !dbg !662
  %70 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !664
  %71 = bitcast i8** %70 to i32**, !dbg !664
  %72 = load i32*, i32** %71, align 8, !dbg !664, !tbaa !18
  %73 = load i32, i32* %72, align 1, !dbg !665
  %74 = load i32, i32* %4, align 4, !dbg !667, !tbaa !99
  %75 = icmp ult i32 %74, %69, !dbg !668
  %76 = add i32 %73, %65, !dbg !670
  %77 = mul i32 %65, 3, !dbg !670
  %78 = select i1 %75, i32 %76, i32 %77, !dbg !670
  call void @llvm.lifetime.end.p0i8(i64 4, i8* nonnull %5) #12, !dbg !671
  br label %153

79:                                               ; preds = %3
  call void @llvm.lifetime.start.p0i8(i64 4, i8* nonnull %7) #12, !dbg !672
  %80 = bitcast i8** %1 to i32**, !dbg !673
  %81 = load i32*, i32** %80, align 8, !dbg !673, !tbaa !18
  %82 = load i32, i32* %81, align 1, !dbg !674
  store i32 %82, i32* %6, align 4, !dbg !674
  %83 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !676
  %84 = bitcast i8** %83 to i32**, !dbg !676
  %85 = load i32*, i32** %84, align 8, !dbg !676, !tbaa !18
  %86 = load i32, i32* %85, align 1, !dbg !677
  %87 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !679
  %88 = bitcast i8** %87 to i32**, !dbg !679
  %89 = load i32*, i32** %88, align 8, !dbg !679, !tbaa !18
  %90 = load i32, i32* %89, align 1, !dbg !680
  %91 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !682
  %92 = bitcast i8** %91 to i32**, !dbg !682
  %93 = load i32*, i32** %92, align 8, !dbg !682, !tbaa !18
  %94 = load i32, i32* %93, align 1, !dbg !683
  %95 = load i32, i32* %6, align 4, !dbg !685, !tbaa !99
  %96 = icmp ult i32 %95, %90, !dbg !686
  %97 = add i32 %94, %86, !dbg !688
  %98 = mul i32 %86, 3, !dbg !688
  %99 = select i1 %96, i32 %97, i32 %98, !dbg !688
  call void @llvm.lifetime.end.p0i8(i64 4, i8* nonnull %7) #12, !dbg !689
  br label %153

100:                                              ; preds = %3
  %101 = bitcast i8** %1 to i32**, !dbg !690
  %102 = load i32*, i32** %101, align 8, !dbg !690, !tbaa !18
  %103 = load i32, i32* %102, align 1, !dbg !691
  %104 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !693
  %105 = bitcast i8** %104 to i32**, !dbg !693
  %106 = load i32*, i32** %105, align 8, !dbg !693, !tbaa !18
  %107 = load i32, i32* %106, align 1, !dbg !694
  %108 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !696
  %109 = bitcast i8** %108 to i32**, !dbg !696
  %110 = load i32*, i32** %109, align 8, !dbg !696, !tbaa !18
  %111 = load i32, i32* %110, align 1, !dbg !697
  %112 = icmp ult i32 %103, %107, !dbg !699
  %113 = icmp eq i32 %111, 0, !dbg !701
  br i1 %112, label %114, label %120, !dbg !702

114:                                              ; preds = %100
  br i1 %113, label %117, label %115, !dbg !703

115:                                              ; preds = %114
  %116 = udiv i32 %103, %111, !dbg !704
  br label %117

117:                                              ; preds = %115, %114
  %118 = phi i32 [ %116, %115 ], [ 0, %114 ], !dbg !701
  %119 = add i32 %118, %107, !dbg !705
  br label %153, !dbg !706

120:                                              ; preds = %100
  br i1 %113, label %123, label %121, !dbg !707

121:                                              ; preds = %120
  %122 = urem i32 %107, %111, !dbg !708
  br label %123

123:                                              ; preds = %121, %120
  %124 = phi i32 [ %122, %121 ], [ 0, %120 ], !dbg !701
  %125 = add i32 %124, %103, !dbg !709
  br label %153

126:                                              ; preds = %3
  %127 = bitcast i8** %1 to i32**, !dbg !710
  %128 = load i32*, i32** %127, align 8, !dbg !710, !tbaa !18
  %129 = load i32, i32* %128, align 1, !dbg !711
  %130 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !713
  %131 = bitcast i8** %130 to i32**, !dbg !713
  %132 = load i32*, i32** %131, align 8, !dbg !713, !tbaa !18
  %133 = load i32, i32* %132, align 1, !dbg !714
  %134 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !716
  %135 = bitcast i8** %134 to i32**, !dbg !716
  %136 = load i32*, i32** %135, align 8, !dbg !716, !tbaa !18
  %137 = load i32, i32* %136, align 1, !dbg !717
  %138 = icmp ult i32 %129, %133, !dbg !719
  %139 = icmp eq i32 %137, 0, !dbg !721
  br i1 %138, label %140, label %146, !dbg !722

140:                                              ; preds = %126
  br i1 %139, label %143, label %141, !dbg !723

141:                                              ; preds = %140
  %142 = udiv i32 %129, %137, !dbg !724
  br label %143

143:                                              ; preds = %141, %140
  %144 = phi i32 [ %142, %141 ], [ 0, %140 ], !dbg !721
  %145 = add i32 %144, %133, !dbg !725
  br label %153, !dbg !726

146:                                              ; preds = %126
  br i1 %139, label %149, label %147, !dbg !727

147:                                              ; preds = %146
  %148 = urem i32 %133, %137, !dbg !728
  br label %149

149:                                              ; preds = %147, %146
  %150 = phi i32 [ %148, %147 ], [ 0, %146 ], !dbg !721
  %151 = add i32 %150, %129, !dbg !729
  br label %153

152:                                              ; preds = %3
  tail call fastcc void @ink_fail(), !dbg !730
  unreachable

153:                                              ; preds = %149, %143, %123, %117, %79, %58, %53, %28
  %154 = phi i32 [ %99, %79 ], [ %78, %58 ], [ %57, %53 ], [ %32, %28 ], [ %119, %117 ], [ %125, %123 ], [ %145, %143 ], [ %151, %149 ], !dbg !731
  ret i32 %154, !dbg !732
}

; Function Attrs: noreturn nounwind ssp uwtable
define i64 @ink_compute_scalar64(i32 %0, i8** nocapture readnone %1, i64* nocapture readnone %2) local_unnamed_addr #4 !dbg !733 {
  tail call fastcc void @ink_fail(), !dbg !734
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
!11 = !DIFile(filename: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_heldout_u32/prior/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
!12 = !{!"Apple clang version 14.0.0 (clang-1400.0.29.202)"}
!13 = distinct !DISubprogram(name: "ink_compute_reset", scope: !14, file: !14, line: 29, type: !15, scopeLine: 29, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!14 = !DIFile(filename: "reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_heldout_u32/prior/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
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
!94 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !76)
!95 = !DILocation(line: 92, column: 18, scope: !74)
!96 = !DILocation(line: 93, column: 1, scope: !74)
!97 = !DILocation(line: 132, column: 1, scope: !74)
!98 = !DILocation(line: 132, column: 12, scope: !74)
!99 = !{!100, !100, i64 0}
!100 = !{!"int", !20, i64 0}
!101 = !DILocation(line: 93, column: 29, scope: !74)
!102 = !DILocation(line: 93, column: 19, scope: !74)
!103 = distinct !{!103, !96, !104, !32}
!104 = !DILocation(line: 133, column: 1, scope: !74)
!105 = !DILocation(line: 138, column: 20, scope: !74)
!106 = !DILocation(line: 138, column: 11, scope: !74)
!107 = !DILocation(line: 138, column: 4, scope: !74)
!108 = !DILocation(line: 94, column: 13, scope: !74)
!109 = !DILocation(line: 96, column: 13, scope: !74)
!110 = !DILocation(line: 119, column: 18, scope: !74)
!111 = !DILocation(line: 129, column: 18, scope: !74)
!112 = !DILocation(line: 130, column: 19, scope: !74)
!113 = !DILocation(line: 132, column: 18, scope: !74)
!114 = !DILocation(line: 138, column: 30, scope: !74)
!115 = !DILocation(line: 139, column: 19, scope: !74)
!116 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !117)
!117 = distinct !DILocation(line: 140, column: 19, scope: !74)
!118 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !117)
!119 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !117)
!120 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !117)
!121 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !117)
!122 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !117)
!123 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !117)
!124 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !117)
!125 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !117)
!126 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !117)
!127 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !117)
!128 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !117)
!129 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !117)
!130 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !117)
!131 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !117)
!132 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !117)
!133 = !DILocation(line: 140, column: 19, scope: !74)
!134 = !DILocation(line: 37, column: 138, scope: !135, inlinedAt: !136)
!135 = distinct !DISubprogram(name: "ink_copy", scope: !14, file: !14, line: 37, type: !15, scopeLine: 37, flags: DIFlagPrototyped, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!136 = distinct !DILocation(line: 141, column: 1, scope: !74)
!137 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !117)
!138 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !136)
!139 = !DILocation(line: 142, column: 18, scope: !74)
!140 = !DILocation(line: 142, column: 10, scope: !74)
!141 = !DILocation(line: 142, column: 27, scope: !74)
!142 = !DILocation(line: 142, column: 43, scope: !74)
!143 = !DILocation(line: 37, column: 154, scope: !135, inlinedAt: !144)
!144 = distinct !DILocation(line: 142, column: 1, scope: !74)
!145 = !DILocation(line: 37, column: 138, scope: !135, inlinedAt: !144)
!146 = !DILocation(line: 37, column: 172, scope: !135, inlinedAt: !144)
!147 = !{!20, !20, i64 0}
!148 = !DILocation(line: 37, column: 165, scope: !135, inlinedAt: !144)
!149 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !144)
!150 = !DILocation(line: 37, column: 162, scope: !135, inlinedAt: !144)
!151 = distinct !{!151, !145, !152, !32}
!152 = !DILocation(line: 37, column: 177, scope: !135, inlinedAt: !144)
!153 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !154)
!154 = distinct !DILocation(line: 147, column: 19, scope: !74)
!155 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !154)
!156 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !154)
!157 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !154)
!158 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !154)
!159 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !154)
!160 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !154)
!161 = !DILocation(line: 147, column: 19, scope: !74)
!162 = !DILocation(line: 148, column: 1, scope: !74)
!163 = !DILocation(line: 183, column: 38, scope: !74)
!164 = !DILocation(line: 183, column: 30, scope: !74)
!165 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !166)
!166 = distinct !DILocation(line: 183, column: 19, scope: !74)
!167 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !166)
!168 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !166)
!169 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !166)
!170 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !166)
!171 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !166)
!172 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !166)
!173 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !166)
!174 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !166)
!175 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !166)
!176 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !166)
!177 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !166)
!178 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !166)
!179 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !166)
!180 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !166)
!181 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !166)
!182 = !DILocation(line: 183, column: 19, scope: !74)
!183 = !DILocation(line: 184, column: 1, scope: !74)
!184 = !DILocation(line: 185, column: 14, scope: !74)
!185 = !DILocation(line: 187, column: 14, scope: !74)
!186 = !DILocation(line: 206, column: 10, scope: !74)
!187 = !DILocation(line: 206, column: 5, scope: !74)
!188 = !DILocation(line: 231, column: 1, scope: !74)
!189 = !DILocation(line: 231, column: 14, scope: !74)
!190 = !DILocation(line: 184, column: 65, scope: !74)
!191 = !DILocation(line: 184, column: 21, scope: !74)
!192 = distinct !{!192, !183, !193, !32}
!193 = !DILocation(line: 232, column: 1, scope: !74)
!194 = !DILocation(line: 149, column: 14, scope: !74)
!195 = !DILocation(line: 151, column: 14, scope: !74)
!196 = !DILocation(line: 170, column: 10, scope: !74)
!197 = !DILocation(line: 170, column: 5, scope: !74)
!198 = !DILocation(line: 179, column: 1, scope: !74)
!199 = !DILocation(line: 179, column: 14, scope: !74)
!200 = !DILocation(line: 148, column: 33, scope: !74)
!201 = !DILocation(line: 148, column: 21, scope: !74)
!202 = distinct !{!202, !162, !203, !32}
!203 = !DILocation(line: 180, column: 1, scope: !74)
!204 = !DILocation(line: 234, column: 1, scope: !74)
!205 = !DILocation(line: 214, column: 18, scope: !74)
!206 = !DILocation(line: 217, column: 10, scope: !74)
!207 = !DILocation(line: 218, column: 1, scope: !74)
!208 = !DILocation(line: 226, column: 18, scope: !74)
!209 = !DILocation(line: 229, column: 10, scope: !74)
!210 = !DILocation(line: 0, scope: !74)
!211 = distinct !DISubprogram(name: "lang_fn_left_word", scope: !14, file: !14, line: 235, type: !15, scopeLine: 235, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!212 = !DILocation(line: 254, column: 7, scope: !211)
!213 = !DILocation(line: 254, column: 5, scope: !211)
!214 = !DILocation(line: 256, column: 16, scope: !211)
!215 = !DILocation(line: 266, column: 17, scope: !211)
!216 = !DILocation(line: 0, scope: !211)
!217 = !DILocation(line: 267, column: 18, scope: !211)
!218 = !DILocation(line: 269, column: 13, scope: !211)
!219 = !DILocation(line: 269, column: 1, scope: !211)
!220 = distinct !DISubprogram(name: "lang_fn_left_signal", scope: !14, file: !14, line: 271, type: !15, scopeLine: 271, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!221 = !DILocation(line: 281, column: 7, scope: !220)
!222 = !DILocation(line: 281, column: 5, scope: !220)
!223 = !DILocation(line: 283, column: 16, scope: !220)
!224 = !DILocation(line: 293, column: 16, scope: !220)
!225 = !DILocation(line: 0, scope: !220)
!226 = !DILocation(line: 294, column: 17, scope: !220)
!227 = !DILocation(line: 296, column: 12, scope: !220)
!228 = !DILocation(line: 296, column: 1, scope: !220)
!229 = distinct !DISubprogram(name: "lang_fn_right_word", scope: !14, file: !14, line: 298, type: !15, scopeLine: 298, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!230 = !DILocation(line: 315, column: 9, scope: !229)
!231 = !DILocation(line: 315, column: 5, scope: !229)
!232 = !DILocation(line: 324, column: 1, scope: !229)
!233 = distinct !DISubprogram(name: "lang_fn_right_signal", scope: !14, file: !14, line: 326, type: !15, scopeLine: 326, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!234 = !DILocation(line: 334, column: 9, scope: !233)
!235 = !DILocation(line: 334, column: 5, scope: !233)
!236 = !DILocation(line: 343, column: 1, scope: !233)
!237 = distinct !DISubprogram(name: "lang_fn_pair_word", scope: !14, file: !14, line: 345, type: !15, scopeLine: 345, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!238 = !DILocation(line: 362, column: 9, scope: !237)
!239 = !DILocation(line: 0, scope: !237)
!240 = !DILocation(line: 362, column: 5, scope: !237)
!241 = !DILocation(line: 368, column: 5, scope: !237)
!242 = !DILocation(line: 370, column: 16, scope: !237)
!243 = !DILocation(line: 373, column: 8, scope: !237)
!244 = !DILocation(line: 374, column: 1, scope: !237)
!245 = !DILocation(line: 380, column: 5, scope: !237)
!246 = !DILocation(line: 382, column: 18, scope: !237)
!247 = !DILocation(line: 385, column: 9, scope: !237)
!248 = !DILocation(line: 387, column: 1, scope: !237)
!249 = distinct !DISubprogram(name: "lang_fn_pair_signal", scope: !14, file: !14, line: 389, type: !15, scopeLine: 389, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!250 = !DILocation(line: 397, column: 9, scope: !249)
!251 = !DILocation(line: 0, scope: !249)
!252 = !DILocation(line: 397, column: 5, scope: !249)
!253 = !DILocation(line: 403, column: 5, scope: !249)
!254 = !DILocation(line: 405, column: 16, scope: !249)
!255 = !DILocation(line: 408, column: 8, scope: !249)
!256 = !DILocation(line: 409, column: 1, scope: !249)
!257 = !DILocation(line: 415, column: 5, scope: !249)
!258 = !DILocation(line: 417, column: 16, scope: !249)
!259 = !DILocation(line: 420, column: 8, scope: !249)
!260 = !DILocation(line: 422, column: 1, scope: !249)
!261 = distinct !DISubprogram(name: "lang_fn_pipeline38_left_padded_zip_heldout_u32_into", scope: !14, file: !14, line: 424, type: !15, scopeLine: 424, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!262 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !263)
!263 = distinct !DILocation(line: 431, column: 18, scope: !261)
!264 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !263)
!265 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !263)
!266 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !263)
!267 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !263)
!268 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !263)
!269 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !263)
!270 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !263)
!271 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !263)
!272 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !263)
!273 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !263)
!274 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !263)
!275 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !263)
!276 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !263)
!277 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !263)
!278 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !263)
!279 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !263)
!280 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !263)
!281 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !263)
!282 = !DILocation(line: 431, column: 18, scope: !261)
!283 = !DILocation(line: 432, column: 1, scope: !261)
!284 = !DILocation(line: 471, column: 1, scope: !261)
!285 = !DILocation(line: 471, column: 12, scope: !261)
!286 = !DILocation(line: 432, column: 29, scope: !261)
!287 = !DILocation(line: 432, column: 19, scope: !261)
!288 = distinct !{!288, !283, !289, !32}
!289 = !DILocation(line: 472, column: 1, scope: !261)
!290 = !DILocation(line: 477, column: 20, scope: !261)
!291 = !DILocation(line: 477, column: 11, scope: !261)
!292 = !DILocation(line: 477, column: 4, scope: !261)
!293 = !DILocation(line: 433, column: 13, scope: !261)
!294 = !DILocation(line: 435, column: 13, scope: !261)
!295 = !DILocation(line: 458, column: 18, scope: !261)
!296 = !DILocation(line: 468, column: 18, scope: !261)
!297 = !DILocation(line: 469, column: 19, scope: !261)
!298 = !DILocation(line: 471, column: 18, scope: !261)
!299 = !DILocation(line: 477, column: 30, scope: !261)
!300 = !DILocation(line: 478, column: 19, scope: !261)
!301 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !302)
!302 = distinct !DILocation(line: 479, column: 19, scope: !261)
!303 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !302)
!304 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !302)
!305 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !302)
!306 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !302)
!307 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !302)
!308 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !302)
!309 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !302)
!310 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !302)
!311 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !302)
!312 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !302)
!313 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !302)
!314 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !302)
!315 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !302)
!316 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !302)
!317 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !302)
!318 = !DILocation(line: 479, column: 19, scope: !261)
!319 = !DILocation(line: 37, column: 138, scope: !135, inlinedAt: !320)
!320 = distinct !DILocation(line: 480, column: 1, scope: !261)
!321 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !302)
!322 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !320)
!323 = !DILocation(line: 481, column: 18, scope: !261)
!324 = !DILocation(line: 481, column: 10, scope: !261)
!325 = !DILocation(line: 481, column: 27, scope: !261)
!326 = !DILocation(line: 481, column: 43, scope: !261)
!327 = !DILocation(line: 37, column: 154, scope: !135, inlinedAt: !328)
!328 = distinct !DILocation(line: 481, column: 1, scope: !261)
!329 = !DILocation(line: 37, column: 138, scope: !135, inlinedAt: !328)
!330 = !DILocation(line: 37, column: 172, scope: !135, inlinedAt: !328)
!331 = !DILocation(line: 37, column: 165, scope: !135, inlinedAt: !328)
!332 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !328)
!333 = !DILocation(line: 37, column: 162, scope: !135, inlinedAt: !328)
!334 = distinct !{!334, !329, !335, !32}
!335 = !DILocation(line: 37, column: 177, scope: !135, inlinedAt: !328)
!336 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !337)
!337 = distinct !DILocation(line: 486, column: 19, scope: !261)
!338 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !337)
!339 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !337)
!340 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !337)
!341 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !337)
!342 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !337)
!343 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !337)
!344 = !DILocation(line: 486, column: 19, scope: !261)
!345 = !DILocation(line: 487, column: 1, scope: !261)
!346 = !DILocation(line: 522, column: 40, scope: !261)
!347 = !DILocation(line: 522, column: 32, scope: !261)
!348 = !DILocation(line: 523, column: 21, scope: !261)
!349 = !DILocation(line: 523, column: 1, scope: !261)
!350 = !DILocation(line: 524, column: 14, scope: !261)
!351 = !DILocation(line: 526, column: 14, scope: !261)
!352 = !DILocation(line: 545, column: 10, scope: !261)
!353 = !DILocation(line: 545, column: 5, scope: !261)
!354 = !DILocation(line: 570, column: 1, scope: !261)
!355 = !DILocation(line: 570, column: 14, scope: !261)
!356 = !DILocation(line: 523, column: 65, scope: !261)
!357 = distinct !{!357, !349, !358, !32}
!358 = !DILocation(line: 571, column: 1, scope: !261)
!359 = !DILocation(line: 488, column: 14, scope: !261)
!360 = !DILocation(line: 490, column: 14, scope: !261)
!361 = !DILocation(line: 509, column: 10, scope: !261)
!362 = !DILocation(line: 509, column: 5, scope: !261)
!363 = !DILocation(line: 518, column: 1, scope: !261)
!364 = !DILocation(line: 518, column: 14, scope: !261)
!365 = !DILocation(line: 487, column: 33, scope: !261)
!366 = !DILocation(line: 487, column: 21, scope: !261)
!367 = distinct !{!367, !345, !368, !32}
!368 = !DILocation(line: 519, column: 1, scope: !261)
!369 = !DILocation(line: 572, column: 1, scope: !261)
!370 = !DILocation(line: 553, column: 18, scope: !261)
!371 = !DILocation(line: 556, column: 10, scope: !261)
!372 = !DILocation(line: 557, column: 1, scope: !261)
!373 = !DILocation(line: 565, column: 18, scope: !261)
!374 = !DILocation(line: 568, column: 10, scope: !261)
!375 = !DILocation(line: 0, scope: !261)
!376 = distinct !DISubprogram(name: "ink_compute_into", scope: !14, file: !14, line: 574, type: !15, scopeLine: 574, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!377 = !DILocation(line: 574, column: 151, scope: !376)
!378 = !DILocation(line: 575, column: 34, scope: !376)
!379 = !DILocation(line: 575, column: 67, scope: !376)
!380 = !DILocation(line: 575, column: 100, scope: !376)
!381 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !382)
!382 = distinct !DILocation(line: 575, column: 87, scope: !376)
!383 = !DILocation(line: 575, column: 145, scope: !376)
!384 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !385)
!385 = distinct !DILocation(line: 575, column: 132, scope: !376)
!386 = !DILocation(line: 575, column: 242, scope: !376)
!387 = !{!388, !388, i64 0}
!388 = !{!"long", !20, i64 0}
!389 = !DILocation(line: 575, column: 272, scope: !376)
!390 = !DILocation(line: 575, column: 290, scope: !376)
!391 = !DILocation(line: 575, column: 172, scope: !376)
!392 = !DILocation(line: 576, column: 30, scope: !376)
!393 = !DILocation(line: 576, column: 9, scope: !376)
!394 = distinct !DISubprogram(name: "ink_compute_call", scope: !14, file: !14, line: 577, type: !15, scopeLine: 577, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!395 = !DILocation(line: 577, column: 142, scope: !394)
!396 = !DILocation(line: 578, column: 34, scope: !394)
!397 = !DILocation(line: 578, column: 67, scope: !394)
!398 = !DILocation(line: 578, column: 100, scope: !394)
!399 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !400)
!400 = distinct !DILocation(line: 578, column: 87, scope: !394)
!401 = !DILocation(line: 578, column: 145, scope: !394)
!402 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !403)
!403 = distinct !DILocation(line: 578, column: 132, scope: !394)
!404 = !DILocation(line: 578, column: 250, scope: !394)
!405 = !DILocation(line: 578, column: 280, scope: !394)
!406 = !DILocation(line: 578, column: 185, scope: !394)
!407 = !DILocation(line: 578, column: 307, scope: !394)
!408 = !DILocation(line: 578, column: 306, scope: !394)
!409 = !DILocation(line: 578, column: 325, scope: !394)
!410 = !DILocation(line: 579, column: 124, scope: !394)
!411 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !412)
!412 = distinct !DILocation(line: 579, column: 111, scope: !394)
!413 = !DILocation(line: 579, column: 169, scope: !394)
!414 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !415)
!415 = distinct !DILocation(line: 579, column: 156, scope: !394)
!416 = !DILocation(line: 254, column: 7, scope: !211, inlinedAt: !417)
!417 = distinct !DILocation(line: 579, column: 205, scope: !394)
!418 = !DILocation(line: 254, column: 5, scope: !211, inlinedAt: !417)
!419 = !DILocation(line: 579, column: 34, scope: !394)
!420 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !421)
!421 = distinct !DILocation(line: 579, column: 21, scope: !394)
!422 = !DILocation(line: 579, column: 79, scope: !394)
!423 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !424)
!424 = distinct !DILocation(line: 579, column: 66, scope: !394)
!425 = !DILocation(line: 256, column: 16, scope: !211, inlinedAt: !417)
!426 = !DILocation(line: 266, column: 17, scope: !211, inlinedAt: !417)
!427 = !DILocation(line: 0, scope: !211, inlinedAt: !417)
!428 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !429)
!429 = distinct !DILocation(line: 579, column: 251, scope: !394)
!430 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !429)
!431 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !429)
!432 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !429)
!433 = !DILocation(line: 267, column: 18, scope: !211, inlinedAt: !417)
!434 = !DILocation(line: 269, column: 13, scope: !211, inlinedAt: !417)
!435 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !429)
!436 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !429)
!437 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !429)
!438 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !429)
!439 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !429)
!440 = !DILocation(line: 579, column: 251, scope: !394)
!441 = !DILocation(line: 579, column: 284, scope: !394)
!442 = !DILocation(line: 579, column: 299, scope: !394)
!443 = !DILocation(line: 579, column: 311, scope: !394)
!444 = !DILocation(line: 580, column: 124, scope: !394)
!445 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !446)
!446 = distinct !DILocation(line: 580, column: 111, scope: !394)
!447 = !DILocation(line: 580, column: 169, scope: !394)
!448 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !449)
!449 = distinct !DILocation(line: 580, column: 156, scope: !394)
!450 = !DILocation(line: 281, column: 7, scope: !220, inlinedAt: !451)
!451 = distinct !DILocation(line: 580, column: 205, scope: !394)
!452 = !DILocation(line: 281, column: 5, scope: !220, inlinedAt: !451)
!453 = !DILocation(line: 580, column: 34, scope: !394)
!454 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !455)
!455 = distinct !DILocation(line: 580, column: 21, scope: !394)
!456 = !DILocation(line: 580, column: 79, scope: !394)
!457 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !458)
!458 = distinct !DILocation(line: 580, column: 66, scope: !394)
!459 = !DILocation(line: 283, column: 16, scope: !220, inlinedAt: !451)
!460 = !DILocation(line: 293, column: 16, scope: !220, inlinedAt: !451)
!461 = !DILocation(line: 0, scope: !220, inlinedAt: !451)
!462 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !463)
!463 = distinct !DILocation(line: 580, column: 253, scope: !394)
!464 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !463)
!465 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !463)
!466 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !463)
!467 = !DILocation(line: 294, column: 17, scope: !220, inlinedAt: !451)
!468 = !DILocation(line: 296, column: 12, scope: !220, inlinedAt: !451)
!469 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !463)
!470 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !463)
!471 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !463)
!472 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !463)
!473 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !463)
!474 = !DILocation(line: 580, column: 253, scope: !394)
!475 = !DILocation(line: 580, column: 286, scope: !394)
!476 = !DILocation(line: 580, column: 301, scope: !394)
!477 = !DILocation(line: 580, column: 313, scope: !394)
!478 = !DILocation(line: 581, column: 9, scope: !394)
!479 = !DILocation(line: 581, column: 34, scope: !394)
!480 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !481)
!481 = distinct !DILocation(line: 581, column: 21, scope: !394)
!482 = !DILocation(line: 581, column: 79, scope: !394)
!483 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !484)
!484 = distinct !DILocation(line: 581, column: 66, scope: !394)
!485 = !DILocation(line: 581, column: 124, scope: !394)
!486 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !487)
!487 = distinct !DILocation(line: 581, column: 111, scope: !394)
!488 = !DILocation(line: 581, column: 169, scope: !394)
!489 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !490)
!490 = distinct !DILocation(line: 581, column: 156, scope: !394)
!491 = !DILocation(line: 581, column: 224, scope: !394)
!492 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !493)
!493 = distinct !DILocation(line: 581, column: 252, scope: !394)
!494 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !493)
!495 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !493)
!496 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !493)
!497 = !DILocation(line: 315, column: 9, scope: !229, inlinedAt: !498)
!498 = distinct !DILocation(line: 581, column: 205, scope: !394)
!499 = !DILocation(line: 315, column: 5, scope: !229, inlinedAt: !498)
!500 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !493)
!501 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !493)
!502 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !493)
!503 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !493)
!504 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !493)
!505 = !DILocation(line: 581, column: 252, scope: !394)
!506 = !DILocation(line: 581, column: 285, scope: !394)
!507 = !DILocation(line: 581, column: 300, scope: !394)
!508 = !DILocation(line: 581, column: 312, scope: !394)
!509 = !DILocation(line: 581, column: 321, scope: !394)
!510 = !DILocation(line: 582, column: 9, scope: !394)
!511 = !DILocation(line: 582, column: 34, scope: !394)
!512 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !513)
!513 = distinct !DILocation(line: 582, column: 21, scope: !394)
!514 = !DILocation(line: 582, column: 79, scope: !394)
!515 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !516)
!516 = distinct !DILocation(line: 582, column: 66, scope: !394)
!517 = !DILocation(line: 582, column: 124, scope: !394)
!518 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !519)
!519 = distinct !DILocation(line: 582, column: 111, scope: !394)
!520 = !DILocation(line: 582, column: 169, scope: !394)
!521 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !522)
!522 = distinct !DILocation(line: 582, column: 156, scope: !394)
!523 = !DILocation(line: 582, column: 226, scope: !394)
!524 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !525)
!525 = distinct !DILocation(line: 582, column: 254, scope: !394)
!526 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !525)
!527 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !525)
!528 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !525)
!529 = !DILocation(line: 334, column: 9, scope: !233, inlinedAt: !530)
!530 = distinct !DILocation(line: 582, column: 205, scope: !394)
!531 = !DILocation(line: 334, column: 5, scope: !233, inlinedAt: !530)
!532 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !525)
!533 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !525)
!534 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !525)
!535 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !525)
!536 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !525)
!537 = !DILocation(line: 582, column: 254, scope: !394)
!538 = !DILocation(line: 582, column: 287, scope: !394)
!539 = !DILocation(line: 582, column: 302, scope: !394)
!540 = !DILocation(line: 582, column: 314, scope: !394)
!541 = !DILocation(line: 582, column: 323, scope: !394)
!542 = !DILocation(line: 583, column: 34, scope: !394)
!543 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !544)
!544 = distinct !DILocation(line: 583, column: 21, scope: !394)
!545 = !DILocation(line: 583, column: 79, scope: !394)
!546 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !547)
!547 = distinct !DILocation(line: 583, column: 66, scope: !394)
!548 = !DILocation(line: 583, column: 169, scope: !394)
!549 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !550)
!550 = distinct !DILocation(line: 583, column: 156, scope: !394)
!551 = !DILocation(line: 362, column: 9, scope: !237, inlinedAt: !552)
!552 = distinct !DILocation(line: 583, column: 205, scope: !394)
!553 = !DILocation(line: 0, scope: !237, inlinedAt: !552)
!554 = !DILocation(line: 362, column: 5, scope: !237, inlinedAt: !552)
!555 = !DILocation(line: 368, column: 5, scope: !237, inlinedAt: !552)
!556 = !DILocation(line: 370, column: 16, scope: !237, inlinedAt: !552)
!557 = !DILocation(line: 373, column: 8, scope: !237, inlinedAt: !552)
!558 = !DILocation(line: 374, column: 1, scope: !237, inlinedAt: !552)
!559 = !DILocation(line: 380, column: 5, scope: !237, inlinedAt: !552)
!560 = !DILocation(line: 382, column: 18, scope: !237, inlinedAt: !552)
!561 = !DILocation(line: 385, column: 9, scope: !237, inlinedAt: !552)
!562 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !563)
!563 = distinct !DILocation(line: 583, column: 251, scope: !394)
!564 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !563)
!565 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !563)
!566 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !563)
!567 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !563)
!568 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !563)
!569 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !563)
!570 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !563)
!571 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !563)
!572 = !DILocation(line: 583, column: 251, scope: !394)
!573 = !DILocation(line: 583, column: 284, scope: !394)
!574 = !DILocation(line: 583, column: 299, scope: !394)
!575 = !DILocation(line: 583, column: 311, scope: !394)
!576 = !DILocation(line: 584, column: 34, scope: !394)
!577 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !578)
!578 = distinct !DILocation(line: 584, column: 21, scope: !394)
!579 = !DILocation(line: 584, column: 79, scope: !394)
!580 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !581)
!581 = distinct !DILocation(line: 584, column: 66, scope: !394)
!582 = !DILocation(line: 584, column: 169, scope: !394)
!583 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !584)
!584 = distinct !DILocation(line: 584, column: 156, scope: !394)
!585 = !DILocation(line: 397, column: 9, scope: !249, inlinedAt: !586)
!586 = distinct !DILocation(line: 584, column: 205, scope: !394)
!587 = !DILocation(line: 0, scope: !249, inlinedAt: !586)
!588 = !DILocation(line: 397, column: 5, scope: !249, inlinedAt: !586)
!589 = !DILocation(line: 403, column: 5, scope: !249, inlinedAt: !586)
!590 = !DILocation(line: 405, column: 16, scope: !249, inlinedAt: !586)
!591 = !DILocation(line: 408, column: 8, scope: !249, inlinedAt: !586)
!592 = !DILocation(line: 409, column: 1, scope: !249, inlinedAt: !586)
!593 = !DILocation(line: 415, column: 5, scope: !249, inlinedAt: !586)
!594 = !DILocation(line: 417, column: 16, scope: !249, inlinedAt: !586)
!595 = !DILocation(line: 420, column: 8, scope: !249, inlinedAt: !586)
!596 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !597)
!597 = distinct !DILocation(line: 584, column: 253, scope: !394)
!598 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !597)
!599 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !597)
!600 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !597)
!601 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !597)
!602 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !597)
!603 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !597)
!604 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !597)
!605 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !597)
!606 = !DILocation(line: 584, column: 253, scope: !394)
!607 = !DILocation(line: 584, column: 286, scope: !394)
!608 = !DILocation(line: 584, column: 301, scope: !394)
!609 = !DILocation(line: 584, column: 313, scope: !394)
!610 = !DILocation(line: 585, column: 9, scope: !394)
!611 = !DILocation(line: 585, column: 21, scope: !394)
!612 = distinct !DISubprogram(name: "ink_compute_scalar32", scope: !14, file: !14, line: 586, type: !15, scopeLine: 586, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!613 = !DILocation(line: 586, column: 122, scope: !612)
!614 = !DILocation(line: 587, column: 124, scope: !612)
!615 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !616)
!616 = distinct !DILocation(line: 587, column: 111, scope: !612)
!617 = !DILocation(line: 587, column: 169, scope: !612)
!618 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !619)
!619 = distinct !DILocation(line: 587, column: 156, scope: !612)
!620 = !DILocation(line: 254, column: 7, scope: !211, inlinedAt: !621)
!621 = distinct !DILocation(line: 587, column: 205, scope: !612)
!622 = !DILocation(line: 254, column: 5, scope: !211, inlinedAt: !621)
!623 = !DILocation(line: 587, column: 34, scope: !612)
!624 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !625)
!625 = distinct !DILocation(line: 587, column: 21, scope: !612)
!626 = !DILocation(line: 587, column: 79, scope: !612)
!627 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !628)
!628 = distinct !DILocation(line: 587, column: 66, scope: !612)
!629 = !DILocation(line: 256, column: 16, scope: !211, inlinedAt: !621)
!630 = !DILocation(line: 266, column: 17, scope: !211, inlinedAt: !621)
!631 = !DILocation(line: 0, scope: !211, inlinedAt: !621)
!632 = !DILocation(line: 267, column: 18, scope: !211, inlinedAt: !621)
!633 = !DILocation(line: 269, column: 13, scope: !211, inlinedAt: !621)
!634 = !DILocation(line: 588, column: 124, scope: !612)
!635 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !636)
!636 = distinct !DILocation(line: 588, column: 111, scope: !612)
!637 = !DILocation(line: 588, column: 169, scope: !612)
!638 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !639)
!639 = distinct !DILocation(line: 588, column: 156, scope: !612)
!640 = !DILocation(line: 281, column: 7, scope: !220, inlinedAt: !641)
!641 = distinct !DILocation(line: 588, column: 205, scope: !612)
!642 = !DILocation(line: 281, column: 5, scope: !220, inlinedAt: !641)
!643 = !DILocation(line: 588, column: 34, scope: !612)
!644 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !645)
!645 = distinct !DILocation(line: 588, column: 21, scope: !612)
!646 = !DILocation(line: 588, column: 79, scope: !612)
!647 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !648)
!648 = distinct !DILocation(line: 588, column: 66, scope: !612)
!649 = !DILocation(line: 283, column: 16, scope: !220, inlinedAt: !641)
!650 = !DILocation(line: 293, column: 16, scope: !220, inlinedAt: !641)
!651 = !DILocation(line: 0, scope: !220, inlinedAt: !641)
!652 = !DILocation(line: 294, column: 17, scope: !220, inlinedAt: !641)
!653 = !DILocation(line: 296, column: 12, scope: !220, inlinedAt: !641)
!654 = !DILocation(line: 589, column: 9, scope: !612)
!655 = !DILocation(line: 589, column: 34, scope: !612)
!656 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !657)
!657 = distinct !DILocation(line: 589, column: 21, scope: !612)
!658 = !DILocation(line: 589, column: 79, scope: !612)
!659 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !660)
!660 = distinct !DILocation(line: 589, column: 66, scope: !612)
!661 = !DILocation(line: 589, column: 124, scope: !612)
!662 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !663)
!663 = distinct !DILocation(line: 589, column: 111, scope: !612)
!664 = !DILocation(line: 589, column: 169, scope: !612)
!665 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !666)
!666 = distinct !DILocation(line: 589, column: 156, scope: !612)
!667 = !DILocation(line: 589, column: 224, scope: !612)
!668 = !DILocation(line: 315, column: 9, scope: !229, inlinedAt: !669)
!669 = distinct !DILocation(line: 589, column: 205, scope: !612)
!670 = !DILocation(line: 315, column: 5, scope: !229, inlinedAt: !669)
!671 = !DILocation(line: 589, column: 261, scope: !612)
!672 = !DILocation(line: 590, column: 9, scope: !612)
!673 = !DILocation(line: 590, column: 34, scope: !612)
!674 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !675)
!675 = distinct !DILocation(line: 590, column: 21, scope: !612)
!676 = !DILocation(line: 590, column: 79, scope: !612)
!677 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !678)
!678 = distinct !DILocation(line: 590, column: 66, scope: !612)
!679 = !DILocation(line: 590, column: 124, scope: !612)
!680 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !681)
!681 = distinct !DILocation(line: 590, column: 111, scope: !612)
!682 = !DILocation(line: 590, column: 169, scope: !612)
!683 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !684)
!684 = distinct !DILocation(line: 590, column: 156, scope: !612)
!685 = !DILocation(line: 590, column: 226, scope: !612)
!686 = !DILocation(line: 334, column: 9, scope: !233, inlinedAt: !687)
!687 = distinct !DILocation(line: 590, column: 205, scope: !612)
!688 = !DILocation(line: 334, column: 5, scope: !233, inlinedAt: !687)
!689 = !DILocation(line: 590, column: 263, scope: !612)
!690 = !DILocation(line: 591, column: 34, scope: !612)
!691 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !692)
!692 = distinct !DILocation(line: 591, column: 21, scope: !612)
!693 = !DILocation(line: 591, column: 79, scope: !612)
!694 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !695)
!695 = distinct !DILocation(line: 591, column: 66, scope: !612)
!696 = !DILocation(line: 591, column: 169, scope: !612)
!697 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !698)
!698 = distinct !DILocation(line: 591, column: 156, scope: !612)
!699 = !DILocation(line: 362, column: 9, scope: !237, inlinedAt: !700)
!700 = distinct !DILocation(line: 591, column: 205, scope: !612)
!701 = !DILocation(line: 0, scope: !237, inlinedAt: !700)
!702 = !DILocation(line: 362, column: 5, scope: !237, inlinedAt: !700)
!703 = !DILocation(line: 368, column: 5, scope: !237, inlinedAt: !700)
!704 = !DILocation(line: 370, column: 16, scope: !237, inlinedAt: !700)
!705 = !DILocation(line: 373, column: 8, scope: !237, inlinedAt: !700)
!706 = !DILocation(line: 374, column: 1, scope: !237, inlinedAt: !700)
!707 = !DILocation(line: 380, column: 5, scope: !237, inlinedAt: !700)
!708 = !DILocation(line: 382, column: 18, scope: !237, inlinedAt: !700)
!709 = !DILocation(line: 385, column: 9, scope: !237, inlinedAt: !700)
!710 = !DILocation(line: 592, column: 34, scope: !612)
!711 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !712)
!712 = distinct !DILocation(line: 592, column: 21, scope: !612)
!713 = !DILocation(line: 592, column: 79, scope: !612)
!714 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !715)
!715 = distinct !DILocation(line: 592, column: 66, scope: !612)
!716 = !DILocation(line: 592, column: 169, scope: !612)
!717 = !DILocation(line: 37, column: 171, scope: !135, inlinedAt: !718)
!718 = distinct !DILocation(line: 592, column: 156, scope: !612)
!719 = !DILocation(line: 397, column: 9, scope: !249, inlinedAt: !720)
!720 = distinct !DILocation(line: 592, column: 205, scope: !612)
!721 = !DILocation(line: 0, scope: !249, inlinedAt: !720)
!722 = !DILocation(line: 397, column: 5, scope: !249, inlinedAt: !720)
!723 = !DILocation(line: 403, column: 5, scope: !249, inlinedAt: !720)
!724 = !DILocation(line: 405, column: 16, scope: !249, inlinedAt: !720)
!725 = !DILocation(line: 408, column: 8, scope: !249, inlinedAt: !720)
!726 = !DILocation(line: 409, column: 1, scope: !249, inlinedAt: !720)
!727 = !DILocation(line: 415, column: 5, scope: !249, inlinedAt: !720)
!728 = !DILocation(line: 417, column: 16, scope: !249, inlinedAt: !720)
!729 = !DILocation(line: 420, column: 8, scope: !249, inlinedAt: !720)
!730 = !DILocation(line: 593, column: 9, scope: !612)
!731 = !DILocation(line: 0, scope: !612)
!732 = !DILocation(line: 593, column: 30, scope: !612)
!733 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !14, file: !14, line: 594, type: !15, scopeLine: 594, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!734 = !DILocation(line: 595, column: 9, scope: !733)
