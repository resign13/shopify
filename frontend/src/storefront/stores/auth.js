import { defineStore } from 'pinia';
import { request } from '../api';
import { setAuthSession, withAuthTransition } from '../authTransport';
const HINT_KEY = 'gingtto-store-session-hint', OLD_TOKEN_KEY = 'lumiere-store-token', CHANNEL = 'gingtto-store-auth';
const PENDING_LOGOUT = 'gingtto-store-logout-pending';
const EXPECTED_ROLE = 'store', LOGIN_PATH = '/api/auth/store/login';
const NETWORK_MESSAGE = 'Connection interrupted. Your input is retained. Please retry.';
function hint() { try { return localStorage.getItem(HINT_KEY) || ''; } catch { return ''; } }
function remember(value) { try { const old = JSON.parse(localStorage.getItem('lumiere-store-user') || 'null'); if (old?.id && !localStorage.getItem('gingtto-cart-owner')) localStorage.setItem('gingtto-cart-owner',String(old.id)); localStorage.removeItem(OLD_TOKEN_KEY); localStorage.removeItem('lumiere-store-user'); localStorage.setItem(HINT_KEY,value || ''); if (value) localStorage.removeItem(PENDING_LOGOUT); } catch {} }
let bound = false, channel;
function bind(store) {
  if (bound || typeof window === 'undefined') return;
  bound = true;
  if (typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel(CHANNEL);
  const change = async (message) => {
    if (message?.type === 'logout') {
      if (store.sessionId === message.sessionId) store.clearLocalAuth(false);
    } else if (message?.sessionId !== store.sessionId) {
      setAuthSession();
      store.user = null;
      window.dispatchEvent(new Event('auth-identity-cleared'));
      await store.initialize();
    }
  };
  if (channel) channel.onmessage = event => change(event.data);
  window.addEventListener('storage', event => { if (event.key === HINT_KEY) change({type:event.newValue?'changed':'logout',sessionId:event.newValue || store.sessionId}); });
  window.addEventListener('auth-session-expired', () => store.clearLocalAuth(true));
}
function announce(type, id) { channel?.postMessage({type,sessionId:id}); }
export const useAuthStore = defineStore('store-auth',{
  state: () => ({sessionId:hint(),user:null,expiresAt:null,initialized:false,loading:false,error:'',revision:0}),
  getters: {isAuthenticated: state => Boolean(state.sessionId && state.user)},
  actions: {
    clearLocalAuth(broadcast = true) {
      const old = this.sessionId;
      this.revision++; this.sessionId = ''; this.user = null;
      setAuthSession(); remember('');
      if (broadcast) announce('logout',old);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth-identity-cleared'));
    },
    async initialize() {
      bind(this);
      const pendingLogout = localStorage.getItem(PENDING_LOGOUT);
      if (pendingLogout) {
        try {
          await withAuthTransition(CHANNEL, () => request('/api/auth/logout', {method:'POST',headers:{'X-Auth-Session':pendingLogout}}));
          localStorage.removeItem(PENDING_LOGOUT);
        } catch (error) {
          if ([401,409].includes(error.status)) localStorage.removeItem(PENDING_LOGOUT);
          else { this.error = NETWORK_MESSAGE; this.initialized = true; return; }
        }
      }
      const revision = ++this.revision, previousUser = this.user;
      try {
        const data = await request('/api/auth/me');
        if (revision !== this.revision) return;
        if (data.role !== EXPECTED_ROLE) throw Object.assign(new Error('Role mismatch'),{status:401});
        const old = this.sessionId;
        this.sessionId = data.sessionId; this.user = data.user; this.expiresAt = data.expiresAt;
        setAuthSession(data.sessionId,data.csrfToken); remember(data.sessionId); this.error = '';
        if (old !== data.sessionId) announce('changed',data.sessionId);
      } catch (error) {
        if (revision !== this.revision) return;
        if ([401,403].includes(error.status)) this.clearLocalAuth();
        else { this.user = previousUser; this.error = NETWORK_MESSAGE; }
      } finally { this.initialized = true; }
    },
    async login(payload) {
      bind(this);
      if (this.loading) return false;
      const revision = ++this.revision;
      this.loading = true; this.error = '';
      try {
        return await withAuthTransition(CHANNEL, async () => {
          const data = await request(LOGIN_PATH,{method:'POST',body:JSON.stringify(payload)});
          if (revision !== this.revision) return false;
          this.sessionId = data.sessionId; this.user = data.user; this.expiresAt = data.expiresAt;
          setAuthSession(data.sessionId,data.csrfToken); remember(data.sessionId); announce('changed',data.sessionId);
          return true;
        });
      } catch (error) { if (revision === this.revision) this.error = error.message; return false; }
      finally { this.loading = false; }
    },
    async logout() {
      const id = this.sessionId, revision = ++this.revision;
      if (id) localStorage.setItem(PENDING_LOGOUT,id);
      this.sessionId = ''; this.user = null; remember(''); announce('logout',id);
      setAuthSession();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth-identity-cleared'));
      try { await withAuthTransition(CHANNEL, () => request('/api/auth/logout',{method:'POST',headers:id?{'X-Auth-Session':id}:{}})); localStorage.removeItem(PENDING_LOGOUT); } catch (error) { if ([401,409].includes(error.status)) localStorage.removeItem(PENDING_LOGOUT); }
      finally { if (revision === this.revision) setAuthSession(); }
    },
  },
});
