class AdminProductRow {
  constructor(trEl) {
    this.el = trEl;
    this.name =
      trEl.querySelector(".table-product-name")?.textContent.trim() ?? "";
    this.id =
      trEl.querySelector('input[type="checkbox"]')?.id.replace("check", "") ??
      "";
    this._bindDelete();
    this._bindStatusToggle();
  }

  _bindDelete() {
    const btn = this.el.querySelector(".action-delete");
    if (!btn) return;
    btn.addEventListener("click", () => this._delete());
  }

  _delete() {
    if (!confirm(`Usunąć produkt „${this.name}"?`)) return;
    const btn = this.el.querySelector(".action-delete");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-hourglass-split"></i>';
    }

    MockApi.deleteProduct(this.id)
      .then(() => {
        this.el.style.transition = "opacity .3s";
        this.el.style.opacity = "0";
        setTimeout(() => {
          this.el.remove();
          AdminProducts.instance?._recalcStats();
        }, 300);
      })
      .catch(() => {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="bi bi-trash"></i>';
        }
        alert("Błąd usuwania. Spróbuj ponownie.");
      });
  }

  _bindStatusToggle() {
    const toggle = this.el.querySelector(
      '.status-toggle input[type="checkbox"]',
    );
    const label = this.el.querySelector(".status-text");
    if (!toggle || !label) return;

    toggle.addEventListener("change", () => {
      const active = toggle.checked;
      label.textContent = active ? "Aktywny" : "Nieaktywny";

      MockApi.saveProduct({
        id: this.id,
        status: active ? "active" : "draft",
      }).catch(() => {
        toggle.checked = !active;
        label.textContent = !active ? "Aktywny" : "Nieaktywny";
      });
    });
  }
}

class AdminProducts {
  static instance = null;

  constructor() {
    AdminProducts.instance = this;
    this.rows = [];
    this._loadRows();
    this._bindSelectAll();
    this._bindBulkAction();
    this._bindSearch();
    this._bindFilters();
    this._bindSortHeaders();
    this._recalcStats();
    this._bindMobileNav();
  }

  _loadRows() {
    document.querySelectorAll(".admin-table tbody tr").forEach((tr) => {
      this.rows.push(new AdminProductRow(tr));
    });
  }

  _bindSelectAll() {
    const selectAll = document.getElementById("selectAll");
    const checks = () =>
      document.querySelectorAll('.admin-table tbody input[type="checkbox"]');
    if (!selectAll) return;

    selectAll.addEventListener("change", () => {
      checks().forEach((cb) => (cb.checked = selectAll.checked));
    });

    document
      .querySelector(".admin-table tbody")
      ?.addEventListener("change", (e) => {
        if (e.target.type !== "checkbox") return;
        const all = [...checks()];
        selectAll.checked = all.every((c) => c.checked);
        selectAll.indeterminate =
          !selectAll.checked && all.some((c) => c.checked);
      });
  }

  _bindBulkAction() {
    const btn = document.querySelector(
      ".admin-toolbar-right .btn-secondary-admin",
    );
    const sel = document.getElementById("bulkAction");
    if (!btn || !sel) return;

    btn.addEventListener("click", () => {
      const action = sel.value;
      const checked = [
        ...document.querySelectorAll(
          '.admin-table tbody input[type="checkbox"]:checked',
        ),
      ];
      if (!action) {
        alert("Wybierz akcję masową.");
        return;
      }
      if (!checked.length) {
        alert("Zaznacz przynajmniej jeden produkt.");
        return;
      }

      const ids = checked.map((cb) => cb.id.replace("check", ""));

      if (action === "delete") {
        if (!confirm(`Usunąć ${checked.length} produktów?`)) return;
        checked.forEach((cb) => {
          const row = this.rows.find((r) => r.el === cb.closest("tr"));
          row?._delete();
        });
        return;
      }

      const statusMap = { activate: true, deactivate: false };
      if (action in statusMap) {
        const active = statusMap[action];
        checked.forEach((cb) => {
          const tr = cb.closest("tr");
          const toggle = tr?.querySelector(".status-toggle input");
          const label = tr?.querySelector(".status-text");
          if (toggle) toggle.checked = active;
          if (label) label.textContent = active ? "Aktywny" : "Nieaktywny";
        });
        MockApi.saveProduct({ ids, status: active ? "active" : "draft" }).catch(
          () => alert("Błąd zapisu statusów."),
        );
        this._recalcStats();
      }

      sel.value = "";
    });
  }

  _bindSearch() {
    const inp = document.getElementById("adminSearch");
    if (!inp) return;
    let timer;
    inp.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => this._applyFilters(), 200);
    });
  }

  _bindFilters() {
    ["filterCategory", "filterStatus"].forEach((id) => {
      document
        .getElementById(id)
        ?.addEventListener("change", () => this._applyFilters());
    });
  }

  _applyFilters() {
    const q =
      document.getElementById("adminSearch")?.value.trim().toLowerCase() ?? "";
    const cat = document.getElementById("filterCategory")?.value ?? "";
    const status = document.getElementById("filterStatus")?.value ?? "";

    this.rows.forEach((row) => {
      const tr = row.el;
      const name =
        tr.querySelector(".table-product-name")?.textContent.toLowerCase() ??
        "";
      const sku =
        tr.querySelector(".table-product-meta")?.textContent.toLowerCase() ??
        "";
      const rowCat =
        tr.querySelector(".cat-badge")?.textContent.toLowerCase() ?? "";
      const isActive =
        tr.querySelector(".status-toggle input")?.checked ?? false;
      const stockEl = tr.querySelector(".stock-indicator");
      const isLow = stockEl?.classList.contains("stock-low") ?? false;

      let show = true;
      if (q && !name.includes(q) && !sku.includes(q)) show = false;
      if (cat && !rowCat.includes(cat)) show = false;
      if (status === "active" && !isActive) show = false;
      if (status === "inactive" && isActive) show = false;
      if (status === "low" && !isLow) show = false;

      tr.style.display = show ? "" : "none";
    });
  }

  _bindSortHeaders() {
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.dataset.dir = "asc";
      btn.addEventListener("click", () => {
        const dir = btn.dataset.dir === "asc" ? "desc" : "asc";
        btn.dataset.dir = dir;
        const th = btn.closest("th");
        const idx = [...th.parentElement.children].indexOf(th);
        this._sortTable(idx, dir);
      });
    });
  }

  _sortTable(colIdx, dir) {
    const tbody = document.querySelector(".admin-table tbody");
    if (!tbody) return;
    const rows = [...tbody.querySelectorAll("tr")];
    rows.sort((a, b) => {
      const aT = a.cells[colIdx]?.textContent.trim() ?? "";
      const bT = b.cells[colIdx]?.textContent.trim() ?? "";
      const aN = parseFloat(aT.replace(",", "."));
      const bN = parseFloat(bT.replace(",", "."));
      const cmp = isNaN(aN) || isNaN(bN) ? aT.localeCompare(bT, "pl") : aN - bN;
      return dir === "asc" ? cmp : -cmp;
    });
    rows.forEach((r) => tbody.appendChild(r));
  }

  _recalcStats() {
    const allRows = document.querySelectorAll(".admin-table tbody tr");
    const activeRows = [...allRows].filter(
      (tr) => tr.querySelector(".status-toggle input")?.checked,
    );
    const lowRows = [...allRows].filter((tr) => tr.querySelector(".stock-low"));
    const noneRows = [...allRows].filter((tr) =>
      tr.querySelector(".stock-none"),
    );

    const nums = document.querySelectorAll(".admin-stat-num");
    if (nums[0]) nums[0].textContent = allRows.length;
    if (nums[1]) nums[1].textContent = activeRows.length;
    if (nums[2]) nums[2].textContent = lowRows.length;
    if (nums[3]) nums[3].textContent = noneRows.length;
  }

  _bindMobileNav() {
    const btn = document.getElementById("adminHamburger");
    const nav = document.getElementById("adminMobileNav");
    if (!btn || !nav) return;
    btn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
  }
}

document.addEventListener("DOMContentLoaded", () => new AdminProducts());
