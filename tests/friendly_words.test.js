'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const bank=require('../server/languages.json');
const {choosePracticeWord,easyEnglishCore}=require('../typing-rules');
const english=bank.en.bank.split(' ');
test('English practice words are friendly, familiar and varied',()=>{
 assert.ok(english.length>=650);
 assert.ok(english.every(w=>/^[a-z]{2,9}$/.test(w)));
 assert.equal(new Set(english).size,english.length);
 for(const word of ['water','some','home','friend','school','happy','window','music']) {
   assert.ok(english.includes(word),word);
   assert.ok(easyEnglishCore.includes(word),`frequent group: ${word}`);
 }
});
test('common words are weighted more frequently; other languages are untouched',()=>{
 assert.ok(easyEnglishCore.every(w=>english.includes(w)));
 const samples=Array.from({length:1000},(_,i)=>choosePracticeWord(english,'en',(i+.5)/1000));
 const common=samples.filter(w=>easyEnglishCore.includes(w)).length;
 assert.ok(common>=680,`Expected at least 68% common English words, got ${common/10}%`);
 const de=bank.de.bank.split(' ');
 assert.equal(choosePracticeWord(de,'de',0),de[0]);
 assert.equal(choosePracticeWord(de,'de',0.999999),de.at(-1));
});
