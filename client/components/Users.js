import { useState, useEffect, createRef } from 'react';
import wsBuilder from '../../src/ws.js'
import WS_CONSTANT from '../../src/constant/WS_CONSTANT.js'
import rtcBuilder, { getDevices } from '../../src/rtc.js'

export default function Users(){
	let [ clients, setClients ] = useState([]),
	[id, setId] = useState(Math.random()),
	[ws, setWs] = useState(null),
	[myStreams, setStreams] = useState(null),
	[offers, setOffers] = useState({});

	useEffect(()=>{
		let ws = new wsBuilder();

		ws.registerOpen(()=>{
			ws.json({
				type: WS_CONSTANT.REGISTRATION,
				id
			})
		})

		getDevices({audio:true, video:true}).then((stream)=>{
			setStreams(stream);

		}).catch((error)=>{
			console.error("Error setting stream",error);
		}).finally(()=>{
			setWs(ws);
		})

		ws.register(WS_CONSTANT.USERS, (data)=>{
			setClients(data.users);
		})

		ws.register(WS_CONSTANT.NEW_USER,(data)=>{
			clients.push({...data.user,new:true});

			setClients([...clients]);
		})

		ws.register(WS_CONSTANT.OFFER,(data)=>{
			offers[data.origin] = data.offer;

			setOffers({...offers});
		})
	},[true]);

	return <div>
		<button >Stop everything</button>
		<video />
		<button >Mute video</button>
		<button >Mute audio</button>
		<div>
			{clients.map((client)=>{
				return <User key={client.id} id={id} myStream={myStreams} offers={offers} data={client} ws={ws} />
			})}
		</div>
	</div>
}

function User({data, ws, id, offers, myStream}){
	let [peer, setPeer] = useState(new rtcBuilder()),
	[state, setState] = useState('');

	useEffect(()=>{

		if(ws && myStream){

			window.peer = peer;

			ws.register(WS_CONSTANT.OFFER,async (message)=>{
					let offer = message.offer;

					if(data.new){
						console.log("answer from new",offer);
						await peer.setRemoteDescription(offer);
					}
					else{
						console.log("Offer received",offer);
						await peer.setRemoteDescription(offer);
						await peer.setLocalDescription();

						ws.json({
							type: WS_CONSTANT.OFFER,
							offer: peer.getLocalDescription(),
							target: data.id
						})
					}
				})

			if(data.new){
				for(const track of myStream.getTracks()){
					console.log('adding track');
					peer.addTrack(track,myStream);
				}

				peer.registerOffer((offer)=>{
					console.log("Sending offer",offer);
					ws.json({
						type:WS_CONSTANT.OFFER,
						offer,
						target: data.id,
						origin:id
					})
				})
			}
			else{
				if(offers[data.id]){
					console.log("setting remote offer");
					peer.setRemoteDescription(offers[data.id]).then(async ()=>{
						for(const track of myStream.getTracks()){
							console.log('adding track');
							peer.addTrack(track,myStream);
						}
						console.log("setting local offer");
						let answer = await peer.createAnswer();
						peer.setLocalDescription(answer);

						ws.json({
							type: WS_CONSTANT.OFFER,
							offer: answer,
							target: data.id
						})
					}).catch((error)=>{
						console.error("Error white setting saved offer",error);
					})
				}
				else{
					console.log("Waiting offer",id,Date.now());	
				}
			}

			ws.register(WS_CONSTANT.CANDIDATE,(data)=>{
				if(data.target == id){
					peer.addCandidate(data.candidate);
				}
				else{
					console.error("Received an add candidate with a bad target",data,id);
				}
			})

			peer.registerCandidate((candidate)=>{
				ws.json({ type: WS_CONSTANT.CANDIDATE, candidate, target:data.id })
			})
		}
	},[ws,myStream]);

	if(!id){
		return "No id given";
	}

	return <div>
		<p><span>{data.id}</span><span>{state}</span><span><video controls={true} autoPlay srcObject={myStream} /></span></p>
	</div>
}