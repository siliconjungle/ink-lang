; ModuleID = '/Users/jamesaddison/Documents/Codex/2026-10-09/wha/outputs/verified-language/build/collection-proof/lang_staged.o.c'
source_filename = "/Users/jamesaddison/Documents/Codex/2026-10-09/wha/outputs/verified-language/build/collection-proof/lang_staged.o.c"
target datalayout = "e-m:o-i64:64-i128:128-n32:64-S128-Fn32"
target triple = "arm64-apple-macosx15.0.0"

; Function Attrs: nounwind ssp uwtable(sync)
define i64 @lang_fn_two_maps(ptr nocapture noundef readonly %0, i64 noundef %1, i64 noundef %2, i64 noundef %3) local_unnamed_addr #0 {
  %5 = icmp ugt i64 %1, 2305843009213693951
  br i1 %5, label %6, label %7

6:                                                ; preds = %4
  tail call void @abort() #5
  unreachable

7:                                                ; preds = %4
  %8 = tail call i64 @llvm.umax.i64(i64 %1, i64 1)
  %9 = shl nuw i64 %8, 3
  %10 = tail call ptr @malloc(i64 noundef %9) #6
  %11 = icmp eq ptr %10, null
  br i1 %11, label %45, label %12

12:                                               ; preds = %7
  %13 = icmp eq i64 %1, 0
  br i1 %13, label %46, label %14

14:                                               ; preds = %12
  %15 = icmp ult i64 %1, 4
  br i1 %15, label %16, label %18

16:                                               ; preds = %43, %14
  %17 = phi i64 [ 0, %14 ], [ %19, %43 ]
  br label %82

18:                                               ; preds = %14
  %19 = and i64 %1, 2305843009213693948
  br label %20

20:                                               ; preds = %20, %18
  %21 = phi i64 [ 0, %18 ], [ %41, %20 ]
  %22 = or disjoint i64 %21, 1
  %23 = or disjoint i64 %21, 2
  %24 = or disjoint i64 %21, 3
  %25 = getelementptr inbounds i64, ptr %0, i64 %21
  %26 = getelementptr inbounds i64, ptr %0, i64 %22
  %27 = getelementptr inbounds i64, ptr %0, i64 %23
  %28 = getelementptr inbounds i64, ptr %0, i64 %24
  %29 = load i64, ptr %25, align 8, !tbaa !6
  %30 = load i64, ptr %26, align 8, !tbaa !6
  %31 = load i64, ptr %27, align 8, !tbaa !6
  %32 = load i64, ptr %28, align 8, !tbaa !6
  %33 = mul i64 %29, %2
  %34 = mul i64 %30, %2
  %35 = mul i64 %31, %2
  %36 = mul i64 %32, %2
  %37 = getelementptr inbounds i64, ptr %10, i64 %21
  %38 = getelementptr inbounds i64, ptr %10, i64 %22
  %39 = getelementptr inbounds i64, ptr %10, i64 %23
  %40 = getelementptr inbounds i64, ptr %10, i64 %24
  store i64 %33, ptr %37, align 8, !tbaa !6
  store i64 %34, ptr %38, align 8, !tbaa !6
  store i64 %35, ptr %39, align 8, !tbaa !6
  store i64 %36, ptr %40, align 8, !tbaa !6
  %41 = add nuw i64 %21, 4
  %42 = icmp eq i64 %41, %19
  br i1 %42, label %43, label %20, !llvm.loop !10

43:                                               ; preds = %20
  %44 = icmp eq i64 %19, %1
  br i1 %44, label %46, label %16

45:                                               ; preds = %7
  tail call void @abort() #5
  unreachable

46:                                               ; preds = %82, %43, %12
  %47 = tail call ptr @malloc(i64 noundef %9) #6
  %48 = icmp eq ptr %47, null
  br i1 %48, label %81, label %49

49:                                               ; preds = %46
  br i1 %13, label %80, label %50

50:                                               ; preds = %49
  %51 = icmp ult i64 %1, 8
  br i1 %51, label %52, label %54

52:                                               ; preds = %78, %50
  %53 = phi i64 [ 0, %50 ], [ %55, %78 ]
  br label %130

54:                                               ; preds = %50
  %55 = and i64 %1, 2305843009213693944
  %56 = insertelement <2 x i64> poison, i64 %3, i64 0
  %57 = shufflevector <2 x i64> %56, <2 x i64> poison, <2 x i32> zeroinitializer
  br label %58

58:                                               ; preds = %58, %54
  %59 = phi i64 [ 0, %54 ], [ %76, %58 ]
  %60 = getelementptr inbounds i64, ptr %10, i64 %59
  %61 = getelementptr inbounds i8, ptr %60, i64 16
  %62 = getelementptr inbounds i8, ptr %60, i64 32
  %63 = getelementptr inbounds i8, ptr %60, i64 48
  %64 = load <2 x i64>, ptr %60, align 8, !tbaa !6
  %65 = load <2 x i64>, ptr %61, align 8, !tbaa !6
  %66 = load <2 x i64>, ptr %62, align 8, !tbaa !6
  %67 = load <2 x i64>, ptr %63, align 8, !tbaa !6
  %68 = add <2 x i64> %64, %57
  %69 = add <2 x i64> %65, %57
  %70 = add <2 x i64> %66, %57
  %71 = add <2 x i64> %67, %57
  %72 = getelementptr inbounds i64, ptr %47, i64 %59
  %73 = getelementptr inbounds i8, ptr %72, i64 16
  %74 = getelementptr inbounds i8, ptr %72, i64 32
  %75 = getelementptr inbounds i8, ptr %72, i64 48
  store <2 x i64> %68, ptr %72, align 8, !tbaa !6
  store <2 x i64> %69, ptr %73, align 8, !tbaa !6
  store <2 x i64> %70, ptr %74, align 8, !tbaa !6
  store <2 x i64> %71, ptr %75, align 8, !tbaa !6
  %76 = add nuw i64 %59, 8
  %77 = icmp eq i64 %76, %55
  br i1 %77, label %78, label %58, !llvm.loop !14

78:                                               ; preds = %58
  %79 = icmp eq i64 %55, %1
  br i1 %79, label %90, label %52

80:                                               ; preds = %49
  tail call void @free(ptr noundef nonnull %10)
  br label %138

81:                                               ; preds = %46
  tail call void @abort() #5
  unreachable

82:                                               ; preds = %16, %82
  %83 = phi i64 [ %87, %82 ], [ %17, %16 ]
  %84 = getelementptr inbounds i64, ptr %0, i64 %83
  %85 = load i64, ptr %84, align 8, !tbaa !6
  %86 = mul i64 %85, %2
  %87 = add nuw i64 %83, 1
  %88 = getelementptr inbounds i64, ptr %10, i64 %83
  store i64 %86, ptr %88, align 8, !tbaa !6
  %89 = icmp eq i64 %87, %1
  br i1 %89, label %46, label %82, !llvm.loop !15

90:                                               ; preds = %130, %78
  tail call void @free(ptr noundef nonnull %10)
  %91 = getelementptr i8, ptr %47, i64 -8
  br i1 %51, label %92, label %95

92:                                               ; preds = %124, %90
  %93 = phi i64 [ %1, %90 ], [ %97, %124 ]
  %94 = phi i64 [ 0, %90 ], [ %128, %124 ]
  br label %140

95:                                               ; preds = %90
  %96 = and i64 %1, 2305843009213693944
  %97 = and i64 %1, 7
  br label %98

98:                                               ; preds = %98, %95
  %99 = phi i64 [ 0, %95 ], [ %122, %98 ]
  %100 = phi <2 x i64> [ zeroinitializer, %95 ], [ %118, %98 ]
  %101 = phi <2 x i64> [ zeroinitializer, %95 ], [ %119, %98 ]
  %102 = phi <2 x i64> [ zeroinitializer, %95 ], [ %120, %98 ]
  %103 = phi <2 x i64> [ zeroinitializer, %95 ], [ %121, %98 ]
  %104 = sub i64 %1, %99
  %105 = getelementptr i64, ptr %91, i64 %104
  %106 = getelementptr i8, ptr %105, i64 -8
  %107 = getelementptr i8, ptr %105, i64 -24
  %108 = getelementptr i8, ptr %105, i64 -40
  %109 = getelementptr i8, ptr %105, i64 -56
  %110 = load <2 x i64>, ptr %106, align 8, !tbaa !6
  %111 = shufflevector <2 x i64> %110, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %112 = load <2 x i64>, ptr %107, align 8, !tbaa !6
  %113 = shufflevector <2 x i64> %112, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %114 = load <2 x i64>, ptr %108, align 8, !tbaa !6
  %115 = shufflevector <2 x i64> %114, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %116 = load <2 x i64>, ptr %109, align 8, !tbaa !6
  %117 = shufflevector <2 x i64> %116, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %118 = add <2 x i64> %111, %100
  %119 = add <2 x i64> %113, %101
  %120 = add <2 x i64> %115, %102
  %121 = add <2 x i64> %117, %103
  %122 = add nuw i64 %99, 8
  %123 = icmp eq i64 %122, %96
  br i1 %123, label %124, label %98, !llvm.loop !16

124:                                              ; preds = %98
  %125 = add <2 x i64> %119, %118
  %126 = add <2 x i64> %120, %125
  %127 = add <2 x i64> %121, %126
  %128 = tail call i64 @llvm.vector.reduce.add.v2i64(<2 x i64> %127)
  %129 = icmp eq i64 %96, %1
  br i1 %129, label %138, label %92

130:                                              ; preds = %52, %130
  %131 = phi i64 [ %135, %130 ], [ %53, %52 ]
  %132 = getelementptr inbounds i64, ptr %10, i64 %131
  %133 = load i64, ptr %132, align 8, !tbaa !6
  %134 = add i64 %133, %3
  %135 = add nuw i64 %131, 1
  %136 = getelementptr inbounds i64, ptr %47, i64 %131
  store i64 %134, ptr %136, align 8, !tbaa !6
  %137 = icmp eq i64 %135, %1
  br i1 %137, label %90, label %130, !llvm.loop !17

138:                                              ; preds = %140, %124, %80
  %139 = phi i64 [ 0, %80 ], [ %128, %124 ], [ %145, %140 ]
  tail call void @free(ptr noundef nonnull %47)
  ret i64 %139

140:                                              ; preds = %92, %140
  %141 = phi i64 [ %146, %140 ], [ %93, %92 ]
  %142 = phi i64 [ %145, %140 ], [ %94, %92 ]
  %143 = getelementptr i64, ptr %91, i64 %141
  %144 = load i64, ptr %143, align 8, !tbaa !6
  %145 = add i64 %144, %142
  %146 = add i64 %141, -1
  %147 = icmp eq i64 %146, 0
  br i1 %147, label %138, label %140, !llvm.loop !18
}

; Function Attrs: nounwind ssp uwtable(sync)
define i64 @lang_fn_three_maps(ptr nocapture noundef readonly %0, i64 noundef %1, i64 noundef %2, i64 noundef %3) local_unnamed_addr #0 {
  %5 = icmp ugt i64 %1, 2305843009213693951
  br i1 %5, label %6, label %7

6:                                                ; preds = %4
  tail call void @abort() #5
  unreachable

7:                                                ; preds = %4
  %8 = tail call i64 @llvm.umax.i64(i64 %1, i64 1)
  %9 = shl nuw i64 %8, 3
  %10 = tail call ptr @malloc(i64 noundef %9) #6
  %11 = icmp eq ptr %10, null
  br i1 %11, label %45, label %12

12:                                               ; preds = %7
  %13 = icmp eq i64 %1, 0
  br i1 %13, label %46, label %14

14:                                               ; preds = %12
  %15 = icmp ult i64 %1, 4
  br i1 %15, label %16, label %18

16:                                               ; preds = %43, %14
  %17 = phi i64 [ 0, %14 ], [ %19, %43 ]
  br label %81

18:                                               ; preds = %14
  %19 = and i64 %1, 2305843009213693948
  br label %20

20:                                               ; preds = %20, %18
  %21 = phi i64 [ 0, %18 ], [ %41, %20 ]
  %22 = or disjoint i64 %21, 1
  %23 = or disjoint i64 %21, 2
  %24 = or disjoint i64 %21, 3
  %25 = getelementptr inbounds i64, ptr %0, i64 %21
  %26 = getelementptr inbounds i64, ptr %0, i64 %22
  %27 = getelementptr inbounds i64, ptr %0, i64 %23
  %28 = getelementptr inbounds i64, ptr %0, i64 %24
  %29 = load i64, ptr %25, align 8, !tbaa !6
  %30 = load i64, ptr %26, align 8, !tbaa !6
  %31 = load i64, ptr %27, align 8, !tbaa !6
  %32 = load i64, ptr %28, align 8, !tbaa !6
  %33 = mul i64 %29, %2
  %34 = mul i64 %30, %2
  %35 = mul i64 %31, %2
  %36 = mul i64 %32, %2
  %37 = getelementptr inbounds i64, ptr %10, i64 %21
  %38 = getelementptr inbounds i64, ptr %10, i64 %22
  %39 = getelementptr inbounds i64, ptr %10, i64 %23
  %40 = getelementptr inbounds i64, ptr %10, i64 %24
  store i64 %33, ptr %37, align 8, !tbaa !6
  store i64 %34, ptr %38, align 8, !tbaa !6
  store i64 %35, ptr %39, align 8, !tbaa !6
  store i64 %36, ptr %40, align 8, !tbaa !6
  %41 = add nuw i64 %21, 4
  %42 = icmp eq i64 %41, %19
  br i1 %42, label %43, label %20, !llvm.loop !19

43:                                               ; preds = %20
  %44 = icmp eq i64 %19, %1
  br i1 %44, label %46, label %16

45:                                               ; preds = %7
  tail call void @abort() #5
  unreachable

46:                                               ; preds = %81, %43, %12
  %47 = tail call ptr @malloc(i64 noundef %9) #6
  %48 = icmp eq ptr %47, null
  br i1 %48, label %80, label %49

49:                                               ; preds = %46
  br i1 %13, label %89, label %50

50:                                               ; preds = %49
  %51 = icmp ult i64 %1, 8
  br i1 %51, label %52, label %54

52:                                               ; preds = %78, %50
  %53 = phi i64 [ 0, %50 ], [ %55, %78 ]
  br label %125

54:                                               ; preds = %50
  %55 = and i64 %1, 2305843009213693944
  %56 = insertelement <2 x i64> poison, i64 %3, i64 0
  %57 = shufflevector <2 x i64> %56, <2 x i64> poison, <2 x i32> zeroinitializer
  br label %58

58:                                               ; preds = %58, %54
  %59 = phi i64 [ 0, %54 ], [ %76, %58 ]
  %60 = getelementptr inbounds i64, ptr %10, i64 %59
  %61 = getelementptr inbounds i8, ptr %60, i64 16
  %62 = getelementptr inbounds i8, ptr %60, i64 32
  %63 = getelementptr inbounds i8, ptr %60, i64 48
  %64 = load <2 x i64>, ptr %60, align 8, !tbaa !6
  %65 = load <2 x i64>, ptr %61, align 8, !tbaa !6
  %66 = load <2 x i64>, ptr %62, align 8, !tbaa !6
  %67 = load <2 x i64>, ptr %63, align 8, !tbaa !6
  %68 = add <2 x i64> %64, %57
  %69 = add <2 x i64> %65, %57
  %70 = add <2 x i64> %66, %57
  %71 = add <2 x i64> %67, %57
  %72 = getelementptr inbounds i64, ptr %47, i64 %59
  %73 = getelementptr inbounds i8, ptr %72, i64 16
  %74 = getelementptr inbounds i8, ptr %72, i64 32
  %75 = getelementptr inbounds i8, ptr %72, i64 48
  store <2 x i64> %68, ptr %72, align 8, !tbaa !6
  store <2 x i64> %69, ptr %73, align 8, !tbaa !6
  store <2 x i64> %70, ptr %74, align 8, !tbaa !6
  store <2 x i64> %71, ptr %75, align 8, !tbaa !6
  %76 = add nuw i64 %59, 8
  %77 = icmp eq i64 %76, %55
  br i1 %77, label %78, label %58, !llvm.loop !20

78:                                               ; preds = %58
  %79 = icmp eq i64 %55, %1
  br i1 %79, label %89, label %52

80:                                               ; preds = %46
  tail call void @abort() #5
  unreachable

81:                                               ; preds = %16, %81
  %82 = phi i64 [ %86, %81 ], [ %17, %16 ]
  %83 = getelementptr inbounds i64, ptr %0, i64 %82
  %84 = load i64, ptr %83, align 8, !tbaa !6
  %85 = mul i64 %84, %2
  %86 = add nuw i64 %82, 1
  %87 = getelementptr inbounds i64, ptr %10, i64 %82
  store i64 %85, ptr %87, align 8, !tbaa !6
  %88 = icmp eq i64 %86, %1
  br i1 %88, label %46, label %81, !llvm.loop !21

89:                                               ; preds = %125, %78, %49
  tail call void @free(ptr noundef nonnull %10)
  %90 = tail call ptr @malloc(i64 noundef %9) #6
  %91 = icmp eq ptr %90, null
  br i1 %91, label %124, label %92

92:                                               ; preds = %89
  br i1 %13, label %123, label %93

93:                                               ; preds = %92
  %94 = icmp ult i64 %1, 8
  br i1 %94, label %95, label %97

95:                                               ; preds = %121, %93
  %96 = phi i64 [ 0, %93 ], [ %98, %121 ]
  br label %173

97:                                               ; preds = %93
  %98 = and i64 %1, 2305843009213693944
  %99 = insertelement <2 x i64> poison, i64 %3, i64 0
  %100 = shufflevector <2 x i64> %99, <2 x i64> poison, <2 x i32> zeroinitializer
  br label %101

101:                                              ; preds = %101, %97
  %102 = phi i64 [ 0, %97 ], [ %119, %101 ]
  %103 = getelementptr inbounds i64, ptr %47, i64 %102
  %104 = getelementptr inbounds i8, ptr %103, i64 16
  %105 = getelementptr inbounds i8, ptr %103, i64 32
  %106 = getelementptr inbounds i8, ptr %103, i64 48
  %107 = load <2 x i64>, ptr %103, align 8, !tbaa !6
  %108 = load <2 x i64>, ptr %104, align 8, !tbaa !6
  %109 = load <2 x i64>, ptr %105, align 8, !tbaa !6
  %110 = load <2 x i64>, ptr %106, align 8, !tbaa !6
  %111 = sub <2 x i64> %107, %100
  %112 = sub <2 x i64> %108, %100
  %113 = sub <2 x i64> %109, %100
  %114 = sub <2 x i64> %110, %100
  %115 = getelementptr inbounds i64, ptr %90, i64 %102
  %116 = getelementptr inbounds i8, ptr %115, i64 16
  %117 = getelementptr inbounds i8, ptr %115, i64 32
  %118 = getelementptr inbounds i8, ptr %115, i64 48
  store <2 x i64> %111, ptr %115, align 8, !tbaa !6
  store <2 x i64> %112, ptr %116, align 8, !tbaa !6
  store <2 x i64> %113, ptr %117, align 8, !tbaa !6
  store <2 x i64> %114, ptr %118, align 8, !tbaa !6
  %119 = add nuw i64 %102, 8
  %120 = icmp eq i64 %119, %98
  br i1 %120, label %121, label %101, !llvm.loop !22

121:                                              ; preds = %101
  %122 = icmp eq i64 %98, %1
  br i1 %122, label %133, label %95

123:                                              ; preds = %92
  tail call void @free(ptr noundef nonnull %47)
  br label %181

124:                                              ; preds = %89
  tail call void @abort() #5
  unreachable

125:                                              ; preds = %52, %125
  %126 = phi i64 [ %130, %125 ], [ %53, %52 ]
  %127 = getelementptr inbounds i64, ptr %10, i64 %126
  %128 = load i64, ptr %127, align 8, !tbaa !6
  %129 = add i64 %128, %3
  %130 = add nuw i64 %126, 1
  %131 = getelementptr inbounds i64, ptr %47, i64 %126
  store i64 %129, ptr %131, align 8, !tbaa !6
  %132 = icmp eq i64 %130, %1
  br i1 %132, label %89, label %125, !llvm.loop !23

133:                                              ; preds = %173, %121
  tail call void @free(ptr noundef nonnull %47)
  %134 = getelementptr i8, ptr %90, i64 -8
  br i1 %94, label %135, label %138

135:                                              ; preds = %167, %133
  %136 = phi i64 [ %1, %133 ], [ %140, %167 ]
  %137 = phi i64 [ 0, %133 ], [ %171, %167 ]
  br label %183

138:                                              ; preds = %133
  %139 = and i64 %1, 2305843009213693944
  %140 = and i64 %1, 7
  br label %141

141:                                              ; preds = %141, %138
  %142 = phi i64 [ 0, %138 ], [ %165, %141 ]
  %143 = phi <2 x i64> [ zeroinitializer, %138 ], [ %161, %141 ]
  %144 = phi <2 x i64> [ zeroinitializer, %138 ], [ %162, %141 ]
  %145 = phi <2 x i64> [ zeroinitializer, %138 ], [ %163, %141 ]
  %146 = phi <2 x i64> [ zeroinitializer, %138 ], [ %164, %141 ]
  %147 = sub i64 %1, %142
  %148 = getelementptr i64, ptr %134, i64 %147
  %149 = getelementptr i8, ptr %148, i64 -8
  %150 = getelementptr i8, ptr %148, i64 -24
  %151 = getelementptr i8, ptr %148, i64 -40
  %152 = getelementptr i8, ptr %148, i64 -56
  %153 = load <2 x i64>, ptr %149, align 8, !tbaa !6
  %154 = shufflevector <2 x i64> %153, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %155 = load <2 x i64>, ptr %150, align 8, !tbaa !6
  %156 = shufflevector <2 x i64> %155, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %157 = load <2 x i64>, ptr %151, align 8, !tbaa !6
  %158 = shufflevector <2 x i64> %157, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %159 = load <2 x i64>, ptr %152, align 8, !tbaa !6
  %160 = shufflevector <2 x i64> %159, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %161 = add <2 x i64> %154, %143
  %162 = add <2 x i64> %156, %144
  %163 = add <2 x i64> %158, %145
  %164 = add <2 x i64> %160, %146
  %165 = add nuw i64 %142, 8
  %166 = icmp eq i64 %165, %139
  br i1 %166, label %167, label %141, !llvm.loop !24

167:                                              ; preds = %141
  %168 = add <2 x i64> %162, %161
  %169 = add <2 x i64> %163, %168
  %170 = add <2 x i64> %164, %169
  %171 = tail call i64 @llvm.vector.reduce.add.v2i64(<2 x i64> %170)
  %172 = icmp eq i64 %139, %1
  br i1 %172, label %181, label %135

173:                                              ; preds = %95, %173
  %174 = phi i64 [ %178, %173 ], [ %96, %95 ]
  %175 = getelementptr inbounds i64, ptr %47, i64 %174
  %176 = load i64, ptr %175, align 8, !tbaa !6
  %177 = sub i64 %176, %3
  %178 = add nuw i64 %174, 1
  %179 = getelementptr inbounds i64, ptr %90, i64 %174
  store i64 %177, ptr %179, align 8, !tbaa !6
  %180 = icmp eq i64 %178, %1
  br i1 %180, label %133, label %173, !llvm.loop !25

181:                                              ; preds = %183, %167, %123
  %182 = phi i64 [ 0, %123 ], [ %171, %167 ], [ %188, %183 ]
  tail call void @free(ptr noundef nonnull %90)
  ret i64 %182

183:                                              ; preds = %135, %183
  %184 = phi i64 [ %189, %183 ], [ %136, %135 ]
  %185 = phi i64 [ %188, %183 ], [ %137, %135 ]
  %186 = getelementptr i64, ptr %134, i64 %184
  %187 = load i64, ptr %186, align 8, !tbaa !6
  %188 = add i64 %187, %185
  %189 = add i64 %184, -1
  %190 = icmp eq i64 %189, 0
  br i1 %190, label %181, label %183, !llvm.loop !26
}

; Function Attrs: nounwind ssp uwtable(sync)
define i64 @lang_fn_shadow_maps(ptr nocapture noundef readonly %0, i64 noundef %1, i64 noundef %2, i64 noundef %3) local_unnamed_addr #0 {
  %5 = icmp ugt i64 %1, 2305843009213693951
  br i1 %5, label %6, label %7

6:                                                ; preds = %4
  tail call void @abort() #5
  unreachable

7:                                                ; preds = %4
  %8 = tail call i64 @llvm.umax.i64(i64 %1, i64 1)
  %9 = shl nuw i64 %8, 3
  %10 = tail call ptr @malloc(i64 noundef %9) #6
  %11 = icmp eq ptr %10, null
  br i1 %11, label %44, label %12

12:                                               ; preds = %7
  %13 = icmp eq i64 %1, 0
  br i1 %13, label %45, label %14

14:                                               ; preds = %12
  %15 = icmp ult i64 %1, 8
  br i1 %15, label %16, label %18

16:                                               ; preds = %42, %14
  %17 = phi i64 [ 0, %14 ], [ %19, %42 ]
  br label %82

18:                                               ; preds = %14
  %19 = and i64 %1, 2305843009213693944
  %20 = insertelement <2 x i64> poison, i64 %3, i64 0
  %21 = shufflevector <2 x i64> %20, <2 x i64> poison, <2 x i32> zeroinitializer
  br label %22

22:                                               ; preds = %22, %18
  %23 = phi i64 [ 0, %18 ], [ %40, %22 ]
  %24 = getelementptr inbounds i64, ptr %0, i64 %23
  %25 = getelementptr inbounds i8, ptr %24, i64 16
  %26 = getelementptr inbounds i8, ptr %24, i64 32
  %27 = getelementptr inbounds i8, ptr %24, i64 48
  %28 = load <2 x i64>, ptr %24, align 8, !tbaa !6
  %29 = load <2 x i64>, ptr %25, align 8, !tbaa !6
  %30 = load <2 x i64>, ptr %26, align 8, !tbaa !6
  %31 = load <2 x i64>, ptr %27, align 8, !tbaa !6
  %32 = add <2 x i64> %28, %21
  %33 = add <2 x i64> %29, %21
  %34 = add <2 x i64> %30, %21
  %35 = add <2 x i64> %31, %21
  %36 = getelementptr inbounds i64, ptr %10, i64 %23
  %37 = getelementptr inbounds i8, ptr %36, i64 16
  %38 = getelementptr inbounds i8, ptr %36, i64 32
  %39 = getelementptr inbounds i8, ptr %36, i64 48
  store <2 x i64> %32, ptr %36, align 8, !tbaa !6
  store <2 x i64> %33, ptr %37, align 8, !tbaa !6
  store <2 x i64> %34, ptr %38, align 8, !tbaa !6
  store <2 x i64> %35, ptr %39, align 8, !tbaa !6
  %40 = add nuw i64 %23, 8
  %41 = icmp eq i64 %40, %19
  br i1 %41, label %42, label %22, !llvm.loop !27

42:                                               ; preds = %22
  %43 = icmp eq i64 %19, %1
  br i1 %43, label %45, label %16

44:                                               ; preds = %7
  tail call void @abort() #5
  unreachable

45:                                               ; preds = %82, %42, %12
  %46 = tail call ptr @malloc(i64 noundef %9) #6
  %47 = icmp eq ptr %46, null
  br i1 %47, label %81, label %48

48:                                               ; preds = %45
  br i1 %13, label %80, label %49

49:                                               ; preds = %48
  %50 = icmp ult i64 %1, 4
  br i1 %50, label %51, label %53

51:                                               ; preds = %78, %49
  %52 = phi i64 [ 0, %49 ], [ %54, %78 ]
  br label %131

53:                                               ; preds = %49
  %54 = and i64 %1, 2305843009213693948
  br label %55

55:                                               ; preds = %55, %53
  %56 = phi i64 [ 0, %53 ], [ %76, %55 ]
  %57 = or disjoint i64 %56, 1
  %58 = or disjoint i64 %56, 2
  %59 = or disjoint i64 %56, 3
  %60 = getelementptr inbounds i64, ptr %10, i64 %56
  %61 = getelementptr inbounds i64, ptr %10, i64 %57
  %62 = getelementptr inbounds i64, ptr %10, i64 %58
  %63 = getelementptr inbounds i64, ptr %10, i64 %59
  %64 = load i64, ptr %60, align 8, !tbaa !6
  %65 = load i64, ptr %61, align 8, !tbaa !6
  %66 = load i64, ptr %62, align 8, !tbaa !6
  %67 = load i64, ptr %63, align 8, !tbaa !6
  %68 = mul i64 %64, %2
  %69 = mul i64 %65, %2
  %70 = mul i64 %66, %2
  %71 = mul i64 %67, %2
  %72 = getelementptr inbounds i64, ptr %46, i64 %56
  %73 = getelementptr inbounds i64, ptr %46, i64 %57
  %74 = getelementptr inbounds i64, ptr %46, i64 %58
  %75 = getelementptr inbounds i64, ptr %46, i64 %59
  store i64 %68, ptr %72, align 8, !tbaa !6
  store i64 %69, ptr %73, align 8, !tbaa !6
  store i64 %70, ptr %74, align 8, !tbaa !6
  store i64 %71, ptr %75, align 8, !tbaa !6
  %76 = add nuw i64 %56, 4
  %77 = icmp eq i64 %76, %54
  br i1 %77, label %78, label %55, !llvm.loop !28

78:                                               ; preds = %55
  %79 = icmp eq i64 %54, %1
  br i1 %79, label %90, label %51

80:                                               ; preds = %48
  tail call void @free(ptr noundef nonnull %10)
  br label %139

81:                                               ; preds = %45
  tail call void @abort() #5
  unreachable

82:                                               ; preds = %16, %82
  %83 = phi i64 [ %87, %82 ], [ %17, %16 ]
  %84 = getelementptr inbounds i64, ptr %0, i64 %83
  %85 = load i64, ptr %84, align 8, !tbaa !6
  %86 = add i64 %85, %3
  %87 = add nuw i64 %83, 1
  %88 = getelementptr inbounds i64, ptr %10, i64 %83
  store i64 %86, ptr %88, align 8, !tbaa !6
  %89 = icmp eq i64 %87, %1
  br i1 %89, label %45, label %82, !llvm.loop !29

90:                                               ; preds = %131, %78
  tail call void @free(ptr noundef nonnull %10)
  %91 = getelementptr i8, ptr %46, i64 -8
  %92 = icmp ult i64 %1, 8
  br i1 %92, label %93, label %96

93:                                               ; preds = %125, %90
  %94 = phi i64 [ %1, %90 ], [ %98, %125 ]
  %95 = phi i64 [ 0, %90 ], [ %129, %125 ]
  br label %141

96:                                               ; preds = %90
  %97 = and i64 %1, 2305843009213693944
  %98 = and i64 %1, 7
  br label %99

99:                                               ; preds = %99, %96
  %100 = phi i64 [ 0, %96 ], [ %123, %99 ]
  %101 = phi <2 x i64> [ zeroinitializer, %96 ], [ %119, %99 ]
  %102 = phi <2 x i64> [ zeroinitializer, %96 ], [ %120, %99 ]
  %103 = phi <2 x i64> [ zeroinitializer, %96 ], [ %121, %99 ]
  %104 = phi <2 x i64> [ zeroinitializer, %96 ], [ %122, %99 ]
  %105 = sub i64 %1, %100
  %106 = getelementptr i64, ptr %91, i64 %105
  %107 = getelementptr i8, ptr %106, i64 -8
  %108 = getelementptr i8, ptr %106, i64 -24
  %109 = getelementptr i8, ptr %106, i64 -40
  %110 = getelementptr i8, ptr %106, i64 -56
  %111 = load <2 x i64>, ptr %107, align 8, !tbaa !6
  %112 = shufflevector <2 x i64> %111, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %113 = load <2 x i64>, ptr %108, align 8, !tbaa !6
  %114 = shufflevector <2 x i64> %113, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %115 = load <2 x i64>, ptr %109, align 8, !tbaa !6
  %116 = shufflevector <2 x i64> %115, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %117 = load <2 x i64>, ptr %110, align 8, !tbaa !6
  %118 = shufflevector <2 x i64> %117, <2 x i64> poison, <2 x i32> <i32 1, i32 0>
  %119 = add <2 x i64> %112, %101
  %120 = add <2 x i64> %114, %102
  %121 = add <2 x i64> %116, %103
  %122 = add <2 x i64> %118, %104
  %123 = add nuw i64 %100, 8
  %124 = icmp eq i64 %123, %97
  br i1 %124, label %125, label %99, !llvm.loop !30

125:                                              ; preds = %99
  %126 = add <2 x i64> %120, %119
  %127 = add <2 x i64> %121, %126
  %128 = add <2 x i64> %122, %127
  %129 = tail call i64 @llvm.vector.reduce.add.v2i64(<2 x i64> %128)
  %130 = icmp eq i64 %97, %1
  br i1 %130, label %139, label %93

131:                                              ; preds = %51, %131
  %132 = phi i64 [ %136, %131 ], [ %52, %51 ]
  %133 = getelementptr inbounds i64, ptr %10, i64 %132
  %134 = load i64, ptr %133, align 8, !tbaa !6
  %135 = mul i64 %134, %2
  %136 = add nuw i64 %132, 1
  %137 = getelementptr inbounds i64, ptr %46, i64 %132
  store i64 %135, ptr %137, align 8, !tbaa !6
  %138 = icmp eq i64 %136, %1
  br i1 %138, label %90, label %131, !llvm.loop !31

139:                                              ; preds = %141, %125, %80
  %140 = phi i64 [ 0, %80 ], [ %129, %125 ], [ %146, %141 ]
  tail call void @free(ptr noundef nonnull %46)
  ret i64 %140

141:                                              ; preds = %93, %141
  %142 = phi i64 [ %147, %141 ], [ %94, %93 ]
  %143 = phi i64 [ %146, %141 ], [ %95, %93 ]
  %144 = getelementptr i64, ptr %91, i64 %142
  %145 = load i64, ptr %144, align 8, !tbaa !6
  %146 = add i64 %145, %143
  %147 = add i64 %142, -1
  %148 = icmp eq i64 %147, 0
  br i1 %148, label %139, label %141, !llvm.loop !32
}

; Function Attrs: nounwind ssp uwtable(sync)
define noundef i64 @lang_fn_mapped_count(ptr nocapture noundef readonly %0, i64 noundef returned %1, i64 noundef %2, i64 noundef %3) local_unnamed_addr #0 {
  %5 = icmp ugt i64 %1, 2305843009213693951
  br i1 %5, label %6, label %7

6:                                                ; preds = %4
  tail call void @abort() #5
  unreachable

7:                                                ; preds = %4
  ret i64 %1
}

; Function Attrs: cold noreturn nounwind
declare void @abort() local_unnamed_addr #1

; Function Attrs: mustprogress nofree nounwind willreturn allockind("alloc,uninitialized") allocsize(0) memory(inaccessiblemem: readwrite)
declare noalias noundef ptr @malloc(i64 noundef) local_unnamed_addr #2

; Function Attrs: mustprogress nounwind willreturn allockind("free") memory(argmem: readwrite, inaccessiblemem: readwrite)
declare void @free(ptr allocptr nocapture noundef) local_unnamed_addr #3

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare i64 @llvm.umax.i64(i64, i64) #4

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare i64 @llvm.vector.reduce.add.v2i64(<2 x i64>) #4

attributes #0 = { nounwind ssp uwtable(sync) "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-m3" "target-features"="+aes,+bf16,+bti,+ccidx,+complxnum,+crc,+dit,+dotprod,+flagm,+fp-armv8,+fp16fml,+fpac,+fullfp16,+hcx,+i8mm,+jsconv,+lse,+neon,+pauth,+perfmon,+predres,+ras,+rcpc,+rdm,+sb,+sha2,+sha3,+ssbs,+v8.1a,+v8.2a,+v8.3a,+v8.4a,+v8.5a,+v8.6a,+v8a,+zcm,+zcz" }
attributes #1 = { cold noreturn nounwind "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-m3" "target-features"="+aes,+bf16,+bti,+ccidx,+complxnum,+crc,+dit,+dotprod,+flagm,+fp-armv8,+fp16fml,+fpac,+fullfp16,+hcx,+i8mm,+jsconv,+lse,+neon,+pauth,+perfmon,+predres,+ras,+rcpc,+rdm,+sb,+sha2,+sha3,+ssbs,+v8.1a,+v8.2a,+v8.3a,+v8.4a,+v8.5a,+v8.6a,+v8a,+zcm,+zcz" }
attributes #2 = { mustprogress nofree nounwind willreturn allockind("alloc,uninitialized") allocsize(0) memory(inaccessiblemem: readwrite) "alloc-family"="malloc" "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-m3" "target-features"="+aes,+bf16,+bti,+ccidx,+complxnum,+crc,+dit,+dotprod,+flagm,+fp-armv8,+fp16fml,+fpac,+fullfp16,+hcx,+i8mm,+jsconv,+lse,+neon,+pauth,+perfmon,+predres,+ras,+rcpc,+rdm,+sb,+sha2,+sha3,+ssbs,+v8.1a,+v8.2a,+v8.3a,+v8.4a,+v8.5a,+v8.6a,+v8a,+zcm,+zcz" }
attributes #3 = { mustprogress nounwind willreturn allockind("free") memory(argmem: readwrite, inaccessiblemem: readwrite) "alloc-family"="malloc" "frame-pointer"="non-leaf" "no-trapping-math"="true" "probe-stack"="__chkstk_darwin" "stack-protector-buffer-size"="8" "target-cpu"="apple-m3" "target-features"="+aes,+bf16,+bti,+ccidx,+complxnum,+crc,+dit,+dotprod,+flagm,+fp-armv8,+fp16fml,+fpac,+fullfp16,+hcx,+i8mm,+jsconv,+lse,+neon,+pauth,+perfmon,+predres,+ras,+rcpc,+rdm,+sb,+sha2,+sha3,+ssbs,+v8.1a,+v8.2a,+v8.3a,+v8.4a,+v8.5a,+v8.6a,+v8a,+zcm,+zcz" }
attributes #4 = { nocallback nofree nosync nounwind speculatable willreturn memory(none) }
attributes #5 = { cold noreturn nounwind }
attributes #6 = { allocsize(0) }

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
!14 = distinct !{!14, !11, !12, !13}
!15 = distinct !{!15, !11, !12}
!16 = distinct !{!16, !11, !12, !13}
!17 = distinct !{!17, !11, !13, !12}
!18 = distinct !{!18, !11, !13, !12}
!19 = distinct !{!19, !11, !12, !13}
!20 = distinct !{!20, !11, !12, !13}
!21 = distinct !{!21, !11, !12}
!22 = distinct !{!22, !11, !12, !13}
!23 = distinct !{!23, !11, !13, !12}
!24 = distinct !{!24, !11, !12, !13}
!25 = distinct !{!25, !11, !13, !12}
!26 = distinct !{!26, !11, !13, !12}
!27 = distinct !{!27, !11, !12, !13}
!28 = distinct !{!28, !11, !12, !13}
!29 = distinct !{!29, !11, !13, !12}
!30 = distinct !{!30, !11, !12, !13}
!31 = distinct !{!31, !11, !12}
!32 = distinct !{!32, !11, !13, !12}
