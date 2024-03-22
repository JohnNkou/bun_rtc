import WS_CONSTANT from '../src/constant/WS_CONSTANT';

const registrations = {};

Bun.serve({
	port:8000,
	fetch(req,server){
		if(server.upgrade(req)){
			return;
		}

		return new Response("Upgrade failed", { status:500});
	},
	websocket: {
		message(ws,message){
			try{
				let data = JSON.parse(message),
				type = data.type;

				switch(type){
				case WS_CONSTANT.REGISTRATION:
					let users = [];

					ws.id = data.id;

					for(let id in registrations){
						let user = registrations[id];

						user.ws.send(JSON.stringify({
							type: WS_CONSTANT.NEW_USER,
							user:{
								id:data.id
							}
						}))
						users.push({...user,ws:undefined});
					}

					registrations[data.id] = { ws, id:data.id };

					ws.send(JSON.stringify({
						type: WS_CONSTANT.USERS,
						users
					}));

					break;
				case WS_CONSTANT.CANDIDATE:
				case WS_CONSTANT.OFFER:
					if(data.target){
						let peer = registrations[data.target];

						if(peer){
							peer.ws.send(message);
						}
						else{
							console.error("Target not registered",data.target);
						}
					}
					else{
						console.error("No target given in candidate type ",data);
						ws.send(JSON.stringify({
							type:'ERROR',
							message:"No target given in candidate type"
						}))
					}
					break;
				default:
					console.error("Unknwonw message type ",data);
				}
			}
			catch(e){
				console.error("Error parsing message",e);
			}
		},
		open(ws){
			ws.send(JSON.stringify({
				type:"Hello",
				message:"Bangladesh"
			}))
		},
		close(ws,code,message){
			let id = (ws.id)? ws.id : "";

			if(id){
				delete registrations[id];
			}

			console.log("Closed ",id);
		}
	}
})