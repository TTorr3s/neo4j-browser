// Mock for pixi-viewport in Jest tests

class MockViewport {
  constructor() {
    this.x = 0
    this.y = 0
    this.scale = { x: 1, y: 1 }
    this.children = []
    this.eventMode = 'none'
    this.plugins = {
      pause: () => {},
      resume: () => {}
    }
  }

  addChild(child) {
    this.children.push(child)
    return child
  }

  removeChild(child) {
    const index = this.children.indexOf(child)
    if (index > -1) this.children.splice(index, 1)
  }

  drag() {
    return this
  }
  pinch() {
    return this
  }
  wheel() {
    return this
  }
  decelerate() {
    return this
  }
  clampZoom() {
    return this
  }

  moveCenter() {
    return this
  }
  setZoom() {
    return this
  }
  zoomPercent() {
    return this
  }
  resize() {
    return this
  }
  toWorld(point) {
    return { x: point.x || 0, y: point.y || 0 }
  }

  on() {
    return this
  }
  destroy() {}
}

module.exports = {
  Viewport: MockViewport
}
