import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { Polar } from "@polar-sh/sdk";
import { env } from "~/env";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  polar,
  checkout,
  portal,
  usage,
  webhooks,
} from "@polar-sh/better-auth";
import { db } from "~/server/db";

const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: "sandbox",
});

const prisma = new PrismaClient();
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: "123-456-789", // ID of Product from Polar Dashboard
              slug: "pro", // Custom slug for easy reference in Checkout URL, e.g. /checkout/pro
            },
          ],
          successUrl: "/success?checkout_id={CHECKOUT_ID}",
          authenticatedUsersOnly: true,
        }),
        portal(),
        webhooks({
          secret: env.POLAR_WEBHOOK_SECRET,
          onOrderPaid: async (order) => {
            const externalCustomerId = order.data.customer.externalId;

            if (!externalCustomerId) {
              console.error("No external customer ID found.");
              throw new Error("No external customer id found.");
            }

            const productId = order.data.productId;

            let creditsToAdd = 0;
            switch (productId) {
              case "dcfa3c93-0a88-4e8a-b16e-37b6226920aa":
                creditsToAdd = 50;
                break;
              case "c2d5855c-3164-48d0-95e1-422dd6a1758f":
                creditsToAdd = 200;
                break;
              case "63836be1-33cc-4c81-9e67-3f95848331d8":
                creditsToAdd = 400;
                break;
            }
            await db.user.update({
              where: { id: externalCustomerId },
              data: {
                credits: {
                  increment: creditsToAdd,
                },
              },
            });
          },
        }),
        usage(),
        checkout({
          products: [
            {
              productId: "dcfa3c93-0a88-4e8a-b16e-37b6226920aa",
              slug: "small",
            },
            {
              productId: "c2d5855c-3164-48d0-95e1-422dd6a1758f",
              slug: "medium",
            },
            {
              productId: "63836be1-33cc-4c81-9e67-3f95848331d8",
              slug: "large",
            },
          ],
          successUrl: "/dashboard",
          authenticatedUsersOnly: true,
        }),
      ],
    }),
  ],
});
