const { CompositeDisposable, Emitter } = require("atom");

describe("scrollmap-highlight", () => {
  let editor, mainModule, provider, layer, service, consumerDisposable;

  // Minimal stand-in for the layer object the scrollmap hub passes to
  // `initialize` and `getItems` (see lumine-code/scrollmap lib/layer.js).
  function makeLayer(targetEditor) {
    const fake = {
      editor: targetEditor,
      cache: new Map(),
      items: [],
      disposables: new CompositeDisposable(),
    };
    fake.update = jasmine.createSpy("update").and.callFake(() => {
      const items = provider.getItems(fake);
      if (items) {
        fake.items = items;
      }
    });
    fake.updateSync = fake.update;
    fake.refresh = () => {};
    targetEditor.scrollmap = {
      layers: new Map([[provider.name, fake]]),
      updateView() {},
    };
    if (provider.initialize) {
      provider.initialize(fake);
    }
    return fake;
  }

  // Fake provider mirroring the SelectionManager returned by the real
  // highlight-selected package's provideHighlightSelected(): it exposes
  // onDidFinishAddingMarkers, onDidRemoveAllMarkers, and
  // editorToMarkerLayerMap[editorId] = { markerLayer, decoration }.
  function makeFakeService() {
    const emitter = new Emitter();
    return {
      emitter,
      editorToMarkerLayerMap: {},
      onDidFinishAddingMarkers: (callback) => emitter.on("did-finish-adding-markers", callback),
      onDidRemoveAllMarkers: (callback) => emitter.on("did-remove-all-markers", callback),
    };
  }

  beforeEach(async () => {
    jasmine.attachToDOM(atom.views.getView(atom.workspace));
    const pack = await atom.packages.activatePackage("scrollmap-highlight");
    mainModule = pack.mainModule;
    provider = mainModule.provideScrollmap();
    editor = await atom.workspace.open();
    editor.setText(Array(50).fill("hello world").join("\n"));
    layer = makeLayer(editor);
    service = makeFakeService();
    consumerDisposable = mainModule.consumeHighlightSelected(service);
  });

  afterEach(() => {
    consumerDisposable.dispose();
    layer.disposables.dispose();
  });

  function markRanges(...ranges) {
    const markerLayer = editor.addMarkerLayer();
    for (const range of ranges) {
      markerLayer.markScreenRange(range);
    }
    service.editorToMarkerLayerMap[editor.id] = { markerLayer };
    return markerLayer;
  }

  it("activates and provides a scrollmap layer descriptor", () => {
    expect(atom.packages.isPackageActive("scrollmap-highlight")).toBe(true);
    expect(provider.name).toBe("highlight");
    expect(typeof provider.description).toBe("string");
    expect(typeof provider.initialize).toBe("function");
    expect(typeof provider.getItems).toBe("function");
  });

  it("pushes highlight markers to the layer when markers finish adding", () => {
    markRanges(
      [
        [2, 0],
        [2, 5],
      ],
      [
        [10, 0],
        [11, 5],
      ],
    );
    service.emitter.emit("did-finish-adding-markers");
    expect(layer.update).toHaveBeenCalled();
    expect(layer.items).toEqual([
      { row: 2, end: 2 },
      { row: 10, end: 11 },
    ]);
  });

  it("sorts markers by row and merges adjacent ranges", () => {
    // Created out of document order on purpose.
    markRanges(
      [
        [20, 0],
        [20, 5],
      ],
      [
        [4, 0],
        [4, 5],
      ],
      [
        [3, 0],
        [3, 5],
      ],
    );
    service.emitter.emit("did-finish-adding-markers");
    expect(layer.items).toEqual([
      { row: 3, end: 4 },
      { row: 20, end: 20 },
    ]);
  });

  it("hides all markers when the item count exceeds the threshold", () => {
    atom.config.set("scrollmap-highlight.threshold", 1);
    markRanges(
      [
        [2, 0],
        [2, 5],
      ],
      [
        [10, 0],
        [10, 5],
      ],
    );
    service.emitter.emit("did-finish-adding-markers");
    expect(layer.items).toEqual([]);
  });

  it("clears the layer when all markers are removed", () => {
    const markerLayer = markRanges([
      [2, 0],
      [2, 5],
    ]);
    service.emitter.emit("did-finish-adding-markers");
    expect(layer.items.length).toBe(1);

    markerLayer.clear();
    service.emitter.emit("did-remove-all-markers");
    expect(layer.items).toEqual([]);
  });

  it("updates the layer when the threshold setting changes", () => {
    layer.update.calls.reset();
    atom.config.set("scrollmap-highlight.threshold", 3);
    expect(layer.update).toHaveBeenCalled();
  });

  it("stops updating the layer once the consumer is disposed", () => {
    consumerDisposable.dispose();
    layer.update.calls.reset();
    service.emitter.emit("did-finish-adding-markers");
    expect(layer.update).not.toHaveBeenCalled();
    expect(mainModule.highlightService).toBeNull();
  });
});
