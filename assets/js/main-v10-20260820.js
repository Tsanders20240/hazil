const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const toast=$('#toast');
function showToast(msg){
  if(!toast)return;
  toast.textContent=msg;
  toast.classList.add('show');
  clearTimeout(showToast.t);
  showToast.t=setTimeout(()=>toast.classList.remove('show'),2800);
}
const year=$('#year'); if(year) year.textContent=new Date().getFullYear();

const HAZIL={
  email:'hazilflix@gmail.com',
  krucialId:'CgEhvoDVACQ',
  krucialUrl:'https://www.youtube.com/watch?v=CgEhvoDVACQ',
  krucialSoundCloud:'https://soundcloud.com/hazilmusic/krucial',
  channelUrl:'https://www.youtube.com/channel/UCEtV92a0BbcUwbMlZ8lvKiQ',
  videosUrl:'https://www.youtube.com/channel/UCEtV92a0BbcUwbMlZ8lvKiQ/videos',
  uploadsPlaylist:'UUEtV92a0BbcUwbMlZ8lvKiQ',
  reelItems:[
    {platform:'youtube',videoId:'-QRZAwthlwU',url:'https://www.youtube.com/watch?v=-QRZAwthlwU',title:'HÄZIL · Feature Video 01'},
    {platform:'youtube',videoId:'C32Aes3gzM8',url:'https://www.youtube.com/watch?v=C32Aes3gzM8',title:'HÄZIL · Feature Video 02'},
    {platform:'youtube',videoId:'CgEhvoDVACQ',url:'https://www.youtube.com/watch?v=CgEhvoDVACQ&list=RDCgEhvoDVACQ&start_radio=1',title:'KRUCIAL · Official Music Video',start:23},
    {platform:'youtube',videoId:'8qvQqsNQl48',url:'https://www.youtube.com/watch?v=8qvQqsNQl48',title:'HÄZIL · Feature Video 04'},
    {platform:'youtube',videoId:'3vMcsJ1csFo',url:'https://www.youtube.com/watch?v=3vMcsJ1csFo',title:'HÄZIL · Feature Video 05'}
  ]
};


// ---------------- Official YouTube title hydration ----------------
// Generic FEATURE labels are only fallbacks. The live page asks YouTube's official
// oEmbed endpoint through our same-origin Cloudflare Function, then replaces them
// with the video's current public title without inventing metadata.
async function hydrateOfficialVideoTitles(){
  const jobs=HAZIL.reelItems.map(async(item,index)=>{
    if(!item.videoId)return;
    if(index===2){
      document.querySelectorAll(`[data-video-title-text="${index}"]`).forEach(el=>el.textContent=item.title);
      return;
    }
    try{
      const res=await fetch(`/api/video-title?id=${encodeURIComponent(item.videoId)}`,{
        headers:{'Accept':'application/json'}
      });
      if(!res.ok)return;
      const data=await res.json();
      const title=String(data.title||'').trim();
      if(!title)return;
      item.title=title;
      document.querySelectorAll(`[data-video-title-text="${index}"]`).forEach(el=>el.textContent=title);
      document.querySelectorAll(`[data-playlist-index="${index}"]`).forEach(el=>{
        el.dataset.videoTitle=title;
        el.setAttribute('aria-label',`Watch ${title}`);
      });
      const slide=document.querySelector(`.premiere-slide[data-premiere="${index}"]`);
      const img=slide?.querySelector('img');
      if(img)img.alt=`${title} — HÄZIL official video`;
    }catch(_){}
  });
  await Promise.allSettled(jobs);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hydrateOfficialVideoTitles,{once:true});
else hydrateOfficialVideoTitles();

// ---------------- Mobile navigation ----------------
const mobileMenu=$('#mobileMenu'),nav=$('#mainNav');
if(mobileMenu&&nav){
  mobileMenu.addEventListener('click',()=>{
    nav.classList.toggle('open');
    const open=nav.classList.contains('open');
    mobileMenu.setAttribute('aria-expanded',String(open));
    mobileMenu.textContent=open?'CLOSE':'MENU';
  });
  $$('#mainNav a').forEach(a=>a.addEventListener('click',()=>{
    nav.classList.remove('open');
    mobileMenu.setAttribute('aria-expanded','false');
    mobileMenu.textContent='MENU';
  }));
}

// ---------------- Intro gate ----------------
const gate=$('#gate');
const gatePromoVideo=$('#gatePromoVideo');
if(gate){
  document.body.classList.add('gate-open');
  gate.classList.add('impact-start');
  setTimeout(()=>gate.classList.remove('impact-start'),1800);
}
if(gatePromoVideo){
  gatePromoVideo.muted=true;
  gatePromoVideo.volume=.78;
  const p=gatePromoVideo.play();
  if(p&&typeof p.catch==='function')p.catch(()=>{});
}

// ---------------- YouTube smart playback ----------------
// Important: the website never reveals a broken YouTube iframe. A player only fades in
// after YouTube confirms that playback actually started. If embedding is disabled by the
// video owner, the local/poster art stays visible and clicks go to the official YouTube page.
let musicPlayer=null,playerReady=false,isPlaying=false,isMuted=false,musicEmbedBlocked=false;
let scWidget=null,scReady=false,activeMusicBackend='none';
let gatePlayer=null,heroPlayer=null,featuredPlayer=null,gatePlaybackReady=false,gateSoundOn=false;
let shouldStartMusic=false,wasPlayingBeforeModal=false;

function updateMusicUI(){
  const b=$('#dockPlay'); if(b)b.textContent=isPlaying?'Ⅱ':'▶';
}
function initSoundCloudAudio(){
  const frame=$('#scAudioPlayer');
  if(!frame||!window.SC||!SC.Widget)return;
  try{
    scWidget=SC.Widget(frame);
    scWidget.bind(SC.Widget.Events.READY,()=>{
      scReady=true;
      try{scWidget.setVolume(70);}catch(_){}
      if(shouldStartMusic&&!isPlaying)startMusic();
    });
    scWidget.bind(SC.Widget.Events.PLAY,()=>{activeMusicBackend='soundcloud';isPlaying=true;updateMusicUI();});
    scWidget.bind(SC.Widget.Events.PAUSE,()=>{if(activeMusicBackend==='soundcloud'){isPlaying=false;updateMusicUI();}});
    scWidget.bind(SC.Widget.Events.FINISH,()=>{
      if(!shouldStartMusic)return;
      try{scWidget.seekTo(0);scWidget.play();}catch(_){}
    });
  }catch(_){}
}
initSoundCloudAudio();
const embedStatus={krucial:false,featured:false,film:[false,false,false,false,false]};

function safeOrigin(){
  return /^https?:$/.test(location.protocol)?location.origin:undefined;
}
function smartVideoPlayer(hostId,shellId,opts={}){
  const host=document.getElementById(hostId),shell=document.getElementById(shellId);
  if(!host||!shell||!window.YT||!YT.Player)return null;
  const frame=shell.closest('.video-frame');
  if(frame)frame.classList.add('frame-fallback');

  let confirmed=false;
  let player=null;
  let watchdog=null;

  const markFallback=()=>{
    if(confirmed)return;
    confirmed=true;
    shell.classList.add('yt-failed');
    shell.classList.remove('yt-playing');
    if(frame){
      frame.classList.add('frame-fallback');
      frame.classList.remove('frame-youtube-playing');
      const label=frame.querySelector('.frame-live em');
      if(label)label.textContent='WATCH';
    }
    // Remove a failed external player from the render tree so it can never flash an error card.
    setTimeout(()=>{
      try{if(player&&typeof player.destroy==='function')player.destroy();}catch(_){}
      try{host.innerHTML='';}catch(_){}
    },60);
  };

  const markPlaying=()=>{
    if(confirmed)return;
    confirmed=true;
    clearTimeout(watchdog);
    shell.classList.add('yt-playing');
    shell.classList.remove('yt-failed');
    if(opts.kind==='krucial'){embedStatus.krucial=true;if(shellId==='gateVideoShell')gatePlaybackReady=true;}
    if(opts.kind==='featured'){embedStatus.featured=true;embedStatus.krucial=true;}
    if(opts.kind==='film'){
      embedStatus.film[opts.index]=true;
      if(frame){
        frame.classList.add('frame-youtube-playing');
        frame.classList.remove('frame-fallback');
        const label=frame.querySelector('.frame-live em');
        if(label)label.textContent='PLAYING';
      }
    }
  };

  const playerVars={
    autoplay:1,mute:1,controls:0,playsinline:1,rel:0,modestbranding:1,disablekb:1,
    fs:0,iv_load_policy:3,enablejsapi:1
  };
  const origin=safeOrigin(); if(origin) playerVars.origin=origin;
  if(opts.videoId){
    playerVars.start=opts.start||0;
    if(opts.loop){playerVars.loop=1;playerVars.playlist=opts.videoId;}
  }
  if(opts.playlist){
    playerVars.listType='playlist';
    playerVars.list=opts.playlist;
    playerVars.index=Number(opts.index)||0;
  }

  const config={
    width:'100%',height:'100%',
    playerVars,
    events:{
      onReady:e=>{
        try{e.target.mute();e.target.playVideo();}catch(_){}
        // If a muted autoplay still has not reached PLAYING, use the zero-error motion fallback.
        watchdog=setTimeout(markFallback,6500);
      },
      onStateChange:e=>{
        if(e.data===YT.PlayerState.PLAYING)markPlaying();
      },
      onError:markFallback
    }
  };
  if(opts.videoId)config.videoId=opts.videoId;
  try{
    player=new YT.Player(hostId,config);
    return player;
  }catch(_){
    markFallback();
    return null;
  }
}
function activateMotionFallbacks(){
  $$('.video-frame').forEach(frame=>{
    if(!frame.classList.contains('frame-youtube-playing'))frame.classList.add('frame-fallback');
  });
  ['gateVideoShell','heroVideoShell','featuredVideoShell'].forEach(id=>{
    const el=document.getElementById(id);
    if(el&&!el.classList.contains('yt-playing'))el.classList.add('yt-fallback-ready');
  });
}
setTimeout(()=>{
  if(!window.YT||!YT.Player)activateMotionFallbacks();
},5000);

window.onYouTubeIframeAPIReady=()=>{
  // Hidden music player for the persistent dock.
  const audioHost=$('#audioPlayer');
  if(audioHost){
    const vars={start:23,playsinline:1,controls:0,rel:0,enablejsapi:1};
    const origin=safeOrigin(); if(origin) vars.origin=origin;
    musicPlayer=new YT.Player('audioPlayer',{
      height:'1',width:'1',videoId:HAZIL.krucialId,playerVars:vars,
      events:{
        onReady:()=>{
          playerReady=true;
          try{musicPlayer.setVolume(70);}catch(_){}
          if(shouldStartMusic){const started=startMusic();try{setSoundRail(Boolean(started),'site');}catch(_){}}
        },
        onStateChange:e=>{
          if(e.data===YT.PlayerState.PLAYING)activeMusicBackend='youtube';
          if(activeMusicBackend==='youtube'){isPlaying=e.data===YT.PlayerState.PLAYING;updateMusicUI();}
        },
        onError:()=>{
          musicEmbedBlocked=true;
          playerReady=false;
          if(shouldStartMusic&&scReady){startMusic();return;}
          const dock=$('#listenDock'); if(dock&&!scReady)dock.classList.add('dock-external');
          const b=$('#dockPlay'); if(b){b.textContent='▶';b.title=scReady?'Play KRUCIAL':'Open KRUCIAL on YouTube';}
        }
      }
    });
  }

  // Background/featured players use smart fallbacks: error frames remain invisible.
  gatePlayer=null; // Intro now uses the uploaded WE UP promo video.
  heroPlayer=smartVideoPlayer('heroYoutube','heroVideoShell',{videoId:HAZIL.krucialId,start:23,loop:true,kind:'krucial'});
  featuredPlayer=smartVideoPlayer('featuredYoutube','featuredVideoShell',{videoId:HAZIL.krucialId,start:23,loop:true,kind:'featured'});

  // Filmstrip previews use the exact destinations chosen for the HÄZIL reel.
  // YouTube items fade in only after confirmed playback. Instagram stays on the cinematic motion poster
  // because external Instagram autoplay/embed behavior is inconsistent; clicking it always opens the original post.
  HAZIL.reelItems.forEach((item,i)=>{
    if(item.platform==='youtube'){
      smartVideoPlayer(`filmYoutube${i}`,`filmShell${i}`,{videoId:item.videoId,start:item.start||0,loop:true,index:i,kind:'film'});
    }else if(item.platform==='youtube-playlist'){
      smartVideoPlayer(`filmYoutube${i}`,`filmShell${i}`,{playlist:HAZIL.uploadsPlaylist,index:0,kind:'film'});
    }else{
      const shell=document.getElementById(`filmShell${i}`);
      if(shell)shell.classList.add('yt-failed');
      const frame=shell?.closest('.video-frame');
      if(frame)frame.classList.add('frame-fallback');
    }
  });
};

function openExternal(url){
  const win=window.open(url,'_blank','noopener,noreferrer');
  if(!win) location.href=url;
}
function startMusic(){
  if(scReady&&scWidget){
    try{
      scWidget.setVolume(70);scWidget.play();activeMusicBackend='soundcloud';isMuted=false;
      const m=$('#dockMute');if(m)m.textContent='♫';
      return true;
    }catch(_){}
  }
  if(musicEmbedBlocked||!playerReady){
    const b=$('#dockPlay'); if(b)b.textContent='▶';
    return false;
  }
  try{musicPlayer.unMute();musicPlayer.setVolume(70);musicPlayer.playVideo();activeMusicBackend='youtube';isMuted=false;const m=$('#dockMute');if(m)m.textContent='♫';return true}catch(_){return false;}
}
function pauseMusic(){
  try{
    if(activeMusicBackend==='soundcloud'&&scReady&&scWidget)scWidget.pause();
    else if(playerReady&&musicPlayer)musicPlayer.pauseVideo();
  }catch(_){}
}
const dockPlay=$('#dockPlay'),dockMute=$('#dockMute');
if(dockPlay)dockPlay.addEventListener('click',()=>{
  try{
    if(activeMusicBackend==='soundcloud'&&scReady&&scWidget){isPlaying?scWidget.pause():scWidget.play();return;}
    if(activeMusicBackend==='youtube'&&playerReady&&musicPlayer&&!musicEmbedBlocked){isPlaying?musicPlayer.pauseVideo():musicPlayer.playVideo();return;}
    if(startMusic())return;
  }catch(_){}
  showToast('Opening the official KRUCIAL destination.');
  openExternal(scReady?HAZIL.krucialSoundCloud:HAZIL.krucialUrl);
});
if(dockMute)dockMute.addEventListener('click',()=>{
  try{
    if(activeMusicBackend==='soundcloud'&&scReady&&scWidget){
      if(isMuted){scWidget.setVolume(70);isMuted=false;dockMute.textContent='♫';setSoundRail(true,'site');}
      else{scWidget.setVolume(0);isMuted=true;dockMute.textContent='⊘';setSoundRail(false,'site');}
      return;
    }
    if(activeMusicBackend==='youtube'&&playerReady&&musicPlayer&&!musicEmbedBlocked){
      if(isMuted){musicPlayer.unMute();isMuted=false;dockMute.textContent='♫';setSoundRail(true,'site');}
      else{musicPlayer.mute();isMuted=true;dockMute.textContent='⊘';setSoundRail(false,'site');}
      return;
    }
    if(startMusic()){setSoundRail(true,'site');return;}
  }catch(_){}
  openExternal(HAZIL.krucialSoundCloud);
});

const soundRail=$('#soundRail'),soundRailLabel=$('#soundRailLabel'),soundRailState=$('#soundRailState');
function setSoundRail(on,context='site'){
  if(!soundRail)return;
  soundRail.setAttribute('aria-pressed',String(on));
  soundRail.classList.toggle('sound-is-on',on);
  if(soundRailLabel)soundRailLabel.textContent=on?'MUTE':'SOUND ON';
  if(soundRailState)soundRailState.textContent=on?(context==='intro'?'INTRO SOUND':'HÄZIL SOUND'):(context==='intro'?'INTRO MUTED':'SITE MUTED');
  soundRail.setAttribute('aria-label',on?'Mute HÄZIL sound':'Turn HÄZIL sound on');
}
setSoundRail(false,'intro');
if(soundRail)soundRail.addEventListener('click',()=>{
  const gateVisible=gate&&!gate.classList.contains('exited');
  if(gateVisible){
    if(!gatePromoVideo){
      showToast('The official promo is loading. KRUCIAL begins after you enter HÄZIL Arks.');
      return;
    }
    try{
      if(gateSoundOn){
        gatePromoVideo.muted=true;gateSoundOn=false;setSoundRail(false,'intro');
      }else{
        gatePromoVideo.muted=false;gatePromoVideo.volume=.78;gatePromoVideo.play();gateSoundOn=true;setSoundRail(true,'intro');
      }
    }catch(_){showToast('Tap ENTER HÄZIL ARKS to continue into the experience.');}
    return;
  }
  try{
    if(activeMusicBackend==='soundcloud'&&scReady&&scWidget){
      if(isMuted||!isPlaying){scWidget.setVolume(70);scWidget.play();isMuted=false;isPlaying=true;setSoundRail(true,'site');if(dockMute)dockMute.textContent='♫';}
      else{scWidget.setVolume(0);isMuted=true;setSoundRail(false,'site');if(dockMute)dockMute.textContent='⊘';}
      return;
    }
    if(activeMusicBackend==='youtube'&&playerReady&&musicPlayer&&!musicEmbedBlocked){
      if(isMuted||!isPlaying){musicPlayer.unMute();musicPlayer.setVolume(70);musicPlayer.playVideo();isMuted=false;isPlaying=true;setSoundRail(true,'site');if(dockMute)dockMute.textContent='♫';}
      else{musicPlayer.mute();isMuted=true;setSoundRail(false,'site');if(dockMute)dockMute.textContent='⊘';}
      return;
    }
    if(startMusic()){setSoundRail(true,'site');return;}
  }catch(_){}
  showToast('Opening the official KRUCIAL audio destination.');
  openExternal(HAZIL.krucialSoundCloud);
});

const enterExperience=$('#enterExperience');
if(enterExperience&&gate)enterExperience.addEventListener('click',()=>{
  shouldStartMusic=true;
  try{
    if(gatePromoVideo){gatePromoVideo.muted=true;gatePromoVideo.pause();}
  }catch(_){}
  gateSoundOn=false;
  gate.classList.add('exited');
  document.body.classList.remove('gate-open');
  const started=startMusic();
  setSoundRail(Boolean(started),'site');
  if(!started)showToast('Entering HÄZIL ARKS — KRUCIAL is loading in the background.');
  setTimeout(()=>$('#home')?.scrollIntoView({behavior:'smooth',block:'start'}),400);
});

// ---------------- Video modal with guaranteed YouTube fallback ----------------
const modal=$('#videoModal'),modalVideo=$('#modalVideo'),modalTitle=$('#modalTitle'),modalYoutubeLink=$('#modalYoutubeLink');
function canEmbed(kind,index=0){
  if(kind==='krucial')return embedStatus.krucial||embedStatus.featured;
  if(kind==='library'||kind==='reel')return !!embedStatus.film[Number(index)||0];
  return false;
}
function externalVideoUrl(kind,explicitUrl){return explicitUrl||(kind==='krucial'?HAZIL.krucialUrl:HAZIL.videosUrl);}
function openVideo(kind,index=0,explicitUrl='',youtubeId='',platform='youtube',videoTitle=''){
  const url=externalVideoUrl(kind,explicitUrl);
  // Instagram and any non-YouTube destination opens its original post directly.
  if(platform&&platform!=='youtube'){
    showToast(platform==='instagram'?'Opening the original HÄZIL Instagram post.':'Opening the original HÄZIL media destination.');
    openExternal(url);
    return;
  }
  // We only open an in-site YouTube player after the corresponding preview proves embedding works.
  if(!canEmbed(kind,index)){
    showToast('Opening the official HÄZIL video on YouTube.');
    openExternal(url);
    return;
  }
  if(!modal||!modalVideo)return openExternal(url);
  wasPlayingBeforeModal=isPlaying;pauseMusic();
  const isLibrary=kind==='library';
  const id=youtubeId||(kind==='krucial'?HAZIL.krucialId:'');
  modalTitle.textContent=videoTitle||(isLibrary?'HÄZIL Public Video Library':'HÄZIL · Official Video');
  const origin=safeOrigin();
  const originParam=origin?`&origin=${encodeURIComponent(origin)}`:'';
  const src=isLibrary
    ?`https://www.youtube.com/embed/videoseries?list=${HAZIL.uploadsPlaylist}&autoplay=1&rel=0&modestbranding=1${originParam}`
    :`https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1${kind==='krucial'||id===HAZIL.krucialId?'&start=23':''}${originParam}`;
  modalVideo.innerHTML=`<iframe src="${src}" title="${modalTitle.textContent}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  if(modalYoutubeLink){modalYoutubeLink.href=url;modalYoutubeLink.textContent='OPEN ORIGINAL ON YOUTUBE ↗';}
  modal.hidden=false;document.body.classList.add('modal-open');
}
function closeVideo(){
  if(!modal)return;
  modal.hidden=true;modalVideo.innerHTML='';document.body.classList.remove('modal-open');
  if(wasPlayingBeforeModal){try{startMusic();}catch(_){}}
}
$$('[data-video]').forEach(b=>b.addEventListener('click',()=>openVideo(
  b.dataset.video,
  b.dataset.playlistIndex||0,
  b.dataset.youtubeUrl||'',
  b.dataset.youtubeId||'',
  b.dataset.platform||'youtube',
  b.dataset.videoTitle||''
)));
$$('[data-close-modal]').forEach(b=>b.addEventListener('click',closeVideo));

// ---------------- Inquiry routing ----------------
$$('[data-inquiry]').forEach(b=>b.addEventListener('click',()=>{
  const v=b.dataset.inquiry,sel=$('#inquiryType');
  if(sel){[...sel.options].forEach(o=>{if(o.textContent===v||o.textContent.includes(v))sel.value=o.value});}
  $('#booking')?.scrollIntoView({behavior:'smooth'});
  setTimeout(()=>sel?.focus(),650);
}));

// ---------------- Reliable email delivery choices ----------------
const emailModal=$('#emailModal'),openGmail=$('#openGmail'),openMailApp=$('#openMailApp'),copyEmailMessage=$('#copyEmailMessage'),emailPreview=$('#emailPreview'),emailModalTitle=$('#emailModalTitle');
let currentEmailPayload={subject:'',body:''};
function gmailUrl(subject,body){
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(HAZIL.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
function mailtoUrl(subject,body){return `mailto:${HAZIL.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;}
function openEmailOptions(subject,body,title='Ready to send'){
  currentEmailPayload={subject,body};
  if(openGmail)openGmail.href=gmailUrl(subject,body);
  if(openMailApp)openMailApp.href=mailtoUrl(subject,body);
  if(emailPreview)emailPreview.value=`TO: ${HAZIL.email}\nSUBJECT: ${subject}\n\n${body}`;
  if(emailModalTitle)emailModalTitle.textContent=title;
  if(emailModal){emailModal.hidden=false;document.body.classList.add('modal-open');}
}
function closeEmail(){if(emailModal){emailModal.hidden=true;document.body.classList.remove('modal-open');}}
$$('[data-close-email]').forEach(b=>b.addEventListener('click',closeEmail));
$$('[data-compose]').forEach(a=>a.addEventListener('click',e=>{
  // Preserve Ctrl/Cmd-click behavior and the href fallback.
  if(e.ctrlKey||e.metaKey||e.shiftKey)return;
  e.preventDefault();openEmailOptions(a.dataset.compose||'HÄZIL Inquiry','Hello HÄZIL,\n\n','Email HÄZIL');
}));
if(copyEmailMessage)copyEmailMessage.addEventListener('click',async()=>{
  const text=emailPreview?.value||'';
  try{await navigator.clipboard.writeText(text);showToast('Email message copied.');}
  catch(_){emailPreview?.focus();emailPreview?.select();document.execCommand('copy');showToast('Email message copied.');}
});

async function postJSON(url,payload){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const res=await fetch(url,{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(payload),
      signal:controller.signal
    });
    let data={};
    try{data=await res.json();}catch(_){}
    if(!res.ok)throw Object.assign(new Error(data.error||`Request failed (${res.status})`),{status:res.status,data});
    return data;
  }finally{clearTimeout(timer);}
}
function setSubmitState(button,busy,busyText,normalText){
  if(!button)return;
  button.disabled=busy;
  button.setAttribute('aria-busy',String(busy));
  button.textContent=busy?busyText:normalText;
}
function businessFallback(fd){
  const subject=`HÄZIL / HAZIL Entertainment Group — ${fd.get('type')} Inquiry`;
  const body=`Name: ${fd.get('name')}\nEmail: ${fd.get('email')}\nPhone: ${fd.get('phone')||''}\nOrganization / Venue: ${fd.get('org')||''}\nProject / Event Date: ${fd.get('date')||''}\nCity / Location: ${fd.get('city')||''}\nInquiry Type: ${fd.get('type')}\nBudget / Offer: ${fd.get('budget')||''}\n\nMessage:\n${fd.get('message')}`;
  openEmailOptions(subject,body,'Business inquiry fallback');
}
const businessForm=$('#businessForm');
if(businessForm)businessForm.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!e.currentTarget.reportValidity())return;
  const form=e.currentTarget,fd=new FormData(form);
  const button=$('#businessSubmit'),status=$('#businessStatus');
  setSubmitState(button,true,'SENDING…','SEND BUSINESS INQUIRY →');
  if(status){status.textContent='Sending securely…';status.className='form-status is-working';}
  const payload={
    name:String(fd.get('name')||'').trim(),
    email:String(fd.get('email')||'').trim(),
    phone:String(fd.get('phone')||'').trim(),
    org:String(fd.get('org')||'').trim(),
    date:String(fd.get('date')||'').trim(),
    city:String(fd.get('city')||'').trim(),
    type:String(fd.get('type')||'').trim(),
    budget:String(fd.get('budget')||'').trim(),
    message:String(fd.get('message')||'').trim(),
    website:String(fd.get('website')||'').trim(),
    source:'hazil.atechspot.com'
  };
  try{
    await postJSON('/api/business-inquiry',payload);
    form.reset();
    if(status){status.textContent='✓ Inquiry sent. The HÄZIL business desk has received your request.';status.className='form-status is-success';}
    showToast('Business inquiry sent.');
    if(typeof window.gtag==='function')window.gtag('event','hazil_business_inquiry_sent',{inquiry_type:payload.type});
  }catch(err){
    console.warn('Business inquiry API unavailable:',err);
    if(status){status.textContent='Secure delivery is unavailable right now. Opening the email fallback…';status.className='form-status is-error';}
    showToast('Secure delivery unavailable — use the email fallback.');
    businessFallback(fd);
  }finally{
    setSubmitState(button,false,'SENDING…','SEND BUSINESS INQUIRY →');
  }
});
const fanForm=$('#fanForm');
if(fanForm)fanForm.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!e.currentTarget.reportValidity())return;
  const form=e.currentTarget,fd=new FormData(form);
  const email=String(fd.get('email')||'').trim();
  const consent=Boolean(fd.get('consent'));
  const button=$('#fanSubmit'),msg=$('#fanMessage');
  setSubmitState(button,true,'JOINING…','JOIN →');
  if(msg){msg.textContent='Adding you to HÄZIL Nation…';msg.className='form-status is-working';}
  try{
    const data=await postJSON('/api/fan-signup',{
      email,
      consent,
      website:String(fd.get('website')||'').trim(),
      source:'hazil.atechspot.com'
    });
    form.reset();
    if(msg){msg.textContent=data.message||'✓ You’re on the list. Welcome to HÄZIL Nation.';msg.className='form-status is-success';}
    showToast('Welcome to HÄZIL Nation.');
    if(typeof window.gtag==='function')window.gtag('event','hazil_fan_signup');
  }catch(err){
    console.warn('Fan signup API unavailable:',err);
    if(msg){msg.textContent='Signup service is unavailable right now. Use the email option to contact HÄZIL.';msg.className='form-status is-error';}
    showToast('Signup service unavailable.');
    openEmailOptions('Join HÄZIL Nation',`Please add ${email} to HÄZIL Nation updates.\n\nFan email: ${email}`,'HÄZIL Nation fallback');
  }finally{
    setSubmitState(button,false,'JOINING…','JOIN →');
  }
});

// ---------------- Approval demo ----------------
function updateQueue(){const left=$$('.console-item:not(.done)').length;const q=$('#queueCount');if(q)q.textContent=`${left} decision${left===1?'':'s'}`;}
$$('[data-q]').forEach(b=>b.addEventListener('click',()=>{
  const item=b.closest('.console-item'),action=b.dataset.q;if(!item)return;
  if(action==='correct'){
    const rule=prompt('What should the AI correct or remember for next time?');
    if(rule&&rule.trim()){
      const small=item.querySelector('small');if(small)small.textContent=`Correction recorded: ${rule.trim()}`;
      showToast('Correction recorded as a reusable AI rule.');
    }
    return;
  }
  item.classList.add('done');
  showToast(action==='approve'?'Approved — routed to the next workflow.':'Rejected — returned for AI revision.');
  updateQueue();
}));

// ---------------- Search ----------------
const searchPanel=$('#searchPanel'),searchInput=$('#siteSearch'),searchResults=$('#searchResults');
const searchIndex=[
{tag:'MUSIC',title:'The HÄZIL Catalog',href:'#music',keys:'music songs someday greater krucial we up spotify apple amazon soundcloud'},
{tag:'VIDEO',title:'HÄZIL Cinema',href:'#cinema',keys:'watch video youtube film cinema krucial uploads'},
{tag:'1M',title:'Road to 1 Million Subscribers',href:'#road-to-million',keys:'youtube subscribers subscribe million 1m fans road videos channel'},
{tag:'BUY',title:'Buy / Support the Music',href:'#shop',keys:'buy download purchase store music apple amazon'},
{tag:'ARTIST',title:'The HÄZIL Story',href:'#story',keys:'story bio artist biography epk press'},
{tag:'FANS',title:'HÄZIL Nation',href:'#nation',keys:'follow fans instagram facebook x youtube join'},
{tag:'COMPANY',title:'HAZIL Entertainment Group',href:'#group',keys:'company records publishing sync sound pictures live labs commerce'},
{tag:'AI',title:'AI Entertainment OS',href:'#ai',keys:'ai automation agents studio approval command center'},
{tag:'BUSINESS',title:'Music Licensing',href:'#licensing',keys:'licensing sync film tv advertising jingle soundtrack score documentary'},
{tag:'CONTACT',title:'Booking / Business Inquiry',href:'#booking',keys:'booking contact press venue appearance collaboration business email'}
];
function renderSearch(q=''){
  if(!searchResults)return;
  const words=q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const rows=searchIndex.filter(x=>!words.length||words.every(w=>(x.title+' '+x.keys+' '+x.tag).toLowerCase().includes(w)));
  searchResults.innerHTML=rows.map(x=>`<a href="${x.href}" data-search-result><span>${x.tag}</span><strong>${x.title}</strong></a>`).join('')||'<p>No match yet. Try “music”, “video”, “booking”, “licensing” or “AI”.</p>';
  $$('[data-search-result]').forEach(a=>a.addEventListener('click',closeSearch));
}
function openSearch(){if(!searchPanel)return;searchPanel.hidden=false;document.body.classList.add('modal-open');renderSearch('');setTimeout(()=>searchInput?.focus(),30);}
function closeSearch(){if(!searchPanel)return;searchPanel.hidden=true;document.body.classList.remove('modal-open');if(searchInput)searchInput.value='';}
$('#searchOpen')?.addEventListener('click',openSearch);$('#searchClose')?.addEventListener('click',closeSearch);searchInput?.addEventListener('input',e=>renderSearch(e.target.value));

document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(modal&&!modal.hidden)closeVideo();
  if(emailModal&&!emailModal.hidden)closeEmail();
  if(searchPanel&&!searchPanel.hidden)closeSearch();
});

// Mark outbound links that failed to be configured very visibly during development.
$$('a[href="#"],button[data-video]:not([data-youtube-url])').forEach(el=>el.classList.add('needs-link-review'));

// =========================================================
// HÄZIL ARKS · CINEMA 7.0 — flagship interaction layer
// =========================================================

// Slide-out artist / signal profile: uses only real positioning and stated goals.
const profileRail=$('#profileRail'),profilePanel=$('#profilePanel'),profileClose=$('#profileClose');
function openProfile(){
  if(!profilePanel)return;
  profilePanel.classList.add('open');
  profilePanel.setAttribute('aria-hidden','false');
  profileRail?.setAttribute('aria-expanded','true');
}
function closeProfile(){
  if(!profilePanel)return;
  profilePanel.classList.remove('open');
  profilePanel.setAttribute('aria-hidden','true');
  profileRail?.setAttribute('aria-expanded','false');
}
profileRail?.addEventListener('click',()=>profilePanel?.classList.contains('open')?closeProfile():openProfile());
profileClose?.addEventListener('click',closeProfile);
$$('#profilePanel a').forEach(a=>a.addEventListener('click',closeProfile));

// Full-screen premiere room carousel. No dependency, no autoplay trap, keyboard accessible.
const premiereSlides=$$('.premiere-slide'),premierePrev=$('#premierePrev'),premiereNext=$('#premiereNext'),premiereCounter=$('#premiereCounter');
let premiereIndex=0;
function showPremiere(index){
  if(!premiereSlides.length)return;
  premiereIndex=(index+premiereSlides.length)%premiereSlides.length;
  premiereSlides.forEach((slide,i)=>slide.classList.toggle('is-active',i===premiereIndex));
  if(premiereCounter)premiereCounter.textContent=`${String(premiereIndex+1).padStart(2,'0')} / ${String(premiereSlides.length).padStart(2,'0')}`;
}
premierePrev?.addEventListener('click',()=>showPremiere(premiereIndex-1));
premiereNext?.addEventListener('click',()=>showPremiere(premiereIndex+1));
showPremiere(0);

// Keyboard navigation when the premiere room is on screen.
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&profilePanel?.classList.contains('open'))closeProfile();
  const room=$('#premiere-room');
  if(!room)return;
  const r=room.getBoundingClientRect();
  const visible=r.top<innerHeight*.8&&r.bottom>innerHeight*.2;
  if(!visible)return;
  if(e.key==='ArrowLeft')showPremiere(premiereIndex-1);
  if(e.key==='ArrowRight')showPremiere(premiereIndex+1);
});

// Subtle pointer parallax for the intro and archive wall. The content still works without it.
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
if(!reducedMotion&&window.matchMedia?.('(pointer:fine)').matches){
  const orbit=$('#gateOrbit');
  gate?.addEventListener('pointermove',e=>{
    if(!orbit)return;
    const x=(e.clientX/innerWidth-.5)*10,y=(e.clientY/innerHeight-.5)*8;
    orbit.style.transform=`translate3d(${x}px,${y}px,0)`;
  });
  gate?.addEventListener('pointerleave',()=>{if(orbit)orbit.style.transform='';});

  const archiveCanvas=$('#archiveCanvas');
  archiveCanvas?.addEventListener('pointermove',e=>{
    const rect=archiveCanvas.getBoundingClientRect();
    const dx=(e.clientX-rect.left)/rect.width-.5,dy=(e.clientY-rect.top)/rect.height-.5;
    $$('.archive-card',archiveCanvas).forEach((card,i)=>{
      const depth=(i%3+1)*2.2;
      card.style.marginLeft=`${dx*depth}px`;
      card.style.marginTop=`${dy*depth}px`;
    });
  });
  archiveCanvas?.addEventListener('pointerleave',()=>$$('.archive-card',archiveCanvas).forEach(card=>{card.style.marginLeft='';card.style.marginTop='';}));
}

// Expand search to the new experience architecture.
if(typeof searchIndex!=='undefined'){
  searchIndex.push(
    {tag:'GLOBAL',title:'The Global Signal',href:'#world-signal',keys:'world global 8 billion possibilities reach watch listen buy license'},
    {tag:'PREMIERE',title:'HÄZIL Premiere Room',href:'#premiere-room',keys:'premiere videos feature visual cinema carousel'},
    {tag:'ARCHIVE',title:'The HÄZIL Archive Wall',href:'#archive-wall',keys:'archive wall museum images epk about book music watch'}
  );
}


// ---------------- Left-edge platforms panel ----------------
const platformEdge=$('#platformEdge'),platformPanel=$('#platformPanel'),platformClose=$('#platformClose');
let platformAutoTimer=null;
function openPlatformPanel(){
  if(!platformPanel)return;
  platformPanel.classList.add('open');
  platformPanel.setAttribute('aria-hidden','false');
  platformEdge?.setAttribute('aria-expanded','true');
}
function closePlatformPanel(){
  if(!platformPanel)return;
  platformPanel.classList.remove('open');
  platformPanel.setAttribute('aria-hidden','true');
  platformEdge?.setAttribute('aria-expanded','false');
}
platformEdge?.addEventListener('click',()=>platformPanel?.classList.contains('open')?closePlatformPanel():openPlatformPanel());
platformClose?.addEventListener('click',closePlatformPanel);
platformPanel?.addEventListener('mouseleave',()=>{clearTimeout(platformAutoTimer);platformAutoTimer=setTimeout(closePlatformPanel,160);});
platformPanel?.addEventListener('mouseenter',()=>clearTimeout(platformAutoTimer));
if(window.matchMedia?.('(pointer:fine)').matches){
  document.addEventListener('mousemove',e=>{
    if(e.clientX<=26){openPlatformPanel();}
    else if(platformPanel?.classList.contains('open')&&!platformPanel.matches(':hover')&&e.clientX>platformPanel.offsetWidth+40){
      clearTimeout(platformAutoTimer);
      platformAutoTimer=setTimeout(closePlatformPanel,180);
    }
  });
}
$$('#platformPanel a').forEach(a=>a.addEventListener('click',()=>setTimeout(closePlatformPanel,60)));


// =========================================================
// HÄZIL ARKS · CINEMA 10 — accessibility + interaction QA
// =========================================================
(() => {
  let lastFocused = null;
  const rememberFocus = () => { lastFocused = document.activeElement; };
  const restoreFocus = () => {
    if (lastFocused && typeof lastFocused.focus === 'function') {
      try { lastFocused.focus({preventScroll:true}); } catch (_) { try { lastFocused.focus(); } catch (_) {} }
    }
  };

  const dialogOpeners = [
    document.getElementById('searchOpen'),
    ...document.querySelectorAll('[data-video]'),
    ...document.querySelectorAll('[data-compose]')
  ].filter(Boolean);
  dialogOpeners.forEach(el => el.addEventListener('click', rememberFocus, {capture:true}));

  document.querySelectorAll('[data-close-modal],[data-close-email],#searchClose').forEach(el => {
    el.addEventListener('click', () => setTimeout(restoreFocus, 0));
  });

  // Prevent accidental background interaction when a dialog is open.
  const dialogIds = ['videoModal','emailModal','searchPanel'];
  dialogIds.forEach(id => {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    dialog.addEventListener('click', e => {
      if (e.target === dialog) {
        const close = dialog.querySelector('[data-close-modal],[data-close-email],#searchClose');
        if (close) close.click();
      }
    });
  });

  // Improve keyboard discoverability for the moving/interactive archive cards.
  document.querySelectorAll('.archive-card a').forEach(a => {
    a.addEventListener('focus', () => a.closest('.archive-card')?.classList.add('is-focused'));
    a.addEventListener('blur', () => a.closest('.archive-card')?.classList.remove('is-focused'));
  });

  // Ensure the current page announces the final build for support/debugging without UI clutter.
  window.HAZIL_ARKS_BUILD = '10.0';
})();
