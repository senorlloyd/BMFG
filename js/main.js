/* ============================================================
   Renders the product grid and category filters from PRODUCTS
   (defined in products.js). You should not need to edit this
   file to manage inventory — edit products.js instead.
   ============================================================ */

const CATEGORY_LABELS = {
  all:       "All",
  wood:      "Wood",
  metal:     "Metal",
  apparel:   "Apparel",
  graphics:  "Graphics"
};

const grid = document.getElementById("productGrid");
const chipsContainer = document.getElementById("filterChips");
const emptyState = document.getElementById("emptyState");

let activeCategory = "all";

function currency(amount) {
  return "$" + amount.toFixed(2);
}

function renderChips() {
  const present = new Set(["all", ...PRODUCTS.map(p => p.category)]);
  chipsContainer.innerHTML = "";

  Object.keys(CATEGORY_LABELS)
    .filter(key => present.has(key))
    .forEach(key => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.type = "button";
      chip.textContent = CATEGORY_LABELS[key];
      chip.setAttribute("aria-pressed", key === activeCategory ? "true" : "false");
      chip.addEventListener("click", () => {
        activeCategory = key;
        renderChips();
        renderGrid();
      });
      chipsContainer.appendChild(chip);
    });
}

function renderGrid() {
  const items = PRODUCTS.filter(
    p => activeCategory === "all" || p.category === activeCategory
  );

  grid.innerHTML = "";
  emptyState.hidden = items.length > 0;

  items.forEach(p => {
    const card = document.createElement("article");
    card.className = "card" + (p.available === false ? " is-unavailable" : "");
    card.dataset.category = p.category;

    card.innerHTML = `
      <span class="card-punch" aria-hidden="true"></span>
      <div class="card-media">
        <img src="${p.image}" alt="${p.name}" loading="lazy">
      </div>
      ${p.badge && p.available !== false ? `<span class="card-badge">${p.badge}</span>` : ""}
      <div class="card-body">
        <span class="card-cat">${CATEGORY_LABELS[p.category] || p.category}</span>
        <h3 class="card-name">${p.name}</h3>
        <p class="card-desc">${p.description || ""}</p>
        <div class="card-footer">
          <span class="card-price">${currency(p.price)}</span>
          ${
            p.available === false
              ? `<span class="card-buy">Sold Out</span>`
              : `<a class="card-buy" href="${p.squareLink}" target="_blank" rel="noopener">Buy Now</a>`
          }
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

renderChips();
renderGrid();
