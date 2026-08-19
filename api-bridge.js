(() => {
  const originalFetch = window.fetch.bind(window);
  const metaBase = document.querySelector('meta[name="rivayat-api-base"]')?.content?.trim() || '';
  const configuredBase = (localStorage.getItem('rivayat_api_base_url') || '').trim();
  const directBase = 'https://rivayat.onrender.com';
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const currentIsBackend = location.hostname === 'rivayat.onrender.com';
  const isProductionStorefront = location.hostname === 'rivayat.shop' || location.hostname === 'www.rivayat.shop' || location.hostname.endsWith('.vercel.app');
  const savedBase = isLocal && /^https?:\/\//i.test(configuredBase) ? configuredBase : '';
  const API_BASE = (currentIsBackend ? '' : (isProductionStorefront ? '/backend' : (savedBase || metaBase || directBase))).replace(/\/$/, '');
  const apiPrefixes = ['/api','/health','/public-config','/products','/settings/','/signup','/verify-email','/resend-verification','/login','/auth/','/profile','/forgot-password','/reset-password','/orders','/returns','/users','/reviews','/coupons','/newsletter','/referrals','/admin/','/delivery/','/launch/','/telegram/'];

  function isApiPath(value) {
    return typeof value === 'string' && value.startsWith('/') && apiPrefixes.some(prefix => value === prefix || value.startsWith(prefix));
  }

  function requestUrl(input) {
    if (!API_BASE || typeof input !== 'string' || !isApiPath(input)) return input;
    return API_BASE + input;
  }

  function directUrl(input) {
    if (typeof input !== 'string' || !isApiPath(input)) return input;
    return directBase + input;
  }

  window.RIVAYAT_API_BASE = API_BASE;
  window.fetch = async function rivayatFetch(input, init) {
    if (!isApiPath(input)) return originalFetch(input, init);
    try {
      const response = await originalFetch(requestUrl(input), init);
      if (API_BASE === '/backend' && [502, 503, 504].includes(response.status)) {
        return originalFetch(directUrl(input), init);
      }
      return response;
    } catch (error) {
      if (API_BASE === '/backend') return originalFetch(directUrl(input), init);
      throw error;
    }
  };

  window.rivayatBackendHealth = async function rivayatBackendHealth() {
    const response = await window.fetch('/health', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    return response.json();
  };
})();
