; ModuleID = '/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_u32/checked/cpu.c'
source_filename = "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_u32/checked/cpu.c"
target datalayout = "e-m:e-p:32:32-p10:8:8-p20:8:8-i64:64-i128:128-n32:64-S128-ni:1:10:20"
target triple = "wasm32-unknown-unknown-unknown"

%struct.ink_l_uint32 = type { ptr, i32 }

@__heap_base = external global i8, align 1
@ink_top = internal unnamed_addr global i32 0, align 4, !dbg !0

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(write, argmem: none, inaccessiblemem: none) uwtable
define hidden void @ink_compute_reset() local_unnamed_addr #0 !dbg !23 {
  store i32 ptrtoint (ptr @__heap_base to i32), ptr @ink_top, align 4, !dbg !26, !tbaa !27
  ret void, !dbg !31
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(readwrite, argmem: none, inaccessiblemem: none) uwtable
define hidden i32 @ink_compute_mark() local_unnamed_addr #1 !dbg !32 {
  %1 = load i32, ptr @ink_top, align 4, !dbg !35, !tbaa !27
  %2 = icmp eq i32 %1, 0, !dbg !35
  br i1 %2, label %3, label %4, !dbg !37

3:                                                ; preds = %0
  store i32 ptrtoint (ptr @__heap_base to i32), ptr @ink_top, align 4, !dbg !38, !tbaa !27
  br label %4, !dbg !40

4:                                                ; preds = %3, %0
  %5 = phi i32 [ ptrtoint (ptr @__heap_base to i32), %3 ], [ %1, %0 ], !dbg !41
  ret i32 %5, !dbg !42
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(write, argmem: none, inaccessiblemem: none) uwtable
define hidden void @ink_compute_rewind(i32 noundef %0) local_unnamed_addr #0 !dbg !43 {
    #dbg_value(i32 %0, !47, !DIExpression(), !48)
  store i32 %0, ptr @ink_top, align 4, !dbg !49, !tbaa !27
  ret void, !dbg !50
}

; Function Attrs: nounwind uwtable
define hidden ptr @ink_alloc(i32 noundef %0, i32 noundef %1) local_unnamed_addr #2 !dbg !51 {
    #dbg_value(i32 %0, !55, !DIExpression(), !61)
    #dbg_value(i32 %1, !56, !DIExpression(), !61)
  %3 = icmp eq i32 %1, 0, !dbg !62
  br i1 %3, label %10, label %4, !dbg !64

4:                                                ; preds = %2
  %5 = tail call { i32, i1 } @llvm.umul.with.overflow.i32(i32 %1, i32 %0), !dbg !65
  %6 = extractvalue { i32, i1 } %5, 1, !dbg !65
  %7 = load i32, ptr @ink_top, align 4
  %8 = icmp ugt i32 %7, -8
  %9 = select i1 %6, i1 true, i1 %8, !dbg !66
  br i1 %9, label %10, label %11, !dbg !66

10:                                               ; preds = %4, %2
  tail call void @llvm.trap(), !dbg !67
  unreachable, !dbg !70

11:                                               ; preds = %4
  %12 = icmp eq i32 %7, 0, !dbg !71
  %13 = add i32 %7, 7, !dbg !73
  %14 = select i1 %12, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %13, !dbg !74
  %15 = and i32 %14, -8, !dbg !75
    #dbg_value(i32 %15, !57, !DIExpression(), !61)
  %16 = tail call i32 @llvm.umax.i32(i32 %0, i32 1), !dbg !76
  %17 = mul i32 %16, %1, !dbg !77
    #dbg_value(i32 %17, !58, !DIExpression(), !61)
  %18 = xor i32 %15, -1, !dbg !78
  %19 = icmp ugt i32 %17, %18, !dbg !80
  br i1 %19, label %20, label %21, !dbg !80

20:                                               ; preds = %11
  tail call void @llvm.trap(), !dbg !81
  unreachable, !dbg !83

21:                                               ; preds = %11
  %22 = add i32 %15, %17, !dbg !84
  store i32 %22, ptr @ink_top, align 4, !dbg !85, !tbaa !27
  %23 = add i32 %22, 65535, !dbg !86
  %24 = lshr i32 %23, 16, !dbg !87
    #dbg_value(i32 %24, !59, !DIExpression(), !61)
  %25 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !88
    #dbg_value(i32 %25, !60, !DIExpression(), !61)
  %26 = icmp ugt i32 %24, %25, !dbg !89
  br i1 %26, label %27, label %32, !dbg !91

27:                                               ; preds = %21
  %28 = sub nuw nsw i32 %24, %25, !dbg !92
  %29 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %28), !dbg !93
  %30 = icmp eq i32 %29, -1, !dbg !94
  br i1 %30, label %31, label %32, !dbg !91

31:                                               ; preds = %27
  tail call void @llvm.trap(), !dbg !95
  unreachable, !dbg !97

32:                                               ; preds = %27, %21
  %33 = inttoptr i32 %15 to ptr, !dbg !98
  ret ptr %33, !dbg !99
}

; Function Attrs: mustprogress nocallback nofree nosync nounwind willreturn memory(read)
declare i32 @llvm.wasm.memory.size.i32(i32) #3

; Function Attrs: mustprogress nocallback nofree nosync nounwind willreturn
declare i32 @llvm.wasm.memory.grow.i32(i32, i32) #4

; Function Attrs: nofree norecurse nosync nounwind memory(argmem: readwrite) uwtable
define hidden noundef ptr @memcpy(ptr noundef returned writeonly %0, ptr nocapture noundef readonly %1, i32 noundef %2) local_unnamed_addr #5 !dbg !100 {
    #dbg_value(ptr %0, !106, !DIExpression(), !109)
    #dbg_value(ptr %1, !107, !DIExpression(), !109)
    #dbg_value(i32 %2, !108, !DIExpression(), !109)
    #dbg_value(ptr %0, !110, !DIExpression(), !124)
    #dbg_value(ptr %1, !115, !DIExpression(), !124)
    #dbg_value(i32 %2, !116, !DIExpression(), !124)
    #dbg_value(ptr %0, !117, !DIExpression(), !124)
    #dbg_value(ptr %1, !119, !DIExpression(), !124)
    #dbg_value(i32 0, !122, !DIExpression(), !126)
  %4 = icmp eq i32 %2, 0, !dbg !127
  br i1 %4, label %59, label %5, !dbg !129

5:                                                ; preds = %3
  %6 = ptrtoint ptr %0 to i32, !dbg !127
  %7 = ptrtoint ptr %1 to i32, !dbg !127
  %8 = icmp ult i32 %2, 16, !dbg !129
  %9 = sub i32 %6, %7, !dbg !129
  %10 = icmp ult i32 %9, 16, !dbg !129
  %11 = or i1 %8, %10, !dbg !129
  br i1 %11, label %23, label %12, !dbg !129

12:                                               ; preds = %5
  %13 = and i32 %2, -16, !dbg !129
  br label %14, !dbg !129

14:                                               ; preds = %14, %12
  %15 = phi i32 [ 0, %12 ], [ %19, %14 ], !dbg !130
  %16 = getelementptr inbounds nuw i8, ptr %1, i32 %15, !dbg !131
  %17 = load <16 x i8>, ptr %16, align 1, !dbg !131, !tbaa !132
  %18 = getelementptr inbounds nuw i8, ptr %0, i32 %15, !dbg !133
  store <16 x i8> %17, ptr %18, align 1, !dbg !134, !tbaa !132
  %19 = add nuw i32 %15, 16, !dbg !130
  %20 = icmp eq i32 %19, %13, !dbg !130
  br i1 %20, label %21, label %14, !dbg !130, !llvm.loop !135

21:                                               ; preds = %14
  %22 = icmp eq i32 %2, %13, !dbg !129
  br i1 %22, label %59, label %23, !dbg !129

23:                                               ; preds = %5, %21
  %24 = phi i32 [ 0, %5 ], [ %13, %21 ]
  %25 = and i32 %2, 3, !dbg !129
  %26 = icmp eq i32 %25, 0, !dbg !129
  br i1 %26, label %36, label %27, !dbg !129

27:                                               ; preds = %23, %27
  %28 = phi i32 [ %33, %27 ], [ %24, %23 ]
  %29 = phi i32 [ %34, %27 ], [ 0, %23 ]
    #dbg_value(i32 %28, !122, !DIExpression(), !126)
  %30 = getelementptr inbounds nuw i8, ptr %1, i32 %28, !dbg !131
  %31 = load i8, ptr %30, align 1, !dbg !131, !tbaa !132
  %32 = getelementptr inbounds nuw i8, ptr %0, i32 %28, !dbg !133
  store i8 %31, ptr %32, align 1, !dbg !134, !tbaa !132
  %33 = add nuw i32 %28, 1, !dbg !130
    #dbg_value(i32 %33, !122, !DIExpression(), !126)
  %34 = add i32 %29, 1, !dbg !129
  %35 = icmp eq i32 %34, %25, !dbg !129
  br i1 %35, label %36, label %27, !dbg !129, !llvm.loop !140

36:                                               ; preds = %27, %23
  %37 = phi i32 [ %24, %23 ], [ %33, %27 ]
  %38 = sub i32 %24, %2, !dbg !129
  %39 = icmp ugt i32 %38, -4, !dbg !129
  br i1 %39, label %59, label %40, !dbg !129

40:                                               ; preds = %36, %40
  %41 = phi i32 [ %57, %40 ], [ %37, %36 ]
    #dbg_value(i32 %41, !122, !DIExpression(), !126)
  %42 = getelementptr inbounds nuw i8, ptr %1, i32 %41, !dbg !131
  %43 = load i8, ptr %42, align 1, !dbg !131, !tbaa !132
  %44 = getelementptr inbounds nuw i8, ptr %0, i32 %41, !dbg !133
  store i8 %43, ptr %44, align 1, !dbg !134, !tbaa !132
  %45 = add nuw i32 %41, 1, !dbg !130
    #dbg_value(i32 %45, !122, !DIExpression(), !126)
  %46 = getelementptr inbounds nuw i8, ptr %1, i32 %45, !dbg !131
  %47 = load i8, ptr %46, align 1, !dbg !131, !tbaa !132
  %48 = getelementptr inbounds nuw i8, ptr %0, i32 %45, !dbg !133
  store i8 %47, ptr %48, align 1, !dbg !134, !tbaa !132
  %49 = add nuw i32 %41, 2, !dbg !130
    #dbg_value(i32 %49, !122, !DIExpression(), !126)
  %50 = getelementptr inbounds nuw i8, ptr %1, i32 %49, !dbg !131
  %51 = load i8, ptr %50, align 1, !dbg !131, !tbaa !132
  %52 = getelementptr inbounds nuw i8, ptr %0, i32 %49, !dbg !133
  store i8 %51, ptr %52, align 1, !dbg !134, !tbaa !132
  %53 = add nuw i32 %41, 3, !dbg !130
    #dbg_value(i32 %53, !122, !DIExpression(), !126)
  %54 = getelementptr inbounds nuw i8, ptr %1, i32 %53, !dbg !131
  %55 = load i8, ptr %54, align 1, !dbg !131, !tbaa !132
  %56 = getelementptr inbounds nuw i8, ptr %0, i32 %53, !dbg !133
  store i8 %55, ptr %56, align 1, !dbg !134, !tbaa !132
  %57 = add nuw i32 %41, 4, !dbg !130
    #dbg_value(i32 %57, !122, !DIExpression(), !126)
  %58 = icmp eq i32 %57, %2, !dbg !127
  br i1 %58, label %59, label %40, !dbg !129, !llvm.loop !142

59:                                               ; preds = %36, %40, %21, %3
  ret ptr %0, !dbg !143
}

; Function Attrs: nofree norecurse nosync nounwind memory(argmem: write) uwtable
define hidden noundef ptr @memset(ptr noundef returned writeonly %0, i32 noundef %1, i32 noundef %2) local_unnamed_addr #6 !dbg !144 {
    #dbg_value(ptr %0, !149, !DIExpression(), !155)
    #dbg_value(i32 %1, !150, !DIExpression(), !155)
    #dbg_value(i32 %2, !151, !DIExpression(), !155)
    #dbg_value(ptr %0, !152, !DIExpression(), !155)
    #dbg_value(i32 0, !153, !DIExpression(), !156)
  %4 = icmp eq i32 %2, 0, !dbg !157
  br i1 %4, label %21, label %5, !dbg !159

5:                                                ; preds = %3
  %6 = trunc i32 %1 to i8
  %7 = icmp ult i32 %2, 16, !dbg !159
  br i1 %7, label %19, label %8, !dbg !159

8:                                                ; preds = %5
  %9 = and i32 %2, -16, !dbg !159
  %10 = insertelement <16 x i8> poison, i8 %6, i64 0, !dbg !159
  %11 = shufflevector <16 x i8> %10, <16 x i8> poison, <16 x i32> zeroinitializer, !dbg !159
  br label %12, !dbg !159

12:                                               ; preds = %12, %8
  %13 = phi i32 [ 0, %8 ], [ %15, %12 ], !dbg !160
  %14 = getelementptr inbounds nuw i8, ptr %0, i32 %13, !dbg !161
  store <16 x i8> %11, ptr %14, align 1, !dbg !162, !tbaa !132
  %15 = add nuw i32 %13, 16, !dbg !160
  %16 = icmp eq i32 %15, %9, !dbg !160
  br i1 %16, label %17, label %12, !dbg !160, !llvm.loop !163

17:                                               ; preds = %12
  %18 = icmp eq i32 %2, %9, !dbg !159
  br i1 %18, label %21, label %19, !dbg !159

19:                                               ; preds = %5, %17
  %20 = phi i32 [ 0, %5 ], [ %9, %17 ]
  br label %22, !dbg !159

21:                                               ; preds = %22, %17, %3
  ret ptr %0, !dbg !165

22:                                               ; preds = %19, %22
  %23 = phi i32 [ %25, %22 ], [ %20, %19 ]
    #dbg_value(i32 %23, !153, !DIExpression(), !156)
  %24 = getelementptr inbounds nuw i8, ptr %0, i32 %23, !dbg !161
  store i8 %6, ptr %24, align 1, !dbg !162, !tbaa !132
  %25 = add nuw i32 %23, 1, !dbg !160
    #dbg_value(i32 %25, !153, !DIExpression(), !156)
  %26 = icmp eq i32 %25, %2, !dbg !157
  br i1 %26, label %21, label %22, !dbg !159, !llvm.loop !166
}

; Function Attrs: nounwind uwtable
define hidden void @lang_fn_pipeline38_right_padded_zip_u32(ptr dead_on_unwind noalias nocapture writable writeonly sret(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %1, ptr nocapture noundef readnone byval(%struct.ink_l_uint32) align 4 %2, i32 noundef %3, i32 noundef %4) local_unnamed_addr #2 !dbg !167 {
    #dbg_declare(ptr %1, !176, !DIExpression(), !224)
    #dbg_declare(ptr %2, !177, !DIExpression(), !225)
    #dbg_value(i32 %3, !178, !DIExpression(), !226)
    #dbg_value(i32 %4, !179, !DIExpression(), !226)
  %6 = load ptr, ptr %1, align 4, !dbg !227, !tbaa !228
  %7 = ptrtoint ptr %6 to i32, !dbg !227
  %8 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !227
  %9 = load i32, ptr %8, align 4, !dbg !227, !tbaa !27
    #dbg_value(ptr %6, !180, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !226)
    #dbg_value(i32 %9, !180, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !226)
    #dbg_declare(ptr %0, !181, !DIExpression(), !231)
    #dbg_value(i32 %9, !55, !DIExpression(), !232)
    #dbg_value(i32 4, !56, !DIExpression(), !232)
  %10 = icmp ugt i32 %9, 1073741823, !dbg !234
  %11 = load i32, ptr @ink_top, align 4
  %12 = icmp ugt i32 %11, -8
  %13 = select i1 %10, i1 true, i1 %12, !dbg !235
  br i1 %13, label %14, label %15, !dbg !235

14:                                               ; preds = %5
  tail call void @llvm.trap(), !dbg !236
  unreachable, !dbg !238

15:                                               ; preds = %5
  %16 = icmp eq i32 %11, 0, !dbg !239
  %17 = add nuw i32 %11, 7, !dbg !240
  %18 = select i1 %16, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %17, !dbg !241
  %19 = and i32 %18, -8, !dbg !242
    #dbg_value(i32 %19, !57, !DIExpression(), !232)
  %20 = tail call i32 @llvm.umax.i32(i32 %9, i32 1), !dbg !243
  %21 = shl nuw i32 %20, 2, !dbg !244
    #dbg_value(i32 %21, !58, !DIExpression(), !232)
  %22 = xor i32 %19, -1, !dbg !245
  %23 = icmp ugt i32 %21, %22, !dbg !246
  br i1 %23, label %24, label %25, !dbg !246

24:                                               ; preds = %15
  tail call void @llvm.trap(), !dbg !247
  unreachable, !dbg !249

25:                                               ; preds = %15
  %26 = add i32 %19, %21, !dbg !250
  store i32 %26, ptr @ink_top, align 4, !dbg !251, !tbaa !27
  %27 = add i32 %26, 65535, !dbg !252
  %28 = lshr i32 %27, 16, !dbg !253
    #dbg_value(i32 %28, !59, !DIExpression(), !232)
  %29 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !254
    #dbg_value(i32 %29, !60, !DIExpression(), !232)
  %30 = icmp ugt i32 %28, %29, !dbg !255
  br i1 %30, label %31, label %36, !dbg !256

31:                                               ; preds = %25
  %32 = sub nuw nsw i32 %28, %29, !dbg !257
  %33 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %32), !dbg !258
  %34 = icmp eq i32 %33, -1, !dbg !259
  br i1 %34, label %35, label %36, !dbg !256

35:                                               ; preds = %31
  tail call void @llvm.trap(), !dbg !260
  unreachable, !dbg !262

36:                                               ; preds = %25, %31
  %37 = inttoptr i32 %19 to ptr, !dbg !263
  store ptr %37, ptr %0, align 4, !dbg !264, !tbaa !265
  %38 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !264
  store i32 %9, ptr %38, align 4, !dbg !264, !tbaa !267
    #dbg_value(i32 0, !182, !DIExpression(), !268)
  %39 = icmp eq i32 %9, 0, !dbg !269
  br i1 %39, label %81, label %40, !dbg !270

40:                                               ; preds = %36
  %41 = sub i32 0, %3
  %42 = icmp ult i32 %9, 4, !dbg !270
  %43 = sub i32 %19, %7, !dbg !270
  %44 = icmp ult i32 %43, 16, !dbg !270
  %45 = select i1 %42, i1 true, i1 %44, !dbg !270
  br i1 %45, label %79, label %46, !dbg !270

46:                                               ; preds = %40
  %47 = and i32 %9, 1073741820, !dbg !270
  %48 = insertelement <4 x i32> poison, i32 %3, i64 0, !dbg !270
  %49 = shufflevector <4 x i32> %48, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !270
  %50 = insertelement <4 x i32> poison, i32 %4, i64 0, !dbg !270
  %51 = shufflevector <4 x i32> %50, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !270
  %52 = insertelement <4 x i32> poison, i32 %41, i64 0, !dbg !270
  %53 = shufflevector <4 x i32> %52, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !270
  br label %54, !dbg !270

54:                                               ; preds = %54, %46
  %55 = phi i32 [ 0, %46 ], [ %74, %54 ], !dbg !271
  %56 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %46 ], [ %75, %54 ]
  %57 = getelementptr inbounds nuw i32, ptr %6, i32 %55, !dbg !272
  %58 = load <4 x i32>, ptr %57, align 4, !dbg !272, !tbaa !273
  %59 = icmp ult <4 x i32> %56, %49, !dbg !275
  %60 = select <4 x i1> %59, <4 x i32> %51, <4 x i32> %53, !dbg !276
  %61 = add <4 x i32> %58, %60, !dbg !276
  %62 = urem <4 x i32> %56, splat (i32 3), !dbg !277
  %63 = icmp eq <4 x i32> %62, zeroinitializer, !dbg !280
  %64 = mul <4 x i32> %58, %51, !dbg !281
  %65 = add <4 x i32> %58, %49, !dbg !281
  %66 = select <4 x i1> %63, <4 x i32> %64, <4 x i32> %65, !dbg !281
  %67 = icmp ult <4 x i32> %61, %66, !dbg !282
  %68 = mul <4 x i32> %66, %51, !dbg !283
  %69 = add <4 x i32> %68, %61, !dbg !283
  %70 = add <4 x i32> %61, %49, !dbg !283
  %71 = sub <4 x i32> %70, %66, !dbg !283
  %72 = select <4 x i1> %67, <4 x i32> %69, <4 x i32> %71, !dbg !283
  %73 = getelementptr inbounds nuw i32, ptr %37, i32 %55, !dbg !284
  store <4 x i32> %72, ptr %73, align 8, !dbg !285, !tbaa !273
  %74 = add nuw i32 %55, 4, !dbg !271
  %75 = add <4 x i32> %56, splat (i32 4)
  %76 = icmp eq i32 %74, %47, !dbg !271
  br i1 %76, label %77, label %54, !dbg !271, !llvm.loop !286

77:                                               ; preds = %54
  %78 = icmp eq i32 %9, %47, !dbg !270
  br i1 %78, label %81, label %79, !dbg !270

79:                                               ; preds = %40, %77
  %80 = phi i32 [ 0, %40 ], [ %47, %77 ]
  br label %82, !dbg !270

81:                                               ; preds = %82, %77, %36
  ret void, !dbg !288

82:                                               ; preds = %79, %82
  %83 = phi i32 [ %101, %82 ], [ %80, %79 ]
    #dbg_value(i32 %83, !182, !DIExpression(), !268)
    #dbg_value(i32 %83, !184, !DIExpression(), !289)
  %84 = getelementptr inbounds nuw i32, ptr %6, i32 %83, !dbg !272
  %85 = load i32, ptr %84, align 4, !dbg !272, !tbaa !273
    #dbg_value(i32 %85, !187, !DIExpression(), !289)
    #dbg_value(i32 %3, !188, !DIExpression(), !289)
    #dbg_value(i32 %4, !189, !DIExpression(), !289)
    #dbg_value(i32 %83, !190, !DIExpression(), !289)
  %86 = icmp ult i32 %83, %3, !dbg !275
  %87 = select i1 %86, i32 %4, i32 %41, !dbg !276
  %88 = add i32 %85, %87, !dbg !276
    #dbg_value(i32 %88, !191, !DIExpression(), !289)
    #dbg_value(i32 %88, !197, !DIExpression(), !289)
    #dbg_value(i32 %83, !198, !DIExpression(), !289)
    #dbg_value(i32 %85, !199, !DIExpression(), !289)
    #dbg_value(i32 %3, !200, !DIExpression(), !289)
    #dbg_value(i32 %4, !201, !DIExpression(), !289)
    #dbg_value(i32 %83, !202, !DIExpression(), !289)
    #dbg_value(i32 3, !203, !DIExpression(), !289)
    #dbg_value(i32 poison, !204, !DIExpression(), !289)
  %89 = urem i32 %83, 3, !dbg !277
    #dbg_value(i32 %89, !204, !DIExpression(), !289)
    #dbg_value(i32 %89, !205, !DIExpression(), !289)
  %90 = icmp eq i32 %89, 0, !dbg !280
  %91 = mul i32 %85, %4, !dbg !281
  %92 = add i32 %85, %3, !dbg !281
  %93 = select i1 %90, i32 %91, i32 %92, !dbg !281
    #dbg_value(i32 %93, !206, !DIExpression(), !289)
    #dbg_value(i32 %93, !212, !DIExpression(), !289)
    #dbg_value(i32 %3, !213, !DIExpression(), !289)
    #dbg_value(i32 %4, !214, !DIExpression(), !289)
    #dbg_value(i32 %88, !215, !DIExpression(), !289)
  %94 = icmp ult i32 %88, %93, !dbg !282
  %95 = mul i32 %93, %4, !dbg !283
  %96 = add i32 %95, %88, !dbg !283
  %97 = add i32 %88, %3, !dbg !283
  %98 = sub i32 %97, %93, !dbg !283
  %99 = select i1 %94, i32 %96, i32 %98, !dbg !283
    #dbg_value(i32 %99, !216, !DIExpression(), !289)
  %100 = getelementptr inbounds nuw i32, ptr %37, i32 %83, !dbg !284
  store i32 %99, ptr %100, align 4, !dbg !285, !tbaa !273
  %101 = add nuw i32 %83, 1, !dbg !271
    #dbg_value(i32 %101, !182, !DIExpression(), !268)
  %102 = icmp eq i32 %101, %9, !dbg !269
  br i1 %102, label %81, label %82, !dbg !270, !llvm.loop !290
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_left_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !291 {
    #dbg_value(i32 %0, !295, !DIExpression(), !306)
    #dbg_value(i32 %1, !296, !DIExpression(), !306)
    #dbg_value(i32 %2, !297, !DIExpression(), !306)
    #dbg_value(i32 %3, !298, !DIExpression(), !306)
    #dbg_value(i32 %0, !299, !DIExpression(), !306)
  %5 = icmp ult i32 %0, %2, !dbg !307
  %6 = sub i32 0, %2, !dbg !308
  %7 = select i1 %5, i32 %3, i32 %6, !dbg !308
  %8 = add i32 %7, %1, !dbg !308
    #dbg_value(i32 %8, !300, !DIExpression(), !306)
  ret i32 %8, !dbg !309
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_right_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !310 {
    #dbg_value(i32 %0, !312, !DIExpression(), !326)
    #dbg_value(i32 %1, !313, !DIExpression(), !326)
    #dbg_value(i32 %2, !314, !DIExpression(), !326)
    #dbg_value(i32 %3, !315, !DIExpression(), !326)
    #dbg_value(i32 %0, !316, !DIExpression(), !326)
    #dbg_value(i32 3, !317, !DIExpression(), !326)
    #dbg_value(i32 poison, !318, !DIExpression(), !326)
  %5 = urem i32 %0, 3, !dbg !327
    #dbg_value(i32 %5, !318, !DIExpression(), !326)
    #dbg_value(i32 %5, !318, !DIExpression(), !326)
    #dbg_value(i32 %5, !319, !DIExpression(), !326)
  %6 = icmp eq i32 %5, 0, !dbg !330
  %7 = mul i32 %3, %1, !dbg !331
  %8 = add i32 %2, %1, !dbg !331
  %9 = select i1 %6, i32 %7, i32 %8, !dbg !331
    #dbg_value(i32 %9, !320, !DIExpression(), !326)
  ret i32 %9, !dbg !332
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_pair_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !333 {
    #dbg_value(i32 %0, !335, !DIExpression(), !348)
    #dbg_value(i32 %1, !336, !DIExpression(), !348)
    #dbg_value(i32 %2, !337, !DIExpression(), !348)
    #dbg_value(i32 %3, !338, !DIExpression(), !348)
    #dbg_value(i32 %0, !339, !DIExpression(), !348)
  %5 = icmp ult i32 %0, %1, !dbg !349
  %6 = mul i32 %3, %1, !dbg !350
  %7 = add i32 %6, %0, !dbg !350
  %8 = sub i32 %0, %1, !dbg !350
  %9 = add i32 %8, %2, !dbg !350
  %10 = select i1 %5, i32 %7, i32 %9, !dbg !350
    #dbg_value(i32 %10, !340, !DIExpression(), !348)
  ret i32 %10, !dbg !351
}

; Function Attrs: nofree norecurse nosync nounwind memory(read, argmem: readwrite, inaccessiblemem: none) uwtable
define hidden i32 @lang_fn_pipeline38_right_padded_zip_u32_into(ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readnone byval(%struct.ink_l_uint32) align 4 %1, i32 noundef %2, i32 noundef %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #8 !dbg !352 {
    #dbg_declare(ptr %0, !356, !DIExpression(), !405)
    #dbg_declare(ptr %1, !357, !DIExpression(), !406)
    #dbg_value(i32 %2, !358, !DIExpression(), !407)
    #dbg_value(i32 %3, !359, !DIExpression(), !407)
    #dbg_value(ptr %4, !360, !DIExpression(), !407)
  %6 = load ptr, ptr %0, align 4, !dbg !408, !tbaa !228
  %7 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !408
  %8 = load i32, ptr %7, align 4, !dbg !408, !tbaa !27
    #dbg_value(ptr %6, !361, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !407)
    #dbg_value(i32 %8, !361, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !407)
    #dbg_value(ptr %4, !362, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !407)
    #dbg_value(i32 %8, !362, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !407)
    #dbg_value(i32 0, !363, !DIExpression(), !409)
  %9 = icmp eq i32 %8, 0, !dbg !410
  br i1 %9, label %53, label %10, !dbg !411

10:                                               ; preds = %5
  %11 = ptrtoint ptr %6 to i32, !dbg !408
  %12 = ptrtoint ptr %4 to i32, !dbg !408
  %13 = sub i32 0, %2
  %14 = icmp ult i32 %8, 4, !dbg !411
  %15 = sub i32 %12, %11, !dbg !411
  %16 = icmp ult i32 %15, 16, !dbg !411
  %17 = select i1 %14, i1 true, i1 %16, !dbg !411
  br i1 %17, label %51, label %18, !dbg !411

18:                                               ; preds = %10
  %19 = and i32 %8, -4, !dbg !411
  %20 = insertelement <4 x i32> poison, i32 %2, i64 0, !dbg !411
  %21 = shufflevector <4 x i32> %20, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !411
  %22 = insertelement <4 x i32> poison, i32 %3, i64 0, !dbg !411
  %23 = shufflevector <4 x i32> %22, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !411
  %24 = insertelement <4 x i32> poison, i32 %13, i64 0, !dbg !411
  %25 = shufflevector <4 x i32> %24, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !411
  br label %26, !dbg !411

26:                                               ; preds = %26, %18
  %27 = phi i32 [ 0, %18 ], [ %46, %26 ], !dbg !412
  %28 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %18 ], [ %47, %26 ]
  %29 = getelementptr inbounds nuw i32, ptr %6, i32 %27, !dbg !413
  %30 = load <4 x i32>, ptr %29, align 4, !dbg !413, !tbaa !273
  %31 = icmp ult <4 x i32> %28, %21, !dbg !414
  %32 = select <4 x i1> %31, <4 x i32> %23, <4 x i32> %25, !dbg !415
  %33 = add <4 x i32> %30, %32, !dbg !415
  %34 = urem <4 x i32> %28, splat (i32 3), !dbg !416
  %35 = icmp eq <4 x i32> %34, zeroinitializer, !dbg !419
  %36 = mul <4 x i32> %30, %23, !dbg !420
  %37 = add <4 x i32> %30, %21, !dbg !420
  %38 = select <4 x i1> %35, <4 x i32> %36, <4 x i32> %37, !dbg !420
  %39 = icmp ult <4 x i32> %33, %38, !dbg !421
  %40 = mul <4 x i32> %38, %23, !dbg !422
  %41 = add <4 x i32> %40, %33, !dbg !422
  %42 = add <4 x i32> %33, %21, !dbg !422
  %43 = sub <4 x i32> %42, %38, !dbg !422
  %44 = select <4 x i1> %39, <4 x i32> %41, <4 x i32> %43, !dbg !422
  %45 = getelementptr inbounds nuw i32, ptr %4, i32 %27, !dbg !423
  store <4 x i32> %44, ptr %45, align 4, !dbg !424, !tbaa !273
  %46 = add nuw i32 %27, 4, !dbg !412
  %47 = add <4 x i32> %28, splat (i32 4)
  %48 = icmp eq i32 %46, %19, !dbg !412
  br i1 %48, label %49, label %26, !dbg !412, !llvm.loop !425

49:                                               ; preds = %26
  %50 = icmp eq i32 %8, %19, !dbg !411
  br i1 %50, label %53, label %51, !dbg !411

51:                                               ; preds = %10, %49
  %52 = phi i32 [ 0, %10 ], [ %19, %49 ]
  br label %54, !dbg !411

53:                                               ; preds = %54, %49, %5
  ret i32 %8, !dbg !427

54:                                               ; preds = %51, %54
  %55 = phi i32 [ %73, %54 ], [ %52, %51 ]
    #dbg_value(i32 %55, !363, !DIExpression(), !409)
    #dbg_value(i32 %55, !365, !DIExpression(), !428)
  %56 = getelementptr inbounds nuw i32, ptr %6, i32 %55, !dbg !413
  %57 = load i32, ptr %56, align 4, !dbg !413, !tbaa !273
    #dbg_value(i32 %57, !368, !DIExpression(), !428)
    #dbg_value(i32 %2, !369, !DIExpression(), !428)
    #dbg_value(i32 %3, !370, !DIExpression(), !428)
    #dbg_value(i32 %55, !371, !DIExpression(), !428)
  %58 = icmp ult i32 %55, %2, !dbg !414
  %59 = select i1 %58, i32 %3, i32 %13, !dbg !415
  %60 = add i32 %57, %59, !dbg !415
    #dbg_value(i32 %60, !372, !DIExpression(), !428)
    #dbg_value(i32 %60, !378, !DIExpression(), !428)
    #dbg_value(i32 %55, !379, !DIExpression(), !428)
    #dbg_value(i32 %57, !380, !DIExpression(), !428)
    #dbg_value(i32 %2, !381, !DIExpression(), !428)
    #dbg_value(i32 %3, !382, !DIExpression(), !428)
    #dbg_value(i32 %55, !383, !DIExpression(), !428)
    #dbg_value(i32 3, !384, !DIExpression(), !428)
    #dbg_value(i32 poison, !385, !DIExpression(), !428)
  %61 = urem i32 %55, 3, !dbg !416
    #dbg_value(i32 %61, !385, !DIExpression(), !428)
    #dbg_value(i32 %61, !386, !DIExpression(), !428)
  %62 = icmp eq i32 %61, 0, !dbg !419
  %63 = mul i32 %57, %3, !dbg !420
  %64 = add i32 %57, %2, !dbg !420
  %65 = select i1 %62, i32 %63, i32 %64, !dbg !420
    #dbg_value(i32 %65, !387, !DIExpression(), !428)
    #dbg_value(i32 %65, !393, !DIExpression(), !428)
    #dbg_value(i32 %2, !394, !DIExpression(), !428)
    #dbg_value(i32 %3, !395, !DIExpression(), !428)
    #dbg_value(i32 %60, !396, !DIExpression(), !428)
  %66 = icmp ult i32 %60, %65, !dbg !421
  %67 = mul i32 %65, %3, !dbg !422
  %68 = add i32 %67, %60, !dbg !422
  %69 = add i32 %60, %2, !dbg !422
  %70 = sub i32 %69, %65, !dbg !422
  %71 = select i1 %66, i32 %68, i32 %70, !dbg !422
    #dbg_value(i32 %71, !397, !DIExpression(), !428)
  %72 = getelementptr inbounds nuw i32, ptr %4, i32 %55, !dbg !423
  store i32 %71, ptr %72, align 4, !dbg !424, !tbaa !273
  %73 = add nuw i32 %55, 1, !dbg !412
    #dbg_value(i32 %73, !363, !DIExpression(), !409)
  %74 = icmp eq i32 %73, %8, !dbg !410
  br i1 %74, label %53, label %54, !dbg !411, !llvm.loop !429
}

; Function Attrs: nounwind memory(read, argmem: readwrite, inaccessiblemem: write) uwtable
define hidden i32 @ink_compute_into(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readonly %2, ptr nocapture noundef writeonly %3) local_unnamed_addr #9 !dbg !430 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !448)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !448)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !448)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !448)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !448)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !448)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !448)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !448)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !450)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !450)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !450)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !450)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !450)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !450)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !450)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !450)
    #dbg_value(i32 %0, !438, !DIExpression(), !452)
    #dbg_value(ptr %1, !439, !DIExpression(), !452)
    #dbg_value(ptr %2, !440, !DIExpression(), !452)
    #dbg_value(ptr %3, !441, !DIExpression(), !452)
  %5 = ptrtoint ptr %3 to i32, !dbg !453
  %6 = icmp eq i32 %0, 0, !dbg !453
  br i1 %6, label %7, label %113, !dbg !453

7:                                                ; preds = %4
  %8 = load ptr, ptr %1, align 4, !dbg !454, !tbaa !455
    #dbg_value(ptr %8, !442, !DIExpression(), !456)
    #dbg_value(ptr poison, !445, !DIExpression(), !456)
  %9 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !457
  %10 = load ptr, ptr %9, align 4, !dbg !457, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !448)
    #dbg_value(ptr %10, !115, !DIExpression(), !448)
    #dbg_value(i32 4, !116, !DIExpression(), !448)
    #dbg_value(ptr undef, !117, !DIExpression(), !448)
    #dbg_value(ptr %10, !119, !DIExpression(), !448)
    #dbg_value(i32 0, !122, !DIExpression(), !458)
  %11 = load i8, ptr %10, align 1, !dbg !459, !tbaa !132
    #dbg_value(i8 %11, !446, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !456)
    #dbg_value(i32 1, !122, !DIExpression(), !458)
  %12 = getelementptr inbounds nuw i8, ptr %10, i32 1, !dbg !459
  %13 = load i8, ptr %12, align 1, !dbg !459, !tbaa !132
    #dbg_value(i8 %13, !446, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !456)
    #dbg_value(i32 2, !122, !DIExpression(), !458)
  %14 = getelementptr inbounds nuw i8, ptr %10, i32 2, !dbg !459
  %15 = load i8, ptr %14, align 1, !dbg !459, !tbaa !132
    #dbg_value(i8 %15, !446, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !456)
    #dbg_value(i32 3, !122, !DIExpression(), !458)
  %16 = getelementptr inbounds nuw i8, ptr %10, i32 3, !dbg !459
  %17 = load i8, ptr %16, align 1, !dbg !459, !tbaa !132
    #dbg_value(i8 %17, !446, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !456)
    #dbg_value(i32 4, !122, !DIExpression(), !458)
  %18 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !460
  %19 = load ptr, ptr %18, align 4, !dbg !460, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !450)
    #dbg_value(ptr %19, !115, !DIExpression(), !450)
    #dbg_value(i32 4, !116, !DIExpression(), !450)
    #dbg_value(ptr undef, !117, !DIExpression(), !450)
    #dbg_value(ptr %19, !119, !DIExpression(), !450)
    #dbg_value(i32 0, !122, !DIExpression(), !461)
  %20 = load i8, ptr %19, align 1, !dbg !462, !tbaa !132
    #dbg_value(i8 %20, !447, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !456)
    #dbg_value(i32 1, !122, !DIExpression(), !461)
  %21 = getelementptr inbounds nuw i8, ptr %19, i32 1, !dbg !462
  %22 = load i8, ptr %21, align 1, !dbg !462, !tbaa !132
    #dbg_value(i8 %22, !447, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !456)
    #dbg_value(i32 2, !122, !DIExpression(), !461)
  %23 = getelementptr inbounds nuw i8, ptr %19, i32 2, !dbg !462
  %24 = load i8, ptr %23, align 1, !dbg !462, !tbaa !132
    #dbg_value(i8 %24, !447, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !456)
    #dbg_value(i32 3, !122, !DIExpression(), !461)
  %25 = getelementptr inbounds nuw i8, ptr %19, i32 3, !dbg !462
  %26 = load i8, ptr %25, align 1, !dbg !462, !tbaa !132
    #dbg_value(i8 %26, !447, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !456)
    #dbg_value(i32 4, !122, !DIExpression(), !461)
  %27 = load i32, ptr %2, align 4, !dbg !463, !tbaa !27
  %28 = zext i8 %17 to i32, !dbg !464
  %29 = shl nuw i32 %28, 24, !dbg !464
  %30 = zext i8 %15 to i32, !dbg !464
  %31 = shl nuw nsw i32 %30, 16, !dbg !464
  %32 = or disjoint i32 %29, %31, !dbg !464
  %33 = zext i8 %13 to i32, !dbg !464
  %34 = shl nuw nsw i32 %33, 8, !dbg !464
  %35 = or disjoint i32 %32, %34, !dbg !464
  %36 = zext i8 %11 to i32, !dbg !464
  %37 = or disjoint i32 %35, %36, !dbg !464
  %38 = zext i8 %26 to i32, !dbg !465
  %39 = shl nuw i32 %38, 24, !dbg !465
  %40 = zext i8 %24 to i32, !dbg !465
  %41 = shl nuw nsw i32 %40, 16, !dbg !465
  %42 = or disjoint i32 %39, %41, !dbg !465
  %43 = zext i8 %22 to i32, !dbg !465
  %44 = shl nuw nsw i32 %43, 8, !dbg !465
  %45 = or disjoint i32 %42, %44, !dbg !465
  %46 = zext i8 %20 to i32, !dbg !465
  %47 = or disjoint i32 %45, %46, !dbg !465
    #dbg_value(ptr poison, !357, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !467)
    #dbg_value(i32 poison, !357, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !467)
    #dbg_value(ptr %8, !356, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !467)
    #dbg_value(i32 %27, !356, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !467)
    #dbg_value(i32 %37, !358, !DIExpression(), !467)
    #dbg_value(i32 %47, !359, !DIExpression(), !467)
    #dbg_value(ptr %3, !360, !DIExpression(), !467)
    #dbg_value(ptr %8, !361, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !467)
    #dbg_value(i32 %27, !361, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !467)
    #dbg_value(ptr %3, !362, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !467)
    #dbg_value(i32 %27, !362, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !467)
    #dbg_value(i32 0, !363, !DIExpression(), !468)
  %48 = icmp eq i32 %27, 0, !dbg !465
  br i1 %48, label %112, label %49, !dbg !469

49:                                               ; preds = %7
  %50 = ptrtoint ptr %8 to i32, !dbg !457
  %51 = sub i32 0, %37
  %52 = icmp ult i32 %27, 4, !dbg !469
  %53 = sub i32 %5, %50, !dbg !469
  %54 = icmp ult i32 %53, 16, !dbg !469
  %55 = select i1 %52, i1 true, i1 %54, !dbg !469
  br i1 %55, label %89, label %56, !dbg !469

56:                                               ; preds = %49
  %57 = and i32 %27, -4, !dbg !469
  %58 = insertelement <4 x i32> poison, i32 %37, i64 0, !dbg !469
  %59 = shufflevector <4 x i32> %58, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !469
  %60 = insertelement <4 x i32> poison, i32 %47, i64 0, !dbg !469
  %61 = shufflevector <4 x i32> %60, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !469
  %62 = insertelement <4 x i32> poison, i32 %51, i64 0, !dbg !469
  %63 = shufflevector <4 x i32> %62, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !469
  br label %64, !dbg !469

64:                                               ; preds = %64, %56
  %65 = phi i32 [ 0, %56 ], [ %84, %64 ], !dbg !470
  %66 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %56 ], [ %85, %64 ]
  %67 = getelementptr inbounds nuw i32, ptr %8, i32 %65, !dbg !471
  %68 = load <4 x i32>, ptr %67, align 4, !dbg !471, !tbaa !273
  %69 = icmp ult <4 x i32> %66, %59, !dbg !472
  %70 = select <4 x i1> %69, <4 x i32> %61, <4 x i32> %63, !dbg !473
  %71 = add <4 x i32> %70, %68, !dbg !473
  %72 = urem <4 x i32> %66, splat (i32 3), !dbg !474
  %73 = icmp eq <4 x i32> %72, zeroinitializer, !dbg !475
  %74 = mul <4 x i32> %68, %61, !dbg !476
  %75 = add <4 x i32> %68, %59, !dbg !476
  %76 = select <4 x i1> %73, <4 x i32> %74, <4 x i32> %75, !dbg !476
  %77 = icmp ult <4 x i32> %71, %76, !dbg !477
  %78 = mul <4 x i32> %76, %61, !dbg !478
  %79 = add <4 x i32> %78, %71, !dbg !478
  %80 = add <4 x i32> %71, %59, !dbg !478
  %81 = sub <4 x i32> %80, %76, !dbg !478
  %82 = select <4 x i1> %77, <4 x i32> %79, <4 x i32> %81, !dbg !478
  %83 = getelementptr inbounds nuw i32, ptr %3, i32 %65, !dbg !479
  store <4 x i32> %82, ptr %83, align 4, !dbg !480, !tbaa !273
  %84 = add nuw i32 %65, 4, !dbg !470
  %85 = add <4 x i32> %66, splat (i32 4)
  %86 = icmp eq i32 %84, %57, !dbg !470
  br i1 %86, label %87, label %64, !dbg !470, !llvm.loop !481

87:                                               ; preds = %64
  %88 = icmp eq i32 %27, %57, !dbg !469
  br i1 %88, label %112, label %89, !dbg !469

89:                                               ; preds = %49, %87
  %90 = phi i32 [ 0, %49 ], [ %57, %87 ]
  br label %91, !dbg !469

91:                                               ; preds = %89, %91
  %92 = phi i32 [ %110, %91 ], [ %90, %89 ]
    #dbg_value(i32 %92, !363, !DIExpression(), !468)
    #dbg_value(i32 %92, !365, !DIExpression(), !483)
  %93 = getelementptr inbounds nuw i32, ptr %8, i32 %92, !dbg !471
  %94 = load i32, ptr %93, align 4, !dbg !471, !tbaa !273
    #dbg_value(i32 %94, !368, !DIExpression(), !483)
    #dbg_value(i32 %37, !369, !DIExpression(), !483)
    #dbg_value(i32 %47, !370, !DIExpression(), !483)
    #dbg_value(i32 %92, !371, !DIExpression(), !483)
  %95 = icmp ult i32 %92, %37, !dbg !472
  %96 = select i1 %95, i32 %47, i32 %51, !dbg !473
  %97 = add i32 %96, %94, !dbg !473
    #dbg_value(i32 %97, !372, !DIExpression(), !483)
    #dbg_value(i32 %97, !378, !DIExpression(), !483)
    #dbg_value(i32 %92, !379, !DIExpression(), !483)
    #dbg_value(i32 %94, !380, !DIExpression(), !483)
    #dbg_value(i32 %37, !381, !DIExpression(), !483)
    #dbg_value(i32 %47, !382, !DIExpression(), !483)
    #dbg_value(i32 %92, !383, !DIExpression(), !483)
    #dbg_value(i32 3, !384, !DIExpression(), !483)
    #dbg_value(i32 poison, !385, !DIExpression(), !483)
  %98 = urem i32 %92, 3, !dbg !474
    #dbg_value(i32 %98, !385, !DIExpression(), !483)
    #dbg_value(i32 %98, !386, !DIExpression(), !483)
  %99 = icmp eq i32 %98, 0, !dbg !475
  %100 = mul i32 %94, %47, !dbg !476
  %101 = add i32 %94, %37, !dbg !476
  %102 = select i1 %99, i32 %100, i32 %101, !dbg !476
    #dbg_value(i32 %102, !387, !DIExpression(), !483)
    #dbg_value(i32 %102, !393, !DIExpression(), !483)
    #dbg_value(i32 %37, !394, !DIExpression(), !483)
    #dbg_value(i32 %47, !395, !DIExpression(), !483)
    #dbg_value(i32 %97, !396, !DIExpression(), !483)
  %103 = icmp ult i32 %97, %102, !dbg !477
  %104 = mul i32 %102, %47, !dbg !478
  %105 = add i32 %104, %97, !dbg !478
  %106 = add i32 %97, %37, !dbg !478
  %107 = sub i32 %106, %102, !dbg !478
  %108 = select i1 %103, i32 %105, i32 %107, !dbg !478
    #dbg_value(i32 %108, !397, !DIExpression(), !483)
  %109 = getelementptr inbounds nuw i32, ptr %3, i32 %92, !dbg !479
  store i32 %108, ptr %109, align 4, !dbg !480, !tbaa !273
  %110 = add nuw i32 %92, 1, !dbg !470
    #dbg_value(i32 %110, !363, !DIExpression(), !468)
  %111 = icmp eq i32 %110, %27, !dbg !465
  br i1 %111, label %112, label %91, !dbg !469, !llvm.loop !484

112:                                              ; preds = %91, %87, %7
  ret i32 %27, !dbg !485

113:                                              ; preds = %4
  tail call void @llvm.trap(), !dbg !486
  unreachable, !dbg !488
}

; Function Attrs: nounwind uwtable
define hidden void @ink_compute_call(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readonly %2, ptr nocapture noundef writeonly %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #2 !dbg !489 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !528)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !528)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !528)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !528)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !528)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !528)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !528)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !528)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !530)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !530)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !530)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !530)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !530)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !530)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !530)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !530)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !532)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !532)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !532)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !532)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !532)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !532)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !532)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !532)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !534)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !534)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !534)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !534)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !534)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !534)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !534)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !534)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !536)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !536)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !536)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !536)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !536)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !536)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !536)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !536)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !538)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !538)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !538)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !538)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !538)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !538)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !538)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !538)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !540)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !540)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !540)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !540)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !540)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !540)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !540)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !540)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !542)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !542)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !542)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !542)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !542)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !542)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !542)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !542)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !544)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !544)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !544)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !544)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !544)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !544)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !544)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !544)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !546)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !546)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !546)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !546)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !546)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !546)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !546)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !546)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !548)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !548)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !548)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !548)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !548)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !548)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !548)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !548)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !550)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !550)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !550)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !550)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !550)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !550)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !550)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !550)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !552)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !552)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !552)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !552)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !552)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !552)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !552)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !552)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !554)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !554)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !554)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !554)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !554)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !554)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !554)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !554)
    #dbg_value(i32 %0, !495, !DIExpression(), !556)
    #dbg_value(ptr %1, !496, !DIExpression(), !556)
    #dbg_value(ptr %2, !497, !DIExpression(), !556)
    #dbg_value(ptr %3, !498, !DIExpression(), !556)
    #dbg_value(ptr %4, !499, !DIExpression(), !556)
  switch i32 %0, label %436 [
    i32 0, label %6
    i32 1, label %139
    i32 2, label %237
    i32 3, label %336
  ], !dbg !557

6:                                                ; preds = %5
  %7 = load ptr, ptr %1, align 4, !dbg !558, !tbaa !455
    #dbg_value(ptr %7, !500, !DIExpression(), !559)
    #dbg_value(ptr poison, !503, !DIExpression(), !559)
  %8 = ptrtoint ptr %7 to i32, !dbg !560
  %9 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !560
  %10 = load ptr, ptr %9, align 4, !dbg !560, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !528)
    #dbg_value(ptr %10, !115, !DIExpression(), !528)
    #dbg_value(i32 4, !116, !DIExpression(), !528)
    #dbg_value(ptr undef, !117, !DIExpression(), !528)
    #dbg_value(ptr %10, !119, !DIExpression(), !528)
    #dbg_value(i32 0, !122, !DIExpression(), !561)
  %11 = load i8, ptr %10, align 1, !dbg !562, !tbaa !132
    #dbg_value(i8 %11, !504, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !559)
    #dbg_value(i32 1, !122, !DIExpression(), !561)
  %12 = getelementptr inbounds nuw i8, ptr %10, i32 1, !dbg !562
  %13 = load i8, ptr %12, align 1, !dbg !562, !tbaa !132
    #dbg_value(i8 %13, !504, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !559)
    #dbg_value(i32 2, !122, !DIExpression(), !561)
  %14 = getelementptr inbounds nuw i8, ptr %10, i32 2, !dbg !562
  %15 = load i8, ptr %14, align 1, !dbg !562, !tbaa !132
    #dbg_value(i8 %15, !504, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !559)
    #dbg_value(i32 3, !122, !DIExpression(), !561)
  %16 = getelementptr inbounds nuw i8, ptr %10, i32 3, !dbg !562
  %17 = load i8, ptr %16, align 1, !dbg !562, !tbaa !132
    #dbg_value(i8 %17, !504, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !559)
    #dbg_value(i32 4, !122, !DIExpression(), !561)
  %18 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !563
  %19 = load ptr, ptr %18, align 4, !dbg !563, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !530)
    #dbg_value(ptr %19, !115, !DIExpression(), !530)
    #dbg_value(i32 4, !116, !DIExpression(), !530)
    #dbg_value(ptr undef, !117, !DIExpression(), !530)
    #dbg_value(ptr %19, !119, !DIExpression(), !530)
    #dbg_value(i32 0, !122, !DIExpression(), !564)
  %20 = load i8, ptr %19, align 1, !dbg !565, !tbaa !132
    #dbg_value(i8 %20, !505, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !559)
    #dbg_value(i32 1, !122, !DIExpression(), !564)
  %21 = getelementptr inbounds nuw i8, ptr %19, i32 1, !dbg !565
  %22 = load i8, ptr %21, align 1, !dbg !565, !tbaa !132
    #dbg_value(i8 %22, !505, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !559)
    #dbg_value(i32 2, !122, !DIExpression(), !564)
  %23 = getelementptr inbounds nuw i8, ptr %19, i32 2, !dbg !565
  %24 = load i8, ptr %23, align 1, !dbg !565, !tbaa !132
    #dbg_value(i8 %24, !505, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !559)
    #dbg_value(i32 3, !122, !DIExpression(), !564)
  %25 = getelementptr inbounds nuw i8, ptr %19, i32 3, !dbg !565
  %26 = load i8, ptr %25, align 1, !dbg !565, !tbaa !132
    #dbg_value(i8 %26, !505, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !559)
    #dbg_value(i32 4, !122, !DIExpression(), !564)
  %27 = load i32, ptr %2, align 4, !dbg !566, !tbaa !27
  %28 = zext i8 %17 to i32, !dbg !567
  %29 = shl nuw i32 %28, 24, !dbg !567
  %30 = zext i8 %15 to i32, !dbg !567
  %31 = shl nuw nsw i32 %30, 16, !dbg !567
  %32 = or disjoint i32 %29, %31, !dbg !567
  %33 = zext i8 %13 to i32, !dbg !567
  %34 = shl nuw nsw i32 %33, 8, !dbg !567
  %35 = or disjoint i32 %32, %34, !dbg !567
  %36 = zext i8 %11 to i32, !dbg !567
  %37 = or disjoint i32 %35, %36, !dbg !567
  %38 = zext i8 %26 to i32, !dbg !568
  %39 = shl nuw i32 %38, 24, !dbg !568
  %40 = zext i8 %24 to i32, !dbg !568
  %41 = shl nuw nsw i32 %40, 16, !dbg !568
  %42 = or disjoint i32 %39, %41, !dbg !568
  %43 = zext i8 %22 to i32, !dbg !568
  %44 = shl nuw nsw i32 %43, 8, !dbg !568
  %45 = or disjoint i32 %42, %44, !dbg !568
  %46 = zext i8 %20 to i32, !dbg !568
  %47 = or disjoint i32 %45, %46, !dbg !568
    #dbg_value(ptr poison, !177, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !571)
    #dbg_value(i32 poison, !177, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !571)
    #dbg_value(ptr %7, !176, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !571)
    #dbg_value(i32 %27, !176, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !571)
    #dbg_value(i32 %37, !178, !DIExpression(), !571)
    #dbg_value(i32 %47, !179, !DIExpression(), !571)
    #dbg_value(ptr %7, !180, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !571)
    #dbg_value(i32 %27, !180, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !571)
    #dbg_value(i32 %27, !55, !DIExpression(), !572)
    #dbg_value(i32 4, !56, !DIExpression(), !572)
  %48 = icmp ugt i32 %27, 1073741823, !dbg !568
  %49 = load i32, ptr @ink_top, align 4, !noalias !573
  %50 = icmp ugt i32 %49, -8
  %51 = select i1 %48, i1 true, i1 %50, !dbg !576
  br i1 %51, label %52, label %53, !dbg !576

52:                                               ; preds = %6
  tail call void @llvm.trap(), !dbg !577
  unreachable, !dbg !579

53:                                               ; preds = %6
  %54 = icmp eq i32 %49, 0, !dbg !580
  %55 = add nuw i32 %49, 7, !dbg !581
  %56 = select i1 %54, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %55, !dbg !582
  %57 = and i32 %56, -8, !dbg !583
    #dbg_value(i32 %57, !57, !DIExpression(), !572)
  %58 = tail call i32 @llvm.umax.i32(i32 %27, i32 1), !dbg !584
  %59 = shl nuw i32 %58, 2, !dbg !585
    #dbg_value(i32 %59, !58, !DIExpression(), !572)
  %60 = xor i32 %57, -1, !dbg !586
  %61 = icmp ugt i32 %59, %60, !dbg !587
  br i1 %61, label %62, label %63, !dbg !587

62:                                               ; preds = %53
  tail call void @llvm.trap(), !dbg !588
  unreachable, !dbg !590

63:                                               ; preds = %53
  %64 = add i32 %57, %59, !dbg !591
  store i32 %64, ptr @ink_top, align 4, !dbg !592, !tbaa !27, !noalias !573
  %65 = add i32 %64, 65535, !dbg !593
  %66 = lshr i32 %65, 16, !dbg !594
    #dbg_value(i32 %66, !59, !DIExpression(), !572)
  %67 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !595, !noalias !573
    #dbg_value(i32 %67, !60, !DIExpression(), !572)
  %68 = icmp ugt i32 %66, %67, !dbg !596
  br i1 %68, label %69, label %74, !dbg !597

69:                                               ; preds = %63
  %70 = sub nuw nsw i32 %66, %67, !dbg !598
  %71 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %70), !dbg !599, !noalias !573
  %72 = icmp eq i32 %71, -1, !dbg !600
  br i1 %72, label %73, label %74, !dbg !597

73:                                               ; preds = %69
  tail call void @llvm.trap(), !dbg !601
  unreachable, !dbg !603

74:                                               ; preds = %69, %63
  %75 = inttoptr i32 %57 to ptr, !dbg !604
    #dbg_value(ptr %75, !181, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !571)
    #dbg_value(ptr %75, !506, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !559)
    #dbg_value(i32 %27, !181, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !571)
    #dbg_value(i32 %27, !506, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !559)
    #dbg_value(i32 0, !182, !DIExpression(), !605)
  %76 = icmp eq i32 %27, 0, !dbg !606
  br i1 %76, label %441, label %77, !dbg !607

77:                                               ; preds = %74
  %78 = sub i32 0, %37
  %79 = icmp ult i32 %27, 4, !dbg !607
  %80 = sub i32 %57, %8, !dbg !607
  %81 = icmp ult i32 %80, 16, !dbg !607
  %82 = select i1 %79, i1 true, i1 %81, !dbg !607
  br i1 %82, label %116, label %83, !dbg !607

83:                                               ; preds = %77
  %84 = and i32 %27, 1073741820, !dbg !607
  %85 = insertelement <4 x i32> poison, i32 %37, i64 0, !dbg !607
  %86 = shufflevector <4 x i32> %85, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !607
  %87 = insertelement <4 x i32> poison, i32 %47, i64 0, !dbg !607
  %88 = shufflevector <4 x i32> %87, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !607
  %89 = insertelement <4 x i32> poison, i32 %78, i64 0, !dbg !607
  %90 = shufflevector <4 x i32> %89, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !607
  br label %91, !dbg !607

91:                                               ; preds = %91, %83
  %92 = phi i32 [ 0, %83 ], [ %111, %91 ], !dbg !608
  %93 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %83 ], [ %112, %91 ]
  %94 = getelementptr inbounds nuw i32, ptr %7, i32 %92, !dbg !609
  %95 = load <4 x i32>, ptr %94, align 4, !dbg !609, !tbaa !273, !noalias !573
  %96 = icmp ult <4 x i32> %93, %86, !dbg !610
  %97 = select <4 x i1> %96, <4 x i32> %88, <4 x i32> %90, !dbg !611
  %98 = add <4 x i32> %97, %95, !dbg !611
  %99 = urem <4 x i32> %93, splat (i32 3), !dbg !612
  %100 = icmp eq <4 x i32> %99, zeroinitializer, !dbg !613
  %101 = mul <4 x i32> %95, %88, !dbg !614
  %102 = add <4 x i32> %95, %86, !dbg !614
  %103 = select <4 x i1> %100, <4 x i32> %101, <4 x i32> %102, !dbg !614
  %104 = icmp ult <4 x i32> %98, %103, !dbg !615
  %105 = mul <4 x i32> %103, %88, !dbg !616
  %106 = add <4 x i32> %105, %98, !dbg !616
  %107 = add <4 x i32> %98, %86, !dbg !616
  %108 = sub <4 x i32> %107, %103, !dbg !616
  %109 = select <4 x i1> %104, <4 x i32> %106, <4 x i32> %108, !dbg !616
  %110 = getelementptr inbounds nuw i32, ptr %75, i32 %92, !dbg !617
  store <4 x i32> %109, ptr %110, align 8, !dbg !618, !tbaa !273, !noalias !573
  %111 = add nuw i32 %92, 4, !dbg !608
  %112 = add <4 x i32> %93, splat (i32 4)
  %113 = icmp eq i32 %111, %84, !dbg !608
  br i1 %113, label %114, label %91, !dbg !608, !llvm.loop !619

114:                                              ; preds = %91
  %115 = icmp eq i32 %27, %84, !dbg !607
  br i1 %115, label %441, label %116, !dbg !607

116:                                              ; preds = %77, %114
  %117 = phi i32 [ 0, %77 ], [ %84, %114 ]
  br label %118, !dbg !607

118:                                              ; preds = %116, %118
  %119 = phi i32 [ %137, %118 ], [ %117, %116 ]
    #dbg_value(i32 %119, !182, !DIExpression(), !605)
    #dbg_value(i32 %119, !184, !DIExpression(), !621)
  %120 = getelementptr inbounds nuw i32, ptr %7, i32 %119, !dbg !609
  %121 = load i32, ptr %120, align 4, !dbg !609, !tbaa !273, !noalias !573
    #dbg_value(i32 %121, !187, !DIExpression(), !621)
    #dbg_value(i32 %37, !188, !DIExpression(), !621)
    #dbg_value(i32 %47, !189, !DIExpression(), !621)
    #dbg_value(i32 %119, !190, !DIExpression(), !621)
  %122 = icmp ult i32 %119, %37, !dbg !610
  %123 = select i1 %122, i32 %47, i32 %78, !dbg !611
  %124 = add i32 %123, %121, !dbg !611
    #dbg_value(i32 %124, !191, !DIExpression(), !621)
    #dbg_value(i32 %124, !197, !DIExpression(), !621)
    #dbg_value(i32 %119, !198, !DIExpression(), !621)
    #dbg_value(i32 %121, !199, !DIExpression(), !621)
    #dbg_value(i32 %37, !200, !DIExpression(), !621)
    #dbg_value(i32 %47, !201, !DIExpression(), !621)
    #dbg_value(i32 %119, !202, !DIExpression(), !621)
    #dbg_value(i32 3, !203, !DIExpression(), !621)
    #dbg_value(i32 poison, !204, !DIExpression(), !621)
  %125 = urem i32 %119, 3, !dbg !612
    #dbg_value(i32 %125, !204, !DIExpression(), !621)
    #dbg_value(i32 %125, !205, !DIExpression(), !621)
  %126 = icmp eq i32 %125, 0, !dbg !613
  %127 = mul i32 %121, %47, !dbg !614
  %128 = add i32 %121, %37, !dbg !614
  %129 = select i1 %126, i32 %127, i32 %128, !dbg !614
    #dbg_value(i32 %129, !206, !DIExpression(), !621)
    #dbg_value(i32 %129, !212, !DIExpression(), !621)
    #dbg_value(i32 %37, !213, !DIExpression(), !621)
    #dbg_value(i32 %47, !214, !DIExpression(), !621)
    #dbg_value(i32 %124, !215, !DIExpression(), !621)
  %130 = icmp ult i32 %124, %129, !dbg !615
  %131 = mul i32 %129, %47, !dbg !616
  %132 = add i32 %131, %124, !dbg !616
  %133 = add i32 %124, %37, !dbg !616
  %134 = sub i32 %133, %129, !dbg !616
  %135 = select i1 %130, i32 %132, i32 %134, !dbg !616
    #dbg_value(i32 %135, !216, !DIExpression(), !621)
  %136 = getelementptr inbounds nuw i32, ptr %75, i32 %119, !dbg !617
  store i32 %135, ptr %136, align 4, !dbg !618, !tbaa !273, !noalias !573
  %137 = add nuw i32 %119, 1, !dbg !608
    #dbg_value(i32 %137, !182, !DIExpression(), !605)
  %138 = icmp eq i32 %137, %27, !dbg !606
  br i1 %138, label %441, label %118, !dbg !607, !llvm.loop !622

139:                                              ; preds = %5
  %140 = load ptr, ptr %1, align 4, !dbg !623, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !532)
    #dbg_value(ptr %140, !115, !DIExpression(), !532)
    #dbg_value(i32 4, !116, !DIExpression(), !532)
    #dbg_value(ptr undef, !117, !DIExpression(), !532)
    #dbg_value(ptr %140, !119, !DIExpression(), !532)
    #dbg_value(i32 0, !122, !DIExpression(), !624)
  %141 = load i8, ptr %140, align 1, !dbg !625, !tbaa !132
    #dbg_value(i8 %141, !507, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !626)
    #dbg_value(i32 1, !122, !DIExpression(), !624)
  %142 = getelementptr inbounds nuw i8, ptr %140, i32 1, !dbg !625
  %143 = load i8, ptr %142, align 1, !dbg !625, !tbaa !132
    #dbg_value(i8 %143, !507, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !626)
    #dbg_value(i32 2, !122, !DIExpression(), !624)
  %144 = getelementptr inbounds nuw i8, ptr %140, i32 2, !dbg !625
  %145 = load i8, ptr %144, align 1, !dbg !625, !tbaa !132
    #dbg_value(i8 %145, !507, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !626)
    #dbg_value(i32 3, !122, !DIExpression(), !624)
  %146 = getelementptr inbounds nuw i8, ptr %140, i32 3, !dbg !625
  %147 = load i8, ptr %146, align 1, !dbg !625, !tbaa !132
    #dbg_value(i8 %147, !507, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !626)
    #dbg_value(i32 4, !122, !DIExpression(), !624)
  %148 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !627
  %149 = load ptr, ptr %148, align 4, !dbg !627, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !534)
    #dbg_value(ptr %149, !115, !DIExpression(), !534)
    #dbg_value(i32 4, !116, !DIExpression(), !534)
    #dbg_value(ptr undef, !117, !DIExpression(), !534)
    #dbg_value(ptr %149, !119, !DIExpression(), !534)
    #dbg_value(i32 0, !122, !DIExpression(), !628)
  %150 = load i8, ptr %149, align 1, !dbg !629, !tbaa !132
    #dbg_value(i8 %150, !509, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !626)
    #dbg_value(i32 1, !122, !DIExpression(), !628)
  %151 = getelementptr inbounds nuw i8, ptr %149, i32 1, !dbg !629
  %152 = load i8, ptr %151, align 1, !dbg !629, !tbaa !132
    #dbg_value(i8 %152, !509, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !626)
    #dbg_value(i32 2, !122, !DIExpression(), !628)
  %153 = getelementptr inbounds nuw i8, ptr %149, i32 2, !dbg !629
  %154 = load i8, ptr %153, align 1, !dbg !629, !tbaa !132
    #dbg_value(i8 %154, !509, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !626)
    #dbg_value(i32 3, !122, !DIExpression(), !628)
  %155 = getelementptr inbounds nuw i8, ptr %149, i32 3, !dbg !629
  %156 = load i8, ptr %155, align 1, !dbg !629, !tbaa !132
    #dbg_value(i8 %156, !509, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !626)
    #dbg_value(i32 4, !122, !DIExpression(), !628)
  %157 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !630
  %158 = load ptr, ptr %157, align 4, !dbg !630, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !536)
    #dbg_value(ptr %158, !115, !DIExpression(), !536)
    #dbg_value(i32 4, !116, !DIExpression(), !536)
    #dbg_value(ptr undef, !117, !DIExpression(), !536)
    #dbg_value(ptr %158, !119, !DIExpression(), !536)
    #dbg_value(i32 0, !122, !DIExpression(), !631)
  %159 = load i8, ptr %158, align 1, !dbg !632, !tbaa !132
    #dbg_value(i8 %159, !510, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !626)
    #dbg_value(i32 1, !122, !DIExpression(), !631)
  %160 = getelementptr inbounds nuw i8, ptr %158, i32 1, !dbg !632
  %161 = load i8, ptr %160, align 1, !dbg !632, !tbaa !132
    #dbg_value(i8 %161, !510, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !626)
    #dbg_value(i32 2, !122, !DIExpression(), !631)
  %162 = getelementptr inbounds nuw i8, ptr %158, i32 2, !dbg !632
  %163 = load i8, ptr %162, align 1, !dbg !632, !tbaa !132
    #dbg_value(i8 %163, !510, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !626)
    #dbg_value(i32 3, !122, !DIExpression(), !631)
  %164 = getelementptr inbounds nuw i8, ptr %158, i32 3, !dbg !632
  %165 = load i8, ptr %164, align 1, !dbg !632, !tbaa !132
    #dbg_value(i8 %165, !510, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !626)
    #dbg_value(i32 4, !122, !DIExpression(), !631)
  %166 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !633
  %167 = load ptr, ptr %166, align 4, !dbg !633, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !538)
    #dbg_value(ptr %167, !115, !DIExpression(), !538)
    #dbg_value(i32 4, !116, !DIExpression(), !538)
    #dbg_value(ptr undef, !117, !DIExpression(), !538)
    #dbg_value(ptr %167, !119, !DIExpression(), !538)
    #dbg_value(i32 0, !122, !DIExpression(), !634)
  %168 = load i8, ptr %167, align 1, !dbg !635, !tbaa !132
    #dbg_value(i8 %168, !511, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !626)
    #dbg_value(i32 1, !122, !DIExpression(), !634)
  %169 = getelementptr inbounds nuw i8, ptr %167, i32 1, !dbg !635
  %170 = load i8, ptr %169, align 1, !dbg !635, !tbaa !132
    #dbg_value(i8 %170, !511, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !626)
    #dbg_value(i32 2, !122, !DIExpression(), !634)
  %171 = getelementptr inbounds nuw i8, ptr %167, i32 2, !dbg !635
  %172 = load i8, ptr %171, align 1, !dbg !635, !tbaa !132
    #dbg_value(i8 %172, !511, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !626)
    #dbg_value(i32 3, !122, !DIExpression(), !634)
  %173 = getelementptr inbounds nuw i8, ptr %167, i32 3, !dbg !635
  %174 = load i8, ptr %173, align 1, !dbg !635, !tbaa !132
    #dbg_value(i8 %174, !511, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !626)
    #dbg_value(i32 4, !122, !DIExpression(), !634)
  %175 = zext i8 %147 to i32, !dbg !636
  %176 = shl nuw i32 %175, 24, !dbg !636
  %177 = zext i8 %145 to i32, !dbg !636
  %178 = shl nuw nsw i32 %177, 16, !dbg !636
  %179 = or disjoint i32 %176, %178, !dbg !636
  %180 = zext i8 %143 to i32, !dbg !636
  %181 = shl nuw nsw i32 %180, 8, !dbg !636
  %182 = or disjoint i32 %179, %181, !dbg !636
  %183 = zext i8 %141 to i32, !dbg !636
  %184 = or disjoint i32 %182, %183, !dbg !636
  %185 = zext i8 %156 to i32, !dbg !637
  %186 = shl nuw i32 %185, 24, !dbg !637
  %187 = zext i8 %154 to i32, !dbg !637
  %188 = shl nuw nsw i32 %187, 16, !dbg !637
  %189 = or disjoint i32 %186, %188, !dbg !637
  %190 = zext i8 %152 to i32, !dbg !637
  %191 = shl nuw nsw i32 %190, 8, !dbg !637
  %192 = or disjoint i32 %189, %191, !dbg !637
  %193 = zext i8 %150 to i32, !dbg !637
  %194 = or disjoint i32 %192, %193, !dbg !637
  %195 = zext i8 %165 to i32, !dbg !638
  %196 = shl nuw i32 %195, 24, !dbg !638
  %197 = zext i8 %163 to i32, !dbg !638
  %198 = shl nuw nsw i32 %197, 16, !dbg !638
  %199 = or disjoint i32 %196, %198, !dbg !638
  %200 = zext i8 %161 to i32, !dbg !638
  %201 = shl nuw nsw i32 %200, 8, !dbg !638
  %202 = or disjoint i32 %199, %201, !dbg !638
  %203 = zext i8 %159 to i32, !dbg !638
  %204 = or disjoint i32 %202, %203, !dbg !638
  %205 = zext i8 %174 to i32, !dbg !639
  %206 = shl nuw i32 %205, 24, !dbg !639
  %207 = zext i8 %172 to i32, !dbg !639
  %208 = shl nuw nsw i32 %207, 16, !dbg !639
  %209 = or disjoint i32 %206, %208, !dbg !639
  %210 = zext i8 %170 to i32, !dbg !639
  %211 = shl nuw nsw i32 %210, 8, !dbg !639
  %212 = or disjoint i32 %209, %211, !dbg !639
  %213 = zext i8 %168 to i32, !dbg !639
  %214 = or disjoint i32 %212, %213, !dbg !639
    #dbg_value(i32 %184, !295, !DIExpression(), !641)
    #dbg_value(i32 %194, !296, !DIExpression(), !641)
    #dbg_value(i32 %204, !297, !DIExpression(), !641)
    #dbg_value(i32 %214, !298, !DIExpression(), !641)
    #dbg_value(i32 %184, !299, !DIExpression(), !641)
  %215 = icmp ult i32 %184, %204, !dbg !639
  %216 = sub i32 0, %204, !dbg !642
  %217 = select i1 %215, i32 %214, i32 %216, !dbg !642
  %218 = add i32 %217, %194, !dbg !642
    #dbg_value(i32 %218, !300, !DIExpression(), !641)
    #dbg_value(i32 %218, !512, !DIExpression(), !626)
    #dbg_value(i32 1, !55, !DIExpression(), !643)
    #dbg_value(i32 4, !56, !DIExpression(), !643)
  %219 = load i32, ptr @ink_top, align 4
  %220 = icmp ugt i32 %219, -8
  br i1 %220, label %221, label %222, !dbg !645

221:                                              ; preds = %139
  tail call void @llvm.trap(), !dbg !646
  unreachable, !dbg !648

222:                                              ; preds = %139
  %223 = icmp eq i32 %219, 0, !dbg !649
  %224 = add nuw i32 %219, 7, !dbg !650
  %225 = select i1 %223, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %224, !dbg !651
  %226 = and i32 %225, -8, !dbg !652
    #dbg_value(i32 %226, !57, !DIExpression(), !643)
    #dbg_value(i32 4, !58, !DIExpression(), !643)
  %227 = or disjoint i32 %226, 4, !dbg !653
  store i32 %227, ptr @ink_top, align 4, !dbg !654, !tbaa !27
  %228 = add i32 %226, 65539, !dbg !655
  %229 = lshr i32 %228, 16, !dbg !656
    #dbg_value(i32 %229, !59, !DIExpression(), !643)
  %230 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !657
    #dbg_value(i32 %230, !60, !DIExpression(), !643)
  %231 = icmp ugt i32 %229, %230, !dbg !658
  br i1 %231, label %232, label %437, !dbg !659

232:                                              ; preds = %222
  %233 = sub nuw nsw i32 %229, %230, !dbg !660
  %234 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %233), !dbg !661
  %235 = icmp eq i32 %234, -1, !dbg !662
  br i1 %235, label %236, label %437, !dbg !659

236:                                              ; preds = %232
  tail call void @llvm.trap(), !dbg !663
  unreachable, !dbg !665

237:                                              ; preds = %5
  %238 = load ptr, ptr %1, align 4, !dbg !666, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !540)
    #dbg_value(ptr %238, !115, !DIExpression(), !540)
    #dbg_value(i32 4, !116, !DIExpression(), !540)
    #dbg_value(ptr undef, !117, !DIExpression(), !540)
    #dbg_value(ptr %238, !119, !DIExpression(), !540)
    #dbg_value(i32 0, !122, !DIExpression(), !667)
  %239 = load i8, ptr %238, align 1, !dbg !668, !tbaa !132
    #dbg_value(i8 %239, !514, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !669)
    #dbg_value(i32 1, !122, !DIExpression(), !667)
  %240 = getelementptr inbounds nuw i8, ptr %238, i32 1, !dbg !668
  %241 = load i8, ptr %240, align 1, !dbg !668, !tbaa !132
    #dbg_value(i8 %241, !514, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !669)
    #dbg_value(i32 2, !122, !DIExpression(), !667)
  %242 = getelementptr inbounds nuw i8, ptr %238, i32 2, !dbg !668
  %243 = load i8, ptr %242, align 1, !dbg !668, !tbaa !132
    #dbg_value(i8 %243, !514, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !669)
    #dbg_value(i32 3, !122, !DIExpression(), !667)
  %244 = getelementptr inbounds nuw i8, ptr %238, i32 3, !dbg !668
  %245 = load i8, ptr %244, align 1, !dbg !668, !tbaa !132
    #dbg_value(i8 %245, !514, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !669)
    #dbg_value(i32 4, !122, !DIExpression(), !667)
  %246 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !670
  %247 = load ptr, ptr %246, align 4, !dbg !670, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !542)
    #dbg_value(ptr %247, !115, !DIExpression(), !542)
    #dbg_value(i32 4, !116, !DIExpression(), !542)
    #dbg_value(ptr undef, !117, !DIExpression(), !542)
    #dbg_value(ptr %247, !119, !DIExpression(), !542)
    #dbg_value(i32 0, !122, !DIExpression(), !671)
  %248 = load i8, ptr %247, align 1, !dbg !672, !tbaa !132
    #dbg_value(i8 %248, !516, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !669)
    #dbg_value(i32 1, !122, !DIExpression(), !671)
  %249 = getelementptr inbounds nuw i8, ptr %247, i32 1, !dbg !672
  %250 = load i8, ptr %249, align 1, !dbg !672, !tbaa !132
    #dbg_value(i8 %250, !516, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !669)
    #dbg_value(i32 2, !122, !DIExpression(), !671)
  %251 = getelementptr inbounds nuw i8, ptr %247, i32 2, !dbg !672
  %252 = load i8, ptr %251, align 1, !dbg !672, !tbaa !132
    #dbg_value(i8 %252, !516, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !669)
    #dbg_value(i32 3, !122, !DIExpression(), !671)
  %253 = getelementptr inbounds nuw i8, ptr %247, i32 3, !dbg !672
  %254 = load i8, ptr %253, align 1, !dbg !672, !tbaa !132
    #dbg_value(i8 %254, !516, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !669)
    #dbg_value(i32 4, !122, !DIExpression(), !671)
  %255 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !673
  %256 = load ptr, ptr %255, align 4, !dbg !673, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !544)
    #dbg_value(ptr %256, !115, !DIExpression(), !544)
    #dbg_value(i32 4, !116, !DIExpression(), !544)
    #dbg_value(ptr undef, !117, !DIExpression(), !544)
    #dbg_value(ptr %256, !119, !DIExpression(), !544)
    #dbg_value(i32 0, !122, !DIExpression(), !674)
  %257 = load i8, ptr %256, align 1, !dbg !675, !tbaa !132
    #dbg_value(i8 %257, !517, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !669)
    #dbg_value(i32 1, !122, !DIExpression(), !674)
  %258 = getelementptr inbounds nuw i8, ptr %256, i32 1, !dbg !675
  %259 = load i8, ptr %258, align 1, !dbg !675, !tbaa !132
    #dbg_value(i8 %259, !517, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !669)
    #dbg_value(i32 2, !122, !DIExpression(), !674)
  %260 = getelementptr inbounds nuw i8, ptr %256, i32 2, !dbg !675
  %261 = load i8, ptr %260, align 1, !dbg !675, !tbaa !132
    #dbg_value(i8 %261, !517, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !669)
    #dbg_value(i32 3, !122, !DIExpression(), !674)
  %262 = getelementptr inbounds nuw i8, ptr %256, i32 3, !dbg !675
  %263 = load i8, ptr %262, align 1, !dbg !675, !tbaa !132
    #dbg_value(i8 %263, !517, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !669)
    #dbg_value(i32 4, !122, !DIExpression(), !674)
  %264 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !676
  %265 = load ptr, ptr %264, align 4, !dbg !676, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !546)
    #dbg_value(ptr %265, !115, !DIExpression(), !546)
    #dbg_value(i32 4, !116, !DIExpression(), !546)
    #dbg_value(ptr undef, !117, !DIExpression(), !546)
    #dbg_value(ptr %265, !119, !DIExpression(), !546)
    #dbg_value(i32 0, !122, !DIExpression(), !677)
  %266 = load i8, ptr %265, align 1, !dbg !678, !tbaa !132
    #dbg_value(i8 %266, !518, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !669)
    #dbg_value(i32 1, !122, !DIExpression(), !677)
  %267 = getelementptr inbounds nuw i8, ptr %265, i32 1, !dbg !678
  %268 = load i8, ptr %267, align 1, !dbg !678, !tbaa !132
    #dbg_value(i8 %268, !518, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !669)
    #dbg_value(i32 2, !122, !DIExpression(), !677)
  %269 = getelementptr inbounds nuw i8, ptr %265, i32 2, !dbg !678
  %270 = load i8, ptr %269, align 1, !dbg !678, !tbaa !132
    #dbg_value(i8 %270, !518, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !669)
    #dbg_value(i32 3, !122, !DIExpression(), !677)
  %271 = getelementptr inbounds nuw i8, ptr %265, i32 3, !dbg !678
  %272 = load i8, ptr %271, align 1, !dbg !678, !tbaa !132
    #dbg_value(i8 %272, !518, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !669)
    #dbg_value(i32 4, !122, !DIExpression(), !677)
  %273 = zext i8 %245 to i32, !dbg !679
  %274 = shl nuw i32 %273, 24, !dbg !679
  %275 = zext i8 %243 to i32, !dbg !679
  %276 = shl nuw nsw i32 %275, 16, !dbg !679
  %277 = or disjoint i32 %274, %276, !dbg !679
  %278 = zext i8 %241 to i32, !dbg !679
  %279 = shl nuw nsw i32 %278, 8, !dbg !679
  %280 = or disjoint i32 %277, %279, !dbg !679
  %281 = zext i8 %239 to i32, !dbg !679
  %282 = or disjoint i32 %280, %281, !dbg !679
  %283 = zext i8 %254 to i32, !dbg !680
  %284 = shl nuw i32 %283, 24, !dbg !680
  %285 = zext i8 %252 to i32, !dbg !680
  %286 = shl nuw nsw i32 %285, 16, !dbg !680
  %287 = or disjoint i32 %284, %286, !dbg !680
  %288 = zext i8 %250 to i32, !dbg !680
  %289 = shl nuw nsw i32 %288, 8, !dbg !680
  %290 = or disjoint i32 %287, %289, !dbg !680
  %291 = zext i8 %248 to i32, !dbg !680
  %292 = or disjoint i32 %290, %291, !dbg !680
  %293 = zext i8 %263 to i32, !dbg !681
  %294 = shl nuw i32 %293, 24, !dbg !681
  %295 = zext i8 %261 to i32, !dbg !681
  %296 = shl nuw nsw i32 %295, 16, !dbg !681
  %297 = or disjoint i32 %294, %296, !dbg !681
  %298 = zext i8 %259 to i32, !dbg !681
  %299 = shl nuw nsw i32 %298, 8, !dbg !681
  %300 = or disjoint i32 %297, %299, !dbg !681
  %301 = zext i8 %257 to i32, !dbg !681
  %302 = or disjoint i32 %300, %301, !dbg !681
  %303 = zext i8 %272 to i32, !dbg !682
  %304 = shl nuw i32 %303, 24, !dbg !682
  %305 = zext i8 %270 to i32, !dbg !682
  %306 = shl nuw nsw i32 %305, 16, !dbg !682
  %307 = or disjoint i32 %304, %306, !dbg !682
  %308 = zext i8 %268 to i32, !dbg !682
  %309 = shl nuw nsw i32 %308, 8, !dbg !682
  %310 = or disjoint i32 %307, %309, !dbg !682
  %311 = zext i8 %266 to i32, !dbg !682
  %312 = or disjoint i32 %310, %311, !dbg !682
    #dbg_value(i32 %282, !312, !DIExpression(), !684)
    #dbg_value(i32 %292, !313, !DIExpression(), !684)
    #dbg_value(i32 %302, !314, !DIExpression(), !684)
    #dbg_value(i32 %312, !315, !DIExpression(), !684)
    #dbg_value(i32 %282, !316, !DIExpression(), !684)
    #dbg_value(i32 3, !317, !DIExpression(), !684)
    #dbg_value(i32 poison, !318, !DIExpression(), !684)
  %313 = urem i32 %282, 3, !dbg !682
    #dbg_value(i32 %313, !318, !DIExpression(), !684)
    #dbg_value(i32 %313, !319, !DIExpression(), !684)
  %314 = icmp eq i32 %313, 0, !dbg !685
  %315 = mul i32 %312, %292, !dbg !686
  %316 = add i32 %302, %292, !dbg !686
  %317 = select i1 %314, i32 %315, i32 %316, !dbg !686
    #dbg_value(i32 %317, !320, !DIExpression(), !684)
    #dbg_value(i32 %317, !519, !DIExpression(), !669)
    #dbg_value(i32 1, !55, !DIExpression(), !687)
    #dbg_value(i32 4, !56, !DIExpression(), !687)
  %318 = load i32, ptr @ink_top, align 4
  %319 = icmp ugt i32 %318, -8
  br i1 %319, label %320, label %321, !dbg !689

320:                                              ; preds = %237
  tail call void @llvm.trap(), !dbg !690
  unreachable, !dbg !692

321:                                              ; preds = %237
  %322 = icmp eq i32 %318, 0, !dbg !693
  %323 = add nuw i32 %318, 7, !dbg !694
  %324 = select i1 %322, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %323, !dbg !695
  %325 = and i32 %324, -8, !dbg !696
    #dbg_value(i32 %325, !57, !DIExpression(), !687)
    #dbg_value(i32 4, !58, !DIExpression(), !687)
  %326 = or disjoint i32 %325, 4, !dbg !697
  store i32 %326, ptr @ink_top, align 4, !dbg !698, !tbaa !27
  %327 = add i32 %325, 65539, !dbg !699
  %328 = lshr i32 %327, 16, !dbg !700
    #dbg_value(i32 %328, !59, !DIExpression(), !687)
  %329 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !701
    #dbg_value(i32 %329, !60, !DIExpression(), !687)
  %330 = icmp ugt i32 %328, %329, !dbg !702
  br i1 %330, label %331, label %437, !dbg !703

331:                                              ; preds = %321
  %332 = sub nuw nsw i32 %328, %329, !dbg !704
  %333 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %332), !dbg !705
  %334 = icmp eq i32 %333, -1, !dbg !706
  br i1 %334, label %335, label %437, !dbg !703

335:                                              ; preds = %331
  tail call void @llvm.trap(), !dbg !707
  unreachable, !dbg !709

336:                                              ; preds = %5
  %337 = load ptr, ptr %1, align 4, !dbg !710, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !548)
    #dbg_value(ptr %337, !115, !DIExpression(), !548)
    #dbg_value(i32 4, !116, !DIExpression(), !548)
    #dbg_value(ptr undef, !117, !DIExpression(), !548)
    #dbg_value(ptr %337, !119, !DIExpression(), !548)
    #dbg_value(i32 0, !122, !DIExpression(), !711)
  %338 = load i8, ptr %337, align 1, !dbg !712, !tbaa !132
    #dbg_value(i8 %338, !521, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !713)
    #dbg_value(i32 1, !122, !DIExpression(), !711)
  %339 = getelementptr inbounds nuw i8, ptr %337, i32 1, !dbg !712
  %340 = load i8, ptr %339, align 1, !dbg !712, !tbaa !132
    #dbg_value(i8 %340, !521, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !713)
    #dbg_value(i32 2, !122, !DIExpression(), !711)
  %341 = getelementptr inbounds nuw i8, ptr %337, i32 2, !dbg !712
  %342 = load i8, ptr %341, align 1, !dbg !712, !tbaa !132
    #dbg_value(i8 %342, !521, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !713)
    #dbg_value(i32 3, !122, !DIExpression(), !711)
  %343 = getelementptr inbounds nuw i8, ptr %337, i32 3, !dbg !712
  %344 = load i8, ptr %343, align 1, !dbg !712, !tbaa !132
    #dbg_value(i8 %344, !521, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !713)
    #dbg_value(i32 4, !122, !DIExpression(), !711)
  %345 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !714
  %346 = load ptr, ptr %345, align 4, !dbg !714, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !550)
    #dbg_value(ptr %346, !115, !DIExpression(), !550)
    #dbg_value(i32 4, !116, !DIExpression(), !550)
    #dbg_value(ptr undef, !117, !DIExpression(), !550)
    #dbg_value(ptr %346, !119, !DIExpression(), !550)
    #dbg_value(i32 0, !122, !DIExpression(), !715)
  %347 = load i8, ptr %346, align 1, !dbg !716, !tbaa !132
    #dbg_value(i8 %347, !523, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !713)
    #dbg_value(i32 1, !122, !DIExpression(), !715)
  %348 = getelementptr inbounds nuw i8, ptr %346, i32 1, !dbg !716
  %349 = load i8, ptr %348, align 1, !dbg !716, !tbaa !132
    #dbg_value(i8 %349, !523, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !713)
    #dbg_value(i32 2, !122, !DIExpression(), !715)
  %350 = getelementptr inbounds nuw i8, ptr %346, i32 2, !dbg !716
  %351 = load i8, ptr %350, align 1, !dbg !716, !tbaa !132
    #dbg_value(i8 %351, !523, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !713)
    #dbg_value(i32 3, !122, !DIExpression(), !715)
  %352 = getelementptr inbounds nuw i8, ptr %346, i32 3, !dbg !716
  %353 = load i8, ptr %352, align 1, !dbg !716, !tbaa !132
    #dbg_value(i8 %353, !523, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !713)
    #dbg_value(i32 4, !122, !DIExpression(), !715)
  %354 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !717
  %355 = load ptr, ptr %354, align 4, !dbg !717, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !552)
    #dbg_value(ptr %355, !115, !DIExpression(), !552)
    #dbg_value(i32 4, !116, !DIExpression(), !552)
    #dbg_value(ptr undef, !117, !DIExpression(), !552)
    #dbg_value(ptr %355, !119, !DIExpression(), !552)
    #dbg_value(i32 0, !122, !DIExpression(), !718)
  %356 = load i8, ptr %355, align 1, !dbg !719, !tbaa !132
    #dbg_value(i8 %356, !524, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !713)
    #dbg_value(i32 1, !122, !DIExpression(), !718)
  %357 = getelementptr inbounds nuw i8, ptr %355, i32 1, !dbg !719
  %358 = load i8, ptr %357, align 1, !dbg !719, !tbaa !132
    #dbg_value(i8 %358, !524, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !713)
    #dbg_value(i32 2, !122, !DIExpression(), !718)
  %359 = getelementptr inbounds nuw i8, ptr %355, i32 2, !dbg !719
  %360 = load i8, ptr %359, align 1, !dbg !719, !tbaa !132
    #dbg_value(i8 %360, !524, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !713)
    #dbg_value(i32 3, !122, !DIExpression(), !718)
  %361 = getelementptr inbounds nuw i8, ptr %355, i32 3, !dbg !719
  %362 = load i8, ptr %361, align 1, !dbg !719, !tbaa !132
    #dbg_value(i8 %362, !524, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !713)
    #dbg_value(i32 4, !122, !DIExpression(), !718)
  %363 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !720
  %364 = load ptr, ptr %363, align 4, !dbg !720, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !554)
    #dbg_value(ptr %364, !115, !DIExpression(), !554)
    #dbg_value(i32 4, !116, !DIExpression(), !554)
    #dbg_value(ptr undef, !117, !DIExpression(), !554)
    #dbg_value(ptr %364, !119, !DIExpression(), !554)
    #dbg_value(i32 0, !122, !DIExpression(), !721)
  %365 = load i8, ptr %364, align 1, !dbg !722, !tbaa !132
    #dbg_value(i8 %365, !525, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !713)
    #dbg_value(i32 1, !122, !DIExpression(), !721)
  %366 = getelementptr inbounds nuw i8, ptr %364, i32 1, !dbg !722
  %367 = load i8, ptr %366, align 1, !dbg !722, !tbaa !132
    #dbg_value(i8 %367, !525, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !713)
    #dbg_value(i32 2, !122, !DIExpression(), !721)
  %368 = getelementptr inbounds nuw i8, ptr %364, i32 2, !dbg !722
  %369 = load i8, ptr %368, align 1, !dbg !722, !tbaa !132
    #dbg_value(i8 %369, !525, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !713)
    #dbg_value(i32 3, !122, !DIExpression(), !721)
  %370 = getelementptr inbounds nuw i8, ptr %364, i32 3, !dbg !722
  %371 = load i8, ptr %370, align 1, !dbg !722, !tbaa !132
    #dbg_value(i8 %371, !525, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !713)
    #dbg_value(i32 4, !122, !DIExpression(), !721)
  %372 = zext i8 %344 to i32, !dbg !723
  %373 = shl nuw i32 %372, 24, !dbg !723
  %374 = zext i8 %342 to i32, !dbg !723
  %375 = shl nuw nsw i32 %374, 16, !dbg !723
  %376 = or disjoint i32 %373, %375, !dbg !723
  %377 = zext i8 %340 to i32, !dbg !723
  %378 = shl nuw nsw i32 %377, 8, !dbg !723
  %379 = or disjoint i32 %376, %378, !dbg !723
  %380 = zext i8 %338 to i32, !dbg !723
  %381 = or disjoint i32 %379, %380, !dbg !723
  %382 = zext i8 %353 to i32, !dbg !724
  %383 = shl nuw i32 %382, 24, !dbg !724
  %384 = zext i8 %351 to i32, !dbg !724
  %385 = shl nuw nsw i32 %384, 16, !dbg !724
  %386 = or disjoint i32 %383, %385, !dbg !724
  %387 = zext i8 %349 to i32, !dbg !724
  %388 = shl nuw nsw i32 %387, 8, !dbg !724
  %389 = or disjoint i32 %386, %388, !dbg !724
  %390 = zext i8 %347 to i32, !dbg !724
  %391 = or disjoint i32 %389, %390, !dbg !724
  %392 = zext i8 %362 to i32, !dbg !725
  %393 = shl nuw i32 %392, 24, !dbg !725
  %394 = zext i8 %360 to i32, !dbg !725
  %395 = shl nuw nsw i32 %394, 16, !dbg !725
  %396 = or disjoint i32 %393, %395, !dbg !725
  %397 = zext i8 %358 to i32, !dbg !725
  %398 = shl nuw nsw i32 %397, 8, !dbg !725
  %399 = or disjoint i32 %396, %398, !dbg !725
  %400 = zext i8 %356 to i32, !dbg !725
  %401 = or disjoint i32 %399, %400, !dbg !725
  %402 = zext i8 %371 to i32, !dbg !726
  %403 = shl nuw i32 %402, 24, !dbg !726
  %404 = zext i8 %369 to i32, !dbg !726
  %405 = shl nuw nsw i32 %404, 16, !dbg !726
  %406 = or disjoint i32 %403, %405, !dbg !726
  %407 = zext i8 %367 to i32, !dbg !726
  %408 = shl nuw nsw i32 %407, 8, !dbg !726
  %409 = or disjoint i32 %406, %408, !dbg !726
  %410 = zext i8 %365 to i32, !dbg !726
  %411 = or disjoint i32 %409, %410, !dbg !726
    #dbg_value(i32 %381, !335, !DIExpression(), !728)
    #dbg_value(i32 %391, !336, !DIExpression(), !728)
    #dbg_value(i32 %401, !337, !DIExpression(), !728)
    #dbg_value(i32 %411, !338, !DIExpression(), !728)
    #dbg_value(i32 %381, !339, !DIExpression(), !728)
  %412 = icmp ult i32 %381, %391, !dbg !726
  %413 = mul i32 %411, %391, !dbg !729
  %414 = add i32 %413, %381, !dbg !729
  %415 = sub i32 %381, %391, !dbg !729
  %416 = add i32 %415, %401, !dbg !729
  %417 = select i1 %412, i32 %414, i32 %416, !dbg !729
    #dbg_value(i32 %417, !340, !DIExpression(), !728)
    #dbg_value(i32 %417, !526, !DIExpression(), !713)
    #dbg_value(i32 1, !55, !DIExpression(), !730)
    #dbg_value(i32 4, !56, !DIExpression(), !730)
  %418 = load i32, ptr @ink_top, align 4
  %419 = icmp ugt i32 %418, -8
  br i1 %419, label %420, label %421, !dbg !732

420:                                              ; preds = %336
  tail call void @llvm.trap(), !dbg !733
  unreachable, !dbg !735

421:                                              ; preds = %336
  %422 = icmp eq i32 %418, 0, !dbg !736
  %423 = add nuw i32 %418, 7, !dbg !737
  %424 = select i1 %422, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %423, !dbg !738
  %425 = and i32 %424, -8, !dbg !739
    #dbg_value(i32 %425, !57, !DIExpression(), !730)
    #dbg_value(i32 4, !58, !DIExpression(), !730)
  %426 = or disjoint i32 %425, 4, !dbg !740
  store i32 %426, ptr @ink_top, align 4, !dbg !741, !tbaa !27
  %427 = add i32 %425, 65539, !dbg !742
  %428 = lshr i32 %427, 16, !dbg !743
    #dbg_value(i32 %428, !59, !DIExpression(), !730)
  %429 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !744
    #dbg_value(i32 %429, !60, !DIExpression(), !730)
  %430 = icmp ugt i32 %428, %429, !dbg !745
  br i1 %430, label %431, label %437, !dbg !746

431:                                              ; preds = %421
  %432 = sub nuw nsw i32 %428, %429, !dbg !747
  %433 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %432), !dbg !748
  %434 = icmp eq i32 %433, -1, !dbg !749
  br i1 %434, label %435, label %437, !dbg !746

435:                                              ; preds = %431
  tail call void @llvm.trap(), !dbg !750
  unreachable, !dbg !752

436:                                              ; preds = %5
  tail call void @llvm.trap(), !dbg !753
  unreachable, !dbg !755

437:                                              ; preds = %431, %421, %331, %321, %232, %222
  %438 = phi i32 [ %226, %222 ], [ %226, %232 ], [ %325, %321 ], [ %325, %331 ], [ %425, %421 ], [ %425, %431 ]
  %439 = phi i32 [ %218, %222 ], [ %218, %232 ], [ %317, %321 ], [ %317, %331 ], [ %417, %421 ], [ %417, %431 ]
  %440 = inttoptr i32 %438 to ptr, !dbg !756
  store i32 %439, ptr %440, align 8, !dbg !757, !tbaa !273
  br label %441, !dbg !757

441:                                              ; preds = %118, %114, %437, %74
  %442 = phi ptr [ %75, %74 ], [ %440, %437 ], [ %75, %114 ], [ %75, %118 ]
  %443 = phi i32 [ %27, %74 ], [ 1, %437 ], [ %27, %114 ], [ %27, %118 ]
  store ptr %442, ptr %3, align 4, !dbg !757, !tbaa !455
  store i32 %443, ptr %4, align 4, !dbg !757, !tbaa !27
  ret void, !dbg !758
}

; Function Attrs: nounwind memory(read, inaccessiblemem: write) uwtable
define hidden i32 @ink_compute_scalar32(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readnone %2) local_unnamed_addr #10 !dbg !759 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !785)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !785)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !785)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !785)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !785)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !785)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !785)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !785)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !787)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !787)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !787)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !787)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !787)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !787)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !787)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !787)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !789)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !789)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !789)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !789)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !789)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !789)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !789)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !789)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !791)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !791)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !791)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !791)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !791)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !791)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !791)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !791)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !793)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !793)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !793)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !793)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !793)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !793)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !793)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !793)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !795)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !795)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !795)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !795)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !795)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !795)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !795)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !795)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !797)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !797)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !797)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !797)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !797)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !797)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !797)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !797)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !799)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !799)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !799)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !799)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !799)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !799)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !799)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !799)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !801)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !801)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !801)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !801)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !801)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !801)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !801)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !801)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !803)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !803)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !803)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !803)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !803)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !803)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !803)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !803)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !805)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !805)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !805)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !805)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !805)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !805)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !805)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !805)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !807)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !807)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !807)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !807)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !807)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !807)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !807)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !807)
    #dbg_value(i32 %0, !763, !DIExpression(), !809)
    #dbg_value(ptr %1, !764, !DIExpression(), !809)
    #dbg_value(ptr %2, !765, !DIExpression(), !809)
  switch i32 %0, label %247 [
    i32 1, label %4
    i32 2, label %84
    i32 3, label %165
  ], !dbg !810

4:                                                ; preds = %3
  %5 = load ptr, ptr %1, align 4, !dbg !811, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !785)
    #dbg_value(ptr %5, !115, !DIExpression(), !785)
    #dbg_value(i32 4, !116, !DIExpression(), !785)
    #dbg_value(ptr undef, !117, !DIExpression(), !785)
    #dbg_value(ptr %5, !119, !DIExpression(), !785)
    #dbg_value(i32 0, !122, !DIExpression(), !812)
    #dbg_value(i32 0, !122, !DIExpression(), !812)
  %6 = load i8, ptr %5, align 1, !dbg !813, !tbaa !132
    #dbg_value(i8 %6, !766, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !814)
    #dbg_value(i32 1, !122, !DIExpression(), !812)
  %7 = getelementptr inbounds nuw i8, ptr %5, i32 1, !dbg !813
  %8 = load i8, ptr %7, align 1, !dbg !813, !tbaa !132
    #dbg_value(i8 %8, !766, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !814)
    #dbg_value(i32 2, !122, !DIExpression(), !812)
  %9 = getelementptr inbounds nuw i8, ptr %5, i32 2, !dbg !813
  %10 = load i8, ptr %9, align 1, !dbg !813, !tbaa !132
    #dbg_value(i8 %10, !766, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !814)
    #dbg_value(i32 3, !122, !DIExpression(), !812)
  %11 = getelementptr inbounds nuw i8, ptr %5, i32 3, !dbg !813
  %12 = load i8, ptr %11, align 1, !dbg !813, !tbaa !132
    #dbg_value(i8 %12, !766, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !814)
    #dbg_value(i32 4, !122, !DIExpression(), !812)
  %13 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !815
  %14 = load ptr, ptr %13, align 4, !dbg !815, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !787)
    #dbg_value(ptr %14, !115, !DIExpression(), !787)
    #dbg_value(i32 4, !116, !DIExpression(), !787)
    #dbg_value(ptr undef, !117, !DIExpression(), !787)
    #dbg_value(ptr %14, !119, !DIExpression(), !787)
    #dbg_value(i32 0, !122, !DIExpression(), !816)
    #dbg_value(i32 0, !122, !DIExpression(), !816)
  %15 = load i8, ptr %14, align 1, !dbg !817, !tbaa !132
    #dbg_value(i8 %15, !769, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !814)
    #dbg_value(i32 1, !122, !DIExpression(), !816)
  %16 = getelementptr inbounds nuw i8, ptr %14, i32 1, !dbg !817
  %17 = load i8, ptr %16, align 1, !dbg !817, !tbaa !132
    #dbg_value(i8 %17, !769, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !814)
    #dbg_value(i32 2, !122, !DIExpression(), !816)
  %18 = getelementptr inbounds nuw i8, ptr %14, i32 2, !dbg !817
  %19 = load i8, ptr %18, align 1, !dbg !817, !tbaa !132
    #dbg_value(i8 %19, !769, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !814)
    #dbg_value(i32 3, !122, !DIExpression(), !816)
  %20 = getelementptr inbounds nuw i8, ptr %14, i32 3, !dbg !817
  %21 = load i8, ptr %20, align 1, !dbg !817, !tbaa !132
    #dbg_value(i8 %21, !769, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !814)
    #dbg_value(i32 4, !122, !DIExpression(), !816)
  %22 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !818
  %23 = load ptr, ptr %22, align 4, !dbg !818, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !789)
    #dbg_value(ptr %23, !115, !DIExpression(), !789)
    #dbg_value(i32 4, !116, !DIExpression(), !789)
    #dbg_value(ptr undef, !117, !DIExpression(), !789)
    #dbg_value(ptr %23, !119, !DIExpression(), !789)
    #dbg_value(i32 0, !122, !DIExpression(), !819)
    #dbg_value(i32 0, !122, !DIExpression(), !819)
  %24 = load i8, ptr %23, align 1, !dbg !820, !tbaa !132
    #dbg_value(i8 %24, !770, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !814)
    #dbg_value(i32 1, !122, !DIExpression(), !819)
  %25 = getelementptr inbounds nuw i8, ptr %23, i32 1, !dbg !820
  %26 = load i8, ptr %25, align 1, !dbg !820, !tbaa !132
    #dbg_value(i8 %26, !770, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !814)
    #dbg_value(i32 2, !122, !DIExpression(), !819)
  %27 = getelementptr inbounds nuw i8, ptr %23, i32 2, !dbg !820
  %28 = load i8, ptr %27, align 1, !dbg !820, !tbaa !132
    #dbg_value(i8 %28, !770, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !814)
    #dbg_value(i32 3, !122, !DIExpression(), !819)
  %29 = getelementptr inbounds nuw i8, ptr %23, i32 3, !dbg !820
  %30 = load i8, ptr %29, align 1, !dbg !820, !tbaa !132
    #dbg_value(i8 %30, !770, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !814)
    #dbg_value(i32 4, !122, !DIExpression(), !819)
  %31 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !821
  %32 = load ptr, ptr %31, align 4, !dbg !821, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !791)
    #dbg_value(ptr %32, !115, !DIExpression(), !791)
    #dbg_value(i32 4, !116, !DIExpression(), !791)
    #dbg_value(ptr undef, !117, !DIExpression(), !791)
    #dbg_value(ptr %32, !119, !DIExpression(), !791)
    #dbg_value(i32 0, !122, !DIExpression(), !822)
    #dbg_value(i32 0, !122, !DIExpression(), !822)
  %33 = load i8, ptr %32, align 1, !dbg !823, !tbaa !132
    #dbg_value(i8 %33, !771, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !814)
    #dbg_value(i32 1, !122, !DIExpression(), !822)
  %34 = getelementptr inbounds nuw i8, ptr %32, i32 1, !dbg !823
  %35 = load i8, ptr %34, align 1, !dbg !823, !tbaa !132
    #dbg_value(i8 %35, !771, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !814)
    #dbg_value(i32 2, !122, !DIExpression(), !822)
  %36 = getelementptr inbounds nuw i8, ptr %32, i32 2, !dbg !823
  %37 = load i8, ptr %36, align 1, !dbg !823, !tbaa !132
    #dbg_value(i8 %37, !771, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !814)
    #dbg_value(i32 3, !122, !DIExpression(), !822)
  %38 = getelementptr inbounds nuw i8, ptr %32, i32 3, !dbg !823
  %39 = load i8, ptr %38, align 1, !dbg !823, !tbaa !132
    #dbg_value(i8 %39, !771, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !814)
    #dbg_value(i32 4, !122, !DIExpression(), !822)
  %40 = zext i8 %12 to i32, !dbg !824
  %41 = shl nuw i32 %40, 24, !dbg !824
  %42 = zext i8 %10 to i32, !dbg !824
  %43 = shl nuw nsw i32 %42, 16, !dbg !824
  %44 = or disjoint i32 %41, %43, !dbg !824
  %45 = zext i8 %8 to i32, !dbg !824
  %46 = shl nuw nsw i32 %45, 8, !dbg !824
  %47 = or disjoint i32 %44, %46, !dbg !824
  %48 = zext i8 %6 to i32, !dbg !824
  %49 = or disjoint i32 %47, %48, !dbg !824
  %50 = zext i8 %21 to i32, !dbg !825
  %51 = shl nuw i32 %50, 24, !dbg !825
  %52 = zext i8 %19 to i32, !dbg !825
  %53 = shl nuw nsw i32 %52, 16, !dbg !825
  %54 = or disjoint i32 %51, %53, !dbg !825
  %55 = zext i8 %17 to i32, !dbg !825
  %56 = shl nuw nsw i32 %55, 8, !dbg !825
  %57 = or disjoint i32 %54, %56, !dbg !825
  %58 = zext i8 %15 to i32, !dbg !825
  %59 = or disjoint i32 %57, %58, !dbg !825
  %60 = zext i8 %30 to i32, !dbg !826
  %61 = shl nuw i32 %60, 24, !dbg !826
  %62 = zext i8 %28 to i32, !dbg !826
  %63 = shl nuw nsw i32 %62, 16, !dbg !826
  %64 = or disjoint i32 %61, %63, !dbg !826
  %65 = zext i8 %26 to i32, !dbg !826
  %66 = shl nuw nsw i32 %65, 8, !dbg !826
  %67 = or disjoint i32 %64, %66, !dbg !826
  %68 = zext i8 %24 to i32, !dbg !826
  %69 = or disjoint i32 %67, %68, !dbg !826
  %70 = zext i8 %39 to i32, !dbg !827
  %71 = shl nuw i32 %70, 24, !dbg !827
  %72 = zext i8 %37 to i32, !dbg !827
  %73 = shl nuw nsw i32 %72, 16, !dbg !827
  %74 = or disjoint i32 %71, %73, !dbg !827
  %75 = zext i8 %35 to i32, !dbg !827
  %76 = shl nuw nsw i32 %75, 8, !dbg !827
  %77 = or disjoint i32 %74, %76, !dbg !827
  %78 = zext i8 %33 to i32, !dbg !827
  %79 = or disjoint i32 %77, %78, !dbg !827
    #dbg_value(i32 %49, !295, !DIExpression(), !829)
    #dbg_value(i32 %59, !296, !DIExpression(), !829)
    #dbg_value(i32 %69, !297, !DIExpression(), !829)
    #dbg_value(i32 %79, !298, !DIExpression(), !829)
    #dbg_value(i32 %49, !299, !DIExpression(), !829)
  %80 = icmp ult i32 %49, %69, !dbg !827
  %81 = sub i32 0, %69, !dbg !830
  %82 = select i1 %80, i32 %79, i32 %81, !dbg !830
  %83 = add i32 %82, %59, !dbg !830
    #dbg_value(i32 %83, !300, !DIExpression(), !829)
    #dbg_value(i32 %83, !772, !DIExpression(), !814)
  br label %248

84:                                               ; preds = %3
  %85 = load ptr, ptr %1, align 4, !dbg !831, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !793)
    #dbg_value(ptr %85, !115, !DIExpression(), !793)
    #dbg_value(i32 4, !116, !DIExpression(), !793)
    #dbg_value(ptr undef, !117, !DIExpression(), !793)
    #dbg_value(ptr %85, !119, !DIExpression(), !793)
    #dbg_value(i32 0, !122, !DIExpression(), !832)
    #dbg_value(i32 0, !122, !DIExpression(), !832)
  %86 = load i8, ptr %85, align 1, !dbg !833, !tbaa !132
    #dbg_value(i8 %86, !773, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !834)
    #dbg_value(i32 1, !122, !DIExpression(), !832)
  %87 = getelementptr inbounds nuw i8, ptr %85, i32 1, !dbg !833
  %88 = load i8, ptr %87, align 1, !dbg !833, !tbaa !132
    #dbg_value(i8 %88, !773, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !834)
    #dbg_value(i32 2, !122, !DIExpression(), !832)
  %89 = getelementptr inbounds nuw i8, ptr %85, i32 2, !dbg !833
  %90 = load i8, ptr %89, align 1, !dbg !833, !tbaa !132
    #dbg_value(i8 %90, !773, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !834)
    #dbg_value(i32 3, !122, !DIExpression(), !832)
  %91 = getelementptr inbounds nuw i8, ptr %85, i32 3, !dbg !833
  %92 = load i8, ptr %91, align 1, !dbg !833, !tbaa !132
    #dbg_value(i8 %92, !773, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !834)
    #dbg_value(i32 4, !122, !DIExpression(), !832)
  %93 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !835
  %94 = load ptr, ptr %93, align 4, !dbg !835, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !795)
    #dbg_value(ptr %94, !115, !DIExpression(), !795)
    #dbg_value(i32 4, !116, !DIExpression(), !795)
    #dbg_value(ptr undef, !117, !DIExpression(), !795)
    #dbg_value(ptr %94, !119, !DIExpression(), !795)
    #dbg_value(i32 0, !122, !DIExpression(), !836)
    #dbg_value(i32 0, !122, !DIExpression(), !836)
  %95 = load i8, ptr %94, align 1, !dbg !837, !tbaa !132
    #dbg_value(i8 %95, !775, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !834)
    #dbg_value(i32 1, !122, !DIExpression(), !836)
  %96 = getelementptr inbounds nuw i8, ptr %94, i32 1, !dbg !837
  %97 = load i8, ptr %96, align 1, !dbg !837, !tbaa !132
    #dbg_value(i8 %97, !775, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !834)
    #dbg_value(i32 2, !122, !DIExpression(), !836)
  %98 = getelementptr inbounds nuw i8, ptr %94, i32 2, !dbg !837
  %99 = load i8, ptr %98, align 1, !dbg !837, !tbaa !132
    #dbg_value(i8 %99, !775, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !834)
    #dbg_value(i32 3, !122, !DIExpression(), !836)
  %100 = getelementptr inbounds nuw i8, ptr %94, i32 3, !dbg !837
  %101 = load i8, ptr %100, align 1, !dbg !837, !tbaa !132
    #dbg_value(i8 %101, !775, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !834)
    #dbg_value(i32 4, !122, !DIExpression(), !836)
  %102 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !838
  %103 = load ptr, ptr %102, align 4, !dbg !838, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !797)
    #dbg_value(ptr %103, !115, !DIExpression(), !797)
    #dbg_value(i32 4, !116, !DIExpression(), !797)
    #dbg_value(ptr undef, !117, !DIExpression(), !797)
    #dbg_value(ptr %103, !119, !DIExpression(), !797)
    #dbg_value(i32 0, !122, !DIExpression(), !839)
    #dbg_value(i32 0, !122, !DIExpression(), !839)
  %104 = load i8, ptr %103, align 1, !dbg !840, !tbaa !132
    #dbg_value(i8 %104, !776, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !834)
    #dbg_value(i32 1, !122, !DIExpression(), !839)
  %105 = getelementptr inbounds nuw i8, ptr %103, i32 1, !dbg !840
  %106 = load i8, ptr %105, align 1, !dbg !840, !tbaa !132
    #dbg_value(i8 %106, !776, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !834)
    #dbg_value(i32 2, !122, !DIExpression(), !839)
  %107 = getelementptr inbounds nuw i8, ptr %103, i32 2, !dbg !840
  %108 = load i8, ptr %107, align 1, !dbg !840, !tbaa !132
    #dbg_value(i8 %108, !776, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !834)
    #dbg_value(i32 3, !122, !DIExpression(), !839)
  %109 = getelementptr inbounds nuw i8, ptr %103, i32 3, !dbg !840
  %110 = load i8, ptr %109, align 1, !dbg !840, !tbaa !132
    #dbg_value(i8 %110, !776, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !834)
    #dbg_value(i32 4, !122, !DIExpression(), !839)
  %111 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !841
  %112 = load ptr, ptr %111, align 4, !dbg !841, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !799)
    #dbg_value(ptr %112, !115, !DIExpression(), !799)
    #dbg_value(i32 4, !116, !DIExpression(), !799)
    #dbg_value(ptr undef, !117, !DIExpression(), !799)
    #dbg_value(ptr %112, !119, !DIExpression(), !799)
    #dbg_value(i32 0, !122, !DIExpression(), !842)
    #dbg_value(i32 0, !122, !DIExpression(), !842)
  %113 = load i8, ptr %112, align 1, !dbg !843, !tbaa !132
    #dbg_value(i8 %113, !777, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !834)
    #dbg_value(i32 1, !122, !DIExpression(), !842)
  %114 = getelementptr inbounds nuw i8, ptr %112, i32 1, !dbg !843
  %115 = load i8, ptr %114, align 1, !dbg !843, !tbaa !132
    #dbg_value(i8 %115, !777, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !834)
    #dbg_value(i32 2, !122, !DIExpression(), !842)
  %116 = getelementptr inbounds nuw i8, ptr %112, i32 2, !dbg !843
  %117 = load i8, ptr %116, align 1, !dbg !843, !tbaa !132
    #dbg_value(i8 %117, !777, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !834)
    #dbg_value(i32 3, !122, !DIExpression(), !842)
  %118 = getelementptr inbounds nuw i8, ptr %112, i32 3, !dbg !843
  %119 = load i8, ptr %118, align 1, !dbg !843, !tbaa !132
    #dbg_value(i8 %119, !777, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !834)
    #dbg_value(i32 4, !122, !DIExpression(), !842)
  %120 = zext i8 %92 to i32, !dbg !844
  %121 = shl nuw i32 %120, 24, !dbg !844
  %122 = zext i8 %90 to i32, !dbg !844
  %123 = shl nuw nsw i32 %122, 16, !dbg !844
  %124 = or disjoint i32 %121, %123, !dbg !844
  %125 = zext i8 %88 to i32, !dbg !844
  %126 = shl nuw nsw i32 %125, 8, !dbg !844
  %127 = or disjoint i32 %124, %126, !dbg !844
  %128 = zext i8 %86 to i32, !dbg !844
  %129 = or disjoint i32 %127, %128, !dbg !844
  %130 = zext i8 %101 to i32, !dbg !845
  %131 = shl nuw i32 %130, 24, !dbg !845
  %132 = zext i8 %99 to i32, !dbg !845
  %133 = shl nuw nsw i32 %132, 16, !dbg !845
  %134 = or disjoint i32 %131, %133, !dbg !845
  %135 = zext i8 %97 to i32, !dbg !845
  %136 = shl nuw nsw i32 %135, 8, !dbg !845
  %137 = or disjoint i32 %134, %136, !dbg !845
  %138 = zext i8 %95 to i32, !dbg !845
  %139 = or disjoint i32 %137, %138, !dbg !845
  %140 = zext i8 %110 to i32, !dbg !846
  %141 = shl nuw i32 %140, 24, !dbg !846
  %142 = zext i8 %108 to i32, !dbg !846
  %143 = shl nuw nsw i32 %142, 16, !dbg !846
  %144 = or disjoint i32 %141, %143, !dbg !846
  %145 = zext i8 %106 to i32, !dbg !846
  %146 = shl nuw nsw i32 %145, 8, !dbg !846
  %147 = or disjoint i32 %144, %146, !dbg !846
  %148 = zext i8 %104 to i32, !dbg !846
  %149 = or disjoint i32 %147, %148, !dbg !846
  %150 = zext i8 %119 to i32, !dbg !847
  %151 = shl nuw i32 %150, 24, !dbg !847
  %152 = zext i8 %117 to i32, !dbg !847
  %153 = shl nuw nsw i32 %152, 16, !dbg !847
  %154 = or disjoint i32 %151, %153, !dbg !847
  %155 = zext i8 %115 to i32, !dbg !847
  %156 = shl nuw nsw i32 %155, 8, !dbg !847
  %157 = or disjoint i32 %154, %156, !dbg !847
  %158 = zext i8 %113 to i32, !dbg !847
  %159 = or disjoint i32 %157, %158, !dbg !847
    #dbg_value(i32 %129, !312, !DIExpression(), !849)
    #dbg_value(i32 %139, !313, !DIExpression(), !849)
    #dbg_value(i32 %149, !314, !DIExpression(), !849)
    #dbg_value(i32 %159, !315, !DIExpression(), !849)
    #dbg_value(i32 %129, !316, !DIExpression(), !849)
    #dbg_value(i32 3, !317, !DIExpression(), !849)
    #dbg_value(i32 poison, !318, !DIExpression(), !849)
  %160 = urem i32 %129, 3, !dbg !847
    #dbg_value(i32 %160, !318, !DIExpression(), !849)
    #dbg_value(i32 %160, !319, !DIExpression(), !849)
  %161 = icmp eq i32 %160, 0, !dbg !850
  %162 = mul i32 %159, %139, !dbg !851
  %163 = add i32 %149, %139, !dbg !851
  %164 = select i1 %161, i32 %162, i32 %163, !dbg !851
    #dbg_value(i32 %164, !320, !DIExpression(), !849)
    #dbg_value(i32 %164, !778, !DIExpression(), !834)
  br label %248

165:                                              ; preds = %3
  %166 = load ptr, ptr %1, align 4, !dbg !852, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !801)
    #dbg_value(ptr %166, !115, !DIExpression(), !801)
    #dbg_value(i32 4, !116, !DIExpression(), !801)
    #dbg_value(ptr undef, !117, !DIExpression(), !801)
    #dbg_value(ptr %166, !119, !DIExpression(), !801)
    #dbg_value(i32 0, !122, !DIExpression(), !853)
    #dbg_value(i32 0, !122, !DIExpression(), !853)
  %167 = load i8, ptr %166, align 1, !dbg !854, !tbaa !132
    #dbg_value(i8 %167, !779, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !855)
    #dbg_value(i32 1, !122, !DIExpression(), !853)
  %168 = getelementptr inbounds nuw i8, ptr %166, i32 1, !dbg !854
  %169 = load i8, ptr %168, align 1, !dbg !854, !tbaa !132
    #dbg_value(i8 %169, !779, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !855)
    #dbg_value(i32 2, !122, !DIExpression(), !853)
  %170 = getelementptr inbounds nuw i8, ptr %166, i32 2, !dbg !854
  %171 = load i8, ptr %170, align 1, !dbg !854, !tbaa !132
    #dbg_value(i8 %171, !779, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !855)
    #dbg_value(i32 3, !122, !DIExpression(), !853)
  %172 = getelementptr inbounds nuw i8, ptr %166, i32 3, !dbg !854
  %173 = load i8, ptr %172, align 1, !dbg !854, !tbaa !132
    #dbg_value(i8 %173, !779, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !855)
    #dbg_value(i32 4, !122, !DIExpression(), !853)
  %174 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !856
  %175 = load ptr, ptr %174, align 4, !dbg !856, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !803)
    #dbg_value(ptr %175, !115, !DIExpression(), !803)
    #dbg_value(i32 4, !116, !DIExpression(), !803)
    #dbg_value(ptr undef, !117, !DIExpression(), !803)
    #dbg_value(ptr %175, !119, !DIExpression(), !803)
    #dbg_value(i32 0, !122, !DIExpression(), !857)
    #dbg_value(i32 0, !122, !DIExpression(), !857)
  %176 = load i8, ptr %175, align 1, !dbg !858, !tbaa !132
    #dbg_value(i8 %176, !781, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !855)
    #dbg_value(i32 1, !122, !DIExpression(), !857)
  %177 = getelementptr inbounds nuw i8, ptr %175, i32 1, !dbg !858
  %178 = load i8, ptr %177, align 1, !dbg !858, !tbaa !132
    #dbg_value(i8 %178, !781, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !855)
    #dbg_value(i32 2, !122, !DIExpression(), !857)
  %179 = getelementptr inbounds nuw i8, ptr %175, i32 2, !dbg !858
  %180 = load i8, ptr %179, align 1, !dbg !858, !tbaa !132
    #dbg_value(i8 %180, !781, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !855)
    #dbg_value(i32 3, !122, !DIExpression(), !857)
  %181 = getelementptr inbounds nuw i8, ptr %175, i32 3, !dbg !858
  %182 = load i8, ptr %181, align 1, !dbg !858, !tbaa !132
    #dbg_value(i8 %182, !781, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !855)
    #dbg_value(i32 4, !122, !DIExpression(), !857)
  %183 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !859
  %184 = load ptr, ptr %183, align 4, !dbg !859, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !805)
    #dbg_value(ptr %184, !115, !DIExpression(), !805)
    #dbg_value(i32 4, !116, !DIExpression(), !805)
    #dbg_value(ptr undef, !117, !DIExpression(), !805)
    #dbg_value(ptr %184, !119, !DIExpression(), !805)
    #dbg_value(i32 0, !122, !DIExpression(), !860)
    #dbg_value(i32 0, !122, !DIExpression(), !860)
  %185 = load i8, ptr %184, align 1, !dbg !861, !tbaa !132
    #dbg_value(i8 %185, !782, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !855)
    #dbg_value(i32 1, !122, !DIExpression(), !860)
  %186 = getelementptr inbounds nuw i8, ptr %184, i32 1, !dbg !861
  %187 = load i8, ptr %186, align 1, !dbg !861, !tbaa !132
    #dbg_value(i8 %187, !782, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !855)
    #dbg_value(i32 2, !122, !DIExpression(), !860)
  %188 = getelementptr inbounds nuw i8, ptr %184, i32 2, !dbg !861
  %189 = load i8, ptr %188, align 1, !dbg !861, !tbaa !132
    #dbg_value(i8 %189, !782, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !855)
    #dbg_value(i32 3, !122, !DIExpression(), !860)
  %190 = getelementptr inbounds nuw i8, ptr %184, i32 3, !dbg !861
  %191 = load i8, ptr %190, align 1, !dbg !861, !tbaa !132
    #dbg_value(i8 %191, !782, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !855)
    #dbg_value(i32 4, !122, !DIExpression(), !860)
  %192 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !862
  %193 = load ptr, ptr %192, align 4, !dbg !862, !tbaa !455
    #dbg_value(ptr undef, !110, !DIExpression(), !807)
    #dbg_value(ptr %193, !115, !DIExpression(), !807)
    #dbg_value(i32 4, !116, !DIExpression(), !807)
    #dbg_value(ptr undef, !117, !DIExpression(), !807)
    #dbg_value(ptr %193, !119, !DIExpression(), !807)
    #dbg_value(i32 0, !122, !DIExpression(), !863)
    #dbg_value(i32 0, !122, !DIExpression(), !863)
  %194 = load i8, ptr %193, align 1, !dbg !864, !tbaa !132
    #dbg_value(i8 %194, !783, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !855)
    #dbg_value(i32 1, !122, !DIExpression(), !863)
  %195 = getelementptr inbounds nuw i8, ptr %193, i32 1, !dbg !864
  %196 = load i8, ptr %195, align 1, !dbg !864, !tbaa !132
    #dbg_value(i8 %196, !783, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !855)
    #dbg_value(i32 2, !122, !DIExpression(), !863)
  %197 = getelementptr inbounds nuw i8, ptr %193, i32 2, !dbg !864
  %198 = load i8, ptr %197, align 1, !dbg !864, !tbaa !132
    #dbg_value(i8 %198, !783, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !855)
    #dbg_value(i32 3, !122, !DIExpression(), !863)
  %199 = getelementptr inbounds nuw i8, ptr %193, i32 3, !dbg !864
  %200 = load i8, ptr %199, align 1, !dbg !864, !tbaa !132
    #dbg_value(i8 %200, !783, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !855)
    #dbg_value(i32 4, !122, !DIExpression(), !863)
  %201 = zext i8 %173 to i32, !dbg !865
  %202 = shl nuw i32 %201, 24, !dbg !865
  %203 = zext i8 %171 to i32, !dbg !865
  %204 = shl nuw nsw i32 %203, 16, !dbg !865
  %205 = or disjoint i32 %202, %204, !dbg !865
  %206 = zext i8 %169 to i32, !dbg !865
  %207 = shl nuw nsw i32 %206, 8, !dbg !865
  %208 = or disjoint i32 %205, %207, !dbg !865
  %209 = zext i8 %167 to i32, !dbg !865
  %210 = or disjoint i32 %208, %209, !dbg !865
  %211 = zext i8 %182 to i32, !dbg !866
  %212 = shl nuw i32 %211, 24, !dbg !866
  %213 = zext i8 %180 to i32, !dbg !866
  %214 = shl nuw nsw i32 %213, 16, !dbg !866
  %215 = or disjoint i32 %212, %214, !dbg !866
  %216 = zext i8 %178 to i32, !dbg !866
  %217 = shl nuw nsw i32 %216, 8, !dbg !866
  %218 = or disjoint i32 %215, %217, !dbg !866
  %219 = zext i8 %176 to i32, !dbg !866
  %220 = or disjoint i32 %218, %219, !dbg !866
  %221 = zext i8 %191 to i32, !dbg !867
  %222 = shl nuw i32 %221, 24, !dbg !867
  %223 = zext i8 %189 to i32, !dbg !867
  %224 = shl nuw nsw i32 %223, 16, !dbg !867
  %225 = or disjoint i32 %222, %224, !dbg !867
  %226 = zext i8 %187 to i32, !dbg !867
  %227 = shl nuw nsw i32 %226, 8, !dbg !867
  %228 = or disjoint i32 %225, %227, !dbg !867
  %229 = zext i8 %185 to i32, !dbg !867
  %230 = or disjoint i32 %228, %229, !dbg !867
  %231 = zext i8 %200 to i32, !dbg !868
  %232 = shl nuw i32 %231, 24, !dbg !868
  %233 = zext i8 %198 to i32, !dbg !868
  %234 = shl nuw nsw i32 %233, 16, !dbg !868
  %235 = or disjoint i32 %232, %234, !dbg !868
  %236 = zext i8 %196 to i32, !dbg !868
  %237 = shl nuw nsw i32 %236, 8, !dbg !868
  %238 = or disjoint i32 %235, %237, !dbg !868
  %239 = zext i8 %194 to i32, !dbg !868
  %240 = or disjoint i32 %238, %239, !dbg !868
    #dbg_value(i32 %210, !335, !DIExpression(), !870)
    #dbg_value(i32 %220, !336, !DIExpression(), !870)
    #dbg_value(i32 %230, !337, !DIExpression(), !870)
    #dbg_value(i32 %240, !338, !DIExpression(), !870)
    #dbg_value(i32 %210, !339, !DIExpression(), !870)
  %241 = icmp ult i32 %210, %220, !dbg !868
  %242 = mul i32 %240, %220, !dbg !871
  %243 = add i32 %242, %210, !dbg !871
  %244 = sub i32 %210, %220, !dbg !871
  %245 = add i32 %244, %230, !dbg !871
  %246 = select i1 %241, i32 %243, i32 %245, !dbg !871
    #dbg_value(i32 %246, !340, !DIExpression(), !870)
    #dbg_value(i32 %246, !784, !DIExpression(), !855)
  br label %248

247:                                              ; preds = %3
  tail call void @llvm.trap(), !dbg !872
  unreachable, !dbg !874

248:                                              ; preds = %165, %84, %4
  %249 = phi i32 [ %246, %165 ], [ %164, %84 ], [ %83, %4 ], !dbg !809
  ret i32 %249, !dbg !875
}

; Function Attrs: cold noreturn nounwind memory(inaccessiblemem: write) uwtable
define hidden noundef i64 @ink_compute_scalar64(i32 noundef %0, ptr nocapture noundef readnone %1, ptr nocapture noundef readnone %2) local_unnamed_addr #11 !dbg !876 {
    #dbg_value(i32 %0, !882, !DIExpression(), !885)
    #dbg_value(ptr %1, !883, !DIExpression(), !885)
    #dbg_value(ptr %2, !884, !DIExpression(), !885)
  tail call void @llvm.trap(), !dbg !886
  unreachable, !dbg !889
}

; Function Attrs: cold noreturn nounwind memory(inaccessiblemem: write)
declare void @llvm.trap() #12

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare { i32, i1 } @llvm.umul.with.overflow.i32(i32, i32) #13

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare i32 @llvm.umax.i32(i32, i32) #13

attributes #0 = { mustprogress nofree norecurse nosync nounwind willreturn memory(write, argmem: none, inaccessiblemem: none) uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #1 = { mustprogress nofree norecurse nosync nounwind willreturn memory(readwrite, argmem: none, inaccessiblemem: none) uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #2 = { nounwind uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #3 = { mustprogress nocallback nofree nosync nounwind willreturn memory(read) }
attributes #4 = { mustprogress nocallback nofree nosync nounwind willreturn }
attributes #5 = { nofree norecurse nosync nounwind memory(argmem: readwrite) uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #6 = { nofree norecurse nosync nounwind memory(argmem: write) uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #7 = { mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #8 = { nofree norecurse nosync nounwind memory(read, argmem: readwrite, inaccessiblemem: none) uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #9 = { nounwind memory(read, argmem: readwrite, inaccessiblemem: write) uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #10 = { nounwind memory(read, inaccessiblemem: write) uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #11 = { cold noreturn nounwind memory(inaccessiblemem: write) uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #12 = { cold noreturn nounwind memory(inaccessiblemem: write) }
attributes #13 = { nocallback nofree nosync nounwind speculatable willreturn memory(none) }

!llvm.dbg.cu = !{!2}
!llvm.module.flags = !{!16, !17, !18, !19, !20, !21}
!llvm.ident = !{!22}

!0 = !DIGlobalVariableExpression(var: !1, expr: !DIExpression())
!1 = distinct !DIGlobalVariable(name: "ink_top", scope: !2, file: !15, line: 12, type: !5, isLocal: true, isDefinition: true)
!2 = distinct !DICompileUnit(language: DW_LANG_C11, file: !3, producer: "clang version 20.1.2 (https://github.com/ziglang/zig-bootstrap 7ef74e656cf8ddbd6bf891a8475892aa1afa6891)", isOptimized: true, runtimeVersion: 0, emissionKind: FullDebug, retainedTypes: !4, globals: !14, splitDebugInlining: false, nameTableKind: None)
!3 = !DIFile(filename: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_u32/checked/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
!4 = !{!5, !8, !9, !10, !13}
!5 = !DIDerivedType(tag: DW_TAG_typedef, name: "size_t", file: !6, line: 18, baseType: !7)
!6 = !DIFile(filename: "toolchain/zig-aarch64-macos-0.15.2/lib/include/__stddef_size_t.h", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10")
!7 = !DIBasicType(name: "unsigned long", size: 32, encoding: DW_ATE_unsigned)
!8 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: null, size: 32)
!9 = !DIBasicType(name: "unsigned char", size: 8, encoding: DW_ATE_unsigned_char)
!10 = !DIDerivedType(tag: DW_TAG_typedef, name: "uint32_t", file: !11, line: 202, baseType: !12)
!11 = !DIFile(filename: "toolchain/zig-aarch64-macos-0.15.2/lib/include/stdint.h", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10")
!12 = !DIBasicType(name: "unsigned int", size: 32, encoding: DW_ATE_unsigned)
!13 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !10, size: 32)
!14 = !{!0}
!15 = !DIFile(filename: "reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_u32/checked/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
!16 = !{i32 7, !"Dwarf Version", i32 4}
!17 = !{i32 2, !"Debug Info Version", i32 3}
!18 = !{i32 1, !"wchar_size", i32 4}
!19 = !{i32 7, !"uwtable", i32 2}
!20 = !{i32 7, !"frame-pointer", i32 2}
!21 = !{i32 7, !"debug-info-assignment-tracking", i1 true}
!22 = !{!"clang version 20.1.2 (https://github.com/ziglang/zig-bootstrap 7ef74e656cf8ddbd6bf891a8475892aa1afa6891)"}
!23 = distinct !DISubprogram(name: "ink_compute_reset", scope: !15, file: !15, line: 14, type: !24, scopeLine: 14, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2)
!24 = !DISubroutineType(types: !25)
!25 = !{null}
!26 = !DILocation(line: 14, column: 37, scope: !23)
!27 = !{!28, !28, i64 0}
!28 = !{!"long", !29, i64 0}
!29 = !{!"omnipotent char", !30, i64 0}
!30 = !{!"Simple C/C++ TBAA"}
!31 = !DILocation(line: 14, column: 59, scope: !23)
!32 = distinct !DISubprogram(name: "ink_compute_mark", scope: !15, file: !15, line: 15, type: !33, scopeLine: 15, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2)
!33 = !DISubroutineType(types: !34)
!34 = !{!5}
!35 = !DILocation(line: 15, column: 35, scope: !36)
!36 = distinct !DILexicalBlock(scope: !32, file: !15, line: 15, column: 34)
!37 = !DILocation(line: 15, column: 34, scope: !36)
!38 = !DILocation(line: 14, column: 37, scope: !23, inlinedAt: !39)
!39 = distinct !DILocation(line: 15, column: 43, scope: !36)
!40 = !DILocation(line: 15, column: 43, scope: !36)
!41 = !DILocation(line: 15, column: 70, scope: !32)
!42 = !DILocation(line: 15, column: 63, scope: !32)
!43 = distinct !DISubprogram(name: "ink_compute_rewind", scope: !15, file: !15, line: 16, type: !44, scopeLine: 16, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !46)
!44 = !DISubroutineType(types: !45)
!45 = !{null, !5}
!46 = !{!47}
!47 = !DILocalVariable(name: "mark", arg: 1, scope: !43, file: !15, line: 16, type: !5)
!48 = !DILocation(line: 0, scope: !43)
!49 = !DILocation(line: 16, column: 45, scope: !43)
!50 = !DILocation(line: 16, column: 51, scope: !43)
!51 = distinct !DISubprogram(name: "ink_alloc", scope: !15, file: !15, line: 17, type: !52, scopeLine: 17, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !54)
!52 = !DISubroutineType(types: !53)
!53 = !{!8, !5, !5}
!54 = !{!55, !56, !57, !58, !59, !60}
!55 = !DILocalVariable(name: "count", arg: 1, scope: !51, file: !15, line: 17, type: !5)
!56 = !DILocalVariable(name: "width", arg: 2, scope: !51, file: !15, line: 17, type: !5)
!57 = !DILocalVariable(name: "start", scope: !51, file: !15, line: 19, type: !5)
!58 = !DILocalVariable(name: "bytes", scope: !51, file: !15, line: 20, type: !5)
!59 = !DILocalVariable(name: "pages", scope: !51, file: !15, line: 21, type: !5)
!60 = !DILocalVariable(name: "old", scope: !51, file: !15, line: 21, type: !5)
!61 = !DILocation(line: 0, scope: !51)
!62 = !DILocation(line: 18, column: 6, scope: !63)
!63 = distinct !DILexicalBlock(scope: !51, file: !15, line: 18, column: 5)
!64 = !DILocation(line: 18, column: 11, scope: !63)
!65 = !DILocation(line: 18, column: 18, scope: !63)
!66 = !DILocation(line: 18, column: 33, scope: !63)
!67 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !69)
!68 = distinct !DISubprogram(name: "ink_fail", scope: !15, file: !15, line: 13, type: !24, scopeLine: 13, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition | DISPFlagOptimized, unit: !2)
!69 = distinct !DILocation(line: 18, column: 54, scope: !63)
!70 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !69)
!71 = !DILocation(line: 19, column: 6, scope: !72)
!72 = distinct !DILexicalBlock(scope: !51, file: !15, line: 19, column: 5)
!73 = !DILocation(line: 19, column: 55, scope: !51)
!74 = !DILocation(line: 19, column: 5, scope: !72)
!75 = !DILocation(line: 19, column: 58, scope: !51)
!76 = !DILocation(line: 20, column: 16, scope: !51)
!77 = !DILocation(line: 20, column: 30, scope: !51)
!78 = !DILocation(line: 20, column: 54, scope: !79)
!79 = distinct !DILexicalBlock(scope: !51, file: !15, line: 20, column: 40)
!80 = !DILocation(line: 20, column: 45, scope: !79)
!81 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !82)
!82 = distinct !DILocation(line: 20, column: 61, scope: !79)
!83 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !82)
!84 = !DILocation(line: 20, column: 85, scope: !51)
!85 = !DILocation(line: 20, column: 79, scope: !51)
!86 = !DILocation(line: 21, column: 23, scope: !51)
!87 = !DILocation(line: 21, column: 30, scope: !51)
!88 = !DILocation(line: 21, column: 41, scope: !51)
!89 = !DILocation(line: 22, column: 10, scope: !90)
!90 = distinct !DILexicalBlock(scope: !51, file: !15, line: 22, column: 5)
!91 = !DILocation(line: 22, column: 14, scope: !90)
!92 = !DILocation(line: 22, column: 50, scope: !90)
!93 = !DILocation(line: 22, column: 16, scope: !90)
!94 = !DILocation(line: 22, column: 55, scope: !90)
!95 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !96)
!96 = distinct !DILocation(line: 22, column: 68, scope: !90)
!97 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !96)
!98 = !DILocation(line: 22, column: 85, scope: !51)
!99 = !DILocation(line: 22, column: 79, scope: !51)
!100 = distinct !DISubprogram(name: "memcpy", scope: !15, file: !15, line: 39, type: !101, scopeLine: 39, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !105)
!101 = !DISubroutineType(types: !102)
!102 = !{!8, !8, !103, !5}
!103 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !104, size: 32)
!104 = !DIDerivedType(tag: DW_TAG_const_type, baseType: null)
!105 = !{!106, !107, !108}
!106 = !DILocalVariable(name: "to", arg: 1, scope: !100, file: !15, line: 39, type: !8)
!107 = !DILocalVariable(name: "from", arg: 2, scope: !100, file: !15, line: 39, type: !103)
!108 = !DILocalVariable(name: "bytes", arg: 3, scope: !100, file: !15, line: 39, type: !5)
!109 = !DILocation(line: 0, scope: !100)
!110 = !DILocalVariable(name: "to", arg: 1, scope: !111, file: !15, line: 37, type: !8)
!111 = distinct !DISubprogram(name: "ink_copy", scope: !15, file: !15, line: 37, type: !112, scopeLine: 37, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !114)
!112 = !DISubroutineType(types: !113)
!113 = !{null, !8, !103, !5}
!114 = !{!110, !115, !116, !117, !119, !122}
!115 = !DILocalVariable(name: "from", arg: 2, scope: !111, file: !15, line: 37, type: !103)
!116 = !DILocalVariable(name: "bytes", arg: 3, scope: !111, file: !15, line: 37, type: !5)
!117 = !DILocalVariable(name: "dst", scope: !111, file: !15, line: 37, type: !118)
!118 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !9, size: 32)
!119 = !DILocalVariable(name: "src", scope: !111, file: !15, line: 37, type: !120)
!120 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !121, size: 32)
!121 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !9)
!122 = !DILocalVariable(name: "i", scope: !123, file: !15, line: 37, type: !5)
!123 = distinct !DILexicalBlock(scope: !111, file: !15, line: 37, column: 138)
!124 = !DILocation(line: 0, scope: !111, inlinedAt: !125)
!125 = distinct !DILocation(line: 39, column: 54, scope: !100)
!126 = !DILocation(line: 0, scope: !123, inlinedAt: !125)
!127 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !125)
!128 = distinct !DILexicalBlock(scope: !123, file: !15, line: 37, column: 138)
!129 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !125)
!130 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !125)
!131 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !125)
!132 = !{!29, !29, i64 0}
!133 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !125)
!134 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !125)
!135 = distinct !{!135, !129, !136, !137, !138, !139}
!136 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !125)
!137 = !{!"llvm.loop.mustprogress"}
!138 = !{!"llvm.loop.isvectorized", i32 1}
!139 = !{!"llvm.loop.unroll.runtime.disable"}
!140 = distinct !{!140, !141}
!141 = !{!"llvm.loop.unroll.disable"}
!142 = distinct !{!142, !129, !136, !137, !138}
!143 = !DILocation(line: 39, column: 78, scope: !100)
!144 = distinct !DISubprogram(name: "memset", scope: !15, file: !15, line: 40, type: !145, scopeLine: 40, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !148)
!145 = !DISubroutineType(types: !146)
!146 = !{!8, !8, !147, !5}
!147 = !DIBasicType(name: "int", size: 32, encoding: DW_ATE_signed)
!148 = !{!149, !150, !151, !152, !153}
!149 = !DILocalVariable(name: "to", arg: 1, scope: !144, file: !15, line: 40, type: !8)
!150 = !DILocalVariable(name: "value", arg: 2, scope: !144, file: !15, line: 40, type: !147)
!151 = !DILocalVariable(name: "bytes", arg: 3, scope: !144, file: !15, line: 40, type: !5)
!152 = !DILocalVariable(name: "dst", scope: !144, file: !15, line: 40, type: !118)
!153 = !DILocalVariable(name: "i", scope: !154, file: !15, line: 40, type: !5)
!154 = distinct !DILexicalBlock(scope: !144, file: !15, line: 40, column: 69)
!155 = !DILocation(line: 0, scope: !144)
!156 = !DILocation(line: 0, scope: !154)
!157 = !DILocation(line: 40, column: 85, scope: !158)
!158 = distinct !DILexicalBlock(scope: !154, file: !15, line: 40, column: 69)
!159 = !DILocation(line: 40, column: 69, scope: !154)
!160 = !DILocation(line: 40, column: 93, scope: !158)
!161 = !DILocation(line: 40, column: 96, scope: !158)
!162 = !DILocation(line: 40, column: 102, scope: !158)
!163 = distinct !{!163, !159, !164, !137, !138, !139}
!164 = !DILocation(line: 40, column: 118, scope: !154)
!165 = !DILocation(line: 40, column: 124, scope: !144)
!166 = distinct !{!166, !159, !164, !137, !139, !138}
!167 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_u32", scope: !15, file: !15, line: 82, type: !168, scopeLine: 82, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !175)
!168 = !DISubroutineType(types: !169)
!169 = !{!170, !170, !170, !10, !10}
!170 = !DIDerivedType(tag: DW_TAG_typedef, name: "ink_l_uint32", file: !15, line: 65, baseType: !171)
!171 = distinct !DICompositeType(tag: DW_TAG_structure_type, file: !15, line: 65, size: 64, elements: !172)
!172 = !{!173, !174}
!173 = !DIDerivedType(tag: DW_TAG_member, name: "data", scope: !171, file: !15, line: 65, baseType: !13, size: 32)
!174 = !DIDerivedType(tag: DW_TAG_member, name: "len", scope: !171, file: !15, line: 65, baseType: !5, size: 32, offset: 32)
!175 = !{!176, !177, !178, !179, !180, !181, !182, !184, !187, !188, !189, !190, !191, !192, !195, !197, !198, !199, !200, !201, !202, !203, !204, !205, !206, !207, !210, !212, !213, !214, !215, !216, !217, !220, !221, !223}
!176 = !DILocalVariable(name: "a0", arg: 1, scope: !167, file: !15, line: 82, type: !170)
!177 = !DILocalVariable(name: "a1", arg: 2, scope: !167, file: !15, line: 82, type: !170)
!178 = !DILocalVariable(name: "a2", arg: 3, scope: !167, file: !15, line: 82, type: !10)
!179 = !DILocalVariable(name: "a3", arg: 4, scope: !167, file: !15, line: 82, type: !10)
!180 = !DILocalVariable(name: "t0", scope: !167, file: !15, line: 87, type: !170)
!181 = !DILocalVariable(name: "t1", scope: !167, file: !15, line: 89, type: !170)
!182 = !DILocalVariable(name: "t2", scope: !183, file: !15, line: 90, type: !5)
!183 = distinct !DILexicalBlock(scope: !167, file: !15, line: 90, column: 1)
!184 = !DILocalVariable(name: "t3", scope: !185, file: !15, line: 91, type: !10)
!185 = distinct !DILexicalBlock(scope: !186, file: !15, line: 90, column: 32)
!186 = distinct !DILexicalBlock(scope: !183, file: !15, line: 90, column: 1)
!187 = !DILocalVariable(name: "t4", scope: !185, file: !15, line: 93, type: !10)
!188 = !DILocalVariable(name: "t5", scope: !185, file: !15, line: 95, type: !10)
!189 = !DILocalVariable(name: "t6", scope: !185, file: !15, line: 97, type: !10)
!190 = !DILocalVariable(name: "t7", scope: !185, file: !15, line: 100, type: !10)
!191 = !DILocalVariable(name: "t8", scope: !185, file: !15, line: 102, type: !10)
!192 = !DILocalVariable(name: "t9", scope: !193, file: !15, line: 104, type: !10)
!193 = distinct !DILexicalBlock(scope: !194, file: !15, line: 103, column: 16)
!194 = distinct !DILexicalBlock(scope: !185, file: !15, line: 103, column: 5)
!195 = !DILocalVariable(name: "t10", scope: !196, file: !15, line: 108, type: !10)
!196 = distinct !DILexicalBlock(scope: !194, file: !15, line: 107, column: 8)
!197 = !DILocalVariable(name: "t11", scope: !185, file: !15, line: 112, type: !10)
!198 = !DILocalVariable(name: "t12", scope: !185, file: !15, line: 114, type: !10)
!199 = !DILocalVariable(name: "t13", scope: !185, file: !15, line: 116, type: !10)
!200 = !DILocalVariable(name: "t14", scope: !185, file: !15, line: 118, type: !10)
!201 = !DILocalVariable(name: "t15", scope: !185, file: !15, line: 120, type: !10)
!202 = !DILocalVariable(name: "t16", scope: !185, file: !15, line: 123, type: !10)
!203 = !DILocalVariable(name: "t17", scope: !185, file: !15, line: 125, type: !10)
!204 = !DILocalVariable(name: "t18", scope: !185, file: !15, line: 127, type: !10)
!205 = !DILocalVariable(name: "t19", scope: !185, file: !15, line: 131, type: !10)
!206 = !DILocalVariable(name: "t20", scope: !185, file: !15, line: 133, type: !10)
!207 = !DILocalVariable(name: "t21", scope: !208, file: !15, line: 135, type: !10)
!208 = distinct !DILexicalBlock(scope: !209, file: !15, line: 134, column: 18)
!209 = distinct !DILexicalBlock(scope: !185, file: !15, line: 134, column: 5)
!210 = !DILocalVariable(name: "t22", scope: !211, file: !15, line: 139, type: !10)
!211 = distinct !DILexicalBlock(scope: !209, file: !15, line: 138, column: 8)
!212 = !DILocalVariable(name: "t23", scope: !185, file: !15, line: 143, type: !10)
!213 = !DILocalVariable(name: "t24", scope: !185, file: !15, line: 145, type: !10)
!214 = !DILocalVariable(name: "t25", scope: !185, file: !15, line: 147, type: !10)
!215 = !DILocalVariable(name: "t26", scope: !185, file: !15, line: 150, type: !10)
!216 = !DILocalVariable(name: "t27", scope: !185, file: !15, line: 152, type: !10)
!217 = !DILocalVariable(name: "t28", scope: !218, file: !15, line: 154, type: !10)
!218 = distinct !DILexicalBlock(scope: !219, file: !15, line: 153, column: 18)
!219 = distinct !DILexicalBlock(scope: !185, file: !15, line: 153, column: 5)
!220 = !DILocalVariable(name: "t29", scope: !218, file: !15, line: 156, type: !10)
!221 = !DILocalVariable(name: "t30", scope: !222, file: !15, line: 160, type: !10)
!222 = distinct !DILexicalBlock(scope: !219, file: !15, line: 159, column: 8)
!223 = !DILocalVariable(name: "t31", scope: !222, file: !15, line: 162, type: !10)
!224 = !DILocation(line: 82, column: 67, scope: !167)
!225 = !DILocation(line: 82, column: 83, scope: !167)
!226 = !DILocation(line: 0, scope: !167)
!227 = !DILocation(line: 87, column: 17, scope: !167)
!228 = !{!229, !229, i64 0}
!229 = !{!"p1 int", !230, i64 0}
!230 = !{!"any pointer", !29, i64 0}
!231 = !DILocation(line: 89, column: 14, scope: !167)
!232 = !DILocation(line: 0, scope: !51, inlinedAt: !233)
!233 = distinct !DILocation(line: 89, column: 18, scope: !167)
!234 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !233)
!235 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !233)
!236 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !237)
!237 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !233)
!238 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !237)
!239 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !233)
!240 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !233)
!241 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !233)
!242 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !233)
!243 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !233)
!244 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !233)
!245 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !233)
!246 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !233)
!247 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !248)
!248 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !233)
!249 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !248)
!250 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !233)
!251 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !233)
!252 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !233)
!253 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !233)
!254 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !233)
!255 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !233)
!256 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !233)
!257 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !233)
!258 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !233)
!259 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !233)
!260 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !261)
!261 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !233)
!262 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !261)
!263 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !233)
!264 = !DILocation(line: 89, column: 17, scope: !167)
!265 = !{!266, !229, i64 0}
!266 = !{!"", !229, i64 0, !28, i64 4}
!267 = !{!266, !28, i64 4}
!268 = !DILocation(line: 0, scope: !183)
!269 = !DILocation(line: 90, column: 19, scope: !186)
!270 = !DILocation(line: 90, column: 1, scope: !183)
!271 = !DILocation(line: 90, column: 29, scope: !186)
!272 = !DILocation(line: 93, column: 13, scope: !185)
!273 = !{!274, !274, i64 0}
!274 = !{!"int", !29, i64 0}
!275 = !DILocation(line: 103, column: 9, scope: !194)
!276 = !DILocation(line: 103, column: 5, scope: !194)
!277 = !DILocation(line: 130, column: 18, scope: !278)
!278 = distinct !DILexicalBlock(scope: !279, file: !15, line: 130, column: 8)
!279 = distinct !DILexicalBlock(scope: !185, file: !15, line: 128, column: 5)
!280 = !DILocation(line: 134, column: 10, scope: !209)
!281 = !DILocation(line: 134, column: 5, scope: !209)
!282 = !DILocation(line: 153, column: 10, scope: !219)
!283 = !DILocation(line: 153, column: 5, scope: !219)
!284 = !DILocation(line: 166, column: 1, scope: !185)
!285 = !DILocation(line: 166, column: 12, scope: !185)
!286 = distinct !{!286, !270, !287, !137, !138, !139}
!287 = !DILocation(line: 167, column: 1, scope: !183)
!288 = !DILocation(line: 169, column: 1, scope: !167)
!289 = !DILocation(line: 0, scope: !185)
!290 = distinct !{!290, !270, !287, !137, !138}
!291 = distinct !DISubprogram(name: "lang_fn_left_word", scope: !15, file: !15, line: 170, type: !292, scopeLine: 170, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !294)
!292 = !DISubroutineType(types: !293)
!293 = !{!10, !10, !10, !10, !10}
!294 = !{!295, !296, !297, !298, !299, !300, !301, !304}
!295 = !DILocalVariable(name: "a0", arg: 1, scope: !291, file: !15, line: 170, type: !10)
!296 = !DILocalVariable(name: "a1", arg: 2, scope: !291, file: !15, line: 170, type: !10)
!297 = !DILocalVariable(name: "a2", arg: 3, scope: !291, file: !15, line: 170, type: !10)
!298 = !DILocalVariable(name: "a3", arg: 4, scope: !291, file: !15, line: 170, type: !10)
!299 = !DILocalVariable(name: "t0", scope: !291, file: !15, line: 175, type: !10)
!300 = !DILocalVariable(name: "t1", scope: !291, file: !15, line: 177, type: !10)
!301 = !DILocalVariable(name: "t2", scope: !302, file: !15, line: 179, type: !10)
!302 = distinct !DILexicalBlock(scope: !303, file: !15, line: 178, column: 16)
!303 = distinct !DILexicalBlock(scope: !291, file: !15, line: 178, column: 5)
!304 = !DILocalVariable(name: "t3", scope: !305, file: !15, line: 183, type: !10)
!305 = distinct !DILexicalBlock(scope: !303, file: !15, line: 182, column: 8)
!306 = !DILocation(line: 0, scope: !291)
!307 = !DILocation(line: 178, column: 9, scope: !303)
!308 = !DILocation(line: 178, column: 5, scope: !303)
!309 = !DILocation(line: 187, column: 1, scope: !291)
!310 = distinct !DISubprogram(name: "lang_fn_right_word", scope: !15, file: !15, line: 189, type: !292, scopeLine: 189, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !311)
!311 = !{!312, !313, !314, !315, !316, !317, !318, !319, !320, !321, !324}
!312 = !DILocalVariable(name: "a0", arg: 1, scope: !310, file: !15, line: 189, type: !10)
!313 = !DILocalVariable(name: "a1", arg: 2, scope: !310, file: !15, line: 189, type: !10)
!314 = !DILocalVariable(name: "a2", arg: 3, scope: !310, file: !15, line: 189, type: !10)
!315 = !DILocalVariable(name: "a3", arg: 4, scope: !310, file: !15, line: 189, type: !10)
!316 = !DILocalVariable(name: "t0", scope: !310, file: !15, line: 194, type: !10)
!317 = !DILocalVariable(name: "t1", scope: !310, file: !15, line: 196, type: !10)
!318 = !DILocalVariable(name: "t2", scope: !310, file: !15, line: 198, type: !10)
!319 = !DILocalVariable(name: "t3", scope: !310, file: !15, line: 202, type: !10)
!320 = !DILocalVariable(name: "t4", scope: !310, file: !15, line: 204, type: !10)
!321 = !DILocalVariable(name: "t5", scope: !322, file: !15, line: 206, type: !10)
!322 = distinct !DILexicalBlock(scope: !323, file: !15, line: 205, column: 17)
!323 = distinct !DILexicalBlock(scope: !310, file: !15, line: 205, column: 5)
!324 = !DILocalVariable(name: "t6", scope: !325, file: !15, line: 210, type: !10)
!325 = distinct !DILexicalBlock(scope: !323, file: !15, line: 209, column: 8)
!326 = !DILocation(line: 0, scope: !310)
!327 = !DILocation(line: 201, column: 16, scope: !328)
!328 = distinct !DILexicalBlock(scope: !329, file: !15, line: 201, column: 8)
!329 = distinct !DILexicalBlock(scope: !310, file: !15, line: 199, column: 5)
!330 = !DILocation(line: 205, column: 9, scope: !323)
!331 = !DILocation(line: 205, column: 5, scope: !323)
!332 = !DILocation(line: 214, column: 1, scope: !310)
!333 = distinct !DISubprogram(name: "lang_fn_pair_word", scope: !15, file: !15, line: 216, type: !292, scopeLine: 216, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !334)
!334 = !{!335, !336, !337, !338, !339, !340, !341, !344, !345, !347}
!335 = !DILocalVariable(name: "a0", arg: 1, scope: !333, file: !15, line: 216, type: !10)
!336 = !DILocalVariable(name: "a1", arg: 2, scope: !333, file: !15, line: 216, type: !10)
!337 = !DILocalVariable(name: "a2", arg: 3, scope: !333, file: !15, line: 216, type: !10)
!338 = !DILocalVariable(name: "a3", arg: 4, scope: !333, file: !15, line: 216, type: !10)
!339 = !DILocalVariable(name: "t0", scope: !333, file: !15, line: 221, type: !10)
!340 = !DILocalVariable(name: "t1", scope: !333, file: !15, line: 223, type: !10)
!341 = !DILocalVariable(name: "t2", scope: !342, file: !15, line: 225, type: !10)
!342 = distinct !DILexicalBlock(scope: !343, file: !15, line: 224, column: 16)
!343 = distinct !DILexicalBlock(scope: !333, file: !15, line: 224, column: 5)
!344 = !DILocalVariable(name: "t3", scope: !342, file: !15, line: 227, type: !10)
!345 = !DILocalVariable(name: "t4", scope: !346, file: !15, line: 231, type: !10)
!346 = distinct !DILexicalBlock(scope: !343, file: !15, line: 230, column: 8)
!347 = !DILocalVariable(name: "t5", scope: !346, file: !15, line: 233, type: !10)
!348 = !DILocation(line: 0, scope: !333)
!349 = !DILocation(line: 224, column: 9, scope: !343)
!350 = !DILocation(line: 224, column: 5, scope: !343)
!351 = !DILocation(line: 237, column: 1, scope: !333)
!352 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_u32_into", scope: !15, file: !15, line: 239, type: !353, scopeLine: 239, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !355)
!353 = !DISubroutineType(types: !354)
!354 = !{!5, !170, !170, !10, !10, !13}
!355 = !{!356, !357, !358, !359, !360, !361, !362, !363, !365, !368, !369, !370, !371, !372, !373, !376, !378, !379, !380, !381, !382, !383, !384, !385, !386, !387, !388, !391, !393, !394, !395, !396, !397, !398, !401, !402, !404}
!356 = !DILocalVariable(name: "a0", arg: 1, scope: !352, file: !15, line: 239, type: !170)
!357 = !DILocalVariable(name: "a1", arg: 2, scope: !352, file: !15, line: 239, type: !170)
!358 = !DILocalVariable(name: "a2", arg: 3, scope: !352, file: !15, line: 239, type: !10)
!359 = !DILocalVariable(name: "a3", arg: 4, scope: !352, file: !15, line: 239, type: !10)
!360 = !DILocalVariable(name: "destination", arg: 5, scope: !352, file: !15, line: 239, type: !13)
!361 = !DILocalVariable(name: "t0", scope: !352, file: !15, line: 244, type: !170)
!362 = !DILocalVariable(name: "t1", scope: !352, file: !15, line: 246, type: !170)
!363 = !DILocalVariable(name: "t2", scope: !364, file: !15, line: 247, type: !5)
!364 = distinct !DILexicalBlock(scope: !352, file: !15, line: 247, column: 1)
!365 = !DILocalVariable(name: "t3", scope: !366, file: !15, line: 248, type: !10)
!366 = distinct !DILexicalBlock(scope: !367, file: !15, line: 247, column: 32)
!367 = distinct !DILexicalBlock(scope: !364, file: !15, line: 247, column: 1)
!368 = !DILocalVariable(name: "t4", scope: !366, file: !15, line: 250, type: !10)
!369 = !DILocalVariable(name: "t5", scope: !366, file: !15, line: 252, type: !10)
!370 = !DILocalVariable(name: "t6", scope: !366, file: !15, line: 254, type: !10)
!371 = !DILocalVariable(name: "t7", scope: !366, file: !15, line: 257, type: !10)
!372 = !DILocalVariable(name: "t8", scope: !366, file: !15, line: 259, type: !10)
!373 = !DILocalVariable(name: "t9", scope: !374, file: !15, line: 261, type: !10)
!374 = distinct !DILexicalBlock(scope: !375, file: !15, line: 260, column: 16)
!375 = distinct !DILexicalBlock(scope: !366, file: !15, line: 260, column: 5)
!376 = !DILocalVariable(name: "t10", scope: !377, file: !15, line: 265, type: !10)
!377 = distinct !DILexicalBlock(scope: !375, file: !15, line: 264, column: 8)
!378 = !DILocalVariable(name: "t11", scope: !366, file: !15, line: 269, type: !10)
!379 = !DILocalVariable(name: "t12", scope: !366, file: !15, line: 271, type: !10)
!380 = !DILocalVariable(name: "t13", scope: !366, file: !15, line: 273, type: !10)
!381 = !DILocalVariable(name: "t14", scope: !366, file: !15, line: 275, type: !10)
!382 = !DILocalVariable(name: "t15", scope: !366, file: !15, line: 277, type: !10)
!383 = !DILocalVariable(name: "t16", scope: !366, file: !15, line: 280, type: !10)
!384 = !DILocalVariable(name: "t17", scope: !366, file: !15, line: 282, type: !10)
!385 = !DILocalVariable(name: "t18", scope: !366, file: !15, line: 284, type: !10)
!386 = !DILocalVariable(name: "t19", scope: !366, file: !15, line: 288, type: !10)
!387 = !DILocalVariable(name: "t20", scope: !366, file: !15, line: 290, type: !10)
!388 = !DILocalVariable(name: "t21", scope: !389, file: !15, line: 292, type: !10)
!389 = distinct !DILexicalBlock(scope: !390, file: !15, line: 291, column: 18)
!390 = distinct !DILexicalBlock(scope: !366, file: !15, line: 291, column: 5)
!391 = !DILocalVariable(name: "t22", scope: !392, file: !15, line: 296, type: !10)
!392 = distinct !DILexicalBlock(scope: !390, file: !15, line: 295, column: 8)
!393 = !DILocalVariable(name: "t23", scope: !366, file: !15, line: 300, type: !10)
!394 = !DILocalVariable(name: "t24", scope: !366, file: !15, line: 302, type: !10)
!395 = !DILocalVariable(name: "t25", scope: !366, file: !15, line: 304, type: !10)
!396 = !DILocalVariable(name: "t26", scope: !366, file: !15, line: 307, type: !10)
!397 = !DILocalVariable(name: "t27", scope: !366, file: !15, line: 309, type: !10)
!398 = !DILocalVariable(name: "t28", scope: !399, file: !15, line: 311, type: !10)
!399 = distinct !DILexicalBlock(scope: !400, file: !15, line: 310, column: 18)
!400 = distinct !DILexicalBlock(scope: !366, file: !15, line: 310, column: 5)
!401 = !DILocalVariable(name: "t29", scope: !399, file: !15, line: 313, type: !10)
!402 = !DILocalVariable(name: "t30", scope: !403, file: !15, line: 317, type: !10)
!403 = distinct !DILexicalBlock(scope: !400, file: !15, line: 316, column: 8)
!404 = !DILocalVariable(name: "t31", scope: !403, file: !15, line: 319, type: !10)
!405 = !DILocation(line: 239, column: 66, scope: !352)
!406 = !DILocation(line: 239, column: 82, scope: !352)
!407 = !DILocation(line: 0, scope: !352)
!408 = !DILocation(line: 244, column: 17, scope: !352)
!409 = !DILocation(line: 0, scope: !364)
!410 = !DILocation(line: 247, column: 19, scope: !367)
!411 = !DILocation(line: 247, column: 1, scope: !364)
!412 = !DILocation(line: 247, column: 29, scope: !367)
!413 = !DILocation(line: 250, column: 13, scope: !366)
!414 = !DILocation(line: 260, column: 9, scope: !375)
!415 = !DILocation(line: 260, column: 5, scope: !375)
!416 = !DILocation(line: 287, column: 18, scope: !417)
!417 = distinct !DILexicalBlock(scope: !418, file: !15, line: 287, column: 8)
!418 = distinct !DILexicalBlock(scope: !366, file: !15, line: 285, column: 5)
!419 = !DILocation(line: 291, column: 10, scope: !390)
!420 = !DILocation(line: 291, column: 5, scope: !390)
!421 = !DILocation(line: 310, column: 10, scope: !400)
!422 = !DILocation(line: 310, column: 5, scope: !400)
!423 = !DILocation(line: 323, column: 1, scope: !366)
!424 = !DILocation(line: 323, column: 12, scope: !366)
!425 = distinct !{!425, !411, !426, !137, !138, !139}
!426 = !DILocation(line: 324, column: 1, scope: !364)
!427 = !DILocation(line: 325, column: 1, scope: !352)
!428 = !DILocation(line: 0, scope: !366)
!429 = distinct !{!429, !411, !426, !137, !138}
!430 = distinct !DISubprogram(name: "ink_compute_into", scope: !15, file: !15, line: 327, type: !431, scopeLine: 327, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !437)
!431 = !DISubroutineType(types: !432)
!432 = !{!5, !10, !433, !435, !8}
!433 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !434, size: 32)
!434 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !103)
!435 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !436, size: 32)
!436 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !5)
!437 = !{!438, !439, !440, !441, !442, !445, !446, !447}
!438 = !DILocalVariable(name: "function", arg: 1, scope: !430, file: !15, line: 327, type: !10)
!439 = !DILocalVariable(name: "data", arg: 2, scope: !430, file: !15, line: 327, type: !433)
!440 = !DILocalVariable(name: "lengths", arg: 3, scope: !430, file: !15, line: 327, type: !435)
!441 = !DILocalVariable(name: "destination", arg: 4, scope: !430, file: !15, line: 327, type: !8)
!442 = !DILocalVariable(name: "a0", scope: !443, file: !15, line: 328, type: !13)
!443 = distinct !DILexicalBlock(scope: !444, file: !15, line: 328, column: 8)
!444 = distinct !DILexicalBlock(scope: !430, file: !15, line: 327, column: 167)
!445 = !DILocalVariable(name: "a1", scope: !443, file: !15, line: 328, type: !13)
!446 = !DILocalVariable(name: "a2", scope: !443, file: !15, line: 328, type: !10)
!447 = !DILocalVariable(name: "a3", scope: !443, file: !15, line: 328, type: !10)
!448 = !DILocation(line: 0, scope: !111, inlinedAt: !449)
!449 = distinct !DILocation(line: 328, column: 87, scope: !443)
!450 = !DILocation(line: 0, scope: !111, inlinedAt: !451)
!451 = distinct !DILocation(line: 328, column: 132, scope: !443)
!452 = !DILocation(line: 0, scope: !430)
!453 = !DILocation(line: 327, column: 151, scope: !430)
!454 = !DILocation(line: 328, column: 34, scope: !443)
!455 = !{!230, !230, i64 0}
!456 = !DILocation(line: 0, scope: !443)
!457 = !DILocation(line: 328, column: 100, scope: !443)
!458 = !DILocation(line: 0, scope: !123, inlinedAt: !449)
!459 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !449)
!460 = !DILocation(line: 328, column: 145, scope: !443)
!461 = !DILocation(line: 0, scope: !123, inlinedAt: !451)
!462 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !451)
!463 = !DILocation(line: 328, column: 235, scope: !443)
!464 = !DILocation(line: 328, column: 280, scope: !443)
!465 = !DILocation(line: 247, column: 19, scope: !367, inlinedAt: !466)
!466 = distinct !DILocation(line: 328, column: 172, scope: !443)
!467 = !DILocation(line: 0, scope: !352, inlinedAt: !466)
!468 = !DILocation(line: 0, scope: !364, inlinedAt: !466)
!469 = !DILocation(line: 247, column: 1, scope: !364, inlinedAt: !466)
!470 = !DILocation(line: 247, column: 29, scope: !367, inlinedAt: !466)
!471 = !DILocation(line: 250, column: 13, scope: !366, inlinedAt: !466)
!472 = !DILocation(line: 260, column: 9, scope: !375, inlinedAt: !466)
!473 = !DILocation(line: 260, column: 5, scope: !375, inlinedAt: !466)
!474 = !DILocation(line: 287, column: 18, scope: !417, inlinedAt: !466)
!475 = !DILocation(line: 291, column: 10, scope: !390, inlinedAt: !466)
!476 = !DILocation(line: 291, column: 5, scope: !390, inlinedAt: !466)
!477 = !DILocation(line: 310, column: 10, scope: !400, inlinedAt: !466)
!478 = !DILocation(line: 310, column: 5, scope: !400, inlinedAt: !466)
!479 = !DILocation(line: 323, column: 1, scope: !366, inlinedAt: !466)
!480 = !DILocation(line: 323, column: 12, scope: !366, inlinedAt: !466)
!481 = distinct !{!481, !469, !482, !137, !138, !139}
!482 = !DILocation(line: 324, column: 1, scope: !364, inlinedAt: !466)
!483 = !DILocation(line: 0, scope: !366, inlinedAt: !466)
!484 = distinct !{!484, !469, !482, !137, !138}
!485 = !DILocation(line: 329, column: 30, scope: !430)
!486 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !487)
!487 = distinct !DILocation(line: 329, column: 9, scope: !444)
!488 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !487)
!489 = distinct !DISubprogram(name: "ink_compute_call", scope: !15, file: !15, line: 330, type: !490, scopeLine: 330, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !494)
!490 = !DISubroutineType(types: !491)
!491 = !{null, !10, !433, !435, !492, !493}
!492 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !8, size: 32)
!493 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !5, size: 32)
!494 = !{!495, !496, !497, !498, !499, !500, !503, !504, !505, !506, !507, !509, !510, !511, !512, !513, !514, !516, !517, !518, !519, !520, !521, !523, !524, !525, !526, !527}
!495 = !DILocalVariable(name: "function", arg: 1, scope: !489, file: !15, line: 330, type: !10)
!496 = !DILocalVariable(name: "data", arg: 2, scope: !489, file: !15, line: 330, type: !433)
!497 = !DILocalVariable(name: "lengths", arg: 3, scope: !489, file: !15, line: 330, type: !435)
!498 = !DILocalVariable(name: "output", arg: 4, scope: !489, file: !15, line: 330, type: !492)
!499 = !DILocalVariable(name: "count", arg: 5, scope: !489, file: !15, line: 330, type: !493)
!500 = !DILocalVariable(name: "a0", scope: !501, file: !15, line: 331, type: !13)
!501 = distinct !DILexicalBlock(scope: !502, file: !15, line: 331, column: 8)
!502 = distinct !DILexicalBlock(scope: !489, file: !15, line: 330, column: 158)
!503 = !DILocalVariable(name: "a1", scope: !501, file: !15, line: 331, type: !13)
!504 = !DILocalVariable(name: "a2", scope: !501, file: !15, line: 331, type: !10)
!505 = !DILocalVariable(name: "a3", scope: !501, file: !15, line: 331, type: !10)
!506 = !DILocalVariable(name: "result", scope: !501, file: !15, line: 331, type: !170)
!507 = !DILocalVariable(name: "a0", scope: !508, file: !15, line: 332, type: !10)
!508 = distinct !DILexicalBlock(scope: !502, file: !15, line: 332, column: 8)
!509 = !DILocalVariable(name: "a1", scope: !508, file: !15, line: 332, type: !10)
!510 = !DILocalVariable(name: "a2", scope: !508, file: !15, line: 332, type: !10)
!511 = !DILocalVariable(name: "a3", scope: !508, file: !15, line: 332, type: !10)
!512 = !DILocalVariable(name: "result", scope: !508, file: !15, line: 332, type: !10)
!513 = !DILocalVariable(name: "copy", scope: !508, file: !15, line: 332, type: !13)
!514 = !DILocalVariable(name: "a0", scope: !515, file: !15, line: 333, type: !10)
!515 = distinct !DILexicalBlock(scope: !502, file: !15, line: 333, column: 8)
!516 = !DILocalVariable(name: "a1", scope: !515, file: !15, line: 333, type: !10)
!517 = !DILocalVariable(name: "a2", scope: !515, file: !15, line: 333, type: !10)
!518 = !DILocalVariable(name: "a3", scope: !515, file: !15, line: 333, type: !10)
!519 = !DILocalVariable(name: "result", scope: !515, file: !15, line: 333, type: !10)
!520 = !DILocalVariable(name: "copy", scope: !515, file: !15, line: 333, type: !13)
!521 = !DILocalVariable(name: "a0", scope: !522, file: !15, line: 334, type: !10)
!522 = distinct !DILexicalBlock(scope: !502, file: !15, line: 334, column: 8)
!523 = !DILocalVariable(name: "a1", scope: !522, file: !15, line: 334, type: !10)
!524 = !DILocalVariable(name: "a2", scope: !522, file: !15, line: 334, type: !10)
!525 = !DILocalVariable(name: "a3", scope: !522, file: !15, line: 334, type: !10)
!526 = !DILocalVariable(name: "result", scope: !522, file: !15, line: 334, type: !10)
!527 = !DILocalVariable(name: "copy", scope: !522, file: !15, line: 334, type: !13)
!528 = !DILocation(line: 0, scope: !111, inlinedAt: !529)
!529 = distinct !DILocation(line: 331, column: 87, scope: !501)
!530 = !DILocation(line: 0, scope: !111, inlinedAt: !531)
!531 = distinct !DILocation(line: 331, column: 132, scope: !501)
!532 = !DILocation(line: 0, scope: !111, inlinedAt: !533)
!533 = distinct !DILocation(line: 332, column: 21, scope: !508)
!534 = !DILocation(line: 0, scope: !111, inlinedAt: !535)
!535 = distinct !DILocation(line: 332, column: 66, scope: !508)
!536 = !DILocation(line: 0, scope: !111, inlinedAt: !537)
!537 = distinct !DILocation(line: 332, column: 111, scope: !508)
!538 = !DILocation(line: 0, scope: !111, inlinedAt: !539)
!539 = distinct !DILocation(line: 332, column: 156, scope: !508)
!540 = !DILocation(line: 0, scope: !111, inlinedAt: !541)
!541 = distinct !DILocation(line: 333, column: 21, scope: !515)
!542 = !DILocation(line: 0, scope: !111, inlinedAt: !543)
!543 = distinct !DILocation(line: 333, column: 66, scope: !515)
!544 = !DILocation(line: 0, scope: !111, inlinedAt: !545)
!545 = distinct !DILocation(line: 333, column: 111, scope: !515)
!546 = !DILocation(line: 0, scope: !111, inlinedAt: !547)
!547 = distinct !DILocation(line: 333, column: 156, scope: !515)
!548 = !DILocation(line: 0, scope: !111, inlinedAt: !549)
!549 = distinct !DILocation(line: 334, column: 21, scope: !522)
!550 = !DILocation(line: 0, scope: !111, inlinedAt: !551)
!551 = distinct !DILocation(line: 334, column: 66, scope: !522)
!552 = !DILocation(line: 0, scope: !111, inlinedAt: !553)
!553 = distinct !DILocation(line: 334, column: 111, scope: !522)
!554 = !DILocation(line: 0, scope: !111, inlinedAt: !555)
!555 = distinct !DILocation(line: 334, column: 156, scope: !522)
!556 = !DILocation(line: 0, scope: !489)
!557 = !DILocation(line: 330, column: 142, scope: !489)
!558 = !DILocation(line: 331, column: 34, scope: !501)
!559 = !DILocation(line: 0, scope: !501)
!560 = !DILocation(line: 331, column: 100, scope: !501)
!561 = !DILocation(line: 0, scope: !123, inlinedAt: !529)
!562 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !529)
!563 = !DILocation(line: 331, column: 145, scope: !501)
!564 = !DILocation(line: 0, scope: !123, inlinedAt: !531)
!565 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !531)
!566 = !DILocation(line: 331, column: 243, scope: !501)
!567 = !DILocation(line: 331, column: 288, scope: !501)
!568 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !569)
!569 = distinct !DILocation(line: 89, column: 18, scope: !167, inlinedAt: !570)
!570 = distinct !DILocation(line: 331, column: 185, scope: !501)
!571 = !DILocation(line: 0, scope: !167, inlinedAt: !570)
!572 = !DILocation(line: 0, scope: !51, inlinedAt: !569)
!573 = !{!574}
!574 = distinct !{!574, !575, !"lang_fn_pipeline38_right_padded_zip_u32: argument 0"}
!575 = distinct !{!575, !"lang_fn_pipeline38_right_padded_zip_u32"}
!576 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !569)
!577 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !578)
!578 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !569)
!579 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !578)
!580 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !569)
!581 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !569)
!582 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !569)
!583 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !569)
!584 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !569)
!585 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !569)
!586 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !569)
!587 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !569)
!588 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !589)
!589 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !569)
!590 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !589)
!591 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !569)
!592 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !569)
!593 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !569)
!594 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !569)
!595 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !569)
!596 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !569)
!597 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !569)
!598 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !569)
!599 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !569)
!600 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !569)
!601 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !602)
!602 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !569)
!603 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !602)
!604 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !569)
!605 = !DILocation(line: 0, scope: !183, inlinedAt: !570)
!606 = !DILocation(line: 90, column: 19, scope: !186, inlinedAt: !570)
!607 = !DILocation(line: 90, column: 1, scope: !183, inlinedAt: !570)
!608 = !DILocation(line: 90, column: 29, scope: !186, inlinedAt: !570)
!609 = !DILocation(line: 93, column: 13, scope: !185, inlinedAt: !570)
!610 = !DILocation(line: 103, column: 9, scope: !194, inlinedAt: !570)
!611 = !DILocation(line: 103, column: 5, scope: !194, inlinedAt: !570)
!612 = !DILocation(line: 130, column: 18, scope: !278, inlinedAt: !570)
!613 = !DILocation(line: 134, column: 10, scope: !209, inlinedAt: !570)
!614 = !DILocation(line: 134, column: 5, scope: !209, inlinedAt: !570)
!615 = !DILocation(line: 153, column: 10, scope: !219, inlinedAt: !570)
!616 = !DILocation(line: 153, column: 5, scope: !219, inlinedAt: !570)
!617 = !DILocation(line: 166, column: 1, scope: !185, inlinedAt: !570)
!618 = !DILocation(line: 166, column: 12, scope: !185, inlinedAt: !570)
!619 = distinct !{!619, !607, !620, !137, !138, !139}
!620 = !DILocation(line: 167, column: 1, scope: !183, inlinedAt: !570)
!621 = !DILocation(line: 0, scope: !185, inlinedAt: !570)
!622 = distinct !{!622, !607, !620, !137, !138}
!623 = !DILocation(line: 332, column: 34, scope: !508)
!624 = !DILocation(line: 0, scope: !123, inlinedAt: !533)
!625 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !533)
!626 = !DILocation(line: 0, scope: !508)
!627 = !DILocation(line: 332, column: 79, scope: !508)
!628 = !DILocation(line: 0, scope: !123, inlinedAt: !535)
!629 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !535)
!630 = !DILocation(line: 332, column: 124, scope: !508)
!631 = !DILocation(line: 0, scope: !123, inlinedAt: !537)
!632 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !537)
!633 = !DILocation(line: 332, column: 169, scope: !508)
!634 = !DILocation(line: 0, scope: !123, inlinedAt: !539)
!635 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !539)
!636 = !DILocation(line: 332, column: 226, scope: !508)
!637 = !DILocation(line: 332, column: 229, scope: !508)
!638 = !DILocation(line: 332, column: 232, scope: !508)
!639 = !DILocation(line: 178, column: 9, scope: !303, inlinedAt: !640)
!640 = distinct !DILocation(line: 332, column: 205, scope: !508)
!641 = !DILocation(line: 0, scope: !291, inlinedAt: !640)
!642 = !DILocation(line: 178, column: 5, scope: !303, inlinedAt: !640)
!643 = !DILocation(line: 0, scope: !51, inlinedAt: !644)
!644 = distinct !DILocation(line: 332, column: 251, scope: !508)
!645 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !644)
!646 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !647)
!647 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !644)
!648 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !647)
!649 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !644)
!650 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !644)
!651 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !644)
!652 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !644)
!653 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !644)
!654 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !644)
!655 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !644)
!656 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !644)
!657 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !644)
!658 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !644)
!659 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !644)
!660 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !644)
!661 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !644)
!662 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !644)
!663 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !664)
!664 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !644)
!665 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !664)
!666 = !DILocation(line: 333, column: 34, scope: !515)
!667 = !DILocation(line: 0, scope: !123, inlinedAt: !541)
!668 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !541)
!669 = !DILocation(line: 0, scope: !515)
!670 = !DILocation(line: 333, column: 79, scope: !515)
!671 = !DILocation(line: 0, scope: !123, inlinedAt: !543)
!672 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !543)
!673 = !DILocation(line: 333, column: 124, scope: !515)
!674 = !DILocation(line: 0, scope: !123, inlinedAt: !545)
!675 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !545)
!676 = !DILocation(line: 333, column: 169, scope: !515)
!677 = !DILocation(line: 0, scope: !123, inlinedAt: !547)
!678 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !547)
!679 = !DILocation(line: 333, column: 227, scope: !515)
!680 = !DILocation(line: 333, column: 230, scope: !515)
!681 = !DILocation(line: 333, column: 233, scope: !515)
!682 = !DILocation(line: 201, column: 16, scope: !328, inlinedAt: !683)
!683 = distinct !DILocation(line: 333, column: 205, scope: !515)
!684 = !DILocation(line: 0, scope: !310, inlinedAt: !683)
!685 = !DILocation(line: 205, column: 9, scope: !323, inlinedAt: !683)
!686 = !DILocation(line: 205, column: 5, scope: !323, inlinedAt: !683)
!687 = !DILocation(line: 0, scope: !51, inlinedAt: !688)
!688 = distinct !DILocation(line: 333, column: 252, scope: !515)
!689 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !688)
!690 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !691)
!691 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !688)
!692 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !691)
!693 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !688)
!694 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !688)
!695 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !688)
!696 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !688)
!697 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !688)
!698 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !688)
!699 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !688)
!700 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !688)
!701 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !688)
!702 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !688)
!703 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !688)
!704 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !688)
!705 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !688)
!706 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !688)
!707 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !708)
!708 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !688)
!709 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !708)
!710 = !DILocation(line: 334, column: 34, scope: !522)
!711 = !DILocation(line: 0, scope: !123, inlinedAt: !549)
!712 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !549)
!713 = !DILocation(line: 0, scope: !522)
!714 = !DILocation(line: 334, column: 79, scope: !522)
!715 = !DILocation(line: 0, scope: !123, inlinedAt: !551)
!716 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !551)
!717 = !DILocation(line: 334, column: 124, scope: !522)
!718 = !DILocation(line: 0, scope: !123, inlinedAt: !553)
!719 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !553)
!720 = !DILocation(line: 334, column: 169, scope: !522)
!721 = !DILocation(line: 0, scope: !123, inlinedAt: !555)
!722 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !555)
!723 = !DILocation(line: 334, column: 226, scope: !522)
!724 = !DILocation(line: 334, column: 229, scope: !522)
!725 = !DILocation(line: 334, column: 232, scope: !522)
!726 = !DILocation(line: 224, column: 9, scope: !343, inlinedAt: !727)
!727 = distinct !DILocation(line: 334, column: 205, scope: !522)
!728 = !DILocation(line: 0, scope: !333, inlinedAt: !727)
!729 = !DILocation(line: 224, column: 5, scope: !343, inlinedAt: !727)
!730 = !DILocation(line: 0, scope: !51, inlinedAt: !731)
!731 = distinct !DILocation(line: 334, column: 251, scope: !522)
!732 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !731)
!733 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !734)
!734 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !731)
!735 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !734)
!736 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !731)
!737 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !731)
!738 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !731)
!739 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !731)
!740 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !731)
!741 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !731)
!742 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !731)
!743 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !731)
!744 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !731)
!745 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !731)
!746 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !731)
!747 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !731)
!748 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !731)
!749 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !731)
!750 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !751)
!751 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !731)
!752 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !751)
!753 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !754)
!754 = distinct !DILocation(line: 335, column: 9, scope: !502)
!755 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !754)
!756 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !757)
!757 = !DILocation(line: 0, scope: !502)
!758 = !DILocation(line: 335, column: 21, scope: !489)
!759 = distinct !DISubprogram(name: "ink_compute_scalar32", scope: !15, file: !15, line: 336, type: !760, scopeLine: 336, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !762)
!760 = !DISubroutineType(types: !761)
!761 = !{!10, !10, !433, !435}
!762 = !{!763, !764, !765, !766, !769, !770, !771, !772, !773, !775, !776, !777, !778, !779, !781, !782, !783, !784}
!763 = !DILocalVariable(name: "function", arg: 1, scope: !759, file: !15, line: 336, type: !10)
!764 = !DILocalVariable(name: "data", arg: 2, scope: !759, file: !15, line: 336, type: !433)
!765 = !DILocalVariable(name: "lengths", arg: 3, scope: !759, file: !15, line: 336, type: !435)
!766 = !DILocalVariable(name: "a0", scope: !767, file: !15, line: 337, type: !10)
!767 = distinct !DILexicalBlock(scope: !768, file: !15, line: 337, column: 8)
!768 = distinct !DILexicalBlock(scope: !759, file: !15, line: 336, column: 138)
!769 = !DILocalVariable(name: "a1", scope: !767, file: !15, line: 337, type: !10)
!770 = !DILocalVariable(name: "a2", scope: !767, file: !15, line: 337, type: !10)
!771 = !DILocalVariable(name: "a3", scope: !767, file: !15, line: 337, type: !10)
!772 = !DILocalVariable(name: "result", scope: !767, file: !15, line: 337, type: !10)
!773 = !DILocalVariable(name: "a0", scope: !774, file: !15, line: 338, type: !10)
!774 = distinct !DILexicalBlock(scope: !768, file: !15, line: 338, column: 8)
!775 = !DILocalVariable(name: "a1", scope: !774, file: !15, line: 338, type: !10)
!776 = !DILocalVariable(name: "a2", scope: !774, file: !15, line: 338, type: !10)
!777 = !DILocalVariable(name: "a3", scope: !774, file: !15, line: 338, type: !10)
!778 = !DILocalVariable(name: "result", scope: !774, file: !15, line: 338, type: !10)
!779 = !DILocalVariable(name: "a0", scope: !780, file: !15, line: 339, type: !10)
!780 = distinct !DILexicalBlock(scope: !768, file: !15, line: 339, column: 8)
!781 = !DILocalVariable(name: "a1", scope: !780, file: !15, line: 339, type: !10)
!782 = !DILocalVariable(name: "a2", scope: !780, file: !15, line: 339, type: !10)
!783 = !DILocalVariable(name: "a3", scope: !780, file: !15, line: 339, type: !10)
!784 = !DILocalVariable(name: "result", scope: !780, file: !15, line: 339, type: !10)
!785 = !DILocation(line: 0, scope: !111, inlinedAt: !786)
!786 = distinct !DILocation(line: 337, column: 21, scope: !767)
!787 = !DILocation(line: 0, scope: !111, inlinedAt: !788)
!788 = distinct !DILocation(line: 337, column: 66, scope: !767)
!789 = !DILocation(line: 0, scope: !111, inlinedAt: !790)
!790 = distinct !DILocation(line: 337, column: 111, scope: !767)
!791 = !DILocation(line: 0, scope: !111, inlinedAt: !792)
!792 = distinct !DILocation(line: 337, column: 156, scope: !767)
!793 = !DILocation(line: 0, scope: !111, inlinedAt: !794)
!794 = distinct !DILocation(line: 338, column: 21, scope: !774)
!795 = !DILocation(line: 0, scope: !111, inlinedAt: !796)
!796 = distinct !DILocation(line: 338, column: 66, scope: !774)
!797 = !DILocation(line: 0, scope: !111, inlinedAt: !798)
!798 = distinct !DILocation(line: 338, column: 111, scope: !774)
!799 = !DILocation(line: 0, scope: !111, inlinedAt: !800)
!800 = distinct !DILocation(line: 338, column: 156, scope: !774)
!801 = !DILocation(line: 0, scope: !111, inlinedAt: !802)
!802 = distinct !DILocation(line: 339, column: 21, scope: !780)
!803 = !DILocation(line: 0, scope: !111, inlinedAt: !804)
!804 = distinct !DILocation(line: 339, column: 66, scope: !780)
!805 = !DILocation(line: 0, scope: !111, inlinedAt: !806)
!806 = distinct !DILocation(line: 339, column: 111, scope: !780)
!807 = !DILocation(line: 0, scope: !111, inlinedAt: !808)
!808 = distinct !DILocation(line: 339, column: 156, scope: !780)
!809 = !DILocation(line: 0, scope: !759)
!810 = !DILocation(line: 336, column: 122, scope: !759)
!811 = !DILocation(line: 337, column: 34, scope: !767)
!812 = !DILocation(line: 0, scope: !123, inlinedAt: !786)
!813 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !786)
!814 = !DILocation(line: 0, scope: !767)
!815 = !DILocation(line: 337, column: 79, scope: !767)
!816 = !DILocation(line: 0, scope: !123, inlinedAt: !788)
!817 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !788)
!818 = !DILocation(line: 337, column: 124, scope: !767)
!819 = !DILocation(line: 0, scope: !123, inlinedAt: !790)
!820 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !790)
!821 = !DILocation(line: 337, column: 169, scope: !767)
!822 = !DILocation(line: 0, scope: !123, inlinedAt: !792)
!823 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !792)
!824 = !DILocation(line: 337, column: 226, scope: !767)
!825 = !DILocation(line: 337, column: 229, scope: !767)
!826 = !DILocation(line: 337, column: 232, scope: !767)
!827 = !DILocation(line: 178, column: 9, scope: !303, inlinedAt: !828)
!828 = distinct !DILocation(line: 337, column: 205, scope: !767)
!829 = !DILocation(line: 0, scope: !291, inlinedAt: !828)
!830 = !DILocation(line: 178, column: 5, scope: !303, inlinedAt: !828)
!831 = !DILocation(line: 338, column: 34, scope: !774)
!832 = !DILocation(line: 0, scope: !123, inlinedAt: !794)
!833 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !794)
!834 = !DILocation(line: 0, scope: !774)
!835 = !DILocation(line: 338, column: 79, scope: !774)
!836 = !DILocation(line: 0, scope: !123, inlinedAt: !796)
!837 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !796)
!838 = !DILocation(line: 338, column: 124, scope: !774)
!839 = !DILocation(line: 0, scope: !123, inlinedAt: !798)
!840 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !798)
!841 = !DILocation(line: 338, column: 169, scope: !774)
!842 = !DILocation(line: 0, scope: !123, inlinedAt: !800)
!843 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !800)
!844 = !DILocation(line: 338, column: 227, scope: !774)
!845 = !DILocation(line: 338, column: 230, scope: !774)
!846 = !DILocation(line: 338, column: 233, scope: !774)
!847 = !DILocation(line: 201, column: 16, scope: !328, inlinedAt: !848)
!848 = distinct !DILocation(line: 338, column: 205, scope: !774)
!849 = !DILocation(line: 0, scope: !310, inlinedAt: !848)
!850 = !DILocation(line: 205, column: 9, scope: !323, inlinedAt: !848)
!851 = !DILocation(line: 205, column: 5, scope: !323, inlinedAt: !848)
!852 = !DILocation(line: 339, column: 34, scope: !780)
!853 = !DILocation(line: 0, scope: !123, inlinedAt: !802)
!854 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !802)
!855 = !DILocation(line: 0, scope: !780)
!856 = !DILocation(line: 339, column: 79, scope: !780)
!857 = !DILocation(line: 0, scope: !123, inlinedAt: !804)
!858 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !804)
!859 = !DILocation(line: 339, column: 124, scope: !780)
!860 = !DILocation(line: 0, scope: !123, inlinedAt: !806)
!861 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !806)
!862 = !DILocation(line: 339, column: 169, scope: !780)
!863 = !DILocation(line: 0, scope: !123, inlinedAt: !808)
!864 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !808)
!865 = !DILocation(line: 339, column: 226, scope: !780)
!866 = !DILocation(line: 339, column: 229, scope: !780)
!867 = !DILocation(line: 339, column: 232, scope: !780)
!868 = !DILocation(line: 224, column: 9, scope: !343, inlinedAt: !869)
!869 = distinct !DILocation(line: 339, column: 205, scope: !780)
!870 = !DILocation(line: 0, scope: !333, inlinedAt: !869)
!871 = !DILocation(line: 224, column: 5, scope: !343, inlinedAt: !869)
!872 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !873)
!873 = distinct !DILocation(line: 340, column: 9, scope: !768)
!874 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !873)
!875 = !DILocation(line: 340, column: 30, scope: !759)
!876 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !15, file: !15, line: 341, type: !877, scopeLine: 341, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !881)
!877 = !DISubroutineType(types: !878)
!878 = !{!879, !10, !433, !435}
!879 = !DIDerivedType(tag: DW_TAG_typedef, name: "uint64_t", file: !11, line: 102, baseType: !880)
!880 = !DIBasicType(name: "unsigned long long", size: 64, encoding: DW_ATE_unsigned)
!881 = !{!882, !883, !884}
!882 = !DILocalVariable(name: "function", arg: 1, scope: !876, file: !15, line: 341, type: !10)
!883 = !DILocalVariable(name: "data", arg: 2, scope: !876, file: !15, line: 341, type: !433)
!884 = !DILocalVariable(name: "lengths", arg: 3, scope: !876, file: !15, line: 341, type: !435)
!885 = !DILocation(line: 0, scope: !876)
!886 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !887)
!887 = distinct !DILocation(line: 342, column: 9, scope: !888)
!888 = distinct !DILexicalBlock(scope: !876, file: !15, line: 341, column: 138)
!889 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !887)
