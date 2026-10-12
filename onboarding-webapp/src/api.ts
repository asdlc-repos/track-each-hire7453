import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/onboarding-api";
import { ForbiddenError, authorizationHeader, classifyResponse } from "./authz/client";

// The 401 rule lives in src/authz/client.ts; this file only attaches the bearer
// and hands every status to it.
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const header = await authorizationHeader();
    if (header) request.headers.set("Authorization", header);
    return request;
  },
  async onResponse({ response }) {
    if ((await classifyResponse(response.status)) === "forbidden") {
      throw new ForbiddenError(response.status);
    }
    return response;
  },
};

// Same-origin: nginx proxies /api to onboarding-api through the API gateway.
export const onboardingApi = createClient<paths>({ baseUrl: "/api" });
onboardingApi.use(authMiddleware);
