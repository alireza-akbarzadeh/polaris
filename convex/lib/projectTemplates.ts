import { v } from "convex/values";

export const TEMPLATE_IDS = [
  "empty",
  "simple",
  "nextjs",
  "react",
  "tanstack",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const templateIdValidator = v.union(
  v.literal("empty"),
  v.literal("simple"),
  v.literal("nextjs"),
  v.literal("react"),
  v.literal("tanstack"),
);

export type SeedNode = {
  name: string;
  path?: string;
  children?: SeedNode[];
};

export type ProjectTemplate = {
  id: TemplateId;
  name: string;
  description: string;
  tree: SeedNode[];
  content: Record<string, string>;
};

const EMPTY: ProjectTemplate = {
  id: "empty",
  name: "Empty folder",
  description: "Start from scratch with no files",
  tree: [],
  content: {},
};

const SIMPLE: ProjectTemplate = {
  id: "simple",
  name: "Simple project",
  description: "A minimal starter with a README and entry file",
  tree: [
    { name: "src", children: [{ name: "index.ts", path: "src/index.ts" }] },
    { name: "package.json", path: "package.json" },
    { name: "README.md", path: "README.md" },
  ],
  content: {
    "src/index.ts": `export function main() {
  console.log("Hello from Polaris");
}

main();
`,
    "package.json": `{
  "name": "polaris-simple",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/index.ts"
  }
}
`,
    "README.md": `# Simple project

A minimal Polaris workspace. Open files from the tree to start editing.
`,
  },
};

const NEXTJS: ProjectTemplate = {
  id: "nextjs",
  name: "Next.js",
  description: "App Router starter with layout, page, and package.json",
  tree: [
    {
      name: "src",
      children: [
        {
          name: "app",
          children: [
            { name: "page.tsx", path: "src/app/page.tsx" },
            { name: "layout.tsx", path: "src/app/layout.tsx" },
            { name: "globals.css", path: "src/app/globals.css" },
          ],
        },
      ],
    },
    { name: "package.json", path: "package.json" },
    { name: "tsconfig.json", path: "tsconfig.json" },
    { name: "next.config.ts", path: "next.config.ts" },
    { name: "README.md", path: "README.md" },
  ],
  content: {
    "src/app/page.tsx": `export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Next.js</h1>
      <p className="text-neutral-600">
        Edit <code>src/app/page.tsx</code> to get started.
      </p>
    </main>
  );
}
`,
    "src/app/layout.tsx": `import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Next.js App",
  description: "Created with Polaris",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
    "src/app/globals.css": `* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
}
`,
    "package.json": `{
  "name": "polaris-nextjs",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.0.0"
  }
}
`,
    "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`,
    "next.config.ts": `import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
`,
    "README.md": `# Next.js

App Router starter created in Polaris.

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  },
};

const REACT: ProjectTemplate = {
  id: "react",
  name: "React (Vite)",
  description: "Plain React app with Vite-style entry points",
  tree: [
    {
      name: "src",
      children: [
        { name: "main.tsx", path: "src/main.tsx" },
        { name: "App.tsx", path: "src/App.tsx" },
        { name: "index.css", path: "src/index.css" },
      ],
    },
    { name: "index.html", path: "index.html" },
    { name: "package.json", path: "package.json" },
    { name: "vite.config.ts", path: "vite.config.ts" },
    { name: "tsconfig.json", path: "tsconfig.json" },
    { name: "README.md", path: "README.md" },
  ],
  content: {
    "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    "src/main.tsx": `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`,
    "src/App.tsx": `export default function App() {
  return (
    <main className="app">
      <h1>React</h1>
      <p>Edit <code>src/App.tsx</code> to get started.</p>
    </main>
  );
}
`,
    "src/index.css": `:root {
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
  line-height: 1.5;
  color: #0a0a0a;
  background: #fafafa;
}

body {
  margin: 0;
}

.app {
  display: grid;
  min-height: 100vh;
  place-content: center;
  gap: 0.75rem;
  padding: 2rem;
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
`,
    "package.json": `{
  "name": "polaris-react",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^6.0.0"
  }
}
`,
    "vite.config.ts": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`,
    "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
`,
    "README.md": `# React (Vite)

Plain React starter created in Polaris.

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  },
};

const TANSTACK: ProjectTemplate = {
  id: "tanstack",
  name: "TanStack Start",
  description: "File-based TanStack Router app with a root route",
  tree: [
    {
      name: "src",
      children: [
        {
          name: "routes",
          children: [
            { name: "__root.tsx", path: "src/routes/__root.tsx" },
            { name: "index.tsx", path: "src/routes/index.tsx" },
          ],
        },
        { name: "router.tsx", path: "src/router.tsx" },
        { name: "styles.css", path: "src/styles.css" },
      ],
    },
    { name: "package.json", path: "package.json" },
    { name: "tsconfig.json", path: "tsconfig.json" },
    { name: "vite.config.ts", path: "vite.config.ts" },
    { name: "README.md", path: "README.md" },
  ],
  content: {
    "src/routes/__root.tsx": `import { Outlet, createRootRoute } from "@tanstack/react-router";
import "../styles.css";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en">
      <body>
        <Outlet />
      </body>
    </html>
  );
}
`,
    "src/routes/index.tsx": `import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="page">
      <h1>TanStack Start</h1>
      <p>
        Edit <code>src/routes/index.tsx</code> to get started.
      </p>
    </main>
  );
}
`,
    "src/router.tsx": `import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
`,
    "src/styles.css": `:root {
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
  line-height: 1.5;
  color: #111;
  background: #fff;
}

body {
  margin: 0;
}

.page {
  display: grid;
  min-height: 100vh;
  place-content: center;
  gap: 0.75rem;
  padding: 2rem;
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
`,
    "package.json": `{
  "name": "polaris-tanstack",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "start": "vite preview"
  },
  "dependencies": {
    "@tanstack/react-router": "^1.120.0",
    "@tanstack/react-start": "^1.120.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^6.0.0",
    "vite-tsconfig-paths": "^5.0.0"
  }
}
`,
    "tsconfig.json": `{
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "module": "ESNext",
    "target": "ES2022",
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true
  }
}
`,
    "vite.config.ts": `import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  server: { port: 3000 },
  plugins: [tsConfigPaths(), tanstackStart(), viteReact()],
});
`,
    "README.md": `# TanStack Start

File-based routing starter created in Polaris.

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  },
};

export const PROJECT_TEMPLATES: Record<TemplateId, ProjectTemplate> = {
  empty: EMPTY,
  simple: SIMPLE,
  nextjs: NEXTJS,
  react: REACT,
  tanstack: TANSTACK,
};

export const DEFAULT_TEMPLATE_ID: TemplateId = "nextjs";

export function getTemplate(templateId: TemplateId): ProjectTemplate {
  return PROJECT_TEMPLATES[templateId];
}

export function listTemplateMeta() {
  return TEMPLATE_IDS.map((id) => {
    const template = PROJECT_TEMPLATES[id];
    return {
      id: template.id,
      name: template.name,
      description: template.description,
    };
  });
}

export function isTemplateId(value: string): value is TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(value);
}
