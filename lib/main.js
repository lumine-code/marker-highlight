const { Disposable } = require("atom");

module.exports = {
  activate() {
    this.highlightService = null;
    // Layers handed over by the scrollmap hub, keyed by editor.
    this.layers = new Map();
  },

  deactivate() {
    this.highlightService = null;
    this.layers.clear();
  },

  consumeHighlightSelected(highlightService) {
    this.highlightService = highlightService;
    const updateAll = () => {
      for (const [editor, layer] of this.layers) {
        layer.cache.set("data", highlightService.getMarkersForEditor(editor));
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

  provideScrollmap() {
    return {
      name: "highlight",
      description: "Highlighted selection markers",
      merge: true,
      threshold: "scrollmap-highlight.threshold",
      initialize: (layer) => {
        this.layers.set(layer.editor, layer);
        layer.disposables.add(new Disposable(() => this.layers.delete(layer.editor)));
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
