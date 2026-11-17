// One storage key per record avoids lost updates when two app tabs are open.
// Only remove an entry after the server transaction confirms success.
export class Outbox {
 constructor(storage){this.storage=storage;}
 prefix(uid){if(!uid)throw Error('Sign in before saving a record.');return 'assin-outbox:'+uid+':';}
 key(uid,id){return this.prefix(uid)+id;}
 list(uid){const prefix=this.prefix(uid),rows=[];for(let i=0;i<this.storage.length;i++){const key=this.storage.key(i);if(key?.startsWith(prefix)){const row=JSON.parse(this.storage.getItem(key));if(!row?.id||!row?.data)throw Error('Saved outbox cannot be read. Keep this browser data and contact admin.');rows.push(row);}}return rows.sort((a,b)=>a.savedAt-b.savedAt);}
 add(uid,id,data){const key=this.key(uid,id);if(this.storage.getItem(key))throw Error('This record is already waiting to sync.');this.storage.setItem(key,JSON.stringify({id,data,savedAt:Date.now(),error:''}));}
 remove(uid,id){this.storage.removeItem(this.key(uid,id));}
 fail(uid,id,error){const key=this.key(uid,id),raw=this.storage.getItem(key);if(raw)this.storage.setItem(key,JSON.stringify({...JSON.parse(raw),error}));}
}
