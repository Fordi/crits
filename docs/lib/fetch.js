const fetchProtocols = {
  default: globalThis.fetch,
};

export function registerFetchProtocol(protocol, handler) {
  fetchProtocols[protocol.toLowerCase()] = handler;
}

// Basic mime types for the FS fetch shim
// From https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
const mimeTypes = {
  aac: "audio/aac",
  abw: "application/x-abiword",
  apng: "image/apng",
  arc: "application/x-freearc",
  avif: "image/avif",
  avi: "video/x-msvideo",
  azw: "application/vnd.amazon.ebook",
  bin: "application/octet-stream",
  bmp: "image/bmp",
  bz: "application/x-bzip",
  bz2: "application/x-bzip2",
  cda: "application/x-cdf",
  csh: "application/x-csh",
  css: "text/css",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  eot: "application/vnd.ms-fontobject",
  epub: "application/epub+zip",
  gz: "application/gzip",
  gif: "image/gif",
  html: "text/html",
  htm: "text/html",
  ico: "image/vnd.microsoft.icon",
  ics: "text/calendar",
  jar: "application/java-archive",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  js: "text/javascript (Specifications: HTML and RFC 9239)",
  json: "application/json",
  jsonld: "application/ld+json",
  mid: "audio/x-midi",
  midi: "audio/x-midi",
  mjs: "text/javascript",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  mpeg: "video/mpeg",
  mpkg: "application/vnd.apple.installer+xml",
  odp: "application/vnd.oasis.opendocument.presentation",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odt: "application/vnd.oasis.opendocument.text",
  oga: "audio/ogg",
  ogv: "video/ogg",
  ogx: "application/ogg",
  opus: "audio/opus",
  otf: "font/otf",
  png: "image/png",
  pdf: "application/pdf",
  php: "application/x-httpd-php",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  rar: "application/vnd.rar",
  rtf: "application/rtf",
  sh: "application/x-sh",
  svg: "image/svg+xml",
  tar: "application/x-tar",
  tif: "image/tiff",
  tiff: "image/tiff",
  ts: "video/mp2t",
  ttf: "font/ttf",
  txt: "text/plain",
  vsd: "application/vnd.visio",
  wav: "audio/wav",
  weba: "audio/webm",
  webm: "video/webm",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
  xhtml: "application/xhtml+xml",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xml: "application/xml",
  xul: "application/vnd.mozilla.xul+xml",
  zip: "application/zip",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  "7z": "application/x-7z-compressed",
};

registerFetchProtocol("file:", async (url, options) => {
  if ((options?.method?.toLowerCase?.() ?? "get") !== "get") {
    throw new Error("Cannot do HTTP methods against file:// URLs");
  }
  try {
    const [{ stat, readFile }, { Blob }] = await Promise.all([
      import("node:fs/promises"),
      import("node:buffer"),
    ]);

    await stat(url.pathname);
    const read = (encoding) => readFile(url.pathname, encoding);
    const blob = async () => {
      const type =
        mimeTypes[url.pathname.replace(/^.*\.([^.]+)$/, "$1")] ?? mimeTypes.bin;
      return new Blob([await read()], { type });
    };
    const fsResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      type: "basic",
      url,
      json: async () => JSON.parse(await read()),
      blob,
      arrayBuffer: async () => (await blob()).arrayBuffer(),
      clone: () => ({ ...fsResponse }),
      formData: () => {
        throw new Error("Not implemented: Response.formData");
      },
      text: async () => await read("utf8"),
    };
    return fsResponse;
  } catch (e) {
    throw new Error("Cannot read file URLs outside of Node");
  }
});

export async function fetch(uri, options) {
  const url = new URL(uri, globalThis.location ?? import.meta.url);
  return (fetchProtocols[url.protocol] ?? fetchProtocols.default)(url, options);
}

/**
 * Get a relative URI
 * @param {string|URL} uri
 * @param {string|URL} [from=location] Where to build the URL relative to
 */
export function getUrl(uri, from = globalThis.location ?? import.meta.url) {
  return new URL(uri, String(from));
}

/**
 * Fetch a binary file, with a relative path
 * @param {string|URL} uri Path of file to fetch
 * @param {string|URL} [from=location] Where to build the URL relative to
 * @returns {Promise<JsonResult>} a promise to the fetched data
 */
export async function fetchBlob(uri, from) {
  return fetch(getUrl(uri, from)).then((r) => r.blob());
}
/**
 * Fetch a binary file, with a relative path, and return a Data URL
 * @param {string|URL} uri Path of file to fetch
 * @param {string|URL} [from=location] Where to build the URL relative to
 * @returns {Promise<string>} a promise to the fetched data
 */
export async function fetchBlobAsDataUrl(uri, from) {
  const blob = await fetchBlob(uri, from);
  if ("FileReader" in globalThis) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } else if ("Buffer" in globalThis) {
    return `data:${blob.type ?? ""};base64,${Buffer.from(
      await blob.arrayBuffer()
    ).toString("base64")}`;
  } else {
    throw new Error("No native route to base64 encode a blob found");
  }
}

/**
 * Fetch a JSON file, with a relative path.  Common use case:
 * `const MY_DATA = await fetchJson(MY_DATA, import.meta.url);`
 * @param {string|URL} uri Path of JSON to fetch
 * @param {string|URL} [from=location] Where to build the URL relative to
 * @returns {Promise<JsonResult>} a promise to the fetched data
 */
export async function fetchJson(uri, from) {
  return fetch(getUrl(uri, from)).then((r) => r.json());
}
