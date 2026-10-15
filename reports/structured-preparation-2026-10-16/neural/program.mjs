import * as source from "./program.mjs.source.mjs";
export * from "./program.mjs.source.mjs";
import {readArtifact} from "./program.mjs.initial-state.mjs";
let initial;
const bytes=()=>initial??=(readArtifact(new URL("./program.mjs.initial.snapshot",import.meta.url),{"bytes":3633,"file":"program.mjs.initial.snapshot","sha256":"143a5a151d4281907f1e28f9e4677e79c7eb58f8435c68d3e5d808bdd788aa54"}));
export async function restoreState(bytes){const state=source.createState();try{await state.restore(bytes);return state;}catch(error){state.dispose?.();throw error;}}
export async function createState(){return restoreState(await bytes());}
