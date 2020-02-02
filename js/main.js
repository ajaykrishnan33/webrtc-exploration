'use strict';

const mediaStreamConstraints = {
    video: {
        width: {
            min: 1280
        },
        height: {
            min: 720
        }
    },
    // audio: true
};

let startButtonAlice = document.getElementById('startButtonAlice');
let startButtonBob = document.getElementById('startButtonBob');
let callButtonAlice = document.getElementById('callButtonAlice');
let callButtonBob = document.getElementById('callButtonBob');
let hangupButtonAlice = document.getElementById('hangupButtonAlice');
let hangupButtonBob = document.getElementById('hangupButtonBob');

let sendMsgButtonAlice = document.getElementById('sendMsgButtonAlice');
let sendMsgButtonBob = document.getElementById('sendMsgButtonBob');

const aliceState = {
    localVideo: document.getElementById('aliceVideoLocal'),
    remoteVideo: document.getElementById('aliceVideoRemote'),
    textbox: document.getElementById('textareaAlice'),
    msgbox: document.getElementById('messagesAlice'),
    sendbtn: sendMsgButtonAlice,
    localStream: null,
    remoteStream: null,
    peerConnection: null,
    iceCandidate: null,
    description: null,
    dataChannel: null,
    messages: []
}

const bobState = {
    localVideo: document.getElementById('bobVideoLocal'),
    remoteVideo: document.getElementById('bobVideoRemote'),
    textbox: document.getElementById('textareaBob'),
    msgbox: document.getElementById('messagesBob'),
    sendbtn: sendMsgButtonBob,
    localStream: null,
    remoteStream: null,
    peerConnection: null,
    iceCandidate: null,
    description: null,
    dataChannel: null,
    messages: []
}

function getStartActionCallback(peer) {
    let localState, remoteState;
    if (peer === 'alice') {
        localState = aliceState;
        remoteState = bobState;
    }
    else {
        localState = bobState;
        remoteState = aliceState;
    }
    return function() {
        if (localState.localStream) {
            return;
        }
    
        navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
        .then((mediaStream) => {
            localState.localStream = mediaStream;
            localState.localVideo.srcObject = mediaStream;
            if (localState.peerConnection) {
                console.log('Adding stream to localPeerConnection1');
                localState.localStream.getTracks().forEach((track) => {
                    localState.peerConnection.addTrack(track, localState.localStream);
                });
            }
        })
        .catch((error) => {
            console.log('navigator.getUserMedia error: ', error);
        });
    }
}

// supposed to be called by signalling mechanism on receiving ice candidate
function getIceCandidateAvailableCallback(peer) {
    let localState, remoteState;
    if (peer === 'alice') {
        localState = aliceState;
        remoteState = bobState;
    }
    else {
        localState = bobState;
        remoteState = aliceState;
    }

    return function() {
        const iceCandidate = new RTCIceCandidate(localState.iceCandidate);
        remoteState.peerConnection.addIceCandidate(iceCandidate)
        .then(()=>{
            console.log('Local ice candidate added to remote successfully');
        })
        .catch(()=>{
            console.log('Error in adding local ice candidate to remote');
        });
    }
}

// supposed to be called by signalling mechanism on receiving SDP object (offer/answer)
function getDescriptionAvailableCallback(peer) {
    let localState, remoteState, otherPeer;
    if (peer === 'alice') {
        localState = aliceState;
        remoteState = bobState;
        otherPeer = 'bob';
    }
    else {
        localState = bobState;
        remoteState = aliceState;
        otherPeer = 'alice';
    }

    return function() {
        const description = localState.description;
        remoteState.peerConnection.setRemoteDescription(description)
        .then(() => {
            console.log('Set local description in remotePeer as remote description sucessfully');
            if (remoteState.peerConnection.signalingState === 'have-remote-offer') {
                remoteState.peerConnection.createAnswer()
                .then((description) => {
                    remoteState.peerConnection.setLocalDescription(description)
                    .then(() => {
                        remoteState.description = description;    
                        // onRemoteDescriptionAvailable();
                        getDescriptionAvailableCallback(otherPeer)();
                    })
                    .catch(() => {
                        console.log('Set remote description in remotePeer as local description failed');
                    });
                })
            }
            localState.sendbtn.disabled = false;
            localState.textbox.disabled = false;
        })
        .catch(() => {
            console.log('Error in setting local description in remotePeer as remote description');
        });
    }
}

function getNegotiationNeededCallback(peer) {
    let localState, remoteState, otherPeer;
    if (peer === 'alice') {
        localState = aliceState;
        remoteState = bobState;
        otherPeer = 'bob';
    }
    else {
        localState = bobState;
        remoteState = aliceState;
        otherPeer = 'alice';
    }

    return function() {
        localState.peerConnection.createOffer({
            offerToReceiveVideo: 1
        }).then((description) => {
            localState.peerConnection.setLocalDescription(description)
            .then(() => {
                localState.description = description;
                // onLocalDescriptionAvailable(description);
                getDescriptionAvailableCallback(peer)();
            })
            .catch((error) => {
                console.log('Error in setting local description', error);
            });
        }).catch((error) => {
            console.log('Error in creating peer connection', error);
        });
    }
}

function getTrackAddCallback(peer) {
    let localState, remoteState, otherPeer;
    if (peer === 'alice') {
        localState = aliceState;
        remoteState = bobState;
        otherPeer = 'bob';
    }
    else {
        localState = bobState;
        remoteState = aliceState;
        otherPeer = 'alice';
    }

    return function(event) {
        console.log('On track event of localPeerConnection called', event);
        const mediaStream = event.streams[0];
        localState.remoteVideo.srcObject = mediaStream;
        localState.remoteStream = mediaStream; 
    }
}

function getCallActionCallback(peer) {
    let localState, remoteState, otherPeer;
    if (peer === 'alice') {
        localState = aliceState;
        remoteState = bobState;
        otherPeer = 'bob';
    }
    else {
        localState = bobState;
        remoteState = aliceState;
        otherPeer = 'alice';
    }

    return function() {
        localState.peerConnection = new RTCPeerConnection(null);
        localState.peerConnection.addEventListener('icecandidate', (event) => {
            // const peerConnection = event.target;
            const iceCandidate = event.candidate;

            if (iceCandidate) {
                localState.iceCandidate = iceCandidate;
                // onLocalIceCandidateAvailable();
                getIceCandidateAvailableCallback(peer)();
            }
        });

        localState.dataChannel = localState.peerConnection.createDataChannel('chat');
        localState.dataChannel.addEventListener('message', getMsgReceivedCallback(peer));
        // localPeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);

        if (localState.localStream) {
            console.log('Adding stream to localPeerConnection1');
            localState.localStream.getTracks().forEach((track) => {
                localState.peerConnection.addTrack(track, localState.localStream);
            });
        }

        localState.peerConnection.addEventListener(
            'negotiationneeded', getNegotiationNeededCallback(peer)
        );
        localState.peerConnection.addEventListener('track', getTrackAddCallback(peer));
        
        remoteState.peerConnection = new RTCPeerConnection(null);
        remoteState.peerConnection.addEventListener('icecandidate', (event) => {
            // const peerConnection = event.target;
            const iceCandidate = event.candidate;

            if (iceCandidate) {
                remoteState.iceCandidate = iceCandidate;
                // onRemoteIceCandidateAvailable();
                getIceCandidateAvailableCallback(otherPeer)();
            }
        });

        // remotePeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);
        remoteState.peerConnection.addEventListener('track', getTrackAddCallback(otherPeer));

        remoteState.peerConnection.addEventListener(
            'negotiationneeded', getNegotiationNeededCallback(otherPeer)
        );

        remoteState.peerConnection.addEventListener('datachannel', (event) => {
            console.log('remoteState.peerConnection datachannel event received', event);
            remoteState.dataChannel = event.channel;
            remoteState.dataChannel.addEventListener('message', getMsgReceivedCallback(otherPeer));
        });

        // startActionLocal();
        getStartActionCallback(peer);
    }
}

function hangupAction() {
    aliceState.peerConnection.close();
    bobState.peerConnection.close();
    aliceState.peerConnection = null;
    bobState.peerConnection = null;
    
    if (aliceState.localStream) {
        aliceState.localStream.getTracks().forEach(function(track) {
            track.stop();
        });
    }
    if (aliceState.remoteStream) {
        aliceState.remoteStream.getTracks().forEach(function(track) {
            track.stop();
        });
    }
    if (bobState.localStream) {
        bobState.localStream.getTracks().forEach(function(track) {
            track.stop();
        });
    }
    if (bobState.remoteStream) {
        bobState.remoteStream.getTracks().forEach(function(track) {
            track.stop();
        });
    }
    aliceState.localStream = null;
    aliceState.remoteStream = null;
    bobState.localStream = null;
    bobState.remoteStream = null;

    aliceState.iceCandidate = null;
    bobState.iceCandidate = null;

    aliceState.description = null;
    bobState.description = null;

    aliceState.textbox.disabled = true;
    bobState.textbox.disabled = true;

    aliceState.sendbtn.disabled = true;
    bobState.sendbtn.disabled = true;
}

function renderMessages(peer) {
    let localState, remoteState, otherPeer;
    if (peer === 'alice') {
        localState = aliceState;
        remoteState = bobState;
        otherPeer = 'bob';
    }
    else {
        localState = bobState;
        remoteState = aliceState;
        otherPeer = 'alice';
    }
    localState.msgbox.innerHTML = '';
    for (let msgObj of localState.messages) {
        let msgElem = document.createElement('div');
        let msgText = document.createTextNode(msgObj.msg);
        let senderElem = document.createElement('p');
        senderElem.appendChild(
            document.createTextNode(msgObj.sender)
        );
        senderElem.classList.add('sender');
        
        msgElem.appendChild(msgText);
        msgElem.appendChild(senderElem);
        msgElem.classList.add('messageElem');

        localState.msgbox.appendChild(msgElem);
    }
}

function getMsgReceivedCallback(peer) {
    let localState, remoteState, otherPeer;
    if (peer === 'alice') {
        localState = aliceState;
        remoteState = bobState;
        otherPeer = 'bob';
    }
    else {
        localState = bobState;
        remoteState = aliceState;
        otherPeer = 'alice';
    }
    
    return function(event) {
        console.log('Message received', event);
        localState.messages.push(JSON.parse(event.data));
        renderMessages(peer);
    }
}

function getSendMsgActionCallback(peer) {
    let localState, remoteState, otherPeer;
    if (peer === 'alice') {
        localState = aliceState;
        remoteState = bobState;
        otherPeer = 'bob';
    }
    else {
        localState = bobState;
        remoteState = aliceState;
        otherPeer = 'alice';
    }
    return function() {
        let msgObj = {
            msg: localState.textbox.value,
            sender: peer
        }
        localState.messages.push(msgObj);
        renderMessages(peer);
        localState.dataChannel.send(JSON.stringify(msgObj));
        localState.textbox.value = '';
    }
}

startButtonAlice.addEventListener('click', getStartActionCallback('alice'));
startButtonBob.addEventListener('click', getStartActionCallback('bob'));
callButtonAlice.addEventListener('click', getCallActionCallback('alice'));
callButtonBob.addEventListener('click', getCallActionCallback('bob'));
// acceptButton.addEventListener('click', acceptAction);
hangupButtonAlice.addEventListener('click', hangupAction);
hangupButtonBob.addEventListener('click', hangupAction);

sendMsgButtonAlice.addEventListener('click', getSendMsgActionCallback('alice'));
sendMsgButtonBob.addEventListener('click', getSendMsgActionCallback('bob'));
