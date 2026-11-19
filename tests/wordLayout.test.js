import test from 'node:test';import assert from 'node:assert/strict';import {wordRows} from '../src/wordLayout.js';
test('six kana stay on one row; seven split after about four',()=>{assert.deepEqual(wordRows([... 'あいうえおか']),[[0,1,2,3,4,5]]);assert.deepEqual(wordRows([...'あいうえおかき']),[[0,1,2,3],[4,5,6]]);});
test('longer words wrap in order and retain every mora exactly once',()=>{const tokens=[...'あいうえおかきくけこ'];assert.deepEqual(wordRows(tokens),[[0,1,2,3,4],[5,6,7,8,9]]);assert.deepEqual(wordRows(tokens).flat(),tokens.map((_,i)=>i));});
test('contracted kana are not split and count toward the visible six-kana limit',()=>{assert.deepEqual(wordRows(['か','り','きゅ','ら','む']),[[0,1,2,3,4]]);assert.deepEqual(wordRows(['きゃ','ぎゃ','ぴゃ','りゃ']),[[0,1],[2,3]]);});
test('long marks and small-tsu keep their original word positions',()=>{const tokens=['きゃ','っ','と','う','ー','あ'];assert.deepEqual(wordRows(tokens),[[0,1,2],[3,4,5]]);});
