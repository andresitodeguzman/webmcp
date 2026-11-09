// Zero npm dependencies. Drives a disposable local Chromium over CDP.
import {spawn} from 'node:child_process';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const port=Number(process.env.TEST_PORT||4184);
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
async function waitFor(fn){for(let i=0;i<100;i++){try{const r=await fn();if(r)return r;}catch{}await sleep(100);}throw new Error('Timed out');}
await waitFor(async()=> (await fetch(`http://127.0.0.1:${port}`)).ok);
async function run(native) {
 const profile=await mkdtemp(path.join(tmpdir(),'webmcp-demo-'));
 const browser=spawn(process.env.CHROME_BIN||'chromium',['--headless=new','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,native?'--enable-blink-features=WebMCP':'--disable-blink-features=WebMCP','about:blank']);
 let stderr='';browser.stderr.on('data',b=>stderr+=b);
 let socket;
 try {
  await waitFor(()=>stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1]);
  const wsurl=stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)[1];
  const origin=new URL(wsurl);const pages=await(await fetch(`http://${origin.host}/json`)).json();
  socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0;const calls=new Map();const errors=[];
  socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const c=calls.get(m.id);calls.delete(m.id);m.error?c.reject(new Error(JSON.stringify(m.error))):c.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;calls.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});
  const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await cdp('Runtime.enable');await cdp('Page.enable');await cdp('Page.navigate',{url:`http://127.0.0.1:${port}`});
  await waitFor(()=>evaluate("document.getElementById('run')?.disabled === false"));
  const status=await evaluate("document.getElementById('status').textContent");
  assert.match(status,native?/Native WebMCP tool registered/:/Rehearsal mode/);
  await evaluate("document.getElementById('preview').click()");
  assert.equal(await evaluate("document.getElementById('count').textContent"),'0');
  await evaluate("document.getElementById('ticket-form').requestSubmit()");
  assert.equal(await evaluate("document.getElementById('count').textContent"),'1');
  // Repeated tool submission deduplicates the earlier human submission.
  await evaluate("document.getElementById('run').click()");
  await waitFor(()=>evaluate("document.getElementById('run').disabled === false"));
  assert.equal(await evaluate("document.getElementById('count').textContent"),'1');
  assert.equal(JSON.parse(await evaluate("document.getElementById('result').textContent")).duplicate,true);
  await evaluate("document.getElementById('arguments').value=JSON.stringify({summary:'A second issue',category:'other'});document.getElementById('run').click()");
  await waitFor(()=>evaluate("document.getElementById('run').disabled === false"));
  assert.equal(await evaluate("document.getElementById('count').textContent"),'2');
  await evaluate("document.getElementById('arguments').value='not JSON';document.getElementById('run').click()");
  await waitFor(()=>evaluate("document.getElementById('run').disabled === false"));
  assert.match(await evaluate("document.getElementById('result').textContent"),/Error/);
  await evaluate("document.getElementById('arguments').value=JSON.stringify({summary:'bad',category:'other'});document.getElementById('run').click()");
  await waitFor(()=>evaluate("document.getElementById('run').disabled === false"));
  assert.equal(await evaluate("document.getElementById('count').textContent"),'2');
  // User input is text, not executable markup.
  await evaluate("document.getElementById('arguments').value=JSON.stringify({summary:'<img src=x onerror=alert(1)>',category:'other'});document.getElementById('run').click()");
  await waitFor(()=>evaluate("document.getElementById('run').disabled === false"));
  assert.equal(await evaluate("document.querySelectorAll('#tickets img').length"),0);
  if(native){assert.equal(await evaluate("(async () => (await document.modelContext.getTools()).filter(t=>t.name==='submit_demo_ticket').length)()"),1);}
  await evaluate("document.getElementById('reset').click()");assert.equal(await evaluate("document.getElementById('count').textContent"),'0');
  await cdp('Page.reload');await waitFor(()=>evaluate("document.getElementById('run')?.disabled === false"));assert.equal(await evaluate("document.getElementById('count').textContent"),'0');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:1050,deviceScaleFactor:1,mobile:false});
  await mkdir('artifacts',{recursive:true});
  await writeFile(`artifacts/${native?'native':'fallback'}-desktop.png`,Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),true);
  await writeFile(`artifacts/${native?'native':'fallback'}-mobile.png`,Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  assert.deepEqual(errors,[]);
  console.log(`PASS ${native?'native WebMCP':'fallback'}: preview, UI submit, tool call, duplicate, validation, escaping, reset, reload, mobile overflow, no uncaught errors.`);
 } catch(error) { console.error(stderr); throw error; } finally {socket?.close();browser.kill();if(browser.exitCode===null && browser.signalCode===null) await new Promise(r=>browser.once('exit',r));await rm(profile,{recursive:true,force:true});}
}
try {await run(false);await run(true);}finally{server.kill();}
