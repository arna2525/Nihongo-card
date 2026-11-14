const http=require('http'),fs=require('fs'),path=require('path');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};
const root=__dirname,port=+(process.argv[2]||8000);
http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';const f=path.resolve(root,'.'+u);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(f).pipe(res);}).listen(port,'0.0.0.0',()=>console.log('http://localhost:'+port));
