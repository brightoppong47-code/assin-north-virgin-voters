const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{webcrypto}=require('crypto');
const values=new Map();const storage={get length(){return values.size},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{value:'',hidden:false,disabled:false,checked:false,textContent:'',innerHTML:'',className:'',classList:{contains:()=>false,toggle(){}},addEventListener(){},querySelector:()=>({disabled:false,required:false}),querySelectorAll:()=>[],reset(){},elements:{email:{value:''}}});return elements.get(id)}
const user={uid:'tester'},p={name:'Test Agent',active:true,role:'agent',areaId:'area-1'};let authCallback;const server=new Map(),listeners=[];let denied=false,writes=0;
const snapshot=ref=>({id:ref.id,data:()=>ref.col==='users'?p:ref.col==='system'?{resetting:false}:server.get(ref.id),exists:()=>server.has(ref.id),metadata:{fromCache:false}});
class Timestamp{constructor(seconds,nanoseconds=0){Object.assign(this,{seconds,nanoseconds})}static fromMillis(n){return new Timestamp(n/1000)}toDate(){return new Date(this.seconds*1000)}}
const ctx={firebaseConfig:{projectId:"test"},console,localStorage:storage,crypto:webcrypto,TextEncoder,Timestamp,Date,URL,Blob,FormData:class{constructor(f){this.form=f}get(k){return this.form.data[k]}},setTimeout,clearTimeout,setInterval(){},navigator:{onLine:false,userAgent:'test'},window:{addEventListener(){}},document:{getElementById:el,querySelectorAll:()=>[],addEventListener(){},hidden:false},confirm:()=>true,
initializeApp:()=>({}),getAuth:()=>({currentUser:user}),initializeFirestore:()=>({}),persistentLocalCache:()=>({}),persistentMultipleTabManager:()=>({}),onAuthStateChanged:(a,cb)=>authCallback=cb,
collection:(db,col)=>({col}),doc:(db,col,id)=>({col,id}),query:q=>q,where(){},serverTimestamp:()=>new Timestamp(123),onSnapshot:(ref,cb)=>{listeners.push(()=>cb(ref.id?snapshot(ref):{docs:(ref.col==='stations'?[{id:'s1',data:()=>({name:'Station One',areaId:'area-1'})}]:[])}));return ()=>{}},
runTransaction:async(db,fn)=>{if(denied)throw Object.assign(Error('denied'),{code:'permission-denied'});const staged=[];const result=await fn({get:async ref=>snapshot(ref),set:(ref,d)=>staged.push([ref,d])});for(const [ref,d]of staged){server.set(ref.id,d);writes++}return result},filterReport:r=>r};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('offline-update/js/outbox.js','utf8').replace('export class','class')+'\nglobalThis.Outbox=Outbox;',ctx);vm.runInContext(fs.readFileSync('offline-update/js/app.js','utf8').replace(/^import .*;\n/gm,''),ctx);
(async()=>{
authCallback(user);listeners.shift()();while(listeners.length)listeners.shift()();
vm.runInContext("areas=[{id:'area-1',name:'Endwa'}];stations=[{id:'s1',name:'Station One',areaId:'area-1'}];",ctx);
const form={data:{name:'Offline Test',contact:'0241234567',location:'Endwa',type:'registration',stationId:'s1',consent:'on'},reset(){this.wasReset=true},querySelector:()=>({})};el('record-form').onsubmit({preventDefault(){},target:form});await new Promise(r=>setTimeout(r,30));assert.equal(storage.length,1);assert.equal(form.wasReset,true);assert.equal(writes,0);assert.match(el('sync-status').textContent,/1 record/);
// Recreate storage reader to simulate a restart; another user cannot see this queue.
assert.equal(new ctx.Outbox(storage).list('tester').length,1);assert.equal(new ctx.Outbox(storage).list('other').length,0);
ctx.navigator.onLine=true;denied=true;await vm.runInContext('syncPending()',ctx);assert.equal(storage.length,1);assert.match(new ctx.Outbox(storage).list('tester')[0].error,/Access denied/);
denied=false;await vm.runInContext('syncPending()',ctx);assert.equal(storage.length,0);assert.equal(writes,1);
const [id,data]=[...server][0];const replay={...data};delete replay.createdAt;new ctx.Outbox(storage).add('tester',id,replay);await vm.runInContext('syncPending()',ctx);assert.equal(storage.length,0);assert.equal(writes,1);
new ctx.Outbox(storage).add('tester',id,{...replay,location:'Different'});await vm.runInContext('syncPending()',ctx);assert.equal(storage.length,1);assert.match(new ctx.Outbox(storage).list('tester')[0].error,/different record/);assert.equal(server.get(id).location,'Endwa');
// Queue refuses storage exhaustion instead of pretending the record was saved.
const failing=new ctx.Outbox({...storage,setItem(){throw Error('quota')}});assert.throws(()=>failing.add('tester','new',replay),/quota/);
console.log('PASS: offline form save, durable account-scoped queue, rejected-write retention, reconnect sync, duplicate replay without overwrite, conflict retention, storage-error handling');
})().catch(e=>{console.error(e);process.exitCode=1});
