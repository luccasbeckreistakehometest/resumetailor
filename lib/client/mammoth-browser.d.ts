/** mammoth ships a prebuilt browser bundle without its own typings; it exports the same API as the Node entry. */
declare module "mammoth/mammoth.browser" {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- the only way to re-export an `export =` module
  import mammoth = require("mammoth");
  export = mammoth;
}
