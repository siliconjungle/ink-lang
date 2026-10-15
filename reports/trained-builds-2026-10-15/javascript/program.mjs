import * as source from "./program.mjs.source.mjs";
export * from "./program.mjs.source.mjs";
import {readArtifact} from "./program.mjs.initial-state.mjs";
let initial;
const bytes=()=>initial??=(readArtifact(new URL("./program.mjs.initial.snapshot",import.meta.url),{"bytes":552,"file":"program.mjs.initial.snapshot","sha256":"fd177d98dedb8b06fb13221f00a3960be21073b881e42d3b944c9ef1d6f198a1"}));
export async function restoreState(bytes){const state=source.createState();try{await state.restore(bytes);return state;}catch(error){state.dispose?.();throw error;}}
export async function createState(){return restoreState(await bytes());}
