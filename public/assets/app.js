const menuBtn=document.querySelector('.menuBtn');
const navlinks=document.querySelector('.navlinks');
if(menuBtn&&navlinks){menuBtn.addEventListener('click',()=>{const open=navlinks.classList.toggle('open');menuBtn.setAttribute('aria-expanded',String(open));});navlinks.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{navlinks.classList.remove('open');menuBtn.setAttribute('aria-expanded','false')}));}

const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduce&&'IntersectionObserver'in window){const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>io.observe(el));}else{document.querySelectorAll('.reveal').forEach(el=>el.classList.add('in'));}

const modal=document.querySelector('#videoModal');const modalBox=modal?.querySelector('.modalVideo');let lastFocus=null;
function openVideo(id){if(!modal||!modalBox)return;lastFocus=document.activeElement;modalBox.innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1" title="HÄZIL video" allow="autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe>`;modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';modal.querySelector('.modalClose')?.focus();}
function closeVideo(){if(!modal)return;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');if(modalBox)modalBox.innerHTML='';document.body.style.overflow='';lastFocus?.focus?.();}
document.querySelectorAll('[data-video]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();openVideo(el.dataset.video)}));modal?.querySelector('.modalClose')?.addEventListener('click',closeVideo);modal?.addEventListener('click',e=>{if(e.target===modal)closeVideo()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal?.classList.contains('open'))closeVideo()});

async function submitJson(form,endpoint,statusEl){const data=Object.fromEntries(new FormData(form).entries());statusEl.textContent='Sending…';try{const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const body=await res.json().catch(()=>({}));if(!res.ok)throw new Error(body.error||'Unable to submit right now.');statusEl.textContent=body.message||'Received. Thank you.';form.reset();}catch(err){statusEl.textContent=err.message||'Unable to submit right now. Please try again later.';}}
const fanForm=document.querySelector('#fanSignup');if(fanForm){fanForm.addEventListener('submit',e=>{e.preventDefault();submitJson(fanForm,'/api/subscribe',document.querySelector('#fanStatus'));});}
const inquiryForm=document.querySelector('#inquiryForm');if(inquiryForm){inquiryForm.addEventListener('submit',e=>{e.preventDefault();submitJson(inquiryForm,'/api/inquiry',document.querySelector('#inquiryStatus'));});}
