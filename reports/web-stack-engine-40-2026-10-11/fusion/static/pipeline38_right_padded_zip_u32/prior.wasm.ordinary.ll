; ModuleID = '/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_u32/prior/cpu.c'
source_filename = "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_u32/prior/cpu.c"
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
define hidden void @lang_fn_pipeline38_right_padded_zip_u32(ptr dead_on_unwind noalias nocapture writable writeonly sret(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %1, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %2, i32 noundef %3, i32 noundef %4) local_unnamed_addr #2 !dbg !167 {
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
  br i1 %82, label %83, label %153, !dbg !282

83:                                               ; preds = %80, %153, %65, %36
    #dbg_value(ptr %37, !197, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !243)
    #dbg_value(i32 %9, !197, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !243)
    #dbg_value(ptr %6, !198, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !243)
    #dbg_value(i32 %9, !198, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !243)
    #dbg_value(i32 %9, !55, !DIExpression(), !294)
    #dbg_value(i32 4, !56, !DIExpression(), !294)
  %84 = load i32, ptr @ink_top, align 4
  %85 = icmp ugt i32 %84, -8
  br i1 %85, label %86, label %87, !dbg !296

86:                                               ; preds = %83
  tail call void @llvm.trap(), !dbg !297
  unreachable, !dbg !299

87:                                               ; preds = %83
  %88 = icmp eq i32 %84, 0, !dbg !300
  %89 = add nuw i32 %84, 7, !dbg !301
  %90 = select i1 %88, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %89, !dbg !302
  %91 = and i32 %90, -8, !dbg !303
    #dbg_value(i32 %91, !57, !DIExpression(), !294)
    #dbg_value(i32 %21, !58, !DIExpression(), !294)
  %92 = xor i32 %91, -1, !dbg !304
  %93 = icmp ugt i32 %21, %92, !dbg !305
  br i1 %93, label %94, label %95, !dbg !305

94:                                               ; preds = %87
  tail call void @llvm.trap(), !dbg !306
  unreachable, !dbg !308

95:                                               ; preds = %87
  %96 = add i32 %91, %21, !dbg !309
  store i32 %96, ptr @ink_top, align 4, !dbg !310, !tbaa !27
  %97 = add i32 %96, 65535, !dbg !311
  %98 = lshr i32 %97, 16, !dbg !312
    #dbg_value(i32 %98, !59, !DIExpression(), !294)
  %99 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !313
    #dbg_value(i32 %99, !60, !DIExpression(), !294)
  %100 = icmp ugt i32 %98, %99, !dbg !314
  br i1 %100, label %101, label %106, !dbg !315

101:                                              ; preds = %95
  %102 = sub nuw nsw i32 %98, %99, !dbg !316
  %103 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %102), !dbg !317
  %104 = icmp eq i32 %103, -1, !dbg !318
  br i1 %104, label %105, label %106, !dbg !315

105:                                              ; preds = %101
  tail call void @llvm.trap(), !dbg !319
  unreachable, !dbg !321

106:                                              ; preds = %95, %101
  %107 = inttoptr i32 %91 to ptr, !dbg !322
    #dbg_value(ptr %107, !199, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !243)
    #dbg_value(i32 %9, !199, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !243)
    #dbg_value(i32 0, !200, !DIExpression(), !323)
  br i1 %38, label %170, label %108, !dbg !324

108:                                              ; preds = %106
  %109 = icmp ult i32 %9, 4, !dbg !324
  %110 = sub i32 %91, %7, !dbg !324
  %111 = icmp ult i32 %110, 16, !dbg !324
  %112 = select i1 %109, i1 true, i1 %111, !dbg !324
  br i1 %112, label %135, label %113, !dbg !324

113:                                              ; preds = %108
  %114 = and i32 %9, 1073741820, !dbg !324
  %115 = insertelement <4 x i32> poison, i32 %4, i64 0, !dbg !324
  %116 = shufflevector <4 x i32> %115, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !324
  %117 = insertelement <4 x i32> poison, i32 %3, i64 0, !dbg !324
  %118 = shufflevector <4 x i32> %117, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !324
  br label %119, !dbg !324

119:                                              ; preds = %119, %113
  %120 = phi i32 [ 0, %113 ], [ %130, %119 ], !dbg !325
  %121 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %113 ], [ %131, %119 ]
  %122 = getelementptr inbounds nuw i32, ptr %6, i32 %120, !dbg !326
  %123 = load <4 x i32>, ptr %122, align 4, !dbg !326, !tbaa !285
  %124 = urem <4 x i32> %121, splat (i32 3), !dbg !327
  %125 = icmp eq <4 x i32> %124, zeroinitializer, !dbg !330
  %126 = mul <4 x i32> %123, %116, !dbg !331
  %127 = add <4 x i32> %123, %118, !dbg !331
  %128 = select <4 x i1> %125, <4 x i32> %126, <4 x i32> %127, !dbg !331
  %129 = getelementptr inbounds nuw i32, ptr %107, i32 %120, !dbg !332
  store <4 x i32> %128, ptr %129, align 8, !dbg !333, !tbaa !285
  %130 = add nuw i32 %120, 4, !dbg !325
  %131 = add <4 x i32> %121, splat (i32 4)
  %132 = icmp eq i32 %130, %114, !dbg !325
  br i1 %132, label %133, label %119, !dbg !325, !llvm.loop !334

133:                                              ; preds = %119
  %134 = icmp eq i32 %9, %114, !dbg !324
  br i1 %134, label %170, label %135, !dbg !324

135:                                              ; preds = %108, %133
  %136 = phi i32 [ 0, %108 ], [ %114, %133 ]
  %137 = or disjoint i32 %136, 1, !dbg !324
  %138 = and i32 %9, 1, !dbg !324
  %139 = icmp eq i32 %138, 0, !dbg !324
  br i1 %139, label %150, label %140, !dbg !324

140:                                              ; preds = %135
    #dbg_value(i32 poison, !200, !DIExpression(), !323)
    #dbg_value(i32 poison, !202, !DIExpression(), !336)
  %141 = getelementptr inbounds nuw i32, ptr %6, i32 %136, !dbg !326
  %142 = load i32, ptr %141, align 4, !dbg !326, !tbaa !285
    #dbg_value(i32 %142, !205, !DIExpression(), !336)
    #dbg_value(i32 %3, !206, !DIExpression(), !336)
    #dbg_value(i32 %4, !207, !DIExpression(), !336)
    #dbg_value(i32 poison, !208, !DIExpression(), !336)
    #dbg_value(i32 3, !209, !DIExpression(), !336)
    #dbg_value(i32 poison, !210, !DIExpression(), !336)
  %143 = urem i32 %136, 3, !dbg !327
    #dbg_value(i32 %143, !210, !DIExpression(), !336)
    #dbg_value(i32 %143, !211, !DIExpression(), !336)
  %144 = icmp eq i32 %143, 0, !dbg !330
  %145 = mul i32 %142, %4, !dbg !331
  %146 = add i32 %142, %3, !dbg !331
  %147 = select i1 %144, i32 %145, i32 %146, !dbg !331
    #dbg_value(i32 %147, !212, !DIExpression(), !336)
  %148 = getelementptr inbounds nuw i32, ptr %107, i32 %136, !dbg !332
  store i32 %147, ptr %148, align 8, !dbg !333, !tbaa !285
  %149 = or disjoint i32 %136, 1, !dbg !325
    #dbg_value(i32 %149, !200, !DIExpression(), !323)
  br label %150, !dbg !324

150:                                              ; preds = %140, %135
  %151 = phi i32 [ %136, %135 ], [ %149, %140 ]
  %152 = icmp eq i32 %9, %137, !dbg !324
  br i1 %152, label %170, label %177, !dbg !324

153:                                              ; preds = %80, %153
  %154 = phi i32 [ %168, %153 ], [ %81, %80 ]
    #dbg_value(i32 %154, !182, !DIExpression(), !280)
    #dbg_value(i32 %154, !184, !DIExpression(), !293)
  %155 = getelementptr inbounds nuw i32, ptr %6, i32 %154, !dbg !284
  %156 = load i32, ptr %155, align 4, !dbg !284, !tbaa !285
    #dbg_value(i32 %156, !187, !DIExpression(), !293)
    #dbg_value(i32 %3, !188, !DIExpression(), !293)
    #dbg_value(i32 %4, !189, !DIExpression(), !293)
    #dbg_value(i32 %154, !190, !DIExpression(), !293)
  %157 = icmp ult i32 %154, %3, !dbg !287
  %158 = select i1 %157, i32 %4, i32 %40, !dbg !288
  %159 = add i32 %156, %158, !dbg !288
    #dbg_value(i32 %159, !191, !DIExpression(), !293)
  %160 = getelementptr inbounds nuw i32, ptr %37, i32 %154, !dbg !289
  store i32 %159, ptr %160, align 4, !dbg !290, !tbaa !285
  %161 = add nuw i32 %154, 1, !dbg !283
    #dbg_value(i32 %161, !182, !DIExpression(), !280)
    #dbg_value(i32 %161, !184, !DIExpression(), !293)
  %162 = getelementptr inbounds nuw i32, ptr %6, i32 %161, !dbg !284
  %163 = load i32, ptr %162, align 4, !dbg !284, !tbaa !285
    #dbg_value(i32 %163, !187, !DIExpression(), !293)
    #dbg_value(i32 %161, !190, !DIExpression(), !293)
  %164 = icmp ult i32 %161, %3, !dbg !287
  %165 = select i1 %164, i32 %4, i32 %40, !dbg !288
  %166 = add i32 %163, %165, !dbg !288
    #dbg_value(i32 %166, !191, !DIExpression(), !293)
  %167 = getelementptr inbounds nuw i32, ptr %37, i32 %161, !dbg !289
  store i32 %166, ptr %167, align 4, !dbg !290, !tbaa !285
  %168 = add nuw i32 %154, 2, !dbg !283
    #dbg_value(i32 %168, !182, !DIExpression(), !280)
  %169 = icmp eq i32 %168, %9, !dbg !281
  br i1 %169, label %83, label %153, !dbg !282, !llvm.loop !337

170:                                              ; preds = %150, %177, %133, %106
    #dbg_value(ptr %107, !218, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !243)
    #dbg_value(i32 %9, !218, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !243)
  %171 = load ptr, ptr %2, align 4, !dbg !338, !tbaa !245
  %172 = ptrtoint ptr %171 to i32, !dbg !338
  %173 = getelementptr inbounds nuw i8, ptr %2, i32 4, !dbg !338
  %174 = load i32, ptr %173, align 4, !dbg !338, !tbaa !27
    #dbg_value(ptr %171, !219, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !243)
    #dbg_value(i32 %174, !219, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !243)
  %175 = xor i32 %174, -1, !dbg !339
  %176 = icmp ugt i32 %9, %175, !dbg !341
  br i1 %176, label %198, label %199, !dbg !341

177:                                              ; preds = %150, %177
  %178 = phi i32 [ %196, %177 ], [ %151, %150 ]
    #dbg_value(i32 %178, !200, !DIExpression(), !323)
    #dbg_value(i32 %178, !202, !DIExpression(), !336)
  %179 = getelementptr inbounds nuw i32, ptr %6, i32 %178, !dbg !326
  %180 = load i32, ptr %179, align 4, !dbg !326, !tbaa !285
    #dbg_value(i32 %180, !205, !DIExpression(), !336)
    #dbg_value(i32 %3, !206, !DIExpression(), !336)
    #dbg_value(i32 %4, !207, !DIExpression(), !336)
    #dbg_value(i32 %178, !208, !DIExpression(), !336)
    #dbg_value(i32 3, !209, !DIExpression(), !336)
    #dbg_value(i32 poison, !210, !DIExpression(), !336)
  %181 = urem i32 %178, 3, !dbg !327
    #dbg_value(i32 %181, !210, !DIExpression(), !336)
    #dbg_value(i32 %181, !211, !DIExpression(), !336)
  %182 = icmp eq i32 %181, 0, !dbg !330
  %183 = mul i32 %180, %4, !dbg !331
  %184 = add i32 %180, %3, !dbg !331
  %185 = select i1 %182, i32 %183, i32 %184, !dbg !331
    #dbg_value(i32 %185, !212, !DIExpression(), !336)
  %186 = getelementptr inbounds nuw i32, ptr %107, i32 %178, !dbg !332
  store i32 %185, ptr %186, align 4, !dbg !333, !tbaa !285
  %187 = add nuw i32 %178, 1, !dbg !325
    #dbg_value(i32 %187, !200, !DIExpression(), !323)
    #dbg_value(i32 %187, !202, !DIExpression(), !336)
  %188 = getelementptr inbounds nuw i32, ptr %6, i32 %187, !dbg !326
  %189 = load i32, ptr %188, align 4, !dbg !326, !tbaa !285
    #dbg_value(i32 %189, !205, !DIExpression(), !336)
    #dbg_value(i32 %187, !208, !DIExpression(), !336)
    #dbg_value(i32 poison, !210, !DIExpression(), !336)
  %190 = urem i32 %187, 3, !dbg !327
    #dbg_value(i32 %190, !210, !DIExpression(), !336)
    #dbg_value(i32 %190, !211, !DIExpression(), !336)
  %191 = icmp eq i32 %190, 0, !dbg !330
  %192 = mul i32 %189, %4, !dbg !331
  %193 = add i32 %189, %3, !dbg !331
  %194 = select i1 %191, i32 %192, i32 %193, !dbg !331
    #dbg_value(i32 %194, !212, !DIExpression(), !336)
  %195 = getelementptr inbounds nuw i32, ptr %107, i32 %187, !dbg !332
  store i32 %194, ptr %195, align 4, !dbg !333, !tbaa !285
  %196 = add nuw i32 %178, 2, !dbg !325
    #dbg_value(i32 %196, !200, !DIExpression(), !323)
  %197 = icmp eq i32 %196, %9, !dbg !342
  br i1 %197, label %170, label %177, !dbg !324, !llvm.loop !343

198:                                              ; preds = %170
  tail call void @llvm.trap(), !dbg !344
  unreachable, !dbg !346

199:                                              ; preds = %170
  %200 = add i32 %174, %9, !dbg !347
    #dbg_value(i32 %200, !220, !DIExpression(), !243)
    #dbg_value(i32 %200, !55, !DIExpression(), !348)
    #dbg_value(i32 4, !56, !DIExpression(), !348)
  %201 = icmp ugt i32 %200, 1073741823, !dbg !350
  %202 = load i32, ptr @ink_top, align 4
  %203 = icmp ugt i32 %202, -8
  %204 = select i1 %201, i1 true, i1 %203, !dbg !351
  br i1 %204, label %205, label %206, !dbg !351

205:                                              ; preds = %199
  tail call void @llvm.trap(), !dbg !352
  unreachable, !dbg !354

206:                                              ; preds = %199
  %207 = icmp eq i32 %202, 0, !dbg !355
  %208 = add nuw i32 %202, 7, !dbg !356
  %209 = select i1 %207, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %208, !dbg !357
  %210 = and i32 %209, -8, !dbg !358
    #dbg_value(i32 %209, !57, !DIExpression(DW_OP_constu, 18446744073709551608, DW_OP_and, DW_OP_stack_value), !348)
  %211 = tail call i32 @llvm.umax.i32(i32 %200, i32 1), !dbg !359
  %212 = shl nuw i32 %211, 2, !dbg !360
    #dbg_value(i32 %212, !58, !DIExpression(), !348)
  %213 = xor i32 %210, -1, !dbg !361
  %214 = icmp ugt i32 %212, %213, !dbg !362
  br i1 %214, label %215, label %216, !dbg !362

215:                                              ; preds = %206
  tail call void @llvm.trap(), !dbg !363
  unreachable, !dbg !365

216:                                              ; preds = %206
  %217 = add i32 %210, %212, !dbg !366
  store i32 %217, ptr @ink_top, align 4, !dbg !367, !tbaa !27
  %218 = add i32 %217, 65535, !dbg !368
  %219 = lshr i32 %218, 16, !dbg !369
    #dbg_value(i32 %219, !59, !DIExpression(), !348)
  %220 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !370
    #dbg_value(i32 %220, !60, !DIExpression(), !348)
  %221 = icmp ugt i32 %219, %220, !dbg !371
  br i1 %221, label %222, label %227, !dbg !372

222:                                              ; preds = %216
  %223 = sub nuw nsw i32 %219, %220, !dbg !373
  %224 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %223), !dbg !374
  %225 = icmp eq i32 %224, -1, !dbg !375
  br i1 %225, label %226, label %227, !dbg !372

226:                                              ; preds = %222
  tail call void @llvm.trap(), !dbg !376
  unreachable, !dbg !378

227:                                              ; preds = %216, %222
  %228 = inttoptr i32 %210 to ptr, !dbg !379
    #dbg_value(ptr %228, !221, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !243)
    #dbg_value(i32 %200, !221, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !243)
  %229 = shl nuw i32 %9, 2, !dbg !380
    #dbg_value(ptr %228, !110, !DIExpression(), !381)
    #dbg_value(ptr %107, !115, !DIExpression(), !381)
    #dbg_value(i32 %229, !116, !DIExpression(), !381)
    #dbg_value(ptr %228, !117, !DIExpression(), !381)
    #dbg_value(ptr %107, !119, !DIExpression(), !381)
    #dbg_value(i32 0, !122, !DIExpression(), !383)
  br i1 %38, label %267, label %230, !dbg !384

230:                                              ; preds = %227
  %231 = icmp ult i32 %9, 4, !dbg !384
  %232 = sub i32 %209, %91, !dbg !384
  %233 = icmp ult i32 %232, 16, !dbg !384
  %234 = or i1 %231, %233, !dbg !384
  br i1 %234, label %246, label %235, !dbg !384

235:                                              ; preds = %230
  %236 = and i32 %229, -16, !dbg !384
  br label %237, !dbg !384

237:                                              ; preds = %237, %235
  %238 = phi i32 [ 0, %235 ], [ %242, %237 ], !dbg !385
  %239 = getelementptr inbounds nuw i8, ptr %107, i32 %238, !dbg !386
  %240 = load <16 x i8>, ptr %239, align 8, !dbg !386, !tbaa !132
  %241 = getelementptr inbounds nuw i8, ptr %228, i32 %238, !dbg !387
  store <16 x i8> %240, ptr %241, align 8, !dbg !388, !tbaa !132
  %242 = add nuw i32 %238, 16, !dbg !385
  %243 = icmp eq i32 %242, %236, !dbg !385
  br i1 %243, label %244, label %237, !dbg !385, !llvm.loop !389

244:                                              ; preds = %237
  %245 = icmp eq i32 %229, %236, !dbg !384
  br i1 %245, label %267, label %246, !dbg !384

246:                                              ; preds = %230, %244
  %247 = phi i32 [ 0, %230 ], [ %236, %244 ]
  br label %248, !dbg !384

248:                                              ; preds = %248, %246
  %249 = phi i32 [ %247, %246 ], [ %265, %248 ]
    #dbg_value(i32 %249, !122, !DIExpression(), !383)
  %250 = getelementptr inbounds nuw i8, ptr %107, i32 %249, !dbg !386
  %251 = load i8, ptr %250, align 4, !dbg !386, !tbaa !132
  %252 = getelementptr inbounds nuw i8, ptr %228, i32 %249, !dbg !387
  store i8 %251, ptr %252, align 4, !dbg !388, !tbaa !132
  %253 = or disjoint i32 %249, 1, !dbg !385
    #dbg_value(i32 %253, !122, !DIExpression(), !383)
  %254 = getelementptr inbounds nuw i8, ptr %107, i32 %253, !dbg !386
  %255 = load i8, ptr %254, align 1, !dbg !386, !tbaa !132
  %256 = getelementptr inbounds nuw i8, ptr %228, i32 %253, !dbg !387
  store i8 %255, ptr %256, align 1, !dbg !388, !tbaa !132
  %257 = or disjoint i32 %249, 2, !dbg !385
    #dbg_value(i32 %257, !122, !DIExpression(), !383)
  %258 = getelementptr inbounds nuw i8, ptr %107, i32 %257, !dbg !386
  %259 = load i8, ptr %258, align 2, !dbg !386, !tbaa !132
  %260 = getelementptr inbounds nuw i8, ptr %228, i32 %257, !dbg !387
  store i8 %259, ptr %260, align 2, !dbg !388, !tbaa !132
  %261 = or disjoint i32 %249, 3, !dbg !385
    #dbg_value(i32 %261, !122, !DIExpression(), !383)
  %262 = getelementptr inbounds nuw i8, ptr %107, i32 %261, !dbg !386
  %263 = load i8, ptr %262, align 1, !dbg !386, !tbaa !132
  %264 = getelementptr inbounds nuw i8, ptr %228, i32 %261, !dbg !387
  store i8 %263, ptr %264, align 1, !dbg !388, !tbaa !132
  %265 = add nuw i32 %249, 4, !dbg !385
    #dbg_value(i32 %265, !122, !DIExpression(), !383)
  %266 = icmp eq i32 %265, %229, !dbg !391
  br i1 %266, label %267, label %248, !dbg !384, !llvm.loop !392

267:                                              ; preds = %248, %244, %227
  %268 = getelementptr inbounds nuw i32, ptr %228, i32 %9, !dbg !393
  %269 = shl i32 %174, 2, !dbg !394
    #dbg_value(ptr %268, !110, !DIExpression(), !395)
    #dbg_value(ptr %171, !115, !DIExpression(), !395)
    #dbg_value(i32 %269, !116, !DIExpression(), !395)
    #dbg_value(ptr %268, !117, !DIExpression(), !395)
    #dbg_value(ptr %171, !119, !DIExpression(), !395)
    #dbg_value(i32 0, !122, !DIExpression(), !397)
  %270 = icmp eq i32 %269, 0, !dbg !398
  br i1 %270, label %309, label %271, !dbg !399

271:                                              ; preds = %267
  %272 = icmp ult i32 %269, 16, !dbg !399
  br i1 %272, label %288, label %273, !dbg !399

273:                                              ; preds = %271
  %274 = add i32 %210, %229, !dbg !399
  %275 = sub i32 %274, %172, !dbg !399
  %276 = icmp ult i32 %275, 16, !dbg !399
  br i1 %276, label %288, label %277, !dbg !399

277:                                              ; preds = %273
  %278 = and i32 %269, -16, !dbg !399
  br label %279, !dbg !399

279:                                              ; preds = %279, %277
  %280 = phi i32 [ 0, %277 ], [ %284, %279 ], !dbg !400
  %281 = getelementptr inbounds nuw i8, ptr %171, i32 %280, !dbg !401
  %282 = load <16 x i8>, ptr %281, align 1, !dbg !401, !tbaa !132
  %283 = getelementptr inbounds nuw i8, ptr %268, i32 %280, !dbg !402
  store <16 x i8> %282, ptr %283, align 4, !dbg !403, !tbaa !132
  %284 = add nuw i32 %280, 16, !dbg !400
  %285 = icmp eq i32 %284, %278, !dbg !400
  br i1 %285, label %286, label %279, !dbg !400, !llvm.loop !404

286:                                              ; preds = %279
  %287 = icmp eq i32 %269, %278, !dbg !399
  br i1 %287, label %309, label %288, !dbg !399

288:                                              ; preds = %273, %271, %286
  %289 = phi i32 [ 0, %271 ], [ 0, %273 ], [ %278, %286 ]
  br label %290, !dbg !399

290:                                              ; preds = %290, %288
  %291 = phi i32 [ %289, %288 ], [ %307, %290 ]
    #dbg_value(i32 %291, !122, !DIExpression(), !397)
  %292 = getelementptr inbounds nuw i8, ptr %171, i32 %291, !dbg !401
  %293 = load i8, ptr %292, align 1, !dbg !401, !tbaa !132
  %294 = getelementptr inbounds nuw i8, ptr %268, i32 %291, !dbg !402
  store i8 %293, ptr %294, align 4, !dbg !403, !tbaa !132
  %295 = or disjoint i32 %291, 1, !dbg !400
    #dbg_value(i32 %295, !122, !DIExpression(), !397)
  %296 = getelementptr inbounds nuw i8, ptr %171, i32 %295, !dbg !401
  %297 = load i8, ptr %296, align 1, !dbg !401, !tbaa !132
  %298 = getelementptr inbounds nuw i8, ptr %268, i32 %295, !dbg !402
  store i8 %297, ptr %298, align 1, !dbg !403, !tbaa !132
  %299 = or disjoint i32 %291, 2, !dbg !400
    #dbg_value(i32 %299, !122, !DIExpression(), !397)
  %300 = getelementptr inbounds nuw i8, ptr %171, i32 %299, !dbg !401
  %301 = load i8, ptr %300, align 1, !dbg !401, !tbaa !132
  %302 = getelementptr inbounds nuw i8, ptr %268, i32 %299, !dbg !402
  store i8 %301, ptr %302, align 2, !dbg !403, !tbaa !132
  %303 = or disjoint i32 %291, 3, !dbg !400
    #dbg_value(i32 %303, !122, !DIExpression(), !397)
  %304 = getelementptr inbounds nuw i8, ptr %171, i32 %303, !dbg !401
  %305 = load i8, ptr %304, align 1, !dbg !401, !tbaa !132
  %306 = getelementptr inbounds nuw i8, ptr %268, i32 %303, !dbg !402
  store i8 %305, ptr %306, align 1, !dbg !403, !tbaa !132
  %307 = add nuw i32 %291, 4, !dbg !400
    #dbg_value(i32 %307, !122, !DIExpression(), !397)
  %308 = icmp eq i32 %307, %269, !dbg !398
  br i1 %308, label %309, label %290, !dbg !399, !llvm.loop !406

309:                                              ; preds = %290, %286, %267
    #dbg_value(ptr %228, !222, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !243)
    #dbg_value(i32 %200, !222, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !243)
    #dbg_declare(ptr %0, !223, !DIExpression(), !407)
  %310 = tail call i32 @llvm.umin.i32(i32 %9, i32 %200), !dbg !408
    #dbg_value(i32 %310, !55, !DIExpression(), !409)
    #dbg_value(i32 4, !56, !DIExpression(), !409)
  %311 = load i32, ptr @ink_top, align 4
  %312 = icmp ugt i32 %311, -8
  br i1 %312, label %313, label %314, !dbg !411

313:                                              ; preds = %309
  tail call void @llvm.trap(), !dbg !412
  unreachable, !dbg !414

314:                                              ; preds = %309
  %315 = icmp eq i32 %311, 0, !dbg !415
  %316 = add nuw i32 %311, 7, !dbg !416
  %317 = select i1 %315, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %316, !dbg !417
  %318 = and i32 %317, -8, !dbg !418
    #dbg_value(i32 %317, !57, !DIExpression(DW_OP_constu, 18446744073709551608, DW_OP_and, DW_OP_stack_value), !409)
  %319 = tail call i32 @llvm.umax.i32(i32 %310, i32 1), !dbg !419
  %320 = shl nuw i32 %319, 2, !dbg !420
    #dbg_value(i32 %320, !58, !DIExpression(), !409)
  %321 = xor i32 %318, -1, !dbg !421
  %322 = icmp ugt i32 %320, %321, !dbg !422
  br i1 %322, label %323, label %324, !dbg !422

323:                                              ; preds = %314
  tail call void @llvm.trap(), !dbg !423
  unreachable, !dbg !425

324:                                              ; preds = %314
  %325 = add i32 %318, %320, !dbg !426
  store i32 %325, ptr @ink_top, align 4, !dbg !427, !tbaa !27
  %326 = add i32 %325, 65535, !dbg !428
  %327 = lshr i32 %326, 16, !dbg !429
    #dbg_value(i32 %327, !59, !DIExpression(), !409)
  %328 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !430
    #dbg_value(i32 %328, !60, !DIExpression(), !409)
  %329 = icmp ugt i32 %327, %328, !dbg !431
  br i1 %329, label %330, label %335, !dbg !432

330:                                              ; preds = %324
  %331 = sub nuw nsw i32 %327, %328, !dbg !433
  %332 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %331), !dbg !434
  %333 = icmp eq i32 %332, -1, !dbg !435
  br i1 %333, label %334, label %335, !dbg !432

334:                                              ; preds = %330
  tail call void @llvm.trap(), !dbg !436
  unreachable, !dbg !438

335:                                              ; preds = %324, %330
  %336 = inttoptr i32 %318 to ptr, !dbg !439
  store ptr %336, ptr %0, align 4, !dbg !440, !tbaa !441
  %337 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !440
  store i32 %310, ptr %337, align 4, !dbg !440, !tbaa !443
    #dbg_value(i32 0, !224, !DIExpression(), !444)
  %338 = icmp eq i32 %310, 0, !dbg !445
  br i1 %338, label %391, label %339, !dbg !446

339:                                              ; preds = %335
  %340 = icmp ult i32 %310, 4, !dbg !446
  br i1 %340, label %370, label %341, !dbg !446

341:                                              ; preds = %339
  %342 = sub i32 %317, %19, !dbg !446
  %343 = icmp ult i32 %342, 16, !dbg !446
  %344 = sub i32 %317, %210, !dbg !446
  %345 = icmp ult i32 %344, 16, !dbg !446
  %346 = or i1 %343, %345, !dbg !446
  br i1 %346, label %370, label %347, !dbg !446

347:                                              ; preds = %341
  %348 = and i32 %310, 1073741820, !dbg !446
  %349 = insertelement <4 x i32> poison, i32 %4, i64 0, !dbg !446
  %350 = shufflevector <4 x i32> %349, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !446
  %351 = insertelement <4 x i32> poison, i32 %3, i64 0, !dbg !446
  %352 = shufflevector <4 x i32> %351, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !446
  br label %353, !dbg !446

353:                                              ; preds = %353, %347
  %354 = phi i32 [ 0, %347 ], [ %366, %353 ], !dbg !447
  %355 = getelementptr inbounds nuw i32, ptr %37, i32 %354, !dbg !448
  %356 = load <4 x i32>, ptr %355, align 8, !dbg !448, !tbaa !285
  %357 = getelementptr inbounds nuw i32, ptr %228, i32 %354, !dbg !449
  %358 = load <4 x i32>, ptr %357, align 8, !dbg !449, !tbaa !285
  %359 = icmp ult <4 x i32> %356, %358, !dbg !450
  %360 = mul <4 x i32> %358, %350, !dbg !451
  %361 = add <4 x i32> %360, %356, !dbg !451
  %362 = add <4 x i32> %356, %352, !dbg !451
  %363 = sub <4 x i32> %362, %358, !dbg !451
  %364 = select <4 x i1> %359, <4 x i32> %361, <4 x i32> %363, !dbg !451
  %365 = getelementptr inbounds nuw i32, ptr %336, i32 %354, !dbg !452
  store <4 x i32> %364, ptr %365, align 8, !dbg !453, !tbaa !285
  %366 = add nuw i32 %354, 4, !dbg !447
  %367 = icmp eq i32 %366, %348, !dbg !447
  br i1 %367, label %368, label %353, !dbg !447, !llvm.loop !454

368:                                              ; preds = %353
  %369 = icmp eq i32 %310, %348, !dbg !446
  br i1 %369, label %391, label %370, !dbg !446

370:                                              ; preds = %341, %339, %368
  %371 = phi i32 [ 0, %339 ], [ 0, %341 ], [ %348, %368 ]
  %372 = or disjoint i32 %371, 1, !dbg !446
  %373 = and i32 %310, 1, !dbg !446
  %374 = icmp eq i32 %373, 0, !dbg !446
  br i1 %374, label %388, label %375, !dbg !446

375:                                              ; preds = %370
    #dbg_value(i32 poison, !224, !DIExpression(), !444)
  %376 = getelementptr inbounds nuw i32, ptr %37, i32 %371, !dbg !448
  %377 = load i32, ptr %376, align 8, !dbg !448, !tbaa !285
    #dbg_value(i32 %377, !226, !DIExpression(), !456)
  %378 = getelementptr inbounds nuw i32, ptr %228, i32 %371, !dbg !449
  %379 = load i32, ptr %378, align 8, !dbg !449, !tbaa !285
    #dbg_value(i32 %379, !229, !DIExpression(), !456)
    #dbg_value(i32 %3, !230, !DIExpression(), !456)
    #dbg_value(i32 %4, !231, !DIExpression(), !456)
    #dbg_value(i32 %377, !232, !DIExpression(), !456)
  %380 = icmp ult i32 %377, %379, !dbg !450
  %381 = mul i32 %379, %4, !dbg !451
  %382 = add i32 %381, %377, !dbg !451
  %383 = add i32 %377, %3, !dbg !451
  %384 = sub i32 %383, %379, !dbg !451
  %385 = select i1 %380, i32 %382, i32 %384, !dbg !451
    #dbg_value(i32 %385, !233, !DIExpression(), !456)
  %386 = getelementptr inbounds nuw i32, ptr %336, i32 %371, !dbg !452
  store i32 %385, ptr %386, align 8, !dbg !453, !tbaa !285
  %387 = or disjoint i32 %371, 1, !dbg !447
    #dbg_value(i32 %387, !224, !DIExpression(), !444)
  br label %388, !dbg !446

388:                                              ; preds = %375, %370
  %389 = phi i32 [ %371, %370 ], [ %387, %375 ]
  %390 = icmp eq i32 %310, %372, !dbg !446
  br i1 %390, label %391, label %392, !dbg !446

391:                                              ; preds = %388, %392, %368, %335
  ret void, !dbg !457

392:                                              ; preds = %388, %392
  %393 = phi i32 [ %417, %392 ], [ %389, %388 ]
    #dbg_value(i32 %393, !224, !DIExpression(), !444)
  %394 = getelementptr inbounds nuw i32, ptr %37, i32 %393, !dbg !448
  %395 = load i32, ptr %394, align 4, !dbg !448, !tbaa !285
    #dbg_value(i32 %395, !226, !DIExpression(), !456)
  %396 = getelementptr inbounds nuw i32, ptr %228, i32 %393, !dbg !449
  %397 = load i32, ptr %396, align 4, !dbg !449, !tbaa !285
    #dbg_value(i32 %397, !229, !DIExpression(), !456)
    #dbg_value(i32 %3, !230, !DIExpression(), !456)
    #dbg_value(i32 %4, !231, !DIExpression(), !456)
    #dbg_value(i32 %395, !232, !DIExpression(), !456)
  %398 = icmp ult i32 %395, %397, !dbg !450
  %399 = mul i32 %397, %4, !dbg !451
  %400 = add i32 %399, %395, !dbg !451
  %401 = add i32 %395, %3, !dbg !451
  %402 = sub i32 %401, %397, !dbg !451
  %403 = select i1 %398, i32 %400, i32 %402, !dbg !451
    #dbg_value(i32 %403, !233, !DIExpression(), !456)
  %404 = getelementptr inbounds nuw i32, ptr %336, i32 %393, !dbg !452
  store i32 %403, ptr %404, align 4, !dbg !453, !tbaa !285
  %405 = add nuw i32 %393, 1, !dbg !447
    #dbg_value(i32 %405, !224, !DIExpression(), !444)
  %406 = getelementptr inbounds nuw i32, ptr %37, i32 %405, !dbg !448
  %407 = load i32, ptr %406, align 4, !dbg !448, !tbaa !285
    #dbg_value(i32 %407, !226, !DIExpression(), !456)
  %408 = getelementptr inbounds nuw i32, ptr %228, i32 %405, !dbg !449
  %409 = load i32, ptr %408, align 4, !dbg !449, !tbaa !285
    #dbg_value(i32 %409, !229, !DIExpression(), !456)
    #dbg_value(i32 %407, !232, !DIExpression(), !456)
  %410 = icmp ult i32 %407, %409, !dbg !450
  %411 = mul i32 %409, %4, !dbg !451
  %412 = add i32 %411, %407, !dbg !451
  %413 = add i32 %407, %3, !dbg !451
  %414 = sub i32 %413, %409, !dbg !451
  %415 = select i1 %410, i32 %412, i32 %414, !dbg !451
    #dbg_value(i32 %415, !233, !DIExpression(), !456)
  %416 = getelementptr inbounds nuw i32, ptr %336, i32 %405, !dbg !452
  store i32 %415, ptr %416, align 4, !dbg !453, !tbaa !285
  %417 = add nuw i32 %393, 2, !dbg !447
    #dbg_value(i32 %417, !224, !DIExpression(), !444)
  %418 = icmp eq i32 %417, %310, !dbg !445
  br i1 %418, label %391, label %392, !dbg !446, !llvm.loop !458
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
define hidden i32 @lang_fn_pipeline38_right_padded_zip_u32_into(ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %1, i32 noundef %2, i32 noundef %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #2 !dbg !520 {
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
  br i1 %83, label %84, label %154, !dbg !628

84:                                               ; preds = %81, %154, %66, %37
    #dbg_value(ptr %38, !546, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
    #dbg_value(i32 %10, !546, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
    #dbg_value(ptr %7, !547, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
    #dbg_value(i32 %10, !547, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
    #dbg_value(i32 %10, !55, !DIExpression(), !638)
    #dbg_value(i32 4, !56, !DIExpression(), !638)
  %85 = load i32, ptr @ink_top, align 4
  %86 = icmp ugt i32 %85, -8
  br i1 %86, label %87, label %88, !dbg !640

87:                                               ; preds = %84
  tail call void @llvm.trap(), !dbg !641
  unreachable, !dbg !643

88:                                               ; preds = %84
  %89 = icmp eq i32 %85, 0, !dbg !644
  %90 = add nuw i32 %85, 7, !dbg !645
  %91 = select i1 %89, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %90, !dbg !646
  %92 = and i32 %91, -8, !dbg !647
    #dbg_value(i32 %92, !57, !DIExpression(), !638)
    #dbg_value(i32 %22, !58, !DIExpression(), !638)
  %93 = xor i32 %92, -1, !dbg !648
  %94 = icmp ugt i32 %22, %93, !dbg !649
  br i1 %94, label %95, label %96, !dbg !649

95:                                               ; preds = %88
  tail call void @llvm.trap(), !dbg !650
  unreachable, !dbg !652

96:                                               ; preds = %88
  %97 = add i32 %92, %22, !dbg !653
  store i32 %97, ptr @ink_top, align 4, !dbg !654, !tbaa !27
  %98 = add i32 %97, 65535, !dbg !655
  %99 = lshr i32 %98, 16, !dbg !656
    #dbg_value(i32 %99, !59, !DIExpression(), !638)
  %100 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !657
    #dbg_value(i32 %100, !60, !DIExpression(), !638)
  %101 = icmp ugt i32 %99, %100, !dbg !658
  br i1 %101, label %102, label %107, !dbg !659

102:                                              ; preds = %96
  %103 = sub nuw nsw i32 %99, %100, !dbg !660
  %104 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %103), !dbg !661
  %105 = icmp eq i32 %104, -1, !dbg !662
  br i1 %105, label %106, label %107, !dbg !659

106:                                              ; preds = %102
  tail call void @llvm.trap(), !dbg !663
  unreachable, !dbg !665

107:                                              ; preds = %96, %102
  %108 = inttoptr i32 %92 to ptr, !dbg !666
    #dbg_value(ptr %108, !548, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
    #dbg_value(i32 %10, !548, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
    #dbg_value(i32 0, !549, !DIExpression(), !667)
  br i1 %39, label %171, label %109, !dbg !668

109:                                              ; preds = %107
  %110 = icmp ult i32 %10, 4, !dbg !668
  %111 = sub i32 %92, %8, !dbg !668
  %112 = icmp ult i32 %111, 16, !dbg !668
  %113 = select i1 %110, i1 true, i1 %112, !dbg !668
  br i1 %113, label %136, label %114, !dbg !668

114:                                              ; preds = %109
  %115 = and i32 %10, 1073741820, !dbg !668
  %116 = insertelement <4 x i32> poison, i32 %3, i64 0, !dbg !668
  %117 = shufflevector <4 x i32> %116, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !668
  %118 = insertelement <4 x i32> poison, i32 %2, i64 0, !dbg !668
  %119 = shufflevector <4 x i32> %118, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !668
  br label %120, !dbg !668

120:                                              ; preds = %120, %114
  %121 = phi i32 [ 0, %114 ], [ %131, %120 ], !dbg !669
  %122 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %114 ], [ %132, %120 ]
  %123 = getelementptr inbounds nuw i32, ptr %7, i32 %121, !dbg !670
  %124 = load <4 x i32>, ptr %123, align 4, !dbg !670, !tbaa !285
  %125 = urem <4 x i32> %122, splat (i32 3), !dbg !671
  %126 = icmp eq <4 x i32> %125, zeroinitializer, !dbg !674
  %127 = mul <4 x i32> %124, %117, !dbg !675
  %128 = add <4 x i32> %124, %119, !dbg !675
  %129 = select <4 x i1> %126, <4 x i32> %127, <4 x i32> %128, !dbg !675
  %130 = getelementptr inbounds nuw i32, ptr %108, i32 %121, !dbg !676
  store <4 x i32> %129, ptr %130, align 8, !dbg !677, !tbaa !285
  %131 = add nuw i32 %121, 4, !dbg !669
  %132 = add <4 x i32> %122, splat (i32 4)
  %133 = icmp eq i32 %131, %115, !dbg !669
  br i1 %133, label %134, label %120, !dbg !669, !llvm.loop !678

134:                                              ; preds = %120
  %135 = icmp eq i32 %10, %115, !dbg !668
  br i1 %135, label %171, label %136, !dbg !668

136:                                              ; preds = %109, %134
  %137 = phi i32 [ 0, %109 ], [ %115, %134 ]
  %138 = or disjoint i32 %137, 1, !dbg !668
  %139 = and i32 %10, 1, !dbg !668
  %140 = icmp eq i32 %139, 0, !dbg !668
  br i1 %140, label %151, label %141, !dbg !668

141:                                              ; preds = %136
    #dbg_value(i32 poison, !549, !DIExpression(), !667)
    #dbg_value(i32 poison, !551, !DIExpression(), !680)
  %142 = getelementptr inbounds nuw i32, ptr %7, i32 %137, !dbg !670
  %143 = load i32, ptr %142, align 4, !dbg !670, !tbaa !285
    #dbg_value(i32 %143, !554, !DIExpression(), !680)
    #dbg_value(i32 %2, !555, !DIExpression(), !680)
    #dbg_value(i32 %3, !556, !DIExpression(), !680)
    #dbg_value(i32 poison, !557, !DIExpression(), !680)
    #dbg_value(i32 3, !558, !DIExpression(), !680)
    #dbg_value(i32 poison, !559, !DIExpression(), !680)
  %144 = urem i32 %137, 3, !dbg !671
    #dbg_value(i32 %144, !559, !DIExpression(), !680)
    #dbg_value(i32 %144, !560, !DIExpression(), !680)
  %145 = icmp eq i32 %144, 0, !dbg !674
  %146 = mul i32 %143, %3, !dbg !675
  %147 = add i32 %143, %2, !dbg !675
  %148 = select i1 %145, i32 %146, i32 %147, !dbg !675
    #dbg_value(i32 %148, !561, !DIExpression(), !680)
  %149 = getelementptr inbounds nuw i32, ptr %108, i32 %137, !dbg !676
  store i32 %148, ptr %149, align 8, !dbg !677, !tbaa !285
  %150 = or disjoint i32 %137, 1, !dbg !669
    #dbg_value(i32 %150, !549, !DIExpression(), !667)
  br label %151, !dbg !668

151:                                              ; preds = %141, %136
  %152 = phi i32 [ %137, %136 ], [ %150, %141 ]
  %153 = icmp eq i32 %10, %138, !dbg !668
  br i1 %153, label %171, label %178, !dbg !668

154:                                              ; preds = %81, %154
  %155 = phi i32 [ %169, %154 ], [ %82, %81 ]
    #dbg_value(i32 %155, !531, !DIExpression(), !626)
    #dbg_value(i32 %155, !533, !DIExpression(), !637)
  %156 = getelementptr inbounds nuw i32, ptr %7, i32 %155, !dbg !630
  %157 = load i32, ptr %156, align 4, !dbg !630, !tbaa !285
    #dbg_value(i32 %157, !536, !DIExpression(), !637)
    #dbg_value(i32 %2, !537, !DIExpression(), !637)
    #dbg_value(i32 %3, !538, !DIExpression(), !637)
    #dbg_value(i32 %155, !539, !DIExpression(), !637)
  %158 = icmp ult i32 %155, %2, !dbg !631
  %159 = select i1 %158, i32 %3, i32 %41, !dbg !632
  %160 = add i32 %157, %159, !dbg !632
    #dbg_value(i32 %160, !540, !DIExpression(), !637)
  %161 = getelementptr inbounds nuw i32, ptr %38, i32 %155, !dbg !633
  store i32 %160, ptr %161, align 4, !dbg !634, !tbaa !285
  %162 = add nuw i32 %155, 1, !dbg !629
    #dbg_value(i32 %162, !531, !DIExpression(), !626)
    #dbg_value(i32 %162, !533, !DIExpression(), !637)
  %163 = getelementptr inbounds nuw i32, ptr %7, i32 %162, !dbg !630
  %164 = load i32, ptr %163, align 4, !dbg !630, !tbaa !285
    #dbg_value(i32 %164, !536, !DIExpression(), !637)
    #dbg_value(i32 %162, !539, !DIExpression(), !637)
  %165 = icmp ult i32 %162, %2, !dbg !631
  %166 = select i1 %165, i32 %3, i32 %41, !dbg !632
  %167 = add i32 %164, %166, !dbg !632
    #dbg_value(i32 %167, !540, !DIExpression(), !637)
  %168 = getelementptr inbounds nuw i32, ptr %38, i32 %162, !dbg !633
  store i32 %167, ptr %168, align 4, !dbg !634, !tbaa !285
  %169 = add nuw i32 %155, 2, !dbg !629
    #dbg_value(i32 %169, !531, !DIExpression(), !626)
  %170 = icmp eq i32 %169, %10, !dbg !627
  br i1 %170, label %84, label %154, !dbg !628, !llvm.loop !681

171:                                              ; preds = %151, %178, %134, %107
    #dbg_value(ptr %108, !567, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
    #dbg_value(i32 %10, !567, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
  %172 = load ptr, ptr %1, align 4, !dbg !682, !tbaa !245
  %173 = ptrtoint ptr %172 to i32, !dbg !682
  %174 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !682
  %175 = load i32, ptr %174, align 4, !dbg !682, !tbaa !27
    #dbg_value(ptr %172, !568, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
    #dbg_value(i32 %175, !568, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
  %176 = xor i32 %175, -1, !dbg !683
  %177 = icmp ugt i32 %10, %176, !dbg !685
  br i1 %177, label %199, label %200, !dbg !685

178:                                              ; preds = %151, %178
  %179 = phi i32 [ %197, %178 ], [ %152, %151 ]
    #dbg_value(i32 %179, !549, !DIExpression(), !667)
    #dbg_value(i32 %179, !551, !DIExpression(), !680)
  %180 = getelementptr inbounds nuw i32, ptr %7, i32 %179, !dbg !670
  %181 = load i32, ptr %180, align 4, !dbg !670, !tbaa !285
    #dbg_value(i32 %181, !554, !DIExpression(), !680)
    #dbg_value(i32 %2, !555, !DIExpression(), !680)
    #dbg_value(i32 %3, !556, !DIExpression(), !680)
    #dbg_value(i32 %179, !557, !DIExpression(), !680)
    #dbg_value(i32 3, !558, !DIExpression(), !680)
    #dbg_value(i32 poison, !559, !DIExpression(), !680)
  %182 = urem i32 %179, 3, !dbg !671
    #dbg_value(i32 %182, !559, !DIExpression(), !680)
    #dbg_value(i32 %182, !560, !DIExpression(), !680)
  %183 = icmp eq i32 %182, 0, !dbg !674
  %184 = mul i32 %181, %3, !dbg !675
  %185 = add i32 %181, %2, !dbg !675
  %186 = select i1 %183, i32 %184, i32 %185, !dbg !675
    #dbg_value(i32 %186, !561, !DIExpression(), !680)
  %187 = getelementptr inbounds nuw i32, ptr %108, i32 %179, !dbg !676
  store i32 %186, ptr %187, align 4, !dbg !677, !tbaa !285
  %188 = add nuw i32 %179, 1, !dbg !669
    #dbg_value(i32 %188, !549, !DIExpression(), !667)
    #dbg_value(i32 %188, !551, !DIExpression(), !680)
  %189 = getelementptr inbounds nuw i32, ptr %7, i32 %188, !dbg !670
  %190 = load i32, ptr %189, align 4, !dbg !670, !tbaa !285
    #dbg_value(i32 %190, !554, !DIExpression(), !680)
    #dbg_value(i32 %188, !557, !DIExpression(), !680)
    #dbg_value(i32 poison, !559, !DIExpression(), !680)
  %191 = urem i32 %188, 3, !dbg !671
    #dbg_value(i32 %191, !559, !DIExpression(), !680)
    #dbg_value(i32 %191, !560, !DIExpression(), !680)
  %192 = icmp eq i32 %191, 0, !dbg !674
  %193 = mul i32 %190, %3, !dbg !675
  %194 = add i32 %190, %2, !dbg !675
  %195 = select i1 %192, i32 %193, i32 %194, !dbg !675
    #dbg_value(i32 %195, !561, !DIExpression(), !680)
  %196 = getelementptr inbounds nuw i32, ptr %108, i32 %188, !dbg !676
  store i32 %195, ptr %196, align 4, !dbg !677, !tbaa !285
  %197 = add nuw i32 %179, 2, !dbg !669
    #dbg_value(i32 %197, !549, !DIExpression(), !667)
  %198 = icmp eq i32 %197, %10, !dbg !686
  br i1 %198, label %171, label %178, !dbg !668, !llvm.loop !687

199:                                              ; preds = %171
  tail call void @llvm.trap(), !dbg !688
  unreachable, !dbg !690

200:                                              ; preds = %171
  %201 = add i32 %175, %10, !dbg !691
    #dbg_value(i32 %201, !569, !DIExpression(), !592)
    #dbg_value(i32 %201, !55, !DIExpression(), !692)
    #dbg_value(i32 4, !56, !DIExpression(), !692)
  %202 = icmp ugt i32 %201, 1073741823, !dbg !694
  %203 = load i32, ptr @ink_top, align 4
  %204 = icmp ugt i32 %203, -8
  %205 = select i1 %202, i1 true, i1 %204, !dbg !695
  br i1 %205, label %206, label %207, !dbg !695

206:                                              ; preds = %200
  tail call void @llvm.trap(), !dbg !696
  unreachable, !dbg !698

207:                                              ; preds = %200
  %208 = icmp eq i32 %203, 0, !dbg !699
  %209 = add nuw i32 %203, 7, !dbg !700
  %210 = select i1 %208, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %209, !dbg !701
  %211 = and i32 %210, -8, !dbg !702
    #dbg_value(i32 %210, !57, !DIExpression(DW_OP_constu, 18446744073709551608, DW_OP_and, DW_OP_stack_value), !692)
  %212 = tail call i32 @llvm.umax.i32(i32 %201, i32 1), !dbg !703
  %213 = shl nuw i32 %212, 2, !dbg !704
    #dbg_value(i32 %213, !58, !DIExpression(), !692)
  %214 = xor i32 %211, -1, !dbg !705
  %215 = icmp ugt i32 %213, %214, !dbg !706
  br i1 %215, label %216, label %217, !dbg !706

216:                                              ; preds = %207
  tail call void @llvm.trap(), !dbg !707
  unreachable, !dbg !709

217:                                              ; preds = %207
  %218 = add i32 %211, %213, !dbg !710
  store i32 %218, ptr @ink_top, align 4, !dbg !711, !tbaa !27
  %219 = add i32 %218, 65535, !dbg !712
  %220 = lshr i32 %219, 16, !dbg !713
    #dbg_value(i32 %220, !59, !DIExpression(), !692)
  %221 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !714
    #dbg_value(i32 %221, !60, !DIExpression(), !692)
  %222 = icmp ugt i32 %220, %221, !dbg !715
  br i1 %222, label %223, label %228, !dbg !716

223:                                              ; preds = %217
  %224 = sub nuw nsw i32 %220, %221, !dbg !717
  %225 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %224), !dbg !718
  %226 = icmp eq i32 %225, -1, !dbg !719
  br i1 %226, label %227, label %228, !dbg !716

227:                                              ; preds = %223
  tail call void @llvm.trap(), !dbg !720
  unreachable, !dbg !722

228:                                              ; preds = %217, %223
  %229 = inttoptr i32 %211 to ptr, !dbg !723
    #dbg_value(ptr %229, !570, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
    #dbg_value(i32 %201, !570, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
  %230 = shl nuw i32 %10, 2, !dbg !724
    #dbg_value(ptr %229, !110, !DIExpression(), !725)
    #dbg_value(ptr %108, !115, !DIExpression(), !725)
    #dbg_value(i32 %230, !116, !DIExpression(), !725)
    #dbg_value(ptr %229, !117, !DIExpression(), !725)
    #dbg_value(ptr %108, !119, !DIExpression(), !725)
    #dbg_value(i32 0, !122, !DIExpression(), !727)
  br i1 %39, label %268, label %231, !dbg !728

231:                                              ; preds = %228
  %232 = icmp ult i32 %10, 4, !dbg !728
  %233 = sub i32 %210, %92, !dbg !728
  %234 = icmp ult i32 %233, 16, !dbg !728
  %235 = or i1 %232, %234, !dbg !728
  br i1 %235, label %247, label %236, !dbg !728

236:                                              ; preds = %231
  %237 = and i32 %230, -16, !dbg !728
  br label %238, !dbg !728

238:                                              ; preds = %238, %236
  %239 = phi i32 [ 0, %236 ], [ %243, %238 ], !dbg !729
  %240 = getelementptr inbounds nuw i8, ptr %108, i32 %239, !dbg !730
  %241 = load <16 x i8>, ptr %240, align 8, !dbg !730, !tbaa !132
  %242 = getelementptr inbounds nuw i8, ptr %229, i32 %239, !dbg !731
  store <16 x i8> %241, ptr %242, align 8, !dbg !732, !tbaa !132
  %243 = add nuw i32 %239, 16, !dbg !729
  %244 = icmp eq i32 %243, %237, !dbg !729
  br i1 %244, label %245, label %238, !dbg !729, !llvm.loop !733

245:                                              ; preds = %238
  %246 = icmp eq i32 %230, %237, !dbg !728
  br i1 %246, label %268, label %247, !dbg !728

247:                                              ; preds = %231, %245
  %248 = phi i32 [ 0, %231 ], [ %237, %245 ]
  br label %249, !dbg !728

249:                                              ; preds = %249, %247
  %250 = phi i32 [ %248, %247 ], [ %266, %249 ]
    #dbg_value(i32 %250, !122, !DIExpression(), !727)
  %251 = getelementptr inbounds nuw i8, ptr %108, i32 %250, !dbg !730
  %252 = load i8, ptr %251, align 4, !dbg !730, !tbaa !132
  %253 = getelementptr inbounds nuw i8, ptr %229, i32 %250, !dbg !731
  store i8 %252, ptr %253, align 4, !dbg !732, !tbaa !132
  %254 = or disjoint i32 %250, 1, !dbg !729
    #dbg_value(i32 %254, !122, !DIExpression(), !727)
  %255 = getelementptr inbounds nuw i8, ptr %108, i32 %254, !dbg !730
  %256 = load i8, ptr %255, align 1, !dbg !730, !tbaa !132
  %257 = getelementptr inbounds nuw i8, ptr %229, i32 %254, !dbg !731
  store i8 %256, ptr %257, align 1, !dbg !732, !tbaa !132
  %258 = or disjoint i32 %250, 2, !dbg !729
    #dbg_value(i32 %258, !122, !DIExpression(), !727)
  %259 = getelementptr inbounds nuw i8, ptr %108, i32 %258, !dbg !730
  %260 = load i8, ptr %259, align 2, !dbg !730, !tbaa !132
  %261 = getelementptr inbounds nuw i8, ptr %229, i32 %258, !dbg !731
  store i8 %260, ptr %261, align 2, !dbg !732, !tbaa !132
  %262 = or disjoint i32 %250, 3, !dbg !729
    #dbg_value(i32 %262, !122, !DIExpression(), !727)
  %263 = getelementptr inbounds nuw i8, ptr %108, i32 %262, !dbg !730
  %264 = load i8, ptr %263, align 1, !dbg !730, !tbaa !132
  %265 = getelementptr inbounds nuw i8, ptr %229, i32 %262, !dbg !731
  store i8 %264, ptr %265, align 1, !dbg !732, !tbaa !132
  %266 = add nuw i32 %250, 4, !dbg !729
    #dbg_value(i32 %266, !122, !DIExpression(), !727)
  %267 = icmp eq i32 %266, %230, !dbg !735
  br i1 %267, label %268, label %249, !dbg !728, !llvm.loop !736

268:                                              ; preds = %249, %245, %228
  %269 = getelementptr inbounds nuw i32, ptr %229, i32 %10, !dbg !737
  %270 = shl i32 %175, 2, !dbg !738
    #dbg_value(ptr %269, !110, !DIExpression(), !739)
    #dbg_value(ptr %172, !115, !DIExpression(), !739)
    #dbg_value(i32 %270, !116, !DIExpression(), !739)
    #dbg_value(ptr %269, !117, !DIExpression(), !739)
    #dbg_value(ptr %172, !119, !DIExpression(), !739)
    #dbg_value(i32 0, !122, !DIExpression(), !741)
  %271 = icmp eq i32 %270, 0, !dbg !742
  br i1 %271, label %310, label %272, !dbg !743

272:                                              ; preds = %268
  %273 = icmp ult i32 %270, 16, !dbg !743
  br i1 %273, label %289, label %274, !dbg !743

274:                                              ; preds = %272
  %275 = add i32 %211, %230, !dbg !743
  %276 = sub i32 %275, %173, !dbg !743
  %277 = icmp ult i32 %276, 16, !dbg !743
  br i1 %277, label %289, label %278, !dbg !743

278:                                              ; preds = %274
  %279 = and i32 %270, -16, !dbg !743
  br label %280, !dbg !743

280:                                              ; preds = %280, %278
  %281 = phi i32 [ 0, %278 ], [ %285, %280 ], !dbg !744
  %282 = getelementptr inbounds nuw i8, ptr %172, i32 %281, !dbg !745
  %283 = load <16 x i8>, ptr %282, align 1, !dbg !745, !tbaa !132
  %284 = getelementptr inbounds nuw i8, ptr %269, i32 %281, !dbg !746
  store <16 x i8> %283, ptr %284, align 4, !dbg !747, !tbaa !132
  %285 = add nuw i32 %281, 16, !dbg !744
  %286 = icmp eq i32 %285, %279, !dbg !744
  br i1 %286, label %287, label %280, !dbg !744, !llvm.loop !748

287:                                              ; preds = %280
  %288 = icmp eq i32 %270, %279, !dbg !743
  br i1 %288, label %310, label %289, !dbg !743

289:                                              ; preds = %274, %272, %287
  %290 = phi i32 [ 0, %272 ], [ 0, %274 ], [ %279, %287 ]
  br label %291, !dbg !743

291:                                              ; preds = %291, %289
  %292 = phi i32 [ %290, %289 ], [ %308, %291 ]
    #dbg_value(i32 %292, !122, !DIExpression(), !741)
  %293 = getelementptr inbounds nuw i8, ptr %172, i32 %292, !dbg !745
  %294 = load i8, ptr %293, align 1, !dbg !745, !tbaa !132
  %295 = getelementptr inbounds nuw i8, ptr %269, i32 %292, !dbg !746
  store i8 %294, ptr %295, align 4, !dbg !747, !tbaa !132
  %296 = or disjoint i32 %292, 1, !dbg !744
    #dbg_value(i32 %296, !122, !DIExpression(), !741)
  %297 = getelementptr inbounds nuw i8, ptr %172, i32 %296, !dbg !745
  %298 = load i8, ptr %297, align 1, !dbg !745, !tbaa !132
  %299 = getelementptr inbounds nuw i8, ptr %269, i32 %296, !dbg !746
  store i8 %298, ptr %299, align 1, !dbg !747, !tbaa !132
  %300 = or disjoint i32 %292, 2, !dbg !744
    #dbg_value(i32 %300, !122, !DIExpression(), !741)
  %301 = getelementptr inbounds nuw i8, ptr %172, i32 %300, !dbg !745
  %302 = load i8, ptr %301, align 1, !dbg !745, !tbaa !132
  %303 = getelementptr inbounds nuw i8, ptr %269, i32 %300, !dbg !746
  store i8 %302, ptr %303, align 2, !dbg !747, !tbaa !132
  %304 = or disjoint i32 %292, 3, !dbg !744
    #dbg_value(i32 %304, !122, !DIExpression(), !741)
  %305 = getelementptr inbounds nuw i8, ptr %172, i32 %304, !dbg !745
  %306 = load i8, ptr %305, align 1, !dbg !745, !tbaa !132
  %307 = getelementptr inbounds nuw i8, ptr %269, i32 %304, !dbg !746
  store i8 %306, ptr %307, align 1, !dbg !747, !tbaa !132
  %308 = add nuw i32 %292, 4, !dbg !744
    #dbg_value(i32 %308, !122, !DIExpression(), !741)
  %309 = icmp eq i32 %308, %270, !dbg !742
  br i1 %309, label %310, label %291, !dbg !743, !llvm.loop !750

310:                                              ; preds = %291, %287, %268
    #dbg_value(ptr %229, !571, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
    #dbg_value(i32 %201, !571, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
    #dbg_value(ptr %4, !572, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !592)
  %311 = tail call i32 @llvm.umin.i32(i32 %10, i32 %201), !dbg !751
    #dbg_value(i32 %311, !572, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !592)
    #dbg_value(i32 0, !573, !DIExpression(), !752)
  %312 = icmp eq i32 %311, 0, !dbg !753
  br i1 %312, label %365, label %313, !dbg !754

313:                                              ; preds = %310
  %314 = icmp ult i32 %311, 4, !dbg !754
  br i1 %314, label %344, label %315, !dbg !754

315:                                              ; preds = %313
  %316 = sub i32 %6, %20, !dbg !754
  %317 = icmp ult i32 %316, 16, !dbg !754
  %318 = sub i32 %6, %211, !dbg !754
  %319 = icmp ult i32 %318, 16, !dbg !754
  %320 = or i1 %317, %319, !dbg !754
  br i1 %320, label %344, label %321, !dbg !754

321:                                              ; preds = %315
  %322 = and i32 %311, 1073741820, !dbg !754
  %323 = insertelement <4 x i32> poison, i32 %3, i64 0, !dbg !754
  %324 = shufflevector <4 x i32> %323, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !754
  %325 = insertelement <4 x i32> poison, i32 %2, i64 0, !dbg !754
  %326 = shufflevector <4 x i32> %325, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !754
  br label %327, !dbg !754

327:                                              ; preds = %327, %321
  %328 = phi i32 [ 0, %321 ], [ %340, %327 ], !dbg !755
  %329 = getelementptr inbounds nuw i32, ptr %38, i32 %328, !dbg !756
  %330 = load <4 x i32>, ptr %329, align 8, !dbg !756, !tbaa !285
  %331 = getelementptr inbounds nuw i32, ptr %229, i32 %328, !dbg !757
  %332 = load <4 x i32>, ptr %331, align 8, !dbg !757, !tbaa !285
  %333 = icmp ult <4 x i32> %330, %332, !dbg !758
  %334 = mul <4 x i32> %332, %324, !dbg !759
  %335 = add <4 x i32> %334, %330, !dbg !759
  %336 = add <4 x i32> %330, %326, !dbg !759
  %337 = sub <4 x i32> %336, %332, !dbg !759
  %338 = select <4 x i1> %333, <4 x i32> %335, <4 x i32> %337, !dbg !759
  %339 = getelementptr inbounds nuw i32, ptr %4, i32 %328, !dbg !760
  store <4 x i32> %338, ptr %339, align 4, !dbg !761, !tbaa !285
  %340 = add nuw i32 %328, 4, !dbg !755
  %341 = icmp eq i32 %340, %322, !dbg !755
  br i1 %341, label %342, label %327, !dbg !755, !llvm.loop !762

342:                                              ; preds = %327
  %343 = icmp eq i32 %311, %322, !dbg !754
  br i1 %343, label %365, label %344, !dbg !754

344:                                              ; preds = %315, %313, %342
  %345 = phi i32 [ 0, %313 ], [ 0, %315 ], [ %322, %342 ]
  %346 = or disjoint i32 %345, 1, !dbg !754
  %347 = and i32 %311, 1, !dbg !754
  %348 = icmp eq i32 %347, 0, !dbg !754
  br i1 %348, label %362, label %349, !dbg !754

349:                                              ; preds = %344
    #dbg_value(i32 poison, !573, !DIExpression(), !752)
  %350 = getelementptr inbounds nuw i32, ptr %38, i32 %345, !dbg !756
  %351 = load i32, ptr %350, align 8, !dbg !756, !tbaa !285
    #dbg_value(i32 %351, !575, !DIExpression(), !764)
  %352 = getelementptr inbounds nuw i32, ptr %229, i32 %345, !dbg !757
  %353 = load i32, ptr %352, align 8, !dbg !757, !tbaa !285
    #dbg_value(i32 %353, !578, !DIExpression(), !764)
    #dbg_value(i32 %2, !579, !DIExpression(), !764)
    #dbg_value(i32 %3, !580, !DIExpression(), !764)
    #dbg_value(i32 %351, !581, !DIExpression(), !764)
  %354 = icmp ult i32 %351, %353, !dbg !758
  %355 = mul i32 %353, %3, !dbg !759
  %356 = add i32 %355, %351, !dbg !759
  %357 = add i32 %351, %2, !dbg !759
  %358 = sub i32 %357, %353, !dbg !759
  %359 = select i1 %354, i32 %356, i32 %358, !dbg !759
    #dbg_value(i32 %359, !582, !DIExpression(), !764)
  %360 = getelementptr inbounds nuw i32, ptr %4, i32 %345, !dbg !760
  store i32 %359, ptr %360, align 4, !dbg !761, !tbaa !285
  %361 = or disjoint i32 %345, 1, !dbg !755
    #dbg_value(i32 %361, !573, !DIExpression(), !752)
  br label %362, !dbg !754

362:                                              ; preds = %349, %344
  %363 = phi i32 [ %345, %344 ], [ %361, %349 ]
  %364 = icmp eq i32 %311, %346, !dbg !754
  br i1 %364, label %365, label %366, !dbg !754

365:                                              ; preds = %362, %366, %342, %310
  ret i32 %311, !dbg !765

366:                                              ; preds = %362, %366
  %367 = phi i32 [ %391, %366 ], [ %363, %362 ]
    #dbg_value(i32 %367, !573, !DIExpression(), !752)
  %368 = getelementptr inbounds nuw i32, ptr %38, i32 %367, !dbg !756
  %369 = load i32, ptr %368, align 4, !dbg !756, !tbaa !285
    #dbg_value(i32 %369, !575, !DIExpression(), !764)
  %370 = getelementptr inbounds nuw i32, ptr %229, i32 %367, !dbg !757
  %371 = load i32, ptr %370, align 4, !dbg !757, !tbaa !285
    #dbg_value(i32 %371, !578, !DIExpression(), !764)
    #dbg_value(i32 %2, !579, !DIExpression(), !764)
    #dbg_value(i32 %3, !580, !DIExpression(), !764)
    #dbg_value(i32 %369, !581, !DIExpression(), !764)
  %372 = icmp ult i32 %369, %371, !dbg !758
  %373 = mul i32 %371, %3, !dbg !759
  %374 = add i32 %373, %369, !dbg !759
  %375 = add i32 %369, %2, !dbg !759
  %376 = sub i32 %375, %371, !dbg !759
  %377 = select i1 %372, i32 %374, i32 %376, !dbg !759
    #dbg_value(i32 %377, !582, !DIExpression(), !764)
  %378 = getelementptr inbounds nuw i32, ptr %4, i32 %367, !dbg !760
  store i32 %377, ptr %378, align 4, !dbg !761, !tbaa !285
  %379 = add nuw i32 %367, 1, !dbg !755
    #dbg_value(i32 %379, !573, !DIExpression(), !752)
  %380 = getelementptr inbounds nuw i32, ptr %38, i32 %379, !dbg !756
  %381 = load i32, ptr %380, align 4, !dbg !756, !tbaa !285
    #dbg_value(i32 %381, !575, !DIExpression(), !764)
  %382 = getelementptr inbounds nuw i32, ptr %229, i32 %379, !dbg !757
  %383 = load i32, ptr %382, align 4, !dbg !757, !tbaa !285
    #dbg_value(i32 %383, !578, !DIExpression(), !764)
    #dbg_value(i32 %381, !581, !DIExpression(), !764)
  %384 = icmp ult i32 %381, %383, !dbg !758
  %385 = mul i32 %383, %3, !dbg !759
  %386 = add i32 %385, %381, !dbg !759
  %387 = add i32 %381, %2, !dbg !759
  %388 = sub i32 %387, %383, !dbg !759
  %389 = select i1 %384, i32 %386, i32 %388, !dbg !759
    #dbg_value(i32 %389, !582, !DIExpression(), !764)
  %390 = getelementptr inbounds nuw i32, ptr %4, i32 %379, !dbg !760
  store i32 %389, ptr %390, align 4, !dbg !761, !tbaa !285
  %391 = add nuw i32 %367, 2, !dbg !755
    #dbg_value(i32 %391, !573, !DIExpression(), !752)
  %392 = icmp eq i32 %391, %311, !dbg !753
  br i1 %392, label %365, label %366, !dbg !754, !llvm.loop !766
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
  store ptr %9, ptr %5, align 4, !dbg !801, !tbaa !441
  %30 = getelementptr inbounds nuw i8, ptr %5, i32 4, !dbg !801
  %31 = load i32, ptr %2, align 4, !dbg !802, !tbaa !27
  store i32 %31, ptr %30, align 4, !dbg !801, !tbaa !443
  store ptr %11, ptr %6, align 4, !dbg !803, !tbaa !441
  %32 = getelementptr inbounds nuw i8, ptr %6, i32 4, !dbg !803
  %33 = getelementptr inbounds nuw i8, ptr %2, i32 4, !dbg !804
  %34 = load i32, ptr %33, align 4, !dbg !804, !tbaa !27
  store i32 %34, ptr %32, align 4, !dbg !803, !tbaa !443
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
  %55 = tail call i32 @lang_fn_pipeline38_right_padded_zip_u32_into(ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %5, ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %6, i32 noundef %44, i32 noundef %54, ptr noundef %3) #13, !dbg !806
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
  store ptr %10, ptr %7, align 4, !dbg !891, !tbaa !441
  %31 = getelementptr inbounds nuw i8, ptr %7, i32 4, !dbg !891
  %32 = load i32, ptr %2, align 4, !dbg !892, !tbaa !27
  store i32 %32, ptr %31, align 4, !dbg !891, !tbaa !443
  store ptr %12, ptr %8, align 4, !dbg !893, !tbaa !441
  %33 = getelementptr inbounds nuw i8, ptr %8, i32 4, !dbg !893
  %34 = getelementptr inbounds nuw i8, ptr %2, i32 4, !dbg !894
  %35 = load i32, ptr %34, align 4, !dbg !894, !tbaa !27
  store i32 %35, ptr %33, align 4, !dbg !893, !tbaa !443
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
  call void @lang_fn_pipeline38_right_padded_zip_u32(ptr dead_on_unwind nonnull writable sret(%struct.ink_l_uint32) align 4 %6, ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %7, ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %8, i32 noundef %45, i32 noundef %55) #13, !dbg !896
  %56 = load ptr, ptr %6, align 4, !dbg !897, !tbaa !441
  store ptr %56, ptr %3, align 4, !dbg !898, !tbaa !792
  %57 = getelementptr inbounds nuw i8, ptr %6, i32 4, !dbg !899
  %58 = load i32, ptr %57, align 4, !dbg !899, !tbaa !443
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
!3 = !DIFile(filename: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_u32/prior/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
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
!15 = !DIFile(filename: "reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_u32/prior/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
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
!175 = !{!176, !177, !178, !179, !180, !181, !182, !184, !187, !188, !189, !190, !191, !192, !195, !197, !198, !199, !200, !202, !205, !206, !207, !208, !209, !210, !211, !212, !213, !216, !218, !219, !220, !221, !222, !223, !224, !226, !229, !230, !231, !232, !233, !234, !237, !238, !240}
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
!199 = !DILocalVariable(name: "t13", scope: !167, file: !15, line: 118, type: !170)
!200 = !DILocalVariable(name: "t14", scope: !201, file: !15, line: 119, type: !5)
!201 = distinct !DILexicalBlock(scope: !167, file: !15, line: 119, column: 1)
!202 = !DILocalVariable(name: "t15", scope: !203, file: !15, line: 120, type: !10)
!203 = distinct !DILexicalBlock(scope: !204, file: !15, line: 119, column: 36)
!204 = distinct !DILexicalBlock(scope: !201, file: !15, line: 119, column: 1)
!205 = !DILocalVariable(name: "t16", scope: !203, file: !15, line: 122, type: !10)
!206 = !DILocalVariable(name: "t17", scope: !203, file: !15, line: 124, type: !10)
!207 = !DILocalVariable(name: "t18", scope: !203, file: !15, line: 126, type: !10)
!208 = !DILocalVariable(name: "t19", scope: !203, file: !15, line: 129, type: !10)
!209 = !DILocalVariable(name: "t20", scope: !203, file: !15, line: 131, type: !10)
!210 = !DILocalVariable(name: "t21", scope: !203, file: !15, line: 133, type: !10)
!211 = !DILocalVariable(name: "t22", scope: !203, file: !15, line: 137, type: !10)
!212 = !DILocalVariable(name: "t23", scope: !203, file: !15, line: 139, type: !10)
!213 = !DILocalVariable(name: "t24", scope: !214, file: !15, line: 141, type: !10)
!214 = distinct !DILexicalBlock(scope: !215, file: !15, line: 140, column: 18)
!215 = distinct !DILexicalBlock(scope: !203, file: !15, line: 140, column: 5)
!216 = !DILocalVariable(name: "t25", scope: !217, file: !15, line: 145, type: !10)
!217 = distinct !DILexicalBlock(scope: !215, file: !15, line: 144, column: 8)
!218 = !DILocalVariable(name: "t26", scope: !167, file: !15, line: 151, type: !170)
!219 = !DILocalVariable(name: "t27", scope: !167, file: !15, line: 153, type: !170)
!220 = !DILocalVariable(name: "t28", scope: !167, file: !15, line: 156, type: !5)
!221 = !DILocalVariable(name: "t29", scope: !167, file: !15, line: 157, type: !170)
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
!241 = !DILocation(line: 82, column: 67, scope: !167)
!242 = !DILocation(line: 82, column: 83, scope: !167)
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
!294 = !DILocation(line: 0, scope: !51, inlinedAt: !295)
!295 = distinct !DILocation(line: 118, column: 19, scope: !167)
!296 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !295)
!297 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !298)
!298 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !295)
!299 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !298)
!300 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !295)
!301 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !295)
!302 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !295)
!303 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !295)
!304 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !295)
!305 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !295)
!306 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !307)
!307 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !295)
!308 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !307)
!309 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !295)
!310 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !295)
!311 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !295)
!312 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !295)
!313 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !295)
!314 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !295)
!315 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !295)
!316 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !295)
!317 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !295)
!318 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !295)
!319 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !320)
!320 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !295)
!321 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !320)
!322 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !295)
!323 = !DILocation(line: 0, scope: !201)
!324 = !DILocation(line: 119, column: 1, scope: !201)
!325 = !DILocation(line: 119, column: 33, scope: !204)
!326 = !DILocation(line: 122, column: 14, scope: !203)
!327 = !DILocation(line: 136, column: 18, scope: !328)
!328 = distinct !DILexicalBlock(scope: !329, file: !15, line: 136, column: 8)
!329 = distinct !DILexicalBlock(scope: !203, file: !15, line: 134, column: 5)
!330 = !DILocation(line: 140, column: 10, scope: !215)
!331 = !DILocation(line: 140, column: 5, scope: !215)
!332 = !DILocation(line: 149, column: 1, scope: !203)
!333 = !DILocation(line: 149, column: 14, scope: !203)
!334 = distinct !{!334, !324, !335, !137, !138, !139}
!335 = !DILocation(line: 150, column: 1, scope: !201)
!336 = !DILocation(line: 0, scope: !203)
!337 = distinct !{!337, !282, !292, !137, !138}
!338 = !DILocation(line: 153, column: 18, scope: !167)
!339 = !DILocation(line: 155, column: 20, scope: !340)
!340 = distinct !DILexicalBlock(scope: !167, file: !15, line: 155, column: 4)
!341 = !DILocation(line: 155, column: 11, scope: !340)
!342 = !DILocation(line: 119, column: 21, scope: !204)
!343 = distinct !{!343, !324, !335, !137, !138}
!344 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !345)
!345 = distinct !DILocation(line: 155, column: 30, scope: !340)
!346 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !345)
!347 = !DILocation(line: 156, column: 19, scope: !167)
!348 = !DILocation(line: 0, scope: !51, inlinedAt: !349)
!349 = distinct !DILocation(line: 157, column: 19, scope: !167)
!350 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !349)
!351 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !349)
!352 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !353)
!353 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !349)
!354 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !353)
!355 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !349)
!356 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !349)
!357 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !349)
!358 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !349)
!359 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !349)
!360 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !349)
!361 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !349)
!362 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !349)
!363 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !364)
!364 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !349)
!365 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !364)
!366 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !349)
!367 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !349)
!368 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !349)
!369 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !349)
!370 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !349)
!371 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !349)
!372 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !349)
!373 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !349)
!374 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !349)
!375 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !349)
!376 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !377)
!377 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !349)
!378 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !377)
!379 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !349)
!380 = !DILocation(line: 158, column: 35, scope: !167)
!381 = !DILocation(line: 0, scope: !111, inlinedAt: !382)
!382 = distinct !DILocation(line: 158, column: 1, scope: !167)
!383 = !DILocation(line: 0, scope: !123, inlinedAt: !382)
!384 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !382)
!385 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !382)
!386 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !382)
!387 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !382)
!388 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !382)
!389 = distinct !{!389, !384, !390, !137, !138, !139}
!390 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !382)
!391 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !382)
!392 = distinct !{!392, !384, !390, !137, !138}
!393 = !DILocation(line: 159, column: 18, scope: !167)
!394 = !DILocation(line: 159, column: 43, scope: !167)
!395 = !DILocation(line: 0, scope: !111, inlinedAt: !396)
!396 = distinct !DILocation(line: 159, column: 1, scope: !167)
!397 = !DILocation(line: 0, scope: !123, inlinedAt: !396)
!398 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !396)
!399 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !396)
!400 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !396)
!401 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !396)
!402 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !396)
!403 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !396)
!404 = distinct !{!404, !399, !405, !137, !138, !139}
!405 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !396)
!406 = distinct !{!406, !399, !405, !137, !138}
!407 = !DILocation(line: 162, column: 14, scope: !167)
!408 = !DILocation(line: 162, column: 30, scope: !167)
!409 = !DILocation(line: 0, scope: !51, inlinedAt: !410)
!410 = distinct !DILocation(line: 162, column: 19, scope: !167)
!411 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !410)
!412 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !413)
!413 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !410)
!414 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !413)
!415 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !410)
!416 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !410)
!417 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !410)
!418 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !410)
!419 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !410)
!420 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !410)
!421 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !410)
!422 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !410)
!423 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !424)
!424 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !410)
!425 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !424)
!426 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !410)
!427 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !410)
!428 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !410)
!429 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !410)
!430 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !410)
!431 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !410)
!432 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !410)
!433 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !410)
!434 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !410)
!435 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !410)
!436 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !437)
!437 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !410)
!438 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !437)
!439 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !410)
!440 = !DILocation(line: 162, column: 18, scope: !167)
!441 = !{!442, !246, i64 0}
!442 = !{!"", !246, i64 0, !28, i64 4}
!443 = !{!442, !28, i64 4}
!444 = !DILocation(line: 0, scope: !225)
!445 = !DILocation(line: 163, column: 21, scope: !228)
!446 = !DILocation(line: 163, column: 1, scope: !225)
!447 = !DILocation(line: 163, column: 65, scope: !228)
!448 = !DILocation(line: 164, column: 14, scope: !227)
!449 = !DILocation(line: 166, column: 14, scope: !227)
!450 = !DILocation(line: 176, column: 10, scope: !236)
!451 = !DILocation(line: 176, column: 5, scope: !236)
!452 = !DILocation(line: 189, column: 1, scope: !227)
!453 = !DILocation(line: 189, column: 14, scope: !227)
!454 = distinct !{!454, !446, !455, !137, !138, !139}
!455 = !DILocation(line: 190, column: 1, scope: !225)
!456 = !DILocation(line: 0, scope: !227)
!457 = !DILocation(line: 192, column: 1, scope: !167)
!458 = distinct !{!458, !446, !455, !137, !138}
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
!520 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_u32_into", scope: !15, file: !15, line: 262, type: !521, scopeLine: 262, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !523)
!521 = !DISubroutineType(types: !522)
!522 = !{!5, !170, !170, !10, !10, !13}
!523 = !{!524, !525, !526, !527, !528, !529, !530, !531, !533, !536, !537, !538, !539, !540, !541, !544, !546, !547, !548, !549, !551, !554, !555, !556, !557, !558, !559, !560, !561, !562, !565, !567, !568, !569, !570, !571, !572, !573, !575, !578, !579, !580, !581, !582, !583, !586, !587, !589}
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
!548 = !DILocalVariable(name: "t13", scope: !520, file: !15, line: 298, type: !170)
!549 = !DILocalVariable(name: "t14", scope: !550, file: !15, line: 299, type: !5)
!550 = distinct !DILexicalBlock(scope: !520, file: !15, line: 299, column: 1)
!551 = !DILocalVariable(name: "t15", scope: !552, file: !15, line: 300, type: !10)
!552 = distinct !DILexicalBlock(scope: !553, file: !15, line: 299, column: 36)
!553 = distinct !DILexicalBlock(scope: !550, file: !15, line: 299, column: 1)
!554 = !DILocalVariable(name: "t16", scope: !552, file: !15, line: 302, type: !10)
!555 = !DILocalVariable(name: "t17", scope: !552, file: !15, line: 304, type: !10)
!556 = !DILocalVariable(name: "t18", scope: !552, file: !15, line: 306, type: !10)
!557 = !DILocalVariable(name: "t19", scope: !552, file: !15, line: 309, type: !10)
!558 = !DILocalVariable(name: "t20", scope: !552, file: !15, line: 311, type: !10)
!559 = !DILocalVariable(name: "t21", scope: !552, file: !15, line: 313, type: !10)
!560 = !DILocalVariable(name: "t22", scope: !552, file: !15, line: 317, type: !10)
!561 = !DILocalVariable(name: "t23", scope: !552, file: !15, line: 319, type: !10)
!562 = !DILocalVariable(name: "t24", scope: !563, file: !15, line: 321, type: !10)
!563 = distinct !DILexicalBlock(scope: !564, file: !15, line: 320, column: 18)
!564 = distinct !DILexicalBlock(scope: !552, file: !15, line: 320, column: 5)
!565 = !DILocalVariable(name: "t25", scope: !566, file: !15, line: 325, type: !10)
!566 = distinct !DILexicalBlock(scope: !564, file: !15, line: 324, column: 8)
!567 = !DILocalVariable(name: "t26", scope: !520, file: !15, line: 331, type: !170)
!568 = !DILocalVariable(name: "t27", scope: !520, file: !15, line: 333, type: !170)
!569 = !DILocalVariable(name: "t28", scope: !520, file: !15, line: 336, type: !5)
!570 = !DILocalVariable(name: "t29", scope: !520, file: !15, line: 337, type: !170)
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
!590 = !DILocation(line: 262, column: 66, scope: !520)
!591 = !DILocation(line: 262, column: 82, scope: !520)
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
!638 = !DILocation(line: 0, scope: !51, inlinedAt: !639)
!639 = distinct !DILocation(line: 298, column: 19, scope: !520)
!640 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !639)
!641 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !642)
!642 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !639)
!643 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !642)
!644 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !639)
!645 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !639)
!646 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !639)
!647 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !639)
!648 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !639)
!649 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !639)
!650 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !651)
!651 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !639)
!652 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !651)
!653 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !639)
!654 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !639)
!655 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !639)
!656 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !639)
!657 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !639)
!658 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !639)
!659 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !639)
!660 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !639)
!661 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !639)
!662 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !639)
!663 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !664)
!664 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !639)
!665 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !664)
!666 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !639)
!667 = !DILocation(line: 0, scope: !550)
!668 = !DILocation(line: 299, column: 1, scope: !550)
!669 = !DILocation(line: 299, column: 33, scope: !553)
!670 = !DILocation(line: 302, column: 14, scope: !552)
!671 = !DILocation(line: 316, column: 18, scope: !672)
!672 = distinct !DILexicalBlock(scope: !673, file: !15, line: 316, column: 8)
!673 = distinct !DILexicalBlock(scope: !552, file: !15, line: 314, column: 5)
!674 = !DILocation(line: 320, column: 10, scope: !564)
!675 = !DILocation(line: 320, column: 5, scope: !564)
!676 = !DILocation(line: 329, column: 1, scope: !552)
!677 = !DILocation(line: 329, column: 14, scope: !552)
!678 = distinct !{!678, !668, !679, !137, !138, !139}
!679 = !DILocation(line: 330, column: 1, scope: !550)
!680 = !DILocation(line: 0, scope: !552)
!681 = distinct !{!681, !628, !636, !137, !138}
!682 = !DILocation(line: 333, column: 18, scope: !520)
!683 = !DILocation(line: 335, column: 20, scope: !684)
!684 = distinct !DILexicalBlock(scope: !520, file: !15, line: 335, column: 4)
!685 = !DILocation(line: 335, column: 11, scope: !684)
!686 = !DILocation(line: 299, column: 21, scope: !553)
!687 = distinct !{!687, !668, !679, !137, !138}
!688 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !689)
!689 = distinct !DILocation(line: 335, column: 30, scope: !684)
!690 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !689)
!691 = !DILocation(line: 336, column: 19, scope: !520)
!692 = !DILocation(line: 0, scope: !51, inlinedAt: !693)
!693 = distinct !DILocation(line: 337, column: 19, scope: !520)
!694 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !693)
!695 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !693)
!696 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !697)
!697 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !693)
!698 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !697)
!699 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !693)
!700 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !693)
!701 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !693)
!702 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !693)
!703 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !693)
!704 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !693)
!705 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !693)
!706 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !693)
!707 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !708)
!708 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !693)
!709 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !708)
!710 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !693)
!711 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !693)
!712 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !693)
!713 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !693)
!714 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !693)
!715 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !693)
!716 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !693)
!717 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !693)
!718 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !693)
!719 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !693)
!720 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !721)
!721 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !693)
!722 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !721)
!723 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !693)
!724 = !DILocation(line: 338, column: 35, scope: !520)
!725 = !DILocation(line: 0, scope: !111, inlinedAt: !726)
!726 = distinct !DILocation(line: 338, column: 1, scope: !520)
!727 = !DILocation(line: 0, scope: !123, inlinedAt: !726)
!728 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !726)
!729 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !726)
!730 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !726)
!731 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !726)
!732 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !726)
!733 = distinct !{!733, !728, !734, !137, !138, !139}
!734 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !726)
!735 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !726)
!736 = distinct !{!736, !728, !734, !137, !138}
!737 = !DILocation(line: 339, column: 18, scope: !520)
!738 = !DILocation(line: 339, column: 43, scope: !520)
!739 = !DILocation(line: 0, scope: !111, inlinedAt: !740)
!740 = distinct !DILocation(line: 339, column: 1, scope: !520)
!741 = !DILocation(line: 0, scope: !123, inlinedAt: !740)
!742 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !740)
!743 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !740)
!744 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !740)
!745 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !740)
!746 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !740)
!747 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !740)
!748 = distinct !{!748, !743, !749, !137, !138, !139}
!749 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !740)
!750 = distinct !{!750, !743, !749, !137, !138}
!751 = !DILocation(line: 342, column: 32, scope: !520)
!752 = !DILocation(line: 0, scope: !574)
!753 = !DILocation(line: 343, column: 21, scope: !577)
!754 = !DILocation(line: 343, column: 1, scope: !574)
!755 = !DILocation(line: 343, column: 65, scope: !577)
!756 = !DILocation(line: 344, column: 14, scope: !576)
!757 = !DILocation(line: 346, column: 14, scope: !576)
!758 = !DILocation(line: 356, column: 10, scope: !585)
!759 = !DILocation(line: 356, column: 5, scope: !585)
!760 = !DILocation(line: 369, column: 1, scope: !576)
!761 = !DILocation(line: 369, column: 14, scope: !576)
!762 = distinct !{!762, !754, !763, !137, !138, !139}
!763 = !DILocation(line: 370, column: 1, scope: !574)
!764 = !DILocation(line: 0, scope: !576)
!765 = !DILocation(line: 371, column: 1, scope: !520)
!766 = distinct !{!766, !754, !763, !137, !138}
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
!801 = !DILocation(line: 374, column: 231, scope: !780)
!802 = !DILocation(line: 374, column: 235, scope: !780)
!803 = !DILocation(line: 374, column: 261, scope: !780)
!804 = !DILocation(line: 374, column: 265, scope: !780)
!805 = !DILocation(line: 374, column: 280, scope: !780)
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
!891 = !DILocation(line: 377, column: 239, scope: !823)
!892 = !DILocation(line: 377, column: 243, scope: !823)
!893 = !DILocation(line: 377, column: 269, scope: !823)
!894 = !DILocation(line: 377, column: 273, scope: !823)
!895 = !DILocation(line: 377, column: 288, scope: !823)
!896 = !DILocation(line: 377, column: 185, scope: !823)
!897 = !DILocation(line: 377, column: 307, scope: !823)
!898 = !DILocation(line: 377, column: 299, scope: !823)
!899 = !DILocation(line: 377, column: 326, scope: !823)
!900 = !DILocation(line: 377, column: 318, scope: !823)
!901 = !DILocation(line: 377, column: 338, scope: !824)
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
