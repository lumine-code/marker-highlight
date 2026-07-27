const { Disposable } = require("atom");

module.exports = {
  activate() {
    this.highlightService = null;
    // Layers handed over by the marker hosts, keyed by editor. A set per editor
    // because every renderer builds its own layer for the same editor.
    this.layers = new Map();
  },

  deactivate() {
    this.highlightService = null;
    this.layers.clear();
  },

  consumeHighlightSelected(highlightService) {
    this.highlightService = highlightService;
    const updateAll = () => {
      for (const [editor, layers] of this.layers) {
        const markers = highlightService.getMarkersForEditor(editor);
        for (const layer of layers) {
          layer.cache.set("data", markers);
          layer.update();
        }
      }
    };
    let addSubscription = highlightService.onDidFinishAddingMarkers(updateAll);
    let removeSubscription = highlightService.onDidRemoveAllMarkers(updateAll);
    return new Disposable(() => {
      this.highlightService = null;
      addSubscription.dispose();
      removeSubscription.dispose();
    });
  },

  provideMarkerLayer() {
    return {
      name: "highlight",
      description: "Highlighted selection markers",
      merge: true,
      threshold: "marker-highlight.threshold",
      initialize: (layer) => {
        let layers = this.layers.get(layer.editor);
        if (!layers) {
          layers = new Set();
          this.layers.set(layer.editor, layers);
        }
        layers.add(layer);
        // The service only speaks through events, so a renderer attaching after
        // the markers were added would draw nothing until the next selection.
        layer.cache.set("data", this.highlightService?.getMarkersForEditor(layer.editor) ?? []);
        layer.disposables.add(
          new Disposable(() => {
            layers.delete(layer);
            if (layers.size === 0) {
              this.layers.delete(layer.editor);
            }
          }),
        );
      },
      getItems: ({ cache }) => {
        const data = cache.get("data") || [];
        return data.map((marker) => {
          const range = marker.getScreenRange();
          return { row: range.start.row, end: range.end.row };
        });
      },
    };
  },
};
