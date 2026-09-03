const json=(data,status=200,cache='no-store')=>new Response(JSON.stringify(data),{
  status,
  headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':cache}
});

export async function onRequestGet({request}){
  const url=new URL(request.url);
  const id=(url.searchParams.get('id')||'').trim();
  if(!/^[A-Za-z0-9_-]{11}$/.test(id))return json({ok:false,error:'Invalid video id.'},400);

  const watch=`https://www.youtube.com/watch?v=${id}`;
  const endpoint=`https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`;
  try{
    const res=await fetch(endpoint,{headers:{'Accept':'application/json'}});
    if(!res.ok)return json({ok:false,error:'Video metadata unavailable.'},res.status);
    const data=await res.json();
    return json({
      ok:true,
      id,
      title:String(data.title||'').trim(),
      author:String(data.author_name||'').trim()
    },200,'public, max-age=86400, s-maxage=86400');
  }catch(_){
    return json({ok:false,error:'Video metadata unavailable.'},502);
  }
}

export function onRequestPost(){return json({ok:false,error:'Method not allowed.'},405);}
