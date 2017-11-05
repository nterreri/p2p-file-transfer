// jshint browser: true
'use strict';

let offererWebSocket;
let answererWebSocket;

export function sendOffer() {
    const offererConnection = new RTCPeerConnection();
    offererWebSocket = new WebSocket('ws://localhost:8085', 'json');

    offererConnection.onicecandidate = (e) => {
        if (!e.candidate) {
            return;
        }

        offererWebSocket.send(JSON.stringify({type: 'ICE-offerer', candidate: e.candidate}));
    };

    offererWebSocket.onmessage = (e) => {
        const payload = JSON.parse(e.data);
        if (payload.type === 'answer') {
            console.log('Setting RTC session answer description after receiving an answer message from the web socket.');

            const answererDescription = payload;
            offererConnection.setRemoteDescription(answererDescription);
        }

        if (payload.type === 'ICE') {
            offererConnection.addIceCandidate(payload.candidate).then(
                () => console.info('Offerer added ICE candidate', payload.candidate.usernameFragment, 'successfully.'),
                (error) => console.error('Offerer failed to add ICE candidate due to', error)
            );
        }
    };

    offererWebSocket.onopen = () => {
        console.log('Setting up RTC session offer as connection to web socket has opened.');

        const dataChannel = offererConnection.createDataChannel('demoChannel');

        dataChannel.onopen = () => {
            const message = 'hello';
            dataChannel.send(message);
            console.info('Offerer sent data:', message);
        }

        offererConnection.createOffer().then(
            descr => {
                offererConnection.setLocalDescription(descr);
                offererWebSocket.send(JSON.stringify(descr));
                console.log('Sent offerer session description after setting as local description.');
            }
        );
    };
}

export function registerAsAnswerer() {
    const answererConnection = new RTCPeerConnection();
    answererWebSocket = new WebSocket('ws://localhost:8085', 'json');

    answererConnection.onicecandidate = (e) => {
        if (!e.candidate) {
            return;
        }

        answererWebSocket.send(JSON.stringify({type: 'ICE-answerer', candidate: e.candidate}));
    };

    answererWebSocket.onopen = () => {
        console.log('Answerer connection with socket server opened, sending request to register as offer answerer.');

        answererWebSocket.send(JSON.stringify({type: 'registerAnswerer'}));
    };

    answererWebSocket.onmessage = (e) => {
        const payload = JSON.parse(e.data);
        if (payload.type === 'offer') {
            console.log('Setting up RTC session answer after receiving a message from the web socket.');

            const offererDescription = payload;

            answererConnection.ondatachannel = (e) => {
                console.info('Answerer received data channel');

                e.channel.onmessage = (e) => {
                    console.info('Answerer received RTC message:', e.data);
                }
            };

            answererConnection.setRemoteDescription(offererDescription);
            answererConnection.createAnswer().then(
                descr => {
                    answererConnection.setLocalDescription(descr);
                    answererWebSocket.send(JSON.stringify(descr));
                    console.info('Sent answerer session description after setting offerer description as remote and local description.');
                }
            );
        }

        if (payload.type === 'ICE') {
            answererConnection.addIceCandidate(payload.candidate).then(
                () => console.info('Answerer added ICE candiate', payload.candidate.usernameFragment, 'successfully.'),
                (error) => console.error('Answerer failed to add ICE candidate due to', error)
            );
        }
    };
}
