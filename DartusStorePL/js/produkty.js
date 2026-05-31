class Product {
  constructor({
    id,
    name,
    brand,
    price,
    priceOld,
    badge,
    category,
    rating,
    stock,
    element,
  }) {
    this.id = id;
    this.name = name;
    this.brand = brand;
    this.price = price;
    this.priceOld = priceOld;
    this.badge = badge;
    this.category = category;
    this.rating = rating;
    this.stock = stock;
    this.element = element;
  }
}

class ProductCatalog {
  constructor() {
    this.products = [];
    this.cart = this._loadCart();
    this._loadProducts();
    this._bindFilters();
    this._bindSort();
    this._bindSearch();
    this._bindAddToCart();
    this._updateCartBadge();
    this._renderCount();
  }

  _loadProducts() {
    document
      .querySelectorAll("#gridView .product-card, #gridView article")
      .forEach((el, idx) => {
        const name =
          el.querySelector(".product-name")?.textContent.trim() ??
          `Produkt ${idx + 1}`;
        const brand =
          el.querySelector(".product-brand")?.textContent.trim() ?? "";
        const badge =
          el.querySelector(".product-badge")?.textContent.trim() ?? "";
        const priceEl = el.querySelector(".product-price");
        const oldEl = el.querySelector(".product-price-old");
        const price = parseFloat(priceEl?.textContent.replace(",", ".")) || 0;
        const priceOld = parseFloat(oldEl?.textContent.replace(",", ".")) || 0;
        const stars = el.querySelector(".stars")?.textContent.trim() ?? "";
        const rating = (stars.match(/★/g) ?? []).length;

        const catEl = el.closest("[data-category]");
        const category = catEl?.dataset.category ?? "";

        const product = new Product({
          id: idx + 1,
          name,
          brand,
          price,
          priceOld,
          badge,
          category,
          rating,
          stock: true,
          element: el.closest(".col-6, .col-md-4") ?? el,
        });
        this.products.push(product);
      });
  }

  _getActiveFilters() {
    const brands = [
      ...document.querySelectorAll('input[name="marka"]:checked'),
    ].map((i) => i.value);
    const minRat = parseInt(
      document.querySelector('input[name="ocena"]:checked')?.value ?? "0",
      10,
    );
    const minPrice =
      parseFloat(document.getElementById("priceMin")?.value) || 0;
    const maxPrice =
      parseFloat(document.getElementById("priceMax")?.value) || Infinity;
    const stock = [
      ...document.querySelectorAll('input[name="dostepnosc"]:checked'),
    ].map((i) => i.value);

    const activeLink = document.querySelector(
      ".filter-list .filter-item.active",
    );
    const category = activeLink?.href?.split("kat=")[1] ?? "";

    return { brands, minRat, minPrice, maxPrice, stock, category };
  }

  _applyFilters() {
    const f = this._getActiveFilters();
    const query =
      document.getElementById("searchInput")?.value.trim().toLowerCase() ?? "";
    const sort = document.getElementById("sortSelect")?.value ?? "pop";

    let filtered = this.products.filter((p) => {
      if (f.brands.length && !f.brands.includes(p.brand.toLowerCase()))
        return false;
      if (p.rating < f.minRat) return false;
      if (p.price < f.minPrice || p.price > f.maxPrice) return false;
      if (f.stock.includes("dostepny") && !p.stock) return false;
      if (f.category && p.category && p.category !== f.category) return false;
      if (
        query &&
        !p.name.toLowerCase().includes(query) &&
        !p.brand.toLowerCase().includes(query)
      )
        return false;
      return true;
    });

    filtered = this._sort(filtered, sort);

    this.products.forEach((p) => (p.element.style.display = "none"));
    filtered.forEach((p) => (p.element.style.display = ""));

    this._renderCount(filtered.length);
    this._renderActiveFilters(f, query);
  }

  _sort(list, mode) {
    const copy = [...list];
    switch (mode) {
      case "price-asc":
        return copy.sort((a, b) => a.price - b.price);
      case "price-desc":
        return copy.sort((a, b) => b.price - a.price);
      case "rating":
        return copy.sort((a, b) => b.rating - a.rating);
      case "new":
        return copy.reverse();
      default:
        return copy;
    }
  }

  _renderCount(n) {
    const total = n !== undefined ? n : this.products.length;
    const el = document.querySelector(".results-count strong");
    if (el) el.textContent = total;
  }

  _renderActiveFilters(f, query) {
    const wrap = document.querySelector(".active-filters");
    if (!wrap) return;
    wrap.innerHTML = "";

    const add = (label, clear) => {
      const tag = document.createElement("span");
      tag.className = "filter-tag";
      tag.innerHTML = `${label} <button type="button" class="filter-tag-remove" aria-label="Usuń filtr">&times;</button>`;
      tag.querySelector("button").addEventListener("click", () => {
        clear();
        this._applyFilters();
      });
      wrap.appendChild(tag);
    };

    if (f.category)
      add(`Kategoria: ${f.category}`, () => {
        document
          .querySelectorAll(".filter-item")
          .forEach((a) => a.classList.remove("active"));
        document
          .querySelector(".filter-item:first-child")
          ?.classList.add("active");
      });
    f.brands.forEach((b) =>
      add(`Marka: ${b}`, () => {
        const cb = document.querySelector(`input[name="marka"][value="${b}"]`);
        if (cb) cb.checked = false;
      }),
    );
    if (f.minRat)
      add(`Min. ocena: ${"★".repeat(f.minRat)}`, () => {
        const r = document.querySelector('input[name="ocena"]:checked');
        if (r) r.checked = false;
      });
    if (query)
      add(`Szukaj: ${query}`, () => {
        const inp = document.getElementById("searchInput");
        if (inp) inp.value = "";
      });

    if (!wrap.innerHTML) {
      const tag = document.createElement("span");
      tag.className = "filter-tag";
      tag.textContent = "Wszystkie kategorie";
      wrap.appendChild(tag);
    }
  }

  _bindFilters() {
    document
      .querySelectorAll(
        'input[name="marka"], input[name="ocena"], input[name="dostepnosc"]',
      )
      .forEach((el) => {
        el.addEventListener("change", () => this._applyFilters());
      });

    const applyPriceBtn = document.querySelector(".btn-apply-filter");
    if (applyPriceBtn)
      applyPriceBtn.addEventListener("click", () => this._applyFilters());

    const resetBtn = document.querySelector(".btn-reset-filter");
    if (resetBtn)
      resetBtn.addEventListener("click", () => this._resetFilters());

    document.querySelectorAll(".filter-list .filter-item").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        document
          .querySelectorAll(".filter-item")
          .forEach((a) => a.classList.remove("active"));
        link.classList.add("active");
        this._applyFilters();
      });
    });
  }

  _bindSort() {
    document
      .getElementById("sortSelect")
      ?.addEventListener("change", () => this._applyFilters());
  }

  _bindSearch() {
    const inp = document.getElementById("searchInput");
    if (!inp) return;
    let timer;
    inp.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => this._applyFilters(), 250);
    });
  }

  _resetFilters() {
    document
      .querySelectorAll(
        'input[name="marka"], input[name="ocena"], input[name="dostepnosc"]',
      )
      .forEach((cb) => (cb.checked = false));
    const priceMin = document.getElementById("priceMin");
    const priceMax = document.getElementById("priceMax");
    if (priceMin) priceMin.value = "";
    if (priceMax) priceMax.value = "";
    const inp = document.getElementById("searchInput");
    if (inp) inp.value = "";
    document
      .querySelectorAll(".filter-item")
      .forEach((a) => a.classList.remove("active"));
    document.querySelector(".filter-item:first-child")?.classList.add("active");
    this._applyFilters();
  }

  _loadCart() {
    try {
      return JSON.parse(localStorage.getItem("dartus_cart") ?? "{}");
    } catch (_) {
      return {};
    }
  }

  _saveCart() {
    localStorage.setItem("dartus_cart", JSON.stringify(this.cart));
  }

  _bindAddToCart() {
    document.querySelectorAll(".btn-add").forEach((btn, idx) => {
      btn.addEventListener("click", () => {
        const product = this.products[idx];
        if (!product) return;
        this._addToCart(product, btn);
      });
    });
  }

  _addToCart(product, btn) {
    const key = `p${product.id}`;
    this.cart[key] = (this.cart[key] ?? 0) + 1;
    this._saveCart();
    this._updateCartBadge();
    this._animateBtn(btn);

    MockApi.addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: this.cart[key],
    }).catch((err) => console.warn("addToCart error:", err));
  }

  _animateBtn(btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check-lg"></i> Dodano!';
    btn.disabled = true;
    btn.style.background = "var(--accent, #e63946)";
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.disabled = false;
      btn.style.background = "";
    }, 1200);
  }

  _updateCartBadge() {
    const total = Object.values(this.cart).reduce((s, v) => s + v, 0);
    document
      .querySelectorAll(".cart-badge")
      .forEach((b) => (b.textContent = total));
  }
}

document.addEventListener("DOMContentLoaded", () => new ProductCatalog());
