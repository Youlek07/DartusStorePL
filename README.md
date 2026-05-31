# DartusStorePL
Projekt sklepu internetowego ze sprzętem darterskim, wykonany w ramach przedmiotu **Systemy CMS 2025/26**.

## 4TP JULIAN MACHOWSKI

Hostowana strona 1 `Wersja po etapie 1`: https://dartusstorepl.netlify.app/ 

Hostowana strona 2 `Wersja po etapie 2`: https://dartus-store-pl.vercel.app/ 

---

## Widoki stron

| Plik | Opis |
|------|------|
| `index.html` | Strona główna |
| `produkty.html` | Wyszukiwarka z listą produktów |
| `koszyk.html` | Koszyk zakupowy |
| `zamowienie.html` | Formularz zamówienia |
| `admin-produkty.html` | Panel admin - lista produktów |
| `admin-dodaj.html` | Panel admin - dodawanie produktu |
| `admin-edytuj.html` | Panel admin - edycja produktu |
| `admin-sprzedaz.html` | Panel admin - zarządzanie sprzedażą |

---

## Technologie

- HTML5 + CSS3
- JavaScript (klasy, dziedziczenie, async/await)
- [Bootstrap 5.3](https://getbootstrap.com/)
- [Bootstrap Icons 1.11](https://icons.getbootstrap.com/)
- Google Fonts - Bebas Neue, DM Sans

---

## Struktura plików

```
├── index.html
├── produkty.html
├── koszyk.html
├── zamowienie.html
├── admin-produkty.html
├── admin-dodaj.html
├── admin-edytuj.html
├── admin-sprzedaz.html
├── css/
│   ├── style.css
│   ├── produkty.css
│   ├── koszyk.css
│   └── admin.css
├── js/
│   ├── mockApi.js
│   ├── index.js
│   ├── produkty.js
│   ├── koszyk.js
│   ├── zamowienie.js
│   ├── admin-produkty.js
│   ├── admin-dodaj.js
│   ├── admin-edytuj.js
│   └── admin-sprzedaz.js
└── assets/
    └── img/
        └── categories/
```

---

## Etap I - Widoki

Statyczne widoki wszystkich podstron sklepu zgodne ze standardami W3C, w pełni responsywne, zoptymalizowane pod SEO.

## Etap II - JavaScript

Logika działania sklepu po stronie przeglądarki. Kod pisany obiektowo, dane wysyłane przez AJAX (`async/await` + `MockApi` symulujący `fetch` - gotowy do podpięcia pod backend).

---

Systemy CMS 2025/26
