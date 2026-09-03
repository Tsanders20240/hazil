const json=(data,status=200)=>new Response(JSON.stringify(data),{
  status,
  headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
});
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(v||'');
const safe=(v,max=1200)=>String(v??'').replace(/[<>]/g,'').trim().slice(0,max);

export async function onRequestPost({request,env}){
  let b={};
  try{b=await request.json();}catch(_){return json({ok:false,error:'Invalid request.'},400);}

  if(safe(b.website,200))return json({ok:true,message:'Thank you.'});

  const name=safe(b.name,120);
  const email=safe(b.email,254).toLowerCase();
  const type=safe(b.type,120);
  const message=safe(b.message,5000);
  if(!name||!emailOk(email)||!type||!message){
    return json({ok:false,error:'Name, email, inquiry type and message are required.'},400);
  }
  if(!env.RESEND_API_KEY)return json({ok:false,error:'Business inquiry delivery is not configured yet.'},503);
  const from=env.HAZIL_FROM_EMAIL||env.FROM_EMAIL;
  if(!from)return json({ok:false,error:'The HÄZIL sender address is not configured yet.'},503);

  const to=env.HAZIL_TO_EMAIL||env.FORM_TO_EMAIL||'hazilflix@gmail.com';
  const phone=safe(b.phone,80),org=safe(b.org,160),date=safe(b.date,40),city=safe(b.city,160),budget=safe(b.budget,160);
  const source=safe(b.source,120)||'hazil.atechspot.com';
  const text=[
    'HÄZIL / HAZIL Entertainment Group — New Business Inquiry',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `Organization / Venue: ${org}`,
    `Project / Event Date: ${date}`,
    `City / Location: ${city}`,
    `Inquiry Type: ${type}`,
    `Budget / Offer: ${budget}`,
    `Source: ${source}`,
    '',
    'Message:',
    message
  ].join('\n');

  const resend=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{
      'Authorization':`Bearer ${env.RESEND_API_KEY}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      from,
      to:[to],
      reply_to:email,
      subject:`HÄZIL — ${type} Inquiry — ${name}`,
      text
    })
  });

  if(!resend.ok){
    const detail=await resend.text().catch(()=> '');
    console.error('Resend business inquiry failed',resend.status,detail.slice(0,500));
    return json({ok:false,error:'The inquiry could not be delivered right now.'},502);
  }

  return json({ok:true,message:'Inquiry delivered.'});
}

export function onRequestGet(){return json({ok:false,error:'Method not allowed.'},405);}
