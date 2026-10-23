/**
 * 主题与壁纸 — Client half.
 *
 * Registers a sidebar footer button and a centred dialog. The wallpaper itself is
 * painted by a plugin-owned constructable stylesheet on `html::before`, and the
 * app's surface colours become translucent because the same stylesheet overrides
 * the `--dsw-alias-bg-*` tokens with `!important` declarations. That keeps the
 * effect independent of the theme service's inline variables.
 *
 * Everything here is plain DOM/CSSOM: no host package is imported, and both the
 * stylesheets and the token layer are removed when the plugin unloads.
 */
window.__ModuleLoader__.load({
  id: '@local/wallpaper-theme',
  factory(require) {
    const React = require('react');
    const ReactDOM = require('react-dom');
    const h = React.createElement;

    const PREFIX = '/api-wallpaper';
    const PLUGIN_ID = '@local/wallpaper-theme';
    const POLL_MS = 10_000;
    const MAX_BYTES = 20 * 1024 * 1024;
    const MAX_EDGE = 2560;

    const zh = {
      title: '主题与壁纸',
      button: '主题与壁纸',
      subtitle: '壁纸只保存在这台电脑上，不会上传到任何服务器。',
      close: '关闭',
      tabsHint: '选择要设置的方案',
      light: '浅色',
      dark: '深色',
      appearance: '外观',
      system: '跟随系统',
      dropTitle: '把图片拖到这里',
      dropHint: '或点击选择文件 · 支持 JPG / PNG / WebP · 单张不超过 20MB',
      dropActive: '松开即可上传',
      uploading: '正在处理图片…',
      library: '图库',
      libraryEmpty: '还没有壁纸，先上传一张',
      presets: '渐变预设',
      opacity: '卡片底色',
      sidebarOpacity: '侧栏磨砂',
      inset: '卡片边距',
      mode: '布局',
      modeFull: '铺满',
      modeCard: '浮窗',
      floor: '画布地板',
      sidebarFloor: '侧栏地板',
      composerOpacity: '输入栏不透明度',
      dialogOpacity: '弹窗不透明度',
      fullHint: '壁纸从窗口一边铺到另一边；对话区盖一层可调地板保证可读，卡片和设置页保持接近实心。',
      cardHint: '应用变成浮在壁纸上的圆角卡片，边距里壁纸 100% 显示。',
      floorHint: '对话区那层玻璃的下限。调低壁纸更明显，但文字也更容易被背景干扰。',
      cardFillHint: '浮窗卡片内部的不透明度；越高越接近原生界面。',
      sidebarFloorHint: '侧栏单独的下限。它比画布更透，是主要“看壁纸”的区域。',
      sidebarFrostHint: '浮窗模式下，侧栏那一列的磨砂程度。',
      insetHint: '卡片离窗口边缘多远，也就是四周露出多少壁纸。',
      composerHint: '输入框单独一层底；打字时不会和后面的内容叠在一起。',
      dialogHint: '这个设置弹窗自身的不透明度；调低能看到后面的界面，调高更好读。',
      blurHint: '壁纸图片自身的模糊，不影响界面元素。',
      dimHint: '压在壁纸上的黑色蒙层，用来提高文字对比度。',
      wallpaperOpacity: '壁纸强度',
      backdropBlur: '面板虚化',
      wallpaperHint: '壁纸本身的浓度：0% 相当于不显示壁纸。',
      backdropHint: '面板背后的磨砂强度：地板越薄，越需要它托住文字。',
      blur: '壁纸模糊',
      dim: '暗化',
      fit: '填充方式',
      cover: '铺满',
      contain: '适应',
      rotate: '自动轮换',
      rotateEvery: '每 {n} 小时换一张',
      rotateHint: '开启后按间隔自动切换到图库里的下一张壁纸。',
      reset: '恢复默认',
      delete: '删除',
      confirmDelete: '确认删除',
      applied: '已应用到「{scheme}」',
      apply: '应用',
      applying: '应用中…',
      appliedNow: '已应用到桌面端',
      unsaved: '有未应用的修改',
      applyHint: '点击后应用到桌面端',
      appliedHint: '当前没有待应用的修改',
      uploaded: '已上传，点「应用」生效',
      resetDraft: '已恢复默认，点「应用」生效',
      inherited: '未单独设置，沿用另一套方案',
      none: '无',
      current: '当前',
      tooLarge: '图片超过 20MB',
      uploadTimeout: '上传超时，请重试',
      notImage: '这不是图片文件',
      failed: '操作失败：{error}',
      loading: '读取中…',
      hours: '{n} 小时',
      deleteHint: '删除后不可恢复',
      tabApplied: '点击图片将应用到「{scheme}」',
    };

    const en = {
      title: 'Theme & wallpaper',
      button: 'Theme & wallpaper',
      subtitle: 'Wallpapers stay on this computer; nothing is uploaded to a server.',
      close: 'Close',
      tabsHint: 'Choose the palette to customise',
      light: 'Light',
      dark: 'Dark',
      appearance: 'Appearance',
      system: 'System',
      dropTitle: 'Drop an image here',
      dropHint: 'or click to choose · JPG / PNG / WebP · up to 20MB',
      dropActive: 'Release to upload',
      uploading: 'Processing image…',
      library: 'Library',
      libraryEmpty: 'No wallpapers yet — add one above',
      presets: 'Gradient presets',
      opacity: 'Card fill',
      sidebarOpacity: 'Sidebar frost',
      inset: 'Card inset',
      mode: 'Layout',
      modeFull: 'Full bleed',
      modeCard: 'Floating card',
      floor: 'Canvas floor',
      sidebarFloor: 'Sidebar floor',
      composerOpacity: 'Composer opacity',
      dialogOpacity: 'Dialog opacity',
      fullHint: 'The wallpaper runs edge to edge; the chat canvas carries an adjustable readability floor while cards and settings stay near-solid.',
      cardHint: 'The app floats as a rounded card; the inset shows the wallpaper at 100%.',
      floorHint: 'The glass floor behind the conversation. Lower shows more wallpaper, but text gets less protection.',
      cardFillHint: 'How solid the floating card is; higher looks closer to the native UI.',
      sidebarFloorHint: 'The sidebar has its own, thinner floor — it is where the wallpaper shows most.',
      sidebarFrostHint: 'In card mode, how frosted the sidebar column is.',
      insetHint: 'How far the card sits from the window edges — and how much wallpaper shows around it.',
      composerHint: 'The composer has its own fill so typed text never overlaps what is behind it.',
      dialogHint: 'This settings dialog’s own opacity: lower shows the UI behind it, higher is easier to read.',
      blurHint: 'Blur applied to the wallpaper image itself; UI elements are unaffected.',
      dimHint: 'A dark scrim over the wallpaper, used to raise text contrast.',
      wallpaperOpacity: 'Wallpaper strength',
      backdropBlur: 'Panel blur',
      wallpaperHint: 'How strong the wallpaper itself is; 0% hides it.',
      backdropHint: 'Frosting behind the surfaces: the thinner the floor, the more it has to do.',
      blur: 'Wallpaper blur',
      dim: 'Darkening',
      fit: 'Fit',
      cover: 'Cover',
      contain: 'Contain',
      rotate: 'Auto rotate',
      rotateEvery: 'Change every {n} hours',
      rotateHint: 'Switches to the next library wallpaper on the chosen interval.',
      reset: 'Reset',
      delete: 'Delete',
      confirmDelete: 'Confirm delete',
      applied: 'Applied to “{scheme}”',
      apply: 'Apply',
      applying: 'Applying…',
      appliedNow: 'Applied to the desktop',
      unsaved: 'Unapplied changes',
      applyHint: 'Apply these changes to the desktop',
      appliedHint: 'Nothing to apply',
      uploaded: 'Uploaded — press Apply',
      resetDraft: 'Defaults restored — press Apply',
      inherited: 'Not set separately; uses the other palette',
      none: 'None',
      current: 'Current',
      tooLarge: 'Image is larger than 20MB',
      uploadTimeout: 'Upload timed out, please retry',
      notImage: 'This is not an image file',
      failed: 'Failed: {error}',
      loading: 'Loading…',
      hours: '{n} h',
      deleteHint: 'Deleted images cannot be recovered',
      tabApplied: 'Clicking an image applies it to “{scheme}”',
    };

    const PRESETS = [
      { key: 'aurora', zh: '极光', en: 'Aurora', light: 'linear-gradient(135deg,#d7ecff 0%,#eef6ff 45%,#fdfdff 100%)', dark: 'linear-gradient(135deg,#08202f 0%,#10344a 55%,#0b1220 100%)' },
      { key: 'dusk', zh: '暮色', en: 'Dusk', light: 'linear-gradient(135deg,#ffe6d5 0%,#ffd5e5 55%,#e3d9ff 100%)', dark: 'linear-gradient(135deg,#2a1327 0%,#3a1c30 50%,#161226 100%)' },
      { key: 'mint', zh: '薄荷', en: 'Mint', light: 'linear-gradient(135deg,#d8f5e6 0%,#e8fbff 55%,#f7fffb 100%)', dark: 'linear-gradient(135deg,#0c2a24 0%,#123a33 55%,#0a1512 100%)' },
      { key: 'sand', zh: '暖沙', en: 'Sand', light: 'linear-gradient(135deg,#fff3dd 0%,#ffe9cc 55%,#fff8ee 100%)', dark: 'linear-gradient(135deg,#2a2113 0%,#3a2d1a 55%,#151109 100%)' },
      { key: 'graphite', zh: '石墨', en: 'Graphite', light: 'linear-gradient(135deg,#f2f4f7 0%,#e6e9ee 55%,#fafbfc 100%)', dark: 'linear-gradient(135deg,#141517 0%,#1f2124 55%,#0c0d0e 100%)' },
      { key: 'ocean', zh: '深海', en: 'Ocean', light: 'linear-gradient(135deg,#e0f2ff 0%,#d3e9ff 50%,#f0f9ff 100%)', dark: 'linear-gradient(135deg,#06182b 0%,#0a2740 55%,#050b14 100%)' },
    ];

    const CSS = `
.wp-btn{display:flex;align-items:center;gap:9px;width:100%;height:30px;padding:0 8px;border:0;border-radius:8px;
  background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer;
  white-space:nowrap;overflow:hidden;box-sizing:border-box}
.wp-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.wp-btn[data-narrow="true"]{justify-content:center;padding:0;gap:0}
.wp-btn[data-narrow="true"] span{display:none}
.wp-btn svg{width:18px;height:18px;flex:none}
.wp-backdrop{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;
  padding:28px;background:rgba(0,0,0,.42)}
.wp-dialog{width:min(840px,100%);max-height:min(90vh,860px);display:flex;flex-direction:column;overflow:hidden;
  border-radius:16px;border:1px solid var(--dsw-alias-border-l2);
  background:var(--wp-dialog-fill, var(--dsw-alias-bg-layer-3));
  color:var(--dsw-alias-label-primary);box-shadow:0 24px 70px rgba(0,0,0,.38)}
.wp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px 14px;
  border-bottom:1px solid var(--dsw-alias-border-l1)}
.wp-title{font-size:15px;font-weight:600}
.wp-sub{font-size:11.5px;color:var(--dsw-alias-label-tertiary);margin-top:3px}
.wp-x{border:0;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;font-size:15px;line-height:1;
  padding:6px 8px;border-radius:8px}
.wp-x:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.wp-body{padding:16px 20px 20px;overflow:auto;display:flex;flex-direction:column;gap:18px}
.wp-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.wp-seg{display:inline-flex;padding:2px;border-radius:9px;background:var(--dsw-alias-bg-layer-1);
  border:1px solid var(--dsw-alias-border-l1)}
.wp-seg button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;
  padding:5px 12px;border-radius:7px;cursor:pointer;white-space:nowrap}
.wp-seg button:hover{color:var(--dsw-alias-label-primary)}
.wp-seg button[data-active="true"]{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);
  box-shadow:var(--dsw-elevation-stroke,0 0 0 .5px var(--dsw-alias-border-l2))}
.wp-label{font-size:12px;color:var(--dsw-alias-label-secondary);font-weight:500;display:flex;align-items:center;gap:8px}
.wp-hint{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.wp-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:26px 16px;
  border:1.5px dashed var(--dsw-alias-border-l2);border-radius:12px;cursor:pointer;text-align:center;
  background:var(--dsw-alias-bg-layer-1);transition:border-color .12s,background .12s}
.wp-drop:hover,.wp-drop[data-over="true"]{border-color:var(--dsw-alias-state-business-primary);
  background:var(--dsw-alias-interactive-bg-hover)}
.wp-drop[data-busy="true"]{pointer-events:none;opacity:.7}
.wp-drop strong{font-size:13px;font-weight:500}
.wp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px}
.wp-tile{position:relative;aspect-ratio:16/10;border-radius:10px;overflow:hidden;cursor:pointer;
  border:2px solid transparent;background:var(--dsw-alias-bg-layer-1);padding:0}
.wp-tile img{width:100%;height:100%;object-fit:cover;display:block}
.wp-tile[data-selected="true"]{border-color:var(--dsw-alias-state-business-primary)}
.wp-tile[data-selected="true"]::after{content:"";position:absolute;inset:0;background:rgba(59,130,246,.12)}
.wp-tile-del{position:absolute;top:6px;right:6px;z-index:2;border:0;border-radius:6px;padding:3px 6px;
  font-size:11px;cursor:pointer;background:rgba(0,0,0,.55);color:#fff;opacity:0;transition:opacity .12s}
.wp-tile:hover .wp-tile-del{opacity:1}
.wp-tile-del[data-confirm="true"]{background:var(--dsw-alias-state-error-primary);opacity:1}
.wp-chip{position:relative;height:54px;border-radius:10px;border:2px solid transparent;cursor:pointer;padding:0;
  overflow:hidden;display:flex;align-items:flex-end;justify-content:flex-start}
.wp-chip[data-selected="true"]{border-color:var(--dsw-alias-state-business-primary)}
.wp-chip span{position:relative;z-index:1;font-size:11px;padding:4px 8px;color:#fff;
  text-shadow:0 1px 3px rgba(0,0,0,.55)}
.wp-chip i{position:absolute;inset:0}
.wp-empty{font-size:12px;color:var(--dsw-alias-label-tertiary);padding:14px 0}
.wp-field{display:flex;flex-direction:column;gap:7px;padding:11px 0;border-top:1px solid var(--dsw-alias-border-l1)}
.wp-field:first-of-type{border-top:0;padding-top:2px}
.wp-field-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.wp-field-label{font-size:12.5px;font-weight:500;color:var(--dsw-alias-label-primary)}
.wp-field-value{display:inline-flex;align-items:center;gap:4px;flex:none}
.wp-number{width:56px;height:24px;text-align:right;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;
  background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;
  padding:0 6px;font-variant-numeric:tabular-nums}
.wp-number:focus{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px;border-color:transparent}
.wp-unit{font-size:11px;color:var(--dsw-alias-label-tertiary);min-width:14px}
.wp-range{width:100%;height:18px;cursor:pointer;accent-color:var(--dsw-alias-state-business-primary)}
.wp-field-hint{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}
.wp-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 20px;
  border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.wp-note{font-size:11.5px;color:var(--dsw-alias-label-tertiary)}
.wp-actions{display:flex;gap:8px;align-items:center}
.wp-action{border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);
  border-radius:8px;padding:5px 12px;font:inherit;font-size:12px;cursor:pointer;height:28px}
.wp-action:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.wp-action[disabled]{opacity:.55;cursor:default}
.wp-action[data-primary="true"]{background:var(--dsw-alias-state-business-primary);border-color:transparent;color:#fff}
.wp-action[data-primary="true"]:hover:not([disabled]){background:var(--dsw-alias-state-business-primary);
  color:#fff;filter:brightness(1.06)}
.wp-action[data-primary="true"][disabled]{opacity:.45}
.wp-action[data-danger="true"]{color:var(--dsw-alias-state-error-primary)}
.wp-error{font-size:12px;color:var(--dsw-alias-state-error-primary)}
.wp-switch{position:relative;width:38px;height:22px;border-radius:11px;border:0;cursor:pointer;
  background:var(--dsw-alias-border-l3);transition:background .15s;padding:0}
.wp-switch[data-on="true"]{background:var(--dsw-alias-state-business-primary)}
.wp-switch i{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;
  background:#fff;transition:transform .15s;display:block}
.wp-switch[data-on="true"] i{transform:translateX(16px)}
.wp-section{display:flex;flex-direction:column;gap:8px}
.wp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

    // ------------------------------------------------------------------ helpers
    function langOf(ctx) {
      try {
        const active = ctx.locale?.snapshot?.active;
        if (typeof active === 'string' && active.length > 0) return active.toLowerCase();
      } catch {
        // fall through
      }
      return (document.documentElement.lang || 'zh').toLowerCase();
    }

    function translator(ctx) {
      try {
        ctx.effect(() => ctx.locale.register('wallpaper-theme', { zh, en }), 'wallpaper-theme: locale');
        return ctx.locale.bind('wallpaper-theme');
      } catch {
        const dictionary = langOf(ctx).startsWith('zh') ? zh : en;
        return (key, params) => {
          const template = dictionary[key] ?? zh[key] ?? key;
          if (!params) return template;
          return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
        };
      }
    }

    function clamp(value, min, max) {
      const number = Number(value);
      if (!Number.isFinite(number)) return min;
      return Math.max(min, Math.min(max, number));
    }

    function currentScheme(ctx) {
      let preference = 'system';
      try {
        preference = ctx.theme?.getTheme?.().preference ?? 'system';
      } catch {
        preference = 'system';
      }
      if (preference === 'light' || preference === 'dark') return preference;
      return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
    }

    function api(path) {
      return `${PREFIX}${path}`;
    }

    /**
     * JSON request with a hard deadline. A dead or hung Host would otherwise leave
     * the liveness poll pending forever, so the wallpaper would never be shed.
     * Errors carry flags so callers can tell "not installed" from "server error".
     */
    async function requestJson(path, init, timeoutMs = 15_000) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(api(path), {
          cache: 'no-store',
          ...init,
          signal: controller.signal,
          headers: { accept: 'application/json', ...(init?.headers ?? {}) },
        });
        const text = await response.text();
        let payload;
        try {
          payload = text ? JSON.parse(text) : {};
        } catch {
          payload = { ok: false, error: text.slice(0, 200) };
        }
        // Keep the HTTP status: the liveness check keys off 404 rather than wording.
        payload = { ...payload, status: response.status };
        if (!response.ok && payload.ok !== false) {
          payload = { ok: false, error: `HTTP ${response.status}`, status: response.status };
        }
        return payload;
      } catch (error) {
        if (error?.name === 'AbortError') {
          const timeout = new Error(`timeout after ${timeoutMs}ms`);
          timeout.timeout = true;
          throw timeout;
        }
        const network = new Error(String(error?.message ?? error));
        network.network = true;
        throw network;
      } finally {
        clearTimeout(timer);
      }
    }

    /** Downscale before uploading so a 12MP photo does not become a 6MB request. */
    async function prepareImage(file) {
      if (!file.type.startsWith('image/')) throw new Error('notImage');
      if (file.size > MAX_BYTES) throw new Error('tooLarge');
      let bitmap;
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        return { blob: file, width: 0, height: 0 };
      }
      const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      if (scale === 1 && file.size <= 1_200_000 && (file.type === 'image/jpeg' || file.type === 'image/webp')) {
        bitmap.close?.();
        return { blob: file, width, height };
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close?.();
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
      if (!blob) return { blob: file, width, height };
      return { blob, width, height };
    }

    /**
     * Surface tokens, written as `!important` custom-property declarations in our
     * own stylesheet. The theme presenter writes the same names inline on `body`;
     * an important stylesheet declaration still wins over a normal inline one, so
     * the panels turn translucent without depending on the theme service.
     */
    function tokenCss(appearance) {
      const cardMode = appearance.mode === 'card';
      const canvas = cardMode
        ? clamp(appearance.opacity ?? 0.92, 0.6, 1)
        : clamp(appearance.floor ?? 0.46, 0.3, 0.7);
      const sidebar = cardMode
        ? clamp(appearance.sidebarOpacity ?? 0.62, 0.2, 1)
        : clamp(appearance.sidebarFloor ?? 0.38, 0.25, 0.7);
      const darkCanvas = cardMode ? canvas : Math.min(0.85, canvas + 0.14);
      const darkSidebar = cardMode ? sidebar : Math.min(0.85, sidebar + 0.14);
      const fill = (base, offset, cap = 0.97) => Math.min(cap, base + offset).toFixed(3);
      // Card mode keeps every surface near-opaque. Full mode keeps only the
      // text-dense surfaces solid: the canvas carries the wallpaper.
      const layer = (offset, darkOffset) =>
        cardMode ? [fill(canvas, 0.03), fill(darkCanvas, 0.03)] : [fill(canvas, offset), fill(darkCanvas, darkOffset)];
      const layers = [
        ['--dsw-alias-bg-layer-1', layer(0.42, 0.36)],
        ['--dsw-alias-bg-layer-2', layer(0.45, 0.38)],
        ['--dsw-alias-bg-layer-3', layer(0.48, 0.40)],
      ];
      // The composer gets its own knob: text is typed there, so it must never be
      // as see-through as the canvas behind it.
      const composer = Math.min(1, clamp(appearance.composerOpacity ?? 0.94, 0.5, 1));
      const composerDark = Math.min(1, composer + 0.03);
      const light = [
        `--dsw-alias-bg-base:rgba(255,255,255,${canvas.toFixed(3)})!important`,
        ...layers.map(([name, pair]) => `${name}:rgba(255,255,255,${pair[0]})!important`),
        `--dsw-specific-input-major:rgba(255,255,255,${composer.toFixed(3)})!important`,
        `--dsw-specific-sidebar-fill:rgba(255,255,255,${sidebar.toFixed(3)})!important`,
      ].join(';');
      const dark = [
        `--dsw-alias-bg-base:rgba(15,20,33,${darkCanvas.toFixed(3)})!important`,
        ...layers.map(([name, pair]) => `${name}:rgba(15,20,33,${pair[1]})!important`),
        `--dsw-specific-input-major:rgba(15,20,33,${composerDark.toFixed(3)})!important`,
        `--dsw-specific-sidebar-fill:rgba(15,20,33,${darkSidebar.toFixed(3)})!important`,
      ].join(';');
      return `body{${light}}body[data-ds-dark-theme]{${dark}}`;
    }

    function buildWallpaperCss(source, appearance, scheme) {
      const dim = clamp(appearance.dim ?? 0.15, 0, 0.8);
      const blur = clamp(appearance.blur ?? 0, 0, 40);
      const wallpaperOpacity = clamp(appearance.wallpaperOpacity ?? 1, 0, 1);
      const backdropBlur = clamp(appearance.backdropBlur ?? 0, 0, 40);
      const bleed = Math.max(24, Math.ceil(blur * 2));
      // Fade toward the palette's own base instead of `opacity`, so the backdrop
      // stays opaque and `backdrop-filter` keeps working.
      const fade = (1 - wallpaperOpacity).toFixed(3);
      const fadeColor = scheme === 'dark' ? '15,20,33' : '248,249,251';
      const baseFade = `linear-gradient(rgba(${fadeColor},${fade}),rgba(${fadeColor},${fade}))`;
      const scrim = `linear-gradient(rgba(0,0,0,${dim}),rgba(0,0,0,${dim}))`;
      let layers;
      let sizes;
      if (source.startsWith('preset:')) {
        const preset = PRESETS.find((entry) => `preset:${entry.key}` === source);
        if (!preset) return null;
        layers = `${baseFade}, ${scrim}, ${preset[scheme]}`;
        sizes = 'cover, cover, cover';
      } else if (source.startsWith('image:')) {
        const id = source.slice(6).replace(/[^a-f0-9]/gi, '');
        if (id.length === 0) return null;
        layers = `${baseFade}, ${scrim}, url("${api(`/file/${id}`)}")`;
        sizes = `cover, cover, ${appearance.fit === 'contain' ? 'contain' : 'cover'}`;
      } else {
        return null;
      }
      const cardMode = appearance.mode === 'card';
      const inset = Math.round(clamp(appearance.inset ?? 0, 0, 64));
      const frosted = backdropBlur > 0
        // Blurring behind the frame softens the wallpaper under every surface, so
        // a 45–60% readability floor still reads as a wallpaper.
        ? `#root > div, #root div:has(> [data-shell-overlay]){backdrop-filter:blur(${backdropBlur}px);-webkit-backdrop-filter:blur(${backdropBlur}px)}`
        : '';
      // Desktop shells paint extra opaque layers of their own; with a wallpaper
      // active they must let it through (the reference project hit the same ones).
      const shellClear = [
        'body{--dsh-desktop-frame-fill:transparent!important}',
        '.dshDesktopFrame{background:transparent!important}',
        '[data-dsh-desktop-mode="extended"] .dshDesktopSidebarSurface,',
        '[data-dsh-desktop-mode="advanced"] .dshDesktopSidebarSurface{background:transparent!important}',
      ].join('');
      let layout;
      if (cardMode) {
        const clearFrame = '#root, #root > div, #root div:has(> [data-shell-overlay]){background:transparent!important}';
        const card = '#root > div, #root div:has(> [data-shell-overlay]){border-radius:14px;overflow:hidden;box-shadow:0 10px 36px rgba(0,0,0,.28)}';
        layout = inset > 0
          ? [
              `#root{padding:${inset}px;box-sizing:border-box}`,
              // The native caption strip already owns the top edge on Windows; keep
              // the card flush there so the system buttons are not half over the gap.
              'html[data-windows-titlebar] #root{padding-top:0}',
              clearFrame,
              card,
            ].join('')
          : clearFrame;
      } else {
        // Full mode: no inset, no card. The frame keeps its canvas token, the
        // columns paint their own floors, and the wallpaper runs edge to edge.
        layout = shellClear;
      }
      // The composer card floats over the conversation; its own frost keeps the
      // text behind it from bleeding through the input text.
      const composerFrost =
        '[data-composer-card]{backdrop-filter:blur(18px) saturate(1.15);-webkit-backdrop-filter:blur(18px) saturate(1.15)}';
      return [
        'html,body{background:transparent!important}',
        `html::before{content:"";position:fixed;inset:-${bleed}px;z-index:-1;pointer-events:none;`,
        `background-color:#101014;background-image:${layers};`,
        `background-position:center,center;background-size:${sizes};background-repeat:no-repeat,no-repeat;`,
        `filter:blur(${blur}px);transform:translateZ(0)}`,
        layout,
        cardMode ? shellClear : '',
        frosted,
        composerFrost,
        tokenCss(appearance),
      ].join('');
    }

    // ------------------------------------------------------------------- store
    const EMPTY_DRAFT = Object.freeze({
      light: null,
      dark: null,
      mode: 'full',
      floor: 0.46,
      sidebarFloor: 0.38,
      composerOpacity: 0.94,
      dialogOpacity: 0.97,
      opacity: 0.92,
      sidebarOpacity: 0.62,
      inset: 24,
      wallpaperOpacity: 1,
      backdropBlur: 24,
      blur: 0,
      dim: 0.15,
      fit: 'cover',
      rotate: { enabled: false, intervalHours: 6 },
    });

    /** The editable copy of the applied appearance. Nothing here reaches the desktop until Apply. */
    function draftFrom(data) {
      const appearance = data?.appearance;
      if (!appearance) return { ...EMPTY_DRAFT, rotate: { ...EMPTY_DRAFT.rotate } };
      return {
        light: appearance.light?.source ?? null,
        dark: appearance.dark?.source ?? null,
        mode: appearance.mode === 'card' ? 'card' : 'full',
        floor: Number.isFinite(appearance.floor) ? appearance.floor : EMPTY_DRAFT.floor,
        sidebarFloor: Number.isFinite(appearance.sidebarFloor) ? appearance.sidebarFloor : EMPTY_DRAFT.sidebarFloor,
        composerOpacity: Number.isFinite(appearance.composerOpacity) ? appearance.composerOpacity : EMPTY_DRAFT.composerOpacity,
        dialogOpacity: Number.isFinite(appearance.dialogOpacity) ? appearance.dialogOpacity : EMPTY_DRAFT.dialogOpacity,
        opacity: Number.isFinite(appearance.opacity) ? appearance.opacity : EMPTY_DRAFT.opacity,
        sidebarOpacity: Number.isFinite(appearance.sidebarOpacity) ? appearance.sidebarOpacity : EMPTY_DRAFT.sidebarOpacity,
        inset: Number.isFinite(appearance.inset) ? appearance.inset : EMPTY_DRAFT.inset,
        wallpaperOpacity: Number.isFinite(appearance.wallpaperOpacity) ? appearance.wallpaperOpacity : EMPTY_DRAFT.wallpaperOpacity,
        backdropBlur: Number.isFinite(appearance.backdropBlur) ? appearance.backdropBlur : EMPTY_DRAFT.backdropBlur,
        blur: Number.isFinite(appearance.blur) ? appearance.blur : EMPTY_DRAFT.blur,
        dim: Number.isFinite(appearance.dim) ? appearance.dim : EMPTY_DRAFT.dim,
        fit: appearance.fit === 'contain' ? 'contain' : 'cover',
        rotate: {
          enabled: Boolean(appearance.rotate?.enabled),
          intervalHours: Number(appearance.rotate?.intervalHours) || EMPTY_DRAFT.rotate.intervalHours,
        },
      };
    }

    function sameDraft(left, right) {
      if (!left || !right) return left === right;
      return (
        left.light === right.light &&
        left.dark === right.dark &&
        left.mode === right.mode &&
        left.floor === right.floor &&
        left.sidebarFloor === right.sidebarFloor &&
        left.composerOpacity === right.composerOpacity &&
        left.dialogOpacity === right.dialogOpacity &&
        left.opacity === right.opacity &&
        left.sidebarOpacity === right.sidebarOpacity &&
        left.inset === right.inset &&
        left.wallpaperOpacity === right.wallpaperOpacity &&
        left.backdropBlur === right.backdropBlur &&
        left.blur === right.blur &&
        left.dim === right.dim &&
        left.fit === right.fit &&
        left.rotate.enabled === right.rotate.enabled &&
        left.rotate.intervalHours === right.rotate.intervalHours
      );
    }

    function createStore() {
      let state = {
        open: false,
        loading: true,
        busy: false,
        disabled: false,
        error: null,
        data: null,
        tab: null,
        notice: null,
        confirmId: null,
        dragOver: false,
        tick: 0,
        draft: null,
        applied: null,
        dirty: false,
      };
      const listeners = new Set();
      return {
        get: () => state,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        set(patch) {
          state = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
          for (const listener of [...listeners]) listener();
        },
      };
    }

    function useStore(store) {
      const [snapshot, setSnapshot] = React.useState(store.get);
      React.useEffect(() => store.subscribe(() => setSnapshot(store.get())), [store]);
      return snapshot;
    }

    /** Surface a render failure instead of letting the slot entry vanish silently. */
    class Boundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }
      static getDerivedStateFromError(error) {
        return { error: String(error?.message ?? error) };
      }
      componentDidCatch(error, info) {
        console.error('[wallpaper-theme] panel render failed', error, info);
        this.props.report?.('panel-crash', error, info?.componentStack);
      }
      render() {
        if (this.state.error) {
          const close = () => {
            this.setState({ error: null });
            this.props.onClose?.();
          };
          return h(
            'div',
            {
              className: 'wp-backdrop',
              onMouseDown: (event) => {
                if (event.target === event.currentTarget) close();
              },
            },
            h(
              'div',
              { className: 'wp-dialog', style: { padding: '18px 20px 20px', gap: 12 } },
              h(
                'div',
                { className: 'wp-head', style: { padding: 0, border: 0, marginBottom: 4 } },
                h('div', { className: 'wp-title' }, '主题与壁纸'),
                h('button', { type: 'button', className: 'wp-x', title: '关闭', onClick: close }, '✕'),
              ),
              h('div', { className: 'wp-error' }, this.state.error),
              h(
                'div',
                { className: 'wp-actions', style: { marginTop: 8 } },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'wp-action',
                    onClick: () => this.setState({ error: null }),
                  },
                  '重试',
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'wp-action',
                    onClick: close,
                  },
                  '关闭',
                ),
              ),
            ),
          );
        }
        return this.props.children;
      }
    }

    // ------------------------------------------------------------------ visuals
    function ThemeButton({ store, t, wide, report }) {
      const state = useStore(store);
      // The host half answers the liveness poll; when it is gone the button goes
      // with it instead of lingering after the bundle was disabled.
      if (state.disabled) return null;
      return h(
        'button',
        {
          type: 'button',
          className: 'wp-btn',
          title: t('button'),
          'data-narrow': wide === false ? 'true' : 'false',
          onClick: () => {
            report?.('click');
            store.set({ open: true });
          },
        },
        h(
          'svg',
          { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
          h('rect', { x: 3, y: 4, width: 18, height: 16, rx: 3, stroke: 'currentColor', strokeWidth: 1.6 }),
          h('circle', { cx: 9, cy: 10, r: 1.8, fill: 'currentColor' }),
          h('path', { d: 'M4.5 17.5 9 13l3 3 2.5-2.5L20 18', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        ),
        h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, t('button')),
      );
    }

    /**
     * One labelled control: title, editable value box, range, and its own hint.
     *
     * Dragging only updates local state (no store traffic, no re-render of the
     * panel); the draft is written once when the drag ends. The number box accepts
     * a typed value so any exact setting is reachable without hunting the thumb.
     */
    function Slider({ label, hint, value, min, max, step, unit, onCommit }) {
      const percent = unit === 'percent';
      const toText = (raw) => String(percent ? Math.round(raw * 100) : Math.round(raw));
      const fromText = (text) => {
        const number = Number(String(text).replace(/[^0-9.-]/g, ''));
        if (!Number.isFinite(number) || String(text).trim() === '') return null;
        return percent ? number / 100 : number;
      };
      const [local, setLocal] = React.useState(value);
      const [editing, setEditing] = React.useState(null);
      React.useEffect(() => setLocal(value), [value]);
      const commit = (next) => {
        if (next === null) return;
        const clamped = Math.min(max, Math.max(min, next));
        setLocal(clamped);
        if (Math.abs(clamped - value) > 1e-9) onCommit(clamped);
      };
      const shown = editing !== null ? editing : toText(local);
      return h(
        'div',
        { className: 'wp-field' },
        h(
          'div',
          { className: 'wp-field-head' },
          h('span', { className: 'wp-field-label' }, label),
          h(
            'span',
            { className: 'wp-field-value' },
            h('input', {
              className: 'wp-number',
              type: 'text',
              inputMode: 'decimal',
              value: shown,
              'aria-label': label,
              onFocus: () => setEditing(toText(local)),
              onChange: (event) => setEditing(event.target.value),
              onBlur: () => {
                const next = fromText(editing === null ? toText(local) : editing);
                setEditing(null);
                commit(next);
              },
              onKeyDown: (event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') {
                  setEditing(null);
                  event.currentTarget.blur();
                }
              },
            }),
            h('span', { className: 'wp-unit' }, percent ? '%' : 'px'),
          ),
        ),
        h('input', {
          className: 'wp-range',
          type: 'range',
          min,
          max,
          step,
          value: local,
          'aria-label': label,
          onChange: (event) => setLocal(Number(event.target.value)),
          onPointerUp: (event) => commit(Number(event.currentTarget.value)),
          onPointerCancel: (event) => commit(Number(event.currentTarget.value)),
          onKeyUp: (event) => commit(Number(event.currentTarget.value)),
          onBlur: (event) => commit(Number(event.currentTarget.value)),
        }),
        hint ? h('div', { className: 'wp-field-hint' }, hint) : null,
      );
    }

    function Segmented({ options, value, onChange }) {
      return h(
        'div',
        { className: 'wp-seg', role: 'tablist' },
        options.map((option) =>
          h(
            'button',
            {
              key: option.value,
              type: 'button',
              role: 'tab',
              'aria-selected': option.value === value,
              'data-active': option.value === value ? 'true' : 'false',
              onClick: () => onChange(option.value),
            },
            option.label,
          ),
        ),
      );
    }

    function Panel({ store, controller, ctx, t, report }) {
      const state = useStore(store);
      const fileRef = React.useRef(null);
      const confirmTimer = React.useRef(null);

      React.useEffect(() => {
        if (!state.open) return undefined;
        report?.('panel-open', undefined, `data=${state.data ? 'yes' : 'no'}`);
        void controller.refresh();
        const onKey = (event) => {
          if (event.key === 'Escape') store.set({ open: false });
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [state.open, store, controller, report]);

      React.useEffect(() => {
        if (state.confirmId === null) return undefined;
        confirmTimer.current = setTimeout(() => store.set({ confirmId: null }), 3000);
        return () => clearTimeout(confirmTimer.current);
      }, [state.confirmId, store]);

      if (!state.open) return null;

      const data = state.data;
      const scheme = currentScheme(ctx);
      const zhUI = langOf(ctx).startsWith('zh');
      const tab = state.tab ?? scheme;
      const draft = state.draft ?? draftFrom(data);
      const items = data?.items ?? [];
      const selectedSource = draft[tab] ?? null;
      const tabLabel = t(tab);

      const pick = (source) => controller.setDraft({ [tab]: source });
      const close = () => {
        controller.discardDraft();
        store.set({ open: false, notice: null });
      };

      const dialogAlpha = clamp(draft.dialogOpacity ?? 0.97, 0.5, 1);
      const dialogFill =
        scheme === 'dark'
          ? `rgba(15,20,33,${dialogAlpha.toFixed(3)})`
          : `rgba(255,255,255,${dialogAlpha.toFixed(3)})`;

      const schemeOptions = [
        { value: 'light', label: t('light') },
        { value: 'dark', label: t('dark') },
        { value: 'system', label: t('system') },
      ];

      const dialog = h(
        'div',
        {
          className: 'wp-backdrop',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) close();
          },
        },
        h(
          'div',
          { className: 'wp-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('title'), style: { '--wp-dialog-fill': dialogFill } },
          h(
            'div',
            { className: 'wp-head' },
            h(
              'div',
              null,
              h('div', { className: 'wp-title' }, t('title')),
              h('div', { className: 'wp-sub' }, t('subtitle')),
            ),
            h('button', { type: 'button', className: 'wp-x', onClick: close, title: t('close') }, '✕'),
          ),
          h(
            'div',
            { className: 'wp-body' },
            h(
              'div',
              { className: 'wp-row' },
              h('span', { className: 'wp-label' }, t('appearance')),
              h(Segmented, {
                options: schemeOptions,
                value: ctx.theme?.getTheme?.().preference ?? 'system',
                onChange: (value) => void controller.setAppearance(value),
              }),
            ),
            state.error ? h('div', { className: 'wp-error' }, state.error) : null,
            h(
              'div',
              {
                className: 'wp-drop',
                'data-over': state.dragOver ? 'true' : 'false',
                'data-busy': state.busy ? 'true' : 'false',
                role: 'button',
                tabIndex: 0,
                onClick: () => fileRef.current?.click(),
                onKeyDown: (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileRef.current?.click();
                  }
                },
                onDragOver: (event) => {
                  event.preventDefault();
                  if (!state.dragOver) store.set({ dragOver: true });
                },
                onDragLeave: (event) => {
                  if (event.currentTarget.contains(event.relatedTarget)) return;
                  store.set({ dragOver: false });
                },
                onDrop: (event) => {
                  event.preventDefault();
                  store.set({ dragOver: false });
                  const file = event.dataTransfer?.files?.[0];
                  if (file) void controller.upload(file);
                },
              },
              h('input', {
                ref: fileRef,
                type: 'file',
                accept: 'image/*',
                className: 'wp-sr',
                onClick: (event) => event.stopPropagation(),
                onChange: (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void controller.upload(file);
                },
              }),
              h('strong', null, state.busy ? t('uploading') : state.dragOver ? t('dropActive') : t('dropTitle')),
              h('span', { className: 'wp-hint' }, t('dropHint')),
            ),
            h(
              'div',
              { className: 'wp-row' },
              h('div', null,
                h('span', { className: 'wp-label' }, t('tabsHint')),
                h('div', { className: 'wp-hint' }, t('tabApplied', { scheme: tabLabel })),
              ),
              h(Segmented, {
                options: [
                  { value: 'light', label: t('light') },
                  { value: 'dark', label: t('dark') },
                ],
                value: tab,
                onChange: (value) => store.set({ tab: value }),
              }),
            ),
            h(
              'div',
              { className: 'wp-section' },
              h('span', { className: 'wp-label' }, `${t('library')}${items.length ? ` · ${items.length}` : ''}`),
              items.length === 0
                ? h('div', { className: 'wp-empty' }, t('libraryEmpty'))
                : h(
                    'div',
                    { className: 'wp-grid' },
                    items.map((item) =>
                      h(
                        'div',
                        { key: item.id, style: { position: 'relative' } },
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'wp-tile',
                            'data-selected': selectedSource === `image:${item.id}` ? 'true' : 'false',
                            title: item.name || item.id,
                            'aria-label': item.name || item.id,
                            onClick: () => pick(`image:${item.id}`),
                          },
                          h('img', { src: item.url, alt: item.name || '', loading: 'lazy', draggable: false }),
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'wp-tile-del',
                            'data-confirm': state.confirmId === item.id ? 'true' : 'false',
                            title: state.confirmId === item.id ? t('confirmDelete') : t('delete'),
                            onClick: (event) => {
                              event.stopPropagation();
                              if (state.confirmId === item.id) {
                                store.set({ confirmId: null });
                                void controller.remove(item.id);
                              } else {
                                store.set({ confirmId: item.id });
                              }
                            },
                          },
                          state.confirmId === item.id ? t('confirmDelete') : '✕',
                        ),
                      ),
                    ),
                  ),
            ),
            h(
              'div',
              { className: 'wp-section' },
              h('span', { className: 'wp-label' }, t('presets')),
              h(
                'div',
                { className: 'wp-grid' },
                PRESETS.map((preset) =>
                  h(
                    'button',
                    {
                      key: preset.key,
                      type: 'button',
                      className: 'wp-chip',
                      'data-selected': selectedSource === `preset:${preset.key}` ? 'true' : 'false',
                      title: zhUI ? preset.zh : preset.en,
                      onClick: () => pick(`preset:${preset.key}`),
                    },
                    h('i', { style: { background: preset[tab] } }),
                    h('span', null, zhUI ? preset.zh : preset.en),
                  ),
                ),
              ),
            ),
            h(
              'div',
              { className: 'wp-row' },
              h('span', { className: 'wp-label' }, t('mode')),
              h(Segmented, {
                options: [
                  { value: 'full', label: t('modeFull') },
                  { value: 'card', label: t('modeCard') },
                ],
                value: draft.mode,
                onChange: (value) => controller.setDraft({ mode: value }),
              }),
            ),
            h('div', { className: 'wp-hint' }, draft.mode === 'card' ? t('cardHint') : t('fullHint')),
            draft.mode === 'card'
              ? h(Slider, {
                  label: t('inset'),
                  hint: t('insetHint'),
                  value: draft.inset,
                  min: 0,
                  max: 64,
                  step: 1,
                  unit: 'px',
                  onCommit: (value) => controller.setDraft({ inset: value }),
                })
              : null,
            h(Slider, {
              label: draft.mode === 'card' ? t('opacity') : t('floor'),
              hint: draft.mode === 'card' ? t('cardFillHint') : t('floorHint'),
              value: draft.mode === 'card' ? draft.opacity : draft.floor,
              min: draft.mode === 'card' ? 0.6 : 0.3,
              max: draft.mode === 'card' ? 1 : 0.7,
              step: 0.01,
              unit: 'percent',
              onCommit: (value) => controller.setDraft(draft.mode === 'card' ? { opacity: value } : { floor: value }),
            }),
            h(Slider, {
              label: draft.mode === 'card' ? t('sidebarOpacity') : t('sidebarFloor'),
              hint: draft.mode === 'card' ? t('sidebarFrostHint') : t('sidebarFloorHint'),
              value: draft.mode === 'card' ? draft.sidebarOpacity : draft.sidebarFloor,
              min: draft.mode === 'card' ? 0.2 : 0.25,
              max: draft.mode === 'card' ? 1 : 0.7,
              step: 0.01,
              unit: 'percent',
              onCommit: (value) =>
                controller.setDraft(draft.mode === 'card' ? { sidebarOpacity: value } : { sidebarFloor: value }),
            }),
            h(Slider, {
              label: t('composerOpacity'),
              hint: t('composerHint'),
              value: draft.composerOpacity,
              min: 0.5,
              max: 1,
              step: 0.01,
              unit: 'percent',
              onCommit: (value) => controller.setDraft({ composerOpacity: value }),
            }),
            h(Slider, {
              label: t('dialogOpacity'),
              hint: t('dialogHint'),
              value: draft.dialogOpacity,
              min: 0.5,
              max: 1,
              step: 0.01,
              unit: 'percent',
              onCommit: (value) => controller.setDraft({ dialogOpacity: value }),
            }),
            h(Slider, {
              label: t('backdropBlur'),
              hint: t('backdropHint'),
              value: draft.backdropBlur,
              min: 0,
              max: 40,
              step: 1,
              unit: 'px',
              onCommit: (value) => controller.setDraft({ backdropBlur: value }),
            }),
            h(Slider, {
              label: t('wallpaperOpacity'),
              hint: t('wallpaperHint'),
              value: draft.wallpaperOpacity,
              min: 0,
              max: 1,
              step: 0.01,
              unit: 'percent',
              onCommit: (value) => controller.setDraft({ wallpaperOpacity: value }),
            }),
            h(Slider, {
              label: t('blur'),
              hint: t('blurHint'),
              value: draft.blur,
              min: 0,
              max: 40,
              step: 1,
              unit: 'px',
              onCommit: (value) => controller.setDraft({ blur: value }),
            }),
            h(Slider, {
              label: t('dim'),
              hint: t('dimHint'),
              value: draft.dim,
              min: 0,
              max: 0.8,
              step: 0.01,
              unit: 'percent',
              onCommit: (value) => controller.setDraft({ dim: value }),
            }),
            h(
              'div',
              { className: 'wp-row' },
              h(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                h('span', { className: 'wp-label' }, t('fit')),
                h(Segmented, {
                  options: [
                    { value: 'cover', label: t('cover') },
                    { value: 'contain', label: t('contain') },
                  ],
                  value: draft.fit,
                  onChange: (value) => controller.setDraft({ fit: value }),
                }),
              ),
              h(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                h('span', { className: 'wp-label' }, t('rotate')),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'wp-switch',
                    role: 'switch',
                    'aria-checked': draft.rotate.enabled ? 'true' : 'false',
                    'data-on': draft.rotate.enabled ? 'true' : 'false',
                    onClick: () => controller.setDraft({ rotate: { ...draft.rotate, enabled: !draft.rotate.enabled } }),
                  },
                  h('i'),
                ),
                h(
                  'select',
                  {
                    value: draft.rotate.intervalHours,
                    disabled: !draft.rotate.enabled,
                    onChange: (event) => controller.setDraft({ rotate: { ...draft.rotate, intervalHours: Number(event.target.value) } }),
                    style: {
                      height: 28,
                      borderRadius: 8,
                      border: '1px solid var(--dsw-alias-border-l2)',
                      background: 'var(--dsw-alias-bg-layer-1)',
                      color: 'var(--dsw-alias-label-secondary)',
                      font: 'inherit',
                      fontSize: 12,
                      padding: '0 6px',
                    },
                  },
                  [1, 3, 6, 12, 24].map((hours) =>
                    h('option', { key: hours, value: hours }, t('rotateEvery', { n: hours })),
                  ),
                ),
              ),
            ),
            h('div', { className: 'wp-hint' }, t('rotateHint')),
          ),
          h(
            'div',
            { className: 'wp-foot' },
            h(
              'div',
              { className: 'wp-actions' },
              h('button', { type: 'button', className: 'wp-action', disabled: state.busy, onClick: () => controller.reset() }, t('reset')),
              state.notice ? h('span', { className: 'wp-note' }, state.notice) : null,
            ),
            h(
              'div',
              { className: 'wp-actions' },
              state.dirty ? h('span', { className: 'wp-note' }, t('unsaved')) : null,
              h(
                'button',
                {
                  type: 'button',
                  className: 'wp-action',
                  'data-primary': 'true',
                  disabled: !state.dirty || state.busy,
                  title: state.dirty ? t('applyHint') : t('appliedHint'),
                  onClick: () => void controller.applyDraft(),
                },
                state.busy ? t('applying') : t('apply'),
              ),
            ),
          ),
        ),
      );

      // Portal into body: the dialog must not be clipped or stacked under the frame.
      return ReactDOM.createPortal(h(Boundary, null, dialog), document.body);
    }

    // --------------------------------------------------------------- controller
    function createController(ctx, store, t, report) {
      let pollTimer = null;
      let retryTimer = null;
      let active = true;
      let misses = 0;
      let lastCss = '';
      const wallpaperSheet = new CSSStyleSheet();

      function install() {
        if (!document.adoptedStyleSheets.includes(wallpaperSheet)) {
          document.adoptedStyleSheets = [...document.adoptedStyleSheets, wallpaperSheet];
        }
      }
      function uninstall() {
        document.adoptedStyleSheets = document.adoptedStyleSheets.filter((sheet) => sheet !== wallpaperSheet);
      }
      function clearRendering() {
        lastCss = '';
        try {
          wallpaperSheet.replaceSync('');
        } catch {
          // ignore
        }
      }

      function render(data) {
        if (!active || !data) return;
        const scheme = currentScheme(ctx);
        const source = data.resolved?.[scheme]?.source ?? null;
        if (!source) {
          clearRendering();
          report?.('render-clear', undefined, `scheme=${scheme}`);
          return;
        }
        const css = buildWallpaperCss(source, data.appearance, scheme);
        if (!css) {
          clearRendering();
          report?.('render-empty', undefined, `scheme=${scheme} source=${source}`);
          return;
        }
        const unchanged = css === lastCss;
        try {
          wallpaperSheet.replaceSync(css);
        } catch (error) {
          report?.('render-fail', error, `css=${css.length}`);
          return;
        }
        lastCss = css;
        if (unchanged) return;
        let evidence = '';
        try {
          const bodyVar = getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base').trim();
          const pseudo = getComputedStyle(document.documentElement, '::before').backgroundImage;
          const frame = document.querySelector('#root > div');
          const frameBg = frame ? getComputedStyle(frame).backgroundColor : 'no-frame';
          evidence = ` bodyVar=${bodyVar} frameBg=${frameBg} pseudo=${String(pseudo).slice(0, 40)}`;
        } catch (error) {
          evidence = ` evidence-failed=${String(error?.message ?? error)}`;
        }
        report?.(
          'render-ok',
          undefined,
          `scheme=${scheme} css=${css.length} sheets=${document.adoptedStyleSheets.length} source=${source.slice(0, 24)}${evidence}`,
        );
      }

      function adopt(data, { syncDraft = false } = {}) {
        if (!data?.ok) return;
        const applied = draftFrom(data);
        const current = store.get();
        const keepDraft = current.dirty && !syncDraft && current.draft !== null;
        const patch = { loading: false, data, applied };
        if (!keepDraft) {
          patch.draft = applied;
          patch.dirty = false;
        }
        store.set(patch);
        // The desktop mirrors the applied state only; the draft stays in the dialog.
        render(data);
      }

      async function refresh(options = {}) {
        try {
          const data = await requestJson(`/state?scheme=${currentScheme(ctx)}`, undefined, 5_000);
          if (!data.ok) {
            const failure = new Error(data.error ?? 'state failed');
            failure.status = data.status;
            throw failure;
          }
          misses = 0;
          if (store.get().disabled) install();
          store.set({ error: null, disabled: false });
          adopt(data, options);
          return data;
        } catch (error) {
          misses += 1;
          // 404 (route gone), a timeout, or a dead socket all mean the Host half is
          // not there. A live server returning 500 is a different story.
          const gone = error?.status === 404 || error?.timeout === true || error?.network === true;
          // The Host half is unloaded when the bundle is disabled. The browser
          // module is not always torn down with it, so shed the wallpaper and the
          // button ourselves once the route stays missing.
          if (gone) {
            if (misses >= 2 || !store.get().data) {
              suspend();
              return null;
            }
            // One quick retry distinguishes a real unload from a restart blip.
            if (retryTimer === null && active) {
              retryTimer = setTimeout(() => {
                retryTimer = null;
                void refresh();
              }, 1200);
              retryTimer.unref?.();
            }
            return null;
          }
          if (active) store.set({ loading: false, error: String(error?.message ?? error) });
          return null;
        }
      }

      /** Host half disappeared: drop every trace, keep polling so re-enabling recovers. */
      function suspend() {
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
        clearRendering();
        uninstall();
        store.set({ disabled: true, open: false, data: null, draft: null, applied: null, dirty: false, error: null });
      }

      /** Edit the draft only; nothing here reaches the Host until Apply. */
      function setDraft(patch) {
        const current = store.get();
        const base = current.draft ?? draftFrom(current.data);
        const draft = { ...base, ...patch };
        const applied = current.applied ?? draftFrom(current.data);
        store.set({ draft, dirty: !sameDraft(draft, applied), notice: null });
      }

      function discardDraft() {
        const current = store.get();
        const applied = draftFrom(current.data);
        store.set({ draft: applied, applied, dirty: false });
      }

      async function applyDraft() {
        const current = store.get();
        const draft = current.draft ?? draftFrom(current.data);
        store.set({ busy: true, error: null });
        try {
          for (const target of ['light', 'dark']) {
            const data = await requestJson('/select', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ scheme: target, source: draft[target] }),
            });
            if (!data.ok) throw new Error(data.error ?? 'select failed');
          }
          const settings = await requestJson('/settings', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              scheme: currentScheme(ctx),
              mode: draft.mode,
              floor: draft.floor,
              sidebarFloor: draft.sidebarFloor,
              composerOpacity: draft.composerOpacity,
              dialogOpacity: draft.dialogOpacity,
              opacity: draft.opacity,
              sidebarOpacity: draft.sidebarOpacity,
              inset: draft.inset,
              wallpaperOpacity: draft.wallpaperOpacity,
              backdropBlur: draft.backdropBlur,
              blur: draft.blur,
              dim: draft.dim,
              fit: draft.fit,
              rotate: { enabled: draft.rotate.enabled, intervalHours: draft.rotate.intervalHours },
            }),
          });
          if (!settings.ok) throw new Error(settings.error ?? 'settings failed');
          adopt(settings, { syncDraft: true });
          store.set({ busy: false, notice: t('appliedNow') });
        } catch (error) {
          store.set({ busy: false, error: String(error?.message ?? error) });
        }
      }

      async function upload(file) {
        store.set({ busy: true, error: null });
        try {
          const prepared = await prepareImage(file);
          const query = new URLSearchParams({
            name: file.name ?? 'wallpaper',
            w: String(prepared.width ?? 0),
            h: String(prepared.height ?? 0),
          });
          const uploadController = new AbortController();
          const uploadTimer = setTimeout(() => uploadController.abort(), 60_000);
          let payload;
          try {
            const response = await fetch(api(`/upload?${query}`), {
              method: 'POST',
              body: prepared.blob,
              signal: uploadController.signal,
              headers: { 'content-type': prepared.blob.type || 'application/octet-stream' },
            });
            payload = await response.json().catch(() => ({ ok: false, error: `HTTP ${response.status}` }));
          } catch (uploadError) {
            throw new Error(uploadError?.name === 'AbortError' ? 'uploadTimeout' : String(uploadError?.message ?? uploadError));
          } finally {
            clearTimeout(uploadTimer);
          }
          if (!payload.ok) throw new Error(payload.error ?? 'upload failed');
          await refresh({ syncDraft: true });
          const tab = store.get().tab ?? currentScheme(ctx);
          setDraft({ [tab]: `image:${payload.item.id}` });
          store.set({ busy: false, notice: t('uploaded') });
        } catch (error) {
          const key =
            error?.message === 'tooLarge'
              ? 'tooLarge'
              : error?.message === 'notImage'
                ? 'notImage'
                : error?.message === 'uploadTimeout'
                  ? 'uploadTimeout'
                  : null;
          store.set({ busy: false, error: key ? t(key) : String(error?.message ?? error) });
        }
      }

      async function remove(id) {
        try {
          const data = await requestJson('/delete', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          if (!data.ok) throw new Error(data.error ?? 'delete failed');
          adopt(data);
          const draft = store.get().draft;
          if (draft && (draft.light === `image:${id}` || draft.dark === `image:${id}`)) {
            setDraft({
              ...(draft.light === `image:${id}` ? { light: null } : {}),
              ...(draft.dark === `image:${id}` ? { dark: null } : {}),
            });
          }
        } catch (error) {
          store.set({ error: String(error?.message ?? error) });
        }
      }

      async function setAppearance(preference) {
        try {
          ctx.theme?.setTheme?.(preference);
        } catch (error) {
          store.set({ error: String(error?.message ?? error) });
        }
        setTimeout(() => render(store.get().data), 60);
      }

      /** Reset is a draft change too: the user still confirms with Apply. */
      function reset() {
        const current = store.get();
        const applied = current.applied ?? draftFrom(current.data);
        const draft = { ...EMPTY_DRAFT, rotate: { ...EMPTY_DRAFT.rotate } };
        store.set({ draft, dirty: !sameDraft(draft, applied), notice: t('resetDraft') });
      }

      function start() {
        install();
        void refresh();
        pollTimer = setInterval(() => void refresh(), POLL_MS);
        pollTimer.unref?.();
        ctx.effect?.(() => {
          const onThemeChange = () => {
            store.set({ tick: Date.now() });
            render(store.get().data);
          };
          const dispose = ctx.on?.('theme/change', onThemeChange);
          return () => dispose?.();
        }, 'wallpaper-theme: palette');
        ctx.effect?.(() => {
          const media = window.matchMedia?.('(prefers-color-scheme: dark)');
          if (!media) return () => {};
          const onChange = () => render(store.get().data);
          media.addEventListener('change', onChange);
          return () => media.removeEventListener('change', onChange);
        }, 'wallpaper-theme: media');
      }

      function stop() {
        active = false;
        if (pollTimer) clearInterval(pollTimer);
        if (retryTimer) clearTimeout(retryTimer);
        clearRendering();
        uninstall();
      }

      return { start, stop, refresh, setDraft, discardDraft, applyDraft, upload, remove, setAppearance, reset };
    }

    // -------------------------------------------------------------------- entry
    return {
      // `theme` and `locale` must be declared: Cordis throws on reading an
      // undeclared service property, and both are read while the panel renders.
      inject: ['slots', 'theme', 'locale'],
      apply(ctx) {
        const t = translator(ctx);
        const store = createStore();

        /** Fire-and-forget diagnostics: the Host appends them to probe.log beside the library. */
        const report = (event, error, extra) => {
          try {
            const payload = {
              event,
              message: String(error?.message ?? error ?? ''),
              stack: String(error?.stack ?? '').slice(0, 4000),
              extra: extra === undefined ? undefined : String(extra).slice(0, 2000),
              scheme: (() => {
                try {
                  return ctx.theme?.getTheme?.().preference ?? 'unknown';
                } catch {
                  return 'unknown';
                }
              })(),
            };
            void fetch(`${PREFIX}/probe`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(payload),
              keepalive: true,
            }).catch(() => {});
          } catch {
            // never let diagnostics break the UI
          }
        };

        const controller = createController(ctx, store, t, report);
        const uiSheet = new CSSStyleSheet();
        uiSheet.replaceSync(CSS);
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, uiSheet];

        ctx.effect(
          () => () => {
            controller.stop();
            document.adoptedStyleSheets = document.adoptedStyleSheets.filter((sheet) => sheet !== uiSheet);
          },
          'wallpaper-theme: lifecycle',
        );

        ctx.effect(() => {
          const onError = (event) => report('window-error', event.error ?? event.message, `${event.filename ?? ''}:${event.lineno ?? ''}`);
          const onRejection = (event) => report('unhandled-rejection', event.reason);
          window.addEventListener('error', onError);
          window.addEventListener('unhandledrejection', onRejection);
          return () => {
            window.removeEventListener('error', onError);
            window.removeEventListener('unhandledrejection', onRejection);
          };
        }, 'wallpaper-theme: diagnostics');

        controller.start();
        report('client-boot');

        ctx.slots.inject('sidebar.footer.action', () =>
          ctx.slots.register({ name: 'sidebar.footer.action', id: 'wallpaper-theme', order: 20 }, (props) =>
            h(
              React.Fragment,
              null,
              h(ThemeButton, { store, t, wide: props?.wide, report }),
              h(
                Boundary,
                { report, onClose: () => store.set({ open: false }) },
                h(Panel, { store, controller, ctx, t, report }),
              ),
            ),
          ),
        );
      },
    };
  },
});
