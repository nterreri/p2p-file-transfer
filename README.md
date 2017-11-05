## Description
This is a simple example of how to establish a two way file transfer channel between two browers
using webrtc that uses a simple Node web socket server for the signaling protocol.

It is largely "inspired" by the samples already available at https://github.com/webrtc/samples/ 
(except this one doesn't cheat) and 
https://github.com/mdn/samples-server/tree/master/s/webrtc-from-chat (which also uses web sockets).
It makes use of the webrtc shim from https://github.com/webrtc/adapter.

Its purpose is to serve as a way to demo file transfer from two separate webpages/browsers.
There's lots of things wrong with it: it reads/writes files synchronously, there's no chunking when
transfering files, there's no limit to the size of messages that can be sent to the web server 
(which is not secured either) and it does not handle exceptional cases at all (peer 
disconnection, transfer failure or cancellation etc).

It also makes use of ES6 modules and WebSockets and there is no compilation/transpilation step,
which means it will probably only work in Chrome or Chromium (until other browsers support these 
features).

## How to use the client
Running Server.js in Node will start a static file and web socket server at port 8085.
The files in the public directory will be served from that resource.

Because of how the server is implemented at the moment it is necessary to:
- first register an answerer
- then send an offer
- finally it is possible to send a file from the offerer to the answerer (although the channel is
two way if I'm not mistaken).

Multiple files can be sent in the same session.
