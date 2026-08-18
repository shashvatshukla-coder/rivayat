(() => {
  if (typeof routeInfo !== 'function') return;
  const hashRouteInfo=routeInfo;
  routeInfo=function(){
    if(location.hash && location.hash.startsWith('#/')) return hashRouteInfo();
    const path=location.pathname.replace(/\/+$/,'')||'/';
    return {path,params:new URLSearchParams(location.search)};
  };
  setTimeout(()=>{if(!location.hash && location.pathname!=='/' && typeof render==='function')render()},80);
})();
