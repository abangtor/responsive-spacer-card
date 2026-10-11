/**
 * Responsive Spacer Card for Home Assistant Lovelace.
 *
 * Reserves vertical space that is a ratio of the card's rendered width.
 * A ResizeObserver makes it react to dashboard column changes, browser zoom,
 * and device rotation without relying on fixed pixel heights.
 */
class ResponsiveSpacerCard extends HTMLElement {
  constructor() {
    super();
    this._ratio = 0.17;
    this._height = 0;
    this._resizeObserver = new ResizeObserver(() => this._updateHeight());

    const root = this.attachShadow({ mode: "open" });
    this._spacer = document.createElement("div");
    this._spacer.setAttribute("aria-hidden", "true");
    this._spacer.style.cssText = "display:block; width:100%; pointer-events:none;";
    root.append(this._spacer);
  }

  setConfig(config) {
    const ratio = Number(config.ratio ?? 0.17);
    if (!Number.isFinite(ratio) || ratio < 0) {
      throw new Error("responsive-spacer-card: ratio must be a non-negative number.");
    }
    this._ratio = ratio;
    this._updateHeight();
  }

  connectedCallback() {
    this.style.display = "block";
    this._resizeObserver.observe(this);
    this._updateHeight();
  }

  disconnectedCallback() {
    this._resizeObserver.disconnect();
  }

  getCardSize() {
    return Math.max(1, Math.ceil(this._height / 50));
  }

  _updateHeight() {
    const width = this.getBoundingClientRect().width;
    if (!width) return;
    this._height = Math.round(width * this._ratio);
    this._spacer.style.height = `${this._height}px`;
  }
}

customElements.define("responsive-spacer-card", ResponsiveSpacerCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "responsive-spacer-card",
  name: "Responsive Spacer Card",
  description: "A spacer whose height is a ratio of its rendered width.",
});
