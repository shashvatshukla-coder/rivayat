(() => {
  const PUBLIC_EMAIL='houseofrivayat@gmail.com';

  if (typeof loadLegalSettings==='function' && typeof LEGAL==='object') {
    const originalLoadLegal=loadLegalSettings;
    loadLegalSettings=async function(){
      await originalLoadLegal();
      if(!LEGAL.privacyEmail || LEGAL.privacyEmail==='support@rivayat.in') LEGAL.privacyEmail=PUBLIC_EMAIL;
      if(!LEGAL.email || LEGAL.email==='support@rivayat.in') LEGAL.email=PUBLIC_EMAIL;
      if(!LEGAL.grievanceEmail || LEGAL.grievanceEmail==='support@rivayat.in') LEGAL.grievanceEmail=PUBLIC_EMAIL;
    };
  }

  if (typeof setupGoogle==='function') {
    let googleScriptPromise=null;
    let initializedFor='';
    setupGoogle=async function(){
      try{
        if(!GOOGLE_CLIENT){const d=await api('/public-config');GOOGLE_CLIENT=d.config?.googleClientId||''}
      }catch{}
      if(!GOOGLE_CLIENT)return;
      if(window.google?.accounts?.id){renderGoogle();return}
      if(!googleScriptPromise){
        googleScriptPromise=new Promise(resolve=>{
          let s=document.getElementById('googleGsi');
          if(!s){s=document.createElement('script');s.id='googleGsi';s.src='https://accounts.google.com/gsi/client';s.async=true;s.defer=true;document.head.appendChild(s)}
          s.addEventListener('load',resolve,{once:true});
          if(window.google?.accounts?.id)resolve();
        });
      }
      await googleScriptPromise;renderGoogle();
    };
    renderGoogle=function(){
      const el=document.getElementById('googleButton');
      if(!el||!window.google?.accounts?.id||!GOOGLE_CLIENT)return;
      if(initializedFor!==GOOGLE_CLIENT){google.accounts.id.initialize({client_id:GOOGLE_CLIENT,callback:googleCredential});initializedFor=GOOGLE_CLIENT}
      el.innerHTML='';
      google.accounts.id.renderButton(el,{theme:document.documentElement.dataset.theme==='dark'?'filled_black':'outline',size:'large',shape:'pill',width:360,text:'continue_with'});
    };
  }

  setTimeout(async()=>{
    try{await window.rivayatBackendHealth?.();document.documentElement.dataset.backend='online'}
    catch(error){document.documentElement.dataset.backend='offline';console.error('RIVAYAT backend health check failed:',error)}
  },250);
})();
