import assert from 'node:assert/strict';
import fs from 'node:fs';import {createState} from './initialized.mjs';
const state=await createState();
assert.deepEqual(Array.from(await state.checkpoint()),Array.from(fs.readFileSync(new URL('./initialized.mjs.initial.snapshot',import.meta.url))));
