function TRUE_FN() {
  return true;
}

var _updateCircleOriginal = L.Canvas.prototype._updateCircle;

L.Canvas.include({
  /**
   * ctx safe patch for L.Canvas _updateCircle
   * @param {L.Path} layer 
   */
  _updateCircle: function (layer) {
    var initialDrawing = this._drawing;
    this._drawing = true;
    this._ctx.save();
    _updateCircleOriginal.call(this, layer);
    this._ctx.restore();
    this._drawing = initialDrawing;
	},

  /**
   * Do nothing
   * @param  {L.Path} layer
   */
  _resetTransformPath: function (layer) {
    delete this._containerCopy;
    delete this._transformPaths;

    if (layer._containsPoint_) {
      layer._containsPoint = layer._containsPoint_;
      delete layer._containsPoint_;

      this._requestRedraw(layer);
    }
  },

  /**
   * Algorithm outline:
   *
   * 1. pre-transform - clear the path out of the canvas, copy canvas state
   * 2. at every frame:
   *    2.1. redraw the canvas from saved one
   *    2.2. transform
   *    2.3. draw path
   * 3. Repeat
   *
   * @param  {L.Path}         layer
   * @param  {Array.<Number>} matrix
   */
  transformPath: function (layer, matrix) {
    // do not transform not visible layers
    if (!layer._map) { return; }

    var copy = this._containerCopy;
    var ctx = this._ctx;
    var m = L.Browser.retina ? 2 : 1;
    var bounds = this._bounds;
    var size = bounds.getSize();
    var that = this;

    this._transformPaths = this._transformPaths || [];

    if (!copy) {
      copy = this._containerCopy = document.createElement('canvas');
      copy.width = m * size.x;
      copy.height = m * size.y;
      // document.body.appendChild(copy);
    }

    if (!this._transformPaths.includes(layer)) {
      this._transformPaths.push(layer);

      this._transformPaths.forEach(function(x) { that._removePath(x); });
      this._redraw();

      var copyCtx = copy.getContext('2d');
      copyCtx.clearRect(0, 0, size.x * m, size.y * m);
      copyCtx.drawImage(this._container, 0, 0);

      this._transformPaths.forEach(function(x) { that._initPath(x); });

      // avoid flickering because of the 'mouseover's
      layer._containsPoint_ = layer._containsPoint;
      layer._containsPoint = TRUE_FN;
    }

    ctx.save();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, size.x * m, size.y * m);
    ctx.drawImage(this._containerCopy, 0, 0, size.x * m, size.y * m);

    ctx.restore();

    ctx.save();

    ctx.transform.apply(ctx, matrix);

    // now draw transform layers only
    this._drawing = true;
    this._transformPaths.forEach(function(x) { x._updatePath(); });
    this._drawing = false;

    ctx.restore();
  },
});
