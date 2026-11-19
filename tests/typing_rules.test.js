'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {deletionFloor,backspaceTarget,validDeletion,currentWordStart}=require('../typing-rules.js');
const text='apple banana kiwi';

test('correct partial words stay editable; only full correct words lock',()=>{
 assert.equal(deletionFloor('a',text),0);
 assert.equal(deletionFloor('appl',text),0);
 assert.equal(backspaceTarget('appl',text),3);
 assert.equal(deletionFloor('apple',text),5);
 assert.equal(backspaceTarget('apple',text),null);
 assert.equal(deletionFloor('apple ',text),6);
 assert.equal(backspaceTarget('apple ',text),null);
 assert.equal(backspaceTarget('apple ba',text),7);
 assert.equal(backspaceTarget('apple ba',text,true),6);
});

test('mistakes never lock a word, even when its prefix now looks correct',()=>{
 assert.equal(deletionFloor('apole',text),0);
 assert.equal(backspaceTarget('apole ',text),5);
 assert.equal(backspaceTarget('apo',text),2);
 assert.equal(backspaceTarget('ap',text),1);
 assert.equal(backspaceTarget('a',text),0);
 assert.equal(backspaceTarget('apole',text,true),0);
});

test('wrong word can be erased even after next word has begun if none is completed correctly',()=>{
 const value='apole ban';
 assert.equal(deletionFloor(value,text),0);
 assert.equal(backspaceTarget(value,text,true),6);
 assert.equal(validDeletion('apole ','apole',text),true);
 assert.equal(validDeletion('apole ','',text),true);
 assert.equal(validDeletion('apole ban','apole ba',text),true);
 assert.equal(validDeletion('apole ban','apole ',text),true);
});

test('later correct words protect themselves even if earlier words were misspelled',()=>{
 assert.equal(deletionFloor('apole banana',text),12);
 assert.equal(backspaceTarget('apole banana',text),null);
 assert.equal(deletionFloor('apole banana ',text),13);
 assert.equal(backspaceTarget('apole banana ki',text,true),13);
 assert.equal(validDeletion('apole banana ki','apole banana ',text),true);
 assert.equal(validDeletion('apole banana ','',text),false);
});

test('deletion rejects cheating, rewriting, and crossing correct word boundaries',()=>{
 assert.equal(validDeletion('apple ','apple',text),false);
 assert.equal(validDeletion('apple bx','apple ',text),true);
 assert.equal(validDeletion('apple bx','apple b',text),true);
 assert.equal(validDeletion('apple bx','appl',text),false);
 assert.equal(validDeletion('apple bx','apple zx',text),false);
 assert.equal(currentWordStart('apole '),0);
 assert.equal(currentWordStart('apple ba'),6);
});
