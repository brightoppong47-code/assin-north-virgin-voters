const CACHE='assin-north-offline-20261117-1';
const ROOT=new URL('./',self.location.href);
const SDK='https://www.gstatic.com/firebasejs/12.2.1/';
const FILES=['./','index.html','style.css','js/app.js','js/outbox.js','js/data-tools.js','js/firebase-config.js','vendor/jspdf.umd.min.js','vendor/jspdf.plugin.autotable.min.js','assets/logo.svg'];
const SDKS=['firebase-app.js','firebase-auth.js','firebase-firestore.js'].map(p=>SDK+p);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 // SDK files are CORS fetched as well, so an offline restart can import Firebase.
 await cache.addAll([...FILES.map(p=>new URL(p,ROOT).href),...SDKS]);
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith('assin-north-offline-')&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
 for(const client of await self.clients.matchAll())client.postMessage({type:'OFFLINE_READY'});
})()));
self.addEventListener('message',event=>{if(event.data?.type==='CHECK_OFFLINE')event.source?.postMessage({type:'OFFLINE_READY'});});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET')return;
 const local=url.origin===ROOT.origin&&url.pathname.startsWith(ROOT.pathname);
 const sdk=SDKS.includes(url.origin+url.pathname);
 // Never cache Firebase API traffic, credentials, or database responses here.
 if(!local&&!sdk)return;
 const allowed=local&&FILES.some(path=>new URL(path,ROOT).pathname===url.pathname);
 if(!allowed&&!sdk)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{const response=await fetch(request);if(response.ok)await cache.put(new Request(url.origin+url.pathname),response.clone());return response;}
  catch(error){const saved=await cache.match(url.origin+url.pathname);if(saved)return saved;throw error;}
 })());
});
