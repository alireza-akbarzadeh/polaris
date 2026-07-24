import type { Monaco } from "@monaco-editor/react";

/**
 * Model URI for Monaco. Must keep a real file extension (.tsx/.jsx/.css)
 * so language services enable JSX parsing and CSS features.
 */
export function monacoModelPath(filePath: string): string {
  const cleaned = filePath.replace(/^\/+/, "").replace(/\\/g, "/");
  return `file:///${cleaned}`;
}

/**
 * Configure Monaco language services for React (JSX/TSX) and CSS.
 * Monaco 0.56+ uses top-level `monaco.typescript` / `monaco.css`.
 */
export function configureMonacoLanguages(monaco: Monaco) {
  configureTypescriptReact(monaco);
  configureCss(monaco);
}

function configureTypescriptReact(monaco: Monaco) {
  const ts = monaco.typescript;

  const compilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    // Preserve keeps JSX in the AST so checkers + highlighters work well.
    jsx: ts.JsxEmit.Preserve,
    jsxFactory: "React.createElement",
    jsxFragmentFactory: "React.Fragment",
    reactNamespace: "React",
    allowJs: true,
    checkJs: false,
    allowNonTsExtensions: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    forceConsistentCasingInFileNames: true,
    isolatedModules: true,
    noEmit: true,
    strict: false,
  };

  ts.typescriptDefaults.setCompilerOptions(compilerOptions);
  ts.javascriptDefaults.setCompilerOptions(compilerOptions);

  const diagnostics = {
    noSemanticValidation: true,
    noSyntaxValidation: false,
    // Don't spam about missing React types in a cloud IDE without node_modules.
    diagnosticCodesToIgnore: [
      2307, // Cannot find module
      2304, // Cannot find name
      2339, // Property does not exist
      2695, // Left side of comma
      2792, // Cannot find module (node resolution)
    ],
  };
  ts.typescriptDefaults.setDiagnosticsOptions(diagnostics);
  ts.javascriptDefaults.setDiagnosticsOptions(diagnostics);

  ts.typescriptDefaults.setEagerModelSync(true);
  ts.javascriptDefaults.setEagerModelSync(true);

  // Ambient React / JSX so tags like <div /> parse without shipping @types/react.
  const reactShim = `
declare namespace React {
  type ReactNode =
    | string
    | number
    | boolean
    | null
    | undefined
    | ReactElement
    | ReactNode[];
  interface ReactElement<P = any> {
    type: any;
    props: P;
    key: string | number | null;
  }
  type FC<P = {}> = (props: P) => ReactElement | null;
  type FormEvent<T = Element> = any;
  type ChangeEvent<T = Element> = any;
  type MouseEvent<T = Element> = any;
  type CSSProperties = { [key: string]: string | number | undefined };
  function createElement(
    type: any,
    props?: any,
    ...children: ReactNode[]
  ): ReactElement;
  function useState<T>(
    initial: T | (() => T),
  ): [T, (value: T | ((prev: T) => T)) => void];
  function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  function useMemo<T>(factory: () => T, deps: any[]): T;
  function useCallback<T extends (...args: any[]) => any>(fn: T, deps: any[]): T;
  function useRef<T>(initial: T): { current: T };
  const Fragment: unique symbol;
}
declare namespace JSX {
  interface Element extends React.ReactElement {}
  interface ElementClass {
    render(): React.ReactNode;
  }
  interface ElementAttributesProperty {
    props: {};
  }
  interface ElementChildrenAttribute {
    children: {};
  }
  interface IntrinsicAttributes {
    key?: string | number | null;
  }
  interface IntrinsicClassAttributes<T> {
    ref?: any;
  }
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
`;

  const shimUri = "file:///node_modules/@types/react/index.d.ts";
  ts.typescriptDefaults.addExtraLib(reactShim, shimUri);
  ts.javascriptDefaults.addExtraLib(reactShim, shimUri);
}

function configureCss(monaco: Monaco) {
  const css = monaco.css;

  const modeConfiguration = {
    completionItems: true,
    hovers: true,
    documentSymbols: true,
    definitions: true,
    references: true,
    documentHighlights: true,
    rename: true,
    colors: true,
    foldingRanges: true,
    diagnostics: true,
    selectionRanges: true,
    documentFormattingEdits: true,
    documentRangeFormattingEdits: true,
  };

  css.cssDefaults.setModeConfiguration(modeConfiguration);
  css.scssDefaults.setModeConfiguration(modeConfiguration);
  css.lessDefaults.setModeConfiguration(modeConfiguration);

  css.cssDefaults.setOptions({
    validate: true,
    lint: {
      compatibleVendorPrefixes: "ignore",
      vendorPrefix: "warning",
      duplicateProperties: "warning",
      emptyRules: "warning",
      importStatement: "ignore",
      boxModel: "ignore",
      universalSelector: "ignore",
      zeroUnits: "ignore",
      fontFaceProperties: "warning",
      hexColorLength: "error",
      argumentsInColorFunction: "error",
      unknownProperties: "warning",
      ieHack: "ignore",
      unknownVendorSpecificProperties: "ignore",
      propertyIgnoredDueToDisplay: "warning",
      important: "ignore",
      float: "ignore",
      idSelector: "ignore",
    },
  });

  css.scssDefaults.setOptions({ validate: true });
  css.lessDefaults.setOptions({ validate: true });
}
