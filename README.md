# marker-highlight

> [!WARNING]

> **This package is deprecated.** Its marker layer now ships with [highlight-selected](https://github.com/lumine-code/highlight-selected) itself — the marker-* adapter packages were folded into their host packages, and this layer's settings moved to `highlight-selected.marker.*`. This repository is archived and no longer maintained.

Show highlight markers on the scrollbar and minimap.

A layer package for [scrollmap](https://github.com/lumine-code/scrollmap) and [minimap](https://github.com/lumine-code/minimap). Requires [highlight-selected](https://github.com/lumine-code/highlight-selected).

## Features

- **Highlight markers**: shows every highlighted selection occurrence on the overview maps.
- **Range merging**: adjacent highlight rows are merged into a single marker.
- **Threshold**: hides markers when the highlight count exceeds a configurable limit.

## Installation

To install `marker-highlight` search for it in the Install pane of the Lumine settings, or run the command `lumine --install lumine-code/marker-highlight`.

## Customization

The marker style can be adjusted in the `styles.css` file, e.g. change the marker color:

```css
.marker.marker-highlight {
  background-color: var(--text-color-info);
}
```

## Services

- `marker.layer`: provided to render highlighted selection markers as a layer on the editor's overview maps.
- `highlight-selected`: consumed to observe the highlight marker layers of each editor.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
