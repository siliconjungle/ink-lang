module order;
refined record Pair{first:u32,second:u32,} invariant value.first<10;
state N:u64=0; event Mark:u32;
spec change mark(n:u32)->u32 reads(N) writes(N) emits(Mark)
 requires n<10; ensures result<10; ensures result==n;
implementation record for mark {N=N+1;emit Mark(n);return n;}
change make()->Pair reads(N) writes(N) emits(Mark){return Pair{second:mark(2),first:mark(1)};}
