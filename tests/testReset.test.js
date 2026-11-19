
import test from 'node:test';import assert from 'node:assert/strict';import {applyTestReset,TEST_RESET_BEFORE} from '../src/data/testReset.js';
test('reset removes only test rows and pending uploads, preserves research, authoring and identity, and runs once',()=>{
 const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
 for(const key of ['kotoba-exploration-raw-v3','kotoba-mode1-responses-v1','kotoba-study-events-v1','kotoba-cloud-outbox-v1'])m.set(key,JSON.stringify([{id:'test',studyMode:'test'},{id:'test-event',study_mode:'test'},{id:'research',studyMode:'research'},{id:'unknown'}]));
 m.set('kotoba-author-drafts','keep');m.set('kotoba-consent-research-v1','keep');m.set('kotoba-participant-id-v1','keep');
 assert.equal(applyTestReset(storage).removed,8);assert.deepEqual(JSON.parse(m.get('kotoba-cloud-outbox-v1')).map(r=>r.id),['research','unknown']);assert.equal(m.get('kotoba-author-drafts'),'keep');assert.equal(m.get('kotoba-consent-research-v1'),'keep');
 m.set('kotoba-exploration-raw-v3',JSON.stringify([{studyMode:'test',id:'new-walkthrough'}]));assert.equal(applyTestReset(storage).alreadyApplied,true);assert.equal(JSON.parse(m.get('kotoba-exploration-raw-v3')).length,1);
});

test('a later-installed update preserves test answers made after the cleanup cutoff',()=>{const m=new Map([['kotoba-exploration-raw-v3',JSON.stringify([{id:'old',studyMode:'test',createdAt:'2020-01-01T00:00:00Z'},{id:'new',studyMode:'test',createdAt:new Date(Date.parse(TEST_RESET_BEFORE)+1000).toISOString()}])]]),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};assert.equal(applyTestReset(storage).removed,1);assert.equal(JSON.parse(m.get('kotoba-exploration-raw-v3'))[0].id,'new');});
