import type { RequestHandler } from "./$types";

export const GET: RequestHandler = () => {
  return new Response("ok", {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
};
