; ModuleID = '/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_u32/prior/cpu.c'
source_filename = "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_u32/prior/cpu.c"
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
define [2 x i64] @lang_fn_pipeline38_left_padded_zip_u32([2 x i64] %0, [2 x i64] %1, i32 %2, i32 %3) local_unnamed_addr #0 !dbg !74 {
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
  %29 = bitcast %struct.ink_block* %28 to i8*, !dbg !94
  %30 = bitcast %struct.ink_block* %28 to i32*, !dbg !95
  %31 = sub i32 0, %2
  br i1 %14, label %69, label %32, !dbg !96

32:                                               ; preds = %25
  %33 = icmp ult i64 %8, 4, !dbg !96
  br i1 %33, label %67, label %34, !dbg !96

34:                                               ; preds = %32
  %35 = getelementptr i8, i8* %21, i64 16, !dbg !96
  %36 = add i64 %15, 16, !dbg !96
  %37 = getelementptr i8, i8* %21, i64 %36, !dbg !96
  %38 = getelementptr i32, i32* %6, i64 %8, !dbg !96
  %39 = bitcast i32* %38 to i8*, !dbg !96
  %40 = icmp ult i8* %35, %39, !dbg !96
  %41 = icmp ugt i8* %37, %7, !dbg !96
  %42 = and i1 %40, %41, !dbg !96
  br i1 %42, label %67, label %43, !dbg !96

43:                                               ; preds = %34
  %44 = and i64 %8, -4, !dbg !96
  %45 = insertelement <4 x i32> poison, i32 %2, i32 0, !dbg !96
  %46 = shufflevector <4 x i32> %45, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !96
  %47 = insertelement <4 x i32> poison, i32 %3, i32 0, !dbg !96
  %48 = shufflevector <4 x i32> %47, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !96
  %49 = insertelement <4 x i32> poison, i32 %31, i32 0, !dbg !96
  %50 = shufflevector <4 x i32> %49, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !96
  br label %51, !dbg !96

51:                                               ; preds = %51, %43
  %52 = phi i64 [ 0, %43 ], [ %62, %51 ], !dbg !97
  %53 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %43 ], [ %63, %51 ], !dbg !98
  %54 = getelementptr inbounds i32, i32* %6, i64 %52, !dbg !97
  %55 = bitcast i32* %54 to <4 x i32>*, !dbg !99
  %56 = load <4 x i32>, <4 x i32>* %55, align 4, !dbg !99, !tbaa !100, !alias.scope !102
  %57 = icmp ult <4 x i32> %53, %46, !dbg !105
  %58 = select <4 x i1> %57, <4 x i32> %48, <4 x i32> %50, !dbg !106
  %59 = add <4 x i32> %56, %58, !dbg !106
  %60 = getelementptr inbounds i32, i32* %30, i64 %52, !dbg !97
  %61 = bitcast i32* %60 to <4 x i32>*, !dbg !107
  store <4 x i32> %59, <4 x i32>* %61, align 4, !dbg !107, !tbaa !100, !alias.scope !108, !noalias !102
  %62 = add nuw i64 %52, 4, !dbg !97
  %63 = add <4 x i32> %53, <i32 4, i32 4, i32 4, i32 4>, !dbg !98
  %64 = icmp eq i64 %62, %44, !dbg !97
  br i1 %64, label %65, label %51, !dbg !97, !llvm.loop !110

65:                                               ; preds = %51
  %66 = icmp eq i64 %8, %44, !dbg !96
  br i1 %66, label %69, label %67, !dbg !96

67:                                               ; preds = %34, %32, %65
  %68 = phi i64 [ 0, %34 ], [ 0, %32 ], [ %44, %65 ]
  br label %72, !dbg !96

69:                                               ; preds = %72, %65, %25
  %70 = xor i64 %10, -1, !dbg !113
  %71 = icmp ugt i64 %8, %70, !dbg !114
  br i1 %71, label %83, label %84, !dbg !115

72:                                               ; preds = %67, %72
  %73 = phi i64 [ %81, %72 ], [ %68, %67 ]
  %74 = trunc i64 %73 to i32, !dbg !98
  %75 = getelementptr inbounds i32, i32* %6, i64 %73, !dbg !99
  %76 = load i32, i32* %75, align 4, !dbg !99, !tbaa !100
  %77 = icmp ult i32 %74, %2, !dbg !105
  %78 = select i1 %77, i32 %3, i32 %31, !dbg !106
  %79 = add i32 %76, %78, !dbg !106
  %80 = getelementptr inbounds i32, i32* %30, i64 %73, !dbg !116
  store i32 %79, i32* %80, align 4, !dbg !107, !tbaa !100
  %81 = add nuw i64 %73, 1, !dbg !97
  %82 = icmp eq i64 %81, %8, !dbg !117
  br i1 %82, label %69, label %72, !dbg !96, !llvm.loop !118

83:                                               ; preds = %69
  tail call fastcc void @ink_fail(), !dbg !119
  unreachable

84:                                               ; preds = %69
  %85 = add i64 %10, %8, !dbg !120
  %86 = icmp ugt i64 %85, 4611686018427387903, !dbg !121
  br i1 %86, label %87, label %88, !dbg !123

87:                                               ; preds = %84
  tail call fastcc void @ink_fail() #11, !dbg !124
  unreachable

88:                                               ; preds = %84
  %89 = icmp eq i64 %85, 0, !dbg !125
  %90 = shl nuw i64 %85, 2, !dbg !126
  %91 = select i1 %89, i64 4, i64 %90, !dbg !126
  %92 = icmp ugt i64 %91, -17, !dbg !127
  br i1 %92, label %93, label %94, !dbg !128

93:                                               ; preds = %88
  tail call fastcc void @ink_fail() #11, !dbg !129
  unreachable

94:                                               ; preds = %88
  %95 = add nuw i64 %91, 16, !dbg !130
  %96 = tail call i8* @malloc(i64 %95) #12, !dbg !131
  %97 = icmp eq i8* %96, null, !dbg !132
  br i1 %97, label %98, label %99, !dbg !133

98:                                               ; preds = %94
  tail call fastcc void @ink_fail() #11, !dbg !134
  unreachable

99:                                               ; preds = %94
  %100 = bitcast i8* %96 to %struct.ink_block*, !dbg !131
  %101 = bitcast i8* %96 to i8**, !dbg !135
  store i8* %21, i8** %101, align 8, !dbg !135, !tbaa !24
  store i8* %96, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !136, !tbaa !18
  %102 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %100, i64 1, !dbg !137
  %103 = bitcast %struct.ink_block* %102 to i32*, !dbg !138
  br i1 %14, label %106, label %104, !dbg !139

104:                                              ; preds = %99
  %105 = bitcast %struct.ink_block* %102 to i8*, !dbg !142
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* nonnull align 1 %105, i8* nonnull align 1 %29, i64 %15, i1 false), !dbg !143
  br label %106, !dbg !144

106:                                              ; preds = %104, %99
  %107 = getelementptr inbounds i32, i32* %103, i64 %8, !dbg !144
  %108 = bitcast i32* %107 to i8*, !dbg !145
  %109 = inttoptr i64 %9 to i8*, !dbg !146
  %110 = shl i64 %10, 2, !dbg !147
  %111 = icmp eq i64 %110, 0, !dbg !148
  br i1 %111, label %167, label %112, !dbg !150

112:                                              ; preds = %106
  %113 = icmp ult i64 %110, 8, !dbg !150
  br i1 %113, label %158, label %114, !dbg !150

114:                                              ; preds = %112
  %115 = add i64 %90, 16, !dbg !150
  %116 = getelementptr i8, i8* %96, i64 %115, !dbg !150
  %117 = getelementptr i8, i8* %109, i64 %110, !dbg !150
  %118 = icmp ugt i8* %117, %108, !dbg !150
  %119 = icmp ugt i8* %116, %109, !dbg !150
  %120 = and i1 %118, %119, !dbg !150
  br i1 %120, label %158, label %121, !dbg !150

121:                                              ; preds = %114
  %122 = icmp ult i64 %110, 32, !dbg !150
  br i1 %122, label %144, label %123, !dbg !150

123:                                              ; preds = %121
  %124 = and i64 %110, -32, !dbg !150
  br label %125, !dbg !150

125:                                              ; preds = %125, %123
  %126 = phi i64 [ 0, %123 ], [ %137, %125 ], !dbg !151
  %127 = getelementptr inbounds i8, i8* %109, i64 %126, !dbg !151
  %128 = bitcast i8* %127 to <16 x i8>*, !dbg !152
  %129 = load <16 x i8>, <16 x i8>* %128, align 1, !dbg !152, !tbaa !153, !alias.scope !154
  %130 = getelementptr inbounds i8, i8* %127, i64 16, !dbg !152
  %131 = bitcast i8* %130 to <16 x i8>*, !dbg !152
  %132 = load <16 x i8>, <16 x i8>* %131, align 1, !dbg !152, !tbaa !153, !alias.scope !154
  %133 = getelementptr inbounds i8, i8* %108, i64 %126, !dbg !151
  %134 = bitcast i8* %133 to <16 x i8>*, !dbg !157
  store <16 x i8> %129, <16 x i8>* %134, align 1, !dbg !157, !tbaa !153, !alias.scope !158, !noalias !154
  %135 = getelementptr inbounds i8, i8* %133, i64 16, !dbg !157
  %136 = bitcast i8* %135 to <16 x i8>*, !dbg !157
  store <16 x i8> %132, <16 x i8>* %136, align 1, !dbg !157, !tbaa !153, !alias.scope !158, !noalias !154
  %137 = add nuw i64 %126, 32, !dbg !151
  %138 = icmp eq i64 %137, %124, !dbg !151
  br i1 %138, label %139, label %125, !dbg !151, !llvm.loop !160

139:                                              ; preds = %125
  %140 = icmp eq i64 %110, %124, !dbg !150
  br i1 %140, label %167, label %141, !dbg !150

141:                                              ; preds = %139
  %142 = and i64 %10, 6, !dbg !150
  %143 = icmp eq i64 %142, 0, !dbg !150
  br i1 %143, label %158, label %144, !dbg !150

144:                                              ; preds = %121, %141
  %145 = phi i64 [ %124, %141 ], [ 0, %121 ]
  %146 = and i64 %110, -8, !dbg !150
  br label %147, !dbg !150

147:                                              ; preds = %147, %144
  %148 = phi i64 [ %145, %144 ], [ %154, %147 ], !dbg !151
  %149 = getelementptr inbounds i8, i8* %109, i64 %148, !dbg !151
  %150 = bitcast i8* %149 to <8 x i8>*, !dbg !152
  %151 = load <8 x i8>, <8 x i8>* %150, align 1, !dbg !152, !tbaa !153
  %152 = getelementptr inbounds i8, i8* %108, i64 %148, !dbg !151
  %153 = bitcast i8* %152 to <8 x i8>*, !dbg !157
  store <8 x i8> %151, <8 x i8>* %153, align 1, !dbg !157, !tbaa !153
  %154 = add nuw i64 %148, 8, !dbg !151
  %155 = icmp eq i64 %154, %146, !dbg !151
  br i1 %155, label %156, label %147, !dbg !151, !llvm.loop !162

156:                                              ; preds = %147
  %157 = icmp eq i64 %110, %146, !dbg !150
  br i1 %157, label %167, label %158, !dbg !150

158:                                              ; preds = %114, %112, %141, %156
  %159 = phi i64 [ 0, %112 ], [ 0, %114 ], [ %124, %141 ], [ %146, %156 ]
  br label %160, !dbg !150

160:                                              ; preds = %158, %160
  %161 = phi i64 [ %165, %160 ], [ %159, %158 ]
  %162 = getelementptr inbounds i8, i8* %109, i64 %161, !dbg !152
  %163 = load i8, i8* %162, align 1, !dbg !152, !tbaa !153
  %164 = getelementptr inbounds i8, i8* %108, i64 %161, !dbg !163
  store i8 %163, i8* %164, align 1, !dbg !157, !tbaa !153
  %165 = add nuw i64 %161, 1, !dbg !151
  %166 = icmp eq i64 %165, %110, !dbg !148
  br i1 %166, label %167, label %160, !dbg !150, !llvm.loop !164

167:                                              ; preds = %160, %139, %156, %106
  %168 = tail call i8* @malloc(i64 %20) #12, !dbg !165
  %169 = icmp eq i8* %168, null, !dbg !167
  br i1 %169, label %170, label %171, !dbg !168

170:                                              ; preds = %167
  tail call fastcc void @ink_fail() #11, !dbg !169
  unreachable

171:                                              ; preds = %167
  %172 = bitcast i8* %168 to %struct.ink_block*, !dbg !165
  %173 = bitcast i8* %168 to i8**, !dbg !170
  store i8* %96, i8** %173, align 8, !dbg !170, !tbaa !24
  store i8* %168, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !171, !tbaa !18
  %174 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %172, i64 1, !dbg !172
  %175 = bitcast %struct.ink_block* %174 to i32*, !dbg !173
  br i1 %14, label %213, label %176, !dbg !174

176:                                              ; preds = %171
  %177 = icmp eq i64 %8, 1, !dbg !174
  br i1 %177, label %211, label %178, !dbg !174

178:                                              ; preds = %176
  %179 = getelementptr i8, i8* %168, i64 16, !dbg !174
  %180 = add i64 %15, 16, !dbg !174
  %181 = getelementptr i8, i8* %168, i64 %180, !dbg !174
  %182 = getelementptr i32, i32* %6, i64 %8, !dbg !174
  %183 = bitcast i32* %182 to i8*, !dbg !174
  %184 = icmp ult i8* %179, %183, !dbg !174
  %185 = icmp ugt i8* %181, %7, !dbg !174
  %186 = and i1 %184, %185, !dbg !174
  br i1 %186, label %211, label %187, !dbg !174

187:                                              ; preds = %178
  %188 = and i64 %8, -2, !dbg !174
  %189 = insertelement <2 x i32> poison, i32 %3, i32 0, !dbg !174
  %190 = shufflevector <2 x i32> %189, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !174
  %191 = insertelement <2 x i32> poison, i32 %2, i32 0, !dbg !174
  %192 = shufflevector <2 x i32> %191, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !174
  br label %193, !dbg !174

193:                                              ; preds = %193, %187
  %194 = phi i64 [ 0, %187 ], [ %206, %193 ], !dbg !175
  %195 = phi <2 x i32> [ <i32 0, i32 1>, %187 ], [ %207, %193 ], !dbg !176
  %196 = getelementptr inbounds i32, i32* %6, i64 %194, !dbg !175
  %197 = bitcast i32* %196 to <2 x i32>*, !dbg !177
  %198 = load <2 x i32>, <2 x i32>* %197, align 4, !dbg !177, !tbaa !100, !alias.scope !178
  %199 = urem <2 x i32> %195, <i32 3, i32 3>, !dbg !181
  %200 = icmp eq <2 x i32> %199, zeroinitializer, !dbg !182
  %201 = mul <2 x i32> %198, %190, !dbg !183
  %202 = add <2 x i32> %198, %192, !dbg !183
  %203 = select <2 x i1> %200, <2 x i32> %201, <2 x i32> %202, !dbg !183
  %204 = getelementptr inbounds i32, i32* %175, i64 %194, !dbg !175
  %205 = bitcast i32* %204 to <2 x i32>*, !dbg !184
  store <2 x i32> %203, <2 x i32>* %205, align 4, !dbg !184, !tbaa !100, !alias.scope !185, !noalias !178
  %206 = add nuw i64 %194, 2, !dbg !175
  %207 = add <2 x i32> %195, <i32 2, i32 2>, !dbg !176
  %208 = icmp eq i64 %206, %188, !dbg !175
  br i1 %208, label %209, label %193, !dbg !175, !llvm.loop !187

209:                                              ; preds = %193
  %210 = icmp eq i64 %8, %188, !dbg !174
  br i1 %210, label %213, label %211, !dbg !174

211:                                              ; preds = %178, %176, %209
  %212 = phi i64 [ 0, %178 ], [ 0, %176 ], [ %188, %209 ]
  br label %264, !dbg !174

213:                                              ; preds = %264, %209, %171
  %214 = icmp ult i64 %85, %8, !dbg !189
  %215 = select i1 %214, i64 %85, i64 %8, !dbg !190
  %216 = icmp ugt i64 %215, 4611686018427387903, !dbg !191
  br i1 %216, label %217, label %218, !dbg !193

217:                                              ; preds = %213
  tail call fastcc void @ink_fail() #11, !dbg !194
  unreachable

218:                                              ; preds = %213
  %219 = icmp eq i64 %215, 0, !dbg !195
  %220 = shl nuw i64 %215, 2, !dbg !196
  %221 = select i1 %219, i64 4, i64 %220, !dbg !196
  %222 = icmp ugt i64 %221, -17, !dbg !197
  br i1 %222, label %223, label %224, !dbg !198

223:                                              ; preds = %218
  tail call fastcc void @ink_fail() #11, !dbg !199
  unreachable

224:                                              ; preds = %218
  %225 = add nuw i64 %221, 16, !dbg !200
  %226 = tail call i8* @malloc(i64 %225) #12, !dbg !201
  %227 = icmp eq i8* %226, null, !dbg !202
  br i1 %227, label %228, label %229, !dbg !203

228:                                              ; preds = %224
  tail call fastcc void @ink_fail() #11, !dbg !204
  unreachable

229:                                              ; preds = %224
  %230 = bitcast i8* %226 to %struct.ink_block*, !dbg !201
  %231 = bitcast i8* %226 to i8**, !dbg !205
  store i8* %168, i8** %231, align 8, !dbg !205, !tbaa !24
  store i8* %226, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !206, !tbaa !18
  %232 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %230, i64 1, !dbg !207
  %233 = bitcast %struct.ink_block* %232 to i32*, !dbg !208
  br i1 %219, label %277, label %234, !dbg !209

234:                                              ; preds = %229
  %235 = icmp ult i64 %215, 4, !dbg !209
  br i1 %235, label %262, label %236, !dbg !209

236:                                              ; preds = %234
  %237 = and i64 %215, -4, !dbg !209
  %238 = insertelement <4 x i32> poison, i32 %3, i32 0, !dbg !209
  %239 = shufflevector <4 x i32> %238, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !209
  %240 = insertelement <4 x i32> poison, i32 %2, i32 0, !dbg !209
  %241 = shufflevector <4 x i32> %240, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !209
  br label %242, !dbg !209

242:                                              ; preds = %242, %236
  %243 = phi i64 [ 0, %236 ], [ %258, %242 ], !dbg !210
  %244 = getelementptr inbounds i32, i32* %103, i64 %243, !dbg !210
  %245 = bitcast i32* %244 to <4 x i32>*, !dbg !211
  %246 = load <4 x i32>, <4 x i32>* %245, align 4, !dbg !211, !tbaa !100
  %247 = getelementptr inbounds i32, i32* %175, i64 %243, !dbg !210
  %248 = bitcast i32* %247 to <4 x i32>*, !dbg !212
  %249 = load <4 x i32>, <4 x i32>* %248, align 4, !dbg !212, !tbaa !100
  %250 = icmp ult <4 x i32> %246, %249, !dbg !213
  %251 = mul <4 x i32> %249, %239, !dbg !214
  %252 = add <4 x i32> %251, %246, !dbg !214
  %253 = add <4 x i32> %246, %241, !dbg !214
  %254 = sub <4 x i32> %253, %249, !dbg !214
  %255 = select <4 x i1> %250, <4 x i32> %252, <4 x i32> %254, !dbg !214
  %256 = getelementptr inbounds i32, i32* %233, i64 %243, !dbg !210
  %257 = bitcast i32* %256 to <4 x i32>*, !dbg !215
  store <4 x i32> %255, <4 x i32>* %257, align 4, !dbg !215, !tbaa !100
  %258 = add nuw i64 %243, 4, !dbg !210
  %259 = icmp eq i64 %258, %237, !dbg !210
  br i1 %259, label %260, label %242, !dbg !210, !llvm.loop !216

260:                                              ; preds = %242
  %261 = icmp eq i64 %215, %237, !dbg !209
  br i1 %261, label %277, label %262, !dbg !209

262:                                              ; preds = %234, %260
  %263 = phi i64 [ 0, %234 ], [ %237, %260 ]
  br label %281, !dbg !209

264:                                              ; preds = %211, %264
  %265 = phi i64 [ %275, %264 ], [ %212, %211 ]
  %266 = getelementptr inbounds i32, i32* %6, i64 %265, !dbg !177
  %267 = load i32, i32* %266, align 4, !dbg !177, !tbaa !100
  %268 = trunc i64 %265 to i32, !dbg !176
  %269 = urem i32 %268, 3, !dbg !181
  %270 = icmp eq i32 %269, 0, !dbg !182
  %271 = mul i32 %267, %3, !dbg !183
  %272 = add i32 %267, %2, !dbg !183
  %273 = select i1 %270, i32 %271, i32 %272, !dbg !183
  %274 = getelementptr inbounds i32, i32* %175, i64 %265, !dbg !218
  store i32 %273, i32* %274, align 4, !dbg !184, !tbaa !100
  %275 = add nuw i64 %265, 1, !dbg !175
  %276 = icmp eq i64 %275, %8, !dbg !219
  br i1 %276, label %213, label %264, !dbg !174, !llvm.loop !220

277:                                              ; preds = %281, %260, %229
  %278 = ptrtoint %struct.ink_block* %232 to i64, !dbg !221
  %279 = insertvalue [2 x i64] undef, i64 %278, 0, !dbg !221
  %280 = insertvalue [2 x i64] %279, i64 %215, 1, !dbg !221
  ret [2 x i64] %280, !dbg !221

281:                                              ; preds = %262, %281
  %282 = phi i64 [ %294, %281 ], [ %263, %262 ]
  %283 = getelementptr inbounds i32, i32* %103, i64 %282, !dbg !211
  %284 = load i32, i32* %283, align 4, !dbg !211, !tbaa !100
  %285 = getelementptr inbounds i32, i32* %175, i64 %282, !dbg !212
  %286 = load i32, i32* %285, align 4, !dbg !212, !tbaa !100
  %287 = icmp ult i32 %284, %286, !dbg !213
  %288 = mul i32 %286, %3, !dbg !214
  %289 = add i32 %288, %284, !dbg !214
  %290 = add i32 %284, %2, !dbg !214
  %291 = sub i32 %290, %286, !dbg !214
  %292 = select i1 %287, i32 %289, i32 %291, !dbg !214
  %293 = getelementptr inbounds i32, i32* %233, i64 %282, !dbg !222
  store i32 %292, i32* %293, align 4, !dbg !215, !tbaa !100
  %294 = add nuw i64 %282, 1, !dbg !210
  %295 = icmp eq i64 %294, %215, !dbg !223
  br i1 %295, label %277, label %281, !dbg !209, !llvm.loop !224
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_left_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !226 {
  %5 = icmp ult i32 %0, %2, !dbg !227
  %6 = sub i32 0, %2, !dbg !228
  %7 = select i1 %5, i32 %3, i32 %6, !dbg !228
  %8 = add i32 %7, %1, !dbg !228
  ret i32 %8, !dbg !229
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_right_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !230 {
  %5 = urem i32 %0, 3, !dbg !231
  %6 = icmp eq i32 %5, 0, !dbg !232
  %7 = mul i32 %3, %1, !dbg !233
  %8 = add i32 %2, %1, !dbg !233
  %9 = select i1 %6, i32 %7, i32 %8, !dbg !233
  ret i32 %9, !dbg !234
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind readnone ssp uwtable willreturn
define i32 @lang_fn_pair_word(i32 %0, i32 %1, i32 %2, i32 %3) local_unnamed_addr #5 !dbg !235 {
  %5 = icmp ult i32 %0, %1, !dbg !236
  %6 = mul i32 %3, %1, !dbg !237
  %7 = add i32 %6, %0, !dbg !237
  %8 = sub i32 %0, %1, !dbg !237
  %9 = add i32 %8, %2, !dbg !237
  %10 = select i1 %5, i32 %7, i32 %9, !dbg !237
  ret i32 %10, !dbg !238
}

; Function Attrs: nounwind ssp uwtable
define i64 @lang_fn_pipeline38_left_padded_zip_u32_into([2 x i64] %0, [2 x i64] %1, i32 %2, i32 %3, i32* nocapture %4) local_unnamed_addr #0 !dbg !239 {
  %6 = extractvalue [2 x i64] %0, 0
  %7 = inttoptr i64 %6 to i32*
  %8 = inttoptr i64 %6 to i8*
  %9 = extractvalue [2 x i64] %0, 1
  %10 = extractvalue [2 x i64] %1, 0
  %11 = extractvalue [2 x i64] %1, 1
  %12 = icmp ugt i64 %9, 4611686018427387903, !dbg !240
  br i1 %12, label %13, label %14, !dbg !242

13:                                               ; preds = %5
  tail call fastcc void @ink_fail() #11, !dbg !243
  unreachable

14:                                               ; preds = %5
  %15 = icmp eq i64 %9, 0, !dbg !244
  %16 = shl nuw i64 %9, 2, !dbg !245
  %17 = select i1 %15, i64 4, i64 %16, !dbg !245
  %18 = icmp ugt i64 %17, -17, !dbg !246
  br i1 %18, label %19, label %20, !dbg !247

19:                                               ; preds = %14
  tail call fastcc void @ink_fail() #11, !dbg !248
  unreachable

20:                                               ; preds = %14
  %21 = add nuw i64 %17, 16, !dbg !249
  %22 = tail call i8* @malloc(i64 %21) #12, !dbg !250
  %23 = bitcast i8* %22 to %struct.ink_block*, !dbg !250
  %24 = icmp eq i8* %22, null, !dbg !251
  br i1 %24, label %25, label %26, !dbg !252

25:                                               ; preds = %20
  tail call fastcc void @ink_fail() #11, !dbg !253
  unreachable

26:                                               ; preds = %20
  %27 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !254, !tbaa !18
  %28 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %23, i64 0, i32 0, !dbg !255
  store %struct.ink_block* %27, %struct.ink_block** %28, align 8, !dbg !256, !tbaa !24
  store i8* %22, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !257, !tbaa !18
  %29 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %23, i64 1, !dbg !258
  %30 = bitcast %struct.ink_block* %29 to i8*, !dbg !259
  %31 = bitcast %struct.ink_block* %29 to i32*, !dbg !260
  %32 = sub i32 0, %2
  br i1 %15, label %70, label %33, !dbg !261

33:                                               ; preds = %26
  %34 = icmp ult i64 %9, 4, !dbg !261
  br i1 %34, label %68, label %35, !dbg !261

35:                                               ; preds = %33
  %36 = getelementptr i8, i8* %22, i64 16, !dbg !261
  %37 = add i64 %16, 16, !dbg !261
  %38 = getelementptr i8, i8* %22, i64 %37, !dbg !261
  %39 = getelementptr i32, i32* %7, i64 %9, !dbg !261
  %40 = bitcast i32* %39 to i8*, !dbg !261
  %41 = icmp ult i8* %36, %40, !dbg !261
  %42 = icmp ugt i8* %38, %8, !dbg !261
  %43 = and i1 %41, %42, !dbg !261
  br i1 %43, label %68, label %44, !dbg !261

44:                                               ; preds = %35
  %45 = and i64 %9, -4, !dbg !261
  %46 = insertelement <4 x i32> poison, i32 %2, i32 0, !dbg !261
  %47 = shufflevector <4 x i32> %46, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !261
  %48 = insertelement <4 x i32> poison, i32 %3, i32 0, !dbg !261
  %49 = shufflevector <4 x i32> %48, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !261
  %50 = insertelement <4 x i32> poison, i32 %32, i32 0, !dbg !261
  %51 = shufflevector <4 x i32> %50, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !261
  br label %52, !dbg !261

52:                                               ; preds = %52, %44
  %53 = phi i64 [ 0, %44 ], [ %63, %52 ], !dbg !262
  %54 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %44 ], [ %64, %52 ], !dbg !263
  %55 = getelementptr inbounds i32, i32* %7, i64 %53, !dbg !262
  %56 = bitcast i32* %55 to <4 x i32>*, !dbg !264
  %57 = load <4 x i32>, <4 x i32>* %56, align 4, !dbg !264, !tbaa !100, !alias.scope !265
  %58 = icmp ult <4 x i32> %54, %47, !dbg !268
  %59 = select <4 x i1> %58, <4 x i32> %49, <4 x i32> %51, !dbg !269
  %60 = add <4 x i32> %57, %59, !dbg !269
  %61 = getelementptr inbounds i32, i32* %31, i64 %53, !dbg !262
  %62 = bitcast i32* %61 to <4 x i32>*, !dbg !270
  store <4 x i32> %60, <4 x i32>* %62, align 4, !dbg !270, !tbaa !100, !alias.scope !271, !noalias !265
  %63 = add nuw i64 %53, 4, !dbg !262
  %64 = add <4 x i32> %54, <i32 4, i32 4, i32 4, i32 4>, !dbg !263
  %65 = icmp eq i64 %63, %45, !dbg !262
  br i1 %65, label %66, label %52, !dbg !262, !llvm.loop !273

66:                                               ; preds = %52
  %67 = icmp eq i64 %9, %45, !dbg !261
  br i1 %67, label %70, label %68, !dbg !261

68:                                               ; preds = %35, %33, %66
  %69 = phi i64 [ 0, %35 ], [ 0, %33 ], [ %45, %66 ]
  br label %73, !dbg !261

70:                                               ; preds = %73, %66, %26
  %71 = xor i64 %11, -1, !dbg !275
  %72 = icmp ugt i64 %9, %71, !dbg !276
  br i1 %72, label %84, label %85, !dbg !277

73:                                               ; preds = %68, %73
  %74 = phi i64 [ %82, %73 ], [ %69, %68 ]
  %75 = trunc i64 %74 to i32, !dbg !263
  %76 = getelementptr inbounds i32, i32* %7, i64 %74, !dbg !264
  %77 = load i32, i32* %76, align 4, !dbg !264, !tbaa !100
  %78 = icmp ult i32 %75, %2, !dbg !268
  %79 = select i1 %78, i32 %3, i32 %32, !dbg !269
  %80 = add i32 %77, %79, !dbg !269
  %81 = getelementptr inbounds i32, i32* %31, i64 %74, !dbg !278
  store i32 %80, i32* %81, align 4, !dbg !270, !tbaa !100
  %82 = add nuw i64 %74, 1, !dbg !262
  %83 = icmp eq i64 %82, %9, !dbg !279
  br i1 %83, label %70, label %73, !dbg !261, !llvm.loop !280

84:                                               ; preds = %70
  tail call fastcc void @ink_fail(), !dbg !281
  unreachable

85:                                               ; preds = %70
  %86 = add i64 %11, %9, !dbg !282
  %87 = icmp ugt i64 %86, 4611686018427387903, !dbg !283
  br i1 %87, label %88, label %89, !dbg !285

88:                                               ; preds = %85
  tail call fastcc void @ink_fail() #11, !dbg !286
  unreachable

89:                                               ; preds = %85
  %90 = icmp eq i64 %86, 0, !dbg !287
  %91 = shl nuw i64 %86, 2, !dbg !288
  %92 = select i1 %90, i64 4, i64 %91, !dbg !288
  %93 = icmp ugt i64 %92, -17, !dbg !289
  br i1 %93, label %94, label %95, !dbg !290

94:                                               ; preds = %89
  tail call fastcc void @ink_fail() #11, !dbg !291
  unreachable

95:                                               ; preds = %89
  %96 = add nuw i64 %92, 16, !dbg !292
  %97 = tail call i8* @malloc(i64 %96) #12, !dbg !293
  %98 = icmp eq i8* %97, null, !dbg !294
  br i1 %98, label %99, label %100, !dbg !295

99:                                               ; preds = %95
  tail call fastcc void @ink_fail() #11, !dbg !296
  unreachable

100:                                              ; preds = %95
  %101 = bitcast i8* %97 to %struct.ink_block*, !dbg !293
  %102 = bitcast i8* %97 to i8**, !dbg !297
  store i8* %22, i8** %102, align 8, !dbg !297, !tbaa !24
  store i8* %97, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !298, !tbaa !18
  %103 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %101, i64 1, !dbg !299
  %104 = bitcast %struct.ink_block* %103 to i32*, !dbg !300
  br i1 %15, label %107, label %105, !dbg !301

105:                                              ; preds = %100
  %106 = bitcast %struct.ink_block* %103 to i8*, !dbg !303
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* nonnull align 1 %106, i8* nonnull align 1 %30, i64 %16, i1 false), !dbg !304
  br label %107, !dbg !305

107:                                              ; preds = %105, %100
  %108 = getelementptr inbounds i32, i32* %104, i64 %9, !dbg !305
  %109 = bitcast i32* %108 to i8*, !dbg !306
  %110 = inttoptr i64 %10 to i8*, !dbg !307
  %111 = shl i64 %11, 2, !dbg !308
  %112 = icmp eq i64 %111, 0, !dbg !309
  br i1 %112, label %168, label %113, !dbg !311

113:                                              ; preds = %107
  %114 = icmp ult i64 %111, 8, !dbg !311
  br i1 %114, label %159, label %115, !dbg !311

115:                                              ; preds = %113
  %116 = add i64 %91, 16, !dbg !311
  %117 = getelementptr i8, i8* %97, i64 %116, !dbg !311
  %118 = getelementptr i8, i8* %110, i64 %111, !dbg !311
  %119 = icmp ugt i8* %118, %109, !dbg !311
  %120 = icmp ugt i8* %117, %110, !dbg !311
  %121 = and i1 %119, %120, !dbg !311
  br i1 %121, label %159, label %122, !dbg !311

122:                                              ; preds = %115
  %123 = icmp ult i64 %111, 32, !dbg !311
  br i1 %123, label %145, label %124, !dbg !311

124:                                              ; preds = %122
  %125 = and i64 %111, -32, !dbg !311
  br label %126, !dbg !311

126:                                              ; preds = %126, %124
  %127 = phi i64 [ 0, %124 ], [ %138, %126 ], !dbg !312
  %128 = getelementptr inbounds i8, i8* %110, i64 %127, !dbg !312
  %129 = bitcast i8* %128 to <16 x i8>*, !dbg !313
  %130 = load <16 x i8>, <16 x i8>* %129, align 1, !dbg !313, !tbaa !153, !alias.scope !314
  %131 = getelementptr inbounds i8, i8* %128, i64 16, !dbg !313
  %132 = bitcast i8* %131 to <16 x i8>*, !dbg !313
  %133 = load <16 x i8>, <16 x i8>* %132, align 1, !dbg !313, !tbaa !153, !alias.scope !314
  %134 = getelementptr inbounds i8, i8* %109, i64 %127, !dbg !312
  %135 = bitcast i8* %134 to <16 x i8>*, !dbg !317
  store <16 x i8> %130, <16 x i8>* %135, align 1, !dbg !317, !tbaa !153, !alias.scope !318, !noalias !314
  %136 = getelementptr inbounds i8, i8* %134, i64 16, !dbg !317
  %137 = bitcast i8* %136 to <16 x i8>*, !dbg !317
  store <16 x i8> %133, <16 x i8>* %137, align 1, !dbg !317, !tbaa !153, !alias.scope !318, !noalias !314
  %138 = add nuw i64 %127, 32, !dbg !312
  %139 = icmp eq i64 %138, %125, !dbg !312
  br i1 %139, label %140, label %126, !dbg !312, !llvm.loop !320

140:                                              ; preds = %126
  %141 = icmp eq i64 %111, %125, !dbg !311
  br i1 %141, label %168, label %142, !dbg !311

142:                                              ; preds = %140
  %143 = and i64 %11, 6, !dbg !311
  %144 = icmp eq i64 %143, 0, !dbg !311
  br i1 %144, label %159, label %145, !dbg !311

145:                                              ; preds = %122, %142
  %146 = phi i64 [ %125, %142 ], [ 0, %122 ]
  %147 = and i64 %111, -8, !dbg !311
  br label %148, !dbg !311

148:                                              ; preds = %148, %145
  %149 = phi i64 [ %146, %145 ], [ %155, %148 ], !dbg !312
  %150 = getelementptr inbounds i8, i8* %110, i64 %149, !dbg !312
  %151 = bitcast i8* %150 to <8 x i8>*, !dbg !313
  %152 = load <8 x i8>, <8 x i8>* %151, align 1, !dbg !313, !tbaa !153
  %153 = getelementptr inbounds i8, i8* %109, i64 %149, !dbg !312
  %154 = bitcast i8* %153 to <8 x i8>*, !dbg !317
  store <8 x i8> %152, <8 x i8>* %154, align 1, !dbg !317, !tbaa !153
  %155 = add nuw i64 %149, 8, !dbg !312
  %156 = icmp eq i64 %155, %147, !dbg !312
  br i1 %156, label %157, label %148, !dbg !312, !llvm.loop !322

157:                                              ; preds = %148
  %158 = icmp eq i64 %111, %147, !dbg !311
  br i1 %158, label %168, label %159, !dbg !311

159:                                              ; preds = %115, %113, %142, %157
  %160 = phi i64 [ 0, %113 ], [ 0, %115 ], [ %125, %142 ], [ %147, %157 ]
  br label %161, !dbg !311

161:                                              ; preds = %159, %161
  %162 = phi i64 [ %166, %161 ], [ %160, %159 ]
  %163 = getelementptr inbounds i8, i8* %110, i64 %162, !dbg !313
  %164 = load i8, i8* %163, align 1, !dbg !313, !tbaa !153
  %165 = getelementptr inbounds i8, i8* %109, i64 %162, !dbg !323
  store i8 %164, i8* %165, align 1, !dbg !317, !tbaa !153
  %166 = add nuw i64 %162, 1, !dbg !312
  %167 = icmp eq i64 %166, %111, !dbg !309
  br i1 %167, label %168, label %161, !dbg !311, !llvm.loop !324

168:                                              ; preds = %161, %140, %157, %107
  %169 = tail call i8* @malloc(i64 %21) #12, !dbg !325
  %170 = icmp eq i8* %169, null, !dbg !327
  br i1 %170, label %171, label %172, !dbg !328

171:                                              ; preds = %168
  tail call fastcc void @ink_fail() #11, !dbg !329
  unreachable

172:                                              ; preds = %168
  %173 = bitcast i8* %169 to %struct.ink_block*, !dbg !325
  %174 = bitcast i8* %169 to i8**, !dbg !330
  store i8* %97, i8** %174, align 8, !dbg !330, !tbaa !24
  store i8* %169, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !331, !tbaa !18
  %175 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %173, i64 1, !dbg !332
  %176 = bitcast %struct.ink_block* %175 to i32*, !dbg !333
  br i1 %15, label %214, label %177, !dbg !334

177:                                              ; preds = %172
  %178 = icmp eq i64 %9, 1, !dbg !334
  br i1 %178, label %212, label %179, !dbg !334

179:                                              ; preds = %177
  %180 = getelementptr i8, i8* %169, i64 16, !dbg !334
  %181 = add i64 %16, 16, !dbg !334
  %182 = getelementptr i8, i8* %169, i64 %181, !dbg !334
  %183 = getelementptr i32, i32* %7, i64 %9, !dbg !334
  %184 = bitcast i32* %183 to i8*, !dbg !334
  %185 = icmp ult i8* %180, %184, !dbg !334
  %186 = icmp ugt i8* %182, %8, !dbg !334
  %187 = and i1 %185, %186, !dbg !334
  br i1 %187, label %212, label %188, !dbg !334

188:                                              ; preds = %179
  %189 = and i64 %9, -2, !dbg !334
  %190 = insertelement <2 x i32> poison, i32 %3, i32 0, !dbg !334
  %191 = shufflevector <2 x i32> %190, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !334
  %192 = insertelement <2 x i32> poison, i32 %2, i32 0, !dbg !334
  %193 = shufflevector <2 x i32> %192, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !334
  br label %194, !dbg !334

194:                                              ; preds = %194, %188
  %195 = phi i64 [ 0, %188 ], [ %207, %194 ], !dbg !335
  %196 = phi <2 x i32> [ <i32 0, i32 1>, %188 ], [ %208, %194 ], !dbg !336
  %197 = getelementptr inbounds i32, i32* %7, i64 %195, !dbg !335
  %198 = bitcast i32* %197 to <2 x i32>*, !dbg !337
  %199 = load <2 x i32>, <2 x i32>* %198, align 4, !dbg !337, !tbaa !100, !alias.scope !338
  %200 = urem <2 x i32> %196, <i32 3, i32 3>, !dbg !341
  %201 = icmp eq <2 x i32> %200, zeroinitializer, !dbg !342
  %202 = mul <2 x i32> %199, %191, !dbg !343
  %203 = add <2 x i32> %199, %193, !dbg !343
  %204 = select <2 x i1> %201, <2 x i32> %202, <2 x i32> %203, !dbg !343
  %205 = getelementptr inbounds i32, i32* %176, i64 %195, !dbg !335
  %206 = bitcast i32* %205 to <2 x i32>*, !dbg !344
  store <2 x i32> %204, <2 x i32>* %206, align 4, !dbg !344, !tbaa !100, !alias.scope !345, !noalias !338
  %207 = add nuw i64 %195, 2, !dbg !335
  %208 = add <2 x i32> %196, <i32 2, i32 2>, !dbg !336
  %209 = icmp eq i64 %207, %189, !dbg !335
  br i1 %209, label %210, label %194, !dbg !335, !llvm.loop !347

210:                                              ; preds = %194
  %211 = icmp eq i64 %9, %189, !dbg !334
  br i1 %211, label %214, label %212, !dbg !334

212:                                              ; preds = %179, %177, %210
  %213 = phi i64 [ 0, %179 ], [ 0, %177 ], [ %189, %210 ]
  br label %248, !dbg !334

214:                                              ; preds = %248, %210, %172
  %215 = icmp ult i64 %86, %9, !dbg !349
  %216 = select i1 %215, i64 %86, i64 %9, !dbg !350
  %217 = icmp eq i64 %216, 0, !dbg !351
  br i1 %217, label %261, label %218, !dbg !352

218:                                              ; preds = %214
  %219 = icmp ult i64 %216, 4, !dbg !352
  br i1 %219, label %246, label %220, !dbg !352

220:                                              ; preds = %218
  %221 = and i64 %216, -4, !dbg !352
  %222 = insertelement <4 x i32> poison, i32 %3, i32 0, !dbg !352
  %223 = shufflevector <4 x i32> %222, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !352
  %224 = insertelement <4 x i32> poison, i32 %2, i32 0, !dbg !352
  %225 = shufflevector <4 x i32> %224, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !352
  br label %226, !dbg !352

226:                                              ; preds = %226, %220
  %227 = phi i64 [ 0, %220 ], [ %242, %226 ], !dbg !353
  %228 = getelementptr inbounds i32, i32* %104, i64 %227, !dbg !353
  %229 = bitcast i32* %228 to <4 x i32>*, !dbg !354
  %230 = load <4 x i32>, <4 x i32>* %229, align 4, !dbg !354, !tbaa !100
  %231 = getelementptr inbounds i32, i32* %176, i64 %227, !dbg !353
  %232 = bitcast i32* %231 to <4 x i32>*, !dbg !355
  %233 = load <4 x i32>, <4 x i32>* %232, align 4, !dbg !355, !tbaa !100
  %234 = icmp ult <4 x i32> %230, %233, !dbg !356
  %235 = mul <4 x i32> %233, %223, !dbg !357
  %236 = add <4 x i32> %235, %230, !dbg !357
  %237 = add <4 x i32> %230, %225, !dbg !357
  %238 = sub <4 x i32> %237, %233, !dbg !357
  %239 = select <4 x i1> %234, <4 x i32> %236, <4 x i32> %238, !dbg !357
  %240 = getelementptr inbounds i32, i32* %4, i64 %227, !dbg !353
  %241 = bitcast i32* %240 to <4 x i32>*, !dbg !358
  store <4 x i32> %239, <4 x i32>* %241, align 4, !dbg !358, !tbaa !100
  %242 = add nuw i64 %227, 4, !dbg !353
  %243 = icmp eq i64 %242, %221, !dbg !353
  br i1 %243, label %244, label %226, !dbg !353, !llvm.loop !359

244:                                              ; preds = %226
  %245 = icmp eq i64 %216, %221, !dbg !352
  br i1 %245, label %261, label %246, !dbg !352

246:                                              ; preds = %218, %244
  %247 = phi i64 [ 0, %218 ], [ %221, %244 ]
  br label %262, !dbg !352

248:                                              ; preds = %212, %248
  %249 = phi i64 [ %259, %248 ], [ %213, %212 ]
  %250 = getelementptr inbounds i32, i32* %7, i64 %249, !dbg !337
  %251 = load i32, i32* %250, align 4, !dbg !337, !tbaa !100
  %252 = trunc i64 %249 to i32, !dbg !336
  %253 = urem i32 %252, 3, !dbg !341
  %254 = icmp eq i32 %253, 0, !dbg !342
  %255 = mul i32 %251, %3, !dbg !343
  %256 = add i32 %251, %2, !dbg !343
  %257 = select i1 %254, i32 %255, i32 %256, !dbg !343
  %258 = getelementptr inbounds i32, i32* %176, i64 %249, !dbg !361
  store i32 %257, i32* %258, align 4, !dbg !344, !tbaa !100
  %259 = add nuw i64 %249, 1, !dbg !335
  %260 = icmp eq i64 %259, %9, !dbg !362
  br i1 %260, label %214, label %248, !dbg !334, !llvm.loop !363

261:                                              ; preds = %262, %244, %214
  ret i64 %216, !dbg !364

262:                                              ; preds = %246, %262
  %263 = phi i64 [ %275, %262 ], [ %247, %246 ]
  %264 = getelementptr inbounds i32, i32* %104, i64 %263, !dbg !354
  %265 = load i32, i32* %264, align 4, !dbg !354, !tbaa !100
  %266 = getelementptr inbounds i32, i32* %176, i64 %263, !dbg !355
  %267 = load i32, i32* %266, align 4, !dbg !355, !tbaa !100
  %268 = icmp ult i32 %265, %267, !dbg !356
  %269 = mul i32 %267, %3, !dbg !357
  %270 = add i32 %269, %265, !dbg !357
  %271 = add i32 %265, %2, !dbg !357
  %272 = sub i32 %271, %267, !dbg !357
  %273 = select i1 %268, i32 %270, i32 %272, !dbg !357
  %274 = getelementptr inbounds i32, i32* %4, i64 %263, !dbg !365
  store i32 %273, i32* %274, align 4, !dbg !358, !tbaa !100
  %275 = add nuw i64 %263, 1, !dbg !353
  %276 = icmp eq i64 %275, %216, !dbg !351
  br i1 %276, label %261, label %262, !dbg !352, !llvm.loop !366
}

; Function Attrs: nounwind ssp uwtable
define i64 @ink_compute_into(i32 %0, i8** nocapture readonly %1, i64* nocapture readonly %2, i8* nocapture %3) local_unnamed_addr #0 !dbg !367 {
  %5 = icmp eq i32 %0, 0, !dbg !368
  br i1 %5, label %6, label %31, !dbg !368

6:                                                ; preds = %4
  %7 = bitcast i8** %1 to i32**, !dbg !369
  %8 = load i32*, i32** %7, align 8, !dbg !369, !tbaa !18
  %9 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !370
  %10 = bitcast i8** %9 to i32**, !dbg !370
  %11 = load i32*, i32** %10, align 8, !dbg !370, !tbaa !18
  %12 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !371
  %13 = bitcast i8** %12 to i32**, !dbg !371
  %14 = load i32*, i32** %13, align 8, !dbg !371, !tbaa !18
  %15 = load i32, i32* %14, align 1, !dbg !372
  %16 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !374
  %17 = bitcast i8** %16 to i32**, !dbg !374
  %18 = load i32*, i32** %17, align 8, !dbg !374, !tbaa !18
  %19 = load i32, i32* %18, align 1, !dbg !375
  %20 = load i64, i64* %2, align 8, !dbg !377, !tbaa !378
  %21 = getelementptr inbounds i64, i64* %2, i64 1, !dbg !380
  %22 = load i64, i64* %21, align 8, !dbg !380, !tbaa !378
  %23 = bitcast i8* %3 to i32*, !dbg !381
  %24 = ptrtoint i32* %8 to i64, !dbg !382
  %25 = insertvalue [2 x i64] undef, i64 %24, 0, !dbg !382
  %26 = insertvalue [2 x i64] %25, i64 %20, 1, !dbg !382
  %27 = ptrtoint i32* %11 to i64, !dbg !382
  %28 = insertvalue [2 x i64] undef, i64 %27, 0, !dbg !382
  %29 = insertvalue [2 x i64] %28, i64 %22, 1, !dbg !382
  %30 = tail call i64 @lang_fn_pipeline38_left_padded_zip_u32_into([2 x i64] %26, [2 x i64] %29, i32 %15, i32 %19, i32* %23), !dbg !382
  ret i64 %30, !dbg !383

31:                                               ; preds = %4
  tail call fastcc void @ink_fail(), !dbg !384
  unreachable
}

; Function Attrs: nounwind ssp uwtable
define void @ink_compute_call(i32 %0, i8** nocapture readonly %1, i64* nocapture readonly %2, i8** nocapture %3, i64* nocapture %4) local_unnamed_addr #0 !dbg !385 {
  switch i32 %0, label %126 [
    i32 0, label %6
    i32 1, label %33
    i32 2, label %63
    i32 3, label %94
  ], !dbg !386

6:                                                ; preds = %5
  %7 = bitcast i8** %1 to i32**, !dbg !387
  %8 = load i32*, i32** %7, align 8, !dbg !387, !tbaa !18
  %9 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !388
  %10 = bitcast i8** %9 to i32**, !dbg !388
  %11 = load i32*, i32** %10, align 8, !dbg !388, !tbaa !18
  %12 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !389
  %13 = bitcast i8** %12 to i32**, !dbg !389
  %14 = load i32*, i32** %13, align 8, !dbg !389, !tbaa !18
  %15 = load i32, i32* %14, align 1, !dbg !390
  %16 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !392
  %17 = bitcast i8** %16 to i32**, !dbg !392
  %18 = load i32*, i32** %17, align 8, !dbg !392, !tbaa !18
  %19 = load i32, i32* %18, align 1, !dbg !393
  %20 = load i64, i64* %2, align 8, !dbg !395, !tbaa !378
  %21 = getelementptr inbounds i64, i64* %2, i64 1, !dbg !396
  %22 = load i64, i64* %21, align 8, !dbg !396, !tbaa !378
  %23 = ptrtoint i32* %8 to i64, !dbg !397
  %24 = insertvalue [2 x i64] undef, i64 %23, 0, !dbg !397
  %25 = insertvalue [2 x i64] %24, i64 %20, 1, !dbg !397
  %26 = ptrtoint i32* %11 to i64, !dbg !397
  %27 = insertvalue [2 x i64] undef, i64 %26, 0, !dbg !397
  %28 = insertvalue [2 x i64] %27, i64 %22, 1, !dbg !397
  %29 = tail call [2 x i64] @lang_fn_pipeline38_left_padded_zip_u32([2 x i64] %25, [2 x i64] %28, i32 %15, i32 %19), !dbg !397
  %30 = extractvalue [2 x i64] %29, 0, !dbg !397
  %31 = extractvalue [2 x i64] %29, 1, !dbg !397
  %32 = inttoptr i64 %30 to i8*, !dbg !398
  store i8* %32, i8** %3, align 8, !dbg !399, !tbaa !18
  store i64 %31, i64* %4, align 8, !dbg !400, !tbaa !378
  br label %127

33:                                               ; preds = %5
  %34 = bitcast i8** %1 to i32**, !dbg !401
  %35 = load i32*, i32** %34, align 8, !dbg !401, !tbaa !18
  %36 = load i32, i32* %35, align 1, !dbg !402
  %37 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !404
  %38 = bitcast i8** %37 to i32**, !dbg !404
  %39 = load i32*, i32** %38, align 8, !dbg !404, !tbaa !18
  %40 = load i32, i32* %39, align 1, !dbg !405
  %41 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !407
  %42 = bitcast i8** %41 to i32**, !dbg !407
  %43 = load i32*, i32** %42, align 8, !dbg !407, !tbaa !18
  %44 = load i32, i32* %43, align 1, !dbg !408
  %45 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !410
  %46 = bitcast i8** %45 to i32**, !dbg !410
  %47 = load i32*, i32** %46, align 8, !dbg !410, !tbaa !18
  %48 = load i32, i32* %47, align 1, !dbg !411
  %49 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !413
  %50 = bitcast i8* %49 to %struct.ink_block*, !dbg !413
  %51 = icmp eq i8* %49, null, !dbg !415
  br i1 %51, label %52, label %53, !dbg !416

52:                                               ; preds = %33
  tail call fastcc void @ink_fail() #11, !dbg !417
  unreachable

53:                                               ; preds = %33
  %54 = icmp ult i32 %36, %44, !dbg !418
  %55 = sub i32 0, %44, !dbg !420
  %56 = select i1 %54, i32 %48, i32 %55, !dbg !420
  %57 = add i32 %56, %40, !dbg !420
  %58 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !421, !tbaa !18
  %59 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %50, i64 0, i32 0, !dbg !422
  store %struct.ink_block* %58, %struct.ink_block** %59, align 8, !dbg !423, !tbaa !24
  store i8* %49, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !424, !tbaa !18
  %60 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %50, i64 1, !dbg !425
  %61 = bitcast %struct.ink_block* %60 to i32*, !dbg !426
  store i32 %57, i32* %61, align 4, !dbg !427, !tbaa !100
  %62 = bitcast i8** %3 to %struct.ink_block**, !dbg !428
  store %struct.ink_block* %60, %struct.ink_block** %62, align 8, !dbg !428, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !429, !tbaa !378
  br label %127

63:                                               ; preds = %5
  %64 = bitcast i8** %1 to i32**, !dbg !430
  %65 = load i32*, i32** %64, align 8, !dbg !430, !tbaa !18
  %66 = load i32, i32* %65, align 1, !dbg !431
  %67 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !433
  %68 = bitcast i8** %67 to i32**, !dbg !433
  %69 = load i32*, i32** %68, align 8, !dbg !433, !tbaa !18
  %70 = load i32, i32* %69, align 1, !dbg !434
  %71 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !436
  %72 = bitcast i8** %71 to i32**, !dbg !436
  %73 = load i32*, i32** %72, align 8, !dbg !436, !tbaa !18
  %74 = load i32, i32* %73, align 1, !dbg !437
  %75 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !439
  %76 = bitcast i8** %75 to i32**, !dbg !439
  %77 = load i32*, i32** %76, align 8, !dbg !439, !tbaa !18
  %78 = load i32, i32* %77, align 1, !dbg !440
  %79 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !442
  %80 = bitcast i8* %79 to %struct.ink_block*, !dbg !442
  %81 = icmp eq i8* %79, null, !dbg !444
  br i1 %81, label %82, label %83, !dbg !445

82:                                               ; preds = %63
  tail call fastcc void @ink_fail() #11, !dbg !446
  unreachable

83:                                               ; preds = %63
  %84 = urem i32 %66, 3, !dbg !447
  %85 = icmp eq i32 %84, 0, !dbg !449
  %86 = mul i32 %78, %70, !dbg !450
  %87 = add i32 %74, %70, !dbg !450
  %88 = select i1 %85, i32 %86, i32 %87, !dbg !450
  %89 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !451, !tbaa !18
  %90 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %80, i64 0, i32 0, !dbg !452
  store %struct.ink_block* %89, %struct.ink_block** %90, align 8, !dbg !453, !tbaa !24
  store i8* %79, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !454, !tbaa !18
  %91 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %80, i64 1, !dbg !455
  %92 = bitcast %struct.ink_block* %91 to i32*, !dbg !456
  store i32 %88, i32* %92, align 4, !dbg !457, !tbaa !100
  %93 = bitcast i8** %3 to %struct.ink_block**, !dbg !458
  store %struct.ink_block* %91, %struct.ink_block** %93, align 8, !dbg !458, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !459, !tbaa !378
  br label %127

94:                                               ; preds = %5
  %95 = bitcast i8** %1 to i32**, !dbg !460
  %96 = load i32*, i32** %95, align 8, !dbg !460, !tbaa !18
  %97 = load i32, i32* %96, align 1, !dbg !461
  %98 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !463
  %99 = bitcast i8** %98 to i32**, !dbg !463
  %100 = load i32*, i32** %99, align 8, !dbg !463, !tbaa !18
  %101 = load i32, i32* %100, align 1, !dbg !464
  %102 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !466
  %103 = bitcast i8** %102 to i32**, !dbg !466
  %104 = load i32*, i32** %103, align 8, !dbg !466, !tbaa !18
  %105 = load i32, i32* %104, align 1, !dbg !467
  %106 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !469
  %107 = bitcast i8** %106 to i32**, !dbg !469
  %108 = load i32*, i32** %107, align 8, !dbg !469, !tbaa !18
  %109 = load i32, i32* %108, align 1, !dbg !470
  %110 = tail call dereferenceable_or_null(20) i8* @malloc(i64 20) #12, !dbg !472
  %111 = bitcast i8* %110 to %struct.ink_block*, !dbg !472
  %112 = icmp eq i8* %110, null, !dbg !474
  br i1 %112, label %113, label %114, !dbg !475

113:                                              ; preds = %94
  tail call fastcc void @ink_fail() #11, !dbg !476
  unreachable

114:                                              ; preds = %94
  %115 = icmp ult i32 %97, %101, !dbg !477
  %116 = mul i32 %109, %101, !dbg !479
  %117 = add i32 %116, %97, !dbg !479
  %118 = sub i32 %97, %101, !dbg !479
  %119 = add i32 %118, %105, !dbg !479
  %120 = select i1 %115, i32 %117, i32 %119, !dbg !479
  %121 = load %struct.ink_block*, %struct.ink_block** @ink_blocks, align 8, !dbg !480, !tbaa !18
  %122 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %111, i64 0, i32 0, !dbg !481
  store %struct.ink_block* %121, %struct.ink_block** %122, align 8, !dbg !482, !tbaa !24
  store i8* %110, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !483, !tbaa !18
  %123 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %111, i64 1, !dbg !484
  %124 = bitcast %struct.ink_block* %123 to i32*, !dbg !485
  store i32 %120, i32* %124, align 4, !dbg !486, !tbaa !100
  %125 = bitcast i8** %3 to %struct.ink_block**, !dbg !487
  store %struct.ink_block* %123, %struct.ink_block** %125, align 8, !dbg !487, !tbaa !18
  store i64 1, i64* %4, align 8, !dbg !488, !tbaa !378
  br label %127

126:                                              ; preds = %5
  tail call fastcc void @ink_fail(), !dbg !489
  unreachable

127:                                              ; preds = %114, %83, %53, %6
  ret void, !dbg !490
}

; Function Attrs: nounwind ssp uwtable
define i32 @ink_compute_scalar32(i32 %0, i8** nocapture readonly %1, i64* nocapture readnone %2) local_unnamed_addr #0 !dbg !491 {
  switch i32 %0, label %67 [
    i32 1, label %4
    i32 2, label %24
    i32 3, label %45
  ], !dbg !492

4:                                                ; preds = %3
  %5 = bitcast i8** %1 to i32**, !dbg !493
  %6 = load i32*, i32** %5, align 8, !dbg !493, !tbaa !18
  %7 = load i32, i32* %6, align 1, !dbg !494
  %8 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !496
  %9 = bitcast i8** %8 to i32**, !dbg !496
  %10 = load i32*, i32** %9, align 8, !dbg !496, !tbaa !18
  %11 = load i32, i32* %10, align 1, !dbg !497
  %12 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !499
  %13 = bitcast i8** %12 to i32**, !dbg !499
  %14 = load i32*, i32** %13, align 8, !dbg !499, !tbaa !18
  %15 = load i32, i32* %14, align 1, !dbg !500
  %16 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !502
  %17 = bitcast i8** %16 to i32**, !dbg !502
  %18 = load i32*, i32** %17, align 8, !dbg !502, !tbaa !18
  %19 = load i32, i32* %18, align 1, !dbg !503
  %20 = icmp ult i32 %7, %15, !dbg !505
  %21 = sub i32 0, %15, !dbg !507
  %22 = select i1 %20, i32 %19, i32 %21, !dbg !507
  %23 = add i32 %22, %11, !dbg !507
  br label %68

24:                                               ; preds = %3
  %25 = bitcast i8** %1 to i32**, !dbg !508
  %26 = load i32*, i32** %25, align 8, !dbg !508, !tbaa !18
  %27 = load i32, i32* %26, align 1, !dbg !509
  %28 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !511
  %29 = bitcast i8** %28 to i32**, !dbg !511
  %30 = load i32*, i32** %29, align 8, !dbg !511, !tbaa !18
  %31 = load i32, i32* %30, align 1, !dbg !512
  %32 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !514
  %33 = bitcast i8** %32 to i32**, !dbg !514
  %34 = load i32*, i32** %33, align 8, !dbg !514, !tbaa !18
  %35 = load i32, i32* %34, align 1, !dbg !515
  %36 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !517
  %37 = bitcast i8** %36 to i32**, !dbg !517
  %38 = load i32*, i32** %37, align 8, !dbg !517, !tbaa !18
  %39 = load i32, i32* %38, align 1, !dbg !518
  %40 = urem i32 %27, 3, !dbg !520
  %41 = icmp eq i32 %40, 0, !dbg !522
  %42 = mul i32 %39, %31, !dbg !523
  %43 = add i32 %35, %31, !dbg !523
  %44 = select i1 %41, i32 %42, i32 %43, !dbg !523
  br label %68

45:                                               ; preds = %3
  %46 = bitcast i8** %1 to i32**, !dbg !524
  %47 = load i32*, i32** %46, align 8, !dbg !524, !tbaa !18
  %48 = load i32, i32* %47, align 1, !dbg !525
  %49 = getelementptr inbounds i8*, i8** %1, i64 1, !dbg !527
  %50 = bitcast i8** %49 to i32**, !dbg !527
  %51 = load i32*, i32** %50, align 8, !dbg !527, !tbaa !18
  %52 = load i32, i32* %51, align 1, !dbg !528
  %53 = getelementptr inbounds i8*, i8** %1, i64 2, !dbg !530
  %54 = bitcast i8** %53 to i32**, !dbg !530
  %55 = load i32*, i32** %54, align 8, !dbg !530, !tbaa !18
  %56 = load i32, i32* %55, align 1, !dbg !531
  %57 = getelementptr inbounds i8*, i8** %1, i64 3, !dbg !533
  %58 = bitcast i8** %57 to i32**, !dbg !533
  %59 = load i32*, i32** %58, align 8, !dbg !533, !tbaa !18
  %60 = load i32, i32* %59, align 1, !dbg !534
  %61 = icmp ult i32 %48, %52, !dbg !536
  %62 = mul i32 %60, %52, !dbg !538
  %63 = add i32 %62, %48, !dbg !538
  %64 = sub i32 %48, %52, !dbg !538
  %65 = add i32 %64, %56, !dbg !538
  %66 = select i1 %61, i32 %63, i32 %65, !dbg !538
  br label %68

67:                                               ; preds = %3
  tail call fastcc void @ink_fail(), !dbg !539
  unreachable

68:                                               ; preds = %45, %24, %4
  %69 = phi i32 [ %66, %45 ], [ %44, %24 ], [ %23, %4 ], !dbg !540
  ret i32 %69, !dbg !541
}

; Function Attrs: noreturn nounwind ssp uwtable
define i64 @ink_compute_scalar64(i32 %0, i8** nocapture readnone %1, i64* nocapture readnone %2) local_unnamed_addr #3 !dbg !542 {
  tail call fastcc void @ink_fail(), !dbg !543
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
!11 = !DIFile(filename: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_u32/prior/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
!12 = !{!"Apple clang version 14.0.0 (clang-1400.0.29.202)"}
!13 = distinct !DISubprogram(name: "ink_compute_reset", scope: !14, file: !14, line: 29, type: !15, scopeLine: 29, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!14 = !DIFile(filename: "reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_u32/prior/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
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
!74 = distinct !DISubprogram(name: "lang_fn_pipeline38_left_padded_zip_u32", scope: !14, file: !14, line: 82, type: !15, scopeLine: 82, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
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
!94 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !76)
!95 = !DILocation(line: 89, column: 18, scope: !74)
!96 = !DILocation(line: 90, column: 1, scope: !74)
!97 = !DILocation(line: 90, column: 29, scope: !74)
!98 = !DILocation(line: 91, column: 13, scope: !74)
!99 = !DILocation(line: 93, column: 13, scope: !74)
!100 = !{!101, !101, i64 0}
!101 = !{!"int", !20, i64 0}
!102 = !{!103}
!103 = distinct !{!103, !104}
!104 = distinct !{!104, !"LVerDomain"}
!105 = !DILocation(line: 103, column: 9, scope: !74)
!106 = !DILocation(line: 103, column: 5, scope: !74)
!107 = !DILocation(line: 112, column: 12, scope: !74)
!108 = !{!109}
!109 = distinct !{!109, !104}
!110 = distinct !{!110, !96, !111, !32, !112}
!111 = !DILocation(line: 113, column: 1, scope: !74)
!112 = !{!"llvm.loop.isvectorized", i32 1}
!113 = !DILocation(line: 118, column: 20, scope: !74)
!114 = !DILocation(line: 118, column: 11, scope: !74)
!115 = !DILocation(line: 118, column: 4, scope: !74)
!116 = !DILocation(line: 112, column: 1, scope: !74)
!117 = !DILocation(line: 90, column: 19, scope: !74)
!118 = distinct !{!118, !96, !111, !32, !112}
!119 = !DILocation(line: 118, column: 30, scope: !74)
!120 = !DILocation(line: 119, column: 19, scope: !74)
!121 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !122)
!122 = distinct !DILocation(line: 120, column: 19, scope: !74)
!123 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !122)
!124 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !122)
!125 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !122)
!126 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !122)
!127 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !122)
!128 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !122)
!129 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !122)
!130 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !122)
!131 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !122)
!132 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !122)
!133 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !122)
!134 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !122)
!135 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !122)
!136 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !122)
!137 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !122)
!138 = !DILocation(line: 120, column: 19, scope: !74)
!139 = !DILocation(line: 37, column: 138, scope: !140, inlinedAt: !141)
!140 = distinct !DISubprogram(name: "ink_copy", scope: !14, file: !14, line: 37, type: !15, scopeLine: 37, flags: DIFlagPrototyped, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!141 = distinct !DILocation(line: 121, column: 1, scope: !74)
!142 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !122)
!143 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !141)
!144 = !DILocation(line: 122, column: 18, scope: !74)
!145 = !DILocation(line: 122, column: 10, scope: !74)
!146 = !DILocation(line: 122, column: 27, scope: !74)
!147 = !DILocation(line: 122, column: 43, scope: !74)
!148 = !DILocation(line: 37, column: 154, scope: !140, inlinedAt: !149)
!149 = distinct !DILocation(line: 122, column: 1, scope: !74)
!150 = !DILocation(line: 37, column: 138, scope: !140, inlinedAt: !149)
!151 = !DILocation(line: 37, column: 162, scope: !140, inlinedAt: !149)
!152 = !DILocation(line: 37, column: 172, scope: !140, inlinedAt: !149)
!153 = !{!20, !20, i64 0}
!154 = !{!155}
!155 = distinct !{!155, !156}
!156 = distinct !{!156, !"LVerDomain"}
!157 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !149)
!158 = !{!159}
!159 = distinct !{!159, !156}
!160 = distinct !{!160, !150, !161, !32, !112}
!161 = !DILocation(line: 37, column: 177, scope: !140, inlinedAt: !149)
!162 = distinct !{!162, !150, !161, !32, !112}
!163 = !DILocation(line: 37, column: 165, scope: !140, inlinedAt: !149)
!164 = distinct !{!164, !150, !161, !32, !112}
!165 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !166)
!166 = distinct !DILocation(line: 127, column: 19, scope: !74)
!167 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !166)
!168 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !166)
!169 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !166)
!170 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !166)
!171 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !166)
!172 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !166)
!173 = !DILocation(line: 127, column: 19, scope: !74)
!174 = !DILocation(line: 128, column: 1, scope: !74)
!175 = !DILocation(line: 128, column: 33, scope: !74)
!176 = !DILocation(line: 129, column: 14, scope: !74)
!177 = !DILocation(line: 131, column: 14, scope: !74)
!178 = !{!179}
!179 = distinct !{!179, !180}
!180 = distinct !{!180, !"LVerDomain"}
!181 = !DILocation(line: 145, column: 18, scope: !74)
!182 = !DILocation(line: 149, column: 10, scope: !74)
!183 = !DILocation(line: 149, column: 5, scope: !74)
!184 = !DILocation(line: 158, column: 14, scope: !74)
!185 = !{!186}
!186 = distinct !{!186, !180}
!187 = distinct !{!187, !174, !188, !32, !112}
!188 = !DILocation(line: 159, column: 1, scope: !74)
!189 = !DILocation(line: 162, column: 38, scope: !74)
!190 = !DILocation(line: 162, column: 30, scope: !74)
!191 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !192)
!192 = distinct !DILocation(line: 162, column: 19, scope: !74)
!193 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !192)
!194 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !192)
!195 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !192)
!196 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !192)
!197 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !192)
!198 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !192)
!199 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !192)
!200 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !192)
!201 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !192)
!202 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !192)
!203 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !192)
!204 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !192)
!205 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !192)
!206 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !192)
!207 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !192)
!208 = !DILocation(line: 162, column: 19, scope: !74)
!209 = !DILocation(line: 163, column: 1, scope: !74)
!210 = !DILocation(line: 163, column: 65, scope: !74)
!211 = !DILocation(line: 164, column: 14, scope: !74)
!212 = !DILocation(line: 166, column: 14, scope: !74)
!213 = !DILocation(line: 176, column: 10, scope: !74)
!214 = !DILocation(line: 176, column: 5, scope: !74)
!215 = !DILocation(line: 189, column: 14, scope: !74)
!216 = distinct !{!216, !209, !217, !32, !112}
!217 = !DILocation(line: 190, column: 1, scope: !74)
!218 = !DILocation(line: 158, column: 1, scope: !74)
!219 = !DILocation(line: 128, column: 21, scope: !74)
!220 = distinct !{!220, !174, !188, !32, !112}
!221 = !DILocation(line: 192, column: 1, scope: !74)
!222 = !DILocation(line: 189, column: 1, scope: !74)
!223 = !DILocation(line: 163, column: 21, scope: !74)
!224 = distinct !{!224, !209, !217, !32, !225, !112}
!225 = !{!"llvm.loop.unroll.runtime.disable"}
!226 = distinct !DISubprogram(name: "lang_fn_left_word", scope: !14, file: !14, line: 193, type: !15, scopeLine: 193, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!227 = !DILocation(line: 201, column: 9, scope: !226)
!228 = !DILocation(line: 201, column: 5, scope: !226)
!229 = !DILocation(line: 210, column: 1, scope: !226)
!230 = distinct !DISubprogram(name: "lang_fn_right_word", scope: !14, file: !14, line: 212, type: !15, scopeLine: 212, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!231 = !DILocation(line: 224, column: 16, scope: !230)
!232 = !DILocation(line: 228, column: 9, scope: !230)
!233 = !DILocation(line: 228, column: 5, scope: !230)
!234 = !DILocation(line: 237, column: 1, scope: !230)
!235 = distinct !DISubprogram(name: "lang_fn_pair_word", scope: !14, file: !14, line: 239, type: !15, scopeLine: 239, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!236 = !DILocation(line: 247, column: 9, scope: !235)
!237 = !DILocation(line: 247, column: 5, scope: !235)
!238 = !DILocation(line: 260, column: 1, scope: !235)
!239 = distinct !DISubprogram(name: "lang_fn_pipeline38_left_padded_zip_u32_into", scope: !14, file: !14, line: 262, type: !15, scopeLine: 262, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!240 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !241)
!241 = distinct !DILocation(line: 269, column: 18, scope: !239)
!242 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !241)
!243 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !241)
!244 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !241)
!245 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !241)
!246 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !241)
!247 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !241)
!248 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !241)
!249 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !241)
!250 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !241)
!251 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !241)
!252 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !241)
!253 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !241)
!254 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !241)
!255 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !241)
!256 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !241)
!257 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !241)
!258 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !241)
!259 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !241)
!260 = !DILocation(line: 269, column: 18, scope: !239)
!261 = !DILocation(line: 270, column: 1, scope: !239)
!262 = !DILocation(line: 270, column: 29, scope: !239)
!263 = !DILocation(line: 271, column: 13, scope: !239)
!264 = !DILocation(line: 273, column: 13, scope: !239)
!265 = !{!266}
!266 = distinct !{!266, !267}
!267 = distinct !{!267, !"LVerDomain"}
!268 = !DILocation(line: 283, column: 9, scope: !239)
!269 = !DILocation(line: 283, column: 5, scope: !239)
!270 = !DILocation(line: 292, column: 12, scope: !239)
!271 = !{!272}
!272 = distinct !{!272, !267}
!273 = distinct !{!273, !261, !274, !32, !112}
!274 = !DILocation(line: 293, column: 1, scope: !239)
!275 = !DILocation(line: 298, column: 20, scope: !239)
!276 = !DILocation(line: 298, column: 11, scope: !239)
!277 = !DILocation(line: 298, column: 4, scope: !239)
!278 = !DILocation(line: 292, column: 1, scope: !239)
!279 = !DILocation(line: 270, column: 19, scope: !239)
!280 = distinct !{!280, !261, !274, !32, !112}
!281 = !DILocation(line: 298, column: 30, scope: !239)
!282 = !DILocation(line: 299, column: 19, scope: !239)
!283 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !284)
!284 = distinct !DILocation(line: 300, column: 19, scope: !239)
!285 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !284)
!286 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !284)
!287 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !284)
!288 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !284)
!289 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !284)
!290 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !284)
!291 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !284)
!292 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !284)
!293 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !284)
!294 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !284)
!295 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !284)
!296 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !284)
!297 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !284)
!298 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !284)
!299 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !284)
!300 = !DILocation(line: 300, column: 19, scope: !239)
!301 = !DILocation(line: 37, column: 138, scope: !140, inlinedAt: !302)
!302 = distinct !DILocation(line: 301, column: 1, scope: !239)
!303 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !284)
!304 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !302)
!305 = !DILocation(line: 302, column: 18, scope: !239)
!306 = !DILocation(line: 302, column: 10, scope: !239)
!307 = !DILocation(line: 302, column: 27, scope: !239)
!308 = !DILocation(line: 302, column: 43, scope: !239)
!309 = !DILocation(line: 37, column: 154, scope: !140, inlinedAt: !310)
!310 = distinct !DILocation(line: 302, column: 1, scope: !239)
!311 = !DILocation(line: 37, column: 138, scope: !140, inlinedAt: !310)
!312 = !DILocation(line: 37, column: 162, scope: !140, inlinedAt: !310)
!313 = !DILocation(line: 37, column: 172, scope: !140, inlinedAt: !310)
!314 = !{!315}
!315 = distinct !{!315, !316}
!316 = distinct !{!316, !"LVerDomain"}
!317 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !310)
!318 = !{!319}
!319 = distinct !{!319, !316}
!320 = distinct !{!320, !311, !321, !32, !112}
!321 = !DILocation(line: 37, column: 177, scope: !140, inlinedAt: !310)
!322 = distinct !{!322, !311, !321, !32, !112}
!323 = !DILocation(line: 37, column: 165, scope: !140, inlinedAt: !310)
!324 = distinct !{!324, !311, !321, !32, !112}
!325 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !326)
!326 = distinct !DILocation(line: 307, column: 19, scope: !239)
!327 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !326)
!328 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !326)
!329 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !326)
!330 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !326)
!331 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !326)
!332 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !326)
!333 = !DILocation(line: 307, column: 19, scope: !239)
!334 = !DILocation(line: 308, column: 1, scope: !239)
!335 = !DILocation(line: 308, column: 33, scope: !239)
!336 = !DILocation(line: 309, column: 14, scope: !239)
!337 = !DILocation(line: 311, column: 14, scope: !239)
!338 = !{!339}
!339 = distinct !{!339, !340}
!340 = distinct !{!340, !"LVerDomain"}
!341 = !DILocation(line: 325, column: 18, scope: !239)
!342 = !DILocation(line: 329, column: 10, scope: !239)
!343 = !DILocation(line: 329, column: 5, scope: !239)
!344 = !DILocation(line: 338, column: 14, scope: !239)
!345 = !{!346}
!346 = distinct !{!346, !340}
!347 = distinct !{!347, !334, !348, !32, !112}
!348 = !DILocation(line: 339, column: 1, scope: !239)
!349 = !DILocation(line: 342, column: 40, scope: !239)
!350 = !DILocation(line: 342, column: 32, scope: !239)
!351 = !DILocation(line: 343, column: 21, scope: !239)
!352 = !DILocation(line: 343, column: 1, scope: !239)
!353 = !DILocation(line: 343, column: 65, scope: !239)
!354 = !DILocation(line: 344, column: 14, scope: !239)
!355 = !DILocation(line: 346, column: 14, scope: !239)
!356 = !DILocation(line: 356, column: 10, scope: !239)
!357 = !DILocation(line: 356, column: 5, scope: !239)
!358 = !DILocation(line: 369, column: 14, scope: !239)
!359 = distinct !{!359, !352, !360, !32, !112}
!360 = !DILocation(line: 370, column: 1, scope: !239)
!361 = !DILocation(line: 338, column: 1, scope: !239)
!362 = !DILocation(line: 308, column: 21, scope: !239)
!363 = distinct !{!363, !334, !348, !32, !112}
!364 = !DILocation(line: 371, column: 1, scope: !239)
!365 = !DILocation(line: 369, column: 1, scope: !239)
!366 = distinct !{!366, !352, !360, !32, !225, !112}
!367 = distinct !DISubprogram(name: "ink_compute_into", scope: !14, file: !14, line: 373, type: !15, scopeLine: 373, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!368 = !DILocation(line: 373, column: 151, scope: !367)
!369 = !DILocation(line: 374, column: 34, scope: !367)
!370 = !DILocation(line: 374, column: 67, scope: !367)
!371 = !DILocation(line: 374, column: 100, scope: !367)
!372 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !373)
!373 = distinct !DILocation(line: 374, column: 87, scope: !367)
!374 = !DILocation(line: 374, column: 145, scope: !367)
!375 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !376)
!376 = distinct !DILocation(line: 374, column: 132, scope: !367)
!377 = !DILocation(line: 374, column: 234, scope: !367)
!378 = !{!379, !379, i64 0}
!379 = !{!"long", !20, i64 0}
!380 = !DILocation(line: 374, column: 264, scope: !367)
!381 = !DILocation(line: 374, column: 282, scope: !367)
!382 = !DILocation(line: 374, column: 172, scope: !367)
!383 = !DILocation(line: 375, column: 30, scope: !367)
!384 = !DILocation(line: 375, column: 9, scope: !367)
!385 = distinct !DISubprogram(name: "ink_compute_call", scope: !14, file: !14, line: 376, type: !15, scopeLine: 376, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!386 = !DILocation(line: 376, column: 142, scope: !385)
!387 = !DILocation(line: 377, column: 34, scope: !385)
!388 = !DILocation(line: 377, column: 67, scope: !385)
!389 = !DILocation(line: 377, column: 100, scope: !385)
!390 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !391)
!391 = distinct !DILocation(line: 377, column: 87, scope: !385)
!392 = !DILocation(line: 377, column: 145, scope: !385)
!393 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !394)
!394 = distinct !DILocation(line: 377, column: 132, scope: !385)
!395 = !DILocation(line: 377, column: 242, scope: !385)
!396 = !DILocation(line: 377, column: 272, scope: !385)
!397 = !DILocation(line: 377, column: 185, scope: !385)
!398 = !DILocation(line: 377, column: 299, scope: !385)
!399 = !DILocation(line: 377, column: 298, scope: !385)
!400 = !DILocation(line: 377, column: 317, scope: !385)
!401 = !DILocation(line: 378, column: 34, scope: !385)
!402 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !403)
!403 = distinct !DILocation(line: 378, column: 21, scope: !385)
!404 = !DILocation(line: 378, column: 79, scope: !385)
!405 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !406)
!406 = distinct !DILocation(line: 378, column: 66, scope: !385)
!407 = !DILocation(line: 378, column: 124, scope: !385)
!408 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !409)
!409 = distinct !DILocation(line: 378, column: 111, scope: !385)
!410 = !DILocation(line: 378, column: 169, scope: !385)
!411 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !412)
!412 = distinct !DILocation(line: 378, column: 156, scope: !385)
!413 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !414)
!414 = distinct !DILocation(line: 378, column: 251, scope: !385)
!415 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !414)
!416 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !414)
!417 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !414)
!418 = !DILocation(line: 201, column: 9, scope: !226, inlinedAt: !419)
!419 = distinct !DILocation(line: 378, column: 205, scope: !385)
!420 = !DILocation(line: 201, column: 5, scope: !226, inlinedAt: !419)
!421 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !414)
!422 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !414)
!423 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !414)
!424 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !414)
!425 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !414)
!426 = !DILocation(line: 378, column: 251, scope: !385)
!427 = !DILocation(line: 378, column: 284, scope: !385)
!428 = !DILocation(line: 378, column: 299, scope: !385)
!429 = !DILocation(line: 378, column: 311, scope: !385)
!430 = !DILocation(line: 379, column: 34, scope: !385)
!431 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !432)
!432 = distinct !DILocation(line: 379, column: 21, scope: !385)
!433 = !DILocation(line: 379, column: 79, scope: !385)
!434 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !435)
!435 = distinct !DILocation(line: 379, column: 66, scope: !385)
!436 = !DILocation(line: 379, column: 124, scope: !385)
!437 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !438)
!438 = distinct !DILocation(line: 379, column: 111, scope: !385)
!439 = !DILocation(line: 379, column: 169, scope: !385)
!440 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !441)
!441 = distinct !DILocation(line: 379, column: 156, scope: !385)
!442 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !443)
!443 = distinct !DILocation(line: 379, column: 252, scope: !385)
!444 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !443)
!445 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !443)
!446 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !443)
!447 = !DILocation(line: 224, column: 16, scope: !230, inlinedAt: !448)
!448 = distinct !DILocation(line: 379, column: 205, scope: !385)
!449 = !DILocation(line: 228, column: 9, scope: !230, inlinedAt: !448)
!450 = !DILocation(line: 228, column: 5, scope: !230, inlinedAt: !448)
!451 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !443)
!452 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !443)
!453 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !443)
!454 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !443)
!455 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !443)
!456 = !DILocation(line: 379, column: 252, scope: !385)
!457 = !DILocation(line: 379, column: 285, scope: !385)
!458 = !DILocation(line: 379, column: 300, scope: !385)
!459 = !DILocation(line: 379, column: 312, scope: !385)
!460 = !DILocation(line: 380, column: 34, scope: !385)
!461 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !462)
!462 = distinct !DILocation(line: 380, column: 21, scope: !385)
!463 = !DILocation(line: 380, column: 79, scope: !385)
!464 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !465)
!465 = distinct !DILocation(line: 380, column: 66, scope: !385)
!466 = !DILocation(line: 380, column: 124, scope: !385)
!467 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !468)
!468 = distinct !DILocation(line: 380, column: 111, scope: !385)
!469 = !DILocation(line: 380, column: 169, scope: !385)
!470 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !471)
!471 = distinct !DILocation(line: 380, column: 156, scope: !385)
!472 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !473)
!473 = distinct !DILocation(line: 380, column: 251, scope: !385)
!474 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !473)
!475 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !473)
!476 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !473)
!477 = !DILocation(line: 247, column: 9, scope: !235, inlinedAt: !478)
!478 = distinct !DILocation(line: 380, column: 205, scope: !385)
!479 = !DILocation(line: 247, column: 5, scope: !235, inlinedAt: !478)
!480 = !DILocation(line: 32, column: 231, scope: !49, inlinedAt: !473)
!481 = !DILocation(line: 32, column: 226, scope: !49, inlinedAt: !473)
!482 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !473)
!483 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !473)
!484 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !473)
!485 = !DILocation(line: 380, column: 251, scope: !385)
!486 = !DILocation(line: 380, column: 284, scope: !385)
!487 = !DILocation(line: 380, column: 299, scope: !385)
!488 = !DILocation(line: 380, column: 311, scope: !385)
!489 = !DILocation(line: 381, column: 9, scope: !385)
!490 = !DILocation(line: 381, column: 21, scope: !385)
!491 = distinct !DISubprogram(name: "ink_compute_scalar32", scope: !14, file: !14, line: 382, type: !15, scopeLine: 382, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!492 = !DILocation(line: 382, column: 122, scope: !491)
!493 = !DILocation(line: 383, column: 34, scope: !491)
!494 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !495)
!495 = distinct !DILocation(line: 383, column: 21, scope: !491)
!496 = !DILocation(line: 383, column: 79, scope: !491)
!497 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !498)
!498 = distinct !DILocation(line: 383, column: 66, scope: !491)
!499 = !DILocation(line: 383, column: 124, scope: !491)
!500 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !501)
!501 = distinct !DILocation(line: 383, column: 111, scope: !491)
!502 = !DILocation(line: 383, column: 169, scope: !491)
!503 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !504)
!504 = distinct !DILocation(line: 383, column: 156, scope: !491)
!505 = !DILocation(line: 201, column: 9, scope: !226, inlinedAt: !506)
!506 = distinct !DILocation(line: 383, column: 205, scope: !491)
!507 = !DILocation(line: 201, column: 5, scope: !226, inlinedAt: !506)
!508 = !DILocation(line: 384, column: 34, scope: !491)
!509 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !510)
!510 = distinct !DILocation(line: 384, column: 21, scope: !491)
!511 = !DILocation(line: 384, column: 79, scope: !491)
!512 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !513)
!513 = distinct !DILocation(line: 384, column: 66, scope: !491)
!514 = !DILocation(line: 384, column: 124, scope: !491)
!515 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !516)
!516 = distinct !DILocation(line: 384, column: 111, scope: !491)
!517 = !DILocation(line: 384, column: 169, scope: !491)
!518 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !519)
!519 = distinct !DILocation(line: 384, column: 156, scope: !491)
!520 = !DILocation(line: 224, column: 16, scope: !230, inlinedAt: !521)
!521 = distinct !DILocation(line: 384, column: 205, scope: !491)
!522 = !DILocation(line: 228, column: 9, scope: !230, inlinedAt: !521)
!523 = !DILocation(line: 228, column: 5, scope: !230, inlinedAt: !521)
!524 = !DILocation(line: 385, column: 34, scope: !491)
!525 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !526)
!526 = distinct !DILocation(line: 385, column: 21, scope: !491)
!527 = !DILocation(line: 385, column: 79, scope: !491)
!528 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !529)
!529 = distinct !DILocation(line: 385, column: 66, scope: !491)
!530 = !DILocation(line: 385, column: 124, scope: !491)
!531 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !532)
!532 = distinct !DILocation(line: 385, column: 111, scope: !491)
!533 = !DILocation(line: 385, column: 169, scope: !491)
!534 = !DILocation(line: 37, column: 171, scope: !140, inlinedAt: !535)
!535 = distinct !DILocation(line: 385, column: 156, scope: !491)
!536 = !DILocation(line: 247, column: 9, scope: !235, inlinedAt: !537)
!537 = distinct !DILocation(line: 385, column: 205, scope: !491)
!538 = !DILocation(line: 247, column: 5, scope: !235, inlinedAt: !537)
!539 = !DILocation(line: 386, column: 9, scope: !491)
!540 = !DILocation(line: 0, scope: !491)
!541 = !DILocation(line: 386, column: 30, scope: !491)
!542 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !14, file: !14, line: 387, type: !15, scopeLine: 387, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!543 = !DILocation(line: 388, column: 9, scope: !542)
