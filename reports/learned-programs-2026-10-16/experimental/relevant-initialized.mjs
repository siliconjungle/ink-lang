export * from './relevant.mjs';
import {createState as empty} from './relevant.mjs';
import {readFile} from 'node:fs/promises';
export async function createState(){const state=empty();await state.restore(new Uint8Array(await readFile(new URL('./full-baseline/deployment.snapshot',import.meta.url))));return state;}
