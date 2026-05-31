class MockApi {
  static _delay(ms = 350) {
    return new Promise(res => setTimeout(res, ms));
  }

  static async addToCart(payload) {
    await this._delay();
    console.info('[MockApi] addToCart', payload);
    return { ok: true, cart: payload };
  }

  static async saveCartItem(payload) {
    await this._delay(200);
    console.info('[MockApi] saveCartItem', payload);
    return { ok: true };
  }

  static async placeOrder(payload) {
    await this._delay(800);
    console.info('[MockApi] placeOrder', payload);
    if (Math.random() < 0.05) throw new Error('Server error 500');
    return { ok: true, orderId: 'ZAM-' + Date.now() };
  }

  static async lookupCity(zip, mockMap = {}) {
    await this._delay(150);
    return mockMap[zip] ?? null;
  }

  static async saveProduct(payload) {
    await this._delay(600);
    console.info('[MockApi] saveProduct', payload);
    return { ok: true, id: payload.id ?? Math.floor(Math.random() * 1000) };
  }

  static async deleteProduct(id) {
    await this._delay(400);
    console.info('[MockApi] deleteProduct', id);
    return { ok: true };
  }
}