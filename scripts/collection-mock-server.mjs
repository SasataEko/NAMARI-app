// Local two-origin browser smoke-test server. NO CORS headers are deliberately added.
import http from 'node:http';
const receipts=new Set();
const jsonpHandler=async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1:8799');
 if(req.method==='POST'){let body='';for await(const b of req)body+=b;const r=JSON.parse(body).response;receipts.add(r.id);res.end('{"ok":true}');return;}
 if(u.pathname==='/exec'){res.statusCode=302;res.setHeader('Location','http://127.0.0.1:8798/jsonp'+u.search);res.end();return;}
 const callback=u.searchParams.get('callback');if(!/^namari_[a-f0-9]+$/.test(callback||'')){res.statusCode=403;res.end('denied');return;}
 const data=u.searchParams.get('action')==='receipt'?{ok:true,received:receipts.has(u.searchParams.get('submissionId'))}:{ok:true,aggregate:{source:'local-cross-origin-mock',count:0,suppressed:true}};
 res.setHeader('Content-Type','application/javascript');res.setHeader('Cache-Control','no-store');res.end(`${callback}(${JSON.stringify(data)});`);
};
http.createServer(jsonpHandler).listen(8799,'127.0.0.1',()=>process.stdout.write('Cross-origin mock 8799 -> JSONP redirect 8798\n'));
http.createServer(jsonpHandler).listen(8798,'127.0.0.1');
