import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

export function serve(rootName='dist',port=4330) {
 const root=resolve(rootName);
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json','.xml':'application/xml','.txt':'text/plain','.webmanifest':'application/manifest+json'};
 const server=createServer(async(req,res)=>{
  try {
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   let file=resolve(root,'.'+pathname);
   if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
   let status=200;
   try { if((await stat(file)).isDirectory()) file=resolve(file,'index.html'); await stat(file); }
   catch { file=resolve(root,'404.html');status=404; }
   const content=await readFile(file);
   res.writeHead(status,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});
   res.end(content);
  } catch {res.writeHead(500);res.end('Preview error');}
 });
 server.listen(port,'127.0.0.1',()=>console.log(`Static preview: http://127.0.0.1:${port}`));
 return server;
}
if(process.argv[1]?.endsWith('static-preview.mjs')) serve(process.argv[2]||'dist',Number(process.argv[3]||4330));
