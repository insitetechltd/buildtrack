/**
 * Metro serves web as a classic <script>, so bare `import.meta` is a SyntaxError
 * and the page stays blank. Zustand middleware (and similar) emit
 * `import.meta.env.MODE` — rewrite to process.env for RN-web.
 */
module.exports = function rewriteImportMeta() {
  return {
    name: "rewrite-import-meta",
    visitor: {
      MetaProperty(path) {
        const { node } = path;
        if (node.meta.name !== "import" || node.property.name !== "meta") {
          return;
        }
        // import.meta → ({ url: '', env: process.env })
        path.replaceWithSourceString(
          "({ url: '', env: (typeof process !== 'undefined' && process.env) ? process.env : {} })",
        );
      },
    },
  };
};
