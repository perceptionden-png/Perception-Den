// Preview adapter. Replace this module with the Supabase account/workspace adapter.
// This browser-only gate is not a production authentication or data-security boundary.
const ACCOUNTS = 'pd-preview-accounts-v1';
const SESSION = 'pd-preview-session-v1';
const LEGACY = 'perception-den-v1';
const CLAIM = 'pd-preview-legacy-claimed';
const ITERATIONS = 210000;
const encoder = new TextEncoder();
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
function accounts() { return JSON.parse(localStorage.getItem(ACCOUNTS) || '[]'); }
function publicUser(user) { return {id:user.id, username:user.username, email:user.email, emailVerified:false}; }
async function digest(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2', salt:encoder.encode(salt), iterations:ITERATIONS, hash:'SHA-256'}, key, 256)));
}
export function emptyWorkspace(username = '') {
  return {saved:[], projects:[], activity:[], profile:{name:username, headline:'', bio:'', roles:[], location:'', works:[]}};
}
export function workspaceKey(id) { return `pd-workspace-v1:${id}`; }
export const account = {
  getSession() {
    try { const id = sessionStorage.getItem(SESSION); const user = accounts().find(u => u.id === id); return user ? publicUser(user) : null; }
    catch { return null; }
  },
  hasLegacyWorkspace() {
    try { const data=JSON.parse(localStorage.getItem(LEGACY)); return !localStorage.getItem(CLAIM) && !!data && (!!data.projects?.length || !!data.profile?.name || !!data.profile?.works?.length); }
    catch { return false; }
  },
  async signUp({username,email,password,importWorkspace=false}) {
    username=username.trim(); email=email.trim().toLowerCase();
    if(!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) throw Error('Choose a username with 3–24 letters, numbers, dots, underscores, or hyphens.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254) throw Error('Enter a valid email address.');
    if(password.length<8 || password.length>128) throw Error('Choose a password with 8–128 characters.');
    const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
    const passwordHash=await digest(password,salt);
    const list=accounts();
    if(list.some(u=>u.username.toLowerCase()===username.toLowerCase())) throw Error('That username is already used on this device. Try another.');
    if(list.some(u=>u.email===email)) throw Error('An account with this email already exists on this device. Sign in instead.');
    const user={id:crypto.randomUUID(),username,email,salt,passwordHash,iterations:ITERATIONS,createdAt:new Date().toISOString()};
    const previousAccounts=localStorage.getItem(ACCOUNTS), previousClaim=localStorage.getItem(CLAIM);
    let workspace=emptyWorkspace(username), imported=false;
    if(importWorkspace && this.hasLegacyWorkspace()) {
      const old=JSON.parse(localStorage.getItem(LEGACY));
      if(Array.isArray(old.projects)&&Array.isArray(old.saved)&&Array.isArray(old.activity)&&old.profile){workspace=old;imported=true;}
    }
    try {
      localStorage.setItem(workspaceKey(user.id),JSON.stringify(workspace));
      localStorage.setItem(ACCOUNTS,JSON.stringify([...list,user]));
      if(imported) localStorage.setItem(CLAIM,user.id);
      sessionStorage.setItem(SESSION,user.id);
    } catch {
      // Best-effort rollback: never report a successful account when storage failed.
      try { localStorage.removeItem(workspaceKey(user.id)); if(previousAccounts===null)localStorage.removeItem(ACCOUNTS);else localStorage.setItem(ACCOUNTS,previousAccounts);if(previousClaim===null)localStorage.removeItem(CLAIM);else localStorage.setItem(CLAIM,previousClaim); } catch {}
      throw Error('This browser cannot save your account. Allow browser storage or free some space and try again.');
    }
    return {user:publicUser(user),imported};
  },
  async signIn({username,password}) {
    const user=accounts().find(u=>u.username.toLowerCase()===username.trim().toLowerCase());
    if(!user || await digest(password,user.salt)!==user.passwordHash) throw Error('Username or password doesn’t match. Please try again.');
    try {sessionStorage.setItem(SESSION,user.id);}catch {throw Error('Allow browser storage to sign in.');}
    return {user:publicUser(user)};
  },
  signOut() { sessionStorage.removeItem(SESSION); },
  loadWorkspace(user) {
    const data=JSON.parse(localStorage.getItem(workspaceKey(user.id))||'null');
    if(data && Array.isArray(data.projects)&&Array.isArray(data.saved)&&Array.isArray(data.activity)&&data.profile)return data;
    return emptyWorkspace(user.username);
  },
  saveWorkspace(user,data) {
    if(this.getSession()?.id!==user.id) throw Error('Sign in to save your workspace.');
    localStorage.setItem(workspaceKey(user.id),JSON.stringify(data));
  }
};
