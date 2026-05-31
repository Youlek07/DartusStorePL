class OrderRow {
  constructor(trEl) {
    this.el = trEl;
    this.num = trEl.querySelector(".order-num")?.textContent.trim() ?? "";
    this._bindActions();
  }

  _bindActions() {
    const viewBtn = this.el.querySelector(".action-edit");
    if (viewBtn) viewBtn.addEventListener("click", () => this._showModal());

    const cancelBtn = this.el.querySelector(".action-delete");
    if (cancelBtn)
      cancelBtn.addEventListener("click", () => this._cancel(cancelBtn));
  }

  _cancel(btn) {
    if (!confirm(`Anulować zamówienie ${this.num}?`)) return;
    btn.disabled = true;

    MockApi.saveProduct({ id: this.num, status: "cancelled" })
      .then(() => {
        const badge = this.el.querySelector(".order-status");
        if (badge) {
          badge.className = "order-status order-status-cancelled";
          badge.textContent = "Anulowane";
        }
      })
      .catch(() => {
        btn.disabled = false;
        alert("Błąd anulowania zamówienia.");
      });
  }

  _showModal() {
    const tr = this.el;
    const num = tr.querySelector(".order-num")?.textContent ?? "";
    const klient = tr.querySelector(".table-product-name")?.textContent ?? "";
    const pills = [...tr.querySelectorAll(".order-product-pill")]
      .map((p) => `<li>${p.textContent}</li>`)
      .join("");
    const value = tr.querySelector(".table-price")?.textContent ?? "";
    const ship = tr.querySelector(".table-product-meta")?.textContent ?? "";
    const status = tr.querySelector(".order-status")?.textContent ?? "";

    let modal = document.getElementById("orderModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "orderModal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "orderModalTitle");
      modal.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;
        display:flex;align-items:center;justify-content:center;padding:1rem;`;
      document.body.appendChild(modal);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.remove();
      });
    }

    modal.innerHTML = `
      <div style="background:var(--admin-card,#1a1a2e);border-radius:12px;padding:2rem;max-width:480px;width:100%;color:inherit;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
          <h2 id="orderModalTitle" style="margin:0;font-size:1.25rem;">Zamówienie ${num}</h2>
          <button aria-label="Zamknij" style="background:none;border:none;cursor:pointer;font-size:1.5rem;color:inherit;"
            onclick="document.getElementById('orderModal').remove()">×</button>
        </div>
        <dl style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem .75rem;font-size:.9rem;">
          <dt style="opacity:.6;">Klient</dt> <dd>${klient}</dd>
          <dt style="opacity:.6;">Produkty</dt> <dd><ul style="margin:0;padding-left:1rem;">${pills}</ul></dd>
          <dt style="opacity:.6;">Wartość</dt> <dd>${value}</dd>
          <dt style="opacity:.6;">Dostawa</dt> <dd>${ship}</dd>
          <dt style="opacity:.6;">Status</dt> <dd>${status}</dd>
        </dl>
        <div style="margin-top:1.5rem;display:flex;gap:.75rem;flex-wrap:wrap;">
          <button class="btn-primary-admin modal-ship-btn" style="flex:1;">
            <i class="bi bi-truck"></i> Oznacz wysłane
          </button>
          <button class="btn-secondary-admin" style="flex:1;"
            onclick="document.getElementById('orderModal').remove()">Zamknij</button>
        </div>
      </div>`;

    modal.querySelector(".modal-ship-btn")?.addEventListener("click", () => {
      const badge = tr.querySelector(".order-status");
      if (badge) {
        badge.className = "order-status order-status-shipped";
        badge.textContent = "Wysłane";
      }
      MockApi.saveProduct({ id: num, status: "shipped" });
      modal.remove();
    });
  }
}

class AdminSales {
  constructor() {
    this.rows = [];
    this._loadRows();
    this._bindSelectAll();
    this._bindBulkAction();
    this._bindSearch();
    this._bindFilters();
    this._bindSortHeaders();
    this._recalcStats();
    this._bindMobileNav();
    this._bindExportCSV();
  }

  _loadRows() {
    document.querySelectorAll(".admin-table tbody tr").forEach((tr) => {
      this.rows.push(new OrderRow(tr));
    });
  }

  _bindSelectAll() {
    const sa = document.getElementById("selectAllOrders");
    const checks = () =>
      document.querySelectorAll('.admin-table tbody input[type="checkbox"]');
    if (!sa) return;

    sa.addEventListener("change", () =>
      checks().forEach((cb) => (cb.checked = sa.checked)),
    );
    document
      .querySelector(".admin-table tbody")
      ?.addEventListener("change", (e) => {
        if (e.target.type !== "checkbox") return;
        const all = [...checks()];
        sa.checked = all.every((c) => c.checked);
        sa.indeterminate = !sa.checked && all.some((c) => c.checked);
      });
  }

  _bindBulkAction() {
    const btn = document.querySelector(
      ".admin-toolbar-right .btn-secondary-admin",
    );
    const sel = document.getElementById("orderBulkAction");
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
        alert("Zaznacz przynajmniej jedno zamówienie.");
        return;
      }

      const statusMap = {
        "mark-shipped": { cls: "order-status-shipped", txt: "Wysłane" },
        "mark-delivered": { cls: "order-status-delivered", txt: "Dostarczone" },
      };

      if (action in statusMap) {
        const { cls, txt } = statusMap[action];
        checked.forEach((cb) => {
          const badge = cb.closest("tr")?.querySelector(".order-status");
          if (badge) {
            badge.className = `order-status ${cls}`;
            badge.textContent = txt;
          }
        });
        const ids = checked.map((cb) => cb.id);
        MockApi.saveProduct({ ids, status: action }).catch(() =>
          alert("Błąd zapisu statusów."),
        );
      }

      if (action === "export") {
        this._exportSelected(checked.map((cb) => cb.closest("tr")));
      }

      sel.value = "";
    });
  }

  _bindSearch() {
    const inp = document.getElementById("orderSearch");
    if (!inp) return;
    let timer;
    inp.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => this._applyFilters(), 200);
    });
  }

  _bindFilters() {
    document
      .getElementById("filterOrderStatus")
      ?.addEventListener("change", () => this._applyFilters());

    const applyDate = () => this._applyFilters();
    document
      .getElementById("filterDateFrom")
      ?.addEventListener("change", applyDate);
    document
      .getElementById("filterDateTo")
      ?.addEventListener("change", applyDate);
  }

  _applyFilters() {
    const q =
      document.getElementById("orderSearch")?.value.trim().toLowerCase() ?? "";
    const status = document.getElementById("filterOrderStatus")?.value ?? "";

    this.rows.forEach((row) => {
      const tr = row.el;
      const num =
        tr.querySelector(".order-num")?.textContent.toLowerCase() ?? "";
      const client =
        tr.querySelector(".table-product-name")?.textContent.toLowerCase() ??
        "";
      const rowSt =
        tr.querySelector(".order-status")?.textContent.toLowerCase() ?? "";

      let show = true;
      if (q && !num.includes(q) && !client.includes(q)) show = false;
      if (status && !rowSt.includes(status.toLowerCase())) show = false;

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
      const cmp = aT.localeCompare(bT, "pl");
      return dir === "asc" ? cmp : -cmp;
    });
    rows.forEach((r) => tbody.appendChild(r));
  }

  _recalcStats() {
    const allRows = document.querySelectorAll(".admin-table tbody tr");
    const pending = [...allRows].filter((tr) =>
      tr.querySelector(".order-status-new, .order-status-paid"),
    );
    const done = [...allRows].filter((tr) =>
      tr.querySelector(".order-status-delivered"),
    );

    const revenue = [...allRows].reduce((s, tr) => {
      const val =
        parseFloat(
          tr.querySelector(".table-price")?.textContent.replace(",", "."),
        ) || 0;
      return s + val;
    }, 0);

    const nums = document.querySelectorAll(".admin-stat-num");
    if (nums[0]) nums[0].textContent = allRows.length;
    if (nums[1]) nums[1].textContent = pending.length;
    if (nums[2]) nums[2].textContent = done.length;
    if (nums[3])
      nums[3].textContent = revenue.toFixed(2).replace(".", ",") + " zł";
  }

  _bindExportCSV() {
    const btn = document.querySelector(
      '.btn-secondary-admin[class*="download"], .btn-secondary-admin',
    );
    if (!btn) return;
    btn.addEventListener("click", () =>
      this._exportSelected([
        ...document.querySelectorAll(".admin-table tbody tr"),
      ]),
    );
  }

  _exportSelected(rows) {
    const header = "Nr zamówienia,Klient,Wartość,Status\n";
    const lines = rows
      .map((tr) => {
        const num = tr.querySelector(".order-num")?.textContent.trim() ?? "";
        const client =
          tr.querySelector(".table-product-name")?.textContent.trim() ?? "";
        const value =
          tr.querySelector(".table-price")?.textContent.trim() ?? "";
        const status =
          tr.querySelector(".order-status")?.textContent.trim() ?? "";
        return `"${num}","${client}","${value}","${status}"`;
      })
      .join("\n");

    const blob = new Blob(["\uFEFF" + header + lines], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zamowienia_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

document.addEventListener("DOMContentLoaded", () => new AdminSales());
