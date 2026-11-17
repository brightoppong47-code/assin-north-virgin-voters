const vm=require('vm'),fs=require('fs'),assert=require('assert/strict');const handlers={},stored=new Map(),fetched=[];let offline=false;
const cache={addAll:async urls=>{for(const url of urls)stored.set(url,{ok:true,url,clone(){return this}})},put:async(req,r)=>stored.set(req.url,r),match:async url=>stored.get(typeof url==='string'?url:url.url)};
const context={URL,Request,self:{location:{href:'https://example.com/app/sw.js'},addEventListener:(k,fn)=>handlers[k]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{},matchAll:async()=>[]}},caches:{open:async()=>cache,keys:async()=>['other-app-cache','assin-north-offline-old'],delete:async key=>assert.notEqual(key,'other-app-cache')},fetch:async req=>{fetched.push(req);if(offline)throw Error('offline');return {ok:true,clone(){return this}}}};
vm.runInNewContext(fs.readFileSync('offline-update/sw.js','utf8'),context);
(async()=>{let task;handlers.install({waitUntil:p=>task=p});await task;assert.equal(stored.size,13);handlers.activate({waitUntil:p=>task=p});await task;offline=true;
for(const path of ['','index.html','js/app.js?v=20261117-1','style.css?v=20261117-1','js/outbox.js']){let response;handlers.fetch({request:new Request('https://example.com/app/'+path),respondWith:p=>response=p});assert.ok(await response,path)}
let response;handlers.fetch({request:new Request('https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'),respondWith:p=>response=p});assert.ok(await response);
let intercepted=false;handlers.fetch({request:new Request('https://firestore.googleapis.com/v1/data'),respondWith:()=>intercepted=true});assert.equal(intercepted,false);
handlers.fetch({request:new Request('https://example.com/another-app/index.html'),respondWith:()=>intercepted=true});assert.equal(intercepted,false);
console.log('PASS: complete shell/SDK precache, offline navigation and versioned assets, SDK fallback, no database/API caching, other apps unaffected');})().catch(e=>{console.error(e);process.exitCode=1});
