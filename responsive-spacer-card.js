/** A framework-free, width-proportional Lovelace spacer. */
const VERSION = "1.3.0";
const CARD_TYPE = "responsive-spacer-card";
const DEFAULT_CONFIG = Object.freeze({
  ratio: 0.17,
  scale_factor: 1,
  min_height: 0,
  max_height: 0,
  width_source: "self",
  height_mode: "gap",
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
  const height_mode = config.height_mode ?? DEFAULT_CONFIG.height_mode;
  if (!["gap", "remaining"].includes(height_mode)) {
    throw new Error(`${CARD_TYPE}: height_mode must be "gap" or "remaining".`);
  }
  if (height_mode === "remaining" && width_source === "self") {
    throw new Error(`${CARD_TYPE}: remaining height requires width_source "card" or "parent_card".`);
  }
  const result = {
    ratio: numberConfig(config.ratio, DEFAULT_CONFIG.ratio, "ratio"),
    scale_factor: numberConfig(config.scale_factor, DEFAULT_CONFIG.scale_factor, "scale_factor"),
    min_height: numberConfig(config.min_height, DEFAULT_CONFIG.min_height, "min_height"),
    max_height: numberConfig(config.max_height, DEFAULT_CONFIG.max_height, "max_height"),
    width_source,
    height_mode,
  };
  if (result.max_height > 0 && result.max_height < result.min_height) throw new Error(`${CARD_TYPE}: max_height must be greater than or equal to min_height.`);
  return result;
}
class ResponsiveSpacerCard extends HTMLElement {
  constructor() {
    super(); this._config = { ...DEFAULT_CONFIG }; this._height = null;
    this._observedElement = null;
    this._frame = null;
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
    this.style.minWidth = "0";
    this._queueUpdate();
  }
  disconnectedCallback() {
    this._resizeObserver.disconnect();
    this._observedElement = null;
    if (this._frame !== null) cancelAnimationFrame(this._frame);
    this._frame = null;
  }
  getGridOptions() { return { columns: 12, rows: "auto", min_columns: 1 }; }
  getCardSize() { return Math.max(1, Math.ceil(this._height / 50)); }
  // Both forms are deliberate: older Lovelace editors call the instance
  // method, while current editors prefer the static method.
  getConfigElement() { return ResponsiveSpacerCard.getConfigElement(); }
  static getConfigElement() { return document.createElement(`${CARD_TYPE}-editor`); }
  static getStubConfig() { return { type: `custom:${CARD_TYPE}`, ratio: DEFAULT_CONFIG.ratio }; }
  _queueUpdate() {
    if (this._frame !== null || !this.isConnected) return;
    this._frame = requestAnimationFrame(() => {
      this._frame = null;
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
    const source = widthElement.getBoundingClientRect();
    if (!source.width) return; // Keep the last size while a tab is hidden.
    let height = source.width * this._config.ratio;
    if (this._config.height_mode === "remaining" && widthElement !== this) {
      // A proportional gap alone leaves fixed title/padding above it. Subtract
      // that existing space so the spacer's bottom is ratio * source width
      // below the selected card's top. No image lookup or viewport units.
      height -= Math.max(0, this.getBoundingClientRect().top - source.top);
    }
    // Scale only the computed gap, after header compensation and before
    // limits. A factor of 1 preserves existing configurations exactly.
    height *= this._config.scale_factor;
    height = Math.max(height, this._config.min_height);
    if (this._config.max_height > 0) height = Math.min(height, this._config.max_height);
    const nextHeight = Math.round(height * 100) / 100;
    // An ancestor can resize when we change height. Writes are idempotent,
    // queued outside ResizeObserver, and never dispatch ll-rebuild/reload.
    if (nextHeight === this._height) return;
    this._height = nextHeight;
    this._spacer.style.height = `${nextHeight}px`;
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
      // Only real ancestors: querying a wrapper shadow root can select a
      // sibling card, which is unrelated to this spacer.
      if (element.localName === "ha-card") cards.push(element);
    }
    return cards;
  }
}

function composedParent(element) {
  if (element.assignedSlot) return element.assignedSlot;
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
        this._config = { type: `custom:${CARD_TYPE}`, ...this._config, ...event.detail.value };
        if (this._config.height_mode === "remaining" && this._config.width_source === "self") {
          this._config.width_source = "card";
        }
        this._form.data = this._config;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this.shadowRoot.append(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = [
      { name: "ratio", required: true, selector: { number: { min: 0, step: 0.01, mode: "box" } } },
      { name: "scale_factor", selector: { number: { min: 0, step: 0.01, mode: "box" } } },
      { name: "width_source", selector: { select: { options: [
        { value: "self", label: "Spacer row" },
        { value: "card", label: "Containing card" },
        { value: "parent_card", label: "Parent card" },
      ], mode: "dropdown" } } },
      { name: "height_mode", selector: { select: { options: [
        { value: "gap", label: "Proportional gap" },
        { value: "remaining", label: "Fill to position from card top" },
      ], mode: "dropdown" } } },
      { name: "min_height", selector: { number: { min: 0, step: 1, mode: "box", unit_of_measurement: "px" } } },
      { name: "max_height", selector: { number: { min: 0, step: 1, mode: "box", unit_of_measurement: "px" } } },
    ];
    this._form.data = this._config;
    this._form.computeLabel = (schema) => ({ ratio: "Height ratio", scale_factor: "Scale factor", width_source: "Measure width from", height_mode: "Height calculation", min_height: "Minimum height", max_height: "Maximum height (0 = no limit)" })[schema.name];
    this._form.computeHelper = (schema) => ({ ratio: "Base fraction of measured width, before scaling. Example: 0.17 means 17%.", scale_factor: "Multiplies the calculated gap after title/padding compensation. 1 = unchanged, 1.10 = 10% taller, 0.90 = 10% shorter. Min/max limits still apply.", height_mode: "Fill mode subtracts the title/padding already above this spacer. Following row margins are not included. Limits apply to the remaining gap.", width_source: "Containing card measures the card the row is in. Parent card measures one card level above it; use that for nested room tiles.", min_height: "Optional lower limit in pixels.", max_height: "Optional upper limit in pixels." })[schema.name];
  }
}
if (!customElements.get(CARD_TYPE)) customElements.define(CARD_TYPE, ResponsiveSpacerCard);
if (!customElements.get(`${CARD_TYPE}-editor`)) customElements.define(`${CARD_TYPE}-editor`, ResponsiveSpacerCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) window.customCards.push({ type: CARD_TYPE, name: "Responsive Spacer Card", description: "An invisible spacer whose height is a ratio of its rendered width.", preview: false });

console.info(`RESPONSIVE-SPACER-CARD ${VERSION}`);
