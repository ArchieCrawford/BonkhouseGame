import * as THREE from 'three';
import { Player } from './Player.js';
import { Enemy } from './Enemy.js';
import { Projectile } from './Projectile.js';
import { Particle } from './Particle.js';
import { PowerUp } from './PowerUp.js';
import { Lane } from './Lane.js';
import { ObjectPool } from './ObjectPool.js';
import { AudioManager } from './AudioManager.js';
import { UpgradeSystem } from './UpgradeSystem.js';
import { AtmosphericEffects } from './AtmosphericEffects.js';
import { CONFIG } from './config.js';
import * as farcaster from "https://esm.sh/@farcaster/miniapp-sdk";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const farcasterSdk = farcaster.sdk || farcaster.default || farcaster;
const farcasterActions = farcasterSdk.actions || farcaster.actions;
const farcasterContext = farcasterSdk.context || farcaster.context;
let pendingFarcasterContext = null;
let gameSettingsReady = false;

// Supabase config
// Note: a plain `.env` file is not automatically readable from browser JS.
// For local dev you can serve a `.env` file and we'll parse it here. For production,
// prefer injecting `window.__ENV = { YOUR_SUPABASE_URL, YOUR_SUPABASE_ANON_KEY }`.
const isSupabasePlaceholder = (value) => {
  if (typeof value !== 'string') return true;
  const trimmed = value.trim();
  return !trimmed || trimmed.includes('YOUR_SUPABASE');
};

const parseDotEnvText = (text) => {
  const out = {};
  if (typeof text !== 'string') return out;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
};

const applySupabaseRuntimeConfig = async () => {
  // 1) window-injected env (recommended for production)
  const injected = window.__ENV || window.ENV || null;
  if (injected && typeof injected === 'object') {
    if (typeof injected.YOUR_SUPABASE_URL === 'string' && injected.YOUR_SUPABASE_URL.trim()) {
      CONFIG.SUPABASE_URL = injected.YOUR_SUPABASE_URL.trim();
    }
    if (typeof injected.YOUR_SUPABASE_ANON_KEY === 'string' && injected.YOUR_SUPABASE_ANON_KEY.trim()) {
      CONFIG.SUPABASE_ANON_KEY = injected.YOUR_SUPABASE_ANON_KEY.trim();
    }
  }

  // 2) served .env file (handy for local dev)
  if (isSupabasePlaceholder(CONFIG.SUPABASE_URL) || isSupabasePlaceholder(CONFIG.SUPABASE_ANON_KEY)) {
    try {
      const res = await fetch('./.env', { cache: 'no-store' });
      if (res.ok) {
        const envText = await res.text();
        const env = parseDotEnvText(envText);
        if (typeof env.YOUR_SUPABASE_URL === 'string' && env.YOUR_SUPABASE_URL.trim()) {
          CONFIG.SUPABASE_URL = env.YOUR_SUPABASE_URL.trim();
        }
        if (typeof env.YOUR_SUPABASE_ANON_KEY === 'string' && env.YOUR_SUPABASE_ANON_KEY.trim()) {
          CONFIG.SUPABASE_ANON_KEY = env.YOUR_SUPABASE_ANON_KEY.trim();
        }
      }
    } catch (_) {
      // ignore
    }
  }
};

await applySupabaseRuntimeConfig();

const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY;
const supabaseEnabled = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !isSupabasePlaceholder(SUPABASE_URL) &&
  !isSupabasePlaceholder(SUPABASE_ANON_KEY)
);
const supabase = supabaseEnabled ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const TIP_RECIPIENT_SOL = 'DbX8NV1SZdWzYLDoexVLXUd8pZZ6fSx4CeusLPdvk8VP';
const TIP_RECIPIENT_EVM = '0x21cB408a394b24153b8164bdb09F508f741737c0';
const TIP_AMOUNTS = [1, 5, 10];
const USDC_DECIMALS = 6n;
const USDC_CONTRACTS = {
  '0x1': { label: 'Ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  '0xa': { label: 'Optimism', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
  '0x2105': { label: 'Base', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' }
};

const signalFarcasterReady = () => {
  const readyFn = farcasterActions?.ready || farcasterSdk?.actions?.ready;
  if (typeof readyFn !== "function") return;
  try {
    const result = readyFn();
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }
  } catch (err) {
    console.warn("Farcaster ready() failed:", err);
  }
};

const getOrCreateGuestId = () => {
  let guestId = localStorage.getItem('bonkhouseGuestId');
  if (!guestId) {
    guestId = `guest-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('bonkhouseGuestId', guestId);
  }
  return guestId;
};

const extractFarcasterUser = (ctx) => {
  if (!ctx) return null;
  return (
    ctx.user ||
    ctx.context?.user ||
    ctx.client?.user ||
    ctx.userContext?.user ||
    null
  );
};

const getDisplayName = () => gameSettings.playerName || gameSettings.playerDisplayName || 'Player';

const logProgressEvent = (eventName, eventData = {}) => {
  if (!window.ProgressLogger || typeof window.ProgressLogger.logProgress !== 'function') return;
  try {
    window.ProgressLogger.logProgress(eventName, eventData);
  } catch (err) {
    console.warn('ProgressLogger failed:', err);
  }
};

const normalizeWalletAddress = (address) => (address ? address.toLowerCase() : null);

const getDeviceLabel = () => {
  const ua = navigator.userAgent || '';
  return /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop';
};

const getSelectedCharacterId = () => characterStore?.selectedCharacter || 'bonkhouse';

const getGameVersion = () => CONFIG.GAME_VERSION || null;

const recordSessionStartRemote = async ({ wallet }) => {
  if (!supabase || !wallet) return null;
  const payload = {
    wallet: normalizeWalletAddress(wallet),
    game_version: getGameVersion(),
    character_id: getSelectedCharacterId(),
    device: getDeviceLabel(),
    referrer: document.referrer || null
  };
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert([payload])
      .select('id')
      .single();
    if (error) {
      console.warn('Supabase session start failed:', error);
      return null;
    }
    return data?.id || null;
  } catch (err) {
    console.warn('Supabase session start failed:', err);
    return null;
  }
};

const recordSessionEndRemote = async ({ sessionId, durationMs }) => {
  if (!supabase || !sessionId) return;
  try {
    const { error } = await supabase
      .from('sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_ms: durationMs || null
      })
      .eq('id', sessionId);
    if (error) {
      console.warn('Supabase session end failed:', error);
    }
  } catch (err) {
    console.warn('Supabase session end failed:', err);
  }
};

const saveScoreRemote = async ({ wallet, score, wave, durationMs, sessionId }) => {
  if (!supabase || !wallet) return;
  const payload = {
    wallet: normalizeWalletAddress(wallet),
    score,
    wave: wave ?? null,
    character_id: getSelectedCharacterId(),
    duration_ms: durationMs ?? null,
    session_id: sessionId || null,
    signature: null
  };
  try {
    const { error } = await supabase.from('scores').insert([payload]);
    if (error) {
      console.warn('Supabase score save failed:', error);
    }
  } catch (err) {
    console.warn('Supabase score save failed:', err);
  }
};

const fetchLeaderboardRemote = async (limit = 50) => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('leaderboard_top')
      .select('*')
      .limit(limit);
    if (error) {
      console.warn('Supabase leaderboard fetch failed:', error);
      return null;
    }
    return data || [];
  } catch (err) {
    console.warn('Supabase leaderboard fetch failed:', err);
    return null;
  }
};

const getPlayerStats = () => {
  const saved = localStorage.getItem('bonkhousePlayerStats');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        players: parsed.players || {},
        sessions: parsed.sessions || 0,
        totalCoins: parsed.totalCoins || 0,
        totalTime: parsed.totalTime || 0
      };
    } catch (err) {
      console.warn('Failed to parse player stats:', err);
    }
  }
  return { players: {}, sessions: 0, totalCoins: 0, totalTime: 0 };
};

const savePlayerStats = (stats) => {
  localStorage.setItem('bonkhousePlayerStats', JSON.stringify(stats));
};

const recordWalletStats = (address) => {
  if (!address) return;
  const stats = getPlayerStats();
  if (!stats.players[address]) {
    stats.players[address] = {
      sessions: 0,
      totalCoins: 0,
      totalTime: 0,
      bestTime: 0,
      bestWave: 0
    };
  }
  savePlayerStats(stats);
};

let activeSessionId = null;
let activeSupabaseSessionId = null;

const recordSessionStart = async () => {
  if (activeSessionId) return;
  activeSessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  activeSupabaseSessionId = null;
  const stats = getPlayerStats();
  stats.sessions += 1;
  const walletAddress = gameSettings.walletAddress;
  if (walletAddress) {
    if (!stats.players[walletAddress]) {
      stats.players[walletAddress] = {
        sessions: 0,
        totalCoins: 0,
        totalTime: 0,
        bestTime: 0,
        bestWave: 0
      };
    }
    stats.players[walletAddress].sessions += 1;
  }
  savePlayerStats(stats);
  logProgressEvent('session_start', {
    sessionId: activeSessionId,
    walletAddress,
    walletChainId: gameSettings.walletChainId,
    walletSource: gameSettings.walletSource,
    identitySource: gameSettings.identitySource
  });
  activeSupabaseSessionId = await recordSessionStartRemote({ wallet: walletAddress });
};

const recordSessionEnd = async (score) => {
  if (!activeSessionId) return;
  const stats = getPlayerStats();
  const coins = score?.coins || 0;
  const time = score?.time || 0;
  const wave = score?.wave || 0;
  stats.totalCoins += coins;
  stats.totalTime += time;
  const walletAddress = gameSettings.walletAddress;
  if (walletAddress) {
    if (!stats.players[walletAddress]) {
      stats.players[walletAddress] = {
        sessions: 0,
        totalCoins: 0,
        totalTime: 0,
        bestTime: 0,
        bestWave: 0
      };
    }
    stats.players[walletAddress].totalCoins += coins;
    stats.players[walletAddress].totalTime += time;
    stats.players[walletAddress].bestTime = Math.max(stats.players[walletAddress].bestTime || 0, time);
    stats.players[walletAddress].bestWave = Math.max(stats.players[walletAddress].bestWave || 0, wave);
  }
  savePlayerStats(stats);
  logProgressEvent('session_end', {
    sessionId: activeSessionId,
    walletAddress,
    walletChainId: gameSettings.walletChainId,
    walletSource: gameSettings.walletSource,
    wave,
    time,
    coins
  });
  const durationMs = time ? Math.round(time * 1000) : null;
  if (activeSupabaseSessionId) {
    await recordSessionEndRemote({ sessionId: activeSupabaseSessionId, durationMs });
  }
  activeSessionId = null;
  activeSupabaseSessionId = null;
};

const getScoreHistory = () => {
  const saved = localStorage.getItem('bonkhouseScoreHistory');
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch (err) {
    console.warn('Failed to parse score history:', err);
    return [];
  }
};

const saveScoreHistory = (score) => {
  const history = getScoreHistory();
  history.push(score);
  const trimmed = history.slice(-100);
  localStorage.setItem('bonkhouseScoreHistory', JSON.stringify(trimmed));
};

const updateIdentityUI = () => {
  const displayName = getDisplayName();
  if (menuUserNameEl) {
    menuUserNameEl.textContent = displayName;
  }
  if (hudUserNameEl) {
    hudUserNameEl.textContent = displayName;
  }
  if (leaderboardUserNameEl) {
    leaderboardUserNameEl.textContent = displayName;
  }
};

const updateWalletIdentity = (address, chainId, source = 'wallet') => {
  gameSettings.walletAddress = address;
  gameSettings.walletChainId = chainId;
  gameSettings.walletSource = source;
  recordWalletStats(address);
  logProgressEvent('wallet_connected', {
    walletAddress: address,
    walletChainId: chainId,
    walletSource: source
  });
  saveSettings();
};

const applyFarcasterIdentity = (ctx) => {
  const user = extractFarcasterUser(ctx);
  const fid = user?.fid ?? user?.id ?? null;
  if (fid === null || fid === undefined) return false;
  
  const username = user.username || user.displayName || `fid-${fid}`;
  const displayName = user.displayName || user.username || `FID ${fid}`;
  
  gameSettings.playerName = username;
  gameSettings.playerId = `fid:${fid}`;
  gameSettings.playerFid = fid;
  gameSettings.playerDisplayName = displayName;
  gameSettings.playerPfpUrl = user.pfpUrl || user.pfp_url || null;
  gameSettings.identitySource = 'farcaster';
  
  if (playerNameInputEl) {
    playerNameInputEl.value = username;
    playerNameInputEl.readOnly = true;
    playerNameInputEl.title = 'Linked to Farcaster identity';
  }
  
  saveSettings();
  return true;
};

const ensureGuestIdentity = () => {
  const hasFarcasterContext = Boolean(pendingFarcasterContext || window.farcasterContext);
  if (gameSettings.identitySource === 'farcaster' && hasFarcasterContext) return;
  
  const guestId = gameSettings.playerId || getOrCreateGuestId();
  if (!gameSettings.playerName || gameSettings.playerName === 'Player') {
    gameSettings.playerName = `Guest${guestId.slice(-4).toUpperCase()}`;
  }
  
  gameSettings.playerId = guestId;
  gameSettings.identitySource = 'guest';
  
  if (playerNameInputEl) {
    playerNameInputEl.value = gameSettings.playerName;
    playerNameInputEl.readOnly = false;
    playerNameInputEl.removeAttribute('title');
  }
  updateIdentityUI();
};

const storeFarcasterContext = (ctx) => {
  if (ctx) {
    window.farcasterContext = ctx;
    pendingFarcasterContext = ctx;
    if (gameSettingsReady) {
      applyFarcasterIdentity(ctx);
    }
  }
};

const showTipToast = (message) => {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    color: #FFD700;
    padding: 12px 20px;
    border: 2px solid #FFD700;
    border-radius: 8px;
    font-size: 14px;
    font-family: 'Orbitron', sans-serif;
    z-index: 11000;
    text-align: center;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2000);
};

const getTipOptions = () => [
  { label: 'USDC (SOL)', address: TIP_RECIPIENT_SOL },
  { label: 'USDC (ETH)', address: TIP_RECIPIENT_EVM }
]
  .map((option) => ({ ...option, address: option.address.trim() }))
  .filter((option) => option.address.length > 0);

let tipOverlayEl = null;

const isValidEvmAddress = (address) => /^0x[0-9a-fA-F]{40}$/.test(address);

const encodeErc20Transfer = (recipient, amount) => {
  const cleanRecipient = recipient.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const amountHex = amount.toString(16).padStart(64, '0');
  return `0xa9059cbb${cleanRecipient}${amountHex}`;
};

const normalizeChainId = (chainId) => {
  if (typeof chainId === 'number') {
    return `0x${chainId.toString(16)}`;
  }
  if (typeof chainId === 'string') {
    return chainId.startsWith('0x') ? chainId : `0x${parseInt(chainId, 10).toString(16)}`;
  }
  return null;
};

const getFarcasterWalletProvider = async () => {
  const wallet = farcasterSdk?.wallet || farcasterSdk?.actions?.wallet || farcasterActions?.wallet;
  const candidates = [
    wallet?.getEthereumProvider?.(),
    wallet?.getProvider?.(),
    wallet?.ethereumProvider,
    farcasterSdk?.getEthereumProvider?.()
  ];
  
  for (const candidate of candidates) {
    if (!candidate) continue;
    const provider = await Promise.resolve(candidate);
    if (provider?.request) {
      return provider;
    }
  }
  
  return null;
};

const getInjectedWalletProvider = () => {
  if (!window.ethereum) return null;
  if (Array.isArray(window.ethereum.providers) && window.ethereum.providers.length > 0) {
    return window.ethereum.providers.find((provider) => provider?.isMetaMask) || window.ethereum.providers[0];
  }
  return window.ethereum;
};

const getWalletProvider = async () => {
  const farcasterProvider = await getFarcasterWalletProvider();
  if (farcasterProvider) return { provider: farcasterProvider, source: 'farcaster' };
  const injectedProvider = getInjectedWalletProvider();
  if (injectedProvider?.request) return { provider: injectedProvider, source: 'injected' };
  return null;
};

const refreshWalletIdentity = async (forcePrompt = false) => {
  const walletInfo = await getWalletProvider();
  if (!walletInfo) {
    if (forcePrompt) {
      showTipToast('No wallet provider detected.');
    }
    return false;
  }
  const { provider, source } = walletInfo;
  
  let accounts = [];
  try {
    const method = forcePrompt ? 'eth_requestAccounts' : 'eth_accounts';
    accounts = await provider.request({ method });
  } catch (err) {
    if (forcePrompt) {
      showTipToast('Wallet connection cancelled.');
    }
    return false;
  }
  
  const address = accounts?.[0];
  if (!address) {
    if (forcePrompt) {
      showTipToast('Wallet not connected.');
    }
    return false;
  }
  
  let chainId = null;
  try {
    chainId = normalizeChainId(await provider.request({ method: 'eth_chainId' }));
  } catch (err) {
    console.warn('Unable to read chainId for wallet identity:', err);
  }
  
  updateWalletIdentity(address, chainId, source);
  return true;
};

const ensureWalletConnection = async () => {
  const refreshed = await refreshWalletIdentity(false);
  if (refreshed) return true;
  return refreshWalletIdentity(true);
};

const sendUsdcTip = async (provider, amount) => {
  if (!isValidEvmAddress(TIP_RECIPIENT_EVM)) {
    showTipToast('Tip wallet not set yet.');
    return;
  }
  
  let chainId = null;
  try {
    chainId = normalizeChainId(await provider.request({ method: 'eth_chainId' }));
  } catch (err) {
    console.warn('Unable to read chainId for tips:', err);
  }
  
  const contract = USDC_CONTRACTS[chainId];
  if (!contract) {
    showTipToast('Switch wallet to Ethereum, Base, or Optimism for USDC tips.');
    return;
  }
  
  let from = null;
  try {
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    from = accounts?.[0] || null;
  } catch (err) {
    showTipToast('Wallet connection cancelled.');
    return;
  }
  
  if (!from) {
    showTipToast('Wallet not connected.');
    return;
  }
  
  const amountBaseUnits = BigInt(amount) * (10n ** USDC_DECIMALS);
  const data = encodeErc20Transfer(TIP_RECIPIENT_EVM, amountBaseUnits);
  const tx = {
    from,
    to: contract.address,
    data,
    value: '0x0'
  };
  
  try {
    await provider.request({ method: 'eth_sendTransaction', params: [tx] });
    showTipToast(`Tip sent: ${amount} USDC`);
  } catch (err) {
    console.warn('Tip transaction failed:', err);
    showTipToast('Tip cancelled.');
  }
};

const copyTipAddress = (option) => {
  const fallbackMessage = `Send ${option.label} to ${option.address}`;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(option.address).then(
      () => showTipToast(`${option.label} address copied.`),
      () => showTipToast(fallbackMessage)
    );
  } else {
    showTipToast(fallbackMessage);
  }
};

const closeTipOverlay = () => {
  if (tipOverlayEl) {
    tipOverlayEl.remove();
    tipOverlayEl = null;
  }
};

const showTipMenu = (titleText, actions) => {
  closeTipOverlay();
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 12000;
  `;
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeTipOverlay();
    }
  });

  const panel = document.createElement('div');
  panel.style.cssText = `
    background: rgba(0, 0, 0, 0.85);
    border: 3px solid #FFD700;
    border-radius: 16px;
    padding: 30px 40px;
    text-align: center;
    min-width: 260px;
    max-width: 90vw;
  `;

  const title = document.createElement('div');
  title.textContent = titleText;
  title.style.cssText = `
    font-size: 24px;
    color: #FFD700;
    font-family: 'Orbitron', sans-serif;
    margin-bottom: 16px;
  `;
  panel.appendChild(title);

  actions.forEach((action) => {
    const button = document.createElement('button');
    button.className = 'menu-btn secondary';
    button.textContent = action.label;
    button.style.width = '100%';
    button.addEventListener('click', async () => {
      closeTipOverlay();
      await action.onClick();
    });
    panel.appendChild(button);
  });

  const closeButton = document.createElement('button');
  closeButton.className = 'menu-btn secondary';
  closeButton.textContent = 'CLOSE';
  closeButton.style.width = '100%';
  closeButton.addEventListener('click', closeTipOverlay);
  panel.appendChild(closeButton);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  tipOverlayEl = overlay;
};

const showTipWalletMenu = (provider) => {
  const actions = TIP_AMOUNTS.map((amount) => ({
    label: `TIP ${amount} USDC`,
    onClick: () => sendUsdcTip(provider, amount)
  }));
  
  showTipMenu('TIP USDC (FARCASTER WALLET)', actions);
};

const showTipCopyMenu = (options) => {
  const actions = options.map((option) => ({
    label: `COPY ${option.label}`,
    onClick: () => copyTipAddress(option)
  }));
  showTipMenu('COPY TIP ADDRESS', actions);
};

const handleTipClick = async () => {
  const walletInfo = await getWalletProvider();
  if (walletInfo?.provider) {
    showTipWalletMenu(walletInfo.provider);
    return;
  }
  
  const options = getTipOptions();
  if (!options.length) {
    showTipToast('Tip wallet not set yet.');
    return;
  }
  showTipCopyMenu(options);
};

signalFarcasterReady();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", signalFarcasterReady, { once: true });
}
window.addEventListener("load", signalFarcasterReady, { once: true });

if (farcasterContext) {
  if (typeof farcasterContext.get === "function") {
    farcasterContext.get().then(storeFarcasterContext).catch(() => {});
  } else if (typeof farcasterContext.watch === "function") {
    farcasterContext.watch(storeFarcasterContext);
  } else {
    storeFarcasterContext(farcasterContext);
  }
}

refreshWalletIdentity(false);


// Scene setup
const scene = new THREE.Scene();

// Create realistic daytime sky with gradient
const skyColor = new THREE.Color(0x87ceeb); // Light blue sky
const horizonColor = new THREE.Color(0xb8d4e8); // Lighter horizon
scene.background = skyColor;
scene.fog = new THREE.Fog(horizonColor, 40, 120); // Atmospheric haze

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
// Camera positioned to clearly show the player and lane ahead
camera.position.set(0, 14, 8);
camera.lookAt(0, 0, -15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// Create sky dome with clouds
function createSky() {
  const skyGeometry = new THREE.SphereGeometry(500, 32, 15);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x4a90e2) },
      bottomColor: { value: new THREE.Color(0xb8d4e8) },
      offset: { value: 33 },
      exponent: { value: 0.6 }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide
  });
  
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);
  
  // Add simple clouds
  const cloudGroup = new THREE.Group();
  const cloudGeometry = new THREE.SphereGeometry(8, 8, 8);
  const cloudMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6
  });
  
  // Create scattered clouds
  for (let i = 0; i < 15; i++) {
    const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloud.position.set(
      (Math.random() - 0.5) * 200,
      30 + Math.random() * 40,
      -80 - Math.random() * 100
    );
    cloud.scale.set(
      1 + Math.random() * 2,
      0.5 + Math.random() * 0.5,
      1 + Math.random() * 2
    );
    cloudGroup.add(cloud);
  }
  
  scene.add(cloudGroup);
  return cloudGroup;
}

const clouds = createSky();

// UNIFIED LIGHTING SYSTEM - Premium daytime lighting
// Main sunlight - positioned to match sky
const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.8); // Warm daylight
sunLight.position.set(30, 50, 20); // High angle like mid-morning sun
sunLight.castShadow = true;

// Shadow configuration for quality
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 200;
sunLight.shadow.camera.left = -50;
sunLight.shadow.camera.right = 50;
sunLight.shadow.camera.top = 50;
sunLight.shadow.camera.bottom = -50;
sunLight.shadow.bias = -0.0001;

scene.add(sunLight);

// Ambient light - soft skylight
const ambientLight = new THREE.AmbientLight(0xb8d4e8, 0.6); // Cool ambient from sky
scene.add(ambientLight);

// Hemisphere light for natural sky/ground color variation
const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x6b8cae, 0.5);
scene.add(hemiLight);

// Subtle fill light to soften shadows
const fillLight = new THREE.DirectionalLight(0x9ec5d9, 0.3);
fillLight.position.set(-20, 15, -10);
scene.add(fillLight);

// Warm highlights on player (hero lighting)
const heroLight = new THREE.SpotLight(0xffd89b, 1.2, 30, Math.PI / 5, 0.4);
heroLight.position.set(0, 15, 0);
heroLight.target.position.set(0, 0, -5);
heroLight.castShadow = false; // Don't need shadows from this one
scene.add(heroLight);
scene.add(heroLight.target);

// Cool accent light on enemies (visual distinction)
const enemyLight = new THREE.PointLight(0x8b9dc3, 0.8, 40);
enemyLight.position.set(0, 5, -40);
scene.add(enemyLight);

// Audio
const audio = new AudioManager();

// Upgrade system
const upgradeSystem = new UpgradeSystem();

// Game objects
const lane = new Lane(scene);
const player = new Player(scene);
const atmosphere = new AtmosphericEffects(scene);

// Object pools
const bulletPool = new ObjectPool(scene, Projectile, CONFIG.MAX_BULLETS);
const enemyPool = new ObjectPool(scene, Enemy, CONFIG.MAX_ENEMIES);
const particlePool = new ObjectPool(scene, Particle, CONFIG.MAX_PARTICLES);
const powerUpPool = new ObjectPool(scene, PowerUp, CONFIG.MAX_POWERUPS);

// Game state
let gameState = {
  wave: 1,
  coins: 0,
  enemiesSpawnedThisWave: 0,
  enemiesKilledThisWave: 0,
  waveInProgress: false,
  waveStartDelay: 0,
  isPaused: false,
  isGameOver: false,
  cameraShake: 0,
  bossSpawned: false,
  survivalTime: 0,
  gameStartTime: 0,
  powerUpSpawnTimer: 0,
  lastEnemySeenTime: 0,
  lastEnemySpawnTime: 0
};

// UI elements
const playerHPEl = document.getElementById('playerHP');
const playerHealthFillEl = document.getElementById('playerHealthFill');
const coinsEl = document.getElementById('coins');
const waveEl = document.getElementById('wave');
const startWaveBtn = document.getElementById('startWaveBtn');
const pauseBtn = document.getElementById('pauseBtn');
const muteBtn = document.getElementById('muteBtn');
const musicBtn = document.getElementById('musicBtn');
const moveLeftBtn = document.getElementById('moveLeftBtn');
const moveRightBtn = document.getElementById('moveRightBtn');
const fireBtn = document.getElementById('fireBtn');
const resumeBtn = document.getElementById('resumeBtn');
const restartBtn = document.getElementById('restartBtn');
const restartFromPauseBtn = document.getElementById('restartFromPauseBtn');
const gameOverEl = document.getElementById('gameOver');
const pauseMenuEl = document.getElementById('pauseMenu');
const finalWaveEl = document.getElementById('finalWave');
const finalCoinsEl = document.getElementById('finalCoins');
const debugInfoEl = document.getElementById('debugInfo');
const debugPlayerPosEl = document.getElementById('debugPlayerPos');
const debugCameraPosEl = document.getElementById('debugCameraPos');
const debugEnemiesEl = document.getElementById('debugEnemies');
const debugBulletsEl = document.getElementById('debugBullets');
const loadingScreenEl = document.getElementById('loadingScreen');
const loadingBarFillEl = document.getElementById('loadingBarFill');
const loadingPercentEl = document.getElementById('loadingPercent');
const loadingTipEl = document.getElementById('loadingTip');
const mainMenuEl = document.getElementById('mainMenu');
const playBtnEl = document.getElementById('playBtn');
const settingsBtnEl = document.getElementById('settingsBtn');
const leaderboardBtnEl = document.getElementById('leaderboardBtn');
const settingsMenuEl = document.getElementById('settingsMenu');
const leaderboardMenuEl = document.getElementById('leaderboardMenu');
const storeMenuEl = document.getElementById('storeMenu');
const storeBtnEl = document.getElementById('storeBtn');
const storeCoinsEl = document.getElementById('storeCoins');
const characterGridEl = document.getElementById('characterGrid');
const coinPackagesGridEl = document.getElementById('coinPackagesGrid');
const charactersTabBtnEl = document.getElementById('charactersTabBtn');
const coinsTabBtnEl = document.getElementById('coinsTabBtn');
const charactersTabEl = document.getElementById('charactersTab');
const coinsTabEl = document.getElementById('coinsTab');
const backFromStoreBtn = document.getElementById('backFromStoreBtn');
const playerNameInputEl = document.getElementById('playerNameInput');
const saveSettingsBtnEl = document.getElementById('saveSettingsBtn');
const backFromSettingsBtnEl = document.getElementById('backFromSettingsBtn');
const backFromLeaderboardBtnEl = document.getElementById('backFromLeaderboardBtn');
const leaderboardListEl = document.getElementById('leaderboardList');
const menuUserNameEl = document.getElementById('menuUserName');
const hudUserNameEl = document.getElementById('hudUserName');
const leaderboardUserNameEl = document.getElementById('leaderboardUserName');
const tipBtnEl = document.getElementById('tipBtn');
const menuTipBtnEl = document.getElementById('menuTipBtn');
const finalTimeEl = document.getElementById('finalTime');
const newHighScoreMsgEl = document.getElementById('newHighScoreMsg');
const waveBannerEl = document.getElementById('waveBanner');
const powerUpIndicatorEl = document.getElementById('powerUpIndicator');
const powerUpNameEl = document.getElementById('powerUpName');
const powerUpTimerEl = document.getElementById('powerUpTimer');
const upgradesMenuEl = document.getElementById('upgradesMenu');
const upgradesCoinsAmountEl = document.getElementById('upgradesCoinsAmount');
const upgradesListEl = document.getElementById('upgradesList');
const closeUpgradesBtnEl = document.getElementById('closeUpgradesBtn');

// Settings and Profile System
let gameSettings = {
  playerName: 'Player',
  playerId: null,
  playerFid: null,
  playerDisplayName: null,
  playerPfpUrl: null,
  identitySource: 'guest',
  walletAddress: null,
  walletChainId: null,
  walletSource: null,
  difficulty: 'medium',
  totalCoins: 0 // Lifetime coins for store purchases
};

let difficultyMultipliers = {
  easy: 0.7,
  medium: 1.0,
  hard: 1.4
};

// Character Store System
let characterStore = {
  characters: [
    {
      id: 'bonkhouse',
      name: 'Bonkhouse',
      icon: '🏠',
      price: 0,
      owned: true,
      glbUrl: 'https://rosebud.ai/assets/Meshy_Merged_Animations.glb?wfmY'
    },
    {
      id: 'lc',
      name: 'LC',
      icon: '<img src="assets/Character/LC.png" alt="LC" loading="lazy">',
      price: 3500,
      owned: false,
      glbUrl: null
    },
    {
      id: 'warrior',
      name: 'Warrior Dog',
      icon: '⚔️',
      price: 500,
      owned: false,
      glbUrl: null // Will be added later
    },
    {
      id: 'mage',
      name: 'Wizard Dog',
      icon: '🧙',
      price: 1000,
      owned: false,
      glbUrl: null
    },
    {
      id: 'ninja',
      name: 'Ninja Dog',
      icon: '🥷',
      price: 1500,
      owned: false,
      glbUrl: null
    },
    {
      id: 'robot',
      name: 'Robo Dog',
      icon: '🤖',
      price: 2000,
      owned: false,
      glbUrl: null
    },
    {
      id: 'dragon',
      name: 'Dragon Dog',
      icon: '🐉',
      price: 3000,
      owned: false,
      glbUrl: null
    }
  ],
  selectedCharacter: 'bonkhouse',
  coinPackages: [
    {
      id: 'starter',
      name: 'Starter Pack',
      icon: '💰',
      coins: 100,
      price: '$0.99',
      bonus: null
    },
    {
      id: 'bronze',
      name: 'Bronze Pack',
      icon: '💵',
      coins: 250,
      price: '$1.99',
      bonus: '+50 BONUS'
    },
    {
      id: 'silver',
      name: 'Silver Pack',
      icon: '💸',
      coins: 600,
      price: '$4.99',
      bonus: '+100 BONUS',
      popular: true
    },
    {
      id: 'gold',
      name: 'Gold Pack',
      icon: '💎',
      coins: 1500,
      price: '$9.99',
      bonus: '+300 BONUS'
    },
    {
      id: 'platinum',
      name: 'Platinum Pack',
      icon: '👑',
      coins: 3500,
      price: '$19.99',
      bonus: '+1000 BONUS'
    },
    {
      id: 'mega',
      name: 'Mega Pack',
      icon: '🌟',
      coins: 10000,
      price: '$49.99',
      bonus: '+5000 BONUS'
    }
  ]
};

function loadCharacterStore() {
  const saved = localStorage.getItem('bonkhouseCharacterStore');
  if (saved) {
    const savedData = JSON.parse(saved);
    characterStore.selectedCharacter = savedData.selectedCharacter || 'bonkhouse';
    // Merge owned status
    savedData.characters?.forEach(savedChar => {
      const char = characterStore.characters.find(c => c.id === savedChar.id);
      if (char) {
        char.owned = savedChar.owned;
      }
    });
  }
}

function saveCharacterStore() {
  const saveData = {
    selectedCharacter: characterStore.selectedCharacter,
    characters: characterStore.characters.map(c => ({
      id: c.id,
      owned: c.owned
    }))
  };
  localStorage.setItem('bonkhouseCharacterStore', JSON.stringify(saveData));
}

function displayCharacterStore() {
  storeCoinsEl.textContent = gameSettings.totalCoins;
  characterGridEl.innerHTML = '';
  
  characterStore.characters.forEach(character => {
    const card = document.createElement('div');
    card.className = 'character-card';
    if (character.owned) card.classList.add('owned');
    if (character.id === characterStore.selectedCharacter) card.classList.add('selected');
    if (!character.owned) card.classList.add('locked');
    
    const statusIcon = character.owned 
      ? `<div class="character-check">✓</div>`
      : `<div class="character-lock">🔒</div>`;
    
    const buttonHtml = character.owned
      ? (character.id === characterStore.selectedCharacter
        ? `<button class="character-btn selected-btn" disabled>SELECTED</button>`
        : `<button class="character-btn select-btn" onclick="selectCharacter('${character.id}')">SELECT</button>`)
      : `<button class="character-btn" onclick="buyCharacter('${character.id}')" ${gameSettings.totalCoins < character.price ? 'disabled' : ''}>
          ${gameSettings.totalCoins >= character.price ? 'BUY' : 'LOCKED'}
        </button>`;
    
    card.innerHTML = `
      ${statusIcon}
      <div class="character-icon">${character.icon}</div>
      <div class="character-name">${character.name}</div>
      ${!character.owned ? `<div class="character-price">💰 ${character.price} coins</div>` : ''}
      ${buttonHtml}
    `;
    
    characterGridEl.appendChild(card);
  });
}

window.buyCharacter = function(characterId) {
  const character = characterStore.characters.find(c => c.id === characterId);
  if (!character || character.owned) return;
  
  if (gameSettings.totalCoins >= character.price) {
    gameSettings.totalCoins -= character.price;
    character.owned = true;
    characterStore.selectedCharacter = characterId;
    
    saveCharacterStore();
    saveSettings();
    displayCharacterStore();
    
    // Play success sound (power-up pickup sound for purchase)
    audio.playPowerupPickup();
  }
};

window.selectCharacter = function(characterId) {
  const character = characterStore.characters.find(c => c.id === characterId);
  if (!character || !character.owned) return;
  
  characterStore.selectedCharacter = characterId;
  saveCharacterStore();
  displayCharacterStore();
  
  // Play selection sound
  audio.playHit();
};

function displayCoinPackages() {
  coinPackagesGridEl.innerHTML = '';
  
  characterStore.coinPackages.forEach(pkg => {
    const card = document.createElement('div');
    card.className = 'coin-package-card';
    if (pkg.popular) card.classList.add('popular');
    
    card.innerHTML = `
      <div class="coin-package-icon">${pkg.icon}</div>
      <div class="coin-package-amount">💰 ${pkg.coins.toLocaleString()} Coins</div>
      <div class="coin-package-price">${pkg.price}</div>
      ${pkg.bonus ? `<div class="coin-package-bonus">${pkg.bonus}</div>` : ''}
      <button class="buy-coins-btn" onclick="buyCoinPackage('${pkg.id}')">PURCHASE</button>
    `;
    
    coinPackagesGridEl.appendChild(card);
  });
}

window.buyCoinPackage = function(packageId) {
  const pkg = characterStore.coinPackages.find(p => p.id === packageId);
  if (!pkg) return;
  
  // Demo purchase - add coins immediately
  gameSettings.totalCoins += pkg.coins;
  saveSettings();
  
  // Update display
  storeCoinsEl.textContent = gameSettings.totalCoins;
  displayCharacterStore(); // Refresh character cards to update buy button states
  
  // Play success sound and show confirmation
  audio.playPowerupPickup();
  
  // Show visual feedback
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, rgba(46, 204, 113, 0.95), rgba(39, 174, 96, 0.95));
    color: white;
    padding: 30px 50px;
    border-radius: 15px;
    border: 3px solid #2ecc71;
    font-size: 24px;
    font-weight: bold;
    font-family: 'Orbitron', sans-serif;
    z-index: 10000;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    animation: purchasePopup 2s ease-out forwards;
  `;
  notification.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
    <div>Purchase Successful!</div>
    <div style="font-size: 32px; margin-top: 10px; color: #f1c40f;">+${pkg.coins.toLocaleString()} 💰</div>
  `;
  document.body.appendChild(notification);
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes purchasePopup {
      0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
      20% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
      80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  
  setTimeout(() => {
    document.body.removeChild(notification);
    document.head.removeChild(style);
  }, 2000);
};

// Load settings from localStorage
function loadSettings() {
  const saved = localStorage.getItem('bonkhouseSettings');
  if (saved) {
    const parsed = JSON.parse(saved);
    gameSettings = { ...gameSettings, ...parsed };
  }
  ensureGuestIdentity();
  playerNameInputEl.value = gameSettings.playerName;
  updateIdentityUI();
  updateDifficultyButtons();
}

function saveSettings() {
  const currentSettings = JSON.parse(localStorage.getItem('bonkhouseSettings') || '{}');
  const isFarcasterLocked = gameSettings.identitySource === 'farcaster';
  const inputName = playerNameInputEl.value.trim();
  
  if (!isFarcasterLocked) {
    gameSettings.playerName = inputName || gameSettings.playerName || 'Player';
  }
  
  gameSettings.playerId = gameSettings.playerId || currentSettings.playerId || getOrCreateGuestId();
  gameSettings.playerFid = gameSettings.playerFid || currentSettings.playerFid || null;
  gameSettings.playerDisplayName = gameSettings.playerDisplayName || currentSettings.playerDisplayName || null;
  gameSettings.playerPfpUrl = gameSettings.playerPfpUrl || currentSettings.playerPfpUrl || null;
  gameSettings.identitySource = gameSettings.identitySource || currentSettings.identitySource || 'guest';
  gameSettings.walletAddress = gameSettings.walletAddress || currentSettings.walletAddress || null;
  gameSettings.walletChainId = gameSettings.walletChainId || currentSettings.walletChainId || null;
  gameSettings.walletSource = gameSettings.walletSource || currentSettings.walletSource || null;
  gameSettings.totalCoins = currentSettings.totalCoins || gameSettings.totalCoins || 0;
  localStorage.setItem('bonkhouseSettings', JSON.stringify(gameSettings));
  updateIdentityUI();
}

function updateDifficultyButtons() {
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.difficulty === gameSettings.difficulty) {
      btn.classList.add('active');
    }
  });
}

// Leaderboard System
function saveHighScore(wave, time, coins) {
  const leaderboard = getLeaderboard();
  const walletAddress = gameSettings.walletAddress || null;
  const walletChainId = gameSettings.walletChainId || null;
  const playerId = walletAddress ? `wallet:${walletAddress}` : gameSettings.playerId;
  const scoreMs = Math.round(time * 1000);
  const score = {
    name: gameSettings.playerName,
    playerId,
    fid: gameSettings.playerFid,
    displayName: gameSettings.playerDisplayName,
    pfpUrl: gameSettings.playerPfpUrl,
    identitySource: gameSettings.identitySource,
    walletAddress,
    walletChainId,
    walletSource: gameSettings.walletSource,
    wave: wave,
    time: time,
    coins: coins,
    date: Date.now()
  };

  saveScoreHistory(score);
  logProgressEvent('score_saved', score);
  saveScoreRemote({
    wallet: walletAddress,
    score: scoreMs,
    wave,
    durationMs: scoreMs,
    sessionId: activeSupabaseSessionId
  });
  
  // Check if this is a new high score before adding
  const isNewHighScore = leaderboard.length === 0 || time > leaderboard[0].time;
  
  leaderboard.push(score);
  // Sort by time survived (descending)
  leaderboard.sort((a, b) => b.time - a.time);
  // Keep top 10
  const top10 = leaderboard.slice(0, 10);
  localStorage.setItem('bonkhouseLeaderboard', JSON.stringify(top10));
  
  return isNewHighScore;
}

function getLeaderboard() {
  const saved = localStorage.getItem('bonkhouseLeaderboard');
  return saved ? JSON.parse(saved) : [];
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function displayLeaderboard() {
  updateIdentityUI();
  leaderboardListEl.innerHTML = '<p style="text-align: center; color: #B0BEC5; padding: 20px;">Loading scores...</p>';
  let leaderboard = [];
  const remoteLeaderboard = await fetchLeaderboardRemote(50);
  if (remoteLeaderboard && remoteLeaderboard.length) {
    leaderboard = remoteLeaderboard.map((row) => ({
      name: row.wallet
        ? `${row.wallet.slice(0, 6)}...${row.wallet.slice(-4)}`
        : 'Player',
      wave: Number.isFinite(Number(row.best_wave)) ? Number(row.best_wave) : null,
      time: Number.isFinite(Number(row.best_score)) ? Number(row.best_score) / 1000 : 0
    }));
  } else {
    leaderboard = getLeaderboard();
  }
  leaderboardListEl.innerHTML = '';
  
  if (leaderboard.length === 0) {
    leaderboardListEl.innerHTML = '<p style="text-align: center; color: #B0BEC5; padding: 20px;">No scores yet. Be the first!</p>';
    return;
  }
  
  leaderboard.forEach((score, index) => {
    const entry = document.createElement('div');
    entry.className = 'leaderboard-entry' + (index < 3 ? ' top3' : '');
    
    const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    const walletLabel = score.walletAddress
      ? `${score.walletAddress.slice(0, 6)}...${score.walletAddress.slice(-4)}`
      : null;
    const displayName = score.name || score.displayName || walletLabel || 'Player';
    const waveLabel = score.wave ?? '-';
    
    entry.innerHTML = `
      <div class="leaderboard-rank">${rankEmoji}</div>
      <div class="leaderboard-name">${displayName}</div>
      <div class="leaderboard-score">Wave ${waveLabel}</div>
      <div class="leaderboard-time">${formatTime(score.time)}</div>
    `;
    leaderboardListEl.appendChild(entry);
  });
}

// Loading tips
const loadingTips = [
  "Bonkhouse never retreats.",
  "Eliminate enemies to earn upgrades.",
  "Stronger waves bring bigger rewards.",
  "Use movement to dodge incoming threats.",
  "The house on his back is his strength."
];

// Load settings and character store on startup
loadSettings();
loadCharacterStore();
gameSettingsReady = true;
if (pendingFarcasterContext) {
  applyFarcasterIdentity(pendingFarcasterContext);
}

// Loading screen sequence
let loadingProgress = 0;
const loadingInterval = setInterval(() => {
  loadingProgress += Math.random() * 15 + 5;
  if (loadingProgress >= 100) {
    loadingProgress = 100;
    clearInterval(loadingInterval);
    
    setTimeout(() => {
      loadingScreenEl.classList.add('hidden');
      setTimeout(() => {
        mainMenuEl.classList.add('show');
      }, 500);
    }, 500);
  }
  
  loadingBarFillEl.style.width = loadingProgress + '%';
  loadingPercentEl.textContent = `Loading... ${Math.floor(loadingProgress)}%`;
  
  // Rotate tips
  if (Math.random() < 0.3) {
    const randomTip = loadingTips[Math.floor(Math.random() * loadingTips.length)];
    loadingTipEl.textContent = randomTip;
  }
}, 200);

// Debug toggle (click top-left corner 5 times)
let debugClickCount = 0;
let debugClickTimer = null;
document.getElementById('topLeft').addEventListener('click', () => {
  debugClickCount++;
  clearTimeout(debugClickTimer);
  
  if (debugClickCount >= 5) {
    debugInfoEl.classList.toggle('show');
    debugClickCount = 0;
  }
  
  debugClickTimer = setTimeout(() => {
    debugClickCount = 0;
  }, 1000);
});

// Event listeners
playBtnEl.addEventListener('click', async () => {
  audio.init();
  const hasWallet = await ensureWalletConnection();
  if (!hasWallet) return;
  mainMenuEl.classList.remove('show');
  startWaveBtn.classList.add('show');
});

settingsBtnEl.addEventListener('click', () => {
  mainMenuEl.classList.remove('show');
  settingsMenuEl.style.display = 'flex';
});

leaderboardBtnEl.addEventListener('click', () => {
  mainMenuEl.classList.remove('show');
  displayLeaderboard();
  leaderboardMenuEl.style.display = 'flex';
});

storeBtnEl.addEventListener('click', () => {
  mainMenuEl.classList.remove('show');
  displayCharacterStore();
  displayCoinPackages();
  // Default to characters tab
  charactersTabEl.style.display = 'block';
  coinsTabEl.style.display = 'none';
  charactersTabBtnEl.classList.add('active');
  coinsTabBtnEl.classList.remove('active');
  storeMenuEl.style.display = 'flex';
});

backFromStoreBtn.addEventListener('click', () => {
  storeMenuEl.style.display = 'none';
  mainMenuEl.classList.add('show');
});

charactersTabBtnEl.addEventListener('click', () => {
  charactersTabEl.style.display = 'block';
  coinsTabEl.style.display = 'none';
  charactersTabBtnEl.classList.add('active');
  coinsTabBtnEl.classList.remove('active');
});

coinsTabBtnEl.addEventListener('click', () => {
  charactersTabEl.style.display = 'none';
  coinsTabEl.style.display = 'block';
  charactersTabBtnEl.classList.remove('active');
  coinsTabBtnEl.classList.add('active');
});

saveSettingsBtnEl.addEventListener('click', () => {
  saveSettings();
  settingsMenuEl.style.display = 'none';
  mainMenuEl.classList.add('show');
});

backFromSettingsBtnEl.addEventListener('click', () => {
  settingsMenuEl.style.display = 'none';
  mainMenuEl.classList.add('show');
});

backFromLeaderboardBtnEl.addEventListener('click', () => {
  leaderboardMenuEl.style.display = 'none';
  mainMenuEl.classList.add('show');
});

[
  tipBtnEl,
  menuTipBtnEl
].forEach((button) => {
  if (!button) return;
  button.addEventListener('click', handleTipClick);
});

// Difficulty button handlers
document.querySelectorAll('.difficulty-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    gameSettings.difficulty = btn.dataset.difficulty;
    updateDifficultyButtons();
  });
});

startWaveBtn.addEventListener('click', async () => {
  audio.init();
  const hasWallet = await ensureWalletConnection();
  if (!hasWallet) return;
  startWave();
});

pauseBtn.addEventListener('click', () => {
  togglePause();
});

muteBtn.addEventListener('click', () => {
  audio.init();
  const muted = audio.toggleMute();
  muteBtn.textContent = muted ? '🔇' : '🔊';
});

musicBtn.addEventListener('click', () => {
  audio.init();
  const musicMuted = audio.toggleMusicMute();
  musicBtn.textContent = musicMuted ? '🎵' : '🎶';
});

resumeBtn.addEventListener('click', () => {
  togglePause();
});

restartBtn.addEventListener('click', () => {
  restartGame();
});

restartFromPauseBtn.addEventListener('click', () => {
  gameState.isPaused = false;
  pauseMenuEl.classList.remove('show');
  restartGame();
});

closeUpgradesBtnEl.addEventListener('click', () => {
  upgradesMenuEl.classList.remove('show');
  startWave();
});

// Input handling
const input = {
  left: false,
  right: false,
  shoot: false, // Manual shooting trigger
  touchStartX: null,
  touchCurrentX: null
};

function bindHoldButton(button, onPress, onRelease) {
  if (!button) return;
  let activePointerId = null;
  
  const start = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (activePointerId !== null) return;
    activePointerId = e.pointerId;
    if (button.setPointerCapture) {
      button.setPointerCapture(activePointerId);
    }
    onPress();
  };
  
  const end = (e) => {
    if (activePointerId !== null && e.pointerId !== undefined && e.pointerId !== activePointerId) return;
    e.preventDefault();
    e.stopPropagation();
    activePointerId = null;
    onRelease();
  };
  
  button.addEventListener('pointerdown', start);
  button.addEventListener('pointerup', end);
  button.addEventListener('pointercancel', end);
  button.addEventListener('lostpointercapture', end);
  button.addEventListener('contextmenu', (e) => e.preventDefault());
}

bindHoldButton(
  moveLeftBtn,
  () => {
    input.left = true;
    input.touchStartX = null;
    input.touchCurrentX = null;
  },
  () => {
    input.left = false;
  }
);

bindHoldButton(
  moveRightBtn,
  () => {
    input.right = true;
    input.touchStartX = null;
    input.touchCurrentX = null;
  },
  () => {
    input.right = false;
  }
);

bindHoldButton(
  fireBtn,
  () => {
    input.shoot = true;
    input.touchStartX = null;
    input.touchCurrentX = null;
  },
  () => {
    input.shoot = false;
  }
);

// Keyboard controls
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    input.left = true;
  }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    input.right = true;
  }
  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault(); // Prevent page scroll
    input.shoot = true;
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    input.left = false;
  }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    input.right = false;
  }
  if (e.key === ' ' || e.key === 'Spacebar') {
    input.shoot = false;
  }
});

// Touch/mouse controls for movement and shooting
let touchStartTime = 0;
let touchMoved = false;

renderer.domElement.addEventListener('touchstart', (e) => {
  input.touchStartX = e.touches[0].clientX;
  input.touchCurrentX = e.touches[0].clientX;
  touchStartTime = Date.now();
  touchMoved = false;
});

renderer.domElement.addEventListener('touchmove', (e) => {
  if (input.touchStartX !== null) {
    const moved = Math.abs(e.touches[0].clientX - input.touchStartX);
    if (moved > 10) { // More than 10px = drag for movement
      touchMoved = true;
    }
    input.touchCurrentX = e.touches[0].clientX;
  }
});

renderer.domElement.addEventListener('touchend', (e) => {
  // If tap was quick and didn't move much, it's a shoot input
  const touchDuration = Date.now() - touchStartTime;
  if (!touchMoved && touchDuration < 300) {
    // Quick tap = shoot
    input.shoot = true;
    setTimeout(() => { input.shoot = false; }, 50); // Brief trigger
  }
  
  input.touchStartX = null;
  input.touchCurrentX = null;
  touchMoved = false;
});

// Mouse controls (for desktop)
let mouseDown = false;
let mouseStartTime = 0;
let mouseMoved = false;

renderer.domElement.addEventListener('mousedown', (e) => {
  mouseDown = true;
  input.touchStartX = e.clientX;
  input.touchCurrentX = e.clientX;
  mouseStartTime = Date.now();
  mouseMoved = false;
});

renderer.domElement.addEventListener('mousemove', (e) => {
  if (mouseDown) {
    const moved = Math.abs(e.clientX - input.touchStartX);
    if (moved > 10) { // More than 10px = drag for movement
      mouseMoved = true;
    }
    input.touchCurrentX = e.clientX;
  }
});

renderer.domElement.addEventListener('mouseup', (e) => {
  // If click was quick and didn't move much, it's a shoot input
  const clickDuration = Date.now() - mouseStartTime;
  if (!mouseMoved && clickDuration < 300) {
    // Quick click = shoot
    input.shoot = true;
    setTimeout(() => { input.shoot = false; }, 50); // Brief trigger
  }
  
  mouseDown = false;
  input.touchStartX = null;
  input.touchCurrentX = null;
  mouseMoved = false;
});

renderer.domElement.addEventListener('mouseleave', () => {
  mouseDown = false;
  input.touchStartX = null;
  input.touchCurrentX = null;
  mouseMoved = false;
});

// Window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Wave management
function getEnemiesForWave(wave) {
  return CONFIG.WAVE_1_ENEMIES + (wave - 1) * CONFIG.ENEMIES_INCREASE_PER_WAVE;
}

function getEnemySpeedForWave(wave) {
  return CONFIG.ENEMY_BASE_SPEED * (1 + (wave - 1) * CONFIG.ENEMY_SPEED_INCREASE_PER_WAVE);
}

function getEnemyHPForWave(wave) {
  return Math.ceil(CONFIG.ENEMY_BASE_HP * (1 + (wave - 1) * CONFIG.ENEMY_HP_INCREASE_PER_WAVE));
}

function startWave() {
  startWaveBtn.classList.remove('show');
  upgradesMenuEl.classList.remove('show');
  gameState.waveInProgress = true;
  gameState.enemiesSpawnedThisWave = 0;
  gameState.enemiesKilledThisWave = 0;
  gameState.bossSpawned = false; // Reset boss flag
  gameState.powerUpSpawnTimer = 0;
  gameState.spawnTimer = 0;
  const now = Date.now();
  gameState.lastEnemySeenTime = now;
  gameState.lastEnemySpawnTime = now;
  
  // Start time tracking on first wave
  if (gameState.wave === 1) {
    gameState.gameStartTime = Date.now();
    recordSessionStart();
    // Start background music
    audio.startMusic(gameState.wave);
  } else {
    // Update music intensity for new wave
    audio.updateMusicIntensity(gameState.wave);
  }
  
  // Show wave banner
  showWaveBanner();
}

function showUpgradesMenu() {
  upgradesCoinsAmountEl.textContent = gameState.coins;
  upgradesMenuEl.classList.add('show');
  renderUpgrades();
}

function renderUpgrades() {
  const upgrades = upgradeSystem.getAllUpgrades();
  upgradesListEl.innerHTML = '';
  
  upgrades.forEach(upgrade => {
    const upgradeDiv = document.createElement('div');
    upgradeDiv.className = 'upgrade-item';
    
    const isMaxLevel = upgrade.level >= upgrade.maxLevel;
    const canAfford = upgradeSystem.canAfford(upgrade.key, gameState.coins);
    
    let buttonHTML;
    if (isMaxLevel) {
      buttonHTML = '<button class="upgrade-btn max-level" disabled>MAX LEVEL</button>';
    } else {
      const buttonText = `BUY (${upgrade.currentCost} 💰)`;
      const disabled = !canAfford ? 'disabled' : '';
      buttonHTML = `<button class="upgrade-btn" ${disabled} data-upgrade="${upgrade.key}">${buttonText}</button>`;
    }
    
    upgradeDiv.innerHTML = `
      <div class="upgrade-header">
        <div class="upgrade-name">${upgrade.name}</div>
        <div class="upgrade-level">Lv ${upgrade.level}/${upgrade.maxLevel}</div>
      </div>
      <div class="upgrade-description">${upgrade.description}</div>
      <div class="upgrade-stats">
        <div class="upgrade-bonus">Current: ${formatBonus(upgrade.key, upgrade.currentBonus)}</div>
        ${!isMaxLevel ? `<div class="upgrade-next">Next: ${formatBonus(upgrade.key, upgrade.nextBonus)}</div>` : ''}
      </div>
      ${buttonHTML}
    `;
    
    upgradesListEl.appendChild(upgradeDiv);
    
    // Add event listener to buy button
    if (!isMaxLevel) {
      const buyBtn = upgradeDiv.querySelector('.upgrade-btn');
      buyBtn.addEventListener('click', () => purchaseUpgrade(upgrade.key));
    }
  });
}

function formatBonus(upgradeKey, value) {
  if (upgradeKey === 'fireRate') {
    const level = upgradeSystem.upgrades.fireRate.level;
    if (level === 0 && value === 0) {
      return 'Pistol (Manual)';
    } else if (level === 0) {
      return 'Auto-Fire + 20%';
    }
    return `+${Math.round(value * 100)}%`;
  } else if (upgradeKey === 'damage') {
    return `+${value} DMG`;
  } else if (upgradeKey === 'bulletSpeed') {
    return `+${value} SPD`;
  } else if (upgradeKey === 'maxHP') {
    return `+${value} HP`;
  }
  return value;
}

function purchaseUpgrade(upgradeKey) {
  const result = upgradeSystem.purchase(upgradeKey, gameState.coins);
  
  if (result.success) {
    gameState.coins -= result.cost;
    upgradesCoinsAmountEl.textContent = gameState.coins;
    coinsEl.textContent = gameState.coins;
    
    // Apply upgrade effects
    applyUpgrade(upgradeKey, result.newLevel);
    
    // Re-render upgrades
    renderUpgrades();
    
    // Visual feedback
    audio.playShoot(); // Reuse shoot sound for purchase
  }
}

function applyUpgrade(upgradeKey, newLevel) {
  if (upgradeKey === 'fireRate') {
    const bonus = upgradeSystem.getUpgradeValue('fireRate');
    player.shootInterval = (1.0 / CONFIG.FIRE_RATE) * (1 - bonus);
    // Update weapon visual based on fire rate level
    player.updateWeapon(newLevel);
    // Camera shake feedback for weapon upgrade
    gameState.cameraShake = 0.25;
  } else if (upgradeKey === 'damage') {
    // Damage is applied in collision detection
  } else if (upgradeKey === 'bulletSpeed') {
    // Bullet speed is used when spawning bullets
  } else if (upgradeKey === 'maxHP') {
    const bonus = upgradeSystem.getUpgradeValue('maxHP');
    player.maxHP = CONFIG.PLAYER_MAX_HP + bonus;
    // Heal player by the bonus amount
    player.hp = Math.min(player.maxHP, player.hp + bonus);
    player.updateHealthBar();
    updatePlayerUI();
  }
}

function showWaveBanner() {
  waveBannerEl.textContent = `TASK: Eliminate all enemies!`;
  waveBannerEl.style.background = 'linear-gradient(90deg, rgba(255,165,0,0.95), rgba(255,215,0,0.95))';
  waveBannerEl.classList.add('show');
  
  setTimeout(() => {
    waveBannerEl.classList.remove('show');
  }, 3000);
}

function showWaveCompleteBanner() {
  waveBannerEl.textContent = `WAVE ${gameState.wave - 1} COMPLETE! 🎉`;
  waveBannerEl.style.background = 'linear-gradient(90deg, rgba(46,204,113,0.95), rgba(39,174,96,0.95))';
  waveBannerEl.classList.add('show');
  
  setTimeout(() => {
    waveBannerEl.classList.remove('show');
  }, 2000);
}

function showBossBanner() {
  waveBannerEl.textContent = `⚠️ BOSS INCOMING! ⚠️`;
  waveBannerEl.style.background = 'linear-gradient(90deg, rgba(231,76,60,0.95), rgba(192,57,43,0.95))';
  waveBannerEl.classList.add('show');
  
  setTimeout(() => {
    waveBannerEl.classList.remove('show');
  }, 3000);
}

function completeWave() {
  if (!gameState.waveInProgress) return;
  
  gameState.waveInProgress = false;
  powerUpPool.deactivateAll();
  gameState.powerUpSpawnTimer = 0;
  gameState.wave++;
  gameState.waveStartDelay = CONFIG.WAVE_START_DELAY;
  waveEl.textContent = gameState.wave;
  
  showWaveCompleteBanner();
  
  setTimeout(() => {
    startWaveBtn.textContent = `START WAVE ${gameState.wave}`;
    // Show upgrades menu instead of start button
    showUpgradesMenu();
  }, 2000);
}

function spawnEnemy(forceBoss = false) {
  const enemy = enemyPool.get();
  if (!enemy) return; // Pool exhausted
  
  const x = (Math.random() - 0.5) * (CONFIG.LANE_WIDTH - 2);
  const z = -60;
  const baseSpeed = getEnemySpeedForWave(gameState.wave);
  const hp = getEnemyHPForWave(gameState.wave);
  
  // Apply difficulty multiplier to enemy speed
  const difficultyMultiplier = difficultyMultipliers[gameSettings.difficulty];
  const speed = baseSpeed * difficultyMultiplier;
  
  enemy.spawn(x, z, speed, hp, gameState.wave, forceBoss);
  gameState.enemiesSpawnedThisWave++;
  const now = Date.now();
  gameState.lastEnemySpawnTime = now;
  gameState.lastEnemySeenTime = now;
  
  // Spawn effect - bigger for bosses
  const effectPos = new THREE.Vector3(x, 0.5, z);
  spawnSpawnEffect(effectPos);
  
  // Boss announcement
  if (forceBoss) {
    showBossBanner();
  }
}

function spawnSpawnEffect(position) {
  for (let i = 0; i < 8; i++) {
    const particle = particlePool.get();
    if (particle) {
      particle.spawn(position, 0x8B4789, 'explosion');
    }
  }
}

function findClosestEnemy() {
  const activeEnemies = enemyPool.getActive();
  if (activeEnemies.length === 0) return null;
  
  const playerPos = player.getPosition();
  let closest = null;
  let closestDist = Infinity;
  
  for (const enemy of activeEnemies) {
    if (enemy.isDead) continue;
    
    const enemyPos = enemy.getPosition();
    // Distance along the lane (Z-axis) is priority
    const distZ = Math.abs(enemyPos.z - playerPos.z);
    
    if (distZ < closestDist) {
      closestDist = distZ;
      closest = enemy;
    }
  }
  
  return closest;
}

function shootBullet() {
  if (!player.canShoot()) return;
  if (!gameState.waveInProgress) return;
  
  const playerPos = player.getPosition();
  
  // Different shooting patterns based on weapon mode
  switch(player.weaponMode) {
    case 'shotgun':
      // Shotgun: 5 bullets in a spread
      for (let i = 0; i < 5; i++) {
        const bullet = bulletPool.get();
        if (!bullet) continue;
        
        const angle = (i - 2) * 0.15; // Spread angle
        const offset = new THREE.Vector3(Math.sin(angle) * 0.3, 0, 0);
        bullet.spawn(playerPos.clone().add(offset));
        bullet.mesh.userData.angleOffset = angle; // Store angle for trajectory
      }
      // Shotgun has limited range
      break;
      
    case 'laser':
      // Laser: weak continuous beam (spawns as rapid small bullets)
      const laserBullet = bulletPool.get();
      if (!laserBullet) return;
      laserBullet.spawn(playerPos);
      laserBullet.mesh.scale.set(0.5, 0.5, 1.5); // Thinner, longer
      laserBullet.mesh.material.color.setHex(0x00FFFF); // Cyan
      if (laserBullet.mesh.material.emissive) {
        laserBullet.mesh.material.emissive.setHex(0x0088FF);
        laserBullet.mesh.material.emissiveIntensity = 0.9;
      }
      break;
      
    case 'machinegun':
      // Machine gun: normal bullet but rapid fire
      const mgBullet = bulletPool.get();
      if (!mgBullet) return;
      mgBullet.spawn(playerPos);
      mgBullet.mesh.material.color.setHex(0xFF6B00); // Orange
      break;
      
    default:
      // Normal bullet
      const bullet = bulletPool.get();
      if (!bullet) return;
      bullet.spawn(playerPos);
      break;
  }
  
  player.resetShootTimer();
  player.playShootAnimation();
  audio.playShoot(player.weaponMode); // Pass weapon mode for correct sound
  createMuzzleFlash(playerPos);
}

function createMuzzleFlash(position) {
  const flashGeometry = new THREE.SphereGeometry(0.4, 8, 8);
  const flashMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFFD700,
    transparent: true,
    opacity: 0.8
  });
  const flash = new THREE.Mesh(flashGeometry, flashMaterial);
  flash.position.copy(position);
  flash.position.y += 0.8;
  flash.position.z += 0.5;
  scene.add(flash);
  
  setTimeout(() => {
    scene.remove(flash);
  }, 50);
}

function spawnHitParticles(position) {
  for (let i = 0; i < 6; i++) {
    const particle = particlePool.get();
    if (particle) {
      particle.spawn(position, 0xFFFFFF, 'hit');
    }
  }
}

function spawnDeathParticles(position, enemyType = 'normal') {
  // More particles for boss and elite enemies
  let count = 10;
  if (enemyType === 'boss') count = 25;
  else if (enemyType === 'elite') count = 15;
  else if (enemyType === 'tank') count = 12;
  
  for (let i = 0; i < count; i++) {
    const particle = particlePool.get();
    if (particle) {
      let color;
      if (enemyType === 'boss') {
        // Boss explosion - red and golden mix
        const r = Math.random();
        if (r < 0.33) color = 0xFF0000;
        else if (r < 0.66) color = 0xFFD700;
        else color = 0xFF4444;
      } else if (enemyType === 'elite') {
        color = Math.random() < 0.5 ? 0xFF4444 : 0xFFFF00;
      } else if (enemyType === 'fast') {
        color = Math.random() < 0.5 ? 0x00CED1 : 0x00FFFF;
      } else if (enemyType === 'tank') {
        color = Math.random() < 0.5 ? 0x556B2F : 0x8B4513;
      } else if (enemyType === 'scout') {
        color = Math.random() < 0.5 ? 0x4488FF : 0x6699FF; // Blue tones for scout
      } else {
        color = Math.random() < 0.5 ? 0x8B4789 : 0xFF00FF;
      }
      particle.spawn(position, color, 'explosion');
    }
  }
  
  // Add coin sparkle particles
  spawnCoinParticles(position);
}

function spawnCoinParticles(position) {
  for (let i = 0; i < 5; i++) {
    const particle = particlePool.get();
    if (particle) {
      particle.spawn(position, 0xFFD700, 'coin');
    }
  }
}

function spawnPowerUp() {
  const powerUp = powerUpPool.get();
  if (!powerUp) return;
  
  const x = (Math.random() - 0.5) * (CONFIG.LANE_WIDTH - 2);
  const z = -60;
  
  // Random power-up type
  const types = ['machinegun', 'laser', 'shotgun'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  powerUp.spawn(x, z, type);
  
  // Spawn effect
  const effectPos = new THREE.Vector3(x, 1.0, z);
  for (let i = 0; i < 8; i++) {
    const particle = particlePool.get();
    if (particle) {
      particle.spawn(effectPos, 0xFFD700, 'explosion');
    }
  }
}

function checkPowerUpPlayerCollisions() {
  const activePowerUps = powerUpPool.getActive();
  const playerPos = player.getPosition();
  
  for (const powerUp of activePowerUps) {
    const powerUpPos = powerUp.getPosition();
    const distance = powerUpPos.distanceTo(playerPos);
    
    if (distance < 2.0) {
      // Collected!
      player.activatePowerUp(powerUp.powerUpType);
      powerUp.deactivate();
      
      // Collection effect
      for (let i = 0; i < 15; i++) {
        const particle = particlePool.get();
        if (particle) {
          particle.spawn(powerUpPos, 0xFFD700, 'coin');
        }
      }
      
      audio.playPowerupPickup(); // Special power-up pickup sound
    }
  }
}

function checkBulletEnemyCollisions() {
  const activeBullets = bulletPool.getActive();
  const activeEnemies = enemyPool.getActive();
  
  // Get current damage with upgrades
  const damageBonus = upgradeSystem.getUpgradeValue('damage');
  let totalDamage = CONFIG.BULLET_DAMAGE + damageBonus;
  
  // Weapon mode damage modifiers
  if (player.weaponMode === 'laser') {
    totalDamage *= 0.4; // Laser is weaker per hit
  } else if (player.weaponMode === 'shotgun') {
    totalDamage *= 1.5; // Shotgun pellets do more damage
  }
  
  for (const bullet of activeBullets) {
    for (const enemy of activeEnemies) {
      if (enemy.isDead) continue;
      
      const bulletPos = bullet.getPosition();
      const enemyPos = enemy.getPosition();
      const distance = bulletPos.distanceTo(enemyPos);
      
      if (distance < (CONFIG.BULLET_COLLISION_RADIUS + CONFIG.ENEMY_COLLISION_RADIUS)) {
        // Hit!
        const killed = enemy.takeDamage(totalDamage);
        bullet.deactivate();
        
        spawnHitParticles(enemyPos);
        audio.playHit();
        
        if (killed) {
          const enemyType = enemy.enemyType;
          
          enemy.playDeathAnimation(() => {
            // Animation complete callback
          });
          
          // Bonus coins for special enemies
          let coinsEarned = CONFIG.COINS_PER_KILL;
          if (enemyType === 'boss') coinsEarned *= 5; // Boss gives 5x coins!
          else if (enemyType === 'elite') coinsEarned *= 3;
          else if (enemyType === 'tank') coinsEarned *= 2;
          else if (enemyType === 'fast') coinsEarned *= 1.5;
          else if (enemyType === 'animated') coinsEarned *= 1.5;
          else if (enemyType === 'scout') coinsEarned *= 0.75; // Scout gives less coins (weaker enemy)
          
          const earnedCoins = Math.floor(coinsEarned);
          gameState.coins += earnedCoins;
          gameSettings.totalCoins += earnedCoins; // Add to lifetime total for store
          gameState.enemiesKilledThisWave++;
          
          spawnDeathParticles(enemyPos, enemyType);
          audio.playEnemyDeath();
          
          // Bigger camera shake for boss and elite enemies
          if (enemyType === 'boss') {
            gameState.cameraShake = 0.5;
          } else if (enemyType === 'elite') {
            gameState.cameraShake = 0.3;
          } else {
            gameState.cameraShake = 0.15;
          }
        }
        
        break; // Bullet hit something, stop checking
      }
    }
  }
}

function checkEnemyPlayerCollisions() {
  const activeEnemies = enemyPool.getActive();
  const playerPos = player.getPosition();
  const laneEndZ = CONFIG.LANE_POSITION_Z + CONFIG.LANE_LENGTH / 2;
  
  for (let i = activeEnemies.length - 1; i >= 0; i--) {
    const enemy = activeEnemies[i];
    if (enemy.isDead) continue;
    
    // Check if enemy reached Bonkhouse's position
    const enemyPos = enemy.getPosition();
    const distance = enemyPos.distanceTo(playerPos);
    const reachedEndOfLane = enemyPos.z >= laneEndZ;
    
    // Collision radius - when enemy gets close to Bonkhouse
    if (reachedEndOfLane || distance < (CONFIG.PLAYER_COLLISION_RADIUS + CONFIG.ENEMY_COLLISION_RADIUS + 0.5)) {
      // Enemy hit player
      const dead = player.takeDamage(CONFIG.ENEMY_DAMAGE_TO_PLAYER);
      enemy.deactivate();
      
      audio.playPlayerHit();
      gameState.cameraShake = 0.4;
      
      if (dead) {
        endGame();
      }
      
      updatePlayerUI();
    }
  }
}

function updatePlayerUI() {
  playerHPEl.textContent = Math.ceil(player.hp);
  const healthPercent = (player.hp / player.maxHP) * 100;
  playerHealthFillEl.style.width = healthPercent + '%';
  
  if (healthPercent < 30) {
    playerHealthFillEl.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
  } else if (healthPercent < 60) {
    playerHealthFillEl.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
  }
}

function updateGame(deltaTime) {
  if (gameState.isPaused || gameState.isGameOver) return;
  const now = Date.now();
  
  // Calculate player movement direction
  let moveDirection = 0;
  
  // Keyboard input
  if (input.left) moveDirection -= 1;
  if (input.right) moveDirection += 1;
  
  // Touch/mouse input
  if (input.touchStartX !== null && input.touchCurrentX !== null) {
    const touchDiff = input.touchCurrentX - input.touchStartX;
    const threshold = 5; // Minimum movement threshold
    
    if (Math.abs(touchDiff) > threshold) {
      moveDirection = touchDiff > 0 ? 1 : -1;
      // Update start position for continuous dragging
      input.touchStartX = input.touchCurrentX;
    }
  }
  
  // Update player
  player.update(deltaTime, moveDirection);
  
  // Update lane (water animation)
  lane.update(deltaTime);
  
  // Update atmospheric effects (birds)
  atmosphere.update(deltaTime);
  
  // Animate clouds slowly
  if (clouds) {
    clouds.rotation.y += deltaTime * 0.005; // Very slow rotation
    clouds.children.forEach((cloud, i) => {
      cloud.position.z += deltaTime * 2; // Drift forward
      if (cloud.position.z > 20) {
        cloud.position.z = -180; // Reset to back
      }
    });
  }
  
  // Spawn enemies
  if (gameState.waveInProgress) {
    const maxEnemies = getEnemiesForWave(gameState.wave);
    const activeEnemies = enemyPool.getActive().filter(e => !e.isDead).length;
    if (activeEnemies > 0) {
      gameState.lastEnemySeenTime = now;
    } else {
      powerUpPool.deactivateAll();
      gameState.powerUpSpawnTimer = 0;
    }
    
    // Boss wave - spawn one boss at the start
    if (gameState.wave % 5 === 0 && gameState.wave >= 5 && !gameState.bossSpawned) {
      spawnEnemy(true); // Spawn boss
      gameState.bossSpawned = true;
    }
    
    // Spawn enemies gradually
    if (gameState.enemiesSpawnedThisWave < maxEnemies) {
      const spawnRate = 0.8; // Seconds between spawns
      gameState.spawnTimer = (gameState.spawnTimer || 0) + deltaTime;
      
      if (gameState.spawnTimer >= spawnRate) {
        spawnEnemy(false);
        gameState.spawnTimer = 0;
      }
    }
    
    // Check if wave complete or stalled (no enemies showing up)
    const lastEnemyActivity = Math.max(gameState.lastEnemySeenTime, gameState.lastEnemySpawnTime);
    const spawnStalled = now - lastEnemyActivity > 5000;
    if ((gameState.enemiesSpawnedThisWave >= maxEnemies && activeEnemies === 0) ||
        (activeEnemies === 0 && spawnStalled)) {
      completeWave();
    }
  }
  
  // Shooting system - Manual pistol or auto machine gun (with upgrade)
  const closestEnemy = findClosestEnemy();
  const fireRateLevel = upgradeSystem.upgrades.fireRate.level;
  
  // Level 0 = Manual pistol (shoot on input press)
  // Level 1+ = Machine gun (auto-fire)
  if (fireRateLevel === 0) {
    // Allow manual shots even if no enemies are active yet.
    if (input.shoot && player.canShoot()) {
      shootBullet();
    }
  } else {
    // Auto-fire only when there's a target to avoid firing nonstop between spawns.
    if (closestEnemy && player.canShoot()) {
      shootBullet();
    }
  }
  
  // Update bullets with speed bonus
  const bulletSpeedBonus = upgradeSystem.getUpgradeValue('bulletSpeed');
  bulletPool.getActive().forEach(bullet => bullet.update(deltaTime, bulletSpeedBonus));
  
  // Update enemies
  enemyPool.getActive().forEach(enemy => enemy.update(deltaTime));
  
  // Update power-ups
  powerUpPool.getActive().forEach(powerUp => powerUp.update(deltaTime));
  
  // Spawn power-ups randomly during wave
  const activeEnemiesForPowerups = enemyPool.getActive().filter(e => !e.isDead).length;
  if (gameState.waveInProgress && activeEnemiesForPowerups > 0) {
    gameState.powerUpSpawnTimer += deltaTime;
    if (gameState.powerUpSpawnTimer >= 1.0) {
      gameState.powerUpSpawnTimer = 0;
      if (Math.random() < CONFIG.POWERUP_SPAWN_CHANCE) {
        spawnPowerUp();
      }
    }
  }
  
  // Update player power-up
  const fireRateBonus = fireRateLevel * upgradeSystem.upgrades.fireRate.increment;
  const powerUpEnded = player.updatePowerUp(deltaTime, fireRateBonus);
  
  // Play sound when power-up expires
  if (powerUpEnded) {
    audio.playHit(); // Subtle notification sound
  }
  
  // Update particles
  particlePool.getActive().forEach(particle => particle.update(deltaTime));
  
  // Check collisions
  checkBulletEnemyCollisions();
  checkEnemyPlayerCollisions();
  checkPowerUpPlayerCollisions();
  
  // Camera shake
  if (gameState.cameraShake > 0) {
    const shakeX = (Math.random() - 0.5) * gameState.cameraShake;
    const shakeY = (Math.random() - 0.5) * gameState.cameraShake;
    camera.position.x = shakeX;
    camera.position.y = 16 + shakeY;
    gameState.cameraShake *= 0.9;
    
    if (gameState.cameraShake < 0.01) {
      gameState.cameraShake = 0;
      camera.position.x = 0;
      camera.position.y = 16;
    }
  }
  
  // Update UI
  coinsEl.textContent = gameState.coins;
  
  // Update power-up indicator
  const powerUpTime = player.getPowerUpTimeRemaining();
  if (powerUpTime > 0) {
    powerUpIndicatorEl.style.display = 'block';
    powerUpTimerEl.textContent = Math.ceil(powerUpTime);
    
    const powerUpNames = {
      'machinegun': '🔫 MACHINE GUN',
      'laser': '⚡ LASER BEAM',
      'shotgun': '💥 SHOTGUN'
    };
    powerUpNameEl.textContent = powerUpNames[player.weaponMode] || player.weaponMode.toUpperCase();
    
    // Flash red when time is running out
    if (powerUpTime < 3) {
      const flashAlpha = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
      powerUpIndicatorEl.style.backgroundColor = `rgba(231, 76, 60, ${0.5 + flashAlpha * 0.3})`;
      powerUpIndicatorEl.style.borderColor = '#e74c3c';
      powerUpIndicatorEl.style.border = '2px solid #e74c3c';
    } else {
      powerUpIndicatorEl.style.backgroundColor = 'rgba(0,0,0,0.7)';
      powerUpIndicatorEl.style.border = 'none';
    }
  } else {
    powerUpIndicatorEl.style.display = 'none';
  }
  
  // Update debug info if visible
  if (debugInfoEl.classList.contains('show')) {
    const playerPos = player.getPosition();
    debugPlayerPosEl.textContent = `${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)}, ${playerPos.z.toFixed(1)}`;
    debugCameraPosEl.textContent = `${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}`;
    debugEnemiesEl.textContent = enemyPool.getActive().length;
    debugBulletsEl.textContent = bulletPool.getActive().length;
  }
}

function togglePause() {
  gameState.isPaused = !gameState.isPaused;
  pauseMenuEl.classList.toggle('show');
}

function endGame() {
  gameState.isGameOver = true;
  gameState.survivalTime = (Date.now() - gameState.gameStartTime) / 1000;
  
  finalWaveEl.textContent = gameState.wave;
  finalCoinsEl.textContent = gameState.coins;
  finalTimeEl.textContent = formatTime(gameState.survivalTime);
  
  // Stop background music
  audio.stopMusic();
  
  // Save total coins to localStorage
  saveSettings();
  
  // Save high score and check if it's a new record
  const isNewHighScore = saveHighScore(gameState.wave, gameState.survivalTime, gameState.coins);
  if (isNewHighScore) {
    newHighScoreMsgEl.style.display = 'block';
  } else {
    newHighScoreMsgEl.style.display = 'none';
  }
  recordSessionEnd({
    wave: gameState.wave,
    time: gameState.survivalTime,
    coins: gameState.coins
  });
  
  gameOverEl.classList.add('show');
}

function restartGame() {
  // Stop music
  audio.stopMusic();

  if (activeSessionId && gameState.gameStartTime) {
    const survivalTime = (Date.now() - gameState.gameStartTime) / 1000;
    recordSessionEnd({
      wave: gameState.wave,
      time: survivalTime,
      coins: gameState.coins
    });
  }
  
  // Reset game state
  gameState = {
    wave: 1,
    coins: 0,
    enemiesSpawnedThisWave: 0,
    enemiesKilledThisWave: 0,
    waveInProgress: false,
    waveStartDelay: 0,
    isPaused: false,
    isGameOver: false,
    cameraShake: 0,
    spawnTimer: 0,
    bossSpawned: false,
    survivalTime: 0,
    gameStartTime: Date.now(),
    powerUpSpawnTimer: 0,
    lastEnemySeenTime: Date.now(),
    lastEnemySpawnTime: Date.now()
  };
  
  // Clear pools
  bulletPool.deactivateAll();
  enemyPool.deactivateAll();
  particlePool.deactivateAll();
  powerUpPool.deactivateAll();
  
  // Reset player
  player.hp = player.maxHP;
  player.updateHealthBar();
  player.shootTimer = 0;
  player.weaponMode = 'normal';
  player.powerUpTimer = 0;
  
  // Reset upgrades
  upgradeSystem.upgrades.fireRate.level = 0;
  upgradeSystem.upgrades.damage.level = 0;
  upgradeSystem.upgrades.bulletSpeed.level = 0;
  upgradeSystem.upgrades.maxHP.level = 0;
  player.shootInterval = 1.0 / CONFIG.FIRE_RATE;
  player.maxHP = CONFIG.PLAYER_MAX_HP;
  
  // Update UI
  waveEl.textContent = gameState.wave;
  coinsEl.textContent = gameState.coins;
  updatePlayerUI();
  
  startWaveBtn.textContent = 'START WAVE 1';
  startWaveBtn.classList.add('show');
  gameOverEl.classList.remove('show');
  upgradesMenuEl.classList.remove('show');
  
  // Reset camera
  camera.position.set(0, 14, 8);
}

// Animation loop
let lastTime = 0;
function animate(currentTime) {
  requestAnimationFrame(animate);
  
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;
  
  updateGame(deltaTime);
  
  renderer.render(scene, camera);
}

animate(0);
