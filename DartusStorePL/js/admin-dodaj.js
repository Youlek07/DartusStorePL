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

const V = {
  required: (val) => (val.trim() ? null : "To pole jest wymagane."),
  minLen: (n) => (val) => (val.trim().length >= n ? null : `Min. ${n} znaki.`),
  sku: (val) =>
    /^[A-Z]{2,6}-\d{3,6}$/i.test(val.trim()) ? null : "Format SKU: DAR-001.",
  price: (val) => (parseFloat(val) > 0 ? null : "Podaj cenę większą od 0."),
  stock: (val) => (parseInt(val, 10) >= 0 ? null : "Stan nie może być ujemny."),
};

class AdminAddProduct {
  constructor() {
    this._fields = [];
    this._setupFields();
    this._setupImagePreview();
    this._setupAutoSku();
    this._setupSeoMirror();
    this._setupCharCounters();
    this._setupSubmit();
  }

  _setupFields() {
    const add = (id, ...validators) => {
      const el = document.getElementById(id);
      if (el) this._fields.push(new AdminFormField(el, ...validators));
    };

    add("productName", V.required, V.minLen(3));
    add("productSku", V.required, V.sku);
    add("priceRegular", V.required, V.price);
    add("stockQty", V.required, V.stock);
  }

  _setupAutoSku() {
    const nameEl = document.getElementById("productName");
    const skuEl = document.getElementById("productSku");
    if (!nameEl || !skuEl) return;

    nameEl.addEventListener("blur", () => {
      if (skuEl.value.trim()) return; 
      const words = nameEl.value.trim().toUpperCase().split(/\s+/);
      const prefix = words
        .slice(0, 2)
        .map((w) => w.slice(0, 3))
        .join("");
      const num = String(Math.floor(Math.random() * 900) + 100);
      skuEl.value = `${prefix}-${num}`;
      skuEl.dispatchEvent(new Event("input"));
    });
  }

  _setupSeoMirror() {
    const nameEl = document.getElementById("productName");
    const seoEl = document.getElementById("seoTitle");
    if (!nameEl || !seoEl) return;

    nameEl.addEventListener("input", () => {
      if (seoEl.dataset.edited) return;
      seoEl.value = nameEl.value.slice(0, 50)
        ? nameEl.value.slice(0, 50) + " - DartusStorePL"
        : "";
    });

    seoEl.addEventListener("input", () => {
      seoEl.dataset.edited = "1";
    });
  }

  _setupCharCounters() {
    const pairs = [
      ["seoTitle", 60],
      ["seoDesc", 160],
    ];
    pairs.forEach(([id, max]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const counter = document.createElement("span");
      counter.style.cssText = "font-size:.75rem;opacity:.5;float:right;";
      el.closest(".col-12")
        ?.querySelector(".admin-input-hint")
        ?.before(counter);

      const update = () => {
        const left = max - el.value.length;
        counter.textContent = `${el.value.length}/${max}`;
        counter.style.color = left < 10 ? "#dc3545" : "";
      };
      el.addEventListener("input", update);
      update();
    });
  }

  _setupImagePreview() {
    const input = document.getElementById("productImages");
    const thumbs = document.querySelectorAll(".upload-thumb");
    if (!input || !thumbs.length) return;

    input.addEventListener("change", () => {
      const files = [...input.files].slice(0, thumbs.length);
      files.forEach((file, i) => {
        const thumb = thumbs[i];
        if (!thumb) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          thumb.innerHTML = `<img src="${e.target.result}" alt="Podgląd ${i + 1}"
            style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
          thumb.classList.remove("upload-thumb-empty");
        };
        reader.readAsDataURL(file);
      });
    });

    const zone = document.querySelector(".upload-zone");
    if (!zone) return;
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", () =>
      zone.classList.remove("drag-over"),
    );
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");
      const dt = e.dataTransfer;
      if (dt?.files.length) {
        const files = [...dt.files]
          .filter((f) => f.type.startsWith("image/"))
          .slice(0, thumbs.length);
        files.forEach((file, i) => {
          const thumb = thumbs[i];
          if (!thumb) return;
          const reader = new FileReader();
          reader.onload = (e2) => {
            thumb.innerHTML = `<img src="${e2.target.result}" alt="Podgląd ${i + 1}"
              style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
            thumb.classList.remove("upload-thumb-empty");
          };
          reader.readAsDataURL(file);
        });
      }
    });
  }

  _setupSubmit() {
    const form = document.getElementById("productForm");
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
        document.querySelector('[form="productForm"]');
      this._setLoading(btn, true);

      try {
        const payload = this._collect();
        const res = await MockApi.saveProduct(payload);
        this._showToast(
          `Produkt „${payload.name}" został dodany (ID: ${res.id}).`,
          true,
        );
        setTimeout(() => {
          window.location.href = "admin-produkty.html";
        }, 1500);
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
      name: get("productName"),
      sku: get("productSku"),
      brand: get("productBrand"),
      desc: get("productDesc"),
      category: cat,
      price: parseFloat(get("priceRegular")) || 0,
      priceSale: parseFloat(get("priceSale")) || null,
      tax: get("priceTax"),
      stock: parseInt(get("stockQty"), 10) || 0,
      stockLow: parseInt(get("stockLow"), 10) || 5,
      backorder: chk("backorder"),
      status: get("productStatus"),
      featured: chk("featured"),
      isNew: chk("isNew"),
      bestseller: chk("isBestseller"),
      weight: get("attrWeight"),
      material: get("attrMaterial"),
      type: get("attrType"),
      tags: get("productTags")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      seoTitle: get("seoTitle"),
      seoDesc: get("seoDesc"),
    };
  }

  _setLoading(btn, on) {
    if (!btn) return;
    btn.disabled = on;
    btn.innerHTML = on
      ? '<i class="bi bi-hourglass-split"></i> Zapisywanie…'
      : '<i class="bi bi-check-lg"></i> Zapisz produkt';
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
        font-size:.9rem;box-shadow:0 4px 20px rgba(0,0,0,.3);
        transition:opacity .3s;`;
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

document.addEventListener("DOMContentLoaded", () => new AdminAddProduct());
