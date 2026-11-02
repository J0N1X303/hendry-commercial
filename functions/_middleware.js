// Source files and retired beta routes must never fall back to static content.
export function onRequest({request,next}) {
  let path;
  try {path=decodeURIComponent(new URL(request.url).pathname);}catch{return new Response('Not found',{status:404});}
  if (/^\/(?:lib|functions|tests|scripts|migrations|casey-beta|cara)(?:\/|$)/.test(path)
    || /(?:^|\/)README\.md$/i.test(path)) {
    return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
  }
  return next();
}
