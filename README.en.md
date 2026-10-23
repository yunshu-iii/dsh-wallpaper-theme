# dsh-wallpaper-theme

> **A DSH Harness desktop plugin**: give the Harness window a wallpaper — local images, separate light/dark pictures, a history gallery, gradient presets — with readable frosted-glass surfaces.

[![topic](https://img.shields.io/badge/topic-dsh--plugin-1f6feb?style=flat-square)](https://github.com/topics/dsh-plugin)
[![License](https://img.shields.io/badge/license-MIT-2ea44f?style=flat-square)](LICENSE)

## What it does

Adds a "Theme & wallpaper" button to the sidebar footer (icon-only when collapsed). It opens a centered panel where you upload local images, set one per appearance, manage the gallery and presets, and tune every surface.

The wallpaper runs **edge to edge**; readability is handled by a per-surface glass floor instead of washing out the whole window.

## Two layouts

| Layout | Effect |
|---|---|
| **Full bleed** (default) | Wallpaper covers the window; the conversation sits on an adjustable frosted floor, the sidebar is thinner, cards/dialogs stay nearly solid |
| **Floating card** | The app becomes a rounded card floating on the wallpaper, with a 0–64px inset showing it at 100% |

## Highlights

- Draft first, **Apply** to commit; closing the panel discards changes.
- Separate light / dark wallpaper (the other falls back automatically).
- Gallery keeps the last 30 uploads, deduplicated by content hash.
- 6 built-in gradients, auto-rotation (1/3/6/12/24h), light/dark/system switch.
- Every slider has its own caption and an editable number box; percentages step by 1%.
- Surfaces are floored independently: cards 88/91/94%, composer 94% + 18px frost.

## Install

```bash
# desktop app
dsh plugin --profile desktop add github:yunshu-iii/dsh-wallpaper-theme

# web host
dsh plugin --profile web add github:yunshu-iii/dsh-wallpaper-theme
```

Restart Harness afterwards. Also available through [dsh-plugin-market](https://github.com/TheYoungChen/dsh-plugin-market).

## Storage & privacy

```
$DSH_HOME/wallpaper-theme/
├── index.json          gallery index, current choice, parameters
└── files/<id>.<ext>    image bytes (content-hash named)
```

Images never leave your machine — no upload to any server, no attachment/session channel. Uploads are downscaled to 2560px WebP in the browser first.

## Notes

- Built for the **DSH Harness desktop app** (Windows / macOS / Linux); also works on the web host.
- Native window buttons are drawn by the OS and cannot be themed from a web plugin.
- Disabling the plugin is detected within seconds: the browser half sheds the wallpaper and hides its button, then recovers automatically when re-enabled.

## License

[MIT](LICENSE) © yunshu-iii
