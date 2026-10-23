/**
 * 主题与壁纸 — Host half.
 *
 * Owns the wallpaper library on disk and the appearance document:
 *  - `POST /api-wallpaper/upload`  raw image bytes, deduplicated by content hash
 *  - `POST /api-wallpaper/select`  per-scheme selection (image or built-in preset)
 *  - `POST /api-wallpaper/delete`  remove one library entry
 *  - `POST /api-wallpaper/settings` opacity / blur / dim / fit / rotation
 *  - `GET  /api-wallpaper/state`   library + appearance for one active scheme
 *  - `GET  /api-wallpaper/file/<id>` the stored bytes
 *
 * Only loopback, same-origin callers are served. Images stay on this machine.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const name = 'wallpaper-theme';
export const inject = ['webServer'];

const DEFAULTS = {
  routePrefix: '/api-wallpaper',
  /** Defaults to `$DSH_HOME/wallpaper-theme`. */
  root: null,
  maxBytes: 20 * 1024 * 1024,
  maxItems: 30,
  maxTotalBytes: 300 * 1024 * 1024,
};

const DEFAULT_APPEARANCE = {
  v: 7,
  light: { source: null },
  dark: { source: null },
  /** `full`: the wallpaper runs edge to edge behind glass surfaces. `card`: app floats on it. */
  mode: 'full',
  /** Full mode: canvas glass floor (readability) 0.3 .. 0.7. */
  floor: 0.46,
  /** Full mode: sidebar glass floor, a bit more see-through than the canvas. */
  sidebarFloor: 0.38,
  /** Composer card fill: the input must stay readable over anything behind it. */
  composerOpacity: 0.94,
  /** This settings dialog's own fill. */
  dialogOpacity: 0.97,
  /** Card mode: card fill alpha. */
  opacity: 0.92,
  /** Card mode: sidebar column fill. */
  sidebarOpacity: 0.62,
  /** Card mode: inset from the window edges, in px. */
  inset: 24,
  /** How visible the wallpaper itself is: 0 .. 1. */
  wallpaperOpacity: 1,
  /** Frosted blur applied behind the surfaces, in px: 0 .. 40. */
  backdropBlur: 24,
  /** Wallpaper blur in px. */
  blur: 0,
  /** Darkening scrim over the wallpaper: 0 .. 0.8. */
  dim: 0.15,
  /** `cover` or `contain`. */
  fit: 'cover',
  rotate: { enabled: false, intervalHours: 6, lastAt: 0, cursor: {} },
};

/** Bumped when the appearance document needs new defaults. */
const APPEARANCE_VERSION = 6;

const MIME_BY_EXT = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
};

function dshHome() {
  return process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
}

function intInRange(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function numberInRange(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

/** Identify an image by its magic bytes; never trust the client's content type. */
function sniffImage(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: MIME_BY_EXT.jpg };
  }
  if (buffer.length >= 8 && buffer.readUInt32BE(0) === 0x89504e47) {
    return { ext: 'png', mime: MIME_BY_EXT.png };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { ext: 'webp', mime: MIME_BY_EXT.webp };
  }
  if (buffer.length >= 6 && buffer.toString('ascii', 0, 4) === 'GIF8') {
    return { ext: 'gif', mime: MIME_BY_EXT.gif };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12);
    if (brand === 'avif' || brand === 'avis') return { ext: 'avif', mime: MIME_BY_EXT.avif };
  }
  return null;
}

function atomicWrite(file, text) {
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, text);
  fs.renameSync(temp, file);
}

function readBody(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    request.on('data', (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > limit) {
        settled = true;
        const error = new Error('payload too large');
        error.code = 'ETOOLARGE';
        reject(error);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks));
    });
    request.on('error', (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

export function apply(ctx, config) {
  const options = { ...DEFAULTS, ...(config ?? {}) };
  const prefix = String(options.routePrefix || DEFAULTS.routePrefix).replace(/\/+$/, '');
  const root = options.root || path.join(dshHome(), 'wallpaper-theme');
  const filesDir = path.join(root, 'files');
  const indexFile = path.join(root, 'index.json');

  /** @type {{version:number, items:any[], appearance:any}} */
  let state = { version: 1, items: [], appearance: structuredClone(DEFAULT_APPEARANCE) };
  try {
    const stored = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    if (stored && stored.version === 1) {
      state = {
        version: 1,
        items: Array.isArray(stored.items) ? stored.items : [],
        appearance: { ...structuredClone(DEFAULT_APPEARANCE), ...(stored.appearance ?? {}) },
      };
      state.appearance.light = { ...DEFAULT_APPEARANCE.light, ...(state.appearance.light ?? {}) };
      state.appearance.dark = { ...DEFAULT_APPEARANCE.dark, ...(state.appearance.dark ?? {}) };
      state.appearance.rotate = { ...DEFAULT_APPEARANCE.rotate, ...(state.appearance.rotate ?? {}) };
      if (stored.appearance?.v !== APPEARANCE_VERSION) {
        // Migrate field by field so a schema bump never discards tuned values.
        const previous = Number(stored.appearance?.v) || 0;
        if (previous < 5) {
          state.appearance.mode = DEFAULT_APPEARANCE.mode;
          state.appearance.floor = DEFAULT_APPEARANCE.floor;
          state.appearance.sidebarFloor = DEFAULT_APPEARANCE.sidebarFloor;
          state.appearance.opacity = DEFAULT_APPEARANCE.opacity;
          state.appearance.sidebarOpacity = DEFAULT_APPEARANCE.sidebarOpacity;
          state.appearance.inset = DEFAULT_APPEARANCE.inset;
          state.appearance.wallpaperOpacity = DEFAULT_APPEARANCE.wallpaperOpacity;
          state.appearance.backdropBlur = DEFAULT_APPEARANCE.backdropBlur;
          state.appearance.dim = DEFAULT_APPEARANCE.dim;
        }
        if (previous < 6) state.appearance.composerOpacity = DEFAULT_APPEARANCE.composerOpacity;
        if (previous < 7) state.appearance.dialogOpacity = DEFAULT_APPEARANCE.dialogOpacity;
        state.appearance.v = APPEARANCE_VERSION;
      }
    }
  } catch {
    // First run.
  }

  let writeChain = Promise.resolve();
  function persist() {
    const snapshot = JSON.stringify(state);
    writeChain = writeChain.then(async () => {
      await fs.promises.mkdir(filesDir, { recursive: true });
      atomicWrite(indexFile, snapshot);
    });
    return writeChain;
  }

  function totalBytes() {
    return state.items.reduce((sum, item) => sum + (item.bytes ?? 0), 0);
  }

  /** Keep the newest items; never evict an image a scheme currently points at. */
  function enforceCaps() {
    const keep = new Set();
    for (const scheme of ['light', 'dark']) {
      const source = state.appearance[scheme]?.source;
      if (typeof source === 'string' && source.startsWith('image:')) keep.add(source.slice(6));
    }
    state.items.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
    while (
      state.items.length > options.maxItems ||
      (state.items.length > 1 && totalBytes() > options.maxTotalBytes)
    ) {
      const victim = [...state.items].reverse().find((item) => !keep.has(item.id));
      if (!victim) break;
      state.items = state.items.filter((item) => item.id !== victim.id);
      void fs.promises.unlink(path.join(filesDir, victim.file)).catch(() => {});
    }
  }

  function publicItem(item) {
    return {
      id: item.id,
      name: item.name ?? '',
      bytes: item.bytes ?? 0,
      width: item.width ?? 0,
      height: item.height ?? 0,
      addedAt: item.addedAt ?? 0,
      url: `${prefix}/file/${item.id}`,
    };
  }

  function currentImageId(scheme) {
    const source = state.appearance[scheme]?.source;
    return typeof source === 'string' && source.startsWith('image:') ? source.slice(6) : null;
  }

  /**
   * Advance the rotation for the requested scheme when the interval elapsed.
   * Rotation only cycles uploaded images; presets stay until the user picks again.
   */
  function maybeRotate(scheme) {
    const rotate = state.appearance.rotate;
    if (!rotate?.enabled || (scheme !== 'light' && scheme !== 'dark')) return false;
    const intervalMs = Math.max(1, Number(rotate.intervalHours) || 6) * 3600_000;
    const now = Date.now();
    if (now - (rotate.lastAt ?? 0) < intervalMs) return false;
    const images = state.items.filter((item) => !item.kind || item.kind === 'image');
    if (images.length < 2) return false;
    const current = currentImageId(scheme);
    const order = images.map((item) => item.id);
    const cursor = rotate.cursor ?? (rotate.cursor = {});
    const start = current !== null && order.includes(current) ? order.indexOf(current) + 1 : (Number(cursor[scheme]) || 0);
    const nextId = order[start % order.length];
    state.appearance[scheme] = { source: `image:${nextId}` };
    cursor[scheme] = start % order.length;
    rotate.lastAt = now;
    return true;
  }

  function resolvedFor(scheme) {
    const other = scheme === 'dark' ? 'light' : 'dark';
    const own = state.appearance[scheme]?.source ?? null;
    if (own) return { source: own, inherited: false };
    const fallback = state.appearance[other]?.source ?? null;
    return { source: fallback, inherited: fallback !== null };
  }

  function stateView(scheme) {
    const rotated = maybeRotate(scheme);
    if (rotated) void persist();
    return {
      ok: true,
      now: Date.now(),
      scheme,
      items: [...state.items].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0)).map(publicItem),
      appearance: {
        light: state.appearance.light,
        dark: state.appearance.dark,
        mode: state.appearance.mode,
        floor: state.appearance.floor,
        sidebarFloor: state.appearance.sidebarFloor,
        composerOpacity: state.appearance.composerOpacity,
        dialogOpacity: state.appearance.dialogOpacity,
        opacity: state.appearance.opacity,
        sidebarOpacity: state.appearance.sidebarOpacity,
        inset: state.appearance.inset,
        wallpaperOpacity: state.appearance.wallpaperOpacity,
        backdropBlur: state.appearance.backdropBlur,
        blur: state.appearance.blur,
        dim: state.appearance.dim,
        fit: state.appearance.fit,
        rotate: { ...state.appearance.rotate, cursor: undefined },
      },
      resolved: { light: resolvedFor('light'), dark: resolvedFor('dark') },
      limits: { maxBytes: options.maxBytes, maxItems: options.maxItems },
    };
  }

  function send(res, status, payload, headers = {}) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(body),
      'cache-control': 'no-store',
      ...headers,
    });
    res.end(body);
  }

  /** Only this web origin may read or write: refuse cross-origin and non-loopback hosts. */
  function sameOrigin(request) {
    const origin = request.headers.origin;
    if (typeof origin === 'string' && origin.length > 0 && origin !== 'null') {
      try {
        const host = new URL(origin).hostname;
        if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') return false;
      } catch {
        return false;
      }
    }
    const host = String(request.headers.host ?? '').replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
    return host === '' || host === '127.0.0.1' || host === 'localhost' || host === '::1';
  }

  function methodNotAllowed(response) {
    response.writeHead(405, { 'cache-control': 'no-store' });
    response.end();
  }

  async function readJson(request) {
    const buffer = await readBody(request, 64 * 1024);
    if (buffer.length === 0) return {};
    return JSON.parse(buffer.toString('utf8'));
  }

  const routes = [];
  routes.push({
    kind: 'exact',
    path: `${prefix}/state`,
    handler: (request, response) => {
      if (request.method !== 'GET') return methodNotAllowed(response);
      if (!sameOrigin(request)) return send(response, 403, { ok: false, error: 'forbidden' });
      const query = new URL(request.url ?? '/', 'http://127.0.0.1').searchParams;
      const scheme = query.get('scheme') === 'dark' ? 'dark' : 'light';
      try {
        send(response, 200, stateView(scheme));
      } catch (error) {
        send(response, 500, { ok: false, error: String(error?.message ?? error) });
      }
    },
  });

  routes.push({
    kind: 'exact',
    path: `${prefix}/probe`,
    handler: async (request, response) => {
      if (request.method !== 'POST') return methodNotAllowed(response);
      if (!sameOrigin(request)) return send(response, 403, { ok: false, error: 'forbidden' });
      let body;
      try {
        body = await readJson(request);
      } catch {
        return send(response, 400, { ok: false, error: 'invalid JSON' });
      }
      const line = `${new Date().toISOString()} ${JSON.stringify(body)}\n`;
      try {
        await fs.promises.mkdir(root, { recursive: true });
        const logFile = path.join(root, 'probe.log');
        const stat = await fs.promises.stat(logFile).catch(() => null);
        if (stat && stat.size > 256 * 1024) await fs.promises.writeFile(logFile, '');
        await fs.promises.appendFile(logFile, line);
      } catch {
        // Diagnostics never break the caller.
      }
      send(response, 200, { ok: true });
    },
  });

  routes.push({
    kind: 'exact',
    path: `${prefix}/upload`,
    handler: async (request, response) => {
      if (request.method !== 'POST') return methodNotAllowed(response);
      if (!sameOrigin(request)) return send(response, 403, { ok: false, error: 'forbidden' });
      let buffer;
      try {
        buffer = await readBody(request, options.maxBytes);
      } catch (error) {
        const tooLarge = error?.code === 'ETOOLARGE';
        return send(response, tooLarge ? 413 : 400, { ok: false, error: tooLarge ? 'file is too large' : String(error?.message ?? error) });
      }
      const kind = sniffImage(buffer);
      if (!kind) return send(response, 415, { ok: false, error: 'unsupported image format' });
      if (buffer.length === 0) return send(response, 400, { ok: false, error: 'empty upload' });
      const id = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 16);
      const existing = state.items.find((item) => item.id === id);
      if (existing) return send(response, 200, { ok: true, item: publicItem(existing), duplicate: true });
      const file = `${id}.${kind.ext}`;
      const query = new URL(request.url ?? '/', 'http://127.0.0.1').searchParams;
      const item = {
        id,
        kind: 'image',
        file,
        mime: kind.mime,
        bytes: buffer.length,
        name: String(query.get('name') ?? '').slice(0, 200),
        width: intInRange(query.get('w'), 0, 20000, 0),
        height: intInRange(query.get('h'), 0, 20000, 0),
        addedAt: Date.now(),
      };
      try {
        await fs.promises.mkdir(filesDir, { recursive: true });
        await fs.promises.writeFile(path.join(filesDir, file), buffer);
      } catch (error) {
        return send(response, 500, { ok: false, error: `cannot store the image: ${String(error?.message ?? error)}` });
      }
      state.items.push(item);
      enforceCaps();
      await persist();
      send(response, 200, { ok: true, item: publicItem(item) });
    },
  });

  routes.push({
    kind: 'exact',
    path: `${prefix}/select`,
    handler: async (request, response) => {
      if (request.method !== 'POST') return methodNotAllowed(response);
      if (!sameOrigin(request)) return send(response, 403, { ok: false, error: 'forbidden' });
      let body;
      try {
        body = await readJson(request);
      } catch {
        return send(response, 400, { ok: false, error: 'invalid JSON' });
      }
      const scheme = body?.scheme === 'dark' ? 'dark' : body?.scheme === 'light' ? 'light' : null;
      if (!scheme) return send(response, 400, { ok: false, error: 'scheme must be light or dark' });
      const source = body?.source;
      if (source !== null && typeof source !== 'string') return send(response, 400, { ok: false, error: 'source must be a string or null' });
      if (typeof source === 'string') {
        if (source.startsWith('image:')) {
          const id = source.slice(6);
          if (!state.items.some((item) => item.id === id)) return send(response, 404, { ok: false, error: 'unknown image' });
        } else if (!/^preset:[a-z0-9-]{1,40}$/.test(source)) {
          return send(response, 400, { ok: false, error: 'unsupported source' });
        }
      }
      state.appearance[scheme] = { source };
      // A manual choice restarts the rotation clock for that scheme.
      state.appearance.rotate = { ...state.appearance.rotate, lastAt: Date.now() };
      await persist();
      send(response, 200, stateView(scheme));
    },
  });

  routes.push({
    kind: 'exact',
    path: `${prefix}/delete`,
    handler: async (request, response) => {
      if (request.method !== 'POST') return methodNotAllowed(response);
      if (!sameOrigin(request)) return send(response, 403, { ok: false, error: 'forbidden' });
      let body;
      try {
        body = await readJson(request);
      } catch {
        return send(response, 400, { ok: false, error: 'invalid JSON' });
      }
      const id = typeof body?.id === 'string' ? body.id : '';
      const item = state.items.find((entry) => entry.id === id);
      if (!item) return send(response, 404, { ok: false, error: 'unknown image' });
      state.items = state.items.filter((entry) => entry.id !== id);
      for (const scheme of ['light', 'dark']) {
        if (currentImageId(scheme) === id) state.appearance[scheme] = { source: null };
      }
      if (state.appearance.rotate?.cursor) delete state.appearance.rotate.cursor[id];
      try {
        await fs.promises.unlink(path.join(filesDir, item.file));
      } catch {
        // The index is the truth; a missing file is already gone.
      }
      await persist();
      send(response, 200, stateView('light'));
    },
  });

  routes.push({
    kind: 'exact',
    path: `${prefix}/settings`,
    handler: async (request, response) => {
      if (request.method !== 'POST') return methodNotAllowed(response);
      if (!sameOrigin(request)) return send(response, 403, { ok: false, error: 'forbidden' });
      let body;
      try {
        body = await readJson(request);
      } catch {
        return send(response, 400, { ok: false, error: 'invalid JSON' });
      }
      const appearance = state.appearance;
      if (body?.mode === 'full' || body?.mode === 'card') appearance.mode = body.mode;
      if (body?.floor !== undefined) appearance.floor = numberInRange(body.floor, 0.3, 0.7, appearance.floor);
      if (body?.sidebarFloor !== undefined) {
        appearance.sidebarFloor = numberInRange(body.sidebarFloor, 0.25, 0.7, appearance.sidebarFloor);
      }
      if (body?.composerOpacity !== undefined) {
        appearance.composerOpacity = numberInRange(body.composerOpacity, 0.5, 1, appearance.composerOpacity);
      }
      if (body?.dialogOpacity !== undefined) {
        appearance.dialogOpacity = numberInRange(body.dialogOpacity, 0.5, 1, appearance.dialogOpacity);
      }
      if (body?.opacity !== undefined) appearance.opacity = numberInRange(body.opacity, 0.6, 1, appearance.opacity);
      if (body?.sidebarOpacity !== undefined) {
        appearance.sidebarOpacity = numberInRange(body.sidebarOpacity, 0.2, 1, appearance.sidebarOpacity);
      }
      if (body?.inset !== undefined) appearance.inset = intInRange(body.inset, 0, 64, appearance.inset);
      if (body?.wallpaperOpacity !== undefined) {
        appearance.wallpaperOpacity = numberInRange(body.wallpaperOpacity, 0, 1, appearance.wallpaperOpacity);
      }
      if (body?.backdropBlur !== undefined) {
        appearance.backdropBlur = numberInRange(body.backdropBlur, 0, 40, appearance.backdropBlur);
      }
      if (body?.blur !== undefined) appearance.blur = numberInRange(body.blur, 0, 40, appearance.blur);
      if (body?.dim !== undefined) appearance.dim = numberInRange(body.dim, 0, 0.8, appearance.dim);
      if (body?.fit === 'cover' || body?.fit === 'contain') appearance.fit = body.fit;
      if (body?.rotate && typeof body.rotate === 'object') {
        if (typeof body.rotate.enabled === 'boolean') appearance.rotate.enabled = body.rotate.enabled;
        if (body.rotate.intervalHours !== undefined) {
          appearance.rotate.intervalHours = intInRange(body.rotate.intervalHours, 1, 168, appearance.rotate.intervalHours);
        }
      }
      await persist();
      const scheme = body?.scheme === 'dark' ? 'dark' : 'light';
      send(response, 200, stateView(scheme));
    },
  });

  routes.push({
    kind: 'prefix',
    // No trailing slash: the webserver matches `pathname === prefix || pathname.startsWith(prefix + '/')`,
    // so a prefix ending in '/' matches nothing.
    path: `${prefix}/file`,
    handler: (request, response) => {
      if (request.method !== 'GET') return methodNotAllowed(response);
      if (!sameOrigin(request)) return send(response, 403, { ok: false, error: 'forbidden' });
      const pathname = String(request.url ?? '').split('?')[0];
      const id = decodeURIComponent(pathname.slice(`${prefix}/file/`.length));
      const item = pathname.startsWith(`${prefix}/file/`) ? state.items.find((entry) => entry.id === id) : undefined;
      if (!item) return send(response, 404, { ok: false, error: 'unknown image' });
      const file = path.join(filesDir, item.file);
      const stream = fs.createReadStream(file);
      stream.on('error', () => {
        if (!response.headersSent) send(response, 404, { ok: false, error: 'image file is missing' });
        else response.destroy();
      });
      stream.once('open', () => {
        response.writeHead(200, {
          'content-type': item.mime ?? 'application/octet-stream',
          'content-length': item.bytes ?? 0,
          'cache-control': 'public, max-age=31536000, immutable',
        });
        stream.pipe(response);
      });
    },
  });

  ctx.effect(
    () => {
      const disposers = routes.map((route) => ctx.webServer.register(route));
      return () => {
        for (const dispose of disposers) dispose();
      };
    },
    'wallpaper-theme: routes',
  );

  fs.promises.mkdir(filesDir, { recursive: true }).catch(() => {});
  ctx.logger?.info?.(`wallpaper-theme: serving ${prefix} (library: ${root}, ${state.items.length} item(s))`);
}
