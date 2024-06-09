import type { APIRoute } from "astro";

export const GET: APIRoute = ({ redirect }) => {
  return redirect("https://linkedin.com/in/yusoofsh", 308);
};
