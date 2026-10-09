import {readFileSync, writeFileSync} from 'node:fs';
import {createPublicKey, verify, createHash} from 'node:crypto';

const here = new URL('./', import.meta.url);
const read = name => JSON.parse(readFileSync(new URL(name, here), 'utf8'));
const canonical = value => {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key =>
      JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
};
const envelope = read('module-receipt.json');
const signer = read('verification-keys.json').keys.find(key => key.id === envelope.key_id);
if (!signer || envelope.algorithm !== 'Ed25519') throw Error('Unknown receipt signer');
const key = createPublicKey({key: signer.jwk, format: 'jwk'});
if (!verify(null, Buffer.from(canonical(envelope.payload)), key,
  Buffer.from(envelope.signature, 'hex'))) throw Error('Invalid receipt signature');
const sourceHash = createHash('sha256').update(
  readFileSync(new URL('returned-source.lean', here))).digest('hex');
const payload = envelope.payload;
if (payload.target.id !== 151 || payload.target.kind !== 'module' ||
  payload.source.sha256 !== sourceHash || payload.primary.status !== 'passed' ||
  payload.secondary.status !== 'passed') throw Error('Receipt does not match accepted source');
const result = {signature_valid_against_site_published_key: true,
  module_id: 151, returned_source_sha256: sourceHash,
  primary: payload.primary.status, secondary: payload.secondary.status};
writeFileSync(new URL('receipt-check.json', here), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
