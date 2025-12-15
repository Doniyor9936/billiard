/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as additionalOrders from "../additionalOrders.js";
import type * as auth from "../auth.js";
import type * as cashbacks from "../cashbacks.js";
import type * as customers from "../customers.js";
import type * as http from "../http.js";
import type * as reports from "../reports.js";
import type * as router from "../router.js";
import type * as sessions from "../sessions.js";
import type * as tables from "../tables.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  additionalOrders: typeof additionalOrders;
  auth: typeof auth;
  cashbacks: typeof cashbacks;
  customers: typeof customers;
  http: typeof http;
  reports: typeof reports;
  router: typeof router;
  sessions: typeof sessions;
  tables: typeof tables;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
