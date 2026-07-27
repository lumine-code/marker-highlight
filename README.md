# marker-highlight

Show highlight markers on the scrollbar and minimap.

A layer package for [scrollmap](https://github.com/lumine-code/scrollmap) and [minimap](https://github.com/lumine-code/minimap). Requires [highlight-selected](https://github.com/lumine-code/highlight-selected).

## Features

- **Highlight markers**: shows every highlighted selection occurrence on the overview maps.
- **Range merging**: adjacent highlight rows are merged into a single marker.
- **Threshold**: hides markers when the highlight count exceeds a configurable limit.

## Installation

To install `marker-highlight` search for _marker-highlight_ in the Install pane of the Lumine settings or run `lumine --install lumine-code/marker-highlight`.

## Customization

The marker style can be adjusted in the `styles.less` file, e.g. change the marker color:

```less
.marker.marker-highlight {
  background-color: var(--text-color-info);
}
```

## Services

- **marker.layer** (`1.0.0`): provided to render highlighted selection markers as a layer on the editor's overview maps.
- **highlight-selected** (`^1.0.0`): consumed to observe the highlight marker layers of each editor.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
