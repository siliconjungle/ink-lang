#!/usr/bin/env python3
"""Independent wrapping-word oracle, including empty/full-width inputs."""
import json,random,sys
from pathlib import Path
rng=random.Random(7182);mask=(1<<32)-1;cases=[]
for n in [0,1,2,3,31,32,255,256,257,1024,4096]:
    for scale in [0,1,3,mask]:
        for bias in [0,mask]:
            xs=[rng.getrandbits(32) for _ in range(n)]
            if n:xs[0]=mask
            total=0
            for x in xs:
                mapped=(x*scale+7)&mask
                if mapped>100:total=(total+mapped)&mask
            cases.append(dict(args=[xs,scale,bias],expected=(total+bias)&mask))
Path(sys.argv[1]).write_text(json.dumps(cases))
