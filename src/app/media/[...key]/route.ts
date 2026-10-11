import { readLocalImage } from "@/lib/storage";

/** Serves images uploaded with the local storage driver. */
export async function GET(_request: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key } = await ctx.params;
  if (key.some((part) => part === ".." || part.includes("\\"))) return new Response("Not found", { status: 404 });
  const image = await readLocalImage(key.join("/"));
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
