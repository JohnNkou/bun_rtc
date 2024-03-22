import App from './server/index.js'
import { renderToReadableStream } from 'react-dom/server'

Bun.serve({
	port:80,
	async fetch(req){
		let url = new URL(req.url);

		if(url.pathname == '/'){
			return new Response(await renderToReadableStream(<App />));
		}
		else if(url.pathname.indexOf('/bundle') != -1){
			return new Response(Bun.file("./bundle/index.js"));
		}
		else{
			new Response("Bad thins happened",{ status:500 });
		}
	}
})