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
import type * as githubBranches from "../githubBranches.js";
import type * as githubHistory from "../githubHistory.js";
import type * as githubImport from "../githubImport.js";
import type * as githubImportMutations from "../githubImportMutations.js";
import type * as githubInit from "../githubInit.js";
import type * as githubInitMutations from "../githubInitMutations.js";
import type * as githubPull from "../githubPull.js";
import type * as githubPullMutations from "../githubPullMutations.js";
import type * as githubPush from "../githubPush.js";
import type * as githubPushMutations from "../githubPushMutations.js";
import type * as lib_github from "../lib/github.js";
import type * as lib_githubFetch from "../lib/githubFetch.js";
import type * as lib_importProjectFiles from "../lib/importProjectFiles.js";
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
  githubBranches: typeof githubBranches;
  githubHistory: typeof githubHistory;
  githubImport: typeof githubImport;
  githubImportMutations: typeof githubImportMutations;
  githubInit: typeof githubInit;
  githubInitMutations: typeof githubInitMutations;
  githubPull: typeof githubPull;
  githubPullMutations: typeof githubPullMutations;
  githubPush: typeof githubPush;
  githubPushMutations: typeof githubPushMutations;
  "lib/github": typeof lib_github;
  "lib/githubFetch": typeof lib_githubFetch;
  "lib/importProjectFiles": typeof lib_importProjectFiles;
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
