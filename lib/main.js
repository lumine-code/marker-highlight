const { Disposable } = require("atom");

module.exports = {
  activate() {
    this.highlightService = null;
    // Layers handed over by the marker hub, keyed by editor. The hub builds
    // exactly one layer per (provider, editor), so a plain Map suffices.
    this.layers = new Map();
  },

  deactivate() {
    this.highlightService = null;
    this.layers.clear();
  },

  consumeHighlightSelected(highlightService) {
    this.highlightService = highlightService;
    const updateAll = () => {
      for (const layer of this.layers.values()) {
        layer.cache.set("data", highlightService.getMarkersForEditor(layer.editor));
        layer.update();
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
        this.layers.set(layer.editor, layer);
        // The service only speaks through events, so a layer attaching after
        // the markers were added would draw nothing until the next selection.
        layer.cache.set("data", this.highlightService?.getMarkersForEditor(layer.editor) ?? []);
        layer.disposables.add(
          new Disposable(() => {
            this.layers.delete(layer.editor);
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
