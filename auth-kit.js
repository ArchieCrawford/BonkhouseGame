import * as React from 'https://esm.sh/react@19.2.0';
import { createRoot } from 'https://esm.sh/react-dom@19.2.0/client';
import { AuthKitProvider, SignInButton, useProfile } from 'https://esm.sh/@farcaster/auth-kit@0.8.1';

const AUTH_CONFIG = {
  rpcUrl: 'https://mainnet.optimism.io',
  relay: 'https://relay.farcaster.xyz',
  domain: window.location.host,
  siweUri: window.location.href,
  version: 'v1'
};

const generateNonce = async () => {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return `nonce-${Math.random().toString(36).slice(2, 10)}`;
};

const AuthKitMount = () => {
  const { isAuthenticated, profile } = useProfile();
  const [wasAuthenticated, setWasAuthenticated] = React.useState(false);
  const lastFidRef = React.useRef(null);

  React.useEffect(() => {
    if (isAuthenticated && profile?.fid) {
      if (lastFidRef.current !== profile.fid) {
        window.dispatchEvent(new CustomEvent('farcaster-auth:sign-in', { detail: profile }));
        lastFidRef.current = profile.fid;
      }
      if (!wasAuthenticated) {
        setWasAuthenticated(true);
      }
      return;
    }

    if (wasAuthenticated) {
      window.dispatchEvent(new CustomEvent('farcaster-auth:sign-out'));
      lastFidRef.current = null;
      setWasAuthenticated(false);
    }
  }, [isAuthenticated, profile, wasAuthenticated]);

  return React.createElement(SignInButton, {
    nonce: generateNonce,
    requestId: `bonkhouse-${Date.now()}`,
    timeout: 20000,
    onError: (err) => console.warn('Auth Kit error:', err),
    onSignOut: () => {
      window.dispatchEvent(new CustomEvent('farcaster-auth:sign-out'));
    }
  });
};

const mount = () => {
  const container = document.getElementById('farcasterSignIn');
  if (!container) return;

  const root = createRoot(container);
  root.render(
    React.createElement(
      AuthKitProvider,
      { config: AUTH_CONFIG },
      React.createElement(AuthKitMount)
    )
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
