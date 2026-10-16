import * as source from "./initialized.mjs.source.mjs";
export * from "./initialized.mjs.source.mjs";
import {readArtifact} from "./initialized.mjs.initial-state.mjs";
let initial;
const bytes=()=>initial??=(readArtifact(new URL("./initialized.mjs.initial.snapshot",import.meta.url),{"bytes":3112,"file":"initialized.mjs.initial.snapshot","sha256":"fe3470fa051484b7a864cea607e04d9e93cc8d256e0bf7df11799ce795777bc1"}));
export async function restoreState(bytes){const state=source.createState();try{await state.restore(bytes);return state;}catch(error){state.dispose?.();throw error;}}
export async function createState(){return restoreState(await bytes());}
