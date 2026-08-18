(() => {
  const originalFetch = window.fetch.bind(window);
  const metaBase = document.querySelector('meta[name="rivayat-api-base"]')?.content?.trim() || '';
  const configuredBase = (localStorage.getItem('rivayat_api_base_url') || '').trim();
  const defaultBase = 'https://rivayat.onrender.com';
  const currentIsBackend = ['rivayat.onrender.com','localhost','127.0.0.1'].includes(location.hostname);
  const savedBase = /^https?:\/\//i.test(configuredBase) ? configuredBase : '';
  const API_BASE = (currentIsBackend ? '' : (savedBase || metaBase || defaultBase)).replace(/\/$/, '');
  const apiPrefixes = ['/api','/health','/public-config','/products','/settings/','/signup','/verify-email','/resend-verification','/login','/auth/','/profile','/forgot-password','/reset-password','/orders','/returns','/users','/reviews','/coupons','/newsletter','/referrals','/admin/','/delivery/','/launch/','/telegram/'];

  function isApiPath(value) {
    return typeof value === 'string' && value.startsWith('/') && apiPrefixes.some(prefix => value === prefix || value.startsWith(prefix));
  }

  function requestUrl(input) {
    if (!API_BASE || typeof input !== 'string' || !isApiPath(input)) return input;
    return API_BASE + input;
  }

  window.RIVAYAT_API_BASE = API_BASE;
  window.fetch = function rivayatFetch(input, init) {
    return originalFetch(requestUrl(input), init);
  };

  window.rivayatBackendHealth = async function rivayatBackendHealth() {
    const response = await originalFetch((API_BASE || '') + '/health', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    return response.json();
  };
})();
