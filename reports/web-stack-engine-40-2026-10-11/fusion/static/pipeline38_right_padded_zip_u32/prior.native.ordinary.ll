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
  %30 = sub i32 0, %2
  br i1 %14, label %68, label %31, !dbg !95

31:                                               ; preds = %25
  %32 = icmp ult i64 %8, 4, !dbg !95
  br i1 %32, label %66, label %33, !dbg !95

33:                                               ; preds = %31
  %34 = getelementptr i8, i8* %21, i64 16, !dbg !95
  %35 = add i64 %15, 16, !dbg !95
  %36 = getelementptr i8, i8* %21, i64 %35, !dbg !95
  %37 = getelementptr i32, i32* %6, i64 %8, !dbg !95
  %38 = bitcast i32* %37 to i8*, !dbg !95
  %39 = icmp ult i8* %34, %38, !dbg !95
  %40 = icmp ugt i8* %36, %7, !dbg !95
  %41 = and i1 %39, %40, !dbg !95
  br i1 %41, label %66, label %42, !dbg !95

42:                                               ; preds = %33
  %43 = and i64 %8, -4, !dbg !95
  %44 = insertelement <4 x i32> poison, i32 %2, i32 0, !dbg !95
  %45 = shufflevector <4 x i32> %44, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !95
  %46 = insertelement <4 x i32> poison, i32 %3, i32 0, !dbg !95
  %47 = shufflevector <4 x i32> %46, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !95
  %48 = insertelement <4 x i32> poison, i32 %30, i32 0, !dbg !95
  %49 = shufflevector <4 x i32> %48, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !95
  br label %50, !dbg !95

50:                                               ; preds = %50, %42
  %51 = phi i64 [ 0, %42 ], [ %61, %50 ], !dbg !96
  %52 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %42 ], [ %62, %50 ], !dbg !97
  %53 = getelementptr inbounds i32, i32* %6, i64 %51, !dbg !96
  %54 = bitcast i32* %53 to <4 x i32>*, !dbg !98
  %55 = load <4 x i32>, <4 x i32>* %54, align 4, !dbg !98, !tbaa !99, !alias.scope !101
  %56 = icmp ult <4 x i32> %52, %45, !dbg !104
  %57 = select <4 x i1> %56, <4 x i32> %47, <4 x i32> %49, !dbg !105
  %58 = add <4 x i32> %55, %57, !dbg !105
  %59 = getelementptr inbounds i32, i32* %29, i64 %51, !dbg !96
  %60 = bitcast i32* %59 to <4 x i32>*, !dbg !106
  store <4 x i32> %58, <4 x i32>* %60, align 4, !dbg !106, !tbaa !99, !alias.scope !107, !noalias !101
  %61 = add nuw i64 %51, 4, !dbg !96
  %62 = add <4 x i32> %52, <i32 4, i32 4, i32 4, i32 4>, !dbg !97
  %63 = icmp eq i64 %61, %43, !dbg !96
  br i1 %63, label %64, label %50, !dbg !96, !llvm.loop !109

64:                                               ; preds = %50
  %65 = icmp eq i64 %8, %43, !dbg !95
  br i1 %65, label %68, label %66, !dbg !95

66:                                               ; preds = %33, %31, %64
  %67 = phi i64 [ 0, %33 ], [ 0, %31 ], [ %43, %64 ]
  br label %115, !dbg !95

68:                                               ; preds = %115, %64, %25
  %69 = tail call i8* @malloc(i64 %20) #12, !dbg !112
  %70 = icmp eq i8* %69, null, !dbg !114
  br i1 %70, label %71, label %72, !dbg !115

71:                                               ; preds = %68
  tail call fastcc void @ink_fail() #11, !dbg !116
  unreachable

72:                                               ; preds = %68
  %73 = bitcast i8* %69 to %struct.ink_block*, !dbg !112
  %74 = bitcast i8* %69 to i8**, !dbg !117
  store i8* %21, i8** %74, align 8, !dbg !117, !tbaa !24
  store i8* %69, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !118, !tbaa !18
  %75 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %73, i64 1, !dbg !119
  %76 = bitcast %struct.ink_block* %75 to i8*, !dbg !120
  %77 = bitcast %struct.ink_block* %75 to i32*, !dbg !121
  br i1 %14, label %126, label %78, !dbg !122

78:                                               ; preds = %72
  %79 = icmp eq i64 %8, 1, !dbg !122
  br i1 %79, label %113, label %80, !dbg !122

80:                                               ; preds = %78
  %81 = getelementptr i8, i8* %69, i64 16, !dbg !122
  %82 = add i64 %15, 16, !dbg !122
  %83 = getelementptr i8, i8* %69, i64 %82, !dbg !122
  %84 = getelementptr i32, i32* %6, i64 %8, !dbg !122
  %85 = bitcast i32* %84 to i8*, !dbg !122
  %86 = icmp ult i8* %81, %85, !dbg !122
  %87 = icmp ugt i8* %83, %7, !dbg !122
  %88 = and i1 %86, %87, !dbg !122
  br i1 %88, label %113, label %89, !dbg !122

89:                                               ; preds = %80
  %90 = and i64 %8, -2, !dbg !122
  %91 = insertelement <2 x i32> poison, i32 %3, i32 0, !dbg !122
  %92 = shufflevector <2 x i32> %91, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !122
  %93 = insertelement <2 x i32> poison, i32 %2, i32 0, !dbg !122
  %94 = shufflevector <2 x i32> %93, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !122
  br label %95, !dbg !122

95:                                               ; preds = %95, %89
  %96 = phi i64 [ 0, %89 ], [ %108, %95 ], !dbg !123
  %97 = phi <2 x i32> [ <i32 0, i32 1>, %89 ], [ %109, %95 ], !dbg !124
  %98 = getelementptr inbounds i32, i32* %6, i64 %96, !dbg !123
  %99 = bitcast i32* %98 to <2 x i32>*, !dbg !125
  %100 = load <2 x i32>, <2 x i32>* %99, align 4, !dbg !125, !tbaa !99, !alias.scope !126
  %101 = urem <2 x i32> %97, <i32 3, i32 3>, !dbg !129
  %102 = icmp eq <2 x i32> %101, zeroinitializer, !dbg !130
  %103 = mul <2 x i32> %100, %92, !dbg !131
  %104 = add <2 x i32> %100, %94, !dbg !131
  %105 = select <2 x i1> %102, <2 x i32> %103, <2 x i32> %104, !dbg !131
  %106 = getelementptr inbounds i32, i32* %77, i64 %96, !dbg !123
  %107 = bitcast i32* %106 to <2 x i32>*, !dbg !132
  store <2 x i32> %105, <2 x i32>* %107, align 4, !dbg !132, !tbaa !99, !alias.scope !133, !noalias !126
  %108 = add nuw i64 %96, 2, !dbg !123
  %109 = add <2 x i32> %97, <i32 2, i32 2>, !dbg !124
  %110 = icmp eq i64 %108, %90, !dbg !123
  br i1 %110, label %111, label %95, !dbg !123, !llvm.loop !135

111:                                              ; preds = %95
  %112 = icmp eq i64 %8, %90, !dbg !122
  br i1 %112, label %126, label %113, !dbg !122

113:                                              ; preds = %80, %78, %111
  %114 = phi i64 [ 0, %80 ], [ 0, %78 ], [ %90, %111 ]
  br label %129, !dbg !122

115:                                              ; preds = %66, %115
  %116 = phi i64 [ %124, %115 ], [ %67, %66 ]
  %117 = trunc i64 %116 to i32, !dbg !97
  %118 = getelementptr inbounds i32, i32* %6, i64 %116, !dbg !98
  %119 = load i32, i32* %118, align 4, !dbg !98, !tbaa !99
  %120 = icmp ult i32 %117, %2, !dbg !104
  %121 = select i1 %120, i32 %3, i32 %30, !dbg !105
  %122 = add i32 %119, %121, !dbg !105
  %123 = getelementptr inbounds i32, i32* %29, i64 %116, !dbg !137
  store i32 %122, i32* %123, align 4, !dbg !106, !tbaa !99
  %124 = add nuw i64 %116, 1, !dbg !96
  %125 = icmp eq i64 %124, %8, !dbg !138
  br i1 %125, label %68, label %115, !dbg !95, !llvm.loop !139

126:                                              ; preds = %129, %111, %72
  %127 = xor i64 %10, -1, !dbg !140
  %128 = icmp ugt i64 %8, %127, !dbg !141
  br i1 %128, label %142, label %143, !dbg !142

129:                                              ; preds = %113, %129
  %130 = phi i64 [ %140, %129 ], [ %114, %113 ]
  %131 = getelementptr inbounds i32, i32* %6, i64 %130, !dbg !125
  %132 = load i32, i32* %131, align 4, !dbg !125, !tbaa !99
  %133 = trunc i64 %130 to i32, !dbg !124
  %134 = urem i32 %133, 3, !dbg !129
  %135 = icmp eq i32 %134, 0, !dbg !130
  %136 = mul i32 %132, %3, !dbg !131
  %137 = add i32 %132, %2, !dbg !131
  %138 = select i1 %135, i32 %136, i32 %137, !dbg !131
  %139 = getelementptr inbounds i32, i32* %77, i64 %130, !dbg !143
  store i32 %138, i32* %139, align 4, !dbg !132, !tbaa !99
  %140 = add nuw i64 %130, 1, !dbg !123
  %141 = icmp eq i64 %140, %8, !dbg !144
  br i1 %141, label %126, label %129, !dbg !122, !llvm.loop !145

142:                                              ; preds = %126
  tail call fastcc void @ink_fail(), !dbg !146
  unreachable

143:                                              ; preds = %126
  %144 = add i64 %10, %8, !dbg !147
  %145 = icmp ugt i64 %144, 4611686018427387903, !dbg !148
  br i1 %145, label %146, label %147, !dbg !150

146:                                              ; preds = %143
  tail call fastcc void @ink_fail() #11, !dbg !151
  unreachable

147:                                              ; preds = %143
  %148 = icmp eq i64 %144, 0, !dbg !152
  %149 = shl nuw i64 %144, 2, !dbg !153
  %150 = select i1 %148, i64 4, i64 %149, !dbg !153
  %151 = icmp ugt i64 %150, -17, !dbg !154
  br i1 %151, label %152, label %153, !dbg !155

152:                                              ; preds = %147
  tail call fastcc void @ink_fail() #11, !dbg !156
  unreachable

153:                                              ; preds = %147
  %154 = add nuw i64 %150, 16, !dbg !157
  %155 = tail call i8* @malloc(i64 %154) #12, !dbg !158
  %156 = icmp eq i8* %155, null, !dbg !159
  br i1 %156, label %157, label %158, !dbg !160

157:                                              ; preds = %153
  tail call fastcc void @ink_fail() #11, !dbg !161
  unreachable

158:                                              ; preds = %153
  %159 = bitcast i8* %155 to %struct.ink_block*, !dbg !158
  %160 = bitcast i8* %155 to i8**, !dbg !162
  store i8* %69, i8** %160, align 8, !dbg !162, !tbaa !24
  store i8* %155, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !163, !tbaa !18
  %161 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %159, i64 1, !dbg !164
  %162 = bitcast %struct.ink_block* %161 to i32*, !dbg !165
  br i1 %14, label %165, label %163, !dbg !166

163:                                              ; preds = %158
  %164 = bitcast %struct.ink_block* %161 to i8*, !dbg !169
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* nonnull align 1 %164, i8* nonnull align 1 %76, i64 %15, i1 false), !dbg !170
  br label %165, !dbg !171

165:                                              ; preds = %163, %158
  %166 = getelementptr inbounds i32, i32* %162, i64 %8, !dbg !171
  %167 = bitcast i32* %166 to i8*, !dbg !172
  %168 = inttoptr i64 %9 to i8*, !dbg !173
  %169 = shl i64 %10, 2, !dbg !174
  %170 = icmp eq i64 %169, 0, !dbg !175
  br i1 %170, label %226, label %171, !dbg !177

171:                                              ; preds = %165
  %172 = icmp ult i64 %169, 8, !dbg !177
  br i1 %172, label %217, label %173, !dbg !177

173:                                              ; preds = %171
  %174 = add i64 %149, 16, !dbg !177
  %175 = getelementptr i8, i8* %155, i64 %174, !dbg !177
  %176 = getelementptr i8, i8* %168, i64 %169, !dbg !177
  %177 = icmp ugt i8* %176, %167, !dbg !177
  %178 = icmp ugt i8* %175, %168, !dbg !177
  %179 = and i1 %177, %178, !dbg !177
  br i1 %179, label %217, label %180, !dbg !177

180:                                              ; preds = %173
  %181 = icmp ult i64 %169, 32, !dbg !177
  br i1 %181, label %203, label %182, !dbg !177

182:                                              ; preds = %180
  %183 = and i64 %169, -32, !dbg !177
  br label %184, !dbg !177

184:                                              ; preds = %184, %182
  %185 = phi i64 [ 0, %182 ], [ %196, %184 ], !dbg !178
  %186 = getelementptr inbounds i8, i8* %168, i64 %185, !dbg !178
  %187 = bitcast i8* %186 to <16 x i8>*, !dbg !179
  %188 = load <16 x i8>, <16 x i8>* %187, align 1, !dbg !179, !tbaa !180, !alias.scope !181
  %189 = getelementptr inbounds i8, i8* %186, i64 16, !dbg !179
  %190 = bitcast i8* %189 to <16 x i8>*, !dbg !179
  %191 = load <16 x i8>, <16 x i8>* %190, align 1, !dbg !179, !tbaa !180, !alias.scope !181
  %192 = getelementptr inbounds i8, i8* %167, i64 %185, !dbg !178
  %193 = bitcast i8* %192 to <16 x i8>*, !dbg !184
  store <16 x i8> %188, <16 x i8>* %193, align 1, !dbg !184, !tbaa !180, !alias.scope !185, !noalias !181
  %194 = getelementptr inbounds i8, i8* %192, i64 16, !dbg !184
  %195 = bitcast i8* %194 to <16 x i8>*, !dbg !184
  store <16 x i8> %191, <16 x i8>* %195, align 1, !dbg !184, !tbaa !180, !alias.scope !185, !noalias !181
  %196 = add nuw i64 %185, 32, !dbg !178
  %197 = icmp eq i64 %196, %183, !dbg !178
  br i1 %197, label %198, label %184, !dbg !178, !llvm.loop !187

198:                                              ; preds = %184
  %199 = icmp eq i64 %169, %183, !dbg !177
  br i1 %199, label %226, label %200, !dbg !177

200:                                              ; preds = %198
  %201 = and i64 %10, 6, !dbg !177
  %202 = icmp eq i64 %201, 0, !dbg !177
  br i1 %202, label %217, label %203, !dbg !177

203:                                              ; preds = %180, %200
  %204 = phi i64 [ %183, %200 ], [ 0, %180 ]
  %205 = and i64 %169, -8, !dbg !177
  br label %206, !dbg !177

206:                                              ; preds = %206, %203
  %207 = phi i64 [ %204, %203 ], [ %213, %206 ], !dbg !178
  %208 = getelementptr inbounds i8, i8* %168, i64 %207, !dbg !178
  %209 = bitcast i8* %208 to <8 x i8>*, !dbg !179
  %210 = load <8 x i8>, <8 x i8>* %209, align 1, !dbg !179, !tbaa !180
  %211 = getelementptr inbounds i8, i8* %167, i64 %207, !dbg !178
  %212 = bitcast i8* %211 to <8 x i8>*, !dbg !184
  store <8 x i8> %210, <8 x i8>* %212, align 1, !dbg !184, !tbaa !180
  %213 = add nuw i64 %207, 8, !dbg !178
  %214 = icmp eq i64 %213, %205, !dbg !178
  br i1 %214, label %215, label %206, !dbg !178, !llvm.loop !189

215:                                              ; preds = %206
  %216 = icmp eq i64 %169, %205, !dbg !177
  br i1 %216, label %226, label %217, !dbg !177

217:                                              ; preds = %173, %171, %200, %215
  %218 = phi i64 [ 0, %171 ], [ 0, %173 ], [ %183, %200 ], [ %205, %215 ]
  br label %219, !dbg !177

219:                                              ; preds = %217, %219
  %220 = phi i64 [ %224, %219 ], [ %218, %217 ]
  %221 = getelementptr inbounds i8, i8* %168, i64 %220, !dbg !179
  %222 = load i8, i8* %221, align 1, !dbg !179, !tbaa !180
  %223 = getelementptr inbounds i8, i8* %167, i64 %220, !dbg !190
  store i8 %222, i8* %223, align 1, !dbg !184, !tbaa !180
  %224 = add nuw i64 %220, 1, !dbg !178
  %225 = icmp eq i64 %224, %169, !dbg !175
  br i1 %225, label %226, label %219, !dbg !177, !llvm.loop !191

226:                                              ; preds = %219, %198, %215, %165
  %227 = icmp ult i64 %8, %144, !dbg !192
  %228 = select i1 %227, i64 %8, i64 %144, !dbg !193
  %229 = icmp ugt i64 %228, 4611686018427387903, !dbg !194
  br i1 %229, label %230, label %231, !dbg !196

230:                                              ; preds = %226
  tail call fastcc void @ink_fail() #11, !dbg !197
  unreachable

231:                                              ; preds = %226
  %232 = icmp eq i64 %228, 0, !dbg !198
  %233 = shl nuw i64 %228, 2, !dbg !199
  %234 = select i1 %232, i64 4, i64 %233, !dbg !199
  %235 = icmp ugt i64 %234, -17, !dbg !200
  br i1 %235, label %236, label %237, !dbg !201

236:                                              ; preds = %231
  tail call fastcc void @ink_fail() #11, !dbg !202
  unreachable

237:                                              ; preds = %231
  %238 = add nuw i64 %234, 16, !dbg !203
  %239 = tail call i8* @malloc(i64 %238) #12, !dbg !204
  %240 = icmp eq i8* %239, null, !dbg !205
  br i1 %240, label %241, label %242, !dbg !206

241:                                              ; preds = %237
  tail call fastcc void @ink_fail() #11, !dbg !207
  unreachable

242:                                              ; preds = %237
  %243 = bitcast i8* %239 to %struct.ink_block*, !dbg !204
  %244 = bitcast i8* %239 to i8**, !dbg !208
  store i8* %155, i8** %244, align 8, !dbg !208, !tbaa !24
  store i8* %239, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !209, !tbaa !18
  %245 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %243, i64 1, !dbg !210
  %246 = bitcast %struct.ink_block* %245 to i32*, !dbg !211
  br i1 %232, label %277, label %247, !dbg !212

247:                                              ; preds = %242
  %248 = icmp ult i64 %228, 4, !dbg !212
  br i1 %248, label %275, label %249, !dbg !212

249:                                              ; preds = %247
  %250 = and i64 %228, -4, !dbg !212
  %251 = insertelement <4 x i32> poison, i32 %3, i32 0, !dbg !212
  %252 = shufflevector <4 x i32> %251, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !212
  %253 = insertelement <4 x i32> poison, i32 %2, i32 0, !dbg !212
  %254 = shufflevector <4 x i32> %253, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !212
  br label %255, !dbg !212

255:                                              ; preds = %255, %249
  %256 = phi i64 [ 0, %249 ], [ %271, %255 ], !dbg !213
  %257 = getelementptr inbounds i32, i32* %29, i64 %256, !dbg !213
  %258 = bitcast i32* %257 to <4 x i32>*, !dbg !214
  %259 = load <4 x i32>, <4 x i32>* %258, align 4, !dbg !214, !tbaa !99
  %260 = getelementptr inbounds i32, i32* %162, i64 %256, !dbg !213
  %261 = bitcast i32* %260 to <4 x i32>*, !dbg !215
  %262 = load <4 x i32>, <4 x i32>* %261, align 4, !dbg !215, !tbaa !99
  %263 = icmp ult <4 x i32> %259, %262, !dbg !216
  %264 = mul <4 x i32> %262, %252, !dbg !217
  %265 = add <4 x i32> %264, %259, !dbg !217
  %266 = add <4 x i32> %259, %254, !dbg !217
  %267 = sub <4 x i32> %266, %262, !dbg !217
  %268 = select <4 x i1> %263, <4 x i32> %265, <4 x i32> %267, !dbg !217
  %269 = getelementptr inbounds i32, i32* %246, i64 %256, !dbg !213
  %270 = bitcast i32* %269 to <4 x i32>*, !dbg !218
  store <4 x i32> %268, <4 x i32>* %270, align 4, !dbg !218, !tbaa !99
  %271 = add nuw i64 %256, 4, !dbg !213
  %272 = icmp eq i64 %271, %250, !dbg !213
  br i1 %272, label %273, label %255, !dbg !213, !llvm.loop !219

273:                                              ; preds = %255
  %274 = icmp eq i64 %228, %250, !dbg !212
  br i1 %274, label %277, label %275, !dbg !212

275:                                              ; preds = %247, %273
  %276 = phi i64 [ 0, %247 ], [ %250, %273 ]
  br label %281, !dbg !212

277:                                              ; preds = %281, %273, %242
  %278 = ptrtoint %struct.ink_block* %245 to i64, !dbg !221
  %279 = insertvalue [2 x i64] undef, i64 %278, 0, !dbg !221
  %280 = insertvalue [2 x i64] %279, i64 %228, 1, !dbg !221
  ret [2 x i64] %280, !dbg !221

281:                                              ; preds = %275, %281
  %282 = phi i64 [ %294, %281 ], [ %276, %275 ]
  %283 = getelementptr inbounds i32, i32* %29, i64 %282, !dbg !214
  %284 = load i32, i32* %283, align 4, !dbg !214, !tbaa !99
  %285 = getelementptr inbounds i32, i32* %162, i64 %282, !dbg !215
  %286 = load i32, i32* %285, align 4, !dbg !215, !tbaa !99
  %287 = icmp ult i32 %284, %286, !dbg !216
  %288 = mul i32 %286, %3, !dbg !217
  %289 = add i32 %288, %284, !dbg !217
  %290 = add i32 %284, %2, !dbg !217
  %291 = sub i32 %290, %286, !dbg !217
  %292 = select i1 %287, i32 %289, i32 %291, !dbg !217
  %293 = getelementptr inbounds i32, i32* %246, i64 %282, !dbg !222
  store i32 %292, i32* %293, align 4, !dbg !218, !tbaa !99
  %294 = add nuw i64 %282, 1, !dbg !213
  %295 = icmp eq i64 %294, %228, !dbg !223
  br i1 %295, label %277, label %281, !dbg !212, !llvm.loop !224
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
define i64 @lang_fn_pipeline38_right_padded_zip_u32_into([2 x i64] %0, [2 x i64] %1, i32 %2, i32 %3, i32* nocapture %4) local_unnamed_addr #0 !dbg !239 {
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
  %30 = bitcast %struct.ink_block* %29 to i32*, !dbg !259
  %31 = sub i32 0, %2
  br i1 %15, label %69, label %32, !dbg !260

32:                                               ; preds = %26
  %33 = icmp ult i64 %9, 4, !dbg !260
  br i1 %33, label %67, label %34, !dbg !260

34:                                               ; preds = %32
  %35 = getelementptr i8, i8* %22, i64 16, !dbg !260
  %36 = add i64 %16, 16, !dbg !260
  %37 = getelementptr i8, i8* %22, i64 %36, !dbg !260
  %38 = getelementptr i32, i32* %7, i64 %9, !dbg !260
  %39 = bitcast i32* %38 to i8*, !dbg !260
  %40 = icmp ult i8* %35, %39, !dbg !260
  %41 = icmp ugt i8* %37, %8, !dbg !260
  %42 = and i1 %40, %41, !dbg !260
  br i1 %42, label %67, label %43, !dbg !260

43:                                               ; preds = %34
  %44 = and i64 %9, -4, !dbg !260
  %45 = insertelement <4 x i32> poison, i32 %2, i32 0, !dbg !260
  %46 = shufflevector <4 x i32> %45, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !260
  %47 = insertelement <4 x i32> poison, i32 %3, i32 0, !dbg !260
  %48 = shufflevector <4 x i32> %47, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !260
  %49 = insertelement <4 x i32> poison, i32 %31, i32 0, !dbg !260
  %50 = shufflevector <4 x i32> %49, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !260
  br label %51, !dbg !260

51:                                               ; preds = %51, %43
  %52 = phi i64 [ 0, %43 ], [ %62, %51 ], !dbg !261
  %53 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %43 ], [ %63, %51 ], !dbg !262
  %54 = getelementptr inbounds i32, i32* %7, i64 %52, !dbg !261
  %55 = bitcast i32* %54 to <4 x i32>*, !dbg !263
  %56 = load <4 x i32>, <4 x i32>* %55, align 4, !dbg !263, !tbaa !99, !alias.scope !264
  %57 = icmp ult <4 x i32> %53, %46, !dbg !267
  %58 = select <4 x i1> %57, <4 x i32> %48, <4 x i32> %50, !dbg !268
  %59 = add <4 x i32> %56, %58, !dbg !268
  %60 = getelementptr inbounds i32, i32* %30, i64 %52, !dbg !261
  %61 = bitcast i32* %60 to <4 x i32>*, !dbg !269
  store <4 x i32> %59, <4 x i32>* %61, align 4, !dbg !269, !tbaa !99, !alias.scope !270, !noalias !264
  %62 = add nuw i64 %52, 4, !dbg !261
  %63 = add <4 x i32> %53, <i32 4, i32 4, i32 4, i32 4>, !dbg !262
  %64 = icmp eq i64 %62, %44, !dbg !261
  br i1 %64, label %65, label %51, !dbg !261, !llvm.loop !272

65:                                               ; preds = %51
  %66 = icmp eq i64 %9, %44, !dbg !260
  br i1 %66, label %69, label %67, !dbg !260

67:                                               ; preds = %34, %32, %65
  %68 = phi i64 [ 0, %34 ], [ 0, %32 ], [ %44, %65 ]
  br label %116, !dbg !260

69:                                               ; preds = %116, %65, %26
  %70 = tail call i8* @malloc(i64 %21) #12, !dbg !274
  %71 = icmp eq i8* %70, null, !dbg !276
  br i1 %71, label %72, label %73, !dbg !277

72:                                               ; preds = %69
  tail call fastcc void @ink_fail() #11, !dbg !278
  unreachable

73:                                               ; preds = %69
  %74 = bitcast i8* %70 to %struct.ink_block*, !dbg !274
  %75 = bitcast i8* %70 to i8**, !dbg !279
  store i8* %22, i8** %75, align 8, !dbg !279, !tbaa !24
  store i8* %70, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !280, !tbaa !18
  %76 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %74, i64 1, !dbg !281
  %77 = bitcast %struct.ink_block* %76 to i8*, !dbg !282
  %78 = bitcast %struct.ink_block* %76 to i32*, !dbg !283
  br i1 %15, label %127, label %79, !dbg !284

79:                                               ; preds = %73
  %80 = icmp eq i64 %9, 1, !dbg !284
  br i1 %80, label %114, label %81, !dbg !284

81:                                               ; preds = %79
  %82 = getelementptr i8, i8* %70, i64 16, !dbg !284
  %83 = add i64 %16, 16, !dbg !284
  %84 = getelementptr i8, i8* %70, i64 %83, !dbg !284
  %85 = getelementptr i32, i32* %7, i64 %9, !dbg !284
  %86 = bitcast i32* %85 to i8*, !dbg !284
  %87 = icmp ult i8* %82, %86, !dbg !284
  %88 = icmp ugt i8* %84, %8, !dbg !284
  %89 = and i1 %87, %88, !dbg !284
  br i1 %89, label %114, label %90, !dbg !284

90:                                               ; preds = %81
  %91 = and i64 %9, -2, !dbg !284
  %92 = insertelement <2 x i32> poison, i32 %3, i32 0, !dbg !284
  %93 = shufflevector <2 x i32> %92, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !284
  %94 = insertelement <2 x i32> poison, i32 %2, i32 0, !dbg !284
  %95 = shufflevector <2 x i32> %94, <2 x i32> poison, <2 x i32> zeroinitializer, !dbg !284
  br label %96, !dbg !284

96:                                               ; preds = %96, %90
  %97 = phi i64 [ 0, %90 ], [ %109, %96 ], !dbg !285
  %98 = phi <2 x i32> [ <i32 0, i32 1>, %90 ], [ %110, %96 ], !dbg !286
  %99 = getelementptr inbounds i32, i32* %7, i64 %97, !dbg !285
  %100 = bitcast i32* %99 to <2 x i32>*, !dbg !287
  %101 = load <2 x i32>, <2 x i32>* %100, align 4, !dbg !287, !tbaa !99, !alias.scope !288
  %102 = urem <2 x i32> %98, <i32 3, i32 3>, !dbg !291
  %103 = icmp eq <2 x i32> %102, zeroinitializer, !dbg !292
  %104 = mul <2 x i32> %101, %93, !dbg !293
  %105 = add <2 x i32> %101, %95, !dbg !293
  %106 = select <2 x i1> %103, <2 x i32> %104, <2 x i32> %105, !dbg !293
  %107 = getelementptr inbounds i32, i32* %78, i64 %97, !dbg !285
  %108 = bitcast i32* %107 to <2 x i32>*, !dbg !294
  store <2 x i32> %106, <2 x i32>* %108, align 4, !dbg !294, !tbaa !99, !alias.scope !295, !noalias !288
  %109 = add nuw i64 %97, 2, !dbg !285
  %110 = add <2 x i32> %98, <i32 2, i32 2>, !dbg !286
  %111 = icmp eq i64 %109, %91, !dbg !285
  br i1 %111, label %112, label %96, !dbg !285, !llvm.loop !297

112:                                              ; preds = %96
  %113 = icmp eq i64 %9, %91, !dbg !284
  br i1 %113, label %127, label %114, !dbg !284

114:                                              ; preds = %81, %79, %112
  %115 = phi i64 [ 0, %81 ], [ 0, %79 ], [ %91, %112 ]
  br label %130, !dbg !284

116:                                              ; preds = %67, %116
  %117 = phi i64 [ %125, %116 ], [ %68, %67 ]
  %118 = trunc i64 %117 to i32, !dbg !262
  %119 = getelementptr inbounds i32, i32* %7, i64 %117, !dbg !263
  %120 = load i32, i32* %119, align 4, !dbg !263, !tbaa !99
  %121 = icmp ult i32 %118, %2, !dbg !267
  %122 = select i1 %121, i32 %3, i32 %31, !dbg !268
  %123 = add i32 %120, %122, !dbg !268
  %124 = getelementptr inbounds i32, i32* %30, i64 %117, !dbg !299
  store i32 %123, i32* %124, align 4, !dbg !269, !tbaa !99
  %125 = add nuw i64 %117, 1, !dbg !261
  %126 = icmp eq i64 %125, %9, !dbg !300
  br i1 %126, label %69, label %116, !dbg !260, !llvm.loop !301

127:                                              ; preds = %130, %112, %73
  %128 = xor i64 %11, -1, !dbg !302
  %129 = icmp ugt i64 %9, %128, !dbg !303
  br i1 %129, label %143, label %144, !dbg !304

130:                                              ; preds = %114, %130
  %131 = phi i64 [ %141, %130 ], [ %115, %114 ]
  %132 = getelementptr inbounds i32, i32* %7, i64 %131, !dbg !287
  %133 = load i32, i32* %132, align 4, !dbg !287, !tbaa !99
  %134 = trunc i64 %131 to i32, !dbg !286
  %135 = urem i32 %134, 3, !dbg !291
  %136 = icmp eq i32 %135, 0, !dbg !292
  %137 = mul i32 %133, %3, !dbg !293
  %138 = add i32 %133, %2, !dbg !293
  %139 = select i1 %136, i32 %137, i32 %138, !dbg !293
  %140 = getelementptr inbounds i32, i32* %78, i64 %131, !dbg !305
  store i32 %139, i32* %140, align 4, !dbg !294, !tbaa !99
  %141 = add nuw i64 %131, 1, !dbg !285
  %142 = icmp eq i64 %141, %9, !dbg !306
  br i1 %142, label %127, label %130, !dbg !284, !llvm.loop !307

143:                                              ; preds = %127
  tail call fastcc void @ink_fail(), !dbg !308
  unreachable

144:                                              ; preds = %127
  %145 = add i64 %11, %9, !dbg !309
  %146 = icmp ugt i64 %145, 4611686018427387903, !dbg !310
  br i1 %146, label %147, label %148, !dbg !312

147:                                              ; preds = %144
  tail call fastcc void @ink_fail() #11, !dbg !313
  unreachable

148:                                              ; preds = %144
  %149 = icmp eq i64 %145, 0, !dbg !314
  %150 = shl nuw i64 %145, 2, !dbg !315
  %151 = select i1 %149, i64 4, i64 %150, !dbg !315
  %152 = icmp ugt i64 %151, -17, !dbg !316
  br i1 %152, label %153, label %154, !dbg !317

153:                                              ; preds = %148
  tail call fastcc void @ink_fail() #11, !dbg !318
  unreachable

154:                                              ; preds = %148
  %155 = add nuw i64 %151, 16, !dbg !319
  %156 = tail call i8* @malloc(i64 %155) #12, !dbg !320
  %157 = icmp eq i8* %156, null, !dbg !321
  br i1 %157, label %158, label %159, !dbg !322

158:                                              ; preds = %154
  tail call fastcc void @ink_fail() #11, !dbg !323
  unreachable

159:                                              ; preds = %154
  %160 = bitcast i8* %156 to %struct.ink_block*, !dbg !320
  %161 = bitcast i8* %156 to i8**, !dbg !324
  store i8* %70, i8** %161, align 8, !dbg !324, !tbaa !24
  store i8* %156, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !325, !tbaa !18
  %162 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %160, i64 1, !dbg !326
  %163 = bitcast %struct.ink_block* %162 to i32*, !dbg !327
  br i1 %15, label %166, label %164, !dbg !328

164:                                              ; preds = %159
  %165 = bitcast %struct.ink_block* %162 to i8*, !dbg !330
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* nonnull align 1 %165, i8* nonnull align 1 %77, i64 %16, i1 false), !dbg !331
  br label %166, !dbg !332

166:                                              ; preds = %164, %159
  %167 = getelementptr inbounds i32, i32* %163, i64 %9, !dbg !332
  %168 = bitcast i32* %167 to i8*, !dbg !333
  %169 = inttoptr i64 %10 to i8*, !dbg !334
  %170 = shl i64 %11, 2, !dbg !335
  %171 = icmp eq i64 %170, 0, !dbg !336
  br i1 %171, label %227, label %172, !dbg !338

172:                                              ; preds = %166
  %173 = icmp ult i64 %170, 8, !dbg !338
  br i1 %173, label %218, label %174, !dbg !338

174:                                              ; preds = %172
  %175 = add i64 %150, 16, !dbg !338
  %176 = getelementptr i8, i8* %156, i64 %175, !dbg !338
  %177 = getelementptr i8, i8* %169, i64 %170, !dbg !338
  %178 = icmp ugt i8* %177, %168, !dbg !338
  %179 = icmp ugt i8* %176, %169, !dbg !338
  %180 = and i1 %178, %179, !dbg !338
  br i1 %180, label %218, label %181, !dbg !338

181:                                              ; preds = %174
  %182 = icmp ult i64 %170, 32, !dbg !338
  br i1 %182, label %204, label %183, !dbg !338

183:                                              ; preds = %181
  %184 = and i64 %170, -32, !dbg !338
  br label %185, !dbg !338

185:                                              ; preds = %185, %183
  %186 = phi i64 [ 0, %183 ], [ %197, %185 ], !dbg !339
  %187 = getelementptr inbounds i8, i8* %169, i64 %186, !dbg !339
  %188 = bitcast i8* %187 to <16 x i8>*, !dbg !340
  %189 = load <16 x i8>, <16 x i8>* %188, align 1, !dbg !340, !tbaa !180, !alias.scope !341
  %190 = getelementptr inbounds i8, i8* %187, i64 16, !dbg !340
  %191 = bitcast i8* %190 to <16 x i8>*, !dbg !340
  %192 = load <16 x i8>, <16 x i8>* %191, align 1, !dbg !340, !tbaa !180, !alias.scope !341
  %193 = getelementptr inbounds i8, i8* %168, i64 %186, !dbg !339
  %194 = bitcast i8* %193 to <16 x i8>*, !dbg !344
  store <16 x i8> %189, <16 x i8>* %194, align 1, !dbg !344, !tbaa !180, !alias.scope !345, !noalias !341
  %195 = getelementptr inbounds i8, i8* %193, i64 16, !dbg !344
  %196 = bitcast i8* %195 to <16 x i8>*, !dbg !344
  store <16 x i8> %192, <16 x i8>* %196, align 1, !dbg !344, !tbaa !180, !alias.scope !345, !noalias !341
  %197 = add nuw i64 %186, 32, !dbg !339
  %198 = icmp eq i64 %197, %184, !dbg !339
  br i1 %198, label %199, label %185, !dbg !339, !llvm.loop !347

199:                                              ; preds = %185
  %200 = icmp eq i64 %170, %184, !dbg !338
  br i1 %200, label %227, label %201, !dbg !338

201:                                              ; preds = %199
  %202 = and i64 %11, 6, !dbg !338
  %203 = icmp eq i64 %202, 0, !dbg !338
  br i1 %203, label %218, label %204, !dbg !338

204:                                              ; preds = %181, %201
  %205 = phi i64 [ %184, %201 ], [ 0, %181 ]
  %206 = and i64 %170, -8, !dbg !338
  br label %207, !dbg !338

207:                                              ; preds = %207, %204
  %208 = phi i64 [ %205, %204 ], [ %214, %207 ], !dbg !339
  %209 = getelementptr inbounds i8, i8* %169, i64 %208, !dbg !339
  %210 = bitcast i8* %209 to <8 x i8>*, !dbg !340
  %211 = load <8 x i8>, <8 x i8>* %210, align 1, !dbg !340, !tbaa !180
  %212 = getelementptr inbounds i8, i8* %168, i64 %208, !dbg !339
  %213 = bitcast i8* %212 to <8 x i8>*, !dbg !344
  store <8 x i8> %211, <8 x i8>* %213, align 1, !dbg !344, !tbaa !180
  %214 = add nuw i64 %208, 8, !dbg !339
  %215 = icmp eq i64 %214, %206, !dbg !339
  br i1 %215, label %216, label %207, !dbg !339, !llvm.loop !349

216:                                              ; preds = %207
  %217 = icmp eq i64 %170, %206, !dbg !338
  br i1 %217, label %227, label %218, !dbg !338

218:                                              ; preds = %174, %172, %201, %216
  %219 = phi i64 [ 0, %172 ], [ 0, %174 ], [ %184, %201 ], [ %206, %216 ]
  br label %220, !dbg !338

220:                                              ; preds = %218, %220
  %221 = phi i64 [ %225, %220 ], [ %219, %218 ]
  %222 = getelementptr inbounds i8, i8* %169, i64 %221, !dbg !340
  %223 = load i8, i8* %222, align 1, !dbg !340, !tbaa !180
  %224 = getelementptr inbounds i8, i8* %168, i64 %221, !dbg !350
  store i8 %223, i8* %224, align 1, !dbg !344, !tbaa !180
  %225 = add nuw i64 %221, 1, !dbg !339
  %226 = icmp eq i64 %225, %170, !dbg !336
  br i1 %226, label %227, label %220, !dbg !338, !llvm.loop !351

227:                                              ; preds = %220, %199, %216, %166
  %228 = icmp ult i64 %9, %145, !dbg !352
  %229 = select i1 %228, i64 %9, i64 %145, !dbg !353
  %230 = icmp eq i64 %229, 0, !dbg !354
  br i1 %230, label %261, label %231, !dbg !355

231:                                              ; preds = %227
  %232 = icmp ult i64 %229, 4, !dbg !355
  br i1 %232, label %259, label %233, !dbg !355

233:                                              ; preds = %231
  %234 = and i64 %229, -4, !dbg !355
  %235 = insertelement <4 x i32> poison, i32 %3, i32 0, !dbg !355
  %236 = shufflevector <4 x i32> %235, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !355
  %237 = insertelement <4 x i32> poison, i32 %2, i32 0, !dbg !355
  %238 = shufflevector <4 x i32> %237, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !355
  br label %239, !dbg !355

239:                                              ; preds = %239, %233
  %240 = phi i64 [ 0, %233 ], [ %255, %239 ], !dbg !356
  %241 = getelementptr inbounds i32, i32* %30, i64 %240, !dbg !356
  %242 = bitcast i32* %241 to <4 x i32>*, !dbg !357
  %243 = load <4 x i32>, <4 x i32>* %242, align 4, !dbg !357, !tbaa !99
  %244 = getelementptr inbounds i32, i32* %163, i64 %240, !dbg !356
  %245 = bitcast i32* %244 to <4 x i32>*, !dbg !358
  %246 = load <4 x i32>, <4 x i32>* %245, align 4, !dbg !358, !tbaa !99
  %247 = icmp ult <4 x i32> %243, %246, !dbg !359
  %248 = mul <4 x i32> %246, %236, !dbg !360
  %249 = add <4 x i32> %248, %243, !dbg !360
  %250 = add <4 x i32> %243, %238, !dbg !360
  %251 = sub <4 x i32> %250, %246, !dbg !360
  %252 = select <4 x i1> %247, <4 x i32> %249, <4 x i32> %251, !dbg !360
  %253 = getelementptr inbounds i32, i32* %4, i64 %240, !dbg !356
  %254 = bitcast i32* %253 to <4 x i32>*, !dbg !361
  store <4 x i32> %252, <4 x i32>* %254, align 4, !dbg !361, !tbaa !99
  %255 = add nuw i64 %240, 4, !dbg !356
  %256 = icmp eq i64 %255, %234, !dbg !356
  br i1 %256, label %257, label %239, !dbg !356, !llvm.loop !362

257:                                              ; preds = %239
  %258 = icmp eq i64 %229, %234, !dbg !355
  br i1 %258, label %261, label %259, !dbg !355

259:                                              ; preds = %231, %257
  %260 = phi i64 [ 0, %231 ], [ %234, %257 ]
  br label %262, !dbg !355

261:                                              ; preds = %262, %257, %227
  ret i64 %229, !dbg !364

262:                                              ; preds = %259, %262
  %263 = phi i64 [ %275, %262 ], [ %260, %259 ]
  %264 = getelementptr inbounds i32, i32* %30, i64 %263, !dbg !357
  %265 = load i32, i32* %264, align 4, !dbg !357, !tbaa !99
  %266 = getelementptr inbounds i32, i32* %163, i64 %263, !dbg !358
  %267 = load i32, i32* %266, align 4, !dbg !358, !tbaa !99
  %268 = icmp ult i32 %265, %267, !dbg !359
  %269 = mul i32 %267, %3, !dbg !360
  %270 = add i32 %269, %265, !dbg !360
  %271 = add i32 %265, %2, !dbg !360
  %272 = sub i32 %271, %267, !dbg !360
  %273 = select i1 %268, i32 %270, i32 %272, !dbg !360
  %274 = getelementptr inbounds i32, i32* %4, i64 %263, !dbg !365
  store i32 %273, i32* %274, align 4, !dbg !361, !tbaa !99
  %275 = add nuw i64 %263, 1, !dbg !356
  %276 = icmp eq i64 %275, %229, !dbg !354
  br i1 %276, label %261, label %262, !dbg !355, !llvm.loop !366
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
  %30 = tail call i64 @lang_fn_pipeline38_right_padded_zip_u32_into([2 x i64] %26, [2 x i64] %29, i32 %15, i32 %19, i32* %23), !dbg !382
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
  %29 = tail call [2 x i64] @lang_fn_pipeline38_right_padded_zip_u32([2 x i64] %25, [2 x i64] %28, i32 %15, i32 %19), !dbg !397
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
  store i32 %57, i32* %61, align 4, !dbg !427, !tbaa !99
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
  store i32 %88, i32* %92, align 4, !dbg !457, !tbaa !99
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
  store i32 %120, i32* %124, align 4, !dbg !486, !tbaa !99
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
!106 = !DILocation(line: 112, column: 12, scope: !74)
!107 = !{!108}
!108 = distinct !{!108, !103}
!109 = distinct !{!109, !95, !110, !32, !111}
!110 = !DILocation(line: 113, column: 1, scope: !74)
!111 = !{!"llvm.loop.isvectorized", i32 1}
!112 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !113)
!113 = distinct !DILocation(line: 118, column: 19, scope: !74)
!114 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !113)
!115 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !113)
!116 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !113)
!117 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !113)
!118 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !113)
!119 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !113)
!120 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !113)
!121 = !DILocation(line: 118, column: 19, scope: !74)
!122 = !DILocation(line: 119, column: 1, scope: !74)
!123 = !DILocation(line: 119, column: 33, scope: !74)
!124 = !DILocation(line: 120, column: 14, scope: !74)
!125 = !DILocation(line: 122, column: 14, scope: !74)
!126 = !{!127}
!127 = distinct !{!127, !128}
!128 = distinct !{!128, !"LVerDomain"}
!129 = !DILocation(line: 136, column: 18, scope: !74)
!130 = !DILocation(line: 140, column: 10, scope: !74)
!131 = !DILocation(line: 140, column: 5, scope: !74)
!132 = !DILocation(line: 149, column: 14, scope: !74)
!133 = !{!134}
!134 = distinct !{!134, !128}
!135 = distinct !{!135, !122, !136, !32, !111}
!136 = !DILocation(line: 150, column: 1, scope: !74)
!137 = !DILocation(line: 112, column: 1, scope: !74)
!138 = !DILocation(line: 90, column: 19, scope: !74)
!139 = distinct !{!139, !95, !110, !32, !111}
!140 = !DILocation(line: 155, column: 20, scope: !74)
!141 = !DILocation(line: 155, column: 11, scope: !74)
!142 = !DILocation(line: 155, column: 4, scope: !74)
!143 = !DILocation(line: 149, column: 1, scope: !74)
!144 = !DILocation(line: 119, column: 21, scope: !74)
!145 = distinct !{!145, !122, !136, !32, !111}
!146 = !DILocation(line: 155, column: 30, scope: !74)
!147 = !DILocation(line: 156, column: 19, scope: !74)
!148 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !149)
!149 = distinct !DILocation(line: 157, column: 19, scope: !74)
!150 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !149)
!151 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !149)
!152 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !149)
!153 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !149)
!154 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !149)
!155 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !149)
!156 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !149)
!157 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !149)
!158 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !149)
!159 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !149)
!160 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !149)
!161 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !149)
!162 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !149)
!163 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !149)
!164 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !149)
!165 = !DILocation(line: 157, column: 19, scope: !74)
!166 = !DILocation(line: 37, column: 138, scope: !167, inlinedAt: !168)
!167 = distinct !DISubprogram(name: "ink_copy", scope: !14, file: !14, line: 37, type: !15, scopeLine: 37, flags: DIFlagPrototyped, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!168 = distinct !DILocation(line: 158, column: 1, scope: !74)
!169 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !149)
!170 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !168)
!171 = !DILocation(line: 159, column: 18, scope: !74)
!172 = !DILocation(line: 159, column: 10, scope: !74)
!173 = !DILocation(line: 159, column: 27, scope: !74)
!174 = !DILocation(line: 159, column: 43, scope: !74)
!175 = !DILocation(line: 37, column: 154, scope: !167, inlinedAt: !176)
!176 = distinct !DILocation(line: 159, column: 1, scope: !74)
!177 = !DILocation(line: 37, column: 138, scope: !167, inlinedAt: !176)
!178 = !DILocation(line: 37, column: 162, scope: !167, inlinedAt: !176)
!179 = !DILocation(line: 37, column: 172, scope: !167, inlinedAt: !176)
!180 = !{!20, !20, i64 0}
!181 = !{!182}
!182 = distinct !{!182, !183}
!183 = distinct !{!183, !"LVerDomain"}
!184 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !176)
!185 = !{!186}
!186 = distinct !{!186, !183}
!187 = distinct !{!187, !177, !188, !32, !111}
!188 = !DILocation(line: 37, column: 177, scope: !167, inlinedAt: !176)
!189 = distinct !{!189, !177, !188, !32, !111}
!190 = !DILocation(line: 37, column: 165, scope: !167, inlinedAt: !176)
!191 = distinct !{!191, !177, !188, !32, !111}
!192 = !DILocation(line: 162, column: 38, scope: !74)
!193 = !DILocation(line: 162, column: 30, scope: !74)
!194 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !195)
!195 = distinct !DILocation(line: 162, column: 19, scope: !74)
!196 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !195)
!197 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !195)
!198 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !195)
!199 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !195)
!200 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !195)
!201 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !195)
!202 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !195)
!203 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !195)
!204 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !195)
!205 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !195)
!206 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !195)
!207 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !195)
!208 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !195)
!209 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !195)
!210 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !195)
!211 = !DILocation(line: 162, column: 19, scope: !74)
!212 = !DILocation(line: 163, column: 1, scope: !74)
!213 = !DILocation(line: 163, column: 65, scope: !74)
!214 = !DILocation(line: 164, column: 14, scope: !74)
!215 = !DILocation(line: 166, column: 14, scope: !74)
!216 = !DILocation(line: 176, column: 10, scope: !74)
!217 = !DILocation(line: 176, column: 5, scope: !74)
!218 = !DILocation(line: 189, column: 14, scope: !74)
!219 = distinct !{!219, !212, !220, !32, !111}
!220 = !DILocation(line: 190, column: 1, scope: !74)
!221 = !DILocation(line: 192, column: 1, scope: !74)
!222 = !DILocation(line: 189, column: 1, scope: !74)
!223 = !DILocation(line: 163, column: 21, scope: !74)
!224 = distinct !{!224, !212, !220, !32, !225, !111}
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
!239 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_u32_into", scope: !14, file: !14, line: 262, type: !15, scopeLine: 262, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
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
!259 = !DILocation(line: 269, column: 18, scope: !239)
!260 = !DILocation(line: 270, column: 1, scope: !239)
!261 = !DILocation(line: 270, column: 29, scope: !239)
!262 = !DILocation(line: 271, column: 13, scope: !239)
!263 = !DILocation(line: 273, column: 13, scope: !239)
!264 = !{!265}
!265 = distinct !{!265, !266}
!266 = distinct !{!266, !"LVerDomain"}
!267 = !DILocation(line: 283, column: 9, scope: !239)
!268 = !DILocation(line: 283, column: 5, scope: !239)
!269 = !DILocation(line: 292, column: 12, scope: !239)
!270 = !{!271}
!271 = distinct !{!271, !266}
!272 = distinct !{!272, !260, !273, !32, !111}
!273 = !DILocation(line: 293, column: 1, scope: !239)
!274 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !275)
!275 = distinct !DILocation(line: 298, column: 19, scope: !239)
!276 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !275)
!277 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !275)
!278 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !275)
!279 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !275)
!280 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !275)
!281 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !275)
!282 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !275)
!283 = !DILocation(line: 298, column: 19, scope: !239)
!284 = !DILocation(line: 299, column: 1, scope: !239)
!285 = !DILocation(line: 299, column: 33, scope: !239)
!286 = !DILocation(line: 300, column: 14, scope: !239)
!287 = !DILocation(line: 302, column: 14, scope: !239)
!288 = !{!289}
!289 = distinct !{!289, !290}
!290 = distinct !{!290, !"LVerDomain"}
!291 = !DILocation(line: 316, column: 18, scope: !239)
!292 = !DILocation(line: 320, column: 10, scope: !239)
!293 = !DILocation(line: 320, column: 5, scope: !239)
!294 = !DILocation(line: 329, column: 14, scope: !239)
!295 = !{!296}
!296 = distinct !{!296, !290}
!297 = distinct !{!297, !284, !298, !32, !111}
!298 = !DILocation(line: 330, column: 1, scope: !239)
!299 = !DILocation(line: 292, column: 1, scope: !239)
!300 = !DILocation(line: 270, column: 19, scope: !239)
!301 = distinct !{!301, !260, !273, !32, !111}
!302 = !DILocation(line: 335, column: 20, scope: !239)
!303 = !DILocation(line: 335, column: 11, scope: !239)
!304 = !DILocation(line: 335, column: 4, scope: !239)
!305 = !DILocation(line: 329, column: 1, scope: !239)
!306 = !DILocation(line: 299, column: 21, scope: !239)
!307 = distinct !{!307, !284, !298, !32, !111}
!308 = !DILocation(line: 335, column: 30, scope: !239)
!309 = !DILocation(line: 336, column: 19, scope: !239)
!310 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !311)
!311 = distinct !DILocation(line: 337, column: 19, scope: !239)
!312 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !311)
!313 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !311)
!314 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !311)
!315 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !311)
!316 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !311)
!317 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !311)
!318 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !311)
!319 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !311)
!320 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !311)
!321 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !311)
!322 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !311)
!323 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !311)
!324 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !311)
!325 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !311)
!326 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !311)
!327 = !DILocation(line: 337, column: 19, scope: !239)
!328 = !DILocation(line: 37, column: 138, scope: !167, inlinedAt: !329)
!329 = distinct !DILocation(line: 338, column: 1, scope: !239)
!330 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !311)
!331 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !329)
!332 = !DILocation(line: 339, column: 18, scope: !239)
!333 = !DILocation(line: 339, column: 10, scope: !239)
!334 = !DILocation(line: 339, column: 27, scope: !239)
!335 = !DILocation(line: 339, column: 43, scope: !239)
!336 = !DILocation(line: 37, column: 154, scope: !167, inlinedAt: !337)
!337 = distinct !DILocation(line: 339, column: 1, scope: !239)
!338 = !DILocation(line: 37, column: 138, scope: !167, inlinedAt: !337)
!339 = !DILocation(line: 37, column: 162, scope: !167, inlinedAt: !337)
!340 = !DILocation(line: 37, column: 172, scope: !167, inlinedAt: !337)
!341 = !{!342}
!342 = distinct !{!342, !343}
!343 = distinct !{!343, !"LVerDomain"}
!344 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !337)
!345 = !{!346}
!346 = distinct !{!346, !343}
!347 = distinct !{!347, !338, !348, !32, !111}
!348 = !DILocation(line: 37, column: 177, scope: !167, inlinedAt: !337)
!349 = distinct !{!349, !338, !348, !32, !111}
!350 = !DILocation(line: 37, column: 165, scope: !167, inlinedAt: !337)
!351 = distinct !{!351, !338, !348, !32, !111}
!352 = !DILocation(line: 342, column: 40, scope: !239)
!353 = !DILocation(line: 342, column: 32, scope: !239)
!354 = !DILocation(line: 343, column: 21, scope: !239)
!355 = !DILocation(line: 343, column: 1, scope: !239)
!356 = !DILocation(line: 343, column: 65, scope: !239)
!357 = !DILocation(line: 344, column: 14, scope: !239)
!358 = !DILocation(line: 346, column: 14, scope: !239)
!359 = !DILocation(line: 356, column: 10, scope: !239)
!360 = !DILocation(line: 356, column: 5, scope: !239)
!361 = !DILocation(line: 369, column: 14, scope: !239)
!362 = distinct !{!362, !355, !363, !32, !111}
!363 = !DILocation(line: 370, column: 1, scope: !239)
!364 = !DILocation(line: 371, column: 1, scope: !239)
!365 = !DILocation(line: 369, column: 1, scope: !239)
!366 = distinct !{!366, !355, !363, !32, !225, !111}
!367 = distinct !DISubprogram(name: "ink_compute_into", scope: !14, file: !14, line: 373, type: !15, scopeLine: 373, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!368 = !DILocation(line: 373, column: 151, scope: !367)
!369 = !DILocation(line: 374, column: 34, scope: !367)
!370 = !DILocation(line: 374, column: 67, scope: !367)
!371 = !DILocation(line: 374, column: 100, scope: !367)
!372 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !373)
!373 = distinct !DILocation(line: 374, column: 87, scope: !367)
!374 = !DILocation(line: 374, column: 145, scope: !367)
!375 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !376)
!376 = distinct !DILocation(line: 374, column: 132, scope: !367)
!377 = !DILocation(line: 374, column: 235, scope: !367)
!378 = !{!379, !379, i64 0}
!379 = !{!"long", !20, i64 0}
!380 = !DILocation(line: 374, column: 265, scope: !367)
!381 = !DILocation(line: 374, column: 283, scope: !367)
!382 = !DILocation(line: 374, column: 172, scope: !367)
!383 = !DILocation(line: 375, column: 30, scope: !367)
!384 = !DILocation(line: 375, column: 9, scope: !367)
!385 = distinct !DISubprogram(name: "ink_compute_call", scope: !14, file: !14, line: 376, type: !15, scopeLine: 376, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!386 = !DILocation(line: 376, column: 142, scope: !385)
!387 = !DILocation(line: 377, column: 34, scope: !385)
!388 = !DILocation(line: 377, column: 67, scope: !385)
!389 = !DILocation(line: 377, column: 100, scope: !385)
!390 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !391)
!391 = distinct !DILocation(line: 377, column: 87, scope: !385)
!392 = !DILocation(line: 377, column: 145, scope: !385)
!393 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !394)
!394 = distinct !DILocation(line: 377, column: 132, scope: !385)
!395 = !DILocation(line: 377, column: 243, scope: !385)
!396 = !DILocation(line: 377, column: 273, scope: !385)
!397 = !DILocation(line: 377, column: 185, scope: !385)
!398 = !DILocation(line: 377, column: 300, scope: !385)
!399 = !DILocation(line: 377, column: 299, scope: !385)
!400 = !DILocation(line: 377, column: 318, scope: !385)
!401 = !DILocation(line: 378, column: 34, scope: !385)
!402 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !403)
!403 = distinct !DILocation(line: 378, column: 21, scope: !385)
!404 = !DILocation(line: 378, column: 79, scope: !385)
!405 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !406)
!406 = distinct !DILocation(line: 378, column: 66, scope: !385)
!407 = !DILocation(line: 378, column: 124, scope: !385)
!408 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !409)
!409 = distinct !DILocation(line: 378, column: 111, scope: !385)
!410 = !DILocation(line: 378, column: 169, scope: !385)
!411 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !412)
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
!431 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !432)
!432 = distinct !DILocation(line: 379, column: 21, scope: !385)
!433 = !DILocation(line: 379, column: 79, scope: !385)
!434 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !435)
!435 = distinct !DILocation(line: 379, column: 66, scope: !385)
!436 = !DILocation(line: 379, column: 124, scope: !385)
!437 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !438)
!438 = distinct !DILocation(line: 379, column: 111, scope: !385)
!439 = !DILocation(line: 379, column: 169, scope: !385)
!440 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !441)
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
!461 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !462)
!462 = distinct !DILocation(line: 380, column: 21, scope: !385)
!463 = !DILocation(line: 380, column: 79, scope: !385)
!464 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !465)
!465 = distinct !DILocation(line: 380, column: 66, scope: !385)
!466 = !DILocation(line: 380, column: 124, scope: !385)
!467 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !468)
!468 = distinct !DILocation(line: 380, column: 111, scope: !385)
!469 = !DILocation(line: 380, column: 169, scope: !385)
!470 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !471)
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
!494 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !495)
!495 = distinct !DILocation(line: 383, column: 21, scope: !491)
!496 = !DILocation(line: 383, column: 79, scope: !491)
!497 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !498)
!498 = distinct !DILocation(line: 383, column: 66, scope: !491)
!499 = !DILocation(line: 383, column: 124, scope: !491)
!500 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !501)
!501 = distinct !DILocation(line: 383, column: 111, scope: !491)
!502 = !DILocation(line: 383, column: 169, scope: !491)
!503 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !504)
!504 = distinct !DILocation(line: 383, column: 156, scope: !491)
!505 = !DILocation(line: 201, column: 9, scope: !226, inlinedAt: !506)
!506 = distinct !DILocation(line: 383, column: 205, scope: !491)
!507 = !DILocation(line: 201, column: 5, scope: !226, inlinedAt: !506)
!508 = !DILocation(line: 384, column: 34, scope: !491)
!509 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !510)
!510 = distinct !DILocation(line: 384, column: 21, scope: !491)
!511 = !DILocation(line: 384, column: 79, scope: !491)
!512 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !513)
!513 = distinct !DILocation(line: 384, column: 66, scope: !491)
!514 = !DILocation(line: 384, column: 124, scope: !491)
!515 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !516)
!516 = distinct !DILocation(line: 384, column: 111, scope: !491)
!517 = !DILocation(line: 384, column: 169, scope: !491)
!518 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !519)
!519 = distinct !DILocation(line: 384, column: 156, scope: !491)
!520 = !DILocation(line: 224, column: 16, scope: !230, inlinedAt: !521)
!521 = distinct !DILocation(line: 384, column: 205, scope: !491)
!522 = !DILocation(line: 228, column: 9, scope: !230, inlinedAt: !521)
!523 = !DILocation(line: 228, column: 5, scope: !230, inlinedAt: !521)
!524 = !DILocation(line: 385, column: 34, scope: !491)
!525 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !526)
!526 = distinct !DILocation(line: 385, column: 21, scope: !491)
!527 = !DILocation(line: 385, column: 79, scope: !491)
!528 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !529)
!529 = distinct !DILocation(line: 385, column: 66, scope: !491)
!530 = !DILocation(line: 385, column: 124, scope: !491)
!531 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !532)
!532 = distinct !DILocation(line: 385, column: 111, scope: !491)
!533 = !DILocation(line: 385, column: 169, scope: !491)
!534 = !DILocation(line: 37, column: 171, scope: !167, inlinedAt: !535)
!535 = distinct !DILocation(line: 385, column: 156, scope: !491)
!536 = !DILocation(line: 247, column: 9, scope: !235, inlinedAt: !537)
!537 = distinct !DILocation(line: 385, column: 205, scope: !491)
!538 = !DILocation(line: 247, column: 5, scope: !235, inlinedAt: !537)
!539 = !DILocation(line: 386, column: 9, scope: !491)
!540 = !DILocation(line: 0, scope: !491)
!541 = !DILocation(line: 386, column: 30, scope: !491)
!542 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !14, file: !14, line: 387, type: !15, scopeLine: 387, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!543 = !DILocation(line: 388, column: 9, scope: !542)
