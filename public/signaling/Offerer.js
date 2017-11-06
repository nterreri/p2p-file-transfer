// jshint browser: true
'use strict';

let webSocket;
let connection;
let dataChannel;

function handleSocketMessage(message) {
    const payload = JSON.parse(message);

    if (payload.type === 'registration-success') {
        connection = new RTCPeerConnection();
        console.info('Signaling server acknowledged registration.');
        return;
    }

    if (payload.type === 'session-granted') {
        initializeDataTransferSession();
    }

    if (payload.type === 'session-rejected') {
        console.error('Failed to initialize session with user', payload.remoteUserId, 'as the server rejected the request.');
    }

    if (payload.type === 'answer') {
        console.log('Setting RTC session answer description after receiving an answer message from the web socket.');

        const answererDescription = payload;
        connection.setRemoteDescription(answererDescription);
        return;
    }

    if (payload.type === 'ICE') {
        connection.addIceCandidate(payload.candidate).then(
            () => console.info('Offerer added ICE candidate', payload.candidate.usernameFragment, 'successfully.'),
            (error) => console.error('Offerer failed to add ICE candidate due to', error)
        );
        return;
    }
}

export function sendFileTo(recepientId) {
    webSocket.send(JSON.stringify({type: 'request-session', recepientId: recepientId}));
}

function initializeDataTransferSession() {
    console.log('Setting up RTC session offer after signaling server acknowledgement.');

    dataChannel = connection.createDataChannel('demoChannel');
    dataChannel.binarytype = 'arraybuffer';

    connection.onicecandidate = (e) => {
        if (!e.candidate) {
            return;
        }

        webSocket.send(JSON.stringify({type: 'ICE-offerer', candidate: e.candidate}));
    };

    connection.createOffer().then(
        descr => {
            connection.setLocalDescription(descr);
            webSocket.send(JSON.stringify(descr));
            console.log('Sent offerer session description after setting as local description.');
        }
    );
}

export function openWebSocket(userId) {
    webSocket = new WebSocket('ws://localhost:8085', 'json');
    webSocket.onmessage = (e) => handleSocketMessage(e.data);
    webSocket.onopen = () => registerAs(userId);
}

function registerAs(userId) {
    console.log('Registering with signaling server as user:', userId);
    webSocket.send(JSON.stringify({type: 'register', userId: userId}));
}

export function sendFile(file) {
    if (!connection || !dataChannel || dataChannel.readyState !== 'open') {
        console.error('Cannot send file as the data channel is not open.');
        return;
    }

    console.log('Preparing to send file:', file.name, 'of size:', file.size);
    dataChannel.send(JSON.stringify({type: 'file-metadata', name: file.name, size: file.size}));

    sendFileInChunks(file);
}

function sendFileInChunks(file) {
    const chunkSize = 16384;
    let offset = 0;

    const chunks = [];

    if (file.size < offset + chunkSize) {
        sendChunkAsync(file);
        return;
    }

    while (file.size > offset) {
        chunks.push(file.slice(offset, offset + chunkSize));
        offset += chunkSize;
    }

    Promise.all(chunks.map(sendChunkAsync))
        .then(() => console.info('Finished sending file to peer.'));
}

function sendChunkAsync(chunk) {
    return readAsArrayBufferAsync(chunk).then((arrayBuffer) => {
        dataChannel.send(arrayBuffer);
        console.log('File chunk of size', arrayBuffer.byteLength, 'was sent to peer.');
        return Promise.resolve();
    });
}

function readAsArrayBufferAsync(chunk) {
    // Data must be sent as ArrayBuffer instances
    return new Promise((resolve) => {
        const fileReader = new FileReader();
        fileReader.onload = (e) => resolve(e.target.result);
        fileReader.readAsArrayBuffer(chunk);
    });
}
