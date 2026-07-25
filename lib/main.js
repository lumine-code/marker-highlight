const { CompositeDisposable, Disposable } = require("atom");

module.exports = {
  activate() {
    this.disposables = new CompositeDisposable(
      atom.config.observe("scrollmap-highlight.threshold", (value) => {
        this.threshold = value;
      }),
    );
    this.highlightService = null;
    // Layers handed over by the scrollmap hub, keyed by editor.
    this.layers = new Map();
  },

  deactivate() {
    this.highlightService = null;
    this.layers.clear();
    this.disposables.dispose();
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
      initialize: (layer) => {
        this.layers.set(layer.editor, layer);
        layer.disposables.add(
          new Disposable(() => this.layers.delete(layer.editor)),
          atom.config.onDidChange("scrollmap-highlight.threshold", layer.update),
        );
      },
      getItems: ({ cache }) => {
        const data = cache.get("data") || [];
        // getMarkers() returns markers in creation-id order, not document
        // order, so sort by row before merging adjacent ranges.
        const ranges = data
          .map((marker) => marker.getScreenRange())
          .sort((a, b) => a.start.row - b.start.row || a.start.column - b.start.column);
        const items = [];
        let lastItem = null;
        for (const range of ranges) {
          const startRow = range.start.row;
          const endRow = range.end.row;
          if (lastItem && startRow <= lastItem.end + 1) {
            lastItem.end = Math.max(lastItem.end, endRow);
          } else {
            if (lastItem) items.push(lastItem);
            lastItem = { row: startRow, end: endRow };
          }
        }
        if (lastItem) items.push(lastItem);
        if (this.threshold && items.length > this.threshold) {
          return [];
        }
        return items;
      },
    };
  },
};
