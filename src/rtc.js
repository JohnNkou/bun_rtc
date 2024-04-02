const config = {
	iceServers:[
		{
			credential:"pala",
			urls:"turn:snip.egouv.online:8889",
			username:"tartar"
		}
	],
	iceTransportPolicy:"relay"
}

export async function getDevices({audio=true,video=false}){
	try{
		const stream = await navigator.mediaDevices.getUserMedia({audio,video});

		return stream;
	}
	catch(e){

	}
}

export default function rtcBuilder(){
	console.log('config',config);
	let peer = new RTCPeerConnection(config),
	waitingOffer = [],
	waitingCandidate = [],
	waitingStream = [],
	localSet;

	this.registerOffer = (fn)=>{
		waitingOffer.push(fn);
	}

	this.registerCandidate = (fn)=>{
		waitingCandidate.push(fn);
	}

	this.registerStream = (fn)=>{
		waitingStream.push(fn);
	}

	this.getLocalDescription = ()=>{
		return peer.localDescription;
	}

	this.getRemoteDescription = ()=>{
		return peer.remoteDescription;
	}

	this.setLocalDescription = async ()=>{
		if(!localSet){
			await peer.setLocalDescription();
		}
		localSet = true;
	}
	this.setRemoteDescription = async (remote)=>{
		await peer.setRemoteDescription(remote);
	}

	this.addTrack = (track,stream)=>{
		console.log("Adding track");
		peer.addTrack(track,stream);
	}

	this.createOffer = async (data={})=>{
		return await peer.createOffer(data);
	}

	this.createAnswer = async (data={})=>{
		return await peer.createAnswer(data);
	}

	this.addCandidate = (candidate)=>{
		console.log("adding candidate",candidate);
		peer.addIceCandidate(candidate);
	}

	this.close = ()=>{
		peer.close();
	}

	peer.ontrack = (e)=>{
		console.log("received stream, Element number in stram", e.streams.length);
		let stream = e.streams[0];

		waitingStream.forEach((waiter)=> waiter(stream));
	}

	peer.onnegotiationneeded = async ()=>{
		try{
			console.log("Starting negotation");
			let offer = await peer.createOffer();
			await peer.setLocalDescription(offer);

			waitingOffer.forEach((waiter)=> waiter(offer));
		}
		catch(err){
			console.error("Error on onnegotiationneeded",err);
		}
	}

	peer.onicecandidate = function(e){
		let candidate = {},
		fnType = typeof eval;

		for(let name in e.candidate){
			if(typeof e.candidate[name] != fnType){
				candidate[name] = e.candidate[name];
			}
		}
		console.log('sending candidate',e.candidate);

		waitingCandidate.forEach((waiter)=> waiter(candidate));
	}
}