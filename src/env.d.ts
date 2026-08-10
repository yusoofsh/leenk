/// <reference types="astro/client" />

import "astro/astro-jsx";

declare global {
  namespace App {
    interface Locals {
      member: import("better-auth/plugins").Member | null;
      session: import("better-auth").Session | null;
      user: import("better-auth").User | null;
    }
  }

  namespace JSX {
    type Element = astroHTML.JSX.Element; // We want to use this, but it is defined as any.
    type IntrinsicElements = astroHTML.JSX.IntrinsicElements;
  }
}
