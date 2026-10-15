import * as source from "./program.mjs.source.mjs";
export * from "./program.mjs.source.mjs";
import {readArtifact} from "./program.mjs.initial-state.mjs";
let initial;
const bytes=()=>initial??=(readArtifact(new URL("./program.mjs.initial.snapshot",import.meta.url),{"bytes":4078,"file":"program.mjs.initial.snapshot","sha256":"654352922a6a0dc7fe35a6eca7c6bd5e1574d45d4f3ac5769175f8808f1a92ef"}));
export async function restoreState(bytes){const state=source.createState();try{await state.restore(bytes);return state;}catch(error){state.dispose?.();throw error;}}
export async function createState(){return restoreState(await bytes());}
