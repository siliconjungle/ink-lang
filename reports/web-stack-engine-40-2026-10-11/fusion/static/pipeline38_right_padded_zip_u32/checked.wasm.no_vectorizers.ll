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
define hidden void @lang_fn_pipeline38_right_padded_zip_u32(ptr dead_on_unwind noalias nocapture writable writeonly sret(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %1, ptr nocapture noundef readnone byval(%struct.ink_l_uint32) align 4 %2, i32 noundef %3, i32 noundef %4) local_unnamed_addr #2 !dbg !164 {
    #dbg_declare(ptr %1, !173, !DIExpression(), !221)
    #dbg_declare(ptr %2, !174, !DIExpression(), !222)
    #dbg_value(i32 %3, !175, !DIExpression(), !223)
    #dbg_value(i32 %4, !176, !DIExpression(), !223)
  %6 = load ptr, ptr %1, align 4, !dbg !224, !tbaa !225
  %7 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !224
  %8 = load i32, ptr %7, align 4, !dbg !224, !tbaa !27
    #dbg_value(ptr %6, !177, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !223)
    #dbg_value(i32 %8, !177, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !223)
    #dbg_declare(ptr %0, !178, !DIExpression(), !228)
    #dbg_value(i32 %8, !55, !DIExpression(), !229)
    #dbg_value(i32 4, !56, !DIExpression(), !229)
  %9 = icmp ugt i32 %8, 1073741823, !dbg !231
  %10 = load i32, ptr @ink_top, align 4
  %11 = icmp ugt i32 %10, -8
  %12 = select i1 %9, i1 true, i1 %11, !dbg !232
  br i1 %12, label %13, label %14, !dbg !232

13:                                               ; preds = %5
  tail call void @llvm.trap(), !dbg !233
  unreachable, !dbg !235

14:                                               ; preds = %5
  %15 = icmp eq i32 %10, 0, !dbg !236
  %16 = add nuw i32 %10, 7, !dbg !237
  %17 = select i1 %15, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %16, !dbg !238
  %18 = and i32 %17, -8, !dbg !239
    #dbg_value(i32 %18, !57, !DIExpression(), !229)
  %19 = tail call i32 @llvm.umax.i32(i32 %8, i32 1), !dbg !240
  %20 = shl nuw i32 %19, 2, !dbg !241
    #dbg_value(i32 %20, !58, !DIExpression(), !229)
  %21 = xor i32 %18, -1, !dbg !242
  %22 = icmp ugt i32 %20, %21, !dbg !243
  br i1 %22, label %23, label %24, !dbg !243

23:                                               ; preds = %14
  tail call void @llvm.trap(), !dbg !244
  unreachable, !dbg !246

24:                                               ; preds = %14
  %25 = add i32 %18, %20, !dbg !247
  store i32 %25, ptr @ink_top, align 4, !dbg !248, !tbaa !27
  %26 = add i32 %25, 65535, !dbg !249
  %27 = lshr i32 %26, 16, !dbg !250
    #dbg_value(i32 %27, !59, !DIExpression(), !229)
  %28 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !251
    #dbg_value(i32 %28, !60, !DIExpression(), !229)
  %29 = icmp ugt i32 %27, %28, !dbg !252
  br i1 %29, label %30, label %35, !dbg !253

30:                                               ; preds = %24
  %31 = sub nuw nsw i32 %27, %28, !dbg !254
  %32 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %31), !dbg !255
  %33 = icmp eq i32 %32, -1, !dbg !256
  br i1 %33, label %34, label %35, !dbg !253

34:                                               ; preds = %30
  tail call void @llvm.trap(), !dbg !257
  unreachable, !dbg !259

35:                                               ; preds = %24, %30
  %36 = inttoptr i32 %18 to ptr, !dbg !260
  store ptr %36, ptr %0, align 4, !dbg !261, !tbaa !262
  %37 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !261
  store i32 %8, ptr %37, align 4, !dbg !261, !tbaa !264
    #dbg_value(i32 0, !179, !DIExpression(), !265)
  %38 = icmp eq i32 %8, 0, !dbg !266
  br i1 %38, label %41, label %39, !dbg !267

39:                                               ; preds = %35
  %40 = sub i32 0, %3
  br label %42, !dbg !267

41:                                               ; preds = %42, %35
  ret void, !dbg !268

42:                                               ; preds = %39, %42
  %43 = phi i32 [ 0, %39 ], [ %61, %42 ]
    #dbg_value(i32 %43, !179, !DIExpression(), !265)
    #dbg_value(i32 %43, !181, !DIExpression(), !269)
  %44 = getelementptr inbounds nuw i32, ptr %6, i32 %43, !dbg !270
  %45 = load i32, ptr %44, align 4, !dbg !270, !tbaa !271
    #dbg_value(i32 %45, !184, !DIExpression(), !269)
    #dbg_value(i32 %3, !185, !DIExpression(), !269)
    #dbg_value(i32 %4, !186, !DIExpression(), !269)
    #dbg_value(i32 %43, !187, !DIExpression(), !269)
  %46 = icmp ult i32 %43, %3, !dbg !273
  %47 = select i1 %46, i32 %4, i32 %40, !dbg !274
  %48 = add i32 %45, %47, !dbg !274
    #dbg_value(i32 %48, !188, !DIExpression(), !269)
    #dbg_value(i32 %48, !194, !DIExpression(), !269)
    #dbg_value(i32 %43, !195, !DIExpression(), !269)
    #dbg_value(i32 %45, !196, !DIExpression(), !269)
    #dbg_value(i32 %3, !197, !DIExpression(), !269)
    #dbg_value(i32 %4, !198, !DIExpression(), !269)
    #dbg_value(i32 %43, !199, !DIExpression(), !269)
    #dbg_value(i32 3, !200, !DIExpression(), !269)
    #dbg_value(i32 poison, !201, !DIExpression(), !269)
  %49 = urem i32 %43, 3, !dbg !275
    #dbg_value(i32 %49, !201, !DIExpression(), !269)
    #dbg_value(i32 %49, !202, !DIExpression(), !269)
  %50 = icmp eq i32 %49, 0, !dbg !278
  %51 = mul i32 %45, %4, !dbg !279
  %52 = add i32 %45, %3, !dbg !279
  %53 = select i1 %50, i32 %51, i32 %52, !dbg !279
    #dbg_value(i32 %53, !203, !DIExpression(), !269)
    #dbg_value(i32 %53, !209, !DIExpression(), !269)
    #dbg_value(i32 %3, !210, !DIExpression(), !269)
    #dbg_value(i32 %4, !211, !DIExpression(), !269)
    #dbg_value(i32 %48, !212, !DIExpression(), !269)
  %54 = icmp ult i32 %48, %53, !dbg !280
  %55 = mul i32 %53, %4, !dbg !281
  %56 = add i32 %55, %48, !dbg !281
  %57 = add i32 %48, %3, !dbg !281
  %58 = sub i32 %57, %53, !dbg !281
  %59 = select i1 %54, i32 %56, i32 %58, !dbg !281
    #dbg_value(i32 %59, !213, !DIExpression(), !269)
  %60 = getelementptr inbounds nuw i32, ptr %36, i32 %43, !dbg !282
  store i32 %59, ptr %60, align 4, !dbg !283, !tbaa !271
  %61 = add nuw i32 %43, 1, !dbg !284
    #dbg_value(i32 %61, !179, !DIExpression(), !265)
  %62 = icmp eq i32 %61, %8, !dbg !266
  br i1 %62, label %41, label %42, !dbg !267, !llvm.loop !285
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_left_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !287 {
    #dbg_value(i32 %0, !291, !DIExpression(), !302)
    #dbg_value(i32 %1, !292, !DIExpression(), !302)
    #dbg_value(i32 %2, !293, !DIExpression(), !302)
    #dbg_value(i32 %3, !294, !DIExpression(), !302)
    #dbg_value(i32 %0, !295, !DIExpression(), !302)
  %5 = icmp ult i32 %0, %2, !dbg !303
  %6 = sub i32 0, %2, !dbg !304
  %7 = select i1 %5, i32 %3, i32 %6, !dbg !304
  %8 = add i32 %7, %1, !dbg !304
    #dbg_value(i32 %8, !296, !DIExpression(), !302)
  ret i32 %8, !dbg !305
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_right_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !306 {
    #dbg_value(i32 %0, !308, !DIExpression(), !322)
    #dbg_value(i32 %1, !309, !DIExpression(), !322)
    #dbg_value(i32 %2, !310, !DIExpression(), !322)
    #dbg_value(i32 %3, !311, !DIExpression(), !322)
    #dbg_value(i32 %0, !312, !DIExpression(), !322)
    #dbg_value(i32 3, !313, !DIExpression(), !322)
    #dbg_value(i32 poison, !314, !DIExpression(), !322)
  %5 = urem i32 %0, 3, !dbg !323
    #dbg_value(i32 %5, !314, !DIExpression(), !322)
    #dbg_value(i32 %5, !314, !DIExpression(), !322)
    #dbg_value(i32 %5, !315, !DIExpression(), !322)
  %6 = icmp eq i32 %5, 0, !dbg !326
  %7 = mul i32 %3, %1, !dbg !327
  %8 = add i32 %2, %1, !dbg !327
  %9 = select i1 %6, i32 %7, i32 %8, !dbg !327
    #dbg_value(i32 %9, !316, !DIExpression(), !322)
  ret i32 %9, !dbg !328
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_pair_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #7 !dbg !329 {
    #dbg_value(i32 %0, !331, !DIExpression(), !344)
    #dbg_value(i32 %1, !332, !DIExpression(), !344)
    #dbg_value(i32 %2, !333, !DIExpression(), !344)
    #dbg_value(i32 %3, !334, !DIExpression(), !344)
    #dbg_value(i32 %0, !335, !DIExpression(), !344)
  %5 = icmp ult i32 %0, %1, !dbg !345
  %6 = mul i32 %3, %1, !dbg !346
  %7 = add i32 %6, %0, !dbg !346
  %8 = sub i32 %0, %1, !dbg !346
  %9 = add i32 %8, %2, !dbg !346
  %10 = select i1 %5, i32 %7, i32 %9, !dbg !346
    #dbg_value(i32 %10, !336, !DIExpression(), !344)
  ret i32 %10, !dbg !347
}

; Function Attrs: nofree norecurse nosync nounwind memory(read, argmem: readwrite, inaccessiblemem: none) uwtable
define hidden i32 @lang_fn_pipeline38_right_padded_zip_u32_into(ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readnone byval(%struct.ink_l_uint32) align 4 %1, i32 noundef %2, i32 noundef %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #8 !dbg !348 {
    #dbg_declare(ptr %0, !352, !DIExpression(), !401)
    #dbg_declare(ptr %1, !353, !DIExpression(), !402)
    #dbg_value(i32 %2, !354, !DIExpression(), !403)
    #dbg_value(i32 %3, !355, !DIExpression(), !403)
    #dbg_value(ptr %4, !356, !DIExpression(), !403)
  %6 = load ptr, ptr %0, align 4, !dbg !404, !tbaa !225
  %7 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !404
  %8 = load i32, ptr %7, align 4, !dbg !404, !tbaa !27
    #dbg_value(ptr %6, !357, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !403)
    #dbg_value(i32 %8, !357, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !403)
    #dbg_value(ptr %4, !358, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !403)
    #dbg_value(i32 %8, !358, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !403)
    #dbg_value(i32 0, !359, !DIExpression(), !405)
  %9 = icmp eq i32 %8, 0, !dbg !406
  br i1 %9, label %12, label %10, !dbg !407

10:                                               ; preds = %5
  %11 = sub i32 0, %2
  br label %13, !dbg !407

12:                                               ; preds = %13, %5
  ret i32 %8, !dbg !408

13:                                               ; preds = %10, %13
  %14 = phi i32 [ 0, %10 ], [ %32, %13 ]
    #dbg_value(i32 %14, !359, !DIExpression(), !405)
    #dbg_value(i32 %14, !361, !DIExpression(), !409)
  %15 = getelementptr inbounds nuw i32, ptr %6, i32 %14, !dbg !410
  %16 = load i32, ptr %15, align 4, !dbg !410, !tbaa !271
    #dbg_value(i32 %16, !364, !DIExpression(), !409)
    #dbg_value(i32 %2, !365, !DIExpression(), !409)
    #dbg_value(i32 %3, !366, !DIExpression(), !409)
    #dbg_value(i32 %14, !367, !DIExpression(), !409)
  %17 = icmp ult i32 %14, %2, !dbg !411
  %18 = select i1 %17, i32 %3, i32 %11, !dbg !412
  %19 = add i32 %16, %18, !dbg !412
    #dbg_value(i32 %19, !368, !DIExpression(), !409)
    #dbg_value(i32 %19, !374, !DIExpression(), !409)
    #dbg_value(i32 %14, !375, !DIExpression(), !409)
    #dbg_value(i32 %16, !376, !DIExpression(), !409)
    #dbg_value(i32 %2, !377, !DIExpression(), !409)
    #dbg_value(i32 %3, !378, !DIExpression(), !409)
    #dbg_value(i32 %14, !379, !DIExpression(), !409)
    #dbg_value(i32 3, !380, !DIExpression(), !409)
    #dbg_value(i32 poison, !381, !DIExpression(), !409)
  %20 = urem i32 %14, 3, !dbg !413
    #dbg_value(i32 %20, !381, !DIExpression(), !409)
    #dbg_value(i32 %20, !382, !DIExpression(), !409)
  %21 = icmp eq i32 %20, 0, !dbg !416
  %22 = mul i32 %16, %3, !dbg !417
  %23 = add i32 %16, %2, !dbg !417
  %24 = select i1 %21, i32 %22, i32 %23, !dbg !417
    #dbg_value(i32 %24, !383, !DIExpression(), !409)
    #dbg_value(i32 %24, !389, !DIExpression(), !409)
    #dbg_value(i32 %2, !390, !DIExpression(), !409)
    #dbg_value(i32 %3, !391, !DIExpression(), !409)
    #dbg_value(i32 %19, !392, !DIExpression(), !409)
  %25 = icmp ult i32 %19, %24, !dbg !418
  %26 = mul i32 %24, %3, !dbg !419
  %27 = add i32 %26, %19, !dbg !419
  %28 = add i32 %19, %2, !dbg !419
  %29 = sub i32 %28, %24, !dbg !419
  %30 = select i1 %25, i32 %27, i32 %29, !dbg !419
    #dbg_value(i32 %30, !393, !DIExpression(), !409)
  %31 = getelementptr inbounds nuw i32, ptr %4, i32 %14, !dbg !420
  store i32 %30, ptr %31, align 4, !dbg !421, !tbaa !271
  %32 = add nuw i32 %14, 1, !dbg !422
    #dbg_value(i32 %32, !359, !DIExpression(), !405)
  %33 = icmp eq i32 %32, %8, !dbg !406
  br i1 %33, label %12, label %13, !dbg !407, !llvm.loop !423
}

; Function Attrs: nounwind memory(read, argmem: readwrite, inaccessiblemem: write) uwtable
define hidden i32 @ink_compute_into(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readonly %2, ptr nocapture noundef writeonly %3) local_unnamed_addr #9 !dbg !425 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !443)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !443)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !443)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !443)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !443)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !443)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !443)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !443)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !445)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !445)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !445)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !445)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !445)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !445)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !445)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !445)
    #dbg_value(i32 %0, !433, !DIExpression(), !447)
    #dbg_value(ptr %1, !434, !DIExpression(), !447)
    #dbg_value(ptr %2, !435, !DIExpression(), !447)
    #dbg_value(ptr %3, !436, !DIExpression(), !447)
  %5 = icmp eq i32 %0, 0, !dbg !448
  br i1 %5, label %6, label %72, !dbg !448

6:                                                ; preds = %4
  %7 = load ptr, ptr %1, align 4, !dbg !449, !tbaa !450
    #dbg_value(ptr %7, !437, !DIExpression(), !451)
    #dbg_value(ptr poison, !440, !DIExpression(), !451)
  %8 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !452
  %9 = load ptr, ptr %8, align 4, !dbg !452, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !443)
    #dbg_value(ptr %9, !115, !DIExpression(), !443)
    #dbg_value(i32 4, !116, !DIExpression(), !443)
    #dbg_value(ptr undef, !117, !DIExpression(), !443)
    #dbg_value(ptr %9, !119, !DIExpression(), !443)
    #dbg_value(i32 0, !122, !DIExpression(), !453)
  %10 = load i8, ptr %9, align 1, !dbg !454, !tbaa !131
    #dbg_value(i8 %10, !441, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !451)
    #dbg_value(i32 1, !122, !DIExpression(), !453)
  %11 = getelementptr inbounds nuw i8, ptr %9, i32 1, !dbg !454
  %12 = load i8, ptr %11, align 1, !dbg !454, !tbaa !131
    #dbg_value(i8 %12, !441, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !451)
    #dbg_value(i32 2, !122, !DIExpression(), !453)
  %13 = getelementptr inbounds nuw i8, ptr %9, i32 2, !dbg !454
  %14 = load i8, ptr %13, align 1, !dbg !454, !tbaa !131
    #dbg_value(i8 %14, !441, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !451)
    #dbg_value(i32 3, !122, !DIExpression(), !453)
  %15 = getelementptr inbounds nuw i8, ptr %9, i32 3, !dbg !454
  %16 = load i8, ptr %15, align 1, !dbg !454, !tbaa !131
    #dbg_value(i8 %16, !441, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !451)
    #dbg_value(i32 4, !122, !DIExpression(), !453)
  %17 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !455
  %18 = load ptr, ptr %17, align 4, !dbg !455, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !445)
    #dbg_value(ptr %18, !115, !DIExpression(), !445)
    #dbg_value(i32 4, !116, !DIExpression(), !445)
    #dbg_value(ptr undef, !117, !DIExpression(), !445)
    #dbg_value(ptr %18, !119, !DIExpression(), !445)
    #dbg_value(i32 0, !122, !DIExpression(), !456)
  %19 = load i8, ptr %18, align 1, !dbg !457, !tbaa !131
    #dbg_value(i8 %19, !442, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !451)
    #dbg_value(i32 1, !122, !DIExpression(), !456)
  %20 = getelementptr inbounds nuw i8, ptr %18, i32 1, !dbg !457
  %21 = load i8, ptr %20, align 1, !dbg !457, !tbaa !131
    #dbg_value(i8 %21, !442, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !451)
    #dbg_value(i32 2, !122, !DIExpression(), !456)
  %22 = getelementptr inbounds nuw i8, ptr %18, i32 2, !dbg !457
  %23 = load i8, ptr %22, align 1, !dbg !457, !tbaa !131
    #dbg_value(i8 %23, !442, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !451)
    #dbg_value(i32 3, !122, !DIExpression(), !456)
  %24 = getelementptr inbounds nuw i8, ptr %18, i32 3, !dbg !457
  %25 = load i8, ptr %24, align 1, !dbg !457, !tbaa !131
    #dbg_value(i8 %25, !442, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !451)
    #dbg_value(i32 4, !122, !DIExpression(), !456)
  %26 = load i32, ptr %2, align 4, !dbg !458, !tbaa !27
  %27 = zext i8 %16 to i32, !dbg !459
  %28 = shl nuw i32 %27, 24, !dbg !459
  %29 = zext i8 %14 to i32, !dbg !459
  %30 = shl nuw nsw i32 %29, 16, !dbg !459
  %31 = or disjoint i32 %28, %30, !dbg !459
  %32 = zext i8 %12 to i32, !dbg !459
  %33 = shl nuw nsw i32 %32, 8, !dbg !459
  %34 = or disjoint i32 %31, %33, !dbg !459
  %35 = zext i8 %10 to i32, !dbg !459
  %36 = or disjoint i32 %34, %35, !dbg !459
  %37 = zext i8 %25 to i32, !dbg !460
  %38 = shl nuw i32 %37, 24, !dbg !460
  %39 = zext i8 %23 to i32, !dbg !460
  %40 = shl nuw nsw i32 %39, 16, !dbg !460
  %41 = or disjoint i32 %38, %40, !dbg !460
  %42 = zext i8 %21 to i32, !dbg !460
  %43 = shl nuw nsw i32 %42, 8, !dbg !460
  %44 = or disjoint i32 %41, %43, !dbg !460
  %45 = zext i8 %19 to i32, !dbg !460
  %46 = or disjoint i32 %44, %45, !dbg !460
    #dbg_value(ptr poison, !353, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !462)
    #dbg_value(i32 poison, !353, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !462)
    #dbg_value(ptr %7, !352, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !462)
    #dbg_value(i32 %26, !352, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !462)
    #dbg_value(i32 %36, !354, !DIExpression(), !462)
    #dbg_value(i32 %46, !355, !DIExpression(), !462)
    #dbg_value(ptr %3, !356, !DIExpression(), !462)
    #dbg_value(ptr %7, !357, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !462)
    #dbg_value(i32 %26, !357, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !462)
    #dbg_value(ptr %3, !358, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !462)
    #dbg_value(i32 %26, !358, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !462)
    #dbg_value(i32 0, !359, !DIExpression(), !463)
  %47 = icmp eq i32 %26, 0, !dbg !460
  br i1 %47, label %71, label %48, !dbg !464

48:                                               ; preds = %6
  %49 = sub i32 0, %36
  br label %50, !dbg !464

50:                                               ; preds = %50, %48
  %51 = phi i32 [ 0, %48 ], [ %69, %50 ]
    #dbg_value(i32 %51, !359, !DIExpression(), !463)
    #dbg_value(i32 %51, !361, !DIExpression(), !465)
  %52 = getelementptr inbounds nuw i32, ptr %7, i32 %51, !dbg !466
  %53 = load i32, ptr %52, align 4, !dbg !466, !tbaa !271
    #dbg_value(i32 %53, !364, !DIExpression(), !465)
    #dbg_value(i32 %36, !365, !DIExpression(), !465)
    #dbg_value(i32 %46, !366, !DIExpression(), !465)
    #dbg_value(i32 %51, !367, !DIExpression(), !465)
  %54 = icmp ult i32 %51, %36, !dbg !467
  %55 = select i1 %54, i32 %46, i32 %49, !dbg !468
  %56 = add i32 %55, %53, !dbg !468
    #dbg_value(i32 %56, !368, !DIExpression(), !465)
    #dbg_value(i32 %56, !374, !DIExpression(), !465)
    #dbg_value(i32 %51, !375, !DIExpression(), !465)
    #dbg_value(i32 %53, !376, !DIExpression(), !465)
    #dbg_value(i32 %36, !377, !DIExpression(), !465)
    #dbg_value(i32 %46, !378, !DIExpression(), !465)
    #dbg_value(i32 %51, !379, !DIExpression(), !465)
    #dbg_value(i32 3, !380, !DIExpression(), !465)
    #dbg_value(i32 poison, !381, !DIExpression(), !465)
  %57 = urem i32 %51, 3, !dbg !469
    #dbg_value(i32 %57, !381, !DIExpression(), !465)
    #dbg_value(i32 %57, !382, !DIExpression(), !465)
  %58 = icmp eq i32 %57, 0, !dbg !470
  %59 = mul i32 %53, %46, !dbg !471
  %60 = add i32 %53, %36, !dbg !471
  %61 = select i1 %58, i32 %59, i32 %60, !dbg !471
    #dbg_value(i32 %61, !383, !DIExpression(), !465)
    #dbg_value(i32 %61, !389, !DIExpression(), !465)
    #dbg_value(i32 %36, !390, !DIExpression(), !465)
    #dbg_value(i32 %46, !391, !DIExpression(), !465)
    #dbg_value(i32 %56, !392, !DIExpression(), !465)
  %62 = icmp ult i32 %56, %61, !dbg !472
  %63 = mul i32 %61, %46, !dbg !473
  %64 = add i32 %63, %56, !dbg !473
  %65 = add i32 %56, %36, !dbg !473
  %66 = sub i32 %65, %61, !dbg !473
  %67 = select i1 %62, i32 %64, i32 %66, !dbg !473
    #dbg_value(i32 %67, !393, !DIExpression(), !465)
  %68 = getelementptr inbounds nuw i32, ptr %3, i32 %51, !dbg !474
  store i32 %67, ptr %68, align 4, !dbg !475, !tbaa !271
  %69 = add nuw i32 %51, 1, !dbg !476
    #dbg_value(i32 %69, !359, !DIExpression(), !463)
  %70 = icmp eq i32 %69, %26, !dbg !460
  br i1 %70, label %71, label %50, !dbg !464, !llvm.loop !477

71:                                               ; preds = %50, %6
  ret i32 %26, !dbg !479

72:                                               ; preds = %4
  tail call void @llvm.trap(), !dbg !480
  unreachable, !dbg !482
}

; Function Attrs: nounwind uwtable
define hidden void @ink_compute_call(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readonly %2, ptr nocapture noundef writeonly %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #2 !dbg !483 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !522)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !522)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !522)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !522)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !522)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !522)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !522)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !522)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !524)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !524)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !524)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !524)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !524)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !524)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !524)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !524)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !526)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !526)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !526)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !526)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !526)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !526)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !526)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !526)
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
    #dbg_value(i32 %0, !489, !DIExpression(), !550)
    #dbg_value(ptr %1, !490, !DIExpression(), !550)
    #dbg_value(ptr %2, !491, !DIExpression(), !550)
    #dbg_value(ptr %3, !492, !DIExpression(), !550)
    #dbg_value(ptr %4, !493, !DIExpression(), !550)
  switch i32 %0, label %396 [
    i32 0, label %6
    i32 1, label %99
    i32 2, label %197
    i32 3, label %296
  ], !dbg !551

6:                                                ; preds = %5
  %7 = load ptr, ptr %1, align 4, !dbg !552, !tbaa !450
    #dbg_value(ptr %7, !494, !DIExpression(), !553)
    #dbg_value(ptr poison, !497, !DIExpression(), !553)
  %8 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !554
  %9 = load ptr, ptr %8, align 4, !dbg !554, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !522)
    #dbg_value(ptr %9, !115, !DIExpression(), !522)
    #dbg_value(i32 4, !116, !DIExpression(), !522)
    #dbg_value(ptr undef, !117, !DIExpression(), !522)
    #dbg_value(ptr %9, !119, !DIExpression(), !522)
    #dbg_value(i32 0, !122, !DIExpression(), !555)
  %10 = load i8, ptr %9, align 1, !dbg !556, !tbaa !131
    #dbg_value(i8 %10, !498, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !553)
    #dbg_value(i32 1, !122, !DIExpression(), !555)
  %11 = getelementptr inbounds nuw i8, ptr %9, i32 1, !dbg !556
  %12 = load i8, ptr %11, align 1, !dbg !556, !tbaa !131
    #dbg_value(i8 %12, !498, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !553)
    #dbg_value(i32 2, !122, !DIExpression(), !555)
  %13 = getelementptr inbounds nuw i8, ptr %9, i32 2, !dbg !556
  %14 = load i8, ptr %13, align 1, !dbg !556, !tbaa !131
    #dbg_value(i8 %14, !498, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !553)
    #dbg_value(i32 3, !122, !DIExpression(), !555)
  %15 = getelementptr inbounds nuw i8, ptr %9, i32 3, !dbg !556
  %16 = load i8, ptr %15, align 1, !dbg !556, !tbaa !131
    #dbg_value(i8 %16, !498, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !553)
    #dbg_value(i32 4, !122, !DIExpression(), !555)
  %17 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !557
  %18 = load ptr, ptr %17, align 4, !dbg !557, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !524)
    #dbg_value(ptr %18, !115, !DIExpression(), !524)
    #dbg_value(i32 4, !116, !DIExpression(), !524)
    #dbg_value(ptr undef, !117, !DIExpression(), !524)
    #dbg_value(ptr %18, !119, !DIExpression(), !524)
    #dbg_value(i32 0, !122, !DIExpression(), !558)
  %19 = load i8, ptr %18, align 1, !dbg !559, !tbaa !131
    #dbg_value(i8 %19, !499, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !553)
    #dbg_value(i32 1, !122, !DIExpression(), !558)
  %20 = getelementptr inbounds nuw i8, ptr %18, i32 1, !dbg !559
  %21 = load i8, ptr %20, align 1, !dbg !559, !tbaa !131
    #dbg_value(i8 %21, !499, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !553)
    #dbg_value(i32 2, !122, !DIExpression(), !558)
  %22 = getelementptr inbounds nuw i8, ptr %18, i32 2, !dbg !559
  %23 = load i8, ptr %22, align 1, !dbg !559, !tbaa !131
    #dbg_value(i8 %23, !499, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !553)
    #dbg_value(i32 3, !122, !DIExpression(), !558)
  %24 = getelementptr inbounds nuw i8, ptr %18, i32 3, !dbg !559
  %25 = load i8, ptr %24, align 1, !dbg !559, !tbaa !131
    #dbg_value(i8 %25, !499, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !553)
    #dbg_value(i32 4, !122, !DIExpression(), !558)
  %26 = load i32, ptr %2, align 4, !dbg !560, !tbaa !27
  %27 = zext i8 %16 to i32, !dbg !561
  %28 = shl nuw i32 %27, 24, !dbg !561
  %29 = zext i8 %14 to i32, !dbg !561
  %30 = shl nuw nsw i32 %29, 16, !dbg !561
  %31 = or disjoint i32 %28, %30, !dbg !561
  %32 = zext i8 %12 to i32, !dbg !561
  %33 = shl nuw nsw i32 %32, 8, !dbg !561
  %34 = or disjoint i32 %31, %33, !dbg !561
  %35 = zext i8 %10 to i32, !dbg !561
  %36 = or disjoint i32 %34, %35, !dbg !561
  %37 = zext i8 %25 to i32, !dbg !562
  %38 = shl nuw i32 %37, 24, !dbg !562
  %39 = zext i8 %23 to i32, !dbg !562
  %40 = shl nuw nsw i32 %39, 16, !dbg !562
  %41 = or disjoint i32 %38, %40, !dbg !562
  %42 = zext i8 %21 to i32, !dbg !562
  %43 = shl nuw nsw i32 %42, 8, !dbg !562
  %44 = or disjoint i32 %41, %43, !dbg !562
  %45 = zext i8 %19 to i32, !dbg !562
  %46 = or disjoint i32 %44, %45, !dbg !562
    #dbg_value(ptr poison, !174, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !565)
    #dbg_value(i32 poison, !174, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !565)
    #dbg_value(ptr %7, !173, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !565)
    #dbg_value(i32 %26, !173, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !565)
    #dbg_value(i32 %36, !175, !DIExpression(), !565)
    #dbg_value(i32 %46, !176, !DIExpression(), !565)
    #dbg_value(ptr %7, !177, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !565)
    #dbg_value(i32 %26, !177, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !565)
    #dbg_value(i32 %26, !55, !DIExpression(), !566)
    #dbg_value(i32 4, !56, !DIExpression(), !566)
  %47 = icmp ugt i32 %26, 1073741823, !dbg !562
  %48 = load i32, ptr @ink_top, align 4, !noalias !567
  %49 = icmp ugt i32 %48, -8
  %50 = select i1 %47, i1 true, i1 %49, !dbg !570
  br i1 %50, label %51, label %52, !dbg !570

51:                                               ; preds = %6
  tail call void @llvm.trap(), !dbg !571
  unreachable, !dbg !573

52:                                               ; preds = %6
  %53 = icmp eq i32 %48, 0, !dbg !574
  %54 = add nuw i32 %48, 7, !dbg !575
  %55 = select i1 %53, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %54, !dbg !576
  %56 = and i32 %55, -8, !dbg !577
    #dbg_value(i32 %56, !57, !DIExpression(), !566)
  %57 = tail call i32 @llvm.umax.i32(i32 %26, i32 1), !dbg !578
  %58 = shl nuw i32 %57, 2, !dbg !579
    #dbg_value(i32 %58, !58, !DIExpression(), !566)
  %59 = xor i32 %56, -1, !dbg !580
  %60 = icmp ugt i32 %58, %59, !dbg !581
  br i1 %60, label %61, label %62, !dbg !581

61:                                               ; preds = %52
  tail call void @llvm.trap(), !dbg !582
  unreachable, !dbg !584

62:                                               ; preds = %52
  %63 = add i32 %56, %58, !dbg !585
  store i32 %63, ptr @ink_top, align 4, !dbg !586, !tbaa !27, !noalias !567
  %64 = add i32 %63, 65535, !dbg !587
  %65 = lshr i32 %64, 16, !dbg !588
    #dbg_value(i32 %65, !59, !DIExpression(), !566)
  %66 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !589, !noalias !567
    #dbg_value(i32 %66, !60, !DIExpression(), !566)
  %67 = icmp ugt i32 %65, %66, !dbg !590
  br i1 %67, label %68, label %73, !dbg !591

68:                                               ; preds = %62
  %69 = sub nuw nsw i32 %65, %66, !dbg !592
  %70 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %69), !dbg !593, !noalias !567
  %71 = icmp eq i32 %70, -1, !dbg !594
  br i1 %71, label %72, label %73, !dbg !591

72:                                               ; preds = %68
  tail call void @llvm.trap(), !dbg !595
  unreachable, !dbg !597

73:                                               ; preds = %68, %62
  %74 = inttoptr i32 %56 to ptr, !dbg !598
    #dbg_value(ptr %74, !178, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !565)
    #dbg_value(ptr %74, !500, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !553)
    #dbg_value(i32 %26, !178, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !565)
    #dbg_value(i32 %26, !500, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !553)
    #dbg_value(i32 0, !179, !DIExpression(), !599)
  %75 = icmp eq i32 %26, 0, !dbg !600
  br i1 %75, label %401, label %76, !dbg !601

76:                                               ; preds = %73
  %77 = sub i32 0, %36
  br label %78, !dbg !601

78:                                               ; preds = %78, %76
  %79 = phi i32 [ 0, %76 ], [ %97, %78 ]
    #dbg_value(i32 %79, !179, !DIExpression(), !599)
    #dbg_value(i32 %79, !181, !DIExpression(), !602)
  %80 = getelementptr inbounds nuw i32, ptr %7, i32 %79, !dbg !603
  %81 = load i32, ptr %80, align 4, !dbg !603, !tbaa !271, !noalias !567
    #dbg_value(i32 %81, !184, !DIExpression(), !602)
    #dbg_value(i32 %36, !185, !DIExpression(), !602)
    #dbg_value(i32 %46, !186, !DIExpression(), !602)
    #dbg_value(i32 %79, !187, !DIExpression(), !602)
  %82 = icmp ult i32 %79, %36, !dbg !604
  %83 = select i1 %82, i32 %46, i32 %77, !dbg !605
  %84 = add i32 %83, %81, !dbg !605
    #dbg_value(i32 %84, !188, !DIExpression(), !602)
    #dbg_value(i32 %84, !194, !DIExpression(), !602)
    #dbg_value(i32 %79, !195, !DIExpression(), !602)
    #dbg_value(i32 %81, !196, !DIExpression(), !602)
    #dbg_value(i32 %36, !197, !DIExpression(), !602)
    #dbg_value(i32 %46, !198, !DIExpression(), !602)
    #dbg_value(i32 %79, !199, !DIExpression(), !602)
    #dbg_value(i32 3, !200, !DIExpression(), !602)
    #dbg_value(i32 poison, !201, !DIExpression(), !602)
  %85 = urem i32 %79, 3, !dbg !606
    #dbg_value(i32 %85, !201, !DIExpression(), !602)
    #dbg_value(i32 %85, !202, !DIExpression(), !602)
  %86 = icmp eq i32 %85, 0, !dbg !607
  %87 = mul i32 %81, %46, !dbg !608
  %88 = add i32 %81, %36, !dbg !608
  %89 = select i1 %86, i32 %87, i32 %88, !dbg !608
    #dbg_value(i32 %89, !203, !DIExpression(), !602)
    #dbg_value(i32 %89, !209, !DIExpression(), !602)
    #dbg_value(i32 %36, !210, !DIExpression(), !602)
    #dbg_value(i32 %46, !211, !DIExpression(), !602)
    #dbg_value(i32 %84, !212, !DIExpression(), !602)
  %90 = icmp ult i32 %84, %89, !dbg !609
  %91 = mul i32 %89, %46, !dbg !610
  %92 = add i32 %91, %84, !dbg !610
  %93 = add i32 %84, %36, !dbg !610
  %94 = sub i32 %93, %89, !dbg !610
  %95 = select i1 %90, i32 %92, i32 %94, !dbg !610
    #dbg_value(i32 %95, !213, !DIExpression(), !602)
  %96 = getelementptr inbounds nuw i32, ptr %74, i32 %79, !dbg !611
  store i32 %95, ptr %96, align 4, !dbg !612, !tbaa !271, !noalias !567
  %97 = add nuw i32 %79, 1, !dbg !613
    #dbg_value(i32 %97, !179, !DIExpression(), !599)
  %98 = icmp eq i32 %97, %26, !dbg !600
  br i1 %98, label %401, label %78, !dbg !601, !llvm.loop !614

99:                                               ; preds = %5
  %100 = load ptr, ptr %1, align 4, !dbg !616, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !526)
    #dbg_value(ptr %100, !115, !DIExpression(), !526)
    #dbg_value(i32 4, !116, !DIExpression(), !526)
    #dbg_value(ptr undef, !117, !DIExpression(), !526)
    #dbg_value(ptr %100, !119, !DIExpression(), !526)
    #dbg_value(i32 0, !122, !DIExpression(), !617)
  %101 = load i8, ptr %100, align 1, !dbg !618, !tbaa !131
    #dbg_value(i8 %101, !501, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !619)
    #dbg_value(i32 1, !122, !DIExpression(), !617)
  %102 = getelementptr inbounds nuw i8, ptr %100, i32 1, !dbg !618
  %103 = load i8, ptr %102, align 1, !dbg !618, !tbaa !131
    #dbg_value(i8 %103, !501, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !619)
    #dbg_value(i32 2, !122, !DIExpression(), !617)
  %104 = getelementptr inbounds nuw i8, ptr %100, i32 2, !dbg !618
  %105 = load i8, ptr %104, align 1, !dbg !618, !tbaa !131
    #dbg_value(i8 %105, !501, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !619)
    #dbg_value(i32 3, !122, !DIExpression(), !617)
  %106 = getelementptr inbounds nuw i8, ptr %100, i32 3, !dbg !618
  %107 = load i8, ptr %106, align 1, !dbg !618, !tbaa !131
    #dbg_value(i8 %107, !501, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !619)
    #dbg_value(i32 4, !122, !DIExpression(), !617)
  %108 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !620
  %109 = load ptr, ptr %108, align 4, !dbg !620, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !528)
    #dbg_value(ptr %109, !115, !DIExpression(), !528)
    #dbg_value(i32 4, !116, !DIExpression(), !528)
    #dbg_value(ptr undef, !117, !DIExpression(), !528)
    #dbg_value(ptr %109, !119, !DIExpression(), !528)
    #dbg_value(i32 0, !122, !DIExpression(), !621)
  %110 = load i8, ptr %109, align 1, !dbg !622, !tbaa !131
    #dbg_value(i8 %110, !503, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !619)
    #dbg_value(i32 1, !122, !DIExpression(), !621)
  %111 = getelementptr inbounds nuw i8, ptr %109, i32 1, !dbg !622
  %112 = load i8, ptr %111, align 1, !dbg !622, !tbaa !131
    #dbg_value(i8 %112, !503, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !619)
    #dbg_value(i32 2, !122, !DIExpression(), !621)
  %113 = getelementptr inbounds nuw i8, ptr %109, i32 2, !dbg !622
  %114 = load i8, ptr %113, align 1, !dbg !622, !tbaa !131
    #dbg_value(i8 %114, !503, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !619)
    #dbg_value(i32 3, !122, !DIExpression(), !621)
  %115 = getelementptr inbounds nuw i8, ptr %109, i32 3, !dbg !622
  %116 = load i8, ptr %115, align 1, !dbg !622, !tbaa !131
    #dbg_value(i8 %116, !503, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !619)
    #dbg_value(i32 4, !122, !DIExpression(), !621)
  %117 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !623
  %118 = load ptr, ptr %117, align 4, !dbg !623, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !530)
    #dbg_value(ptr %118, !115, !DIExpression(), !530)
    #dbg_value(i32 4, !116, !DIExpression(), !530)
    #dbg_value(ptr undef, !117, !DIExpression(), !530)
    #dbg_value(ptr %118, !119, !DIExpression(), !530)
    #dbg_value(i32 0, !122, !DIExpression(), !624)
  %119 = load i8, ptr %118, align 1, !dbg !625, !tbaa !131
    #dbg_value(i8 %119, !504, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !619)
    #dbg_value(i32 1, !122, !DIExpression(), !624)
  %120 = getelementptr inbounds nuw i8, ptr %118, i32 1, !dbg !625
  %121 = load i8, ptr %120, align 1, !dbg !625, !tbaa !131
    #dbg_value(i8 %121, !504, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !619)
    #dbg_value(i32 2, !122, !DIExpression(), !624)
  %122 = getelementptr inbounds nuw i8, ptr %118, i32 2, !dbg !625
  %123 = load i8, ptr %122, align 1, !dbg !625, !tbaa !131
    #dbg_value(i8 %123, !504, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !619)
    #dbg_value(i32 3, !122, !DIExpression(), !624)
  %124 = getelementptr inbounds nuw i8, ptr %118, i32 3, !dbg !625
  %125 = load i8, ptr %124, align 1, !dbg !625, !tbaa !131
    #dbg_value(i8 %125, !504, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !619)
    #dbg_value(i32 4, !122, !DIExpression(), !624)
  %126 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !626
  %127 = load ptr, ptr %126, align 4, !dbg !626, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !532)
    #dbg_value(ptr %127, !115, !DIExpression(), !532)
    #dbg_value(i32 4, !116, !DIExpression(), !532)
    #dbg_value(ptr undef, !117, !DIExpression(), !532)
    #dbg_value(ptr %127, !119, !DIExpression(), !532)
    #dbg_value(i32 0, !122, !DIExpression(), !627)
  %128 = load i8, ptr %127, align 1, !dbg !628, !tbaa !131
    #dbg_value(i8 %128, !505, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !619)
    #dbg_value(i32 1, !122, !DIExpression(), !627)
  %129 = getelementptr inbounds nuw i8, ptr %127, i32 1, !dbg !628
  %130 = load i8, ptr %129, align 1, !dbg !628, !tbaa !131
    #dbg_value(i8 %130, !505, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !619)
    #dbg_value(i32 2, !122, !DIExpression(), !627)
  %131 = getelementptr inbounds nuw i8, ptr %127, i32 2, !dbg !628
  %132 = load i8, ptr %131, align 1, !dbg !628, !tbaa !131
    #dbg_value(i8 %132, !505, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !619)
    #dbg_value(i32 3, !122, !DIExpression(), !627)
  %133 = getelementptr inbounds nuw i8, ptr %127, i32 3, !dbg !628
  %134 = load i8, ptr %133, align 1, !dbg !628, !tbaa !131
    #dbg_value(i8 %134, !505, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !619)
    #dbg_value(i32 4, !122, !DIExpression(), !627)
  %135 = zext i8 %107 to i32, !dbg !629
  %136 = shl nuw i32 %135, 24, !dbg !629
  %137 = zext i8 %105 to i32, !dbg !629
  %138 = shl nuw nsw i32 %137, 16, !dbg !629
  %139 = or disjoint i32 %136, %138, !dbg !629
  %140 = zext i8 %103 to i32, !dbg !629
  %141 = shl nuw nsw i32 %140, 8, !dbg !629
  %142 = or disjoint i32 %139, %141, !dbg !629
  %143 = zext i8 %101 to i32, !dbg !629
  %144 = or disjoint i32 %142, %143, !dbg !629
  %145 = zext i8 %116 to i32, !dbg !630
  %146 = shl nuw i32 %145, 24, !dbg !630
  %147 = zext i8 %114 to i32, !dbg !630
  %148 = shl nuw nsw i32 %147, 16, !dbg !630
  %149 = or disjoint i32 %146, %148, !dbg !630
  %150 = zext i8 %112 to i32, !dbg !630
  %151 = shl nuw nsw i32 %150, 8, !dbg !630
  %152 = or disjoint i32 %149, %151, !dbg !630
  %153 = zext i8 %110 to i32, !dbg !630
  %154 = or disjoint i32 %152, %153, !dbg !630
  %155 = zext i8 %125 to i32, !dbg !631
  %156 = shl nuw i32 %155, 24, !dbg !631
  %157 = zext i8 %123 to i32, !dbg !631
  %158 = shl nuw nsw i32 %157, 16, !dbg !631
  %159 = or disjoint i32 %156, %158, !dbg !631
  %160 = zext i8 %121 to i32, !dbg !631
  %161 = shl nuw nsw i32 %160, 8, !dbg !631
  %162 = or disjoint i32 %159, %161, !dbg !631
  %163 = zext i8 %119 to i32, !dbg !631
  %164 = or disjoint i32 %162, %163, !dbg !631
  %165 = zext i8 %134 to i32, !dbg !632
  %166 = shl nuw i32 %165, 24, !dbg !632
  %167 = zext i8 %132 to i32, !dbg !632
  %168 = shl nuw nsw i32 %167, 16, !dbg !632
  %169 = or disjoint i32 %166, %168, !dbg !632
  %170 = zext i8 %130 to i32, !dbg !632
  %171 = shl nuw nsw i32 %170, 8, !dbg !632
  %172 = or disjoint i32 %169, %171, !dbg !632
  %173 = zext i8 %128 to i32, !dbg !632
  %174 = or disjoint i32 %172, %173, !dbg !632
    #dbg_value(i32 %144, !291, !DIExpression(), !634)
    #dbg_value(i32 %154, !292, !DIExpression(), !634)
    #dbg_value(i32 %164, !293, !DIExpression(), !634)
    #dbg_value(i32 %174, !294, !DIExpression(), !634)
    #dbg_value(i32 %144, !295, !DIExpression(), !634)
  %175 = icmp ult i32 %144, %164, !dbg !632
  %176 = sub i32 0, %164, !dbg !635
  %177 = select i1 %175, i32 %174, i32 %176, !dbg !635
  %178 = add i32 %177, %154, !dbg !635
    #dbg_value(i32 %178, !296, !DIExpression(), !634)
    #dbg_value(i32 %178, !506, !DIExpression(), !619)
    #dbg_value(i32 1, !55, !DIExpression(), !636)
    #dbg_value(i32 4, !56, !DIExpression(), !636)
  %179 = load i32, ptr @ink_top, align 4
  %180 = icmp ugt i32 %179, -8
  br i1 %180, label %181, label %182, !dbg !638

181:                                              ; preds = %99
  tail call void @llvm.trap(), !dbg !639
  unreachable, !dbg !641

182:                                              ; preds = %99
  %183 = icmp eq i32 %179, 0, !dbg !642
  %184 = add nuw i32 %179, 7, !dbg !643
  %185 = select i1 %183, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %184, !dbg !644
  %186 = and i32 %185, -8, !dbg !645
    #dbg_value(i32 %186, !57, !DIExpression(), !636)
    #dbg_value(i32 4, !58, !DIExpression(), !636)
  %187 = or disjoint i32 %186, 4, !dbg !646
  store i32 %187, ptr @ink_top, align 4, !dbg !647, !tbaa !27
  %188 = add i32 %186, 65539, !dbg !648
  %189 = lshr i32 %188, 16, !dbg !649
    #dbg_value(i32 %189, !59, !DIExpression(), !636)
  %190 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !650
    #dbg_value(i32 %190, !60, !DIExpression(), !636)
  %191 = icmp ugt i32 %189, %190, !dbg !651
  br i1 %191, label %192, label %397, !dbg !652

192:                                              ; preds = %182
  %193 = sub nuw nsw i32 %189, %190, !dbg !653
  %194 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %193), !dbg !654
  %195 = icmp eq i32 %194, -1, !dbg !655
  br i1 %195, label %196, label %397, !dbg !652

196:                                              ; preds = %192
  tail call void @llvm.trap(), !dbg !656
  unreachable, !dbg !658

197:                                              ; preds = %5
  %198 = load ptr, ptr %1, align 4, !dbg !659, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !534)
    #dbg_value(ptr %198, !115, !DIExpression(), !534)
    #dbg_value(i32 4, !116, !DIExpression(), !534)
    #dbg_value(ptr undef, !117, !DIExpression(), !534)
    #dbg_value(ptr %198, !119, !DIExpression(), !534)
    #dbg_value(i32 0, !122, !DIExpression(), !660)
  %199 = load i8, ptr %198, align 1, !dbg !661, !tbaa !131
    #dbg_value(i8 %199, !508, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !662)
    #dbg_value(i32 1, !122, !DIExpression(), !660)
  %200 = getelementptr inbounds nuw i8, ptr %198, i32 1, !dbg !661
  %201 = load i8, ptr %200, align 1, !dbg !661, !tbaa !131
    #dbg_value(i8 %201, !508, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !662)
    #dbg_value(i32 2, !122, !DIExpression(), !660)
  %202 = getelementptr inbounds nuw i8, ptr %198, i32 2, !dbg !661
  %203 = load i8, ptr %202, align 1, !dbg !661, !tbaa !131
    #dbg_value(i8 %203, !508, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !662)
    #dbg_value(i32 3, !122, !DIExpression(), !660)
  %204 = getelementptr inbounds nuw i8, ptr %198, i32 3, !dbg !661
  %205 = load i8, ptr %204, align 1, !dbg !661, !tbaa !131
    #dbg_value(i8 %205, !508, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !662)
    #dbg_value(i32 4, !122, !DIExpression(), !660)
  %206 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !663
  %207 = load ptr, ptr %206, align 4, !dbg !663, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !536)
    #dbg_value(ptr %207, !115, !DIExpression(), !536)
    #dbg_value(i32 4, !116, !DIExpression(), !536)
    #dbg_value(ptr undef, !117, !DIExpression(), !536)
    #dbg_value(ptr %207, !119, !DIExpression(), !536)
    #dbg_value(i32 0, !122, !DIExpression(), !664)
  %208 = load i8, ptr %207, align 1, !dbg !665, !tbaa !131
    #dbg_value(i8 %208, !510, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !662)
    #dbg_value(i32 1, !122, !DIExpression(), !664)
  %209 = getelementptr inbounds nuw i8, ptr %207, i32 1, !dbg !665
  %210 = load i8, ptr %209, align 1, !dbg !665, !tbaa !131
    #dbg_value(i8 %210, !510, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !662)
    #dbg_value(i32 2, !122, !DIExpression(), !664)
  %211 = getelementptr inbounds nuw i8, ptr %207, i32 2, !dbg !665
  %212 = load i8, ptr %211, align 1, !dbg !665, !tbaa !131
    #dbg_value(i8 %212, !510, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !662)
    #dbg_value(i32 3, !122, !DIExpression(), !664)
  %213 = getelementptr inbounds nuw i8, ptr %207, i32 3, !dbg !665
  %214 = load i8, ptr %213, align 1, !dbg !665, !tbaa !131
    #dbg_value(i8 %214, !510, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !662)
    #dbg_value(i32 4, !122, !DIExpression(), !664)
  %215 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !666
  %216 = load ptr, ptr %215, align 4, !dbg !666, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !538)
    #dbg_value(ptr %216, !115, !DIExpression(), !538)
    #dbg_value(i32 4, !116, !DIExpression(), !538)
    #dbg_value(ptr undef, !117, !DIExpression(), !538)
    #dbg_value(ptr %216, !119, !DIExpression(), !538)
    #dbg_value(i32 0, !122, !DIExpression(), !667)
  %217 = load i8, ptr %216, align 1, !dbg !668, !tbaa !131
    #dbg_value(i8 %217, !511, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !662)
    #dbg_value(i32 1, !122, !DIExpression(), !667)
  %218 = getelementptr inbounds nuw i8, ptr %216, i32 1, !dbg !668
  %219 = load i8, ptr %218, align 1, !dbg !668, !tbaa !131
    #dbg_value(i8 %219, !511, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !662)
    #dbg_value(i32 2, !122, !DIExpression(), !667)
  %220 = getelementptr inbounds nuw i8, ptr %216, i32 2, !dbg !668
  %221 = load i8, ptr %220, align 1, !dbg !668, !tbaa !131
    #dbg_value(i8 %221, !511, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !662)
    #dbg_value(i32 3, !122, !DIExpression(), !667)
  %222 = getelementptr inbounds nuw i8, ptr %216, i32 3, !dbg !668
  %223 = load i8, ptr %222, align 1, !dbg !668, !tbaa !131
    #dbg_value(i8 %223, !511, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !662)
    #dbg_value(i32 4, !122, !DIExpression(), !667)
  %224 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !669
  %225 = load ptr, ptr %224, align 4, !dbg !669, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !540)
    #dbg_value(ptr %225, !115, !DIExpression(), !540)
    #dbg_value(i32 4, !116, !DIExpression(), !540)
    #dbg_value(ptr undef, !117, !DIExpression(), !540)
    #dbg_value(ptr %225, !119, !DIExpression(), !540)
    #dbg_value(i32 0, !122, !DIExpression(), !670)
  %226 = load i8, ptr %225, align 1, !dbg !671, !tbaa !131
    #dbg_value(i8 %226, !512, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !662)
    #dbg_value(i32 1, !122, !DIExpression(), !670)
  %227 = getelementptr inbounds nuw i8, ptr %225, i32 1, !dbg !671
  %228 = load i8, ptr %227, align 1, !dbg !671, !tbaa !131
    #dbg_value(i8 %228, !512, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !662)
    #dbg_value(i32 2, !122, !DIExpression(), !670)
  %229 = getelementptr inbounds nuw i8, ptr %225, i32 2, !dbg !671
  %230 = load i8, ptr %229, align 1, !dbg !671, !tbaa !131
    #dbg_value(i8 %230, !512, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !662)
    #dbg_value(i32 3, !122, !DIExpression(), !670)
  %231 = getelementptr inbounds nuw i8, ptr %225, i32 3, !dbg !671
  %232 = load i8, ptr %231, align 1, !dbg !671, !tbaa !131
    #dbg_value(i8 %232, !512, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !662)
    #dbg_value(i32 4, !122, !DIExpression(), !670)
  %233 = zext i8 %205 to i32, !dbg !672
  %234 = shl nuw i32 %233, 24, !dbg !672
  %235 = zext i8 %203 to i32, !dbg !672
  %236 = shl nuw nsw i32 %235, 16, !dbg !672
  %237 = or disjoint i32 %234, %236, !dbg !672
  %238 = zext i8 %201 to i32, !dbg !672
  %239 = shl nuw nsw i32 %238, 8, !dbg !672
  %240 = or disjoint i32 %237, %239, !dbg !672
  %241 = zext i8 %199 to i32, !dbg !672
  %242 = or disjoint i32 %240, %241, !dbg !672
  %243 = zext i8 %214 to i32, !dbg !673
  %244 = shl nuw i32 %243, 24, !dbg !673
  %245 = zext i8 %212 to i32, !dbg !673
  %246 = shl nuw nsw i32 %245, 16, !dbg !673
  %247 = or disjoint i32 %244, %246, !dbg !673
  %248 = zext i8 %210 to i32, !dbg !673
  %249 = shl nuw nsw i32 %248, 8, !dbg !673
  %250 = or disjoint i32 %247, %249, !dbg !673
  %251 = zext i8 %208 to i32, !dbg !673
  %252 = or disjoint i32 %250, %251, !dbg !673
  %253 = zext i8 %223 to i32, !dbg !674
  %254 = shl nuw i32 %253, 24, !dbg !674
  %255 = zext i8 %221 to i32, !dbg !674
  %256 = shl nuw nsw i32 %255, 16, !dbg !674
  %257 = or disjoint i32 %254, %256, !dbg !674
  %258 = zext i8 %219 to i32, !dbg !674
  %259 = shl nuw nsw i32 %258, 8, !dbg !674
  %260 = or disjoint i32 %257, %259, !dbg !674
  %261 = zext i8 %217 to i32, !dbg !674
  %262 = or disjoint i32 %260, %261, !dbg !674
  %263 = zext i8 %232 to i32, !dbg !675
  %264 = shl nuw i32 %263, 24, !dbg !675
  %265 = zext i8 %230 to i32, !dbg !675
  %266 = shl nuw nsw i32 %265, 16, !dbg !675
  %267 = or disjoint i32 %264, %266, !dbg !675
  %268 = zext i8 %228 to i32, !dbg !675
  %269 = shl nuw nsw i32 %268, 8, !dbg !675
  %270 = or disjoint i32 %267, %269, !dbg !675
  %271 = zext i8 %226 to i32, !dbg !675
  %272 = or disjoint i32 %270, %271, !dbg !675
    #dbg_value(i32 %242, !308, !DIExpression(), !677)
    #dbg_value(i32 %252, !309, !DIExpression(), !677)
    #dbg_value(i32 %262, !310, !DIExpression(), !677)
    #dbg_value(i32 %272, !311, !DIExpression(), !677)
    #dbg_value(i32 %242, !312, !DIExpression(), !677)
    #dbg_value(i32 3, !313, !DIExpression(), !677)
    #dbg_value(i32 poison, !314, !DIExpression(), !677)
  %273 = urem i32 %242, 3, !dbg !675
    #dbg_value(i32 %273, !314, !DIExpression(), !677)
    #dbg_value(i32 %273, !315, !DIExpression(), !677)
  %274 = icmp eq i32 %273, 0, !dbg !678
  %275 = mul i32 %272, %252, !dbg !679
  %276 = add i32 %262, %252, !dbg !679
  %277 = select i1 %274, i32 %275, i32 %276, !dbg !679
    #dbg_value(i32 %277, !316, !DIExpression(), !677)
    #dbg_value(i32 %277, !513, !DIExpression(), !662)
    #dbg_value(i32 1, !55, !DIExpression(), !680)
    #dbg_value(i32 4, !56, !DIExpression(), !680)
  %278 = load i32, ptr @ink_top, align 4
  %279 = icmp ugt i32 %278, -8
  br i1 %279, label %280, label %281, !dbg !682

280:                                              ; preds = %197
  tail call void @llvm.trap(), !dbg !683
  unreachable, !dbg !685

281:                                              ; preds = %197
  %282 = icmp eq i32 %278, 0, !dbg !686
  %283 = add nuw i32 %278, 7, !dbg !687
  %284 = select i1 %282, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %283, !dbg !688
  %285 = and i32 %284, -8, !dbg !689
    #dbg_value(i32 %285, !57, !DIExpression(), !680)
    #dbg_value(i32 4, !58, !DIExpression(), !680)
  %286 = or disjoint i32 %285, 4, !dbg !690
  store i32 %286, ptr @ink_top, align 4, !dbg !691, !tbaa !27
  %287 = add i32 %285, 65539, !dbg !692
  %288 = lshr i32 %287, 16, !dbg !693
    #dbg_value(i32 %288, !59, !DIExpression(), !680)
  %289 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !694
    #dbg_value(i32 %289, !60, !DIExpression(), !680)
  %290 = icmp ugt i32 %288, %289, !dbg !695
  br i1 %290, label %291, label %397, !dbg !696

291:                                              ; preds = %281
  %292 = sub nuw nsw i32 %288, %289, !dbg !697
  %293 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %292), !dbg !698
  %294 = icmp eq i32 %293, -1, !dbg !699
  br i1 %294, label %295, label %397, !dbg !696

295:                                              ; preds = %291
  tail call void @llvm.trap(), !dbg !700
  unreachable, !dbg !702

296:                                              ; preds = %5
  %297 = load ptr, ptr %1, align 4, !dbg !703, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !542)
    #dbg_value(ptr %297, !115, !DIExpression(), !542)
    #dbg_value(i32 4, !116, !DIExpression(), !542)
    #dbg_value(ptr undef, !117, !DIExpression(), !542)
    #dbg_value(ptr %297, !119, !DIExpression(), !542)
    #dbg_value(i32 0, !122, !DIExpression(), !704)
  %298 = load i8, ptr %297, align 1, !dbg !705, !tbaa !131
    #dbg_value(i8 %298, !515, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !706)
    #dbg_value(i32 1, !122, !DIExpression(), !704)
  %299 = getelementptr inbounds nuw i8, ptr %297, i32 1, !dbg !705
  %300 = load i8, ptr %299, align 1, !dbg !705, !tbaa !131
    #dbg_value(i8 %300, !515, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !706)
    #dbg_value(i32 2, !122, !DIExpression(), !704)
  %301 = getelementptr inbounds nuw i8, ptr %297, i32 2, !dbg !705
  %302 = load i8, ptr %301, align 1, !dbg !705, !tbaa !131
    #dbg_value(i8 %302, !515, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !706)
    #dbg_value(i32 3, !122, !DIExpression(), !704)
  %303 = getelementptr inbounds nuw i8, ptr %297, i32 3, !dbg !705
  %304 = load i8, ptr %303, align 1, !dbg !705, !tbaa !131
    #dbg_value(i8 %304, !515, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !706)
    #dbg_value(i32 4, !122, !DIExpression(), !704)
  %305 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !707
  %306 = load ptr, ptr %305, align 4, !dbg !707, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !544)
    #dbg_value(ptr %306, !115, !DIExpression(), !544)
    #dbg_value(i32 4, !116, !DIExpression(), !544)
    #dbg_value(ptr undef, !117, !DIExpression(), !544)
    #dbg_value(ptr %306, !119, !DIExpression(), !544)
    #dbg_value(i32 0, !122, !DIExpression(), !708)
  %307 = load i8, ptr %306, align 1, !dbg !709, !tbaa !131
    #dbg_value(i8 %307, !517, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !706)
    #dbg_value(i32 1, !122, !DIExpression(), !708)
  %308 = getelementptr inbounds nuw i8, ptr %306, i32 1, !dbg !709
  %309 = load i8, ptr %308, align 1, !dbg !709, !tbaa !131
    #dbg_value(i8 %309, !517, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !706)
    #dbg_value(i32 2, !122, !DIExpression(), !708)
  %310 = getelementptr inbounds nuw i8, ptr %306, i32 2, !dbg !709
  %311 = load i8, ptr %310, align 1, !dbg !709, !tbaa !131
    #dbg_value(i8 %311, !517, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !706)
    #dbg_value(i32 3, !122, !DIExpression(), !708)
  %312 = getelementptr inbounds nuw i8, ptr %306, i32 3, !dbg !709
  %313 = load i8, ptr %312, align 1, !dbg !709, !tbaa !131
    #dbg_value(i8 %313, !517, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !706)
    #dbg_value(i32 4, !122, !DIExpression(), !708)
  %314 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !710
  %315 = load ptr, ptr %314, align 4, !dbg !710, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !546)
    #dbg_value(ptr %315, !115, !DIExpression(), !546)
    #dbg_value(i32 4, !116, !DIExpression(), !546)
    #dbg_value(ptr undef, !117, !DIExpression(), !546)
    #dbg_value(ptr %315, !119, !DIExpression(), !546)
    #dbg_value(i32 0, !122, !DIExpression(), !711)
  %316 = load i8, ptr %315, align 1, !dbg !712, !tbaa !131
    #dbg_value(i8 %316, !518, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !706)
    #dbg_value(i32 1, !122, !DIExpression(), !711)
  %317 = getelementptr inbounds nuw i8, ptr %315, i32 1, !dbg !712
  %318 = load i8, ptr %317, align 1, !dbg !712, !tbaa !131
    #dbg_value(i8 %318, !518, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !706)
    #dbg_value(i32 2, !122, !DIExpression(), !711)
  %319 = getelementptr inbounds nuw i8, ptr %315, i32 2, !dbg !712
  %320 = load i8, ptr %319, align 1, !dbg !712, !tbaa !131
    #dbg_value(i8 %320, !518, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !706)
    #dbg_value(i32 3, !122, !DIExpression(), !711)
  %321 = getelementptr inbounds nuw i8, ptr %315, i32 3, !dbg !712
  %322 = load i8, ptr %321, align 1, !dbg !712, !tbaa !131
    #dbg_value(i8 %322, !518, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !706)
    #dbg_value(i32 4, !122, !DIExpression(), !711)
  %323 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !713
  %324 = load ptr, ptr %323, align 4, !dbg !713, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !548)
    #dbg_value(ptr %324, !115, !DIExpression(), !548)
    #dbg_value(i32 4, !116, !DIExpression(), !548)
    #dbg_value(ptr undef, !117, !DIExpression(), !548)
    #dbg_value(ptr %324, !119, !DIExpression(), !548)
    #dbg_value(i32 0, !122, !DIExpression(), !714)
  %325 = load i8, ptr %324, align 1, !dbg !715, !tbaa !131
    #dbg_value(i8 %325, !519, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !706)
    #dbg_value(i32 1, !122, !DIExpression(), !714)
  %326 = getelementptr inbounds nuw i8, ptr %324, i32 1, !dbg !715
  %327 = load i8, ptr %326, align 1, !dbg !715, !tbaa !131
    #dbg_value(i8 %327, !519, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !706)
    #dbg_value(i32 2, !122, !DIExpression(), !714)
  %328 = getelementptr inbounds nuw i8, ptr %324, i32 2, !dbg !715
  %329 = load i8, ptr %328, align 1, !dbg !715, !tbaa !131
    #dbg_value(i8 %329, !519, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !706)
    #dbg_value(i32 3, !122, !DIExpression(), !714)
  %330 = getelementptr inbounds nuw i8, ptr %324, i32 3, !dbg !715
  %331 = load i8, ptr %330, align 1, !dbg !715, !tbaa !131
    #dbg_value(i8 %331, !519, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !706)
    #dbg_value(i32 4, !122, !DIExpression(), !714)
  %332 = zext i8 %304 to i32, !dbg !716
  %333 = shl nuw i32 %332, 24, !dbg !716
  %334 = zext i8 %302 to i32, !dbg !716
  %335 = shl nuw nsw i32 %334, 16, !dbg !716
  %336 = or disjoint i32 %333, %335, !dbg !716
  %337 = zext i8 %300 to i32, !dbg !716
  %338 = shl nuw nsw i32 %337, 8, !dbg !716
  %339 = or disjoint i32 %336, %338, !dbg !716
  %340 = zext i8 %298 to i32, !dbg !716
  %341 = or disjoint i32 %339, %340, !dbg !716
  %342 = zext i8 %313 to i32, !dbg !717
  %343 = shl nuw i32 %342, 24, !dbg !717
  %344 = zext i8 %311 to i32, !dbg !717
  %345 = shl nuw nsw i32 %344, 16, !dbg !717
  %346 = or disjoint i32 %343, %345, !dbg !717
  %347 = zext i8 %309 to i32, !dbg !717
  %348 = shl nuw nsw i32 %347, 8, !dbg !717
  %349 = or disjoint i32 %346, %348, !dbg !717
  %350 = zext i8 %307 to i32, !dbg !717
  %351 = or disjoint i32 %349, %350, !dbg !717
  %352 = zext i8 %322 to i32, !dbg !718
  %353 = shl nuw i32 %352, 24, !dbg !718
  %354 = zext i8 %320 to i32, !dbg !718
  %355 = shl nuw nsw i32 %354, 16, !dbg !718
  %356 = or disjoint i32 %353, %355, !dbg !718
  %357 = zext i8 %318 to i32, !dbg !718
  %358 = shl nuw nsw i32 %357, 8, !dbg !718
  %359 = or disjoint i32 %356, %358, !dbg !718
  %360 = zext i8 %316 to i32, !dbg !718
  %361 = or disjoint i32 %359, %360, !dbg !718
  %362 = zext i8 %331 to i32, !dbg !719
  %363 = shl nuw i32 %362, 24, !dbg !719
  %364 = zext i8 %329 to i32, !dbg !719
  %365 = shl nuw nsw i32 %364, 16, !dbg !719
  %366 = or disjoint i32 %363, %365, !dbg !719
  %367 = zext i8 %327 to i32, !dbg !719
  %368 = shl nuw nsw i32 %367, 8, !dbg !719
  %369 = or disjoint i32 %366, %368, !dbg !719
  %370 = zext i8 %325 to i32, !dbg !719
  %371 = or disjoint i32 %369, %370, !dbg !719
    #dbg_value(i32 %341, !331, !DIExpression(), !721)
    #dbg_value(i32 %351, !332, !DIExpression(), !721)
    #dbg_value(i32 %361, !333, !DIExpression(), !721)
    #dbg_value(i32 %371, !334, !DIExpression(), !721)
    #dbg_value(i32 %341, !335, !DIExpression(), !721)
  %372 = icmp ult i32 %341, %351, !dbg !719
  %373 = mul i32 %371, %351, !dbg !722
  %374 = add i32 %373, %341, !dbg !722
  %375 = sub i32 %341, %351, !dbg !722
  %376 = add i32 %375, %361, !dbg !722
  %377 = select i1 %372, i32 %374, i32 %376, !dbg !722
    #dbg_value(i32 %377, !336, !DIExpression(), !721)
    #dbg_value(i32 %377, !520, !DIExpression(), !706)
    #dbg_value(i32 1, !55, !DIExpression(), !723)
    #dbg_value(i32 4, !56, !DIExpression(), !723)
  %378 = load i32, ptr @ink_top, align 4
  %379 = icmp ugt i32 %378, -8
  br i1 %379, label %380, label %381, !dbg !725

380:                                              ; preds = %296
  tail call void @llvm.trap(), !dbg !726
  unreachable, !dbg !728

381:                                              ; preds = %296
  %382 = icmp eq i32 %378, 0, !dbg !729
  %383 = add nuw i32 %378, 7, !dbg !730
  %384 = select i1 %382, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %383, !dbg !731
  %385 = and i32 %384, -8, !dbg !732
    #dbg_value(i32 %385, !57, !DIExpression(), !723)
    #dbg_value(i32 4, !58, !DIExpression(), !723)
  %386 = or disjoint i32 %385, 4, !dbg !733
  store i32 %386, ptr @ink_top, align 4, !dbg !734, !tbaa !27
  %387 = add i32 %385, 65539, !dbg !735
  %388 = lshr i32 %387, 16, !dbg !736
    #dbg_value(i32 %388, !59, !DIExpression(), !723)
  %389 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !737
    #dbg_value(i32 %389, !60, !DIExpression(), !723)
  %390 = icmp ugt i32 %388, %389, !dbg !738
  br i1 %390, label %391, label %397, !dbg !739

391:                                              ; preds = %381
  %392 = sub nuw nsw i32 %388, %389, !dbg !740
  %393 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %392), !dbg !741
  %394 = icmp eq i32 %393, -1, !dbg !742
  br i1 %394, label %395, label %397, !dbg !739

395:                                              ; preds = %391
  tail call void @llvm.trap(), !dbg !743
  unreachable, !dbg !745

396:                                              ; preds = %5
  tail call void @llvm.trap(), !dbg !746
  unreachable, !dbg !748

397:                                              ; preds = %391, %381, %291, %281, %192, %182
  %398 = phi i32 [ %186, %182 ], [ %186, %192 ], [ %285, %281 ], [ %285, %291 ], [ %385, %381 ], [ %385, %391 ]
  %399 = phi i32 [ %178, %182 ], [ %178, %192 ], [ %277, %281 ], [ %277, %291 ], [ %377, %381 ], [ %377, %391 ]
  %400 = inttoptr i32 %398 to ptr, !dbg !749
  store i32 %399, ptr %400, align 8, !dbg !750, !tbaa !271
  br label %401, !dbg !750

401:                                              ; preds = %78, %397, %73
  %402 = phi ptr [ %74, %73 ], [ %400, %397 ], [ %74, %78 ]
  %403 = phi i32 [ %26, %73 ], [ 1, %397 ], [ %26, %78 ]
  store ptr %402, ptr %3, align 4, !dbg !750, !tbaa !450
  store i32 %403, ptr %4, align 4, !dbg !750, !tbaa !27
  ret void, !dbg !751
}

; Function Attrs: nounwind memory(read, inaccessiblemem: write) uwtable
define hidden i32 @ink_compute_scalar32(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readnone %2) local_unnamed_addr #10 !dbg !752 {
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
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !788)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !788)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !788)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !788)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !788)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !788)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !788)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !788)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !790)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !790)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !790)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !790)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !790)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !790)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !790)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !790)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !792)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !792)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !792)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !792)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !792)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !792)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !792)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !792)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !794)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !794)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !794)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !794)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !794)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !794)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !794)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !794)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !796)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !796)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !796)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !796)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !796)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !796)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !796)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !796)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !798)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !798)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !798)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !798)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !798)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !798)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !798)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !798)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !800)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !800)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !800)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !800)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !800)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !800)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !800)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !800)
    #dbg_value(i32 %0, !756, !DIExpression(), !802)
    #dbg_value(ptr %1, !757, !DIExpression(), !802)
    #dbg_value(ptr %2, !758, !DIExpression(), !802)
  switch i32 %0, label %247 [
    i32 1, label %4
    i32 2, label %84
    i32 3, label %165
  ], !dbg !803

4:                                                ; preds = %3
  %5 = load ptr, ptr %1, align 4, !dbg !804, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !778)
    #dbg_value(ptr %5, !115, !DIExpression(), !778)
    #dbg_value(i32 4, !116, !DIExpression(), !778)
    #dbg_value(ptr undef, !117, !DIExpression(), !778)
    #dbg_value(ptr %5, !119, !DIExpression(), !778)
    #dbg_value(i32 0, !122, !DIExpression(), !805)
    #dbg_value(i32 0, !122, !DIExpression(), !805)
  %6 = load i8, ptr %5, align 1, !dbg !806, !tbaa !131
    #dbg_value(i8 %6, !759, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !807)
    #dbg_value(i32 1, !122, !DIExpression(), !805)
  %7 = getelementptr inbounds nuw i8, ptr %5, i32 1, !dbg !806
  %8 = load i8, ptr %7, align 1, !dbg !806, !tbaa !131
    #dbg_value(i8 %8, !759, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !807)
    #dbg_value(i32 2, !122, !DIExpression(), !805)
  %9 = getelementptr inbounds nuw i8, ptr %5, i32 2, !dbg !806
  %10 = load i8, ptr %9, align 1, !dbg !806, !tbaa !131
    #dbg_value(i8 %10, !759, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !807)
    #dbg_value(i32 3, !122, !DIExpression(), !805)
  %11 = getelementptr inbounds nuw i8, ptr %5, i32 3, !dbg !806
  %12 = load i8, ptr %11, align 1, !dbg !806, !tbaa !131
    #dbg_value(i8 %12, !759, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !807)
    #dbg_value(i32 4, !122, !DIExpression(), !805)
  %13 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !808
  %14 = load ptr, ptr %13, align 4, !dbg !808, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !780)
    #dbg_value(ptr %14, !115, !DIExpression(), !780)
    #dbg_value(i32 4, !116, !DIExpression(), !780)
    #dbg_value(ptr undef, !117, !DIExpression(), !780)
    #dbg_value(ptr %14, !119, !DIExpression(), !780)
    #dbg_value(i32 0, !122, !DIExpression(), !809)
    #dbg_value(i32 0, !122, !DIExpression(), !809)
  %15 = load i8, ptr %14, align 1, !dbg !810, !tbaa !131
    #dbg_value(i8 %15, !762, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !807)
    #dbg_value(i32 1, !122, !DIExpression(), !809)
  %16 = getelementptr inbounds nuw i8, ptr %14, i32 1, !dbg !810
  %17 = load i8, ptr %16, align 1, !dbg !810, !tbaa !131
    #dbg_value(i8 %17, !762, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !807)
    #dbg_value(i32 2, !122, !DIExpression(), !809)
  %18 = getelementptr inbounds nuw i8, ptr %14, i32 2, !dbg !810
  %19 = load i8, ptr %18, align 1, !dbg !810, !tbaa !131
    #dbg_value(i8 %19, !762, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !807)
    #dbg_value(i32 3, !122, !DIExpression(), !809)
  %20 = getelementptr inbounds nuw i8, ptr %14, i32 3, !dbg !810
  %21 = load i8, ptr %20, align 1, !dbg !810, !tbaa !131
    #dbg_value(i8 %21, !762, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !807)
    #dbg_value(i32 4, !122, !DIExpression(), !809)
  %22 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !811
  %23 = load ptr, ptr %22, align 4, !dbg !811, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !782)
    #dbg_value(ptr %23, !115, !DIExpression(), !782)
    #dbg_value(i32 4, !116, !DIExpression(), !782)
    #dbg_value(ptr undef, !117, !DIExpression(), !782)
    #dbg_value(ptr %23, !119, !DIExpression(), !782)
    #dbg_value(i32 0, !122, !DIExpression(), !812)
    #dbg_value(i32 0, !122, !DIExpression(), !812)
  %24 = load i8, ptr %23, align 1, !dbg !813, !tbaa !131
    #dbg_value(i8 %24, !763, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !807)
    #dbg_value(i32 1, !122, !DIExpression(), !812)
  %25 = getelementptr inbounds nuw i8, ptr %23, i32 1, !dbg !813
  %26 = load i8, ptr %25, align 1, !dbg !813, !tbaa !131
    #dbg_value(i8 %26, !763, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !807)
    #dbg_value(i32 2, !122, !DIExpression(), !812)
  %27 = getelementptr inbounds nuw i8, ptr %23, i32 2, !dbg !813
  %28 = load i8, ptr %27, align 1, !dbg !813, !tbaa !131
    #dbg_value(i8 %28, !763, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !807)
    #dbg_value(i32 3, !122, !DIExpression(), !812)
  %29 = getelementptr inbounds nuw i8, ptr %23, i32 3, !dbg !813
  %30 = load i8, ptr %29, align 1, !dbg !813, !tbaa !131
    #dbg_value(i8 %30, !763, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !807)
    #dbg_value(i32 4, !122, !DIExpression(), !812)
  %31 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !814
  %32 = load ptr, ptr %31, align 4, !dbg !814, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !784)
    #dbg_value(ptr %32, !115, !DIExpression(), !784)
    #dbg_value(i32 4, !116, !DIExpression(), !784)
    #dbg_value(ptr undef, !117, !DIExpression(), !784)
    #dbg_value(ptr %32, !119, !DIExpression(), !784)
    #dbg_value(i32 0, !122, !DIExpression(), !815)
    #dbg_value(i32 0, !122, !DIExpression(), !815)
  %33 = load i8, ptr %32, align 1, !dbg !816, !tbaa !131
    #dbg_value(i8 %33, !764, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !807)
    #dbg_value(i32 1, !122, !DIExpression(), !815)
  %34 = getelementptr inbounds nuw i8, ptr %32, i32 1, !dbg !816
  %35 = load i8, ptr %34, align 1, !dbg !816, !tbaa !131
    #dbg_value(i8 %35, !764, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !807)
    #dbg_value(i32 2, !122, !DIExpression(), !815)
  %36 = getelementptr inbounds nuw i8, ptr %32, i32 2, !dbg !816
  %37 = load i8, ptr %36, align 1, !dbg !816, !tbaa !131
    #dbg_value(i8 %37, !764, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !807)
    #dbg_value(i32 3, !122, !DIExpression(), !815)
  %38 = getelementptr inbounds nuw i8, ptr %32, i32 3, !dbg !816
  %39 = load i8, ptr %38, align 1, !dbg !816, !tbaa !131
    #dbg_value(i8 %39, !764, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !807)
    #dbg_value(i32 4, !122, !DIExpression(), !815)
  %40 = zext i8 %12 to i32, !dbg !817
  %41 = shl nuw i32 %40, 24, !dbg !817
  %42 = zext i8 %10 to i32, !dbg !817
  %43 = shl nuw nsw i32 %42, 16, !dbg !817
  %44 = or disjoint i32 %41, %43, !dbg !817
  %45 = zext i8 %8 to i32, !dbg !817
  %46 = shl nuw nsw i32 %45, 8, !dbg !817
  %47 = or disjoint i32 %44, %46, !dbg !817
  %48 = zext i8 %6 to i32, !dbg !817
  %49 = or disjoint i32 %47, %48, !dbg !817
  %50 = zext i8 %21 to i32, !dbg !818
  %51 = shl nuw i32 %50, 24, !dbg !818
  %52 = zext i8 %19 to i32, !dbg !818
  %53 = shl nuw nsw i32 %52, 16, !dbg !818
  %54 = or disjoint i32 %51, %53, !dbg !818
  %55 = zext i8 %17 to i32, !dbg !818
  %56 = shl nuw nsw i32 %55, 8, !dbg !818
  %57 = or disjoint i32 %54, %56, !dbg !818
  %58 = zext i8 %15 to i32, !dbg !818
  %59 = or disjoint i32 %57, %58, !dbg !818
  %60 = zext i8 %30 to i32, !dbg !819
  %61 = shl nuw i32 %60, 24, !dbg !819
  %62 = zext i8 %28 to i32, !dbg !819
  %63 = shl nuw nsw i32 %62, 16, !dbg !819
  %64 = or disjoint i32 %61, %63, !dbg !819
  %65 = zext i8 %26 to i32, !dbg !819
  %66 = shl nuw nsw i32 %65, 8, !dbg !819
  %67 = or disjoint i32 %64, %66, !dbg !819
  %68 = zext i8 %24 to i32, !dbg !819
  %69 = or disjoint i32 %67, %68, !dbg !819
  %70 = zext i8 %39 to i32, !dbg !820
  %71 = shl nuw i32 %70, 24, !dbg !820
  %72 = zext i8 %37 to i32, !dbg !820
  %73 = shl nuw nsw i32 %72, 16, !dbg !820
  %74 = or disjoint i32 %71, %73, !dbg !820
  %75 = zext i8 %35 to i32, !dbg !820
  %76 = shl nuw nsw i32 %75, 8, !dbg !820
  %77 = or disjoint i32 %74, %76, !dbg !820
  %78 = zext i8 %33 to i32, !dbg !820
  %79 = or disjoint i32 %77, %78, !dbg !820
    #dbg_value(i32 %49, !291, !DIExpression(), !822)
    #dbg_value(i32 %59, !292, !DIExpression(), !822)
    #dbg_value(i32 %69, !293, !DIExpression(), !822)
    #dbg_value(i32 %79, !294, !DIExpression(), !822)
    #dbg_value(i32 %49, !295, !DIExpression(), !822)
  %80 = icmp ult i32 %49, %69, !dbg !820
  %81 = sub i32 0, %69, !dbg !823
  %82 = select i1 %80, i32 %79, i32 %81, !dbg !823
  %83 = add i32 %82, %59, !dbg !823
    #dbg_value(i32 %83, !296, !DIExpression(), !822)
    #dbg_value(i32 %83, !765, !DIExpression(), !807)
  br label %248

84:                                               ; preds = %3
  %85 = load ptr, ptr %1, align 4, !dbg !824, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !786)
    #dbg_value(ptr %85, !115, !DIExpression(), !786)
    #dbg_value(i32 4, !116, !DIExpression(), !786)
    #dbg_value(ptr undef, !117, !DIExpression(), !786)
    #dbg_value(ptr %85, !119, !DIExpression(), !786)
    #dbg_value(i32 0, !122, !DIExpression(), !825)
    #dbg_value(i32 0, !122, !DIExpression(), !825)
  %86 = load i8, ptr %85, align 1, !dbg !826, !tbaa !131
    #dbg_value(i8 %86, !766, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !827)
    #dbg_value(i32 1, !122, !DIExpression(), !825)
  %87 = getelementptr inbounds nuw i8, ptr %85, i32 1, !dbg !826
  %88 = load i8, ptr %87, align 1, !dbg !826, !tbaa !131
    #dbg_value(i8 %88, !766, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !827)
    #dbg_value(i32 2, !122, !DIExpression(), !825)
  %89 = getelementptr inbounds nuw i8, ptr %85, i32 2, !dbg !826
  %90 = load i8, ptr %89, align 1, !dbg !826, !tbaa !131
    #dbg_value(i8 %90, !766, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !827)
    #dbg_value(i32 3, !122, !DIExpression(), !825)
  %91 = getelementptr inbounds nuw i8, ptr %85, i32 3, !dbg !826
  %92 = load i8, ptr %91, align 1, !dbg !826, !tbaa !131
    #dbg_value(i8 %92, !766, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !827)
    #dbg_value(i32 4, !122, !DIExpression(), !825)
  %93 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !828
  %94 = load ptr, ptr %93, align 4, !dbg !828, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !788)
    #dbg_value(ptr %94, !115, !DIExpression(), !788)
    #dbg_value(i32 4, !116, !DIExpression(), !788)
    #dbg_value(ptr undef, !117, !DIExpression(), !788)
    #dbg_value(ptr %94, !119, !DIExpression(), !788)
    #dbg_value(i32 0, !122, !DIExpression(), !829)
    #dbg_value(i32 0, !122, !DIExpression(), !829)
  %95 = load i8, ptr %94, align 1, !dbg !830, !tbaa !131
    #dbg_value(i8 %95, !768, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !827)
    #dbg_value(i32 1, !122, !DIExpression(), !829)
  %96 = getelementptr inbounds nuw i8, ptr %94, i32 1, !dbg !830
  %97 = load i8, ptr %96, align 1, !dbg !830, !tbaa !131
    #dbg_value(i8 %97, !768, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !827)
    #dbg_value(i32 2, !122, !DIExpression(), !829)
  %98 = getelementptr inbounds nuw i8, ptr %94, i32 2, !dbg !830
  %99 = load i8, ptr %98, align 1, !dbg !830, !tbaa !131
    #dbg_value(i8 %99, !768, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !827)
    #dbg_value(i32 3, !122, !DIExpression(), !829)
  %100 = getelementptr inbounds nuw i8, ptr %94, i32 3, !dbg !830
  %101 = load i8, ptr %100, align 1, !dbg !830, !tbaa !131
    #dbg_value(i8 %101, !768, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !827)
    #dbg_value(i32 4, !122, !DIExpression(), !829)
  %102 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !831
  %103 = load ptr, ptr %102, align 4, !dbg !831, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !790)
    #dbg_value(ptr %103, !115, !DIExpression(), !790)
    #dbg_value(i32 4, !116, !DIExpression(), !790)
    #dbg_value(ptr undef, !117, !DIExpression(), !790)
    #dbg_value(ptr %103, !119, !DIExpression(), !790)
    #dbg_value(i32 0, !122, !DIExpression(), !832)
    #dbg_value(i32 0, !122, !DIExpression(), !832)
  %104 = load i8, ptr %103, align 1, !dbg !833, !tbaa !131
    #dbg_value(i8 %104, !769, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !827)
    #dbg_value(i32 1, !122, !DIExpression(), !832)
  %105 = getelementptr inbounds nuw i8, ptr %103, i32 1, !dbg !833
  %106 = load i8, ptr %105, align 1, !dbg !833, !tbaa !131
    #dbg_value(i8 %106, !769, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !827)
    #dbg_value(i32 2, !122, !DIExpression(), !832)
  %107 = getelementptr inbounds nuw i8, ptr %103, i32 2, !dbg !833
  %108 = load i8, ptr %107, align 1, !dbg !833, !tbaa !131
    #dbg_value(i8 %108, !769, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !827)
    #dbg_value(i32 3, !122, !DIExpression(), !832)
  %109 = getelementptr inbounds nuw i8, ptr %103, i32 3, !dbg !833
  %110 = load i8, ptr %109, align 1, !dbg !833, !tbaa !131
    #dbg_value(i8 %110, !769, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !827)
    #dbg_value(i32 4, !122, !DIExpression(), !832)
  %111 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !834
  %112 = load ptr, ptr %111, align 4, !dbg !834, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !792)
    #dbg_value(ptr %112, !115, !DIExpression(), !792)
    #dbg_value(i32 4, !116, !DIExpression(), !792)
    #dbg_value(ptr undef, !117, !DIExpression(), !792)
    #dbg_value(ptr %112, !119, !DIExpression(), !792)
    #dbg_value(i32 0, !122, !DIExpression(), !835)
    #dbg_value(i32 0, !122, !DIExpression(), !835)
  %113 = load i8, ptr %112, align 1, !dbg !836, !tbaa !131
    #dbg_value(i8 %113, !770, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !827)
    #dbg_value(i32 1, !122, !DIExpression(), !835)
  %114 = getelementptr inbounds nuw i8, ptr %112, i32 1, !dbg !836
  %115 = load i8, ptr %114, align 1, !dbg !836, !tbaa !131
    #dbg_value(i8 %115, !770, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !827)
    #dbg_value(i32 2, !122, !DIExpression(), !835)
  %116 = getelementptr inbounds nuw i8, ptr %112, i32 2, !dbg !836
  %117 = load i8, ptr %116, align 1, !dbg !836, !tbaa !131
    #dbg_value(i8 %117, !770, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !827)
    #dbg_value(i32 3, !122, !DIExpression(), !835)
  %118 = getelementptr inbounds nuw i8, ptr %112, i32 3, !dbg !836
  %119 = load i8, ptr %118, align 1, !dbg !836, !tbaa !131
    #dbg_value(i8 %119, !770, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !827)
    #dbg_value(i32 4, !122, !DIExpression(), !835)
  %120 = zext i8 %92 to i32, !dbg !837
  %121 = shl nuw i32 %120, 24, !dbg !837
  %122 = zext i8 %90 to i32, !dbg !837
  %123 = shl nuw nsw i32 %122, 16, !dbg !837
  %124 = or disjoint i32 %121, %123, !dbg !837
  %125 = zext i8 %88 to i32, !dbg !837
  %126 = shl nuw nsw i32 %125, 8, !dbg !837
  %127 = or disjoint i32 %124, %126, !dbg !837
  %128 = zext i8 %86 to i32, !dbg !837
  %129 = or disjoint i32 %127, %128, !dbg !837
  %130 = zext i8 %101 to i32, !dbg !838
  %131 = shl nuw i32 %130, 24, !dbg !838
  %132 = zext i8 %99 to i32, !dbg !838
  %133 = shl nuw nsw i32 %132, 16, !dbg !838
  %134 = or disjoint i32 %131, %133, !dbg !838
  %135 = zext i8 %97 to i32, !dbg !838
  %136 = shl nuw nsw i32 %135, 8, !dbg !838
  %137 = or disjoint i32 %134, %136, !dbg !838
  %138 = zext i8 %95 to i32, !dbg !838
  %139 = or disjoint i32 %137, %138, !dbg !838
  %140 = zext i8 %110 to i32, !dbg !839
  %141 = shl nuw i32 %140, 24, !dbg !839
  %142 = zext i8 %108 to i32, !dbg !839
  %143 = shl nuw nsw i32 %142, 16, !dbg !839
  %144 = or disjoint i32 %141, %143, !dbg !839
  %145 = zext i8 %106 to i32, !dbg !839
  %146 = shl nuw nsw i32 %145, 8, !dbg !839
  %147 = or disjoint i32 %144, %146, !dbg !839
  %148 = zext i8 %104 to i32, !dbg !839
  %149 = or disjoint i32 %147, %148, !dbg !839
  %150 = zext i8 %119 to i32, !dbg !840
  %151 = shl nuw i32 %150, 24, !dbg !840
  %152 = zext i8 %117 to i32, !dbg !840
  %153 = shl nuw nsw i32 %152, 16, !dbg !840
  %154 = or disjoint i32 %151, %153, !dbg !840
  %155 = zext i8 %115 to i32, !dbg !840
  %156 = shl nuw nsw i32 %155, 8, !dbg !840
  %157 = or disjoint i32 %154, %156, !dbg !840
  %158 = zext i8 %113 to i32, !dbg !840
  %159 = or disjoint i32 %157, %158, !dbg !840
    #dbg_value(i32 %129, !308, !DIExpression(), !842)
    #dbg_value(i32 %139, !309, !DIExpression(), !842)
    #dbg_value(i32 %149, !310, !DIExpression(), !842)
    #dbg_value(i32 %159, !311, !DIExpression(), !842)
    #dbg_value(i32 %129, !312, !DIExpression(), !842)
    #dbg_value(i32 3, !313, !DIExpression(), !842)
    #dbg_value(i32 poison, !314, !DIExpression(), !842)
  %160 = urem i32 %129, 3, !dbg !840
    #dbg_value(i32 %160, !314, !DIExpression(), !842)
    #dbg_value(i32 %160, !315, !DIExpression(), !842)
  %161 = icmp eq i32 %160, 0, !dbg !843
  %162 = mul i32 %159, %139, !dbg !844
  %163 = add i32 %149, %139, !dbg !844
  %164 = select i1 %161, i32 %162, i32 %163, !dbg !844
    #dbg_value(i32 %164, !316, !DIExpression(), !842)
    #dbg_value(i32 %164, !771, !DIExpression(), !827)
  br label %248

165:                                              ; preds = %3
  %166 = load ptr, ptr %1, align 4, !dbg !845, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !794)
    #dbg_value(ptr %166, !115, !DIExpression(), !794)
    #dbg_value(i32 4, !116, !DIExpression(), !794)
    #dbg_value(ptr undef, !117, !DIExpression(), !794)
    #dbg_value(ptr %166, !119, !DIExpression(), !794)
    #dbg_value(i32 0, !122, !DIExpression(), !846)
    #dbg_value(i32 0, !122, !DIExpression(), !846)
  %167 = load i8, ptr %166, align 1, !dbg !847, !tbaa !131
    #dbg_value(i8 %167, !772, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !848)
    #dbg_value(i32 1, !122, !DIExpression(), !846)
  %168 = getelementptr inbounds nuw i8, ptr %166, i32 1, !dbg !847
  %169 = load i8, ptr %168, align 1, !dbg !847, !tbaa !131
    #dbg_value(i8 %169, !772, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !848)
    #dbg_value(i32 2, !122, !DIExpression(), !846)
  %170 = getelementptr inbounds nuw i8, ptr %166, i32 2, !dbg !847
  %171 = load i8, ptr %170, align 1, !dbg !847, !tbaa !131
    #dbg_value(i8 %171, !772, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !848)
    #dbg_value(i32 3, !122, !DIExpression(), !846)
  %172 = getelementptr inbounds nuw i8, ptr %166, i32 3, !dbg !847
  %173 = load i8, ptr %172, align 1, !dbg !847, !tbaa !131
    #dbg_value(i8 %173, !772, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !848)
    #dbg_value(i32 4, !122, !DIExpression(), !846)
  %174 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !849
  %175 = load ptr, ptr %174, align 4, !dbg !849, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !796)
    #dbg_value(ptr %175, !115, !DIExpression(), !796)
    #dbg_value(i32 4, !116, !DIExpression(), !796)
    #dbg_value(ptr undef, !117, !DIExpression(), !796)
    #dbg_value(ptr %175, !119, !DIExpression(), !796)
    #dbg_value(i32 0, !122, !DIExpression(), !850)
    #dbg_value(i32 0, !122, !DIExpression(), !850)
  %176 = load i8, ptr %175, align 1, !dbg !851, !tbaa !131
    #dbg_value(i8 %176, !774, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !848)
    #dbg_value(i32 1, !122, !DIExpression(), !850)
  %177 = getelementptr inbounds nuw i8, ptr %175, i32 1, !dbg !851
  %178 = load i8, ptr %177, align 1, !dbg !851, !tbaa !131
    #dbg_value(i8 %178, !774, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !848)
    #dbg_value(i32 2, !122, !DIExpression(), !850)
  %179 = getelementptr inbounds nuw i8, ptr %175, i32 2, !dbg !851
  %180 = load i8, ptr %179, align 1, !dbg !851, !tbaa !131
    #dbg_value(i8 %180, !774, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !848)
    #dbg_value(i32 3, !122, !DIExpression(), !850)
  %181 = getelementptr inbounds nuw i8, ptr %175, i32 3, !dbg !851
  %182 = load i8, ptr %181, align 1, !dbg !851, !tbaa !131
    #dbg_value(i8 %182, !774, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !848)
    #dbg_value(i32 4, !122, !DIExpression(), !850)
  %183 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !852
  %184 = load ptr, ptr %183, align 4, !dbg !852, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !798)
    #dbg_value(ptr %184, !115, !DIExpression(), !798)
    #dbg_value(i32 4, !116, !DIExpression(), !798)
    #dbg_value(ptr undef, !117, !DIExpression(), !798)
    #dbg_value(ptr %184, !119, !DIExpression(), !798)
    #dbg_value(i32 0, !122, !DIExpression(), !853)
    #dbg_value(i32 0, !122, !DIExpression(), !853)
  %185 = load i8, ptr %184, align 1, !dbg !854, !tbaa !131
    #dbg_value(i8 %185, !775, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !848)
    #dbg_value(i32 1, !122, !DIExpression(), !853)
  %186 = getelementptr inbounds nuw i8, ptr %184, i32 1, !dbg !854
  %187 = load i8, ptr %186, align 1, !dbg !854, !tbaa !131
    #dbg_value(i8 %187, !775, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !848)
    #dbg_value(i32 2, !122, !DIExpression(), !853)
  %188 = getelementptr inbounds nuw i8, ptr %184, i32 2, !dbg !854
  %189 = load i8, ptr %188, align 1, !dbg !854, !tbaa !131
    #dbg_value(i8 %189, !775, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !848)
    #dbg_value(i32 3, !122, !DIExpression(), !853)
  %190 = getelementptr inbounds nuw i8, ptr %184, i32 3, !dbg !854
  %191 = load i8, ptr %190, align 1, !dbg !854, !tbaa !131
    #dbg_value(i8 %191, !775, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !848)
    #dbg_value(i32 4, !122, !DIExpression(), !853)
  %192 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !855
  %193 = load ptr, ptr %192, align 4, !dbg !855, !tbaa !450
    #dbg_value(ptr undef, !110, !DIExpression(), !800)
    #dbg_value(ptr %193, !115, !DIExpression(), !800)
    #dbg_value(i32 4, !116, !DIExpression(), !800)
    #dbg_value(ptr undef, !117, !DIExpression(), !800)
    #dbg_value(ptr %193, !119, !DIExpression(), !800)
    #dbg_value(i32 0, !122, !DIExpression(), !856)
    #dbg_value(i32 0, !122, !DIExpression(), !856)
  %194 = load i8, ptr %193, align 1, !dbg !857, !tbaa !131
    #dbg_value(i8 %194, !776, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !848)
    #dbg_value(i32 1, !122, !DIExpression(), !856)
  %195 = getelementptr inbounds nuw i8, ptr %193, i32 1, !dbg !857
  %196 = load i8, ptr %195, align 1, !dbg !857, !tbaa !131
    #dbg_value(i8 %196, !776, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !848)
    #dbg_value(i32 2, !122, !DIExpression(), !856)
  %197 = getelementptr inbounds nuw i8, ptr %193, i32 2, !dbg !857
  %198 = load i8, ptr %197, align 1, !dbg !857, !tbaa !131
    #dbg_value(i8 %198, !776, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !848)
    #dbg_value(i32 3, !122, !DIExpression(), !856)
  %199 = getelementptr inbounds nuw i8, ptr %193, i32 3, !dbg !857
  %200 = load i8, ptr %199, align 1, !dbg !857, !tbaa !131
    #dbg_value(i8 %200, !776, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !848)
    #dbg_value(i32 4, !122, !DIExpression(), !856)
  %201 = zext i8 %173 to i32, !dbg !858
  %202 = shl nuw i32 %201, 24, !dbg !858
  %203 = zext i8 %171 to i32, !dbg !858
  %204 = shl nuw nsw i32 %203, 16, !dbg !858
  %205 = or disjoint i32 %202, %204, !dbg !858
  %206 = zext i8 %169 to i32, !dbg !858
  %207 = shl nuw nsw i32 %206, 8, !dbg !858
  %208 = or disjoint i32 %205, %207, !dbg !858
  %209 = zext i8 %167 to i32, !dbg !858
  %210 = or disjoint i32 %208, %209, !dbg !858
  %211 = zext i8 %182 to i32, !dbg !859
  %212 = shl nuw i32 %211, 24, !dbg !859
  %213 = zext i8 %180 to i32, !dbg !859
  %214 = shl nuw nsw i32 %213, 16, !dbg !859
  %215 = or disjoint i32 %212, %214, !dbg !859
  %216 = zext i8 %178 to i32, !dbg !859
  %217 = shl nuw nsw i32 %216, 8, !dbg !859
  %218 = or disjoint i32 %215, %217, !dbg !859
  %219 = zext i8 %176 to i32, !dbg !859
  %220 = or disjoint i32 %218, %219, !dbg !859
  %221 = zext i8 %191 to i32, !dbg !860
  %222 = shl nuw i32 %221, 24, !dbg !860
  %223 = zext i8 %189 to i32, !dbg !860
  %224 = shl nuw nsw i32 %223, 16, !dbg !860
  %225 = or disjoint i32 %222, %224, !dbg !860
  %226 = zext i8 %187 to i32, !dbg !860
  %227 = shl nuw nsw i32 %226, 8, !dbg !860
  %228 = or disjoint i32 %225, %227, !dbg !860
  %229 = zext i8 %185 to i32, !dbg !860
  %230 = or disjoint i32 %228, %229, !dbg !860
  %231 = zext i8 %200 to i32, !dbg !861
  %232 = shl nuw i32 %231, 24, !dbg !861
  %233 = zext i8 %198 to i32, !dbg !861
  %234 = shl nuw nsw i32 %233, 16, !dbg !861
  %235 = or disjoint i32 %232, %234, !dbg !861
  %236 = zext i8 %196 to i32, !dbg !861
  %237 = shl nuw nsw i32 %236, 8, !dbg !861
  %238 = or disjoint i32 %235, %237, !dbg !861
  %239 = zext i8 %194 to i32, !dbg !861
  %240 = or disjoint i32 %238, %239, !dbg !861
    #dbg_value(i32 %210, !331, !DIExpression(), !863)
    #dbg_value(i32 %220, !332, !DIExpression(), !863)
    #dbg_value(i32 %230, !333, !DIExpression(), !863)
    #dbg_value(i32 %240, !334, !DIExpression(), !863)
    #dbg_value(i32 %210, !335, !DIExpression(), !863)
  %241 = icmp ult i32 %210, %220, !dbg !861
  %242 = mul i32 %240, %220, !dbg !864
  %243 = add i32 %242, %210, !dbg !864
  %244 = sub i32 %210, %220, !dbg !864
  %245 = add i32 %244, %230, !dbg !864
  %246 = select i1 %241, i32 %243, i32 %245, !dbg !864
    #dbg_value(i32 %246, !336, !DIExpression(), !863)
    #dbg_value(i32 %246, !777, !DIExpression(), !848)
  br label %248

247:                                              ; preds = %3
  tail call void @llvm.trap(), !dbg !865
  unreachable, !dbg !867

248:                                              ; preds = %165, %84, %4
  %249 = phi i32 [ %246, %165 ], [ %164, %84 ], [ %83, %4 ], !dbg !802
  ret i32 %249, !dbg !868
}

; Function Attrs: cold noreturn nounwind memory(inaccessiblemem: write) uwtable
define hidden noundef i64 @ink_compute_scalar64(i32 noundef %0, ptr nocapture noundef readnone %1, ptr nocapture noundef readnone %2) local_unnamed_addr #11 !dbg !869 {
    #dbg_value(i32 %0, !875, !DIExpression(), !878)
    #dbg_value(ptr %1, !876, !DIExpression(), !878)
    #dbg_value(ptr %2, !877, !DIExpression(), !878)
  tail call void @llvm.trap(), !dbg !879
  unreachable, !dbg !882
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
!172 = !{!173, !174, !175, !176, !177, !178, !179, !181, !184, !185, !186, !187, !188, !189, !192, !194, !195, !196, !197, !198, !199, !200, !201, !202, !203, !204, !207, !209, !210, !211, !212, !213, !214, !217, !218, !220}
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
!194 = !DILocalVariable(name: "t11", scope: !182, file: !15, line: 112, type: !10)
!195 = !DILocalVariable(name: "t12", scope: !182, file: !15, line: 114, type: !10)
!196 = !DILocalVariable(name: "t13", scope: !182, file: !15, line: 116, type: !10)
!197 = !DILocalVariable(name: "t14", scope: !182, file: !15, line: 118, type: !10)
!198 = !DILocalVariable(name: "t15", scope: !182, file: !15, line: 120, type: !10)
!199 = !DILocalVariable(name: "t16", scope: !182, file: !15, line: 123, type: !10)
!200 = !DILocalVariable(name: "t17", scope: !182, file: !15, line: 125, type: !10)
!201 = !DILocalVariable(name: "t18", scope: !182, file: !15, line: 127, type: !10)
!202 = !DILocalVariable(name: "t19", scope: !182, file: !15, line: 131, type: !10)
!203 = !DILocalVariable(name: "t20", scope: !182, file: !15, line: 133, type: !10)
!204 = !DILocalVariable(name: "t21", scope: !205, file: !15, line: 135, type: !10)
!205 = distinct !DILexicalBlock(scope: !206, file: !15, line: 134, column: 18)
!206 = distinct !DILexicalBlock(scope: !182, file: !15, line: 134, column: 5)
!207 = !DILocalVariable(name: "t22", scope: !208, file: !15, line: 139, type: !10)
!208 = distinct !DILexicalBlock(scope: !206, file: !15, line: 138, column: 8)
!209 = !DILocalVariable(name: "t23", scope: !182, file: !15, line: 143, type: !10)
!210 = !DILocalVariable(name: "t24", scope: !182, file: !15, line: 145, type: !10)
!211 = !DILocalVariable(name: "t25", scope: !182, file: !15, line: 147, type: !10)
!212 = !DILocalVariable(name: "t26", scope: !182, file: !15, line: 150, type: !10)
!213 = !DILocalVariable(name: "t27", scope: !182, file: !15, line: 152, type: !10)
!214 = !DILocalVariable(name: "t28", scope: !215, file: !15, line: 154, type: !10)
!215 = distinct !DILexicalBlock(scope: !216, file: !15, line: 153, column: 18)
!216 = distinct !DILexicalBlock(scope: !182, file: !15, line: 153, column: 5)
!217 = !DILocalVariable(name: "t29", scope: !215, file: !15, line: 156, type: !10)
!218 = !DILocalVariable(name: "t30", scope: !219, file: !15, line: 160, type: !10)
!219 = distinct !DILexicalBlock(scope: !216, file: !15, line: 159, column: 8)
!220 = !DILocalVariable(name: "t31", scope: !219, file: !15, line: 162, type: !10)
!221 = !DILocation(line: 82, column: 67, scope: !164)
!222 = !DILocation(line: 82, column: 83, scope: !164)
!223 = !DILocation(line: 0, scope: !164)
!224 = !DILocation(line: 87, column: 17, scope: !164)
!225 = !{!226, !226, i64 0}
!226 = !{!"p1 int", !227, i64 0}
!227 = !{!"any pointer", !29, i64 0}
!228 = !DILocation(line: 89, column: 14, scope: !164)
!229 = !DILocation(line: 0, scope: !51, inlinedAt: !230)
!230 = distinct !DILocation(line: 89, column: 18, scope: !164)
!231 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !230)
!232 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !230)
!233 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !234)
!234 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !230)
!235 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !234)
!236 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !230)
!237 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !230)
!238 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !230)
!239 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !230)
!240 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !230)
!241 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !230)
!242 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !230)
!243 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !230)
!244 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !245)
!245 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !230)
!246 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !245)
!247 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !230)
!248 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !230)
!249 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !230)
!250 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !230)
!251 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !230)
!252 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !230)
!253 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !230)
!254 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !230)
!255 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !230)
!256 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !230)
!257 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !258)
!258 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !230)
!259 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !258)
!260 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !230)
!261 = !DILocation(line: 89, column: 17, scope: !164)
!262 = !{!263, !226, i64 0}
!263 = !{!"", !226, i64 0, !28, i64 4}
!264 = !{!263, !28, i64 4}
!265 = !DILocation(line: 0, scope: !180)
!266 = !DILocation(line: 90, column: 19, scope: !183)
!267 = !DILocation(line: 90, column: 1, scope: !180)
!268 = !DILocation(line: 169, column: 1, scope: !164)
!269 = !DILocation(line: 0, scope: !182)
!270 = !DILocation(line: 93, column: 13, scope: !182)
!271 = !{!272, !272, i64 0}
!272 = !{!"int", !29, i64 0}
!273 = !DILocation(line: 103, column: 9, scope: !191)
!274 = !DILocation(line: 103, column: 5, scope: !191)
!275 = !DILocation(line: 130, column: 18, scope: !276)
!276 = distinct !DILexicalBlock(scope: !277, file: !15, line: 130, column: 8)
!277 = distinct !DILexicalBlock(scope: !182, file: !15, line: 128, column: 5)
!278 = !DILocation(line: 134, column: 10, scope: !206)
!279 = !DILocation(line: 134, column: 5, scope: !206)
!280 = !DILocation(line: 153, column: 10, scope: !216)
!281 = !DILocation(line: 153, column: 5, scope: !216)
!282 = !DILocation(line: 166, column: 1, scope: !182)
!283 = !DILocation(line: 166, column: 12, scope: !182)
!284 = !DILocation(line: 90, column: 29, scope: !183)
!285 = distinct !{!285, !267, !286, !137}
!286 = !DILocation(line: 167, column: 1, scope: !180)
!287 = distinct !DISubprogram(name: "lang_fn_left_word", scope: !15, file: !15, line: 170, type: !288, scopeLine: 170, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !290)
!288 = !DISubroutineType(types: !289)
!289 = !{!10, !10, !10, !10, !10}
!290 = !{!291, !292, !293, !294, !295, !296, !297, !300}
!291 = !DILocalVariable(name: "a0", arg: 1, scope: !287, file: !15, line: 170, type: !10)
!292 = !DILocalVariable(name: "a1", arg: 2, scope: !287, file: !15, line: 170, type: !10)
!293 = !DILocalVariable(name: "a2", arg: 3, scope: !287, file: !15, line: 170, type: !10)
!294 = !DILocalVariable(name: "a3", arg: 4, scope: !287, file: !15, line: 170, type: !10)
!295 = !DILocalVariable(name: "t0", scope: !287, file: !15, line: 175, type: !10)
!296 = !DILocalVariable(name: "t1", scope: !287, file: !15, line: 177, type: !10)
!297 = !DILocalVariable(name: "t2", scope: !298, file: !15, line: 179, type: !10)
!298 = distinct !DILexicalBlock(scope: !299, file: !15, line: 178, column: 16)
!299 = distinct !DILexicalBlock(scope: !287, file: !15, line: 178, column: 5)
!300 = !DILocalVariable(name: "t3", scope: !301, file: !15, line: 183, type: !10)
!301 = distinct !DILexicalBlock(scope: !299, file: !15, line: 182, column: 8)
!302 = !DILocation(line: 0, scope: !287)
!303 = !DILocation(line: 178, column: 9, scope: !299)
!304 = !DILocation(line: 178, column: 5, scope: !299)
!305 = !DILocation(line: 187, column: 1, scope: !287)
!306 = distinct !DISubprogram(name: "lang_fn_right_word", scope: !15, file: !15, line: 189, type: !288, scopeLine: 189, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !307)
!307 = !{!308, !309, !310, !311, !312, !313, !314, !315, !316, !317, !320}
!308 = !DILocalVariable(name: "a0", arg: 1, scope: !306, file: !15, line: 189, type: !10)
!309 = !DILocalVariable(name: "a1", arg: 2, scope: !306, file: !15, line: 189, type: !10)
!310 = !DILocalVariable(name: "a2", arg: 3, scope: !306, file: !15, line: 189, type: !10)
!311 = !DILocalVariable(name: "a3", arg: 4, scope: !306, file: !15, line: 189, type: !10)
!312 = !DILocalVariable(name: "t0", scope: !306, file: !15, line: 194, type: !10)
!313 = !DILocalVariable(name: "t1", scope: !306, file: !15, line: 196, type: !10)
!314 = !DILocalVariable(name: "t2", scope: !306, file: !15, line: 198, type: !10)
!315 = !DILocalVariable(name: "t3", scope: !306, file: !15, line: 202, type: !10)
!316 = !DILocalVariable(name: "t4", scope: !306, file: !15, line: 204, type: !10)
!317 = !DILocalVariable(name: "t5", scope: !318, file: !15, line: 206, type: !10)
!318 = distinct !DILexicalBlock(scope: !319, file: !15, line: 205, column: 17)
!319 = distinct !DILexicalBlock(scope: !306, file: !15, line: 205, column: 5)
!320 = !DILocalVariable(name: "t6", scope: !321, file: !15, line: 210, type: !10)
!321 = distinct !DILexicalBlock(scope: !319, file: !15, line: 209, column: 8)
!322 = !DILocation(line: 0, scope: !306)
!323 = !DILocation(line: 201, column: 16, scope: !324)
!324 = distinct !DILexicalBlock(scope: !325, file: !15, line: 201, column: 8)
!325 = distinct !DILexicalBlock(scope: !306, file: !15, line: 199, column: 5)
!326 = !DILocation(line: 205, column: 9, scope: !319)
!327 = !DILocation(line: 205, column: 5, scope: !319)
!328 = !DILocation(line: 214, column: 1, scope: !306)
!329 = distinct !DISubprogram(name: "lang_fn_pair_word", scope: !15, file: !15, line: 216, type: !288, scopeLine: 216, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !330)
!330 = !{!331, !332, !333, !334, !335, !336, !337, !340, !341, !343}
!331 = !DILocalVariable(name: "a0", arg: 1, scope: !329, file: !15, line: 216, type: !10)
!332 = !DILocalVariable(name: "a1", arg: 2, scope: !329, file: !15, line: 216, type: !10)
!333 = !DILocalVariable(name: "a2", arg: 3, scope: !329, file: !15, line: 216, type: !10)
!334 = !DILocalVariable(name: "a3", arg: 4, scope: !329, file: !15, line: 216, type: !10)
!335 = !DILocalVariable(name: "t0", scope: !329, file: !15, line: 221, type: !10)
!336 = !DILocalVariable(name: "t1", scope: !329, file: !15, line: 223, type: !10)
!337 = !DILocalVariable(name: "t2", scope: !338, file: !15, line: 225, type: !10)
!338 = distinct !DILexicalBlock(scope: !339, file: !15, line: 224, column: 16)
!339 = distinct !DILexicalBlock(scope: !329, file: !15, line: 224, column: 5)
!340 = !DILocalVariable(name: "t3", scope: !338, file: !15, line: 227, type: !10)
!341 = !DILocalVariable(name: "t4", scope: !342, file: !15, line: 231, type: !10)
!342 = distinct !DILexicalBlock(scope: !339, file: !15, line: 230, column: 8)
!343 = !DILocalVariable(name: "t5", scope: !342, file: !15, line: 233, type: !10)
!344 = !DILocation(line: 0, scope: !329)
!345 = !DILocation(line: 224, column: 9, scope: !339)
!346 = !DILocation(line: 224, column: 5, scope: !339)
!347 = !DILocation(line: 237, column: 1, scope: !329)
!348 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_u32_into", scope: !15, file: !15, line: 239, type: !349, scopeLine: 239, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !351)
!349 = !DISubroutineType(types: !350)
!350 = !{!5, !167, !167, !10, !10, !13}
!351 = !{!352, !353, !354, !355, !356, !357, !358, !359, !361, !364, !365, !366, !367, !368, !369, !372, !374, !375, !376, !377, !378, !379, !380, !381, !382, !383, !384, !387, !389, !390, !391, !392, !393, !394, !397, !398, !400}
!352 = !DILocalVariable(name: "a0", arg: 1, scope: !348, file: !15, line: 239, type: !167)
!353 = !DILocalVariable(name: "a1", arg: 2, scope: !348, file: !15, line: 239, type: !167)
!354 = !DILocalVariable(name: "a2", arg: 3, scope: !348, file: !15, line: 239, type: !10)
!355 = !DILocalVariable(name: "a3", arg: 4, scope: !348, file: !15, line: 239, type: !10)
!356 = !DILocalVariable(name: "destination", arg: 5, scope: !348, file: !15, line: 239, type: !13)
!357 = !DILocalVariable(name: "t0", scope: !348, file: !15, line: 244, type: !167)
!358 = !DILocalVariable(name: "t1", scope: !348, file: !15, line: 246, type: !167)
!359 = !DILocalVariable(name: "t2", scope: !360, file: !15, line: 247, type: !5)
!360 = distinct !DILexicalBlock(scope: !348, file: !15, line: 247, column: 1)
!361 = !DILocalVariable(name: "t3", scope: !362, file: !15, line: 248, type: !10)
!362 = distinct !DILexicalBlock(scope: !363, file: !15, line: 247, column: 32)
!363 = distinct !DILexicalBlock(scope: !360, file: !15, line: 247, column: 1)
!364 = !DILocalVariable(name: "t4", scope: !362, file: !15, line: 250, type: !10)
!365 = !DILocalVariable(name: "t5", scope: !362, file: !15, line: 252, type: !10)
!366 = !DILocalVariable(name: "t6", scope: !362, file: !15, line: 254, type: !10)
!367 = !DILocalVariable(name: "t7", scope: !362, file: !15, line: 257, type: !10)
!368 = !DILocalVariable(name: "t8", scope: !362, file: !15, line: 259, type: !10)
!369 = !DILocalVariable(name: "t9", scope: !370, file: !15, line: 261, type: !10)
!370 = distinct !DILexicalBlock(scope: !371, file: !15, line: 260, column: 16)
!371 = distinct !DILexicalBlock(scope: !362, file: !15, line: 260, column: 5)
!372 = !DILocalVariable(name: "t10", scope: !373, file: !15, line: 265, type: !10)
!373 = distinct !DILexicalBlock(scope: !371, file: !15, line: 264, column: 8)
!374 = !DILocalVariable(name: "t11", scope: !362, file: !15, line: 269, type: !10)
!375 = !DILocalVariable(name: "t12", scope: !362, file: !15, line: 271, type: !10)
!376 = !DILocalVariable(name: "t13", scope: !362, file: !15, line: 273, type: !10)
!377 = !DILocalVariable(name: "t14", scope: !362, file: !15, line: 275, type: !10)
!378 = !DILocalVariable(name: "t15", scope: !362, file: !15, line: 277, type: !10)
!379 = !DILocalVariable(name: "t16", scope: !362, file: !15, line: 280, type: !10)
!380 = !DILocalVariable(name: "t17", scope: !362, file: !15, line: 282, type: !10)
!381 = !DILocalVariable(name: "t18", scope: !362, file: !15, line: 284, type: !10)
!382 = !DILocalVariable(name: "t19", scope: !362, file: !15, line: 288, type: !10)
!383 = !DILocalVariable(name: "t20", scope: !362, file: !15, line: 290, type: !10)
!384 = !DILocalVariable(name: "t21", scope: !385, file: !15, line: 292, type: !10)
!385 = distinct !DILexicalBlock(scope: !386, file: !15, line: 291, column: 18)
!386 = distinct !DILexicalBlock(scope: !362, file: !15, line: 291, column: 5)
!387 = !DILocalVariable(name: "t22", scope: !388, file: !15, line: 296, type: !10)
!388 = distinct !DILexicalBlock(scope: !386, file: !15, line: 295, column: 8)
!389 = !DILocalVariable(name: "t23", scope: !362, file: !15, line: 300, type: !10)
!390 = !DILocalVariable(name: "t24", scope: !362, file: !15, line: 302, type: !10)
!391 = !DILocalVariable(name: "t25", scope: !362, file: !15, line: 304, type: !10)
!392 = !DILocalVariable(name: "t26", scope: !362, file: !15, line: 307, type: !10)
!393 = !DILocalVariable(name: "t27", scope: !362, file: !15, line: 309, type: !10)
!394 = !DILocalVariable(name: "t28", scope: !395, file: !15, line: 311, type: !10)
!395 = distinct !DILexicalBlock(scope: !396, file: !15, line: 310, column: 18)
!396 = distinct !DILexicalBlock(scope: !362, file: !15, line: 310, column: 5)
!397 = !DILocalVariable(name: "t29", scope: !395, file: !15, line: 313, type: !10)
!398 = !DILocalVariable(name: "t30", scope: !399, file: !15, line: 317, type: !10)
!399 = distinct !DILexicalBlock(scope: !396, file: !15, line: 316, column: 8)
!400 = !DILocalVariable(name: "t31", scope: !399, file: !15, line: 319, type: !10)
!401 = !DILocation(line: 239, column: 66, scope: !348)
!402 = !DILocation(line: 239, column: 82, scope: !348)
!403 = !DILocation(line: 0, scope: !348)
!404 = !DILocation(line: 244, column: 17, scope: !348)
!405 = !DILocation(line: 0, scope: !360)
!406 = !DILocation(line: 247, column: 19, scope: !363)
!407 = !DILocation(line: 247, column: 1, scope: !360)
!408 = !DILocation(line: 325, column: 1, scope: !348)
!409 = !DILocation(line: 0, scope: !362)
!410 = !DILocation(line: 250, column: 13, scope: !362)
!411 = !DILocation(line: 260, column: 9, scope: !371)
!412 = !DILocation(line: 260, column: 5, scope: !371)
!413 = !DILocation(line: 287, column: 18, scope: !414)
!414 = distinct !DILexicalBlock(scope: !415, file: !15, line: 287, column: 8)
!415 = distinct !DILexicalBlock(scope: !362, file: !15, line: 285, column: 5)
!416 = !DILocation(line: 291, column: 10, scope: !386)
!417 = !DILocation(line: 291, column: 5, scope: !386)
!418 = !DILocation(line: 310, column: 10, scope: !396)
!419 = !DILocation(line: 310, column: 5, scope: !396)
!420 = !DILocation(line: 323, column: 1, scope: !362)
!421 = !DILocation(line: 323, column: 12, scope: !362)
!422 = !DILocation(line: 247, column: 29, scope: !363)
!423 = distinct !{!423, !407, !424, !137}
!424 = !DILocation(line: 324, column: 1, scope: !360)
!425 = distinct !DISubprogram(name: "ink_compute_into", scope: !15, file: !15, line: 327, type: !426, scopeLine: 327, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !432)
!426 = !DISubroutineType(types: !427)
!427 = !{!5, !10, !428, !430, !8}
!428 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !429, size: 32)
!429 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !103)
!430 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !431, size: 32)
!431 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !5)
!432 = !{!433, !434, !435, !436, !437, !440, !441, !442}
!433 = !DILocalVariable(name: "function", arg: 1, scope: !425, file: !15, line: 327, type: !10)
!434 = !DILocalVariable(name: "data", arg: 2, scope: !425, file: !15, line: 327, type: !428)
!435 = !DILocalVariable(name: "lengths", arg: 3, scope: !425, file: !15, line: 327, type: !430)
!436 = !DILocalVariable(name: "destination", arg: 4, scope: !425, file: !15, line: 327, type: !8)
!437 = !DILocalVariable(name: "a0", scope: !438, file: !15, line: 328, type: !13)
!438 = distinct !DILexicalBlock(scope: !439, file: !15, line: 328, column: 8)
!439 = distinct !DILexicalBlock(scope: !425, file: !15, line: 327, column: 167)
!440 = !DILocalVariable(name: "a1", scope: !438, file: !15, line: 328, type: !13)
!441 = !DILocalVariable(name: "a2", scope: !438, file: !15, line: 328, type: !10)
!442 = !DILocalVariable(name: "a3", scope: !438, file: !15, line: 328, type: !10)
!443 = !DILocation(line: 0, scope: !111, inlinedAt: !444)
!444 = distinct !DILocation(line: 328, column: 87, scope: !438)
!445 = !DILocation(line: 0, scope: !111, inlinedAt: !446)
!446 = distinct !DILocation(line: 328, column: 132, scope: !438)
!447 = !DILocation(line: 0, scope: !425)
!448 = !DILocation(line: 327, column: 151, scope: !425)
!449 = !DILocation(line: 328, column: 34, scope: !438)
!450 = !{!227, !227, i64 0}
!451 = !DILocation(line: 0, scope: !438)
!452 = !DILocation(line: 328, column: 100, scope: !438)
!453 = !DILocation(line: 0, scope: !123, inlinedAt: !444)
!454 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !444)
!455 = !DILocation(line: 328, column: 145, scope: !438)
!456 = !DILocation(line: 0, scope: !123, inlinedAt: !446)
!457 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !446)
!458 = !DILocation(line: 328, column: 235, scope: !438)
!459 = !DILocation(line: 328, column: 280, scope: !438)
!460 = !DILocation(line: 247, column: 19, scope: !363, inlinedAt: !461)
!461 = distinct !DILocation(line: 328, column: 172, scope: !438)
!462 = !DILocation(line: 0, scope: !348, inlinedAt: !461)
!463 = !DILocation(line: 0, scope: !360, inlinedAt: !461)
!464 = !DILocation(line: 247, column: 1, scope: !360, inlinedAt: !461)
!465 = !DILocation(line: 0, scope: !362, inlinedAt: !461)
!466 = !DILocation(line: 250, column: 13, scope: !362, inlinedAt: !461)
!467 = !DILocation(line: 260, column: 9, scope: !371, inlinedAt: !461)
!468 = !DILocation(line: 260, column: 5, scope: !371, inlinedAt: !461)
!469 = !DILocation(line: 287, column: 18, scope: !414, inlinedAt: !461)
!470 = !DILocation(line: 291, column: 10, scope: !386, inlinedAt: !461)
!471 = !DILocation(line: 291, column: 5, scope: !386, inlinedAt: !461)
!472 = !DILocation(line: 310, column: 10, scope: !396, inlinedAt: !461)
!473 = !DILocation(line: 310, column: 5, scope: !396, inlinedAt: !461)
!474 = !DILocation(line: 323, column: 1, scope: !362, inlinedAt: !461)
!475 = !DILocation(line: 323, column: 12, scope: !362, inlinedAt: !461)
!476 = !DILocation(line: 247, column: 29, scope: !363, inlinedAt: !461)
!477 = distinct !{!477, !464, !478, !137}
!478 = !DILocation(line: 324, column: 1, scope: !360, inlinedAt: !461)
!479 = !DILocation(line: 329, column: 30, scope: !425)
!480 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !481)
!481 = distinct !DILocation(line: 329, column: 9, scope: !439)
!482 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !481)
!483 = distinct !DISubprogram(name: "ink_compute_call", scope: !15, file: !15, line: 330, type: !484, scopeLine: 330, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !488)
!484 = !DISubroutineType(types: !485)
!485 = !{null, !10, !428, !430, !486, !487}
!486 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !8, size: 32)
!487 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !5, size: 32)
!488 = !{!489, !490, !491, !492, !493, !494, !497, !498, !499, !500, !501, !503, !504, !505, !506, !507, !508, !510, !511, !512, !513, !514, !515, !517, !518, !519, !520, !521}
!489 = !DILocalVariable(name: "function", arg: 1, scope: !483, file: !15, line: 330, type: !10)
!490 = !DILocalVariable(name: "data", arg: 2, scope: !483, file: !15, line: 330, type: !428)
!491 = !DILocalVariable(name: "lengths", arg: 3, scope: !483, file: !15, line: 330, type: !430)
!492 = !DILocalVariable(name: "output", arg: 4, scope: !483, file: !15, line: 330, type: !486)
!493 = !DILocalVariable(name: "count", arg: 5, scope: !483, file: !15, line: 330, type: !487)
!494 = !DILocalVariable(name: "a0", scope: !495, file: !15, line: 331, type: !13)
!495 = distinct !DILexicalBlock(scope: !496, file: !15, line: 331, column: 8)
!496 = distinct !DILexicalBlock(scope: !483, file: !15, line: 330, column: 158)
!497 = !DILocalVariable(name: "a1", scope: !495, file: !15, line: 331, type: !13)
!498 = !DILocalVariable(name: "a2", scope: !495, file: !15, line: 331, type: !10)
!499 = !DILocalVariable(name: "a3", scope: !495, file: !15, line: 331, type: !10)
!500 = !DILocalVariable(name: "result", scope: !495, file: !15, line: 331, type: !167)
!501 = !DILocalVariable(name: "a0", scope: !502, file: !15, line: 332, type: !10)
!502 = distinct !DILexicalBlock(scope: !496, file: !15, line: 332, column: 8)
!503 = !DILocalVariable(name: "a1", scope: !502, file: !15, line: 332, type: !10)
!504 = !DILocalVariable(name: "a2", scope: !502, file: !15, line: 332, type: !10)
!505 = !DILocalVariable(name: "a3", scope: !502, file: !15, line: 332, type: !10)
!506 = !DILocalVariable(name: "result", scope: !502, file: !15, line: 332, type: !10)
!507 = !DILocalVariable(name: "copy", scope: !502, file: !15, line: 332, type: !13)
!508 = !DILocalVariable(name: "a0", scope: !509, file: !15, line: 333, type: !10)
!509 = distinct !DILexicalBlock(scope: !496, file: !15, line: 333, column: 8)
!510 = !DILocalVariable(name: "a1", scope: !509, file: !15, line: 333, type: !10)
!511 = !DILocalVariable(name: "a2", scope: !509, file: !15, line: 333, type: !10)
!512 = !DILocalVariable(name: "a3", scope: !509, file: !15, line: 333, type: !10)
!513 = !DILocalVariable(name: "result", scope: !509, file: !15, line: 333, type: !10)
!514 = !DILocalVariable(name: "copy", scope: !509, file: !15, line: 333, type: !13)
!515 = !DILocalVariable(name: "a0", scope: !516, file: !15, line: 334, type: !10)
!516 = distinct !DILexicalBlock(scope: !496, file: !15, line: 334, column: 8)
!517 = !DILocalVariable(name: "a1", scope: !516, file: !15, line: 334, type: !10)
!518 = !DILocalVariable(name: "a2", scope: !516, file: !15, line: 334, type: !10)
!519 = !DILocalVariable(name: "a3", scope: !516, file: !15, line: 334, type: !10)
!520 = !DILocalVariable(name: "result", scope: !516, file: !15, line: 334, type: !10)
!521 = !DILocalVariable(name: "copy", scope: !516, file: !15, line: 334, type: !13)
!522 = !DILocation(line: 0, scope: !111, inlinedAt: !523)
!523 = distinct !DILocation(line: 331, column: 87, scope: !495)
!524 = !DILocation(line: 0, scope: !111, inlinedAt: !525)
!525 = distinct !DILocation(line: 331, column: 132, scope: !495)
!526 = !DILocation(line: 0, scope: !111, inlinedAt: !527)
!527 = distinct !DILocation(line: 332, column: 21, scope: !502)
!528 = !DILocation(line: 0, scope: !111, inlinedAt: !529)
!529 = distinct !DILocation(line: 332, column: 66, scope: !502)
!530 = !DILocation(line: 0, scope: !111, inlinedAt: !531)
!531 = distinct !DILocation(line: 332, column: 111, scope: !502)
!532 = !DILocation(line: 0, scope: !111, inlinedAt: !533)
!533 = distinct !DILocation(line: 332, column: 156, scope: !502)
!534 = !DILocation(line: 0, scope: !111, inlinedAt: !535)
!535 = distinct !DILocation(line: 333, column: 21, scope: !509)
!536 = !DILocation(line: 0, scope: !111, inlinedAt: !537)
!537 = distinct !DILocation(line: 333, column: 66, scope: !509)
!538 = !DILocation(line: 0, scope: !111, inlinedAt: !539)
!539 = distinct !DILocation(line: 333, column: 111, scope: !509)
!540 = !DILocation(line: 0, scope: !111, inlinedAt: !541)
!541 = distinct !DILocation(line: 333, column: 156, scope: !509)
!542 = !DILocation(line: 0, scope: !111, inlinedAt: !543)
!543 = distinct !DILocation(line: 334, column: 21, scope: !516)
!544 = !DILocation(line: 0, scope: !111, inlinedAt: !545)
!545 = distinct !DILocation(line: 334, column: 66, scope: !516)
!546 = !DILocation(line: 0, scope: !111, inlinedAt: !547)
!547 = distinct !DILocation(line: 334, column: 111, scope: !516)
!548 = !DILocation(line: 0, scope: !111, inlinedAt: !549)
!549 = distinct !DILocation(line: 334, column: 156, scope: !516)
!550 = !DILocation(line: 0, scope: !483)
!551 = !DILocation(line: 330, column: 142, scope: !483)
!552 = !DILocation(line: 331, column: 34, scope: !495)
!553 = !DILocation(line: 0, scope: !495)
!554 = !DILocation(line: 331, column: 100, scope: !495)
!555 = !DILocation(line: 0, scope: !123, inlinedAt: !523)
!556 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !523)
!557 = !DILocation(line: 331, column: 145, scope: !495)
!558 = !DILocation(line: 0, scope: !123, inlinedAt: !525)
!559 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !525)
!560 = !DILocation(line: 331, column: 243, scope: !495)
!561 = !DILocation(line: 331, column: 288, scope: !495)
!562 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !563)
!563 = distinct !DILocation(line: 89, column: 18, scope: !164, inlinedAt: !564)
!564 = distinct !DILocation(line: 331, column: 185, scope: !495)
!565 = !DILocation(line: 0, scope: !164, inlinedAt: !564)
!566 = !DILocation(line: 0, scope: !51, inlinedAt: !563)
!567 = !{!568}
!568 = distinct !{!568, !569, !"lang_fn_pipeline38_right_padded_zip_u32: argument 0"}
!569 = distinct !{!569, !"lang_fn_pipeline38_right_padded_zip_u32"}
!570 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !563)
!571 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !572)
!572 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !563)
!573 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !572)
!574 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !563)
!575 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !563)
!576 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !563)
!577 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !563)
!578 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !563)
!579 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !563)
!580 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !563)
!581 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !563)
!582 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !583)
!583 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !563)
!584 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !583)
!585 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !563)
!586 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !563)
!587 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !563)
!588 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !563)
!589 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !563)
!590 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !563)
!591 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !563)
!592 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !563)
!593 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !563)
!594 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !563)
!595 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !596)
!596 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !563)
!597 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !596)
!598 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !563)
!599 = !DILocation(line: 0, scope: !180, inlinedAt: !564)
!600 = !DILocation(line: 90, column: 19, scope: !183, inlinedAt: !564)
!601 = !DILocation(line: 90, column: 1, scope: !180, inlinedAt: !564)
!602 = !DILocation(line: 0, scope: !182, inlinedAt: !564)
!603 = !DILocation(line: 93, column: 13, scope: !182, inlinedAt: !564)
!604 = !DILocation(line: 103, column: 9, scope: !191, inlinedAt: !564)
!605 = !DILocation(line: 103, column: 5, scope: !191, inlinedAt: !564)
!606 = !DILocation(line: 130, column: 18, scope: !276, inlinedAt: !564)
!607 = !DILocation(line: 134, column: 10, scope: !206, inlinedAt: !564)
!608 = !DILocation(line: 134, column: 5, scope: !206, inlinedAt: !564)
!609 = !DILocation(line: 153, column: 10, scope: !216, inlinedAt: !564)
!610 = !DILocation(line: 153, column: 5, scope: !216, inlinedAt: !564)
!611 = !DILocation(line: 166, column: 1, scope: !182, inlinedAt: !564)
!612 = !DILocation(line: 166, column: 12, scope: !182, inlinedAt: !564)
!613 = !DILocation(line: 90, column: 29, scope: !183, inlinedAt: !564)
!614 = distinct !{!614, !601, !615, !137}
!615 = !DILocation(line: 167, column: 1, scope: !180, inlinedAt: !564)
!616 = !DILocation(line: 332, column: 34, scope: !502)
!617 = !DILocation(line: 0, scope: !123, inlinedAt: !527)
!618 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !527)
!619 = !DILocation(line: 0, scope: !502)
!620 = !DILocation(line: 332, column: 79, scope: !502)
!621 = !DILocation(line: 0, scope: !123, inlinedAt: !529)
!622 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !529)
!623 = !DILocation(line: 332, column: 124, scope: !502)
!624 = !DILocation(line: 0, scope: !123, inlinedAt: !531)
!625 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !531)
!626 = !DILocation(line: 332, column: 169, scope: !502)
!627 = !DILocation(line: 0, scope: !123, inlinedAt: !533)
!628 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !533)
!629 = !DILocation(line: 332, column: 226, scope: !502)
!630 = !DILocation(line: 332, column: 229, scope: !502)
!631 = !DILocation(line: 332, column: 232, scope: !502)
!632 = !DILocation(line: 178, column: 9, scope: !299, inlinedAt: !633)
!633 = distinct !DILocation(line: 332, column: 205, scope: !502)
!634 = !DILocation(line: 0, scope: !287, inlinedAt: !633)
!635 = !DILocation(line: 178, column: 5, scope: !299, inlinedAt: !633)
!636 = !DILocation(line: 0, scope: !51, inlinedAt: !637)
!637 = distinct !DILocation(line: 332, column: 251, scope: !502)
!638 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !637)
!639 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !640)
!640 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !637)
!641 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !640)
!642 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !637)
!643 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !637)
!644 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !637)
!645 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !637)
!646 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !637)
!647 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !637)
!648 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !637)
!649 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !637)
!650 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !637)
!651 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !637)
!652 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !637)
!653 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !637)
!654 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !637)
!655 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !637)
!656 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !657)
!657 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !637)
!658 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !657)
!659 = !DILocation(line: 333, column: 34, scope: !509)
!660 = !DILocation(line: 0, scope: !123, inlinedAt: !535)
!661 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !535)
!662 = !DILocation(line: 0, scope: !509)
!663 = !DILocation(line: 333, column: 79, scope: !509)
!664 = !DILocation(line: 0, scope: !123, inlinedAt: !537)
!665 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !537)
!666 = !DILocation(line: 333, column: 124, scope: !509)
!667 = !DILocation(line: 0, scope: !123, inlinedAt: !539)
!668 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !539)
!669 = !DILocation(line: 333, column: 169, scope: !509)
!670 = !DILocation(line: 0, scope: !123, inlinedAt: !541)
!671 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !541)
!672 = !DILocation(line: 333, column: 227, scope: !509)
!673 = !DILocation(line: 333, column: 230, scope: !509)
!674 = !DILocation(line: 333, column: 233, scope: !509)
!675 = !DILocation(line: 201, column: 16, scope: !324, inlinedAt: !676)
!676 = distinct !DILocation(line: 333, column: 205, scope: !509)
!677 = !DILocation(line: 0, scope: !306, inlinedAt: !676)
!678 = !DILocation(line: 205, column: 9, scope: !319, inlinedAt: !676)
!679 = !DILocation(line: 205, column: 5, scope: !319, inlinedAt: !676)
!680 = !DILocation(line: 0, scope: !51, inlinedAt: !681)
!681 = distinct !DILocation(line: 333, column: 252, scope: !509)
!682 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !681)
!683 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !684)
!684 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !681)
!685 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !684)
!686 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !681)
!687 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !681)
!688 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !681)
!689 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !681)
!690 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !681)
!691 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !681)
!692 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !681)
!693 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !681)
!694 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !681)
!695 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !681)
!696 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !681)
!697 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !681)
!698 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !681)
!699 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !681)
!700 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !701)
!701 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !681)
!702 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !701)
!703 = !DILocation(line: 334, column: 34, scope: !516)
!704 = !DILocation(line: 0, scope: !123, inlinedAt: !543)
!705 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !543)
!706 = !DILocation(line: 0, scope: !516)
!707 = !DILocation(line: 334, column: 79, scope: !516)
!708 = !DILocation(line: 0, scope: !123, inlinedAt: !545)
!709 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !545)
!710 = !DILocation(line: 334, column: 124, scope: !516)
!711 = !DILocation(line: 0, scope: !123, inlinedAt: !547)
!712 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !547)
!713 = !DILocation(line: 334, column: 169, scope: !516)
!714 = !DILocation(line: 0, scope: !123, inlinedAt: !549)
!715 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !549)
!716 = !DILocation(line: 334, column: 226, scope: !516)
!717 = !DILocation(line: 334, column: 229, scope: !516)
!718 = !DILocation(line: 334, column: 232, scope: !516)
!719 = !DILocation(line: 224, column: 9, scope: !339, inlinedAt: !720)
!720 = distinct !DILocation(line: 334, column: 205, scope: !516)
!721 = !DILocation(line: 0, scope: !329, inlinedAt: !720)
!722 = !DILocation(line: 224, column: 5, scope: !339, inlinedAt: !720)
!723 = !DILocation(line: 0, scope: !51, inlinedAt: !724)
!724 = distinct !DILocation(line: 334, column: 251, scope: !516)
!725 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !724)
!726 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !727)
!727 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !724)
!728 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !727)
!729 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !724)
!730 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !724)
!731 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !724)
!732 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !724)
!733 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !724)
!734 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !724)
!735 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !724)
!736 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !724)
!737 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !724)
!738 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !724)
!739 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !724)
!740 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !724)
!741 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !724)
!742 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !724)
!743 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !744)
!744 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !724)
!745 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !744)
!746 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !747)
!747 = distinct !DILocation(line: 335, column: 9, scope: !496)
!748 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !747)
!749 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !750)
!750 = !DILocation(line: 0, scope: !496)
!751 = !DILocation(line: 335, column: 21, scope: !483)
!752 = distinct !DISubprogram(name: "ink_compute_scalar32", scope: !15, file: !15, line: 336, type: !753, scopeLine: 336, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !755)
!753 = !DISubroutineType(types: !754)
!754 = !{!10, !10, !428, !430}
!755 = !{!756, !757, !758, !759, !762, !763, !764, !765, !766, !768, !769, !770, !771, !772, !774, !775, !776, !777}
!756 = !DILocalVariable(name: "function", arg: 1, scope: !752, file: !15, line: 336, type: !10)
!757 = !DILocalVariable(name: "data", arg: 2, scope: !752, file: !15, line: 336, type: !428)
!758 = !DILocalVariable(name: "lengths", arg: 3, scope: !752, file: !15, line: 336, type: !430)
!759 = !DILocalVariable(name: "a0", scope: !760, file: !15, line: 337, type: !10)
!760 = distinct !DILexicalBlock(scope: !761, file: !15, line: 337, column: 8)
!761 = distinct !DILexicalBlock(scope: !752, file: !15, line: 336, column: 138)
!762 = !DILocalVariable(name: "a1", scope: !760, file: !15, line: 337, type: !10)
!763 = !DILocalVariable(name: "a2", scope: !760, file: !15, line: 337, type: !10)
!764 = !DILocalVariable(name: "a3", scope: !760, file: !15, line: 337, type: !10)
!765 = !DILocalVariable(name: "result", scope: !760, file: !15, line: 337, type: !10)
!766 = !DILocalVariable(name: "a0", scope: !767, file: !15, line: 338, type: !10)
!767 = distinct !DILexicalBlock(scope: !761, file: !15, line: 338, column: 8)
!768 = !DILocalVariable(name: "a1", scope: !767, file: !15, line: 338, type: !10)
!769 = !DILocalVariable(name: "a2", scope: !767, file: !15, line: 338, type: !10)
!770 = !DILocalVariable(name: "a3", scope: !767, file: !15, line: 338, type: !10)
!771 = !DILocalVariable(name: "result", scope: !767, file: !15, line: 338, type: !10)
!772 = !DILocalVariable(name: "a0", scope: !773, file: !15, line: 339, type: !10)
!773 = distinct !DILexicalBlock(scope: !761, file: !15, line: 339, column: 8)
!774 = !DILocalVariable(name: "a1", scope: !773, file: !15, line: 339, type: !10)
!775 = !DILocalVariable(name: "a2", scope: !773, file: !15, line: 339, type: !10)
!776 = !DILocalVariable(name: "a3", scope: !773, file: !15, line: 339, type: !10)
!777 = !DILocalVariable(name: "result", scope: !773, file: !15, line: 339, type: !10)
!778 = !DILocation(line: 0, scope: !111, inlinedAt: !779)
!779 = distinct !DILocation(line: 337, column: 21, scope: !760)
!780 = !DILocation(line: 0, scope: !111, inlinedAt: !781)
!781 = distinct !DILocation(line: 337, column: 66, scope: !760)
!782 = !DILocation(line: 0, scope: !111, inlinedAt: !783)
!783 = distinct !DILocation(line: 337, column: 111, scope: !760)
!784 = !DILocation(line: 0, scope: !111, inlinedAt: !785)
!785 = distinct !DILocation(line: 337, column: 156, scope: !760)
!786 = !DILocation(line: 0, scope: !111, inlinedAt: !787)
!787 = distinct !DILocation(line: 338, column: 21, scope: !767)
!788 = !DILocation(line: 0, scope: !111, inlinedAt: !789)
!789 = distinct !DILocation(line: 338, column: 66, scope: !767)
!790 = !DILocation(line: 0, scope: !111, inlinedAt: !791)
!791 = distinct !DILocation(line: 338, column: 111, scope: !767)
!792 = !DILocation(line: 0, scope: !111, inlinedAt: !793)
!793 = distinct !DILocation(line: 338, column: 156, scope: !767)
!794 = !DILocation(line: 0, scope: !111, inlinedAt: !795)
!795 = distinct !DILocation(line: 339, column: 21, scope: !773)
!796 = !DILocation(line: 0, scope: !111, inlinedAt: !797)
!797 = distinct !DILocation(line: 339, column: 66, scope: !773)
!798 = !DILocation(line: 0, scope: !111, inlinedAt: !799)
!799 = distinct !DILocation(line: 339, column: 111, scope: !773)
!800 = !DILocation(line: 0, scope: !111, inlinedAt: !801)
!801 = distinct !DILocation(line: 339, column: 156, scope: !773)
!802 = !DILocation(line: 0, scope: !752)
!803 = !DILocation(line: 336, column: 122, scope: !752)
!804 = !DILocation(line: 337, column: 34, scope: !760)
!805 = !DILocation(line: 0, scope: !123, inlinedAt: !779)
!806 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !779)
!807 = !DILocation(line: 0, scope: !760)
!808 = !DILocation(line: 337, column: 79, scope: !760)
!809 = !DILocation(line: 0, scope: !123, inlinedAt: !781)
!810 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !781)
!811 = !DILocation(line: 337, column: 124, scope: !760)
!812 = !DILocation(line: 0, scope: !123, inlinedAt: !783)
!813 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !783)
!814 = !DILocation(line: 337, column: 169, scope: !760)
!815 = !DILocation(line: 0, scope: !123, inlinedAt: !785)
!816 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !785)
!817 = !DILocation(line: 337, column: 226, scope: !760)
!818 = !DILocation(line: 337, column: 229, scope: !760)
!819 = !DILocation(line: 337, column: 232, scope: !760)
!820 = !DILocation(line: 178, column: 9, scope: !299, inlinedAt: !821)
!821 = distinct !DILocation(line: 337, column: 205, scope: !760)
!822 = !DILocation(line: 0, scope: !287, inlinedAt: !821)
!823 = !DILocation(line: 178, column: 5, scope: !299, inlinedAt: !821)
!824 = !DILocation(line: 338, column: 34, scope: !767)
!825 = !DILocation(line: 0, scope: !123, inlinedAt: !787)
!826 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !787)
!827 = !DILocation(line: 0, scope: !767)
!828 = !DILocation(line: 338, column: 79, scope: !767)
!829 = !DILocation(line: 0, scope: !123, inlinedAt: !789)
!830 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !789)
!831 = !DILocation(line: 338, column: 124, scope: !767)
!832 = !DILocation(line: 0, scope: !123, inlinedAt: !791)
!833 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !791)
!834 = !DILocation(line: 338, column: 169, scope: !767)
!835 = !DILocation(line: 0, scope: !123, inlinedAt: !793)
!836 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !793)
!837 = !DILocation(line: 338, column: 227, scope: !767)
!838 = !DILocation(line: 338, column: 230, scope: !767)
!839 = !DILocation(line: 338, column: 233, scope: !767)
!840 = !DILocation(line: 201, column: 16, scope: !324, inlinedAt: !841)
!841 = distinct !DILocation(line: 338, column: 205, scope: !767)
!842 = !DILocation(line: 0, scope: !306, inlinedAt: !841)
!843 = !DILocation(line: 205, column: 9, scope: !319, inlinedAt: !841)
!844 = !DILocation(line: 205, column: 5, scope: !319, inlinedAt: !841)
!845 = !DILocation(line: 339, column: 34, scope: !773)
!846 = !DILocation(line: 0, scope: !123, inlinedAt: !795)
!847 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !795)
!848 = !DILocation(line: 0, scope: !773)
!849 = !DILocation(line: 339, column: 79, scope: !773)
!850 = !DILocation(line: 0, scope: !123, inlinedAt: !797)
!851 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !797)
!852 = !DILocation(line: 339, column: 124, scope: !773)
!853 = !DILocation(line: 0, scope: !123, inlinedAt: !799)
!854 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !799)
!855 = !DILocation(line: 339, column: 169, scope: !773)
!856 = !DILocation(line: 0, scope: !123, inlinedAt: !801)
!857 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !801)
!858 = !DILocation(line: 339, column: 226, scope: !773)
!859 = !DILocation(line: 339, column: 229, scope: !773)
!860 = !DILocation(line: 339, column: 232, scope: !773)
!861 = !DILocation(line: 224, column: 9, scope: !339, inlinedAt: !862)
!862 = distinct !DILocation(line: 339, column: 205, scope: !773)
!863 = !DILocation(line: 0, scope: !329, inlinedAt: !862)
!864 = !DILocation(line: 224, column: 5, scope: !339, inlinedAt: !862)
!865 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !866)
!866 = distinct !DILocation(line: 340, column: 9, scope: !761)
!867 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !866)
!868 = !DILocation(line: 340, column: 30, scope: !752)
!869 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !15, file: !15, line: 341, type: !870, scopeLine: 341, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !874)
!870 = !DISubroutineType(types: !871)
!871 = !{!872, !10, !428, !430}
!872 = !DIDerivedType(tag: DW_TAG_typedef, name: "uint64_t", file: !11, line: 102, baseType: !873)
!873 = !DIBasicType(name: "unsigned long long", size: 64, encoding: DW_ATE_unsigned)
!874 = !{!875, !876, !877}
!875 = !DILocalVariable(name: "function", arg: 1, scope: !869, file: !15, line: 341, type: !10)
!876 = !DILocalVariable(name: "data", arg: 2, scope: !869, file: !15, line: 341, type: !428)
!877 = !DILocalVariable(name: "lengths", arg: 3, scope: !869, file: !15, line: 341, type: !430)
!878 = !DILocation(line: 0, scope: !869)
!879 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !880)
!880 = distinct !DILocation(line: 342, column: 9, scope: !881)
!881 = distinct !DILexicalBlock(scope: !869, file: !15, line: 341, column: 138)
!882 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !880)
