const { CompositeDisposable, Emitter } = require("atom");

describe("marker-highlight", () => {
  let editor, mainModule, provider, layer, layers, service, consumerDisposable;

  // Minimal stand-in for the layer object a marker host passes to `initialize`
  // and `getItems` (see @lumine-code/marker-host lib/index.js).
  function makeLayer(targetEditor) {
    const fake = {
      editor: targetEditor,
      props: provider,
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
    if (provider.initialize) {
      provider.initialize(fake);
    }
    layers.push(fake);
    return fake;
  }

  // Fake provider mirroring the facade returned by the real highlight-selected
  // package's provideHighlightSelected(): onDidFinishAddingMarkers,
  // onDidRemoveAllMarkers, and getMarkersForEditor(editor).
  function makeFakeService() {
    const emitter = new Emitter();
    const markerLayers = new Map();
    return {
      emitter,
      markerLayers,
      onDidFinishAddingMarkers: (callback) => emitter.on("did-finish-adding-markers", callback),
      onDidRemoveAllMarkers: (callback) => emitter.on("did-remove-all-markers", callback),
      getMarkersForEditor: (markerEditor) => markerLayers.get(markerEditor)?.getMarkers() || [],
    };
  }

  beforeEach(async () => {
    jasmine.attachToDOM(atom.views.getView(atom.workspace));
    const pack = await atom.packages.activatePackage("marker-highlight");
    mainModule = pack.mainModule;
    provider = mainModule.provideMarkerLayer();
    editor = await atom.workspace.open();
    editor.setText(Array(50).fill("hello world").join("\n"));
    layers = [];
    layer = makeLayer(editor);
    service = makeFakeService();
    consumerDisposable = mainModule.consumeHighlightSelected(service);
  });

  afterEach(() => {
    consumerDisposable.dispose();
    for (const attached of layers) {
      attached.disposables.dispose();
    }
  });

  function markRanges(...ranges) {
    const markerLayer = editor.addMarkerLayer();
    for (const range of ranges) {
      markerLayer.markScreenRange(range);
    }
    service.markerLayers.set(editor, markerLayer);
    return markerLayer;
  }

  it("activates and provides a marker layer descriptor", () => {
    expect(atom.packages.isPackageActive("marker-highlight")).toBe(true);
    expect(provider.name).toBe("highlight");
    expect(typeof provider.description).toBe("string");
    expect(provider.merge).toBe(true);
    expect(provider.threshold).toBe("marker-highlight.threshold");
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

  it("returns raw ranges and leaves sorting and merging to the host", () => {
    // Created out of document order on purpose.
    markRanges(
      [
        [20, 0],
        [20, 5],
      ],
      [
        [3, 0],
        [3, 5],
      ],
    );
    service.emitter.emit("did-finish-adding-markers");
    expect(layer.items).toEqual([
      { row: 20, end: 20 },
      { row: 3, end: 3 },
    ]);
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

  it("forgets the editor when its layer detaches", () => {
    layer.disposables.dispose();
    layer.update.calls.reset();

    markRanges([
      [7, 0],
      [8, 5],
    ]);
    service.emitter.emit("did-finish-adding-markers");

    expect(layer.update).not.toHaveBeenCalled();
    expect(mainModule.layers.size).toBe(0);
  });

  it("stops updating the layer once the consumer is disposed", () => {
    consumerDisposable.dispose();
    layer.update.calls.reset();
    service.emitter.emit("did-finish-adding-markers");
    expect(layer.update).not.toHaveBeenCalled();
    expect(mainModule.highlightService).toBeNull();
  });
});
