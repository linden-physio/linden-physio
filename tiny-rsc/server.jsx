import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { render } from "./flight.js";
import { Page } from "./app/Page.jsx";

const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Linden Physio</title><link rel="stylesheet" href="/style.css"></head>
  <body><div id="root"></div><script type="module" src="/client.js"></script></body>
</html>`;

// The page's server. A request with the header RSC: 1 gets the payload; any other request gets an
// empty page, whose script asks for the payload.
createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/client.js" || url.pathname === "/style.css") {
    response.setHeader("Content-Type", url.pathname.endsWith(".js") ? "text/javascript" : "text/css");
    return response.end(readFileSync("public" + url.pathname));
  }
  if (request.headers.rsc) {
    response.setHeader("Content-Type", "text/x-component");
    await render(<Page search={url.searchParams} />, (line) => response.write(line));
    return response.end();
  }
  response.setHeader("Content-Type", "text/html");
  response.end(page);
}).listen(5173, () => console.log("The page's server: http://localhost:5173"));
