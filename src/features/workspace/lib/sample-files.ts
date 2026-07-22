import type { BreadcrumbSegment } from "@/features/workspace/store/workspace-store";

export type FileTreeNode = {
  name: string;
  /** Present for leaf files */
  path?: string;
  children?: FileTreeNode[];
};

export const SAMPLE_FILE_TREE: FileTreeNode[] = [
  {
    name: "src",
    children: [
      {
        name: "app",
        children: [
          { name: "page.tsx", path: "src/app/page.tsx" },
          { name: "layout.tsx", path: "src/app/layout.tsx" },
        ],
      },
      { name: "welcome.ts", path: "src/welcome.ts" },
    ],
  },
  { name: "package.json", path: "package.json" },
  { name: "README.md", path: "README.md" },
];

export const SAMPLE_FILE_CONTENT: Record<string, string> = {
  "src/app/page.tsx": `export default function Page() {
  return (
    <main className="p-6">
      <h1>Polaris</h1>
      <p>Your project workspace home.</p>
    </main>
  );
}
`,
  "src/app/layout.tsx": `import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
  "src/welcome.ts": `// Polaris — your code editor workspace
import { Workspace } from "@polaris/core";

const polaris = new Workspace({
  name: "My Project",
  ai: true,
});

export default polaris;
`,
  "package.json": `{
  "name": "polaris",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  }
}
`,
  "README.md": `# Polaris

Open files from the project tree to edit code in your workspace.

Use Polaris AI on the right for help with refactors, debugging, and planning.
`,
};

export function getSampleFileContent(path: string): string | undefined {
  return SAMPLE_FILE_CONTENT[path];
}

export function filePathToBreadcrumb(
  projectId: string,
  filePath: string,
): BreadcrumbSegment[] {
  const parts = filePath.split("/").filter(Boolean);

  return parts.map((label, index) => ({
    label,
    href:
      index < parts.length - 1
        ? `/projects/${projectId}/files/${parts.slice(0, index + 1).join("/")}`
        : undefined,
  }));
}
