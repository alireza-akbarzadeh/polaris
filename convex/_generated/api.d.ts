/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as github from "../github.js";
import type * as githubActions from "../githubActions.js";
import type * as githubImport from "../githubImport.js";
import type * as githubImportMutations from "../githubImportMutations.js";
import type * as githubPush from "../githubPush.js";
import type * as githubPushMutations from "../githubPushMutations.js";
import type * as lib_github from "../lib/github.js";
import type * as lib_projectFiles from "../lib/projectFiles.js";
import type * as projectFiles from "../projectFiles.js";
import type * as projects from "../projects.js";
import type * as userPreferences from "../userPreferences.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  github: typeof github;
  githubActions: typeof githubActions;
  githubImport: typeof githubImport;
  githubImportMutations: typeof githubImportMutations;
  githubPush: typeof githubPush;
  githubPushMutations: typeof githubPushMutations;
  "lib/github": typeof lib_github;
  "lib/projectFiles": typeof lib_projectFiles;
  projectFiles: typeof projectFiles;
  projects: typeof projects;
  userPreferences: typeof userPreferences;
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
