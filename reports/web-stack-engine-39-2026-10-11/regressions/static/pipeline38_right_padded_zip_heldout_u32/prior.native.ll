; ModuleID = '/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_heldout_u32/prior/cpu.c'
source_filename = "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_heldout_u32/prior/cpu.c"
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
define [2 x i64] @lang_fn_pipeline38_right_padded_zip_heldout_u32([2 x i64] %0, [2 x i64] %1, i32 %2, i32 %3) local_unnamed_addr #0 !dbg !74 {
  %5 = extractvalue [2 x i64] %0, 0
  %6 = inttoptr i64 %5 to i32*
  %7 = inttoptr i64 %5 to i8*
  %8 = extractvalue [2 x i64] %0, 1
  %9 = extractvalue [2 x i64] %1, 0
  %10 = extractvalue [2 x i64] %1, 1
  %11 = icmp ugt i64 %8, 4611686018427387903, !dbg !75
  br i1 %11, label %12, label %13, !dbg !77

12:                                               ; preds = %4
  tail call fastcc void @ink_fail() #11, !dbg !78
  unreachable

13:                                               ; preds = %4
  %14 = icmp eq i64 %8, 0, !dbg !79
  %15 = shl nuw i64 %8, 2, !dbg !80
  %16 = select i1 %14, i64 4, i64 %15, !dbg !80
  %17 = icmp ugt i64 %16, -17, !dbg !81
  br i1 %17, label %18, label %19, !dbg !82

18:                                               ; preds = %13
  tail call fastcc void @ink_fail() #11, !dbg !83
  unreachable

19:                                               ; preds = %13
  %20 = add nuw i64 %16, 16, !dbg !84
  %21 = tail call i8* @malloc(i64 %20) #12, !dbg !85
  %22 = bitcast i8* %21 to %struct.ink_block*, !dbg !85
  %23 = icmp eq i8* %21, null, !dbg !86
  br i1 %23, label %24, label %25, !dbg !87

24:                                               ; preds = %19
  tail call fastcc void @ink_fail() #11, !dbg !88
  unreachable

25:                                               ; preds = %19
  %26 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !89, !tbaa !18
  %27 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %22, i64 0, i32 0, !dbg !90
  store %struct.ink_block* %26, %struct.ink_block** %27, align 8, !dbg !91, !tbaa !24
  store i8* %21, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !92, !tbaa !18
  %28 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %22, i64 1, !dbg !93
  %29 = bitcast %struct.ink_block* %28 to i32*, !dbg !94
  br i1 %14, label %55, label %30, !dbg !95

30:                                               ; preds = %25
  %31 = icmp eq i32 %3, 0
  br i1 %31, label %32, label %101, !dbg !95

32:                                               ; preds = %30
  %33 = icmp ult i64 %8, 8, !dbg !95
  br i1 %33, label %48, label %34, !dbg !95

34:                                               ; preds = %32
  %35 = and i64 %8, -8, !dbg !95
  %36 = insertelement <4 x i32> poison, i32 %2, i32 0, !dbg !95
  %37 = shufflevector <4 x i32> %36, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !95
  br label %38, !dbg !95

38:                                               ; preds = %38, %34
  %39 = phi i64 [ 0, %34 ], [ %44, %38 ], !dbg !96
  %40 = getelementptr inbounds i32, i32* %29, i64 %39, !dbg !96
  %41 = bitcast i32* %40 to <4 x i32>*, !dbg !97
  store <4 x i32> %37, <4 x i32>* %41, align 4, !dbg !97, !tbaa !98
  %42 = getelementptr inbounds i32, i32* %40, i64 4, !dbg !97
  %43 = bitcast i32* %42 to <4 x i32>*, !dbg !97
  store <4 x i32> %37, <4 x i32>* %43, align 4, !dbg !97, !tbaa !98
  %44 = add nuw i64 %39, 8, !dbg !96
  %45 = icmp eq i64 %44, %35, !dbg !96
  br i1 %45, label %46, label %38, !dbg !96, !llvm.loop !100

46:                                               ; preds = %38
  %47 = icmp eq i64 %8, %35, !dbg !95
  br i1 %47, label %55, label %48, !dbg !95

48:                                               ; preds = %32, %46
  %49 = phi i64 [ 0, %32 ], [ %35, %46 ]
  br label %50, !dbg !95

50:                                               ; preds = %48, %50
  %51 = phi i64 [ %53, %50 ], [ %49, %48 ]
  %52 = getelementptr inbounds i32, i32* %29, i64 %51, !dbg !103
  store i32 %2, i32* %52, align 4, !dbg !97, !tbaa !98
  %53 = add nuw i64 %51, 1, !dbg !96
  %54 = icmp eq i64 %53, %8, !dbg !104
  br i1 %54, label %55, label %50, !dbg !95, !llvm.loop !105

55:                                               ; preds = %101, %50, %46, %25
  %56 = tail call i8* @malloc(i64 %20) #12, !dbg !107
  %57 = icmp eq i8* %56, null, !dbg !109
  br i1 %57, label %58, label %59, !dbg !110

58:                                               ; preds = %55
  tail call fastcc void @ink_fail() #11, !dbg !111
  unreachable

59:                                               ; preds = %55
  %60 = bitcast i8* %56 to %struct.ink_block*, !dbg !107
  %61 = bitcast i8* %56 to i8**, !dbg !112
  store i8* %21, i8** %61, align 8, !dbg !112, !tbaa !24
  store i8* %56, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !113, !tbaa !18
  %62 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %60, i64 1, !dbg !114
  %63 = bitcast %struct.ink_block* %62 to i8*, !dbg !115
  %64 = bitcast %struct.ink_block* %62 to i32*, !dbg !116
  br i1 %14, label %113, label %65, !dbg !117

65:                                               ; preds = %59
  %66 = icmp ult i64 %8, 4, !dbg !117
  br i1 %66, label %99, label %67, !dbg !117

67:                                               ; preds = %65
  %68 = getelementptr i8, i8* %56, i64 16, !dbg !117
  %69 = add i64 %15, 16, !dbg !117
  %70 = getelementptr i8, i8* %56, i64 %69, !dbg !117
  %71 = getelementptr i32, i32* %6, i64 %8, !dbg !117
  %72 = bitcast i32* %71 to i8*, !dbg !117
  %73 = icmp ult i8* %68, %72, !dbg !117
  %74 = icmp ugt i8* %70, %7, !dbg !117
  %75 = and i1 %73, %74, !dbg !117
  br i1 %75, label %99, label %76, !dbg !117

76:                                               ; preds = %67
  %77 = and i64 %8, -4, !dbg !117
  %78 = insertelement <4 x i32> poison, i32 %2, i32 0, !dbg !117
  %79 = shufflevector <4 x i32> %78, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !117
  %80 = insertelement <4 x i32> poison, i32 %3, i32 0, !dbg !117
  %81 = shufflevector <4 x i32> %80, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !117
  br label %82, !dbg !117

82:                                               ; preds = %82, %76
  %83 = phi i64 [ 0, %76 ], [ %94, %82 ], !dbg !118
  %84 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %76 ], [ %95, %82 ], !dbg !119
  %85 = getelementptr inbounds i32, i32* %6, i64 %83, !dbg !118
  %86 = bitcast i32* %85 to <4 x i32>*, !dbg !120
  %87 = load <4 x i32>, <4 x i32>* %86, align 4, !dbg !120, !tbaa !98, !alias.scope !121
  %88 = icmp ult <4 x i32> %84, %79, !dbg !124
  %89 = add <4 x i32> %87, %81, !dbg !125
  %90 = mul <4 x i32> %87, <i32 3, i32 3, i32 3, i32 3>, !dbg !125
  %91 = select <4 x i1> %88, <4 x i32> %89, <4 x i32> %90, !dbg !125
  %92 = getelementptr inbounds i32, i32* %64, i64 %83, !dbg !118
  %93 = bitcast i32* %92 to <4 x i32>*, !dbg !126
  store <4 x i32> %91, <4 x i32>* %93, align 4, !dbg !126, !tbaa !98, !alias.scope !127, !noalias !121
  %94 = add nuw i64 %83, 4, !dbg !118
  %95 = add <4 x i32> %84, <i32 4, i32 4, i32 4, i32 4>, !dbg !119
  %96 = icmp eq i64 %94, %77, !dbg !118
  br i1 %96, label %97, label %82, !dbg !118, !llvm.loop !129

97:                                               ; preds = %82
  %98 = icmp eq i64 %8, %77, !dbg !117
  br i1 %98, label %113, label %99, !dbg !117

99:                                               ; preds = %67, %65, %97
  %100 = phi i64 [ 0, %67 ], [ 0, %65 ], [ %77, %97 ]
  br label %116, !dbg !117

101:                                              ; preds = %30, %101
  %102 = phi i64 [ %111, %101 ], [ 0, %30 ]
  %103 = trunc i64 %102 to i32, !dbg !131
  %104 = getelementptr inbounds i32, i32* %6, i64 %102, !dbg !132
  %105 = load i32, i32* %104, align 4, !dbg !132, !tbaa !98
  %106 = udiv i32 %105, %3, !dbg !133
  %107 = urem i32 %103, %3, !dbg !134
  %108 = add i32 %106, %2, !dbg !135
  %109 = add i32 %108, %107, !dbg !136
  %110 = getelementptr inbounds i32, i32* %29, i64 %102, !dbg !103
  store i32 %109, i32* %110, align 4, !dbg !97, !tbaa !98
  %111 = add nuw i64 %102, 1, !dbg !96
  %112 = icmp eq i64 %111, %8, !dbg !104
  br i1 %112, label %55, label %101, !dbg !95, !llvm.loop !137

113:                                              ; preds = %116, %97, %59
  %114 = xor i64 %10, -1, !dbg !138
  %115 = icmp ugt i64 %8, %114, !dbg !139
  br i1 %115, label %128, label %129, !dbg !140

116:                                              ; preds = %99, %116
  %117 = phi i64 [ %126, %116 ], [ %100, %99 ]
  %118 = trunc i64 %117 to i32, !dbg !119
  %119 = getelementptr inbounds i32, i32* %6, i64 %117, !dbg !120
  %120 = load i32, i32* %119, align 4, !dbg !120, !tbaa !98
  %121 = icmp ult i32 %118, %2, !dbg !124
  %122 = add i32 %120, %3, !dbg !125
  %123 = mul i32 %120, 3, !dbg !125
  %124 = select i1 %121, i32 %122, i32 %123, !dbg !125
  %125 = getelementptr inbounds i32, i32* %64, i64 %117, !dbg !141
  store i32 %124, i32* %125, align 4, !dbg !126, !tbaa !98
  %126 = add nuw i64 %117, 1, !dbg !118
  %127 = icmp eq i64 %126, %8, !dbg !142
  br i1 %127, label %113, label %116, !dbg !117, !llvm.loop !143

128:                                              ; preds = %113
  tail call fastcc void @ink_fail(), !dbg !144
  unreachable

129:                                              ; preds = %113
  %130 = add i64 %10, %8, !dbg !145
  %131 = icmp ugt i64 %130, 4611686018427387903, !dbg !146
  br i1 %131, label %132, label %133, !dbg !148

132:                                              ; preds = %129
  tail call fastcc void @ink_fail() #11, !dbg !149
  unreachable

133:                                              ; preds = %129
  %134 = icmp eq i64 %130, 0, !dbg !150
  %135 = shl nuw i64 %130, 2, !dbg !151
  %136 = select i1 %134, i64 4, i64 %135, !dbg !151
  %137 = icmp ugt i64 %136, -17, !dbg !152
  br i1 %137, label %138, label %139, !dbg !153

138:                                              ; preds = %133
  tail call fastcc void @ink_fail() #11, !dbg !154
  unreachable

139:                                              ; preds = %133
  %140 = add nuw i64 %136, 16, !dbg !155
  %141 = tail call i8* @malloc(i64 %140) #12, !dbg !156
  %142 = icmp eq i8* %141, null, !dbg !157
  br i1 %142, label %143, label %144, !dbg !158

143:                                              ; preds = %139
  tail call fastcc void @ink_fail() #11, !dbg !159
  unreachable

144:                                              ; preds = %139
  %145 = bitcast i8* %141 to %struct.ink_block*, !dbg !156
  %146 = bitcast i8* %141 to i8**, !dbg !160
  store i8* %56, i8** %146, align 8, !dbg !160, !tbaa !24
  store i8* %141, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !161, !tbaa !18
  %147 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %145, i64 1, !dbg !162
  %148 = bitcast %struct.ink_block* %147 to i32*, !dbg !163
  br i1 %14, label %151, label %149, !dbg !164

149:                                              ; preds = %144
  %150 = bitcast %struct.ink_block* %147 to i8*, !dbg !167
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* nonnull align 1 %150, i8* nonnull align 1 %63, i64 %15, i1 false), !dbg !168
  br label %151, !dbg !169

151:                                              ; preds = %149, %144
  %152 = getelementptr inbounds i32, i32* %148, i64 %8, !dbg !169
  %153 = bitcast i32* %152 to i8*, !dbg !170
  %154 = inttoptr i64 %9 to i8*, !dbg !171
  %155 = shl i64 %10, 2, !dbg !172
  %156 = icmp eq i64 %155, 0, !dbg !173
  br i1 %156, label %212, label %157, !dbg !175

157:                                              ; preds = %151
  %158 = icmp ult i64 %155, 8, !dbg !175
  br i1 %158, label %203, label %159, !dbg !175

159:                                              ; preds = %157
  %160 = add i64 %135, 16, !dbg !175
  %161 = getelementptr i8, i8* %141, i64 %160, !dbg !175
  %162 = getelementptr i8, i8* %154, i64 %155, !dbg !175
  %163 = icmp ugt i8* %162, %153, !dbg !175
  %164 = icmp ugt i8* %161, %154, !dbg !175
  %165 = and i1 %163, %164, !dbg !175
  br i1 %165, label %203, label %166, !dbg !175

166:                                              ; preds = %159
  %167 = icmp ult i64 %155, 32, !dbg !175
  br i1 %167, label %189, label %168, !dbg !175

168:                                              ; preds = %166
  %169 = and i64 %155, -32, !dbg !175
  br label %170, !dbg !175

170:                                              ; preds = %170, %168
  %171 = phi i64 [ 0, %168 ], [ %182, %170 ], !dbg !176
  %172 = getelementptr inbounds i8, i8* %154, i64 %171, !dbg !176
  %173 = bitcast i8* %172 to <16 x i8>*, !dbg !177
  %174 = load <16 x i8>, <16 x i8>* %173, align 1, !dbg !177, !tbaa !178, !alias.scope !179
  %175 = getelementptr inbounds i8, i8* %172, i64 16, !dbg !177
  %176 = bitcast i8* %175 to <16 x i8>*, !dbg !177
  %177 = load <16 x i8>, <16 x i8>* %176, align 1, !dbg !177, !tbaa !178, !alias.scope !179
  %178 = getelementptr inbounds i8, i8* %153, i64 %171, !dbg !176
  %179 = bitcast i8* %178 to <16 x i8>*, !dbg !182
  store <16 x i8> %174, <16 x i8>* %179, align 1, !dbg !182, !tbaa !178, !alias.scope !183, !noalias !179
  %180 = getelementptr inbounds i8, i8* %178, i64 16, !dbg !182
  %181 = bitcast i8* %180 to <16 x i8>*, !dbg !182
  store <16 x i8> %177, <16 x i8>* %181, align 1, !dbg !182, !tbaa !178, !alias.scope !183, !noalias !179
  %182 = add nuw i64 %171, 32, !dbg !176
  %183 = icmp eq i64 %182, %169, !dbg !176
  br i1 %183, label %184, label %170, !dbg !176, !llvm.loop !185

184:                                              ; preds = %170
  %185 = icmp eq i64 %155, %169, !dbg !175
  br i1 %185, label %212, label %186, !dbg !175

186:                                              ; preds = %184
  %187 = and i64 %10, 6, !dbg !175
  %188 = icmp eq i64 %187, 0, !dbg !175
  br i1 %188, label %203, label %189, !dbg !175

189:                                              ; preds = %166, %186
  %190 = phi i64 [ %169, %186 ], [ 0, %166 ]
  %191 = and i64 %155, -8, !dbg !175
  br label %192, !dbg !175

192:                                              ; preds = %192, %189
  %193 = phi i64 [ %190, %189 ], [ %199, %192 ], !dbg !176
  %194 = getelementptr inbounds i8, i8* %154, i64 %193, !dbg !176
  %195 = bitcast i8* %194 to <8 x i8>*, !dbg !177
  %196 = load <8 x i8>, <8 x i8>* %195, align 1, !dbg !177, !tbaa !178
  %197 = getelementptr inbounds i8, i8* %153, i64 %193, !dbg !176
  %198 = bitcast i8* %197 to <8 x i8>*, !dbg !182
  store <8 x i8> %196, <8 x i8>* %198, align 1, !dbg !182, !tbaa !178
  %199 = add nuw i64 %193, 8, !dbg !176
  %200 = icmp eq i64 %199, %191, !dbg !176
  br i1 %200, label %201, label %192, !dbg !176, !llvm.loop !187

201:                                              ; preds = %192
  %202 = icmp eq i64 %155, %191, !dbg !175
  br i1 %202, label %212, label %203, !dbg !175

203:                                              ; preds = %159, %157, %186, %201
  %204 = phi i64 [ 0, %157 ], [ 0, %159 ], [ %169, %186 ], [ %191, %201 ]
  br label %205, !dbg !175

205:                                              ; preds = %203, %205
  %206 = phi i64 [ %210, %205 ], [ %204, %203 ]
  %207 = getelementptr inbounds i8, i8* %154, i64 %206, !dbg !177
  %208 = load i8, i8* %207, align 1, !dbg !177, !tbaa !178
  %209 = getelementptr inbounds i8, i8* %153, i64 %206, !dbg !188
  store i8 %208, i8* %209, align 1, !dbg !182, !tbaa !178
  %210 = add nuw i64 %206, 1, !dbg !176
  %211 = icmp eq i64 %210, %155, !dbg !173
  br i1 %211, label %212, label %205, !dbg !175, !llvm.loop !189

212:                                              ; preds = %205, %184, %201, %151
  %213 = icmp ult i64 %8, %130, !dbg !190
  %214 = select i1 %213, i64 %8, i64 %130, !dbg !191
  %215 = icmp ugt i64 %214, 4611686018427387903, !dbg !192
  br i1 %215, label %216, label %217, !dbg !194

216:                                              ; preds = %212
  tail call fastcc void @ink_fail() #11, !dbg !195
  unreachable

217:                                              ; preds = %212
  %218 = icmp eq i64 %214, 0, !dbg !196
  %219 = shl nuw i64 %214, 2, !dbg !197
  %220 = select i1 %218, i64 4, i64 %219, !dbg !197
  %221 = icmp ugt i64 %220, -17, !dbg !198
  br i1 %221, label %222, label %223, !dbg !199

222:                                              ; preds = %217
  tail call fastcc void @ink_fail() #11, !dbg !200
  unreachable

223:                                              ; preds = %217
  %224 = add nuw i64 %220, 16, !dbg !201
  %225 = tail call i8* @malloc(i64 %224) #12, !dbg !202
  %226 = icmp eq i8* %225, null, !dbg !203
  br i1 %226, label %227, label %228, !dbg !204

227:                                              ; preds = %223
  tail call fastcc void @ink_fail() #11, !dbg !205
  unreachable

228:                                              ; preds = %223
  %229 = bitcast i8* %225 to %struct.ink_block*, !dbg !202
  %230 = bitcast i8* %225 to i8**, !dbg !206
  store i8* %141, i8** %230, align 8, !dbg !206, !tbaa !24
  store i8* %225, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !207, !tbaa !18
  %231 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %229, i64 1, !dbg !208
  %232 = bitcast %struct.ink_block* %231 to i32*, !dbg !209
  br i1 %218, label %325, label %233, !dbg !210

233:                                              ; preds = %228
  %234 = icmp eq i32 %3, 0
  br i1 %234, label %282, label %235, !dbg !210

235:                                              ; preds = %233
  %236 = icmp ult i64 %214, 2, !dbg !210
  br i1 %236, label %280, label %237, !dbg !210

237:                                              ; preds = %235
  %238 = and i64 %214, -2, !dbg !210
  br label %239, !dbg !210

239:                                              ; preds = %268, %237
  %240 = phi i64 [ 0, %237 ], [ %276, %268 ], !dbg !211
  %241 = or i64 %240, 1, !dbg !211
  %242 = getelementptr inbounds i32, i32* %29, i64 %240, !dbg !211
  %243 = getelementptr inbounds i32, i32* %29, i64 %241, !dbg !211
  %244 = load i32, i32* %242, align 4, !dbg !211, !tbaa !98
  %245 = load i32, i32* %243, align 4, !dbg !211, !tbaa !98
  %246 = getelementptr inbounds i32, i32* %148, i64 %240, !dbg !211
  %247 = getelementptr inbounds i32, i32* %148, i64 %241, !dbg !211
  %248 = load i32, i32* %246, align 4, !dbg !211, !tbaa !98
  %249 = load i32, i32* %247, align 4, !dbg !211, !tbaa !98
  %250 = icmp ult i32 %244, %248, !dbg !211
  %251 = icmp ult i32 %245, %249, !dbg !211
  br i1 %250, label %254, label %252, !dbg !211

252:                                              ; preds = %239
  %253 = urem i32 %248, %3, !dbg !211
  br label %254

254:                                              ; preds = %252, %239
  %255 = phi i32 [ poison, %239 ], [ %253, %252 ], !dbg !211
  br i1 %251, label %258, label %256, !dbg !211

256:                                              ; preds = %254
  %257 = urem i32 %249, %3, !dbg !211
  br label %258

258:                                              ; preds = %256, %254
  %259 = phi i32 [ poison, %254 ], [ %257, %256 ], !dbg !211
  %260 = add i32 %255, %244, !dbg !211
  %261 = add i32 %259, %245, !dbg !211
  br i1 %250, label %262, label %264, !dbg !211

262:                                              ; preds = %258
  %263 = udiv i32 %244, %3, !dbg !211
  br label %264

264:                                              ; preds = %262, %258
  %265 = phi i32 [ poison, %258 ], [ %263, %262 ], !dbg !211
  br i1 %251, label %266, label %268, !dbg !211

266:                                              ; preds = %264
  %267 = udiv i32 %245, %3, !dbg !211
  br label %268

268:                                              ; preds = %266, %264
  %269 = phi i32 [ poison, %264 ], [ %267, %266 ], !dbg !211
  %270 = add i32 %265, %248, !dbg !211
  %271 = add i32 %269, %249, !dbg !211
  %272 = select i1 %250, i32 %270, i32 %260, !dbg !212
  %273 = select i1 %251, i32 %271, i32 %261, !dbg !212
  %274 = getelementptr inbounds i32, i32* %232, i64 %240, !dbg !211
  %275 = getelementptr inbounds i32, i32* %232, i64 %241, !dbg !211
  store i32 %272, i32* %274, align 4, !dbg !211, !tbaa !98
  store i32 %273, i32* %275, align 4, !dbg !211, !tbaa !98
  %276 = add nuw i64 %240, 2, !dbg !211
  %277 = icmp eq i64 %276, %238, !dbg !211
  br i1 %277, label %278, label %239, !dbg !211, !llvm.loop !213

278:                                              ; preds = %268
  %279 = icmp eq i64 %214, %238, !dbg !210
  br i1 %279, label %325, label %280, !dbg !210

280:                                              ; preds = %235, %278
  %281 = phi i64 [ 0, %235 ], [ %238, %278 ]
  br label %329, !dbg !210

282:                                              ; preds = %233
  %283 = icmp ult i64 %214, 8, !dbg !210
  br i1 %283, label %312, label %284, !dbg !210

284:                                              ; preds = %282
  %285 = and i64 %214, -8, !dbg !210
  br label %286, !dbg !210

286:                                              ; preds = %286, %284
  %287 = phi i64 [ 0, %284 ], [ %308, %286 ], !dbg !211
  %288 = getelementptr inbounds i32, i32* %29, i64 %287, !dbg !211
  %289 = bitcast i32* %288 to <4 x i32>*, !dbg !215
  %290 = load <4 x i32>, <4 x i32>* %289, align 4, !dbg !215, !tbaa !98
  %291 = getelementptr inbounds i32, i32* %288, i64 4, !dbg !215
  %292 = bitcast i32* %291 to <4 x i32>*, !dbg !215
  %293 = load <4 x i32>, <4 x i32>* %292, align 4, !dbg !215, !tbaa !98
  %294 = getelementptr inbounds i32, i32* %148, i64 %287, !dbg !211
  %295 = bitcast i32* %294 to <4 x i32>*, !dbg !216
  %296 = load <4 x i32>, <4 x i32>* %295, align 4, !dbg !216, !tbaa !98
  %297 = getelementptr inbounds i32, i32* %294, i64 4, !dbg !216
  %298 = bitcast i32* %297 to <4 x i32>*, !dbg !216
  %299 = load <4 x i32>, <4 x i32>* %298, align 4, !dbg !216, !tbaa !98
  %300 = icmp ult <4 x i32> %290, %296, !dbg !217
  %301 = icmp ult <4 x i32> %293, %299, !dbg !217
  %302 = select <4 x i1> %300, <4 x i32> %296, <4 x i32> %290, !dbg !218
  %303 = select <4 x i1> %301, <4 x i32> %299, <4 x i32> %293, !dbg !218
  %304 = getelementptr inbounds i32, i32* %232, i64 %287, !dbg !211
  %305 = bitcast i32* %304 to <4 x i32>*, !dbg !219
  store <4 x i32> %302, <4 x i32>* %305, align 4, !dbg !219, !tbaa !98
  %306 = getelementptr inbounds i32, i32* %304, i64 4, !dbg !219
  %307 = bitcast i32* %306 to <4 x i32>*, !dbg !219
  store <4 x i32> %303, <4 x i32>* %307, align 4, !dbg !219, !tbaa !98
  %308 = add nuw i64 %287, 8, !dbg !211
  %309 = icmp eq i64 %308, %285, !dbg !211
  br i1 %309, label %310, label %286, !dbg !211, !llvm.loop !220

310:                                              ; preds = %286
  %311 = icmp eq i64 %214, %285, !dbg !210
  br i1 %311, label %325, label %312, !dbg !210

312:                                              ; preds = %282, %310
  %313 = phi i64 [ 0, %282 ], [ %285, %310 ]
  br label %314, !dbg !210

314:                                              ; preds = %312, %314
  %315 = phi i64 [ %323, %314 ], [ %313, %312 ]
  %316 = getelementptr inbounds i32, i32* %29, i64 %315, !dbg !215
  %317 = load i32, i32* %316, align 4, !dbg !215, !tbaa !98
  %318 = getelementptr inbounds i32, i32* %148, i64 %315, !dbg !216
  %319 = load i32, i32* %318, align 4, !dbg !216, !tbaa !98
  %320 = icmp ult i32 %317, %319, !dbg !217
  %321 = select i1 %320, i32 %319, i32 %317, !dbg !218
  %322 = getelementptr inbounds i32, i32* %232, i64 %315, !dbg !221
  store i32 %321, i32* %322, align 4, !dbg !219, !tbaa !98
  %323 = add nuw i64 %315, 1, !dbg !211
  %324 = icmp eq i64 %323, %214, !dbg !222
  br i1 %324, label %325, label %314, !dbg !210, !llvm.loop !223

325:                                              ; preds = %342, %314, %278, %310, %228
  %326 = ptrtoint %struct.ink_block* %231 to i64, !dbg !224
  %327 = insertvalue [2 x i64] undef, i64 %326, 0, !dbg !224
  %328 = insertvalue [2 x i64] %327, i64 %214, 1, !dbg !224
  ret [2 x i64] %328, !dbg !224

329:                                              ; preds = %280, %342
  %330 = phi i64 [ %345, %342 ], [ %281, %280 ]
  %331 = getelementptr inbounds i32, i32* %29, i64 %330, !dbg !215
  %332 = load i32, i32* %331, align 4, !dbg !215, !tbaa !98
  %333 = getelementptr inbounds i32, i32* %148, i64 %330, !dbg !216
  %334 = load i32, i32* %333, align 4, !dbg !216, !tbaa !98
  %335 = icmp ult i32 %332, %334, !dbg !217
  br i1 %335, label %336, label %339, !dbg !218

336:                                              ; preds = %329
  %337 = udiv i32 %332, %3, !dbg !225
  %338 = add i32 %337, %334, !dbg !226
  br label %342, !dbg !227

339:                                              ; preds = %329
  %340 = urem i32 %334, %3, !dbg !228
  %341 = add i32 %340, %332, !dbg !229
  br label %342

342:                                              ; preds = %339, %336
  %343 = phi i32 [ %338, %336 ], [ %341, %339 ], !dbg !212
  %344 = getelementptr inbounds i32, i32* %232, i64 %330, !dbg !221
  store i32 %343, i32* %344, align 4, !dbg !219, !tbaa !98
  %345 = add nuw i64 %330, 1, !dbg !211
  %346 = icmp eq i64 %345, %214, !dbg !222
  br i1 %346, label %325, label %329, !dbg !210, !llvm.loop !230
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_left_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !231 {
  %5 = icmp eq i32 %3, 0, !dbg !232
  br i1 %5, label %9, label %6, !dbg !233

6:                                                ; preds = %4
  %7 = udiv i32 %1, %3, !dbg !234
  %8 = urem i32 %0, %3, !dbg !235
  br label %9

9:                                                ; preds = %4, %6
  %10 = phi i32 [ %7, %6 ], [ 0, %4 ]
  %11 = phi i32 [ %8, %6 ], [ 0, %4 ], !dbg !236
  %12 = add i32 %10, %2, !dbg !237
  %13 = add i32 %12, %11, !dbg !238
  ret i32 %13, !dbg !239
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_left_signal(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !240 {
  %5 = icmp eq i32 %3, 0, !dbg !241
  br i1 %5, label %9, label %6, !dbg !242

6:                                                ; preds = %4
  %7 = udiv i32 %1, %3, !dbg !243
  %8 = urem i32 %0, %3, !dbg !244
  br label %9

9:                                                ; preds = %4, %6
  %10 = phi i32 [ %7, %6 ], [ 0, %4 ]
  %11 = phi i32 [ %8, %6 ], [ 0, %4 ], !dbg !245
  %12 = add i32 %10, %2, !dbg !246
  %13 = add i32 %12, %11, !dbg !247
  ret i32 %13, !dbg !248
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_right_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !249 {
  %5 = icmp ult i32 %0, %2, !dbg !250
  %6 = add i32 %3, %1, !dbg !251
  %7 = mul i32 %1, 3, !dbg !251
  %8 = select i1 %5, i32 %6, i32 %7, !dbg !251
  ret i32 %8, !dbg !252
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_right_signal(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !253 {
  %5 = icmp ult i32 %0, %2, !dbg !254
  %6 = add i32 %3, %1, !dbg !255
  %7 = mul i32 %1, 3, !dbg !255
  %8 = select i1 %5, i32 %6, i32 %7, !dbg !255
  ret i32 %8, !dbg !256
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_pair_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !257 {
  %5 = icmp ult i32 %0, %1, !dbg !258
  %6 = icmp eq i32 %3, 0, !dbg !259
  br i1 %5, label %7, label %13, !dbg !260

7:                                                ; preds = %4
  br i1 %6, label %10, label %8, !dbg !261

8:                                                ; preds = %7
  %9 = udiv i32 %0, %3, !dbg !262
  br label %10

10:                                               ; preds = %7, %8
  %11 = phi i32 [ %9, %8 ], [ 0, %7 ], !dbg !259
  %12 = add i32 %11, %1, !dbg !263
  br label %19, !dbg !264

13:                                               ; preds = %4
  br i1 %6, label %16, label %14, !dbg !265

14:                                               ; preds = %13
  %15 = urem i32 %1, %3, !dbg !266
  br label %16

16:                                               ; preds = %13, %14
  %17 = phi i32 [ %15, %14 ], [ 0, %13 ], !dbg !259
  %18 = add i32 %17, %0, !dbg !267
  br label %19

19:                                               ; preds = %16, %10
  %20 = phi i32 [ %12, %10 ], [ %18, %16 ], !dbg !259
  ret i32 %20, !dbg !268
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_pair_signal(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !269 {
  %5 = icmp ult i32 %0, %1, !dbg !270
  %6 = icmp eq i32 %3, 0, !dbg !271
  br i1 %5, label %7, label %13, !dbg !272

7:                                                ; preds = %4
  br i1 %6, label %10, label %8, !dbg !273

8:                                                ; preds = %7
  %9 = udiv i32 %0, %3, !dbg !274
  br label %10

10:                                               ; preds = %7, %8
  %11 = phi i32 [ %9, %8 ], [ 0, %7 ], !dbg !271
  %12 = add i32 %11, %1, !dbg !275
  br label %19, !dbg !276

13:                                               ; preds = %4
  br i1 %6, label %16, label %14, !dbg !277

14:                                               ; preds = %13
  %15 = urem i32 %1, %3, !dbg !278
  br label %16

16:                                               ; preds = %13, %14
  %17 = phi i32 [ %15, %14 ], [ 0, %13 ], !dbg !271
  %18 = add i32 %17, %0, !dbg !279
  br label %19

19:                                               ; preds = %16, %10
  %20 = phi i32 [ %12, %10 ], [ %18, %16 ], !dbg !271
  ret i32 %20, !dbg !280
}

; Function Attrs: nounwind ssp uwtable
define i64 @lang_fn_pipeline38_right_padded_zip_heldout_u32_into([2 x i64] %0, [2 x i64] %1, i32 %2, i32 %3, i32* nocapture %4) local_unnamed_addr #0 !dbg !281 {
  %6 = extractvalue [2 x i64] %0, 0
  %7 = inttoptr i64 %6 to i32*
  %8 = inttoptr i64 %6 to i8*
  %9 = extractvalue [2 x i64] %0, 1
  %10 = extractvalue [2 x i64] %1, 0
  %11 = extractvalue [2 x i64] %1, 1
  %12 = icmp ugt i64 %9, 4611686018427387903, !dbg !282
  br i1 %12, label %13, label %14, !dbg !284

13:                                               ; preds = %5
  tail call fastcc void @ink_fail() #11, !dbg !285
  unreachable

14:                                               ; preds = %5
  %15 = icmp eq i64 %9, 0, !dbg !286
  %16 = shl nuw i64 %9, 2, !dbg !287
  %17 = select i1 %15, i64 4, i64 %16, !dbg !287
  %18 = icmp ugt i64 %17, -17, !dbg !288
  br i1 %18, label %19, label %20, !dbg !289

19:                                               ; preds = %14
  tail call fastcc void @ink_fail() #11, !dbg !290
  unreachable

20:                                               ; preds = %14
  %21 = add nuw i64 %17, 16, !dbg !291
  %22 = tail call i8* @malloc(i64 %21) #12, !dbg !292
  %23 = bitcast i8* %22 to %struct.ink_block*, !dbg !292
  %24 = icmp eq i8* %22, null, !dbg !293
  br i1 %24, label %25, label %26, !dbg !294

25:                                               ; preds = %20
  tail call fastcc void @ink_fail() #11, !dbg !295
  unreachable

26:                                               ; preds = %20
  %27 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !296, !tbaa !18
  %28 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %23, i64 0, i32 0, !dbg !297
  store %struct.ink_block* %27, %struct.ink_block** %28, align 8, !dbg !298, !tbaa !24
  store i8* %22, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !299, !tbaa !18
  %29 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %23, i64 1, !dbg !300
  %30 = bitcast %struct.ink_block* %29 to i32*, !dbg !301
  br i1 %15, label %56, label %31, !dbg !302

31:                                               ; preds = %26
  %32 = icmp eq i32 %3, 0
  br i1 %32, label %33, label %102, !dbg !302

33:                                               ; preds = %31
  %34 = icmp ult i64 %9, 8, !dbg !302
  br i1 %34, label %49, label %35, !dbg !302

35:                                               ; preds = %33
  %36 = and i64 %9, -8, !dbg !302
  %37 = insertelement <4 x i32> poison, i32 %2, i32 0, !dbg !302
  %38 = shufflevector <4 x i32> %37, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !302
  br label %39, !dbg !302

39:                                               ; preds = %39, %35
  %40 = phi i64 [ 0, %35 ], [ %45, %39 ], !dbg !303
  %41 = getelementptr inbounds i32, i32* %30, i64 %40, !dbg !303
  %42 = bitcast i32* %41 to <4 x i32>*, !dbg !304
  store <4 x i32> %38, <4 x i32>* %42, align 4, !dbg !304, !tbaa !98
  %43 = getelementptr inbounds i32, i32* %41, i64 4, !dbg !304
  %44 = bitcast i32* %43 to <4 x i32>*, !dbg !304
  store <4 x i32> %38, <4 x i32>* %44, align 4, !dbg !304, !tbaa !98
  %45 = add nuw i64 %40, 8, !dbg !303
  %46 = icmp eq i64 %45, %36, !dbg !303
  br i1 %46, label %47, label %39, !dbg !303, !llvm.loop !305

47:                                               ; preds = %39
  %48 = icmp eq i64 %9, %36, !dbg !302
  br i1 %48, label %56, label %49, !dbg !302

49:                                               ; preds = %33, %47
  %50 = phi i64 [ 0, %33 ], [ %36, %47 ]
  br label %51, !dbg !302

51:                                               ; preds = %49, %51
  %52 = phi i64 [ %54, %51 ], [ %50, %49 ]
  %53 = getelementptr inbounds i32, i32* %30, i64 %52, !dbg !307
  store i32 %2, i32* %53, align 4, !dbg !304, !tbaa !98
  %54 = add nuw i64 %52, 1, !dbg !303
  %55 = icmp eq i64 %54, %9, !dbg !308
  br i1 %55, label %56, label %51, !dbg !302, !llvm.loop !309

56:                                               ; preds = %102, %51, %47, %26
  %57 = tail call i8* @malloc(i64 %21) #12, !dbg !310
  %58 = icmp eq i8* %57, null, !dbg !312
  br i1 %58, label %59, label %60, !dbg !313

59:                                               ; preds = %56
  tail call fastcc void @ink_fail() #11, !dbg !314
  unreachable

60:                                               ; preds = %56
  %61 = bitcast i8* %57 to %struct.ink_block*, !dbg !310
  %62 = bitcast i8* %57 to i8**, !dbg !315
  store i8* %22, i8** %62, align 8, !dbg !315, !tbaa !24
  store i8* %57, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !316, !tbaa !18
  %63 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %61, i64 1, !dbg !317
  %64 = bitcast %struct.ink_block* %63 to i8*, !dbg !318
  %65 = bitcast %struct.ink_block* %63 to i32*, !dbg !319
  br i1 %15, label %114, label %66, !dbg !320

66:                                               ; preds = %60
  %67 = icmp ult i64 %9, 4, !dbg !320
  br i1 %67, label %100, label %68, !dbg !320

68:                                               ; preds = %66
  %69 = getelementptr i8, i8* %57, i64 16, !dbg !320
  %70 = add i64 %16, 16, !dbg !320
  %71 = getelementptr i8, i8* %57, i64 %70, !dbg !320
  %72 = getelementptr i32, i32* %7, i64 %9, !dbg !320
  %73 = bitcast i32* %72 to i8*, !dbg !320
  %74 = icmp ult i8* %69, %73, !dbg !320
  %75 = icmp ugt i8* %71, %8, !dbg !320
  %76 = and i1 %74, %75, !dbg !320
  br i1 %76, label %100, label %77, !dbg !320

77:                                               ; preds = %68
  %78 = and i64 %9, -4, !dbg !320
  %79 = insertelement <4 x i32> poison, i32 %2, i32 0, !dbg !320
  %80 = shufflevector <4 x i32> %79, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !320
  %81 = insertelement <4 x i32> poison, i32 %3, i32 0, !dbg !320
  %82 = shufflevector <4 x i32> %81, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !320
  br label %83, !dbg !320

83:                                               ; preds = %83, %77
  %84 = phi i64 [ 0, %77 ], [ %95, %83 ], !dbg !321
  %85 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %77 ], [ %96, %83 ], !dbg !322
  %86 = getelementptr inbounds i32, i32* %7, i64 %84, !dbg !321
  %87 = bitcast i32* %86 to <4 x i32>*, !dbg !323
  %88 = load <4 x i32>, <4 x i32>* %87, align 4, !dbg !323, !tbaa !98, !alias.scope !324
  %89 = icmp ult <4 x i32> %85, %80, !dbg !327
  %90 = add <4 x i32> %88, %82, !dbg !328
  %91 = mul <4 x i32> %88, <i32 3, i32 3, i32 3, i32 3>, !dbg !328
  %92 = select <4 x i1> %89, <4 x i32> %90, <4 x i32> %91, !dbg !328
  %93 = getelementptr inbounds i32, i32* %65, i64 %84, !dbg !321
  %94 = bitcast i32* %93 to <4 x i32>*, !dbg !329
  store <4 x i32> %92, <4 x i32>* %94, align 4, !dbg !329, !tbaa !98, !alias.scope !330, !noalias !324
  %95 = add nuw i64 %84, 4, !dbg !321
  %96 = add <4 x i32> %85, <i32 4, i32 4, i32 4, i32 4>, !dbg !322
  %97 = icmp eq i64 %95, %78, !dbg !321
  br i1 %97, label %98, label %83, !dbg !321, !llvm.loop !332

98:                                               ; preds = %83
  %99 = icmp eq i64 %9, %78, !dbg !320
  br i1 %99, label %114, label %100, !dbg !320

100:                                              ; preds = %68, %66, %98
  %101 = phi i64 [ 0, %68 ], [ 0, %66 ], [ %78, %98 ]
  br label %117, !dbg !320

102:                                              ; preds = %31, %102
  %103 = phi i64 [ %112, %102 ], [ 0, %31 ]
  %104 = trunc i64 %103 to i32, !dbg !334
  %105 = getelementptr inbounds i32, i32* %7, i64 %103, !dbg !335
  %106 = load i32, i32* %105, align 4, !dbg !335, !tbaa !98
  %107 = udiv i32 %106, %3, !dbg !336
  %108 = urem i32 %104, %3, !dbg !337
  %109 = add i32 %107, %2, !dbg !338
  %110 = add i32 %109, %108, !dbg !339
  %111 = getelementptr inbounds i32, i32* %30, i64 %103, !dbg !307
  store i32 %110, i32* %111, align 4, !dbg !304, !tbaa !98
  %112 = add nuw i64 %103, 1, !dbg !303
  %113 = icmp eq i64 %112, %9, !dbg !308
  br i1 %113, label %56, label %102, !dbg !302, !llvm.loop !340

114:                                              ; preds = %117, %98, %60
  %115 = xor i64 %11, -1, !dbg !341
  %116 = icmp ugt i64 %9, %115, !dbg !342
  br i1 %116, label %129, label %130, !dbg !343

117:                                              ; preds = %100, %117
  %118 = phi i64 [ %127, %117 ], [ %101, %100 ]
  %119 = trunc i64 %118 to i32, !dbg !322
  %120 = getelementptr inbounds i32, i32* %7, i64 %118, !dbg !323
  %121 = load i32, i32* %120, align 4, !dbg !323, !tbaa !98
  %122 = icmp ult i32 %119, %2, !dbg !327
  %123 = add i32 %121, %3, !dbg !328
  %124 = mul i32 %121, 3, !dbg !328
  %125 = select i1 %122, i32 %123, i32 %124, !dbg !328
  %126 = getelementptr inbounds i32, i32* %65, i64 %118, !dbg !344
  store i32 %125, i32* %126, align 4, !dbg !329, !tbaa !98
  %127 = add nuw i64 %118, 1, !dbg !321
  %128 = icmp eq i64 %127, %9, !dbg !345
  br i1 %128, label %114, label %117, !dbg !320, !llvm.loop !346

129:                                              ; preds = %114
  tail call fastcc void @ink_fail(), !dbg !347
  unreachable

130:                                              ; preds = %114
  %131 = add i64 %11, %9, !dbg !348
  %132 = icmp ugt i64 %131, 4611686018427387903, !dbg !349
  br i1 %132, label %133, label %134, !dbg !351

133:                                              ; preds = %130
  tail call fastcc void @ink_fail() #11, !dbg !352
  unreachable

134:                                              ; preds = %130
  %135 = icmp eq i64 %131, 0, !dbg !353
  %136 = shl nuw i64 %131, 2, !dbg !354
  %137 = select i1 %135, i64 4, i64 %136, !dbg !354
  %138 = icmp ugt i64 %137, -17, !dbg !355
  br i1 %138, label %139, label %140, !dbg !356

139:                                              ; preds = %134
  tail call fastcc void @ink_fail() #11, !dbg !357
  unreachable

140:                                              ; preds = %134
  %141 = add nuw i64 %137, 16, !dbg !358
  %142 = tail call i8* @malloc(i64 %141) #12, !dbg !359
  %143 = icmp eq i8* %142, null, !dbg !360
  br i1 %143, label %144, label %145, !dbg !361

144:                                              ; preds = %140
  tail call fastcc void @ink_fail() #11, !dbg !362
  unreachable

145:                                              ; preds = %140
  %146 = bitcast i8* %142 to %struct.ink_block*, !dbg !359
  %147 = bitcast i8* %142 to i8**, !dbg !363
  store i8* %57, i8** %147, align 8, !dbg !363, !tbaa !24
  store i8* %142, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !364, !tbaa !18
  %148 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %146, i64 1, !dbg !365
  %149 = bitcast %struct.ink_block* %148 to i32*, !dbg !366
  br i1 %15, label %152, label %150, !dbg !367

150:                                              ; preds = %145
  %151 = bitcast %struct.ink_block* %148 to i8*, !dbg !369
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* nonnull align 1 %151, i8* nonnull align 1 %64, i64 %16, i1 false), !dbg !370
  br label %152, !dbg !371

152:                                              ; preds = %150, %145
  %153 = getelementptr inbounds i32, i32* %149, i64 %9, !dbg !371
  %154 = bitcast i32* %153 to i8*, !dbg !372
  %155 = inttoptr i64 %10 to i8*, !dbg !373
  %156 = shl i64 %11, 2, !dbg !374
  %157 = icmp eq i64 %156, 0, !dbg !375
  br i1 %157, label %213, label %158, !dbg !377

158:                                              ; preds = %152
  %159 = icmp ult i64 %156, 8, !dbg !377
  br i1 %159, label %204, label %160, !dbg !377

160:                                              ; preds = %158
  %161 = add i64 %136, 16, !dbg !377
  %162 = getelementptr i8, i8* %142, i64 %161, !dbg !377
  %163 = getelementptr i8, i8* %155, i64 %156, !dbg !377
  %164 = icmp ugt i8* %163, %154, !dbg !377
  %165 = icmp ugt i8* %162, %155, !dbg !377
  %166 = and i1 %164, %165, !dbg !377
  br i1 %166, label %204, label %167, !dbg !377

167:                                              ; preds = %160
  %168 = icmp ult i64 %156, 32, !dbg !377
  br i1 %168, label %190, label %169, !dbg !377

169:                                              ; preds = %167
  %170 = and i64 %156, -32, !dbg !377
  br label %171, !dbg !377

171:                                              ; preds = %171, %169
  %172 = phi i64 [ 0, %169 ], [ %183, %171 ], !dbg !378
  %173 = getelementptr inbounds i8, i8* %155, i64 %172, !dbg !378
  %174 = bitcast i8* %173 to <16 x i8>*, !dbg !379
  %175 = load <16 x i8>, <16 x i8>* %174, align 1, !dbg !379, !tbaa !178, !alias.scope !380
  %176 = getelementptr inbounds i8, i8* %173, i64 16, !dbg !379
  %177 = bitcast i8* %176 to <16 x i8>*, !dbg !379
  %178 = load <16 x i8>, <16 x i8>* %177, align 1, !dbg !379, !tbaa !178, !alias.scope !380
  %179 = getelementptr inbounds i8, i8* %154, i64 %172, !dbg !378
  %180 = bitcast i8* %179 to <16 x i8>*, !dbg !383
  store <16 x i8> %175, <16 x i8>* %180, align 1, !dbg !383, !tbaa !178, !alias.scope !384, !noalias !380
  %181 = getelementptr inbounds i8, i8* %179, i64 16, !dbg !383
  %182 = bitcast i8* %181 to <16 x i8>*, !dbg !383
  store <16 x i8> %178, <16 x i8>* %182, align 1, !dbg !383, !tbaa !178, !alias.scope !384, !noalias !380
  %183 = add nuw i64 %172, 32, !dbg !378
  %184 = icmp eq i64 %183, %170, !dbg !378
  br i1 %184, label %185, label %171, !dbg !378, !llvm.loop !386

185:                                              ; preds = %171
  %186 = icmp eq i64 %156, %170, !dbg !377
  br i1 %186, label %213, label %187, !dbg !377

187:                                              ; preds = %185
  %188 = and i64 %11, 6, !dbg !377
  %189 = icmp eq i64 %188, 0, !dbg !377
  br i1 %189, label %204, label %190, !dbg !377

190:                                              ; preds = %167, %187
  %191 = phi i64 [ %170, %187 ], [ 0, %167 ]
  %192 = and i64 %156, -8, !dbg !377
  br label %193, !dbg !377

193:                                              ; preds = %193, %190
  %194 = phi i64 [ %191, %190 ], [ %200, %193 ], !dbg !378
  %195 = getelementptr inbounds i8, i8* %155, i64 %194, !dbg !378
  %196 = bitcast i8* %195 to <8 x i8>*, !dbg !379
  %197 = load <8 x i8>, <8 x i8>* %196, align 1, !dbg !379, !tbaa !178
  %198 = getelementptr inbounds i8, i8* %154, i64 %194, !dbg !378
  %199 = bitcast i8* %198 to <8 x i8>*, !dbg !383
  store <8 x i8> %197, <8 x i8>* %199, align 1, !dbg !383, !tbaa !178
  %200 = add nuw i64 %194, 8, !dbg !378
  %201 = icmp eq i64 %200, %192, !dbg !378
  br i1 %201, label %202, label %193, !dbg !378, !llvm.loop !388

202:                                              ; preds = %193
  %203 = icmp eq i64 %156, %192, !dbg !377
  br i1 %203, label %213, label %204, !dbg !377

204:                                              ; preds = %160, %158, %187, %202
  %205 = phi i64 [ 0, %158 ], [ 0, %160 ], [ %170, %187 ], [ %192, %202 ]
  br label %206, !dbg !377

206:                                              ; preds = %204, %206
  %207 = phi i64 [ %211, %206 ], [ %205, %204 ]
  %208 = getelementptr inbounds i8, i8* %155, i64 %207, !dbg !379
  %209 = load i8, i8* %208, align 1, !dbg !379, !tbaa !178
  %210 = getelementptr inbounds i8, i8* %154, i64 %207, !dbg !389
  store i8 %209, i8* %210, align 1, !dbg !383, !tbaa !178
  %211 = add nuw i64 %207, 1, !dbg !378
  %212 = icmp eq i64 %211, %156, !dbg !375
  br i1 %212, label %213, label %206, !dbg !377, !llvm.loop !390

213:                                              ; preds = %206, %185, %202, %152
  %214 = icmp ult i64 %9, %131, !dbg !391
  %215 = select i1 %214, i64 %9, i64 %131, !dbg !392
  %216 = icmp eq i64 %215, 0, !dbg !393
  br i1 %216, label %309, label %217, !dbg !394

217:                                              ; preds = %213
  %218 = icmp eq i32 %3, 0
  br i1 %218, label %266, label %219, !dbg !394

219:                                              ; preds = %217
  %220 = icmp ult i64 %215, 2, !dbg !394
  br i1 %220, label %264, label %221, !dbg !394

221:                                              ; preds = %219
  %222 = and i64 %215, -2, !dbg !394
  br label %223, !dbg !394

223:                                              ; preds = %252, %221
  %224 = phi i64 [ 0, %221 ], [ %260, %252 ], !dbg !395
  %225 = or i64 %224, 1, !dbg !395
  %226 = getelementptr inbounds i32, i32* %30, i64 %224, !dbg !395
  %227 = getelementptr inbounds i32, i32* %30, i64 %225, !dbg !395
  %228 = load i32, i32* %226, align 4, !dbg !395, !tbaa !98
  %229 = load i32, i32* %227, align 4, !dbg !395, !tbaa !98
  %230 = getelementptr inbounds i32, i32* %149, i64 %224, !dbg !395
  %231 = getelementptr inbounds i32, i32* %149, i64 %225, !dbg !395
  %232 = load i32, i32* %230, align 4, !dbg !395, !tbaa !98
  %233 = load i32, i32* %231, align 4, !dbg !395, !tbaa !98
  %234 = icmp ult i32 %228, %232, !dbg !395
  %235 = icmp ult i32 %229, %233, !dbg !395
  br i1 %234, label %238, label %236, !dbg !395

236:                                              ; preds = %223
  %237 = urem i32 %232, %3, !dbg !395
  br label %238

238:                                              ; preds = %236, %223
  %239 = phi i32 [ poison, %223 ], [ %237, %236 ], !dbg !395
  br i1 %235, label %242, label %240, !dbg !395

240:                                              ; preds = %238
  %241 = urem i32 %233, %3, !dbg !395
  br label %242

242:                                              ; preds = %240, %238
  %243 = phi i32 [ poison, %238 ], [ %241, %240 ], !dbg !395
  %244 = add i32 %239, %228, !dbg !395
  %245 = add i32 %243, %229, !dbg !395
  br i1 %234, label %246, label %248, !dbg !395

246:                                              ; preds = %242
  %247 = udiv i32 %228, %3, !dbg !395
  br label %248

248:                                              ; preds = %246, %242
  %249 = phi i32 [ poison, %242 ], [ %247, %246 ], !dbg !395
  br i1 %235, label %250, label %252, !dbg !395

250:                                              ; preds = %248
  %251 = udiv i32 %229, %3, !dbg !395
  br label %252

252:                                              ; preds = %250, %248
  %253 = phi i32 [ poison, %248 ], [ %251, %250 ], !dbg !395
  %254 = add i32 %249, %232, !dbg !395
  %255 = add i32 %253, %233, !dbg !395
  %256 = select i1 %234, i32 %254, i32 %244, !dbg !396
  %257 = select i1 %235, i32 %255, i32 %245, !dbg !396
  %258 = getelementptr inbounds i32, i32* %4, i64 %224, !dbg !395
  %259 = getelementptr inbounds i32, i32* %4, i64 %225, !dbg !395
  store i32 %256, i32* %258, align 4, !dbg !395, !tbaa !98
  store i32 %257, i32* %259, align 4, !dbg !395, !tbaa !98
  %260 = add nuw i64 %224, 2, !dbg !395
  %261 = icmp eq i64 %260, %222, !dbg !395
  br i1 %261, label %262, label %223, !dbg !395, !llvm.loop !397

262:                                              ; preds = %252
  %263 = icmp eq i64 %215, %222, !dbg !394
  br i1 %263, label %309, label %264, !dbg !394

264:                                              ; preds = %219, %262
  %265 = phi i64 [ 0, %219 ], [ %222, %262 ]
  br label %310, !dbg !394

266:                                              ; preds = %217
  %267 = icmp ult i64 %215, 8, !dbg !394
  br i1 %267, label %296, label %268, !dbg !394

268:                                              ; preds = %266
  %269 = and i64 %215, -8, !dbg !394
  br label %270, !dbg !394

270:                                              ; preds = %270, %268
  %271 = phi i64 [ 0, %268 ], [ %292, %270 ], !dbg !395
  %272 = getelementptr inbounds i32, i32* %30, i64 %271, !dbg !395
  %273 = bitcast i32* %272 to <4 x i32>*, !dbg !399
  %274 = load <4 x i32>, <4 x i32>* %273, align 4, !dbg !399, !tbaa !98
  %275 = getelementptr inbounds i32, i32* %272, i64 4, !dbg !399
  %276 = bitcast i32* %275 to <4 x i32>*, !dbg !399
  %277 = load <4 x i32>, <4 x i32>* %276, align 4, !dbg !399, !tbaa !98
  %278 = getelementptr inbounds i32, i32* %149, i64 %271, !dbg !395
  %279 = bitcast i32* %278 to <4 x i32>*, !dbg !400
  %280 = load <4 x i32>, <4 x i32>* %279, align 4, !dbg !400, !tbaa !98
  %281 = getelementptr inbounds i32, i32* %278, i64 4, !dbg !400
  %282 = bitcast i32* %281 to <4 x i32>*, !dbg !400
  %283 = load <4 x i32>, <4 x i32>* %282, align 4, !dbg !400, !tbaa !98
  %284 = icmp ult <4 x i32> %274, %280, !dbg !401
  %285 = icmp ult <4 x i32> %277, %283, !dbg !401
  %286 = select <4 x i1> %284, <4 x i32> %280, <4 x i32> %274, !dbg !402
  %287 = select <4 x i1> %285, <4 x i32> %283, <4 x i32> %277, !dbg !402
  %288 = getelementptr inbounds i32, i32* %4, i64 %271, !dbg !395
  %289 = bitcast i32* %288 to <4 x i32>*, !dbg !403
  store <4 x i32> %286, <4 x i32>* %289, align 4, !dbg !403, !tbaa !98
  %290 = getelementptr inbounds i32, i32* %288, i64 4, !dbg !403
  %291 = bitcast i32* %290 to <4 x i32>*, !dbg !403
  store <4 x i32> %287, <4 x i32>* %291, align 4, !dbg !403, !tbaa !98
  %292 = add nuw i64 %271, 8, !dbg !395
  %293 = icmp eq i64 %292, %269, !dbg !395
  br i1 %293, label %294, label %270, !dbg !395, !llvm.loop !404

294:                                              ; preds = %270
  %295 = icmp eq i64 %215, %269, !dbg !394
  br i1 %295, label %309, label %296, !dbg !394

296:                                              ; preds = %266, %294
  %297 = phi i64 [ 0, %266 ], [ %269, %294 ]
  br label %298, !dbg !394

298:                                              ; preds = %296, %298
  %299 = phi i64 [ %307, %298 ], [ %297, %296 ]
  %300 = getelementptr inbounds i32, i32* %30, i64 %299, !dbg !399
  %301 = load i32, i32* %300, align 4, !dbg !399, !tbaa !98
  %302 = getelementptr inbounds i32, i32* %149, i64 %299, !dbg !400
  %303 = load i32, i32* %302, align 4, !dbg !400, !tbaa !98
  %304 = icmp ult i32 %301, %303, !dbg !401
  %305 = select i1 %304, i32 %303, i32 %301, !dbg !402
  %306 = getelementptr inbounds i32, i32* %4, i64 %299, !dbg !405
  store i32 %305, i32* %306, align 4, !dbg !403, !tbaa !98
  %307 = add nuw i64 %299, 1, !dbg !395
  %308 = icmp eq i64 %307, %215, !dbg !393
  br i1 %308, label %309, label %298, !dbg !394, !llvm.loop !406

309:                                              ; preds = %323, %298, %262, %294, %213
  ret i64 %215, !dbg !407

310:                                              ; preds = %264, %323
  %311 = phi i64 [ %326, %323 ], [ %265, %264 ]
  %312 = getelementptr inbounds i32, i32* %30, i64 %311, !dbg !399
  %313 = load i32, i32* %312, align 4, !dbg !399, !tbaa !98
  %314 = getelementptr inbounds i32, i32* %149, i64 %311, !dbg !400
  %315 = load i32, i32* %314, align 4, !dbg !400, !tbaa !98
  %316 = icmp ult i32 %313, %315, !dbg !401
  br i1 %316, label %317, label %320, !dbg !402

317:                                              ; preds = %310
  %318 = udiv i32 %313, %3, !dbg !408
  %319 = add i32 %318, %315, !dbg !409
  br label %323, !dbg !410

320:                                              ; preds = %310
  %321 = urem i32 %315, %3, !dbg !411
  %322 = add i32 %321, %313, !dbg !412
  br label %323

323:                                              ; preds = %320, %317
  %324 = phi i32 [ %319, %317 ], [ %322, %320 ], !dbg !396
  %325 = getelementptr inbounds i32, i32* %4, i64 %311, !dbg !405
  store i32 %324, i32* %325, align 4, !dbg !403, !tbaa !98
  %326 = add nuw i64 %311, 1, !dbg !395
  %327 = icmp eq i64 %326, %215, !dbg !393
  br i1 %327, label %309, label %310, !dbg !394, !llvm.loop !413
}

; Function Attrs: nounwind ssp uwtable
define i64 @ink_compute_into(i32 %0, i8** nocapture readonly %1, i64* nocapture readonly %2, i8* nocapture %3) local_unnamed_addr #0 !dbg !414 {
  %5 = icmp eq i32 %0, 0, !dbg !415
  br i1 %5, label %6, label %31, !dbg !415

6:                                                ; preds = %4
  %7 = bitcast i8** %1 to i32**, !dbg !416
  %8 = load i32*, i32** %7, align 8, !dbg !416, !tbaa !18
  %9 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !417
  %10 = bitcast i8** %9 to i32**, !dbg !417
  %11 = load i32*, i32** %10, align 8, !dbg !417, !tbaa !18
  %12 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !418
  %13 = bitcast i8** %12 to i32**, !dbg !418
  %14 = load i32*, i32** %13, align 8, !dbg !418, !tbaa !18
  %15 = load i32, i32* %14, align 1, !dbg !419
  %16 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !421
  %17 = bitcast i8** %16 to i32**, !dbg !421
  %18 = load i32*, i32** %17, align 8, !dbg !421, !tbaa !18
  %19 = load i32, i32* %18, align 1, !dbg !422
  %20 = load i64, i64* %2, align 8, !dbg !424, !tbaa !425
  %21 = getelementptr inbounds i64, i64* %2, i64 1, !dbg !427
  %22 = load i64, i64* %21, align 8, !dbg !427, !tbaa !425
  %23 = bitcast i8* %3 to i32*, !dbg !428
  %24 = ptrtoint i32* %8 to i64, !dbg !429
  %25 = insertvalue [2 x i64] undef, i64 %24, 0, !dbg !429
  %26 = insertvalue [2 x i64] %25, i64 %20, 1, !dbg !429
  %27 = ptrtoint i32* %11 to i64, !dbg !429
  %28 = insertvalue [2 x i64] undef, i64 %27, 0, !dbg !429
  %29 = insertvalue [2 x i64] %28, i64 %22, 1, !dbg !429
  %30 = tail call i64 @lang_fn_pipeline38_right_padded_zip_heldout_u32_into([2 x i64] %26, [2 x i64] %29, i32 %15, i32 %19, i32* %23), !dbg !429
  ret i64 %30, !dbg !430

31:                                               ; preds = %4
  tail call fastcc void @ink_fail(), !dbg !431
  unreachable
}

; Function Attrs: nounwind ssp uwtable
define void @ink_compute_call(i32 %0, i8** readonly %1, i64* nocapture readonly %2, i8** nocapture %3, i64* nocapture %4) local_unnamed_addr #0 !dbg !432 {
  switch i32 %0, label %239 [
    i32 0, label %6
    i32 1, label %33
    i32 2, label %68
    i32 3, label %103
    i32 4, label %133
    i32 5, label %163
    i32 6, label %201
  ], !dbg !433

6:                                                ; preds = %5
  %7 = bitcast i8** %1 to i32**, !dbg !434
  %8 = load i32*, i32** %7, align 8, !dbg !434, !tbaa !18
  %9 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !435
  %10 = bitcast i8** %9 to i32**, !dbg !435
  %11 = load i32*, i32** %10, align 8, !dbg !435, !tbaa !18
  %12 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !436
  %13 = bitcast i8** %12 to i32**, !dbg !436
  %14 = load i32*, i32** %13, align 8, !dbg !436, !tbaa !18
  %15 = load i32, i32* %14, align 1, !dbg !437
  %16 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !439
  %17 = bitcast i8** %16 to i32**, !dbg !439
  %18 = load i32*, i32** %17, align 8, !dbg !439, !tbaa !18
  %19 = load i32, i32* %18, align 1, !dbg !440
  %20 = load i64, i64* %2, align 8, !dbg !442, !tbaa !425
  %21 = getelementptr inbounds i64, i64* %2, i64 1, !dbg !443
  %22 = load i64, i64* %21, align 8, !dbg !443, !tbaa !425
  %23 = ptrtoint i32* %8 to i64, !dbg !444
  %24 = insertvalue [2 x i64] undef, i64 %23, 0, !dbg !444
  %25 = insertvalue [2 x i64] %24, i64 %20, 1, !dbg !444
  %26 = ptrtoint i32* %11 to i64, !dbg !444
  %27 = insertvalue [2 x i64] undef, i64 %26, 0, !dbg !444
  %28 = insertvalue [2 x i64] %27, i64 %22, 1, !dbg !444
  %29 = tail call [2 x i64] @lang_fn_pipeline38_right_padded_zip_heldout_u32([2 x i64] %25, [2 x i64] %28, i32 %15, i32 %19), !dbg !444
  %30 = extractvalue [2 x i64] %29, 0, !dbg !444
  %31 = extractvalue [2 x i64] %29, 1, !dbg !444
  %32 = inttoptr i64 %30 to i8*, !dbg !445
  store i8* %32, i8** %3, align 8, !dbg !446, !tbaa !18
  store i64 %31, i64* %4, align 8, !dbg !447, !tbaa !425
  br label %240

33:                                               ; preds = %5
  %34 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !448
  %35 = bitcast i8** %34 to i32**, !dbg !448
  %36 = load i32*, i32** %35, align 8, !dbg !448, !tbaa !18
  %37 = load i32, i32* %36, align 1, !dbg !449
  %38 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !451
  %39 = bitcast i8** %38 to i32**, !dbg !451
  %40 = load i32*, i32** %39, align 8, !dbg !451, !tbaa !18
  %41 = load i32, i32* %40, align 1, !dbg !452
  %42 = icmp eq i32 %41, 0, !dbg !454
  br i1 %42, label %53, label %43, !dbg !456

43:                                               ; preds = %33
  %44 = bitcast i8** %1 to i32**, !dbg !457
  %45 = load i32*, i32** %44, align 8, !dbg !457, !tbaa !18
  %46 = load i32, i32* %45, align 1, !dbg !458
  %47 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !460
  %48 = bitcast i8** %47 to i32**, !dbg !460
  %49 = load i32*, i32** %48, align 8, !dbg !460, !tbaa !18
  %50 = load i32, i32* %49, align 1, !dbg !461
  %51 = udiv i32 %50, %41, !dbg !463
  %52 = urem i32 %46, %41, !dbg !464
  br label %53

53:                                               ; preds = %33, %43
  %54 = phi i32 [ %51, %43 ], [ 0, %33 ]
  %55 = phi i32 [ %52, %43 ], [ 0, %33 ], !dbg !465
  %56 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !466
  %57 = bitcast i8* %56 to %struct.ink_block*, !dbg !466
  %58 = icmp eq i8* %56, null, !dbg !468
  br i1 %58, label %59, label %60, !dbg !469

59:                                               ; preds = %53
  tail call fastcc void @ink_fail() #11, !dbg !470
  unreachable

60:                                               ; preds = %53
  %61 = add i32 %54, %37, !dbg !471
  %62 = add i32 %61, %55, !dbg !472
  %63 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !473, !tbaa !18
  %64 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %57, i64 0, i32 0, !dbg !474
  store %struct.ink_block* %63, %struct.ink_block** %64, align 8, !dbg !475, !tbaa !24
  store i8* %56, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !476, !tbaa !18
  %65 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %57, i64 1, !dbg !477
  %66 = bitcast %struct.ink_block* %65 to i32*, !dbg !478
  store i32 %62, i32* %66, align 4, !dbg !479, !tbaa !98
  %67 = bitcast i8** %3 to %struct.ink_block**, !dbg !480
  store %struct.ink_block* %65, %struct.ink_block** %67, align 8, !dbg !480, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !481, !tbaa !425
  br label %240

68:                                               ; preds = %5
  %69 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !482
  %70 = bitcast i8** %69 to i32**, !dbg !482
  %71 = load i32*, i32** %70, align 8, !dbg !482, !tbaa !18
  %72 = load i32, i32* %71, align 1, !dbg !483
  %73 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !485
  %74 = bitcast i8** %73 to i32**, !dbg !485
  %75 = load i32*, i32** %74, align 8, !dbg !485, !tbaa !18
  %76 = load i32, i32* %75, align 1, !dbg !486
  %77 = icmp eq i32 %76, 0, !dbg !488
  br i1 %77, label %88, label %78, !dbg !490

78:                                               ; preds = %68
  %79 = bitcast i8** %1 to i32**, !dbg !491
  %80 = load i32*, i32** %79, align 8, !dbg !491, !tbaa !18
  %81 = load i32, i32* %80, align 1, !dbg !492
  %82 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !494
  %83 = bitcast i8** %82 to i32**, !dbg !494
  %84 = load i32*, i32** %83, align 8, !dbg !494, !tbaa !18
  %85 = load i32, i32* %84, align 1, !dbg !495
  %86 = udiv i32 %85, %76, !dbg !497
  %87 = urem i32 %81, %76, !dbg !498
  br label %88

88:                                               ; preds = %68, %78
  %89 = phi i32 [ %86, %78 ], [ 0, %68 ]
  %90 = phi i32 [ %87, %78 ], [ 0, %68 ], !dbg !499
  %91 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !500
  %92 = bitcast i8* %91 to %struct.ink_block*, !dbg !500
  %93 = icmp eq i8* %91, null, !dbg !502
  br i1 %93, label %94, label %95, !dbg !503

94:                                               ; preds = %88
  tail call fastcc void @ink_fail() #11, !dbg !504
  unreachable

95:                                               ; preds = %88
  %96 = add i32 %89, %72, !dbg !505
  %97 = add i32 %96, %90, !dbg !506
  %98 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !507, !tbaa !18
  %99 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %92, i64 0, i32 0, !dbg !508
  store %struct.ink_block* %98, %struct.ink_block** %99, align 8, !dbg !509, !tbaa !24
  store i8* %91, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !510, !tbaa !18
  %100 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %92, i64 1, !dbg !511
  %101 = bitcast %struct.ink_block* %100 to i32*, !dbg !512
  store i32 %97, i32* %101, align 4, !dbg !513, !tbaa !98
  %102 = bitcast i8** %3 to %struct.ink_block**, !dbg !514
  store %struct.ink_block* %100, %struct.ink_block** %102, align 8, !dbg !514, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !515, !tbaa !425
  br label %240

103:                                              ; preds = %5
  %104 = bitcast i8** %1 to i32**, !dbg !516
  %105 = load i32*, i32** %104, align 8, !dbg !516, !tbaa !18
  %106 = load i32, i32* %105, align 1, !dbg !517
  %107 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !519
  %108 = bitcast i8** %107 to i32**, !dbg !519
  %109 = load i32*, i32** %108, align 8, !dbg !519, !tbaa !18
  %110 = load i32, i32* %109, align 1, !dbg !520
  %111 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !522
  %112 = bitcast i8** %111 to i32**, !dbg !522
  %113 = load i32*, i32** %112, align 8, !dbg !522, !tbaa !18
  %114 = load i32, i32* %113, align 1, !dbg !523
  %115 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !525
  %116 = bitcast i8** %115 to i32**, !dbg !525
  %117 = load i32*, i32** %116, align 8, !dbg !525, !tbaa !18
  %118 = load i32, i32* %117, align 1, !dbg !526
  %119 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !528
  %120 = bitcast i8* %119 to %struct.ink_block*, !dbg !528
  %121 = icmp eq i8* %119, null, !dbg !530
  br i1 %121, label %122, label %123, !dbg !531

122:                                              ; preds = %103
  tail call fastcc void @ink_fail() #11, !dbg !532
  unreachable

123:                                              ; preds = %103
  %124 = icmp ult i32 %106, %114, !dbg !533
  %125 = add i32 %118, %110, !dbg !535
  %126 = mul i32 %110, 3, !dbg !535
  %127 = select i1 %124, i32 %125, i32 %126, !dbg !535
  %128 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !536, !tbaa !18
  %129 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %120, i64 0, i32 0, !dbg !537
  store %struct.ink_block* %128, %struct.ink_block** %129, align 8, !dbg !538, !tbaa !24
  store i8* %119, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !539, !tbaa !18
  %130 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %120, i64 1, !dbg !540
  %131 = bitcast %struct.ink_block* %130 to i32*, !dbg !541
  store i32 %127, i32* %131, align 4, !dbg !542, !tbaa !98
  %132 = bitcast i8** %3 to %struct.ink_block**, !dbg !543
  store %struct.ink_block* %130, %struct.ink_block** %132, align 8, !dbg !543, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !544, !tbaa !425
  br label %240

133:                                              ; preds = %5
  %134 = bitcast i8** %1 to i32**, !dbg !545
  %135 = load i32*, i32** %134, align 8, !dbg !545, !tbaa !18
  %136 = load i32, i32* %135, align 1, !dbg !546
  %137 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !548
  %138 = bitcast i8** %137 to i32**, !dbg !548
  %139 = load i32*, i32** %138, align 8, !dbg !548, !tbaa !18
  %140 = load i32, i32* %139, align 1, !dbg !549
  %141 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !551
  %142 = bitcast i8** %141 to i32**, !dbg !551
  %143 = load i32*, i32** %142, align 8, !dbg !551, !tbaa !18
  %144 = load i32, i32* %143, align 1, !dbg !552
  %145 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !554
  %146 = bitcast i8** %145 to i32**, !dbg !554
  %147 = load i32*, i32** %146, align 8, !dbg !554, !tbaa !18
  %148 = load i32, i32* %147, align 1, !dbg !555
  %149 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !557
  %150 = bitcast i8* %149 to %struct.ink_block*, !dbg !557
  %151 = icmp eq i8* %149, null, !dbg !559
  br i1 %151, label %152, label %153, !dbg !560

152:                                              ; preds = %133
  tail call fastcc void @ink_fail() #11, !dbg !561
  unreachable

153:                                              ; preds = %133
  %154 = icmp ult i32 %136, %144, !dbg !562
  %155 = add i32 %148, %140, !dbg !564
  %156 = mul i32 %140, 3, !dbg !564
  %157 = select i1 %154, i32 %155, i32 %156, !dbg !564
  %158 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !565, !tbaa !18
  %159 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %150, i64 0, i32 0, !dbg !566
  store %struct.ink_block* %158, %struct.ink_block** %159, align 8, !dbg !567, !tbaa !24
  store i8* %149, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !568, !tbaa !18
  %160 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %150, i64 1, !dbg !569
  %161 = bitcast %struct.ink_block* %160 to i32*, !dbg !570
  store i32 %157, i32* %161, align 4, !dbg !571, !tbaa !98
  %162 = bitcast i8** %3 to %struct.ink_block**, !dbg !572
  store %struct.ink_block* %160, %struct.ink_block** %162, align 8, !dbg !572, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !573, !tbaa !425
  br label %240

163:                                              ; preds = %5
  %164 = bitcast i8** %1 to i32**, !dbg !574
  %165 = load i32*, i32** %164, align 8, !dbg !574, !tbaa !18
  %166 = load i32, i32* %165, align 1, !dbg !575
  %167 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !577
  %168 = bitcast i8** %167 to i32**, !dbg !577
  %169 = load i32*, i32** %168, align 8, !dbg !577, !tbaa !18
  %170 = load i32, i32* %169, align 1, !dbg !578
  %171 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !580
  %172 = bitcast i8** %171 to i32**, !dbg !580
  %173 = load i32*, i32** %172, align 8, !dbg !580, !tbaa !18
  %174 = load i32, i32* %173, align 1, !dbg !581
  %175 = icmp ult i32 %166, %170, !dbg !583
  %176 = icmp eq i32 %174, 0, !dbg !585
  br i1 %175, label %177, label %183, !dbg !586

177:                                              ; preds = %163
  br i1 %176, label %180, label %178, !dbg !587

178:                                              ; preds = %177
  %179 = udiv i32 %166, %174, !dbg !588
  br label %180

180:                                              ; preds = %178, %177
  %181 = phi i32 [ %179, %178 ], [ 0, %177 ], !dbg !585
  %182 = add i32 %181, %170, !dbg !589
  br label %189, !dbg !590

183:                                              ; preds = %163
  br i1 %176, label %186, label %184, !dbg !591

184:                                              ; preds = %183
  %185 = urem i32 %170, %174, !dbg !592
  br label %186

186:                                              ; preds = %184, %183
  %187 = phi i32 [ %185, %184 ], [ 0, %183 ], !dbg !585
  %188 = add i32 %187, %166, !dbg !593
  br label %189

189:                                              ; preds = %180, %186
  %190 = phi i32 [ %182, %180 ], [ %188, %186 ], !dbg !585
  %191 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !594
  %192 = bitcast i8* %191 to %struct.ink_block*, !dbg !594
  %193 = icmp eq i8* %191, null, !dbg !596
  br i1 %193, label %194, label %195, !dbg !597

194:                                              ; preds = %189
  tail call fastcc void @ink_fail() #11, !dbg !598
  unreachable

195:                                              ; preds = %189
  %196 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !599, !tbaa !18
  %197 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %192, i64 0, i32 0, !dbg !600
  store %struct.ink_block* %196, %struct.ink_block** %197, align 8, !dbg !601, !tbaa !24
  store i8* %191, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !602, !tbaa !18
  %198 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %192, i64 1, !dbg !603
  %199 = bitcast %struct.ink_block* %198 to i32*, !dbg !604
  store i32 %190, i32* %199, align 4, !dbg !605, !tbaa !98
  %200 = bitcast i8** %3 to %struct.ink_block**, !dbg !606
  store %struct.ink_block* %198, %struct.ink_block** %200, align 8, !dbg !606, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !607, !tbaa !425
  br label %240

201:                                              ; preds = %5
  %202 = bitcast i8** %1 to i32**, !dbg !608
  %203 = load i32*, i32** %202, align 8, !dbg !608, !tbaa !18
  %204 = load i32, i32* %203, align 1, !dbg !609
  %205 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !611
  %206 = bitcast i8** %205 to i32**, !dbg !611
  %207 = load i32*, i32** %206, align 8, !dbg !611, !tbaa !18
  %208 = load i32, i32* %207, align 1, !dbg !612
  %209 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !614
  %210 = bitcast i8** %209 to i32**, !dbg !614
  %211 = load i32*, i32** %210, align 8, !dbg !614, !tbaa !18
  %212 = load i32, i32* %211, align 1, !dbg !615
  %213 = icmp ult i32 %204, %208, !dbg !617
  %214 = icmp eq i32 %212, 0, !dbg !619
  br i1 %213, label %215, label %221, !dbg !620

215:                                              ; preds = %201
  br i1 %214, label %218, label %216, !dbg !621

216:                                              ; preds = %215
  %217 = udiv i32 %204, %212, !dbg !622
  br label %218

218:                                              ; preds = %216, %215
  %219 = phi i32 [ %217, %216 ], [ 0, %215 ], !dbg !619
  %220 = add i32 %219, %208, !dbg !623
  br label %227, !dbg !624

221:                                              ; preds = %201
  br i1 %214, label %224, label %222, !dbg !625

222:                                              ; preds = %221
  %223 = urem i32 %208, %212, !dbg !626
  br label %224

224:                                              ; preds = %222, %221
  %225 = phi i32 [ %223, %222 ], [ 0, %221 ], !dbg !619
  %226 = add i32 %225, %204, !dbg !627
  br label %227

227:                                              ; preds = %218, %224
  %228 = phi i32 [ %220, %218 ], [ %226, %224 ], !dbg !619
  %229 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !628
  %230 = bitcast i8* %229 to %struct.ink_block*, !dbg !628
  %231 = icmp eq i8* %229, null, !dbg !630
  br i1 %231, label %232, label %233, !dbg !631

232:                                              ; preds = %227
  tail call fastcc void @ink_fail() #11, !dbg !632
  unreachable

233:                                              ; preds = %227
  %234 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !633, !tbaa !18
  %235 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %230, i64 0, i32 0, !dbg !634
  store %struct.ink_block* %234, %struct.ink_block** %235, align 8, !dbg !635, !tbaa !24
  store i8* %229, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !636, !tbaa !18
  %236 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %230, i64 1, !dbg !637
  %237 = bitcast %struct.ink_block* %236 to i32*, !dbg !638
  store i32 %228, i32* %237, align 4, !dbg !639, !tbaa !98
  %238 = bitcast i8** %3 to %struct.ink_block**, !dbg !640
  store %struct.ink_block* %236, %struct.ink_block** %238, align 8, !dbg !640, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !641, !tbaa !425
  br label %240

239:                                              ; preds = %5
  tail call fastcc void @ink_fail(), !dbg !642
  unreachable

240:                                              ; preds = %233, %195, %153, %123, %95, %60, %6
  ret void, !dbg !643
}

; Function Attrs: nounwind ssp uwtable
define i32 @ink_compute_scalar32(i32 %0, i8** readonly %1, i64* nocapture readnone %2) local_unnamed_addr #0 !dbg !644 {
  switch i32 %0, label %146 [
    i32 1, label %4
    i32 2, label %29
    i32 3, label %54
    i32 4, label %74
    i32 5, label %94
    i32 6, label %120
  ], !dbg !645

4:                                                ; preds = %3
  %5 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !646
  %6 = bitcast i8** %5 to i32**, !dbg !646
  %7 = load i32*, i32** %6, align 8, !dbg !646, !tbaa !18
  %8 = load i32, i32* %7, align 1, !dbg !647
  %9 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !649
  %10 = bitcast i8** %9 to i32**, !dbg !649
  %11 = load i32*, i32** %10, align 8, !dbg !649, !tbaa !18
  %12 = load i32, i32* %11, align 1, !dbg !650
  %13 = icmp eq i32 %12, 0, !dbg !652
  br i1 %13, label %24, label %14, !dbg !654

14:                                               ; preds = %4
  %15 = bitcast i8** %1 to i32**, !dbg !655
  %16 = load i32*, i32** %15, align 8, !dbg !655, !tbaa !18
  %17 = load i32, i32* %16, align 1, !dbg !656
  %18 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !658
  %19 = bitcast i8** %18 to i32**, !dbg !658
  %20 = load i32*, i32** %19, align 8, !dbg !658, !tbaa !18
  %21 = load i32, i32* %20, align 1, !dbg !659
  %22 = udiv i32 %21, %12, !dbg !661
  %23 = urem i32 %17, %12, !dbg !662
  br label %24

24:                                               ; preds = %4, %14
  %25 = phi i32 [ %22, %14 ], [ 0, %4 ]
  %26 = phi i32 [ %23, %14 ], [ 0, %4 ], !dbg !663
  %27 = add i32 %25, %8, !dbg !664
  %28 = add i32 %27, %26, !dbg !665
  br label %147

29:                                               ; preds = %3
  %30 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !666
  %31 = bitcast i8** %30 to i32**, !dbg !666
  %32 = load i32*, i32** %31, align 8, !dbg !666, !tbaa !18
  %33 = load i32, i32* %32, align 1, !dbg !667
  %34 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !669
  %35 = bitcast i8** %34 to i32**, !dbg !669
  %36 = load i32*, i32** %35, align 8, !dbg !669, !tbaa !18
  %37 = load i32, i32* %36, align 1, !dbg !670
  %38 = icmp eq i32 %37, 0, !dbg !672
  br i1 %38, label %49, label %39, !dbg !674

39:                                               ; preds = %29
  %40 = bitcast i8** %1 to i32**, !dbg !675
  %41 = load i32*, i32** %40, align 8, !dbg !675, !tbaa !18
  %42 = load i32, i32* %41, align 1, !dbg !676
  %43 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !678
  %44 = bitcast i8** %43 to i32**, !dbg !678
  %45 = load i32*, i32** %44, align 8, !dbg !678, !tbaa !18
  %46 = load i32, i32* %45, align 1, !dbg !679
  %47 = udiv i32 %46, %37, !dbg !681
  %48 = urem i32 %42, %37, !dbg !682
  br label %49

49:                                               ; preds = %29, %39
  %50 = phi i32 [ %47, %39 ], [ 0, %29 ]
  %51 = phi i32 [ %48, %39 ], [ 0, %29 ], !dbg !683
  %52 = add i32 %50, %33, !dbg !684
  %53 = add i32 %52, %51, !dbg !685
  br label %147

54:                                               ; preds = %3
  %55 = bitcast i8** %1 to i32**, !dbg !686
  %56 = load i32*, i32** %55, align 8, !dbg !686, !tbaa !18
  %57 = load i32, i32* %56, align 1, !dbg !687
  %58 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !689
  %59 = bitcast i8** %58 to i32**, !dbg !689
  %60 = load i32*, i32** %59, align 8, !dbg !689, !tbaa !18
  %61 = load i32, i32* %60, align 1, !dbg !690
  %62 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !692
  %63 = bitcast i8** %62 to i32**, !dbg !692
  %64 = load i32*, i32** %63, align 8, !dbg !692, !tbaa !18
  %65 = load i32, i32* %64, align 1, !dbg !693
  %66 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !695
  %67 = bitcast i8** %66 to i32**, !dbg !695
  %68 = load i32*, i32** %67, align 8, !dbg !695, !tbaa !18
  %69 = load i32, i32* %68, align 1, !dbg !696
  %70 = icmp ult i32 %57, %65, !dbg !698
  %71 = add i32 %69, %61, !dbg !700
  %72 = mul i32 %61, 3, !dbg !700
  %73 = select i1 %70, i32 %71, i32 %72, !dbg !700
  br label %147

74:                                               ; preds = %3
  %75 = bitcast i8** %1 to i32**, !dbg !701
  %76 = load i32*, i32** %75, align 8, !dbg !701, !tbaa !18
  %77 = load i32, i32* %76, align 1, !dbg !702
  %78 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !704
  %79 = bitcast i8** %78 to i32**, !dbg !704
  %80 = load i32*, i32** %79, align 8, !dbg !704, !tbaa !18
  %81 = load i32, i32* %80, align 1, !dbg !705
  %82 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !707
  %83 = bitcast i8** %82 to i32**, !dbg !707
  %84 = load i32*, i32** %83, align 8, !dbg !707, !tbaa !18
  %85 = load i32, i32* %84, align 1, !dbg !708
  %86 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !710
  %87 = bitcast i8** %86 to i32**, !dbg !710
  %88 = load i32*, i32** %87, align 8, !dbg !710, !tbaa !18
  %89 = load i32, i32* %88, align 1, !dbg !711
  %90 = icmp ult i32 %77, %85, !dbg !713
  %91 = add i32 %89, %81, !dbg !715
  %92 = mul i32 %81, 3, !dbg !715
  %93 = select i1 %90, i32 %91, i32 %92, !dbg !715
  br label %147

94:                                               ; preds = %3
  %95 = bitcast i8** %1 to i32**, !dbg !716
  %96 = load i32*, i32** %95, align 8, !dbg !716, !tbaa !18
  %97 = load i32, i32* %96, align 1, !dbg !717
  %98 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !719
  %99 = bitcast i8** %98 to i32**, !dbg !719
  %100 = load i32*, i32** %99, align 8, !dbg !719, !tbaa !18
  %101 = load i32, i32* %100, align 1, !dbg !720
  %102 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !722
  %103 = bitcast i8** %102 to i32**, !dbg !722
  %104 = load i32*, i32** %103, align 8, !dbg !722, !tbaa !18
  %105 = load i32, i32* %104, align 1, !dbg !723
  %106 = icmp ult i32 %97, %101, !dbg !725
  %107 = icmp eq i32 %105, 0, !dbg !727
  br i1 %106, label %108, label %114, !dbg !728

108:                                              ; preds = %94
  br i1 %107, label %111, label %109, !dbg !729

109:                                              ; preds = %108
  %110 = udiv i32 %97, %105, !dbg !730
  br label %111

111:                                              ; preds = %109, %108
  %112 = phi i32 [ %110, %109 ], [ 0, %108 ], !dbg !727
  %113 = add i32 %112, %101, !dbg !731
  br label %147, !dbg !732

114:                                              ; preds = %94
  br i1 %107, label %117, label %115, !dbg !733

115:                                              ; preds = %114
  %116 = urem i32 %101, %105, !dbg !734
  br label %117

117:                                              ; preds = %115, %114
  %118 = phi i32 [ %116, %115 ], [ 0, %114 ], !dbg !727
  %119 = add i32 %118, %97, !dbg !735
  br label %147

120:                                              ; preds = %3
  %121 = bitcast i8** %1 to i32**, !dbg !736
  %122 = load i32*, i32** %121, align 8, !dbg !736, !tbaa !18
  %123 = load i32, i32* %122, align 1, !dbg !737
  %124 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !739
  %125 = bitcast i8** %124 to i32**, !dbg !739
  %126 = load i32*, i32** %125, align 8, !dbg !739, !tbaa !18
  %127 = load i32, i32* %126, align 1, !dbg !740
  %128 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !742
  %129 = bitcast i8** %128 to i32**, !dbg !742
  %130 = load i32*, i32** %129, align 8, !dbg !742, !tbaa !18
  %131 = load i32, i32* %130, align 1, !dbg !743
  %132 = icmp ult i32 %123, %127, !dbg !745
  %133 = icmp eq i32 %131, 0, !dbg !747
  br i1 %132, label %134, label %140, !dbg !748

134:                                              ; preds = %120
  br i1 %133, label %137, label %135, !dbg !749

135:                                              ; preds = %134
  %136 = udiv i32 %123, %131, !dbg !750
  br label %137

137:                                              ; preds = %135, %134
  %138 = phi i32 [ %136, %135 ], [ 0, %134 ], !dbg !747
  %139 = add i32 %138, %127, !dbg !751
  br label %147, !dbg !752

140:                                              ; preds = %120
  br i1 %133, label %143, label %141, !dbg !753

141:                                              ; preds = %140
  %142 = urem i32 %127, %131, !dbg !754
  br label %143

143:                                              ; preds = %141, %140
  %144 = phi i32 [ %142, %141 ], [ 0, %140 ], !dbg !747
  %145 = add i32 %144, %123, !dbg !755
  br label %147

146:                                              ; preds = %3
  tail call fastcc void @ink_fail(), !dbg !756
  unreachable

147:                                              ; preds = %143, %137, %117, %111, %74, %54, %49, %24
  %148 = phi i32 [ %93, %74 ], [ %73, %54 ], [ %53, %49 ], [ %28, %24 ], [ %113, %111 ], [ %119, %117 ], [ %139, %137 ], [ %145, %143 ], !dbg !757
  ret i32 %148, !dbg !758
}

; Function Attrs: noreturn nounwind ssp uwtable
define i64 @ink_compute_scalar64(i32 %0, i8** nocapture readnone %1, i64* nocapture readnone %2) local_unnamed_addr #3 !dbg !759 {
  tail call fastcc void @ink_fail(), !dbg !760
  unreachable
}

; Function Attrs: cold noreturn
declare void @abort() local_unnamed_addr #6

; Function Attrs: mustprogress nofree nosync nounwind readnone speculatable willreturn
declare { i64, i1 } @llvm.umul.with.overflow.i64(i64, i64) #7

; Function Attrs: argmemonly nofree nounwind willreturn
declare void @llvm.memcpy.p0i8.p0i8.i64(i8* noalias nocapture writeonly, i8* noalias nocapture readonly, i64, i1 immarg) #8

attributes #0 = { nounwind ssp uwtable "frame-pointer"="non-leaf" "min-legal-vector-width"="0" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #1 = { inaccessiblemem_or_argmemonly mustprogress nounwind willreturn "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #2 = { mustprogress nofree norecurse nosync nounwind readonly ssp uwtable willreturn "frame-pointer"="non-leaf" "min-legal-vector-width"="0" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #3 = { noreturn nounwind ssp uwtable "frame-pointer"="non-leaf" "min-legal-vector-width"="0" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #4 = { inaccessiblememonly mustprogress nofree nounwind willreturn allocsize(0) "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #5 = { mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn "frame-pointer"="non-leaf" "min-legal-vector-width"="0" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #6 = { cold noreturn "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-a12" "target-features"="+aes,+crc,+crypto,+fp-armv8,+fullfp16,+lse,+neon,+ras,+rcpc,+rdm,+sha2,+v8.3a,+zcm,+zcz" }
attributes #7 = { mustprogress nofree nosync nounwind readnone speculatable willreturn }
attributes #8 = { argmemonly nofree nounwind willreturn }
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
!11 = !DIFile(filename: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_heldout_u32/prior/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
!12 = !{!"Apple clang version 14.0.0 (clang-1400.0.29.202)"}
!13 = distinct !DISubprogram(name: "ink_compute_reset", scope: !14, file: !14, line: 29, type: !15, scopeLine: 29, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!14 = !DIFile(filename: "reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_heldout_u32/prior/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
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
!74 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_heldout_u32", scope: !14, file: !14, line: 85, type: !15, scopeLine: 85, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
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
!97 = !DILocation(line: 132, column: 12, scope: !74)
!98 = !{!99, !99, i64 0}
!99 = !{!"int", !20, i64 0}
!100 = distinct !{!100, !95, !101, !32, !102}
!101 = !DILocation(line: 133, column: 1, scope: !74)
!102 = !{!"llvm.loop.isvectorized", i32 1}
!103 = !DILocation(line: 132, column: 1, scope: !74)
!104 = !DILocation(line: 93, column: 19, scope: !74)
!105 = distinct !{!105, !95, !101, !32, !106, !102}
!106 = !{!"llvm.loop.unroll.runtime.disable"}
!107 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !108)
!108 = distinct !DILocation(line: 138, column: 19, scope: !74)
!109 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !108)
!110 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !108)
!111 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !108)
!112 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !108)
!113 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !108)
!114 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !108)
!115 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !108)
!116 = !DILocation(line: 138, column: 19, scope: !74)
!117 = !DILocation(line: 139, column: 1, scope: !74)
!118 = !DILocation(line: 139, column: 33, scope: !74)
!119 = !DILocation(line: 140, column: 14, scope: !74)
!120 = !DILocation(line: 142, column: 14, scope: !74)
!121 = !{!122}
!122 = distinct !{!122, !123}
!123 = distinct !{!123, !"LVerDomain"}
!124 = !DILocation(line: 161, column: 10, scope: !74)
!125 = !DILocation(line: 161, column: 5, scope: !74)
!126 = !DILocation(line: 170, column: 14, scope: !74)
!127 = !{!128}
!128 = distinct !{!128, !123}
!129 = distinct !{!129, !117, !130, !32, !102}
!130 = !DILocation(line: 171, column: 1, scope: !74)
!131 = !DILocation(line: 94, column: 13, scope: !74)
!132 = !DILocation(line: 96, column: 13, scope: !74)
!133 = !DILocation(line: 119, column: 18, scope: !74)
!134 = !DILocation(line: 129, column: 18, scope: !74)
!135 = !DILocation(line: 130, column: 19, scope: !74)
!136 = !DILocation(line: 132, column: 18, scope: !74)
!137 = distinct !{!137, !95, !101, !32}
!138 = !DILocation(line: 176, column: 20, scope: !74)
!139 = !DILocation(line: 176, column: 11, scope: !74)
!140 = !DILocation(line: 176, column: 4, scope: !74)
!141 = !DILocation(line: 170, column: 1, scope: !74)
!142 = !DILocation(line: 139, column: 21, scope: !74)
!143 = distinct !{!143, !117, !130, !32, !102}
!144 = !DILocation(line: 176, column: 30, scope: !74)
!145 = !DILocation(line: 177, column: 19, scope: !74)
!146 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !147)
!147 = distinct !DILocation(line: 178, column: 19, scope: !74)
!148 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !147)
!149 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !147)
!150 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !147)
!151 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !147)
!152 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !147)
!153 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !147)
!154 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !147)
!155 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !147)
!156 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !147)
!157 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !147)
!158 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !147)
!159 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !147)
!160 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !147)
!161 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !147)
!162 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !147)
!163 = !DILocation(line: 178, column: 19, scope: !74)
!164 = !DILocation(line: 37, column: 138, scope: !165, inlinedAt: !166)
!165 = distinct !DISubprogram(name: "ink_copy", scope: !14, file: !14, line: 37, type: !15, scopeLine: 37, flags: DIFlagPrototyped, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!166 = distinct !DILocation(line: 179, column: 1, scope: !74)
!167 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !147)
!168 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !166)
!169 = !DILocation(line: 180, column: 18, scope: !74)
!170 = !DILocation(line: 180, column: 10, scope: !74)
!171 = !DILocation(line: 180, column: 27, scope: !74)
!172 = !DILocation(line: 180, column: 43, scope: !74)
!173 = !DILocation(line: 37, column: 154, scope: !165, inlinedAt: !174)
!174 = distinct !DILocation(line: 180, column: 1, scope: !74)
!175 = !DILocation(line: 37, column: 138, scope: !165, inlinedAt: !174)
!176 = !DILocation(line: 37, column: 162, scope: !165, inlinedAt: !174)
!177 = !DILocation(line: 37, column: 172, scope: !165, inlinedAt: !174)
!178 = !{!20, !20, i64 0}
!179 = !{!180}
!180 = distinct !{!180, !181}
!181 = distinct !{!181, !"LVerDomain"}
!182 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !174)
!183 = !{!184}
!184 = distinct !{!184, !181}
!185 = distinct !{!185, !175, !186, !32, !102}
!186 = !DILocation(line: 37, column: 177, scope: !165, inlinedAt: !174)
!187 = distinct !{!187, !175, !186, !32, !102}
!188 = !DILocation(line: 37, column: 165, scope: !165, inlinedAt: !174)
!189 = distinct !{!189, !175, !186, !32, !102}
!190 = !DILocation(line: 183, column: 38, scope: !74)
!191 = !DILocation(line: 183, column: 30, scope: !74)
!192 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !193)
!193 = distinct !DILocation(line: 183, column: 19, scope: !74)
!194 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !193)
!195 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !193)
!196 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !193)
!197 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !193)
!198 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !193)
!199 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !193)
!200 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !193)
!201 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !193)
!202 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !193)
!203 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !193)
!204 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !193)
!205 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !193)
!206 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !193)
!207 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !193)
!208 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !193)
!209 = !DILocation(line: 183, column: 19, scope: !74)
!210 = !DILocation(line: 184, column: 1, scope: !74)
!211 = !DILocation(line: 184, column: 65, scope: !74)
!212 = !DILocation(line: 0, scope: !74)
!213 = distinct !{!213, !210, !214, !32, !102}
!214 = !DILocation(line: 232, column: 1, scope: !74)
!215 = !DILocation(line: 185, column: 14, scope: !74)
!216 = !DILocation(line: 187, column: 14, scope: !74)
!217 = !DILocation(line: 206, column: 10, scope: !74)
!218 = !DILocation(line: 206, column: 5, scope: !74)
!219 = !DILocation(line: 231, column: 14, scope: !74)
!220 = distinct !{!220, !210, !214, !32, !102}
!221 = !DILocation(line: 231, column: 1, scope: !74)
!222 = !DILocation(line: 184, column: 21, scope: !74)
!223 = distinct !{!223, !210, !214, !32, !106, !102}
!224 = !DILocation(line: 234, column: 1, scope: !74)
!225 = !DILocation(line: 214, column: 18, scope: !74)
!226 = !DILocation(line: 217, column: 10, scope: !74)
!227 = !DILocation(line: 218, column: 1, scope: !74)
!228 = !DILocation(line: 226, column: 18, scope: !74)
!229 = !DILocation(line: 229, column: 10, scope: !74)
!230 = distinct !{!230, !210, !214, !32, !102}
!231 = distinct !DISubprogram(name: "lang_fn_left_word", scope: !14, file: !14, line: 235, type: !15, scopeLine: 235, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!232 = !DILocation(line: 254, column: 7, scope: !231)
!233 = !DILocation(line: 254, column: 5, scope: !231)
!234 = !DILocation(line: 256, column: 16, scope: !231)
!235 = !DILocation(line: 266, column: 17, scope: !231)
!236 = !DILocation(line: 0, scope: !231)
!237 = !DILocation(line: 267, column: 18, scope: !231)
!238 = !DILocation(line: 269, column: 13, scope: !231)
!239 = !DILocation(line: 269, column: 1, scope: !231)
!240 = distinct !DISubprogram(name: "lang_fn_left_signal", scope: !14, file: !14, line: 271, type: !15, scopeLine: 271, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!241 = !DILocation(line: 281, column: 7, scope: !240)
!242 = !DILocation(line: 281, column: 5, scope: !240)
!243 = !DILocation(line: 283, column: 16, scope: !240)
!244 = !DILocation(line: 293, column: 16, scope: !240)
!245 = !DILocation(line: 0, scope: !240)
!246 = !DILocation(line: 294, column: 17, scope: !240)
!247 = !DILocation(line: 296, column: 12, scope: !240)
!248 = !DILocation(line: 296, column: 1, scope: !240)
!249 = distinct !DISubprogram(name: "lang_fn_right_word", scope: !14, file: !14, line: 298, type: !15, scopeLine: 298, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!250 = !DILocation(line: 315, column: 9, scope: !249)
!251 = !DILocation(line: 315, column: 5, scope: !249)
!252 = !DILocation(line: 324, column: 1, scope: !249)
!253 = distinct !DISubprogram(name: "lang_fn_right_signal", scope: !14, file: !14, line: 326, type: !15, scopeLine: 326, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!254 = !DILocation(line: 334, column: 9, scope: !253)
!255 = !DILocation(line: 334, column: 5, scope: !253)
!256 = !DILocation(line: 343, column: 1, scope: !253)
!257 = distinct !DISubprogram(name: "lang_fn_pair_word", scope: !14, file: !14, line: 345, type: !15, scopeLine: 345, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!258 = !DILocation(line: 362, column: 9, scope: !257)
!259 = !DILocation(line: 0, scope: !257)
!260 = !DILocation(line: 362, column: 5, scope: !257)
!261 = !DILocation(line: 368, column: 5, scope: !257)
!262 = !DILocation(line: 370, column: 16, scope: !257)
!263 = !DILocation(line: 373, column: 8, scope: !257)
!264 = !DILocation(line: 374, column: 1, scope: !257)
!265 = !DILocation(line: 380, column: 5, scope: !257)
!266 = !DILocation(line: 382, column: 18, scope: !257)
!267 = !DILocation(line: 385, column: 9, scope: !257)
!268 = !DILocation(line: 387, column: 1, scope: !257)
!269 = distinct !DISubprogram(name: "lang_fn_pair_signal", scope: !14, file: !14, line: 389, type: !15, scopeLine: 389, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!270 = !DILocation(line: 397, column: 9, scope: !269)
!271 = !DILocation(line: 0, scope: !269)
!272 = !DILocation(line: 397, column: 5, scope: !269)
!273 = !DILocation(line: 403, column: 5, scope: !269)
!274 = !DILocation(line: 405, column: 16, scope: !269)
!275 = !DILocation(line: 408, column: 8, scope: !269)
!276 = !DILocation(line: 409, column: 1, scope: !269)
!277 = !DILocation(line: 415, column: 5, scope: !269)
!278 = !DILocation(line: 417, column: 16, scope: !269)
!279 = !DILocation(line: 420, column: 8, scope: !269)
!280 = !DILocation(line: 422, column: 1, scope: !269)
!281 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_heldout_u32_into", scope: !14, file: !14, line: 424, type: !15, scopeLine: 424, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!282 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !283)
!283 = distinct !DILocation(line: 431, column: 18, scope: !281)
!284 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !283)
!285 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !283)
!286 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !283)
!287 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !283)
!288 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !283)
!289 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !283)
!290 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !283)
!291 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !283)
!292 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !283)
!293 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !283)
!294 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !283)
!295 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !283)
!296 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !283)
!297 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !283)
!298 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !283)
!299 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !283)
!300 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !283)
!301 = !DILocation(line: 431, column: 18, scope: !281)
!302 = !DILocation(line: 432, column: 1, scope: !281)
!303 = !DILocation(line: 432, column: 29, scope: !281)
!304 = !DILocation(line: 471, column: 12, scope: !281)
!305 = distinct !{!305, !302, !306, !32, !102}
!306 = !DILocation(line: 472, column: 1, scope: !281)
!307 = !DILocation(line: 471, column: 1, scope: !281)
!308 = !DILocation(line: 432, column: 19, scope: !281)
!309 = distinct !{!309, !302, !306, !32, !106, !102}
!310 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !311)
!311 = distinct !DILocation(line: 477, column: 19, scope: !281)
!312 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !311)
!313 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !311)
!314 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !311)
!315 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !311)
!316 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !311)
!317 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !311)
!318 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !311)
!319 = !DILocation(line: 477, column: 19, scope: !281)
!320 = !DILocation(line: 478, column: 1, scope: !281)
!321 = !DILocation(line: 478, column: 33, scope: !281)
!322 = !DILocation(line: 479, column: 14, scope: !281)
!323 = !DILocation(line: 481, column: 14, scope: !281)
!324 = !{!325}
!325 = distinct !{!325, !326}
!326 = distinct !{!326, !"LVerDomain"}
!327 = !DILocation(line: 500, column: 10, scope: !281)
!328 = !DILocation(line: 500, column: 5, scope: !281)
!329 = !DILocation(line: 509, column: 14, scope: !281)
!330 = !{!331}
!331 = distinct !{!331, !326}
!332 = distinct !{!332, !320, !333, !32, !102}
!333 = !DILocation(line: 510, column: 1, scope: !281)
!334 = !DILocation(line: 433, column: 13, scope: !281)
!335 = !DILocation(line: 435, column: 13, scope: !281)
!336 = !DILocation(line: 458, column: 18, scope: !281)
!337 = !DILocation(line: 468, column: 18, scope: !281)
!338 = !DILocation(line: 469, column: 19, scope: !281)
!339 = !DILocation(line: 471, column: 18, scope: !281)
!340 = distinct !{!340, !302, !306, !32}
!341 = !DILocation(line: 515, column: 20, scope: !281)
!342 = !DILocation(line: 515, column: 11, scope: !281)
!343 = !DILocation(line: 515, column: 4, scope: !281)
!344 = !DILocation(line: 509, column: 1, scope: !281)
!345 = !DILocation(line: 478, column: 21, scope: !281)
!346 = distinct !{!346, !320, !333, !32, !102}
!347 = !DILocation(line: 515, column: 30, scope: !281)
!348 = !DILocation(line: 516, column: 19, scope: !281)
!349 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !350)
!350 = distinct !DILocation(line: 517, column: 19, scope: !281)
!351 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !350)
!352 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !350)
!353 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !350)
!354 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !350)
!355 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !350)
!356 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !350)
!357 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !350)
!358 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !350)
!359 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !350)
!360 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !350)
!361 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !350)
!362 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !350)
!363 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !350)
!364 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !350)
!365 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !350)
!366 = !DILocation(line: 517, column: 19, scope: !281)
!367 = !DILocation(line: 37, column: 138, scope: !165, inlinedAt: !368)
!368 = distinct !DILocation(line: 518, column: 1, scope: !281)
!369 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !350)
!370 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !368)
!371 = !DILocation(line: 519, column: 18, scope: !281)
!372 = !DILocation(line: 519, column: 10, scope: !281)
!373 = !DILocation(line: 519, column: 27, scope: !281)
!374 = !DILocation(line: 519, column: 43, scope: !281)
!375 = !DILocation(line: 37, column: 154, scope: !165, inlinedAt: !376)
!376 = distinct !DILocation(line: 519, column: 1, scope: !281)
!377 = !DILocation(line: 37, column: 138, scope: !165, inlinedAt: !376)
!378 = !DILocation(line: 37, column: 162, scope: !165, inlinedAt: !376)
!379 = !DILocation(line: 37, column: 172, scope: !165, inlinedAt: !376)
!380 = !{!381}
!381 = distinct !{!381, !382}
!382 = distinct !{!382, !"LVerDomain"}
!383 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !376)
!384 = !{!385}
!385 = distinct !{!385, !382}
!386 = distinct !{!386, !377, !387, !32, !102}
!387 = !DILocation(line: 37, column: 177, scope: !165, inlinedAt: !376)
!388 = distinct !{!388, !377, !387, !32, !102}
!389 = !DILocation(line: 37, column: 165, scope: !165, inlinedAt: !376)
!390 = distinct !{!390, !377, !387, !32, !102}
!391 = !DILocation(line: 522, column: 40, scope: !281)
!392 = !DILocation(line: 522, column: 32, scope: !281)
!393 = !DILocation(line: 523, column: 21, scope: !281)
!394 = !DILocation(line: 523, column: 1, scope: !281)
!395 = !DILocation(line: 523, column: 65, scope: !281)
!396 = !DILocation(line: 0, scope: !281)
!397 = distinct !{!397, !394, !398, !32, !102}
!398 = !DILocation(line: 571, column: 1, scope: !281)
!399 = !DILocation(line: 524, column: 14, scope: !281)
!400 = !DILocation(line: 526, column: 14, scope: !281)
!401 = !DILocation(line: 545, column: 10, scope: !281)
!402 = !DILocation(line: 545, column: 5, scope: !281)
!403 = !DILocation(line: 570, column: 14, scope: !281)
!404 = distinct !{!404, !394, !398, !32, !102}
!405 = !DILocation(line: 570, column: 1, scope: !281)
!406 = distinct !{!406, !394, !398, !32, !106, !102}
!407 = !DILocation(line: 572, column: 1, scope: !281)
!408 = !DILocation(line: 553, column: 18, scope: !281)
!409 = !DILocation(line: 556, column: 10, scope: !281)
!410 = !DILocation(line: 557, column: 1, scope: !281)
!411 = !DILocation(line: 565, column: 18, scope: !281)
!412 = !DILocation(line: 568, column: 10, scope: !281)
!413 = distinct !{!413, !394, !398, !32, !102}
!414 = distinct !DISubprogram(name: "ink_compute_into", scope: !14, file: !14, line: 574, type: !15, scopeLine: 574, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!415 = !DILocation(line: 574, column: 151, scope: !414)
!416 = !DILocation(line: 575, column: 34, scope: !414)
!417 = !DILocation(line: 575, column: 67, scope: !414)
!418 = !DILocation(line: 575, column: 100, scope: !414)
!419 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !420)
!420 = distinct !DILocation(line: 575, column: 87, scope: !414)
!421 = !DILocation(line: 575, column: 145, scope: !414)
!422 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !423)
!423 = distinct !DILocation(line: 575, column: 132, scope: !414)
!424 = !DILocation(line: 575, column: 243, scope: !414)
!425 = !{!426, !426, i64 0}
!426 = !{!"long", !20, i64 0}
!427 = !DILocation(line: 575, column: 273, scope: !414)
!428 = !DILocation(line: 575, column: 291, scope: !414)
!429 = !DILocation(line: 575, column: 172, scope: !414)
!430 = !DILocation(line: 576, column: 30, scope: !414)
!431 = !DILocation(line: 576, column: 9, scope: !414)
!432 = distinct !DISubprogram(name: "ink_compute_call", scope: !14, file: !14, line: 577, type: !15, scopeLine: 577, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!433 = !DILocation(line: 577, column: 142, scope: !432)
!434 = !DILocation(line: 578, column: 34, scope: !432)
!435 = !DILocation(line: 578, column: 67, scope: !432)
!436 = !DILocation(line: 578, column: 100, scope: !432)
!437 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !438)
!438 = distinct !DILocation(line: 578, column: 87, scope: !432)
!439 = !DILocation(line: 578, column: 145, scope: !432)
!440 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !441)
!441 = distinct !DILocation(line: 578, column: 132, scope: !432)
!442 = !DILocation(line: 578, column: 251, scope: !432)
!443 = !DILocation(line: 578, column: 281, scope: !432)
!444 = !DILocation(line: 578, column: 185, scope: !432)
!445 = !DILocation(line: 578, column: 308, scope: !432)
!446 = !DILocation(line: 578, column: 307, scope: !432)
!447 = !DILocation(line: 578, column: 326, scope: !432)
!448 = !DILocation(line: 579, column: 124, scope: !432)
!449 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !450)
!450 = distinct !DILocation(line: 579, column: 111, scope: !432)
!451 = !DILocation(line: 579, column: 169, scope: !432)
!452 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !453)
!453 = distinct !DILocation(line: 579, column: 156, scope: !432)
!454 = !DILocation(line: 254, column: 7, scope: !231, inlinedAt: !455)
!455 = distinct !DILocation(line: 579, column: 205, scope: !432)
!456 = !DILocation(line: 254, column: 5, scope: !231, inlinedAt: !455)
!457 = !DILocation(line: 579, column: 34, scope: !432)
!458 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !459)
!459 = distinct !DILocation(line: 579, column: 21, scope: !432)
!460 = !DILocation(line: 579, column: 79, scope: !432)
!461 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !462)
!462 = distinct !DILocation(line: 579, column: 66, scope: !432)
!463 = !DILocation(line: 256, column: 16, scope: !231, inlinedAt: !455)
!464 = !DILocation(line: 266, column: 17, scope: !231, inlinedAt: !455)
!465 = !DILocation(line: 0, scope: !231, inlinedAt: !455)
!466 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !467)
!467 = distinct !DILocation(line: 579, column: 251, scope: !432)
!468 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !467)
!469 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !467)
!470 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !467)
!471 = !DILocation(line: 267, column: 18, scope: !231, inlinedAt: !455)
!472 = !DILocation(line: 269, column: 13, scope: !231, inlinedAt: !455)
!473 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !467)
!474 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !467)
!475 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !467)
!476 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !467)
!477 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !467)
!478 = !DILocation(line: 579, column: 251, scope: !432)
!479 = !DILocation(line: 579, column: 284, scope: !432)
!480 = !DILocation(line: 579, column: 299, scope: !432)
!481 = !DILocation(line: 579, column: 311, scope: !432)
!482 = !DILocation(line: 580, column: 124, scope: !432)
!483 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !484)
!484 = distinct !DILocation(line: 580, column: 111, scope: !432)
!485 = !DILocation(line: 580, column: 169, scope: !432)
!486 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !487)
!487 = distinct !DILocation(line: 580, column: 156, scope: !432)
!488 = !DILocation(line: 281, column: 7, scope: !240, inlinedAt: !489)
!489 = distinct !DILocation(line: 580, column: 205, scope: !432)
!490 = !DILocation(line: 281, column: 5, scope: !240, inlinedAt: !489)
!491 = !DILocation(line: 580, column: 34, scope: !432)
!492 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !493)
!493 = distinct !DILocation(line: 580, column: 21, scope: !432)
!494 = !DILocation(line: 580, column: 79, scope: !432)
!495 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !496)
!496 = distinct !DILocation(line: 580, column: 66, scope: !432)
!497 = !DILocation(line: 283, column: 16, scope: !240, inlinedAt: !489)
!498 = !DILocation(line: 293, column: 16, scope: !240, inlinedAt: !489)
!499 = !DILocation(line: 0, scope: !240, inlinedAt: !489)
!500 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !501)
!501 = distinct !DILocation(line: 580, column: 253, scope: !432)
!502 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !501)
!503 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !501)
!504 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !501)
!505 = !DILocation(line: 294, column: 17, scope: !240, inlinedAt: !489)
!506 = !DILocation(line: 296, column: 12, scope: !240, inlinedAt: !489)
!507 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !501)
!508 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !501)
!509 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !501)
!510 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !501)
!511 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !501)
!512 = !DILocation(line: 580, column: 253, scope: !432)
!513 = !DILocation(line: 580, column: 286, scope: !432)
!514 = !DILocation(line: 580, column: 301, scope: !432)
!515 = !DILocation(line: 580, column: 313, scope: !432)
!516 = !DILocation(line: 581, column: 34, scope: !432)
!517 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !518)
!518 = distinct !DILocation(line: 581, column: 21, scope: !432)
!519 = !DILocation(line: 581, column: 79, scope: !432)
!520 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !521)
!521 = distinct !DILocation(line: 581, column: 66, scope: !432)
!522 = !DILocation(line: 581, column: 124, scope: !432)
!523 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !524)
!524 = distinct !DILocation(line: 581, column: 111, scope: !432)
!525 = !DILocation(line: 581, column: 169, scope: !432)
!526 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !527)
!527 = distinct !DILocation(line: 581, column: 156, scope: !432)
!528 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !529)
!529 = distinct !DILocation(line: 581, column: 252, scope: !432)
!530 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !529)
!531 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !529)
!532 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !529)
!533 = !DILocation(line: 315, column: 9, scope: !249, inlinedAt: !534)
!534 = distinct !DILocation(line: 581, column: 205, scope: !432)
!535 = !DILocation(line: 315, column: 5, scope: !249, inlinedAt: !534)
!536 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !529)
!537 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !529)
!538 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !529)
!539 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !529)
!540 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !529)
!541 = !DILocation(line: 581, column: 252, scope: !432)
!542 = !DILocation(line: 581, column: 285, scope: !432)
!543 = !DILocation(line: 581, column: 300, scope: !432)
!544 = !DILocation(line: 581, column: 312, scope: !432)
!545 = !DILocation(line: 582, column: 34, scope: !432)
!546 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !547)
!547 = distinct !DILocation(line: 582, column: 21, scope: !432)
!548 = !DILocation(line: 582, column: 79, scope: !432)
!549 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !550)
!550 = distinct !DILocation(line: 582, column: 66, scope: !432)
!551 = !DILocation(line: 582, column: 124, scope: !432)
!552 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !553)
!553 = distinct !DILocation(line: 582, column: 111, scope: !432)
!554 = !DILocation(line: 582, column: 169, scope: !432)
!555 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !556)
!556 = distinct !DILocation(line: 582, column: 156, scope: !432)
!557 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !558)
!558 = distinct !DILocation(line: 582, column: 254, scope: !432)
!559 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !558)
!560 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !558)
!561 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !558)
!562 = !DILocation(line: 334, column: 9, scope: !253, inlinedAt: !563)
!563 = distinct !DILocation(line: 582, column: 205, scope: !432)
!564 = !DILocation(line: 334, column: 5, scope: !253, inlinedAt: !563)
!565 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !558)
!566 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !558)
!567 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !558)
!568 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !558)
!569 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !558)
!570 = !DILocation(line: 582, column: 254, scope: !432)
!571 = !DILocation(line: 582, column: 287, scope: !432)
!572 = !DILocation(line: 582, column: 302, scope: !432)
!573 = !DILocation(line: 582, column: 314, scope: !432)
!574 = !DILocation(line: 583, column: 34, scope: !432)
!575 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !576)
!576 = distinct !DILocation(line: 583, column: 21, scope: !432)
!577 = !DILocation(line: 583, column: 79, scope: !432)
!578 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !579)
!579 = distinct !DILocation(line: 583, column: 66, scope: !432)
!580 = !DILocation(line: 583, column: 169, scope: !432)
!581 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !582)
!582 = distinct !DILocation(line: 583, column: 156, scope: !432)
!583 = !DILocation(line: 362, column: 9, scope: !257, inlinedAt: !584)
!584 = distinct !DILocation(line: 583, column: 205, scope: !432)
!585 = !DILocation(line: 0, scope: !257, inlinedAt: !584)
!586 = !DILocation(line: 362, column: 5, scope: !257, inlinedAt: !584)
!587 = !DILocation(line: 368, column: 5, scope: !257, inlinedAt: !584)
!588 = !DILocation(line: 370, column: 16, scope: !257, inlinedAt: !584)
!589 = !DILocation(line: 373, column: 8, scope: !257, inlinedAt: !584)
!590 = !DILocation(line: 374, column: 1, scope: !257, inlinedAt: !584)
!591 = !DILocation(line: 380, column: 5, scope: !257, inlinedAt: !584)
!592 = !DILocation(line: 382, column: 18, scope: !257, inlinedAt: !584)
!593 = !DILocation(line: 385, column: 9, scope: !257, inlinedAt: !584)
!594 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !595)
!595 = distinct !DILocation(line: 583, column: 251, scope: !432)
!596 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !595)
!597 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !595)
!598 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !595)
!599 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !595)
!600 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !595)
!601 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !595)
!602 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !595)
!603 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !595)
!604 = !DILocation(line: 583, column: 251, scope: !432)
!605 = !DILocation(line: 583, column: 284, scope: !432)
!606 = !DILocation(line: 583, column: 299, scope: !432)
!607 = !DILocation(line: 583, column: 311, scope: !432)
!608 = !DILocation(line: 584, column: 34, scope: !432)
!609 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !610)
!610 = distinct !DILocation(line: 584, column: 21, scope: !432)
!611 = !DILocation(line: 584, column: 79, scope: !432)
!612 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !613)
!613 = distinct !DILocation(line: 584, column: 66, scope: !432)
!614 = !DILocation(line: 584, column: 169, scope: !432)
!615 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !616)
!616 = distinct !DILocation(line: 584, column: 156, scope: !432)
!617 = !DILocation(line: 397, column: 9, scope: !269, inlinedAt: !618)
!618 = distinct !DILocation(line: 584, column: 205, scope: !432)
!619 = !DILocation(line: 0, scope: !269, inlinedAt: !618)
!620 = !DILocation(line: 397, column: 5, scope: !269, inlinedAt: !618)
!621 = !DILocation(line: 403, column: 5, scope: !269, inlinedAt: !618)
!622 = !DILocation(line: 405, column: 16, scope: !269, inlinedAt: !618)
!623 = !DILocation(line: 408, column: 8, scope: !269, inlinedAt: !618)
!624 = !DILocation(line: 409, column: 1, scope: !269, inlinedAt: !618)
!625 = !DILocation(line: 415, column: 5, scope: !269, inlinedAt: !618)
!626 = !DILocation(line: 417, column: 16, scope: !269, inlinedAt: !618)
!627 = !DILocation(line: 420, column: 8, scope: !269, inlinedAt: !618)
!628 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !629)
!629 = distinct !DILocation(line: 584, column: 253, scope: !432)
!630 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !629)
!631 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !629)
!632 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !629)
!633 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !629)
!634 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !629)
!635 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !629)
!636 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !629)
!637 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !629)
!638 = !DILocation(line: 584, column: 253, scope: !432)
!639 = !DILocation(line: 584, column: 286, scope: !432)
!640 = !DILocation(line: 584, column: 301, scope: !432)
!641 = !DILocation(line: 584, column: 313, scope: !432)
!642 = !DILocation(line: 585, column: 9, scope: !432)
!643 = !DILocation(line: 585, column: 21, scope: !432)
!644 = distinct !DISubprogram(name: "ink_compute_scalar32", scope: !14, file: !14, line: 586, type: !15, scopeLine: 586, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!645 = !DILocation(line: 586, column: 122, scope: !644)
!646 = !DILocation(line: 587, column: 124, scope: !644)
!647 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !648)
!648 = distinct !DILocation(line: 587, column: 111, scope: !644)
!649 = !DILocation(line: 587, column: 169, scope: !644)
!650 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !651)
!651 = distinct !DILocation(line: 587, column: 156, scope: !644)
!652 = !DILocation(line: 254, column: 7, scope: !231, inlinedAt: !653)
!653 = distinct !DILocation(line: 587, column: 205, scope: !644)
!654 = !DILocation(line: 254, column: 5, scope: !231, inlinedAt: !653)
!655 = !DILocation(line: 587, column: 34, scope: !644)
!656 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !657)
!657 = distinct !DILocation(line: 587, column: 21, scope: !644)
!658 = !DILocation(line: 587, column: 79, scope: !644)
!659 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !660)
!660 = distinct !DILocation(line: 587, column: 66, scope: !644)
!661 = !DILocation(line: 256, column: 16, scope: !231, inlinedAt: !653)
!662 = !DILocation(line: 266, column: 17, scope: !231, inlinedAt: !653)
!663 = !DILocation(line: 0, scope: !231, inlinedAt: !653)
!664 = !DILocation(line: 267, column: 18, scope: !231, inlinedAt: !653)
!665 = !DILocation(line: 269, column: 13, scope: !231, inlinedAt: !653)
!666 = !DILocation(line: 588, column: 124, scope: !644)
!667 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !668)
!668 = distinct !DILocation(line: 588, column: 111, scope: !644)
!669 = !DILocation(line: 588, column: 169, scope: !644)
!670 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !671)
!671 = distinct !DILocation(line: 588, column: 156, scope: !644)
!672 = !DILocation(line: 281, column: 7, scope: !240, inlinedAt: !673)
!673 = distinct !DILocation(line: 588, column: 205, scope: !644)
!674 = !DILocation(line: 281, column: 5, scope: !240, inlinedAt: !673)
!675 = !DILocation(line: 588, column: 34, scope: !644)
!676 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !677)
!677 = distinct !DILocation(line: 588, column: 21, scope: !644)
!678 = !DILocation(line: 588, column: 79, scope: !644)
!679 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !680)
!680 = distinct !DILocation(line: 588, column: 66, scope: !644)
!681 = !DILocation(line: 283, column: 16, scope: !240, inlinedAt: !673)
!682 = !DILocation(line: 293, column: 16, scope: !240, inlinedAt: !673)
!683 = !DILocation(line: 0, scope: !240, inlinedAt: !673)
!684 = !DILocation(line: 294, column: 17, scope: !240, inlinedAt: !673)
!685 = !DILocation(line: 296, column: 12, scope: !240, inlinedAt: !673)
!686 = !DILocation(line: 589, column: 34, scope: !644)
!687 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !688)
!688 = distinct !DILocation(line: 589, column: 21, scope: !644)
!689 = !DILocation(line: 589, column: 79, scope: !644)
!690 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !691)
!691 = distinct !DILocation(line: 589, column: 66, scope: !644)
!692 = !DILocation(line: 589, column: 124, scope: !644)
!693 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !694)
!694 = distinct !DILocation(line: 589, column: 111, scope: !644)
!695 = !DILocation(line: 589, column: 169, scope: !644)
!696 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !697)
!697 = distinct !DILocation(line: 589, column: 156, scope: !644)
!698 = !DILocation(line: 315, column: 9, scope: !249, inlinedAt: !699)
!699 = distinct !DILocation(line: 589, column: 205, scope: !644)
!700 = !DILocation(line: 315, column: 5, scope: !249, inlinedAt: !699)
!701 = !DILocation(line: 590, column: 34, scope: !644)
!702 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !703)
!703 = distinct !DILocation(line: 590, column: 21, scope: !644)
!704 = !DILocation(line: 590, column: 79, scope: !644)
!705 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !706)
!706 = distinct !DILocation(line: 590, column: 66, scope: !644)
!707 = !DILocation(line: 590, column: 124, scope: !644)
!708 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !709)
!709 = distinct !DILocation(line: 590, column: 111, scope: !644)
!710 = !DILocation(line: 590, column: 169, scope: !644)
!711 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !712)
!712 = distinct !DILocation(line: 590, column: 156, scope: !644)
!713 = !DILocation(line: 334, column: 9, scope: !253, inlinedAt: !714)
!714 = distinct !DILocation(line: 590, column: 205, scope: !644)
!715 = !DILocation(line: 334, column: 5, scope: !253, inlinedAt: !714)
!716 = !DILocation(line: 591, column: 34, scope: !644)
!717 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !718)
!718 = distinct !DILocation(line: 591, column: 21, scope: !644)
!719 = !DILocation(line: 591, column: 79, scope: !644)
!720 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !721)
!721 = distinct !DILocation(line: 591, column: 66, scope: !644)
!722 = !DILocation(line: 591, column: 169, scope: !644)
!723 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !724)
!724 = distinct !DILocation(line: 591, column: 156, scope: !644)
!725 = !DILocation(line: 362, column: 9, scope: !257, inlinedAt: !726)
!726 = distinct !DILocation(line: 591, column: 205, scope: !644)
!727 = !DILocation(line: 0, scope: !257, inlinedAt: !726)
!728 = !DILocation(line: 362, column: 5, scope: !257, inlinedAt: !726)
!729 = !DILocation(line: 368, column: 5, scope: !257, inlinedAt: !726)
!730 = !DILocation(line: 370, column: 16, scope: !257, inlinedAt: !726)
!731 = !DILocation(line: 373, column: 8, scope: !257, inlinedAt: !726)
!732 = !DILocation(line: 374, column: 1, scope: !257, inlinedAt: !726)
!733 = !DILocation(line: 380, column: 5, scope: !257, inlinedAt: !726)
!734 = !DILocation(line: 382, column: 18, scope: !257, inlinedAt: !726)
!735 = !DILocation(line: 385, column: 9, scope: !257, inlinedAt: !726)
!736 = !DILocation(line: 592, column: 34, scope: !644)
!737 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !738)
!738 = distinct !DILocation(line: 592, column: 21, scope: !644)
!739 = !DILocation(line: 592, column: 79, scope: !644)
!740 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !741)
!741 = distinct !DILocation(line: 592, column: 66, scope: !644)
!742 = !DILocation(line: 592, column: 169, scope: !644)
!743 = !DILocation(line: 37, column: 171, scope: !165, inlinedAt: !744)
!744 = distinct !DILocation(line: 592, column: 156, scope: !644)
!745 = !DILocation(line: 397, column: 9, scope: !269, inlinedAt: !746)
!746 = distinct !DILocation(line: 592, column: 205, scope: !644)
!747 = !DILocation(line: 0, scope: !269, inlinedAt: !746)
!748 = !DILocation(line: 397, column: 5, scope: !269, inlinedAt: !746)
!749 = !DILocation(line: 403, column: 5, scope: !269, inlinedAt: !746)
!750 = !DILocation(line: 405, column: 16, scope: !269, inlinedAt: !746)
!751 = !DILocation(line: 408, column: 8, scope: !269, inlinedAt: !746)
!752 = !DILocation(line: 409, column: 1, scope: !269, inlinedAt: !746)
!753 = !DILocation(line: 415, column: 5, scope: !269, inlinedAt: !746)
!754 = !DILocation(line: 417, column: 16, scope: !269, inlinedAt: !746)
!755 = !DILocation(line: 420, column: 8, scope: !269, inlinedAt: !746)
!756 = !DILocation(line: 593, column: 9, scope: !644)
!757 = !DILocation(line: 0, scope: !644)
!758 = !DILocation(line: 593, column: 30, scope: !644)
!759 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !14, file: !14, line: 594, type: !15, scopeLine: 594, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!760 = !DILocation(line: 595, column: 9, scope: !759)
