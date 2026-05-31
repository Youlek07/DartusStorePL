class HomePage {
  constructor() {
    this.cart = this._loadCart();
    this._updateCartBadge();
    this._bindAddToCart();
    this._animateHeroStats();
    this._initTicker();
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

  _updateCartBadge() {
    const total = Object.values(this.cart).reduce((s, v) => s + v, 0);
    document
      .querySelectorAll(".cart-badge")
      .forEach((b) => (b.textContent = total));
  }

  _bindAddToCart() {
    document.querySelectorAll(".btn-add").forEach((btn, idx) => {
      btn.addEventListener("click", () => {
        const key = `home_p${idx + 1}`;
        this.cart[key] = (this.cart[key] ?? 0) + 1;
        this._saveCart();
        this._updateCartBadge();

        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check-lg"></i> Dodano!';
        btn.disabled = true;
        btn.style.background = "var(--accent, #e63946)";
        setTimeout(() => {
          btn.innerHTML = orig;
          btn.disabled = false;
          btn.style.background = "";
        }, 1200);

        MockApi.addToCart({ id: key, qty: this.cart[key] }).catch((err) =>
          console.warn("addToCart:", err),
        );
      });
    });
  }

  _animateHeroStats() {
    const stats = document.querySelectorAll(".stat-num");
    if (!stats.length) return;

    const targets = [500, 10, 4.9];
    const suffixes = ["+", "+", "★"];

    stats.forEach((el, i) => {
      const target = targets[i];
      const suffix = suffixes[i];
      const isFloat = !Number.isInteger(target);
      const step = isFloat ? 0.1 : Math.ceil(target / 40);
      let current = 0;

      const tick = () => {
        current = isFloat
          ? Math.min(+(current + step).toFixed(1), target)
          : Math.min(current + step, target);

        el.textContent = (isFloat ? current.toFixed(1) : current) + suffix;
        if (current < target) requestAnimationFrame(tick);
      };

      const obs = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            obs.disconnect();
            tick();
          }
        },
        { threshold: 0.5 },
      );
      obs.observe(el);
    });
  }

  _initTicker() {
    const inner = document.querySelector(".ticker-inner");
    if (!inner) return;
    inner.addEventListener(
      "mouseenter",
      () => (inner.style.animationPlayState = "paused"),
    );
    inner.addEventListener(
      "mouseleave",
      () => (inner.style.animationPlayState = "running"),
    );
  }
}

document.addEventListener("DOMContentLoaded", () => new HomePage());
