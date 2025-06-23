// Headers CORS para permitir peticiones desde cualquier dominio
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "HEAD, OPTIONS",
    "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent",
    "Access-Control-Max-Age": "86400",
};

// Función para hacer proxy de peticiones
async function handleProxy(req: Request): Promise<Response | null> {
    const url = new URL(req.url);

    // Solo manejar peticiones HEAD y OPTIONS
    if (!["HEAD", "OPTIONS"].includes(req.method)) {
        return null;
    }

    // Si es OPTIONS para preflight, responder directamente
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 200,
            headers: corsHeaders,
        });
    }

    // Extraer la URL del parámetro de query
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
        return new Response("Missing url parameter", {
            status: 400,
            headers: corsHeaders,
        });
    }

    try {
        // Validar que la URL sea válida
        new URL(targetUrl);

        // Hacer la petición proxy
        const proxyResponse = await fetch(targetUrl, {
            method: req.method,
            headers: {
                "User-Agent": req.headers.get("User-Agent") || "Proxy-Bot/1.0",
            },
        });

        // Crear respuesta con headers CORS
        const response = new Response(req.method === "HEAD" ? null : await proxyResponse.text(), {
            status: proxyResponse.status,
            statusText: proxyResponse.statusText,
            headers: {
                ...corsHeaders,
                // Pasar algunos headers importantes del destino
                ...(proxyResponse.headers.get("content-type") && {
                    "content-type": proxyResponse.headers.get("content-type")!,
                }),
                ...(proxyResponse.headers.get("content-length") && {
                    "content-length": proxyResponse.headers.get("content-length")!,
                }),
            },
        });

        return response;
    } catch (error) {
        return new Response(`Invalid URL or request failed: ${error}`, {
            status: 400,
            headers: corsHeaders,
        });
    }
}

Bun.serve({
    async fetch(req, server) {
        // Verificar si es una petición para proxy HTTP
        const proxyResponse = await handleProxy(req);
        if (proxyResponse) {
            return proxyResponse;
        }

        // upgrade the request to a WebSocket
        if (server.upgrade(req)) {
            return; // do not return a Response
        }
        return new Response("Upgrade failed", { status: 200 });
    },
    websocket: {
        message(ws, message) {
            ws.send(message); // send a message
        },
    },
});
