import {connectSupabase} from './supabase/client.js';
import {config} from './supabase/config.js';
export const {supabase,...collaboration}=connectSupabase(config);
let snapshot=null;
export function emptyWorkspace(username='') {return {saved:[],projects:[],activity:[],creatives:[],profile:{name:username,headline:'',bio:'',roles:[],location:'',works:[]}};}
function userView(u){return u?{id:u.id,email:u.email,username:u.user_metadata?.username||u.user_metadata?.full_name||'Creator'}:null;}
async function result(q){const {data,error}=await q;if(error)throw error;return data;}
const list=v=>Array.isArray(v)?v:[];
function profileView(p){return {...p.details,id:p.id,name:p.full_name||p.username||'Creator',username:p.username,roles:list(p.skills),works:list(p.details?.works),socials:list(p.details?.socials),cover:p.details?.cover||'./covers/studio.svg',location:p.details?.location||'',headline:p.details?.headline||'',bio:p.details?.bio||''};}
export const account={
 async getSession(){const {data,error}=await supabase.auth.getSession();if(error)throw error;return userView(data.session?.user);},
 hasLegacyWorkspace(){return false;},
 async signUp({username,email,password}){
  if(!/^[a-zA-Z0-9_.-]{3,24}$/.test(username||''))throw Error('Choose a username with 3–24 letters, numbers, dots, underscores, or hyphens.');
  if(password.length<8)throw Error('Use at least 8 characters for your password.');
  const data=await result(supabase.auth.signUp({email:email.trim(),password,options:{data:{username,full_name:username},emailRedirectTo:location.origin+location.pathname}}));
  return {user:userView(data.user),verificationRequired:!data.session};
 },
 async signIn({email,password}){const data=await result(supabase.auth.signInWithPassword({email:email.trim(),password}));return {user:userView(data.user)};},
 async signOut(){await result(supabase.auth.signOut());snapshot=null;},
 async loadWorkspace(user){
  const [people,rows,requests,saved,members]=await Promise.all([
   result(supabase.from('profiles').select('*').order('created_at',{ascending:false})),
   result(supabase.from('projects').select('*').order('created_at',{ascending:false})),
   result(supabase.from('collaboration_requests').select('*').order('created_at',{ascending:false})),
   result(supabase.from('saved_projects').select('project_id').eq('user_id',user.id)),result(supabase.from('project_members').select('*'))
  ]);
  const names=new Map(people.map(p=>[p.id,p.full_name||p.username||'Creator']));
  const own=people.find(p=>p.id===user.id);if(!own)throw Error('Your profile could not be loaded. Please try again.');
  const data={saved:saved.map(s=>s.project_id),profile:profileView(own),creatives:people.filter(p=>p.id!==user.id).map(profileView),projects:rows.map(p=>({...p.details,id:p.id,title:p.title,description:p.description,creator_id:p.creator_id,owner:names.get(p.creator_id)||'Creator',mine:p.creator_id===user.id,roles:list(p.details?.roles),members:[...list(p.details?.members),...members.filter(m=>m.project_id===p.id).map(m=>({id:m.user_id,userId:m.user_id,name:names.get(m.user_id)||'Creator',role:m.role,url:''}))],media:list(p.details?.media),socials:list(p.details?.socials),medium:p.details?.medium||'Film',cover:p.details?.cover||'./covers/film.svg'}))};
  data.activity=requests.map(r=>{const p=rows.find(p=>p.id===r.project_id);return {...r,projectId:r.project_id,project:p?.title||'Project',kind:r.sender_id===p?.creator_id?'invite':'request',person:names.get(r.sender_id===user.id?r.receiver_id:r.sender_id)||'Creator',incoming:r.receiver_id===user.id,date:r.created_at};});
  snapshot=structuredClone(data);return data;
 },
 async saveWorkspace(user,data){
  if(!snapshot)throw Error('Reload your workspace before saving.');
  const before=snapshot;
  if(JSON.stringify(before.profile)!==JSON.stringify(data.profile)){
   const p=data.profile;await result(supabase.from('profiles').update({full_name:p.name,role:p.roles[0]||'',skills:p.roles,details:{headline:p.headline,bio:p.bio,location:p.location,works:p.works,socials:p.socials||[],messagingUrl:p.messagingUrl||'',messagingLabel:p.messagingLabel||''}}).eq('id',user.id).select('id').single());
  }
  for(const p of data.projects.filter(p=>p.mine)){
   const old=before.projects.find(x=>x.id===p.id);if(JSON.stringify(old)===JSON.stringify(p))continue;
   const details=Object.fromEntries(['medium','stage','roles','location','budget','cover','socials','members','media'].map(k=>[k,p[k]??(['roles','socials','members','media'].includes(k)?[]:'')]));
   details.members=details.members.filter(m=>!m.userId);
   if(old)for(const member of old.members.filter(m=>m.userId&&!p.members.some(n=>n.id===m.id)))await result(supabase.from('project_members').delete().eq('project_id',p.id).eq('user_id',member.userId));
   const values={title:p.title,description:p.description,details};
   await result(old?supabase.from('projects').update(values).eq('id',p.id).eq('creator_id',user.id).select('id').single():supabase.from('projects').insert({...values,id:p.id,creator_id:user.id}).select('id').single());
  }
  for(const old of before.projects.filter(p=>p.mine&&!data.projects.some(x=>x.id===p.id)))await result(supabase.from('projects').delete().eq('id',old.id).eq('creator_id',user.id).select('id').single());
  for(const id of data.saved.filter(id=>!before.saved.includes(id)))await result(supabase.from('saved_projects').insert({user_id:user.id,project_id:id}));
  for(const id of before.saved.filter(id=>!data.saved.includes(id)))await result(supabase.from('saved_projects').delete().eq('user_id',user.id).eq('project_id',id));
  snapshot=structuredClone(data);
 },
 async sendRequest({projectId,receiverId,message,role=''}){
  const u=await this.getSession();if(!u)throw Error('Please sign in.');
  const p=await result(supabase.from('projects').select('creator_id').eq('id',projectId).single());
  const recipient=p.creator_id===u.id?receiverId:p.creator_id;
  if(!recipient||recipient===u.id)throw Error('Choose another collaborator.');
  try{return await result(supabase.from('collaboration_requests').insert({project_id:projectId,sender_id:u.id,receiver_id:recipient,message,role}).select().single());}
  catch(e){if(e.code==='23505')throw Error('A request or invitation is already pending.');throw e;}
 },
 respond(id,status){return collaboration.respondToRequest({requestId:id,status});}
};
