Bun.serve({
    fetch(req, server) {
        // upgrade the request to a WebSocket
        if (server.upgrade(req)) {
            return; // do not return a Response
        }
        return new Response("Upgrade failed", { status: 200 });
    },
    websocket: {
        message(ws, message) {
            ws.send(message); // send a messagea
        }, // a message is received
        open(ws) {}, // a socket is opened
        close(ws, code, message) {}, // a socket is closed
        drain(ws) {}, // the socket is ready to receive more data
    },
});
