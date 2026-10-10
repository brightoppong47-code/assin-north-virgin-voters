export function filterReport(records,filters={}) {
  const {area='',station='',type='',from='',to=''}=filters;
  if(from&&to&&from>to)throw Error('From date must be on or before To date.');
  return records.filter(r=>{
    const date=Number.isInteger(r.createdAt?.seconds)?new Date(r.createdAt.seconds*1000).toISOString().slice(0,10):'';
    return (!area||r.areaId===area)&&(!station||r.stationId===station)&&(!type||r.type===type)&&(!from||(date&&date>=from))&&(!to||(date&&date<=to));
  });
}
const fail=m=>{throw Error('Invalid backup: '+m);};
const text=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max;
const id=v=>text(v,1500)&&!v.includes('/')&&v!=='.'&&v!=='..'&&!/^__.*__$/.test(v);
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const stamp=v=>exact(v,['seconds','nanoseconds'])&&Number.isInteger(v.seconds)&&v.seconds>=0&&v.seconds<=Math.floor(Date.now()/1000)+1&&Number.isInteger(v.nanoseconds)&&v.nanoseconds>=0&&v.nanoseconds<1e9;
export function validateBackup(b,projectId) {
  if(!exact(b,['format','version','projectId','exportedAt','collections'])||b.format!=='assin-north-backup'||b.version!==1||b.projectId!==projectId||!Number.isFinite(Date.parse(b.exportedAt)))fail('wrong app, version or Firebase project.');
  if(!exact(b.collections,['areas','stations','records','users']))fail('collections are incomplete.');
  for(const col of ['areas','stations','records','users']){
    const rows=b.collections[col];if(!Array.isArray(rows)||rows.length>100000)fail(col+' must be a list with at most 100,000 items.');
    const seen=new Set();
    for(const row of rows){if(!exact(row,['id','data'])||!id(row.id)||seen.has(row.id))fail('invalid or duplicate document ID in '+col);seen.add(row.id);const d=row.data;
      if(col==='areas'&&(!exact(d,['name','expected','order'])||!text(d.name,160)||!Number.isInteger(d.expected)||d.expected<0||!Number.isInteger(d.order)))fail('invalid area.');
      if(col==='stations'&&(!exact(d,['name','areaId','createdAt'])||!text(d.name,160)||!id(d.areaId)||!stamp(d.createdAt)))fail('invalid polling station.');
      if(col==='users'&&(!exact(d,['name','email','role','areaId','active'])||!text(d.name,160)||!text(d.email,254)||!['admin','agent'].includes(d.role)||!id(d.areaId)||typeof d.active!=='boolean'))fail('invalid account reference.');
      if(col==='records'&&(!exact(d,['name','contact','location','type','currentStation','stationId','areaId','consent','createdBy','createdByName','createdAt'])||!text(d.name,160)||typeof d.contact!=='string'||!/^\+?\d{9,15}$/.test(d.contact)||!text(d.location,160)||!['registration','transfer'].includes(d.type)||typeof d.currentStation!=='string'||d.currentStation.length>160||(d.type==='registration'?d.currentStation!=='':!d.currentStation.length)||!id(d.stationId)||!id(d.areaId)||d.consent!==true||!text(d.createdBy,128)||!text(d.createdByName,160)||!stamp(d.createdAt)))fail('invalid assistance record.');
    }
  }
  const areas=new Set(b.collections.areas.map(x=>x.id)),stations=new Map(b.collections.stations.map(x=>[x.id,x.data]));
  for(const s of stations.values())if(!areas.has(s.areaId))fail('station references a missing area.');
  for(const r of b.collections.records)if(!areas.has(r.data.areaId)||stations.get(r.data.stationId)?.areaId!==r.data.areaId)fail('record references an inconsistent polling station.');
  return b;
}
const canonical=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function makeRestorePlan(backup,current) {
  const plan={missing:[],counts:{},conflicts:0,existing:0};
  for(const col of ['areas','stations','records']){
    const live=new Map(current[col].map(x=>[x.id,x.data]));let count=0;
    for(const row of backup.collections[col]){
      if(live.has(row.id)){plan.existing++;if(canonical(live.get(row.id))!==canonical(row.data))plan.conflicts++;}
      else {plan.missing.push({col,...row});count++;}
    }plan.counts[col]=count;
  }
  // Existing station assignments must not redirect restored records into another area.
  const effectiveAreas=new Set([...current.areas,...backup.collections.areas].map(x=>x.id));
  const effectiveStations=new Map([...backup.collections.stations,...current.stations].map(x=>[x.id,x.data]));
  for(const row of plan.missing){if(row.col==='stations'&&!effectiveAreas.has(row.data.areaId))fail('missing area dependency.');if(row.col==='records'&&effectiveStations.get(row.data.stationId)?.areaId!==row.data.areaId)fail('existing station assignment conflicts with a record.');}
  return plan;
}
