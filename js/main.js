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

const aliceState = {
    video: document.getElementById('aliceVideo'),
    stream: null,
    peerConnection: null,
    iceCandidate: null,
    description: null
}

const bobState = {
    video: document.getElementById('bobVideo'),
    stream: null,
    peerConnection: null,
    iceCandidate: null,
    description: null
}

let startButtonAlice = document.getElementById('startButtonAlice');
let startButtonBob = document.getElementById('startButtonBob');
let callButtonAlice = document.getElementById('callButtonAlice');
let callButtonBob = document.getElementById('callButtonBob');
let hangupButtonAlice = document.getElementById('hangupButtonAlice');
let hangupButtonBob = document.getElementById('hangupButtonBob');

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
        if (localState.stream) {
            return;
        }
    
        navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
        .then((mediaStream) => {
            localState.stream = mediaStream;
            localState.video.srcObject = mediaStream;
            if (localState.peerConnection) {
                console.log('Adding stream to localPeerConnection1');
                localState.stream.getTracks().forEach((track) => {
                    localState.peerConnection.addTrack(track, localState.stream);
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
        })
        .catch(() => {
            console.log('Error in setting local description in remotePeer as remote description');
        });
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
        // localPeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);

        remoteState.peerConnection = new RTCPeerConnection(null);

        if (localState.stream) {
            console.log('Adding stream to localPeerConnection1');
            localState.stream.getTracks().forEach((track) => {
                localState.peerConnection.addTrack(track, localState.stream);
            });
        }

        localState.peerConnection.addEventListener('negotiationneeded', ()=> {
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
        });
        
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
        remoteState.peerConnection.addEventListener('track', (event) => {
            console.log('On track event of remotePeerConnection called', event);
            const mediaStream = event.streams[0];
            remoteState.video.srcObject = mediaStream;
            remoteState.stream = mediaStream; 
        });

        remoteState.peerConnection.addEventListener('negotiationneeded', (event) => {
            console.log('remotePeerConnection negotiation needed', event);
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
    
    aliceState.stream.getTracks().forEach(function(track) {
        track.stop();
    });
    bobState.stream.getTracks().forEach(function(track) {
        track.stop();
    });
    aliceState.stream = null;
    bobState.stream = null;

    aliceState.iceCandidate = null;
    bobState.iceCandidate = null;

    aliceState.description = null;
    bobState.description = null;
}

startButtonAlice.addEventListener('click', getStartActionCallback('alice'));
startButtonBob.addEventListener('click', getStartActionCallback('bob'));
callButtonAlice.addEventListener('click', getCallActionCallback('alice'));
callButtonBob.addEventListener('click', getCallActionCallback('bob'));
// acceptButton.addEventListener('click', acceptAction);
hangupButtonAlice.addEventListener('click', hangupAction);
hangupButtonBob.addEventListener('click', hangupAction);
