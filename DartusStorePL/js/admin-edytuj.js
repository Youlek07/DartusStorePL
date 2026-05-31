class AdminFormField {
  constructor(el, ...validators) {
    this.el = el;
    this.validators = validators;
    this._dirty = false;
    this._buildError();
    el.addEventListener("blur", () => {
      this._dirty = true;
      this.validate();
    });
    el.addEventListener("input", () => {
      if (this._dirty) this.validate();
    });
  }

  _buildError() {
    let err = this.el.nextElementSibling;
    if (!err || !err.classList.contains("field-error")) {
      err = document.createElement("span");
      err.className = "field-error";
      err.setAttribute("aria-live", "polite");
      err.style.cssText =
        "display:block;font-size:.8rem;color:#dc3545;margin-top:.25rem;min-height:1rem;";
      this.el.after(err);
    }
    this._errEl = err;
  }

  validate() {
    for (const fn of this.validators) {
      const msg = fn(this.el.value);
      if (msg) {
        this._errEl.textContent = msg;
        this.el.classList.add("is-invalid");
        this.el.classList.remove("is-valid");
        return false;
      }
    }
    this._errEl.textContent = "";
    this.el.classList.remove("is-invalid");
    this.el.classList.add("is-valid");
    return true;
  }

  get value() {
    return this.el.value.trim();
  }
}

const EV = {
  required: (val) => (val.trim() ? null : "To pole jest wymagane."),
  minLen: (n) => (val) => (val.trim().length >= n ? null : `Min. ${n} znaki.`),
  sku: (val) =>
    /^[A-Z]{2,6}-\d{3,6}$/i.test(val.trim()) ? null : "Format SKU: DAR-001.",
  price: (val) => (parseFloat(val) > 0 ? null : "Podaj cenę większą od 0."),
  stock: (val) => (parseInt(val, 10) >= 0 ? null : "Stan nie może być ujemny."),
};

class AdminEditProduct {
  constructor() {
    this._fields = [];
    this._deletedImgs = new Set();
    this._setupFields();
    this._setupImageManagement();
    this._setupCharCounters();
    this._setupSeoMirror();
    this._setupDuplicate();
    this._setupDelete();
    this._setupSubmit();
    this._markUnsaved();
  }

  _setupFields() {
    const add = (id, ...validators) => {
      const el = document.getElementById(id);
      if (el) this._fields.push(new AdminFormField(el, ...validators));
    };

    add("editProductName", EV.required, EV.minLen(3));
    add("editProductSku", EV.required, EV.sku);
    add("editPriceRegular", EV.required, EV.price);
    add("editStockQty", EV.required, EV.stock);
  }

  _setupImageManagement() {
    document.querySelectorAll(".existing-img-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const wrap = btn.closest(".existing-img-wrap");
        if (!wrap) return;
        const imgEl = wrap.querySelector(".existing-img");
        const label =
          wrap.querySelector(".existing-img-badge")?.textContent ?? "";
        if (!confirm(`Usunąć zdjęcie${label ? " (" + label + ")" : ""}?`))
          return;

        this._deletedImgs.add(label || wrap.dataset.id || "img");
        wrap.style.transition = "opacity .25s";
        wrap.style.opacity = "0";
        setTimeout(() => wrap.remove(), 250);
      });
    });

    const input = document.getElementById("editProductImages");
    const addBtn = document.querySelector(".existing-images .upload-thumb");
    if (!input) return;

    input.addEventListener("change", () => {
      const files = [...input.files];
      const wrap =
        input.closest(".existing-images") ??
        document.querySelector(".existing-images");
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newWrap = document.createElement("div");
          newWrap.className = "existing-img-wrap";
          newWrap.innerHTML = `
            <div class="existing-img" role="img" aria-label="Nowe zdjęcie">
              <img src="${e.target.result}" alt="Nowe zdjęcie"
                style="width:100%;height:100%;object-fit:cover;border-radius:8px;">
            </div>
            <span class="existing-img-badge" style="background:#198754">Nowe</span>
            <button type="button" class="existing-img-remove" aria-label="Usuń nowe zdjęcie">
              <i class="bi bi-x"></i>
            </button>`;
          newWrap
            .querySelector(".existing-img-remove")
            .addEventListener("click", () => {
              newWrap.remove();
            });
          addBtn
            ? wrap.insertBefore(newWrap, addBtn)
            : wrap.appendChild(newWrap);
        };
        reader.readAsDataURL(file);
      });
    });
  }

  _setupCharCounters() {
    [
      ["editSeoTitle", 60],
      ["editSeoDesc", 160],
    ].forEach(([id, max]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const counter = document.createElement("span");
      counter.style.cssText = "font-size:.75rem;opacity:.5;float:right;";
      el.closest(".col-12")
        ?.querySelector(".admin-input-hint")
        ?.before(counter);
      const update = () => {
        counter.textContent = `${el.value.length}/${max}`;
        counter.style.color = max - el.value.length < 10 ? "#dc3545" : "";
      };
      el.addEventListener("input", update);
      update();
    });
  }

  _setupSeoMirror() {
    const nameEl = document.getElementById("editProductName");
    const seoEl = document.getElementById("editSeoTitle");
    if (!nameEl || !seoEl) return;
    nameEl.addEventListener("input", () => {
      if (seoEl.value.trim()) return;
      seoEl.value = nameEl.value.slice(0, 50) + " - DartusStorePL";
    });
  }

  _setupDuplicate() {
    const btn = document
      .querySelector(".btn-secondary-admin .bi-arrow-repeat")
      ?.closest("button");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      if (!confirm("Duplikować ten produkt?")) return;
      btn.disabled = true;
      try {
        const payload = this._collect();
        payload.name += " (kopia)";
        payload.sku += "-KOPIA";
        const res = await MockApi.saveProduct(payload);
        this._showToast(`Zduplikowano jako ID ${res.id}.`, true);
      } catch {
        this._showToast("Błąd duplikowania.", false);
      } finally {
        btn.disabled = false;
      }
    });
  }

  _setupDelete() {
    document.querySelectorAll(".btn-danger-admin").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const name =
          document.getElementById("editProductName")?.value.trim() ?? "produkt";
        if (!confirm(`Trwale usunąć „${name}"? Tej operacji nie można cofnąć.`))
          return;
        btn.disabled = true;
        btn.textContent = "Usuwanie…";
        try {
          await MockApi.deleteProduct(
            document.getElementById("editProductSku")?.value ?? "",
          );
          this._showToast(`Produkt „${name}" został usunięty.`, true);
          setTimeout(() => {
            window.location.href = "admin-produkty.html";
          }, 1200);
        } catch {
          this._showToast("Błąd usuwania.", false);
          btn.disabled = false;
          btn.innerHTML = '<i class="bi bi-trash"></i> Usuń produkt';
        }
      });
    });
  }

  _markUnsaved() {
    let dirty = false;
    const form = document.getElementById("editForm");
    form?.addEventListener("input", () => {
      dirty = true;
    });
    form?.addEventListener("change", () => {
      dirty = true;
    });

    window.addEventListener("beforeunload", (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "Masz niezapisane zmiany. Na pewno chcesz wyjść?";
    });

    document.querySelectorAll('a[href="admin-produkty.html"]').forEach((a) => {
      a.addEventListener("click", () => {
        dirty = false;
      });
    });
  }

  _setupSubmit() {
    const form = document.getElementById("editForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      let valid = true;
      this._fields.forEach((f) => {
        if (!f.validate()) valid = false;
      });
      if (!valid) {
        document
          .querySelector(".is-invalid")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const btn =
        form.querySelector('[type="submit"]') ??
        document.querySelector('[form="editForm"][type="submit"]');
      this._setLoading(btn, true);

      try {
        const payload = this._collect();
        payload.deletedImages = [...this._deletedImgs];
        await MockApi.saveProduct(payload);
        this._showToast("Zmiany zostały zapisane.", true);

        document
          .getElementById("editForm")
          ?.dispatchEvent(new CustomEvent("saved"));
      } catch (err) {
        this._showToast("Błąd zapisu. Spróbuj ponownie.", false);
        console.error(err);
      } finally {
        this._setLoading(btn, false);
      }
    });
  }

  _collect() {
    const get = (id) => document.getElementById(id)?.value.trim() ?? "";
    const chk = (name) =>
      document.querySelector(`input[name="${name}"]`)?.checked ?? false;
    const cat =
      document.querySelector('input[name="category"]:checked')?.value ?? "";

    return {
      name: get("editProductName"),
      sku: get("editProductSku"),
      brand: get("editProductBrand"),
      desc: get("editProductDesc"),
      category: cat,
      price: parseFloat(get("editPriceRegular")) || 0,
      priceSale: parseFloat(get("editPriceSale")) || null,
      tax: get("editPriceTax"),
      stock: parseInt(get("editStockQty"), 10) || 0,
      stockLow: parseInt(get("editStockLow"), 10) || 5,
      backorder: chk("backorder"),
      status: get("editProductStatus"),
      featured: chk("featured"),
      isNew: chk("isNew"),
      bestseller: chk("isBestseller"),
      weight: get("editAttrWeight"),
      material: get("editAttrMaterial"),
      type: get("editAttrType"),
      tags: get("editProductTags")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      seoTitle: get("editSeoTitle"),
      seoDesc: get("editSeoDesc"),
    };
  }

  _setLoading(btn, on) {
    if (!btn) return;
    btn.disabled = on;
    btn.innerHTML = on
      ? '<i class="bi bi-hourglass-split"></i> Zapisywanie…'
      : '<i class="bi bi-check-lg"></i> Zapisz zmiany';
  }

  _showToast(msg, ok) {
    let toast = document.getElementById("adminToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "adminToast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      toast.style.cssText = `
        position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;
        padding:.75rem 1.25rem;border-radius:8px;font-weight:500;
        font-size:.9rem;box-shadow:0 4px 20px rgba(0,0,0,.3);transition:opacity .3s;`;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.background = ok ? "#198754" : "#dc3545";
    toast.style.color = "#fff";
    toast.style.opacity = "1";
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = "0";
    }, 3000);
  }
}

document.addEventListener("DOMContentLoaded", () => new AdminEditProduct());
