; ModuleID = '/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_heldout_u32/prior/cpu.c'
source_filename = "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_heldout_u32/prior/cpu.c"
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
define hidden noundef ptr @memset(ptr noundef returned writeonly %0, i32 noundef %1, i32 noundef %2) local_unnamed_addr #7 !dbg !141 {
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
define hidden void @lang_fn_pipeline38_right_padded_zip_heldout_u32(ptr dead_on_unwind noalias nocapture writable writeonly sret(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %1, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %2, i32 noundef %3, i32 noundef %4) local_unnamed_addr #2 !dbg !164 {
    #dbg_declare(ptr %1, !173, !DIExpression(), !252)
    #dbg_declare(ptr %2, !174, !DIExpression(), !253)
    #dbg_value(i32 %3, !175, !DIExpression(), !254)
    #dbg_value(i32 %4, !176, !DIExpression(), !254)
  %6 = load ptr, ptr %1, align 4, !dbg !255, !tbaa !256
  %7 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !255
  %8 = load i32, ptr %7, align 4, !dbg !255, !tbaa !27
    #dbg_value(ptr %6, !177, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !254)
    #dbg_value(i32 %8, !177, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !254)
    #dbg_value(i32 %8, !55, !DIExpression(), !259)
    #dbg_value(i32 4, !56, !DIExpression(), !259)
  %9 = icmp ugt i32 %8, 1073741823, !dbg !261
  %10 = load i32, ptr @ink_top, align 4
  %11 = icmp ugt i32 %10, -8
  %12 = select i1 %9, i1 true, i1 %11, !dbg !262
  br i1 %12, label %13, label %14, !dbg !262

13:                                               ; preds = %5
  tail call void @llvm.trap(), !dbg !263
  unreachable, !dbg !265

14:                                               ; preds = %5
  %15 = icmp eq i32 %10, 0, !dbg !266
  %16 = add nuw i32 %10, 7, !dbg !267
  %17 = select i1 %15, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %16, !dbg !268
  %18 = and i32 %17, -8, !dbg !269
    #dbg_value(i32 %18, !57, !DIExpression(), !259)
  %19 = tail call i32 @llvm.umax.i32(i32 %8, i32 1), !dbg !270
  %20 = shl nuw i32 %19, 2, !dbg !271
    #dbg_value(i32 %20, !58, !DIExpression(), !259)
  %21 = xor i32 %18, -1, !dbg !272
  %22 = icmp ugt i32 %20, %21, !dbg !273
  br i1 %22, label %23, label %24, !dbg !273

23:                                               ; preds = %14
  tail call void @llvm.trap(), !dbg !274
  unreachable, !dbg !276

24:                                               ; preds = %14
  %25 = add i32 %18, %20, !dbg !277
  store i32 %25, ptr @ink_top, align 4, !dbg !278, !tbaa !27
  %26 = add i32 %25, 65535, !dbg !279
  %27 = lshr i32 %26, 16, !dbg !280
    #dbg_value(i32 %27, !59, !DIExpression(), !259)
  %28 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !281
    #dbg_value(i32 %28, !60, !DIExpression(), !259)
  %29 = icmp ugt i32 %27, %28, !dbg !282
  br i1 %29, label %30, label %35, !dbg !283

30:                                               ; preds = %24
  %31 = sub nuw nsw i32 %27, %28, !dbg !284
  %32 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %31), !dbg !285
  %33 = icmp eq i32 %32, -1, !dbg !286
  br i1 %33, label %34, label %35, !dbg !283

34:                                               ; preds = %30
  tail call void @llvm.trap(), !dbg !287
  unreachable, !dbg !289

35:                                               ; preds = %24, %30
  %36 = inttoptr i32 %18 to ptr, !dbg !290
    #dbg_value(ptr %36, !178, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !254)
    #dbg_value(i32 %8, !178, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !254)
    #dbg_value(i32 0, !179, !DIExpression(), !291)
  %37 = icmp eq i32 %8, 0, !dbg !292
  br i1 %37, label %40, label %38, !dbg !293

38:                                               ; preds = %35
  %39 = icmp eq i32 %4, 0
  br label %70, !dbg !293

40:                                               ; preds = %78, %35
    #dbg_value(ptr %36, !199, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !254)
    #dbg_value(i32 %8, !199, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !254)
    #dbg_value(ptr %6, !200, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !254)
    #dbg_value(i32 %8, !200, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !254)
    #dbg_value(i32 %8, !55, !DIExpression(), !294)
    #dbg_value(i32 4, !56, !DIExpression(), !294)
  %41 = load i32, ptr @ink_top, align 4
  %42 = icmp ugt i32 %41, -8
  br i1 %42, label %43, label %44, !dbg !296

43:                                               ; preds = %40
  tail call void @llvm.trap(), !dbg !297
  unreachable, !dbg !299

44:                                               ; preds = %40
  %45 = icmp eq i32 %41, 0, !dbg !300
  %46 = add nuw i32 %41, 7, !dbg !301
  %47 = select i1 %45, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %46, !dbg !302
  %48 = and i32 %47, -8, !dbg !303
    #dbg_value(i32 %48, !57, !DIExpression(), !294)
    #dbg_value(i32 %20, !58, !DIExpression(), !294)
  %49 = xor i32 %48, -1, !dbg !304
  %50 = icmp ugt i32 %20, %49, !dbg !305
  br i1 %50, label %51, label %52, !dbg !305

51:                                               ; preds = %44
  tail call void @llvm.trap(), !dbg !306
  unreachable, !dbg !308

52:                                               ; preds = %44
  %53 = add i32 %48, %20, !dbg !309
  store i32 %53, ptr @ink_top, align 4, !dbg !310, !tbaa !27
  %54 = add i32 %53, 65535, !dbg !311
  %55 = lshr i32 %54, 16, !dbg !312
    #dbg_value(i32 %55, !59, !DIExpression(), !294)
  %56 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !313
    #dbg_value(i32 %56, !60, !DIExpression(), !294)
  %57 = icmp ugt i32 %55, %56, !dbg !314
  br i1 %57, label %58, label %63, !dbg !315

58:                                               ; preds = %52
  %59 = sub nuw nsw i32 %55, %56, !dbg !316
  %60 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %59), !dbg !317
  %61 = icmp eq i32 %60, -1, !dbg !318
  br i1 %61, label %62, label %63, !dbg !315

62:                                               ; preds = %58
  tail call void @llvm.trap(), !dbg !319
  unreachable, !dbg !321

63:                                               ; preds = %52, %58
  %64 = inttoptr i32 %48 to ptr, !dbg !322
    #dbg_value(ptr %64, !201, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !254)
    #dbg_value(i32 %8, !201, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !254)
    #dbg_value(i32 0, !202, !DIExpression(), !323)
  br i1 %37, label %95, label %65, !dbg !324

65:                                               ; preds = %63
  %66 = and i32 %8, 1, !dbg !324
  %67 = icmp eq i32 %8, 1, !dbg !324
  br i1 %67, label %84, label %68, !dbg !324

68:                                               ; preds = %65
  %69 = and i32 %8, 1073741822, !dbg !324
  br label %101, !dbg !324

70:                                               ; preds = %38, %78
  %71 = phi i32 [ 0, %38 ], [ %82, %78 ]
    #dbg_value(i32 %71, !179, !DIExpression(), !291)
    #dbg_value(i32 %71, !181, !DIExpression(), !325)
    #dbg_value(i32 poison, !184, !DIExpression(), !325)
    #dbg_value(i32 %3, !185, !DIExpression(), !325)
    #dbg_value(i32 %4, !186, !DIExpression(), !325)
    #dbg_value(i32 %71, !187, !DIExpression(), !325)
    #dbg_value(i32 poison, !188, !DIExpression(), !325)
    #dbg_value(i32 %3, !189, !DIExpression(), !325)
    #dbg_value(i32 %4, !190, !DIExpression(), !325)
    #dbg_value(i32 poison, !191, !DIExpression(), !325)
    #dbg_value(i32 %4, !192, !DIExpression(), !325)
  br i1 %39, label %78, label %72, !dbg !326

72:                                               ; preds = %70
  %73 = getelementptr inbounds nuw i32, ptr %6, i32 %71, !dbg !328
  %74 = load i32, ptr %73, align 4, !dbg !328, !tbaa !329
    #dbg_value(i32 %74, !184, !DIExpression(), !325)
    #dbg_value(i32 %74, !188, !DIExpression(), !325)
    #dbg_value(i32 %74, !191, !DIExpression(), !325)
  %75 = udiv i32 %74, %4, !dbg !331
    #dbg_value(i32 %75, !193, !DIExpression(), !325)
    #dbg_value(i32 %75, !194, !DIExpression(), !325)
    #dbg_value(i32 %71, !195, !DIExpression(), !325)
    #dbg_value(i32 %4, !196, !DIExpression(), !325)
  %76 = urem i32 %71, %4, !dbg !333
    #dbg_value(i32 %76, !197, !DIExpression(), !325)
  %77 = add i32 %76, %75
  br label %78

78:                                               ; preds = %70, %72
  %79 = phi i32 [ %77, %72 ], [ 0, %70 ], !dbg !336
    #dbg_value(i32 poison, !197, !DIExpression(), !325)
    #dbg_value(i32 %79, !198, !DIExpression(), !325)
  %80 = add i32 %79, %3, !dbg !337
  %81 = getelementptr inbounds nuw i32, ptr %36, i32 %71, !dbg !338
  store i32 %80, ptr %81, align 4, !dbg !339, !tbaa !329
  %82 = add nuw i32 %71, 1, !dbg !340
    #dbg_value(i32 %82, !179, !DIExpression(), !291)
  %83 = icmp eq i32 %82, %8, !dbg !292
  br i1 %83, label %40, label %70, !dbg !293, !llvm.loop !341

84:                                               ; preds = %101, %65
  %85 = phi i32 [ 0, %65 ], [ %119, %101 ]
  %86 = icmp eq i32 %66, 0, !dbg !324
  br i1 %86, label %95, label %87, !dbg !324

87:                                               ; preds = %84
    #dbg_value(i32 %85, !202, !DIExpression(), !323)
    #dbg_value(i32 %85, !204, !DIExpression(), !343)
  %88 = getelementptr inbounds nuw i32, ptr %6, i32 %85, !dbg !344
  %89 = load i32, ptr %88, align 4, !dbg !344, !tbaa !329
    #dbg_value(i32 %89, !207, !DIExpression(), !343)
    #dbg_value(i32 %3, !208, !DIExpression(), !343)
    #dbg_value(i32 %4, !209, !DIExpression(), !343)
    #dbg_value(i32 %85, !210, !DIExpression(), !343)
    #dbg_value(i32 %89, !211, !DIExpression(), !343)
    #dbg_value(i32 %3, !212, !DIExpression(), !343)
    #dbg_value(i32 %4, !213, !DIExpression(), !343)
    #dbg_value(i32 %85, !214, !DIExpression(), !343)
  %90 = icmp ult i32 %85, %3, !dbg !345
  %91 = add i32 %89, %4, !dbg !346
  %92 = mul i32 %89, 3, !dbg !346
  %93 = select i1 %90, i32 %91, i32 %92, !dbg !346
    #dbg_value(i32 %93, !215, !DIExpression(), !343)
  %94 = getelementptr inbounds nuw i32, ptr %64, i32 %85, !dbg !347
  store i32 %93, ptr %94, align 4, !dbg !348, !tbaa !329
    #dbg_value(i32 %85, !202, !DIExpression(DW_OP_plus_uconst, 1, DW_OP_stack_value), !323)
  br label %95, !dbg !349

95:                                               ; preds = %87, %84, %63
    #dbg_value(ptr %64, !221, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !254)
    #dbg_value(i32 %8, !221, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !254)
  %96 = load ptr, ptr %2, align 4, !dbg !349, !tbaa !256
  %97 = getelementptr inbounds nuw i8, ptr %2, i32 4, !dbg !349
  %98 = load i32, ptr %97, align 4, !dbg !349, !tbaa !27
    #dbg_value(ptr %96, !222, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !254)
    #dbg_value(i32 %98, !222, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !254)
  %99 = xor i32 %98, -1, !dbg !350
  %100 = icmp ugt i32 %8, %99, !dbg !352
  br i1 %100, label %122, label %123, !dbg !352

101:                                              ; preds = %101, %68
  %102 = phi i32 [ 0, %68 ], [ %119, %101 ]
  %103 = phi i32 [ 0, %68 ], [ %120, %101 ]
    #dbg_value(i32 %102, !202, !DIExpression(), !323)
    #dbg_value(i32 %102, !204, !DIExpression(), !343)
  %104 = getelementptr inbounds nuw i32, ptr %6, i32 %102, !dbg !344
  %105 = load i32, ptr %104, align 4, !dbg !344, !tbaa !329
    #dbg_value(i32 %105, !207, !DIExpression(), !343)
    #dbg_value(i32 %3, !208, !DIExpression(), !343)
    #dbg_value(i32 %4, !209, !DIExpression(), !343)
    #dbg_value(i32 %102, !210, !DIExpression(), !343)
    #dbg_value(i32 %105, !211, !DIExpression(), !343)
    #dbg_value(i32 %3, !212, !DIExpression(), !343)
    #dbg_value(i32 %4, !213, !DIExpression(), !343)
    #dbg_value(i32 %102, !214, !DIExpression(), !343)
  %106 = icmp ult i32 %102, %3, !dbg !345
  %107 = add i32 %105, %4, !dbg !346
  %108 = mul i32 %105, 3, !dbg !346
  %109 = select i1 %106, i32 %107, i32 %108, !dbg !346
    #dbg_value(i32 %109, !215, !DIExpression(), !343)
  %110 = getelementptr inbounds nuw i32, ptr %64, i32 %102, !dbg !347
  store i32 %109, ptr %110, align 8, !dbg !348, !tbaa !329
  %111 = or disjoint i32 %102, 1, !dbg !353
    #dbg_value(i32 %111, !202, !DIExpression(), !323)
    #dbg_value(i32 %111, !204, !DIExpression(), !343)
  %112 = getelementptr inbounds nuw i32, ptr %6, i32 %111, !dbg !344
  %113 = load i32, ptr %112, align 4, !dbg !344, !tbaa !329
    #dbg_value(i32 %113, !207, !DIExpression(), !343)
    #dbg_value(i32 %111, !210, !DIExpression(), !343)
    #dbg_value(i32 %113, !211, !DIExpression(), !343)
    #dbg_value(i32 %111, !214, !DIExpression(), !343)
  %114 = icmp ult i32 %111, %3, !dbg !345
  %115 = add i32 %113, %4, !dbg !346
  %116 = mul i32 %113, 3, !dbg !346
  %117 = select i1 %114, i32 %115, i32 %116, !dbg !346
    #dbg_value(i32 %117, !215, !DIExpression(), !343)
  %118 = getelementptr inbounds nuw i32, ptr %64, i32 %111, !dbg !347
  store i32 %117, ptr %118, align 4, !dbg !348, !tbaa !329
  %119 = add nuw i32 %102, 2, !dbg !353
    #dbg_value(i32 %119, !202, !DIExpression(), !323)
  %120 = add i32 %103, 2, !dbg !324
  %121 = icmp eq i32 %120, %69, !dbg !324
  br i1 %121, label %84, label %101, !dbg !324, !llvm.loop !354

122:                                              ; preds = %95
  tail call void @llvm.trap(), !dbg !356
  unreachable, !dbg !358

123:                                              ; preds = %95
  %124 = add i32 %98, %8, !dbg !359
    #dbg_value(i32 %124, !223, !DIExpression(), !254)
    #dbg_value(i32 %124, !55, !DIExpression(), !360)
    #dbg_value(i32 4, !56, !DIExpression(), !360)
  %125 = icmp ugt i32 %124, 1073741823, !dbg !362
  %126 = load i32, ptr @ink_top, align 4
  %127 = icmp ugt i32 %126, -8
  %128 = select i1 %125, i1 true, i1 %127, !dbg !363
  br i1 %128, label %129, label %130, !dbg !363

129:                                              ; preds = %123
  tail call void @llvm.trap(), !dbg !364
  unreachable, !dbg !366

130:                                              ; preds = %123
  %131 = icmp eq i32 %126, 0, !dbg !367
  %132 = add nuw i32 %126, 7, !dbg !368
  %133 = select i1 %131, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %132, !dbg !369
  %134 = and i32 %133, -8, !dbg !370
    #dbg_value(i32 %134, !57, !DIExpression(), !360)
  %135 = tail call i32 @llvm.umax.i32(i32 %124, i32 1), !dbg !371
  %136 = shl nuw i32 %135, 2, !dbg !372
    #dbg_value(i32 %136, !58, !DIExpression(), !360)
  %137 = xor i32 %134, -1, !dbg !373
  %138 = icmp ugt i32 %136, %137, !dbg !374
  br i1 %138, label %139, label %140, !dbg !374

139:                                              ; preds = %130
  tail call void @llvm.trap(), !dbg !375
  unreachable, !dbg !377

140:                                              ; preds = %130
  %141 = add i32 %134, %136, !dbg !378
  store i32 %141, ptr @ink_top, align 4, !dbg !379, !tbaa !27
  %142 = add i32 %141, 65535, !dbg !380
  %143 = lshr i32 %142, 16, !dbg !381
    #dbg_value(i32 %143, !59, !DIExpression(), !360)
  %144 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !382
    #dbg_value(i32 %144, !60, !DIExpression(), !360)
  %145 = icmp ugt i32 %143, %144, !dbg !383
  br i1 %145, label %146, label %151, !dbg !384

146:                                              ; preds = %140
  %147 = sub nuw nsw i32 %143, %144, !dbg !385
  %148 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %147), !dbg !386
  %149 = icmp eq i32 %148, -1, !dbg !387
  br i1 %149, label %150, label %151, !dbg !384

150:                                              ; preds = %146
  tail call void @llvm.trap(), !dbg !388
  unreachable, !dbg !390

151:                                              ; preds = %140, %146
  %152 = inttoptr i32 %134 to ptr, !dbg !391
    #dbg_value(ptr %152, !224, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !254)
    #dbg_value(i32 %124, !224, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !254)
  %153 = shl nuw i32 %8, 2, !dbg !392
    #dbg_value(ptr %152, !110, !DIExpression(), !393)
    #dbg_value(ptr %64, !115, !DIExpression(), !393)
    #dbg_value(i32 %153, !116, !DIExpression(), !393)
    #dbg_value(ptr %152, !117, !DIExpression(), !393)
    #dbg_value(ptr %64, !119, !DIExpression(), !393)
    #dbg_value(i32 0, !122, !DIExpression(), !395)
  br i1 %37, label %173, label %154, !dbg !396

154:                                              ; preds = %151, %154
  %155 = phi i32 [ %171, %154 ], [ 0, %151 ]
    #dbg_value(i32 %155, !122, !DIExpression(), !395)
  %156 = getelementptr inbounds nuw i8, ptr %64, i32 %155, !dbg !397
  %157 = load i8, ptr %156, align 4, !dbg !397, !tbaa !131
  %158 = getelementptr inbounds nuw i8, ptr %152, i32 %155, !dbg !398
  store i8 %157, ptr %158, align 4, !dbg !399, !tbaa !131
  %159 = or disjoint i32 %155, 1, !dbg !400
    #dbg_value(i32 %159, !122, !DIExpression(), !395)
  %160 = getelementptr inbounds nuw i8, ptr %64, i32 %159, !dbg !397
  %161 = load i8, ptr %160, align 1, !dbg !397, !tbaa !131
  %162 = getelementptr inbounds nuw i8, ptr %152, i32 %159, !dbg !398
  store i8 %161, ptr %162, align 1, !dbg !399, !tbaa !131
  %163 = or disjoint i32 %155, 2, !dbg !400
    #dbg_value(i32 %163, !122, !DIExpression(), !395)
  %164 = getelementptr inbounds nuw i8, ptr %64, i32 %163, !dbg !397
  %165 = load i8, ptr %164, align 2, !dbg !397, !tbaa !131
  %166 = getelementptr inbounds nuw i8, ptr %152, i32 %163, !dbg !398
  store i8 %165, ptr %166, align 2, !dbg !399, !tbaa !131
  %167 = or disjoint i32 %155, 3, !dbg !400
    #dbg_value(i32 %167, !122, !DIExpression(), !395)
  %168 = getelementptr inbounds nuw i8, ptr %64, i32 %167, !dbg !397
  %169 = load i8, ptr %168, align 1, !dbg !397, !tbaa !131
  %170 = getelementptr inbounds nuw i8, ptr %152, i32 %167, !dbg !398
  store i8 %169, ptr %170, align 1, !dbg !399, !tbaa !131
  %171 = add nuw i32 %155, 4, !dbg !400
    #dbg_value(i32 %171, !122, !DIExpression(), !395)
  %172 = icmp eq i32 %171, %153, !dbg !401
  br i1 %172, label %173, label %154, !dbg !396, !llvm.loop !402

173:                                              ; preds = %154, %151
  %174 = getelementptr inbounds nuw i32, ptr %152, i32 %8, !dbg !404
  %175 = shl i32 %98, 2, !dbg !405
    #dbg_value(ptr %174, !110, !DIExpression(), !406)
    #dbg_value(ptr %96, !115, !DIExpression(), !406)
    #dbg_value(i32 %175, !116, !DIExpression(), !406)
    #dbg_value(ptr %174, !117, !DIExpression(), !406)
    #dbg_value(ptr %96, !119, !DIExpression(), !406)
    #dbg_value(i32 0, !122, !DIExpression(), !408)
  %176 = icmp eq i32 %175, 0, !dbg !409
  br i1 %176, label %196, label %177, !dbg !410

177:                                              ; preds = %173, %177
  %178 = phi i32 [ %194, %177 ], [ 0, %173 ]
    #dbg_value(i32 %178, !122, !DIExpression(), !408)
  %179 = getelementptr inbounds nuw i8, ptr %96, i32 %178, !dbg !411
  %180 = load i8, ptr %179, align 1, !dbg !411, !tbaa !131
  %181 = getelementptr inbounds nuw i8, ptr %174, i32 %178, !dbg !412
  store i8 %180, ptr %181, align 4, !dbg !413, !tbaa !131
  %182 = or disjoint i32 %178, 1, !dbg !414
    #dbg_value(i32 %182, !122, !DIExpression(), !408)
  %183 = getelementptr inbounds nuw i8, ptr %96, i32 %182, !dbg !411
  %184 = load i8, ptr %183, align 1, !dbg !411, !tbaa !131
  %185 = getelementptr inbounds nuw i8, ptr %174, i32 %182, !dbg !412
  store i8 %184, ptr %185, align 1, !dbg !413, !tbaa !131
  %186 = or disjoint i32 %178, 2, !dbg !414
    #dbg_value(i32 %186, !122, !DIExpression(), !408)
  %187 = getelementptr inbounds nuw i8, ptr %96, i32 %186, !dbg !411
  %188 = load i8, ptr %187, align 1, !dbg !411, !tbaa !131
  %189 = getelementptr inbounds nuw i8, ptr %174, i32 %186, !dbg !412
  store i8 %188, ptr %189, align 2, !dbg !413, !tbaa !131
  %190 = or disjoint i32 %178, 3, !dbg !414
    #dbg_value(i32 %190, !122, !DIExpression(), !408)
  %191 = getelementptr inbounds nuw i8, ptr %96, i32 %190, !dbg !411
  %192 = load i8, ptr %191, align 1, !dbg !411, !tbaa !131
  %193 = getelementptr inbounds nuw i8, ptr %174, i32 %190, !dbg !412
  store i8 %192, ptr %193, align 1, !dbg !413, !tbaa !131
  %194 = add nuw i32 %178, 4, !dbg !414
    #dbg_value(i32 %194, !122, !DIExpression(), !408)
  %195 = icmp eq i32 %194, %175, !dbg !409
  br i1 %195, label %196, label %177, !dbg !410, !llvm.loop !415

196:                                              ; preds = %177, %173
    #dbg_value(ptr %152, !225, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !254)
    #dbg_value(i32 %124, !225, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !254)
    #dbg_declare(ptr %0, !226, !DIExpression(), !417)
  %197 = tail call i32 @llvm.umin.i32(i32 %8, i32 %124), !dbg !418
    #dbg_value(i32 %197, !55, !DIExpression(), !419)
    #dbg_value(i32 4, !56, !DIExpression(), !419)
  %198 = load i32, ptr @ink_top, align 4
  %199 = icmp ugt i32 %198, -8
  br i1 %199, label %200, label %201, !dbg !421

200:                                              ; preds = %196
  tail call void @llvm.trap(), !dbg !422
  unreachable, !dbg !424

201:                                              ; preds = %196
  %202 = icmp eq i32 %198, 0, !dbg !425
  %203 = add nuw i32 %198, 7, !dbg !426
  %204 = select i1 %202, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %203, !dbg !427
  %205 = and i32 %204, -8, !dbg !428
    #dbg_value(i32 %205, !57, !DIExpression(), !419)
  %206 = tail call i32 @llvm.umax.i32(i32 %197, i32 1), !dbg !429
  %207 = shl nuw i32 %206, 2, !dbg !430
    #dbg_value(i32 %207, !58, !DIExpression(), !419)
  %208 = xor i32 %205, -1, !dbg !431
  %209 = icmp ugt i32 %207, %208, !dbg !432
  br i1 %209, label %210, label %211, !dbg !432

210:                                              ; preds = %201
  tail call void @llvm.trap(), !dbg !433
  unreachable, !dbg !435

211:                                              ; preds = %201
  %212 = add i32 %205, %207, !dbg !436
  store i32 %212, ptr @ink_top, align 4, !dbg !437, !tbaa !27
  %213 = add i32 %212, 65535, !dbg !438
  %214 = lshr i32 %213, 16, !dbg !439
    #dbg_value(i32 %214, !59, !DIExpression(), !419)
  %215 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !440
    #dbg_value(i32 %215, !60, !DIExpression(), !419)
  %216 = icmp ugt i32 %214, %215, !dbg !441
  br i1 %216, label %217, label %222, !dbg !442

217:                                              ; preds = %211
  %218 = sub nuw nsw i32 %214, %215, !dbg !443
  %219 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %218), !dbg !444
  %220 = icmp eq i32 %219, -1, !dbg !445
  br i1 %220, label %221, label %222, !dbg !442

221:                                              ; preds = %217
  tail call void @llvm.trap(), !dbg !446
  unreachable, !dbg !448

222:                                              ; preds = %211, %217
  %223 = inttoptr i32 %205 to ptr, !dbg !449
  store ptr %223, ptr %0, align 4, !dbg !450, !tbaa !451
  %224 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !450
  store i32 %197, ptr %224, align 4, !dbg !450, !tbaa !453
    #dbg_value(i32 0, !227, !DIExpression(), !454)
  %225 = icmp eq i32 %197, 0, !dbg !455
  br i1 %225, label %228, label %226, !dbg !456

226:                                              ; preds = %222
  %227 = icmp eq i32 %4, 0
  br label %229, !dbg !456

228:                                              ; preds = %248, %222
  ret void, !dbg !457

229:                                              ; preds = %226, %248
  %230 = phi i32 [ 0, %226 ], [ %251, %248 ]
    #dbg_value(i32 %230, !227, !DIExpression(), !454)
  %231 = getelementptr inbounds nuw i32, ptr %36, i32 %230, !dbg !458
  %232 = load i32, ptr %231, align 4, !dbg !458, !tbaa !329
    #dbg_value(i32 %232, !229, !DIExpression(), !459)
  %233 = getelementptr inbounds nuw i32, ptr %152, i32 %230, !dbg !460
  %234 = load i32, ptr %233, align 4, !dbg !460, !tbaa !329
    #dbg_value(i32 %234, !232, !DIExpression(), !459)
    #dbg_value(i32 %3, !233, !DIExpression(), !459)
    #dbg_value(i32 %4, !234, !DIExpression(), !459)
    #dbg_value(i32 %232, !235, !DIExpression(), !459)
    #dbg_value(i32 %234, !236, !DIExpression(), !459)
    #dbg_value(i32 %3, !237, !DIExpression(), !459)
    #dbg_value(i32 %4, !238, !DIExpression(), !459)
    #dbg_value(i32 %232, !239, !DIExpression(), !459)
  %235 = icmp ult i32 %232, %234, !dbg !461
  br i1 %235, label %236, label %242, !dbg !462

236:                                              ; preds = %229
    #dbg_value(i32 %232, !241, !DIExpression(), !463)
    #dbg_value(i32 %4, !244, !DIExpression(), !463)
  br i1 %227, label %239, label %237, !dbg !464

237:                                              ; preds = %236
  %238 = udiv i32 %232, %4, !dbg !466
    #dbg_value(i32 %238, !245, !DIExpression(), !463)
  br label %239

239:                                              ; preds = %236, %237
  %240 = phi i32 [ %238, %237 ], [ 0, %236 ], !dbg !468
    #dbg_value(i32 %240, !245, !DIExpression(), !463)
    #dbg_value(i32 %240, !246, !DIExpression(), !463)
  %241 = add i32 %240, %234, !dbg !469
    #dbg_value(i32 %241, !240, !DIExpression(), !459)
  br label %248, !dbg !470

242:                                              ; preds = %229
    #dbg_value(i32 %234, !247, !DIExpression(), !471)
    #dbg_value(i32 %4, !249, !DIExpression(), !471)
  br i1 %227, label %245, label %243, !dbg !472

243:                                              ; preds = %242
  %244 = urem i32 %234, %4, !dbg !474
    #dbg_value(i32 %244, !250, !DIExpression(), !471)
  br label %245

245:                                              ; preds = %242, %243
  %246 = phi i32 [ %244, %243 ], [ 0, %242 ], !dbg !476
    #dbg_value(i32 %246, !250, !DIExpression(), !471)
    #dbg_value(i32 %246, !251, !DIExpression(), !471)
  %247 = add i32 %246, %232, !dbg !477
    #dbg_value(i32 %247, !240, !DIExpression(), !459)
  br label %248

248:                                              ; preds = %245, %239
  %249 = phi i32 [ %241, %239 ], [ %247, %245 ], !dbg !478
    #dbg_value(i32 %249, !240, !DIExpression(), !459)
  %250 = getelementptr inbounds nuw i32, ptr %223, i32 %230, !dbg !479
  store i32 %249, ptr %250, align 4, !dbg !480, !tbaa !329
  %251 = add nuw i32 %230, 1, !dbg !481
    #dbg_value(i32 %251, !227, !DIExpression(), !454)
  %252 = icmp eq i32 %251, %197, !dbg !455
  br i1 %252, label %228, label %229, !dbg !456, !llvm.loop !482
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_left_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !484 {
    #dbg_value(i32 %0, !488, !DIExpression(), !504)
    #dbg_value(i32 %1, !489, !DIExpression(), !504)
    #dbg_value(i32 %2, !490, !DIExpression(), !504)
    #dbg_value(i32 %3, !491, !DIExpression(), !504)
    #dbg_value(i32 %0, !492, !DIExpression(), !504)
    #dbg_value(i32 %1, !493, !DIExpression(), !504)
    #dbg_value(i32 %2, !494, !DIExpression(), !504)
    #dbg_value(i32 %3, !495, !DIExpression(), !504)
    #dbg_value(i32 %1, !496, !DIExpression(), !504)
    #dbg_value(i32 %3, !497, !DIExpression(), !504)
  %5 = icmp eq i32 %3, 0, !dbg !505
  br i1 %5, label %10, label %6, !dbg !505

6:                                                ; preds = %4
  %7 = udiv i32 %1, %3, !dbg !507
    #dbg_value(i32 %7, !498, !DIExpression(), !504)
    #dbg_value(i32 %7, !499, !DIExpression(), !504)
    #dbg_value(i32 %0, !500, !DIExpression(), !504)
    #dbg_value(i32 %3, !501, !DIExpression(), !504)
  %8 = urem i32 %0, %3, !dbg !509
    #dbg_value(i32 %8, !502, !DIExpression(), !504)
  %9 = add i32 %8, %7
  br label %10

10:                                               ; preds = %4, %6
  %11 = phi i32 [ %9, %6 ], [ 0, %4 ], !dbg !512
    #dbg_value(i32 poison, !502, !DIExpression(), !504)
    #dbg_value(i32 %11, !503, !DIExpression(), !504)
  %12 = add i32 %11, %2, !dbg !513
  ret i32 %12, !dbg !514
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_left_signal(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !515 {
    #dbg_value(i32 %0, !517, !DIExpression(), !529)
    #dbg_value(i32 %1, !518, !DIExpression(), !529)
    #dbg_value(i32 %2, !519, !DIExpression(), !529)
    #dbg_value(i32 %3, !520, !DIExpression(), !529)
    #dbg_value(i32 %1, !521, !DIExpression(), !529)
    #dbg_value(i32 %3, !522, !DIExpression(), !529)
  %5 = icmp eq i32 %3, 0, !dbg !530
  br i1 %5, label %10, label %6, !dbg !530

6:                                                ; preds = %4
  %7 = udiv i32 %1, %3, !dbg !532
    #dbg_value(i32 %7, !523, !DIExpression(), !529)
    #dbg_value(i32 %7, !524, !DIExpression(), !529)
    #dbg_value(i32 %0, !525, !DIExpression(), !529)
    #dbg_value(i32 %3, !526, !DIExpression(), !529)
  %8 = urem i32 %0, %3, !dbg !534
    #dbg_value(i32 %8, !527, !DIExpression(), !529)
  %9 = add i32 %8, %7
  br label %10

10:                                               ; preds = %4, %6
  %11 = phi i32 [ %9, %6 ], [ 0, %4 ], !dbg !537
    #dbg_value(i32 poison, !527, !DIExpression(), !529)
    #dbg_value(i32 %11, !528, !DIExpression(), !529)
  %12 = add i32 %11, %2, !dbg !538
  ret i32 %12, !dbg !539
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_right_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !540 {
    #dbg_value(i32 %0, !542, !DIExpression(), !557)
    #dbg_value(i32 %1, !543, !DIExpression(), !557)
    #dbg_value(i32 %2, !544, !DIExpression(), !557)
    #dbg_value(i32 %3, !545, !DIExpression(), !557)
    #dbg_value(i32 %0, !546, !DIExpression(), !557)
    #dbg_value(i32 %1, !547, !DIExpression(), !557)
    #dbg_value(i32 %2, !548, !DIExpression(), !557)
    #dbg_value(i32 %3, !549, !DIExpression(), !557)
    #dbg_value(i32 %0, !550, !DIExpression(), !557)
  %5 = icmp ult i32 %0, %2, !dbg !558
  %6 = add i32 %3, %1, !dbg !559
  %7 = mul i32 %1, 3, !dbg !559
  %8 = select i1 %5, i32 %6, i32 %7, !dbg !559
    #dbg_value(i32 %8, !551, !DIExpression(), !557)
  ret i32 %8, !dbg !560
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_right_signal(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !561 {
    #dbg_value(i32 %0, !563, !DIExpression(), !574)
    #dbg_value(i32 %1, !564, !DIExpression(), !574)
    #dbg_value(i32 %2, !565, !DIExpression(), !574)
    #dbg_value(i32 %3, !566, !DIExpression(), !574)
    #dbg_value(i32 %0, !567, !DIExpression(), !574)
  %5 = icmp ult i32 %0, %2, !dbg !575
  %6 = add i32 %3, %1, !dbg !576
  %7 = mul i32 %1, 3, !dbg !576
  %8 = select i1 %5, i32 %6, i32 %7, !dbg !576
    #dbg_value(i32 %8, !568, !DIExpression(), !574)
  ret i32 %8, !dbg !577
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_pair_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !578 {
    #dbg_value(i32 %0, !580, !DIExpression(), !601)
    #dbg_value(i32 %1, !581, !DIExpression(), !601)
    #dbg_value(i32 %2, !582, !DIExpression(), !601)
    #dbg_value(i32 %3, !583, !DIExpression(), !601)
    #dbg_value(i32 %0, !584, !DIExpression(), !601)
    #dbg_value(i32 %1, !585, !DIExpression(), !601)
    #dbg_value(i32 %2, !586, !DIExpression(), !601)
    #dbg_value(i32 %3, !587, !DIExpression(), !601)
    #dbg_value(i32 %0, !588, !DIExpression(), !601)
  %5 = icmp ult i32 %0, %1, !dbg !602
  %6 = icmp eq i32 %3, 0, !dbg !603
  br i1 %5, label %7, label %13, !dbg !604

7:                                                ; preds = %4
    #dbg_value(i32 %0, !590, !DIExpression(), !605)
    #dbg_value(i32 %3, !593, !DIExpression(), !605)
  br i1 %6, label %10, label %8, !dbg !606

8:                                                ; preds = %7
  %9 = udiv i32 %0, %3, !dbg !608
    #dbg_value(i32 %9, !594, !DIExpression(), !605)
  br label %10

10:                                               ; preds = %7, %8
  %11 = phi i32 [ %9, %8 ], [ 0, %7 ], !dbg !610
    #dbg_value(i32 %11, !594, !DIExpression(), !605)
    #dbg_value(i32 %11, !595, !DIExpression(), !605)
  %12 = add i32 %11, %1, !dbg !611
    #dbg_value(i32 %12, !589, !DIExpression(), !601)
  br label %19, !dbg !612

13:                                               ; preds = %4
    #dbg_value(i32 %1, !596, !DIExpression(), !613)
    #dbg_value(i32 %3, !598, !DIExpression(), !613)
  br i1 %6, label %16, label %14, !dbg !614

14:                                               ; preds = %13
  %15 = urem i32 %1, %3, !dbg !616
    #dbg_value(i32 %15, !599, !DIExpression(), !613)
  br label %16

16:                                               ; preds = %13, %14
  %17 = phi i32 [ %15, %14 ], [ 0, %13 ], !dbg !618
    #dbg_value(i32 %17, !599, !DIExpression(), !613)
    #dbg_value(i32 %17, !600, !DIExpression(), !613)
  %18 = add i32 %17, %0, !dbg !619
    #dbg_value(i32 %18, !589, !DIExpression(), !601)
  br label %19

19:                                               ; preds = %16, %10
  %20 = phi i32 [ %12, %10 ], [ %18, %16 ], !dbg !603
    #dbg_value(i32 %20, !589, !DIExpression(), !601)
  ret i32 %20, !dbg !620
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_pair_signal(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !621 {
    #dbg_value(i32 %0, !623, !DIExpression(), !640)
    #dbg_value(i32 %1, !624, !DIExpression(), !640)
    #dbg_value(i32 %2, !625, !DIExpression(), !640)
    #dbg_value(i32 %3, !626, !DIExpression(), !640)
    #dbg_value(i32 %0, !627, !DIExpression(), !640)
  %5 = icmp ult i32 %0, %1, !dbg !641
  %6 = icmp eq i32 %3, 0, !dbg !642
  br i1 %5, label %7, label %13, !dbg !643

7:                                                ; preds = %4
    #dbg_value(i32 %0, !629, !DIExpression(), !644)
    #dbg_value(i32 %3, !632, !DIExpression(), !644)
  br i1 %6, label %10, label %8, !dbg !645

8:                                                ; preds = %7
  %9 = udiv i32 %0, %3, !dbg !647
    #dbg_value(i32 %9, !633, !DIExpression(), !644)
  br label %10

10:                                               ; preds = %7, %8
  %11 = phi i32 [ %9, %8 ], [ 0, %7 ], !dbg !649
    #dbg_value(i32 %11, !633, !DIExpression(), !644)
    #dbg_value(i32 %11, !634, !DIExpression(), !644)
  %12 = add i32 %11, %1, !dbg !650
    #dbg_value(i32 %12, !628, !DIExpression(), !640)
  br label %19, !dbg !651

13:                                               ; preds = %4
    #dbg_value(i32 %1, !635, !DIExpression(), !652)
    #dbg_value(i32 %3, !637, !DIExpression(), !652)
  br i1 %6, label %16, label %14, !dbg !653

14:                                               ; preds = %13
  %15 = urem i32 %1, %3, !dbg !655
    #dbg_value(i32 %15, !638, !DIExpression(), !652)
  br label %16

16:                                               ; preds = %13, %14
  %17 = phi i32 [ %15, %14 ], [ 0, %13 ], !dbg !657
    #dbg_value(i32 %17, !638, !DIExpression(), !652)
    #dbg_value(i32 %17, !639, !DIExpression(), !652)
  %18 = add i32 %17, %0, !dbg !658
    #dbg_value(i32 %18, !628, !DIExpression(), !640)
  br label %19

19:                                               ; preds = %16, %10
  %20 = phi i32 [ %12, %10 ], [ %18, %16 ], !dbg !642
    #dbg_value(i32 %20, !628, !DIExpression(), !640)
  ret i32 %20, !dbg !659
}

; Function Attrs: nounwind uwtable
define hidden i32 @lang_fn_pipeline38_right_padded_zip_heldout_u32_into(ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %1, i32 noundef %2, i32 noundef %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #2 !dbg !660 {
    #dbg_declare(ptr %0, !664, !DIExpression(), !744)
    #dbg_declare(ptr %1, !665, !DIExpression(), !745)
    #dbg_value(i32 %2, !666, !DIExpression(), !746)
    #dbg_value(i32 %3, !667, !DIExpression(), !746)
    #dbg_value(ptr %4, !668, !DIExpression(), !746)
  %6 = load ptr, ptr %0, align 4, !dbg !747, !tbaa !256
  %7 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !747
  %8 = load i32, ptr %7, align 4, !dbg !747, !tbaa !27
    #dbg_value(ptr %6, !669, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !746)
    #dbg_value(i32 %8, !669, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !746)
    #dbg_value(i32 %8, !55, !DIExpression(), !748)
    #dbg_value(i32 4, !56, !DIExpression(), !748)
  %9 = icmp ugt i32 %8, 1073741823, !dbg !750
  %10 = load i32, ptr @ink_top, align 4
  %11 = icmp ugt i32 %10, -8
  %12 = select i1 %9, i1 true, i1 %11, !dbg !751
  br i1 %12, label %13, label %14, !dbg !751

13:                                               ; preds = %5
  tail call void @llvm.trap(), !dbg !752
  unreachable, !dbg !754

14:                                               ; preds = %5
  %15 = icmp eq i32 %10, 0, !dbg !755
  %16 = add nuw i32 %10, 7, !dbg !756
  %17 = select i1 %15, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %16, !dbg !757
  %18 = and i32 %17, -8, !dbg !758
    #dbg_value(i32 %18, !57, !DIExpression(), !748)
  %19 = tail call i32 @llvm.umax.i32(i32 %8, i32 1), !dbg !759
  %20 = shl nuw i32 %19, 2, !dbg !760
    #dbg_value(i32 %20, !58, !DIExpression(), !748)
  %21 = xor i32 %18, -1, !dbg !761
  %22 = icmp ugt i32 %20, %21, !dbg !762
  br i1 %22, label %23, label %24, !dbg !762

23:                                               ; preds = %14
  tail call void @llvm.trap(), !dbg !763
  unreachable, !dbg !765

24:                                               ; preds = %14
  %25 = add i32 %18, %20, !dbg !766
  store i32 %25, ptr @ink_top, align 4, !dbg !767, !tbaa !27
  %26 = add i32 %25, 65535, !dbg !768
  %27 = lshr i32 %26, 16, !dbg !769
    #dbg_value(i32 %27, !59, !DIExpression(), !748)
  %28 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !770
    #dbg_value(i32 %28, !60, !DIExpression(), !748)
  %29 = icmp ugt i32 %27, %28, !dbg !771
  br i1 %29, label %30, label %35, !dbg !772

30:                                               ; preds = %24
  %31 = sub nuw nsw i32 %27, %28, !dbg !773
  %32 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %31), !dbg !774
  %33 = icmp eq i32 %32, -1, !dbg !775
  br i1 %33, label %34, label %35, !dbg !772

34:                                               ; preds = %30
  tail call void @llvm.trap(), !dbg !776
  unreachable, !dbg !778

35:                                               ; preds = %24, %30
  %36 = inttoptr i32 %18 to ptr, !dbg !779
    #dbg_value(ptr %36, !670, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !746)
    #dbg_value(i32 %8, !670, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !746)
    #dbg_value(i32 0, !671, !DIExpression(), !780)
  %37 = icmp eq i32 %8, 0, !dbg !781
  br i1 %37, label %40, label %38, !dbg !782

38:                                               ; preds = %35
  %39 = icmp eq i32 %3, 0
  br label %70, !dbg !782

40:                                               ; preds = %78, %35
    #dbg_value(ptr %36, !691, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !746)
    #dbg_value(i32 %8, !691, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !746)
    #dbg_value(ptr %6, !692, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !746)
    #dbg_value(i32 %8, !692, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !746)
    #dbg_value(i32 %8, !55, !DIExpression(), !783)
    #dbg_value(i32 4, !56, !DIExpression(), !783)
  %41 = load i32, ptr @ink_top, align 4
  %42 = icmp ugt i32 %41, -8
  br i1 %42, label %43, label %44, !dbg !785

43:                                               ; preds = %40
  tail call void @llvm.trap(), !dbg !786
  unreachable, !dbg !788

44:                                               ; preds = %40
  %45 = icmp eq i32 %41, 0, !dbg !789
  %46 = add nuw i32 %41, 7, !dbg !790
  %47 = select i1 %45, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %46, !dbg !791
  %48 = and i32 %47, -8, !dbg !792
    #dbg_value(i32 %48, !57, !DIExpression(), !783)
    #dbg_value(i32 %20, !58, !DIExpression(), !783)
  %49 = xor i32 %48, -1, !dbg !793
  %50 = icmp ugt i32 %20, %49, !dbg !794
  br i1 %50, label %51, label %52, !dbg !794

51:                                               ; preds = %44
  tail call void @llvm.trap(), !dbg !795
  unreachable, !dbg !797

52:                                               ; preds = %44
  %53 = add i32 %48, %20, !dbg !798
  store i32 %53, ptr @ink_top, align 4, !dbg !799, !tbaa !27
  %54 = add i32 %53, 65535, !dbg !800
  %55 = lshr i32 %54, 16, !dbg !801
    #dbg_value(i32 %55, !59, !DIExpression(), !783)
  %56 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !802
    #dbg_value(i32 %56, !60, !DIExpression(), !783)
  %57 = icmp ugt i32 %55, %56, !dbg !803
  br i1 %57, label %58, label %63, !dbg !804

58:                                               ; preds = %52
  %59 = sub nuw nsw i32 %55, %56, !dbg !805
  %60 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %59), !dbg !806
  %61 = icmp eq i32 %60, -1, !dbg !807
  br i1 %61, label %62, label %63, !dbg !804

62:                                               ; preds = %58
  tail call void @llvm.trap(), !dbg !808
  unreachable, !dbg !810

63:                                               ; preds = %52, %58
  %64 = inttoptr i32 %48 to ptr, !dbg !811
    #dbg_value(ptr %64, !693, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !746)
    #dbg_value(i32 %8, !693, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !746)
    #dbg_value(i32 0, !694, !DIExpression(), !812)
  br i1 %37, label %95, label %65, !dbg !813

65:                                               ; preds = %63
  %66 = and i32 %8, 1, !dbg !813
  %67 = icmp eq i32 %8, 1, !dbg !813
  br i1 %67, label %84, label %68, !dbg !813

68:                                               ; preds = %65
  %69 = and i32 %8, 1073741822, !dbg !813
  br label %101, !dbg !813

70:                                               ; preds = %38, %78
  %71 = phi i32 [ 0, %38 ], [ %82, %78 ]
    #dbg_value(i32 %71, !671, !DIExpression(), !780)
    #dbg_value(i32 %71, !673, !DIExpression(), !814)
    #dbg_value(i32 poison, !676, !DIExpression(), !814)
    #dbg_value(i32 %2, !677, !DIExpression(), !814)
    #dbg_value(i32 %3, !678, !DIExpression(), !814)
    #dbg_value(i32 %71, !679, !DIExpression(), !814)
    #dbg_value(i32 poison, !680, !DIExpression(), !814)
    #dbg_value(i32 %2, !681, !DIExpression(), !814)
    #dbg_value(i32 %3, !682, !DIExpression(), !814)
    #dbg_value(i32 poison, !683, !DIExpression(), !814)
    #dbg_value(i32 %3, !684, !DIExpression(), !814)
  br i1 %39, label %78, label %72, !dbg !815

72:                                               ; preds = %70
  %73 = getelementptr inbounds nuw i32, ptr %6, i32 %71, !dbg !817
  %74 = load i32, ptr %73, align 4, !dbg !817, !tbaa !329
    #dbg_value(i32 %74, !676, !DIExpression(), !814)
    #dbg_value(i32 %74, !680, !DIExpression(), !814)
    #dbg_value(i32 %74, !683, !DIExpression(), !814)
  %75 = udiv i32 %74, %3, !dbg !818
    #dbg_value(i32 %75, !685, !DIExpression(), !814)
    #dbg_value(i32 %75, !686, !DIExpression(), !814)
    #dbg_value(i32 %71, !687, !DIExpression(), !814)
    #dbg_value(i32 %3, !688, !DIExpression(), !814)
  %76 = urem i32 %71, %3, !dbg !820
    #dbg_value(i32 %76, !689, !DIExpression(), !814)
  %77 = add i32 %76, %75
  br label %78

78:                                               ; preds = %70, %72
  %79 = phi i32 [ %77, %72 ], [ 0, %70 ], !dbg !823
    #dbg_value(i32 poison, !689, !DIExpression(), !814)
    #dbg_value(i32 %79, !690, !DIExpression(), !814)
  %80 = add i32 %79, %2, !dbg !824
  %81 = getelementptr inbounds nuw i32, ptr %36, i32 %71, !dbg !825
  store i32 %80, ptr %81, align 4, !dbg !826, !tbaa !329
  %82 = add nuw i32 %71, 1, !dbg !827
    #dbg_value(i32 %82, !671, !DIExpression(), !780)
  %83 = icmp eq i32 %82, %8, !dbg !781
  br i1 %83, label %40, label %70, !dbg !782, !llvm.loop !828

84:                                               ; preds = %101, %65
  %85 = phi i32 [ 0, %65 ], [ %119, %101 ]
  %86 = icmp eq i32 %66, 0, !dbg !813
  br i1 %86, label %95, label %87, !dbg !813

87:                                               ; preds = %84
    #dbg_value(i32 %85, !694, !DIExpression(), !812)
    #dbg_value(i32 %85, !696, !DIExpression(), !830)
  %88 = getelementptr inbounds nuw i32, ptr %6, i32 %85, !dbg !831
  %89 = load i32, ptr %88, align 4, !dbg !831, !tbaa !329
    #dbg_value(i32 %89, !699, !DIExpression(), !830)
    #dbg_value(i32 %2, !700, !DIExpression(), !830)
    #dbg_value(i32 %3, !701, !DIExpression(), !830)
    #dbg_value(i32 %85, !702, !DIExpression(), !830)
    #dbg_value(i32 %89, !703, !DIExpression(), !830)
    #dbg_value(i32 %2, !704, !DIExpression(), !830)
    #dbg_value(i32 %3, !705, !DIExpression(), !830)
    #dbg_value(i32 %85, !706, !DIExpression(), !830)
  %90 = icmp ult i32 %85, %2, !dbg !832
  %91 = add i32 %89, %3, !dbg !833
  %92 = mul i32 %89, 3, !dbg !833
  %93 = select i1 %90, i32 %91, i32 %92, !dbg !833
    #dbg_value(i32 %93, !707, !DIExpression(), !830)
  %94 = getelementptr inbounds nuw i32, ptr %64, i32 %85, !dbg !834
  store i32 %93, ptr %94, align 4, !dbg !835, !tbaa !329
    #dbg_value(i32 %85, !694, !DIExpression(DW_OP_plus_uconst, 1, DW_OP_stack_value), !812)
  br label %95, !dbg !836

95:                                               ; preds = %87, %84, %63
    #dbg_value(ptr %64, !713, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !746)
    #dbg_value(i32 %8, !713, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !746)
  %96 = load ptr, ptr %1, align 4, !dbg !836, !tbaa !256
  %97 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !836
  %98 = load i32, ptr %97, align 4, !dbg !836, !tbaa !27
    #dbg_value(ptr %96, !714, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !746)
    #dbg_value(i32 %98, !714, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !746)
  %99 = xor i32 %98, -1, !dbg !837
  %100 = icmp ugt i32 %8, %99, !dbg !839
  br i1 %100, label %122, label %123, !dbg !839

101:                                              ; preds = %101, %68
  %102 = phi i32 [ 0, %68 ], [ %119, %101 ]
  %103 = phi i32 [ 0, %68 ], [ %120, %101 ]
    #dbg_value(i32 %102, !694, !DIExpression(), !812)
    #dbg_value(i32 %102, !696, !DIExpression(), !830)
  %104 = getelementptr inbounds nuw i32, ptr %6, i32 %102, !dbg !831
  %105 = load i32, ptr %104, align 4, !dbg !831, !tbaa !329
    #dbg_value(i32 %105, !699, !DIExpression(), !830)
    #dbg_value(i32 %2, !700, !DIExpression(), !830)
    #dbg_value(i32 %3, !701, !DIExpression(), !830)
    #dbg_value(i32 %102, !702, !DIExpression(), !830)
    #dbg_value(i32 %105, !703, !DIExpression(), !830)
    #dbg_value(i32 %2, !704, !DIExpression(), !830)
    #dbg_value(i32 %3, !705, !DIExpression(), !830)
    #dbg_value(i32 %102, !706, !DIExpression(), !830)
  %106 = icmp ult i32 %102, %2, !dbg !832
  %107 = add i32 %105, %3, !dbg !833
  %108 = mul i32 %105, 3, !dbg !833
  %109 = select i1 %106, i32 %107, i32 %108, !dbg !833
    #dbg_value(i32 %109, !707, !DIExpression(), !830)
  %110 = getelementptr inbounds nuw i32, ptr %64, i32 %102, !dbg !834
  store i32 %109, ptr %110, align 8, !dbg !835, !tbaa !329
  %111 = or disjoint i32 %102, 1, !dbg !840
    #dbg_value(i32 %111, !694, !DIExpression(), !812)
    #dbg_value(i32 %111, !696, !DIExpression(), !830)
  %112 = getelementptr inbounds nuw i32, ptr %6, i32 %111, !dbg !831
  %113 = load i32, ptr %112, align 4, !dbg !831, !tbaa !329
    #dbg_value(i32 %113, !699, !DIExpression(), !830)
    #dbg_value(i32 %111, !702, !DIExpression(), !830)
    #dbg_value(i32 %113, !703, !DIExpression(), !830)
    #dbg_value(i32 %111, !706, !DIExpression(), !830)
  %114 = icmp ult i32 %111, %2, !dbg !832
  %115 = add i32 %113, %3, !dbg !833
  %116 = mul i32 %113, 3, !dbg !833
  %117 = select i1 %114, i32 %115, i32 %116, !dbg !833
    #dbg_value(i32 %117, !707, !DIExpression(), !830)
  %118 = getelementptr inbounds nuw i32, ptr %64, i32 %111, !dbg !834
  store i32 %117, ptr %118, align 4, !dbg !835, !tbaa !329
  %119 = add nuw i32 %102, 2, !dbg !840
    #dbg_value(i32 %119, !694, !DIExpression(), !812)
  %120 = add i32 %103, 2, !dbg !813
  %121 = icmp eq i32 %120, %69, !dbg !813
  br i1 %121, label %84, label %101, !dbg !813, !llvm.loop !841

122:                                              ; preds = %95
  tail call void @llvm.trap(), !dbg !843
  unreachable, !dbg !845

123:                                              ; preds = %95
  %124 = add i32 %98, %8, !dbg !846
    #dbg_value(i32 %124, !715, !DIExpression(), !746)
    #dbg_value(i32 %124, !55, !DIExpression(), !847)
    #dbg_value(i32 4, !56, !DIExpression(), !847)
  %125 = icmp ugt i32 %124, 1073741823, !dbg !849
  %126 = load i32, ptr @ink_top, align 4
  %127 = icmp ugt i32 %126, -8
  %128 = select i1 %125, i1 true, i1 %127, !dbg !850
  br i1 %128, label %129, label %130, !dbg !850

129:                                              ; preds = %123
  tail call void @llvm.trap(), !dbg !851
  unreachable, !dbg !853

130:                                              ; preds = %123
  %131 = icmp eq i32 %126, 0, !dbg !854
  %132 = add nuw i32 %126, 7, !dbg !855
  %133 = select i1 %131, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %132, !dbg !856
  %134 = and i32 %133, -8, !dbg !857
    #dbg_value(i32 %134, !57, !DIExpression(), !847)
  %135 = tail call i32 @llvm.umax.i32(i32 %124, i32 1), !dbg !858
  %136 = shl nuw i32 %135, 2, !dbg !859
    #dbg_value(i32 %136, !58, !DIExpression(), !847)
  %137 = xor i32 %134, -1, !dbg !860
  %138 = icmp ugt i32 %136, %137, !dbg !861
  br i1 %138, label %139, label %140, !dbg !861

139:                                              ; preds = %130
  tail call void @llvm.trap(), !dbg !862
  unreachable, !dbg !864

140:                                              ; preds = %130
  %141 = add i32 %134, %136, !dbg !865
  store i32 %141, ptr @ink_top, align 4, !dbg !866, !tbaa !27
  %142 = add i32 %141, 65535, !dbg !867
  %143 = lshr i32 %142, 16, !dbg !868
    #dbg_value(i32 %143, !59, !DIExpression(), !847)
  %144 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !869
    #dbg_value(i32 %144, !60, !DIExpression(), !847)
  %145 = icmp ugt i32 %143, %144, !dbg !870
  br i1 %145, label %146, label %151, !dbg !871

146:                                              ; preds = %140
  %147 = sub nuw nsw i32 %143, %144, !dbg !872
  %148 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %147), !dbg !873
  %149 = icmp eq i32 %148, -1, !dbg !874
  br i1 %149, label %150, label %151, !dbg !871

150:                                              ; preds = %146
  tail call void @llvm.trap(), !dbg !875
  unreachable, !dbg !877

151:                                              ; preds = %140, %146
  %152 = inttoptr i32 %134 to ptr, !dbg !878
    #dbg_value(ptr %152, !716, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !746)
    #dbg_value(i32 %124, !716, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !746)
  %153 = shl nuw i32 %8, 2, !dbg !879
    #dbg_value(ptr %152, !110, !DIExpression(), !880)
    #dbg_value(ptr %64, !115, !DIExpression(), !880)
    #dbg_value(i32 %153, !116, !DIExpression(), !880)
    #dbg_value(ptr %152, !117, !DIExpression(), !880)
    #dbg_value(ptr %64, !119, !DIExpression(), !880)
    #dbg_value(i32 0, !122, !DIExpression(), !882)
  br i1 %37, label %173, label %154, !dbg !883

154:                                              ; preds = %151, %154
  %155 = phi i32 [ %171, %154 ], [ 0, %151 ]
    #dbg_value(i32 %155, !122, !DIExpression(), !882)
  %156 = getelementptr inbounds nuw i8, ptr %64, i32 %155, !dbg !884
  %157 = load i8, ptr %156, align 4, !dbg !884, !tbaa !131
  %158 = getelementptr inbounds nuw i8, ptr %152, i32 %155, !dbg !885
  store i8 %157, ptr %158, align 4, !dbg !886, !tbaa !131
  %159 = or disjoint i32 %155, 1, !dbg !887
    #dbg_value(i32 %159, !122, !DIExpression(), !882)
  %160 = getelementptr inbounds nuw i8, ptr %64, i32 %159, !dbg !884
  %161 = load i8, ptr %160, align 1, !dbg !884, !tbaa !131
  %162 = getelementptr inbounds nuw i8, ptr %152, i32 %159, !dbg !885
  store i8 %161, ptr %162, align 1, !dbg !886, !tbaa !131
  %163 = or disjoint i32 %155, 2, !dbg !887
    #dbg_value(i32 %163, !122, !DIExpression(), !882)
  %164 = getelementptr inbounds nuw i8, ptr %64, i32 %163, !dbg !884
  %165 = load i8, ptr %164, align 2, !dbg !884, !tbaa !131
  %166 = getelementptr inbounds nuw i8, ptr %152, i32 %163, !dbg !885
  store i8 %165, ptr %166, align 2, !dbg !886, !tbaa !131
  %167 = or disjoint i32 %155, 3, !dbg !887
    #dbg_value(i32 %167, !122, !DIExpression(), !882)
  %168 = getelementptr inbounds nuw i8, ptr %64, i32 %167, !dbg !884
  %169 = load i8, ptr %168, align 1, !dbg !884, !tbaa !131
  %170 = getelementptr inbounds nuw i8, ptr %152, i32 %167, !dbg !885
  store i8 %169, ptr %170, align 1, !dbg !886, !tbaa !131
  %171 = add nuw i32 %155, 4, !dbg !887
    #dbg_value(i32 %171, !122, !DIExpression(), !882)
  %172 = icmp eq i32 %171, %153, !dbg !888
  br i1 %172, label %173, label %154, !dbg !883, !llvm.loop !889

173:                                              ; preds = %154, %151
  %174 = getelementptr inbounds nuw i32, ptr %152, i32 %8, !dbg !891
  %175 = shl i32 %98, 2, !dbg !892
    #dbg_value(ptr %174, !110, !DIExpression(), !893)
    #dbg_value(ptr %96, !115, !DIExpression(), !893)
    #dbg_value(i32 %175, !116, !DIExpression(), !893)
    #dbg_value(ptr %174, !117, !DIExpression(), !893)
    #dbg_value(ptr %96, !119, !DIExpression(), !893)
    #dbg_value(i32 0, !122, !DIExpression(), !895)
  %176 = icmp eq i32 %175, 0, !dbg !896
  br i1 %176, label %196, label %177, !dbg !897

177:                                              ; preds = %173, %177
  %178 = phi i32 [ %194, %177 ], [ 0, %173 ]
    #dbg_value(i32 %178, !122, !DIExpression(), !895)
  %179 = getelementptr inbounds nuw i8, ptr %96, i32 %178, !dbg !898
  %180 = load i8, ptr %179, align 1, !dbg !898, !tbaa !131
  %181 = getelementptr inbounds nuw i8, ptr %174, i32 %178, !dbg !899
  store i8 %180, ptr %181, align 4, !dbg !900, !tbaa !131
  %182 = or disjoint i32 %178, 1, !dbg !901
    #dbg_value(i32 %182, !122, !DIExpression(), !895)
  %183 = getelementptr inbounds nuw i8, ptr %96, i32 %182, !dbg !898
  %184 = load i8, ptr %183, align 1, !dbg !898, !tbaa !131
  %185 = getelementptr inbounds nuw i8, ptr %174, i32 %182, !dbg !899
  store i8 %184, ptr %185, align 1, !dbg !900, !tbaa !131
  %186 = or disjoint i32 %178, 2, !dbg !901
    #dbg_value(i32 %186, !122, !DIExpression(), !895)
  %187 = getelementptr inbounds nuw i8, ptr %96, i32 %186, !dbg !898
  %188 = load i8, ptr %187, align 1, !dbg !898, !tbaa !131
  %189 = getelementptr inbounds nuw i8, ptr %174, i32 %186, !dbg !899
  store i8 %188, ptr %189, align 2, !dbg !900, !tbaa !131
  %190 = or disjoint i32 %178, 3, !dbg !901
    #dbg_value(i32 %190, !122, !DIExpression(), !895)
  %191 = getelementptr inbounds nuw i8, ptr %96, i32 %190, !dbg !898
  %192 = load i8, ptr %191, align 1, !dbg !898, !tbaa !131
  %193 = getelementptr inbounds nuw i8, ptr %174, i32 %190, !dbg !899
  store i8 %192, ptr %193, align 1, !dbg !900, !tbaa !131
  %194 = add nuw i32 %178, 4, !dbg !901
    #dbg_value(i32 %194, !122, !DIExpression(), !895)
  %195 = icmp eq i32 %194, %175, !dbg !896
  br i1 %195, label %196, label %177, !dbg !897, !llvm.loop !902

196:                                              ; preds = %177, %173
    #dbg_value(ptr %152, !717, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !746)
    #dbg_value(i32 %124, !717, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !746)
    #dbg_value(ptr %4, !718, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !746)
  %197 = tail call i32 @llvm.umin.i32(i32 %8, i32 %124), !dbg !904
    #dbg_value(i32 %197, !718, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !746)
    #dbg_value(i32 0, !719, !DIExpression(), !905)
  %198 = icmp eq i32 %197, 0, !dbg !906
  br i1 %198, label %201, label %199, !dbg !907

199:                                              ; preds = %196
  %200 = icmp eq i32 %3, 0
  br label %202, !dbg !907

201:                                              ; preds = %221, %196
  ret i32 %197, !dbg !908

202:                                              ; preds = %199, %221
  %203 = phi i32 [ 0, %199 ], [ %224, %221 ]
    #dbg_value(i32 %203, !719, !DIExpression(), !905)
  %204 = getelementptr inbounds nuw i32, ptr %36, i32 %203, !dbg !909
  %205 = load i32, ptr %204, align 4, !dbg !909, !tbaa !329
    #dbg_value(i32 %205, !721, !DIExpression(), !910)
  %206 = getelementptr inbounds nuw i32, ptr %152, i32 %203, !dbg !911
  %207 = load i32, ptr %206, align 4, !dbg !911, !tbaa !329
    #dbg_value(i32 %207, !724, !DIExpression(), !910)
    #dbg_value(i32 %2, !725, !DIExpression(), !910)
    #dbg_value(i32 %3, !726, !DIExpression(), !910)
    #dbg_value(i32 %205, !727, !DIExpression(), !910)
    #dbg_value(i32 %207, !728, !DIExpression(), !910)
    #dbg_value(i32 %2, !729, !DIExpression(), !910)
    #dbg_value(i32 %3, !730, !DIExpression(), !910)
    #dbg_value(i32 %205, !731, !DIExpression(), !910)
  %208 = icmp ult i32 %205, %207, !dbg !912
  br i1 %208, label %209, label %215, !dbg !913

209:                                              ; preds = %202
    #dbg_value(i32 %205, !733, !DIExpression(), !914)
    #dbg_value(i32 %3, !736, !DIExpression(), !914)
  br i1 %200, label %212, label %210, !dbg !915

210:                                              ; preds = %209
  %211 = udiv i32 %205, %3, !dbg !917
    #dbg_value(i32 %211, !737, !DIExpression(), !914)
  br label %212

212:                                              ; preds = %209, %210
  %213 = phi i32 [ %211, %210 ], [ 0, %209 ], !dbg !919
    #dbg_value(i32 %213, !737, !DIExpression(), !914)
    #dbg_value(i32 %213, !738, !DIExpression(), !914)
  %214 = add i32 %213, %207, !dbg !920
    #dbg_value(i32 %214, !732, !DIExpression(), !910)
  br label %221, !dbg !921

215:                                              ; preds = %202
    #dbg_value(i32 %207, !739, !DIExpression(), !922)
    #dbg_value(i32 %3, !741, !DIExpression(), !922)
  br i1 %200, label %218, label %216, !dbg !923

216:                                              ; preds = %215
  %217 = urem i32 %207, %3, !dbg !925
    #dbg_value(i32 %217, !742, !DIExpression(), !922)
  br label %218

218:                                              ; preds = %215, %216
  %219 = phi i32 [ %217, %216 ], [ 0, %215 ], !dbg !927
    #dbg_value(i32 %219, !742, !DIExpression(), !922)
    #dbg_value(i32 %219, !743, !DIExpression(), !922)
  %220 = add i32 %219, %205, !dbg !928
    #dbg_value(i32 %220, !732, !DIExpression(), !910)
  br label %221

221:                                              ; preds = %218, %212
  %222 = phi i32 [ %214, %212 ], [ %220, %218 ], !dbg !929
    #dbg_value(i32 %222, !732, !DIExpression(), !910)
  %223 = getelementptr inbounds nuw i32, ptr %4, i32 %203, !dbg !930
  store i32 %222, ptr %223, align 4, !dbg !931, !tbaa !329
  %224 = add nuw i32 %203, 1, !dbg !932
    #dbg_value(i32 %224, !719, !DIExpression(), !905)
  %225 = icmp eq i32 %224, %197, !dbg !906
  br i1 %225, label %201, label %202, !dbg !907, !llvm.loop !933
}

; Function Attrs: nounwind uwtable
define hidden i32 @ink_compute_into(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readonly %2, ptr nocapture noundef writeonly %3) local_unnamed_addr #2 !dbg !935 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !953)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !953)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !953)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !953)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !953)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !953)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !953)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !953)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !955)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !955)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !955)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !955)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !955)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !955)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !955)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !955)
  %5 = alloca %struct.ink_l_uint32, align 4
  %6 = alloca %struct.ink_l_uint32, align 4
    #dbg_value(i32 %0, !943, !DIExpression(), !957)
    #dbg_value(ptr %1, !944, !DIExpression(), !957)
    #dbg_value(ptr %2, !945, !DIExpression(), !957)
    #dbg_value(ptr %3, !946, !DIExpression(), !957)
  %7 = icmp eq i32 %0, 0, !dbg !958
  br i1 %7, label %8, label %56, !dbg !958

8:                                                ; preds = %4
  %9 = load ptr, ptr %1, align 4, !dbg !959, !tbaa !960
    #dbg_value(ptr %9, !947, !DIExpression(), !961)
  %10 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !962
  %11 = load ptr, ptr %10, align 4, !dbg !962, !tbaa !960
    #dbg_value(ptr %11, !950, !DIExpression(), !961)
  %12 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !963
  %13 = load ptr, ptr %12, align 4, !dbg !963, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !953)
    #dbg_value(ptr %13, !115, !DIExpression(), !953)
    #dbg_value(i32 4, !116, !DIExpression(), !953)
    #dbg_value(ptr undef, !117, !DIExpression(), !953)
    #dbg_value(ptr %13, !119, !DIExpression(), !953)
    #dbg_value(i32 0, !122, !DIExpression(), !964)
  %14 = load i8, ptr %13, align 1, !dbg !965, !tbaa !131
    #dbg_value(i8 %14, !951, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !961)
    #dbg_value(i32 1, !122, !DIExpression(), !964)
  %15 = getelementptr inbounds nuw i8, ptr %13, i32 1, !dbg !965
  %16 = load i8, ptr %15, align 1, !dbg !965, !tbaa !131
    #dbg_value(i8 %16, !951, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !961)
    #dbg_value(i32 2, !122, !DIExpression(), !964)
  %17 = getelementptr inbounds nuw i8, ptr %13, i32 2, !dbg !965
  %18 = load i8, ptr %17, align 1, !dbg !965, !tbaa !131
    #dbg_value(i8 %18, !951, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !961)
    #dbg_value(i32 3, !122, !DIExpression(), !964)
  %19 = getelementptr inbounds nuw i8, ptr %13, i32 3, !dbg !965
  %20 = load i8, ptr %19, align 1, !dbg !965, !tbaa !131
    #dbg_value(i8 %20, !951, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !961)
    #dbg_value(i32 4, !122, !DIExpression(), !964)
  %21 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !966
  %22 = load ptr, ptr %21, align 4, !dbg !966, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !955)
    #dbg_value(ptr %22, !115, !DIExpression(), !955)
    #dbg_value(i32 4, !116, !DIExpression(), !955)
    #dbg_value(ptr undef, !117, !DIExpression(), !955)
    #dbg_value(ptr %22, !119, !DIExpression(), !955)
    #dbg_value(i32 0, !122, !DIExpression(), !967)
  %23 = load i8, ptr %22, align 1, !dbg !968, !tbaa !131
    #dbg_value(i8 %23, !952, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !961)
    #dbg_value(i32 1, !122, !DIExpression(), !967)
  %24 = getelementptr inbounds nuw i8, ptr %22, i32 1, !dbg !968
  %25 = load i8, ptr %24, align 1, !dbg !968, !tbaa !131
    #dbg_value(i8 %25, !952, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !961)
    #dbg_value(i32 2, !122, !DIExpression(), !967)
  %26 = getelementptr inbounds nuw i8, ptr %22, i32 2, !dbg !968
  %27 = load i8, ptr %26, align 1, !dbg !968, !tbaa !131
    #dbg_value(i8 %27, !952, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !961)
    #dbg_value(i32 3, !122, !DIExpression(), !967)
  %28 = getelementptr inbounds nuw i8, ptr %22, i32 3, !dbg !968
  %29 = load i8, ptr %28, align 1, !dbg !968, !tbaa !131
    #dbg_value(i8 %29, !952, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !961)
    #dbg_value(i32 4, !122, !DIExpression(), !967)
  store ptr %9, ptr %5, align 4, !dbg !969, !tbaa !451
  %30 = getelementptr inbounds nuw i8, ptr %5, i32 4, !dbg !969
  %31 = load i32, ptr %2, align 4, !dbg !970, !tbaa !27
  store i32 %31, ptr %30, align 4, !dbg !969, !tbaa !453
  store ptr %11, ptr %6, align 4, !dbg !971, !tbaa !451
  %32 = getelementptr inbounds nuw i8, ptr %6, i32 4, !dbg !971
  %33 = getelementptr inbounds nuw i8, ptr %2, i32 4, !dbg !972
  %34 = load i32, ptr %33, align 4, !dbg !972, !tbaa !27
  store i32 %34, ptr %32, align 4, !dbg !971, !tbaa !453
  %35 = zext i8 %20 to i32, !dbg !973
  %36 = shl nuw i32 %35, 24, !dbg !973
  %37 = zext i8 %18 to i32, !dbg !973
  %38 = shl nuw nsw i32 %37, 16, !dbg !973
  %39 = or disjoint i32 %36, %38, !dbg !973
  %40 = zext i8 %16 to i32, !dbg !973
  %41 = shl nuw nsw i32 %40, 8, !dbg !973
  %42 = or disjoint i32 %39, %41, !dbg !973
  %43 = zext i8 %14 to i32, !dbg !973
  %44 = or disjoint i32 %42, %43, !dbg !973
  %45 = zext i8 %29 to i32, !dbg !974
  %46 = shl nuw i32 %45, 24, !dbg !974
  %47 = zext i8 %27 to i32, !dbg !974
  %48 = shl nuw nsw i32 %47, 16, !dbg !974
  %49 = or disjoint i32 %46, %48, !dbg !974
  %50 = zext i8 %25 to i32, !dbg !974
  %51 = shl nuw nsw i32 %50, 8, !dbg !974
  %52 = or disjoint i32 %49, %51, !dbg !974
  %53 = zext i8 %23 to i32, !dbg !974
  %54 = or disjoint i32 %52, %53, !dbg !974
  %55 = tail call i32 @lang_fn_pipeline38_right_padded_zip_heldout_u32_into(ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %5, ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %6, i32 noundef %44, i32 noundef %54, ptr noundef %3) #13, !dbg !974
  ret i32 %55, !dbg !975

56:                                               ; preds = %4
  tail call void @llvm.trap(), !dbg !976
  unreachable, !dbg !978
}

; Function Attrs: nounwind uwtable
define hidden void @ink_compute_call(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readonly %2, ptr nocapture noundef writeonly %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #2 !dbg !979 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1039)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1039)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1039)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1039)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1039)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1039)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1039)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1039)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1041)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1041)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1041)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1041)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1041)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1041)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1041)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1041)
  %6 = alloca %struct.ink_l_uint32, align 4, !DIAssignID !1043
    #dbg_assign(i1 undef, !996, !DIExpression(), !1043, ptr %6, !DIExpression(), !1044)
  %7 = alloca %struct.ink_l_uint32, align 4
  %8 = alloca %struct.ink_l_uint32, align 4
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1045)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1045)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1045)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1045)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1045)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1045)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1045)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1045)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1047)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1047)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1047)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1047)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1047)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1047)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1047)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1047)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1049)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1049)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1049)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1049)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1049)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1049)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1049)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1049)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1051)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1051)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1051)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1051)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1051)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1051)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1051)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1051)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1053)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1053)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1053)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1053)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1053)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1053)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1053)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1053)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1055)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1055)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1055)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1055)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1055)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1055)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1055)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1055)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1057)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1057)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1057)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1057)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1057)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1057)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1057)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1057)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1059)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1059)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1059)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1059)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1059)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1059)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1059)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1059)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1061)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1061)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1061)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1061)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1061)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1061)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1061)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1061)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1063)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1063)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1063)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1063)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1063)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1063)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1063)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1063)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1065)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1065)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1065)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1065)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1065)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1065)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1065)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1065)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1067)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1067)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1067)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1067)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1067)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1067)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1067)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1067)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1069)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1069)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1069)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1069)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1069)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1069)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1069)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1069)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1071)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1071)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1071)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1071)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1071)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1071)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1071)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1071)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1073)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1073)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1073)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1073)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1073)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1073)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1073)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1073)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1075)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1075)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1075)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1075)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1075)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1075)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1075)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1075)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1077)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1077)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1077)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1077)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1077)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1077)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1077)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1077)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1079)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1079)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1079)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1079)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1079)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1079)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1079)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1079)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1081)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1081)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1081)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1081)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1081)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1081)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1081)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1081)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1083)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1083)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1083)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1083)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1083)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1083)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1083)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1083)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1085)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1085)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1085)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1085)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1085)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1085)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1085)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1085)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1087)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1087)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1087)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1087)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1087)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1087)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1087)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1087)
    #dbg_value(i32 %0, !985, !DIExpression(), !1089)
    #dbg_value(ptr %1, !986, !DIExpression(), !1089)
    #dbg_value(ptr %2, !987, !DIExpression(), !1089)
    #dbg_value(ptr %3, !988, !DIExpression(), !1089)
    #dbg_value(ptr %4, !989, !DIExpression(), !1089)
  switch i32 %0, label %653 [
    i32 0, label %9
    i32 1, label %59
    i32 2, label %163
    i32 3, label %267
    i32 4, label %367
    i32 5, label %467
    i32 6, label %560
  ], !dbg !1090

9:                                                ; preds = %5
  %10 = load ptr, ptr %1, align 4, !dbg !1091, !tbaa !960
    #dbg_value(ptr %10, !990, !DIExpression(), !1044)
  %11 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1092
  %12 = load ptr, ptr %11, align 4, !dbg !1092, !tbaa !960
    #dbg_value(ptr %12, !993, !DIExpression(), !1044)
  %13 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1093
  %14 = load ptr, ptr %13, align 4, !dbg !1093, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1039)
    #dbg_value(ptr %14, !115, !DIExpression(), !1039)
    #dbg_value(i32 4, !116, !DIExpression(), !1039)
    #dbg_value(ptr undef, !117, !DIExpression(), !1039)
    #dbg_value(ptr %14, !119, !DIExpression(), !1039)
    #dbg_value(i32 0, !122, !DIExpression(), !1094)
  %15 = load i8, ptr %14, align 1, !dbg !1095, !tbaa !131
    #dbg_value(i8 %15, !994, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1044)
    #dbg_value(i32 1, !122, !DIExpression(), !1094)
  %16 = getelementptr inbounds nuw i8, ptr %14, i32 1, !dbg !1095
  %17 = load i8, ptr %16, align 1, !dbg !1095, !tbaa !131
    #dbg_value(i8 %17, !994, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1044)
    #dbg_value(i32 2, !122, !DIExpression(), !1094)
  %18 = getelementptr inbounds nuw i8, ptr %14, i32 2, !dbg !1095
  %19 = load i8, ptr %18, align 1, !dbg !1095, !tbaa !131
    #dbg_value(i8 %19, !994, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1044)
    #dbg_value(i32 3, !122, !DIExpression(), !1094)
  %20 = getelementptr inbounds nuw i8, ptr %14, i32 3, !dbg !1095
  %21 = load i8, ptr %20, align 1, !dbg !1095, !tbaa !131
    #dbg_value(i8 %21, !994, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1044)
    #dbg_value(i32 4, !122, !DIExpression(), !1094)
  %22 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1096
  %23 = load ptr, ptr %22, align 4, !dbg !1096, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1041)
    #dbg_value(ptr %23, !115, !DIExpression(), !1041)
    #dbg_value(i32 4, !116, !DIExpression(), !1041)
    #dbg_value(ptr undef, !117, !DIExpression(), !1041)
    #dbg_value(ptr %23, !119, !DIExpression(), !1041)
    #dbg_value(i32 0, !122, !DIExpression(), !1097)
  %24 = load i8, ptr %23, align 1, !dbg !1098, !tbaa !131
    #dbg_value(i8 %24, !995, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1044)
    #dbg_value(i32 1, !122, !DIExpression(), !1097)
  %25 = getelementptr inbounds nuw i8, ptr %23, i32 1, !dbg !1098
  %26 = load i8, ptr %25, align 1, !dbg !1098, !tbaa !131
    #dbg_value(i8 %26, !995, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1044)
    #dbg_value(i32 2, !122, !DIExpression(), !1097)
  %27 = getelementptr inbounds nuw i8, ptr %23, i32 2, !dbg !1098
  %28 = load i8, ptr %27, align 1, !dbg !1098, !tbaa !131
    #dbg_value(i8 %28, !995, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1044)
    #dbg_value(i32 3, !122, !DIExpression(), !1097)
  %29 = getelementptr inbounds nuw i8, ptr %23, i32 3, !dbg !1098
  %30 = load i8, ptr %29, align 1, !dbg !1098, !tbaa !131
    #dbg_value(i8 %30, !995, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1044)
    #dbg_value(i32 4, !122, !DIExpression(), !1097)
  call void @llvm.lifetime.start.p0(i64 8, ptr nonnull %6) #14, !dbg !1099
  store ptr %10, ptr %7, align 4, !dbg !1100, !tbaa !451
  %31 = getelementptr inbounds nuw i8, ptr %7, i32 4, !dbg !1100
  %32 = load i32, ptr %2, align 4, !dbg !1101, !tbaa !27
  store i32 %32, ptr %31, align 4, !dbg !1100, !tbaa !453
  store ptr %12, ptr %8, align 4, !dbg !1102, !tbaa !451
  %33 = getelementptr inbounds nuw i8, ptr %8, i32 4, !dbg !1102
  %34 = getelementptr inbounds nuw i8, ptr %2, i32 4, !dbg !1103
  %35 = load i32, ptr %34, align 4, !dbg !1103, !tbaa !27
  store i32 %35, ptr %33, align 4, !dbg !1102, !tbaa !453
  %36 = zext i8 %21 to i32, !dbg !1104
  %37 = shl nuw i32 %36, 24, !dbg !1104
  %38 = zext i8 %19 to i32, !dbg !1104
  %39 = shl nuw nsw i32 %38, 16, !dbg !1104
  %40 = or disjoint i32 %37, %39, !dbg !1104
  %41 = zext i8 %17 to i32, !dbg !1104
  %42 = shl nuw nsw i32 %41, 8, !dbg !1104
  %43 = or disjoint i32 %40, %42, !dbg !1104
  %44 = zext i8 %15 to i32, !dbg !1104
  %45 = or disjoint i32 %43, %44, !dbg !1104
  %46 = zext i8 %30 to i32, !dbg !1105
  %47 = shl nuw i32 %46, 24, !dbg !1105
  %48 = zext i8 %28 to i32, !dbg !1105
  %49 = shl nuw nsw i32 %48, 16, !dbg !1105
  %50 = or disjoint i32 %47, %49, !dbg !1105
  %51 = zext i8 %26 to i32, !dbg !1105
  %52 = shl nuw nsw i32 %51, 8, !dbg !1105
  %53 = or disjoint i32 %50, %52, !dbg !1105
  %54 = zext i8 %24 to i32, !dbg !1105
  %55 = or disjoint i32 %53, %54, !dbg !1105
  call void @lang_fn_pipeline38_right_padded_zip_heldout_u32(ptr dead_on_unwind nonnull writable sret(%struct.ink_l_uint32) align 4 %6, ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %7, ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %8, i32 noundef %45, i32 noundef %55) #13, !dbg !1105
  %56 = load ptr, ptr %6, align 4, !dbg !1106, !tbaa !451
  store ptr %56, ptr %3, align 4, !dbg !1107, !tbaa !960
  %57 = getelementptr inbounds nuw i8, ptr %6, i32 4, !dbg !1108
  %58 = load i32, ptr %57, align 4, !dbg !1108, !tbaa !453
  store i32 %58, ptr %4, align 4, !dbg !1109, !tbaa !27
  call void @llvm.lifetime.end.p0(i64 8, ptr nonnull %6) #14, !dbg !1110
  br label %654

59:                                               ; preds = %5
    #dbg_value(ptr undef, !110, !DIExpression(), !1045)
    #dbg_value(ptr poison, !115, !DIExpression(), !1045)
    #dbg_value(i32 4, !116, !DIExpression(), !1045)
    #dbg_value(ptr undef, !117, !DIExpression(), !1045)
    #dbg_value(ptr poison, !119, !DIExpression(), !1045)
    #dbg_value(i8 poison, !997, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1111)
    #dbg_value(i8 poison, !997, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1111)
    #dbg_value(i8 poison, !997, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1111)
    #dbg_value(i8 poison, !997, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1111)
    #dbg_value(i32 4, !122, !DIExpression(), !1112)
    #dbg_value(ptr undef, !110, !DIExpression(), !1047)
    #dbg_value(ptr poison, !115, !DIExpression(), !1047)
    #dbg_value(i32 4, !116, !DIExpression(), !1047)
    #dbg_value(ptr undef, !117, !DIExpression(), !1047)
    #dbg_value(ptr poison, !119, !DIExpression(), !1047)
    #dbg_value(i8 poison, !999, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1111)
    #dbg_value(i8 poison, !999, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1111)
    #dbg_value(i8 poison, !999, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1111)
    #dbg_value(i8 poison, !999, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1111)
    #dbg_value(i32 4, !122, !DIExpression(), !1113)
  %60 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1114
  %61 = load ptr, ptr %60, align 4, !dbg !1114, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1049)
    #dbg_value(ptr %61, !115, !DIExpression(), !1049)
    #dbg_value(i32 4, !116, !DIExpression(), !1049)
    #dbg_value(ptr undef, !117, !DIExpression(), !1049)
    #dbg_value(ptr %61, !119, !DIExpression(), !1049)
    #dbg_value(i32 0, !122, !DIExpression(), !1115)
  %62 = load i8, ptr %61, align 1, !dbg !1116, !tbaa !131
    #dbg_value(i8 %62, !1000, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1111)
    #dbg_value(i32 1, !122, !DIExpression(), !1115)
  %63 = getelementptr inbounds nuw i8, ptr %61, i32 1, !dbg !1116
  %64 = load i8, ptr %63, align 1, !dbg !1116, !tbaa !131
    #dbg_value(i8 %64, !1000, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1111)
    #dbg_value(i32 2, !122, !DIExpression(), !1115)
  %65 = getelementptr inbounds nuw i8, ptr %61, i32 2, !dbg !1116
  %66 = load i8, ptr %65, align 1, !dbg !1116, !tbaa !131
    #dbg_value(i8 %66, !1000, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1111)
    #dbg_value(i32 3, !122, !DIExpression(), !1115)
  %67 = getelementptr inbounds nuw i8, ptr %61, i32 3, !dbg !1116
  %68 = load i8, ptr %67, align 1, !dbg !1116, !tbaa !131
    #dbg_value(i8 %68, !1000, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1111)
    #dbg_value(i32 4, !122, !DIExpression(), !1115)
  %69 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1117
  %70 = load ptr, ptr %69, align 4, !dbg !1117, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1051)
    #dbg_value(ptr %70, !115, !DIExpression(), !1051)
    #dbg_value(i32 4, !116, !DIExpression(), !1051)
    #dbg_value(ptr undef, !117, !DIExpression(), !1051)
    #dbg_value(ptr %70, !119, !DIExpression(), !1051)
    #dbg_value(i32 0, !122, !DIExpression(), !1118)
  %71 = load i8, ptr %70, align 1, !dbg !1119, !tbaa !131
    #dbg_value(i8 %71, !1001, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1111)
    #dbg_value(i32 1, !122, !DIExpression(), !1118)
  %72 = getelementptr inbounds nuw i8, ptr %70, i32 1, !dbg !1119
  %73 = load i8, ptr %72, align 1, !dbg !1119, !tbaa !131
    #dbg_value(i8 %73, !1001, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1111)
    #dbg_value(i32 2, !122, !DIExpression(), !1118)
  %74 = getelementptr inbounds nuw i8, ptr %70, i32 2, !dbg !1119
  %75 = load i8, ptr %74, align 1, !dbg !1119, !tbaa !131
    #dbg_value(i8 %75, !1001, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1111)
    #dbg_value(i32 3, !122, !DIExpression(), !1118)
  %76 = getelementptr inbounds nuw i8, ptr %70, i32 3, !dbg !1119
  %77 = load i8, ptr %76, align 1, !dbg !1119, !tbaa !131
    #dbg_value(i8 %77, !1001, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1111)
    #dbg_value(i32 4, !122, !DIExpression(), !1118)
  %78 = zext i8 %68 to i32, !dbg !1120
  %79 = shl nuw i32 %78, 24, !dbg !1120
  %80 = zext i8 %66 to i32, !dbg !1120
  %81 = shl nuw nsw i32 %80, 16, !dbg !1120
  %82 = or disjoint i32 %79, %81, !dbg !1120
  %83 = zext i8 %64 to i32, !dbg !1120
  %84 = shl nuw nsw i32 %83, 8, !dbg !1120
  %85 = or disjoint i32 %82, %84, !dbg !1120
  %86 = zext i8 %62 to i32, !dbg !1120
  %87 = or disjoint i32 %85, %86, !dbg !1120
  %88 = zext i8 %77 to i32, !dbg !1121
  %89 = shl nuw i32 %88, 24, !dbg !1121
  %90 = zext i8 %75 to i32, !dbg !1121
  %91 = shl nuw nsw i32 %90, 16, !dbg !1121
  %92 = or disjoint i32 %89, %91, !dbg !1121
  %93 = zext i8 %73 to i32, !dbg !1121
  %94 = shl nuw nsw i32 %93, 8, !dbg !1121
  %95 = or disjoint i32 %92, %94, !dbg !1121
  %96 = zext i8 %71 to i32, !dbg !1121
  %97 = or disjoint i32 %95, %96, !dbg !1121
    #dbg_value(i32 poison, !488, !DIExpression(), !1123)
    #dbg_value(i32 poison, !489, !DIExpression(), !1123)
    #dbg_value(i32 %87, !490, !DIExpression(), !1123)
    #dbg_value(i32 %97, !491, !DIExpression(), !1123)
    #dbg_value(i32 poison, !492, !DIExpression(), !1123)
    #dbg_value(i32 poison, !493, !DIExpression(), !1123)
    #dbg_value(i32 %87, !494, !DIExpression(), !1123)
    #dbg_value(i32 %97, !495, !DIExpression(), !1123)
    #dbg_value(i32 poison, !496, !DIExpression(), !1123)
    #dbg_value(i32 %97, !497, !DIExpression(), !1123)
  %98 = icmp eq i32 %97, 0, !dbg !1121
  br i1 %98, label %140, label %99, !dbg !1121

99:                                               ; preds = %59
  %100 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1124
  %101 = load ptr, ptr %100, align 4, !dbg !1124, !tbaa !960
    #dbg_value(ptr %101, !115, !DIExpression(), !1047)
    #dbg_value(ptr %101, !119, !DIExpression(), !1047)
  %102 = getelementptr inbounds nuw i8, ptr %101, i32 3, !dbg !1125
  %103 = load i8, ptr %102, align 1, !dbg !1125, !tbaa !131
    #dbg_value(i8 %103, !999, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1111)
  %104 = getelementptr inbounds nuw i8, ptr %101, i32 2, !dbg !1125
  %105 = load i8, ptr %104, align 1, !dbg !1125, !tbaa !131
    #dbg_value(i8 %105, !999, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1111)
  %106 = getelementptr inbounds nuw i8, ptr %101, i32 1, !dbg !1125
  %107 = load i8, ptr %106, align 1, !dbg !1125, !tbaa !131
    #dbg_value(i8 %107, !999, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1111)
  %108 = load i8, ptr %101, align 1, !dbg !1125, !tbaa !131
    #dbg_value(i8 %108, !999, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1111)
  %109 = load ptr, ptr %1, align 4, !dbg !1126, !tbaa !960
    #dbg_value(ptr %109, !115, !DIExpression(), !1045)
    #dbg_value(ptr %109, !119, !DIExpression(), !1045)
  %110 = getelementptr inbounds nuw i8, ptr %109, i32 3, !dbg !1127
  %111 = load i8, ptr %110, align 1, !dbg !1127, !tbaa !131
    #dbg_value(i8 %111, !997, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1111)
  %112 = getelementptr inbounds nuw i8, ptr %109, i32 2, !dbg !1127
  %113 = load i8, ptr %112, align 1, !dbg !1127, !tbaa !131
    #dbg_value(i8 %113, !997, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1111)
  %114 = getelementptr inbounds nuw i8, ptr %109, i32 1, !dbg !1127
  %115 = load i8, ptr %114, align 1, !dbg !1127, !tbaa !131
    #dbg_value(i8 %115, !997, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1111)
  %116 = load i8, ptr %109, align 1, !dbg !1127, !tbaa !131
    #dbg_value(i8 %116, !997, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1111)
  %117 = zext i8 %103 to i32, !dbg !1128
  %118 = shl nuw i32 %117, 24, !dbg !1128
  %119 = zext i8 %105 to i32, !dbg !1128
  %120 = shl nuw nsw i32 %119, 16, !dbg !1128
  %121 = or disjoint i32 %118, %120, !dbg !1128
  %122 = zext i8 %107 to i32, !dbg !1128
  %123 = shl nuw nsw i32 %122, 8, !dbg !1128
  %124 = or disjoint i32 %121, %123, !dbg !1128
  %125 = zext i8 %108 to i32, !dbg !1128
  %126 = or disjoint i32 %124, %125, !dbg !1128
    #dbg_value(i32 %126, !489, !DIExpression(), !1123)
    #dbg_value(i32 %126, !493, !DIExpression(), !1123)
    #dbg_value(i32 %126, !496, !DIExpression(), !1123)
  %127 = zext i8 %111 to i32, !dbg !1129
  %128 = shl nuw i32 %127, 24, !dbg !1129
  %129 = zext i8 %113 to i32, !dbg !1129
  %130 = shl nuw nsw i32 %129, 16, !dbg !1129
  %131 = or disjoint i32 %128, %130, !dbg !1129
  %132 = zext i8 %115 to i32, !dbg !1129
  %133 = shl nuw nsw i32 %132, 8, !dbg !1129
  %134 = or disjoint i32 %131, %133, !dbg !1129
  %135 = zext i8 %116 to i32, !dbg !1129
  %136 = or disjoint i32 %134, %135, !dbg !1129
    #dbg_value(i32 %136, !488, !DIExpression(), !1123)
    #dbg_value(i32 %136, !492, !DIExpression(), !1123)
  %137 = udiv i32 %126, %97, !dbg !1129
    #dbg_value(i32 %137, !498, !DIExpression(), !1123)
    #dbg_value(i32 %137, !499, !DIExpression(), !1123)
    #dbg_value(i32 %136, !500, !DIExpression(), !1123)
    #dbg_value(i32 %97, !501, !DIExpression(), !1123)
  %138 = urem i32 %136, %97, !dbg !1130
    #dbg_value(i32 %138, !502, !DIExpression(), !1123)
  %139 = add i32 %138, %137
  br label %140

140:                                              ; preds = %59, %99
  %141 = phi i32 [ %139, %99 ], [ 0, %59 ], !dbg !1131
    #dbg_value(i32 poison, !502, !DIExpression(), !1123)
    #dbg_value(i32 %141, !503, !DIExpression(), !1123)
  %142 = add i32 %141, %87, !dbg !1132
    #dbg_value(i32 %142, !1002, !DIExpression(), !1111)
    #dbg_value(i32 1, !55, !DIExpression(), !1133)
    #dbg_value(i32 4, !56, !DIExpression(), !1133)
  %143 = load i32, ptr @ink_top, align 4
  %144 = icmp ugt i32 %143, -8
  br i1 %144, label %145, label %146, !dbg !1135

145:                                              ; preds = %140
  tail call void @llvm.trap(), !dbg !1136
  unreachable, !dbg !1138

146:                                              ; preds = %140
  %147 = icmp eq i32 %143, 0, !dbg !1139
  %148 = add nuw i32 %143, 7, !dbg !1140
  %149 = select i1 %147, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %148, !dbg !1141
  %150 = and i32 %149, -8, !dbg !1142
    #dbg_value(i32 %150, !57, !DIExpression(), !1133)
    #dbg_value(i32 4, !58, !DIExpression(), !1133)
  %151 = or disjoint i32 %150, 4, !dbg !1143
  store i32 %151, ptr @ink_top, align 4, !dbg !1144, !tbaa !27
  %152 = add i32 %150, 65539, !dbg !1145
  %153 = lshr i32 %152, 16, !dbg !1146
    #dbg_value(i32 %153, !59, !DIExpression(), !1133)
  %154 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1147
    #dbg_value(i32 %154, !60, !DIExpression(), !1133)
  %155 = icmp ugt i32 %153, %154, !dbg !1148
  br i1 %155, label %156, label %161, !dbg !1149

156:                                              ; preds = %146
  %157 = sub nuw nsw i32 %153, %154, !dbg !1150
  %158 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %157), !dbg !1151
  %159 = icmp eq i32 %158, -1, !dbg !1152
  br i1 %159, label %160, label %161, !dbg !1149

160:                                              ; preds = %156
  tail call void @llvm.trap(), !dbg !1153
  unreachable, !dbg !1155

161:                                              ; preds = %146, %156
  %162 = inttoptr i32 %150 to ptr, !dbg !1156
    #dbg_value(ptr %162, !1003, !DIExpression(), !1111)
  store i32 %142, ptr %162, align 8, !dbg !1157, !tbaa !329
  store ptr %162, ptr %3, align 4, !dbg !1158, !tbaa !960
  store i32 1, ptr %4, align 4, !dbg !1159, !tbaa !27
  br label %654

163:                                              ; preds = %5
    #dbg_value(ptr undef, !110, !DIExpression(), !1053)
    #dbg_value(ptr poison, !115, !DIExpression(), !1053)
    #dbg_value(i32 4, !116, !DIExpression(), !1053)
    #dbg_value(ptr undef, !117, !DIExpression(), !1053)
    #dbg_value(ptr poison, !119, !DIExpression(), !1053)
    #dbg_value(i8 poison, !1004, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1160)
    #dbg_value(i8 poison, !1004, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1160)
    #dbg_value(i8 poison, !1004, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1160)
    #dbg_value(i8 poison, !1004, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1160)
    #dbg_value(i32 4, !122, !DIExpression(), !1161)
    #dbg_value(ptr undef, !110, !DIExpression(), !1055)
    #dbg_value(ptr poison, !115, !DIExpression(), !1055)
    #dbg_value(i32 4, !116, !DIExpression(), !1055)
    #dbg_value(ptr undef, !117, !DIExpression(), !1055)
    #dbg_value(ptr poison, !119, !DIExpression(), !1055)
    #dbg_value(i8 poison, !1006, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1160)
    #dbg_value(i8 poison, !1006, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1160)
    #dbg_value(i8 poison, !1006, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1160)
    #dbg_value(i8 poison, !1006, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1160)
    #dbg_value(i32 4, !122, !DIExpression(), !1162)
  %164 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1163
  %165 = load ptr, ptr %164, align 4, !dbg !1163, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1057)
    #dbg_value(ptr %165, !115, !DIExpression(), !1057)
    #dbg_value(i32 4, !116, !DIExpression(), !1057)
    #dbg_value(ptr undef, !117, !DIExpression(), !1057)
    #dbg_value(ptr %165, !119, !DIExpression(), !1057)
    #dbg_value(i32 0, !122, !DIExpression(), !1164)
  %166 = load i8, ptr %165, align 1, !dbg !1165, !tbaa !131
    #dbg_value(i8 %166, !1007, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1160)
    #dbg_value(i32 1, !122, !DIExpression(), !1164)
  %167 = getelementptr inbounds nuw i8, ptr %165, i32 1, !dbg !1165
  %168 = load i8, ptr %167, align 1, !dbg !1165, !tbaa !131
    #dbg_value(i8 %168, !1007, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1160)
    #dbg_value(i32 2, !122, !DIExpression(), !1164)
  %169 = getelementptr inbounds nuw i8, ptr %165, i32 2, !dbg !1165
  %170 = load i8, ptr %169, align 1, !dbg !1165, !tbaa !131
    #dbg_value(i8 %170, !1007, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1160)
    #dbg_value(i32 3, !122, !DIExpression(), !1164)
  %171 = getelementptr inbounds nuw i8, ptr %165, i32 3, !dbg !1165
  %172 = load i8, ptr %171, align 1, !dbg !1165, !tbaa !131
    #dbg_value(i8 %172, !1007, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1160)
    #dbg_value(i32 4, !122, !DIExpression(), !1164)
  %173 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1166
  %174 = load ptr, ptr %173, align 4, !dbg !1166, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1059)
    #dbg_value(ptr %174, !115, !DIExpression(), !1059)
    #dbg_value(i32 4, !116, !DIExpression(), !1059)
    #dbg_value(ptr undef, !117, !DIExpression(), !1059)
    #dbg_value(ptr %174, !119, !DIExpression(), !1059)
    #dbg_value(i32 0, !122, !DIExpression(), !1167)
  %175 = load i8, ptr %174, align 1, !dbg !1168, !tbaa !131
    #dbg_value(i8 %175, !1008, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1160)
    #dbg_value(i32 1, !122, !DIExpression(), !1167)
  %176 = getelementptr inbounds nuw i8, ptr %174, i32 1, !dbg !1168
  %177 = load i8, ptr %176, align 1, !dbg !1168, !tbaa !131
    #dbg_value(i8 %177, !1008, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1160)
    #dbg_value(i32 2, !122, !DIExpression(), !1167)
  %178 = getelementptr inbounds nuw i8, ptr %174, i32 2, !dbg !1168
  %179 = load i8, ptr %178, align 1, !dbg !1168, !tbaa !131
    #dbg_value(i8 %179, !1008, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1160)
    #dbg_value(i32 3, !122, !DIExpression(), !1167)
  %180 = getelementptr inbounds nuw i8, ptr %174, i32 3, !dbg !1168
  %181 = load i8, ptr %180, align 1, !dbg !1168, !tbaa !131
    #dbg_value(i8 %181, !1008, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1160)
    #dbg_value(i32 4, !122, !DIExpression(), !1167)
  %182 = zext i8 %172 to i32, !dbg !1169
  %183 = shl nuw i32 %182, 24, !dbg !1169
  %184 = zext i8 %170 to i32, !dbg !1169
  %185 = shl nuw nsw i32 %184, 16, !dbg !1169
  %186 = or disjoint i32 %183, %185, !dbg !1169
  %187 = zext i8 %168 to i32, !dbg !1169
  %188 = shl nuw nsw i32 %187, 8, !dbg !1169
  %189 = or disjoint i32 %186, %188, !dbg !1169
  %190 = zext i8 %166 to i32, !dbg !1169
  %191 = or disjoint i32 %189, %190, !dbg !1169
  %192 = zext i8 %181 to i32, !dbg !1170
  %193 = shl nuw i32 %192, 24, !dbg !1170
  %194 = zext i8 %179 to i32, !dbg !1170
  %195 = shl nuw nsw i32 %194, 16, !dbg !1170
  %196 = or disjoint i32 %193, %195, !dbg !1170
  %197 = zext i8 %177 to i32, !dbg !1170
  %198 = shl nuw nsw i32 %197, 8, !dbg !1170
  %199 = or disjoint i32 %196, %198, !dbg !1170
  %200 = zext i8 %175 to i32, !dbg !1170
  %201 = or disjoint i32 %199, %200, !dbg !1170
    #dbg_value(i32 poison, !517, !DIExpression(), !1172)
    #dbg_value(i32 poison, !518, !DIExpression(), !1172)
    #dbg_value(i32 %191, !519, !DIExpression(), !1172)
    #dbg_value(i32 %201, !520, !DIExpression(), !1172)
    #dbg_value(i32 poison, !521, !DIExpression(), !1172)
    #dbg_value(i32 %201, !522, !DIExpression(), !1172)
  %202 = icmp eq i32 %201, 0, !dbg !1170
  br i1 %202, label %244, label %203, !dbg !1170

203:                                              ; preds = %163
  %204 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1173
  %205 = load ptr, ptr %204, align 4, !dbg !1173, !tbaa !960
    #dbg_value(ptr %205, !115, !DIExpression(), !1055)
    #dbg_value(ptr %205, !119, !DIExpression(), !1055)
  %206 = getelementptr inbounds nuw i8, ptr %205, i32 3, !dbg !1174
  %207 = load i8, ptr %206, align 1, !dbg !1174, !tbaa !131
    #dbg_value(i8 %207, !1006, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1160)
  %208 = getelementptr inbounds nuw i8, ptr %205, i32 2, !dbg !1174
  %209 = load i8, ptr %208, align 1, !dbg !1174, !tbaa !131
    #dbg_value(i8 %209, !1006, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1160)
  %210 = getelementptr inbounds nuw i8, ptr %205, i32 1, !dbg !1174
  %211 = load i8, ptr %210, align 1, !dbg !1174, !tbaa !131
    #dbg_value(i8 %211, !1006, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1160)
  %212 = load i8, ptr %205, align 1, !dbg !1174, !tbaa !131
    #dbg_value(i8 %212, !1006, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1160)
  %213 = load ptr, ptr %1, align 4, !dbg !1175, !tbaa !960
    #dbg_value(ptr %213, !115, !DIExpression(), !1053)
    #dbg_value(ptr %213, !119, !DIExpression(), !1053)
  %214 = getelementptr inbounds nuw i8, ptr %213, i32 3, !dbg !1176
  %215 = load i8, ptr %214, align 1, !dbg !1176, !tbaa !131
    #dbg_value(i8 %215, !1004, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1160)
  %216 = getelementptr inbounds nuw i8, ptr %213, i32 2, !dbg !1176
  %217 = load i8, ptr %216, align 1, !dbg !1176, !tbaa !131
    #dbg_value(i8 %217, !1004, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1160)
  %218 = getelementptr inbounds nuw i8, ptr %213, i32 1, !dbg !1176
  %219 = load i8, ptr %218, align 1, !dbg !1176, !tbaa !131
    #dbg_value(i8 %219, !1004, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1160)
  %220 = load i8, ptr %213, align 1, !dbg !1176, !tbaa !131
    #dbg_value(i8 %220, !1004, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1160)
  %221 = zext i8 %207 to i32, !dbg !1177
  %222 = shl nuw i32 %221, 24, !dbg !1177
  %223 = zext i8 %209 to i32, !dbg !1177
  %224 = shl nuw nsw i32 %223, 16, !dbg !1177
  %225 = or disjoint i32 %222, %224, !dbg !1177
  %226 = zext i8 %211 to i32, !dbg !1177
  %227 = shl nuw nsw i32 %226, 8, !dbg !1177
  %228 = or disjoint i32 %225, %227, !dbg !1177
  %229 = zext i8 %212 to i32, !dbg !1177
  %230 = or disjoint i32 %228, %229, !dbg !1177
    #dbg_value(i32 %230, !518, !DIExpression(), !1172)
    #dbg_value(i32 %230, !521, !DIExpression(), !1172)
  %231 = zext i8 %215 to i32, !dbg !1178
  %232 = shl nuw i32 %231, 24, !dbg !1178
  %233 = zext i8 %217 to i32, !dbg !1178
  %234 = shl nuw nsw i32 %233, 16, !dbg !1178
  %235 = or disjoint i32 %232, %234, !dbg !1178
  %236 = zext i8 %219 to i32, !dbg !1178
  %237 = shl nuw nsw i32 %236, 8, !dbg !1178
  %238 = or disjoint i32 %235, %237, !dbg !1178
  %239 = zext i8 %220 to i32, !dbg !1178
  %240 = or disjoint i32 %238, %239, !dbg !1178
    #dbg_value(i32 %240, !517, !DIExpression(), !1172)
  %241 = udiv i32 %230, %201, !dbg !1178
    #dbg_value(i32 %241, !523, !DIExpression(), !1172)
    #dbg_value(i32 %241, !524, !DIExpression(), !1172)
    #dbg_value(i32 %240, !525, !DIExpression(), !1172)
    #dbg_value(i32 %201, !526, !DIExpression(), !1172)
  %242 = urem i32 %240, %201, !dbg !1179
    #dbg_value(i32 %242, !527, !DIExpression(), !1172)
  %243 = add i32 %242, %241
  br label %244

244:                                              ; preds = %163, %203
  %245 = phi i32 [ %243, %203 ], [ 0, %163 ], !dbg !1180
    #dbg_value(i32 poison, !527, !DIExpression(), !1172)
    #dbg_value(i32 %245, !528, !DIExpression(), !1172)
  %246 = add i32 %245, %191, !dbg !1181
    #dbg_value(i32 %246, !1009, !DIExpression(), !1160)
    #dbg_value(i32 1, !55, !DIExpression(), !1182)
    #dbg_value(i32 4, !56, !DIExpression(), !1182)
  %247 = load i32, ptr @ink_top, align 4
  %248 = icmp ugt i32 %247, -8
  br i1 %248, label %249, label %250, !dbg !1184

249:                                              ; preds = %244
  tail call void @llvm.trap(), !dbg !1185
  unreachable, !dbg !1187

250:                                              ; preds = %244
  %251 = icmp eq i32 %247, 0, !dbg !1188
  %252 = add nuw i32 %247, 7, !dbg !1189
  %253 = select i1 %251, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %252, !dbg !1190
  %254 = and i32 %253, -8, !dbg !1191
    #dbg_value(i32 %254, !57, !DIExpression(), !1182)
    #dbg_value(i32 4, !58, !DIExpression(), !1182)
  %255 = or disjoint i32 %254, 4, !dbg !1192
  store i32 %255, ptr @ink_top, align 4, !dbg !1193, !tbaa !27
  %256 = add i32 %254, 65539, !dbg !1194
  %257 = lshr i32 %256, 16, !dbg !1195
    #dbg_value(i32 %257, !59, !DIExpression(), !1182)
  %258 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1196
    #dbg_value(i32 %258, !60, !DIExpression(), !1182)
  %259 = icmp ugt i32 %257, %258, !dbg !1197
  br i1 %259, label %260, label %265, !dbg !1198

260:                                              ; preds = %250
  %261 = sub nuw nsw i32 %257, %258, !dbg !1199
  %262 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %261), !dbg !1200
  %263 = icmp eq i32 %262, -1, !dbg !1201
  br i1 %263, label %264, label %265, !dbg !1198

264:                                              ; preds = %260
  tail call void @llvm.trap(), !dbg !1202
  unreachable, !dbg !1204

265:                                              ; preds = %250, %260
  %266 = inttoptr i32 %254 to ptr, !dbg !1205
    #dbg_value(ptr %266, !1010, !DIExpression(), !1160)
  store i32 %246, ptr %266, align 8, !dbg !1206, !tbaa !329
  store ptr %266, ptr %3, align 4, !dbg !1207, !tbaa !960
  store i32 1, ptr %4, align 4, !dbg !1208, !tbaa !27
  br label %654

267:                                              ; preds = %5
  %268 = load ptr, ptr %1, align 4, !dbg !1209, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1061)
    #dbg_value(ptr %268, !115, !DIExpression(), !1061)
    #dbg_value(i32 4, !116, !DIExpression(), !1061)
    #dbg_value(ptr undef, !117, !DIExpression(), !1061)
    #dbg_value(ptr %268, !119, !DIExpression(), !1061)
    #dbg_value(i32 0, !122, !DIExpression(), !1210)
  %269 = load i8, ptr %268, align 1, !dbg !1211, !tbaa !131
    #dbg_value(i8 %269, !1011, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1212)
    #dbg_value(i32 1, !122, !DIExpression(), !1210)
  %270 = getelementptr inbounds nuw i8, ptr %268, i32 1, !dbg !1211
  %271 = load i8, ptr %270, align 1, !dbg !1211, !tbaa !131
    #dbg_value(i8 %271, !1011, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1212)
    #dbg_value(i32 2, !122, !DIExpression(), !1210)
  %272 = getelementptr inbounds nuw i8, ptr %268, i32 2, !dbg !1211
  %273 = load i8, ptr %272, align 1, !dbg !1211, !tbaa !131
    #dbg_value(i8 %273, !1011, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1212)
    #dbg_value(i32 3, !122, !DIExpression(), !1210)
  %274 = getelementptr inbounds nuw i8, ptr %268, i32 3, !dbg !1211
  %275 = load i8, ptr %274, align 1, !dbg !1211, !tbaa !131
    #dbg_value(i8 %275, !1011, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1212)
    #dbg_value(i32 4, !122, !DIExpression(), !1210)
  %276 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1213
  %277 = load ptr, ptr %276, align 4, !dbg !1213, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1063)
    #dbg_value(ptr %277, !115, !DIExpression(), !1063)
    #dbg_value(i32 4, !116, !DIExpression(), !1063)
    #dbg_value(ptr undef, !117, !DIExpression(), !1063)
    #dbg_value(ptr %277, !119, !DIExpression(), !1063)
    #dbg_value(i32 0, !122, !DIExpression(), !1214)
  %278 = load i8, ptr %277, align 1, !dbg !1215, !tbaa !131
    #dbg_value(i8 %278, !1013, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1212)
    #dbg_value(i32 1, !122, !DIExpression(), !1214)
  %279 = getelementptr inbounds nuw i8, ptr %277, i32 1, !dbg !1215
  %280 = load i8, ptr %279, align 1, !dbg !1215, !tbaa !131
    #dbg_value(i8 %280, !1013, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1212)
    #dbg_value(i32 2, !122, !DIExpression(), !1214)
  %281 = getelementptr inbounds nuw i8, ptr %277, i32 2, !dbg !1215
  %282 = load i8, ptr %281, align 1, !dbg !1215, !tbaa !131
    #dbg_value(i8 %282, !1013, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1212)
    #dbg_value(i32 3, !122, !DIExpression(), !1214)
  %283 = getelementptr inbounds nuw i8, ptr %277, i32 3, !dbg !1215
  %284 = load i8, ptr %283, align 1, !dbg !1215, !tbaa !131
    #dbg_value(i8 %284, !1013, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1212)
    #dbg_value(i32 4, !122, !DIExpression(), !1214)
  %285 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1216
  %286 = load ptr, ptr %285, align 4, !dbg !1216, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1065)
    #dbg_value(ptr %286, !115, !DIExpression(), !1065)
    #dbg_value(i32 4, !116, !DIExpression(), !1065)
    #dbg_value(ptr undef, !117, !DIExpression(), !1065)
    #dbg_value(ptr %286, !119, !DIExpression(), !1065)
    #dbg_value(i32 0, !122, !DIExpression(), !1217)
  %287 = load i8, ptr %286, align 1, !dbg !1218, !tbaa !131
    #dbg_value(i8 %287, !1014, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1212)
    #dbg_value(i32 1, !122, !DIExpression(), !1217)
  %288 = getelementptr inbounds nuw i8, ptr %286, i32 1, !dbg !1218
  %289 = load i8, ptr %288, align 1, !dbg !1218, !tbaa !131
    #dbg_value(i8 %289, !1014, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1212)
    #dbg_value(i32 2, !122, !DIExpression(), !1217)
  %290 = getelementptr inbounds nuw i8, ptr %286, i32 2, !dbg !1218
  %291 = load i8, ptr %290, align 1, !dbg !1218, !tbaa !131
    #dbg_value(i8 %291, !1014, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1212)
    #dbg_value(i32 3, !122, !DIExpression(), !1217)
  %292 = getelementptr inbounds nuw i8, ptr %286, i32 3, !dbg !1218
  %293 = load i8, ptr %292, align 1, !dbg !1218, !tbaa !131
    #dbg_value(i8 %293, !1014, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1212)
    #dbg_value(i32 4, !122, !DIExpression(), !1217)
  %294 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1219
  %295 = load ptr, ptr %294, align 4, !dbg !1219, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1067)
    #dbg_value(ptr %295, !115, !DIExpression(), !1067)
    #dbg_value(i32 4, !116, !DIExpression(), !1067)
    #dbg_value(ptr undef, !117, !DIExpression(), !1067)
    #dbg_value(ptr %295, !119, !DIExpression(), !1067)
    #dbg_value(i32 0, !122, !DIExpression(), !1220)
  %296 = load i8, ptr %295, align 1, !dbg !1221, !tbaa !131
    #dbg_value(i8 %296, !1015, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1212)
    #dbg_value(i32 1, !122, !DIExpression(), !1220)
  %297 = getelementptr inbounds nuw i8, ptr %295, i32 1, !dbg !1221
  %298 = load i8, ptr %297, align 1, !dbg !1221, !tbaa !131
    #dbg_value(i8 %298, !1015, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1212)
    #dbg_value(i32 2, !122, !DIExpression(), !1220)
  %299 = getelementptr inbounds nuw i8, ptr %295, i32 2, !dbg !1221
  %300 = load i8, ptr %299, align 1, !dbg !1221, !tbaa !131
    #dbg_value(i8 %300, !1015, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1212)
    #dbg_value(i32 3, !122, !DIExpression(), !1220)
  %301 = getelementptr inbounds nuw i8, ptr %295, i32 3, !dbg !1221
  %302 = load i8, ptr %301, align 1, !dbg !1221, !tbaa !131
    #dbg_value(i8 %302, !1015, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1212)
    #dbg_value(i32 4, !122, !DIExpression(), !1220)
  %303 = zext i8 %275 to i32, !dbg !1222
  %304 = shl nuw i32 %303, 24, !dbg !1222
  %305 = zext i8 %273 to i32, !dbg !1222
  %306 = shl nuw nsw i32 %305, 16, !dbg !1222
  %307 = or disjoint i32 %304, %306, !dbg !1222
  %308 = zext i8 %271 to i32, !dbg !1222
  %309 = shl nuw nsw i32 %308, 8, !dbg !1222
  %310 = or disjoint i32 %307, %309, !dbg !1222
  %311 = zext i8 %269 to i32, !dbg !1222
  %312 = or disjoint i32 %310, %311, !dbg !1222
  %313 = zext i8 %284 to i32, !dbg !1223
  %314 = shl nuw i32 %313, 24, !dbg !1223
  %315 = zext i8 %282 to i32, !dbg !1223
  %316 = shl nuw nsw i32 %315, 16, !dbg !1223
  %317 = or disjoint i32 %314, %316, !dbg !1223
  %318 = zext i8 %280 to i32, !dbg !1223
  %319 = shl nuw nsw i32 %318, 8, !dbg !1223
  %320 = or disjoint i32 %317, %319, !dbg !1223
  %321 = zext i8 %278 to i32, !dbg !1223
  %322 = or disjoint i32 %320, %321, !dbg !1223
  %323 = zext i8 %293 to i32, !dbg !1224
  %324 = shl nuw i32 %323, 24, !dbg !1224
  %325 = zext i8 %291 to i32, !dbg !1224
  %326 = shl nuw nsw i32 %325, 16, !dbg !1224
  %327 = or disjoint i32 %324, %326, !dbg !1224
  %328 = zext i8 %289 to i32, !dbg !1224
  %329 = shl nuw nsw i32 %328, 8, !dbg !1224
  %330 = or disjoint i32 %327, %329, !dbg !1224
  %331 = zext i8 %287 to i32, !dbg !1224
  %332 = or disjoint i32 %330, %331, !dbg !1224
  %333 = zext i8 %302 to i32, !dbg !1225
  %334 = shl nuw i32 %333, 24, !dbg !1225
  %335 = zext i8 %300 to i32, !dbg !1225
  %336 = shl nuw nsw i32 %335, 16, !dbg !1225
  %337 = or disjoint i32 %334, %336, !dbg !1225
  %338 = zext i8 %298 to i32, !dbg !1225
  %339 = shl nuw nsw i32 %338, 8, !dbg !1225
  %340 = or disjoint i32 %337, %339, !dbg !1225
  %341 = zext i8 %296 to i32, !dbg !1225
  %342 = or disjoint i32 %340, %341, !dbg !1225
    #dbg_value(i32 %312, !542, !DIExpression(), !1227)
    #dbg_value(i32 %322, !543, !DIExpression(), !1227)
    #dbg_value(i32 %332, !544, !DIExpression(), !1227)
    #dbg_value(i32 %342, !545, !DIExpression(), !1227)
    #dbg_value(i32 %312, !546, !DIExpression(), !1227)
    #dbg_value(i32 %322, !547, !DIExpression(), !1227)
    #dbg_value(i32 %332, !548, !DIExpression(), !1227)
    #dbg_value(i32 %342, !549, !DIExpression(), !1227)
    #dbg_value(i32 %312, !550, !DIExpression(), !1227)
  %343 = icmp ult i32 %312, %332, !dbg !1225
  %344 = add i32 %342, %322, !dbg !1228
  %345 = mul i32 %322, 3, !dbg !1228
  %346 = select i1 %343, i32 %344, i32 %345, !dbg !1228
    #dbg_value(i32 %346, !551, !DIExpression(), !1227)
    #dbg_value(i32 %346, !1016, !DIExpression(), !1212)
    #dbg_value(i32 1, !55, !DIExpression(), !1229)
    #dbg_value(i32 4, !56, !DIExpression(), !1229)
  %347 = load i32, ptr @ink_top, align 4
  %348 = icmp ugt i32 %347, -8
  br i1 %348, label %349, label %350, !dbg !1231

349:                                              ; preds = %267
  tail call void @llvm.trap(), !dbg !1232
  unreachable, !dbg !1234

350:                                              ; preds = %267
  %351 = icmp eq i32 %347, 0, !dbg !1235
  %352 = add nuw i32 %347, 7, !dbg !1236
  %353 = select i1 %351, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %352, !dbg !1237
  %354 = and i32 %353, -8, !dbg !1238
    #dbg_value(i32 %354, !57, !DIExpression(), !1229)
    #dbg_value(i32 4, !58, !DIExpression(), !1229)
  %355 = or disjoint i32 %354, 4, !dbg !1239
  store i32 %355, ptr @ink_top, align 4, !dbg !1240, !tbaa !27
  %356 = add i32 %354, 65539, !dbg !1241
  %357 = lshr i32 %356, 16, !dbg !1242
    #dbg_value(i32 %357, !59, !DIExpression(), !1229)
  %358 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1243
    #dbg_value(i32 %358, !60, !DIExpression(), !1229)
  %359 = icmp ugt i32 %357, %358, !dbg !1244
  br i1 %359, label %360, label %365, !dbg !1245

360:                                              ; preds = %350
  %361 = sub nuw nsw i32 %357, %358, !dbg !1246
  %362 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %361), !dbg !1247
  %363 = icmp eq i32 %362, -1, !dbg !1248
  br i1 %363, label %364, label %365, !dbg !1245

364:                                              ; preds = %360
  tail call void @llvm.trap(), !dbg !1249
  unreachable, !dbg !1251

365:                                              ; preds = %350, %360
  %366 = inttoptr i32 %354 to ptr, !dbg !1252
    #dbg_value(ptr %366, !1017, !DIExpression(), !1212)
  store i32 %346, ptr %366, align 8, !dbg !1253, !tbaa !329
  store ptr %366, ptr %3, align 4, !dbg !1254, !tbaa !960
  store i32 1, ptr %4, align 4, !dbg !1255, !tbaa !27
  br label %654

367:                                              ; preds = %5
  %368 = load ptr, ptr %1, align 4, !dbg !1256, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1069)
    #dbg_value(ptr %368, !115, !DIExpression(), !1069)
    #dbg_value(i32 4, !116, !DIExpression(), !1069)
    #dbg_value(ptr undef, !117, !DIExpression(), !1069)
    #dbg_value(ptr %368, !119, !DIExpression(), !1069)
    #dbg_value(i32 0, !122, !DIExpression(), !1257)
  %369 = load i8, ptr %368, align 1, !dbg !1258, !tbaa !131
    #dbg_value(i8 %369, !1018, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1259)
    #dbg_value(i32 1, !122, !DIExpression(), !1257)
  %370 = getelementptr inbounds nuw i8, ptr %368, i32 1, !dbg !1258
  %371 = load i8, ptr %370, align 1, !dbg !1258, !tbaa !131
    #dbg_value(i8 %371, !1018, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1259)
    #dbg_value(i32 2, !122, !DIExpression(), !1257)
  %372 = getelementptr inbounds nuw i8, ptr %368, i32 2, !dbg !1258
  %373 = load i8, ptr %372, align 1, !dbg !1258, !tbaa !131
    #dbg_value(i8 %373, !1018, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1259)
    #dbg_value(i32 3, !122, !DIExpression(), !1257)
  %374 = getelementptr inbounds nuw i8, ptr %368, i32 3, !dbg !1258
  %375 = load i8, ptr %374, align 1, !dbg !1258, !tbaa !131
    #dbg_value(i8 %375, !1018, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1259)
    #dbg_value(i32 4, !122, !DIExpression(), !1257)
  %376 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1260
  %377 = load ptr, ptr %376, align 4, !dbg !1260, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1071)
    #dbg_value(ptr %377, !115, !DIExpression(), !1071)
    #dbg_value(i32 4, !116, !DIExpression(), !1071)
    #dbg_value(ptr undef, !117, !DIExpression(), !1071)
    #dbg_value(ptr %377, !119, !DIExpression(), !1071)
    #dbg_value(i32 0, !122, !DIExpression(), !1261)
  %378 = load i8, ptr %377, align 1, !dbg !1262, !tbaa !131
    #dbg_value(i8 %378, !1020, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1259)
    #dbg_value(i32 1, !122, !DIExpression(), !1261)
  %379 = getelementptr inbounds nuw i8, ptr %377, i32 1, !dbg !1262
  %380 = load i8, ptr %379, align 1, !dbg !1262, !tbaa !131
    #dbg_value(i8 %380, !1020, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1259)
    #dbg_value(i32 2, !122, !DIExpression(), !1261)
  %381 = getelementptr inbounds nuw i8, ptr %377, i32 2, !dbg !1262
  %382 = load i8, ptr %381, align 1, !dbg !1262, !tbaa !131
    #dbg_value(i8 %382, !1020, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1259)
    #dbg_value(i32 3, !122, !DIExpression(), !1261)
  %383 = getelementptr inbounds nuw i8, ptr %377, i32 3, !dbg !1262
  %384 = load i8, ptr %383, align 1, !dbg !1262, !tbaa !131
    #dbg_value(i8 %384, !1020, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1259)
    #dbg_value(i32 4, !122, !DIExpression(), !1261)
  %385 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1263
  %386 = load ptr, ptr %385, align 4, !dbg !1263, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1073)
    #dbg_value(ptr %386, !115, !DIExpression(), !1073)
    #dbg_value(i32 4, !116, !DIExpression(), !1073)
    #dbg_value(ptr undef, !117, !DIExpression(), !1073)
    #dbg_value(ptr %386, !119, !DIExpression(), !1073)
    #dbg_value(i32 0, !122, !DIExpression(), !1264)
  %387 = load i8, ptr %386, align 1, !dbg !1265, !tbaa !131
    #dbg_value(i8 %387, !1021, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1259)
    #dbg_value(i32 1, !122, !DIExpression(), !1264)
  %388 = getelementptr inbounds nuw i8, ptr %386, i32 1, !dbg !1265
  %389 = load i8, ptr %388, align 1, !dbg !1265, !tbaa !131
    #dbg_value(i8 %389, !1021, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1259)
    #dbg_value(i32 2, !122, !DIExpression(), !1264)
  %390 = getelementptr inbounds nuw i8, ptr %386, i32 2, !dbg !1265
  %391 = load i8, ptr %390, align 1, !dbg !1265, !tbaa !131
    #dbg_value(i8 %391, !1021, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1259)
    #dbg_value(i32 3, !122, !DIExpression(), !1264)
  %392 = getelementptr inbounds nuw i8, ptr %386, i32 3, !dbg !1265
  %393 = load i8, ptr %392, align 1, !dbg !1265, !tbaa !131
    #dbg_value(i8 %393, !1021, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1259)
    #dbg_value(i32 4, !122, !DIExpression(), !1264)
  %394 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1266
  %395 = load ptr, ptr %394, align 4, !dbg !1266, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1075)
    #dbg_value(ptr %395, !115, !DIExpression(), !1075)
    #dbg_value(i32 4, !116, !DIExpression(), !1075)
    #dbg_value(ptr undef, !117, !DIExpression(), !1075)
    #dbg_value(ptr %395, !119, !DIExpression(), !1075)
    #dbg_value(i32 0, !122, !DIExpression(), !1267)
  %396 = load i8, ptr %395, align 1, !dbg !1268, !tbaa !131
    #dbg_value(i8 %396, !1022, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1259)
    #dbg_value(i32 1, !122, !DIExpression(), !1267)
  %397 = getelementptr inbounds nuw i8, ptr %395, i32 1, !dbg !1268
  %398 = load i8, ptr %397, align 1, !dbg !1268, !tbaa !131
    #dbg_value(i8 %398, !1022, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1259)
    #dbg_value(i32 2, !122, !DIExpression(), !1267)
  %399 = getelementptr inbounds nuw i8, ptr %395, i32 2, !dbg !1268
  %400 = load i8, ptr %399, align 1, !dbg !1268, !tbaa !131
    #dbg_value(i8 %400, !1022, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1259)
    #dbg_value(i32 3, !122, !DIExpression(), !1267)
  %401 = getelementptr inbounds nuw i8, ptr %395, i32 3, !dbg !1268
  %402 = load i8, ptr %401, align 1, !dbg !1268, !tbaa !131
    #dbg_value(i8 %402, !1022, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1259)
    #dbg_value(i32 4, !122, !DIExpression(), !1267)
  %403 = zext i8 %375 to i32, !dbg !1269
  %404 = shl nuw i32 %403, 24, !dbg !1269
  %405 = zext i8 %373 to i32, !dbg !1269
  %406 = shl nuw nsw i32 %405, 16, !dbg !1269
  %407 = or disjoint i32 %404, %406, !dbg !1269
  %408 = zext i8 %371 to i32, !dbg !1269
  %409 = shl nuw nsw i32 %408, 8, !dbg !1269
  %410 = or disjoint i32 %407, %409, !dbg !1269
  %411 = zext i8 %369 to i32, !dbg !1269
  %412 = or disjoint i32 %410, %411, !dbg !1269
  %413 = zext i8 %384 to i32, !dbg !1270
  %414 = shl nuw i32 %413, 24, !dbg !1270
  %415 = zext i8 %382 to i32, !dbg !1270
  %416 = shl nuw nsw i32 %415, 16, !dbg !1270
  %417 = or disjoint i32 %414, %416, !dbg !1270
  %418 = zext i8 %380 to i32, !dbg !1270
  %419 = shl nuw nsw i32 %418, 8, !dbg !1270
  %420 = or disjoint i32 %417, %419, !dbg !1270
  %421 = zext i8 %378 to i32, !dbg !1270
  %422 = or disjoint i32 %420, %421, !dbg !1270
  %423 = zext i8 %393 to i32, !dbg !1271
  %424 = shl nuw i32 %423, 24, !dbg !1271
  %425 = zext i8 %391 to i32, !dbg !1271
  %426 = shl nuw nsw i32 %425, 16, !dbg !1271
  %427 = or disjoint i32 %424, %426, !dbg !1271
  %428 = zext i8 %389 to i32, !dbg !1271
  %429 = shl nuw nsw i32 %428, 8, !dbg !1271
  %430 = or disjoint i32 %427, %429, !dbg !1271
  %431 = zext i8 %387 to i32, !dbg !1271
  %432 = or disjoint i32 %430, %431, !dbg !1271
  %433 = zext i8 %402 to i32, !dbg !1272
  %434 = shl nuw i32 %433, 24, !dbg !1272
  %435 = zext i8 %400 to i32, !dbg !1272
  %436 = shl nuw nsw i32 %435, 16, !dbg !1272
  %437 = or disjoint i32 %434, %436, !dbg !1272
  %438 = zext i8 %398 to i32, !dbg !1272
  %439 = shl nuw nsw i32 %438, 8, !dbg !1272
  %440 = or disjoint i32 %437, %439, !dbg !1272
  %441 = zext i8 %396 to i32, !dbg !1272
  %442 = or disjoint i32 %440, %441, !dbg !1272
    #dbg_value(i32 %412, !563, !DIExpression(), !1274)
    #dbg_value(i32 %422, !564, !DIExpression(), !1274)
    #dbg_value(i32 %432, !565, !DIExpression(), !1274)
    #dbg_value(i32 %442, !566, !DIExpression(), !1274)
    #dbg_value(i32 %412, !567, !DIExpression(), !1274)
  %443 = icmp ult i32 %412, %432, !dbg !1272
  %444 = add i32 %442, %422, !dbg !1275
  %445 = mul i32 %422, 3, !dbg !1275
  %446 = select i1 %443, i32 %444, i32 %445, !dbg !1275
    #dbg_value(i32 %446, !568, !DIExpression(), !1274)
    #dbg_value(i32 %446, !1023, !DIExpression(), !1259)
    #dbg_value(i32 1, !55, !DIExpression(), !1276)
    #dbg_value(i32 4, !56, !DIExpression(), !1276)
  %447 = load i32, ptr @ink_top, align 4
  %448 = icmp ugt i32 %447, -8
  br i1 %448, label %449, label %450, !dbg !1278

449:                                              ; preds = %367
  tail call void @llvm.trap(), !dbg !1279
  unreachable, !dbg !1281

450:                                              ; preds = %367
  %451 = icmp eq i32 %447, 0, !dbg !1282
  %452 = add nuw i32 %447, 7, !dbg !1283
  %453 = select i1 %451, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %452, !dbg !1284
  %454 = and i32 %453, -8, !dbg !1285
    #dbg_value(i32 %454, !57, !DIExpression(), !1276)
    #dbg_value(i32 4, !58, !DIExpression(), !1276)
  %455 = or disjoint i32 %454, 4, !dbg !1286
  store i32 %455, ptr @ink_top, align 4, !dbg !1287, !tbaa !27
  %456 = add i32 %454, 65539, !dbg !1288
  %457 = lshr i32 %456, 16, !dbg !1289
    #dbg_value(i32 %457, !59, !DIExpression(), !1276)
  %458 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1290
    #dbg_value(i32 %458, !60, !DIExpression(), !1276)
  %459 = icmp ugt i32 %457, %458, !dbg !1291
  br i1 %459, label %460, label %465, !dbg !1292

460:                                              ; preds = %450
  %461 = sub nuw nsw i32 %457, %458, !dbg !1293
  %462 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %461), !dbg !1294
  %463 = icmp eq i32 %462, -1, !dbg !1295
  br i1 %463, label %464, label %465, !dbg !1292

464:                                              ; preds = %460
  tail call void @llvm.trap(), !dbg !1296
  unreachable, !dbg !1298

465:                                              ; preds = %450, %460
  %466 = inttoptr i32 %454 to ptr, !dbg !1299
    #dbg_value(ptr %466, !1024, !DIExpression(), !1259)
  store i32 %446, ptr %466, align 8, !dbg !1300, !tbaa !329
  store ptr %466, ptr %3, align 4, !dbg !1301, !tbaa !960
  store i32 1, ptr %4, align 4, !dbg !1302, !tbaa !27
  br label %654

467:                                              ; preds = %5
  %468 = load ptr, ptr %1, align 4, !dbg !1303, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1077)
    #dbg_value(ptr %468, !115, !DIExpression(), !1077)
    #dbg_value(i32 4, !116, !DIExpression(), !1077)
    #dbg_value(ptr undef, !117, !DIExpression(), !1077)
    #dbg_value(ptr %468, !119, !DIExpression(), !1077)
    #dbg_value(i32 0, !122, !DIExpression(), !1304)
  %469 = load i8, ptr %468, align 1, !dbg !1305, !tbaa !131
    #dbg_value(i8 %469, !1025, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1306)
    #dbg_value(i32 1, !122, !DIExpression(), !1304)
  %470 = getelementptr inbounds nuw i8, ptr %468, i32 1, !dbg !1305
  %471 = load i8, ptr %470, align 1, !dbg !1305, !tbaa !131
    #dbg_value(i8 %471, !1025, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1306)
    #dbg_value(i32 2, !122, !DIExpression(), !1304)
  %472 = getelementptr inbounds nuw i8, ptr %468, i32 2, !dbg !1305
  %473 = load i8, ptr %472, align 1, !dbg !1305, !tbaa !131
    #dbg_value(i8 %473, !1025, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1306)
    #dbg_value(i32 3, !122, !DIExpression(), !1304)
  %474 = getelementptr inbounds nuw i8, ptr %468, i32 3, !dbg !1305
  %475 = load i8, ptr %474, align 1, !dbg !1305, !tbaa !131
    #dbg_value(i8 %475, !1025, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1306)
    #dbg_value(i32 4, !122, !DIExpression(), !1304)
  %476 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1307
  %477 = load ptr, ptr %476, align 4, !dbg !1307, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1079)
    #dbg_value(ptr %477, !115, !DIExpression(), !1079)
    #dbg_value(i32 4, !116, !DIExpression(), !1079)
    #dbg_value(ptr undef, !117, !DIExpression(), !1079)
    #dbg_value(ptr %477, !119, !DIExpression(), !1079)
    #dbg_value(i32 0, !122, !DIExpression(), !1308)
  %478 = load i8, ptr %477, align 1, !dbg !1309, !tbaa !131
    #dbg_value(i8 %478, !1027, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1306)
    #dbg_value(i32 1, !122, !DIExpression(), !1308)
  %479 = getelementptr inbounds nuw i8, ptr %477, i32 1, !dbg !1309
  %480 = load i8, ptr %479, align 1, !dbg !1309, !tbaa !131
    #dbg_value(i8 %480, !1027, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1306)
    #dbg_value(i32 2, !122, !DIExpression(), !1308)
  %481 = getelementptr inbounds nuw i8, ptr %477, i32 2, !dbg !1309
  %482 = load i8, ptr %481, align 1, !dbg !1309, !tbaa !131
    #dbg_value(i8 %482, !1027, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1306)
    #dbg_value(i32 3, !122, !DIExpression(), !1308)
  %483 = getelementptr inbounds nuw i8, ptr %477, i32 3, !dbg !1309
  %484 = load i8, ptr %483, align 1, !dbg !1309, !tbaa !131
    #dbg_value(i8 %484, !1027, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1306)
    #dbg_value(i32 4, !122, !DIExpression(), !1308)
    #dbg_value(i32 poison, !122, !DIExpression(), !1310)
  %485 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1312
  %486 = load ptr, ptr %485, align 4, !dbg !1312, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1081)
    #dbg_value(ptr %486, !115, !DIExpression(), !1081)
    #dbg_value(i32 4, !116, !DIExpression(), !1081)
    #dbg_value(ptr undef, !117, !DIExpression(), !1081)
    #dbg_value(ptr %486, !119, !DIExpression(), !1081)
    #dbg_value(i32 0, !122, !DIExpression(), !1313)
  %487 = load i8, ptr %486, align 1, !dbg !1314, !tbaa !131
    #dbg_value(i8 %487, !1029, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1306)
    #dbg_value(i32 1, !122, !DIExpression(), !1313)
  %488 = getelementptr inbounds nuw i8, ptr %486, i32 1, !dbg !1314
  %489 = load i8, ptr %488, align 1, !dbg !1314, !tbaa !131
    #dbg_value(i8 %489, !1029, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1306)
    #dbg_value(i32 2, !122, !DIExpression(), !1313)
  %490 = getelementptr inbounds nuw i8, ptr %486, i32 2, !dbg !1314
  %491 = load i8, ptr %490, align 1, !dbg !1314, !tbaa !131
    #dbg_value(i8 %491, !1029, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1306)
    #dbg_value(i32 3, !122, !DIExpression(), !1313)
  %492 = getelementptr inbounds nuw i8, ptr %486, i32 3, !dbg !1314
  %493 = load i8, ptr %492, align 1, !dbg !1314, !tbaa !131
    #dbg_value(i8 %493, !1029, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1306)
    #dbg_value(i32 4, !122, !DIExpression(), !1313)
  %494 = zext i8 %475 to i32, !dbg !1315
  %495 = shl nuw i32 %494, 24, !dbg !1315
  %496 = zext i8 %473 to i32, !dbg !1315
  %497 = shl nuw nsw i32 %496, 16, !dbg !1315
  %498 = or disjoint i32 %495, %497, !dbg !1315
  %499 = zext i8 %471 to i32, !dbg !1315
  %500 = shl nuw nsw i32 %499, 8, !dbg !1315
  %501 = or disjoint i32 %498, %500, !dbg !1315
  %502 = zext i8 %469 to i32, !dbg !1315
  %503 = or disjoint i32 %501, %502, !dbg !1315
  %504 = zext i8 %484 to i32, !dbg !1316
  %505 = shl nuw i32 %504, 24, !dbg !1316
  %506 = zext i8 %482 to i32, !dbg !1316
  %507 = shl nuw nsw i32 %506, 16, !dbg !1316
  %508 = or disjoint i32 %505, %507, !dbg !1316
  %509 = zext i8 %480 to i32, !dbg !1316
  %510 = shl nuw nsw i32 %509, 8, !dbg !1316
  %511 = or disjoint i32 %508, %510, !dbg !1316
  %512 = zext i8 %478 to i32, !dbg !1316
  %513 = or disjoint i32 %511, %512, !dbg !1316
  %514 = zext i8 %493 to i32, !dbg !1317
  %515 = shl nuw i32 %514, 24, !dbg !1317
  %516 = zext i8 %491 to i32, !dbg !1317
  %517 = shl nuw nsw i32 %516, 16, !dbg !1317
  %518 = or disjoint i32 %515, %517, !dbg !1317
  %519 = zext i8 %489 to i32, !dbg !1317
  %520 = shl nuw nsw i32 %519, 8, !dbg !1317
  %521 = or disjoint i32 %518, %520, !dbg !1317
  %522 = zext i8 %487 to i32, !dbg !1317
  %523 = or disjoint i32 %521, %522, !dbg !1317
    #dbg_value(i32 %503, !580, !DIExpression(), !1319)
    #dbg_value(i32 %513, !581, !DIExpression(), !1319)
    #dbg_value(i32 poison, !582, !DIExpression(), !1319)
    #dbg_value(i32 %523, !583, !DIExpression(), !1319)
    #dbg_value(i32 %503, !584, !DIExpression(), !1319)
    #dbg_value(i32 %513, !585, !DIExpression(), !1319)
    #dbg_value(i32 poison, !586, !DIExpression(), !1319)
    #dbg_value(i32 %523, !587, !DIExpression(), !1319)
    #dbg_value(i32 %503, !588, !DIExpression(), !1319)
  %524 = icmp ult i32 %503, %513, !dbg !1317
  %525 = icmp eq i32 %523, 0, !dbg !1320
  br i1 %524, label %526, label %532, !dbg !1321

526:                                              ; preds = %467
    #dbg_value(i32 %503, !590, !DIExpression(), !1322)
    #dbg_value(i32 %523, !593, !DIExpression(), !1322)
  br i1 %525, label %529, label %527, !dbg !1323

527:                                              ; preds = %526
  %528 = udiv i32 %503, %523, !dbg !1324
    #dbg_value(i32 %528, !594, !DIExpression(), !1322)
  br label %529

529:                                              ; preds = %527, %526
  %530 = phi i32 [ %528, %527 ], [ 0, %526 ], !dbg !1325
    #dbg_value(i32 %530, !594, !DIExpression(), !1322)
    #dbg_value(i32 %530, !595, !DIExpression(), !1322)
  %531 = add i32 %530, %513, !dbg !1326
    #dbg_value(i32 %531, !589, !DIExpression(), !1319)
  br label %538, !dbg !1327

532:                                              ; preds = %467
    #dbg_value(i32 %513, !596, !DIExpression(), !1328)
    #dbg_value(i32 %523, !598, !DIExpression(), !1328)
  br i1 %525, label %535, label %533, !dbg !1329

533:                                              ; preds = %532
  %534 = urem i32 %513, %523, !dbg !1330
    #dbg_value(i32 %534, !599, !DIExpression(), !1328)
  br label %535

535:                                              ; preds = %533, %532
  %536 = phi i32 [ %534, %533 ], [ 0, %532 ], !dbg !1331
    #dbg_value(i32 %536, !599, !DIExpression(), !1328)
    #dbg_value(i32 %536, !600, !DIExpression(), !1328)
  %537 = add i32 %536, %503, !dbg !1332
    #dbg_value(i32 %537, !589, !DIExpression(), !1319)
  br label %538

538:                                              ; preds = %529, %535
  %539 = phi i32 [ %531, %529 ], [ %537, %535 ], !dbg !1320
    #dbg_value(i32 %539, !589, !DIExpression(), !1319)
    #dbg_value(i32 %539, !1030, !DIExpression(), !1306)
    #dbg_value(i32 1, !55, !DIExpression(), !1333)
    #dbg_value(i32 4, !56, !DIExpression(), !1333)
  %540 = load i32, ptr @ink_top, align 4
  %541 = icmp ugt i32 %540, -8
  br i1 %541, label %542, label %543, !dbg !1335

542:                                              ; preds = %538
  tail call void @llvm.trap(), !dbg !1336
  unreachable, !dbg !1338

543:                                              ; preds = %538
  %544 = icmp eq i32 %540, 0, !dbg !1339
  %545 = add nuw i32 %540, 7, !dbg !1340
  %546 = select i1 %544, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %545, !dbg !1341
  %547 = and i32 %546, -8, !dbg !1342
    #dbg_value(i32 %547, !57, !DIExpression(), !1333)
    #dbg_value(i32 4, !58, !DIExpression(), !1333)
  %548 = or disjoint i32 %547, 4, !dbg !1343
  store i32 %548, ptr @ink_top, align 4, !dbg !1344, !tbaa !27
  %549 = add i32 %547, 65539, !dbg !1345
  %550 = lshr i32 %549, 16, !dbg !1346
    #dbg_value(i32 %550, !59, !DIExpression(), !1333)
  %551 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1347
    #dbg_value(i32 %551, !60, !DIExpression(), !1333)
  %552 = icmp ugt i32 %550, %551, !dbg !1348
  br i1 %552, label %553, label %558, !dbg !1349

553:                                              ; preds = %543
  %554 = sub nuw nsw i32 %550, %551, !dbg !1350
  %555 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %554), !dbg !1351
  %556 = icmp eq i32 %555, -1, !dbg !1352
  br i1 %556, label %557, label %558, !dbg !1349

557:                                              ; preds = %553
  tail call void @llvm.trap(), !dbg !1353
  unreachable, !dbg !1355

558:                                              ; preds = %543, %553
  %559 = inttoptr i32 %547 to ptr, !dbg !1356
    #dbg_value(ptr %559, !1031, !DIExpression(), !1306)
  store i32 %539, ptr %559, align 8, !dbg !1357, !tbaa !329
  store ptr %559, ptr %3, align 4, !dbg !1358, !tbaa !960
  store i32 1, ptr %4, align 4, !dbg !1359, !tbaa !27
  br label %654

560:                                              ; preds = %5
  %561 = load ptr, ptr %1, align 4, !dbg !1360, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1083)
    #dbg_value(ptr %561, !115, !DIExpression(), !1083)
    #dbg_value(i32 4, !116, !DIExpression(), !1083)
    #dbg_value(ptr undef, !117, !DIExpression(), !1083)
    #dbg_value(ptr %561, !119, !DIExpression(), !1083)
    #dbg_value(i32 0, !122, !DIExpression(), !1361)
  %562 = load i8, ptr %561, align 1, !dbg !1362, !tbaa !131
    #dbg_value(i8 %562, !1032, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1363)
    #dbg_value(i32 1, !122, !DIExpression(), !1361)
  %563 = getelementptr inbounds nuw i8, ptr %561, i32 1, !dbg !1362
  %564 = load i8, ptr %563, align 1, !dbg !1362, !tbaa !131
    #dbg_value(i8 %564, !1032, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1363)
    #dbg_value(i32 2, !122, !DIExpression(), !1361)
  %565 = getelementptr inbounds nuw i8, ptr %561, i32 2, !dbg !1362
  %566 = load i8, ptr %565, align 1, !dbg !1362, !tbaa !131
    #dbg_value(i8 %566, !1032, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1363)
    #dbg_value(i32 3, !122, !DIExpression(), !1361)
  %567 = getelementptr inbounds nuw i8, ptr %561, i32 3, !dbg !1362
  %568 = load i8, ptr %567, align 1, !dbg !1362, !tbaa !131
    #dbg_value(i8 %568, !1032, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1363)
    #dbg_value(i32 4, !122, !DIExpression(), !1361)
  %569 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1364
  %570 = load ptr, ptr %569, align 4, !dbg !1364, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1085)
    #dbg_value(ptr %570, !115, !DIExpression(), !1085)
    #dbg_value(i32 4, !116, !DIExpression(), !1085)
    #dbg_value(ptr undef, !117, !DIExpression(), !1085)
    #dbg_value(ptr %570, !119, !DIExpression(), !1085)
    #dbg_value(i32 0, !122, !DIExpression(), !1365)
  %571 = load i8, ptr %570, align 1, !dbg !1366, !tbaa !131
    #dbg_value(i8 %571, !1034, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1363)
    #dbg_value(i32 1, !122, !DIExpression(), !1365)
  %572 = getelementptr inbounds nuw i8, ptr %570, i32 1, !dbg !1366
  %573 = load i8, ptr %572, align 1, !dbg !1366, !tbaa !131
    #dbg_value(i8 %573, !1034, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1363)
    #dbg_value(i32 2, !122, !DIExpression(), !1365)
  %574 = getelementptr inbounds nuw i8, ptr %570, i32 2, !dbg !1366
  %575 = load i8, ptr %574, align 1, !dbg !1366, !tbaa !131
    #dbg_value(i8 %575, !1034, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1363)
    #dbg_value(i32 3, !122, !DIExpression(), !1365)
  %576 = getelementptr inbounds nuw i8, ptr %570, i32 3, !dbg !1366
  %577 = load i8, ptr %576, align 1, !dbg !1366, !tbaa !131
    #dbg_value(i8 %577, !1034, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1363)
    #dbg_value(i32 4, !122, !DIExpression(), !1365)
    #dbg_value(i32 poison, !122, !DIExpression(), !1367)
  %578 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1369
  %579 = load ptr, ptr %578, align 4, !dbg !1369, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1087)
    #dbg_value(ptr %579, !115, !DIExpression(), !1087)
    #dbg_value(i32 4, !116, !DIExpression(), !1087)
    #dbg_value(ptr undef, !117, !DIExpression(), !1087)
    #dbg_value(ptr %579, !119, !DIExpression(), !1087)
    #dbg_value(i32 0, !122, !DIExpression(), !1370)
  %580 = load i8, ptr %579, align 1, !dbg !1371, !tbaa !131
    #dbg_value(i8 %580, !1036, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1363)
    #dbg_value(i32 1, !122, !DIExpression(), !1370)
  %581 = getelementptr inbounds nuw i8, ptr %579, i32 1, !dbg !1371
  %582 = load i8, ptr %581, align 1, !dbg !1371, !tbaa !131
    #dbg_value(i8 %582, !1036, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1363)
    #dbg_value(i32 2, !122, !DIExpression(), !1370)
  %583 = getelementptr inbounds nuw i8, ptr %579, i32 2, !dbg !1371
  %584 = load i8, ptr %583, align 1, !dbg !1371, !tbaa !131
    #dbg_value(i8 %584, !1036, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1363)
    #dbg_value(i32 3, !122, !DIExpression(), !1370)
  %585 = getelementptr inbounds nuw i8, ptr %579, i32 3, !dbg !1371
  %586 = load i8, ptr %585, align 1, !dbg !1371, !tbaa !131
    #dbg_value(i8 %586, !1036, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1363)
    #dbg_value(i32 4, !122, !DIExpression(), !1370)
  %587 = zext i8 %568 to i32, !dbg !1372
  %588 = shl nuw i32 %587, 24, !dbg !1372
  %589 = zext i8 %566 to i32, !dbg !1372
  %590 = shl nuw nsw i32 %589, 16, !dbg !1372
  %591 = or disjoint i32 %588, %590, !dbg !1372
  %592 = zext i8 %564 to i32, !dbg !1372
  %593 = shl nuw nsw i32 %592, 8, !dbg !1372
  %594 = or disjoint i32 %591, %593, !dbg !1372
  %595 = zext i8 %562 to i32, !dbg !1372
  %596 = or disjoint i32 %594, %595, !dbg !1372
  %597 = zext i8 %577 to i32, !dbg !1373
  %598 = shl nuw i32 %597, 24, !dbg !1373
  %599 = zext i8 %575 to i32, !dbg !1373
  %600 = shl nuw nsw i32 %599, 16, !dbg !1373
  %601 = or disjoint i32 %598, %600, !dbg !1373
  %602 = zext i8 %573 to i32, !dbg !1373
  %603 = shl nuw nsw i32 %602, 8, !dbg !1373
  %604 = or disjoint i32 %601, %603, !dbg !1373
  %605 = zext i8 %571 to i32, !dbg !1373
  %606 = or disjoint i32 %604, %605, !dbg !1373
  %607 = zext i8 %586 to i32, !dbg !1374
  %608 = shl nuw i32 %607, 24, !dbg !1374
  %609 = zext i8 %584 to i32, !dbg !1374
  %610 = shl nuw nsw i32 %609, 16, !dbg !1374
  %611 = or disjoint i32 %608, %610, !dbg !1374
  %612 = zext i8 %582 to i32, !dbg !1374
  %613 = shl nuw nsw i32 %612, 8, !dbg !1374
  %614 = or disjoint i32 %611, %613, !dbg !1374
  %615 = zext i8 %580 to i32, !dbg !1374
  %616 = or disjoint i32 %614, %615, !dbg !1374
    #dbg_value(i32 %596, !623, !DIExpression(), !1376)
    #dbg_value(i32 %606, !624, !DIExpression(), !1376)
    #dbg_value(i32 poison, !625, !DIExpression(), !1376)
    #dbg_value(i32 %616, !626, !DIExpression(), !1376)
    #dbg_value(i32 %596, !627, !DIExpression(), !1376)
  %617 = icmp ult i32 %596, %606, !dbg !1374
  %618 = icmp eq i32 %616, 0, !dbg !1377
  br i1 %617, label %619, label %625, !dbg !1378

619:                                              ; preds = %560
    #dbg_value(i32 %596, !629, !DIExpression(), !1379)
    #dbg_value(i32 %616, !632, !DIExpression(), !1379)
  br i1 %618, label %622, label %620, !dbg !1380

620:                                              ; preds = %619
  %621 = udiv i32 %596, %616, !dbg !1381
    #dbg_value(i32 %621, !633, !DIExpression(), !1379)
  br label %622

622:                                              ; preds = %620, %619
  %623 = phi i32 [ %621, %620 ], [ 0, %619 ], !dbg !1382
    #dbg_value(i32 %623, !633, !DIExpression(), !1379)
    #dbg_value(i32 %623, !634, !DIExpression(), !1379)
  %624 = add i32 %623, %606, !dbg !1383
    #dbg_value(i32 %624, !628, !DIExpression(), !1376)
  br label %631, !dbg !1384

625:                                              ; preds = %560
    #dbg_value(i32 %606, !635, !DIExpression(), !1385)
    #dbg_value(i32 %616, !637, !DIExpression(), !1385)
  br i1 %618, label %628, label %626, !dbg !1386

626:                                              ; preds = %625
  %627 = urem i32 %606, %616, !dbg !1387
    #dbg_value(i32 %627, !638, !DIExpression(), !1385)
  br label %628

628:                                              ; preds = %626, %625
  %629 = phi i32 [ %627, %626 ], [ 0, %625 ], !dbg !1388
    #dbg_value(i32 %629, !638, !DIExpression(), !1385)
    #dbg_value(i32 %629, !639, !DIExpression(), !1385)
  %630 = add i32 %629, %596, !dbg !1389
    #dbg_value(i32 %630, !628, !DIExpression(), !1376)
  br label %631

631:                                              ; preds = %622, %628
  %632 = phi i32 [ %624, %622 ], [ %630, %628 ], !dbg !1377
    #dbg_value(i32 %632, !628, !DIExpression(), !1376)
    #dbg_value(i32 %632, !1037, !DIExpression(), !1363)
    #dbg_value(i32 1, !55, !DIExpression(), !1390)
    #dbg_value(i32 4, !56, !DIExpression(), !1390)
  %633 = load i32, ptr @ink_top, align 4
  %634 = icmp ugt i32 %633, -8
  br i1 %634, label %635, label %636, !dbg !1392

635:                                              ; preds = %631
  tail call void @llvm.trap(), !dbg !1393
  unreachable, !dbg !1395

636:                                              ; preds = %631
  %637 = icmp eq i32 %633, 0, !dbg !1396
  %638 = add nuw i32 %633, 7, !dbg !1397
  %639 = select i1 %637, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %638, !dbg !1398
  %640 = and i32 %639, -8, !dbg !1399
    #dbg_value(i32 %640, !57, !DIExpression(), !1390)
    #dbg_value(i32 4, !58, !DIExpression(), !1390)
  %641 = or disjoint i32 %640, 4, !dbg !1400
  store i32 %641, ptr @ink_top, align 4, !dbg !1401, !tbaa !27
  %642 = add i32 %640, 65539, !dbg !1402
  %643 = lshr i32 %642, 16, !dbg !1403
    #dbg_value(i32 %643, !59, !DIExpression(), !1390)
  %644 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1404
    #dbg_value(i32 %644, !60, !DIExpression(), !1390)
  %645 = icmp ugt i32 %643, %644, !dbg !1405
  br i1 %645, label %646, label %651, !dbg !1406

646:                                              ; preds = %636
  %647 = sub nuw nsw i32 %643, %644, !dbg !1407
  %648 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %647), !dbg !1408
  %649 = icmp eq i32 %648, -1, !dbg !1409
  br i1 %649, label %650, label %651, !dbg !1406

650:                                              ; preds = %646
  tail call void @llvm.trap(), !dbg !1410
  unreachable, !dbg !1412

651:                                              ; preds = %636, %646
  %652 = inttoptr i32 %640 to ptr, !dbg !1413
    #dbg_value(ptr %652, !1038, !DIExpression(), !1363)
  store i32 %632, ptr %652, align 8, !dbg !1414, !tbaa !329
  store ptr %652, ptr %3, align 4, !dbg !1415, !tbaa !960
  store i32 1, ptr %4, align 4, !dbg !1416, !tbaa !27
  br label %654

653:                                              ; preds = %5
  tail call void @llvm.trap(), !dbg !1417
  unreachable, !dbg !1419

654:                                              ; preds = %651, %558, %465, %365, %265, %161, %9
  ret void, !dbg !1420
}

; Function Attrs: nounwind memory(read, inaccessiblemem: write) uwtable
define hidden i32 @ink_compute_scalar32(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readnone %2) local_unnamed_addr #9 !dbg !1421 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1465)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1465)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1465)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1465)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1465)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1465)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1465)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1465)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1467)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1467)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1467)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1467)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1467)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1467)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1467)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1467)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1469)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1469)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1469)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1469)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1469)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1469)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1469)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1469)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1471)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1471)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1471)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1471)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1471)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1471)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1471)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1471)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1473)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1473)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1473)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1473)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1473)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1473)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1473)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1473)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1475)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1475)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1475)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1475)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1475)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1475)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1475)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1475)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1477)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1477)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1477)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1477)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1477)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1477)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1477)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1477)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1479)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1479)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1479)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1479)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1479)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1479)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1479)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1479)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1481)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1481)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1481)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1481)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1481)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1481)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1481)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1481)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1483)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1483)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1483)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1483)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1483)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1483)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1483)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1483)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1485)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1485)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1485)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1485)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1485)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1485)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1485)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1485)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1487)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1487)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1487)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1487)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1487)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1487)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1487)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1487)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1489)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1489)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1489)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1489)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1489)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1489)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1489)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1489)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1491)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1491)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1491)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1491)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1491)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1491)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1491)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1491)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1493)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1493)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1493)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1493)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1493)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1493)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1493)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1493)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1495)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1495)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1495)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1495)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1495)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1495)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1495)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1495)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1497)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1497)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1497)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1497)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1497)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1497)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1497)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1497)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1499)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1499)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1499)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1499)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1499)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1499)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1499)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1499)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1501)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1501)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1501)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1501)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1501)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1501)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1501)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1501)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1503)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1503)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1503)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1503)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1503)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1503)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1503)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1503)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1505)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1505)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1505)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1505)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1505)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1505)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1505)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1505)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1507)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1507)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1507)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1507)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1507)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1507)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1507)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1507)
    #dbg_value(i32 %0, !1425, !DIExpression(), !1509)
    #dbg_value(ptr %1, !1426, !DIExpression(), !1509)
    #dbg_value(ptr %2, !1427, !DIExpression(), !1509)
  switch i32 %0, label %474 [
    i32 1, label %4
    i32 2, label %88
    i32 3, label %172
    i32 4, label %252
    i32 5, label %332
    i32 6, label %403
  ], !dbg !1510

4:                                                ; preds = %3
    #dbg_value(ptr undef, !110, !DIExpression(), !1465)
    #dbg_value(ptr poison, !115, !DIExpression(), !1465)
    #dbg_value(i32 4, !116, !DIExpression(), !1465)
    #dbg_value(ptr undef, !117, !DIExpression(), !1465)
    #dbg_value(ptr poison, !119, !DIExpression(), !1465)
    #dbg_value(i8 poison, !1428, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1511)
    #dbg_value(i8 poison, !1428, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1511)
    #dbg_value(i8 poison, !1428, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1511)
    #dbg_value(i8 poison, !1428, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1511)
    #dbg_value(i32 4, !122, !DIExpression(), !1512)
    #dbg_value(ptr undef, !110, !DIExpression(), !1467)
    #dbg_value(ptr poison, !115, !DIExpression(), !1467)
    #dbg_value(i32 4, !116, !DIExpression(), !1467)
    #dbg_value(ptr undef, !117, !DIExpression(), !1467)
    #dbg_value(ptr poison, !119, !DIExpression(), !1467)
    #dbg_value(i8 poison, !1431, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1511)
    #dbg_value(i8 poison, !1431, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1511)
    #dbg_value(i8 poison, !1431, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1511)
    #dbg_value(i8 poison, !1431, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1511)
    #dbg_value(i32 4, !122, !DIExpression(), !1513)
  %5 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1514
  %6 = load ptr, ptr %5, align 4, !dbg !1514, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1469)
    #dbg_value(ptr %6, !115, !DIExpression(), !1469)
    #dbg_value(i32 4, !116, !DIExpression(), !1469)
    #dbg_value(ptr undef, !117, !DIExpression(), !1469)
    #dbg_value(ptr %6, !119, !DIExpression(), !1469)
    #dbg_value(i32 0, !122, !DIExpression(), !1515)
  %7 = load i8, ptr %6, align 1, !dbg !1516, !tbaa !131
    #dbg_value(i8 %7, !1432, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1511)
    #dbg_value(i32 1, !122, !DIExpression(), !1515)
  %8 = getelementptr inbounds nuw i8, ptr %6, i32 1, !dbg !1516
  %9 = load i8, ptr %8, align 1, !dbg !1516, !tbaa !131
    #dbg_value(i8 %9, !1432, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1511)
    #dbg_value(i32 2, !122, !DIExpression(), !1515)
  %10 = getelementptr inbounds nuw i8, ptr %6, i32 2, !dbg !1516
  %11 = load i8, ptr %10, align 1, !dbg !1516, !tbaa !131
    #dbg_value(i8 %11, !1432, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1511)
    #dbg_value(i32 3, !122, !DIExpression(), !1515)
  %12 = getelementptr inbounds nuw i8, ptr %6, i32 3, !dbg !1516
  %13 = load i8, ptr %12, align 1, !dbg !1516, !tbaa !131
    #dbg_value(i8 %13, !1432, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1511)
    #dbg_value(i32 4, !122, !DIExpression(), !1515)
  %14 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1517
  %15 = load ptr, ptr %14, align 4, !dbg !1517, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1471)
    #dbg_value(ptr %15, !115, !DIExpression(), !1471)
    #dbg_value(i32 4, !116, !DIExpression(), !1471)
    #dbg_value(ptr undef, !117, !DIExpression(), !1471)
    #dbg_value(ptr %15, !119, !DIExpression(), !1471)
    #dbg_value(i32 0, !122, !DIExpression(), !1518)
  %16 = load i8, ptr %15, align 1, !dbg !1519, !tbaa !131
    #dbg_value(i8 %16, !1433, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1511)
    #dbg_value(i32 1, !122, !DIExpression(), !1518)
  %17 = getelementptr inbounds nuw i8, ptr %15, i32 1, !dbg !1519
  %18 = load i8, ptr %17, align 1, !dbg !1519, !tbaa !131
    #dbg_value(i8 %18, !1433, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1511)
    #dbg_value(i32 2, !122, !DIExpression(), !1518)
  %19 = getelementptr inbounds nuw i8, ptr %15, i32 2, !dbg !1519
  %20 = load i8, ptr %19, align 1, !dbg !1519, !tbaa !131
    #dbg_value(i8 %20, !1433, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1511)
    #dbg_value(i32 3, !122, !DIExpression(), !1518)
  %21 = getelementptr inbounds nuw i8, ptr %15, i32 3, !dbg !1519
  %22 = load i8, ptr %21, align 1, !dbg !1519, !tbaa !131
    #dbg_value(i8 %22, !1433, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1511)
    #dbg_value(i32 4, !122, !DIExpression(), !1518)
  %23 = zext i8 %13 to i32, !dbg !1520
  %24 = shl nuw i32 %23, 24, !dbg !1520
  %25 = zext i8 %11 to i32, !dbg !1520
  %26 = shl nuw nsw i32 %25, 16, !dbg !1520
  %27 = or disjoint i32 %24, %26, !dbg !1520
  %28 = zext i8 %9 to i32, !dbg !1520
  %29 = shl nuw nsw i32 %28, 8, !dbg !1520
  %30 = or disjoint i32 %27, %29, !dbg !1520
  %31 = zext i8 %7 to i32, !dbg !1520
  %32 = or disjoint i32 %30, %31, !dbg !1520
  %33 = zext i8 %22 to i32, !dbg !1521
  %34 = shl nuw i32 %33, 24, !dbg !1521
  %35 = zext i8 %20 to i32, !dbg !1521
  %36 = shl nuw nsw i32 %35, 16, !dbg !1521
  %37 = or disjoint i32 %34, %36, !dbg !1521
  %38 = zext i8 %18 to i32, !dbg !1521
  %39 = shl nuw nsw i32 %38, 8, !dbg !1521
  %40 = or disjoint i32 %37, %39, !dbg !1521
  %41 = zext i8 %16 to i32, !dbg !1521
  %42 = or disjoint i32 %40, %41, !dbg !1521
    #dbg_value(i32 poison, !488, !DIExpression(), !1523)
    #dbg_value(i32 poison, !489, !DIExpression(), !1523)
    #dbg_value(i32 %32, !490, !DIExpression(), !1523)
    #dbg_value(i32 %42, !491, !DIExpression(), !1523)
    #dbg_value(i32 poison, !492, !DIExpression(), !1523)
    #dbg_value(i32 poison, !493, !DIExpression(), !1523)
    #dbg_value(i32 %32, !494, !DIExpression(), !1523)
    #dbg_value(i32 %42, !495, !DIExpression(), !1523)
    #dbg_value(i32 poison, !496, !DIExpression(), !1523)
    #dbg_value(i32 %42, !497, !DIExpression(), !1523)
  %43 = icmp eq i32 %42, 0, !dbg !1521
  br i1 %43, label %85, label %44, !dbg !1521

44:                                               ; preds = %4
  %45 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1524
  %46 = load ptr, ptr %45, align 4, !dbg !1524, !tbaa !960
    #dbg_value(ptr %46, !115, !DIExpression(), !1467)
    #dbg_value(ptr %46, !119, !DIExpression(), !1467)
  %47 = getelementptr inbounds nuw i8, ptr %46, i32 3, !dbg !1525
  %48 = load i8, ptr %47, align 1, !dbg !1525, !tbaa !131
    #dbg_value(i8 %48, !1431, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1511)
  %49 = getelementptr inbounds nuw i8, ptr %46, i32 2, !dbg !1525
  %50 = load i8, ptr %49, align 1, !dbg !1525, !tbaa !131
    #dbg_value(i8 %50, !1431, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1511)
  %51 = getelementptr inbounds nuw i8, ptr %46, i32 1, !dbg !1525
  %52 = load i8, ptr %51, align 1, !dbg !1525, !tbaa !131
    #dbg_value(i8 %52, !1431, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1511)
  %53 = load i8, ptr %46, align 1, !dbg !1525, !tbaa !131
    #dbg_value(i8 %53, !1431, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1511)
  %54 = load ptr, ptr %1, align 4, !dbg !1526, !tbaa !960
    #dbg_value(ptr %54, !115, !DIExpression(), !1465)
    #dbg_value(ptr %54, !119, !DIExpression(), !1465)
  %55 = getelementptr inbounds nuw i8, ptr %54, i32 3, !dbg !1527
  %56 = load i8, ptr %55, align 1, !dbg !1527, !tbaa !131
    #dbg_value(i8 %56, !1428, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1511)
  %57 = getelementptr inbounds nuw i8, ptr %54, i32 2, !dbg !1527
  %58 = load i8, ptr %57, align 1, !dbg !1527, !tbaa !131
    #dbg_value(i8 %58, !1428, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1511)
  %59 = getelementptr inbounds nuw i8, ptr %54, i32 1, !dbg !1527
  %60 = load i8, ptr %59, align 1, !dbg !1527, !tbaa !131
    #dbg_value(i8 %60, !1428, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1511)
  %61 = load i8, ptr %54, align 1, !dbg !1527, !tbaa !131
    #dbg_value(i8 %61, !1428, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1511)
  %62 = zext i8 %48 to i32, !dbg !1528
  %63 = shl nuw i32 %62, 24, !dbg !1528
  %64 = zext i8 %50 to i32, !dbg !1528
  %65 = shl nuw nsw i32 %64, 16, !dbg !1528
  %66 = or disjoint i32 %63, %65, !dbg !1528
  %67 = zext i8 %52 to i32, !dbg !1528
  %68 = shl nuw nsw i32 %67, 8, !dbg !1528
  %69 = or disjoint i32 %66, %68, !dbg !1528
  %70 = zext i8 %53 to i32, !dbg !1528
  %71 = or disjoint i32 %69, %70, !dbg !1528
    #dbg_value(i32 %71, !489, !DIExpression(), !1523)
    #dbg_value(i32 %71, !493, !DIExpression(), !1523)
    #dbg_value(i32 %71, !496, !DIExpression(), !1523)
  %72 = zext i8 %56 to i32, !dbg !1529
  %73 = shl nuw i32 %72, 24, !dbg !1529
  %74 = zext i8 %58 to i32, !dbg !1529
  %75 = shl nuw nsw i32 %74, 16, !dbg !1529
  %76 = or disjoint i32 %73, %75, !dbg !1529
  %77 = zext i8 %60 to i32, !dbg !1529
  %78 = shl nuw nsw i32 %77, 8, !dbg !1529
  %79 = or disjoint i32 %76, %78, !dbg !1529
  %80 = zext i8 %61 to i32, !dbg !1529
  %81 = or disjoint i32 %79, %80, !dbg !1529
    #dbg_value(i32 %81, !488, !DIExpression(), !1523)
    #dbg_value(i32 %81, !492, !DIExpression(), !1523)
  %82 = udiv i32 %71, %42, !dbg !1529
    #dbg_value(i32 %82, !498, !DIExpression(), !1523)
    #dbg_value(i32 %82, !499, !DIExpression(), !1523)
    #dbg_value(i32 %81, !500, !DIExpression(), !1523)
    #dbg_value(i32 %42, !501, !DIExpression(), !1523)
  %83 = urem i32 %81, %42, !dbg !1530
    #dbg_value(i32 %83, !502, !DIExpression(), !1523)
  %84 = add i32 %83, %82
  br label %85

85:                                               ; preds = %4, %44
  %86 = phi i32 [ %84, %44 ], [ 0, %4 ], !dbg !1531
    #dbg_value(i32 poison, !502, !DIExpression(), !1523)
    #dbg_value(i32 %86, !503, !DIExpression(), !1523)
  %87 = add i32 %86, %32, !dbg !1532
    #dbg_value(i32 %87, !1434, !DIExpression(), !1511)
  br label %475

88:                                               ; preds = %3
    #dbg_value(ptr undef, !110, !DIExpression(), !1473)
    #dbg_value(ptr poison, !115, !DIExpression(), !1473)
    #dbg_value(i32 4, !116, !DIExpression(), !1473)
    #dbg_value(ptr undef, !117, !DIExpression(), !1473)
    #dbg_value(ptr poison, !119, !DIExpression(), !1473)
    #dbg_value(i8 poison, !1435, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1533)
    #dbg_value(i8 poison, !1435, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1533)
    #dbg_value(i8 poison, !1435, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1533)
    #dbg_value(i8 poison, !1435, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1533)
    #dbg_value(i32 4, !122, !DIExpression(), !1534)
    #dbg_value(ptr undef, !110, !DIExpression(), !1475)
    #dbg_value(ptr poison, !115, !DIExpression(), !1475)
    #dbg_value(i32 4, !116, !DIExpression(), !1475)
    #dbg_value(ptr undef, !117, !DIExpression(), !1475)
    #dbg_value(ptr poison, !119, !DIExpression(), !1475)
    #dbg_value(i8 poison, !1437, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1533)
    #dbg_value(i8 poison, !1437, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1533)
    #dbg_value(i8 poison, !1437, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1533)
    #dbg_value(i8 poison, !1437, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1533)
    #dbg_value(i32 4, !122, !DIExpression(), !1535)
  %89 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1536
  %90 = load ptr, ptr %89, align 4, !dbg !1536, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1477)
    #dbg_value(ptr %90, !115, !DIExpression(), !1477)
    #dbg_value(i32 4, !116, !DIExpression(), !1477)
    #dbg_value(ptr undef, !117, !DIExpression(), !1477)
    #dbg_value(ptr %90, !119, !DIExpression(), !1477)
    #dbg_value(i32 0, !122, !DIExpression(), !1537)
  %91 = load i8, ptr %90, align 1, !dbg !1538, !tbaa !131
    #dbg_value(i8 %91, !1438, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1533)
    #dbg_value(i32 1, !122, !DIExpression(), !1537)
  %92 = getelementptr inbounds nuw i8, ptr %90, i32 1, !dbg !1538
  %93 = load i8, ptr %92, align 1, !dbg !1538, !tbaa !131
    #dbg_value(i8 %93, !1438, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1533)
    #dbg_value(i32 2, !122, !DIExpression(), !1537)
  %94 = getelementptr inbounds nuw i8, ptr %90, i32 2, !dbg !1538
  %95 = load i8, ptr %94, align 1, !dbg !1538, !tbaa !131
    #dbg_value(i8 %95, !1438, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1533)
    #dbg_value(i32 3, !122, !DIExpression(), !1537)
  %96 = getelementptr inbounds nuw i8, ptr %90, i32 3, !dbg !1538
  %97 = load i8, ptr %96, align 1, !dbg !1538, !tbaa !131
    #dbg_value(i8 %97, !1438, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1533)
    #dbg_value(i32 4, !122, !DIExpression(), !1537)
  %98 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1539
  %99 = load ptr, ptr %98, align 4, !dbg !1539, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1479)
    #dbg_value(ptr %99, !115, !DIExpression(), !1479)
    #dbg_value(i32 4, !116, !DIExpression(), !1479)
    #dbg_value(ptr undef, !117, !DIExpression(), !1479)
    #dbg_value(ptr %99, !119, !DIExpression(), !1479)
    #dbg_value(i32 0, !122, !DIExpression(), !1540)
  %100 = load i8, ptr %99, align 1, !dbg !1541, !tbaa !131
    #dbg_value(i8 %100, !1439, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1533)
    #dbg_value(i32 1, !122, !DIExpression(), !1540)
  %101 = getelementptr inbounds nuw i8, ptr %99, i32 1, !dbg !1541
  %102 = load i8, ptr %101, align 1, !dbg !1541, !tbaa !131
    #dbg_value(i8 %102, !1439, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1533)
    #dbg_value(i32 2, !122, !DIExpression(), !1540)
  %103 = getelementptr inbounds nuw i8, ptr %99, i32 2, !dbg !1541
  %104 = load i8, ptr %103, align 1, !dbg !1541, !tbaa !131
    #dbg_value(i8 %104, !1439, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1533)
    #dbg_value(i32 3, !122, !DIExpression(), !1540)
  %105 = getelementptr inbounds nuw i8, ptr %99, i32 3, !dbg !1541
  %106 = load i8, ptr %105, align 1, !dbg !1541, !tbaa !131
    #dbg_value(i8 %106, !1439, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1533)
    #dbg_value(i32 4, !122, !DIExpression(), !1540)
  %107 = zext i8 %97 to i32, !dbg !1542
  %108 = shl nuw i32 %107, 24, !dbg !1542
  %109 = zext i8 %95 to i32, !dbg !1542
  %110 = shl nuw nsw i32 %109, 16, !dbg !1542
  %111 = or disjoint i32 %108, %110, !dbg !1542
  %112 = zext i8 %93 to i32, !dbg !1542
  %113 = shl nuw nsw i32 %112, 8, !dbg !1542
  %114 = or disjoint i32 %111, %113, !dbg !1542
  %115 = zext i8 %91 to i32, !dbg !1542
  %116 = or disjoint i32 %114, %115, !dbg !1542
  %117 = zext i8 %106 to i32, !dbg !1543
  %118 = shl nuw i32 %117, 24, !dbg !1543
  %119 = zext i8 %104 to i32, !dbg !1543
  %120 = shl nuw nsw i32 %119, 16, !dbg !1543
  %121 = or disjoint i32 %118, %120, !dbg !1543
  %122 = zext i8 %102 to i32, !dbg !1543
  %123 = shl nuw nsw i32 %122, 8, !dbg !1543
  %124 = or disjoint i32 %121, %123, !dbg !1543
  %125 = zext i8 %100 to i32, !dbg !1543
  %126 = or disjoint i32 %124, %125, !dbg !1543
    #dbg_value(i32 poison, !517, !DIExpression(), !1545)
    #dbg_value(i32 poison, !518, !DIExpression(), !1545)
    #dbg_value(i32 %116, !519, !DIExpression(), !1545)
    #dbg_value(i32 %126, !520, !DIExpression(), !1545)
    #dbg_value(i32 poison, !521, !DIExpression(), !1545)
    #dbg_value(i32 %126, !522, !DIExpression(), !1545)
  %127 = icmp eq i32 %126, 0, !dbg !1543
  br i1 %127, label %169, label %128, !dbg !1543

128:                                              ; preds = %88
  %129 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1546
  %130 = load ptr, ptr %129, align 4, !dbg !1546, !tbaa !960
    #dbg_value(ptr %130, !115, !DIExpression(), !1475)
    #dbg_value(ptr %130, !119, !DIExpression(), !1475)
  %131 = getelementptr inbounds nuw i8, ptr %130, i32 3, !dbg !1547
  %132 = load i8, ptr %131, align 1, !dbg !1547, !tbaa !131
    #dbg_value(i8 %132, !1437, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1533)
  %133 = getelementptr inbounds nuw i8, ptr %130, i32 2, !dbg !1547
  %134 = load i8, ptr %133, align 1, !dbg !1547, !tbaa !131
    #dbg_value(i8 %134, !1437, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1533)
  %135 = getelementptr inbounds nuw i8, ptr %130, i32 1, !dbg !1547
  %136 = load i8, ptr %135, align 1, !dbg !1547, !tbaa !131
    #dbg_value(i8 %136, !1437, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1533)
  %137 = load i8, ptr %130, align 1, !dbg !1547, !tbaa !131
    #dbg_value(i8 %137, !1437, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1533)
  %138 = load ptr, ptr %1, align 4, !dbg !1548, !tbaa !960
    #dbg_value(ptr %138, !115, !DIExpression(), !1473)
    #dbg_value(ptr %138, !119, !DIExpression(), !1473)
  %139 = getelementptr inbounds nuw i8, ptr %138, i32 3, !dbg !1549
  %140 = load i8, ptr %139, align 1, !dbg !1549, !tbaa !131
    #dbg_value(i8 %140, !1435, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1533)
  %141 = getelementptr inbounds nuw i8, ptr %138, i32 2, !dbg !1549
  %142 = load i8, ptr %141, align 1, !dbg !1549, !tbaa !131
    #dbg_value(i8 %142, !1435, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1533)
  %143 = getelementptr inbounds nuw i8, ptr %138, i32 1, !dbg !1549
  %144 = load i8, ptr %143, align 1, !dbg !1549, !tbaa !131
    #dbg_value(i8 %144, !1435, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1533)
  %145 = load i8, ptr %138, align 1, !dbg !1549, !tbaa !131
    #dbg_value(i8 %145, !1435, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1533)
  %146 = zext i8 %132 to i32, !dbg !1550
  %147 = shl nuw i32 %146, 24, !dbg !1550
  %148 = zext i8 %134 to i32, !dbg !1550
  %149 = shl nuw nsw i32 %148, 16, !dbg !1550
  %150 = or disjoint i32 %147, %149, !dbg !1550
  %151 = zext i8 %136 to i32, !dbg !1550
  %152 = shl nuw nsw i32 %151, 8, !dbg !1550
  %153 = or disjoint i32 %150, %152, !dbg !1550
  %154 = zext i8 %137 to i32, !dbg !1550
  %155 = or disjoint i32 %153, %154, !dbg !1550
    #dbg_value(i32 %155, !518, !DIExpression(), !1545)
    #dbg_value(i32 %155, !521, !DIExpression(), !1545)
  %156 = zext i8 %140 to i32, !dbg !1551
  %157 = shl nuw i32 %156, 24, !dbg !1551
  %158 = zext i8 %142 to i32, !dbg !1551
  %159 = shl nuw nsw i32 %158, 16, !dbg !1551
  %160 = or disjoint i32 %157, %159, !dbg !1551
  %161 = zext i8 %144 to i32, !dbg !1551
  %162 = shl nuw nsw i32 %161, 8, !dbg !1551
  %163 = or disjoint i32 %160, %162, !dbg !1551
  %164 = zext i8 %145 to i32, !dbg !1551
  %165 = or disjoint i32 %163, %164, !dbg !1551
    #dbg_value(i32 %165, !517, !DIExpression(), !1545)
  %166 = udiv i32 %155, %126, !dbg !1551
    #dbg_value(i32 %166, !523, !DIExpression(), !1545)
    #dbg_value(i32 %166, !524, !DIExpression(), !1545)
    #dbg_value(i32 %165, !525, !DIExpression(), !1545)
    #dbg_value(i32 %126, !526, !DIExpression(), !1545)
  %167 = urem i32 %165, %126, !dbg !1552
    #dbg_value(i32 %167, !527, !DIExpression(), !1545)
  %168 = add i32 %167, %166
  br label %169

169:                                              ; preds = %88, %128
  %170 = phi i32 [ %168, %128 ], [ 0, %88 ], !dbg !1553
    #dbg_value(i32 poison, !527, !DIExpression(), !1545)
    #dbg_value(i32 %170, !528, !DIExpression(), !1545)
  %171 = add i32 %170, %116, !dbg !1554
    #dbg_value(i32 %171, !1440, !DIExpression(), !1533)
  br label %475

172:                                              ; preds = %3
  %173 = load ptr, ptr %1, align 4, !dbg !1555, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1481)
    #dbg_value(ptr %173, !115, !DIExpression(), !1481)
    #dbg_value(i32 4, !116, !DIExpression(), !1481)
    #dbg_value(ptr undef, !117, !DIExpression(), !1481)
    #dbg_value(ptr %173, !119, !DIExpression(), !1481)
    #dbg_value(i32 0, !122, !DIExpression(), !1556)
  %174 = load i8, ptr %173, align 1, !dbg !1557, !tbaa !131
    #dbg_value(i8 %174, !1441, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1558)
    #dbg_value(i32 1, !122, !DIExpression(), !1556)
  %175 = getelementptr inbounds nuw i8, ptr %173, i32 1, !dbg !1557
  %176 = load i8, ptr %175, align 1, !dbg !1557, !tbaa !131
    #dbg_value(i8 %176, !1441, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1558)
    #dbg_value(i32 2, !122, !DIExpression(), !1556)
  %177 = getelementptr inbounds nuw i8, ptr %173, i32 2, !dbg !1557
  %178 = load i8, ptr %177, align 1, !dbg !1557, !tbaa !131
    #dbg_value(i8 %178, !1441, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1558)
    #dbg_value(i32 3, !122, !DIExpression(), !1556)
  %179 = getelementptr inbounds nuw i8, ptr %173, i32 3, !dbg !1557
  %180 = load i8, ptr %179, align 1, !dbg !1557, !tbaa !131
    #dbg_value(i8 %180, !1441, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1558)
    #dbg_value(i32 4, !122, !DIExpression(), !1556)
  %181 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1559
  %182 = load ptr, ptr %181, align 4, !dbg !1559, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1483)
    #dbg_value(ptr %182, !115, !DIExpression(), !1483)
    #dbg_value(i32 4, !116, !DIExpression(), !1483)
    #dbg_value(ptr undef, !117, !DIExpression(), !1483)
    #dbg_value(ptr %182, !119, !DIExpression(), !1483)
    #dbg_value(i32 0, !122, !DIExpression(), !1560)
  %183 = load i8, ptr %182, align 1, !dbg !1561, !tbaa !131
    #dbg_value(i8 %183, !1443, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1558)
    #dbg_value(i32 1, !122, !DIExpression(), !1560)
  %184 = getelementptr inbounds nuw i8, ptr %182, i32 1, !dbg !1561
  %185 = load i8, ptr %184, align 1, !dbg !1561, !tbaa !131
    #dbg_value(i8 %185, !1443, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1558)
    #dbg_value(i32 2, !122, !DIExpression(), !1560)
  %186 = getelementptr inbounds nuw i8, ptr %182, i32 2, !dbg !1561
  %187 = load i8, ptr %186, align 1, !dbg !1561, !tbaa !131
    #dbg_value(i8 %187, !1443, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1558)
    #dbg_value(i32 3, !122, !DIExpression(), !1560)
  %188 = getelementptr inbounds nuw i8, ptr %182, i32 3, !dbg !1561
  %189 = load i8, ptr %188, align 1, !dbg !1561, !tbaa !131
    #dbg_value(i8 %189, !1443, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1558)
    #dbg_value(i32 4, !122, !DIExpression(), !1560)
  %190 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1562
  %191 = load ptr, ptr %190, align 4, !dbg !1562, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1485)
    #dbg_value(ptr %191, !115, !DIExpression(), !1485)
    #dbg_value(i32 4, !116, !DIExpression(), !1485)
    #dbg_value(ptr undef, !117, !DIExpression(), !1485)
    #dbg_value(ptr %191, !119, !DIExpression(), !1485)
    #dbg_value(i32 0, !122, !DIExpression(), !1563)
  %192 = load i8, ptr %191, align 1, !dbg !1564, !tbaa !131
    #dbg_value(i8 %192, !1444, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1558)
    #dbg_value(i32 1, !122, !DIExpression(), !1563)
  %193 = getelementptr inbounds nuw i8, ptr %191, i32 1, !dbg !1564
  %194 = load i8, ptr %193, align 1, !dbg !1564, !tbaa !131
    #dbg_value(i8 %194, !1444, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1558)
    #dbg_value(i32 2, !122, !DIExpression(), !1563)
  %195 = getelementptr inbounds nuw i8, ptr %191, i32 2, !dbg !1564
  %196 = load i8, ptr %195, align 1, !dbg !1564, !tbaa !131
    #dbg_value(i8 %196, !1444, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1558)
    #dbg_value(i32 3, !122, !DIExpression(), !1563)
  %197 = getelementptr inbounds nuw i8, ptr %191, i32 3, !dbg !1564
  %198 = load i8, ptr %197, align 1, !dbg !1564, !tbaa !131
    #dbg_value(i8 %198, !1444, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1558)
    #dbg_value(i32 4, !122, !DIExpression(), !1563)
  %199 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1565
  %200 = load ptr, ptr %199, align 4, !dbg !1565, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1487)
    #dbg_value(ptr %200, !115, !DIExpression(), !1487)
    #dbg_value(i32 4, !116, !DIExpression(), !1487)
    #dbg_value(ptr undef, !117, !DIExpression(), !1487)
    #dbg_value(ptr %200, !119, !DIExpression(), !1487)
    #dbg_value(i32 0, !122, !DIExpression(), !1566)
  %201 = load i8, ptr %200, align 1, !dbg !1567, !tbaa !131
    #dbg_value(i8 %201, !1445, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1558)
    #dbg_value(i32 1, !122, !DIExpression(), !1566)
  %202 = getelementptr inbounds nuw i8, ptr %200, i32 1, !dbg !1567
  %203 = load i8, ptr %202, align 1, !dbg !1567, !tbaa !131
    #dbg_value(i8 %203, !1445, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1558)
    #dbg_value(i32 2, !122, !DIExpression(), !1566)
  %204 = getelementptr inbounds nuw i8, ptr %200, i32 2, !dbg !1567
  %205 = load i8, ptr %204, align 1, !dbg !1567, !tbaa !131
    #dbg_value(i8 %205, !1445, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1558)
    #dbg_value(i32 3, !122, !DIExpression(), !1566)
  %206 = getelementptr inbounds nuw i8, ptr %200, i32 3, !dbg !1567
  %207 = load i8, ptr %206, align 1, !dbg !1567, !tbaa !131
    #dbg_value(i8 %207, !1445, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1558)
    #dbg_value(i32 4, !122, !DIExpression(), !1566)
  %208 = zext i8 %180 to i32, !dbg !1568
  %209 = shl nuw i32 %208, 24, !dbg !1568
  %210 = zext i8 %178 to i32, !dbg !1568
  %211 = shl nuw nsw i32 %210, 16, !dbg !1568
  %212 = or disjoint i32 %209, %211, !dbg !1568
  %213 = zext i8 %176 to i32, !dbg !1568
  %214 = shl nuw nsw i32 %213, 8, !dbg !1568
  %215 = or disjoint i32 %212, %214, !dbg !1568
  %216 = zext i8 %174 to i32, !dbg !1568
  %217 = or disjoint i32 %215, %216, !dbg !1568
  %218 = zext i8 %189 to i32, !dbg !1569
  %219 = shl nuw i32 %218, 24, !dbg !1569
  %220 = zext i8 %187 to i32, !dbg !1569
  %221 = shl nuw nsw i32 %220, 16, !dbg !1569
  %222 = or disjoint i32 %219, %221, !dbg !1569
  %223 = zext i8 %185 to i32, !dbg !1569
  %224 = shl nuw nsw i32 %223, 8, !dbg !1569
  %225 = or disjoint i32 %222, %224, !dbg !1569
  %226 = zext i8 %183 to i32, !dbg !1569
  %227 = or disjoint i32 %225, %226, !dbg !1569
  %228 = zext i8 %198 to i32, !dbg !1570
  %229 = shl nuw i32 %228, 24, !dbg !1570
  %230 = zext i8 %196 to i32, !dbg !1570
  %231 = shl nuw nsw i32 %230, 16, !dbg !1570
  %232 = or disjoint i32 %229, %231, !dbg !1570
  %233 = zext i8 %194 to i32, !dbg !1570
  %234 = shl nuw nsw i32 %233, 8, !dbg !1570
  %235 = or disjoint i32 %232, %234, !dbg !1570
  %236 = zext i8 %192 to i32, !dbg !1570
  %237 = or disjoint i32 %235, %236, !dbg !1570
  %238 = zext i8 %207 to i32, !dbg !1571
  %239 = shl nuw i32 %238, 24, !dbg !1571
  %240 = zext i8 %205 to i32, !dbg !1571
  %241 = shl nuw nsw i32 %240, 16, !dbg !1571
  %242 = or disjoint i32 %239, %241, !dbg !1571
  %243 = zext i8 %203 to i32, !dbg !1571
  %244 = shl nuw nsw i32 %243, 8, !dbg !1571
  %245 = or disjoint i32 %242, %244, !dbg !1571
  %246 = zext i8 %201 to i32, !dbg !1571
  %247 = or disjoint i32 %245, %246, !dbg !1571
    #dbg_value(i32 %217, !542, !DIExpression(), !1573)
    #dbg_value(i32 %227, !543, !DIExpression(), !1573)
    #dbg_value(i32 %237, !544, !DIExpression(), !1573)
    #dbg_value(i32 %247, !545, !DIExpression(), !1573)
    #dbg_value(i32 %217, !546, !DIExpression(), !1573)
    #dbg_value(i32 %227, !547, !DIExpression(), !1573)
    #dbg_value(i32 %237, !548, !DIExpression(), !1573)
    #dbg_value(i32 %247, !549, !DIExpression(), !1573)
    #dbg_value(i32 %217, !550, !DIExpression(), !1573)
  %248 = icmp ult i32 %217, %237, !dbg !1571
  %249 = add i32 %247, %227, !dbg !1574
  %250 = mul i32 %227, 3, !dbg !1574
  %251 = select i1 %248, i32 %249, i32 %250, !dbg !1574
    #dbg_value(i32 %251, !551, !DIExpression(), !1573)
    #dbg_value(i32 %251, !1446, !DIExpression(), !1558)
  br label %475

252:                                              ; preds = %3
  %253 = load ptr, ptr %1, align 4, !dbg !1575, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1489)
    #dbg_value(ptr %253, !115, !DIExpression(), !1489)
    #dbg_value(i32 4, !116, !DIExpression(), !1489)
    #dbg_value(ptr undef, !117, !DIExpression(), !1489)
    #dbg_value(ptr %253, !119, !DIExpression(), !1489)
    #dbg_value(i32 0, !122, !DIExpression(), !1576)
  %254 = load i8, ptr %253, align 1, !dbg !1577, !tbaa !131
    #dbg_value(i8 %254, !1447, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1578)
    #dbg_value(i32 1, !122, !DIExpression(), !1576)
  %255 = getelementptr inbounds nuw i8, ptr %253, i32 1, !dbg !1577
  %256 = load i8, ptr %255, align 1, !dbg !1577, !tbaa !131
    #dbg_value(i8 %256, !1447, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1578)
    #dbg_value(i32 2, !122, !DIExpression(), !1576)
  %257 = getelementptr inbounds nuw i8, ptr %253, i32 2, !dbg !1577
  %258 = load i8, ptr %257, align 1, !dbg !1577, !tbaa !131
    #dbg_value(i8 %258, !1447, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1578)
    #dbg_value(i32 3, !122, !DIExpression(), !1576)
  %259 = getelementptr inbounds nuw i8, ptr %253, i32 3, !dbg !1577
  %260 = load i8, ptr %259, align 1, !dbg !1577, !tbaa !131
    #dbg_value(i8 %260, !1447, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1578)
    #dbg_value(i32 4, !122, !DIExpression(), !1576)
  %261 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1579
  %262 = load ptr, ptr %261, align 4, !dbg !1579, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1491)
    #dbg_value(ptr %262, !115, !DIExpression(), !1491)
    #dbg_value(i32 4, !116, !DIExpression(), !1491)
    #dbg_value(ptr undef, !117, !DIExpression(), !1491)
    #dbg_value(ptr %262, !119, !DIExpression(), !1491)
    #dbg_value(i32 0, !122, !DIExpression(), !1580)
  %263 = load i8, ptr %262, align 1, !dbg !1581, !tbaa !131
    #dbg_value(i8 %263, !1449, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1578)
    #dbg_value(i32 1, !122, !DIExpression(), !1580)
  %264 = getelementptr inbounds nuw i8, ptr %262, i32 1, !dbg !1581
  %265 = load i8, ptr %264, align 1, !dbg !1581, !tbaa !131
    #dbg_value(i8 %265, !1449, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1578)
    #dbg_value(i32 2, !122, !DIExpression(), !1580)
  %266 = getelementptr inbounds nuw i8, ptr %262, i32 2, !dbg !1581
  %267 = load i8, ptr %266, align 1, !dbg !1581, !tbaa !131
    #dbg_value(i8 %267, !1449, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1578)
    #dbg_value(i32 3, !122, !DIExpression(), !1580)
  %268 = getelementptr inbounds nuw i8, ptr %262, i32 3, !dbg !1581
  %269 = load i8, ptr %268, align 1, !dbg !1581, !tbaa !131
    #dbg_value(i8 %269, !1449, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1578)
    #dbg_value(i32 4, !122, !DIExpression(), !1580)
  %270 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1582
  %271 = load ptr, ptr %270, align 4, !dbg !1582, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1493)
    #dbg_value(ptr %271, !115, !DIExpression(), !1493)
    #dbg_value(i32 4, !116, !DIExpression(), !1493)
    #dbg_value(ptr undef, !117, !DIExpression(), !1493)
    #dbg_value(ptr %271, !119, !DIExpression(), !1493)
    #dbg_value(i32 0, !122, !DIExpression(), !1583)
  %272 = load i8, ptr %271, align 1, !dbg !1584, !tbaa !131
    #dbg_value(i8 %272, !1450, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1578)
    #dbg_value(i32 1, !122, !DIExpression(), !1583)
  %273 = getelementptr inbounds nuw i8, ptr %271, i32 1, !dbg !1584
  %274 = load i8, ptr %273, align 1, !dbg !1584, !tbaa !131
    #dbg_value(i8 %274, !1450, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1578)
    #dbg_value(i32 2, !122, !DIExpression(), !1583)
  %275 = getelementptr inbounds nuw i8, ptr %271, i32 2, !dbg !1584
  %276 = load i8, ptr %275, align 1, !dbg !1584, !tbaa !131
    #dbg_value(i8 %276, !1450, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1578)
    #dbg_value(i32 3, !122, !DIExpression(), !1583)
  %277 = getelementptr inbounds nuw i8, ptr %271, i32 3, !dbg !1584
  %278 = load i8, ptr %277, align 1, !dbg !1584, !tbaa !131
    #dbg_value(i8 %278, !1450, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1578)
    #dbg_value(i32 4, !122, !DIExpression(), !1583)
  %279 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1585
  %280 = load ptr, ptr %279, align 4, !dbg !1585, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1495)
    #dbg_value(ptr %280, !115, !DIExpression(), !1495)
    #dbg_value(i32 4, !116, !DIExpression(), !1495)
    #dbg_value(ptr undef, !117, !DIExpression(), !1495)
    #dbg_value(ptr %280, !119, !DIExpression(), !1495)
    #dbg_value(i32 0, !122, !DIExpression(), !1586)
  %281 = load i8, ptr %280, align 1, !dbg !1587, !tbaa !131
    #dbg_value(i8 %281, !1451, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1578)
    #dbg_value(i32 1, !122, !DIExpression(), !1586)
  %282 = getelementptr inbounds nuw i8, ptr %280, i32 1, !dbg !1587
  %283 = load i8, ptr %282, align 1, !dbg !1587, !tbaa !131
    #dbg_value(i8 %283, !1451, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1578)
    #dbg_value(i32 2, !122, !DIExpression(), !1586)
  %284 = getelementptr inbounds nuw i8, ptr %280, i32 2, !dbg !1587
  %285 = load i8, ptr %284, align 1, !dbg !1587, !tbaa !131
    #dbg_value(i8 %285, !1451, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1578)
    #dbg_value(i32 3, !122, !DIExpression(), !1586)
  %286 = getelementptr inbounds nuw i8, ptr %280, i32 3, !dbg !1587
  %287 = load i8, ptr %286, align 1, !dbg !1587, !tbaa !131
    #dbg_value(i8 %287, !1451, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1578)
    #dbg_value(i32 4, !122, !DIExpression(), !1586)
  %288 = zext i8 %260 to i32, !dbg !1588
  %289 = shl nuw i32 %288, 24, !dbg !1588
  %290 = zext i8 %258 to i32, !dbg !1588
  %291 = shl nuw nsw i32 %290, 16, !dbg !1588
  %292 = or disjoint i32 %289, %291, !dbg !1588
  %293 = zext i8 %256 to i32, !dbg !1588
  %294 = shl nuw nsw i32 %293, 8, !dbg !1588
  %295 = or disjoint i32 %292, %294, !dbg !1588
  %296 = zext i8 %254 to i32, !dbg !1588
  %297 = or disjoint i32 %295, %296, !dbg !1588
  %298 = zext i8 %269 to i32, !dbg !1589
  %299 = shl nuw i32 %298, 24, !dbg !1589
  %300 = zext i8 %267 to i32, !dbg !1589
  %301 = shl nuw nsw i32 %300, 16, !dbg !1589
  %302 = or disjoint i32 %299, %301, !dbg !1589
  %303 = zext i8 %265 to i32, !dbg !1589
  %304 = shl nuw nsw i32 %303, 8, !dbg !1589
  %305 = or disjoint i32 %302, %304, !dbg !1589
  %306 = zext i8 %263 to i32, !dbg !1589
  %307 = or disjoint i32 %305, %306, !dbg !1589
  %308 = zext i8 %278 to i32, !dbg !1590
  %309 = shl nuw i32 %308, 24, !dbg !1590
  %310 = zext i8 %276 to i32, !dbg !1590
  %311 = shl nuw nsw i32 %310, 16, !dbg !1590
  %312 = or disjoint i32 %309, %311, !dbg !1590
  %313 = zext i8 %274 to i32, !dbg !1590
  %314 = shl nuw nsw i32 %313, 8, !dbg !1590
  %315 = or disjoint i32 %312, %314, !dbg !1590
  %316 = zext i8 %272 to i32, !dbg !1590
  %317 = or disjoint i32 %315, %316, !dbg !1590
  %318 = zext i8 %287 to i32, !dbg !1591
  %319 = shl nuw i32 %318, 24, !dbg !1591
  %320 = zext i8 %285 to i32, !dbg !1591
  %321 = shl nuw nsw i32 %320, 16, !dbg !1591
  %322 = or disjoint i32 %319, %321, !dbg !1591
  %323 = zext i8 %283 to i32, !dbg !1591
  %324 = shl nuw nsw i32 %323, 8, !dbg !1591
  %325 = or disjoint i32 %322, %324, !dbg !1591
  %326 = zext i8 %281 to i32, !dbg !1591
  %327 = or disjoint i32 %325, %326, !dbg !1591
    #dbg_value(i32 %297, !563, !DIExpression(), !1593)
    #dbg_value(i32 %307, !564, !DIExpression(), !1593)
    #dbg_value(i32 %317, !565, !DIExpression(), !1593)
    #dbg_value(i32 %327, !566, !DIExpression(), !1593)
    #dbg_value(i32 %297, !567, !DIExpression(), !1593)
  %328 = icmp ult i32 %297, %317, !dbg !1591
  %329 = add i32 %327, %307, !dbg !1594
  %330 = mul i32 %307, 3, !dbg !1594
  %331 = select i1 %328, i32 %329, i32 %330, !dbg !1594
    #dbg_value(i32 %331, !568, !DIExpression(), !1593)
    #dbg_value(i32 %331, !1452, !DIExpression(), !1578)
  br label %475

332:                                              ; preds = %3
  %333 = load ptr, ptr %1, align 4, !dbg !1595, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1497)
    #dbg_value(ptr %333, !115, !DIExpression(), !1497)
    #dbg_value(i32 4, !116, !DIExpression(), !1497)
    #dbg_value(ptr undef, !117, !DIExpression(), !1497)
    #dbg_value(ptr %333, !119, !DIExpression(), !1497)
    #dbg_value(i32 0, !122, !DIExpression(), !1596)
  %334 = load i8, ptr %333, align 1, !dbg !1597, !tbaa !131
    #dbg_value(i8 %334, !1453, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1598)
    #dbg_value(i32 1, !122, !DIExpression(), !1596)
  %335 = getelementptr inbounds nuw i8, ptr %333, i32 1, !dbg !1597
  %336 = load i8, ptr %335, align 1, !dbg !1597, !tbaa !131
    #dbg_value(i8 %336, !1453, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1598)
    #dbg_value(i32 2, !122, !DIExpression(), !1596)
  %337 = getelementptr inbounds nuw i8, ptr %333, i32 2, !dbg !1597
  %338 = load i8, ptr %337, align 1, !dbg !1597, !tbaa !131
    #dbg_value(i8 %338, !1453, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1598)
    #dbg_value(i32 3, !122, !DIExpression(), !1596)
  %339 = getelementptr inbounds nuw i8, ptr %333, i32 3, !dbg !1597
  %340 = load i8, ptr %339, align 1, !dbg !1597, !tbaa !131
    #dbg_value(i8 %340, !1453, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1598)
    #dbg_value(i32 4, !122, !DIExpression(), !1596)
  %341 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1599
  %342 = load ptr, ptr %341, align 4, !dbg !1599, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1499)
    #dbg_value(ptr %342, !115, !DIExpression(), !1499)
    #dbg_value(i32 4, !116, !DIExpression(), !1499)
    #dbg_value(ptr undef, !117, !DIExpression(), !1499)
    #dbg_value(ptr %342, !119, !DIExpression(), !1499)
    #dbg_value(i32 0, !122, !DIExpression(), !1600)
  %343 = load i8, ptr %342, align 1, !dbg !1601, !tbaa !131
    #dbg_value(i8 %343, !1455, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1598)
    #dbg_value(i32 1, !122, !DIExpression(), !1600)
  %344 = getelementptr inbounds nuw i8, ptr %342, i32 1, !dbg !1601
  %345 = load i8, ptr %344, align 1, !dbg !1601, !tbaa !131
    #dbg_value(i8 %345, !1455, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1598)
    #dbg_value(i32 2, !122, !DIExpression(), !1600)
  %346 = getelementptr inbounds nuw i8, ptr %342, i32 2, !dbg !1601
  %347 = load i8, ptr %346, align 1, !dbg !1601, !tbaa !131
    #dbg_value(i8 %347, !1455, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1598)
    #dbg_value(i32 3, !122, !DIExpression(), !1600)
  %348 = getelementptr inbounds nuw i8, ptr %342, i32 3, !dbg !1601
  %349 = load i8, ptr %348, align 1, !dbg !1601, !tbaa !131
    #dbg_value(i8 %349, !1455, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1598)
    #dbg_value(i32 4, !122, !DIExpression(), !1600)
    #dbg_value(i32 poison, !122, !DIExpression(), !1602)
  %350 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1604
  %351 = load ptr, ptr %350, align 4, !dbg !1604, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1501)
    #dbg_value(ptr %351, !115, !DIExpression(), !1501)
    #dbg_value(i32 4, !116, !DIExpression(), !1501)
    #dbg_value(ptr undef, !117, !DIExpression(), !1501)
    #dbg_value(ptr %351, !119, !DIExpression(), !1501)
    #dbg_value(i32 0, !122, !DIExpression(), !1605)
  %352 = load i8, ptr %351, align 1, !dbg !1606, !tbaa !131
    #dbg_value(i8 %352, !1457, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1598)
    #dbg_value(i32 1, !122, !DIExpression(), !1605)
  %353 = getelementptr inbounds nuw i8, ptr %351, i32 1, !dbg !1606
  %354 = load i8, ptr %353, align 1, !dbg !1606, !tbaa !131
    #dbg_value(i8 %354, !1457, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1598)
    #dbg_value(i32 2, !122, !DIExpression(), !1605)
  %355 = getelementptr inbounds nuw i8, ptr %351, i32 2, !dbg !1606
  %356 = load i8, ptr %355, align 1, !dbg !1606, !tbaa !131
    #dbg_value(i8 %356, !1457, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1598)
    #dbg_value(i32 3, !122, !DIExpression(), !1605)
  %357 = getelementptr inbounds nuw i8, ptr %351, i32 3, !dbg !1606
  %358 = load i8, ptr %357, align 1, !dbg !1606, !tbaa !131
    #dbg_value(i8 %358, !1457, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1598)
    #dbg_value(i32 4, !122, !DIExpression(), !1605)
  %359 = zext i8 %340 to i32, !dbg !1607
  %360 = shl nuw i32 %359, 24, !dbg !1607
  %361 = zext i8 %338 to i32, !dbg !1607
  %362 = shl nuw nsw i32 %361, 16, !dbg !1607
  %363 = or disjoint i32 %360, %362, !dbg !1607
  %364 = zext i8 %336 to i32, !dbg !1607
  %365 = shl nuw nsw i32 %364, 8, !dbg !1607
  %366 = or disjoint i32 %363, %365, !dbg !1607
  %367 = zext i8 %334 to i32, !dbg !1607
  %368 = or disjoint i32 %366, %367, !dbg !1607
  %369 = zext i8 %349 to i32, !dbg !1608
  %370 = shl nuw i32 %369, 24, !dbg !1608
  %371 = zext i8 %347 to i32, !dbg !1608
  %372 = shl nuw nsw i32 %371, 16, !dbg !1608
  %373 = or disjoint i32 %370, %372, !dbg !1608
  %374 = zext i8 %345 to i32, !dbg !1608
  %375 = shl nuw nsw i32 %374, 8, !dbg !1608
  %376 = or disjoint i32 %373, %375, !dbg !1608
  %377 = zext i8 %343 to i32, !dbg !1608
  %378 = or disjoint i32 %376, %377, !dbg !1608
  %379 = zext i8 %358 to i32, !dbg !1609
  %380 = shl nuw i32 %379, 24, !dbg !1609
  %381 = zext i8 %356 to i32, !dbg !1609
  %382 = shl nuw nsw i32 %381, 16, !dbg !1609
  %383 = or disjoint i32 %380, %382, !dbg !1609
  %384 = zext i8 %354 to i32, !dbg !1609
  %385 = shl nuw nsw i32 %384, 8, !dbg !1609
  %386 = or disjoint i32 %383, %385, !dbg !1609
  %387 = zext i8 %352 to i32, !dbg !1609
  %388 = or disjoint i32 %386, %387, !dbg !1609
    #dbg_value(i32 %368, !580, !DIExpression(), !1611)
    #dbg_value(i32 %378, !581, !DIExpression(), !1611)
    #dbg_value(i32 poison, !582, !DIExpression(), !1611)
    #dbg_value(i32 %388, !583, !DIExpression(), !1611)
    #dbg_value(i32 %368, !584, !DIExpression(), !1611)
    #dbg_value(i32 %378, !585, !DIExpression(), !1611)
    #dbg_value(i32 poison, !586, !DIExpression(), !1611)
    #dbg_value(i32 %388, !587, !DIExpression(), !1611)
    #dbg_value(i32 %368, !588, !DIExpression(), !1611)
  %389 = icmp ult i32 %368, %378, !dbg !1609
  %390 = icmp eq i32 %388, 0, !dbg !1612
  br i1 %389, label %391, label %397, !dbg !1613

391:                                              ; preds = %332
    #dbg_value(i32 %368, !590, !DIExpression(), !1614)
    #dbg_value(i32 %388, !593, !DIExpression(), !1614)
  br i1 %390, label %394, label %392, !dbg !1615

392:                                              ; preds = %391
  %393 = udiv i32 %368, %388, !dbg !1616
    #dbg_value(i32 %393, !594, !DIExpression(), !1614)
  br label %394

394:                                              ; preds = %392, %391
  %395 = phi i32 [ %393, %392 ], [ 0, %391 ], !dbg !1617
    #dbg_value(i32 %395, !594, !DIExpression(), !1614)
    #dbg_value(i32 %395, !595, !DIExpression(), !1614)
  %396 = add i32 %395, %378, !dbg !1618
    #dbg_value(i32 %396, !589, !DIExpression(), !1611)
  br label %475, !dbg !1619

397:                                              ; preds = %332
    #dbg_value(i32 %378, !596, !DIExpression(), !1620)
    #dbg_value(i32 %388, !598, !DIExpression(), !1620)
  br i1 %390, label %400, label %398, !dbg !1621

398:                                              ; preds = %397
  %399 = urem i32 %378, %388, !dbg !1622
    #dbg_value(i32 %399, !599, !DIExpression(), !1620)
  br label %400

400:                                              ; preds = %398, %397
  %401 = phi i32 [ %399, %398 ], [ 0, %397 ], !dbg !1623
    #dbg_value(i32 %401, !599, !DIExpression(), !1620)
    #dbg_value(i32 %401, !600, !DIExpression(), !1620)
  %402 = add i32 %401, %368, !dbg !1624
    #dbg_value(i32 %402, !589, !DIExpression(), !1611)
  br label %475

403:                                              ; preds = %3
  %404 = load ptr, ptr %1, align 4, !dbg !1625, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1503)
    #dbg_value(ptr %404, !115, !DIExpression(), !1503)
    #dbg_value(i32 4, !116, !DIExpression(), !1503)
    #dbg_value(ptr undef, !117, !DIExpression(), !1503)
    #dbg_value(ptr %404, !119, !DIExpression(), !1503)
    #dbg_value(i32 0, !122, !DIExpression(), !1626)
  %405 = load i8, ptr %404, align 1, !dbg !1627, !tbaa !131
    #dbg_value(i8 %405, !1459, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1628)
    #dbg_value(i32 1, !122, !DIExpression(), !1626)
  %406 = getelementptr inbounds nuw i8, ptr %404, i32 1, !dbg !1627
  %407 = load i8, ptr %406, align 1, !dbg !1627, !tbaa !131
    #dbg_value(i8 %407, !1459, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1628)
    #dbg_value(i32 2, !122, !DIExpression(), !1626)
  %408 = getelementptr inbounds nuw i8, ptr %404, i32 2, !dbg !1627
  %409 = load i8, ptr %408, align 1, !dbg !1627, !tbaa !131
    #dbg_value(i8 %409, !1459, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1628)
    #dbg_value(i32 3, !122, !DIExpression(), !1626)
  %410 = getelementptr inbounds nuw i8, ptr %404, i32 3, !dbg !1627
  %411 = load i8, ptr %410, align 1, !dbg !1627, !tbaa !131
    #dbg_value(i8 %411, !1459, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1628)
    #dbg_value(i32 4, !122, !DIExpression(), !1626)
  %412 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1629
  %413 = load ptr, ptr %412, align 4, !dbg !1629, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1505)
    #dbg_value(ptr %413, !115, !DIExpression(), !1505)
    #dbg_value(i32 4, !116, !DIExpression(), !1505)
    #dbg_value(ptr undef, !117, !DIExpression(), !1505)
    #dbg_value(ptr %413, !119, !DIExpression(), !1505)
    #dbg_value(i32 0, !122, !DIExpression(), !1630)
  %414 = load i8, ptr %413, align 1, !dbg !1631, !tbaa !131
    #dbg_value(i8 %414, !1461, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1628)
    #dbg_value(i32 1, !122, !DIExpression(), !1630)
  %415 = getelementptr inbounds nuw i8, ptr %413, i32 1, !dbg !1631
  %416 = load i8, ptr %415, align 1, !dbg !1631, !tbaa !131
    #dbg_value(i8 %416, !1461, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1628)
    #dbg_value(i32 2, !122, !DIExpression(), !1630)
  %417 = getelementptr inbounds nuw i8, ptr %413, i32 2, !dbg !1631
  %418 = load i8, ptr %417, align 1, !dbg !1631, !tbaa !131
    #dbg_value(i8 %418, !1461, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1628)
    #dbg_value(i32 3, !122, !DIExpression(), !1630)
  %419 = getelementptr inbounds nuw i8, ptr %413, i32 3, !dbg !1631
  %420 = load i8, ptr %419, align 1, !dbg !1631, !tbaa !131
    #dbg_value(i8 %420, !1461, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1628)
    #dbg_value(i32 4, !122, !DIExpression(), !1630)
    #dbg_value(i32 poison, !122, !DIExpression(), !1632)
  %421 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1634
  %422 = load ptr, ptr %421, align 4, !dbg !1634, !tbaa !960
    #dbg_value(ptr undef, !110, !DIExpression(), !1507)
    #dbg_value(ptr %422, !115, !DIExpression(), !1507)
    #dbg_value(i32 4, !116, !DIExpression(), !1507)
    #dbg_value(ptr undef, !117, !DIExpression(), !1507)
    #dbg_value(ptr %422, !119, !DIExpression(), !1507)
    #dbg_value(i32 0, !122, !DIExpression(), !1635)
  %423 = load i8, ptr %422, align 1, !dbg !1636, !tbaa !131
    #dbg_value(i8 %423, !1463, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1628)
    #dbg_value(i32 1, !122, !DIExpression(), !1635)
  %424 = getelementptr inbounds nuw i8, ptr %422, i32 1, !dbg !1636
  %425 = load i8, ptr %424, align 1, !dbg !1636, !tbaa !131
    #dbg_value(i8 %425, !1463, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1628)
    #dbg_value(i32 2, !122, !DIExpression(), !1635)
  %426 = getelementptr inbounds nuw i8, ptr %422, i32 2, !dbg !1636
  %427 = load i8, ptr %426, align 1, !dbg !1636, !tbaa !131
    #dbg_value(i8 %427, !1463, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1628)
    #dbg_value(i32 3, !122, !DIExpression(), !1635)
  %428 = getelementptr inbounds nuw i8, ptr %422, i32 3, !dbg !1636
  %429 = load i8, ptr %428, align 1, !dbg !1636, !tbaa !131
    #dbg_value(i8 %429, !1463, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1628)
    #dbg_value(i32 4, !122, !DIExpression(), !1635)
  %430 = zext i8 %411 to i32, !dbg !1637
  %431 = shl nuw i32 %430, 24, !dbg !1637
  %432 = zext i8 %409 to i32, !dbg !1637
  %433 = shl nuw nsw i32 %432, 16, !dbg !1637
  %434 = or disjoint i32 %431, %433, !dbg !1637
  %435 = zext i8 %407 to i32, !dbg !1637
  %436 = shl nuw nsw i32 %435, 8, !dbg !1637
  %437 = or disjoint i32 %434, %436, !dbg !1637
  %438 = zext i8 %405 to i32, !dbg !1637
  %439 = or disjoint i32 %437, %438, !dbg !1637
  %440 = zext i8 %420 to i32, !dbg !1638
  %441 = shl nuw i32 %440, 24, !dbg !1638
  %442 = zext i8 %418 to i32, !dbg !1638
  %443 = shl nuw nsw i32 %442, 16, !dbg !1638
  %444 = or disjoint i32 %441, %443, !dbg !1638
  %445 = zext i8 %416 to i32, !dbg !1638
  %446 = shl nuw nsw i32 %445, 8, !dbg !1638
  %447 = or disjoint i32 %444, %446, !dbg !1638
  %448 = zext i8 %414 to i32, !dbg !1638
  %449 = or disjoint i32 %447, %448, !dbg !1638
  %450 = zext i8 %429 to i32, !dbg !1639
  %451 = shl nuw i32 %450, 24, !dbg !1639
  %452 = zext i8 %427 to i32, !dbg !1639
  %453 = shl nuw nsw i32 %452, 16, !dbg !1639
  %454 = or disjoint i32 %451, %453, !dbg !1639
  %455 = zext i8 %425 to i32, !dbg !1639
  %456 = shl nuw nsw i32 %455, 8, !dbg !1639
  %457 = or disjoint i32 %454, %456, !dbg !1639
  %458 = zext i8 %423 to i32, !dbg !1639
  %459 = or disjoint i32 %457, %458, !dbg !1639
    #dbg_value(i32 %439, !623, !DIExpression(), !1641)
    #dbg_value(i32 %449, !624, !DIExpression(), !1641)
    #dbg_value(i32 poison, !625, !DIExpression(), !1641)
    #dbg_value(i32 %459, !626, !DIExpression(), !1641)
    #dbg_value(i32 %439, !627, !DIExpression(), !1641)
  %460 = icmp ult i32 %439, %449, !dbg !1639
  %461 = icmp eq i32 %459, 0, !dbg !1642
  br i1 %460, label %462, label %468, !dbg !1643

462:                                              ; preds = %403
    #dbg_value(i32 %439, !629, !DIExpression(), !1644)
    #dbg_value(i32 %459, !632, !DIExpression(), !1644)
  br i1 %461, label %465, label %463, !dbg !1645

463:                                              ; preds = %462
  %464 = udiv i32 %439, %459, !dbg !1646
    #dbg_value(i32 %464, !633, !DIExpression(), !1644)
  br label %465

465:                                              ; preds = %463, %462
  %466 = phi i32 [ %464, %463 ], [ 0, %462 ], !dbg !1647
    #dbg_value(i32 %466, !633, !DIExpression(), !1644)
    #dbg_value(i32 %466, !634, !DIExpression(), !1644)
  %467 = add i32 %466, %449, !dbg !1648
    #dbg_value(i32 %467, !628, !DIExpression(), !1641)
  br label %475, !dbg !1649

468:                                              ; preds = %403
    #dbg_value(i32 %449, !635, !DIExpression(), !1650)
    #dbg_value(i32 %459, !637, !DIExpression(), !1650)
  br i1 %461, label %471, label %469, !dbg !1651

469:                                              ; preds = %468
  %470 = urem i32 %449, %459, !dbg !1652
    #dbg_value(i32 %470, !638, !DIExpression(), !1650)
  br label %471

471:                                              ; preds = %469, %468
  %472 = phi i32 [ %470, %469 ], [ 0, %468 ], !dbg !1653
    #dbg_value(i32 %472, !638, !DIExpression(), !1650)
    #dbg_value(i32 %472, !639, !DIExpression(), !1650)
  %473 = add i32 %472, %439, !dbg !1654
    #dbg_value(i32 %473, !628, !DIExpression(), !1641)
  br label %475

474:                                              ; preds = %3
  tail call void @llvm.trap(), !dbg !1655
  unreachable, !dbg !1657

475:                                              ; preds = %471, %465, %400, %394, %252, %172, %169, %85
  %476 = phi i32 [ %331, %252 ], [ %251, %172 ], [ %171, %169 ], [ %87, %85 ], [ %396, %394 ], [ %402, %400 ], [ %467, %465 ], [ %473, %471 ], !dbg !1509
  ret i32 %476, !dbg !1658
}

; Function Attrs: cold noreturn nounwind memory(inaccessiblemem: write) uwtable
define hidden noundef i64 @ink_compute_scalar64(i32 noundef %0, ptr nocapture noundef readnone %1, ptr nocapture noundef readnone %2) local_unnamed_addr #10 !dbg !1659 {
    #dbg_value(i32 %0, !1665, !DIExpression(), !1668)
    #dbg_value(ptr %1, !1666, !DIExpression(), !1668)
    #dbg_value(ptr %2, !1667, !DIExpression(), !1668)
  tail call void @llvm.trap(), !dbg !1669
  unreachable, !dbg !1672
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
!3 = !DIFile(filename: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_heldout_u32/prior/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
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
!15 = !DIFile(filename: "reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_right_padded_zip_heldout_u32/prior/cpu.c", directory: "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang")
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
!164 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_heldout_u32", scope: !15, file: !15, line: 85, type: !165, scopeLine: 85, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !172)
!165 = !DISubroutineType(types: !166)
!166 = !{!167, !167, !167, !10, !10}
!167 = !DIDerivedType(tag: DW_TAG_typedef, name: "ink_l_uint32", file: !15, line: 65, baseType: !168)
!168 = distinct !DICompositeType(tag: DW_TAG_structure_type, file: !15, line: 65, size: 64, elements: !169)
!169 = !{!170, !171}
!170 = !DIDerivedType(tag: DW_TAG_member, name: "data", scope: !168, file: !15, line: 65, baseType: !13, size: 32)
!171 = !DIDerivedType(tag: DW_TAG_member, name: "len", scope: !168, file: !15, line: 65, baseType: !5, size: 32, offset: 32)
!172 = !{!173, !174, !175, !176, !177, !178, !179, !181, !184, !185, !186, !187, !188, !189, !190, !191, !192, !193, !194, !195, !196, !197, !198, !199, !200, !201, !202, !204, !207, !208, !209, !210, !211, !212, !213, !214, !215, !216, !219, !221, !222, !223, !224, !225, !226, !227, !229, !232, !233, !234, !235, !236, !237, !238, !239, !240, !241, !244, !245, !246, !247, !249, !250, !251}
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
!199 = !DILocalVariable(name: "t19", scope: !164, file: !15, line: 134, type: !167)
!200 = !DILocalVariable(name: "t20", scope: !164, file: !15, line: 136, type: !167)
!201 = !DILocalVariable(name: "t21", scope: !164, file: !15, line: 138, type: !167)
!202 = !DILocalVariable(name: "t22", scope: !203, file: !15, line: 139, type: !5)
!203 = distinct !DILexicalBlock(scope: !164, file: !15, line: 139, column: 1)
!204 = !DILocalVariable(name: "t23", scope: !205, file: !15, line: 140, type: !10)
!205 = distinct !DILexicalBlock(scope: !206, file: !15, line: 139, column: 36)
!206 = distinct !DILexicalBlock(scope: !203, file: !15, line: 139, column: 1)
!207 = !DILocalVariable(name: "t24", scope: !205, file: !15, line: 142, type: !10)
!208 = !DILocalVariable(name: "t25", scope: !205, file: !15, line: 144, type: !10)
!209 = !DILocalVariable(name: "t26", scope: !205, file: !15, line: 146, type: !10)
!210 = !DILocalVariable(name: "t27", scope: !205, file: !15, line: 149, type: !10)
!211 = !DILocalVariable(name: "t28", scope: !205, file: !15, line: 151, type: !10)
!212 = !DILocalVariable(name: "t29", scope: !205, file: !15, line: 153, type: !10)
!213 = !DILocalVariable(name: "t30", scope: !205, file: !15, line: 155, type: !10)
!214 = !DILocalVariable(name: "t31", scope: !205, file: !15, line: 158, type: !10)
!215 = !DILocalVariable(name: "t32", scope: !205, file: !15, line: 160, type: !10)
!216 = !DILocalVariable(name: "t33", scope: !217, file: !15, line: 162, type: !10)
!217 = distinct !DILexicalBlock(scope: !218, file: !15, line: 161, column: 18)
!218 = distinct !DILexicalBlock(scope: !205, file: !15, line: 161, column: 5)
!219 = !DILocalVariable(name: "t34", scope: !220, file: !15, line: 166, type: !10)
!220 = distinct !DILexicalBlock(scope: !218, file: !15, line: 165, column: 8)
!221 = !DILocalVariable(name: "t35", scope: !164, file: !15, line: 172, type: !167)
!222 = !DILocalVariable(name: "t36", scope: !164, file: !15, line: 174, type: !167)
!223 = !DILocalVariable(name: "t37", scope: !164, file: !15, line: 177, type: !5)
!224 = !DILocalVariable(name: "t38", scope: !164, file: !15, line: 178, type: !167)
!225 = !DILocalVariable(name: "t39", scope: !164, file: !15, line: 181, type: !167)
!226 = !DILocalVariable(name: "t40", scope: !164, file: !15, line: 183, type: !167)
!227 = !DILocalVariable(name: "t41", scope: !228, file: !15, line: 184, type: !5)
!228 = distinct !DILexicalBlock(scope: !164, file: !15, line: 184, column: 1)
!229 = !DILocalVariable(name: "t42", scope: !230, file: !15, line: 185, type: !10)
!230 = distinct !DILexicalBlock(scope: !231, file: !15, line: 184, column: 68)
!231 = distinct !DILexicalBlock(scope: !228, file: !15, line: 184, column: 1)
!232 = !DILocalVariable(name: "t43", scope: !230, file: !15, line: 187, type: !10)
!233 = !DILocalVariable(name: "t44", scope: !230, file: !15, line: 189, type: !10)
!234 = !DILocalVariable(name: "t45", scope: !230, file: !15, line: 191, type: !10)
!235 = !DILocalVariable(name: "t46", scope: !230, file: !15, line: 194, type: !10)
!236 = !DILocalVariable(name: "t47", scope: !230, file: !15, line: 196, type: !10)
!237 = !DILocalVariable(name: "t48", scope: !230, file: !15, line: 198, type: !10)
!238 = !DILocalVariable(name: "t49", scope: !230, file: !15, line: 200, type: !10)
!239 = !DILocalVariable(name: "t50", scope: !230, file: !15, line: 203, type: !10)
!240 = !DILocalVariable(name: "t51", scope: !230, file: !15, line: 205, type: !10)
!241 = !DILocalVariable(name: "t52", scope: !242, file: !15, line: 207, type: !10)
!242 = distinct !DILexicalBlock(scope: !243, file: !15, line: 206, column: 18)
!243 = distinct !DILexicalBlock(scope: !230, file: !15, line: 206, column: 5)
!244 = !DILocalVariable(name: "t53", scope: !242, file: !15, line: 209, type: !10)
!245 = !DILocalVariable(name: "t54", scope: !242, file: !15, line: 211, type: !10)
!246 = !DILocalVariable(name: "t55", scope: !242, file: !15, line: 215, type: !10)
!247 = !DILocalVariable(name: "t56", scope: !248, file: !15, line: 219, type: !10)
!248 = distinct !DILexicalBlock(scope: !243, file: !15, line: 218, column: 8)
!249 = !DILocalVariable(name: "t57", scope: !248, file: !15, line: 221, type: !10)
!250 = !DILocalVariable(name: "t58", scope: !248, file: !15, line: 223, type: !10)
!251 = !DILocalVariable(name: "t59", scope: !248, file: !15, line: 227, type: !10)
!252 = !DILocation(line: 85, column: 75, scope: !164)
!253 = !DILocation(line: 85, column: 91, scope: !164)
!254 = !DILocation(line: 0, scope: !164)
!255 = !DILocation(line: 90, column: 17, scope: !164)
!256 = !{!257, !257, i64 0}
!257 = !{!"p1 int", !258, i64 0}
!258 = !{!"any pointer", !29, i64 0}
!259 = !DILocation(line: 0, scope: !51, inlinedAt: !260)
!260 = distinct !DILocation(line: 92, column: 18, scope: !164)
!261 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !260)
!262 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !260)
!263 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !264)
!264 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !260)
!265 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !264)
!266 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !260)
!267 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !260)
!268 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !260)
!269 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !260)
!270 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !260)
!271 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !260)
!272 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !260)
!273 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !260)
!274 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !275)
!275 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !260)
!276 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !275)
!277 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !260)
!278 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !260)
!279 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !260)
!280 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !260)
!281 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !260)
!282 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !260)
!283 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !260)
!284 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !260)
!285 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !260)
!286 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !260)
!287 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !288)
!288 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !260)
!289 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !288)
!290 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !260)
!291 = !DILocation(line: 0, scope: !180)
!292 = !DILocation(line: 93, column: 19, scope: !183)
!293 = !DILocation(line: 93, column: 1, scope: !180)
!294 = !DILocation(line: 0, scope: !51, inlinedAt: !295)
!295 = distinct !DILocation(line: 138, column: 19, scope: !164)
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
!323 = !DILocation(line: 0, scope: !203)
!324 = !DILocation(line: 139, column: 1, scope: !203)
!325 = !DILocation(line: 0, scope: !182)
!326 = !DILocation(line: 117, column: 8, scope: !327)
!327 = distinct !DILexicalBlock(scope: !182, file: !15, line: 117, column: 5)
!328 = !DILocation(line: 96, column: 13, scope: !182)
!329 = !{!330, !330, i64 0}
!330 = !{!"int", !29, i64 0}
!331 = !DILocation(line: 119, column: 18, scope: !332)
!332 = distinct !DILexicalBlock(scope: !327, file: !15, line: 119, column: 8)
!333 = !DILocation(line: 129, column: 18, scope: !334)
!334 = distinct !DILexicalBlock(scope: !335, file: !15, line: 129, column: 8)
!335 = distinct !DILexicalBlock(scope: !182, file: !15, line: 127, column: 5)
!336 = !DILocation(line: 130, column: 19, scope: !182)
!337 = !DILocation(line: 132, column: 18, scope: !182)
!338 = !DILocation(line: 132, column: 1, scope: !182)
!339 = !DILocation(line: 132, column: 12, scope: !182)
!340 = !DILocation(line: 93, column: 29, scope: !183)
!341 = distinct !{!341, !293, !342, !137}
!342 = !DILocation(line: 133, column: 1, scope: !180)
!343 = !DILocation(line: 0, scope: !205)
!344 = !DILocation(line: 142, column: 14, scope: !205)
!345 = !DILocation(line: 161, column: 10, scope: !218)
!346 = !DILocation(line: 161, column: 5, scope: !218)
!347 = !DILocation(line: 170, column: 1, scope: !205)
!348 = !DILocation(line: 170, column: 14, scope: !205)
!349 = !DILocation(line: 174, column: 18, scope: !164)
!350 = !DILocation(line: 176, column: 20, scope: !351)
!351 = distinct !DILexicalBlock(scope: !164, file: !15, line: 176, column: 4)
!352 = !DILocation(line: 176, column: 11, scope: !351)
!353 = !DILocation(line: 139, column: 33, scope: !206)
!354 = distinct !{!354, !324, !355, !137}
!355 = !DILocation(line: 171, column: 1, scope: !203)
!356 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !357)
!357 = distinct !DILocation(line: 176, column: 30, scope: !351)
!358 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !357)
!359 = !DILocation(line: 177, column: 19, scope: !164)
!360 = !DILocation(line: 0, scope: !51, inlinedAt: !361)
!361 = distinct !DILocation(line: 178, column: 19, scope: !164)
!362 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !361)
!363 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !361)
!364 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !365)
!365 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !361)
!366 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !365)
!367 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !361)
!368 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !361)
!369 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !361)
!370 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !361)
!371 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !361)
!372 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !361)
!373 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !361)
!374 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !361)
!375 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !376)
!376 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !361)
!377 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !376)
!378 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !361)
!379 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !361)
!380 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !361)
!381 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !361)
!382 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !361)
!383 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !361)
!384 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !361)
!385 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !361)
!386 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !361)
!387 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !361)
!388 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !389)
!389 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !361)
!390 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !389)
!391 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !361)
!392 = !DILocation(line: 179, column: 35, scope: !164)
!393 = !DILocation(line: 0, scope: !111, inlinedAt: !394)
!394 = distinct !DILocation(line: 179, column: 1, scope: !164)
!395 = !DILocation(line: 0, scope: !123, inlinedAt: !394)
!396 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !394)
!397 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !394)
!398 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !394)
!399 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !394)
!400 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !394)
!401 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !394)
!402 = distinct !{!402, !396, !403, !137}
!403 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !394)
!404 = !DILocation(line: 180, column: 18, scope: !164)
!405 = !DILocation(line: 180, column: 43, scope: !164)
!406 = !DILocation(line: 0, scope: !111, inlinedAt: !407)
!407 = distinct !DILocation(line: 180, column: 1, scope: !164)
!408 = !DILocation(line: 0, scope: !123, inlinedAt: !407)
!409 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !407)
!410 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !407)
!411 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !407)
!412 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !407)
!413 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !407)
!414 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !407)
!415 = distinct !{!415, !410, !416, !137}
!416 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !407)
!417 = !DILocation(line: 183, column: 14, scope: !164)
!418 = !DILocation(line: 183, column: 30, scope: !164)
!419 = !DILocation(line: 0, scope: !51, inlinedAt: !420)
!420 = distinct !DILocation(line: 183, column: 19, scope: !164)
!421 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !420)
!422 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !423)
!423 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !420)
!424 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !423)
!425 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !420)
!426 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !420)
!427 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !420)
!428 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !420)
!429 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !420)
!430 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !420)
!431 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !420)
!432 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !420)
!433 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !434)
!434 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !420)
!435 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !434)
!436 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !420)
!437 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !420)
!438 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !420)
!439 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !420)
!440 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !420)
!441 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !420)
!442 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !420)
!443 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !420)
!444 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !420)
!445 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !420)
!446 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !447)
!447 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !420)
!448 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !447)
!449 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !420)
!450 = !DILocation(line: 183, column: 18, scope: !164)
!451 = !{!452, !257, i64 0}
!452 = !{!"", !257, i64 0, !28, i64 4}
!453 = !{!452, !28, i64 4}
!454 = !DILocation(line: 0, scope: !228)
!455 = !DILocation(line: 184, column: 21, scope: !231)
!456 = !DILocation(line: 184, column: 1, scope: !228)
!457 = !DILocation(line: 234, column: 1, scope: !164)
!458 = !DILocation(line: 185, column: 14, scope: !230)
!459 = !DILocation(line: 0, scope: !230)
!460 = !DILocation(line: 187, column: 14, scope: !230)
!461 = !DILocation(line: 206, column: 10, scope: !243)
!462 = !DILocation(line: 206, column: 5, scope: !243)
!463 = !DILocation(line: 0, scope: !242)
!464 = !DILocation(line: 212, column: 8, scope: !465)
!465 = distinct !DILexicalBlock(scope: !242, file: !15, line: 212, column: 5)
!466 = !DILocation(line: 214, column: 18, scope: !467)
!467 = distinct !DILexicalBlock(scope: !465, file: !15, line: 214, column: 8)
!468 = !DILocation(line: 0, scope: !465)
!469 = !DILocation(line: 217, column: 10, scope: !242)
!470 = !DILocation(line: 218, column: 1, scope: !242)
!471 = !DILocation(line: 0, scope: !248)
!472 = !DILocation(line: 224, column: 8, scope: !473)
!473 = distinct !DILexicalBlock(scope: !248, file: !15, line: 224, column: 5)
!474 = !DILocation(line: 226, column: 18, scope: !475)
!475 = distinct !DILexicalBlock(scope: !473, file: !15, line: 226, column: 8)
!476 = !DILocation(line: 0, scope: !473)
!477 = !DILocation(line: 229, column: 10, scope: !248)
!478 = !DILocation(line: 0, scope: !243)
!479 = !DILocation(line: 231, column: 1, scope: !230)
!480 = !DILocation(line: 231, column: 14, scope: !230)
!481 = !DILocation(line: 184, column: 65, scope: !231)
!482 = distinct !{!482, !456, !483, !137}
!483 = !DILocation(line: 232, column: 1, scope: !228)
!484 = distinct !DISubprogram(name: "lang_fn_left_word", scope: !15, file: !15, line: 235, type: !485, scopeLine: 235, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !487)
!485 = !DISubroutineType(types: !486)
!486 = !{!10, !10, !10, !10, !10}
!487 = !{!488, !489, !490, !491, !492, !493, !494, !495, !496, !497, !498, !499, !500, !501, !502, !503}
!488 = !DILocalVariable(name: "a0", arg: 1, scope: !484, file: !15, line: 235, type: !10)
!489 = !DILocalVariable(name: "a1", arg: 2, scope: !484, file: !15, line: 235, type: !10)
!490 = !DILocalVariable(name: "a2", arg: 3, scope: !484, file: !15, line: 235, type: !10)
!491 = !DILocalVariable(name: "a3", arg: 4, scope: !484, file: !15, line: 235, type: !10)
!492 = !DILocalVariable(name: "t0", scope: !484, file: !15, line: 240, type: !10)
!493 = !DILocalVariable(name: "t1", scope: !484, file: !15, line: 242, type: !10)
!494 = !DILocalVariable(name: "t2", scope: !484, file: !15, line: 244, type: !10)
!495 = !DILocalVariable(name: "t3", scope: !484, file: !15, line: 246, type: !10)
!496 = !DILocalVariable(name: "t4", scope: !484, file: !15, line: 249, type: !10)
!497 = !DILocalVariable(name: "t5", scope: !484, file: !15, line: 251, type: !10)
!498 = !DILocalVariable(name: "t6", scope: !484, file: !15, line: 253, type: !10)
!499 = !DILocalVariable(name: "t7", scope: !484, file: !15, line: 257, type: !10)
!500 = !DILocalVariable(name: "t8", scope: !484, file: !15, line: 259, type: !10)
!501 = !DILocalVariable(name: "t9", scope: !484, file: !15, line: 261, type: !10)
!502 = !DILocalVariable(name: "t10", scope: !484, file: !15, line: 263, type: !10)
!503 = !DILocalVariable(name: "t11", scope: !484, file: !15, line: 267, type: !10)
!504 = !DILocation(line: 0, scope: !484)
!505 = !DILocation(line: 254, column: 7, scope: !506)
!506 = distinct !DILexicalBlock(scope: !484, file: !15, line: 254, column: 5)
!507 = !DILocation(line: 256, column: 16, scope: !508)
!508 = distinct !DILexicalBlock(scope: !506, file: !15, line: 256, column: 8)
!509 = !DILocation(line: 266, column: 17, scope: !510)
!510 = distinct !DILexicalBlock(scope: !511, file: !15, line: 266, column: 8)
!511 = distinct !DILexicalBlock(scope: !484, file: !15, line: 264, column: 5)
!512 = !DILocation(line: 267, column: 18, scope: !484)
!513 = !DILocation(line: 269, column: 13, scope: !484)
!514 = !DILocation(line: 269, column: 1, scope: !484)
!515 = distinct !DISubprogram(name: "lang_fn_left_signal", scope: !15, file: !15, line: 271, type: !485, scopeLine: 271, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !516)
!516 = !{!517, !518, !519, !520, !521, !522, !523, !524, !525, !526, !527, !528}
!517 = !DILocalVariable(name: "a0", arg: 1, scope: !515, file: !15, line: 271, type: !10)
!518 = !DILocalVariable(name: "a1", arg: 2, scope: !515, file: !15, line: 271, type: !10)
!519 = !DILocalVariable(name: "a2", arg: 3, scope: !515, file: !15, line: 271, type: !10)
!520 = !DILocalVariable(name: "a3", arg: 4, scope: !515, file: !15, line: 271, type: !10)
!521 = !DILocalVariable(name: "t0", scope: !515, file: !15, line: 276, type: !10)
!522 = !DILocalVariable(name: "t1", scope: !515, file: !15, line: 278, type: !10)
!523 = !DILocalVariable(name: "t2", scope: !515, file: !15, line: 280, type: !10)
!524 = !DILocalVariable(name: "t3", scope: !515, file: !15, line: 284, type: !10)
!525 = !DILocalVariable(name: "t4", scope: !515, file: !15, line: 286, type: !10)
!526 = !DILocalVariable(name: "t5", scope: !515, file: !15, line: 288, type: !10)
!527 = !DILocalVariable(name: "t6", scope: !515, file: !15, line: 290, type: !10)
!528 = !DILocalVariable(name: "t7", scope: !515, file: !15, line: 294, type: !10)
!529 = !DILocation(line: 0, scope: !515)
!530 = !DILocation(line: 281, column: 7, scope: !531)
!531 = distinct !DILexicalBlock(scope: !515, file: !15, line: 281, column: 5)
!532 = !DILocation(line: 283, column: 16, scope: !533)
!533 = distinct !DILexicalBlock(scope: !531, file: !15, line: 283, column: 8)
!534 = !DILocation(line: 293, column: 16, scope: !535)
!535 = distinct !DILexicalBlock(scope: !536, file: !15, line: 293, column: 8)
!536 = distinct !DILexicalBlock(scope: !515, file: !15, line: 291, column: 5)
!537 = !DILocation(line: 294, column: 17, scope: !515)
!538 = !DILocation(line: 296, column: 12, scope: !515)
!539 = !DILocation(line: 296, column: 1, scope: !515)
!540 = distinct !DISubprogram(name: "lang_fn_right_word", scope: !15, file: !15, line: 298, type: !485, scopeLine: 298, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !541)
!541 = !{!542, !543, !544, !545, !546, !547, !548, !549, !550, !551, !552, !555}
!542 = !DILocalVariable(name: "a0", arg: 1, scope: !540, file: !15, line: 298, type: !10)
!543 = !DILocalVariable(name: "a1", arg: 2, scope: !540, file: !15, line: 298, type: !10)
!544 = !DILocalVariable(name: "a2", arg: 3, scope: !540, file: !15, line: 298, type: !10)
!545 = !DILocalVariable(name: "a3", arg: 4, scope: !540, file: !15, line: 298, type: !10)
!546 = !DILocalVariable(name: "t0", scope: !540, file: !15, line: 303, type: !10)
!547 = !DILocalVariable(name: "t1", scope: !540, file: !15, line: 305, type: !10)
!548 = !DILocalVariable(name: "t2", scope: !540, file: !15, line: 307, type: !10)
!549 = !DILocalVariable(name: "t3", scope: !540, file: !15, line: 309, type: !10)
!550 = !DILocalVariable(name: "t4", scope: !540, file: !15, line: 312, type: !10)
!551 = !DILocalVariable(name: "t5", scope: !540, file: !15, line: 314, type: !10)
!552 = !DILocalVariable(name: "t6", scope: !553, file: !15, line: 316, type: !10)
!553 = distinct !DILexicalBlock(scope: !554, file: !15, line: 315, column: 16)
!554 = distinct !DILexicalBlock(scope: !540, file: !15, line: 315, column: 5)
!555 = !DILocalVariable(name: "t7", scope: !556, file: !15, line: 320, type: !10)
!556 = distinct !DILexicalBlock(scope: !554, file: !15, line: 319, column: 8)
!557 = !DILocation(line: 0, scope: !540)
!558 = !DILocation(line: 315, column: 9, scope: !554)
!559 = !DILocation(line: 315, column: 5, scope: !554)
!560 = !DILocation(line: 324, column: 1, scope: !540)
!561 = distinct !DISubprogram(name: "lang_fn_right_signal", scope: !15, file: !15, line: 326, type: !485, scopeLine: 326, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !562)
!562 = !{!563, !564, !565, !566, !567, !568, !569, !572}
!563 = !DILocalVariable(name: "a0", arg: 1, scope: !561, file: !15, line: 326, type: !10)
!564 = !DILocalVariable(name: "a1", arg: 2, scope: !561, file: !15, line: 326, type: !10)
!565 = !DILocalVariable(name: "a2", arg: 3, scope: !561, file: !15, line: 326, type: !10)
!566 = !DILocalVariable(name: "a3", arg: 4, scope: !561, file: !15, line: 326, type: !10)
!567 = !DILocalVariable(name: "t0", scope: !561, file: !15, line: 331, type: !10)
!568 = !DILocalVariable(name: "t1", scope: !561, file: !15, line: 333, type: !10)
!569 = !DILocalVariable(name: "t2", scope: !570, file: !15, line: 335, type: !10)
!570 = distinct !DILexicalBlock(scope: !571, file: !15, line: 334, column: 16)
!571 = distinct !DILexicalBlock(scope: !561, file: !15, line: 334, column: 5)
!572 = !DILocalVariable(name: "t3", scope: !573, file: !15, line: 339, type: !10)
!573 = distinct !DILexicalBlock(scope: !571, file: !15, line: 338, column: 8)
!574 = !DILocation(line: 0, scope: !561)
!575 = !DILocation(line: 334, column: 9, scope: !571)
!576 = !DILocation(line: 334, column: 5, scope: !571)
!577 = !DILocation(line: 343, column: 1, scope: !561)
!578 = distinct !DISubprogram(name: "lang_fn_pair_word", scope: !15, file: !15, line: 345, type: !485, scopeLine: 345, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !579)
!579 = !{!580, !581, !582, !583, !584, !585, !586, !587, !588, !589, !590, !593, !594, !595, !596, !598, !599, !600}
!580 = !DILocalVariable(name: "a0", arg: 1, scope: !578, file: !15, line: 345, type: !10)
!581 = !DILocalVariable(name: "a1", arg: 2, scope: !578, file: !15, line: 345, type: !10)
!582 = !DILocalVariable(name: "a2", arg: 3, scope: !578, file: !15, line: 345, type: !10)
!583 = !DILocalVariable(name: "a3", arg: 4, scope: !578, file: !15, line: 345, type: !10)
!584 = !DILocalVariable(name: "t0", scope: !578, file: !15, line: 350, type: !10)
!585 = !DILocalVariable(name: "t1", scope: !578, file: !15, line: 352, type: !10)
!586 = !DILocalVariable(name: "t2", scope: !578, file: !15, line: 354, type: !10)
!587 = !DILocalVariable(name: "t3", scope: !578, file: !15, line: 356, type: !10)
!588 = !DILocalVariable(name: "t4", scope: !578, file: !15, line: 359, type: !10)
!589 = !DILocalVariable(name: "t5", scope: !578, file: !15, line: 361, type: !10)
!590 = !DILocalVariable(name: "t6", scope: !591, file: !15, line: 363, type: !10)
!591 = distinct !DILexicalBlock(scope: !592, file: !15, line: 362, column: 16)
!592 = distinct !DILexicalBlock(scope: !578, file: !15, line: 362, column: 5)
!593 = !DILocalVariable(name: "t7", scope: !591, file: !15, line: 365, type: !10)
!594 = !DILocalVariable(name: "t8", scope: !591, file: !15, line: 367, type: !10)
!595 = !DILocalVariable(name: "t9", scope: !591, file: !15, line: 371, type: !10)
!596 = !DILocalVariable(name: "t10", scope: !597, file: !15, line: 375, type: !10)
!597 = distinct !DILexicalBlock(scope: !592, file: !15, line: 374, column: 8)
!598 = !DILocalVariable(name: "t11", scope: !597, file: !15, line: 377, type: !10)
!599 = !DILocalVariable(name: "t12", scope: !597, file: !15, line: 379, type: !10)
!600 = !DILocalVariable(name: "t13", scope: !597, file: !15, line: 383, type: !10)
!601 = !DILocation(line: 0, scope: !578)
!602 = !DILocation(line: 362, column: 9, scope: !592)
!603 = !DILocation(line: 0, scope: !592)
!604 = !DILocation(line: 362, column: 5, scope: !592)
!605 = !DILocation(line: 0, scope: !591)
!606 = !DILocation(line: 368, column: 7, scope: !607)
!607 = distinct !DILexicalBlock(scope: !591, file: !15, line: 368, column: 5)
!608 = !DILocation(line: 370, column: 16, scope: !609)
!609 = distinct !DILexicalBlock(scope: !607, file: !15, line: 370, column: 8)
!610 = !DILocation(line: 0, scope: !607)
!611 = !DILocation(line: 373, column: 8, scope: !591)
!612 = !DILocation(line: 374, column: 1, scope: !591)
!613 = !DILocation(line: 0, scope: !597)
!614 = !DILocation(line: 380, column: 8, scope: !615)
!615 = distinct !DILexicalBlock(scope: !597, file: !15, line: 380, column: 5)
!616 = !DILocation(line: 382, column: 18, scope: !617)
!617 = distinct !DILexicalBlock(scope: !615, file: !15, line: 382, column: 8)
!618 = !DILocation(line: 0, scope: !615)
!619 = !DILocation(line: 385, column: 9, scope: !597)
!620 = !DILocation(line: 387, column: 1, scope: !578)
!621 = distinct !DISubprogram(name: "lang_fn_pair_signal", scope: !15, file: !15, line: 389, type: !485, scopeLine: 389, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !622)
!622 = !{!623, !624, !625, !626, !627, !628, !629, !632, !633, !634, !635, !637, !638, !639}
!623 = !DILocalVariable(name: "a0", arg: 1, scope: !621, file: !15, line: 389, type: !10)
!624 = !DILocalVariable(name: "a1", arg: 2, scope: !621, file: !15, line: 389, type: !10)
!625 = !DILocalVariable(name: "a2", arg: 3, scope: !621, file: !15, line: 389, type: !10)
!626 = !DILocalVariable(name: "a3", arg: 4, scope: !621, file: !15, line: 389, type: !10)
!627 = !DILocalVariable(name: "t0", scope: !621, file: !15, line: 394, type: !10)
!628 = !DILocalVariable(name: "t1", scope: !621, file: !15, line: 396, type: !10)
!629 = !DILocalVariable(name: "t2", scope: !630, file: !15, line: 398, type: !10)
!630 = distinct !DILexicalBlock(scope: !631, file: !15, line: 397, column: 16)
!631 = distinct !DILexicalBlock(scope: !621, file: !15, line: 397, column: 5)
!632 = !DILocalVariable(name: "t3", scope: !630, file: !15, line: 400, type: !10)
!633 = !DILocalVariable(name: "t4", scope: !630, file: !15, line: 402, type: !10)
!634 = !DILocalVariable(name: "t5", scope: !630, file: !15, line: 406, type: !10)
!635 = !DILocalVariable(name: "t6", scope: !636, file: !15, line: 410, type: !10)
!636 = distinct !DILexicalBlock(scope: !631, file: !15, line: 409, column: 8)
!637 = !DILocalVariable(name: "t7", scope: !636, file: !15, line: 412, type: !10)
!638 = !DILocalVariable(name: "t8", scope: !636, file: !15, line: 414, type: !10)
!639 = !DILocalVariable(name: "t9", scope: !636, file: !15, line: 418, type: !10)
!640 = !DILocation(line: 0, scope: !621)
!641 = !DILocation(line: 397, column: 9, scope: !631)
!642 = !DILocation(line: 0, scope: !631)
!643 = !DILocation(line: 397, column: 5, scope: !631)
!644 = !DILocation(line: 0, scope: !630)
!645 = !DILocation(line: 403, column: 7, scope: !646)
!646 = distinct !DILexicalBlock(scope: !630, file: !15, line: 403, column: 5)
!647 = !DILocation(line: 405, column: 16, scope: !648)
!648 = distinct !DILexicalBlock(scope: !646, file: !15, line: 405, column: 8)
!649 = !DILocation(line: 0, scope: !646)
!650 = !DILocation(line: 408, column: 8, scope: !630)
!651 = !DILocation(line: 409, column: 1, scope: !630)
!652 = !DILocation(line: 0, scope: !636)
!653 = !DILocation(line: 415, column: 7, scope: !654)
!654 = distinct !DILexicalBlock(scope: !636, file: !15, line: 415, column: 5)
!655 = !DILocation(line: 417, column: 16, scope: !656)
!656 = distinct !DILexicalBlock(scope: !654, file: !15, line: 417, column: 8)
!657 = !DILocation(line: 0, scope: !654)
!658 = !DILocation(line: 420, column: 8, scope: !636)
!659 = !DILocation(line: 422, column: 1, scope: !621)
!660 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_heldout_u32_into", scope: !15, file: !15, line: 424, type: !661, scopeLine: 424, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !663)
!661 = !DISubroutineType(types: !662)
!662 = !{!5, !167, !167, !10, !10, !13}
!663 = !{!664, !665, !666, !667, !668, !669, !670, !671, !673, !676, !677, !678, !679, !680, !681, !682, !683, !684, !685, !686, !687, !688, !689, !690, !691, !692, !693, !694, !696, !699, !700, !701, !702, !703, !704, !705, !706, !707, !708, !711, !713, !714, !715, !716, !717, !718, !719, !721, !724, !725, !726, !727, !728, !729, !730, !731, !732, !733, !736, !737, !738, !739, !741, !742, !743}
!664 = !DILocalVariable(name: "a0", arg: 1, scope: !660, file: !15, line: 424, type: !167)
!665 = !DILocalVariable(name: "a1", arg: 2, scope: !660, file: !15, line: 424, type: !167)
!666 = !DILocalVariable(name: "a2", arg: 3, scope: !660, file: !15, line: 424, type: !10)
!667 = !DILocalVariable(name: "a3", arg: 4, scope: !660, file: !15, line: 424, type: !10)
!668 = !DILocalVariable(name: "destination", arg: 5, scope: !660, file: !15, line: 424, type: !13)
!669 = !DILocalVariable(name: "t0", scope: !660, file: !15, line: 429, type: !167)
!670 = !DILocalVariable(name: "t1", scope: !660, file: !15, line: 431, type: !167)
!671 = !DILocalVariable(name: "t2", scope: !672, file: !15, line: 432, type: !5)
!672 = distinct !DILexicalBlock(scope: !660, file: !15, line: 432, column: 1)
!673 = !DILocalVariable(name: "t3", scope: !674, file: !15, line: 433, type: !10)
!674 = distinct !DILexicalBlock(scope: !675, file: !15, line: 432, column: 32)
!675 = distinct !DILexicalBlock(scope: !672, file: !15, line: 432, column: 1)
!676 = !DILocalVariable(name: "t4", scope: !674, file: !15, line: 435, type: !10)
!677 = !DILocalVariable(name: "t5", scope: !674, file: !15, line: 437, type: !10)
!678 = !DILocalVariable(name: "t6", scope: !674, file: !15, line: 439, type: !10)
!679 = !DILocalVariable(name: "t7", scope: !674, file: !15, line: 442, type: !10)
!680 = !DILocalVariable(name: "t8", scope: !674, file: !15, line: 444, type: !10)
!681 = !DILocalVariable(name: "t9", scope: !674, file: !15, line: 446, type: !10)
!682 = !DILocalVariable(name: "t10", scope: !674, file: !15, line: 448, type: !10)
!683 = !DILocalVariable(name: "t11", scope: !674, file: !15, line: 451, type: !10)
!684 = !DILocalVariable(name: "t12", scope: !674, file: !15, line: 453, type: !10)
!685 = !DILocalVariable(name: "t13", scope: !674, file: !15, line: 455, type: !10)
!686 = !DILocalVariable(name: "t14", scope: !674, file: !15, line: 459, type: !10)
!687 = !DILocalVariable(name: "t15", scope: !674, file: !15, line: 461, type: !10)
!688 = !DILocalVariable(name: "t16", scope: !674, file: !15, line: 463, type: !10)
!689 = !DILocalVariable(name: "t17", scope: !674, file: !15, line: 465, type: !10)
!690 = !DILocalVariable(name: "t18", scope: !674, file: !15, line: 469, type: !10)
!691 = !DILocalVariable(name: "t19", scope: !660, file: !15, line: 473, type: !167)
!692 = !DILocalVariable(name: "t20", scope: !660, file: !15, line: 475, type: !167)
!693 = !DILocalVariable(name: "t21", scope: !660, file: !15, line: 477, type: !167)
!694 = !DILocalVariable(name: "t22", scope: !695, file: !15, line: 478, type: !5)
!695 = distinct !DILexicalBlock(scope: !660, file: !15, line: 478, column: 1)
!696 = !DILocalVariable(name: "t23", scope: !697, file: !15, line: 479, type: !10)
!697 = distinct !DILexicalBlock(scope: !698, file: !15, line: 478, column: 36)
!698 = distinct !DILexicalBlock(scope: !695, file: !15, line: 478, column: 1)
!699 = !DILocalVariable(name: "t24", scope: !697, file: !15, line: 481, type: !10)
!700 = !DILocalVariable(name: "t25", scope: !697, file: !15, line: 483, type: !10)
!701 = !DILocalVariable(name: "t26", scope: !697, file: !15, line: 485, type: !10)
!702 = !DILocalVariable(name: "t27", scope: !697, file: !15, line: 488, type: !10)
!703 = !DILocalVariable(name: "t28", scope: !697, file: !15, line: 490, type: !10)
!704 = !DILocalVariable(name: "t29", scope: !697, file: !15, line: 492, type: !10)
!705 = !DILocalVariable(name: "t30", scope: !697, file: !15, line: 494, type: !10)
!706 = !DILocalVariable(name: "t31", scope: !697, file: !15, line: 497, type: !10)
!707 = !DILocalVariable(name: "t32", scope: !697, file: !15, line: 499, type: !10)
!708 = !DILocalVariable(name: "t33", scope: !709, file: !15, line: 501, type: !10)
!709 = distinct !DILexicalBlock(scope: !710, file: !15, line: 500, column: 18)
!710 = distinct !DILexicalBlock(scope: !697, file: !15, line: 500, column: 5)
!711 = !DILocalVariable(name: "t34", scope: !712, file: !15, line: 505, type: !10)
!712 = distinct !DILexicalBlock(scope: !710, file: !15, line: 504, column: 8)
!713 = !DILocalVariable(name: "t35", scope: !660, file: !15, line: 511, type: !167)
!714 = !DILocalVariable(name: "t36", scope: !660, file: !15, line: 513, type: !167)
!715 = !DILocalVariable(name: "t37", scope: !660, file: !15, line: 516, type: !5)
!716 = !DILocalVariable(name: "t38", scope: !660, file: !15, line: 517, type: !167)
!717 = !DILocalVariable(name: "t39", scope: !660, file: !15, line: 520, type: !167)
!718 = !DILocalVariable(name: "t40", scope: !660, file: !15, line: 522, type: !167)
!719 = !DILocalVariable(name: "t41", scope: !720, file: !15, line: 523, type: !5)
!720 = distinct !DILexicalBlock(scope: !660, file: !15, line: 523, column: 1)
!721 = !DILocalVariable(name: "t42", scope: !722, file: !15, line: 524, type: !10)
!722 = distinct !DILexicalBlock(scope: !723, file: !15, line: 523, column: 68)
!723 = distinct !DILexicalBlock(scope: !720, file: !15, line: 523, column: 1)
!724 = !DILocalVariable(name: "t43", scope: !722, file: !15, line: 526, type: !10)
!725 = !DILocalVariable(name: "t44", scope: !722, file: !15, line: 528, type: !10)
!726 = !DILocalVariable(name: "t45", scope: !722, file: !15, line: 530, type: !10)
!727 = !DILocalVariable(name: "t46", scope: !722, file: !15, line: 533, type: !10)
!728 = !DILocalVariable(name: "t47", scope: !722, file: !15, line: 535, type: !10)
!729 = !DILocalVariable(name: "t48", scope: !722, file: !15, line: 537, type: !10)
!730 = !DILocalVariable(name: "t49", scope: !722, file: !15, line: 539, type: !10)
!731 = !DILocalVariable(name: "t50", scope: !722, file: !15, line: 542, type: !10)
!732 = !DILocalVariable(name: "t51", scope: !722, file: !15, line: 544, type: !10)
!733 = !DILocalVariable(name: "t52", scope: !734, file: !15, line: 546, type: !10)
!734 = distinct !DILexicalBlock(scope: !735, file: !15, line: 545, column: 18)
!735 = distinct !DILexicalBlock(scope: !722, file: !15, line: 545, column: 5)
!736 = !DILocalVariable(name: "t53", scope: !734, file: !15, line: 548, type: !10)
!737 = !DILocalVariable(name: "t54", scope: !734, file: !15, line: 550, type: !10)
!738 = !DILocalVariable(name: "t55", scope: !734, file: !15, line: 554, type: !10)
!739 = !DILocalVariable(name: "t56", scope: !740, file: !15, line: 558, type: !10)
!740 = distinct !DILexicalBlock(scope: !735, file: !15, line: 557, column: 8)
!741 = !DILocalVariable(name: "t57", scope: !740, file: !15, line: 560, type: !10)
!742 = !DILocalVariable(name: "t58", scope: !740, file: !15, line: 562, type: !10)
!743 = !DILocalVariable(name: "t59", scope: !740, file: !15, line: 566, type: !10)
!744 = !DILocation(line: 424, column: 74, scope: !660)
!745 = !DILocation(line: 424, column: 90, scope: !660)
!746 = !DILocation(line: 0, scope: !660)
!747 = !DILocation(line: 429, column: 17, scope: !660)
!748 = !DILocation(line: 0, scope: !51, inlinedAt: !749)
!749 = distinct !DILocation(line: 431, column: 18, scope: !660)
!750 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !749)
!751 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !749)
!752 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !753)
!753 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !749)
!754 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !753)
!755 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !749)
!756 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !749)
!757 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !749)
!758 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !749)
!759 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !749)
!760 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !749)
!761 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !749)
!762 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !749)
!763 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !764)
!764 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !749)
!765 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !764)
!766 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !749)
!767 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !749)
!768 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !749)
!769 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !749)
!770 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !749)
!771 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !749)
!772 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !749)
!773 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !749)
!774 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !749)
!775 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !749)
!776 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !777)
!777 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !749)
!778 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !777)
!779 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !749)
!780 = !DILocation(line: 0, scope: !672)
!781 = !DILocation(line: 432, column: 19, scope: !675)
!782 = !DILocation(line: 432, column: 1, scope: !672)
!783 = !DILocation(line: 0, scope: !51, inlinedAt: !784)
!784 = distinct !DILocation(line: 477, column: 19, scope: !660)
!785 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !784)
!786 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !787)
!787 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !784)
!788 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !787)
!789 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !784)
!790 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !784)
!791 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !784)
!792 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !784)
!793 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !784)
!794 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !784)
!795 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !796)
!796 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !784)
!797 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !796)
!798 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !784)
!799 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !784)
!800 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !784)
!801 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !784)
!802 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !784)
!803 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !784)
!804 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !784)
!805 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !784)
!806 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !784)
!807 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !784)
!808 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !809)
!809 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !784)
!810 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !809)
!811 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !784)
!812 = !DILocation(line: 0, scope: !695)
!813 = !DILocation(line: 478, column: 1, scope: !695)
!814 = !DILocation(line: 0, scope: !674)
!815 = !DILocation(line: 456, column: 8, scope: !816)
!816 = distinct !DILexicalBlock(scope: !674, file: !15, line: 456, column: 5)
!817 = !DILocation(line: 435, column: 13, scope: !674)
!818 = !DILocation(line: 458, column: 18, scope: !819)
!819 = distinct !DILexicalBlock(scope: !816, file: !15, line: 458, column: 8)
!820 = !DILocation(line: 468, column: 18, scope: !821)
!821 = distinct !DILexicalBlock(scope: !822, file: !15, line: 468, column: 8)
!822 = distinct !DILexicalBlock(scope: !674, file: !15, line: 466, column: 5)
!823 = !DILocation(line: 469, column: 19, scope: !674)
!824 = !DILocation(line: 471, column: 18, scope: !674)
!825 = !DILocation(line: 471, column: 1, scope: !674)
!826 = !DILocation(line: 471, column: 12, scope: !674)
!827 = !DILocation(line: 432, column: 29, scope: !675)
!828 = distinct !{!828, !782, !829, !137}
!829 = !DILocation(line: 472, column: 1, scope: !672)
!830 = !DILocation(line: 0, scope: !697)
!831 = !DILocation(line: 481, column: 14, scope: !697)
!832 = !DILocation(line: 500, column: 10, scope: !710)
!833 = !DILocation(line: 500, column: 5, scope: !710)
!834 = !DILocation(line: 509, column: 1, scope: !697)
!835 = !DILocation(line: 509, column: 14, scope: !697)
!836 = !DILocation(line: 513, column: 18, scope: !660)
!837 = !DILocation(line: 515, column: 20, scope: !838)
!838 = distinct !DILexicalBlock(scope: !660, file: !15, line: 515, column: 4)
!839 = !DILocation(line: 515, column: 11, scope: !838)
!840 = !DILocation(line: 478, column: 33, scope: !698)
!841 = distinct !{!841, !813, !842, !137}
!842 = !DILocation(line: 510, column: 1, scope: !695)
!843 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !844)
!844 = distinct !DILocation(line: 515, column: 30, scope: !838)
!845 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !844)
!846 = !DILocation(line: 516, column: 19, scope: !660)
!847 = !DILocation(line: 0, scope: !51, inlinedAt: !848)
!848 = distinct !DILocation(line: 517, column: 19, scope: !660)
!849 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !848)
!850 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !848)
!851 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !852)
!852 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !848)
!853 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !852)
!854 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !848)
!855 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !848)
!856 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !848)
!857 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !848)
!858 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !848)
!859 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !848)
!860 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !848)
!861 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !848)
!862 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !863)
!863 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !848)
!864 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !863)
!865 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !848)
!866 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !848)
!867 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !848)
!868 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !848)
!869 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !848)
!870 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !848)
!871 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !848)
!872 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !848)
!873 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !848)
!874 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !848)
!875 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !876)
!876 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !848)
!877 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !876)
!878 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !848)
!879 = !DILocation(line: 518, column: 35, scope: !660)
!880 = !DILocation(line: 0, scope: !111, inlinedAt: !881)
!881 = distinct !DILocation(line: 518, column: 1, scope: !660)
!882 = !DILocation(line: 0, scope: !123, inlinedAt: !881)
!883 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !881)
!884 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !881)
!885 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !881)
!886 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !881)
!887 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !881)
!888 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !881)
!889 = distinct !{!889, !883, !890, !137}
!890 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !881)
!891 = !DILocation(line: 519, column: 18, scope: !660)
!892 = !DILocation(line: 519, column: 43, scope: !660)
!893 = !DILocation(line: 0, scope: !111, inlinedAt: !894)
!894 = distinct !DILocation(line: 519, column: 1, scope: !660)
!895 = !DILocation(line: 0, scope: !123, inlinedAt: !894)
!896 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !894)
!897 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !894)
!898 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !894)
!899 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !894)
!900 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !894)
!901 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !894)
!902 = distinct !{!902, !897, !903, !137}
!903 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !894)
!904 = !DILocation(line: 522, column: 32, scope: !660)
!905 = !DILocation(line: 0, scope: !720)
!906 = !DILocation(line: 523, column: 21, scope: !723)
!907 = !DILocation(line: 523, column: 1, scope: !720)
!908 = !DILocation(line: 572, column: 1, scope: !660)
!909 = !DILocation(line: 524, column: 14, scope: !722)
!910 = !DILocation(line: 0, scope: !722)
!911 = !DILocation(line: 526, column: 14, scope: !722)
!912 = !DILocation(line: 545, column: 10, scope: !735)
!913 = !DILocation(line: 545, column: 5, scope: !735)
!914 = !DILocation(line: 0, scope: !734)
!915 = !DILocation(line: 551, column: 8, scope: !916)
!916 = distinct !DILexicalBlock(scope: !734, file: !15, line: 551, column: 5)
!917 = !DILocation(line: 553, column: 18, scope: !918)
!918 = distinct !DILexicalBlock(scope: !916, file: !15, line: 553, column: 8)
!919 = !DILocation(line: 0, scope: !916)
!920 = !DILocation(line: 556, column: 10, scope: !734)
!921 = !DILocation(line: 557, column: 1, scope: !734)
!922 = !DILocation(line: 0, scope: !740)
!923 = !DILocation(line: 563, column: 8, scope: !924)
!924 = distinct !DILexicalBlock(scope: !740, file: !15, line: 563, column: 5)
!925 = !DILocation(line: 565, column: 18, scope: !926)
!926 = distinct !DILexicalBlock(scope: !924, file: !15, line: 565, column: 8)
!927 = !DILocation(line: 0, scope: !924)
!928 = !DILocation(line: 568, column: 10, scope: !740)
!929 = !DILocation(line: 0, scope: !735)
!930 = !DILocation(line: 570, column: 1, scope: !722)
!931 = !DILocation(line: 570, column: 14, scope: !722)
!932 = !DILocation(line: 523, column: 65, scope: !723)
!933 = distinct !{!933, !907, !934, !137}
!934 = !DILocation(line: 571, column: 1, scope: !720)
!935 = distinct !DISubprogram(name: "ink_compute_into", scope: !15, file: !15, line: 574, type: !936, scopeLine: 574, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !942)
!936 = !DISubroutineType(types: !937)
!937 = !{!5, !10, !938, !940, !8}
!938 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !939, size: 32)
!939 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !103)
!940 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !941, size: 32)
!941 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !5)
!942 = !{!943, !944, !945, !946, !947, !950, !951, !952}
!943 = !DILocalVariable(name: "function", arg: 1, scope: !935, file: !15, line: 574, type: !10)
!944 = !DILocalVariable(name: "data", arg: 2, scope: !935, file: !15, line: 574, type: !938)
!945 = !DILocalVariable(name: "lengths", arg: 3, scope: !935, file: !15, line: 574, type: !940)
!946 = !DILocalVariable(name: "destination", arg: 4, scope: !935, file: !15, line: 574, type: !8)
!947 = !DILocalVariable(name: "a0", scope: !948, file: !15, line: 575, type: !13)
!948 = distinct !DILexicalBlock(scope: !949, file: !15, line: 575, column: 8)
!949 = distinct !DILexicalBlock(scope: !935, file: !15, line: 574, column: 167)
!950 = !DILocalVariable(name: "a1", scope: !948, file: !15, line: 575, type: !13)
!951 = !DILocalVariable(name: "a2", scope: !948, file: !15, line: 575, type: !10)
!952 = !DILocalVariable(name: "a3", scope: !948, file: !15, line: 575, type: !10)
!953 = !DILocation(line: 0, scope: !111, inlinedAt: !954)
!954 = distinct !DILocation(line: 575, column: 87, scope: !948)
!955 = !DILocation(line: 0, scope: !111, inlinedAt: !956)
!956 = distinct !DILocation(line: 575, column: 132, scope: !948)
!957 = !DILocation(line: 0, scope: !935)
!958 = !DILocation(line: 574, column: 151, scope: !935)
!959 = !DILocation(line: 575, column: 34, scope: !948)
!960 = !{!258, !258, i64 0}
!961 = !DILocation(line: 0, scope: !948)
!962 = !DILocation(line: 575, column: 67, scope: !948)
!963 = !DILocation(line: 575, column: 100, scope: !948)
!964 = !DILocation(line: 0, scope: !123, inlinedAt: !954)
!965 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !954)
!966 = !DILocation(line: 575, column: 145, scope: !948)
!967 = !DILocation(line: 0, scope: !123, inlinedAt: !956)
!968 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !956)
!969 = !DILocation(line: 575, column: 239, scope: !948)
!970 = !DILocation(line: 575, column: 243, scope: !948)
!971 = !DILocation(line: 575, column: 269, scope: !948)
!972 = !DILocation(line: 575, column: 273, scope: !948)
!973 = !DILocation(line: 575, column: 288, scope: !948)
!974 = !DILocation(line: 575, column: 172, scope: !948)
!975 = !DILocation(line: 576, column: 30, scope: !935)
!976 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !977)
!977 = distinct !DILocation(line: 576, column: 9, scope: !949)
!978 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !977)
!979 = distinct !DISubprogram(name: "ink_compute_call", scope: !15, file: !15, line: 577, type: !980, scopeLine: 577, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !984)
!980 = !DISubroutineType(types: !981)
!981 = !{null, !10, !938, !940, !982, !983}
!982 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !8, size: 32)
!983 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !5, size: 32)
!984 = !{!985, !986, !987, !988, !989, !990, !993, !994, !995, !996, !997, !999, !1000, !1001, !1002, !1003, !1004, !1006, !1007, !1008, !1009, !1010, !1011, !1013, !1014, !1015, !1016, !1017, !1018, !1020, !1021, !1022, !1023, !1024, !1025, !1027, !1028, !1029, !1030, !1031, !1032, !1034, !1035, !1036, !1037, !1038}
!985 = !DILocalVariable(name: "function", arg: 1, scope: !979, file: !15, line: 577, type: !10)
!986 = !DILocalVariable(name: "data", arg: 2, scope: !979, file: !15, line: 577, type: !938)
!987 = !DILocalVariable(name: "lengths", arg: 3, scope: !979, file: !15, line: 577, type: !940)
!988 = !DILocalVariable(name: "output", arg: 4, scope: !979, file: !15, line: 577, type: !982)
!989 = !DILocalVariable(name: "count", arg: 5, scope: !979, file: !15, line: 577, type: !983)
!990 = !DILocalVariable(name: "a0", scope: !991, file: !15, line: 578, type: !13)
!991 = distinct !DILexicalBlock(scope: !992, file: !15, line: 578, column: 8)
!992 = distinct !DILexicalBlock(scope: !979, file: !15, line: 577, column: 158)
!993 = !DILocalVariable(name: "a1", scope: !991, file: !15, line: 578, type: !13)
!994 = !DILocalVariable(name: "a2", scope: !991, file: !15, line: 578, type: !10)
!995 = !DILocalVariable(name: "a3", scope: !991, file: !15, line: 578, type: !10)
!996 = !DILocalVariable(name: "result", scope: !991, file: !15, line: 578, type: !167)
!997 = !DILocalVariable(name: "a0", scope: !998, file: !15, line: 579, type: !10)
!998 = distinct !DILexicalBlock(scope: !992, file: !15, line: 579, column: 8)
!999 = !DILocalVariable(name: "a1", scope: !998, file: !15, line: 579, type: !10)
!1000 = !DILocalVariable(name: "a2", scope: !998, file: !15, line: 579, type: !10)
!1001 = !DILocalVariable(name: "a3", scope: !998, file: !15, line: 579, type: !10)
!1002 = !DILocalVariable(name: "result", scope: !998, file: !15, line: 579, type: !10)
!1003 = !DILocalVariable(name: "copy", scope: !998, file: !15, line: 579, type: !13)
!1004 = !DILocalVariable(name: "a0", scope: !1005, file: !15, line: 580, type: !10)
!1005 = distinct !DILexicalBlock(scope: !992, file: !15, line: 580, column: 8)
!1006 = !DILocalVariable(name: "a1", scope: !1005, file: !15, line: 580, type: !10)
!1007 = !DILocalVariable(name: "a2", scope: !1005, file: !15, line: 580, type: !10)
!1008 = !DILocalVariable(name: "a3", scope: !1005, file: !15, line: 580, type: !10)
!1009 = !DILocalVariable(name: "result", scope: !1005, file: !15, line: 580, type: !10)
!1010 = !DILocalVariable(name: "copy", scope: !1005, file: !15, line: 580, type: !13)
!1011 = !DILocalVariable(name: "a0", scope: !1012, file: !15, line: 581, type: !10)
!1012 = distinct !DILexicalBlock(scope: !992, file: !15, line: 581, column: 8)
!1013 = !DILocalVariable(name: "a1", scope: !1012, file: !15, line: 581, type: !10)
!1014 = !DILocalVariable(name: "a2", scope: !1012, file: !15, line: 581, type: !10)
!1015 = !DILocalVariable(name: "a3", scope: !1012, file: !15, line: 581, type: !10)
!1016 = !DILocalVariable(name: "result", scope: !1012, file: !15, line: 581, type: !10)
!1017 = !DILocalVariable(name: "copy", scope: !1012, file: !15, line: 581, type: !13)
!1018 = !DILocalVariable(name: "a0", scope: !1019, file: !15, line: 582, type: !10)
!1019 = distinct !DILexicalBlock(scope: !992, file: !15, line: 582, column: 8)
!1020 = !DILocalVariable(name: "a1", scope: !1019, file: !15, line: 582, type: !10)
!1021 = !DILocalVariable(name: "a2", scope: !1019, file: !15, line: 582, type: !10)
!1022 = !DILocalVariable(name: "a3", scope: !1019, file: !15, line: 582, type: !10)
!1023 = !DILocalVariable(name: "result", scope: !1019, file: !15, line: 582, type: !10)
!1024 = !DILocalVariable(name: "copy", scope: !1019, file: !15, line: 582, type: !13)
!1025 = !DILocalVariable(name: "a0", scope: !1026, file: !15, line: 583, type: !10)
!1026 = distinct !DILexicalBlock(scope: !992, file: !15, line: 583, column: 8)
!1027 = !DILocalVariable(name: "a1", scope: !1026, file: !15, line: 583, type: !10)
!1028 = !DILocalVariable(name: "a2", scope: !1026, file: !15, line: 583, type: !10)
!1029 = !DILocalVariable(name: "a3", scope: !1026, file: !15, line: 583, type: !10)
!1030 = !DILocalVariable(name: "result", scope: !1026, file: !15, line: 583, type: !10)
!1031 = !DILocalVariable(name: "copy", scope: !1026, file: !15, line: 583, type: !13)
!1032 = !DILocalVariable(name: "a0", scope: !1033, file: !15, line: 584, type: !10)
!1033 = distinct !DILexicalBlock(scope: !992, file: !15, line: 584, column: 8)
!1034 = !DILocalVariable(name: "a1", scope: !1033, file: !15, line: 584, type: !10)
!1035 = !DILocalVariable(name: "a2", scope: !1033, file: !15, line: 584, type: !10)
!1036 = !DILocalVariable(name: "a3", scope: !1033, file: !15, line: 584, type: !10)
!1037 = !DILocalVariable(name: "result", scope: !1033, file: !15, line: 584, type: !10)
!1038 = !DILocalVariable(name: "copy", scope: !1033, file: !15, line: 584, type: !13)
!1039 = !DILocation(line: 0, scope: !111, inlinedAt: !1040)
!1040 = distinct !DILocation(line: 578, column: 87, scope: !991)
!1041 = !DILocation(line: 0, scope: !111, inlinedAt: !1042)
!1042 = distinct !DILocation(line: 578, column: 132, scope: !991)
!1043 = distinct !DIAssignID()
!1044 = !DILocation(line: 0, scope: !991)
!1045 = !DILocation(line: 0, scope: !111, inlinedAt: !1046)
!1046 = distinct !DILocation(line: 579, column: 21, scope: !998)
!1047 = !DILocation(line: 0, scope: !111, inlinedAt: !1048)
!1048 = distinct !DILocation(line: 579, column: 66, scope: !998)
!1049 = !DILocation(line: 0, scope: !111, inlinedAt: !1050)
!1050 = distinct !DILocation(line: 579, column: 111, scope: !998)
!1051 = !DILocation(line: 0, scope: !111, inlinedAt: !1052)
!1052 = distinct !DILocation(line: 579, column: 156, scope: !998)
!1053 = !DILocation(line: 0, scope: !111, inlinedAt: !1054)
!1054 = distinct !DILocation(line: 580, column: 21, scope: !1005)
!1055 = !DILocation(line: 0, scope: !111, inlinedAt: !1056)
!1056 = distinct !DILocation(line: 580, column: 66, scope: !1005)
!1057 = !DILocation(line: 0, scope: !111, inlinedAt: !1058)
!1058 = distinct !DILocation(line: 580, column: 111, scope: !1005)
!1059 = !DILocation(line: 0, scope: !111, inlinedAt: !1060)
!1060 = distinct !DILocation(line: 580, column: 156, scope: !1005)
!1061 = !DILocation(line: 0, scope: !111, inlinedAt: !1062)
!1062 = distinct !DILocation(line: 581, column: 21, scope: !1012)
!1063 = !DILocation(line: 0, scope: !111, inlinedAt: !1064)
!1064 = distinct !DILocation(line: 581, column: 66, scope: !1012)
!1065 = !DILocation(line: 0, scope: !111, inlinedAt: !1066)
!1066 = distinct !DILocation(line: 581, column: 111, scope: !1012)
!1067 = !DILocation(line: 0, scope: !111, inlinedAt: !1068)
!1068 = distinct !DILocation(line: 581, column: 156, scope: !1012)
!1069 = !DILocation(line: 0, scope: !111, inlinedAt: !1070)
!1070 = distinct !DILocation(line: 582, column: 21, scope: !1019)
!1071 = !DILocation(line: 0, scope: !111, inlinedAt: !1072)
!1072 = distinct !DILocation(line: 582, column: 66, scope: !1019)
!1073 = !DILocation(line: 0, scope: !111, inlinedAt: !1074)
!1074 = distinct !DILocation(line: 582, column: 111, scope: !1019)
!1075 = !DILocation(line: 0, scope: !111, inlinedAt: !1076)
!1076 = distinct !DILocation(line: 582, column: 156, scope: !1019)
!1077 = !DILocation(line: 0, scope: !111, inlinedAt: !1078)
!1078 = distinct !DILocation(line: 583, column: 21, scope: !1026)
!1079 = !DILocation(line: 0, scope: !111, inlinedAt: !1080)
!1080 = distinct !DILocation(line: 583, column: 66, scope: !1026)
!1081 = !DILocation(line: 0, scope: !111, inlinedAt: !1082)
!1082 = distinct !DILocation(line: 583, column: 156, scope: !1026)
!1083 = !DILocation(line: 0, scope: !111, inlinedAt: !1084)
!1084 = distinct !DILocation(line: 584, column: 21, scope: !1033)
!1085 = !DILocation(line: 0, scope: !111, inlinedAt: !1086)
!1086 = distinct !DILocation(line: 584, column: 66, scope: !1033)
!1087 = !DILocation(line: 0, scope: !111, inlinedAt: !1088)
!1088 = distinct !DILocation(line: 584, column: 156, scope: !1033)
!1089 = !DILocation(line: 0, scope: !979)
!1090 = !DILocation(line: 577, column: 142, scope: !979)
!1091 = !DILocation(line: 578, column: 34, scope: !991)
!1092 = !DILocation(line: 578, column: 67, scope: !991)
!1093 = !DILocation(line: 578, column: 100, scope: !991)
!1094 = !DILocation(line: 0, scope: !123, inlinedAt: !1040)
!1095 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1040)
!1096 = !DILocation(line: 578, column: 145, scope: !991)
!1097 = !DILocation(line: 0, scope: !123, inlinedAt: !1042)
!1098 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1042)
!1099 = !DILocation(line: 578, column: 165, scope: !991)
!1100 = !DILocation(line: 578, column: 247, scope: !991)
!1101 = !DILocation(line: 578, column: 251, scope: !991)
!1102 = !DILocation(line: 578, column: 277, scope: !991)
!1103 = !DILocation(line: 578, column: 281, scope: !991)
!1104 = !DILocation(line: 578, column: 296, scope: !991)
!1105 = !DILocation(line: 578, column: 185, scope: !991)
!1106 = !DILocation(line: 578, column: 315, scope: !991)
!1107 = !DILocation(line: 578, column: 307, scope: !991)
!1108 = !DILocation(line: 578, column: 334, scope: !991)
!1109 = !DILocation(line: 578, column: 326, scope: !991)
!1110 = !DILocation(line: 578, column: 346, scope: !992)
!1111 = !DILocation(line: 0, scope: !998)
!1112 = !DILocation(line: 0, scope: !123, inlinedAt: !1046)
!1113 = !DILocation(line: 0, scope: !123, inlinedAt: !1048)
!1114 = !DILocation(line: 579, column: 124, scope: !998)
!1115 = !DILocation(line: 0, scope: !123, inlinedAt: !1050)
!1116 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1050)
!1117 = !DILocation(line: 579, column: 169, scope: !998)
!1118 = !DILocation(line: 0, scope: !123, inlinedAt: !1052)
!1119 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1052)
!1120 = !DILocation(line: 579, column: 232, scope: !998)
!1121 = !DILocation(line: 254, column: 7, scope: !506, inlinedAt: !1122)
!1122 = distinct !DILocation(line: 579, column: 205, scope: !998)
!1123 = !DILocation(line: 0, scope: !484, inlinedAt: !1122)
!1124 = !DILocation(line: 579, column: 79, scope: !998)
!1125 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1048)
!1126 = !DILocation(line: 579, column: 34, scope: !998)
!1127 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1046)
!1128 = !DILocation(line: 579, column: 223, scope: !998)
!1129 = !DILocation(line: 256, column: 16, scope: !508, inlinedAt: !1122)
!1130 = !DILocation(line: 266, column: 17, scope: !510, inlinedAt: !1122)
!1131 = !DILocation(line: 267, column: 18, scope: !484, inlinedAt: !1122)
!1132 = !DILocation(line: 269, column: 13, scope: !484, inlinedAt: !1122)
!1133 = !DILocation(line: 0, scope: !51, inlinedAt: !1134)
!1134 = distinct !DILocation(line: 579, column: 251, scope: !998)
!1135 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1134)
!1136 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1137)
!1137 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1134)
!1138 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1137)
!1139 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1134)
!1140 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1134)
!1141 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1134)
!1142 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1134)
!1143 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1134)
!1144 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1134)
!1145 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1134)
!1146 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1134)
!1147 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1134)
!1148 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1134)
!1149 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1134)
!1150 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1134)
!1151 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1134)
!1152 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1134)
!1153 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1154)
!1154 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1134)
!1155 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1154)
!1156 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !1134)
!1157 = !DILocation(line: 579, column: 284, scope: !998)
!1158 = !DILocation(line: 579, column: 299, scope: !998)
!1159 = !DILocation(line: 579, column: 311, scope: !998)
!1160 = !DILocation(line: 0, scope: !1005)
!1161 = !DILocation(line: 0, scope: !123, inlinedAt: !1054)
!1162 = !DILocation(line: 0, scope: !123, inlinedAt: !1056)
!1163 = !DILocation(line: 580, column: 124, scope: !1005)
!1164 = !DILocation(line: 0, scope: !123, inlinedAt: !1058)
!1165 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1058)
!1166 = !DILocation(line: 580, column: 169, scope: !1005)
!1167 = !DILocation(line: 0, scope: !123, inlinedAt: !1060)
!1168 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1060)
!1169 = !DILocation(line: 580, column: 234, scope: !1005)
!1170 = !DILocation(line: 281, column: 7, scope: !531, inlinedAt: !1171)
!1171 = distinct !DILocation(line: 580, column: 205, scope: !1005)
!1172 = !DILocation(line: 0, scope: !515, inlinedAt: !1171)
!1173 = !DILocation(line: 580, column: 79, scope: !1005)
!1174 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1056)
!1175 = !DILocation(line: 580, column: 34, scope: !1005)
!1176 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1054)
!1177 = !DILocation(line: 580, column: 225, scope: !1005)
!1178 = !DILocation(line: 283, column: 16, scope: !533, inlinedAt: !1171)
!1179 = !DILocation(line: 293, column: 16, scope: !535, inlinedAt: !1171)
!1180 = !DILocation(line: 294, column: 17, scope: !515, inlinedAt: !1171)
!1181 = !DILocation(line: 296, column: 12, scope: !515, inlinedAt: !1171)
!1182 = !DILocation(line: 0, scope: !51, inlinedAt: !1183)
!1183 = distinct !DILocation(line: 580, column: 253, scope: !1005)
!1184 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1183)
!1185 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1186)
!1186 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1183)
!1187 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1186)
!1188 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1183)
!1189 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1183)
!1190 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1183)
!1191 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1183)
!1192 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1183)
!1193 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1183)
!1194 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1183)
!1195 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1183)
!1196 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1183)
!1197 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1183)
!1198 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1183)
!1199 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1183)
!1200 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1183)
!1201 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1183)
!1202 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1203)
!1203 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1183)
!1204 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1203)
!1205 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !1183)
!1206 = !DILocation(line: 580, column: 286, scope: !1005)
!1207 = !DILocation(line: 580, column: 301, scope: !1005)
!1208 = !DILocation(line: 580, column: 313, scope: !1005)
!1209 = !DILocation(line: 581, column: 34, scope: !1012)
!1210 = !DILocation(line: 0, scope: !123, inlinedAt: !1062)
!1211 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1062)
!1212 = !DILocation(line: 0, scope: !1012)
!1213 = !DILocation(line: 581, column: 79, scope: !1012)
!1214 = !DILocation(line: 0, scope: !123, inlinedAt: !1064)
!1215 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1064)
!1216 = !DILocation(line: 581, column: 124, scope: !1012)
!1217 = !DILocation(line: 0, scope: !123, inlinedAt: !1066)
!1218 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1066)
!1219 = !DILocation(line: 581, column: 169, scope: !1012)
!1220 = !DILocation(line: 0, scope: !123, inlinedAt: !1068)
!1221 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1068)
!1222 = !DILocation(line: 581, column: 227, scope: !1012)
!1223 = !DILocation(line: 581, column: 230, scope: !1012)
!1224 = !DILocation(line: 581, column: 233, scope: !1012)
!1225 = !DILocation(line: 315, column: 9, scope: !554, inlinedAt: !1226)
!1226 = distinct !DILocation(line: 581, column: 205, scope: !1012)
!1227 = !DILocation(line: 0, scope: !540, inlinedAt: !1226)
!1228 = !DILocation(line: 315, column: 5, scope: !554, inlinedAt: !1226)
!1229 = !DILocation(line: 0, scope: !51, inlinedAt: !1230)
!1230 = distinct !DILocation(line: 581, column: 252, scope: !1012)
!1231 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1230)
!1232 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1233)
!1233 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1230)
!1234 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1233)
!1235 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1230)
!1236 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1230)
!1237 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1230)
!1238 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1230)
!1239 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1230)
!1240 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1230)
!1241 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1230)
!1242 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1230)
!1243 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1230)
!1244 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1230)
!1245 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1230)
!1246 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1230)
!1247 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1230)
!1248 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1230)
!1249 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1250)
!1250 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1230)
!1251 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1250)
!1252 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !1230)
!1253 = !DILocation(line: 581, column: 285, scope: !1012)
!1254 = !DILocation(line: 581, column: 300, scope: !1012)
!1255 = !DILocation(line: 581, column: 312, scope: !1012)
!1256 = !DILocation(line: 582, column: 34, scope: !1019)
!1257 = !DILocation(line: 0, scope: !123, inlinedAt: !1070)
!1258 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1070)
!1259 = !DILocation(line: 0, scope: !1019)
!1260 = !DILocation(line: 582, column: 79, scope: !1019)
!1261 = !DILocation(line: 0, scope: !123, inlinedAt: !1072)
!1262 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1072)
!1263 = !DILocation(line: 582, column: 124, scope: !1019)
!1264 = !DILocation(line: 0, scope: !123, inlinedAt: !1074)
!1265 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1074)
!1266 = !DILocation(line: 582, column: 169, scope: !1019)
!1267 = !DILocation(line: 0, scope: !123, inlinedAt: !1076)
!1268 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1076)
!1269 = !DILocation(line: 582, column: 229, scope: !1019)
!1270 = !DILocation(line: 582, column: 232, scope: !1019)
!1271 = !DILocation(line: 582, column: 235, scope: !1019)
!1272 = !DILocation(line: 334, column: 9, scope: !571, inlinedAt: !1273)
!1273 = distinct !DILocation(line: 582, column: 205, scope: !1019)
!1274 = !DILocation(line: 0, scope: !561, inlinedAt: !1273)
!1275 = !DILocation(line: 334, column: 5, scope: !571, inlinedAt: !1273)
!1276 = !DILocation(line: 0, scope: !51, inlinedAt: !1277)
!1277 = distinct !DILocation(line: 582, column: 254, scope: !1019)
!1278 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1277)
!1279 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1280)
!1280 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1277)
!1281 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1280)
!1282 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1277)
!1283 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1277)
!1284 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1277)
!1285 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1277)
!1286 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1277)
!1287 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1277)
!1288 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1277)
!1289 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1277)
!1290 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1277)
!1291 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1277)
!1292 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1277)
!1293 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1277)
!1294 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1277)
!1295 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1277)
!1296 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1297)
!1297 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1277)
!1298 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1297)
!1299 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !1277)
!1300 = !DILocation(line: 582, column: 287, scope: !1019)
!1301 = !DILocation(line: 582, column: 302, scope: !1019)
!1302 = !DILocation(line: 582, column: 314, scope: !1019)
!1303 = !DILocation(line: 583, column: 34, scope: !1026)
!1304 = !DILocation(line: 0, scope: !123, inlinedAt: !1078)
!1305 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1078)
!1306 = !DILocation(line: 0, scope: !1026)
!1307 = !DILocation(line: 583, column: 79, scope: !1026)
!1308 = !DILocation(line: 0, scope: !123, inlinedAt: !1080)
!1309 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1080)
!1310 = !DILocation(line: 0, scope: !123, inlinedAt: !1311)
!1311 = distinct !DILocation(line: 583, column: 111, scope: !1026)
!1312 = !DILocation(line: 583, column: 169, scope: !1026)
!1313 = !DILocation(line: 0, scope: !123, inlinedAt: !1082)
!1314 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1082)
!1315 = !DILocation(line: 583, column: 226, scope: !1026)
!1316 = !DILocation(line: 583, column: 232, scope: !1026)
!1317 = !DILocation(line: 362, column: 9, scope: !592, inlinedAt: !1318)
!1318 = distinct !DILocation(line: 583, column: 205, scope: !1026)
!1319 = !DILocation(line: 0, scope: !578, inlinedAt: !1318)
!1320 = !DILocation(line: 0, scope: !592, inlinedAt: !1318)
!1321 = !DILocation(line: 362, column: 5, scope: !592, inlinedAt: !1318)
!1322 = !DILocation(line: 0, scope: !591, inlinedAt: !1318)
!1323 = !DILocation(line: 368, column: 7, scope: !607, inlinedAt: !1318)
!1324 = !DILocation(line: 370, column: 16, scope: !609, inlinedAt: !1318)
!1325 = !DILocation(line: 0, scope: !607, inlinedAt: !1318)
!1326 = !DILocation(line: 373, column: 8, scope: !591, inlinedAt: !1318)
!1327 = !DILocation(line: 374, column: 1, scope: !591, inlinedAt: !1318)
!1328 = !DILocation(line: 0, scope: !597, inlinedAt: !1318)
!1329 = !DILocation(line: 380, column: 8, scope: !615, inlinedAt: !1318)
!1330 = !DILocation(line: 382, column: 18, scope: !617, inlinedAt: !1318)
!1331 = !DILocation(line: 0, scope: !615, inlinedAt: !1318)
!1332 = !DILocation(line: 385, column: 9, scope: !597, inlinedAt: !1318)
!1333 = !DILocation(line: 0, scope: !51, inlinedAt: !1334)
!1334 = distinct !DILocation(line: 583, column: 251, scope: !1026)
!1335 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1334)
!1336 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1337)
!1337 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1334)
!1338 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1337)
!1339 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1334)
!1340 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1334)
!1341 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1334)
!1342 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1334)
!1343 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1334)
!1344 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1334)
!1345 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1334)
!1346 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1334)
!1347 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1334)
!1348 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1334)
!1349 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1334)
!1350 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1334)
!1351 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1334)
!1352 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1334)
!1353 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1354)
!1354 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1334)
!1355 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1354)
!1356 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !1334)
!1357 = !DILocation(line: 583, column: 284, scope: !1026)
!1358 = !DILocation(line: 583, column: 299, scope: !1026)
!1359 = !DILocation(line: 583, column: 311, scope: !1026)
!1360 = !DILocation(line: 584, column: 34, scope: !1033)
!1361 = !DILocation(line: 0, scope: !123, inlinedAt: !1084)
!1362 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1084)
!1363 = !DILocation(line: 0, scope: !1033)
!1364 = !DILocation(line: 584, column: 79, scope: !1033)
!1365 = !DILocation(line: 0, scope: !123, inlinedAt: !1086)
!1366 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1086)
!1367 = !DILocation(line: 0, scope: !123, inlinedAt: !1368)
!1368 = distinct !DILocation(line: 584, column: 111, scope: !1033)
!1369 = !DILocation(line: 584, column: 169, scope: !1033)
!1370 = !DILocation(line: 0, scope: !123, inlinedAt: !1088)
!1371 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1088)
!1372 = !DILocation(line: 584, column: 228, scope: !1033)
!1373 = !DILocation(line: 584, column: 234, scope: !1033)
!1374 = !DILocation(line: 397, column: 9, scope: !631, inlinedAt: !1375)
!1375 = distinct !DILocation(line: 584, column: 205, scope: !1033)
!1376 = !DILocation(line: 0, scope: !621, inlinedAt: !1375)
!1377 = !DILocation(line: 0, scope: !631, inlinedAt: !1375)
!1378 = !DILocation(line: 397, column: 5, scope: !631, inlinedAt: !1375)
!1379 = !DILocation(line: 0, scope: !630, inlinedAt: !1375)
!1380 = !DILocation(line: 403, column: 7, scope: !646, inlinedAt: !1375)
!1381 = !DILocation(line: 405, column: 16, scope: !648, inlinedAt: !1375)
!1382 = !DILocation(line: 0, scope: !646, inlinedAt: !1375)
!1383 = !DILocation(line: 408, column: 8, scope: !630, inlinedAt: !1375)
!1384 = !DILocation(line: 409, column: 1, scope: !630, inlinedAt: !1375)
!1385 = !DILocation(line: 0, scope: !636, inlinedAt: !1375)
!1386 = !DILocation(line: 415, column: 7, scope: !654, inlinedAt: !1375)
!1387 = !DILocation(line: 417, column: 16, scope: !656, inlinedAt: !1375)
!1388 = !DILocation(line: 0, scope: !654, inlinedAt: !1375)
!1389 = !DILocation(line: 420, column: 8, scope: !636, inlinedAt: !1375)
!1390 = !DILocation(line: 0, scope: !51, inlinedAt: !1391)
!1391 = distinct !DILocation(line: 584, column: 253, scope: !1033)
!1392 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1391)
!1393 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1394)
!1394 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1391)
!1395 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1394)
!1396 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1391)
!1397 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1391)
!1398 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1391)
!1399 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1391)
!1400 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1391)
!1401 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1391)
!1402 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1391)
!1403 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1391)
!1404 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1391)
!1405 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1391)
!1406 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1391)
!1407 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1391)
!1408 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1391)
!1409 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1391)
!1410 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1411)
!1411 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1391)
!1412 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1411)
!1413 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !1391)
!1414 = !DILocation(line: 584, column: 286, scope: !1033)
!1415 = !DILocation(line: 584, column: 301, scope: !1033)
!1416 = !DILocation(line: 584, column: 313, scope: !1033)
!1417 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1418)
!1418 = distinct !DILocation(line: 585, column: 9, scope: !992)
!1419 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1418)
!1420 = !DILocation(line: 585, column: 21, scope: !979)
!1421 = distinct !DISubprogram(name: "ink_compute_scalar32", scope: !15, file: !15, line: 586, type: !1422, scopeLine: 586, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !1424)
!1422 = !DISubroutineType(types: !1423)
!1423 = !{!10, !10, !938, !940}
!1424 = !{!1425, !1426, !1427, !1428, !1431, !1432, !1433, !1434, !1435, !1437, !1438, !1439, !1440, !1441, !1443, !1444, !1445, !1446, !1447, !1449, !1450, !1451, !1452, !1453, !1455, !1456, !1457, !1458, !1459, !1461, !1462, !1463, !1464}
!1425 = !DILocalVariable(name: "function", arg: 1, scope: !1421, file: !15, line: 586, type: !10)
!1426 = !DILocalVariable(name: "data", arg: 2, scope: !1421, file: !15, line: 586, type: !938)
!1427 = !DILocalVariable(name: "lengths", arg: 3, scope: !1421, file: !15, line: 586, type: !940)
!1428 = !DILocalVariable(name: "a0", scope: !1429, file: !15, line: 587, type: !10)
!1429 = distinct !DILexicalBlock(scope: !1430, file: !15, line: 587, column: 8)
!1430 = distinct !DILexicalBlock(scope: !1421, file: !15, line: 586, column: 138)
!1431 = !DILocalVariable(name: "a1", scope: !1429, file: !15, line: 587, type: !10)
!1432 = !DILocalVariable(name: "a2", scope: !1429, file: !15, line: 587, type: !10)
!1433 = !DILocalVariable(name: "a3", scope: !1429, file: !15, line: 587, type: !10)
!1434 = !DILocalVariable(name: "result", scope: !1429, file: !15, line: 587, type: !10)
!1435 = !DILocalVariable(name: "a0", scope: !1436, file: !15, line: 588, type: !10)
!1436 = distinct !DILexicalBlock(scope: !1430, file: !15, line: 588, column: 8)
!1437 = !DILocalVariable(name: "a1", scope: !1436, file: !15, line: 588, type: !10)
!1438 = !DILocalVariable(name: "a2", scope: !1436, file: !15, line: 588, type: !10)
!1439 = !DILocalVariable(name: "a3", scope: !1436, file: !15, line: 588, type: !10)
!1440 = !DILocalVariable(name: "result", scope: !1436, file: !15, line: 588, type: !10)
!1441 = !DILocalVariable(name: "a0", scope: !1442, file: !15, line: 589, type: !10)
!1442 = distinct !DILexicalBlock(scope: !1430, file: !15, line: 589, column: 8)
!1443 = !DILocalVariable(name: "a1", scope: !1442, file: !15, line: 589, type: !10)
!1444 = !DILocalVariable(name: "a2", scope: !1442, file: !15, line: 589, type: !10)
!1445 = !DILocalVariable(name: "a3", scope: !1442, file: !15, line: 589, type: !10)
!1446 = !DILocalVariable(name: "result", scope: !1442, file: !15, line: 589, type: !10)
!1447 = !DILocalVariable(name: "a0", scope: !1448, file: !15, line: 590, type: !10)
!1448 = distinct !DILexicalBlock(scope: !1430, file: !15, line: 590, column: 8)
!1449 = !DILocalVariable(name: "a1", scope: !1448, file: !15, line: 590, type: !10)
!1450 = !DILocalVariable(name: "a2", scope: !1448, file: !15, line: 590, type: !10)
!1451 = !DILocalVariable(name: "a3", scope: !1448, file: !15, line: 590, type: !10)
!1452 = !DILocalVariable(name: "result", scope: !1448, file: !15, line: 590, type: !10)
!1453 = !DILocalVariable(name: "a0", scope: !1454, file: !15, line: 591, type: !10)
!1454 = distinct !DILexicalBlock(scope: !1430, file: !15, line: 591, column: 8)
!1455 = !DILocalVariable(name: "a1", scope: !1454, file: !15, line: 591, type: !10)
!1456 = !DILocalVariable(name: "a2", scope: !1454, file: !15, line: 591, type: !10)
!1457 = !DILocalVariable(name: "a3", scope: !1454, file: !15, line: 591, type: !10)
!1458 = !DILocalVariable(name: "result", scope: !1454, file: !15, line: 591, type: !10)
!1459 = !DILocalVariable(name: "a0", scope: !1460, file: !15, line: 592, type: !10)
!1460 = distinct !DILexicalBlock(scope: !1430, file: !15, line: 592, column: 8)
!1461 = !DILocalVariable(name: "a1", scope: !1460, file: !15, line: 592, type: !10)
!1462 = !DILocalVariable(name: "a2", scope: !1460, file: !15, line: 592, type: !10)
!1463 = !DILocalVariable(name: "a3", scope: !1460, file: !15, line: 592, type: !10)
!1464 = !DILocalVariable(name: "result", scope: !1460, file: !15, line: 592, type: !10)
!1465 = !DILocation(line: 0, scope: !111, inlinedAt: !1466)
!1466 = distinct !DILocation(line: 587, column: 21, scope: !1429)
!1467 = !DILocation(line: 0, scope: !111, inlinedAt: !1468)
!1468 = distinct !DILocation(line: 587, column: 66, scope: !1429)
!1469 = !DILocation(line: 0, scope: !111, inlinedAt: !1470)
!1470 = distinct !DILocation(line: 587, column: 111, scope: !1429)
!1471 = !DILocation(line: 0, scope: !111, inlinedAt: !1472)
!1472 = distinct !DILocation(line: 587, column: 156, scope: !1429)
!1473 = !DILocation(line: 0, scope: !111, inlinedAt: !1474)
!1474 = distinct !DILocation(line: 588, column: 21, scope: !1436)
!1475 = !DILocation(line: 0, scope: !111, inlinedAt: !1476)
!1476 = distinct !DILocation(line: 588, column: 66, scope: !1436)
!1477 = !DILocation(line: 0, scope: !111, inlinedAt: !1478)
!1478 = distinct !DILocation(line: 588, column: 111, scope: !1436)
!1479 = !DILocation(line: 0, scope: !111, inlinedAt: !1480)
!1480 = distinct !DILocation(line: 588, column: 156, scope: !1436)
!1481 = !DILocation(line: 0, scope: !111, inlinedAt: !1482)
!1482 = distinct !DILocation(line: 589, column: 21, scope: !1442)
!1483 = !DILocation(line: 0, scope: !111, inlinedAt: !1484)
!1484 = distinct !DILocation(line: 589, column: 66, scope: !1442)
!1485 = !DILocation(line: 0, scope: !111, inlinedAt: !1486)
!1486 = distinct !DILocation(line: 589, column: 111, scope: !1442)
!1487 = !DILocation(line: 0, scope: !111, inlinedAt: !1488)
!1488 = distinct !DILocation(line: 589, column: 156, scope: !1442)
!1489 = !DILocation(line: 0, scope: !111, inlinedAt: !1490)
!1490 = distinct !DILocation(line: 590, column: 21, scope: !1448)
!1491 = !DILocation(line: 0, scope: !111, inlinedAt: !1492)
!1492 = distinct !DILocation(line: 590, column: 66, scope: !1448)
!1493 = !DILocation(line: 0, scope: !111, inlinedAt: !1494)
!1494 = distinct !DILocation(line: 590, column: 111, scope: !1448)
!1495 = !DILocation(line: 0, scope: !111, inlinedAt: !1496)
!1496 = distinct !DILocation(line: 590, column: 156, scope: !1448)
!1497 = !DILocation(line: 0, scope: !111, inlinedAt: !1498)
!1498 = distinct !DILocation(line: 591, column: 21, scope: !1454)
!1499 = !DILocation(line: 0, scope: !111, inlinedAt: !1500)
!1500 = distinct !DILocation(line: 591, column: 66, scope: !1454)
!1501 = !DILocation(line: 0, scope: !111, inlinedAt: !1502)
!1502 = distinct !DILocation(line: 591, column: 156, scope: !1454)
!1503 = !DILocation(line: 0, scope: !111, inlinedAt: !1504)
!1504 = distinct !DILocation(line: 592, column: 21, scope: !1460)
!1505 = !DILocation(line: 0, scope: !111, inlinedAt: !1506)
!1506 = distinct !DILocation(line: 592, column: 66, scope: !1460)
!1507 = !DILocation(line: 0, scope: !111, inlinedAt: !1508)
!1508 = distinct !DILocation(line: 592, column: 156, scope: !1460)
!1509 = !DILocation(line: 0, scope: !1421)
!1510 = !DILocation(line: 586, column: 122, scope: !1421)
!1511 = !DILocation(line: 0, scope: !1429)
!1512 = !DILocation(line: 0, scope: !123, inlinedAt: !1466)
!1513 = !DILocation(line: 0, scope: !123, inlinedAt: !1468)
!1514 = !DILocation(line: 587, column: 124, scope: !1429)
!1515 = !DILocation(line: 0, scope: !123, inlinedAt: !1470)
!1516 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1470)
!1517 = !DILocation(line: 587, column: 169, scope: !1429)
!1518 = !DILocation(line: 0, scope: !123, inlinedAt: !1472)
!1519 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1472)
!1520 = !DILocation(line: 587, column: 232, scope: !1429)
!1521 = !DILocation(line: 254, column: 7, scope: !506, inlinedAt: !1522)
!1522 = distinct !DILocation(line: 587, column: 205, scope: !1429)
!1523 = !DILocation(line: 0, scope: !484, inlinedAt: !1522)
!1524 = !DILocation(line: 587, column: 79, scope: !1429)
!1525 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1468)
!1526 = !DILocation(line: 587, column: 34, scope: !1429)
!1527 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1466)
!1528 = !DILocation(line: 587, column: 223, scope: !1429)
!1529 = !DILocation(line: 256, column: 16, scope: !508, inlinedAt: !1522)
!1530 = !DILocation(line: 266, column: 17, scope: !510, inlinedAt: !1522)
!1531 = !DILocation(line: 267, column: 18, scope: !484, inlinedAt: !1522)
!1532 = !DILocation(line: 269, column: 13, scope: !484, inlinedAt: !1522)
!1533 = !DILocation(line: 0, scope: !1436)
!1534 = !DILocation(line: 0, scope: !123, inlinedAt: !1474)
!1535 = !DILocation(line: 0, scope: !123, inlinedAt: !1476)
!1536 = !DILocation(line: 588, column: 124, scope: !1436)
!1537 = !DILocation(line: 0, scope: !123, inlinedAt: !1478)
!1538 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1478)
!1539 = !DILocation(line: 588, column: 169, scope: !1436)
!1540 = !DILocation(line: 0, scope: !123, inlinedAt: !1480)
!1541 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1480)
!1542 = !DILocation(line: 588, column: 234, scope: !1436)
!1543 = !DILocation(line: 281, column: 7, scope: !531, inlinedAt: !1544)
!1544 = distinct !DILocation(line: 588, column: 205, scope: !1436)
!1545 = !DILocation(line: 0, scope: !515, inlinedAt: !1544)
!1546 = !DILocation(line: 588, column: 79, scope: !1436)
!1547 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1476)
!1548 = !DILocation(line: 588, column: 34, scope: !1436)
!1549 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1474)
!1550 = !DILocation(line: 588, column: 225, scope: !1436)
!1551 = !DILocation(line: 283, column: 16, scope: !533, inlinedAt: !1544)
!1552 = !DILocation(line: 293, column: 16, scope: !535, inlinedAt: !1544)
!1553 = !DILocation(line: 294, column: 17, scope: !515, inlinedAt: !1544)
!1554 = !DILocation(line: 296, column: 12, scope: !515, inlinedAt: !1544)
!1555 = !DILocation(line: 589, column: 34, scope: !1442)
!1556 = !DILocation(line: 0, scope: !123, inlinedAt: !1482)
!1557 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1482)
!1558 = !DILocation(line: 0, scope: !1442)
!1559 = !DILocation(line: 589, column: 79, scope: !1442)
!1560 = !DILocation(line: 0, scope: !123, inlinedAt: !1484)
!1561 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1484)
!1562 = !DILocation(line: 589, column: 124, scope: !1442)
!1563 = !DILocation(line: 0, scope: !123, inlinedAt: !1486)
!1564 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1486)
!1565 = !DILocation(line: 589, column: 169, scope: !1442)
!1566 = !DILocation(line: 0, scope: !123, inlinedAt: !1488)
!1567 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1488)
!1568 = !DILocation(line: 589, column: 227, scope: !1442)
!1569 = !DILocation(line: 589, column: 230, scope: !1442)
!1570 = !DILocation(line: 589, column: 233, scope: !1442)
!1571 = !DILocation(line: 315, column: 9, scope: !554, inlinedAt: !1572)
!1572 = distinct !DILocation(line: 589, column: 205, scope: !1442)
!1573 = !DILocation(line: 0, scope: !540, inlinedAt: !1572)
!1574 = !DILocation(line: 315, column: 5, scope: !554, inlinedAt: !1572)
!1575 = !DILocation(line: 590, column: 34, scope: !1448)
!1576 = !DILocation(line: 0, scope: !123, inlinedAt: !1490)
!1577 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1490)
!1578 = !DILocation(line: 0, scope: !1448)
!1579 = !DILocation(line: 590, column: 79, scope: !1448)
!1580 = !DILocation(line: 0, scope: !123, inlinedAt: !1492)
!1581 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1492)
!1582 = !DILocation(line: 590, column: 124, scope: !1448)
!1583 = !DILocation(line: 0, scope: !123, inlinedAt: !1494)
!1584 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1494)
!1585 = !DILocation(line: 590, column: 169, scope: !1448)
!1586 = !DILocation(line: 0, scope: !123, inlinedAt: !1496)
!1587 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1496)
!1588 = !DILocation(line: 590, column: 229, scope: !1448)
!1589 = !DILocation(line: 590, column: 232, scope: !1448)
!1590 = !DILocation(line: 590, column: 235, scope: !1448)
!1591 = !DILocation(line: 334, column: 9, scope: !571, inlinedAt: !1592)
!1592 = distinct !DILocation(line: 590, column: 205, scope: !1448)
!1593 = !DILocation(line: 0, scope: !561, inlinedAt: !1592)
!1594 = !DILocation(line: 334, column: 5, scope: !571, inlinedAt: !1592)
!1595 = !DILocation(line: 591, column: 34, scope: !1454)
!1596 = !DILocation(line: 0, scope: !123, inlinedAt: !1498)
!1597 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1498)
!1598 = !DILocation(line: 0, scope: !1454)
!1599 = !DILocation(line: 591, column: 79, scope: !1454)
!1600 = !DILocation(line: 0, scope: !123, inlinedAt: !1500)
!1601 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1500)
!1602 = !DILocation(line: 0, scope: !123, inlinedAt: !1603)
!1603 = distinct !DILocation(line: 591, column: 111, scope: !1454)
!1604 = !DILocation(line: 591, column: 169, scope: !1454)
!1605 = !DILocation(line: 0, scope: !123, inlinedAt: !1502)
!1606 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1502)
!1607 = !DILocation(line: 591, column: 226, scope: !1454)
!1608 = !DILocation(line: 591, column: 232, scope: !1454)
!1609 = !DILocation(line: 362, column: 9, scope: !592, inlinedAt: !1610)
!1610 = distinct !DILocation(line: 591, column: 205, scope: !1454)
!1611 = !DILocation(line: 0, scope: !578, inlinedAt: !1610)
!1612 = !DILocation(line: 0, scope: !592, inlinedAt: !1610)
!1613 = !DILocation(line: 362, column: 5, scope: !592, inlinedAt: !1610)
!1614 = !DILocation(line: 0, scope: !591, inlinedAt: !1610)
!1615 = !DILocation(line: 368, column: 7, scope: !607, inlinedAt: !1610)
!1616 = !DILocation(line: 370, column: 16, scope: !609, inlinedAt: !1610)
!1617 = !DILocation(line: 0, scope: !607, inlinedAt: !1610)
!1618 = !DILocation(line: 373, column: 8, scope: !591, inlinedAt: !1610)
!1619 = !DILocation(line: 374, column: 1, scope: !591, inlinedAt: !1610)
!1620 = !DILocation(line: 0, scope: !597, inlinedAt: !1610)
!1621 = !DILocation(line: 380, column: 8, scope: !615, inlinedAt: !1610)
!1622 = !DILocation(line: 382, column: 18, scope: !617, inlinedAt: !1610)
!1623 = !DILocation(line: 0, scope: !615, inlinedAt: !1610)
!1624 = !DILocation(line: 385, column: 9, scope: !597, inlinedAt: !1610)
!1625 = !DILocation(line: 592, column: 34, scope: !1460)
!1626 = !DILocation(line: 0, scope: !123, inlinedAt: !1504)
!1627 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1504)
!1628 = !DILocation(line: 0, scope: !1460)
!1629 = !DILocation(line: 592, column: 79, scope: !1460)
!1630 = !DILocation(line: 0, scope: !123, inlinedAt: !1506)
!1631 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1506)
!1632 = !DILocation(line: 0, scope: !123, inlinedAt: !1633)
!1633 = distinct !DILocation(line: 592, column: 111, scope: !1460)
!1634 = !DILocation(line: 592, column: 169, scope: !1460)
!1635 = !DILocation(line: 0, scope: !123, inlinedAt: !1508)
!1636 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1508)
!1637 = !DILocation(line: 592, column: 228, scope: !1460)
!1638 = !DILocation(line: 592, column: 234, scope: !1460)
!1639 = !DILocation(line: 397, column: 9, scope: !631, inlinedAt: !1640)
!1640 = distinct !DILocation(line: 592, column: 205, scope: !1460)
!1641 = !DILocation(line: 0, scope: !621, inlinedAt: !1640)
!1642 = !DILocation(line: 0, scope: !631, inlinedAt: !1640)
!1643 = !DILocation(line: 397, column: 5, scope: !631, inlinedAt: !1640)
!1644 = !DILocation(line: 0, scope: !630, inlinedAt: !1640)
!1645 = !DILocation(line: 403, column: 7, scope: !646, inlinedAt: !1640)
!1646 = !DILocation(line: 405, column: 16, scope: !648, inlinedAt: !1640)
!1647 = !DILocation(line: 0, scope: !646, inlinedAt: !1640)
!1648 = !DILocation(line: 408, column: 8, scope: !630, inlinedAt: !1640)
!1649 = !DILocation(line: 409, column: 1, scope: !630, inlinedAt: !1640)
!1650 = !DILocation(line: 0, scope: !636, inlinedAt: !1640)
!1651 = !DILocation(line: 415, column: 7, scope: !654, inlinedAt: !1640)
!1652 = !DILocation(line: 417, column: 16, scope: !656, inlinedAt: !1640)
!1653 = !DILocation(line: 0, scope: !654, inlinedAt: !1640)
!1654 = !DILocation(line: 420, column: 8, scope: !636, inlinedAt: !1640)
!1655 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1656)
!1656 = distinct !DILocation(line: 593, column: 9, scope: !1430)
!1657 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1656)
!1658 = !DILocation(line: 593, column: 30, scope: !1421)
!1659 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !15, file: !15, line: 594, type: !1660, scopeLine: 594, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !1664)
!1660 = !DISubroutineType(types: !1661)
!1661 = !{!1662, !10, !938, !940}
!1662 = !DIDerivedType(tag: DW_TAG_typedef, name: "uint64_t", file: !11, line: 102, baseType: !1663)
!1663 = !DIBasicType(name: "unsigned long long", size: 64, encoding: DW_ATE_unsigned)
!1664 = !{!1665, !1666, !1667}
!1665 = !DILocalVariable(name: "function", arg: 1, scope: !1659, file: !15, line: 594, type: !10)
!1666 = !DILocalVariable(name: "data", arg: 2, scope: !1659, file: !15, line: 594, type: !938)
!1667 = !DILocalVariable(name: "lengths", arg: 3, scope: !1659, file: !15, line: 594, type: !940)
!1668 = !DILocation(line: 0, scope: !1659)
!1669 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1670)
!1670 = distinct !DILocation(line: 595, column: 9, scope: !1671)
!1671 = distinct !DILexicalBlock(scope: !1659, file: !15, line: 594, column: 138)
!1672 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1670)
