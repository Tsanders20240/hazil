const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(v||'');
const safe=(v,max=500)=>String(v??'').trim().slice(0,max);
async function resendFetch(path,apiKey,init={}){return fetch(`https://api.resend.com${path}`,{...init,headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json',...(init.headers||{})}});}
export async function onRequestPost({request,env}){let body={};try{body=await request.json();}catch{return json({ok:false,error:'Invalid request.'},400);}
if(safe(body.website,200))return json({ok:true,message:'Thank you.'});
const email=safe(body.email,254).toLowerCase(),name=safe(body.name,80),city=safe(body.city,120),consent=body.consent===true;
if(!emailOk(email))return json({ok:false,error:'Enter a valid email address.'},400);
if(!consent)return json({ok:false,error:'Consent is required to join the KRUCIAL Inner Circle.'},400);
if(!env.RESEND_API_KEY)return json({ok:false,error:'Fan signup is not configured yet.'},503);
const contactBody={email,unsubscribed:false};if(env.HAZIL_SEGMENT_ID)contactBody.segments=[{id:env.HAZIL_SEGMENT_ID}];
let contactRes=await resendFetch('/contacts',env.RESEND_API_KEY,{method:'POST',body:JSON.stringify(contactBody)});
if(!contactRes.ok){const patchRes=await resendFetch(`/contacts/${encodeURIComponent(email)}`,env.RESEND_API_KEY,{method:'PATCH',body:JSON.stringify({unsubscribed:false})});if(!patchRes.ok){const detail=await contactRes.text().catch(()=> '');console.error('Resend contact create/update failed',contactRes.status,detail.slice(0,300));return json({ok:false,error:'We could not add this email right now.'},502);}if(env.HAZIL_SEGMENT_ID){await resendFetch(`/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(env.HAZIL_SEGMENT_ID)}`,env.RESEND_API_KEY,{method:'POST'}).catch(()=>{});}}
const to=env.HAZIL_TO_EMAIL||env.FORM_TO_EMAIL||'hazilflix@gmail.com',from=env.HAZIL_FROM_EMAIL||env.FROM_EMAIL;
if(from){resendFetch('/emails',env.RESEND_API_KEY,{method:'POST',body:JSON.stringify({from,to:[to],subject:'New KRUCIAL Inner Circle signup',text:`New KRUCIAL fan signup\n\nName: ${name}\nEmail: ${email}\nCity: ${city}\nSource: ${safe(body.source,120)||'hazil.atechspot.com/krucial'}`})}).catch(()=>{});}
return json({ok:true,message:'✓ You’re on the KRUCIAL list.'});}
export function onRequestGet(){return json({ok:false,error:'Method not allowed.'},405);}