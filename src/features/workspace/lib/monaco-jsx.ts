/**
 * Configure Monaco TypeScript / JavaScript for React JSX/TSX.
 * Monaco 0.56+ exposes this under `monaco.typescript` (not languages.typescript).
 */
export function configureMonacoJsx(monaco: typeof import("monaco-editor")) {
  const ts = monaco.typescript;

  const compilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    jsx: ts.JsxEmit.ReactJSX,
    jsxFactory: "React.createElement",
    jsxFragmentFactory: "React.Fragment",
    reactNamespace: "React",
    allowJs: true,
    allowNonTsExtensions: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    forceConsistentCasingInFileNames: true,
    isolatedModules: true,
    noEmit: true,
  };

  ts.typescriptDefaults.setCompilerOptions(compilerOptions);
  ts.javascriptDefaults.setCompilerOptions(compilerOptions);

  // Syntax errors only — keep the cloud IDE quiet without a full node_modules.
  const diagnostics = {
    noSemanticValidation: true,
    noSyntaxValidation: false,
  };
  ts.typescriptDefaults.setDiagnosticsOptions(diagnostics);
  ts.javascriptDefaults.setDiagnosticsOptions(diagnostics);

  ts.typescriptDefaults.setEagerModelSync(true);
  ts.javascriptDefaults.setEagerModelSync(true);

  // Minimal JSX ambient types so `<div />` parses/highlights without @types/react.
  const jsxShim = `
declare namespace React {
  type ReactNode = any;
  function createElement(type: any, props?: any, ...children: any[]): any;
  const Fragment: unique symbol;
}
declare namespace JSX {
  interface Element {}
  interface ElementClass { render(): any }
  interface ElementAttributesProperty { props: {} }
  interface ElementChildrenAttribute { children: {} }
  interface IntrinsicAttributes {}
  interface IntrinsicClassAttributes<T> {}
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
`;

  const shimPath = "file:///polaris-react-jsx-shim.d.ts";
  ts.typescriptDefaults.addExtraLib(jsxShim, shimPath);
  ts.javascriptDefaults.addExtraLib(jsxShim, shimPath);
}
