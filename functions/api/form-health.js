const json=(data,status=200)=>new Response(JSON.stringify(data),{
  status,
  headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
});
export function onRequestGet({env}){
  const fan=Boolean(env.RESEND_API_KEY);
  const business=Boolean(env.RESEND_API_KEY&&(env.HAZIL_FROM_EMAIL||env.FROM_EMAIL));
  return json({
    ok:fan&&business,
    fan_signup:fan?'configured':'needs RESEND_API_KEY',
    business_inquiry:business?'configured':'needs RESEND_API_KEY + HAZIL_FROM_EMAIL/FROM_EMAIL',
    segment:env.HAZIL_SEGMENT_ID?'configured':'optional'
  },fan&&business?200:503);
}
