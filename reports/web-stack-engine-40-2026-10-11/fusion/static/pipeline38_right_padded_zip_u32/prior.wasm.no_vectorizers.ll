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
define hidden void @lang_fn_pipeline38_right_padded_zip_u32(ptr dead_on_unwind noalias nocapture writable writeonly sret(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %1, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %2, i32 noundef %3, i32 noundef %4) local_unnamed_addr #2 !dbg !164 {
    #dbg_declare(ptr %1, !173, !DIExpression(), !238)
    #dbg_declare(ptr %2, !174, !DIExpression(), !239)
    #dbg_value(i32 %3, !175, !DIExpression(), !240)
    #dbg_value(i32 %4, !176, !DIExpression(), !240)
  %6 = load ptr, ptr %1, align 4, !dbg !241, !tbaa !242
  %7 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !241
  %8 = load i32, ptr %7, align 4, !dbg !241, !tbaa !27
    #dbg_value(ptr %6, !177, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !240)
    #dbg_value(i32 %8, !177, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !240)
    #dbg_value(i32 %8, !55, !DIExpression(), !245)
    #dbg_value(i32 4, !56, !DIExpression(), !245)
  %9 = icmp ugt i32 %8, 1073741823, !dbg !247
  %10 = load i32, ptr @ink_top, align 4
  %11 = icmp ugt i32 %10, -8
  %12 = select i1 %9, i1 true, i1 %11, !dbg !248
  br i1 %12, label %13, label %14, !dbg !248

13:                                               ; preds = %5
  tail call void @llvm.trap(), !dbg !249
  unreachable, !dbg !251

14:                                               ; preds = %5
  %15 = icmp eq i32 %10, 0, !dbg !252
  %16 = add nuw i32 %10, 7, !dbg !253
  %17 = select i1 %15, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %16, !dbg !254
  %18 = and i32 %17, -8, !dbg !255
    #dbg_value(i32 %18, !57, !DIExpression(), !245)
  %19 = tail call i32 @llvm.umax.i32(i32 %8, i32 1), !dbg !256
  %20 = shl nuw i32 %19, 2, !dbg !257
    #dbg_value(i32 %20, !58, !DIExpression(), !245)
  %21 = xor i32 %18, -1, !dbg !258
  %22 = icmp ugt i32 %20, %21, !dbg !259
  br i1 %22, label %23, label %24, !dbg !259

23:                                               ; preds = %14
  tail call void @llvm.trap(), !dbg !260
  unreachable, !dbg !262

24:                                               ; preds = %14
  %25 = add i32 %18, %20, !dbg !263
  store i32 %25, ptr @ink_top, align 4, !dbg !264, !tbaa !27
  %26 = add i32 %25, 65535, !dbg !265
  %27 = lshr i32 %26, 16, !dbg !266
    #dbg_value(i32 %27, !59, !DIExpression(), !245)
  %28 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !267
    #dbg_value(i32 %28, !60, !DIExpression(), !245)
  %29 = icmp ugt i32 %27, %28, !dbg !268
  br i1 %29, label %30, label %35, !dbg !269

30:                                               ; preds = %24
  %31 = sub nuw nsw i32 %27, %28, !dbg !270
  %32 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %31), !dbg !271
  %33 = icmp eq i32 %32, -1, !dbg !272
  br i1 %33, label %34, label %35, !dbg !269

34:                                               ; preds = %30
  tail call void @llvm.trap(), !dbg !273
  unreachable, !dbg !275

35:                                               ; preds = %24, %30
  %36 = inttoptr i32 %18 to ptr, !dbg !276
    #dbg_value(ptr %36, !178, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !240)
    #dbg_value(i32 %8, !178, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !240)
    #dbg_value(i32 0, !179, !DIExpression(), !277)
  %37 = icmp eq i32 %8, 0, !dbg !278
  br i1 %37, label %54, label %38, !dbg !279

38:                                               ; preds = %35
  %39 = sub i32 0, %3
  %40 = and i32 %8, 1, !dbg !279
  %41 = icmp eq i32 %8, 1, !dbg !279
  br i1 %41, label %44, label %42, !dbg !279

42:                                               ; preds = %38
  %43 = and i32 %8, 1073741822, !dbg !279
  br label %84, !dbg !279

44:                                               ; preds = %84, %38
  %45 = phi i32 [ 0, %38 ], [ %100, %84 ]
  %46 = icmp eq i32 %40, 0, !dbg !279
  br i1 %46, label %54, label %47, !dbg !279

47:                                               ; preds = %44
    #dbg_value(i32 %45, !179, !DIExpression(), !277)
    #dbg_value(i32 %45, !181, !DIExpression(), !280)
  %48 = getelementptr inbounds nuw i32, ptr %6, i32 %45, !dbg !281
  %49 = load i32, ptr %48, align 4, !dbg !281, !tbaa !282
    #dbg_value(i32 %49, !184, !DIExpression(), !280)
    #dbg_value(i32 %3, !185, !DIExpression(), !280)
    #dbg_value(i32 %4, !186, !DIExpression(), !280)
    #dbg_value(i32 %45, !187, !DIExpression(), !280)
  %50 = icmp ult i32 %45, %3, !dbg !284
  %51 = select i1 %50, i32 %4, i32 %39, !dbg !285
  %52 = add i32 %49, %51, !dbg !285
    #dbg_value(i32 %52, !188, !DIExpression(), !280)
  %53 = getelementptr inbounds nuw i32, ptr %36, i32 %45, !dbg !286
  store i32 %52, ptr %53, align 4, !dbg !287, !tbaa !282
    #dbg_value(i32 %45, !179, !DIExpression(DW_OP_plus_uconst, 1, DW_OP_stack_value), !277)
  br label %54

54:                                               ; preds = %47, %44, %35
    #dbg_value(ptr %36, !194, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !240)
    #dbg_value(i32 %8, !194, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !240)
    #dbg_value(ptr %6, !195, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !240)
    #dbg_value(i32 %8, !195, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !240)
    #dbg_value(i32 %8, !55, !DIExpression(), !288)
    #dbg_value(i32 4, !56, !DIExpression(), !288)
  %55 = load i32, ptr @ink_top, align 4
  %56 = icmp ugt i32 %55, -8
  br i1 %56, label %57, label %58, !dbg !290

57:                                               ; preds = %54
  tail call void @llvm.trap(), !dbg !291
  unreachable, !dbg !293

58:                                               ; preds = %54
  %59 = icmp eq i32 %55, 0, !dbg !294
  %60 = add nuw i32 %55, 7, !dbg !295
  %61 = select i1 %59, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %60, !dbg !296
  %62 = and i32 %61, -8, !dbg !297
    #dbg_value(i32 %62, !57, !DIExpression(), !288)
    #dbg_value(i32 %20, !58, !DIExpression(), !288)
  %63 = xor i32 %62, -1, !dbg !298
  %64 = icmp ugt i32 %20, %63, !dbg !299
  br i1 %64, label %65, label %66, !dbg !299

65:                                               ; preds = %58
  tail call void @llvm.trap(), !dbg !300
  unreachable, !dbg !302

66:                                               ; preds = %58
  %67 = add i32 %62, %20, !dbg !303
  store i32 %67, ptr @ink_top, align 4, !dbg !304, !tbaa !27
  %68 = add i32 %67, 65535, !dbg !305
  %69 = lshr i32 %68, 16, !dbg !306
    #dbg_value(i32 %69, !59, !DIExpression(), !288)
  %70 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !307
    #dbg_value(i32 %70, !60, !DIExpression(), !288)
  %71 = icmp ugt i32 %69, %70, !dbg !308
  br i1 %71, label %72, label %77, !dbg !309

72:                                               ; preds = %66
  %73 = sub nuw nsw i32 %69, %70, !dbg !310
  %74 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %73), !dbg !311
  %75 = icmp eq i32 %74, -1, !dbg !312
  br i1 %75, label %76, label %77, !dbg !309

76:                                               ; preds = %72
  tail call void @llvm.trap(), !dbg !313
  unreachable, !dbg !315

77:                                               ; preds = %66, %72
  %78 = inttoptr i32 %62 to ptr, !dbg !316
    #dbg_value(ptr %78, !196, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !240)
    #dbg_value(i32 %8, !196, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !240)
    #dbg_value(i32 0, !197, !DIExpression(), !317)
  br i1 %37, label %115, label %79, !dbg !318

79:                                               ; preds = %77
  %80 = and i32 %8, 1, !dbg !318
  %81 = icmp eq i32 %8, 1, !dbg !318
  br i1 %81, label %103, label %82, !dbg !318

82:                                               ; preds = %79
  %83 = and i32 %8, 1073741822, !dbg !318
  br label %121, !dbg !318

84:                                               ; preds = %84, %42
  %85 = phi i32 [ 0, %42 ], [ %100, %84 ]
  %86 = phi i32 [ 0, %42 ], [ %101, %84 ]
    #dbg_value(i32 %85, !179, !DIExpression(), !277)
    #dbg_value(i32 %85, !181, !DIExpression(), !280)
  %87 = getelementptr inbounds nuw i32, ptr %6, i32 %85, !dbg !281
  %88 = load i32, ptr %87, align 4, !dbg !281, !tbaa !282
    #dbg_value(i32 %88, !184, !DIExpression(), !280)
    #dbg_value(i32 %3, !185, !DIExpression(), !280)
    #dbg_value(i32 %4, !186, !DIExpression(), !280)
    #dbg_value(i32 %85, !187, !DIExpression(), !280)
  %89 = icmp ult i32 %85, %3, !dbg !284
  %90 = select i1 %89, i32 %4, i32 %39, !dbg !285
  %91 = add i32 %88, %90, !dbg !285
    #dbg_value(i32 %91, !188, !DIExpression(), !280)
  %92 = getelementptr inbounds nuw i32, ptr %36, i32 %85, !dbg !286
  store i32 %91, ptr %92, align 8, !dbg !287, !tbaa !282
  %93 = or disjoint i32 %85, 1, !dbg !319
    #dbg_value(i32 %93, !179, !DIExpression(), !277)
    #dbg_value(i32 %93, !181, !DIExpression(), !280)
  %94 = getelementptr inbounds nuw i32, ptr %6, i32 %93, !dbg !281
  %95 = load i32, ptr %94, align 4, !dbg !281, !tbaa !282
    #dbg_value(i32 %95, !184, !DIExpression(), !280)
    #dbg_value(i32 %93, !187, !DIExpression(), !280)
  %96 = icmp ult i32 %93, %3, !dbg !284
  %97 = select i1 %96, i32 %4, i32 %39, !dbg !285
  %98 = add i32 %95, %97, !dbg !285
    #dbg_value(i32 %98, !188, !DIExpression(), !280)
  %99 = getelementptr inbounds nuw i32, ptr %36, i32 %93, !dbg !286
  store i32 %98, ptr %99, align 4, !dbg !287, !tbaa !282
  %100 = add nuw i32 %85, 2, !dbg !319
    #dbg_value(i32 %100, !179, !DIExpression(), !277)
  %101 = add i32 %86, 2, !dbg !279
  %102 = icmp eq i32 %101, %43, !dbg !279
  br i1 %102, label %44, label %84, !dbg !279, !llvm.loop !320

103:                                              ; preds = %121, %79
  %104 = phi i32 [ 0, %79 ], [ %141, %121 ]
  %105 = icmp eq i32 %80, 0, !dbg !318
  br i1 %105, label %115, label %106, !dbg !318

106:                                              ; preds = %103
    #dbg_value(i32 %104, !197, !DIExpression(), !317)
    #dbg_value(i32 %104, !199, !DIExpression(), !322)
  %107 = getelementptr inbounds nuw i32, ptr %6, i32 %104, !dbg !323
  %108 = load i32, ptr %107, align 4, !dbg !323, !tbaa !282
    #dbg_value(i32 %108, !202, !DIExpression(), !322)
    #dbg_value(i32 %3, !203, !DIExpression(), !322)
    #dbg_value(i32 %4, !204, !DIExpression(), !322)
    #dbg_value(i32 %104, !205, !DIExpression(), !322)
    #dbg_value(i32 3, !206, !DIExpression(), !322)
    #dbg_value(i32 poison, !207, !DIExpression(), !322)
  %109 = urem i32 %104, 3, !dbg !324
    #dbg_value(i32 %109, !207, !DIExpression(), !322)
    #dbg_value(i32 %109, !208, !DIExpression(), !322)
  %110 = icmp eq i32 %109, 0, !dbg !327
  %111 = mul i32 %108, %4, !dbg !328
  %112 = add i32 %108, %3, !dbg !328
  %113 = select i1 %110, i32 %111, i32 %112, !dbg !328
    #dbg_value(i32 %113, !209, !DIExpression(), !322)
  %114 = getelementptr inbounds nuw i32, ptr %78, i32 %104, !dbg !329
  store i32 %113, ptr %114, align 4, !dbg !330, !tbaa !282
    #dbg_value(i32 %104, !197, !DIExpression(DW_OP_plus_uconst, 1, DW_OP_stack_value), !317)
  br label %115, !dbg !331

115:                                              ; preds = %106, %103, %77
    #dbg_value(ptr %78, !215, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !240)
    #dbg_value(i32 %8, !215, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !240)
  %116 = load ptr, ptr %2, align 4, !dbg !331, !tbaa !242
  %117 = getelementptr inbounds nuw i8, ptr %2, i32 4, !dbg !331
  %118 = load i32, ptr %117, align 4, !dbg !331, !tbaa !27
    #dbg_value(ptr %116, !216, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !240)
    #dbg_value(i32 %118, !216, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !240)
  %119 = xor i32 %118, -1, !dbg !332
  %120 = icmp ugt i32 %8, %119, !dbg !334
  br i1 %120, label %144, label %145, !dbg !334

121:                                              ; preds = %121, %82
  %122 = phi i32 [ 0, %82 ], [ %141, %121 ]
  %123 = phi i32 [ 0, %82 ], [ %142, %121 ]
    #dbg_value(i32 %122, !197, !DIExpression(), !317)
    #dbg_value(i32 %122, !199, !DIExpression(), !322)
  %124 = getelementptr inbounds nuw i32, ptr %6, i32 %122, !dbg !323
  %125 = load i32, ptr %124, align 4, !dbg !323, !tbaa !282
    #dbg_value(i32 %125, !202, !DIExpression(), !322)
    #dbg_value(i32 %3, !203, !DIExpression(), !322)
    #dbg_value(i32 %4, !204, !DIExpression(), !322)
    #dbg_value(i32 %122, !205, !DIExpression(), !322)
    #dbg_value(i32 3, !206, !DIExpression(), !322)
    #dbg_value(i32 poison, !207, !DIExpression(), !322)
  %126 = urem i32 %122, 3, !dbg !324
    #dbg_value(i32 %126, !207, !DIExpression(), !322)
    #dbg_value(i32 %126, !208, !DIExpression(), !322)
  %127 = icmp eq i32 %126, 0, !dbg !327
  %128 = mul i32 %125, %4, !dbg !328
  %129 = add i32 %125, %3, !dbg !328
  %130 = select i1 %127, i32 %128, i32 %129, !dbg !328
    #dbg_value(i32 %130, !209, !DIExpression(), !322)
  %131 = getelementptr inbounds nuw i32, ptr %78, i32 %122, !dbg !329
  store i32 %130, ptr %131, align 8, !dbg !330, !tbaa !282
  %132 = or disjoint i32 %122, 1, !dbg !335
    #dbg_value(i32 %132, !197, !DIExpression(), !317)
    #dbg_value(i32 %132, !199, !DIExpression(), !322)
  %133 = getelementptr inbounds nuw i32, ptr %6, i32 %132, !dbg !323
  %134 = load i32, ptr %133, align 4, !dbg !323, !tbaa !282
    #dbg_value(i32 %134, !202, !DIExpression(), !322)
    #dbg_value(i32 %132, !205, !DIExpression(), !322)
    #dbg_value(i32 poison, !207, !DIExpression(), !322)
  %135 = urem i32 %132, 3, !dbg !324
    #dbg_value(i32 %135, !207, !DIExpression(), !322)
    #dbg_value(i32 %135, !208, !DIExpression(), !322)
  %136 = icmp eq i32 %135, 0, !dbg !327
  %137 = mul i32 %134, %4, !dbg !328
  %138 = add i32 %134, %3, !dbg !328
  %139 = select i1 %136, i32 %137, i32 %138, !dbg !328
    #dbg_value(i32 %139, !209, !DIExpression(), !322)
  %140 = getelementptr inbounds nuw i32, ptr %78, i32 %132, !dbg !329
  store i32 %139, ptr %140, align 4, !dbg !330, !tbaa !282
  %141 = add nuw i32 %122, 2, !dbg !335
    #dbg_value(i32 %141, !197, !DIExpression(), !317)
  %142 = add i32 %123, 2, !dbg !318
  %143 = icmp eq i32 %142, %83, !dbg !318
  br i1 %143, label %103, label %121, !dbg !318, !llvm.loop !336

144:                                              ; preds = %115
  tail call void @llvm.trap(), !dbg !338
  unreachable, !dbg !340

145:                                              ; preds = %115
  %146 = add i32 %118, %8, !dbg !341
    #dbg_value(i32 %146, !217, !DIExpression(), !240)
    #dbg_value(i32 %146, !55, !DIExpression(), !342)
    #dbg_value(i32 4, !56, !DIExpression(), !342)
  %147 = icmp ugt i32 %146, 1073741823, !dbg !344
  %148 = load i32, ptr @ink_top, align 4
  %149 = icmp ugt i32 %148, -8
  %150 = select i1 %147, i1 true, i1 %149, !dbg !345
  br i1 %150, label %151, label %152, !dbg !345

151:                                              ; preds = %145
  tail call void @llvm.trap(), !dbg !346
  unreachable, !dbg !348

152:                                              ; preds = %145
  %153 = icmp eq i32 %148, 0, !dbg !349
  %154 = add nuw i32 %148, 7, !dbg !350
  %155 = select i1 %153, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %154, !dbg !351
  %156 = and i32 %155, -8, !dbg !352
    #dbg_value(i32 %156, !57, !DIExpression(), !342)
  %157 = tail call i32 @llvm.umax.i32(i32 %146, i32 1), !dbg !353
  %158 = shl nuw i32 %157, 2, !dbg !354
    #dbg_value(i32 %158, !58, !DIExpression(), !342)
  %159 = xor i32 %156, -1, !dbg !355
  %160 = icmp ugt i32 %158, %159, !dbg !356
  br i1 %160, label %161, label %162, !dbg !356

161:                                              ; preds = %152
  tail call void @llvm.trap(), !dbg !357
  unreachable, !dbg !359

162:                                              ; preds = %152
  %163 = add i32 %156, %158, !dbg !360
  store i32 %163, ptr @ink_top, align 4, !dbg !361, !tbaa !27
  %164 = add i32 %163, 65535, !dbg !362
  %165 = lshr i32 %164, 16, !dbg !363
    #dbg_value(i32 %165, !59, !DIExpression(), !342)
  %166 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !364
    #dbg_value(i32 %166, !60, !DIExpression(), !342)
  %167 = icmp ugt i32 %165, %166, !dbg !365
  br i1 %167, label %168, label %173, !dbg !366

168:                                              ; preds = %162
  %169 = sub nuw nsw i32 %165, %166, !dbg !367
  %170 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %169), !dbg !368
  %171 = icmp eq i32 %170, -1, !dbg !369
  br i1 %171, label %172, label %173, !dbg !366

172:                                              ; preds = %168
  tail call void @llvm.trap(), !dbg !370
  unreachable, !dbg !372

173:                                              ; preds = %162, %168
  %174 = inttoptr i32 %156 to ptr, !dbg !373
    #dbg_value(ptr %174, !218, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !240)
    #dbg_value(i32 %146, !218, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !240)
  %175 = shl nuw i32 %8, 2, !dbg !374
    #dbg_value(ptr %174, !110, !DIExpression(), !375)
    #dbg_value(ptr %78, !115, !DIExpression(), !375)
    #dbg_value(i32 %175, !116, !DIExpression(), !375)
    #dbg_value(ptr %174, !117, !DIExpression(), !375)
    #dbg_value(ptr %78, !119, !DIExpression(), !375)
    #dbg_value(i32 0, !122, !DIExpression(), !377)
  br i1 %37, label %195, label %176, !dbg !378

176:                                              ; preds = %173, %176
  %177 = phi i32 [ %193, %176 ], [ 0, %173 ]
    #dbg_value(i32 %177, !122, !DIExpression(), !377)
  %178 = getelementptr inbounds nuw i8, ptr %78, i32 %177, !dbg !379
  %179 = load i8, ptr %178, align 4, !dbg !379, !tbaa !131
  %180 = getelementptr inbounds nuw i8, ptr %174, i32 %177, !dbg !380
  store i8 %179, ptr %180, align 4, !dbg !381, !tbaa !131
  %181 = or disjoint i32 %177, 1, !dbg !382
    #dbg_value(i32 %181, !122, !DIExpression(), !377)
  %182 = getelementptr inbounds nuw i8, ptr %78, i32 %181, !dbg !379
  %183 = load i8, ptr %182, align 1, !dbg !379, !tbaa !131
  %184 = getelementptr inbounds nuw i8, ptr %174, i32 %181, !dbg !380
  store i8 %183, ptr %184, align 1, !dbg !381, !tbaa !131
  %185 = or disjoint i32 %177, 2, !dbg !382
    #dbg_value(i32 %185, !122, !DIExpression(), !377)
  %186 = getelementptr inbounds nuw i8, ptr %78, i32 %185, !dbg !379
  %187 = load i8, ptr %186, align 2, !dbg !379, !tbaa !131
  %188 = getelementptr inbounds nuw i8, ptr %174, i32 %185, !dbg !380
  store i8 %187, ptr %188, align 2, !dbg !381, !tbaa !131
  %189 = or disjoint i32 %177, 3, !dbg !382
    #dbg_value(i32 %189, !122, !DIExpression(), !377)
  %190 = getelementptr inbounds nuw i8, ptr %78, i32 %189, !dbg !379
  %191 = load i8, ptr %190, align 1, !dbg !379, !tbaa !131
  %192 = getelementptr inbounds nuw i8, ptr %174, i32 %189, !dbg !380
  store i8 %191, ptr %192, align 1, !dbg !381, !tbaa !131
  %193 = add nuw i32 %177, 4, !dbg !382
    #dbg_value(i32 %193, !122, !DIExpression(), !377)
  %194 = icmp eq i32 %193, %175, !dbg !383
  br i1 %194, label %195, label %176, !dbg !378, !llvm.loop !384

195:                                              ; preds = %176, %173
  %196 = getelementptr inbounds nuw i32, ptr %174, i32 %8, !dbg !386
  %197 = shl i32 %118, 2, !dbg !387
    #dbg_value(ptr %196, !110, !DIExpression(), !388)
    #dbg_value(ptr %116, !115, !DIExpression(), !388)
    #dbg_value(i32 %197, !116, !DIExpression(), !388)
    #dbg_value(ptr %196, !117, !DIExpression(), !388)
    #dbg_value(ptr %116, !119, !DIExpression(), !388)
    #dbg_value(i32 0, !122, !DIExpression(), !390)
  %198 = icmp eq i32 %197, 0, !dbg !391
  br i1 %198, label %218, label %199, !dbg !392

199:                                              ; preds = %195, %199
  %200 = phi i32 [ %216, %199 ], [ 0, %195 ]
    #dbg_value(i32 %200, !122, !DIExpression(), !390)
  %201 = getelementptr inbounds nuw i8, ptr %116, i32 %200, !dbg !393
  %202 = load i8, ptr %201, align 1, !dbg !393, !tbaa !131
  %203 = getelementptr inbounds nuw i8, ptr %196, i32 %200, !dbg !394
  store i8 %202, ptr %203, align 4, !dbg !395, !tbaa !131
  %204 = or disjoint i32 %200, 1, !dbg !396
    #dbg_value(i32 %204, !122, !DIExpression(), !390)
  %205 = getelementptr inbounds nuw i8, ptr %116, i32 %204, !dbg !393
  %206 = load i8, ptr %205, align 1, !dbg !393, !tbaa !131
  %207 = getelementptr inbounds nuw i8, ptr %196, i32 %204, !dbg !394
  store i8 %206, ptr %207, align 1, !dbg !395, !tbaa !131
  %208 = or disjoint i32 %200, 2, !dbg !396
    #dbg_value(i32 %208, !122, !DIExpression(), !390)
  %209 = getelementptr inbounds nuw i8, ptr %116, i32 %208, !dbg !393
  %210 = load i8, ptr %209, align 1, !dbg !393, !tbaa !131
  %211 = getelementptr inbounds nuw i8, ptr %196, i32 %208, !dbg !394
  store i8 %210, ptr %211, align 2, !dbg !395, !tbaa !131
  %212 = or disjoint i32 %200, 3, !dbg !396
    #dbg_value(i32 %212, !122, !DIExpression(), !390)
  %213 = getelementptr inbounds nuw i8, ptr %116, i32 %212, !dbg !393
  %214 = load i8, ptr %213, align 1, !dbg !393, !tbaa !131
  %215 = getelementptr inbounds nuw i8, ptr %196, i32 %212, !dbg !394
  store i8 %214, ptr %215, align 1, !dbg !395, !tbaa !131
  %216 = add nuw i32 %200, 4, !dbg !396
    #dbg_value(i32 %216, !122, !DIExpression(), !390)
  %217 = icmp eq i32 %216, %197, !dbg !391
  br i1 %217, label %218, label %199, !dbg !392, !llvm.loop !397

218:                                              ; preds = %199, %195
    #dbg_value(ptr %174, !219, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !240)
    #dbg_value(i32 %146, !219, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !240)
    #dbg_declare(ptr %0, !220, !DIExpression(), !399)
  %219 = tail call i32 @llvm.umin.i32(i32 %8, i32 %146), !dbg !400
    #dbg_value(i32 %219, !55, !DIExpression(), !401)
    #dbg_value(i32 4, !56, !DIExpression(), !401)
  %220 = load i32, ptr @ink_top, align 4
  %221 = icmp ugt i32 %220, -8
  br i1 %221, label %222, label %223, !dbg !403

222:                                              ; preds = %218
  tail call void @llvm.trap(), !dbg !404
  unreachable, !dbg !406

223:                                              ; preds = %218
  %224 = icmp eq i32 %220, 0, !dbg !407
  %225 = add nuw i32 %220, 7, !dbg !408
  %226 = select i1 %224, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %225, !dbg !409
  %227 = and i32 %226, -8, !dbg !410
    #dbg_value(i32 %227, !57, !DIExpression(), !401)
  %228 = tail call i32 @llvm.umax.i32(i32 %219, i32 1), !dbg !411
  %229 = shl nuw i32 %228, 2, !dbg !412
    #dbg_value(i32 %229, !58, !DIExpression(), !401)
  %230 = xor i32 %227, -1, !dbg !413
  %231 = icmp ugt i32 %229, %230, !dbg !414
  br i1 %231, label %232, label %233, !dbg !414

232:                                              ; preds = %223
  tail call void @llvm.trap(), !dbg !415
  unreachable, !dbg !417

233:                                              ; preds = %223
  %234 = add i32 %227, %229, !dbg !418
  store i32 %234, ptr @ink_top, align 4, !dbg !419, !tbaa !27
  %235 = add i32 %234, 65535, !dbg !420
  %236 = lshr i32 %235, 16, !dbg !421
    #dbg_value(i32 %236, !59, !DIExpression(), !401)
  %237 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !422
    #dbg_value(i32 %237, !60, !DIExpression(), !401)
  %238 = icmp ugt i32 %236, %237, !dbg !423
  br i1 %238, label %239, label %244, !dbg !424

239:                                              ; preds = %233
  %240 = sub nuw nsw i32 %236, %237, !dbg !425
  %241 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %240), !dbg !426
  %242 = icmp eq i32 %241, -1, !dbg !427
  br i1 %242, label %243, label %244, !dbg !424

243:                                              ; preds = %239
  tail call void @llvm.trap(), !dbg !428
  unreachable, !dbg !430

244:                                              ; preds = %233, %239
  %245 = inttoptr i32 %227 to ptr, !dbg !431
  store ptr %245, ptr %0, align 4, !dbg !432, !tbaa !433
  %246 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !432
  store i32 %219, ptr %246, align 4, !dbg !432, !tbaa !435
    #dbg_value(i32 0, !221, !DIExpression(), !436)
  %247 = icmp eq i32 %219, 0, !dbg !437
  br i1 %247, label %268, label %248, !dbg !438

248:                                              ; preds = %244
  %249 = and i32 %219, 1, !dbg !438
  %250 = icmp eq i32 %219, 1, !dbg !438
  br i1 %250, label %253, label %251, !dbg !438

251:                                              ; preds = %248
  %252 = and i32 %219, 1073741822, !dbg !438
  br label %269, !dbg !438

253:                                              ; preds = %269, %248
  %254 = phi i32 [ 0, %248 ], [ %295, %269 ]
  %255 = icmp eq i32 %249, 0, !dbg !438
  br i1 %255, label %268, label %256, !dbg !438

256:                                              ; preds = %253
    #dbg_value(i32 %254, !221, !DIExpression(), !436)
  %257 = getelementptr inbounds nuw i32, ptr %36, i32 %254, !dbg !439
  %258 = load i32, ptr %257, align 4, !dbg !439, !tbaa !282
    #dbg_value(i32 %258, !223, !DIExpression(), !440)
  %259 = getelementptr inbounds nuw i32, ptr %174, i32 %254, !dbg !441
  %260 = load i32, ptr %259, align 4, !dbg !441, !tbaa !282
    #dbg_value(i32 %260, !226, !DIExpression(), !440)
    #dbg_value(i32 %3, !227, !DIExpression(), !440)
    #dbg_value(i32 %4, !228, !DIExpression(), !440)
    #dbg_value(i32 %258, !229, !DIExpression(), !440)
  %261 = icmp ult i32 %258, %260, !dbg !442
  %262 = mul i32 %260, %4, !dbg !443
  %263 = add i32 %262, %258, !dbg !443
  %264 = add i32 %258, %3, !dbg !443
  %265 = sub i32 %264, %260, !dbg !443
  %266 = select i1 %261, i32 %263, i32 %265, !dbg !443
    #dbg_value(i32 %266, !230, !DIExpression(), !440)
  %267 = getelementptr inbounds nuw i32, ptr %245, i32 %254, !dbg !444
  store i32 %266, ptr %267, align 4, !dbg !445, !tbaa !282
    #dbg_value(i32 %254, !221, !DIExpression(DW_OP_plus_uconst, 1, DW_OP_stack_value), !436)
  br label %268, !dbg !446

268:                                              ; preds = %256, %253, %244
  ret void, !dbg !446

269:                                              ; preds = %269, %251
  %270 = phi i32 [ 0, %251 ], [ %295, %269 ]
  %271 = phi i32 [ 0, %251 ], [ %296, %269 ]
    #dbg_value(i32 %270, !221, !DIExpression(), !436)
  %272 = getelementptr inbounds nuw i32, ptr %36, i32 %270, !dbg !439
  %273 = load i32, ptr %272, align 8, !dbg !439, !tbaa !282
    #dbg_value(i32 %273, !223, !DIExpression(), !440)
  %274 = getelementptr inbounds nuw i32, ptr %174, i32 %270, !dbg !441
  %275 = load i32, ptr %274, align 8, !dbg !441, !tbaa !282
    #dbg_value(i32 %275, !226, !DIExpression(), !440)
    #dbg_value(i32 %3, !227, !DIExpression(), !440)
    #dbg_value(i32 %4, !228, !DIExpression(), !440)
    #dbg_value(i32 %273, !229, !DIExpression(), !440)
  %276 = icmp ult i32 %273, %275, !dbg !442
  %277 = mul i32 %275, %4, !dbg !443
  %278 = add i32 %277, %273, !dbg !443
  %279 = add i32 %273, %3, !dbg !443
  %280 = sub i32 %279, %275, !dbg !443
  %281 = select i1 %276, i32 %278, i32 %280, !dbg !443
    #dbg_value(i32 %281, !230, !DIExpression(), !440)
  %282 = getelementptr inbounds nuw i32, ptr %245, i32 %270, !dbg !444
  store i32 %281, ptr %282, align 8, !dbg !445, !tbaa !282
  %283 = or disjoint i32 %270, 1, !dbg !447
    #dbg_value(i32 %283, !221, !DIExpression(), !436)
  %284 = getelementptr inbounds nuw i32, ptr %36, i32 %283, !dbg !439
  %285 = load i32, ptr %284, align 4, !dbg !439, !tbaa !282
    #dbg_value(i32 %285, !223, !DIExpression(), !440)
  %286 = getelementptr inbounds nuw i32, ptr %174, i32 %283, !dbg !441
  %287 = load i32, ptr %286, align 4, !dbg !441, !tbaa !282
    #dbg_value(i32 %287, !226, !DIExpression(), !440)
    #dbg_value(i32 %285, !229, !DIExpression(), !440)
  %288 = icmp ult i32 %285, %287, !dbg !442
  %289 = mul i32 %287, %4, !dbg !443
  %290 = add i32 %289, %285, !dbg !443
  %291 = add i32 %285, %3, !dbg !443
  %292 = sub i32 %291, %287, !dbg !443
  %293 = select i1 %288, i32 %290, i32 %292, !dbg !443
    #dbg_value(i32 %293, !230, !DIExpression(), !440)
  %294 = getelementptr inbounds nuw i32, ptr %245, i32 %283, !dbg !444
  store i32 %293, ptr %294, align 4, !dbg !445, !tbaa !282
  %295 = add nuw i32 %270, 2, !dbg !447
    #dbg_value(i32 %295, !221, !DIExpression(), !436)
  %296 = add i32 %271, 2, !dbg !438
  %297 = icmp eq i32 %296, %252, !dbg !438
  br i1 %297, label %253, label %269, !dbg !438, !llvm.loop !448
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_left_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !450 {
    #dbg_value(i32 %0, !454, !DIExpression(), !465)
    #dbg_value(i32 %1, !455, !DIExpression(), !465)
    #dbg_value(i32 %2, !456, !DIExpression(), !465)
    #dbg_value(i32 %3, !457, !DIExpression(), !465)
    #dbg_value(i32 %0, !458, !DIExpression(), !465)
  %5 = icmp ult i32 %0, %2, !dbg !466
  %6 = sub i32 0, %2, !dbg !467
  %7 = select i1 %5, i32 %3, i32 %6, !dbg !467
  %8 = add i32 %7, %1, !dbg !467
    #dbg_value(i32 %8, !459, !DIExpression(), !465)
  ret i32 %8, !dbg !468
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_right_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !469 {
    #dbg_value(i32 %0, !471, !DIExpression(), !485)
    #dbg_value(i32 %1, !472, !DIExpression(), !485)
    #dbg_value(i32 %2, !473, !DIExpression(), !485)
    #dbg_value(i32 %3, !474, !DIExpression(), !485)
    #dbg_value(i32 %0, !475, !DIExpression(), !485)
    #dbg_value(i32 3, !476, !DIExpression(), !485)
    #dbg_value(i32 poison, !477, !DIExpression(), !485)
  %5 = urem i32 %0, 3, !dbg !486
    #dbg_value(i32 %5, !477, !DIExpression(), !485)
    #dbg_value(i32 %5, !477, !DIExpression(), !485)
    #dbg_value(i32 %5, !478, !DIExpression(), !485)
  %6 = icmp eq i32 %5, 0, !dbg !489
  %7 = mul i32 %3, %1, !dbg !490
  %8 = add i32 %2, %1, !dbg !490
  %9 = select i1 %6, i32 %7, i32 %8, !dbg !490
    #dbg_value(i32 %9, !479, !DIExpression(), !485)
  ret i32 %9, !dbg !491
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_pair_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !492 {
    #dbg_value(i32 %0, !494, !DIExpression(), !507)
    #dbg_value(i32 %1, !495, !DIExpression(), !507)
    #dbg_value(i32 %2, !496, !DIExpression(), !507)
    #dbg_value(i32 %3, !497, !DIExpression(), !507)
    #dbg_value(i32 %0, !498, !DIExpression(), !507)
  %5 = icmp ult i32 %0, %1, !dbg !508
  %6 = mul i32 %3, %1, !dbg !509
  %7 = add i32 %6, %0, !dbg !509
  %8 = sub i32 %0, %1, !dbg !509
  %9 = add i32 %8, %2, !dbg !509
  %10 = select i1 %5, i32 %7, i32 %9, !dbg !509
    #dbg_value(i32 %10, !499, !DIExpression(), !507)
  ret i32 %10, !dbg !510
}

; Function Attrs: nounwind uwtable
define hidden i32 @lang_fn_pipeline38_right_padded_zip_u32_into(ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %1, i32 noundef %2, i32 noundef %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #2 !dbg !511 {
    #dbg_declare(ptr %0, !515, !DIExpression(), !581)
    #dbg_declare(ptr %1, !516, !DIExpression(), !582)
    #dbg_value(i32 %2, !517, !DIExpression(), !583)
    #dbg_value(i32 %3, !518, !DIExpression(), !583)
    #dbg_value(ptr %4, !519, !DIExpression(), !583)
  %6 = load ptr, ptr %0, align 4, !dbg !584, !tbaa !242
  %7 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !584
  %8 = load i32, ptr %7, align 4, !dbg !584, !tbaa !27
    #dbg_value(ptr %6, !520, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !583)
    #dbg_value(i32 %8, !520, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !583)
    #dbg_value(i32 %8, !55, !DIExpression(), !585)
    #dbg_value(i32 4, !56, !DIExpression(), !585)
  %9 = icmp ugt i32 %8, 1073741823, !dbg !587
  %10 = load i32, ptr @ink_top, align 4
  %11 = icmp ugt i32 %10, -8
  %12 = select i1 %9, i1 true, i1 %11, !dbg !588
  br i1 %12, label %13, label %14, !dbg !588

13:                                               ; preds = %5
  tail call void @llvm.trap(), !dbg !589
  unreachable, !dbg !591

14:                                               ; preds = %5
  %15 = icmp eq i32 %10, 0, !dbg !592
  %16 = add nuw i32 %10, 7, !dbg !593
  %17 = select i1 %15, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %16, !dbg !594
  %18 = and i32 %17, -8, !dbg !595
    #dbg_value(i32 %18, !57, !DIExpression(), !585)
  %19 = tail call i32 @llvm.umax.i32(i32 %8, i32 1), !dbg !596
  %20 = shl nuw i32 %19, 2, !dbg !597
    #dbg_value(i32 %20, !58, !DIExpression(), !585)
  %21 = xor i32 %18, -1, !dbg !598
  %22 = icmp ugt i32 %20, %21, !dbg !599
  br i1 %22, label %23, label %24, !dbg !599

23:                                               ; preds = %14
  tail call void @llvm.trap(), !dbg !600
  unreachable, !dbg !602

24:                                               ; preds = %14
  %25 = add i32 %18, %20, !dbg !603
  store i32 %25, ptr @ink_top, align 4, !dbg !604, !tbaa !27
  %26 = add i32 %25, 65535, !dbg !605
  %27 = lshr i32 %26, 16, !dbg !606
    #dbg_value(i32 %27, !59, !DIExpression(), !585)
  %28 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !607
    #dbg_value(i32 %28, !60, !DIExpression(), !585)
  %29 = icmp ugt i32 %27, %28, !dbg !608
  br i1 %29, label %30, label %35, !dbg !609

30:                                               ; preds = %24
  %31 = sub nuw nsw i32 %27, %28, !dbg !610
  %32 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %31), !dbg !611
  %33 = icmp eq i32 %32, -1, !dbg !612
  br i1 %33, label %34, label %35, !dbg !609

34:                                               ; preds = %30
  tail call void @llvm.trap(), !dbg !613
  unreachable, !dbg !615

35:                                               ; preds = %24, %30
  %36 = inttoptr i32 %18 to ptr, !dbg !616
    #dbg_value(ptr %36, !521, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !583)
    #dbg_value(i32 %8, !521, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !583)
    #dbg_value(i32 0, !522, !DIExpression(), !617)
  %37 = icmp eq i32 %8, 0, !dbg !618
  br i1 %37, label %54, label %38, !dbg !619

38:                                               ; preds = %35
  %39 = sub i32 0, %2
  %40 = and i32 %8, 1, !dbg !619
  %41 = icmp eq i32 %8, 1, !dbg !619
  br i1 %41, label %44, label %42, !dbg !619

42:                                               ; preds = %38
  %43 = and i32 %8, 1073741822, !dbg !619
  br label %84, !dbg !619

44:                                               ; preds = %84, %38
  %45 = phi i32 [ 0, %38 ], [ %100, %84 ]
  %46 = icmp eq i32 %40, 0, !dbg !619
  br i1 %46, label %54, label %47, !dbg !619

47:                                               ; preds = %44
    #dbg_value(i32 %45, !522, !DIExpression(), !617)
    #dbg_value(i32 %45, !524, !DIExpression(), !620)
  %48 = getelementptr inbounds nuw i32, ptr %6, i32 %45, !dbg !621
  %49 = load i32, ptr %48, align 4, !dbg !621, !tbaa !282
    #dbg_value(i32 %49, !527, !DIExpression(), !620)
    #dbg_value(i32 %2, !528, !DIExpression(), !620)
    #dbg_value(i32 %3, !529, !DIExpression(), !620)
    #dbg_value(i32 %45, !530, !DIExpression(), !620)
  %50 = icmp ult i32 %45, %2, !dbg !622
  %51 = select i1 %50, i32 %3, i32 %39, !dbg !623
  %52 = add i32 %49, %51, !dbg !623
    #dbg_value(i32 %52, !531, !DIExpression(), !620)
  %53 = getelementptr inbounds nuw i32, ptr %36, i32 %45, !dbg !624
  store i32 %52, ptr %53, align 4, !dbg !625, !tbaa !282
    #dbg_value(i32 %45, !522, !DIExpression(DW_OP_plus_uconst, 1, DW_OP_stack_value), !617)
  br label %54

54:                                               ; preds = %47, %44, %35
    #dbg_value(ptr %36, !537, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !583)
    #dbg_value(i32 %8, !537, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !583)
    #dbg_value(ptr %6, !538, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !583)
    #dbg_value(i32 %8, !538, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !583)
    #dbg_value(i32 %8, !55, !DIExpression(), !626)
    #dbg_value(i32 4, !56, !DIExpression(), !626)
  %55 = load i32, ptr @ink_top, align 4
  %56 = icmp ugt i32 %55, -8
  br i1 %56, label %57, label %58, !dbg !628

57:                                               ; preds = %54
  tail call void @llvm.trap(), !dbg !629
  unreachable, !dbg !631

58:                                               ; preds = %54
  %59 = icmp eq i32 %55, 0, !dbg !632
  %60 = add nuw i32 %55, 7, !dbg !633
  %61 = select i1 %59, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %60, !dbg !634
  %62 = and i32 %61, -8, !dbg !635
    #dbg_value(i32 %62, !57, !DIExpression(), !626)
    #dbg_value(i32 %20, !58, !DIExpression(), !626)
  %63 = xor i32 %62, -1, !dbg !636
  %64 = icmp ugt i32 %20, %63, !dbg !637
  br i1 %64, label %65, label %66, !dbg !637

65:                                               ; preds = %58
  tail call void @llvm.trap(), !dbg !638
  unreachable, !dbg !640

66:                                               ; preds = %58
  %67 = add i32 %62, %20, !dbg !641
  store i32 %67, ptr @ink_top, align 4, !dbg !642, !tbaa !27
  %68 = add i32 %67, 65535, !dbg !643
  %69 = lshr i32 %68, 16, !dbg !644
    #dbg_value(i32 %69, !59, !DIExpression(), !626)
  %70 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !645
    #dbg_value(i32 %70, !60, !DIExpression(), !626)
  %71 = icmp ugt i32 %69, %70, !dbg !646
  br i1 %71, label %72, label %77, !dbg !647

72:                                               ; preds = %66
  %73 = sub nuw nsw i32 %69, %70, !dbg !648
  %74 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %73), !dbg !649
  %75 = icmp eq i32 %74, -1, !dbg !650
  br i1 %75, label %76, label %77, !dbg !647

76:                                               ; preds = %72
  tail call void @llvm.trap(), !dbg !651
  unreachable, !dbg !653

77:                                               ; preds = %66, %72
  %78 = inttoptr i32 %62 to ptr, !dbg !654
    #dbg_value(ptr %78, !539, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !583)
    #dbg_value(i32 %8, !539, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !583)
    #dbg_value(i32 0, !540, !DIExpression(), !655)
  br i1 %37, label %115, label %79, !dbg !656

79:                                               ; preds = %77
  %80 = and i32 %8, 1, !dbg !656
  %81 = icmp eq i32 %8, 1, !dbg !656
  br i1 %81, label %103, label %82, !dbg !656

82:                                               ; preds = %79
  %83 = and i32 %8, 1073741822, !dbg !656
  br label %121, !dbg !656

84:                                               ; preds = %84, %42
  %85 = phi i32 [ 0, %42 ], [ %100, %84 ]
  %86 = phi i32 [ 0, %42 ], [ %101, %84 ]
    #dbg_value(i32 %85, !522, !DIExpression(), !617)
    #dbg_value(i32 %85, !524, !DIExpression(), !620)
  %87 = getelementptr inbounds nuw i32, ptr %6, i32 %85, !dbg !621
  %88 = load i32, ptr %87, align 4, !dbg !621, !tbaa !282
    #dbg_value(i32 %88, !527, !DIExpression(), !620)
    #dbg_value(i32 %2, !528, !DIExpression(), !620)
    #dbg_value(i32 %3, !529, !DIExpression(), !620)
    #dbg_value(i32 %85, !530, !DIExpression(), !620)
  %89 = icmp ult i32 %85, %2, !dbg !622
  %90 = select i1 %89, i32 %3, i32 %39, !dbg !623
  %91 = add i32 %88, %90, !dbg !623
    #dbg_value(i32 %91, !531, !DIExpression(), !620)
  %92 = getelementptr inbounds nuw i32, ptr %36, i32 %85, !dbg !624
  store i32 %91, ptr %92, align 8, !dbg !625, !tbaa !282
  %93 = or disjoint i32 %85, 1, !dbg !657
    #dbg_value(i32 %93, !522, !DIExpression(), !617)
    #dbg_value(i32 %93, !524, !DIExpression(), !620)
  %94 = getelementptr inbounds nuw i32, ptr %6, i32 %93, !dbg !621
  %95 = load i32, ptr %94, align 4, !dbg !621, !tbaa !282
    #dbg_value(i32 %95, !527, !DIExpression(), !620)
    #dbg_value(i32 %93, !530, !DIExpression(), !620)
  %96 = icmp ult i32 %93, %2, !dbg !622
  %97 = select i1 %96, i32 %3, i32 %39, !dbg !623
  %98 = add i32 %95, %97, !dbg !623
    #dbg_value(i32 %98, !531, !DIExpression(), !620)
  %99 = getelementptr inbounds nuw i32, ptr %36, i32 %93, !dbg !624
  store i32 %98, ptr %99, align 4, !dbg !625, !tbaa !282
  %100 = add nuw i32 %85, 2, !dbg !657
    #dbg_value(i32 %100, !522, !DIExpression(), !617)
  %101 = add i32 %86, 2, !dbg !619
  %102 = icmp eq i32 %101, %43, !dbg !619
  br i1 %102, label %44, label %84, !dbg !619, !llvm.loop !658

103:                                              ; preds = %121, %79
  %104 = phi i32 [ 0, %79 ], [ %141, %121 ]
  %105 = icmp eq i32 %80, 0, !dbg !656
  br i1 %105, label %115, label %106, !dbg !656

106:                                              ; preds = %103
    #dbg_value(i32 %104, !540, !DIExpression(), !655)
    #dbg_value(i32 %104, !542, !DIExpression(), !660)
  %107 = getelementptr inbounds nuw i32, ptr %6, i32 %104, !dbg !661
  %108 = load i32, ptr %107, align 4, !dbg !661, !tbaa !282
    #dbg_value(i32 %108, !545, !DIExpression(), !660)
    #dbg_value(i32 %2, !546, !DIExpression(), !660)
    #dbg_value(i32 %3, !547, !DIExpression(), !660)
    #dbg_value(i32 %104, !548, !DIExpression(), !660)
    #dbg_value(i32 3, !549, !DIExpression(), !660)
    #dbg_value(i32 poison, !550, !DIExpression(), !660)
  %109 = urem i32 %104, 3, !dbg !662
    #dbg_value(i32 %109, !550, !DIExpression(), !660)
    #dbg_value(i32 %109, !551, !DIExpression(), !660)
  %110 = icmp eq i32 %109, 0, !dbg !665
  %111 = mul i32 %108, %3, !dbg !666
  %112 = add i32 %108, %2, !dbg !666
  %113 = select i1 %110, i32 %111, i32 %112, !dbg !666
    #dbg_value(i32 %113, !552, !DIExpression(), !660)
  %114 = getelementptr inbounds nuw i32, ptr %78, i32 %104, !dbg !667
  store i32 %113, ptr %114, align 4, !dbg !668, !tbaa !282
    #dbg_value(i32 %104, !540, !DIExpression(DW_OP_plus_uconst, 1, DW_OP_stack_value), !655)
  br label %115, !dbg !669

115:                                              ; preds = %106, %103, %77
    #dbg_value(ptr %78, !558, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !583)
    #dbg_value(i32 %8, !558, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !583)
  %116 = load ptr, ptr %1, align 4, !dbg !669, !tbaa !242
  %117 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !669
  %118 = load i32, ptr %117, align 4, !dbg !669, !tbaa !27
    #dbg_value(ptr %116, !559, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !583)
    #dbg_value(i32 %118, !559, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !583)
  %119 = xor i32 %118, -1, !dbg !670
  %120 = icmp ugt i32 %8, %119, !dbg !672
  br i1 %120, label %144, label %145, !dbg !672

121:                                              ; preds = %121, %82
  %122 = phi i32 [ 0, %82 ], [ %141, %121 ]
  %123 = phi i32 [ 0, %82 ], [ %142, %121 ]
    #dbg_value(i32 %122, !540, !DIExpression(), !655)
    #dbg_value(i32 %122, !542, !DIExpression(), !660)
  %124 = getelementptr inbounds nuw i32, ptr %6, i32 %122, !dbg !661
  %125 = load i32, ptr %124, align 4, !dbg !661, !tbaa !282
    #dbg_value(i32 %125, !545, !DIExpression(), !660)
    #dbg_value(i32 %2, !546, !DIExpression(), !660)
    #dbg_value(i32 %3, !547, !DIExpression(), !660)
    #dbg_value(i32 %122, !548, !DIExpression(), !660)
    #dbg_value(i32 3, !549, !DIExpression(), !660)
    #dbg_value(i32 poison, !550, !DIExpression(), !660)
  %126 = urem i32 %122, 3, !dbg !662
    #dbg_value(i32 %126, !550, !DIExpression(), !660)
    #dbg_value(i32 %126, !551, !DIExpression(), !660)
  %127 = icmp eq i32 %126, 0, !dbg !665
  %128 = mul i32 %125, %3, !dbg !666
  %129 = add i32 %125, %2, !dbg !666
  %130 = select i1 %127, i32 %128, i32 %129, !dbg !666
    #dbg_value(i32 %130, !552, !DIExpression(), !660)
  %131 = getelementptr inbounds nuw i32, ptr %78, i32 %122, !dbg !667
  store i32 %130, ptr %131, align 8, !dbg !668, !tbaa !282
  %132 = or disjoint i32 %122, 1, !dbg !673
    #dbg_value(i32 %132, !540, !DIExpression(), !655)
    #dbg_value(i32 %132, !542, !DIExpression(), !660)
  %133 = getelementptr inbounds nuw i32, ptr %6, i32 %132, !dbg !661
  %134 = load i32, ptr %133, align 4, !dbg !661, !tbaa !282
    #dbg_value(i32 %134, !545, !DIExpression(), !660)
    #dbg_value(i32 %132, !548, !DIExpression(), !660)
    #dbg_value(i32 poison, !550, !DIExpression(), !660)
  %135 = urem i32 %132, 3, !dbg !662
    #dbg_value(i32 %135, !550, !DIExpression(), !660)
    #dbg_value(i32 %135, !551, !DIExpression(), !660)
  %136 = icmp eq i32 %135, 0, !dbg !665
  %137 = mul i32 %134, %3, !dbg !666
  %138 = add i32 %134, %2, !dbg !666
  %139 = select i1 %136, i32 %137, i32 %138, !dbg !666
    #dbg_value(i32 %139, !552, !DIExpression(), !660)
  %140 = getelementptr inbounds nuw i32, ptr %78, i32 %132, !dbg !667
  store i32 %139, ptr %140, align 4, !dbg !668, !tbaa !282
  %141 = add nuw i32 %122, 2, !dbg !673
    #dbg_value(i32 %141, !540, !DIExpression(), !655)
  %142 = add i32 %123, 2, !dbg !656
  %143 = icmp eq i32 %142, %83, !dbg !656
  br i1 %143, label %103, label %121, !dbg !656, !llvm.loop !674

144:                                              ; preds = %115
  tail call void @llvm.trap(), !dbg !676
  unreachable, !dbg !678

145:                                              ; preds = %115
  %146 = add i32 %118, %8, !dbg !679
    #dbg_value(i32 %146, !560, !DIExpression(), !583)
    #dbg_value(i32 %146, !55, !DIExpression(), !680)
    #dbg_value(i32 4, !56, !DIExpression(), !680)
  %147 = icmp ugt i32 %146, 1073741823, !dbg !682
  %148 = load i32, ptr @ink_top, align 4
  %149 = icmp ugt i32 %148, -8
  %150 = select i1 %147, i1 true, i1 %149, !dbg !683
  br i1 %150, label %151, label %152, !dbg !683

151:                                              ; preds = %145
  tail call void @llvm.trap(), !dbg !684
  unreachable, !dbg !686

152:                                              ; preds = %145
  %153 = icmp eq i32 %148, 0, !dbg !687
  %154 = add nuw i32 %148, 7, !dbg !688
  %155 = select i1 %153, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %154, !dbg !689
  %156 = and i32 %155, -8, !dbg !690
    #dbg_value(i32 %156, !57, !DIExpression(), !680)
  %157 = tail call i32 @llvm.umax.i32(i32 %146, i32 1), !dbg !691
  %158 = shl nuw i32 %157, 2, !dbg !692
    #dbg_value(i32 %158, !58, !DIExpression(), !680)
  %159 = xor i32 %156, -1, !dbg !693
  %160 = icmp ugt i32 %158, %159, !dbg !694
  br i1 %160, label %161, label %162, !dbg !694

161:                                              ; preds = %152
  tail call void @llvm.trap(), !dbg !695
  unreachable, !dbg !697

162:                                              ; preds = %152
  %163 = add i32 %156, %158, !dbg !698
  store i32 %163, ptr @ink_top, align 4, !dbg !699, !tbaa !27
  %164 = add i32 %163, 65535, !dbg !700
  %165 = lshr i32 %164, 16, !dbg !701
    #dbg_value(i32 %165, !59, !DIExpression(), !680)
  %166 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !702
    #dbg_value(i32 %166, !60, !DIExpression(), !680)
  %167 = icmp ugt i32 %165, %166, !dbg !703
  br i1 %167, label %168, label %173, !dbg !704

168:                                              ; preds = %162
  %169 = sub nuw nsw i32 %165, %166, !dbg !705
  %170 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %169), !dbg !706
  %171 = icmp eq i32 %170, -1, !dbg !707
  br i1 %171, label %172, label %173, !dbg !704

172:                                              ; preds = %168
  tail call void @llvm.trap(), !dbg !708
  unreachable, !dbg !710

173:                                              ; preds = %162, %168
  %174 = inttoptr i32 %156 to ptr, !dbg !711
    #dbg_value(ptr %174, !561, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !583)
    #dbg_value(i32 %146, !561, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !583)
  %175 = shl nuw i32 %8, 2, !dbg !712
    #dbg_value(ptr %174, !110, !DIExpression(), !713)
    #dbg_value(ptr %78, !115, !DIExpression(), !713)
    #dbg_value(i32 %175, !116, !DIExpression(), !713)
    #dbg_value(ptr %174, !117, !DIExpression(), !713)
    #dbg_value(ptr %78, !119, !DIExpression(), !713)
    #dbg_value(i32 0, !122, !DIExpression(), !715)
  br i1 %37, label %195, label %176, !dbg !716

176:                                              ; preds = %173, %176
  %177 = phi i32 [ %193, %176 ], [ 0, %173 ]
    #dbg_value(i32 %177, !122, !DIExpression(), !715)
  %178 = getelementptr inbounds nuw i8, ptr %78, i32 %177, !dbg !717
  %179 = load i8, ptr %178, align 4, !dbg !717, !tbaa !131
  %180 = getelementptr inbounds nuw i8, ptr %174, i32 %177, !dbg !718
  store i8 %179, ptr %180, align 4, !dbg !719, !tbaa !131
  %181 = or disjoint i32 %177, 1, !dbg !720
    #dbg_value(i32 %181, !122, !DIExpression(), !715)
  %182 = getelementptr inbounds nuw i8, ptr %78, i32 %181, !dbg !717
  %183 = load i8, ptr %182, align 1, !dbg !717, !tbaa !131
  %184 = getelementptr inbounds nuw i8, ptr %174, i32 %181, !dbg !718
  store i8 %183, ptr %184, align 1, !dbg !719, !tbaa !131
  %185 = or disjoint i32 %177, 2, !dbg !720
    #dbg_value(i32 %185, !122, !DIExpression(), !715)
  %186 = getelementptr inbounds nuw i8, ptr %78, i32 %185, !dbg !717
  %187 = load i8, ptr %186, align 2, !dbg !717, !tbaa !131
  %188 = getelementptr inbounds nuw i8, ptr %174, i32 %185, !dbg !718
  store i8 %187, ptr %188, align 2, !dbg !719, !tbaa !131
  %189 = or disjoint i32 %177, 3, !dbg !720
    #dbg_value(i32 %189, !122, !DIExpression(), !715)
  %190 = getelementptr inbounds nuw i8, ptr %78, i32 %189, !dbg !717
  %191 = load i8, ptr %190, align 1, !dbg !717, !tbaa !131
  %192 = getelementptr inbounds nuw i8, ptr %174, i32 %189, !dbg !718
  store i8 %191, ptr %192, align 1, !dbg !719, !tbaa !131
  %193 = add nuw i32 %177, 4, !dbg !720
    #dbg_value(i32 %193, !122, !DIExpression(), !715)
  %194 = icmp eq i32 %193, %175, !dbg !721
  br i1 %194, label %195, label %176, !dbg !716, !llvm.loop !722

195:                                              ; preds = %176, %173
  %196 = getelementptr inbounds nuw i32, ptr %174, i32 %8, !dbg !724
  %197 = shl i32 %118, 2, !dbg !725
    #dbg_value(ptr %196, !110, !DIExpression(), !726)
    #dbg_value(ptr %116, !115, !DIExpression(), !726)
    #dbg_value(i32 %197, !116, !DIExpression(), !726)
    #dbg_value(ptr %196, !117, !DIExpression(), !726)
    #dbg_value(ptr %116, !119, !DIExpression(), !726)
    #dbg_value(i32 0, !122, !DIExpression(), !728)
  %198 = icmp eq i32 %197, 0, !dbg !729
  br i1 %198, label %218, label %199, !dbg !730

199:                                              ; preds = %195, %199
  %200 = phi i32 [ %216, %199 ], [ 0, %195 ]
    #dbg_value(i32 %200, !122, !DIExpression(), !728)
  %201 = getelementptr inbounds nuw i8, ptr %116, i32 %200, !dbg !731
  %202 = load i8, ptr %201, align 1, !dbg !731, !tbaa !131
  %203 = getelementptr inbounds nuw i8, ptr %196, i32 %200, !dbg !732
  store i8 %202, ptr %203, align 4, !dbg !733, !tbaa !131
  %204 = or disjoint i32 %200, 1, !dbg !734
    #dbg_value(i32 %204, !122, !DIExpression(), !728)
  %205 = getelementptr inbounds nuw i8, ptr %116, i32 %204, !dbg !731
  %206 = load i8, ptr %205, align 1, !dbg !731, !tbaa !131
  %207 = getelementptr inbounds nuw i8, ptr %196, i32 %204, !dbg !732
  store i8 %206, ptr %207, align 1, !dbg !733, !tbaa !131
  %208 = or disjoint i32 %200, 2, !dbg !734
    #dbg_value(i32 %208, !122, !DIExpression(), !728)
  %209 = getelementptr inbounds nuw i8, ptr %116, i32 %208, !dbg !731
  %210 = load i8, ptr %209, align 1, !dbg !731, !tbaa !131
  %211 = getelementptr inbounds nuw i8, ptr %196, i32 %208, !dbg !732
  store i8 %210, ptr %211, align 2, !dbg !733, !tbaa !131
  %212 = or disjoint i32 %200, 3, !dbg !734
    #dbg_value(i32 %212, !122, !DIExpression(), !728)
  %213 = getelementptr inbounds nuw i8, ptr %116, i32 %212, !dbg !731
  %214 = load i8, ptr %213, align 1, !dbg !731, !tbaa !131
  %215 = getelementptr inbounds nuw i8, ptr %196, i32 %212, !dbg !732
  store i8 %214, ptr %215, align 1, !dbg !733, !tbaa !131
  %216 = add nuw i32 %200, 4, !dbg !734
    #dbg_value(i32 %216, !122, !DIExpression(), !728)
  %217 = icmp eq i32 %216, %197, !dbg !729
  br i1 %217, label %218, label %199, !dbg !730, !llvm.loop !735

218:                                              ; preds = %199, %195
    #dbg_value(ptr %174, !562, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !583)
    #dbg_value(i32 %146, !562, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !583)
    #dbg_value(ptr %4, !563, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !583)
  %219 = tail call i32 @llvm.umin.i32(i32 %8, i32 %146), !dbg !737
    #dbg_value(i32 %219, !563, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !583)
    #dbg_value(i32 0, !564, !DIExpression(), !738)
  %220 = icmp eq i32 %219, 0, !dbg !739
  br i1 %220, label %241, label %221, !dbg !740

221:                                              ; preds = %218
  %222 = and i32 %219, 1, !dbg !740
  %223 = icmp eq i32 %219, 1, !dbg !740
  br i1 %223, label %226, label %224, !dbg !740

224:                                              ; preds = %221
  %225 = and i32 %219, 1073741822, !dbg !740
  br label %242, !dbg !740

226:                                              ; preds = %242, %221
  %227 = phi i32 [ 0, %221 ], [ %268, %242 ]
  %228 = icmp eq i32 %222, 0, !dbg !740
  br i1 %228, label %241, label %229, !dbg !740

229:                                              ; preds = %226
    #dbg_value(i32 %227, !564, !DIExpression(), !738)
  %230 = getelementptr inbounds nuw i32, ptr %36, i32 %227, !dbg !741
  %231 = load i32, ptr %230, align 4, !dbg !741, !tbaa !282
    #dbg_value(i32 %231, !566, !DIExpression(), !742)
  %232 = getelementptr inbounds nuw i32, ptr %174, i32 %227, !dbg !743
  %233 = load i32, ptr %232, align 4, !dbg !743, !tbaa !282
    #dbg_value(i32 %233, !569, !DIExpression(), !742)
    #dbg_value(i32 %2, !570, !DIExpression(), !742)
    #dbg_value(i32 %3, !571, !DIExpression(), !742)
    #dbg_value(i32 %231, !572, !DIExpression(), !742)
  %234 = icmp ult i32 %231, %233, !dbg !744
  %235 = mul i32 %233, %3, !dbg !745
  %236 = add i32 %235, %231, !dbg !745
  %237 = add i32 %231, %2, !dbg !745
  %238 = sub i32 %237, %233, !dbg !745
  %239 = select i1 %234, i32 %236, i32 %238, !dbg !745
    #dbg_value(i32 %239, !573, !DIExpression(), !742)
  %240 = getelementptr inbounds nuw i32, ptr %4, i32 %227, !dbg !746
  store i32 %239, ptr %240, align 4, !dbg !747, !tbaa !282
    #dbg_value(i32 %227, !564, !DIExpression(DW_OP_plus_uconst, 1, DW_OP_stack_value), !738)
  br label %241, !dbg !748

241:                                              ; preds = %229, %226, %218
  ret i32 %219, !dbg !748

242:                                              ; preds = %242, %224
  %243 = phi i32 [ 0, %224 ], [ %268, %242 ]
  %244 = phi i32 [ 0, %224 ], [ %269, %242 ]
    #dbg_value(i32 %243, !564, !DIExpression(), !738)
  %245 = getelementptr inbounds nuw i32, ptr %36, i32 %243, !dbg !741
  %246 = load i32, ptr %245, align 8, !dbg !741, !tbaa !282
    #dbg_value(i32 %246, !566, !DIExpression(), !742)
  %247 = getelementptr inbounds nuw i32, ptr %174, i32 %243, !dbg !743
  %248 = load i32, ptr %247, align 8, !dbg !743, !tbaa !282
    #dbg_value(i32 %248, !569, !DIExpression(), !742)
    #dbg_value(i32 %2, !570, !DIExpression(), !742)
    #dbg_value(i32 %3, !571, !DIExpression(), !742)
    #dbg_value(i32 %246, !572, !DIExpression(), !742)
  %249 = icmp ult i32 %246, %248, !dbg !744
  %250 = mul i32 %248, %3, !dbg !745
  %251 = add i32 %250, %246, !dbg !745
  %252 = add i32 %246, %2, !dbg !745
  %253 = sub i32 %252, %248, !dbg !745
  %254 = select i1 %249, i32 %251, i32 %253, !dbg !745
    #dbg_value(i32 %254, !573, !DIExpression(), !742)
  %255 = getelementptr inbounds nuw i32, ptr %4, i32 %243, !dbg !746
  store i32 %254, ptr %255, align 4, !dbg !747, !tbaa !282
  %256 = or disjoint i32 %243, 1, !dbg !749
    #dbg_value(i32 %256, !564, !DIExpression(), !738)
  %257 = getelementptr inbounds nuw i32, ptr %36, i32 %256, !dbg !741
  %258 = load i32, ptr %257, align 4, !dbg !741, !tbaa !282
    #dbg_value(i32 %258, !566, !DIExpression(), !742)
  %259 = getelementptr inbounds nuw i32, ptr %174, i32 %256, !dbg !743
  %260 = load i32, ptr %259, align 4, !dbg !743, !tbaa !282
    #dbg_value(i32 %260, !569, !DIExpression(), !742)
    #dbg_value(i32 %258, !572, !DIExpression(), !742)
  %261 = icmp ult i32 %258, %260, !dbg !744
  %262 = mul i32 %260, %3, !dbg !745
  %263 = add i32 %262, %258, !dbg !745
  %264 = add i32 %258, %2, !dbg !745
  %265 = sub i32 %264, %260, !dbg !745
  %266 = select i1 %261, i32 %263, i32 %265, !dbg !745
    #dbg_value(i32 %266, !573, !DIExpression(), !742)
  %267 = getelementptr inbounds nuw i32, ptr %4, i32 %256, !dbg !746
  store i32 %266, ptr %267, align 4, !dbg !747, !tbaa !282
  %268 = add nuw i32 %243, 2, !dbg !749
    #dbg_value(i32 %268, !564, !DIExpression(), !738)
  %269 = add i32 %244, 2, !dbg !740
  %270 = icmp eq i32 %269, %225, !dbg !740
  br i1 %270, label %226, label %242, !dbg !740, !llvm.loop !750
}

; Function Attrs: nounwind uwtable
define hidden i32 @ink_compute_into(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readonly %2, ptr nocapture noundef writeonly %3) local_unnamed_addr #2 !dbg !752 {
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
  %5 = alloca %struct.ink_l_uint32, align 4
  %6 = alloca %struct.ink_l_uint32, align 4
    #dbg_value(i32 %0, !760, !DIExpression(), !774)
    #dbg_value(ptr %1, !761, !DIExpression(), !774)
    #dbg_value(ptr %2, !762, !DIExpression(), !774)
    #dbg_value(ptr %3, !763, !DIExpression(), !774)
  %7 = icmp eq i32 %0, 0, !dbg !775
  br i1 %7, label %8, label %56, !dbg !775

8:                                                ; preds = %4
  %9 = load ptr, ptr %1, align 4, !dbg !776, !tbaa !777
    #dbg_value(ptr %9, !764, !DIExpression(), !778)
  %10 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !779
  %11 = load ptr, ptr %10, align 4, !dbg !779, !tbaa !777
    #dbg_value(ptr %11, !767, !DIExpression(), !778)
  %12 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !780
  %13 = load ptr, ptr %12, align 4, !dbg !780, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !770)
    #dbg_value(ptr %13, !115, !DIExpression(), !770)
    #dbg_value(i32 4, !116, !DIExpression(), !770)
    #dbg_value(ptr undef, !117, !DIExpression(), !770)
    #dbg_value(ptr %13, !119, !DIExpression(), !770)
    #dbg_value(i32 0, !122, !DIExpression(), !781)
  %14 = load i8, ptr %13, align 1, !dbg !782, !tbaa !131
    #dbg_value(i8 %14, !768, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !778)
    #dbg_value(i32 1, !122, !DIExpression(), !781)
  %15 = getelementptr inbounds nuw i8, ptr %13, i32 1, !dbg !782
  %16 = load i8, ptr %15, align 1, !dbg !782, !tbaa !131
    #dbg_value(i8 %16, !768, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !778)
    #dbg_value(i32 2, !122, !DIExpression(), !781)
  %17 = getelementptr inbounds nuw i8, ptr %13, i32 2, !dbg !782
  %18 = load i8, ptr %17, align 1, !dbg !782, !tbaa !131
    #dbg_value(i8 %18, !768, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !778)
    #dbg_value(i32 3, !122, !DIExpression(), !781)
  %19 = getelementptr inbounds nuw i8, ptr %13, i32 3, !dbg !782
  %20 = load i8, ptr %19, align 1, !dbg !782, !tbaa !131
    #dbg_value(i8 %20, !768, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !778)
    #dbg_value(i32 4, !122, !DIExpression(), !781)
  %21 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !783
  %22 = load ptr, ptr %21, align 4, !dbg !783, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !772)
    #dbg_value(ptr %22, !115, !DIExpression(), !772)
    #dbg_value(i32 4, !116, !DIExpression(), !772)
    #dbg_value(ptr undef, !117, !DIExpression(), !772)
    #dbg_value(ptr %22, !119, !DIExpression(), !772)
    #dbg_value(i32 0, !122, !DIExpression(), !784)
  %23 = load i8, ptr %22, align 1, !dbg !785, !tbaa !131
    #dbg_value(i8 %23, !769, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !778)
    #dbg_value(i32 1, !122, !DIExpression(), !784)
  %24 = getelementptr inbounds nuw i8, ptr %22, i32 1, !dbg !785
  %25 = load i8, ptr %24, align 1, !dbg !785, !tbaa !131
    #dbg_value(i8 %25, !769, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !778)
    #dbg_value(i32 2, !122, !DIExpression(), !784)
  %26 = getelementptr inbounds nuw i8, ptr %22, i32 2, !dbg !785
  %27 = load i8, ptr %26, align 1, !dbg !785, !tbaa !131
    #dbg_value(i8 %27, !769, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !778)
    #dbg_value(i32 3, !122, !DIExpression(), !784)
  %28 = getelementptr inbounds nuw i8, ptr %22, i32 3, !dbg !785
  %29 = load i8, ptr %28, align 1, !dbg !785, !tbaa !131
    #dbg_value(i8 %29, !769, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !778)
    #dbg_value(i32 4, !122, !DIExpression(), !784)
  store ptr %9, ptr %5, align 4, !dbg !786, !tbaa !433
  %30 = getelementptr inbounds nuw i8, ptr %5, i32 4, !dbg !786
  %31 = load i32, ptr %2, align 4, !dbg !787, !tbaa !27
  store i32 %31, ptr %30, align 4, !dbg !786, !tbaa !435
  store ptr %11, ptr %6, align 4, !dbg !788, !tbaa !433
  %32 = getelementptr inbounds nuw i8, ptr %6, i32 4, !dbg !788
  %33 = getelementptr inbounds nuw i8, ptr %2, i32 4, !dbg !789
  %34 = load i32, ptr %33, align 4, !dbg !789, !tbaa !27
  store i32 %34, ptr %32, align 4, !dbg !788, !tbaa !435
  %35 = zext i8 %20 to i32, !dbg !790
  %36 = shl nuw i32 %35, 24, !dbg !790
  %37 = zext i8 %18 to i32, !dbg !790
  %38 = shl nuw nsw i32 %37, 16, !dbg !790
  %39 = or disjoint i32 %36, %38, !dbg !790
  %40 = zext i8 %16 to i32, !dbg !790
  %41 = shl nuw nsw i32 %40, 8, !dbg !790
  %42 = or disjoint i32 %39, %41, !dbg !790
  %43 = zext i8 %14 to i32, !dbg !790
  %44 = or disjoint i32 %42, %43, !dbg !790
  %45 = zext i8 %29 to i32, !dbg !791
  %46 = shl nuw i32 %45, 24, !dbg !791
  %47 = zext i8 %27 to i32, !dbg !791
  %48 = shl nuw nsw i32 %47, 16, !dbg !791
  %49 = or disjoint i32 %46, %48, !dbg !791
  %50 = zext i8 %25 to i32, !dbg !791
  %51 = shl nuw nsw i32 %50, 8, !dbg !791
  %52 = or disjoint i32 %49, %51, !dbg !791
  %53 = zext i8 %23 to i32, !dbg !791
  %54 = or disjoint i32 %52, %53, !dbg !791
  %55 = tail call i32 @lang_fn_pipeline38_right_padded_zip_u32_into(ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %5, ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %6, i32 noundef %44, i32 noundef %54, ptr noundef %3) #13, !dbg !791
  ret i32 %55, !dbg !792

56:                                               ; preds = %4
  tail call void @llvm.trap(), !dbg !793
  unreachable, !dbg !795
}

; Function Attrs: nounwind uwtable
define hidden void @ink_compute_call(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readonly %2, ptr nocapture noundef writeonly %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #2 !dbg !796 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !835)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !835)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !835)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !835)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !835)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !835)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !835)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !835)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !837)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !837)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !837)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !837)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !837)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !837)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !837)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !837)
  %6 = alloca %struct.ink_l_uint32, align 4, !DIAssignID !839
    #dbg_assign(i1 undef, !813, !DIExpression(), !839, ptr %6, !DIExpression(), !840)
  %7 = alloca %struct.ink_l_uint32, align 4
  %8 = alloca %struct.ink_l_uint32, align 4
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !841)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !841)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !841)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !841)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !841)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !841)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !841)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !841)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !843)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !843)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !843)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !843)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !843)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !843)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !843)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !843)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !845)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !845)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !845)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !845)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !845)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !845)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !845)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !845)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !847)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !847)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !847)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !847)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !847)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !847)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !847)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !847)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !849)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !849)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !849)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !849)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !849)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !849)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !849)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !849)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !851)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !851)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !851)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !851)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !851)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !851)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !851)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !851)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !853)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !853)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !853)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !853)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !853)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !853)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !853)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !853)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !855)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !855)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !855)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !855)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !855)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !855)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !855)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !855)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !857)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !857)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !857)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !857)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !857)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !857)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !857)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !857)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !859)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !859)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !859)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !859)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !859)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !859)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !859)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !859)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !861)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !861)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !861)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !861)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !861)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !861)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !861)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !861)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !863)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !863)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !863)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !863)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !863)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !863)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !863)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !863)
    #dbg_value(i32 %0, !802, !DIExpression(), !865)
    #dbg_value(ptr %1, !803, !DIExpression(), !865)
    #dbg_value(ptr %2, !804, !DIExpression(), !865)
    #dbg_value(ptr %3, !805, !DIExpression(), !865)
    #dbg_value(ptr %4, !806, !DIExpression(), !865)
  switch i32 %0, label %362 [
    i32 0, label %9
    i32 1, label %59
    i32 2, label %159
    i32 3, label %260
  ], !dbg !866

9:                                                ; preds = %5
  %10 = load ptr, ptr %1, align 4, !dbg !867, !tbaa !777
    #dbg_value(ptr %10, !807, !DIExpression(), !840)
  %11 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !868
  %12 = load ptr, ptr %11, align 4, !dbg !868, !tbaa !777
    #dbg_value(ptr %12, !810, !DIExpression(), !840)
  %13 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !869
  %14 = load ptr, ptr %13, align 4, !dbg !869, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !835)
    #dbg_value(ptr %14, !115, !DIExpression(), !835)
    #dbg_value(i32 4, !116, !DIExpression(), !835)
    #dbg_value(ptr undef, !117, !DIExpression(), !835)
    #dbg_value(ptr %14, !119, !DIExpression(), !835)
    #dbg_value(i32 0, !122, !DIExpression(), !870)
  %15 = load i8, ptr %14, align 1, !dbg !871, !tbaa !131
    #dbg_value(i8 %15, !811, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !840)
    #dbg_value(i32 1, !122, !DIExpression(), !870)
  %16 = getelementptr inbounds nuw i8, ptr %14, i32 1, !dbg !871
  %17 = load i8, ptr %16, align 1, !dbg !871, !tbaa !131
    #dbg_value(i8 %17, !811, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !840)
    #dbg_value(i32 2, !122, !DIExpression(), !870)
  %18 = getelementptr inbounds nuw i8, ptr %14, i32 2, !dbg !871
  %19 = load i8, ptr %18, align 1, !dbg !871, !tbaa !131
    #dbg_value(i8 %19, !811, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !840)
    #dbg_value(i32 3, !122, !DIExpression(), !870)
  %20 = getelementptr inbounds nuw i8, ptr %14, i32 3, !dbg !871
  %21 = load i8, ptr %20, align 1, !dbg !871, !tbaa !131
    #dbg_value(i8 %21, !811, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !840)
    #dbg_value(i32 4, !122, !DIExpression(), !870)
  %22 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !872
  %23 = load ptr, ptr %22, align 4, !dbg !872, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !837)
    #dbg_value(ptr %23, !115, !DIExpression(), !837)
    #dbg_value(i32 4, !116, !DIExpression(), !837)
    #dbg_value(ptr undef, !117, !DIExpression(), !837)
    #dbg_value(ptr %23, !119, !DIExpression(), !837)
    #dbg_value(i32 0, !122, !DIExpression(), !873)
  %24 = load i8, ptr %23, align 1, !dbg !874, !tbaa !131
    #dbg_value(i8 %24, !812, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !840)
    #dbg_value(i32 1, !122, !DIExpression(), !873)
  %25 = getelementptr inbounds nuw i8, ptr %23, i32 1, !dbg !874
  %26 = load i8, ptr %25, align 1, !dbg !874, !tbaa !131
    #dbg_value(i8 %26, !812, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !840)
    #dbg_value(i32 2, !122, !DIExpression(), !873)
  %27 = getelementptr inbounds nuw i8, ptr %23, i32 2, !dbg !874
  %28 = load i8, ptr %27, align 1, !dbg !874, !tbaa !131
    #dbg_value(i8 %28, !812, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !840)
    #dbg_value(i32 3, !122, !DIExpression(), !873)
  %29 = getelementptr inbounds nuw i8, ptr %23, i32 3, !dbg !874
  %30 = load i8, ptr %29, align 1, !dbg !874, !tbaa !131
    #dbg_value(i8 %30, !812, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !840)
    #dbg_value(i32 4, !122, !DIExpression(), !873)
  call void @llvm.lifetime.start.p0(i64 8, ptr nonnull %6) #14, !dbg !875
  store ptr %10, ptr %7, align 4, !dbg !876, !tbaa !433
  %31 = getelementptr inbounds nuw i8, ptr %7, i32 4, !dbg !876
  %32 = load i32, ptr %2, align 4, !dbg !877, !tbaa !27
  store i32 %32, ptr %31, align 4, !dbg !876, !tbaa !435
  store ptr %12, ptr %8, align 4, !dbg !878, !tbaa !433
  %33 = getelementptr inbounds nuw i8, ptr %8, i32 4, !dbg !878
  %34 = getelementptr inbounds nuw i8, ptr %2, i32 4, !dbg !879
  %35 = load i32, ptr %34, align 4, !dbg !879, !tbaa !27
  store i32 %35, ptr %33, align 4, !dbg !878, !tbaa !435
  %36 = zext i8 %21 to i32, !dbg !880
  %37 = shl nuw i32 %36, 24, !dbg !880
  %38 = zext i8 %19 to i32, !dbg !880
  %39 = shl nuw nsw i32 %38, 16, !dbg !880
  %40 = or disjoint i32 %37, %39, !dbg !880
  %41 = zext i8 %17 to i32, !dbg !880
  %42 = shl nuw nsw i32 %41, 8, !dbg !880
  %43 = or disjoint i32 %40, %42, !dbg !880
  %44 = zext i8 %15 to i32, !dbg !880
  %45 = or disjoint i32 %43, %44, !dbg !880
  %46 = zext i8 %30 to i32, !dbg !881
  %47 = shl nuw i32 %46, 24, !dbg !881
  %48 = zext i8 %28 to i32, !dbg !881
  %49 = shl nuw nsw i32 %48, 16, !dbg !881
  %50 = or disjoint i32 %47, %49, !dbg !881
  %51 = zext i8 %26 to i32, !dbg !881
  %52 = shl nuw nsw i32 %51, 8, !dbg !881
  %53 = or disjoint i32 %50, %52, !dbg !881
  %54 = zext i8 %24 to i32, !dbg !881
  %55 = or disjoint i32 %53, %54, !dbg !881
  call void @lang_fn_pipeline38_right_padded_zip_u32(ptr dead_on_unwind nonnull writable sret(%struct.ink_l_uint32) align 4 %6, ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %7, ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %8, i32 noundef %45, i32 noundef %55) #13, !dbg !881
  %56 = load ptr, ptr %6, align 4, !dbg !882, !tbaa !433
  store ptr %56, ptr %3, align 4, !dbg !883, !tbaa !777
  %57 = getelementptr inbounds nuw i8, ptr %6, i32 4, !dbg !884
  %58 = load i32, ptr %57, align 4, !dbg !884, !tbaa !435
  store i32 %58, ptr %4, align 4, !dbg !885, !tbaa !27
  call void @llvm.lifetime.end.p0(i64 8, ptr nonnull %6) #14, !dbg !886
  br label %363

59:                                               ; preds = %5
  %60 = load ptr, ptr %1, align 4, !dbg !887, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !841)
    #dbg_value(ptr %60, !115, !DIExpression(), !841)
    #dbg_value(i32 4, !116, !DIExpression(), !841)
    #dbg_value(ptr undef, !117, !DIExpression(), !841)
    #dbg_value(ptr %60, !119, !DIExpression(), !841)
    #dbg_value(i32 0, !122, !DIExpression(), !888)
  %61 = load i8, ptr %60, align 1, !dbg !889, !tbaa !131
    #dbg_value(i8 %61, !814, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !890)
    #dbg_value(i32 1, !122, !DIExpression(), !888)
  %62 = getelementptr inbounds nuw i8, ptr %60, i32 1, !dbg !889
  %63 = load i8, ptr %62, align 1, !dbg !889, !tbaa !131
    #dbg_value(i8 %63, !814, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !890)
    #dbg_value(i32 2, !122, !DIExpression(), !888)
  %64 = getelementptr inbounds nuw i8, ptr %60, i32 2, !dbg !889
  %65 = load i8, ptr %64, align 1, !dbg !889, !tbaa !131
    #dbg_value(i8 %65, !814, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !890)
    #dbg_value(i32 3, !122, !DIExpression(), !888)
  %66 = getelementptr inbounds nuw i8, ptr %60, i32 3, !dbg !889
  %67 = load i8, ptr %66, align 1, !dbg !889, !tbaa !131
    #dbg_value(i8 %67, !814, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !890)
    #dbg_value(i32 4, !122, !DIExpression(), !888)
  %68 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !891
  %69 = load ptr, ptr %68, align 4, !dbg !891, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !843)
    #dbg_value(ptr %69, !115, !DIExpression(), !843)
    #dbg_value(i32 4, !116, !DIExpression(), !843)
    #dbg_value(ptr undef, !117, !DIExpression(), !843)
    #dbg_value(ptr %69, !119, !DIExpression(), !843)
    #dbg_value(i32 0, !122, !DIExpression(), !892)
  %70 = load i8, ptr %69, align 1, !dbg !893, !tbaa !131
    #dbg_value(i8 %70, !816, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !890)
    #dbg_value(i32 1, !122, !DIExpression(), !892)
  %71 = getelementptr inbounds nuw i8, ptr %69, i32 1, !dbg !893
  %72 = load i8, ptr %71, align 1, !dbg !893, !tbaa !131
    #dbg_value(i8 %72, !816, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !890)
    #dbg_value(i32 2, !122, !DIExpression(), !892)
  %73 = getelementptr inbounds nuw i8, ptr %69, i32 2, !dbg !893
  %74 = load i8, ptr %73, align 1, !dbg !893, !tbaa !131
    #dbg_value(i8 %74, !816, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !890)
    #dbg_value(i32 3, !122, !DIExpression(), !892)
  %75 = getelementptr inbounds nuw i8, ptr %69, i32 3, !dbg !893
  %76 = load i8, ptr %75, align 1, !dbg !893, !tbaa !131
    #dbg_value(i8 %76, !816, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !890)
    #dbg_value(i32 4, !122, !DIExpression(), !892)
  %77 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !894
  %78 = load ptr, ptr %77, align 4, !dbg !894, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !845)
    #dbg_value(ptr %78, !115, !DIExpression(), !845)
    #dbg_value(i32 4, !116, !DIExpression(), !845)
    #dbg_value(ptr undef, !117, !DIExpression(), !845)
    #dbg_value(ptr %78, !119, !DIExpression(), !845)
    #dbg_value(i32 0, !122, !DIExpression(), !895)
  %79 = load i8, ptr %78, align 1, !dbg !896, !tbaa !131
    #dbg_value(i8 %79, !817, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !890)
    #dbg_value(i32 1, !122, !DIExpression(), !895)
  %80 = getelementptr inbounds nuw i8, ptr %78, i32 1, !dbg !896
  %81 = load i8, ptr %80, align 1, !dbg !896, !tbaa !131
    #dbg_value(i8 %81, !817, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !890)
    #dbg_value(i32 2, !122, !DIExpression(), !895)
  %82 = getelementptr inbounds nuw i8, ptr %78, i32 2, !dbg !896
  %83 = load i8, ptr %82, align 1, !dbg !896, !tbaa !131
    #dbg_value(i8 %83, !817, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !890)
    #dbg_value(i32 3, !122, !DIExpression(), !895)
  %84 = getelementptr inbounds nuw i8, ptr %78, i32 3, !dbg !896
  %85 = load i8, ptr %84, align 1, !dbg !896, !tbaa !131
    #dbg_value(i8 %85, !817, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !890)
    #dbg_value(i32 4, !122, !DIExpression(), !895)
  %86 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !897
  %87 = load ptr, ptr %86, align 4, !dbg !897, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !847)
    #dbg_value(ptr %87, !115, !DIExpression(), !847)
    #dbg_value(i32 4, !116, !DIExpression(), !847)
    #dbg_value(ptr undef, !117, !DIExpression(), !847)
    #dbg_value(ptr %87, !119, !DIExpression(), !847)
    #dbg_value(i32 0, !122, !DIExpression(), !898)
  %88 = load i8, ptr %87, align 1, !dbg !899, !tbaa !131
    #dbg_value(i8 %88, !818, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !890)
    #dbg_value(i32 1, !122, !DIExpression(), !898)
  %89 = getelementptr inbounds nuw i8, ptr %87, i32 1, !dbg !899
  %90 = load i8, ptr %89, align 1, !dbg !899, !tbaa !131
    #dbg_value(i8 %90, !818, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !890)
    #dbg_value(i32 2, !122, !DIExpression(), !898)
  %91 = getelementptr inbounds nuw i8, ptr %87, i32 2, !dbg !899
  %92 = load i8, ptr %91, align 1, !dbg !899, !tbaa !131
    #dbg_value(i8 %92, !818, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !890)
    #dbg_value(i32 3, !122, !DIExpression(), !898)
  %93 = getelementptr inbounds nuw i8, ptr %87, i32 3, !dbg !899
  %94 = load i8, ptr %93, align 1, !dbg !899, !tbaa !131
    #dbg_value(i8 %94, !818, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !890)
    #dbg_value(i32 4, !122, !DIExpression(), !898)
  %95 = zext i8 %67 to i32, !dbg !900
  %96 = shl nuw i32 %95, 24, !dbg !900
  %97 = zext i8 %65 to i32, !dbg !900
  %98 = shl nuw nsw i32 %97, 16, !dbg !900
  %99 = or disjoint i32 %96, %98, !dbg !900
  %100 = zext i8 %63 to i32, !dbg !900
  %101 = shl nuw nsw i32 %100, 8, !dbg !900
  %102 = or disjoint i32 %99, %101, !dbg !900
  %103 = zext i8 %61 to i32, !dbg !900
  %104 = or disjoint i32 %102, %103, !dbg !900
  %105 = zext i8 %76 to i32, !dbg !901
  %106 = shl nuw i32 %105, 24, !dbg !901
  %107 = zext i8 %74 to i32, !dbg !901
  %108 = shl nuw nsw i32 %107, 16, !dbg !901
  %109 = or disjoint i32 %106, %108, !dbg !901
  %110 = zext i8 %72 to i32, !dbg !901
  %111 = shl nuw nsw i32 %110, 8, !dbg !901
  %112 = or disjoint i32 %109, %111, !dbg !901
  %113 = zext i8 %70 to i32, !dbg !901
  %114 = or disjoint i32 %112, %113, !dbg !901
  %115 = zext i8 %85 to i32, !dbg !902
  %116 = shl nuw i32 %115, 24, !dbg !902
  %117 = zext i8 %83 to i32, !dbg !902
  %118 = shl nuw nsw i32 %117, 16, !dbg !902
  %119 = or disjoint i32 %116, %118, !dbg !902
  %120 = zext i8 %81 to i32, !dbg !902
  %121 = shl nuw nsw i32 %120, 8, !dbg !902
  %122 = or disjoint i32 %119, %121, !dbg !902
  %123 = zext i8 %79 to i32, !dbg !902
  %124 = or disjoint i32 %122, %123, !dbg !902
  %125 = zext i8 %94 to i32, !dbg !903
  %126 = shl nuw i32 %125, 24, !dbg !903
  %127 = zext i8 %92 to i32, !dbg !903
  %128 = shl nuw nsw i32 %127, 16, !dbg !903
  %129 = or disjoint i32 %126, %128, !dbg !903
  %130 = zext i8 %90 to i32, !dbg !903
  %131 = shl nuw nsw i32 %130, 8, !dbg !903
  %132 = or disjoint i32 %129, %131, !dbg !903
  %133 = zext i8 %88 to i32, !dbg !903
  %134 = or disjoint i32 %132, %133, !dbg !903
    #dbg_value(i32 %104, !454, !DIExpression(), !905)
    #dbg_value(i32 %114, !455, !DIExpression(), !905)
    #dbg_value(i32 %124, !456, !DIExpression(), !905)
    #dbg_value(i32 %134, !457, !DIExpression(), !905)
    #dbg_value(i32 %104, !458, !DIExpression(), !905)
  %135 = icmp ult i32 %104, %124, !dbg !903
  %136 = sub i32 0, %124, !dbg !906
  %137 = select i1 %135, i32 %134, i32 %136, !dbg !906
  %138 = add i32 %137, %114, !dbg !906
    #dbg_value(i32 %138, !459, !DIExpression(), !905)
    #dbg_value(i32 %138, !819, !DIExpression(), !890)
    #dbg_value(i32 1, !55, !DIExpression(), !907)
    #dbg_value(i32 4, !56, !DIExpression(), !907)
  %139 = load i32, ptr @ink_top, align 4
  %140 = icmp ugt i32 %139, -8
  br i1 %140, label %141, label %142, !dbg !909

141:                                              ; preds = %59
  tail call void @llvm.trap(), !dbg !910
  unreachable, !dbg !912

142:                                              ; preds = %59
  %143 = icmp eq i32 %139, 0, !dbg !913
  %144 = add nuw i32 %139, 7, !dbg !914
  %145 = select i1 %143, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %144, !dbg !915
  %146 = and i32 %145, -8, !dbg !916
    #dbg_value(i32 %146, !57, !DIExpression(), !907)
    #dbg_value(i32 4, !58, !DIExpression(), !907)
  %147 = or disjoint i32 %146, 4, !dbg !917
  store i32 %147, ptr @ink_top, align 4, !dbg !918, !tbaa !27
  %148 = add i32 %146, 65539, !dbg !919
  %149 = lshr i32 %148, 16, !dbg !920
    #dbg_value(i32 %149, !59, !DIExpression(), !907)
  %150 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !921
    #dbg_value(i32 %150, !60, !DIExpression(), !907)
  %151 = icmp ugt i32 %149, %150, !dbg !922
  br i1 %151, label %152, label %157, !dbg !923

152:                                              ; preds = %142
  %153 = sub nuw nsw i32 %149, %150, !dbg !924
  %154 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %153), !dbg !925
  %155 = icmp eq i32 %154, -1, !dbg !926
  br i1 %155, label %156, label %157, !dbg !923

156:                                              ; preds = %152
  tail call void @llvm.trap(), !dbg !927
  unreachable, !dbg !929

157:                                              ; preds = %142, %152
  %158 = inttoptr i32 %146 to ptr, !dbg !930
    #dbg_value(ptr %158, !820, !DIExpression(), !890)
  store i32 %138, ptr %158, align 8, !dbg !931, !tbaa !282
  store ptr %158, ptr %3, align 4, !dbg !932, !tbaa !777
  store i32 1, ptr %4, align 4, !dbg !933, !tbaa !27
  br label %363

159:                                              ; preds = %5
  %160 = load ptr, ptr %1, align 4, !dbg !934, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !849)
    #dbg_value(ptr %160, !115, !DIExpression(), !849)
    #dbg_value(i32 4, !116, !DIExpression(), !849)
    #dbg_value(ptr undef, !117, !DIExpression(), !849)
    #dbg_value(ptr %160, !119, !DIExpression(), !849)
    #dbg_value(i32 0, !122, !DIExpression(), !935)
  %161 = load i8, ptr %160, align 1, !dbg !936, !tbaa !131
    #dbg_value(i8 %161, !821, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !937)
    #dbg_value(i32 1, !122, !DIExpression(), !935)
  %162 = getelementptr inbounds nuw i8, ptr %160, i32 1, !dbg !936
  %163 = load i8, ptr %162, align 1, !dbg !936, !tbaa !131
    #dbg_value(i8 %163, !821, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !937)
    #dbg_value(i32 2, !122, !DIExpression(), !935)
  %164 = getelementptr inbounds nuw i8, ptr %160, i32 2, !dbg !936
  %165 = load i8, ptr %164, align 1, !dbg !936, !tbaa !131
    #dbg_value(i8 %165, !821, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !937)
    #dbg_value(i32 3, !122, !DIExpression(), !935)
  %166 = getelementptr inbounds nuw i8, ptr %160, i32 3, !dbg !936
  %167 = load i8, ptr %166, align 1, !dbg !936, !tbaa !131
    #dbg_value(i8 %167, !821, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !937)
    #dbg_value(i32 4, !122, !DIExpression(), !935)
  %168 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !938
  %169 = load ptr, ptr %168, align 4, !dbg !938, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !851)
    #dbg_value(ptr %169, !115, !DIExpression(), !851)
    #dbg_value(i32 4, !116, !DIExpression(), !851)
    #dbg_value(ptr undef, !117, !DIExpression(), !851)
    #dbg_value(ptr %169, !119, !DIExpression(), !851)
    #dbg_value(i32 0, !122, !DIExpression(), !939)
  %170 = load i8, ptr %169, align 1, !dbg !940, !tbaa !131
    #dbg_value(i8 %170, !823, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !937)
    #dbg_value(i32 1, !122, !DIExpression(), !939)
  %171 = getelementptr inbounds nuw i8, ptr %169, i32 1, !dbg !940
  %172 = load i8, ptr %171, align 1, !dbg !940, !tbaa !131
    #dbg_value(i8 %172, !823, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !937)
    #dbg_value(i32 2, !122, !DIExpression(), !939)
  %173 = getelementptr inbounds nuw i8, ptr %169, i32 2, !dbg !940
  %174 = load i8, ptr %173, align 1, !dbg !940, !tbaa !131
    #dbg_value(i8 %174, !823, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !937)
    #dbg_value(i32 3, !122, !DIExpression(), !939)
  %175 = getelementptr inbounds nuw i8, ptr %169, i32 3, !dbg !940
  %176 = load i8, ptr %175, align 1, !dbg !940, !tbaa !131
    #dbg_value(i8 %176, !823, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !937)
    #dbg_value(i32 4, !122, !DIExpression(), !939)
  %177 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !941
  %178 = load ptr, ptr %177, align 4, !dbg !941, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !853)
    #dbg_value(ptr %178, !115, !DIExpression(), !853)
    #dbg_value(i32 4, !116, !DIExpression(), !853)
    #dbg_value(ptr undef, !117, !DIExpression(), !853)
    #dbg_value(ptr %178, !119, !DIExpression(), !853)
    #dbg_value(i32 0, !122, !DIExpression(), !942)
  %179 = load i8, ptr %178, align 1, !dbg !943, !tbaa !131
    #dbg_value(i8 %179, !824, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !937)
    #dbg_value(i32 1, !122, !DIExpression(), !942)
  %180 = getelementptr inbounds nuw i8, ptr %178, i32 1, !dbg !943
  %181 = load i8, ptr %180, align 1, !dbg !943, !tbaa !131
    #dbg_value(i8 %181, !824, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !937)
    #dbg_value(i32 2, !122, !DIExpression(), !942)
  %182 = getelementptr inbounds nuw i8, ptr %178, i32 2, !dbg !943
  %183 = load i8, ptr %182, align 1, !dbg !943, !tbaa !131
    #dbg_value(i8 %183, !824, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !937)
    #dbg_value(i32 3, !122, !DIExpression(), !942)
  %184 = getelementptr inbounds nuw i8, ptr %178, i32 3, !dbg !943
  %185 = load i8, ptr %184, align 1, !dbg !943, !tbaa !131
    #dbg_value(i8 %185, !824, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !937)
    #dbg_value(i32 4, !122, !DIExpression(), !942)
  %186 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !944
  %187 = load ptr, ptr %186, align 4, !dbg !944, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !855)
    #dbg_value(ptr %187, !115, !DIExpression(), !855)
    #dbg_value(i32 4, !116, !DIExpression(), !855)
    #dbg_value(ptr undef, !117, !DIExpression(), !855)
    #dbg_value(ptr %187, !119, !DIExpression(), !855)
    #dbg_value(i32 0, !122, !DIExpression(), !945)
  %188 = load i8, ptr %187, align 1, !dbg !946, !tbaa !131
    #dbg_value(i8 %188, !825, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !937)
    #dbg_value(i32 1, !122, !DIExpression(), !945)
  %189 = getelementptr inbounds nuw i8, ptr %187, i32 1, !dbg !946
  %190 = load i8, ptr %189, align 1, !dbg !946, !tbaa !131
    #dbg_value(i8 %190, !825, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !937)
    #dbg_value(i32 2, !122, !DIExpression(), !945)
  %191 = getelementptr inbounds nuw i8, ptr %187, i32 2, !dbg !946
  %192 = load i8, ptr %191, align 1, !dbg !946, !tbaa !131
    #dbg_value(i8 %192, !825, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !937)
    #dbg_value(i32 3, !122, !DIExpression(), !945)
  %193 = getelementptr inbounds nuw i8, ptr %187, i32 3, !dbg !946
  %194 = load i8, ptr %193, align 1, !dbg !946, !tbaa !131
    #dbg_value(i8 %194, !825, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !937)
    #dbg_value(i32 4, !122, !DIExpression(), !945)
  %195 = zext i8 %167 to i32, !dbg !947
  %196 = shl nuw i32 %195, 24, !dbg !947
  %197 = zext i8 %165 to i32, !dbg !947
  %198 = shl nuw nsw i32 %197, 16, !dbg !947
  %199 = or disjoint i32 %196, %198, !dbg !947
  %200 = zext i8 %163 to i32, !dbg !947
  %201 = shl nuw nsw i32 %200, 8, !dbg !947
  %202 = or disjoint i32 %199, %201, !dbg !947
  %203 = zext i8 %161 to i32, !dbg !947
  %204 = or disjoint i32 %202, %203, !dbg !947
  %205 = zext i8 %176 to i32, !dbg !948
  %206 = shl nuw i32 %205, 24, !dbg !948
  %207 = zext i8 %174 to i32, !dbg !948
  %208 = shl nuw nsw i32 %207, 16, !dbg !948
  %209 = or disjoint i32 %206, %208, !dbg !948
  %210 = zext i8 %172 to i32, !dbg !948
  %211 = shl nuw nsw i32 %210, 8, !dbg !948
  %212 = or disjoint i32 %209, %211, !dbg !948
  %213 = zext i8 %170 to i32, !dbg !948
  %214 = or disjoint i32 %212, %213, !dbg !948
  %215 = zext i8 %185 to i32, !dbg !949
  %216 = shl nuw i32 %215, 24, !dbg !949
  %217 = zext i8 %183 to i32, !dbg !949
  %218 = shl nuw nsw i32 %217, 16, !dbg !949
  %219 = or disjoint i32 %216, %218, !dbg !949
  %220 = zext i8 %181 to i32, !dbg !949
  %221 = shl nuw nsw i32 %220, 8, !dbg !949
  %222 = or disjoint i32 %219, %221, !dbg !949
  %223 = zext i8 %179 to i32, !dbg !949
  %224 = or disjoint i32 %222, %223, !dbg !949
  %225 = zext i8 %194 to i32, !dbg !950
  %226 = shl nuw i32 %225, 24, !dbg !950
  %227 = zext i8 %192 to i32, !dbg !950
  %228 = shl nuw nsw i32 %227, 16, !dbg !950
  %229 = or disjoint i32 %226, %228, !dbg !950
  %230 = zext i8 %190 to i32, !dbg !950
  %231 = shl nuw nsw i32 %230, 8, !dbg !950
  %232 = or disjoint i32 %229, %231, !dbg !950
  %233 = zext i8 %188 to i32, !dbg !950
  %234 = or disjoint i32 %232, %233, !dbg !950
    #dbg_value(i32 %204, !471, !DIExpression(), !952)
    #dbg_value(i32 %214, !472, !DIExpression(), !952)
    #dbg_value(i32 %224, !473, !DIExpression(), !952)
    #dbg_value(i32 %234, !474, !DIExpression(), !952)
    #dbg_value(i32 %204, !475, !DIExpression(), !952)
    #dbg_value(i32 3, !476, !DIExpression(), !952)
    #dbg_value(i32 poison, !477, !DIExpression(), !952)
  %235 = urem i32 %204, 3, !dbg !950
    #dbg_value(i32 %235, !477, !DIExpression(), !952)
    #dbg_value(i32 %235, !478, !DIExpression(), !952)
  %236 = icmp eq i32 %235, 0, !dbg !953
  %237 = mul i32 %234, %214, !dbg !954
  %238 = add i32 %224, %214, !dbg !954
  %239 = select i1 %236, i32 %237, i32 %238, !dbg !954
    #dbg_value(i32 %239, !479, !DIExpression(), !952)
    #dbg_value(i32 %239, !826, !DIExpression(), !937)
    #dbg_value(i32 1, !55, !DIExpression(), !955)
    #dbg_value(i32 4, !56, !DIExpression(), !955)
  %240 = load i32, ptr @ink_top, align 4
  %241 = icmp ugt i32 %240, -8
  br i1 %241, label %242, label %243, !dbg !957

242:                                              ; preds = %159
  tail call void @llvm.trap(), !dbg !958
  unreachable, !dbg !960

243:                                              ; preds = %159
  %244 = icmp eq i32 %240, 0, !dbg !961
  %245 = add nuw i32 %240, 7, !dbg !962
  %246 = select i1 %244, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %245, !dbg !963
  %247 = and i32 %246, -8, !dbg !964
    #dbg_value(i32 %247, !57, !DIExpression(), !955)
    #dbg_value(i32 4, !58, !DIExpression(), !955)
  %248 = or disjoint i32 %247, 4, !dbg !965
  store i32 %248, ptr @ink_top, align 4, !dbg !966, !tbaa !27
  %249 = add i32 %247, 65539, !dbg !967
  %250 = lshr i32 %249, 16, !dbg !968
    #dbg_value(i32 %250, !59, !DIExpression(), !955)
  %251 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !969
    #dbg_value(i32 %251, !60, !DIExpression(), !955)
  %252 = icmp ugt i32 %250, %251, !dbg !970
  br i1 %252, label %253, label %258, !dbg !971

253:                                              ; preds = %243
  %254 = sub nuw nsw i32 %250, %251, !dbg !972
  %255 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %254), !dbg !973
  %256 = icmp eq i32 %255, -1, !dbg !974
  br i1 %256, label %257, label %258, !dbg !971

257:                                              ; preds = %253
  tail call void @llvm.trap(), !dbg !975
  unreachable, !dbg !977

258:                                              ; preds = %243, %253
  %259 = inttoptr i32 %247 to ptr, !dbg !978
    #dbg_value(ptr %259, !827, !DIExpression(), !937)
  store i32 %239, ptr %259, align 8, !dbg !979, !tbaa !282
  store ptr %259, ptr %3, align 4, !dbg !980, !tbaa !777
  store i32 1, ptr %4, align 4, !dbg !981, !tbaa !27
  br label %363

260:                                              ; preds = %5
  %261 = load ptr, ptr %1, align 4, !dbg !982, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !857)
    #dbg_value(ptr %261, !115, !DIExpression(), !857)
    #dbg_value(i32 4, !116, !DIExpression(), !857)
    #dbg_value(ptr undef, !117, !DIExpression(), !857)
    #dbg_value(ptr %261, !119, !DIExpression(), !857)
    #dbg_value(i32 0, !122, !DIExpression(), !983)
  %262 = load i8, ptr %261, align 1, !dbg !984, !tbaa !131
    #dbg_value(i8 %262, !828, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !985)
    #dbg_value(i32 1, !122, !DIExpression(), !983)
  %263 = getelementptr inbounds nuw i8, ptr %261, i32 1, !dbg !984
  %264 = load i8, ptr %263, align 1, !dbg !984, !tbaa !131
    #dbg_value(i8 %264, !828, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !985)
    #dbg_value(i32 2, !122, !DIExpression(), !983)
  %265 = getelementptr inbounds nuw i8, ptr %261, i32 2, !dbg !984
  %266 = load i8, ptr %265, align 1, !dbg !984, !tbaa !131
    #dbg_value(i8 %266, !828, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !985)
    #dbg_value(i32 3, !122, !DIExpression(), !983)
  %267 = getelementptr inbounds nuw i8, ptr %261, i32 3, !dbg !984
  %268 = load i8, ptr %267, align 1, !dbg !984, !tbaa !131
    #dbg_value(i8 %268, !828, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !985)
    #dbg_value(i32 4, !122, !DIExpression(), !983)
  %269 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !986
  %270 = load ptr, ptr %269, align 4, !dbg !986, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !859)
    #dbg_value(ptr %270, !115, !DIExpression(), !859)
    #dbg_value(i32 4, !116, !DIExpression(), !859)
    #dbg_value(ptr undef, !117, !DIExpression(), !859)
    #dbg_value(ptr %270, !119, !DIExpression(), !859)
    #dbg_value(i32 0, !122, !DIExpression(), !987)
  %271 = load i8, ptr %270, align 1, !dbg !988, !tbaa !131
    #dbg_value(i8 %271, !830, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !985)
    #dbg_value(i32 1, !122, !DIExpression(), !987)
  %272 = getelementptr inbounds nuw i8, ptr %270, i32 1, !dbg !988
  %273 = load i8, ptr %272, align 1, !dbg !988, !tbaa !131
    #dbg_value(i8 %273, !830, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !985)
    #dbg_value(i32 2, !122, !DIExpression(), !987)
  %274 = getelementptr inbounds nuw i8, ptr %270, i32 2, !dbg !988
  %275 = load i8, ptr %274, align 1, !dbg !988, !tbaa !131
    #dbg_value(i8 %275, !830, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !985)
    #dbg_value(i32 3, !122, !DIExpression(), !987)
  %276 = getelementptr inbounds nuw i8, ptr %270, i32 3, !dbg !988
  %277 = load i8, ptr %276, align 1, !dbg !988, !tbaa !131
    #dbg_value(i8 %277, !830, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !985)
    #dbg_value(i32 4, !122, !DIExpression(), !987)
  %278 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !989
  %279 = load ptr, ptr %278, align 4, !dbg !989, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !861)
    #dbg_value(ptr %279, !115, !DIExpression(), !861)
    #dbg_value(i32 4, !116, !DIExpression(), !861)
    #dbg_value(ptr undef, !117, !DIExpression(), !861)
    #dbg_value(ptr %279, !119, !DIExpression(), !861)
    #dbg_value(i32 0, !122, !DIExpression(), !990)
  %280 = load i8, ptr %279, align 1, !dbg !991, !tbaa !131
    #dbg_value(i8 %280, !831, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !985)
    #dbg_value(i32 1, !122, !DIExpression(), !990)
  %281 = getelementptr inbounds nuw i8, ptr %279, i32 1, !dbg !991
  %282 = load i8, ptr %281, align 1, !dbg !991, !tbaa !131
    #dbg_value(i8 %282, !831, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !985)
    #dbg_value(i32 2, !122, !DIExpression(), !990)
  %283 = getelementptr inbounds nuw i8, ptr %279, i32 2, !dbg !991
  %284 = load i8, ptr %283, align 1, !dbg !991, !tbaa !131
    #dbg_value(i8 %284, !831, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !985)
    #dbg_value(i32 3, !122, !DIExpression(), !990)
  %285 = getelementptr inbounds nuw i8, ptr %279, i32 3, !dbg !991
  %286 = load i8, ptr %285, align 1, !dbg !991, !tbaa !131
    #dbg_value(i8 %286, !831, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !985)
    #dbg_value(i32 4, !122, !DIExpression(), !990)
  %287 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !992
  %288 = load ptr, ptr %287, align 4, !dbg !992, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !863)
    #dbg_value(ptr %288, !115, !DIExpression(), !863)
    #dbg_value(i32 4, !116, !DIExpression(), !863)
    #dbg_value(ptr undef, !117, !DIExpression(), !863)
    #dbg_value(ptr %288, !119, !DIExpression(), !863)
    #dbg_value(i32 0, !122, !DIExpression(), !993)
  %289 = load i8, ptr %288, align 1, !dbg !994, !tbaa !131
    #dbg_value(i8 %289, !832, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !985)
    #dbg_value(i32 1, !122, !DIExpression(), !993)
  %290 = getelementptr inbounds nuw i8, ptr %288, i32 1, !dbg !994
  %291 = load i8, ptr %290, align 1, !dbg !994, !tbaa !131
    #dbg_value(i8 %291, !832, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !985)
    #dbg_value(i32 2, !122, !DIExpression(), !993)
  %292 = getelementptr inbounds nuw i8, ptr %288, i32 2, !dbg !994
  %293 = load i8, ptr %292, align 1, !dbg !994, !tbaa !131
    #dbg_value(i8 %293, !832, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !985)
    #dbg_value(i32 3, !122, !DIExpression(), !993)
  %294 = getelementptr inbounds nuw i8, ptr %288, i32 3, !dbg !994
  %295 = load i8, ptr %294, align 1, !dbg !994, !tbaa !131
    #dbg_value(i8 %295, !832, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !985)
    #dbg_value(i32 4, !122, !DIExpression(), !993)
  %296 = zext i8 %268 to i32, !dbg !995
  %297 = shl nuw i32 %296, 24, !dbg !995
  %298 = zext i8 %266 to i32, !dbg !995
  %299 = shl nuw nsw i32 %298, 16, !dbg !995
  %300 = or disjoint i32 %297, %299, !dbg !995
  %301 = zext i8 %264 to i32, !dbg !995
  %302 = shl nuw nsw i32 %301, 8, !dbg !995
  %303 = or disjoint i32 %300, %302, !dbg !995
  %304 = zext i8 %262 to i32, !dbg !995
  %305 = or disjoint i32 %303, %304, !dbg !995
  %306 = zext i8 %277 to i32, !dbg !996
  %307 = shl nuw i32 %306, 24, !dbg !996
  %308 = zext i8 %275 to i32, !dbg !996
  %309 = shl nuw nsw i32 %308, 16, !dbg !996
  %310 = or disjoint i32 %307, %309, !dbg !996
  %311 = zext i8 %273 to i32, !dbg !996
  %312 = shl nuw nsw i32 %311, 8, !dbg !996
  %313 = or disjoint i32 %310, %312, !dbg !996
  %314 = zext i8 %271 to i32, !dbg !996
  %315 = or disjoint i32 %313, %314, !dbg !996
  %316 = zext i8 %286 to i32, !dbg !997
  %317 = shl nuw i32 %316, 24, !dbg !997
  %318 = zext i8 %284 to i32, !dbg !997
  %319 = shl nuw nsw i32 %318, 16, !dbg !997
  %320 = or disjoint i32 %317, %319, !dbg !997
  %321 = zext i8 %282 to i32, !dbg !997
  %322 = shl nuw nsw i32 %321, 8, !dbg !997
  %323 = or disjoint i32 %320, %322, !dbg !997
  %324 = zext i8 %280 to i32, !dbg !997
  %325 = or disjoint i32 %323, %324, !dbg !997
  %326 = zext i8 %295 to i32, !dbg !998
  %327 = shl nuw i32 %326, 24, !dbg !998
  %328 = zext i8 %293 to i32, !dbg !998
  %329 = shl nuw nsw i32 %328, 16, !dbg !998
  %330 = or disjoint i32 %327, %329, !dbg !998
  %331 = zext i8 %291 to i32, !dbg !998
  %332 = shl nuw nsw i32 %331, 8, !dbg !998
  %333 = or disjoint i32 %330, %332, !dbg !998
  %334 = zext i8 %289 to i32, !dbg !998
  %335 = or disjoint i32 %333, %334, !dbg !998
    #dbg_value(i32 %305, !494, !DIExpression(), !1000)
    #dbg_value(i32 %315, !495, !DIExpression(), !1000)
    #dbg_value(i32 %325, !496, !DIExpression(), !1000)
    #dbg_value(i32 %335, !497, !DIExpression(), !1000)
    #dbg_value(i32 %305, !498, !DIExpression(), !1000)
  %336 = icmp ult i32 %305, %315, !dbg !998
  %337 = mul i32 %335, %315, !dbg !1001
  %338 = add i32 %337, %305, !dbg !1001
  %339 = sub i32 %305, %315, !dbg !1001
  %340 = add i32 %339, %325, !dbg !1001
  %341 = select i1 %336, i32 %338, i32 %340, !dbg !1001
    #dbg_value(i32 %341, !499, !DIExpression(), !1000)
    #dbg_value(i32 %341, !833, !DIExpression(), !985)
    #dbg_value(i32 1, !55, !DIExpression(), !1002)
    #dbg_value(i32 4, !56, !DIExpression(), !1002)
  %342 = load i32, ptr @ink_top, align 4
  %343 = icmp ugt i32 %342, -8
  br i1 %343, label %344, label %345, !dbg !1004

344:                                              ; preds = %260
  tail call void @llvm.trap(), !dbg !1005
  unreachable, !dbg !1007

345:                                              ; preds = %260
  %346 = icmp eq i32 %342, 0, !dbg !1008
  %347 = add nuw i32 %342, 7, !dbg !1009
  %348 = select i1 %346, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %347, !dbg !1010
  %349 = and i32 %348, -8, !dbg !1011
    #dbg_value(i32 %349, !57, !DIExpression(), !1002)
    #dbg_value(i32 4, !58, !DIExpression(), !1002)
  %350 = or disjoint i32 %349, 4, !dbg !1012
  store i32 %350, ptr @ink_top, align 4, !dbg !1013, !tbaa !27
  %351 = add i32 %349, 65539, !dbg !1014
  %352 = lshr i32 %351, 16, !dbg !1015
    #dbg_value(i32 %352, !59, !DIExpression(), !1002)
  %353 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1016
    #dbg_value(i32 %353, !60, !DIExpression(), !1002)
  %354 = icmp ugt i32 %352, %353, !dbg !1017
  br i1 %354, label %355, label %360, !dbg !1018

355:                                              ; preds = %345
  %356 = sub nuw nsw i32 %352, %353, !dbg !1019
  %357 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %356), !dbg !1020
  %358 = icmp eq i32 %357, -1, !dbg !1021
  br i1 %358, label %359, label %360, !dbg !1018

359:                                              ; preds = %355
  tail call void @llvm.trap(), !dbg !1022
  unreachable, !dbg !1024

360:                                              ; preds = %345, %355
  %361 = inttoptr i32 %349 to ptr, !dbg !1025
    #dbg_value(ptr %361, !834, !DIExpression(), !985)
  store i32 %341, ptr %361, align 8, !dbg !1026, !tbaa !282
  store ptr %361, ptr %3, align 4, !dbg !1027, !tbaa !777
  store i32 1, ptr %4, align 4, !dbg !1028, !tbaa !27
  br label %363

362:                                              ; preds = %5
  tail call void @llvm.trap(), !dbg !1029
  unreachable, !dbg !1031

363:                                              ; preds = %360, %258, %157, %9
  ret void, !dbg !1032
}

; Function Attrs: nounwind memory(read, inaccessiblemem: write) uwtable
define hidden i32 @ink_compute_scalar32(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readnone %2) local_unnamed_addr #9 !dbg !1033 {
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
    #dbg_value(i32 %0, !1037, !DIExpression(), !1083)
    #dbg_value(ptr %1, !1038, !DIExpression(), !1083)
    #dbg_value(ptr %2, !1039, !DIExpression(), !1083)
  switch i32 %0, label %247 [
    i32 1, label %4
    i32 2, label %84
    i32 3, label %165
  ], !dbg !1084

4:                                                ; preds = %3
  %5 = load ptr, ptr %1, align 4, !dbg !1085, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !1059)
    #dbg_value(ptr %5, !115, !DIExpression(), !1059)
    #dbg_value(i32 4, !116, !DIExpression(), !1059)
    #dbg_value(ptr undef, !117, !DIExpression(), !1059)
    #dbg_value(ptr %5, !119, !DIExpression(), !1059)
    #dbg_value(i32 0, !122, !DIExpression(), !1086)
    #dbg_value(i32 0, !122, !DIExpression(), !1086)
  %6 = load i8, ptr %5, align 1, !dbg !1087, !tbaa !131
    #dbg_value(i8 %6, !1040, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1088)
    #dbg_value(i32 1, !122, !DIExpression(), !1086)
  %7 = getelementptr inbounds nuw i8, ptr %5, i32 1, !dbg !1087
  %8 = load i8, ptr %7, align 1, !dbg !1087, !tbaa !131
    #dbg_value(i8 %8, !1040, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1088)
    #dbg_value(i32 2, !122, !DIExpression(), !1086)
  %9 = getelementptr inbounds nuw i8, ptr %5, i32 2, !dbg !1087
  %10 = load i8, ptr %9, align 1, !dbg !1087, !tbaa !131
    #dbg_value(i8 %10, !1040, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1088)
    #dbg_value(i32 3, !122, !DIExpression(), !1086)
  %11 = getelementptr inbounds nuw i8, ptr %5, i32 3, !dbg !1087
  %12 = load i8, ptr %11, align 1, !dbg !1087, !tbaa !131
    #dbg_value(i8 %12, !1040, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1088)
    #dbg_value(i32 4, !122, !DIExpression(), !1086)
  %13 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1089
  %14 = load ptr, ptr %13, align 4, !dbg !1089, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !1061)
    #dbg_value(ptr %14, !115, !DIExpression(), !1061)
    #dbg_value(i32 4, !116, !DIExpression(), !1061)
    #dbg_value(ptr undef, !117, !DIExpression(), !1061)
    #dbg_value(ptr %14, !119, !DIExpression(), !1061)
    #dbg_value(i32 0, !122, !DIExpression(), !1090)
    #dbg_value(i32 0, !122, !DIExpression(), !1090)
  %15 = load i8, ptr %14, align 1, !dbg !1091, !tbaa !131
    #dbg_value(i8 %15, !1043, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1088)
    #dbg_value(i32 1, !122, !DIExpression(), !1090)
  %16 = getelementptr inbounds nuw i8, ptr %14, i32 1, !dbg !1091
  %17 = load i8, ptr %16, align 1, !dbg !1091, !tbaa !131
    #dbg_value(i8 %17, !1043, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1088)
    #dbg_value(i32 2, !122, !DIExpression(), !1090)
  %18 = getelementptr inbounds nuw i8, ptr %14, i32 2, !dbg !1091
  %19 = load i8, ptr %18, align 1, !dbg !1091, !tbaa !131
    #dbg_value(i8 %19, !1043, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1088)
    #dbg_value(i32 3, !122, !DIExpression(), !1090)
  %20 = getelementptr inbounds nuw i8, ptr %14, i32 3, !dbg !1091
  %21 = load i8, ptr %20, align 1, !dbg !1091, !tbaa !131
    #dbg_value(i8 %21, !1043, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1088)
    #dbg_value(i32 4, !122, !DIExpression(), !1090)
  %22 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1092
  %23 = load ptr, ptr %22, align 4, !dbg !1092, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !1063)
    #dbg_value(ptr %23, !115, !DIExpression(), !1063)
    #dbg_value(i32 4, !116, !DIExpression(), !1063)
    #dbg_value(ptr undef, !117, !DIExpression(), !1063)
    #dbg_value(ptr %23, !119, !DIExpression(), !1063)
    #dbg_value(i32 0, !122, !DIExpression(), !1093)
    #dbg_value(i32 0, !122, !DIExpression(), !1093)
  %24 = load i8, ptr %23, align 1, !dbg !1094, !tbaa !131
    #dbg_value(i8 %24, !1044, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1088)
    #dbg_value(i32 1, !122, !DIExpression(), !1093)
  %25 = getelementptr inbounds nuw i8, ptr %23, i32 1, !dbg !1094
  %26 = load i8, ptr %25, align 1, !dbg !1094, !tbaa !131
    #dbg_value(i8 %26, !1044, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1088)
    #dbg_value(i32 2, !122, !DIExpression(), !1093)
  %27 = getelementptr inbounds nuw i8, ptr %23, i32 2, !dbg !1094
  %28 = load i8, ptr %27, align 1, !dbg !1094, !tbaa !131
    #dbg_value(i8 %28, !1044, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1088)
    #dbg_value(i32 3, !122, !DIExpression(), !1093)
  %29 = getelementptr inbounds nuw i8, ptr %23, i32 3, !dbg !1094
  %30 = load i8, ptr %29, align 1, !dbg !1094, !tbaa !131
    #dbg_value(i8 %30, !1044, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1088)
    #dbg_value(i32 4, !122, !DIExpression(), !1093)
  %31 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1095
  %32 = load ptr, ptr %31, align 4, !dbg !1095, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !1065)
    #dbg_value(ptr %32, !115, !DIExpression(), !1065)
    #dbg_value(i32 4, !116, !DIExpression(), !1065)
    #dbg_value(ptr undef, !117, !DIExpression(), !1065)
    #dbg_value(ptr %32, !119, !DIExpression(), !1065)
    #dbg_value(i32 0, !122, !DIExpression(), !1096)
    #dbg_value(i32 0, !122, !DIExpression(), !1096)
  %33 = load i8, ptr %32, align 1, !dbg !1097, !tbaa !131
    #dbg_value(i8 %33, !1045, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1088)
    #dbg_value(i32 1, !122, !DIExpression(), !1096)
  %34 = getelementptr inbounds nuw i8, ptr %32, i32 1, !dbg !1097
  %35 = load i8, ptr %34, align 1, !dbg !1097, !tbaa !131
    #dbg_value(i8 %35, !1045, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1088)
    #dbg_value(i32 2, !122, !DIExpression(), !1096)
  %36 = getelementptr inbounds nuw i8, ptr %32, i32 2, !dbg !1097
  %37 = load i8, ptr %36, align 1, !dbg !1097, !tbaa !131
    #dbg_value(i8 %37, !1045, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1088)
    #dbg_value(i32 3, !122, !DIExpression(), !1096)
  %38 = getelementptr inbounds nuw i8, ptr %32, i32 3, !dbg !1097
  %39 = load i8, ptr %38, align 1, !dbg !1097, !tbaa !131
    #dbg_value(i8 %39, !1045, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1088)
    #dbg_value(i32 4, !122, !DIExpression(), !1096)
  %40 = zext i8 %12 to i32, !dbg !1098
  %41 = shl nuw i32 %40, 24, !dbg !1098
  %42 = zext i8 %10 to i32, !dbg !1098
  %43 = shl nuw nsw i32 %42, 16, !dbg !1098
  %44 = or disjoint i32 %41, %43, !dbg !1098
  %45 = zext i8 %8 to i32, !dbg !1098
  %46 = shl nuw nsw i32 %45, 8, !dbg !1098
  %47 = or disjoint i32 %44, %46, !dbg !1098
  %48 = zext i8 %6 to i32, !dbg !1098
  %49 = or disjoint i32 %47, %48, !dbg !1098
  %50 = zext i8 %21 to i32, !dbg !1099
  %51 = shl nuw i32 %50, 24, !dbg !1099
  %52 = zext i8 %19 to i32, !dbg !1099
  %53 = shl nuw nsw i32 %52, 16, !dbg !1099
  %54 = or disjoint i32 %51, %53, !dbg !1099
  %55 = zext i8 %17 to i32, !dbg !1099
  %56 = shl nuw nsw i32 %55, 8, !dbg !1099
  %57 = or disjoint i32 %54, %56, !dbg !1099
  %58 = zext i8 %15 to i32, !dbg !1099
  %59 = or disjoint i32 %57, %58, !dbg !1099
  %60 = zext i8 %30 to i32, !dbg !1100
  %61 = shl nuw i32 %60, 24, !dbg !1100
  %62 = zext i8 %28 to i32, !dbg !1100
  %63 = shl nuw nsw i32 %62, 16, !dbg !1100
  %64 = or disjoint i32 %61, %63, !dbg !1100
  %65 = zext i8 %26 to i32, !dbg !1100
  %66 = shl nuw nsw i32 %65, 8, !dbg !1100
  %67 = or disjoint i32 %64, %66, !dbg !1100
  %68 = zext i8 %24 to i32, !dbg !1100
  %69 = or disjoint i32 %67, %68, !dbg !1100
  %70 = zext i8 %39 to i32, !dbg !1101
  %71 = shl nuw i32 %70, 24, !dbg !1101
  %72 = zext i8 %37 to i32, !dbg !1101
  %73 = shl nuw nsw i32 %72, 16, !dbg !1101
  %74 = or disjoint i32 %71, %73, !dbg !1101
  %75 = zext i8 %35 to i32, !dbg !1101
  %76 = shl nuw nsw i32 %75, 8, !dbg !1101
  %77 = or disjoint i32 %74, %76, !dbg !1101
  %78 = zext i8 %33 to i32, !dbg !1101
  %79 = or disjoint i32 %77, %78, !dbg !1101
    #dbg_value(i32 %49, !454, !DIExpression(), !1103)
    #dbg_value(i32 %59, !455, !DIExpression(), !1103)
    #dbg_value(i32 %69, !456, !DIExpression(), !1103)
    #dbg_value(i32 %79, !457, !DIExpression(), !1103)
    #dbg_value(i32 %49, !458, !DIExpression(), !1103)
  %80 = icmp ult i32 %49, %69, !dbg !1101
  %81 = sub i32 0, %69, !dbg !1104
  %82 = select i1 %80, i32 %79, i32 %81, !dbg !1104
  %83 = add i32 %82, %59, !dbg !1104
    #dbg_value(i32 %83, !459, !DIExpression(), !1103)
    #dbg_value(i32 %83, !1046, !DIExpression(), !1088)
  br label %248

84:                                               ; preds = %3
  %85 = load ptr, ptr %1, align 4, !dbg !1105, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !1067)
    #dbg_value(ptr %85, !115, !DIExpression(), !1067)
    #dbg_value(i32 4, !116, !DIExpression(), !1067)
    #dbg_value(ptr undef, !117, !DIExpression(), !1067)
    #dbg_value(ptr %85, !119, !DIExpression(), !1067)
    #dbg_value(i32 0, !122, !DIExpression(), !1106)
    #dbg_value(i32 0, !122, !DIExpression(), !1106)
  %86 = load i8, ptr %85, align 1, !dbg !1107, !tbaa !131
    #dbg_value(i8 %86, !1047, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1108)
    #dbg_value(i32 1, !122, !DIExpression(), !1106)
  %87 = getelementptr inbounds nuw i8, ptr %85, i32 1, !dbg !1107
  %88 = load i8, ptr %87, align 1, !dbg !1107, !tbaa !131
    #dbg_value(i8 %88, !1047, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1108)
    #dbg_value(i32 2, !122, !DIExpression(), !1106)
  %89 = getelementptr inbounds nuw i8, ptr %85, i32 2, !dbg !1107
  %90 = load i8, ptr %89, align 1, !dbg !1107, !tbaa !131
    #dbg_value(i8 %90, !1047, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1108)
    #dbg_value(i32 3, !122, !DIExpression(), !1106)
  %91 = getelementptr inbounds nuw i8, ptr %85, i32 3, !dbg !1107
  %92 = load i8, ptr %91, align 1, !dbg !1107, !tbaa !131
    #dbg_value(i8 %92, !1047, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1108)
    #dbg_value(i32 4, !122, !DIExpression(), !1106)
  %93 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1109
  %94 = load ptr, ptr %93, align 4, !dbg !1109, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !1069)
    #dbg_value(ptr %94, !115, !DIExpression(), !1069)
    #dbg_value(i32 4, !116, !DIExpression(), !1069)
    #dbg_value(ptr undef, !117, !DIExpression(), !1069)
    #dbg_value(ptr %94, !119, !DIExpression(), !1069)
    #dbg_value(i32 0, !122, !DIExpression(), !1110)
    #dbg_value(i32 0, !122, !DIExpression(), !1110)
  %95 = load i8, ptr %94, align 1, !dbg !1111, !tbaa !131
    #dbg_value(i8 %95, !1049, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1108)
    #dbg_value(i32 1, !122, !DIExpression(), !1110)
  %96 = getelementptr inbounds nuw i8, ptr %94, i32 1, !dbg !1111
  %97 = load i8, ptr %96, align 1, !dbg !1111, !tbaa !131
    #dbg_value(i8 %97, !1049, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1108)
    #dbg_value(i32 2, !122, !DIExpression(), !1110)
  %98 = getelementptr inbounds nuw i8, ptr %94, i32 2, !dbg !1111
  %99 = load i8, ptr %98, align 1, !dbg !1111, !tbaa !131
    #dbg_value(i8 %99, !1049, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1108)
    #dbg_value(i32 3, !122, !DIExpression(), !1110)
  %100 = getelementptr inbounds nuw i8, ptr %94, i32 3, !dbg !1111
  %101 = load i8, ptr %100, align 1, !dbg !1111, !tbaa !131
    #dbg_value(i8 %101, !1049, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1108)
    #dbg_value(i32 4, !122, !DIExpression(), !1110)
  %102 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1112
  %103 = load ptr, ptr %102, align 4, !dbg !1112, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !1071)
    #dbg_value(ptr %103, !115, !DIExpression(), !1071)
    #dbg_value(i32 4, !116, !DIExpression(), !1071)
    #dbg_value(ptr undef, !117, !DIExpression(), !1071)
    #dbg_value(ptr %103, !119, !DIExpression(), !1071)
    #dbg_value(i32 0, !122, !DIExpression(), !1113)
    #dbg_value(i32 0, !122, !DIExpression(), !1113)
  %104 = load i8, ptr %103, align 1, !dbg !1114, !tbaa !131
    #dbg_value(i8 %104, !1050, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1108)
    #dbg_value(i32 1, !122, !DIExpression(), !1113)
  %105 = getelementptr inbounds nuw i8, ptr %103, i32 1, !dbg !1114
  %106 = load i8, ptr %105, align 1, !dbg !1114, !tbaa !131
    #dbg_value(i8 %106, !1050, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1108)
    #dbg_value(i32 2, !122, !DIExpression(), !1113)
  %107 = getelementptr inbounds nuw i8, ptr %103, i32 2, !dbg !1114
  %108 = load i8, ptr %107, align 1, !dbg !1114, !tbaa !131
    #dbg_value(i8 %108, !1050, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1108)
    #dbg_value(i32 3, !122, !DIExpression(), !1113)
  %109 = getelementptr inbounds nuw i8, ptr %103, i32 3, !dbg !1114
  %110 = load i8, ptr %109, align 1, !dbg !1114, !tbaa !131
    #dbg_value(i8 %110, !1050, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1108)
    #dbg_value(i32 4, !122, !DIExpression(), !1113)
  %111 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1115
  %112 = load ptr, ptr %111, align 4, !dbg !1115, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !1073)
    #dbg_value(ptr %112, !115, !DIExpression(), !1073)
    #dbg_value(i32 4, !116, !DIExpression(), !1073)
    #dbg_value(ptr undef, !117, !DIExpression(), !1073)
    #dbg_value(ptr %112, !119, !DIExpression(), !1073)
    #dbg_value(i32 0, !122, !DIExpression(), !1116)
    #dbg_value(i32 0, !122, !DIExpression(), !1116)
  %113 = load i8, ptr %112, align 1, !dbg !1117, !tbaa !131
    #dbg_value(i8 %113, !1051, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1108)
    #dbg_value(i32 1, !122, !DIExpression(), !1116)
  %114 = getelementptr inbounds nuw i8, ptr %112, i32 1, !dbg !1117
  %115 = load i8, ptr %114, align 1, !dbg !1117, !tbaa !131
    #dbg_value(i8 %115, !1051, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1108)
    #dbg_value(i32 2, !122, !DIExpression(), !1116)
  %116 = getelementptr inbounds nuw i8, ptr %112, i32 2, !dbg !1117
  %117 = load i8, ptr %116, align 1, !dbg !1117, !tbaa !131
    #dbg_value(i8 %117, !1051, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1108)
    #dbg_value(i32 3, !122, !DIExpression(), !1116)
  %118 = getelementptr inbounds nuw i8, ptr %112, i32 3, !dbg !1117
  %119 = load i8, ptr %118, align 1, !dbg !1117, !tbaa !131
    #dbg_value(i8 %119, !1051, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1108)
    #dbg_value(i32 4, !122, !DIExpression(), !1116)
  %120 = zext i8 %92 to i32, !dbg !1118
  %121 = shl nuw i32 %120, 24, !dbg !1118
  %122 = zext i8 %90 to i32, !dbg !1118
  %123 = shl nuw nsw i32 %122, 16, !dbg !1118
  %124 = or disjoint i32 %121, %123, !dbg !1118
  %125 = zext i8 %88 to i32, !dbg !1118
  %126 = shl nuw nsw i32 %125, 8, !dbg !1118
  %127 = or disjoint i32 %124, %126, !dbg !1118
  %128 = zext i8 %86 to i32, !dbg !1118
  %129 = or disjoint i32 %127, %128, !dbg !1118
  %130 = zext i8 %101 to i32, !dbg !1119
  %131 = shl nuw i32 %130, 24, !dbg !1119
  %132 = zext i8 %99 to i32, !dbg !1119
  %133 = shl nuw nsw i32 %132, 16, !dbg !1119
  %134 = or disjoint i32 %131, %133, !dbg !1119
  %135 = zext i8 %97 to i32, !dbg !1119
  %136 = shl nuw nsw i32 %135, 8, !dbg !1119
  %137 = or disjoint i32 %134, %136, !dbg !1119
  %138 = zext i8 %95 to i32, !dbg !1119
  %139 = or disjoint i32 %137, %138, !dbg !1119
  %140 = zext i8 %110 to i32, !dbg !1120
  %141 = shl nuw i32 %140, 24, !dbg !1120
  %142 = zext i8 %108 to i32, !dbg !1120
  %143 = shl nuw nsw i32 %142, 16, !dbg !1120
  %144 = or disjoint i32 %141, %143, !dbg !1120
  %145 = zext i8 %106 to i32, !dbg !1120
  %146 = shl nuw nsw i32 %145, 8, !dbg !1120
  %147 = or disjoint i32 %144, %146, !dbg !1120
  %148 = zext i8 %104 to i32, !dbg !1120
  %149 = or disjoint i32 %147, %148, !dbg !1120
  %150 = zext i8 %119 to i32, !dbg !1121
  %151 = shl nuw i32 %150, 24, !dbg !1121
  %152 = zext i8 %117 to i32, !dbg !1121
  %153 = shl nuw nsw i32 %152, 16, !dbg !1121
  %154 = or disjoint i32 %151, %153, !dbg !1121
  %155 = zext i8 %115 to i32, !dbg !1121
  %156 = shl nuw nsw i32 %155, 8, !dbg !1121
  %157 = or disjoint i32 %154, %156, !dbg !1121
  %158 = zext i8 %113 to i32, !dbg !1121
  %159 = or disjoint i32 %157, %158, !dbg !1121
    #dbg_value(i32 %129, !471, !DIExpression(), !1123)
    #dbg_value(i32 %139, !472, !DIExpression(), !1123)
    #dbg_value(i32 %149, !473, !DIExpression(), !1123)
    #dbg_value(i32 %159, !474, !DIExpression(), !1123)
    #dbg_value(i32 %129, !475, !DIExpression(), !1123)
    #dbg_value(i32 3, !476, !DIExpression(), !1123)
    #dbg_value(i32 poison, !477, !DIExpression(), !1123)
  %160 = urem i32 %129, 3, !dbg !1121
    #dbg_value(i32 %160, !477, !DIExpression(), !1123)
    #dbg_value(i32 %160, !478, !DIExpression(), !1123)
  %161 = icmp eq i32 %160, 0, !dbg !1124
  %162 = mul i32 %159, %139, !dbg !1125
  %163 = add i32 %149, %139, !dbg !1125
  %164 = select i1 %161, i32 %162, i32 %163, !dbg !1125
    #dbg_value(i32 %164, !479, !DIExpression(), !1123)
    #dbg_value(i32 %164, !1052, !DIExpression(), !1108)
  br label %248

165:                                              ; preds = %3
  %166 = load ptr, ptr %1, align 4, !dbg !1126, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !1075)
    #dbg_value(ptr %166, !115, !DIExpression(), !1075)
    #dbg_value(i32 4, !116, !DIExpression(), !1075)
    #dbg_value(ptr undef, !117, !DIExpression(), !1075)
    #dbg_value(ptr %166, !119, !DIExpression(), !1075)
    #dbg_value(i32 0, !122, !DIExpression(), !1127)
    #dbg_value(i32 0, !122, !DIExpression(), !1127)
  %167 = load i8, ptr %166, align 1, !dbg !1128, !tbaa !131
    #dbg_value(i8 %167, !1053, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1129)
    #dbg_value(i32 1, !122, !DIExpression(), !1127)
  %168 = getelementptr inbounds nuw i8, ptr %166, i32 1, !dbg !1128
  %169 = load i8, ptr %168, align 1, !dbg !1128, !tbaa !131
    #dbg_value(i8 %169, !1053, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1129)
    #dbg_value(i32 2, !122, !DIExpression(), !1127)
  %170 = getelementptr inbounds nuw i8, ptr %166, i32 2, !dbg !1128
  %171 = load i8, ptr %170, align 1, !dbg !1128, !tbaa !131
    #dbg_value(i8 %171, !1053, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1129)
    #dbg_value(i32 3, !122, !DIExpression(), !1127)
  %172 = getelementptr inbounds nuw i8, ptr %166, i32 3, !dbg !1128
  %173 = load i8, ptr %172, align 1, !dbg !1128, !tbaa !131
    #dbg_value(i8 %173, !1053, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1129)
    #dbg_value(i32 4, !122, !DIExpression(), !1127)
  %174 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1130
  %175 = load ptr, ptr %174, align 4, !dbg !1130, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !1077)
    #dbg_value(ptr %175, !115, !DIExpression(), !1077)
    #dbg_value(i32 4, !116, !DIExpression(), !1077)
    #dbg_value(ptr undef, !117, !DIExpression(), !1077)
    #dbg_value(ptr %175, !119, !DIExpression(), !1077)
    #dbg_value(i32 0, !122, !DIExpression(), !1131)
    #dbg_value(i32 0, !122, !DIExpression(), !1131)
  %176 = load i8, ptr %175, align 1, !dbg !1132, !tbaa !131
    #dbg_value(i8 %176, !1055, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1129)
    #dbg_value(i32 1, !122, !DIExpression(), !1131)
  %177 = getelementptr inbounds nuw i8, ptr %175, i32 1, !dbg !1132
  %178 = load i8, ptr %177, align 1, !dbg !1132, !tbaa !131
    #dbg_value(i8 %178, !1055, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1129)
    #dbg_value(i32 2, !122, !DIExpression(), !1131)
  %179 = getelementptr inbounds nuw i8, ptr %175, i32 2, !dbg !1132
  %180 = load i8, ptr %179, align 1, !dbg !1132, !tbaa !131
    #dbg_value(i8 %180, !1055, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1129)
    #dbg_value(i32 3, !122, !DIExpression(), !1131)
  %181 = getelementptr inbounds nuw i8, ptr %175, i32 3, !dbg !1132
  %182 = load i8, ptr %181, align 1, !dbg !1132, !tbaa !131
    #dbg_value(i8 %182, !1055, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1129)
    #dbg_value(i32 4, !122, !DIExpression(), !1131)
  %183 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1133
  %184 = load ptr, ptr %183, align 4, !dbg !1133, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !1079)
    #dbg_value(ptr %184, !115, !DIExpression(), !1079)
    #dbg_value(i32 4, !116, !DIExpression(), !1079)
    #dbg_value(ptr undef, !117, !DIExpression(), !1079)
    #dbg_value(ptr %184, !119, !DIExpression(), !1079)
    #dbg_value(i32 0, !122, !DIExpression(), !1134)
    #dbg_value(i32 0, !122, !DIExpression(), !1134)
  %185 = load i8, ptr %184, align 1, !dbg !1135, !tbaa !131
    #dbg_value(i8 %185, !1056, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1129)
    #dbg_value(i32 1, !122, !DIExpression(), !1134)
  %186 = getelementptr inbounds nuw i8, ptr %184, i32 1, !dbg !1135
  %187 = load i8, ptr %186, align 1, !dbg !1135, !tbaa !131
    #dbg_value(i8 %187, !1056, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1129)
    #dbg_value(i32 2, !122, !DIExpression(), !1134)
  %188 = getelementptr inbounds nuw i8, ptr %184, i32 2, !dbg !1135
  %189 = load i8, ptr %188, align 1, !dbg !1135, !tbaa !131
    #dbg_value(i8 %189, !1056, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1129)
    #dbg_value(i32 3, !122, !DIExpression(), !1134)
  %190 = getelementptr inbounds nuw i8, ptr %184, i32 3, !dbg !1135
  %191 = load i8, ptr %190, align 1, !dbg !1135, !tbaa !131
    #dbg_value(i8 %191, !1056, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1129)
    #dbg_value(i32 4, !122, !DIExpression(), !1134)
  %192 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1136
  %193 = load ptr, ptr %192, align 4, !dbg !1136, !tbaa !777
    #dbg_value(ptr undef, !110, !DIExpression(), !1081)
    #dbg_value(ptr %193, !115, !DIExpression(), !1081)
    #dbg_value(i32 4, !116, !DIExpression(), !1081)
    #dbg_value(ptr undef, !117, !DIExpression(), !1081)
    #dbg_value(ptr %193, !119, !DIExpression(), !1081)
    #dbg_value(i32 0, !122, !DIExpression(), !1137)
    #dbg_value(i32 0, !122, !DIExpression(), !1137)
  %194 = load i8, ptr %193, align 1, !dbg !1138, !tbaa !131
    #dbg_value(i8 %194, !1057, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1129)
    #dbg_value(i32 1, !122, !DIExpression(), !1137)
  %195 = getelementptr inbounds nuw i8, ptr %193, i32 1, !dbg !1138
  %196 = load i8, ptr %195, align 1, !dbg !1138, !tbaa !131
    #dbg_value(i8 %196, !1057, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1129)
    #dbg_value(i32 2, !122, !DIExpression(), !1137)
  %197 = getelementptr inbounds nuw i8, ptr %193, i32 2, !dbg !1138
  %198 = load i8, ptr %197, align 1, !dbg !1138, !tbaa !131
    #dbg_value(i8 %198, !1057, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1129)
    #dbg_value(i32 3, !122, !DIExpression(), !1137)
  %199 = getelementptr inbounds nuw i8, ptr %193, i32 3, !dbg !1138
  %200 = load i8, ptr %199, align 1, !dbg !1138, !tbaa !131
    #dbg_value(i8 %200, !1057, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1129)
    #dbg_value(i32 4, !122, !DIExpression(), !1137)
  %201 = zext i8 %173 to i32, !dbg !1139
  %202 = shl nuw i32 %201, 24, !dbg !1139
  %203 = zext i8 %171 to i32, !dbg !1139
  %204 = shl nuw nsw i32 %203, 16, !dbg !1139
  %205 = or disjoint i32 %202, %204, !dbg !1139
  %206 = zext i8 %169 to i32, !dbg !1139
  %207 = shl nuw nsw i32 %206, 8, !dbg !1139
  %208 = or disjoint i32 %205, %207, !dbg !1139
  %209 = zext i8 %167 to i32, !dbg !1139
  %210 = or disjoint i32 %208, %209, !dbg !1139
  %211 = zext i8 %182 to i32, !dbg !1140
  %212 = shl nuw i32 %211, 24, !dbg !1140
  %213 = zext i8 %180 to i32, !dbg !1140
  %214 = shl nuw nsw i32 %213, 16, !dbg !1140
  %215 = or disjoint i32 %212, %214, !dbg !1140
  %216 = zext i8 %178 to i32, !dbg !1140
  %217 = shl nuw nsw i32 %216, 8, !dbg !1140
  %218 = or disjoint i32 %215, %217, !dbg !1140
  %219 = zext i8 %176 to i32, !dbg !1140
  %220 = or disjoint i32 %218, %219, !dbg !1140
  %221 = zext i8 %191 to i32, !dbg !1141
  %222 = shl nuw i32 %221, 24, !dbg !1141
  %223 = zext i8 %189 to i32, !dbg !1141
  %224 = shl nuw nsw i32 %223, 16, !dbg !1141
  %225 = or disjoint i32 %222, %224, !dbg !1141
  %226 = zext i8 %187 to i32, !dbg !1141
  %227 = shl nuw nsw i32 %226, 8, !dbg !1141
  %228 = or disjoint i32 %225, %227, !dbg !1141
  %229 = zext i8 %185 to i32, !dbg !1141
  %230 = or disjoint i32 %228, %229, !dbg !1141
  %231 = zext i8 %200 to i32, !dbg !1142
  %232 = shl nuw i32 %231, 24, !dbg !1142
  %233 = zext i8 %198 to i32, !dbg !1142
  %234 = shl nuw nsw i32 %233, 16, !dbg !1142
  %235 = or disjoint i32 %232, %234, !dbg !1142
  %236 = zext i8 %196 to i32, !dbg !1142
  %237 = shl nuw nsw i32 %236, 8, !dbg !1142
  %238 = or disjoint i32 %235, %237, !dbg !1142
  %239 = zext i8 %194 to i32, !dbg !1142
  %240 = or disjoint i32 %238, %239, !dbg !1142
    #dbg_value(i32 %210, !494, !DIExpression(), !1144)
    #dbg_value(i32 %220, !495, !DIExpression(), !1144)
    #dbg_value(i32 %230, !496, !DIExpression(), !1144)
    #dbg_value(i32 %240, !497, !DIExpression(), !1144)
    #dbg_value(i32 %210, !498, !DIExpression(), !1144)
  %241 = icmp ult i32 %210, %220, !dbg !1142
  %242 = mul i32 %240, %220, !dbg !1145
  %243 = add i32 %242, %210, !dbg !1145
  %244 = sub i32 %210, %220, !dbg !1145
  %245 = add i32 %244, %230, !dbg !1145
  %246 = select i1 %241, i32 %243, i32 %245, !dbg !1145
    #dbg_value(i32 %246, !499, !DIExpression(), !1144)
    #dbg_value(i32 %246, !1058, !DIExpression(), !1129)
  br label %248

247:                                              ; preds = %3
  tail call void @llvm.trap(), !dbg !1146
  unreachable, !dbg !1148

248:                                              ; preds = %165, %84, %4
  %249 = phi i32 [ %246, %165 ], [ %164, %84 ], [ %83, %4 ], !dbg !1083
  ret i32 %249, !dbg !1149
}

; Function Attrs: cold noreturn nounwind memory(inaccessiblemem: write) uwtable
define hidden noundef i64 @ink_compute_scalar64(i32 noundef %0, ptr nocapture noundef readnone %1, ptr nocapture noundef readnone %2) local_unnamed_addr #10 !dbg !1150 {
    #dbg_value(i32 %0, !1156, !DIExpression(), !1159)
    #dbg_value(ptr %1, !1157, !DIExpression(), !1159)
    #dbg_value(ptr %2, !1158, !DIExpression(), !1159)
  tail call void @llvm.trap(), !dbg !1160
  unreachable, !dbg !1163
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
!164 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_u32", scope: !15, file: !15, line: 82, type: !165, scopeLine: 82, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !172)
!165 = !DISubroutineType(types: !166)
!166 = !{!167, !167, !167, !10, !10}
!167 = !DIDerivedType(tag: DW_TAG_typedef, name: "ink_l_uint32", file: !15, line: 65, baseType: !168)
!168 = distinct !DICompositeType(tag: DW_TAG_structure_type, file: !15, line: 65, size: 64, elements: !169)
!169 = !{!170, !171}
!170 = !DIDerivedType(tag: DW_TAG_member, name: "data", scope: !168, file: !15, line: 65, baseType: !13, size: 32)
!171 = !DIDerivedType(tag: DW_TAG_member, name: "len", scope: !168, file: !15, line: 65, baseType: !5, size: 32, offset: 32)
!172 = !{!173, !174, !175, !176, !177, !178, !179, !181, !184, !185, !186, !187, !188, !189, !192, !194, !195, !196, !197, !199, !202, !203, !204, !205, !206, !207, !208, !209, !210, !213, !215, !216, !217, !218, !219, !220, !221, !223, !226, !227, !228, !229, !230, !231, !234, !235, !237}
!173 = !DILocalVariable(name: "a0", arg: 1, scope: !164, file: !15, line: 82, type: !167)
!174 = !DILocalVariable(name: "a1", arg: 2, scope: !164, file: !15, line: 82, type: !167)
!175 = !DILocalVariable(name: "a2", arg: 3, scope: !164, file: !15, line: 82, type: !10)
!176 = !DILocalVariable(name: "a3", arg: 4, scope: !164, file: !15, line: 82, type: !10)
!177 = !DILocalVariable(name: "t0", scope: !164, file: !15, line: 87, type: !167)
!178 = !DILocalVariable(name: "t1", scope: !164, file: !15, line: 89, type: !167)
!179 = !DILocalVariable(name: "t2", scope: !180, file: !15, line: 90, type: !5)
!180 = distinct !DILexicalBlock(scope: !164, file: !15, line: 90, column: 1)
!181 = !DILocalVariable(name: "t3", scope: !182, file: !15, line: 91, type: !10)
!182 = distinct !DILexicalBlock(scope: !183, file: !15, line: 90, column: 32)
!183 = distinct !DILexicalBlock(scope: !180, file: !15, line: 90, column: 1)
!184 = !DILocalVariable(name: "t4", scope: !182, file: !15, line: 93, type: !10)
!185 = !DILocalVariable(name: "t5", scope: !182, file: !15, line: 95, type: !10)
!186 = !DILocalVariable(name: "t6", scope: !182, file: !15, line: 97, type: !10)
!187 = !DILocalVariable(name: "t7", scope: !182, file: !15, line: 100, type: !10)
!188 = !DILocalVariable(name: "t8", scope: !182, file: !15, line: 102, type: !10)
!189 = !DILocalVariable(name: "t9", scope: !190, file: !15, line: 104, type: !10)
!190 = distinct !DILexicalBlock(scope: !191, file: !15, line: 103, column: 16)
!191 = distinct !DILexicalBlock(scope: !182, file: !15, line: 103, column: 5)
!192 = !DILocalVariable(name: "t10", scope: !193, file: !15, line: 108, type: !10)
!193 = distinct !DILexicalBlock(scope: !191, file: !15, line: 107, column: 8)
!194 = !DILocalVariable(name: "t11", scope: !164, file: !15, line: 114, type: !167)
!195 = !DILocalVariable(name: "t12", scope: !164, file: !15, line: 116, type: !167)
!196 = !DILocalVariable(name: "t13", scope: !164, file: !15, line: 118, type: !167)
!197 = !DILocalVariable(name: "t14", scope: !198, file: !15, line: 119, type: !5)
!198 = distinct !DILexicalBlock(scope: !164, file: !15, line: 119, column: 1)
!199 = !DILocalVariable(name: "t15", scope: !200, file: !15, line: 120, type: !10)
!200 = distinct !DILexicalBlock(scope: !201, file: !15, line: 119, column: 36)
!201 = distinct !DILexicalBlock(scope: !198, file: !15, line: 119, column: 1)
!202 = !DILocalVariable(name: "t16", scope: !200, file: !15, line: 122, type: !10)
!203 = !DILocalVariable(name: "t17", scope: !200, file: !15, line: 124, type: !10)
!204 = !DILocalVariable(name: "t18", scope: !200, file: !15, line: 126, type: !10)
!205 = !DILocalVariable(name: "t19", scope: !200, file: !15, line: 129, type: !10)
!206 = !DILocalVariable(name: "t20", scope: !200, file: !15, line: 131, type: !10)
!207 = !DILocalVariable(name: "t21", scope: !200, file: !15, line: 133, type: !10)
!208 = !DILocalVariable(name: "t22", scope: !200, file: !15, line: 137, type: !10)
!209 = !DILocalVariable(name: "t23", scope: !200, file: !15, line: 139, type: !10)
!210 = !DILocalVariable(name: "t24", scope: !211, file: !15, line: 141, type: !10)
!211 = distinct !DILexicalBlock(scope: !212, file: !15, line: 140, column: 18)
!212 = distinct !DILexicalBlock(scope: !200, file: !15, line: 140, column: 5)
!213 = !DILocalVariable(name: "t25", scope: !214, file: !15, line: 145, type: !10)
!214 = distinct !DILexicalBlock(scope: !212, file: !15, line: 144, column: 8)
!215 = !DILocalVariable(name: "t26", scope: !164, file: !15, line: 151, type: !167)
!216 = !DILocalVariable(name: "t27", scope: !164, file: !15, line: 153, type: !167)
!217 = !DILocalVariable(name: "t28", scope: !164, file: !15, line: 156, type: !5)
!218 = !DILocalVariable(name: "t29", scope: !164, file: !15, line: 157, type: !167)
!219 = !DILocalVariable(name: "t30", scope: !164, file: !15, line: 160, type: !167)
!220 = !DILocalVariable(name: "t31", scope: !164, file: !15, line: 162, type: !167)
!221 = !DILocalVariable(name: "t32", scope: !222, file: !15, line: 163, type: !5)
!222 = distinct !DILexicalBlock(scope: !164, file: !15, line: 163, column: 1)
!223 = !DILocalVariable(name: "t33", scope: !224, file: !15, line: 164, type: !10)
!224 = distinct !DILexicalBlock(scope: !225, file: !15, line: 163, column: 68)
!225 = distinct !DILexicalBlock(scope: !222, file: !15, line: 163, column: 1)
!226 = !DILocalVariable(name: "t34", scope: !224, file: !15, line: 166, type: !10)
!227 = !DILocalVariable(name: "t35", scope: !224, file: !15, line: 168, type: !10)
!228 = !DILocalVariable(name: "t36", scope: !224, file: !15, line: 170, type: !10)
!229 = !DILocalVariable(name: "t37", scope: !224, file: !15, line: 173, type: !10)
!230 = !DILocalVariable(name: "t38", scope: !224, file: !15, line: 175, type: !10)
!231 = !DILocalVariable(name: "t39", scope: !232, file: !15, line: 177, type: !10)
!232 = distinct !DILexicalBlock(scope: !233, file: !15, line: 176, column: 18)
!233 = distinct !DILexicalBlock(scope: !224, file: !15, line: 176, column: 5)
!234 = !DILocalVariable(name: "t40", scope: !232, file: !15, line: 179, type: !10)
!235 = !DILocalVariable(name: "t41", scope: !236, file: !15, line: 183, type: !10)
!236 = distinct !DILexicalBlock(scope: !233, file: !15, line: 182, column: 8)
!237 = !DILocalVariable(name: "t42", scope: !236, file: !15, line: 185, type: !10)
!238 = !DILocation(line: 82, column: 67, scope: !164)
!239 = !DILocation(line: 82, column: 83, scope: !164)
!240 = !DILocation(line: 0, scope: !164)
!241 = !DILocation(line: 87, column: 17, scope: !164)
!242 = !{!243, !243, i64 0}
!243 = !{!"p1 int", !244, i64 0}
!244 = !{!"any pointer", !29, i64 0}
!245 = !DILocation(line: 0, scope: !51, inlinedAt: !246)
!246 = distinct !DILocation(line: 89, column: 18, scope: !164)
!247 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !246)
!248 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !246)
!249 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !250)
!250 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !246)
!251 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !250)
!252 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !246)
!253 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !246)
!254 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !246)
!255 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !246)
!256 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !246)
!257 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !246)
!258 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !246)
!259 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !246)
!260 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !261)
!261 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !246)
!262 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !261)
!263 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !246)
!264 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !246)
!265 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !246)
!266 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !246)
!267 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !246)
!268 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !246)
!269 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !246)
!270 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !246)
!271 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !246)
!272 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !246)
!273 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !274)
!274 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !246)
!275 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !274)
!276 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !246)
!277 = !DILocation(line: 0, scope: !180)
!278 = !DILocation(line: 90, column: 19, scope: !183)
!279 = !DILocation(line: 90, column: 1, scope: !180)
!280 = !DILocation(line: 0, scope: !182)
!281 = !DILocation(line: 93, column: 13, scope: !182)
!282 = !{!283, !283, i64 0}
!283 = !{!"int", !29, i64 0}
!284 = !DILocation(line: 103, column: 9, scope: !191)
!285 = !DILocation(line: 103, column: 5, scope: !191)
!286 = !DILocation(line: 112, column: 1, scope: !182)
!287 = !DILocation(line: 112, column: 12, scope: !182)
!288 = !DILocation(line: 0, scope: !51, inlinedAt: !289)
!289 = distinct !DILocation(line: 118, column: 19, scope: !164)
!290 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !289)
!291 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !292)
!292 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !289)
!293 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !292)
!294 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !289)
!295 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !289)
!296 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !289)
!297 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !289)
!298 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !289)
!299 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !289)
!300 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !301)
!301 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !289)
!302 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !301)
!303 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !289)
!304 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !289)
!305 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !289)
!306 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !289)
!307 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !289)
!308 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !289)
!309 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !289)
!310 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !289)
!311 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !289)
!312 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !289)
!313 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !314)
!314 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !289)
!315 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !314)
!316 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !289)
!317 = !DILocation(line: 0, scope: !198)
!318 = !DILocation(line: 119, column: 1, scope: !198)
!319 = !DILocation(line: 90, column: 29, scope: !183)
!320 = distinct !{!320, !279, !321, !137}
!321 = !DILocation(line: 113, column: 1, scope: !180)
!322 = !DILocation(line: 0, scope: !200)
!323 = !DILocation(line: 122, column: 14, scope: !200)
!324 = !DILocation(line: 136, column: 18, scope: !325)
!325 = distinct !DILexicalBlock(scope: !326, file: !15, line: 136, column: 8)
!326 = distinct !DILexicalBlock(scope: !200, file: !15, line: 134, column: 5)
!327 = !DILocation(line: 140, column: 10, scope: !212)
!328 = !DILocation(line: 140, column: 5, scope: !212)
!329 = !DILocation(line: 149, column: 1, scope: !200)
!330 = !DILocation(line: 149, column: 14, scope: !200)
!331 = !DILocation(line: 153, column: 18, scope: !164)
!332 = !DILocation(line: 155, column: 20, scope: !333)
!333 = distinct !DILexicalBlock(scope: !164, file: !15, line: 155, column: 4)
!334 = !DILocation(line: 155, column: 11, scope: !333)
!335 = !DILocation(line: 119, column: 33, scope: !201)
!336 = distinct !{!336, !318, !337, !137}
!337 = !DILocation(line: 150, column: 1, scope: !198)
!338 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !339)
!339 = distinct !DILocation(line: 155, column: 30, scope: !333)
!340 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !339)
!341 = !DILocation(line: 156, column: 19, scope: !164)
!342 = !DILocation(line: 0, scope: !51, inlinedAt: !343)
!343 = distinct !DILocation(line: 157, column: 19, scope: !164)
!344 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !343)
!345 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !343)
!346 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !347)
!347 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !343)
!348 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !347)
!349 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !343)
!350 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !343)
!351 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !343)
!352 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !343)
!353 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !343)
!354 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !343)
!355 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !343)
!356 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !343)
!357 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !358)
!358 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !343)
!359 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !358)
!360 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !343)
!361 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !343)
!362 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !343)
!363 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !343)
!364 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !343)
!365 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !343)
!366 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !343)
!367 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !343)
!368 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !343)
!369 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !343)
!370 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !371)
!371 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !343)
!372 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !371)
!373 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !343)
!374 = !DILocation(line: 158, column: 35, scope: !164)
!375 = !DILocation(line: 0, scope: !111, inlinedAt: !376)
!376 = distinct !DILocation(line: 158, column: 1, scope: !164)
!377 = !DILocation(line: 0, scope: !123, inlinedAt: !376)
!378 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !376)
!379 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !376)
!380 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !376)
!381 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !376)
!382 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !376)
!383 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !376)
!384 = distinct !{!384, !378, !385, !137}
!385 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !376)
!386 = !DILocation(line: 159, column: 18, scope: !164)
!387 = !DILocation(line: 159, column: 43, scope: !164)
!388 = !DILocation(line: 0, scope: !111, inlinedAt: !389)
!389 = distinct !DILocation(line: 159, column: 1, scope: !164)
!390 = !DILocation(line: 0, scope: !123, inlinedAt: !389)
!391 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !389)
!392 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !389)
!393 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !389)
!394 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !389)
!395 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !389)
!396 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !389)
!397 = distinct !{!397, !392, !398, !137}
!398 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !389)
!399 = !DILocation(line: 162, column: 14, scope: !164)
!400 = !DILocation(line: 162, column: 30, scope: !164)
!401 = !DILocation(line: 0, scope: !51, inlinedAt: !402)
!402 = distinct !DILocation(line: 162, column: 19, scope: !164)
!403 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !402)
!404 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !405)
!405 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !402)
!406 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !405)
!407 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !402)
!408 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !402)
!409 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !402)
!410 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !402)
!411 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !402)
!412 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !402)
!413 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !402)
!414 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !402)
!415 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !416)
!416 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !402)
!417 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !416)
!418 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !402)
!419 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !402)
!420 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !402)
!421 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !402)
!422 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !402)
!423 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !402)
!424 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !402)
!425 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !402)
!426 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !402)
!427 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !402)
!428 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !429)
!429 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !402)
!430 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !429)
!431 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !402)
!432 = !DILocation(line: 162, column: 18, scope: !164)
!433 = !{!434, !243, i64 0}
!434 = !{!"", !243, i64 0, !28, i64 4}
!435 = !{!434, !28, i64 4}
!436 = !DILocation(line: 0, scope: !222)
!437 = !DILocation(line: 163, column: 21, scope: !225)
!438 = !DILocation(line: 163, column: 1, scope: !222)
!439 = !DILocation(line: 164, column: 14, scope: !224)
!440 = !DILocation(line: 0, scope: !224)
!441 = !DILocation(line: 166, column: 14, scope: !224)
!442 = !DILocation(line: 176, column: 10, scope: !233)
!443 = !DILocation(line: 176, column: 5, scope: !233)
!444 = !DILocation(line: 189, column: 1, scope: !224)
!445 = !DILocation(line: 189, column: 14, scope: !224)
!446 = !DILocation(line: 192, column: 1, scope: !164)
!447 = !DILocation(line: 163, column: 65, scope: !225)
!448 = distinct !{!448, !438, !449, !137}
!449 = !DILocation(line: 190, column: 1, scope: !222)
!450 = distinct !DISubprogram(name: "lang_fn_left_word", scope: !15, file: !15, line: 193, type: !451, scopeLine: 193, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !453)
!451 = !DISubroutineType(types: !452)
!452 = !{!10, !10, !10, !10, !10}
!453 = !{!454, !455, !456, !457, !458, !459, !460, !463}
!454 = !DILocalVariable(name: "a0", arg: 1, scope: !450, file: !15, line: 193, type: !10)
!455 = !DILocalVariable(name: "a1", arg: 2, scope: !450, file: !15, line: 193, type: !10)
!456 = !DILocalVariable(name: "a2", arg: 3, scope: !450, file: !15, line: 193, type: !10)
!457 = !DILocalVariable(name: "a3", arg: 4, scope: !450, file: !15, line: 193, type: !10)
!458 = !DILocalVariable(name: "t0", scope: !450, file: !15, line: 198, type: !10)
!459 = !DILocalVariable(name: "t1", scope: !450, file: !15, line: 200, type: !10)
!460 = !DILocalVariable(name: "t2", scope: !461, file: !15, line: 202, type: !10)
!461 = distinct !DILexicalBlock(scope: !462, file: !15, line: 201, column: 16)
!462 = distinct !DILexicalBlock(scope: !450, file: !15, line: 201, column: 5)
!463 = !DILocalVariable(name: "t3", scope: !464, file: !15, line: 206, type: !10)
!464 = distinct !DILexicalBlock(scope: !462, file: !15, line: 205, column: 8)
!465 = !DILocation(line: 0, scope: !450)
!466 = !DILocation(line: 201, column: 9, scope: !462)
!467 = !DILocation(line: 201, column: 5, scope: !462)
!468 = !DILocation(line: 210, column: 1, scope: !450)
!469 = distinct !DISubprogram(name: "lang_fn_right_word", scope: !15, file: !15, line: 212, type: !451, scopeLine: 212, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !470)
!470 = !{!471, !472, !473, !474, !475, !476, !477, !478, !479, !480, !483}
!471 = !DILocalVariable(name: "a0", arg: 1, scope: !469, file: !15, line: 212, type: !10)
!472 = !DILocalVariable(name: "a1", arg: 2, scope: !469, file: !15, line: 212, type: !10)
!473 = !DILocalVariable(name: "a2", arg: 3, scope: !469, file: !15, line: 212, type: !10)
!474 = !DILocalVariable(name: "a3", arg: 4, scope: !469, file: !15, line: 212, type: !10)
!475 = !DILocalVariable(name: "t0", scope: !469, file: !15, line: 217, type: !10)
!476 = !DILocalVariable(name: "t1", scope: !469, file: !15, line: 219, type: !10)
!477 = !DILocalVariable(name: "t2", scope: !469, file: !15, line: 221, type: !10)
!478 = !DILocalVariable(name: "t3", scope: !469, file: !15, line: 225, type: !10)
!479 = !DILocalVariable(name: "t4", scope: !469, file: !15, line: 227, type: !10)
!480 = !DILocalVariable(name: "t5", scope: !481, file: !15, line: 229, type: !10)
!481 = distinct !DILexicalBlock(scope: !482, file: !15, line: 228, column: 17)
!482 = distinct !DILexicalBlock(scope: !469, file: !15, line: 228, column: 5)
!483 = !DILocalVariable(name: "t6", scope: !484, file: !15, line: 233, type: !10)
!484 = distinct !DILexicalBlock(scope: !482, file: !15, line: 232, column: 8)
!485 = !DILocation(line: 0, scope: !469)
!486 = !DILocation(line: 224, column: 16, scope: !487)
!487 = distinct !DILexicalBlock(scope: !488, file: !15, line: 224, column: 8)
!488 = distinct !DILexicalBlock(scope: !469, file: !15, line: 222, column: 5)
!489 = !DILocation(line: 228, column: 9, scope: !482)
!490 = !DILocation(line: 228, column: 5, scope: !482)
!491 = !DILocation(line: 237, column: 1, scope: !469)
!492 = distinct !DISubprogram(name: "lang_fn_pair_word", scope: !15, file: !15, line: 239, type: !451, scopeLine: 239, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !493)
!493 = !{!494, !495, !496, !497, !498, !499, !500, !503, !504, !506}
!494 = !DILocalVariable(name: "a0", arg: 1, scope: !492, file: !15, line: 239, type: !10)
!495 = !DILocalVariable(name: "a1", arg: 2, scope: !492, file: !15, line: 239, type: !10)
!496 = !DILocalVariable(name: "a2", arg: 3, scope: !492, file: !15, line: 239, type: !10)
!497 = !DILocalVariable(name: "a3", arg: 4, scope: !492, file: !15, line: 239, type: !10)
!498 = !DILocalVariable(name: "t0", scope: !492, file: !15, line: 244, type: !10)
!499 = !DILocalVariable(name: "t1", scope: !492, file: !15, line: 246, type: !10)
!500 = !DILocalVariable(name: "t2", scope: !501, file: !15, line: 248, type: !10)
!501 = distinct !DILexicalBlock(scope: !502, file: !15, line: 247, column: 16)
!502 = distinct !DILexicalBlock(scope: !492, file: !15, line: 247, column: 5)
!503 = !DILocalVariable(name: "t3", scope: !501, file: !15, line: 250, type: !10)
!504 = !DILocalVariable(name: "t4", scope: !505, file: !15, line: 254, type: !10)
!505 = distinct !DILexicalBlock(scope: !502, file: !15, line: 253, column: 8)
!506 = !DILocalVariable(name: "t5", scope: !505, file: !15, line: 256, type: !10)
!507 = !DILocation(line: 0, scope: !492)
!508 = !DILocation(line: 247, column: 9, scope: !502)
!509 = !DILocation(line: 247, column: 5, scope: !502)
!510 = !DILocation(line: 260, column: 1, scope: !492)
!511 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_u32_into", scope: !15, file: !15, line: 262, type: !512, scopeLine: 262, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !514)
!512 = !DISubroutineType(types: !513)
!513 = !{!5, !167, !167, !10, !10, !13}
!514 = !{!515, !516, !517, !518, !519, !520, !521, !522, !524, !527, !528, !529, !530, !531, !532, !535, !537, !538, !539, !540, !542, !545, !546, !547, !548, !549, !550, !551, !552, !553, !556, !558, !559, !560, !561, !562, !563, !564, !566, !569, !570, !571, !572, !573, !574, !577, !578, !580}
!515 = !DILocalVariable(name: "a0", arg: 1, scope: !511, file: !15, line: 262, type: !167)
!516 = !DILocalVariable(name: "a1", arg: 2, scope: !511, file: !15, line: 262, type: !167)
!517 = !DILocalVariable(name: "a2", arg: 3, scope: !511, file: !15, line: 262, type: !10)
!518 = !DILocalVariable(name: "a3", arg: 4, scope: !511, file: !15, line: 262, type: !10)
!519 = !DILocalVariable(name: "destination", arg: 5, scope: !511, file: !15, line: 262, type: !13)
!520 = !DILocalVariable(name: "t0", scope: !511, file: !15, line: 267, type: !167)
!521 = !DILocalVariable(name: "t1", scope: !511, file: !15, line: 269, type: !167)
!522 = !DILocalVariable(name: "t2", scope: !523, file: !15, line: 270, type: !5)
!523 = distinct !DILexicalBlock(scope: !511, file: !15, line: 270, column: 1)
!524 = !DILocalVariable(name: "t3", scope: !525, file: !15, line: 271, type: !10)
!525 = distinct !DILexicalBlock(scope: !526, file: !15, line: 270, column: 32)
!526 = distinct !DILexicalBlock(scope: !523, file: !15, line: 270, column: 1)
!527 = !DILocalVariable(name: "t4", scope: !525, file: !15, line: 273, type: !10)
!528 = !DILocalVariable(name: "t5", scope: !525, file: !15, line: 275, type: !10)
!529 = !DILocalVariable(name: "t6", scope: !525, file: !15, line: 277, type: !10)
!530 = !DILocalVariable(name: "t7", scope: !525, file: !15, line: 280, type: !10)
!531 = !DILocalVariable(name: "t8", scope: !525, file: !15, line: 282, type: !10)
!532 = !DILocalVariable(name: "t9", scope: !533, file: !15, line: 284, type: !10)
!533 = distinct !DILexicalBlock(scope: !534, file: !15, line: 283, column: 16)
!534 = distinct !DILexicalBlock(scope: !525, file: !15, line: 283, column: 5)
!535 = !DILocalVariable(name: "t10", scope: !536, file: !15, line: 288, type: !10)
!536 = distinct !DILexicalBlock(scope: !534, file: !15, line: 287, column: 8)
!537 = !DILocalVariable(name: "t11", scope: !511, file: !15, line: 294, type: !167)
!538 = !DILocalVariable(name: "t12", scope: !511, file: !15, line: 296, type: !167)
!539 = !DILocalVariable(name: "t13", scope: !511, file: !15, line: 298, type: !167)
!540 = !DILocalVariable(name: "t14", scope: !541, file: !15, line: 299, type: !5)
!541 = distinct !DILexicalBlock(scope: !511, file: !15, line: 299, column: 1)
!542 = !DILocalVariable(name: "t15", scope: !543, file: !15, line: 300, type: !10)
!543 = distinct !DILexicalBlock(scope: !544, file: !15, line: 299, column: 36)
!544 = distinct !DILexicalBlock(scope: !541, file: !15, line: 299, column: 1)
!545 = !DILocalVariable(name: "t16", scope: !543, file: !15, line: 302, type: !10)
!546 = !DILocalVariable(name: "t17", scope: !543, file: !15, line: 304, type: !10)
!547 = !DILocalVariable(name: "t18", scope: !543, file: !15, line: 306, type: !10)
!548 = !DILocalVariable(name: "t19", scope: !543, file: !15, line: 309, type: !10)
!549 = !DILocalVariable(name: "t20", scope: !543, file: !15, line: 311, type: !10)
!550 = !DILocalVariable(name: "t21", scope: !543, file: !15, line: 313, type: !10)
!551 = !DILocalVariable(name: "t22", scope: !543, file: !15, line: 317, type: !10)
!552 = !DILocalVariable(name: "t23", scope: !543, file: !15, line: 319, type: !10)
!553 = !DILocalVariable(name: "t24", scope: !554, file: !15, line: 321, type: !10)
!554 = distinct !DILexicalBlock(scope: !555, file: !15, line: 320, column: 18)
!555 = distinct !DILexicalBlock(scope: !543, file: !15, line: 320, column: 5)
!556 = !DILocalVariable(name: "t25", scope: !557, file: !15, line: 325, type: !10)
!557 = distinct !DILexicalBlock(scope: !555, file: !15, line: 324, column: 8)
!558 = !DILocalVariable(name: "t26", scope: !511, file: !15, line: 331, type: !167)
!559 = !DILocalVariable(name: "t27", scope: !511, file: !15, line: 333, type: !167)
!560 = !DILocalVariable(name: "t28", scope: !511, file: !15, line: 336, type: !5)
!561 = !DILocalVariable(name: "t29", scope: !511, file: !15, line: 337, type: !167)
!562 = !DILocalVariable(name: "t30", scope: !511, file: !15, line: 340, type: !167)
!563 = !DILocalVariable(name: "t31", scope: !511, file: !15, line: 342, type: !167)
!564 = !DILocalVariable(name: "t32", scope: !565, file: !15, line: 343, type: !5)
!565 = distinct !DILexicalBlock(scope: !511, file: !15, line: 343, column: 1)
!566 = !DILocalVariable(name: "t33", scope: !567, file: !15, line: 344, type: !10)
!567 = distinct !DILexicalBlock(scope: !568, file: !15, line: 343, column: 68)
!568 = distinct !DILexicalBlock(scope: !565, file: !15, line: 343, column: 1)
!569 = !DILocalVariable(name: "t34", scope: !567, file: !15, line: 346, type: !10)
!570 = !DILocalVariable(name: "t35", scope: !567, file: !15, line: 348, type: !10)
!571 = !DILocalVariable(name: "t36", scope: !567, file: !15, line: 350, type: !10)
!572 = !DILocalVariable(name: "t37", scope: !567, file: !15, line: 353, type: !10)
!573 = !DILocalVariable(name: "t38", scope: !567, file: !15, line: 355, type: !10)
!574 = !DILocalVariable(name: "t39", scope: !575, file: !15, line: 357, type: !10)
!575 = distinct !DILexicalBlock(scope: !576, file: !15, line: 356, column: 18)
!576 = distinct !DILexicalBlock(scope: !567, file: !15, line: 356, column: 5)
!577 = !DILocalVariable(name: "t40", scope: !575, file: !15, line: 359, type: !10)
!578 = !DILocalVariable(name: "t41", scope: !579, file: !15, line: 363, type: !10)
!579 = distinct !DILexicalBlock(scope: !576, file: !15, line: 362, column: 8)
!580 = !DILocalVariable(name: "t42", scope: !579, file: !15, line: 365, type: !10)
!581 = !DILocation(line: 262, column: 66, scope: !511)
!582 = !DILocation(line: 262, column: 82, scope: !511)
!583 = !DILocation(line: 0, scope: !511)
!584 = !DILocation(line: 267, column: 17, scope: !511)
!585 = !DILocation(line: 0, scope: !51, inlinedAt: !586)
!586 = distinct !DILocation(line: 269, column: 18, scope: !511)
!587 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !586)
!588 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !586)
!589 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !590)
!590 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !586)
!591 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !590)
!592 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !586)
!593 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !586)
!594 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !586)
!595 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !586)
!596 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !586)
!597 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !586)
!598 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !586)
!599 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !586)
!600 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !601)
!601 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !586)
!602 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !601)
!603 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !586)
!604 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !586)
!605 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !586)
!606 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !586)
!607 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !586)
!608 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !586)
!609 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !586)
!610 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !586)
!611 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !586)
!612 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !586)
!613 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !614)
!614 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !586)
!615 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !614)
!616 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !586)
!617 = !DILocation(line: 0, scope: !523)
!618 = !DILocation(line: 270, column: 19, scope: !526)
!619 = !DILocation(line: 270, column: 1, scope: !523)
!620 = !DILocation(line: 0, scope: !525)
!621 = !DILocation(line: 273, column: 13, scope: !525)
!622 = !DILocation(line: 283, column: 9, scope: !534)
!623 = !DILocation(line: 283, column: 5, scope: !534)
!624 = !DILocation(line: 292, column: 1, scope: !525)
!625 = !DILocation(line: 292, column: 12, scope: !525)
!626 = !DILocation(line: 0, scope: !51, inlinedAt: !627)
!627 = distinct !DILocation(line: 298, column: 19, scope: !511)
!628 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !627)
!629 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !630)
!630 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !627)
!631 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !630)
!632 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !627)
!633 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !627)
!634 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !627)
!635 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !627)
!636 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !627)
!637 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !627)
!638 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !639)
!639 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !627)
!640 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !639)
!641 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !627)
!642 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !627)
!643 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !627)
!644 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !627)
!645 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !627)
!646 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !627)
!647 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !627)
!648 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !627)
!649 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !627)
!650 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !627)
!651 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !652)
!652 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !627)
!653 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !652)
!654 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !627)
!655 = !DILocation(line: 0, scope: !541)
!656 = !DILocation(line: 299, column: 1, scope: !541)
!657 = !DILocation(line: 270, column: 29, scope: !526)
!658 = distinct !{!658, !619, !659, !137}
!659 = !DILocation(line: 293, column: 1, scope: !523)
!660 = !DILocation(line: 0, scope: !543)
!661 = !DILocation(line: 302, column: 14, scope: !543)
!662 = !DILocation(line: 316, column: 18, scope: !663)
!663 = distinct !DILexicalBlock(scope: !664, file: !15, line: 316, column: 8)
!664 = distinct !DILexicalBlock(scope: !543, file: !15, line: 314, column: 5)
!665 = !DILocation(line: 320, column: 10, scope: !555)
!666 = !DILocation(line: 320, column: 5, scope: !555)
!667 = !DILocation(line: 329, column: 1, scope: !543)
!668 = !DILocation(line: 329, column: 14, scope: !543)
!669 = !DILocation(line: 333, column: 18, scope: !511)
!670 = !DILocation(line: 335, column: 20, scope: !671)
!671 = distinct !DILexicalBlock(scope: !511, file: !15, line: 335, column: 4)
!672 = !DILocation(line: 335, column: 11, scope: !671)
!673 = !DILocation(line: 299, column: 33, scope: !544)
!674 = distinct !{!674, !656, !675, !137}
!675 = !DILocation(line: 330, column: 1, scope: !541)
!676 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !677)
!677 = distinct !DILocation(line: 335, column: 30, scope: !671)
!678 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !677)
!679 = !DILocation(line: 336, column: 19, scope: !511)
!680 = !DILocation(line: 0, scope: !51, inlinedAt: !681)
!681 = distinct !DILocation(line: 337, column: 19, scope: !511)
!682 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !681)
!683 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !681)
!684 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !685)
!685 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !681)
!686 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !685)
!687 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !681)
!688 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !681)
!689 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !681)
!690 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !681)
!691 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !681)
!692 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !681)
!693 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !681)
!694 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !681)
!695 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !696)
!696 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !681)
!697 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !696)
!698 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !681)
!699 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !681)
!700 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !681)
!701 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !681)
!702 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !681)
!703 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !681)
!704 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !681)
!705 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !681)
!706 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !681)
!707 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !681)
!708 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !709)
!709 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !681)
!710 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !709)
!711 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !681)
!712 = !DILocation(line: 338, column: 35, scope: !511)
!713 = !DILocation(line: 0, scope: !111, inlinedAt: !714)
!714 = distinct !DILocation(line: 338, column: 1, scope: !511)
!715 = !DILocation(line: 0, scope: !123, inlinedAt: !714)
!716 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !714)
!717 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !714)
!718 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !714)
!719 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !714)
!720 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !714)
!721 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !714)
!722 = distinct !{!722, !716, !723, !137}
!723 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !714)
!724 = !DILocation(line: 339, column: 18, scope: !511)
!725 = !DILocation(line: 339, column: 43, scope: !511)
!726 = !DILocation(line: 0, scope: !111, inlinedAt: !727)
!727 = distinct !DILocation(line: 339, column: 1, scope: !511)
!728 = !DILocation(line: 0, scope: !123, inlinedAt: !727)
!729 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !727)
!730 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !727)
!731 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !727)
!732 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !727)
!733 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !727)
!734 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !727)
!735 = distinct !{!735, !730, !736, !137}
!736 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !727)
!737 = !DILocation(line: 342, column: 32, scope: !511)
!738 = !DILocation(line: 0, scope: !565)
!739 = !DILocation(line: 343, column: 21, scope: !568)
!740 = !DILocation(line: 343, column: 1, scope: !565)
!741 = !DILocation(line: 344, column: 14, scope: !567)
!742 = !DILocation(line: 0, scope: !567)
!743 = !DILocation(line: 346, column: 14, scope: !567)
!744 = !DILocation(line: 356, column: 10, scope: !576)
!745 = !DILocation(line: 356, column: 5, scope: !576)
!746 = !DILocation(line: 369, column: 1, scope: !567)
!747 = !DILocation(line: 369, column: 14, scope: !567)
!748 = !DILocation(line: 371, column: 1, scope: !511)
!749 = !DILocation(line: 343, column: 65, scope: !568)
!750 = distinct !{!750, !740, !751, !137}
!751 = !DILocation(line: 370, column: 1, scope: !565)
!752 = distinct !DISubprogram(name: "ink_compute_into", scope: !15, file: !15, line: 373, type: !753, scopeLine: 373, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !759)
!753 = !DISubroutineType(types: !754)
!754 = !{!5, !10, !755, !757, !8}
!755 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !756, size: 32)
!756 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !103)
!757 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !758, size: 32)
!758 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !5)
!759 = !{!760, !761, !762, !763, !764, !767, !768, !769}
!760 = !DILocalVariable(name: "function", arg: 1, scope: !752, file: !15, line: 373, type: !10)
!761 = !DILocalVariable(name: "data", arg: 2, scope: !752, file: !15, line: 373, type: !755)
!762 = !DILocalVariable(name: "lengths", arg: 3, scope: !752, file: !15, line: 373, type: !757)
!763 = !DILocalVariable(name: "destination", arg: 4, scope: !752, file: !15, line: 373, type: !8)
!764 = !DILocalVariable(name: "a0", scope: !765, file: !15, line: 374, type: !13)
!765 = distinct !DILexicalBlock(scope: !766, file: !15, line: 374, column: 8)
!766 = distinct !DILexicalBlock(scope: !752, file: !15, line: 373, column: 167)
!767 = !DILocalVariable(name: "a1", scope: !765, file: !15, line: 374, type: !13)
!768 = !DILocalVariable(name: "a2", scope: !765, file: !15, line: 374, type: !10)
!769 = !DILocalVariable(name: "a3", scope: !765, file: !15, line: 374, type: !10)
!770 = !DILocation(line: 0, scope: !111, inlinedAt: !771)
!771 = distinct !DILocation(line: 374, column: 87, scope: !765)
!772 = !DILocation(line: 0, scope: !111, inlinedAt: !773)
!773 = distinct !DILocation(line: 374, column: 132, scope: !765)
!774 = !DILocation(line: 0, scope: !752)
!775 = !DILocation(line: 373, column: 151, scope: !752)
!776 = !DILocation(line: 374, column: 34, scope: !765)
!777 = !{!244, !244, i64 0}
!778 = !DILocation(line: 0, scope: !765)
!779 = !DILocation(line: 374, column: 67, scope: !765)
!780 = !DILocation(line: 374, column: 100, scope: !765)
!781 = !DILocation(line: 0, scope: !123, inlinedAt: !771)
!782 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !771)
!783 = !DILocation(line: 374, column: 145, scope: !765)
!784 = !DILocation(line: 0, scope: !123, inlinedAt: !773)
!785 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !773)
!786 = !DILocation(line: 374, column: 231, scope: !765)
!787 = !DILocation(line: 374, column: 235, scope: !765)
!788 = !DILocation(line: 374, column: 261, scope: !765)
!789 = !DILocation(line: 374, column: 265, scope: !765)
!790 = !DILocation(line: 374, column: 280, scope: !765)
!791 = !DILocation(line: 374, column: 172, scope: !765)
!792 = !DILocation(line: 375, column: 30, scope: !752)
!793 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !794)
!794 = distinct !DILocation(line: 375, column: 9, scope: !766)
!795 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !794)
!796 = distinct !DISubprogram(name: "ink_compute_call", scope: !15, file: !15, line: 376, type: !797, scopeLine: 376, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !801)
!797 = !DISubroutineType(types: !798)
!798 = !{null, !10, !755, !757, !799, !800}
!799 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !8, size: 32)
!800 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !5, size: 32)
!801 = !{!802, !803, !804, !805, !806, !807, !810, !811, !812, !813, !814, !816, !817, !818, !819, !820, !821, !823, !824, !825, !826, !827, !828, !830, !831, !832, !833, !834}
!802 = !DILocalVariable(name: "function", arg: 1, scope: !796, file: !15, line: 376, type: !10)
!803 = !DILocalVariable(name: "data", arg: 2, scope: !796, file: !15, line: 376, type: !755)
!804 = !DILocalVariable(name: "lengths", arg: 3, scope: !796, file: !15, line: 376, type: !757)
!805 = !DILocalVariable(name: "output", arg: 4, scope: !796, file: !15, line: 376, type: !799)
!806 = !DILocalVariable(name: "count", arg: 5, scope: !796, file: !15, line: 376, type: !800)
!807 = !DILocalVariable(name: "a0", scope: !808, file: !15, line: 377, type: !13)
!808 = distinct !DILexicalBlock(scope: !809, file: !15, line: 377, column: 8)
!809 = distinct !DILexicalBlock(scope: !796, file: !15, line: 376, column: 158)
!810 = !DILocalVariable(name: "a1", scope: !808, file: !15, line: 377, type: !13)
!811 = !DILocalVariable(name: "a2", scope: !808, file: !15, line: 377, type: !10)
!812 = !DILocalVariable(name: "a3", scope: !808, file: !15, line: 377, type: !10)
!813 = !DILocalVariable(name: "result", scope: !808, file: !15, line: 377, type: !167)
!814 = !DILocalVariable(name: "a0", scope: !815, file: !15, line: 378, type: !10)
!815 = distinct !DILexicalBlock(scope: !809, file: !15, line: 378, column: 8)
!816 = !DILocalVariable(name: "a1", scope: !815, file: !15, line: 378, type: !10)
!817 = !DILocalVariable(name: "a2", scope: !815, file: !15, line: 378, type: !10)
!818 = !DILocalVariable(name: "a3", scope: !815, file: !15, line: 378, type: !10)
!819 = !DILocalVariable(name: "result", scope: !815, file: !15, line: 378, type: !10)
!820 = !DILocalVariable(name: "copy", scope: !815, file: !15, line: 378, type: !13)
!821 = !DILocalVariable(name: "a0", scope: !822, file: !15, line: 379, type: !10)
!822 = distinct !DILexicalBlock(scope: !809, file: !15, line: 379, column: 8)
!823 = !DILocalVariable(name: "a1", scope: !822, file: !15, line: 379, type: !10)
!824 = !DILocalVariable(name: "a2", scope: !822, file: !15, line: 379, type: !10)
!825 = !DILocalVariable(name: "a3", scope: !822, file: !15, line: 379, type: !10)
!826 = !DILocalVariable(name: "result", scope: !822, file: !15, line: 379, type: !10)
!827 = !DILocalVariable(name: "copy", scope: !822, file: !15, line: 379, type: !13)
!828 = !DILocalVariable(name: "a0", scope: !829, file: !15, line: 380, type: !10)
!829 = distinct !DILexicalBlock(scope: !809, file: !15, line: 380, column: 8)
!830 = !DILocalVariable(name: "a1", scope: !829, file: !15, line: 380, type: !10)
!831 = !DILocalVariable(name: "a2", scope: !829, file: !15, line: 380, type: !10)
!832 = !DILocalVariable(name: "a3", scope: !829, file: !15, line: 380, type: !10)
!833 = !DILocalVariable(name: "result", scope: !829, file: !15, line: 380, type: !10)
!834 = !DILocalVariable(name: "copy", scope: !829, file: !15, line: 380, type: !13)
!835 = !DILocation(line: 0, scope: !111, inlinedAt: !836)
!836 = distinct !DILocation(line: 377, column: 87, scope: !808)
!837 = !DILocation(line: 0, scope: !111, inlinedAt: !838)
!838 = distinct !DILocation(line: 377, column: 132, scope: !808)
!839 = distinct !DIAssignID()
!840 = !DILocation(line: 0, scope: !808)
!841 = !DILocation(line: 0, scope: !111, inlinedAt: !842)
!842 = distinct !DILocation(line: 378, column: 21, scope: !815)
!843 = !DILocation(line: 0, scope: !111, inlinedAt: !844)
!844 = distinct !DILocation(line: 378, column: 66, scope: !815)
!845 = !DILocation(line: 0, scope: !111, inlinedAt: !846)
!846 = distinct !DILocation(line: 378, column: 111, scope: !815)
!847 = !DILocation(line: 0, scope: !111, inlinedAt: !848)
!848 = distinct !DILocation(line: 378, column: 156, scope: !815)
!849 = !DILocation(line: 0, scope: !111, inlinedAt: !850)
!850 = distinct !DILocation(line: 379, column: 21, scope: !822)
!851 = !DILocation(line: 0, scope: !111, inlinedAt: !852)
!852 = distinct !DILocation(line: 379, column: 66, scope: !822)
!853 = !DILocation(line: 0, scope: !111, inlinedAt: !854)
!854 = distinct !DILocation(line: 379, column: 111, scope: !822)
!855 = !DILocation(line: 0, scope: !111, inlinedAt: !856)
!856 = distinct !DILocation(line: 379, column: 156, scope: !822)
!857 = !DILocation(line: 0, scope: !111, inlinedAt: !858)
!858 = distinct !DILocation(line: 380, column: 21, scope: !829)
!859 = !DILocation(line: 0, scope: !111, inlinedAt: !860)
!860 = distinct !DILocation(line: 380, column: 66, scope: !829)
!861 = !DILocation(line: 0, scope: !111, inlinedAt: !862)
!862 = distinct !DILocation(line: 380, column: 111, scope: !829)
!863 = !DILocation(line: 0, scope: !111, inlinedAt: !864)
!864 = distinct !DILocation(line: 380, column: 156, scope: !829)
!865 = !DILocation(line: 0, scope: !796)
!866 = !DILocation(line: 376, column: 142, scope: !796)
!867 = !DILocation(line: 377, column: 34, scope: !808)
!868 = !DILocation(line: 377, column: 67, scope: !808)
!869 = !DILocation(line: 377, column: 100, scope: !808)
!870 = !DILocation(line: 0, scope: !123, inlinedAt: !836)
!871 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !836)
!872 = !DILocation(line: 377, column: 145, scope: !808)
!873 = !DILocation(line: 0, scope: !123, inlinedAt: !838)
!874 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !838)
!875 = !DILocation(line: 377, column: 165, scope: !808)
!876 = !DILocation(line: 377, column: 239, scope: !808)
!877 = !DILocation(line: 377, column: 243, scope: !808)
!878 = !DILocation(line: 377, column: 269, scope: !808)
!879 = !DILocation(line: 377, column: 273, scope: !808)
!880 = !DILocation(line: 377, column: 288, scope: !808)
!881 = !DILocation(line: 377, column: 185, scope: !808)
!882 = !DILocation(line: 377, column: 307, scope: !808)
!883 = !DILocation(line: 377, column: 299, scope: !808)
!884 = !DILocation(line: 377, column: 326, scope: !808)
!885 = !DILocation(line: 377, column: 318, scope: !808)
!886 = !DILocation(line: 377, column: 338, scope: !809)
!887 = !DILocation(line: 378, column: 34, scope: !815)
!888 = !DILocation(line: 0, scope: !123, inlinedAt: !842)
!889 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !842)
!890 = !DILocation(line: 0, scope: !815)
!891 = !DILocation(line: 378, column: 79, scope: !815)
!892 = !DILocation(line: 0, scope: !123, inlinedAt: !844)
!893 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !844)
!894 = !DILocation(line: 378, column: 124, scope: !815)
!895 = !DILocation(line: 0, scope: !123, inlinedAt: !846)
!896 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !846)
!897 = !DILocation(line: 378, column: 169, scope: !815)
!898 = !DILocation(line: 0, scope: !123, inlinedAt: !848)
!899 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !848)
!900 = !DILocation(line: 378, column: 226, scope: !815)
!901 = !DILocation(line: 378, column: 229, scope: !815)
!902 = !DILocation(line: 378, column: 232, scope: !815)
!903 = !DILocation(line: 201, column: 9, scope: !462, inlinedAt: !904)
!904 = distinct !DILocation(line: 378, column: 205, scope: !815)
!905 = !DILocation(line: 0, scope: !450, inlinedAt: !904)
!906 = !DILocation(line: 201, column: 5, scope: !462, inlinedAt: !904)
!907 = !DILocation(line: 0, scope: !51, inlinedAt: !908)
!908 = distinct !DILocation(line: 378, column: 251, scope: !815)
!909 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !908)
!910 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !911)
!911 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !908)
!912 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !911)
!913 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !908)
!914 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !908)
!915 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !908)
!916 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !908)
!917 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !908)
!918 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !908)
!919 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !908)
!920 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !908)
!921 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !908)
!922 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !908)
!923 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !908)
!924 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !908)
!925 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !908)
!926 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !908)
!927 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !928)
!928 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !908)
!929 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !928)
!930 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !908)
!931 = !DILocation(line: 378, column: 284, scope: !815)
!932 = !DILocation(line: 378, column: 299, scope: !815)
!933 = !DILocation(line: 378, column: 311, scope: !815)
!934 = !DILocation(line: 379, column: 34, scope: !822)
!935 = !DILocation(line: 0, scope: !123, inlinedAt: !850)
!936 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !850)
!937 = !DILocation(line: 0, scope: !822)
!938 = !DILocation(line: 379, column: 79, scope: !822)
!939 = !DILocation(line: 0, scope: !123, inlinedAt: !852)
!940 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !852)
!941 = !DILocation(line: 379, column: 124, scope: !822)
!942 = !DILocation(line: 0, scope: !123, inlinedAt: !854)
!943 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !854)
!944 = !DILocation(line: 379, column: 169, scope: !822)
!945 = !DILocation(line: 0, scope: !123, inlinedAt: !856)
!946 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !856)
!947 = !DILocation(line: 379, column: 227, scope: !822)
!948 = !DILocation(line: 379, column: 230, scope: !822)
!949 = !DILocation(line: 379, column: 233, scope: !822)
!950 = !DILocation(line: 224, column: 16, scope: !487, inlinedAt: !951)
!951 = distinct !DILocation(line: 379, column: 205, scope: !822)
!952 = !DILocation(line: 0, scope: !469, inlinedAt: !951)
!953 = !DILocation(line: 228, column: 9, scope: !482, inlinedAt: !951)
!954 = !DILocation(line: 228, column: 5, scope: !482, inlinedAt: !951)
!955 = !DILocation(line: 0, scope: !51, inlinedAt: !956)
!956 = distinct !DILocation(line: 379, column: 252, scope: !822)
!957 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !956)
!958 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !959)
!959 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !956)
!960 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !959)
!961 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !956)
!962 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !956)
!963 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !956)
!964 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !956)
!965 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !956)
!966 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !956)
!967 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !956)
!968 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !956)
!969 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !956)
!970 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !956)
!971 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !956)
!972 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !956)
!973 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !956)
!974 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !956)
!975 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !976)
!976 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !956)
!977 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !976)
!978 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !956)
!979 = !DILocation(line: 379, column: 285, scope: !822)
!980 = !DILocation(line: 379, column: 300, scope: !822)
!981 = !DILocation(line: 379, column: 312, scope: !822)
!982 = !DILocation(line: 380, column: 34, scope: !829)
!983 = !DILocation(line: 0, scope: !123, inlinedAt: !858)
!984 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !858)
!985 = !DILocation(line: 0, scope: !829)
!986 = !DILocation(line: 380, column: 79, scope: !829)
!987 = !DILocation(line: 0, scope: !123, inlinedAt: !860)
!988 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !860)
!989 = !DILocation(line: 380, column: 124, scope: !829)
!990 = !DILocation(line: 0, scope: !123, inlinedAt: !862)
!991 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !862)
!992 = !DILocation(line: 380, column: 169, scope: !829)
!993 = !DILocation(line: 0, scope: !123, inlinedAt: !864)
!994 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !864)
!995 = !DILocation(line: 380, column: 226, scope: !829)
!996 = !DILocation(line: 380, column: 229, scope: !829)
!997 = !DILocation(line: 380, column: 232, scope: !829)
!998 = !DILocation(line: 247, column: 9, scope: !502, inlinedAt: !999)
!999 = distinct !DILocation(line: 380, column: 205, scope: !829)
!1000 = !DILocation(line: 0, scope: !492, inlinedAt: !999)
!1001 = !DILocation(line: 247, column: 5, scope: !502, inlinedAt: !999)
!1002 = !DILocation(line: 0, scope: !51, inlinedAt: !1003)
!1003 = distinct !DILocation(line: 380, column: 251, scope: !829)
!1004 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1003)
!1005 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1006)
!1006 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1003)
!1007 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1006)
!1008 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1003)
!1009 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1003)
!1010 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1003)
!1011 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1003)
!1012 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1003)
!1013 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1003)
!1014 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1003)
!1015 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1003)
!1016 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1003)
!1017 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1003)
!1018 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1003)
!1019 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1003)
!1020 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1003)
!1021 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1003)
!1022 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1023)
!1023 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1003)
!1024 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1023)
!1025 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !1003)
!1026 = !DILocation(line: 380, column: 284, scope: !829)
!1027 = !DILocation(line: 380, column: 299, scope: !829)
!1028 = !DILocation(line: 380, column: 311, scope: !829)
!1029 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1030)
!1030 = distinct !DILocation(line: 381, column: 9, scope: !809)
!1031 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1030)
!1032 = !DILocation(line: 381, column: 21, scope: !796)
!1033 = distinct !DISubprogram(name: "ink_compute_scalar32", scope: !15, file: !15, line: 382, type: !1034, scopeLine: 382, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !1036)
!1034 = !DISubroutineType(types: !1035)
!1035 = !{!10, !10, !755, !757}
!1036 = !{!1037, !1038, !1039, !1040, !1043, !1044, !1045, !1046, !1047, !1049, !1050, !1051, !1052, !1053, !1055, !1056, !1057, !1058}
!1037 = !DILocalVariable(name: "function", arg: 1, scope: !1033, file: !15, line: 382, type: !10)
!1038 = !DILocalVariable(name: "data", arg: 2, scope: !1033, file: !15, line: 382, type: !755)
!1039 = !DILocalVariable(name: "lengths", arg: 3, scope: !1033, file: !15, line: 382, type: !757)
!1040 = !DILocalVariable(name: "a0", scope: !1041, file: !15, line: 383, type: !10)
!1041 = distinct !DILexicalBlock(scope: !1042, file: !15, line: 383, column: 8)
!1042 = distinct !DILexicalBlock(scope: !1033, file: !15, line: 382, column: 138)
!1043 = !DILocalVariable(name: "a1", scope: !1041, file: !15, line: 383, type: !10)
!1044 = !DILocalVariable(name: "a2", scope: !1041, file: !15, line: 383, type: !10)
!1045 = !DILocalVariable(name: "a3", scope: !1041, file: !15, line: 383, type: !10)
!1046 = !DILocalVariable(name: "result", scope: !1041, file: !15, line: 383, type: !10)
!1047 = !DILocalVariable(name: "a0", scope: !1048, file: !15, line: 384, type: !10)
!1048 = distinct !DILexicalBlock(scope: !1042, file: !15, line: 384, column: 8)
!1049 = !DILocalVariable(name: "a1", scope: !1048, file: !15, line: 384, type: !10)
!1050 = !DILocalVariable(name: "a2", scope: !1048, file: !15, line: 384, type: !10)
!1051 = !DILocalVariable(name: "a3", scope: !1048, file: !15, line: 384, type: !10)
!1052 = !DILocalVariable(name: "result", scope: !1048, file: !15, line: 384, type: !10)
!1053 = !DILocalVariable(name: "a0", scope: !1054, file: !15, line: 385, type: !10)
!1054 = distinct !DILexicalBlock(scope: !1042, file: !15, line: 385, column: 8)
!1055 = !DILocalVariable(name: "a1", scope: !1054, file: !15, line: 385, type: !10)
!1056 = !DILocalVariable(name: "a2", scope: !1054, file: !15, line: 385, type: !10)
!1057 = !DILocalVariable(name: "a3", scope: !1054, file: !15, line: 385, type: !10)
!1058 = !DILocalVariable(name: "result", scope: !1054, file: !15, line: 385, type: !10)
!1059 = !DILocation(line: 0, scope: !111, inlinedAt: !1060)
!1060 = distinct !DILocation(line: 383, column: 21, scope: !1041)
!1061 = !DILocation(line: 0, scope: !111, inlinedAt: !1062)
!1062 = distinct !DILocation(line: 383, column: 66, scope: !1041)
!1063 = !DILocation(line: 0, scope: !111, inlinedAt: !1064)
!1064 = distinct !DILocation(line: 383, column: 111, scope: !1041)
!1065 = !DILocation(line: 0, scope: !111, inlinedAt: !1066)
!1066 = distinct !DILocation(line: 383, column: 156, scope: !1041)
!1067 = !DILocation(line: 0, scope: !111, inlinedAt: !1068)
!1068 = distinct !DILocation(line: 384, column: 21, scope: !1048)
!1069 = !DILocation(line: 0, scope: !111, inlinedAt: !1070)
!1070 = distinct !DILocation(line: 384, column: 66, scope: !1048)
!1071 = !DILocation(line: 0, scope: !111, inlinedAt: !1072)
!1072 = distinct !DILocation(line: 384, column: 111, scope: !1048)
!1073 = !DILocation(line: 0, scope: !111, inlinedAt: !1074)
!1074 = distinct !DILocation(line: 384, column: 156, scope: !1048)
!1075 = !DILocation(line: 0, scope: !111, inlinedAt: !1076)
!1076 = distinct !DILocation(line: 385, column: 21, scope: !1054)
!1077 = !DILocation(line: 0, scope: !111, inlinedAt: !1078)
!1078 = distinct !DILocation(line: 385, column: 66, scope: !1054)
!1079 = !DILocation(line: 0, scope: !111, inlinedAt: !1080)
!1080 = distinct !DILocation(line: 385, column: 111, scope: !1054)
!1081 = !DILocation(line: 0, scope: !111, inlinedAt: !1082)
!1082 = distinct !DILocation(line: 385, column: 156, scope: !1054)
!1083 = !DILocation(line: 0, scope: !1033)
!1084 = !DILocation(line: 382, column: 122, scope: !1033)
!1085 = !DILocation(line: 383, column: 34, scope: !1041)
!1086 = !DILocation(line: 0, scope: !123, inlinedAt: !1060)
!1087 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1060)
!1088 = !DILocation(line: 0, scope: !1041)
!1089 = !DILocation(line: 383, column: 79, scope: !1041)
!1090 = !DILocation(line: 0, scope: !123, inlinedAt: !1062)
!1091 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1062)
!1092 = !DILocation(line: 383, column: 124, scope: !1041)
!1093 = !DILocation(line: 0, scope: !123, inlinedAt: !1064)
!1094 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1064)
!1095 = !DILocation(line: 383, column: 169, scope: !1041)
!1096 = !DILocation(line: 0, scope: !123, inlinedAt: !1066)
!1097 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1066)
!1098 = !DILocation(line: 383, column: 226, scope: !1041)
!1099 = !DILocation(line: 383, column: 229, scope: !1041)
!1100 = !DILocation(line: 383, column: 232, scope: !1041)
!1101 = !DILocation(line: 201, column: 9, scope: !462, inlinedAt: !1102)
!1102 = distinct !DILocation(line: 383, column: 205, scope: !1041)
!1103 = !DILocation(line: 0, scope: !450, inlinedAt: !1102)
!1104 = !DILocation(line: 201, column: 5, scope: !462, inlinedAt: !1102)
!1105 = !DILocation(line: 384, column: 34, scope: !1048)
!1106 = !DILocation(line: 0, scope: !123, inlinedAt: !1068)
!1107 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1068)
!1108 = !DILocation(line: 0, scope: !1048)
!1109 = !DILocation(line: 384, column: 79, scope: !1048)
!1110 = !DILocation(line: 0, scope: !123, inlinedAt: !1070)
!1111 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1070)
!1112 = !DILocation(line: 384, column: 124, scope: !1048)
!1113 = !DILocation(line: 0, scope: !123, inlinedAt: !1072)
!1114 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1072)
!1115 = !DILocation(line: 384, column: 169, scope: !1048)
!1116 = !DILocation(line: 0, scope: !123, inlinedAt: !1074)
!1117 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1074)
!1118 = !DILocation(line: 384, column: 227, scope: !1048)
!1119 = !DILocation(line: 384, column: 230, scope: !1048)
!1120 = !DILocation(line: 384, column: 233, scope: !1048)
!1121 = !DILocation(line: 224, column: 16, scope: !487, inlinedAt: !1122)
!1122 = distinct !DILocation(line: 384, column: 205, scope: !1048)
!1123 = !DILocation(line: 0, scope: !469, inlinedAt: !1122)
!1124 = !DILocation(line: 228, column: 9, scope: !482, inlinedAt: !1122)
!1125 = !DILocation(line: 228, column: 5, scope: !482, inlinedAt: !1122)
!1126 = !DILocation(line: 385, column: 34, scope: !1054)
!1127 = !DILocation(line: 0, scope: !123, inlinedAt: !1076)
!1128 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1076)
!1129 = !DILocation(line: 0, scope: !1054)
!1130 = !DILocation(line: 385, column: 79, scope: !1054)
!1131 = !DILocation(line: 0, scope: !123, inlinedAt: !1078)
!1132 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1078)
!1133 = !DILocation(line: 385, column: 124, scope: !1054)
!1134 = !DILocation(line: 0, scope: !123, inlinedAt: !1080)
!1135 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1080)
!1136 = !DILocation(line: 385, column: 169, scope: !1054)
!1137 = !DILocation(line: 0, scope: !123, inlinedAt: !1082)
!1138 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1082)
!1139 = !DILocation(line: 385, column: 226, scope: !1054)
!1140 = !DILocation(line: 385, column: 229, scope: !1054)
!1141 = !DILocation(line: 385, column: 232, scope: !1054)
!1142 = !DILocation(line: 247, column: 9, scope: !502, inlinedAt: !1143)
!1143 = distinct !DILocation(line: 385, column: 205, scope: !1054)
!1144 = !DILocation(line: 0, scope: !492, inlinedAt: !1143)
!1145 = !DILocation(line: 247, column: 5, scope: !502, inlinedAt: !1143)
!1146 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1147)
!1147 = distinct !DILocation(line: 386, column: 9, scope: !1042)
!1148 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1147)
!1149 = !DILocation(line: 386, column: 30, scope: !1033)
!1150 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !15, file: !15, line: 387, type: !1151, scopeLine: 387, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !1155)
!1151 = !DISubroutineType(types: !1152)
!1152 = !{!1153, !10, !755, !757}
!1153 = !DIDerivedType(tag: DW_TAG_typedef, name: "uint64_t", file: !11, line: 102, baseType: !1154)
!1154 = !DIBasicType(name: "unsigned long long", size: 64, encoding: DW_ATE_unsigned)
!1155 = !{!1156, !1157, !1158}
!1156 = !DILocalVariable(name: "function", arg: 1, scope: !1150, file: !15, line: 387, type: !10)
!1157 = !DILocalVariable(name: "data", arg: 2, scope: !1150, file: !15, line: 387, type: !755)
!1158 = !DILocalVariable(name: "lengths", arg: 3, scope: !1150, file: !15, line: 387, type: !757)
!1159 = !DILocation(line: 0, scope: !1150)
!1160 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1161)
!1161 = distinct !DILocation(line: 388, column: 9, scope: !1162)
!1162 = distinct !DILexicalBlock(scope: !1150, file: !15, line: 387, column: 138)
!1163 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1161)
