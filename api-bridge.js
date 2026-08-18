(() => {
  const originalFetch = window.fetch.bind(window);
  const metaBase = document.querySelector('meta[name="rivayat-api-base"]')?.content?.trim() || '';
  const savedBase = localStorage.getItem('rivayat_api_base_url')?.trim() || '';
  const defaultBase = 'https://rivayat.onrender.com';
  const currentIsBackend = location.hostname === 'rivayat.onrender.com' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const proxyHost = /\.vercel\.app$/i.test(location.hostname) || ['rivayat.shop','www.rivayat.shop'].includes(location.hostname);
  const API_BASE = (savedBase || (currentIsBackend ? '' : (proxyHost ? '/backend' : (metaBase || defaultBase)))).replace(/\/$/, '');
  const apiPrefixes = ['/api','/health','/public-config','/products','/settings/','/signup','/verify-email','/resend-verification','/login','/auth/','/profile','/forgot-password','/reset-password','/orders','/returns','/users','/reviews','/coupons','/newsletter','/referrals','/admin/','/delivery/','/launch/','/telegram/'];
  function isApiPath(value) { return typeof value === 'string' && value.startsWith('/') && apiPrefixes.some(prefix => value === prefix || value.startsWith(prefix)); }
  window.RIVAYAT_API_BASE = API_BASE;
  window.fetch = function rivayatFetch(input, init) {
    if (API_BASE && typeof input === 'string' && isApiPath(input)) input = API_BASE + input;
    return originalFetch(input, init);
  };
})();
