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
  br i1 %14, label %56, label %31, !dbg !96

31:                                               ; preds = %25
  %32 = icmp eq i32 %3, 0
  br i1 %32, label %33, label %59, !dbg !96

33:                                               ; preds = %31
  %34 = icmp ult i64 %8, 8, !dbg !96
  br i1 %34, label %49, label %35, !dbg !96

35:                                               ; preds = %33
  %36 = and i64 %8, -8, !dbg !96
  %37 = insertelement <4 x i32> poison, i32 %2, i32 0, !dbg !96
  %38 = shufflevector <4 x i32> %37, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !96
  br label %39, !dbg !96

39:                                               ; preds = %39, %35
  %40 = phi i64 [ 0, %35 ], [ %45, %39 ], !dbg !97
  %41 = getelementptr inbounds i32, i32* %30, i64 %40, !dbg !97
  %42 = bitcast i32* %41 to <4 x i32>*, !dbg !98
  store <4 x i32> %38, <4 x i32>* %42, align 4, !dbg !98, !tbaa !99
  %43 = getelementptr inbounds i32, i32* %41, i64 4, !dbg !98
  %44 = bitcast i32* %43 to <4 x i32>*, !dbg !98
  store <4 x i32> %38, <4 x i32>* %44, align 4, !dbg !98, !tbaa !99
  %45 = add nuw i64 %40, 8, !dbg !97
  %46 = icmp eq i64 %45, %36, !dbg !97
  br i1 %46, label %47, label %39, !dbg !97, !llvm.loop !101

47:                                               ; preds = %39
  %48 = icmp eq i64 %8, %36, !dbg !96
  br i1 %48, label %56, label %49, !dbg !96

49:                                               ; preds = %33, %47
  %50 = phi i64 [ 0, %33 ], [ %36, %47 ]
  br label %51, !dbg !96

51:                                               ; preds = %49, %51
  %52 = phi i64 [ %54, %51 ], [ %50, %49 ]
  %53 = getelementptr inbounds i32, i32* %30, i64 %52, !dbg !104
  store i32 %2, i32* %53, align 4, !dbg !98, !tbaa !99
  %54 = add nuw i64 %52, 1, !dbg !97
  %55 = icmp eq i64 %54, %8, !dbg !105
  br i1 %55, label %56, label %51, !dbg !96, !llvm.loop !106

56:                                               ; preds = %59, %51, %47, %25
  %57 = xor i64 %10, -1, !dbg !108
  %58 = icmp ugt i64 %8, %57, !dbg !109
  br i1 %58, label %71, label %72, !dbg !110

59:                                               ; preds = %31, %59
  %60 = phi i64 [ %69, %59 ], [ 0, %31 ]
  %61 = trunc i64 %60 to i32, !dbg !111
  %62 = getelementptr inbounds i32, i32* %6, i64 %60, !dbg !112
  %63 = load i32, i32* %62, align 4, !dbg !112, !tbaa !99
  %64 = udiv i32 %63, %3, !dbg !113
  %65 = urem i32 %61, %3, !dbg !114
  %66 = add i32 %64, %2, !dbg !115
  %67 = add i32 %66, %65, !dbg !116
  %68 = getelementptr inbounds i32, i32* %30, i64 %60, !dbg !104
  store i32 %67, i32* %68, align 4, !dbg !98, !tbaa !99
  %69 = add nuw i64 %60, 1, !dbg !97
  %70 = icmp eq i64 %69, %8, !dbg !105
  br i1 %70, label %56, label %59, !dbg !96, !llvm.loop !117

71:                                               ; preds = %56
  tail call fastcc void @ink_fail(), !dbg !118
  unreachable

72:                                               ; preds = %56
  %73 = add i64 %10, %8, !dbg !119
  %74 = icmp ugt i64 %73, 4611686018427387903, !dbg !120
  br i1 %74, label %75, label %76, !dbg !122

75:                                               ; preds = %72
  tail call fastcc void @ink_fail() #11, !dbg !123
  unreachable

76:                                               ; preds = %72
  %77 = icmp eq i64 %73, 0, !dbg !124
  %78 = shl nuw i64 %73, 2, !dbg !125
  %79 = select i1 %77, i64 4, i64 %78, !dbg !125
  %80 = icmp ugt i64 %79, -17, !dbg !126
  br i1 %80, label %81, label %82, !dbg !127

81:                                               ; preds = %76
  tail call fastcc void @ink_fail() #11, !dbg !128
  unreachable

82:                                               ; preds = %76
  %83 = add nuw i64 %79, 16, !dbg !129
  %84 = tail call i8* @malloc(i64 %83) #12, !dbg !130
  %85 = icmp eq i8* %84, null, !dbg !131
  br i1 %85, label %86, label %87, !dbg !132

86:                                               ; preds = %82
  tail call fastcc void @ink_fail() #11, !dbg !133
  unreachable

87:                                               ; preds = %82
  %88 = bitcast i8* %84 to %struct.ink_block*, !dbg !130
  %89 = bitcast i8* %84 to i8**, !dbg !134
  store i8* %21, i8** %89, align 8, !dbg !134, !tbaa !24
  store i8* %84, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !135, !tbaa !18
  %90 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %88, i64 1, !dbg !136
  %91 = bitcast %struct.ink_block* %90 to i32*, !dbg !137
  br i1 %14, label %94, label %92, !dbg !138

92:                                               ; preds = %87
  %93 = bitcast %struct.ink_block* %90 to i8*, !dbg !141
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* nonnull align 1 %93, i8* nonnull align 1 %29, i64 %15, i1 false), !dbg !142
  br label %94, !dbg !143

94:                                               ; preds = %92, %87
  %95 = getelementptr inbounds i32, i32* %91, i64 %8, !dbg !143
  %96 = bitcast i32* %95 to i8*, !dbg !144
  %97 = inttoptr i64 %9 to i8*, !dbg !145
  %98 = shl i64 %10, 2, !dbg !146
  %99 = icmp eq i64 %98, 0, !dbg !147
  br i1 %99, label %155, label %100, !dbg !149

100:                                              ; preds = %94
  %101 = icmp ult i64 %98, 8, !dbg !149
  br i1 %101, label %146, label %102, !dbg !149

102:                                              ; preds = %100
  %103 = add i64 %78, 16, !dbg !149
  %104 = getelementptr i8, i8* %84, i64 %103, !dbg !149
  %105 = getelementptr i8, i8* %97, i64 %98, !dbg !149
  %106 = icmp ugt i8* %105, %96, !dbg !149
  %107 = icmp ugt i8* %104, %97, !dbg !149
  %108 = and i1 %106, %107, !dbg !149
  br i1 %108, label %146, label %109, !dbg !149

109:                                              ; preds = %102
  %110 = icmp ult i64 %98, 32, !dbg !149
  br i1 %110, label %132, label %111, !dbg !149

111:                                              ; preds = %109
  %112 = and i64 %98, -32, !dbg !149
  br label %113, !dbg !149

113:                                              ; preds = %113, %111
  %114 = phi i64 [ 0, %111 ], [ %125, %113 ], !dbg !150
  %115 = getelementptr inbounds i8, i8* %97, i64 %114, !dbg !150
  %116 = bitcast i8* %115 to <16 x i8>*, !dbg !151
  %117 = load <16 x i8>, <16 x i8>* %116, align 1, !dbg !151, !tbaa !152, !alias.scope !153
  %118 = getelementptr inbounds i8, i8* %115, i64 16, !dbg !151
  %119 = bitcast i8* %118 to <16 x i8>*, !dbg !151
  %120 = load <16 x i8>, <16 x i8>* %119, align 1, !dbg !151, !tbaa !152, !alias.scope !153
  %121 = getelementptr inbounds i8, i8* %96, i64 %114, !dbg !150
  %122 = bitcast i8* %121 to <16 x i8>*, !dbg !156
  store <16 x i8> %117, <16 x i8>* %122, align 1, !dbg !156, !tbaa !152, !alias.scope !157, !noalias !153
  %123 = getelementptr inbounds i8, i8* %121, i64 16, !dbg !156
  %124 = bitcast i8* %123 to <16 x i8>*, !dbg !156
  store <16 x i8> %120, <16 x i8>* %124, align 1, !dbg !156, !tbaa !152, !alias.scope !157, !noalias !153
  %125 = add nuw i64 %114, 32, !dbg !150
  %126 = icmp eq i64 %125, %112, !dbg !150
  br i1 %126, label %127, label %113, !dbg !150, !llvm.loop !159

127:                                              ; preds = %113
  %128 = icmp eq i64 %98, %112, !dbg !149
  br i1 %128, label %155, label %129, !dbg !149

129:                                              ; preds = %127
  %130 = and i64 %10, 6, !dbg !149
  %131 = icmp eq i64 %130, 0, !dbg !149
  br i1 %131, label %146, label %132, !dbg !149

132:                                              ; preds = %109, %129
  %133 = phi i64 [ %112, %129 ], [ 0, %109 ]
  %134 = and i64 %98, -8, !dbg !149
  br label %135, !dbg !149

135:                                              ; preds = %135, %132
  %136 = phi i64 [ %133, %132 ], [ %142, %135 ], !dbg !150
  %137 = getelementptr inbounds i8, i8* %97, i64 %136, !dbg !150
  %138 = bitcast i8* %137 to <8 x i8>*, !dbg !151
  %139 = load <8 x i8>, <8 x i8>* %138, align 1, !dbg !151, !tbaa !152
  %140 = getelementptr inbounds i8, i8* %96, i64 %136, !dbg !150
  %141 = bitcast i8* %140 to <8 x i8>*, !dbg !156
  store <8 x i8> %139, <8 x i8>* %141, align 1, !dbg !156, !tbaa !152
  %142 = add nuw i64 %136, 8, !dbg !150
  %143 = icmp eq i64 %142, %134, !dbg !150
  br i1 %143, label %144, label %135, !dbg !150, !llvm.loop !161

144:                                              ; preds = %135
  %145 = icmp eq i64 %98, %134, !dbg !149
  br i1 %145, label %155, label %146, !dbg !149

146:                                              ; preds = %102, %100, %129, %144
  %147 = phi i64 [ 0, %100 ], [ 0, %102 ], [ %112, %129 ], [ %134, %144 ]
  br label %148, !dbg !149

148:                                              ; preds = %146, %148
  %149 = phi i64 [ %153, %148 ], [ %147, %146 ]
  %150 = getelementptr inbounds i8, i8* %97, i64 %149, !dbg !151
  %151 = load i8, i8* %150, align 1, !dbg !151, !tbaa !152
  %152 = getelementptr inbounds i8, i8* %96, i64 %149, !dbg !162
  store i8 %151, i8* %152, align 1, !dbg !156, !tbaa !152
  %153 = add nuw i64 %149, 1, !dbg !150
  %154 = icmp eq i64 %153, %98, !dbg !147
  br i1 %154, label %155, label %148, !dbg !149, !llvm.loop !163

155:                                              ; preds = %148, %127, %144, %94
  %156 = tail call i8* @malloc(i64 %20) #12, !dbg !164
  %157 = icmp eq i8* %156, null, !dbg !166
  br i1 %157, label %158, label %159, !dbg !167

158:                                              ; preds = %155
  tail call fastcc void @ink_fail() #11, !dbg !168
  unreachable

159:                                              ; preds = %155
  %160 = bitcast i8* %156 to %struct.ink_block*, !dbg !164
  %161 = bitcast i8* %156 to i8**, !dbg !169
  store i8* %84, i8** %161, align 8, !dbg !169, !tbaa !24
  store i8* %156, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !170, !tbaa !18
  %162 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %160, i64 1, !dbg !171
  %163 = bitcast %struct.ink_block* %162 to i32*, !dbg !172
  br i1 %14, label %200, label %164, !dbg !173

164:                                              ; preds = %159
  %165 = icmp ult i64 %8, 4, !dbg !173
  br i1 %165, label %198, label %166, !dbg !173

166:                                              ; preds = %164
  %167 = getelementptr i8, i8* %156, i64 16, !dbg !173
  %168 = add i64 %15, 16, !dbg !173
  %169 = getelementptr i8, i8* %156, i64 %168, !dbg !173
  %170 = getelementptr i32, i32* %6, i64 %8, !dbg !173
  %171 = bitcast i32* %170 to i8*, !dbg !173
  %172 = icmp ult i8* %167, %171, !dbg !173
  %173 = icmp ugt i8* %169, %7, !dbg !173
  %174 = and i1 %172, %173, !dbg !173
  br i1 %174, label %198, label %175, !dbg !173

175:                                              ; preds = %166
  %176 = and i64 %8, -4, !dbg !173
  %177 = insertelement <4 x i32> poison, i32 %2, i32 0, !dbg !173
  %178 = shufflevector <4 x i32> %177, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !173
  %179 = insertelement <4 x i32> poison, i32 %3, i32 0, !dbg !173
  %180 = shufflevector <4 x i32> %179, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !173
  br label %181, !dbg !173

181:                                              ; preds = %181, %175
  %182 = phi i64 [ 0, %175 ], [ %193, %181 ], !dbg !174
  %183 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %175 ], [ %194, %181 ], !dbg !175
  %184 = getelementptr inbounds i32, i32* %6, i64 %182, !dbg !174
  %185 = bitcast i32* %184 to <4 x i32>*, !dbg !176
  %186 = load <4 x i32>, <4 x i32>* %185, align 4, !dbg !176, !tbaa !99, !alias.scope !177
  %187 = icmp ult <4 x i32> %183, %178, !dbg !180
  %188 = add <4 x i32> %186, %180, !dbg !181
  %189 = mul <4 x i32> %186, <i32 3, i32 3, i32 3, i32 3>, !dbg !181
  %190 = select <4 x i1> %187, <4 x i32> %188, <4 x i32> %189, !dbg !181
  %191 = getelementptr inbounds i32, i32* %163, i64 %182, !dbg !174
  %192 = bitcast i32* %191 to <4 x i32>*, !dbg !182
  store <4 x i32> %190, <4 x i32>* %192, align 4, !dbg !182, !tbaa !99, !alias.scope !183, !noalias !177
  %193 = add nuw i64 %182, 4, !dbg !174
  %194 = add <4 x i32> %183, <i32 4, i32 4, i32 4, i32 4>, !dbg !175
  %195 = icmp eq i64 %193, %176, !dbg !174
  br i1 %195, label %196, label %181, !dbg !174, !llvm.loop !185

196:                                              ; preds = %181
  %197 = icmp eq i64 %8, %176, !dbg !173
  br i1 %197, label %200, label %198, !dbg !173

198:                                              ; preds = %166, %164, %196
  %199 = phi i64 [ 0, %166 ], [ 0, %164 ], [ %176, %196 ]
  br label %313, !dbg !173

200:                                              ; preds = %313, %196, %159
  %201 = icmp ult i64 %73, %8, !dbg !187
  %202 = select i1 %201, i64 %73, i64 %8, !dbg !188
  %203 = icmp ugt i64 %202, 4611686018427387903, !dbg !189
  br i1 %203, label %204, label %205, !dbg !191

204:                                              ; preds = %200
  tail call fastcc void @ink_fail() #11, !dbg !192
  unreachable

205:                                              ; preds = %200
  %206 = icmp eq i64 %202, 0, !dbg !193
  %207 = shl nuw i64 %202, 2, !dbg !194
  %208 = select i1 %206, i64 4, i64 %207, !dbg !194
  %209 = icmp ugt i64 %208, -17, !dbg !195
  br i1 %209, label %210, label %211, !dbg !196

210:                                              ; preds = %205
  tail call fastcc void @ink_fail() #11, !dbg !197
  unreachable

211:                                              ; preds = %205
  %212 = add nuw i64 %208, 16, !dbg !198
  %213 = tail call i8* @malloc(i64 %212) #12, !dbg !199
  %214 = icmp eq i8* %213, null, !dbg !200
  br i1 %214, label %215, label %216, !dbg !201

215:                                              ; preds = %211
  tail call fastcc void @ink_fail() #11, !dbg !202
  unreachable

216:                                              ; preds = %211
  %217 = bitcast i8* %213 to %struct.ink_block*, !dbg !199
  %218 = bitcast i8* %213 to i8**, !dbg !203
  store i8* %156, i8** %218, align 8, !dbg !203, !tbaa !24
  store i8* %213, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !204, !tbaa !18
  %219 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %217, i64 1, !dbg !205
  %220 = bitcast %struct.ink_block* %219 to i32*, !dbg !206
  br i1 %206, label %325, label %221, !dbg !207

221:                                              ; preds = %216
  %222 = icmp eq i32 %3, 0
  br i1 %222, label %270, label %223, !dbg !207

223:                                              ; preds = %221
  %224 = icmp ult i64 %202, 2, !dbg !207
  br i1 %224, label %268, label %225, !dbg !207

225:                                              ; preds = %223
  %226 = and i64 %202, -2, !dbg !207
  br label %227, !dbg !207

227:                                              ; preds = %256, %225
  %228 = phi i64 [ 0, %225 ], [ %264, %256 ], !dbg !208
  %229 = or i64 %228, 1, !dbg !208
  %230 = getelementptr inbounds i32, i32* %91, i64 %228, !dbg !208
  %231 = getelementptr inbounds i32, i32* %91, i64 %229, !dbg !208
  %232 = load i32, i32* %230, align 4, !dbg !208, !tbaa !99
  %233 = load i32, i32* %231, align 4, !dbg !208, !tbaa !99
  %234 = getelementptr inbounds i32, i32* %163, i64 %228, !dbg !208
  %235 = getelementptr inbounds i32, i32* %163, i64 %229, !dbg !208
  %236 = load i32, i32* %234, align 4, !dbg !208, !tbaa !99
  %237 = load i32, i32* %235, align 4, !dbg !208, !tbaa !99
  %238 = icmp ult i32 %232, %236, !dbg !208
  %239 = icmp ult i32 %233, %237, !dbg !208
  br i1 %238, label %242, label %240, !dbg !208

240:                                              ; preds = %227
  %241 = urem i32 %236, %3, !dbg !208
  br label %242

242:                                              ; preds = %240, %227
  %243 = phi i32 [ poison, %227 ], [ %241, %240 ], !dbg !208
  br i1 %239, label %246, label %244, !dbg !208

244:                                              ; preds = %242
  %245 = urem i32 %237, %3, !dbg !208
  br label %246

246:                                              ; preds = %244, %242
  %247 = phi i32 [ poison, %242 ], [ %245, %244 ], !dbg !208
  %248 = add i32 %243, %232, !dbg !208
  %249 = add i32 %247, %233, !dbg !208
  br i1 %238, label %250, label %252, !dbg !208

250:                                              ; preds = %246
  %251 = udiv i32 %232, %3, !dbg !208
  br label %252

252:                                              ; preds = %250, %246
  %253 = phi i32 [ poison, %246 ], [ %251, %250 ], !dbg !208
  br i1 %239, label %254, label %256, !dbg !208

254:                                              ; preds = %252
  %255 = udiv i32 %233, %3, !dbg !208
  br label %256

256:                                              ; preds = %254, %252
  %257 = phi i32 [ poison, %252 ], [ %255, %254 ], !dbg !208
  %258 = add i32 %253, %236, !dbg !208
  %259 = add i32 %257, %237, !dbg !208
  %260 = select i1 %238, i32 %258, i32 %248, !dbg !209
  %261 = select i1 %239, i32 %259, i32 %249, !dbg !209
  %262 = getelementptr inbounds i32, i32* %220, i64 %228, !dbg !208
  %263 = getelementptr inbounds i32, i32* %220, i64 %229, !dbg !208
  store i32 %260, i32* %262, align 4, !dbg !208, !tbaa !99
  store i32 %261, i32* %263, align 4, !dbg !208, !tbaa !99
  %264 = add nuw i64 %228, 2, !dbg !208
  %265 = icmp eq i64 %264, %226, !dbg !208
  br i1 %265, label %266, label %227, !dbg !208, !llvm.loop !210

266:                                              ; preds = %256
  %267 = icmp eq i64 %202, %226, !dbg !207
  br i1 %267, label %325, label %268, !dbg !207

268:                                              ; preds = %223, %266
  %269 = phi i64 [ 0, %223 ], [ %226, %266 ]
  br label %329, !dbg !207

270:                                              ; preds = %221
  %271 = icmp ult i64 %202, 8, !dbg !207
  br i1 %271, label %300, label %272, !dbg !207

272:                                              ; preds = %270
  %273 = and i64 %202, -8, !dbg !207
  br label %274, !dbg !207

274:                                              ; preds = %274, %272
  %275 = phi i64 [ 0, %272 ], [ %296, %274 ], !dbg !208
  %276 = getelementptr inbounds i32, i32* %91, i64 %275, !dbg !208
  %277 = bitcast i32* %276 to <4 x i32>*, !dbg !212
  %278 = load <4 x i32>, <4 x i32>* %277, align 4, !dbg !212, !tbaa !99
  %279 = getelementptr inbounds i32, i32* %276, i64 4, !dbg !212
  %280 = bitcast i32* %279 to <4 x i32>*, !dbg !212
  %281 = load <4 x i32>, <4 x i32>* %280, align 4, !dbg !212, !tbaa !99
  %282 = getelementptr inbounds i32, i32* %163, i64 %275, !dbg !208
  %283 = bitcast i32* %282 to <4 x i32>*, !dbg !213
  %284 = load <4 x i32>, <4 x i32>* %283, align 4, !dbg !213, !tbaa !99
  %285 = getelementptr inbounds i32, i32* %282, i64 4, !dbg !213
  %286 = bitcast i32* %285 to <4 x i32>*, !dbg !213
  %287 = load <4 x i32>, <4 x i32>* %286, align 4, !dbg !213, !tbaa !99
  %288 = icmp ult <4 x i32> %278, %284, !dbg !214
  %289 = icmp ult <4 x i32> %281, %287, !dbg !214
  %290 = select <4 x i1> %288, <4 x i32> %284, <4 x i32> %278, !dbg !215
  %291 = select <4 x i1> %289, <4 x i32> %287, <4 x i32> %281, !dbg !215
  %292 = getelementptr inbounds i32, i32* %220, i64 %275, !dbg !208
  %293 = bitcast i32* %292 to <4 x i32>*, !dbg !216
  store <4 x i32> %290, <4 x i32>* %293, align 4, !dbg !216, !tbaa !99
  %294 = getelementptr inbounds i32, i32* %292, i64 4, !dbg !216
  %295 = bitcast i32* %294 to <4 x i32>*, !dbg !216
  store <4 x i32> %291, <4 x i32>* %295, align 4, !dbg !216, !tbaa !99
  %296 = add nuw i64 %275, 8, !dbg !208
  %297 = icmp eq i64 %296, %273, !dbg !208
  br i1 %297, label %298, label %274, !dbg !208, !llvm.loop !217

298:                                              ; preds = %274
  %299 = icmp eq i64 %202, %273, !dbg !207
  br i1 %299, label %325, label %300, !dbg !207

300:                                              ; preds = %270, %298
  %301 = phi i64 [ 0, %270 ], [ %273, %298 ]
  br label %302, !dbg !207

302:                                              ; preds = %300, %302
  %303 = phi i64 [ %311, %302 ], [ %301, %300 ]
  %304 = getelementptr inbounds i32, i32* %91, i64 %303, !dbg !212
  %305 = load i32, i32* %304, align 4, !dbg !212, !tbaa !99
  %306 = getelementptr inbounds i32, i32* %163, i64 %303, !dbg !213
  %307 = load i32, i32* %306, align 4, !dbg !213, !tbaa !99
  %308 = icmp ult i32 %305, %307, !dbg !214
  %309 = select i1 %308, i32 %307, i32 %305, !dbg !215
  %310 = getelementptr inbounds i32, i32* %220, i64 %303, !dbg !218
  store i32 %309, i32* %310, align 4, !dbg !216, !tbaa !99
  %311 = add nuw i64 %303, 1, !dbg !208
  %312 = icmp eq i64 %311, %202, !dbg !219
  br i1 %312, label %325, label %302, !dbg !207, !llvm.loop !220

313:                                              ; preds = %198, %313
  %314 = phi i64 [ %323, %313 ], [ %199, %198 ]
  %315 = trunc i64 %314 to i32, !dbg !175
  %316 = getelementptr inbounds i32, i32* %6, i64 %314, !dbg !176
  %317 = load i32, i32* %316, align 4, !dbg !176, !tbaa !99
  %318 = icmp ult i32 %315, %2, !dbg !180
  %319 = add i32 %317, %3, !dbg !181
  %320 = mul i32 %317, 3, !dbg !181
  %321 = select i1 %318, i32 %319, i32 %320, !dbg !181
  %322 = getelementptr inbounds i32, i32* %163, i64 %314, !dbg !221
  store i32 %321, i32* %322, align 4, !dbg !182, !tbaa !99
  %323 = add nuw i64 %314, 1, !dbg !174
  %324 = icmp eq i64 %323, %8, !dbg !222
  br i1 %324, label %200, label %313, !dbg !173, !llvm.loop !223

325:                                              ; preds = %342, %302, %266, %298, %216
  %326 = ptrtoint %struct.ink_block* %219 to i64, !dbg !224
  %327 = insertvalue [2 x i64] undef, i64 %326, 0, !dbg !224
  %328 = insertvalue [2 x i64] %327, i64 %202, 1, !dbg !224
  ret [2 x i64] %328, !dbg !224

329:                                              ; preds = %268, %342
  %330 = phi i64 [ %345, %342 ], [ %269, %268 ]
  %331 = getelementptr inbounds i32, i32* %91, i64 %330, !dbg !212
  %332 = load i32, i32* %331, align 4, !dbg !212, !tbaa !99
  %333 = getelementptr inbounds i32, i32* %163, i64 %330, !dbg !213
  %334 = load i32, i32* %333, align 4, !dbg !213, !tbaa !99
  %335 = icmp ult i32 %332, %334, !dbg !214
  br i1 %335, label %336, label %339, !dbg !215

336:                                              ; preds = %329
  %337 = udiv i32 %332, %3, !dbg !225
  %338 = add i32 %337, %334, !dbg !226
  br label %342, !dbg !227

339:                                              ; preds = %329
  %340 = urem i32 %334, %3, !dbg !228
  %341 = add i32 %340, %332, !dbg !229
  br label %342

342:                                              ; preds = %339, %336
  %343 = phi i32 [ %338, %336 ], [ %341, %339 ], !dbg !209
  %344 = getelementptr inbounds i32, i32* %220, i64 %330, !dbg !218
  store i32 %343, i32* %344, align 4, !dbg !216, !tbaa !99
  %345 = add nuw i64 %330, 1, !dbg !208
  %346 = icmp eq i64 %345, %202, !dbg !219
  br i1 %346, label %325, label %329, !dbg !207, !llvm.loop !230
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
define i64 @lang_fn_pipeline38_left_padded_zip_heldout_u32_into([2 x i64] %0, [2 x i64] %1, i32 %2, i32 %3, i32* nocapture %4) local_unnamed_addr #0 !dbg !281 {
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
  %30 = bitcast %struct.ink_block* %29 to i8*, !dbg !301
  %31 = bitcast %struct.ink_block* %29 to i32*, !dbg !302
  br i1 %15, label %57, label %32, !dbg !303

32:                                               ; preds = %26
  %33 = icmp eq i32 %3, 0
  br i1 %33, label %34, label %60, !dbg !303

34:                                               ; preds = %32
  %35 = icmp ult i64 %9, 8, !dbg !303
  br i1 %35, label %50, label %36, !dbg !303

36:                                               ; preds = %34
  %37 = and i64 %9, -8, !dbg !303
  %38 = insertelement <4 x i32> poison, i32 %2, i32 0, !dbg !303
  %39 = shufflevector <4 x i32> %38, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !303
  br label %40, !dbg !303

40:                                               ; preds = %40, %36
  %41 = phi i64 [ 0, %36 ], [ %46, %40 ], !dbg !304
  %42 = getelementptr inbounds i32, i32* %31, i64 %41, !dbg !304
  %43 = bitcast i32* %42 to <4 x i32>*, !dbg !305
  store <4 x i32> %39, <4 x i32>* %43, align 4, !dbg !305, !tbaa !99
  %44 = getelementptr inbounds i32, i32* %42, i64 4, !dbg !305
  %45 = bitcast i32* %44 to <4 x i32>*, !dbg !305
  store <4 x i32> %39, <4 x i32>* %45, align 4, !dbg !305, !tbaa !99
  %46 = add nuw i64 %41, 8, !dbg !304
  %47 = icmp eq i64 %46, %37, !dbg !304
  br i1 %47, label %48, label %40, !dbg !304, !llvm.loop !306

48:                                               ; preds = %40
  %49 = icmp eq i64 %9, %37, !dbg !303
  br i1 %49, label %57, label %50, !dbg !303

50:                                               ; preds = %34, %48
  %51 = phi i64 [ 0, %34 ], [ %37, %48 ]
  br label %52, !dbg !303

52:                                               ; preds = %50, %52
  %53 = phi i64 [ %55, %52 ], [ %51, %50 ]
  %54 = getelementptr inbounds i32, i32* %31, i64 %53, !dbg !308
  store i32 %2, i32* %54, align 4, !dbg !305, !tbaa !99
  %55 = add nuw i64 %53, 1, !dbg !304
  %56 = icmp eq i64 %55, %9, !dbg !309
  br i1 %56, label %57, label %52, !dbg !303, !llvm.loop !310

57:                                               ; preds = %60, %52, %48, %26
  %58 = xor i64 %11, -1, !dbg !311
  %59 = icmp ugt i64 %9, %58, !dbg !312
  br i1 %59, label %72, label %73, !dbg !313

60:                                               ; preds = %32, %60
  %61 = phi i64 [ %70, %60 ], [ 0, %32 ]
  %62 = trunc i64 %61 to i32, !dbg !314
  %63 = getelementptr inbounds i32, i32* %7, i64 %61, !dbg !315
  %64 = load i32, i32* %63, align 4, !dbg !315, !tbaa !99
  %65 = udiv i32 %64, %3, !dbg !316
  %66 = urem i32 %62, %3, !dbg !317
  %67 = add i32 %65, %2, !dbg !318
  %68 = add i32 %67, %66, !dbg !319
  %69 = getelementptr inbounds i32, i32* %31, i64 %61, !dbg !308
  store i32 %68, i32* %69, align 4, !dbg !305, !tbaa !99
  %70 = add nuw i64 %61, 1, !dbg !304
  %71 = icmp eq i64 %70, %9, !dbg !309
  br i1 %71, label %57, label %60, !dbg !303, !llvm.loop !320

72:                                               ; preds = %57
  tail call fastcc void @ink_fail(), !dbg !321
  unreachable

73:                                               ; preds = %57
  %74 = add i64 %11, %9, !dbg !322
  %75 = icmp ugt i64 %74, 4611686018427387903, !dbg !323
  br i1 %75, label %76, label %77, !dbg !325

76:                                               ; preds = %73
  tail call fastcc void @ink_fail() #11, !dbg !326
  unreachable

77:                                               ; preds = %73
  %78 = icmp eq i64 %74, 0, !dbg !327
  %79 = shl nuw i64 %74, 2, !dbg !328
  %80 = select i1 %78, i64 4, i64 %79, !dbg !328
  %81 = icmp ugt i64 %80, -17, !dbg !329
  br i1 %81, label %82, label %83, !dbg !330

82:                                               ; preds = %77
  tail call fastcc void @ink_fail() #11, !dbg !331
  unreachable

83:                                               ; preds = %77
  %84 = add nuw i64 %80, 16, !dbg !332
  %85 = tail call i8* @malloc(i64 %84) #12, !dbg !333
  %86 = icmp eq i8* %85, null, !dbg !334
  br i1 %86, label %87, label %88, !dbg !335

87:                                               ; preds = %83
  tail call fastcc void @ink_fail() #11, !dbg !336
  unreachable

88:                                               ; preds = %83
  %89 = bitcast i8* %85 to %struct.ink_block*, !dbg !333
  %90 = bitcast i8* %85 to i8**, !dbg !337
  store i8* %22, i8** %90, align 8, !dbg !337, !tbaa !24
  store i8* %85, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !338, !tbaa !18
  %91 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %89, i64 1, !dbg !339
  %92 = bitcast %struct.ink_block* %91 to i32*, !dbg !340
  br i1 %15, label %95, label %93, !dbg !341

93:                                               ; preds = %88
  %94 = bitcast %struct.ink_block* %91 to i8*, !dbg !343
  call void @llvm.memcpy.p0i8.p0i8.i64(i8* nonnull align 1 %94, i8* nonnull align 1 %30, i64 %16, i1 false), !dbg !344
  br label %95, !dbg !345

95:                                               ; preds = %93, %88
  %96 = getelementptr inbounds i32, i32* %92, i64 %9, !dbg !345
  %97 = bitcast i32* %96 to i8*, !dbg !346
  %98 = inttoptr i64 %10 to i8*, !dbg !347
  %99 = shl i64 %11, 2, !dbg !348
  %100 = icmp eq i64 %99, 0, !dbg !349
  br i1 %100, label %156, label %101, !dbg !351

101:                                              ; preds = %95
  %102 = icmp ult i64 %99, 8, !dbg !351
  br i1 %102, label %147, label %103, !dbg !351

103:                                              ; preds = %101
  %104 = add i64 %79, 16, !dbg !351
  %105 = getelementptr i8, i8* %85, i64 %104, !dbg !351
  %106 = getelementptr i8, i8* %98, i64 %99, !dbg !351
  %107 = icmp ugt i8* %106, %97, !dbg !351
  %108 = icmp ugt i8* %105, %98, !dbg !351
  %109 = and i1 %107, %108, !dbg !351
  br i1 %109, label %147, label %110, !dbg !351

110:                                              ; preds = %103
  %111 = icmp ult i64 %99, 32, !dbg !351
  br i1 %111, label %133, label %112, !dbg !351

112:                                              ; preds = %110
  %113 = and i64 %99, -32, !dbg !351
  br label %114, !dbg !351

114:                                              ; preds = %114, %112
  %115 = phi i64 [ 0, %112 ], [ %126, %114 ], !dbg !352
  %116 = getelementptr inbounds i8, i8* %98, i64 %115, !dbg !352
  %117 = bitcast i8* %116 to <16 x i8>*, !dbg !353
  %118 = load <16 x i8>, <16 x i8>* %117, align 1, !dbg !353, !tbaa !152, !alias.scope !354
  %119 = getelementptr inbounds i8, i8* %116, i64 16, !dbg !353
  %120 = bitcast i8* %119 to <16 x i8>*, !dbg !353
  %121 = load <16 x i8>, <16 x i8>* %120, align 1, !dbg !353, !tbaa !152, !alias.scope !354
  %122 = getelementptr inbounds i8, i8* %97, i64 %115, !dbg !352
  %123 = bitcast i8* %122 to <16 x i8>*, !dbg !357
  store <16 x i8> %118, <16 x i8>* %123, align 1, !dbg !357, !tbaa !152, !alias.scope !358, !noalias !354
  %124 = getelementptr inbounds i8, i8* %122, i64 16, !dbg !357
  %125 = bitcast i8* %124 to <16 x i8>*, !dbg !357
  store <16 x i8> %121, <16 x i8>* %125, align 1, !dbg !357, !tbaa !152, !alias.scope !358, !noalias !354
  %126 = add nuw i64 %115, 32, !dbg !352
  %127 = icmp eq i64 %126, %113, !dbg !352
  br i1 %127, label %128, label %114, !dbg !352, !llvm.loop !360

128:                                              ; preds = %114
  %129 = icmp eq i64 %99, %113, !dbg !351
  br i1 %129, label %156, label %130, !dbg !351

130:                                              ; preds = %128
  %131 = and i64 %11, 6, !dbg !351
  %132 = icmp eq i64 %131, 0, !dbg !351
  br i1 %132, label %147, label %133, !dbg !351

133:                                              ; preds = %110, %130
  %134 = phi i64 [ %113, %130 ], [ 0, %110 ]
  %135 = and i64 %99, -8, !dbg !351
  br label %136, !dbg !351

136:                                              ; preds = %136, %133
  %137 = phi i64 [ %134, %133 ], [ %143, %136 ], !dbg !352
  %138 = getelementptr inbounds i8, i8* %98, i64 %137, !dbg !352
  %139 = bitcast i8* %138 to <8 x i8>*, !dbg !353
  %140 = load <8 x i8>, <8 x i8>* %139, align 1, !dbg !353, !tbaa !152
  %141 = getelementptr inbounds i8, i8* %97, i64 %137, !dbg !352
  %142 = bitcast i8* %141 to <8 x i8>*, !dbg !357
  store <8 x i8> %140, <8 x i8>* %142, align 1, !dbg !357, !tbaa !152
  %143 = add nuw i64 %137, 8, !dbg !352
  %144 = icmp eq i64 %143, %135, !dbg !352
  br i1 %144, label %145, label %136, !dbg !352, !llvm.loop !362

145:                                              ; preds = %136
  %146 = icmp eq i64 %99, %135, !dbg !351
  br i1 %146, label %156, label %147, !dbg !351

147:                                              ; preds = %103, %101, %130, %145
  %148 = phi i64 [ 0, %101 ], [ 0, %103 ], [ %113, %130 ], [ %135, %145 ]
  br label %149, !dbg !351

149:                                              ; preds = %147, %149
  %150 = phi i64 [ %154, %149 ], [ %148, %147 ]
  %151 = getelementptr inbounds i8, i8* %98, i64 %150, !dbg !353
  %152 = load i8, i8* %151, align 1, !dbg !353, !tbaa !152
  %153 = getelementptr inbounds i8, i8* %97, i64 %150, !dbg !363
  store i8 %152, i8* %153, align 1, !dbg !357, !tbaa !152
  %154 = add nuw i64 %150, 1, !dbg !352
  %155 = icmp eq i64 %154, %99, !dbg !349
  br i1 %155, label %156, label %149, !dbg !351, !llvm.loop !364

156:                                              ; preds = %149, %128, %145, %95
  %157 = tail call i8* @malloc(i64 %21) #12, !dbg !365
  %158 = icmp eq i8* %157, null, !dbg !367
  br i1 %158, label %159, label %160, !dbg !368

159:                                              ; preds = %156
  tail call fastcc void @ink_fail() #11, !dbg !369
  unreachable

160:                                              ; preds = %156
  %161 = bitcast i8* %157 to %struct.ink_block*, !dbg !365
  %162 = bitcast i8* %157 to i8**, !dbg !370
  store i8* %85, i8** %162, align 8, !dbg !370, !tbaa !24
  store i8* %157, i8** bitcast (%struct.ink_block** @ink_blocks to i8**), align 8, !dbg !371, !tbaa !18
  %163 = getelementptr inbounds %struct.ink_block, %struct.ink_block* %161, i64 1, !dbg !372
  %164 = bitcast %struct.ink_block* %163 to i32*, !dbg !373
  br i1 %15, label %201, label %165, !dbg !374

165:                                              ; preds = %160
  %166 = icmp ult i64 %9, 4, !dbg !374
  br i1 %166, label %199, label %167, !dbg !374

167:                                              ; preds = %165
  %168 = getelementptr i8, i8* %157, i64 16, !dbg !374
  %169 = add i64 %16, 16, !dbg !374
  %170 = getelementptr i8, i8* %157, i64 %169, !dbg !374
  %171 = getelementptr i32, i32* %7, i64 %9, !dbg !374
  %172 = bitcast i32* %171 to i8*, !dbg !374
  %173 = icmp ult i8* %168, %172, !dbg !374
  %174 = icmp ugt i8* %170, %8, !dbg !374
  %175 = and i1 %173, %174, !dbg !374
  br i1 %175, label %199, label %176, !dbg !374

176:                                              ; preds = %167
  %177 = and i64 %9, -4, !dbg !374
  %178 = insertelement <4 x i32> poison, i32 %2, i32 0, !dbg !374
  %179 = shufflevector <4 x i32> %178, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !374
  %180 = insertelement <4 x i32> poison, i32 %3, i32 0, !dbg !374
  %181 = shufflevector <4 x i32> %180, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !374
  br label %182, !dbg !374

182:                                              ; preds = %182, %176
  %183 = phi i64 [ 0, %176 ], [ %194, %182 ], !dbg !375
  %184 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %176 ], [ %195, %182 ], !dbg !376
  %185 = getelementptr inbounds i32, i32* %7, i64 %183, !dbg !375
  %186 = bitcast i32* %185 to <4 x i32>*, !dbg !377
  %187 = load <4 x i32>, <4 x i32>* %186, align 4, !dbg !377, !tbaa !99, !alias.scope !378
  %188 = icmp ult <4 x i32> %184, %179, !dbg !381
  %189 = add <4 x i32> %187, %181, !dbg !382
  %190 = mul <4 x i32> %187, <i32 3, i32 3, i32 3, i32 3>, !dbg !382
  %191 = select <4 x i1> %188, <4 x i32> %189, <4 x i32> %190, !dbg !382
  %192 = getelementptr inbounds i32, i32* %164, i64 %183, !dbg !375
  %193 = bitcast i32* %192 to <4 x i32>*, !dbg !383
  store <4 x i32> %191, <4 x i32>* %193, align 4, !dbg !383, !tbaa !99, !alias.scope !384, !noalias !378
  %194 = add nuw i64 %183, 4, !dbg !375
  %195 = add <4 x i32> %184, <i32 4, i32 4, i32 4, i32 4>, !dbg !376
  %196 = icmp eq i64 %194, %177, !dbg !375
  br i1 %196, label %197, label %182, !dbg !375, !llvm.loop !386

197:                                              ; preds = %182
  %198 = icmp eq i64 %9, %177, !dbg !374
  br i1 %198, label %201, label %199, !dbg !374

199:                                              ; preds = %167, %165, %197
  %200 = phi i64 [ 0, %167 ], [ 0, %165 ], [ %177, %197 ]
  br label %297, !dbg !374

201:                                              ; preds = %297, %197, %160
  %202 = icmp ult i64 %74, %9, !dbg !388
  %203 = select i1 %202, i64 %74, i64 %9, !dbg !389
  %204 = icmp eq i64 %203, 0, !dbg !390
  br i1 %204, label %309, label %205, !dbg !391

205:                                              ; preds = %201
  %206 = icmp eq i32 %3, 0
  br i1 %206, label %254, label %207, !dbg !391

207:                                              ; preds = %205
  %208 = icmp ult i64 %203, 2, !dbg !391
  br i1 %208, label %252, label %209, !dbg !391

209:                                              ; preds = %207
  %210 = and i64 %203, -2, !dbg !391
  br label %211, !dbg !391

211:                                              ; preds = %240, %209
  %212 = phi i64 [ 0, %209 ], [ %248, %240 ], !dbg !392
  %213 = or i64 %212, 1, !dbg !392
  %214 = getelementptr inbounds i32, i32* %92, i64 %212, !dbg !392
  %215 = getelementptr inbounds i32, i32* %92, i64 %213, !dbg !392
  %216 = load i32, i32* %214, align 4, !dbg !392, !tbaa !99
  %217 = load i32, i32* %215, align 4, !dbg !392, !tbaa !99
  %218 = getelementptr inbounds i32, i32* %164, i64 %212, !dbg !392
  %219 = getelementptr inbounds i32, i32* %164, i64 %213, !dbg !392
  %220 = load i32, i32* %218, align 4, !dbg !392, !tbaa !99
  %221 = load i32, i32* %219, align 4, !dbg !392, !tbaa !99
  %222 = icmp ult i32 %216, %220, !dbg !392
  %223 = icmp ult i32 %217, %221, !dbg !392
  br i1 %222, label %226, label %224, !dbg !392

224:                                              ; preds = %211
  %225 = urem i32 %220, %3, !dbg !392
  br label %226

226:                                              ; preds = %224, %211
  %227 = phi i32 [ poison, %211 ], [ %225, %224 ], !dbg !392
  br i1 %223, label %230, label %228, !dbg !392

228:                                              ; preds = %226
  %229 = urem i32 %221, %3, !dbg !392
  br label %230

230:                                              ; preds = %228, %226
  %231 = phi i32 [ poison, %226 ], [ %229, %228 ], !dbg !392
  %232 = add i32 %227, %216, !dbg !392
  %233 = add i32 %231, %217, !dbg !392
  br i1 %222, label %234, label %236, !dbg !392

234:                                              ; preds = %230
  %235 = udiv i32 %216, %3, !dbg !392
  br label %236

236:                                              ; preds = %234, %230
  %237 = phi i32 [ poison, %230 ], [ %235, %234 ], !dbg !392
  br i1 %223, label %238, label %240, !dbg !392

238:                                              ; preds = %236
  %239 = udiv i32 %217, %3, !dbg !392
  br label %240

240:                                              ; preds = %238, %236
  %241 = phi i32 [ poison, %236 ], [ %239, %238 ], !dbg !392
  %242 = add i32 %237, %220, !dbg !392
  %243 = add i32 %241, %221, !dbg !392
  %244 = select i1 %222, i32 %242, i32 %232, !dbg !393
  %245 = select i1 %223, i32 %243, i32 %233, !dbg !393
  %246 = getelementptr inbounds i32, i32* %4, i64 %212, !dbg !392
  %247 = getelementptr inbounds i32, i32* %4, i64 %213, !dbg !392
  store i32 %244, i32* %246, align 4, !dbg !392, !tbaa !99
  store i32 %245, i32* %247, align 4, !dbg !392, !tbaa !99
  %248 = add nuw i64 %212, 2, !dbg !392
  %249 = icmp eq i64 %248, %210, !dbg !392
  br i1 %249, label %250, label %211, !dbg !392, !llvm.loop !394

250:                                              ; preds = %240
  %251 = icmp eq i64 %203, %210, !dbg !391
  br i1 %251, label %309, label %252, !dbg !391

252:                                              ; preds = %207, %250
  %253 = phi i64 [ 0, %207 ], [ %210, %250 ]
  br label %310, !dbg !391

254:                                              ; preds = %205
  %255 = icmp ult i64 %203, 8, !dbg !391
  br i1 %255, label %284, label %256, !dbg !391

256:                                              ; preds = %254
  %257 = and i64 %203, -8, !dbg !391
  br label %258, !dbg !391

258:                                              ; preds = %258, %256
  %259 = phi i64 [ 0, %256 ], [ %280, %258 ], !dbg !392
  %260 = getelementptr inbounds i32, i32* %92, i64 %259, !dbg !392
  %261 = bitcast i32* %260 to <4 x i32>*, !dbg !396
  %262 = load <4 x i32>, <4 x i32>* %261, align 4, !dbg !396, !tbaa !99
  %263 = getelementptr inbounds i32, i32* %260, i64 4, !dbg !396
  %264 = bitcast i32* %263 to <4 x i32>*, !dbg !396
  %265 = load <4 x i32>, <4 x i32>* %264, align 4, !dbg !396, !tbaa !99
  %266 = getelementptr inbounds i32, i32* %164, i64 %259, !dbg !392
  %267 = bitcast i32* %266 to <4 x i32>*, !dbg !397
  %268 = load <4 x i32>, <4 x i32>* %267, align 4, !dbg !397, !tbaa !99
  %269 = getelementptr inbounds i32, i32* %266, i64 4, !dbg !397
  %270 = bitcast i32* %269 to <4 x i32>*, !dbg !397
  %271 = load <4 x i32>, <4 x i32>* %270, align 4, !dbg !397, !tbaa !99
  %272 = icmp ult <4 x i32> %262, %268, !dbg !398
  %273 = icmp ult <4 x i32> %265, %271, !dbg !398
  %274 = select <4 x i1> %272, <4 x i32> %268, <4 x i32> %262, !dbg !399
  %275 = select <4 x i1> %273, <4 x i32> %271, <4 x i32> %265, !dbg !399
  %276 = getelementptr inbounds i32, i32* %4, i64 %259, !dbg !392
  %277 = bitcast i32* %276 to <4 x i32>*, !dbg !400
  store <4 x i32> %274, <4 x i32>* %277, align 4, !dbg !400, !tbaa !99
  %278 = getelementptr inbounds i32, i32* %276, i64 4, !dbg !400
  %279 = bitcast i32* %278 to <4 x i32>*, !dbg !400
  store <4 x i32> %275, <4 x i32>* %279, align 4, !dbg !400, !tbaa !99
  %280 = add nuw i64 %259, 8, !dbg !392
  %281 = icmp eq i64 %280, %257, !dbg !392
  br i1 %281, label %282, label %258, !dbg !392, !llvm.loop !401

282:                                              ; preds = %258
  %283 = icmp eq i64 %203, %257, !dbg !391
  br i1 %283, label %309, label %284, !dbg !391

284:                                              ; preds = %254, %282
  %285 = phi i64 [ 0, %254 ], [ %257, %282 ]
  br label %286, !dbg !391

286:                                              ; preds = %284, %286
  %287 = phi i64 [ %295, %286 ], [ %285, %284 ]
  %288 = getelementptr inbounds i32, i32* %92, i64 %287, !dbg !396
  %289 = load i32, i32* %288, align 4, !dbg !396, !tbaa !99
  %290 = getelementptr inbounds i32, i32* %164, i64 %287, !dbg !397
  %291 = load i32, i32* %290, align 4, !dbg !397, !tbaa !99
  %292 = icmp ult i32 %289, %291, !dbg !398
  %293 = select i1 %292, i32 %291, i32 %289, !dbg !399
  %294 = getelementptr inbounds i32, i32* %4, i64 %287, !dbg !402
  store i32 %293, i32* %294, align 4, !dbg !400, !tbaa !99
  %295 = add nuw i64 %287, 1, !dbg !392
  %296 = icmp eq i64 %295, %203, !dbg !390
  br i1 %296, label %309, label %286, !dbg !391, !llvm.loop !403

297:                                              ; preds = %199, %297
  %298 = phi i64 [ %307, %297 ], [ %200, %199 ]
  %299 = trunc i64 %298 to i32, !dbg !376
  %300 = getelementptr inbounds i32, i32* %7, i64 %298, !dbg !377
  %301 = load i32, i32* %300, align 4, !dbg !377, !tbaa !99
  %302 = icmp ult i32 %299, %2, !dbg !381
  %303 = add i32 %301, %3, !dbg !382
  %304 = mul i32 %301, 3, !dbg !382
  %305 = select i1 %302, i32 %303, i32 %304, !dbg !382
  %306 = getelementptr inbounds i32, i32* %164, i64 %298, !dbg !404
  store i32 %305, i32* %306, align 4, !dbg !383, !tbaa !99
  %307 = add nuw i64 %298, 1, !dbg !375
  %308 = icmp eq i64 %307, %9, !dbg !405
  br i1 %308, label %201, label %297, !dbg !374, !llvm.loop !406

309:                                              ; preds = %323, %286, %250, %282, %201
  ret i64 %203, !dbg !407

310:                                              ; preds = %252, %323
  %311 = phi i64 [ %326, %323 ], [ %253, %252 ]
  %312 = getelementptr inbounds i32, i32* %92, i64 %311, !dbg !396
  %313 = load i32, i32* %312, align 4, !dbg !396, !tbaa !99
  %314 = getelementptr inbounds i32, i32* %164, i64 %311, !dbg !397
  %315 = load i32, i32* %314, align 4, !dbg !397, !tbaa !99
  %316 = icmp ult i32 %313, %315, !dbg !398
  br i1 %316, label %317, label %320, !dbg !399

317:                                              ; preds = %310
  %318 = udiv i32 %313, %3, !dbg !408
  %319 = add i32 %318, %315, !dbg !409
  br label %323, !dbg !410

320:                                              ; preds = %310
  %321 = urem i32 %315, %3, !dbg !411
  %322 = add i32 %321, %313, !dbg !412
  br label %323

323:                                              ; preds = %320, %317
  %324 = phi i32 [ %319, %317 ], [ %322, %320 ], !dbg !393
  %325 = getelementptr inbounds i32, i32* %4, i64 %311, !dbg !402
  store i32 %324, i32* %325, align 4, !dbg !400, !tbaa !99
  %326 = add nuw i64 %311, 1, !dbg !392
  %327 = icmp eq i64 %326, %203, !dbg !390
  br i1 %327, label %309, label %310, !dbg !391, !llvm.loop !413
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
  %30 = tail call i64 @lang_fn_pipeline38_left_padded_zip_heldout_u32_into([2 x i64] %26, [2 x i64] %29, i32 %15, i32 %19, i32* %23), !dbg !429
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
  %29 = tail call [2 x i64] @lang_fn_pipeline38_left_padded_zip_heldout_u32([2 x i64] %25, [2 x i64] %28, i32 %15, i32 %19), !dbg !444
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
  store i32 %62, i32* %66, align 4, !dbg !479, !tbaa !99
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
  store i32 %97, i32* %101, align 4, !dbg !513, !tbaa !99
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
  store i32 %127, i32* %131, align 4, !dbg !542, !tbaa !99
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
  store i32 %157, i32* %161, align 4, !dbg !571, !tbaa !99
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
  store i32 %190, i32* %199, align 4, !dbg !605, !tbaa !99
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
  store i32 %228, i32* %237, align 4, !dbg !639, !tbaa !99
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
!97 = !DILocation(line: 93, column: 29, scope: !74)
!98 = !DILocation(line: 132, column: 12, scope: !74)
!99 = !{!100, !100, i64 0}
!100 = !{!"int", !20, i64 0}
!101 = distinct !{!101, !96, !102, !32, !103}
!102 = !DILocation(line: 133, column: 1, scope: !74)
!103 = !{!"llvm.loop.isvectorized", i32 1}
!104 = !DILocation(line: 132, column: 1, scope: !74)
!105 = !DILocation(line: 93, column: 19, scope: !74)
!106 = distinct !{!106, !96, !102, !32, !107, !103}
!107 = !{!"llvm.loop.unroll.runtime.disable"}
!108 = !DILocation(line: 138, column: 20, scope: !74)
!109 = !DILocation(line: 138, column: 11, scope: !74)
!110 = !DILocation(line: 138, column: 4, scope: !74)
!111 = !DILocation(line: 94, column: 13, scope: !74)
!112 = !DILocation(line: 96, column: 13, scope: !74)
!113 = !DILocation(line: 119, column: 18, scope: !74)
!114 = !DILocation(line: 129, column: 18, scope: !74)
!115 = !DILocation(line: 130, column: 19, scope: !74)
!116 = !DILocation(line: 132, column: 18, scope: !74)
!117 = distinct !{!117, !96, !102, !32}
!118 = !DILocation(line: 138, column: 30, scope: !74)
!119 = !DILocation(line: 139, column: 19, scope: !74)
!120 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !121)
!121 = distinct !DILocation(line: 140, column: 19, scope: !74)
!122 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !121)
!123 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !121)
!124 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !121)
!125 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !121)
!126 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !121)
!127 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !121)
!128 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !121)
!129 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !121)
!130 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !121)
!131 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !121)
!132 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !121)
!133 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !121)
!134 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !121)
!135 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !121)
!136 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !121)
!137 = !DILocation(line: 140, column: 19, scope: !74)
!138 = !DILocation(line: 37, column: 138, scope: !139, inlinedAt: !140)
!139 = distinct !DISubprogram(name: "ink_copy", scope: !14, file: !14, line: 37, type: !15, scopeLine: 37, flags: DIFlagPrototyped, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!140 = distinct !DILocation(line: 141, column: 1, scope: !74)
!141 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !121)
!142 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !140)
!143 = !DILocation(line: 142, column: 18, scope: !74)
!144 = !DILocation(line: 142, column: 10, scope: !74)
!145 = !DILocation(line: 142, column: 27, scope: !74)
!146 = !DILocation(line: 142, column: 43, scope: !74)
!147 = !DILocation(line: 37, column: 154, scope: !139, inlinedAt: !148)
!148 = distinct !DILocation(line: 142, column: 1, scope: !74)
!149 = !DILocation(line: 37, column: 138, scope: !139, inlinedAt: !148)
!150 = !DILocation(line: 37, column: 162, scope: !139, inlinedAt: !148)
!151 = !DILocation(line: 37, column: 172, scope: !139, inlinedAt: !148)
!152 = !{!20, !20, i64 0}
!153 = !{!154}
!154 = distinct !{!154, !155}
!155 = distinct !{!155, !"LVerDomain"}
!156 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !148)
!157 = !{!158}
!158 = distinct !{!158, !155}
!159 = distinct !{!159, !149, !160, !32, !103}
!160 = !DILocation(line: 37, column: 177, scope: !139, inlinedAt: !148)
!161 = distinct !{!161, !149, !160, !32, !103}
!162 = !DILocation(line: 37, column: 165, scope: !139, inlinedAt: !148)
!163 = distinct !{!163, !149, !160, !32, !103}
!164 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !165)
!165 = distinct !DILocation(line: 147, column: 19, scope: !74)
!166 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !165)
!167 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !165)
!168 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !165)
!169 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !165)
!170 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !165)
!171 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !165)
!172 = !DILocation(line: 147, column: 19, scope: !74)
!173 = !DILocation(line: 148, column: 1, scope: !74)
!174 = !DILocation(line: 148, column: 33, scope: !74)
!175 = !DILocation(line: 149, column: 14, scope: !74)
!176 = !DILocation(line: 151, column: 14, scope: !74)
!177 = !{!178}
!178 = distinct !{!178, !179}
!179 = distinct !{!179, !"LVerDomain"}
!180 = !DILocation(line: 170, column: 10, scope: !74)
!181 = !DILocation(line: 170, column: 5, scope: !74)
!182 = !DILocation(line: 179, column: 14, scope: !74)
!183 = !{!184}
!184 = distinct !{!184, !179}
!185 = distinct !{!185, !173, !186, !32, !103}
!186 = !DILocation(line: 180, column: 1, scope: !74)
!187 = !DILocation(line: 183, column: 38, scope: !74)
!188 = !DILocation(line: 183, column: 30, scope: !74)
!189 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !190)
!190 = distinct !DILocation(line: 183, column: 19, scope: !74)
!191 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !190)
!192 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !190)
!193 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !190)
!194 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !190)
!195 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !190)
!196 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !190)
!197 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !190)
!198 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !190)
!199 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !190)
!200 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !190)
!201 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !190)
!202 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !190)
!203 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !190)
!204 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !190)
!205 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !190)
!206 = !DILocation(line: 183, column: 19, scope: !74)
!207 = !DILocation(line: 184, column: 1, scope: !74)
!208 = !DILocation(line: 184, column: 65, scope: !74)
!209 = !DILocation(line: 0, scope: !74)
!210 = distinct !{!210, !207, !211, !32, !103}
!211 = !DILocation(line: 232, column: 1, scope: !74)
!212 = !DILocation(line: 185, column: 14, scope: !74)
!213 = !DILocation(line: 187, column: 14, scope: !74)
!214 = !DILocation(line: 206, column: 10, scope: !74)
!215 = !DILocation(line: 206, column: 5, scope: !74)
!216 = !DILocation(line: 231, column: 14, scope: !74)
!217 = distinct !{!217, !207, !211, !32, !103}
!218 = !DILocation(line: 231, column: 1, scope: !74)
!219 = !DILocation(line: 184, column: 21, scope: !74)
!220 = distinct !{!220, !207, !211, !32, !107, !103}
!221 = !DILocation(line: 179, column: 1, scope: !74)
!222 = !DILocation(line: 148, column: 21, scope: !74)
!223 = distinct !{!223, !173, !186, !32, !103}
!224 = !DILocation(line: 234, column: 1, scope: !74)
!225 = !DILocation(line: 214, column: 18, scope: !74)
!226 = !DILocation(line: 217, column: 10, scope: !74)
!227 = !DILocation(line: 218, column: 1, scope: !74)
!228 = !DILocation(line: 226, column: 18, scope: !74)
!229 = !DILocation(line: 229, column: 10, scope: !74)
!230 = distinct !{!230, !207, !211, !32, !103}
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
!281 = distinct !DISubprogram(name: "lang_fn_pipeline38_left_padded_zip_heldout_u32_into", scope: !14, file: !14, line: 424, type: !15, scopeLine: 424, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
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
!301 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !283)
!302 = !DILocation(line: 431, column: 18, scope: !281)
!303 = !DILocation(line: 432, column: 1, scope: !281)
!304 = !DILocation(line: 432, column: 29, scope: !281)
!305 = !DILocation(line: 471, column: 12, scope: !281)
!306 = distinct !{!306, !303, !307, !32, !103}
!307 = !DILocation(line: 472, column: 1, scope: !281)
!308 = !DILocation(line: 471, column: 1, scope: !281)
!309 = !DILocation(line: 432, column: 19, scope: !281)
!310 = distinct !{!310, !303, !307, !32, !107, !103}
!311 = !DILocation(line: 477, column: 20, scope: !281)
!312 = !DILocation(line: 477, column: 11, scope: !281)
!313 = !DILocation(line: 477, column: 4, scope: !281)
!314 = !DILocation(line: 433, column: 13, scope: !281)
!315 = !DILocation(line: 435, column: 13, scope: !281)
!316 = !DILocation(line: 458, column: 18, scope: !281)
!317 = !DILocation(line: 468, column: 18, scope: !281)
!318 = !DILocation(line: 469, column: 19, scope: !281)
!319 = !DILocation(line: 471, column: 18, scope: !281)
!320 = distinct !{!320, !303, !307, !32}
!321 = !DILocation(line: 477, column: 30, scope: !281)
!322 = !DILocation(line: 478, column: 19, scope: !281)
!323 = !DILocation(line: 32, column: 60, scope: !49, inlinedAt: !324)
!324 = distinct !DILocation(line: 479, column: 19, scope: !281)
!325 = !DILocation(line: 32, column: 47, scope: !49, inlinedAt: !324)
!326 = !DILocation(line: 32, column: 76, scope: !49, inlinedAt: !324)
!327 = !DILocation(line: 32, column: 101, scope: !49, inlinedAt: !324)
!328 = !DILocation(line: 32, column: 115, scope: !49, inlinedAt: !324)
!329 = !DILocation(line: 32, column: 130, scope: !49, inlinedAt: !324)
!330 = !DILocation(line: 32, column: 125, scope: !49, inlinedAt: !324)
!331 = !DILocation(line: 32, column: 158, scope: !49, inlinedAt: !324)
!332 = !DILocation(line: 32, column: 198, scope: !49, inlinedAt: !324)
!333 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !324)
!334 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !324)
!335 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !324)
!336 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !324)
!337 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !324)
!338 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !324)
!339 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !324)
!340 = !DILocation(line: 479, column: 19, scope: !281)
!341 = !DILocation(line: 37, column: 138, scope: !139, inlinedAt: !342)
!342 = distinct !DILocation(line: 480, column: 1, scope: !281)
!343 = !DILocation(line: 32, column: 262, scope: !49, inlinedAt: !324)
!344 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !342)
!345 = !DILocation(line: 481, column: 18, scope: !281)
!346 = !DILocation(line: 481, column: 10, scope: !281)
!347 = !DILocation(line: 481, column: 27, scope: !281)
!348 = !DILocation(line: 481, column: 43, scope: !281)
!349 = !DILocation(line: 37, column: 154, scope: !139, inlinedAt: !350)
!350 = distinct !DILocation(line: 481, column: 1, scope: !281)
!351 = !DILocation(line: 37, column: 138, scope: !139, inlinedAt: !350)
!352 = !DILocation(line: 37, column: 162, scope: !139, inlinedAt: !350)
!353 = !DILocation(line: 37, column: 172, scope: !139, inlinedAt: !350)
!354 = !{!355}
!355 = distinct !{!355, !356}
!356 = distinct !{!356, !"LVerDomain"}
!357 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !350)
!358 = !{!359}
!359 = distinct !{!359, !356}
!360 = distinct !{!360, !351, !361, !32, !103}
!361 = !DILocation(line: 37, column: 177, scope: !139, inlinedAt: !350)
!362 = distinct !{!362, !351, !361, !32, !103}
!363 = !DILocation(line: 37, column: 165, scope: !139, inlinedAt: !350)
!364 = distinct !{!364, !351, !361, !32, !103}
!365 = !DILocation(line: 32, column: 181, scope: !49, inlinedAt: !366)
!366 = distinct !DILocation(line: 486, column: 19, scope: !281)
!367 = !DILocation(line: 32, column: 210, scope: !49, inlinedAt: !366)
!368 = !DILocation(line: 32, column: 209, scope: !49, inlinedAt: !366)
!369 = !DILocation(line: 32, column: 212, scope: !49, inlinedAt: !366)
!370 = !DILocation(line: 32, column: 230, scope: !49, inlinedAt: !366)
!371 = !DILocation(line: 32, column: 252, scope: !49, inlinedAt: !366)
!372 = !DILocation(line: 32, column: 263, scope: !49, inlinedAt: !366)
!373 = !DILocation(line: 486, column: 19, scope: !281)
!374 = !DILocation(line: 487, column: 1, scope: !281)
!375 = !DILocation(line: 487, column: 33, scope: !281)
!376 = !DILocation(line: 488, column: 14, scope: !281)
!377 = !DILocation(line: 490, column: 14, scope: !281)
!378 = !{!379}
!379 = distinct !{!379, !380}
!380 = distinct !{!380, !"LVerDomain"}
!381 = !DILocation(line: 509, column: 10, scope: !281)
!382 = !DILocation(line: 509, column: 5, scope: !281)
!383 = !DILocation(line: 518, column: 14, scope: !281)
!384 = !{!385}
!385 = distinct !{!385, !380}
!386 = distinct !{!386, !374, !387, !32, !103}
!387 = !DILocation(line: 519, column: 1, scope: !281)
!388 = !DILocation(line: 522, column: 40, scope: !281)
!389 = !DILocation(line: 522, column: 32, scope: !281)
!390 = !DILocation(line: 523, column: 21, scope: !281)
!391 = !DILocation(line: 523, column: 1, scope: !281)
!392 = !DILocation(line: 523, column: 65, scope: !281)
!393 = !DILocation(line: 0, scope: !281)
!394 = distinct !{!394, !391, !395, !32, !103}
!395 = !DILocation(line: 571, column: 1, scope: !281)
!396 = !DILocation(line: 524, column: 14, scope: !281)
!397 = !DILocation(line: 526, column: 14, scope: !281)
!398 = !DILocation(line: 545, column: 10, scope: !281)
!399 = !DILocation(line: 545, column: 5, scope: !281)
!400 = !DILocation(line: 570, column: 14, scope: !281)
!401 = distinct !{!401, !391, !395, !32, !103}
!402 = !DILocation(line: 570, column: 1, scope: !281)
!403 = distinct !{!403, !391, !395, !32, !107, !103}
!404 = !DILocation(line: 518, column: 1, scope: !281)
!405 = !DILocation(line: 487, column: 21, scope: !281)
!406 = distinct !{!406, !374, !387, !32, !103}
!407 = !DILocation(line: 572, column: 1, scope: !281)
!408 = !DILocation(line: 553, column: 18, scope: !281)
!409 = !DILocation(line: 556, column: 10, scope: !281)
!410 = !DILocation(line: 557, column: 1, scope: !281)
!411 = !DILocation(line: 565, column: 18, scope: !281)
!412 = !DILocation(line: 568, column: 10, scope: !281)
!413 = distinct !{!413, !391, !395, !32, !103}
!414 = distinct !DISubprogram(name: "ink_compute_into", scope: !14, file: !14, line: 574, type: !15, scopeLine: 574, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!415 = !DILocation(line: 574, column: 151, scope: !414)
!416 = !DILocation(line: 575, column: 34, scope: !414)
!417 = !DILocation(line: 575, column: 67, scope: !414)
!418 = !DILocation(line: 575, column: 100, scope: !414)
!419 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !420)
!420 = distinct !DILocation(line: 575, column: 87, scope: !414)
!421 = !DILocation(line: 575, column: 145, scope: !414)
!422 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !423)
!423 = distinct !DILocation(line: 575, column: 132, scope: !414)
!424 = !DILocation(line: 575, column: 242, scope: !414)
!425 = !{!426, !426, i64 0}
!426 = !{!"long", !20, i64 0}
!427 = !DILocation(line: 575, column: 272, scope: !414)
!428 = !DILocation(line: 575, column: 290, scope: !414)
!429 = !DILocation(line: 575, column: 172, scope: !414)
!430 = !DILocation(line: 576, column: 30, scope: !414)
!431 = !DILocation(line: 576, column: 9, scope: !414)
!432 = distinct !DISubprogram(name: "ink_compute_call", scope: !14, file: !14, line: 577, type: !15, scopeLine: 577, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !10, retainedNodes: !16)
!433 = !DILocation(line: 577, column: 142, scope: !432)
!434 = !DILocation(line: 578, column: 34, scope: !432)
!435 = !DILocation(line: 578, column: 67, scope: !432)
!436 = !DILocation(line: 578, column: 100, scope: !432)
!437 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !438)
!438 = distinct !DILocation(line: 578, column: 87, scope: !432)
!439 = !DILocation(line: 578, column: 145, scope: !432)
!440 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !441)
!441 = distinct !DILocation(line: 578, column: 132, scope: !432)
!442 = !DILocation(line: 578, column: 250, scope: !432)
!443 = !DILocation(line: 578, column: 280, scope: !432)
!444 = !DILocation(line: 578, column: 185, scope: !432)
!445 = !DILocation(line: 578, column: 307, scope: !432)
!446 = !DILocation(line: 578, column: 306, scope: !432)
!447 = !DILocation(line: 578, column: 325, scope: !432)
!448 = !DILocation(line: 579, column: 124, scope: !432)
!449 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !450)
!450 = distinct !DILocation(line: 579, column: 111, scope: !432)
!451 = !DILocation(line: 579, column: 169, scope: !432)
!452 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !453)
!453 = distinct !DILocation(line: 579, column: 156, scope: !432)
!454 = !DILocation(line: 254, column: 7, scope: !231, inlinedAt: !455)
!455 = distinct !DILocation(line: 579, column: 205, scope: !432)
!456 = !DILocation(line: 254, column: 5, scope: !231, inlinedAt: !455)
!457 = !DILocation(line: 579, column: 34, scope: !432)
!458 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !459)
!459 = distinct !DILocation(line: 579, column: 21, scope: !432)
!460 = !DILocation(line: 579, column: 79, scope: !432)
!461 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !462)
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
!483 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !484)
!484 = distinct !DILocation(line: 580, column: 111, scope: !432)
!485 = !DILocation(line: 580, column: 169, scope: !432)
!486 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !487)
!487 = distinct !DILocation(line: 580, column: 156, scope: !432)
!488 = !DILocation(line: 281, column: 7, scope: !240, inlinedAt: !489)
!489 = distinct !DILocation(line: 580, column: 205, scope: !432)
!490 = !DILocation(line: 281, column: 5, scope: !240, inlinedAt: !489)
!491 = !DILocation(line: 580, column: 34, scope: !432)
!492 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !493)
!493 = distinct !DILocation(line: 580, column: 21, scope: !432)
!494 = !DILocation(line: 580, column: 79, scope: !432)
!495 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !496)
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
!517 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !518)
!518 = distinct !DILocation(line: 581, column: 21, scope: !432)
!519 = !DILocation(line: 581, column: 79, scope: !432)
!520 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !521)
!521 = distinct !DILocation(line: 581, column: 66, scope: !432)
!522 = !DILocation(line: 581, column: 124, scope: !432)
!523 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !524)
!524 = distinct !DILocation(line: 581, column: 111, scope: !432)
!525 = !DILocation(line: 581, column: 169, scope: !432)
!526 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !527)
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
!546 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !547)
!547 = distinct !DILocation(line: 582, column: 21, scope: !432)
!548 = !DILocation(line: 582, column: 79, scope: !432)
!549 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !550)
!550 = distinct !DILocation(line: 582, column: 66, scope: !432)
!551 = !DILocation(line: 582, column: 124, scope: !432)
!552 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !553)
!553 = distinct !DILocation(line: 582, column: 111, scope: !432)
!554 = !DILocation(line: 582, column: 169, scope: !432)
!555 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !556)
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
!575 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !576)
!576 = distinct !DILocation(line: 583, column: 21, scope: !432)
!577 = !DILocation(line: 583, column: 79, scope: !432)
!578 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !579)
!579 = distinct !DILocation(line: 583, column: 66, scope: !432)
!580 = !DILocation(line: 583, column: 169, scope: !432)
!581 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !582)
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
!609 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !610)
!610 = distinct !DILocation(line: 584, column: 21, scope: !432)
!611 = !DILocation(line: 584, column: 79, scope: !432)
!612 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !613)
!613 = distinct !DILocation(line: 584, column: 66, scope: !432)
!614 = !DILocation(line: 584, column: 169, scope: !432)
!615 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !616)
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
!647 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !648)
!648 = distinct !DILocation(line: 587, column: 111, scope: !644)
!649 = !DILocation(line: 587, column: 169, scope: !644)
!650 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !651)
!651 = distinct !DILocation(line: 587, column: 156, scope: !644)
!652 = !DILocation(line: 254, column: 7, scope: !231, inlinedAt: !653)
!653 = distinct !DILocation(line: 587, column: 205, scope: !644)
!654 = !DILocation(line: 254, column: 5, scope: !231, inlinedAt: !653)
!655 = !DILocation(line: 587, column: 34, scope: !644)
!656 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !657)
!657 = distinct !DILocation(line: 587, column: 21, scope: !644)
!658 = !DILocation(line: 587, column: 79, scope: !644)
!659 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !660)
!660 = distinct !DILocation(line: 587, column: 66, scope: !644)
!661 = !DILocation(line: 256, column: 16, scope: !231, inlinedAt: !653)
!662 = !DILocation(line: 266, column: 17, scope: !231, inlinedAt: !653)
!663 = !DILocation(line: 0, scope: !231, inlinedAt: !653)
!664 = !DILocation(line: 267, column: 18, scope: !231, inlinedAt: !653)
!665 = !DILocation(line: 269, column: 13, scope: !231, inlinedAt: !653)
!666 = !DILocation(line: 588, column: 124, scope: !644)
!667 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !668)
!668 = distinct !DILocation(line: 588, column: 111, scope: !644)
!669 = !DILocation(line: 588, column: 169, scope: !644)
!670 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !671)
!671 = distinct !DILocation(line: 588, column: 156, scope: !644)
!672 = !DILocation(line: 281, column: 7, scope: !240, inlinedAt: !673)
!673 = distinct !DILocation(line: 588, column: 205, scope: !644)
!674 = !DILocation(line: 281, column: 5, scope: !240, inlinedAt: !673)
!675 = !DILocation(line: 588, column: 34, scope: !644)
!676 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !677)
!677 = distinct !DILocation(line: 588, column: 21, scope: !644)
!678 = !DILocation(line: 588, column: 79, scope: !644)
!679 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !680)
!680 = distinct !DILocation(line: 588, column: 66, scope: !644)
!681 = !DILocation(line: 283, column: 16, scope: !240, inlinedAt: !673)
!682 = !DILocation(line: 293, column: 16, scope: !240, inlinedAt: !673)
!683 = !DILocation(line: 0, scope: !240, inlinedAt: !673)
!684 = !DILocation(line: 294, column: 17, scope: !240, inlinedAt: !673)
!685 = !DILocation(line: 296, column: 12, scope: !240, inlinedAt: !673)
!686 = !DILocation(line: 589, column: 34, scope: !644)
!687 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !688)
!688 = distinct !DILocation(line: 589, column: 21, scope: !644)
!689 = !DILocation(line: 589, column: 79, scope: !644)
!690 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !691)
!691 = distinct !DILocation(line: 589, column: 66, scope: !644)
!692 = !DILocation(line: 589, column: 124, scope: !644)
!693 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !694)
!694 = distinct !DILocation(line: 589, column: 111, scope: !644)
!695 = !DILocation(line: 589, column: 169, scope: !644)
!696 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !697)
!697 = distinct !DILocation(line: 589, column: 156, scope: !644)
!698 = !DILocation(line: 315, column: 9, scope: !249, inlinedAt: !699)
!699 = distinct !DILocation(line: 589, column: 205, scope: !644)
!700 = !DILocation(line: 315, column: 5, scope: !249, inlinedAt: !699)
!701 = !DILocation(line: 590, column: 34, scope: !644)
!702 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !703)
!703 = distinct !DILocation(line: 590, column: 21, scope: !644)
!704 = !DILocation(line: 590, column: 79, scope: !644)
!705 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !706)
!706 = distinct !DILocation(line: 590, column: 66, scope: !644)
!707 = !DILocation(line: 590, column: 124, scope: !644)
!708 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !709)
!709 = distinct !DILocation(line: 590, column: 111, scope: !644)
!710 = !DILocation(line: 590, column: 169, scope: !644)
!711 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !712)
!712 = distinct !DILocation(line: 590, column: 156, scope: !644)
!713 = !DILocation(line: 334, column: 9, scope: !253, inlinedAt: !714)
!714 = distinct !DILocation(line: 590, column: 205, scope: !644)
!715 = !DILocation(line: 334, column: 5, scope: !253, inlinedAt: !714)
!716 = !DILocation(line: 591, column: 34, scope: !644)
!717 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !718)
!718 = distinct !DILocation(line: 591, column: 21, scope: !644)
!719 = !DILocation(line: 591, column: 79, scope: !644)
!720 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !721)
!721 = distinct !DILocation(line: 591, column: 66, scope: !644)
!722 = !DILocation(line: 591, column: 169, scope: !644)
!723 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !724)
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
!737 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !738)
!738 = distinct !DILocation(line: 592, column: 21, scope: !644)
!739 = !DILocation(line: 592, column: 79, scope: !644)
!740 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !741)
!741 = distinct !DILocation(line: 592, column: 66, scope: !644)
!742 = !DILocation(line: 592, column: 169, scope: !644)
!743 = !DILocation(line: 37, column: 171, scope: !139, inlinedAt: !744)
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
