// Mock for pixi.js in Jest tests
// PixiJS uses WebGL which is not available in jsdom

class MockContainer {
  constructor() {
    this.children = []
    this.x = 0
    this.y = 0
    this.rotation = 0
    this.scale = { x: 1, y: 1 }
    this.label = ''
    this.visible = true
    this.eventMode = 'none'
  }
  addChild(child) {
    this.children.push(child)
    return child
  }
  removeChild(child) {
    const index = this.children.indexOf(child)
    if (index > -1) this.children.splice(index, 1)
  }
  removeChildren() {
    this.children = []
  }
  destroy() {}
  on() {
    return this
  }
}

class MockGraphics extends MockContainer {
  constructor() {
    super()
    this.alpha = 1
  }
  clear() {
    return this
  }
  circle() {
    return this
  }
  fill() {
    return this
  }
  stroke() {
    return this
  }
  moveTo() {
    return this
  }
  lineTo() {
    return this
  }
  bezierCurveTo() {
    return this
  }
  closePath() {
    return this
  }
}

class MockSprite extends MockContainer {
  constructor() {
    super()
    this.anchor = { set: () => {} }
    this.texture = null
  }
}

class MockTexture {
  static from() {
    return new MockTexture()
  }
  destroy() {}
}

class MockApplication {
  constructor() {
    this.stage = new MockContainer()
    this.renderer = {
      events: {},
      resize: () => {}
    }
  }
  async init() {
    return this
  }
  destroy() {}
}

module.exports = {
  Application: MockApplication,
  Container: MockContainer,
  Graphics: MockGraphics,
  Sprite: MockSprite,
  Texture: MockTexture,
  FederatedPointerEvent: class {}
}
