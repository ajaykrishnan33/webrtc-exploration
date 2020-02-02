# Exploring WebRTC

## Description
This is a basic demo set up for the purpose of exploring WebRTC. It demonstrates how two peers - Alice and Bob, can establish a WebRTC connection between them and bidirectionally stream video between them. Also, text chat functionality has been implemented too.

Currently, both the peers - Alice and Bob, are created in the same page. This has zero practical utility and is only for learning purposes.

This will be expanded soon to support peers on different devices. This would require server-side support in the form of a signalling server,
apart from STUN and possibly TURN servers.

## References
- https://www.html5rocks.com/en/tutorials/webrtc/basics/
- https://codelabs.developers.google.com/codelabs/webrtc-web/#0
- https://www.pkc.io/blog/untangling-the-webrtc-flow/
- [Mozilla Developer Network Docs for WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)

# Interesting Links
- https://www.fullstackpython.com/webrtc.html
- https://github.com/aiortc/aiortc
- https://github.com/pion/webrtc
