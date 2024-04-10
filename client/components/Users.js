import { useState, useEffect, createRef } from 'react';
import wsBuilder from '../../src/ws.js'
import WS_CONSTANT from '../../src/constant/WS_CONSTANT.js'
import rtcBuilder, { getDevices } from '../../src/rtc.js'

export default function Users(){
	let [ clients, setClients ] = useState([]),
	[id, setId] = useState(Math.random()),
	[ws, setWs] = useState(null),
	[myStreams, setStreams] = useState(null),
	[ref,setRef] = useState(createRef());

	useEffect(()=>{
		let ws = new wsBuilder();


		getDevices({audio:true, video:true}).then((stream)=>{
			setStreams(stream);

			ws.registerOpen(()=>{
				ws.json({
					type: WS_CONSTANT.REGISTRATION,
					id
				})
			})

		}).catch((error)=>{
			console.error("Error setting stream",error);
		}).finally(()=>{
			setWs(ws);
		})

		ws.register(WS_CONSTANT.USERS, (data)=>{
			setClients(data.users);
		})


	},[true]);

	useEffect(()=>{

		if(ws){
			let d1 = ws.register(WS_CONSTANT.NEW_USER,(data)=>{
				console.log('before',clients);
				clients.push({...data.user,new:true});

				console.log('new clients',clients);

				setClients([...clients]);
			}),
			d2 = ws.register(WS_CONSTANT.OFF_USER,(data)=>{
				for(let i=0; i < clients.length; i++){
					if(clients[i].id == data.id){
						clients.splice(i,1);
						console.log("Removing user ",data.id);
						break;
					}
				}
			});

			return ()=>{
				console.log("Deregistering");
				d1();
				d2();
			}
		}
	},[clients,ws])

	useEffect(()=>{
		let video = ref.current;
		if(video && myStreams){
			video.srcObject = myStreams;
			video.play();
		}
	},[ref.current,myStreams]);

	console.log('clients',clients);

	return <div>
		<video width='200' controls ref={ref}></video>
		<div>
			{clients.map((client)=>{
				return <User key={client.id} myId={id} myStream={myStreams} data={client} ws={ws} />
			})}
		</div>
	</div>
}

function User({data, ws, myId, myStream}){
	let [peer, setPeer] = useState(new rtcBuilder()),
	[state, setState] = useState(''),
	ref = createRef(),
	id = myId;

	useEffect(()=>{

		if(ws && myStream){

			console.warn("building user",data.id);

			let video = document.getElementById(data.id),
			craps = ws.getCraps(),
			peerStream;

			peer.onconnectionstatechange = function(){
				switch(peer.connectionState){
				case 'disconnected':
					let srcObject = video.srcObject;

					if(srcObject){
						console.log("Conenction disconnected");
						srcObject.getTracks().forEach((track)=>{
							track.stop();
						})
					}
					break;
				}
			}

			ws.register(WS_CONSTANT.CANDIDATE,(message)=>{
				if(message.origin == data.id){
					if(message.target == id){
						peer.addCandidate(message.candidate);
						console.log("From",message.origin);
					}
					else{
						console.error("Received an add candidate with a bad target",message,id);
					}
				}
				else{
					console.log("Not my candidate data",message.origin, data.id);
				}
			})

			peer.registerCandidate((candidate)=>{
				ws.json({ type: WS_CONSTANT.CANDIDATE, candidate, target:data.id, origin:id })
				console.log("To",data.id);
			})

			peer.registerStream((stream)=>{
				console.log("Setting video stream", video,stream.id,stream.getTracks().length);
				if(!video.srcObject){
					peerStream = stream;
					video.srcObject = stream;
					video.play();
				}
				else{
					console.log("video stream already set", stream.id);
				}
			})

			ws.register(WS_CONSTANT.OFFER,async (message)=>{
				if(message.origin == data.id){
					let offer = message.offer;

					if(data.new){
						console.log("answer from new");
						await peer.setRemoteDescription(offer);
					}
					else{
						console.log("Offer received");
						await peer.setRemoteDescription(offer);

						let answer = await peer.createAnswer();
						await peer.setLocalDescription(answer);

						console.log("Sending answer");

						ws.json({
							type: WS_CONSTANT.OFFER,
							offer: answer,
							target: data.id,
							origin:id
						})
					}
				}
				else{
					console.error("Not my offer data",message.origin, data.id,message);
				}
			})

			if(data.new){
				for(const track of myStream.getTracks()){
					peer.addTrack(track,myStream);
				}

				peer.registerOffer((offer)=>{
					console.log("Sending offer");
					ws.json({
						type:WS_CONSTANT.OFFER,
						offer,
						target: data.id,
						origin:id
					})
				})
			}
			else{
				
				console.log("Waiting offer",id,Date.now());	
			}

			if(craps.length){
				let toremove = [];
				craps.forEach((crap,i)=>{
					if(crap.origin == data.id){
						if(crap.type == WS_CONSTANT.CANDIDATE){
							peer.addCandidate(crap.candidate);
							toremove.push(i);
						}
						else if(crap.type == WS_CONSTANT.OFFER){
							console.log("setting remote offer");
							toremove.push(i);
							peer.setRemoteDescription(crap.offer).then(async ()=>{
								for(const track of myStream.getTracks()){
									peer.addTrack(track,myStream);
								}
								console.log("setting local offer");
								try{
									let answer = await peer.createAnswer();
									await peer.setLocalDescription(answer);

									ws.json({
										type: WS_CONSTANT.OFFER,
										offer: answer,
										target: data.id,
										origin:id
									})
								}
								catch(e){
									console.error("Error while trying to set local offer",e);
								}
							}).catch((error)=>{
								console.error("Error white setting saved offer",error);
							})
						}
					}
				});

				ws.removeCraps(toremove);
			}

			return ()=>{
				if(peerStream){
					peerStream.getTracks((track)=> track.stop());
				}
			}
		}
	},[ws,myStream]);

	if(!id){
		return "No id given";
	}

	function muteAudio(event){
		event.preventDefault();

		let video = ref.current,
		srcObject = video && video.srcObject;

		if(srcObject){
			srcObject.getAudioTracks().forEach((track)=>{
				track.enabled = !track.enabled
			})
		}
	}

	function muteVideo(event){
		event.preventDefault();

		let video = ref.current,
		srcObject = video && video.srcObject;

		if(srcObject){
			srcObject.getVideoTracks().forEach((track)=>{
				track.enabled = !track.enabled;
			})
		}
	}

	return <div>
		<p><span>{data.id}</span><span>{state}</span><span><video id={data.id} ref={ref} controls /></span></p>
		<p><button onClick={muteAudio}>Mute Audio</button><button onClick={muteVideo}>Mute video</button></p>
	</div>
}