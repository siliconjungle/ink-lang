; ModuleID = '/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_heldout_u32/checked/cpu.c'
source_filename = "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_heldout_u32/checked/cpu.c"
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
define hidden void @lang_fn_pipeline38_right_padded_zip_heldout_u32(ptr dead_on_unwind noalias nocapture writable writeonly sret(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %1, ptr nocapture noundef readnone byval(%struct.ink_l_uint32) align 4 %2, i32 noundef %3, i32 noundef %4) local_unnamed_addr #2 !dbg !167 {
    #dbg_declare(ptr %1, !176, !DIExpression(), !238)
    #dbg_declare(ptr %2, !177, !DIExpression(), !239)
    #dbg_value(i32 %3, !178, !DIExpression(), !240)
    #dbg_value(i32 %4, !179, !DIExpression(), !240)
  %6 = load ptr, ptr %1, align 4, !dbg !241, !tbaa !242
  %7 = ptrtoint ptr %6 to i32, !dbg !241
  %8 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !241
  %9 = load i32, ptr %8, align 4, !dbg !241, !tbaa !27
    #dbg_value(ptr %6, !180, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !240)
    #dbg_value(i32 %9, !180, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !240)
    #dbg_declare(ptr %0, !181, !DIExpression(), !245)
    #dbg_value(i32 %9, !55, !DIExpression(), !246)
    #dbg_value(i32 4, !56, !DIExpression(), !246)
  %10 = icmp ugt i32 %9, 1073741823, !dbg !248
  %11 = load i32, ptr @ink_top, align 4
  %12 = icmp ugt i32 %11, -8
  %13 = select i1 %10, i1 true, i1 %12, !dbg !249
  br i1 %13, label %14, label %15, !dbg !249

14:                                               ; preds = %5
  tail call void @llvm.trap(), !dbg !250
  unreachable, !dbg !252

15:                                               ; preds = %5
  %16 = icmp eq i32 %11, 0, !dbg !253
  %17 = add nuw i32 %11, 7, !dbg !254
  %18 = select i1 %16, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %17, !dbg !255
  %19 = and i32 %18, -8, !dbg !256
    #dbg_value(i32 %19, !57, !DIExpression(), !246)
  %20 = tail call i32 @llvm.umax.i32(i32 %9, i32 1), !dbg !257
  %21 = shl nuw i32 %20, 2, !dbg !258
    #dbg_value(i32 %21, !58, !DIExpression(), !246)
  %22 = xor i32 %19, -1, !dbg !259
  %23 = icmp ugt i32 %21, %22, !dbg !260
  br i1 %23, label %24, label %25, !dbg !260

24:                                               ; preds = %15
  tail call void @llvm.trap(), !dbg !261
  unreachable, !dbg !263

25:                                               ; preds = %15
  %26 = add i32 %19, %21, !dbg !264
  store i32 %26, ptr @ink_top, align 4, !dbg !265, !tbaa !27
  %27 = add i32 %26, 65535, !dbg !266
  %28 = lshr i32 %27, 16, !dbg !267
    #dbg_value(i32 %28, !59, !DIExpression(), !246)
  %29 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !268
    #dbg_value(i32 %29, !60, !DIExpression(), !246)
  %30 = icmp ugt i32 %28, %29, !dbg !269
  br i1 %30, label %31, label %36, !dbg !270

31:                                               ; preds = %25
  %32 = sub nuw nsw i32 %28, %29, !dbg !271
  %33 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %32), !dbg !272
  %34 = icmp eq i32 %33, -1, !dbg !273
  br i1 %34, label %35, label %36, !dbg !270

35:                                               ; preds = %31
  tail call void @llvm.trap(), !dbg !274
  unreachable, !dbg !276

36:                                               ; preds = %25, %31
  %37 = inttoptr i32 %19 to ptr, !dbg !277
  store ptr %37, ptr %0, align 4, !dbg !278, !tbaa !279
  %38 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !278
  store i32 %9, ptr %38, align 4, !dbg !278, !tbaa !281
    #dbg_value(i32 0, !182, !DIExpression(), !282)
  %39 = icmp eq i32 %9, 0, !dbg !283
  br i1 %39, label %189, label %40, !dbg !284

40:                                               ; preds = %36
  %41 = icmp eq i32 %4, 0
  %42 = icmp ult i32 %9, 4, !dbg !284
  %43 = sub i32 %19, %7, !dbg !284
  %44 = icmp ult i32 %43, 16, !dbg !284
  %45 = select i1 %42, i1 true, i1 %44, !dbg !284
  br i1 %45, label %187, label %46, !dbg !284

46:                                               ; preds = %40
  %47 = and i32 %9, 1073741820, !dbg !284
  %48 = insertelement <4 x i1> poison, i1 %41, i64 0, !dbg !284
  %49 = shufflevector <4 x i1> %48, <4 x i1> poison, <4 x i32> zeroinitializer, !dbg !284
  %50 = xor <4 x i1> %49, splat (i1 true), !dbg !285
  %51 = insertelement <4 x i32> poison, i32 %3, i64 0, !dbg !284
  %52 = shufflevector <4 x i32> %51, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !284
  %53 = insertelement <4 x i32> poison, i32 %4, i64 0, !dbg !284
  %54 = shufflevector <4 x i32> %53, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !284
  %55 = extractelement <4 x i1> %50, i64 0
  %56 = extractelement <4 x i1> %50, i64 1
  %57 = extractelement <4 x i1> %50, i64 2
  %58 = extractelement <4 x i1> %50, i64 3
  br label %59, !dbg !284

59:                                               ; preds = %167, %46
  %60 = phi i32 [ 0, %46 ], [ %182, %167 ], !dbg !287
  %61 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %46 ], [ %183, %167 ]
  %62 = getelementptr inbounds nuw i32, ptr %6, i32 %60, !dbg !288
  %63 = load <4 x i32>, ptr %62, align 4, !dbg !289, !tbaa !290
  br i1 %55, label %64, label %70, !dbg !285

64:                                               ; preds = %59
  %65 = extractelement <4 x i32> %63, i64 0, !dbg !292
  %66 = udiv i32 %65, %4, !dbg !292
  %67 = insertelement <4 x i32> poison, i32 %66, i64 0, !dbg !292
  %68 = urem i32 %60, %4, !dbg !294
  %69 = insertelement <4 x i32> poison, i32 %68, i64 0, !dbg !294
  br label %70, !dbg !289

70:                                               ; preds = %64, %59
  %71 = phi <4 x i32> [ poison, %59 ], [ %67, %64 ], !dbg !292
  %72 = phi <4 x i32> [ poison, %59 ], [ %69, %64 ], !dbg !294
  br i1 %56, label %73, label %80, !dbg !294

73:                                               ; preds = %70
  %74 = or disjoint i32 %60, 1, !dbg !285
  %75 = extractelement <4 x i32> %63, i64 1, !dbg !292
  %76 = udiv i32 %75, %4, !dbg !292
  %77 = insertelement <4 x i32> %71, i32 %76, i64 1, !dbg !292
  %78 = urem i32 %74, %4, !dbg !294
  %79 = insertelement <4 x i32> %72, i32 %78, i64 1, !dbg !294
  br label %80, !dbg !294

80:                                               ; preds = %73, %70
  %81 = phi <4 x i32> [ %71, %70 ], [ %77, %73 ], !dbg !292
  %82 = phi <4 x i32> [ %72, %70 ], [ %79, %73 ], !dbg !294
  br i1 %57, label %83, label %90, !dbg !294

83:                                               ; preds = %80
  %84 = or disjoint i32 %60, 2, !dbg !285
  %85 = extractelement <4 x i32> %63, i64 2, !dbg !292
  %86 = udiv i32 %85, %4, !dbg !292
  %87 = insertelement <4 x i32> %81, i32 %86, i64 2, !dbg !292
  %88 = urem i32 %84, %4, !dbg !294
  %89 = insertelement <4 x i32> %82, i32 %88, i64 2, !dbg !294
  br label %90, !dbg !294

90:                                               ; preds = %83, %80
  %91 = phi <4 x i32> [ %81, %80 ], [ %87, %83 ], !dbg !292
  %92 = phi <4 x i32> [ %82, %80 ], [ %89, %83 ], !dbg !294
  br i1 %58, label %93, label %100, !dbg !294

93:                                               ; preds = %90
  %94 = or disjoint i32 %60, 3, !dbg !285
  %95 = extractelement <4 x i32> %63, i64 3, !dbg !292
  %96 = udiv i32 %95, %4, !dbg !292
  %97 = insertelement <4 x i32> %91, i32 %96, i64 3, !dbg !292
  %98 = urem i32 %94, %4, !dbg !294
  %99 = insertelement <4 x i32> %92, i32 %98, i64 3, !dbg !294
  br label %100, !dbg !294

100:                                              ; preds = %93, %90
  %101 = phi <4 x i32> [ %91, %90 ], [ %97, %93 ], !dbg !292
  %102 = phi <4 x i32> [ %92, %90 ], [ %99, %93 ], !dbg !294
  %103 = add <4 x i32> %102, %101
  %104 = add <4 x i32> %103, %52, !dbg !297
  %105 = icmp ult <4 x i32> %61, %52, !dbg !298
  %106 = add <4 x i32> %63, %54, !dbg !299
  %107 = mul <4 x i32> %63, splat (i32 3), !dbg !299
  %108 = select <4 x i1> %105, <4 x i32> %106, <4 x i32> %107, !dbg !299
  %109 = icmp ult <4 x i32> %104, %108, !dbg !300
  %110 = select <4 x i1> %49, <4 x i1> splat (i1 true), <4 x i1> %109, !dbg !301
  %111 = xor <4 x i1> %110, splat (i1 true), !dbg !301
  %112 = extractelement <4 x i1> %111, i64 0, !dbg !301
  br i1 %112, label %113, label %117, !dbg !294

113:                                              ; preds = %100
  %114 = extractelement <4 x i32> %108, i64 0, !dbg !302
  %115 = urem i32 %114, %4, !dbg !302
  %116 = insertelement <4 x i32> poison, i32 %115, i64 0, !dbg !302
  br label %117, !dbg !301

117:                                              ; preds = %113, %100
  %118 = phi <4 x i32> [ poison, %100 ], [ %116, %113 ], !dbg !302
  %119 = extractelement <4 x i1> %111, i64 1, !dbg !302
  br i1 %119, label %120, label %124, !dbg !302

120:                                              ; preds = %117
  %121 = extractelement <4 x i32> %108, i64 1, !dbg !302
  %122 = urem i32 %121, %4, !dbg !302
  %123 = insertelement <4 x i32> %118, i32 %122, i64 1, !dbg !302
  br label %124, !dbg !302

124:                                              ; preds = %120, %117
  %125 = phi <4 x i32> [ %118, %117 ], [ %123, %120 ], !dbg !302
  %126 = extractelement <4 x i1> %111, i64 2, !dbg !302
  br i1 %126, label %127, label %131, !dbg !302

127:                                              ; preds = %124
  %128 = extractelement <4 x i32> %108, i64 2, !dbg !302
  %129 = urem i32 %128, %4, !dbg !302
  %130 = insertelement <4 x i32> %125, i32 %129, i64 2, !dbg !302
  br label %131, !dbg !302

131:                                              ; preds = %127, %124
  %132 = phi <4 x i32> [ %125, %124 ], [ %130, %127 ], !dbg !302
  %133 = extractelement <4 x i1> %111, i64 3, !dbg !302
  br i1 %133, label %134, label %138, !dbg !302

134:                                              ; preds = %131
  %135 = extractelement <4 x i32> %108, i64 3, !dbg !302
  %136 = urem i32 %135, %4, !dbg !302
  %137 = insertelement <4 x i32> %132, i32 %136, i64 3, !dbg !302
  br label %138, !dbg !302

138:                                              ; preds = %134, %131
  %139 = phi <4 x i32> [ %132, %131 ], [ %137, %134 ], !dbg !302
  %140 = select <4 x i1> %50, <4 x i1> %109, <4 x i1> zeroinitializer, !dbg !301
  %141 = extractelement <4 x i1> %140, i64 0, !dbg !301
  br i1 %141, label %142, label %146, !dbg !302

142:                                              ; preds = %138
  %143 = extractelement <4 x i32> %104, i64 0, !dbg !305
  %144 = udiv i32 %143, %4, !dbg !305
  %145 = insertelement <4 x i32> poison, i32 %144, i64 0, !dbg !305
  br label %146, !dbg !301

146:                                              ; preds = %142, %138
  %147 = phi <4 x i32> [ poison, %138 ], [ %145, %142 ], !dbg !305
  %148 = extractelement <4 x i1> %140, i64 1, !dbg !305
  br i1 %148, label %149, label %153, !dbg !305

149:                                              ; preds = %146
  %150 = extractelement <4 x i32> %104, i64 1, !dbg !305
  %151 = udiv i32 %150, %4, !dbg !305
  %152 = insertelement <4 x i32> %147, i32 %151, i64 1, !dbg !305
  br label %153, !dbg !305

153:                                              ; preds = %149, %146
  %154 = phi <4 x i32> [ %147, %146 ], [ %152, %149 ], !dbg !305
  %155 = extractelement <4 x i1> %140, i64 2, !dbg !305
  br i1 %155, label %156, label %160, !dbg !305

156:                                              ; preds = %153
  %157 = extractelement <4 x i32> %104, i64 2, !dbg !305
  %158 = udiv i32 %157, %4, !dbg !305
  %159 = insertelement <4 x i32> %154, i32 %158, i64 2, !dbg !305
  br label %160, !dbg !305

160:                                              ; preds = %156, %153
  %161 = phi <4 x i32> [ %154, %153 ], [ %159, %156 ], !dbg !305
  %162 = extractelement <4 x i1> %140, i64 3, !dbg !305
  br i1 %162, label %163, label %167, !dbg !305

163:                                              ; preds = %160
  %164 = extractelement <4 x i32> %104, i64 3, !dbg !305
  %165 = udiv i32 %164, %4, !dbg !305
  %166 = insertelement <4 x i32> %161, i32 %165, i64 3, !dbg !305
  br label %167, !dbg !305

167:                                              ; preds = %163, %160
  %168 = phi <4 x i32> [ %161, %160 ], [ %166, %163 ], !dbg !305
  %169 = icmp ult <4 x i32> %61, %52, !dbg !298
  %170 = mul <4 x i32> %63, splat (i32 3), !dbg !299
  %171 = select <4 x i1> %169, <4 x i32> %63, <4 x i32> %170, !dbg !299
  %172 = icmp ult <4 x i32> %52, %171, !dbg !300
  %173 = xor <4 x i1> %172, splat (i1 true), !dbg !301
  %174 = select <4 x i1> %49, <4 x i1> %173, <4 x i1> zeroinitializer, !dbg !301
  %175 = add <4 x i32> %139, %104, !dbg !308
  %176 = select <4 x i1> %49, <4 x i1> %172, <4 x i1> zeroinitializer, !dbg !301
  %177 = add <4 x i32> %168, %108, !dbg !309
  %178 = select <4 x i1> %176, <4 x i32> %171, <4 x i32> %177, !dbg !309
  %179 = select <4 x i1> %110, <4 x i32> %178, <4 x i32> %175, !dbg !310
  %180 = select <4 x i1> %174, <4 x i32> %52, <4 x i32> %179, !dbg !310
  %181 = getelementptr inbounds nuw i32, ptr %37, i32 %60, !dbg !311
  store <4 x i32> %180, ptr %181, align 8, !dbg !312, !tbaa !290
  %182 = add nuw i32 %60, 4, !dbg !287
  %183 = add <4 x i32> %61, splat (i32 4)
  %184 = icmp eq i32 %182, %47, !dbg !287
  br i1 %184, label %185, label %59, !dbg !287, !llvm.loop !313

185:                                              ; preds = %167
  %186 = icmp eq i32 %9, %47, !dbg !284
  br i1 %186, label %189, label %187, !dbg !284

187:                                              ; preds = %40, %185
  %188 = phi i32 [ 0, %40 ], [ %47, %185 ]
  br label %190, !dbg !284

189:                                              ; preds = %221, %185, %36
  ret void, !dbg !315

190:                                              ; preds = %187, %221
  %191 = phi i32 [ %224, %221 ], [ %188, %187 ]
    #dbg_value(i32 %191, !182, !DIExpression(), !282)
    #dbg_value(i32 %191, !184, !DIExpression(), !316)
  %192 = getelementptr inbounds nuw i32, ptr %6, i32 %191, !dbg !288
    #dbg_value(i32 poison, !187, !DIExpression(), !316)
    #dbg_value(i32 %3, !188, !DIExpression(), !316)
    #dbg_value(i32 %4, !189, !DIExpression(), !316)
    #dbg_value(i32 %191, !190, !DIExpression(), !316)
    #dbg_value(i32 poison, !191, !DIExpression(), !316)
    #dbg_value(i32 %3, !192, !DIExpression(), !316)
    #dbg_value(i32 %4, !193, !DIExpression(), !316)
    #dbg_value(i32 poison, !194, !DIExpression(), !316)
    #dbg_value(i32 %4, !195, !DIExpression(), !316)
  %193 = load i32, ptr %192, align 4, !dbg !289, !tbaa !290
  br i1 %41, label %194, label %199, !dbg !285

194:                                              ; preds = %190
    #dbg_value(i32 poison, !200, !DIExpression(), !316)
    #dbg_value(i32 0, !201, !DIExpression(), !316)
    #dbg_value(i32 %3, !202, !DIExpression(), !316)
    #dbg_value(i32 %191, !203, !DIExpression(), !316)
    #dbg_value(i32 %193, !204, !DIExpression(), !316)
    #dbg_value(i32 %3, !205, !DIExpression(), !316)
    #dbg_value(i32 %4, !206, !DIExpression(), !316)
    #dbg_value(i32 %191, !207, !DIExpression(), !316)
    #dbg_value(i32 %193, !208, !DIExpression(), !316)
    #dbg_value(i32 %3, !209, !DIExpression(), !316)
    #dbg_value(i32 %4, !210, !DIExpression(), !316)
    #dbg_value(i32 %191, !211, !DIExpression(), !316)
  %195 = icmp ult i32 %191, %3, !dbg !298
  %196 = mul i32 %193, 3, !dbg !299
  %197 = select i1 %195, i32 %193, i32 %196, !dbg !299
    #dbg_value(i32 %197, !212, !DIExpression(), !316)
    #dbg_value(i32 %197, !218, !DIExpression(), !316)
    #dbg_value(i32 %3, !219, !DIExpression(), !316)
    #dbg_value(i32 %4, !220, !DIExpression(), !316)
    #dbg_value(i32 %3, !221, !DIExpression(), !316)
    #dbg_value(i32 %197, !222, !DIExpression(), !316)
    #dbg_value(i32 %3, !223, !DIExpression(), !316)
    #dbg_value(i32 %4, !224, !DIExpression(), !316)
    #dbg_value(i32 %3, !225, !DIExpression(), !316)
  %198 = icmp ult i32 %3, %197, !dbg !300
  br i1 %198, label %211, label %217, !dbg !301

199:                                              ; preds = %190
    #dbg_value(i32 %193, !187, !DIExpression(), !316)
    #dbg_value(i32 %193, !191, !DIExpression(), !316)
    #dbg_value(i32 %193, !194, !DIExpression(), !316)
  %200 = udiv i32 %193, %4, !dbg !292
    #dbg_value(i32 %200, !196, !DIExpression(), !316)
    #dbg_value(i32 %200, !197, !DIExpression(), !316)
    #dbg_value(i32 %191, !198, !DIExpression(), !316)
    #dbg_value(i32 %4, !199, !DIExpression(), !316)
  %201 = urem i32 %191, %4, !dbg !294
    #dbg_value(i32 %201, !200, !DIExpression(), !316)
  %202 = add i32 %201, %200
    #dbg_value(i32 poison, !200, !DIExpression(), !316)
    #dbg_value(i32 %202, !201, !DIExpression(), !316)
  %203 = add i32 %202, %3, !dbg !297
    #dbg_value(i32 %203, !202, !DIExpression(), !316)
    #dbg_value(i32 %191, !203, !DIExpression(), !316)
    #dbg_value(i32 %193, !204, !DIExpression(), !316)
    #dbg_value(i32 %3, !205, !DIExpression(), !316)
    #dbg_value(i32 %4, !206, !DIExpression(), !316)
    #dbg_value(i32 %191, !207, !DIExpression(), !316)
    #dbg_value(i32 %193, !208, !DIExpression(), !316)
    #dbg_value(i32 %3, !209, !DIExpression(), !316)
    #dbg_value(i32 %4, !210, !DIExpression(), !316)
    #dbg_value(i32 %191, !211, !DIExpression(), !316)
  %204 = icmp ult i32 %191, %3, !dbg !298
  %205 = add i32 %193, %4, !dbg !299
  %206 = mul i32 %193, 3, !dbg !299
  %207 = select i1 %204, i32 %205, i32 %206, !dbg !299
    #dbg_value(i32 %207, !212, !DIExpression(), !316)
    #dbg_value(i32 %207, !218, !DIExpression(), !316)
    #dbg_value(i32 %3, !219, !DIExpression(), !316)
    #dbg_value(i32 %4, !220, !DIExpression(), !316)
    #dbg_value(i32 %203, !221, !DIExpression(), !316)
    #dbg_value(i32 %207, !222, !DIExpression(), !316)
    #dbg_value(i32 %3, !223, !DIExpression(), !316)
    #dbg_value(i32 %4, !224, !DIExpression(), !316)
    #dbg_value(i32 %203, !225, !DIExpression(), !316)
  %208 = icmp ult i32 %203, %207, !dbg !300
  br i1 %208, label %209, label %215, !dbg !301

209:                                              ; preds = %199
    #dbg_value(i32 %203, !227, !DIExpression(), !317)
    #dbg_value(i32 %4, !230, !DIExpression(), !317)
  %210 = udiv i32 %203, %4, !dbg !305
    #dbg_value(i32 %210, !231, !DIExpression(), !317)
  br label %211

211:                                              ; preds = %194, %209
  %212 = phi i32 [ %207, %209 ], [ %197, %194 ]
  %213 = phi i32 [ %210, %209 ], [ 0, %194 ], !dbg !318
    #dbg_value(i32 %213, !231, !DIExpression(), !317)
    #dbg_value(i32 %213, !232, !DIExpression(), !317)
  %214 = add i32 %213, %212, !dbg !309
    #dbg_value(i32 %214, !226, !DIExpression(), !316)
  br label %221, !dbg !319

215:                                              ; preds = %199
    #dbg_value(i32 %207, !233, !DIExpression(), !320)
    #dbg_value(i32 %4, !235, !DIExpression(), !320)
  %216 = urem i32 %207, %4, !dbg !302
    #dbg_value(i32 %216, !236, !DIExpression(), !320)
  br label %217

217:                                              ; preds = %194, %215
  %218 = phi i32 [ %203, %215 ], [ %3, %194 ]
  %219 = phi i32 [ %216, %215 ], [ 0, %194 ], !dbg !321
    #dbg_value(i32 %219, !236, !DIExpression(), !320)
    #dbg_value(i32 %219, !237, !DIExpression(), !320)
  %220 = add i32 %219, %218, !dbg !308
    #dbg_value(i32 %220, !226, !DIExpression(), !316)
  br label %221

221:                                              ; preds = %217, %211
  %222 = phi i32 [ %214, %211 ], [ %220, %217 ], !dbg !310
    #dbg_value(i32 %222, !226, !DIExpression(), !316)
  %223 = getelementptr inbounds nuw i32, ptr %37, i32 %191, !dbg !311
  store i32 %222, ptr %223, align 4, !dbg !312, !tbaa !290
  %224 = add nuw i32 %191, 1, !dbg !287
    #dbg_value(i32 %224, !182, !DIExpression(), !282)
  %225 = icmp eq i32 %224, %9, !dbg !283
  br i1 %225, label %189, label %190, !dbg !284, !llvm.loop !322
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_left_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !323 {
    #dbg_value(i32 %0, !327, !DIExpression(), !343)
    #dbg_value(i32 %1, !328, !DIExpression(), !343)
    #dbg_value(i32 %2, !329, !DIExpression(), !343)
    #dbg_value(i32 %3, !330, !DIExpression(), !343)
    #dbg_value(i32 %0, !331, !DIExpression(), !343)
    #dbg_value(i32 %1, !332, !DIExpression(), !343)
    #dbg_value(i32 %2, !333, !DIExpression(), !343)
    #dbg_value(i32 %3, !334, !DIExpression(), !343)
    #dbg_value(i32 %1, !335, !DIExpression(), !343)
    #dbg_value(i32 %3, !336, !DIExpression(), !343)
  %5 = icmp eq i32 %3, 0, !dbg !344
  br i1 %5, label %10, label %6, !dbg !344

6:                                                ; preds = %4
  %7 = udiv i32 %1, %3, !dbg !346
    #dbg_value(i32 %7, !337, !DIExpression(), !343)
    #dbg_value(i32 %7, !338, !DIExpression(), !343)
    #dbg_value(i32 %0, !339, !DIExpression(), !343)
    #dbg_value(i32 %3, !340, !DIExpression(), !343)
  %8 = urem i32 %0, %3, !dbg !348
    #dbg_value(i32 %8, !341, !DIExpression(), !343)
  %9 = add i32 %8, %7
  br label %10

10:                                               ; preds = %4, %6
  %11 = phi i32 [ %9, %6 ], [ 0, %4 ], !dbg !351
    #dbg_value(i32 poison, !341, !DIExpression(), !343)
    #dbg_value(i32 %11, !342, !DIExpression(), !343)
  %12 = add i32 %11, %2, !dbg !352
  ret i32 %12, !dbg !353
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_left_signal(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !354 {
    #dbg_value(i32 %0, !356, !DIExpression(), !368)
    #dbg_value(i32 %1, !357, !DIExpression(), !368)
    #dbg_value(i32 %2, !358, !DIExpression(), !368)
    #dbg_value(i32 %3, !359, !DIExpression(), !368)
    #dbg_value(i32 %1, !360, !DIExpression(), !368)
    #dbg_value(i32 %3, !361, !DIExpression(), !368)
  %5 = icmp eq i32 %3, 0, !dbg !369
  br i1 %5, label %10, label %6, !dbg !369

6:                                                ; preds = %4
  %7 = udiv i32 %1, %3, !dbg !371
    #dbg_value(i32 %7, !362, !DIExpression(), !368)
    #dbg_value(i32 %7, !363, !DIExpression(), !368)
    #dbg_value(i32 %0, !364, !DIExpression(), !368)
    #dbg_value(i32 %3, !365, !DIExpression(), !368)
  %8 = urem i32 %0, %3, !dbg !373
    #dbg_value(i32 %8, !366, !DIExpression(), !368)
  %9 = add i32 %8, %7
  br label %10

10:                                               ; preds = %4, %6
  %11 = phi i32 [ %9, %6 ], [ 0, %4 ], !dbg !376
    #dbg_value(i32 poison, !366, !DIExpression(), !368)
    #dbg_value(i32 %11, !367, !DIExpression(), !368)
  %12 = add i32 %11, %2, !dbg !377
  ret i32 %12, !dbg !378
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_right_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !379 {
    #dbg_value(i32 %0, !381, !DIExpression(), !396)
    #dbg_value(i32 %1, !382, !DIExpression(), !396)
    #dbg_value(i32 %2, !383, !DIExpression(), !396)
    #dbg_value(i32 %3, !384, !DIExpression(), !396)
    #dbg_value(i32 %0, !385, !DIExpression(), !396)
    #dbg_value(i32 %1, !386, !DIExpression(), !396)
    #dbg_value(i32 %2, !387, !DIExpression(), !396)
    #dbg_value(i32 %3, !388, !DIExpression(), !396)
    #dbg_value(i32 %0, !389, !DIExpression(), !396)
  %5 = icmp ult i32 %0, %2, !dbg !397
  %6 = add i32 %3, %1, !dbg !398
  %7 = mul i32 %1, 3, !dbg !398
  %8 = select i1 %5, i32 %6, i32 %7, !dbg !398
    #dbg_value(i32 %8, !390, !DIExpression(), !396)
  ret i32 %8, !dbg !399
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_right_signal(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !400 {
    #dbg_value(i32 %0, !402, !DIExpression(), !413)
    #dbg_value(i32 %1, !403, !DIExpression(), !413)
    #dbg_value(i32 %2, !404, !DIExpression(), !413)
    #dbg_value(i32 %3, !405, !DIExpression(), !413)
    #dbg_value(i32 %0, !406, !DIExpression(), !413)
  %5 = icmp ult i32 %0, %2, !dbg !414
  %6 = add i32 %3, %1, !dbg !415
  %7 = mul i32 %1, 3, !dbg !415
  %8 = select i1 %5, i32 %6, i32 %7, !dbg !415
    #dbg_value(i32 %8, !407, !DIExpression(), !413)
  ret i32 %8, !dbg !416
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_pair_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !417 {
    #dbg_value(i32 %0, !419, !DIExpression(), !440)
    #dbg_value(i32 %1, !420, !DIExpression(), !440)
    #dbg_value(i32 %2, !421, !DIExpression(), !440)
    #dbg_value(i32 %3, !422, !DIExpression(), !440)
    #dbg_value(i32 %0, !423, !DIExpression(), !440)
    #dbg_value(i32 %1, !424, !DIExpression(), !440)
    #dbg_value(i32 %2, !425, !DIExpression(), !440)
    #dbg_value(i32 %3, !426, !DIExpression(), !440)
    #dbg_value(i32 %0, !427, !DIExpression(), !440)
  %5 = icmp ult i32 %0, %1, !dbg !441
  %6 = icmp eq i32 %3, 0, !dbg !442
  br i1 %5, label %7, label %13, !dbg !443

7:                                                ; preds = %4
    #dbg_value(i32 %0, !429, !DIExpression(), !444)
    #dbg_value(i32 %3, !432, !DIExpression(), !444)
  br i1 %6, label %10, label %8, !dbg !445

8:                                                ; preds = %7
  %9 = udiv i32 %0, %3, !dbg !447
    #dbg_value(i32 %9, !433, !DIExpression(), !444)
  br label %10

10:                                               ; preds = %7, %8
  %11 = phi i32 [ %9, %8 ], [ 0, %7 ], !dbg !449
    #dbg_value(i32 %11, !433, !DIExpression(), !444)
    #dbg_value(i32 %11, !434, !DIExpression(), !444)
  %12 = add i32 %11, %1, !dbg !450
    #dbg_value(i32 %12, !428, !DIExpression(), !440)
  br label %19, !dbg !451

13:                                               ; preds = %4
    #dbg_value(i32 %1, !435, !DIExpression(), !452)
    #dbg_value(i32 %3, !437, !DIExpression(), !452)
  br i1 %6, label %16, label %14, !dbg !453

14:                                               ; preds = %13
  %15 = urem i32 %1, %3, !dbg !455
    #dbg_value(i32 %15, !438, !DIExpression(), !452)
  br label %16

16:                                               ; preds = %13, %14
  %17 = phi i32 [ %15, %14 ], [ 0, %13 ], !dbg !457
    #dbg_value(i32 %17, !438, !DIExpression(), !452)
    #dbg_value(i32 %17, !439, !DIExpression(), !452)
  %18 = add i32 %17, %0, !dbg !458
    #dbg_value(i32 %18, !428, !DIExpression(), !440)
  br label %19

19:                                               ; preds = %16, %10
  %20 = phi i32 [ %12, %10 ], [ %18, %16 ], !dbg !442
    #dbg_value(i32 %20, !428, !DIExpression(), !440)
  ret i32 %20, !dbg !459
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_pair_signal(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !460 {
    #dbg_value(i32 %0, !462, !DIExpression(), !479)
    #dbg_value(i32 %1, !463, !DIExpression(), !479)
    #dbg_value(i32 %2, !464, !DIExpression(), !479)
    #dbg_value(i32 %3, !465, !DIExpression(), !479)
    #dbg_value(i32 %0, !466, !DIExpression(), !479)
  %5 = icmp ult i32 %0, %1, !dbg !480
  %6 = icmp eq i32 %3, 0, !dbg !481
  br i1 %5, label %7, label %13, !dbg !482

7:                                                ; preds = %4
    #dbg_value(i32 %0, !468, !DIExpression(), !483)
    #dbg_value(i32 %3, !471, !DIExpression(), !483)
  br i1 %6, label %10, label %8, !dbg !484

8:                                                ; preds = %7
  %9 = udiv i32 %0, %3, !dbg !486
    #dbg_value(i32 %9, !472, !DIExpression(), !483)
  br label %10

10:                                               ; preds = %7, %8
  %11 = phi i32 [ %9, %8 ], [ 0, %7 ], !dbg !488
    #dbg_value(i32 %11, !472, !DIExpression(), !483)
    #dbg_value(i32 %11, !473, !DIExpression(), !483)
  %12 = add i32 %11, %1, !dbg !489
    #dbg_value(i32 %12, !467, !DIExpression(), !479)
  br label %19, !dbg !490

13:                                               ; preds = %4
    #dbg_value(i32 %1, !474, !DIExpression(), !491)
    #dbg_value(i32 %3, !476, !DIExpression(), !491)
  br i1 %6, label %16, label %14, !dbg !492

14:                                               ; preds = %13
  %15 = urem i32 %1, %3, !dbg !494
    #dbg_value(i32 %15, !477, !DIExpression(), !491)
  br label %16

16:                                               ; preds = %13, %14
  %17 = phi i32 [ %15, %14 ], [ 0, %13 ], !dbg !496
    #dbg_value(i32 %17, !477, !DIExpression(), !491)
    #dbg_value(i32 %17, !478, !DIExpression(), !491)
  %18 = add i32 %17, %0, !dbg !497
    #dbg_value(i32 %18, !467, !DIExpression(), !479)
  br label %19

19:                                               ; preds = %16, %10
  %20 = phi i32 [ %12, %10 ], [ %18, %16 ], !dbg !481
    #dbg_value(i32 %20, !467, !DIExpression(), !479)
  ret i32 %20, !dbg !498
}

; Function Attrs: nofree norecurse nosync nounwind memory(read, argmem: readwrite, inaccessiblemem: none) uwtable
define hidden i32 @lang_fn_pipeline38_right_padded_zip_heldout_u32_into(ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readnone byval(%struct.ink_l_uint32) align 4 %1, i32 noundef %2, i32 noundef %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #8 !dbg !499 {
    #dbg_declare(ptr %0, !503, !DIExpression(), !566)
    #dbg_declare(ptr %1, !504, !DIExpression(), !567)
    #dbg_value(i32 %2, !505, !DIExpression(), !568)
    #dbg_value(i32 %3, !506, !DIExpression(), !568)
    #dbg_value(ptr %4, !507, !DIExpression(), !568)
  %6 = load ptr, ptr %0, align 4, !dbg !569, !tbaa !242
  %7 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !569
  %8 = load i32, ptr %7, align 4, !dbg !569, !tbaa !27
    #dbg_value(ptr %6, !508, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !568)
    #dbg_value(i32 %8, !508, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !568)
    #dbg_value(ptr %4, !509, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !568)
    #dbg_value(i32 %8, !509, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !568)
    #dbg_value(i32 0, !510, !DIExpression(), !570)
  %9 = icmp eq i32 %8, 0, !dbg !571
  br i1 %9, label %161, label %10, !dbg !572

10:                                               ; preds = %5
  %11 = ptrtoint ptr %6 to i32, !dbg !569
  %12 = ptrtoint ptr %4 to i32, !dbg !569
  %13 = icmp eq i32 %3, 0
  %14 = icmp ult i32 %8, 4, !dbg !572
  %15 = sub i32 %12, %11, !dbg !572
  %16 = icmp ult i32 %15, 16, !dbg !572
  %17 = select i1 %14, i1 true, i1 %16, !dbg !572
  br i1 %17, label %159, label %18, !dbg !572

18:                                               ; preds = %10
  %19 = and i32 %8, -4, !dbg !572
  %20 = insertelement <4 x i1> poison, i1 %13, i64 0, !dbg !572
  %21 = shufflevector <4 x i1> %20, <4 x i1> poison, <4 x i32> zeroinitializer, !dbg !572
  %22 = xor <4 x i1> %21, splat (i1 true), !dbg !573
  %23 = insertelement <4 x i32> poison, i32 %2, i64 0, !dbg !572
  %24 = shufflevector <4 x i32> %23, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !572
  %25 = insertelement <4 x i32> poison, i32 %3, i64 0, !dbg !572
  %26 = shufflevector <4 x i32> %25, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !572
  %27 = extractelement <4 x i1> %22, i64 0
  %28 = extractelement <4 x i1> %22, i64 1
  %29 = extractelement <4 x i1> %22, i64 2
  %30 = extractelement <4 x i1> %22, i64 3
  br label %31, !dbg !572

31:                                               ; preds = %139, %18
  %32 = phi i32 [ 0, %18 ], [ %154, %139 ], !dbg !575
  %33 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %18 ], [ %155, %139 ]
  %34 = getelementptr inbounds nuw i32, ptr %6, i32 %32, !dbg !576
  %35 = load <4 x i32>, ptr %34, align 4, !dbg !577, !tbaa !290
  br i1 %27, label %36, label %42, !dbg !573

36:                                               ; preds = %31
  %37 = extractelement <4 x i32> %35, i64 0, !dbg !578
  %38 = udiv i32 %37, %3, !dbg !578
  %39 = insertelement <4 x i32> poison, i32 %38, i64 0, !dbg !578
  %40 = urem i32 %32, %3, !dbg !580
  %41 = insertelement <4 x i32> poison, i32 %40, i64 0, !dbg !580
  br label %42, !dbg !577

42:                                               ; preds = %36, %31
  %43 = phi <4 x i32> [ poison, %31 ], [ %39, %36 ], !dbg !578
  %44 = phi <4 x i32> [ poison, %31 ], [ %41, %36 ], !dbg !580
  br i1 %28, label %45, label %52, !dbg !580

45:                                               ; preds = %42
  %46 = or disjoint i32 %32, 1, !dbg !573
  %47 = extractelement <4 x i32> %35, i64 1, !dbg !578
  %48 = udiv i32 %47, %3, !dbg !578
  %49 = insertelement <4 x i32> %43, i32 %48, i64 1, !dbg !578
  %50 = urem i32 %46, %3, !dbg !580
  %51 = insertelement <4 x i32> %44, i32 %50, i64 1, !dbg !580
  br label %52, !dbg !580

52:                                               ; preds = %45, %42
  %53 = phi <4 x i32> [ %43, %42 ], [ %49, %45 ], !dbg !578
  %54 = phi <4 x i32> [ %44, %42 ], [ %51, %45 ], !dbg !580
  br i1 %29, label %55, label %62, !dbg !580

55:                                               ; preds = %52
  %56 = or disjoint i32 %32, 2, !dbg !573
  %57 = extractelement <4 x i32> %35, i64 2, !dbg !578
  %58 = udiv i32 %57, %3, !dbg !578
  %59 = insertelement <4 x i32> %53, i32 %58, i64 2, !dbg !578
  %60 = urem i32 %56, %3, !dbg !580
  %61 = insertelement <4 x i32> %54, i32 %60, i64 2, !dbg !580
  br label %62, !dbg !580

62:                                               ; preds = %55, %52
  %63 = phi <4 x i32> [ %53, %52 ], [ %59, %55 ], !dbg !578
  %64 = phi <4 x i32> [ %54, %52 ], [ %61, %55 ], !dbg !580
  br i1 %30, label %65, label %72, !dbg !580

65:                                               ; preds = %62
  %66 = or disjoint i32 %32, 3, !dbg !573
  %67 = extractelement <4 x i32> %35, i64 3, !dbg !578
  %68 = udiv i32 %67, %3, !dbg !578
  %69 = insertelement <4 x i32> %63, i32 %68, i64 3, !dbg !578
  %70 = urem i32 %66, %3, !dbg !580
  %71 = insertelement <4 x i32> %64, i32 %70, i64 3, !dbg !580
  br label %72, !dbg !580

72:                                               ; preds = %65, %62
  %73 = phi <4 x i32> [ %63, %62 ], [ %69, %65 ], !dbg !578
  %74 = phi <4 x i32> [ %64, %62 ], [ %71, %65 ], !dbg !580
  %75 = add <4 x i32> %74, %73
  %76 = add <4 x i32> %75, %24, !dbg !583
  %77 = icmp ult <4 x i32> %33, %24, !dbg !584
  %78 = add <4 x i32> %35, %26, !dbg !585
  %79 = mul <4 x i32> %35, splat (i32 3), !dbg !585
  %80 = select <4 x i1> %77, <4 x i32> %78, <4 x i32> %79, !dbg !585
  %81 = icmp ult <4 x i32> %76, %80, !dbg !586
  %82 = select <4 x i1> %21, <4 x i1> splat (i1 true), <4 x i1> %81, !dbg !587
  %83 = xor <4 x i1> %82, splat (i1 true), !dbg !587
  %84 = extractelement <4 x i1> %83, i64 0, !dbg !587
  br i1 %84, label %85, label %89, !dbg !580

85:                                               ; preds = %72
  %86 = extractelement <4 x i32> %80, i64 0, !dbg !588
  %87 = urem i32 %86, %3, !dbg !588
  %88 = insertelement <4 x i32> poison, i32 %87, i64 0, !dbg !588
  br label %89, !dbg !587

89:                                               ; preds = %85, %72
  %90 = phi <4 x i32> [ poison, %72 ], [ %88, %85 ], !dbg !588
  %91 = extractelement <4 x i1> %83, i64 1, !dbg !588
  br i1 %91, label %92, label %96, !dbg !588

92:                                               ; preds = %89
  %93 = extractelement <4 x i32> %80, i64 1, !dbg !588
  %94 = urem i32 %93, %3, !dbg !588
  %95 = insertelement <4 x i32> %90, i32 %94, i64 1, !dbg !588
  br label %96, !dbg !588

96:                                               ; preds = %92, %89
  %97 = phi <4 x i32> [ %90, %89 ], [ %95, %92 ], !dbg !588
  %98 = extractelement <4 x i1> %83, i64 2, !dbg !588
  br i1 %98, label %99, label %103, !dbg !588

99:                                               ; preds = %96
  %100 = extractelement <4 x i32> %80, i64 2, !dbg !588
  %101 = urem i32 %100, %3, !dbg !588
  %102 = insertelement <4 x i32> %97, i32 %101, i64 2, !dbg !588
  br label %103, !dbg !588

103:                                              ; preds = %99, %96
  %104 = phi <4 x i32> [ %97, %96 ], [ %102, %99 ], !dbg !588
  %105 = extractelement <4 x i1> %83, i64 3, !dbg !588
  br i1 %105, label %106, label %110, !dbg !588

106:                                              ; preds = %103
  %107 = extractelement <4 x i32> %80, i64 3, !dbg !588
  %108 = urem i32 %107, %3, !dbg !588
  %109 = insertelement <4 x i32> %104, i32 %108, i64 3, !dbg !588
  br label %110, !dbg !588

110:                                              ; preds = %106, %103
  %111 = phi <4 x i32> [ %104, %103 ], [ %109, %106 ], !dbg !588
  %112 = select <4 x i1> %22, <4 x i1> %81, <4 x i1> zeroinitializer, !dbg !587
  %113 = extractelement <4 x i1> %112, i64 0, !dbg !587
  br i1 %113, label %114, label %118, !dbg !588

114:                                              ; preds = %110
  %115 = extractelement <4 x i32> %76, i64 0, !dbg !591
  %116 = udiv i32 %115, %3, !dbg !591
  %117 = insertelement <4 x i32> poison, i32 %116, i64 0, !dbg !591
  br label %118, !dbg !587

118:                                              ; preds = %114, %110
  %119 = phi <4 x i32> [ poison, %110 ], [ %117, %114 ], !dbg !591
  %120 = extractelement <4 x i1> %112, i64 1, !dbg !591
  br i1 %120, label %121, label %125, !dbg !591

121:                                              ; preds = %118
  %122 = extractelement <4 x i32> %76, i64 1, !dbg !591
  %123 = udiv i32 %122, %3, !dbg !591
  %124 = insertelement <4 x i32> %119, i32 %123, i64 1, !dbg !591
  br label %125, !dbg !591

125:                                              ; preds = %121, %118
  %126 = phi <4 x i32> [ %119, %118 ], [ %124, %121 ], !dbg !591
  %127 = extractelement <4 x i1> %112, i64 2, !dbg !591
  br i1 %127, label %128, label %132, !dbg !591

128:                                              ; preds = %125
  %129 = extractelement <4 x i32> %76, i64 2, !dbg !591
  %130 = udiv i32 %129, %3, !dbg !591
  %131 = insertelement <4 x i32> %126, i32 %130, i64 2, !dbg !591
  br label %132, !dbg !591

132:                                              ; preds = %128, %125
  %133 = phi <4 x i32> [ %126, %125 ], [ %131, %128 ], !dbg !591
  %134 = extractelement <4 x i1> %112, i64 3, !dbg !591
  br i1 %134, label %135, label %139, !dbg !591

135:                                              ; preds = %132
  %136 = extractelement <4 x i32> %76, i64 3, !dbg !591
  %137 = udiv i32 %136, %3, !dbg !591
  %138 = insertelement <4 x i32> %133, i32 %137, i64 3, !dbg !591
  br label %139, !dbg !591

139:                                              ; preds = %135, %132
  %140 = phi <4 x i32> [ %133, %132 ], [ %138, %135 ], !dbg !591
  %141 = icmp ult <4 x i32> %33, %24, !dbg !584
  %142 = mul <4 x i32> %35, splat (i32 3), !dbg !585
  %143 = select <4 x i1> %141, <4 x i32> %35, <4 x i32> %142, !dbg !585
  %144 = icmp ult <4 x i32> %24, %143, !dbg !586
  %145 = xor <4 x i1> %144, splat (i1 true), !dbg !587
  %146 = select <4 x i1> %21, <4 x i1> %145, <4 x i1> zeroinitializer, !dbg !587
  %147 = add <4 x i32> %111, %76, !dbg !594
  %148 = select <4 x i1> %21, <4 x i1> %144, <4 x i1> zeroinitializer, !dbg !587
  %149 = add <4 x i32> %140, %80, !dbg !595
  %150 = select <4 x i1> %148, <4 x i32> %143, <4 x i32> %149, !dbg !595
  %151 = select <4 x i1> %82, <4 x i32> %150, <4 x i32> %147, !dbg !596
  %152 = select <4 x i1> %146, <4 x i32> %24, <4 x i32> %151, !dbg !596
  %153 = getelementptr inbounds nuw i32, ptr %4, i32 %32, !dbg !597
  store <4 x i32> %152, ptr %153, align 4, !dbg !598, !tbaa !290
  %154 = add nuw i32 %32, 4, !dbg !575
  %155 = add <4 x i32> %33, splat (i32 4)
  %156 = icmp eq i32 %154, %19, !dbg !575
  br i1 %156, label %157, label %31, !dbg !575, !llvm.loop !599

157:                                              ; preds = %139
  %158 = icmp eq i32 %8, %19, !dbg !572
  br i1 %158, label %161, label %159, !dbg !572

159:                                              ; preds = %10, %157
  %160 = phi i32 [ 0, %10 ], [ %19, %157 ]
  br label %162, !dbg !572

161:                                              ; preds = %193, %157, %5
  ret i32 %8, !dbg !601

162:                                              ; preds = %159, %193
  %163 = phi i32 [ %196, %193 ], [ %160, %159 ]
    #dbg_value(i32 %163, !510, !DIExpression(), !570)
    #dbg_value(i32 %163, !512, !DIExpression(), !602)
  %164 = getelementptr inbounds nuw i32, ptr %6, i32 %163, !dbg !576
    #dbg_value(i32 poison, !515, !DIExpression(), !602)
    #dbg_value(i32 %2, !516, !DIExpression(), !602)
    #dbg_value(i32 %3, !517, !DIExpression(), !602)
    #dbg_value(i32 %163, !518, !DIExpression(), !602)
    #dbg_value(i32 poison, !519, !DIExpression(), !602)
    #dbg_value(i32 %2, !520, !DIExpression(), !602)
    #dbg_value(i32 %3, !521, !DIExpression(), !602)
    #dbg_value(i32 poison, !522, !DIExpression(), !602)
    #dbg_value(i32 %3, !523, !DIExpression(), !602)
  %165 = load i32, ptr %164, align 4, !dbg !577, !tbaa !290
  br i1 %13, label %166, label %171, !dbg !573

166:                                              ; preds = %162
    #dbg_value(i32 poison, !528, !DIExpression(), !602)
    #dbg_value(i32 0, !529, !DIExpression(), !602)
    #dbg_value(i32 %2, !530, !DIExpression(), !602)
    #dbg_value(i32 %163, !531, !DIExpression(), !602)
    #dbg_value(i32 %165, !532, !DIExpression(), !602)
    #dbg_value(i32 %2, !533, !DIExpression(), !602)
    #dbg_value(i32 %3, !534, !DIExpression(), !602)
    #dbg_value(i32 %163, !535, !DIExpression(), !602)
    #dbg_value(i32 %165, !536, !DIExpression(), !602)
    #dbg_value(i32 %2, !537, !DIExpression(), !602)
    #dbg_value(i32 %3, !538, !DIExpression(), !602)
    #dbg_value(i32 %163, !539, !DIExpression(), !602)
  %167 = icmp ult i32 %163, %2, !dbg !584
  %168 = mul i32 %165, 3, !dbg !585
  %169 = select i1 %167, i32 %165, i32 %168, !dbg !585
    #dbg_value(i32 %169, !540, !DIExpression(), !602)
    #dbg_value(i32 %169, !546, !DIExpression(), !602)
    #dbg_value(i32 %2, !547, !DIExpression(), !602)
    #dbg_value(i32 %3, !548, !DIExpression(), !602)
    #dbg_value(i32 %2, !549, !DIExpression(), !602)
    #dbg_value(i32 %169, !550, !DIExpression(), !602)
    #dbg_value(i32 %2, !551, !DIExpression(), !602)
    #dbg_value(i32 %3, !552, !DIExpression(), !602)
    #dbg_value(i32 %2, !553, !DIExpression(), !602)
  %170 = icmp ult i32 %2, %169, !dbg !586
  br i1 %170, label %183, label %189, !dbg !587

171:                                              ; preds = %162
    #dbg_value(i32 %165, !515, !DIExpression(), !602)
    #dbg_value(i32 %165, !519, !DIExpression(), !602)
    #dbg_value(i32 %165, !522, !DIExpression(), !602)
  %172 = udiv i32 %165, %3, !dbg !578
    #dbg_value(i32 %172, !524, !DIExpression(), !602)
    #dbg_value(i32 %172, !525, !DIExpression(), !602)
    #dbg_value(i32 %163, !526, !DIExpression(), !602)
    #dbg_value(i32 %3, !527, !DIExpression(), !602)
  %173 = urem i32 %163, %3, !dbg !580
    #dbg_value(i32 %173, !528, !DIExpression(), !602)
  %174 = add i32 %173, %172
    #dbg_value(i32 poison, !528, !DIExpression(), !602)
    #dbg_value(i32 %174, !529, !DIExpression(), !602)
  %175 = add i32 %174, %2, !dbg !583
    #dbg_value(i32 %175, !530, !DIExpression(), !602)
    #dbg_value(i32 %163, !531, !DIExpression(), !602)
    #dbg_value(i32 %165, !532, !DIExpression(), !602)
    #dbg_value(i32 %2, !533, !DIExpression(), !602)
    #dbg_value(i32 %3, !534, !DIExpression(), !602)
    #dbg_value(i32 %163, !535, !DIExpression(), !602)
    #dbg_value(i32 %165, !536, !DIExpression(), !602)
    #dbg_value(i32 %2, !537, !DIExpression(), !602)
    #dbg_value(i32 %3, !538, !DIExpression(), !602)
    #dbg_value(i32 %163, !539, !DIExpression(), !602)
  %176 = icmp ult i32 %163, %2, !dbg !584
  %177 = add i32 %165, %3, !dbg !585
  %178 = mul i32 %165, 3, !dbg !585
  %179 = select i1 %176, i32 %177, i32 %178, !dbg !585
    #dbg_value(i32 %179, !540, !DIExpression(), !602)
    #dbg_value(i32 %179, !546, !DIExpression(), !602)
    #dbg_value(i32 %2, !547, !DIExpression(), !602)
    #dbg_value(i32 %3, !548, !DIExpression(), !602)
    #dbg_value(i32 %175, !549, !DIExpression(), !602)
    #dbg_value(i32 %179, !550, !DIExpression(), !602)
    #dbg_value(i32 %2, !551, !DIExpression(), !602)
    #dbg_value(i32 %3, !552, !DIExpression(), !602)
    #dbg_value(i32 %175, !553, !DIExpression(), !602)
  %180 = icmp ult i32 %175, %179, !dbg !586
  br i1 %180, label %181, label %187, !dbg !587

181:                                              ; preds = %171
    #dbg_value(i32 %175, !555, !DIExpression(), !603)
    #dbg_value(i32 %3, !558, !DIExpression(), !603)
  %182 = udiv i32 %175, %3, !dbg !591
    #dbg_value(i32 %182, !559, !DIExpression(), !603)
  br label %183

183:                                              ; preds = %166, %181
  %184 = phi i32 [ %179, %181 ], [ %169, %166 ]
  %185 = phi i32 [ %182, %181 ], [ 0, %166 ], !dbg !604
    #dbg_value(i32 %185, !559, !DIExpression(), !603)
    #dbg_value(i32 %185, !560, !DIExpression(), !603)
  %186 = add i32 %185, %184, !dbg !595
    #dbg_value(i32 %186, !554, !DIExpression(), !602)
  br label %193, !dbg !605

187:                                              ; preds = %171
    #dbg_value(i32 %179, !561, !DIExpression(), !606)
    #dbg_value(i32 %3, !563, !DIExpression(), !606)
  %188 = urem i32 %179, %3, !dbg !588
    #dbg_value(i32 %188, !564, !DIExpression(), !606)
  br label %189

189:                                              ; preds = %166, %187
  %190 = phi i32 [ %175, %187 ], [ %2, %166 ]
  %191 = phi i32 [ %188, %187 ], [ 0, %166 ], !dbg !607
    #dbg_value(i32 %191, !564, !DIExpression(), !606)
    #dbg_value(i32 %191, !565, !DIExpression(), !606)
  %192 = add i32 %191, %190, !dbg !594
    #dbg_value(i32 %192, !554, !DIExpression(), !602)
  br label %193

193:                                              ; preds = %189, %183
  %194 = phi i32 [ %186, %183 ], [ %192, %189 ], !dbg !596
    #dbg_value(i32 %194, !554, !DIExpression(), !602)
  %195 = getelementptr inbounds nuw i32, ptr %4, i32 %163, !dbg !597
  store i32 %194, ptr %195, align 4, !dbg !598, !tbaa !290
  %196 = add nuw i32 %163, 1, !dbg !575
    #dbg_value(i32 %196, !510, !DIExpression(), !570)
  %197 = icmp eq i32 %196, %8, !dbg !571
  br i1 %197, label %161, label %162, !dbg !572, !llvm.loop !608
}

; Function Attrs: nounwind memory(read, argmem: readwrite, inaccessiblemem: write) uwtable
define hidden i32 @ink_compute_into(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readonly %2, ptr nocapture noundef writeonly %3) local_unnamed_addr #9 !dbg !609 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !627)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !627)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !627)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !627)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !627)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !627)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !627)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !627)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !629)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !629)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !629)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !629)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !629)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !629)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !629)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !629)
    #dbg_value(i32 %0, !617, !DIExpression(), !631)
    #dbg_value(ptr %1, !618, !DIExpression(), !631)
    #dbg_value(ptr %2, !619, !DIExpression(), !631)
    #dbg_value(ptr %3, !620, !DIExpression(), !631)
  %5 = ptrtoint ptr %3 to i32, !dbg !632
  %6 = icmp eq i32 %0, 0, !dbg !632
  br i1 %6, label %7, label %236, !dbg !632

7:                                                ; preds = %4
  %8 = load ptr, ptr %1, align 4, !dbg !633, !tbaa !634
    #dbg_value(ptr %8, !621, !DIExpression(), !635)
    #dbg_value(ptr poison, !624, !DIExpression(), !635)
  %9 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !636
  %10 = load ptr, ptr %9, align 4, !dbg !636, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !627)
    #dbg_value(ptr %10, !115, !DIExpression(), !627)
    #dbg_value(i32 4, !116, !DIExpression(), !627)
    #dbg_value(ptr undef, !117, !DIExpression(), !627)
    #dbg_value(ptr %10, !119, !DIExpression(), !627)
    #dbg_value(i32 0, !122, !DIExpression(), !637)
  %11 = load i8, ptr %10, align 1, !dbg !638, !tbaa !132
    #dbg_value(i8 %11, !625, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !635)
    #dbg_value(i32 1, !122, !DIExpression(), !637)
  %12 = getelementptr inbounds nuw i8, ptr %10, i32 1, !dbg !638
  %13 = load i8, ptr %12, align 1, !dbg !638, !tbaa !132
    #dbg_value(i8 %13, !625, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !635)
    #dbg_value(i32 2, !122, !DIExpression(), !637)
  %14 = getelementptr inbounds nuw i8, ptr %10, i32 2, !dbg !638
  %15 = load i8, ptr %14, align 1, !dbg !638, !tbaa !132
    #dbg_value(i8 %15, !625, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !635)
    #dbg_value(i32 3, !122, !DIExpression(), !637)
  %16 = getelementptr inbounds nuw i8, ptr %10, i32 3, !dbg !638
  %17 = load i8, ptr %16, align 1, !dbg !638, !tbaa !132
    #dbg_value(i8 %17, !625, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !635)
    #dbg_value(i32 4, !122, !DIExpression(), !637)
  %18 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !639
  %19 = load ptr, ptr %18, align 4, !dbg !639, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !629)
    #dbg_value(ptr %19, !115, !DIExpression(), !629)
    #dbg_value(i32 4, !116, !DIExpression(), !629)
    #dbg_value(ptr undef, !117, !DIExpression(), !629)
    #dbg_value(ptr %19, !119, !DIExpression(), !629)
    #dbg_value(i32 0, !122, !DIExpression(), !640)
  %20 = load i8, ptr %19, align 1, !dbg !641, !tbaa !132
    #dbg_value(i8 %20, !626, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !635)
    #dbg_value(i32 1, !122, !DIExpression(), !640)
  %21 = getelementptr inbounds nuw i8, ptr %19, i32 1, !dbg !641
  %22 = load i8, ptr %21, align 1, !dbg !641, !tbaa !132
    #dbg_value(i8 %22, !626, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !635)
    #dbg_value(i32 2, !122, !DIExpression(), !640)
  %23 = getelementptr inbounds nuw i8, ptr %19, i32 2, !dbg !641
  %24 = load i8, ptr %23, align 1, !dbg !641, !tbaa !132
    #dbg_value(i8 %24, !626, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !635)
    #dbg_value(i32 3, !122, !DIExpression(), !640)
  %25 = getelementptr inbounds nuw i8, ptr %19, i32 3, !dbg !641
  %26 = load i8, ptr %25, align 1, !dbg !641, !tbaa !132
    #dbg_value(i8 %26, !626, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !635)
    #dbg_value(i32 4, !122, !DIExpression(), !640)
  %27 = load i32, ptr %2, align 4, !dbg !642, !tbaa !27
  %28 = zext i8 %17 to i32, !dbg !643
  %29 = shl nuw i32 %28, 24, !dbg !643
  %30 = zext i8 %15 to i32, !dbg !643
  %31 = shl nuw nsw i32 %30, 16, !dbg !643
  %32 = or disjoint i32 %29, %31, !dbg !643
  %33 = zext i8 %13 to i32, !dbg !643
  %34 = shl nuw nsw i32 %33, 8, !dbg !643
  %35 = or disjoint i32 %32, %34, !dbg !643
  %36 = zext i8 %11 to i32, !dbg !643
  %37 = or disjoint i32 %35, %36, !dbg !643
  %38 = zext i8 %26 to i32, !dbg !644
  %39 = shl nuw i32 %38, 24, !dbg !644
  %40 = zext i8 %24 to i32, !dbg !644
  %41 = shl nuw nsw i32 %40, 16, !dbg !644
  %42 = or disjoint i32 %39, %41, !dbg !644
  %43 = zext i8 %22 to i32, !dbg !644
  %44 = shl nuw nsw i32 %43, 8, !dbg !644
  %45 = or disjoint i32 %42, %44, !dbg !644
  %46 = zext i8 %20 to i32, !dbg !644
  %47 = or disjoint i32 %45, %46, !dbg !644
    #dbg_value(ptr poison, !504, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !646)
    #dbg_value(i32 poison, !504, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !646)
    #dbg_value(ptr %8, !503, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !646)
    #dbg_value(i32 %27, !503, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !646)
    #dbg_value(i32 %37, !505, !DIExpression(), !646)
    #dbg_value(i32 %47, !506, !DIExpression(), !646)
    #dbg_value(ptr %3, !507, !DIExpression(), !646)
    #dbg_value(ptr %8, !508, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !646)
    #dbg_value(i32 %27, !508, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !646)
    #dbg_value(ptr %3, !509, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !646)
    #dbg_value(i32 %27, !509, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !646)
    #dbg_value(i32 0, !510, !DIExpression(), !647)
  %48 = icmp eq i32 %27, 0, !dbg !644
  br i1 %48, label %235, label %49, !dbg !648

49:                                               ; preds = %7
  %50 = ptrtoint ptr %8 to i32, !dbg !636
  %51 = icmp eq i32 %47, 0
  %52 = icmp ult i32 %27, 4, !dbg !648
  %53 = sub i32 %5, %50, !dbg !648
  %54 = icmp ult i32 %53, 16, !dbg !648
  %55 = select i1 %52, i1 true, i1 %54, !dbg !648
  br i1 %55, label %197, label %56, !dbg !648

56:                                               ; preds = %49
  %57 = and i32 %27, -4, !dbg !648
  %58 = insertelement <4 x i1> poison, i1 %51, i64 0, !dbg !648
  %59 = shufflevector <4 x i1> %58, <4 x i1> poison, <4 x i32> zeroinitializer, !dbg !648
  %60 = xor <4 x i1> %59, splat (i1 true), !dbg !649
  %61 = insertelement <4 x i32> poison, i32 %37, i64 0, !dbg !648
  %62 = shufflevector <4 x i32> %61, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !648
  %63 = insertelement <4 x i32> poison, i32 %47, i64 0, !dbg !648
  %64 = shufflevector <4 x i32> %63, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !648
  %65 = extractelement <4 x i1> %60, i64 0
  %66 = extractelement <4 x i1> %60, i64 1
  %67 = extractelement <4 x i1> %60, i64 2
  %68 = extractelement <4 x i1> %60, i64 3
  br label %69, !dbg !648

69:                                               ; preds = %177, %56
  %70 = phi i32 [ 0, %56 ], [ %192, %177 ], !dbg !650
  %71 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %56 ], [ %193, %177 ]
  %72 = getelementptr inbounds nuw i32, ptr %8, i32 %70, !dbg !651
  %73 = load <4 x i32>, ptr %72, align 4, !dbg !652, !tbaa !290
  br i1 %65, label %74, label %80, !dbg !649

74:                                               ; preds = %69
  %75 = extractelement <4 x i32> %73, i64 0, !dbg !653
  %76 = udiv i32 %75, %47, !dbg !653
  %77 = insertelement <4 x i32> poison, i32 %76, i64 0, !dbg !653
  %78 = urem i32 %70, %47, !dbg !654
  %79 = insertelement <4 x i32> poison, i32 %78, i64 0, !dbg !654
  br label %80, !dbg !652

80:                                               ; preds = %74, %69
  %81 = phi <4 x i32> [ poison, %69 ], [ %77, %74 ], !dbg !653
  %82 = phi <4 x i32> [ poison, %69 ], [ %79, %74 ], !dbg !654
  br i1 %66, label %83, label %90, !dbg !654

83:                                               ; preds = %80
  %84 = or disjoint i32 %70, 1, !dbg !649
  %85 = extractelement <4 x i32> %73, i64 1, !dbg !653
  %86 = udiv i32 %85, %47, !dbg !653
  %87 = insertelement <4 x i32> %81, i32 %86, i64 1, !dbg !653
  %88 = urem i32 %84, %47, !dbg !654
  %89 = insertelement <4 x i32> %82, i32 %88, i64 1, !dbg !654
  br label %90, !dbg !654

90:                                               ; preds = %83, %80
  %91 = phi <4 x i32> [ %81, %80 ], [ %87, %83 ], !dbg !653
  %92 = phi <4 x i32> [ %82, %80 ], [ %89, %83 ], !dbg !654
  br i1 %67, label %93, label %100, !dbg !654

93:                                               ; preds = %90
  %94 = or disjoint i32 %70, 2, !dbg !649
  %95 = extractelement <4 x i32> %73, i64 2, !dbg !653
  %96 = udiv i32 %95, %47, !dbg !653
  %97 = insertelement <4 x i32> %91, i32 %96, i64 2, !dbg !653
  %98 = urem i32 %94, %47, !dbg !654
  %99 = insertelement <4 x i32> %92, i32 %98, i64 2, !dbg !654
  br label %100, !dbg !654

100:                                              ; preds = %93, %90
  %101 = phi <4 x i32> [ %91, %90 ], [ %97, %93 ], !dbg !653
  %102 = phi <4 x i32> [ %92, %90 ], [ %99, %93 ], !dbg !654
  br i1 %68, label %103, label %110, !dbg !654

103:                                              ; preds = %100
  %104 = or disjoint i32 %70, 3, !dbg !649
  %105 = extractelement <4 x i32> %73, i64 3, !dbg !653
  %106 = udiv i32 %105, %47, !dbg !653
  %107 = insertelement <4 x i32> %101, i32 %106, i64 3, !dbg !653
  %108 = urem i32 %104, %47, !dbg !654
  %109 = insertelement <4 x i32> %102, i32 %108, i64 3, !dbg !654
  br label %110, !dbg !654

110:                                              ; preds = %103, %100
  %111 = phi <4 x i32> [ %101, %100 ], [ %107, %103 ], !dbg !653
  %112 = phi <4 x i32> [ %102, %100 ], [ %109, %103 ], !dbg !654
  %113 = add <4 x i32> %111, %62
  %114 = add <4 x i32> %113, %112, !dbg !655
  %115 = icmp ult <4 x i32> %71, %62, !dbg !656
  %116 = add <4 x i32> %73, %64, !dbg !657
  %117 = mul <4 x i32> %73, splat (i32 3), !dbg !657
  %118 = select <4 x i1> %115, <4 x i32> %116, <4 x i32> %117, !dbg !657
  %119 = icmp ult <4 x i32> %114, %118, !dbg !658
  %120 = select <4 x i1> %59, <4 x i1> splat (i1 true), <4 x i1> %119, !dbg !659
  %121 = xor <4 x i1> %120, splat (i1 true), !dbg !659
  %122 = extractelement <4 x i1> %121, i64 0, !dbg !659
  br i1 %122, label %123, label %127, !dbg !654

123:                                              ; preds = %110
  %124 = extractelement <4 x i32> %118, i64 0, !dbg !660
  %125 = urem i32 %124, %47, !dbg !660
  %126 = insertelement <4 x i32> poison, i32 %125, i64 0, !dbg !660
  br label %127, !dbg !659

127:                                              ; preds = %123, %110
  %128 = phi <4 x i32> [ poison, %110 ], [ %126, %123 ], !dbg !660
  %129 = extractelement <4 x i1> %121, i64 1, !dbg !660
  br i1 %129, label %130, label %134, !dbg !660

130:                                              ; preds = %127
  %131 = extractelement <4 x i32> %118, i64 1, !dbg !660
  %132 = urem i32 %131, %47, !dbg !660
  %133 = insertelement <4 x i32> %128, i32 %132, i64 1, !dbg !660
  br label %134, !dbg !660

134:                                              ; preds = %130, %127
  %135 = phi <4 x i32> [ %128, %127 ], [ %133, %130 ], !dbg !660
  %136 = extractelement <4 x i1> %121, i64 2, !dbg !660
  br i1 %136, label %137, label %141, !dbg !660

137:                                              ; preds = %134
  %138 = extractelement <4 x i32> %118, i64 2, !dbg !660
  %139 = urem i32 %138, %47, !dbg !660
  %140 = insertelement <4 x i32> %135, i32 %139, i64 2, !dbg !660
  br label %141, !dbg !660

141:                                              ; preds = %137, %134
  %142 = phi <4 x i32> [ %135, %134 ], [ %140, %137 ], !dbg !660
  %143 = extractelement <4 x i1> %121, i64 3, !dbg !660
  br i1 %143, label %144, label %148, !dbg !660

144:                                              ; preds = %141
  %145 = extractelement <4 x i32> %118, i64 3, !dbg !660
  %146 = urem i32 %145, %47, !dbg !660
  %147 = insertelement <4 x i32> %142, i32 %146, i64 3, !dbg !660
  br label %148, !dbg !660

148:                                              ; preds = %144, %141
  %149 = phi <4 x i32> [ %142, %141 ], [ %147, %144 ], !dbg !660
  %150 = select <4 x i1> %60, <4 x i1> %119, <4 x i1> zeroinitializer, !dbg !659
  %151 = extractelement <4 x i1> %150, i64 0, !dbg !659
  br i1 %151, label %152, label %156, !dbg !660

152:                                              ; preds = %148
  %153 = extractelement <4 x i32> %114, i64 0, !dbg !661
  %154 = udiv i32 %153, %47, !dbg !661
  %155 = insertelement <4 x i32> poison, i32 %154, i64 0, !dbg !661
  br label %156, !dbg !659

156:                                              ; preds = %152, %148
  %157 = phi <4 x i32> [ poison, %148 ], [ %155, %152 ], !dbg !661
  %158 = extractelement <4 x i1> %150, i64 1, !dbg !661
  br i1 %158, label %159, label %163, !dbg !661

159:                                              ; preds = %156
  %160 = extractelement <4 x i32> %114, i64 1, !dbg !661
  %161 = udiv i32 %160, %47, !dbg !661
  %162 = insertelement <4 x i32> %157, i32 %161, i64 1, !dbg !661
  br label %163, !dbg !661

163:                                              ; preds = %159, %156
  %164 = phi <4 x i32> [ %157, %156 ], [ %162, %159 ], !dbg !661
  %165 = extractelement <4 x i1> %150, i64 2, !dbg !661
  br i1 %165, label %166, label %170, !dbg !661

166:                                              ; preds = %163
  %167 = extractelement <4 x i32> %114, i64 2, !dbg !661
  %168 = udiv i32 %167, %47, !dbg !661
  %169 = insertelement <4 x i32> %164, i32 %168, i64 2, !dbg !661
  br label %170, !dbg !661

170:                                              ; preds = %166, %163
  %171 = phi <4 x i32> [ %164, %163 ], [ %169, %166 ], !dbg !661
  %172 = extractelement <4 x i1> %150, i64 3, !dbg !661
  br i1 %172, label %173, label %177, !dbg !661

173:                                              ; preds = %170
  %174 = extractelement <4 x i32> %114, i64 3, !dbg !661
  %175 = udiv i32 %174, %47, !dbg !661
  %176 = insertelement <4 x i32> %171, i32 %175, i64 3, !dbg !661
  br label %177, !dbg !661

177:                                              ; preds = %173, %170
  %178 = phi <4 x i32> [ %171, %170 ], [ %176, %173 ], !dbg !661
  %179 = icmp ult <4 x i32> %71, %62, !dbg !656
  %180 = mul <4 x i32> %73, splat (i32 3), !dbg !657
  %181 = select <4 x i1> %179, <4 x i32> %73, <4 x i32> %180, !dbg !657
  %182 = icmp ult <4 x i32> %62, %181, !dbg !658
  %183 = xor <4 x i1> %182, splat (i1 true), !dbg !659
  %184 = select <4 x i1> %59, <4 x i1> %183, <4 x i1> zeroinitializer, !dbg !659
  %185 = add <4 x i32> %149, %114, !dbg !662
  %186 = select <4 x i1> %59, <4 x i1> %182, <4 x i1> zeroinitializer, !dbg !659
  %187 = add <4 x i32> %178, %118, !dbg !663
  %188 = select <4 x i1> %186, <4 x i32> %181, <4 x i32> %187, !dbg !663
  %189 = select <4 x i1> %120, <4 x i32> %188, <4 x i32> %185, !dbg !664
  %190 = select <4 x i1> %184, <4 x i32> %62, <4 x i32> %189, !dbg !664
  %191 = getelementptr inbounds nuw i32, ptr %3, i32 %70, !dbg !665
  store <4 x i32> %190, ptr %191, align 4, !dbg !666, !tbaa !290
  %192 = add nuw i32 %70, 4, !dbg !650
  %193 = add <4 x i32> %71, splat (i32 4)
  %194 = icmp eq i32 %192, %57, !dbg !650
  br i1 %194, label %195, label %69, !dbg !650, !llvm.loop !667

195:                                              ; preds = %177
  %196 = icmp eq i32 %27, %57, !dbg !648
  br i1 %196, label %235, label %197, !dbg !648

197:                                              ; preds = %49, %195
  %198 = phi i32 [ 0, %49 ], [ %57, %195 ]
  br label %199, !dbg !648

199:                                              ; preds = %197, %230
  %200 = phi i32 [ %233, %230 ], [ %198, %197 ]
    #dbg_value(i32 %200, !510, !DIExpression(), !647)
    #dbg_value(i32 %200, !512, !DIExpression(), !669)
  %201 = getelementptr inbounds nuw i32, ptr %8, i32 %200, !dbg !651
    #dbg_value(i32 poison, !515, !DIExpression(), !669)
    #dbg_value(i32 %37, !516, !DIExpression(), !669)
    #dbg_value(i32 %47, !517, !DIExpression(), !669)
    #dbg_value(i32 %200, !518, !DIExpression(), !669)
    #dbg_value(i32 poison, !519, !DIExpression(), !669)
    #dbg_value(i32 %37, !520, !DIExpression(), !669)
    #dbg_value(i32 %47, !521, !DIExpression(), !669)
    #dbg_value(i32 poison, !522, !DIExpression(), !669)
    #dbg_value(i32 %47, !523, !DIExpression(), !669)
  %202 = load i32, ptr %201, align 4, !dbg !652, !tbaa !290
  br i1 %51, label %203, label %208, !dbg !649

203:                                              ; preds = %199
    #dbg_value(i32 poison, !528, !DIExpression(), !669)
    #dbg_value(i32 0, !529, !DIExpression(), !669)
    #dbg_value(i32 %37, !530, !DIExpression(), !669)
    #dbg_value(i32 %200, !531, !DIExpression(), !669)
    #dbg_value(i32 %202, !532, !DIExpression(), !669)
    #dbg_value(i32 %37, !533, !DIExpression(), !669)
    #dbg_value(i32 %47, !534, !DIExpression(), !669)
    #dbg_value(i32 %200, !535, !DIExpression(), !669)
    #dbg_value(i32 %202, !536, !DIExpression(), !669)
    #dbg_value(i32 %37, !537, !DIExpression(), !669)
    #dbg_value(i32 %47, !538, !DIExpression(), !669)
    #dbg_value(i32 %200, !539, !DIExpression(), !669)
  %204 = icmp ult i32 %200, %37, !dbg !656
  %205 = mul i32 %202, 3, !dbg !657
  %206 = select i1 %204, i32 %202, i32 %205, !dbg !657
    #dbg_value(i32 %206, !540, !DIExpression(), !669)
    #dbg_value(i32 %206, !546, !DIExpression(), !669)
    #dbg_value(i32 %37, !547, !DIExpression(), !669)
    #dbg_value(i32 %47, !548, !DIExpression(), !669)
    #dbg_value(i32 %37, !549, !DIExpression(), !669)
    #dbg_value(i32 %206, !550, !DIExpression(), !669)
    #dbg_value(i32 %37, !551, !DIExpression(), !669)
    #dbg_value(i32 %47, !552, !DIExpression(), !669)
    #dbg_value(i32 %37, !553, !DIExpression(), !669)
  %207 = icmp ult i32 %37, %206, !dbg !658
  br i1 %207, label %220, label %226, !dbg !659

208:                                              ; preds = %199
    #dbg_value(i32 %202, !515, !DIExpression(), !669)
    #dbg_value(i32 %202, !519, !DIExpression(), !669)
    #dbg_value(i32 %202, !522, !DIExpression(), !669)
  %209 = udiv i32 %202, %47, !dbg !653
    #dbg_value(i32 %209, !524, !DIExpression(), !669)
    #dbg_value(i32 %209, !525, !DIExpression(), !669)
    #dbg_value(i32 %200, !526, !DIExpression(), !669)
    #dbg_value(i32 %47, !527, !DIExpression(), !669)
  %210 = urem i32 %200, %47, !dbg !654
    #dbg_value(i32 poison, !528, !DIExpression(), !669)
    #dbg_value(i32 poison, !529, !DIExpression(), !669)
  %211 = add i32 %209, %37
  %212 = add i32 %211, %210, !dbg !655
    #dbg_value(i32 %212, !530, !DIExpression(), !669)
    #dbg_value(i32 %200, !531, !DIExpression(), !669)
    #dbg_value(i32 %202, !532, !DIExpression(), !669)
    #dbg_value(i32 %37, !533, !DIExpression(), !669)
    #dbg_value(i32 %47, !534, !DIExpression(), !669)
    #dbg_value(i32 %200, !535, !DIExpression(), !669)
    #dbg_value(i32 %202, !536, !DIExpression(), !669)
    #dbg_value(i32 %37, !537, !DIExpression(), !669)
    #dbg_value(i32 %47, !538, !DIExpression(), !669)
    #dbg_value(i32 %200, !539, !DIExpression(), !669)
  %213 = icmp ult i32 %200, %37, !dbg !656
  %214 = add i32 %202, %47, !dbg !657
  %215 = mul i32 %202, 3, !dbg !657
  %216 = select i1 %213, i32 %214, i32 %215, !dbg !657
    #dbg_value(i32 %216, !540, !DIExpression(), !669)
    #dbg_value(i32 %216, !546, !DIExpression(), !669)
    #dbg_value(i32 %37, !547, !DIExpression(), !669)
    #dbg_value(i32 %47, !548, !DIExpression(), !669)
    #dbg_value(i32 %212, !549, !DIExpression(), !669)
    #dbg_value(i32 %216, !550, !DIExpression(), !669)
    #dbg_value(i32 %37, !551, !DIExpression(), !669)
    #dbg_value(i32 %47, !552, !DIExpression(), !669)
    #dbg_value(i32 %212, !553, !DIExpression(), !669)
  %217 = icmp ult i32 %212, %216, !dbg !658
  br i1 %217, label %218, label %224, !dbg !659

218:                                              ; preds = %208
    #dbg_value(i32 %212, !555, !DIExpression(), !670)
    #dbg_value(i32 %47, !558, !DIExpression(), !670)
  %219 = udiv i32 %212, %47, !dbg !661
    #dbg_value(i32 %219, !559, !DIExpression(), !670)
  br label %220

220:                                              ; preds = %218, %203
  %221 = phi i32 [ %216, %218 ], [ %206, %203 ]
  %222 = phi i32 [ %219, %218 ], [ 0, %203 ], !dbg !671
    #dbg_value(i32 %222, !559, !DIExpression(), !670)
    #dbg_value(i32 %222, !560, !DIExpression(), !670)
  %223 = add i32 %222, %221, !dbg !663
    #dbg_value(i32 %223, !554, !DIExpression(), !669)
  br label %230, !dbg !672

224:                                              ; preds = %208
    #dbg_value(i32 %216, !561, !DIExpression(), !673)
    #dbg_value(i32 %47, !563, !DIExpression(), !673)
  %225 = urem i32 %216, %47, !dbg !660
    #dbg_value(i32 %225, !564, !DIExpression(), !673)
  br label %226

226:                                              ; preds = %224, %203
  %227 = phi i32 [ %212, %224 ], [ %37, %203 ]
  %228 = phi i32 [ %225, %224 ], [ 0, %203 ], !dbg !674
    #dbg_value(i32 %228, !564, !DIExpression(), !673)
    #dbg_value(i32 %228, !565, !DIExpression(), !673)
  %229 = add i32 %228, %227, !dbg !662
    #dbg_value(i32 %229, !554, !DIExpression(), !669)
  br label %230

230:                                              ; preds = %226, %220
  %231 = phi i32 [ %223, %220 ], [ %229, %226 ], !dbg !664
    #dbg_value(i32 %231, !554, !DIExpression(), !669)
  %232 = getelementptr inbounds nuw i32, ptr %3, i32 %200, !dbg !665
  store i32 %231, ptr %232, align 4, !dbg !666, !tbaa !290
  %233 = add nuw i32 %200, 1, !dbg !650
    #dbg_value(i32 %233, !510, !DIExpression(), !647)
  %234 = icmp eq i32 %233, %27, !dbg !644
  br i1 %234, label %235, label %199, !dbg !648, !llvm.loop !675

235:                                              ; preds = %230, %195, %7
  ret i32 %27, !dbg !676

236:                                              ; preds = %4
  tail call void @llvm.trap(), !dbg !677
  unreachable, !dbg !679
}

; Function Attrs: nounwind uwtable
define hidden void @ink_compute_call(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readonly %2, ptr nocapture noundef writeonly %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #2 !dbg !680 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !740)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !740)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !740)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !740)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !740)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !740)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !740)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !740)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !742)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !742)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !742)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !742)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !742)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !742)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !742)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !742)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !744)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !744)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !744)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !744)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !744)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !744)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !744)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !744)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !746)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !746)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !746)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !746)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !746)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !746)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !746)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !746)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !748)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !748)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !748)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !748)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !748)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !748)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !748)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !748)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !750)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !750)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !750)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !750)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !750)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !750)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !750)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !750)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !752)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !752)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !752)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !752)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !752)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !752)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !752)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !752)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !754)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !754)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !754)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !754)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !754)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !754)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !754)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !754)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !756)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !756)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !756)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !756)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !756)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !756)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !756)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !756)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !758)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !758)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !758)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !758)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !758)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !758)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !758)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !758)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !760)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !760)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !760)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !760)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !760)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !760)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !760)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !760)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !762)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !762)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !762)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !762)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !762)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !762)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !762)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !762)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !764)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !764)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !764)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !764)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !764)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !764)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !764)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !764)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !766)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !766)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !766)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !766)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !766)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !766)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !766)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !766)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !768)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !768)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !768)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !768)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !768)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !768)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !768)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !768)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !770)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !770)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !770)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !770)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !770)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !770)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !770)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !770)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !772)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !772)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !772)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !772)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !772)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !772)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !772)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !772)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !774)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !774)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !774)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !774)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !774)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !774)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !774)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !774)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !776)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !776)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !776)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !776)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !776)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !776)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !776)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !776)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !778)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !778)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !778)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !778)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !778)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !778)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !778)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !778)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !780)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !780)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !780)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !780)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !780)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !780)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !780)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !780)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !782)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !782)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !782)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !782)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !782)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !782)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !782)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !782)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !784)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !784)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !784)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !784)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !784)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !784)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !784)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !784)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !786)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !786)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !786)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !786)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !786)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !786)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !786)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !786)
    #dbg_value(i32 %0, !686, !DIExpression(), !788)
    #dbg_value(ptr %1, !687, !DIExpression(), !788)
    #dbg_value(ptr %2, !688, !DIExpression(), !788)
    #dbg_value(ptr %3, !689, !DIExpression(), !788)
    #dbg_value(ptr %4, !690, !DIExpression(), !788)
  switch i32 %0, label %844 [
    i32 0, label %6
    i32 1, label %262
    i32 2, label %364
    i32 3, label %466
    i32 4, label %564
    i32 5, label %662
    i32 6, label %753
  ], !dbg !789

6:                                                ; preds = %5
  %7 = load ptr, ptr %1, align 4, !dbg !790, !tbaa !634
    #dbg_value(ptr %7, !691, !DIExpression(), !791)
    #dbg_value(ptr poison, !694, !DIExpression(), !791)
  %8 = ptrtoint ptr %7 to i32, !dbg !792
  %9 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !792
  %10 = load ptr, ptr %9, align 4, !dbg !792, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !740)
    #dbg_value(ptr %10, !115, !DIExpression(), !740)
    #dbg_value(i32 4, !116, !DIExpression(), !740)
    #dbg_value(ptr undef, !117, !DIExpression(), !740)
    #dbg_value(ptr %10, !119, !DIExpression(), !740)
    #dbg_value(i32 0, !122, !DIExpression(), !793)
  %11 = load i8, ptr %10, align 1, !dbg !794, !tbaa !132
    #dbg_value(i8 %11, !695, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !791)
    #dbg_value(i32 1, !122, !DIExpression(), !793)
  %12 = getelementptr inbounds nuw i8, ptr %10, i32 1, !dbg !794
  %13 = load i8, ptr %12, align 1, !dbg !794, !tbaa !132
    #dbg_value(i8 %13, !695, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !791)
    #dbg_value(i32 2, !122, !DIExpression(), !793)
  %14 = getelementptr inbounds nuw i8, ptr %10, i32 2, !dbg !794
  %15 = load i8, ptr %14, align 1, !dbg !794, !tbaa !132
    #dbg_value(i8 %15, !695, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !791)
    #dbg_value(i32 3, !122, !DIExpression(), !793)
  %16 = getelementptr inbounds nuw i8, ptr %10, i32 3, !dbg !794
  %17 = load i8, ptr %16, align 1, !dbg !794, !tbaa !132
    #dbg_value(i8 %17, !695, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !791)
    #dbg_value(i32 4, !122, !DIExpression(), !793)
  %18 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !795
  %19 = load ptr, ptr %18, align 4, !dbg !795, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !742)
    #dbg_value(ptr %19, !115, !DIExpression(), !742)
    #dbg_value(i32 4, !116, !DIExpression(), !742)
    #dbg_value(ptr undef, !117, !DIExpression(), !742)
    #dbg_value(ptr %19, !119, !DIExpression(), !742)
    #dbg_value(i32 0, !122, !DIExpression(), !796)
  %20 = load i8, ptr %19, align 1, !dbg !797, !tbaa !132
    #dbg_value(i8 %20, !696, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !791)
    #dbg_value(i32 1, !122, !DIExpression(), !796)
  %21 = getelementptr inbounds nuw i8, ptr %19, i32 1, !dbg !797
  %22 = load i8, ptr %21, align 1, !dbg !797, !tbaa !132
    #dbg_value(i8 %22, !696, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !791)
    #dbg_value(i32 2, !122, !DIExpression(), !796)
  %23 = getelementptr inbounds nuw i8, ptr %19, i32 2, !dbg !797
  %24 = load i8, ptr %23, align 1, !dbg !797, !tbaa !132
    #dbg_value(i8 %24, !696, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !791)
    #dbg_value(i32 3, !122, !DIExpression(), !796)
  %25 = getelementptr inbounds nuw i8, ptr %19, i32 3, !dbg !797
  %26 = load i8, ptr %25, align 1, !dbg !797, !tbaa !132
    #dbg_value(i8 %26, !696, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !791)
    #dbg_value(i32 4, !122, !DIExpression(), !796)
  %27 = load i32, ptr %2, align 4, !dbg !798, !tbaa !27
  %28 = zext i8 %17 to i32, !dbg !799
  %29 = shl nuw i32 %28, 24, !dbg !799
  %30 = zext i8 %15 to i32, !dbg !799
  %31 = shl nuw nsw i32 %30, 16, !dbg !799
  %32 = or disjoint i32 %29, %31, !dbg !799
  %33 = zext i8 %13 to i32, !dbg !799
  %34 = shl nuw nsw i32 %33, 8, !dbg !799
  %35 = or disjoint i32 %32, %34, !dbg !799
  %36 = zext i8 %11 to i32, !dbg !799
  %37 = or disjoint i32 %35, %36, !dbg !799
  %38 = zext i8 %26 to i32, !dbg !800
  %39 = shl nuw i32 %38, 24, !dbg !800
  %40 = zext i8 %24 to i32, !dbg !800
  %41 = shl nuw nsw i32 %40, 16, !dbg !800
  %42 = or disjoint i32 %39, %41, !dbg !800
  %43 = zext i8 %22 to i32, !dbg !800
  %44 = shl nuw nsw i32 %43, 8, !dbg !800
  %45 = or disjoint i32 %42, %44, !dbg !800
  %46 = zext i8 %20 to i32, !dbg !800
  %47 = or disjoint i32 %45, %46, !dbg !800
    #dbg_value(ptr poison, !177, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !803)
    #dbg_value(i32 poison, !177, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !803)
    #dbg_value(ptr %7, !176, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !803)
    #dbg_value(i32 %27, !176, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !803)
    #dbg_value(i32 %37, !178, !DIExpression(), !803)
    #dbg_value(i32 %47, !179, !DIExpression(), !803)
    #dbg_value(ptr %7, !180, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !803)
    #dbg_value(i32 %27, !180, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !803)
    #dbg_value(i32 %27, !55, !DIExpression(), !804)
    #dbg_value(i32 4, !56, !DIExpression(), !804)
  %48 = icmp ugt i32 %27, 1073741823, !dbg !800
  %49 = load i32, ptr @ink_top, align 4, !noalias !805
  %50 = icmp ugt i32 %49, -8
  %51 = select i1 %48, i1 true, i1 %50, !dbg !808
  br i1 %51, label %52, label %53, !dbg !808

52:                                               ; preds = %6
  tail call void @llvm.trap(), !dbg !809
  unreachable, !dbg !811

53:                                               ; preds = %6
  %54 = icmp eq i32 %49, 0, !dbg !812
  %55 = add nuw i32 %49, 7, !dbg !813
  %56 = select i1 %54, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %55, !dbg !814
  %57 = and i32 %56, -8, !dbg !815
    #dbg_value(i32 %57, !57, !DIExpression(), !804)
  %58 = tail call i32 @llvm.umax.i32(i32 %27, i32 1), !dbg !816
  %59 = shl nuw i32 %58, 2, !dbg !817
    #dbg_value(i32 %59, !58, !DIExpression(), !804)
  %60 = xor i32 %57, -1, !dbg !818
  %61 = icmp ugt i32 %59, %60, !dbg !819
  br i1 %61, label %62, label %63, !dbg !819

62:                                               ; preds = %53
  tail call void @llvm.trap(), !dbg !820
  unreachable, !dbg !822

63:                                               ; preds = %53
  %64 = add i32 %57, %59, !dbg !823
  store i32 %64, ptr @ink_top, align 4, !dbg !824, !tbaa !27, !noalias !805
  %65 = add i32 %64, 65535, !dbg !825
  %66 = lshr i32 %65, 16, !dbg !826
    #dbg_value(i32 %66, !59, !DIExpression(), !804)
  %67 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !827, !noalias !805
    #dbg_value(i32 %67, !60, !DIExpression(), !804)
  %68 = icmp ugt i32 %66, %67, !dbg !828
  br i1 %68, label %69, label %74, !dbg !829

69:                                               ; preds = %63
  %70 = sub nuw nsw i32 %66, %67, !dbg !830
  %71 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %70), !dbg !831, !noalias !805
  %72 = icmp eq i32 %71, -1, !dbg !832
  br i1 %72, label %73, label %74, !dbg !829

73:                                               ; preds = %69
  tail call void @llvm.trap(), !dbg !833
  unreachable, !dbg !835

74:                                               ; preds = %69, %63
  %75 = inttoptr i32 %57 to ptr, !dbg !836
    #dbg_value(ptr %75, !181, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !803)
    #dbg_value(ptr %75, !697, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !791)
    #dbg_value(i32 %27, !181, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !803)
    #dbg_value(i32 %27, !697, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !791)
    #dbg_value(i32 0, !182, !DIExpression(), !837)
  %76 = icmp eq i32 %27, 0, !dbg !838
  br i1 %76, label %849, label %77, !dbg !839

77:                                               ; preds = %74
  %78 = icmp eq i32 %47, 0
  %79 = icmp ult i32 %27, 4, !dbg !839
  %80 = sub i32 %57, %8, !dbg !839
  %81 = icmp ult i32 %80, 16, !dbg !839
  %82 = select i1 %79, i1 true, i1 %81, !dbg !839
  br i1 %82, label %224, label %83, !dbg !839

83:                                               ; preds = %77
  %84 = and i32 %27, 1073741820, !dbg !839
  %85 = insertelement <4 x i1> poison, i1 %78, i64 0, !dbg !839
  %86 = shufflevector <4 x i1> %85, <4 x i1> poison, <4 x i32> zeroinitializer, !dbg !839
  %87 = xor <4 x i1> %86, splat (i1 true), !dbg !840
  %88 = insertelement <4 x i32> poison, i32 %37, i64 0, !dbg !839
  %89 = shufflevector <4 x i32> %88, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !839
  %90 = insertelement <4 x i32> poison, i32 %47, i64 0, !dbg !839
  %91 = shufflevector <4 x i32> %90, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !839
  %92 = extractelement <4 x i1> %87, i64 0
  %93 = extractelement <4 x i1> %87, i64 1
  %94 = extractelement <4 x i1> %87, i64 2
  %95 = extractelement <4 x i1> %87, i64 3
  br label %96, !dbg !839

96:                                               ; preds = %204, %83
  %97 = phi i32 [ 0, %83 ], [ %219, %204 ], !dbg !841
  %98 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %83 ], [ %220, %204 ]
  %99 = getelementptr inbounds nuw i32, ptr %7, i32 %97, !dbg !842
  %100 = load <4 x i32>, ptr %99, align 4, !dbg !843, !tbaa !290, !noalias !805
  br i1 %92, label %101, label %107, !dbg !840

101:                                              ; preds = %96
  %102 = extractelement <4 x i32> %100, i64 0, !dbg !844
  %103 = udiv i32 %102, %47, !dbg !844
  %104 = insertelement <4 x i32> poison, i32 %103, i64 0, !dbg !844
  %105 = urem i32 %97, %47, !dbg !845
  %106 = insertelement <4 x i32> poison, i32 %105, i64 0, !dbg !845
  br label %107, !dbg !843

107:                                              ; preds = %101, %96
  %108 = phi <4 x i32> [ poison, %96 ], [ %104, %101 ], !dbg !844
  %109 = phi <4 x i32> [ poison, %96 ], [ %106, %101 ], !dbg !845
  br i1 %93, label %110, label %117, !dbg !845

110:                                              ; preds = %107
  %111 = or disjoint i32 %97, 1, !dbg !840
  %112 = extractelement <4 x i32> %100, i64 1, !dbg !844
  %113 = udiv i32 %112, %47, !dbg !844
  %114 = insertelement <4 x i32> %108, i32 %113, i64 1, !dbg !844
  %115 = urem i32 %111, %47, !dbg !845
  %116 = insertelement <4 x i32> %109, i32 %115, i64 1, !dbg !845
  br label %117, !dbg !845

117:                                              ; preds = %110, %107
  %118 = phi <4 x i32> [ %108, %107 ], [ %114, %110 ], !dbg !844
  %119 = phi <4 x i32> [ %109, %107 ], [ %116, %110 ], !dbg !845
  br i1 %94, label %120, label %127, !dbg !845

120:                                              ; preds = %117
  %121 = or disjoint i32 %97, 2, !dbg !840
  %122 = extractelement <4 x i32> %100, i64 2, !dbg !844
  %123 = udiv i32 %122, %47, !dbg !844
  %124 = insertelement <4 x i32> %118, i32 %123, i64 2, !dbg !844
  %125 = urem i32 %121, %47, !dbg !845
  %126 = insertelement <4 x i32> %119, i32 %125, i64 2, !dbg !845
  br label %127, !dbg !845

127:                                              ; preds = %120, %117
  %128 = phi <4 x i32> [ %118, %117 ], [ %124, %120 ], !dbg !844
  %129 = phi <4 x i32> [ %119, %117 ], [ %126, %120 ], !dbg !845
  br i1 %95, label %130, label %137, !dbg !845

130:                                              ; preds = %127
  %131 = or disjoint i32 %97, 3, !dbg !840
  %132 = extractelement <4 x i32> %100, i64 3, !dbg !844
  %133 = udiv i32 %132, %47, !dbg !844
  %134 = insertelement <4 x i32> %128, i32 %133, i64 3, !dbg !844
  %135 = urem i32 %131, %47, !dbg !845
  %136 = insertelement <4 x i32> %129, i32 %135, i64 3, !dbg !845
  br label %137, !dbg !845

137:                                              ; preds = %130, %127
  %138 = phi <4 x i32> [ %128, %127 ], [ %134, %130 ], !dbg !844
  %139 = phi <4 x i32> [ %129, %127 ], [ %136, %130 ], !dbg !845
  %140 = add <4 x i32> %138, %89
  %141 = add <4 x i32> %140, %139, !dbg !846
  %142 = icmp ult <4 x i32> %98, %89, !dbg !847
  %143 = add <4 x i32> %100, %91, !dbg !848
  %144 = mul <4 x i32> %100, splat (i32 3), !dbg !848
  %145 = select <4 x i1> %142, <4 x i32> %143, <4 x i32> %144, !dbg !848
  %146 = icmp ult <4 x i32> %141, %145, !dbg !849
  %147 = select <4 x i1> %86, <4 x i1> splat (i1 true), <4 x i1> %146, !dbg !850
  %148 = xor <4 x i1> %147, splat (i1 true), !dbg !850
  %149 = extractelement <4 x i1> %148, i64 0, !dbg !850
  br i1 %149, label %150, label %154, !dbg !845

150:                                              ; preds = %137
  %151 = extractelement <4 x i32> %145, i64 0, !dbg !851
  %152 = urem i32 %151, %47, !dbg !851
  %153 = insertelement <4 x i32> poison, i32 %152, i64 0, !dbg !851
  br label %154, !dbg !850

154:                                              ; preds = %150, %137
  %155 = phi <4 x i32> [ poison, %137 ], [ %153, %150 ], !dbg !851
  %156 = extractelement <4 x i1> %148, i64 1, !dbg !851
  br i1 %156, label %157, label %161, !dbg !851

157:                                              ; preds = %154
  %158 = extractelement <4 x i32> %145, i64 1, !dbg !851
  %159 = urem i32 %158, %47, !dbg !851
  %160 = insertelement <4 x i32> %155, i32 %159, i64 1, !dbg !851
  br label %161, !dbg !851

161:                                              ; preds = %157, %154
  %162 = phi <4 x i32> [ %155, %154 ], [ %160, %157 ], !dbg !851
  %163 = extractelement <4 x i1> %148, i64 2, !dbg !851
  br i1 %163, label %164, label %168, !dbg !851

164:                                              ; preds = %161
  %165 = extractelement <4 x i32> %145, i64 2, !dbg !851
  %166 = urem i32 %165, %47, !dbg !851
  %167 = insertelement <4 x i32> %162, i32 %166, i64 2, !dbg !851
  br label %168, !dbg !851

168:                                              ; preds = %164, %161
  %169 = phi <4 x i32> [ %162, %161 ], [ %167, %164 ], !dbg !851
  %170 = extractelement <4 x i1> %148, i64 3, !dbg !851
  br i1 %170, label %171, label %175, !dbg !851

171:                                              ; preds = %168
  %172 = extractelement <4 x i32> %145, i64 3, !dbg !851
  %173 = urem i32 %172, %47, !dbg !851
  %174 = insertelement <4 x i32> %169, i32 %173, i64 3, !dbg !851
  br label %175, !dbg !851

175:                                              ; preds = %171, %168
  %176 = phi <4 x i32> [ %169, %168 ], [ %174, %171 ], !dbg !851
  %177 = select <4 x i1> %87, <4 x i1> %146, <4 x i1> zeroinitializer, !dbg !850
  %178 = extractelement <4 x i1> %177, i64 0, !dbg !850
  br i1 %178, label %179, label %183, !dbg !851

179:                                              ; preds = %175
  %180 = extractelement <4 x i32> %141, i64 0, !dbg !852
  %181 = udiv i32 %180, %47, !dbg !852
  %182 = insertelement <4 x i32> poison, i32 %181, i64 0, !dbg !852
  br label %183, !dbg !850

183:                                              ; preds = %179, %175
  %184 = phi <4 x i32> [ poison, %175 ], [ %182, %179 ], !dbg !852
  %185 = extractelement <4 x i1> %177, i64 1, !dbg !852
  br i1 %185, label %186, label %190, !dbg !852

186:                                              ; preds = %183
  %187 = extractelement <4 x i32> %141, i64 1, !dbg !852
  %188 = udiv i32 %187, %47, !dbg !852
  %189 = insertelement <4 x i32> %184, i32 %188, i64 1, !dbg !852
  br label %190, !dbg !852

190:                                              ; preds = %186, %183
  %191 = phi <4 x i32> [ %184, %183 ], [ %189, %186 ], !dbg !852
  %192 = extractelement <4 x i1> %177, i64 2, !dbg !852
  br i1 %192, label %193, label %197, !dbg !852

193:                                              ; preds = %190
  %194 = extractelement <4 x i32> %141, i64 2, !dbg !852
  %195 = udiv i32 %194, %47, !dbg !852
  %196 = insertelement <4 x i32> %191, i32 %195, i64 2, !dbg !852
  br label %197, !dbg !852

197:                                              ; preds = %193, %190
  %198 = phi <4 x i32> [ %191, %190 ], [ %196, %193 ], !dbg !852
  %199 = extractelement <4 x i1> %177, i64 3, !dbg !852
  br i1 %199, label %200, label %204, !dbg !852

200:                                              ; preds = %197
  %201 = extractelement <4 x i32> %141, i64 3, !dbg !852
  %202 = udiv i32 %201, %47, !dbg !852
  %203 = insertelement <4 x i32> %198, i32 %202, i64 3, !dbg !852
  br label %204, !dbg !852

204:                                              ; preds = %200, %197
  %205 = phi <4 x i32> [ %198, %197 ], [ %203, %200 ], !dbg !852
  %206 = icmp ult <4 x i32> %98, %89, !dbg !847
  %207 = mul <4 x i32> %100, splat (i32 3), !dbg !848
  %208 = select <4 x i1> %206, <4 x i32> %100, <4 x i32> %207, !dbg !848
  %209 = icmp ult <4 x i32> %89, %208, !dbg !849
  %210 = xor <4 x i1> %209, splat (i1 true), !dbg !850
  %211 = select <4 x i1> %86, <4 x i1> %210, <4 x i1> zeroinitializer, !dbg !850
  %212 = add <4 x i32> %176, %141, !dbg !853
  %213 = select <4 x i1> %86, <4 x i1> %209, <4 x i1> zeroinitializer, !dbg !850
  %214 = add <4 x i32> %205, %145, !dbg !854
  %215 = select <4 x i1> %213, <4 x i32> %208, <4 x i32> %214, !dbg !854
  %216 = select <4 x i1> %147, <4 x i32> %215, <4 x i32> %212, !dbg !855
  %217 = select <4 x i1> %211, <4 x i32> %89, <4 x i32> %216, !dbg !855
  %218 = getelementptr inbounds nuw i32, ptr %75, i32 %97, !dbg !856
  store <4 x i32> %217, ptr %218, align 8, !dbg !857, !tbaa !290, !noalias !805
  %219 = add nuw i32 %97, 4, !dbg !841
  %220 = add <4 x i32> %98, splat (i32 4)
  %221 = icmp eq i32 %219, %84, !dbg !841
  br i1 %221, label %222, label %96, !dbg !841, !llvm.loop !858

222:                                              ; preds = %204
  %223 = icmp eq i32 %27, %84, !dbg !839
  br i1 %223, label %849, label %224, !dbg !839

224:                                              ; preds = %77, %222
  %225 = phi i32 [ 0, %77 ], [ %84, %222 ]
  br label %226, !dbg !839

226:                                              ; preds = %224, %257
  %227 = phi i32 [ %260, %257 ], [ %225, %224 ]
    #dbg_value(i32 %227, !182, !DIExpression(), !837)
    #dbg_value(i32 %227, !184, !DIExpression(), !860)
  %228 = getelementptr inbounds nuw i32, ptr %7, i32 %227, !dbg !842
    #dbg_value(i32 poison, !187, !DIExpression(), !860)
    #dbg_value(i32 %37, !188, !DIExpression(), !860)
    #dbg_value(i32 %47, !189, !DIExpression(), !860)
    #dbg_value(i32 %227, !190, !DIExpression(), !860)
    #dbg_value(i32 poison, !191, !DIExpression(), !860)
    #dbg_value(i32 %37, !192, !DIExpression(), !860)
    #dbg_value(i32 %47, !193, !DIExpression(), !860)
    #dbg_value(i32 poison, !194, !DIExpression(), !860)
    #dbg_value(i32 %47, !195, !DIExpression(), !860)
  %229 = load i32, ptr %228, align 4, !dbg !843, !tbaa !290, !noalias !805
  br i1 %78, label %230, label %235, !dbg !840

230:                                              ; preds = %226
    #dbg_value(i32 poison, !200, !DIExpression(), !860)
    #dbg_value(i32 0, !201, !DIExpression(), !860)
    #dbg_value(i32 %37, !202, !DIExpression(), !860)
    #dbg_value(i32 %227, !203, !DIExpression(), !860)
    #dbg_value(i32 %229, !204, !DIExpression(), !860)
    #dbg_value(i32 %37, !205, !DIExpression(), !860)
    #dbg_value(i32 %47, !206, !DIExpression(), !860)
    #dbg_value(i32 %227, !207, !DIExpression(), !860)
    #dbg_value(i32 %229, !208, !DIExpression(), !860)
    #dbg_value(i32 %37, !209, !DIExpression(), !860)
    #dbg_value(i32 %47, !210, !DIExpression(), !860)
    #dbg_value(i32 %227, !211, !DIExpression(), !860)
  %231 = icmp ult i32 %227, %37, !dbg !847
  %232 = mul i32 %229, 3, !dbg !848
  %233 = select i1 %231, i32 %229, i32 %232, !dbg !848
    #dbg_value(i32 %233, !212, !DIExpression(), !860)
    #dbg_value(i32 %233, !218, !DIExpression(), !860)
    #dbg_value(i32 %37, !219, !DIExpression(), !860)
    #dbg_value(i32 %47, !220, !DIExpression(), !860)
    #dbg_value(i32 %37, !221, !DIExpression(), !860)
    #dbg_value(i32 %233, !222, !DIExpression(), !860)
    #dbg_value(i32 %37, !223, !DIExpression(), !860)
    #dbg_value(i32 %47, !224, !DIExpression(), !860)
    #dbg_value(i32 %37, !225, !DIExpression(), !860)
  %234 = icmp ult i32 %37, %233, !dbg !849
  br i1 %234, label %247, label %253, !dbg !850

235:                                              ; preds = %226
    #dbg_value(i32 %229, !187, !DIExpression(), !860)
    #dbg_value(i32 %229, !191, !DIExpression(), !860)
    #dbg_value(i32 %229, !194, !DIExpression(), !860)
  %236 = udiv i32 %229, %47, !dbg !844
    #dbg_value(i32 %236, !196, !DIExpression(), !860)
    #dbg_value(i32 %236, !197, !DIExpression(), !860)
    #dbg_value(i32 %227, !198, !DIExpression(), !860)
    #dbg_value(i32 %47, !199, !DIExpression(), !860)
  %237 = urem i32 %227, %47, !dbg !845
    #dbg_value(i32 poison, !200, !DIExpression(), !860)
    #dbg_value(i32 poison, !201, !DIExpression(), !860)
  %238 = add i32 %236, %37
  %239 = add i32 %238, %237, !dbg !846
    #dbg_value(i32 %239, !202, !DIExpression(), !860)
    #dbg_value(i32 %227, !203, !DIExpression(), !860)
    #dbg_value(i32 %229, !204, !DIExpression(), !860)
    #dbg_value(i32 %37, !205, !DIExpression(), !860)
    #dbg_value(i32 %47, !206, !DIExpression(), !860)
    #dbg_value(i32 %227, !207, !DIExpression(), !860)
    #dbg_value(i32 %229, !208, !DIExpression(), !860)
    #dbg_value(i32 %37, !209, !DIExpression(), !860)
    #dbg_value(i32 %47, !210, !DIExpression(), !860)
    #dbg_value(i32 %227, !211, !DIExpression(), !860)
  %240 = icmp ult i32 %227, %37, !dbg !847
  %241 = add i32 %229, %47, !dbg !848
  %242 = mul i32 %229, 3, !dbg !848
  %243 = select i1 %240, i32 %241, i32 %242, !dbg !848
    #dbg_value(i32 %243, !212, !DIExpression(), !860)
    #dbg_value(i32 %243, !218, !DIExpression(), !860)
    #dbg_value(i32 %37, !219, !DIExpression(), !860)
    #dbg_value(i32 %47, !220, !DIExpression(), !860)
    #dbg_value(i32 %239, !221, !DIExpression(), !860)
    #dbg_value(i32 %243, !222, !DIExpression(), !860)
    #dbg_value(i32 %37, !223, !DIExpression(), !860)
    #dbg_value(i32 %47, !224, !DIExpression(), !860)
    #dbg_value(i32 %239, !225, !DIExpression(), !860)
  %244 = icmp ult i32 %239, %243, !dbg !849
  br i1 %244, label %245, label %251, !dbg !850

245:                                              ; preds = %235
    #dbg_value(i32 %239, !227, !DIExpression(), !861)
    #dbg_value(i32 %47, !230, !DIExpression(), !861)
  %246 = udiv i32 %239, %47, !dbg !852
    #dbg_value(i32 %246, !231, !DIExpression(), !861)
  br label %247

247:                                              ; preds = %245, %230
  %248 = phi i32 [ %243, %245 ], [ %233, %230 ]
  %249 = phi i32 [ %246, %245 ], [ 0, %230 ], !dbg !862
    #dbg_value(i32 %249, !231, !DIExpression(), !861)
    #dbg_value(i32 %249, !232, !DIExpression(), !861)
  %250 = add i32 %249, %248, !dbg !854
    #dbg_value(i32 %250, !226, !DIExpression(), !860)
  br label %257, !dbg !863

251:                                              ; preds = %235
    #dbg_value(i32 %243, !233, !DIExpression(), !864)
    #dbg_value(i32 %47, !235, !DIExpression(), !864)
  %252 = urem i32 %243, %47, !dbg !851
    #dbg_value(i32 %252, !236, !DIExpression(), !864)
  br label %253

253:                                              ; preds = %251, %230
  %254 = phi i32 [ %239, %251 ], [ %37, %230 ]
  %255 = phi i32 [ %252, %251 ], [ 0, %230 ], !dbg !865
    #dbg_value(i32 %255, !236, !DIExpression(), !864)
    #dbg_value(i32 %255, !237, !DIExpression(), !864)
  %256 = add i32 %255, %254, !dbg !853
    #dbg_value(i32 %256, !226, !DIExpression(), !860)
  br label %257

257:                                              ; preds = %253, %247
  %258 = phi i32 [ %250, %247 ], [ %256, %253 ], !dbg !855
    #dbg_value(i32 %258, !226, !DIExpression(), !860)
  %259 = getelementptr inbounds nuw i32, ptr %75, i32 %227, !dbg !856
  store i32 %258, ptr %259, align 4, !dbg !857, !tbaa !290, !noalias !805
  %260 = add nuw i32 %227, 1, !dbg !841
    #dbg_value(i32 %260, !182, !DIExpression(), !837)
  %261 = icmp eq i32 %260, %27, !dbg !838
  br i1 %261, label %849, label %226, !dbg !839, !llvm.loop !866

262:                                              ; preds = %5
    #dbg_value(ptr undef, !110, !DIExpression(), !744)
    #dbg_value(ptr poison, !115, !DIExpression(), !744)
    #dbg_value(i32 4, !116, !DIExpression(), !744)
    #dbg_value(ptr undef, !117, !DIExpression(), !744)
    #dbg_value(ptr poison, !119, !DIExpression(), !744)
    #dbg_value(i8 poison, !698, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !867)
    #dbg_value(i8 poison, !698, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !867)
    #dbg_value(i8 poison, !698, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !867)
    #dbg_value(i8 poison, !698, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !867)
    #dbg_value(i32 4, !122, !DIExpression(), !868)
    #dbg_value(ptr undef, !110, !DIExpression(), !746)
    #dbg_value(ptr poison, !115, !DIExpression(), !746)
    #dbg_value(i32 4, !116, !DIExpression(), !746)
    #dbg_value(ptr undef, !117, !DIExpression(), !746)
    #dbg_value(ptr poison, !119, !DIExpression(), !746)
    #dbg_value(i8 poison, !700, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !867)
    #dbg_value(i8 poison, !700, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !867)
    #dbg_value(i8 poison, !700, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !867)
    #dbg_value(i8 poison, !700, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !867)
    #dbg_value(i32 4, !122, !DIExpression(), !869)
  %263 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !870
  %264 = load ptr, ptr %263, align 4, !dbg !870, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !748)
    #dbg_value(ptr %264, !115, !DIExpression(), !748)
    #dbg_value(i32 4, !116, !DIExpression(), !748)
    #dbg_value(ptr undef, !117, !DIExpression(), !748)
    #dbg_value(ptr %264, !119, !DIExpression(), !748)
    #dbg_value(i32 0, !122, !DIExpression(), !871)
  %265 = load i8, ptr %264, align 1, !dbg !872, !tbaa !132
    #dbg_value(i8 %265, !701, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !867)
    #dbg_value(i32 1, !122, !DIExpression(), !871)
  %266 = getelementptr inbounds nuw i8, ptr %264, i32 1, !dbg !872
  %267 = load i8, ptr %266, align 1, !dbg !872, !tbaa !132
    #dbg_value(i8 %267, !701, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !867)
    #dbg_value(i32 2, !122, !DIExpression(), !871)
  %268 = getelementptr inbounds nuw i8, ptr %264, i32 2, !dbg !872
  %269 = load i8, ptr %268, align 1, !dbg !872, !tbaa !132
    #dbg_value(i8 %269, !701, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !867)
    #dbg_value(i32 3, !122, !DIExpression(), !871)
  %270 = getelementptr inbounds nuw i8, ptr %264, i32 3, !dbg !872
  %271 = load i8, ptr %270, align 1, !dbg !872, !tbaa !132
    #dbg_value(i8 %271, !701, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !867)
    #dbg_value(i32 4, !122, !DIExpression(), !871)
  %272 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !873
  %273 = load ptr, ptr %272, align 4, !dbg !873, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !750)
    #dbg_value(ptr %273, !115, !DIExpression(), !750)
    #dbg_value(i32 4, !116, !DIExpression(), !750)
    #dbg_value(ptr undef, !117, !DIExpression(), !750)
    #dbg_value(ptr %273, !119, !DIExpression(), !750)
    #dbg_value(i32 0, !122, !DIExpression(), !874)
  %274 = load i8, ptr %273, align 1, !dbg !875, !tbaa !132
    #dbg_value(i8 %274, !702, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !867)
    #dbg_value(i32 1, !122, !DIExpression(), !874)
  %275 = getelementptr inbounds nuw i8, ptr %273, i32 1, !dbg !875
  %276 = load i8, ptr %275, align 1, !dbg !875, !tbaa !132
    #dbg_value(i8 %276, !702, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !867)
    #dbg_value(i32 2, !122, !DIExpression(), !874)
  %277 = getelementptr inbounds nuw i8, ptr %273, i32 2, !dbg !875
  %278 = load i8, ptr %277, align 1, !dbg !875, !tbaa !132
    #dbg_value(i8 %278, !702, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !867)
    #dbg_value(i32 3, !122, !DIExpression(), !874)
  %279 = getelementptr inbounds nuw i8, ptr %273, i32 3, !dbg !875
  %280 = load i8, ptr %279, align 1, !dbg !875, !tbaa !132
    #dbg_value(i8 %280, !702, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !867)
    #dbg_value(i32 4, !122, !DIExpression(), !874)
  %281 = zext i8 %271 to i32, !dbg !876
  %282 = shl nuw i32 %281, 24, !dbg !876
  %283 = zext i8 %269 to i32, !dbg !876
  %284 = shl nuw nsw i32 %283, 16, !dbg !876
  %285 = or disjoint i32 %282, %284, !dbg !876
  %286 = zext i8 %267 to i32, !dbg !876
  %287 = shl nuw nsw i32 %286, 8, !dbg !876
  %288 = or disjoint i32 %285, %287, !dbg !876
  %289 = zext i8 %265 to i32, !dbg !876
  %290 = or disjoint i32 %288, %289, !dbg !876
  %291 = zext i8 %280 to i32, !dbg !877
  %292 = shl nuw i32 %291, 24, !dbg !877
  %293 = zext i8 %278 to i32, !dbg !877
  %294 = shl nuw nsw i32 %293, 16, !dbg !877
  %295 = or disjoint i32 %292, %294, !dbg !877
  %296 = zext i8 %276 to i32, !dbg !877
  %297 = shl nuw nsw i32 %296, 8, !dbg !877
  %298 = or disjoint i32 %295, %297, !dbg !877
  %299 = zext i8 %274 to i32, !dbg !877
  %300 = or disjoint i32 %298, %299, !dbg !877
    #dbg_value(i32 poison, !327, !DIExpression(), !879)
    #dbg_value(i32 poison, !328, !DIExpression(), !879)
    #dbg_value(i32 %290, !329, !DIExpression(), !879)
    #dbg_value(i32 %300, !330, !DIExpression(), !879)
    #dbg_value(i32 poison, !331, !DIExpression(), !879)
    #dbg_value(i32 poison, !332, !DIExpression(), !879)
    #dbg_value(i32 %290, !333, !DIExpression(), !879)
    #dbg_value(i32 %300, !334, !DIExpression(), !879)
    #dbg_value(i32 poison, !335, !DIExpression(), !879)
    #dbg_value(i32 %300, !336, !DIExpression(), !879)
  %301 = icmp eq i32 %300, 0, !dbg !877
  br i1 %301, label %343, label %302, !dbg !877

302:                                              ; preds = %262
  %303 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !880
  %304 = load ptr, ptr %303, align 4, !dbg !880, !tbaa !634
    #dbg_value(ptr %304, !115, !DIExpression(), !746)
    #dbg_value(ptr %304, !119, !DIExpression(), !746)
  %305 = getelementptr inbounds nuw i8, ptr %304, i32 3, !dbg !881
  %306 = load i8, ptr %305, align 1, !dbg !881, !tbaa !132
    #dbg_value(i8 %306, !700, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !867)
  %307 = getelementptr inbounds nuw i8, ptr %304, i32 2, !dbg !881
  %308 = load i8, ptr %307, align 1, !dbg !881, !tbaa !132
    #dbg_value(i8 %308, !700, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !867)
  %309 = getelementptr inbounds nuw i8, ptr %304, i32 1, !dbg !881
  %310 = load i8, ptr %309, align 1, !dbg !881, !tbaa !132
    #dbg_value(i8 %310, !700, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !867)
  %311 = load i8, ptr %304, align 1, !dbg !881, !tbaa !132
    #dbg_value(i8 %311, !700, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !867)
  %312 = load ptr, ptr %1, align 4, !dbg !882, !tbaa !634
    #dbg_value(ptr %312, !115, !DIExpression(), !744)
    #dbg_value(ptr %312, !119, !DIExpression(), !744)
  %313 = getelementptr inbounds nuw i8, ptr %312, i32 3, !dbg !883
  %314 = load i8, ptr %313, align 1, !dbg !883, !tbaa !132
    #dbg_value(i8 %314, !698, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !867)
  %315 = getelementptr inbounds nuw i8, ptr %312, i32 2, !dbg !883
  %316 = load i8, ptr %315, align 1, !dbg !883, !tbaa !132
    #dbg_value(i8 %316, !698, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !867)
  %317 = getelementptr inbounds nuw i8, ptr %312, i32 1, !dbg !883
  %318 = load i8, ptr %317, align 1, !dbg !883, !tbaa !132
    #dbg_value(i8 %318, !698, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !867)
  %319 = load i8, ptr %312, align 1, !dbg !883, !tbaa !132
    #dbg_value(i8 %319, !698, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !867)
  %320 = zext i8 %306 to i32, !dbg !884
  %321 = shl nuw i32 %320, 24, !dbg !884
  %322 = zext i8 %308 to i32, !dbg !884
  %323 = shl nuw nsw i32 %322, 16, !dbg !884
  %324 = or disjoint i32 %321, %323, !dbg !884
  %325 = zext i8 %310 to i32, !dbg !884
  %326 = shl nuw nsw i32 %325, 8, !dbg !884
  %327 = or disjoint i32 %324, %326, !dbg !884
  %328 = zext i8 %311 to i32, !dbg !884
  %329 = or disjoint i32 %327, %328, !dbg !884
    #dbg_value(i32 %329, !328, !DIExpression(), !879)
    #dbg_value(i32 %329, !332, !DIExpression(), !879)
    #dbg_value(i32 %329, !335, !DIExpression(), !879)
  %330 = zext i8 %314 to i32, !dbg !885
  %331 = shl nuw i32 %330, 24, !dbg !885
  %332 = zext i8 %316 to i32, !dbg !885
  %333 = shl nuw nsw i32 %332, 16, !dbg !885
  %334 = or disjoint i32 %331, %333, !dbg !885
  %335 = zext i8 %318 to i32, !dbg !885
  %336 = shl nuw nsw i32 %335, 8, !dbg !885
  %337 = or disjoint i32 %334, %336, !dbg !885
  %338 = zext i8 %319 to i32, !dbg !885
  %339 = or disjoint i32 %337, %338, !dbg !885
    #dbg_value(i32 %339, !327, !DIExpression(), !879)
    #dbg_value(i32 %339, !331, !DIExpression(), !879)
  %340 = udiv i32 %329, %300, !dbg !885
    #dbg_value(i32 %340, !337, !DIExpression(), !879)
    #dbg_value(i32 %340, !338, !DIExpression(), !879)
    #dbg_value(i32 %339, !339, !DIExpression(), !879)
    #dbg_value(i32 %300, !340, !DIExpression(), !879)
  %341 = urem i32 %339, %300, !dbg !886
    #dbg_value(i32 %341, !341, !DIExpression(), !879)
  %342 = add i32 %341, %340
  br label %343

343:                                              ; preds = %262, %302
  %344 = phi i32 [ %342, %302 ], [ 0, %262 ], !dbg !887
    #dbg_value(i32 poison, !341, !DIExpression(), !879)
    #dbg_value(i32 %344, !342, !DIExpression(), !879)
  %345 = add i32 %344, %290, !dbg !888
    #dbg_value(i32 %345, !703, !DIExpression(), !867)
    #dbg_value(i32 1, !55, !DIExpression(), !889)
    #dbg_value(i32 4, !56, !DIExpression(), !889)
  %346 = load i32, ptr @ink_top, align 4
  %347 = icmp ugt i32 %346, -8
  br i1 %347, label %348, label %349, !dbg !891

348:                                              ; preds = %343
  tail call void @llvm.trap(), !dbg !892
  unreachable, !dbg !894

349:                                              ; preds = %343
  %350 = icmp eq i32 %346, 0, !dbg !895
  %351 = add nuw i32 %346, 7, !dbg !896
  %352 = select i1 %350, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %351, !dbg !897
  %353 = and i32 %352, -8, !dbg !898
    #dbg_value(i32 %353, !57, !DIExpression(), !889)
    #dbg_value(i32 4, !58, !DIExpression(), !889)
  %354 = or disjoint i32 %353, 4, !dbg !899
  store i32 %354, ptr @ink_top, align 4, !dbg !900, !tbaa !27
  %355 = add i32 %353, 65539, !dbg !901
  %356 = lshr i32 %355, 16, !dbg !902
    #dbg_value(i32 %356, !59, !DIExpression(), !889)
  %357 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !903
    #dbg_value(i32 %357, !60, !DIExpression(), !889)
  %358 = icmp ugt i32 %356, %357, !dbg !904
  br i1 %358, label %359, label %845, !dbg !905

359:                                              ; preds = %349
  %360 = sub nuw nsw i32 %356, %357, !dbg !906
  %361 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %360), !dbg !907
  %362 = icmp eq i32 %361, -1, !dbg !908
  br i1 %362, label %363, label %845, !dbg !905

363:                                              ; preds = %359
  tail call void @llvm.trap(), !dbg !909
  unreachable, !dbg !911

364:                                              ; preds = %5
    #dbg_value(ptr undef, !110, !DIExpression(), !752)
    #dbg_value(ptr poison, !115, !DIExpression(), !752)
    #dbg_value(i32 4, !116, !DIExpression(), !752)
    #dbg_value(ptr undef, !117, !DIExpression(), !752)
    #dbg_value(ptr poison, !119, !DIExpression(), !752)
    #dbg_value(i8 poison, !705, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !912)
    #dbg_value(i8 poison, !705, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !912)
    #dbg_value(i8 poison, !705, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !912)
    #dbg_value(i8 poison, !705, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !912)
    #dbg_value(i32 4, !122, !DIExpression(), !913)
    #dbg_value(ptr undef, !110, !DIExpression(), !754)
    #dbg_value(ptr poison, !115, !DIExpression(), !754)
    #dbg_value(i32 4, !116, !DIExpression(), !754)
    #dbg_value(ptr undef, !117, !DIExpression(), !754)
    #dbg_value(ptr poison, !119, !DIExpression(), !754)
    #dbg_value(i8 poison, !707, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !912)
    #dbg_value(i8 poison, !707, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !912)
    #dbg_value(i8 poison, !707, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !912)
    #dbg_value(i8 poison, !707, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !912)
    #dbg_value(i32 4, !122, !DIExpression(), !914)
  %365 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !915
  %366 = load ptr, ptr %365, align 4, !dbg !915, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !756)
    #dbg_value(ptr %366, !115, !DIExpression(), !756)
    #dbg_value(i32 4, !116, !DIExpression(), !756)
    #dbg_value(ptr undef, !117, !DIExpression(), !756)
    #dbg_value(ptr %366, !119, !DIExpression(), !756)
    #dbg_value(i32 0, !122, !DIExpression(), !916)
  %367 = load i8, ptr %366, align 1, !dbg !917, !tbaa !132
    #dbg_value(i8 %367, !708, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !912)
    #dbg_value(i32 1, !122, !DIExpression(), !916)
  %368 = getelementptr inbounds nuw i8, ptr %366, i32 1, !dbg !917
  %369 = load i8, ptr %368, align 1, !dbg !917, !tbaa !132
    #dbg_value(i8 %369, !708, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !912)
    #dbg_value(i32 2, !122, !DIExpression(), !916)
  %370 = getelementptr inbounds nuw i8, ptr %366, i32 2, !dbg !917
  %371 = load i8, ptr %370, align 1, !dbg !917, !tbaa !132
    #dbg_value(i8 %371, !708, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !912)
    #dbg_value(i32 3, !122, !DIExpression(), !916)
  %372 = getelementptr inbounds nuw i8, ptr %366, i32 3, !dbg !917
  %373 = load i8, ptr %372, align 1, !dbg !917, !tbaa !132
    #dbg_value(i8 %373, !708, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !912)
    #dbg_value(i32 4, !122, !DIExpression(), !916)
  %374 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !918
  %375 = load ptr, ptr %374, align 4, !dbg !918, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !758)
    #dbg_value(ptr %375, !115, !DIExpression(), !758)
    #dbg_value(i32 4, !116, !DIExpression(), !758)
    #dbg_value(ptr undef, !117, !DIExpression(), !758)
    #dbg_value(ptr %375, !119, !DIExpression(), !758)
    #dbg_value(i32 0, !122, !DIExpression(), !919)
  %376 = load i8, ptr %375, align 1, !dbg !920, !tbaa !132
    #dbg_value(i8 %376, !709, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !912)
    #dbg_value(i32 1, !122, !DIExpression(), !919)
  %377 = getelementptr inbounds nuw i8, ptr %375, i32 1, !dbg !920
  %378 = load i8, ptr %377, align 1, !dbg !920, !tbaa !132
    #dbg_value(i8 %378, !709, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !912)
    #dbg_value(i32 2, !122, !DIExpression(), !919)
  %379 = getelementptr inbounds nuw i8, ptr %375, i32 2, !dbg !920
  %380 = load i8, ptr %379, align 1, !dbg !920, !tbaa !132
    #dbg_value(i8 %380, !709, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !912)
    #dbg_value(i32 3, !122, !DIExpression(), !919)
  %381 = getelementptr inbounds nuw i8, ptr %375, i32 3, !dbg !920
  %382 = load i8, ptr %381, align 1, !dbg !920, !tbaa !132
    #dbg_value(i8 %382, !709, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !912)
    #dbg_value(i32 4, !122, !DIExpression(), !919)
  %383 = zext i8 %373 to i32, !dbg !921
  %384 = shl nuw i32 %383, 24, !dbg !921
  %385 = zext i8 %371 to i32, !dbg !921
  %386 = shl nuw nsw i32 %385, 16, !dbg !921
  %387 = or disjoint i32 %384, %386, !dbg !921
  %388 = zext i8 %369 to i32, !dbg !921
  %389 = shl nuw nsw i32 %388, 8, !dbg !921
  %390 = or disjoint i32 %387, %389, !dbg !921
  %391 = zext i8 %367 to i32, !dbg !921
  %392 = or disjoint i32 %390, %391, !dbg !921
  %393 = zext i8 %382 to i32, !dbg !922
  %394 = shl nuw i32 %393, 24, !dbg !922
  %395 = zext i8 %380 to i32, !dbg !922
  %396 = shl nuw nsw i32 %395, 16, !dbg !922
  %397 = or disjoint i32 %394, %396, !dbg !922
  %398 = zext i8 %378 to i32, !dbg !922
  %399 = shl nuw nsw i32 %398, 8, !dbg !922
  %400 = or disjoint i32 %397, %399, !dbg !922
  %401 = zext i8 %376 to i32, !dbg !922
  %402 = or disjoint i32 %400, %401, !dbg !922
    #dbg_value(i32 poison, !356, !DIExpression(), !924)
    #dbg_value(i32 poison, !357, !DIExpression(), !924)
    #dbg_value(i32 %392, !358, !DIExpression(), !924)
    #dbg_value(i32 %402, !359, !DIExpression(), !924)
    #dbg_value(i32 poison, !360, !DIExpression(), !924)
    #dbg_value(i32 %402, !361, !DIExpression(), !924)
  %403 = icmp eq i32 %402, 0, !dbg !922
  br i1 %403, label %445, label %404, !dbg !922

404:                                              ; preds = %364
  %405 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !925
  %406 = load ptr, ptr %405, align 4, !dbg !925, !tbaa !634
    #dbg_value(ptr %406, !115, !DIExpression(), !754)
    #dbg_value(ptr %406, !119, !DIExpression(), !754)
  %407 = getelementptr inbounds nuw i8, ptr %406, i32 3, !dbg !926
  %408 = load i8, ptr %407, align 1, !dbg !926, !tbaa !132
    #dbg_value(i8 %408, !707, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !912)
  %409 = getelementptr inbounds nuw i8, ptr %406, i32 2, !dbg !926
  %410 = load i8, ptr %409, align 1, !dbg !926, !tbaa !132
    #dbg_value(i8 %410, !707, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !912)
  %411 = getelementptr inbounds nuw i8, ptr %406, i32 1, !dbg !926
  %412 = load i8, ptr %411, align 1, !dbg !926, !tbaa !132
    #dbg_value(i8 %412, !707, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !912)
  %413 = load i8, ptr %406, align 1, !dbg !926, !tbaa !132
    #dbg_value(i8 %413, !707, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !912)
  %414 = load ptr, ptr %1, align 4, !dbg !927, !tbaa !634
    #dbg_value(ptr %414, !115, !DIExpression(), !752)
    #dbg_value(ptr %414, !119, !DIExpression(), !752)
  %415 = getelementptr inbounds nuw i8, ptr %414, i32 3, !dbg !928
  %416 = load i8, ptr %415, align 1, !dbg !928, !tbaa !132
    #dbg_value(i8 %416, !705, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !912)
  %417 = getelementptr inbounds nuw i8, ptr %414, i32 2, !dbg !928
  %418 = load i8, ptr %417, align 1, !dbg !928, !tbaa !132
    #dbg_value(i8 %418, !705, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !912)
  %419 = getelementptr inbounds nuw i8, ptr %414, i32 1, !dbg !928
  %420 = load i8, ptr %419, align 1, !dbg !928, !tbaa !132
    #dbg_value(i8 %420, !705, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !912)
  %421 = load i8, ptr %414, align 1, !dbg !928, !tbaa !132
    #dbg_value(i8 %421, !705, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !912)
  %422 = zext i8 %408 to i32, !dbg !929
  %423 = shl nuw i32 %422, 24, !dbg !929
  %424 = zext i8 %410 to i32, !dbg !929
  %425 = shl nuw nsw i32 %424, 16, !dbg !929
  %426 = or disjoint i32 %423, %425, !dbg !929
  %427 = zext i8 %412 to i32, !dbg !929
  %428 = shl nuw nsw i32 %427, 8, !dbg !929
  %429 = or disjoint i32 %426, %428, !dbg !929
  %430 = zext i8 %413 to i32, !dbg !929
  %431 = or disjoint i32 %429, %430, !dbg !929
    #dbg_value(i32 %431, !357, !DIExpression(), !924)
    #dbg_value(i32 %431, !360, !DIExpression(), !924)
  %432 = zext i8 %416 to i32, !dbg !930
  %433 = shl nuw i32 %432, 24, !dbg !930
  %434 = zext i8 %418 to i32, !dbg !930
  %435 = shl nuw nsw i32 %434, 16, !dbg !930
  %436 = or disjoint i32 %433, %435, !dbg !930
  %437 = zext i8 %420 to i32, !dbg !930
  %438 = shl nuw nsw i32 %437, 8, !dbg !930
  %439 = or disjoint i32 %436, %438, !dbg !930
  %440 = zext i8 %421 to i32, !dbg !930
  %441 = or disjoint i32 %439, %440, !dbg !930
    #dbg_value(i32 %441, !356, !DIExpression(), !924)
  %442 = udiv i32 %431, %402, !dbg !930
    #dbg_value(i32 %442, !362, !DIExpression(), !924)
    #dbg_value(i32 %442, !363, !DIExpression(), !924)
    #dbg_value(i32 %441, !364, !DIExpression(), !924)
    #dbg_value(i32 %402, !365, !DIExpression(), !924)
  %443 = urem i32 %441, %402, !dbg !931
    #dbg_value(i32 %443, !366, !DIExpression(), !924)
  %444 = add i32 %443, %442
  br label %445

445:                                              ; preds = %364, %404
  %446 = phi i32 [ %444, %404 ], [ 0, %364 ], !dbg !932
    #dbg_value(i32 poison, !366, !DIExpression(), !924)
    #dbg_value(i32 %446, !367, !DIExpression(), !924)
  %447 = add i32 %446, %392, !dbg !933
    #dbg_value(i32 %447, !710, !DIExpression(), !912)
    #dbg_value(i32 1, !55, !DIExpression(), !934)
    #dbg_value(i32 4, !56, !DIExpression(), !934)
  %448 = load i32, ptr @ink_top, align 4
  %449 = icmp ugt i32 %448, -8
  br i1 %449, label %450, label %451, !dbg !936

450:                                              ; preds = %445
  tail call void @llvm.trap(), !dbg !937
  unreachable, !dbg !939

451:                                              ; preds = %445
  %452 = icmp eq i32 %448, 0, !dbg !940
  %453 = add nuw i32 %448, 7, !dbg !941
  %454 = select i1 %452, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %453, !dbg !942
  %455 = and i32 %454, -8, !dbg !943
    #dbg_value(i32 %455, !57, !DIExpression(), !934)
    #dbg_value(i32 4, !58, !DIExpression(), !934)
  %456 = or disjoint i32 %455, 4, !dbg !944
  store i32 %456, ptr @ink_top, align 4, !dbg !945, !tbaa !27
  %457 = add i32 %455, 65539, !dbg !946
  %458 = lshr i32 %457, 16, !dbg !947
    #dbg_value(i32 %458, !59, !DIExpression(), !934)
  %459 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !948
    #dbg_value(i32 %459, !60, !DIExpression(), !934)
  %460 = icmp ugt i32 %458, %459, !dbg !949
  br i1 %460, label %461, label %845, !dbg !950

461:                                              ; preds = %451
  %462 = sub nuw nsw i32 %458, %459, !dbg !951
  %463 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %462), !dbg !952
  %464 = icmp eq i32 %463, -1, !dbg !953
  br i1 %464, label %465, label %845, !dbg !950

465:                                              ; preds = %461
  tail call void @llvm.trap(), !dbg !954
  unreachable, !dbg !956

466:                                              ; preds = %5
  %467 = load ptr, ptr %1, align 4, !dbg !957, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !760)
    #dbg_value(ptr %467, !115, !DIExpression(), !760)
    #dbg_value(i32 4, !116, !DIExpression(), !760)
    #dbg_value(ptr undef, !117, !DIExpression(), !760)
    #dbg_value(ptr %467, !119, !DIExpression(), !760)
    #dbg_value(i32 0, !122, !DIExpression(), !958)
  %468 = load i8, ptr %467, align 1, !dbg !959, !tbaa !132
    #dbg_value(i8 %468, !712, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !960)
    #dbg_value(i32 1, !122, !DIExpression(), !958)
  %469 = getelementptr inbounds nuw i8, ptr %467, i32 1, !dbg !959
  %470 = load i8, ptr %469, align 1, !dbg !959, !tbaa !132
    #dbg_value(i8 %470, !712, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !960)
    #dbg_value(i32 2, !122, !DIExpression(), !958)
  %471 = getelementptr inbounds nuw i8, ptr %467, i32 2, !dbg !959
  %472 = load i8, ptr %471, align 1, !dbg !959, !tbaa !132
    #dbg_value(i8 %472, !712, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !960)
    #dbg_value(i32 3, !122, !DIExpression(), !958)
  %473 = getelementptr inbounds nuw i8, ptr %467, i32 3, !dbg !959
  %474 = load i8, ptr %473, align 1, !dbg !959, !tbaa !132
    #dbg_value(i8 %474, !712, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !960)
    #dbg_value(i32 4, !122, !DIExpression(), !958)
  %475 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !961
  %476 = load ptr, ptr %475, align 4, !dbg !961, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !762)
    #dbg_value(ptr %476, !115, !DIExpression(), !762)
    #dbg_value(i32 4, !116, !DIExpression(), !762)
    #dbg_value(ptr undef, !117, !DIExpression(), !762)
    #dbg_value(ptr %476, !119, !DIExpression(), !762)
    #dbg_value(i32 0, !122, !DIExpression(), !962)
  %477 = load i8, ptr %476, align 1, !dbg !963, !tbaa !132
    #dbg_value(i8 %477, !714, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !960)
    #dbg_value(i32 1, !122, !DIExpression(), !962)
  %478 = getelementptr inbounds nuw i8, ptr %476, i32 1, !dbg !963
  %479 = load i8, ptr %478, align 1, !dbg !963, !tbaa !132
    #dbg_value(i8 %479, !714, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !960)
    #dbg_value(i32 2, !122, !DIExpression(), !962)
  %480 = getelementptr inbounds nuw i8, ptr %476, i32 2, !dbg !963
  %481 = load i8, ptr %480, align 1, !dbg !963, !tbaa !132
    #dbg_value(i8 %481, !714, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !960)
    #dbg_value(i32 3, !122, !DIExpression(), !962)
  %482 = getelementptr inbounds nuw i8, ptr %476, i32 3, !dbg !963
  %483 = load i8, ptr %482, align 1, !dbg !963, !tbaa !132
    #dbg_value(i8 %483, !714, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !960)
    #dbg_value(i32 4, !122, !DIExpression(), !962)
  %484 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !964
  %485 = load ptr, ptr %484, align 4, !dbg !964, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !764)
    #dbg_value(ptr %485, !115, !DIExpression(), !764)
    #dbg_value(i32 4, !116, !DIExpression(), !764)
    #dbg_value(ptr undef, !117, !DIExpression(), !764)
    #dbg_value(ptr %485, !119, !DIExpression(), !764)
    #dbg_value(i32 0, !122, !DIExpression(), !965)
  %486 = load i8, ptr %485, align 1, !dbg !966, !tbaa !132
    #dbg_value(i8 %486, !715, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !960)
    #dbg_value(i32 1, !122, !DIExpression(), !965)
  %487 = getelementptr inbounds nuw i8, ptr %485, i32 1, !dbg !966
  %488 = load i8, ptr %487, align 1, !dbg !966, !tbaa !132
    #dbg_value(i8 %488, !715, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !960)
    #dbg_value(i32 2, !122, !DIExpression(), !965)
  %489 = getelementptr inbounds nuw i8, ptr %485, i32 2, !dbg !966
  %490 = load i8, ptr %489, align 1, !dbg !966, !tbaa !132
    #dbg_value(i8 %490, !715, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !960)
    #dbg_value(i32 3, !122, !DIExpression(), !965)
  %491 = getelementptr inbounds nuw i8, ptr %485, i32 3, !dbg !966
  %492 = load i8, ptr %491, align 1, !dbg !966, !tbaa !132
    #dbg_value(i8 %492, !715, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !960)
    #dbg_value(i32 4, !122, !DIExpression(), !965)
  %493 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !967
  %494 = load ptr, ptr %493, align 4, !dbg !967, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !766)
    #dbg_value(ptr %494, !115, !DIExpression(), !766)
    #dbg_value(i32 4, !116, !DIExpression(), !766)
    #dbg_value(ptr undef, !117, !DIExpression(), !766)
    #dbg_value(ptr %494, !119, !DIExpression(), !766)
    #dbg_value(i32 0, !122, !DIExpression(), !968)
  %495 = load i8, ptr %494, align 1, !dbg !969, !tbaa !132
    #dbg_value(i8 %495, !716, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !960)
    #dbg_value(i32 1, !122, !DIExpression(), !968)
  %496 = getelementptr inbounds nuw i8, ptr %494, i32 1, !dbg !969
  %497 = load i8, ptr %496, align 1, !dbg !969, !tbaa !132
    #dbg_value(i8 %497, !716, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !960)
    #dbg_value(i32 2, !122, !DIExpression(), !968)
  %498 = getelementptr inbounds nuw i8, ptr %494, i32 2, !dbg !969
  %499 = load i8, ptr %498, align 1, !dbg !969, !tbaa !132
    #dbg_value(i8 %499, !716, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !960)
    #dbg_value(i32 3, !122, !DIExpression(), !968)
  %500 = getelementptr inbounds nuw i8, ptr %494, i32 3, !dbg !969
  %501 = load i8, ptr %500, align 1, !dbg !969, !tbaa !132
    #dbg_value(i8 %501, !716, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !960)
    #dbg_value(i32 4, !122, !DIExpression(), !968)
  %502 = zext i8 %474 to i32, !dbg !970
  %503 = shl nuw i32 %502, 24, !dbg !970
  %504 = zext i8 %472 to i32, !dbg !970
  %505 = shl nuw nsw i32 %504, 16, !dbg !970
  %506 = or disjoint i32 %503, %505, !dbg !970
  %507 = zext i8 %470 to i32, !dbg !970
  %508 = shl nuw nsw i32 %507, 8, !dbg !970
  %509 = or disjoint i32 %506, %508, !dbg !970
  %510 = zext i8 %468 to i32, !dbg !970
  %511 = or disjoint i32 %509, %510, !dbg !970
  %512 = zext i8 %483 to i32, !dbg !971
  %513 = shl nuw i32 %512, 24, !dbg !971
  %514 = zext i8 %481 to i32, !dbg !971
  %515 = shl nuw nsw i32 %514, 16, !dbg !971
  %516 = or disjoint i32 %513, %515, !dbg !971
  %517 = zext i8 %479 to i32, !dbg !971
  %518 = shl nuw nsw i32 %517, 8, !dbg !971
  %519 = or disjoint i32 %516, %518, !dbg !971
  %520 = zext i8 %477 to i32, !dbg !971
  %521 = or disjoint i32 %519, %520, !dbg !971
  %522 = zext i8 %492 to i32, !dbg !972
  %523 = shl nuw i32 %522, 24, !dbg !972
  %524 = zext i8 %490 to i32, !dbg !972
  %525 = shl nuw nsw i32 %524, 16, !dbg !972
  %526 = or disjoint i32 %523, %525, !dbg !972
  %527 = zext i8 %488 to i32, !dbg !972
  %528 = shl nuw nsw i32 %527, 8, !dbg !972
  %529 = or disjoint i32 %526, %528, !dbg !972
  %530 = zext i8 %486 to i32, !dbg !972
  %531 = or disjoint i32 %529, %530, !dbg !972
  %532 = zext i8 %501 to i32, !dbg !973
  %533 = shl nuw i32 %532, 24, !dbg !973
  %534 = zext i8 %499 to i32, !dbg !973
  %535 = shl nuw nsw i32 %534, 16, !dbg !973
  %536 = or disjoint i32 %533, %535, !dbg !973
  %537 = zext i8 %497 to i32, !dbg !973
  %538 = shl nuw nsw i32 %537, 8, !dbg !973
  %539 = or disjoint i32 %536, %538, !dbg !973
  %540 = zext i8 %495 to i32, !dbg !973
  %541 = or disjoint i32 %539, %540, !dbg !973
    #dbg_value(i32 %511, !381, !DIExpression(), !975)
    #dbg_value(i32 %521, !382, !DIExpression(), !975)
    #dbg_value(i32 %531, !383, !DIExpression(), !975)
    #dbg_value(i32 %541, !384, !DIExpression(), !975)
    #dbg_value(i32 %511, !385, !DIExpression(), !975)
    #dbg_value(i32 %521, !386, !DIExpression(), !975)
    #dbg_value(i32 %531, !387, !DIExpression(), !975)
    #dbg_value(i32 %541, !388, !DIExpression(), !975)
    #dbg_value(i32 %511, !389, !DIExpression(), !975)
  %542 = icmp ult i32 %511, %531, !dbg !973
  %543 = add i32 %541, %521, !dbg !976
  %544 = mul i32 %521, 3, !dbg !976
  %545 = select i1 %542, i32 %543, i32 %544, !dbg !976
    #dbg_value(i32 %545, !390, !DIExpression(), !975)
    #dbg_value(i32 %545, !717, !DIExpression(), !960)
    #dbg_value(i32 1, !55, !DIExpression(), !977)
    #dbg_value(i32 4, !56, !DIExpression(), !977)
  %546 = load i32, ptr @ink_top, align 4
  %547 = icmp ugt i32 %546, -8
  br i1 %547, label %548, label %549, !dbg !979

548:                                              ; preds = %466
  tail call void @llvm.trap(), !dbg !980
  unreachable, !dbg !982

549:                                              ; preds = %466
  %550 = icmp eq i32 %546, 0, !dbg !983
  %551 = add nuw i32 %546, 7, !dbg !984
  %552 = select i1 %550, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %551, !dbg !985
  %553 = and i32 %552, -8, !dbg !986
    #dbg_value(i32 %553, !57, !DIExpression(), !977)
    #dbg_value(i32 4, !58, !DIExpression(), !977)
  %554 = or disjoint i32 %553, 4, !dbg !987
  store i32 %554, ptr @ink_top, align 4, !dbg !988, !tbaa !27
  %555 = add i32 %553, 65539, !dbg !989
  %556 = lshr i32 %555, 16, !dbg !990
    #dbg_value(i32 %556, !59, !DIExpression(), !977)
  %557 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !991
    #dbg_value(i32 %557, !60, !DIExpression(), !977)
  %558 = icmp ugt i32 %556, %557, !dbg !992
  br i1 %558, label %559, label %845, !dbg !993

559:                                              ; preds = %549
  %560 = sub nuw nsw i32 %556, %557, !dbg !994
  %561 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %560), !dbg !995
  %562 = icmp eq i32 %561, -1, !dbg !996
  br i1 %562, label %563, label %845, !dbg !993

563:                                              ; preds = %559
  tail call void @llvm.trap(), !dbg !997
  unreachable, !dbg !999

564:                                              ; preds = %5
  %565 = load ptr, ptr %1, align 4, !dbg !1000, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !768)
    #dbg_value(ptr %565, !115, !DIExpression(), !768)
    #dbg_value(i32 4, !116, !DIExpression(), !768)
    #dbg_value(ptr undef, !117, !DIExpression(), !768)
    #dbg_value(ptr %565, !119, !DIExpression(), !768)
    #dbg_value(i32 0, !122, !DIExpression(), !1001)
  %566 = load i8, ptr %565, align 1, !dbg !1002, !tbaa !132
    #dbg_value(i8 %566, !719, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1003)
    #dbg_value(i32 1, !122, !DIExpression(), !1001)
  %567 = getelementptr inbounds nuw i8, ptr %565, i32 1, !dbg !1002
  %568 = load i8, ptr %567, align 1, !dbg !1002, !tbaa !132
    #dbg_value(i8 %568, !719, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1003)
    #dbg_value(i32 2, !122, !DIExpression(), !1001)
  %569 = getelementptr inbounds nuw i8, ptr %565, i32 2, !dbg !1002
  %570 = load i8, ptr %569, align 1, !dbg !1002, !tbaa !132
    #dbg_value(i8 %570, !719, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1003)
    #dbg_value(i32 3, !122, !DIExpression(), !1001)
  %571 = getelementptr inbounds nuw i8, ptr %565, i32 3, !dbg !1002
  %572 = load i8, ptr %571, align 1, !dbg !1002, !tbaa !132
    #dbg_value(i8 %572, !719, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1003)
    #dbg_value(i32 4, !122, !DIExpression(), !1001)
  %573 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1004
  %574 = load ptr, ptr %573, align 4, !dbg !1004, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !770)
    #dbg_value(ptr %574, !115, !DIExpression(), !770)
    #dbg_value(i32 4, !116, !DIExpression(), !770)
    #dbg_value(ptr undef, !117, !DIExpression(), !770)
    #dbg_value(ptr %574, !119, !DIExpression(), !770)
    #dbg_value(i32 0, !122, !DIExpression(), !1005)
  %575 = load i8, ptr %574, align 1, !dbg !1006, !tbaa !132
    #dbg_value(i8 %575, !721, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1003)
    #dbg_value(i32 1, !122, !DIExpression(), !1005)
  %576 = getelementptr inbounds nuw i8, ptr %574, i32 1, !dbg !1006
  %577 = load i8, ptr %576, align 1, !dbg !1006, !tbaa !132
    #dbg_value(i8 %577, !721, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1003)
    #dbg_value(i32 2, !122, !DIExpression(), !1005)
  %578 = getelementptr inbounds nuw i8, ptr %574, i32 2, !dbg !1006
  %579 = load i8, ptr %578, align 1, !dbg !1006, !tbaa !132
    #dbg_value(i8 %579, !721, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1003)
    #dbg_value(i32 3, !122, !DIExpression(), !1005)
  %580 = getelementptr inbounds nuw i8, ptr %574, i32 3, !dbg !1006
  %581 = load i8, ptr %580, align 1, !dbg !1006, !tbaa !132
    #dbg_value(i8 %581, !721, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1003)
    #dbg_value(i32 4, !122, !DIExpression(), !1005)
  %582 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1007
  %583 = load ptr, ptr %582, align 4, !dbg !1007, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !772)
    #dbg_value(ptr %583, !115, !DIExpression(), !772)
    #dbg_value(i32 4, !116, !DIExpression(), !772)
    #dbg_value(ptr undef, !117, !DIExpression(), !772)
    #dbg_value(ptr %583, !119, !DIExpression(), !772)
    #dbg_value(i32 0, !122, !DIExpression(), !1008)
  %584 = load i8, ptr %583, align 1, !dbg !1009, !tbaa !132
    #dbg_value(i8 %584, !722, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1003)
    #dbg_value(i32 1, !122, !DIExpression(), !1008)
  %585 = getelementptr inbounds nuw i8, ptr %583, i32 1, !dbg !1009
  %586 = load i8, ptr %585, align 1, !dbg !1009, !tbaa !132
    #dbg_value(i8 %586, !722, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1003)
    #dbg_value(i32 2, !122, !DIExpression(), !1008)
  %587 = getelementptr inbounds nuw i8, ptr %583, i32 2, !dbg !1009
  %588 = load i8, ptr %587, align 1, !dbg !1009, !tbaa !132
    #dbg_value(i8 %588, !722, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1003)
    #dbg_value(i32 3, !122, !DIExpression(), !1008)
  %589 = getelementptr inbounds nuw i8, ptr %583, i32 3, !dbg !1009
  %590 = load i8, ptr %589, align 1, !dbg !1009, !tbaa !132
    #dbg_value(i8 %590, !722, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1003)
    #dbg_value(i32 4, !122, !DIExpression(), !1008)
  %591 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1010
  %592 = load ptr, ptr %591, align 4, !dbg !1010, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !774)
    #dbg_value(ptr %592, !115, !DIExpression(), !774)
    #dbg_value(i32 4, !116, !DIExpression(), !774)
    #dbg_value(ptr undef, !117, !DIExpression(), !774)
    #dbg_value(ptr %592, !119, !DIExpression(), !774)
    #dbg_value(i32 0, !122, !DIExpression(), !1011)
  %593 = load i8, ptr %592, align 1, !dbg !1012, !tbaa !132
    #dbg_value(i8 %593, !723, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1003)
    #dbg_value(i32 1, !122, !DIExpression(), !1011)
  %594 = getelementptr inbounds nuw i8, ptr %592, i32 1, !dbg !1012
  %595 = load i8, ptr %594, align 1, !dbg !1012, !tbaa !132
    #dbg_value(i8 %595, !723, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1003)
    #dbg_value(i32 2, !122, !DIExpression(), !1011)
  %596 = getelementptr inbounds nuw i8, ptr %592, i32 2, !dbg !1012
  %597 = load i8, ptr %596, align 1, !dbg !1012, !tbaa !132
    #dbg_value(i8 %597, !723, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1003)
    #dbg_value(i32 3, !122, !DIExpression(), !1011)
  %598 = getelementptr inbounds nuw i8, ptr %592, i32 3, !dbg !1012
  %599 = load i8, ptr %598, align 1, !dbg !1012, !tbaa !132
    #dbg_value(i8 %599, !723, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1003)
    #dbg_value(i32 4, !122, !DIExpression(), !1011)
  %600 = zext i8 %572 to i32, !dbg !1013
  %601 = shl nuw i32 %600, 24, !dbg !1013
  %602 = zext i8 %570 to i32, !dbg !1013
  %603 = shl nuw nsw i32 %602, 16, !dbg !1013
  %604 = or disjoint i32 %601, %603, !dbg !1013
  %605 = zext i8 %568 to i32, !dbg !1013
  %606 = shl nuw nsw i32 %605, 8, !dbg !1013
  %607 = or disjoint i32 %604, %606, !dbg !1013
  %608 = zext i8 %566 to i32, !dbg !1013
  %609 = or disjoint i32 %607, %608, !dbg !1013
  %610 = zext i8 %581 to i32, !dbg !1014
  %611 = shl nuw i32 %610, 24, !dbg !1014
  %612 = zext i8 %579 to i32, !dbg !1014
  %613 = shl nuw nsw i32 %612, 16, !dbg !1014
  %614 = or disjoint i32 %611, %613, !dbg !1014
  %615 = zext i8 %577 to i32, !dbg !1014
  %616 = shl nuw nsw i32 %615, 8, !dbg !1014
  %617 = or disjoint i32 %614, %616, !dbg !1014
  %618 = zext i8 %575 to i32, !dbg !1014
  %619 = or disjoint i32 %617, %618, !dbg !1014
  %620 = zext i8 %590 to i32, !dbg !1015
  %621 = shl nuw i32 %620, 24, !dbg !1015
  %622 = zext i8 %588 to i32, !dbg !1015
  %623 = shl nuw nsw i32 %622, 16, !dbg !1015
  %624 = or disjoint i32 %621, %623, !dbg !1015
  %625 = zext i8 %586 to i32, !dbg !1015
  %626 = shl nuw nsw i32 %625, 8, !dbg !1015
  %627 = or disjoint i32 %624, %626, !dbg !1015
  %628 = zext i8 %584 to i32, !dbg !1015
  %629 = or disjoint i32 %627, %628, !dbg !1015
  %630 = zext i8 %599 to i32, !dbg !1016
  %631 = shl nuw i32 %630, 24, !dbg !1016
  %632 = zext i8 %597 to i32, !dbg !1016
  %633 = shl nuw nsw i32 %632, 16, !dbg !1016
  %634 = or disjoint i32 %631, %633, !dbg !1016
  %635 = zext i8 %595 to i32, !dbg !1016
  %636 = shl nuw nsw i32 %635, 8, !dbg !1016
  %637 = or disjoint i32 %634, %636, !dbg !1016
  %638 = zext i8 %593 to i32, !dbg !1016
  %639 = or disjoint i32 %637, %638, !dbg !1016
    #dbg_value(i32 %609, !402, !DIExpression(), !1018)
    #dbg_value(i32 %619, !403, !DIExpression(), !1018)
    #dbg_value(i32 %629, !404, !DIExpression(), !1018)
    #dbg_value(i32 %639, !405, !DIExpression(), !1018)
    #dbg_value(i32 %609, !406, !DIExpression(), !1018)
  %640 = icmp ult i32 %609, %629, !dbg !1016
  %641 = add i32 %639, %619, !dbg !1019
  %642 = mul i32 %619, 3, !dbg !1019
  %643 = select i1 %640, i32 %641, i32 %642, !dbg !1019
    #dbg_value(i32 %643, !407, !DIExpression(), !1018)
    #dbg_value(i32 %643, !724, !DIExpression(), !1003)
    #dbg_value(i32 1, !55, !DIExpression(), !1020)
    #dbg_value(i32 4, !56, !DIExpression(), !1020)
  %644 = load i32, ptr @ink_top, align 4
  %645 = icmp ugt i32 %644, -8
  br i1 %645, label %646, label %647, !dbg !1022

646:                                              ; preds = %564
  tail call void @llvm.trap(), !dbg !1023
  unreachable, !dbg !1025

647:                                              ; preds = %564
  %648 = icmp eq i32 %644, 0, !dbg !1026
  %649 = add nuw i32 %644, 7, !dbg !1027
  %650 = select i1 %648, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %649, !dbg !1028
  %651 = and i32 %650, -8, !dbg !1029
    #dbg_value(i32 %651, !57, !DIExpression(), !1020)
    #dbg_value(i32 4, !58, !DIExpression(), !1020)
  %652 = or disjoint i32 %651, 4, !dbg !1030
  store i32 %652, ptr @ink_top, align 4, !dbg !1031, !tbaa !27
  %653 = add i32 %651, 65539, !dbg !1032
  %654 = lshr i32 %653, 16, !dbg !1033
    #dbg_value(i32 %654, !59, !DIExpression(), !1020)
  %655 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1034
    #dbg_value(i32 %655, !60, !DIExpression(), !1020)
  %656 = icmp ugt i32 %654, %655, !dbg !1035
  br i1 %656, label %657, label %845, !dbg !1036

657:                                              ; preds = %647
  %658 = sub nuw nsw i32 %654, %655, !dbg !1037
  %659 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %658), !dbg !1038
  %660 = icmp eq i32 %659, -1, !dbg !1039
  br i1 %660, label %661, label %845, !dbg !1036

661:                                              ; preds = %657
  tail call void @llvm.trap(), !dbg !1040
  unreachable, !dbg !1042

662:                                              ; preds = %5
  %663 = load ptr, ptr %1, align 4, !dbg !1043, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !776)
    #dbg_value(ptr %663, !115, !DIExpression(), !776)
    #dbg_value(i32 4, !116, !DIExpression(), !776)
    #dbg_value(ptr undef, !117, !DIExpression(), !776)
    #dbg_value(ptr %663, !119, !DIExpression(), !776)
    #dbg_value(i32 0, !122, !DIExpression(), !1044)
  %664 = load i8, ptr %663, align 1, !dbg !1045, !tbaa !132
    #dbg_value(i8 %664, !726, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1046)
    #dbg_value(i32 1, !122, !DIExpression(), !1044)
  %665 = getelementptr inbounds nuw i8, ptr %663, i32 1, !dbg !1045
  %666 = load i8, ptr %665, align 1, !dbg !1045, !tbaa !132
    #dbg_value(i8 %666, !726, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1046)
    #dbg_value(i32 2, !122, !DIExpression(), !1044)
  %667 = getelementptr inbounds nuw i8, ptr %663, i32 2, !dbg !1045
  %668 = load i8, ptr %667, align 1, !dbg !1045, !tbaa !132
    #dbg_value(i8 %668, !726, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1046)
    #dbg_value(i32 3, !122, !DIExpression(), !1044)
  %669 = getelementptr inbounds nuw i8, ptr %663, i32 3, !dbg !1045
  %670 = load i8, ptr %669, align 1, !dbg !1045, !tbaa !132
    #dbg_value(i8 %670, !726, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1046)
    #dbg_value(i32 4, !122, !DIExpression(), !1044)
  %671 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1047
  %672 = load ptr, ptr %671, align 4, !dbg !1047, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !778)
    #dbg_value(ptr %672, !115, !DIExpression(), !778)
    #dbg_value(i32 4, !116, !DIExpression(), !778)
    #dbg_value(ptr undef, !117, !DIExpression(), !778)
    #dbg_value(ptr %672, !119, !DIExpression(), !778)
    #dbg_value(i32 0, !122, !DIExpression(), !1048)
  %673 = load i8, ptr %672, align 1, !dbg !1049, !tbaa !132
    #dbg_value(i8 %673, !728, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1046)
    #dbg_value(i32 1, !122, !DIExpression(), !1048)
  %674 = getelementptr inbounds nuw i8, ptr %672, i32 1, !dbg !1049
  %675 = load i8, ptr %674, align 1, !dbg !1049, !tbaa !132
    #dbg_value(i8 %675, !728, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1046)
    #dbg_value(i32 2, !122, !DIExpression(), !1048)
  %676 = getelementptr inbounds nuw i8, ptr %672, i32 2, !dbg !1049
  %677 = load i8, ptr %676, align 1, !dbg !1049, !tbaa !132
    #dbg_value(i8 %677, !728, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1046)
    #dbg_value(i32 3, !122, !DIExpression(), !1048)
  %678 = getelementptr inbounds nuw i8, ptr %672, i32 3, !dbg !1049
  %679 = load i8, ptr %678, align 1, !dbg !1049, !tbaa !132
    #dbg_value(i8 %679, !728, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1046)
    #dbg_value(i32 4, !122, !DIExpression(), !1048)
    #dbg_value(i32 poison, !122, !DIExpression(), !1050)
  %680 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1052
  %681 = load ptr, ptr %680, align 4, !dbg !1052, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !780)
    #dbg_value(ptr %681, !115, !DIExpression(), !780)
    #dbg_value(i32 4, !116, !DIExpression(), !780)
    #dbg_value(ptr undef, !117, !DIExpression(), !780)
    #dbg_value(ptr %681, !119, !DIExpression(), !780)
    #dbg_value(i32 0, !122, !DIExpression(), !1053)
  %682 = load i8, ptr %681, align 1, !dbg !1054, !tbaa !132
    #dbg_value(i8 %682, !730, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1046)
    #dbg_value(i32 1, !122, !DIExpression(), !1053)
  %683 = getelementptr inbounds nuw i8, ptr %681, i32 1, !dbg !1054
  %684 = load i8, ptr %683, align 1, !dbg !1054, !tbaa !132
    #dbg_value(i8 %684, !730, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1046)
    #dbg_value(i32 2, !122, !DIExpression(), !1053)
  %685 = getelementptr inbounds nuw i8, ptr %681, i32 2, !dbg !1054
  %686 = load i8, ptr %685, align 1, !dbg !1054, !tbaa !132
    #dbg_value(i8 %686, !730, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1046)
    #dbg_value(i32 3, !122, !DIExpression(), !1053)
  %687 = getelementptr inbounds nuw i8, ptr %681, i32 3, !dbg !1054
  %688 = load i8, ptr %687, align 1, !dbg !1054, !tbaa !132
    #dbg_value(i8 %688, !730, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1046)
    #dbg_value(i32 4, !122, !DIExpression(), !1053)
  %689 = zext i8 %670 to i32, !dbg !1055
  %690 = shl nuw i32 %689, 24, !dbg !1055
  %691 = zext i8 %668 to i32, !dbg !1055
  %692 = shl nuw nsw i32 %691, 16, !dbg !1055
  %693 = or disjoint i32 %690, %692, !dbg !1055
  %694 = zext i8 %666 to i32, !dbg !1055
  %695 = shl nuw nsw i32 %694, 8, !dbg !1055
  %696 = or disjoint i32 %693, %695, !dbg !1055
  %697 = zext i8 %664 to i32, !dbg !1055
  %698 = or disjoint i32 %696, %697, !dbg !1055
  %699 = zext i8 %679 to i32, !dbg !1056
  %700 = shl nuw i32 %699, 24, !dbg !1056
  %701 = zext i8 %677 to i32, !dbg !1056
  %702 = shl nuw nsw i32 %701, 16, !dbg !1056
  %703 = or disjoint i32 %700, %702, !dbg !1056
  %704 = zext i8 %675 to i32, !dbg !1056
  %705 = shl nuw nsw i32 %704, 8, !dbg !1056
  %706 = or disjoint i32 %703, %705, !dbg !1056
  %707 = zext i8 %673 to i32, !dbg !1056
  %708 = or disjoint i32 %706, %707, !dbg !1056
  %709 = zext i8 %688 to i32, !dbg !1057
  %710 = shl nuw i32 %709, 24, !dbg !1057
  %711 = zext i8 %686 to i32, !dbg !1057
  %712 = shl nuw nsw i32 %711, 16, !dbg !1057
  %713 = or disjoint i32 %710, %712, !dbg !1057
  %714 = zext i8 %684 to i32, !dbg !1057
  %715 = shl nuw nsw i32 %714, 8, !dbg !1057
  %716 = or disjoint i32 %713, %715, !dbg !1057
  %717 = zext i8 %682 to i32, !dbg !1057
  %718 = or disjoint i32 %716, %717, !dbg !1057
    #dbg_value(i32 %698, !419, !DIExpression(), !1059)
    #dbg_value(i32 %708, !420, !DIExpression(), !1059)
    #dbg_value(i32 poison, !421, !DIExpression(), !1059)
    #dbg_value(i32 %718, !422, !DIExpression(), !1059)
    #dbg_value(i32 %698, !423, !DIExpression(), !1059)
    #dbg_value(i32 %708, !424, !DIExpression(), !1059)
    #dbg_value(i32 poison, !425, !DIExpression(), !1059)
    #dbg_value(i32 %718, !426, !DIExpression(), !1059)
    #dbg_value(i32 %698, !427, !DIExpression(), !1059)
  %719 = icmp ult i32 %698, %708, !dbg !1057
  %720 = icmp eq i32 %718, 0, !dbg !1060
  br i1 %719, label %721, label %727, !dbg !1061

721:                                              ; preds = %662
    #dbg_value(i32 %698, !429, !DIExpression(), !1062)
    #dbg_value(i32 %718, !432, !DIExpression(), !1062)
  br i1 %720, label %724, label %722, !dbg !1063

722:                                              ; preds = %721
  %723 = udiv i32 %698, %718, !dbg !1064
    #dbg_value(i32 %723, !433, !DIExpression(), !1062)
  br label %724

724:                                              ; preds = %722, %721
  %725 = phi i32 [ %723, %722 ], [ 0, %721 ], !dbg !1065
    #dbg_value(i32 %725, !433, !DIExpression(), !1062)
    #dbg_value(i32 %725, !434, !DIExpression(), !1062)
  %726 = add i32 %725, %708, !dbg !1066
    #dbg_value(i32 %726, !428, !DIExpression(), !1059)
  br label %733, !dbg !1067

727:                                              ; preds = %662
    #dbg_value(i32 %708, !435, !DIExpression(), !1068)
    #dbg_value(i32 %718, !437, !DIExpression(), !1068)
  br i1 %720, label %730, label %728, !dbg !1069

728:                                              ; preds = %727
  %729 = urem i32 %708, %718, !dbg !1070
    #dbg_value(i32 %729, !438, !DIExpression(), !1068)
  br label %730

730:                                              ; preds = %728, %727
  %731 = phi i32 [ %729, %728 ], [ 0, %727 ], !dbg !1071
    #dbg_value(i32 %731, !438, !DIExpression(), !1068)
    #dbg_value(i32 %731, !439, !DIExpression(), !1068)
  %732 = add i32 %731, %698, !dbg !1072
    #dbg_value(i32 %732, !428, !DIExpression(), !1059)
  br label %733

733:                                              ; preds = %724, %730
  %734 = phi i32 [ %726, %724 ], [ %732, %730 ], !dbg !1060
    #dbg_value(i32 %734, !428, !DIExpression(), !1059)
    #dbg_value(i32 %734, !731, !DIExpression(), !1046)
    #dbg_value(i32 1, !55, !DIExpression(), !1073)
    #dbg_value(i32 4, !56, !DIExpression(), !1073)
  %735 = load i32, ptr @ink_top, align 4
  %736 = icmp ugt i32 %735, -8
  br i1 %736, label %737, label %738, !dbg !1075

737:                                              ; preds = %733
  tail call void @llvm.trap(), !dbg !1076
  unreachable, !dbg !1078

738:                                              ; preds = %733
  %739 = icmp eq i32 %735, 0, !dbg !1079
  %740 = add nuw i32 %735, 7, !dbg !1080
  %741 = select i1 %739, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %740, !dbg !1081
  %742 = and i32 %741, -8, !dbg !1082
    #dbg_value(i32 %742, !57, !DIExpression(), !1073)
    #dbg_value(i32 4, !58, !DIExpression(), !1073)
  %743 = or disjoint i32 %742, 4, !dbg !1083
  store i32 %743, ptr @ink_top, align 4, !dbg !1084, !tbaa !27
  %744 = add i32 %742, 65539, !dbg !1085
  %745 = lshr i32 %744, 16, !dbg !1086
    #dbg_value(i32 %745, !59, !DIExpression(), !1073)
  %746 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1087
    #dbg_value(i32 %746, !60, !DIExpression(), !1073)
  %747 = icmp ugt i32 %745, %746, !dbg !1088
  br i1 %747, label %748, label %845, !dbg !1089

748:                                              ; preds = %738
  %749 = sub nuw nsw i32 %745, %746, !dbg !1090
  %750 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %749), !dbg !1091
  %751 = icmp eq i32 %750, -1, !dbg !1092
  br i1 %751, label %752, label %845, !dbg !1089

752:                                              ; preds = %748
  tail call void @llvm.trap(), !dbg !1093
  unreachable, !dbg !1095

753:                                              ; preds = %5
  %754 = load ptr, ptr %1, align 4, !dbg !1096, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !782)
    #dbg_value(ptr %754, !115, !DIExpression(), !782)
    #dbg_value(i32 4, !116, !DIExpression(), !782)
    #dbg_value(ptr undef, !117, !DIExpression(), !782)
    #dbg_value(ptr %754, !119, !DIExpression(), !782)
    #dbg_value(i32 0, !122, !DIExpression(), !1097)
  %755 = load i8, ptr %754, align 1, !dbg !1098, !tbaa !132
    #dbg_value(i8 %755, !733, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1099)
    #dbg_value(i32 1, !122, !DIExpression(), !1097)
  %756 = getelementptr inbounds nuw i8, ptr %754, i32 1, !dbg !1098
  %757 = load i8, ptr %756, align 1, !dbg !1098, !tbaa !132
    #dbg_value(i8 %757, !733, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1099)
    #dbg_value(i32 2, !122, !DIExpression(), !1097)
  %758 = getelementptr inbounds nuw i8, ptr %754, i32 2, !dbg !1098
  %759 = load i8, ptr %758, align 1, !dbg !1098, !tbaa !132
    #dbg_value(i8 %759, !733, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1099)
    #dbg_value(i32 3, !122, !DIExpression(), !1097)
  %760 = getelementptr inbounds nuw i8, ptr %754, i32 3, !dbg !1098
  %761 = load i8, ptr %760, align 1, !dbg !1098, !tbaa !132
    #dbg_value(i8 %761, !733, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1099)
    #dbg_value(i32 4, !122, !DIExpression(), !1097)
  %762 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1100
  %763 = load ptr, ptr %762, align 4, !dbg !1100, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !784)
    #dbg_value(ptr %763, !115, !DIExpression(), !784)
    #dbg_value(i32 4, !116, !DIExpression(), !784)
    #dbg_value(ptr undef, !117, !DIExpression(), !784)
    #dbg_value(ptr %763, !119, !DIExpression(), !784)
    #dbg_value(i32 0, !122, !DIExpression(), !1101)
  %764 = load i8, ptr %763, align 1, !dbg !1102, !tbaa !132
    #dbg_value(i8 %764, !735, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1099)
    #dbg_value(i32 1, !122, !DIExpression(), !1101)
  %765 = getelementptr inbounds nuw i8, ptr %763, i32 1, !dbg !1102
  %766 = load i8, ptr %765, align 1, !dbg !1102, !tbaa !132
    #dbg_value(i8 %766, !735, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1099)
    #dbg_value(i32 2, !122, !DIExpression(), !1101)
  %767 = getelementptr inbounds nuw i8, ptr %763, i32 2, !dbg !1102
  %768 = load i8, ptr %767, align 1, !dbg !1102, !tbaa !132
    #dbg_value(i8 %768, !735, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1099)
    #dbg_value(i32 3, !122, !DIExpression(), !1101)
  %769 = getelementptr inbounds nuw i8, ptr %763, i32 3, !dbg !1102
  %770 = load i8, ptr %769, align 1, !dbg !1102, !tbaa !132
    #dbg_value(i8 %770, !735, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1099)
    #dbg_value(i32 4, !122, !DIExpression(), !1101)
    #dbg_value(i32 poison, !122, !DIExpression(), !1103)
  %771 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1105
  %772 = load ptr, ptr %771, align 4, !dbg !1105, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !786)
    #dbg_value(ptr %772, !115, !DIExpression(), !786)
    #dbg_value(i32 4, !116, !DIExpression(), !786)
    #dbg_value(ptr undef, !117, !DIExpression(), !786)
    #dbg_value(ptr %772, !119, !DIExpression(), !786)
    #dbg_value(i32 0, !122, !DIExpression(), !1106)
  %773 = load i8, ptr %772, align 1, !dbg !1107, !tbaa !132
    #dbg_value(i8 %773, !737, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1099)
    #dbg_value(i32 1, !122, !DIExpression(), !1106)
  %774 = getelementptr inbounds nuw i8, ptr %772, i32 1, !dbg !1107
  %775 = load i8, ptr %774, align 1, !dbg !1107, !tbaa !132
    #dbg_value(i8 %775, !737, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1099)
    #dbg_value(i32 2, !122, !DIExpression(), !1106)
  %776 = getelementptr inbounds nuw i8, ptr %772, i32 2, !dbg !1107
  %777 = load i8, ptr %776, align 1, !dbg !1107, !tbaa !132
    #dbg_value(i8 %777, !737, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1099)
    #dbg_value(i32 3, !122, !DIExpression(), !1106)
  %778 = getelementptr inbounds nuw i8, ptr %772, i32 3, !dbg !1107
  %779 = load i8, ptr %778, align 1, !dbg !1107, !tbaa !132
    #dbg_value(i8 %779, !737, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1099)
    #dbg_value(i32 4, !122, !DIExpression(), !1106)
  %780 = zext i8 %761 to i32, !dbg !1108
  %781 = shl nuw i32 %780, 24, !dbg !1108
  %782 = zext i8 %759 to i32, !dbg !1108
  %783 = shl nuw nsw i32 %782, 16, !dbg !1108
  %784 = or disjoint i32 %781, %783, !dbg !1108
  %785 = zext i8 %757 to i32, !dbg !1108
  %786 = shl nuw nsw i32 %785, 8, !dbg !1108
  %787 = or disjoint i32 %784, %786, !dbg !1108
  %788 = zext i8 %755 to i32, !dbg !1108
  %789 = or disjoint i32 %787, %788, !dbg !1108
  %790 = zext i8 %770 to i32, !dbg !1109
  %791 = shl nuw i32 %790, 24, !dbg !1109
  %792 = zext i8 %768 to i32, !dbg !1109
  %793 = shl nuw nsw i32 %792, 16, !dbg !1109
  %794 = or disjoint i32 %791, %793, !dbg !1109
  %795 = zext i8 %766 to i32, !dbg !1109
  %796 = shl nuw nsw i32 %795, 8, !dbg !1109
  %797 = or disjoint i32 %794, %796, !dbg !1109
  %798 = zext i8 %764 to i32, !dbg !1109
  %799 = or disjoint i32 %797, %798, !dbg !1109
  %800 = zext i8 %779 to i32, !dbg !1110
  %801 = shl nuw i32 %800, 24, !dbg !1110
  %802 = zext i8 %777 to i32, !dbg !1110
  %803 = shl nuw nsw i32 %802, 16, !dbg !1110
  %804 = or disjoint i32 %801, %803, !dbg !1110
  %805 = zext i8 %775 to i32, !dbg !1110
  %806 = shl nuw nsw i32 %805, 8, !dbg !1110
  %807 = or disjoint i32 %804, %806, !dbg !1110
  %808 = zext i8 %773 to i32, !dbg !1110
  %809 = or disjoint i32 %807, %808, !dbg !1110
    #dbg_value(i32 %789, !462, !DIExpression(), !1112)
    #dbg_value(i32 %799, !463, !DIExpression(), !1112)
    #dbg_value(i32 poison, !464, !DIExpression(), !1112)
    #dbg_value(i32 %809, !465, !DIExpression(), !1112)
    #dbg_value(i32 %789, !466, !DIExpression(), !1112)
  %810 = icmp ult i32 %789, %799, !dbg !1110
  %811 = icmp eq i32 %809, 0, !dbg !1113
  br i1 %810, label %812, label %818, !dbg !1114

812:                                              ; preds = %753
    #dbg_value(i32 %789, !468, !DIExpression(), !1115)
    #dbg_value(i32 %809, !471, !DIExpression(), !1115)
  br i1 %811, label %815, label %813, !dbg !1116

813:                                              ; preds = %812
  %814 = udiv i32 %789, %809, !dbg !1117
    #dbg_value(i32 %814, !472, !DIExpression(), !1115)
  br label %815

815:                                              ; preds = %813, %812
  %816 = phi i32 [ %814, %813 ], [ 0, %812 ], !dbg !1118
    #dbg_value(i32 %816, !472, !DIExpression(), !1115)
    #dbg_value(i32 %816, !473, !DIExpression(), !1115)
  %817 = add i32 %816, %799, !dbg !1119
    #dbg_value(i32 %817, !467, !DIExpression(), !1112)
  br label %824, !dbg !1120

818:                                              ; preds = %753
    #dbg_value(i32 %799, !474, !DIExpression(), !1121)
    #dbg_value(i32 %809, !476, !DIExpression(), !1121)
  br i1 %811, label %821, label %819, !dbg !1122

819:                                              ; preds = %818
  %820 = urem i32 %799, %809, !dbg !1123
    #dbg_value(i32 %820, !477, !DIExpression(), !1121)
  br label %821

821:                                              ; preds = %819, %818
  %822 = phi i32 [ %820, %819 ], [ 0, %818 ], !dbg !1124
    #dbg_value(i32 %822, !477, !DIExpression(), !1121)
    #dbg_value(i32 %822, !478, !DIExpression(), !1121)
  %823 = add i32 %822, %789, !dbg !1125
    #dbg_value(i32 %823, !467, !DIExpression(), !1112)
  br label %824

824:                                              ; preds = %815, %821
  %825 = phi i32 [ %817, %815 ], [ %823, %821 ], !dbg !1113
    #dbg_value(i32 %825, !467, !DIExpression(), !1112)
    #dbg_value(i32 %825, !738, !DIExpression(), !1099)
    #dbg_value(i32 1, !55, !DIExpression(), !1126)
    #dbg_value(i32 4, !56, !DIExpression(), !1126)
  %826 = load i32, ptr @ink_top, align 4
  %827 = icmp ugt i32 %826, -8
  br i1 %827, label %828, label %829, !dbg !1128

828:                                              ; preds = %824
  tail call void @llvm.trap(), !dbg !1129
  unreachable, !dbg !1131

829:                                              ; preds = %824
  %830 = icmp eq i32 %826, 0, !dbg !1132
  %831 = add nuw i32 %826, 7, !dbg !1133
  %832 = select i1 %830, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %831, !dbg !1134
  %833 = and i32 %832, -8, !dbg !1135
    #dbg_value(i32 %833, !57, !DIExpression(), !1126)
    #dbg_value(i32 4, !58, !DIExpression(), !1126)
  %834 = or disjoint i32 %833, 4, !dbg !1136
  store i32 %834, ptr @ink_top, align 4, !dbg !1137, !tbaa !27
  %835 = add i32 %833, 65539, !dbg !1138
  %836 = lshr i32 %835, 16, !dbg !1139
    #dbg_value(i32 %836, !59, !DIExpression(), !1126)
  %837 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1140
    #dbg_value(i32 %837, !60, !DIExpression(), !1126)
  %838 = icmp ugt i32 %836, %837, !dbg !1141
  br i1 %838, label %839, label %845, !dbg !1142

839:                                              ; preds = %829
  %840 = sub nuw nsw i32 %836, %837, !dbg !1143
  %841 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %840), !dbg !1144
  %842 = icmp eq i32 %841, -1, !dbg !1145
  br i1 %842, label %843, label %845, !dbg !1142

843:                                              ; preds = %839
  tail call void @llvm.trap(), !dbg !1146
  unreachable, !dbg !1148

844:                                              ; preds = %5
  tail call void @llvm.trap(), !dbg !1149
  unreachable, !dbg !1151

845:                                              ; preds = %839, %829, %748, %738, %657, %647, %559, %549, %461, %451, %359, %349
  %846 = phi i32 [ %353, %349 ], [ %353, %359 ], [ %455, %451 ], [ %455, %461 ], [ %553, %549 ], [ %553, %559 ], [ %651, %647 ], [ %651, %657 ], [ %742, %738 ], [ %742, %748 ], [ %833, %829 ], [ %833, %839 ]
  %847 = phi i32 [ %345, %349 ], [ %345, %359 ], [ %447, %451 ], [ %447, %461 ], [ %545, %549 ], [ %545, %559 ], [ %643, %647 ], [ %643, %657 ], [ %734, %738 ], [ %734, %748 ], [ %825, %829 ], [ %825, %839 ]
  %848 = inttoptr i32 %846 to ptr, !dbg !1152
  store i32 %847, ptr %848, align 8, !dbg !1153, !tbaa !290
  br label %849, !dbg !1153

849:                                              ; preds = %257, %222, %845, %74
  %850 = phi ptr [ %75, %74 ], [ %848, %845 ], [ %75, %222 ], [ %75, %257 ]
  %851 = phi i32 [ %27, %74 ], [ 1, %845 ], [ %27, %222 ], [ %27, %257 ]
  store ptr %850, ptr %3, align 4, !dbg !1153, !tbaa !634
  store i32 %851, ptr %4, align 4, !dbg !1153, !tbaa !27
  ret void, !dbg !1154
}

; Function Attrs: nounwind memory(read, inaccessiblemem: write) uwtable
define hidden i32 @ink_compute_scalar32(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readnone %2) local_unnamed_addr #10 !dbg !1155 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1199)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1199)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1199)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1199)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1199)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1199)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1199)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1199)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1201)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1201)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1201)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1201)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1201)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1201)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1201)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1201)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1203)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1203)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1203)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1203)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1203)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1203)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1203)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1203)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1205)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1205)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1205)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1205)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1205)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1205)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1205)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1205)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1207)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1207)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1207)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1207)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1207)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1207)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1207)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1207)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1209)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1209)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1209)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1209)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1209)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1209)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1209)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1209)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1211)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1211)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1211)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1211)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1211)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1211)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1211)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1211)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1213)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1213)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1213)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1213)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1213)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1213)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1213)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1213)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1215)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1215)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1215)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1215)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1215)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1215)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1215)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1215)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1217)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1217)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1217)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1217)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1217)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1217)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1217)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1217)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1219)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1219)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1219)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1219)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1219)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1219)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1219)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1219)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1221)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1221)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1221)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1221)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1221)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1221)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1221)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1221)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1223)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1223)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1223)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1223)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1223)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1223)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1223)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1223)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1225)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1225)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1225)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1225)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1225)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1225)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1225)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1225)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1227)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1227)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1227)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1227)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1227)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1227)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1227)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1227)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1229)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1229)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1229)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1229)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1229)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1229)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1229)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1229)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1231)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1231)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1231)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1231)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1231)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1231)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1231)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1231)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1233)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1233)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1233)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1233)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1233)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1233)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1233)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1233)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1235)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1235)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1235)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1235)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1235)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1235)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1235)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1235)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1237)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1237)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1237)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1237)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1237)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1237)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1237)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1237)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1239)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1239)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1239)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1239)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1239)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1239)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1239)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1239)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1241)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1241)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1241)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1241)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1241)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1241)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1241)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1241)
    #dbg_value(i32 %0, !1159, !DIExpression(), !1243)
    #dbg_value(ptr %1, !1160, !DIExpression(), !1243)
    #dbg_value(ptr %2, !1161, !DIExpression(), !1243)
  switch i32 %0, label %474 [
    i32 1, label %4
    i32 2, label %88
    i32 3, label %172
    i32 4, label %252
    i32 5, label %332
    i32 6, label %403
  ], !dbg !1244

4:                                                ; preds = %3
    #dbg_value(ptr undef, !110, !DIExpression(), !1199)
    #dbg_value(ptr poison, !115, !DIExpression(), !1199)
    #dbg_value(i32 4, !116, !DIExpression(), !1199)
    #dbg_value(ptr undef, !117, !DIExpression(), !1199)
    #dbg_value(ptr poison, !119, !DIExpression(), !1199)
    #dbg_value(i8 poison, !1162, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1245)
    #dbg_value(i8 poison, !1162, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1245)
    #dbg_value(i8 poison, !1162, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1245)
    #dbg_value(i8 poison, !1162, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1245)
    #dbg_value(i32 4, !122, !DIExpression(), !1246)
    #dbg_value(ptr undef, !110, !DIExpression(), !1201)
    #dbg_value(ptr poison, !115, !DIExpression(), !1201)
    #dbg_value(i32 4, !116, !DIExpression(), !1201)
    #dbg_value(ptr undef, !117, !DIExpression(), !1201)
    #dbg_value(ptr poison, !119, !DIExpression(), !1201)
    #dbg_value(i8 poison, !1165, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1245)
    #dbg_value(i8 poison, !1165, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1245)
    #dbg_value(i8 poison, !1165, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1245)
    #dbg_value(i8 poison, !1165, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1245)
    #dbg_value(i32 4, !122, !DIExpression(), !1247)
  %5 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1248
  %6 = load ptr, ptr %5, align 4, !dbg !1248, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1203)
    #dbg_value(ptr %6, !115, !DIExpression(), !1203)
    #dbg_value(i32 4, !116, !DIExpression(), !1203)
    #dbg_value(ptr undef, !117, !DIExpression(), !1203)
    #dbg_value(ptr %6, !119, !DIExpression(), !1203)
    #dbg_value(i32 0, !122, !DIExpression(), !1249)
  %7 = load i8, ptr %6, align 1, !dbg !1250, !tbaa !132
    #dbg_value(i8 %7, !1166, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1245)
    #dbg_value(i32 1, !122, !DIExpression(), !1249)
  %8 = getelementptr inbounds nuw i8, ptr %6, i32 1, !dbg !1250
  %9 = load i8, ptr %8, align 1, !dbg !1250, !tbaa !132
    #dbg_value(i8 %9, !1166, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1245)
    #dbg_value(i32 2, !122, !DIExpression(), !1249)
  %10 = getelementptr inbounds nuw i8, ptr %6, i32 2, !dbg !1250
  %11 = load i8, ptr %10, align 1, !dbg !1250, !tbaa !132
    #dbg_value(i8 %11, !1166, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1245)
    #dbg_value(i32 3, !122, !DIExpression(), !1249)
  %12 = getelementptr inbounds nuw i8, ptr %6, i32 3, !dbg !1250
  %13 = load i8, ptr %12, align 1, !dbg !1250, !tbaa !132
    #dbg_value(i8 %13, !1166, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1245)
    #dbg_value(i32 4, !122, !DIExpression(), !1249)
  %14 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1251
  %15 = load ptr, ptr %14, align 4, !dbg !1251, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1205)
    #dbg_value(ptr %15, !115, !DIExpression(), !1205)
    #dbg_value(i32 4, !116, !DIExpression(), !1205)
    #dbg_value(ptr undef, !117, !DIExpression(), !1205)
    #dbg_value(ptr %15, !119, !DIExpression(), !1205)
    #dbg_value(i32 0, !122, !DIExpression(), !1252)
  %16 = load i8, ptr %15, align 1, !dbg !1253, !tbaa !132
    #dbg_value(i8 %16, !1167, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1245)
    #dbg_value(i32 1, !122, !DIExpression(), !1252)
  %17 = getelementptr inbounds nuw i8, ptr %15, i32 1, !dbg !1253
  %18 = load i8, ptr %17, align 1, !dbg !1253, !tbaa !132
    #dbg_value(i8 %18, !1167, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1245)
    #dbg_value(i32 2, !122, !DIExpression(), !1252)
  %19 = getelementptr inbounds nuw i8, ptr %15, i32 2, !dbg !1253
  %20 = load i8, ptr %19, align 1, !dbg !1253, !tbaa !132
    #dbg_value(i8 %20, !1167, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1245)
    #dbg_value(i32 3, !122, !DIExpression(), !1252)
  %21 = getelementptr inbounds nuw i8, ptr %15, i32 3, !dbg !1253
  %22 = load i8, ptr %21, align 1, !dbg !1253, !tbaa !132
    #dbg_value(i8 %22, !1167, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1245)
    #dbg_value(i32 4, !122, !DIExpression(), !1252)
  %23 = zext i8 %13 to i32, !dbg !1254
  %24 = shl nuw i32 %23, 24, !dbg !1254
  %25 = zext i8 %11 to i32, !dbg !1254
  %26 = shl nuw nsw i32 %25, 16, !dbg !1254
  %27 = or disjoint i32 %24, %26, !dbg !1254
  %28 = zext i8 %9 to i32, !dbg !1254
  %29 = shl nuw nsw i32 %28, 8, !dbg !1254
  %30 = or disjoint i32 %27, %29, !dbg !1254
  %31 = zext i8 %7 to i32, !dbg !1254
  %32 = or disjoint i32 %30, %31, !dbg !1254
  %33 = zext i8 %22 to i32, !dbg !1255
  %34 = shl nuw i32 %33, 24, !dbg !1255
  %35 = zext i8 %20 to i32, !dbg !1255
  %36 = shl nuw nsw i32 %35, 16, !dbg !1255
  %37 = or disjoint i32 %34, %36, !dbg !1255
  %38 = zext i8 %18 to i32, !dbg !1255
  %39 = shl nuw nsw i32 %38, 8, !dbg !1255
  %40 = or disjoint i32 %37, %39, !dbg !1255
  %41 = zext i8 %16 to i32, !dbg !1255
  %42 = or disjoint i32 %40, %41, !dbg !1255
    #dbg_value(i32 poison, !327, !DIExpression(), !1257)
    #dbg_value(i32 poison, !328, !DIExpression(), !1257)
    #dbg_value(i32 %32, !329, !DIExpression(), !1257)
    #dbg_value(i32 %42, !330, !DIExpression(), !1257)
    #dbg_value(i32 poison, !331, !DIExpression(), !1257)
    #dbg_value(i32 poison, !332, !DIExpression(), !1257)
    #dbg_value(i32 %32, !333, !DIExpression(), !1257)
    #dbg_value(i32 %42, !334, !DIExpression(), !1257)
    #dbg_value(i32 poison, !335, !DIExpression(), !1257)
    #dbg_value(i32 %42, !336, !DIExpression(), !1257)
  %43 = icmp eq i32 %42, 0, !dbg !1255
  br i1 %43, label %85, label %44, !dbg !1255

44:                                               ; preds = %4
  %45 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1258
  %46 = load ptr, ptr %45, align 4, !dbg !1258, !tbaa !634
    #dbg_value(ptr %46, !115, !DIExpression(), !1201)
    #dbg_value(ptr %46, !119, !DIExpression(), !1201)
  %47 = getelementptr inbounds nuw i8, ptr %46, i32 3, !dbg !1259
  %48 = load i8, ptr %47, align 1, !dbg !1259, !tbaa !132
    #dbg_value(i8 %48, !1165, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1245)
  %49 = getelementptr inbounds nuw i8, ptr %46, i32 2, !dbg !1259
  %50 = load i8, ptr %49, align 1, !dbg !1259, !tbaa !132
    #dbg_value(i8 %50, !1165, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1245)
  %51 = getelementptr inbounds nuw i8, ptr %46, i32 1, !dbg !1259
  %52 = load i8, ptr %51, align 1, !dbg !1259, !tbaa !132
    #dbg_value(i8 %52, !1165, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1245)
  %53 = load i8, ptr %46, align 1, !dbg !1259, !tbaa !132
    #dbg_value(i8 %53, !1165, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1245)
  %54 = load ptr, ptr %1, align 4, !dbg !1260, !tbaa !634
    #dbg_value(ptr %54, !115, !DIExpression(), !1199)
    #dbg_value(ptr %54, !119, !DIExpression(), !1199)
  %55 = getelementptr inbounds nuw i8, ptr %54, i32 3, !dbg !1261
  %56 = load i8, ptr %55, align 1, !dbg !1261, !tbaa !132
    #dbg_value(i8 %56, !1162, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1245)
  %57 = getelementptr inbounds nuw i8, ptr %54, i32 2, !dbg !1261
  %58 = load i8, ptr %57, align 1, !dbg !1261, !tbaa !132
    #dbg_value(i8 %58, !1162, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1245)
  %59 = getelementptr inbounds nuw i8, ptr %54, i32 1, !dbg !1261
  %60 = load i8, ptr %59, align 1, !dbg !1261, !tbaa !132
    #dbg_value(i8 %60, !1162, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1245)
  %61 = load i8, ptr %54, align 1, !dbg !1261, !tbaa !132
    #dbg_value(i8 %61, !1162, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1245)
  %62 = zext i8 %48 to i32, !dbg !1262
  %63 = shl nuw i32 %62, 24, !dbg !1262
  %64 = zext i8 %50 to i32, !dbg !1262
  %65 = shl nuw nsw i32 %64, 16, !dbg !1262
  %66 = or disjoint i32 %63, %65, !dbg !1262
  %67 = zext i8 %52 to i32, !dbg !1262
  %68 = shl nuw nsw i32 %67, 8, !dbg !1262
  %69 = or disjoint i32 %66, %68, !dbg !1262
  %70 = zext i8 %53 to i32, !dbg !1262
  %71 = or disjoint i32 %69, %70, !dbg !1262
    #dbg_value(i32 %71, !328, !DIExpression(), !1257)
    #dbg_value(i32 %71, !332, !DIExpression(), !1257)
    #dbg_value(i32 %71, !335, !DIExpression(), !1257)
  %72 = zext i8 %56 to i32, !dbg !1263
  %73 = shl nuw i32 %72, 24, !dbg !1263
  %74 = zext i8 %58 to i32, !dbg !1263
  %75 = shl nuw nsw i32 %74, 16, !dbg !1263
  %76 = or disjoint i32 %73, %75, !dbg !1263
  %77 = zext i8 %60 to i32, !dbg !1263
  %78 = shl nuw nsw i32 %77, 8, !dbg !1263
  %79 = or disjoint i32 %76, %78, !dbg !1263
  %80 = zext i8 %61 to i32, !dbg !1263
  %81 = or disjoint i32 %79, %80, !dbg !1263
    #dbg_value(i32 %81, !327, !DIExpression(), !1257)
    #dbg_value(i32 %81, !331, !DIExpression(), !1257)
  %82 = udiv i32 %71, %42, !dbg !1263
    #dbg_value(i32 %82, !337, !DIExpression(), !1257)
    #dbg_value(i32 %82, !338, !DIExpression(), !1257)
    #dbg_value(i32 %81, !339, !DIExpression(), !1257)
    #dbg_value(i32 %42, !340, !DIExpression(), !1257)
  %83 = urem i32 %81, %42, !dbg !1264
    #dbg_value(i32 %83, !341, !DIExpression(), !1257)
  %84 = add i32 %83, %82
  br label %85

85:                                               ; preds = %4, %44
  %86 = phi i32 [ %84, %44 ], [ 0, %4 ], !dbg !1265
    #dbg_value(i32 poison, !341, !DIExpression(), !1257)
    #dbg_value(i32 %86, !342, !DIExpression(), !1257)
  %87 = add i32 %86, %32, !dbg !1266
    #dbg_value(i32 %87, !1168, !DIExpression(), !1245)
  br label %475

88:                                               ; preds = %3
    #dbg_value(ptr undef, !110, !DIExpression(), !1207)
    #dbg_value(ptr poison, !115, !DIExpression(), !1207)
    #dbg_value(i32 4, !116, !DIExpression(), !1207)
    #dbg_value(ptr undef, !117, !DIExpression(), !1207)
    #dbg_value(ptr poison, !119, !DIExpression(), !1207)
    #dbg_value(i8 poison, !1169, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1267)
    #dbg_value(i8 poison, !1169, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1267)
    #dbg_value(i8 poison, !1169, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1267)
    #dbg_value(i8 poison, !1169, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1267)
    #dbg_value(i32 4, !122, !DIExpression(), !1268)
    #dbg_value(ptr undef, !110, !DIExpression(), !1209)
    #dbg_value(ptr poison, !115, !DIExpression(), !1209)
    #dbg_value(i32 4, !116, !DIExpression(), !1209)
    #dbg_value(ptr undef, !117, !DIExpression(), !1209)
    #dbg_value(ptr poison, !119, !DIExpression(), !1209)
    #dbg_value(i8 poison, !1171, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1267)
    #dbg_value(i8 poison, !1171, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1267)
    #dbg_value(i8 poison, !1171, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1267)
    #dbg_value(i8 poison, !1171, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1267)
    #dbg_value(i32 4, !122, !DIExpression(), !1269)
  %89 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1270
  %90 = load ptr, ptr %89, align 4, !dbg !1270, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1211)
    #dbg_value(ptr %90, !115, !DIExpression(), !1211)
    #dbg_value(i32 4, !116, !DIExpression(), !1211)
    #dbg_value(ptr undef, !117, !DIExpression(), !1211)
    #dbg_value(ptr %90, !119, !DIExpression(), !1211)
    #dbg_value(i32 0, !122, !DIExpression(), !1271)
  %91 = load i8, ptr %90, align 1, !dbg !1272, !tbaa !132
    #dbg_value(i8 %91, !1172, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1267)
    #dbg_value(i32 1, !122, !DIExpression(), !1271)
  %92 = getelementptr inbounds nuw i8, ptr %90, i32 1, !dbg !1272
  %93 = load i8, ptr %92, align 1, !dbg !1272, !tbaa !132
    #dbg_value(i8 %93, !1172, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1267)
    #dbg_value(i32 2, !122, !DIExpression(), !1271)
  %94 = getelementptr inbounds nuw i8, ptr %90, i32 2, !dbg !1272
  %95 = load i8, ptr %94, align 1, !dbg !1272, !tbaa !132
    #dbg_value(i8 %95, !1172, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1267)
    #dbg_value(i32 3, !122, !DIExpression(), !1271)
  %96 = getelementptr inbounds nuw i8, ptr %90, i32 3, !dbg !1272
  %97 = load i8, ptr %96, align 1, !dbg !1272, !tbaa !132
    #dbg_value(i8 %97, !1172, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1267)
    #dbg_value(i32 4, !122, !DIExpression(), !1271)
  %98 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1273
  %99 = load ptr, ptr %98, align 4, !dbg !1273, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1213)
    #dbg_value(ptr %99, !115, !DIExpression(), !1213)
    #dbg_value(i32 4, !116, !DIExpression(), !1213)
    #dbg_value(ptr undef, !117, !DIExpression(), !1213)
    #dbg_value(ptr %99, !119, !DIExpression(), !1213)
    #dbg_value(i32 0, !122, !DIExpression(), !1274)
  %100 = load i8, ptr %99, align 1, !dbg !1275, !tbaa !132
    #dbg_value(i8 %100, !1173, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1267)
    #dbg_value(i32 1, !122, !DIExpression(), !1274)
  %101 = getelementptr inbounds nuw i8, ptr %99, i32 1, !dbg !1275
  %102 = load i8, ptr %101, align 1, !dbg !1275, !tbaa !132
    #dbg_value(i8 %102, !1173, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1267)
    #dbg_value(i32 2, !122, !DIExpression(), !1274)
  %103 = getelementptr inbounds nuw i8, ptr %99, i32 2, !dbg !1275
  %104 = load i8, ptr %103, align 1, !dbg !1275, !tbaa !132
    #dbg_value(i8 %104, !1173, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1267)
    #dbg_value(i32 3, !122, !DIExpression(), !1274)
  %105 = getelementptr inbounds nuw i8, ptr %99, i32 3, !dbg !1275
  %106 = load i8, ptr %105, align 1, !dbg !1275, !tbaa !132
    #dbg_value(i8 %106, !1173, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1267)
    #dbg_value(i32 4, !122, !DIExpression(), !1274)
  %107 = zext i8 %97 to i32, !dbg !1276
  %108 = shl nuw i32 %107, 24, !dbg !1276
  %109 = zext i8 %95 to i32, !dbg !1276
  %110 = shl nuw nsw i32 %109, 16, !dbg !1276
  %111 = or disjoint i32 %108, %110, !dbg !1276
  %112 = zext i8 %93 to i32, !dbg !1276
  %113 = shl nuw nsw i32 %112, 8, !dbg !1276
  %114 = or disjoint i32 %111, %113, !dbg !1276
  %115 = zext i8 %91 to i32, !dbg !1276
  %116 = or disjoint i32 %114, %115, !dbg !1276
  %117 = zext i8 %106 to i32, !dbg !1277
  %118 = shl nuw i32 %117, 24, !dbg !1277
  %119 = zext i8 %104 to i32, !dbg !1277
  %120 = shl nuw nsw i32 %119, 16, !dbg !1277
  %121 = or disjoint i32 %118, %120, !dbg !1277
  %122 = zext i8 %102 to i32, !dbg !1277
  %123 = shl nuw nsw i32 %122, 8, !dbg !1277
  %124 = or disjoint i32 %121, %123, !dbg !1277
  %125 = zext i8 %100 to i32, !dbg !1277
  %126 = or disjoint i32 %124, %125, !dbg !1277
    #dbg_value(i32 poison, !356, !DIExpression(), !1279)
    #dbg_value(i32 poison, !357, !DIExpression(), !1279)
    #dbg_value(i32 %116, !358, !DIExpression(), !1279)
    #dbg_value(i32 %126, !359, !DIExpression(), !1279)
    #dbg_value(i32 poison, !360, !DIExpression(), !1279)
    #dbg_value(i32 %126, !361, !DIExpression(), !1279)
  %127 = icmp eq i32 %126, 0, !dbg !1277
  br i1 %127, label %169, label %128, !dbg !1277

128:                                              ; preds = %88
  %129 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1280
  %130 = load ptr, ptr %129, align 4, !dbg !1280, !tbaa !634
    #dbg_value(ptr %130, !115, !DIExpression(), !1209)
    #dbg_value(ptr %130, !119, !DIExpression(), !1209)
  %131 = getelementptr inbounds nuw i8, ptr %130, i32 3, !dbg !1281
  %132 = load i8, ptr %131, align 1, !dbg !1281, !tbaa !132
    #dbg_value(i8 %132, !1171, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1267)
  %133 = getelementptr inbounds nuw i8, ptr %130, i32 2, !dbg !1281
  %134 = load i8, ptr %133, align 1, !dbg !1281, !tbaa !132
    #dbg_value(i8 %134, !1171, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1267)
  %135 = getelementptr inbounds nuw i8, ptr %130, i32 1, !dbg !1281
  %136 = load i8, ptr %135, align 1, !dbg !1281, !tbaa !132
    #dbg_value(i8 %136, !1171, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1267)
  %137 = load i8, ptr %130, align 1, !dbg !1281, !tbaa !132
    #dbg_value(i8 %137, !1171, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1267)
  %138 = load ptr, ptr %1, align 4, !dbg !1282, !tbaa !634
    #dbg_value(ptr %138, !115, !DIExpression(), !1207)
    #dbg_value(ptr %138, !119, !DIExpression(), !1207)
  %139 = getelementptr inbounds nuw i8, ptr %138, i32 3, !dbg !1283
  %140 = load i8, ptr %139, align 1, !dbg !1283, !tbaa !132
    #dbg_value(i8 %140, !1169, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1267)
  %141 = getelementptr inbounds nuw i8, ptr %138, i32 2, !dbg !1283
  %142 = load i8, ptr %141, align 1, !dbg !1283, !tbaa !132
    #dbg_value(i8 %142, !1169, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1267)
  %143 = getelementptr inbounds nuw i8, ptr %138, i32 1, !dbg !1283
  %144 = load i8, ptr %143, align 1, !dbg !1283, !tbaa !132
    #dbg_value(i8 %144, !1169, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1267)
  %145 = load i8, ptr %138, align 1, !dbg !1283, !tbaa !132
    #dbg_value(i8 %145, !1169, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1267)
  %146 = zext i8 %132 to i32, !dbg !1284
  %147 = shl nuw i32 %146, 24, !dbg !1284
  %148 = zext i8 %134 to i32, !dbg !1284
  %149 = shl nuw nsw i32 %148, 16, !dbg !1284
  %150 = or disjoint i32 %147, %149, !dbg !1284
  %151 = zext i8 %136 to i32, !dbg !1284
  %152 = shl nuw nsw i32 %151, 8, !dbg !1284
  %153 = or disjoint i32 %150, %152, !dbg !1284
  %154 = zext i8 %137 to i32, !dbg !1284
  %155 = or disjoint i32 %153, %154, !dbg !1284
    #dbg_value(i32 %155, !357, !DIExpression(), !1279)
    #dbg_value(i32 %155, !360, !DIExpression(), !1279)
  %156 = zext i8 %140 to i32, !dbg !1285
  %157 = shl nuw i32 %156, 24, !dbg !1285
  %158 = zext i8 %142 to i32, !dbg !1285
  %159 = shl nuw nsw i32 %158, 16, !dbg !1285
  %160 = or disjoint i32 %157, %159, !dbg !1285
  %161 = zext i8 %144 to i32, !dbg !1285
  %162 = shl nuw nsw i32 %161, 8, !dbg !1285
  %163 = or disjoint i32 %160, %162, !dbg !1285
  %164 = zext i8 %145 to i32, !dbg !1285
  %165 = or disjoint i32 %163, %164, !dbg !1285
    #dbg_value(i32 %165, !356, !DIExpression(), !1279)
  %166 = udiv i32 %155, %126, !dbg !1285
    #dbg_value(i32 %166, !362, !DIExpression(), !1279)
    #dbg_value(i32 %166, !363, !DIExpression(), !1279)
    #dbg_value(i32 %165, !364, !DIExpression(), !1279)
    #dbg_value(i32 %126, !365, !DIExpression(), !1279)
  %167 = urem i32 %165, %126, !dbg !1286
    #dbg_value(i32 %167, !366, !DIExpression(), !1279)
  %168 = add i32 %167, %166
  br label %169

169:                                              ; preds = %88, %128
  %170 = phi i32 [ %168, %128 ], [ 0, %88 ], !dbg !1287
    #dbg_value(i32 poison, !366, !DIExpression(), !1279)
    #dbg_value(i32 %170, !367, !DIExpression(), !1279)
  %171 = add i32 %170, %116, !dbg !1288
    #dbg_value(i32 %171, !1174, !DIExpression(), !1267)
  br label %475

172:                                              ; preds = %3
  %173 = load ptr, ptr %1, align 4, !dbg !1289, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1215)
    #dbg_value(ptr %173, !115, !DIExpression(), !1215)
    #dbg_value(i32 4, !116, !DIExpression(), !1215)
    #dbg_value(ptr undef, !117, !DIExpression(), !1215)
    #dbg_value(ptr %173, !119, !DIExpression(), !1215)
    #dbg_value(i32 0, !122, !DIExpression(), !1290)
  %174 = load i8, ptr %173, align 1, !dbg !1291, !tbaa !132
    #dbg_value(i8 %174, !1175, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1292)
    #dbg_value(i32 1, !122, !DIExpression(), !1290)
  %175 = getelementptr inbounds nuw i8, ptr %173, i32 1, !dbg !1291
  %176 = load i8, ptr %175, align 1, !dbg !1291, !tbaa !132
    #dbg_value(i8 %176, !1175, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1292)
    #dbg_value(i32 2, !122, !DIExpression(), !1290)
  %177 = getelementptr inbounds nuw i8, ptr %173, i32 2, !dbg !1291
  %178 = load i8, ptr %177, align 1, !dbg !1291, !tbaa !132
    #dbg_value(i8 %178, !1175, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1292)
    #dbg_value(i32 3, !122, !DIExpression(), !1290)
  %179 = getelementptr inbounds nuw i8, ptr %173, i32 3, !dbg !1291
  %180 = load i8, ptr %179, align 1, !dbg !1291, !tbaa !132
    #dbg_value(i8 %180, !1175, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1292)
    #dbg_value(i32 4, !122, !DIExpression(), !1290)
  %181 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1293
  %182 = load ptr, ptr %181, align 4, !dbg !1293, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1217)
    #dbg_value(ptr %182, !115, !DIExpression(), !1217)
    #dbg_value(i32 4, !116, !DIExpression(), !1217)
    #dbg_value(ptr undef, !117, !DIExpression(), !1217)
    #dbg_value(ptr %182, !119, !DIExpression(), !1217)
    #dbg_value(i32 0, !122, !DIExpression(), !1294)
  %183 = load i8, ptr %182, align 1, !dbg !1295, !tbaa !132
    #dbg_value(i8 %183, !1177, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1292)
    #dbg_value(i32 1, !122, !DIExpression(), !1294)
  %184 = getelementptr inbounds nuw i8, ptr %182, i32 1, !dbg !1295
  %185 = load i8, ptr %184, align 1, !dbg !1295, !tbaa !132
    #dbg_value(i8 %185, !1177, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1292)
    #dbg_value(i32 2, !122, !DIExpression(), !1294)
  %186 = getelementptr inbounds nuw i8, ptr %182, i32 2, !dbg !1295
  %187 = load i8, ptr %186, align 1, !dbg !1295, !tbaa !132
    #dbg_value(i8 %187, !1177, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1292)
    #dbg_value(i32 3, !122, !DIExpression(), !1294)
  %188 = getelementptr inbounds nuw i8, ptr %182, i32 3, !dbg !1295
  %189 = load i8, ptr %188, align 1, !dbg !1295, !tbaa !132
    #dbg_value(i8 %189, !1177, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1292)
    #dbg_value(i32 4, !122, !DIExpression(), !1294)
  %190 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1296
  %191 = load ptr, ptr %190, align 4, !dbg !1296, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1219)
    #dbg_value(ptr %191, !115, !DIExpression(), !1219)
    #dbg_value(i32 4, !116, !DIExpression(), !1219)
    #dbg_value(ptr undef, !117, !DIExpression(), !1219)
    #dbg_value(ptr %191, !119, !DIExpression(), !1219)
    #dbg_value(i32 0, !122, !DIExpression(), !1297)
  %192 = load i8, ptr %191, align 1, !dbg !1298, !tbaa !132
    #dbg_value(i8 %192, !1178, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1292)
    #dbg_value(i32 1, !122, !DIExpression(), !1297)
  %193 = getelementptr inbounds nuw i8, ptr %191, i32 1, !dbg !1298
  %194 = load i8, ptr %193, align 1, !dbg !1298, !tbaa !132
    #dbg_value(i8 %194, !1178, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1292)
    #dbg_value(i32 2, !122, !DIExpression(), !1297)
  %195 = getelementptr inbounds nuw i8, ptr %191, i32 2, !dbg !1298
  %196 = load i8, ptr %195, align 1, !dbg !1298, !tbaa !132
    #dbg_value(i8 %196, !1178, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1292)
    #dbg_value(i32 3, !122, !DIExpression(), !1297)
  %197 = getelementptr inbounds nuw i8, ptr %191, i32 3, !dbg !1298
  %198 = load i8, ptr %197, align 1, !dbg !1298, !tbaa !132
    #dbg_value(i8 %198, !1178, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1292)
    #dbg_value(i32 4, !122, !DIExpression(), !1297)
  %199 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1299
  %200 = load ptr, ptr %199, align 4, !dbg !1299, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1221)
    #dbg_value(ptr %200, !115, !DIExpression(), !1221)
    #dbg_value(i32 4, !116, !DIExpression(), !1221)
    #dbg_value(ptr undef, !117, !DIExpression(), !1221)
    #dbg_value(ptr %200, !119, !DIExpression(), !1221)
    #dbg_value(i32 0, !122, !DIExpression(), !1300)
  %201 = load i8, ptr %200, align 1, !dbg !1301, !tbaa !132
    #dbg_value(i8 %201, !1179, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1292)
    #dbg_value(i32 1, !122, !DIExpression(), !1300)
  %202 = getelementptr inbounds nuw i8, ptr %200, i32 1, !dbg !1301
  %203 = load i8, ptr %202, align 1, !dbg !1301, !tbaa !132
    #dbg_value(i8 %203, !1179, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1292)
    #dbg_value(i32 2, !122, !DIExpression(), !1300)
  %204 = getelementptr inbounds nuw i8, ptr %200, i32 2, !dbg !1301
  %205 = load i8, ptr %204, align 1, !dbg !1301, !tbaa !132
    #dbg_value(i8 %205, !1179, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1292)
    #dbg_value(i32 3, !122, !DIExpression(), !1300)
  %206 = getelementptr inbounds nuw i8, ptr %200, i32 3, !dbg !1301
  %207 = load i8, ptr %206, align 1, !dbg !1301, !tbaa !132
    #dbg_value(i8 %207, !1179, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1292)
    #dbg_value(i32 4, !122, !DIExpression(), !1300)
  %208 = zext i8 %180 to i32, !dbg !1302
  %209 = shl nuw i32 %208, 24, !dbg !1302
  %210 = zext i8 %178 to i32, !dbg !1302
  %211 = shl nuw nsw i32 %210, 16, !dbg !1302
  %212 = or disjoint i32 %209, %211, !dbg !1302
  %213 = zext i8 %176 to i32, !dbg !1302
  %214 = shl nuw nsw i32 %213, 8, !dbg !1302
  %215 = or disjoint i32 %212, %214, !dbg !1302
  %216 = zext i8 %174 to i32, !dbg !1302
  %217 = or disjoint i32 %215, %216, !dbg !1302
  %218 = zext i8 %189 to i32, !dbg !1303
  %219 = shl nuw i32 %218, 24, !dbg !1303
  %220 = zext i8 %187 to i32, !dbg !1303
  %221 = shl nuw nsw i32 %220, 16, !dbg !1303
  %222 = or disjoint i32 %219, %221, !dbg !1303
  %223 = zext i8 %185 to i32, !dbg !1303
  %224 = shl nuw nsw i32 %223, 8, !dbg !1303
  %225 = or disjoint i32 %222, %224, !dbg !1303
  %226 = zext i8 %183 to i32, !dbg !1303
  %227 = or disjoint i32 %225, %226, !dbg !1303
  %228 = zext i8 %198 to i32, !dbg !1304
  %229 = shl nuw i32 %228, 24, !dbg !1304
  %230 = zext i8 %196 to i32, !dbg !1304
  %231 = shl nuw nsw i32 %230, 16, !dbg !1304
  %232 = or disjoint i32 %229, %231, !dbg !1304
  %233 = zext i8 %194 to i32, !dbg !1304
  %234 = shl nuw nsw i32 %233, 8, !dbg !1304
  %235 = or disjoint i32 %232, %234, !dbg !1304
  %236 = zext i8 %192 to i32, !dbg !1304
  %237 = or disjoint i32 %235, %236, !dbg !1304
  %238 = zext i8 %207 to i32, !dbg !1305
  %239 = shl nuw i32 %238, 24, !dbg !1305
  %240 = zext i8 %205 to i32, !dbg !1305
  %241 = shl nuw nsw i32 %240, 16, !dbg !1305
  %242 = or disjoint i32 %239, %241, !dbg !1305
  %243 = zext i8 %203 to i32, !dbg !1305
  %244 = shl nuw nsw i32 %243, 8, !dbg !1305
  %245 = or disjoint i32 %242, %244, !dbg !1305
  %246 = zext i8 %201 to i32, !dbg !1305
  %247 = or disjoint i32 %245, %246, !dbg !1305
    #dbg_value(i32 %217, !381, !DIExpression(), !1307)
    #dbg_value(i32 %227, !382, !DIExpression(), !1307)
    #dbg_value(i32 %237, !383, !DIExpression(), !1307)
    #dbg_value(i32 %247, !384, !DIExpression(), !1307)
    #dbg_value(i32 %217, !385, !DIExpression(), !1307)
    #dbg_value(i32 %227, !386, !DIExpression(), !1307)
    #dbg_value(i32 %237, !387, !DIExpression(), !1307)
    #dbg_value(i32 %247, !388, !DIExpression(), !1307)
    #dbg_value(i32 %217, !389, !DIExpression(), !1307)
  %248 = icmp ult i32 %217, %237, !dbg !1305
  %249 = add i32 %247, %227, !dbg !1308
  %250 = mul i32 %227, 3, !dbg !1308
  %251 = select i1 %248, i32 %249, i32 %250, !dbg !1308
    #dbg_value(i32 %251, !390, !DIExpression(), !1307)
    #dbg_value(i32 %251, !1180, !DIExpression(), !1292)
  br label %475

252:                                              ; preds = %3
  %253 = load ptr, ptr %1, align 4, !dbg !1309, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1223)
    #dbg_value(ptr %253, !115, !DIExpression(), !1223)
    #dbg_value(i32 4, !116, !DIExpression(), !1223)
    #dbg_value(ptr undef, !117, !DIExpression(), !1223)
    #dbg_value(ptr %253, !119, !DIExpression(), !1223)
    #dbg_value(i32 0, !122, !DIExpression(), !1310)
  %254 = load i8, ptr %253, align 1, !dbg !1311, !tbaa !132
    #dbg_value(i8 %254, !1181, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1312)
    #dbg_value(i32 1, !122, !DIExpression(), !1310)
  %255 = getelementptr inbounds nuw i8, ptr %253, i32 1, !dbg !1311
  %256 = load i8, ptr %255, align 1, !dbg !1311, !tbaa !132
    #dbg_value(i8 %256, !1181, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1312)
    #dbg_value(i32 2, !122, !DIExpression(), !1310)
  %257 = getelementptr inbounds nuw i8, ptr %253, i32 2, !dbg !1311
  %258 = load i8, ptr %257, align 1, !dbg !1311, !tbaa !132
    #dbg_value(i8 %258, !1181, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1312)
    #dbg_value(i32 3, !122, !DIExpression(), !1310)
  %259 = getelementptr inbounds nuw i8, ptr %253, i32 3, !dbg !1311
  %260 = load i8, ptr %259, align 1, !dbg !1311, !tbaa !132
    #dbg_value(i8 %260, !1181, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1312)
    #dbg_value(i32 4, !122, !DIExpression(), !1310)
  %261 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1313
  %262 = load ptr, ptr %261, align 4, !dbg !1313, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1225)
    #dbg_value(ptr %262, !115, !DIExpression(), !1225)
    #dbg_value(i32 4, !116, !DIExpression(), !1225)
    #dbg_value(ptr undef, !117, !DIExpression(), !1225)
    #dbg_value(ptr %262, !119, !DIExpression(), !1225)
    #dbg_value(i32 0, !122, !DIExpression(), !1314)
  %263 = load i8, ptr %262, align 1, !dbg !1315, !tbaa !132
    #dbg_value(i8 %263, !1183, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1312)
    #dbg_value(i32 1, !122, !DIExpression(), !1314)
  %264 = getelementptr inbounds nuw i8, ptr %262, i32 1, !dbg !1315
  %265 = load i8, ptr %264, align 1, !dbg !1315, !tbaa !132
    #dbg_value(i8 %265, !1183, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1312)
    #dbg_value(i32 2, !122, !DIExpression(), !1314)
  %266 = getelementptr inbounds nuw i8, ptr %262, i32 2, !dbg !1315
  %267 = load i8, ptr %266, align 1, !dbg !1315, !tbaa !132
    #dbg_value(i8 %267, !1183, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1312)
    #dbg_value(i32 3, !122, !DIExpression(), !1314)
  %268 = getelementptr inbounds nuw i8, ptr %262, i32 3, !dbg !1315
  %269 = load i8, ptr %268, align 1, !dbg !1315, !tbaa !132
    #dbg_value(i8 %269, !1183, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1312)
    #dbg_value(i32 4, !122, !DIExpression(), !1314)
  %270 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1316
  %271 = load ptr, ptr %270, align 4, !dbg !1316, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1227)
    #dbg_value(ptr %271, !115, !DIExpression(), !1227)
    #dbg_value(i32 4, !116, !DIExpression(), !1227)
    #dbg_value(ptr undef, !117, !DIExpression(), !1227)
    #dbg_value(ptr %271, !119, !DIExpression(), !1227)
    #dbg_value(i32 0, !122, !DIExpression(), !1317)
  %272 = load i8, ptr %271, align 1, !dbg !1318, !tbaa !132
    #dbg_value(i8 %272, !1184, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1312)
    #dbg_value(i32 1, !122, !DIExpression(), !1317)
  %273 = getelementptr inbounds nuw i8, ptr %271, i32 1, !dbg !1318
  %274 = load i8, ptr %273, align 1, !dbg !1318, !tbaa !132
    #dbg_value(i8 %274, !1184, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1312)
    #dbg_value(i32 2, !122, !DIExpression(), !1317)
  %275 = getelementptr inbounds nuw i8, ptr %271, i32 2, !dbg !1318
  %276 = load i8, ptr %275, align 1, !dbg !1318, !tbaa !132
    #dbg_value(i8 %276, !1184, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1312)
    #dbg_value(i32 3, !122, !DIExpression(), !1317)
  %277 = getelementptr inbounds nuw i8, ptr %271, i32 3, !dbg !1318
  %278 = load i8, ptr %277, align 1, !dbg !1318, !tbaa !132
    #dbg_value(i8 %278, !1184, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1312)
    #dbg_value(i32 4, !122, !DIExpression(), !1317)
  %279 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1319
  %280 = load ptr, ptr %279, align 4, !dbg !1319, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1229)
    #dbg_value(ptr %280, !115, !DIExpression(), !1229)
    #dbg_value(i32 4, !116, !DIExpression(), !1229)
    #dbg_value(ptr undef, !117, !DIExpression(), !1229)
    #dbg_value(ptr %280, !119, !DIExpression(), !1229)
    #dbg_value(i32 0, !122, !DIExpression(), !1320)
  %281 = load i8, ptr %280, align 1, !dbg !1321, !tbaa !132
    #dbg_value(i8 %281, !1185, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1312)
    #dbg_value(i32 1, !122, !DIExpression(), !1320)
  %282 = getelementptr inbounds nuw i8, ptr %280, i32 1, !dbg !1321
  %283 = load i8, ptr %282, align 1, !dbg !1321, !tbaa !132
    #dbg_value(i8 %283, !1185, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1312)
    #dbg_value(i32 2, !122, !DIExpression(), !1320)
  %284 = getelementptr inbounds nuw i8, ptr %280, i32 2, !dbg !1321
  %285 = load i8, ptr %284, align 1, !dbg !1321, !tbaa !132
    #dbg_value(i8 %285, !1185, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1312)
    #dbg_value(i32 3, !122, !DIExpression(), !1320)
  %286 = getelementptr inbounds nuw i8, ptr %280, i32 3, !dbg !1321
  %287 = load i8, ptr %286, align 1, !dbg !1321, !tbaa !132
    #dbg_value(i8 %287, !1185, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1312)
    #dbg_value(i32 4, !122, !DIExpression(), !1320)
  %288 = zext i8 %260 to i32, !dbg !1322
  %289 = shl nuw i32 %288, 24, !dbg !1322
  %290 = zext i8 %258 to i32, !dbg !1322
  %291 = shl nuw nsw i32 %290, 16, !dbg !1322
  %292 = or disjoint i32 %289, %291, !dbg !1322
  %293 = zext i8 %256 to i32, !dbg !1322
  %294 = shl nuw nsw i32 %293, 8, !dbg !1322
  %295 = or disjoint i32 %292, %294, !dbg !1322
  %296 = zext i8 %254 to i32, !dbg !1322
  %297 = or disjoint i32 %295, %296, !dbg !1322
  %298 = zext i8 %269 to i32, !dbg !1323
  %299 = shl nuw i32 %298, 24, !dbg !1323
  %300 = zext i8 %267 to i32, !dbg !1323
  %301 = shl nuw nsw i32 %300, 16, !dbg !1323
  %302 = or disjoint i32 %299, %301, !dbg !1323
  %303 = zext i8 %265 to i32, !dbg !1323
  %304 = shl nuw nsw i32 %303, 8, !dbg !1323
  %305 = or disjoint i32 %302, %304, !dbg !1323
  %306 = zext i8 %263 to i32, !dbg !1323
  %307 = or disjoint i32 %305, %306, !dbg !1323
  %308 = zext i8 %278 to i32, !dbg !1324
  %309 = shl nuw i32 %308, 24, !dbg !1324
  %310 = zext i8 %276 to i32, !dbg !1324
  %311 = shl nuw nsw i32 %310, 16, !dbg !1324
  %312 = or disjoint i32 %309, %311, !dbg !1324
  %313 = zext i8 %274 to i32, !dbg !1324
  %314 = shl nuw nsw i32 %313, 8, !dbg !1324
  %315 = or disjoint i32 %312, %314, !dbg !1324
  %316 = zext i8 %272 to i32, !dbg !1324
  %317 = or disjoint i32 %315, %316, !dbg !1324
  %318 = zext i8 %287 to i32, !dbg !1325
  %319 = shl nuw i32 %318, 24, !dbg !1325
  %320 = zext i8 %285 to i32, !dbg !1325
  %321 = shl nuw nsw i32 %320, 16, !dbg !1325
  %322 = or disjoint i32 %319, %321, !dbg !1325
  %323 = zext i8 %283 to i32, !dbg !1325
  %324 = shl nuw nsw i32 %323, 8, !dbg !1325
  %325 = or disjoint i32 %322, %324, !dbg !1325
  %326 = zext i8 %281 to i32, !dbg !1325
  %327 = or disjoint i32 %325, %326, !dbg !1325
    #dbg_value(i32 %297, !402, !DIExpression(), !1327)
    #dbg_value(i32 %307, !403, !DIExpression(), !1327)
    #dbg_value(i32 %317, !404, !DIExpression(), !1327)
    #dbg_value(i32 %327, !405, !DIExpression(), !1327)
    #dbg_value(i32 %297, !406, !DIExpression(), !1327)
  %328 = icmp ult i32 %297, %317, !dbg !1325
  %329 = add i32 %327, %307, !dbg !1328
  %330 = mul i32 %307, 3, !dbg !1328
  %331 = select i1 %328, i32 %329, i32 %330, !dbg !1328
    #dbg_value(i32 %331, !407, !DIExpression(), !1327)
    #dbg_value(i32 %331, !1186, !DIExpression(), !1312)
  br label %475

332:                                              ; preds = %3
  %333 = load ptr, ptr %1, align 4, !dbg !1329, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1231)
    #dbg_value(ptr %333, !115, !DIExpression(), !1231)
    #dbg_value(i32 4, !116, !DIExpression(), !1231)
    #dbg_value(ptr undef, !117, !DIExpression(), !1231)
    #dbg_value(ptr %333, !119, !DIExpression(), !1231)
    #dbg_value(i32 0, !122, !DIExpression(), !1330)
  %334 = load i8, ptr %333, align 1, !dbg !1331, !tbaa !132
    #dbg_value(i8 %334, !1187, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1332)
    #dbg_value(i32 1, !122, !DIExpression(), !1330)
  %335 = getelementptr inbounds nuw i8, ptr %333, i32 1, !dbg !1331
  %336 = load i8, ptr %335, align 1, !dbg !1331, !tbaa !132
    #dbg_value(i8 %336, !1187, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1332)
    #dbg_value(i32 2, !122, !DIExpression(), !1330)
  %337 = getelementptr inbounds nuw i8, ptr %333, i32 2, !dbg !1331
  %338 = load i8, ptr %337, align 1, !dbg !1331, !tbaa !132
    #dbg_value(i8 %338, !1187, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1332)
    #dbg_value(i32 3, !122, !DIExpression(), !1330)
  %339 = getelementptr inbounds nuw i8, ptr %333, i32 3, !dbg !1331
  %340 = load i8, ptr %339, align 1, !dbg !1331, !tbaa !132
    #dbg_value(i8 %340, !1187, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1332)
    #dbg_value(i32 4, !122, !DIExpression(), !1330)
  %341 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1333
  %342 = load ptr, ptr %341, align 4, !dbg !1333, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1233)
    #dbg_value(ptr %342, !115, !DIExpression(), !1233)
    #dbg_value(i32 4, !116, !DIExpression(), !1233)
    #dbg_value(ptr undef, !117, !DIExpression(), !1233)
    #dbg_value(ptr %342, !119, !DIExpression(), !1233)
    #dbg_value(i32 0, !122, !DIExpression(), !1334)
  %343 = load i8, ptr %342, align 1, !dbg !1335, !tbaa !132
    #dbg_value(i8 %343, !1189, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1332)
    #dbg_value(i32 1, !122, !DIExpression(), !1334)
  %344 = getelementptr inbounds nuw i8, ptr %342, i32 1, !dbg !1335
  %345 = load i8, ptr %344, align 1, !dbg !1335, !tbaa !132
    #dbg_value(i8 %345, !1189, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1332)
    #dbg_value(i32 2, !122, !DIExpression(), !1334)
  %346 = getelementptr inbounds nuw i8, ptr %342, i32 2, !dbg !1335
  %347 = load i8, ptr %346, align 1, !dbg !1335, !tbaa !132
    #dbg_value(i8 %347, !1189, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1332)
    #dbg_value(i32 3, !122, !DIExpression(), !1334)
  %348 = getelementptr inbounds nuw i8, ptr %342, i32 3, !dbg !1335
  %349 = load i8, ptr %348, align 1, !dbg !1335, !tbaa !132
    #dbg_value(i8 %349, !1189, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1332)
    #dbg_value(i32 4, !122, !DIExpression(), !1334)
    #dbg_value(i32 poison, !122, !DIExpression(), !1336)
  %350 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1338
  %351 = load ptr, ptr %350, align 4, !dbg !1338, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1235)
    #dbg_value(ptr %351, !115, !DIExpression(), !1235)
    #dbg_value(i32 4, !116, !DIExpression(), !1235)
    #dbg_value(ptr undef, !117, !DIExpression(), !1235)
    #dbg_value(ptr %351, !119, !DIExpression(), !1235)
    #dbg_value(i32 0, !122, !DIExpression(), !1339)
  %352 = load i8, ptr %351, align 1, !dbg !1340, !tbaa !132
    #dbg_value(i8 %352, !1191, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1332)
    #dbg_value(i32 1, !122, !DIExpression(), !1339)
  %353 = getelementptr inbounds nuw i8, ptr %351, i32 1, !dbg !1340
  %354 = load i8, ptr %353, align 1, !dbg !1340, !tbaa !132
    #dbg_value(i8 %354, !1191, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1332)
    #dbg_value(i32 2, !122, !DIExpression(), !1339)
  %355 = getelementptr inbounds nuw i8, ptr %351, i32 2, !dbg !1340
  %356 = load i8, ptr %355, align 1, !dbg !1340, !tbaa !132
    #dbg_value(i8 %356, !1191, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1332)
    #dbg_value(i32 3, !122, !DIExpression(), !1339)
  %357 = getelementptr inbounds nuw i8, ptr %351, i32 3, !dbg !1340
  %358 = load i8, ptr %357, align 1, !dbg !1340, !tbaa !132
    #dbg_value(i8 %358, !1191, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1332)
    #dbg_value(i32 4, !122, !DIExpression(), !1339)
  %359 = zext i8 %340 to i32, !dbg !1341
  %360 = shl nuw i32 %359, 24, !dbg !1341
  %361 = zext i8 %338 to i32, !dbg !1341
  %362 = shl nuw nsw i32 %361, 16, !dbg !1341
  %363 = or disjoint i32 %360, %362, !dbg !1341
  %364 = zext i8 %336 to i32, !dbg !1341
  %365 = shl nuw nsw i32 %364, 8, !dbg !1341
  %366 = or disjoint i32 %363, %365, !dbg !1341
  %367 = zext i8 %334 to i32, !dbg !1341
  %368 = or disjoint i32 %366, %367, !dbg !1341
  %369 = zext i8 %349 to i32, !dbg !1342
  %370 = shl nuw i32 %369, 24, !dbg !1342
  %371 = zext i8 %347 to i32, !dbg !1342
  %372 = shl nuw nsw i32 %371, 16, !dbg !1342
  %373 = or disjoint i32 %370, %372, !dbg !1342
  %374 = zext i8 %345 to i32, !dbg !1342
  %375 = shl nuw nsw i32 %374, 8, !dbg !1342
  %376 = or disjoint i32 %373, %375, !dbg !1342
  %377 = zext i8 %343 to i32, !dbg !1342
  %378 = or disjoint i32 %376, %377, !dbg !1342
  %379 = zext i8 %358 to i32, !dbg !1343
  %380 = shl nuw i32 %379, 24, !dbg !1343
  %381 = zext i8 %356 to i32, !dbg !1343
  %382 = shl nuw nsw i32 %381, 16, !dbg !1343
  %383 = or disjoint i32 %380, %382, !dbg !1343
  %384 = zext i8 %354 to i32, !dbg !1343
  %385 = shl nuw nsw i32 %384, 8, !dbg !1343
  %386 = or disjoint i32 %383, %385, !dbg !1343
  %387 = zext i8 %352 to i32, !dbg !1343
  %388 = or disjoint i32 %386, %387, !dbg !1343
    #dbg_value(i32 %368, !419, !DIExpression(), !1345)
    #dbg_value(i32 %378, !420, !DIExpression(), !1345)
    #dbg_value(i32 poison, !421, !DIExpression(), !1345)
    #dbg_value(i32 %388, !422, !DIExpression(), !1345)
    #dbg_value(i32 %368, !423, !DIExpression(), !1345)
    #dbg_value(i32 %378, !424, !DIExpression(), !1345)
    #dbg_value(i32 poison, !425, !DIExpression(), !1345)
    #dbg_value(i32 %388, !426, !DIExpression(), !1345)
    #dbg_value(i32 %368, !427, !DIExpression(), !1345)
  %389 = icmp ult i32 %368, %378, !dbg !1343
  %390 = icmp eq i32 %388, 0, !dbg !1346
  br i1 %389, label %391, label %397, !dbg !1347

391:                                              ; preds = %332
    #dbg_value(i32 %368, !429, !DIExpression(), !1348)
    #dbg_value(i32 %388, !432, !DIExpression(), !1348)
  br i1 %390, label %394, label %392, !dbg !1349

392:                                              ; preds = %391
  %393 = udiv i32 %368, %388, !dbg !1350
    #dbg_value(i32 %393, !433, !DIExpression(), !1348)
  br label %394

394:                                              ; preds = %392, %391
  %395 = phi i32 [ %393, %392 ], [ 0, %391 ], !dbg !1351
    #dbg_value(i32 %395, !433, !DIExpression(), !1348)
    #dbg_value(i32 %395, !434, !DIExpression(), !1348)
  %396 = add i32 %395, %378, !dbg !1352
    #dbg_value(i32 %396, !428, !DIExpression(), !1345)
  br label %475, !dbg !1353

397:                                              ; preds = %332
    #dbg_value(i32 %378, !435, !DIExpression(), !1354)
    #dbg_value(i32 %388, !437, !DIExpression(), !1354)
  br i1 %390, label %400, label %398, !dbg !1355

398:                                              ; preds = %397
  %399 = urem i32 %378, %388, !dbg !1356
    #dbg_value(i32 %399, !438, !DIExpression(), !1354)
  br label %400

400:                                              ; preds = %398, %397
  %401 = phi i32 [ %399, %398 ], [ 0, %397 ], !dbg !1357
    #dbg_value(i32 %401, !438, !DIExpression(), !1354)
    #dbg_value(i32 %401, !439, !DIExpression(), !1354)
  %402 = add i32 %401, %368, !dbg !1358
    #dbg_value(i32 %402, !428, !DIExpression(), !1345)
  br label %475

403:                                              ; preds = %3
  %404 = load ptr, ptr %1, align 4, !dbg !1359, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1237)
    #dbg_value(ptr %404, !115, !DIExpression(), !1237)
    #dbg_value(i32 4, !116, !DIExpression(), !1237)
    #dbg_value(ptr undef, !117, !DIExpression(), !1237)
    #dbg_value(ptr %404, !119, !DIExpression(), !1237)
    #dbg_value(i32 0, !122, !DIExpression(), !1360)
  %405 = load i8, ptr %404, align 1, !dbg !1361, !tbaa !132
    #dbg_value(i8 %405, !1193, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1362)
    #dbg_value(i32 1, !122, !DIExpression(), !1360)
  %406 = getelementptr inbounds nuw i8, ptr %404, i32 1, !dbg !1361
  %407 = load i8, ptr %406, align 1, !dbg !1361, !tbaa !132
    #dbg_value(i8 %407, !1193, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1362)
    #dbg_value(i32 2, !122, !DIExpression(), !1360)
  %408 = getelementptr inbounds nuw i8, ptr %404, i32 2, !dbg !1361
  %409 = load i8, ptr %408, align 1, !dbg !1361, !tbaa !132
    #dbg_value(i8 %409, !1193, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1362)
    #dbg_value(i32 3, !122, !DIExpression(), !1360)
  %410 = getelementptr inbounds nuw i8, ptr %404, i32 3, !dbg !1361
  %411 = load i8, ptr %410, align 1, !dbg !1361, !tbaa !132
    #dbg_value(i8 %411, !1193, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1362)
    #dbg_value(i32 4, !122, !DIExpression(), !1360)
  %412 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1363
  %413 = load ptr, ptr %412, align 4, !dbg !1363, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1239)
    #dbg_value(ptr %413, !115, !DIExpression(), !1239)
    #dbg_value(i32 4, !116, !DIExpression(), !1239)
    #dbg_value(ptr undef, !117, !DIExpression(), !1239)
    #dbg_value(ptr %413, !119, !DIExpression(), !1239)
    #dbg_value(i32 0, !122, !DIExpression(), !1364)
  %414 = load i8, ptr %413, align 1, !dbg !1365, !tbaa !132
    #dbg_value(i8 %414, !1195, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1362)
    #dbg_value(i32 1, !122, !DIExpression(), !1364)
  %415 = getelementptr inbounds nuw i8, ptr %413, i32 1, !dbg !1365
  %416 = load i8, ptr %415, align 1, !dbg !1365, !tbaa !132
    #dbg_value(i8 %416, !1195, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1362)
    #dbg_value(i32 2, !122, !DIExpression(), !1364)
  %417 = getelementptr inbounds nuw i8, ptr %413, i32 2, !dbg !1365
  %418 = load i8, ptr %417, align 1, !dbg !1365, !tbaa !132
    #dbg_value(i8 %418, !1195, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1362)
    #dbg_value(i32 3, !122, !DIExpression(), !1364)
  %419 = getelementptr inbounds nuw i8, ptr %413, i32 3, !dbg !1365
  %420 = load i8, ptr %419, align 1, !dbg !1365, !tbaa !132
    #dbg_value(i8 %420, !1195, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1362)
    #dbg_value(i32 4, !122, !DIExpression(), !1364)
    #dbg_value(i32 poison, !122, !DIExpression(), !1366)
  %421 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1368
  %422 = load ptr, ptr %421, align 4, !dbg !1368, !tbaa !634
    #dbg_value(ptr undef, !110, !DIExpression(), !1241)
    #dbg_value(ptr %422, !115, !DIExpression(), !1241)
    #dbg_value(i32 4, !116, !DIExpression(), !1241)
    #dbg_value(ptr undef, !117, !DIExpression(), !1241)
    #dbg_value(ptr %422, !119, !DIExpression(), !1241)
    #dbg_value(i32 0, !122, !DIExpression(), !1369)
  %423 = load i8, ptr %422, align 1, !dbg !1370, !tbaa !132
    #dbg_value(i8 %423, !1197, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1362)
    #dbg_value(i32 1, !122, !DIExpression(), !1369)
  %424 = getelementptr inbounds nuw i8, ptr %422, i32 1, !dbg !1370
  %425 = load i8, ptr %424, align 1, !dbg !1370, !tbaa !132
    #dbg_value(i8 %425, !1197, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1362)
    #dbg_value(i32 2, !122, !DIExpression(), !1369)
  %426 = getelementptr inbounds nuw i8, ptr %422, i32 2, !dbg !1370
  %427 = load i8, ptr %426, align 1, !dbg !1370, !tbaa !132
    #dbg_value(i8 %427, !1197, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1362)
    #dbg_value(i32 3, !122, !DIExpression(), !1369)
  %428 = getelementptr inbounds nuw i8, ptr %422, i32 3, !dbg !1370
  %429 = load i8, ptr %428, align 1, !dbg !1370, !tbaa !132
    #dbg_value(i8 %429, !1197, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1362)
    #dbg_value(i32 4, !122, !DIExpression(), !1369)
  %430 = zext i8 %411 to i32, !dbg !1371
  %431 = shl nuw i32 %430, 24, !dbg !1371
  %432 = zext i8 %409 to i32, !dbg !1371
  %433 = shl nuw nsw i32 %432, 16, !dbg !1371
  %434 = or disjoint i32 %431, %433, !dbg !1371
  %435 = zext i8 %407 to i32, !dbg !1371
  %436 = shl nuw nsw i32 %435, 8, !dbg !1371
  %437 = or disjoint i32 %434, %436, !dbg !1371
  %438 = zext i8 %405 to i32, !dbg !1371
  %439 = or disjoint i32 %437, %438, !dbg !1371
  %440 = zext i8 %420 to i32, !dbg !1372
  %441 = shl nuw i32 %440, 24, !dbg !1372
  %442 = zext i8 %418 to i32, !dbg !1372
  %443 = shl nuw nsw i32 %442, 16, !dbg !1372
  %444 = or disjoint i32 %441, %443, !dbg !1372
  %445 = zext i8 %416 to i32, !dbg !1372
  %446 = shl nuw nsw i32 %445, 8, !dbg !1372
  %447 = or disjoint i32 %444, %446, !dbg !1372
  %448 = zext i8 %414 to i32, !dbg !1372
  %449 = or disjoint i32 %447, %448, !dbg !1372
  %450 = zext i8 %429 to i32, !dbg !1373
  %451 = shl nuw i32 %450, 24, !dbg !1373
  %452 = zext i8 %427 to i32, !dbg !1373
  %453 = shl nuw nsw i32 %452, 16, !dbg !1373
  %454 = or disjoint i32 %451, %453, !dbg !1373
  %455 = zext i8 %425 to i32, !dbg !1373
  %456 = shl nuw nsw i32 %455, 8, !dbg !1373
  %457 = or disjoint i32 %454, %456, !dbg !1373
  %458 = zext i8 %423 to i32, !dbg !1373
  %459 = or disjoint i32 %457, %458, !dbg !1373
    #dbg_value(i32 %439, !462, !DIExpression(), !1375)
    #dbg_value(i32 %449, !463, !DIExpression(), !1375)
    #dbg_value(i32 poison, !464, !DIExpression(), !1375)
    #dbg_value(i32 %459, !465, !DIExpression(), !1375)
    #dbg_value(i32 %439, !466, !DIExpression(), !1375)
  %460 = icmp ult i32 %439, %449, !dbg !1373
  %461 = icmp eq i32 %459, 0, !dbg !1376
  br i1 %460, label %462, label %468, !dbg !1377

462:                                              ; preds = %403
    #dbg_value(i32 %439, !468, !DIExpression(), !1378)
    #dbg_value(i32 %459, !471, !DIExpression(), !1378)
  br i1 %461, label %465, label %463, !dbg !1379

463:                                              ; preds = %462
  %464 = udiv i32 %439, %459, !dbg !1380
    #dbg_value(i32 %464, !472, !DIExpression(), !1378)
  br label %465

465:                                              ; preds = %463, %462
  %466 = phi i32 [ %464, %463 ], [ 0, %462 ], !dbg !1381
    #dbg_value(i32 %466, !472, !DIExpression(), !1378)
    #dbg_value(i32 %466, !473, !DIExpression(), !1378)
  %467 = add i32 %466, %449, !dbg !1382
    #dbg_value(i32 %467, !467, !DIExpression(), !1375)
  br label %475, !dbg !1383

468:                                              ; preds = %403
    #dbg_value(i32 %449, !474, !DIExpression(), !1384)
    #dbg_value(i32 %459, !476, !DIExpression(), !1384)
  br i1 %461, label %471, label %469, !dbg !1385

469:                                              ; preds = %468
  %470 = urem i32 %449, %459, !dbg !1386
    #dbg_value(i32 %470, !477, !DIExpression(), !1384)
  br label %471

471:                                              ; preds = %469, %468
  %472 = phi i32 [ %470, %469 ], [ 0, %468 ], !dbg !1387
    #dbg_value(i32 %472, !477, !DIExpression(), !1384)
    #dbg_value(i32 %472, !478, !DIExpression(), !1384)
  %473 = add i32 %472, %439, !dbg !1388
    #dbg_value(i32 %473, !467, !DIExpression(), !1375)
  br label %475

474:                                              ; preds = %3
  tail call void @llvm.trap(), !dbg !1389
  unreachable, !dbg !1391

475:                                              ; preds = %471, %465, %400, %394, %252, %172, %169, %85
  %476 = phi i32 [ %331, %252 ], [ %251, %172 ], [ %171, %169 ], [ %87, %85 ], [ %396, %394 ], [ %402, %400 ], [ %467, %465 ], [ %473, %471 ], !dbg !1243
  ret i32 %476, !dbg !1392
}

; Function Attrs: cold noreturn nounwind memory(inaccessiblemem: write) uwtable
define hidden noundef i64 @ink_compute_scalar64(i32 noundef %0, ptr nocapture noundef readnone %1, ptr nocapture noundef readnone %2) local_unnamed_addr #11 !dbg !1393 {
    #dbg_value(i32 %0, !1399, !DIExpression(), !1402)
    #dbg_value(ptr %1, !1400, !DIExpression(), !1402)
    #dbg_value(ptr %2, !1401, !DIExpression(), !1402)
  tail call void @llvm.trap(), !dbg !1403
  unreachable, !dbg !1406
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
!3 = !DIFile(filename: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_heldout_u32/checked/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
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
!15 = !DIFile(filename: "reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_heldout_u32/checked/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
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
!167 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_heldout_u32", scope: !15, file: !15, line: 85, type: !168, scopeLine: 85, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !175)
!168 = !DISubroutineType(types: !169)
!169 = !{!170, !170, !170, !10, !10}
!170 = !DIDerivedType(tag: DW_TAG_typedef, name: "ink_l_uint32", file: !15, line: 65, baseType: !171)
!171 = distinct !DICompositeType(tag: DW_TAG_structure_type, file: !15, line: 65, size: 64, elements: !172)
!172 = !{!173, !174}
!173 = !DIDerivedType(tag: DW_TAG_member, name: "data", scope: !171, file: !15, line: 65, baseType: !13, size: 32)
!174 = !DIDerivedType(tag: DW_TAG_member, name: "len", scope: !171, file: !15, line: 65, baseType: !5, size: 32, offset: 32)
!175 = !{!176, !177, !178, !179, !180, !181, !182, !184, !187, !188, !189, !190, !191, !192, !193, !194, !195, !196, !197, !198, !199, !200, !201, !202, !203, !204, !205, !206, !207, !208, !209, !210, !211, !212, !213, !216, !218, !219, !220, !221, !222, !223, !224, !225, !226, !227, !230, !231, !232, !233, !235, !236, !237}
!176 = !DILocalVariable(name: "a0", arg: 1, scope: !167, file: !15, line: 85, type: !170)
!177 = !DILocalVariable(name: "a1", arg: 2, scope: !167, file: !15, line: 85, type: !170)
!178 = !DILocalVariable(name: "a2", arg: 3, scope: !167, file: !15, line: 85, type: !10)
!179 = !DILocalVariable(name: "a3", arg: 4, scope: !167, file: !15, line: 85, type: !10)
!180 = !DILocalVariable(name: "t0", scope: !167, file: !15, line: 90, type: !170)
!181 = !DILocalVariable(name: "t1", scope: !167, file: !15, line: 92, type: !170)
!182 = !DILocalVariable(name: "t2", scope: !183, file: !15, line: 93, type: !5)
!183 = distinct !DILexicalBlock(scope: !167, file: !15, line: 93, column: 1)
!184 = !DILocalVariable(name: "t3", scope: !185, file: !15, line: 94, type: !10)
!185 = distinct !DILexicalBlock(scope: !186, file: !15, line: 93, column: 32)
!186 = distinct !DILexicalBlock(scope: !183, file: !15, line: 93, column: 1)
!187 = !DILocalVariable(name: "t4", scope: !185, file: !15, line: 96, type: !10)
!188 = !DILocalVariable(name: "t5", scope: !185, file: !15, line: 98, type: !10)
!189 = !DILocalVariable(name: "t6", scope: !185, file: !15, line: 100, type: !10)
!190 = !DILocalVariable(name: "t7", scope: !185, file: !15, line: 103, type: !10)
!191 = !DILocalVariable(name: "t8", scope: !185, file: !15, line: 105, type: !10)
!192 = !DILocalVariable(name: "t9", scope: !185, file: !15, line: 107, type: !10)
!193 = !DILocalVariable(name: "t10", scope: !185, file: !15, line: 109, type: !10)
!194 = !DILocalVariable(name: "t11", scope: !185, file: !15, line: 112, type: !10)
!195 = !DILocalVariable(name: "t12", scope: !185, file: !15, line: 114, type: !10)
!196 = !DILocalVariable(name: "t13", scope: !185, file: !15, line: 116, type: !10)
!197 = !DILocalVariable(name: "t14", scope: !185, file: !15, line: 120, type: !10)
!198 = !DILocalVariable(name: "t15", scope: !185, file: !15, line: 122, type: !10)
!199 = !DILocalVariable(name: "t16", scope: !185, file: !15, line: 124, type: !10)
!200 = !DILocalVariable(name: "t17", scope: !185, file: !15, line: 126, type: !10)
!201 = !DILocalVariable(name: "t18", scope: !185, file: !15, line: 130, type: !10)
!202 = !DILocalVariable(name: "t19", scope: !185, file: !15, line: 132, type: !10)
!203 = !DILocalVariable(name: "t20", scope: !185, file: !15, line: 134, type: !10)
!204 = !DILocalVariable(name: "t21", scope: !185, file: !15, line: 136, type: !10)
!205 = !DILocalVariable(name: "t22", scope: !185, file: !15, line: 138, type: !10)
!206 = !DILocalVariable(name: "t23", scope: !185, file: !15, line: 140, type: !10)
!207 = !DILocalVariable(name: "t24", scope: !185, file: !15, line: 143, type: !10)
!208 = !DILocalVariable(name: "t25", scope: !185, file: !15, line: 145, type: !10)
!209 = !DILocalVariable(name: "t26", scope: !185, file: !15, line: 147, type: !10)
!210 = !DILocalVariable(name: "t27", scope: !185, file: !15, line: 149, type: !10)
!211 = !DILocalVariable(name: "t28", scope: !185, file: !15, line: 152, type: !10)
!212 = !DILocalVariable(name: "t29", scope: !185, file: !15, line: 154, type: !10)
!213 = !DILocalVariable(name: "t30", scope: !214, file: !15, line: 156, type: !10)
!214 = distinct !DILexicalBlock(scope: !215, file: !15, line: 155, column: 18)
!215 = distinct !DILexicalBlock(scope: !185, file: !15, line: 155, column: 5)
!216 = !DILocalVariable(name: "t31", scope: !217, file: !15, line: 160, type: !10)
!217 = distinct !DILexicalBlock(scope: !215, file: !15, line: 159, column: 8)
!218 = !DILocalVariable(name: "t32", scope: !185, file: !15, line: 164, type: !10)
!219 = !DILocalVariable(name: "t33", scope: !185, file: !15, line: 166, type: !10)
!220 = !DILocalVariable(name: "t34", scope: !185, file: !15, line: 168, type: !10)
!221 = !DILocalVariable(name: "t35", scope: !185, file: !15, line: 171, type: !10)
!222 = !DILocalVariable(name: "t36", scope: !185, file: !15, line: 173, type: !10)
!223 = !DILocalVariable(name: "t37", scope: !185, file: !15, line: 175, type: !10)
!224 = !DILocalVariable(name: "t38", scope: !185, file: !15, line: 177, type: !10)
!225 = !DILocalVariable(name: "t39", scope: !185, file: !15, line: 180, type: !10)
!226 = !DILocalVariable(name: "t40", scope: !185, file: !15, line: 182, type: !10)
!227 = !DILocalVariable(name: "t41", scope: !228, file: !15, line: 184, type: !10)
!228 = distinct !DILexicalBlock(scope: !229, file: !15, line: 183, column: 18)
!229 = distinct !DILexicalBlock(scope: !185, file: !15, line: 183, column: 5)
!230 = !DILocalVariable(name: "t42", scope: !228, file: !15, line: 186, type: !10)
!231 = !DILocalVariable(name: "t43", scope: !228, file: !15, line: 188, type: !10)
!232 = !DILocalVariable(name: "t44", scope: !228, file: !15, line: 192, type: !10)
!233 = !DILocalVariable(name: "t45", scope: !234, file: !15, line: 196, type: !10)
!234 = distinct !DILexicalBlock(scope: !229, file: !15, line: 195, column: 8)
!235 = !DILocalVariable(name: "t46", scope: !234, file: !15, line: 198, type: !10)
!236 = !DILocalVariable(name: "t47", scope: !234, file: !15, line: 200, type: !10)
!237 = !DILocalVariable(name: "t48", scope: !234, file: !15, line: 204, type: !10)
!238 = !DILocation(line: 85, column: 75, scope: !167)
!239 = !DILocation(line: 85, column: 91, scope: !167)
!240 = !DILocation(line: 0, scope: !167)
!241 = !DILocation(line: 90, column: 17, scope: !167)
!242 = !{!243, !243, i64 0}
!243 = !{!"p1 int", !244, i64 0}
!244 = !{!"any pointer", !29, i64 0}
!245 = !DILocation(line: 92, column: 14, scope: !167)
!246 = !DILocation(line: 0, scope: !51, inlinedAt: !247)
!247 = distinct !DILocation(line: 92, column: 18, scope: !167)
!248 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !247)
!249 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !247)
!250 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !251)
!251 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !247)
!252 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !251)
!253 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !247)
!254 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !247)
!255 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !247)
!256 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !247)
!257 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !247)
!258 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !247)
!259 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !247)
!260 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !247)
!261 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !262)
!262 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !247)
!263 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !262)
!264 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !247)
!265 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !247)
!266 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !247)
!267 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !247)
!268 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !247)
!269 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !247)
!270 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !247)
!271 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !247)
!272 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !247)
!273 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !247)
!274 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !275)
!275 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !247)
!276 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !275)
!277 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !247)
!278 = !DILocation(line: 92, column: 17, scope: !167)
!279 = !{!280, !243, i64 0}
!280 = !{!"", !243, i64 0, !28, i64 4}
!281 = !{!280, !28, i64 4}
!282 = !DILocation(line: 0, scope: !183)
!283 = !DILocation(line: 93, column: 19, scope: !186)
!284 = !DILocation(line: 93, column: 1, scope: !183)
!285 = !DILocation(line: 117, column: 8, scope: !286)
!286 = distinct !DILexicalBlock(scope: !185, file: !15, line: 117, column: 5)
!287 = !DILocation(line: 93, column: 29, scope: !186)
!288 = !DILocation(line: 96, column: 13, scope: !185)
!289 = !DILocation(line: 136, column: 14, scope: !185)
!290 = !{!291, !291, i64 0}
!291 = !{!"int", !29, i64 0}
!292 = !DILocation(line: 119, column: 18, scope: !293)
!293 = distinct !DILexicalBlock(scope: !286, file: !15, line: 119, column: 8)
!294 = !DILocation(line: 129, column: 18, scope: !295)
!295 = distinct !DILexicalBlock(scope: !296, file: !15, line: 129, column: 8)
!296 = distinct !DILexicalBlock(scope: !185, file: !15, line: 127, column: 5)
!297 = !DILocation(line: 132, column: 19, scope: !185)
!298 = !DILocation(line: 155, column: 10, scope: !215)
!299 = !DILocation(line: 155, column: 5, scope: !215)
!300 = !DILocation(line: 183, column: 10, scope: !229)
!301 = !DILocation(line: 183, column: 5, scope: !229)
!302 = !DILocation(line: 203, column: 18, scope: !303)
!303 = distinct !DILexicalBlock(scope: !304, file: !15, line: 203, column: 8)
!304 = distinct !DILexicalBlock(scope: !234, file: !15, line: 201, column: 5)
!305 = !DILocation(line: 191, column: 18, scope: !306)
!306 = distinct !DILexicalBlock(scope: !307, file: !15, line: 191, column: 8)
!307 = distinct !DILexicalBlock(scope: !228, file: !15, line: 189, column: 5)
!308 = !DILocation(line: 206, column: 10, scope: !234)
!309 = !DILocation(line: 194, column: 10, scope: !228)
!310 = !DILocation(line: 0, scope: !229)
!311 = !DILocation(line: 208, column: 1, scope: !185)
!312 = !DILocation(line: 208, column: 12, scope: !185)
!313 = distinct !{!313, !284, !314, !137, !138, !139}
!314 = !DILocation(line: 209, column: 1, scope: !183)
!315 = !DILocation(line: 211, column: 1, scope: !167)
!316 = !DILocation(line: 0, scope: !185)
!317 = !DILocation(line: 0, scope: !228)
!318 = !DILocation(line: 0, scope: !307)
!319 = !DILocation(line: 195, column: 1, scope: !228)
!320 = !DILocation(line: 0, scope: !234)
!321 = !DILocation(line: 0, scope: !304)
!322 = distinct !{!322, !284, !314, !137, !138}
!323 = distinct !DISubprogram(name: "lang_fn_left_word", scope: !15, file: !15, line: 212, type: !324, scopeLine: 212, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !326)
!324 = !DISubroutineType(types: !325)
!325 = !{!10, !10, !10, !10, !10}
!326 = !{!327, !328, !329, !330, !331, !332, !333, !334, !335, !336, !337, !338, !339, !340, !341, !342}
!327 = !DILocalVariable(name: "a0", arg: 1, scope: !323, file: !15, line: 212, type: !10)
!328 = !DILocalVariable(name: "a1", arg: 2, scope: !323, file: !15, line: 212, type: !10)
!329 = !DILocalVariable(name: "a2", arg: 3, scope: !323, file: !15, line: 212, type: !10)
!330 = !DILocalVariable(name: "a3", arg: 4, scope: !323, file: !15, line: 212, type: !10)
!331 = !DILocalVariable(name: "t0", scope: !323, file: !15, line: 217, type: !10)
!332 = !DILocalVariable(name: "t1", scope: !323, file: !15, line: 219, type: !10)
!333 = !DILocalVariable(name: "t2", scope: !323, file: !15, line: 221, type: !10)
!334 = !DILocalVariable(name: "t3", scope: !323, file: !15, line: 223, type: !10)
!335 = !DILocalVariable(name: "t4", scope: !323, file: !15, line: 226, type: !10)
!336 = !DILocalVariable(name: "t5", scope: !323, file: !15, line: 228, type: !10)
!337 = !DILocalVariable(name: "t6", scope: !323, file: !15, line: 230, type: !10)
!338 = !DILocalVariable(name: "t7", scope: !323, file: !15, line: 234, type: !10)
!339 = !DILocalVariable(name: "t8", scope: !323, file: !15, line: 236, type: !10)
!340 = !DILocalVariable(name: "t9", scope: !323, file: !15, line: 238, type: !10)
!341 = !DILocalVariable(name: "t10", scope: !323, file: !15, line: 240, type: !10)
!342 = !DILocalVariable(name: "t11", scope: !323, file: !15, line: 244, type: !10)
!343 = !DILocation(line: 0, scope: !323)
!344 = !DILocation(line: 231, column: 7, scope: !345)
!345 = distinct !DILexicalBlock(scope: !323, file: !15, line: 231, column: 5)
!346 = !DILocation(line: 233, column: 16, scope: !347)
!347 = distinct !DILexicalBlock(scope: !345, file: !15, line: 233, column: 8)
!348 = !DILocation(line: 243, column: 17, scope: !349)
!349 = distinct !DILexicalBlock(scope: !350, file: !15, line: 243, column: 8)
!350 = distinct !DILexicalBlock(scope: !323, file: !15, line: 241, column: 5)
!351 = !DILocation(line: 244, column: 18, scope: !323)
!352 = !DILocation(line: 246, column: 13, scope: !323)
!353 = !DILocation(line: 246, column: 1, scope: !323)
!354 = distinct !DISubprogram(name: "lang_fn_left_signal", scope: !15, file: !15, line: 248, type: !324, scopeLine: 248, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !355)
!355 = !{!356, !357, !358, !359, !360, !361, !362, !363, !364, !365, !366, !367}
!356 = !DILocalVariable(name: "a0", arg: 1, scope: !354, file: !15, line: 248, type: !10)
!357 = !DILocalVariable(name: "a1", arg: 2, scope: !354, file: !15, line: 248, type: !10)
!358 = !DILocalVariable(name: "a2", arg: 3, scope: !354, file: !15, line: 248, type: !10)
!359 = !DILocalVariable(name: "a3", arg: 4, scope: !354, file: !15, line: 248, type: !10)
!360 = !DILocalVariable(name: "t0", scope: !354, file: !15, line: 253, type: !10)
!361 = !DILocalVariable(name: "t1", scope: !354, file: !15, line: 255, type: !10)
!362 = !DILocalVariable(name: "t2", scope: !354, file: !15, line: 257, type: !10)
!363 = !DILocalVariable(name: "t3", scope: !354, file: !15, line: 261, type: !10)
!364 = !DILocalVariable(name: "t4", scope: !354, file: !15, line: 263, type: !10)
!365 = !DILocalVariable(name: "t5", scope: !354, file: !15, line: 265, type: !10)
!366 = !DILocalVariable(name: "t6", scope: !354, file: !15, line: 267, type: !10)
!367 = !DILocalVariable(name: "t7", scope: !354, file: !15, line: 271, type: !10)
!368 = !DILocation(line: 0, scope: !354)
!369 = !DILocation(line: 258, column: 7, scope: !370)
!370 = distinct !DILexicalBlock(scope: !354, file: !15, line: 258, column: 5)
!371 = !DILocation(line: 260, column: 16, scope: !372)
!372 = distinct !DILexicalBlock(scope: !370, file: !15, line: 260, column: 8)
!373 = !DILocation(line: 270, column: 16, scope: !374)
!374 = distinct !DILexicalBlock(scope: !375, file: !15, line: 270, column: 8)
!375 = distinct !DILexicalBlock(scope: !354, file: !15, line: 268, column: 5)
!376 = !DILocation(line: 271, column: 17, scope: !354)
!377 = !DILocation(line: 273, column: 12, scope: !354)
!378 = !DILocation(line: 273, column: 1, scope: !354)
!379 = distinct !DISubprogram(name: "lang_fn_right_word", scope: !15, file: !15, line: 275, type: !324, scopeLine: 275, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !380)
!380 = !{!381, !382, !383, !384, !385, !386, !387, !388, !389, !390, !391, !394}
!381 = !DILocalVariable(name: "a0", arg: 1, scope: !379, file: !15, line: 275, type: !10)
!382 = !DILocalVariable(name: "a1", arg: 2, scope: !379, file: !15, line: 275, type: !10)
!383 = !DILocalVariable(name: "a2", arg: 3, scope: !379, file: !15, line: 275, type: !10)
!384 = !DILocalVariable(name: "a3", arg: 4, scope: !379, file: !15, line: 275, type: !10)
!385 = !DILocalVariable(name: "t0", scope: !379, file: !15, line: 280, type: !10)
!386 = !DILocalVariable(name: "t1", scope: !379, file: !15, line: 282, type: !10)
!387 = !DILocalVariable(name: "t2", scope: !379, file: !15, line: 284, type: !10)
!388 = !DILocalVariable(name: "t3", scope: !379, file: !15, line: 286, type: !10)
!389 = !DILocalVariable(name: "t4", scope: !379, file: !15, line: 289, type: !10)
!390 = !DILocalVariable(name: "t5", scope: !379, file: !15, line: 291, type: !10)
!391 = !DILocalVariable(name: "t6", scope: !392, file: !15, line: 293, type: !10)
!392 = distinct !DILexicalBlock(scope: !393, file: !15, line: 292, column: 16)
!393 = distinct !DILexicalBlock(scope: !379, file: !15, line: 292, column: 5)
!394 = !DILocalVariable(name: "t7", scope: !395, file: !15, line: 297, type: !10)
!395 = distinct !DILexicalBlock(scope: !393, file: !15, line: 296, column: 8)
!396 = !DILocation(line: 0, scope: !379)
!397 = !DILocation(line: 292, column: 9, scope: !393)
!398 = !DILocation(line: 292, column: 5, scope: !393)
!399 = !DILocation(line: 301, column: 1, scope: !379)
!400 = distinct !DISubprogram(name: "lang_fn_right_signal", scope: !15, file: !15, line: 303, type: !324, scopeLine: 303, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !401)
!401 = !{!402, !403, !404, !405, !406, !407, !408, !411}
!402 = !DILocalVariable(name: "a0", arg: 1, scope: !400, file: !15, line: 303, type: !10)
!403 = !DILocalVariable(name: "a1", arg: 2, scope: !400, file: !15, line: 303, type: !10)
!404 = !DILocalVariable(name: "a2", arg: 3, scope: !400, file: !15, line: 303, type: !10)
!405 = !DILocalVariable(name: "a3", arg: 4, scope: !400, file: !15, line: 303, type: !10)
!406 = !DILocalVariable(name: "t0", scope: !400, file: !15, line: 308, type: !10)
!407 = !DILocalVariable(name: "t1", scope: !400, file: !15, line: 310, type: !10)
!408 = !DILocalVariable(name: "t2", scope: !409, file: !15, line: 312, type: !10)
!409 = distinct !DILexicalBlock(scope: !410, file: !15, line: 311, column: 16)
!410 = distinct !DILexicalBlock(scope: !400, file: !15, line: 311, column: 5)
!411 = !DILocalVariable(name: "t3", scope: !412, file: !15, line: 316, type: !10)
!412 = distinct !DILexicalBlock(scope: !410, file: !15, line: 315, column: 8)
!413 = !DILocation(line: 0, scope: !400)
!414 = !DILocation(line: 311, column: 9, scope: !410)
!415 = !DILocation(line: 311, column: 5, scope: !410)
!416 = !DILocation(line: 320, column: 1, scope: !400)
!417 = distinct !DISubprogram(name: "lang_fn_pair_word", scope: !15, file: !15, line: 322, type: !324, scopeLine: 322, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !418)
!418 = !{!419, !420, !421, !422, !423, !424, !425, !426, !427, !428, !429, !432, !433, !434, !435, !437, !438, !439}
!419 = !DILocalVariable(name: "a0", arg: 1, scope: !417, file: !15, line: 322, type: !10)
!420 = !DILocalVariable(name: "a1", arg: 2, scope: !417, file: !15, line: 322, type: !10)
!421 = !DILocalVariable(name: "a2", arg: 3, scope: !417, file: !15, line: 322, type: !10)
!422 = !DILocalVariable(name: "a3", arg: 4, scope: !417, file: !15, line: 322, type: !10)
!423 = !DILocalVariable(name: "t0", scope: !417, file: !15, line: 327, type: !10)
!424 = !DILocalVariable(name: "t1", scope: !417, file: !15, line: 329, type: !10)
!425 = !DILocalVariable(name: "t2", scope: !417, file: !15, line: 331, type: !10)
!426 = !DILocalVariable(name: "t3", scope: !417, file: !15, line: 333, type: !10)
!427 = !DILocalVariable(name: "t4", scope: !417, file: !15, line: 336, type: !10)
!428 = !DILocalVariable(name: "t5", scope: !417, file: !15, line: 338, type: !10)
!429 = !DILocalVariable(name: "t6", scope: !430, file: !15, line: 340, type: !10)
!430 = distinct !DILexicalBlock(scope: !431, file: !15, line: 339, column: 16)
!431 = distinct !DILexicalBlock(scope: !417, file: !15, line: 339, column: 5)
!432 = !DILocalVariable(name: "t7", scope: !430, file: !15, line: 342, type: !10)
!433 = !DILocalVariable(name: "t8", scope: !430, file: !15, line: 344, type: !10)
!434 = !DILocalVariable(name: "t9", scope: !430, file: !15, line: 348, type: !10)
!435 = !DILocalVariable(name: "t10", scope: !436, file: !15, line: 352, type: !10)
!436 = distinct !DILexicalBlock(scope: !431, file: !15, line: 351, column: 8)
!437 = !DILocalVariable(name: "t11", scope: !436, file: !15, line: 354, type: !10)
!438 = !DILocalVariable(name: "t12", scope: !436, file: !15, line: 356, type: !10)
!439 = !DILocalVariable(name: "t13", scope: !436, file: !15, line: 360, type: !10)
!440 = !DILocation(line: 0, scope: !417)
!441 = !DILocation(line: 339, column: 9, scope: !431)
!442 = !DILocation(line: 0, scope: !431)
!443 = !DILocation(line: 339, column: 5, scope: !431)
!444 = !DILocation(line: 0, scope: !430)
!445 = !DILocation(line: 345, column: 7, scope: !446)
!446 = distinct !DILexicalBlock(scope: !430, file: !15, line: 345, column: 5)
!447 = !DILocation(line: 347, column: 16, scope: !448)
!448 = distinct !DILexicalBlock(scope: !446, file: !15, line: 347, column: 8)
!449 = !DILocation(line: 0, scope: !446)
!450 = !DILocation(line: 350, column: 8, scope: !430)
!451 = !DILocation(line: 351, column: 1, scope: !430)
!452 = !DILocation(line: 0, scope: !436)
!453 = !DILocation(line: 357, column: 8, scope: !454)
!454 = distinct !DILexicalBlock(scope: !436, file: !15, line: 357, column: 5)
!455 = !DILocation(line: 359, column: 18, scope: !456)
!456 = distinct !DILexicalBlock(scope: !454, file: !15, line: 359, column: 8)
!457 = !DILocation(line: 0, scope: !454)
!458 = !DILocation(line: 362, column: 9, scope: !436)
!459 = !DILocation(line: 364, column: 1, scope: !417)
!460 = distinct !DISubprogram(name: "lang_fn_pair_signal", scope: !15, file: !15, line: 366, type: !324, scopeLine: 366, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !461)
!461 = !{!462, !463, !464, !465, !466, !467, !468, !471, !472, !473, !474, !476, !477, !478}
!462 = !DILocalVariable(name: "a0", arg: 1, scope: !460, file: !15, line: 366, type: !10)
!463 = !DILocalVariable(name: "a1", arg: 2, scope: !460, file: !15, line: 366, type: !10)
!464 = !DILocalVariable(name: "a2", arg: 3, scope: !460, file: !15, line: 366, type: !10)
!465 = !DILocalVariable(name: "a3", arg: 4, scope: !460, file: !15, line: 366, type: !10)
!466 = !DILocalVariable(name: "t0", scope: !460, file: !15, line: 371, type: !10)
!467 = !DILocalVariable(name: "t1", scope: !460, file: !15, line: 373, type: !10)
!468 = !DILocalVariable(name: "t2", scope: !469, file: !15, line: 375, type: !10)
!469 = distinct !DILexicalBlock(scope: !470, file: !15, line: 374, column: 16)
!470 = distinct !DILexicalBlock(scope: !460, file: !15, line: 374, column: 5)
!471 = !DILocalVariable(name: "t3", scope: !469, file: !15, line: 377, type: !10)
!472 = !DILocalVariable(name: "t4", scope: !469, file: !15, line: 379, type: !10)
!473 = !DILocalVariable(name: "t5", scope: !469, file: !15, line: 383, type: !10)
!474 = !DILocalVariable(name: "t6", scope: !475, file: !15, line: 387, type: !10)
!475 = distinct !DILexicalBlock(scope: !470, file: !15, line: 386, column: 8)
!476 = !DILocalVariable(name: "t7", scope: !475, file: !15, line: 389, type: !10)
!477 = !DILocalVariable(name: "t8", scope: !475, file: !15, line: 391, type: !10)
!478 = !DILocalVariable(name: "t9", scope: !475, file: !15, line: 395, type: !10)
!479 = !DILocation(line: 0, scope: !460)
!480 = !DILocation(line: 374, column: 9, scope: !470)
!481 = !DILocation(line: 0, scope: !470)
!482 = !DILocation(line: 374, column: 5, scope: !470)
!483 = !DILocation(line: 0, scope: !469)
!484 = !DILocation(line: 380, column: 7, scope: !485)
!485 = distinct !DILexicalBlock(scope: !469, file: !15, line: 380, column: 5)
!486 = !DILocation(line: 382, column: 16, scope: !487)
!487 = distinct !DILexicalBlock(scope: !485, file: !15, line: 382, column: 8)
!488 = !DILocation(line: 0, scope: !485)
!489 = !DILocation(line: 385, column: 8, scope: !469)
!490 = !DILocation(line: 386, column: 1, scope: !469)
!491 = !DILocation(line: 0, scope: !475)
!492 = !DILocation(line: 392, column: 7, scope: !493)
!493 = distinct !DILexicalBlock(scope: !475, file: !15, line: 392, column: 5)
!494 = !DILocation(line: 394, column: 16, scope: !495)
!495 = distinct !DILexicalBlock(scope: !493, file: !15, line: 394, column: 8)
!496 = !DILocation(line: 0, scope: !493)
!497 = !DILocation(line: 397, column: 8, scope: !475)
!498 = !DILocation(line: 399, column: 1, scope: !460)
!499 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_heldout_u32_into", scope: !15, file: !15, line: 401, type: !500, scopeLine: 401, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !502)
!500 = !DISubroutineType(types: !501)
!501 = !{!5, !170, !170, !10, !10, !13}
!502 = !{!503, !504, !505, !506, !507, !508, !509, !510, !512, !515, !516, !517, !518, !519, !520, !521, !522, !523, !524, !525, !526, !527, !528, !529, !530, !531, !532, !533, !534, !535, !536, !537, !538, !539, !540, !541, !544, !546, !547, !548, !549, !550, !551, !552, !553, !554, !555, !558, !559, !560, !561, !563, !564, !565}
!503 = !DILocalVariable(name: "a0", arg: 1, scope: !499, file: !15, line: 401, type: !170)
!504 = !DILocalVariable(name: "a1", arg: 2, scope: !499, file: !15, line: 401, type: !170)
!505 = !DILocalVariable(name: "a2", arg: 3, scope: !499, file: !15, line: 401, type: !10)
!506 = !DILocalVariable(name: "a3", arg: 4, scope: !499, file: !15, line: 401, type: !10)
!507 = !DILocalVariable(name: "destination", arg: 5, scope: !499, file: !15, line: 401, type: !13)
!508 = !DILocalVariable(name: "t0", scope: !499, file: !15, line: 406, type: !170)
!509 = !DILocalVariable(name: "t1", scope: !499, file: !15, line: 408, type: !170)
!510 = !DILocalVariable(name: "t2", scope: !511, file: !15, line: 409, type: !5)
!511 = distinct !DILexicalBlock(scope: !499, file: !15, line: 409, column: 1)
!512 = !DILocalVariable(name: "t3", scope: !513, file: !15, line: 410, type: !10)
!513 = distinct !DILexicalBlock(scope: !514, file: !15, line: 409, column: 32)
!514 = distinct !DILexicalBlock(scope: !511, file: !15, line: 409, column: 1)
!515 = !DILocalVariable(name: "t4", scope: !513, file: !15, line: 412, type: !10)
!516 = !DILocalVariable(name: "t5", scope: !513, file: !15, line: 414, type: !10)
!517 = !DILocalVariable(name: "t6", scope: !513, file: !15, line: 416, type: !10)
!518 = !DILocalVariable(name: "t7", scope: !513, file: !15, line: 419, type: !10)
!519 = !DILocalVariable(name: "t8", scope: !513, file: !15, line: 421, type: !10)
!520 = !DILocalVariable(name: "t9", scope: !513, file: !15, line: 423, type: !10)
!521 = !DILocalVariable(name: "t10", scope: !513, file: !15, line: 425, type: !10)
!522 = !DILocalVariable(name: "t11", scope: !513, file: !15, line: 428, type: !10)
!523 = !DILocalVariable(name: "t12", scope: !513, file: !15, line: 430, type: !10)
!524 = !DILocalVariable(name: "t13", scope: !513, file: !15, line: 432, type: !10)
!525 = !DILocalVariable(name: "t14", scope: !513, file: !15, line: 436, type: !10)
!526 = !DILocalVariable(name: "t15", scope: !513, file: !15, line: 438, type: !10)
!527 = !DILocalVariable(name: "t16", scope: !513, file: !15, line: 440, type: !10)
!528 = !DILocalVariable(name: "t17", scope: !513, file: !15, line: 442, type: !10)
!529 = !DILocalVariable(name: "t18", scope: !513, file: !15, line: 446, type: !10)
!530 = !DILocalVariable(name: "t19", scope: !513, file: !15, line: 448, type: !10)
!531 = !DILocalVariable(name: "t20", scope: !513, file: !15, line: 450, type: !10)
!532 = !DILocalVariable(name: "t21", scope: !513, file: !15, line: 452, type: !10)
!533 = !DILocalVariable(name: "t22", scope: !513, file: !15, line: 454, type: !10)
!534 = !DILocalVariable(name: "t23", scope: !513, file: !15, line: 456, type: !10)
!535 = !DILocalVariable(name: "t24", scope: !513, file: !15, line: 459, type: !10)
!536 = !DILocalVariable(name: "t25", scope: !513, file: !15, line: 461, type: !10)
!537 = !DILocalVariable(name: "t26", scope: !513, file: !15, line: 463, type: !10)
!538 = !DILocalVariable(name: "t27", scope: !513, file: !15, line: 465, type: !10)
!539 = !DILocalVariable(name: "t28", scope: !513, file: !15, line: 468, type: !10)
!540 = !DILocalVariable(name: "t29", scope: !513, file: !15, line: 470, type: !10)
!541 = !DILocalVariable(name: "t30", scope: !542, file: !15, line: 472, type: !10)
!542 = distinct !DILexicalBlock(scope: !543, file: !15, line: 471, column: 18)
!543 = distinct !DILexicalBlock(scope: !513, file: !15, line: 471, column: 5)
!544 = !DILocalVariable(name: "t31", scope: !545, file: !15, line: 476, type: !10)
!545 = distinct !DILexicalBlock(scope: !543, file: !15, line: 475, column: 8)
!546 = !DILocalVariable(name: "t32", scope: !513, file: !15, line: 480, type: !10)
!547 = !DILocalVariable(name: "t33", scope: !513, file: !15, line: 482, type: !10)
!548 = !DILocalVariable(name: "t34", scope: !513, file: !15, line: 484, type: !10)
!549 = !DILocalVariable(name: "t35", scope: !513, file: !15, line: 487, type: !10)
!550 = !DILocalVariable(name: "t36", scope: !513, file: !15, line: 489, type: !10)
!551 = !DILocalVariable(name: "t37", scope: !513, file: !15, line: 491, type: !10)
!552 = !DILocalVariable(name: "t38", scope: !513, file: !15, line: 493, type: !10)
!553 = !DILocalVariable(name: "t39", scope: !513, file: !15, line: 496, type: !10)
!554 = !DILocalVariable(name: "t40", scope: !513, file: !15, line: 498, type: !10)
!555 = !DILocalVariable(name: "t41", scope: !556, file: !15, line: 500, type: !10)
!556 = distinct !DILexicalBlock(scope: !557, file: !15, line: 499, column: 18)
!557 = distinct !DILexicalBlock(scope: !513, file: !15, line: 499, column: 5)
!558 = !DILocalVariable(name: "t42", scope: !556, file: !15, line: 502, type: !10)
!559 = !DILocalVariable(name: "t43", scope: !556, file: !15, line: 504, type: !10)
!560 = !DILocalVariable(name: "t44", scope: !556, file: !15, line: 508, type: !10)
!561 = !DILocalVariable(name: "t45", scope: !562, file: !15, line: 512, type: !10)
!562 = distinct !DILexicalBlock(scope: !557, file: !15, line: 511, column: 8)
!563 = !DILocalVariable(name: "t46", scope: !562, file: !15, line: 514, type: !10)
!564 = !DILocalVariable(name: "t47", scope: !562, file: !15, line: 516, type: !10)
!565 = !DILocalVariable(name: "t48", scope: !562, file: !15, line: 520, type: !10)
!566 = !DILocation(line: 401, column: 74, scope: !499)
!567 = !DILocation(line: 401, column: 90, scope: !499)
!568 = !DILocation(line: 0, scope: !499)
!569 = !DILocation(line: 406, column: 17, scope: !499)
!570 = !DILocation(line: 0, scope: !511)
!571 = !DILocation(line: 409, column: 19, scope: !514)
!572 = !DILocation(line: 409, column: 1, scope: !511)
!573 = !DILocation(line: 433, column: 8, scope: !574)
!574 = distinct !DILexicalBlock(scope: !513, file: !15, line: 433, column: 5)
!575 = !DILocation(line: 409, column: 29, scope: !514)
!576 = !DILocation(line: 412, column: 13, scope: !513)
!577 = !DILocation(line: 452, column: 14, scope: !513)
!578 = !DILocation(line: 435, column: 18, scope: !579)
!579 = distinct !DILexicalBlock(scope: !574, file: !15, line: 435, column: 8)
!580 = !DILocation(line: 445, column: 18, scope: !581)
!581 = distinct !DILexicalBlock(scope: !582, file: !15, line: 445, column: 8)
!582 = distinct !DILexicalBlock(scope: !513, file: !15, line: 443, column: 5)
!583 = !DILocation(line: 448, column: 19, scope: !513)
!584 = !DILocation(line: 471, column: 10, scope: !543)
!585 = !DILocation(line: 471, column: 5, scope: !543)
!586 = !DILocation(line: 499, column: 10, scope: !557)
!587 = !DILocation(line: 499, column: 5, scope: !557)
!588 = !DILocation(line: 519, column: 18, scope: !589)
!589 = distinct !DILexicalBlock(scope: !590, file: !15, line: 519, column: 8)
!590 = distinct !DILexicalBlock(scope: !562, file: !15, line: 517, column: 5)
!591 = !DILocation(line: 507, column: 18, scope: !592)
!592 = distinct !DILexicalBlock(scope: !593, file: !15, line: 507, column: 8)
!593 = distinct !DILexicalBlock(scope: !556, file: !15, line: 505, column: 5)
!594 = !DILocation(line: 522, column: 10, scope: !562)
!595 = !DILocation(line: 510, column: 10, scope: !556)
!596 = !DILocation(line: 0, scope: !557)
!597 = !DILocation(line: 524, column: 1, scope: !513)
!598 = !DILocation(line: 524, column: 12, scope: !513)
!599 = distinct !{!599, !572, !600, !137, !138, !139}
!600 = !DILocation(line: 525, column: 1, scope: !511)
!601 = !DILocation(line: 526, column: 1, scope: !499)
!602 = !DILocation(line: 0, scope: !513)
!603 = !DILocation(line: 0, scope: !556)
!604 = !DILocation(line: 0, scope: !593)
!605 = !DILocation(line: 511, column: 1, scope: !556)
!606 = !DILocation(line: 0, scope: !562)
!607 = !DILocation(line: 0, scope: !590)
!608 = distinct !{!608, !572, !600, !137, !138}
!609 = distinct !DISubprogram(name: "ink_compute_into", scope: !15, file: !15, line: 528, type: !610, scopeLine: 528, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !616)
!610 = !DISubroutineType(types: !611)
!611 = !{!5, !10, !612, !614, !8}
!612 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !613, size: 32)
!613 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !103)
!614 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !615, size: 32)
!615 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !5)
!616 = !{!617, !618, !619, !620, !621, !624, !625, !626}
!617 = !DILocalVariable(name: "function", arg: 1, scope: !609, file: !15, line: 528, type: !10)
!618 = !DILocalVariable(name: "data", arg: 2, scope: !609, file: !15, line: 528, type: !612)
!619 = !DILocalVariable(name: "lengths", arg: 3, scope: !609, file: !15, line: 528, type: !614)
!620 = !DILocalVariable(name: "destination", arg: 4, scope: !609, file: !15, line: 528, type: !8)
!621 = !DILocalVariable(name: "a0", scope: !622, file: !15, line: 529, type: !13)
!622 = distinct !DILexicalBlock(scope: !623, file: !15, line: 529, column: 8)
!623 = distinct !DILexicalBlock(scope: !609, file: !15, line: 528, column: 167)
!624 = !DILocalVariable(name: "a1", scope: !622, file: !15, line: 529, type: !13)
!625 = !DILocalVariable(name: "a2", scope: !622, file: !15, line: 529, type: !10)
!626 = !DILocalVariable(name: "a3", scope: !622, file: !15, line: 529, type: !10)
!627 = !DILocation(line: 0, scope: !111, inlinedAt: !628)
!628 = distinct !DILocation(line: 529, column: 87, scope: !622)
!629 = !DILocation(line: 0, scope: !111, inlinedAt: !630)
!630 = distinct !DILocation(line: 529, column: 132, scope: !622)
!631 = !DILocation(line: 0, scope: !609)
!632 = !DILocation(line: 528, column: 151, scope: !609)
!633 = !DILocation(line: 529, column: 34, scope: !622)
!634 = !{!244, !244, i64 0}
!635 = !DILocation(line: 0, scope: !622)
!636 = !DILocation(line: 529, column: 100, scope: !622)
!637 = !DILocation(line: 0, scope: !123, inlinedAt: !628)
!638 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !628)
!639 = !DILocation(line: 529, column: 145, scope: !622)
!640 = !DILocation(line: 0, scope: !123, inlinedAt: !630)
!641 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !630)
!642 = !DILocation(line: 529, column: 243, scope: !622)
!643 = !DILocation(line: 529, column: 288, scope: !622)
!644 = !DILocation(line: 409, column: 19, scope: !514, inlinedAt: !645)
!645 = distinct !DILocation(line: 529, column: 172, scope: !622)
!646 = !DILocation(line: 0, scope: !499, inlinedAt: !645)
!647 = !DILocation(line: 0, scope: !511, inlinedAt: !645)
!648 = !DILocation(line: 409, column: 1, scope: !511, inlinedAt: !645)
!649 = !DILocation(line: 433, column: 8, scope: !574, inlinedAt: !645)
!650 = !DILocation(line: 409, column: 29, scope: !514, inlinedAt: !645)
!651 = !DILocation(line: 412, column: 13, scope: !513, inlinedAt: !645)
!652 = !DILocation(line: 452, column: 14, scope: !513, inlinedAt: !645)
!653 = !DILocation(line: 435, column: 18, scope: !579, inlinedAt: !645)
!654 = !DILocation(line: 445, column: 18, scope: !581, inlinedAt: !645)
!655 = !DILocation(line: 448, column: 19, scope: !513, inlinedAt: !645)
!656 = !DILocation(line: 471, column: 10, scope: !543, inlinedAt: !645)
!657 = !DILocation(line: 471, column: 5, scope: !543, inlinedAt: !645)
!658 = !DILocation(line: 499, column: 10, scope: !557, inlinedAt: !645)
!659 = !DILocation(line: 499, column: 5, scope: !557, inlinedAt: !645)
!660 = !DILocation(line: 519, column: 18, scope: !589, inlinedAt: !645)
!661 = !DILocation(line: 507, column: 18, scope: !592, inlinedAt: !645)
!662 = !DILocation(line: 522, column: 10, scope: !562, inlinedAt: !645)
!663 = !DILocation(line: 510, column: 10, scope: !556, inlinedAt: !645)
!664 = !DILocation(line: 0, scope: !557, inlinedAt: !645)
!665 = !DILocation(line: 524, column: 1, scope: !513, inlinedAt: !645)
!666 = !DILocation(line: 524, column: 12, scope: !513, inlinedAt: !645)
!667 = distinct !{!667, !648, !668, !137, !138, !139}
!668 = !DILocation(line: 525, column: 1, scope: !511, inlinedAt: !645)
!669 = !DILocation(line: 0, scope: !513, inlinedAt: !645)
!670 = !DILocation(line: 0, scope: !556, inlinedAt: !645)
!671 = !DILocation(line: 0, scope: !593, inlinedAt: !645)
!672 = !DILocation(line: 511, column: 1, scope: !556, inlinedAt: !645)
!673 = !DILocation(line: 0, scope: !562, inlinedAt: !645)
!674 = !DILocation(line: 0, scope: !590, inlinedAt: !645)
!675 = distinct !{!675, !648, !668, !137, !138}
!676 = !DILocation(line: 530, column: 30, scope: !609)
!677 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !678)
!678 = distinct !DILocation(line: 530, column: 9, scope: !623)
!679 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !678)
!680 = distinct !DISubprogram(name: "ink_compute_call", scope: !15, file: !15, line: 531, type: !681, scopeLine: 531, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !685)
!681 = !DISubroutineType(types: !682)
!682 = !{null, !10, !612, !614, !683, !684}
!683 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !8, size: 32)
!684 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !5, size: 32)
!685 = !{!686, !687, !688, !689, !690, !691, !694, !695, !696, !697, !698, !700, !701, !702, !703, !704, !705, !707, !708, !709, !710, !711, !712, !714, !715, !716, !717, !718, !719, !721, !722, !723, !724, !725, !726, !728, !729, !730, !731, !732, !733, !735, !736, !737, !738, !739}
!686 = !DILocalVariable(name: "function", arg: 1, scope: !680, file: !15, line: 531, type: !10)
!687 = !DILocalVariable(name: "data", arg: 2, scope: !680, file: !15, line: 531, type: !612)
!688 = !DILocalVariable(name: "lengths", arg: 3, scope: !680, file: !15, line: 531, type: !614)
!689 = !DILocalVariable(name: "output", arg: 4, scope: !680, file: !15, line: 531, type: !683)
!690 = !DILocalVariable(name: "count", arg: 5, scope: !680, file: !15, line: 531, type: !684)
!691 = !DILocalVariable(name: "a0", scope: !692, file: !15, line: 532, type: !13)
!692 = distinct !DILexicalBlock(scope: !693, file: !15, line: 532, column: 8)
!693 = distinct !DILexicalBlock(scope: !680, file: !15, line: 531, column: 158)
!694 = !DILocalVariable(name: "a1", scope: !692, file: !15, line: 532, type: !13)
!695 = !DILocalVariable(name: "a2", scope: !692, file: !15, line: 532, type: !10)
!696 = !DILocalVariable(name: "a3", scope: !692, file: !15, line: 532, type: !10)
!697 = !DILocalVariable(name: "result", scope: !692, file: !15, line: 532, type: !170)
!698 = !DILocalVariable(name: "a0", scope: !699, file: !15, line: 533, type: !10)
!699 = distinct !DILexicalBlock(scope: !693, file: !15, line: 533, column: 8)
!700 = !DILocalVariable(name: "a1", scope: !699, file: !15, line: 533, type: !10)
!701 = !DILocalVariable(name: "a2", scope: !699, file: !15, line: 533, type: !10)
!702 = !DILocalVariable(name: "a3", scope: !699, file: !15, line: 533, type: !10)
!703 = !DILocalVariable(name: "result", scope: !699, file: !15, line: 533, type: !10)
!704 = !DILocalVariable(name: "copy", scope: !699, file: !15, line: 533, type: !13)
!705 = !DILocalVariable(name: "a0", scope: !706, file: !15, line: 534, type: !10)
!706 = distinct !DILexicalBlock(scope: !693, file: !15, line: 534, column: 8)
!707 = !DILocalVariable(name: "a1", scope: !706, file: !15, line: 534, type: !10)
!708 = !DILocalVariable(name: "a2", scope: !706, file: !15, line: 534, type: !10)
!709 = !DILocalVariable(name: "a3", scope: !706, file: !15, line: 534, type: !10)
!710 = !DILocalVariable(name: "result", scope: !706, file: !15, line: 534, type: !10)
!711 = !DILocalVariable(name: "copy", scope: !706, file: !15, line: 534, type: !13)
!712 = !DILocalVariable(name: "a0", scope: !713, file: !15, line: 535, type: !10)
!713 = distinct !DILexicalBlock(scope: !693, file: !15, line: 535, column: 8)
!714 = !DILocalVariable(name: "a1", scope: !713, file: !15, line: 535, type: !10)
!715 = !DILocalVariable(name: "a2", scope: !713, file: !15, line: 535, type: !10)
!716 = !DILocalVariable(name: "a3", scope: !713, file: !15, line: 535, type: !10)
!717 = !DILocalVariable(name: "result", scope: !713, file: !15, line: 535, type: !10)
!718 = !DILocalVariable(name: "copy", scope: !713, file: !15, line: 535, type: !13)
!719 = !DILocalVariable(name: "a0", scope: !720, file: !15, line: 536, type: !10)
!720 = distinct !DILexicalBlock(scope: !693, file: !15, line: 536, column: 8)
!721 = !DILocalVariable(name: "a1", scope: !720, file: !15, line: 536, type: !10)
!722 = !DILocalVariable(name: "a2", scope: !720, file: !15, line: 536, type: !10)
!723 = !DILocalVariable(name: "a3", scope: !720, file: !15, line: 536, type: !10)
!724 = !DILocalVariable(name: "result", scope: !720, file: !15, line: 536, type: !10)
!725 = !DILocalVariable(name: "copy", scope: !720, file: !15, line: 536, type: !13)
!726 = !DILocalVariable(name: "a0", scope: !727, file: !15, line: 537, type: !10)
!727 = distinct !DILexicalBlock(scope: !693, file: !15, line: 537, column: 8)
!728 = !DILocalVariable(name: "a1", scope: !727, file: !15, line: 537, type: !10)
!729 = !DILocalVariable(name: "a2", scope: !727, file: !15, line: 537, type: !10)
!730 = !DILocalVariable(name: "a3", scope: !727, file: !15, line: 537, type: !10)
!731 = !DILocalVariable(name: "result", scope: !727, file: !15, line: 537, type: !10)
!732 = !DILocalVariable(name: "copy", scope: !727, file: !15, line: 537, type: !13)
!733 = !DILocalVariable(name: "a0", scope: !734, file: !15, line: 538, type: !10)
!734 = distinct !DILexicalBlock(scope: !693, file: !15, line: 538, column: 8)
!735 = !DILocalVariable(name: "a1", scope: !734, file: !15, line: 538, type: !10)
!736 = !DILocalVariable(name: "a2", scope: !734, file: !15, line: 538, type: !10)
!737 = !DILocalVariable(name: "a3", scope: !734, file: !15, line: 538, type: !10)
!738 = !DILocalVariable(name: "result", scope: !734, file: !15, line: 538, type: !10)
!739 = !DILocalVariable(name: "copy", scope: !734, file: !15, line: 538, type: !13)
!740 = !DILocation(line: 0, scope: !111, inlinedAt: !741)
!741 = distinct !DILocation(line: 532, column: 87, scope: !692)
!742 = !DILocation(line: 0, scope: !111, inlinedAt: !743)
!743 = distinct !DILocation(line: 532, column: 132, scope: !692)
!744 = !DILocation(line: 0, scope: !111, inlinedAt: !745)
!745 = distinct !DILocation(line: 533, column: 21, scope: !699)
!746 = !DILocation(line: 0, scope: !111, inlinedAt: !747)
!747 = distinct !DILocation(line: 533, column: 66, scope: !699)
!748 = !DILocation(line: 0, scope: !111, inlinedAt: !749)
!749 = distinct !DILocation(line: 533, column: 111, scope: !699)
!750 = !DILocation(line: 0, scope: !111, inlinedAt: !751)
!751 = distinct !DILocation(line: 533, column: 156, scope: !699)
!752 = !DILocation(line: 0, scope: !111, inlinedAt: !753)
!753 = distinct !DILocation(line: 534, column: 21, scope: !706)
!754 = !DILocation(line: 0, scope: !111, inlinedAt: !755)
!755 = distinct !DILocation(line: 534, column: 66, scope: !706)
!756 = !DILocation(line: 0, scope: !111, inlinedAt: !757)
!757 = distinct !DILocation(line: 534, column: 111, scope: !706)
!758 = !DILocation(line: 0, scope: !111, inlinedAt: !759)
!759 = distinct !DILocation(line: 534, column: 156, scope: !706)
!760 = !DILocation(line: 0, scope: !111, inlinedAt: !761)
!761 = distinct !DILocation(line: 535, column: 21, scope: !713)
!762 = !DILocation(line: 0, scope: !111, inlinedAt: !763)
!763 = distinct !DILocation(line: 535, column: 66, scope: !713)
!764 = !DILocation(line: 0, scope: !111, inlinedAt: !765)
!765 = distinct !DILocation(line: 535, column: 111, scope: !713)
!766 = !DILocation(line: 0, scope: !111, inlinedAt: !767)
!767 = distinct !DILocation(line: 535, column: 156, scope: !713)
!768 = !DILocation(line: 0, scope: !111, inlinedAt: !769)
!769 = distinct !DILocation(line: 536, column: 21, scope: !720)
!770 = !DILocation(line: 0, scope: !111, inlinedAt: !771)
!771 = distinct !DILocation(line: 536, column: 66, scope: !720)
!772 = !DILocation(line: 0, scope: !111, inlinedAt: !773)
!773 = distinct !DILocation(line: 536, column: 111, scope: !720)
!774 = !DILocation(line: 0, scope: !111, inlinedAt: !775)
!775 = distinct !DILocation(line: 536, column: 156, scope: !720)
!776 = !DILocation(line: 0, scope: !111, inlinedAt: !777)
!777 = distinct !DILocation(line: 537, column: 21, scope: !727)
!778 = !DILocation(line: 0, scope: !111, inlinedAt: !779)
!779 = distinct !DILocation(line: 537, column: 66, scope: !727)
!780 = !DILocation(line: 0, scope: !111, inlinedAt: !781)
!781 = distinct !DILocation(line: 537, column: 156, scope: !727)
!782 = !DILocation(line: 0, scope: !111, inlinedAt: !783)
!783 = distinct !DILocation(line: 538, column: 21, scope: !734)
!784 = !DILocation(line: 0, scope: !111, inlinedAt: !785)
!785 = distinct !DILocation(line: 538, column: 66, scope: !734)
!786 = !DILocation(line: 0, scope: !111, inlinedAt: !787)
!787 = distinct !DILocation(line: 538, column: 156, scope: !734)
!788 = !DILocation(line: 0, scope: !680)
!789 = !DILocation(line: 531, column: 142, scope: !680)
!790 = !DILocation(line: 532, column: 34, scope: !692)
!791 = !DILocation(line: 0, scope: !692)
!792 = !DILocation(line: 532, column: 100, scope: !692)
!793 = !DILocation(line: 0, scope: !123, inlinedAt: !741)
!794 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !741)
!795 = !DILocation(line: 532, column: 145, scope: !692)
!796 = !DILocation(line: 0, scope: !123, inlinedAt: !743)
!797 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !743)
!798 = !DILocation(line: 532, column: 251, scope: !692)
!799 = !DILocation(line: 532, column: 296, scope: !692)
!800 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !801)
!801 = distinct !DILocation(line: 92, column: 18, scope: !167, inlinedAt: !802)
!802 = distinct !DILocation(line: 532, column: 185, scope: !692)
!803 = !DILocation(line: 0, scope: !167, inlinedAt: !802)
!804 = !DILocation(line: 0, scope: !51, inlinedAt: !801)
!805 = !{!806}
!806 = distinct !{!806, !807, !"lang_fn_pipeline38_right_padded_zip_heldout_u32: argument 0"}
!807 = distinct !{!807, !"lang_fn_pipeline38_right_padded_zip_heldout_u32"}
!808 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !801)
!809 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !810)
!810 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !801)
!811 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !810)
!812 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !801)
!813 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !801)
!814 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !801)
!815 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !801)
!816 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !801)
!817 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !801)
!818 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !801)
!819 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !801)
!820 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !821)
!821 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !801)
!822 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !821)
!823 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !801)
!824 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !801)
!825 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !801)
!826 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !801)
!827 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !801)
!828 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !801)
!829 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !801)
!830 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !801)
!831 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !801)
!832 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !801)
!833 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !834)
!834 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !801)
!835 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !834)
!836 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !801)
!837 = !DILocation(line: 0, scope: !183, inlinedAt: !802)
!838 = !DILocation(line: 93, column: 19, scope: !186, inlinedAt: !802)
!839 = !DILocation(line: 93, column: 1, scope: !183, inlinedAt: !802)
!840 = !DILocation(line: 117, column: 8, scope: !286, inlinedAt: !802)
!841 = !DILocation(line: 93, column: 29, scope: !186, inlinedAt: !802)
!842 = !DILocation(line: 96, column: 13, scope: !185, inlinedAt: !802)
!843 = !DILocation(line: 136, column: 14, scope: !185, inlinedAt: !802)
!844 = !DILocation(line: 119, column: 18, scope: !293, inlinedAt: !802)
!845 = !DILocation(line: 129, column: 18, scope: !295, inlinedAt: !802)
!846 = !DILocation(line: 132, column: 19, scope: !185, inlinedAt: !802)
!847 = !DILocation(line: 155, column: 10, scope: !215, inlinedAt: !802)
!848 = !DILocation(line: 155, column: 5, scope: !215, inlinedAt: !802)
!849 = !DILocation(line: 183, column: 10, scope: !229, inlinedAt: !802)
!850 = !DILocation(line: 183, column: 5, scope: !229, inlinedAt: !802)
!851 = !DILocation(line: 203, column: 18, scope: !303, inlinedAt: !802)
!852 = !DILocation(line: 191, column: 18, scope: !306, inlinedAt: !802)
!853 = !DILocation(line: 206, column: 10, scope: !234, inlinedAt: !802)
!854 = !DILocation(line: 194, column: 10, scope: !228, inlinedAt: !802)
!855 = !DILocation(line: 0, scope: !229, inlinedAt: !802)
!856 = !DILocation(line: 208, column: 1, scope: !185, inlinedAt: !802)
!857 = !DILocation(line: 208, column: 12, scope: !185, inlinedAt: !802)
!858 = distinct !{!858, !839, !859, !137, !138, !139}
!859 = !DILocation(line: 209, column: 1, scope: !183, inlinedAt: !802)
!860 = !DILocation(line: 0, scope: !185, inlinedAt: !802)
!861 = !DILocation(line: 0, scope: !228, inlinedAt: !802)
!862 = !DILocation(line: 0, scope: !307, inlinedAt: !802)
!863 = !DILocation(line: 195, column: 1, scope: !228, inlinedAt: !802)
!864 = !DILocation(line: 0, scope: !234, inlinedAt: !802)
!865 = !DILocation(line: 0, scope: !304, inlinedAt: !802)
!866 = distinct !{!866, !839, !859, !137, !138}
!867 = !DILocation(line: 0, scope: !699)
!868 = !DILocation(line: 0, scope: !123, inlinedAt: !745)
!869 = !DILocation(line: 0, scope: !123, inlinedAt: !747)
!870 = !DILocation(line: 533, column: 124, scope: !699)
!871 = !DILocation(line: 0, scope: !123, inlinedAt: !749)
!872 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !749)
!873 = !DILocation(line: 533, column: 169, scope: !699)
!874 = !DILocation(line: 0, scope: !123, inlinedAt: !751)
!875 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !751)
!876 = !DILocation(line: 533, column: 232, scope: !699)
!877 = !DILocation(line: 231, column: 7, scope: !345, inlinedAt: !878)
!878 = distinct !DILocation(line: 533, column: 205, scope: !699)
!879 = !DILocation(line: 0, scope: !323, inlinedAt: !878)
!880 = !DILocation(line: 533, column: 79, scope: !699)
!881 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !747)
!882 = !DILocation(line: 533, column: 34, scope: !699)
!883 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !745)
!884 = !DILocation(line: 533, column: 223, scope: !699)
!885 = !DILocation(line: 233, column: 16, scope: !347, inlinedAt: !878)
!886 = !DILocation(line: 243, column: 17, scope: !349, inlinedAt: !878)
!887 = !DILocation(line: 244, column: 18, scope: !323, inlinedAt: !878)
!888 = !DILocation(line: 246, column: 13, scope: !323, inlinedAt: !878)
!889 = !DILocation(line: 0, scope: !51, inlinedAt: !890)
!890 = distinct !DILocation(line: 533, column: 251, scope: !699)
!891 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !890)
!892 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !893)
!893 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !890)
!894 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !893)
!895 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !890)
!896 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !890)
!897 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !890)
!898 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !890)
!899 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !890)
!900 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !890)
!901 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !890)
!902 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !890)
!903 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !890)
!904 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !890)
!905 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !890)
!906 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !890)
!907 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !890)
!908 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !890)
!909 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !910)
!910 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !890)
!911 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !910)
!912 = !DILocation(line: 0, scope: !706)
!913 = !DILocation(line: 0, scope: !123, inlinedAt: !753)
!914 = !DILocation(line: 0, scope: !123, inlinedAt: !755)
!915 = !DILocation(line: 534, column: 124, scope: !706)
!916 = !DILocation(line: 0, scope: !123, inlinedAt: !757)
!917 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !757)
!918 = !DILocation(line: 534, column: 169, scope: !706)
!919 = !DILocation(line: 0, scope: !123, inlinedAt: !759)
!920 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !759)
!921 = !DILocation(line: 534, column: 234, scope: !706)
!922 = !DILocation(line: 258, column: 7, scope: !370, inlinedAt: !923)
!923 = distinct !DILocation(line: 534, column: 205, scope: !706)
!924 = !DILocation(line: 0, scope: !354, inlinedAt: !923)
!925 = !DILocation(line: 534, column: 79, scope: !706)
!926 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !755)
!927 = !DILocation(line: 534, column: 34, scope: !706)
!928 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !753)
!929 = !DILocation(line: 534, column: 225, scope: !706)
!930 = !DILocation(line: 260, column: 16, scope: !372, inlinedAt: !923)
!931 = !DILocation(line: 270, column: 16, scope: !374, inlinedAt: !923)
!932 = !DILocation(line: 271, column: 17, scope: !354, inlinedAt: !923)
!933 = !DILocation(line: 273, column: 12, scope: !354, inlinedAt: !923)
!934 = !DILocation(line: 0, scope: !51, inlinedAt: !935)
!935 = distinct !DILocation(line: 534, column: 253, scope: !706)
!936 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !935)
!937 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !938)
!938 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !935)
!939 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !938)
!940 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !935)
!941 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !935)
!942 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !935)
!943 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !935)
!944 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !935)
!945 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !935)
!946 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !935)
!947 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !935)
!948 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !935)
!949 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !935)
!950 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !935)
!951 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !935)
!952 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !935)
!953 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !935)
!954 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !955)
!955 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !935)
!956 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !955)
!957 = !DILocation(line: 535, column: 34, scope: !713)
!958 = !DILocation(line: 0, scope: !123, inlinedAt: !761)
!959 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !761)
!960 = !DILocation(line: 0, scope: !713)
!961 = !DILocation(line: 535, column: 79, scope: !713)
!962 = !DILocation(line: 0, scope: !123, inlinedAt: !763)
!963 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !763)
!964 = !DILocation(line: 535, column: 124, scope: !713)
!965 = !DILocation(line: 0, scope: !123, inlinedAt: !765)
!966 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !765)
!967 = !DILocation(line: 535, column: 169, scope: !713)
!968 = !DILocation(line: 0, scope: !123, inlinedAt: !767)
!969 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !767)
!970 = !DILocation(line: 535, column: 227, scope: !713)
!971 = !DILocation(line: 535, column: 230, scope: !713)
!972 = !DILocation(line: 535, column: 233, scope: !713)
!973 = !DILocation(line: 292, column: 9, scope: !393, inlinedAt: !974)
!974 = distinct !DILocation(line: 535, column: 205, scope: !713)
!975 = !DILocation(line: 0, scope: !379, inlinedAt: !974)
!976 = !DILocation(line: 292, column: 5, scope: !393, inlinedAt: !974)
!977 = !DILocation(line: 0, scope: !51, inlinedAt: !978)
!978 = distinct !DILocation(line: 535, column: 252, scope: !713)
!979 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !978)
!980 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !981)
!981 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !978)
!982 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !981)
!983 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !978)
!984 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !978)
!985 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !978)
!986 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !978)
!987 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !978)
!988 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !978)
!989 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !978)
!990 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !978)
!991 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !978)
!992 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !978)
!993 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !978)
!994 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !978)
!995 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !978)
!996 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !978)
!997 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !998)
!998 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !978)
!999 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !998)
!1000 = !DILocation(line: 536, column: 34, scope: !720)
!1001 = !DILocation(line: 0, scope: !123, inlinedAt: !769)
!1002 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !769)
!1003 = !DILocation(line: 0, scope: !720)
!1004 = !DILocation(line: 536, column: 79, scope: !720)
!1005 = !DILocation(line: 0, scope: !123, inlinedAt: !771)
!1006 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !771)
!1007 = !DILocation(line: 536, column: 124, scope: !720)
!1008 = !DILocation(line: 0, scope: !123, inlinedAt: !773)
!1009 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !773)
!1010 = !DILocation(line: 536, column: 169, scope: !720)
!1011 = !DILocation(line: 0, scope: !123, inlinedAt: !775)
!1012 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !775)
!1013 = !DILocation(line: 536, column: 229, scope: !720)
!1014 = !DILocation(line: 536, column: 232, scope: !720)
!1015 = !DILocation(line: 536, column: 235, scope: !720)
!1016 = !DILocation(line: 311, column: 9, scope: !410, inlinedAt: !1017)
!1017 = distinct !DILocation(line: 536, column: 205, scope: !720)
!1018 = !DILocation(line: 0, scope: !400, inlinedAt: !1017)
!1019 = !DILocation(line: 311, column: 5, scope: !410, inlinedAt: !1017)
!1020 = !DILocation(line: 0, scope: !51, inlinedAt: !1021)
!1021 = distinct !DILocation(line: 536, column: 254, scope: !720)
!1022 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1021)
!1023 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1024)
!1024 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1021)
!1025 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1024)
!1026 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1021)
!1027 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1021)
!1028 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1021)
!1029 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1021)
!1030 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1021)
!1031 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1021)
!1032 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1021)
!1033 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1021)
!1034 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1021)
!1035 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1021)
!1036 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1021)
!1037 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1021)
!1038 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1021)
!1039 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1021)
!1040 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1041)
!1041 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1021)
!1042 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1041)
!1043 = !DILocation(line: 537, column: 34, scope: !727)
!1044 = !DILocation(line: 0, scope: !123, inlinedAt: !777)
!1045 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !777)
!1046 = !DILocation(line: 0, scope: !727)
!1047 = !DILocation(line: 537, column: 79, scope: !727)
!1048 = !DILocation(line: 0, scope: !123, inlinedAt: !779)
!1049 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !779)
!1050 = !DILocation(line: 0, scope: !123, inlinedAt: !1051)
!1051 = distinct !DILocation(line: 537, column: 111, scope: !727)
!1052 = !DILocation(line: 537, column: 169, scope: !727)
!1053 = !DILocation(line: 0, scope: !123, inlinedAt: !781)
!1054 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !781)
!1055 = !DILocation(line: 537, column: 226, scope: !727)
!1056 = !DILocation(line: 537, column: 232, scope: !727)
!1057 = !DILocation(line: 339, column: 9, scope: !431, inlinedAt: !1058)
!1058 = distinct !DILocation(line: 537, column: 205, scope: !727)
!1059 = !DILocation(line: 0, scope: !417, inlinedAt: !1058)
!1060 = !DILocation(line: 0, scope: !431, inlinedAt: !1058)
!1061 = !DILocation(line: 339, column: 5, scope: !431, inlinedAt: !1058)
!1062 = !DILocation(line: 0, scope: !430, inlinedAt: !1058)
!1063 = !DILocation(line: 345, column: 7, scope: !446, inlinedAt: !1058)
!1064 = !DILocation(line: 347, column: 16, scope: !448, inlinedAt: !1058)
!1065 = !DILocation(line: 0, scope: !446, inlinedAt: !1058)
!1066 = !DILocation(line: 350, column: 8, scope: !430, inlinedAt: !1058)
!1067 = !DILocation(line: 351, column: 1, scope: !430, inlinedAt: !1058)
!1068 = !DILocation(line: 0, scope: !436, inlinedAt: !1058)
!1069 = !DILocation(line: 357, column: 8, scope: !454, inlinedAt: !1058)
!1070 = !DILocation(line: 359, column: 18, scope: !456, inlinedAt: !1058)
!1071 = !DILocation(line: 0, scope: !454, inlinedAt: !1058)
!1072 = !DILocation(line: 362, column: 9, scope: !436, inlinedAt: !1058)
!1073 = !DILocation(line: 0, scope: !51, inlinedAt: !1074)
!1074 = distinct !DILocation(line: 537, column: 251, scope: !727)
!1075 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1074)
!1076 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1077)
!1077 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1074)
!1078 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1077)
!1079 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1074)
!1080 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1074)
!1081 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1074)
!1082 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1074)
!1083 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1074)
!1084 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1074)
!1085 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1074)
!1086 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1074)
!1087 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1074)
!1088 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1074)
!1089 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1074)
!1090 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1074)
!1091 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1074)
!1092 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1074)
!1093 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1094)
!1094 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1074)
!1095 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1094)
!1096 = !DILocation(line: 538, column: 34, scope: !734)
!1097 = !DILocation(line: 0, scope: !123, inlinedAt: !783)
!1098 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !783)
!1099 = !DILocation(line: 0, scope: !734)
!1100 = !DILocation(line: 538, column: 79, scope: !734)
!1101 = !DILocation(line: 0, scope: !123, inlinedAt: !785)
!1102 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !785)
!1103 = !DILocation(line: 0, scope: !123, inlinedAt: !1104)
!1104 = distinct !DILocation(line: 538, column: 111, scope: !734)
!1105 = !DILocation(line: 538, column: 169, scope: !734)
!1106 = !DILocation(line: 0, scope: !123, inlinedAt: !787)
!1107 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !787)
!1108 = !DILocation(line: 538, column: 228, scope: !734)
!1109 = !DILocation(line: 538, column: 234, scope: !734)
!1110 = !DILocation(line: 374, column: 9, scope: !470, inlinedAt: !1111)
!1111 = distinct !DILocation(line: 538, column: 205, scope: !734)
!1112 = !DILocation(line: 0, scope: !460, inlinedAt: !1111)
!1113 = !DILocation(line: 0, scope: !470, inlinedAt: !1111)
!1114 = !DILocation(line: 374, column: 5, scope: !470, inlinedAt: !1111)
!1115 = !DILocation(line: 0, scope: !469, inlinedAt: !1111)
!1116 = !DILocation(line: 380, column: 7, scope: !485, inlinedAt: !1111)
!1117 = !DILocation(line: 382, column: 16, scope: !487, inlinedAt: !1111)
!1118 = !DILocation(line: 0, scope: !485, inlinedAt: !1111)
!1119 = !DILocation(line: 385, column: 8, scope: !469, inlinedAt: !1111)
!1120 = !DILocation(line: 386, column: 1, scope: !469, inlinedAt: !1111)
!1121 = !DILocation(line: 0, scope: !475, inlinedAt: !1111)
!1122 = !DILocation(line: 392, column: 7, scope: !493, inlinedAt: !1111)
!1123 = !DILocation(line: 394, column: 16, scope: !495, inlinedAt: !1111)
!1124 = !DILocation(line: 0, scope: !493, inlinedAt: !1111)
!1125 = !DILocation(line: 397, column: 8, scope: !475, inlinedAt: !1111)
!1126 = !DILocation(line: 0, scope: !51, inlinedAt: !1127)
!1127 = distinct !DILocation(line: 538, column: 253, scope: !734)
!1128 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1127)
!1129 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1130)
!1130 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1127)
!1131 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1130)
!1132 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1127)
!1133 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1127)
!1134 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1127)
!1135 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1127)
!1136 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1127)
!1137 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1127)
!1138 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1127)
!1139 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1127)
!1140 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1127)
!1141 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1127)
!1142 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1127)
!1143 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1127)
!1144 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1127)
!1145 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1127)
!1146 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1147)
!1147 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1127)
!1148 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1147)
!1149 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1150)
!1150 = distinct !DILocation(line: 539, column: 9, scope: !693)
!1151 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1150)
!1152 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !1153)
!1153 = !DILocation(line: 0, scope: !693)
!1154 = !DILocation(line: 539, column: 21, scope: !680)
!1155 = distinct !DISubprogram(name: "ink_compute_scalar32", scope: !15, file: !15, line: 540, type: !1156, scopeLine: 540, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !1158)
!1156 = !DISubroutineType(types: !1157)
!1157 = !{!10, !10, !612, !614}
!1158 = !{!1159, !1160, !1161, !1162, !1165, !1166, !1167, !1168, !1169, !1171, !1172, !1173, !1174, !1175, !1177, !1178, !1179, !1180, !1181, !1183, !1184, !1185, !1186, !1187, !1189, !1190, !1191, !1192, !1193, !1195, !1196, !1197, !1198}
!1159 = !DILocalVariable(name: "function", arg: 1, scope: !1155, file: !15, line: 540, type: !10)
!1160 = !DILocalVariable(name: "data", arg: 2, scope: !1155, file: !15, line: 540, type: !612)
!1161 = !DILocalVariable(name: "lengths", arg: 3, scope: !1155, file: !15, line: 540, type: !614)
!1162 = !DILocalVariable(name: "a0", scope: !1163, file: !15, line: 541, type: !10)
!1163 = distinct !DILexicalBlock(scope: !1164, file: !15, line: 541, column: 8)
!1164 = distinct !DILexicalBlock(scope: !1155, file: !15, line: 540, column: 138)
!1165 = !DILocalVariable(name: "a1", scope: !1163, file: !15, line: 541, type: !10)
!1166 = !DILocalVariable(name: "a2", scope: !1163, file: !15, line: 541, type: !10)
!1167 = !DILocalVariable(name: "a3", scope: !1163, file: !15, line: 541, type: !10)
!1168 = !DILocalVariable(name: "result", scope: !1163, file: !15, line: 541, type: !10)
!1169 = !DILocalVariable(name: "a0", scope: !1170, file: !15, line: 542, type: !10)
!1170 = distinct !DILexicalBlock(scope: !1164, file: !15, line: 542, column: 8)
!1171 = !DILocalVariable(name: "a1", scope: !1170, file: !15, line: 542, type: !10)
!1172 = !DILocalVariable(name: "a2", scope: !1170, file: !15, line: 542, type: !10)
!1173 = !DILocalVariable(name: "a3", scope: !1170, file: !15, line: 542, type: !10)
!1174 = !DILocalVariable(name: "result", scope: !1170, file: !15, line: 542, type: !10)
!1175 = !DILocalVariable(name: "a0", scope: !1176, file: !15, line: 543, type: !10)
!1176 = distinct !DILexicalBlock(scope: !1164, file: !15, line: 543, column: 8)
!1177 = !DILocalVariable(name: "a1", scope: !1176, file: !15, line: 543, type: !10)
!1178 = !DILocalVariable(name: "a2", scope: !1176, file: !15, line: 543, type: !10)
!1179 = !DILocalVariable(name: "a3", scope: !1176, file: !15, line: 543, type: !10)
!1180 = !DILocalVariable(name: "result", scope: !1176, file: !15, line: 543, type: !10)
!1181 = !DILocalVariable(name: "a0", scope: !1182, file: !15, line: 544, type: !10)
!1182 = distinct !DILexicalBlock(scope: !1164, file: !15, line: 544, column: 8)
!1183 = !DILocalVariable(name: "a1", scope: !1182, file: !15, line: 544, type: !10)
!1184 = !DILocalVariable(name: "a2", scope: !1182, file: !15, line: 544, type: !10)
!1185 = !DILocalVariable(name: "a3", scope: !1182, file: !15, line: 544, type: !10)
!1186 = !DILocalVariable(name: "result", scope: !1182, file: !15, line: 544, type: !10)
!1187 = !DILocalVariable(name: "a0", scope: !1188, file: !15, line: 545, type: !10)
!1188 = distinct !DILexicalBlock(scope: !1164, file: !15, line: 545, column: 8)
!1189 = !DILocalVariable(name: "a1", scope: !1188, file: !15, line: 545, type: !10)
!1190 = !DILocalVariable(name: "a2", scope: !1188, file: !15, line: 545, type: !10)
!1191 = !DILocalVariable(name: "a3", scope: !1188, file: !15, line: 545, type: !10)
!1192 = !DILocalVariable(name: "result", scope: !1188, file: !15, line: 545, type: !10)
!1193 = !DILocalVariable(name: "a0", scope: !1194, file: !15, line: 546, type: !10)
!1194 = distinct !DILexicalBlock(scope: !1164, file: !15, line: 546, column: 8)
!1195 = !DILocalVariable(name: "a1", scope: !1194, file: !15, line: 546, type: !10)
!1196 = !DILocalVariable(name: "a2", scope: !1194, file: !15, line: 546, type: !10)
!1197 = !DILocalVariable(name: "a3", scope: !1194, file: !15, line: 546, type: !10)
!1198 = !DILocalVariable(name: "result", scope: !1194, file: !15, line: 546, type: !10)
!1199 = !DILocation(line: 0, scope: !111, inlinedAt: !1200)
!1200 = distinct !DILocation(line: 541, column: 21, scope: !1163)
!1201 = !DILocation(line: 0, scope: !111, inlinedAt: !1202)
!1202 = distinct !DILocation(line: 541, column: 66, scope: !1163)
!1203 = !DILocation(line: 0, scope: !111, inlinedAt: !1204)
!1204 = distinct !DILocation(line: 541, column: 111, scope: !1163)
!1205 = !DILocation(line: 0, scope: !111, inlinedAt: !1206)
!1206 = distinct !DILocation(line: 541, column: 156, scope: !1163)
!1207 = !DILocation(line: 0, scope: !111, inlinedAt: !1208)
!1208 = distinct !DILocation(line: 542, column: 21, scope: !1170)
!1209 = !DILocation(line: 0, scope: !111, inlinedAt: !1210)
!1210 = distinct !DILocation(line: 542, column: 66, scope: !1170)
!1211 = !DILocation(line: 0, scope: !111, inlinedAt: !1212)
!1212 = distinct !DILocation(line: 542, column: 111, scope: !1170)
!1213 = !DILocation(line: 0, scope: !111, inlinedAt: !1214)
!1214 = distinct !DILocation(line: 542, column: 156, scope: !1170)
!1215 = !DILocation(line: 0, scope: !111, inlinedAt: !1216)
!1216 = distinct !DILocation(line: 543, column: 21, scope: !1176)
!1217 = !DILocation(line: 0, scope: !111, inlinedAt: !1218)
!1218 = distinct !DILocation(line: 543, column: 66, scope: !1176)
!1219 = !DILocation(line: 0, scope: !111, inlinedAt: !1220)
!1220 = distinct !DILocation(line: 543, column: 111, scope: !1176)
!1221 = !DILocation(line: 0, scope: !111, inlinedAt: !1222)
!1222 = distinct !DILocation(line: 543, column: 156, scope: !1176)
!1223 = !DILocation(line: 0, scope: !111, inlinedAt: !1224)
!1224 = distinct !DILocation(line: 544, column: 21, scope: !1182)
!1225 = !DILocation(line: 0, scope: !111, inlinedAt: !1226)
!1226 = distinct !DILocation(line: 544, column: 66, scope: !1182)
!1227 = !DILocation(line: 0, scope: !111, inlinedAt: !1228)
!1228 = distinct !DILocation(line: 544, column: 111, scope: !1182)
!1229 = !DILocation(line: 0, scope: !111, inlinedAt: !1230)
!1230 = distinct !DILocation(line: 544, column: 156, scope: !1182)
!1231 = !DILocation(line: 0, scope: !111, inlinedAt: !1232)
!1232 = distinct !DILocation(line: 545, column: 21, scope: !1188)
!1233 = !DILocation(line: 0, scope: !111, inlinedAt: !1234)
!1234 = distinct !DILocation(line: 545, column: 66, scope: !1188)
!1235 = !DILocation(line: 0, scope: !111, inlinedAt: !1236)
!1236 = distinct !DILocation(line: 545, column: 156, scope: !1188)
!1237 = !DILocation(line: 0, scope: !111, inlinedAt: !1238)
!1238 = distinct !DILocation(line: 546, column: 21, scope: !1194)
!1239 = !DILocation(line: 0, scope: !111, inlinedAt: !1240)
!1240 = distinct !DILocation(line: 546, column: 66, scope: !1194)
!1241 = !DILocation(line: 0, scope: !111, inlinedAt: !1242)
!1242 = distinct !DILocation(line: 546, column: 156, scope: !1194)
!1243 = !DILocation(line: 0, scope: !1155)
!1244 = !DILocation(line: 540, column: 122, scope: !1155)
!1245 = !DILocation(line: 0, scope: !1163)
!1246 = !DILocation(line: 0, scope: !123, inlinedAt: !1200)
!1247 = !DILocation(line: 0, scope: !123, inlinedAt: !1202)
!1248 = !DILocation(line: 541, column: 124, scope: !1163)
!1249 = !DILocation(line: 0, scope: !123, inlinedAt: !1204)
!1250 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1204)
!1251 = !DILocation(line: 541, column: 169, scope: !1163)
!1252 = !DILocation(line: 0, scope: !123, inlinedAt: !1206)
!1253 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1206)
!1254 = !DILocation(line: 541, column: 232, scope: !1163)
!1255 = !DILocation(line: 231, column: 7, scope: !345, inlinedAt: !1256)
!1256 = distinct !DILocation(line: 541, column: 205, scope: !1163)
!1257 = !DILocation(line: 0, scope: !323, inlinedAt: !1256)
!1258 = !DILocation(line: 541, column: 79, scope: !1163)
!1259 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1202)
!1260 = !DILocation(line: 541, column: 34, scope: !1163)
!1261 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1200)
!1262 = !DILocation(line: 541, column: 223, scope: !1163)
!1263 = !DILocation(line: 233, column: 16, scope: !347, inlinedAt: !1256)
!1264 = !DILocation(line: 243, column: 17, scope: !349, inlinedAt: !1256)
!1265 = !DILocation(line: 244, column: 18, scope: !323, inlinedAt: !1256)
!1266 = !DILocation(line: 246, column: 13, scope: !323, inlinedAt: !1256)
!1267 = !DILocation(line: 0, scope: !1170)
!1268 = !DILocation(line: 0, scope: !123, inlinedAt: !1208)
!1269 = !DILocation(line: 0, scope: !123, inlinedAt: !1210)
!1270 = !DILocation(line: 542, column: 124, scope: !1170)
!1271 = !DILocation(line: 0, scope: !123, inlinedAt: !1212)
!1272 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1212)
!1273 = !DILocation(line: 542, column: 169, scope: !1170)
!1274 = !DILocation(line: 0, scope: !123, inlinedAt: !1214)
!1275 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1214)
!1276 = !DILocation(line: 542, column: 234, scope: !1170)
!1277 = !DILocation(line: 258, column: 7, scope: !370, inlinedAt: !1278)
!1278 = distinct !DILocation(line: 542, column: 205, scope: !1170)
!1279 = !DILocation(line: 0, scope: !354, inlinedAt: !1278)
!1280 = !DILocation(line: 542, column: 79, scope: !1170)
!1281 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1210)
!1282 = !DILocation(line: 542, column: 34, scope: !1170)
!1283 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1208)
!1284 = !DILocation(line: 542, column: 225, scope: !1170)
!1285 = !DILocation(line: 260, column: 16, scope: !372, inlinedAt: !1278)
!1286 = !DILocation(line: 270, column: 16, scope: !374, inlinedAt: !1278)
!1287 = !DILocation(line: 271, column: 17, scope: !354, inlinedAt: !1278)
!1288 = !DILocation(line: 273, column: 12, scope: !354, inlinedAt: !1278)
!1289 = !DILocation(line: 543, column: 34, scope: !1176)
!1290 = !DILocation(line: 0, scope: !123, inlinedAt: !1216)
!1291 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1216)
!1292 = !DILocation(line: 0, scope: !1176)
!1293 = !DILocation(line: 543, column: 79, scope: !1176)
!1294 = !DILocation(line: 0, scope: !123, inlinedAt: !1218)
!1295 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1218)
!1296 = !DILocation(line: 543, column: 124, scope: !1176)
!1297 = !DILocation(line: 0, scope: !123, inlinedAt: !1220)
!1298 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1220)
!1299 = !DILocation(line: 543, column: 169, scope: !1176)
!1300 = !DILocation(line: 0, scope: !123, inlinedAt: !1222)
!1301 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1222)
!1302 = !DILocation(line: 543, column: 227, scope: !1176)
!1303 = !DILocation(line: 543, column: 230, scope: !1176)
!1304 = !DILocation(line: 543, column: 233, scope: !1176)
!1305 = !DILocation(line: 292, column: 9, scope: !393, inlinedAt: !1306)
!1306 = distinct !DILocation(line: 543, column: 205, scope: !1176)
!1307 = !DILocation(line: 0, scope: !379, inlinedAt: !1306)
!1308 = !DILocation(line: 292, column: 5, scope: !393, inlinedAt: !1306)
!1309 = !DILocation(line: 544, column: 34, scope: !1182)
!1310 = !DILocation(line: 0, scope: !123, inlinedAt: !1224)
!1311 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1224)
!1312 = !DILocation(line: 0, scope: !1182)
!1313 = !DILocation(line: 544, column: 79, scope: !1182)
!1314 = !DILocation(line: 0, scope: !123, inlinedAt: !1226)
!1315 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1226)
!1316 = !DILocation(line: 544, column: 124, scope: !1182)
!1317 = !DILocation(line: 0, scope: !123, inlinedAt: !1228)
!1318 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1228)
!1319 = !DILocation(line: 544, column: 169, scope: !1182)
!1320 = !DILocation(line: 0, scope: !123, inlinedAt: !1230)
!1321 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1230)
!1322 = !DILocation(line: 544, column: 229, scope: !1182)
!1323 = !DILocation(line: 544, column: 232, scope: !1182)
!1324 = !DILocation(line: 544, column: 235, scope: !1182)
!1325 = !DILocation(line: 311, column: 9, scope: !410, inlinedAt: !1326)
!1326 = distinct !DILocation(line: 544, column: 205, scope: !1182)
!1327 = !DILocation(line: 0, scope: !400, inlinedAt: !1326)
!1328 = !DILocation(line: 311, column: 5, scope: !410, inlinedAt: !1326)
!1329 = !DILocation(line: 545, column: 34, scope: !1188)
!1330 = !DILocation(line: 0, scope: !123, inlinedAt: !1232)
!1331 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1232)
!1332 = !DILocation(line: 0, scope: !1188)
!1333 = !DILocation(line: 545, column: 79, scope: !1188)
!1334 = !DILocation(line: 0, scope: !123, inlinedAt: !1234)
!1335 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1234)
!1336 = !DILocation(line: 0, scope: !123, inlinedAt: !1337)
!1337 = distinct !DILocation(line: 545, column: 111, scope: !1188)
!1338 = !DILocation(line: 545, column: 169, scope: !1188)
!1339 = !DILocation(line: 0, scope: !123, inlinedAt: !1236)
!1340 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1236)
!1341 = !DILocation(line: 545, column: 226, scope: !1188)
!1342 = !DILocation(line: 545, column: 232, scope: !1188)
!1343 = !DILocation(line: 339, column: 9, scope: !431, inlinedAt: !1344)
!1344 = distinct !DILocation(line: 545, column: 205, scope: !1188)
!1345 = !DILocation(line: 0, scope: !417, inlinedAt: !1344)
!1346 = !DILocation(line: 0, scope: !431, inlinedAt: !1344)
!1347 = !DILocation(line: 339, column: 5, scope: !431, inlinedAt: !1344)
!1348 = !DILocation(line: 0, scope: !430, inlinedAt: !1344)
!1349 = !DILocation(line: 345, column: 7, scope: !446, inlinedAt: !1344)
!1350 = !DILocation(line: 347, column: 16, scope: !448, inlinedAt: !1344)
!1351 = !DILocation(line: 0, scope: !446, inlinedAt: !1344)
!1352 = !DILocation(line: 350, column: 8, scope: !430, inlinedAt: !1344)
!1353 = !DILocation(line: 351, column: 1, scope: !430, inlinedAt: !1344)
!1354 = !DILocation(line: 0, scope: !436, inlinedAt: !1344)
!1355 = !DILocation(line: 357, column: 8, scope: !454, inlinedAt: !1344)
!1356 = !DILocation(line: 359, column: 18, scope: !456, inlinedAt: !1344)
!1357 = !DILocation(line: 0, scope: !454, inlinedAt: !1344)
!1358 = !DILocation(line: 362, column: 9, scope: !436, inlinedAt: !1344)
!1359 = !DILocation(line: 546, column: 34, scope: !1194)
!1360 = !DILocation(line: 0, scope: !123, inlinedAt: !1238)
!1361 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1238)
!1362 = !DILocation(line: 0, scope: !1194)
!1363 = !DILocation(line: 546, column: 79, scope: !1194)
!1364 = !DILocation(line: 0, scope: !123, inlinedAt: !1240)
!1365 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1240)
!1366 = !DILocation(line: 0, scope: !123, inlinedAt: !1367)
!1367 = distinct !DILocation(line: 546, column: 111, scope: !1194)
!1368 = !DILocation(line: 546, column: 169, scope: !1194)
!1369 = !DILocation(line: 0, scope: !123, inlinedAt: !1242)
!1370 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1242)
!1371 = !DILocation(line: 546, column: 228, scope: !1194)
!1372 = !DILocation(line: 546, column: 234, scope: !1194)
!1373 = !DILocation(line: 374, column: 9, scope: !470, inlinedAt: !1374)
!1374 = distinct !DILocation(line: 546, column: 205, scope: !1194)
!1375 = !DILocation(line: 0, scope: !460, inlinedAt: !1374)
!1376 = !DILocation(line: 0, scope: !470, inlinedAt: !1374)
!1377 = !DILocation(line: 374, column: 5, scope: !470, inlinedAt: !1374)
!1378 = !DILocation(line: 0, scope: !469, inlinedAt: !1374)
!1379 = !DILocation(line: 380, column: 7, scope: !485, inlinedAt: !1374)
!1380 = !DILocation(line: 382, column: 16, scope: !487, inlinedAt: !1374)
!1381 = !DILocation(line: 0, scope: !485, inlinedAt: !1374)
!1382 = !DILocation(line: 385, column: 8, scope: !469, inlinedAt: !1374)
!1383 = !DILocation(line: 386, column: 1, scope: !469, inlinedAt: !1374)
!1384 = !DILocation(line: 0, scope: !475, inlinedAt: !1374)
!1385 = !DILocation(line: 392, column: 7, scope: !493, inlinedAt: !1374)
!1386 = !DILocation(line: 394, column: 16, scope: !495, inlinedAt: !1374)
!1387 = !DILocation(line: 0, scope: !493, inlinedAt: !1374)
!1388 = !DILocation(line: 397, column: 8, scope: !475, inlinedAt: !1374)
!1389 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1390)
!1390 = distinct !DILocation(line: 547, column: 9, scope: !1164)
!1391 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1390)
!1392 = !DILocation(line: 547, column: 30, scope: !1155)
!1393 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !15, file: !15, line: 548, type: !1394, scopeLine: 548, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !1398)
!1394 = !DISubroutineType(types: !1395)
!1395 = !{!1396, !10, !612, !614}
!1396 = !DIDerivedType(tag: DW_TAG_typedef, name: "uint64_t", file: !11, line: 102, baseType: !1397)
!1397 = !DIBasicType(name: "unsigned long long", size: 64, encoding: DW_ATE_unsigned)
!1398 = !{!1399, !1400, !1401}
!1399 = !DILocalVariable(name: "function", arg: 1, scope: !1393, file: !15, line: 548, type: !10)
!1400 = !DILocalVariable(name: "data", arg: 2, scope: !1393, file: !15, line: 548, type: !612)
!1401 = !DILocalVariable(name: "lengths", arg: 3, scope: !1393, file: !15, line: 548, type: !614)
!1402 = !DILocation(line: 0, scope: !1393)
!1403 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1404)
!1404 = distinct !DILocation(line: 549, column: 9, scope: !1405)
!1405 = distinct !DILexicalBlock(scope: !1393, file: !15, line: 548, column: 138)
!1406 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1404)
