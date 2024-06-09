import type { APIRoute } from "astro";

export const GET: APIRoute = ({ redirect }) => {
  return redirect("https://twitter.com/yusoofsh", 308);
};
