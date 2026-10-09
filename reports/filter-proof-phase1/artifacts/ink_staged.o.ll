; ModuleID = '/Users/jamesaddison/Documents/Codex/2026-10-09/wha/outputs/verified-language/build/filter-proof/ink_staged.o.c'
source_filename = "/Users/jamesaddison/Documents/Codex/2026-10-09/wha/outputs/verified-language/build/filter-proof/ink_staged.o.c"
target datalayout = "e-m:o-i64:64-i128:128-n32:64-S128-Fn32"
target triple = "arm64-apple-macosx15.0.0"

; Function Attrs: mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync)
define noundef i64 @lang_fn_project(i64 noundef %0, i64 noundef %1, i64 noundef %2) local_unnamed_addr #0 {
  %4 = mul i64 %1, %0
  %5 = add i64 %4, %2
  ret i64 %5
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync)
define noundef zeroext i1 @lang_fn_under(i64 noundef %0, i64 noundef %1) local_unnamed_addr #0 {
  %3 = icmp ult i64 %0, %1
  ret i1 %3
}

; Function Attrs: nounwind ssp uwtable(sync)
define i64 @lang_fn_mapped_filter_sum(ptr nocapture noundef readonly %0, i64 noundef %1, i64 noundef %2, i64 noundef %3, i64 noundef %4) local_unnamed_addr #1 {
  %6 = icmp ugt i64 %1, 2305843009213693951
  br i1 %6, label %7, label %8

7:                                                ; preds = %5
  tail call void @abort() #6
  unreachable

8:                                                ; preds = %5
  %9 = tail call i64 @llvm.umax.i64(i64 %1, i64 1)
  %10 = shl nuw i64 %9, 3
  %11 = tail call ptr @malloc(i64 noundef %10) #7
  %12 = icmp eq ptr %11, null
  br i1 %12, label %50, label %13

13:                                               ; preds = %8
  %14 = icmp eq i64 %1, 0
  br i1 %14, label %51, label %15

15:                                               ; preds = %13
  %16 = icmp ult i64 %1, 4
  br i1 %16, label %17, label %19

17:                                               ; preds = %48, %15
  %18 = phi i64 [ 0, %15 ], [ %20, %48 ]
  br label %62

19:                                               ; preds = %15
  %20 = and i64 %1, 2305843009213693948
  br label %21

21:                                               ; preds = %21, %19
  %22 = phi i64 [ 0, %19 ], [ %46, %21 ]
  %23 = or disjoint i64 %22, 1
  %24 = or disjoint i64 %22, 2
  %25 = or disjoint i64 %22, 3
  %26 = getelementptr inbounds i64, ptr %0, i64 %22
  %27 = getelementptr inbounds i64, ptr %0, i64 %23
  %28 = getelementptr inbounds i64, ptr %0, i64 %24
  %29 = getelementptr inbounds i64, ptr %0, i64 %25
  %30 = load i64, ptr %26, align 8, !tbaa !6
  %31 = load i64, ptr %27, align 8, !tbaa !6
  %32 = load i64, ptr %28, align 8, !tbaa !6
  %33 = load i64, ptr %29, align 8, !tbaa !6
  %34 = mul i64 %30, %2
  %35 = mul i64 %31, %2
  %36 = mul i64 %32, %2
  %37 = mul i64 %33, %2
  %38 = add i64 %34, %3
  %39 = add i64 %35, %3
  %40 = add i64 %36, %3
  %41 = add i64 %37, %3
  %42 = getelementptr inbounds i64, ptr %11, i64 %22
  %43 = getelementptr inbounds i64, ptr %11, i64 %23
  %44 = getelementptr inbounds i64, ptr %11, i64 %24
  %45 = getelementptr inbounds i64, ptr %11, i64 %25
  store i64 %38, ptr %42, align 8, !tbaa !6
  store i64 %39, ptr %43, align 8, !tbaa !6
  store i64 %40, ptr %44, align 8, !tbaa !6
  store i64 %41, ptr %45, align 8, !tbaa !6
  %46 = add nuw i64 %22, 4
  %47 = icmp eq i64 %46, %20
  br i1 %47, label %48, label %21, !llvm.loop !10

48:                                               ; preds = %21
  %49 = icmp eq i64 %20, %1
  br i1 %49, label %51, label %17

50:                                               ; preds = %8
  tail call void @abort() #6
  unreachable

51:                                               ; preds = %62, %48, %13
  %52 = tail call ptr @malloc(i64 noundef %10) #7
  %53 = icmp eq ptr %52, null
  br i1 %53, label %61, label %54

54:                                               ; preds = %51
  br i1 %14, label %60, label %55

55:                                               ; preds = %54
  %56 = and i64 %1, 7
  %57 = icmp ult i64 %1, 8
  br i1 %57, label %71, label %58

58:                                               ; preds = %55
  %59 = and i64 %1, 2305843009213693944
  br label %135

60:                                               ; preds = %54
  tail call void @free(ptr noundef nonnull %11)
  br label %213

61:                                               ; preds = %51
  tail call void @abort() #6
  unreachable

62:                                               ; preds = %17, %62
  %63 = phi i64 [ %68, %62 ], [ %18, %17 ]
  %64 = getelementptr inbounds i64, ptr %0, i64 %63
  %65 = load i64, ptr %64, align 8, !tbaa !6
  %66 = mul i64 %65, %2
  %67 = add i64 %66, %3
  %68 = add nuw i64 %63, 1
  %69 = getelementptr inbounds i64, ptr %11, i64 %63
  store i64 %67, ptr %69, align 8, !tbaa !6
  %70 = icmp eq i64 %68, %1
  br i1 %70, label %51, label %62, !llvm.loop !14

71:                                               ; preds = %208, %55
  %72 = phi i64 [ poison, %55 ], [ %209, %208 ]
  %73 = phi i64 [ 0, %55 ], [ %209, %208 ]
  %74 = phi i64 [ 0, %55 ], [ %210, %208 ]
  %75 = icmp eq i64 %56, 0
  br i1 %75, label %91, label %76

76:                                               ; preds = %71, %86
  %77 = phi i64 [ %87, %86 ], [ %73, %71 ]
  %78 = phi i64 [ %88, %86 ], [ %74, %71 ]
  %79 = phi i64 [ %89, %86 ], [ 0, %71 ]
  %80 = getelementptr inbounds i64, ptr %11, i64 %78
  %81 = load i64, ptr %80, align 8, !tbaa !6
  %82 = icmp ult i64 %81, %4
  br i1 %82, label %83, label %86

83:                                               ; preds = %76
  %84 = add i64 %77, 1
  %85 = getelementptr inbounds i64, ptr %52, i64 %77
  store i64 %81, ptr %85, align 8, !tbaa !6
  br label %86

86:                                               ; preds = %83, %76
  %87 = phi i64 [ %84, %83 ], [ %77, %76 ]
  %88 = add nuw i64 %78, 1
  %89 = add i64 %79, 1
  %90 = icmp eq i64 %89, %56
  br i1 %90, label %91, label %76, !llvm.loop !15

91:                                               ; preds = %86, %71
  %92 = phi i64 [ %72, %71 ], [ %87, %86 ]
  tail call void @free(ptr noundef nonnull %11)
  %93 = getelementptr i8, ptr %52, i64 -8
  %94 = icmp eq i64 %92, 0
  br i1 %94, label %213, label %95

95:                                               ; preds = %91
  %96 = icmp ult i64 %92, 8
  br i1 %96, label %97, label %100

97:                                               ; preds = %129, %95
  %98 = phi i64 [ %92, %95 ], [ %102, %129 ]
  %99 = phi i64 [ 0, %95 ], [ %133, %129 ]
  br label %215

100:                                              ; preds = %95
  %101 = and i64 %92, -8
  %102 = and i64 %92, 7
  br label %103

103:                                              ; preds = %103, %100
  %104 = phi i64 [ 0, %100 ], [ %127, %103 ]
  %105 = phi <2 x i64> [ zeroinitializer, %100 ], [ %123, %103 ]
  %106 = phi <2 x i64> [ zeroinitializer, %100 ], [ %124, %103 ]
  %107 = phi <2 x i64> [ zeroinitializer, %100 ], [ %125, %103 ]
  %108 = phi <2 x i64> [ zeroinitializer, %100 ], [ %126, %103 ]
  %109 = sub i64 %92, %104
  %110 = getelementptr i64, ptr %93, i64 %109
  %111 = getelementptr i8, ptr %110, i64 -8
  %112 = getelementptr i8, ptr %110, i64 -24
  %113 = getelementptr i8, ptr %110, i64 -40
  %114 = getelementptr i8, ptr %110, i64 -56
  %115 = load <2 x i64>, ptr %111, align 8, !tbaa !6
  %116 = shufflevector <2 x i64> %115, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %117 = load <2 x i64>, ptr %112, align 8, !tbaa !6
  %118 = shufflevector <2 x i64> %117, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %119 = load <2 x i64>, ptr %113, align 8, !tbaa !6
  %120 = shufflevector <2 x i64> %119, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %121 = load <2 x i64>, ptr %114, align 8, !tbaa !6
  %122 = shufflevector <2 x i64> %121, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %123 = add <2 x i64> %116, %105
  %124 = add <2 x i64> %118, %106
  %125 = add <2 x i64> %120, %107
  %126 = add <2 x i64> %122, %108
  %127 = add nuw i64 %104, 8
  %128 = icmp eq i64 %127, %101
  br i1 %128, label %129, label %103, !llvm.loop !17

129:                                              ; preds = %103
  %130 = add <2 x i64> %124, %123
  %131 = add <2 x i64> %125, %130
  %132 = add <2 x i64> %126, %131
  %133 = tail call i64 @llvm.vector.reduce.add.v2i64(<2 x i64> %132)
  %134 = icmp eq i64 %92, %101
  br i1 %134, label %213, label %97

135:                                              ; preds = %208, %58
  %136 = phi i64 [ 0, %58 ], [ %209, %208 ]
  %137 = phi i64 [ 0, %58 ], [ %210, %208 ]
  %138 = phi i64 [ 0, %58 ], [ %211, %208 ]
  %139 = getelementptr inbounds i64, ptr %11, i64 %137
  %140 = load i64, ptr %139, align 8, !tbaa !6
  %141 = icmp ult i64 %140, %4
  br i1 %141, label %142, label %145

142:                                              ; preds = %135
  %143 = add i64 %136, 1
  %144 = getelementptr inbounds i64, ptr %52, i64 %136
  store i64 %140, ptr %144, align 8, !tbaa !6
  br label %145

145:                                              ; preds = %142, %135
  %146 = phi i64 [ %143, %142 ], [ %136, %135 ]
  %147 = or disjoint i64 %137, 1
  %148 = getelementptr inbounds i64, ptr %11, i64 %147
  %149 = load i64, ptr %148, align 8, !tbaa !6
  %150 = icmp ult i64 %149, %4
  br i1 %150, label %151, label %154

151:                                              ; preds = %145
  %152 = add i64 %146, 1
  %153 = getelementptr inbounds i64, ptr %52, i64 %146
  store i64 %149, ptr %153, align 8, !tbaa !6
  br label %154

154:                                              ; preds = %151, %145
  %155 = phi i64 [ %152, %151 ], [ %146, %145 ]
  %156 = or disjoint i64 %137, 2
  %157 = getelementptr inbounds i64, ptr %11, i64 %156
  %158 = load i64, ptr %157, align 8, !tbaa !6
  %159 = icmp ult i64 %158, %4
  br i1 %159, label %160, label %163

160:                                              ; preds = %154
  %161 = add i64 %155, 1
  %162 = getelementptr inbounds i64, ptr %52, i64 %155
  store i64 %158, ptr %162, align 8, !tbaa !6
  br label %163

163:                                              ; preds = %160, %154
  %164 = phi i64 [ %161, %160 ], [ %155, %154 ]
  %165 = or disjoint i64 %137, 3
  %166 = getelementptr inbounds i64, ptr %11, i64 %165
  %167 = load i64, ptr %166, align 8, !tbaa !6
  %168 = icmp ult i64 %167, %4
  br i1 %168, label %169, label %172

169:                                              ; preds = %163
  %170 = add i64 %164, 1
  %171 = getelementptr inbounds i64, ptr %52, i64 %164
  store i64 %167, ptr %171, align 8, !tbaa !6
  br label %172

172:                                              ; preds = %169, %163
  %173 = phi i64 [ %170, %169 ], [ %164, %163 ]
  %174 = or disjoint i64 %137, 4
  %175 = getelementptr inbounds i64, ptr %11, i64 %174
  %176 = load i64, ptr %175, align 8, !tbaa !6
  %177 = icmp ult i64 %176, %4
  br i1 %177, label %178, label %181

178:                                              ; preds = %172
  %179 = add i64 %173, 1
  %180 = getelementptr inbounds i64, ptr %52, i64 %173
  store i64 %176, ptr %180, align 8, !tbaa !6
  br label %181

181:                                              ; preds = %178, %172
  %182 = phi i64 [ %179, %178 ], [ %173, %172 ]
  %183 = or disjoint i64 %137, 5
  %184 = getelementptr inbounds i64, ptr %11, i64 %183
  %185 = load i64, ptr %184, align 8, !tbaa !6
  %186 = icmp ult i64 %185, %4
  br i1 %186, label %187, label %190

187:                                              ; preds = %181
  %188 = add i64 %182, 1
  %189 = getelementptr inbounds i64, ptr %52, i64 %182
  store i64 %185, ptr %189, align 8, !tbaa !6
  br label %190

190:                                              ; preds = %187, %181
  %191 = phi i64 [ %188, %187 ], [ %182, %181 ]
  %192 = or disjoint i64 %137, 6
  %193 = getelementptr inbounds i64, ptr %11, i64 %192
  %194 = load i64, ptr %193, align 8, !tbaa !6
  %195 = icmp ult i64 %194, %4
  br i1 %195, label %196, label %199

196:                                              ; preds = %190
  %197 = add i64 %191, 1
  %198 = getelementptr inbounds i64, ptr %52, i64 %191
  store i64 %194, ptr %198, align 8, !tbaa !6
  br label %199

199:                                              ; preds = %196, %190
  %200 = phi i64 [ %197, %196 ], [ %191, %190 ]
  %201 = or disjoint i64 %137, 7
  %202 = getelementptr inbounds i64, ptr %11, i64 %201
  %203 = load i64, ptr %202, align 8, !tbaa !6
  %204 = icmp ult i64 %203, %4
  br i1 %204, label %205, label %208

205:                                              ; preds = %199
  %206 = add i64 %200, 1
  %207 = getelementptr inbounds i64, ptr %52, i64 %200
  store i64 %203, ptr %207, align 8, !tbaa !6
  br label %208

208:                                              ; preds = %205, %199
  %209 = phi i64 [ %206, %205 ], [ %200, %199 ]
  %210 = add nuw i64 %137, 8
  %211 = add i64 %138, 8
  %212 = icmp eq i64 %211, %59
  br i1 %212, label %71, label %135, !llvm.loop !18

213:                                              ; preds = %215, %129, %60, %91
  %214 = phi i64 [ 0, %91 ], [ 0, %60 ], [ %133, %129 ], [ %220, %215 ]
  tail call void @free(ptr noundef %52)
  ret i64 %214

215:                                              ; preds = %97, %215
  %216 = phi i64 [ %221, %215 ], [ %98, %97 ]
  %217 = phi i64 [ %220, %215 ], [ %99, %97 ]
  %218 = getelementptr i64, ptr %93, i64 %216
  %219 = load i64, ptr %218, align 8, !tbaa !6
  %220 = add i64 %219, %217
  %221 = add i64 %216, -1
  %222 = icmp eq i64 %221, 0
  br i1 %222, label %213, label %215, !llvm.loop !19
}

; Function Attrs: nounwind ssp uwtable(sync)
define i64 @lang_fn_filter_map_sum(ptr nocapture noundef readonly %0, i64 noundef %1, i64 noundef %2, i64 noundef %3, i64 noundef %4) local_unnamed_addr #1 {
  %6 = icmp ugt i64 %1, 2305843009213693951
  br i1 %6, label %7, label %8

7:                                                ; preds = %5
  tail call void @abort() #6
  unreachable

8:                                                ; preds = %5
  %9 = tail call i64 @llvm.umax.i64(i64 %1, i64 1)
  %10 = shl nuw i64 %9, 3
  %11 = tail call ptr @malloc(i64 noundef %10) #7
  %12 = icmp eq ptr %11, null
  br i1 %12, label %20, label %13

13:                                               ; preds = %8
  %14 = icmp eq i64 %1, 0
  br i1 %14, label %45, label %15

15:                                               ; preds = %13
  %16 = and i64 %1, 7
  %17 = icmp ult i64 %1, 8
  br i1 %17, label %21, label %18

18:                                               ; preds = %15
  %19 = and i64 %1, 2305843009213693944
  br label %90

20:                                               ; preds = %8
  tail call void @abort() #6
  unreachable

21:                                               ; preds = %163, %15
  %22 = phi i64 [ poison, %15 ], [ %164, %163 ]
  %23 = phi i64 [ 0, %15 ], [ %164, %163 ]
  %24 = phi i64 [ 0, %15 ], [ %165, %163 ]
  %25 = icmp eq i64 %16, 0
  br i1 %25, label %41, label %26

26:                                               ; preds = %21, %36
  %27 = phi i64 [ %37, %36 ], [ %23, %21 ]
  %28 = phi i64 [ %38, %36 ], [ %24, %21 ]
  %29 = phi i64 [ %39, %36 ], [ 0, %21 ]
  %30 = getelementptr inbounds i64, ptr %0, i64 %28
  %31 = load i64, ptr %30, align 8, !tbaa !6
  %32 = icmp ult i64 %31, %4
  br i1 %32, label %33, label %36

33:                                               ; preds = %26
  %34 = add i64 %27, 1
  %35 = getelementptr inbounds i64, ptr %11, i64 %27
  store i64 %31, ptr %35, align 8, !tbaa !6
  br label %36

36:                                               ; preds = %33, %26
  %37 = phi i64 [ %34, %33 ], [ %27, %26 ]
  %38 = add nuw i64 %28, 1
  %39 = add i64 %29, 1
  %40 = icmp eq i64 %39, %16
  br i1 %40, label %41, label %26, !llvm.loop !20

41:                                               ; preds = %36, %21
  %42 = phi i64 [ %22, %21 ], [ %37, %36 ]
  %43 = icmp ugt i64 %42, 2305843009213693951
  br i1 %43, label %44, label %45

44:                                               ; preds = %41
  tail call void @abort() #6
  unreachable

45:                                               ; preds = %13, %41
  %46 = phi i64 [ %42, %41 ], [ 0, %13 ]
  %47 = tail call i64 @llvm.umax.i64(i64 %46, i64 1)
  %48 = shl nuw i64 %47, 3
  %49 = tail call ptr @malloc(i64 noundef %48) #7
  %50 = icmp eq ptr %49, null
  br i1 %50, label %89, label %51

51:                                               ; preds = %45
  %52 = icmp eq i64 %46, 0
  br i1 %52, label %88, label %53

53:                                               ; preds = %51
  %54 = icmp ult i64 %46, 4
  br i1 %54, label %55, label %57

55:                                               ; preds = %86, %53
  %56 = phi i64 [ 0, %53 ], [ %58, %86 ]
  br label %209

57:                                               ; preds = %53
  %58 = and i64 %46, 2305843009213693948
  br label %59

59:                                               ; preds = %59, %57
  %60 = phi i64 [ 0, %57 ], [ %84, %59 ]
  %61 = or disjoint i64 %60, 1
  %62 = or disjoint i64 %60, 2
  %63 = or disjoint i64 %60, 3
  %64 = getelementptr inbounds i64, ptr %11, i64 %60
  %65 = getelementptr inbounds i64, ptr %11, i64 %61
  %66 = getelementptr inbounds i64, ptr %11, i64 %62
  %67 = getelementptr inbounds i64, ptr %11, i64 %63
  %68 = load i64, ptr %64, align 8, !tbaa !6
  %69 = load i64, ptr %65, align 8, !tbaa !6
  %70 = load i64, ptr %66, align 8, !tbaa !6
  %71 = load i64, ptr %67, align 8, !tbaa !6
  %72 = mul i64 %68, %2
  %73 = mul i64 %69, %2
  %74 = mul i64 %70, %2
  %75 = mul i64 %71, %2
  %76 = add i64 %72, %3
  %77 = add i64 %73, %3
  %78 = add i64 %74, %3
  %79 = add i64 %75, %3
  %80 = getelementptr inbounds i64, ptr %49, i64 %60
  %81 = getelementptr inbounds i64, ptr %49, i64 %61
  %82 = getelementptr inbounds i64, ptr %49, i64 %62
  %83 = getelementptr inbounds i64, ptr %49, i64 %63
  store i64 %76, ptr %80, align 8, !tbaa !6
  store i64 %77, ptr %81, align 8, !tbaa !6
  store i64 %78, ptr %82, align 8, !tbaa !6
  store i64 %79, ptr %83, align 8, !tbaa !6
  %84 = add nuw i64 %60, 4
  %85 = icmp eq i64 %84, %58
  br i1 %85, label %86, label %59, !llvm.loop !21

86:                                               ; preds = %59
  %87 = icmp eq i64 %46, %58
  br i1 %87, label %168, label %55

88:                                               ; preds = %51
  tail call void @free(ptr noundef %11)
  br label %218

89:                                               ; preds = %45
  tail call void @abort() #6
  unreachable

90:                                               ; preds = %163, %18
  %91 = phi i64 [ 0, %18 ], [ %164, %163 ]
  %92 = phi i64 [ 0, %18 ], [ %165, %163 ]
  %93 = phi i64 [ 0, %18 ], [ %166, %163 ]
  %94 = getelementptr inbounds i64, ptr %0, i64 %92
  %95 = load i64, ptr %94, align 8, !tbaa !6
  %96 = icmp ult i64 %95, %4
  br i1 %96, label %97, label %100

97:                                               ; preds = %90
  %98 = add i64 %91, 1
  %99 = getelementptr inbounds i64, ptr %11, i64 %91
  store i64 %95, ptr %99, align 8, !tbaa !6
  br label %100

100:                                              ; preds = %97, %90
  %101 = phi i64 [ %98, %97 ], [ %91, %90 ]
  %102 = or disjoint i64 %92, 1
  %103 = getelementptr inbounds i64, ptr %0, i64 %102
  %104 = load i64, ptr %103, align 8, !tbaa !6
  %105 = icmp ult i64 %104, %4
  br i1 %105, label %106, label %109

106:                                              ; preds = %100
  %107 = add i64 %101, 1
  %108 = getelementptr inbounds i64, ptr %11, i64 %101
  store i64 %104, ptr %108, align 8, !tbaa !6
  br label %109

109:                                              ; preds = %106, %100
  %110 = phi i64 [ %107, %106 ], [ %101, %100 ]
  %111 = or disjoint i64 %92, 2
  %112 = getelementptr inbounds i64, ptr %0, i64 %111
  %113 = load i64, ptr %112, align 8, !tbaa !6
  %114 = icmp ult i64 %113, %4
  br i1 %114, label %115, label %118

115:                                              ; preds = %109
  %116 = add i64 %110, 1
  %117 = getelementptr inbounds i64, ptr %11, i64 %110
  store i64 %113, ptr %117, align 8, !tbaa !6
  br label %118

118:                                              ; preds = %115, %109
  %119 = phi i64 [ %116, %115 ], [ %110, %109 ]
  %120 = or disjoint i64 %92, 3
  %121 = getelementptr inbounds i64, ptr %0, i64 %120
  %122 = load i64, ptr %121, align 8, !tbaa !6
  %123 = icmp ult i64 %122, %4
  br i1 %123, label %124, label %127

124:                                              ; preds = %118
  %125 = add i64 %119, 1
  %126 = getelementptr inbounds i64, ptr %11, i64 %119
  store i64 %122, ptr %126, align 8, !tbaa !6
  br label %127

127:                                              ; preds = %124, %118
  %128 = phi i64 [ %125, %124 ], [ %119, %118 ]
  %129 = or disjoint i64 %92, 4
  %130 = getelementptr inbounds i64, ptr %0, i64 %129
  %131 = load i64, ptr %130, align 8, !tbaa !6
  %132 = icmp ult i64 %131, %4
  br i1 %132, label %133, label %136

133:                                              ; preds = %127
  %134 = add i64 %128, 1
  %135 = getelementptr inbounds i64, ptr %11, i64 %128
  store i64 %131, ptr %135, align 8, !tbaa !6
  br label %136

136:                                              ; preds = %133, %127
  %137 = phi i64 [ %134, %133 ], [ %128, %127 ]
  %138 = or disjoint i64 %92, 5
  %139 = getelementptr inbounds i64, ptr %0, i64 %138
  %140 = load i64, ptr %139, align 8, !tbaa !6
  %141 = icmp ult i64 %140, %4
  br i1 %141, label %142, label %145

142:                                              ; preds = %136
  %143 = add i64 %137, 1
  %144 = getelementptr inbounds i64, ptr %11, i64 %137
  store i64 %140, ptr %144, align 8, !tbaa !6
  br label %145

145:                                              ; preds = %142, %136
  %146 = phi i64 [ %143, %142 ], [ %137, %136 ]
  %147 = or disjoint i64 %92, 6
  %148 = getelementptr inbounds i64, ptr %0, i64 %147
  %149 = load i64, ptr %148, align 8, !tbaa !6
  %150 = icmp ult i64 %149, %4
  br i1 %150, label %151, label %154

151:                                              ; preds = %145
  %152 = add i64 %146, 1
  %153 = getelementptr inbounds i64, ptr %11, i64 %146
  store i64 %149, ptr %153, align 8, !tbaa !6
  br label %154

154:                                              ; preds = %151, %145
  %155 = phi i64 [ %152, %151 ], [ %146, %145 ]
  %156 = or disjoint i64 %92, 7
  %157 = getelementptr inbounds i64, ptr %0, i64 %156
  %158 = load i64, ptr %157, align 8, !tbaa !6
  %159 = icmp ult i64 %158, %4
  br i1 %159, label %160, label %163

160:                                              ; preds = %154
  %161 = add i64 %155, 1
  %162 = getelementptr inbounds i64, ptr %11, i64 %155
  store i64 %158, ptr %162, align 8, !tbaa !6
  br label %163

163:                                              ; preds = %160, %154
  %164 = phi i64 [ %161, %160 ], [ %155, %154 ]
  %165 = add nuw i64 %92, 8
  %166 = add i64 %93, 8
  %167 = icmp eq i64 %166, %19
  br i1 %167, label %21, label %90, !llvm.loop !22

168:                                              ; preds = %209, %86
  tail call void @free(ptr noundef nonnull %11)
  %169 = getelementptr i8, ptr %49, i64 -8
  %170 = icmp ult i64 %46, 8
  br i1 %170, label %171, label %174

171:                                              ; preds = %203, %168
  %172 = phi i64 [ %46, %168 ], [ %176, %203 ]
  %173 = phi i64 [ 0, %168 ], [ %207, %203 ]
  br label %220

174:                                              ; preds = %168
  %175 = and i64 %46, 2305843009213693944
  %176 = and i64 %46, 7
  br label %177

177:                                              ; preds = %177, %174
  %178 = phi i64 [ 0, %174 ], [ %201, %177 ]
  %179 = phi <2 x i64> [ zeroinitializer, %174 ], [ %197, %177 ]
  %180 = phi <2 x i64> [ zeroinitializer, %174 ], [ %198, %177 ]
  %181 = phi <2 x i64> [ zeroinitializer, %174 ], [ %199, %177 ]
  %182 = phi <2 x i64> [ zeroinitializer, %174 ], [ %200, %177 ]
  %183 = sub i64 %46, %178
  %184 = getelementptr i64, ptr %169, i64 %183
  %185 = getelementptr i8, ptr %184, i64 -8
  %186 = getelementptr i8, ptr %184, i64 -24
  %187 = getelementptr i8, ptr %184, i64 -40
  %188 = getelementptr i8, ptr %184, i64 -56
  %189 = load <2 x i64>, ptr %185, align 8, !tbaa !6
  %190 = shufflevector <2 x i64> %189, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %191 = load <2 x i64>, ptr %186, align 8, !tbaa !6
  %192 = shufflevector <2 x i64> %191, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %193 = load <2 x i64>, ptr %187, align 8, !tbaa !6
  %194 = shufflevector <2 x i64> %193, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %195 = load <2 x i64>, ptr %188, align 8, !tbaa !6
  %196 = shufflevector <2 x i64> %195, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %197 = add <2 x i64> %190, %179
  %198 = add <2 x i64> %192, %180
  %199 = add <2 x i64> %194, %181
  %200 = add <2 x i64> %196, %182
  %201 = add nuw i64 %178, 8
  %202 = icmp eq i64 %201, %175
  br i1 %202, label %203, label %177, !llvm.loop !23

203:                                              ; preds = %177
  %204 = add <2 x i64> %198, %197
  %205 = add <2 x i64> %199, %204
  %206 = add <2 x i64> %200, %205
  %207 = tail call i64 @llvm.vector.reduce.add.v2i64(<2 x i64> %206)
  %208 = icmp eq i64 %46, %175
  br i1 %208, label %218, label %171

209:                                              ; preds = %55, %209
  %210 = phi i64 [ %215, %209 ], [ %56, %55 ]
  %211 = getelementptr inbounds i64, ptr %11, i64 %210
  %212 = load i64, ptr %211, align 8, !tbaa !6
  %213 = mul i64 %212, %2
  %214 = add i64 %213, %3
  %215 = add nuw i64 %210, 1
  %216 = getelementptr inbounds i64, ptr %49, i64 %210
  store i64 %214, ptr %216, align 8, !tbaa !6
  %217 = icmp eq i64 %215, %46
  br i1 %217, label %168, label %209, !llvm.loop !24

218:                                              ; preds = %220, %203, %88
  %219 = phi i64 [ 0, %88 ], [ %207, %203 ], [ %225, %220 ]
  tail call void @free(ptr noundef nonnull %49)
  ret i64 %219

220:                                              ; preds = %171, %220
  %221 = phi i64 [ %226, %220 ], [ %172, %171 ]
  %222 = phi i64 [ %225, %220 ], [ %173, %171 ]
  %223 = getelementptr i64, ptr %169, i64 %221
  %224 = load i64, ptr %223, align 8, !tbaa !6
  %225 = add i64 %224, %222
  %226 = add i64 %221, -1
  %227 = icmp eq i64 %226, 0
  br i1 %227, label %218, label %220, !llvm.loop !25
}

; Function Attrs: nounwind ssp uwtable(sync)
define i64 @lang_fn_mapped_filter_count(ptr nocapture noundef readonly %0, i64 noundef %1, i64 noundef %2, i64 noundef %3, i64 noundef %4) local_unnamed_addr #1 {
  %6 = icmp ugt i64 %1, 2305843009213693951
  br i1 %6, label %7, label %8

7:                                                ; preds = %5
  tail call void @abort() #6
  unreachable

8:                                                ; preds = %5
  %9 = tail call i64 @llvm.umax.i64(i64 %1, i64 1)
  %10 = shl nuw i64 %9, 3
  %11 = tail call ptr @malloc(i64 noundef %10) #7
  %12 = icmp eq ptr %11, null
  br i1 %12, label %50, label %13

13:                                               ; preds = %8
  %14 = icmp eq i64 %1, 0
  br i1 %14, label %103, label %15

15:                                               ; preds = %13
  %16 = icmp ult i64 %1, 4
  br i1 %16, label %17, label %19

17:                                               ; preds = %48, %15
  %18 = phi i64 [ 0, %15 ], [ %20, %48 ]
  br label %51

19:                                               ; preds = %15
  %20 = and i64 %1, 2305843009213693948
  br label %21

21:                                               ; preds = %21, %19
  %22 = phi i64 [ 0, %19 ], [ %46, %21 ]
  %23 = or disjoint i64 %22, 1
  %24 = or disjoint i64 %22, 2
  %25 = or disjoint i64 %22, 3
  %26 = getelementptr inbounds i64, ptr %0, i64 %22
  %27 = getelementptr inbounds i64, ptr %0, i64 %23
  %28 = getelementptr inbounds i64, ptr %0, i64 %24
  %29 = getelementptr inbounds i64, ptr %0, i64 %25
  %30 = load i64, ptr %26, align 8, !tbaa !6
  %31 = load i64, ptr %27, align 8, !tbaa !6
  %32 = load i64, ptr %28, align 8, !tbaa !6
  %33 = load i64, ptr %29, align 8, !tbaa !6
  %34 = mul i64 %30, %2
  %35 = mul i64 %31, %2
  %36 = mul i64 %32, %2
  %37 = mul i64 %33, %2
  %38 = add i64 %34, %3
  %39 = add i64 %35, %3
  %40 = add i64 %36, %3
  %41 = add i64 %37, %3
  %42 = getelementptr inbounds i64, ptr %11, i64 %22
  %43 = getelementptr inbounds i64, ptr %11, i64 %23
  %44 = getelementptr inbounds i64, ptr %11, i64 %24
  %45 = getelementptr inbounds i64, ptr %11, i64 %25
  store i64 %38, ptr %42, align 8, !tbaa !6
  store i64 %39, ptr %43, align 8, !tbaa !6
  store i64 %40, ptr %44, align 8, !tbaa !6
  store i64 %41, ptr %45, align 8, !tbaa !6
  %46 = add nuw i64 %22, 4
  %47 = icmp eq i64 %46, %20
  br i1 %47, label %48, label %21, !llvm.loop !26

48:                                               ; preds = %21
  %49 = icmp eq i64 %20, %1
  br i1 %49, label %60, label %17

50:                                               ; preds = %8
  tail call void @abort() #6
  unreachable

51:                                               ; preds = %17, %51
  %52 = phi i64 [ %57, %51 ], [ %18, %17 ]
  %53 = getelementptr inbounds i64, ptr %0, i64 %52
  %54 = load i64, ptr %53, align 8, !tbaa !6
  %55 = mul i64 %54, %2
  %56 = add i64 %55, %3
  %57 = add nuw i64 %52, 1
  %58 = getelementptr inbounds i64, ptr %11, i64 %52
  store i64 %56, ptr %58, align 8, !tbaa !6
  %59 = icmp eq i64 %57, %1
  br i1 %59, label %60, label %51, !llvm.loop !27

60:                                               ; preds = %51, %48
  %61 = icmp ult i64 %1, 8
  br i1 %61, label %62, label %65

62:                                               ; preds = %97, %60
  %63 = phi i64 [ 0, %60 ], [ %101, %97 ]
  %64 = phi i64 [ 0, %60 ], [ %66, %97 ]
  br label %105

65:                                               ; preds = %60
  %66 = and i64 %1, 2305843009213693944
  %67 = insertelement <2 x i64> poison, i64 %4, i64 0
  %68 = shufflevector <2 x i64> %67, <2 x i64> poison, <2 x i32> zeroinitializer
  br label %69

69:                                               ; preds = %69, %65
  %70 = phi i64 [ 0, %65 ], [ %95, %69 ]
  %71 = phi <2 x i64> [ zeroinitializer, %65 ], [ %91, %69 ]
  %72 = phi <2 x i64> [ zeroinitializer, %65 ], [ %92, %69 ]
  %73 = phi <2 x i64> [ zeroinitializer, %65 ], [ %93, %69 ]
  %74 = phi <2 x i64> [ zeroinitializer, %65 ], [ %94, %69 ]
  %75 = getelementptr inbounds i64, ptr %11, i64 %70
  %76 = getelementptr inbounds i8, ptr %75, i64 16
  %77 = getelementptr inbounds i8, ptr %75, i64 32
  %78 = getelementptr inbounds i8, ptr %75, i64 48
  %79 = load <2 x i64>, ptr %75, align 8, !tbaa !6
  %80 = load <2 x i64>, ptr %76, align 8, !tbaa !6
  %81 = load <2 x i64>, ptr %77, align 8, !tbaa !6
  %82 = load <2 x i64>, ptr %78, align 8, !tbaa !6
  %83 = icmp ult <2 x i64> %79, %68
  %84 = icmp ult <2 x i64> %80, %68
  %85 = icmp ult <2 x i64> %81, %68
  %86 = icmp ult <2 x i64> %82, %68
  %87 = zext <2 x i1> %83 to <2 x i64>
  %88 = zext <2 x i1> %84 to <2 x i64>
  %89 = zext <2 x i1> %85 to <2 x i64>
  %90 = zext <2 x i1> %86 to <2 x i64>
  %91 = add <2 x i64> %71, %87
  %92 = add <2 x i64> %72, %88
  %93 = add <2 x i64> %73, %89
  %94 = add <2 x i64> %74, %90
  %95 = add nuw i64 %70, 8
  %96 = icmp eq i64 %95, %66
  br i1 %96, label %97, label %69, !llvm.loop !28

97:                                               ; preds = %69
  %98 = add <2 x i64> %92, %91
  %99 = add <2 x i64> %93, %98
  %100 = add <2 x i64> %94, %99
  %101 = tail call i64 @llvm.vector.reduce.add.v2i64(<2 x i64> %100)
  %102 = icmp eq i64 %66, %1
  br i1 %102, label %103, label %62

103:                                              ; preds = %105, %97, %13
  %104 = phi i64 [ 0, %13 ], [ %101, %97 ], [ %112, %105 ]
  tail call void @free(ptr noundef nonnull %11)
  ret i64 %104

105:                                              ; preds = %62, %105
  %106 = phi i64 [ %112, %105 ], [ %63, %62 ]
  %107 = phi i64 [ %113, %105 ], [ %64, %62 ]
  %108 = getelementptr inbounds i64, ptr %11, i64 %107
  %109 = load i64, ptr %108, align 8, !tbaa !6
  %110 = icmp ult i64 %109, %4
  %111 = zext i1 %110 to i64
  %112 = add i64 %106, %111
  %113 = add nuw i64 %107, 1
  %114 = icmp eq i64 %113, %1
  br i1 %114, label %103, label %105, !llvm.loop !29
}

; Function Attrs: nounwind ssp uwtable(sync)
define i64 @lang_fn_constant_filter_sum(ptr nocapture noundef readnone %0, i64 noundef %1, i64 noundef %2, i64 noundef %3, i64 noundef %4) local_unnamed_addr #1 {
  %6 = icmp ugt i64 %1, 2305843009213693951
  br i1 %6, label %7, label %8

7:                                                ; preds = %5
  tail call void @abort() #6
  unreachable

8:                                                ; preds = %5
  %9 = tail call i64 @llvm.umax.i64(i64 %1, i64 1)
  %10 = shl nuw i64 %9, 3
  %11 = tail call ptr @malloc(i64 noundef %10) #7
  %12 = icmp eq ptr %11, null
  br i1 %12, label %33, label %13

13:                                               ; preds = %8
  %14 = icmp eq i64 %1, 0
  br i1 %14, label %34, label %15

15:                                               ; preds = %13
  %16 = icmp ult i64 %1, 8
  br i1 %16, label %17, label %19

17:                                               ; preds = %31, %15
  %18 = phi i64 [ 0, %15 ], [ %20, %31 ]
  br label %45

19:                                               ; preds = %15
  %20 = and i64 %1, 2305843009213693944
  %21 = insertelement <2 x i64> poison, i64 %3, i64 0
  %22 = shufflevector <2 x i64> %21, <2 x i64> poison, <2 x i32> zeroinitializer
  br label %23

23:                                               ; preds = %23, %19
  %24 = phi i64 [ 0, %19 ], [ %29, %23 ]
  %25 = getelementptr inbounds i64, ptr %11, i64 %24
  %26 = getelementptr inbounds i8, ptr %25, i64 16
  %27 = getelementptr inbounds i8, ptr %25, i64 32
  %28 = getelementptr inbounds i8, ptr %25, i64 48
  store <2 x i64> %22, ptr %25, align 8, !tbaa !6
  store <2 x i64> %22, ptr %26, align 8, !tbaa !6
  store <2 x i64> %22, ptr %27, align 8, !tbaa !6
  store <2 x i64> %22, ptr %28, align 8, !tbaa !6
  %29 = add nuw i64 %24, 8
  %30 = icmp eq i64 %29, %20
  br i1 %30, label %31, label %23, !llvm.loop !30

31:                                               ; preds = %23
  %32 = icmp eq i64 %20, %1
  br i1 %32, label %34, label %17

33:                                               ; preds = %8
  tail call void @abort() #6
  unreachable

34:                                               ; preds = %45, %31, %13
  %35 = tail call ptr @malloc(i64 noundef %10) #7
  %36 = icmp eq ptr %35, null
  br i1 %36, label %44, label %37

37:                                               ; preds = %34
  br i1 %14, label %43, label %38

38:                                               ; preds = %37
  %39 = and i64 %1, 7
  %40 = icmp ult i64 %1, 8
  br i1 %40, label %50, label %41

41:                                               ; preds = %38
  %42 = and i64 %1, 2305843009213693944
  br label %114

43:                                               ; preds = %37
  tail call void @free(ptr noundef nonnull %11)
  br label %192

44:                                               ; preds = %34
  tail call void @abort() #6
  unreachable

45:                                               ; preds = %17, %45
  %46 = phi i64 [ %47, %45 ], [ %18, %17 ]
  %47 = add nuw i64 %46, 1
  %48 = getelementptr inbounds i64, ptr %11, i64 %46
  store i64 %3, ptr %48, align 8, !tbaa !6
  %49 = icmp eq i64 %47, %1
  br i1 %49, label %34, label %45, !llvm.loop !31

50:                                               ; preds = %187, %38
  %51 = phi i64 [ poison, %38 ], [ %188, %187 ]
  %52 = phi i64 [ 0, %38 ], [ %188, %187 ]
  %53 = phi i64 [ 0, %38 ], [ %189, %187 ]
  %54 = icmp eq i64 %39, 0
  br i1 %54, label %70, label %55

55:                                               ; preds = %50, %65
  %56 = phi i64 [ %66, %65 ], [ %52, %50 ]
  %57 = phi i64 [ %67, %65 ], [ %53, %50 ]
  %58 = phi i64 [ %68, %65 ], [ 0, %50 ]
  %59 = getelementptr inbounds i64, ptr %11, i64 %57
  %60 = load i64, ptr %59, align 8, !tbaa !6
  %61 = icmp ult i64 %60, %4
  br i1 %61, label %62, label %65

62:                                               ; preds = %55
  %63 = add i64 %56, 1
  %64 = getelementptr inbounds i64, ptr %35, i64 %56
  store i64 %60, ptr %64, align 8, !tbaa !6
  br label %65

65:                                               ; preds = %62, %55
  %66 = phi i64 [ %63, %62 ], [ %56, %55 ]
  %67 = add nuw i64 %57, 1
  %68 = add i64 %58, 1
  %69 = icmp eq i64 %68, %39
  br i1 %69, label %70, label %55, !llvm.loop !32

70:                                               ; preds = %65, %50
  %71 = phi i64 [ %51, %50 ], [ %66, %65 ]
  tail call void @free(ptr noundef nonnull %11)
  %72 = getelementptr i8, ptr %35, i64 -8
  %73 = icmp eq i64 %71, 0
  br i1 %73, label %192, label %74

74:                                               ; preds = %70
  %75 = icmp ult i64 %71, 8
  br i1 %75, label %76, label %79

76:                                               ; preds = %108, %74
  %77 = phi i64 [ %71, %74 ], [ %81, %108 ]
  %78 = phi i64 [ 0, %74 ], [ %112, %108 ]
  br label %194

79:                                               ; preds = %74
  %80 = and i64 %71, -8
  %81 = and i64 %71, 7
  br label %82

82:                                               ; preds = %82, %79
  %83 = phi i64 [ 0, %79 ], [ %106, %82 ]
  %84 = phi <2 x i64> [ zeroinitializer, %79 ], [ %102, %82 ]
  %85 = phi <2 x i64> [ zeroinitializer, %79 ], [ %103, %82 ]
  %86 = phi <2 x i64> [ zeroinitializer, %79 ], [ %104, %82 ]
  %87 = phi <2 x i64> [ zeroinitializer, %79 ], [ %105, %82 ]
  %88 = sub i64 %71, %83
  %89 = getelementptr i64, ptr %72, i64 %88
  %90 = getelementptr i8, ptr %89, i64 -8
  %91 = getelementptr i8, ptr %89, i64 -24
  %92 = getelementptr i8, ptr %89, i64 -40
  %93 = getelementptr i8, ptr %89, i64 -56
  %94 = load <2 x i64>, ptr %90, align 8, !tbaa !6
  %95 = shufflevector <2 x i64> %94, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %96 = load <2 x i64>, ptr %91, align 8, !tbaa !6
  %97 = shufflevector <2 x i64> %96, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %98 = load <2 x i64>, ptr %92, align 8, !tbaa !6
  %99 = shufflevector <2 x i64> %98, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %100 = load <2 x i64>, ptr %93, align 8, !tbaa !6
  %101 = shufflevector <2 x i64> %100, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %102 = add <2 x i64> %95, %84
  %103 = add <2 x i64> %97, %85
  %104 = add <2 x i64> %99, %86
  %105 = add <2 x i64> %101, %87
  %106 = add nuw i64 %83, 8
  %107 = icmp eq i64 %106, %80
  br i1 %107, label %108, label %82, !llvm.loop !33

108:                                              ; preds = %82
  %109 = add <2 x i64> %103, %102
  %110 = add <2 x i64> %104, %109
  %111 = add <2 x i64> %105, %110
  %112 = tail call i64 @llvm.vector.reduce.add.v2i64(<2 x i64> %111)
  %113 = icmp eq i64 %71, %80
  br i1 %113, label %192, label %76

114:                                              ; preds = %187, %41
  %115 = phi i64 [ 0, %41 ], [ %188, %187 ]
  %116 = phi i64 [ 0, %41 ], [ %189, %187 ]
  %117 = phi i64 [ 0, %41 ], [ %190, %187 ]
  %118 = getelementptr inbounds i64, ptr %11, i64 %116
  %119 = load i64, ptr %118, align 8, !tbaa !6
  %120 = icmp ult i64 %119, %4
  br i1 %120, label %121, label %124

121:                                              ; preds = %114
  %122 = add i64 %115, 1
  %123 = getelementptr inbounds i64, ptr %35, i64 %115
  store i64 %119, ptr %123, align 8, !tbaa !6
  br label %124

124:                                              ; preds = %121, %114
  %125 = phi i64 [ %122, %121 ], [ %115, %114 ]
  %126 = or disjoint i64 %116, 1
  %127 = getelementptr inbounds i64, ptr %11, i64 %126
  %128 = load i64, ptr %127, align 8, !tbaa !6
  %129 = icmp ult i64 %128, %4
  br i1 %129, label %130, label %133

130:                                              ; preds = %124
  %131 = add i64 %125, 1
  %132 = getelementptr inbounds i64, ptr %35, i64 %125
  store i64 %128, ptr %132, align 8, !tbaa !6
  br label %133

133:                                              ; preds = %130, %124
  %134 = phi i64 [ %131, %130 ], [ %125, %124 ]
  %135 = or disjoint i64 %116, 2
  %136 = getelementptr inbounds i64, ptr %11, i64 %135
  %137 = load i64, ptr %136, align 8, !tbaa !6
  %138 = icmp ult i64 %137, %4
  br i1 %138, label %139, label %142

139:                                              ; preds = %133
  %140 = add i64 %134, 1
  %141 = getelementptr inbounds i64, ptr %35, i64 %134
  store i64 %137, ptr %141, align 8, !tbaa !6
  br label %142

142:                                              ; preds = %139, %133
  %143 = phi i64 [ %140, %139 ], [ %134, %133 ]
  %144 = or disjoint i64 %116, 3
  %145 = getelementptr inbounds i64, ptr %11, i64 %144
  %146 = load i64, ptr %145, align 8, !tbaa !6
  %147 = icmp ult i64 %146, %4
  br i1 %147, label %148, label %151

148:                                              ; preds = %142
  %149 = add i64 %143, 1
  %150 = getelementptr inbounds i64, ptr %35, i64 %143
  store i64 %146, ptr %150, align 8, !tbaa !6
  br label %151

151:                                              ; preds = %148, %142
  %152 = phi i64 [ %149, %148 ], [ %143, %142 ]
  %153 = or disjoint i64 %116, 4
  %154 = getelementptr inbounds i64, ptr %11, i64 %153
  %155 = load i64, ptr %154, align 8, !tbaa !6
  %156 = icmp ult i64 %155, %4
  br i1 %156, label %157, label %160

157:                                              ; preds = %151
  %158 = add i64 %152, 1
  %159 = getelementptr inbounds i64, ptr %35, i64 %152
  store i64 %155, ptr %159, align 8, !tbaa !6
  br label %160

160:                                              ; preds = %157, %151
  %161 = phi i64 [ %158, %157 ], [ %152, %151 ]
  %162 = or disjoint i64 %116, 5
  %163 = getelementptr inbounds i64, ptr %11, i64 %162
  %164 = load i64, ptr %163, align 8, !tbaa !6
  %165 = icmp ult i64 %164, %4
  br i1 %165, label %166, label %169

166:                                              ; preds = %160
  %167 = add i64 %161, 1
  %168 = getelementptr inbounds i64, ptr %35, i64 %161
  store i64 %164, ptr %168, align 8, !tbaa !6
  br label %169

169:                                              ; preds = %166, %160
  %170 = phi i64 [ %167, %166 ], [ %161, %160 ]
  %171 = or disjoint i64 %116, 6
  %172 = getelementptr inbounds i64, ptr %11, i64 %171
  %173 = load i64, ptr %172, align 8, !tbaa !6
  %174 = icmp ult i64 %173, %4
  br i1 %174, label %175, label %178

175:                                              ; preds = %169
  %176 = add i64 %170, 1
  %177 = getelementptr inbounds i64, ptr %35, i64 %170
  store i64 %173, ptr %177, align 8, !tbaa !6
  br label %178

178:                                              ; preds = %175, %169
  %179 = phi i64 [ %176, %175 ], [ %170, %169 ]
  %180 = or disjoint i64 %116, 7
  %181 = getelementptr inbounds i64, ptr %11, i64 %180
  %182 = load i64, ptr %181, align 8, !tbaa !6
  %183 = icmp ult i64 %182, %4
  br i1 %183, label %184, label %187

184:                                              ; preds = %178
  %185 = add i64 %179, 1
  %186 = getelementptr inbounds i64, ptr %35, i64 %179
  store i64 %182, ptr %186, align 8, !tbaa !6
  br label %187

187:                                              ; preds = %184, %178
  %188 = phi i64 [ %185, %184 ], [ %179, %178 ]
  %189 = add nuw i64 %116, 8
  %190 = add i64 %117, 8
  %191 = icmp eq i64 %190, %42
  br i1 %191, label %50, label %114, !llvm.loop !34

192:                                              ; preds = %194, %108, %43, %70
  %193 = phi i64 [ 0, %70 ], [ 0, %43 ], [ %112, %108 ], [ %199, %194 ]
  tail call void @free(ptr noundef %35)
  ret i64 %193

194:                                              ; preds = %76, %194
  %195 = phi i64 [ %200, %194 ], [ %77, %76 ]
  %196 = phi i64 [ %199, %194 ], [ %78, %76 ]
  %197 = getelementptr i64, ptr %72, i64 %195
  %198 = load i64, ptr %197, align 8, !tbaa !6
  %199 = add i64 %198, %196
  %200 = add i64 %195, -1
  %201 = icmp eq i64 %200, 0
  br i1 %201, label %192, label %194, !llvm.loop !35
}

; Function Attrs: cold noreturn nounwind
declare void @abort() local_unnamed_addr #2

; Function Attrs: mustprogress nofree nounwind willreturn allockind("alloc,uninitialized") allocsize(0) memory(inaccessiblemem: readwrite)
declare noalias noundef ptr @malloc(i64 noundef) local_unnamed_addr #3

; Function Attrs: mustprogress nounwind willreturn allockind("free") memory(argmem: readwrite, inaccessiblemem: readwrite)
declare void @free(ptr allocptr nocapture noundef) local_unnamed_addr #4

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare i64 @llvm.umax.i64(i64, i64) #5

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare i64 @llvm.vector.reduce.add.v2i64(<2 x i64>) #5

attributes #0 = { mustprogress nofree norecurse nosync nounwind ssp willreturn memory(none) uwtable(sync) "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-m3" "target-features"="+aes,+bf16,+bti,+ccidx,+complxnum,+crc,+dit,+dotprod,+flagm,+fp-armv8,+fp16fml,+fpac,+fullfp16,+hcx,+i8mm,+jsconv,+lse,+neon,+pauth,+perfmon,+predres,+ras,+rcpc,+rdm,+sb,+sha2,+sha3,+ssbs,+v8.1a,+v8.2a,+v8.3a,+v8.4a,+v8.5a,+v8.6a,+v8a,+zcm,+zcz" }
attributes #1 = { nounwind ssp uwtable(sync) "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-m3" "target-features"="+aes,+bf16,+bti,+ccidx,+complxnum,+crc,+dit,+dotprod,+flagm,+fp-armv8,+fp16fml,+fpac,+fullfp16,+hcx,+i8mm,+jsconv,+lse,+neon,+pauth,+perfmon,+predres,+ras,+rcpc,+rdm,+sb,+sha2,+sha3,+ssbs,+v8.1a,+v8.2a,+v8.3a,+v8.4a,+v8.5a,+v8.6a,+v8a,+zcm,+zcz" }
attributes #2 = { cold noreturn nounwind "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-m3" "target-features"="+aes,+bf16,+bti,+ccidx,+complxnum,+crc,+dit,+dotprod,+flagm,+fp-armv8,+fp16fml,+fpac,+fullfp16,+hcx,+i8mm,+jsconv,+lse,+neon,+pauth,+perfmon,+predres,+ras,+rcpc,+rdm,+sb,+sha2,+sha3,+ssbs,+v8.1a,+v8.2a,+v8.3a,+v8.4a,+v8.5a,+v8.6a,+v8a,+zcm,+zcz" }
attributes #3 = { mustprogress nofree nounwind willreturn allockind("alloc,uninitialized") allocsize(0) memory(inaccessiblemem: readwrite) "alloc-family"="malloc" "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-m3" "target-features"="+aes,+bf16,+bti,+ccidx,+complxnum,+crc,+dit,+dotprod,+flagm,+fp-armv8,+fp16fml,+fpac,+fullfp16,+hcx,+i8mm,+jsconv,+lse,+neon,+pauth,+perfmon,+predres,+ras,+rcpc,+rdm,+sb,+sha2,+sha3,+ssbs,+v8.1a,+v8.2a,+v8.3a,+v8.4a,+v8.5a,+v8.6a,+v8a,+zcm,+zcz" }
attributes #4 = { mustprogress nounwind willreturn allockind("free") memory(argmem: readwrite, inaccessiblemem: readwrite) "alloc-family"="malloc" "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-m3" "target-features"="+aes,+bf16,+bti,+ccidx,+complxnum,+crc,+dit,+dotprod,+flagm,+fp-armv8,+fp16fml,+fpac,+fullfp16,+hcx,+i8mm,+jsconv,+lse,+neon,+pauth,+perfmon,+predres,+ras,+rcpc,+rdm,+sb,+sha2,+sha3,+ssbs,+v8.1a,+v8.2a,+v8.3a,+v8.4a,+v8.5a,+v8.6a,+v8a,+zcm,+zcz" }
attributes #5 = { nocallback nofree nosync nounwind speculatable willreturn memory(none) }
attributes #6 = { cold noreturn nounwind }
attributes #7 = { allocsize(0) }

!llvm.module.flags = !{!0, !1, !2, !3, !4}
!llvm.ident = !{!5}

!0 = !{i32 2, !"SDK Version", [2 x i32] [i32 26, i32 2]}
!1 = !{i32 1, !"wchar_size", i32 4}
!2 = !{i32 8, !"PIC Level", i32 2}
!3 = !{i32 7, !"uwtable", i32 1}
!4 = !{i32 7, !"frame-pointer", i32 1}
!5 = !{!"Apple clang version 17.0.0 (clang-1700.6.3.2)"}
!6 = !{!7, !7, i64 0}
!7 = !{!"long long", !8, i64 0}
!8 = !{!"omnipotent char", !9, i64 0}
!9 = !{!"Simple C/C++ TBAA"}
!10 = distinct !{!10, !11, !12, !13}
!11 = !{!"llvm.loop.mustprogress"}
!12 = !{!"llvm.loop.isvectorized", i32 1}
!13 = !{!"llvm.loop.unroll.runtime.disable"}
!14 = distinct !{!14, !11, !12}
!15 = distinct !{!15, !16}
!16 = !{!"llvm.loop.unroll.disable"}
!17 = distinct !{!17, !11, !12, !13}
!18 = distinct !{!18, !11}
!19 = distinct !{!19, !11, !13, !12}
!20 = distinct !{!20, !16}
!21 = distinct !{!21, !11, !12, !13}
!22 = distinct !{!22, !11}
!23 = distinct !{!23, !11, !12, !13}
!24 = distinct !{!24, !11, !12}
!25 = distinct !{!25, !11, !13, !12}
!26 = distinct !{!26, !11, !12, !13}
!27 = distinct !{!27, !11, !12}
!28 = distinct !{!28, !11, !12, !13}
!29 = distinct !{!29, !11, !13, !12}
!30 = distinct !{!30, !11, !12, !13}
!31 = distinct !{!31, !11, !13, !12}
!32 = distinct !{!32, !16}
!33 = distinct !{!33, !11, !12, !13}
!34 = distinct !{!34, !11}
!35 = distinct !{!35, !11, !13, !12}
