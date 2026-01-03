// Lightweight virtualized table renderer for large data sets.
// Renders only visible rows with spacer rows to preserve scroll height.
import { escapeHtml, formatMatchTime } from "./utils.js";

export class VirtualTable {
  constructor(containerEl, { headers = [], rowKeys = [], formatters = {} }) {
    this.container = containerEl;
    this.headers = headers;
    this.rowKeys = rowKeys.length ? rowKeys : headers;
    this.formatters = formatters; // { key: (value, row) => string }
    this.data = [];

    this.rowHeight = 36; // default estimate
    this.buffer = 8; // extra rows above/below viewport
    this.visibleStart = 0;
    this.visibleEnd = 0;

    this._buildBase();
    this._bind();
  }

  _buildBase() {
    this.container.innerHTML = `
      <table>
        <thead><tr>${this.headers
          .map(
            (h) =>
              `<th>${escapeHtml(
                h.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
              )}</th>`
          )
          .join("")}</tr></thead>
        <tbody></tbody>
      </table>
    `;
    this.tbody = this.container.querySelector("tbody");
  }

  _bind() {
    this._onScroll = this._onScroll.bind(this);
    this._onResize = this._onResize.bind(this);
    this.container.addEventListener("scroll", this._onScroll, {
      passive: true,
    });
    window.addEventListener("resize", this._onResize);
  }

  destroy() {
    this.container.removeEventListener("scroll", this._onScroll);
    window.removeEventListener("resize", this._onResize);
    this.container.innerHTML = "";
  }

  setData(rows) {
    this.data = rows || [];
    // Render a few rows to measure height
    this._renderWindow(0, Math.min(20, this.data.length));
    const firstDataRow = this.tbody.querySelector("tr[data-row='0']");
    if (firstDataRow) {
      const h = firstDataRow.getBoundingClientRect().height;
      if (h > 0) this.rowHeight = Math.min(48, Math.max(24, h));
    }
    // Render starting window
    this._onScroll();
  }

  _onResize() {
    this._onScroll();
  }

  _onScroll() {
    const scrollTop = this.container.scrollTop;
    const viewportHeight = this.container.clientHeight || 400;
    const total = this.data.length;

    const startIdx = Math.max(
      0,
      Math.floor(scrollTop / this.rowHeight) - this.buffer
    );
    const visibleCount =
      Math.ceil(viewportHeight / this.rowHeight) + this.buffer * 2;
    const endIdx = Math.min(total, startIdx + visibleCount);

    if (startIdx === this.visibleStart && endIdx === this.visibleEnd) return;

    this.visibleStart = startIdx;
    this.visibleEnd = endIdx;
    this._renderWindow(startIdx, endIdx);
  }

  _renderWindow(start, end) {
    const total = this.data.length;
    const topPad = start * this.rowHeight;
    const bottomPad = Math.max(0, (total - end) * this.rowHeight);

    const topSpacer = `<tr style="height:${topPad}px"><td colspan="${this.headers.length}"></td></tr>`;
    const bottomSpacer = `<tr style="height:${bottomPad}px"><td colspan="${this.headers.length}"></td></tr>`;

    let rowsHtml = "";
    for (let i = start; i < end; i++) {
      const row = this.data[i];
      rowsHtml += this._renderRow(row, i);
    }

    this.tbody.innerHTML = `${topSpacer}${rowsHtml}${bottomSpacer}`;
  }

  _renderRow(row, index) {
    const cells = this.rowKeys
      .map((k) => {
        let v = row[k];
        if (this.formatters[k]) {
          v = this.formatters[k](v, row);
        } else if (
          typeof v === "string" &&
          (k.includes("time") || k.endsWith("_time"))
        ) {
          v = formatMatchTime(v);
        } else if (typeof v === "boolean") {
          v = v ? "True" : "False";
        } else if (v == null || v === "") {
          v = "-";
        }
        return `<td>${escapeHtml(String(v))}</td>`;
      })
      .join("");

    return `<tr data-row="${index}">${cells}</tr>`;
  }
}