; ModuleID = '/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_heldout_u32/checked/cpu.c'
source_filename = "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_heldout_u32/checked/cpu.c"
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
  br i1 %4, label %43, label %5, !dbg !129

5:                                                ; preds = %3
  %6 = and i32 %2, 3, !dbg !129
  %7 = icmp ult i32 %2, 4, !dbg !129
  br i1 %7, label %31, label %8, !dbg !129

8:                                                ; preds = %5
  %9 = and i32 %2, -4, !dbg !129
  br label %10, !dbg !129

10:                                               ; preds = %10, %8
  %11 = phi i32 [ 0, %8 ], [ %28, %10 ]
  %12 = phi i32 [ 0, %8 ], [ %29, %10 ]
    #dbg_value(i32 %11, !122, !DIExpression(), !126)
  %13 = getelementptr inbounds nuw i8, ptr %1, i32 %11, !dbg !130
  %14 = load i8, ptr %13, align 1, !dbg !130, !tbaa !131
  %15 = getelementptr inbounds nuw i8, ptr %0, i32 %11, !dbg !132
  store i8 %14, ptr %15, align 1, !dbg !133, !tbaa !131
  %16 = or disjoint i32 %11, 1, !dbg !134
    #dbg_value(i32 %16, !122, !DIExpression(), !126)
  %17 = getelementptr inbounds nuw i8, ptr %1, i32 %16, !dbg !130
  %18 = load i8, ptr %17, align 1, !dbg !130, !tbaa !131
  %19 = getelementptr inbounds nuw i8, ptr %0, i32 %16, !dbg !132
  store i8 %18, ptr %19, align 1, !dbg !133, !tbaa !131
  %20 = or disjoint i32 %11, 2, !dbg !134
    #dbg_value(i32 %20, !122, !DIExpression(), !126)
  %21 = getelementptr inbounds nuw i8, ptr %1, i32 %20, !dbg !130
  %22 = load i8, ptr %21, align 1, !dbg !130, !tbaa !131
  %23 = getelementptr inbounds nuw i8, ptr %0, i32 %20, !dbg !132
  store i8 %22, ptr %23, align 1, !dbg !133, !tbaa !131
  %24 = or disjoint i32 %11, 3, !dbg !134
    #dbg_value(i32 %24, !122, !DIExpression(), !126)
  %25 = getelementptr inbounds nuw i8, ptr %1, i32 %24, !dbg !130
  %26 = load i8, ptr %25, align 1, !dbg !130, !tbaa !131
  %27 = getelementptr inbounds nuw i8, ptr %0, i32 %24, !dbg !132
  store i8 %26, ptr %27, align 1, !dbg !133, !tbaa !131
  %28 = add nuw i32 %11, 4, !dbg !134
    #dbg_value(i32 %28, !122, !DIExpression(), !126)
  %29 = add i32 %12, 4, !dbg !129
  %30 = icmp eq i32 %29, %9, !dbg !129
  br i1 %30, label %31, label %10, !dbg !129, !llvm.loop !135

31:                                               ; preds = %10, %5
  %32 = phi i32 [ 0, %5 ], [ %28, %10 ]
  %33 = icmp eq i32 %6, 0, !dbg !129
  br i1 %33, label %43, label %34, !dbg !129

34:                                               ; preds = %31, %34
  %35 = phi i32 [ %40, %34 ], [ %32, %31 ]
  %36 = phi i32 [ %41, %34 ], [ 0, %31 ]
    #dbg_value(i32 %35, !122, !DIExpression(), !126)
  %37 = getelementptr inbounds nuw i8, ptr %1, i32 %35, !dbg !130
  %38 = load i8, ptr %37, align 1, !dbg !130, !tbaa !131
  %39 = getelementptr inbounds nuw i8, ptr %0, i32 %35, !dbg !132
  store i8 %38, ptr %39, align 1, !dbg !133, !tbaa !131
  %40 = add nuw i32 %35, 1, !dbg !134
    #dbg_value(i32 %40, !122, !DIExpression(), !126)
  %41 = add i32 %36, 1, !dbg !129
  %42 = icmp eq i32 %41, %6, !dbg !129
  br i1 %42, label %43, label %34, !dbg !129, !llvm.loop !138

43:                                               ; preds = %31, %34, %3
  ret ptr %0, !dbg !140
}

; Function Attrs: nofree norecurse nosync nounwind memory(argmem: write) uwtable
define hidden noundef ptr @memset(ptr noundef returned writeonly %0, i32 noundef %1, i32 noundef %2) local_unnamed_addr #6 !dbg !141 {
    #dbg_value(ptr %0, !146, !DIExpression(), !152)
    #dbg_value(i32 %1, !147, !DIExpression(), !152)
    #dbg_value(i32 %2, !148, !DIExpression(), !152)
    #dbg_value(ptr %0, !149, !DIExpression(), !152)
    #dbg_value(i32 0, !150, !DIExpression(), !153)
  %4 = icmp eq i32 %2, 0, !dbg !154
  br i1 %4, label %21, label %5, !dbg !156

5:                                                ; preds = %3
  %6 = trunc i32 %1 to i8
  %7 = and i32 %2, 7, !dbg !156
  %8 = icmp ult i32 %2, 8, !dbg !156
  br i1 %8, label %11, label %9, !dbg !156

9:                                                ; preds = %5
  %10 = and i32 %2, -8, !dbg !156
  br label %22, !dbg !156

11:                                               ; preds = %22, %5
  %12 = phi i32 [ 0, %5 ], [ %40, %22 ]
  %13 = icmp eq i32 %7, 0, !dbg !156
  br i1 %13, label %21, label %14, !dbg !156

14:                                               ; preds = %11, %14
  %15 = phi i32 [ %18, %14 ], [ %12, %11 ]
  %16 = phi i32 [ %19, %14 ], [ 0, %11 ]
    #dbg_value(i32 %15, !150, !DIExpression(), !153)
  %17 = getelementptr inbounds nuw i8, ptr %0, i32 %15, !dbg !157
  store i8 %6, ptr %17, align 1, !dbg !158, !tbaa !131
  %18 = add nuw i32 %15, 1, !dbg !159
    #dbg_value(i32 %18, !150, !DIExpression(), !153)
  %19 = add i32 %16, 1, !dbg !156
  %20 = icmp eq i32 %19, %7, !dbg !156
  br i1 %20, label %21, label %14, !dbg !156, !llvm.loop !160

21:                                               ; preds = %11, %14, %3
  ret ptr %0, !dbg !161

22:                                               ; preds = %22, %9
  %23 = phi i32 [ 0, %9 ], [ %40, %22 ]
  %24 = phi i32 [ 0, %9 ], [ %41, %22 ]
    #dbg_value(i32 %23, !150, !DIExpression(), !153)
  %25 = getelementptr inbounds nuw i8, ptr %0, i32 %23, !dbg !157
  store i8 %6, ptr %25, align 1, !dbg !158, !tbaa !131
  %26 = or disjoint i32 %23, 1, !dbg !159
    #dbg_value(i32 %26, !150, !DIExpression(), !153)
  %27 = getelementptr inbounds nuw i8, ptr %0, i32 %26, !dbg !157
  store i8 %6, ptr %27, align 1, !dbg !158, !tbaa !131
  %28 = or disjoint i32 %23, 2, !dbg !159
    #dbg_value(i32 %28, !150, !DIExpression(), !153)
  %29 = getelementptr inbounds nuw i8, ptr %0, i32 %28, !dbg !157
  store i8 %6, ptr %29, align 1, !dbg !158, !tbaa !131
  %30 = or disjoint i32 %23, 3, !dbg !159
    #dbg_value(i32 %30, !150, !DIExpression(), !153)
  %31 = getelementptr inbounds nuw i8, ptr %0, i32 %30, !dbg !157
  store i8 %6, ptr %31, align 1, !dbg !158, !tbaa !131
  %32 = or disjoint i32 %23, 4, !dbg !159
    #dbg_value(i32 %32, !150, !DIExpression(), !153)
  %33 = getelementptr inbounds nuw i8, ptr %0, i32 %32, !dbg !157
  store i8 %6, ptr %33, align 1, !dbg !158, !tbaa !131
  %34 = or disjoint i32 %23, 5, !dbg !159
    #dbg_value(i32 %34, !150, !DIExpression(), !153)
  %35 = getelementptr inbounds nuw i8, ptr %0, i32 %34, !dbg !157
  store i8 %6, ptr %35, align 1, !dbg !158, !tbaa !131
  %36 = or disjoint i32 %23, 6, !dbg !159
    #dbg_value(i32 %36, !150, !DIExpression(), !153)
  %37 = getelementptr inbounds nuw i8, ptr %0, i32 %36, !dbg !157
  store i8 %6, ptr %37, align 1, !dbg !158, !tbaa !131
  %38 = or disjoint i32 %23, 7, !dbg !159
    #dbg_value(i32 %38, !150, !DIExpression(), !153)
  %39 = getelementptr inbounds nuw i8, ptr %0, i32 %38, !dbg !157
  store i8 %6, ptr %39, align 1, !dbg !158, !tbaa !131
  %40 = add nuw i32 %23, 8, !dbg !159
    #dbg_value(i32 %40, !150, !DIExpression(), !153)
  %41 = add i32 %24, 8, !dbg !156
  %42 = icmp eq i32 %41, %10, !dbg !156
  br i1 %42, label %11, label %22, !dbg !156, !llvm.loop !162
}

; Function Attrs: nounwind uwtable
define hidden void @lang_fn_pipeline38_left_padded_zip_heldout_u32(ptr dead_on_unwind noalias nocapture writable writeonly sret(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %1, ptr nocapture noundef readnone byval(%struct.ink_l_uint32) align 4 %2, i32 noundef %3, i32 noundef %4) local_unnamed_addr #2 !dbg !164 {
    #dbg_declare(ptr %1, !173, !DIExpression(), !235)
    #dbg_declare(ptr %2, !174, !DIExpression(), !236)
    #dbg_value(i32 %3, !175, !DIExpression(), !237)
    #dbg_value(i32 %4, !176, !DIExpression(), !237)
  %6 = load ptr, ptr %1, align 4, !dbg !238, !tbaa !239
  %7 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !238
  %8 = load i32, ptr %7, align 4, !dbg !238, !tbaa !27
    #dbg_value(ptr %6, !177, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !237)
    #dbg_value(i32 %8, !177, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !237)
    #dbg_declare(ptr %0, !178, !DIExpression(), !242)
    #dbg_value(i32 %8, !55, !DIExpression(), !243)
    #dbg_value(i32 4, !56, !DIExpression(), !243)
  %9 = icmp ugt i32 %8, 1073741823, !dbg !245
  %10 = load i32, ptr @ink_top, align 4
  %11 = icmp ugt i32 %10, -8
  %12 = select i1 %9, i1 true, i1 %11, !dbg !246
  br i1 %12, label %13, label %14, !dbg !246

13:                                               ; preds = %5
  tail call void @llvm.trap(), !dbg !247
  unreachable, !dbg !249

14:                                               ; preds = %5
  %15 = icmp eq i32 %10, 0, !dbg !250
  %16 = add nuw i32 %10, 7, !dbg !251
  %17 = select i1 %15, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %16, !dbg !252
  %18 = and i32 %17, -8, !dbg !253
    #dbg_value(i32 %18, !57, !DIExpression(), !243)
  %19 = tail call i32 @llvm.umax.i32(i32 %8, i32 1), !dbg !254
  %20 = shl nuw i32 %19, 2, !dbg !255
    #dbg_value(i32 %20, !58, !DIExpression(), !243)
  %21 = xor i32 %18, -1, !dbg !256
  %22 = icmp ugt i32 %20, %21, !dbg !257
  br i1 %22, label %23, label %24, !dbg !257

23:                                               ; preds = %14
  tail call void @llvm.trap(), !dbg !258
  unreachable, !dbg !260

24:                                               ; preds = %14
  %25 = add i32 %18, %20, !dbg !261
  store i32 %25, ptr @ink_top, align 4, !dbg !262, !tbaa !27
  %26 = add i32 %25, 65535, !dbg !263
  %27 = lshr i32 %26, 16, !dbg !264
    #dbg_value(i32 %27, !59, !DIExpression(), !243)
  %28 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !265
    #dbg_value(i32 %28, !60, !DIExpression(), !243)
  %29 = icmp ugt i32 %27, %28, !dbg !266
  br i1 %29, label %30, label %35, !dbg !267

30:                                               ; preds = %24
  %31 = sub nuw nsw i32 %27, %28, !dbg !268
  %32 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %31), !dbg !269
  %33 = icmp eq i32 %32, -1, !dbg !270
  br i1 %33, label %34, label %35, !dbg !267

34:                                               ; preds = %30
  tail call void @llvm.trap(), !dbg !271
  unreachable, !dbg !273

35:                                               ; preds = %24, %30
  %36 = inttoptr i32 %18 to ptr, !dbg !274
  store ptr %36, ptr %0, align 4, !dbg !275, !tbaa !276
  %37 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !275
  store i32 %8, ptr %37, align 4, !dbg !275, !tbaa !278
    #dbg_value(i32 0, !179, !DIExpression(), !279)
  %38 = icmp eq i32 %8, 0, !dbg !280
  br i1 %38, label %41, label %39, !dbg !281

39:                                               ; preds = %35
  %40 = icmp eq i32 %4, 0
  br label %42, !dbg !281

41:                                               ; preds = %73, %35
  ret void, !dbg !282

42:                                               ; preds = %39, %73
  %43 = phi i32 [ 0, %39 ], [ %76, %73 ]
    #dbg_value(i32 %43, !179, !DIExpression(), !279)
    #dbg_value(i32 %43, !181, !DIExpression(), !283)
  %44 = getelementptr inbounds nuw i32, ptr %6, i32 %43, !dbg !284
    #dbg_value(i32 poison, !184, !DIExpression(), !283)
    #dbg_value(i32 %3, !185, !DIExpression(), !283)
    #dbg_value(i32 %4, !186, !DIExpression(), !283)
    #dbg_value(i32 %43, !187, !DIExpression(), !283)
    #dbg_value(i32 poison, !188, !DIExpression(), !283)
    #dbg_value(i32 %3, !189, !DIExpression(), !283)
    #dbg_value(i32 %4, !190, !DIExpression(), !283)
    #dbg_value(i32 poison, !191, !DIExpression(), !283)
    #dbg_value(i32 %4, !192, !DIExpression(), !283)
  %45 = load i32, ptr %44, align 4, !dbg !285, !tbaa !286
  br i1 %40, label %46, label %51, !dbg !288

46:                                               ; preds = %42
    #dbg_value(i32 poison, !197, !DIExpression(), !283)
    #dbg_value(i32 0, !198, !DIExpression(), !283)
    #dbg_value(i32 %3, !199, !DIExpression(), !283)
    #dbg_value(i32 %43, !200, !DIExpression(), !283)
    #dbg_value(i32 %45, !201, !DIExpression(), !283)
    #dbg_value(i32 %3, !202, !DIExpression(), !283)
    #dbg_value(i32 %4, !203, !DIExpression(), !283)
    #dbg_value(i32 %43, !204, !DIExpression(), !283)
    #dbg_value(i32 %45, !205, !DIExpression(), !283)
    #dbg_value(i32 %3, !206, !DIExpression(), !283)
    #dbg_value(i32 %4, !207, !DIExpression(), !283)
    #dbg_value(i32 %43, !208, !DIExpression(), !283)
  %47 = icmp ult i32 %43, %3, !dbg !290
  %48 = mul i32 %45, 3, !dbg !291
  %49 = select i1 %47, i32 %45, i32 %48, !dbg !291
    #dbg_value(i32 %49, !209, !DIExpression(), !283)
    #dbg_value(i32 %49, !215, !DIExpression(), !283)
    #dbg_value(i32 %3, !216, !DIExpression(), !283)
    #dbg_value(i32 %4, !217, !DIExpression(), !283)
    #dbg_value(i32 %3, !218, !DIExpression(), !283)
    #dbg_value(i32 %49, !219, !DIExpression(), !283)
    #dbg_value(i32 %3, !220, !DIExpression(), !283)
    #dbg_value(i32 %4, !221, !DIExpression(), !283)
    #dbg_value(i32 %3, !222, !DIExpression(), !283)
  %50 = icmp ult i32 %3, %49, !dbg !292
  br i1 %50, label %63, label %69, !dbg !293

51:                                               ; preds = %42
    #dbg_value(i32 %45, !184, !DIExpression(), !283)
    #dbg_value(i32 %45, !188, !DIExpression(), !283)
    #dbg_value(i32 %45, !191, !DIExpression(), !283)
  %52 = udiv i32 %45, %4, !dbg !294
    #dbg_value(i32 %52, !193, !DIExpression(), !283)
    #dbg_value(i32 %52, !194, !DIExpression(), !283)
    #dbg_value(i32 %43, !195, !DIExpression(), !283)
    #dbg_value(i32 %4, !196, !DIExpression(), !283)
  %53 = urem i32 %43, %4, !dbg !296
    #dbg_value(i32 %53, !197, !DIExpression(), !283)
  %54 = add i32 %53, %52
    #dbg_value(i32 poison, !197, !DIExpression(), !283)
    #dbg_value(i32 %54, !198, !DIExpression(), !283)
  %55 = add i32 %54, %3, !dbg !299
    #dbg_value(i32 %55, !199, !DIExpression(), !283)
    #dbg_value(i32 %43, !200, !DIExpression(), !283)
    #dbg_value(i32 %45, !201, !DIExpression(), !283)
    #dbg_value(i32 %3, !202, !DIExpression(), !283)
    #dbg_value(i32 %4, !203, !DIExpression(), !283)
    #dbg_value(i32 %43, !204, !DIExpression(), !283)
    #dbg_value(i32 %45, !205, !DIExpression(), !283)
    #dbg_value(i32 %3, !206, !DIExpression(), !283)
    #dbg_value(i32 %4, !207, !DIExpression(), !283)
    #dbg_value(i32 %43, !208, !DIExpression(), !283)
  %56 = icmp ult i32 %43, %3, !dbg !290
  %57 = add i32 %45, %4, !dbg !291
  %58 = mul i32 %45, 3, !dbg !291
  %59 = select i1 %56, i32 %57, i32 %58, !dbg !291
    #dbg_value(i32 %59, !209, !DIExpression(), !283)
    #dbg_value(i32 %59, !215, !DIExpression(), !283)
    #dbg_value(i32 %3, !216, !DIExpression(), !283)
    #dbg_value(i32 %4, !217, !DIExpression(), !283)
    #dbg_value(i32 %55, !218, !DIExpression(), !283)
    #dbg_value(i32 %59, !219, !DIExpression(), !283)
    #dbg_value(i32 %3, !220, !DIExpression(), !283)
    #dbg_value(i32 %4, !221, !DIExpression(), !283)
    #dbg_value(i32 %55, !222, !DIExpression(), !283)
  %60 = icmp ult i32 %55, %59, !dbg !292
  br i1 %60, label %61, label %67, !dbg !293

61:                                               ; preds = %51
    #dbg_value(i32 %55, !224, !DIExpression(), !300)
    #dbg_value(i32 %4, !227, !DIExpression(), !300)
  %62 = udiv i32 %55, %4, !dbg !301
    #dbg_value(i32 %62, !228, !DIExpression(), !300)
  br label %63

63:                                               ; preds = %46, %61
  %64 = phi i32 [ %59, %61 ], [ %49, %46 ]
  %65 = phi i32 [ %62, %61 ], [ 0, %46 ], !dbg !304
    #dbg_value(i32 %65, !228, !DIExpression(), !300)
    #dbg_value(i32 %65, !229, !DIExpression(), !300)
  %66 = add i32 %65, %64, !dbg !305
    #dbg_value(i32 %66, !223, !DIExpression(), !283)
  br label %73, !dbg !306

67:                                               ; preds = %51
    #dbg_value(i32 %59, !230, !DIExpression(), !307)
    #dbg_value(i32 %4, !232, !DIExpression(), !307)
  %68 = urem i32 %59, %4, !dbg !308
    #dbg_value(i32 %68, !233, !DIExpression(), !307)
  br label %69

69:                                               ; preds = %46, %67
  %70 = phi i32 [ %55, %67 ], [ %3, %46 ]
  %71 = phi i32 [ %68, %67 ], [ 0, %46 ], !dbg !311
    #dbg_value(i32 %71, !233, !DIExpression(), !307)
    #dbg_value(i32 %71, !234, !DIExpression(), !307)
  %72 = add i32 %71, %70, !dbg !312
    #dbg_value(i32 %72, !223, !DIExpression(), !283)
  br label %73

73:                                               ; preds = %69, %63
  %74 = phi i32 [ %66, %63 ], [ %72, %69 ], !dbg !313
    #dbg_value(i32 %74, !223, !DIExpression(), !283)
  %75 = getelementptr inbounds nuw i32, ptr %36, i32 %43, !dbg !314
  store i32 %74, ptr %75, align 4, !dbg !315, !tbaa !286
  %76 = add nuw i32 %43, 1, !dbg !316
    #dbg_value(i32 %76, !179, !DIExpression(), !279)
  %77 = icmp eq i32 %76, %8, !dbg !280
  br i1 %77, label %41, label %42, !dbg !281, !llvm.loop !317
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_left_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !319 {
    #dbg_value(i32 %0, !323, !DIExpression(), !339)
    #dbg_value(i32 %1, !324, !DIExpression(), !339)
    #dbg_value(i32 %2, !325, !DIExpression(), !339)
    #dbg_value(i32 %3, !326, !DIExpression(), !339)
    #dbg_value(i32 %0, !327, !DIExpression(), !339)
    #dbg_value(i32 %1, !328, !DIExpression(), !339)
    #dbg_value(i32 %2, !329, !DIExpression(), !339)
    #dbg_value(i32 %3, !330, !DIExpression(), !339)
    #dbg_value(i32 %1, !331, !DIExpression(), !339)
    #dbg_value(i32 %3, !332, !DIExpression(), !339)
  %5 = icmp eq i32 %3, 0, !dbg !340
  br i1 %5, label %10, label %6, !dbg !340

6:                                                ; preds = %4
  %7 = udiv i32 %1, %3, !dbg !342
    #dbg_value(i32 %7, !333, !DIExpression(), !339)
    #dbg_value(i32 %7, !334, !DIExpression(), !339)
    #dbg_value(i32 %0, !335, !DIExpression(), !339)
    #dbg_value(i32 %3, !336, !DIExpression(), !339)
  %8 = urem i32 %0, %3, !dbg !344
    #dbg_value(i32 %8, !337, !DIExpression(), !339)
  %9 = add i32 %8, %7
  br label %10

10:                                               ; preds = %4, %6
  %11 = phi i32 [ %9, %6 ], [ 0, %4 ], !dbg !347
    #dbg_value(i32 poison, !337, !DIExpression(), !339)
    #dbg_value(i32 %11, !338, !DIExpression(), !339)
  %12 = add i32 %11, %2, !dbg !348
  ret i32 %12, !dbg !349
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_left_signal(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !350 {
    #dbg_value(i32 %0, !352, !DIExpression(), !364)
    #dbg_value(i32 %1, !353, !DIExpression(), !364)
    #dbg_value(i32 %2, !354, !DIExpression(), !364)
    #dbg_value(i32 %3, !355, !DIExpression(), !364)
    #dbg_value(i32 %1, !356, !DIExpression(), !364)
    #dbg_value(i32 %3, !357, !DIExpression(), !364)
  %5 = icmp eq i32 %3, 0, !dbg !365
  br i1 %5, label %10, label %6, !dbg !365

6:                                                ; preds = %4
  %7 = udiv i32 %1, %3, !dbg !367
    #dbg_value(i32 %7, !358, !DIExpression(), !364)
    #dbg_value(i32 %7, !359, !DIExpression(), !364)
    #dbg_value(i32 %0, !360, !DIExpression(), !364)
    #dbg_value(i32 %3, !361, !DIExpression(), !364)
  %8 = urem i32 %0, %3, !dbg !369
    #dbg_value(i32 %8, !362, !DIExpression(), !364)
  %9 = add i32 %8, %7
  br label %10

10:                                               ; preds = %4, %6
  %11 = phi i32 [ %9, %6 ], [ 0, %4 ], !dbg !372
    #dbg_value(i32 poison, !362, !DIExpression(), !364)
    #dbg_value(i32 %11, !363, !DIExpression(), !364)
  %12 = add i32 %11, %2, !dbg !373
  ret i32 %12, !dbg !374
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_right_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !375 {
    #dbg_value(i32 %0, !377, !DIExpression(), !392)
    #dbg_value(i32 %1, !378, !DIExpression(), !392)
    #dbg_value(i32 %2, !379, !DIExpression(), !392)
    #dbg_value(i32 %3, !380, !DIExpression(), !392)
    #dbg_value(i32 %0, !381, !DIExpression(), !392)
    #dbg_value(i32 %1, !382, !DIExpression(), !392)
    #dbg_value(i32 %2, !383, !DIExpression(), !392)
    #dbg_value(i32 %3, !384, !DIExpression(), !392)
    #dbg_value(i32 %0, !385, !DIExpression(), !392)
  %5 = icmp ult i32 %0, %2, !dbg !393
  %6 = add i32 %3, %1, !dbg !394
  %7 = mul i32 %1, 3, !dbg !394
  %8 = select i1 %5, i32 %6, i32 %7, !dbg !394
    #dbg_value(i32 %8, !386, !DIExpression(), !392)
  ret i32 %8, !dbg !395
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_right_signal(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !396 {
    #dbg_value(i32 %0, !398, !DIExpression(), !409)
    #dbg_value(i32 %1, !399, !DIExpression(), !409)
    #dbg_value(i32 %2, !400, !DIExpression(), !409)
    #dbg_value(i32 %3, !401, !DIExpression(), !409)
    #dbg_value(i32 %0, !402, !DIExpression(), !409)
  %5 = icmp ult i32 %0, %2, !dbg !410
  %6 = add i32 %3, %1, !dbg !411
  %7 = mul i32 %1, 3, !dbg !411
  %8 = select i1 %5, i32 %6, i32 %7, !dbg !411
    #dbg_value(i32 %8, !403, !DIExpression(), !409)
  ret i32 %8, !dbg !412
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_pair_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !413 {
    #dbg_value(i32 %0, !415, !DIExpression(), !436)
    #dbg_value(i32 %1, !416, !DIExpression(), !436)
    #dbg_value(i32 %2, !417, !DIExpression(), !436)
    #dbg_value(i32 %3, !418, !DIExpression(), !436)
    #dbg_value(i32 %0, !419, !DIExpression(), !436)
    #dbg_value(i32 %1, !420, !DIExpression(), !436)
    #dbg_value(i32 %2, !421, !DIExpression(), !436)
    #dbg_value(i32 %3, !422, !DIExpression(), !436)
    #dbg_value(i32 %0, !423, !DIExpression(), !436)
  %5 = icmp ult i32 %0, %1, !dbg !437
  %6 = icmp eq i32 %3, 0, !dbg !438
  br i1 %5, label %7, label %13, !dbg !439

7:                                                ; preds = %4
    #dbg_value(i32 %0, !425, !DIExpression(), !440)
    #dbg_value(i32 %3, !428, !DIExpression(), !440)
  br i1 %6, label %10, label %8, !dbg !441

8:                                                ; preds = %7
  %9 = udiv i32 %0, %3, !dbg !443
    #dbg_value(i32 %9, !429, !DIExpression(), !440)
  br label %10

10:                                               ; preds = %7, %8
  %11 = phi i32 [ %9, %8 ], [ 0, %7 ], !dbg !445
    #dbg_value(i32 %11, !429, !DIExpression(), !440)
    #dbg_value(i32 %11, !430, !DIExpression(), !440)
  %12 = add i32 %11, %1, !dbg !446
    #dbg_value(i32 %12, !424, !DIExpression(), !436)
  br label %19, !dbg !447

13:                                               ; preds = %4
    #dbg_value(i32 %1, !431, !DIExpression(), !448)
    #dbg_value(i32 %3, !433, !DIExpression(), !448)
  br i1 %6, label %16, label %14, !dbg !449

14:                                               ; preds = %13
  %15 = urem i32 %1, %3, !dbg !451
    #dbg_value(i32 %15, !434, !DIExpression(), !448)
  br label %16

16:                                               ; preds = %13, %14
  %17 = phi i32 [ %15, %14 ], [ 0, %13 ], !dbg !453
    #dbg_value(i32 %17, !434, !DIExpression(), !448)
    #dbg_value(i32 %17, !435, !DIExpression(), !448)
  %18 = add i32 %17, %0, !dbg !454
    #dbg_value(i32 %18, !424, !DIExpression(), !436)
  br label %19

19:                                               ; preds = %16, %10
  %20 = phi i32 [ %12, %10 ], [ %18, %16 ], !dbg !438
    #dbg_value(i32 %20, !424, !DIExpression(), !436)
  ret i32 %20, !dbg !455
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_pair_signal(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !456 {
    #dbg_value(i32 %0, !458, !DIExpression(), !475)
    #dbg_value(i32 %1, !459, !DIExpression(), !475)
    #dbg_value(i32 %2, !460, !DIExpression(), !475)
    #dbg_value(i32 %3, !461, !DIExpression(), !475)
    #dbg_value(i32 %0, !462, !DIExpression(), !475)
  %5 = icmp ult i32 %0, %1, !dbg !476
  %6 = icmp eq i32 %3, 0, !dbg !477
  br i1 %5, label %7, label %13, !dbg !478

7:                                                ; preds = %4
    #dbg_value(i32 %0, !464, !DIExpression(), !479)
    #dbg_value(i32 %3, !467, !DIExpression(), !479)
  br i1 %6, label %10, label %8, !dbg !480

8:                                                ; preds = %7
  %9 = udiv i32 %0, %3, !dbg !482
    #dbg_value(i32 %9, !468, !DIExpression(), !479)
  br label %10

10:                                               ; preds = %7, %8
  %11 = phi i32 [ %9, %8 ], [ 0, %7 ], !dbg !484
    #dbg_value(i32 %11, !468, !DIExpression(), !479)
    #dbg_value(i32 %11, !469, !DIExpression(), !479)
  %12 = add i32 %11, %1, !dbg !485
    #dbg_value(i32 %12, !463, !DIExpression(), !475)
  br label %19, !dbg !486

13:                                               ; preds = %4
    #dbg_value(i32 %1, !470, !DIExpression(), !487)
    #dbg_value(i32 %3, !472, !DIExpression(), !487)
  br i1 %6, label %16, label %14, !dbg !488

14:                                               ; preds = %13
  %15 = urem i32 %1, %3, !dbg !490
    #dbg_value(i32 %15, !473, !DIExpression(), !487)
  br label %16

16:                                               ; preds = %13, %14
  %17 = phi i32 [ %15, %14 ], [ 0, %13 ], !dbg !492
    #dbg_value(i32 %17, !473, !DIExpression(), !487)
    #dbg_value(i32 %17, !474, !DIExpression(), !487)
  %18 = add i32 %17, %0, !dbg !493
    #dbg_value(i32 %18, !463, !DIExpression(), !475)
  br label %19

19:                                               ; preds = %16, %10
  %20 = phi i32 [ %12, %10 ], [ %18, %16 ], !dbg !477
    #dbg_value(i32 %20, !463, !DIExpression(), !475)
  ret i32 %20, !dbg !494
}

; Function Attrs: nofree norecurse nosync nounwind memory(read, argmem: readwrite, inaccessiblemem: none) uwtable
define hidden i32 @lang_fn_pipeline38_left_padded_zip_heldout_u32_into(ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readnone byval(%struct.ink_l_uint32) align 4 %1, i32 noundef %2, i32 noundef %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #8 !dbg !495 {
    #dbg_declare(ptr %0, !499, !DIExpression(), !562)
    #dbg_declare(ptr %1, !500, !DIExpression(), !563)
    #dbg_value(i32 %2, !501, !DIExpression(), !564)
    #dbg_value(i32 %3, !502, !DIExpression(), !564)
    #dbg_value(ptr %4, !503, !DIExpression(), !564)
  %6 = load ptr, ptr %0, align 4, !dbg !565, !tbaa !239
  %7 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !565
  %8 = load i32, ptr %7, align 4, !dbg !565, !tbaa !27
    #dbg_value(ptr %6, !504, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !564)
    #dbg_value(i32 %8, !504, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !564)
    #dbg_value(ptr %4, !505, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !564)
    #dbg_value(i32 %8, !505, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !564)
    #dbg_value(i32 0, !506, !DIExpression(), !566)
  %9 = icmp eq i32 %8, 0, !dbg !567
  br i1 %9, label %12, label %10, !dbg !568

10:                                               ; preds = %5
  %11 = icmp eq i32 %3, 0
  br label %13, !dbg !568

12:                                               ; preds = %44, %5
  ret i32 %8, !dbg !569

13:                                               ; preds = %10, %44
  %14 = phi i32 [ 0, %10 ], [ %47, %44 ]
    #dbg_value(i32 %14, !506, !DIExpression(), !566)
    #dbg_value(i32 %14, !508, !DIExpression(), !570)
  %15 = getelementptr inbounds nuw i32, ptr %6, i32 %14, !dbg !571
    #dbg_value(i32 poison, !511, !DIExpression(), !570)
    #dbg_value(i32 %2, !512, !DIExpression(), !570)
    #dbg_value(i32 %3, !513, !DIExpression(), !570)
    #dbg_value(i32 %14, !514, !DIExpression(), !570)
    #dbg_value(i32 poison, !515, !DIExpression(), !570)
    #dbg_value(i32 %2, !516, !DIExpression(), !570)
    #dbg_value(i32 %3, !517, !DIExpression(), !570)
    #dbg_value(i32 poison, !518, !DIExpression(), !570)
    #dbg_value(i32 %3, !519, !DIExpression(), !570)
  %16 = load i32, ptr %15, align 4, !dbg !572, !tbaa !286
  br i1 %11, label %17, label %22, !dbg !573

17:                                               ; preds = %13
    #dbg_value(i32 poison, !524, !DIExpression(), !570)
    #dbg_value(i32 0, !525, !DIExpression(), !570)
    #dbg_value(i32 %2, !526, !DIExpression(), !570)
    #dbg_value(i32 %14, !527, !DIExpression(), !570)
    #dbg_value(i32 %16, !528, !DIExpression(), !570)
    #dbg_value(i32 %2, !529, !DIExpression(), !570)
    #dbg_value(i32 %3, !530, !DIExpression(), !570)
    #dbg_value(i32 %14, !531, !DIExpression(), !570)
    #dbg_value(i32 %16, !532, !DIExpression(), !570)
    #dbg_value(i32 %2, !533, !DIExpression(), !570)
    #dbg_value(i32 %3, !534, !DIExpression(), !570)
    #dbg_value(i32 %14, !535, !DIExpression(), !570)
  %18 = icmp ult i32 %14, %2, !dbg !575
  %19 = mul i32 %16, 3, !dbg !576
  %20 = select i1 %18, i32 %16, i32 %19, !dbg !576
    #dbg_value(i32 %20, !536, !DIExpression(), !570)
    #dbg_value(i32 %20, !542, !DIExpression(), !570)
    #dbg_value(i32 %2, !543, !DIExpression(), !570)
    #dbg_value(i32 %3, !544, !DIExpression(), !570)
    #dbg_value(i32 %2, !545, !DIExpression(), !570)
    #dbg_value(i32 %20, !546, !DIExpression(), !570)
    #dbg_value(i32 %2, !547, !DIExpression(), !570)
    #dbg_value(i32 %3, !548, !DIExpression(), !570)
    #dbg_value(i32 %2, !549, !DIExpression(), !570)
  %21 = icmp ult i32 %2, %20, !dbg !577
  br i1 %21, label %34, label %40, !dbg !578

22:                                               ; preds = %13
    #dbg_value(i32 %16, !511, !DIExpression(), !570)
    #dbg_value(i32 %16, !515, !DIExpression(), !570)
    #dbg_value(i32 %16, !518, !DIExpression(), !570)
  %23 = udiv i32 %16, %3, !dbg !579
    #dbg_value(i32 %23, !520, !DIExpression(), !570)
    #dbg_value(i32 %23, !521, !DIExpression(), !570)
    #dbg_value(i32 %14, !522, !DIExpression(), !570)
    #dbg_value(i32 %3, !523, !DIExpression(), !570)
  %24 = urem i32 %14, %3, !dbg !581
    #dbg_value(i32 %24, !524, !DIExpression(), !570)
  %25 = add i32 %24, %23
    #dbg_value(i32 poison, !524, !DIExpression(), !570)
    #dbg_value(i32 %25, !525, !DIExpression(), !570)
  %26 = add i32 %25, %2, !dbg !584
    #dbg_value(i32 %26, !526, !DIExpression(), !570)
    #dbg_value(i32 %14, !527, !DIExpression(), !570)
    #dbg_value(i32 %16, !528, !DIExpression(), !570)
    #dbg_value(i32 %2, !529, !DIExpression(), !570)
    #dbg_value(i32 %3, !530, !DIExpression(), !570)
    #dbg_value(i32 %14, !531, !DIExpression(), !570)
    #dbg_value(i32 %16, !532, !DIExpression(), !570)
    #dbg_value(i32 %2, !533, !DIExpression(), !570)
    #dbg_value(i32 %3, !534, !DIExpression(), !570)
    #dbg_value(i32 %14, !535, !DIExpression(), !570)
  %27 = icmp ult i32 %14, %2, !dbg !575
  %28 = add i32 %16, %3, !dbg !576
  %29 = mul i32 %16, 3, !dbg !576
  %30 = select i1 %27, i32 %28, i32 %29, !dbg !576
    #dbg_value(i32 %30, !536, !DIExpression(), !570)
    #dbg_value(i32 %30, !542, !DIExpression(), !570)
    #dbg_value(i32 %2, !543, !DIExpression(), !570)
    #dbg_value(i32 %3, !544, !DIExpression(), !570)
    #dbg_value(i32 %26, !545, !DIExpression(), !570)
    #dbg_value(i32 %30, !546, !DIExpression(), !570)
    #dbg_value(i32 %2, !547, !DIExpression(), !570)
    #dbg_value(i32 %3, !548, !DIExpression(), !570)
    #dbg_value(i32 %26, !549, !DIExpression(), !570)
  %31 = icmp ult i32 %26, %30, !dbg !577
  br i1 %31, label %32, label %38, !dbg !578

32:                                               ; preds = %22
    #dbg_value(i32 %26, !551, !DIExpression(), !585)
    #dbg_value(i32 %3, !554, !DIExpression(), !585)
  %33 = udiv i32 %26, %3, !dbg !586
    #dbg_value(i32 %33, !555, !DIExpression(), !585)
  br label %34

34:                                               ; preds = %17, %32
  %35 = phi i32 [ %30, %32 ], [ %20, %17 ]
  %36 = phi i32 [ %33, %32 ], [ 0, %17 ], !dbg !589
    #dbg_value(i32 %36, !555, !DIExpression(), !585)
    #dbg_value(i32 %36, !556, !DIExpression(), !585)
  %37 = add i32 %36, %35, !dbg !590
    #dbg_value(i32 %37, !550, !DIExpression(), !570)
  br label %44, !dbg !591

38:                                               ; preds = %22
    #dbg_value(i32 %30, !557, !DIExpression(), !592)
    #dbg_value(i32 %3, !559, !DIExpression(), !592)
  %39 = urem i32 %30, %3, !dbg !593
    #dbg_value(i32 %39, !560, !DIExpression(), !592)
  br label %40

40:                                               ; preds = %17, %38
  %41 = phi i32 [ %26, %38 ], [ %2, %17 ]
  %42 = phi i32 [ %39, %38 ], [ 0, %17 ], !dbg !596
    #dbg_value(i32 %42, !560, !DIExpression(), !592)
    #dbg_value(i32 %42, !561, !DIExpression(), !592)
  %43 = add i32 %42, %41, !dbg !597
    #dbg_value(i32 %43, !550, !DIExpression(), !570)
  br label %44

44:                                               ; preds = %40, %34
  %45 = phi i32 [ %37, %34 ], [ %43, %40 ], !dbg !598
    #dbg_value(i32 %45, !550, !DIExpression(), !570)
  %46 = getelementptr inbounds nuw i32, ptr %4, i32 %14, !dbg !599
  store i32 %45, ptr %46, align 4, !dbg !600, !tbaa !286
  %47 = add nuw i32 %14, 1, !dbg !601
    #dbg_value(i32 %47, !506, !DIExpression(), !566)
  %48 = icmp eq i32 %47, %8, !dbg !567
  br i1 %48, label %12, label %13, !dbg !568, !llvm.loop !602
}

; Function Attrs: nounwind memory(read, argmem: readwrite, inaccessiblemem: write) uwtable
define hidden i32 @ink_compute_into(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readonly %2, ptr nocapture noundef writeonly %3) local_unnamed_addr #9 !dbg !604 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !622)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !622)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !622)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !622)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !622)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !622)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !622)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !622)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !624)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !624)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !624)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !624)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !624)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !624)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !624)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !624)
    #dbg_value(i32 %0, !612, !DIExpression(), !626)
    #dbg_value(ptr %1, !613, !DIExpression(), !626)
    #dbg_value(ptr %2, !614, !DIExpression(), !626)
    #dbg_value(ptr %3, !615, !DIExpression(), !626)
  %5 = icmp eq i32 %0, 0, !dbg !627
  br i1 %5, label %6, label %87, !dbg !627

6:                                                ; preds = %4
  %7 = load ptr, ptr %1, align 4, !dbg !628, !tbaa !629
    #dbg_value(ptr %7, !616, !DIExpression(), !630)
    #dbg_value(ptr poison, !619, !DIExpression(), !630)
  %8 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !631
  %9 = load ptr, ptr %8, align 4, !dbg !631, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !622)
    #dbg_value(ptr %9, !115, !DIExpression(), !622)
    #dbg_value(i32 4, !116, !DIExpression(), !622)
    #dbg_value(ptr undef, !117, !DIExpression(), !622)
    #dbg_value(ptr %9, !119, !DIExpression(), !622)
    #dbg_value(i32 0, !122, !DIExpression(), !632)
  %10 = load i8, ptr %9, align 1, !dbg !633, !tbaa !131
    #dbg_value(i8 %10, !620, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !630)
    #dbg_value(i32 1, !122, !DIExpression(), !632)
  %11 = getelementptr inbounds nuw i8, ptr %9, i32 1, !dbg !633
  %12 = load i8, ptr %11, align 1, !dbg !633, !tbaa !131
    #dbg_value(i8 %12, !620, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !630)
    #dbg_value(i32 2, !122, !DIExpression(), !632)
  %13 = getelementptr inbounds nuw i8, ptr %9, i32 2, !dbg !633
  %14 = load i8, ptr %13, align 1, !dbg !633, !tbaa !131
    #dbg_value(i8 %14, !620, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !630)
    #dbg_value(i32 3, !122, !DIExpression(), !632)
  %15 = getelementptr inbounds nuw i8, ptr %9, i32 3, !dbg !633
  %16 = load i8, ptr %15, align 1, !dbg !633, !tbaa !131
    #dbg_value(i8 %16, !620, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !630)
    #dbg_value(i32 4, !122, !DIExpression(), !632)
  %17 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !634
  %18 = load ptr, ptr %17, align 4, !dbg !634, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !624)
    #dbg_value(ptr %18, !115, !DIExpression(), !624)
    #dbg_value(i32 4, !116, !DIExpression(), !624)
    #dbg_value(ptr undef, !117, !DIExpression(), !624)
    #dbg_value(ptr %18, !119, !DIExpression(), !624)
    #dbg_value(i32 0, !122, !DIExpression(), !635)
  %19 = load i8, ptr %18, align 1, !dbg !636, !tbaa !131
    #dbg_value(i8 %19, !621, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !630)
    #dbg_value(i32 1, !122, !DIExpression(), !635)
  %20 = getelementptr inbounds nuw i8, ptr %18, i32 1, !dbg !636
  %21 = load i8, ptr %20, align 1, !dbg !636, !tbaa !131
    #dbg_value(i8 %21, !621, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !630)
    #dbg_value(i32 2, !122, !DIExpression(), !635)
  %22 = getelementptr inbounds nuw i8, ptr %18, i32 2, !dbg !636
  %23 = load i8, ptr %22, align 1, !dbg !636, !tbaa !131
    #dbg_value(i8 %23, !621, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !630)
    #dbg_value(i32 3, !122, !DIExpression(), !635)
  %24 = getelementptr inbounds nuw i8, ptr %18, i32 3, !dbg !636
  %25 = load i8, ptr %24, align 1, !dbg !636, !tbaa !131
    #dbg_value(i8 %25, !621, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !630)
    #dbg_value(i32 4, !122, !DIExpression(), !635)
  %26 = load i32, ptr %2, align 4, !dbg !637, !tbaa !27
  %27 = zext i8 %16 to i32, !dbg !638
  %28 = shl nuw i32 %27, 24, !dbg !638
  %29 = zext i8 %14 to i32, !dbg !638
  %30 = shl nuw nsw i32 %29, 16, !dbg !638
  %31 = or disjoint i32 %28, %30, !dbg !638
  %32 = zext i8 %12 to i32, !dbg !638
  %33 = shl nuw nsw i32 %32, 8, !dbg !638
  %34 = or disjoint i32 %31, %33, !dbg !638
  %35 = zext i8 %10 to i32, !dbg !638
  %36 = or disjoint i32 %34, %35, !dbg !638
  %37 = zext i8 %25 to i32, !dbg !639
  %38 = shl nuw i32 %37, 24, !dbg !639
  %39 = zext i8 %23 to i32, !dbg !639
  %40 = shl nuw nsw i32 %39, 16, !dbg !639
  %41 = or disjoint i32 %38, %40, !dbg !639
  %42 = zext i8 %21 to i32, !dbg !639
  %43 = shl nuw nsw i32 %42, 8, !dbg !639
  %44 = or disjoint i32 %41, %43, !dbg !639
  %45 = zext i8 %19 to i32, !dbg !639
  %46 = or disjoint i32 %44, %45, !dbg !639
    #dbg_value(ptr poison, !500, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !641)
    #dbg_value(i32 poison, !500, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !641)
    #dbg_value(ptr %7, !499, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !641)
    #dbg_value(i32 %26, !499, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !641)
    #dbg_value(i32 %36, !501, !DIExpression(), !641)
    #dbg_value(i32 %46, !502, !DIExpression(), !641)
    #dbg_value(ptr %3, !503, !DIExpression(), !641)
    #dbg_value(ptr %7, !504, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !641)
    #dbg_value(i32 %26, !504, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !641)
    #dbg_value(ptr %3, !505, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !641)
    #dbg_value(i32 %26, !505, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !641)
    #dbg_value(i32 0, !506, !DIExpression(), !642)
  %47 = icmp eq i32 %26, 0, !dbg !639
  br i1 %47, label %86, label %48, !dbg !643

48:                                               ; preds = %6
  %49 = icmp eq i32 %46, 0
  br label %50, !dbg !643

50:                                               ; preds = %81, %48
  %51 = phi i32 [ 0, %48 ], [ %84, %81 ]
    #dbg_value(i32 %51, !506, !DIExpression(), !642)
    #dbg_value(i32 %51, !508, !DIExpression(), !644)
  %52 = getelementptr inbounds nuw i32, ptr %7, i32 %51, !dbg !645
    #dbg_value(i32 poison, !511, !DIExpression(), !644)
    #dbg_value(i32 %36, !512, !DIExpression(), !644)
    #dbg_value(i32 %46, !513, !DIExpression(), !644)
    #dbg_value(i32 %51, !514, !DIExpression(), !644)
    #dbg_value(i32 poison, !515, !DIExpression(), !644)
    #dbg_value(i32 %36, !516, !DIExpression(), !644)
    #dbg_value(i32 %46, !517, !DIExpression(), !644)
    #dbg_value(i32 poison, !518, !DIExpression(), !644)
    #dbg_value(i32 %46, !519, !DIExpression(), !644)
  %53 = load i32, ptr %52, align 4, !dbg !646, !tbaa !286
  br i1 %49, label %54, label %59, !dbg !647

54:                                               ; preds = %50
    #dbg_value(i32 poison, !524, !DIExpression(), !644)
    #dbg_value(i32 0, !525, !DIExpression(), !644)
    #dbg_value(i32 %36, !526, !DIExpression(), !644)
    #dbg_value(i32 %51, !527, !DIExpression(), !644)
    #dbg_value(i32 %53, !528, !DIExpression(), !644)
    #dbg_value(i32 %36, !529, !DIExpression(), !644)
    #dbg_value(i32 %46, !530, !DIExpression(), !644)
    #dbg_value(i32 %51, !531, !DIExpression(), !644)
    #dbg_value(i32 %53, !532, !DIExpression(), !644)
    #dbg_value(i32 %36, !533, !DIExpression(), !644)
    #dbg_value(i32 %46, !534, !DIExpression(), !644)
    #dbg_value(i32 %51, !535, !DIExpression(), !644)
  %55 = icmp ult i32 %51, %36, !dbg !648
  %56 = mul i32 %53, 3, !dbg !649
  %57 = select i1 %55, i32 %53, i32 %56, !dbg !649
    #dbg_value(i32 %57, !536, !DIExpression(), !644)
    #dbg_value(i32 %57, !542, !DIExpression(), !644)
    #dbg_value(i32 %36, !543, !DIExpression(), !644)
    #dbg_value(i32 %46, !544, !DIExpression(), !644)
    #dbg_value(i32 %36, !545, !DIExpression(), !644)
    #dbg_value(i32 %57, !546, !DIExpression(), !644)
    #dbg_value(i32 %36, !547, !DIExpression(), !644)
    #dbg_value(i32 %46, !548, !DIExpression(), !644)
    #dbg_value(i32 %36, !549, !DIExpression(), !644)
  %58 = icmp ult i32 %36, %57, !dbg !650
  br i1 %58, label %71, label %77, !dbg !651

59:                                               ; preds = %50
    #dbg_value(i32 %53, !511, !DIExpression(), !644)
    #dbg_value(i32 %53, !515, !DIExpression(), !644)
    #dbg_value(i32 %53, !518, !DIExpression(), !644)
  %60 = udiv i32 %53, %46, !dbg !652
    #dbg_value(i32 %60, !520, !DIExpression(), !644)
    #dbg_value(i32 %60, !521, !DIExpression(), !644)
    #dbg_value(i32 %51, !522, !DIExpression(), !644)
    #dbg_value(i32 %46, !523, !DIExpression(), !644)
  %61 = urem i32 %51, %46, !dbg !653
    #dbg_value(i32 poison, !524, !DIExpression(), !644)
    #dbg_value(i32 poison, !525, !DIExpression(), !644)
  %62 = add i32 %60, %36
  %63 = add i32 %62, %61, !dbg !654
    #dbg_value(i32 %63, !526, !DIExpression(), !644)
    #dbg_value(i32 %51, !527, !DIExpression(), !644)
    #dbg_value(i32 %53, !528, !DIExpression(), !644)
    #dbg_value(i32 %36, !529, !DIExpression(), !644)
    #dbg_value(i32 %46, !530, !DIExpression(), !644)
    #dbg_value(i32 %51, !531, !DIExpression(), !644)
    #dbg_value(i32 %53, !532, !DIExpression(), !644)
    #dbg_value(i32 %36, !533, !DIExpression(), !644)
    #dbg_value(i32 %46, !534, !DIExpression(), !644)
    #dbg_value(i32 %51, !535, !DIExpression(), !644)
  %64 = icmp ult i32 %51, %36, !dbg !648
  %65 = add i32 %53, %46, !dbg !649
  %66 = mul i32 %53, 3, !dbg !649
  %67 = select i1 %64, i32 %65, i32 %66, !dbg !649
    #dbg_value(i32 %67, !536, !DIExpression(), !644)
    #dbg_value(i32 %67, !542, !DIExpression(), !644)
    #dbg_value(i32 %36, !543, !DIExpression(), !644)
    #dbg_value(i32 %46, !544, !DIExpression(), !644)
    #dbg_value(i32 %63, !545, !DIExpression(), !644)
    #dbg_value(i32 %67, !546, !DIExpression(), !644)
    #dbg_value(i32 %36, !547, !DIExpression(), !644)
    #dbg_value(i32 %46, !548, !DIExpression(), !644)
    #dbg_value(i32 %63, !549, !DIExpression(), !644)
  %68 = icmp ult i32 %63, %67, !dbg !650
  br i1 %68, label %69, label %75, !dbg !651

69:                                               ; preds = %59
    #dbg_value(i32 %63, !551, !DIExpression(), !655)
    #dbg_value(i32 %46, !554, !DIExpression(), !655)
  %70 = udiv i32 %63, %46, !dbg !656
    #dbg_value(i32 %70, !555, !DIExpression(), !655)
  br label %71

71:                                               ; preds = %69, %54
  %72 = phi i32 [ %67, %69 ], [ %57, %54 ]
  %73 = phi i32 [ %70, %69 ], [ 0, %54 ], !dbg !657
    #dbg_value(i32 %73, !555, !DIExpression(), !655)
    #dbg_value(i32 %73, !556, !DIExpression(), !655)
  %74 = add i32 %73, %72, !dbg !658
    #dbg_value(i32 %74, !550, !DIExpression(), !644)
  br label %81, !dbg !659

75:                                               ; preds = %59
    #dbg_value(i32 %67, !557, !DIExpression(), !660)
    #dbg_value(i32 %46, !559, !DIExpression(), !660)
  %76 = urem i32 %67, %46, !dbg !661
    #dbg_value(i32 %76, !560, !DIExpression(), !660)
  br label %77

77:                                               ; preds = %75, %54
  %78 = phi i32 [ %63, %75 ], [ %36, %54 ]
  %79 = phi i32 [ %76, %75 ], [ 0, %54 ], !dbg !662
    #dbg_value(i32 %79, !560, !DIExpression(), !660)
    #dbg_value(i32 %79, !561, !DIExpression(), !660)
  %80 = add i32 %79, %78, !dbg !663
    #dbg_value(i32 %80, !550, !DIExpression(), !644)
  br label %81

81:                                               ; preds = %77, %71
  %82 = phi i32 [ %74, %71 ], [ %80, %77 ], !dbg !664
    #dbg_value(i32 %82, !550, !DIExpression(), !644)
  %83 = getelementptr inbounds nuw i32, ptr %3, i32 %51, !dbg !665
  store i32 %82, ptr %83, align 4, !dbg !666, !tbaa !286
  %84 = add nuw i32 %51, 1, !dbg !667
    #dbg_value(i32 %84, !506, !DIExpression(), !642)
  %85 = icmp eq i32 %84, %26, !dbg !639
  br i1 %85, label %86, label %50, !dbg !643, !llvm.loop !668

86:                                               ; preds = %81, %6
  ret i32 %26, !dbg !670

87:                                               ; preds = %4
  tail call void @llvm.trap(), !dbg !671
  unreachable, !dbg !673
}

; Function Attrs: nounwind uwtable
define hidden void @ink_compute_call(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readonly %2, ptr nocapture noundef writeonly %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #2 !dbg !674 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !734)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !734)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !734)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !734)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !734)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !734)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !734)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !734)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !736)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !736)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !736)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !736)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !736)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !736)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !736)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !736)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !738)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !738)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !738)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !738)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !738)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !738)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !738)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !738)
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
    #dbg_value(i32 %0, !680, !DIExpression(), !782)
    #dbg_value(ptr %1, !681, !DIExpression(), !782)
    #dbg_value(ptr %2, !682, !DIExpression(), !782)
    #dbg_value(ptr %3, !683, !DIExpression(), !782)
    #dbg_value(ptr %4, !684, !DIExpression(), !782)
  switch i32 %0, label %696 [
    i32 0, label %6
    i32 1, label %114
    i32 2, label %216
    i32 3, label %318
    i32 4, label %416
    i32 5, label %514
    i32 6, label %605
  ], !dbg !783

6:                                                ; preds = %5
  %7 = load ptr, ptr %1, align 4, !dbg !784, !tbaa !629
    #dbg_value(ptr %7, !685, !DIExpression(), !785)
    #dbg_value(ptr poison, !688, !DIExpression(), !785)
  %8 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !786
  %9 = load ptr, ptr %8, align 4, !dbg !786, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !734)
    #dbg_value(ptr %9, !115, !DIExpression(), !734)
    #dbg_value(i32 4, !116, !DIExpression(), !734)
    #dbg_value(ptr undef, !117, !DIExpression(), !734)
    #dbg_value(ptr %9, !119, !DIExpression(), !734)
    #dbg_value(i32 0, !122, !DIExpression(), !787)
  %10 = load i8, ptr %9, align 1, !dbg !788, !tbaa !131
    #dbg_value(i8 %10, !689, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !785)
    #dbg_value(i32 1, !122, !DIExpression(), !787)
  %11 = getelementptr inbounds nuw i8, ptr %9, i32 1, !dbg !788
  %12 = load i8, ptr %11, align 1, !dbg !788, !tbaa !131
    #dbg_value(i8 %12, !689, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !785)
    #dbg_value(i32 2, !122, !DIExpression(), !787)
  %13 = getelementptr inbounds nuw i8, ptr %9, i32 2, !dbg !788
  %14 = load i8, ptr %13, align 1, !dbg !788, !tbaa !131
    #dbg_value(i8 %14, !689, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !785)
    #dbg_value(i32 3, !122, !DIExpression(), !787)
  %15 = getelementptr inbounds nuw i8, ptr %9, i32 3, !dbg !788
  %16 = load i8, ptr %15, align 1, !dbg !788, !tbaa !131
    #dbg_value(i8 %16, !689, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !785)
    #dbg_value(i32 4, !122, !DIExpression(), !787)
  %17 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !789
  %18 = load ptr, ptr %17, align 4, !dbg !789, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !736)
    #dbg_value(ptr %18, !115, !DIExpression(), !736)
    #dbg_value(i32 4, !116, !DIExpression(), !736)
    #dbg_value(ptr undef, !117, !DIExpression(), !736)
    #dbg_value(ptr %18, !119, !DIExpression(), !736)
    #dbg_value(i32 0, !122, !DIExpression(), !790)
  %19 = load i8, ptr %18, align 1, !dbg !791, !tbaa !131
    #dbg_value(i8 %19, !690, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !785)
    #dbg_value(i32 1, !122, !DIExpression(), !790)
  %20 = getelementptr inbounds nuw i8, ptr %18, i32 1, !dbg !791
  %21 = load i8, ptr %20, align 1, !dbg !791, !tbaa !131
    #dbg_value(i8 %21, !690, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !785)
    #dbg_value(i32 2, !122, !DIExpression(), !790)
  %22 = getelementptr inbounds nuw i8, ptr %18, i32 2, !dbg !791
  %23 = load i8, ptr %22, align 1, !dbg !791, !tbaa !131
    #dbg_value(i8 %23, !690, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !785)
    #dbg_value(i32 3, !122, !DIExpression(), !790)
  %24 = getelementptr inbounds nuw i8, ptr %18, i32 3, !dbg !791
  %25 = load i8, ptr %24, align 1, !dbg !791, !tbaa !131
    #dbg_value(i8 %25, !690, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !785)
    #dbg_value(i32 4, !122, !DIExpression(), !790)
  %26 = load i32, ptr %2, align 4, !dbg !792, !tbaa !27
  %27 = zext i8 %16 to i32, !dbg !793
  %28 = shl nuw i32 %27, 24, !dbg !793
  %29 = zext i8 %14 to i32, !dbg !793
  %30 = shl nuw nsw i32 %29, 16, !dbg !793
  %31 = or disjoint i32 %28, %30, !dbg !793
  %32 = zext i8 %12 to i32, !dbg !793
  %33 = shl nuw nsw i32 %32, 8, !dbg !793
  %34 = or disjoint i32 %31, %33, !dbg !793
  %35 = zext i8 %10 to i32, !dbg !793
  %36 = or disjoint i32 %34, %35, !dbg !793
  %37 = zext i8 %25 to i32, !dbg !794
  %38 = shl nuw i32 %37, 24, !dbg !794
  %39 = zext i8 %23 to i32, !dbg !794
  %40 = shl nuw nsw i32 %39, 16, !dbg !794
  %41 = or disjoint i32 %38, %40, !dbg !794
  %42 = zext i8 %21 to i32, !dbg !794
  %43 = shl nuw nsw i32 %42, 8, !dbg !794
  %44 = or disjoint i32 %41, %43, !dbg !794
  %45 = zext i8 %19 to i32, !dbg !794
  %46 = or disjoint i32 %44, %45, !dbg !794
    #dbg_value(ptr poison, !174, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !797)
    #dbg_value(i32 poison, !174, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !797)
    #dbg_value(ptr %7, !173, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !797)
    #dbg_value(i32 %26, !173, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !797)
    #dbg_value(i32 %36, !175, !DIExpression(), !797)
    #dbg_value(i32 %46, !176, !DIExpression(), !797)
    #dbg_value(ptr %7, !177, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !797)
    #dbg_value(i32 %26, !177, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !797)
    #dbg_value(i32 %26, !55, !DIExpression(), !798)
    #dbg_value(i32 4, !56, !DIExpression(), !798)
  %47 = icmp ugt i32 %26, 1073741823, !dbg !794
  %48 = load i32, ptr @ink_top, align 4, !noalias !799
  %49 = icmp ugt i32 %48, -8
  %50 = select i1 %47, i1 true, i1 %49, !dbg !802
  br i1 %50, label %51, label %52, !dbg !802

51:                                               ; preds = %6
  tail call void @llvm.trap(), !dbg !803
  unreachable, !dbg !805

52:                                               ; preds = %6
  %53 = icmp eq i32 %48, 0, !dbg !806
  %54 = add nuw i32 %48, 7, !dbg !807
  %55 = select i1 %53, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %54, !dbg !808
  %56 = and i32 %55, -8, !dbg !809
    #dbg_value(i32 %56, !57, !DIExpression(), !798)
  %57 = tail call i32 @llvm.umax.i32(i32 %26, i32 1), !dbg !810
  %58 = shl nuw i32 %57, 2, !dbg !811
    #dbg_value(i32 %58, !58, !DIExpression(), !798)
  %59 = xor i32 %56, -1, !dbg !812
  %60 = icmp ugt i32 %58, %59, !dbg !813
  br i1 %60, label %61, label %62, !dbg !813

61:                                               ; preds = %52
  tail call void @llvm.trap(), !dbg !814
  unreachable, !dbg !816

62:                                               ; preds = %52
  %63 = add i32 %56, %58, !dbg !817
  store i32 %63, ptr @ink_top, align 4, !dbg !818, !tbaa !27, !noalias !799
  %64 = add i32 %63, 65535, !dbg !819
  %65 = lshr i32 %64, 16, !dbg !820
    #dbg_value(i32 %65, !59, !DIExpression(), !798)
  %66 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !821, !noalias !799
    #dbg_value(i32 %66, !60, !DIExpression(), !798)
  %67 = icmp ugt i32 %65, %66, !dbg !822
  br i1 %67, label %68, label %73, !dbg !823

68:                                               ; preds = %62
  %69 = sub nuw nsw i32 %65, %66, !dbg !824
  %70 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %69), !dbg !825, !noalias !799
  %71 = icmp eq i32 %70, -1, !dbg !826
  br i1 %71, label %72, label %73, !dbg !823

72:                                               ; preds = %68
  tail call void @llvm.trap(), !dbg !827
  unreachable, !dbg !829

73:                                               ; preds = %68, %62
  %74 = inttoptr i32 %56 to ptr, !dbg !830
    #dbg_value(ptr %74, !178, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !797)
    #dbg_value(ptr %74, !691, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !785)
    #dbg_value(i32 %26, !178, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !797)
    #dbg_value(i32 %26, !691, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !785)
    #dbg_value(i32 0, !179, !DIExpression(), !831)
  %75 = icmp eq i32 %26, 0, !dbg !832
  br i1 %75, label %701, label %76, !dbg !833

76:                                               ; preds = %73
  %77 = icmp eq i32 %46, 0
  br label %78, !dbg !833

78:                                               ; preds = %109, %76
  %79 = phi i32 [ 0, %76 ], [ %112, %109 ]
    #dbg_value(i32 %79, !179, !DIExpression(), !831)
    #dbg_value(i32 %79, !181, !DIExpression(), !834)
  %80 = getelementptr inbounds nuw i32, ptr %7, i32 %79, !dbg !835
    #dbg_value(i32 poison, !184, !DIExpression(), !834)
    #dbg_value(i32 %36, !185, !DIExpression(), !834)
    #dbg_value(i32 %46, !186, !DIExpression(), !834)
    #dbg_value(i32 %79, !187, !DIExpression(), !834)
    #dbg_value(i32 poison, !188, !DIExpression(), !834)
    #dbg_value(i32 %36, !189, !DIExpression(), !834)
    #dbg_value(i32 %46, !190, !DIExpression(), !834)
    #dbg_value(i32 poison, !191, !DIExpression(), !834)
    #dbg_value(i32 %46, !192, !DIExpression(), !834)
  %81 = load i32, ptr %80, align 4, !dbg !836, !tbaa !286, !noalias !799
  br i1 %77, label %82, label %87, !dbg !837

82:                                               ; preds = %78
    #dbg_value(i32 poison, !197, !DIExpression(), !834)
    #dbg_value(i32 0, !198, !DIExpression(), !834)
    #dbg_value(i32 %36, !199, !DIExpression(), !834)
    #dbg_value(i32 %79, !200, !DIExpression(), !834)
    #dbg_value(i32 %81, !201, !DIExpression(), !834)
    #dbg_value(i32 %36, !202, !DIExpression(), !834)
    #dbg_value(i32 %46, !203, !DIExpression(), !834)
    #dbg_value(i32 %79, !204, !DIExpression(), !834)
    #dbg_value(i32 %81, !205, !DIExpression(), !834)
    #dbg_value(i32 %36, !206, !DIExpression(), !834)
    #dbg_value(i32 %46, !207, !DIExpression(), !834)
    #dbg_value(i32 %79, !208, !DIExpression(), !834)
  %83 = icmp ult i32 %79, %36, !dbg !838
  %84 = mul i32 %81, 3, !dbg !839
  %85 = select i1 %83, i32 %81, i32 %84, !dbg !839
    #dbg_value(i32 %85, !209, !DIExpression(), !834)
    #dbg_value(i32 %85, !215, !DIExpression(), !834)
    #dbg_value(i32 %36, !216, !DIExpression(), !834)
    #dbg_value(i32 %46, !217, !DIExpression(), !834)
    #dbg_value(i32 %36, !218, !DIExpression(), !834)
    #dbg_value(i32 %85, !219, !DIExpression(), !834)
    #dbg_value(i32 %36, !220, !DIExpression(), !834)
    #dbg_value(i32 %46, !221, !DIExpression(), !834)
    #dbg_value(i32 %36, !222, !DIExpression(), !834)
  %86 = icmp ult i32 %36, %85, !dbg !840
  br i1 %86, label %99, label %105, !dbg !841

87:                                               ; preds = %78
    #dbg_value(i32 %81, !184, !DIExpression(), !834)
    #dbg_value(i32 %81, !188, !DIExpression(), !834)
    #dbg_value(i32 %81, !191, !DIExpression(), !834)
  %88 = udiv i32 %81, %46, !dbg !842
    #dbg_value(i32 %88, !193, !DIExpression(), !834)
    #dbg_value(i32 %88, !194, !DIExpression(), !834)
    #dbg_value(i32 %79, !195, !DIExpression(), !834)
    #dbg_value(i32 %46, !196, !DIExpression(), !834)
  %89 = urem i32 %79, %46, !dbg !843
    #dbg_value(i32 poison, !197, !DIExpression(), !834)
    #dbg_value(i32 poison, !198, !DIExpression(), !834)
  %90 = add i32 %88, %36
  %91 = add i32 %90, %89, !dbg !844
    #dbg_value(i32 %91, !199, !DIExpression(), !834)
    #dbg_value(i32 %79, !200, !DIExpression(), !834)
    #dbg_value(i32 %81, !201, !DIExpression(), !834)
    #dbg_value(i32 %36, !202, !DIExpression(), !834)
    #dbg_value(i32 %46, !203, !DIExpression(), !834)
    #dbg_value(i32 %79, !204, !DIExpression(), !834)
    #dbg_value(i32 %81, !205, !DIExpression(), !834)
    #dbg_value(i32 %36, !206, !DIExpression(), !834)
    #dbg_value(i32 %46, !207, !DIExpression(), !834)
    #dbg_value(i32 %79, !208, !DIExpression(), !834)
  %92 = icmp ult i32 %79, %36, !dbg !838
  %93 = add i32 %81, %46, !dbg !839
  %94 = mul i32 %81, 3, !dbg !839
  %95 = select i1 %92, i32 %93, i32 %94, !dbg !839
    #dbg_value(i32 %95, !209, !DIExpression(), !834)
    #dbg_value(i32 %95, !215, !DIExpression(), !834)
    #dbg_value(i32 %36, !216, !DIExpression(), !834)
    #dbg_value(i32 %46, !217, !DIExpression(), !834)
    #dbg_value(i32 %91, !218, !DIExpression(), !834)
    #dbg_value(i32 %95, !219, !DIExpression(), !834)
    #dbg_value(i32 %36, !220, !DIExpression(), !834)
    #dbg_value(i32 %46, !221, !DIExpression(), !834)
    #dbg_value(i32 %91, !222, !DIExpression(), !834)
  %96 = icmp ult i32 %91, %95, !dbg !840
  br i1 %96, label %97, label %103, !dbg !841

97:                                               ; preds = %87
    #dbg_value(i32 %91, !224, !DIExpression(), !845)
    #dbg_value(i32 %46, !227, !DIExpression(), !845)
  %98 = udiv i32 %91, %46, !dbg !846
    #dbg_value(i32 %98, !228, !DIExpression(), !845)
  br label %99

99:                                               ; preds = %97, %82
  %100 = phi i32 [ %95, %97 ], [ %85, %82 ]
  %101 = phi i32 [ %98, %97 ], [ 0, %82 ], !dbg !847
    #dbg_value(i32 %101, !228, !DIExpression(), !845)
    #dbg_value(i32 %101, !229, !DIExpression(), !845)
  %102 = add i32 %101, %100, !dbg !848
    #dbg_value(i32 %102, !223, !DIExpression(), !834)
  br label %109, !dbg !849

103:                                              ; preds = %87
    #dbg_value(i32 %95, !230, !DIExpression(), !850)
    #dbg_value(i32 %46, !232, !DIExpression(), !850)
  %104 = urem i32 %95, %46, !dbg !851
    #dbg_value(i32 %104, !233, !DIExpression(), !850)
  br label %105

105:                                              ; preds = %103, %82
  %106 = phi i32 [ %91, %103 ], [ %36, %82 ]
  %107 = phi i32 [ %104, %103 ], [ 0, %82 ], !dbg !852
    #dbg_value(i32 %107, !233, !DIExpression(), !850)
    #dbg_value(i32 %107, !234, !DIExpression(), !850)
  %108 = add i32 %107, %106, !dbg !853
    #dbg_value(i32 %108, !223, !DIExpression(), !834)
  br label %109

109:                                              ; preds = %105, %99
  %110 = phi i32 [ %102, %99 ], [ %108, %105 ], !dbg !854
    #dbg_value(i32 %110, !223, !DIExpression(), !834)
  %111 = getelementptr inbounds nuw i32, ptr %74, i32 %79, !dbg !855
  store i32 %110, ptr %111, align 4, !dbg !856, !tbaa !286, !noalias !799
  %112 = add nuw i32 %79, 1, !dbg !857
    #dbg_value(i32 %112, !179, !DIExpression(), !831)
  %113 = icmp eq i32 %112, %26, !dbg !832
  br i1 %113, label %701, label %78, !dbg !833, !llvm.loop !858

114:                                              ; preds = %5
    #dbg_value(ptr undef, !110, !DIExpression(), !738)
    #dbg_value(ptr poison, !115, !DIExpression(), !738)
    #dbg_value(i32 4, !116, !DIExpression(), !738)
    #dbg_value(ptr undef, !117, !DIExpression(), !738)
    #dbg_value(ptr poison, !119, !DIExpression(), !738)
    #dbg_value(i8 poison, !692, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !860)
    #dbg_value(i8 poison, !692, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !860)
    #dbg_value(i8 poison, !692, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !860)
    #dbg_value(i8 poison, !692, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !860)
    #dbg_value(i32 4, !122, !DIExpression(), !861)
    #dbg_value(ptr undef, !110, !DIExpression(), !740)
    #dbg_value(ptr poison, !115, !DIExpression(), !740)
    #dbg_value(i32 4, !116, !DIExpression(), !740)
    #dbg_value(ptr undef, !117, !DIExpression(), !740)
    #dbg_value(ptr poison, !119, !DIExpression(), !740)
    #dbg_value(i8 poison, !694, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !860)
    #dbg_value(i8 poison, !694, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !860)
    #dbg_value(i8 poison, !694, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !860)
    #dbg_value(i8 poison, !694, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !860)
    #dbg_value(i32 4, !122, !DIExpression(), !862)
  %115 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !863
  %116 = load ptr, ptr %115, align 4, !dbg !863, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !742)
    #dbg_value(ptr %116, !115, !DIExpression(), !742)
    #dbg_value(i32 4, !116, !DIExpression(), !742)
    #dbg_value(ptr undef, !117, !DIExpression(), !742)
    #dbg_value(ptr %116, !119, !DIExpression(), !742)
    #dbg_value(i32 0, !122, !DIExpression(), !864)
  %117 = load i8, ptr %116, align 1, !dbg !865, !tbaa !131
    #dbg_value(i8 %117, !695, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !860)
    #dbg_value(i32 1, !122, !DIExpression(), !864)
  %118 = getelementptr inbounds nuw i8, ptr %116, i32 1, !dbg !865
  %119 = load i8, ptr %118, align 1, !dbg !865, !tbaa !131
    #dbg_value(i8 %119, !695, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !860)
    #dbg_value(i32 2, !122, !DIExpression(), !864)
  %120 = getelementptr inbounds nuw i8, ptr %116, i32 2, !dbg !865
  %121 = load i8, ptr %120, align 1, !dbg !865, !tbaa !131
    #dbg_value(i8 %121, !695, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !860)
    #dbg_value(i32 3, !122, !DIExpression(), !864)
  %122 = getelementptr inbounds nuw i8, ptr %116, i32 3, !dbg !865
  %123 = load i8, ptr %122, align 1, !dbg !865, !tbaa !131
    #dbg_value(i8 %123, !695, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !860)
    #dbg_value(i32 4, !122, !DIExpression(), !864)
  %124 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !866
  %125 = load ptr, ptr %124, align 4, !dbg !866, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !744)
    #dbg_value(ptr %125, !115, !DIExpression(), !744)
    #dbg_value(i32 4, !116, !DIExpression(), !744)
    #dbg_value(ptr undef, !117, !DIExpression(), !744)
    #dbg_value(ptr %125, !119, !DIExpression(), !744)
    #dbg_value(i32 0, !122, !DIExpression(), !867)
  %126 = load i8, ptr %125, align 1, !dbg !868, !tbaa !131
    #dbg_value(i8 %126, !696, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !860)
    #dbg_value(i32 1, !122, !DIExpression(), !867)
  %127 = getelementptr inbounds nuw i8, ptr %125, i32 1, !dbg !868
  %128 = load i8, ptr %127, align 1, !dbg !868, !tbaa !131
    #dbg_value(i8 %128, !696, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !860)
    #dbg_value(i32 2, !122, !DIExpression(), !867)
  %129 = getelementptr inbounds nuw i8, ptr %125, i32 2, !dbg !868
  %130 = load i8, ptr %129, align 1, !dbg !868, !tbaa !131
    #dbg_value(i8 %130, !696, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !860)
    #dbg_value(i32 3, !122, !DIExpression(), !867)
  %131 = getelementptr inbounds nuw i8, ptr %125, i32 3, !dbg !868
  %132 = load i8, ptr %131, align 1, !dbg !868, !tbaa !131
    #dbg_value(i8 %132, !696, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !860)
    #dbg_value(i32 4, !122, !DIExpression(), !867)
  %133 = zext i8 %123 to i32, !dbg !869
  %134 = shl nuw i32 %133, 24, !dbg !869
  %135 = zext i8 %121 to i32, !dbg !869
  %136 = shl nuw nsw i32 %135, 16, !dbg !869
  %137 = or disjoint i32 %134, %136, !dbg !869
  %138 = zext i8 %119 to i32, !dbg !869
  %139 = shl nuw nsw i32 %138, 8, !dbg !869
  %140 = or disjoint i32 %137, %139, !dbg !869
  %141 = zext i8 %117 to i32, !dbg !869
  %142 = or disjoint i32 %140, %141, !dbg !869
  %143 = zext i8 %132 to i32, !dbg !870
  %144 = shl nuw i32 %143, 24, !dbg !870
  %145 = zext i8 %130 to i32, !dbg !870
  %146 = shl nuw nsw i32 %145, 16, !dbg !870
  %147 = or disjoint i32 %144, %146, !dbg !870
  %148 = zext i8 %128 to i32, !dbg !870
  %149 = shl nuw nsw i32 %148, 8, !dbg !870
  %150 = or disjoint i32 %147, %149, !dbg !870
  %151 = zext i8 %126 to i32, !dbg !870
  %152 = or disjoint i32 %150, %151, !dbg !870
    #dbg_value(i32 poison, !323, !DIExpression(), !872)
    #dbg_value(i32 poison, !324, !DIExpression(), !872)
    #dbg_value(i32 %142, !325, !DIExpression(), !872)
    #dbg_value(i32 %152, !326, !DIExpression(), !872)
    #dbg_value(i32 poison, !327, !DIExpression(), !872)
    #dbg_value(i32 poison, !328, !DIExpression(), !872)
    #dbg_value(i32 %142, !329, !DIExpression(), !872)
    #dbg_value(i32 %152, !330, !DIExpression(), !872)
    #dbg_value(i32 poison, !331, !DIExpression(), !872)
    #dbg_value(i32 %152, !332, !DIExpression(), !872)
  %153 = icmp eq i32 %152, 0, !dbg !870
  br i1 %153, label %195, label %154, !dbg !870

154:                                              ; preds = %114
  %155 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !873
  %156 = load ptr, ptr %155, align 4, !dbg !873, !tbaa !629
    #dbg_value(ptr %156, !115, !DIExpression(), !740)
    #dbg_value(ptr %156, !119, !DIExpression(), !740)
  %157 = getelementptr inbounds nuw i8, ptr %156, i32 3, !dbg !874
  %158 = load i8, ptr %157, align 1, !dbg !874, !tbaa !131
    #dbg_value(i8 %158, !694, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !860)
  %159 = getelementptr inbounds nuw i8, ptr %156, i32 2, !dbg !874
  %160 = load i8, ptr %159, align 1, !dbg !874, !tbaa !131
    #dbg_value(i8 %160, !694, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !860)
  %161 = getelementptr inbounds nuw i8, ptr %156, i32 1, !dbg !874
  %162 = load i8, ptr %161, align 1, !dbg !874, !tbaa !131
    #dbg_value(i8 %162, !694, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !860)
  %163 = load i8, ptr %156, align 1, !dbg !874, !tbaa !131
    #dbg_value(i8 %163, !694, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !860)
  %164 = load ptr, ptr %1, align 4, !dbg !875, !tbaa !629
    #dbg_value(ptr %164, !115, !DIExpression(), !738)
    #dbg_value(ptr %164, !119, !DIExpression(), !738)
  %165 = getelementptr inbounds nuw i8, ptr %164, i32 3, !dbg !876
  %166 = load i8, ptr %165, align 1, !dbg !876, !tbaa !131
    #dbg_value(i8 %166, !692, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !860)
  %167 = getelementptr inbounds nuw i8, ptr %164, i32 2, !dbg !876
  %168 = load i8, ptr %167, align 1, !dbg !876, !tbaa !131
    #dbg_value(i8 %168, !692, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !860)
  %169 = getelementptr inbounds nuw i8, ptr %164, i32 1, !dbg !876
  %170 = load i8, ptr %169, align 1, !dbg !876, !tbaa !131
    #dbg_value(i8 %170, !692, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !860)
  %171 = load i8, ptr %164, align 1, !dbg !876, !tbaa !131
    #dbg_value(i8 %171, !692, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !860)
  %172 = zext i8 %158 to i32, !dbg !877
  %173 = shl nuw i32 %172, 24, !dbg !877
  %174 = zext i8 %160 to i32, !dbg !877
  %175 = shl nuw nsw i32 %174, 16, !dbg !877
  %176 = or disjoint i32 %173, %175, !dbg !877
  %177 = zext i8 %162 to i32, !dbg !877
  %178 = shl nuw nsw i32 %177, 8, !dbg !877
  %179 = or disjoint i32 %176, %178, !dbg !877
  %180 = zext i8 %163 to i32, !dbg !877
  %181 = or disjoint i32 %179, %180, !dbg !877
    #dbg_value(i32 %181, !324, !DIExpression(), !872)
    #dbg_value(i32 %181, !328, !DIExpression(), !872)
    #dbg_value(i32 %181, !331, !DIExpression(), !872)
  %182 = zext i8 %166 to i32, !dbg !878
  %183 = shl nuw i32 %182, 24, !dbg !878
  %184 = zext i8 %168 to i32, !dbg !878
  %185 = shl nuw nsw i32 %184, 16, !dbg !878
  %186 = or disjoint i32 %183, %185, !dbg !878
  %187 = zext i8 %170 to i32, !dbg !878
  %188 = shl nuw nsw i32 %187, 8, !dbg !878
  %189 = or disjoint i32 %186, %188, !dbg !878
  %190 = zext i8 %171 to i32, !dbg !878
  %191 = or disjoint i32 %189, %190, !dbg !878
    #dbg_value(i32 %191, !323, !DIExpression(), !872)
    #dbg_value(i32 %191, !327, !DIExpression(), !872)
  %192 = udiv i32 %181, %152, !dbg !878
    #dbg_value(i32 %192, !333, !DIExpression(), !872)
    #dbg_value(i32 %192, !334, !DIExpression(), !872)
    #dbg_value(i32 %191, !335, !DIExpression(), !872)
    #dbg_value(i32 %152, !336, !DIExpression(), !872)
  %193 = urem i32 %191, %152, !dbg !879
    #dbg_value(i32 %193, !337, !DIExpression(), !872)
  %194 = add i32 %193, %192
  br label %195

195:                                              ; preds = %114, %154
  %196 = phi i32 [ %194, %154 ], [ 0, %114 ], !dbg !880
    #dbg_value(i32 poison, !337, !DIExpression(), !872)
    #dbg_value(i32 %196, !338, !DIExpression(), !872)
  %197 = add i32 %196, %142, !dbg !881
    #dbg_value(i32 %197, !697, !DIExpression(), !860)
    #dbg_value(i32 1, !55, !DIExpression(), !882)
    #dbg_value(i32 4, !56, !DIExpression(), !882)
  %198 = load i32, ptr @ink_top, align 4
  %199 = icmp ugt i32 %198, -8
  br i1 %199, label %200, label %201, !dbg !884

200:                                              ; preds = %195
  tail call void @llvm.trap(), !dbg !885
  unreachable, !dbg !887

201:                                              ; preds = %195
  %202 = icmp eq i32 %198, 0, !dbg !888
  %203 = add nuw i32 %198, 7, !dbg !889
  %204 = select i1 %202, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %203, !dbg !890
  %205 = and i32 %204, -8, !dbg !891
    #dbg_value(i32 %205, !57, !DIExpression(), !882)
    #dbg_value(i32 4, !58, !DIExpression(), !882)
  %206 = or disjoint i32 %205, 4, !dbg !892
  store i32 %206, ptr @ink_top, align 4, !dbg !893, !tbaa !27
  %207 = add i32 %205, 65539, !dbg !894
  %208 = lshr i32 %207, 16, !dbg !895
    #dbg_value(i32 %208, !59, !DIExpression(), !882)
  %209 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !896
    #dbg_value(i32 %209, !60, !DIExpression(), !882)
  %210 = icmp ugt i32 %208, %209, !dbg !897
  br i1 %210, label %211, label %697, !dbg !898

211:                                              ; preds = %201
  %212 = sub nuw nsw i32 %208, %209, !dbg !899
  %213 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %212), !dbg !900
  %214 = icmp eq i32 %213, -1, !dbg !901
  br i1 %214, label %215, label %697, !dbg !898

215:                                              ; preds = %211
  tail call void @llvm.trap(), !dbg !902
  unreachable, !dbg !904

216:                                              ; preds = %5
    #dbg_value(ptr undef, !110, !DIExpression(), !746)
    #dbg_value(ptr poison, !115, !DIExpression(), !746)
    #dbg_value(i32 4, !116, !DIExpression(), !746)
    #dbg_value(ptr undef, !117, !DIExpression(), !746)
    #dbg_value(ptr poison, !119, !DIExpression(), !746)
    #dbg_value(i8 poison, !699, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !905)
    #dbg_value(i8 poison, !699, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !905)
    #dbg_value(i8 poison, !699, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !905)
    #dbg_value(i8 poison, !699, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !905)
    #dbg_value(i32 4, !122, !DIExpression(), !906)
    #dbg_value(ptr undef, !110, !DIExpression(), !748)
    #dbg_value(ptr poison, !115, !DIExpression(), !748)
    #dbg_value(i32 4, !116, !DIExpression(), !748)
    #dbg_value(ptr undef, !117, !DIExpression(), !748)
    #dbg_value(ptr poison, !119, !DIExpression(), !748)
    #dbg_value(i8 poison, !701, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !905)
    #dbg_value(i8 poison, !701, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !905)
    #dbg_value(i8 poison, !701, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !905)
    #dbg_value(i8 poison, !701, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !905)
    #dbg_value(i32 4, !122, !DIExpression(), !907)
  %217 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !908
  %218 = load ptr, ptr %217, align 4, !dbg !908, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !750)
    #dbg_value(ptr %218, !115, !DIExpression(), !750)
    #dbg_value(i32 4, !116, !DIExpression(), !750)
    #dbg_value(ptr undef, !117, !DIExpression(), !750)
    #dbg_value(ptr %218, !119, !DIExpression(), !750)
    #dbg_value(i32 0, !122, !DIExpression(), !909)
  %219 = load i8, ptr %218, align 1, !dbg !910, !tbaa !131
    #dbg_value(i8 %219, !702, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !905)
    #dbg_value(i32 1, !122, !DIExpression(), !909)
  %220 = getelementptr inbounds nuw i8, ptr %218, i32 1, !dbg !910
  %221 = load i8, ptr %220, align 1, !dbg !910, !tbaa !131
    #dbg_value(i8 %221, !702, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !905)
    #dbg_value(i32 2, !122, !DIExpression(), !909)
  %222 = getelementptr inbounds nuw i8, ptr %218, i32 2, !dbg !910
  %223 = load i8, ptr %222, align 1, !dbg !910, !tbaa !131
    #dbg_value(i8 %223, !702, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !905)
    #dbg_value(i32 3, !122, !DIExpression(), !909)
  %224 = getelementptr inbounds nuw i8, ptr %218, i32 3, !dbg !910
  %225 = load i8, ptr %224, align 1, !dbg !910, !tbaa !131
    #dbg_value(i8 %225, !702, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !905)
    #dbg_value(i32 4, !122, !DIExpression(), !909)
  %226 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !911
  %227 = load ptr, ptr %226, align 4, !dbg !911, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !752)
    #dbg_value(ptr %227, !115, !DIExpression(), !752)
    #dbg_value(i32 4, !116, !DIExpression(), !752)
    #dbg_value(ptr undef, !117, !DIExpression(), !752)
    #dbg_value(ptr %227, !119, !DIExpression(), !752)
    #dbg_value(i32 0, !122, !DIExpression(), !912)
  %228 = load i8, ptr %227, align 1, !dbg !913, !tbaa !131
    #dbg_value(i8 %228, !703, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !905)
    #dbg_value(i32 1, !122, !DIExpression(), !912)
  %229 = getelementptr inbounds nuw i8, ptr %227, i32 1, !dbg !913
  %230 = load i8, ptr %229, align 1, !dbg !913, !tbaa !131
    #dbg_value(i8 %230, !703, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !905)
    #dbg_value(i32 2, !122, !DIExpression(), !912)
  %231 = getelementptr inbounds nuw i8, ptr %227, i32 2, !dbg !913
  %232 = load i8, ptr %231, align 1, !dbg !913, !tbaa !131
    #dbg_value(i8 %232, !703, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !905)
    #dbg_value(i32 3, !122, !DIExpression(), !912)
  %233 = getelementptr inbounds nuw i8, ptr %227, i32 3, !dbg !913
  %234 = load i8, ptr %233, align 1, !dbg !913, !tbaa !131
    #dbg_value(i8 %234, !703, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !905)
    #dbg_value(i32 4, !122, !DIExpression(), !912)
  %235 = zext i8 %225 to i32, !dbg !914
  %236 = shl nuw i32 %235, 24, !dbg !914
  %237 = zext i8 %223 to i32, !dbg !914
  %238 = shl nuw nsw i32 %237, 16, !dbg !914
  %239 = or disjoint i32 %236, %238, !dbg !914
  %240 = zext i8 %221 to i32, !dbg !914
  %241 = shl nuw nsw i32 %240, 8, !dbg !914
  %242 = or disjoint i32 %239, %241, !dbg !914
  %243 = zext i8 %219 to i32, !dbg !914
  %244 = or disjoint i32 %242, %243, !dbg !914
  %245 = zext i8 %234 to i32, !dbg !915
  %246 = shl nuw i32 %245, 24, !dbg !915
  %247 = zext i8 %232 to i32, !dbg !915
  %248 = shl nuw nsw i32 %247, 16, !dbg !915
  %249 = or disjoint i32 %246, %248, !dbg !915
  %250 = zext i8 %230 to i32, !dbg !915
  %251 = shl nuw nsw i32 %250, 8, !dbg !915
  %252 = or disjoint i32 %249, %251, !dbg !915
  %253 = zext i8 %228 to i32, !dbg !915
  %254 = or disjoint i32 %252, %253, !dbg !915
    #dbg_value(i32 poison, !352, !DIExpression(), !917)
    #dbg_value(i32 poison, !353, !DIExpression(), !917)
    #dbg_value(i32 %244, !354, !DIExpression(), !917)
    #dbg_value(i32 %254, !355, !DIExpression(), !917)
    #dbg_value(i32 poison, !356, !DIExpression(), !917)
    #dbg_value(i32 %254, !357, !DIExpression(), !917)
  %255 = icmp eq i32 %254, 0, !dbg !915
  br i1 %255, label %297, label %256, !dbg !915

256:                                              ; preds = %216
  %257 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !918
  %258 = load ptr, ptr %257, align 4, !dbg !918, !tbaa !629
    #dbg_value(ptr %258, !115, !DIExpression(), !748)
    #dbg_value(ptr %258, !119, !DIExpression(), !748)
  %259 = getelementptr inbounds nuw i8, ptr %258, i32 3, !dbg !919
  %260 = load i8, ptr %259, align 1, !dbg !919, !tbaa !131
    #dbg_value(i8 %260, !701, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !905)
  %261 = getelementptr inbounds nuw i8, ptr %258, i32 2, !dbg !919
  %262 = load i8, ptr %261, align 1, !dbg !919, !tbaa !131
    #dbg_value(i8 %262, !701, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !905)
  %263 = getelementptr inbounds nuw i8, ptr %258, i32 1, !dbg !919
  %264 = load i8, ptr %263, align 1, !dbg !919, !tbaa !131
    #dbg_value(i8 %264, !701, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !905)
  %265 = load i8, ptr %258, align 1, !dbg !919, !tbaa !131
    #dbg_value(i8 %265, !701, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !905)
  %266 = load ptr, ptr %1, align 4, !dbg !920, !tbaa !629
    #dbg_value(ptr %266, !115, !DIExpression(), !746)
    #dbg_value(ptr %266, !119, !DIExpression(), !746)
  %267 = getelementptr inbounds nuw i8, ptr %266, i32 3, !dbg !921
  %268 = load i8, ptr %267, align 1, !dbg !921, !tbaa !131
    #dbg_value(i8 %268, !699, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !905)
  %269 = getelementptr inbounds nuw i8, ptr %266, i32 2, !dbg !921
  %270 = load i8, ptr %269, align 1, !dbg !921, !tbaa !131
    #dbg_value(i8 %270, !699, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !905)
  %271 = getelementptr inbounds nuw i8, ptr %266, i32 1, !dbg !921
  %272 = load i8, ptr %271, align 1, !dbg !921, !tbaa !131
    #dbg_value(i8 %272, !699, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !905)
  %273 = load i8, ptr %266, align 1, !dbg !921, !tbaa !131
    #dbg_value(i8 %273, !699, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !905)
  %274 = zext i8 %260 to i32, !dbg !922
  %275 = shl nuw i32 %274, 24, !dbg !922
  %276 = zext i8 %262 to i32, !dbg !922
  %277 = shl nuw nsw i32 %276, 16, !dbg !922
  %278 = or disjoint i32 %275, %277, !dbg !922
  %279 = zext i8 %264 to i32, !dbg !922
  %280 = shl nuw nsw i32 %279, 8, !dbg !922
  %281 = or disjoint i32 %278, %280, !dbg !922
  %282 = zext i8 %265 to i32, !dbg !922
  %283 = or disjoint i32 %281, %282, !dbg !922
    #dbg_value(i32 %283, !353, !DIExpression(), !917)
    #dbg_value(i32 %283, !356, !DIExpression(), !917)
  %284 = zext i8 %268 to i32, !dbg !923
  %285 = shl nuw i32 %284, 24, !dbg !923
  %286 = zext i8 %270 to i32, !dbg !923
  %287 = shl nuw nsw i32 %286, 16, !dbg !923
  %288 = or disjoint i32 %285, %287, !dbg !923
  %289 = zext i8 %272 to i32, !dbg !923
  %290 = shl nuw nsw i32 %289, 8, !dbg !923
  %291 = or disjoint i32 %288, %290, !dbg !923
  %292 = zext i8 %273 to i32, !dbg !923
  %293 = or disjoint i32 %291, %292, !dbg !923
    #dbg_value(i32 %293, !352, !DIExpression(), !917)
  %294 = udiv i32 %283, %254, !dbg !923
    #dbg_value(i32 %294, !358, !DIExpression(), !917)
    #dbg_value(i32 %294, !359, !DIExpression(), !917)
    #dbg_value(i32 %293, !360, !DIExpression(), !917)
    #dbg_value(i32 %254, !361, !DIExpression(), !917)
  %295 = urem i32 %293, %254, !dbg !924
    #dbg_value(i32 %295, !362, !DIExpression(), !917)
  %296 = add i32 %295, %294
  br label %297

297:                                              ; preds = %216, %256
  %298 = phi i32 [ %296, %256 ], [ 0, %216 ], !dbg !925
    #dbg_value(i32 poison, !362, !DIExpression(), !917)
    #dbg_value(i32 %298, !363, !DIExpression(), !917)
  %299 = add i32 %298, %244, !dbg !926
    #dbg_value(i32 %299, !704, !DIExpression(), !905)
    #dbg_value(i32 1, !55, !DIExpression(), !927)
    #dbg_value(i32 4, !56, !DIExpression(), !927)
  %300 = load i32, ptr @ink_top, align 4
  %301 = icmp ugt i32 %300, -8
  br i1 %301, label %302, label %303, !dbg !929

302:                                              ; preds = %297
  tail call void @llvm.trap(), !dbg !930
  unreachable, !dbg !932

303:                                              ; preds = %297
  %304 = icmp eq i32 %300, 0, !dbg !933
  %305 = add nuw i32 %300, 7, !dbg !934
  %306 = select i1 %304, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %305, !dbg !935
  %307 = and i32 %306, -8, !dbg !936
    #dbg_value(i32 %307, !57, !DIExpression(), !927)
    #dbg_value(i32 4, !58, !DIExpression(), !927)
  %308 = or disjoint i32 %307, 4, !dbg !937
  store i32 %308, ptr @ink_top, align 4, !dbg !938, !tbaa !27
  %309 = add i32 %307, 65539, !dbg !939
  %310 = lshr i32 %309, 16, !dbg !940
    #dbg_value(i32 %310, !59, !DIExpression(), !927)
  %311 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !941
    #dbg_value(i32 %311, !60, !DIExpression(), !927)
  %312 = icmp ugt i32 %310, %311, !dbg !942
  br i1 %312, label %313, label %697, !dbg !943

313:                                              ; preds = %303
  %314 = sub nuw nsw i32 %310, %311, !dbg !944
  %315 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %314), !dbg !945
  %316 = icmp eq i32 %315, -1, !dbg !946
  br i1 %316, label %317, label %697, !dbg !943

317:                                              ; preds = %313
  tail call void @llvm.trap(), !dbg !947
  unreachable, !dbg !949

318:                                              ; preds = %5
  %319 = load ptr, ptr %1, align 4, !dbg !950, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !754)
    #dbg_value(ptr %319, !115, !DIExpression(), !754)
    #dbg_value(i32 4, !116, !DIExpression(), !754)
    #dbg_value(ptr undef, !117, !DIExpression(), !754)
    #dbg_value(ptr %319, !119, !DIExpression(), !754)
    #dbg_value(i32 0, !122, !DIExpression(), !951)
  %320 = load i8, ptr %319, align 1, !dbg !952, !tbaa !131
    #dbg_value(i8 %320, !706, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !953)
    #dbg_value(i32 1, !122, !DIExpression(), !951)
  %321 = getelementptr inbounds nuw i8, ptr %319, i32 1, !dbg !952
  %322 = load i8, ptr %321, align 1, !dbg !952, !tbaa !131
    #dbg_value(i8 %322, !706, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !953)
    #dbg_value(i32 2, !122, !DIExpression(), !951)
  %323 = getelementptr inbounds nuw i8, ptr %319, i32 2, !dbg !952
  %324 = load i8, ptr %323, align 1, !dbg !952, !tbaa !131
    #dbg_value(i8 %324, !706, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !953)
    #dbg_value(i32 3, !122, !DIExpression(), !951)
  %325 = getelementptr inbounds nuw i8, ptr %319, i32 3, !dbg !952
  %326 = load i8, ptr %325, align 1, !dbg !952, !tbaa !131
    #dbg_value(i8 %326, !706, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !953)
    #dbg_value(i32 4, !122, !DIExpression(), !951)
  %327 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !954
  %328 = load ptr, ptr %327, align 4, !dbg !954, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !756)
    #dbg_value(ptr %328, !115, !DIExpression(), !756)
    #dbg_value(i32 4, !116, !DIExpression(), !756)
    #dbg_value(ptr undef, !117, !DIExpression(), !756)
    #dbg_value(ptr %328, !119, !DIExpression(), !756)
    #dbg_value(i32 0, !122, !DIExpression(), !955)
  %329 = load i8, ptr %328, align 1, !dbg !956, !tbaa !131
    #dbg_value(i8 %329, !708, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !953)
    #dbg_value(i32 1, !122, !DIExpression(), !955)
  %330 = getelementptr inbounds nuw i8, ptr %328, i32 1, !dbg !956
  %331 = load i8, ptr %330, align 1, !dbg !956, !tbaa !131
    #dbg_value(i8 %331, !708, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !953)
    #dbg_value(i32 2, !122, !DIExpression(), !955)
  %332 = getelementptr inbounds nuw i8, ptr %328, i32 2, !dbg !956
  %333 = load i8, ptr %332, align 1, !dbg !956, !tbaa !131
    #dbg_value(i8 %333, !708, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !953)
    #dbg_value(i32 3, !122, !DIExpression(), !955)
  %334 = getelementptr inbounds nuw i8, ptr %328, i32 3, !dbg !956
  %335 = load i8, ptr %334, align 1, !dbg !956, !tbaa !131
    #dbg_value(i8 %335, !708, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !953)
    #dbg_value(i32 4, !122, !DIExpression(), !955)
  %336 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !957
  %337 = load ptr, ptr %336, align 4, !dbg !957, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !758)
    #dbg_value(ptr %337, !115, !DIExpression(), !758)
    #dbg_value(i32 4, !116, !DIExpression(), !758)
    #dbg_value(ptr undef, !117, !DIExpression(), !758)
    #dbg_value(ptr %337, !119, !DIExpression(), !758)
    #dbg_value(i32 0, !122, !DIExpression(), !958)
  %338 = load i8, ptr %337, align 1, !dbg !959, !tbaa !131
    #dbg_value(i8 %338, !709, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !953)
    #dbg_value(i32 1, !122, !DIExpression(), !958)
  %339 = getelementptr inbounds nuw i8, ptr %337, i32 1, !dbg !959
  %340 = load i8, ptr %339, align 1, !dbg !959, !tbaa !131
    #dbg_value(i8 %340, !709, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !953)
    #dbg_value(i32 2, !122, !DIExpression(), !958)
  %341 = getelementptr inbounds nuw i8, ptr %337, i32 2, !dbg !959
  %342 = load i8, ptr %341, align 1, !dbg !959, !tbaa !131
    #dbg_value(i8 %342, !709, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !953)
    #dbg_value(i32 3, !122, !DIExpression(), !958)
  %343 = getelementptr inbounds nuw i8, ptr %337, i32 3, !dbg !959
  %344 = load i8, ptr %343, align 1, !dbg !959, !tbaa !131
    #dbg_value(i8 %344, !709, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !953)
    #dbg_value(i32 4, !122, !DIExpression(), !958)
  %345 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !960
  %346 = load ptr, ptr %345, align 4, !dbg !960, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !760)
    #dbg_value(ptr %346, !115, !DIExpression(), !760)
    #dbg_value(i32 4, !116, !DIExpression(), !760)
    #dbg_value(ptr undef, !117, !DIExpression(), !760)
    #dbg_value(ptr %346, !119, !DIExpression(), !760)
    #dbg_value(i32 0, !122, !DIExpression(), !961)
  %347 = load i8, ptr %346, align 1, !dbg !962, !tbaa !131
    #dbg_value(i8 %347, !710, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !953)
    #dbg_value(i32 1, !122, !DIExpression(), !961)
  %348 = getelementptr inbounds nuw i8, ptr %346, i32 1, !dbg !962
  %349 = load i8, ptr %348, align 1, !dbg !962, !tbaa !131
    #dbg_value(i8 %349, !710, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !953)
    #dbg_value(i32 2, !122, !DIExpression(), !961)
  %350 = getelementptr inbounds nuw i8, ptr %346, i32 2, !dbg !962
  %351 = load i8, ptr %350, align 1, !dbg !962, !tbaa !131
    #dbg_value(i8 %351, !710, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !953)
    #dbg_value(i32 3, !122, !DIExpression(), !961)
  %352 = getelementptr inbounds nuw i8, ptr %346, i32 3, !dbg !962
  %353 = load i8, ptr %352, align 1, !dbg !962, !tbaa !131
    #dbg_value(i8 %353, !710, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !953)
    #dbg_value(i32 4, !122, !DIExpression(), !961)
  %354 = zext i8 %326 to i32, !dbg !963
  %355 = shl nuw i32 %354, 24, !dbg !963
  %356 = zext i8 %324 to i32, !dbg !963
  %357 = shl nuw nsw i32 %356, 16, !dbg !963
  %358 = or disjoint i32 %355, %357, !dbg !963
  %359 = zext i8 %322 to i32, !dbg !963
  %360 = shl nuw nsw i32 %359, 8, !dbg !963
  %361 = or disjoint i32 %358, %360, !dbg !963
  %362 = zext i8 %320 to i32, !dbg !963
  %363 = or disjoint i32 %361, %362, !dbg !963
  %364 = zext i8 %335 to i32, !dbg !964
  %365 = shl nuw i32 %364, 24, !dbg !964
  %366 = zext i8 %333 to i32, !dbg !964
  %367 = shl nuw nsw i32 %366, 16, !dbg !964
  %368 = or disjoint i32 %365, %367, !dbg !964
  %369 = zext i8 %331 to i32, !dbg !964
  %370 = shl nuw nsw i32 %369, 8, !dbg !964
  %371 = or disjoint i32 %368, %370, !dbg !964
  %372 = zext i8 %329 to i32, !dbg !964
  %373 = or disjoint i32 %371, %372, !dbg !964
  %374 = zext i8 %344 to i32, !dbg !965
  %375 = shl nuw i32 %374, 24, !dbg !965
  %376 = zext i8 %342 to i32, !dbg !965
  %377 = shl nuw nsw i32 %376, 16, !dbg !965
  %378 = or disjoint i32 %375, %377, !dbg !965
  %379 = zext i8 %340 to i32, !dbg !965
  %380 = shl nuw nsw i32 %379, 8, !dbg !965
  %381 = or disjoint i32 %378, %380, !dbg !965
  %382 = zext i8 %338 to i32, !dbg !965
  %383 = or disjoint i32 %381, %382, !dbg !965
  %384 = zext i8 %353 to i32, !dbg !966
  %385 = shl nuw i32 %384, 24, !dbg !966
  %386 = zext i8 %351 to i32, !dbg !966
  %387 = shl nuw nsw i32 %386, 16, !dbg !966
  %388 = or disjoint i32 %385, %387, !dbg !966
  %389 = zext i8 %349 to i32, !dbg !966
  %390 = shl nuw nsw i32 %389, 8, !dbg !966
  %391 = or disjoint i32 %388, %390, !dbg !966
  %392 = zext i8 %347 to i32, !dbg !966
  %393 = or disjoint i32 %391, %392, !dbg !966
    #dbg_value(i32 %363, !377, !DIExpression(), !968)
    #dbg_value(i32 %373, !378, !DIExpression(), !968)
    #dbg_value(i32 %383, !379, !DIExpression(), !968)
    #dbg_value(i32 %393, !380, !DIExpression(), !968)
    #dbg_value(i32 %363, !381, !DIExpression(), !968)
    #dbg_value(i32 %373, !382, !DIExpression(), !968)
    #dbg_value(i32 %383, !383, !DIExpression(), !968)
    #dbg_value(i32 %393, !384, !DIExpression(), !968)
    #dbg_value(i32 %363, !385, !DIExpression(), !968)
  %394 = icmp ult i32 %363, %383, !dbg !966
  %395 = add i32 %393, %373, !dbg !969
  %396 = mul i32 %373, 3, !dbg !969
  %397 = select i1 %394, i32 %395, i32 %396, !dbg !969
    #dbg_value(i32 %397, !386, !DIExpression(), !968)
    #dbg_value(i32 %397, !711, !DIExpression(), !953)
    #dbg_value(i32 1, !55, !DIExpression(), !970)
    #dbg_value(i32 4, !56, !DIExpression(), !970)
  %398 = load i32, ptr @ink_top, align 4
  %399 = icmp ugt i32 %398, -8
  br i1 %399, label %400, label %401, !dbg !972

400:                                              ; preds = %318
  tail call void @llvm.trap(), !dbg !973
  unreachable, !dbg !975

401:                                              ; preds = %318
  %402 = icmp eq i32 %398, 0, !dbg !976
  %403 = add nuw i32 %398, 7, !dbg !977
  %404 = select i1 %402, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %403, !dbg !978
  %405 = and i32 %404, -8, !dbg !979
    #dbg_value(i32 %405, !57, !DIExpression(), !970)
    #dbg_value(i32 4, !58, !DIExpression(), !970)
  %406 = or disjoint i32 %405, 4, !dbg !980
  store i32 %406, ptr @ink_top, align 4, !dbg !981, !tbaa !27
  %407 = add i32 %405, 65539, !dbg !982
  %408 = lshr i32 %407, 16, !dbg !983
    #dbg_value(i32 %408, !59, !DIExpression(), !970)
  %409 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !984
    #dbg_value(i32 %409, !60, !DIExpression(), !970)
  %410 = icmp ugt i32 %408, %409, !dbg !985
  br i1 %410, label %411, label %697, !dbg !986

411:                                              ; preds = %401
  %412 = sub nuw nsw i32 %408, %409, !dbg !987
  %413 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %412), !dbg !988
  %414 = icmp eq i32 %413, -1, !dbg !989
  br i1 %414, label %415, label %697, !dbg !986

415:                                              ; preds = %411
  tail call void @llvm.trap(), !dbg !990
  unreachable, !dbg !992

416:                                              ; preds = %5
  %417 = load ptr, ptr %1, align 4, !dbg !993, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !762)
    #dbg_value(ptr %417, !115, !DIExpression(), !762)
    #dbg_value(i32 4, !116, !DIExpression(), !762)
    #dbg_value(ptr undef, !117, !DIExpression(), !762)
    #dbg_value(ptr %417, !119, !DIExpression(), !762)
    #dbg_value(i32 0, !122, !DIExpression(), !994)
  %418 = load i8, ptr %417, align 1, !dbg !995, !tbaa !131
    #dbg_value(i8 %418, !713, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !996)
    #dbg_value(i32 1, !122, !DIExpression(), !994)
  %419 = getelementptr inbounds nuw i8, ptr %417, i32 1, !dbg !995
  %420 = load i8, ptr %419, align 1, !dbg !995, !tbaa !131
    #dbg_value(i8 %420, !713, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !996)
    #dbg_value(i32 2, !122, !DIExpression(), !994)
  %421 = getelementptr inbounds nuw i8, ptr %417, i32 2, !dbg !995
  %422 = load i8, ptr %421, align 1, !dbg !995, !tbaa !131
    #dbg_value(i8 %422, !713, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !996)
    #dbg_value(i32 3, !122, !DIExpression(), !994)
  %423 = getelementptr inbounds nuw i8, ptr %417, i32 3, !dbg !995
  %424 = load i8, ptr %423, align 1, !dbg !995, !tbaa !131
    #dbg_value(i8 %424, !713, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !996)
    #dbg_value(i32 4, !122, !DIExpression(), !994)
  %425 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !997
  %426 = load ptr, ptr %425, align 4, !dbg !997, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !764)
    #dbg_value(ptr %426, !115, !DIExpression(), !764)
    #dbg_value(i32 4, !116, !DIExpression(), !764)
    #dbg_value(ptr undef, !117, !DIExpression(), !764)
    #dbg_value(ptr %426, !119, !DIExpression(), !764)
    #dbg_value(i32 0, !122, !DIExpression(), !998)
  %427 = load i8, ptr %426, align 1, !dbg !999, !tbaa !131
    #dbg_value(i8 %427, !715, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !996)
    #dbg_value(i32 1, !122, !DIExpression(), !998)
  %428 = getelementptr inbounds nuw i8, ptr %426, i32 1, !dbg !999
  %429 = load i8, ptr %428, align 1, !dbg !999, !tbaa !131
    #dbg_value(i8 %429, !715, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !996)
    #dbg_value(i32 2, !122, !DIExpression(), !998)
  %430 = getelementptr inbounds nuw i8, ptr %426, i32 2, !dbg !999
  %431 = load i8, ptr %430, align 1, !dbg !999, !tbaa !131
    #dbg_value(i8 %431, !715, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !996)
    #dbg_value(i32 3, !122, !DIExpression(), !998)
  %432 = getelementptr inbounds nuw i8, ptr %426, i32 3, !dbg !999
  %433 = load i8, ptr %432, align 1, !dbg !999, !tbaa !131
    #dbg_value(i8 %433, !715, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !996)
    #dbg_value(i32 4, !122, !DIExpression(), !998)
  %434 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1000
  %435 = load ptr, ptr %434, align 4, !dbg !1000, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !766)
    #dbg_value(ptr %435, !115, !DIExpression(), !766)
    #dbg_value(i32 4, !116, !DIExpression(), !766)
    #dbg_value(ptr undef, !117, !DIExpression(), !766)
    #dbg_value(ptr %435, !119, !DIExpression(), !766)
    #dbg_value(i32 0, !122, !DIExpression(), !1001)
  %436 = load i8, ptr %435, align 1, !dbg !1002, !tbaa !131
    #dbg_value(i8 %436, !716, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !996)
    #dbg_value(i32 1, !122, !DIExpression(), !1001)
  %437 = getelementptr inbounds nuw i8, ptr %435, i32 1, !dbg !1002
  %438 = load i8, ptr %437, align 1, !dbg !1002, !tbaa !131
    #dbg_value(i8 %438, !716, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !996)
    #dbg_value(i32 2, !122, !DIExpression(), !1001)
  %439 = getelementptr inbounds nuw i8, ptr %435, i32 2, !dbg !1002
  %440 = load i8, ptr %439, align 1, !dbg !1002, !tbaa !131
    #dbg_value(i8 %440, !716, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !996)
    #dbg_value(i32 3, !122, !DIExpression(), !1001)
  %441 = getelementptr inbounds nuw i8, ptr %435, i32 3, !dbg !1002
  %442 = load i8, ptr %441, align 1, !dbg !1002, !tbaa !131
    #dbg_value(i8 %442, !716, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !996)
    #dbg_value(i32 4, !122, !DIExpression(), !1001)
  %443 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1003
  %444 = load ptr, ptr %443, align 4, !dbg !1003, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !768)
    #dbg_value(ptr %444, !115, !DIExpression(), !768)
    #dbg_value(i32 4, !116, !DIExpression(), !768)
    #dbg_value(ptr undef, !117, !DIExpression(), !768)
    #dbg_value(ptr %444, !119, !DIExpression(), !768)
    #dbg_value(i32 0, !122, !DIExpression(), !1004)
  %445 = load i8, ptr %444, align 1, !dbg !1005, !tbaa !131
    #dbg_value(i8 %445, !717, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !996)
    #dbg_value(i32 1, !122, !DIExpression(), !1004)
  %446 = getelementptr inbounds nuw i8, ptr %444, i32 1, !dbg !1005
  %447 = load i8, ptr %446, align 1, !dbg !1005, !tbaa !131
    #dbg_value(i8 %447, !717, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !996)
    #dbg_value(i32 2, !122, !DIExpression(), !1004)
  %448 = getelementptr inbounds nuw i8, ptr %444, i32 2, !dbg !1005
  %449 = load i8, ptr %448, align 1, !dbg !1005, !tbaa !131
    #dbg_value(i8 %449, !717, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !996)
    #dbg_value(i32 3, !122, !DIExpression(), !1004)
  %450 = getelementptr inbounds nuw i8, ptr %444, i32 3, !dbg !1005
  %451 = load i8, ptr %450, align 1, !dbg !1005, !tbaa !131
    #dbg_value(i8 %451, !717, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !996)
    #dbg_value(i32 4, !122, !DIExpression(), !1004)
  %452 = zext i8 %424 to i32, !dbg !1006
  %453 = shl nuw i32 %452, 24, !dbg !1006
  %454 = zext i8 %422 to i32, !dbg !1006
  %455 = shl nuw nsw i32 %454, 16, !dbg !1006
  %456 = or disjoint i32 %453, %455, !dbg !1006
  %457 = zext i8 %420 to i32, !dbg !1006
  %458 = shl nuw nsw i32 %457, 8, !dbg !1006
  %459 = or disjoint i32 %456, %458, !dbg !1006
  %460 = zext i8 %418 to i32, !dbg !1006
  %461 = or disjoint i32 %459, %460, !dbg !1006
  %462 = zext i8 %433 to i32, !dbg !1007
  %463 = shl nuw i32 %462, 24, !dbg !1007
  %464 = zext i8 %431 to i32, !dbg !1007
  %465 = shl nuw nsw i32 %464, 16, !dbg !1007
  %466 = or disjoint i32 %463, %465, !dbg !1007
  %467 = zext i8 %429 to i32, !dbg !1007
  %468 = shl nuw nsw i32 %467, 8, !dbg !1007
  %469 = or disjoint i32 %466, %468, !dbg !1007
  %470 = zext i8 %427 to i32, !dbg !1007
  %471 = or disjoint i32 %469, %470, !dbg !1007
  %472 = zext i8 %442 to i32, !dbg !1008
  %473 = shl nuw i32 %472, 24, !dbg !1008
  %474 = zext i8 %440 to i32, !dbg !1008
  %475 = shl nuw nsw i32 %474, 16, !dbg !1008
  %476 = or disjoint i32 %473, %475, !dbg !1008
  %477 = zext i8 %438 to i32, !dbg !1008
  %478 = shl nuw nsw i32 %477, 8, !dbg !1008
  %479 = or disjoint i32 %476, %478, !dbg !1008
  %480 = zext i8 %436 to i32, !dbg !1008
  %481 = or disjoint i32 %479, %480, !dbg !1008
  %482 = zext i8 %451 to i32, !dbg !1009
  %483 = shl nuw i32 %482, 24, !dbg !1009
  %484 = zext i8 %449 to i32, !dbg !1009
  %485 = shl nuw nsw i32 %484, 16, !dbg !1009
  %486 = or disjoint i32 %483, %485, !dbg !1009
  %487 = zext i8 %447 to i32, !dbg !1009
  %488 = shl nuw nsw i32 %487, 8, !dbg !1009
  %489 = or disjoint i32 %486, %488, !dbg !1009
  %490 = zext i8 %445 to i32, !dbg !1009
  %491 = or disjoint i32 %489, %490, !dbg !1009
    #dbg_value(i32 %461, !398, !DIExpression(), !1011)
    #dbg_value(i32 %471, !399, !DIExpression(), !1011)
    #dbg_value(i32 %481, !400, !DIExpression(), !1011)
    #dbg_value(i32 %491, !401, !DIExpression(), !1011)
    #dbg_value(i32 %461, !402, !DIExpression(), !1011)
  %492 = icmp ult i32 %461, %481, !dbg !1009
  %493 = add i32 %491, %471, !dbg !1012
  %494 = mul i32 %471, 3, !dbg !1012
  %495 = select i1 %492, i32 %493, i32 %494, !dbg !1012
    #dbg_value(i32 %495, !403, !DIExpression(), !1011)
    #dbg_value(i32 %495, !718, !DIExpression(), !996)
    #dbg_value(i32 1, !55, !DIExpression(), !1013)
    #dbg_value(i32 4, !56, !DIExpression(), !1013)
  %496 = load i32, ptr @ink_top, align 4
  %497 = icmp ugt i32 %496, -8
  br i1 %497, label %498, label %499, !dbg !1015

498:                                              ; preds = %416
  tail call void @llvm.trap(), !dbg !1016
  unreachable, !dbg !1018

499:                                              ; preds = %416
  %500 = icmp eq i32 %496, 0, !dbg !1019
  %501 = add nuw i32 %496, 7, !dbg !1020
  %502 = select i1 %500, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %501, !dbg !1021
  %503 = and i32 %502, -8, !dbg !1022
    #dbg_value(i32 %503, !57, !DIExpression(), !1013)
    #dbg_value(i32 4, !58, !DIExpression(), !1013)
  %504 = or disjoint i32 %503, 4, !dbg !1023
  store i32 %504, ptr @ink_top, align 4, !dbg !1024, !tbaa !27
  %505 = add i32 %503, 65539, !dbg !1025
  %506 = lshr i32 %505, 16, !dbg !1026
    #dbg_value(i32 %506, !59, !DIExpression(), !1013)
  %507 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1027
    #dbg_value(i32 %507, !60, !DIExpression(), !1013)
  %508 = icmp ugt i32 %506, %507, !dbg !1028
  br i1 %508, label %509, label %697, !dbg !1029

509:                                              ; preds = %499
  %510 = sub nuw nsw i32 %506, %507, !dbg !1030
  %511 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %510), !dbg !1031
  %512 = icmp eq i32 %511, -1, !dbg !1032
  br i1 %512, label %513, label %697, !dbg !1029

513:                                              ; preds = %509
  tail call void @llvm.trap(), !dbg !1033
  unreachable, !dbg !1035

514:                                              ; preds = %5
  %515 = load ptr, ptr %1, align 4, !dbg !1036, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !770)
    #dbg_value(ptr %515, !115, !DIExpression(), !770)
    #dbg_value(i32 4, !116, !DIExpression(), !770)
    #dbg_value(ptr undef, !117, !DIExpression(), !770)
    #dbg_value(ptr %515, !119, !DIExpression(), !770)
    #dbg_value(i32 0, !122, !DIExpression(), !1037)
  %516 = load i8, ptr %515, align 1, !dbg !1038, !tbaa !131
    #dbg_value(i8 %516, !720, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1039)
    #dbg_value(i32 1, !122, !DIExpression(), !1037)
  %517 = getelementptr inbounds nuw i8, ptr %515, i32 1, !dbg !1038
  %518 = load i8, ptr %517, align 1, !dbg !1038, !tbaa !131
    #dbg_value(i8 %518, !720, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1039)
    #dbg_value(i32 2, !122, !DIExpression(), !1037)
  %519 = getelementptr inbounds nuw i8, ptr %515, i32 2, !dbg !1038
  %520 = load i8, ptr %519, align 1, !dbg !1038, !tbaa !131
    #dbg_value(i8 %520, !720, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1039)
    #dbg_value(i32 3, !122, !DIExpression(), !1037)
  %521 = getelementptr inbounds nuw i8, ptr %515, i32 3, !dbg !1038
  %522 = load i8, ptr %521, align 1, !dbg !1038, !tbaa !131
    #dbg_value(i8 %522, !720, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1039)
    #dbg_value(i32 4, !122, !DIExpression(), !1037)
  %523 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1040
  %524 = load ptr, ptr %523, align 4, !dbg !1040, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !772)
    #dbg_value(ptr %524, !115, !DIExpression(), !772)
    #dbg_value(i32 4, !116, !DIExpression(), !772)
    #dbg_value(ptr undef, !117, !DIExpression(), !772)
    #dbg_value(ptr %524, !119, !DIExpression(), !772)
    #dbg_value(i32 0, !122, !DIExpression(), !1041)
  %525 = load i8, ptr %524, align 1, !dbg !1042, !tbaa !131
    #dbg_value(i8 %525, !722, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1039)
    #dbg_value(i32 1, !122, !DIExpression(), !1041)
  %526 = getelementptr inbounds nuw i8, ptr %524, i32 1, !dbg !1042
  %527 = load i8, ptr %526, align 1, !dbg !1042, !tbaa !131
    #dbg_value(i8 %527, !722, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1039)
    #dbg_value(i32 2, !122, !DIExpression(), !1041)
  %528 = getelementptr inbounds nuw i8, ptr %524, i32 2, !dbg !1042
  %529 = load i8, ptr %528, align 1, !dbg !1042, !tbaa !131
    #dbg_value(i8 %529, !722, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1039)
    #dbg_value(i32 3, !122, !DIExpression(), !1041)
  %530 = getelementptr inbounds nuw i8, ptr %524, i32 3, !dbg !1042
  %531 = load i8, ptr %530, align 1, !dbg !1042, !tbaa !131
    #dbg_value(i8 %531, !722, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1039)
    #dbg_value(i32 4, !122, !DIExpression(), !1041)
    #dbg_value(i32 poison, !122, !DIExpression(), !1043)
  %532 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1045
  %533 = load ptr, ptr %532, align 4, !dbg !1045, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !774)
    #dbg_value(ptr %533, !115, !DIExpression(), !774)
    #dbg_value(i32 4, !116, !DIExpression(), !774)
    #dbg_value(ptr undef, !117, !DIExpression(), !774)
    #dbg_value(ptr %533, !119, !DIExpression(), !774)
    #dbg_value(i32 0, !122, !DIExpression(), !1046)
  %534 = load i8, ptr %533, align 1, !dbg !1047, !tbaa !131
    #dbg_value(i8 %534, !724, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1039)
    #dbg_value(i32 1, !122, !DIExpression(), !1046)
  %535 = getelementptr inbounds nuw i8, ptr %533, i32 1, !dbg !1047
  %536 = load i8, ptr %535, align 1, !dbg !1047, !tbaa !131
    #dbg_value(i8 %536, !724, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1039)
    #dbg_value(i32 2, !122, !DIExpression(), !1046)
  %537 = getelementptr inbounds nuw i8, ptr %533, i32 2, !dbg !1047
  %538 = load i8, ptr %537, align 1, !dbg !1047, !tbaa !131
    #dbg_value(i8 %538, !724, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1039)
    #dbg_value(i32 3, !122, !DIExpression(), !1046)
  %539 = getelementptr inbounds nuw i8, ptr %533, i32 3, !dbg !1047
  %540 = load i8, ptr %539, align 1, !dbg !1047, !tbaa !131
    #dbg_value(i8 %540, !724, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1039)
    #dbg_value(i32 4, !122, !DIExpression(), !1046)
  %541 = zext i8 %522 to i32, !dbg !1048
  %542 = shl nuw i32 %541, 24, !dbg !1048
  %543 = zext i8 %520 to i32, !dbg !1048
  %544 = shl nuw nsw i32 %543, 16, !dbg !1048
  %545 = or disjoint i32 %542, %544, !dbg !1048
  %546 = zext i8 %518 to i32, !dbg !1048
  %547 = shl nuw nsw i32 %546, 8, !dbg !1048
  %548 = or disjoint i32 %545, %547, !dbg !1048
  %549 = zext i8 %516 to i32, !dbg !1048
  %550 = or disjoint i32 %548, %549, !dbg !1048
  %551 = zext i8 %531 to i32, !dbg !1049
  %552 = shl nuw i32 %551, 24, !dbg !1049
  %553 = zext i8 %529 to i32, !dbg !1049
  %554 = shl nuw nsw i32 %553, 16, !dbg !1049
  %555 = or disjoint i32 %552, %554, !dbg !1049
  %556 = zext i8 %527 to i32, !dbg !1049
  %557 = shl nuw nsw i32 %556, 8, !dbg !1049
  %558 = or disjoint i32 %555, %557, !dbg !1049
  %559 = zext i8 %525 to i32, !dbg !1049
  %560 = or disjoint i32 %558, %559, !dbg !1049
  %561 = zext i8 %540 to i32, !dbg !1050
  %562 = shl nuw i32 %561, 24, !dbg !1050
  %563 = zext i8 %538 to i32, !dbg !1050
  %564 = shl nuw nsw i32 %563, 16, !dbg !1050
  %565 = or disjoint i32 %562, %564, !dbg !1050
  %566 = zext i8 %536 to i32, !dbg !1050
  %567 = shl nuw nsw i32 %566, 8, !dbg !1050
  %568 = or disjoint i32 %565, %567, !dbg !1050
  %569 = zext i8 %534 to i32, !dbg !1050
  %570 = or disjoint i32 %568, %569, !dbg !1050
    #dbg_value(i32 %550, !415, !DIExpression(), !1052)
    #dbg_value(i32 %560, !416, !DIExpression(), !1052)
    #dbg_value(i32 poison, !417, !DIExpression(), !1052)
    #dbg_value(i32 %570, !418, !DIExpression(), !1052)
    #dbg_value(i32 %550, !419, !DIExpression(), !1052)
    #dbg_value(i32 %560, !420, !DIExpression(), !1052)
    #dbg_value(i32 poison, !421, !DIExpression(), !1052)
    #dbg_value(i32 %570, !422, !DIExpression(), !1052)
    #dbg_value(i32 %550, !423, !DIExpression(), !1052)
  %571 = icmp ult i32 %550, %560, !dbg !1050
  %572 = icmp eq i32 %570, 0, !dbg !1053
  br i1 %571, label %573, label %579, !dbg !1054

573:                                              ; preds = %514
    #dbg_value(i32 %550, !425, !DIExpression(), !1055)
    #dbg_value(i32 %570, !428, !DIExpression(), !1055)
  br i1 %572, label %576, label %574, !dbg !1056

574:                                              ; preds = %573
  %575 = udiv i32 %550, %570, !dbg !1057
    #dbg_value(i32 %575, !429, !DIExpression(), !1055)
  br label %576

576:                                              ; preds = %574, %573
  %577 = phi i32 [ %575, %574 ], [ 0, %573 ], !dbg !1058
    #dbg_value(i32 %577, !429, !DIExpression(), !1055)
    #dbg_value(i32 %577, !430, !DIExpression(), !1055)
  %578 = add i32 %577, %560, !dbg !1059
    #dbg_value(i32 %578, !424, !DIExpression(), !1052)
  br label %585, !dbg !1060

579:                                              ; preds = %514
    #dbg_value(i32 %560, !431, !DIExpression(), !1061)
    #dbg_value(i32 %570, !433, !DIExpression(), !1061)
  br i1 %572, label %582, label %580, !dbg !1062

580:                                              ; preds = %579
  %581 = urem i32 %560, %570, !dbg !1063
    #dbg_value(i32 %581, !434, !DIExpression(), !1061)
  br label %582

582:                                              ; preds = %580, %579
  %583 = phi i32 [ %581, %580 ], [ 0, %579 ], !dbg !1064
    #dbg_value(i32 %583, !434, !DIExpression(), !1061)
    #dbg_value(i32 %583, !435, !DIExpression(), !1061)
  %584 = add i32 %583, %550, !dbg !1065
    #dbg_value(i32 %584, !424, !DIExpression(), !1052)
  br label %585

585:                                              ; preds = %576, %582
  %586 = phi i32 [ %578, %576 ], [ %584, %582 ], !dbg !1053
    #dbg_value(i32 %586, !424, !DIExpression(), !1052)
    #dbg_value(i32 %586, !725, !DIExpression(), !1039)
    #dbg_value(i32 1, !55, !DIExpression(), !1066)
    #dbg_value(i32 4, !56, !DIExpression(), !1066)
  %587 = load i32, ptr @ink_top, align 4
  %588 = icmp ugt i32 %587, -8
  br i1 %588, label %589, label %590, !dbg !1068

589:                                              ; preds = %585
  tail call void @llvm.trap(), !dbg !1069
  unreachable, !dbg !1071

590:                                              ; preds = %585
  %591 = icmp eq i32 %587, 0, !dbg !1072
  %592 = add nuw i32 %587, 7, !dbg !1073
  %593 = select i1 %591, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %592, !dbg !1074
  %594 = and i32 %593, -8, !dbg !1075
    #dbg_value(i32 %594, !57, !DIExpression(), !1066)
    #dbg_value(i32 4, !58, !DIExpression(), !1066)
  %595 = or disjoint i32 %594, 4, !dbg !1076
  store i32 %595, ptr @ink_top, align 4, !dbg !1077, !tbaa !27
  %596 = add i32 %594, 65539, !dbg !1078
  %597 = lshr i32 %596, 16, !dbg !1079
    #dbg_value(i32 %597, !59, !DIExpression(), !1066)
  %598 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1080
    #dbg_value(i32 %598, !60, !DIExpression(), !1066)
  %599 = icmp ugt i32 %597, %598, !dbg !1081
  br i1 %599, label %600, label %697, !dbg !1082

600:                                              ; preds = %590
  %601 = sub nuw nsw i32 %597, %598, !dbg !1083
  %602 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %601), !dbg !1084
  %603 = icmp eq i32 %602, -1, !dbg !1085
  br i1 %603, label %604, label %697, !dbg !1082

604:                                              ; preds = %600
  tail call void @llvm.trap(), !dbg !1086
  unreachable, !dbg !1088

605:                                              ; preds = %5
  %606 = load ptr, ptr %1, align 4, !dbg !1089, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !776)
    #dbg_value(ptr %606, !115, !DIExpression(), !776)
    #dbg_value(i32 4, !116, !DIExpression(), !776)
    #dbg_value(ptr undef, !117, !DIExpression(), !776)
    #dbg_value(ptr %606, !119, !DIExpression(), !776)
    #dbg_value(i32 0, !122, !DIExpression(), !1090)
  %607 = load i8, ptr %606, align 1, !dbg !1091, !tbaa !131
    #dbg_value(i8 %607, !727, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1092)
    #dbg_value(i32 1, !122, !DIExpression(), !1090)
  %608 = getelementptr inbounds nuw i8, ptr %606, i32 1, !dbg !1091
  %609 = load i8, ptr %608, align 1, !dbg !1091, !tbaa !131
    #dbg_value(i8 %609, !727, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1092)
    #dbg_value(i32 2, !122, !DIExpression(), !1090)
  %610 = getelementptr inbounds nuw i8, ptr %606, i32 2, !dbg !1091
  %611 = load i8, ptr %610, align 1, !dbg !1091, !tbaa !131
    #dbg_value(i8 %611, !727, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1092)
    #dbg_value(i32 3, !122, !DIExpression(), !1090)
  %612 = getelementptr inbounds nuw i8, ptr %606, i32 3, !dbg !1091
  %613 = load i8, ptr %612, align 1, !dbg !1091, !tbaa !131
    #dbg_value(i8 %613, !727, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1092)
    #dbg_value(i32 4, !122, !DIExpression(), !1090)
  %614 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1093
  %615 = load ptr, ptr %614, align 4, !dbg !1093, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !778)
    #dbg_value(ptr %615, !115, !DIExpression(), !778)
    #dbg_value(i32 4, !116, !DIExpression(), !778)
    #dbg_value(ptr undef, !117, !DIExpression(), !778)
    #dbg_value(ptr %615, !119, !DIExpression(), !778)
    #dbg_value(i32 0, !122, !DIExpression(), !1094)
  %616 = load i8, ptr %615, align 1, !dbg !1095, !tbaa !131
    #dbg_value(i8 %616, !729, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1092)
    #dbg_value(i32 1, !122, !DIExpression(), !1094)
  %617 = getelementptr inbounds nuw i8, ptr %615, i32 1, !dbg !1095
  %618 = load i8, ptr %617, align 1, !dbg !1095, !tbaa !131
    #dbg_value(i8 %618, !729, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1092)
    #dbg_value(i32 2, !122, !DIExpression(), !1094)
  %619 = getelementptr inbounds nuw i8, ptr %615, i32 2, !dbg !1095
  %620 = load i8, ptr %619, align 1, !dbg !1095, !tbaa !131
    #dbg_value(i8 %620, !729, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1092)
    #dbg_value(i32 3, !122, !DIExpression(), !1094)
  %621 = getelementptr inbounds nuw i8, ptr %615, i32 3, !dbg !1095
  %622 = load i8, ptr %621, align 1, !dbg !1095, !tbaa !131
    #dbg_value(i8 %622, !729, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1092)
    #dbg_value(i32 4, !122, !DIExpression(), !1094)
    #dbg_value(i32 poison, !122, !DIExpression(), !1096)
  %623 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1098
  %624 = load ptr, ptr %623, align 4, !dbg !1098, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !780)
    #dbg_value(ptr %624, !115, !DIExpression(), !780)
    #dbg_value(i32 4, !116, !DIExpression(), !780)
    #dbg_value(ptr undef, !117, !DIExpression(), !780)
    #dbg_value(ptr %624, !119, !DIExpression(), !780)
    #dbg_value(i32 0, !122, !DIExpression(), !1099)
  %625 = load i8, ptr %624, align 1, !dbg !1100, !tbaa !131
    #dbg_value(i8 %625, !731, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1092)
    #dbg_value(i32 1, !122, !DIExpression(), !1099)
  %626 = getelementptr inbounds nuw i8, ptr %624, i32 1, !dbg !1100
  %627 = load i8, ptr %626, align 1, !dbg !1100, !tbaa !131
    #dbg_value(i8 %627, !731, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1092)
    #dbg_value(i32 2, !122, !DIExpression(), !1099)
  %628 = getelementptr inbounds nuw i8, ptr %624, i32 2, !dbg !1100
  %629 = load i8, ptr %628, align 1, !dbg !1100, !tbaa !131
    #dbg_value(i8 %629, !731, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1092)
    #dbg_value(i32 3, !122, !DIExpression(), !1099)
  %630 = getelementptr inbounds nuw i8, ptr %624, i32 3, !dbg !1100
  %631 = load i8, ptr %630, align 1, !dbg !1100, !tbaa !131
    #dbg_value(i8 %631, !731, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1092)
    #dbg_value(i32 4, !122, !DIExpression(), !1099)
  %632 = zext i8 %613 to i32, !dbg !1101
  %633 = shl nuw i32 %632, 24, !dbg !1101
  %634 = zext i8 %611 to i32, !dbg !1101
  %635 = shl nuw nsw i32 %634, 16, !dbg !1101
  %636 = or disjoint i32 %633, %635, !dbg !1101
  %637 = zext i8 %609 to i32, !dbg !1101
  %638 = shl nuw nsw i32 %637, 8, !dbg !1101
  %639 = or disjoint i32 %636, %638, !dbg !1101
  %640 = zext i8 %607 to i32, !dbg !1101
  %641 = or disjoint i32 %639, %640, !dbg !1101
  %642 = zext i8 %622 to i32, !dbg !1102
  %643 = shl nuw i32 %642, 24, !dbg !1102
  %644 = zext i8 %620 to i32, !dbg !1102
  %645 = shl nuw nsw i32 %644, 16, !dbg !1102
  %646 = or disjoint i32 %643, %645, !dbg !1102
  %647 = zext i8 %618 to i32, !dbg !1102
  %648 = shl nuw nsw i32 %647, 8, !dbg !1102
  %649 = or disjoint i32 %646, %648, !dbg !1102
  %650 = zext i8 %616 to i32, !dbg !1102
  %651 = or disjoint i32 %649, %650, !dbg !1102
  %652 = zext i8 %631 to i32, !dbg !1103
  %653 = shl nuw i32 %652, 24, !dbg !1103
  %654 = zext i8 %629 to i32, !dbg !1103
  %655 = shl nuw nsw i32 %654, 16, !dbg !1103
  %656 = or disjoint i32 %653, %655, !dbg !1103
  %657 = zext i8 %627 to i32, !dbg !1103
  %658 = shl nuw nsw i32 %657, 8, !dbg !1103
  %659 = or disjoint i32 %656, %658, !dbg !1103
  %660 = zext i8 %625 to i32, !dbg !1103
  %661 = or disjoint i32 %659, %660, !dbg !1103
    #dbg_value(i32 %641, !458, !DIExpression(), !1105)
    #dbg_value(i32 %651, !459, !DIExpression(), !1105)
    #dbg_value(i32 poison, !460, !DIExpression(), !1105)
    #dbg_value(i32 %661, !461, !DIExpression(), !1105)
    #dbg_value(i32 %641, !462, !DIExpression(), !1105)
  %662 = icmp ult i32 %641, %651, !dbg !1103
  %663 = icmp eq i32 %661, 0, !dbg !1106
  br i1 %662, label %664, label %670, !dbg !1107

664:                                              ; preds = %605
    #dbg_value(i32 %641, !464, !DIExpression(), !1108)
    #dbg_value(i32 %661, !467, !DIExpression(), !1108)
  br i1 %663, label %667, label %665, !dbg !1109

665:                                              ; preds = %664
  %666 = udiv i32 %641, %661, !dbg !1110
    #dbg_value(i32 %666, !468, !DIExpression(), !1108)
  br label %667

667:                                              ; preds = %665, %664
  %668 = phi i32 [ %666, %665 ], [ 0, %664 ], !dbg !1111
    #dbg_value(i32 %668, !468, !DIExpression(), !1108)
    #dbg_value(i32 %668, !469, !DIExpression(), !1108)
  %669 = add i32 %668, %651, !dbg !1112
    #dbg_value(i32 %669, !463, !DIExpression(), !1105)
  br label %676, !dbg !1113

670:                                              ; preds = %605
    #dbg_value(i32 %651, !470, !DIExpression(), !1114)
    #dbg_value(i32 %661, !472, !DIExpression(), !1114)
  br i1 %663, label %673, label %671, !dbg !1115

671:                                              ; preds = %670
  %672 = urem i32 %651, %661, !dbg !1116
    #dbg_value(i32 %672, !473, !DIExpression(), !1114)
  br label %673

673:                                              ; preds = %671, %670
  %674 = phi i32 [ %672, %671 ], [ 0, %670 ], !dbg !1117
    #dbg_value(i32 %674, !473, !DIExpression(), !1114)
    #dbg_value(i32 %674, !474, !DIExpression(), !1114)
  %675 = add i32 %674, %641, !dbg !1118
    #dbg_value(i32 %675, !463, !DIExpression(), !1105)
  br label %676

676:                                              ; preds = %667, %673
  %677 = phi i32 [ %669, %667 ], [ %675, %673 ], !dbg !1106
    #dbg_value(i32 %677, !463, !DIExpression(), !1105)
    #dbg_value(i32 %677, !732, !DIExpression(), !1092)
    #dbg_value(i32 1, !55, !DIExpression(), !1119)
    #dbg_value(i32 4, !56, !DIExpression(), !1119)
  %678 = load i32, ptr @ink_top, align 4
  %679 = icmp ugt i32 %678, -8
  br i1 %679, label %680, label %681, !dbg !1121

680:                                              ; preds = %676
  tail call void @llvm.trap(), !dbg !1122
  unreachable, !dbg !1124

681:                                              ; preds = %676
  %682 = icmp eq i32 %678, 0, !dbg !1125
  %683 = add nuw i32 %678, 7, !dbg !1126
  %684 = select i1 %682, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %683, !dbg !1127
  %685 = and i32 %684, -8, !dbg !1128
    #dbg_value(i32 %685, !57, !DIExpression(), !1119)
    #dbg_value(i32 4, !58, !DIExpression(), !1119)
  %686 = or disjoint i32 %685, 4, !dbg !1129
  store i32 %686, ptr @ink_top, align 4, !dbg !1130, !tbaa !27
  %687 = add i32 %685, 65539, !dbg !1131
  %688 = lshr i32 %687, 16, !dbg !1132
    #dbg_value(i32 %688, !59, !DIExpression(), !1119)
  %689 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1133
    #dbg_value(i32 %689, !60, !DIExpression(), !1119)
  %690 = icmp ugt i32 %688, %689, !dbg !1134
  br i1 %690, label %691, label %697, !dbg !1135

691:                                              ; preds = %681
  %692 = sub nuw nsw i32 %688, %689, !dbg !1136
  %693 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %692), !dbg !1137
  %694 = icmp eq i32 %693, -1, !dbg !1138
  br i1 %694, label %695, label %697, !dbg !1135

695:                                              ; preds = %691
  tail call void @llvm.trap(), !dbg !1139
  unreachable, !dbg !1141

696:                                              ; preds = %5
  tail call void @llvm.trap(), !dbg !1142
  unreachable, !dbg !1144

697:                                              ; preds = %691, %681, %600, %590, %509, %499, %411, %401, %313, %303, %211, %201
  %698 = phi i32 [ %205, %201 ], [ %205, %211 ], [ %307, %303 ], [ %307, %313 ], [ %405, %401 ], [ %405, %411 ], [ %503, %499 ], [ %503, %509 ], [ %594, %590 ], [ %594, %600 ], [ %685, %681 ], [ %685, %691 ]
  %699 = phi i32 [ %197, %201 ], [ %197, %211 ], [ %299, %303 ], [ %299, %313 ], [ %397, %401 ], [ %397, %411 ], [ %495, %499 ], [ %495, %509 ], [ %586, %590 ], [ %586, %600 ], [ %677, %681 ], [ %677, %691 ]
  %700 = inttoptr i32 %698 to ptr, !dbg !1145
  store i32 %699, ptr %700, align 8, !dbg !1146, !tbaa !286
  br label %701, !dbg !1146

701:                                              ; preds = %109, %697, %73
  %702 = phi ptr [ %74, %73 ], [ %700, %697 ], [ %74, %109 ]
  %703 = phi i32 [ %26, %73 ], [ 1, %697 ], [ %26, %109 ]
  store ptr %702, ptr %3, align 4, !dbg !1146, !tbaa !629
  store i32 %703, ptr %4, align 4, !dbg !1146, !tbaa !27
  ret void, !dbg !1147
}

; Function Attrs: nounwind memory(read, inaccessiblemem: write) uwtable
define hidden i32 @ink_compute_scalar32(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readnone %2) local_unnamed_addr #10 !dbg !1148 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1192)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1192)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1192)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1192)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1192)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1192)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1192)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1192)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1194)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1194)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1194)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1194)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1194)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1194)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1194)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1194)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1196)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1196)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1196)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1196)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1196)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1196)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1196)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1196)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1198)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1198)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1198)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1198)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1198)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1198)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1198)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1198)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1200)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1200)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1200)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1200)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1200)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1200)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1200)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1200)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1202)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1202)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1202)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1202)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1202)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1202)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1202)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1202)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1204)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1204)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1204)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1204)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1204)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1204)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1204)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1204)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1206)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1206)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1206)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1206)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1206)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1206)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1206)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1206)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1208)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1208)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1208)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1208)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1208)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1208)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1208)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1208)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1210)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1210)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1210)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1210)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1210)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1210)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1210)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1210)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1212)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1212)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1212)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1212)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1212)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1212)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1212)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1212)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1214)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1214)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1214)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1214)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1214)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1214)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1214)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1214)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1216)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1216)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1216)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1216)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1216)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1216)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1216)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1216)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1218)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1218)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1218)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1218)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1218)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1218)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1218)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1218)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1220)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1220)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1220)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1220)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1220)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1220)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1220)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1220)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1222)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1222)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1222)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1222)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1222)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1222)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1222)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1222)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1224)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1224)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1224)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1224)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1224)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1224)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1224)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1224)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1226)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1226)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1226)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1226)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1226)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1226)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1226)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1226)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1228)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1228)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1228)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1228)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1228)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1228)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1228)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1228)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1230)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1230)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1230)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1230)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1230)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1230)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1230)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1230)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1232)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1232)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1232)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1232)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1232)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1232)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1232)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1232)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1234)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1234)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1234)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1234)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1234)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1234)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1234)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1234)
    #dbg_value(i32 %0, !1152, !DIExpression(), !1236)
    #dbg_value(ptr %1, !1153, !DIExpression(), !1236)
    #dbg_value(ptr %2, !1154, !DIExpression(), !1236)
  switch i32 %0, label %474 [
    i32 1, label %4
    i32 2, label %88
    i32 3, label %172
    i32 4, label %252
    i32 5, label %332
    i32 6, label %403
  ], !dbg !1237

4:                                                ; preds = %3
    #dbg_value(ptr undef, !110, !DIExpression(), !1192)
    #dbg_value(ptr poison, !115, !DIExpression(), !1192)
    #dbg_value(i32 4, !116, !DIExpression(), !1192)
    #dbg_value(ptr undef, !117, !DIExpression(), !1192)
    #dbg_value(ptr poison, !119, !DIExpression(), !1192)
    #dbg_value(i8 poison, !1155, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1238)
    #dbg_value(i8 poison, !1155, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1238)
    #dbg_value(i8 poison, !1155, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1238)
    #dbg_value(i8 poison, !1155, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1238)
    #dbg_value(i32 4, !122, !DIExpression(), !1239)
    #dbg_value(ptr undef, !110, !DIExpression(), !1194)
    #dbg_value(ptr poison, !115, !DIExpression(), !1194)
    #dbg_value(i32 4, !116, !DIExpression(), !1194)
    #dbg_value(ptr undef, !117, !DIExpression(), !1194)
    #dbg_value(ptr poison, !119, !DIExpression(), !1194)
    #dbg_value(i8 poison, !1158, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1238)
    #dbg_value(i8 poison, !1158, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1238)
    #dbg_value(i8 poison, !1158, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1238)
    #dbg_value(i8 poison, !1158, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1238)
    #dbg_value(i32 4, !122, !DIExpression(), !1240)
  %5 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1241
  %6 = load ptr, ptr %5, align 4, !dbg !1241, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1196)
    #dbg_value(ptr %6, !115, !DIExpression(), !1196)
    #dbg_value(i32 4, !116, !DIExpression(), !1196)
    #dbg_value(ptr undef, !117, !DIExpression(), !1196)
    #dbg_value(ptr %6, !119, !DIExpression(), !1196)
    #dbg_value(i32 0, !122, !DIExpression(), !1242)
  %7 = load i8, ptr %6, align 1, !dbg !1243, !tbaa !131
    #dbg_value(i8 %7, !1159, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1238)
    #dbg_value(i32 1, !122, !DIExpression(), !1242)
  %8 = getelementptr inbounds nuw i8, ptr %6, i32 1, !dbg !1243
  %9 = load i8, ptr %8, align 1, !dbg !1243, !tbaa !131
    #dbg_value(i8 %9, !1159, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1238)
    #dbg_value(i32 2, !122, !DIExpression(), !1242)
  %10 = getelementptr inbounds nuw i8, ptr %6, i32 2, !dbg !1243
  %11 = load i8, ptr %10, align 1, !dbg !1243, !tbaa !131
    #dbg_value(i8 %11, !1159, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1238)
    #dbg_value(i32 3, !122, !DIExpression(), !1242)
  %12 = getelementptr inbounds nuw i8, ptr %6, i32 3, !dbg !1243
  %13 = load i8, ptr %12, align 1, !dbg !1243, !tbaa !131
    #dbg_value(i8 %13, !1159, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1238)
    #dbg_value(i32 4, !122, !DIExpression(), !1242)
  %14 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1244
  %15 = load ptr, ptr %14, align 4, !dbg !1244, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1198)
    #dbg_value(ptr %15, !115, !DIExpression(), !1198)
    #dbg_value(i32 4, !116, !DIExpression(), !1198)
    #dbg_value(ptr undef, !117, !DIExpression(), !1198)
    #dbg_value(ptr %15, !119, !DIExpression(), !1198)
    #dbg_value(i32 0, !122, !DIExpression(), !1245)
  %16 = load i8, ptr %15, align 1, !dbg !1246, !tbaa !131
    #dbg_value(i8 %16, !1160, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1238)
    #dbg_value(i32 1, !122, !DIExpression(), !1245)
  %17 = getelementptr inbounds nuw i8, ptr %15, i32 1, !dbg !1246
  %18 = load i8, ptr %17, align 1, !dbg !1246, !tbaa !131
    #dbg_value(i8 %18, !1160, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1238)
    #dbg_value(i32 2, !122, !DIExpression(), !1245)
  %19 = getelementptr inbounds nuw i8, ptr %15, i32 2, !dbg !1246
  %20 = load i8, ptr %19, align 1, !dbg !1246, !tbaa !131
    #dbg_value(i8 %20, !1160, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1238)
    #dbg_value(i32 3, !122, !DIExpression(), !1245)
  %21 = getelementptr inbounds nuw i8, ptr %15, i32 3, !dbg !1246
  %22 = load i8, ptr %21, align 1, !dbg !1246, !tbaa !131
    #dbg_value(i8 %22, !1160, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1238)
    #dbg_value(i32 4, !122, !DIExpression(), !1245)
  %23 = zext i8 %13 to i32, !dbg !1247
  %24 = shl nuw i32 %23, 24, !dbg !1247
  %25 = zext i8 %11 to i32, !dbg !1247
  %26 = shl nuw nsw i32 %25, 16, !dbg !1247
  %27 = or disjoint i32 %24, %26, !dbg !1247
  %28 = zext i8 %9 to i32, !dbg !1247
  %29 = shl nuw nsw i32 %28, 8, !dbg !1247
  %30 = or disjoint i32 %27, %29, !dbg !1247
  %31 = zext i8 %7 to i32, !dbg !1247
  %32 = or disjoint i32 %30, %31, !dbg !1247
  %33 = zext i8 %22 to i32, !dbg !1248
  %34 = shl nuw i32 %33, 24, !dbg !1248
  %35 = zext i8 %20 to i32, !dbg !1248
  %36 = shl nuw nsw i32 %35, 16, !dbg !1248
  %37 = or disjoint i32 %34, %36, !dbg !1248
  %38 = zext i8 %18 to i32, !dbg !1248
  %39 = shl nuw nsw i32 %38, 8, !dbg !1248
  %40 = or disjoint i32 %37, %39, !dbg !1248
  %41 = zext i8 %16 to i32, !dbg !1248
  %42 = or disjoint i32 %40, %41, !dbg !1248
    #dbg_value(i32 poison, !323, !DIExpression(), !1250)
    #dbg_value(i32 poison, !324, !DIExpression(), !1250)
    #dbg_value(i32 %32, !325, !DIExpression(), !1250)
    #dbg_value(i32 %42, !326, !DIExpression(), !1250)
    #dbg_value(i32 poison, !327, !DIExpression(), !1250)
    #dbg_value(i32 poison, !328, !DIExpression(), !1250)
    #dbg_value(i32 %32, !329, !DIExpression(), !1250)
    #dbg_value(i32 %42, !330, !DIExpression(), !1250)
    #dbg_value(i32 poison, !331, !DIExpression(), !1250)
    #dbg_value(i32 %42, !332, !DIExpression(), !1250)
  %43 = icmp eq i32 %42, 0, !dbg !1248
  br i1 %43, label %85, label %44, !dbg !1248

44:                                               ; preds = %4
  %45 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1251
  %46 = load ptr, ptr %45, align 4, !dbg !1251, !tbaa !629
    #dbg_value(ptr %46, !115, !DIExpression(), !1194)
    #dbg_value(ptr %46, !119, !DIExpression(), !1194)
  %47 = getelementptr inbounds nuw i8, ptr %46, i32 3, !dbg !1252
  %48 = load i8, ptr %47, align 1, !dbg !1252, !tbaa !131
    #dbg_value(i8 %48, !1158, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1238)
  %49 = getelementptr inbounds nuw i8, ptr %46, i32 2, !dbg !1252
  %50 = load i8, ptr %49, align 1, !dbg !1252, !tbaa !131
    #dbg_value(i8 %50, !1158, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1238)
  %51 = getelementptr inbounds nuw i8, ptr %46, i32 1, !dbg !1252
  %52 = load i8, ptr %51, align 1, !dbg !1252, !tbaa !131
    #dbg_value(i8 %52, !1158, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1238)
  %53 = load i8, ptr %46, align 1, !dbg !1252, !tbaa !131
    #dbg_value(i8 %53, !1158, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1238)
  %54 = load ptr, ptr %1, align 4, !dbg !1253, !tbaa !629
    #dbg_value(ptr %54, !115, !DIExpression(), !1192)
    #dbg_value(ptr %54, !119, !DIExpression(), !1192)
  %55 = getelementptr inbounds nuw i8, ptr %54, i32 3, !dbg !1254
  %56 = load i8, ptr %55, align 1, !dbg !1254, !tbaa !131
    #dbg_value(i8 %56, !1155, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1238)
  %57 = getelementptr inbounds nuw i8, ptr %54, i32 2, !dbg !1254
  %58 = load i8, ptr %57, align 1, !dbg !1254, !tbaa !131
    #dbg_value(i8 %58, !1155, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1238)
  %59 = getelementptr inbounds nuw i8, ptr %54, i32 1, !dbg !1254
  %60 = load i8, ptr %59, align 1, !dbg !1254, !tbaa !131
    #dbg_value(i8 %60, !1155, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1238)
  %61 = load i8, ptr %54, align 1, !dbg !1254, !tbaa !131
    #dbg_value(i8 %61, !1155, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1238)
  %62 = zext i8 %48 to i32, !dbg !1255
  %63 = shl nuw i32 %62, 24, !dbg !1255
  %64 = zext i8 %50 to i32, !dbg !1255
  %65 = shl nuw nsw i32 %64, 16, !dbg !1255
  %66 = or disjoint i32 %63, %65, !dbg !1255
  %67 = zext i8 %52 to i32, !dbg !1255
  %68 = shl nuw nsw i32 %67, 8, !dbg !1255
  %69 = or disjoint i32 %66, %68, !dbg !1255
  %70 = zext i8 %53 to i32, !dbg !1255
  %71 = or disjoint i32 %69, %70, !dbg !1255
    #dbg_value(i32 %71, !324, !DIExpression(), !1250)
    #dbg_value(i32 %71, !328, !DIExpression(), !1250)
    #dbg_value(i32 %71, !331, !DIExpression(), !1250)
  %72 = zext i8 %56 to i32, !dbg !1256
  %73 = shl nuw i32 %72, 24, !dbg !1256
  %74 = zext i8 %58 to i32, !dbg !1256
  %75 = shl nuw nsw i32 %74, 16, !dbg !1256
  %76 = or disjoint i32 %73, %75, !dbg !1256
  %77 = zext i8 %60 to i32, !dbg !1256
  %78 = shl nuw nsw i32 %77, 8, !dbg !1256
  %79 = or disjoint i32 %76, %78, !dbg !1256
  %80 = zext i8 %61 to i32, !dbg !1256
  %81 = or disjoint i32 %79, %80, !dbg !1256
    #dbg_value(i32 %81, !323, !DIExpression(), !1250)
    #dbg_value(i32 %81, !327, !DIExpression(), !1250)
  %82 = udiv i32 %71, %42, !dbg !1256
    #dbg_value(i32 %82, !333, !DIExpression(), !1250)
    #dbg_value(i32 %82, !334, !DIExpression(), !1250)
    #dbg_value(i32 %81, !335, !DIExpression(), !1250)
    #dbg_value(i32 %42, !336, !DIExpression(), !1250)
  %83 = urem i32 %81, %42, !dbg !1257
    #dbg_value(i32 %83, !337, !DIExpression(), !1250)
  %84 = add i32 %83, %82
  br label %85

85:                                               ; preds = %4, %44
  %86 = phi i32 [ %84, %44 ], [ 0, %4 ], !dbg !1258
    #dbg_value(i32 poison, !337, !DIExpression(), !1250)
    #dbg_value(i32 %86, !338, !DIExpression(), !1250)
  %87 = add i32 %86, %32, !dbg !1259
    #dbg_value(i32 %87, !1161, !DIExpression(), !1238)
  br label %475

88:                                               ; preds = %3
    #dbg_value(ptr undef, !110, !DIExpression(), !1200)
    #dbg_value(ptr poison, !115, !DIExpression(), !1200)
    #dbg_value(i32 4, !116, !DIExpression(), !1200)
    #dbg_value(ptr undef, !117, !DIExpression(), !1200)
    #dbg_value(ptr poison, !119, !DIExpression(), !1200)
    #dbg_value(i8 poison, !1162, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1260)
    #dbg_value(i8 poison, !1162, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1260)
    #dbg_value(i8 poison, !1162, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1260)
    #dbg_value(i8 poison, !1162, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1260)
    #dbg_value(i32 4, !122, !DIExpression(), !1261)
    #dbg_value(ptr undef, !110, !DIExpression(), !1202)
    #dbg_value(ptr poison, !115, !DIExpression(), !1202)
    #dbg_value(i32 4, !116, !DIExpression(), !1202)
    #dbg_value(ptr undef, !117, !DIExpression(), !1202)
    #dbg_value(ptr poison, !119, !DIExpression(), !1202)
    #dbg_value(i8 poison, !1164, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1260)
    #dbg_value(i8 poison, !1164, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1260)
    #dbg_value(i8 poison, !1164, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1260)
    #dbg_value(i8 poison, !1164, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1260)
    #dbg_value(i32 4, !122, !DIExpression(), !1262)
  %89 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1263
  %90 = load ptr, ptr %89, align 4, !dbg !1263, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1204)
    #dbg_value(ptr %90, !115, !DIExpression(), !1204)
    #dbg_value(i32 4, !116, !DIExpression(), !1204)
    #dbg_value(ptr undef, !117, !DIExpression(), !1204)
    #dbg_value(ptr %90, !119, !DIExpression(), !1204)
    #dbg_value(i32 0, !122, !DIExpression(), !1264)
  %91 = load i8, ptr %90, align 1, !dbg !1265, !tbaa !131
    #dbg_value(i8 %91, !1165, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1260)
    #dbg_value(i32 1, !122, !DIExpression(), !1264)
  %92 = getelementptr inbounds nuw i8, ptr %90, i32 1, !dbg !1265
  %93 = load i8, ptr %92, align 1, !dbg !1265, !tbaa !131
    #dbg_value(i8 %93, !1165, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1260)
    #dbg_value(i32 2, !122, !DIExpression(), !1264)
  %94 = getelementptr inbounds nuw i8, ptr %90, i32 2, !dbg !1265
  %95 = load i8, ptr %94, align 1, !dbg !1265, !tbaa !131
    #dbg_value(i8 %95, !1165, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1260)
    #dbg_value(i32 3, !122, !DIExpression(), !1264)
  %96 = getelementptr inbounds nuw i8, ptr %90, i32 3, !dbg !1265
  %97 = load i8, ptr %96, align 1, !dbg !1265, !tbaa !131
    #dbg_value(i8 %97, !1165, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1260)
    #dbg_value(i32 4, !122, !DIExpression(), !1264)
  %98 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1266
  %99 = load ptr, ptr %98, align 4, !dbg !1266, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1206)
    #dbg_value(ptr %99, !115, !DIExpression(), !1206)
    #dbg_value(i32 4, !116, !DIExpression(), !1206)
    #dbg_value(ptr undef, !117, !DIExpression(), !1206)
    #dbg_value(ptr %99, !119, !DIExpression(), !1206)
    #dbg_value(i32 0, !122, !DIExpression(), !1267)
  %100 = load i8, ptr %99, align 1, !dbg !1268, !tbaa !131
    #dbg_value(i8 %100, !1166, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1260)
    #dbg_value(i32 1, !122, !DIExpression(), !1267)
  %101 = getelementptr inbounds nuw i8, ptr %99, i32 1, !dbg !1268
  %102 = load i8, ptr %101, align 1, !dbg !1268, !tbaa !131
    #dbg_value(i8 %102, !1166, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1260)
    #dbg_value(i32 2, !122, !DIExpression(), !1267)
  %103 = getelementptr inbounds nuw i8, ptr %99, i32 2, !dbg !1268
  %104 = load i8, ptr %103, align 1, !dbg !1268, !tbaa !131
    #dbg_value(i8 %104, !1166, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1260)
    #dbg_value(i32 3, !122, !DIExpression(), !1267)
  %105 = getelementptr inbounds nuw i8, ptr %99, i32 3, !dbg !1268
  %106 = load i8, ptr %105, align 1, !dbg !1268, !tbaa !131
    #dbg_value(i8 %106, !1166, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1260)
    #dbg_value(i32 4, !122, !DIExpression(), !1267)
  %107 = zext i8 %97 to i32, !dbg !1269
  %108 = shl nuw i32 %107, 24, !dbg !1269
  %109 = zext i8 %95 to i32, !dbg !1269
  %110 = shl nuw nsw i32 %109, 16, !dbg !1269
  %111 = or disjoint i32 %108, %110, !dbg !1269
  %112 = zext i8 %93 to i32, !dbg !1269
  %113 = shl nuw nsw i32 %112, 8, !dbg !1269
  %114 = or disjoint i32 %111, %113, !dbg !1269
  %115 = zext i8 %91 to i32, !dbg !1269
  %116 = or disjoint i32 %114, %115, !dbg !1269
  %117 = zext i8 %106 to i32, !dbg !1270
  %118 = shl nuw i32 %117, 24, !dbg !1270
  %119 = zext i8 %104 to i32, !dbg !1270
  %120 = shl nuw nsw i32 %119, 16, !dbg !1270
  %121 = or disjoint i32 %118, %120, !dbg !1270
  %122 = zext i8 %102 to i32, !dbg !1270
  %123 = shl nuw nsw i32 %122, 8, !dbg !1270
  %124 = or disjoint i32 %121, %123, !dbg !1270
  %125 = zext i8 %100 to i32, !dbg !1270
  %126 = or disjoint i32 %124, %125, !dbg !1270
    #dbg_value(i32 poison, !352, !DIExpression(), !1272)
    #dbg_value(i32 poison, !353, !DIExpression(), !1272)
    #dbg_value(i32 %116, !354, !DIExpression(), !1272)
    #dbg_value(i32 %126, !355, !DIExpression(), !1272)
    #dbg_value(i32 poison, !356, !DIExpression(), !1272)
    #dbg_value(i32 %126, !357, !DIExpression(), !1272)
  %127 = icmp eq i32 %126, 0, !dbg !1270
  br i1 %127, label %169, label %128, !dbg !1270

128:                                              ; preds = %88
  %129 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1273
  %130 = load ptr, ptr %129, align 4, !dbg !1273, !tbaa !629
    #dbg_value(ptr %130, !115, !DIExpression(), !1202)
    #dbg_value(ptr %130, !119, !DIExpression(), !1202)
  %131 = getelementptr inbounds nuw i8, ptr %130, i32 3, !dbg !1274
  %132 = load i8, ptr %131, align 1, !dbg !1274, !tbaa !131
    #dbg_value(i8 %132, !1164, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1260)
  %133 = getelementptr inbounds nuw i8, ptr %130, i32 2, !dbg !1274
  %134 = load i8, ptr %133, align 1, !dbg !1274, !tbaa !131
    #dbg_value(i8 %134, !1164, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1260)
  %135 = getelementptr inbounds nuw i8, ptr %130, i32 1, !dbg !1274
  %136 = load i8, ptr %135, align 1, !dbg !1274, !tbaa !131
    #dbg_value(i8 %136, !1164, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1260)
  %137 = load i8, ptr %130, align 1, !dbg !1274, !tbaa !131
    #dbg_value(i8 %137, !1164, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1260)
  %138 = load ptr, ptr %1, align 4, !dbg !1275, !tbaa !629
    #dbg_value(ptr %138, !115, !DIExpression(), !1200)
    #dbg_value(ptr %138, !119, !DIExpression(), !1200)
  %139 = getelementptr inbounds nuw i8, ptr %138, i32 3, !dbg !1276
  %140 = load i8, ptr %139, align 1, !dbg !1276, !tbaa !131
    #dbg_value(i8 %140, !1162, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1260)
  %141 = getelementptr inbounds nuw i8, ptr %138, i32 2, !dbg !1276
  %142 = load i8, ptr %141, align 1, !dbg !1276, !tbaa !131
    #dbg_value(i8 %142, !1162, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1260)
  %143 = getelementptr inbounds nuw i8, ptr %138, i32 1, !dbg !1276
  %144 = load i8, ptr %143, align 1, !dbg !1276, !tbaa !131
    #dbg_value(i8 %144, !1162, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1260)
  %145 = load i8, ptr %138, align 1, !dbg !1276, !tbaa !131
    #dbg_value(i8 %145, !1162, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1260)
  %146 = zext i8 %132 to i32, !dbg !1277
  %147 = shl nuw i32 %146, 24, !dbg !1277
  %148 = zext i8 %134 to i32, !dbg !1277
  %149 = shl nuw nsw i32 %148, 16, !dbg !1277
  %150 = or disjoint i32 %147, %149, !dbg !1277
  %151 = zext i8 %136 to i32, !dbg !1277
  %152 = shl nuw nsw i32 %151, 8, !dbg !1277
  %153 = or disjoint i32 %150, %152, !dbg !1277
  %154 = zext i8 %137 to i32, !dbg !1277
  %155 = or disjoint i32 %153, %154, !dbg !1277
    #dbg_value(i32 %155, !353, !DIExpression(), !1272)
    #dbg_value(i32 %155, !356, !DIExpression(), !1272)
  %156 = zext i8 %140 to i32, !dbg !1278
  %157 = shl nuw i32 %156, 24, !dbg !1278
  %158 = zext i8 %142 to i32, !dbg !1278
  %159 = shl nuw nsw i32 %158, 16, !dbg !1278
  %160 = or disjoint i32 %157, %159, !dbg !1278
  %161 = zext i8 %144 to i32, !dbg !1278
  %162 = shl nuw nsw i32 %161, 8, !dbg !1278
  %163 = or disjoint i32 %160, %162, !dbg !1278
  %164 = zext i8 %145 to i32, !dbg !1278
  %165 = or disjoint i32 %163, %164, !dbg !1278
    #dbg_value(i32 %165, !352, !DIExpression(), !1272)
  %166 = udiv i32 %155, %126, !dbg !1278
    #dbg_value(i32 %166, !358, !DIExpression(), !1272)
    #dbg_value(i32 %166, !359, !DIExpression(), !1272)
    #dbg_value(i32 %165, !360, !DIExpression(), !1272)
    #dbg_value(i32 %126, !361, !DIExpression(), !1272)
  %167 = urem i32 %165, %126, !dbg !1279
    #dbg_value(i32 %167, !362, !DIExpression(), !1272)
  %168 = add i32 %167, %166
  br label %169

169:                                              ; preds = %88, %128
  %170 = phi i32 [ %168, %128 ], [ 0, %88 ], !dbg !1280
    #dbg_value(i32 poison, !362, !DIExpression(), !1272)
    #dbg_value(i32 %170, !363, !DIExpression(), !1272)
  %171 = add i32 %170, %116, !dbg !1281
    #dbg_value(i32 %171, !1167, !DIExpression(), !1260)
  br label %475

172:                                              ; preds = %3
  %173 = load ptr, ptr %1, align 4, !dbg !1282, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1208)
    #dbg_value(ptr %173, !115, !DIExpression(), !1208)
    #dbg_value(i32 4, !116, !DIExpression(), !1208)
    #dbg_value(ptr undef, !117, !DIExpression(), !1208)
    #dbg_value(ptr %173, !119, !DIExpression(), !1208)
    #dbg_value(i32 0, !122, !DIExpression(), !1283)
  %174 = load i8, ptr %173, align 1, !dbg !1284, !tbaa !131
    #dbg_value(i8 %174, !1168, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1285)
    #dbg_value(i32 1, !122, !DIExpression(), !1283)
  %175 = getelementptr inbounds nuw i8, ptr %173, i32 1, !dbg !1284
  %176 = load i8, ptr %175, align 1, !dbg !1284, !tbaa !131
    #dbg_value(i8 %176, !1168, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1285)
    #dbg_value(i32 2, !122, !DIExpression(), !1283)
  %177 = getelementptr inbounds nuw i8, ptr %173, i32 2, !dbg !1284
  %178 = load i8, ptr %177, align 1, !dbg !1284, !tbaa !131
    #dbg_value(i8 %178, !1168, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1285)
    #dbg_value(i32 3, !122, !DIExpression(), !1283)
  %179 = getelementptr inbounds nuw i8, ptr %173, i32 3, !dbg !1284
  %180 = load i8, ptr %179, align 1, !dbg !1284, !tbaa !131
    #dbg_value(i8 %180, !1168, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1285)
    #dbg_value(i32 4, !122, !DIExpression(), !1283)
  %181 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1286
  %182 = load ptr, ptr %181, align 4, !dbg !1286, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1210)
    #dbg_value(ptr %182, !115, !DIExpression(), !1210)
    #dbg_value(i32 4, !116, !DIExpression(), !1210)
    #dbg_value(ptr undef, !117, !DIExpression(), !1210)
    #dbg_value(ptr %182, !119, !DIExpression(), !1210)
    #dbg_value(i32 0, !122, !DIExpression(), !1287)
  %183 = load i8, ptr %182, align 1, !dbg !1288, !tbaa !131
    #dbg_value(i8 %183, !1170, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1285)
    #dbg_value(i32 1, !122, !DIExpression(), !1287)
  %184 = getelementptr inbounds nuw i8, ptr %182, i32 1, !dbg !1288
  %185 = load i8, ptr %184, align 1, !dbg !1288, !tbaa !131
    #dbg_value(i8 %185, !1170, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1285)
    #dbg_value(i32 2, !122, !DIExpression(), !1287)
  %186 = getelementptr inbounds nuw i8, ptr %182, i32 2, !dbg !1288
  %187 = load i8, ptr %186, align 1, !dbg !1288, !tbaa !131
    #dbg_value(i8 %187, !1170, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1285)
    #dbg_value(i32 3, !122, !DIExpression(), !1287)
  %188 = getelementptr inbounds nuw i8, ptr %182, i32 3, !dbg !1288
  %189 = load i8, ptr %188, align 1, !dbg !1288, !tbaa !131
    #dbg_value(i8 %189, !1170, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1285)
    #dbg_value(i32 4, !122, !DIExpression(), !1287)
  %190 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1289
  %191 = load ptr, ptr %190, align 4, !dbg !1289, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1212)
    #dbg_value(ptr %191, !115, !DIExpression(), !1212)
    #dbg_value(i32 4, !116, !DIExpression(), !1212)
    #dbg_value(ptr undef, !117, !DIExpression(), !1212)
    #dbg_value(ptr %191, !119, !DIExpression(), !1212)
    #dbg_value(i32 0, !122, !DIExpression(), !1290)
  %192 = load i8, ptr %191, align 1, !dbg !1291, !tbaa !131
    #dbg_value(i8 %192, !1171, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1285)
    #dbg_value(i32 1, !122, !DIExpression(), !1290)
  %193 = getelementptr inbounds nuw i8, ptr %191, i32 1, !dbg !1291
  %194 = load i8, ptr %193, align 1, !dbg !1291, !tbaa !131
    #dbg_value(i8 %194, !1171, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1285)
    #dbg_value(i32 2, !122, !DIExpression(), !1290)
  %195 = getelementptr inbounds nuw i8, ptr %191, i32 2, !dbg !1291
  %196 = load i8, ptr %195, align 1, !dbg !1291, !tbaa !131
    #dbg_value(i8 %196, !1171, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1285)
    #dbg_value(i32 3, !122, !DIExpression(), !1290)
  %197 = getelementptr inbounds nuw i8, ptr %191, i32 3, !dbg !1291
  %198 = load i8, ptr %197, align 1, !dbg !1291, !tbaa !131
    #dbg_value(i8 %198, !1171, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1285)
    #dbg_value(i32 4, !122, !DIExpression(), !1290)
  %199 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1292
  %200 = load ptr, ptr %199, align 4, !dbg !1292, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1214)
    #dbg_value(ptr %200, !115, !DIExpression(), !1214)
    #dbg_value(i32 4, !116, !DIExpression(), !1214)
    #dbg_value(ptr undef, !117, !DIExpression(), !1214)
    #dbg_value(ptr %200, !119, !DIExpression(), !1214)
    #dbg_value(i32 0, !122, !DIExpression(), !1293)
  %201 = load i8, ptr %200, align 1, !dbg !1294, !tbaa !131
    #dbg_value(i8 %201, !1172, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1285)
    #dbg_value(i32 1, !122, !DIExpression(), !1293)
  %202 = getelementptr inbounds nuw i8, ptr %200, i32 1, !dbg !1294
  %203 = load i8, ptr %202, align 1, !dbg !1294, !tbaa !131
    #dbg_value(i8 %203, !1172, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1285)
    #dbg_value(i32 2, !122, !DIExpression(), !1293)
  %204 = getelementptr inbounds nuw i8, ptr %200, i32 2, !dbg !1294
  %205 = load i8, ptr %204, align 1, !dbg !1294, !tbaa !131
    #dbg_value(i8 %205, !1172, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1285)
    #dbg_value(i32 3, !122, !DIExpression(), !1293)
  %206 = getelementptr inbounds nuw i8, ptr %200, i32 3, !dbg !1294
  %207 = load i8, ptr %206, align 1, !dbg !1294, !tbaa !131
    #dbg_value(i8 %207, !1172, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1285)
    #dbg_value(i32 4, !122, !DIExpression(), !1293)
  %208 = zext i8 %180 to i32, !dbg !1295
  %209 = shl nuw i32 %208, 24, !dbg !1295
  %210 = zext i8 %178 to i32, !dbg !1295
  %211 = shl nuw nsw i32 %210, 16, !dbg !1295
  %212 = or disjoint i32 %209, %211, !dbg !1295
  %213 = zext i8 %176 to i32, !dbg !1295
  %214 = shl nuw nsw i32 %213, 8, !dbg !1295
  %215 = or disjoint i32 %212, %214, !dbg !1295
  %216 = zext i8 %174 to i32, !dbg !1295
  %217 = or disjoint i32 %215, %216, !dbg !1295
  %218 = zext i8 %189 to i32, !dbg !1296
  %219 = shl nuw i32 %218, 24, !dbg !1296
  %220 = zext i8 %187 to i32, !dbg !1296
  %221 = shl nuw nsw i32 %220, 16, !dbg !1296
  %222 = or disjoint i32 %219, %221, !dbg !1296
  %223 = zext i8 %185 to i32, !dbg !1296
  %224 = shl nuw nsw i32 %223, 8, !dbg !1296
  %225 = or disjoint i32 %222, %224, !dbg !1296
  %226 = zext i8 %183 to i32, !dbg !1296
  %227 = or disjoint i32 %225, %226, !dbg !1296
  %228 = zext i8 %198 to i32, !dbg !1297
  %229 = shl nuw i32 %228, 24, !dbg !1297
  %230 = zext i8 %196 to i32, !dbg !1297
  %231 = shl nuw nsw i32 %230, 16, !dbg !1297
  %232 = or disjoint i32 %229, %231, !dbg !1297
  %233 = zext i8 %194 to i32, !dbg !1297
  %234 = shl nuw nsw i32 %233, 8, !dbg !1297
  %235 = or disjoint i32 %232, %234, !dbg !1297
  %236 = zext i8 %192 to i32, !dbg !1297
  %237 = or disjoint i32 %235, %236, !dbg !1297
  %238 = zext i8 %207 to i32, !dbg !1298
  %239 = shl nuw i32 %238, 24, !dbg !1298
  %240 = zext i8 %205 to i32, !dbg !1298
  %241 = shl nuw nsw i32 %240, 16, !dbg !1298
  %242 = or disjoint i32 %239, %241, !dbg !1298
  %243 = zext i8 %203 to i32, !dbg !1298
  %244 = shl nuw nsw i32 %243, 8, !dbg !1298
  %245 = or disjoint i32 %242, %244, !dbg !1298
  %246 = zext i8 %201 to i32, !dbg !1298
  %247 = or disjoint i32 %245, %246, !dbg !1298
    #dbg_value(i32 %217, !377, !DIExpression(), !1300)
    #dbg_value(i32 %227, !378, !DIExpression(), !1300)
    #dbg_value(i32 %237, !379, !DIExpression(), !1300)
    #dbg_value(i32 %247, !380, !DIExpression(), !1300)
    #dbg_value(i32 %217, !381, !DIExpression(), !1300)
    #dbg_value(i32 %227, !382, !DIExpression(), !1300)
    #dbg_value(i32 %237, !383, !DIExpression(), !1300)
    #dbg_value(i32 %247, !384, !DIExpression(), !1300)
    #dbg_value(i32 %217, !385, !DIExpression(), !1300)
  %248 = icmp ult i32 %217, %237, !dbg !1298
  %249 = add i32 %247, %227, !dbg !1301
  %250 = mul i32 %227, 3, !dbg !1301
  %251 = select i1 %248, i32 %249, i32 %250, !dbg !1301
    #dbg_value(i32 %251, !386, !DIExpression(), !1300)
    #dbg_value(i32 %251, !1173, !DIExpression(), !1285)
  br label %475

252:                                              ; preds = %3
  %253 = load ptr, ptr %1, align 4, !dbg !1302, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1216)
    #dbg_value(ptr %253, !115, !DIExpression(), !1216)
    #dbg_value(i32 4, !116, !DIExpression(), !1216)
    #dbg_value(ptr undef, !117, !DIExpression(), !1216)
    #dbg_value(ptr %253, !119, !DIExpression(), !1216)
    #dbg_value(i32 0, !122, !DIExpression(), !1303)
  %254 = load i8, ptr %253, align 1, !dbg !1304, !tbaa !131
    #dbg_value(i8 %254, !1174, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1305)
    #dbg_value(i32 1, !122, !DIExpression(), !1303)
  %255 = getelementptr inbounds nuw i8, ptr %253, i32 1, !dbg !1304
  %256 = load i8, ptr %255, align 1, !dbg !1304, !tbaa !131
    #dbg_value(i8 %256, !1174, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1305)
    #dbg_value(i32 2, !122, !DIExpression(), !1303)
  %257 = getelementptr inbounds nuw i8, ptr %253, i32 2, !dbg !1304
  %258 = load i8, ptr %257, align 1, !dbg !1304, !tbaa !131
    #dbg_value(i8 %258, !1174, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1305)
    #dbg_value(i32 3, !122, !DIExpression(), !1303)
  %259 = getelementptr inbounds nuw i8, ptr %253, i32 3, !dbg !1304
  %260 = load i8, ptr %259, align 1, !dbg !1304, !tbaa !131
    #dbg_value(i8 %260, !1174, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1305)
    #dbg_value(i32 4, !122, !DIExpression(), !1303)
  %261 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1306
  %262 = load ptr, ptr %261, align 4, !dbg !1306, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1218)
    #dbg_value(ptr %262, !115, !DIExpression(), !1218)
    #dbg_value(i32 4, !116, !DIExpression(), !1218)
    #dbg_value(ptr undef, !117, !DIExpression(), !1218)
    #dbg_value(ptr %262, !119, !DIExpression(), !1218)
    #dbg_value(i32 0, !122, !DIExpression(), !1307)
  %263 = load i8, ptr %262, align 1, !dbg !1308, !tbaa !131
    #dbg_value(i8 %263, !1176, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1305)
    #dbg_value(i32 1, !122, !DIExpression(), !1307)
  %264 = getelementptr inbounds nuw i8, ptr %262, i32 1, !dbg !1308
  %265 = load i8, ptr %264, align 1, !dbg !1308, !tbaa !131
    #dbg_value(i8 %265, !1176, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1305)
    #dbg_value(i32 2, !122, !DIExpression(), !1307)
  %266 = getelementptr inbounds nuw i8, ptr %262, i32 2, !dbg !1308
  %267 = load i8, ptr %266, align 1, !dbg !1308, !tbaa !131
    #dbg_value(i8 %267, !1176, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1305)
    #dbg_value(i32 3, !122, !DIExpression(), !1307)
  %268 = getelementptr inbounds nuw i8, ptr %262, i32 3, !dbg !1308
  %269 = load i8, ptr %268, align 1, !dbg !1308, !tbaa !131
    #dbg_value(i8 %269, !1176, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1305)
    #dbg_value(i32 4, !122, !DIExpression(), !1307)
  %270 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1309
  %271 = load ptr, ptr %270, align 4, !dbg !1309, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1220)
    #dbg_value(ptr %271, !115, !DIExpression(), !1220)
    #dbg_value(i32 4, !116, !DIExpression(), !1220)
    #dbg_value(ptr undef, !117, !DIExpression(), !1220)
    #dbg_value(ptr %271, !119, !DIExpression(), !1220)
    #dbg_value(i32 0, !122, !DIExpression(), !1310)
  %272 = load i8, ptr %271, align 1, !dbg !1311, !tbaa !131
    #dbg_value(i8 %272, !1177, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1305)
    #dbg_value(i32 1, !122, !DIExpression(), !1310)
  %273 = getelementptr inbounds nuw i8, ptr %271, i32 1, !dbg !1311
  %274 = load i8, ptr %273, align 1, !dbg !1311, !tbaa !131
    #dbg_value(i8 %274, !1177, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1305)
    #dbg_value(i32 2, !122, !DIExpression(), !1310)
  %275 = getelementptr inbounds nuw i8, ptr %271, i32 2, !dbg !1311
  %276 = load i8, ptr %275, align 1, !dbg !1311, !tbaa !131
    #dbg_value(i8 %276, !1177, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1305)
    #dbg_value(i32 3, !122, !DIExpression(), !1310)
  %277 = getelementptr inbounds nuw i8, ptr %271, i32 3, !dbg !1311
  %278 = load i8, ptr %277, align 1, !dbg !1311, !tbaa !131
    #dbg_value(i8 %278, !1177, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1305)
    #dbg_value(i32 4, !122, !DIExpression(), !1310)
  %279 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1312
  %280 = load ptr, ptr %279, align 4, !dbg !1312, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1222)
    #dbg_value(ptr %280, !115, !DIExpression(), !1222)
    #dbg_value(i32 4, !116, !DIExpression(), !1222)
    #dbg_value(ptr undef, !117, !DIExpression(), !1222)
    #dbg_value(ptr %280, !119, !DIExpression(), !1222)
    #dbg_value(i32 0, !122, !DIExpression(), !1313)
  %281 = load i8, ptr %280, align 1, !dbg !1314, !tbaa !131
    #dbg_value(i8 %281, !1178, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1305)
    #dbg_value(i32 1, !122, !DIExpression(), !1313)
  %282 = getelementptr inbounds nuw i8, ptr %280, i32 1, !dbg !1314
  %283 = load i8, ptr %282, align 1, !dbg !1314, !tbaa !131
    #dbg_value(i8 %283, !1178, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1305)
    #dbg_value(i32 2, !122, !DIExpression(), !1313)
  %284 = getelementptr inbounds nuw i8, ptr %280, i32 2, !dbg !1314
  %285 = load i8, ptr %284, align 1, !dbg !1314, !tbaa !131
    #dbg_value(i8 %285, !1178, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1305)
    #dbg_value(i32 3, !122, !DIExpression(), !1313)
  %286 = getelementptr inbounds nuw i8, ptr %280, i32 3, !dbg !1314
  %287 = load i8, ptr %286, align 1, !dbg !1314, !tbaa !131
    #dbg_value(i8 %287, !1178, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1305)
    #dbg_value(i32 4, !122, !DIExpression(), !1313)
  %288 = zext i8 %260 to i32, !dbg !1315
  %289 = shl nuw i32 %288, 24, !dbg !1315
  %290 = zext i8 %258 to i32, !dbg !1315
  %291 = shl nuw nsw i32 %290, 16, !dbg !1315
  %292 = or disjoint i32 %289, %291, !dbg !1315
  %293 = zext i8 %256 to i32, !dbg !1315
  %294 = shl nuw nsw i32 %293, 8, !dbg !1315
  %295 = or disjoint i32 %292, %294, !dbg !1315
  %296 = zext i8 %254 to i32, !dbg !1315
  %297 = or disjoint i32 %295, %296, !dbg !1315
  %298 = zext i8 %269 to i32, !dbg !1316
  %299 = shl nuw i32 %298, 24, !dbg !1316
  %300 = zext i8 %267 to i32, !dbg !1316
  %301 = shl nuw nsw i32 %300, 16, !dbg !1316
  %302 = or disjoint i32 %299, %301, !dbg !1316
  %303 = zext i8 %265 to i32, !dbg !1316
  %304 = shl nuw nsw i32 %303, 8, !dbg !1316
  %305 = or disjoint i32 %302, %304, !dbg !1316
  %306 = zext i8 %263 to i32, !dbg !1316
  %307 = or disjoint i32 %305, %306, !dbg !1316
  %308 = zext i8 %278 to i32, !dbg !1317
  %309 = shl nuw i32 %308, 24, !dbg !1317
  %310 = zext i8 %276 to i32, !dbg !1317
  %311 = shl nuw nsw i32 %310, 16, !dbg !1317
  %312 = or disjoint i32 %309, %311, !dbg !1317
  %313 = zext i8 %274 to i32, !dbg !1317
  %314 = shl nuw nsw i32 %313, 8, !dbg !1317
  %315 = or disjoint i32 %312, %314, !dbg !1317
  %316 = zext i8 %272 to i32, !dbg !1317
  %317 = or disjoint i32 %315, %316, !dbg !1317
  %318 = zext i8 %287 to i32, !dbg !1318
  %319 = shl nuw i32 %318, 24, !dbg !1318
  %320 = zext i8 %285 to i32, !dbg !1318
  %321 = shl nuw nsw i32 %320, 16, !dbg !1318
  %322 = or disjoint i32 %319, %321, !dbg !1318
  %323 = zext i8 %283 to i32, !dbg !1318
  %324 = shl nuw nsw i32 %323, 8, !dbg !1318
  %325 = or disjoint i32 %322, %324, !dbg !1318
  %326 = zext i8 %281 to i32, !dbg !1318
  %327 = or disjoint i32 %325, %326, !dbg !1318
    #dbg_value(i32 %297, !398, !DIExpression(), !1320)
    #dbg_value(i32 %307, !399, !DIExpression(), !1320)
    #dbg_value(i32 %317, !400, !DIExpression(), !1320)
    #dbg_value(i32 %327, !401, !DIExpression(), !1320)
    #dbg_value(i32 %297, !402, !DIExpression(), !1320)
  %328 = icmp ult i32 %297, %317, !dbg !1318
  %329 = add i32 %327, %307, !dbg !1321
  %330 = mul i32 %307, 3, !dbg !1321
  %331 = select i1 %328, i32 %329, i32 %330, !dbg !1321
    #dbg_value(i32 %331, !403, !DIExpression(), !1320)
    #dbg_value(i32 %331, !1179, !DIExpression(), !1305)
  br label %475

332:                                              ; preds = %3
  %333 = load ptr, ptr %1, align 4, !dbg !1322, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1224)
    #dbg_value(ptr %333, !115, !DIExpression(), !1224)
    #dbg_value(i32 4, !116, !DIExpression(), !1224)
    #dbg_value(ptr undef, !117, !DIExpression(), !1224)
    #dbg_value(ptr %333, !119, !DIExpression(), !1224)
    #dbg_value(i32 0, !122, !DIExpression(), !1323)
  %334 = load i8, ptr %333, align 1, !dbg !1324, !tbaa !131
    #dbg_value(i8 %334, !1180, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1325)
    #dbg_value(i32 1, !122, !DIExpression(), !1323)
  %335 = getelementptr inbounds nuw i8, ptr %333, i32 1, !dbg !1324
  %336 = load i8, ptr %335, align 1, !dbg !1324, !tbaa !131
    #dbg_value(i8 %336, !1180, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1325)
    #dbg_value(i32 2, !122, !DIExpression(), !1323)
  %337 = getelementptr inbounds nuw i8, ptr %333, i32 2, !dbg !1324
  %338 = load i8, ptr %337, align 1, !dbg !1324, !tbaa !131
    #dbg_value(i8 %338, !1180, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1325)
    #dbg_value(i32 3, !122, !DIExpression(), !1323)
  %339 = getelementptr inbounds nuw i8, ptr %333, i32 3, !dbg !1324
  %340 = load i8, ptr %339, align 1, !dbg !1324, !tbaa !131
    #dbg_value(i8 %340, !1180, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1325)
    #dbg_value(i32 4, !122, !DIExpression(), !1323)
  %341 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1326
  %342 = load ptr, ptr %341, align 4, !dbg !1326, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1226)
    #dbg_value(ptr %342, !115, !DIExpression(), !1226)
    #dbg_value(i32 4, !116, !DIExpression(), !1226)
    #dbg_value(ptr undef, !117, !DIExpression(), !1226)
    #dbg_value(ptr %342, !119, !DIExpression(), !1226)
    #dbg_value(i32 0, !122, !DIExpression(), !1327)
  %343 = load i8, ptr %342, align 1, !dbg !1328, !tbaa !131
    #dbg_value(i8 %343, !1182, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1325)
    #dbg_value(i32 1, !122, !DIExpression(), !1327)
  %344 = getelementptr inbounds nuw i8, ptr %342, i32 1, !dbg !1328
  %345 = load i8, ptr %344, align 1, !dbg !1328, !tbaa !131
    #dbg_value(i8 %345, !1182, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1325)
    #dbg_value(i32 2, !122, !DIExpression(), !1327)
  %346 = getelementptr inbounds nuw i8, ptr %342, i32 2, !dbg !1328
  %347 = load i8, ptr %346, align 1, !dbg !1328, !tbaa !131
    #dbg_value(i8 %347, !1182, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1325)
    #dbg_value(i32 3, !122, !DIExpression(), !1327)
  %348 = getelementptr inbounds nuw i8, ptr %342, i32 3, !dbg !1328
  %349 = load i8, ptr %348, align 1, !dbg !1328, !tbaa !131
    #dbg_value(i8 %349, !1182, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1325)
    #dbg_value(i32 4, !122, !DIExpression(), !1327)
    #dbg_value(i32 poison, !122, !DIExpression(), !1329)
  %350 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1331
  %351 = load ptr, ptr %350, align 4, !dbg !1331, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1228)
    #dbg_value(ptr %351, !115, !DIExpression(), !1228)
    #dbg_value(i32 4, !116, !DIExpression(), !1228)
    #dbg_value(ptr undef, !117, !DIExpression(), !1228)
    #dbg_value(ptr %351, !119, !DIExpression(), !1228)
    #dbg_value(i32 0, !122, !DIExpression(), !1332)
  %352 = load i8, ptr %351, align 1, !dbg !1333, !tbaa !131
    #dbg_value(i8 %352, !1184, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1325)
    #dbg_value(i32 1, !122, !DIExpression(), !1332)
  %353 = getelementptr inbounds nuw i8, ptr %351, i32 1, !dbg !1333
  %354 = load i8, ptr %353, align 1, !dbg !1333, !tbaa !131
    #dbg_value(i8 %354, !1184, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1325)
    #dbg_value(i32 2, !122, !DIExpression(), !1332)
  %355 = getelementptr inbounds nuw i8, ptr %351, i32 2, !dbg !1333
  %356 = load i8, ptr %355, align 1, !dbg !1333, !tbaa !131
    #dbg_value(i8 %356, !1184, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1325)
    #dbg_value(i32 3, !122, !DIExpression(), !1332)
  %357 = getelementptr inbounds nuw i8, ptr %351, i32 3, !dbg !1333
  %358 = load i8, ptr %357, align 1, !dbg !1333, !tbaa !131
    #dbg_value(i8 %358, !1184, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1325)
    #dbg_value(i32 4, !122, !DIExpression(), !1332)
  %359 = zext i8 %340 to i32, !dbg !1334
  %360 = shl nuw i32 %359, 24, !dbg !1334
  %361 = zext i8 %338 to i32, !dbg !1334
  %362 = shl nuw nsw i32 %361, 16, !dbg !1334
  %363 = or disjoint i32 %360, %362, !dbg !1334
  %364 = zext i8 %336 to i32, !dbg !1334
  %365 = shl nuw nsw i32 %364, 8, !dbg !1334
  %366 = or disjoint i32 %363, %365, !dbg !1334
  %367 = zext i8 %334 to i32, !dbg !1334
  %368 = or disjoint i32 %366, %367, !dbg !1334
  %369 = zext i8 %349 to i32, !dbg !1335
  %370 = shl nuw i32 %369, 24, !dbg !1335
  %371 = zext i8 %347 to i32, !dbg !1335
  %372 = shl nuw nsw i32 %371, 16, !dbg !1335
  %373 = or disjoint i32 %370, %372, !dbg !1335
  %374 = zext i8 %345 to i32, !dbg !1335
  %375 = shl nuw nsw i32 %374, 8, !dbg !1335
  %376 = or disjoint i32 %373, %375, !dbg !1335
  %377 = zext i8 %343 to i32, !dbg !1335
  %378 = or disjoint i32 %376, %377, !dbg !1335
  %379 = zext i8 %358 to i32, !dbg !1336
  %380 = shl nuw i32 %379, 24, !dbg !1336
  %381 = zext i8 %356 to i32, !dbg !1336
  %382 = shl nuw nsw i32 %381, 16, !dbg !1336
  %383 = or disjoint i32 %380, %382, !dbg !1336
  %384 = zext i8 %354 to i32, !dbg !1336
  %385 = shl nuw nsw i32 %384, 8, !dbg !1336
  %386 = or disjoint i32 %383, %385, !dbg !1336
  %387 = zext i8 %352 to i32, !dbg !1336
  %388 = or disjoint i32 %386, %387, !dbg !1336
    #dbg_value(i32 %368, !415, !DIExpression(), !1338)
    #dbg_value(i32 %378, !416, !DIExpression(), !1338)
    #dbg_value(i32 poison, !417, !DIExpression(), !1338)
    #dbg_value(i32 %388, !418, !DIExpression(), !1338)
    #dbg_value(i32 %368, !419, !DIExpression(), !1338)
    #dbg_value(i32 %378, !420, !DIExpression(), !1338)
    #dbg_value(i32 poison, !421, !DIExpression(), !1338)
    #dbg_value(i32 %388, !422, !DIExpression(), !1338)
    #dbg_value(i32 %368, !423, !DIExpression(), !1338)
  %389 = icmp ult i32 %368, %378, !dbg !1336
  %390 = icmp eq i32 %388, 0, !dbg !1339
  br i1 %389, label %391, label %397, !dbg !1340

391:                                              ; preds = %332
    #dbg_value(i32 %368, !425, !DIExpression(), !1341)
    #dbg_value(i32 %388, !428, !DIExpression(), !1341)
  br i1 %390, label %394, label %392, !dbg !1342

392:                                              ; preds = %391
  %393 = udiv i32 %368, %388, !dbg !1343
    #dbg_value(i32 %393, !429, !DIExpression(), !1341)
  br label %394

394:                                              ; preds = %392, %391
  %395 = phi i32 [ %393, %392 ], [ 0, %391 ], !dbg !1344
    #dbg_value(i32 %395, !429, !DIExpression(), !1341)
    #dbg_value(i32 %395, !430, !DIExpression(), !1341)
  %396 = add i32 %395, %378, !dbg !1345
    #dbg_value(i32 %396, !424, !DIExpression(), !1338)
  br label %475, !dbg !1346

397:                                              ; preds = %332
    #dbg_value(i32 %378, !431, !DIExpression(), !1347)
    #dbg_value(i32 %388, !433, !DIExpression(), !1347)
  br i1 %390, label %400, label %398, !dbg !1348

398:                                              ; preds = %397
  %399 = urem i32 %378, %388, !dbg !1349
    #dbg_value(i32 %399, !434, !DIExpression(), !1347)
  br label %400

400:                                              ; preds = %398, %397
  %401 = phi i32 [ %399, %398 ], [ 0, %397 ], !dbg !1350
    #dbg_value(i32 %401, !434, !DIExpression(), !1347)
    #dbg_value(i32 %401, !435, !DIExpression(), !1347)
  %402 = add i32 %401, %368, !dbg !1351
    #dbg_value(i32 %402, !424, !DIExpression(), !1338)
  br label %475

403:                                              ; preds = %3
  %404 = load ptr, ptr %1, align 4, !dbg !1352, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1230)
    #dbg_value(ptr %404, !115, !DIExpression(), !1230)
    #dbg_value(i32 4, !116, !DIExpression(), !1230)
    #dbg_value(ptr undef, !117, !DIExpression(), !1230)
    #dbg_value(ptr %404, !119, !DIExpression(), !1230)
    #dbg_value(i32 0, !122, !DIExpression(), !1353)
  %405 = load i8, ptr %404, align 1, !dbg !1354, !tbaa !131
    #dbg_value(i8 %405, !1186, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1355)
    #dbg_value(i32 1, !122, !DIExpression(), !1353)
  %406 = getelementptr inbounds nuw i8, ptr %404, i32 1, !dbg !1354
  %407 = load i8, ptr %406, align 1, !dbg !1354, !tbaa !131
    #dbg_value(i8 %407, !1186, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1355)
    #dbg_value(i32 2, !122, !DIExpression(), !1353)
  %408 = getelementptr inbounds nuw i8, ptr %404, i32 2, !dbg !1354
  %409 = load i8, ptr %408, align 1, !dbg !1354, !tbaa !131
    #dbg_value(i8 %409, !1186, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1355)
    #dbg_value(i32 3, !122, !DIExpression(), !1353)
  %410 = getelementptr inbounds nuw i8, ptr %404, i32 3, !dbg !1354
  %411 = load i8, ptr %410, align 1, !dbg !1354, !tbaa !131
    #dbg_value(i8 %411, !1186, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1355)
    #dbg_value(i32 4, !122, !DIExpression(), !1353)
  %412 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1356
  %413 = load ptr, ptr %412, align 4, !dbg !1356, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1232)
    #dbg_value(ptr %413, !115, !DIExpression(), !1232)
    #dbg_value(i32 4, !116, !DIExpression(), !1232)
    #dbg_value(ptr undef, !117, !DIExpression(), !1232)
    #dbg_value(ptr %413, !119, !DIExpression(), !1232)
    #dbg_value(i32 0, !122, !DIExpression(), !1357)
  %414 = load i8, ptr %413, align 1, !dbg !1358, !tbaa !131
    #dbg_value(i8 %414, !1188, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1355)
    #dbg_value(i32 1, !122, !DIExpression(), !1357)
  %415 = getelementptr inbounds nuw i8, ptr %413, i32 1, !dbg !1358
  %416 = load i8, ptr %415, align 1, !dbg !1358, !tbaa !131
    #dbg_value(i8 %416, !1188, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1355)
    #dbg_value(i32 2, !122, !DIExpression(), !1357)
  %417 = getelementptr inbounds nuw i8, ptr %413, i32 2, !dbg !1358
  %418 = load i8, ptr %417, align 1, !dbg !1358, !tbaa !131
    #dbg_value(i8 %418, !1188, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1355)
    #dbg_value(i32 3, !122, !DIExpression(), !1357)
  %419 = getelementptr inbounds nuw i8, ptr %413, i32 3, !dbg !1358
  %420 = load i8, ptr %419, align 1, !dbg !1358, !tbaa !131
    #dbg_value(i8 %420, !1188, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1355)
    #dbg_value(i32 4, !122, !DIExpression(), !1357)
    #dbg_value(i32 poison, !122, !DIExpression(), !1359)
  %421 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1361
  %422 = load ptr, ptr %421, align 4, !dbg !1361, !tbaa !629
    #dbg_value(ptr undef, !110, !DIExpression(), !1234)
    #dbg_value(ptr %422, !115, !DIExpression(), !1234)
    #dbg_value(i32 4, !116, !DIExpression(), !1234)
    #dbg_value(ptr undef, !117, !DIExpression(), !1234)
    #dbg_value(ptr %422, !119, !DIExpression(), !1234)
    #dbg_value(i32 0, !122, !DIExpression(), !1362)
  %423 = load i8, ptr %422, align 1, !dbg !1363, !tbaa !131
    #dbg_value(i8 %423, !1190, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1355)
    #dbg_value(i32 1, !122, !DIExpression(), !1362)
  %424 = getelementptr inbounds nuw i8, ptr %422, i32 1, !dbg !1363
  %425 = load i8, ptr %424, align 1, !dbg !1363, !tbaa !131
    #dbg_value(i8 %425, !1190, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1355)
    #dbg_value(i32 2, !122, !DIExpression(), !1362)
  %426 = getelementptr inbounds nuw i8, ptr %422, i32 2, !dbg !1363
  %427 = load i8, ptr %426, align 1, !dbg !1363, !tbaa !131
    #dbg_value(i8 %427, !1190, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1355)
    #dbg_value(i32 3, !122, !DIExpression(), !1362)
  %428 = getelementptr inbounds nuw i8, ptr %422, i32 3, !dbg !1363
  %429 = load i8, ptr %428, align 1, !dbg !1363, !tbaa !131
    #dbg_value(i8 %429, !1190, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1355)
    #dbg_value(i32 4, !122, !DIExpression(), !1362)
  %430 = zext i8 %411 to i32, !dbg !1364
  %431 = shl nuw i32 %430, 24, !dbg !1364
  %432 = zext i8 %409 to i32, !dbg !1364
  %433 = shl nuw nsw i32 %432, 16, !dbg !1364
  %434 = or disjoint i32 %431, %433, !dbg !1364
  %435 = zext i8 %407 to i32, !dbg !1364
  %436 = shl nuw nsw i32 %435, 8, !dbg !1364
  %437 = or disjoint i32 %434, %436, !dbg !1364
  %438 = zext i8 %405 to i32, !dbg !1364
  %439 = or disjoint i32 %437, %438, !dbg !1364
  %440 = zext i8 %420 to i32, !dbg !1365
  %441 = shl nuw i32 %440, 24, !dbg !1365
  %442 = zext i8 %418 to i32, !dbg !1365
  %443 = shl nuw nsw i32 %442, 16, !dbg !1365
  %444 = or disjoint i32 %441, %443, !dbg !1365
  %445 = zext i8 %416 to i32, !dbg !1365
  %446 = shl nuw nsw i32 %445, 8, !dbg !1365
  %447 = or disjoint i32 %444, %446, !dbg !1365
  %448 = zext i8 %414 to i32, !dbg !1365
  %449 = or disjoint i32 %447, %448, !dbg !1365
  %450 = zext i8 %429 to i32, !dbg !1366
  %451 = shl nuw i32 %450, 24, !dbg !1366
  %452 = zext i8 %427 to i32, !dbg !1366
  %453 = shl nuw nsw i32 %452, 16, !dbg !1366
  %454 = or disjoint i32 %451, %453, !dbg !1366
  %455 = zext i8 %425 to i32, !dbg !1366
  %456 = shl nuw nsw i32 %455, 8, !dbg !1366
  %457 = or disjoint i32 %454, %456, !dbg !1366
  %458 = zext i8 %423 to i32, !dbg !1366
  %459 = or disjoint i32 %457, %458, !dbg !1366
    #dbg_value(i32 %439, !458, !DIExpression(), !1368)
    #dbg_value(i32 %449, !459, !DIExpression(), !1368)
    #dbg_value(i32 poison, !460, !DIExpression(), !1368)
    #dbg_value(i32 %459, !461, !DIExpression(), !1368)
    #dbg_value(i32 %439, !462, !DIExpression(), !1368)
  %460 = icmp ult i32 %439, %449, !dbg !1366
  %461 = icmp eq i32 %459, 0, !dbg !1369
  br i1 %460, label %462, label %468, !dbg !1370

462:                                              ; preds = %403
    #dbg_value(i32 %439, !464, !DIExpression(), !1371)
    #dbg_value(i32 %459, !467, !DIExpression(), !1371)
  br i1 %461, label %465, label %463, !dbg !1372

463:                                              ; preds = %462
  %464 = udiv i32 %439, %459, !dbg !1373
    #dbg_value(i32 %464, !468, !DIExpression(), !1371)
  br label %465

465:                                              ; preds = %463, %462
  %466 = phi i32 [ %464, %463 ], [ 0, %462 ], !dbg !1374
    #dbg_value(i32 %466, !468, !DIExpression(), !1371)
    #dbg_value(i32 %466, !469, !DIExpression(), !1371)
  %467 = add i32 %466, %449, !dbg !1375
    #dbg_value(i32 %467, !463, !DIExpression(), !1368)
  br label %475, !dbg !1376

468:                                              ; preds = %403
    #dbg_value(i32 %449, !470, !DIExpression(), !1377)
    #dbg_value(i32 %459, !472, !DIExpression(), !1377)
  br i1 %461, label %471, label %469, !dbg !1378

469:                                              ; preds = %468
  %470 = urem i32 %449, %459, !dbg !1379
    #dbg_value(i32 %470, !473, !DIExpression(), !1377)
  br label %471

471:                                              ; preds = %469, %468
  %472 = phi i32 [ %470, %469 ], [ 0, %468 ], !dbg !1380
    #dbg_value(i32 %472, !473, !DIExpression(), !1377)
    #dbg_value(i32 %472, !474, !DIExpression(), !1377)
  %473 = add i32 %472, %439, !dbg !1381
    #dbg_value(i32 %473, !463, !DIExpression(), !1368)
  br label %475

474:                                              ; preds = %3
  tail call void @llvm.trap(), !dbg !1382
  unreachable, !dbg !1384

475:                                              ; preds = %471, %465, %400, %394, %252, %172, %169, %85
  %476 = phi i32 [ %331, %252 ], [ %251, %172 ], [ %171, %169 ], [ %87, %85 ], [ %396, %394 ], [ %402, %400 ], [ %467, %465 ], [ %473, %471 ], !dbg !1236
  ret i32 %476, !dbg !1385
}

; Function Attrs: cold noreturn nounwind memory(inaccessiblemem: write) uwtable
define hidden noundef i64 @ink_compute_scalar64(i32 noundef %0, ptr nocapture noundef readnone %1, ptr nocapture noundef readnone %2) local_unnamed_addr #11 !dbg !1386 {
    #dbg_value(i32 %0, !1392, !DIExpression(), !1395)
    #dbg_value(ptr %1, !1393, !DIExpression(), !1395)
    #dbg_value(ptr %2, !1394, !DIExpression(), !1395)
  tail call void @llvm.trap(), !dbg !1396
  unreachable, !dbg !1399
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
!3 = !DIFile(filename: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_heldout_u32/checked/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
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
!15 = !DIFile(filename: "reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_heldout_u32/checked/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
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
!130 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !125)
!131 = !{!29, !29, i64 0}
!132 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !125)
!133 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !125)
!134 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !125)
!135 = distinct !{!135, !129, !136, !137}
!136 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !125)
!137 = !{!"llvm.loop.mustprogress"}
!138 = distinct !{!138, !139}
!139 = !{!"llvm.loop.unroll.disable"}
!140 = !DILocation(line: 39, column: 78, scope: !100)
!141 = distinct !DISubprogram(name: "memset", scope: !15, file: !15, line: 40, type: !142, scopeLine: 40, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !145)
!142 = !DISubroutineType(types: !143)
!143 = !{!8, !8, !144, !5}
!144 = !DIBasicType(name: "int", size: 32, encoding: DW_ATE_signed)
!145 = !{!146, !147, !148, !149, !150}
!146 = !DILocalVariable(name: "to", arg: 1, scope: !141, file: !15, line: 40, type: !8)
!147 = !DILocalVariable(name: "value", arg: 2, scope: !141, file: !15, line: 40, type: !144)
!148 = !DILocalVariable(name: "bytes", arg: 3, scope: !141, file: !15, line: 40, type: !5)
!149 = !DILocalVariable(name: "dst", scope: !141, file: !15, line: 40, type: !118)
!150 = !DILocalVariable(name: "i", scope: !151, file: !15, line: 40, type: !5)
!151 = distinct !DILexicalBlock(scope: !141, file: !15, line: 40, column: 69)
!152 = !DILocation(line: 0, scope: !141)
!153 = !DILocation(line: 0, scope: !151)
!154 = !DILocation(line: 40, column: 85, scope: !155)
!155 = distinct !DILexicalBlock(scope: !151, file: !15, line: 40, column: 69)
!156 = !DILocation(line: 40, column: 69, scope: !151)
!157 = !DILocation(line: 40, column: 96, scope: !155)
!158 = !DILocation(line: 40, column: 102, scope: !155)
!159 = !DILocation(line: 40, column: 93, scope: !155)
!160 = distinct !{!160, !139}
!161 = !DILocation(line: 40, column: 124, scope: !141)
!162 = distinct !{!162, !156, !163, !137}
!163 = !DILocation(line: 40, column: 118, scope: !151)
!164 = distinct !DISubprogram(name: "lang_fn_pipeline38_left_padded_zip_heldout_u32", scope: !15, file: !15, line: 85, type: !165, scopeLine: 85, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !172)
!165 = !DISubroutineType(types: !166)
!166 = !{!167, !167, !167, !10, !10}
!167 = !DIDerivedType(tag: DW_TAG_typedef, name: "ink_l_uint32", file: !15, line: 65, baseType: !168)
!168 = distinct !DICompositeType(tag: DW_TAG_structure_type, file: !15, line: 65, size: 64, elements: !169)
!169 = !{!170, !171}
!170 = !DIDerivedType(tag: DW_TAG_member, name: "data", scope: !168, file: !15, line: 65, baseType: !13, size: 32)
!171 = !DIDerivedType(tag: DW_TAG_member, name: "len", scope: !168, file: !15, line: 65, baseType: !5, size: 32, offset: 32)
!172 = !{!173, !174, !175, !176, !177, !178, !179, !181, !184, !185, !186, !187, !188, !189, !190, !191, !192, !193, !194, !195, !196, !197, !198, !199, !200, !201, !202, !203, !204, !205, !206, !207, !208, !209, !210, !213, !215, !216, !217, !218, !219, !220, !221, !222, !223, !224, !227, !228, !229, !230, !232, !233, !234}
!173 = !DILocalVariable(name: "a0", arg: 1, scope: !164, file: !15, line: 85, type: !167)
!174 = !DILocalVariable(name: "a1", arg: 2, scope: !164, file: !15, line: 85, type: !167)
!175 = !DILocalVariable(name: "a2", arg: 3, scope: !164, file: !15, line: 85, type: !10)
!176 = !DILocalVariable(name: "a3", arg: 4, scope: !164, file: !15, line: 85, type: !10)
!177 = !DILocalVariable(name: "t0", scope: !164, file: !15, line: 90, type: !167)
!178 = !DILocalVariable(name: "t1", scope: !164, file: !15, line: 92, type: !167)
!179 = !DILocalVariable(name: "t2", scope: !180, file: !15, line: 93, type: !5)
!180 = distinct !DILexicalBlock(scope: !164, file: !15, line: 93, column: 1)
!181 = !DILocalVariable(name: "t3", scope: !182, file: !15, line: 94, type: !10)
!182 = distinct !DILexicalBlock(scope: !183, file: !15, line: 93, column: 32)
!183 = distinct !DILexicalBlock(scope: !180, file: !15, line: 93, column: 1)
!184 = !DILocalVariable(name: "t4", scope: !182, file: !15, line: 96, type: !10)
!185 = !DILocalVariable(name: "t5", scope: !182, file: !15, line: 98, type: !10)
!186 = !DILocalVariable(name: "t6", scope: !182, file: !15, line: 100, type: !10)
!187 = !DILocalVariable(name: "t7", scope: !182, file: !15, line: 103, type: !10)
!188 = !DILocalVariable(name: "t8", scope: !182, file: !15, line: 105, type: !10)
!189 = !DILocalVariable(name: "t9", scope: !182, file: !15, line: 107, type: !10)
!190 = !DILocalVariable(name: "t10", scope: !182, file: !15, line: 109, type: !10)
!191 = !DILocalVariable(name: "t11", scope: !182, file: !15, line: 112, type: !10)
!192 = !DILocalVariable(name: "t12", scope: !182, file: !15, line: 114, type: !10)
!193 = !DILocalVariable(name: "t13", scope: !182, file: !15, line: 116, type: !10)
!194 = !DILocalVariable(name: "t14", scope: !182, file: !15, line: 120, type: !10)
!195 = !DILocalVariable(name: "t15", scope: !182, file: !15, line: 122, type: !10)
!196 = !DILocalVariable(name: "t16", scope: !182, file: !15, line: 124, type: !10)
!197 = !DILocalVariable(name: "t17", scope: !182, file: !15, line: 126, type: !10)
!198 = !DILocalVariable(name: "t18", scope: !182, file: !15, line: 130, type: !10)
!199 = !DILocalVariable(name: "t19", scope: !182, file: !15, line: 132, type: !10)
!200 = !DILocalVariable(name: "t20", scope: !182, file: !15, line: 134, type: !10)
!201 = !DILocalVariable(name: "t21", scope: !182, file: !15, line: 136, type: !10)
!202 = !DILocalVariable(name: "t22", scope: !182, file: !15, line: 138, type: !10)
!203 = !DILocalVariable(name: "t23", scope: !182, file: !15, line: 140, type: !10)
!204 = !DILocalVariable(name: "t24", scope: !182, file: !15, line: 143, type: !10)
!205 = !DILocalVariable(name: "t25", scope: !182, file: !15, line: 145, type: !10)
!206 = !DILocalVariable(name: "t26", scope: !182, file: !15, line: 147, type: !10)
!207 = !DILocalVariable(name: "t27", scope: !182, file: !15, line: 149, type: !10)
!208 = !DILocalVariable(name: "t28", scope: !182, file: !15, line: 152, type: !10)
!209 = !DILocalVariable(name: "t29", scope: !182, file: !15, line: 154, type: !10)
!210 = !DILocalVariable(name: "t30", scope: !211, file: !15, line: 156, type: !10)
!211 = distinct !DILexicalBlock(scope: !212, file: !15, line: 155, column: 18)
!212 = distinct !DILexicalBlock(scope: !182, file: !15, line: 155, column: 5)
!213 = !DILocalVariable(name: "t31", scope: !214, file: !15, line: 160, type: !10)
!214 = distinct !DILexicalBlock(scope: !212, file: !15, line: 159, column: 8)
!215 = !DILocalVariable(name: "t32", scope: !182, file: !15, line: 164, type: !10)
!216 = !DILocalVariable(name: "t33", scope: !182, file: !15, line: 166, type: !10)
!217 = !DILocalVariable(name: "t34", scope: !182, file: !15, line: 168, type: !10)
!218 = !DILocalVariable(name: "t35", scope: !182, file: !15, line: 171, type: !10)
!219 = !DILocalVariable(name: "t36", scope: !182, file: !15, line: 173, type: !10)
!220 = !DILocalVariable(name: "t37", scope: !182, file: !15, line: 175, type: !10)
!221 = !DILocalVariable(name: "t38", scope: !182, file: !15, line: 177, type: !10)
!222 = !DILocalVariable(name: "t39", scope: !182, file: !15, line: 180, type: !10)
!223 = !DILocalVariable(name: "t40", scope: !182, file: !15, line: 182, type: !10)
!224 = !DILocalVariable(name: "t41", scope: !225, file: !15, line: 184, type: !10)
!225 = distinct !DILexicalBlock(scope: !226, file: !15, line: 183, column: 18)
!226 = distinct !DILexicalBlock(scope: !182, file: !15, line: 183, column: 5)
!227 = !DILocalVariable(name: "t42", scope: !225, file: !15, line: 186, type: !10)
!228 = !DILocalVariable(name: "t43", scope: !225, file: !15, line: 188, type: !10)
!229 = !DILocalVariable(name: "t44", scope: !225, file: !15, line: 192, type: !10)
!230 = !DILocalVariable(name: "t45", scope: !231, file: !15, line: 196, type: !10)
!231 = distinct !DILexicalBlock(scope: !226, file: !15, line: 195, column: 8)
!232 = !DILocalVariable(name: "t46", scope: !231, file: !15, line: 198, type: !10)
!233 = !DILocalVariable(name: "t47", scope: !231, file: !15, line: 200, type: !10)
!234 = !DILocalVariable(name: "t48", scope: !231, file: !15, line: 204, type: !10)
!235 = !DILocation(line: 85, column: 74, scope: !164)
!236 = !DILocation(line: 85, column: 90, scope: !164)
!237 = !DILocation(line: 0, scope: !164)
!238 = !DILocation(line: 90, column: 17, scope: !164)
!239 = !{!240, !240, i64 0}
!240 = !{!"p1 int", !241, i64 0}
!241 = !{!"any pointer", !29, i64 0}
!242 = !DILocation(line: 92, column: 14, scope: !164)
!243 = !DILocation(line: 0, scope: !51, inlinedAt: !244)
!244 = distinct !DILocation(line: 92, column: 18, scope: !164)
!245 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !244)
!246 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !244)
!247 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !248)
!248 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !244)
!249 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !248)
!250 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !244)
!251 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !244)
!252 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !244)
!253 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !244)
!254 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !244)
!255 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !244)
!256 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !244)
!257 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !244)
!258 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !259)
!259 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !244)
!260 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !259)
!261 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !244)
!262 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !244)
!263 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !244)
!264 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !244)
!265 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !244)
!266 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !244)
!267 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !244)
!268 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !244)
!269 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !244)
!270 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !244)
!271 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !272)
!272 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !244)
!273 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !272)
!274 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !244)
!275 = !DILocation(line: 92, column: 17, scope: !164)
!276 = !{!277, !240, i64 0}
!277 = !{!"", !240, i64 0, !28, i64 4}
!278 = !{!277, !28, i64 4}
!279 = !DILocation(line: 0, scope: !180)
!280 = !DILocation(line: 93, column: 19, scope: !183)
!281 = !DILocation(line: 93, column: 1, scope: !180)
!282 = !DILocation(line: 211, column: 1, scope: !164)
!283 = !DILocation(line: 0, scope: !182)
!284 = !DILocation(line: 96, column: 13, scope: !182)
!285 = !DILocation(line: 136, column: 14, scope: !182)
!286 = !{!287, !287, i64 0}
!287 = !{!"int", !29, i64 0}
!288 = !DILocation(line: 117, column: 8, scope: !289)
!289 = distinct !DILexicalBlock(scope: !182, file: !15, line: 117, column: 5)
!290 = !DILocation(line: 155, column: 10, scope: !212)
!291 = !DILocation(line: 155, column: 5, scope: !212)
!292 = !DILocation(line: 183, column: 10, scope: !226)
!293 = !DILocation(line: 183, column: 5, scope: !226)
!294 = !DILocation(line: 119, column: 18, scope: !295)
!295 = distinct !DILexicalBlock(scope: !289, file: !15, line: 119, column: 8)
!296 = !DILocation(line: 129, column: 18, scope: !297)
!297 = distinct !DILexicalBlock(scope: !298, file: !15, line: 129, column: 8)
!298 = distinct !DILexicalBlock(scope: !182, file: !15, line: 127, column: 5)
!299 = !DILocation(line: 132, column: 19, scope: !182)
!300 = !DILocation(line: 0, scope: !225)
!301 = !DILocation(line: 191, column: 18, scope: !302)
!302 = distinct !DILexicalBlock(scope: !303, file: !15, line: 191, column: 8)
!303 = distinct !DILexicalBlock(scope: !225, file: !15, line: 189, column: 5)
!304 = !DILocation(line: 0, scope: !303)
!305 = !DILocation(line: 194, column: 10, scope: !225)
!306 = !DILocation(line: 195, column: 1, scope: !225)
!307 = !DILocation(line: 0, scope: !231)
!308 = !DILocation(line: 203, column: 18, scope: !309)
!309 = distinct !DILexicalBlock(scope: !310, file: !15, line: 203, column: 8)
!310 = distinct !DILexicalBlock(scope: !231, file: !15, line: 201, column: 5)
!311 = !DILocation(line: 0, scope: !310)
!312 = !DILocation(line: 206, column: 10, scope: !231)
!313 = !DILocation(line: 0, scope: !226)
!314 = !DILocation(line: 208, column: 1, scope: !182)
!315 = !DILocation(line: 208, column: 12, scope: !182)
!316 = !DILocation(line: 93, column: 29, scope: !183)
!317 = distinct !{!317, !281, !318, !137}
!318 = !DILocation(line: 209, column: 1, scope: !180)
!319 = distinct !DISubprogram(name: "lang_fn_left_word", scope: !15, file: !15, line: 212, type: !320, scopeLine: 212, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !322)
!320 = !DISubroutineType(types: !321)
!321 = !{!10, !10, !10, !10, !10}
!322 = !{!323, !324, !325, !326, !327, !328, !329, !330, !331, !332, !333, !334, !335, !336, !337, !338}
!323 = !DILocalVariable(name: "a0", arg: 1, scope: !319, file: !15, line: 212, type: !10)
!324 = !DILocalVariable(name: "a1", arg: 2, scope: !319, file: !15, line: 212, type: !10)
!325 = !DILocalVariable(name: "a2", arg: 3, scope: !319, file: !15, line: 212, type: !10)
!326 = !DILocalVariable(name: "a3", arg: 4, scope: !319, file: !15, line: 212, type: !10)
!327 = !DILocalVariable(name: "t0", scope: !319, file: !15, line: 217, type: !10)
!328 = !DILocalVariable(name: "t1", scope: !319, file: !15, line: 219, type: !10)
!329 = !DILocalVariable(name: "t2", scope: !319, file: !15, line: 221, type: !10)
!330 = !DILocalVariable(name: "t3", scope: !319, file: !15, line: 223, type: !10)
!331 = !DILocalVariable(name: "t4", scope: !319, file: !15, line: 226, type: !10)
!332 = !DILocalVariable(name: "t5", scope: !319, file: !15, line: 228, type: !10)
!333 = !DILocalVariable(name: "t6", scope: !319, file: !15, line: 230, type: !10)
!334 = !DILocalVariable(name: "t7", scope: !319, file: !15, line: 234, type: !10)
!335 = !DILocalVariable(name: "t8", scope: !319, file: !15, line: 236, type: !10)
!336 = !DILocalVariable(name: "t9", scope: !319, file: !15, line: 238, type: !10)
!337 = !DILocalVariable(name: "t10", scope: !319, file: !15, line: 240, type: !10)
!338 = !DILocalVariable(name: "t11", scope: !319, file: !15, line: 244, type: !10)
!339 = !DILocation(line: 0, scope: !319)
!340 = !DILocation(line: 231, column: 7, scope: !341)
!341 = distinct !DILexicalBlock(scope: !319, file: !15, line: 231, column: 5)
!342 = !DILocation(line: 233, column: 16, scope: !343)
!343 = distinct !DILexicalBlock(scope: !341, file: !15, line: 233, column: 8)
!344 = !DILocation(line: 243, column: 17, scope: !345)
!345 = distinct !DILexicalBlock(scope: !346, file: !15, line: 243, column: 8)
!346 = distinct !DILexicalBlock(scope: !319, file: !15, line: 241, column: 5)
!347 = !DILocation(line: 244, column: 18, scope: !319)
!348 = !DILocation(line: 246, column: 13, scope: !319)
!349 = !DILocation(line: 246, column: 1, scope: !319)
!350 = distinct !DISubprogram(name: "lang_fn_left_signal", scope: !15, file: !15, line: 248, type: !320, scopeLine: 248, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !351)
!351 = !{!352, !353, !354, !355, !356, !357, !358, !359, !360, !361, !362, !363}
!352 = !DILocalVariable(name: "a0", arg: 1, scope: !350, file: !15, line: 248, type: !10)
!353 = !DILocalVariable(name: "a1", arg: 2, scope: !350, file: !15, line: 248, type: !10)
!354 = !DILocalVariable(name: "a2", arg: 3, scope: !350, file: !15, line: 248, type: !10)
!355 = !DILocalVariable(name: "a3", arg: 4, scope: !350, file: !15, line: 248, type: !10)
!356 = !DILocalVariable(name: "t0", scope: !350, file: !15, line: 253, type: !10)
!357 = !DILocalVariable(name: "t1", scope: !350, file: !15, line: 255, type: !10)
!358 = !DILocalVariable(name: "t2", scope: !350, file: !15, line: 257, type: !10)
!359 = !DILocalVariable(name: "t3", scope: !350, file: !15, line: 261, type: !10)
!360 = !DILocalVariable(name: "t4", scope: !350, file: !15, line: 263, type: !10)
!361 = !DILocalVariable(name: "t5", scope: !350, file: !15, line: 265, type: !10)
!362 = !DILocalVariable(name: "t6", scope: !350, file: !15, line: 267, type: !10)
!363 = !DILocalVariable(name: "t7", scope: !350, file: !15, line: 271, type: !10)
!364 = !DILocation(line: 0, scope: !350)
!365 = !DILocation(line: 258, column: 7, scope: !366)
!366 = distinct !DILexicalBlock(scope: !350, file: !15, line: 258, column: 5)
!367 = !DILocation(line: 260, column: 16, scope: !368)
!368 = distinct !DILexicalBlock(scope: !366, file: !15, line: 260, column: 8)
!369 = !DILocation(line: 270, column: 16, scope: !370)
!370 = distinct !DILexicalBlock(scope: !371, file: !15, line: 270, column: 8)
!371 = distinct !DILexicalBlock(scope: !350, file: !15, line: 268, column: 5)
!372 = !DILocation(line: 271, column: 17, scope: !350)
!373 = !DILocation(line: 273, column: 12, scope: !350)
!374 = !DILocation(line: 273, column: 1, scope: !350)
!375 = distinct !DISubprogram(name: "lang_fn_right_word", scope: !15, file: !15, line: 275, type: !320, scopeLine: 275, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !376)
!376 = !{!377, !378, !379, !380, !381, !382, !383, !384, !385, !386, !387, !390}
!377 = !DILocalVariable(name: "a0", arg: 1, scope: !375, file: !15, line: 275, type: !10)
!378 = !DILocalVariable(name: "a1", arg: 2, scope: !375, file: !15, line: 275, type: !10)
!379 = !DILocalVariable(name: "a2", arg: 3, scope: !375, file: !15, line: 275, type: !10)
!380 = !DILocalVariable(name: "a3", arg: 4, scope: !375, file: !15, line: 275, type: !10)
!381 = !DILocalVariable(name: "t0", scope: !375, file: !15, line: 280, type: !10)
!382 = !DILocalVariable(name: "t1", scope: !375, file: !15, line: 282, type: !10)
!383 = !DILocalVariable(name: "t2", scope: !375, file: !15, line: 284, type: !10)
!384 = !DILocalVariable(name: "t3", scope: !375, file: !15, line: 286, type: !10)
!385 = !DILocalVariable(name: "t4", scope: !375, file: !15, line: 289, type: !10)
!386 = !DILocalVariable(name: "t5", scope: !375, file: !15, line: 291, type: !10)
!387 = !DILocalVariable(name: "t6", scope: !388, file: !15, line: 293, type: !10)
!388 = distinct !DILexicalBlock(scope: !389, file: !15, line: 292, column: 16)
!389 = distinct !DILexicalBlock(scope: !375, file: !15, line: 292, column: 5)
!390 = !DILocalVariable(name: "t7", scope: !391, file: !15, line: 297, type: !10)
!391 = distinct !DILexicalBlock(scope: !389, file: !15, line: 296, column: 8)
!392 = !DILocation(line: 0, scope: !375)
!393 = !DILocation(line: 292, column: 9, scope: !389)
!394 = !DILocation(line: 292, column: 5, scope: !389)
!395 = !DILocation(line: 301, column: 1, scope: !375)
!396 = distinct !DISubprogram(name: "lang_fn_right_signal", scope: !15, file: !15, line: 303, type: !320, scopeLine: 303, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !397)
!397 = !{!398, !399, !400, !401, !402, !403, !404, !407}
!398 = !DILocalVariable(name: "a0", arg: 1, scope: !396, file: !15, line: 303, type: !10)
!399 = !DILocalVariable(name: "a1", arg: 2, scope: !396, file: !15, line: 303, type: !10)
!400 = !DILocalVariable(name: "a2", arg: 3, scope: !396, file: !15, line: 303, type: !10)
!401 = !DILocalVariable(name: "a3", arg: 4, scope: !396, file: !15, line: 303, type: !10)
!402 = !DILocalVariable(name: "t0", scope: !396, file: !15, line: 308, type: !10)
!403 = !DILocalVariable(name: "t1", scope: !396, file: !15, line: 310, type: !10)
!404 = !DILocalVariable(name: "t2", scope: !405, file: !15, line: 312, type: !10)
!405 = distinct !DILexicalBlock(scope: !406, file: !15, line: 311, column: 16)
!406 = distinct !DILexicalBlock(scope: !396, file: !15, line: 311, column: 5)
!407 = !DILocalVariable(name: "t3", scope: !408, file: !15, line: 316, type: !10)
!408 = distinct !DILexicalBlock(scope: !406, file: !15, line: 315, column: 8)
!409 = !DILocation(line: 0, scope: !396)
!410 = !DILocation(line: 311, column: 9, scope: !406)
!411 = !DILocation(line: 311, column: 5, scope: !406)
!412 = !DILocation(line: 320, column: 1, scope: !396)
!413 = distinct !DISubprogram(name: "lang_fn_pair_word", scope: !15, file: !15, line: 322, type: !320, scopeLine: 322, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !414)
!414 = !{!415, !416, !417, !418, !419, !420, !421, !422, !423, !424, !425, !428, !429, !430, !431, !433, !434, !435}
!415 = !DILocalVariable(name: "a0", arg: 1, scope: !413, file: !15, line: 322, type: !10)
!416 = !DILocalVariable(name: "a1", arg: 2, scope: !413, file: !15, line: 322, type: !10)
!417 = !DILocalVariable(name: "a2", arg: 3, scope: !413, file: !15, line: 322, type: !10)
!418 = !DILocalVariable(name: "a3", arg: 4, scope: !413, file: !15, line: 322, type: !10)
!419 = !DILocalVariable(name: "t0", scope: !413, file: !15, line: 327, type: !10)
!420 = !DILocalVariable(name: "t1", scope: !413, file: !15, line: 329, type: !10)
!421 = !DILocalVariable(name: "t2", scope: !413, file: !15, line: 331, type: !10)
!422 = !DILocalVariable(name: "t3", scope: !413, file: !15, line: 333, type: !10)
!423 = !DILocalVariable(name: "t4", scope: !413, file: !15, line: 336, type: !10)
!424 = !DILocalVariable(name: "t5", scope: !413, file: !15, line: 338, type: !10)
!425 = !DILocalVariable(name: "t6", scope: !426, file: !15, line: 340, type: !10)
!426 = distinct !DILexicalBlock(scope: !427, file: !15, line: 339, column: 16)
!427 = distinct !DILexicalBlock(scope: !413, file: !15, line: 339, column: 5)
!428 = !DILocalVariable(name: "t7", scope: !426, file: !15, line: 342, type: !10)
!429 = !DILocalVariable(name: "t8", scope: !426, file: !15, line: 344, type: !10)
!430 = !DILocalVariable(name: "t9", scope: !426, file: !15, line: 348, type: !10)
!431 = !DILocalVariable(name: "t10", scope: !432, file: !15, line: 352, type: !10)
!432 = distinct !DILexicalBlock(scope: !427, file: !15, line: 351, column: 8)
!433 = !DILocalVariable(name: "t11", scope: !432, file: !15, line: 354, type: !10)
!434 = !DILocalVariable(name: "t12", scope: !432, file: !15, line: 356, type: !10)
!435 = !DILocalVariable(name: "t13", scope: !432, file: !15, line: 360, type: !10)
!436 = !DILocation(line: 0, scope: !413)
!437 = !DILocation(line: 339, column: 9, scope: !427)
!438 = !DILocation(line: 0, scope: !427)
!439 = !DILocation(line: 339, column: 5, scope: !427)
!440 = !DILocation(line: 0, scope: !426)
!441 = !DILocation(line: 345, column: 7, scope: !442)
!442 = distinct !DILexicalBlock(scope: !426, file: !15, line: 345, column: 5)
!443 = !DILocation(line: 347, column: 16, scope: !444)
!444 = distinct !DILexicalBlock(scope: !442, file: !15, line: 347, column: 8)
!445 = !DILocation(line: 0, scope: !442)
!446 = !DILocation(line: 350, column: 8, scope: !426)
!447 = !DILocation(line: 351, column: 1, scope: !426)
!448 = !DILocation(line: 0, scope: !432)
!449 = !DILocation(line: 357, column: 8, scope: !450)
!450 = distinct !DILexicalBlock(scope: !432, file: !15, line: 357, column: 5)
!451 = !DILocation(line: 359, column: 18, scope: !452)
!452 = distinct !DILexicalBlock(scope: !450, file: !15, line: 359, column: 8)
!453 = !DILocation(line: 0, scope: !450)
!454 = !DILocation(line: 362, column: 9, scope: !432)
!455 = !DILocation(line: 364, column: 1, scope: !413)
!456 = distinct !DISubprogram(name: "lang_fn_pair_signal", scope: !15, file: !15, line: 366, type: !320, scopeLine: 366, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !457)
!457 = !{!458, !459, !460, !461, !462, !463, !464, !467, !468, !469, !470, !472, !473, !474}
!458 = !DILocalVariable(name: "a0", arg: 1, scope: !456, file: !15, line: 366, type: !10)
!459 = !DILocalVariable(name: "a1", arg: 2, scope: !456, file: !15, line: 366, type: !10)
!460 = !DILocalVariable(name: "a2", arg: 3, scope: !456, file: !15, line: 366, type: !10)
!461 = !DILocalVariable(name: "a3", arg: 4, scope: !456, file: !15, line: 366, type: !10)
!462 = !DILocalVariable(name: "t0", scope: !456, file: !15, line: 371, type: !10)
!463 = !DILocalVariable(name: "t1", scope: !456, file: !15, line: 373, type: !10)
!464 = !DILocalVariable(name: "t2", scope: !465, file: !15, line: 375, type: !10)
!465 = distinct !DILexicalBlock(scope: !466, file: !15, line: 374, column: 16)
!466 = distinct !DILexicalBlock(scope: !456, file: !15, line: 374, column: 5)
!467 = !DILocalVariable(name: "t3", scope: !465, file: !15, line: 377, type: !10)
!468 = !DILocalVariable(name: "t4", scope: !465, file: !15, line: 379, type: !10)
!469 = !DILocalVariable(name: "t5", scope: !465, file: !15, line: 383, type: !10)
!470 = !DILocalVariable(name: "t6", scope: !471, file: !15, line: 387, type: !10)
!471 = distinct !DILexicalBlock(scope: !466, file: !15, line: 386, column: 8)
!472 = !DILocalVariable(name: "t7", scope: !471, file: !15, line: 389, type: !10)
!473 = !DILocalVariable(name: "t8", scope: !471, file: !15, line: 391, type: !10)
!474 = !DILocalVariable(name: "t9", scope: !471, file: !15, line: 395, type: !10)
!475 = !DILocation(line: 0, scope: !456)
!476 = !DILocation(line: 374, column: 9, scope: !466)
!477 = !DILocation(line: 0, scope: !466)
!478 = !DILocation(line: 374, column: 5, scope: !466)
!479 = !DILocation(line: 0, scope: !465)
!480 = !DILocation(line: 380, column: 7, scope: !481)
!481 = distinct !DILexicalBlock(scope: !465, file: !15, line: 380, column: 5)
!482 = !DILocation(line: 382, column: 16, scope: !483)
!483 = distinct !DILexicalBlock(scope: !481, file: !15, line: 382, column: 8)
!484 = !DILocation(line: 0, scope: !481)
!485 = !DILocation(line: 385, column: 8, scope: !465)
!486 = !DILocation(line: 386, column: 1, scope: !465)
!487 = !DILocation(line: 0, scope: !471)
!488 = !DILocation(line: 392, column: 7, scope: !489)
!489 = distinct !DILexicalBlock(scope: !471, file: !15, line: 392, column: 5)
!490 = !DILocation(line: 394, column: 16, scope: !491)
!491 = distinct !DILexicalBlock(scope: !489, file: !15, line: 394, column: 8)
!492 = !DILocation(line: 0, scope: !489)
!493 = !DILocation(line: 397, column: 8, scope: !471)
!494 = !DILocation(line: 399, column: 1, scope: !456)
!495 = distinct !DISubprogram(name: "lang_fn_pipeline38_left_padded_zip_heldout_u32_into", scope: !15, file: !15, line: 401, type: !496, scopeLine: 401, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !498)
!496 = !DISubroutineType(types: !497)
!497 = !{!5, !167, !167, !10, !10, !13}
!498 = !{!499, !500, !501, !502, !503, !504, !505, !506, !508, !511, !512, !513, !514, !515, !516, !517, !518, !519, !520, !521, !522, !523, !524, !525, !526, !527, !528, !529, !530, !531, !532, !533, !534, !535, !536, !537, !540, !542, !543, !544, !545, !546, !547, !548, !549, !550, !551, !554, !555, !556, !557, !559, !560, !561}
!499 = !DILocalVariable(name: "a0", arg: 1, scope: !495, file: !15, line: 401, type: !167)
!500 = !DILocalVariable(name: "a1", arg: 2, scope: !495, file: !15, line: 401, type: !167)
!501 = !DILocalVariable(name: "a2", arg: 3, scope: !495, file: !15, line: 401, type: !10)
!502 = !DILocalVariable(name: "a3", arg: 4, scope: !495, file: !15, line: 401, type: !10)
!503 = !DILocalVariable(name: "destination", arg: 5, scope: !495, file: !15, line: 401, type: !13)
!504 = !DILocalVariable(name: "t0", scope: !495, file: !15, line: 406, type: !167)
!505 = !DILocalVariable(name: "t1", scope: !495, file: !15, line: 408, type: !167)
!506 = !DILocalVariable(name: "t2", scope: !507, file: !15, line: 409, type: !5)
!507 = distinct !DILexicalBlock(scope: !495, file: !15, line: 409, column: 1)
!508 = !DILocalVariable(name: "t3", scope: !509, file: !15, line: 410, type: !10)
!509 = distinct !DILexicalBlock(scope: !510, file: !15, line: 409, column: 32)
!510 = distinct !DILexicalBlock(scope: !507, file: !15, line: 409, column: 1)
!511 = !DILocalVariable(name: "t4", scope: !509, file: !15, line: 412, type: !10)
!512 = !DILocalVariable(name: "t5", scope: !509, file: !15, line: 414, type: !10)
!513 = !DILocalVariable(name: "t6", scope: !509, file: !15, line: 416, type: !10)
!514 = !DILocalVariable(name: "t7", scope: !509, file: !15, line: 419, type: !10)
!515 = !DILocalVariable(name: "t8", scope: !509, file: !15, line: 421, type: !10)
!516 = !DILocalVariable(name: "t9", scope: !509, file: !15, line: 423, type: !10)
!517 = !DILocalVariable(name: "t10", scope: !509, file: !15, line: 425, type: !10)
!518 = !DILocalVariable(name: "t11", scope: !509, file: !15, line: 428, type: !10)
!519 = !DILocalVariable(name: "t12", scope: !509, file: !15, line: 430, type: !10)
!520 = !DILocalVariable(name: "t13", scope: !509, file: !15, line: 432, type: !10)
!521 = !DILocalVariable(name: "t14", scope: !509, file: !15, line: 436, type: !10)
!522 = !DILocalVariable(name: "t15", scope: !509, file: !15, line: 438, type: !10)
!523 = !DILocalVariable(name: "t16", scope: !509, file: !15, line: 440, type: !10)
!524 = !DILocalVariable(name: "t17", scope: !509, file: !15, line: 442, type: !10)
!525 = !DILocalVariable(name: "t18", scope: !509, file: !15, line: 446, type: !10)
!526 = !DILocalVariable(name: "t19", scope: !509, file: !15, line: 448, type: !10)
!527 = !DILocalVariable(name: "t20", scope: !509, file: !15, line: 450, type: !10)
!528 = !DILocalVariable(name: "t21", scope: !509, file: !15, line: 452, type: !10)
!529 = !DILocalVariable(name: "t22", scope: !509, file: !15, line: 454, type: !10)
!530 = !DILocalVariable(name: "t23", scope: !509, file: !15, line: 456, type: !10)
!531 = !DILocalVariable(name: "t24", scope: !509, file: !15, line: 459, type: !10)
!532 = !DILocalVariable(name: "t25", scope: !509, file: !15, line: 461, type: !10)
!533 = !DILocalVariable(name: "t26", scope: !509, file: !15, line: 463, type: !10)
!534 = !DILocalVariable(name: "t27", scope: !509, file: !15, line: 465, type: !10)
!535 = !DILocalVariable(name: "t28", scope: !509, file: !15, line: 468, type: !10)
!536 = !DILocalVariable(name: "t29", scope: !509, file: !15, line: 470, type: !10)
!537 = !DILocalVariable(name: "t30", scope: !538, file: !15, line: 472, type: !10)
!538 = distinct !DILexicalBlock(scope: !539, file: !15, line: 471, column: 18)
!539 = distinct !DILexicalBlock(scope: !509, file: !15, line: 471, column: 5)
!540 = !DILocalVariable(name: "t31", scope: !541, file: !15, line: 476, type: !10)
!541 = distinct !DILexicalBlock(scope: !539, file: !15, line: 475, column: 8)
!542 = !DILocalVariable(name: "t32", scope: !509, file: !15, line: 480, type: !10)
!543 = !DILocalVariable(name: "t33", scope: !509, file: !15, line: 482, type: !10)
!544 = !DILocalVariable(name: "t34", scope: !509, file: !15, line: 484, type: !10)
!545 = !DILocalVariable(name: "t35", scope: !509, file: !15, line: 487, type: !10)
!546 = !DILocalVariable(name: "t36", scope: !509, file: !15, line: 489, type: !10)
!547 = !DILocalVariable(name: "t37", scope: !509, file: !15, line: 491, type: !10)
!548 = !DILocalVariable(name: "t38", scope: !509, file: !15, line: 493, type: !10)
!549 = !DILocalVariable(name: "t39", scope: !509, file: !15, line: 496, type: !10)
!550 = !DILocalVariable(name: "t40", scope: !509, file: !15, line: 498, type: !10)
!551 = !DILocalVariable(name: "t41", scope: !552, file: !15, line: 500, type: !10)
!552 = distinct !DILexicalBlock(scope: !553, file: !15, line: 499, column: 18)
!553 = distinct !DILexicalBlock(scope: !509, file: !15, line: 499, column: 5)
!554 = !DILocalVariable(name: "t42", scope: !552, file: !15, line: 502, type: !10)
!555 = !DILocalVariable(name: "t43", scope: !552, file: !15, line: 504, type: !10)
!556 = !DILocalVariable(name: "t44", scope: !552, file: !15, line: 508, type: !10)
!557 = !DILocalVariable(name: "t45", scope: !558, file: !15, line: 512, type: !10)
!558 = distinct !DILexicalBlock(scope: !553, file: !15, line: 511, column: 8)
!559 = !DILocalVariable(name: "t46", scope: !558, file: !15, line: 514, type: !10)
!560 = !DILocalVariable(name: "t47", scope: !558, file: !15, line: 516, type: !10)
!561 = !DILocalVariable(name: "t48", scope: !558, file: !15, line: 520, type: !10)
!562 = !DILocation(line: 401, column: 73, scope: !495)
!563 = !DILocation(line: 401, column: 89, scope: !495)
!564 = !DILocation(line: 0, scope: !495)
!565 = !DILocation(line: 406, column: 17, scope: !495)
!566 = !DILocation(line: 0, scope: !507)
!567 = !DILocation(line: 409, column: 19, scope: !510)
!568 = !DILocation(line: 409, column: 1, scope: !507)
!569 = !DILocation(line: 526, column: 1, scope: !495)
!570 = !DILocation(line: 0, scope: !509)
!571 = !DILocation(line: 412, column: 13, scope: !509)
!572 = !DILocation(line: 452, column: 14, scope: !509)
!573 = !DILocation(line: 433, column: 8, scope: !574)
!574 = distinct !DILexicalBlock(scope: !509, file: !15, line: 433, column: 5)
!575 = !DILocation(line: 471, column: 10, scope: !539)
!576 = !DILocation(line: 471, column: 5, scope: !539)
!577 = !DILocation(line: 499, column: 10, scope: !553)
!578 = !DILocation(line: 499, column: 5, scope: !553)
!579 = !DILocation(line: 435, column: 18, scope: !580)
!580 = distinct !DILexicalBlock(scope: !574, file: !15, line: 435, column: 8)
!581 = !DILocation(line: 445, column: 18, scope: !582)
!582 = distinct !DILexicalBlock(scope: !583, file: !15, line: 445, column: 8)
!583 = distinct !DILexicalBlock(scope: !509, file: !15, line: 443, column: 5)
!584 = !DILocation(line: 448, column: 19, scope: !509)
!585 = !DILocation(line: 0, scope: !552)
!586 = !DILocation(line: 507, column: 18, scope: !587)
!587 = distinct !DILexicalBlock(scope: !588, file: !15, line: 507, column: 8)
!588 = distinct !DILexicalBlock(scope: !552, file: !15, line: 505, column: 5)
!589 = !DILocation(line: 0, scope: !588)
!590 = !DILocation(line: 510, column: 10, scope: !552)
!591 = !DILocation(line: 511, column: 1, scope: !552)
!592 = !DILocation(line: 0, scope: !558)
!593 = !DILocation(line: 519, column: 18, scope: !594)
!594 = distinct !DILexicalBlock(scope: !595, file: !15, line: 519, column: 8)
!595 = distinct !DILexicalBlock(scope: !558, file: !15, line: 517, column: 5)
!596 = !DILocation(line: 0, scope: !595)
!597 = !DILocation(line: 522, column: 10, scope: !558)
!598 = !DILocation(line: 0, scope: !553)
!599 = !DILocation(line: 524, column: 1, scope: !509)
!600 = !DILocation(line: 524, column: 12, scope: !509)
!601 = !DILocation(line: 409, column: 29, scope: !510)
!602 = distinct !{!602, !568, !603, !137}
!603 = !DILocation(line: 525, column: 1, scope: !507)
!604 = distinct !DISubprogram(name: "ink_compute_into", scope: !15, file: !15, line: 528, type: !605, scopeLine: 528, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !611)
!605 = !DISubroutineType(types: !606)
!606 = !{!5, !10, !607, !609, !8}
!607 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !608, size: 32)
!608 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !103)
!609 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !610, size: 32)
!610 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !5)
!611 = !{!612, !613, !614, !615, !616, !619, !620, !621}
!612 = !DILocalVariable(name: "function", arg: 1, scope: !604, file: !15, line: 528, type: !10)
!613 = !DILocalVariable(name: "data", arg: 2, scope: !604, file: !15, line: 528, type: !607)
!614 = !DILocalVariable(name: "lengths", arg: 3, scope: !604, file: !15, line: 528, type: !609)
!615 = !DILocalVariable(name: "destination", arg: 4, scope: !604, file: !15, line: 528, type: !8)
!616 = !DILocalVariable(name: "a0", scope: !617, file: !15, line: 529, type: !13)
!617 = distinct !DILexicalBlock(scope: !618, file: !15, line: 529, column: 8)
!618 = distinct !DILexicalBlock(scope: !604, file: !15, line: 528, column: 167)
!619 = !DILocalVariable(name: "a1", scope: !617, file: !15, line: 529, type: !13)
!620 = !DILocalVariable(name: "a2", scope: !617, file: !15, line: 529, type: !10)
!621 = !DILocalVariable(name: "a3", scope: !617, file: !15, line: 529, type: !10)
!622 = !DILocation(line: 0, scope: !111, inlinedAt: !623)
!623 = distinct !DILocation(line: 529, column: 87, scope: !617)
!624 = !DILocation(line: 0, scope: !111, inlinedAt: !625)
!625 = distinct !DILocation(line: 529, column: 132, scope: !617)
!626 = !DILocation(line: 0, scope: !604)
!627 = !DILocation(line: 528, column: 151, scope: !604)
!628 = !DILocation(line: 529, column: 34, scope: !617)
!629 = !{!241, !241, i64 0}
!630 = !DILocation(line: 0, scope: !617)
!631 = !DILocation(line: 529, column: 100, scope: !617)
!632 = !DILocation(line: 0, scope: !123, inlinedAt: !623)
!633 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !623)
!634 = !DILocation(line: 529, column: 145, scope: !617)
!635 = !DILocation(line: 0, scope: !123, inlinedAt: !625)
!636 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !625)
!637 = !DILocation(line: 529, column: 242, scope: !617)
!638 = !DILocation(line: 529, column: 287, scope: !617)
!639 = !DILocation(line: 409, column: 19, scope: !510, inlinedAt: !640)
!640 = distinct !DILocation(line: 529, column: 172, scope: !617)
!641 = !DILocation(line: 0, scope: !495, inlinedAt: !640)
!642 = !DILocation(line: 0, scope: !507, inlinedAt: !640)
!643 = !DILocation(line: 409, column: 1, scope: !507, inlinedAt: !640)
!644 = !DILocation(line: 0, scope: !509, inlinedAt: !640)
!645 = !DILocation(line: 412, column: 13, scope: !509, inlinedAt: !640)
!646 = !DILocation(line: 452, column: 14, scope: !509, inlinedAt: !640)
!647 = !DILocation(line: 433, column: 8, scope: !574, inlinedAt: !640)
!648 = !DILocation(line: 471, column: 10, scope: !539, inlinedAt: !640)
!649 = !DILocation(line: 471, column: 5, scope: !539, inlinedAt: !640)
!650 = !DILocation(line: 499, column: 10, scope: !553, inlinedAt: !640)
!651 = !DILocation(line: 499, column: 5, scope: !553, inlinedAt: !640)
!652 = !DILocation(line: 435, column: 18, scope: !580, inlinedAt: !640)
!653 = !DILocation(line: 445, column: 18, scope: !582, inlinedAt: !640)
!654 = !DILocation(line: 448, column: 19, scope: !509, inlinedAt: !640)
!655 = !DILocation(line: 0, scope: !552, inlinedAt: !640)
!656 = !DILocation(line: 507, column: 18, scope: !587, inlinedAt: !640)
!657 = !DILocation(line: 0, scope: !588, inlinedAt: !640)
!658 = !DILocation(line: 510, column: 10, scope: !552, inlinedAt: !640)
!659 = !DILocation(line: 511, column: 1, scope: !552, inlinedAt: !640)
!660 = !DILocation(line: 0, scope: !558, inlinedAt: !640)
!661 = !DILocation(line: 519, column: 18, scope: !594, inlinedAt: !640)
!662 = !DILocation(line: 0, scope: !595, inlinedAt: !640)
!663 = !DILocation(line: 522, column: 10, scope: !558, inlinedAt: !640)
!664 = !DILocation(line: 0, scope: !553, inlinedAt: !640)
!665 = !DILocation(line: 524, column: 1, scope: !509, inlinedAt: !640)
!666 = !DILocation(line: 524, column: 12, scope: !509, inlinedAt: !640)
!667 = !DILocation(line: 409, column: 29, scope: !510, inlinedAt: !640)
!668 = distinct !{!668, !643, !669, !137}
!669 = !DILocation(line: 525, column: 1, scope: !507, inlinedAt: !640)
!670 = !DILocation(line: 530, column: 30, scope: !604)
!671 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !672)
!672 = distinct !DILocation(line: 530, column: 9, scope: !618)
!673 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !672)
!674 = distinct !DISubprogram(name: "ink_compute_call", scope: !15, file: !15, line: 531, type: !675, scopeLine: 531, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !679)
!675 = !DISubroutineType(types: !676)
!676 = !{null, !10, !607, !609, !677, !678}
!677 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !8, size: 32)
!678 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !5, size: 32)
!679 = !{!680, !681, !682, !683, !684, !685, !688, !689, !690, !691, !692, !694, !695, !696, !697, !698, !699, !701, !702, !703, !704, !705, !706, !708, !709, !710, !711, !712, !713, !715, !716, !717, !718, !719, !720, !722, !723, !724, !725, !726, !727, !729, !730, !731, !732, !733}
!680 = !DILocalVariable(name: "function", arg: 1, scope: !674, file: !15, line: 531, type: !10)
!681 = !DILocalVariable(name: "data", arg: 2, scope: !674, file: !15, line: 531, type: !607)
!682 = !DILocalVariable(name: "lengths", arg: 3, scope: !674, file: !15, line: 531, type: !609)
!683 = !DILocalVariable(name: "output", arg: 4, scope: !674, file: !15, line: 531, type: !677)
!684 = !DILocalVariable(name: "count", arg: 5, scope: !674, file: !15, line: 531, type: !678)
!685 = !DILocalVariable(name: "a0", scope: !686, file: !15, line: 532, type: !13)
!686 = distinct !DILexicalBlock(scope: !687, file: !15, line: 532, column: 8)
!687 = distinct !DILexicalBlock(scope: !674, file: !15, line: 531, column: 158)
!688 = !DILocalVariable(name: "a1", scope: !686, file: !15, line: 532, type: !13)
!689 = !DILocalVariable(name: "a2", scope: !686, file: !15, line: 532, type: !10)
!690 = !DILocalVariable(name: "a3", scope: !686, file: !15, line: 532, type: !10)
!691 = !DILocalVariable(name: "result", scope: !686, file: !15, line: 532, type: !167)
!692 = !DILocalVariable(name: "a0", scope: !693, file: !15, line: 533, type: !10)
!693 = distinct !DILexicalBlock(scope: !687, file: !15, line: 533, column: 8)
!694 = !DILocalVariable(name: "a1", scope: !693, file: !15, line: 533, type: !10)
!695 = !DILocalVariable(name: "a2", scope: !693, file: !15, line: 533, type: !10)
!696 = !DILocalVariable(name: "a3", scope: !693, file: !15, line: 533, type: !10)
!697 = !DILocalVariable(name: "result", scope: !693, file: !15, line: 533, type: !10)
!698 = !DILocalVariable(name: "copy", scope: !693, file: !15, line: 533, type: !13)
!699 = !DILocalVariable(name: "a0", scope: !700, file: !15, line: 534, type: !10)
!700 = distinct !DILexicalBlock(scope: !687, file: !15, line: 534, column: 8)
!701 = !DILocalVariable(name: "a1", scope: !700, file: !15, line: 534, type: !10)
!702 = !DILocalVariable(name: "a2", scope: !700, file: !15, line: 534, type: !10)
!703 = !DILocalVariable(name: "a3", scope: !700, file: !15, line: 534, type: !10)
!704 = !DILocalVariable(name: "result", scope: !700, file: !15, line: 534, type: !10)
!705 = !DILocalVariable(name: "copy", scope: !700, file: !15, line: 534, type: !13)
!706 = !DILocalVariable(name: "a0", scope: !707, file: !15, line: 535, type: !10)
!707 = distinct !DILexicalBlock(scope: !687, file: !15, line: 535, column: 8)
!708 = !DILocalVariable(name: "a1", scope: !707, file: !15, line: 535, type: !10)
!709 = !DILocalVariable(name: "a2", scope: !707, file: !15, line: 535, type: !10)
!710 = !DILocalVariable(name: "a3", scope: !707, file: !15, line: 535, type: !10)
!711 = !DILocalVariable(name: "result", scope: !707, file: !15, line: 535, type: !10)
!712 = !DILocalVariable(name: "copy", scope: !707, file: !15, line: 535, type: !13)
!713 = !DILocalVariable(name: "a0", scope: !714, file: !15, line: 536, type: !10)
!714 = distinct !DILexicalBlock(scope: !687, file: !15, line: 536, column: 8)
!715 = !DILocalVariable(name: "a1", scope: !714, file: !15, line: 536, type: !10)
!716 = !DILocalVariable(name: "a2", scope: !714, file: !15, line: 536, type: !10)
!717 = !DILocalVariable(name: "a3", scope: !714, file: !15, line: 536, type: !10)
!718 = !DILocalVariable(name: "result", scope: !714, file: !15, line: 536, type: !10)
!719 = !DILocalVariable(name: "copy", scope: !714, file: !15, line: 536, type: !13)
!720 = !DILocalVariable(name: "a0", scope: !721, file: !15, line: 537, type: !10)
!721 = distinct !DILexicalBlock(scope: !687, file: !15, line: 537, column: 8)
!722 = !DILocalVariable(name: "a1", scope: !721, file: !15, line: 537, type: !10)
!723 = !DILocalVariable(name: "a2", scope: !721, file: !15, line: 537, type: !10)
!724 = !DILocalVariable(name: "a3", scope: !721, file: !15, line: 537, type: !10)
!725 = !DILocalVariable(name: "result", scope: !721, file: !15, line: 537, type: !10)
!726 = !DILocalVariable(name: "copy", scope: !721, file: !15, line: 537, type: !13)
!727 = !DILocalVariable(name: "a0", scope: !728, file: !15, line: 538, type: !10)
!728 = distinct !DILexicalBlock(scope: !687, file: !15, line: 538, column: 8)
!729 = !DILocalVariable(name: "a1", scope: !728, file: !15, line: 538, type: !10)
!730 = !DILocalVariable(name: "a2", scope: !728, file: !15, line: 538, type: !10)
!731 = !DILocalVariable(name: "a3", scope: !728, file: !15, line: 538, type: !10)
!732 = !DILocalVariable(name: "result", scope: !728, file: !15, line: 538, type: !10)
!733 = !DILocalVariable(name: "copy", scope: !728, file: !15, line: 538, type: !13)
!734 = !DILocation(line: 0, scope: !111, inlinedAt: !735)
!735 = distinct !DILocation(line: 532, column: 87, scope: !686)
!736 = !DILocation(line: 0, scope: !111, inlinedAt: !737)
!737 = distinct !DILocation(line: 532, column: 132, scope: !686)
!738 = !DILocation(line: 0, scope: !111, inlinedAt: !739)
!739 = distinct !DILocation(line: 533, column: 21, scope: !693)
!740 = !DILocation(line: 0, scope: !111, inlinedAt: !741)
!741 = distinct !DILocation(line: 533, column: 66, scope: !693)
!742 = !DILocation(line: 0, scope: !111, inlinedAt: !743)
!743 = distinct !DILocation(line: 533, column: 111, scope: !693)
!744 = !DILocation(line: 0, scope: !111, inlinedAt: !745)
!745 = distinct !DILocation(line: 533, column: 156, scope: !693)
!746 = !DILocation(line: 0, scope: !111, inlinedAt: !747)
!747 = distinct !DILocation(line: 534, column: 21, scope: !700)
!748 = !DILocation(line: 0, scope: !111, inlinedAt: !749)
!749 = distinct !DILocation(line: 534, column: 66, scope: !700)
!750 = !DILocation(line: 0, scope: !111, inlinedAt: !751)
!751 = distinct !DILocation(line: 534, column: 111, scope: !700)
!752 = !DILocation(line: 0, scope: !111, inlinedAt: !753)
!753 = distinct !DILocation(line: 534, column: 156, scope: !700)
!754 = !DILocation(line: 0, scope: !111, inlinedAt: !755)
!755 = distinct !DILocation(line: 535, column: 21, scope: !707)
!756 = !DILocation(line: 0, scope: !111, inlinedAt: !757)
!757 = distinct !DILocation(line: 535, column: 66, scope: !707)
!758 = !DILocation(line: 0, scope: !111, inlinedAt: !759)
!759 = distinct !DILocation(line: 535, column: 111, scope: !707)
!760 = !DILocation(line: 0, scope: !111, inlinedAt: !761)
!761 = distinct !DILocation(line: 535, column: 156, scope: !707)
!762 = !DILocation(line: 0, scope: !111, inlinedAt: !763)
!763 = distinct !DILocation(line: 536, column: 21, scope: !714)
!764 = !DILocation(line: 0, scope: !111, inlinedAt: !765)
!765 = distinct !DILocation(line: 536, column: 66, scope: !714)
!766 = !DILocation(line: 0, scope: !111, inlinedAt: !767)
!767 = distinct !DILocation(line: 536, column: 111, scope: !714)
!768 = !DILocation(line: 0, scope: !111, inlinedAt: !769)
!769 = distinct !DILocation(line: 536, column: 156, scope: !714)
!770 = !DILocation(line: 0, scope: !111, inlinedAt: !771)
!771 = distinct !DILocation(line: 537, column: 21, scope: !721)
!772 = !DILocation(line: 0, scope: !111, inlinedAt: !773)
!773 = distinct !DILocation(line: 537, column: 66, scope: !721)
!774 = !DILocation(line: 0, scope: !111, inlinedAt: !775)
!775 = distinct !DILocation(line: 537, column: 156, scope: !721)
!776 = !DILocation(line: 0, scope: !111, inlinedAt: !777)
!777 = distinct !DILocation(line: 538, column: 21, scope: !728)
!778 = !DILocation(line: 0, scope: !111, inlinedAt: !779)
!779 = distinct !DILocation(line: 538, column: 66, scope: !728)
!780 = !DILocation(line: 0, scope: !111, inlinedAt: !781)
!781 = distinct !DILocation(line: 538, column: 156, scope: !728)
!782 = !DILocation(line: 0, scope: !674)
!783 = !DILocation(line: 531, column: 142, scope: !674)
!784 = !DILocation(line: 532, column: 34, scope: !686)
!785 = !DILocation(line: 0, scope: !686)
!786 = !DILocation(line: 532, column: 100, scope: !686)
!787 = !DILocation(line: 0, scope: !123, inlinedAt: !735)
!788 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !735)
!789 = !DILocation(line: 532, column: 145, scope: !686)
!790 = !DILocation(line: 0, scope: !123, inlinedAt: !737)
!791 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !737)
!792 = !DILocation(line: 532, column: 250, scope: !686)
!793 = !DILocation(line: 532, column: 295, scope: !686)
!794 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !795)
!795 = distinct !DILocation(line: 92, column: 18, scope: !164, inlinedAt: !796)
!796 = distinct !DILocation(line: 532, column: 185, scope: !686)
!797 = !DILocation(line: 0, scope: !164, inlinedAt: !796)
!798 = !DILocation(line: 0, scope: !51, inlinedAt: !795)
!799 = !{!800}
!800 = distinct !{!800, !801, !"lang_fn_pipeline38_left_padded_zip_heldout_u32: argument 0"}
!801 = distinct !{!801, !"lang_fn_pipeline38_left_padded_zip_heldout_u32"}
!802 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !795)
!803 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !804)
!804 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !795)
!805 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !804)
!806 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !795)
!807 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !795)
!808 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !795)
!809 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !795)
!810 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !795)
!811 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !795)
!812 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !795)
!813 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !795)
!814 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !815)
!815 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !795)
!816 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !815)
!817 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !795)
!818 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !795)
!819 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !795)
!820 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !795)
!821 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !795)
!822 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !795)
!823 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !795)
!824 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !795)
!825 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !795)
!826 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !795)
!827 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !828)
!828 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !795)
!829 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !828)
!830 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !795)
!831 = !DILocation(line: 0, scope: !180, inlinedAt: !796)
!832 = !DILocation(line: 93, column: 19, scope: !183, inlinedAt: !796)
!833 = !DILocation(line: 93, column: 1, scope: !180, inlinedAt: !796)
!834 = !DILocation(line: 0, scope: !182, inlinedAt: !796)
!835 = !DILocation(line: 96, column: 13, scope: !182, inlinedAt: !796)
!836 = !DILocation(line: 136, column: 14, scope: !182, inlinedAt: !796)
!837 = !DILocation(line: 117, column: 8, scope: !289, inlinedAt: !796)
!838 = !DILocation(line: 155, column: 10, scope: !212, inlinedAt: !796)
!839 = !DILocation(line: 155, column: 5, scope: !212, inlinedAt: !796)
!840 = !DILocation(line: 183, column: 10, scope: !226, inlinedAt: !796)
!841 = !DILocation(line: 183, column: 5, scope: !226, inlinedAt: !796)
!842 = !DILocation(line: 119, column: 18, scope: !295, inlinedAt: !796)
!843 = !DILocation(line: 129, column: 18, scope: !297, inlinedAt: !796)
!844 = !DILocation(line: 132, column: 19, scope: !182, inlinedAt: !796)
!845 = !DILocation(line: 0, scope: !225, inlinedAt: !796)
!846 = !DILocation(line: 191, column: 18, scope: !302, inlinedAt: !796)
!847 = !DILocation(line: 0, scope: !303, inlinedAt: !796)
!848 = !DILocation(line: 194, column: 10, scope: !225, inlinedAt: !796)
!849 = !DILocation(line: 195, column: 1, scope: !225, inlinedAt: !796)
!850 = !DILocation(line: 0, scope: !231, inlinedAt: !796)
!851 = !DILocation(line: 203, column: 18, scope: !309, inlinedAt: !796)
!852 = !DILocation(line: 0, scope: !310, inlinedAt: !796)
!853 = !DILocation(line: 206, column: 10, scope: !231, inlinedAt: !796)
!854 = !DILocation(line: 0, scope: !226, inlinedAt: !796)
!855 = !DILocation(line: 208, column: 1, scope: !182, inlinedAt: !796)
!856 = !DILocation(line: 208, column: 12, scope: !182, inlinedAt: !796)
!857 = !DILocation(line: 93, column: 29, scope: !183, inlinedAt: !796)
!858 = distinct !{!858, !833, !859, !137}
!859 = !DILocation(line: 209, column: 1, scope: !180, inlinedAt: !796)
!860 = !DILocation(line: 0, scope: !693)
!861 = !DILocation(line: 0, scope: !123, inlinedAt: !739)
!862 = !DILocation(line: 0, scope: !123, inlinedAt: !741)
!863 = !DILocation(line: 533, column: 124, scope: !693)
!864 = !DILocation(line: 0, scope: !123, inlinedAt: !743)
!865 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !743)
!866 = !DILocation(line: 533, column: 169, scope: !693)
!867 = !DILocation(line: 0, scope: !123, inlinedAt: !745)
!868 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !745)
!869 = !DILocation(line: 533, column: 232, scope: !693)
!870 = !DILocation(line: 231, column: 7, scope: !341, inlinedAt: !871)
!871 = distinct !DILocation(line: 533, column: 205, scope: !693)
!872 = !DILocation(line: 0, scope: !319, inlinedAt: !871)
!873 = !DILocation(line: 533, column: 79, scope: !693)
!874 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !741)
!875 = !DILocation(line: 533, column: 34, scope: !693)
!876 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !739)
!877 = !DILocation(line: 533, column: 223, scope: !693)
!878 = !DILocation(line: 233, column: 16, scope: !343, inlinedAt: !871)
!879 = !DILocation(line: 243, column: 17, scope: !345, inlinedAt: !871)
!880 = !DILocation(line: 244, column: 18, scope: !319, inlinedAt: !871)
!881 = !DILocation(line: 246, column: 13, scope: !319, inlinedAt: !871)
!882 = !DILocation(line: 0, scope: !51, inlinedAt: !883)
!883 = distinct !DILocation(line: 533, column: 251, scope: !693)
!884 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !883)
!885 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !886)
!886 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !883)
!887 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !886)
!888 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !883)
!889 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !883)
!890 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !883)
!891 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !883)
!892 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !883)
!893 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !883)
!894 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !883)
!895 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !883)
!896 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !883)
!897 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !883)
!898 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !883)
!899 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !883)
!900 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !883)
!901 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !883)
!902 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !903)
!903 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !883)
!904 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !903)
!905 = !DILocation(line: 0, scope: !700)
!906 = !DILocation(line: 0, scope: !123, inlinedAt: !747)
!907 = !DILocation(line: 0, scope: !123, inlinedAt: !749)
!908 = !DILocation(line: 534, column: 124, scope: !700)
!909 = !DILocation(line: 0, scope: !123, inlinedAt: !751)
!910 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !751)
!911 = !DILocation(line: 534, column: 169, scope: !700)
!912 = !DILocation(line: 0, scope: !123, inlinedAt: !753)
!913 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !753)
!914 = !DILocation(line: 534, column: 234, scope: !700)
!915 = !DILocation(line: 258, column: 7, scope: !366, inlinedAt: !916)
!916 = distinct !DILocation(line: 534, column: 205, scope: !700)
!917 = !DILocation(line: 0, scope: !350, inlinedAt: !916)
!918 = !DILocation(line: 534, column: 79, scope: !700)
!919 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !749)
!920 = !DILocation(line: 534, column: 34, scope: !700)
!921 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !747)
!922 = !DILocation(line: 534, column: 225, scope: !700)
!923 = !DILocation(line: 260, column: 16, scope: !368, inlinedAt: !916)
!924 = !DILocation(line: 270, column: 16, scope: !370, inlinedAt: !916)
!925 = !DILocation(line: 271, column: 17, scope: !350, inlinedAt: !916)
!926 = !DILocation(line: 273, column: 12, scope: !350, inlinedAt: !916)
!927 = !DILocation(line: 0, scope: !51, inlinedAt: !928)
!928 = distinct !DILocation(line: 534, column: 253, scope: !700)
!929 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !928)
!930 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !931)
!931 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !928)
!932 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !931)
!933 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !928)
!934 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !928)
!935 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !928)
!936 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !928)
!937 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !928)
!938 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !928)
!939 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !928)
!940 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !928)
!941 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !928)
!942 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !928)
!943 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !928)
!944 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !928)
!945 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !928)
!946 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !928)
!947 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !948)
!948 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !928)
!949 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !948)
!950 = !DILocation(line: 535, column: 34, scope: !707)
!951 = !DILocation(line: 0, scope: !123, inlinedAt: !755)
!952 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !755)
!953 = !DILocation(line: 0, scope: !707)
!954 = !DILocation(line: 535, column: 79, scope: !707)
!955 = !DILocation(line: 0, scope: !123, inlinedAt: !757)
!956 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !757)
!957 = !DILocation(line: 535, column: 124, scope: !707)
!958 = !DILocation(line: 0, scope: !123, inlinedAt: !759)
!959 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !759)
!960 = !DILocation(line: 535, column: 169, scope: !707)
!961 = !DILocation(line: 0, scope: !123, inlinedAt: !761)
!962 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !761)
!963 = !DILocation(line: 535, column: 227, scope: !707)
!964 = !DILocation(line: 535, column: 230, scope: !707)
!965 = !DILocation(line: 535, column: 233, scope: !707)
!966 = !DILocation(line: 292, column: 9, scope: !389, inlinedAt: !967)
!967 = distinct !DILocation(line: 535, column: 205, scope: !707)
!968 = !DILocation(line: 0, scope: !375, inlinedAt: !967)
!969 = !DILocation(line: 292, column: 5, scope: !389, inlinedAt: !967)
!970 = !DILocation(line: 0, scope: !51, inlinedAt: !971)
!971 = distinct !DILocation(line: 535, column: 252, scope: !707)
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
!993 = !DILocation(line: 536, column: 34, scope: !714)
!994 = !DILocation(line: 0, scope: !123, inlinedAt: !763)
!995 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !763)
!996 = !DILocation(line: 0, scope: !714)
!997 = !DILocation(line: 536, column: 79, scope: !714)
!998 = !DILocation(line: 0, scope: !123, inlinedAt: !765)
!999 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !765)
!1000 = !DILocation(line: 536, column: 124, scope: !714)
!1001 = !DILocation(line: 0, scope: !123, inlinedAt: !767)
!1002 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !767)
!1003 = !DILocation(line: 536, column: 169, scope: !714)
!1004 = !DILocation(line: 0, scope: !123, inlinedAt: !769)
!1005 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !769)
!1006 = !DILocation(line: 536, column: 229, scope: !714)
!1007 = !DILocation(line: 536, column: 232, scope: !714)
!1008 = !DILocation(line: 536, column: 235, scope: !714)
!1009 = !DILocation(line: 311, column: 9, scope: !406, inlinedAt: !1010)
!1010 = distinct !DILocation(line: 536, column: 205, scope: !714)
!1011 = !DILocation(line: 0, scope: !396, inlinedAt: !1010)
!1012 = !DILocation(line: 311, column: 5, scope: !406, inlinedAt: !1010)
!1013 = !DILocation(line: 0, scope: !51, inlinedAt: !1014)
!1014 = distinct !DILocation(line: 536, column: 254, scope: !714)
!1015 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1014)
!1016 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1017)
!1017 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1014)
!1018 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1017)
!1019 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1014)
!1020 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1014)
!1021 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1014)
!1022 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1014)
!1023 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1014)
!1024 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1014)
!1025 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1014)
!1026 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1014)
!1027 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1014)
!1028 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1014)
!1029 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1014)
!1030 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1014)
!1031 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1014)
!1032 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1014)
!1033 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1034)
!1034 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1014)
!1035 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1034)
!1036 = !DILocation(line: 537, column: 34, scope: !721)
!1037 = !DILocation(line: 0, scope: !123, inlinedAt: !771)
!1038 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !771)
!1039 = !DILocation(line: 0, scope: !721)
!1040 = !DILocation(line: 537, column: 79, scope: !721)
!1041 = !DILocation(line: 0, scope: !123, inlinedAt: !773)
!1042 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !773)
!1043 = !DILocation(line: 0, scope: !123, inlinedAt: !1044)
!1044 = distinct !DILocation(line: 537, column: 111, scope: !721)
!1045 = !DILocation(line: 537, column: 169, scope: !721)
!1046 = !DILocation(line: 0, scope: !123, inlinedAt: !775)
!1047 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !775)
!1048 = !DILocation(line: 537, column: 226, scope: !721)
!1049 = !DILocation(line: 537, column: 232, scope: !721)
!1050 = !DILocation(line: 339, column: 9, scope: !427, inlinedAt: !1051)
!1051 = distinct !DILocation(line: 537, column: 205, scope: !721)
!1052 = !DILocation(line: 0, scope: !413, inlinedAt: !1051)
!1053 = !DILocation(line: 0, scope: !427, inlinedAt: !1051)
!1054 = !DILocation(line: 339, column: 5, scope: !427, inlinedAt: !1051)
!1055 = !DILocation(line: 0, scope: !426, inlinedAt: !1051)
!1056 = !DILocation(line: 345, column: 7, scope: !442, inlinedAt: !1051)
!1057 = !DILocation(line: 347, column: 16, scope: !444, inlinedAt: !1051)
!1058 = !DILocation(line: 0, scope: !442, inlinedAt: !1051)
!1059 = !DILocation(line: 350, column: 8, scope: !426, inlinedAt: !1051)
!1060 = !DILocation(line: 351, column: 1, scope: !426, inlinedAt: !1051)
!1061 = !DILocation(line: 0, scope: !432, inlinedAt: !1051)
!1062 = !DILocation(line: 357, column: 8, scope: !450, inlinedAt: !1051)
!1063 = !DILocation(line: 359, column: 18, scope: !452, inlinedAt: !1051)
!1064 = !DILocation(line: 0, scope: !450, inlinedAt: !1051)
!1065 = !DILocation(line: 362, column: 9, scope: !432, inlinedAt: !1051)
!1066 = !DILocation(line: 0, scope: !51, inlinedAt: !1067)
!1067 = distinct !DILocation(line: 537, column: 251, scope: !721)
!1068 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1067)
!1069 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1070)
!1070 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1067)
!1071 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1070)
!1072 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1067)
!1073 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1067)
!1074 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1067)
!1075 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1067)
!1076 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1067)
!1077 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1067)
!1078 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1067)
!1079 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1067)
!1080 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1067)
!1081 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1067)
!1082 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1067)
!1083 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1067)
!1084 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1067)
!1085 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1067)
!1086 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1087)
!1087 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1067)
!1088 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1087)
!1089 = !DILocation(line: 538, column: 34, scope: !728)
!1090 = !DILocation(line: 0, scope: !123, inlinedAt: !777)
!1091 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !777)
!1092 = !DILocation(line: 0, scope: !728)
!1093 = !DILocation(line: 538, column: 79, scope: !728)
!1094 = !DILocation(line: 0, scope: !123, inlinedAt: !779)
!1095 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !779)
!1096 = !DILocation(line: 0, scope: !123, inlinedAt: !1097)
!1097 = distinct !DILocation(line: 538, column: 111, scope: !728)
!1098 = !DILocation(line: 538, column: 169, scope: !728)
!1099 = !DILocation(line: 0, scope: !123, inlinedAt: !781)
!1100 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !781)
!1101 = !DILocation(line: 538, column: 228, scope: !728)
!1102 = !DILocation(line: 538, column: 234, scope: !728)
!1103 = !DILocation(line: 374, column: 9, scope: !466, inlinedAt: !1104)
!1104 = distinct !DILocation(line: 538, column: 205, scope: !728)
!1105 = !DILocation(line: 0, scope: !456, inlinedAt: !1104)
!1106 = !DILocation(line: 0, scope: !466, inlinedAt: !1104)
!1107 = !DILocation(line: 374, column: 5, scope: !466, inlinedAt: !1104)
!1108 = !DILocation(line: 0, scope: !465, inlinedAt: !1104)
!1109 = !DILocation(line: 380, column: 7, scope: !481, inlinedAt: !1104)
!1110 = !DILocation(line: 382, column: 16, scope: !483, inlinedAt: !1104)
!1111 = !DILocation(line: 0, scope: !481, inlinedAt: !1104)
!1112 = !DILocation(line: 385, column: 8, scope: !465, inlinedAt: !1104)
!1113 = !DILocation(line: 386, column: 1, scope: !465, inlinedAt: !1104)
!1114 = !DILocation(line: 0, scope: !471, inlinedAt: !1104)
!1115 = !DILocation(line: 392, column: 7, scope: !489, inlinedAt: !1104)
!1116 = !DILocation(line: 394, column: 16, scope: !491, inlinedAt: !1104)
!1117 = !DILocation(line: 0, scope: !489, inlinedAt: !1104)
!1118 = !DILocation(line: 397, column: 8, scope: !471, inlinedAt: !1104)
!1119 = !DILocation(line: 0, scope: !51, inlinedAt: !1120)
!1120 = distinct !DILocation(line: 538, column: 253, scope: !728)
!1121 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1120)
!1122 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1123)
!1123 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1120)
!1124 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1123)
!1125 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1120)
!1126 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1120)
!1127 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1120)
!1128 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1120)
!1129 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1120)
!1130 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1120)
!1131 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1120)
!1132 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1120)
!1133 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1120)
!1134 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1120)
!1135 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1120)
!1136 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1120)
!1137 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1120)
!1138 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1120)
!1139 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1140)
!1140 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1120)
!1141 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1140)
!1142 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1143)
!1143 = distinct !DILocation(line: 539, column: 9, scope: !687)
!1144 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1143)
!1145 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !1146)
!1146 = !DILocation(line: 0, scope: !687)
!1147 = !DILocation(line: 539, column: 21, scope: !674)
!1148 = distinct !DISubprogram(name: "ink_compute_scalar32", scope: !15, file: !15, line: 540, type: !1149, scopeLine: 540, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !1151)
!1149 = !DISubroutineType(types: !1150)
!1150 = !{!10, !10, !607, !609}
!1151 = !{!1152, !1153, !1154, !1155, !1158, !1159, !1160, !1161, !1162, !1164, !1165, !1166, !1167, !1168, !1170, !1171, !1172, !1173, !1174, !1176, !1177, !1178, !1179, !1180, !1182, !1183, !1184, !1185, !1186, !1188, !1189, !1190, !1191}
!1152 = !DILocalVariable(name: "function", arg: 1, scope: !1148, file: !15, line: 540, type: !10)
!1153 = !DILocalVariable(name: "data", arg: 2, scope: !1148, file: !15, line: 540, type: !607)
!1154 = !DILocalVariable(name: "lengths", arg: 3, scope: !1148, file: !15, line: 540, type: !609)
!1155 = !DILocalVariable(name: "a0", scope: !1156, file: !15, line: 541, type: !10)
!1156 = distinct !DILexicalBlock(scope: !1157, file: !15, line: 541, column: 8)
!1157 = distinct !DILexicalBlock(scope: !1148, file: !15, line: 540, column: 138)
!1158 = !DILocalVariable(name: "a1", scope: !1156, file: !15, line: 541, type: !10)
!1159 = !DILocalVariable(name: "a2", scope: !1156, file: !15, line: 541, type: !10)
!1160 = !DILocalVariable(name: "a3", scope: !1156, file: !15, line: 541, type: !10)
!1161 = !DILocalVariable(name: "result", scope: !1156, file: !15, line: 541, type: !10)
!1162 = !DILocalVariable(name: "a0", scope: !1163, file: !15, line: 542, type: !10)
!1163 = distinct !DILexicalBlock(scope: !1157, file: !15, line: 542, column: 8)
!1164 = !DILocalVariable(name: "a1", scope: !1163, file: !15, line: 542, type: !10)
!1165 = !DILocalVariable(name: "a2", scope: !1163, file: !15, line: 542, type: !10)
!1166 = !DILocalVariable(name: "a3", scope: !1163, file: !15, line: 542, type: !10)
!1167 = !DILocalVariable(name: "result", scope: !1163, file: !15, line: 542, type: !10)
!1168 = !DILocalVariable(name: "a0", scope: !1169, file: !15, line: 543, type: !10)
!1169 = distinct !DILexicalBlock(scope: !1157, file: !15, line: 543, column: 8)
!1170 = !DILocalVariable(name: "a1", scope: !1169, file: !15, line: 543, type: !10)
!1171 = !DILocalVariable(name: "a2", scope: !1169, file: !15, line: 543, type: !10)
!1172 = !DILocalVariable(name: "a3", scope: !1169, file: !15, line: 543, type: !10)
!1173 = !DILocalVariable(name: "result", scope: !1169, file: !15, line: 543, type: !10)
!1174 = !DILocalVariable(name: "a0", scope: !1175, file: !15, line: 544, type: !10)
!1175 = distinct !DILexicalBlock(scope: !1157, file: !15, line: 544, column: 8)
!1176 = !DILocalVariable(name: "a1", scope: !1175, file: !15, line: 544, type: !10)
!1177 = !DILocalVariable(name: "a2", scope: !1175, file: !15, line: 544, type: !10)
!1178 = !DILocalVariable(name: "a3", scope: !1175, file: !15, line: 544, type: !10)
!1179 = !DILocalVariable(name: "result", scope: !1175, file: !15, line: 544, type: !10)
!1180 = !DILocalVariable(name: "a0", scope: !1181, file: !15, line: 545, type: !10)
!1181 = distinct !DILexicalBlock(scope: !1157, file: !15, line: 545, column: 8)
!1182 = !DILocalVariable(name: "a1", scope: !1181, file: !15, line: 545, type: !10)
!1183 = !DILocalVariable(name: "a2", scope: !1181, file: !15, line: 545, type: !10)
!1184 = !DILocalVariable(name: "a3", scope: !1181, file: !15, line: 545, type: !10)
!1185 = !DILocalVariable(name: "result", scope: !1181, file: !15, line: 545, type: !10)
!1186 = !DILocalVariable(name: "a0", scope: !1187, file: !15, line: 546, type: !10)
!1187 = distinct !DILexicalBlock(scope: !1157, file: !15, line: 546, column: 8)
!1188 = !DILocalVariable(name: "a1", scope: !1187, file: !15, line: 546, type: !10)
!1189 = !DILocalVariable(name: "a2", scope: !1187, file: !15, line: 546, type: !10)
!1190 = !DILocalVariable(name: "a3", scope: !1187, file: !15, line: 546, type: !10)
!1191 = !DILocalVariable(name: "result", scope: !1187, file: !15, line: 546, type: !10)
!1192 = !DILocation(line: 0, scope: !111, inlinedAt: !1193)
!1193 = distinct !DILocation(line: 541, column: 21, scope: !1156)
!1194 = !DILocation(line: 0, scope: !111, inlinedAt: !1195)
!1195 = distinct !DILocation(line: 541, column: 66, scope: !1156)
!1196 = !DILocation(line: 0, scope: !111, inlinedAt: !1197)
!1197 = distinct !DILocation(line: 541, column: 111, scope: !1156)
!1198 = !DILocation(line: 0, scope: !111, inlinedAt: !1199)
!1199 = distinct !DILocation(line: 541, column: 156, scope: !1156)
!1200 = !DILocation(line: 0, scope: !111, inlinedAt: !1201)
!1201 = distinct !DILocation(line: 542, column: 21, scope: !1163)
!1202 = !DILocation(line: 0, scope: !111, inlinedAt: !1203)
!1203 = distinct !DILocation(line: 542, column: 66, scope: !1163)
!1204 = !DILocation(line: 0, scope: !111, inlinedAt: !1205)
!1205 = distinct !DILocation(line: 542, column: 111, scope: !1163)
!1206 = !DILocation(line: 0, scope: !111, inlinedAt: !1207)
!1207 = distinct !DILocation(line: 542, column: 156, scope: !1163)
!1208 = !DILocation(line: 0, scope: !111, inlinedAt: !1209)
!1209 = distinct !DILocation(line: 543, column: 21, scope: !1169)
!1210 = !DILocation(line: 0, scope: !111, inlinedAt: !1211)
!1211 = distinct !DILocation(line: 543, column: 66, scope: !1169)
!1212 = !DILocation(line: 0, scope: !111, inlinedAt: !1213)
!1213 = distinct !DILocation(line: 543, column: 111, scope: !1169)
!1214 = !DILocation(line: 0, scope: !111, inlinedAt: !1215)
!1215 = distinct !DILocation(line: 543, column: 156, scope: !1169)
!1216 = !DILocation(line: 0, scope: !111, inlinedAt: !1217)
!1217 = distinct !DILocation(line: 544, column: 21, scope: !1175)
!1218 = !DILocation(line: 0, scope: !111, inlinedAt: !1219)
!1219 = distinct !DILocation(line: 544, column: 66, scope: !1175)
!1220 = !DILocation(line: 0, scope: !111, inlinedAt: !1221)
!1221 = distinct !DILocation(line: 544, column: 111, scope: !1175)
!1222 = !DILocation(line: 0, scope: !111, inlinedAt: !1223)
!1223 = distinct !DILocation(line: 544, column: 156, scope: !1175)
!1224 = !DILocation(line: 0, scope: !111, inlinedAt: !1225)
!1225 = distinct !DILocation(line: 545, column: 21, scope: !1181)
!1226 = !DILocation(line: 0, scope: !111, inlinedAt: !1227)
!1227 = distinct !DILocation(line: 545, column: 66, scope: !1181)
!1228 = !DILocation(line: 0, scope: !111, inlinedAt: !1229)
!1229 = distinct !DILocation(line: 545, column: 156, scope: !1181)
!1230 = !DILocation(line: 0, scope: !111, inlinedAt: !1231)
!1231 = distinct !DILocation(line: 546, column: 21, scope: !1187)
!1232 = !DILocation(line: 0, scope: !111, inlinedAt: !1233)
!1233 = distinct !DILocation(line: 546, column: 66, scope: !1187)
!1234 = !DILocation(line: 0, scope: !111, inlinedAt: !1235)
!1235 = distinct !DILocation(line: 546, column: 156, scope: !1187)
!1236 = !DILocation(line: 0, scope: !1148)
!1237 = !DILocation(line: 540, column: 122, scope: !1148)
!1238 = !DILocation(line: 0, scope: !1156)
!1239 = !DILocation(line: 0, scope: !123, inlinedAt: !1193)
!1240 = !DILocation(line: 0, scope: !123, inlinedAt: !1195)
!1241 = !DILocation(line: 541, column: 124, scope: !1156)
!1242 = !DILocation(line: 0, scope: !123, inlinedAt: !1197)
!1243 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1197)
!1244 = !DILocation(line: 541, column: 169, scope: !1156)
!1245 = !DILocation(line: 0, scope: !123, inlinedAt: !1199)
!1246 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1199)
!1247 = !DILocation(line: 541, column: 232, scope: !1156)
!1248 = !DILocation(line: 231, column: 7, scope: !341, inlinedAt: !1249)
!1249 = distinct !DILocation(line: 541, column: 205, scope: !1156)
!1250 = !DILocation(line: 0, scope: !319, inlinedAt: !1249)
!1251 = !DILocation(line: 541, column: 79, scope: !1156)
!1252 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1195)
!1253 = !DILocation(line: 541, column: 34, scope: !1156)
!1254 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1193)
!1255 = !DILocation(line: 541, column: 223, scope: !1156)
!1256 = !DILocation(line: 233, column: 16, scope: !343, inlinedAt: !1249)
!1257 = !DILocation(line: 243, column: 17, scope: !345, inlinedAt: !1249)
!1258 = !DILocation(line: 244, column: 18, scope: !319, inlinedAt: !1249)
!1259 = !DILocation(line: 246, column: 13, scope: !319, inlinedAt: !1249)
!1260 = !DILocation(line: 0, scope: !1163)
!1261 = !DILocation(line: 0, scope: !123, inlinedAt: !1201)
!1262 = !DILocation(line: 0, scope: !123, inlinedAt: !1203)
!1263 = !DILocation(line: 542, column: 124, scope: !1163)
!1264 = !DILocation(line: 0, scope: !123, inlinedAt: !1205)
!1265 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1205)
!1266 = !DILocation(line: 542, column: 169, scope: !1163)
!1267 = !DILocation(line: 0, scope: !123, inlinedAt: !1207)
!1268 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1207)
!1269 = !DILocation(line: 542, column: 234, scope: !1163)
!1270 = !DILocation(line: 258, column: 7, scope: !366, inlinedAt: !1271)
!1271 = distinct !DILocation(line: 542, column: 205, scope: !1163)
!1272 = !DILocation(line: 0, scope: !350, inlinedAt: !1271)
!1273 = !DILocation(line: 542, column: 79, scope: !1163)
!1274 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1203)
!1275 = !DILocation(line: 542, column: 34, scope: !1163)
!1276 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1201)
!1277 = !DILocation(line: 542, column: 225, scope: !1163)
!1278 = !DILocation(line: 260, column: 16, scope: !368, inlinedAt: !1271)
!1279 = !DILocation(line: 270, column: 16, scope: !370, inlinedAt: !1271)
!1280 = !DILocation(line: 271, column: 17, scope: !350, inlinedAt: !1271)
!1281 = !DILocation(line: 273, column: 12, scope: !350, inlinedAt: !1271)
!1282 = !DILocation(line: 543, column: 34, scope: !1169)
!1283 = !DILocation(line: 0, scope: !123, inlinedAt: !1209)
!1284 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1209)
!1285 = !DILocation(line: 0, scope: !1169)
!1286 = !DILocation(line: 543, column: 79, scope: !1169)
!1287 = !DILocation(line: 0, scope: !123, inlinedAt: !1211)
!1288 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1211)
!1289 = !DILocation(line: 543, column: 124, scope: !1169)
!1290 = !DILocation(line: 0, scope: !123, inlinedAt: !1213)
!1291 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1213)
!1292 = !DILocation(line: 543, column: 169, scope: !1169)
!1293 = !DILocation(line: 0, scope: !123, inlinedAt: !1215)
!1294 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1215)
!1295 = !DILocation(line: 543, column: 227, scope: !1169)
!1296 = !DILocation(line: 543, column: 230, scope: !1169)
!1297 = !DILocation(line: 543, column: 233, scope: !1169)
!1298 = !DILocation(line: 292, column: 9, scope: !389, inlinedAt: !1299)
!1299 = distinct !DILocation(line: 543, column: 205, scope: !1169)
!1300 = !DILocation(line: 0, scope: !375, inlinedAt: !1299)
!1301 = !DILocation(line: 292, column: 5, scope: !389, inlinedAt: !1299)
!1302 = !DILocation(line: 544, column: 34, scope: !1175)
!1303 = !DILocation(line: 0, scope: !123, inlinedAt: !1217)
!1304 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1217)
!1305 = !DILocation(line: 0, scope: !1175)
!1306 = !DILocation(line: 544, column: 79, scope: !1175)
!1307 = !DILocation(line: 0, scope: !123, inlinedAt: !1219)
!1308 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1219)
!1309 = !DILocation(line: 544, column: 124, scope: !1175)
!1310 = !DILocation(line: 0, scope: !123, inlinedAt: !1221)
!1311 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1221)
!1312 = !DILocation(line: 544, column: 169, scope: !1175)
!1313 = !DILocation(line: 0, scope: !123, inlinedAt: !1223)
!1314 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1223)
!1315 = !DILocation(line: 544, column: 229, scope: !1175)
!1316 = !DILocation(line: 544, column: 232, scope: !1175)
!1317 = !DILocation(line: 544, column: 235, scope: !1175)
!1318 = !DILocation(line: 311, column: 9, scope: !406, inlinedAt: !1319)
!1319 = distinct !DILocation(line: 544, column: 205, scope: !1175)
!1320 = !DILocation(line: 0, scope: !396, inlinedAt: !1319)
!1321 = !DILocation(line: 311, column: 5, scope: !406, inlinedAt: !1319)
!1322 = !DILocation(line: 545, column: 34, scope: !1181)
!1323 = !DILocation(line: 0, scope: !123, inlinedAt: !1225)
!1324 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1225)
!1325 = !DILocation(line: 0, scope: !1181)
!1326 = !DILocation(line: 545, column: 79, scope: !1181)
!1327 = !DILocation(line: 0, scope: !123, inlinedAt: !1227)
!1328 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1227)
!1329 = !DILocation(line: 0, scope: !123, inlinedAt: !1330)
!1330 = distinct !DILocation(line: 545, column: 111, scope: !1181)
!1331 = !DILocation(line: 545, column: 169, scope: !1181)
!1332 = !DILocation(line: 0, scope: !123, inlinedAt: !1229)
!1333 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1229)
!1334 = !DILocation(line: 545, column: 226, scope: !1181)
!1335 = !DILocation(line: 545, column: 232, scope: !1181)
!1336 = !DILocation(line: 339, column: 9, scope: !427, inlinedAt: !1337)
!1337 = distinct !DILocation(line: 545, column: 205, scope: !1181)
!1338 = !DILocation(line: 0, scope: !413, inlinedAt: !1337)
!1339 = !DILocation(line: 0, scope: !427, inlinedAt: !1337)
!1340 = !DILocation(line: 339, column: 5, scope: !427, inlinedAt: !1337)
!1341 = !DILocation(line: 0, scope: !426, inlinedAt: !1337)
!1342 = !DILocation(line: 345, column: 7, scope: !442, inlinedAt: !1337)
!1343 = !DILocation(line: 347, column: 16, scope: !444, inlinedAt: !1337)
!1344 = !DILocation(line: 0, scope: !442, inlinedAt: !1337)
!1345 = !DILocation(line: 350, column: 8, scope: !426, inlinedAt: !1337)
!1346 = !DILocation(line: 351, column: 1, scope: !426, inlinedAt: !1337)
!1347 = !DILocation(line: 0, scope: !432, inlinedAt: !1337)
!1348 = !DILocation(line: 357, column: 8, scope: !450, inlinedAt: !1337)
!1349 = !DILocation(line: 359, column: 18, scope: !452, inlinedAt: !1337)
!1350 = !DILocation(line: 0, scope: !450, inlinedAt: !1337)
!1351 = !DILocation(line: 362, column: 9, scope: !432, inlinedAt: !1337)
!1352 = !DILocation(line: 546, column: 34, scope: !1187)
!1353 = !DILocation(line: 0, scope: !123, inlinedAt: !1231)
!1354 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1231)
!1355 = !DILocation(line: 0, scope: !1187)
!1356 = !DILocation(line: 546, column: 79, scope: !1187)
!1357 = !DILocation(line: 0, scope: !123, inlinedAt: !1233)
!1358 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1233)
!1359 = !DILocation(line: 0, scope: !123, inlinedAt: !1360)
!1360 = distinct !DILocation(line: 546, column: 111, scope: !1187)
!1361 = !DILocation(line: 546, column: 169, scope: !1187)
!1362 = !DILocation(line: 0, scope: !123, inlinedAt: !1235)
!1363 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1235)
!1364 = !DILocation(line: 546, column: 228, scope: !1187)
!1365 = !DILocation(line: 546, column: 234, scope: !1187)
!1366 = !DILocation(line: 374, column: 9, scope: !466, inlinedAt: !1367)
!1367 = distinct !DILocation(line: 546, column: 205, scope: !1187)
!1368 = !DILocation(line: 0, scope: !456, inlinedAt: !1367)
!1369 = !DILocation(line: 0, scope: !466, inlinedAt: !1367)
!1370 = !DILocation(line: 374, column: 5, scope: !466, inlinedAt: !1367)
!1371 = !DILocation(line: 0, scope: !465, inlinedAt: !1367)
!1372 = !DILocation(line: 380, column: 7, scope: !481, inlinedAt: !1367)
!1373 = !DILocation(line: 382, column: 16, scope: !483, inlinedAt: !1367)
!1374 = !DILocation(line: 0, scope: !481, inlinedAt: !1367)
!1375 = !DILocation(line: 385, column: 8, scope: !465, inlinedAt: !1367)
!1376 = !DILocation(line: 386, column: 1, scope: !465, inlinedAt: !1367)
!1377 = !DILocation(line: 0, scope: !471, inlinedAt: !1367)
!1378 = !DILocation(line: 392, column: 7, scope: !489, inlinedAt: !1367)
!1379 = !DILocation(line: 394, column: 16, scope: !491, inlinedAt: !1367)
!1380 = !DILocation(line: 0, scope: !489, inlinedAt: !1367)
!1381 = !DILocation(line: 397, column: 8, scope: !471, inlinedAt: !1367)
!1382 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1383)
!1383 = distinct !DILocation(line: 547, column: 9, scope: !1157)
!1384 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1383)
!1385 = !DILocation(line: 547, column: 30, scope: !1148)
!1386 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !15, file: !15, line: 548, type: !1387, scopeLine: 548, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !1391)
!1387 = !DISubroutineType(types: !1388)
!1388 = !{!1389, !10, !607, !609}
!1389 = !DIDerivedType(tag: DW_TAG_typedef, name: "uint64_t", file: !11, line: 102, baseType: !1390)
!1390 = !DIBasicType(name: "unsigned long long", size: 64, encoding: DW_ATE_unsigned)
!1391 = !{!1392, !1393, !1394}
!1392 = !DILocalVariable(name: "function", arg: 1, scope: !1386, file: !15, line: 548, type: !10)
!1393 = !DILocalVariable(name: "data", arg: 2, scope: !1386, file: !15, line: 548, type: !607)
!1394 = !DILocalVariable(name: "lengths", arg: 3, scope: !1386, file: !15, line: 548, type: !609)
!1395 = !DILocation(line: 0, scope: !1386)
!1396 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1397)
!1397 = distinct !DILocation(line: 549, column: 9, scope: !1398)
!1398 = distinct !DILexicalBlock(scope: !1386, file: !15, line: 548, column: 138)
!1399 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1397)
