class CartItem {
  constructor(id, name, price, qty, badge = "") {
    this.id = id;
    this.name = name;
    this.price = price;
    this.qty = qty;
    this.badge = badge;
  }

  total() {
    return this.price * this.qty;
  }
}

class Cart {
  constructor() {
    this.items = [];
    this.discount = 0;
    this.shipping = 9.99;
    this.freeShipAt = 199;
    this.couponCodes = { DART10: 0.1, START5: 5 };
    this._loadFromDOM();
    this._bindEvents();
    this._updateSummary();
    this._updateShippingBar();
  }

  _loadFromDOM() {
    document.querySelectorAll(".cart-item").forEach((row, idx) => {
      const nameEl = row.querySelector(".cart-item-name");
      const totalEl = row.querySelector(".cart-item-total");
      const qtyEl = row.querySelector(".qty-input");
      const badge =
        row.querySelector(".cart-item-badge")?.textContent.trim() ?? "";

      if (!nameEl || !totalEl || !qtyEl) return;

      const qty = parseInt(qtyEl.value, 10) || 1;
      const total = parseFloat(totalEl.textContent.replace(",", ".")) || 0;
      const price = qty > 0 ? total / qty : 0;

      const item = new CartItem(
        idx + 1,
        nameEl.textContent.trim(),
        price,
        qty,
        badge,
      );
      item._row = row;
      this.items.push(item);
    });
  }

  _bindEvents() {
    document.querySelectorAll(".cart-item").forEach((row, idx) => {
      const item = this.items[idx];
      const qtyEl = row.querySelector(".qty-input");
      const btnDec = row.querySelector(".qty-btn:first-of-type");
      const btnInc = row.querySelector(".qty-btn:last-of-type");
      const btnDel = row.querySelector(".remove-btn");

      if (btnDec)
        btnDec.addEventListener("click", () =>
          this._changeQty(item, qtyEl, -1),
        );
      if (btnInc)
        btnInc.addEventListener("click", () =>
          this._changeQty(item, qtyEl, +1),
        );
      if (qtyEl)
        qtyEl.addEventListener("change", () => {
          const val = parseInt(qtyEl.value, 10);
          if (isNaN(val) || val < 1) {
            qtyEl.value = item.qty;
            return;
          }
          item.qty = val;
          this._syncRow(item, qtyEl);
        });
      if (btnDel)
        btnDel.addEventListener("click", () => this._removeItem(item, row));
    });

    document.querySelectorAll('input[name="shipping"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const priceEl = radio
          .closest(".shipping-option")
          ?.querySelector(".shipping-price");
        const txt = priceEl?.textContent.trim().toLowerCase() ?? "";
        this.shipping = txt.includes("gratis") ? 0 : 9.99;
        this._updateSummary();
      });
    });

    const couponBtn = document.querySelector(".coupon-btn");
    if (couponBtn)
      couponBtn.addEventListener("click", () => this._applyCoupon());

    const couponInput = document.querySelector("#couponInput");
    if (couponInput)
      couponInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this._applyCoupon();
        }
      });
  }

  _changeQty(item, qtyEl, delta) {
    const newQty = item.qty + delta;
    if (newQty < 1) return;
    item.qty = newQty;
    qtyEl.value = newQty;
    this._syncRow(item, qtyEl);
  }

  _syncRow(item, qtyEl) {
    const row = item._row;
    const totalEl = row?.querySelector(".cart-item-total");
    if (totalEl) totalEl.textContent = this._fmt(item.total());
    this._persist(item);
    this._updateSummary();
    this._updateShippingBar();
  }

  _removeItem(item, row) {
    if (!confirm(`Usunąć "${item.name}" z koszyka?`)) return;
    row.style.transition = "opacity .3s, transform .3s";
    row.style.opacity = "0";
    row.style.transform = "translateX(20px)";
    setTimeout(() => {
      row.remove();
      this.items = this.items.filter((i) => i !== item);
      this._updateSummary();
      this._updateShippingBar();
      this._updateCartBadge();
      if (this.items.length === 0) this._showEmptyCart();
    }, 300);
  }

  _applyCoupon() {
    const input = document.querySelector("#couponInput");
    const code = input?.value.trim().toUpperCase();
    if (!code) return;

    const rule = this.couponCodes[code];
    if (rule === undefined) {
      this._showCouponMsg("Nieprawidłowy kod rabatowy.", false);
      return;
    }

    const subtotal = this._subtotal();
    this.discount = rule < 1 ? subtotal * rule : rule;
    this._showCouponMsg(
      `Kod "${code}" zastosowany! Rabat: -${this._fmt(this.discount)}`,
      true,
    );
    if (input) input.disabled = true;
    this._updateSummary();
  }

  _showCouponMsg(msg, ok) {
    let el = document.querySelector(".coupon-msg");
    if (!el) {
      el = document.createElement("p");
      el.className = "coupon-msg";
      el.style.cssText = "margin-top:.5rem;font-size:.875rem;font-weight:500;";
      document.querySelector(".cart-coupon")?.after(el);
    }
    el.textContent = msg;
    el.style.color = ok ? "var(--accent, #e63946)" : "#dc3545";
  }

  _showEmptyCart() {
    const wrap = document.querySelector(".col-lg-8");
    if (!wrap) return;
    const msg = document.createElement("div");
    msg.className = "text-center py-5";
    msg.innerHTML = `<p style="font-size:1.25rem;opacity:.6;">Koszyk jest pusty.</p>
      <a href="produkty.html" class="btn-outline-custom btn-sm-custom mt-3">Wróć do sklepu</a>`;
    wrap.querySelector(".cart-coupon")?.remove();
    wrap.appendChild(msg);
  }

  _subtotal() {
    return this.items.reduce((s, i) => s + i.total(), 0);
  }

  _updateSummary() {
    const sub = this._subtotal();
    const total = Math.max(0, sub - this.discount) + this.shipping;
    const vat = total * (23 / 123);

    const count = this.items.reduce((s, i) => s + i.qty, 0);

    this._setText(".summary-rows .summary-row:nth-child(1) dd", this._fmt(sub));
    this._setText(
      ".summary-rows .summary-row:nth-child(2) dd",
      this.discount > 0 ? `-${this._fmt(this.discount)}` : "-",
    );
    this._setText(
      ".summary-rows .summary-row:nth-child(3) dd",
      this.shipping === 0 ? "Gratis" : this._fmt(this.shipping),
    );
    this._setText(".summary-total dd", this._fmt(total));
    this._setText(".summary-vat dd", this._fmt(vat));

    const prodDt = document.querySelector(
      ".summary-rows .summary-row:nth-child(1) dt",
    );
    if (prodDt) prodDt.textContent = `Produkty (${count} szt.)`;

    this._updateCartBadge();
  }

  _updateShippingBar() {
    const sub = this._subtotal();
    const left = Math.max(0, this.freeShipAt - sub);
    const pct = Math.min(100, (sub / this.freeShipAt) * 100);

    const bar = document.querySelector(".cart-infobar-bar");
    const info = document.querySelector(".cart-infobar");

    if (bar) bar.style.width = `${pct}%`;
    if (info) {
      if (left <= 0) {
        info.innerHTML = '<i class="bi bi-truck"></i> Masz darmową dostawę! 🎉';
      } else {
        info.querySelector("strong") &&
          (info.querySelector("strong").textContent = this._fmt(left));
      }
    }
  }

  _updateCartBadge() {
    const count = this.items.reduce((s, i) => s + i.qty, 0);
    document
      .querySelectorAll(".cart-badge")
      .forEach((b) => (b.textContent = count));
  }

  _fmt(val) {
    return val.toFixed(2).replace(".", ",") + " zł";
  }
  _setText(sel, txt) {
    const el = document.querySelector(sel);
    if (el) el.textContent = txt;
  }

  _persist(item) {
    MockApi.saveCartItem({ id: item.id, qty: item.qty }).catch((err) =>
      console.warn("CartItem sync error:", err),
    );
  }
}

document.addEventListener("DOMContentLoaded", () => new Cart());
