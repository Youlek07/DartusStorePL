class Validator {
  static required(val) {
    return val.trim() ? null : "To pole jest wymagane.";
  }
  static email(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())
      ? null
      : "Podaj poprawny adres e-mail.";
  }
  static phone(val) {
    return /^[+\d\s\-()]{7,15}$/.test(val.trim())
      ? null
      : "Podaj poprawny numer telefonu.";
  }
  static zip(val) {
    return /^\d{2}-\d{3}$/.test(val.trim())
      ? null
      : "Kod pocztowy: format XX-XXX.";
  }
  static nip(val) {
    return /^\d{3}-\d{3}-\d{2}-\d{2}$/.test(val.trim())
      ? null
      : "NIP: format XXX-XXX-XX-XX.";
  }
  static minLen(n) {
    return (val) => (val.trim().length >= n ? null : `Min. ${n} znaki.`);
  }

  static chain(val, ...fns) {
    for (const fn of fns) {
      const err = fn(val);
      if (err) return err;
    }
    return null;
  }
}

class FormField {
  constructor(el, ...validators) {
    this.el = el;
    this.validators = validators;
    this._buildError();
    el.addEventListener("blur", () => this.validate());
    el.addEventListener("input", () => {
      if (this._dirty) this.validate();
    });
    el.addEventListener("focus", () => {
      this._dirty = true;
    });
    this._dirty = false;
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
    const msg = Validator.chain(this.el.value, ...this.validators);
    if (msg) {
      this._errEl.textContent = msg;
      this.el.classList.add("is-invalid");
      this.el.classList.remove("is-valid");
      return false;
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

class OrderForm {
  constructor() {
    this._fields = [];
    this._setupFields();
    this._setupInvoiceToggle();
    this._setupSubmit();
    this._autocomplete();
  }

  _setupFields() {
    const add = (id, ...validators) => {
      const el = document.getElementById(id);
      if (el) this._fields.push(new FormField(el, ...validators));
    };

    add("firstName", Validator.required, Validator.minLen(2));
    add("lastName", Validator.required, Validator.minLen(2));
    add("email", Validator.required, Validator.email);
    add("phone", Validator.required, Validator.phone);
    add("street", Validator.required);
    add("zip", Validator.required, Validator.zip);
    add("city", Validator.required, Validator.minLen(2));
  }

  _setupInvoiceToggle() {
    const toggle = document.getElementById("needsInvoice");
    const panel = document.getElementById("invoiceFields");
    if (!toggle || !panel) return;

    const nipEl = document.getElementById("nip");
    const companyEl = document.getElementById("companyName");
    let nipField = null;
    let companyField = null;

    const sync = () => {
      const on = toggle.checked;
      panel.style.display = on ? "" : "none";
      panel.setAttribute("aria-hidden", String(!on));

      if (on && !nipField) {
        if (nipEl)
          nipField = new FormField(nipEl, Validator.required, Validator.nip);
        if (companyEl)
          companyField = new FormField(companyEl, Validator.required);
        if (nipField) this._fields.push(nipField);
        if (companyField) this._fields.push(companyField);
      }
      if (!on) {
        this._fields = this._fields.filter(
          (f) => f !== nipField && f !== companyField,
        );
        [nipEl, companyEl].forEach((el) =>
          el?.classList.remove("is-invalid", "is-valid"),
        );
      }
    };

    panel.style.display = "none";
    toggle.addEventListener("change", sync);
  }

  _setupSubmit() {
    const btn = document.querySelector(
      'button[type="submit"], .btn-primary-custom[type="submit"]',
    );
    if (!btn) return;

    const terms = document.getElementById("terms");

    btn.addEventListener("click", async (e) => {
      e.preventDefault();

      let valid = true;
      this._fields.forEach((f) => {
        if (!f.validate()) valid = false;
      });

      if (terms && !terms.checked) {
        valid = false;
        this._showGlobalErr(
          "Musisz zaakceptować regulamin i politykę prywatności.",
        );
      } else {
        this._clearGlobalErr();
      }

      if (!valid) {
        const firstBad = document.querySelector(".is-invalid");
        firstBad?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      this._setLoading(btn, true);

      try {
        const payload = this._collect();
        await MockApi.placeOrder(payload);
        this._showSuccess();
      } catch (err) {
        this._showGlobalErr(
          "Wystąpił błąd podczas składania zamówienia. Spróbuj ponownie.",
        );
        console.error(err);
      } finally {
        this._setLoading(btn, false);
      }
    });
  }

  _collect() {
    const get = (id) => document.getElementById(id)?.value.trim() ?? "";
    return {
      firstName: get("firstName"),
      lastName: get("lastName"),
      email: get("email"),
      phone: get("phone"),
      street: get("street"),
      zip: get("zip"),
      city: get("city"),
      country: get("country"),
      notes: get("notes"),
      invoice: document.getElementById("needsInvoice")?.checked
        ? {
            company: get("companyName"),
            nip: get("nip"),
          }
        : null,
      payment:
        document.querySelector('input[name="payment"]:checked')?.value ?? "",
      marketing: document.getElementById("marketing")?.checked ?? false,
    };
  }

  _showSuccess() {
    const main = document.querySelector("main .container");
    if (!main) return;
    main.innerHTML = `
      <div class="text-center py-5">
        <div style="font-size:4rem;">🎯</div>
        <h2 style="margin-top:1rem;">Zamówienie złożone!</h2>
        <p style="opacity:.7;max-width:420px;margin:.75rem auto 0;">
          Potwierdzenie wysłaliśmy na podany adres e-mail. Dziękujemy za zakupy!
        </p>
        <a href="index.html" class="btn-primary-custom d-inline-block mt-4">Wróć do sklepu</a>
      </div>`;
  }

  _showGlobalErr(msg) {
    let el = document.getElementById("global-form-err");
    if (!el) {
      el = document.createElement("p");
      el.id = "global-form-err";
      el.setAttribute("role", "alert");
      el.style.cssText = "color:#dc3545;font-weight:500;margin-top:1rem;";
      document.querySelector(".form-section:last-of-type")?.append(el);
    }
    el.textContent = msg;
  }

  _clearGlobalErr() {
    const el = document.getElementById("global-form-err");
    if (el) el.textContent = "";
  }

  _setLoading(btn, on) {
    btn.disabled = on;
    btn.textContent = on ? "Wysyłanie…" : "Złóż zamówienie →";
  }

  _autocomplete() {
    const zipEl = document.getElementById("zip");
    const cityEl = document.getElementById("city");
    if (!zipEl || !cityEl) return;

    const mockCities = {
      "60-001": "Poznań",
      "60-002": "Poznań",
      "00-001": "Warszawa",
      "30-001": "Kraków",
      "80-001": "Gdańsk",
      "50-001": "Wrocław",
    };

    zipEl.addEventListener("blur", async () => {
      const zip = zipEl.value.trim();
      if (!/^\d{2}-\d{3}$/.test(zip)) return;
      if (cityEl.value.trim()) return;

      try {
        const city = await MockApi.lookupCity(zip, mockCities);
        if (city) {
          cityEl.value = city;
          cityEl.classList.add("is-valid");
        }
      } catch (_) {}
    });
  }
}

document.addEventListener("DOMContentLoaded", () => new OrderForm());
