const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const text=fs.readFileSync(path.join(__dirname,'../wordbanks.js'),'utf8');
const ctx={window:{}};vm.runInNewContext(text,ctx);
const client=ctx.window.UndefinedTypeWordBanks;
const server=require('../server/languages.json');
test('easy English words sync between solo and multiplayer',()=>{
 assert.equal(client.en,server.en.bank);
 const words=client.en.split(' ');
 assert.ok(words.length>=650);
 assert.equal(new Set(words).size,words.length);
 assert.ok(words.every(w=>/^[a-z]{2,9}$/.test(w)));
 for(const familiar of ['apple','banana','school','friend','house','music','happy','window','typing']) assert.ok(words.includes(familiar),familiar);
 for(const jargon of ['tuberculous','gangrene','haemorrhage','sarcoma','adjutant']) assert.ok(!words.includes(jargon),jargon);
});
test('all 70 multiplayer language banks are still present',()=>{assert.ok(client.en);assert.equal(Object.keys(server).length,70);assert.ok(Object.values(server).every(language=>language.bank.length>0));});
