; ModuleID = '/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_u32/prior/cpu.c'
source_filename = "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_u32/prior/cpu.c"
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

; Function Attrs: mustprogress nocallback nofree nosync nounwind willreturn memory(argmem: readwrite)
declare void @llvm.lifetime.start.p0(i64 immarg, ptr nocapture) #3

; Function Attrs: mustprogress nocallback nofree nosync nounwind willreturn memory(read)
declare i32 @llvm.wasm.memory.size.i32(i32) #4

; Function Attrs: mustprogress nocallback nofree nosync nounwind willreturn
declare i32 @llvm.wasm.memory.grow.i32(i32, i32) #5

; Function Attrs: mustprogress nocallback nofree nosync nounwind willreturn memory(argmem: readwrite)
declare void @llvm.lifetime.end.p0(i64 immarg, ptr nocapture) #3

; Function Attrs: nofree norecurse nosync nounwind memory(argmem: readwrite) uwtable
define hidden noundef ptr @memcpy(ptr noundef returned writeonly %0, ptr nocapture noundef readonly %1, i32 noundef %2) local_unnamed_addr #6 !dbg !100 {
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
define hidden noundef ptr @memset(ptr noundef returned writeonly %0, i32 noundef %1, i32 noundef %2) local_unnamed_addr #7 !dbg !144 {
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
define hidden void @lang_fn_pipeline38_left_padded_zip_u32(ptr dead_on_unwind noalias nocapture writable writeonly sret(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %1, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %2, i32 noundef %3, i32 noundef %4) local_unnamed_addr #2 !dbg !167 {
    #dbg_declare(ptr %1, !176, !DIExpression(), !241)
    #dbg_declare(ptr %2, !177, !DIExpression(), !242)
    #dbg_value(i32 %3, !178, !DIExpression(), !243)
    #dbg_value(i32 %4, !179, !DIExpression(), !243)
  %6 = load ptr, ptr %1, align 4, !dbg !244, !tbaa !245
  %7 = ptrtoint ptr %6 to i32, !dbg !244
  %8 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !244
  %9 = load i32, ptr %8, align 4, !dbg !244, !tbaa !27
    #dbg_value(ptr %6, !180, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !243)
    #dbg_value(i32 %9, !180, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !243)
    #dbg_value(i32 %9, !55, !DIExpression(), !248)
    #dbg_value(i32 4, !56, !DIExpression(), !248)
  %10 = icmp ugt i32 %9, 1073741823, !dbg !250
  %11 = load i32, ptr @ink_top, align 4
  %12 = icmp ugt i32 %11, -8
  %13 = select i1 %10, i1 true, i1 %12, !dbg !251
  br i1 %13, label %14, label %15, !dbg !251

14:                                               ; preds = %5
  tail call void @llvm.trap(), !dbg !252
  unreachable, !dbg !254

15:                                               ; preds = %5
  %16 = icmp eq i32 %11, 0, !dbg !255
  %17 = add nuw i32 %11, 7, !dbg !256
  %18 = select i1 %16, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %17, !dbg !257
  %19 = and i32 %18, -8, !dbg !258
    #dbg_value(i32 %19, !57, !DIExpression(), !248)
  %20 = tail call i32 @llvm.umax.i32(i32 %9, i32 1), !dbg !259
  %21 = shl nuw i32 %20, 2, !dbg !260
    #dbg_value(i32 %21, !58, !DIExpression(), !248)
  %22 = xor i32 %19, -1, !dbg !261
  %23 = icmp ugt i32 %21, %22, !dbg !262
  br i1 %23, label %24, label %25, !dbg !262

24:                                               ; preds = %15
  tail call void @llvm.trap(), !dbg !263
  unreachable, !dbg !265

25:                                               ; preds = %15
  %26 = add i32 %19, %21, !dbg !266
  store i32 %26, ptr @ink_top, align 4, !dbg !267, !tbaa !27
  %27 = add i32 %26, 65535, !dbg !268
  %28 = lshr i32 %27, 16, !dbg !269
    #dbg_value(i32 %28, !59, !DIExpression(), !248)
  %29 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !270
    #dbg_value(i32 %29, !60, !DIExpression(), !248)
  %30 = icmp ugt i32 %28, %29, !dbg !271
  br i1 %30, label %31, label %36, !dbg !272

31:                                               ; preds = %25
  %32 = sub nuw nsw i32 %28, %29, !dbg !273
  %33 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %32), !dbg !274
  %34 = icmp eq i32 %33, -1, !dbg !275
  br i1 %34, label %35, label %36, !dbg !272

35:                                               ; preds = %31
  tail call void @llvm.trap(), !dbg !276
  unreachable, !dbg !278

36:                                               ; preds = %25, %31
  %37 = inttoptr i32 %19 to ptr, !dbg !279
    #dbg_value(ptr %37, !181, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !243)
    #dbg_value(i32 %9, !181, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !243)
    #dbg_value(i32 0, !182, !DIExpression(), !280)
  %38 = icmp eq i32 %9, 0, !dbg !281
  br i1 %38, label %83, label %39, !dbg !282

39:                                               ; preds = %36
  %40 = sub i32 0, %3
  %41 = icmp ult i32 %9, 4, !dbg !282
  %42 = sub i32 %19, %7, !dbg !282
  %43 = icmp ult i32 %42, 16, !dbg !282
  %44 = select i1 %41, i1 true, i1 %43, !dbg !282
  br i1 %44, label %67, label %45, !dbg !282

45:                                               ; preds = %39
  %46 = and i32 %9, 1073741820, !dbg !282
  %47 = insertelement <4 x i32> poison, i32 %3, i64 0, !dbg !282
  %48 = shufflevector <4 x i32> %47, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !282
  %49 = insertelement <4 x i32> poison, i32 %4, i64 0, !dbg !282
  %50 = shufflevector <4 x i32> %49, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !282
  %51 = insertelement <4 x i32> poison, i32 %40, i64 0, !dbg !282
  %52 = shufflevector <4 x i32> %51, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !282
  br label %53, !dbg !282

53:                                               ; preds = %53, %45
  %54 = phi i32 [ 0, %45 ], [ %62, %53 ], !dbg !283
  %55 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %45 ], [ %63, %53 ]
  %56 = getelementptr inbounds nuw i32, ptr %6, i32 %54, !dbg !284
  %57 = load <4 x i32>, ptr %56, align 4, !dbg !284, !tbaa !285
  %58 = icmp ult <4 x i32> %55, %48, !dbg !287
  %59 = select <4 x i1> %58, <4 x i32> %50, <4 x i32> %52, !dbg !288
  %60 = add <4 x i32> %57, %59, !dbg !288
  %61 = getelementptr inbounds nuw i32, ptr %37, i32 %54, !dbg !289
  store <4 x i32> %60, ptr %61, align 8, !dbg !290, !tbaa !285
  %62 = add nuw i32 %54, 4, !dbg !283
  %63 = add <4 x i32> %55, splat (i32 4)
  %64 = icmp eq i32 %62, %46, !dbg !283
  br i1 %64, label %65, label %53, !dbg !283, !llvm.loop !291

65:                                               ; preds = %53
  %66 = icmp eq i32 %9, %46, !dbg !282
  br i1 %66, label %83, label %67, !dbg !282

67:                                               ; preds = %39, %65
  %68 = phi i32 [ 0, %39 ], [ %46, %65 ]
  %69 = or disjoint i32 %68, 1, !dbg !282
  %70 = and i32 %9, 1, !dbg !282
  %71 = icmp eq i32 %70, 0, !dbg !282
  br i1 %71, label %80, label %72, !dbg !282

72:                                               ; preds = %67
    #dbg_value(i32 poison, !182, !DIExpression(), !280)
    #dbg_value(i32 poison, !184, !DIExpression(), !293)
  %73 = getelementptr inbounds nuw i32, ptr %6, i32 %68, !dbg !284
  %74 = load i32, ptr %73, align 4, !dbg !284, !tbaa !285
    #dbg_value(i32 %74, !187, !DIExpression(), !293)
    #dbg_value(i32 %3, !188, !DIExpression(), !293)
    #dbg_value(i32 %4, !189, !DIExpression(), !293)
    #dbg_value(i32 poison, !190, !DIExpression(), !293)
  %75 = icmp ult i32 %68, %3, !dbg !287
  %76 = select i1 %75, i32 %4, i32 %40, !dbg !288
  %77 = add i32 %74, %76, !dbg !288
    #dbg_value(i32 %77, !191, !DIExpression(), !293)
  %78 = getelementptr inbounds nuw i32, ptr %37, i32 %68, !dbg !289
  store i32 %77, ptr %78, align 8, !dbg !290, !tbaa !285
  %79 = or disjoint i32 %68, 1, !dbg !283
    #dbg_value(i32 %79, !182, !DIExpression(), !280)
  br label %80, !dbg !282

80:                                               ; preds = %72, %67
  %81 = phi i32 [ %68, %67 ], [ %79, %72 ]
  %82 = icmp eq i32 %9, %69, !dbg !282
  br i1 %82, label %83, label %90, !dbg !282

83:                                               ; preds = %80, %90, %65, %36
    #dbg_value(ptr %37, !197, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !243)
    #dbg_value(i32 %9, !197, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !243)
  %84 = load ptr, ptr %2, align 4, !dbg !294, !tbaa !245
  %85 = ptrtoint ptr %84 to i32, !dbg !294
  %86 = getelementptr inbounds nuw i8, ptr %2, i32 4, !dbg !294
  %87 = load i32, ptr %86, align 4, !dbg !294, !tbaa !27
    #dbg_value(ptr %84, !198, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !243)
    #dbg_value(i32 %87, !198, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !243)
  %88 = xor i32 %87, -1, !dbg !295
  %89 = icmp ugt i32 %9, %88, !dbg !297
  br i1 %89, label %107, label %108, !dbg !297

90:                                               ; preds = %80, %90
  %91 = phi i32 [ %105, %90 ], [ %81, %80 ]
    #dbg_value(i32 %91, !182, !DIExpression(), !280)
    #dbg_value(i32 %91, !184, !DIExpression(), !293)
  %92 = getelementptr inbounds nuw i32, ptr %6, i32 %91, !dbg !284
  %93 = load i32, ptr %92, align 4, !dbg !284, !tbaa !285
    #dbg_value(i32 %93, !187, !DIExpression(), !293)
    #dbg_value(i32 %3, !188, !DIExpression(), !293)
    #dbg_value(i32 %4, !189, !DIExpression(), !293)
    #dbg_value(i32 %91, !190, !DIExpression(), !293)
  %94 = icmp ult i32 %91, %3, !dbg !287
  %95 = select i1 %94, i32 %4, i32 %40, !dbg !288
  %96 = add i32 %93, %95, !dbg !288
    #dbg_value(i32 %96, !191, !DIExpression(), !293)
  %97 = getelementptr inbounds nuw i32, ptr %37, i32 %91, !dbg !289
  store i32 %96, ptr %97, align 4, !dbg !290, !tbaa !285
  %98 = add nuw i32 %91, 1, !dbg !283
    #dbg_value(i32 %98, !182, !DIExpression(), !280)
    #dbg_value(i32 %98, !184, !DIExpression(), !293)
  %99 = getelementptr inbounds nuw i32, ptr %6, i32 %98, !dbg !284
  %100 = load i32, ptr %99, align 4, !dbg !284, !tbaa !285
    #dbg_value(i32 %100, !187, !DIExpression(), !293)
    #dbg_value(i32 %98, !190, !DIExpression(), !293)
  %101 = icmp ult i32 %98, %3, !dbg !287
  %102 = select i1 %101, i32 %4, i32 %40, !dbg !288
  %103 = add i32 %100, %102, !dbg !288
    #dbg_value(i32 %103, !191, !DIExpression(), !293)
  %104 = getelementptr inbounds nuw i32, ptr %37, i32 %98, !dbg !289
  store i32 %103, ptr %104, align 4, !dbg !290, !tbaa !285
  %105 = add nuw i32 %91, 2, !dbg !283
    #dbg_value(i32 %105, !182, !DIExpression(), !280)
  %106 = icmp eq i32 %105, %9, !dbg !281
  br i1 %106, label %83, label %90, !dbg !282, !llvm.loop !298

107:                                              ; preds = %83
  tail call void @llvm.trap(), !dbg !299
  unreachable, !dbg !301

108:                                              ; preds = %83
  %109 = add i32 %87, %9, !dbg !302
    #dbg_value(i32 %109, !199, !DIExpression(), !243)
    #dbg_value(i32 %109, !55, !DIExpression(), !303)
    #dbg_value(i32 4, !56, !DIExpression(), !303)
  %110 = icmp ugt i32 %109, 1073741823, !dbg !305
  %111 = load i32, ptr @ink_top, align 4
  %112 = icmp ugt i32 %111, -8
  %113 = select i1 %110, i1 true, i1 %112, !dbg !306
  br i1 %113, label %114, label %115, !dbg !306

114:                                              ; preds = %108
  tail call void @llvm.trap(), !dbg !307
  unreachable, !dbg !309

115:                                              ; preds = %108
  %116 = icmp eq i32 %111, 0, !dbg !310
  %117 = add nuw i32 %111, 7, !dbg !311
  %118 = select i1 %116, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %117, !dbg !312
  %119 = and i32 %118, -8, !dbg !313
    #dbg_value(i32 %118, !57, !DIExpression(DW_OP_constu, 18446744073709551608, DW_OP_and, DW_OP_stack_value), !303)
  %120 = tail call i32 @llvm.umax.i32(i32 %109, i32 1), !dbg !314
  %121 = shl nuw i32 %120, 2, !dbg !315
    #dbg_value(i32 %121, !58, !DIExpression(), !303)
  %122 = xor i32 %119, -1, !dbg !316
  %123 = icmp ugt i32 %121, %122, !dbg !317
  br i1 %123, label %124, label %125, !dbg !317

124:                                              ; preds = %115
  tail call void @llvm.trap(), !dbg !318
  unreachable, !dbg !320

125:                                              ; preds = %115
  %126 = add i32 %119, %121, !dbg !321
  store i32 %126, ptr @ink_top, align 4, !dbg !322, !tbaa !27
  %127 = add i32 %126, 65535, !dbg !323
  %128 = lshr i32 %127, 16, !dbg !324
    #dbg_value(i32 %128, !59, !DIExpression(), !303)
  %129 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !325
    #dbg_value(i32 %129, !60, !DIExpression(), !303)
  %130 = icmp ugt i32 %128, %129, !dbg !326
  br i1 %130, label %131, label %136, !dbg !327

131:                                              ; preds = %125
  %132 = sub nuw nsw i32 %128, %129, !dbg !328
  %133 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %132), !dbg !329
  %134 = icmp eq i32 %133, -1, !dbg !330
  br i1 %134, label %135, label %136, !dbg !327

135:                                              ; preds = %131
  tail call void @llvm.trap(), !dbg !331
  unreachable, !dbg !333

136:                                              ; preds = %125, %131
  %137 = inttoptr i32 %119 to ptr, !dbg !334
    #dbg_value(ptr %137, !200, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !243)
    #dbg_value(i32 %109, !200, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !243)
  %138 = shl nuw i32 %9, 2, !dbg !335
    #dbg_value(ptr %137, !110, !DIExpression(), !336)
    #dbg_value(ptr %37, !115, !DIExpression(), !336)
    #dbg_value(i32 %138, !116, !DIExpression(), !336)
    #dbg_value(ptr %137, !117, !DIExpression(), !336)
    #dbg_value(ptr %37, !119, !DIExpression(), !336)
    #dbg_value(i32 0, !122, !DIExpression(), !338)
  br i1 %38, label %176, label %139, !dbg !339

139:                                              ; preds = %136
  %140 = icmp ult i32 %9, 4, !dbg !339
  %141 = sub i32 %118, %19, !dbg !339
  %142 = icmp ult i32 %141, 16, !dbg !339
  %143 = or i1 %140, %142, !dbg !339
  br i1 %143, label %155, label %144, !dbg !339

144:                                              ; preds = %139
  %145 = and i32 %138, -16, !dbg !339
  br label %146, !dbg !339

146:                                              ; preds = %146, %144
  %147 = phi i32 [ 0, %144 ], [ %151, %146 ], !dbg !340
  %148 = getelementptr inbounds nuw i8, ptr %37, i32 %147, !dbg !341
  %149 = load <16 x i8>, ptr %148, align 8, !dbg !341, !tbaa !132
  %150 = getelementptr inbounds nuw i8, ptr %137, i32 %147, !dbg !342
  store <16 x i8> %149, ptr %150, align 8, !dbg !343, !tbaa !132
  %151 = add nuw i32 %147, 16, !dbg !340
  %152 = icmp eq i32 %151, %145, !dbg !340
  br i1 %152, label %153, label %146, !dbg !340, !llvm.loop !344

153:                                              ; preds = %146
  %154 = icmp eq i32 %138, %145, !dbg !339
  br i1 %154, label %176, label %155, !dbg !339

155:                                              ; preds = %139, %153
  %156 = phi i32 [ 0, %139 ], [ %145, %153 ]
  br label %157, !dbg !339

157:                                              ; preds = %157, %155
  %158 = phi i32 [ %156, %155 ], [ %174, %157 ]
    #dbg_value(i32 %158, !122, !DIExpression(), !338)
  %159 = getelementptr inbounds nuw i8, ptr %37, i32 %158, !dbg !341
  %160 = load i8, ptr %159, align 4, !dbg !341, !tbaa !132
  %161 = getelementptr inbounds nuw i8, ptr %137, i32 %158, !dbg !342
  store i8 %160, ptr %161, align 4, !dbg !343, !tbaa !132
  %162 = or disjoint i32 %158, 1, !dbg !340
    #dbg_value(i32 %162, !122, !DIExpression(), !338)
  %163 = getelementptr inbounds nuw i8, ptr %37, i32 %162, !dbg !341
  %164 = load i8, ptr %163, align 1, !dbg !341, !tbaa !132
  %165 = getelementptr inbounds nuw i8, ptr %137, i32 %162, !dbg !342
  store i8 %164, ptr %165, align 1, !dbg !343, !tbaa !132
  %166 = or disjoint i32 %158, 2, !dbg !340
    #dbg_value(i32 %166, !122, !DIExpression(), !338)
  %167 = getelementptr inbounds nuw i8, ptr %37, i32 %166, !dbg !341
  %168 = load i8, ptr %167, align 2, !dbg !341, !tbaa !132
  %169 = getelementptr inbounds nuw i8, ptr %137, i32 %166, !dbg !342
  store i8 %168, ptr %169, align 2, !dbg !343, !tbaa !132
  %170 = or disjoint i32 %158, 3, !dbg !340
    #dbg_value(i32 %170, !122, !DIExpression(), !338)
  %171 = getelementptr inbounds nuw i8, ptr %37, i32 %170, !dbg !341
  %172 = load i8, ptr %171, align 1, !dbg !341, !tbaa !132
  %173 = getelementptr inbounds nuw i8, ptr %137, i32 %170, !dbg !342
  store i8 %172, ptr %173, align 1, !dbg !343, !tbaa !132
  %174 = add nuw i32 %158, 4, !dbg !340
    #dbg_value(i32 %174, !122, !DIExpression(), !338)
  %175 = icmp eq i32 %174, %138, !dbg !346
  br i1 %175, label %176, label %157, !dbg !339, !llvm.loop !347

176:                                              ; preds = %157, %153, %136
  %177 = getelementptr inbounds nuw i32, ptr %137, i32 %9, !dbg !348
  %178 = shl i32 %87, 2, !dbg !349
    #dbg_value(ptr %177, !110, !DIExpression(), !350)
    #dbg_value(ptr %84, !115, !DIExpression(), !350)
    #dbg_value(i32 %178, !116, !DIExpression(), !350)
    #dbg_value(ptr %177, !117, !DIExpression(), !350)
    #dbg_value(ptr %84, !119, !DIExpression(), !350)
    #dbg_value(i32 0, !122, !DIExpression(), !352)
  %179 = icmp eq i32 %178, 0, !dbg !353
  br i1 %179, label %218, label %180, !dbg !354

180:                                              ; preds = %176
  %181 = icmp ult i32 %178, 16, !dbg !354
  br i1 %181, label %197, label %182, !dbg !354

182:                                              ; preds = %180
  %183 = add i32 %119, %138, !dbg !354
  %184 = sub i32 %183, %85, !dbg !354
  %185 = icmp ult i32 %184, 16, !dbg !354
  br i1 %185, label %197, label %186, !dbg !354

186:                                              ; preds = %182
  %187 = and i32 %178, -16, !dbg !354
  br label %188, !dbg !354

188:                                              ; preds = %188, %186
  %189 = phi i32 [ 0, %186 ], [ %193, %188 ], !dbg !355
  %190 = getelementptr inbounds nuw i8, ptr %84, i32 %189, !dbg !356
  %191 = load <16 x i8>, ptr %190, align 1, !dbg !356, !tbaa !132
  %192 = getelementptr inbounds nuw i8, ptr %177, i32 %189, !dbg !357
  store <16 x i8> %191, ptr %192, align 4, !dbg !358, !tbaa !132
  %193 = add nuw i32 %189, 16, !dbg !355
  %194 = icmp eq i32 %193, %187, !dbg !355
  br i1 %194, label %195, label %188, !dbg !355, !llvm.loop !359

195:                                              ; preds = %188
  %196 = icmp eq i32 %178, %187, !dbg !354
  br i1 %196, label %218, label %197, !dbg !354

197:                                              ; preds = %182, %180, %195
  %198 = phi i32 [ 0, %180 ], [ 0, %182 ], [ %187, %195 ]
  br label %199, !dbg !354

199:                                              ; preds = %199, %197
  %200 = phi i32 [ %198, %197 ], [ %216, %199 ]
    #dbg_value(i32 %200, !122, !DIExpression(), !352)
  %201 = getelementptr inbounds nuw i8, ptr %84, i32 %200, !dbg !356
  %202 = load i8, ptr %201, align 1, !dbg !356, !tbaa !132
  %203 = getelementptr inbounds nuw i8, ptr %177, i32 %200, !dbg !357
  store i8 %202, ptr %203, align 4, !dbg !358, !tbaa !132
  %204 = or disjoint i32 %200, 1, !dbg !355
    #dbg_value(i32 %204, !122, !DIExpression(), !352)
  %205 = getelementptr inbounds nuw i8, ptr %84, i32 %204, !dbg !356
  %206 = load i8, ptr %205, align 1, !dbg !356, !tbaa !132
  %207 = getelementptr inbounds nuw i8, ptr %177, i32 %204, !dbg !357
  store i8 %206, ptr %207, align 1, !dbg !358, !tbaa !132
  %208 = or disjoint i32 %200, 2, !dbg !355
    #dbg_value(i32 %208, !122, !DIExpression(), !352)
  %209 = getelementptr inbounds nuw i8, ptr %84, i32 %208, !dbg !356
  %210 = load i8, ptr %209, align 1, !dbg !356, !tbaa !132
  %211 = getelementptr inbounds nuw i8, ptr %177, i32 %208, !dbg !357
  store i8 %210, ptr %211, align 2, !dbg !358, !tbaa !132
  %212 = or disjoint i32 %200, 3, !dbg !355
    #dbg_value(i32 %212, !122, !DIExpression(), !352)
  %213 = getelementptr inbounds nuw i8, ptr %84, i32 %212, !dbg !356
  %214 = load i8, ptr %213, align 1, !dbg !356, !tbaa !132
  %215 = getelementptr inbounds nuw i8, ptr %177, i32 %212, !dbg !357
  store i8 %214, ptr %215, align 1, !dbg !358, !tbaa !132
  %216 = add nuw i32 %200, 4, !dbg !355
    #dbg_value(i32 %216, !122, !DIExpression(), !352)
  %217 = icmp eq i32 %216, %178, !dbg !353
  br i1 %217, label %218, label %199, !dbg !354, !llvm.loop !361

218:                                              ; preds = %199, %195, %176
    #dbg_value(ptr %137, !201, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !243)
    #dbg_value(i32 %109, !201, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !243)
    #dbg_value(ptr %6, !202, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !243)
    #dbg_value(i32 %9, !202, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !243)
    #dbg_value(i32 %9, !55, !DIExpression(), !362)
    #dbg_value(i32 4, !56, !DIExpression(), !362)
  %219 = load i32, ptr @ink_top, align 4
  %220 = icmp ugt i32 %219, -8
  br i1 %220, label %221, label %222, !dbg !364

221:                                              ; preds = %218
  tail call void @llvm.trap(), !dbg !365
  unreachable, !dbg !367

222:                                              ; preds = %218
  %223 = icmp eq i32 %219, 0, !dbg !368
  %224 = add nuw i32 %219, 7, !dbg !369
  %225 = select i1 %223, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %224, !dbg !370
  %226 = and i32 %225, -8, !dbg !371
    #dbg_value(i32 %226, !57, !DIExpression(), !362)
    #dbg_value(i32 %21, !58, !DIExpression(), !362)
  %227 = xor i32 %226, -1, !dbg !372
  %228 = icmp ugt i32 %21, %227, !dbg !373
  br i1 %228, label %229, label %230, !dbg !373

229:                                              ; preds = %222
  tail call void @llvm.trap(), !dbg !374
  unreachable, !dbg !376

230:                                              ; preds = %222
  %231 = add i32 %226, %21, !dbg !377
  store i32 %231, ptr @ink_top, align 4, !dbg !378, !tbaa !27
  %232 = add i32 %231, 65535, !dbg !379
  %233 = lshr i32 %232, 16, !dbg !380
    #dbg_value(i32 %233, !59, !DIExpression(), !362)
  %234 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !381
    #dbg_value(i32 %234, !60, !DIExpression(), !362)
  %235 = icmp ugt i32 %233, %234, !dbg !382
  br i1 %235, label %236, label %241, !dbg !383

236:                                              ; preds = %230
  %237 = sub nuw nsw i32 %233, %234, !dbg !384
  %238 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %237), !dbg !385
  %239 = icmp eq i32 %238, -1, !dbg !386
  br i1 %239, label %240, label %241, !dbg !383

240:                                              ; preds = %236
  tail call void @llvm.trap(), !dbg !387
  unreachable, !dbg !389

241:                                              ; preds = %230, %236
  %242 = inttoptr i32 %226 to ptr, !dbg !390
    #dbg_value(ptr %242, !203, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !243)
    #dbg_value(i32 %9, !203, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !243)
    #dbg_value(i32 0, !204, !DIExpression(), !391)
  br i1 %38, label %288, label %243, !dbg !392

243:                                              ; preds = %241
  %244 = icmp ult i32 %9, 4, !dbg !392
  %245 = sub i32 %226, %7, !dbg !392
  %246 = icmp ult i32 %245, 16, !dbg !392
  %247 = select i1 %244, i1 true, i1 %246, !dbg !392
  br i1 %247, label %270, label %248, !dbg !392

248:                                              ; preds = %243
  %249 = and i32 %9, 1073741820, !dbg !392
  %250 = insertelement <4 x i32> poison, i32 %4, i64 0, !dbg !392
  %251 = shufflevector <4 x i32> %250, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !392
  %252 = insertelement <4 x i32> poison, i32 %3, i64 0, !dbg !392
  %253 = shufflevector <4 x i32> %252, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !392
  br label %254, !dbg !392

254:                                              ; preds = %254, %248
  %255 = phi i32 [ 0, %248 ], [ %265, %254 ], !dbg !393
  %256 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %248 ], [ %266, %254 ]
  %257 = getelementptr inbounds nuw i32, ptr %6, i32 %255, !dbg !394
  %258 = load <4 x i32>, ptr %257, align 4, !dbg !394, !tbaa !285
  %259 = urem <4 x i32> %256, splat (i32 3), !dbg !395
  %260 = icmp eq <4 x i32> %259, zeroinitializer, !dbg !398
  %261 = mul <4 x i32> %258, %251, !dbg !399
  %262 = add <4 x i32> %258, %253, !dbg !399
  %263 = select <4 x i1> %260, <4 x i32> %261, <4 x i32> %262, !dbg !399
  %264 = getelementptr inbounds nuw i32, ptr %242, i32 %255, !dbg !400
  store <4 x i32> %263, ptr %264, align 8, !dbg !401, !tbaa !285
  %265 = add nuw i32 %255, 4, !dbg !393
  %266 = add <4 x i32> %256, splat (i32 4)
  %267 = icmp eq i32 %265, %249, !dbg !393
  br i1 %267, label %268, label %254, !dbg !393, !llvm.loop !402

268:                                              ; preds = %254
  %269 = icmp eq i32 %9, %249, !dbg !392
  br i1 %269, label %288, label %270, !dbg !392

270:                                              ; preds = %243, %268
  %271 = phi i32 [ 0, %243 ], [ %249, %268 ]
  %272 = or disjoint i32 %271, 1, !dbg !392
  %273 = and i32 %9, 1, !dbg !392
  %274 = icmp eq i32 %273, 0, !dbg !392
  br i1 %274, label %285, label %275, !dbg !392

275:                                              ; preds = %270
    #dbg_value(i32 poison, !204, !DIExpression(), !391)
    #dbg_value(i32 poison, !206, !DIExpression(), !404)
  %276 = getelementptr inbounds nuw i32, ptr %6, i32 %271, !dbg !394
  %277 = load i32, ptr %276, align 4, !dbg !394, !tbaa !285
    #dbg_value(i32 %277, !209, !DIExpression(), !404)
    #dbg_value(i32 %3, !210, !DIExpression(), !404)
    #dbg_value(i32 %4, !211, !DIExpression(), !404)
    #dbg_value(i32 poison, !212, !DIExpression(), !404)
    #dbg_value(i32 3, !213, !DIExpression(), !404)
    #dbg_value(i32 poison, !214, !DIExpression(), !404)
  %278 = urem i32 %271, 3, !dbg !395
    #dbg_value(i32 %278, !214, !DIExpression(), !404)
    #dbg_value(i32 %278, !215, !DIExpression(), !404)
  %279 = icmp eq i32 %278, 0, !dbg !398
  %280 = mul i32 %277, %4, !dbg !399
  %281 = add i32 %277, %3, !dbg !399
  %282 = select i1 %279, i32 %280, i32 %281, !dbg !399
    #dbg_value(i32 %282, !216, !DIExpression(), !404)
  %283 = getelementptr inbounds nuw i32, ptr %242, i32 %271, !dbg !400
  store i32 %282, ptr %283, align 8, !dbg !401, !tbaa !285
  %284 = or disjoint i32 %271, 1, !dbg !393
    #dbg_value(i32 %284, !204, !DIExpression(), !391)
  br label %285, !dbg !392

285:                                              ; preds = %275, %270
  %286 = phi i32 [ %271, %270 ], [ %284, %275 ]
  %287 = icmp eq i32 %9, %272, !dbg !392
  br i1 %287, label %288, label %370, !dbg !392

288:                                              ; preds = %285, %370, %268, %241
    #dbg_value(ptr %242, !222, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !243)
    #dbg_value(i32 %9, !222, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !243)
    #dbg_declare(ptr %0, !223, !DIExpression(), !405)
  %289 = tail call i32 @llvm.umin.i32(i32 %109, i32 %9), !dbg !406
    #dbg_value(i32 %289, !55, !DIExpression(), !407)
    #dbg_value(i32 4, !56, !DIExpression(), !407)
  %290 = load i32, ptr @ink_top, align 4
  %291 = icmp ugt i32 %290, -8
  br i1 %291, label %292, label %293, !dbg !409

292:                                              ; preds = %288
  tail call void @llvm.trap(), !dbg !410
  unreachable, !dbg !412

293:                                              ; preds = %288
  %294 = icmp eq i32 %290, 0, !dbg !413
  %295 = add nuw i32 %290, 7, !dbg !414
  %296 = select i1 %294, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %295, !dbg !415
  %297 = and i32 %296, -8, !dbg !416
    #dbg_value(i32 %296, !57, !DIExpression(DW_OP_constu, 18446744073709551608, DW_OP_and, DW_OP_stack_value), !407)
  %298 = tail call i32 @llvm.umax.i32(i32 %289, i32 1), !dbg !417
  %299 = shl nuw i32 %298, 2, !dbg !418
    #dbg_value(i32 %299, !58, !DIExpression(), !407)
  %300 = xor i32 %297, -1, !dbg !419
  %301 = icmp ugt i32 %299, %300, !dbg !420
  br i1 %301, label %302, label %303, !dbg !420

302:                                              ; preds = %293
  tail call void @llvm.trap(), !dbg !421
  unreachable, !dbg !423

303:                                              ; preds = %293
  %304 = add i32 %297, %299, !dbg !424
  store i32 %304, ptr @ink_top, align 4, !dbg !425, !tbaa !27
  %305 = add i32 %304, 65535, !dbg !426
  %306 = lshr i32 %305, 16, !dbg !427
    #dbg_value(i32 %306, !59, !DIExpression(), !407)
  %307 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !428
    #dbg_value(i32 %307, !60, !DIExpression(), !407)
  %308 = icmp ugt i32 %306, %307, !dbg !429
  br i1 %308, label %309, label %314, !dbg !430

309:                                              ; preds = %303
  %310 = sub nuw nsw i32 %306, %307, !dbg !431
  %311 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %310), !dbg !432
  %312 = icmp eq i32 %311, -1, !dbg !433
  br i1 %312, label %313, label %314, !dbg !430

313:                                              ; preds = %309
  tail call void @llvm.trap(), !dbg !434
  unreachable, !dbg !436

314:                                              ; preds = %303, %309
  %315 = inttoptr i32 %297 to ptr, !dbg !437
  store ptr %315, ptr %0, align 4, !dbg !438, !tbaa !439
  %316 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !438
  store i32 %289, ptr %316, align 4, !dbg !438, !tbaa !441
    #dbg_value(i32 0, !224, !DIExpression(), !442)
  %317 = icmp eq i32 %289, 0, !dbg !443
  br i1 %317, label %391, label %318, !dbg !444

318:                                              ; preds = %314
  %319 = icmp ult i32 %289, 4, !dbg !444
  br i1 %319, label %349, label %320, !dbg !444

320:                                              ; preds = %318
  %321 = sub i32 %296, %119, !dbg !444
  %322 = icmp ult i32 %321, 16, !dbg !444
  %323 = sub i32 %296, %226, !dbg !444
  %324 = icmp ult i32 %323, 16, !dbg !444
  %325 = or i1 %322, %324, !dbg !444
  br i1 %325, label %349, label %326, !dbg !444

326:                                              ; preds = %320
  %327 = and i32 %289, 1073741820, !dbg !444
  %328 = insertelement <4 x i32> poison, i32 %4, i64 0, !dbg !444
  %329 = shufflevector <4 x i32> %328, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !444
  %330 = insertelement <4 x i32> poison, i32 %3, i64 0, !dbg !444
  %331 = shufflevector <4 x i32> %330, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !444
  br label %332, !dbg !444

332:                                              ; preds = %332, %326
  %333 = phi i32 [ 0, %326 ], [ %345, %332 ], !dbg !445
  %334 = getelementptr inbounds nuw i32, ptr %137, i32 %333, !dbg !446
  %335 = load <4 x i32>, ptr %334, align 8, !dbg !446, !tbaa !285
  %336 = getelementptr inbounds nuw i32, ptr %242, i32 %333, !dbg !447
  %337 = load <4 x i32>, ptr %336, align 8, !dbg !447, !tbaa !285
  %338 = icmp ult <4 x i32> %335, %337, !dbg !448
  %339 = mul <4 x i32> %337, %329, !dbg !449
  %340 = add <4 x i32> %339, %335, !dbg !449
  %341 = add <4 x i32> %335, %331, !dbg !449
  %342 = sub <4 x i32> %341, %337, !dbg !449
  %343 = select <4 x i1> %338, <4 x i32> %340, <4 x i32> %342, !dbg !449
  %344 = getelementptr inbounds nuw i32, ptr %315, i32 %333, !dbg !450
  store <4 x i32> %343, ptr %344, align 8, !dbg !451, !tbaa !285
  %345 = add nuw i32 %333, 4, !dbg !445
  %346 = icmp eq i32 %345, %327, !dbg !445
  br i1 %346, label %347, label %332, !dbg !445, !llvm.loop !452

347:                                              ; preds = %332
  %348 = icmp eq i32 %289, %327, !dbg !444
  br i1 %348, label %391, label %349, !dbg !444

349:                                              ; preds = %320, %318, %347
  %350 = phi i32 [ 0, %318 ], [ 0, %320 ], [ %327, %347 ]
  %351 = or disjoint i32 %350, 1, !dbg !444
  %352 = and i32 %289, 1, !dbg !444
  %353 = icmp eq i32 %352, 0, !dbg !444
  br i1 %353, label %367, label %354, !dbg !444

354:                                              ; preds = %349
    #dbg_value(i32 poison, !224, !DIExpression(), !442)
  %355 = getelementptr inbounds nuw i32, ptr %137, i32 %350, !dbg !446
  %356 = load i32, ptr %355, align 8, !dbg !446, !tbaa !285
    #dbg_value(i32 %356, !226, !DIExpression(), !454)
  %357 = getelementptr inbounds nuw i32, ptr %242, i32 %350, !dbg !447
  %358 = load i32, ptr %357, align 8, !dbg !447, !tbaa !285
    #dbg_value(i32 %358, !229, !DIExpression(), !454)
    #dbg_value(i32 %3, !230, !DIExpression(), !454)
    #dbg_value(i32 %4, !231, !DIExpression(), !454)
    #dbg_value(i32 %356, !232, !DIExpression(), !454)
  %359 = icmp ult i32 %356, %358, !dbg !448
  %360 = mul i32 %358, %4, !dbg !449
  %361 = add i32 %360, %356, !dbg !449
  %362 = add i32 %356, %3, !dbg !449
  %363 = sub i32 %362, %358, !dbg !449
  %364 = select i1 %359, i32 %361, i32 %363, !dbg !449
    #dbg_value(i32 %364, !233, !DIExpression(), !454)
  %365 = getelementptr inbounds nuw i32, ptr %315, i32 %350, !dbg !450
  store i32 %364, ptr %365, align 8, !dbg !451, !tbaa !285
  %366 = or disjoint i32 %350, 1, !dbg !445
    #dbg_value(i32 %366, !224, !DIExpression(), !442)
  br label %367, !dbg !444

367:                                              ; preds = %354, %349
  %368 = phi i32 [ %350, %349 ], [ %366, %354 ]
  %369 = icmp eq i32 %289, %351, !dbg !444
  br i1 %369, label %391, label %392, !dbg !444

370:                                              ; preds = %285, %370
  %371 = phi i32 [ %389, %370 ], [ %286, %285 ]
    #dbg_value(i32 %371, !204, !DIExpression(), !391)
    #dbg_value(i32 %371, !206, !DIExpression(), !404)
  %372 = getelementptr inbounds nuw i32, ptr %6, i32 %371, !dbg !394
  %373 = load i32, ptr %372, align 4, !dbg !394, !tbaa !285
    #dbg_value(i32 %373, !209, !DIExpression(), !404)
    #dbg_value(i32 %3, !210, !DIExpression(), !404)
    #dbg_value(i32 %4, !211, !DIExpression(), !404)
    #dbg_value(i32 %371, !212, !DIExpression(), !404)
    #dbg_value(i32 3, !213, !DIExpression(), !404)
    #dbg_value(i32 poison, !214, !DIExpression(), !404)
  %374 = urem i32 %371, 3, !dbg !395
    #dbg_value(i32 %374, !214, !DIExpression(), !404)
    #dbg_value(i32 %374, !215, !DIExpression(), !404)
  %375 = icmp eq i32 %374, 0, !dbg !398
  %376 = mul i32 %373, %4, !dbg !399
  %377 = add i32 %373, %3, !dbg !399
  %378 = select i1 %375, i32 %376, i32 %377, !dbg !399
    #dbg_value(i32 %378, !216, !DIExpression(), !404)
  %379 = getelementptr inbounds nuw i32, ptr %242, i32 %371, !dbg !400
  store i32 %378, ptr %379, align 4, !dbg !401, !tbaa !285
  %380 = add nuw i32 %371, 1, !dbg !393
    #dbg_value(i32 %380, !204, !DIExpression(), !391)
    #dbg_value(i32 %380, !206, !DIExpression(), !404)
  %381 = getelementptr inbounds nuw i32, ptr %6, i32 %380, !dbg !394
  %382 = load i32, ptr %381, align 4, !dbg !394, !tbaa !285
    #dbg_value(i32 %382, !209, !DIExpression(), !404)
    #dbg_value(i32 %380, !212, !DIExpression(), !404)
    #dbg_value(i32 poison, !214, !DIExpression(), !404)
  %383 = urem i32 %380, 3, !dbg !395
    #dbg_value(i32 %383, !214, !DIExpression(), !404)
    #dbg_value(i32 %383, !215, !DIExpression(), !404)
  %384 = icmp eq i32 %383, 0, !dbg !398
  %385 = mul i32 %382, %4, !dbg !399
  %386 = add i32 %382, %3, !dbg !399
  %387 = select i1 %384, i32 %385, i32 %386, !dbg !399
    #dbg_value(i32 %387, !216, !DIExpression(), !404)
  %388 = getelementptr inbounds nuw i32, ptr %242, i32 %380, !dbg !400
  store i32 %387, ptr %388, align 4, !dbg !401, !tbaa !285
  %389 = add nuw i32 %371, 2, !dbg !393
    #dbg_value(i32 %389, !204, !DIExpression(), !391)
  %390 = icmp eq i32 %389, %9, !dbg !455
  br i1 %390, label %288, label %370, !dbg !392, !llvm.loop !456

391:                                              ; preds = %367, %392, %347, %314
  ret void, !dbg !457

392:                                              ; preds = %367, %392
  %393 = phi i32 [ %417, %392 ], [ %368, %367 ]
    #dbg_value(i32 %393, !224, !DIExpression(), !442)
  %394 = getelementptr inbounds nuw i32, ptr %137, i32 %393, !dbg !446
  %395 = load i32, ptr %394, align 4, !dbg !446, !tbaa !285
    #dbg_value(i32 %395, !226, !DIExpression(), !454)
  %396 = getelementptr inbounds nuw i32, ptr %242, i32 %393, !dbg !447
  %397 = load i32, ptr %396, align 4, !dbg !447, !tbaa !285
    #dbg_value(i32 %397, !229, !DIExpression(), !454)
    #dbg_value(i32 %3, !230, !DIExpression(), !454)
    #dbg_value(i32 %4, !231, !DIExpression(), !454)
    #dbg_value(i32 %395, !232, !DIExpression(), !454)
  %398 = icmp ult i32 %395, %397, !dbg !448
  %399 = mul i32 %397, %4, !dbg !449
  %400 = add i32 %399, %395, !dbg !449
  %401 = add i32 %395, %3, !dbg !449
  %402 = sub i32 %401, %397, !dbg !449
  %403 = select i1 %398, i32 %400, i32 %402, !dbg !449
    #dbg_value(i32 %403, !233, !DIExpression(), !454)
  %404 = getelementptr inbounds nuw i32, ptr %315, i32 %393, !dbg !450
  store i32 %403, ptr %404, align 4, !dbg !451, !tbaa !285
  %405 = add nuw i32 %393, 1, !dbg !445
    #dbg_value(i32 %405, !224, !DIExpression(), !442)
  %406 = getelementptr inbounds nuw i32, ptr %137, i32 %405, !dbg !446
  %407 = load i32, ptr %406, align 4, !dbg !446, !tbaa !285
    #dbg_value(i32 %407, !226, !DIExpression(), !454)
  %408 = getelementptr inbounds nuw i32, ptr %242, i32 %405, !dbg !447
  %409 = load i32, ptr %408, align 4, !dbg !447, !tbaa !285
    #dbg_value(i32 %409, !229, !DIExpression(), !454)
    #dbg_value(i32 %407, !232, !DIExpression(), !454)
  %410 = icmp ult i32 %407, %409, !dbg !448
  %411 = mul i32 %409, %4, !dbg !449
  %412 = add i32 %411, %407, !dbg !449
  %413 = add i32 %407, %3, !dbg !449
  %414 = sub i32 %413, %409, !dbg !449
  %415 = select i1 %410, i32 %412, i32 %414, !dbg !449
    #dbg_value(i32 %415, !233, !DIExpression(), !454)
  %416 = getelementptr inbounds nuw i32, ptr %315, i32 %405, !dbg !450
  store i32 %415, ptr %416, align 4, !dbg !451, !tbaa !285
  %417 = add nuw i32 %393, 2, !dbg !445
    #dbg_value(i32 %417, !224, !DIExpression(), !442)
  %418 = icmp eq i32 %417, %289, !dbg !443
  br i1 %418, label %391, label %392, !dbg !444, !llvm.loop !458
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_left_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !459 {
    #dbg_value(i32 %0, !463, !DIExpression(), !474)
    #dbg_value(i32 %1, !464, !DIExpression(), !474)
    #dbg_value(i32 %2, !465, !DIExpression(), !474)
    #dbg_value(i32 %3, !466, !DIExpression(), !474)
    #dbg_value(i32 %0, !467, !DIExpression(), !474)
  %5 = icmp ult i32 %0, %2, !dbg !475
  %6 = sub i32 0, %2, !dbg !476
  %7 = select i1 %5, i32 %3, i32 %6, !dbg !476
  %8 = add i32 %7, %1, !dbg !476
    #dbg_value(i32 %8, !468, !DIExpression(), !474)
  ret i32 %8, !dbg !477
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_right_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !478 {
    #dbg_value(i32 %0, !480, !DIExpression(), !494)
    #dbg_value(i32 %1, !481, !DIExpression(), !494)
    #dbg_value(i32 %2, !482, !DIExpression(), !494)
    #dbg_value(i32 %3, !483, !DIExpression(), !494)
    #dbg_value(i32 %0, !484, !DIExpression(), !494)
    #dbg_value(i32 3, !485, !DIExpression(), !494)
    #dbg_value(i32 poison, !486, !DIExpression(), !494)
  %5 = urem i32 %0, 3, !dbg !495
    #dbg_value(i32 %5, !486, !DIExpression(), !494)
    #dbg_value(i32 %5, !486, !DIExpression(), !494)
    #dbg_value(i32 %5, !487, !DIExpression(), !494)
  %6 = icmp eq i32 %5, 0, !dbg !498
  %7 = mul i32 %3, %1, !dbg !499
  %8 = add i32 %2, %1, !dbg !499
  %9 = select i1 %6, i32 %7, i32 %8, !dbg !499
    #dbg_value(i32 %9, !488, !DIExpression(), !494)
  ret i32 %9, !dbg !500
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_pair_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !501 {
    #dbg_value(i32 %0, !503, !DIExpression(), !516)
    #dbg_value(i32 %1, !504, !DIExpression(), !516)
    #dbg_value(i32 %2, !505, !DIExpression(), !516)
    #dbg_value(i32 %3, !506, !DIExpression(), !516)
    #dbg_value(i32 %0, !507, !DIExpression(), !516)
  %5 = icmp ult i32 %0, %1, !dbg !517
  %6 = mul i32 %3, %1, !dbg !518
  %7 = add i32 %6, %0, !dbg !518
  %8 = sub i32 %0, %1, !dbg !518
  %9 = add i32 %8, %2, !dbg !518
  %10 = select i1 %5, i32 %7, i32 %9, !dbg !518
    #dbg_value(i32 %10, !508, !DIExpression(), !516)
  ret i32 %10, !dbg !519
}

; Function Attrs: nounwind uwtable
define hidden i32 @lang_fn_pipeline38_left_padded_zip_u32_into(ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %1, i32 noundef %2, i32 noundef %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #2 !dbg !520 {
    #dbg_declare(ptr %0, !524, !DIExpression(), !590)
    #dbg_declare(ptr %1, !525, !DIExpression(), !591)
    #dbg_value(i32 %2, !526, !DIExpression(), !592)
    #dbg_value(i32 %3, !527, !DIExpression(), !592)
    #dbg_value(ptr %4, !528, !DIExpression(), !592)
  %6 = ptrtoint ptr %4 to i32, !dbg !593
  %7 = load ptr, ptr %0, align 4, !dbg !593, !tbaa !245
  %8 = ptrtoint ptr %7 to i32, !dbg !593
  %9 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !593
  %10 = load i32, ptr %9, align 4, !dbg !593, !tbaa !27
    #dbg_value(ptr %7, !529, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
    #dbg_value(i32 %10, !529, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
    #dbg_value(i32 %10, !55, !DIExpression(), !594)
    #dbg_value(i32 4, !56, !DIExpression(), !594)
  %11 = icmp ugt i32 %10, 1073741823, !dbg !596
  %12 = load i32, ptr @ink_top, align 4
  %13 = icmp ugt i32 %12, -8
  %14 = select i1 %11, i1 true, i1 %13, !dbg !597
  br i1 %14, label %15, label %16, !dbg !597

15:                                               ; preds = %5
  tail call void @llvm.trap(), !dbg !598
  unreachable, !dbg !600

16:                                               ; preds = %5
  %17 = icmp eq i32 %12, 0, !dbg !601
  %18 = add nuw i32 %12, 7, !dbg !602
  %19 = select i1 %17, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %18, !dbg !603
  %20 = and i32 %19, -8, !dbg !604
    #dbg_value(i32 %20, !57, !DIExpression(), !594)
  %21 = tail call i32 @llvm.umax.i32(i32 %10, i32 1), !dbg !605
  %22 = shl nuw i32 %21, 2, !dbg !606
    #dbg_value(i32 %22, !58, !DIExpression(), !594)
  %23 = xor i32 %20, -1, !dbg !607
  %24 = icmp ugt i32 %22, %23, !dbg !608
  br i1 %24, label %25, label %26, !dbg !608

25:                                               ; preds = %16
  tail call void @llvm.trap(), !dbg !609
  unreachable, !dbg !611

26:                                               ; preds = %16
  %27 = add i32 %20, %22, !dbg !612
  store i32 %27, ptr @ink_top, align 4, !dbg !613, !tbaa !27
  %28 = add i32 %27, 65535, !dbg !614
  %29 = lshr i32 %28, 16, !dbg !615
    #dbg_value(i32 %29, !59, !DIExpression(), !594)
  %30 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !616
    #dbg_value(i32 %30, !60, !DIExpression(), !594)
  %31 = icmp ugt i32 %29, %30, !dbg !617
  br i1 %31, label %32, label %37, !dbg !618

32:                                               ; preds = %26
  %33 = sub nuw nsw i32 %29, %30, !dbg !619
  %34 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %33), !dbg !620
  %35 = icmp eq i32 %34, -1, !dbg !621
  br i1 %35, label %36, label %37, !dbg !618

36:                                               ; preds = %32
  tail call void @llvm.trap(), !dbg !622
  unreachable, !dbg !624

37:                                               ; preds = %26, %32
  %38 = inttoptr i32 %20 to ptr, !dbg !625
    #dbg_value(ptr %38, !530, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
    #dbg_value(i32 %10, !530, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
    #dbg_value(i32 0, !531, !DIExpression(), !626)
  %39 = icmp eq i32 %10, 0, !dbg !627
  br i1 %39, label %84, label %40, !dbg !628

40:                                               ; preds = %37
  %41 = sub i32 0, %2
  %42 = icmp ult i32 %10, 4, !dbg !628
  %43 = sub i32 %20, %8, !dbg !628
  %44 = icmp ult i32 %43, 16, !dbg !628
  %45 = select i1 %42, i1 true, i1 %44, !dbg !628
  br i1 %45, label %68, label %46, !dbg !628

46:                                               ; preds = %40
  %47 = and i32 %10, 1073741820, !dbg !628
  %48 = insertelement <4 x i32> poison, i32 %2, i64 0, !dbg !628
  %49 = shufflevector <4 x i32> %48, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !628
  %50 = insertelement <4 x i32> poison, i32 %3, i64 0, !dbg !628
  %51 = shufflevector <4 x i32> %50, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !628
  %52 = insertelement <4 x i32> poison, i32 %41, i64 0, !dbg !628
  %53 = shufflevector <4 x i32> %52, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !628
  br label %54, !dbg !628

54:                                               ; preds = %54, %46
  %55 = phi i32 [ 0, %46 ], [ %63, %54 ], !dbg !629
  %56 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %46 ], [ %64, %54 ]
  %57 = getelementptr inbounds nuw i32, ptr %7, i32 %55, !dbg !630
  %58 = load <4 x i32>, ptr %57, align 4, !dbg !630, !tbaa !285
  %59 = icmp ult <4 x i32> %56, %49, !dbg !631
  %60 = select <4 x i1> %59, <4 x i32> %51, <4 x i32> %53, !dbg !632
  %61 = add <4 x i32> %58, %60, !dbg !632
  %62 = getelementptr inbounds nuw i32, ptr %38, i32 %55, !dbg !633
  store <4 x i32> %61, ptr %62, align 8, !dbg !634, !tbaa !285
  %63 = add nuw i32 %55, 4, !dbg !629
  %64 = add <4 x i32> %56, splat (i32 4)
  %65 = icmp eq i32 %63, %47, !dbg !629
  br i1 %65, label %66, label %54, !dbg !629, !llvm.loop !635

66:                                               ; preds = %54
  %67 = icmp eq i32 %10, %47, !dbg !628
  br i1 %67, label %84, label %68, !dbg !628

68:                                               ; preds = %40, %66
  %69 = phi i32 [ 0, %40 ], [ %47, %66 ]
  %70 = or disjoint i32 %69, 1, !dbg !628
  %71 = and i32 %10, 1, !dbg !628
  %72 = icmp eq i32 %71, 0, !dbg !628
  br i1 %72, label %81, label %73, !dbg !628

73:                                               ; preds = %68
    #dbg_value(i32 poison, !531, !DIExpression(), !626)
    #dbg_value(i32 poison, !533, !DIExpression(), !637)
  %74 = getelementptr inbounds nuw i32, ptr %7, i32 %69, !dbg !630
  %75 = load i32, ptr %74, align 4, !dbg !630, !tbaa !285
    #dbg_value(i32 %75, !536, !DIExpression(), !637)
    #dbg_value(i32 %2, !537, !DIExpression(), !637)
    #dbg_value(i32 %3, !538, !DIExpression(), !637)
    #dbg_value(i32 poison, !539, !DIExpression(), !637)
  %76 = icmp ult i32 %69, %2, !dbg !631
  %77 = select i1 %76, i32 %3, i32 %41, !dbg !632
  %78 = add i32 %75, %77, !dbg !632
    #dbg_value(i32 %78, !540, !DIExpression(), !637)
  %79 = getelementptr inbounds nuw i32, ptr %38, i32 %69, !dbg !633
  store i32 %78, ptr %79, align 8, !dbg !634, !tbaa !285
  %80 = or disjoint i32 %69, 1, !dbg !629
    #dbg_value(i32 %80, !531, !DIExpression(), !626)
  br label %81, !dbg !628

81:                                               ; preds = %73, %68
  %82 = phi i32 [ %69, %68 ], [ %80, %73 ]
  %83 = icmp eq i32 %10, %70, !dbg !628
  br i1 %83, label %84, label %91, !dbg !628

84:                                               ; preds = %81, %91, %66, %37
    #dbg_value(ptr %38, !546, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
    #dbg_value(i32 %10, !546, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
  %85 = load ptr, ptr %1, align 4, !dbg !638, !tbaa !245
  %86 = ptrtoint ptr %85 to i32, !dbg !638
  %87 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !638
  %88 = load i32, ptr %87, align 4, !dbg !638, !tbaa !27
    #dbg_value(ptr %85, !547, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
    #dbg_value(i32 %88, !547, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
  %89 = xor i32 %88, -1, !dbg !639
  %90 = icmp ugt i32 %10, %89, !dbg !641
  br i1 %90, label %108, label %109, !dbg !641

91:                                               ; preds = %81, %91
  %92 = phi i32 [ %106, %91 ], [ %82, %81 ]
    #dbg_value(i32 %92, !531, !DIExpression(), !626)
    #dbg_value(i32 %92, !533, !DIExpression(), !637)
  %93 = getelementptr inbounds nuw i32, ptr %7, i32 %92, !dbg !630
  %94 = load i32, ptr %93, align 4, !dbg !630, !tbaa !285
    #dbg_value(i32 %94, !536, !DIExpression(), !637)
    #dbg_value(i32 %2, !537, !DIExpression(), !637)
    #dbg_value(i32 %3, !538, !DIExpression(), !637)
    #dbg_value(i32 %92, !539, !DIExpression(), !637)
  %95 = icmp ult i32 %92, %2, !dbg !631
  %96 = select i1 %95, i32 %3, i32 %41, !dbg !632
  %97 = add i32 %94, %96, !dbg !632
    #dbg_value(i32 %97, !540, !DIExpression(), !637)
  %98 = getelementptr inbounds nuw i32, ptr %38, i32 %92, !dbg !633
  store i32 %97, ptr %98, align 4, !dbg !634, !tbaa !285
  %99 = add nuw i32 %92, 1, !dbg !629
    #dbg_value(i32 %99, !531, !DIExpression(), !626)
    #dbg_value(i32 %99, !533, !DIExpression(), !637)
  %100 = getelementptr inbounds nuw i32, ptr %7, i32 %99, !dbg !630
  %101 = load i32, ptr %100, align 4, !dbg !630, !tbaa !285
    #dbg_value(i32 %101, !536, !DIExpression(), !637)
    #dbg_value(i32 %99, !539, !DIExpression(), !637)
  %102 = icmp ult i32 %99, %2, !dbg !631
  %103 = select i1 %102, i32 %3, i32 %41, !dbg !632
  %104 = add i32 %101, %103, !dbg !632
    #dbg_value(i32 %104, !540, !DIExpression(), !637)
  %105 = getelementptr inbounds nuw i32, ptr %38, i32 %99, !dbg !633
  store i32 %104, ptr %105, align 4, !dbg !634, !tbaa !285
  %106 = add nuw i32 %92, 2, !dbg !629
    #dbg_value(i32 %106, !531, !DIExpression(), !626)
  %107 = icmp eq i32 %106, %10, !dbg !627
  br i1 %107, label %84, label %91, !dbg !628, !llvm.loop !642

108:                                              ; preds = %84
  tail call void @llvm.trap(), !dbg !643
  unreachable, !dbg !645

109:                                              ; preds = %84
  %110 = add i32 %88, %10, !dbg !646
    #dbg_value(i32 %110, !548, !DIExpression(), !592)
    #dbg_value(i32 %110, !55, !DIExpression(), !647)
    #dbg_value(i32 4, !56, !DIExpression(), !647)
  %111 = icmp ugt i32 %110, 1073741823, !dbg !649
  %112 = load i32, ptr @ink_top, align 4
  %113 = icmp ugt i32 %112, -8
  %114 = select i1 %111, i1 true, i1 %113, !dbg !650
  br i1 %114, label %115, label %116, !dbg !650

115:                                              ; preds = %109
  tail call void @llvm.trap(), !dbg !651
  unreachable, !dbg !653

116:                                              ; preds = %109
  %117 = icmp eq i32 %112, 0, !dbg !654
  %118 = add nuw i32 %112, 7, !dbg !655
  %119 = select i1 %117, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %118, !dbg !656
  %120 = and i32 %119, -8, !dbg !657
    #dbg_value(i32 %119, !57, !DIExpression(DW_OP_constu, 18446744073709551608, DW_OP_and, DW_OP_stack_value), !647)
  %121 = tail call i32 @llvm.umax.i32(i32 %110, i32 1), !dbg !658
  %122 = shl nuw i32 %121, 2, !dbg !659
    #dbg_value(i32 %122, !58, !DIExpression(), !647)
  %123 = xor i32 %120, -1, !dbg !660
  %124 = icmp ugt i32 %122, %123, !dbg !661
  br i1 %124, label %125, label %126, !dbg !661

125:                                              ; preds = %116
  tail call void @llvm.trap(), !dbg !662
  unreachable, !dbg !664

126:                                              ; preds = %116
  %127 = add i32 %120, %122, !dbg !665
  store i32 %127, ptr @ink_top, align 4, !dbg !666, !tbaa !27
  %128 = add i32 %127, 65535, !dbg !667
  %129 = lshr i32 %128, 16, !dbg !668
    #dbg_value(i32 %129, !59, !DIExpression(), !647)
  %130 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !669
    #dbg_value(i32 %130, !60, !DIExpression(), !647)
  %131 = icmp ugt i32 %129, %130, !dbg !670
  br i1 %131, label %132, label %137, !dbg !671

132:                                              ; preds = %126
  %133 = sub nuw nsw i32 %129, %130, !dbg !672
  %134 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %133), !dbg !673
  %135 = icmp eq i32 %134, -1, !dbg !674
  br i1 %135, label %136, label %137, !dbg !671

136:                                              ; preds = %132
  tail call void @llvm.trap(), !dbg !675
  unreachable, !dbg !677

137:                                              ; preds = %126, %132
  %138 = inttoptr i32 %120 to ptr, !dbg !678
    #dbg_value(ptr %138, !549, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
    #dbg_value(i32 %110, !549, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
  %139 = shl nuw i32 %10, 2, !dbg !679
    #dbg_value(ptr %138, !110, !DIExpression(), !680)
    #dbg_value(ptr %38, !115, !DIExpression(), !680)
    #dbg_value(i32 %139, !116, !DIExpression(), !680)
    #dbg_value(ptr %138, !117, !DIExpression(), !680)
    #dbg_value(ptr %38, !119, !DIExpression(), !680)
    #dbg_value(i32 0, !122, !DIExpression(), !682)
  br i1 %39, label %177, label %140, !dbg !683

140:                                              ; preds = %137
  %141 = icmp ult i32 %10, 4, !dbg !683
  %142 = sub i32 %119, %20, !dbg !683
  %143 = icmp ult i32 %142, 16, !dbg !683
  %144 = or i1 %141, %143, !dbg !683
  br i1 %144, label %156, label %145, !dbg !683

145:                                              ; preds = %140
  %146 = and i32 %139, -16, !dbg !683
  br label %147, !dbg !683

147:                                              ; preds = %147, %145
  %148 = phi i32 [ 0, %145 ], [ %152, %147 ], !dbg !684
  %149 = getelementptr inbounds nuw i8, ptr %38, i32 %148, !dbg !685
  %150 = load <16 x i8>, ptr %149, align 8, !dbg !685, !tbaa !132
  %151 = getelementptr inbounds nuw i8, ptr %138, i32 %148, !dbg !686
  store <16 x i8> %150, ptr %151, align 8, !dbg !687, !tbaa !132
  %152 = add nuw i32 %148, 16, !dbg !684
  %153 = icmp eq i32 %152, %146, !dbg !684
  br i1 %153, label %154, label %147, !dbg !684, !llvm.loop !688

154:                                              ; preds = %147
  %155 = icmp eq i32 %139, %146, !dbg !683
  br i1 %155, label %177, label %156, !dbg !683

156:                                              ; preds = %140, %154
  %157 = phi i32 [ 0, %140 ], [ %146, %154 ]
  br label %158, !dbg !683

158:                                              ; preds = %158, %156
  %159 = phi i32 [ %157, %156 ], [ %175, %158 ]
    #dbg_value(i32 %159, !122, !DIExpression(), !682)
  %160 = getelementptr inbounds nuw i8, ptr %38, i32 %159, !dbg !685
  %161 = load i8, ptr %160, align 4, !dbg !685, !tbaa !132
  %162 = getelementptr inbounds nuw i8, ptr %138, i32 %159, !dbg !686
  store i8 %161, ptr %162, align 4, !dbg !687, !tbaa !132
  %163 = or disjoint i32 %159, 1, !dbg !684
    #dbg_value(i32 %163, !122, !DIExpression(), !682)
  %164 = getelementptr inbounds nuw i8, ptr %38, i32 %163, !dbg !685
  %165 = load i8, ptr %164, align 1, !dbg !685, !tbaa !132
  %166 = getelementptr inbounds nuw i8, ptr %138, i32 %163, !dbg !686
  store i8 %165, ptr %166, align 1, !dbg !687, !tbaa !132
  %167 = or disjoint i32 %159, 2, !dbg !684
    #dbg_value(i32 %167, !122, !DIExpression(), !682)
  %168 = getelementptr inbounds nuw i8, ptr %38, i32 %167, !dbg !685
  %169 = load i8, ptr %168, align 2, !dbg !685, !tbaa !132
  %170 = getelementptr inbounds nuw i8, ptr %138, i32 %167, !dbg !686
  store i8 %169, ptr %170, align 2, !dbg !687, !tbaa !132
  %171 = or disjoint i32 %159, 3, !dbg !684
    #dbg_value(i32 %171, !122, !DIExpression(), !682)
  %172 = getelementptr inbounds nuw i8, ptr %38, i32 %171, !dbg !685
  %173 = load i8, ptr %172, align 1, !dbg !685, !tbaa !132
  %174 = getelementptr inbounds nuw i8, ptr %138, i32 %171, !dbg !686
  store i8 %173, ptr %174, align 1, !dbg !687, !tbaa !132
  %175 = add nuw i32 %159, 4, !dbg !684
    #dbg_value(i32 %175, !122, !DIExpression(), !682)
  %176 = icmp eq i32 %175, %139, !dbg !690
  br i1 %176, label %177, label %158, !dbg !683, !llvm.loop !691

177:                                              ; preds = %158, %154, %137
  %178 = getelementptr inbounds nuw i32, ptr %138, i32 %10, !dbg !692
  %179 = shl i32 %88, 2, !dbg !693
    #dbg_value(ptr %178, !110, !DIExpression(), !694)
    #dbg_value(ptr %85, !115, !DIExpression(), !694)
    #dbg_value(i32 %179, !116, !DIExpression(), !694)
    #dbg_value(ptr %178, !117, !DIExpression(), !694)
    #dbg_value(ptr %85, !119, !DIExpression(), !694)
    #dbg_value(i32 0, !122, !DIExpression(), !696)
  %180 = icmp eq i32 %179, 0, !dbg !697
  br i1 %180, label %219, label %181, !dbg !698

181:                                              ; preds = %177
  %182 = icmp ult i32 %179, 16, !dbg !698
  br i1 %182, label %198, label %183, !dbg !698

183:                                              ; preds = %181
  %184 = add i32 %120, %139, !dbg !698
  %185 = sub i32 %184, %86, !dbg !698
  %186 = icmp ult i32 %185, 16, !dbg !698
  br i1 %186, label %198, label %187, !dbg !698

187:                                              ; preds = %183
  %188 = and i32 %179, -16, !dbg !698
  br label %189, !dbg !698

189:                                              ; preds = %189, %187
  %190 = phi i32 [ 0, %187 ], [ %194, %189 ], !dbg !699
  %191 = getelementptr inbounds nuw i8, ptr %85, i32 %190, !dbg !700
  %192 = load <16 x i8>, ptr %191, align 1, !dbg !700, !tbaa !132
  %193 = getelementptr inbounds nuw i8, ptr %178, i32 %190, !dbg !701
  store <16 x i8> %192, ptr %193, align 4, !dbg !702, !tbaa !132
  %194 = add nuw i32 %190, 16, !dbg !699
  %195 = icmp eq i32 %194, %188, !dbg !699
  br i1 %195, label %196, label %189, !dbg !699, !llvm.loop !703

196:                                              ; preds = %189
  %197 = icmp eq i32 %179, %188, !dbg !698
  br i1 %197, label %219, label %198, !dbg !698

198:                                              ; preds = %183, %181, %196
  %199 = phi i32 [ 0, %181 ], [ 0, %183 ], [ %188, %196 ]
  br label %200, !dbg !698

200:                                              ; preds = %200, %198
  %201 = phi i32 [ %199, %198 ], [ %217, %200 ]
    #dbg_value(i32 %201, !122, !DIExpression(), !696)
  %202 = getelementptr inbounds nuw i8, ptr %85, i32 %201, !dbg !700
  %203 = load i8, ptr %202, align 1, !dbg !700, !tbaa !132
  %204 = getelementptr inbounds nuw i8, ptr %178, i32 %201, !dbg !701
  store i8 %203, ptr %204, align 4, !dbg !702, !tbaa !132
  %205 = or disjoint i32 %201, 1, !dbg !699
    #dbg_value(i32 %205, !122, !DIExpression(), !696)
  %206 = getelementptr inbounds nuw i8, ptr %85, i32 %205, !dbg !700
  %207 = load i8, ptr %206, align 1, !dbg !700, !tbaa !132
  %208 = getelementptr inbounds nuw i8, ptr %178, i32 %205, !dbg !701
  store i8 %207, ptr %208, align 1, !dbg !702, !tbaa !132
  %209 = or disjoint i32 %201, 2, !dbg !699
    #dbg_value(i32 %209, !122, !DIExpression(), !696)
  %210 = getelementptr inbounds nuw i8, ptr %85, i32 %209, !dbg !700
  %211 = load i8, ptr %210, align 1, !dbg !700, !tbaa !132
  %212 = getelementptr inbounds nuw i8, ptr %178, i32 %209, !dbg !701
  store i8 %211, ptr %212, align 2, !dbg !702, !tbaa !132
  %213 = or disjoint i32 %201, 3, !dbg !699
    #dbg_value(i32 %213, !122, !DIExpression(), !696)
  %214 = getelementptr inbounds nuw i8, ptr %85, i32 %213, !dbg !700
  %215 = load i8, ptr %214, align 1, !dbg !700, !tbaa !132
  %216 = getelementptr inbounds nuw i8, ptr %178, i32 %213, !dbg !701
  store i8 %215, ptr %216, align 1, !dbg !702, !tbaa !132
  %217 = add nuw i32 %201, 4, !dbg !699
    #dbg_value(i32 %217, !122, !DIExpression(), !696)
  %218 = icmp eq i32 %217, %179, !dbg !697
  br i1 %218, label %219, label %200, !dbg !698, !llvm.loop !705

219:                                              ; preds = %200, %196, %177
    #dbg_value(ptr %138, !550, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
    #dbg_value(i32 %110, !550, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
    #dbg_value(ptr %7, !551, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
    #dbg_value(i32 %10, !551, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
    #dbg_value(i32 %10, !55, !DIExpression(), !706)
    #dbg_value(i32 4, !56, !DIExpression(), !706)
  %220 = load i32, ptr @ink_top, align 4
  %221 = icmp ugt i32 %220, -8
  br i1 %221, label %222, label %223, !dbg !708

222:                                              ; preds = %219
  tail call void @llvm.trap(), !dbg !709
  unreachable, !dbg !711

223:                                              ; preds = %219
  %224 = icmp eq i32 %220, 0, !dbg !712
  %225 = add nuw i32 %220, 7, !dbg !713
  %226 = select i1 %224, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %225, !dbg !714
  %227 = and i32 %226, -8, !dbg !715
    #dbg_value(i32 %227, !57, !DIExpression(), !706)
    #dbg_value(i32 %22, !58, !DIExpression(), !706)
  %228 = xor i32 %227, -1, !dbg !716
  %229 = icmp ugt i32 %22, %228, !dbg !717
  br i1 %229, label %230, label %231, !dbg !717

230:                                              ; preds = %223
  tail call void @llvm.trap(), !dbg !718
  unreachable, !dbg !720

231:                                              ; preds = %223
  %232 = add i32 %227, %22, !dbg !721
  store i32 %232, ptr @ink_top, align 4, !dbg !722, !tbaa !27
  %233 = add i32 %232, 65535, !dbg !723
  %234 = lshr i32 %233, 16, !dbg !724
    #dbg_value(i32 %234, !59, !DIExpression(), !706)
  %235 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !725
    #dbg_value(i32 %235, !60, !DIExpression(), !706)
  %236 = icmp ugt i32 %234, %235, !dbg !726
  br i1 %236, label %237, label %242, !dbg !727

237:                                              ; preds = %231
  %238 = sub nuw nsw i32 %234, %235, !dbg !728
  %239 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %238), !dbg !729
  %240 = icmp eq i32 %239, -1, !dbg !730
  br i1 %240, label %241, label %242, !dbg !727

241:                                              ; preds = %237
  tail call void @llvm.trap(), !dbg !731
  unreachable, !dbg !733

242:                                              ; preds = %231, %237
  %243 = inttoptr i32 %227 to ptr, !dbg !734
    #dbg_value(ptr %243, !552, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
    #dbg_value(i32 %10, !552, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
    #dbg_value(i32 0, !553, !DIExpression(), !735)
  br i1 %39, label %289, label %244, !dbg !736

244:                                              ; preds = %242
  %245 = icmp ult i32 %10, 4, !dbg !736
  %246 = sub i32 %227, %8, !dbg !736
  %247 = icmp ult i32 %246, 16, !dbg !736
  %248 = select i1 %245, i1 true, i1 %247, !dbg !736
  br i1 %248, label %271, label %249, !dbg !736

249:                                              ; preds = %244
  %250 = and i32 %10, 1073741820, !dbg !736
  %251 = insertelement <4 x i32> poison, i32 %3, i64 0, !dbg !736
  %252 = shufflevector <4 x i32> %251, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !736
  %253 = insertelement <4 x i32> poison, i32 %2, i64 0, !dbg !736
  %254 = shufflevector <4 x i32> %253, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !736
  br label %255, !dbg !736

255:                                              ; preds = %255, %249
  %256 = phi i32 [ 0, %249 ], [ %266, %255 ], !dbg !737
  %257 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %249 ], [ %267, %255 ]
  %258 = getelementptr inbounds nuw i32, ptr %7, i32 %256, !dbg !738
  %259 = load <4 x i32>, ptr %258, align 4, !dbg !738, !tbaa !285
  %260 = urem <4 x i32> %257, splat (i32 3), !dbg !739
  %261 = icmp eq <4 x i32> %260, zeroinitializer, !dbg !742
  %262 = mul <4 x i32> %259, %252, !dbg !743
  %263 = add <4 x i32> %259, %254, !dbg !743
  %264 = select <4 x i1> %261, <4 x i32> %262, <4 x i32> %263, !dbg !743
  %265 = getelementptr inbounds nuw i32, ptr %243, i32 %256, !dbg !744
  store <4 x i32> %264, ptr %265, align 8, !dbg !745, !tbaa !285
  %266 = add nuw i32 %256, 4, !dbg !737
  %267 = add <4 x i32> %257, splat (i32 4)
  %268 = icmp eq i32 %266, %250, !dbg !737
  br i1 %268, label %269, label %255, !dbg !737, !llvm.loop !746

269:                                              ; preds = %255
  %270 = icmp eq i32 %10, %250, !dbg !736
  br i1 %270, label %289, label %271, !dbg !736

271:                                              ; preds = %244, %269
  %272 = phi i32 [ 0, %244 ], [ %250, %269 ]
  %273 = or disjoint i32 %272, 1, !dbg !736
  %274 = and i32 %10, 1, !dbg !736
  %275 = icmp eq i32 %274, 0, !dbg !736
  br i1 %275, label %286, label %276, !dbg !736

276:                                              ; preds = %271
    #dbg_value(i32 poison, !553, !DIExpression(), !735)
    #dbg_value(i32 poison, !555, !DIExpression(), !748)
  %277 = getelementptr inbounds nuw i32, ptr %7, i32 %272, !dbg !738
  %278 = load i32, ptr %277, align 4, !dbg !738, !tbaa !285
    #dbg_value(i32 %278, !558, !DIExpression(), !748)
    #dbg_value(i32 %2, !559, !DIExpression(), !748)
    #dbg_value(i32 %3, !560, !DIExpression(), !748)
    #dbg_value(i32 poison, !561, !DIExpression(), !748)
    #dbg_value(i32 3, !562, !DIExpression(), !748)
    #dbg_value(i32 poison, !563, !DIExpression(), !748)
  %279 = urem i32 %272, 3, !dbg !739
    #dbg_value(i32 %279, !563, !DIExpression(), !748)
    #dbg_value(i32 %279, !564, !DIExpression(), !748)
  %280 = icmp eq i32 %279, 0, !dbg !742
  %281 = mul i32 %278, %3, !dbg !743
  %282 = add i32 %278, %2, !dbg !743
  %283 = select i1 %280, i32 %281, i32 %282, !dbg !743
    #dbg_value(i32 %283, !565, !DIExpression(), !748)
  %284 = getelementptr inbounds nuw i32, ptr %243, i32 %272, !dbg !744
  store i32 %283, ptr %284, align 8, !dbg !745, !tbaa !285
  %285 = or disjoint i32 %272, 1, !dbg !737
    #dbg_value(i32 %285, !553, !DIExpression(), !735)
  br label %286, !dbg !736

286:                                              ; preds = %276, %271
  %287 = phi i32 [ %272, %271 ], [ %285, %276 ]
  %288 = icmp eq i32 %10, %273, !dbg !736
  br i1 %288, label %289, label %344, !dbg !736

289:                                              ; preds = %286, %344, %269, %242
    #dbg_value(ptr %243, !571, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
    #dbg_value(i32 %10, !571, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
    #dbg_value(ptr %4, !572, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
  %290 = tail call i32 @llvm.umin.i32(i32 %110, i32 %10), !dbg !749
    #dbg_value(i32 %290, !572, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
    #dbg_value(i32 0, !573, !DIExpression(), !750)
  %291 = icmp eq i32 %290, 0, !dbg !751
  br i1 %291, label %365, label %292, !dbg !752

292:                                              ; preds = %289
  %293 = icmp ult i32 %290, 4, !dbg !752
  br i1 %293, label %323, label %294, !dbg !752

294:                                              ; preds = %292
  %295 = sub i32 %6, %120, !dbg !752
  %296 = icmp ult i32 %295, 16, !dbg !752
  %297 = sub i32 %6, %227, !dbg !752
  %298 = icmp ult i32 %297, 16, !dbg !752
  %299 = or i1 %296, %298, !dbg !752
  br i1 %299, label %323, label %300, !dbg !752

300:                                              ; preds = %294
  %301 = and i32 %290, 1073741820, !dbg !752
  %302 = insertelement <4 x i32> poison, i32 %3, i64 0, !dbg !752
  %303 = shufflevector <4 x i32> %302, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !752
  %304 = insertelement <4 x i32> poison, i32 %2, i64 0, !dbg !752
  %305 = shufflevector <4 x i32> %304, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !752
  br label %306, !dbg !752

306:                                              ; preds = %306, %300
  %307 = phi i32 [ 0, %300 ], [ %319, %306 ], !dbg !753
  %308 = getelementptr inbounds nuw i32, ptr %138, i32 %307, !dbg !754
  %309 = load <4 x i32>, ptr %308, align 8, !dbg !754, !tbaa !285
  %310 = getelementptr inbounds nuw i32, ptr %243, i32 %307, !dbg !755
  %311 = load <4 x i32>, ptr %310, align 8, !dbg !755, !tbaa !285
  %312 = icmp ult <4 x i32> %309, %311, !dbg !756
  %313 = mul <4 x i32> %311, %303, !dbg !757
  %314 = add <4 x i32> %313, %309, !dbg !757
  %315 = add <4 x i32> %309, %305, !dbg !757
  %316 = sub <4 x i32> %315, %311, !dbg !757
  %317 = select <4 x i1> %312, <4 x i32> %314, <4 x i32> %316, !dbg !757
  %318 = getelementptr inbounds nuw i32, ptr %4, i32 %307, !dbg !758
  store <4 x i32> %317, ptr %318, align 4, !dbg !759, !tbaa !285
  %319 = add nuw i32 %307, 4, !dbg !753
  %320 = icmp eq i32 %319, %301, !dbg !753
  br i1 %320, label %321, label %306, !dbg !753, !llvm.loop !760

321:                                              ; preds = %306
  %322 = icmp eq i32 %290, %301, !dbg !752
  br i1 %322, label %365, label %323, !dbg !752

323:                                              ; preds = %294, %292, %321
  %324 = phi i32 [ 0, %292 ], [ 0, %294 ], [ %301, %321 ]
  %325 = or disjoint i32 %324, 1, !dbg !752
  %326 = and i32 %290, 1, !dbg !752
  %327 = icmp eq i32 %326, 0, !dbg !752
  br i1 %327, label %341, label %328, !dbg !752

328:                                              ; preds = %323
    #dbg_value(i32 poison, !573, !DIExpression(), !750)
  %329 = getelementptr inbounds nuw i32, ptr %138, i32 %324, !dbg !754
  %330 = load i32, ptr %329, align 8, !dbg !754, !tbaa !285
    #dbg_value(i32 %330, !575, !DIExpression(), !762)
  %331 = getelementptr inbounds nuw i32, ptr %243, i32 %324, !dbg !755
  %332 = load i32, ptr %331, align 8, !dbg !755, !tbaa !285
    #dbg_value(i32 %332, !578, !DIExpression(), !762)
    #dbg_value(i32 %2, !579, !DIExpression(), !762)
    #dbg_value(i32 %3, !580, !DIExpression(), !762)
    #dbg_value(i32 %330, !581, !DIExpression(), !762)
  %333 = icmp ult i32 %330, %332, !dbg !756
  %334 = mul i32 %332, %3, !dbg !757
  %335 = add i32 %334, %330, !dbg !757
  %336 = add i32 %330, %2, !dbg !757
  %337 = sub i32 %336, %332, !dbg !757
  %338 = select i1 %333, i32 %335, i32 %337, !dbg !757
    #dbg_value(i32 %338, !582, !DIExpression(), !762)
  %339 = getelementptr inbounds nuw i32, ptr %4, i32 %324, !dbg !758
  store i32 %338, ptr %339, align 4, !dbg !759, !tbaa !285
  %340 = or disjoint i32 %324, 1, !dbg !753
    #dbg_value(i32 %340, !573, !DIExpression(), !750)
  br label %341, !dbg !752

341:                                              ; preds = %328, %323
  %342 = phi i32 [ %324, %323 ], [ %340, %328 ]
  %343 = icmp eq i32 %290, %325, !dbg !752
  br i1 %343, label %365, label %366, !dbg !752

344:                                              ; preds = %286, %344
  %345 = phi i32 [ %363, %344 ], [ %287, %286 ]
    #dbg_value(i32 %345, !553, !DIExpression(), !735)
    #dbg_value(i32 %345, !555, !DIExpression(), !748)
  %346 = getelementptr inbounds nuw i32, ptr %7, i32 %345, !dbg !738
  %347 = load i32, ptr %346, align 4, !dbg !738, !tbaa !285
    #dbg_value(i32 %347, !558, !DIExpression(), !748)
    #dbg_value(i32 %2, !559, !DIExpression(), !748)
    #dbg_value(i32 %3, !560, !DIExpression(), !748)
    #dbg_value(i32 %345, !561, !DIExpression(), !748)
    #dbg_value(i32 3, !562, !DIExpression(), !748)
    #dbg_value(i32 poison, !563, !DIExpression(), !748)
  %348 = urem i32 %345, 3, !dbg !739
    #dbg_value(i32 %348, !563, !DIExpression(), !748)
    #dbg_value(i32 %348, !564, !DIExpression(), !748)
  %349 = icmp eq i32 %348, 0, !dbg !742
  %350 = mul i32 %347, %3, !dbg !743
  %351 = add i32 %347, %2, !dbg !743
  %352 = select i1 %349, i32 %350, i32 %351, !dbg !743
    #dbg_value(i32 %352, !565, !DIExpression(), !748)
  %353 = getelementptr inbounds nuw i32, ptr %243, i32 %345, !dbg !744
  store i32 %352, ptr %353, align 4, !dbg !745, !tbaa !285
  %354 = add nuw i32 %345, 1, !dbg !737
    #dbg_value(i32 %354, !553, !DIExpression(), !735)
    #dbg_value(i32 %354, !555, !DIExpression(), !748)
  %355 = getelementptr inbounds nuw i32, ptr %7, i32 %354, !dbg !738
  %356 = load i32, ptr %355, align 4, !dbg !738, !tbaa !285
    #dbg_value(i32 %356, !558, !DIExpression(), !748)
    #dbg_value(i32 %354, !561, !DIExpression(), !748)
    #dbg_value(i32 poison, !563, !DIExpression(), !748)
  %357 = urem i32 %354, 3, !dbg !739
    #dbg_value(i32 %357, !563, !DIExpression(), !748)
    #dbg_value(i32 %357, !564, !DIExpression(), !748)
  %358 = icmp eq i32 %357, 0, !dbg !742
  %359 = mul i32 %356, %3, !dbg !743
  %360 = add i32 %356, %2, !dbg !743
  %361 = select i1 %358, i32 %359, i32 %360, !dbg !743
    #dbg_value(i32 %361, !565, !DIExpression(), !748)
  %362 = getelementptr inbounds nuw i32, ptr %243, i32 %354, !dbg !744
  store i32 %361, ptr %362, align 4, !dbg !745, !tbaa !285
  %363 = add nuw i32 %345, 2, !dbg !737
    #dbg_value(i32 %363, !553, !DIExpression(), !735)
  %364 = icmp eq i32 %363, %10, !dbg !763
  br i1 %364, label %289, label %344, !dbg !736, !llvm.loop !764

365:                                              ; preds = %341, %366, %321, %289
  ret i32 %290, !dbg !765

366:                                              ; preds = %341, %366
  %367 = phi i32 [ %391, %366 ], [ %342, %341 ]
    #dbg_value(i32 %367, !573, !DIExpression(), !750)
  %368 = getelementptr inbounds nuw i32, ptr %138, i32 %367, !dbg !754
  %369 = load i32, ptr %368, align 4, !dbg !754, !tbaa !285
    #dbg_value(i32 %369, !575, !DIExpression(), !762)
  %370 = getelementptr inbounds nuw i32, ptr %243, i32 %367, !dbg !755
  %371 = load i32, ptr %370, align 4, !dbg !755, !tbaa !285
    #dbg_value(i32 %371, !578, !DIExpression(), !762)
    #dbg_value(i32 %2, !579, !DIExpression(), !762)
    #dbg_value(i32 %3, !580, !DIExpression(), !762)
    #dbg_value(i32 %369, !581, !DIExpression(), !762)
  %372 = icmp ult i32 %369, %371, !dbg !756
  %373 = mul i32 %371, %3, !dbg !757
  %374 = add i32 %373, %369, !dbg !757
  %375 = add i32 %369, %2, !dbg !757
  %376 = sub i32 %375, %371, !dbg !757
  %377 = select i1 %372, i32 %374, i32 %376, !dbg !757
    #dbg_value(i32 %377, !582, !DIExpression(), !762)
  %378 = getelementptr inbounds nuw i32, ptr %4, i32 %367, !dbg !758
  store i32 %377, ptr %378, align 4, !dbg !759, !tbaa !285
  %379 = add nuw i32 %367, 1, !dbg !753
    #dbg_value(i32 %379, !573, !DIExpression(), !750)
  %380 = getelementptr inbounds nuw i32, ptr %138, i32 %379, !dbg !754
  %381 = load i32, ptr %380, align 4, !dbg !754, !tbaa !285
    #dbg_value(i32 %381, !575, !DIExpression(), !762)
  %382 = getelementptr inbounds nuw i32, ptr %243, i32 %379, !dbg !755
  %383 = load i32, ptr %382, align 4, !dbg !755, !tbaa !285
    #dbg_value(i32 %383, !578, !DIExpression(), !762)
    #dbg_value(i32 %381, !581, !DIExpression(), !762)
  %384 = icmp ult i32 %381, %383, !dbg !756
  %385 = mul i32 %383, %3, !dbg !757
  %386 = add i32 %385, %381, !dbg !757
  %387 = add i32 %381, %2, !dbg !757
  %388 = sub i32 %387, %383, !dbg !757
  %389 = select i1 %384, i32 %386, i32 %388, !dbg !757
    #dbg_value(i32 %389, !582, !DIExpression(), !762)
  %390 = getelementptr inbounds nuw i32, ptr %4, i32 %379, !dbg !758
  store i32 %389, ptr %390, align 4, !dbg !759, !tbaa !285
  %391 = add nuw i32 %367, 2, !dbg !753
    #dbg_value(i32 %391, !573, !DIExpression(), !750)
  %392 = icmp eq i32 %391, %290, !dbg !751
  br i1 %392, label %365, label %366, !dbg !752, !llvm.loop !766
}

; Function Attrs: nounwind uwtable
define hidden i32 @ink_compute_into(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readonly %2, ptr nocapture noundef writeonly %3) local_unnamed_addr #2 !dbg !767 {
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
  %5 = alloca %struct.ink_l_uint32, align 4
  %6 = alloca %struct.ink_l_uint32, align 4
    #dbg_value(i32 %0, !775, !DIExpression(), !789)
    #dbg_value(ptr %1, !776, !DIExpression(), !789)
    #dbg_value(ptr %2, !777, !DIExpression(), !789)
    #dbg_value(ptr %3, !778, !DIExpression(), !789)
  %7 = icmp eq i32 %0, 0, !dbg !790
  br i1 %7, label %8, label %56, !dbg !790

8:                                                ; preds = %4
  %9 = load ptr, ptr %1, align 4, !dbg !791, !tbaa !792
    #dbg_value(ptr %9, !779, !DIExpression(), !793)
  %10 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !794
  %11 = load ptr, ptr %10, align 4, !dbg !794, !tbaa !792
    #dbg_value(ptr %11, !782, !DIExpression(), !793)
  %12 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !795
  %13 = load ptr, ptr %12, align 4, !dbg !795, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !785)
    #dbg_value(ptr %13, !115, !DIExpression(), !785)
    #dbg_value(i32 4, !116, !DIExpression(), !785)
    #dbg_value(ptr undef, !117, !DIExpression(), !785)
    #dbg_value(ptr %13, !119, !DIExpression(), !785)
    #dbg_value(i32 0, !122, !DIExpression(), !796)
  %14 = load i8, ptr %13, align 1, !dbg !797, !tbaa !132
    #dbg_value(i8 %14, !783, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !793)
    #dbg_value(i32 1, !122, !DIExpression(), !796)
  %15 = getelementptr inbounds nuw i8, ptr %13, i32 1, !dbg !797
  %16 = load i8, ptr %15, align 1, !dbg !797, !tbaa !132
    #dbg_value(i8 %16, !783, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !793)
    #dbg_value(i32 2, !122, !DIExpression(), !796)
  %17 = getelementptr inbounds nuw i8, ptr %13, i32 2, !dbg !797
  %18 = load i8, ptr %17, align 1, !dbg !797, !tbaa !132
    #dbg_value(i8 %18, !783, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !793)
    #dbg_value(i32 3, !122, !DIExpression(), !796)
  %19 = getelementptr inbounds nuw i8, ptr %13, i32 3, !dbg !797
  %20 = load i8, ptr %19, align 1, !dbg !797, !tbaa !132
    #dbg_value(i8 %20, !783, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !793)
    #dbg_value(i32 4, !122, !DIExpression(), !796)
  %21 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !798
  %22 = load ptr, ptr %21, align 4, !dbg !798, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !787)
    #dbg_value(ptr %22, !115, !DIExpression(), !787)
    #dbg_value(i32 4, !116, !DIExpression(), !787)
    #dbg_value(ptr undef, !117, !DIExpression(), !787)
    #dbg_value(ptr %22, !119, !DIExpression(), !787)
    #dbg_value(i32 0, !122, !DIExpression(), !799)
  %23 = load i8, ptr %22, align 1, !dbg !800, !tbaa !132
    #dbg_value(i8 %23, !784, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !793)
    #dbg_value(i32 1, !122, !DIExpression(), !799)
  %24 = getelementptr inbounds nuw i8, ptr %22, i32 1, !dbg !800
  %25 = load i8, ptr %24, align 1, !dbg !800, !tbaa !132
    #dbg_value(i8 %25, !784, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !793)
    #dbg_value(i32 2, !122, !DIExpression(), !799)
  %26 = getelementptr inbounds nuw i8, ptr %22, i32 2, !dbg !800
  %27 = load i8, ptr %26, align 1, !dbg !800, !tbaa !132
    #dbg_value(i8 %27, !784, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !793)
    #dbg_value(i32 3, !122, !DIExpression(), !799)
  %28 = getelementptr inbounds nuw i8, ptr %22, i32 3, !dbg !800
  %29 = load i8, ptr %28, align 1, !dbg !800, !tbaa !132
    #dbg_value(i8 %29, !784, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !793)
    #dbg_value(i32 4, !122, !DIExpression(), !799)
  store ptr %9, ptr %5, align 4, !dbg !801, !tbaa !439
  %30 = getelementptr inbounds nuw i8, ptr %5, i32 4, !dbg !801
  %31 = load i32, ptr %2, align 4, !dbg !802, !tbaa !27
  store i32 %31, ptr %30, align 4, !dbg !801, !tbaa !441
  store ptr %11, ptr %6, align 4, !dbg !803, !tbaa !439
  %32 = getelementptr inbounds nuw i8, ptr %6, i32 4, !dbg !803
  %33 = getelementptr inbounds nuw i8, ptr %2, i32 4, !dbg !804
  %34 = load i32, ptr %33, align 4, !dbg !804, !tbaa !27
  store i32 %34, ptr %32, align 4, !dbg !803, !tbaa !441
  %35 = zext i8 %20 to i32, !dbg !805
  %36 = shl nuw i32 %35, 24, !dbg !805
  %37 = zext i8 %18 to i32, !dbg !805
  %38 = shl nuw nsw i32 %37, 16, !dbg !805
  %39 = or disjoint i32 %36, %38, !dbg !805
  %40 = zext i8 %16 to i32, !dbg !805
  %41 = shl nuw nsw i32 %40, 8, !dbg !805
  %42 = or disjoint i32 %39, %41, !dbg !805
  %43 = zext i8 %14 to i32, !dbg !805
  %44 = or disjoint i32 %42, %43, !dbg !805
  %45 = zext i8 %29 to i32, !dbg !806
  %46 = shl nuw i32 %45, 24, !dbg !806
  %47 = zext i8 %27 to i32, !dbg !806
  %48 = shl nuw nsw i32 %47, 16, !dbg !806
  %49 = or disjoint i32 %46, %48, !dbg !806
  %50 = zext i8 %25 to i32, !dbg !806
  %51 = shl nuw nsw i32 %50, 8, !dbg !806
  %52 = or disjoint i32 %49, %51, !dbg !806
  %53 = zext i8 %23 to i32, !dbg !806
  %54 = or disjoint i32 %52, %53, !dbg !806
  %55 = tail call i32 @lang_fn_pipeline38_left_padded_zip_u32_into(ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %5, ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %6, i32 noundef %44, i32 noundef %54, ptr noundef %3) #13, !dbg !806
  ret i32 %55, !dbg !807

56:                                               ; preds = %4
  tail call void @llvm.trap(), !dbg !808
  unreachable, !dbg !810
}

; Function Attrs: nounwind uwtable
define hidden void @ink_compute_call(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readonly %2, ptr nocapture noundef writeonly %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #2 !dbg !811 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !850)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !850)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !850)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !850)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !850)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !850)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !850)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !850)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !852)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !852)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !852)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !852)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !852)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !852)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !852)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !852)
  %6 = alloca %struct.ink_l_uint32, align 4, !DIAssignID !854
    #dbg_assign(i1 undef, !828, !DIExpression(), !854, ptr %6, !DIExpression(), !855)
  %7 = alloca %struct.ink_l_uint32, align 4
  %8 = alloca %struct.ink_l_uint32, align 4
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !856)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !856)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !856)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !856)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !856)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !856)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !856)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !856)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !858)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !858)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !858)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !858)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !858)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !858)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !858)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !858)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !860)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !860)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !860)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !860)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !860)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !860)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !860)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !860)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !862)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !862)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !862)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !862)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !862)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !862)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !862)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !862)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !864)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !864)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !864)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !864)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !864)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !864)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !864)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !864)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !866)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !866)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !866)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !866)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !866)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !866)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !866)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !866)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !868)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !868)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !868)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !868)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !868)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !868)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !868)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !868)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !870)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !870)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !870)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !870)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !870)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !870)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !870)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !870)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !872)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !872)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !872)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !872)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !872)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !872)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !872)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !872)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !874)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !874)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !874)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !874)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !874)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !874)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !874)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !874)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !876)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !876)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !876)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !876)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !876)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !876)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !876)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !876)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !878)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !878)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !878)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !878)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !878)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !878)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !878)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !878)
    #dbg_value(i32 %0, !817, !DIExpression(), !880)
    #dbg_value(ptr %1, !818, !DIExpression(), !880)
    #dbg_value(ptr %2, !819, !DIExpression(), !880)
    #dbg_value(ptr %3, !820, !DIExpression(), !880)
    #dbg_value(ptr %4, !821, !DIExpression(), !880)
  switch i32 %0, label %362 [
    i32 0, label %9
    i32 1, label %59
    i32 2, label %159
    i32 3, label %260
  ], !dbg !881

9:                                                ; preds = %5
  %10 = load ptr, ptr %1, align 4, !dbg !882, !tbaa !792
    #dbg_value(ptr %10, !822, !DIExpression(), !855)
  %11 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !883
  %12 = load ptr, ptr %11, align 4, !dbg !883, !tbaa !792
    #dbg_value(ptr %12, !825, !DIExpression(), !855)
  %13 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !884
  %14 = load ptr, ptr %13, align 4, !dbg !884, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !850)
    #dbg_value(ptr %14, !115, !DIExpression(), !850)
    #dbg_value(i32 4, !116, !DIExpression(), !850)
    #dbg_value(ptr undef, !117, !DIExpression(), !850)
    #dbg_value(ptr %14, !119, !DIExpression(), !850)
    #dbg_value(i32 0, !122, !DIExpression(), !885)
  %15 = load i8, ptr %14, align 1, !dbg !886, !tbaa !132
    #dbg_value(i8 %15, !826, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !855)
    #dbg_value(i32 1, !122, !DIExpression(), !885)
  %16 = getelementptr inbounds nuw i8, ptr %14, i32 1, !dbg !886
  %17 = load i8, ptr %16, align 1, !dbg !886, !tbaa !132
    #dbg_value(i8 %17, !826, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !855)
    #dbg_value(i32 2, !122, !DIExpression(), !885)
  %18 = getelementptr inbounds nuw i8, ptr %14, i32 2, !dbg !886
  %19 = load i8, ptr %18, align 1, !dbg !886, !tbaa !132
    #dbg_value(i8 %19, !826, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !855)
    #dbg_value(i32 3, !122, !DIExpression(), !885)
  %20 = getelementptr inbounds nuw i8, ptr %14, i32 3, !dbg !886
  %21 = load i8, ptr %20, align 1, !dbg !886, !tbaa !132
    #dbg_value(i8 %21, !826, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !855)
    #dbg_value(i32 4, !122, !DIExpression(), !885)
  %22 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !887
  %23 = load ptr, ptr %22, align 4, !dbg !887, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !852)
    #dbg_value(ptr %23, !115, !DIExpression(), !852)
    #dbg_value(i32 4, !116, !DIExpression(), !852)
    #dbg_value(ptr undef, !117, !DIExpression(), !852)
    #dbg_value(ptr %23, !119, !DIExpression(), !852)
    #dbg_value(i32 0, !122, !DIExpression(), !888)
  %24 = load i8, ptr %23, align 1, !dbg !889, !tbaa !132
    #dbg_value(i8 %24, !827, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !855)
    #dbg_value(i32 1, !122, !DIExpression(), !888)
  %25 = getelementptr inbounds nuw i8, ptr %23, i32 1, !dbg !889
  %26 = load i8, ptr %25, align 1, !dbg !889, !tbaa !132
    #dbg_value(i8 %26, !827, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !855)
    #dbg_value(i32 2, !122, !DIExpression(), !888)
  %27 = getelementptr inbounds nuw i8, ptr %23, i32 2, !dbg !889
  %28 = load i8, ptr %27, align 1, !dbg !889, !tbaa !132
    #dbg_value(i8 %28, !827, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !855)
    #dbg_value(i32 3, !122, !DIExpression(), !888)
  %29 = getelementptr inbounds nuw i8, ptr %23, i32 3, !dbg !889
  %30 = load i8, ptr %29, align 1, !dbg !889, !tbaa !132
    #dbg_value(i8 %30, !827, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !855)
    #dbg_value(i32 4, !122, !DIExpression(), !888)
  call void @llvm.lifetime.start.p0(i64 8, ptr nonnull %6) #14, !dbg !890
  store ptr %10, ptr %7, align 4, !dbg !891, !tbaa !439
  %31 = getelementptr inbounds nuw i8, ptr %7, i32 4, !dbg !891
  %32 = load i32, ptr %2, align 4, !dbg !892, !tbaa !27
  store i32 %32, ptr %31, align 4, !dbg !891, !tbaa !441
  store ptr %12, ptr %8, align 4, !dbg !893, !tbaa !439
  %33 = getelementptr inbounds nuw i8, ptr %8, i32 4, !dbg !893
  %34 = getelementptr inbounds nuw i8, ptr %2, i32 4, !dbg !894
  %35 = load i32, ptr %34, align 4, !dbg !894, !tbaa !27
  store i32 %35, ptr %33, align 4, !dbg !893, !tbaa !441
  %36 = zext i8 %21 to i32, !dbg !895
  %37 = shl nuw i32 %36, 24, !dbg !895
  %38 = zext i8 %19 to i32, !dbg !895
  %39 = shl nuw nsw i32 %38, 16, !dbg !895
  %40 = or disjoint i32 %37, %39, !dbg !895
  %41 = zext i8 %17 to i32, !dbg !895
  %42 = shl nuw nsw i32 %41, 8, !dbg !895
  %43 = or disjoint i32 %40, %42, !dbg !895
  %44 = zext i8 %15 to i32, !dbg !895
  %45 = or disjoint i32 %43, %44, !dbg !895
  %46 = zext i8 %30 to i32, !dbg !896
  %47 = shl nuw i32 %46, 24, !dbg !896
  %48 = zext i8 %28 to i32, !dbg !896
  %49 = shl nuw nsw i32 %48, 16, !dbg !896
  %50 = or disjoint i32 %47, %49, !dbg !896
  %51 = zext i8 %26 to i32, !dbg !896
  %52 = shl nuw nsw i32 %51, 8, !dbg !896
  %53 = or disjoint i32 %50, %52, !dbg !896
  %54 = zext i8 %24 to i32, !dbg !896
  %55 = or disjoint i32 %53, %54, !dbg !896
  call void @lang_fn_pipeline38_left_padded_zip_u32(ptr dead_on_unwind nonnull writable sret(%struct.ink_l_uint32) align 4 %6, ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %7, ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %8, i32 noundef %45, i32 noundef %55) #13, !dbg !896
  %56 = load ptr, ptr %6, align 4, !dbg !897, !tbaa !439
  store ptr %56, ptr %3, align 4, !dbg !898, !tbaa !792
  %57 = getelementptr inbounds nuw i8, ptr %6, i32 4, !dbg !899
  %58 = load i32, ptr %57, align 4, !dbg !899, !tbaa !441
  store i32 %58, ptr %4, align 4, !dbg !900, !tbaa !27
  call void @llvm.lifetime.end.p0(i64 8, ptr nonnull %6) #14, !dbg !901
  br label %363

59:                                               ; preds = %5
  %60 = load ptr, ptr %1, align 4, !dbg !902, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !856)
    #dbg_value(ptr %60, !115, !DIExpression(), !856)
    #dbg_value(i32 4, !116, !DIExpression(), !856)
    #dbg_value(ptr undef, !117, !DIExpression(), !856)
    #dbg_value(ptr %60, !119, !DIExpression(), !856)
    #dbg_value(i32 0, !122, !DIExpression(), !903)
  %61 = load i8, ptr %60, align 1, !dbg !904, !tbaa !132
    #dbg_value(i8 %61, !829, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !905)
    #dbg_value(i32 1, !122, !DIExpression(), !903)
  %62 = getelementptr inbounds nuw i8, ptr %60, i32 1, !dbg !904
  %63 = load i8, ptr %62, align 1, !dbg !904, !tbaa !132
    #dbg_value(i8 %63, !829, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !905)
    #dbg_value(i32 2, !122, !DIExpression(), !903)
  %64 = getelementptr inbounds nuw i8, ptr %60, i32 2, !dbg !904
  %65 = load i8, ptr %64, align 1, !dbg !904, !tbaa !132
    #dbg_value(i8 %65, !829, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !905)
    #dbg_value(i32 3, !122, !DIExpression(), !903)
  %66 = getelementptr inbounds nuw i8, ptr %60, i32 3, !dbg !904
  %67 = load i8, ptr %66, align 1, !dbg !904, !tbaa !132
    #dbg_value(i8 %67, !829, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !905)
    #dbg_value(i32 4, !122, !DIExpression(), !903)
  %68 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !906
  %69 = load ptr, ptr %68, align 4, !dbg !906, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !858)
    #dbg_value(ptr %69, !115, !DIExpression(), !858)
    #dbg_value(i32 4, !116, !DIExpression(), !858)
    #dbg_value(ptr undef, !117, !DIExpression(), !858)
    #dbg_value(ptr %69, !119, !DIExpression(), !858)
    #dbg_value(i32 0, !122, !DIExpression(), !907)
  %70 = load i8, ptr %69, align 1, !dbg !908, !tbaa !132
    #dbg_value(i8 %70, !831, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !905)
    #dbg_value(i32 1, !122, !DIExpression(), !907)
  %71 = getelementptr inbounds nuw i8, ptr %69, i32 1, !dbg !908
  %72 = load i8, ptr %71, align 1, !dbg !908, !tbaa !132
    #dbg_value(i8 %72, !831, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !905)
    #dbg_value(i32 2, !122, !DIExpression(), !907)
  %73 = getelementptr inbounds nuw i8, ptr %69, i32 2, !dbg !908
  %74 = load i8, ptr %73, align 1, !dbg !908, !tbaa !132
    #dbg_value(i8 %74, !831, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !905)
    #dbg_value(i32 3, !122, !DIExpression(), !907)
  %75 = getelementptr inbounds nuw i8, ptr %69, i32 3, !dbg !908
  %76 = load i8, ptr %75, align 1, !dbg !908, !tbaa !132
    #dbg_value(i8 %76, !831, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !905)
    #dbg_value(i32 4, !122, !DIExpression(), !907)
  %77 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !909
  %78 = load ptr, ptr %77, align 4, !dbg !909, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !860)
    #dbg_value(ptr %78, !115, !DIExpression(), !860)
    #dbg_value(i32 4, !116, !DIExpression(), !860)
    #dbg_value(ptr undef, !117, !DIExpression(), !860)
    #dbg_value(ptr %78, !119, !DIExpression(), !860)
    #dbg_value(i32 0, !122, !DIExpression(), !910)
  %79 = load i8, ptr %78, align 1, !dbg !911, !tbaa !132
    #dbg_value(i8 %79, !832, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !905)
    #dbg_value(i32 1, !122, !DIExpression(), !910)
  %80 = getelementptr inbounds nuw i8, ptr %78, i32 1, !dbg !911
  %81 = load i8, ptr %80, align 1, !dbg !911, !tbaa !132
    #dbg_value(i8 %81, !832, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !905)
    #dbg_value(i32 2, !122, !DIExpression(), !910)
  %82 = getelementptr inbounds nuw i8, ptr %78, i32 2, !dbg !911
  %83 = load i8, ptr %82, align 1, !dbg !911, !tbaa !132
    #dbg_value(i8 %83, !832, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !905)
    #dbg_value(i32 3, !122, !DIExpression(), !910)
  %84 = getelementptr inbounds nuw i8, ptr %78, i32 3, !dbg !911
  %85 = load i8, ptr %84, align 1, !dbg !911, !tbaa !132
    #dbg_value(i8 %85, !832, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !905)
    #dbg_value(i32 4, !122, !DIExpression(), !910)
  %86 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !912
  %87 = load ptr, ptr %86, align 4, !dbg !912, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !862)
    #dbg_value(ptr %87, !115, !DIExpression(), !862)
    #dbg_value(i32 4, !116, !DIExpression(), !862)
    #dbg_value(ptr undef, !117, !DIExpression(), !862)
    #dbg_value(ptr %87, !119, !DIExpression(), !862)
    #dbg_value(i32 0, !122, !DIExpression(), !913)
  %88 = load i8, ptr %87, align 1, !dbg !914, !tbaa !132
    #dbg_value(i8 %88, !833, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !905)
    #dbg_value(i32 1, !122, !DIExpression(), !913)
  %89 = getelementptr inbounds nuw i8, ptr %87, i32 1, !dbg !914
  %90 = load i8, ptr %89, align 1, !dbg !914, !tbaa !132
    #dbg_value(i8 %90, !833, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !905)
    #dbg_value(i32 2, !122, !DIExpression(), !913)
  %91 = getelementptr inbounds nuw i8, ptr %87, i32 2, !dbg !914
  %92 = load i8, ptr %91, align 1, !dbg !914, !tbaa !132
    #dbg_value(i8 %92, !833, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !905)
    #dbg_value(i32 3, !122, !DIExpression(), !913)
  %93 = getelementptr inbounds nuw i8, ptr %87, i32 3, !dbg !914
  %94 = load i8, ptr %93, align 1, !dbg !914, !tbaa !132
    #dbg_value(i8 %94, !833, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !905)
    #dbg_value(i32 4, !122, !DIExpression(), !913)
  %95 = zext i8 %67 to i32, !dbg !915
  %96 = shl nuw i32 %95, 24, !dbg !915
  %97 = zext i8 %65 to i32, !dbg !915
  %98 = shl nuw nsw i32 %97, 16, !dbg !915
  %99 = or disjoint i32 %96, %98, !dbg !915
  %100 = zext i8 %63 to i32, !dbg !915
  %101 = shl nuw nsw i32 %100, 8, !dbg !915
  %102 = or disjoint i32 %99, %101, !dbg !915
  %103 = zext i8 %61 to i32, !dbg !915
  %104 = or disjoint i32 %102, %103, !dbg !915
  %105 = zext i8 %76 to i32, !dbg !916
  %106 = shl nuw i32 %105, 24, !dbg !916
  %107 = zext i8 %74 to i32, !dbg !916
  %108 = shl nuw nsw i32 %107, 16, !dbg !916
  %109 = or disjoint i32 %106, %108, !dbg !916
  %110 = zext i8 %72 to i32, !dbg !916
  %111 = shl nuw nsw i32 %110, 8, !dbg !916
  %112 = or disjoint i32 %109, %111, !dbg !916
  %113 = zext i8 %70 to i32, !dbg !916
  %114 = or disjoint i32 %112, %113, !dbg !916
  %115 = zext i8 %85 to i32, !dbg !917
  %116 = shl nuw i32 %115, 24, !dbg !917
  %117 = zext i8 %83 to i32, !dbg !917
  %118 = shl nuw nsw i32 %117, 16, !dbg !917
  %119 = or disjoint i32 %116, %118, !dbg !917
  %120 = zext i8 %81 to i32, !dbg !917
  %121 = shl nuw nsw i32 %120, 8, !dbg !917
  %122 = or disjoint i32 %119, %121, !dbg !917
  %123 = zext i8 %79 to i32, !dbg !917
  %124 = or disjoint i32 %122, %123, !dbg !917
  %125 = zext i8 %94 to i32, !dbg !918
  %126 = shl nuw i32 %125, 24, !dbg !918
  %127 = zext i8 %92 to i32, !dbg !918
  %128 = shl nuw nsw i32 %127, 16, !dbg !918
  %129 = or disjoint i32 %126, %128, !dbg !918
  %130 = zext i8 %90 to i32, !dbg !918
  %131 = shl nuw nsw i32 %130, 8, !dbg !918
  %132 = or disjoint i32 %129, %131, !dbg !918
  %133 = zext i8 %88 to i32, !dbg !918
  %134 = or disjoint i32 %132, %133, !dbg !918
    #dbg_value(i32 %104, !463, !DIExpression(), !920)
    #dbg_value(i32 %114, !464, !DIExpression(), !920)
    #dbg_value(i32 %124, !465, !DIExpression(), !920)
    #dbg_value(i32 %134, !466, !DIExpression(), !920)
    #dbg_value(i32 %104, !467, !DIExpression(), !920)
  %135 = icmp ult i32 %104, %124, !dbg !918
  %136 = sub i32 0, %124, !dbg !921
  %137 = select i1 %135, i32 %134, i32 %136, !dbg !921
  %138 = add i32 %137, %114, !dbg !921
    #dbg_value(i32 %138, !468, !DIExpression(), !920)
    #dbg_value(i32 %138, !834, !DIExpression(), !905)
    #dbg_value(i32 1, !55, !DIExpression(), !922)
    #dbg_value(i32 4, !56, !DIExpression(), !922)
  %139 = load i32, ptr @ink_top, align 4
  %140 = icmp ugt i32 %139, -8
  br i1 %140, label %141, label %142, !dbg !924

141:                                              ; preds = %59
  tail call void @llvm.trap(), !dbg !925
  unreachable, !dbg !927

142:                                              ; preds = %59
  %143 = icmp eq i32 %139, 0, !dbg !928
  %144 = add nuw i32 %139, 7, !dbg !929
  %145 = select i1 %143, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %144, !dbg !930
  %146 = and i32 %145, -8, !dbg !931
    #dbg_value(i32 %146, !57, !DIExpression(), !922)
    #dbg_value(i32 4, !58, !DIExpression(), !922)
  %147 = or disjoint i32 %146, 4, !dbg !932
  store i32 %147, ptr @ink_top, align 4, !dbg !933, !tbaa !27
  %148 = add i32 %146, 65539, !dbg !934
  %149 = lshr i32 %148, 16, !dbg !935
    #dbg_value(i32 %149, !59, !DIExpression(), !922)
  %150 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !936
    #dbg_value(i32 %150, !60, !DIExpression(), !922)
  %151 = icmp ugt i32 %149, %150, !dbg !937
  br i1 %151, label %152, label %157, !dbg !938

152:                                              ; preds = %142
  %153 = sub nuw nsw i32 %149, %150, !dbg !939
  %154 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %153), !dbg !940
  %155 = icmp eq i32 %154, -1, !dbg !941
  br i1 %155, label %156, label %157, !dbg !938

156:                                              ; preds = %152
  tail call void @llvm.trap(), !dbg !942
  unreachable, !dbg !944

157:                                              ; preds = %142, %152
  %158 = inttoptr i32 %146 to ptr, !dbg !945
    #dbg_value(ptr %158, !835, !DIExpression(), !905)
  store i32 %138, ptr %158, align 8, !dbg !946, !tbaa !285
  store ptr %158, ptr %3, align 4, !dbg !947, !tbaa !792
  store i32 1, ptr %4, align 4, !dbg !948, !tbaa !27
  br label %363

159:                                              ; preds = %5
  %160 = load ptr, ptr %1, align 4, !dbg !949, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !864)
    #dbg_value(ptr %160, !115, !DIExpression(), !864)
    #dbg_value(i32 4, !116, !DIExpression(), !864)
    #dbg_value(ptr undef, !117, !DIExpression(), !864)
    #dbg_value(ptr %160, !119, !DIExpression(), !864)
    #dbg_value(i32 0, !122, !DIExpression(), !950)
  %161 = load i8, ptr %160, align 1, !dbg !951, !tbaa !132
    #dbg_value(i8 %161, !836, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !952)
    #dbg_value(i32 1, !122, !DIExpression(), !950)
  %162 = getelementptr inbounds nuw i8, ptr %160, i32 1, !dbg !951
  %163 = load i8, ptr %162, align 1, !dbg !951, !tbaa !132
    #dbg_value(i8 %163, !836, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !952)
    #dbg_value(i32 2, !122, !DIExpression(), !950)
  %164 = getelementptr inbounds nuw i8, ptr %160, i32 2, !dbg !951
  %165 = load i8, ptr %164, align 1, !dbg !951, !tbaa !132
    #dbg_value(i8 %165, !836, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !952)
    #dbg_value(i32 3, !122, !DIExpression(), !950)
  %166 = getelementptr inbounds nuw i8, ptr %160, i32 3, !dbg !951
  %167 = load i8, ptr %166, align 1, !dbg !951, !tbaa !132
    #dbg_value(i8 %167, !836, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !952)
    #dbg_value(i32 4, !122, !DIExpression(), !950)
  %168 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !953
  %169 = load ptr, ptr %168, align 4, !dbg !953, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !866)
    #dbg_value(ptr %169, !115, !DIExpression(), !866)
    #dbg_value(i32 4, !116, !DIExpression(), !866)
    #dbg_value(ptr undef, !117, !DIExpression(), !866)
    #dbg_value(ptr %169, !119, !DIExpression(), !866)
    #dbg_value(i32 0, !122, !DIExpression(), !954)
  %170 = load i8, ptr %169, align 1, !dbg !955, !tbaa !132
    #dbg_value(i8 %170, !838, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !952)
    #dbg_value(i32 1, !122, !DIExpression(), !954)
  %171 = getelementptr inbounds nuw i8, ptr %169, i32 1, !dbg !955
  %172 = load i8, ptr %171, align 1, !dbg !955, !tbaa !132
    #dbg_value(i8 %172, !838, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !952)
    #dbg_value(i32 2, !122, !DIExpression(), !954)
  %173 = getelementptr inbounds nuw i8, ptr %169, i32 2, !dbg !955
  %174 = load i8, ptr %173, align 1, !dbg !955, !tbaa !132
    #dbg_value(i8 %174, !838, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !952)
    #dbg_value(i32 3, !122, !DIExpression(), !954)
  %175 = getelementptr inbounds nuw i8, ptr %169, i32 3, !dbg !955
  %176 = load i8, ptr %175, align 1, !dbg !955, !tbaa !132
    #dbg_value(i8 %176, !838, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !952)
    #dbg_value(i32 4, !122, !DIExpression(), !954)
  %177 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !956
  %178 = load ptr, ptr %177, align 4, !dbg !956, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !868)
    #dbg_value(ptr %178, !115, !DIExpression(), !868)
    #dbg_value(i32 4, !116, !DIExpression(), !868)
    #dbg_value(ptr undef, !117, !DIExpression(), !868)
    #dbg_value(ptr %178, !119, !DIExpression(), !868)
    #dbg_value(i32 0, !122, !DIExpression(), !957)
  %179 = load i8, ptr %178, align 1, !dbg !958, !tbaa !132
    #dbg_value(i8 %179, !839, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !952)
    #dbg_value(i32 1, !122, !DIExpression(), !957)
  %180 = getelementptr inbounds nuw i8, ptr %178, i32 1, !dbg !958
  %181 = load i8, ptr %180, align 1, !dbg !958, !tbaa !132
    #dbg_value(i8 %181, !839, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !952)
    #dbg_value(i32 2, !122, !DIExpression(), !957)
  %182 = getelementptr inbounds nuw i8, ptr %178, i32 2, !dbg !958
  %183 = load i8, ptr %182, align 1, !dbg !958, !tbaa !132
    #dbg_value(i8 %183, !839, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !952)
    #dbg_value(i32 3, !122, !DIExpression(), !957)
  %184 = getelementptr inbounds nuw i8, ptr %178, i32 3, !dbg !958
  %185 = load i8, ptr %184, align 1, !dbg !958, !tbaa !132
    #dbg_value(i8 %185, !839, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !952)
    #dbg_value(i32 4, !122, !DIExpression(), !957)
  %186 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !959
  %187 = load ptr, ptr %186, align 4, !dbg !959, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !870)
    #dbg_value(ptr %187, !115, !DIExpression(), !870)
    #dbg_value(i32 4, !116, !DIExpression(), !870)
    #dbg_value(ptr undef, !117, !DIExpression(), !870)
    #dbg_value(ptr %187, !119, !DIExpression(), !870)
    #dbg_value(i32 0, !122, !DIExpression(), !960)
  %188 = load i8, ptr %187, align 1, !dbg !961, !tbaa !132
    #dbg_value(i8 %188, !840, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !952)
    #dbg_value(i32 1, !122, !DIExpression(), !960)
  %189 = getelementptr inbounds nuw i8, ptr %187, i32 1, !dbg !961
  %190 = load i8, ptr %189, align 1, !dbg !961, !tbaa !132
    #dbg_value(i8 %190, !840, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !952)
    #dbg_value(i32 2, !122, !DIExpression(), !960)
  %191 = getelementptr inbounds nuw i8, ptr %187, i32 2, !dbg !961
  %192 = load i8, ptr %191, align 1, !dbg !961, !tbaa !132
    #dbg_value(i8 %192, !840, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !952)
    #dbg_value(i32 3, !122, !DIExpression(), !960)
  %193 = getelementptr inbounds nuw i8, ptr %187, i32 3, !dbg !961
  %194 = load i8, ptr %193, align 1, !dbg !961, !tbaa !132
    #dbg_value(i8 %194, !840, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !952)
    #dbg_value(i32 4, !122, !DIExpression(), !960)
  %195 = zext i8 %167 to i32, !dbg !962
  %196 = shl nuw i32 %195, 24, !dbg !962
  %197 = zext i8 %165 to i32, !dbg !962
  %198 = shl nuw nsw i32 %197, 16, !dbg !962
  %199 = or disjoint i32 %196, %198, !dbg !962
  %200 = zext i8 %163 to i32, !dbg !962
  %201 = shl nuw nsw i32 %200, 8, !dbg !962
  %202 = or disjoint i32 %199, %201, !dbg !962
  %203 = zext i8 %161 to i32, !dbg !962
  %204 = or disjoint i32 %202, %203, !dbg !962
  %205 = zext i8 %176 to i32, !dbg !963
  %206 = shl nuw i32 %205, 24, !dbg !963
  %207 = zext i8 %174 to i32, !dbg !963
  %208 = shl nuw nsw i32 %207, 16, !dbg !963
  %209 = or disjoint i32 %206, %208, !dbg !963
  %210 = zext i8 %172 to i32, !dbg !963
  %211 = shl nuw nsw i32 %210, 8, !dbg !963
  %212 = or disjoint i32 %209, %211, !dbg !963
  %213 = zext i8 %170 to i32, !dbg !963
  %214 = or disjoint i32 %212, %213, !dbg !963
  %215 = zext i8 %185 to i32, !dbg !964
  %216 = shl nuw i32 %215, 24, !dbg !964
  %217 = zext i8 %183 to i32, !dbg !964
  %218 = shl nuw nsw i32 %217, 16, !dbg !964
  %219 = or disjoint i32 %216, %218, !dbg !964
  %220 = zext i8 %181 to i32, !dbg !964
  %221 = shl nuw nsw i32 %220, 8, !dbg !964
  %222 = or disjoint i32 %219, %221, !dbg !964
  %223 = zext i8 %179 to i32, !dbg !964
  %224 = or disjoint i32 %222, %223, !dbg !964
  %225 = zext i8 %194 to i32, !dbg !965
  %226 = shl nuw i32 %225, 24, !dbg !965
  %227 = zext i8 %192 to i32, !dbg !965
  %228 = shl nuw nsw i32 %227, 16, !dbg !965
  %229 = or disjoint i32 %226, %228, !dbg !965
  %230 = zext i8 %190 to i32, !dbg !965
  %231 = shl nuw nsw i32 %230, 8, !dbg !965
  %232 = or disjoint i32 %229, %231, !dbg !965
  %233 = zext i8 %188 to i32, !dbg !965
  %234 = or disjoint i32 %232, %233, !dbg !965
    #dbg_value(i32 %204, !480, !DIExpression(), !967)
    #dbg_value(i32 %214, !481, !DIExpression(), !967)
    #dbg_value(i32 %224, !482, !DIExpression(), !967)
    #dbg_value(i32 %234, !483, !DIExpression(), !967)
    #dbg_value(i32 %204, !484, !DIExpression(), !967)
    #dbg_value(i32 3, !485, !DIExpression(), !967)
    #dbg_value(i32 poison, !486, !DIExpression(), !967)
  %235 = urem i32 %204, 3, !dbg !965
    #dbg_value(i32 %235, !486, !DIExpression(), !967)
    #dbg_value(i32 %235, !487, !DIExpression(), !967)
  %236 = icmp eq i32 %235, 0, !dbg !968
  %237 = mul i32 %234, %214, !dbg !969
  %238 = add i32 %224, %214, !dbg !969
  %239 = select i1 %236, i32 %237, i32 %238, !dbg !969
    #dbg_value(i32 %239, !488, !DIExpression(), !967)
    #dbg_value(i32 %239, !841, !DIExpression(), !952)
    #dbg_value(i32 1, !55, !DIExpression(), !970)
    #dbg_value(i32 4, !56, !DIExpression(), !970)
  %240 = load i32, ptr @ink_top, align 4
  %241 = icmp ugt i32 %240, -8
  br i1 %241, label %242, label %243, !dbg !972

242:                                              ; preds = %159
  tail call void @llvm.trap(), !dbg !973
  unreachable, !dbg !975

243:                                              ; preds = %159
  %244 = icmp eq i32 %240, 0, !dbg !976
  %245 = add nuw i32 %240, 7, !dbg !977
  %246 = select i1 %244, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %245, !dbg !978
  %247 = and i32 %246, -8, !dbg !979
    #dbg_value(i32 %247, !57, !DIExpression(), !970)
    #dbg_value(i32 4, !58, !DIExpression(), !970)
  %248 = or disjoint i32 %247, 4, !dbg !980
  store i32 %248, ptr @ink_top, align 4, !dbg !981, !tbaa !27
  %249 = add i32 %247, 65539, !dbg !982
  %250 = lshr i32 %249, 16, !dbg !983
    #dbg_value(i32 %250, !59, !DIExpression(), !970)
  %251 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !984
    #dbg_value(i32 %251, !60, !DIExpression(), !970)
  %252 = icmp ugt i32 %250, %251, !dbg !985
  br i1 %252, label %253, label %258, !dbg !986

253:                                              ; preds = %243
  %254 = sub nuw nsw i32 %250, %251, !dbg !987
  %255 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %254), !dbg !988
  %256 = icmp eq i32 %255, -1, !dbg !989
  br i1 %256, label %257, label %258, !dbg !986

257:                                              ; preds = %253
  tail call void @llvm.trap(), !dbg !990
  unreachable, !dbg !992

258:                                              ; preds = %243, %253
  %259 = inttoptr i32 %247 to ptr, !dbg !993
    #dbg_value(ptr %259, !842, !DIExpression(), !952)
  store i32 %239, ptr %259, align 8, !dbg !994, !tbaa !285
  store ptr %259, ptr %3, align 4, !dbg !995, !tbaa !792
  store i32 1, ptr %4, align 4, !dbg !996, !tbaa !27
  br label %363

260:                                              ; preds = %5
  %261 = load ptr, ptr %1, align 4, !dbg !997, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !872)
    #dbg_value(ptr %261, !115, !DIExpression(), !872)
    #dbg_value(i32 4, !116, !DIExpression(), !872)
    #dbg_value(ptr undef, !117, !DIExpression(), !872)
    #dbg_value(ptr %261, !119, !DIExpression(), !872)
    #dbg_value(i32 0, !122, !DIExpression(), !998)
  %262 = load i8, ptr %261, align 1, !dbg !999, !tbaa !132
    #dbg_value(i8 %262, !843, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1000)
    #dbg_value(i32 1, !122, !DIExpression(), !998)
  %263 = getelementptr inbounds nuw i8, ptr %261, i32 1, !dbg !999
  %264 = load i8, ptr %263, align 1, !dbg !999, !tbaa !132
    #dbg_value(i8 %264, !843, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1000)
    #dbg_value(i32 2, !122, !DIExpression(), !998)
  %265 = getelementptr inbounds nuw i8, ptr %261, i32 2, !dbg !999
  %266 = load i8, ptr %265, align 1, !dbg !999, !tbaa !132
    #dbg_value(i8 %266, !843, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1000)
    #dbg_value(i32 3, !122, !DIExpression(), !998)
  %267 = getelementptr inbounds nuw i8, ptr %261, i32 3, !dbg !999
  %268 = load i8, ptr %267, align 1, !dbg !999, !tbaa !132
    #dbg_value(i8 %268, !843, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1000)
    #dbg_value(i32 4, !122, !DIExpression(), !998)
  %269 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1001
  %270 = load ptr, ptr %269, align 4, !dbg !1001, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !874)
    #dbg_value(ptr %270, !115, !DIExpression(), !874)
    #dbg_value(i32 4, !116, !DIExpression(), !874)
    #dbg_value(ptr undef, !117, !DIExpression(), !874)
    #dbg_value(ptr %270, !119, !DIExpression(), !874)
    #dbg_value(i32 0, !122, !DIExpression(), !1002)
  %271 = load i8, ptr %270, align 1, !dbg !1003, !tbaa !132
    #dbg_value(i8 %271, !845, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1000)
    #dbg_value(i32 1, !122, !DIExpression(), !1002)
  %272 = getelementptr inbounds nuw i8, ptr %270, i32 1, !dbg !1003
  %273 = load i8, ptr %272, align 1, !dbg !1003, !tbaa !132
    #dbg_value(i8 %273, !845, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1000)
    #dbg_value(i32 2, !122, !DIExpression(), !1002)
  %274 = getelementptr inbounds nuw i8, ptr %270, i32 2, !dbg !1003
  %275 = load i8, ptr %274, align 1, !dbg !1003, !tbaa !132
    #dbg_value(i8 %275, !845, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1000)
    #dbg_value(i32 3, !122, !DIExpression(), !1002)
  %276 = getelementptr inbounds nuw i8, ptr %270, i32 3, !dbg !1003
  %277 = load i8, ptr %276, align 1, !dbg !1003, !tbaa !132
    #dbg_value(i8 %277, !845, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1000)
    #dbg_value(i32 4, !122, !DIExpression(), !1002)
  %278 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1004
  %279 = load ptr, ptr %278, align 4, !dbg !1004, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !876)
    #dbg_value(ptr %279, !115, !DIExpression(), !876)
    #dbg_value(i32 4, !116, !DIExpression(), !876)
    #dbg_value(ptr undef, !117, !DIExpression(), !876)
    #dbg_value(ptr %279, !119, !DIExpression(), !876)
    #dbg_value(i32 0, !122, !DIExpression(), !1005)
  %280 = load i8, ptr %279, align 1, !dbg !1006, !tbaa !132
    #dbg_value(i8 %280, !846, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1000)
    #dbg_value(i32 1, !122, !DIExpression(), !1005)
  %281 = getelementptr inbounds nuw i8, ptr %279, i32 1, !dbg !1006
  %282 = load i8, ptr %281, align 1, !dbg !1006, !tbaa !132
    #dbg_value(i8 %282, !846, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1000)
    #dbg_value(i32 2, !122, !DIExpression(), !1005)
  %283 = getelementptr inbounds nuw i8, ptr %279, i32 2, !dbg !1006
  %284 = load i8, ptr %283, align 1, !dbg !1006, !tbaa !132
    #dbg_value(i8 %284, !846, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1000)
    #dbg_value(i32 3, !122, !DIExpression(), !1005)
  %285 = getelementptr inbounds nuw i8, ptr %279, i32 3, !dbg !1006
  %286 = load i8, ptr %285, align 1, !dbg !1006, !tbaa !132
    #dbg_value(i8 %286, !846, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1000)
    #dbg_value(i32 4, !122, !DIExpression(), !1005)
  %287 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1007
  %288 = load ptr, ptr %287, align 4, !dbg !1007, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !878)
    #dbg_value(ptr %288, !115, !DIExpression(), !878)
    #dbg_value(i32 4, !116, !DIExpression(), !878)
    #dbg_value(ptr undef, !117, !DIExpression(), !878)
    #dbg_value(ptr %288, !119, !DIExpression(), !878)
    #dbg_value(i32 0, !122, !DIExpression(), !1008)
  %289 = load i8, ptr %288, align 1, !dbg !1009, !tbaa !132
    #dbg_value(i8 %289, !847, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1000)
    #dbg_value(i32 1, !122, !DIExpression(), !1008)
  %290 = getelementptr inbounds nuw i8, ptr %288, i32 1, !dbg !1009
  %291 = load i8, ptr %290, align 1, !dbg !1009, !tbaa !132
    #dbg_value(i8 %291, !847, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1000)
    #dbg_value(i32 2, !122, !DIExpression(), !1008)
  %292 = getelementptr inbounds nuw i8, ptr %288, i32 2, !dbg !1009
  %293 = load i8, ptr %292, align 1, !dbg !1009, !tbaa !132
    #dbg_value(i8 %293, !847, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1000)
    #dbg_value(i32 3, !122, !DIExpression(), !1008)
  %294 = getelementptr inbounds nuw i8, ptr %288, i32 3, !dbg !1009
  %295 = load i8, ptr %294, align 1, !dbg !1009, !tbaa !132
    #dbg_value(i8 %295, !847, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1000)
    #dbg_value(i32 4, !122, !DIExpression(), !1008)
  %296 = zext i8 %268 to i32, !dbg !1010
  %297 = shl nuw i32 %296, 24, !dbg !1010
  %298 = zext i8 %266 to i32, !dbg !1010
  %299 = shl nuw nsw i32 %298, 16, !dbg !1010
  %300 = or disjoint i32 %297, %299, !dbg !1010
  %301 = zext i8 %264 to i32, !dbg !1010
  %302 = shl nuw nsw i32 %301, 8, !dbg !1010
  %303 = or disjoint i32 %300, %302, !dbg !1010
  %304 = zext i8 %262 to i32, !dbg !1010
  %305 = or disjoint i32 %303, %304, !dbg !1010
  %306 = zext i8 %277 to i32, !dbg !1011
  %307 = shl nuw i32 %306, 24, !dbg !1011
  %308 = zext i8 %275 to i32, !dbg !1011
  %309 = shl nuw nsw i32 %308, 16, !dbg !1011
  %310 = or disjoint i32 %307, %309, !dbg !1011
  %311 = zext i8 %273 to i32, !dbg !1011
  %312 = shl nuw nsw i32 %311, 8, !dbg !1011
  %313 = or disjoint i32 %310, %312, !dbg !1011
  %314 = zext i8 %271 to i32, !dbg !1011
  %315 = or disjoint i32 %313, %314, !dbg !1011
  %316 = zext i8 %286 to i32, !dbg !1012
  %317 = shl nuw i32 %316, 24, !dbg !1012
  %318 = zext i8 %284 to i32, !dbg !1012
  %319 = shl nuw nsw i32 %318, 16, !dbg !1012
  %320 = or disjoint i32 %317, %319, !dbg !1012
  %321 = zext i8 %282 to i32, !dbg !1012
  %322 = shl nuw nsw i32 %321, 8, !dbg !1012
  %323 = or disjoint i32 %320, %322, !dbg !1012
  %324 = zext i8 %280 to i32, !dbg !1012
  %325 = or disjoint i32 %323, %324, !dbg !1012
  %326 = zext i8 %295 to i32, !dbg !1013
  %327 = shl nuw i32 %326, 24, !dbg !1013
  %328 = zext i8 %293 to i32, !dbg !1013
  %329 = shl nuw nsw i32 %328, 16, !dbg !1013
  %330 = or disjoint i32 %327, %329, !dbg !1013
  %331 = zext i8 %291 to i32, !dbg !1013
  %332 = shl nuw nsw i32 %331, 8, !dbg !1013
  %333 = or disjoint i32 %330, %332, !dbg !1013
  %334 = zext i8 %289 to i32, !dbg !1013
  %335 = or disjoint i32 %333, %334, !dbg !1013
    #dbg_value(i32 %305, !503, !DIExpression(), !1015)
    #dbg_value(i32 %315, !504, !DIExpression(), !1015)
    #dbg_value(i32 %325, !505, !DIExpression(), !1015)
    #dbg_value(i32 %335, !506, !DIExpression(), !1015)
    #dbg_value(i32 %305, !507, !DIExpression(), !1015)
  %336 = icmp ult i32 %305, %315, !dbg !1013
  %337 = mul i32 %335, %315, !dbg !1016
  %338 = add i32 %337, %305, !dbg !1016
  %339 = sub i32 %305, %315, !dbg !1016
  %340 = add i32 %339, %325, !dbg !1016
  %341 = select i1 %336, i32 %338, i32 %340, !dbg !1016
    #dbg_value(i32 %341, !508, !DIExpression(), !1015)
    #dbg_value(i32 %341, !848, !DIExpression(), !1000)
    #dbg_value(i32 1, !55, !DIExpression(), !1017)
    #dbg_value(i32 4, !56, !DIExpression(), !1017)
  %342 = load i32, ptr @ink_top, align 4
  %343 = icmp ugt i32 %342, -8
  br i1 %343, label %344, label %345, !dbg !1019

344:                                              ; preds = %260
  tail call void @llvm.trap(), !dbg !1020
  unreachable, !dbg !1022

345:                                              ; preds = %260
  %346 = icmp eq i32 %342, 0, !dbg !1023
  %347 = add nuw i32 %342, 7, !dbg !1024
  %348 = select i1 %346, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %347, !dbg !1025
  %349 = and i32 %348, -8, !dbg !1026
    #dbg_value(i32 %349, !57, !DIExpression(), !1017)
    #dbg_value(i32 4, !58, !DIExpression(), !1017)
  %350 = or disjoint i32 %349, 4, !dbg !1027
  store i32 %350, ptr @ink_top, align 4, !dbg !1028, !tbaa !27
  %351 = add i32 %349, 65539, !dbg !1029
  %352 = lshr i32 %351, 16, !dbg !1030
    #dbg_value(i32 %352, !59, !DIExpression(), !1017)
  %353 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1031
    #dbg_value(i32 %353, !60, !DIExpression(), !1017)
  %354 = icmp ugt i32 %352, %353, !dbg !1032
  br i1 %354, label %355, label %360, !dbg !1033

355:                                              ; preds = %345
  %356 = sub nuw nsw i32 %352, %353, !dbg !1034
  %357 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %356), !dbg !1035
  %358 = icmp eq i32 %357, -1, !dbg !1036
  br i1 %358, label %359, label %360, !dbg !1033

359:                                              ; preds = %355
  tail call void @llvm.trap(), !dbg !1037
  unreachable, !dbg !1039

360:                                              ; preds = %345, %355
  %361 = inttoptr i32 %349 to ptr, !dbg !1040
    #dbg_value(ptr %361, !849, !DIExpression(), !1000)
  store i32 %341, ptr %361, align 8, !dbg !1041, !tbaa !285
  store ptr %361, ptr %3, align 4, !dbg !1042, !tbaa !792
  store i32 1, ptr %4, align 4, !dbg !1043, !tbaa !27
  br label %363

362:                                              ; preds = %5
  tail call void @llvm.trap(), !dbg !1044
  unreachable, !dbg !1046

363:                                              ; preds = %360, %258, %157, %9
  ret void, !dbg !1047
}

; Function Attrs: nounwind memory(read, inaccessiblemem: write) uwtable
define hidden i32 @ink_compute_scalar32(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readnone %2) local_unnamed_addr #9 !dbg !1048 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1074)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1074)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1074)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1074)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1074)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1074)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1074)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1074)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1076)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1076)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1076)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1076)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1076)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1076)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1076)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1076)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1078)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1078)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1078)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1078)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1078)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1078)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1078)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1078)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1080)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1080)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1080)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1080)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1080)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1080)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1080)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1080)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1082)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1082)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1082)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1082)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1082)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1082)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1082)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1082)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1084)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1084)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1084)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1084)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1084)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1084)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1084)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1084)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1086)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1086)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1086)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1086)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1086)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1086)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1086)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1086)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1088)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1088)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1088)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1088)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1088)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1088)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1088)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1088)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1090)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1090)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1090)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1090)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1090)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1090)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1090)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1090)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1092)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1092)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1092)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1092)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1092)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1092)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1092)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1092)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1094)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1094)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1094)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1094)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1094)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1094)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1094)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1094)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1096)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1096)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1096)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1096)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1096)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1096)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1096)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1096)
    #dbg_value(i32 %0, !1052, !DIExpression(), !1098)
    #dbg_value(ptr %1, !1053, !DIExpression(), !1098)
    #dbg_value(ptr %2, !1054, !DIExpression(), !1098)
  switch i32 %0, label %247 [
    i32 1, label %4
    i32 2, label %84
    i32 3, label %165
  ], !dbg !1099

4:                                                ; preds = %3
  %5 = load ptr, ptr %1, align 4, !dbg !1100, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !1074)
    #dbg_value(ptr %5, !115, !DIExpression(), !1074)
    #dbg_value(i32 4, !116, !DIExpression(), !1074)
    #dbg_value(ptr undef, !117, !DIExpression(), !1074)
    #dbg_value(ptr %5, !119, !DIExpression(), !1074)
    #dbg_value(i32 0, !122, !DIExpression(), !1101)
    #dbg_value(i32 0, !122, !DIExpression(), !1101)
  %6 = load i8, ptr %5, align 1, !dbg !1102, !tbaa !132
    #dbg_value(i8 %6, !1055, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1103)
    #dbg_value(i32 1, !122, !DIExpression(), !1101)
  %7 = getelementptr inbounds nuw i8, ptr %5, i32 1, !dbg !1102
  %8 = load i8, ptr %7, align 1, !dbg !1102, !tbaa !132
    #dbg_value(i8 %8, !1055, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1103)
    #dbg_value(i32 2, !122, !DIExpression(), !1101)
  %9 = getelementptr inbounds nuw i8, ptr %5, i32 2, !dbg !1102
  %10 = load i8, ptr %9, align 1, !dbg !1102, !tbaa !132
    #dbg_value(i8 %10, !1055, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1103)
    #dbg_value(i32 3, !122, !DIExpression(), !1101)
  %11 = getelementptr inbounds nuw i8, ptr %5, i32 3, !dbg !1102
  %12 = load i8, ptr %11, align 1, !dbg !1102, !tbaa !132
    #dbg_value(i8 %12, !1055, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1103)
    #dbg_value(i32 4, !122, !DIExpression(), !1101)
  %13 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1104
  %14 = load ptr, ptr %13, align 4, !dbg !1104, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !1076)
    #dbg_value(ptr %14, !115, !DIExpression(), !1076)
    #dbg_value(i32 4, !116, !DIExpression(), !1076)
    #dbg_value(ptr undef, !117, !DIExpression(), !1076)
    #dbg_value(ptr %14, !119, !DIExpression(), !1076)
    #dbg_value(i32 0, !122, !DIExpression(), !1105)
    #dbg_value(i32 0, !122, !DIExpression(), !1105)
  %15 = load i8, ptr %14, align 1, !dbg !1106, !tbaa !132
    #dbg_value(i8 %15, !1058, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1103)
    #dbg_value(i32 1, !122, !DIExpression(), !1105)
  %16 = getelementptr inbounds nuw i8, ptr %14, i32 1, !dbg !1106
  %17 = load i8, ptr %16, align 1, !dbg !1106, !tbaa !132
    #dbg_value(i8 %17, !1058, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1103)
    #dbg_value(i32 2, !122, !DIExpression(), !1105)
  %18 = getelementptr inbounds nuw i8, ptr %14, i32 2, !dbg !1106
  %19 = load i8, ptr %18, align 1, !dbg !1106, !tbaa !132
    #dbg_value(i8 %19, !1058, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1103)
    #dbg_value(i32 3, !122, !DIExpression(), !1105)
  %20 = getelementptr inbounds nuw i8, ptr %14, i32 3, !dbg !1106
  %21 = load i8, ptr %20, align 1, !dbg !1106, !tbaa !132
    #dbg_value(i8 %21, !1058, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1103)
    #dbg_value(i32 4, !122, !DIExpression(), !1105)
  %22 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1107
  %23 = load ptr, ptr %22, align 4, !dbg !1107, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !1078)
    #dbg_value(ptr %23, !115, !DIExpression(), !1078)
    #dbg_value(i32 4, !116, !DIExpression(), !1078)
    #dbg_value(ptr undef, !117, !DIExpression(), !1078)
    #dbg_value(ptr %23, !119, !DIExpression(), !1078)
    #dbg_value(i32 0, !122, !DIExpression(), !1108)
    #dbg_value(i32 0, !122, !DIExpression(), !1108)
  %24 = load i8, ptr %23, align 1, !dbg !1109, !tbaa !132
    #dbg_value(i8 %24, !1059, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1103)
    #dbg_value(i32 1, !122, !DIExpression(), !1108)
  %25 = getelementptr inbounds nuw i8, ptr %23, i32 1, !dbg !1109
  %26 = load i8, ptr %25, align 1, !dbg !1109, !tbaa !132
    #dbg_value(i8 %26, !1059, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1103)
    #dbg_value(i32 2, !122, !DIExpression(), !1108)
  %27 = getelementptr inbounds nuw i8, ptr %23, i32 2, !dbg !1109
  %28 = load i8, ptr %27, align 1, !dbg !1109, !tbaa !132
    #dbg_value(i8 %28, !1059, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1103)
    #dbg_value(i32 3, !122, !DIExpression(), !1108)
  %29 = getelementptr inbounds nuw i8, ptr %23, i32 3, !dbg !1109
  %30 = load i8, ptr %29, align 1, !dbg !1109, !tbaa !132
    #dbg_value(i8 %30, !1059, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1103)
    #dbg_value(i32 4, !122, !DIExpression(), !1108)
  %31 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1110
  %32 = load ptr, ptr %31, align 4, !dbg !1110, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !1080)
    #dbg_value(ptr %32, !115, !DIExpression(), !1080)
    #dbg_value(i32 4, !116, !DIExpression(), !1080)
    #dbg_value(ptr undef, !117, !DIExpression(), !1080)
    #dbg_value(ptr %32, !119, !DIExpression(), !1080)
    #dbg_value(i32 0, !122, !DIExpression(), !1111)
    #dbg_value(i32 0, !122, !DIExpression(), !1111)
  %33 = load i8, ptr %32, align 1, !dbg !1112, !tbaa !132
    #dbg_value(i8 %33, !1060, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1103)
    #dbg_value(i32 1, !122, !DIExpression(), !1111)
  %34 = getelementptr inbounds nuw i8, ptr %32, i32 1, !dbg !1112
  %35 = load i8, ptr %34, align 1, !dbg !1112, !tbaa !132
    #dbg_value(i8 %35, !1060, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1103)
    #dbg_value(i32 2, !122, !DIExpression(), !1111)
  %36 = getelementptr inbounds nuw i8, ptr %32, i32 2, !dbg !1112
  %37 = load i8, ptr %36, align 1, !dbg !1112, !tbaa !132
    #dbg_value(i8 %37, !1060, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1103)
    #dbg_value(i32 3, !122, !DIExpression(), !1111)
  %38 = getelementptr inbounds nuw i8, ptr %32, i32 3, !dbg !1112
  %39 = load i8, ptr %38, align 1, !dbg !1112, !tbaa !132
    #dbg_value(i8 %39, !1060, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1103)
    #dbg_value(i32 4, !122, !DIExpression(), !1111)
  %40 = zext i8 %12 to i32, !dbg !1113
  %41 = shl nuw i32 %40, 24, !dbg !1113
  %42 = zext i8 %10 to i32, !dbg !1113
  %43 = shl nuw nsw i32 %42, 16, !dbg !1113
  %44 = or disjoint i32 %41, %43, !dbg !1113
  %45 = zext i8 %8 to i32, !dbg !1113
  %46 = shl nuw nsw i32 %45, 8, !dbg !1113
  %47 = or disjoint i32 %44, %46, !dbg !1113
  %48 = zext i8 %6 to i32, !dbg !1113
  %49 = or disjoint i32 %47, %48, !dbg !1113
  %50 = zext i8 %21 to i32, !dbg !1114
  %51 = shl nuw i32 %50, 24, !dbg !1114
  %52 = zext i8 %19 to i32, !dbg !1114
  %53 = shl nuw nsw i32 %52, 16, !dbg !1114
  %54 = or disjoint i32 %51, %53, !dbg !1114
  %55 = zext i8 %17 to i32, !dbg !1114
  %56 = shl nuw nsw i32 %55, 8, !dbg !1114
  %57 = or disjoint i32 %54, %56, !dbg !1114
  %58 = zext i8 %15 to i32, !dbg !1114
  %59 = or disjoint i32 %57, %58, !dbg !1114
  %60 = zext i8 %30 to i32, !dbg !1115
  %61 = shl nuw i32 %60, 24, !dbg !1115
  %62 = zext i8 %28 to i32, !dbg !1115
  %63 = shl nuw nsw i32 %62, 16, !dbg !1115
  %64 = or disjoint i32 %61, %63, !dbg !1115
  %65 = zext i8 %26 to i32, !dbg !1115
  %66 = shl nuw nsw i32 %65, 8, !dbg !1115
  %67 = or disjoint i32 %64, %66, !dbg !1115
  %68 = zext i8 %24 to i32, !dbg !1115
  %69 = or disjoint i32 %67, %68, !dbg !1115
  %70 = zext i8 %39 to i32, !dbg !1116
  %71 = shl nuw i32 %70, 24, !dbg !1116
  %72 = zext i8 %37 to i32, !dbg !1116
  %73 = shl nuw nsw i32 %72, 16, !dbg !1116
  %74 = or disjoint i32 %71, %73, !dbg !1116
  %75 = zext i8 %35 to i32, !dbg !1116
  %76 = shl nuw nsw i32 %75, 8, !dbg !1116
  %77 = or disjoint i32 %74, %76, !dbg !1116
  %78 = zext i8 %33 to i32, !dbg !1116
  %79 = or disjoint i32 %77, %78, !dbg !1116
    #dbg_value(i32 %49, !463, !DIExpression(), !1118)
    #dbg_value(i32 %59, !464, !DIExpression(), !1118)
    #dbg_value(i32 %69, !465, !DIExpression(), !1118)
    #dbg_value(i32 %79, !466, !DIExpression(), !1118)
    #dbg_value(i32 %49, !467, !DIExpression(), !1118)
  %80 = icmp ult i32 %49, %69, !dbg !1116
  %81 = sub i32 0, %69, !dbg !1119
  %82 = select i1 %80, i32 %79, i32 %81, !dbg !1119
  %83 = add i32 %82, %59, !dbg !1119
    #dbg_value(i32 %83, !468, !DIExpression(), !1118)
    #dbg_value(i32 %83, !1061, !DIExpression(), !1103)
  br label %248

84:                                               ; preds = %3
  %85 = load ptr, ptr %1, align 4, !dbg !1120, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !1082)
    #dbg_value(ptr %85, !115, !DIExpression(), !1082)
    #dbg_value(i32 4, !116, !DIExpression(), !1082)
    #dbg_value(ptr undef, !117, !DIExpression(), !1082)
    #dbg_value(ptr %85, !119, !DIExpression(), !1082)
    #dbg_value(i32 0, !122, !DIExpression(), !1121)
    #dbg_value(i32 0, !122, !DIExpression(), !1121)
  %86 = load i8, ptr %85, align 1, !dbg !1122, !tbaa !132
    #dbg_value(i8 %86, !1062, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1123)
    #dbg_value(i32 1, !122, !DIExpression(), !1121)
  %87 = getelementptr inbounds nuw i8, ptr %85, i32 1, !dbg !1122
  %88 = load i8, ptr %87, align 1, !dbg !1122, !tbaa !132
    #dbg_value(i8 %88, !1062, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1123)
    #dbg_value(i32 2, !122, !DIExpression(), !1121)
  %89 = getelementptr inbounds nuw i8, ptr %85, i32 2, !dbg !1122
  %90 = load i8, ptr %89, align 1, !dbg !1122, !tbaa !132
    #dbg_value(i8 %90, !1062, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1123)
    #dbg_value(i32 3, !122, !DIExpression(), !1121)
  %91 = getelementptr inbounds nuw i8, ptr %85, i32 3, !dbg !1122
  %92 = load i8, ptr %91, align 1, !dbg !1122, !tbaa !132
    #dbg_value(i8 %92, !1062, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1123)
    #dbg_value(i32 4, !122, !DIExpression(), !1121)
  %93 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1124
  %94 = load ptr, ptr %93, align 4, !dbg !1124, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !1084)
    #dbg_value(ptr %94, !115, !DIExpression(), !1084)
    #dbg_value(i32 4, !116, !DIExpression(), !1084)
    #dbg_value(ptr undef, !117, !DIExpression(), !1084)
    #dbg_value(ptr %94, !119, !DIExpression(), !1084)
    #dbg_value(i32 0, !122, !DIExpression(), !1125)
    #dbg_value(i32 0, !122, !DIExpression(), !1125)
  %95 = load i8, ptr %94, align 1, !dbg !1126, !tbaa !132
    #dbg_value(i8 %95, !1064, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1123)
    #dbg_value(i32 1, !122, !DIExpression(), !1125)
  %96 = getelementptr inbounds nuw i8, ptr %94, i32 1, !dbg !1126
  %97 = load i8, ptr %96, align 1, !dbg !1126, !tbaa !132
    #dbg_value(i8 %97, !1064, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1123)
    #dbg_value(i32 2, !122, !DIExpression(), !1125)
  %98 = getelementptr inbounds nuw i8, ptr %94, i32 2, !dbg !1126
  %99 = load i8, ptr %98, align 1, !dbg !1126, !tbaa !132
    #dbg_value(i8 %99, !1064, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1123)
    #dbg_value(i32 3, !122, !DIExpression(), !1125)
  %100 = getelementptr inbounds nuw i8, ptr %94, i32 3, !dbg !1126
  %101 = load i8, ptr %100, align 1, !dbg !1126, !tbaa !132
    #dbg_value(i8 %101, !1064, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1123)
    #dbg_value(i32 4, !122, !DIExpression(), !1125)
  %102 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1127
  %103 = load ptr, ptr %102, align 4, !dbg !1127, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !1086)
    #dbg_value(ptr %103, !115, !DIExpression(), !1086)
    #dbg_value(i32 4, !116, !DIExpression(), !1086)
    #dbg_value(ptr undef, !117, !DIExpression(), !1086)
    #dbg_value(ptr %103, !119, !DIExpression(), !1086)
    #dbg_value(i32 0, !122, !DIExpression(), !1128)
    #dbg_value(i32 0, !122, !DIExpression(), !1128)
  %104 = load i8, ptr %103, align 1, !dbg !1129, !tbaa !132
    #dbg_value(i8 %104, !1065, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1123)
    #dbg_value(i32 1, !122, !DIExpression(), !1128)
  %105 = getelementptr inbounds nuw i8, ptr %103, i32 1, !dbg !1129
  %106 = load i8, ptr %105, align 1, !dbg !1129, !tbaa !132
    #dbg_value(i8 %106, !1065, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1123)
    #dbg_value(i32 2, !122, !DIExpression(), !1128)
  %107 = getelementptr inbounds nuw i8, ptr %103, i32 2, !dbg !1129
  %108 = load i8, ptr %107, align 1, !dbg !1129, !tbaa !132
    #dbg_value(i8 %108, !1065, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1123)
    #dbg_value(i32 3, !122, !DIExpression(), !1128)
  %109 = getelementptr inbounds nuw i8, ptr %103, i32 3, !dbg !1129
  %110 = load i8, ptr %109, align 1, !dbg !1129, !tbaa !132
    #dbg_value(i8 %110, !1065, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1123)
    #dbg_value(i32 4, !122, !DIExpression(), !1128)
  %111 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1130
  %112 = load ptr, ptr %111, align 4, !dbg !1130, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !1088)
    #dbg_value(ptr %112, !115, !DIExpression(), !1088)
    #dbg_value(i32 4, !116, !DIExpression(), !1088)
    #dbg_value(ptr undef, !117, !DIExpression(), !1088)
    #dbg_value(ptr %112, !119, !DIExpression(), !1088)
    #dbg_value(i32 0, !122, !DIExpression(), !1131)
    #dbg_value(i32 0, !122, !DIExpression(), !1131)
  %113 = load i8, ptr %112, align 1, !dbg !1132, !tbaa !132
    #dbg_value(i8 %113, !1066, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1123)
    #dbg_value(i32 1, !122, !DIExpression(), !1131)
  %114 = getelementptr inbounds nuw i8, ptr %112, i32 1, !dbg !1132
  %115 = load i8, ptr %114, align 1, !dbg !1132, !tbaa !132
    #dbg_value(i8 %115, !1066, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1123)
    #dbg_value(i32 2, !122, !DIExpression(), !1131)
  %116 = getelementptr inbounds nuw i8, ptr %112, i32 2, !dbg !1132
  %117 = load i8, ptr %116, align 1, !dbg !1132, !tbaa !132
    #dbg_value(i8 %117, !1066, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1123)
    #dbg_value(i32 3, !122, !DIExpression(), !1131)
  %118 = getelementptr inbounds nuw i8, ptr %112, i32 3, !dbg !1132
  %119 = load i8, ptr %118, align 1, !dbg !1132, !tbaa !132
    #dbg_value(i8 %119, !1066, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1123)
    #dbg_value(i32 4, !122, !DIExpression(), !1131)
  %120 = zext i8 %92 to i32, !dbg !1133
  %121 = shl nuw i32 %120, 24, !dbg !1133
  %122 = zext i8 %90 to i32, !dbg !1133
  %123 = shl nuw nsw i32 %122, 16, !dbg !1133
  %124 = or disjoint i32 %121, %123, !dbg !1133
  %125 = zext i8 %88 to i32, !dbg !1133
  %126 = shl nuw nsw i32 %125, 8, !dbg !1133
  %127 = or disjoint i32 %124, %126, !dbg !1133
  %128 = zext i8 %86 to i32, !dbg !1133
  %129 = or disjoint i32 %127, %128, !dbg !1133
  %130 = zext i8 %101 to i32, !dbg !1134
  %131 = shl nuw i32 %130, 24, !dbg !1134
  %132 = zext i8 %99 to i32, !dbg !1134
  %133 = shl nuw nsw i32 %132, 16, !dbg !1134
  %134 = or disjoint i32 %131, %133, !dbg !1134
  %135 = zext i8 %97 to i32, !dbg !1134
  %136 = shl nuw nsw i32 %135, 8, !dbg !1134
  %137 = or disjoint i32 %134, %136, !dbg !1134
  %138 = zext i8 %95 to i32, !dbg !1134
  %139 = or disjoint i32 %137, %138, !dbg !1134
  %140 = zext i8 %110 to i32, !dbg !1135
  %141 = shl nuw i32 %140, 24, !dbg !1135
  %142 = zext i8 %108 to i32, !dbg !1135
  %143 = shl nuw nsw i32 %142, 16, !dbg !1135
  %144 = or disjoint i32 %141, %143, !dbg !1135
  %145 = zext i8 %106 to i32, !dbg !1135
  %146 = shl nuw nsw i32 %145, 8, !dbg !1135
  %147 = or disjoint i32 %144, %146, !dbg !1135
  %148 = zext i8 %104 to i32, !dbg !1135
  %149 = or disjoint i32 %147, %148, !dbg !1135
  %150 = zext i8 %119 to i32, !dbg !1136
  %151 = shl nuw i32 %150, 24, !dbg !1136
  %152 = zext i8 %117 to i32, !dbg !1136
  %153 = shl nuw nsw i32 %152, 16, !dbg !1136
  %154 = or disjoint i32 %151, %153, !dbg !1136
  %155 = zext i8 %115 to i32, !dbg !1136
  %156 = shl nuw nsw i32 %155, 8, !dbg !1136
  %157 = or disjoint i32 %154, %156, !dbg !1136
  %158 = zext i8 %113 to i32, !dbg !1136
  %159 = or disjoint i32 %157, %158, !dbg !1136
    #dbg_value(i32 %129, !480, !DIExpression(), !1138)
    #dbg_value(i32 %139, !481, !DIExpression(), !1138)
    #dbg_value(i32 %149, !482, !DIExpression(), !1138)
    #dbg_value(i32 %159, !483, !DIExpression(), !1138)
    #dbg_value(i32 %129, !484, !DIExpression(), !1138)
    #dbg_value(i32 3, !485, !DIExpression(), !1138)
    #dbg_value(i32 poison, !486, !DIExpression(), !1138)
  %160 = urem i32 %129, 3, !dbg !1136
    #dbg_value(i32 %160, !486, !DIExpression(), !1138)
    #dbg_value(i32 %160, !487, !DIExpression(), !1138)
  %161 = icmp eq i32 %160, 0, !dbg !1139
  %162 = mul i32 %159, %139, !dbg !1140
  %163 = add i32 %149, %139, !dbg !1140
  %164 = select i1 %161, i32 %162, i32 %163, !dbg !1140
    #dbg_value(i32 %164, !488, !DIExpression(), !1138)
    #dbg_value(i32 %164, !1067, !DIExpression(), !1123)
  br label %248

165:                                              ; preds = %3
  %166 = load ptr, ptr %1, align 4, !dbg !1141, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !1090)
    #dbg_value(ptr %166, !115, !DIExpression(), !1090)
    #dbg_value(i32 4, !116, !DIExpression(), !1090)
    #dbg_value(ptr undef, !117, !DIExpression(), !1090)
    #dbg_value(ptr %166, !119, !DIExpression(), !1090)
    #dbg_value(i32 0, !122, !DIExpression(), !1142)
    #dbg_value(i32 0, !122, !DIExpression(), !1142)
  %167 = load i8, ptr %166, align 1, !dbg !1143, !tbaa !132
    #dbg_value(i8 %167, !1068, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1144)
    #dbg_value(i32 1, !122, !DIExpression(), !1142)
  %168 = getelementptr inbounds nuw i8, ptr %166, i32 1, !dbg !1143
  %169 = load i8, ptr %168, align 1, !dbg !1143, !tbaa !132
    #dbg_value(i8 %169, !1068, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1144)
    #dbg_value(i32 2, !122, !DIExpression(), !1142)
  %170 = getelementptr inbounds nuw i8, ptr %166, i32 2, !dbg !1143
  %171 = load i8, ptr %170, align 1, !dbg !1143, !tbaa !132
    #dbg_value(i8 %171, !1068, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1144)
    #dbg_value(i32 3, !122, !DIExpression(), !1142)
  %172 = getelementptr inbounds nuw i8, ptr %166, i32 3, !dbg !1143
  %173 = load i8, ptr %172, align 1, !dbg !1143, !tbaa !132
    #dbg_value(i8 %173, !1068, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1144)
    #dbg_value(i32 4, !122, !DIExpression(), !1142)
  %174 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1145
  %175 = load ptr, ptr %174, align 4, !dbg !1145, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !1092)
    #dbg_value(ptr %175, !115, !DIExpression(), !1092)
    #dbg_value(i32 4, !116, !DIExpression(), !1092)
    #dbg_value(ptr undef, !117, !DIExpression(), !1092)
    #dbg_value(ptr %175, !119, !DIExpression(), !1092)
    #dbg_value(i32 0, !122, !DIExpression(), !1146)
    #dbg_value(i32 0, !122, !DIExpression(), !1146)
  %176 = load i8, ptr %175, align 1, !dbg !1147, !tbaa !132
    #dbg_value(i8 %176, !1070, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1144)
    #dbg_value(i32 1, !122, !DIExpression(), !1146)
  %177 = getelementptr inbounds nuw i8, ptr %175, i32 1, !dbg !1147
  %178 = load i8, ptr %177, align 1, !dbg !1147, !tbaa !132
    #dbg_value(i8 %178, !1070, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1144)
    #dbg_value(i32 2, !122, !DIExpression(), !1146)
  %179 = getelementptr inbounds nuw i8, ptr %175, i32 2, !dbg !1147
  %180 = load i8, ptr %179, align 1, !dbg !1147, !tbaa !132
    #dbg_value(i8 %180, !1070, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1144)
    #dbg_value(i32 3, !122, !DIExpression(), !1146)
  %181 = getelementptr inbounds nuw i8, ptr %175, i32 3, !dbg !1147
  %182 = load i8, ptr %181, align 1, !dbg !1147, !tbaa !132
    #dbg_value(i8 %182, !1070, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1144)
    #dbg_value(i32 4, !122, !DIExpression(), !1146)
  %183 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1148
  %184 = load ptr, ptr %183, align 4, !dbg !1148, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !1094)
    #dbg_value(ptr %184, !115, !DIExpression(), !1094)
    #dbg_value(i32 4, !116, !DIExpression(), !1094)
    #dbg_value(ptr undef, !117, !DIExpression(), !1094)
    #dbg_value(ptr %184, !119, !DIExpression(), !1094)
    #dbg_value(i32 0, !122, !DIExpression(), !1149)
    #dbg_value(i32 0, !122, !DIExpression(), !1149)
  %185 = load i8, ptr %184, align 1, !dbg !1150, !tbaa !132
    #dbg_value(i8 %185, !1071, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1144)
    #dbg_value(i32 1, !122, !DIExpression(), !1149)
  %186 = getelementptr inbounds nuw i8, ptr %184, i32 1, !dbg !1150
  %187 = load i8, ptr %186, align 1, !dbg !1150, !tbaa !132
    #dbg_value(i8 %187, !1071, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1144)
    #dbg_value(i32 2, !122, !DIExpression(), !1149)
  %188 = getelementptr inbounds nuw i8, ptr %184, i32 2, !dbg !1150
  %189 = load i8, ptr %188, align 1, !dbg !1150, !tbaa !132
    #dbg_value(i8 %189, !1071, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1144)
    #dbg_value(i32 3, !122, !DIExpression(), !1149)
  %190 = getelementptr inbounds nuw i8, ptr %184, i32 3, !dbg !1150
  %191 = load i8, ptr %190, align 1, !dbg !1150, !tbaa !132
    #dbg_value(i8 %191, !1071, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1144)
    #dbg_value(i32 4, !122, !DIExpression(), !1149)
  %192 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1151
  %193 = load ptr, ptr %192, align 4, !dbg !1151, !tbaa !792
    #dbg_value(ptr undef, !110, !DIExpression(), !1096)
    #dbg_value(ptr %193, !115, !DIExpression(), !1096)
    #dbg_value(i32 4, !116, !DIExpression(), !1096)
    #dbg_value(ptr undef, !117, !DIExpression(), !1096)
    #dbg_value(ptr %193, !119, !DIExpression(), !1096)
    #dbg_value(i32 0, !122, !DIExpression(), !1152)
    #dbg_value(i32 0, !122, !DIExpression(), !1152)
  %194 = load i8, ptr %193, align 1, !dbg !1153, !tbaa !132
    #dbg_value(i8 %194, !1072, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1144)
    #dbg_value(i32 1, !122, !DIExpression(), !1152)
  %195 = getelementptr inbounds nuw i8, ptr %193, i32 1, !dbg !1153
  %196 = load i8, ptr %195, align 1, !dbg !1153, !tbaa !132
    #dbg_value(i8 %196, !1072, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1144)
    #dbg_value(i32 2, !122, !DIExpression(), !1152)
  %197 = getelementptr inbounds nuw i8, ptr %193, i32 2, !dbg !1153
  %198 = load i8, ptr %197, align 1, !dbg !1153, !tbaa !132
    #dbg_value(i8 %198, !1072, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1144)
    #dbg_value(i32 3, !122, !DIExpression(), !1152)
  %199 = getelementptr inbounds nuw i8, ptr %193, i32 3, !dbg !1153
  %200 = load i8, ptr %199, align 1, !dbg !1153, !tbaa !132
    #dbg_value(i8 %200, !1072, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1144)
    #dbg_value(i32 4, !122, !DIExpression(), !1152)
  %201 = zext i8 %173 to i32, !dbg !1154
  %202 = shl nuw i32 %201, 24, !dbg !1154
  %203 = zext i8 %171 to i32, !dbg !1154
  %204 = shl nuw nsw i32 %203, 16, !dbg !1154
  %205 = or disjoint i32 %202, %204, !dbg !1154
  %206 = zext i8 %169 to i32, !dbg !1154
  %207 = shl nuw nsw i32 %206, 8, !dbg !1154
  %208 = or disjoint i32 %205, %207, !dbg !1154
  %209 = zext i8 %167 to i32, !dbg !1154
  %210 = or disjoint i32 %208, %209, !dbg !1154
  %211 = zext i8 %182 to i32, !dbg !1155
  %212 = shl nuw i32 %211, 24, !dbg !1155
  %213 = zext i8 %180 to i32, !dbg !1155
  %214 = shl nuw nsw i32 %213, 16, !dbg !1155
  %215 = or disjoint i32 %212, %214, !dbg !1155
  %216 = zext i8 %178 to i32, !dbg !1155
  %217 = shl nuw nsw i32 %216, 8, !dbg !1155
  %218 = or disjoint i32 %215, %217, !dbg !1155
  %219 = zext i8 %176 to i32, !dbg !1155
  %220 = or disjoint i32 %218, %219, !dbg !1155
  %221 = zext i8 %191 to i32, !dbg !1156
  %222 = shl nuw i32 %221, 24, !dbg !1156
  %223 = zext i8 %189 to i32, !dbg !1156
  %224 = shl nuw nsw i32 %223, 16, !dbg !1156
  %225 = or disjoint i32 %222, %224, !dbg !1156
  %226 = zext i8 %187 to i32, !dbg !1156
  %227 = shl nuw nsw i32 %226, 8, !dbg !1156
  %228 = or disjoint i32 %225, %227, !dbg !1156
  %229 = zext i8 %185 to i32, !dbg !1156
  %230 = or disjoint i32 %228, %229, !dbg !1156
  %231 = zext i8 %200 to i32, !dbg !1157
  %232 = shl nuw i32 %231, 24, !dbg !1157
  %233 = zext i8 %198 to i32, !dbg !1157
  %234 = shl nuw nsw i32 %233, 16, !dbg !1157
  %235 = or disjoint i32 %232, %234, !dbg !1157
  %236 = zext i8 %196 to i32, !dbg !1157
  %237 = shl nuw nsw i32 %236, 8, !dbg !1157
  %238 = or disjoint i32 %235, %237, !dbg !1157
  %239 = zext i8 %194 to i32, !dbg !1157
  %240 = or disjoint i32 %238, %239, !dbg !1157
    #dbg_value(i32 %210, !503, !DIExpression(), !1159)
    #dbg_value(i32 %220, !504, !DIExpression(), !1159)
    #dbg_value(i32 %230, !505, !DIExpression(), !1159)
    #dbg_value(i32 %240, !506, !DIExpression(), !1159)
    #dbg_value(i32 %210, !507, !DIExpression(), !1159)
  %241 = icmp ult i32 %210, %220, !dbg !1157
  %242 = mul i32 %240, %220, !dbg !1160
  %243 = add i32 %242, %210, !dbg !1160
  %244 = sub i32 %210, %220, !dbg !1160
  %245 = add i32 %244, %230, !dbg !1160
  %246 = select i1 %241, i32 %243, i32 %245, !dbg !1160
    #dbg_value(i32 %246, !508, !DIExpression(), !1159)
    #dbg_value(i32 %246, !1073, !DIExpression(), !1144)
  br label %248

247:                                              ; preds = %3
  tail call void @llvm.trap(), !dbg !1161
  unreachable, !dbg !1163

248:                                              ; preds = %165, %84, %4
  %249 = phi i32 [ %246, %165 ], [ %164, %84 ], [ %83, %4 ], !dbg !1098
  ret i32 %249, !dbg !1164
}

; Function Attrs: cold noreturn nounwind memory(inaccessiblemem: write) uwtable
define hidden noundef i64 @ink_compute_scalar64(i32 noundef %0, ptr nocapture noundef readnone %1, ptr nocapture noundef readnone %2) local_unnamed_addr #10 !dbg !1165 {
    #dbg_value(i32 %0, !1171, !DIExpression(), !1174)
    #dbg_value(ptr %1, !1172, !DIExpression(), !1174)
    #dbg_value(ptr %2, !1173, !DIExpression(), !1174)
  tail call void @llvm.trap(), !dbg !1175
  unreachable, !dbg !1178
}

; Function Attrs: cold noreturn nounwind memory(inaccessiblemem: write)
declare void @llvm.trap() #11

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare { i32, i1 } @llvm.umul.with.overflow.i32(i32, i32) #12

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare i32 @llvm.umax.i32(i32, i32) #12

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare i32 @llvm.umin.i32(i32, i32) #12

attributes #0 = { mustprogress nofree norecurse nosync nounwind willreturn memory(write, argmem: none, inaccessiblemem: none) uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #1 = { mustprogress nofree norecurse nosync nounwind willreturn memory(readwrite, argmem: none, inaccessiblemem: none) uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #2 = { nounwind uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #3 = { mustprogress nocallback nofree nosync nounwind willreturn memory(argmem: readwrite) }
attributes #4 = { mustprogress nocallback nofree nosync nounwind willreturn memory(read) }
attributes #5 = { mustprogress nocallback nofree nosync nounwind willreturn }
attributes #6 = { nofree norecurse nosync nounwind memory(argmem: readwrite) uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #7 = { nofree norecurse nosync nounwind memory(argmem: write) uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #8 = { mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #9 = { nounwind memory(read, inaccessiblemem: write) uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #10 = { cold noreturn nounwind memory(inaccessiblemem: write) uwtable "frame-pointer"="all" "no-builtins" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="lime1" "target-features"="+bulk-memory-opt,+call-indirect-overlong,+extended-const,+multivalue,+mutable-globals,+nontrapping-fptoint,+sign-ext,+simd128,-atomics,-bulk-memory,-exception-handling,-fp16,-multimemory,-reference-types,-relaxed-simd,-tail-call,-wide-arithmetic" }
attributes #11 = { cold noreturn nounwind memory(inaccessiblemem: write) }
attributes #12 = { nocallback nofree nosync nounwind speculatable willreturn memory(none) }
attributes #13 = { nobuiltin "no-builtins" }
attributes #14 = { nounwind }

!llvm.dbg.cu = !{!2}
!llvm.module.flags = !{!16, !17, !18, !19, !20, !21}
!llvm.ident = !{!22}

!0 = !DIGlobalVariableExpression(var: !1, expr: !DIExpression())
!1 = distinct !DIGlobalVariable(name: "ink_top", scope: !2, file: !15, line: 12, type: !5, isLocal: true, isDefinition: true)
!2 = distinct !DICompileUnit(language: DW_LANG_C11, file: !3, producer: "clang version 20.1.2 (https://github.com/ziglang/zig-bootstrap 7ef74e656cf8ddbd6bf891a8475892aa1afa6891)", isOptimized: true, runtimeVersion: 0, emissionKind: FullDebug, retainedTypes: !4, globals: !14, splitDebugInlining: false, nameTableKind: None)
!3 = !DIFile(filename: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_u32/prior/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
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
!15 = !DIFile(filename: "reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_u32/prior/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
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
!167 = distinct !DISubprogram(name: "lang_fn_pipeline38_left_padded_zip_u32", scope: !15, file: !15, line: 82, type: !168, scopeLine: 82, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !175)
!168 = !DISubroutineType(types: !169)
!169 = !{!170, !170, !170, !10, !10}
!170 = !DIDerivedType(tag: DW_TAG_typedef, name: "ink_l_uint32", file: !15, line: 65, baseType: !171)
!171 = distinct !DICompositeType(tag: DW_TAG_structure_type, file: !15, line: 65, size: 64, elements: !172)
!172 = !{!173, !174}
!173 = !DIDerivedType(tag: DW_TAG_member, name: "data", scope: !171, file: !15, line: 65, baseType: !13, size: 32)
!174 = !DIDerivedType(tag: DW_TAG_member, name: "len", scope: !171, file: !15, line: 65, baseType: !5, size: 32, offset: 32)
!175 = !{!176, !177, !178, !179, !180, !181, !182, !184, !187, !188, !189, !190, !191, !192, !195, !197, !198, !199, !200, !201, !202, !203, !204, !206, !209, !210, !211, !212, !213, !214, !215, !216, !217, !220, !222, !223, !224, !226, !229, !230, !231, !232, !233, !234, !237, !238, !240}
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
!197 = !DILocalVariable(name: "t11", scope: !167, file: !15, line: 114, type: !170)
!198 = !DILocalVariable(name: "t12", scope: !167, file: !15, line: 116, type: !170)
!199 = !DILocalVariable(name: "t13", scope: !167, file: !15, line: 119, type: !5)
!200 = !DILocalVariable(name: "t14", scope: !167, file: !15, line: 120, type: !170)
!201 = !DILocalVariable(name: "t15", scope: !167, file: !15, line: 123, type: !170)
!202 = !DILocalVariable(name: "t16", scope: !167, file: !15, line: 125, type: !170)
!203 = !DILocalVariable(name: "t17", scope: !167, file: !15, line: 127, type: !170)
!204 = !DILocalVariable(name: "t18", scope: !205, file: !15, line: 128, type: !5)
!205 = distinct !DILexicalBlock(scope: !167, file: !15, line: 128, column: 1)
!206 = !DILocalVariable(name: "t19", scope: !207, file: !15, line: 129, type: !10)
!207 = distinct !DILexicalBlock(scope: !208, file: !15, line: 128, column: 36)
!208 = distinct !DILexicalBlock(scope: !205, file: !15, line: 128, column: 1)
!209 = !DILocalVariable(name: "t20", scope: !207, file: !15, line: 131, type: !10)
!210 = !DILocalVariable(name: "t21", scope: !207, file: !15, line: 133, type: !10)
!211 = !DILocalVariable(name: "t22", scope: !207, file: !15, line: 135, type: !10)
!212 = !DILocalVariable(name: "t23", scope: !207, file: !15, line: 138, type: !10)
!213 = !DILocalVariable(name: "t24", scope: !207, file: !15, line: 140, type: !10)
!214 = !DILocalVariable(name: "t25", scope: !207, file: !15, line: 142, type: !10)
!215 = !DILocalVariable(name: "t26", scope: !207, file: !15, line: 146, type: !10)
!216 = !DILocalVariable(name: "t27", scope: !207, file: !15, line: 148, type: !10)
!217 = !DILocalVariable(name: "t28", scope: !218, file: !15, line: 150, type: !10)
!218 = distinct !DILexicalBlock(scope: !219, file: !15, line: 149, column: 18)
!219 = distinct !DILexicalBlock(scope: !207, file: !15, line: 149, column: 5)
!220 = !DILocalVariable(name: "t29", scope: !221, file: !15, line: 154, type: !10)
!221 = distinct !DILexicalBlock(scope: !219, file: !15, line: 153, column: 8)
!222 = !DILocalVariable(name: "t30", scope: !167, file: !15, line: 160, type: !170)
!223 = !DILocalVariable(name: "t31", scope: !167, file: !15, line: 162, type: !170)
!224 = !DILocalVariable(name: "t32", scope: !225, file: !15, line: 163, type: !5)
!225 = distinct !DILexicalBlock(scope: !167, file: !15, line: 163, column: 1)
!226 = !DILocalVariable(name: "t33", scope: !227, file: !15, line: 164, type: !10)
!227 = distinct !DILexicalBlock(scope: !228, file: !15, line: 163, column: 68)
!228 = distinct !DILexicalBlock(scope: !225, file: !15, line: 163, column: 1)
!229 = !DILocalVariable(name: "t34", scope: !227, file: !15, line: 166, type: !10)
!230 = !DILocalVariable(name: "t35", scope: !227, file: !15, line: 168, type: !10)
!231 = !DILocalVariable(name: "t36", scope: !227, file: !15, line: 170, type: !10)
!232 = !DILocalVariable(name: "t37", scope: !227, file: !15, line: 173, type: !10)
!233 = !DILocalVariable(name: "t38", scope: !227, file: !15, line: 175, type: !10)
!234 = !DILocalVariable(name: "t39", scope: !235, file: !15, line: 177, type: !10)
!235 = distinct !DILexicalBlock(scope: !236, file: !15, line: 176, column: 18)
!236 = distinct !DILexicalBlock(scope: !227, file: !15, line: 176, column: 5)
!237 = !DILocalVariable(name: "t40", scope: !235, file: !15, line: 179, type: !10)
!238 = !DILocalVariable(name: "t41", scope: !239, file: !15, line: 183, type: !10)
!239 = distinct !DILexicalBlock(scope: !236, file: !15, line: 182, column: 8)
!240 = !DILocalVariable(name: "t42", scope: !239, file: !15, line: 185, type: !10)
!241 = !DILocation(line: 82, column: 66, scope: !167)
!242 = !DILocation(line: 82, column: 82, scope: !167)
!243 = !DILocation(line: 0, scope: !167)
!244 = !DILocation(line: 87, column: 17, scope: !167)
!245 = !{!246, !246, i64 0}
!246 = !{!"p1 int", !247, i64 0}
!247 = !{!"any pointer", !29, i64 0}
!248 = !DILocation(line: 0, scope: !51, inlinedAt: !249)
!249 = distinct !DILocation(line: 89, column: 18, scope: !167)
!250 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !249)
!251 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !249)
!252 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !253)
!253 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !249)
!254 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !253)
!255 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !249)
!256 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !249)
!257 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !249)
!258 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !249)
!259 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !249)
!260 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !249)
!261 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !249)
!262 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !249)
!263 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !264)
!264 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !249)
!265 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !264)
!266 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !249)
!267 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !249)
!268 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !249)
!269 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !249)
!270 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !249)
!271 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !249)
!272 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !249)
!273 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !249)
!274 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !249)
!275 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !249)
!276 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !277)
!277 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !249)
!278 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !277)
!279 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !249)
!280 = !DILocation(line: 0, scope: !183)
!281 = !DILocation(line: 90, column: 19, scope: !186)
!282 = !DILocation(line: 90, column: 1, scope: !183)
!283 = !DILocation(line: 90, column: 29, scope: !186)
!284 = !DILocation(line: 93, column: 13, scope: !185)
!285 = !{!286, !286, i64 0}
!286 = !{!"int", !29, i64 0}
!287 = !DILocation(line: 103, column: 9, scope: !194)
!288 = !DILocation(line: 103, column: 5, scope: !194)
!289 = !DILocation(line: 112, column: 1, scope: !185)
!290 = !DILocation(line: 112, column: 12, scope: !185)
!291 = distinct !{!291, !282, !292, !137, !138, !139}
!292 = !DILocation(line: 113, column: 1, scope: !183)
!293 = !DILocation(line: 0, scope: !185)
!294 = !DILocation(line: 116, column: 18, scope: !167)
!295 = !DILocation(line: 118, column: 20, scope: !296)
!296 = distinct !DILexicalBlock(scope: !167, file: !15, line: 118, column: 4)
!297 = !DILocation(line: 118, column: 11, scope: !296)
!298 = distinct !{!298, !282, !292, !137, !138}
!299 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !300)
!300 = distinct !DILocation(line: 118, column: 30, scope: !296)
!301 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !300)
!302 = !DILocation(line: 119, column: 19, scope: !167)
!303 = !DILocation(line: 0, scope: !51, inlinedAt: !304)
!304 = distinct !DILocation(line: 120, column: 19, scope: !167)
!305 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !304)
!306 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !304)
!307 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !308)
!308 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !304)
!309 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !308)
!310 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !304)
!311 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !304)
!312 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !304)
!313 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !304)
!314 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !304)
!315 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !304)
!316 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !304)
!317 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !304)
!318 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !319)
!319 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !304)
!320 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !319)
!321 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !304)
!322 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !304)
!323 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !304)
!324 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !304)
!325 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !304)
!326 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !304)
!327 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !304)
!328 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !304)
!329 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !304)
!330 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !304)
!331 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !332)
!332 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !304)
!333 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !332)
!334 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !304)
!335 = !DILocation(line: 121, column: 35, scope: !167)
!336 = !DILocation(line: 0, scope: !111, inlinedAt: !337)
!337 = distinct !DILocation(line: 121, column: 1, scope: !167)
!338 = !DILocation(line: 0, scope: !123, inlinedAt: !337)
!339 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !337)
!340 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !337)
!341 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !337)
!342 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !337)
!343 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !337)
!344 = distinct !{!344, !339, !345, !137, !138, !139}
!345 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !337)
!346 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !337)
!347 = distinct !{!347, !339, !345, !137, !138}
!348 = !DILocation(line: 122, column: 18, scope: !167)
!349 = !DILocation(line: 122, column: 43, scope: !167)
!350 = !DILocation(line: 0, scope: !111, inlinedAt: !351)
!351 = distinct !DILocation(line: 122, column: 1, scope: !167)
!352 = !DILocation(line: 0, scope: !123, inlinedAt: !351)
!353 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !351)
!354 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !351)
!355 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !351)
!356 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !351)
!357 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !351)
!358 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !351)
!359 = distinct !{!359, !354, !360, !137, !138, !139}
!360 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !351)
!361 = distinct !{!361, !354, !360, !137, !138}
!362 = !DILocation(line: 0, scope: !51, inlinedAt: !363)
!363 = distinct !DILocation(line: 127, column: 19, scope: !167)
!364 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !363)
!365 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !366)
!366 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !363)
!367 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !366)
!368 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !363)
!369 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !363)
!370 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !363)
!371 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !363)
!372 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !363)
!373 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !363)
!374 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !375)
!375 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !363)
!376 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !375)
!377 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !363)
!378 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !363)
!379 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !363)
!380 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !363)
!381 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !363)
!382 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !363)
!383 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !363)
!384 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !363)
!385 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !363)
!386 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !363)
!387 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !388)
!388 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !363)
!389 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !388)
!390 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !363)
!391 = !DILocation(line: 0, scope: !205)
!392 = !DILocation(line: 128, column: 1, scope: !205)
!393 = !DILocation(line: 128, column: 33, scope: !208)
!394 = !DILocation(line: 131, column: 14, scope: !207)
!395 = !DILocation(line: 145, column: 18, scope: !396)
!396 = distinct !DILexicalBlock(scope: !397, file: !15, line: 145, column: 8)
!397 = distinct !DILexicalBlock(scope: !207, file: !15, line: 143, column: 5)
!398 = !DILocation(line: 149, column: 10, scope: !219)
!399 = !DILocation(line: 149, column: 5, scope: !219)
!400 = !DILocation(line: 158, column: 1, scope: !207)
!401 = !DILocation(line: 158, column: 14, scope: !207)
!402 = distinct !{!402, !392, !403, !137, !138, !139}
!403 = !DILocation(line: 159, column: 1, scope: !205)
!404 = !DILocation(line: 0, scope: !207)
!405 = !DILocation(line: 162, column: 14, scope: !167)
!406 = !DILocation(line: 162, column: 30, scope: !167)
!407 = !DILocation(line: 0, scope: !51, inlinedAt: !408)
!408 = distinct !DILocation(line: 162, column: 19, scope: !167)
!409 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !408)
!410 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !411)
!411 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !408)
!412 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !411)
!413 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !408)
!414 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !408)
!415 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !408)
!416 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !408)
!417 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !408)
!418 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !408)
!419 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !408)
!420 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !408)
!421 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !422)
!422 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !408)
!423 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !422)
!424 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !408)
!425 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !408)
!426 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !408)
!427 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !408)
!428 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !408)
!429 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !408)
!430 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !408)
!431 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !408)
!432 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !408)
!433 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !408)
!434 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !435)
!435 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !408)
!436 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !435)
!437 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !408)
!438 = !DILocation(line: 162, column: 18, scope: !167)
!439 = !{!440, !246, i64 0}
!440 = !{!"", !246, i64 0, !28, i64 4}
!441 = !{!440, !28, i64 4}
!442 = !DILocation(line: 0, scope: !225)
!443 = !DILocation(line: 163, column: 21, scope: !228)
!444 = !DILocation(line: 163, column: 1, scope: !225)
!445 = !DILocation(line: 163, column: 65, scope: !228)
!446 = !DILocation(line: 164, column: 14, scope: !227)
!447 = !DILocation(line: 166, column: 14, scope: !227)
!448 = !DILocation(line: 176, column: 10, scope: !236)
!449 = !DILocation(line: 176, column: 5, scope: !236)
!450 = !DILocation(line: 189, column: 1, scope: !227)
!451 = !DILocation(line: 189, column: 14, scope: !227)
!452 = distinct !{!452, !444, !453, !137, !138, !139}
!453 = !DILocation(line: 190, column: 1, scope: !225)
!454 = !DILocation(line: 0, scope: !227)
!455 = !DILocation(line: 128, column: 21, scope: !208)
!456 = distinct !{!456, !392, !403, !137, !138}
!457 = !DILocation(line: 192, column: 1, scope: !167)
!458 = distinct !{!458, !444, !453, !137, !138}
!459 = distinct !DISubprogram(name: "lang_fn_left_word", scope: !15, file: !15, line: 193, type: !460, scopeLine: 193, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !462)
!460 = !DISubroutineType(types: !461)
!461 = !{!10, !10, !10, !10, !10}
!462 = !{!463, !464, !465, !466, !467, !468, !469, !472}
!463 = !DILocalVariable(name: "a0", arg: 1, scope: !459, file: !15, line: 193, type: !10)
!464 = !DILocalVariable(name: "a1", arg: 2, scope: !459, file: !15, line: 193, type: !10)
!465 = !DILocalVariable(name: "a2", arg: 3, scope: !459, file: !15, line: 193, type: !10)
!466 = !DILocalVariable(name: "a3", arg: 4, scope: !459, file: !15, line: 193, type: !10)
!467 = !DILocalVariable(name: "t0", scope: !459, file: !15, line: 198, type: !10)
!468 = !DILocalVariable(name: "t1", scope: !459, file: !15, line: 200, type: !10)
!469 = !DILocalVariable(name: "t2", scope: !470, file: !15, line: 202, type: !10)
!470 = distinct !DILexicalBlock(scope: !471, file: !15, line: 201, column: 16)
!471 = distinct !DILexicalBlock(scope: !459, file: !15, line: 201, column: 5)
!472 = !DILocalVariable(name: "t3", scope: !473, file: !15, line: 206, type: !10)
!473 = distinct !DILexicalBlock(scope: !471, file: !15, line: 205, column: 8)
!474 = !DILocation(line: 0, scope: !459)
!475 = !DILocation(line: 201, column: 9, scope: !471)
!476 = !DILocation(line: 201, column: 5, scope: !471)
!477 = !DILocation(line: 210, column: 1, scope: !459)
!478 = distinct !DISubprogram(name: "lang_fn_right_word", scope: !15, file: !15, line: 212, type: !460, scopeLine: 212, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !479)
!479 = !{!480, !481, !482, !483, !484, !485, !486, !487, !488, !489, !492}
!480 = !DILocalVariable(name: "a0", arg: 1, scope: !478, file: !15, line: 212, type: !10)
!481 = !DILocalVariable(name: "a1", arg: 2, scope: !478, file: !15, line: 212, type: !10)
!482 = !DILocalVariable(name: "a2", arg: 3, scope: !478, file: !15, line: 212, type: !10)
!483 = !DILocalVariable(name: "a3", arg: 4, scope: !478, file: !15, line: 212, type: !10)
!484 = !DILocalVariable(name: "t0", scope: !478, file: !15, line: 217, type: !10)
!485 = !DILocalVariable(name: "t1", scope: !478, file: !15, line: 219, type: !10)
!486 = !DILocalVariable(name: "t2", scope: !478, file: !15, line: 221, type: !10)
!487 = !DILocalVariable(name: "t3", scope: !478, file: !15, line: 225, type: !10)
!488 = !DILocalVariable(name: "t4", scope: !478, file: !15, line: 227, type: !10)
!489 = !DILocalVariable(name: "t5", scope: !490, file: !15, line: 229, type: !10)
!490 = distinct !DILexicalBlock(scope: !491, file: !15, line: 228, column: 17)
!491 = distinct !DILexicalBlock(scope: !478, file: !15, line: 228, column: 5)
!492 = !DILocalVariable(name: "t6", scope: !493, file: !15, line: 233, type: !10)
!493 = distinct !DILexicalBlock(scope: !491, file: !15, line: 232, column: 8)
!494 = !DILocation(line: 0, scope: !478)
!495 = !DILocation(line: 224, column: 16, scope: !496)
!496 = distinct !DILexicalBlock(scope: !497, file: !15, line: 224, column: 8)
!497 = distinct !DILexicalBlock(scope: !478, file: !15, line: 222, column: 5)
!498 = !DILocation(line: 228, column: 9, scope: !491)
!499 = !DILocation(line: 228, column: 5, scope: !491)
!500 = !DILocation(line: 237, column: 1, scope: !478)
!501 = distinct !DISubprogram(name: "lang_fn_pair_word", scope: !15, file: !15, line: 239, type: !460, scopeLine: 239, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !502)
!502 = !{!503, !504, !505, !506, !507, !508, !509, !512, !513, !515}
!503 = !DILocalVariable(name: "a0", arg: 1, scope: !501, file: !15, line: 239, type: !10)
!504 = !DILocalVariable(name: "a1", arg: 2, scope: !501, file: !15, line: 239, type: !10)
!505 = !DILocalVariable(name: "a2", arg: 3, scope: !501, file: !15, line: 239, type: !10)
!506 = !DILocalVariable(name: "a3", arg: 4, scope: !501, file: !15, line: 239, type: !10)
!507 = !DILocalVariable(name: "t0", scope: !501, file: !15, line: 244, type: !10)
!508 = !DILocalVariable(name: "t1", scope: !501, file: !15, line: 246, type: !10)
!509 = !DILocalVariable(name: "t2", scope: !510, file: !15, line: 248, type: !10)
!510 = distinct !DILexicalBlock(scope: !511, file: !15, line: 247, column: 16)
!511 = distinct !DILexicalBlock(scope: !501, file: !15, line: 247, column: 5)
!512 = !DILocalVariable(name: "t3", scope: !510, file: !15, line: 250, type: !10)
!513 = !DILocalVariable(name: "t4", scope: !514, file: !15, line: 254, type: !10)
!514 = distinct !DILexicalBlock(scope: !511, file: !15, line: 253, column: 8)
!515 = !DILocalVariable(name: "t5", scope: !514, file: !15, line: 256, type: !10)
!516 = !DILocation(line: 0, scope: !501)
!517 = !DILocation(line: 247, column: 9, scope: !511)
!518 = !DILocation(line: 247, column: 5, scope: !511)
!519 = !DILocation(line: 260, column: 1, scope: !501)
!520 = distinct !DISubprogram(name: "lang_fn_pipeline38_left_padded_zip_u32_into", scope: !15, file: !15, line: 262, type: !521, scopeLine: 262, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !523)
!521 = !DISubroutineType(types: !522)
!522 = !{!5, !170, !170, !10, !10, !13}
!523 = !{!524, !525, !526, !527, !528, !529, !530, !531, !533, !536, !537, !538, !539, !540, !541, !544, !546, !547, !548, !549, !550, !551, !552, !553, !555, !558, !559, !560, !561, !562, !563, !564, !565, !566, !569, !571, !572, !573, !575, !578, !579, !580, !581, !582, !583, !586, !587, !589}
!524 = !DILocalVariable(name: "a0", arg: 1, scope: !520, file: !15, line: 262, type: !170)
!525 = !DILocalVariable(name: "a1", arg: 2, scope: !520, file: !15, line: 262, type: !170)
!526 = !DILocalVariable(name: "a2", arg: 3, scope: !520, file: !15, line: 262, type: !10)
!527 = !DILocalVariable(name: "a3", arg: 4, scope: !520, file: !15, line: 262, type: !10)
!528 = !DILocalVariable(name: "destination", arg: 5, scope: !520, file: !15, line: 262, type: !13)
!529 = !DILocalVariable(name: "t0", scope: !520, file: !15, line: 267, type: !170)
!530 = !DILocalVariable(name: "t1", scope: !520, file: !15, line: 269, type: !170)
!531 = !DILocalVariable(name: "t2", scope: !532, file: !15, line: 270, type: !5)
!532 = distinct !DILexicalBlock(scope: !520, file: !15, line: 270, column: 1)
!533 = !DILocalVariable(name: "t3", scope: !534, file: !15, line: 271, type: !10)
!534 = distinct !DILexicalBlock(scope: !535, file: !15, line: 270, column: 32)
!535 = distinct !DILexicalBlock(scope: !532, file: !15, line: 270, column: 1)
!536 = !DILocalVariable(name: "t4", scope: !534, file: !15, line: 273, type: !10)
!537 = !DILocalVariable(name: "t5", scope: !534, file: !15, line: 275, type: !10)
!538 = !DILocalVariable(name: "t6", scope: !534, file: !15, line: 277, type: !10)
!539 = !DILocalVariable(name: "t7", scope: !534, file: !15, line: 280, type: !10)
!540 = !DILocalVariable(name: "t8", scope: !534, file: !15, line: 282, type: !10)
!541 = !DILocalVariable(name: "t9", scope: !542, file: !15, line: 284, type: !10)
!542 = distinct !DILexicalBlock(scope: !543, file: !15, line: 283, column: 16)
!543 = distinct !DILexicalBlock(scope: !534, file: !15, line: 283, column: 5)
!544 = !DILocalVariable(name: "t10", scope: !545, file: !15, line: 288, type: !10)
!545 = distinct !DILexicalBlock(scope: !543, file: !15, line: 287, column: 8)
!546 = !DILocalVariable(name: "t11", scope: !520, file: !15, line: 294, type: !170)
!547 = !DILocalVariable(name: "t12", scope: !520, file: !15, line: 296, type: !170)
!548 = !DILocalVariable(name: "t13", scope: !520, file: !15, line: 299, type: !5)
!549 = !DILocalVariable(name: "t14", scope: !520, file: !15, line: 300, type: !170)
!550 = !DILocalVariable(name: "t15", scope: !520, file: !15, line: 303, type: !170)
!551 = !DILocalVariable(name: "t16", scope: !520, file: !15, line: 305, type: !170)
!552 = !DILocalVariable(name: "t17", scope: !520, file: !15, line: 307, type: !170)
!553 = !DILocalVariable(name: "t18", scope: !554, file: !15, line: 308, type: !5)
!554 = distinct !DILexicalBlock(scope: !520, file: !15, line: 308, column: 1)
!555 = !DILocalVariable(name: "t19", scope: !556, file: !15, line: 309, type: !10)
!556 = distinct !DILexicalBlock(scope: !557, file: !15, line: 308, column: 36)
!557 = distinct !DILexicalBlock(scope: !554, file: !15, line: 308, column: 1)
!558 = !DILocalVariable(name: "t20", scope: !556, file: !15, line: 311, type: !10)
!559 = !DILocalVariable(name: "t21", scope: !556, file: !15, line: 313, type: !10)
!560 = !DILocalVariable(name: "t22", scope: !556, file: !15, line: 315, type: !10)
!561 = !DILocalVariable(name: "t23", scope: !556, file: !15, line: 318, type: !10)
!562 = !DILocalVariable(name: "t24", scope: !556, file: !15, line: 320, type: !10)
!563 = !DILocalVariable(name: "t25", scope: !556, file: !15, line: 322, type: !10)
!564 = !DILocalVariable(name: "t26", scope: !556, file: !15, line: 326, type: !10)
!565 = !DILocalVariable(name: "t27", scope: !556, file: !15, line: 328, type: !10)
!566 = !DILocalVariable(name: "t28", scope: !567, file: !15, line: 330, type: !10)
!567 = distinct !DILexicalBlock(scope: !568, file: !15, line: 329, column: 18)
!568 = distinct !DILexicalBlock(scope: !556, file: !15, line: 329, column: 5)
!569 = !DILocalVariable(name: "t29", scope: !570, file: !15, line: 334, type: !10)
!570 = distinct !DILexicalBlock(scope: !568, file: !15, line: 333, column: 8)
!571 = !DILocalVariable(name: "t30", scope: !520, file: !15, line: 340, type: !170)
!572 = !DILocalVariable(name: "t31", scope: !520, file: !15, line: 342, type: !170)
!573 = !DILocalVariable(name: "t32", scope: !574, file: !15, line: 343, type: !5)
!574 = distinct !DILexicalBlock(scope: !520, file: !15, line: 343, column: 1)
!575 = !DILocalVariable(name: "t33", scope: !576, file: !15, line: 344, type: !10)
!576 = distinct !DILexicalBlock(scope: !577, file: !15, line: 343, column: 68)
!577 = distinct !DILexicalBlock(scope: !574, file: !15, line: 343, column: 1)
!578 = !DILocalVariable(name: "t34", scope: !576, file: !15, line: 346, type: !10)
!579 = !DILocalVariable(name: "t35", scope: !576, file: !15, line: 348, type: !10)
!580 = !DILocalVariable(name: "t36", scope: !576, file: !15, line: 350, type: !10)
!581 = !DILocalVariable(name: "t37", scope: !576, file: !15, line: 353, type: !10)
!582 = !DILocalVariable(name: "t38", scope: !576, file: !15, line: 355, type: !10)
!583 = !DILocalVariable(name: "t39", scope: !584, file: !15, line: 357, type: !10)
!584 = distinct !DILexicalBlock(scope: !585, file: !15, line: 356, column: 18)
!585 = distinct !DILexicalBlock(scope: !576, file: !15, line: 356, column: 5)
!586 = !DILocalVariable(name: "t40", scope: !584, file: !15, line: 359, type: !10)
!587 = !DILocalVariable(name: "t41", scope: !588, file: !15, line: 363, type: !10)
!588 = distinct !DILexicalBlock(scope: !585, file: !15, line: 362, column: 8)
!589 = !DILocalVariable(name: "t42", scope: !588, file: !15, line: 365, type: !10)
!590 = !DILocation(line: 262, column: 65, scope: !520)
!591 = !DILocation(line: 262, column: 81, scope: !520)
!592 = !DILocation(line: 0, scope: !520)
!593 = !DILocation(line: 267, column: 17, scope: !520)
!594 = !DILocation(line: 0, scope: !51, inlinedAt: !595)
!595 = distinct !DILocation(line: 269, column: 18, scope: !520)
!596 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !595)
!597 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !595)
!598 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !599)
!599 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !595)
!600 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !599)
!601 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !595)
!602 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !595)
!603 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !595)
!604 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !595)
!605 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !595)
!606 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !595)
!607 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !595)
!608 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !595)
!609 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !610)
!610 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !595)
!611 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !610)
!612 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !595)
!613 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !595)
!614 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !595)
!615 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !595)
!616 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !595)
!617 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !595)
!618 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !595)
!619 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !595)
!620 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !595)
!621 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !595)
!622 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !623)
!623 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !595)
!624 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !623)
!625 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !595)
!626 = !DILocation(line: 0, scope: !532)
!627 = !DILocation(line: 270, column: 19, scope: !535)
!628 = !DILocation(line: 270, column: 1, scope: !532)
!629 = !DILocation(line: 270, column: 29, scope: !535)
!630 = !DILocation(line: 273, column: 13, scope: !534)
!631 = !DILocation(line: 283, column: 9, scope: !543)
!632 = !DILocation(line: 283, column: 5, scope: !543)
!633 = !DILocation(line: 292, column: 1, scope: !534)
!634 = !DILocation(line: 292, column: 12, scope: !534)
!635 = distinct !{!635, !628, !636, !137, !138, !139}
!636 = !DILocation(line: 293, column: 1, scope: !532)
!637 = !DILocation(line: 0, scope: !534)
!638 = !DILocation(line: 296, column: 18, scope: !520)
!639 = !DILocation(line: 298, column: 20, scope: !640)
!640 = distinct !DILexicalBlock(scope: !520, file: !15, line: 298, column: 4)
!641 = !DILocation(line: 298, column: 11, scope: !640)
!642 = distinct !{!642, !628, !636, !137, !138}
!643 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !644)
!644 = distinct !DILocation(line: 298, column: 30, scope: !640)
!645 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !644)
!646 = !DILocation(line: 299, column: 19, scope: !520)
!647 = !DILocation(line: 0, scope: !51, inlinedAt: !648)
!648 = distinct !DILocation(line: 300, column: 19, scope: !520)
!649 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !648)
!650 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !648)
!651 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !652)
!652 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !648)
!653 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !652)
!654 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !648)
!655 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !648)
!656 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !648)
!657 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !648)
!658 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !648)
!659 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !648)
!660 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !648)
!661 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !648)
!662 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !663)
!663 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !648)
!664 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !663)
!665 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !648)
!666 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !648)
!667 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !648)
!668 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !648)
!669 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !648)
!670 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !648)
!671 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !648)
!672 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !648)
!673 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !648)
!674 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !648)
!675 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !676)
!676 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !648)
!677 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !676)
!678 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !648)
!679 = !DILocation(line: 301, column: 35, scope: !520)
!680 = !DILocation(line: 0, scope: !111, inlinedAt: !681)
!681 = distinct !DILocation(line: 301, column: 1, scope: !520)
!682 = !DILocation(line: 0, scope: !123, inlinedAt: !681)
!683 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !681)
!684 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !681)
!685 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !681)
!686 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !681)
!687 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !681)
!688 = distinct !{!688, !683, !689, !137, !138, !139}
!689 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !681)
!690 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !681)
!691 = distinct !{!691, !683, !689, !137, !138}
!692 = !DILocation(line: 302, column: 18, scope: !520)
!693 = !DILocation(line: 302, column: 43, scope: !520)
!694 = !DILocation(line: 0, scope: !111, inlinedAt: !695)
!695 = distinct !DILocation(line: 302, column: 1, scope: !520)
!696 = !DILocation(line: 0, scope: !123, inlinedAt: !695)
!697 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !695)
!698 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !695)
!699 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !695)
!700 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !695)
!701 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !695)
!702 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !695)
!703 = distinct !{!703, !698, !704, !137, !138, !139}
!704 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !695)
!705 = distinct !{!705, !698, !704, !137, !138}
!706 = !DILocation(line: 0, scope: !51, inlinedAt: !707)
!707 = distinct !DILocation(line: 307, column: 19, scope: !520)
!708 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !707)
!709 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !710)
!710 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !707)
!711 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !710)
!712 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !707)
!713 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !707)
!714 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !707)
!715 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !707)
!716 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !707)
!717 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !707)
!718 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !719)
!719 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !707)
!720 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !719)
!721 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !707)
!722 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !707)
!723 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !707)
!724 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !707)
!725 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !707)
!726 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !707)
!727 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !707)
!728 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !707)
!729 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !707)
!730 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !707)
!731 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !732)
!732 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !707)
!733 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !732)
!734 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !707)
!735 = !DILocation(line: 0, scope: !554)
!736 = !DILocation(line: 308, column: 1, scope: !554)
!737 = !DILocation(line: 308, column: 33, scope: !557)
!738 = !DILocation(line: 311, column: 14, scope: !556)
!739 = !DILocation(line: 325, column: 18, scope: !740)
!740 = distinct !DILexicalBlock(scope: !741, file: !15, line: 325, column: 8)
!741 = distinct !DILexicalBlock(scope: !556, file: !15, line: 323, column: 5)
!742 = !DILocation(line: 329, column: 10, scope: !568)
!743 = !DILocation(line: 329, column: 5, scope: !568)
!744 = !DILocation(line: 338, column: 1, scope: !556)
!745 = !DILocation(line: 338, column: 14, scope: !556)
!746 = distinct !{!746, !736, !747, !137, !138, !139}
!747 = !DILocation(line: 339, column: 1, scope: !554)
!748 = !DILocation(line: 0, scope: !556)
!749 = !DILocation(line: 342, column: 32, scope: !520)
!750 = !DILocation(line: 0, scope: !574)
!751 = !DILocation(line: 343, column: 21, scope: !577)
!752 = !DILocation(line: 343, column: 1, scope: !574)
!753 = !DILocation(line: 343, column: 65, scope: !577)
!754 = !DILocation(line: 344, column: 14, scope: !576)
!755 = !DILocation(line: 346, column: 14, scope: !576)
!756 = !DILocation(line: 356, column: 10, scope: !585)
!757 = !DILocation(line: 356, column: 5, scope: !585)
!758 = !DILocation(line: 369, column: 1, scope: !576)
!759 = !DILocation(line: 369, column: 14, scope: !576)
!760 = distinct !{!760, !752, !761, !137, !138, !139}
!761 = !DILocation(line: 370, column: 1, scope: !574)
!762 = !DILocation(line: 0, scope: !576)
!763 = !DILocation(line: 308, column: 21, scope: !557)
!764 = distinct !{!764, !736, !747, !137, !138}
!765 = !DILocation(line: 371, column: 1, scope: !520)
!766 = distinct !{!766, !752, !761, !137, !138}
!767 = distinct !DISubprogram(name: "ink_compute_into", scope: !15, file: !15, line: 373, type: !768, scopeLine: 373, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !774)
!768 = !DISubroutineType(types: !769)
!769 = !{!5, !10, !770, !772, !8}
!770 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !771, size: 32)
!771 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !103)
!772 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !773, size: 32)
!773 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !5)
!774 = !{!775, !776, !777, !778, !779, !782, !783, !784}
!775 = !DILocalVariable(name: "function", arg: 1, scope: !767, file: !15, line: 373, type: !10)
!776 = !DILocalVariable(name: "data", arg: 2, scope: !767, file: !15, line: 373, type: !770)
!777 = !DILocalVariable(name: "lengths", arg: 3, scope: !767, file: !15, line: 373, type: !772)
!778 = !DILocalVariable(name: "destination", arg: 4, scope: !767, file: !15, line: 373, type: !8)
!779 = !DILocalVariable(name: "a0", scope: !780, file: !15, line: 374, type: !13)
!780 = distinct !DILexicalBlock(scope: !781, file: !15, line: 374, column: 8)
!781 = distinct !DILexicalBlock(scope: !767, file: !15, line: 373, column: 167)
!782 = !DILocalVariable(name: "a1", scope: !780, file: !15, line: 374, type: !13)
!783 = !DILocalVariable(name: "a2", scope: !780, file: !15, line: 374, type: !10)
!784 = !DILocalVariable(name: "a3", scope: !780, file: !15, line: 374, type: !10)
!785 = !DILocation(line: 0, scope: !111, inlinedAt: !786)
!786 = distinct !DILocation(line: 374, column: 87, scope: !780)
!787 = !DILocation(line: 0, scope: !111, inlinedAt: !788)
!788 = distinct !DILocation(line: 374, column: 132, scope: !780)
!789 = !DILocation(line: 0, scope: !767)
!790 = !DILocation(line: 373, column: 151, scope: !767)
!791 = !DILocation(line: 374, column: 34, scope: !780)
!792 = !{!247, !247, i64 0}
!793 = !DILocation(line: 0, scope: !780)
!794 = !DILocation(line: 374, column: 67, scope: !780)
!795 = !DILocation(line: 374, column: 100, scope: !780)
!796 = !DILocation(line: 0, scope: !123, inlinedAt: !786)
!797 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !786)
!798 = !DILocation(line: 374, column: 145, scope: !780)
!799 = !DILocation(line: 0, scope: !123, inlinedAt: !788)
!800 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !788)
!801 = !DILocation(line: 374, column: 230, scope: !780)
!802 = !DILocation(line: 374, column: 234, scope: !780)
!803 = !DILocation(line: 374, column: 260, scope: !780)
!804 = !DILocation(line: 374, column: 264, scope: !780)
!805 = !DILocation(line: 374, column: 279, scope: !780)
!806 = !DILocation(line: 374, column: 172, scope: !780)
!807 = !DILocation(line: 375, column: 30, scope: !767)
!808 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !809)
!809 = distinct !DILocation(line: 375, column: 9, scope: !781)
!810 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !809)
!811 = distinct !DISubprogram(name: "ink_compute_call", scope: !15, file: !15, line: 376, type: !812, scopeLine: 376, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !816)
!812 = !DISubroutineType(types: !813)
!813 = !{null, !10, !770, !772, !814, !815}
!814 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !8, size: 32)
!815 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !5, size: 32)
!816 = !{!817, !818, !819, !820, !821, !822, !825, !826, !827, !828, !829, !831, !832, !833, !834, !835, !836, !838, !839, !840, !841, !842, !843, !845, !846, !847, !848, !849}
!817 = !DILocalVariable(name: "function", arg: 1, scope: !811, file: !15, line: 376, type: !10)
!818 = !DILocalVariable(name: "data", arg: 2, scope: !811, file: !15, line: 376, type: !770)
!819 = !DILocalVariable(name: "lengths", arg: 3, scope: !811, file: !15, line: 376, type: !772)
!820 = !DILocalVariable(name: "output", arg: 4, scope: !811, file: !15, line: 376, type: !814)
!821 = !DILocalVariable(name: "count", arg: 5, scope: !811, file: !15, line: 376, type: !815)
!822 = !DILocalVariable(name: "a0", scope: !823, file: !15, line: 377, type: !13)
!823 = distinct !DILexicalBlock(scope: !824, file: !15, line: 377, column: 8)
!824 = distinct !DILexicalBlock(scope: !811, file: !15, line: 376, column: 158)
!825 = !DILocalVariable(name: "a1", scope: !823, file: !15, line: 377, type: !13)
!826 = !DILocalVariable(name: "a2", scope: !823, file: !15, line: 377, type: !10)
!827 = !DILocalVariable(name: "a3", scope: !823, file: !15, line: 377, type: !10)
!828 = !DILocalVariable(name: "result", scope: !823, file: !15, line: 377, type: !170)
!829 = !DILocalVariable(name: "a0", scope: !830, file: !15, line: 378, type: !10)
!830 = distinct !DILexicalBlock(scope: !824, file: !15, line: 378, column: 8)
!831 = !DILocalVariable(name: "a1", scope: !830, file: !15, line: 378, type: !10)
!832 = !DILocalVariable(name: "a2", scope: !830, file: !15, line: 378, type: !10)
!833 = !DILocalVariable(name: "a3", scope: !830, file: !15, line: 378, type: !10)
!834 = !DILocalVariable(name: "result", scope: !830, file: !15, line: 378, type: !10)
!835 = !DILocalVariable(name: "copy", scope: !830, file: !15, line: 378, type: !13)
!836 = !DILocalVariable(name: "a0", scope: !837, file: !15, line: 379, type: !10)
!837 = distinct !DILexicalBlock(scope: !824, file: !15, line: 379, column: 8)
!838 = !DILocalVariable(name: "a1", scope: !837, file: !15, line: 379, type: !10)
!839 = !DILocalVariable(name: "a2", scope: !837, file: !15, line: 379, type: !10)
!840 = !DILocalVariable(name: "a3", scope: !837, file: !15, line: 379, type: !10)
!841 = !DILocalVariable(name: "result", scope: !837, file: !15, line: 379, type: !10)
!842 = !DILocalVariable(name: "copy", scope: !837, file: !15, line: 379, type: !13)
!843 = !DILocalVariable(name: "a0", scope: !844, file: !15, line: 380, type: !10)
!844 = distinct !DILexicalBlock(scope: !824, file: !15, line: 380, column: 8)
!845 = !DILocalVariable(name: "a1", scope: !844, file: !15, line: 380, type: !10)
!846 = !DILocalVariable(name: "a2", scope: !844, file: !15, line: 380, type: !10)
!847 = !DILocalVariable(name: "a3", scope: !844, file: !15, line: 380, type: !10)
!848 = !DILocalVariable(name: "result", scope: !844, file: !15, line: 380, type: !10)
!849 = !DILocalVariable(name: "copy", scope: !844, file: !15, line: 380, type: !13)
!850 = !DILocation(line: 0, scope: !111, inlinedAt: !851)
!851 = distinct !DILocation(line: 377, column: 87, scope: !823)
!852 = !DILocation(line: 0, scope: !111, inlinedAt: !853)
!853 = distinct !DILocation(line: 377, column: 132, scope: !823)
!854 = distinct !DIAssignID()
!855 = !DILocation(line: 0, scope: !823)
!856 = !DILocation(line: 0, scope: !111, inlinedAt: !857)
!857 = distinct !DILocation(line: 378, column: 21, scope: !830)
!858 = !DILocation(line: 0, scope: !111, inlinedAt: !859)
!859 = distinct !DILocation(line: 378, column: 66, scope: !830)
!860 = !DILocation(line: 0, scope: !111, inlinedAt: !861)
!861 = distinct !DILocation(line: 378, column: 111, scope: !830)
!862 = !DILocation(line: 0, scope: !111, inlinedAt: !863)
!863 = distinct !DILocation(line: 378, column: 156, scope: !830)
!864 = !DILocation(line: 0, scope: !111, inlinedAt: !865)
!865 = distinct !DILocation(line: 379, column: 21, scope: !837)
!866 = !DILocation(line: 0, scope: !111, inlinedAt: !867)
!867 = distinct !DILocation(line: 379, column: 66, scope: !837)
!868 = !DILocation(line: 0, scope: !111, inlinedAt: !869)
!869 = distinct !DILocation(line: 379, column: 111, scope: !837)
!870 = !DILocation(line: 0, scope: !111, inlinedAt: !871)
!871 = distinct !DILocation(line: 379, column: 156, scope: !837)
!872 = !DILocation(line: 0, scope: !111, inlinedAt: !873)
!873 = distinct !DILocation(line: 380, column: 21, scope: !844)
!874 = !DILocation(line: 0, scope: !111, inlinedAt: !875)
!875 = distinct !DILocation(line: 380, column: 66, scope: !844)
!876 = !DILocation(line: 0, scope: !111, inlinedAt: !877)
!877 = distinct !DILocation(line: 380, column: 111, scope: !844)
!878 = !DILocation(line: 0, scope: !111, inlinedAt: !879)
!879 = distinct !DILocation(line: 380, column: 156, scope: !844)
!880 = !DILocation(line: 0, scope: !811)
!881 = !DILocation(line: 376, column: 142, scope: !811)
!882 = !DILocation(line: 377, column: 34, scope: !823)
!883 = !DILocation(line: 377, column: 67, scope: !823)
!884 = !DILocation(line: 377, column: 100, scope: !823)
!885 = !DILocation(line: 0, scope: !123, inlinedAt: !851)
!886 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !851)
!887 = !DILocation(line: 377, column: 145, scope: !823)
!888 = !DILocation(line: 0, scope: !123, inlinedAt: !853)
!889 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !853)
!890 = !DILocation(line: 377, column: 165, scope: !823)
!891 = !DILocation(line: 377, column: 238, scope: !823)
!892 = !DILocation(line: 377, column: 242, scope: !823)
!893 = !DILocation(line: 377, column: 268, scope: !823)
!894 = !DILocation(line: 377, column: 272, scope: !823)
!895 = !DILocation(line: 377, column: 287, scope: !823)
!896 = !DILocation(line: 377, column: 185, scope: !823)
!897 = !DILocation(line: 377, column: 306, scope: !823)
!898 = !DILocation(line: 377, column: 298, scope: !823)
!899 = !DILocation(line: 377, column: 325, scope: !823)
!900 = !DILocation(line: 377, column: 317, scope: !823)
!901 = !DILocation(line: 377, column: 337, scope: !824)
!902 = !DILocation(line: 378, column: 34, scope: !830)
!903 = !DILocation(line: 0, scope: !123, inlinedAt: !857)
!904 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !857)
!905 = !DILocation(line: 0, scope: !830)
!906 = !DILocation(line: 378, column: 79, scope: !830)
!907 = !DILocation(line: 0, scope: !123, inlinedAt: !859)
!908 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !859)
!909 = !DILocation(line: 378, column: 124, scope: !830)
!910 = !DILocation(line: 0, scope: !123, inlinedAt: !861)
!911 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !861)
!912 = !DILocation(line: 378, column: 169, scope: !830)
!913 = !DILocation(line: 0, scope: !123, inlinedAt: !863)
!914 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !863)
!915 = !DILocation(line: 378, column: 226, scope: !830)
!916 = !DILocation(line: 378, column: 229, scope: !830)
!917 = !DILocation(line: 378, column: 232, scope: !830)
!918 = !DILocation(line: 201, column: 9, scope: !471, inlinedAt: !919)
!919 = distinct !DILocation(line: 378, column: 205, scope: !830)
!920 = !DILocation(line: 0, scope: !459, inlinedAt: !919)
!921 = !DILocation(line: 201, column: 5, scope: !471, inlinedAt: !919)
!922 = !DILocation(line: 0, scope: !51, inlinedAt: !923)
!923 = distinct !DILocation(line: 378, column: 251, scope: !830)
!924 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !923)
!925 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !926)
!926 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !923)
!927 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !926)
!928 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !923)
!929 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !923)
!930 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !923)
!931 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !923)
!932 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !923)
!933 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !923)
!934 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !923)
!935 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !923)
!936 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !923)
!937 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !923)
!938 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !923)
!939 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !923)
!940 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !923)
!941 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !923)
!942 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !943)
!943 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !923)
!944 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !943)
!945 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !923)
!946 = !DILocation(line: 378, column: 284, scope: !830)
!947 = !DILocation(line: 378, column: 299, scope: !830)
!948 = !DILocation(line: 378, column: 311, scope: !830)
!949 = !DILocation(line: 379, column: 34, scope: !837)
!950 = !DILocation(line: 0, scope: !123, inlinedAt: !865)
!951 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !865)
!952 = !DILocation(line: 0, scope: !837)
!953 = !DILocation(line: 379, column: 79, scope: !837)
!954 = !DILocation(line: 0, scope: !123, inlinedAt: !867)
!955 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !867)
!956 = !DILocation(line: 379, column: 124, scope: !837)
!957 = !DILocation(line: 0, scope: !123, inlinedAt: !869)
!958 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !869)
!959 = !DILocation(line: 379, column: 169, scope: !837)
!960 = !DILocation(line: 0, scope: !123, inlinedAt: !871)
!961 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !871)
!962 = !DILocation(line: 379, column: 227, scope: !837)
!963 = !DILocation(line: 379, column: 230, scope: !837)
!964 = !DILocation(line: 379, column: 233, scope: !837)
!965 = !DILocation(line: 224, column: 16, scope: !496, inlinedAt: !966)
!966 = distinct !DILocation(line: 379, column: 205, scope: !837)
!967 = !DILocation(line: 0, scope: !478, inlinedAt: !966)
!968 = !DILocation(line: 228, column: 9, scope: !491, inlinedAt: !966)
!969 = !DILocation(line: 228, column: 5, scope: !491, inlinedAt: !966)
!970 = !DILocation(line: 0, scope: !51, inlinedAt: !971)
!971 = distinct !DILocation(line: 379, column: 252, scope: !837)
!972 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !971)
!973 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !974)
!974 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !971)
!975 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !974)
!976 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !971)
!977 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !971)
!978 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !971)
!979 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !971)
!980 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !971)
!981 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !971)
!982 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !971)
!983 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !971)
!984 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !971)
!985 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !971)
!986 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !971)
!987 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !971)
!988 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !971)
!989 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !971)
!990 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !991)
!991 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !971)
!992 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !991)
!993 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !971)
!994 = !DILocation(line: 379, column: 285, scope: !837)
!995 = !DILocation(line: 379, column: 300, scope: !837)
!996 = !DILocation(line: 379, column: 312, scope: !837)
!997 = !DILocation(line: 380, column: 34, scope: !844)
!998 = !DILocation(line: 0, scope: !123, inlinedAt: !873)
!999 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !873)
!1000 = !DILocation(line: 0, scope: !844)
!1001 = !DILocation(line: 380, column: 79, scope: !844)
!1002 = !DILocation(line: 0, scope: !123, inlinedAt: !875)
!1003 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !875)
!1004 = !DILocation(line: 380, column: 124, scope: !844)
!1005 = !DILocation(line: 0, scope: !123, inlinedAt: !877)
!1006 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !877)
!1007 = !DILocation(line: 380, column: 169, scope: !844)
!1008 = !DILocation(line: 0, scope: !123, inlinedAt: !879)
!1009 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !879)
!1010 = !DILocation(line: 380, column: 226, scope: !844)
!1011 = !DILocation(line: 380, column: 229, scope: !844)
!1012 = !DILocation(line: 380, column: 232, scope: !844)
!1013 = !DILocation(line: 247, column: 9, scope: !511, inlinedAt: !1014)
!1014 = distinct !DILocation(line: 380, column: 205, scope: !844)
!1015 = !DILocation(line: 0, scope: !501, inlinedAt: !1014)
!1016 = !DILocation(line: 247, column: 5, scope: !511, inlinedAt: !1014)
!1017 = !DILocation(line: 0, scope: !51, inlinedAt: !1018)
!1018 = distinct !DILocation(line: 380, column: 251, scope: !844)
!1019 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1018)
!1020 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1021)
!1021 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1018)
!1022 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1021)
!1023 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1018)
!1024 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1018)
!1025 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1018)
!1026 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1018)
!1027 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1018)
!1028 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1018)
!1029 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1018)
!1030 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1018)
!1031 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1018)
!1032 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1018)
!1033 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1018)
!1034 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1018)
!1035 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1018)
!1036 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1018)
!1037 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1038)
!1038 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1018)
!1039 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1038)
!1040 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !1018)
!1041 = !DILocation(line: 380, column: 284, scope: !844)
!1042 = !DILocation(line: 380, column: 299, scope: !844)
!1043 = !DILocation(line: 380, column: 311, scope: !844)
!1044 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1045)
!1045 = distinct !DILocation(line: 381, column: 9, scope: !824)
!1046 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1045)
!1047 = !DILocation(line: 381, column: 21, scope: !811)
!1048 = distinct !DISubprogram(name: "ink_compute_scalar32", scope: !15, file: !15, line: 382, type: !1049, scopeLine: 382, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !1051)
!1049 = !DISubroutineType(types: !1050)
!1050 = !{!10, !10, !770, !772}
!1051 = !{!1052, !1053, !1054, !1055, !1058, !1059, !1060, !1061, !1062, !1064, !1065, !1066, !1067, !1068, !1070, !1071, !1072, !1073}
!1052 = !DILocalVariable(name: "function", arg: 1, scope: !1048, file: !15, line: 382, type: !10)
!1053 = !DILocalVariable(name: "data", arg: 2, scope: !1048, file: !15, line: 382, type: !770)
!1054 = !DILocalVariable(name: "lengths", arg: 3, scope: !1048, file: !15, line: 382, type: !772)
!1055 = !DILocalVariable(name: "a0", scope: !1056, file: !15, line: 383, type: !10)
!1056 = distinct !DILexicalBlock(scope: !1057, file: !15, line: 383, column: 8)
!1057 = distinct !DILexicalBlock(scope: !1048, file: !15, line: 382, column: 138)
!1058 = !DILocalVariable(name: "a1", scope: !1056, file: !15, line: 383, type: !10)
!1059 = !DILocalVariable(name: "a2", scope: !1056, file: !15, line: 383, type: !10)
!1060 = !DILocalVariable(name: "a3", scope: !1056, file: !15, line: 383, type: !10)
!1061 = !DILocalVariable(name: "result", scope: !1056, file: !15, line: 383, type: !10)
!1062 = !DILocalVariable(name: "a0", scope: !1063, file: !15, line: 384, type: !10)
!1063 = distinct !DILexicalBlock(scope: !1057, file: !15, line: 384, column: 8)
!1064 = !DILocalVariable(name: "a1", scope: !1063, file: !15, line: 384, type: !10)
!1065 = !DILocalVariable(name: "a2", scope: !1063, file: !15, line: 384, type: !10)
!1066 = !DILocalVariable(name: "a3", scope: !1063, file: !15, line: 384, type: !10)
!1067 = !DILocalVariable(name: "result", scope: !1063, file: !15, line: 384, type: !10)
!1068 = !DILocalVariable(name: "a0", scope: !1069, file: !15, line: 385, type: !10)
!1069 = distinct !DILexicalBlock(scope: !1057, file: !15, line: 385, column: 8)
!1070 = !DILocalVariable(name: "a1", scope: !1069, file: !15, line: 385, type: !10)
!1071 = !DILocalVariable(name: "a2", scope: !1069, file: !15, line: 385, type: !10)
!1072 = !DILocalVariable(name: "a3", scope: !1069, file: !15, line: 385, type: !10)
!1073 = !DILocalVariable(name: "result", scope: !1069, file: !15, line: 385, type: !10)
!1074 = !DILocation(line: 0, scope: !111, inlinedAt: !1075)
!1075 = distinct !DILocation(line: 383, column: 21, scope: !1056)
!1076 = !DILocation(line: 0, scope: !111, inlinedAt: !1077)
!1077 = distinct !DILocation(line: 383, column: 66, scope: !1056)
!1078 = !DILocation(line: 0, scope: !111, inlinedAt: !1079)
!1079 = distinct !DILocation(line: 383, column: 111, scope: !1056)
!1080 = !DILocation(line: 0, scope: !111, inlinedAt: !1081)
!1081 = distinct !DILocation(line: 383, column: 156, scope: !1056)
!1082 = !DILocation(line: 0, scope: !111, inlinedAt: !1083)
!1083 = distinct !DILocation(line: 384, column: 21, scope: !1063)
!1084 = !DILocation(line: 0, scope: !111, inlinedAt: !1085)
!1085 = distinct !DILocation(line: 384, column: 66, scope: !1063)
!1086 = !DILocation(line: 0, scope: !111, inlinedAt: !1087)
!1087 = distinct !DILocation(line: 384, column: 111, scope: !1063)
!1088 = !DILocation(line: 0, scope: !111, inlinedAt: !1089)
!1089 = distinct !DILocation(line: 384, column: 156, scope: !1063)
!1090 = !DILocation(line: 0, scope: !111, inlinedAt: !1091)
!1091 = distinct !DILocation(line: 385, column: 21, scope: !1069)
!1092 = !DILocation(line: 0, scope: !111, inlinedAt: !1093)
!1093 = distinct !DILocation(line: 385, column: 66, scope: !1069)
!1094 = !DILocation(line: 0, scope: !111, inlinedAt: !1095)
!1095 = distinct !DILocation(line: 385, column: 111, scope: !1069)
!1096 = !DILocation(line: 0, scope: !111, inlinedAt: !1097)
!1097 = distinct !DILocation(line: 385, column: 156, scope: !1069)
!1098 = !DILocation(line: 0, scope: !1048)
!1099 = !DILocation(line: 382, column: 122, scope: !1048)
!1100 = !DILocation(line: 383, column: 34, scope: !1056)
!1101 = !DILocation(line: 0, scope: !123, inlinedAt: !1075)
!1102 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1075)
!1103 = !DILocation(line: 0, scope: !1056)
!1104 = !DILocation(line: 383, column: 79, scope: !1056)
!1105 = !DILocation(line: 0, scope: !123, inlinedAt: !1077)
!1106 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1077)
!1107 = !DILocation(line: 383, column: 124, scope: !1056)
!1108 = !DILocation(line: 0, scope: !123, inlinedAt: !1079)
!1109 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1079)
!1110 = !DILocation(line: 383, column: 169, scope: !1056)
!1111 = !DILocation(line: 0, scope: !123, inlinedAt: !1081)
!1112 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1081)
!1113 = !DILocation(line: 383, column: 226, scope: !1056)
!1114 = !DILocation(line: 383, column: 229, scope: !1056)
!1115 = !DILocation(line: 383, column: 232, scope: !1056)
!1116 = !DILocation(line: 201, column: 9, scope: !471, inlinedAt: !1117)
!1117 = distinct !DILocation(line: 383, column: 205, scope: !1056)
!1118 = !DILocation(line: 0, scope: !459, inlinedAt: !1117)
!1119 = !DILocation(line: 201, column: 5, scope: !471, inlinedAt: !1117)
!1120 = !DILocation(line: 384, column: 34, scope: !1063)
!1121 = !DILocation(line: 0, scope: !123, inlinedAt: !1083)
!1122 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1083)
!1123 = !DILocation(line: 0, scope: !1063)
!1124 = !DILocation(line: 384, column: 79, scope: !1063)
!1125 = !DILocation(line: 0, scope: !123, inlinedAt: !1085)
!1126 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1085)
!1127 = !DILocation(line: 384, column: 124, scope: !1063)
!1128 = !DILocation(line: 0, scope: !123, inlinedAt: !1087)
!1129 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1087)
!1130 = !DILocation(line: 384, column: 169, scope: !1063)
!1131 = !DILocation(line: 0, scope: !123, inlinedAt: !1089)
!1132 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1089)
!1133 = !DILocation(line: 384, column: 227, scope: !1063)
!1134 = !DILocation(line: 384, column: 230, scope: !1063)
!1135 = !DILocation(line: 384, column: 233, scope: !1063)
!1136 = !DILocation(line: 224, column: 16, scope: !496, inlinedAt: !1137)
!1137 = distinct !DILocation(line: 384, column: 205, scope: !1063)
!1138 = !DILocation(line: 0, scope: !478, inlinedAt: !1137)
!1139 = !DILocation(line: 228, column: 9, scope: !491, inlinedAt: !1137)
!1140 = !DILocation(line: 228, column: 5, scope: !491, inlinedAt: !1137)
!1141 = !DILocation(line: 385, column: 34, scope: !1069)
!1142 = !DILocation(line: 0, scope: !123, inlinedAt: !1091)
!1143 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1091)
!1144 = !DILocation(line: 0, scope: !1069)
!1145 = !DILocation(line: 385, column: 79, scope: !1069)
!1146 = !DILocation(line: 0, scope: !123, inlinedAt: !1093)
!1147 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1093)
!1148 = !DILocation(line: 385, column: 124, scope: !1069)
!1149 = !DILocation(line: 0, scope: !123, inlinedAt: !1095)
!1150 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1095)
!1151 = !DILocation(line: 385, column: 169, scope: !1069)
!1152 = !DILocation(line: 0, scope: !123, inlinedAt: !1097)
!1153 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1097)
!1154 = !DILocation(line: 385, column: 226, scope: !1069)
!1155 = !DILocation(line: 385, column: 229, scope: !1069)
!1156 = !DILocation(line: 385, column: 232, scope: !1069)
!1157 = !DILocation(line: 247, column: 9, scope: !511, inlinedAt: !1158)
!1158 = distinct !DILocation(line: 385, column: 205, scope: !1069)
!1159 = !DILocation(line: 0, scope: !501, inlinedAt: !1158)
!1160 = !DILocation(line: 247, column: 5, scope: !511, inlinedAt: !1158)
!1161 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1162)
!1162 = distinct !DILocation(line: 386, column: 9, scope: !1057)
!1163 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1162)
!1164 = !DILocation(line: 386, column: 30, scope: !1048)
!1165 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !15, file: !15, line: 387, type: !1166, scopeLine: 387, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !1170)
!1166 = !DISubroutineType(types: !1167)
!1167 = !{!1168, !10, !770, !772}
!1168 = !DIDerivedType(tag: DW_TAG_typedef, name: "uint64_t", file: !11, line: 102, baseType: !1169)
!1169 = !DIBasicType(name: "unsigned long long", size: 64, encoding: DW_ATE_unsigned)
!1170 = !{!1171, !1172, !1173}
!1171 = !DILocalVariable(name: "function", arg: 1, scope: !1165, file: !15, line: 387, type: !10)
!1172 = !DILocalVariable(name: "data", arg: 2, scope: !1165, file: !15, line: 387, type: !770)
!1173 = !DILocalVariable(name: "lengths", arg: 3, scope: !1165, file: !15, line: 387, type: !772)
!1174 = !DILocation(line: 0, scope: !1165)
!1175 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1176)
!1176 = distinct !DILocation(line: 388, column: 9, scope: !1177)
!1177 = distinct !DILexicalBlock(scope: !1165, file: !15, line: 387, column: 138)
!1178 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1176)
