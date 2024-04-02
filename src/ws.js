let instance;

export default function ws(){
	if(instance){
		return instance;
	}

	instance = this;

	let ws = new WebSocket(`wss://${location.hostname}:8000`),
	registrations = {},
	openWaiters = [],
	opened = false,
	craps = [],
	id = 0;

	ws.onerror = function(e){
		console.error("Error initializing websocket",e);
	}

	ws.onmessage = function(message){
		if(!opened){
			opened = true;
			openWaiters.forEach((waiter)=> waiter());
		}

		try{
			let data = JSON.parse(message.data),
			type = data.type,
			subscribers = registrations[type];

			if(subscribers){
				for(let id in subscribers){
					subscribers[id](data);
				}
			}
			else{
				craps.push(data);
			}
		}
		catch(e){
			console.error("Error in on message",e);
		}
	}

	this.getCraps = ()=> craps;

	this.removeCraps = (ids)=>{
		ids.forEach((id)=> craps.splice(id,1));
	}

	this.json = function(data){
		try{
			ws.send(JSON.stringify(data));
		}
		catch(e){
			console.error("Error sending json",e);
		}
	}

	this.registerOpen = function(fn){
		if(!opened){
			openWaiters.push(fn);
		}
		else{
			fn();
		}
	}

	this.register = function(type,fn){
		let subscribers = registrations[type],
		myId = id++;

		if(!subscribers){
			subscribers = registrations[type] = {};
		}

		subscribers[myId] = fn;

		return function(){
			delete subscribers[myId];
		}
	}
}