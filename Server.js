// jshint node: true
'use strict';

const http = require('http');
const express = require('express');
const websocket = require('websocket');

const staticFileServer = express();
staticFileServer.use('/', express.static(`${__dirname}/public`));
staticFileServer.use('/offerer', express.static(`${__dirname}/public/offerer.html`));
staticFileServer.use('/answerer', express.static(`${__dirname}/public/answerer.html`));

const httpServer = http.createServer(staticFileServer);

const webSocket = new websocket.server({
    httpServer: httpServer
});

let offerer;
let answerer;

let nextId = 0;
const connections = {};

webSocket.on('request', (request) => {
    const connection = request.accept('json', request.origin);

    connection.on('message', (data) => {
        const payload = JSON.parse(data.utf8Data);

        if (payload.type === 'register') {
            connections[payload.userId] = connection;

            console.info('Recorded new user with ID:', payload.userId);
            connection.send(JSON.stringify({type: 'registration-success', id: nextId++}));
            return;
        }

        if (payload.type === 'registerAnswerer') {
            answerer = connection;

            console.info('Recorded new answerer.');
            return;
        }

        if (payload.type === 'offer') {
            offerer = connection;

            if (!!answerer) {
                answerer.send(JSON.stringify(payload));
                console.info('Sending offer to answerer after recording new offerer.');
            }
            return;
        }

        if (payload.type === 'answer') {
            if (!!offerer) {
                offerer.send(JSON.stringify(payload));
                console.info('Sending answer to offerer after receiving answer.');
            }
            return;
        }

        if (payload.type === 'ICE-offerer') {
            if (!!answerer) {
                answerer.send(JSON.stringify({type: 'ICE', candidate: payload.candidate}));
                console.info('Sending answerer an ICE candidate.');
            }
            return;
        }

        if (payload.type === 'ICE-answerer') {
            if (!!offerer) {
                offerer.send(JSON.stringify({type: 'ICE', candidate: payload.candidate}));
                console.info('Sending offerer an ICE candidate.');
            }
            return;
        }
    });
});

const port = 8085;
httpServer.listen(port, () => console.info('Server has started on port:', port));
