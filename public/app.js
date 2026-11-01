import { streamlitURL, imageURL, validCard, filterCards } from './model.js';
const $ = s => document.querySelector(s);
const cfg = window.DATA_STAND_CONFIG || {};
const demo = !cfg.supabaseUrl && !cfg.supabasePublishableKey;
let db, cards = [], admin = false, pendingDelete, toastTimer, objectURL;
function uuid(){ return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16)); }
const demoKey = 'data-stand-demo-v1';
const seed = [{id:'sample', title:'Student Alcohol Consumption',records:395,dataset_published:'2008',description:'Academic performance, health, and social activity across student alcohol consumption levels.',url:'',image_url:'',image_path:null,created_at:'2026-11-01T00:00:00Z'}];
function message(text) { $('#toast').textContent = text; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(()=>$('#toast').hidden = true, 5000); }
function notice(text) { $('#notice').textContent = text; $('#notice').hidden = false; }
function el(tag, cls, text) { const n = document.createElement(tag); if(cls) n.className = cls; if(text !== undefined) n.textContent = text; return n; }
function setAdmin(value) { admin = value; $('#add').hidden = !value; $('#signout').hidden = !value || demo; $('#manage').textContent = value ? (demo ? 'Sample editor active' : 'Owner mode') : 'Manage collection ↗'; render(); }
function render() {
  const list = filterCards(cards, $('#search').value, $('#sort').value);
  $('#count').textContent = cards.length;
  $('#results').textContent = `${list.length} ${list.length === 1 ? 'analysis' : 'analyses'} shown`;
  $('#grid').replaceChildren(); $('#grid').hidden = list.length === 0; $('#empty').hidden = list.length > 0;
  for (const c of list) {
    const folder = el('article','folder'); folder.append(el('div','folder-tab'));
    const body = el('div','folder-body');
    let url = ''; try { url = streamlitURL(c.url); } catch {}
    const link = el(url ? 'a' : 'div','folder-link');
    if (url) { link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',`Open ${c.title} dashboard in a new tab`); }
    const preview = el('div','preview');
    const placeholder = () => { preview.replaceChildren(); const p=el('div','preview-placeholder');p.append(el('span','','▥'),el('div','', demo && !url ? 'Your dashboard preview goes here' : 'Preview not uploaded'));preview.append(p); };
    const src = demo && c.image_url?.startsWith('data:image/') ? c.image_url : imageURL(c.image_url);
    if (src) { const img=el('img');img.src=src;img.alt=`Preview of ${c.title}`;img.loading='lazy';img.onerror=placeholder;preview.append(img); } else placeholder();
    preview.append(el('span','preview-badge',demo && c.id === 'sample' ? 'SAMPLE LISTING' : 'STREAMLIT DASHBOARD'));
    const info=el('div','card-info'),title=el('h3','card-title');title.append(el('strong','',c.title),el('span','',url?'↗':'—'));info.append(title);
    if(c.description) info.append(el('p','card-description',c.description));
    const meta=el('div','card-meta'); const records=el('span');records.append(el('strong','',Number(c.records).toLocaleString()),' records');const date=el('span');date.append('Dataset published: ',el('strong','',c.dataset_published));meta.append(records,date);info.append(meta);
    if(!url) info.append(el('p','card-description','Dashboard link not added yet.'));
    link.append(preview,info);body.append(link);
    if(admin){const actions=el('div','card-actions');const edit=el('button','','Edit');edit.type='button';edit.setAttribute('aria-label',`Edit ${c.title}`);edit.onclick=()=>openEditor(c);const remove=el('button','remove','Remove');remove.type='button';remove.setAttribute('aria-label',`Remove ${c.title}`);remove.onclick=()=>{pendingDelete=c;$('#delete-error').textContent='';$('#delete-dialog').showModal();};actions.append(edit,remove);body.append(actions);}
    folder.append(body);$('#grid').append(folder);
  }
}
async function refresh() {
  if(demo){try{const stored=JSON.parse(localStorage.getItem(demoKey));cards=Array.isArray(stored)?stored:structuredClone(seed);}catch{cards=structuredClone(seed);}render();return;}
  const {data,error}=await db.from('dashboards').select('*').order('created_at',{ascending:false});
  if(error) throw error;cards=data || [];render();
}
function persistDemo(next) { localStorage.setItem(demoKey,JSON.stringify(next));cards=next;render(); }
async function updateOwner() {
  const {data:{session},error}=await db.auth.getSession();if(error) throw error;
  if(!session){setAdmin(false);return;}
  const {data,error:roleError}=await db.from('admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
  if(roleError) throw roleError;setAdmin(!!data);
}
function openEditor(card) {
  const f=$('#edit-form');f.reset();$('#edit-error').textContent='';$('#editor-title').textContent=card?'Edit dashboard':'Add a dashboard';
  for(const key of ['id','title','records','dataset_published','url','description']) f.elements[key].value=card?.[key]??'';
  $('#remove-image-wrap').hidden=!card?.image_url;
  $('#image-preview').hidden=!card?.image_url;if(card?.image_url)$('#image-preview').src=card.image_url;
  $('#editor').showModal();
}
$('#edit-form').elements.preview.onchange=e=>{if(objectURL)URL.revokeObjectURL(objectURL);const file=e.target.files[0];$('#image-preview').hidden=!file;if(file){objectURL=URL.createObjectURL(file);$('#image-preview').src=objectURL;}};
$('#search').oninput=render;$('#sort').onchange=render;
$('#add').onclick=()=>openEditor();
$('#manage').onclick=()=>{if(demo){setAdmin(true);message('Sample editor — changes stay in this browser only.');}else if(db){if(admin)message('Owner mode is active. Use Add dashboard or Edit on a card.');else $('#login').showModal();}else message('Complete the connection setup in config.js first.');};
$('#signout').onclick=async()=>{const {error}=await db.auth.signOut();if(error){message(error.message);return;}setAdmin(false);message('Signed out.');};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#login-form').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('[type=submit]');b.disabled=true;$('#login-error').textContent='';try{const {error}=await db.auth.signInWithPassword({email:f.elements.email.value.trim(),password:f.elements.password.value});if(error)throw error;await updateOwner();if(!admin){await db.auth.signOut();throw new Error('This account does not have owner access.');}$('#login').close();f.reset();message('Signed in. You can now manage your cards.');}catch(err){$('#login-error').textContent=err.message;}finally{b.disabled=false;}};
async function fileData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Unable to read image.'));r.readAsDataURL(file);});}
async function cleanupImage(path){if(path&&!demo){const {error}=await db.storage.from('previews').remove([path]);if(error)message('Card saved, but an unused preview could not be removed. You can remove it in Supabase Storage.');}}
$('#edit-form').onsubmit=async e=>{
  e.preventDefault();if(!admin)return;const f=e.target,b=$('#save');b.disabled=true;$('#edit-error').textContent='';let uploadedPath=null,committed=false;
  try{
    const values=Object.fromEntries(new FormData(f)),payload=validCard(values);const old=cards.find(c=>c.id===values.id);const file=f.elements.preview.files[0];
    if(cards.some(c=>c.id!==values.id&&c.url&&streamlitURL(c.url)===payload.url))throw new Error('This dashboard URL is already in the collection. Edit its existing card instead.');
    const id=old?.id||uuid();payload.image_url=old?.image_url||null;payload.image_path=old?.image_path||null;
    if(f.elements.remove_image.checked){payload.image_url=null;payload.image_path=null;}
    if(file){
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>3*1024*1024)throw new Error('Choose a PNG, JPG, or WebP image up to 3 MB.');
      if(demo){payload.image_url=await fileData(file);payload.image_path=null;}
      else{const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[file.type];uploadedPath=`${id}/${uuid()}.${ext}`;const {error}=await db.storage.from('previews').upload(uploadedPath,file,{contentType:file.type,upsert:false});if(error)throw error;payload.image_path=uploadedPath;payload.image_url=db.storage.from('previews').getPublicUrl(uploadedPath).data.publicUrl;}
    }
    if(demo){const next={...old,...payload,id,created_at:old?.created_at||new Date().toISOString()};persistDemo(old?cards.map(c=>c.id===id?next:c):[next,...cards]);}
    else{const query=old?db.from('dashboards').update(payload).eq('id',id):db.from('dashboards').insert({...payload,id});const {data,error}=await query.select('id');if(error)throw error;if(!data?.length)throw new Error('No card was saved. Check owner permissions.');}
    committed=true;$('#editor').close();message(old?'Dashboard updated.':'Dashboard added.');
    if(old?.image_path&&old.image_path!==payload.image_path)await cleanupImage(old.image_path);
    if(!demo){try{await refresh();}catch{message('Saved. Refresh the page to reload the collection.');}}
  }catch(err){if(uploadedPath&&!committed)await cleanupImage(uploadedPath);$('#edit-error').textContent=err.name==='QuotaExceededError'?'Demo storage is full. Use a smaller screenshot or remove sample cards.':err.message;}finally{b.disabled=false;}
};
$('#confirm-delete').onclick=async()=>{
  if(!admin||!pendingDelete)return;const b=$('#confirm-delete');b.disabled=true;$('#delete-error').textContent='';const c=pendingDelete;
  try{if(demo)persistDemo(cards.filter(x=>x.id!==c.id));else{const {data,error}=await db.from('dashboards').delete().eq('id',c.id).select('id');if(error)throw error;if(!data?.length)throw new Error('No card was removed. Check owner permissions.');}
    $('#delete-dialog').close();pendingDelete=null;message('Card removed.');await cleanupImage(c.image_path);if(!demo){try{await refresh();}catch{message('Removed. Refresh the page to reload the collection.');}}
  }catch(err){$('#delete-error').textContent=err.message;}finally{b.disabled=false;}
};
async function start(){
  try{
    if(demo){notice('Design preview · Sample listing, not a live connection. Try the sample editor; changes stay in this browser. Connect Supabase before publishing your real collection.');await refresh();$('#manage').textContent='Try sample editor ↗';return;}
    if(!cfg.supabaseUrl||!cfg.supabasePublishableKey)throw new Error('Add both Supabase configuration values in config.js.');
    const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');db=createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
    // Keep auth callbacks synchronous; query permissions outside the callback.
    db.auth.onAuthStateChange(()=>{setTimeout(()=>updateOwner().catch(()=>setAdmin(false)),0);});
    await updateOwner();await refresh();
  }catch(err){notice(`Unable to load the collection. ${err.message} Check the setup instructions in README.md.`);render();}
}
start();
