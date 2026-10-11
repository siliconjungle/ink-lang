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
define hidden void @lang_fn_pipeline38_right_padded_zip_heldout_u32(ptr dead_on_unwind noalias nocapture writable writeonly sret(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %1, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %2, i32 noundef %3, i32 noundef %4) local_unnamed_addr #2 !dbg !167 {
    #dbg_declare(ptr %1, !176, !DIExpression(), !255)
    #dbg_declare(ptr %2, !177, !DIExpression(), !256)
    #dbg_value(i32 %3, !178, !DIExpression(), !257)
    #dbg_value(i32 %4, !179, !DIExpression(), !257)
  %6 = load ptr, ptr %1, align 4, !dbg !258, !tbaa !259
  %7 = ptrtoint ptr %6 to i32, !dbg !258
  %8 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !258
  %9 = load i32, ptr %8, align 4, !dbg !258, !tbaa !27
    #dbg_value(ptr %6, !180, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !257)
    #dbg_value(i32 %9, !180, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !257)
    #dbg_value(i32 %9, !55, !DIExpression(), !262)
    #dbg_value(i32 4, !56, !DIExpression(), !262)
  %10 = icmp ugt i32 %9, 1073741823, !dbg !264
  %11 = load i32, ptr @ink_top, align 4
  %12 = icmp ugt i32 %11, -8
  %13 = select i1 %10, i1 true, i1 %12, !dbg !265
  br i1 %13, label %14, label %15, !dbg !265

14:                                               ; preds = %5
  tail call void @llvm.trap(), !dbg !266
  unreachable, !dbg !268

15:                                               ; preds = %5
  %16 = icmp eq i32 %11, 0, !dbg !269
  %17 = add nuw i32 %11, 7, !dbg !270
  %18 = select i1 %16, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %17, !dbg !271
  %19 = and i32 %18, -8, !dbg !272
    #dbg_value(i32 %19, !57, !DIExpression(), !262)
  %20 = tail call i32 @llvm.umax.i32(i32 %9, i32 1), !dbg !273
  %21 = shl nuw i32 %20, 2, !dbg !274
    #dbg_value(i32 %21, !58, !DIExpression(), !262)
  %22 = xor i32 %19, -1, !dbg !275
  %23 = icmp ugt i32 %21, %22, !dbg !276
  br i1 %23, label %24, label %25, !dbg !276

24:                                               ; preds = %15
  tail call void @llvm.trap(), !dbg !277
  unreachable, !dbg !279

25:                                               ; preds = %15
  %26 = add i32 %19, %21, !dbg !280
  store i32 %26, ptr @ink_top, align 4, !dbg !281, !tbaa !27
  %27 = add i32 %26, 65535, !dbg !282
  %28 = lshr i32 %27, 16, !dbg !283
    #dbg_value(i32 %28, !59, !DIExpression(), !262)
  %29 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !284
    #dbg_value(i32 %29, !60, !DIExpression(), !262)
  %30 = icmp ugt i32 %28, %29, !dbg !285
  br i1 %30, label %31, label %36, !dbg !286

31:                                               ; preds = %25
  %32 = sub nuw nsw i32 %28, %29, !dbg !287
  %33 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %32), !dbg !288
  %34 = icmp eq i32 %33, -1, !dbg !289
  br i1 %34, label %35, label %36, !dbg !286

35:                                               ; preds = %31
  tail call void @llvm.trap(), !dbg !290
  unreachable, !dbg !292

36:                                               ; preds = %25, %31
  %37 = inttoptr i32 %19 to ptr, !dbg !293
    #dbg_value(ptr %37, !181, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !257)
    #dbg_value(i32 %9, !181, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !257)
    #dbg_value(i32 0, !182, !DIExpression(), !294)
  %38 = icmp eq i32 %9, 0, !dbg !295
  br i1 %38, label %41, label %39, !dbg !296

39:                                               ; preds = %36
  %40 = icmp eq i32 %4, 0
  br label %109, !dbg !296

41:                                               ; preds = %117, %36
    #dbg_value(ptr %37, !202, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !257)
    #dbg_value(i32 %9, !202, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !257)
    #dbg_value(ptr %6, !203, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !257)
    #dbg_value(i32 %9, !203, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !257)
    #dbg_value(i32 %9, !55, !DIExpression(), !297)
    #dbg_value(i32 4, !56, !DIExpression(), !297)
  %42 = load i32, ptr @ink_top, align 4
  %43 = icmp ugt i32 %42, -8
  br i1 %43, label %44, label %45, !dbg !299

44:                                               ; preds = %41
  tail call void @llvm.trap(), !dbg !300
  unreachable, !dbg !302

45:                                               ; preds = %41
  %46 = icmp eq i32 %42, 0, !dbg !303
  %47 = add nuw i32 %42, 7, !dbg !304
  %48 = select i1 %46, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %47, !dbg !305
  %49 = and i32 %48, -8, !dbg !306
    #dbg_value(i32 %49, !57, !DIExpression(), !297)
    #dbg_value(i32 %21, !58, !DIExpression(), !297)
  %50 = xor i32 %49, -1, !dbg !307
  %51 = icmp ugt i32 %21, %50, !dbg !308
  br i1 %51, label %52, label %53, !dbg !308

52:                                               ; preds = %45
  tail call void @llvm.trap(), !dbg !309
  unreachable, !dbg !311

53:                                               ; preds = %45
  %54 = add i32 %49, %21, !dbg !312
  store i32 %54, ptr @ink_top, align 4, !dbg !313, !tbaa !27
  %55 = add i32 %54, 65535, !dbg !314
  %56 = lshr i32 %55, 16, !dbg !315
    #dbg_value(i32 %56, !59, !DIExpression(), !297)
  %57 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !316
    #dbg_value(i32 %57, !60, !DIExpression(), !297)
  %58 = icmp ugt i32 %56, %57, !dbg !317
  br i1 %58, label %59, label %64, !dbg !318

59:                                               ; preds = %53
  %60 = sub nuw nsw i32 %56, %57, !dbg !319
  %61 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %60), !dbg !320
  %62 = icmp eq i32 %61, -1, !dbg !321
  br i1 %62, label %63, label %64, !dbg !318

63:                                               ; preds = %59
  tail call void @llvm.trap(), !dbg !322
  unreachable, !dbg !324

64:                                               ; preds = %53, %59
  %65 = inttoptr i32 %49 to ptr, !dbg !325
    #dbg_value(ptr %65, !204, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !257)
    #dbg_value(i32 %9, !204, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !257)
    #dbg_value(i32 0, !205, !DIExpression(), !326)
  br i1 %38, label %123, label %66, !dbg !327

66:                                               ; preds = %64
  %67 = icmp ult i32 %9, 4, !dbg !327
  %68 = sub i32 %49, %7, !dbg !327
  %69 = icmp ult i32 %68, 16, !dbg !327
  %70 = select i1 %67, i1 true, i1 %69, !dbg !327
  br i1 %70, label %92, label %71, !dbg !327

71:                                               ; preds = %66
  %72 = and i32 %9, 1073741820, !dbg !327
  %73 = insertelement <4 x i32> poison, i32 %3, i64 0, !dbg !327
  %74 = shufflevector <4 x i32> %73, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !327
  %75 = insertelement <4 x i32> poison, i32 %4, i64 0, !dbg !327
  %76 = shufflevector <4 x i32> %75, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !327
  br label %77, !dbg !327

77:                                               ; preds = %77, %71
  %78 = phi i32 [ 0, %71 ], [ %87, %77 ], !dbg !328
  %79 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %71 ], [ %88, %77 ]
  %80 = getelementptr inbounds nuw i32, ptr %6, i32 %78, !dbg !329
  %81 = load <4 x i32>, ptr %80, align 4, !dbg !329, !tbaa !330
  %82 = icmp ult <4 x i32> %79, %74, !dbg !332
  %83 = add <4 x i32> %81, %76, !dbg !333
  %84 = mul <4 x i32> %81, splat (i32 3), !dbg !333
  %85 = select <4 x i1> %82, <4 x i32> %83, <4 x i32> %84, !dbg !333
  %86 = getelementptr inbounds nuw i32, ptr %65, i32 %78, !dbg !334
  store <4 x i32> %85, ptr %86, align 8, !dbg !335, !tbaa !330
  %87 = add nuw i32 %78, 4, !dbg !328
  %88 = add <4 x i32> %79, splat (i32 4)
  %89 = icmp eq i32 %87, %72, !dbg !328
  br i1 %89, label %90, label %77, !dbg !328, !llvm.loop !336

90:                                               ; preds = %77
  %91 = icmp eq i32 %9, %72, !dbg !327
  br i1 %91, label %123, label %92, !dbg !327

92:                                               ; preds = %66, %90
  %93 = phi i32 [ 0, %66 ], [ %72, %90 ]
  %94 = or disjoint i32 %93, 1, !dbg !327
  %95 = and i32 %9, 1, !dbg !327
  %96 = icmp eq i32 %95, 0, !dbg !327
  br i1 %96, label %106, label %97, !dbg !327

97:                                               ; preds = %92
    #dbg_value(i32 poison, !205, !DIExpression(), !326)
    #dbg_value(i32 poison, !207, !DIExpression(), !338)
  %98 = getelementptr inbounds nuw i32, ptr %6, i32 %93, !dbg !329
  %99 = load i32, ptr %98, align 4, !dbg !329, !tbaa !330
    #dbg_value(i32 %99, !210, !DIExpression(), !338)
    #dbg_value(i32 %3, !211, !DIExpression(), !338)
    #dbg_value(i32 %4, !212, !DIExpression(), !338)
    #dbg_value(i32 poison, !213, !DIExpression(), !338)
    #dbg_value(i32 %99, !214, !DIExpression(), !338)
    #dbg_value(i32 %3, !215, !DIExpression(), !338)
    #dbg_value(i32 %4, !216, !DIExpression(), !338)
    #dbg_value(i32 poison, !217, !DIExpression(), !338)
  %100 = icmp ult i32 %93, %3, !dbg !332
  %101 = add i32 %99, %4, !dbg !333
  %102 = mul i32 %99, 3, !dbg !333
  %103 = select i1 %100, i32 %101, i32 %102, !dbg !333
    #dbg_value(i32 %103, !218, !DIExpression(), !338)
  %104 = getelementptr inbounds nuw i32, ptr %65, i32 %93, !dbg !334
  store i32 %103, ptr %104, align 8, !dbg !335, !tbaa !330
  %105 = or disjoint i32 %93, 1, !dbg !328
    #dbg_value(i32 %105, !205, !DIExpression(), !326)
  br label %106, !dbg !327

106:                                              ; preds = %97, %92
  %107 = phi i32 [ %93, %92 ], [ %105, %97 ]
  %108 = icmp eq i32 %9, %94, !dbg !327
  br i1 %108, label %123, label %130, !dbg !327

109:                                              ; preds = %39, %117
  %110 = phi i32 [ 0, %39 ], [ %121, %117 ]
    #dbg_value(i32 %110, !182, !DIExpression(), !294)
    #dbg_value(i32 %110, !184, !DIExpression(), !339)
    #dbg_value(i32 poison, !187, !DIExpression(), !339)
    #dbg_value(i32 %3, !188, !DIExpression(), !339)
    #dbg_value(i32 %4, !189, !DIExpression(), !339)
    #dbg_value(i32 %110, !190, !DIExpression(), !339)
    #dbg_value(i32 poison, !191, !DIExpression(), !339)
    #dbg_value(i32 %3, !192, !DIExpression(), !339)
    #dbg_value(i32 %4, !193, !DIExpression(), !339)
    #dbg_value(i32 poison, !194, !DIExpression(), !339)
    #dbg_value(i32 %4, !195, !DIExpression(), !339)
  br i1 %40, label %117, label %111, !dbg !340

111:                                              ; preds = %109
  %112 = getelementptr inbounds nuw i32, ptr %6, i32 %110, !dbg !342
  %113 = load i32, ptr %112, align 4, !dbg !342, !tbaa !330
    #dbg_value(i32 %113, !187, !DIExpression(), !339)
    #dbg_value(i32 %113, !191, !DIExpression(), !339)
    #dbg_value(i32 %113, !194, !DIExpression(), !339)
  %114 = udiv i32 %113, %4, !dbg !343
    #dbg_value(i32 %114, !196, !DIExpression(), !339)
    #dbg_value(i32 %114, !197, !DIExpression(), !339)
    #dbg_value(i32 %110, !198, !DIExpression(), !339)
    #dbg_value(i32 %4, !199, !DIExpression(), !339)
  %115 = urem i32 %110, %4, !dbg !345
    #dbg_value(i32 %115, !200, !DIExpression(), !339)
  %116 = add i32 %115, %114
  br label %117

117:                                              ; preds = %109, %111
  %118 = phi i32 [ %116, %111 ], [ 0, %109 ], !dbg !348
    #dbg_value(i32 poison, !200, !DIExpression(), !339)
    #dbg_value(i32 %118, !201, !DIExpression(), !339)
  %119 = add i32 %118, %3, !dbg !349
  %120 = getelementptr inbounds nuw i32, ptr %37, i32 %110, !dbg !350
  store i32 %119, ptr %120, align 4, !dbg !351, !tbaa !330
  %121 = add nuw i32 %110, 1, !dbg !352
    #dbg_value(i32 %121, !182, !DIExpression(), !294)
  %122 = icmp eq i32 %121, %9, !dbg !295
  br i1 %122, label %41, label %109, !dbg !296, !llvm.loop !353

123:                                              ; preds = %106, %130, %90, %64
    #dbg_value(ptr %65, !224, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !257)
    #dbg_value(i32 %9, !224, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !257)
  %124 = load ptr, ptr %2, align 4, !dbg !355, !tbaa !259
  %125 = ptrtoint ptr %124 to i32, !dbg !355
  %126 = getelementptr inbounds nuw i8, ptr %2, i32 4, !dbg !355
  %127 = load i32, ptr %126, align 4, !dbg !355, !tbaa !27
    #dbg_value(ptr %124, !225, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !257)
    #dbg_value(i32 %127, !225, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !257)
  %128 = xor i32 %127, -1, !dbg !356
  %129 = icmp ugt i32 %9, %128, !dbg !358
  br i1 %129, label %149, label %150, !dbg !358

130:                                              ; preds = %106, %130
  %131 = phi i32 [ %147, %130 ], [ %107, %106 ]
    #dbg_value(i32 %131, !205, !DIExpression(), !326)
    #dbg_value(i32 %131, !207, !DIExpression(), !338)
  %132 = getelementptr inbounds nuw i32, ptr %6, i32 %131, !dbg !329
  %133 = load i32, ptr %132, align 4, !dbg !329, !tbaa !330
    #dbg_value(i32 %133, !210, !DIExpression(), !338)
    #dbg_value(i32 %3, !211, !DIExpression(), !338)
    #dbg_value(i32 %4, !212, !DIExpression(), !338)
    #dbg_value(i32 %131, !213, !DIExpression(), !338)
    #dbg_value(i32 %133, !214, !DIExpression(), !338)
    #dbg_value(i32 %3, !215, !DIExpression(), !338)
    #dbg_value(i32 %4, !216, !DIExpression(), !338)
    #dbg_value(i32 %131, !217, !DIExpression(), !338)
  %134 = icmp ult i32 %131, %3, !dbg !332
  %135 = add i32 %133, %4, !dbg !333
  %136 = mul i32 %133, 3, !dbg !333
  %137 = select i1 %134, i32 %135, i32 %136, !dbg !333
    #dbg_value(i32 %137, !218, !DIExpression(), !338)
  %138 = getelementptr inbounds nuw i32, ptr %65, i32 %131, !dbg !334
  store i32 %137, ptr %138, align 4, !dbg !335, !tbaa !330
  %139 = add nuw i32 %131, 1, !dbg !328
    #dbg_value(i32 %139, !205, !DIExpression(), !326)
    #dbg_value(i32 %139, !207, !DIExpression(), !338)
  %140 = getelementptr inbounds nuw i32, ptr %6, i32 %139, !dbg !329
  %141 = load i32, ptr %140, align 4, !dbg !329, !tbaa !330
    #dbg_value(i32 %141, !210, !DIExpression(), !338)
    #dbg_value(i32 %139, !213, !DIExpression(), !338)
    #dbg_value(i32 %141, !214, !DIExpression(), !338)
    #dbg_value(i32 %139, !217, !DIExpression(), !338)
  %142 = icmp ult i32 %139, %3, !dbg !332
  %143 = add i32 %141, %4, !dbg !333
  %144 = mul i32 %141, 3, !dbg !333
  %145 = select i1 %142, i32 %143, i32 %144, !dbg !333
    #dbg_value(i32 %145, !218, !DIExpression(), !338)
  %146 = getelementptr inbounds nuw i32, ptr %65, i32 %139, !dbg !334
  store i32 %145, ptr %146, align 4, !dbg !335, !tbaa !330
  %147 = add nuw i32 %131, 2, !dbg !328
    #dbg_value(i32 %147, !205, !DIExpression(), !326)
  %148 = icmp eq i32 %147, %9, !dbg !359
  br i1 %148, label %123, label %130, !dbg !327, !llvm.loop !360

149:                                              ; preds = %123
  tail call void @llvm.trap(), !dbg !361
  unreachable, !dbg !363

150:                                              ; preds = %123
  %151 = add i32 %127, %9, !dbg !364
    #dbg_value(i32 %151, !226, !DIExpression(), !257)
    #dbg_value(i32 %151, !55, !DIExpression(), !365)
    #dbg_value(i32 4, !56, !DIExpression(), !365)
  %152 = icmp ugt i32 %151, 1073741823, !dbg !367
  %153 = load i32, ptr @ink_top, align 4
  %154 = icmp ugt i32 %153, -8
  %155 = select i1 %152, i1 true, i1 %154, !dbg !368
  br i1 %155, label %156, label %157, !dbg !368

156:                                              ; preds = %150
  tail call void @llvm.trap(), !dbg !369
  unreachable, !dbg !371

157:                                              ; preds = %150
  %158 = icmp eq i32 %153, 0, !dbg !372
  %159 = add nuw i32 %153, 7, !dbg !373
  %160 = select i1 %158, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %159, !dbg !374
  %161 = and i32 %160, -8, !dbg !375
    #dbg_value(i32 %160, !57, !DIExpression(DW_OP_constu, 18446744073709551608, DW_OP_and, DW_OP_stack_value), !365)
  %162 = tail call i32 @llvm.umax.i32(i32 %151, i32 1), !dbg !376
  %163 = shl nuw i32 %162, 2, !dbg !377
    #dbg_value(i32 %163, !58, !DIExpression(), !365)
  %164 = xor i32 %161, -1, !dbg !378
  %165 = icmp ugt i32 %163, %164, !dbg !379
  br i1 %165, label %166, label %167, !dbg !379

166:                                              ; preds = %157
  tail call void @llvm.trap(), !dbg !380
  unreachable, !dbg !382

167:                                              ; preds = %157
  %168 = add i32 %161, %163, !dbg !383
  store i32 %168, ptr @ink_top, align 4, !dbg !384, !tbaa !27
  %169 = add i32 %168, 65535, !dbg !385
  %170 = lshr i32 %169, 16, !dbg !386
    #dbg_value(i32 %170, !59, !DIExpression(), !365)
  %171 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !387
    #dbg_value(i32 %171, !60, !DIExpression(), !365)
  %172 = icmp ugt i32 %170, %171, !dbg !388
  br i1 %172, label %173, label %178, !dbg !389

173:                                              ; preds = %167
  %174 = sub nuw nsw i32 %170, %171, !dbg !390
  %175 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %174), !dbg !391
  %176 = icmp eq i32 %175, -1, !dbg !392
  br i1 %176, label %177, label %178, !dbg !389

177:                                              ; preds = %173
  tail call void @llvm.trap(), !dbg !393
  unreachable, !dbg !395

178:                                              ; preds = %167, %173
  %179 = inttoptr i32 %161 to ptr, !dbg !396
    #dbg_value(ptr %179, !227, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !257)
    #dbg_value(i32 %151, !227, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !257)
  %180 = shl nuw i32 %9, 2, !dbg !397
    #dbg_value(ptr %179, !110, !DIExpression(), !398)
    #dbg_value(ptr %65, !115, !DIExpression(), !398)
    #dbg_value(i32 %180, !116, !DIExpression(), !398)
    #dbg_value(ptr %179, !117, !DIExpression(), !398)
    #dbg_value(ptr %65, !119, !DIExpression(), !398)
    #dbg_value(i32 0, !122, !DIExpression(), !400)
  br i1 %38, label %218, label %181, !dbg !401

181:                                              ; preds = %178
  %182 = icmp ult i32 %9, 4, !dbg !401
  %183 = sub i32 %160, %49, !dbg !401
  %184 = icmp ult i32 %183, 16, !dbg !401
  %185 = or i1 %182, %184, !dbg !401
  br i1 %185, label %197, label %186, !dbg !401

186:                                              ; preds = %181
  %187 = and i32 %180, -16, !dbg !401
  br label %188, !dbg !401

188:                                              ; preds = %188, %186
  %189 = phi i32 [ 0, %186 ], [ %193, %188 ], !dbg !402
  %190 = getelementptr inbounds nuw i8, ptr %65, i32 %189, !dbg !403
  %191 = load <16 x i8>, ptr %190, align 8, !dbg !403, !tbaa !132
  %192 = getelementptr inbounds nuw i8, ptr %179, i32 %189, !dbg !404
  store <16 x i8> %191, ptr %192, align 8, !dbg !405, !tbaa !132
  %193 = add nuw i32 %189, 16, !dbg !402
  %194 = icmp eq i32 %193, %187, !dbg !402
  br i1 %194, label %195, label %188, !dbg !402, !llvm.loop !406

195:                                              ; preds = %188
  %196 = icmp eq i32 %180, %187, !dbg !401
  br i1 %196, label %218, label %197, !dbg !401

197:                                              ; preds = %181, %195
  %198 = phi i32 [ 0, %181 ], [ %187, %195 ]
  br label %199, !dbg !401

199:                                              ; preds = %199, %197
  %200 = phi i32 [ %198, %197 ], [ %216, %199 ]
    #dbg_value(i32 %200, !122, !DIExpression(), !400)
  %201 = getelementptr inbounds nuw i8, ptr %65, i32 %200, !dbg !403
  %202 = load i8, ptr %201, align 4, !dbg !403, !tbaa !132
  %203 = getelementptr inbounds nuw i8, ptr %179, i32 %200, !dbg !404
  store i8 %202, ptr %203, align 4, !dbg !405, !tbaa !132
  %204 = or disjoint i32 %200, 1, !dbg !402
    #dbg_value(i32 %204, !122, !DIExpression(), !400)
  %205 = getelementptr inbounds nuw i8, ptr %65, i32 %204, !dbg !403
  %206 = load i8, ptr %205, align 1, !dbg !403, !tbaa !132
  %207 = getelementptr inbounds nuw i8, ptr %179, i32 %204, !dbg !404
  store i8 %206, ptr %207, align 1, !dbg !405, !tbaa !132
  %208 = or disjoint i32 %200, 2, !dbg !402
    #dbg_value(i32 %208, !122, !DIExpression(), !400)
  %209 = getelementptr inbounds nuw i8, ptr %65, i32 %208, !dbg !403
  %210 = load i8, ptr %209, align 2, !dbg !403, !tbaa !132
  %211 = getelementptr inbounds nuw i8, ptr %179, i32 %208, !dbg !404
  store i8 %210, ptr %211, align 2, !dbg !405, !tbaa !132
  %212 = or disjoint i32 %200, 3, !dbg !402
    #dbg_value(i32 %212, !122, !DIExpression(), !400)
  %213 = getelementptr inbounds nuw i8, ptr %65, i32 %212, !dbg !403
  %214 = load i8, ptr %213, align 1, !dbg !403, !tbaa !132
  %215 = getelementptr inbounds nuw i8, ptr %179, i32 %212, !dbg !404
  store i8 %214, ptr %215, align 1, !dbg !405, !tbaa !132
  %216 = add nuw i32 %200, 4, !dbg !402
    #dbg_value(i32 %216, !122, !DIExpression(), !400)
  %217 = icmp eq i32 %216, %180, !dbg !408
  br i1 %217, label %218, label %199, !dbg !401, !llvm.loop !409

218:                                              ; preds = %199, %195, %178
  %219 = getelementptr inbounds nuw i32, ptr %179, i32 %9, !dbg !410
  %220 = shl i32 %127, 2, !dbg !411
    #dbg_value(ptr %219, !110, !DIExpression(), !412)
    #dbg_value(ptr %124, !115, !DIExpression(), !412)
    #dbg_value(i32 %220, !116, !DIExpression(), !412)
    #dbg_value(ptr %219, !117, !DIExpression(), !412)
    #dbg_value(ptr %124, !119, !DIExpression(), !412)
    #dbg_value(i32 0, !122, !DIExpression(), !414)
  %221 = icmp eq i32 %220, 0, !dbg !415
  br i1 %221, label %260, label %222, !dbg !416

222:                                              ; preds = %218
  %223 = icmp ult i32 %220, 16, !dbg !416
  br i1 %223, label %239, label %224, !dbg !416

224:                                              ; preds = %222
  %225 = add i32 %161, %180, !dbg !416
  %226 = sub i32 %225, %125, !dbg !416
  %227 = icmp ult i32 %226, 16, !dbg !416
  br i1 %227, label %239, label %228, !dbg !416

228:                                              ; preds = %224
  %229 = and i32 %220, -16, !dbg !416
  br label %230, !dbg !416

230:                                              ; preds = %230, %228
  %231 = phi i32 [ 0, %228 ], [ %235, %230 ], !dbg !417
  %232 = getelementptr inbounds nuw i8, ptr %124, i32 %231, !dbg !418
  %233 = load <16 x i8>, ptr %232, align 1, !dbg !418, !tbaa !132
  %234 = getelementptr inbounds nuw i8, ptr %219, i32 %231, !dbg !419
  store <16 x i8> %233, ptr %234, align 4, !dbg !420, !tbaa !132
  %235 = add nuw i32 %231, 16, !dbg !417
  %236 = icmp eq i32 %235, %229, !dbg !417
  br i1 %236, label %237, label %230, !dbg !417, !llvm.loop !421

237:                                              ; preds = %230
  %238 = icmp eq i32 %220, %229, !dbg !416
  br i1 %238, label %260, label %239, !dbg !416

239:                                              ; preds = %224, %222, %237
  %240 = phi i32 [ 0, %222 ], [ 0, %224 ], [ %229, %237 ]
  br label %241, !dbg !416

241:                                              ; preds = %241, %239
  %242 = phi i32 [ %240, %239 ], [ %258, %241 ]
    #dbg_value(i32 %242, !122, !DIExpression(), !414)
  %243 = getelementptr inbounds nuw i8, ptr %124, i32 %242, !dbg !418
  %244 = load i8, ptr %243, align 1, !dbg !418, !tbaa !132
  %245 = getelementptr inbounds nuw i8, ptr %219, i32 %242, !dbg !419
  store i8 %244, ptr %245, align 4, !dbg !420, !tbaa !132
  %246 = or disjoint i32 %242, 1, !dbg !417
    #dbg_value(i32 %246, !122, !DIExpression(), !414)
  %247 = getelementptr inbounds nuw i8, ptr %124, i32 %246, !dbg !418
  %248 = load i8, ptr %247, align 1, !dbg !418, !tbaa !132
  %249 = getelementptr inbounds nuw i8, ptr %219, i32 %246, !dbg !419
  store i8 %248, ptr %249, align 1, !dbg !420, !tbaa !132
  %250 = or disjoint i32 %242, 2, !dbg !417
    #dbg_value(i32 %250, !122, !DIExpression(), !414)
  %251 = getelementptr inbounds nuw i8, ptr %124, i32 %250, !dbg !418
  %252 = load i8, ptr %251, align 1, !dbg !418, !tbaa !132
  %253 = getelementptr inbounds nuw i8, ptr %219, i32 %250, !dbg !419
  store i8 %252, ptr %253, align 2, !dbg !420, !tbaa !132
  %254 = or disjoint i32 %242, 3, !dbg !417
    #dbg_value(i32 %254, !122, !DIExpression(), !414)
  %255 = getelementptr inbounds nuw i8, ptr %124, i32 %254, !dbg !418
  %256 = load i8, ptr %255, align 1, !dbg !418, !tbaa !132
  %257 = getelementptr inbounds nuw i8, ptr %219, i32 %254, !dbg !419
  store i8 %256, ptr %257, align 1, !dbg !420, !tbaa !132
  %258 = add nuw i32 %242, 4, !dbg !417
    #dbg_value(i32 %258, !122, !DIExpression(), !414)
  %259 = icmp eq i32 %258, %220, !dbg !415
  br i1 %259, label %260, label %241, !dbg !416, !llvm.loop !423

260:                                              ; preds = %241, %237, %218
    #dbg_value(ptr %179, !228, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !257)
    #dbg_value(i32 %151, !228, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !257)
    #dbg_declare(ptr %0, !229, !DIExpression(), !424)
  %261 = tail call i32 @llvm.umin.i32(i32 %9, i32 %151), !dbg !425
    #dbg_value(i32 %261, !55, !DIExpression(), !426)
    #dbg_value(i32 4, !56, !DIExpression(), !426)
  %262 = load i32, ptr @ink_top, align 4
  %263 = icmp ugt i32 %262, -8
  br i1 %263, label %264, label %265, !dbg !428

264:                                              ; preds = %260
  tail call void @llvm.trap(), !dbg !429
  unreachable, !dbg !431

265:                                              ; preds = %260
  %266 = icmp eq i32 %262, 0, !dbg !432
  %267 = add nuw i32 %262, 7, !dbg !433
  %268 = select i1 %266, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %267, !dbg !434
  %269 = and i32 %268, -8, !dbg !435
    #dbg_value(i32 %268, !57, !DIExpression(DW_OP_constu, 18446744073709551608, DW_OP_and, DW_OP_stack_value), !426)
  %270 = tail call i32 @llvm.umax.i32(i32 %261, i32 1), !dbg !436
  %271 = shl nuw i32 %270, 2, !dbg !437
    #dbg_value(i32 %271, !58, !DIExpression(), !426)
  %272 = xor i32 %269, -1, !dbg !438
  %273 = icmp ugt i32 %271, %272, !dbg !439
  br i1 %273, label %274, label %275, !dbg !439

274:                                              ; preds = %265
  tail call void @llvm.trap(), !dbg !440
  unreachable, !dbg !442

275:                                              ; preds = %265
  %276 = add i32 %269, %271, !dbg !443
  store i32 %276, ptr @ink_top, align 4, !dbg !444, !tbaa !27
  %277 = add i32 %276, 65535, !dbg !445
  %278 = lshr i32 %277, 16, !dbg !446
    #dbg_value(i32 %278, !59, !DIExpression(), !426)
  %279 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !447
    #dbg_value(i32 %279, !60, !DIExpression(), !426)
  %280 = icmp ugt i32 %278, %279, !dbg !448
  br i1 %280, label %281, label %286, !dbg !449

281:                                              ; preds = %275
  %282 = sub nuw nsw i32 %278, %279, !dbg !450
  %283 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %282), !dbg !451
  %284 = icmp eq i32 %283, -1, !dbg !452
  br i1 %284, label %285, label %286, !dbg !449

285:                                              ; preds = %281
  tail call void @llvm.trap(), !dbg !453
  unreachable, !dbg !455

286:                                              ; preds = %275, %281
  %287 = inttoptr i32 %269 to ptr, !dbg !456
  store ptr %287, ptr %0, align 4, !dbg !457, !tbaa !458
  %288 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !457
  store i32 %261, ptr %288, align 4, !dbg !457, !tbaa !460
    #dbg_value(i32 0, !230, !DIExpression(), !461)
  %289 = icmp eq i32 %261, 0, !dbg !462
  br i1 %289, label %382, label %290, !dbg !463

290:                                              ; preds = %286
  %291 = icmp eq i32 %4, 0
  %292 = icmp ult i32 %261, 4, !dbg !463
  br i1 %292, label %380, label %293, !dbg !463

293:                                              ; preds = %290
  %294 = sub i32 %268, %19, !dbg !463
  %295 = icmp ult i32 %294, 16, !dbg !463
  %296 = sub i32 %268, %161, !dbg !463
  %297 = icmp ult i32 %296, 16, !dbg !463
  %298 = or i1 %295, %297, !dbg !463
  br i1 %298, label %380, label %299, !dbg !463

299:                                              ; preds = %293
  %300 = and i32 %261, 1073741820, !dbg !463
  %301 = insertelement <4 x i1> poison, i1 %291, i64 0, !dbg !463
  %302 = shufflevector <4 x i1> %301, <4 x i1> poison, <4 x i32> zeroinitializer, !dbg !463
  %303 = xor <4 x i1> %302, splat (i1 true), !dbg !464
  br label %304, !dbg !463

304:                                              ; preds = %370, %299
  %305 = phi i32 [ 0, %299 ], [ %376, %370 ], !dbg !466
  %306 = getelementptr inbounds nuw i32, ptr %37, i32 %305, !dbg !467
  %307 = load <4 x i32>, ptr %306, align 8, !dbg !467, !tbaa !330
  %308 = getelementptr inbounds nuw i32, ptr %179, i32 %305, !dbg !468
  %309 = load <4 x i32>, ptr %308, align 8, !dbg !468, !tbaa !330
  %310 = icmp ult <4 x i32> %307, %309, !dbg !469
  %311 = select <4 x i1> %310, <4 x i1> splat (i1 true), <4 x i1> %302, !dbg !470
  %312 = xor <4 x i1> %311, splat (i1 true), !dbg !470
  %313 = extractelement <4 x i1> %312, i64 0, !dbg !470
  br i1 %313, label %314, label %318, !dbg !464

314:                                              ; preds = %304
  %315 = extractelement <4 x i32> %309, i64 0, !dbg !472
  %316 = urem i32 %315, %4, !dbg !472
  %317 = insertelement <4 x i32> poison, i32 %316, i64 0, !dbg !472
  br label %318, !dbg !470

318:                                              ; preds = %314, %304
  %319 = phi <4 x i32> [ poison, %304 ], [ %317, %314 ], !dbg !472
  %320 = extractelement <4 x i1> %312, i64 1, !dbg !472
  br i1 %320, label %321, label %325, !dbg !472

321:                                              ; preds = %318
  %322 = extractelement <4 x i32> %309, i64 1, !dbg !472
  %323 = urem i32 %322, %4, !dbg !472
  %324 = insertelement <4 x i32> %319, i32 %323, i64 1, !dbg !472
  br label %325, !dbg !472

325:                                              ; preds = %321, %318
  %326 = phi <4 x i32> [ %319, %318 ], [ %324, %321 ], !dbg !472
  %327 = extractelement <4 x i1> %312, i64 2, !dbg !472
  br i1 %327, label %328, label %332, !dbg !472

328:                                              ; preds = %325
  %329 = extractelement <4 x i32> %309, i64 2, !dbg !472
  %330 = urem i32 %329, %4, !dbg !472
  %331 = insertelement <4 x i32> %326, i32 %330, i64 2, !dbg !472
  br label %332, !dbg !472

332:                                              ; preds = %328, %325
  %333 = phi <4 x i32> [ %326, %325 ], [ %331, %328 ], !dbg !472
  %334 = extractelement <4 x i1> %312, i64 3, !dbg !472
  br i1 %334, label %335, label %339, !dbg !472

335:                                              ; preds = %332
  %336 = extractelement <4 x i32> %309, i64 3, !dbg !472
  %337 = urem i32 %336, %4, !dbg !472
  %338 = insertelement <4 x i32> %333, i32 %337, i64 3, !dbg !472
  br label %339, !dbg !472

339:                                              ; preds = %335, %332
  %340 = phi <4 x i32> [ %333, %332 ], [ %338, %335 ], !dbg !472
  %341 = select <4 x i1> %311, <4 x i32> zeroinitializer, <4 x i32> %340, !dbg !474
  %342 = add <4 x i32> %341, %307, !dbg !475
  %343 = select <4 x i1> %310, <4 x i1> %303, <4 x i1> zeroinitializer, !dbg !464
  %344 = extractelement <4 x i1> %343, i64 0, !dbg !464
  br i1 %344, label %345, label %349, !dbg !472

345:                                              ; preds = %339
  %346 = extractelement <4 x i32> %307, i64 0, !dbg !476
  %347 = udiv i32 %346, %4, !dbg !476
  %348 = insertelement <4 x i32> poison, i32 %347, i64 0, !dbg !476
  br label %349, !dbg !464

349:                                              ; preds = %345, %339
  %350 = phi <4 x i32> [ poison, %339 ], [ %348, %345 ], !dbg !476
  %351 = extractelement <4 x i1> %343, i64 1, !dbg !476
  br i1 %351, label %352, label %356, !dbg !476

352:                                              ; preds = %349
  %353 = extractelement <4 x i32> %307, i64 1, !dbg !476
  %354 = udiv i32 %353, %4, !dbg !476
  %355 = insertelement <4 x i32> %350, i32 %354, i64 1, !dbg !476
  br label %356, !dbg !476

356:                                              ; preds = %352, %349
  %357 = phi <4 x i32> [ %350, %349 ], [ %355, %352 ], !dbg !476
  %358 = extractelement <4 x i1> %343, i64 2, !dbg !476
  br i1 %358, label %359, label %363, !dbg !476

359:                                              ; preds = %356
  %360 = extractelement <4 x i32> %307, i64 2, !dbg !476
  %361 = udiv i32 %360, %4, !dbg !476
  %362 = insertelement <4 x i32> %357, i32 %361, i64 2, !dbg !476
  br label %363, !dbg !476

363:                                              ; preds = %359, %356
  %364 = phi <4 x i32> [ %357, %356 ], [ %362, %359 ], !dbg !476
  %365 = extractelement <4 x i1> %343, i64 3, !dbg !476
  br i1 %365, label %366, label %370, !dbg !476

366:                                              ; preds = %363
  %367 = extractelement <4 x i32> %307, i64 3, !dbg !476
  %368 = udiv i32 %367, %4, !dbg !476
  %369 = insertelement <4 x i32> %364, i32 %368, i64 3, !dbg !476
  br label %370, !dbg !476

370:                                              ; preds = %366, %363
  %371 = phi <4 x i32> [ %364, %363 ], [ %369, %366 ], !dbg !476
  %372 = select <4 x i1> %343, <4 x i32> %371, <4 x i32> zeroinitializer, !dbg !478
  %373 = add <4 x i32> %372, %309, !dbg !479
  %374 = select <4 x i1> %310, <4 x i32> %373, <4 x i32> %342, !dbg !480
  %375 = getelementptr inbounds nuw i32, ptr %287, i32 %305, !dbg !481
  store <4 x i32> %374, ptr %375, align 8, !dbg !482, !tbaa !330
  %376 = add nuw i32 %305, 4, !dbg !466
  %377 = icmp eq i32 %376, %300, !dbg !466
  br i1 %377, label %378, label %304, !dbg !466, !llvm.loop !483

378:                                              ; preds = %370
  %379 = icmp eq i32 %261, %300, !dbg !463
  br i1 %379, label %382, label %380, !dbg !463

380:                                              ; preds = %293, %290, %378
  %381 = phi i32 [ 0, %290 ], [ 0, %293 ], [ %300, %378 ]
  br label %383, !dbg !463

382:                                              ; preds = %402, %378, %286
  ret void, !dbg !485

383:                                              ; preds = %380, %402
  %384 = phi i32 [ %405, %402 ], [ %381, %380 ]
    #dbg_value(i32 %384, !230, !DIExpression(), !461)
  %385 = getelementptr inbounds nuw i32, ptr %37, i32 %384, !dbg !467
  %386 = load i32, ptr %385, align 4, !dbg !467, !tbaa !330
    #dbg_value(i32 %386, !232, !DIExpression(), !486)
  %387 = getelementptr inbounds nuw i32, ptr %179, i32 %384, !dbg !468
  %388 = load i32, ptr %387, align 4, !dbg !468, !tbaa !330
    #dbg_value(i32 %388, !235, !DIExpression(), !486)
    #dbg_value(i32 %3, !236, !DIExpression(), !486)
    #dbg_value(i32 %4, !237, !DIExpression(), !486)
    #dbg_value(i32 %386, !238, !DIExpression(), !486)
    #dbg_value(i32 %388, !239, !DIExpression(), !486)
    #dbg_value(i32 %3, !240, !DIExpression(), !486)
    #dbg_value(i32 %4, !241, !DIExpression(), !486)
    #dbg_value(i32 %386, !242, !DIExpression(), !486)
  %389 = icmp ult i32 %386, %388, !dbg !469
  br i1 %389, label %390, label %396, !dbg !487

390:                                              ; preds = %383
    #dbg_value(i32 %386, !244, !DIExpression(), !488)
    #dbg_value(i32 %4, !247, !DIExpression(), !488)
  br i1 %291, label %393, label %391, !dbg !464

391:                                              ; preds = %390
  %392 = udiv i32 %386, %4, !dbg !476
    #dbg_value(i32 %392, !248, !DIExpression(), !488)
  br label %393

393:                                              ; preds = %390, %391
  %394 = phi i32 [ %392, %391 ], [ 0, %390 ], !dbg !478
    #dbg_value(i32 %394, !248, !DIExpression(), !488)
    #dbg_value(i32 %394, !249, !DIExpression(), !488)
  %395 = add i32 %394, %388, !dbg !479
    #dbg_value(i32 %395, !243, !DIExpression(), !486)
  br label %402, !dbg !489

396:                                              ; preds = %383
    #dbg_value(i32 %388, !250, !DIExpression(), !490)
    #dbg_value(i32 %4, !252, !DIExpression(), !490)
  br i1 %291, label %399, label %397, !dbg !470

397:                                              ; preds = %396
  %398 = urem i32 %388, %4, !dbg !472
    #dbg_value(i32 %398, !253, !DIExpression(), !490)
  br label %399

399:                                              ; preds = %396, %397
  %400 = phi i32 [ %398, %397 ], [ 0, %396 ], !dbg !474
    #dbg_value(i32 %400, !253, !DIExpression(), !490)
    #dbg_value(i32 %400, !254, !DIExpression(), !490)
  %401 = add i32 %400, %386, !dbg !475
    #dbg_value(i32 %401, !243, !DIExpression(), !486)
  br label %402

402:                                              ; preds = %399, %393
  %403 = phi i32 [ %395, %393 ], [ %401, %399 ], !dbg !480
    #dbg_value(i32 %403, !243, !DIExpression(), !486)
  %404 = getelementptr inbounds nuw i32, ptr %287, i32 %384, !dbg !481
  store i32 %403, ptr %404, align 4, !dbg !482, !tbaa !330
  %405 = add nuw i32 %384, 1, !dbg !466
    #dbg_value(i32 %405, !230, !DIExpression(), !461)
  %406 = icmp eq i32 %405, %261, !dbg !462
  br i1 %406, label %382, label %383, !dbg !463, !llvm.loop !491
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_left_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !492 {
    #dbg_value(i32 %0, !496, !DIExpression(), !512)
    #dbg_value(i32 %1, !497, !DIExpression(), !512)
    #dbg_value(i32 %2, !498, !DIExpression(), !512)
    #dbg_value(i32 %3, !499, !DIExpression(), !512)
    #dbg_value(i32 %0, !500, !DIExpression(), !512)
    #dbg_value(i32 %1, !501, !DIExpression(), !512)
    #dbg_value(i32 %2, !502, !DIExpression(), !512)
    #dbg_value(i32 %3, !503, !DIExpression(), !512)
    #dbg_value(i32 %1, !504, !DIExpression(), !512)
    #dbg_value(i32 %3, !505, !DIExpression(), !512)
  %5 = icmp eq i32 %3, 0, !dbg !513
  br i1 %5, label %10, label %6, !dbg !513

6:                                                ; preds = %4
  %7 = udiv i32 %1, %3, !dbg !515
    #dbg_value(i32 %7, !506, !DIExpression(), !512)
    #dbg_value(i32 %7, !507, !DIExpression(), !512)
    #dbg_value(i32 %0, !508, !DIExpression(), !512)
    #dbg_value(i32 %3, !509, !DIExpression(), !512)
  %8 = urem i32 %0, %3, !dbg !517
    #dbg_value(i32 %8, !510, !DIExpression(), !512)
  %9 = add i32 %8, %7
  br label %10

10:                                               ; preds = %4, %6
  %11 = phi i32 [ %9, %6 ], [ 0, %4 ], !dbg !520
    #dbg_value(i32 poison, !510, !DIExpression(), !512)
    #dbg_value(i32 %11, !511, !DIExpression(), !512)
  %12 = add i32 %11, %2, !dbg !521
  ret i32 %12, !dbg !522
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_left_signal(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !523 {
    #dbg_value(i32 %0, !525, !DIExpression(), !537)
    #dbg_value(i32 %1, !526, !DIExpression(), !537)
    #dbg_value(i32 %2, !527, !DIExpression(), !537)
    #dbg_value(i32 %3, !528, !DIExpression(), !537)
    #dbg_value(i32 %1, !529, !DIExpression(), !537)
    #dbg_value(i32 %3, !530, !DIExpression(), !537)
  %5 = icmp eq i32 %3, 0, !dbg !538
  br i1 %5, label %10, label %6, !dbg !538

6:                                                ; preds = %4
  %7 = udiv i32 %1, %3, !dbg !540
    #dbg_value(i32 %7, !531, !DIExpression(), !537)
    #dbg_value(i32 %7, !532, !DIExpression(), !537)
    #dbg_value(i32 %0, !533, !DIExpression(), !537)
    #dbg_value(i32 %3, !534, !DIExpression(), !537)
  %8 = urem i32 %0, %3, !dbg !542
    #dbg_value(i32 %8, !535, !DIExpression(), !537)
  %9 = add i32 %8, %7
  br label %10

10:                                               ; preds = %4, %6
  %11 = phi i32 [ %9, %6 ], [ 0, %4 ], !dbg !545
    #dbg_value(i32 poison, !535, !DIExpression(), !537)
    #dbg_value(i32 %11, !536, !DIExpression(), !537)
  %12 = add i32 %11, %2, !dbg !546
  ret i32 %12, !dbg !547
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_right_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !548 {
    #dbg_value(i32 %0, !550, !DIExpression(), !565)
    #dbg_value(i32 %1, !551, !DIExpression(), !565)
    #dbg_value(i32 %2, !552, !DIExpression(), !565)
    #dbg_value(i32 %3, !553, !DIExpression(), !565)
    #dbg_value(i32 %0, !554, !DIExpression(), !565)
    #dbg_value(i32 %1, !555, !DIExpression(), !565)
    #dbg_value(i32 %2, !556, !DIExpression(), !565)
    #dbg_value(i32 %3, !557, !DIExpression(), !565)
    #dbg_value(i32 %0, !558, !DIExpression(), !565)
  %5 = icmp ult i32 %0, %2, !dbg !566
  %6 = add i32 %3, %1, !dbg !567
  %7 = mul i32 %1, 3, !dbg !567
  %8 = select i1 %5, i32 %6, i32 %7, !dbg !567
    #dbg_value(i32 %8, !559, !DIExpression(), !565)
  ret i32 %8, !dbg !568
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_right_signal(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !569 {
    #dbg_value(i32 %0, !571, !DIExpression(), !582)
    #dbg_value(i32 %1, !572, !DIExpression(), !582)
    #dbg_value(i32 %2, !573, !DIExpression(), !582)
    #dbg_value(i32 %3, !574, !DIExpression(), !582)
    #dbg_value(i32 %0, !575, !DIExpression(), !582)
  %5 = icmp ult i32 %0, %2, !dbg !583
  %6 = add i32 %3, %1, !dbg !584
  %7 = mul i32 %1, 3, !dbg !584
  %8 = select i1 %5, i32 %6, i32 %7, !dbg !584
    #dbg_value(i32 %8, !576, !DIExpression(), !582)
  ret i32 %8, !dbg !585
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_pair_word(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !586 {
    #dbg_value(i32 %0, !588, !DIExpression(), !609)
    #dbg_value(i32 %1, !589, !DIExpression(), !609)
    #dbg_value(i32 %2, !590, !DIExpression(), !609)
    #dbg_value(i32 %3, !591, !DIExpression(), !609)
    #dbg_value(i32 %0, !592, !DIExpression(), !609)
    #dbg_value(i32 %1, !593, !DIExpression(), !609)
    #dbg_value(i32 %2, !594, !DIExpression(), !609)
    #dbg_value(i32 %3, !595, !DIExpression(), !609)
    #dbg_value(i32 %0, !596, !DIExpression(), !609)
  %5 = icmp ult i32 %0, %1, !dbg !610
  %6 = icmp eq i32 %3, 0, !dbg !611
  br i1 %5, label %7, label %13, !dbg !612

7:                                                ; preds = %4
    #dbg_value(i32 %0, !598, !DIExpression(), !613)
    #dbg_value(i32 %3, !601, !DIExpression(), !613)
  br i1 %6, label %10, label %8, !dbg !614

8:                                                ; preds = %7
  %9 = udiv i32 %0, %3, !dbg !616
    #dbg_value(i32 %9, !602, !DIExpression(), !613)
  br label %10

10:                                               ; preds = %7, %8
  %11 = phi i32 [ %9, %8 ], [ 0, %7 ], !dbg !618
    #dbg_value(i32 %11, !602, !DIExpression(), !613)
    #dbg_value(i32 %11, !603, !DIExpression(), !613)
  %12 = add i32 %11, %1, !dbg !619
    #dbg_value(i32 %12, !597, !DIExpression(), !609)
  br label %19, !dbg !620

13:                                               ; preds = %4
    #dbg_value(i32 %1, !604, !DIExpression(), !621)
    #dbg_value(i32 %3, !606, !DIExpression(), !621)
  br i1 %6, label %16, label %14, !dbg !622

14:                                               ; preds = %13
  %15 = urem i32 %1, %3, !dbg !624
    #dbg_value(i32 %15, !607, !DIExpression(), !621)
  br label %16

16:                                               ; preds = %13, %14
  %17 = phi i32 [ %15, %14 ], [ 0, %13 ], !dbg !626
    #dbg_value(i32 %17, !607, !DIExpression(), !621)
    #dbg_value(i32 %17, !608, !DIExpression(), !621)
  %18 = add i32 %17, %0, !dbg !627
    #dbg_value(i32 %18, !597, !DIExpression(), !609)
  br label %19

19:                                               ; preds = %16, %10
  %20 = phi i32 [ %12, %10 ], [ %18, %16 ], !dbg !611
    #dbg_value(i32 %20, !597, !DIExpression(), !609)
  ret i32 %20, !dbg !628
}

; Function Attrs: mustprogress nofree norecurse nosync nounwind willreturn memory(none) uwtable
define hidden noundef i32 @lang_fn_pair_signal(i32 noundef %0, i32 noundef %1, i32 noundef %2, i32 noundef %3) local_unnamed_addr #8 !dbg !629 {
    #dbg_value(i32 %0, !631, !DIExpression(), !648)
    #dbg_value(i32 %1, !632, !DIExpression(), !648)
    #dbg_value(i32 %2, !633, !DIExpression(), !648)
    #dbg_value(i32 %3, !634, !DIExpression(), !648)
    #dbg_value(i32 %0, !635, !DIExpression(), !648)
  %5 = icmp ult i32 %0, %1, !dbg !649
  %6 = icmp eq i32 %3, 0, !dbg !650
  br i1 %5, label %7, label %13, !dbg !651

7:                                                ; preds = %4
    #dbg_value(i32 %0, !637, !DIExpression(), !652)
    #dbg_value(i32 %3, !640, !DIExpression(), !652)
  br i1 %6, label %10, label %8, !dbg !653

8:                                                ; preds = %7
  %9 = udiv i32 %0, %3, !dbg !655
    #dbg_value(i32 %9, !641, !DIExpression(), !652)
  br label %10

10:                                               ; preds = %7, %8
  %11 = phi i32 [ %9, %8 ], [ 0, %7 ], !dbg !657
    #dbg_value(i32 %11, !641, !DIExpression(), !652)
    #dbg_value(i32 %11, !642, !DIExpression(), !652)
  %12 = add i32 %11, %1, !dbg !658
    #dbg_value(i32 %12, !636, !DIExpression(), !648)
  br label %19, !dbg !659

13:                                               ; preds = %4
    #dbg_value(i32 %1, !643, !DIExpression(), !660)
    #dbg_value(i32 %3, !645, !DIExpression(), !660)
  br i1 %6, label %16, label %14, !dbg !661

14:                                               ; preds = %13
  %15 = urem i32 %1, %3, !dbg !663
    #dbg_value(i32 %15, !646, !DIExpression(), !660)
  br label %16

16:                                               ; preds = %13, %14
  %17 = phi i32 [ %15, %14 ], [ 0, %13 ], !dbg !665
    #dbg_value(i32 %17, !646, !DIExpression(), !660)
    #dbg_value(i32 %17, !647, !DIExpression(), !660)
  %18 = add i32 %17, %0, !dbg !666
    #dbg_value(i32 %18, !636, !DIExpression(), !648)
  br label %19

19:                                               ; preds = %16, %10
  %20 = phi i32 [ %12, %10 ], [ %18, %16 ], !dbg !650
    #dbg_value(i32 %20, !636, !DIExpression(), !648)
  ret i32 %20, !dbg !667
}

; Function Attrs: nounwind uwtable
define hidden i32 @lang_fn_pipeline38_right_padded_zip_heldout_u32_into(ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %0, ptr nocapture noundef readonly byval(%struct.ink_l_uint32) align 4 %1, i32 noundef %2, i32 noundef %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #2 !dbg !668 {
    #dbg_declare(ptr %0, !672, !DIExpression(), !752)
    #dbg_declare(ptr %1, !673, !DIExpression(), !753)
    #dbg_value(i32 %2, !674, !DIExpression(), !754)
    #dbg_value(i32 %3, !675, !DIExpression(), !754)
    #dbg_value(ptr %4, !676, !DIExpression(), !754)
  %6 = ptrtoint ptr %4 to i32, !dbg !755
  %7 = load ptr, ptr %0, align 4, !dbg !755, !tbaa !259
  %8 = ptrtoint ptr %7 to i32, !dbg !755
  %9 = getelementptr inbounds nuw i8, ptr %0, i32 4, !dbg !755
  %10 = load i32, ptr %9, align 4, !dbg !755, !tbaa !27
    #dbg_value(ptr %7, !677, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !754)
    #dbg_value(i32 %10, !677, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !754)
    #dbg_value(i32 %10, !55, !DIExpression(), !756)
    #dbg_value(i32 4, !56, !DIExpression(), !756)
  %11 = icmp ugt i32 %10, 1073741823, !dbg !758
  %12 = load i32, ptr @ink_top, align 4
  %13 = icmp ugt i32 %12, -8
  %14 = select i1 %11, i1 true, i1 %13, !dbg !759
  br i1 %14, label %15, label %16, !dbg !759

15:                                               ; preds = %5
  tail call void @llvm.trap(), !dbg !760
  unreachable, !dbg !762

16:                                               ; preds = %5
  %17 = icmp eq i32 %12, 0, !dbg !763
  %18 = add nuw i32 %12, 7, !dbg !764
  %19 = select i1 %17, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %18, !dbg !765
  %20 = and i32 %19, -8, !dbg !766
    #dbg_value(i32 %20, !57, !DIExpression(), !756)
  %21 = tail call i32 @llvm.umax.i32(i32 %10, i32 1), !dbg !767
  %22 = shl nuw i32 %21, 2, !dbg !768
    #dbg_value(i32 %22, !58, !DIExpression(), !756)
  %23 = xor i32 %20, -1, !dbg !769
  %24 = icmp ugt i32 %22, %23, !dbg !770
  br i1 %24, label %25, label %26, !dbg !770

25:                                               ; preds = %16
  tail call void @llvm.trap(), !dbg !771
  unreachable, !dbg !773

26:                                               ; preds = %16
  %27 = add i32 %20, %22, !dbg !774
  store i32 %27, ptr @ink_top, align 4, !dbg !775, !tbaa !27
  %28 = add i32 %27, 65535, !dbg !776
  %29 = lshr i32 %28, 16, !dbg !777
    #dbg_value(i32 %29, !59, !DIExpression(), !756)
  %30 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !778
    #dbg_value(i32 %30, !60, !DIExpression(), !756)
  %31 = icmp ugt i32 %29, %30, !dbg !779
  br i1 %31, label %32, label %37, !dbg !780

32:                                               ; preds = %26
  %33 = sub nuw nsw i32 %29, %30, !dbg !781
  %34 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %33), !dbg !782
  %35 = icmp eq i32 %34, -1, !dbg !783
  br i1 %35, label %36, label %37, !dbg !780

36:                                               ; preds = %32
  tail call void @llvm.trap(), !dbg !784
  unreachable, !dbg !786

37:                                               ; preds = %26, %32
  %38 = inttoptr i32 %20 to ptr, !dbg !787
    #dbg_value(ptr %38, !678, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !754)
    #dbg_value(i32 %10, !678, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !754)
    #dbg_value(i32 0, !679, !DIExpression(), !788)
  %39 = icmp eq i32 %10, 0, !dbg !789
  br i1 %39, label %42, label %40, !dbg !790

40:                                               ; preds = %37
  %41 = icmp eq i32 %3, 0
  br label %110, !dbg !790

42:                                               ; preds = %118, %37
    #dbg_value(ptr %38, !699, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !754)
    #dbg_value(i32 %10, !699, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !754)
    #dbg_value(ptr %7, !700, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !754)
    #dbg_value(i32 %10, !700, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !754)
    #dbg_value(i32 %10, !55, !DIExpression(), !791)
    #dbg_value(i32 4, !56, !DIExpression(), !791)
  %43 = load i32, ptr @ink_top, align 4
  %44 = icmp ugt i32 %43, -8
  br i1 %44, label %45, label %46, !dbg !793

45:                                               ; preds = %42
  tail call void @llvm.trap(), !dbg !794
  unreachable, !dbg !796

46:                                               ; preds = %42
  %47 = icmp eq i32 %43, 0, !dbg !797
  %48 = add nuw i32 %43, 7, !dbg !798
  %49 = select i1 %47, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %48, !dbg !799
  %50 = and i32 %49, -8, !dbg !800
    #dbg_value(i32 %50, !57, !DIExpression(), !791)
    #dbg_value(i32 %22, !58, !DIExpression(), !791)
  %51 = xor i32 %50, -1, !dbg !801
  %52 = icmp ugt i32 %22, %51, !dbg !802
  br i1 %52, label %53, label %54, !dbg !802

53:                                               ; preds = %46
  tail call void @llvm.trap(), !dbg !803
  unreachable, !dbg !805

54:                                               ; preds = %46
  %55 = add i32 %50, %22, !dbg !806
  store i32 %55, ptr @ink_top, align 4, !dbg !807, !tbaa !27
  %56 = add i32 %55, 65535, !dbg !808
  %57 = lshr i32 %56, 16, !dbg !809
    #dbg_value(i32 %57, !59, !DIExpression(), !791)
  %58 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !810
    #dbg_value(i32 %58, !60, !DIExpression(), !791)
  %59 = icmp ugt i32 %57, %58, !dbg !811
  br i1 %59, label %60, label %65, !dbg !812

60:                                               ; preds = %54
  %61 = sub nuw nsw i32 %57, %58, !dbg !813
  %62 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %61), !dbg !814
  %63 = icmp eq i32 %62, -1, !dbg !815
  br i1 %63, label %64, label %65, !dbg !812

64:                                               ; preds = %60
  tail call void @llvm.trap(), !dbg !816
  unreachable, !dbg !818

65:                                               ; preds = %54, %60
  %66 = inttoptr i32 %50 to ptr, !dbg !819
    #dbg_value(ptr %66, !701, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !754)
    #dbg_value(i32 %10, !701, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !754)
    #dbg_value(i32 0, !702, !DIExpression(), !820)
  br i1 %39, label %124, label %67, !dbg !821

67:                                               ; preds = %65
  %68 = icmp ult i32 %10, 4, !dbg !821
  %69 = sub i32 %50, %8, !dbg !821
  %70 = icmp ult i32 %69, 16, !dbg !821
  %71 = select i1 %68, i1 true, i1 %70, !dbg !821
  br i1 %71, label %93, label %72, !dbg !821

72:                                               ; preds = %67
  %73 = and i32 %10, 1073741820, !dbg !821
  %74 = insertelement <4 x i32> poison, i32 %2, i64 0, !dbg !821
  %75 = shufflevector <4 x i32> %74, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !821
  %76 = insertelement <4 x i32> poison, i32 %3, i64 0, !dbg !821
  %77 = shufflevector <4 x i32> %76, <4 x i32> poison, <4 x i32> zeroinitializer, !dbg !821
  br label %78, !dbg !821

78:                                               ; preds = %78, %72
  %79 = phi i32 [ 0, %72 ], [ %88, %78 ], !dbg !822
  %80 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %72 ], [ %89, %78 ]
  %81 = getelementptr inbounds nuw i32, ptr %7, i32 %79, !dbg !823
  %82 = load <4 x i32>, ptr %81, align 4, !dbg !823, !tbaa !330
  %83 = icmp ult <4 x i32> %80, %75, !dbg !824
  %84 = add <4 x i32> %82, %77, !dbg !825
  %85 = mul <4 x i32> %82, splat (i32 3), !dbg !825
  %86 = select <4 x i1> %83, <4 x i32> %84, <4 x i32> %85, !dbg !825
  %87 = getelementptr inbounds nuw i32, ptr %66, i32 %79, !dbg !826
  store <4 x i32> %86, ptr %87, align 8, !dbg !827, !tbaa !330
  %88 = add nuw i32 %79, 4, !dbg !822
  %89 = add <4 x i32> %80, splat (i32 4)
  %90 = icmp eq i32 %88, %73, !dbg !822
  br i1 %90, label %91, label %78, !dbg !822, !llvm.loop !828

91:                                               ; preds = %78
  %92 = icmp eq i32 %10, %73, !dbg !821
  br i1 %92, label %124, label %93, !dbg !821

93:                                               ; preds = %67, %91
  %94 = phi i32 [ 0, %67 ], [ %73, %91 ]
  %95 = or disjoint i32 %94, 1, !dbg !821
  %96 = and i32 %10, 1, !dbg !821
  %97 = icmp eq i32 %96, 0, !dbg !821
  br i1 %97, label %107, label %98, !dbg !821

98:                                               ; preds = %93
    #dbg_value(i32 poison, !702, !DIExpression(), !820)
    #dbg_value(i32 poison, !704, !DIExpression(), !830)
  %99 = getelementptr inbounds nuw i32, ptr %7, i32 %94, !dbg !823
  %100 = load i32, ptr %99, align 4, !dbg !823, !tbaa !330
    #dbg_value(i32 %100, !707, !DIExpression(), !830)
    #dbg_value(i32 %2, !708, !DIExpression(), !830)
    #dbg_value(i32 %3, !709, !DIExpression(), !830)
    #dbg_value(i32 poison, !710, !DIExpression(), !830)
    #dbg_value(i32 %100, !711, !DIExpression(), !830)
    #dbg_value(i32 %2, !712, !DIExpression(), !830)
    #dbg_value(i32 %3, !713, !DIExpression(), !830)
    #dbg_value(i32 poison, !714, !DIExpression(), !830)
  %101 = icmp ult i32 %94, %2, !dbg !824
  %102 = add i32 %100, %3, !dbg !825
  %103 = mul i32 %100, 3, !dbg !825
  %104 = select i1 %101, i32 %102, i32 %103, !dbg !825
    #dbg_value(i32 %104, !715, !DIExpression(), !830)
  %105 = getelementptr inbounds nuw i32, ptr %66, i32 %94, !dbg !826
  store i32 %104, ptr %105, align 8, !dbg !827, !tbaa !330
  %106 = or disjoint i32 %94, 1, !dbg !822
    #dbg_value(i32 %106, !702, !DIExpression(), !820)
  br label %107, !dbg !821

107:                                              ; preds = %98, %93
  %108 = phi i32 [ %94, %93 ], [ %106, %98 ]
  %109 = icmp eq i32 %10, %95, !dbg !821
  br i1 %109, label %124, label %131, !dbg !821

110:                                              ; preds = %40, %118
  %111 = phi i32 [ 0, %40 ], [ %122, %118 ]
    #dbg_value(i32 %111, !679, !DIExpression(), !788)
    #dbg_value(i32 %111, !681, !DIExpression(), !831)
    #dbg_value(i32 poison, !684, !DIExpression(), !831)
    #dbg_value(i32 %2, !685, !DIExpression(), !831)
    #dbg_value(i32 %3, !686, !DIExpression(), !831)
    #dbg_value(i32 %111, !687, !DIExpression(), !831)
    #dbg_value(i32 poison, !688, !DIExpression(), !831)
    #dbg_value(i32 %2, !689, !DIExpression(), !831)
    #dbg_value(i32 %3, !690, !DIExpression(), !831)
    #dbg_value(i32 poison, !691, !DIExpression(), !831)
    #dbg_value(i32 %3, !692, !DIExpression(), !831)
  br i1 %41, label %118, label %112, !dbg !832

112:                                              ; preds = %110
  %113 = getelementptr inbounds nuw i32, ptr %7, i32 %111, !dbg !834
  %114 = load i32, ptr %113, align 4, !dbg !834, !tbaa !330
    #dbg_value(i32 %114, !684, !DIExpression(), !831)
    #dbg_value(i32 %114, !688, !DIExpression(), !831)
    #dbg_value(i32 %114, !691, !DIExpression(), !831)
  %115 = udiv i32 %114, %3, !dbg !835
    #dbg_value(i32 %115, !693, !DIExpression(), !831)
    #dbg_value(i32 %115, !694, !DIExpression(), !831)
    #dbg_value(i32 %111, !695, !DIExpression(), !831)
    #dbg_value(i32 %3, !696, !DIExpression(), !831)
  %116 = urem i32 %111, %3, !dbg !837
    #dbg_value(i32 %116, !697, !DIExpression(), !831)
  %117 = add i32 %116, %115
  br label %118

118:                                              ; preds = %110, %112
  %119 = phi i32 [ %117, %112 ], [ 0, %110 ], !dbg !840
    #dbg_value(i32 poison, !697, !DIExpression(), !831)
    #dbg_value(i32 %119, !698, !DIExpression(), !831)
  %120 = add i32 %119, %2, !dbg !841
  %121 = getelementptr inbounds nuw i32, ptr %38, i32 %111, !dbg !842
  store i32 %120, ptr %121, align 4, !dbg !843, !tbaa !330
  %122 = add nuw i32 %111, 1, !dbg !844
    #dbg_value(i32 %122, !679, !DIExpression(), !788)
  %123 = icmp eq i32 %122, %10, !dbg !789
  br i1 %123, label %42, label %110, !dbg !790, !llvm.loop !845

124:                                              ; preds = %107, %131, %91, %65
    #dbg_value(ptr %66, !721, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !754)
    #dbg_value(i32 %10, !721, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !754)
  %125 = load ptr, ptr %1, align 4, !dbg !847, !tbaa !259
  %126 = ptrtoint ptr %125 to i32, !dbg !847
  %127 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !847
  %128 = load i32, ptr %127, align 4, !dbg !847, !tbaa !27
    #dbg_value(ptr %125, !722, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !754)
    #dbg_value(i32 %128, !722, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !754)
  %129 = xor i32 %128, -1, !dbg !848
  %130 = icmp ugt i32 %10, %129, !dbg !850
  br i1 %130, label %150, label %151, !dbg !850

131:                                              ; preds = %107, %131
  %132 = phi i32 [ %148, %131 ], [ %108, %107 ]
    #dbg_value(i32 %132, !702, !DIExpression(), !820)
    #dbg_value(i32 %132, !704, !DIExpression(), !830)
  %133 = getelementptr inbounds nuw i32, ptr %7, i32 %132, !dbg !823
  %134 = load i32, ptr %133, align 4, !dbg !823, !tbaa !330
    #dbg_value(i32 %134, !707, !DIExpression(), !830)
    #dbg_value(i32 %2, !708, !DIExpression(), !830)
    #dbg_value(i32 %3, !709, !DIExpression(), !830)
    #dbg_value(i32 %132, !710, !DIExpression(), !830)
    #dbg_value(i32 %134, !711, !DIExpression(), !830)
    #dbg_value(i32 %2, !712, !DIExpression(), !830)
    #dbg_value(i32 %3, !713, !DIExpression(), !830)
    #dbg_value(i32 %132, !714, !DIExpression(), !830)
  %135 = icmp ult i32 %132, %2, !dbg !824
  %136 = add i32 %134, %3, !dbg !825
  %137 = mul i32 %134, 3, !dbg !825
  %138 = select i1 %135, i32 %136, i32 %137, !dbg !825
    #dbg_value(i32 %138, !715, !DIExpression(), !830)
  %139 = getelementptr inbounds nuw i32, ptr %66, i32 %132, !dbg !826
  store i32 %138, ptr %139, align 4, !dbg !827, !tbaa !330
  %140 = add nuw i32 %132, 1, !dbg !822
    #dbg_value(i32 %140, !702, !DIExpression(), !820)
    #dbg_value(i32 %140, !704, !DIExpression(), !830)
  %141 = getelementptr inbounds nuw i32, ptr %7, i32 %140, !dbg !823
  %142 = load i32, ptr %141, align 4, !dbg !823, !tbaa !330
    #dbg_value(i32 %142, !707, !DIExpression(), !830)
    #dbg_value(i32 %140, !710, !DIExpression(), !830)
    #dbg_value(i32 %142, !711, !DIExpression(), !830)
    #dbg_value(i32 %140, !714, !DIExpression(), !830)
  %143 = icmp ult i32 %140, %2, !dbg !824
  %144 = add i32 %142, %3, !dbg !825
  %145 = mul i32 %142, 3, !dbg !825
  %146 = select i1 %143, i32 %144, i32 %145, !dbg !825
    #dbg_value(i32 %146, !715, !DIExpression(), !830)
  %147 = getelementptr inbounds nuw i32, ptr %66, i32 %140, !dbg !826
  store i32 %146, ptr %147, align 4, !dbg !827, !tbaa !330
  %148 = add nuw i32 %132, 2, !dbg !822
    #dbg_value(i32 %148, !702, !DIExpression(), !820)
  %149 = icmp eq i32 %148, %10, !dbg !851
  br i1 %149, label %124, label %131, !dbg !821, !llvm.loop !852

150:                                              ; preds = %124
  tail call void @llvm.trap(), !dbg !853
  unreachable, !dbg !855

151:                                              ; preds = %124
  %152 = add i32 %128, %10, !dbg !856
    #dbg_value(i32 %152, !723, !DIExpression(), !754)
    #dbg_value(i32 %152, !55, !DIExpression(), !857)
    #dbg_value(i32 4, !56, !DIExpression(), !857)
  %153 = icmp ugt i32 %152, 1073741823, !dbg !859
  %154 = load i32, ptr @ink_top, align 4
  %155 = icmp ugt i32 %154, -8
  %156 = select i1 %153, i1 true, i1 %155, !dbg !860
  br i1 %156, label %157, label %158, !dbg !860

157:                                              ; preds = %151
  tail call void @llvm.trap(), !dbg !861
  unreachable, !dbg !863

158:                                              ; preds = %151
  %159 = icmp eq i32 %154, 0, !dbg !864
  %160 = add nuw i32 %154, 7, !dbg !865
  %161 = select i1 %159, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %160, !dbg !866
  %162 = and i32 %161, -8, !dbg !867
    #dbg_value(i32 %161, !57, !DIExpression(DW_OP_constu, 18446744073709551608, DW_OP_and, DW_OP_stack_value), !857)
  %163 = tail call i32 @llvm.umax.i32(i32 %152, i32 1), !dbg !868
  %164 = shl nuw i32 %163, 2, !dbg !869
    #dbg_value(i32 %164, !58, !DIExpression(), !857)
  %165 = xor i32 %162, -1, !dbg !870
  %166 = icmp ugt i32 %164, %165, !dbg !871
  br i1 %166, label %167, label %168, !dbg !871

167:                                              ; preds = %158
  tail call void @llvm.trap(), !dbg !872
  unreachable, !dbg !874

168:                                              ; preds = %158
  %169 = add i32 %162, %164, !dbg !875
  store i32 %169, ptr @ink_top, align 4, !dbg !876, !tbaa !27
  %170 = add i32 %169, 65535, !dbg !877
  %171 = lshr i32 %170, 16, !dbg !878
    #dbg_value(i32 %171, !59, !DIExpression(), !857)
  %172 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !879
    #dbg_value(i32 %172, !60, !DIExpression(), !857)
  %173 = icmp ugt i32 %171, %172, !dbg !880
  br i1 %173, label %174, label %179, !dbg !881

174:                                              ; preds = %168
  %175 = sub nuw nsw i32 %171, %172, !dbg !882
  %176 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %175), !dbg !883
  %177 = icmp eq i32 %176, -1, !dbg !884
  br i1 %177, label %178, label %179, !dbg !881

178:                                              ; preds = %174
  tail call void @llvm.trap(), !dbg !885
  unreachable, !dbg !887

179:                                              ; preds = %168, %174
  %180 = inttoptr i32 %162 to ptr, !dbg !888
    #dbg_value(ptr %180, !724, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !754)
    #dbg_value(i32 %152, !724, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !754)
  %181 = shl nuw i32 %10, 2, !dbg !889
    #dbg_value(ptr %180, !110, !DIExpression(), !890)
    #dbg_value(ptr %66, !115, !DIExpression(), !890)
    #dbg_value(i32 %181, !116, !DIExpression(), !890)
    #dbg_value(ptr %180, !117, !DIExpression(), !890)
    #dbg_value(ptr %66, !119, !DIExpression(), !890)
    #dbg_value(i32 0, !122, !DIExpression(), !892)
  br i1 %39, label %219, label %182, !dbg !893

182:                                              ; preds = %179
  %183 = icmp ult i32 %10, 4, !dbg !893
  %184 = sub i32 %161, %50, !dbg !893
  %185 = icmp ult i32 %184, 16, !dbg !893
  %186 = or i1 %183, %185, !dbg !893
  br i1 %186, label %198, label %187, !dbg !893

187:                                              ; preds = %182
  %188 = and i32 %181, -16, !dbg !893
  br label %189, !dbg !893

189:                                              ; preds = %189, %187
  %190 = phi i32 [ 0, %187 ], [ %194, %189 ], !dbg !894
  %191 = getelementptr inbounds nuw i8, ptr %66, i32 %190, !dbg !895
  %192 = load <16 x i8>, ptr %191, align 8, !dbg !895, !tbaa !132
  %193 = getelementptr inbounds nuw i8, ptr %180, i32 %190, !dbg !896
  store <16 x i8> %192, ptr %193, align 8, !dbg !897, !tbaa !132
  %194 = add nuw i32 %190, 16, !dbg !894
  %195 = icmp eq i32 %194, %188, !dbg !894
  br i1 %195, label %196, label %189, !dbg !894, !llvm.loop !898

196:                                              ; preds = %189
  %197 = icmp eq i32 %181, %188, !dbg !893
  br i1 %197, label %219, label %198, !dbg !893

198:                                              ; preds = %182, %196
  %199 = phi i32 [ 0, %182 ], [ %188, %196 ]
  br label %200, !dbg !893

200:                                              ; preds = %200, %198
  %201 = phi i32 [ %199, %198 ], [ %217, %200 ]
    #dbg_value(i32 %201, !122, !DIExpression(), !892)
  %202 = getelementptr inbounds nuw i8, ptr %66, i32 %201, !dbg !895
  %203 = load i8, ptr %202, align 4, !dbg !895, !tbaa !132
  %204 = getelementptr inbounds nuw i8, ptr %180, i32 %201, !dbg !896
  store i8 %203, ptr %204, align 4, !dbg !897, !tbaa !132
  %205 = or disjoint i32 %201, 1, !dbg !894
    #dbg_value(i32 %205, !122, !DIExpression(), !892)
  %206 = getelementptr inbounds nuw i8, ptr %66, i32 %205, !dbg !895
  %207 = load i8, ptr %206, align 1, !dbg !895, !tbaa !132
  %208 = getelementptr inbounds nuw i8, ptr %180, i32 %205, !dbg !896
  store i8 %207, ptr %208, align 1, !dbg !897, !tbaa !132
  %209 = or disjoint i32 %201, 2, !dbg !894
    #dbg_value(i32 %209, !122, !DIExpression(), !892)
  %210 = getelementptr inbounds nuw i8, ptr %66, i32 %209, !dbg !895
  %211 = load i8, ptr %210, align 2, !dbg !895, !tbaa !132
  %212 = getelementptr inbounds nuw i8, ptr %180, i32 %209, !dbg !896
  store i8 %211, ptr %212, align 2, !dbg !897, !tbaa !132
  %213 = or disjoint i32 %201, 3, !dbg !894
    #dbg_value(i32 %213, !122, !DIExpression(), !892)
  %214 = getelementptr inbounds nuw i8, ptr %66, i32 %213, !dbg !895
  %215 = load i8, ptr %214, align 1, !dbg !895, !tbaa !132
  %216 = getelementptr inbounds nuw i8, ptr %180, i32 %213, !dbg !896
  store i8 %215, ptr %216, align 1, !dbg !897, !tbaa !132
  %217 = add nuw i32 %201, 4, !dbg !894
    #dbg_value(i32 %217, !122, !DIExpression(), !892)
  %218 = icmp eq i32 %217, %181, !dbg !900
  br i1 %218, label %219, label %200, !dbg !893, !llvm.loop !901

219:                                              ; preds = %200, %196, %179
  %220 = getelementptr inbounds nuw i32, ptr %180, i32 %10, !dbg !902
  %221 = shl i32 %128, 2, !dbg !903
    #dbg_value(ptr %220, !110, !DIExpression(), !904)
    #dbg_value(ptr %125, !115, !DIExpression(), !904)
    #dbg_value(i32 %221, !116, !DIExpression(), !904)
    #dbg_value(ptr %220, !117, !DIExpression(), !904)
    #dbg_value(ptr %125, !119, !DIExpression(), !904)
    #dbg_value(i32 0, !122, !DIExpression(), !906)
  %222 = icmp eq i32 %221, 0, !dbg !907
  br i1 %222, label %261, label %223, !dbg !908

223:                                              ; preds = %219
  %224 = icmp ult i32 %221, 16, !dbg !908
  br i1 %224, label %240, label %225, !dbg !908

225:                                              ; preds = %223
  %226 = add i32 %162, %181, !dbg !908
  %227 = sub i32 %226, %126, !dbg !908
  %228 = icmp ult i32 %227, 16, !dbg !908
  br i1 %228, label %240, label %229, !dbg !908

229:                                              ; preds = %225
  %230 = and i32 %221, -16, !dbg !908
  br label %231, !dbg !908

231:                                              ; preds = %231, %229
  %232 = phi i32 [ 0, %229 ], [ %236, %231 ], !dbg !909
  %233 = getelementptr inbounds nuw i8, ptr %125, i32 %232, !dbg !910
  %234 = load <16 x i8>, ptr %233, align 1, !dbg !910, !tbaa !132
  %235 = getelementptr inbounds nuw i8, ptr %220, i32 %232, !dbg !911
  store <16 x i8> %234, ptr %235, align 4, !dbg !912, !tbaa !132
  %236 = add nuw i32 %232, 16, !dbg !909
  %237 = icmp eq i32 %236, %230, !dbg !909
  br i1 %237, label %238, label %231, !dbg !909, !llvm.loop !913

238:                                              ; preds = %231
  %239 = icmp eq i32 %221, %230, !dbg !908
  br i1 %239, label %261, label %240, !dbg !908

240:                                              ; preds = %225, %223, %238
  %241 = phi i32 [ 0, %223 ], [ 0, %225 ], [ %230, %238 ]
  br label %242, !dbg !908

242:                                              ; preds = %242, %240
  %243 = phi i32 [ %241, %240 ], [ %259, %242 ]
    #dbg_value(i32 %243, !122, !DIExpression(), !906)
  %244 = getelementptr inbounds nuw i8, ptr %125, i32 %243, !dbg !910
  %245 = load i8, ptr %244, align 1, !dbg !910, !tbaa !132
  %246 = getelementptr inbounds nuw i8, ptr %220, i32 %243, !dbg !911
  store i8 %245, ptr %246, align 4, !dbg !912, !tbaa !132
  %247 = or disjoint i32 %243, 1, !dbg !909
    #dbg_value(i32 %247, !122, !DIExpression(), !906)
  %248 = getelementptr inbounds nuw i8, ptr %125, i32 %247, !dbg !910
  %249 = load i8, ptr %248, align 1, !dbg !910, !tbaa !132
  %250 = getelementptr inbounds nuw i8, ptr %220, i32 %247, !dbg !911
  store i8 %249, ptr %250, align 1, !dbg !912, !tbaa !132
  %251 = or disjoint i32 %243, 2, !dbg !909
    #dbg_value(i32 %251, !122, !DIExpression(), !906)
  %252 = getelementptr inbounds nuw i8, ptr %125, i32 %251, !dbg !910
  %253 = load i8, ptr %252, align 1, !dbg !910, !tbaa !132
  %254 = getelementptr inbounds nuw i8, ptr %220, i32 %251, !dbg !911
  store i8 %253, ptr %254, align 2, !dbg !912, !tbaa !132
  %255 = or disjoint i32 %243, 3, !dbg !909
    #dbg_value(i32 %255, !122, !DIExpression(), !906)
  %256 = getelementptr inbounds nuw i8, ptr %125, i32 %255, !dbg !910
  %257 = load i8, ptr %256, align 1, !dbg !910, !tbaa !132
  %258 = getelementptr inbounds nuw i8, ptr %220, i32 %255, !dbg !911
  store i8 %257, ptr %258, align 1, !dbg !912, !tbaa !132
  %259 = add nuw i32 %243, 4, !dbg !909
    #dbg_value(i32 %259, !122, !DIExpression(), !906)
  %260 = icmp eq i32 %259, %221, !dbg !907
  br i1 %260, label %261, label %242, !dbg !908, !llvm.loop !915

261:                                              ; preds = %242, %238, %219
    #dbg_value(ptr %180, !725, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !754)
    #dbg_value(i32 %152, !725, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !754)
    #dbg_value(ptr %4, !726, !DIExpression(DW_OP_LLVM_fragment, 0, 32), !754)
  %262 = tail call i32 @llvm.umin.i32(i32 %10, i32 %152), !dbg !916
    #dbg_value(i32 %262, !726, !DIExpression(DW_OP_LLVM_fragment, 32, 32), !754)
    #dbg_value(i32 0, !727, !DIExpression(), !917)
  %263 = icmp eq i32 %262, 0, !dbg !918
  br i1 %263, label %356, label %264, !dbg !919

264:                                              ; preds = %261
  %265 = icmp eq i32 %3, 0
  %266 = icmp ult i32 %262, 4, !dbg !919
  br i1 %266, label %354, label %267, !dbg !919

267:                                              ; preds = %264
  %268 = sub i32 %6, %20, !dbg !919
  %269 = icmp ult i32 %268, 16, !dbg !919
  %270 = sub i32 %6, %162, !dbg !919
  %271 = icmp ult i32 %270, 16, !dbg !919
  %272 = or i1 %269, %271, !dbg !919
  br i1 %272, label %354, label %273, !dbg !919

273:                                              ; preds = %267
  %274 = and i32 %262, 1073741820, !dbg !919
  %275 = insertelement <4 x i1> poison, i1 %265, i64 0, !dbg !919
  %276 = shufflevector <4 x i1> %275, <4 x i1> poison, <4 x i32> zeroinitializer, !dbg !919
  %277 = xor <4 x i1> %276, splat (i1 true), !dbg !920
  br label %278, !dbg !919

278:                                              ; preds = %344, %273
  %279 = phi i32 [ 0, %273 ], [ %350, %344 ], !dbg !922
  %280 = getelementptr inbounds nuw i32, ptr %38, i32 %279, !dbg !923
  %281 = load <4 x i32>, ptr %280, align 8, !dbg !923, !tbaa !330
  %282 = getelementptr inbounds nuw i32, ptr %180, i32 %279, !dbg !924
  %283 = load <4 x i32>, ptr %282, align 8, !dbg !924, !tbaa !330
  %284 = icmp ult <4 x i32> %281, %283, !dbg !925
  %285 = select <4 x i1> %284, <4 x i1> splat (i1 true), <4 x i1> %276, !dbg !926
  %286 = xor <4 x i1> %285, splat (i1 true), !dbg !926
  %287 = extractelement <4 x i1> %286, i64 0, !dbg !926
  br i1 %287, label %288, label %292, !dbg !920

288:                                              ; preds = %278
  %289 = extractelement <4 x i32> %283, i64 0, !dbg !928
  %290 = urem i32 %289, %3, !dbg !928
  %291 = insertelement <4 x i32> poison, i32 %290, i64 0, !dbg !928
  br label %292, !dbg !926

292:                                              ; preds = %288, %278
  %293 = phi <4 x i32> [ poison, %278 ], [ %291, %288 ], !dbg !928
  %294 = extractelement <4 x i1> %286, i64 1, !dbg !928
  br i1 %294, label %295, label %299, !dbg !928

295:                                              ; preds = %292
  %296 = extractelement <4 x i32> %283, i64 1, !dbg !928
  %297 = urem i32 %296, %3, !dbg !928
  %298 = insertelement <4 x i32> %293, i32 %297, i64 1, !dbg !928
  br label %299, !dbg !928

299:                                              ; preds = %295, %292
  %300 = phi <4 x i32> [ %293, %292 ], [ %298, %295 ], !dbg !928
  %301 = extractelement <4 x i1> %286, i64 2, !dbg !928
  br i1 %301, label %302, label %306, !dbg !928

302:                                              ; preds = %299
  %303 = extractelement <4 x i32> %283, i64 2, !dbg !928
  %304 = urem i32 %303, %3, !dbg !928
  %305 = insertelement <4 x i32> %300, i32 %304, i64 2, !dbg !928
  br label %306, !dbg !928

306:                                              ; preds = %302, %299
  %307 = phi <4 x i32> [ %300, %299 ], [ %305, %302 ], !dbg !928
  %308 = extractelement <4 x i1> %286, i64 3, !dbg !928
  br i1 %308, label %309, label %313, !dbg !928

309:                                              ; preds = %306
  %310 = extractelement <4 x i32> %283, i64 3, !dbg !928
  %311 = urem i32 %310, %3, !dbg !928
  %312 = insertelement <4 x i32> %307, i32 %311, i64 3, !dbg !928
  br label %313, !dbg !928

313:                                              ; preds = %309, %306
  %314 = phi <4 x i32> [ %307, %306 ], [ %312, %309 ], !dbg !928
  %315 = select <4 x i1> %285, <4 x i32> zeroinitializer, <4 x i32> %314, !dbg !930
  %316 = add <4 x i32> %315, %281, !dbg !931
  %317 = select <4 x i1> %284, <4 x i1> %277, <4 x i1> zeroinitializer, !dbg !920
  %318 = extractelement <4 x i1> %317, i64 0, !dbg !920
  br i1 %318, label %319, label %323, !dbg !928

319:                                              ; preds = %313
  %320 = extractelement <4 x i32> %281, i64 0, !dbg !932
  %321 = udiv i32 %320, %3, !dbg !932
  %322 = insertelement <4 x i32> poison, i32 %321, i64 0, !dbg !932
  br label %323, !dbg !920

323:                                              ; preds = %319, %313
  %324 = phi <4 x i32> [ poison, %313 ], [ %322, %319 ], !dbg !932
  %325 = extractelement <4 x i1> %317, i64 1, !dbg !932
  br i1 %325, label %326, label %330, !dbg !932

326:                                              ; preds = %323
  %327 = extractelement <4 x i32> %281, i64 1, !dbg !932
  %328 = udiv i32 %327, %3, !dbg !932
  %329 = insertelement <4 x i32> %324, i32 %328, i64 1, !dbg !932
  br label %330, !dbg !932

330:                                              ; preds = %326, %323
  %331 = phi <4 x i32> [ %324, %323 ], [ %329, %326 ], !dbg !932
  %332 = extractelement <4 x i1> %317, i64 2, !dbg !932
  br i1 %332, label %333, label %337, !dbg !932

333:                                              ; preds = %330
  %334 = extractelement <4 x i32> %281, i64 2, !dbg !932
  %335 = udiv i32 %334, %3, !dbg !932
  %336 = insertelement <4 x i32> %331, i32 %335, i64 2, !dbg !932
  br label %337, !dbg !932

337:                                              ; preds = %333, %330
  %338 = phi <4 x i32> [ %331, %330 ], [ %336, %333 ], !dbg !932
  %339 = extractelement <4 x i1> %317, i64 3, !dbg !932
  br i1 %339, label %340, label %344, !dbg !932

340:                                              ; preds = %337
  %341 = extractelement <4 x i32> %281, i64 3, !dbg !932
  %342 = udiv i32 %341, %3, !dbg !932
  %343 = insertelement <4 x i32> %338, i32 %342, i64 3, !dbg !932
  br label %344, !dbg !932

344:                                              ; preds = %340, %337
  %345 = phi <4 x i32> [ %338, %337 ], [ %343, %340 ], !dbg !932
  %346 = select <4 x i1> %317, <4 x i32> %345, <4 x i32> zeroinitializer, !dbg !934
  %347 = add <4 x i32> %346, %283, !dbg !935
  %348 = select <4 x i1> %284, <4 x i32> %347, <4 x i32> %316, !dbg !936
  %349 = getelementptr inbounds nuw i32, ptr %4, i32 %279, !dbg !937
  store <4 x i32> %348, ptr %349, align 4, !dbg !938, !tbaa !330
  %350 = add nuw i32 %279, 4, !dbg !922
  %351 = icmp eq i32 %350, %274, !dbg !922
  br i1 %351, label %352, label %278, !dbg !922, !llvm.loop !939

352:                                              ; preds = %344
  %353 = icmp eq i32 %262, %274, !dbg !919
  br i1 %353, label %356, label %354, !dbg !919

354:                                              ; preds = %267, %264, %352
  %355 = phi i32 [ 0, %264 ], [ 0, %267 ], [ %274, %352 ]
  br label %357, !dbg !919

356:                                              ; preds = %376, %352, %261
  ret i32 %262, !dbg !941

357:                                              ; preds = %354, %376
  %358 = phi i32 [ %379, %376 ], [ %355, %354 ]
    #dbg_value(i32 %358, !727, !DIExpression(), !917)
  %359 = getelementptr inbounds nuw i32, ptr %38, i32 %358, !dbg !923
  %360 = load i32, ptr %359, align 4, !dbg !923, !tbaa !330
    #dbg_value(i32 %360, !729, !DIExpression(), !942)
  %361 = getelementptr inbounds nuw i32, ptr %180, i32 %358, !dbg !924
  %362 = load i32, ptr %361, align 4, !dbg !924, !tbaa !330
    #dbg_value(i32 %362, !732, !DIExpression(), !942)
    #dbg_value(i32 %2, !733, !DIExpression(), !942)
    #dbg_value(i32 %3, !734, !DIExpression(), !942)
    #dbg_value(i32 %360, !735, !DIExpression(), !942)
    #dbg_value(i32 %362, !736, !DIExpression(), !942)
    #dbg_value(i32 %2, !737, !DIExpression(), !942)
    #dbg_value(i32 %3, !738, !DIExpression(), !942)
    #dbg_value(i32 %360, !739, !DIExpression(), !942)
  %363 = icmp ult i32 %360, %362, !dbg !925
  br i1 %363, label %364, label %370, !dbg !943

364:                                              ; preds = %357
    #dbg_value(i32 %360, !741, !DIExpression(), !944)
    #dbg_value(i32 %3, !744, !DIExpression(), !944)
  br i1 %265, label %367, label %365, !dbg !920

365:                                              ; preds = %364
  %366 = udiv i32 %360, %3, !dbg !932
    #dbg_value(i32 %366, !745, !DIExpression(), !944)
  br label %367

367:                                              ; preds = %364, %365
  %368 = phi i32 [ %366, %365 ], [ 0, %364 ], !dbg !934
    #dbg_value(i32 %368, !745, !DIExpression(), !944)
    #dbg_value(i32 %368, !746, !DIExpression(), !944)
  %369 = add i32 %368, %362, !dbg !935
    #dbg_value(i32 %369, !740, !DIExpression(), !942)
  br label %376, !dbg !945

370:                                              ; preds = %357
    #dbg_value(i32 %362, !747, !DIExpression(), !946)
    #dbg_value(i32 %3, !749, !DIExpression(), !946)
  br i1 %265, label %373, label %371, !dbg !926

371:                                              ; preds = %370
  %372 = urem i32 %362, %3, !dbg !928
    #dbg_value(i32 %372, !750, !DIExpression(), !946)
  br label %373

373:                                              ; preds = %370, %371
  %374 = phi i32 [ %372, %371 ], [ 0, %370 ], !dbg !930
    #dbg_value(i32 %374, !750, !DIExpression(), !946)
    #dbg_value(i32 %374, !751, !DIExpression(), !946)
  %375 = add i32 %374, %360, !dbg !931
    #dbg_value(i32 %375, !740, !DIExpression(), !942)
  br label %376

376:                                              ; preds = %373, %367
  %377 = phi i32 [ %369, %367 ], [ %375, %373 ], !dbg !936
    #dbg_value(i32 %377, !740, !DIExpression(), !942)
  %378 = getelementptr inbounds nuw i32, ptr %4, i32 %358, !dbg !937
  store i32 %377, ptr %378, align 4, !dbg !938, !tbaa !330
  %379 = add nuw i32 %358, 1, !dbg !922
    #dbg_value(i32 %379, !727, !DIExpression(), !917)
  %380 = icmp eq i32 %379, %262, !dbg !918
  br i1 %380, label %356, label %357, !dbg !919, !llvm.loop !947
}

; Function Attrs: nounwind uwtable
define hidden i32 @ink_compute_into(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readonly %2, ptr nocapture noundef writeonly %3) local_unnamed_addr #2 !dbg !948 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !966)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !966)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !966)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !966)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !966)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !966)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !966)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !966)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !968)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !968)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !968)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !968)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !968)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !968)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !968)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !968)
  %5 = alloca %struct.ink_l_uint32, align 4
  %6 = alloca %struct.ink_l_uint32, align 4
    #dbg_value(i32 %0, !956, !DIExpression(), !970)
    #dbg_value(ptr %1, !957, !DIExpression(), !970)
    #dbg_value(ptr %2, !958, !DIExpression(), !970)
    #dbg_value(ptr %3, !959, !DIExpression(), !970)
  %7 = icmp eq i32 %0, 0, !dbg !971
  br i1 %7, label %8, label %56, !dbg !971

8:                                                ; preds = %4
  %9 = load ptr, ptr %1, align 4, !dbg !972, !tbaa !973
    #dbg_value(ptr %9, !960, !DIExpression(), !974)
  %10 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !975
  %11 = load ptr, ptr %10, align 4, !dbg !975, !tbaa !973
    #dbg_value(ptr %11, !963, !DIExpression(), !974)
  %12 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !976
  %13 = load ptr, ptr %12, align 4, !dbg !976, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !966)
    #dbg_value(ptr %13, !115, !DIExpression(), !966)
    #dbg_value(i32 4, !116, !DIExpression(), !966)
    #dbg_value(ptr undef, !117, !DIExpression(), !966)
    #dbg_value(ptr %13, !119, !DIExpression(), !966)
    #dbg_value(i32 0, !122, !DIExpression(), !977)
  %14 = load i8, ptr %13, align 1, !dbg !978, !tbaa !132
    #dbg_value(i8 %14, !964, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !974)
    #dbg_value(i32 1, !122, !DIExpression(), !977)
  %15 = getelementptr inbounds nuw i8, ptr %13, i32 1, !dbg !978
  %16 = load i8, ptr %15, align 1, !dbg !978, !tbaa !132
    #dbg_value(i8 %16, !964, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !974)
    #dbg_value(i32 2, !122, !DIExpression(), !977)
  %17 = getelementptr inbounds nuw i8, ptr %13, i32 2, !dbg !978
  %18 = load i8, ptr %17, align 1, !dbg !978, !tbaa !132
    #dbg_value(i8 %18, !964, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !974)
    #dbg_value(i32 3, !122, !DIExpression(), !977)
  %19 = getelementptr inbounds nuw i8, ptr %13, i32 3, !dbg !978
  %20 = load i8, ptr %19, align 1, !dbg !978, !tbaa !132
    #dbg_value(i8 %20, !964, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !974)
    #dbg_value(i32 4, !122, !DIExpression(), !977)
  %21 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !979
  %22 = load ptr, ptr %21, align 4, !dbg !979, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !968)
    #dbg_value(ptr %22, !115, !DIExpression(), !968)
    #dbg_value(i32 4, !116, !DIExpression(), !968)
    #dbg_value(ptr undef, !117, !DIExpression(), !968)
    #dbg_value(ptr %22, !119, !DIExpression(), !968)
    #dbg_value(i32 0, !122, !DIExpression(), !980)
  %23 = load i8, ptr %22, align 1, !dbg !981, !tbaa !132
    #dbg_value(i8 %23, !965, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !974)
    #dbg_value(i32 1, !122, !DIExpression(), !980)
  %24 = getelementptr inbounds nuw i8, ptr %22, i32 1, !dbg !981
  %25 = load i8, ptr %24, align 1, !dbg !981, !tbaa !132
    #dbg_value(i8 %25, !965, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !974)
    #dbg_value(i32 2, !122, !DIExpression(), !980)
  %26 = getelementptr inbounds nuw i8, ptr %22, i32 2, !dbg !981
  %27 = load i8, ptr %26, align 1, !dbg !981, !tbaa !132
    #dbg_value(i8 %27, !965, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !974)
    #dbg_value(i32 3, !122, !DIExpression(), !980)
  %28 = getelementptr inbounds nuw i8, ptr %22, i32 3, !dbg !981
  %29 = load i8, ptr %28, align 1, !dbg !981, !tbaa !132
    #dbg_value(i8 %29, !965, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !974)
    #dbg_value(i32 4, !122, !DIExpression(), !980)
  store ptr %9, ptr %5, align 4, !dbg !982, !tbaa !458
  %30 = getelementptr inbounds nuw i8, ptr %5, i32 4, !dbg !982
  %31 = load i32, ptr %2, align 4, !dbg !983, !tbaa !27
  store i32 %31, ptr %30, align 4, !dbg !982, !tbaa !460
  store ptr %11, ptr %6, align 4, !dbg !984, !tbaa !458
  %32 = getelementptr inbounds nuw i8, ptr %6, i32 4, !dbg !984
  %33 = getelementptr inbounds nuw i8, ptr %2, i32 4, !dbg !985
  %34 = load i32, ptr %33, align 4, !dbg !985, !tbaa !27
  store i32 %34, ptr %32, align 4, !dbg !984, !tbaa !460
  %35 = zext i8 %20 to i32, !dbg !986
  %36 = shl nuw i32 %35, 24, !dbg !986
  %37 = zext i8 %18 to i32, !dbg !986
  %38 = shl nuw nsw i32 %37, 16, !dbg !986
  %39 = or disjoint i32 %36, %38, !dbg !986
  %40 = zext i8 %16 to i32, !dbg !986
  %41 = shl nuw nsw i32 %40, 8, !dbg !986
  %42 = or disjoint i32 %39, %41, !dbg !986
  %43 = zext i8 %14 to i32, !dbg !986
  %44 = or disjoint i32 %42, %43, !dbg !986
  %45 = zext i8 %29 to i32, !dbg !987
  %46 = shl nuw i32 %45, 24, !dbg !987
  %47 = zext i8 %27 to i32, !dbg !987
  %48 = shl nuw nsw i32 %47, 16, !dbg !987
  %49 = or disjoint i32 %46, %48, !dbg !987
  %50 = zext i8 %25 to i32, !dbg !987
  %51 = shl nuw nsw i32 %50, 8, !dbg !987
  %52 = or disjoint i32 %49, %51, !dbg !987
  %53 = zext i8 %23 to i32, !dbg !987
  %54 = or disjoint i32 %52, %53, !dbg !987
  %55 = tail call i32 @lang_fn_pipeline38_right_padded_zip_heldout_u32_into(ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %5, ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %6, i32 noundef %44, i32 noundef %54, ptr noundef %3) #13, !dbg !987
  ret i32 %55, !dbg !988

56:                                               ; preds = %4
  tail call void @llvm.trap(), !dbg !989
  unreachable, !dbg !991
}

; Function Attrs: nounwind uwtable
define hidden void @ink_compute_call(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readonly %2, ptr nocapture noundef writeonly %3, ptr nocapture noundef writeonly %4) local_unnamed_addr #2 !dbg !992 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1052)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1052)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1052)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1052)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1052)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1052)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1052)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1052)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1054)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1054)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1054)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1054)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1054)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1054)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1054)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1054)
  %6 = alloca %struct.ink_l_uint32, align 4, !DIAssignID !1056
    #dbg_assign(i1 undef, !1009, !DIExpression(), !1056, ptr %6, !DIExpression(), !1057)
  %7 = alloca %struct.ink_l_uint32, align 4
  %8 = alloca %struct.ink_l_uint32, align 4
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1058)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1058)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1058)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1058)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1058)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1058)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1058)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1058)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1060)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1060)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1060)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1060)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1060)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1060)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1060)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1060)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1062)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1062)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1062)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1062)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1062)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1062)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1062)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1062)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1064)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1064)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1064)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1064)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1064)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1064)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1064)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1064)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1066)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1066)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1066)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1066)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1066)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1066)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1066)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1066)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1068)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1068)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1068)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1068)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1068)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1068)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1068)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1068)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1070)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1070)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1070)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1070)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1070)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1070)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1070)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1070)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1072)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1072)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1072)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1072)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1072)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1072)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1072)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1072)
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
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1098)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1098)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1098)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1098)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1098)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1098)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1098)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1098)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1100)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1100)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1100)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1100)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1100)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1100)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1100)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1100)
    #dbg_value(i32 %0, !998, !DIExpression(), !1102)
    #dbg_value(ptr %1, !999, !DIExpression(), !1102)
    #dbg_value(ptr %2, !1000, !DIExpression(), !1102)
    #dbg_value(ptr %3, !1001, !DIExpression(), !1102)
    #dbg_value(ptr %4, !1002, !DIExpression(), !1102)
  switch i32 %0, label %653 [
    i32 0, label %9
    i32 1, label %59
    i32 2, label %163
    i32 3, label %267
    i32 4, label %367
    i32 5, label %467
    i32 6, label %560
  ], !dbg !1103

9:                                                ; preds = %5
  %10 = load ptr, ptr %1, align 4, !dbg !1104, !tbaa !973
    #dbg_value(ptr %10, !1003, !DIExpression(), !1057)
  %11 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1105
  %12 = load ptr, ptr %11, align 4, !dbg !1105, !tbaa !973
    #dbg_value(ptr %12, !1006, !DIExpression(), !1057)
  %13 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1106
  %14 = load ptr, ptr %13, align 4, !dbg !1106, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1052)
    #dbg_value(ptr %14, !115, !DIExpression(), !1052)
    #dbg_value(i32 4, !116, !DIExpression(), !1052)
    #dbg_value(ptr undef, !117, !DIExpression(), !1052)
    #dbg_value(ptr %14, !119, !DIExpression(), !1052)
    #dbg_value(i32 0, !122, !DIExpression(), !1107)
  %15 = load i8, ptr %14, align 1, !dbg !1108, !tbaa !132
    #dbg_value(i8 %15, !1007, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1057)
    #dbg_value(i32 1, !122, !DIExpression(), !1107)
  %16 = getelementptr inbounds nuw i8, ptr %14, i32 1, !dbg !1108
  %17 = load i8, ptr %16, align 1, !dbg !1108, !tbaa !132
    #dbg_value(i8 %17, !1007, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1057)
    #dbg_value(i32 2, !122, !DIExpression(), !1107)
  %18 = getelementptr inbounds nuw i8, ptr %14, i32 2, !dbg !1108
  %19 = load i8, ptr %18, align 1, !dbg !1108, !tbaa !132
    #dbg_value(i8 %19, !1007, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1057)
    #dbg_value(i32 3, !122, !DIExpression(), !1107)
  %20 = getelementptr inbounds nuw i8, ptr %14, i32 3, !dbg !1108
  %21 = load i8, ptr %20, align 1, !dbg !1108, !tbaa !132
    #dbg_value(i8 %21, !1007, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1057)
    #dbg_value(i32 4, !122, !DIExpression(), !1107)
  %22 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1109
  %23 = load ptr, ptr %22, align 4, !dbg !1109, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1054)
    #dbg_value(ptr %23, !115, !DIExpression(), !1054)
    #dbg_value(i32 4, !116, !DIExpression(), !1054)
    #dbg_value(ptr undef, !117, !DIExpression(), !1054)
    #dbg_value(ptr %23, !119, !DIExpression(), !1054)
    #dbg_value(i32 0, !122, !DIExpression(), !1110)
  %24 = load i8, ptr %23, align 1, !dbg !1111, !tbaa !132
    #dbg_value(i8 %24, !1008, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1057)
    #dbg_value(i32 1, !122, !DIExpression(), !1110)
  %25 = getelementptr inbounds nuw i8, ptr %23, i32 1, !dbg !1111
  %26 = load i8, ptr %25, align 1, !dbg !1111, !tbaa !132
    #dbg_value(i8 %26, !1008, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1057)
    #dbg_value(i32 2, !122, !DIExpression(), !1110)
  %27 = getelementptr inbounds nuw i8, ptr %23, i32 2, !dbg !1111
  %28 = load i8, ptr %27, align 1, !dbg !1111, !tbaa !132
    #dbg_value(i8 %28, !1008, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1057)
    #dbg_value(i32 3, !122, !DIExpression(), !1110)
  %29 = getelementptr inbounds nuw i8, ptr %23, i32 3, !dbg !1111
  %30 = load i8, ptr %29, align 1, !dbg !1111, !tbaa !132
    #dbg_value(i8 %30, !1008, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1057)
    #dbg_value(i32 4, !122, !DIExpression(), !1110)
  call void @llvm.lifetime.start.p0(i64 8, ptr nonnull %6) #14, !dbg !1112
  store ptr %10, ptr %7, align 4, !dbg !1113, !tbaa !458
  %31 = getelementptr inbounds nuw i8, ptr %7, i32 4, !dbg !1113
  %32 = load i32, ptr %2, align 4, !dbg !1114, !tbaa !27
  store i32 %32, ptr %31, align 4, !dbg !1113, !tbaa !460
  store ptr %12, ptr %8, align 4, !dbg !1115, !tbaa !458
  %33 = getelementptr inbounds nuw i8, ptr %8, i32 4, !dbg !1115
  %34 = getelementptr inbounds nuw i8, ptr %2, i32 4, !dbg !1116
  %35 = load i32, ptr %34, align 4, !dbg !1116, !tbaa !27
  store i32 %35, ptr %33, align 4, !dbg !1115, !tbaa !460
  %36 = zext i8 %21 to i32, !dbg !1117
  %37 = shl nuw i32 %36, 24, !dbg !1117
  %38 = zext i8 %19 to i32, !dbg !1117
  %39 = shl nuw nsw i32 %38, 16, !dbg !1117
  %40 = or disjoint i32 %37, %39, !dbg !1117
  %41 = zext i8 %17 to i32, !dbg !1117
  %42 = shl nuw nsw i32 %41, 8, !dbg !1117
  %43 = or disjoint i32 %40, %42, !dbg !1117
  %44 = zext i8 %15 to i32, !dbg !1117
  %45 = or disjoint i32 %43, %44, !dbg !1117
  %46 = zext i8 %30 to i32, !dbg !1118
  %47 = shl nuw i32 %46, 24, !dbg !1118
  %48 = zext i8 %28 to i32, !dbg !1118
  %49 = shl nuw nsw i32 %48, 16, !dbg !1118
  %50 = or disjoint i32 %47, %49, !dbg !1118
  %51 = zext i8 %26 to i32, !dbg !1118
  %52 = shl nuw nsw i32 %51, 8, !dbg !1118
  %53 = or disjoint i32 %50, %52, !dbg !1118
  %54 = zext i8 %24 to i32, !dbg !1118
  %55 = or disjoint i32 %53, %54, !dbg !1118
  call void @lang_fn_pipeline38_right_padded_zip_heldout_u32(ptr dead_on_unwind nonnull writable sret(%struct.ink_l_uint32) align 4 %6, ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %7, ptr noundef nonnull byval(%struct.ink_l_uint32) align 4 %8, i32 noundef %45, i32 noundef %55) #13, !dbg !1118
  %56 = load ptr, ptr %6, align 4, !dbg !1119, !tbaa !458
  store ptr %56, ptr %3, align 4, !dbg !1120, !tbaa !973
  %57 = getelementptr inbounds nuw i8, ptr %6, i32 4, !dbg !1121
  %58 = load i32, ptr %57, align 4, !dbg !1121, !tbaa !460
  store i32 %58, ptr %4, align 4, !dbg !1122, !tbaa !27
  call void @llvm.lifetime.end.p0(i64 8, ptr nonnull %6) #14, !dbg !1123
  br label %654

59:                                               ; preds = %5
    #dbg_value(ptr undef, !110, !DIExpression(), !1058)
    #dbg_value(ptr poison, !115, !DIExpression(), !1058)
    #dbg_value(i32 4, !116, !DIExpression(), !1058)
    #dbg_value(ptr undef, !117, !DIExpression(), !1058)
    #dbg_value(ptr poison, !119, !DIExpression(), !1058)
    #dbg_value(i8 poison, !1010, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1124)
    #dbg_value(i8 poison, !1010, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1124)
    #dbg_value(i8 poison, !1010, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1124)
    #dbg_value(i8 poison, !1010, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1124)
    #dbg_value(i32 4, !122, !DIExpression(), !1125)
    #dbg_value(ptr undef, !110, !DIExpression(), !1060)
    #dbg_value(ptr poison, !115, !DIExpression(), !1060)
    #dbg_value(i32 4, !116, !DIExpression(), !1060)
    #dbg_value(ptr undef, !117, !DIExpression(), !1060)
    #dbg_value(ptr poison, !119, !DIExpression(), !1060)
    #dbg_value(i8 poison, !1012, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1124)
    #dbg_value(i8 poison, !1012, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1124)
    #dbg_value(i8 poison, !1012, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1124)
    #dbg_value(i8 poison, !1012, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1124)
    #dbg_value(i32 4, !122, !DIExpression(), !1126)
  %60 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1127
  %61 = load ptr, ptr %60, align 4, !dbg !1127, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1062)
    #dbg_value(ptr %61, !115, !DIExpression(), !1062)
    #dbg_value(i32 4, !116, !DIExpression(), !1062)
    #dbg_value(ptr undef, !117, !DIExpression(), !1062)
    #dbg_value(ptr %61, !119, !DIExpression(), !1062)
    #dbg_value(i32 0, !122, !DIExpression(), !1128)
  %62 = load i8, ptr %61, align 1, !dbg !1129, !tbaa !132
    #dbg_value(i8 %62, !1013, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1124)
    #dbg_value(i32 1, !122, !DIExpression(), !1128)
  %63 = getelementptr inbounds nuw i8, ptr %61, i32 1, !dbg !1129
  %64 = load i8, ptr %63, align 1, !dbg !1129, !tbaa !132
    #dbg_value(i8 %64, !1013, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1124)
    #dbg_value(i32 2, !122, !DIExpression(), !1128)
  %65 = getelementptr inbounds nuw i8, ptr %61, i32 2, !dbg !1129
  %66 = load i8, ptr %65, align 1, !dbg !1129, !tbaa !132
    #dbg_value(i8 %66, !1013, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1124)
    #dbg_value(i32 3, !122, !DIExpression(), !1128)
  %67 = getelementptr inbounds nuw i8, ptr %61, i32 3, !dbg !1129
  %68 = load i8, ptr %67, align 1, !dbg !1129, !tbaa !132
    #dbg_value(i8 %68, !1013, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1124)
    #dbg_value(i32 4, !122, !DIExpression(), !1128)
  %69 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1130
  %70 = load ptr, ptr %69, align 4, !dbg !1130, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1064)
    #dbg_value(ptr %70, !115, !DIExpression(), !1064)
    #dbg_value(i32 4, !116, !DIExpression(), !1064)
    #dbg_value(ptr undef, !117, !DIExpression(), !1064)
    #dbg_value(ptr %70, !119, !DIExpression(), !1064)
    #dbg_value(i32 0, !122, !DIExpression(), !1131)
  %71 = load i8, ptr %70, align 1, !dbg !1132, !tbaa !132
    #dbg_value(i8 %71, !1014, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1124)
    #dbg_value(i32 1, !122, !DIExpression(), !1131)
  %72 = getelementptr inbounds nuw i8, ptr %70, i32 1, !dbg !1132
  %73 = load i8, ptr %72, align 1, !dbg !1132, !tbaa !132
    #dbg_value(i8 %73, !1014, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1124)
    #dbg_value(i32 2, !122, !DIExpression(), !1131)
  %74 = getelementptr inbounds nuw i8, ptr %70, i32 2, !dbg !1132
  %75 = load i8, ptr %74, align 1, !dbg !1132, !tbaa !132
    #dbg_value(i8 %75, !1014, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1124)
    #dbg_value(i32 3, !122, !DIExpression(), !1131)
  %76 = getelementptr inbounds nuw i8, ptr %70, i32 3, !dbg !1132
  %77 = load i8, ptr %76, align 1, !dbg !1132, !tbaa !132
    #dbg_value(i8 %77, !1014, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1124)
    #dbg_value(i32 4, !122, !DIExpression(), !1131)
  %78 = zext i8 %68 to i32, !dbg !1133
  %79 = shl nuw i32 %78, 24, !dbg !1133
  %80 = zext i8 %66 to i32, !dbg !1133
  %81 = shl nuw nsw i32 %80, 16, !dbg !1133
  %82 = or disjoint i32 %79, %81, !dbg !1133
  %83 = zext i8 %64 to i32, !dbg !1133
  %84 = shl nuw nsw i32 %83, 8, !dbg !1133
  %85 = or disjoint i32 %82, %84, !dbg !1133
  %86 = zext i8 %62 to i32, !dbg !1133
  %87 = or disjoint i32 %85, %86, !dbg !1133
  %88 = zext i8 %77 to i32, !dbg !1134
  %89 = shl nuw i32 %88, 24, !dbg !1134
  %90 = zext i8 %75 to i32, !dbg !1134
  %91 = shl nuw nsw i32 %90, 16, !dbg !1134
  %92 = or disjoint i32 %89, %91, !dbg !1134
  %93 = zext i8 %73 to i32, !dbg !1134
  %94 = shl nuw nsw i32 %93, 8, !dbg !1134
  %95 = or disjoint i32 %92, %94, !dbg !1134
  %96 = zext i8 %71 to i32, !dbg !1134
  %97 = or disjoint i32 %95, %96, !dbg !1134
    #dbg_value(i32 poison, !496, !DIExpression(), !1136)
    #dbg_value(i32 poison, !497, !DIExpression(), !1136)
    #dbg_value(i32 %87, !498, !DIExpression(), !1136)
    #dbg_value(i32 %97, !499, !DIExpression(), !1136)
    #dbg_value(i32 poison, !500, !DIExpression(), !1136)
    #dbg_value(i32 poison, !501, !DIExpression(), !1136)
    #dbg_value(i32 %87, !502, !DIExpression(), !1136)
    #dbg_value(i32 %97, !503, !DIExpression(), !1136)
    #dbg_value(i32 poison, !504, !DIExpression(), !1136)
    #dbg_value(i32 %97, !505, !DIExpression(), !1136)
  %98 = icmp eq i32 %97, 0, !dbg !1134
  br i1 %98, label %140, label %99, !dbg !1134

99:                                               ; preds = %59
  %100 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1137
  %101 = load ptr, ptr %100, align 4, !dbg !1137, !tbaa !973
    #dbg_value(ptr %101, !115, !DIExpression(), !1060)
    #dbg_value(ptr %101, !119, !DIExpression(), !1060)
  %102 = getelementptr inbounds nuw i8, ptr %101, i32 3, !dbg !1138
  %103 = load i8, ptr %102, align 1, !dbg !1138, !tbaa !132
    #dbg_value(i8 %103, !1012, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1124)
  %104 = getelementptr inbounds nuw i8, ptr %101, i32 2, !dbg !1138
  %105 = load i8, ptr %104, align 1, !dbg !1138, !tbaa !132
    #dbg_value(i8 %105, !1012, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1124)
  %106 = getelementptr inbounds nuw i8, ptr %101, i32 1, !dbg !1138
  %107 = load i8, ptr %106, align 1, !dbg !1138, !tbaa !132
    #dbg_value(i8 %107, !1012, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1124)
  %108 = load i8, ptr %101, align 1, !dbg !1138, !tbaa !132
    #dbg_value(i8 %108, !1012, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1124)
  %109 = load ptr, ptr %1, align 4, !dbg !1139, !tbaa !973
    #dbg_value(ptr %109, !115, !DIExpression(), !1058)
    #dbg_value(ptr %109, !119, !DIExpression(), !1058)
  %110 = getelementptr inbounds nuw i8, ptr %109, i32 3, !dbg !1140
  %111 = load i8, ptr %110, align 1, !dbg !1140, !tbaa !132
    #dbg_value(i8 %111, !1010, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1124)
  %112 = getelementptr inbounds nuw i8, ptr %109, i32 2, !dbg !1140
  %113 = load i8, ptr %112, align 1, !dbg !1140, !tbaa !132
    #dbg_value(i8 %113, !1010, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1124)
  %114 = getelementptr inbounds nuw i8, ptr %109, i32 1, !dbg !1140
  %115 = load i8, ptr %114, align 1, !dbg !1140, !tbaa !132
    #dbg_value(i8 %115, !1010, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1124)
  %116 = load i8, ptr %109, align 1, !dbg !1140, !tbaa !132
    #dbg_value(i8 %116, !1010, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1124)
  %117 = zext i8 %103 to i32, !dbg !1141
  %118 = shl nuw i32 %117, 24, !dbg !1141
  %119 = zext i8 %105 to i32, !dbg !1141
  %120 = shl nuw nsw i32 %119, 16, !dbg !1141
  %121 = or disjoint i32 %118, %120, !dbg !1141
  %122 = zext i8 %107 to i32, !dbg !1141
  %123 = shl nuw nsw i32 %122, 8, !dbg !1141
  %124 = or disjoint i32 %121, %123, !dbg !1141
  %125 = zext i8 %108 to i32, !dbg !1141
  %126 = or disjoint i32 %124, %125, !dbg !1141
    #dbg_value(i32 %126, !497, !DIExpression(), !1136)
    #dbg_value(i32 %126, !501, !DIExpression(), !1136)
    #dbg_value(i32 %126, !504, !DIExpression(), !1136)
  %127 = zext i8 %111 to i32, !dbg !1142
  %128 = shl nuw i32 %127, 24, !dbg !1142
  %129 = zext i8 %113 to i32, !dbg !1142
  %130 = shl nuw nsw i32 %129, 16, !dbg !1142
  %131 = or disjoint i32 %128, %130, !dbg !1142
  %132 = zext i8 %115 to i32, !dbg !1142
  %133 = shl nuw nsw i32 %132, 8, !dbg !1142
  %134 = or disjoint i32 %131, %133, !dbg !1142
  %135 = zext i8 %116 to i32, !dbg !1142
  %136 = or disjoint i32 %134, %135, !dbg !1142
    #dbg_value(i32 %136, !496, !DIExpression(), !1136)
    #dbg_value(i32 %136, !500, !DIExpression(), !1136)
  %137 = udiv i32 %126, %97, !dbg !1142
    #dbg_value(i32 %137, !506, !DIExpression(), !1136)
    #dbg_value(i32 %137, !507, !DIExpression(), !1136)
    #dbg_value(i32 %136, !508, !DIExpression(), !1136)
    #dbg_value(i32 %97, !509, !DIExpression(), !1136)
  %138 = urem i32 %136, %97, !dbg !1143
    #dbg_value(i32 %138, !510, !DIExpression(), !1136)
  %139 = add i32 %138, %137
  br label %140

140:                                              ; preds = %59, %99
  %141 = phi i32 [ %139, %99 ], [ 0, %59 ], !dbg !1144
    #dbg_value(i32 poison, !510, !DIExpression(), !1136)
    #dbg_value(i32 %141, !511, !DIExpression(), !1136)
  %142 = add i32 %141, %87, !dbg !1145
    #dbg_value(i32 %142, !1015, !DIExpression(), !1124)
    #dbg_value(i32 1, !55, !DIExpression(), !1146)
    #dbg_value(i32 4, !56, !DIExpression(), !1146)
  %143 = load i32, ptr @ink_top, align 4
  %144 = icmp ugt i32 %143, -8
  br i1 %144, label %145, label %146, !dbg !1148

145:                                              ; preds = %140
  tail call void @llvm.trap(), !dbg !1149
  unreachable, !dbg !1151

146:                                              ; preds = %140
  %147 = icmp eq i32 %143, 0, !dbg !1152
  %148 = add nuw i32 %143, 7, !dbg !1153
  %149 = select i1 %147, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %148, !dbg !1154
  %150 = and i32 %149, -8, !dbg !1155
    #dbg_value(i32 %150, !57, !DIExpression(), !1146)
    #dbg_value(i32 4, !58, !DIExpression(), !1146)
  %151 = or disjoint i32 %150, 4, !dbg !1156
  store i32 %151, ptr @ink_top, align 4, !dbg !1157, !tbaa !27
  %152 = add i32 %150, 65539, !dbg !1158
  %153 = lshr i32 %152, 16, !dbg !1159
    #dbg_value(i32 %153, !59, !DIExpression(), !1146)
  %154 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1160
    #dbg_value(i32 %154, !60, !DIExpression(), !1146)
  %155 = icmp ugt i32 %153, %154, !dbg !1161
  br i1 %155, label %156, label %161, !dbg !1162

156:                                              ; preds = %146
  %157 = sub nuw nsw i32 %153, %154, !dbg !1163
  %158 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %157), !dbg !1164
  %159 = icmp eq i32 %158, -1, !dbg !1165
  br i1 %159, label %160, label %161, !dbg !1162

160:                                              ; preds = %156
  tail call void @llvm.trap(), !dbg !1166
  unreachable, !dbg !1168

161:                                              ; preds = %146, %156
  %162 = inttoptr i32 %150 to ptr, !dbg !1169
    #dbg_value(ptr %162, !1016, !DIExpression(), !1124)
  store i32 %142, ptr %162, align 8, !dbg !1170, !tbaa !330
  store ptr %162, ptr %3, align 4, !dbg !1171, !tbaa !973
  store i32 1, ptr %4, align 4, !dbg !1172, !tbaa !27
  br label %654

163:                                              ; preds = %5
    #dbg_value(ptr undef, !110, !DIExpression(), !1066)
    #dbg_value(ptr poison, !115, !DIExpression(), !1066)
    #dbg_value(i32 4, !116, !DIExpression(), !1066)
    #dbg_value(ptr undef, !117, !DIExpression(), !1066)
    #dbg_value(ptr poison, !119, !DIExpression(), !1066)
    #dbg_value(i8 poison, !1017, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1173)
    #dbg_value(i8 poison, !1017, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1173)
    #dbg_value(i8 poison, !1017, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1173)
    #dbg_value(i8 poison, !1017, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1173)
    #dbg_value(i32 4, !122, !DIExpression(), !1174)
    #dbg_value(ptr undef, !110, !DIExpression(), !1068)
    #dbg_value(ptr poison, !115, !DIExpression(), !1068)
    #dbg_value(i32 4, !116, !DIExpression(), !1068)
    #dbg_value(ptr undef, !117, !DIExpression(), !1068)
    #dbg_value(ptr poison, !119, !DIExpression(), !1068)
    #dbg_value(i8 poison, !1019, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1173)
    #dbg_value(i8 poison, !1019, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1173)
    #dbg_value(i8 poison, !1019, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1173)
    #dbg_value(i8 poison, !1019, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1173)
    #dbg_value(i32 4, !122, !DIExpression(), !1175)
  %164 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1176
  %165 = load ptr, ptr %164, align 4, !dbg !1176, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1070)
    #dbg_value(ptr %165, !115, !DIExpression(), !1070)
    #dbg_value(i32 4, !116, !DIExpression(), !1070)
    #dbg_value(ptr undef, !117, !DIExpression(), !1070)
    #dbg_value(ptr %165, !119, !DIExpression(), !1070)
    #dbg_value(i32 0, !122, !DIExpression(), !1177)
  %166 = load i8, ptr %165, align 1, !dbg !1178, !tbaa !132
    #dbg_value(i8 %166, !1020, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1173)
    #dbg_value(i32 1, !122, !DIExpression(), !1177)
  %167 = getelementptr inbounds nuw i8, ptr %165, i32 1, !dbg !1178
  %168 = load i8, ptr %167, align 1, !dbg !1178, !tbaa !132
    #dbg_value(i8 %168, !1020, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1173)
    #dbg_value(i32 2, !122, !DIExpression(), !1177)
  %169 = getelementptr inbounds nuw i8, ptr %165, i32 2, !dbg !1178
  %170 = load i8, ptr %169, align 1, !dbg !1178, !tbaa !132
    #dbg_value(i8 %170, !1020, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1173)
    #dbg_value(i32 3, !122, !DIExpression(), !1177)
  %171 = getelementptr inbounds nuw i8, ptr %165, i32 3, !dbg !1178
  %172 = load i8, ptr %171, align 1, !dbg !1178, !tbaa !132
    #dbg_value(i8 %172, !1020, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1173)
    #dbg_value(i32 4, !122, !DIExpression(), !1177)
  %173 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1179
  %174 = load ptr, ptr %173, align 4, !dbg !1179, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1072)
    #dbg_value(ptr %174, !115, !DIExpression(), !1072)
    #dbg_value(i32 4, !116, !DIExpression(), !1072)
    #dbg_value(ptr undef, !117, !DIExpression(), !1072)
    #dbg_value(ptr %174, !119, !DIExpression(), !1072)
    #dbg_value(i32 0, !122, !DIExpression(), !1180)
  %175 = load i8, ptr %174, align 1, !dbg !1181, !tbaa !132
    #dbg_value(i8 %175, !1021, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1173)
    #dbg_value(i32 1, !122, !DIExpression(), !1180)
  %176 = getelementptr inbounds nuw i8, ptr %174, i32 1, !dbg !1181
  %177 = load i8, ptr %176, align 1, !dbg !1181, !tbaa !132
    #dbg_value(i8 %177, !1021, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1173)
    #dbg_value(i32 2, !122, !DIExpression(), !1180)
  %178 = getelementptr inbounds nuw i8, ptr %174, i32 2, !dbg !1181
  %179 = load i8, ptr %178, align 1, !dbg !1181, !tbaa !132
    #dbg_value(i8 %179, !1021, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1173)
    #dbg_value(i32 3, !122, !DIExpression(), !1180)
  %180 = getelementptr inbounds nuw i8, ptr %174, i32 3, !dbg !1181
  %181 = load i8, ptr %180, align 1, !dbg !1181, !tbaa !132
    #dbg_value(i8 %181, !1021, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1173)
    #dbg_value(i32 4, !122, !DIExpression(), !1180)
  %182 = zext i8 %172 to i32, !dbg !1182
  %183 = shl nuw i32 %182, 24, !dbg !1182
  %184 = zext i8 %170 to i32, !dbg !1182
  %185 = shl nuw nsw i32 %184, 16, !dbg !1182
  %186 = or disjoint i32 %183, %185, !dbg !1182
  %187 = zext i8 %168 to i32, !dbg !1182
  %188 = shl nuw nsw i32 %187, 8, !dbg !1182
  %189 = or disjoint i32 %186, %188, !dbg !1182
  %190 = zext i8 %166 to i32, !dbg !1182
  %191 = or disjoint i32 %189, %190, !dbg !1182
  %192 = zext i8 %181 to i32, !dbg !1183
  %193 = shl nuw i32 %192, 24, !dbg !1183
  %194 = zext i8 %179 to i32, !dbg !1183
  %195 = shl nuw nsw i32 %194, 16, !dbg !1183
  %196 = or disjoint i32 %193, %195, !dbg !1183
  %197 = zext i8 %177 to i32, !dbg !1183
  %198 = shl nuw nsw i32 %197, 8, !dbg !1183
  %199 = or disjoint i32 %196, %198, !dbg !1183
  %200 = zext i8 %175 to i32, !dbg !1183
  %201 = or disjoint i32 %199, %200, !dbg !1183
    #dbg_value(i32 poison, !525, !DIExpression(), !1185)
    #dbg_value(i32 poison, !526, !DIExpression(), !1185)
    #dbg_value(i32 %191, !527, !DIExpression(), !1185)
    #dbg_value(i32 %201, !528, !DIExpression(), !1185)
    #dbg_value(i32 poison, !529, !DIExpression(), !1185)
    #dbg_value(i32 %201, !530, !DIExpression(), !1185)
  %202 = icmp eq i32 %201, 0, !dbg !1183
  br i1 %202, label %244, label %203, !dbg !1183

203:                                              ; preds = %163
  %204 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1186
  %205 = load ptr, ptr %204, align 4, !dbg !1186, !tbaa !973
    #dbg_value(ptr %205, !115, !DIExpression(), !1068)
    #dbg_value(ptr %205, !119, !DIExpression(), !1068)
  %206 = getelementptr inbounds nuw i8, ptr %205, i32 3, !dbg !1187
  %207 = load i8, ptr %206, align 1, !dbg !1187, !tbaa !132
    #dbg_value(i8 %207, !1019, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1173)
  %208 = getelementptr inbounds nuw i8, ptr %205, i32 2, !dbg !1187
  %209 = load i8, ptr %208, align 1, !dbg !1187, !tbaa !132
    #dbg_value(i8 %209, !1019, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1173)
  %210 = getelementptr inbounds nuw i8, ptr %205, i32 1, !dbg !1187
  %211 = load i8, ptr %210, align 1, !dbg !1187, !tbaa !132
    #dbg_value(i8 %211, !1019, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1173)
  %212 = load i8, ptr %205, align 1, !dbg !1187, !tbaa !132
    #dbg_value(i8 %212, !1019, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1173)
  %213 = load ptr, ptr %1, align 4, !dbg !1188, !tbaa !973
    #dbg_value(ptr %213, !115, !DIExpression(), !1066)
    #dbg_value(ptr %213, !119, !DIExpression(), !1066)
  %214 = getelementptr inbounds nuw i8, ptr %213, i32 3, !dbg !1189
  %215 = load i8, ptr %214, align 1, !dbg !1189, !tbaa !132
    #dbg_value(i8 %215, !1017, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1173)
  %216 = getelementptr inbounds nuw i8, ptr %213, i32 2, !dbg !1189
  %217 = load i8, ptr %216, align 1, !dbg !1189, !tbaa !132
    #dbg_value(i8 %217, !1017, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1173)
  %218 = getelementptr inbounds nuw i8, ptr %213, i32 1, !dbg !1189
  %219 = load i8, ptr %218, align 1, !dbg !1189, !tbaa !132
    #dbg_value(i8 %219, !1017, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1173)
  %220 = load i8, ptr %213, align 1, !dbg !1189, !tbaa !132
    #dbg_value(i8 %220, !1017, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1173)
  %221 = zext i8 %207 to i32, !dbg !1190
  %222 = shl nuw i32 %221, 24, !dbg !1190
  %223 = zext i8 %209 to i32, !dbg !1190
  %224 = shl nuw nsw i32 %223, 16, !dbg !1190
  %225 = or disjoint i32 %222, %224, !dbg !1190
  %226 = zext i8 %211 to i32, !dbg !1190
  %227 = shl nuw nsw i32 %226, 8, !dbg !1190
  %228 = or disjoint i32 %225, %227, !dbg !1190
  %229 = zext i8 %212 to i32, !dbg !1190
  %230 = or disjoint i32 %228, %229, !dbg !1190
    #dbg_value(i32 %230, !526, !DIExpression(), !1185)
    #dbg_value(i32 %230, !529, !DIExpression(), !1185)
  %231 = zext i8 %215 to i32, !dbg !1191
  %232 = shl nuw i32 %231, 24, !dbg !1191
  %233 = zext i8 %217 to i32, !dbg !1191
  %234 = shl nuw nsw i32 %233, 16, !dbg !1191
  %235 = or disjoint i32 %232, %234, !dbg !1191
  %236 = zext i8 %219 to i32, !dbg !1191
  %237 = shl nuw nsw i32 %236, 8, !dbg !1191
  %238 = or disjoint i32 %235, %237, !dbg !1191
  %239 = zext i8 %220 to i32, !dbg !1191
  %240 = or disjoint i32 %238, %239, !dbg !1191
    #dbg_value(i32 %240, !525, !DIExpression(), !1185)
  %241 = udiv i32 %230, %201, !dbg !1191
    #dbg_value(i32 %241, !531, !DIExpression(), !1185)
    #dbg_value(i32 %241, !532, !DIExpression(), !1185)
    #dbg_value(i32 %240, !533, !DIExpression(), !1185)
    #dbg_value(i32 %201, !534, !DIExpression(), !1185)
  %242 = urem i32 %240, %201, !dbg !1192
    #dbg_value(i32 %242, !535, !DIExpression(), !1185)
  %243 = add i32 %242, %241
  br label %244

244:                                              ; preds = %163, %203
  %245 = phi i32 [ %243, %203 ], [ 0, %163 ], !dbg !1193
    #dbg_value(i32 poison, !535, !DIExpression(), !1185)
    #dbg_value(i32 %245, !536, !DIExpression(), !1185)
  %246 = add i32 %245, %191, !dbg !1194
    #dbg_value(i32 %246, !1022, !DIExpression(), !1173)
    #dbg_value(i32 1, !55, !DIExpression(), !1195)
    #dbg_value(i32 4, !56, !DIExpression(), !1195)
  %247 = load i32, ptr @ink_top, align 4
  %248 = icmp ugt i32 %247, -8
  br i1 %248, label %249, label %250, !dbg !1197

249:                                              ; preds = %244
  tail call void @llvm.trap(), !dbg !1198
  unreachable, !dbg !1200

250:                                              ; preds = %244
  %251 = icmp eq i32 %247, 0, !dbg !1201
  %252 = add nuw i32 %247, 7, !dbg !1202
  %253 = select i1 %251, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %252, !dbg !1203
  %254 = and i32 %253, -8, !dbg !1204
    #dbg_value(i32 %254, !57, !DIExpression(), !1195)
    #dbg_value(i32 4, !58, !DIExpression(), !1195)
  %255 = or disjoint i32 %254, 4, !dbg !1205
  store i32 %255, ptr @ink_top, align 4, !dbg !1206, !tbaa !27
  %256 = add i32 %254, 65539, !dbg !1207
  %257 = lshr i32 %256, 16, !dbg !1208
    #dbg_value(i32 %257, !59, !DIExpression(), !1195)
  %258 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1209
    #dbg_value(i32 %258, !60, !DIExpression(), !1195)
  %259 = icmp ugt i32 %257, %258, !dbg !1210
  br i1 %259, label %260, label %265, !dbg !1211

260:                                              ; preds = %250
  %261 = sub nuw nsw i32 %257, %258, !dbg !1212
  %262 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %261), !dbg !1213
  %263 = icmp eq i32 %262, -1, !dbg !1214
  br i1 %263, label %264, label %265, !dbg !1211

264:                                              ; preds = %260
  tail call void @llvm.trap(), !dbg !1215
  unreachable, !dbg !1217

265:                                              ; preds = %250, %260
  %266 = inttoptr i32 %254 to ptr, !dbg !1218
    #dbg_value(ptr %266, !1023, !DIExpression(), !1173)
  store i32 %246, ptr %266, align 8, !dbg !1219, !tbaa !330
  store ptr %266, ptr %3, align 4, !dbg !1220, !tbaa !973
  store i32 1, ptr %4, align 4, !dbg !1221, !tbaa !27
  br label %654

267:                                              ; preds = %5
  %268 = load ptr, ptr %1, align 4, !dbg !1222, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1074)
    #dbg_value(ptr %268, !115, !DIExpression(), !1074)
    #dbg_value(i32 4, !116, !DIExpression(), !1074)
    #dbg_value(ptr undef, !117, !DIExpression(), !1074)
    #dbg_value(ptr %268, !119, !DIExpression(), !1074)
    #dbg_value(i32 0, !122, !DIExpression(), !1223)
  %269 = load i8, ptr %268, align 1, !dbg !1224, !tbaa !132
    #dbg_value(i8 %269, !1024, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1225)
    #dbg_value(i32 1, !122, !DIExpression(), !1223)
  %270 = getelementptr inbounds nuw i8, ptr %268, i32 1, !dbg !1224
  %271 = load i8, ptr %270, align 1, !dbg !1224, !tbaa !132
    #dbg_value(i8 %271, !1024, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1225)
    #dbg_value(i32 2, !122, !DIExpression(), !1223)
  %272 = getelementptr inbounds nuw i8, ptr %268, i32 2, !dbg !1224
  %273 = load i8, ptr %272, align 1, !dbg !1224, !tbaa !132
    #dbg_value(i8 %273, !1024, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1225)
    #dbg_value(i32 3, !122, !DIExpression(), !1223)
  %274 = getelementptr inbounds nuw i8, ptr %268, i32 3, !dbg !1224
  %275 = load i8, ptr %274, align 1, !dbg !1224, !tbaa !132
    #dbg_value(i8 %275, !1024, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1225)
    #dbg_value(i32 4, !122, !DIExpression(), !1223)
  %276 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1226
  %277 = load ptr, ptr %276, align 4, !dbg !1226, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1076)
    #dbg_value(ptr %277, !115, !DIExpression(), !1076)
    #dbg_value(i32 4, !116, !DIExpression(), !1076)
    #dbg_value(ptr undef, !117, !DIExpression(), !1076)
    #dbg_value(ptr %277, !119, !DIExpression(), !1076)
    #dbg_value(i32 0, !122, !DIExpression(), !1227)
  %278 = load i8, ptr %277, align 1, !dbg !1228, !tbaa !132
    #dbg_value(i8 %278, !1026, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1225)
    #dbg_value(i32 1, !122, !DIExpression(), !1227)
  %279 = getelementptr inbounds nuw i8, ptr %277, i32 1, !dbg !1228
  %280 = load i8, ptr %279, align 1, !dbg !1228, !tbaa !132
    #dbg_value(i8 %280, !1026, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1225)
    #dbg_value(i32 2, !122, !DIExpression(), !1227)
  %281 = getelementptr inbounds nuw i8, ptr %277, i32 2, !dbg !1228
  %282 = load i8, ptr %281, align 1, !dbg !1228, !tbaa !132
    #dbg_value(i8 %282, !1026, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1225)
    #dbg_value(i32 3, !122, !DIExpression(), !1227)
  %283 = getelementptr inbounds nuw i8, ptr %277, i32 3, !dbg !1228
  %284 = load i8, ptr %283, align 1, !dbg !1228, !tbaa !132
    #dbg_value(i8 %284, !1026, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1225)
    #dbg_value(i32 4, !122, !DIExpression(), !1227)
  %285 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1229
  %286 = load ptr, ptr %285, align 4, !dbg !1229, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1078)
    #dbg_value(ptr %286, !115, !DIExpression(), !1078)
    #dbg_value(i32 4, !116, !DIExpression(), !1078)
    #dbg_value(ptr undef, !117, !DIExpression(), !1078)
    #dbg_value(ptr %286, !119, !DIExpression(), !1078)
    #dbg_value(i32 0, !122, !DIExpression(), !1230)
  %287 = load i8, ptr %286, align 1, !dbg !1231, !tbaa !132
    #dbg_value(i8 %287, !1027, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1225)
    #dbg_value(i32 1, !122, !DIExpression(), !1230)
  %288 = getelementptr inbounds nuw i8, ptr %286, i32 1, !dbg !1231
  %289 = load i8, ptr %288, align 1, !dbg !1231, !tbaa !132
    #dbg_value(i8 %289, !1027, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1225)
    #dbg_value(i32 2, !122, !DIExpression(), !1230)
  %290 = getelementptr inbounds nuw i8, ptr %286, i32 2, !dbg !1231
  %291 = load i8, ptr %290, align 1, !dbg !1231, !tbaa !132
    #dbg_value(i8 %291, !1027, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1225)
    #dbg_value(i32 3, !122, !DIExpression(), !1230)
  %292 = getelementptr inbounds nuw i8, ptr %286, i32 3, !dbg !1231
  %293 = load i8, ptr %292, align 1, !dbg !1231, !tbaa !132
    #dbg_value(i8 %293, !1027, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1225)
    #dbg_value(i32 4, !122, !DIExpression(), !1230)
  %294 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1232
  %295 = load ptr, ptr %294, align 4, !dbg !1232, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1080)
    #dbg_value(ptr %295, !115, !DIExpression(), !1080)
    #dbg_value(i32 4, !116, !DIExpression(), !1080)
    #dbg_value(ptr undef, !117, !DIExpression(), !1080)
    #dbg_value(ptr %295, !119, !DIExpression(), !1080)
    #dbg_value(i32 0, !122, !DIExpression(), !1233)
  %296 = load i8, ptr %295, align 1, !dbg !1234, !tbaa !132
    #dbg_value(i8 %296, !1028, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1225)
    #dbg_value(i32 1, !122, !DIExpression(), !1233)
  %297 = getelementptr inbounds nuw i8, ptr %295, i32 1, !dbg !1234
  %298 = load i8, ptr %297, align 1, !dbg !1234, !tbaa !132
    #dbg_value(i8 %298, !1028, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1225)
    #dbg_value(i32 2, !122, !DIExpression(), !1233)
  %299 = getelementptr inbounds nuw i8, ptr %295, i32 2, !dbg !1234
  %300 = load i8, ptr %299, align 1, !dbg !1234, !tbaa !132
    #dbg_value(i8 %300, !1028, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1225)
    #dbg_value(i32 3, !122, !DIExpression(), !1233)
  %301 = getelementptr inbounds nuw i8, ptr %295, i32 3, !dbg !1234
  %302 = load i8, ptr %301, align 1, !dbg !1234, !tbaa !132
    #dbg_value(i8 %302, !1028, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1225)
    #dbg_value(i32 4, !122, !DIExpression(), !1233)
  %303 = zext i8 %275 to i32, !dbg !1235
  %304 = shl nuw i32 %303, 24, !dbg !1235
  %305 = zext i8 %273 to i32, !dbg !1235
  %306 = shl nuw nsw i32 %305, 16, !dbg !1235
  %307 = or disjoint i32 %304, %306, !dbg !1235
  %308 = zext i8 %271 to i32, !dbg !1235
  %309 = shl nuw nsw i32 %308, 8, !dbg !1235
  %310 = or disjoint i32 %307, %309, !dbg !1235
  %311 = zext i8 %269 to i32, !dbg !1235
  %312 = or disjoint i32 %310, %311, !dbg !1235
  %313 = zext i8 %284 to i32, !dbg !1236
  %314 = shl nuw i32 %313, 24, !dbg !1236
  %315 = zext i8 %282 to i32, !dbg !1236
  %316 = shl nuw nsw i32 %315, 16, !dbg !1236
  %317 = or disjoint i32 %314, %316, !dbg !1236
  %318 = zext i8 %280 to i32, !dbg !1236
  %319 = shl nuw nsw i32 %318, 8, !dbg !1236
  %320 = or disjoint i32 %317, %319, !dbg !1236
  %321 = zext i8 %278 to i32, !dbg !1236
  %322 = or disjoint i32 %320, %321, !dbg !1236
  %323 = zext i8 %293 to i32, !dbg !1237
  %324 = shl nuw i32 %323, 24, !dbg !1237
  %325 = zext i8 %291 to i32, !dbg !1237
  %326 = shl nuw nsw i32 %325, 16, !dbg !1237
  %327 = or disjoint i32 %324, %326, !dbg !1237
  %328 = zext i8 %289 to i32, !dbg !1237
  %329 = shl nuw nsw i32 %328, 8, !dbg !1237
  %330 = or disjoint i32 %327, %329, !dbg !1237
  %331 = zext i8 %287 to i32, !dbg !1237
  %332 = or disjoint i32 %330, %331, !dbg !1237
  %333 = zext i8 %302 to i32, !dbg !1238
  %334 = shl nuw i32 %333, 24, !dbg !1238
  %335 = zext i8 %300 to i32, !dbg !1238
  %336 = shl nuw nsw i32 %335, 16, !dbg !1238
  %337 = or disjoint i32 %334, %336, !dbg !1238
  %338 = zext i8 %298 to i32, !dbg !1238
  %339 = shl nuw nsw i32 %338, 8, !dbg !1238
  %340 = or disjoint i32 %337, %339, !dbg !1238
  %341 = zext i8 %296 to i32, !dbg !1238
  %342 = or disjoint i32 %340, %341, !dbg !1238
    #dbg_value(i32 %312, !550, !DIExpression(), !1240)
    #dbg_value(i32 %322, !551, !DIExpression(), !1240)
    #dbg_value(i32 %332, !552, !DIExpression(), !1240)
    #dbg_value(i32 %342, !553, !DIExpression(), !1240)
    #dbg_value(i32 %312, !554, !DIExpression(), !1240)
    #dbg_value(i32 %322, !555, !DIExpression(), !1240)
    #dbg_value(i32 %332, !556, !DIExpression(), !1240)
    #dbg_value(i32 %342, !557, !DIExpression(), !1240)
    #dbg_value(i32 %312, !558, !DIExpression(), !1240)
  %343 = icmp ult i32 %312, %332, !dbg !1238
  %344 = add i32 %342, %322, !dbg !1241
  %345 = mul i32 %322, 3, !dbg !1241
  %346 = select i1 %343, i32 %344, i32 %345, !dbg !1241
    #dbg_value(i32 %346, !559, !DIExpression(), !1240)
    #dbg_value(i32 %346, !1029, !DIExpression(), !1225)
    #dbg_value(i32 1, !55, !DIExpression(), !1242)
    #dbg_value(i32 4, !56, !DIExpression(), !1242)
  %347 = load i32, ptr @ink_top, align 4
  %348 = icmp ugt i32 %347, -8
  br i1 %348, label %349, label %350, !dbg !1244

349:                                              ; preds = %267
  tail call void @llvm.trap(), !dbg !1245
  unreachable, !dbg !1247

350:                                              ; preds = %267
  %351 = icmp eq i32 %347, 0, !dbg !1248
  %352 = add nuw i32 %347, 7, !dbg !1249
  %353 = select i1 %351, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %352, !dbg !1250
  %354 = and i32 %353, -8, !dbg !1251
    #dbg_value(i32 %354, !57, !DIExpression(), !1242)
    #dbg_value(i32 4, !58, !DIExpression(), !1242)
  %355 = or disjoint i32 %354, 4, !dbg !1252
  store i32 %355, ptr @ink_top, align 4, !dbg !1253, !tbaa !27
  %356 = add i32 %354, 65539, !dbg !1254
  %357 = lshr i32 %356, 16, !dbg !1255
    #dbg_value(i32 %357, !59, !DIExpression(), !1242)
  %358 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1256
    #dbg_value(i32 %358, !60, !DIExpression(), !1242)
  %359 = icmp ugt i32 %357, %358, !dbg !1257
  br i1 %359, label %360, label %365, !dbg !1258

360:                                              ; preds = %350
  %361 = sub nuw nsw i32 %357, %358, !dbg !1259
  %362 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %361), !dbg !1260
  %363 = icmp eq i32 %362, -1, !dbg !1261
  br i1 %363, label %364, label %365, !dbg !1258

364:                                              ; preds = %360
  tail call void @llvm.trap(), !dbg !1262
  unreachable, !dbg !1264

365:                                              ; preds = %350, %360
  %366 = inttoptr i32 %354 to ptr, !dbg !1265
    #dbg_value(ptr %366, !1030, !DIExpression(), !1225)
  store i32 %346, ptr %366, align 8, !dbg !1266, !tbaa !330
  store ptr %366, ptr %3, align 4, !dbg !1267, !tbaa !973
  store i32 1, ptr %4, align 4, !dbg !1268, !tbaa !27
  br label %654

367:                                              ; preds = %5
  %368 = load ptr, ptr %1, align 4, !dbg !1269, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1082)
    #dbg_value(ptr %368, !115, !DIExpression(), !1082)
    #dbg_value(i32 4, !116, !DIExpression(), !1082)
    #dbg_value(ptr undef, !117, !DIExpression(), !1082)
    #dbg_value(ptr %368, !119, !DIExpression(), !1082)
    #dbg_value(i32 0, !122, !DIExpression(), !1270)
  %369 = load i8, ptr %368, align 1, !dbg !1271, !tbaa !132
    #dbg_value(i8 %369, !1031, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1272)
    #dbg_value(i32 1, !122, !DIExpression(), !1270)
  %370 = getelementptr inbounds nuw i8, ptr %368, i32 1, !dbg !1271
  %371 = load i8, ptr %370, align 1, !dbg !1271, !tbaa !132
    #dbg_value(i8 %371, !1031, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1272)
    #dbg_value(i32 2, !122, !DIExpression(), !1270)
  %372 = getelementptr inbounds nuw i8, ptr %368, i32 2, !dbg !1271
  %373 = load i8, ptr %372, align 1, !dbg !1271, !tbaa !132
    #dbg_value(i8 %373, !1031, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1272)
    #dbg_value(i32 3, !122, !DIExpression(), !1270)
  %374 = getelementptr inbounds nuw i8, ptr %368, i32 3, !dbg !1271
  %375 = load i8, ptr %374, align 1, !dbg !1271, !tbaa !132
    #dbg_value(i8 %375, !1031, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1272)
    #dbg_value(i32 4, !122, !DIExpression(), !1270)
  %376 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1273
  %377 = load ptr, ptr %376, align 4, !dbg !1273, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1084)
    #dbg_value(ptr %377, !115, !DIExpression(), !1084)
    #dbg_value(i32 4, !116, !DIExpression(), !1084)
    #dbg_value(ptr undef, !117, !DIExpression(), !1084)
    #dbg_value(ptr %377, !119, !DIExpression(), !1084)
    #dbg_value(i32 0, !122, !DIExpression(), !1274)
  %378 = load i8, ptr %377, align 1, !dbg !1275, !tbaa !132
    #dbg_value(i8 %378, !1033, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1272)
    #dbg_value(i32 1, !122, !DIExpression(), !1274)
  %379 = getelementptr inbounds nuw i8, ptr %377, i32 1, !dbg !1275
  %380 = load i8, ptr %379, align 1, !dbg !1275, !tbaa !132
    #dbg_value(i8 %380, !1033, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1272)
    #dbg_value(i32 2, !122, !DIExpression(), !1274)
  %381 = getelementptr inbounds nuw i8, ptr %377, i32 2, !dbg !1275
  %382 = load i8, ptr %381, align 1, !dbg !1275, !tbaa !132
    #dbg_value(i8 %382, !1033, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1272)
    #dbg_value(i32 3, !122, !DIExpression(), !1274)
  %383 = getelementptr inbounds nuw i8, ptr %377, i32 3, !dbg !1275
  %384 = load i8, ptr %383, align 1, !dbg !1275, !tbaa !132
    #dbg_value(i8 %384, !1033, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1272)
    #dbg_value(i32 4, !122, !DIExpression(), !1274)
  %385 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1276
  %386 = load ptr, ptr %385, align 4, !dbg !1276, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1086)
    #dbg_value(ptr %386, !115, !DIExpression(), !1086)
    #dbg_value(i32 4, !116, !DIExpression(), !1086)
    #dbg_value(ptr undef, !117, !DIExpression(), !1086)
    #dbg_value(ptr %386, !119, !DIExpression(), !1086)
    #dbg_value(i32 0, !122, !DIExpression(), !1277)
  %387 = load i8, ptr %386, align 1, !dbg !1278, !tbaa !132
    #dbg_value(i8 %387, !1034, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1272)
    #dbg_value(i32 1, !122, !DIExpression(), !1277)
  %388 = getelementptr inbounds nuw i8, ptr %386, i32 1, !dbg !1278
  %389 = load i8, ptr %388, align 1, !dbg !1278, !tbaa !132
    #dbg_value(i8 %389, !1034, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1272)
    #dbg_value(i32 2, !122, !DIExpression(), !1277)
  %390 = getelementptr inbounds nuw i8, ptr %386, i32 2, !dbg !1278
  %391 = load i8, ptr %390, align 1, !dbg !1278, !tbaa !132
    #dbg_value(i8 %391, !1034, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1272)
    #dbg_value(i32 3, !122, !DIExpression(), !1277)
  %392 = getelementptr inbounds nuw i8, ptr %386, i32 3, !dbg !1278
  %393 = load i8, ptr %392, align 1, !dbg !1278, !tbaa !132
    #dbg_value(i8 %393, !1034, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1272)
    #dbg_value(i32 4, !122, !DIExpression(), !1277)
  %394 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1279
  %395 = load ptr, ptr %394, align 4, !dbg !1279, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1088)
    #dbg_value(ptr %395, !115, !DIExpression(), !1088)
    #dbg_value(i32 4, !116, !DIExpression(), !1088)
    #dbg_value(ptr undef, !117, !DIExpression(), !1088)
    #dbg_value(ptr %395, !119, !DIExpression(), !1088)
    #dbg_value(i32 0, !122, !DIExpression(), !1280)
  %396 = load i8, ptr %395, align 1, !dbg !1281, !tbaa !132
    #dbg_value(i8 %396, !1035, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1272)
    #dbg_value(i32 1, !122, !DIExpression(), !1280)
  %397 = getelementptr inbounds nuw i8, ptr %395, i32 1, !dbg !1281
  %398 = load i8, ptr %397, align 1, !dbg !1281, !tbaa !132
    #dbg_value(i8 %398, !1035, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1272)
    #dbg_value(i32 2, !122, !DIExpression(), !1280)
  %399 = getelementptr inbounds nuw i8, ptr %395, i32 2, !dbg !1281
  %400 = load i8, ptr %399, align 1, !dbg !1281, !tbaa !132
    #dbg_value(i8 %400, !1035, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1272)
    #dbg_value(i32 3, !122, !DIExpression(), !1280)
  %401 = getelementptr inbounds nuw i8, ptr %395, i32 3, !dbg !1281
  %402 = load i8, ptr %401, align 1, !dbg !1281, !tbaa !132
    #dbg_value(i8 %402, !1035, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1272)
    #dbg_value(i32 4, !122, !DIExpression(), !1280)
  %403 = zext i8 %375 to i32, !dbg !1282
  %404 = shl nuw i32 %403, 24, !dbg !1282
  %405 = zext i8 %373 to i32, !dbg !1282
  %406 = shl nuw nsw i32 %405, 16, !dbg !1282
  %407 = or disjoint i32 %404, %406, !dbg !1282
  %408 = zext i8 %371 to i32, !dbg !1282
  %409 = shl nuw nsw i32 %408, 8, !dbg !1282
  %410 = or disjoint i32 %407, %409, !dbg !1282
  %411 = zext i8 %369 to i32, !dbg !1282
  %412 = or disjoint i32 %410, %411, !dbg !1282
  %413 = zext i8 %384 to i32, !dbg !1283
  %414 = shl nuw i32 %413, 24, !dbg !1283
  %415 = zext i8 %382 to i32, !dbg !1283
  %416 = shl nuw nsw i32 %415, 16, !dbg !1283
  %417 = or disjoint i32 %414, %416, !dbg !1283
  %418 = zext i8 %380 to i32, !dbg !1283
  %419 = shl nuw nsw i32 %418, 8, !dbg !1283
  %420 = or disjoint i32 %417, %419, !dbg !1283
  %421 = zext i8 %378 to i32, !dbg !1283
  %422 = or disjoint i32 %420, %421, !dbg !1283
  %423 = zext i8 %393 to i32, !dbg !1284
  %424 = shl nuw i32 %423, 24, !dbg !1284
  %425 = zext i8 %391 to i32, !dbg !1284
  %426 = shl nuw nsw i32 %425, 16, !dbg !1284
  %427 = or disjoint i32 %424, %426, !dbg !1284
  %428 = zext i8 %389 to i32, !dbg !1284
  %429 = shl nuw nsw i32 %428, 8, !dbg !1284
  %430 = or disjoint i32 %427, %429, !dbg !1284
  %431 = zext i8 %387 to i32, !dbg !1284
  %432 = or disjoint i32 %430, %431, !dbg !1284
  %433 = zext i8 %402 to i32, !dbg !1285
  %434 = shl nuw i32 %433, 24, !dbg !1285
  %435 = zext i8 %400 to i32, !dbg !1285
  %436 = shl nuw nsw i32 %435, 16, !dbg !1285
  %437 = or disjoint i32 %434, %436, !dbg !1285
  %438 = zext i8 %398 to i32, !dbg !1285
  %439 = shl nuw nsw i32 %438, 8, !dbg !1285
  %440 = or disjoint i32 %437, %439, !dbg !1285
  %441 = zext i8 %396 to i32, !dbg !1285
  %442 = or disjoint i32 %440, %441, !dbg !1285
    #dbg_value(i32 %412, !571, !DIExpression(), !1287)
    #dbg_value(i32 %422, !572, !DIExpression(), !1287)
    #dbg_value(i32 %432, !573, !DIExpression(), !1287)
    #dbg_value(i32 %442, !574, !DIExpression(), !1287)
    #dbg_value(i32 %412, !575, !DIExpression(), !1287)
  %443 = icmp ult i32 %412, %432, !dbg !1285
  %444 = add i32 %442, %422, !dbg !1288
  %445 = mul i32 %422, 3, !dbg !1288
  %446 = select i1 %443, i32 %444, i32 %445, !dbg !1288
    #dbg_value(i32 %446, !576, !DIExpression(), !1287)
    #dbg_value(i32 %446, !1036, !DIExpression(), !1272)
    #dbg_value(i32 1, !55, !DIExpression(), !1289)
    #dbg_value(i32 4, !56, !DIExpression(), !1289)
  %447 = load i32, ptr @ink_top, align 4
  %448 = icmp ugt i32 %447, -8
  br i1 %448, label %449, label %450, !dbg !1291

449:                                              ; preds = %367
  tail call void @llvm.trap(), !dbg !1292
  unreachable, !dbg !1294

450:                                              ; preds = %367
  %451 = icmp eq i32 %447, 0, !dbg !1295
  %452 = add nuw i32 %447, 7, !dbg !1296
  %453 = select i1 %451, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %452, !dbg !1297
  %454 = and i32 %453, -8, !dbg !1298
    #dbg_value(i32 %454, !57, !DIExpression(), !1289)
    #dbg_value(i32 4, !58, !DIExpression(), !1289)
  %455 = or disjoint i32 %454, 4, !dbg !1299
  store i32 %455, ptr @ink_top, align 4, !dbg !1300, !tbaa !27
  %456 = add i32 %454, 65539, !dbg !1301
  %457 = lshr i32 %456, 16, !dbg !1302
    #dbg_value(i32 %457, !59, !DIExpression(), !1289)
  %458 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1303
    #dbg_value(i32 %458, !60, !DIExpression(), !1289)
  %459 = icmp ugt i32 %457, %458, !dbg !1304
  br i1 %459, label %460, label %465, !dbg !1305

460:                                              ; preds = %450
  %461 = sub nuw nsw i32 %457, %458, !dbg !1306
  %462 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %461), !dbg !1307
  %463 = icmp eq i32 %462, -1, !dbg !1308
  br i1 %463, label %464, label %465, !dbg !1305

464:                                              ; preds = %460
  tail call void @llvm.trap(), !dbg !1309
  unreachable, !dbg !1311

465:                                              ; preds = %450, %460
  %466 = inttoptr i32 %454 to ptr, !dbg !1312
    #dbg_value(ptr %466, !1037, !DIExpression(), !1272)
  store i32 %446, ptr %466, align 8, !dbg !1313, !tbaa !330
  store ptr %466, ptr %3, align 4, !dbg !1314, !tbaa !973
  store i32 1, ptr %4, align 4, !dbg !1315, !tbaa !27
  br label %654

467:                                              ; preds = %5
  %468 = load ptr, ptr %1, align 4, !dbg !1316, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1090)
    #dbg_value(ptr %468, !115, !DIExpression(), !1090)
    #dbg_value(i32 4, !116, !DIExpression(), !1090)
    #dbg_value(ptr undef, !117, !DIExpression(), !1090)
    #dbg_value(ptr %468, !119, !DIExpression(), !1090)
    #dbg_value(i32 0, !122, !DIExpression(), !1317)
  %469 = load i8, ptr %468, align 1, !dbg !1318, !tbaa !132
    #dbg_value(i8 %469, !1038, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1319)
    #dbg_value(i32 1, !122, !DIExpression(), !1317)
  %470 = getelementptr inbounds nuw i8, ptr %468, i32 1, !dbg !1318
  %471 = load i8, ptr %470, align 1, !dbg !1318, !tbaa !132
    #dbg_value(i8 %471, !1038, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1319)
    #dbg_value(i32 2, !122, !DIExpression(), !1317)
  %472 = getelementptr inbounds nuw i8, ptr %468, i32 2, !dbg !1318
  %473 = load i8, ptr %472, align 1, !dbg !1318, !tbaa !132
    #dbg_value(i8 %473, !1038, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1319)
    #dbg_value(i32 3, !122, !DIExpression(), !1317)
  %474 = getelementptr inbounds nuw i8, ptr %468, i32 3, !dbg !1318
  %475 = load i8, ptr %474, align 1, !dbg !1318, !tbaa !132
    #dbg_value(i8 %475, !1038, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1319)
    #dbg_value(i32 4, !122, !DIExpression(), !1317)
  %476 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1320
  %477 = load ptr, ptr %476, align 4, !dbg !1320, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1092)
    #dbg_value(ptr %477, !115, !DIExpression(), !1092)
    #dbg_value(i32 4, !116, !DIExpression(), !1092)
    #dbg_value(ptr undef, !117, !DIExpression(), !1092)
    #dbg_value(ptr %477, !119, !DIExpression(), !1092)
    #dbg_value(i32 0, !122, !DIExpression(), !1321)
  %478 = load i8, ptr %477, align 1, !dbg !1322, !tbaa !132
    #dbg_value(i8 %478, !1040, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1319)
    #dbg_value(i32 1, !122, !DIExpression(), !1321)
  %479 = getelementptr inbounds nuw i8, ptr %477, i32 1, !dbg !1322
  %480 = load i8, ptr %479, align 1, !dbg !1322, !tbaa !132
    #dbg_value(i8 %480, !1040, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1319)
    #dbg_value(i32 2, !122, !DIExpression(), !1321)
  %481 = getelementptr inbounds nuw i8, ptr %477, i32 2, !dbg !1322
  %482 = load i8, ptr %481, align 1, !dbg !1322, !tbaa !132
    #dbg_value(i8 %482, !1040, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1319)
    #dbg_value(i32 3, !122, !DIExpression(), !1321)
  %483 = getelementptr inbounds nuw i8, ptr %477, i32 3, !dbg !1322
  %484 = load i8, ptr %483, align 1, !dbg !1322, !tbaa !132
    #dbg_value(i8 %484, !1040, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1319)
    #dbg_value(i32 4, !122, !DIExpression(), !1321)
    #dbg_value(i32 poison, !122, !DIExpression(), !1323)
  %485 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1325
  %486 = load ptr, ptr %485, align 4, !dbg !1325, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1094)
    #dbg_value(ptr %486, !115, !DIExpression(), !1094)
    #dbg_value(i32 4, !116, !DIExpression(), !1094)
    #dbg_value(ptr undef, !117, !DIExpression(), !1094)
    #dbg_value(ptr %486, !119, !DIExpression(), !1094)
    #dbg_value(i32 0, !122, !DIExpression(), !1326)
  %487 = load i8, ptr %486, align 1, !dbg !1327, !tbaa !132
    #dbg_value(i8 %487, !1042, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1319)
    #dbg_value(i32 1, !122, !DIExpression(), !1326)
  %488 = getelementptr inbounds nuw i8, ptr %486, i32 1, !dbg !1327
  %489 = load i8, ptr %488, align 1, !dbg !1327, !tbaa !132
    #dbg_value(i8 %489, !1042, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1319)
    #dbg_value(i32 2, !122, !DIExpression(), !1326)
  %490 = getelementptr inbounds nuw i8, ptr %486, i32 2, !dbg !1327
  %491 = load i8, ptr %490, align 1, !dbg !1327, !tbaa !132
    #dbg_value(i8 %491, !1042, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1319)
    #dbg_value(i32 3, !122, !DIExpression(), !1326)
  %492 = getelementptr inbounds nuw i8, ptr %486, i32 3, !dbg !1327
  %493 = load i8, ptr %492, align 1, !dbg !1327, !tbaa !132
    #dbg_value(i8 %493, !1042, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1319)
    #dbg_value(i32 4, !122, !DIExpression(), !1326)
  %494 = zext i8 %475 to i32, !dbg !1328
  %495 = shl nuw i32 %494, 24, !dbg !1328
  %496 = zext i8 %473 to i32, !dbg !1328
  %497 = shl nuw nsw i32 %496, 16, !dbg !1328
  %498 = or disjoint i32 %495, %497, !dbg !1328
  %499 = zext i8 %471 to i32, !dbg !1328
  %500 = shl nuw nsw i32 %499, 8, !dbg !1328
  %501 = or disjoint i32 %498, %500, !dbg !1328
  %502 = zext i8 %469 to i32, !dbg !1328
  %503 = or disjoint i32 %501, %502, !dbg !1328
  %504 = zext i8 %484 to i32, !dbg !1329
  %505 = shl nuw i32 %504, 24, !dbg !1329
  %506 = zext i8 %482 to i32, !dbg !1329
  %507 = shl nuw nsw i32 %506, 16, !dbg !1329
  %508 = or disjoint i32 %505, %507, !dbg !1329
  %509 = zext i8 %480 to i32, !dbg !1329
  %510 = shl nuw nsw i32 %509, 8, !dbg !1329
  %511 = or disjoint i32 %508, %510, !dbg !1329
  %512 = zext i8 %478 to i32, !dbg !1329
  %513 = or disjoint i32 %511, %512, !dbg !1329
  %514 = zext i8 %493 to i32, !dbg !1330
  %515 = shl nuw i32 %514, 24, !dbg !1330
  %516 = zext i8 %491 to i32, !dbg !1330
  %517 = shl nuw nsw i32 %516, 16, !dbg !1330
  %518 = or disjoint i32 %515, %517, !dbg !1330
  %519 = zext i8 %489 to i32, !dbg !1330
  %520 = shl nuw nsw i32 %519, 8, !dbg !1330
  %521 = or disjoint i32 %518, %520, !dbg !1330
  %522 = zext i8 %487 to i32, !dbg !1330
  %523 = or disjoint i32 %521, %522, !dbg !1330
    #dbg_value(i32 %503, !588, !DIExpression(), !1332)
    #dbg_value(i32 %513, !589, !DIExpression(), !1332)
    #dbg_value(i32 poison, !590, !DIExpression(), !1332)
    #dbg_value(i32 %523, !591, !DIExpression(), !1332)
    #dbg_value(i32 %503, !592, !DIExpression(), !1332)
    #dbg_value(i32 %513, !593, !DIExpression(), !1332)
    #dbg_value(i32 poison, !594, !DIExpression(), !1332)
    #dbg_value(i32 %523, !595, !DIExpression(), !1332)
    #dbg_value(i32 %503, !596, !DIExpression(), !1332)
  %524 = icmp ult i32 %503, %513, !dbg !1330
  %525 = icmp eq i32 %523, 0, !dbg !1333
  br i1 %524, label %526, label %532, !dbg !1334

526:                                              ; preds = %467
    #dbg_value(i32 %503, !598, !DIExpression(), !1335)
    #dbg_value(i32 %523, !601, !DIExpression(), !1335)
  br i1 %525, label %529, label %527, !dbg !1336

527:                                              ; preds = %526
  %528 = udiv i32 %503, %523, !dbg !1337
    #dbg_value(i32 %528, !602, !DIExpression(), !1335)
  br label %529

529:                                              ; preds = %527, %526
  %530 = phi i32 [ %528, %527 ], [ 0, %526 ], !dbg !1338
    #dbg_value(i32 %530, !602, !DIExpression(), !1335)
    #dbg_value(i32 %530, !603, !DIExpression(), !1335)
  %531 = add i32 %530, %513, !dbg !1339
    #dbg_value(i32 %531, !597, !DIExpression(), !1332)
  br label %538, !dbg !1340

532:                                              ; preds = %467
    #dbg_value(i32 %513, !604, !DIExpression(), !1341)
    #dbg_value(i32 %523, !606, !DIExpression(), !1341)
  br i1 %525, label %535, label %533, !dbg !1342

533:                                              ; preds = %532
  %534 = urem i32 %513, %523, !dbg !1343
    #dbg_value(i32 %534, !607, !DIExpression(), !1341)
  br label %535

535:                                              ; preds = %533, %532
  %536 = phi i32 [ %534, %533 ], [ 0, %532 ], !dbg !1344
    #dbg_value(i32 %536, !607, !DIExpression(), !1341)
    #dbg_value(i32 %536, !608, !DIExpression(), !1341)
  %537 = add i32 %536, %503, !dbg !1345
    #dbg_value(i32 %537, !597, !DIExpression(), !1332)
  br label %538

538:                                              ; preds = %529, %535
  %539 = phi i32 [ %531, %529 ], [ %537, %535 ], !dbg !1333
    #dbg_value(i32 %539, !597, !DIExpression(), !1332)
    #dbg_value(i32 %539, !1043, !DIExpression(), !1319)
    #dbg_value(i32 1, !55, !DIExpression(), !1346)
    #dbg_value(i32 4, !56, !DIExpression(), !1346)
  %540 = load i32, ptr @ink_top, align 4
  %541 = icmp ugt i32 %540, -8
  br i1 %541, label %542, label %543, !dbg !1348

542:                                              ; preds = %538
  tail call void @llvm.trap(), !dbg !1349
  unreachable, !dbg !1351

543:                                              ; preds = %538
  %544 = icmp eq i32 %540, 0, !dbg !1352
  %545 = add nuw i32 %540, 7, !dbg !1353
  %546 = select i1 %544, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %545, !dbg !1354
  %547 = and i32 %546, -8, !dbg !1355
    #dbg_value(i32 %547, !57, !DIExpression(), !1346)
    #dbg_value(i32 4, !58, !DIExpression(), !1346)
  %548 = or disjoint i32 %547, 4, !dbg !1356
  store i32 %548, ptr @ink_top, align 4, !dbg !1357, !tbaa !27
  %549 = add i32 %547, 65539, !dbg !1358
  %550 = lshr i32 %549, 16, !dbg !1359
    #dbg_value(i32 %550, !59, !DIExpression(), !1346)
  %551 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1360
    #dbg_value(i32 %551, !60, !DIExpression(), !1346)
  %552 = icmp ugt i32 %550, %551, !dbg !1361
  br i1 %552, label %553, label %558, !dbg !1362

553:                                              ; preds = %543
  %554 = sub nuw nsw i32 %550, %551, !dbg !1363
  %555 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %554), !dbg !1364
  %556 = icmp eq i32 %555, -1, !dbg !1365
  br i1 %556, label %557, label %558, !dbg !1362

557:                                              ; preds = %553
  tail call void @llvm.trap(), !dbg !1366
  unreachable, !dbg !1368

558:                                              ; preds = %543, %553
  %559 = inttoptr i32 %547 to ptr, !dbg !1369
    #dbg_value(ptr %559, !1044, !DIExpression(), !1319)
  store i32 %539, ptr %559, align 8, !dbg !1370, !tbaa !330
  store ptr %559, ptr %3, align 4, !dbg !1371, !tbaa !973
  store i32 1, ptr %4, align 4, !dbg !1372, !tbaa !27
  br label %654

560:                                              ; preds = %5
  %561 = load ptr, ptr %1, align 4, !dbg !1373, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1096)
    #dbg_value(ptr %561, !115, !DIExpression(), !1096)
    #dbg_value(i32 4, !116, !DIExpression(), !1096)
    #dbg_value(ptr undef, !117, !DIExpression(), !1096)
    #dbg_value(ptr %561, !119, !DIExpression(), !1096)
    #dbg_value(i32 0, !122, !DIExpression(), !1374)
  %562 = load i8, ptr %561, align 1, !dbg !1375, !tbaa !132
    #dbg_value(i8 %562, !1045, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1376)
    #dbg_value(i32 1, !122, !DIExpression(), !1374)
  %563 = getelementptr inbounds nuw i8, ptr %561, i32 1, !dbg !1375
  %564 = load i8, ptr %563, align 1, !dbg !1375, !tbaa !132
    #dbg_value(i8 %564, !1045, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1376)
    #dbg_value(i32 2, !122, !DIExpression(), !1374)
  %565 = getelementptr inbounds nuw i8, ptr %561, i32 2, !dbg !1375
  %566 = load i8, ptr %565, align 1, !dbg !1375, !tbaa !132
    #dbg_value(i8 %566, !1045, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1376)
    #dbg_value(i32 3, !122, !DIExpression(), !1374)
  %567 = getelementptr inbounds nuw i8, ptr %561, i32 3, !dbg !1375
  %568 = load i8, ptr %567, align 1, !dbg !1375, !tbaa !132
    #dbg_value(i8 %568, !1045, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1376)
    #dbg_value(i32 4, !122, !DIExpression(), !1374)
  %569 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1377
  %570 = load ptr, ptr %569, align 4, !dbg !1377, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1098)
    #dbg_value(ptr %570, !115, !DIExpression(), !1098)
    #dbg_value(i32 4, !116, !DIExpression(), !1098)
    #dbg_value(ptr undef, !117, !DIExpression(), !1098)
    #dbg_value(ptr %570, !119, !DIExpression(), !1098)
    #dbg_value(i32 0, !122, !DIExpression(), !1378)
  %571 = load i8, ptr %570, align 1, !dbg !1379, !tbaa !132
    #dbg_value(i8 %571, !1047, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1376)
    #dbg_value(i32 1, !122, !DIExpression(), !1378)
  %572 = getelementptr inbounds nuw i8, ptr %570, i32 1, !dbg !1379
  %573 = load i8, ptr %572, align 1, !dbg !1379, !tbaa !132
    #dbg_value(i8 %573, !1047, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1376)
    #dbg_value(i32 2, !122, !DIExpression(), !1378)
  %574 = getelementptr inbounds nuw i8, ptr %570, i32 2, !dbg !1379
  %575 = load i8, ptr %574, align 1, !dbg !1379, !tbaa !132
    #dbg_value(i8 %575, !1047, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1376)
    #dbg_value(i32 3, !122, !DIExpression(), !1378)
  %576 = getelementptr inbounds nuw i8, ptr %570, i32 3, !dbg !1379
  %577 = load i8, ptr %576, align 1, !dbg !1379, !tbaa !132
    #dbg_value(i8 %577, !1047, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1376)
    #dbg_value(i32 4, !122, !DIExpression(), !1378)
    #dbg_value(i32 poison, !122, !DIExpression(), !1380)
  %578 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1382
  %579 = load ptr, ptr %578, align 4, !dbg !1382, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1100)
    #dbg_value(ptr %579, !115, !DIExpression(), !1100)
    #dbg_value(i32 4, !116, !DIExpression(), !1100)
    #dbg_value(ptr undef, !117, !DIExpression(), !1100)
    #dbg_value(ptr %579, !119, !DIExpression(), !1100)
    #dbg_value(i32 0, !122, !DIExpression(), !1383)
  %580 = load i8, ptr %579, align 1, !dbg !1384, !tbaa !132
    #dbg_value(i8 %580, !1049, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1376)
    #dbg_value(i32 1, !122, !DIExpression(), !1383)
  %581 = getelementptr inbounds nuw i8, ptr %579, i32 1, !dbg !1384
  %582 = load i8, ptr %581, align 1, !dbg !1384, !tbaa !132
    #dbg_value(i8 %582, !1049, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1376)
    #dbg_value(i32 2, !122, !DIExpression(), !1383)
  %583 = getelementptr inbounds nuw i8, ptr %579, i32 2, !dbg !1384
  %584 = load i8, ptr %583, align 1, !dbg !1384, !tbaa !132
    #dbg_value(i8 %584, !1049, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1376)
    #dbg_value(i32 3, !122, !DIExpression(), !1383)
  %585 = getelementptr inbounds nuw i8, ptr %579, i32 3, !dbg !1384
  %586 = load i8, ptr %585, align 1, !dbg !1384, !tbaa !132
    #dbg_value(i8 %586, !1049, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1376)
    #dbg_value(i32 4, !122, !DIExpression(), !1383)
  %587 = zext i8 %568 to i32, !dbg !1385
  %588 = shl nuw i32 %587, 24, !dbg !1385
  %589 = zext i8 %566 to i32, !dbg !1385
  %590 = shl nuw nsw i32 %589, 16, !dbg !1385
  %591 = or disjoint i32 %588, %590, !dbg !1385
  %592 = zext i8 %564 to i32, !dbg !1385
  %593 = shl nuw nsw i32 %592, 8, !dbg !1385
  %594 = or disjoint i32 %591, %593, !dbg !1385
  %595 = zext i8 %562 to i32, !dbg !1385
  %596 = or disjoint i32 %594, %595, !dbg !1385
  %597 = zext i8 %577 to i32, !dbg !1386
  %598 = shl nuw i32 %597, 24, !dbg !1386
  %599 = zext i8 %575 to i32, !dbg !1386
  %600 = shl nuw nsw i32 %599, 16, !dbg !1386
  %601 = or disjoint i32 %598, %600, !dbg !1386
  %602 = zext i8 %573 to i32, !dbg !1386
  %603 = shl nuw nsw i32 %602, 8, !dbg !1386
  %604 = or disjoint i32 %601, %603, !dbg !1386
  %605 = zext i8 %571 to i32, !dbg !1386
  %606 = or disjoint i32 %604, %605, !dbg !1386
  %607 = zext i8 %586 to i32, !dbg !1387
  %608 = shl nuw i32 %607, 24, !dbg !1387
  %609 = zext i8 %584 to i32, !dbg !1387
  %610 = shl nuw nsw i32 %609, 16, !dbg !1387
  %611 = or disjoint i32 %608, %610, !dbg !1387
  %612 = zext i8 %582 to i32, !dbg !1387
  %613 = shl nuw nsw i32 %612, 8, !dbg !1387
  %614 = or disjoint i32 %611, %613, !dbg !1387
  %615 = zext i8 %580 to i32, !dbg !1387
  %616 = or disjoint i32 %614, %615, !dbg !1387
    #dbg_value(i32 %596, !631, !DIExpression(), !1389)
    #dbg_value(i32 %606, !632, !DIExpression(), !1389)
    #dbg_value(i32 poison, !633, !DIExpression(), !1389)
    #dbg_value(i32 %616, !634, !DIExpression(), !1389)
    #dbg_value(i32 %596, !635, !DIExpression(), !1389)
  %617 = icmp ult i32 %596, %606, !dbg !1387
  %618 = icmp eq i32 %616, 0, !dbg !1390
  br i1 %617, label %619, label %625, !dbg !1391

619:                                              ; preds = %560
    #dbg_value(i32 %596, !637, !DIExpression(), !1392)
    #dbg_value(i32 %616, !640, !DIExpression(), !1392)
  br i1 %618, label %622, label %620, !dbg !1393

620:                                              ; preds = %619
  %621 = udiv i32 %596, %616, !dbg !1394
    #dbg_value(i32 %621, !641, !DIExpression(), !1392)
  br label %622

622:                                              ; preds = %620, %619
  %623 = phi i32 [ %621, %620 ], [ 0, %619 ], !dbg !1395
    #dbg_value(i32 %623, !641, !DIExpression(), !1392)
    #dbg_value(i32 %623, !642, !DIExpression(), !1392)
  %624 = add i32 %623, %606, !dbg !1396
    #dbg_value(i32 %624, !636, !DIExpression(), !1389)
  br label %631, !dbg !1397

625:                                              ; preds = %560
    #dbg_value(i32 %606, !643, !DIExpression(), !1398)
    #dbg_value(i32 %616, !645, !DIExpression(), !1398)
  br i1 %618, label %628, label %626, !dbg !1399

626:                                              ; preds = %625
  %627 = urem i32 %606, %616, !dbg !1400
    #dbg_value(i32 %627, !646, !DIExpression(), !1398)
  br label %628

628:                                              ; preds = %626, %625
  %629 = phi i32 [ %627, %626 ], [ 0, %625 ], !dbg !1401
    #dbg_value(i32 %629, !646, !DIExpression(), !1398)
    #dbg_value(i32 %629, !647, !DIExpression(), !1398)
  %630 = add i32 %629, %596, !dbg !1402
    #dbg_value(i32 %630, !636, !DIExpression(), !1389)
  br label %631

631:                                              ; preds = %622, %628
  %632 = phi i32 [ %624, %622 ], [ %630, %628 ], !dbg !1390
    #dbg_value(i32 %632, !636, !DIExpression(), !1389)
    #dbg_value(i32 %632, !1050, !DIExpression(), !1376)
    #dbg_value(i32 1, !55, !DIExpression(), !1403)
    #dbg_value(i32 4, !56, !DIExpression(), !1403)
  %633 = load i32, ptr @ink_top, align 4
  %634 = icmp ugt i32 %633, -8
  br i1 %634, label %635, label %636, !dbg !1405

635:                                              ; preds = %631
  tail call void @llvm.trap(), !dbg !1406
  unreachable, !dbg !1408

636:                                              ; preds = %631
  %637 = icmp eq i32 %633, 0, !dbg !1409
  %638 = add nuw i32 %633, 7, !dbg !1410
  %639 = select i1 %637, i32 add (i32 ptrtoint (ptr @__heap_base to i32), i32 7), i32 %638, !dbg !1411
  %640 = and i32 %639, -8, !dbg !1412
    #dbg_value(i32 %640, !57, !DIExpression(), !1403)
    #dbg_value(i32 4, !58, !DIExpression(), !1403)
  %641 = or disjoint i32 %640, 4, !dbg !1413
  store i32 %641, ptr @ink_top, align 4, !dbg !1414, !tbaa !27
  %642 = add i32 %640, 65539, !dbg !1415
  %643 = lshr i32 %642, 16, !dbg !1416
    #dbg_value(i32 %643, !59, !DIExpression(), !1403)
  %644 = tail call i32 @llvm.wasm.memory.size.i32(i32 0), !dbg !1417
    #dbg_value(i32 %644, !60, !DIExpression(), !1403)
  %645 = icmp ugt i32 %643, %644, !dbg !1418
  br i1 %645, label %646, label %651, !dbg !1419

646:                                              ; preds = %636
  %647 = sub nuw nsw i32 %643, %644, !dbg !1420
  %648 = tail call i32 @llvm.wasm.memory.grow.i32(i32 0, i32 %647), !dbg !1421
  %649 = icmp eq i32 %648, -1, !dbg !1422
  br i1 %649, label %650, label %651, !dbg !1419

650:                                              ; preds = %646
  tail call void @llvm.trap(), !dbg !1423
  unreachable, !dbg !1425

651:                                              ; preds = %636, %646
  %652 = inttoptr i32 %640 to ptr, !dbg !1426
    #dbg_value(ptr %652, !1051, !DIExpression(), !1376)
  store i32 %632, ptr %652, align 8, !dbg !1427, !tbaa !330
  store ptr %652, ptr %3, align 4, !dbg !1428, !tbaa !973
  store i32 1, ptr %4, align 4, !dbg !1429, !tbaa !27
  br label %654

653:                                              ; preds = %5
  tail call void @llvm.trap(), !dbg !1430
  unreachable, !dbg !1432

654:                                              ; preds = %651, %558, %465, %365, %265, %161, %9
  ret void, !dbg !1433
}

; Function Attrs: nounwind memory(read, inaccessiblemem: write) uwtable
define hidden i32 @ink_compute_scalar32(i32 noundef %0, ptr nocapture noundef readonly %1, ptr nocapture noundef readnone %2) local_unnamed_addr #9 !dbg !1434 {
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1478)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1478)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1478)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1478)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1478)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1478)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1478)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1478)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1480)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1480)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1480)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1480)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1480)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1480)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1480)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1480)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1482)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1482)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1482)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1482)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1482)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1482)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1482)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1482)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1484)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1484)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1484)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1484)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1484)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1484)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1484)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1484)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1486)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1486)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1486)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1486)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1486)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1486)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1486)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1486)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1488)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1488)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1488)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1488)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1488)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1488)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1488)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1488)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1490)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1490)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1490)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1490)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1490)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1490)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1490)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1490)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1492)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1492)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1492)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1492)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1492)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1492)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1492)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1492)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1494)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1494)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1494)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1494)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1494)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1494)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1494)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1494)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1496)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1496)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1496)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1496)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1496)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1496)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1496)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1496)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1498)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1498)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1498)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1498)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1498)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1498)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1498)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1498)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1500)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1500)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1500)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1500)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1500)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1500)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1500)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1500)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1502)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1502)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1502)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1502)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1502)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1502)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1502)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1502)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1504)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1504)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1504)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1504)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1504)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1504)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1504)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1504)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1506)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1506)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1506)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1506)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1506)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1506)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1506)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1506)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1508)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1508)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1508)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1508)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1508)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1508)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1508)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1508)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1510)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1510)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1510)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1510)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1510)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1510)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1510)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1510)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1512)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1512)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1512)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1512)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1512)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1512)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1512)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1512)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1514)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1514)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1514)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1514)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1514)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1514)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1514)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1514)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1516)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1516)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1516)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1516)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1516)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1516)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1516)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1516)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1518)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1518)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1518)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1518)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1518)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1518)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1518)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1518)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1520)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1520)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1520)
    #dbg_value(ptr undef, !117, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1520)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1520)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1520)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1520)
    #dbg_value(ptr undef, !110, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1520)
    #dbg_value(i32 %0, !1438, !DIExpression(), !1522)
    #dbg_value(ptr %1, !1439, !DIExpression(), !1522)
    #dbg_value(ptr %2, !1440, !DIExpression(), !1522)
  switch i32 %0, label %474 [
    i32 1, label %4
    i32 2, label %88
    i32 3, label %172
    i32 4, label %252
    i32 5, label %332
    i32 6, label %403
  ], !dbg !1523

4:                                                ; preds = %3
    #dbg_value(ptr undef, !110, !DIExpression(), !1478)
    #dbg_value(ptr poison, !115, !DIExpression(), !1478)
    #dbg_value(i32 4, !116, !DIExpression(), !1478)
    #dbg_value(ptr undef, !117, !DIExpression(), !1478)
    #dbg_value(ptr poison, !119, !DIExpression(), !1478)
    #dbg_value(i8 poison, !1441, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1524)
    #dbg_value(i8 poison, !1441, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1524)
    #dbg_value(i8 poison, !1441, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1524)
    #dbg_value(i8 poison, !1441, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1524)
    #dbg_value(i32 4, !122, !DIExpression(), !1525)
    #dbg_value(ptr undef, !110, !DIExpression(), !1480)
    #dbg_value(ptr poison, !115, !DIExpression(), !1480)
    #dbg_value(i32 4, !116, !DIExpression(), !1480)
    #dbg_value(ptr undef, !117, !DIExpression(), !1480)
    #dbg_value(ptr poison, !119, !DIExpression(), !1480)
    #dbg_value(i8 poison, !1444, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1524)
    #dbg_value(i8 poison, !1444, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1524)
    #dbg_value(i8 poison, !1444, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1524)
    #dbg_value(i8 poison, !1444, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1524)
    #dbg_value(i32 4, !122, !DIExpression(), !1526)
  %5 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1527
  %6 = load ptr, ptr %5, align 4, !dbg !1527, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1482)
    #dbg_value(ptr %6, !115, !DIExpression(), !1482)
    #dbg_value(i32 4, !116, !DIExpression(), !1482)
    #dbg_value(ptr undef, !117, !DIExpression(), !1482)
    #dbg_value(ptr %6, !119, !DIExpression(), !1482)
    #dbg_value(i32 0, !122, !DIExpression(), !1528)
  %7 = load i8, ptr %6, align 1, !dbg !1529, !tbaa !132
    #dbg_value(i8 %7, !1445, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1524)
    #dbg_value(i32 1, !122, !DIExpression(), !1528)
  %8 = getelementptr inbounds nuw i8, ptr %6, i32 1, !dbg !1529
  %9 = load i8, ptr %8, align 1, !dbg !1529, !tbaa !132
    #dbg_value(i8 %9, !1445, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1524)
    #dbg_value(i32 2, !122, !DIExpression(), !1528)
  %10 = getelementptr inbounds nuw i8, ptr %6, i32 2, !dbg !1529
  %11 = load i8, ptr %10, align 1, !dbg !1529, !tbaa !132
    #dbg_value(i8 %11, !1445, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1524)
    #dbg_value(i32 3, !122, !DIExpression(), !1528)
  %12 = getelementptr inbounds nuw i8, ptr %6, i32 3, !dbg !1529
  %13 = load i8, ptr %12, align 1, !dbg !1529, !tbaa !132
    #dbg_value(i8 %13, !1445, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1524)
    #dbg_value(i32 4, !122, !DIExpression(), !1528)
  %14 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1530
  %15 = load ptr, ptr %14, align 4, !dbg !1530, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1484)
    #dbg_value(ptr %15, !115, !DIExpression(), !1484)
    #dbg_value(i32 4, !116, !DIExpression(), !1484)
    #dbg_value(ptr undef, !117, !DIExpression(), !1484)
    #dbg_value(ptr %15, !119, !DIExpression(), !1484)
    #dbg_value(i32 0, !122, !DIExpression(), !1531)
  %16 = load i8, ptr %15, align 1, !dbg !1532, !tbaa !132
    #dbg_value(i8 %16, !1446, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1524)
    #dbg_value(i32 1, !122, !DIExpression(), !1531)
  %17 = getelementptr inbounds nuw i8, ptr %15, i32 1, !dbg !1532
  %18 = load i8, ptr %17, align 1, !dbg !1532, !tbaa !132
    #dbg_value(i8 %18, !1446, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1524)
    #dbg_value(i32 2, !122, !DIExpression(), !1531)
  %19 = getelementptr inbounds nuw i8, ptr %15, i32 2, !dbg !1532
  %20 = load i8, ptr %19, align 1, !dbg !1532, !tbaa !132
    #dbg_value(i8 %20, !1446, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1524)
    #dbg_value(i32 3, !122, !DIExpression(), !1531)
  %21 = getelementptr inbounds nuw i8, ptr %15, i32 3, !dbg !1532
  %22 = load i8, ptr %21, align 1, !dbg !1532, !tbaa !132
    #dbg_value(i8 %22, !1446, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1524)
    #dbg_value(i32 4, !122, !DIExpression(), !1531)
  %23 = zext i8 %13 to i32, !dbg !1533
  %24 = shl nuw i32 %23, 24, !dbg !1533
  %25 = zext i8 %11 to i32, !dbg !1533
  %26 = shl nuw nsw i32 %25, 16, !dbg !1533
  %27 = or disjoint i32 %24, %26, !dbg !1533
  %28 = zext i8 %9 to i32, !dbg !1533
  %29 = shl nuw nsw i32 %28, 8, !dbg !1533
  %30 = or disjoint i32 %27, %29, !dbg !1533
  %31 = zext i8 %7 to i32, !dbg !1533
  %32 = or disjoint i32 %30, %31, !dbg !1533
  %33 = zext i8 %22 to i32, !dbg !1534
  %34 = shl nuw i32 %33, 24, !dbg !1534
  %35 = zext i8 %20 to i32, !dbg !1534
  %36 = shl nuw nsw i32 %35, 16, !dbg !1534
  %37 = or disjoint i32 %34, %36, !dbg !1534
  %38 = zext i8 %18 to i32, !dbg !1534
  %39 = shl nuw nsw i32 %38, 8, !dbg !1534
  %40 = or disjoint i32 %37, %39, !dbg !1534
  %41 = zext i8 %16 to i32, !dbg !1534
  %42 = or disjoint i32 %40, %41, !dbg !1534
    #dbg_value(i32 poison, !496, !DIExpression(), !1536)
    #dbg_value(i32 poison, !497, !DIExpression(), !1536)
    #dbg_value(i32 %32, !498, !DIExpression(), !1536)
    #dbg_value(i32 %42, !499, !DIExpression(), !1536)
    #dbg_value(i32 poison, !500, !DIExpression(), !1536)
    #dbg_value(i32 poison, !501, !DIExpression(), !1536)
    #dbg_value(i32 %32, !502, !DIExpression(), !1536)
    #dbg_value(i32 %42, !503, !DIExpression(), !1536)
    #dbg_value(i32 poison, !504, !DIExpression(), !1536)
    #dbg_value(i32 %42, !505, !DIExpression(), !1536)
  %43 = icmp eq i32 %42, 0, !dbg !1534
  br i1 %43, label %85, label %44, !dbg !1534

44:                                               ; preds = %4
  %45 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1537
  %46 = load ptr, ptr %45, align 4, !dbg !1537, !tbaa !973
    #dbg_value(ptr %46, !115, !DIExpression(), !1480)
    #dbg_value(ptr %46, !119, !DIExpression(), !1480)
  %47 = getelementptr inbounds nuw i8, ptr %46, i32 3, !dbg !1538
  %48 = load i8, ptr %47, align 1, !dbg !1538, !tbaa !132
    #dbg_value(i8 %48, !1444, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1524)
  %49 = getelementptr inbounds nuw i8, ptr %46, i32 2, !dbg !1538
  %50 = load i8, ptr %49, align 1, !dbg !1538, !tbaa !132
    #dbg_value(i8 %50, !1444, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1524)
  %51 = getelementptr inbounds nuw i8, ptr %46, i32 1, !dbg !1538
  %52 = load i8, ptr %51, align 1, !dbg !1538, !tbaa !132
    #dbg_value(i8 %52, !1444, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1524)
  %53 = load i8, ptr %46, align 1, !dbg !1538, !tbaa !132
    #dbg_value(i8 %53, !1444, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1524)
  %54 = load ptr, ptr %1, align 4, !dbg !1539, !tbaa !973
    #dbg_value(ptr %54, !115, !DIExpression(), !1478)
    #dbg_value(ptr %54, !119, !DIExpression(), !1478)
  %55 = getelementptr inbounds nuw i8, ptr %54, i32 3, !dbg !1540
  %56 = load i8, ptr %55, align 1, !dbg !1540, !tbaa !132
    #dbg_value(i8 %56, !1441, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1524)
  %57 = getelementptr inbounds nuw i8, ptr %54, i32 2, !dbg !1540
  %58 = load i8, ptr %57, align 1, !dbg !1540, !tbaa !132
    #dbg_value(i8 %58, !1441, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1524)
  %59 = getelementptr inbounds nuw i8, ptr %54, i32 1, !dbg !1540
  %60 = load i8, ptr %59, align 1, !dbg !1540, !tbaa !132
    #dbg_value(i8 %60, !1441, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1524)
  %61 = load i8, ptr %54, align 1, !dbg !1540, !tbaa !132
    #dbg_value(i8 %61, !1441, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1524)
  %62 = zext i8 %48 to i32, !dbg !1541
  %63 = shl nuw i32 %62, 24, !dbg !1541
  %64 = zext i8 %50 to i32, !dbg !1541
  %65 = shl nuw nsw i32 %64, 16, !dbg !1541
  %66 = or disjoint i32 %63, %65, !dbg !1541
  %67 = zext i8 %52 to i32, !dbg !1541
  %68 = shl nuw nsw i32 %67, 8, !dbg !1541
  %69 = or disjoint i32 %66, %68, !dbg !1541
  %70 = zext i8 %53 to i32, !dbg !1541
  %71 = or disjoint i32 %69, %70, !dbg !1541
    #dbg_value(i32 %71, !497, !DIExpression(), !1536)
    #dbg_value(i32 %71, !501, !DIExpression(), !1536)
    #dbg_value(i32 %71, !504, !DIExpression(), !1536)
  %72 = zext i8 %56 to i32, !dbg !1542
  %73 = shl nuw i32 %72, 24, !dbg !1542
  %74 = zext i8 %58 to i32, !dbg !1542
  %75 = shl nuw nsw i32 %74, 16, !dbg !1542
  %76 = or disjoint i32 %73, %75, !dbg !1542
  %77 = zext i8 %60 to i32, !dbg !1542
  %78 = shl nuw nsw i32 %77, 8, !dbg !1542
  %79 = or disjoint i32 %76, %78, !dbg !1542
  %80 = zext i8 %61 to i32, !dbg !1542
  %81 = or disjoint i32 %79, %80, !dbg !1542
    #dbg_value(i32 %81, !496, !DIExpression(), !1536)
    #dbg_value(i32 %81, !500, !DIExpression(), !1536)
  %82 = udiv i32 %71, %42, !dbg !1542
    #dbg_value(i32 %82, !506, !DIExpression(), !1536)
    #dbg_value(i32 %82, !507, !DIExpression(), !1536)
    #dbg_value(i32 %81, !508, !DIExpression(), !1536)
    #dbg_value(i32 %42, !509, !DIExpression(), !1536)
  %83 = urem i32 %81, %42, !dbg !1543
    #dbg_value(i32 %83, !510, !DIExpression(), !1536)
  %84 = add i32 %83, %82
  br label %85

85:                                               ; preds = %4, %44
  %86 = phi i32 [ %84, %44 ], [ 0, %4 ], !dbg !1544
    #dbg_value(i32 poison, !510, !DIExpression(), !1536)
    #dbg_value(i32 %86, !511, !DIExpression(), !1536)
  %87 = add i32 %86, %32, !dbg !1545
    #dbg_value(i32 %87, !1447, !DIExpression(), !1524)
  br label %475

88:                                               ; preds = %3
    #dbg_value(ptr undef, !110, !DIExpression(), !1486)
    #dbg_value(ptr poison, !115, !DIExpression(), !1486)
    #dbg_value(i32 4, !116, !DIExpression(), !1486)
    #dbg_value(ptr undef, !117, !DIExpression(), !1486)
    #dbg_value(ptr poison, !119, !DIExpression(), !1486)
    #dbg_value(i8 poison, !1448, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1546)
    #dbg_value(i8 poison, !1448, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1546)
    #dbg_value(i8 poison, !1448, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1546)
    #dbg_value(i8 poison, !1448, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1546)
    #dbg_value(i32 4, !122, !DIExpression(), !1547)
    #dbg_value(ptr undef, !110, !DIExpression(), !1488)
    #dbg_value(ptr poison, !115, !DIExpression(), !1488)
    #dbg_value(i32 4, !116, !DIExpression(), !1488)
    #dbg_value(ptr undef, !117, !DIExpression(), !1488)
    #dbg_value(ptr poison, !119, !DIExpression(), !1488)
    #dbg_value(i8 poison, !1450, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1546)
    #dbg_value(i8 poison, !1450, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1546)
    #dbg_value(i8 poison, !1450, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1546)
    #dbg_value(i8 poison, !1450, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1546)
    #dbg_value(i32 4, !122, !DIExpression(), !1548)
  %89 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1549
  %90 = load ptr, ptr %89, align 4, !dbg !1549, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1490)
    #dbg_value(ptr %90, !115, !DIExpression(), !1490)
    #dbg_value(i32 4, !116, !DIExpression(), !1490)
    #dbg_value(ptr undef, !117, !DIExpression(), !1490)
    #dbg_value(ptr %90, !119, !DIExpression(), !1490)
    #dbg_value(i32 0, !122, !DIExpression(), !1550)
  %91 = load i8, ptr %90, align 1, !dbg !1551, !tbaa !132
    #dbg_value(i8 %91, !1451, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1546)
    #dbg_value(i32 1, !122, !DIExpression(), !1550)
  %92 = getelementptr inbounds nuw i8, ptr %90, i32 1, !dbg !1551
  %93 = load i8, ptr %92, align 1, !dbg !1551, !tbaa !132
    #dbg_value(i8 %93, !1451, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1546)
    #dbg_value(i32 2, !122, !DIExpression(), !1550)
  %94 = getelementptr inbounds nuw i8, ptr %90, i32 2, !dbg !1551
  %95 = load i8, ptr %94, align 1, !dbg !1551, !tbaa !132
    #dbg_value(i8 %95, !1451, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1546)
    #dbg_value(i32 3, !122, !DIExpression(), !1550)
  %96 = getelementptr inbounds nuw i8, ptr %90, i32 3, !dbg !1551
  %97 = load i8, ptr %96, align 1, !dbg !1551, !tbaa !132
    #dbg_value(i8 %97, !1451, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1546)
    #dbg_value(i32 4, !122, !DIExpression(), !1550)
  %98 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1552
  %99 = load ptr, ptr %98, align 4, !dbg !1552, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1492)
    #dbg_value(ptr %99, !115, !DIExpression(), !1492)
    #dbg_value(i32 4, !116, !DIExpression(), !1492)
    #dbg_value(ptr undef, !117, !DIExpression(), !1492)
    #dbg_value(ptr %99, !119, !DIExpression(), !1492)
    #dbg_value(i32 0, !122, !DIExpression(), !1553)
  %100 = load i8, ptr %99, align 1, !dbg !1554, !tbaa !132
    #dbg_value(i8 %100, !1452, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1546)
    #dbg_value(i32 1, !122, !DIExpression(), !1553)
  %101 = getelementptr inbounds nuw i8, ptr %99, i32 1, !dbg !1554
  %102 = load i8, ptr %101, align 1, !dbg !1554, !tbaa !132
    #dbg_value(i8 %102, !1452, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1546)
    #dbg_value(i32 2, !122, !DIExpression(), !1553)
  %103 = getelementptr inbounds nuw i8, ptr %99, i32 2, !dbg !1554
  %104 = load i8, ptr %103, align 1, !dbg !1554, !tbaa !132
    #dbg_value(i8 %104, !1452, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1546)
    #dbg_value(i32 3, !122, !DIExpression(), !1553)
  %105 = getelementptr inbounds nuw i8, ptr %99, i32 3, !dbg !1554
  %106 = load i8, ptr %105, align 1, !dbg !1554, !tbaa !132
    #dbg_value(i8 %106, !1452, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1546)
    #dbg_value(i32 4, !122, !DIExpression(), !1553)
  %107 = zext i8 %97 to i32, !dbg !1555
  %108 = shl nuw i32 %107, 24, !dbg !1555
  %109 = zext i8 %95 to i32, !dbg !1555
  %110 = shl nuw nsw i32 %109, 16, !dbg !1555
  %111 = or disjoint i32 %108, %110, !dbg !1555
  %112 = zext i8 %93 to i32, !dbg !1555
  %113 = shl nuw nsw i32 %112, 8, !dbg !1555
  %114 = or disjoint i32 %111, %113, !dbg !1555
  %115 = zext i8 %91 to i32, !dbg !1555
  %116 = or disjoint i32 %114, %115, !dbg !1555
  %117 = zext i8 %106 to i32, !dbg !1556
  %118 = shl nuw i32 %117, 24, !dbg !1556
  %119 = zext i8 %104 to i32, !dbg !1556
  %120 = shl nuw nsw i32 %119, 16, !dbg !1556
  %121 = or disjoint i32 %118, %120, !dbg !1556
  %122 = zext i8 %102 to i32, !dbg !1556
  %123 = shl nuw nsw i32 %122, 8, !dbg !1556
  %124 = or disjoint i32 %121, %123, !dbg !1556
  %125 = zext i8 %100 to i32, !dbg !1556
  %126 = or disjoint i32 %124, %125, !dbg !1556
    #dbg_value(i32 poison, !525, !DIExpression(), !1558)
    #dbg_value(i32 poison, !526, !DIExpression(), !1558)
    #dbg_value(i32 %116, !527, !DIExpression(), !1558)
    #dbg_value(i32 %126, !528, !DIExpression(), !1558)
    #dbg_value(i32 poison, !529, !DIExpression(), !1558)
    #dbg_value(i32 %126, !530, !DIExpression(), !1558)
  %127 = icmp eq i32 %126, 0, !dbg !1556
  br i1 %127, label %169, label %128, !dbg !1556

128:                                              ; preds = %88
  %129 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1559
  %130 = load ptr, ptr %129, align 4, !dbg !1559, !tbaa !973
    #dbg_value(ptr %130, !115, !DIExpression(), !1488)
    #dbg_value(ptr %130, !119, !DIExpression(), !1488)
  %131 = getelementptr inbounds nuw i8, ptr %130, i32 3, !dbg !1560
  %132 = load i8, ptr %131, align 1, !dbg !1560, !tbaa !132
    #dbg_value(i8 %132, !1450, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1546)
  %133 = getelementptr inbounds nuw i8, ptr %130, i32 2, !dbg !1560
  %134 = load i8, ptr %133, align 1, !dbg !1560, !tbaa !132
    #dbg_value(i8 %134, !1450, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1546)
  %135 = getelementptr inbounds nuw i8, ptr %130, i32 1, !dbg !1560
  %136 = load i8, ptr %135, align 1, !dbg !1560, !tbaa !132
    #dbg_value(i8 %136, !1450, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1546)
  %137 = load i8, ptr %130, align 1, !dbg !1560, !tbaa !132
    #dbg_value(i8 %137, !1450, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1546)
  %138 = load ptr, ptr %1, align 4, !dbg !1561, !tbaa !973
    #dbg_value(ptr %138, !115, !DIExpression(), !1486)
    #dbg_value(ptr %138, !119, !DIExpression(), !1486)
  %139 = getelementptr inbounds nuw i8, ptr %138, i32 3, !dbg !1562
  %140 = load i8, ptr %139, align 1, !dbg !1562, !tbaa !132
    #dbg_value(i8 %140, !1448, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1546)
  %141 = getelementptr inbounds nuw i8, ptr %138, i32 2, !dbg !1562
  %142 = load i8, ptr %141, align 1, !dbg !1562, !tbaa !132
    #dbg_value(i8 %142, !1448, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1546)
  %143 = getelementptr inbounds nuw i8, ptr %138, i32 1, !dbg !1562
  %144 = load i8, ptr %143, align 1, !dbg !1562, !tbaa !132
    #dbg_value(i8 %144, !1448, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1546)
  %145 = load i8, ptr %138, align 1, !dbg !1562, !tbaa !132
    #dbg_value(i8 %145, !1448, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1546)
  %146 = zext i8 %132 to i32, !dbg !1563
  %147 = shl nuw i32 %146, 24, !dbg !1563
  %148 = zext i8 %134 to i32, !dbg !1563
  %149 = shl nuw nsw i32 %148, 16, !dbg !1563
  %150 = or disjoint i32 %147, %149, !dbg !1563
  %151 = zext i8 %136 to i32, !dbg !1563
  %152 = shl nuw nsw i32 %151, 8, !dbg !1563
  %153 = or disjoint i32 %150, %152, !dbg !1563
  %154 = zext i8 %137 to i32, !dbg !1563
  %155 = or disjoint i32 %153, %154, !dbg !1563
    #dbg_value(i32 %155, !526, !DIExpression(), !1558)
    #dbg_value(i32 %155, !529, !DIExpression(), !1558)
  %156 = zext i8 %140 to i32, !dbg !1564
  %157 = shl nuw i32 %156, 24, !dbg !1564
  %158 = zext i8 %142 to i32, !dbg !1564
  %159 = shl nuw nsw i32 %158, 16, !dbg !1564
  %160 = or disjoint i32 %157, %159, !dbg !1564
  %161 = zext i8 %144 to i32, !dbg !1564
  %162 = shl nuw nsw i32 %161, 8, !dbg !1564
  %163 = or disjoint i32 %160, %162, !dbg !1564
  %164 = zext i8 %145 to i32, !dbg !1564
  %165 = or disjoint i32 %163, %164, !dbg !1564
    #dbg_value(i32 %165, !525, !DIExpression(), !1558)
  %166 = udiv i32 %155, %126, !dbg !1564
    #dbg_value(i32 %166, !531, !DIExpression(), !1558)
    #dbg_value(i32 %166, !532, !DIExpression(), !1558)
    #dbg_value(i32 %165, !533, !DIExpression(), !1558)
    #dbg_value(i32 %126, !534, !DIExpression(), !1558)
  %167 = urem i32 %165, %126, !dbg !1565
    #dbg_value(i32 %167, !535, !DIExpression(), !1558)
  %168 = add i32 %167, %166
  br label %169

169:                                              ; preds = %88, %128
  %170 = phi i32 [ %168, %128 ], [ 0, %88 ], !dbg !1566
    #dbg_value(i32 poison, !535, !DIExpression(), !1558)
    #dbg_value(i32 %170, !536, !DIExpression(), !1558)
  %171 = add i32 %170, %116, !dbg !1567
    #dbg_value(i32 %171, !1453, !DIExpression(), !1546)
  br label %475

172:                                              ; preds = %3
  %173 = load ptr, ptr %1, align 4, !dbg !1568, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1494)
    #dbg_value(ptr %173, !115, !DIExpression(), !1494)
    #dbg_value(i32 4, !116, !DIExpression(), !1494)
    #dbg_value(ptr undef, !117, !DIExpression(), !1494)
    #dbg_value(ptr %173, !119, !DIExpression(), !1494)
    #dbg_value(i32 0, !122, !DIExpression(), !1569)
  %174 = load i8, ptr %173, align 1, !dbg !1570, !tbaa !132
    #dbg_value(i8 %174, !1454, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1571)
    #dbg_value(i32 1, !122, !DIExpression(), !1569)
  %175 = getelementptr inbounds nuw i8, ptr %173, i32 1, !dbg !1570
  %176 = load i8, ptr %175, align 1, !dbg !1570, !tbaa !132
    #dbg_value(i8 %176, !1454, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1571)
    #dbg_value(i32 2, !122, !DIExpression(), !1569)
  %177 = getelementptr inbounds nuw i8, ptr %173, i32 2, !dbg !1570
  %178 = load i8, ptr %177, align 1, !dbg !1570, !tbaa !132
    #dbg_value(i8 %178, !1454, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1571)
    #dbg_value(i32 3, !122, !DIExpression(), !1569)
  %179 = getelementptr inbounds nuw i8, ptr %173, i32 3, !dbg !1570
  %180 = load i8, ptr %179, align 1, !dbg !1570, !tbaa !132
    #dbg_value(i8 %180, !1454, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1571)
    #dbg_value(i32 4, !122, !DIExpression(), !1569)
  %181 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1572
  %182 = load ptr, ptr %181, align 4, !dbg !1572, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1496)
    #dbg_value(ptr %182, !115, !DIExpression(), !1496)
    #dbg_value(i32 4, !116, !DIExpression(), !1496)
    #dbg_value(ptr undef, !117, !DIExpression(), !1496)
    #dbg_value(ptr %182, !119, !DIExpression(), !1496)
    #dbg_value(i32 0, !122, !DIExpression(), !1573)
  %183 = load i8, ptr %182, align 1, !dbg !1574, !tbaa !132
    #dbg_value(i8 %183, !1456, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1571)
    #dbg_value(i32 1, !122, !DIExpression(), !1573)
  %184 = getelementptr inbounds nuw i8, ptr %182, i32 1, !dbg !1574
  %185 = load i8, ptr %184, align 1, !dbg !1574, !tbaa !132
    #dbg_value(i8 %185, !1456, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1571)
    #dbg_value(i32 2, !122, !DIExpression(), !1573)
  %186 = getelementptr inbounds nuw i8, ptr %182, i32 2, !dbg !1574
  %187 = load i8, ptr %186, align 1, !dbg !1574, !tbaa !132
    #dbg_value(i8 %187, !1456, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1571)
    #dbg_value(i32 3, !122, !DIExpression(), !1573)
  %188 = getelementptr inbounds nuw i8, ptr %182, i32 3, !dbg !1574
  %189 = load i8, ptr %188, align 1, !dbg !1574, !tbaa !132
    #dbg_value(i8 %189, !1456, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1571)
    #dbg_value(i32 4, !122, !DIExpression(), !1573)
  %190 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1575
  %191 = load ptr, ptr %190, align 4, !dbg !1575, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1498)
    #dbg_value(ptr %191, !115, !DIExpression(), !1498)
    #dbg_value(i32 4, !116, !DIExpression(), !1498)
    #dbg_value(ptr undef, !117, !DIExpression(), !1498)
    #dbg_value(ptr %191, !119, !DIExpression(), !1498)
    #dbg_value(i32 0, !122, !DIExpression(), !1576)
  %192 = load i8, ptr %191, align 1, !dbg !1577, !tbaa !132
    #dbg_value(i8 %192, !1457, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1571)
    #dbg_value(i32 1, !122, !DIExpression(), !1576)
  %193 = getelementptr inbounds nuw i8, ptr %191, i32 1, !dbg !1577
  %194 = load i8, ptr %193, align 1, !dbg !1577, !tbaa !132
    #dbg_value(i8 %194, !1457, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1571)
    #dbg_value(i32 2, !122, !DIExpression(), !1576)
  %195 = getelementptr inbounds nuw i8, ptr %191, i32 2, !dbg !1577
  %196 = load i8, ptr %195, align 1, !dbg !1577, !tbaa !132
    #dbg_value(i8 %196, !1457, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1571)
    #dbg_value(i32 3, !122, !DIExpression(), !1576)
  %197 = getelementptr inbounds nuw i8, ptr %191, i32 3, !dbg !1577
  %198 = load i8, ptr %197, align 1, !dbg !1577, !tbaa !132
    #dbg_value(i8 %198, !1457, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1571)
    #dbg_value(i32 4, !122, !DIExpression(), !1576)
  %199 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1578
  %200 = load ptr, ptr %199, align 4, !dbg !1578, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1500)
    #dbg_value(ptr %200, !115, !DIExpression(), !1500)
    #dbg_value(i32 4, !116, !DIExpression(), !1500)
    #dbg_value(ptr undef, !117, !DIExpression(), !1500)
    #dbg_value(ptr %200, !119, !DIExpression(), !1500)
    #dbg_value(i32 0, !122, !DIExpression(), !1579)
  %201 = load i8, ptr %200, align 1, !dbg !1580, !tbaa !132
    #dbg_value(i8 %201, !1458, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1571)
    #dbg_value(i32 1, !122, !DIExpression(), !1579)
  %202 = getelementptr inbounds nuw i8, ptr %200, i32 1, !dbg !1580
  %203 = load i8, ptr %202, align 1, !dbg !1580, !tbaa !132
    #dbg_value(i8 %203, !1458, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1571)
    #dbg_value(i32 2, !122, !DIExpression(), !1579)
  %204 = getelementptr inbounds nuw i8, ptr %200, i32 2, !dbg !1580
  %205 = load i8, ptr %204, align 1, !dbg !1580, !tbaa !132
    #dbg_value(i8 %205, !1458, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1571)
    #dbg_value(i32 3, !122, !DIExpression(), !1579)
  %206 = getelementptr inbounds nuw i8, ptr %200, i32 3, !dbg !1580
  %207 = load i8, ptr %206, align 1, !dbg !1580, !tbaa !132
    #dbg_value(i8 %207, !1458, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1571)
    #dbg_value(i32 4, !122, !DIExpression(), !1579)
  %208 = zext i8 %180 to i32, !dbg !1581
  %209 = shl nuw i32 %208, 24, !dbg !1581
  %210 = zext i8 %178 to i32, !dbg !1581
  %211 = shl nuw nsw i32 %210, 16, !dbg !1581
  %212 = or disjoint i32 %209, %211, !dbg !1581
  %213 = zext i8 %176 to i32, !dbg !1581
  %214 = shl nuw nsw i32 %213, 8, !dbg !1581
  %215 = or disjoint i32 %212, %214, !dbg !1581
  %216 = zext i8 %174 to i32, !dbg !1581
  %217 = or disjoint i32 %215, %216, !dbg !1581
  %218 = zext i8 %189 to i32, !dbg !1582
  %219 = shl nuw i32 %218, 24, !dbg !1582
  %220 = zext i8 %187 to i32, !dbg !1582
  %221 = shl nuw nsw i32 %220, 16, !dbg !1582
  %222 = or disjoint i32 %219, %221, !dbg !1582
  %223 = zext i8 %185 to i32, !dbg !1582
  %224 = shl nuw nsw i32 %223, 8, !dbg !1582
  %225 = or disjoint i32 %222, %224, !dbg !1582
  %226 = zext i8 %183 to i32, !dbg !1582
  %227 = or disjoint i32 %225, %226, !dbg !1582
  %228 = zext i8 %198 to i32, !dbg !1583
  %229 = shl nuw i32 %228, 24, !dbg !1583
  %230 = zext i8 %196 to i32, !dbg !1583
  %231 = shl nuw nsw i32 %230, 16, !dbg !1583
  %232 = or disjoint i32 %229, %231, !dbg !1583
  %233 = zext i8 %194 to i32, !dbg !1583
  %234 = shl nuw nsw i32 %233, 8, !dbg !1583
  %235 = or disjoint i32 %232, %234, !dbg !1583
  %236 = zext i8 %192 to i32, !dbg !1583
  %237 = or disjoint i32 %235, %236, !dbg !1583
  %238 = zext i8 %207 to i32, !dbg !1584
  %239 = shl nuw i32 %238, 24, !dbg !1584
  %240 = zext i8 %205 to i32, !dbg !1584
  %241 = shl nuw nsw i32 %240, 16, !dbg !1584
  %242 = or disjoint i32 %239, %241, !dbg !1584
  %243 = zext i8 %203 to i32, !dbg !1584
  %244 = shl nuw nsw i32 %243, 8, !dbg !1584
  %245 = or disjoint i32 %242, %244, !dbg !1584
  %246 = zext i8 %201 to i32, !dbg !1584
  %247 = or disjoint i32 %245, %246, !dbg !1584
    #dbg_value(i32 %217, !550, !DIExpression(), !1586)
    #dbg_value(i32 %227, !551, !DIExpression(), !1586)
    #dbg_value(i32 %237, !552, !DIExpression(), !1586)
    #dbg_value(i32 %247, !553, !DIExpression(), !1586)
    #dbg_value(i32 %217, !554, !DIExpression(), !1586)
    #dbg_value(i32 %227, !555, !DIExpression(), !1586)
    #dbg_value(i32 %237, !556, !DIExpression(), !1586)
    #dbg_value(i32 %247, !557, !DIExpression(), !1586)
    #dbg_value(i32 %217, !558, !DIExpression(), !1586)
  %248 = icmp ult i32 %217, %237, !dbg !1584
  %249 = add i32 %247, %227, !dbg !1587
  %250 = mul i32 %227, 3, !dbg !1587
  %251 = select i1 %248, i32 %249, i32 %250, !dbg !1587
    #dbg_value(i32 %251, !559, !DIExpression(), !1586)
    #dbg_value(i32 %251, !1459, !DIExpression(), !1571)
  br label %475

252:                                              ; preds = %3
  %253 = load ptr, ptr %1, align 4, !dbg !1588, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1502)
    #dbg_value(ptr %253, !115, !DIExpression(), !1502)
    #dbg_value(i32 4, !116, !DIExpression(), !1502)
    #dbg_value(ptr undef, !117, !DIExpression(), !1502)
    #dbg_value(ptr %253, !119, !DIExpression(), !1502)
    #dbg_value(i32 0, !122, !DIExpression(), !1589)
  %254 = load i8, ptr %253, align 1, !dbg !1590, !tbaa !132
    #dbg_value(i8 %254, !1460, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1591)
    #dbg_value(i32 1, !122, !DIExpression(), !1589)
  %255 = getelementptr inbounds nuw i8, ptr %253, i32 1, !dbg !1590
  %256 = load i8, ptr %255, align 1, !dbg !1590, !tbaa !132
    #dbg_value(i8 %256, !1460, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1591)
    #dbg_value(i32 2, !122, !DIExpression(), !1589)
  %257 = getelementptr inbounds nuw i8, ptr %253, i32 2, !dbg !1590
  %258 = load i8, ptr %257, align 1, !dbg !1590, !tbaa !132
    #dbg_value(i8 %258, !1460, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1591)
    #dbg_value(i32 3, !122, !DIExpression(), !1589)
  %259 = getelementptr inbounds nuw i8, ptr %253, i32 3, !dbg !1590
  %260 = load i8, ptr %259, align 1, !dbg !1590, !tbaa !132
    #dbg_value(i8 %260, !1460, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1591)
    #dbg_value(i32 4, !122, !DIExpression(), !1589)
  %261 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1592
  %262 = load ptr, ptr %261, align 4, !dbg !1592, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1504)
    #dbg_value(ptr %262, !115, !DIExpression(), !1504)
    #dbg_value(i32 4, !116, !DIExpression(), !1504)
    #dbg_value(ptr undef, !117, !DIExpression(), !1504)
    #dbg_value(ptr %262, !119, !DIExpression(), !1504)
    #dbg_value(i32 0, !122, !DIExpression(), !1593)
  %263 = load i8, ptr %262, align 1, !dbg !1594, !tbaa !132
    #dbg_value(i8 %263, !1462, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1591)
    #dbg_value(i32 1, !122, !DIExpression(), !1593)
  %264 = getelementptr inbounds nuw i8, ptr %262, i32 1, !dbg !1594
  %265 = load i8, ptr %264, align 1, !dbg !1594, !tbaa !132
    #dbg_value(i8 %265, !1462, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1591)
    #dbg_value(i32 2, !122, !DIExpression(), !1593)
  %266 = getelementptr inbounds nuw i8, ptr %262, i32 2, !dbg !1594
  %267 = load i8, ptr %266, align 1, !dbg !1594, !tbaa !132
    #dbg_value(i8 %267, !1462, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1591)
    #dbg_value(i32 3, !122, !DIExpression(), !1593)
  %268 = getelementptr inbounds nuw i8, ptr %262, i32 3, !dbg !1594
  %269 = load i8, ptr %268, align 1, !dbg !1594, !tbaa !132
    #dbg_value(i8 %269, !1462, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1591)
    #dbg_value(i32 4, !122, !DIExpression(), !1593)
  %270 = getelementptr inbounds nuw i8, ptr %1, i32 8, !dbg !1595
  %271 = load ptr, ptr %270, align 4, !dbg !1595, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1506)
    #dbg_value(ptr %271, !115, !DIExpression(), !1506)
    #dbg_value(i32 4, !116, !DIExpression(), !1506)
    #dbg_value(ptr undef, !117, !DIExpression(), !1506)
    #dbg_value(ptr %271, !119, !DIExpression(), !1506)
    #dbg_value(i32 0, !122, !DIExpression(), !1596)
  %272 = load i8, ptr %271, align 1, !dbg !1597, !tbaa !132
    #dbg_value(i8 %272, !1463, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1591)
    #dbg_value(i32 1, !122, !DIExpression(), !1596)
  %273 = getelementptr inbounds nuw i8, ptr %271, i32 1, !dbg !1597
  %274 = load i8, ptr %273, align 1, !dbg !1597, !tbaa !132
    #dbg_value(i8 %274, !1463, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1591)
    #dbg_value(i32 2, !122, !DIExpression(), !1596)
  %275 = getelementptr inbounds nuw i8, ptr %271, i32 2, !dbg !1597
  %276 = load i8, ptr %275, align 1, !dbg !1597, !tbaa !132
    #dbg_value(i8 %276, !1463, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1591)
    #dbg_value(i32 3, !122, !DIExpression(), !1596)
  %277 = getelementptr inbounds nuw i8, ptr %271, i32 3, !dbg !1597
  %278 = load i8, ptr %277, align 1, !dbg !1597, !tbaa !132
    #dbg_value(i8 %278, !1463, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1591)
    #dbg_value(i32 4, !122, !DIExpression(), !1596)
  %279 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1598
  %280 = load ptr, ptr %279, align 4, !dbg !1598, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1508)
    #dbg_value(ptr %280, !115, !DIExpression(), !1508)
    #dbg_value(i32 4, !116, !DIExpression(), !1508)
    #dbg_value(ptr undef, !117, !DIExpression(), !1508)
    #dbg_value(ptr %280, !119, !DIExpression(), !1508)
    #dbg_value(i32 0, !122, !DIExpression(), !1599)
  %281 = load i8, ptr %280, align 1, !dbg !1600, !tbaa !132
    #dbg_value(i8 %281, !1464, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1591)
    #dbg_value(i32 1, !122, !DIExpression(), !1599)
  %282 = getelementptr inbounds nuw i8, ptr %280, i32 1, !dbg !1600
  %283 = load i8, ptr %282, align 1, !dbg !1600, !tbaa !132
    #dbg_value(i8 %283, !1464, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1591)
    #dbg_value(i32 2, !122, !DIExpression(), !1599)
  %284 = getelementptr inbounds nuw i8, ptr %280, i32 2, !dbg !1600
  %285 = load i8, ptr %284, align 1, !dbg !1600, !tbaa !132
    #dbg_value(i8 %285, !1464, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1591)
    #dbg_value(i32 3, !122, !DIExpression(), !1599)
  %286 = getelementptr inbounds nuw i8, ptr %280, i32 3, !dbg !1600
  %287 = load i8, ptr %286, align 1, !dbg !1600, !tbaa !132
    #dbg_value(i8 %287, !1464, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1591)
    #dbg_value(i32 4, !122, !DIExpression(), !1599)
  %288 = zext i8 %260 to i32, !dbg !1601
  %289 = shl nuw i32 %288, 24, !dbg !1601
  %290 = zext i8 %258 to i32, !dbg !1601
  %291 = shl nuw nsw i32 %290, 16, !dbg !1601
  %292 = or disjoint i32 %289, %291, !dbg !1601
  %293 = zext i8 %256 to i32, !dbg !1601
  %294 = shl nuw nsw i32 %293, 8, !dbg !1601
  %295 = or disjoint i32 %292, %294, !dbg !1601
  %296 = zext i8 %254 to i32, !dbg !1601
  %297 = or disjoint i32 %295, %296, !dbg !1601
  %298 = zext i8 %269 to i32, !dbg !1602
  %299 = shl nuw i32 %298, 24, !dbg !1602
  %300 = zext i8 %267 to i32, !dbg !1602
  %301 = shl nuw nsw i32 %300, 16, !dbg !1602
  %302 = or disjoint i32 %299, %301, !dbg !1602
  %303 = zext i8 %265 to i32, !dbg !1602
  %304 = shl nuw nsw i32 %303, 8, !dbg !1602
  %305 = or disjoint i32 %302, %304, !dbg !1602
  %306 = zext i8 %263 to i32, !dbg !1602
  %307 = or disjoint i32 %305, %306, !dbg !1602
  %308 = zext i8 %278 to i32, !dbg !1603
  %309 = shl nuw i32 %308, 24, !dbg !1603
  %310 = zext i8 %276 to i32, !dbg !1603
  %311 = shl nuw nsw i32 %310, 16, !dbg !1603
  %312 = or disjoint i32 %309, %311, !dbg !1603
  %313 = zext i8 %274 to i32, !dbg !1603
  %314 = shl nuw nsw i32 %313, 8, !dbg !1603
  %315 = or disjoint i32 %312, %314, !dbg !1603
  %316 = zext i8 %272 to i32, !dbg !1603
  %317 = or disjoint i32 %315, %316, !dbg !1603
  %318 = zext i8 %287 to i32, !dbg !1604
  %319 = shl nuw i32 %318, 24, !dbg !1604
  %320 = zext i8 %285 to i32, !dbg !1604
  %321 = shl nuw nsw i32 %320, 16, !dbg !1604
  %322 = or disjoint i32 %319, %321, !dbg !1604
  %323 = zext i8 %283 to i32, !dbg !1604
  %324 = shl nuw nsw i32 %323, 8, !dbg !1604
  %325 = or disjoint i32 %322, %324, !dbg !1604
  %326 = zext i8 %281 to i32, !dbg !1604
  %327 = or disjoint i32 %325, %326, !dbg !1604
    #dbg_value(i32 %297, !571, !DIExpression(), !1606)
    #dbg_value(i32 %307, !572, !DIExpression(), !1606)
    #dbg_value(i32 %317, !573, !DIExpression(), !1606)
    #dbg_value(i32 %327, !574, !DIExpression(), !1606)
    #dbg_value(i32 %297, !575, !DIExpression(), !1606)
  %328 = icmp ult i32 %297, %317, !dbg !1604
  %329 = add i32 %327, %307, !dbg !1607
  %330 = mul i32 %307, 3, !dbg !1607
  %331 = select i1 %328, i32 %329, i32 %330, !dbg !1607
    #dbg_value(i32 %331, !576, !DIExpression(), !1606)
    #dbg_value(i32 %331, !1465, !DIExpression(), !1591)
  br label %475

332:                                              ; preds = %3
  %333 = load ptr, ptr %1, align 4, !dbg !1608, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1510)
    #dbg_value(ptr %333, !115, !DIExpression(), !1510)
    #dbg_value(i32 4, !116, !DIExpression(), !1510)
    #dbg_value(ptr undef, !117, !DIExpression(), !1510)
    #dbg_value(ptr %333, !119, !DIExpression(), !1510)
    #dbg_value(i32 0, !122, !DIExpression(), !1609)
  %334 = load i8, ptr %333, align 1, !dbg !1610, !tbaa !132
    #dbg_value(i8 %334, !1466, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1611)
    #dbg_value(i32 1, !122, !DIExpression(), !1609)
  %335 = getelementptr inbounds nuw i8, ptr %333, i32 1, !dbg !1610
  %336 = load i8, ptr %335, align 1, !dbg !1610, !tbaa !132
    #dbg_value(i8 %336, !1466, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1611)
    #dbg_value(i32 2, !122, !DIExpression(), !1609)
  %337 = getelementptr inbounds nuw i8, ptr %333, i32 2, !dbg !1610
  %338 = load i8, ptr %337, align 1, !dbg !1610, !tbaa !132
    #dbg_value(i8 %338, !1466, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1611)
    #dbg_value(i32 3, !122, !DIExpression(), !1609)
  %339 = getelementptr inbounds nuw i8, ptr %333, i32 3, !dbg !1610
  %340 = load i8, ptr %339, align 1, !dbg !1610, !tbaa !132
    #dbg_value(i8 %340, !1466, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1611)
    #dbg_value(i32 4, !122, !DIExpression(), !1609)
  %341 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1612
  %342 = load ptr, ptr %341, align 4, !dbg !1612, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1512)
    #dbg_value(ptr %342, !115, !DIExpression(), !1512)
    #dbg_value(i32 4, !116, !DIExpression(), !1512)
    #dbg_value(ptr undef, !117, !DIExpression(), !1512)
    #dbg_value(ptr %342, !119, !DIExpression(), !1512)
    #dbg_value(i32 0, !122, !DIExpression(), !1613)
  %343 = load i8, ptr %342, align 1, !dbg !1614, !tbaa !132
    #dbg_value(i8 %343, !1468, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1611)
    #dbg_value(i32 1, !122, !DIExpression(), !1613)
  %344 = getelementptr inbounds nuw i8, ptr %342, i32 1, !dbg !1614
  %345 = load i8, ptr %344, align 1, !dbg !1614, !tbaa !132
    #dbg_value(i8 %345, !1468, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1611)
    #dbg_value(i32 2, !122, !DIExpression(), !1613)
  %346 = getelementptr inbounds nuw i8, ptr %342, i32 2, !dbg !1614
  %347 = load i8, ptr %346, align 1, !dbg !1614, !tbaa !132
    #dbg_value(i8 %347, !1468, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1611)
    #dbg_value(i32 3, !122, !DIExpression(), !1613)
  %348 = getelementptr inbounds nuw i8, ptr %342, i32 3, !dbg !1614
  %349 = load i8, ptr %348, align 1, !dbg !1614, !tbaa !132
    #dbg_value(i8 %349, !1468, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1611)
    #dbg_value(i32 4, !122, !DIExpression(), !1613)
    #dbg_value(i32 poison, !122, !DIExpression(), !1615)
  %350 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1617
  %351 = load ptr, ptr %350, align 4, !dbg !1617, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1514)
    #dbg_value(ptr %351, !115, !DIExpression(), !1514)
    #dbg_value(i32 4, !116, !DIExpression(), !1514)
    #dbg_value(ptr undef, !117, !DIExpression(), !1514)
    #dbg_value(ptr %351, !119, !DIExpression(), !1514)
    #dbg_value(i32 0, !122, !DIExpression(), !1618)
  %352 = load i8, ptr %351, align 1, !dbg !1619, !tbaa !132
    #dbg_value(i8 %352, !1470, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1611)
    #dbg_value(i32 1, !122, !DIExpression(), !1618)
  %353 = getelementptr inbounds nuw i8, ptr %351, i32 1, !dbg !1619
  %354 = load i8, ptr %353, align 1, !dbg !1619, !tbaa !132
    #dbg_value(i8 %354, !1470, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1611)
    #dbg_value(i32 2, !122, !DIExpression(), !1618)
  %355 = getelementptr inbounds nuw i8, ptr %351, i32 2, !dbg !1619
  %356 = load i8, ptr %355, align 1, !dbg !1619, !tbaa !132
    #dbg_value(i8 %356, !1470, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1611)
    #dbg_value(i32 3, !122, !DIExpression(), !1618)
  %357 = getelementptr inbounds nuw i8, ptr %351, i32 3, !dbg !1619
  %358 = load i8, ptr %357, align 1, !dbg !1619, !tbaa !132
    #dbg_value(i8 %358, !1470, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1611)
    #dbg_value(i32 4, !122, !DIExpression(), !1618)
  %359 = zext i8 %340 to i32, !dbg !1620
  %360 = shl nuw i32 %359, 24, !dbg !1620
  %361 = zext i8 %338 to i32, !dbg !1620
  %362 = shl nuw nsw i32 %361, 16, !dbg !1620
  %363 = or disjoint i32 %360, %362, !dbg !1620
  %364 = zext i8 %336 to i32, !dbg !1620
  %365 = shl nuw nsw i32 %364, 8, !dbg !1620
  %366 = or disjoint i32 %363, %365, !dbg !1620
  %367 = zext i8 %334 to i32, !dbg !1620
  %368 = or disjoint i32 %366, %367, !dbg !1620
  %369 = zext i8 %349 to i32, !dbg !1621
  %370 = shl nuw i32 %369, 24, !dbg !1621
  %371 = zext i8 %347 to i32, !dbg !1621
  %372 = shl nuw nsw i32 %371, 16, !dbg !1621
  %373 = or disjoint i32 %370, %372, !dbg !1621
  %374 = zext i8 %345 to i32, !dbg !1621
  %375 = shl nuw nsw i32 %374, 8, !dbg !1621
  %376 = or disjoint i32 %373, %375, !dbg !1621
  %377 = zext i8 %343 to i32, !dbg !1621
  %378 = or disjoint i32 %376, %377, !dbg !1621
  %379 = zext i8 %358 to i32, !dbg !1622
  %380 = shl nuw i32 %379, 24, !dbg !1622
  %381 = zext i8 %356 to i32, !dbg !1622
  %382 = shl nuw nsw i32 %381, 16, !dbg !1622
  %383 = or disjoint i32 %380, %382, !dbg !1622
  %384 = zext i8 %354 to i32, !dbg !1622
  %385 = shl nuw nsw i32 %384, 8, !dbg !1622
  %386 = or disjoint i32 %383, %385, !dbg !1622
  %387 = zext i8 %352 to i32, !dbg !1622
  %388 = or disjoint i32 %386, %387, !dbg !1622
    #dbg_value(i32 %368, !588, !DIExpression(), !1624)
    #dbg_value(i32 %378, !589, !DIExpression(), !1624)
    #dbg_value(i32 poison, !590, !DIExpression(), !1624)
    #dbg_value(i32 %388, !591, !DIExpression(), !1624)
    #dbg_value(i32 %368, !592, !DIExpression(), !1624)
    #dbg_value(i32 %378, !593, !DIExpression(), !1624)
    #dbg_value(i32 poison, !594, !DIExpression(), !1624)
    #dbg_value(i32 %388, !595, !DIExpression(), !1624)
    #dbg_value(i32 %368, !596, !DIExpression(), !1624)
  %389 = icmp ult i32 %368, %378, !dbg !1622
  %390 = icmp eq i32 %388, 0, !dbg !1625
  br i1 %389, label %391, label %397, !dbg !1626

391:                                              ; preds = %332
    #dbg_value(i32 %368, !598, !DIExpression(), !1627)
    #dbg_value(i32 %388, !601, !DIExpression(), !1627)
  br i1 %390, label %394, label %392, !dbg !1628

392:                                              ; preds = %391
  %393 = udiv i32 %368, %388, !dbg !1629
    #dbg_value(i32 %393, !602, !DIExpression(), !1627)
  br label %394

394:                                              ; preds = %392, %391
  %395 = phi i32 [ %393, %392 ], [ 0, %391 ], !dbg !1630
    #dbg_value(i32 %395, !602, !DIExpression(), !1627)
    #dbg_value(i32 %395, !603, !DIExpression(), !1627)
  %396 = add i32 %395, %378, !dbg !1631
    #dbg_value(i32 %396, !597, !DIExpression(), !1624)
  br label %475, !dbg !1632

397:                                              ; preds = %332
    #dbg_value(i32 %378, !604, !DIExpression(), !1633)
    #dbg_value(i32 %388, !606, !DIExpression(), !1633)
  br i1 %390, label %400, label %398, !dbg !1634

398:                                              ; preds = %397
  %399 = urem i32 %378, %388, !dbg !1635
    #dbg_value(i32 %399, !607, !DIExpression(), !1633)
  br label %400

400:                                              ; preds = %398, %397
  %401 = phi i32 [ %399, %398 ], [ 0, %397 ], !dbg !1636
    #dbg_value(i32 %401, !607, !DIExpression(), !1633)
    #dbg_value(i32 %401, !608, !DIExpression(), !1633)
  %402 = add i32 %401, %368, !dbg !1637
    #dbg_value(i32 %402, !597, !DIExpression(), !1624)
  br label %475

403:                                              ; preds = %3
  %404 = load ptr, ptr %1, align 4, !dbg !1638, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1516)
    #dbg_value(ptr %404, !115, !DIExpression(), !1516)
    #dbg_value(i32 4, !116, !DIExpression(), !1516)
    #dbg_value(ptr undef, !117, !DIExpression(), !1516)
    #dbg_value(ptr %404, !119, !DIExpression(), !1516)
    #dbg_value(i32 0, !122, !DIExpression(), !1639)
  %405 = load i8, ptr %404, align 1, !dbg !1640, !tbaa !132
    #dbg_value(i8 %405, !1472, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1641)
    #dbg_value(i32 1, !122, !DIExpression(), !1639)
  %406 = getelementptr inbounds nuw i8, ptr %404, i32 1, !dbg !1640
  %407 = load i8, ptr %406, align 1, !dbg !1640, !tbaa !132
    #dbg_value(i8 %407, !1472, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1641)
    #dbg_value(i32 2, !122, !DIExpression(), !1639)
  %408 = getelementptr inbounds nuw i8, ptr %404, i32 2, !dbg !1640
  %409 = load i8, ptr %408, align 1, !dbg !1640, !tbaa !132
    #dbg_value(i8 %409, !1472, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1641)
    #dbg_value(i32 3, !122, !DIExpression(), !1639)
  %410 = getelementptr inbounds nuw i8, ptr %404, i32 3, !dbg !1640
  %411 = load i8, ptr %410, align 1, !dbg !1640, !tbaa !132
    #dbg_value(i8 %411, !1472, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1641)
    #dbg_value(i32 4, !122, !DIExpression(), !1639)
  %412 = getelementptr inbounds nuw i8, ptr %1, i32 4, !dbg !1642
  %413 = load ptr, ptr %412, align 4, !dbg !1642, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1518)
    #dbg_value(ptr %413, !115, !DIExpression(), !1518)
    #dbg_value(i32 4, !116, !DIExpression(), !1518)
    #dbg_value(ptr undef, !117, !DIExpression(), !1518)
    #dbg_value(ptr %413, !119, !DIExpression(), !1518)
    #dbg_value(i32 0, !122, !DIExpression(), !1643)
  %414 = load i8, ptr %413, align 1, !dbg !1644, !tbaa !132
    #dbg_value(i8 %414, !1474, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1641)
    #dbg_value(i32 1, !122, !DIExpression(), !1643)
  %415 = getelementptr inbounds nuw i8, ptr %413, i32 1, !dbg !1644
  %416 = load i8, ptr %415, align 1, !dbg !1644, !tbaa !132
    #dbg_value(i8 %416, !1474, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1641)
    #dbg_value(i32 2, !122, !DIExpression(), !1643)
  %417 = getelementptr inbounds nuw i8, ptr %413, i32 2, !dbg !1644
  %418 = load i8, ptr %417, align 1, !dbg !1644, !tbaa !132
    #dbg_value(i8 %418, !1474, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1641)
    #dbg_value(i32 3, !122, !DIExpression(), !1643)
  %419 = getelementptr inbounds nuw i8, ptr %413, i32 3, !dbg !1644
  %420 = load i8, ptr %419, align 1, !dbg !1644, !tbaa !132
    #dbg_value(i8 %420, !1474, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1641)
    #dbg_value(i32 4, !122, !DIExpression(), !1643)
    #dbg_value(i32 poison, !122, !DIExpression(), !1645)
  %421 = getelementptr inbounds nuw i8, ptr %1, i32 12, !dbg !1647
  %422 = load ptr, ptr %421, align 4, !dbg !1647, !tbaa !973
    #dbg_value(ptr undef, !110, !DIExpression(), !1520)
    #dbg_value(ptr %422, !115, !DIExpression(), !1520)
    #dbg_value(i32 4, !116, !DIExpression(), !1520)
    #dbg_value(ptr undef, !117, !DIExpression(), !1520)
    #dbg_value(ptr %422, !119, !DIExpression(), !1520)
    #dbg_value(i32 0, !122, !DIExpression(), !1648)
  %423 = load i8, ptr %422, align 1, !dbg !1649, !tbaa !132
    #dbg_value(i8 %423, !1476, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1641)
    #dbg_value(i32 1, !122, !DIExpression(), !1648)
  %424 = getelementptr inbounds nuw i8, ptr %422, i32 1, !dbg !1649
  %425 = load i8, ptr %424, align 1, !dbg !1649, !tbaa !132
    #dbg_value(i8 %425, !1476, !DIExpression(DW_OP_LLVM_fragment, 8, 8), !1641)
    #dbg_value(i32 2, !122, !DIExpression(), !1648)
  %426 = getelementptr inbounds nuw i8, ptr %422, i32 2, !dbg !1649
  %427 = load i8, ptr %426, align 1, !dbg !1649, !tbaa !132
    #dbg_value(i8 %427, !1476, !DIExpression(DW_OP_LLVM_fragment, 16, 8), !1641)
    #dbg_value(i32 3, !122, !DIExpression(), !1648)
  %428 = getelementptr inbounds nuw i8, ptr %422, i32 3, !dbg !1649
  %429 = load i8, ptr %428, align 1, !dbg !1649, !tbaa !132
    #dbg_value(i8 %429, !1476, !DIExpression(DW_OP_LLVM_fragment, 24, 8), !1641)
    #dbg_value(i32 4, !122, !DIExpression(), !1648)
  %430 = zext i8 %411 to i32, !dbg !1650
  %431 = shl nuw i32 %430, 24, !dbg !1650
  %432 = zext i8 %409 to i32, !dbg !1650
  %433 = shl nuw nsw i32 %432, 16, !dbg !1650
  %434 = or disjoint i32 %431, %433, !dbg !1650
  %435 = zext i8 %407 to i32, !dbg !1650
  %436 = shl nuw nsw i32 %435, 8, !dbg !1650
  %437 = or disjoint i32 %434, %436, !dbg !1650
  %438 = zext i8 %405 to i32, !dbg !1650
  %439 = or disjoint i32 %437, %438, !dbg !1650
  %440 = zext i8 %420 to i32, !dbg !1651
  %441 = shl nuw i32 %440, 24, !dbg !1651
  %442 = zext i8 %418 to i32, !dbg !1651
  %443 = shl nuw nsw i32 %442, 16, !dbg !1651
  %444 = or disjoint i32 %441, %443, !dbg !1651
  %445 = zext i8 %416 to i32, !dbg !1651
  %446 = shl nuw nsw i32 %445, 8, !dbg !1651
  %447 = or disjoint i32 %444, %446, !dbg !1651
  %448 = zext i8 %414 to i32, !dbg !1651
  %449 = or disjoint i32 %447, %448, !dbg !1651
  %450 = zext i8 %429 to i32, !dbg !1652
  %451 = shl nuw i32 %450, 24, !dbg !1652
  %452 = zext i8 %427 to i32, !dbg !1652
  %453 = shl nuw nsw i32 %452, 16, !dbg !1652
  %454 = or disjoint i32 %451, %453, !dbg !1652
  %455 = zext i8 %425 to i32, !dbg !1652
  %456 = shl nuw nsw i32 %455, 8, !dbg !1652
  %457 = or disjoint i32 %454, %456, !dbg !1652
  %458 = zext i8 %423 to i32, !dbg !1652
  %459 = or disjoint i32 %457, %458, !dbg !1652
    #dbg_value(i32 %439, !631, !DIExpression(), !1654)
    #dbg_value(i32 %449, !632, !DIExpression(), !1654)
    #dbg_value(i32 poison, !633, !DIExpression(), !1654)
    #dbg_value(i32 %459, !634, !DIExpression(), !1654)
    #dbg_value(i32 %439, !635, !DIExpression(), !1654)
  %460 = icmp ult i32 %439, %449, !dbg !1652
  %461 = icmp eq i32 %459, 0, !dbg !1655
  br i1 %460, label %462, label %468, !dbg !1656

462:                                              ; preds = %403
    #dbg_value(i32 %439, !637, !DIExpression(), !1657)
    #dbg_value(i32 %459, !640, !DIExpression(), !1657)
  br i1 %461, label %465, label %463, !dbg !1658

463:                                              ; preds = %462
  %464 = udiv i32 %439, %459, !dbg !1659
    #dbg_value(i32 %464, !641, !DIExpression(), !1657)
  br label %465

465:                                              ; preds = %463, %462
  %466 = phi i32 [ %464, %463 ], [ 0, %462 ], !dbg !1660
    #dbg_value(i32 %466, !641, !DIExpression(), !1657)
    #dbg_value(i32 %466, !642, !DIExpression(), !1657)
  %467 = add i32 %466, %449, !dbg !1661
    #dbg_value(i32 %467, !636, !DIExpression(), !1654)
  br label %475, !dbg !1662

468:                                              ; preds = %403
    #dbg_value(i32 %449, !643, !DIExpression(), !1663)
    #dbg_value(i32 %459, !645, !DIExpression(), !1663)
  br i1 %461, label %471, label %469, !dbg !1664

469:                                              ; preds = %468
  %470 = urem i32 %449, %459, !dbg !1665
    #dbg_value(i32 %470, !646, !DIExpression(), !1663)
  br label %471

471:                                              ; preds = %469, %468
  %472 = phi i32 [ %470, %469 ], [ 0, %468 ], !dbg !1666
    #dbg_value(i32 %472, !646, !DIExpression(), !1663)
    #dbg_value(i32 %472, !647, !DIExpression(), !1663)
  %473 = add i32 %472, %439, !dbg !1667
    #dbg_value(i32 %473, !636, !DIExpression(), !1654)
  br label %475

474:                                              ; preds = %3
  tail call void @llvm.trap(), !dbg !1668
  unreachable, !dbg !1670

475:                                              ; preds = %471, %465, %400, %394, %252, %172, %169, %85
  %476 = phi i32 [ %331, %252 ], [ %251, %172 ], [ %171, %169 ], [ %87, %85 ], [ %396, %394 ], [ %402, %400 ], [ %467, %465 ], [ %473, %471 ], !dbg !1522
  ret i32 %476, !dbg !1671
}

; Function Attrs: cold noreturn nounwind memory(inaccessiblemem: write) uwtable
define hidden noundef i64 @ink_compute_scalar64(i32 noundef %0, ptr nocapture noundef readnone %1, ptr nocapture noundef readnone %2) local_unnamed_addr #10 !dbg !1672 {
    #dbg_value(i32 %0, !1678, !DIExpression(), !1681)
    #dbg_value(ptr %1, !1679, !DIExpression(), !1681)
    #dbg_value(ptr %2, !1680, !DIExpression(), !1681)
  tail call void @llvm.trap(), !dbg !1682
  unreachable, !dbg !1685
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
!175 = !{!176, !177, !178, !179, !180, !181, !182, !184, !187, !188, !189, !190, !191, !192, !193, !194, !195, !196, !197, !198, !199, !200, !201, !202, !203, !204, !205, !207, !210, !211, !212, !213, !214, !215, !216, !217, !218, !219, !222, !224, !225, !226, !227, !228, !229, !230, !232, !235, !236, !237, !238, !239, !240, !241, !242, !243, !244, !247, !248, !249, !250, !252, !253, !254}
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
!202 = !DILocalVariable(name: "t19", scope: !167, file: !15, line: 134, type: !170)
!203 = !DILocalVariable(name: "t20", scope: !167, file: !15, line: 136, type: !170)
!204 = !DILocalVariable(name: "t21", scope: !167, file: !15, line: 138, type: !170)
!205 = !DILocalVariable(name: "t22", scope: !206, file: !15, line: 139, type: !5)
!206 = distinct !DILexicalBlock(scope: !167, file: !15, line: 139, column: 1)
!207 = !DILocalVariable(name: "t23", scope: !208, file: !15, line: 140, type: !10)
!208 = distinct !DILexicalBlock(scope: !209, file: !15, line: 139, column: 36)
!209 = distinct !DILexicalBlock(scope: !206, file: !15, line: 139, column: 1)
!210 = !DILocalVariable(name: "t24", scope: !208, file: !15, line: 142, type: !10)
!211 = !DILocalVariable(name: "t25", scope: !208, file: !15, line: 144, type: !10)
!212 = !DILocalVariable(name: "t26", scope: !208, file: !15, line: 146, type: !10)
!213 = !DILocalVariable(name: "t27", scope: !208, file: !15, line: 149, type: !10)
!214 = !DILocalVariable(name: "t28", scope: !208, file: !15, line: 151, type: !10)
!215 = !DILocalVariable(name: "t29", scope: !208, file: !15, line: 153, type: !10)
!216 = !DILocalVariable(name: "t30", scope: !208, file: !15, line: 155, type: !10)
!217 = !DILocalVariable(name: "t31", scope: !208, file: !15, line: 158, type: !10)
!218 = !DILocalVariable(name: "t32", scope: !208, file: !15, line: 160, type: !10)
!219 = !DILocalVariable(name: "t33", scope: !220, file: !15, line: 162, type: !10)
!220 = distinct !DILexicalBlock(scope: !221, file: !15, line: 161, column: 18)
!221 = distinct !DILexicalBlock(scope: !208, file: !15, line: 161, column: 5)
!222 = !DILocalVariable(name: "t34", scope: !223, file: !15, line: 166, type: !10)
!223 = distinct !DILexicalBlock(scope: !221, file: !15, line: 165, column: 8)
!224 = !DILocalVariable(name: "t35", scope: !167, file: !15, line: 172, type: !170)
!225 = !DILocalVariable(name: "t36", scope: !167, file: !15, line: 174, type: !170)
!226 = !DILocalVariable(name: "t37", scope: !167, file: !15, line: 177, type: !5)
!227 = !DILocalVariable(name: "t38", scope: !167, file: !15, line: 178, type: !170)
!228 = !DILocalVariable(name: "t39", scope: !167, file: !15, line: 181, type: !170)
!229 = !DILocalVariable(name: "t40", scope: !167, file: !15, line: 183, type: !170)
!230 = !DILocalVariable(name: "t41", scope: !231, file: !15, line: 184, type: !5)
!231 = distinct !DILexicalBlock(scope: !167, file: !15, line: 184, column: 1)
!232 = !DILocalVariable(name: "t42", scope: !233, file: !15, line: 185, type: !10)
!233 = distinct !DILexicalBlock(scope: !234, file: !15, line: 184, column: 68)
!234 = distinct !DILexicalBlock(scope: !231, file: !15, line: 184, column: 1)
!235 = !DILocalVariable(name: "t43", scope: !233, file: !15, line: 187, type: !10)
!236 = !DILocalVariable(name: "t44", scope: !233, file: !15, line: 189, type: !10)
!237 = !DILocalVariable(name: "t45", scope: !233, file: !15, line: 191, type: !10)
!238 = !DILocalVariable(name: "t46", scope: !233, file: !15, line: 194, type: !10)
!239 = !DILocalVariable(name: "t47", scope: !233, file: !15, line: 196, type: !10)
!240 = !DILocalVariable(name: "t48", scope: !233, file: !15, line: 198, type: !10)
!241 = !DILocalVariable(name: "t49", scope: !233, file: !15, line: 200, type: !10)
!242 = !DILocalVariable(name: "t50", scope: !233, file: !15, line: 203, type: !10)
!243 = !DILocalVariable(name: "t51", scope: !233, file: !15, line: 205, type: !10)
!244 = !DILocalVariable(name: "t52", scope: !245, file: !15, line: 207, type: !10)
!245 = distinct !DILexicalBlock(scope: !246, file: !15, line: 206, column: 18)
!246 = distinct !DILexicalBlock(scope: !233, file: !15, line: 206, column: 5)
!247 = !DILocalVariable(name: "t53", scope: !245, file: !15, line: 209, type: !10)
!248 = !DILocalVariable(name: "t54", scope: !245, file: !15, line: 211, type: !10)
!249 = !DILocalVariable(name: "t55", scope: !245, file: !15, line: 215, type: !10)
!250 = !DILocalVariable(name: "t56", scope: !251, file: !15, line: 219, type: !10)
!251 = distinct !DILexicalBlock(scope: !246, file: !15, line: 218, column: 8)
!252 = !DILocalVariable(name: "t57", scope: !251, file: !15, line: 221, type: !10)
!253 = !DILocalVariable(name: "t58", scope: !251, file: !15, line: 223, type: !10)
!254 = !DILocalVariable(name: "t59", scope: !251, file: !15, line: 227, type: !10)
!255 = !DILocation(line: 85, column: 75, scope: !167)
!256 = !DILocation(line: 85, column: 91, scope: !167)
!257 = !DILocation(line: 0, scope: !167)
!258 = !DILocation(line: 90, column: 17, scope: !167)
!259 = !{!260, !260, i64 0}
!260 = !{!"p1 int", !261, i64 0}
!261 = !{!"any pointer", !29, i64 0}
!262 = !DILocation(line: 0, scope: !51, inlinedAt: !263)
!263 = distinct !DILocation(line: 92, column: 18, scope: !167)
!264 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !263)
!265 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !263)
!266 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !267)
!267 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !263)
!268 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !267)
!269 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !263)
!270 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !263)
!271 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !263)
!272 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !263)
!273 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !263)
!274 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !263)
!275 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !263)
!276 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !263)
!277 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !278)
!278 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !263)
!279 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !278)
!280 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !263)
!281 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !263)
!282 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !263)
!283 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !263)
!284 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !263)
!285 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !263)
!286 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !263)
!287 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !263)
!288 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !263)
!289 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !263)
!290 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !291)
!291 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !263)
!292 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !291)
!293 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !263)
!294 = !DILocation(line: 0, scope: !183)
!295 = !DILocation(line: 93, column: 19, scope: !186)
!296 = !DILocation(line: 93, column: 1, scope: !183)
!297 = !DILocation(line: 0, scope: !51, inlinedAt: !298)
!298 = distinct !DILocation(line: 138, column: 19, scope: !167)
!299 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !298)
!300 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !301)
!301 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !298)
!302 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !301)
!303 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !298)
!304 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !298)
!305 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !298)
!306 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !298)
!307 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !298)
!308 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !298)
!309 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !310)
!310 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !298)
!311 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !310)
!312 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !298)
!313 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !298)
!314 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !298)
!315 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !298)
!316 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !298)
!317 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !298)
!318 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !298)
!319 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !298)
!320 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !298)
!321 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !298)
!322 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !323)
!323 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !298)
!324 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !323)
!325 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !298)
!326 = !DILocation(line: 0, scope: !206)
!327 = !DILocation(line: 139, column: 1, scope: !206)
!328 = !DILocation(line: 139, column: 33, scope: !209)
!329 = !DILocation(line: 142, column: 14, scope: !208)
!330 = !{!331, !331, i64 0}
!331 = !{!"int", !29, i64 0}
!332 = !DILocation(line: 161, column: 10, scope: !221)
!333 = !DILocation(line: 161, column: 5, scope: !221)
!334 = !DILocation(line: 170, column: 1, scope: !208)
!335 = !DILocation(line: 170, column: 14, scope: !208)
!336 = distinct !{!336, !327, !337, !137, !138, !139}
!337 = !DILocation(line: 171, column: 1, scope: !206)
!338 = !DILocation(line: 0, scope: !208)
!339 = !DILocation(line: 0, scope: !185)
!340 = !DILocation(line: 117, column: 8, scope: !341)
!341 = distinct !DILexicalBlock(scope: !185, file: !15, line: 117, column: 5)
!342 = !DILocation(line: 96, column: 13, scope: !185)
!343 = !DILocation(line: 119, column: 18, scope: !344)
!344 = distinct !DILexicalBlock(scope: !341, file: !15, line: 119, column: 8)
!345 = !DILocation(line: 129, column: 18, scope: !346)
!346 = distinct !DILexicalBlock(scope: !347, file: !15, line: 129, column: 8)
!347 = distinct !DILexicalBlock(scope: !185, file: !15, line: 127, column: 5)
!348 = !DILocation(line: 130, column: 19, scope: !185)
!349 = !DILocation(line: 132, column: 18, scope: !185)
!350 = !DILocation(line: 132, column: 1, scope: !185)
!351 = !DILocation(line: 132, column: 12, scope: !185)
!352 = !DILocation(line: 93, column: 29, scope: !186)
!353 = distinct !{!353, !296, !354, !137}
!354 = !DILocation(line: 133, column: 1, scope: !183)
!355 = !DILocation(line: 174, column: 18, scope: !167)
!356 = !DILocation(line: 176, column: 20, scope: !357)
!357 = distinct !DILexicalBlock(scope: !167, file: !15, line: 176, column: 4)
!358 = !DILocation(line: 176, column: 11, scope: !357)
!359 = !DILocation(line: 139, column: 21, scope: !209)
!360 = distinct !{!360, !327, !337, !137, !138}
!361 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !362)
!362 = distinct !DILocation(line: 176, column: 30, scope: !357)
!363 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !362)
!364 = !DILocation(line: 177, column: 19, scope: !167)
!365 = !DILocation(line: 0, scope: !51, inlinedAt: !366)
!366 = distinct !DILocation(line: 178, column: 19, scope: !167)
!367 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !366)
!368 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !366)
!369 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !370)
!370 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !366)
!371 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !370)
!372 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !366)
!373 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !366)
!374 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !366)
!375 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !366)
!376 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !366)
!377 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !366)
!378 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !366)
!379 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !366)
!380 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !381)
!381 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !366)
!382 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !381)
!383 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !366)
!384 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !366)
!385 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !366)
!386 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !366)
!387 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !366)
!388 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !366)
!389 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !366)
!390 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !366)
!391 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !366)
!392 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !366)
!393 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !394)
!394 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !366)
!395 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !394)
!396 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !366)
!397 = !DILocation(line: 179, column: 35, scope: !167)
!398 = !DILocation(line: 0, scope: !111, inlinedAt: !399)
!399 = distinct !DILocation(line: 179, column: 1, scope: !167)
!400 = !DILocation(line: 0, scope: !123, inlinedAt: !399)
!401 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !399)
!402 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !399)
!403 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !399)
!404 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !399)
!405 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !399)
!406 = distinct !{!406, !401, !407, !137, !138, !139}
!407 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !399)
!408 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !399)
!409 = distinct !{!409, !401, !407, !137, !138}
!410 = !DILocation(line: 180, column: 18, scope: !167)
!411 = !DILocation(line: 180, column: 43, scope: !167)
!412 = !DILocation(line: 0, scope: !111, inlinedAt: !413)
!413 = distinct !DILocation(line: 180, column: 1, scope: !167)
!414 = !DILocation(line: 0, scope: !123, inlinedAt: !413)
!415 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !413)
!416 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !413)
!417 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !413)
!418 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !413)
!419 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !413)
!420 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !413)
!421 = distinct !{!421, !416, !422, !137, !138, !139}
!422 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !413)
!423 = distinct !{!423, !416, !422, !137, !138}
!424 = !DILocation(line: 183, column: 14, scope: !167)
!425 = !DILocation(line: 183, column: 30, scope: !167)
!426 = !DILocation(line: 0, scope: !51, inlinedAt: !427)
!427 = distinct !DILocation(line: 183, column: 19, scope: !167)
!428 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !427)
!429 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !430)
!430 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !427)
!431 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !430)
!432 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !427)
!433 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !427)
!434 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !427)
!435 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !427)
!436 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !427)
!437 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !427)
!438 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !427)
!439 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !427)
!440 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !441)
!441 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !427)
!442 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !441)
!443 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !427)
!444 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !427)
!445 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !427)
!446 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !427)
!447 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !427)
!448 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !427)
!449 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !427)
!450 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !427)
!451 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !427)
!452 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !427)
!453 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !454)
!454 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !427)
!455 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !454)
!456 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !427)
!457 = !DILocation(line: 183, column: 18, scope: !167)
!458 = !{!459, !260, i64 0}
!459 = !{!"", !260, i64 0, !28, i64 4}
!460 = !{!459, !28, i64 4}
!461 = !DILocation(line: 0, scope: !231)
!462 = !DILocation(line: 184, column: 21, scope: !234)
!463 = !DILocation(line: 184, column: 1, scope: !231)
!464 = !DILocation(line: 212, column: 8, scope: !465)
!465 = distinct !DILexicalBlock(scope: !245, file: !15, line: 212, column: 5)
!466 = !DILocation(line: 184, column: 65, scope: !234)
!467 = !DILocation(line: 185, column: 14, scope: !233)
!468 = !DILocation(line: 187, column: 14, scope: !233)
!469 = !DILocation(line: 206, column: 10, scope: !246)
!470 = !DILocation(line: 224, column: 8, scope: !471)
!471 = distinct !DILexicalBlock(scope: !251, file: !15, line: 224, column: 5)
!472 = !DILocation(line: 226, column: 18, scope: !473)
!473 = distinct !DILexicalBlock(scope: !471, file: !15, line: 226, column: 8)
!474 = !DILocation(line: 0, scope: !471)
!475 = !DILocation(line: 229, column: 10, scope: !251)
!476 = !DILocation(line: 214, column: 18, scope: !477)
!477 = distinct !DILexicalBlock(scope: !465, file: !15, line: 214, column: 8)
!478 = !DILocation(line: 0, scope: !465)
!479 = !DILocation(line: 217, column: 10, scope: !245)
!480 = !DILocation(line: 0, scope: !246)
!481 = !DILocation(line: 231, column: 1, scope: !233)
!482 = !DILocation(line: 231, column: 14, scope: !233)
!483 = distinct !{!483, !463, !484, !137, !138, !139}
!484 = !DILocation(line: 232, column: 1, scope: !231)
!485 = !DILocation(line: 234, column: 1, scope: !167)
!486 = !DILocation(line: 0, scope: !233)
!487 = !DILocation(line: 206, column: 5, scope: !246)
!488 = !DILocation(line: 0, scope: !245)
!489 = !DILocation(line: 218, column: 1, scope: !245)
!490 = !DILocation(line: 0, scope: !251)
!491 = distinct !{!491, !463, !484, !137, !138}
!492 = distinct !DISubprogram(name: "lang_fn_left_word", scope: !15, file: !15, line: 235, type: !493, scopeLine: 235, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !495)
!493 = !DISubroutineType(types: !494)
!494 = !{!10, !10, !10, !10, !10}
!495 = !{!496, !497, !498, !499, !500, !501, !502, !503, !504, !505, !506, !507, !508, !509, !510, !511}
!496 = !DILocalVariable(name: "a0", arg: 1, scope: !492, file: !15, line: 235, type: !10)
!497 = !DILocalVariable(name: "a1", arg: 2, scope: !492, file: !15, line: 235, type: !10)
!498 = !DILocalVariable(name: "a2", arg: 3, scope: !492, file: !15, line: 235, type: !10)
!499 = !DILocalVariable(name: "a3", arg: 4, scope: !492, file: !15, line: 235, type: !10)
!500 = !DILocalVariable(name: "t0", scope: !492, file: !15, line: 240, type: !10)
!501 = !DILocalVariable(name: "t1", scope: !492, file: !15, line: 242, type: !10)
!502 = !DILocalVariable(name: "t2", scope: !492, file: !15, line: 244, type: !10)
!503 = !DILocalVariable(name: "t3", scope: !492, file: !15, line: 246, type: !10)
!504 = !DILocalVariable(name: "t4", scope: !492, file: !15, line: 249, type: !10)
!505 = !DILocalVariable(name: "t5", scope: !492, file: !15, line: 251, type: !10)
!506 = !DILocalVariable(name: "t6", scope: !492, file: !15, line: 253, type: !10)
!507 = !DILocalVariable(name: "t7", scope: !492, file: !15, line: 257, type: !10)
!508 = !DILocalVariable(name: "t8", scope: !492, file: !15, line: 259, type: !10)
!509 = !DILocalVariable(name: "t9", scope: !492, file: !15, line: 261, type: !10)
!510 = !DILocalVariable(name: "t10", scope: !492, file: !15, line: 263, type: !10)
!511 = !DILocalVariable(name: "t11", scope: !492, file: !15, line: 267, type: !10)
!512 = !DILocation(line: 0, scope: !492)
!513 = !DILocation(line: 254, column: 7, scope: !514)
!514 = distinct !DILexicalBlock(scope: !492, file: !15, line: 254, column: 5)
!515 = !DILocation(line: 256, column: 16, scope: !516)
!516 = distinct !DILexicalBlock(scope: !514, file: !15, line: 256, column: 8)
!517 = !DILocation(line: 266, column: 17, scope: !518)
!518 = distinct !DILexicalBlock(scope: !519, file: !15, line: 266, column: 8)
!519 = distinct !DILexicalBlock(scope: !492, file: !15, line: 264, column: 5)
!520 = !DILocation(line: 267, column: 18, scope: !492)
!521 = !DILocation(line: 269, column: 13, scope: !492)
!522 = !DILocation(line: 269, column: 1, scope: !492)
!523 = distinct !DISubprogram(name: "lang_fn_left_signal", scope: !15, file: !15, line: 271, type: !493, scopeLine: 271, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !524)
!524 = !{!525, !526, !527, !528, !529, !530, !531, !532, !533, !534, !535, !536}
!525 = !DILocalVariable(name: "a0", arg: 1, scope: !523, file: !15, line: 271, type: !10)
!526 = !DILocalVariable(name: "a1", arg: 2, scope: !523, file: !15, line: 271, type: !10)
!527 = !DILocalVariable(name: "a2", arg: 3, scope: !523, file: !15, line: 271, type: !10)
!528 = !DILocalVariable(name: "a3", arg: 4, scope: !523, file: !15, line: 271, type: !10)
!529 = !DILocalVariable(name: "t0", scope: !523, file: !15, line: 276, type: !10)
!530 = !DILocalVariable(name: "t1", scope: !523, file: !15, line: 278, type: !10)
!531 = !DILocalVariable(name: "t2", scope: !523, file: !15, line: 280, type: !10)
!532 = !DILocalVariable(name: "t3", scope: !523, file: !15, line: 284, type: !10)
!533 = !DILocalVariable(name: "t4", scope: !523, file: !15, line: 286, type: !10)
!534 = !DILocalVariable(name: "t5", scope: !523, file: !15, line: 288, type: !10)
!535 = !DILocalVariable(name: "t6", scope: !523, file: !15, line: 290, type: !10)
!536 = !DILocalVariable(name: "t7", scope: !523, file: !15, line: 294, type: !10)
!537 = !DILocation(line: 0, scope: !523)
!538 = !DILocation(line: 281, column: 7, scope: !539)
!539 = distinct !DILexicalBlock(scope: !523, file: !15, line: 281, column: 5)
!540 = !DILocation(line: 283, column: 16, scope: !541)
!541 = distinct !DILexicalBlock(scope: !539, file: !15, line: 283, column: 8)
!542 = !DILocation(line: 293, column: 16, scope: !543)
!543 = distinct !DILexicalBlock(scope: !544, file: !15, line: 293, column: 8)
!544 = distinct !DILexicalBlock(scope: !523, file: !15, line: 291, column: 5)
!545 = !DILocation(line: 294, column: 17, scope: !523)
!546 = !DILocation(line: 296, column: 12, scope: !523)
!547 = !DILocation(line: 296, column: 1, scope: !523)
!548 = distinct !DISubprogram(name: "lang_fn_right_word", scope: !15, file: !15, line: 298, type: !493, scopeLine: 298, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !549)
!549 = !{!550, !551, !552, !553, !554, !555, !556, !557, !558, !559, !560, !563}
!550 = !DILocalVariable(name: "a0", arg: 1, scope: !548, file: !15, line: 298, type: !10)
!551 = !DILocalVariable(name: "a1", arg: 2, scope: !548, file: !15, line: 298, type: !10)
!552 = !DILocalVariable(name: "a2", arg: 3, scope: !548, file: !15, line: 298, type: !10)
!553 = !DILocalVariable(name: "a3", arg: 4, scope: !548, file: !15, line: 298, type: !10)
!554 = !DILocalVariable(name: "t0", scope: !548, file: !15, line: 303, type: !10)
!555 = !DILocalVariable(name: "t1", scope: !548, file: !15, line: 305, type: !10)
!556 = !DILocalVariable(name: "t2", scope: !548, file: !15, line: 307, type: !10)
!557 = !DILocalVariable(name: "t3", scope: !548, file: !15, line: 309, type: !10)
!558 = !DILocalVariable(name: "t4", scope: !548, file: !15, line: 312, type: !10)
!559 = !DILocalVariable(name: "t5", scope: !548, file: !15, line: 314, type: !10)
!560 = !DILocalVariable(name: "t6", scope: !561, file: !15, line: 316, type: !10)
!561 = distinct !DILexicalBlock(scope: !562, file: !15, line: 315, column: 16)
!562 = distinct !DILexicalBlock(scope: !548, file: !15, line: 315, column: 5)
!563 = !DILocalVariable(name: "t7", scope: !564, file: !15, line: 320, type: !10)
!564 = distinct !DILexicalBlock(scope: !562, file: !15, line: 319, column: 8)
!565 = !DILocation(line: 0, scope: !548)
!566 = !DILocation(line: 315, column: 9, scope: !562)
!567 = !DILocation(line: 315, column: 5, scope: !562)
!568 = !DILocation(line: 324, column: 1, scope: !548)
!569 = distinct !DISubprogram(name: "lang_fn_right_signal", scope: !15, file: !15, line: 326, type: !493, scopeLine: 326, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !570)
!570 = !{!571, !572, !573, !574, !575, !576, !577, !580}
!571 = !DILocalVariable(name: "a0", arg: 1, scope: !569, file: !15, line: 326, type: !10)
!572 = !DILocalVariable(name: "a1", arg: 2, scope: !569, file: !15, line: 326, type: !10)
!573 = !DILocalVariable(name: "a2", arg: 3, scope: !569, file: !15, line: 326, type: !10)
!574 = !DILocalVariable(name: "a3", arg: 4, scope: !569, file: !15, line: 326, type: !10)
!575 = !DILocalVariable(name: "t0", scope: !569, file: !15, line: 331, type: !10)
!576 = !DILocalVariable(name: "t1", scope: !569, file: !15, line: 333, type: !10)
!577 = !DILocalVariable(name: "t2", scope: !578, file: !15, line: 335, type: !10)
!578 = distinct !DILexicalBlock(scope: !579, file: !15, line: 334, column: 16)
!579 = distinct !DILexicalBlock(scope: !569, file: !15, line: 334, column: 5)
!580 = !DILocalVariable(name: "t3", scope: !581, file: !15, line: 339, type: !10)
!581 = distinct !DILexicalBlock(scope: !579, file: !15, line: 338, column: 8)
!582 = !DILocation(line: 0, scope: !569)
!583 = !DILocation(line: 334, column: 9, scope: !579)
!584 = !DILocation(line: 334, column: 5, scope: !579)
!585 = !DILocation(line: 343, column: 1, scope: !569)
!586 = distinct !DISubprogram(name: "lang_fn_pair_word", scope: !15, file: !15, line: 345, type: !493, scopeLine: 345, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !587)
!587 = !{!588, !589, !590, !591, !592, !593, !594, !595, !596, !597, !598, !601, !602, !603, !604, !606, !607, !608}
!588 = !DILocalVariable(name: "a0", arg: 1, scope: !586, file: !15, line: 345, type: !10)
!589 = !DILocalVariable(name: "a1", arg: 2, scope: !586, file: !15, line: 345, type: !10)
!590 = !DILocalVariable(name: "a2", arg: 3, scope: !586, file: !15, line: 345, type: !10)
!591 = !DILocalVariable(name: "a3", arg: 4, scope: !586, file: !15, line: 345, type: !10)
!592 = !DILocalVariable(name: "t0", scope: !586, file: !15, line: 350, type: !10)
!593 = !DILocalVariable(name: "t1", scope: !586, file: !15, line: 352, type: !10)
!594 = !DILocalVariable(name: "t2", scope: !586, file: !15, line: 354, type: !10)
!595 = !DILocalVariable(name: "t3", scope: !586, file: !15, line: 356, type: !10)
!596 = !DILocalVariable(name: "t4", scope: !586, file: !15, line: 359, type: !10)
!597 = !DILocalVariable(name: "t5", scope: !586, file: !15, line: 361, type: !10)
!598 = !DILocalVariable(name: "t6", scope: !599, file: !15, line: 363, type: !10)
!599 = distinct !DILexicalBlock(scope: !600, file: !15, line: 362, column: 16)
!600 = distinct !DILexicalBlock(scope: !586, file: !15, line: 362, column: 5)
!601 = !DILocalVariable(name: "t7", scope: !599, file: !15, line: 365, type: !10)
!602 = !DILocalVariable(name: "t8", scope: !599, file: !15, line: 367, type: !10)
!603 = !DILocalVariable(name: "t9", scope: !599, file: !15, line: 371, type: !10)
!604 = !DILocalVariable(name: "t10", scope: !605, file: !15, line: 375, type: !10)
!605 = distinct !DILexicalBlock(scope: !600, file: !15, line: 374, column: 8)
!606 = !DILocalVariable(name: "t11", scope: !605, file: !15, line: 377, type: !10)
!607 = !DILocalVariable(name: "t12", scope: !605, file: !15, line: 379, type: !10)
!608 = !DILocalVariable(name: "t13", scope: !605, file: !15, line: 383, type: !10)
!609 = !DILocation(line: 0, scope: !586)
!610 = !DILocation(line: 362, column: 9, scope: !600)
!611 = !DILocation(line: 0, scope: !600)
!612 = !DILocation(line: 362, column: 5, scope: !600)
!613 = !DILocation(line: 0, scope: !599)
!614 = !DILocation(line: 368, column: 7, scope: !615)
!615 = distinct !DILexicalBlock(scope: !599, file: !15, line: 368, column: 5)
!616 = !DILocation(line: 370, column: 16, scope: !617)
!617 = distinct !DILexicalBlock(scope: !615, file: !15, line: 370, column: 8)
!618 = !DILocation(line: 0, scope: !615)
!619 = !DILocation(line: 373, column: 8, scope: !599)
!620 = !DILocation(line: 374, column: 1, scope: !599)
!621 = !DILocation(line: 0, scope: !605)
!622 = !DILocation(line: 380, column: 8, scope: !623)
!623 = distinct !DILexicalBlock(scope: !605, file: !15, line: 380, column: 5)
!624 = !DILocation(line: 382, column: 18, scope: !625)
!625 = distinct !DILexicalBlock(scope: !623, file: !15, line: 382, column: 8)
!626 = !DILocation(line: 0, scope: !623)
!627 = !DILocation(line: 385, column: 9, scope: !605)
!628 = !DILocation(line: 387, column: 1, scope: !586)
!629 = distinct !DISubprogram(name: "lang_fn_pair_signal", scope: !15, file: !15, line: 389, type: !493, scopeLine: 389, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !630)
!630 = !{!631, !632, !633, !634, !635, !636, !637, !640, !641, !642, !643, !645, !646, !647}
!631 = !DILocalVariable(name: "a0", arg: 1, scope: !629, file: !15, line: 389, type: !10)
!632 = !DILocalVariable(name: "a1", arg: 2, scope: !629, file: !15, line: 389, type: !10)
!633 = !DILocalVariable(name: "a2", arg: 3, scope: !629, file: !15, line: 389, type: !10)
!634 = !DILocalVariable(name: "a3", arg: 4, scope: !629, file: !15, line: 389, type: !10)
!635 = !DILocalVariable(name: "t0", scope: !629, file: !15, line: 394, type: !10)
!636 = !DILocalVariable(name: "t1", scope: !629, file: !15, line: 396, type: !10)
!637 = !DILocalVariable(name: "t2", scope: !638, file: !15, line: 398, type: !10)
!638 = distinct !DILexicalBlock(scope: !639, file: !15, line: 397, column: 16)
!639 = distinct !DILexicalBlock(scope: !629, file: !15, line: 397, column: 5)
!640 = !DILocalVariable(name: "t3", scope: !638, file: !15, line: 400, type: !10)
!641 = !DILocalVariable(name: "t4", scope: !638, file: !15, line: 402, type: !10)
!642 = !DILocalVariable(name: "t5", scope: !638, file: !15, line: 406, type: !10)
!643 = !DILocalVariable(name: "t6", scope: !644, file: !15, line: 410, type: !10)
!644 = distinct !DILexicalBlock(scope: !639, file: !15, line: 409, column: 8)
!645 = !DILocalVariable(name: "t7", scope: !644, file: !15, line: 412, type: !10)
!646 = !DILocalVariable(name: "t8", scope: !644, file: !15, line: 414, type: !10)
!647 = !DILocalVariable(name: "t9", scope: !644, file: !15, line: 418, type: !10)
!648 = !DILocation(line: 0, scope: !629)
!649 = !DILocation(line: 397, column: 9, scope: !639)
!650 = !DILocation(line: 0, scope: !639)
!651 = !DILocation(line: 397, column: 5, scope: !639)
!652 = !DILocation(line: 0, scope: !638)
!653 = !DILocation(line: 403, column: 7, scope: !654)
!654 = distinct !DILexicalBlock(scope: !638, file: !15, line: 403, column: 5)
!655 = !DILocation(line: 405, column: 16, scope: !656)
!656 = distinct !DILexicalBlock(scope: !654, file: !15, line: 405, column: 8)
!657 = !DILocation(line: 0, scope: !654)
!658 = !DILocation(line: 408, column: 8, scope: !638)
!659 = !DILocation(line: 409, column: 1, scope: !638)
!660 = !DILocation(line: 0, scope: !644)
!661 = !DILocation(line: 415, column: 7, scope: !662)
!662 = distinct !DILexicalBlock(scope: !644, file: !15, line: 415, column: 5)
!663 = !DILocation(line: 417, column: 16, scope: !664)
!664 = distinct !DILexicalBlock(scope: !662, file: !15, line: 417, column: 8)
!665 = !DILocation(line: 0, scope: !662)
!666 = !DILocation(line: 420, column: 8, scope: !644)
!667 = !DILocation(line: 422, column: 1, scope: !629)
!668 = distinct !DISubprogram(name: "lang_fn_pipeline38_right_padded_zip_heldout_u32_into", scope: !15, file: !15, line: 424, type: !669, scopeLine: 424, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !671)
!669 = !DISubroutineType(types: !670)
!670 = !{!5, !170, !170, !10, !10, !13}
!671 = !{!672, !673, !674, !675, !676, !677, !678, !679, !681, !684, !685, !686, !687, !688, !689, !690, !691, !692, !693, !694, !695, !696, !697, !698, !699, !700, !701, !702, !704, !707, !708, !709, !710, !711, !712, !713, !714, !715, !716, !719, !721, !722, !723, !724, !725, !726, !727, !729, !732, !733, !734, !735, !736, !737, !738, !739, !740, !741, !744, !745, !746, !747, !749, !750, !751}
!672 = !DILocalVariable(name: "a0", arg: 1, scope: !668, file: !15, line: 424, type: !170)
!673 = !DILocalVariable(name: "a1", arg: 2, scope: !668, file: !15, line: 424, type: !170)
!674 = !DILocalVariable(name: "a2", arg: 3, scope: !668, file: !15, line: 424, type: !10)
!675 = !DILocalVariable(name: "a3", arg: 4, scope: !668, file: !15, line: 424, type: !10)
!676 = !DILocalVariable(name: "destination", arg: 5, scope: !668, file: !15, line: 424, type: !13)
!677 = !DILocalVariable(name: "t0", scope: !668, file: !15, line: 429, type: !170)
!678 = !DILocalVariable(name: "t1", scope: !668, file: !15, line: 431, type: !170)
!679 = !DILocalVariable(name: "t2", scope: !680, file: !15, line: 432, type: !5)
!680 = distinct !DILexicalBlock(scope: !668, file: !15, line: 432, column: 1)
!681 = !DILocalVariable(name: "t3", scope: !682, file: !15, line: 433, type: !10)
!682 = distinct !DILexicalBlock(scope: !683, file: !15, line: 432, column: 32)
!683 = distinct !DILexicalBlock(scope: !680, file: !15, line: 432, column: 1)
!684 = !DILocalVariable(name: "t4", scope: !682, file: !15, line: 435, type: !10)
!685 = !DILocalVariable(name: "t5", scope: !682, file: !15, line: 437, type: !10)
!686 = !DILocalVariable(name: "t6", scope: !682, file: !15, line: 439, type: !10)
!687 = !DILocalVariable(name: "t7", scope: !682, file: !15, line: 442, type: !10)
!688 = !DILocalVariable(name: "t8", scope: !682, file: !15, line: 444, type: !10)
!689 = !DILocalVariable(name: "t9", scope: !682, file: !15, line: 446, type: !10)
!690 = !DILocalVariable(name: "t10", scope: !682, file: !15, line: 448, type: !10)
!691 = !DILocalVariable(name: "t11", scope: !682, file: !15, line: 451, type: !10)
!692 = !DILocalVariable(name: "t12", scope: !682, file: !15, line: 453, type: !10)
!693 = !DILocalVariable(name: "t13", scope: !682, file: !15, line: 455, type: !10)
!694 = !DILocalVariable(name: "t14", scope: !682, file: !15, line: 459, type: !10)
!695 = !DILocalVariable(name: "t15", scope: !682, file: !15, line: 461, type: !10)
!696 = !DILocalVariable(name: "t16", scope: !682, file: !15, line: 463, type: !10)
!697 = !DILocalVariable(name: "t17", scope: !682, file: !15, line: 465, type: !10)
!698 = !DILocalVariable(name: "t18", scope: !682, file: !15, line: 469, type: !10)
!699 = !DILocalVariable(name: "t19", scope: !668, file: !15, line: 473, type: !170)
!700 = !DILocalVariable(name: "t20", scope: !668, file: !15, line: 475, type: !170)
!701 = !DILocalVariable(name: "t21", scope: !668, file: !15, line: 477, type: !170)
!702 = !DILocalVariable(name: "t22", scope: !703, file: !15, line: 478, type: !5)
!703 = distinct !DILexicalBlock(scope: !668, file: !15, line: 478, column: 1)
!704 = !DILocalVariable(name: "t23", scope: !705, file: !15, line: 479, type: !10)
!705 = distinct !DILexicalBlock(scope: !706, file: !15, line: 478, column: 36)
!706 = distinct !DILexicalBlock(scope: !703, file: !15, line: 478, column: 1)
!707 = !DILocalVariable(name: "t24", scope: !705, file: !15, line: 481, type: !10)
!708 = !DILocalVariable(name: "t25", scope: !705, file: !15, line: 483, type: !10)
!709 = !DILocalVariable(name: "t26", scope: !705, file: !15, line: 485, type: !10)
!710 = !DILocalVariable(name: "t27", scope: !705, file: !15, line: 488, type: !10)
!711 = !DILocalVariable(name: "t28", scope: !705, file: !15, line: 490, type: !10)
!712 = !DILocalVariable(name: "t29", scope: !705, file: !15, line: 492, type: !10)
!713 = !DILocalVariable(name: "t30", scope: !705, file: !15, line: 494, type: !10)
!714 = !DILocalVariable(name: "t31", scope: !705, file: !15, line: 497, type: !10)
!715 = !DILocalVariable(name: "t32", scope: !705, file: !15, line: 499, type: !10)
!716 = !DILocalVariable(name: "t33", scope: !717, file: !15, line: 501, type: !10)
!717 = distinct !DILexicalBlock(scope: !718, file: !15, line: 500, column: 18)
!718 = distinct !DILexicalBlock(scope: !705, file: !15, line: 500, column: 5)
!719 = !DILocalVariable(name: "t34", scope: !720, file: !15, line: 505, type: !10)
!720 = distinct !DILexicalBlock(scope: !718, file: !15, line: 504, column: 8)
!721 = !DILocalVariable(name: "t35", scope: !668, file: !15, line: 511, type: !170)
!722 = !DILocalVariable(name: "t36", scope: !668, file: !15, line: 513, type: !170)
!723 = !DILocalVariable(name: "t37", scope: !668, file: !15, line: 516, type: !5)
!724 = !DILocalVariable(name: "t38", scope: !668, file: !15, line: 517, type: !170)
!725 = !DILocalVariable(name: "t39", scope: !668, file: !15, line: 520, type: !170)
!726 = !DILocalVariable(name: "t40", scope: !668, file: !15, line: 522, type: !170)
!727 = !DILocalVariable(name: "t41", scope: !728, file: !15, line: 523, type: !5)
!728 = distinct !DILexicalBlock(scope: !668, file: !15, line: 523, column: 1)
!729 = !DILocalVariable(name: "t42", scope: !730, file: !15, line: 524, type: !10)
!730 = distinct !DILexicalBlock(scope: !731, file: !15, line: 523, column: 68)
!731 = distinct !DILexicalBlock(scope: !728, file: !15, line: 523, column: 1)
!732 = !DILocalVariable(name: "t43", scope: !730, file: !15, line: 526, type: !10)
!733 = !DILocalVariable(name: "t44", scope: !730, file: !15, line: 528, type: !10)
!734 = !DILocalVariable(name: "t45", scope: !730, file: !15, line: 530, type: !10)
!735 = !DILocalVariable(name: "t46", scope: !730, file: !15, line: 533, type: !10)
!736 = !DILocalVariable(name: "t47", scope: !730, file: !15, line: 535, type: !10)
!737 = !DILocalVariable(name: "t48", scope: !730, file: !15, line: 537, type: !10)
!738 = !DILocalVariable(name: "t49", scope: !730, file: !15, line: 539, type: !10)
!739 = !DILocalVariable(name: "t50", scope: !730, file: !15, line: 542, type: !10)
!740 = !DILocalVariable(name: "t51", scope: !730, file: !15, line: 544, type: !10)
!741 = !DILocalVariable(name: "t52", scope: !742, file: !15, line: 546, type: !10)
!742 = distinct !DILexicalBlock(scope: !743, file: !15, line: 545, column: 18)
!743 = distinct !DILexicalBlock(scope: !730, file: !15, line: 545, column: 5)
!744 = !DILocalVariable(name: "t53", scope: !742, file: !15, line: 548, type: !10)
!745 = !DILocalVariable(name: "t54", scope: !742, file: !15, line: 550, type: !10)
!746 = !DILocalVariable(name: "t55", scope: !742, file: !15, line: 554, type: !10)
!747 = !DILocalVariable(name: "t56", scope: !748, file: !15, line: 558, type: !10)
!748 = distinct !DILexicalBlock(scope: !743, file: !15, line: 557, column: 8)
!749 = !DILocalVariable(name: "t57", scope: !748, file: !15, line: 560, type: !10)
!750 = !DILocalVariable(name: "t58", scope: !748, file: !15, line: 562, type: !10)
!751 = !DILocalVariable(name: "t59", scope: !748, file: !15, line: 566, type: !10)
!752 = !DILocation(line: 424, column: 74, scope: !668)
!753 = !DILocation(line: 424, column: 90, scope: !668)
!754 = !DILocation(line: 0, scope: !668)
!755 = !DILocation(line: 429, column: 17, scope: !668)
!756 = !DILocation(line: 0, scope: !51, inlinedAt: !757)
!757 = distinct !DILocation(line: 431, column: 18, scope: !668)
!758 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !757)
!759 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !757)
!760 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !761)
!761 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !757)
!762 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !761)
!763 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !757)
!764 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !757)
!765 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !757)
!766 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !757)
!767 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !757)
!768 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !757)
!769 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !757)
!770 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !757)
!771 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !772)
!772 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !757)
!773 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !772)
!774 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !757)
!775 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !757)
!776 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !757)
!777 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !757)
!778 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !757)
!779 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !757)
!780 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !757)
!781 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !757)
!782 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !757)
!783 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !757)
!784 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !785)
!785 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !757)
!786 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !785)
!787 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !757)
!788 = !DILocation(line: 0, scope: !680)
!789 = !DILocation(line: 432, column: 19, scope: !683)
!790 = !DILocation(line: 432, column: 1, scope: !680)
!791 = !DILocation(line: 0, scope: !51, inlinedAt: !792)
!792 = distinct !DILocation(line: 477, column: 19, scope: !668)
!793 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !792)
!794 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !795)
!795 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !792)
!796 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !795)
!797 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !792)
!798 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !792)
!799 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !792)
!800 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !792)
!801 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !792)
!802 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !792)
!803 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !804)
!804 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !792)
!805 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !804)
!806 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !792)
!807 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !792)
!808 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !792)
!809 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !792)
!810 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !792)
!811 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !792)
!812 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !792)
!813 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !792)
!814 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !792)
!815 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !792)
!816 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !817)
!817 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !792)
!818 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !817)
!819 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !792)
!820 = !DILocation(line: 0, scope: !703)
!821 = !DILocation(line: 478, column: 1, scope: !703)
!822 = !DILocation(line: 478, column: 33, scope: !706)
!823 = !DILocation(line: 481, column: 14, scope: !705)
!824 = !DILocation(line: 500, column: 10, scope: !718)
!825 = !DILocation(line: 500, column: 5, scope: !718)
!826 = !DILocation(line: 509, column: 1, scope: !705)
!827 = !DILocation(line: 509, column: 14, scope: !705)
!828 = distinct !{!828, !821, !829, !137, !138, !139}
!829 = !DILocation(line: 510, column: 1, scope: !703)
!830 = !DILocation(line: 0, scope: !705)
!831 = !DILocation(line: 0, scope: !682)
!832 = !DILocation(line: 456, column: 8, scope: !833)
!833 = distinct !DILexicalBlock(scope: !682, file: !15, line: 456, column: 5)
!834 = !DILocation(line: 435, column: 13, scope: !682)
!835 = !DILocation(line: 458, column: 18, scope: !836)
!836 = distinct !DILexicalBlock(scope: !833, file: !15, line: 458, column: 8)
!837 = !DILocation(line: 468, column: 18, scope: !838)
!838 = distinct !DILexicalBlock(scope: !839, file: !15, line: 468, column: 8)
!839 = distinct !DILexicalBlock(scope: !682, file: !15, line: 466, column: 5)
!840 = !DILocation(line: 469, column: 19, scope: !682)
!841 = !DILocation(line: 471, column: 18, scope: !682)
!842 = !DILocation(line: 471, column: 1, scope: !682)
!843 = !DILocation(line: 471, column: 12, scope: !682)
!844 = !DILocation(line: 432, column: 29, scope: !683)
!845 = distinct !{!845, !790, !846, !137}
!846 = !DILocation(line: 472, column: 1, scope: !680)
!847 = !DILocation(line: 513, column: 18, scope: !668)
!848 = !DILocation(line: 515, column: 20, scope: !849)
!849 = distinct !DILexicalBlock(scope: !668, file: !15, line: 515, column: 4)
!850 = !DILocation(line: 515, column: 11, scope: !849)
!851 = !DILocation(line: 478, column: 21, scope: !706)
!852 = distinct !{!852, !821, !829, !137, !138}
!853 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !854)
!854 = distinct !DILocation(line: 515, column: 30, scope: !849)
!855 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !854)
!856 = !DILocation(line: 516, column: 19, scope: !668)
!857 = !DILocation(line: 0, scope: !51, inlinedAt: !858)
!858 = distinct !DILocation(line: 517, column: 19, scope: !668)
!859 = !DILocation(line: 18, column: 18, scope: !63, inlinedAt: !858)
!860 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !858)
!861 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !862)
!862 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !858)
!863 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !862)
!864 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !858)
!865 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !858)
!866 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !858)
!867 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !858)
!868 = !DILocation(line: 20, column: 16, scope: !51, inlinedAt: !858)
!869 = !DILocation(line: 20, column: 30, scope: !51, inlinedAt: !858)
!870 = !DILocation(line: 20, column: 54, scope: !79, inlinedAt: !858)
!871 = !DILocation(line: 20, column: 45, scope: !79, inlinedAt: !858)
!872 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !873)
!873 = distinct !DILocation(line: 20, column: 61, scope: !79, inlinedAt: !858)
!874 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !873)
!875 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !858)
!876 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !858)
!877 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !858)
!878 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !858)
!879 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !858)
!880 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !858)
!881 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !858)
!882 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !858)
!883 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !858)
!884 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !858)
!885 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !886)
!886 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !858)
!887 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !886)
!888 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !858)
!889 = !DILocation(line: 518, column: 35, scope: !668)
!890 = !DILocation(line: 0, scope: !111, inlinedAt: !891)
!891 = distinct !DILocation(line: 518, column: 1, scope: !668)
!892 = !DILocation(line: 0, scope: !123, inlinedAt: !891)
!893 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !891)
!894 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !891)
!895 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !891)
!896 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !891)
!897 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !891)
!898 = distinct !{!898, !893, !899, !137, !138, !139}
!899 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !891)
!900 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !891)
!901 = distinct !{!901, !893, !899, !137, !138}
!902 = !DILocation(line: 519, column: 18, scope: !668)
!903 = !DILocation(line: 519, column: 43, scope: !668)
!904 = !DILocation(line: 0, scope: !111, inlinedAt: !905)
!905 = distinct !DILocation(line: 519, column: 1, scope: !668)
!906 = !DILocation(line: 0, scope: !123, inlinedAt: !905)
!907 = !DILocation(line: 37, column: 154, scope: !128, inlinedAt: !905)
!908 = !DILocation(line: 37, column: 138, scope: !123, inlinedAt: !905)
!909 = !DILocation(line: 37, column: 162, scope: !128, inlinedAt: !905)
!910 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !905)
!911 = !DILocation(line: 37, column: 165, scope: !128, inlinedAt: !905)
!912 = !DILocation(line: 37, column: 171, scope: !128, inlinedAt: !905)
!913 = distinct !{!913, !908, !914, !137, !138, !139}
!914 = !DILocation(line: 37, column: 177, scope: !123, inlinedAt: !905)
!915 = distinct !{!915, !908, !914, !137, !138}
!916 = !DILocation(line: 522, column: 32, scope: !668)
!917 = !DILocation(line: 0, scope: !728)
!918 = !DILocation(line: 523, column: 21, scope: !731)
!919 = !DILocation(line: 523, column: 1, scope: !728)
!920 = !DILocation(line: 551, column: 8, scope: !921)
!921 = distinct !DILexicalBlock(scope: !742, file: !15, line: 551, column: 5)
!922 = !DILocation(line: 523, column: 65, scope: !731)
!923 = !DILocation(line: 524, column: 14, scope: !730)
!924 = !DILocation(line: 526, column: 14, scope: !730)
!925 = !DILocation(line: 545, column: 10, scope: !743)
!926 = !DILocation(line: 563, column: 8, scope: !927)
!927 = distinct !DILexicalBlock(scope: !748, file: !15, line: 563, column: 5)
!928 = !DILocation(line: 565, column: 18, scope: !929)
!929 = distinct !DILexicalBlock(scope: !927, file: !15, line: 565, column: 8)
!930 = !DILocation(line: 0, scope: !927)
!931 = !DILocation(line: 568, column: 10, scope: !748)
!932 = !DILocation(line: 553, column: 18, scope: !933)
!933 = distinct !DILexicalBlock(scope: !921, file: !15, line: 553, column: 8)
!934 = !DILocation(line: 0, scope: !921)
!935 = !DILocation(line: 556, column: 10, scope: !742)
!936 = !DILocation(line: 0, scope: !743)
!937 = !DILocation(line: 570, column: 1, scope: !730)
!938 = !DILocation(line: 570, column: 14, scope: !730)
!939 = distinct !{!939, !919, !940, !137, !138, !139}
!940 = !DILocation(line: 571, column: 1, scope: !728)
!941 = !DILocation(line: 572, column: 1, scope: !668)
!942 = !DILocation(line: 0, scope: !730)
!943 = !DILocation(line: 545, column: 5, scope: !743)
!944 = !DILocation(line: 0, scope: !742)
!945 = !DILocation(line: 557, column: 1, scope: !742)
!946 = !DILocation(line: 0, scope: !748)
!947 = distinct !{!947, !919, !940, !137, !138}
!948 = distinct !DISubprogram(name: "ink_compute_into", scope: !15, file: !15, line: 574, type: !949, scopeLine: 574, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !955)
!949 = !DISubroutineType(types: !950)
!950 = !{!5, !10, !951, !953, !8}
!951 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !952, size: 32)
!952 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !103)
!953 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !954, size: 32)
!954 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !5)
!955 = !{!956, !957, !958, !959, !960, !963, !964, !965}
!956 = !DILocalVariable(name: "function", arg: 1, scope: !948, file: !15, line: 574, type: !10)
!957 = !DILocalVariable(name: "data", arg: 2, scope: !948, file: !15, line: 574, type: !951)
!958 = !DILocalVariable(name: "lengths", arg: 3, scope: !948, file: !15, line: 574, type: !953)
!959 = !DILocalVariable(name: "destination", arg: 4, scope: !948, file: !15, line: 574, type: !8)
!960 = !DILocalVariable(name: "a0", scope: !961, file: !15, line: 575, type: !13)
!961 = distinct !DILexicalBlock(scope: !962, file: !15, line: 575, column: 8)
!962 = distinct !DILexicalBlock(scope: !948, file: !15, line: 574, column: 167)
!963 = !DILocalVariable(name: "a1", scope: !961, file: !15, line: 575, type: !13)
!964 = !DILocalVariable(name: "a2", scope: !961, file: !15, line: 575, type: !10)
!965 = !DILocalVariable(name: "a3", scope: !961, file: !15, line: 575, type: !10)
!966 = !DILocation(line: 0, scope: !111, inlinedAt: !967)
!967 = distinct !DILocation(line: 575, column: 87, scope: !961)
!968 = !DILocation(line: 0, scope: !111, inlinedAt: !969)
!969 = distinct !DILocation(line: 575, column: 132, scope: !961)
!970 = !DILocation(line: 0, scope: !948)
!971 = !DILocation(line: 574, column: 151, scope: !948)
!972 = !DILocation(line: 575, column: 34, scope: !961)
!973 = !{!261, !261, i64 0}
!974 = !DILocation(line: 0, scope: !961)
!975 = !DILocation(line: 575, column: 67, scope: !961)
!976 = !DILocation(line: 575, column: 100, scope: !961)
!977 = !DILocation(line: 0, scope: !123, inlinedAt: !967)
!978 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !967)
!979 = !DILocation(line: 575, column: 145, scope: !961)
!980 = !DILocation(line: 0, scope: !123, inlinedAt: !969)
!981 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !969)
!982 = !DILocation(line: 575, column: 239, scope: !961)
!983 = !DILocation(line: 575, column: 243, scope: !961)
!984 = !DILocation(line: 575, column: 269, scope: !961)
!985 = !DILocation(line: 575, column: 273, scope: !961)
!986 = !DILocation(line: 575, column: 288, scope: !961)
!987 = !DILocation(line: 575, column: 172, scope: !961)
!988 = !DILocation(line: 576, column: 30, scope: !948)
!989 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !990)
!990 = distinct !DILocation(line: 576, column: 9, scope: !962)
!991 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !990)
!992 = distinct !DISubprogram(name: "ink_compute_call", scope: !15, file: !15, line: 577, type: !993, scopeLine: 577, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !997)
!993 = !DISubroutineType(types: !994)
!994 = !{null, !10, !951, !953, !995, !996}
!995 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !8, size: 32)
!996 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !5, size: 32)
!997 = !{!998, !999, !1000, !1001, !1002, !1003, !1006, !1007, !1008, !1009, !1010, !1012, !1013, !1014, !1015, !1016, !1017, !1019, !1020, !1021, !1022, !1023, !1024, !1026, !1027, !1028, !1029, !1030, !1031, !1033, !1034, !1035, !1036, !1037, !1038, !1040, !1041, !1042, !1043, !1044, !1045, !1047, !1048, !1049, !1050, !1051}
!998 = !DILocalVariable(name: "function", arg: 1, scope: !992, file: !15, line: 577, type: !10)
!999 = !DILocalVariable(name: "data", arg: 2, scope: !992, file: !15, line: 577, type: !951)
!1000 = !DILocalVariable(name: "lengths", arg: 3, scope: !992, file: !15, line: 577, type: !953)
!1001 = !DILocalVariable(name: "output", arg: 4, scope: !992, file: !15, line: 577, type: !995)
!1002 = !DILocalVariable(name: "count", arg: 5, scope: !992, file: !15, line: 577, type: !996)
!1003 = !DILocalVariable(name: "a0", scope: !1004, file: !15, line: 578, type: !13)
!1004 = distinct !DILexicalBlock(scope: !1005, file: !15, line: 578, column: 8)
!1005 = distinct !DILexicalBlock(scope: !992, file: !15, line: 577, column: 158)
!1006 = !DILocalVariable(name: "a1", scope: !1004, file: !15, line: 578, type: !13)
!1007 = !DILocalVariable(name: "a2", scope: !1004, file: !15, line: 578, type: !10)
!1008 = !DILocalVariable(name: "a3", scope: !1004, file: !15, line: 578, type: !10)
!1009 = !DILocalVariable(name: "result", scope: !1004, file: !15, line: 578, type: !170)
!1010 = !DILocalVariable(name: "a0", scope: !1011, file: !15, line: 579, type: !10)
!1011 = distinct !DILexicalBlock(scope: !1005, file: !15, line: 579, column: 8)
!1012 = !DILocalVariable(name: "a1", scope: !1011, file: !15, line: 579, type: !10)
!1013 = !DILocalVariable(name: "a2", scope: !1011, file: !15, line: 579, type: !10)
!1014 = !DILocalVariable(name: "a3", scope: !1011, file: !15, line: 579, type: !10)
!1015 = !DILocalVariable(name: "result", scope: !1011, file: !15, line: 579, type: !10)
!1016 = !DILocalVariable(name: "copy", scope: !1011, file: !15, line: 579, type: !13)
!1017 = !DILocalVariable(name: "a0", scope: !1018, file: !15, line: 580, type: !10)
!1018 = distinct !DILexicalBlock(scope: !1005, file: !15, line: 580, column: 8)
!1019 = !DILocalVariable(name: "a1", scope: !1018, file: !15, line: 580, type: !10)
!1020 = !DILocalVariable(name: "a2", scope: !1018, file: !15, line: 580, type: !10)
!1021 = !DILocalVariable(name: "a3", scope: !1018, file: !15, line: 580, type: !10)
!1022 = !DILocalVariable(name: "result", scope: !1018, file: !15, line: 580, type: !10)
!1023 = !DILocalVariable(name: "copy", scope: !1018, file: !15, line: 580, type: !13)
!1024 = !DILocalVariable(name: "a0", scope: !1025, file: !15, line: 581, type: !10)
!1025 = distinct !DILexicalBlock(scope: !1005, file: !15, line: 581, column: 8)
!1026 = !DILocalVariable(name: "a1", scope: !1025, file: !15, line: 581, type: !10)
!1027 = !DILocalVariable(name: "a2", scope: !1025, file: !15, line: 581, type: !10)
!1028 = !DILocalVariable(name: "a3", scope: !1025, file: !15, line: 581, type: !10)
!1029 = !DILocalVariable(name: "result", scope: !1025, file: !15, line: 581, type: !10)
!1030 = !DILocalVariable(name: "copy", scope: !1025, file: !15, line: 581, type: !13)
!1031 = !DILocalVariable(name: "a0", scope: !1032, file: !15, line: 582, type: !10)
!1032 = distinct !DILexicalBlock(scope: !1005, file: !15, line: 582, column: 8)
!1033 = !DILocalVariable(name: "a1", scope: !1032, file: !15, line: 582, type: !10)
!1034 = !DILocalVariable(name: "a2", scope: !1032, file: !15, line: 582, type: !10)
!1035 = !DILocalVariable(name: "a3", scope: !1032, file: !15, line: 582, type: !10)
!1036 = !DILocalVariable(name: "result", scope: !1032, file: !15, line: 582, type: !10)
!1037 = !DILocalVariable(name: "copy", scope: !1032, file: !15, line: 582, type: !13)
!1038 = !DILocalVariable(name: "a0", scope: !1039, file: !15, line: 583, type: !10)
!1039 = distinct !DILexicalBlock(scope: !1005, file: !15, line: 583, column: 8)
!1040 = !DILocalVariable(name: "a1", scope: !1039, file: !15, line: 583, type: !10)
!1041 = !DILocalVariable(name: "a2", scope: !1039, file: !15, line: 583, type: !10)
!1042 = !DILocalVariable(name: "a3", scope: !1039, file: !15, line: 583, type: !10)
!1043 = !DILocalVariable(name: "result", scope: !1039, file: !15, line: 583, type: !10)
!1044 = !DILocalVariable(name: "copy", scope: !1039, file: !15, line: 583, type: !13)
!1045 = !DILocalVariable(name: "a0", scope: !1046, file: !15, line: 584, type: !10)
!1046 = distinct !DILexicalBlock(scope: !1005, file: !15, line: 584, column: 8)
!1047 = !DILocalVariable(name: "a1", scope: !1046, file: !15, line: 584, type: !10)
!1048 = !DILocalVariable(name: "a2", scope: !1046, file: !15, line: 584, type: !10)
!1049 = !DILocalVariable(name: "a3", scope: !1046, file: !15, line: 584, type: !10)
!1050 = !DILocalVariable(name: "result", scope: !1046, file: !15, line: 584, type: !10)
!1051 = !DILocalVariable(name: "copy", scope: !1046, file: !15, line: 584, type: !13)
!1052 = !DILocation(line: 0, scope: !111, inlinedAt: !1053)
!1053 = distinct !DILocation(line: 578, column: 87, scope: !1004)
!1054 = !DILocation(line: 0, scope: !111, inlinedAt: !1055)
!1055 = distinct !DILocation(line: 578, column: 132, scope: !1004)
!1056 = distinct !DIAssignID()
!1057 = !DILocation(line: 0, scope: !1004)
!1058 = !DILocation(line: 0, scope: !111, inlinedAt: !1059)
!1059 = distinct !DILocation(line: 579, column: 21, scope: !1011)
!1060 = !DILocation(line: 0, scope: !111, inlinedAt: !1061)
!1061 = distinct !DILocation(line: 579, column: 66, scope: !1011)
!1062 = !DILocation(line: 0, scope: !111, inlinedAt: !1063)
!1063 = distinct !DILocation(line: 579, column: 111, scope: !1011)
!1064 = !DILocation(line: 0, scope: !111, inlinedAt: !1065)
!1065 = distinct !DILocation(line: 579, column: 156, scope: !1011)
!1066 = !DILocation(line: 0, scope: !111, inlinedAt: !1067)
!1067 = distinct !DILocation(line: 580, column: 21, scope: !1018)
!1068 = !DILocation(line: 0, scope: !111, inlinedAt: !1069)
!1069 = distinct !DILocation(line: 580, column: 66, scope: !1018)
!1070 = !DILocation(line: 0, scope: !111, inlinedAt: !1071)
!1071 = distinct !DILocation(line: 580, column: 111, scope: !1018)
!1072 = !DILocation(line: 0, scope: !111, inlinedAt: !1073)
!1073 = distinct !DILocation(line: 580, column: 156, scope: !1018)
!1074 = !DILocation(line: 0, scope: !111, inlinedAt: !1075)
!1075 = distinct !DILocation(line: 581, column: 21, scope: !1025)
!1076 = !DILocation(line: 0, scope: !111, inlinedAt: !1077)
!1077 = distinct !DILocation(line: 581, column: 66, scope: !1025)
!1078 = !DILocation(line: 0, scope: !111, inlinedAt: !1079)
!1079 = distinct !DILocation(line: 581, column: 111, scope: !1025)
!1080 = !DILocation(line: 0, scope: !111, inlinedAt: !1081)
!1081 = distinct !DILocation(line: 581, column: 156, scope: !1025)
!1082 = !DILocation(line: 0, scope: !111, inlinedAt: !1083)
!1083 = distinct !DILocation(line: 582, column: 21, scope: !1032)
!1084 = !DILocation(line: 0, scope: !111, inlinedAt: !1085)
!1085 = distinct !DILocation(line: 582, column: 66, scope: !1032)
!1086 = !DILocation(line: 0, scope: !111, inlinedAt: !1087)
!1087 = distinct !DILocation(line: 582, column: 111, scope: !1032)
!1088 = !DILocation(line: 0, scope: !111, inlinedAt: !1089)
!1089 = distinct !DILocation(line: 582, column: 156, scope: !1032)
!1090 = !DILocation(line: 0, scope: !111, inlinedAt: !1091)
!1091 = distinct !DILocation(line: 583, column: 21, scope: !1039)
!1092 = !DILocation(line: 0, scope: !111, inlinedAt: !1093)
!1093 = distinct !DILocation(line: 583, column: 66, scope: !1039)
!1094 = !DILocation(line: 0, scope: !111, inlinedAt: !1095)
!1095 = distinct !DILocation(line: 583, column: 156, scope: !1039)
!1096 = !DILocation(line: 0, scope: !111, inlinedAt: !1097)
!1097 = distinct !DILocation(line: 584, column: 21, scope: !1046)
!1098 = !DILocation(line: 0, scope: !111, inlinedAt: !1099)
!1099 = distinct !DILocation(line: 584, column: 66, scope: !1046)
!1100 = !DILocation(line: 0, scope: !111, inlinedAt: !1101)
!1101 = distinct !DILocation(line: 584, column: 156, scope: !1046)
!1102 = !DILocation(line: 0, scope: !992)
!1103 = !DILocation(line: 577, column: 142, scope: !992)
!1104 = !DILocation(line: 578, column: 34, scope: !1004)
!1105 = !DILocation(line: 578, column: 67, scope: !1004)
!1106 = !DILocation(line: 578, column: 100, scope: !1004)
!1107 = !DILocation(line: 0, scope: !123, inlinedAt: !1053)
!1108 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1053)
!1109 = !DILocation(line: 578, column: 145, scope: !1004)
!1110 = !DILocation(line: 0, scope: !123, inlinedAt: !1055)
!1111 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1055)
!1112 = !DILocation(line: 578, column: 165, scope: !1004)
!1113 = !DILocation(line: 578, column: 247, scope: !1004)
!1114 = !DILocation(line: 578, column: 251, scope: !1004)
!1115 = !DILocation(line: 578, column: 277, scope: !1004)
!1116 = !DILocation(line: 578, column: 281, scope: !1004)
!1117 = !DILocation(line: 578, column: 296, scope: !1004)
!1118 = !DILocation(line: 578, column: 185, scope: !1004)
!1119 = !DILocation(line: 578, column: 315, scope: !1004)
!1120 = !DILocation(line: 578, column: 307, scope: !1004)
!1121 = !DILocation(line: 578, column: 334, scope: !1004)
!1122 = !DILocation(line: 578, column: 326, scope: !1004)
!1123 = !DILocation(line: 578, column: 346, scope: !1005)
!1124 = !DILocation(line: 0, scope: !1011)
!1125 = !DILocation(line: 0, scope: !123, inlinedAt: !1059)
!1126 = !DILocation(line: 0, scope: !123, inlinedAt: !1061)
!1127 = !DILocation(line: 579, column: 124, scope: !1011)
!1128 = !DILocation(line: 0, scope: !123, inlinedAt: !1063)
!1129 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1063)
!1130 = !DILocation(line: 579, column: 169, scope: !1011)
!1131 = !DILocation(line: 0, scope: !123, inlinedAt: !1065)
!1132 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1065)
!1133 = !DILocation(line: 579, column: 232, scope: !1011)
!1134 = !DILocation(line: 254, column: 7, scope: !514, inlinedAt: !1135)
!1135 = distinct !DILocation(line: 579, column: 205, scope: !1011)
!1136 = !DILocation(line: 0, scope: !492, inlinedAt: !1135)
!1137 = !DILocation(line: 579, column: 79, scope: !1011)
!1138 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1061)
!1139 = !DILocation(line: 579, column: 34, scope: !1011)
!1140 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1059)
!1141 = !DILocation(line: 579, column: 223, scope: !1011)
!1142 = !DILocation(line: 256, column: 16, scope: !516, inlinedAt: !1135)
!1143 = !DILocation(line: 266, column: 17, scope: !518, inlinedAt: !1135)
!1144 = !DILocation(line: 267, column: 18, scope: !492, inlinedAt: !1135)
!1145 = !DILocation(line: 269, column: 13, scope: !492, inlinedAt: !1135)
!1146 = !DILocation(line: 0, scope: !51, inlinedAt: !1147)
!1147 = distinct !DILocation(line: 579, column: 251, scope: !1011)
!1148 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1147)
!1149 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1150)
!1150 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1147)
!1151 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1150)
!1152 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1147)
!1153 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1147)
!1154 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1147)
!1155 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1147)
!1156 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1147)
!1157 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1147)
!1158 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1147)
!1159 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1147)
!1160 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1147)
!1161 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1147)
!1162 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1147)
!1163 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1147)
!1164 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1147)
!1165 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1147)
!1166 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1167)
!1167 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1147)
!1168 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1167)
!1169 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !1147)
!1170 = !DILocation(line: 579, column: 284, scope: !1011)
!1171 = !DILocation(line: 579, column: 299, scope: !1011)
!1172 = !DILocation(line: 579, column: 311, scope: !1011)
!1173 = !DILocation(line: 0, scope: !1018)
!1174 = !DILocation(line: 0, scope: !123, inlinedAt: !1067)
!1175 = !DILocation(line: 0, scope: !123, inlinedAt: !1069)
!1176 = !DILocation(line: 580, column: 124, scope: !1018)
!1177 = !DILocation(line: 0, scope: !123, inlinedAt: !1071)
!1178 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1071)
!1179 = !DILocation(line: 580, column: 169, scope: !1018)
!1180 = !DILocation(line: 0, scope: !123, inlinedAt: !1073)
!1181 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1073)
!1182 = !DILocation(line: 580, column: 234, scope: !1018)
!1183 = !DILocation(line: 281, column: 7, scope: !539, inlinedAt: !1184)
!1184 = distinct !DILocation(line: 580, column: 205, scope: !1018)
!1185 = !DILocation(line: 0, scope: !523, inlinedAt: !1184)
!1186 = !DILocation(line: 580, column: 79, scope: !1018)
!1187 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1069)
!1188 = !DILocation(line: 580, column: 34, scope: !1018)
!1189 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1067)
!1190 = !DILocation(line: 580, column: 225, scope: !1018)
!1191 = !DILocation(line: 283, column: 16, scope: !541, inlinedAt: !1184)
!1192 = !DILocation(line: 293, column: 16, scope: !543, inlinedAt: !1184)
!1193 = !DILocation(line: 294, column: 17, scope: !523, inlinedAt: !1184)
!1194 = !DILocation(line: 296, column: 12, scope: !523, inlinedAt: !1184)
!1195 = !DILocation(line: 0, scope: !51, inlinedAt: !1196)
!1196 = distinct !DILocation(line: 580, column: 253, scope: !1018)
!1197 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1196)
!1198 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1199)
!1199 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1196)
!1200 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1199)
!1201 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1196)
!1202 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1196)
!1203 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1196)
!1204 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1196)
!1205 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1196)
!1206 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1196)
!1207 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1196)
!1208 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1196)
!1209 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1196)
!1210 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1196)
!1211 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1196)
!1212 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1196)
!1213 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1196)
!1214 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1196)
!1215 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1216)
!1216 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1196)
!1217 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1216)
!1218 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !1196)
!1219 = !DILocation(line: 580, column: 286, scope: !1018)
!1220 = !DILocation(line: 580, column: 301, scope: !1018)
!1221 = !DILocation(line: 580, column: 313, scope: !1018)
!1222 = !DILocation(line: 581, column: 34, scope: !1025)
!1223 = !DILocation(line: 0, scope: !123, inlinedAt: !1075)
!1224 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1075)
!1225 = !DILocation(line: 0, scope: !1025)
!1226 = !DILocation(line: 581, column: 79, scope: !1025)
!1227 = !DILocation(line: 0, scope: !123, inlinedAt: !1077)
!1228 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1077)
!1229 = !DILocation(line: 581, column: 124, scope: !1025)
!1230 = !DILocation(line: 0, scope: !123, inlinedAt: !1079)
!1231 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1079)
!1232 = !DILocation(line: 581, column: 169, scope: !1025)
!1233 = !DILocation(line: 0, scope: !123, inlinedAt: !1081)
!1234 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1081)
!1235 = !DILocation(line: 581, column: 227, scope: !1025)
!1236 = !DILocation(line: 581, column: 230, scope: !1025)
!1237 = !DILocation(line: 581, column: 233, scope: !1025)
!1238 = !DILocation(line: 315, column: 9, scope: !562, inlinedAt: !1239)
!1239 = distinct !DILocation(line: 581, column: 205, scope: !1025)
!1240 = !DILocation(line: 0, scope: !548, inlinedAt: !1239)
!1241 = !DILocation(line: 315, column: 5, scope: !562, inlinedAt: !1239)
!1242 = !DILocation(line: 0, scope: !51, inlinedAt: !1243)
!1243 = distinct !DILocation(line: 581, column: 252, scope: !1025)
!1244 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1243)
!1245 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1246)
!1246 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1243)
!1247 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1246)
!1248 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1243)
!1249 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1243)
!1250 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1243)
!1251 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1243)
!1252 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1243)
!1253 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1243)
!1254 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1243)
!1255 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1243)
!1256 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1243)
!1257 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1243)
!1258 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1243)
!1259 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1243)
!1260 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1243)
!1261 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1243)
!1262 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1263)
!1263 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1243)
!1264 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1263)
!1265 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !1243)
!1266 = !DILocation(line: 581, column: 285, scope: !1025)
!1267 = !DILocation(line: 581, column: 300, scope: !1025)
!1268 = !DILocation(line: 581, column: 312, scope: !1025)
!1269 = !DILocation(line: 582, column: 34, scope: !1032)
!1270 = !DILocation(line: 0, scope: !123, inlinedAt: !1083)
!1271 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1083)
!1272 = !DILocation(line: 0, scope: !1032)
!1273 = !DILocation(line: 582, column: 79, scope: !1032)
!1274 = !DILocation(line: 0, scope: !123, inlinedAt: !1085)
!1275 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1085)
!1276 = !DILocation(line: 582, column: 124, scope: !1032)
!1277 = !DILocation(line: 0, scope: !123, inlinedAt: !1087)
!1278 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1087)
!1279 = !DILocation(line: 582, column: 169, scope: !1032)
!1280 = !DILocation(line: 0, scope: !123, inlinedAt: !1089)
!1281 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1089)
!1282 = !DILocation(line: 582, column: 229, scope: !1032)
!1283 = !DILocation(line: 582, column: 232, scope: !1032)
!1284 = !DILocation(line: 582, column: 235, scope: !1032)
!1285 = !DILocation(line: 334, column: 9, scope: !579, inlinedAt: !1286)
!1286 = distinct !DILocation(line: 582, column: 205, scope: !1032)
!1287 = !DILocation(line: 0, scope: !569, inlinedAt: !1286)
!1288 = !DILocation(line: 334, column: 5, scope: !579, inlinedAt: !1286)
!1289 = !DILocation(line: 0, scope: !51, inlinedAt: !1290)
!1290 = distinct !DILocation(line: 582, column: 254, scope: !1032)
!1291 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1290)
!1292 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1293)
!1293 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1290)
!1294 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1293)
!1295 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1290)
!1296 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1290)
!1297 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1290)
!1298 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1290)
!1299 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1290)
!1300 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1290)
!1301 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1290)
!1302 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1290)
!1303 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1290)
!1304 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1290)
!1305 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1290)
!1306 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1290)
!1307 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1290)
!1308 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1290)
!1309 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1310)
!1310 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1290)
!1311 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1310)
!1312 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !1290)
!1313 = !DILocation(line: 582, column: 287, scope: !1032)
!1314 = !DILocation(line: 582, column: 302, scope: !1032)
!1315 = !DILocation(line: 582, column: 314, scope: !1032)
!1316 = !DILocation(line: 583, column: 34, scope: !1039)
!1317 = !DILocation(line: 0, scope: !123, inlinedAt: !1091)
!1318 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1091)
!1319 = !DILocation(line: 0, scope: !1039)
!1320 = !DILocation(line: 583, column: 79, scope: !1039)
!1321 = !DILocation(line: 0, scope: !123, inlinedAt: !1093)
!1322 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1093)
!1323 = !DILocation(line: 0, scope: !123, inlinedAt: !1324)
!1324 = distinct !DILocation(line: 583, column: 111, scope: !1039)
!1325 = !DILocation(line: 583, column: 169, scope: !1039)
!1326 = !DILocation(line: 0, scope: !123, inlinedAt: !1095)
!1327 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1095)
!1328 = !DILocation(line: 583, column: 226, scope: !1039)
!1329 = !DILocation(line: 583, column: 232, scope: !1039)
!1330 = !DILocation(line: 362, column: 9, scope: !600, inlinedAt: !1331)
!1331 = distinct !DILocation(line: 583, column: 205, scope: !1039)
!1332 = !DILocation(line: 0, scope: !586, inlinedAt: !1331)
!1333 = !DILocation(line: 0, scope: !600, inlinedAt: !1331)
!1334 = !DILocation(line: 362, column: 5, scope: !600, inlinedAt: !1331)
!1335 = !DILocation(line: 0, scope: !599, inlinedAt: !1331)
!1336 = !DILocation(line: 368, column: 7, scope: !615, inlinedAt: !1331)
!1337 = !DILocation(line: 370, column: 16, scope: !617, inlinedAt: !1331)
!1338 = !DILocation(line: 0, scope: !615, inlinedAt: !1331)
!1339 = !DILocation(line: 373, column: 8, scope: !599, inlinedAt: !1331)
!1340 = !DILocation(line: 374, column: 1, scope: !599, inlinedAt: !1331)
!1341 = !DILocation(line: 0, scope: !605, inlinedAt: !1331)
!1342 = !DILocation(line: 380, column: 8, scope: !623, inlinedAt: !1331)
!1343 = !DILocation(line: 382, column: 18, scope: !625, inlinedAt: !1331)
!1344 = !DILocation(line: 0, scope: !623, inlinedAt: !1331)
!1345 = !DILocation(line: 385, column: 9, scope: !605, inlinedAt: !1331)
!1346 = !DILocation(line: 0, scope: !51, inlinedAt: !1347)
!1347 = distinct !DILocation(line: 583, column: 251, scope: !1039)
!1348 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1347)
!1349 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1350)
!1350 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1347)
!1351 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1350)
!1352 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1347)
!1353 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1347)
!1354 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1347)
!1355 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1347)
!1356 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1347)
!1357 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1347)
!1358 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1347)
!1359 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1347)
!1360 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1347)
!1361 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1347)
!1362 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1347)
!1363 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1347)
!1364 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1347)
!1365 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1347)
!1366 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1367)
!1367 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1347)
!1368 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1367)
!1369 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !1347)
!1370 = !DILocation(line: 583, column: 284, scope: !1039)
!1371 = !DILocation(line: 583, column: 299, scope: !1039)
!1372 = !DILocation(line: 583, column: 311, scope: !1039)
!1373 = !DILocation(line: 584, column: 34, scope: !1046)
!1374 = !DILocation(line: 0, scope: !123, inlinedAt: !1097)
!1375 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1097)
!1376 = !DILocation(line: 0, scope: !1046)
!1377 = !DILocation(line: 584, column: 79, scope: !1046)
!1378 = !DILocation(line: 0, scope: !123, inlinedAt: !1099)
!1379 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1099)
!1380 = !DILocation(line: 0, scope: !123, inlinedAt: !1381)
!1381 = distinct !DILocation(line: 584, column: 111, scope: !1046)
!1382 = !DILocation(line: 584, column: 169, scope: !1046)
!1383 = !DILocation(line: 0, scope: !123, inlinedAt: !1101)
!1384 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1101)
!1385 = !DILocation(line: 584, column: 228, scope: !1046)
!1386 = !DILocation(line: 584, column: 234, scope: !1046)
!1387 = !DILocation(line: 397, column: 9, scope: !639, inlinedAt: !1388)
!1388 = distinct !DILocation(line: 584, column: 205, scope: !1046)
!1389 = !DILocation(line: 0, scope: !629, inlinedAt: !1388)
!1390 = !DILocation(line: 0, scope: !639, inlinedAt: !1388)
!1391 = !DILocation(line: 397, column: 5, scope: !639, inlinedAt: !1388)
!1392 = !DILocation(line: 0, scope: !638, inlinedAt: !1388)
!1393 = !DILocation(line: 403, column: 7, scope: !654, inlinedAt: !1388)
!1394 = !DILocation(line: 405, column: 16, scope: !656, inlinedAt: !1388)
!1395 = !DILocation(line: 0, scope: !654, inlinedAt: !1388)
!1396 = !DILocation(line: 408, column: 8, scope: !638, inlinedAt: !1388)
!1397 = !DILocation(line: 409, column: 1, scope: !638, inlinedAt: !1388)
!1398 = !DILocation(line: 0, scope: !644, inlinedAt: !1388)
!1399 = !DILocation(line: 415, column: 7, scope: !662, inlinedAt: !1388)
!1400 = !DILocation(line: 417, column: 16, scope: !664, inlinedAt: !1388)
!1401 = !DILocation(line: 0, scope: !662, inlinedAt: !1388)
!1402 = !DILocation(line: 420, column: 8, scope: !644, inlinedAt: !1388)
!1403 = !DILocation(line: 0, scope: !51, inlinedAt: !1404)
!1404 = distinct !DILocation(line: 584, column: 253, scope: !1046)
!1405 = !DILocation(line: 18, column: 33, scope: !63, inlinedAt: !1404)
!1406 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1407)
!1407 = distinct !DILocation(line: 18, column: 54, scope: !63, inlinedAt: !1404)
!1408 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1407)
!1409 = !DILocation(line: 19, column: 6, scope: !72, inlinedAt: !1404)
!1410 = !DILocation(line: 19, column: 55, scope: !51, inlinedAt: !1404)
!1411 = !DILocation(line: 19, column: 5, scope: !72, inlinedAt: !1404)
!1412 = !DILocation(line: 19, column: 58, scope: !51, inlinedAt: !1404)
!1413 = !DILocation(line: 20, column: 85, scope: !51, inlinedAt: !1404)
!1414 = !DILocation(line: 20, column: 79, scope: !51, inlinedAt: !1404)
!1415 = !DILocation(line: 21, column: 23, scope: !51, inlinedAt: !1404)
!1416 = !DILocation(line: 21, column: 30, scope: !51, inlinedAt: !1404)
!1417 = !DILocation(line: 21, column: 41, scope: !51, inlinedAt: !1404)
!1418 = !DILocation(line: 22, column: 10, scope: !90, inlinedAt: !1404)
!1419 = !DILocation(line: 22, column: 14, scope: !90, inlinedAt: !1404)
!1420 = !DILocation(line: 22, column: 50, scope: !90, inlinedAt: !1404)
!1421 = !DILocation(line: 22, column: 16, scope: !90, inlinedAt: !1404)
!1422 = !DILocation(line: 22, column: 55, scope: !90, inlinedAt: !1404)
!1423 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1424)
!1424 = distinct !DILocation(line: 22, column: 68, scope: !90, inlinedAt: !1404)
!1425 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1424)
!1426 = !DILocation(line: 22, column: 85, scope: !51, inlinedAt: !1404)
!1427 = !DILocation(line: 584, column: 286, scope: !1046)
!1428 = !DILocation(line: 584, column: 301, scope: !1046)
!1429 = !DILocation(line: 584, column: 313, scope: !1046)
!1430 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1431)
!1431 = distinct !DILocation(line: 585, column: 9, scope: !1005)
!1432 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1431)
!1433 = !DILocation(line: 585, column: 21, scope: !992)
!1434 = distinct !DISubprogram(name: "ink_compute_scalar32", scope: !15, file: !15, line: 586, type: !1435, scopeLine: 586, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !1437)
!1435 = !DISubroutineType(types: !1436)
!1436 = !{!10, !10, !951, !953}
!1437 = !{!1438, !1439, !1440, !1441, !1444, !1445, !1446, !1447, !1448, !1450, !1451, !1452, !1453, !1454, !1456, !1457, !1458, !1459, !1460, !1462, !1463, !1464, !1465, !1466, !1468, !1469, !1470, !1471, !1472, !1474, !1475, !1476, !1477}
!1438 = !DILocalVariable(name: "function", arg: 1, scope: !1434, file: !15, line: 586, type: !10)
!1439 = !DILocalVariable(name: "data", arg: 2, scope: !1434, file: !15, line: 586, type: !951)
!1440 = !DILocalVariable(name: "lengths", arg: 3, scope: !1434, file: !15, line: 586, type: !953)
!1441 = !DILocalVariable(name: "a0", scope: !1442, file: !15, line: 587, type: !10)
!1442 = distinct !DILexicalBlock(scope: !1443, file: !15, line: 587, column: 8)
!1443 = distinct !DILexicalBlock(scope: !1434, file: !15, line: 586, column: 138)
!1444 = !DILocalVariable(name: "a1", scope: !1442, file: !15, line: 587, type: !10)
!1445 = !DILocalVariable(name: "a2", scope: !1442, file: !15, line: 587, type: !10)
!1446 = !DILocalVariable(name: "a3", scope: !1442, file: !15, line: 587, type: !10)
!1447 = !DILocalVariable(name: "result", scope: !1442, file: !15, line: 587, type: !10)
!1448 = !DILocalVariable(name: "a0", scope: !1449, file: !15, line: 588, type: !10)
!1449 = distinct !DILexicalBlock(scope: !1443, file: !15, line: 588, column: 8)
!1450 = !DILocalVariable(name: "a1", scope: !1449, file: !15, line: 588, type: !10)
!1451 = !DILocalVariable(name: "a2", scope: !1449, file: !15, line: 588, type: !10)
!1452 = !DILocalVariable(name: "a3", scope: !1449, file: !15, line: 588, type: !10)
!1453 = !DILocalVariable(name: "result", scope: !1449, file: !15, line: 588, type: !10)
!1454 = !DILocalVariable(name: "a0", scope: !1455, file: !15, line: 589, type: !10)
!1455 = distinct !DILexicalBlock(scope: !1443, file: !15, line: 589, column: 8)
!1456 = !DILocalVariable(name: "a1", scope: !1455, file: !15, line: 589, type: !10)
!1457 = !DILocalVariable(name: "a2", scope: !1455, file: !15, line: 589, type: !10)
!1458 = !DILocalVariable(name: "a3", scope: !1455, file: !15, line: 589, type: !10)
!1459 = !DILocalVariable(name: "result", scope: !1455, file: !15, line: 589, type: !10)
!1460 = !DILocalVariable(name: "a0", scope: !1461, file: !15, line: 590, type: !10)
!1461 = distinct !DILexicalBlock(scope: !1443, file: !15, line: 590, column: 8)
!1462 = !DILocalVariable(name: "a1", scope: !1461, file: !15, line: 590, type: !10)
!1463 = !DILocalVariable(name: "a2", scope: !1461, file: !15, line: 590, type: !10)
!1464 = !DILocalVariable(name: "a3", scope: !1461, file: !15, line: 590, type: !10)
!1465 = !DILocalVariable(name: "result", scope: !1461, file: !15, line: 590, type: !10)
!1466 = !DILocalVariable(name: "a0", scope: !1467, file: !15, line: 591, type: !10)
!1467 = distinct !DILexicalBlock(scope: !1443, file: !15, line: 591, column: 8)
!1468 = !DILocalVariable(name: "a1", scope: !1467, file: !15, line: 591, type: !10)
!1469 = !DILocalVariable(name: "a2", scope: !1467, file: !15, line: 591, type: !10)
!1470 = !DILocalVariable(name: "a3", scope: !1467, file: !15, line: 591, type: !10)
!1471 = !DILocalVariable(name: "result", scope: !1467, file: !15, line: 591, type: !10)
!1472 = !DILocalVariable(name: "a0", scope: !1473, file: !15, line: 592, type: !10)
!1473 = distinct !DILexicalBlock(scope: !1443, file: !15, line: 592, column: 8)
!1474 = !DILocalVariable(name: "a1", scope: !1473, file: !15, line: 592, type: !10)
!1475 = !DILocalVariable(name: "a2", scope: !1473, file: !15, line: 592, type: !10)
!1476 = !DILocalVariable(name: "a3", scope: !1473, file: !15, line: 592, type: !10)
!1477 = !DILocalVariable(name: "result", scope: !1473, file: !15, line: 592, type: !10)
!1478 = !DILocation(line: 0, scope: !111, inlinedAt: !1479)
!1479 = distinct !DILocation(line: 587, column: 21, scope: !1442)
!1480 = !DILocation(line: 0, scope: !111, inlinedAt: !1481)
!1481 = distinct !DILocation(line: 587, column: 66, scope: !1442)
!1482 = !DILocation(line: 0, scope: !111, inlinedAt: !1483)
!1483 = distinct !DILocation(line: 587, column: 111, scope: !1442)
!1484 = !DILocation(line: 0, scope: !111, inlinedAt: !1485)
!1485 = distinct !DILocation(line: 587, column: 156, scope: !1442)
!1486 = !DILocation(line: 0, scope: !111, inlinedAt: !1487)
!1487 = distinct !DILocation(line: 588, column: 21, scope: !1449)
!1488 = !DILocation(line: 0, scope: !111, inlinedAt: !1489)
!1489 = distinct !DILocation(line: 588, column: 66, scope: !1449)
!1490 = !DILocation(line: 0, scope: !111, inlinedAt: !1491)
!1491 = distinct !DILocation(line: 588, column: 111, scope: !1449)
!1492 = !DILocation(line: 0, scope: !111, inlinedAt: !1493)
!1493 = distinct !DILocation(line: 588, column: 156, scope: !1449)
!1494 = !DILocation(line: 0, scope: !111, inlinedAt: !1495)
!1495 = distinct !DILocation(line: 589, column: 21, scope: !1455)
!1496 = !DILocation(line: 0, scope: !111, inlinedAt: !1497)
!1497 = distinct !DILocation(line: 589, column: 66, scope: !1455)
!1498 = !DILocation(line: 0, scope: !111, inlinedAt: !1499)
!1499 = distinct !DILocation(line: 589, column: 111, scope: !1455)
!1500 = !DILocation(line: 0, scope: !111, inlinedAt: !1501)
!1501 = distinct !DILocation(line: 589, column: 156, scope: !1455)
!1502 = !DILocation(line: 0, scope: !111, inlinedAt: !1503)
!1503 = distinct !DILocation(line: 590, column: 21, scope: !1461)
!1504 = !DILocation(line: 0, scope: !111, inlinedAt: !1505)
!1505 = distinct !DILocation(line: 590, column: 66, scope: !1461)
!1506 = !DILocation(line: 0, scope: !111, inlinedAt: !1507)
!1507 = distinct !DILocation(line: 590, column: 111, scope: !1461)
!1508 = !DILocation(line: 0, scope: !111, inlinedAt: !1509)
!1509 = distinct !DILocation(line: 590, column: 156, scope: !1461)
!1510 = !DILocation(line: 0, scope: !111, inlinedAt: !1511)
!1511 = distinct !DILocation(line: 591, column: 21, scope: !1467)
!1512 = !DILocation(line: 0, scope: !111, inlinedAt: !1513)
!1513 = distinct !DILocation(line: 591, column: 66, scope: !1467)
!1514 = !DILocation(line: 0, scope: !111, inlinedAt: !1515)
!1515 = distinct !DILocation(line: 591, column: 156, scope: !1467)
!1516 = !DILocation(line: 0, scope: !111, inlinedAt: !1517)
!1517 = distinct !DILocation(line: 592, column: 21, scope: !1473)
!1518 = !DILocation(line: 0, scope: !111, inlinedAt: !1519)
!1519 = distinct !DILocation(line: 592, column: 66, scope: !1473)
!1520 = !DILocation(line: 0, scope: !111, inlinedAt: !1521)
!1521 = distinct !DILocation(line: 592, column: 156, scope: !1473)
!1522 = !DILocation(line: 0, scope: !1434)
!1523 = !DILocation(line: 586, column: 122, scope: !1434)
!1524 = !DILocation(line: 0, scope: !1442)
!1525 = !DILocation(line: 0, scope: !123, inlinedAt: !1479)
!1526 = !DILocation(line: 0, scope: !123, inlinedAt: !1481)
!1527 = !DILocation(line: 587, column: 124, scope: !1442)
!1528 = !DILocation(line: 0, scope: !123, inlinedAt: !1483)
!1529 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1483)
!1530 = !DILocation(line: 587, column: 169, scope: !1442)
!1531 = !DILocation(line: 0, scope: !123, inlinedAt: !1485)
!1532 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1485)
!1533 = !DILocation(line: 587, column: 232, scope: !1442)
!1534 = !DILocation(line: 254, column: 7, scope: !514, inlinedAt: !1535)
!1535 = distinct !DILocation(line: 587, column: 205, scope: !1442)
!1536 = !DILocation(line: 0, scope: !492, inlinedAt: !1535)
!1537 = !DILocation(line: 587, column: 79, scope: !1442)
!1538 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1481)
!1539 = !DILocation(line: 587, column: 34, scope: !1442)
!1540 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1479)
!1541 = !DILocation(line: 587, column: 223, scope: !1442)
!1542 = !DILocation(line: 256, column: 16, scope: !516, inlinedAt: !1535)
!1543 = !DILocation(line: 266, column: 17, scope: !518, inlinedAt: !1535)
!1544 = !DILocation(line: 267, column: 18, scope: !492, inlinedAt: !1535)
!1545 = !DILocation(line: 269, column: 13, scope: !492, inlinedAt: !1535)
!1546 = !DILocation(line: 0, scope: !1449)
!1547 = !DILocation(line: 0, scope: !123, inlinedAt: !1487)
!1548 = !DILocation(line: 0, scope: !123, inlinedAt: !1489)
!1549 = !DILocation(line: 588, column: 124, scope: !1449)
!1550 = !DILocation(line: 0, scope: !123, inlinedAt: !1491)
!1551 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1491)
!1552 = !DILocation(line: 588, column: 169, scope: !1449)
!1553 = !DILocation(line: 0, scope: !123, inlinedAt: !1493)
!1554 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1493)
!1555 = !DILocation(line: 588, column: 234, scope: !1449)
!1556 = !DILocation(line: 281, column: 7, scope: !539, inlinedAt: !1557)
!1557 = distinct !DILocation(line: 588, column: 205, scope: !1449)
!1558 = !DILocation(line: 0, scope: !523, inlinedAt: !1557)
!1559 = !DILocation(line: 588, column: 79, scope: !1449)
!1560 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1489)
!1561 = !DILocation(line: 588, column: 34, scope: !1449)
!1562 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1487)
!1563 = !DILocation(line: 588, column: 225, scope: !1449)
!1564 = !DILocation(line: 283, column: 16, scope: !541, inlinedAt: !1557)
!1565 = !DILocation(line: 293, column: 16, scope: !543, inlinedAt: !1557)
!1566 = !DILocation(line: 294, column: 17, scope: !523, inlinedAt: !1557)
!1567 = !DILocation(line: 296, column: 12, scope: !523, inlinedAt: !1557)
!1568 = !DILocation(line: 589, column: 34, scope: !1455)
!1569 = !DILocation(line: 0, scope: !123, inlinedAt: !1495)
!1570 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1495)
!1571 = !DILocation(line: 0, scope: !1455)
!1572 = !DILocation(line: 589, column: 79, scope: !1455)
!1573 = !DILocation(line: 0, scope: !123, inlinedAt: !1497)
!1574 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1497)
!1575 = !DILocation(line: 589, column: 124, scope: !1455)
!1576 = !DILocation(line: 0, scope: !123, inlinedAt: !1499)
!1577 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1499)
!1578 = !DILocation(line: 589, column: 169, scope: !1455)
!1579 = !DILocation(line: 0, scope: !123, inlinedAt: !1501)
!1580 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1501)
!1581 = !DILocation(line: 589, column: 227, scope: !1455)
!1582 = !DILocation(line: 589, column: 230, scope: !1455)
!1583 = !DILocation(line: 589, column: 233, scope: !1455)
!1584 = !DILocation(line: 315, column: 9, scope: !562, inlinedAt: !1585)
!1585 = distinct !DILocation(line: 589, column: 205, scope: !1455)
!1586 = !DILocation(line: 0, scope: !548, inlinedAt: !1585)
!1587 = !DILocation(line: 315, column: 5, scope: !562, inlinedAt: !1585)
!1588 = !DILocation(line: 590, column: 34, scope: !1461)
!1589 = !DILocation(line: 0, scope: !123, inlinedAt: !1503)
!1590 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1503)
!1591 = !DILocation(line: 0, scope: !1461)
!1592 = !DILocation(line: 590, column: 79, scope: !1461)
!1593 = !DILocation(line: 0, scope: !123, inlinedAt: !1505)
!1594 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1505)
!1595 = !DILocation(line: 590, column: 124, scope: !1461)
!1596 = !DILocation(line: 0, scope: !123, inlinedAt: !1507)
!1597 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1507)
!1598 = !DILocation(line: 590, column: 169, scope: !1461)
!1599 = !DILocation(line: 0, scope: !123, inlinedAt: !1509)
!1600 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1509)
!1601 = !DILocation(line: 590, column: 229, scope: !1461)
!1602 = !DILocation(line: 590, column: 232, scope: !1461)
!1603 = !DILocation(line: 590, column: 235, scope: !1461)
!1604 = !DILocation(line: 334, column: 9, scope: !579, inlinedAt: !1605)
!1605 = distinct !DILocation(line: 590, column: 205, scope: !1461)
!1606 = !DILocation(line: 0, scope: !569, inlinedAt: !1605)
!1607 = !DILocation(line: 334, column: 5, scope: !579, inlinedAt: !1605)
!1608 = !DILocation(line: 591, column: 34, scope: !1467)
!1609 = !DILocation(line: 0, scope: !123, inlinedAt: !1511)
!1610 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1511)
!1611 = !DILocation(line: 0, scope: !1467)
!1612 = !DILocation(line: 591, column: 79, scope: !1467)
!1613 = !DILocation(line: 0, scope: !123, inlinedAt: !1513)
!1614 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1513)
!1615 = !DILocation(line: 0, scope: !123, inlinedAt: !1616)
!1616 = distinct !DILocation(line: 591, column: 111, scope: !1467)
!1617 = !DILocation(line: 591, column: 169, scope: !1467)
!1618 = !DILocation(line: 0, scope: !123, inlinedAt: !1515)
!1619 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1515)
!1620 = !DILocation(line: 591, column: 226, scope: !1467)
!1621 = !DILocation(line: 591, column: 232, scope: !1467)
!1622 = !DILocation(line: 362, column: 9, scope: !600, inlinedAt: !1623)
!1623 = distinct !DILocation(line: 591, column: 205, scope: !1467)
!1624 = !DILocation(line: 0, scope: !586, inlinedAt: !1623)
!1625 = !DILocation(line: 0, scope: !600, inlinedAt: !1623)
!1626 = !DILocation(line: 362, column: 5, scope: !600, inlinedAt: !1623)
!1627 = !DILocation(line: 0, scope: !599, inlinedAt: !1623)
!1628 = !DILocation(line: 368, column: 7, scope: !615, inlinedAt: !1623)
!1629 = !DILocation(line: 370, column: 16, scope: !617, inlinedAt: !1623)
!1630 = !DILocation(line: 0, scope: !615, inlinedAt: !1623)
!1631 = !DILocation(line: 373, column: 8, scope: !599, inlinedAt: !1623)
!1632 = !DILocation(line: 374, column: 1, scope: !599, inlinedAt: !1623)
!1633 = !DILocation(line: 0, scope: !605, inlinedAt: !1623)
!1634 = !DILocation(line: 380, column: 8, scope: !623, inlinedAt: !1623)
!1635 = !DILocation(line: 382, column: 18, scope: !625, inlinedAt: !1623)
!1636 = !DILocation(line: 0, scope: !623, inlinedAt: !1623)
!1637 = !DILocation(line: 385, column: 9, scope: !605, inlinedAt: !1623)
!1638 = !DILocation(line: 592, column: 34, scope: !1473)
!1639 = !DILocation(line: 0, scope: !123, inlinedAt: !1517)
!1640 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1517)
!1641 = !DILocation(line: 0, scope: !1473)
!1642 = !DILocation(line: 592, column: 79, scope: !1473)
!1643 = !DILocation(line: 0, scope: !123, inlinedAt: !1519)
!1644 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1519)
!1645 = !DILocation(line: 0, scope: !123, inlinedAt: !1646)
!1646 = distinct !DILocation(line: 592, column: 111, scope: !1473)
!1647 = !DILocation(line: 592, column: 169, scope: !1473)
!1648 = !DILocation(line: 0, scope: !123, inlinedAt: !1521)
!1649 = !DILocation(line: 37, column: 172, scope: !128, inlinedAt: !1521)
!1650 = !DILocation(line: 592, column: 228, scope: !1473)
!1651 = !DILocation(line: 592, column: 234, scope: !1473)
!1652 = !DILocation(line: 397, column: 9, scope: !639, inlinedAt: !1653)
!1653 = distinct !DILocation(line: 592, column: 205, scope: !1473)
!1654 = !DILocation(line: 0, scope: !629, inlinedAt: !1653)
!1655 = !DILocation(line: 0, scope: !639, inlinedAt: !1653)
!1656 = !DILocation(line: 397, column: 5, scope: !639, inlinedAt: !1653)
!1657 = !DILocation(line: 0, scope: !638, inlinedAt: !1653)
!1658 = !DILocation(line: 403, column: 7, scope: !654, inlinedAt: !1653)
!1659 = !DILocation(line: 405, column: 16, scope: !656, inlinedAt: !1653)
!1660 = !DILocation(line: 0, scope: !654, inlinedAt: !1653)
!1661 = !DILocation(line: 408, column: 8, scope: !638, inlinedAt: !1653)
!1662 = !DILocation(line: 409, column: 1, scope: !638, inlinedAt: !1653)
!1663 = !DILocation(line: 0, scope: !644, inlinedAt: !1653)
!1664 = !DILocation(line: 415, column: 7, scope: !662, inlinedAt: !1653)
!1665 = !DILocation(line: 417, column: 16, scope: !664, inlinedAt: !1653)
!1666 = !DILocation(line: 0, scope: !662, inlinedAt: !1653)
!1667 = !DILocation(line: 420, column: 8, scope: !644, inlinedAt: !1653)
!1668 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1669)
!1669 = distinct !DILocation(line: 593, column: 9, scope: !1443)
!1670 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1669)
!1671 = !DILocation(line: 593, column: 30, scope: !1434)
!1672 = distinct !DISubprogram(name: "ink_compute_scalar64", scope: !15, file: !15, line: 594, type: !1673, scopeLine: 594, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !2, retainedNodes: !1677)
!1673 = !DISubroutineType(types: !1674)
!1674 = !{!1675, !10, !951, !953}
!1675 = !DIDerivedType(tag: DW_TAG_typedef, name: "uint64_t", file: !11, line: 102, baseType: !1676)
!1676 = !DIBasicType(name: "unsigned long long", size: 64, encoding: DW_ATE_unsigned)
!1677 = !{!1678, !1679, !1680}
!1678 = !DILocalVariable(name: "function", arg: 1, scope: !1672, file: !15, line: 594, type: !10)
!1679 = !DILocalVariable(name: "data", arg: 2, scope: !1672, file: !15, line: 594, type: !951)
!1680 = !DILocalVariable(name: "lengths", arg: 3, scope: !1672, file: !15, line: 594, type: !953)
!1681 = !DILocation(line: 0, scope: !1672)
!1682 = !DILocation(line: 13, column: 28, scope: !68, inlinedAt: !1683)
!1683 = distinct !DILocation(line: 595, column: 9, scope: !1684)
!1684 = distinct !DILexicalBlock(scope: !1672, file: !15, line: 594, column: 138)
!1685 = !DILocation(line: 13, column: 45, scope: !68, inlinedAt: !1683)
