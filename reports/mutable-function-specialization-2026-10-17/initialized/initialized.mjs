import * as source from "./initialized.mjs.source.mjs";
export * from "./initialized.mjs.source.mjs";
import {readArtifact} from "./initialized.mjs.initial-state.mjs";
let initial;
const bytes=()=>initial??=(readArtifact(new URL("./initialized.mjs.initial.snapshot",import.meta.url),{"bytes":3112,"file":"initialized.mjs.initial.snapshot","sha256":"66f6735756f6818504d8fbfec8b3d6bcb37a87458c1d39ec386a340b761139c1"}));
export async function restoreState(bytes){const state=source.createState();try{await state.restore(bytes);return state;}catch(error){state.dispose?.();throw error;}}
export async function createState(){return restoreState(await bytes());}
