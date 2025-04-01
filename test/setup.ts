// test/setup.ts
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

console.log('Preloading fake-indexeddb...');

// Assign to global scope for Dexie detection
// @ts-ignore
global.indexedDB = indexedDB;
// @ts-ignore
global.IDBKeyRange = IDBKeyRange;

console.log('fake-indexeddb preloaded.');