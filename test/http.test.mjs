import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
test('static server serves app only, with safe content types and no source leakage',async()=>{
 const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4185'},stdio:['ignore','pipe','pipe']});
 try {
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(new Error(`Server exited ${code}`)));});
  for(const p of ['/','/style.css','/src/app.js','/src/tools.js','/src/domain.js']){const r=await fetch('http://127.0.0.1:4185'+p);assert.equal(r.status,200);assert.ok(r.headers.get('content-security-policy'));assert.ok((await r.text()).length>20);}
  for(const p of ['/package.json','/.env','/server.mjs','/no-such-file'])assert.equal((await fetch('http://127.0.0.1:4185'+p)).status,404);
  assert.equal((await fetch('http://127.0.0.1:4185/',{method:'POST'})).status,404);
 }finally{child.kill();}
});
