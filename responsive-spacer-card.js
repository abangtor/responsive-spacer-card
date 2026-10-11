/** A framework-free, width-proportional Lovelace spacer. */
const CARD_TYPE = "responsive-spacer-card";
const DEFAULT_CONFIG = Object.freeze({
  ratio: 0.17,
  min_height: 0,
  max_height: 0,
  width_source: "self",
});
function numberConfig(value, fallback, name) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${CARD_TYPE}: ${name} must be a non-negative number.`);
  return number;
}
function normaliseConfig(config) {
  if (!config || typeof config !== "object") throw new Error(`${CARD_TYPE}: configuration is required.`);
  const width_source = config.width_source ?? DEFAULT_CONFIG.width_source;
  if (!["self", "card", "parent_card"].includes(width_source)) {
    throw new Error(`${CARD_TYPE}: width_source must be "self", "card", or "parent_card".`);
  }
  const result = {
    ratio: numberConfig(config.ratio, DEFAULT_CONFIG.ratio, "ratio"),
    min_height: numberConfig(config.min_height, DEFAULT_CONFIG.min_height, "min_height"),
    max_height: numberConfig(config.max_height, DEFAULT_CONFIG.max_height, "max_height"),
    width_source,
  };
  if (result.max_height > 0 && result.max_height < result.min_height) throw new Error(`${CARD_TYPE}: max_height must be greater than or equal to min_height.`);
  return result;
}
class ResponsiveSpacerCard extends HTMLElement {
  constructor() {
    super(); this._config = { ...DEFAULT_CONFIG }; this._height = 0;
    this._observedElement = null;
    this._updatePending = false;
    this._resizeObserver = new ResizeObserver(() => this._queueUpdate());
    const root = this.attachShadow({ mode: "open" });
    this._spacer = document.createElement("div");
    this._spacer.setAttribute("aria-hidden", "true");
    this._spacer.style.cssText = "display:block;width:100%;pointer-events:none;";
    root.append(this._spacer);
  }
  setConfig(config) { this._config = normaliseConfig(config); this._queueUpdate(); }
  connectedCallback() {
    this.style.display = "block";
    this._queueUpdate();
  }
  disconnectedCallback() { this._resizeObserver.disconnect(); this._observedElement = null; }
  getCardSize() { return Math.max(1, Math.ceil(this._height / 50)); }
  // Both forms are deliberate: older Lovelace editors call the instance
  // method, while current editors prefer the static method.
  getConfigElement() { return ResponsiveSpacerCard.getConfigElement(); }
  static getConfigElement() { return document.createElement(`${CARD_TYPE}-editor`); }
  static getStubConfig() { return { type: `custom:${CARD_TYPE}`, ratio: DEFAULT_CONFIG.ratio }; }
  _queueUpdate() {
    if (this._updatePending) return;
    this._updatePending = true;
    requestAnimationFrame(() => {
      this._updatePending = false;
      if (this.isConnected) this._updateHeight();
    });
  }
  _updateHeight() {
    const widthElement = this._widthElement();
    if (widthElement !== this._observedElement) {
      this._resizeObserver.disconnect();
      this._observedElement = widthElement;
      this._resizeObserver.observe(widthElement);
    }
    const width = widthElement.getBoundingClientRect().width;
    if (!width) return;
    let height = Math.max(width * this._config.ratio, this._config.min_height);
    if (this._config.max_height > 0) height = Math.min(height, this._config.max_height);
    const nextHeight = Math.round(height);
    // Do not write an identical height. Observing the spacer itself while
    // repeatedly writing its height causes needless ResizeObserver cycles.
    if (nextHeight === this._height) return;
    this._height = nextHeight; this._spacer.style.height = `${this._height}px`;
  }
  _widthElement() {
    if (this._config.width_source === "self") return this;
    const cards = this._containingCards();
    return this._config.width_source === "parent_card" ? cards[1] || cards[0] || this : cards[0] || this;
  }
  _containingCards() {
    const cards = [];
    let element = this;
    while ((element = composedParent(element))) {
      const card = element.localName === "ha-card" ? element : element.shadowRoot?.querySelector?.("ha-card");
      if (card && !cards.includes(card)) cards.push(card);
    }
    return cards;
  }
}

function composedParent(element) {
  if (element.parentElement) return element.parentElement;
  const root = element.getRootNode?.();
  return root instanceof ShadowRoot ? root.host : null;
}
class ResponsiveSpacerCardEditor extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }
  setConfig(config) { this._config = { ...DEFAULT_CONFIG, ...config }; this._render(); }
  _render() {
    if (!this._form) {
      this.attachShadow({ mode: "open" }); this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (event) => {
        event.stopPropagation();
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { type: `custom:${CARD_TYPE}`, ...this._config, ...event.detail.value } }, bubbles: true, composed: true }));
      });
      this.shadowRoot.append(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = [
      { name: "ratio", required: true, selector: { number: { min: 0, step: 0.01, mode: "box" } } },
      { name: "width_source", selector: { select: { options: [
        { value: "self", label: "Spacer row" },
        { value: "card", label: "Containing card" },
        { value: "parent_card", label: "Parent card" },
      ], mode: "dropdown" } } },
      { name: "min_height", selector: { number: { min: 0, step: 1, mode: "box", unit_of_measurement: "px" } } },
      { name: "max_height", selector: { number: { min: 0, step: 1, mode: "box", unit_of_measurement: "px" } } },
    ];
    this._form.data = this._config;
    this._form.computeLabel = (schema) => ({ ratio: "Height ratio", width_source: "Measure width from", min_height: "Minimum height", max_height: "Maximum height (0 = no limit)" })[schema.name];
    this._form.computeHelper = (schema) => ({ ratio: "Spacer height ÷ measured width. Example: 0.17 means 17%.", width_source: "Containing card measures the card the row is in. Parent card measures one card level above it; use that for nested room tiles.", min_height: "Optional lower limit in pixels.", max_height: "Optional upper limit in pixels." })[schema.name];
  }
}
customElements.define(CARD_TYPE, ResponsiveSpacerCard);
customElements.define(`${CARD_TYPE}-editor`, ResponsiveSpacerCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: CARD_TYPE, name: "Responsive Spacer Card", description: "An invisible spacer whose height is a ratio of its rendered width.", preview: false });
