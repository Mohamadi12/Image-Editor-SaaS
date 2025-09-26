import { createAuthClient } from "better-auth/react";
import { env } from "process";
import { polarClient } from "@polar-sh/better-auth";

export const authClient = createAuthClient({
  baseURL: env.BETTER_AUTH_URL,
  plugins: [polarClient()],
});
