import * as source from "./program.mjs.source.mjs";
export * from "./program.mjs.source.mjs";
import {readArtifact} from "./program.mjs.initial-state.mjs";
let initial;
const bytes=()=>initial??=(readArtifact(new URL("./program.mjs.initial.snapshot",import.meta.url),{"bytes":3633,"file":"program.mjs.initial.snapshot","sha256":"3cbffee12579b87e5a30a5c785ff6959c32e3c3364914ce4f79939a317664008"}));
export async function restoreState(bytes){const state=source.createState();try{await state.restore(bytes);return state;}catch(error){state.dispose?.();throw error;}}
export async function createState(){return restoreState(await bytes());}
