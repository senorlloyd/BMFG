/* ============================================================
   PRODUCT INVENTORY
   ============================================================
   This is the ONLY file you need to touch to add, remove, or
   change a product. Nothing else on the site needs editing.

   HOW TO ADD A NEW PRODUCT
   1. Copy one of the objects below (from the { to the },).
   2. Paste it into the PRODUCTS array, change the values.
   3. Give it an "id" that no other product uses (no spaces).
   4. Save the file and refresh the page.

   HOW TO GET A SQUARE LINK FOR "squareLink"
   1. Log into squareup.com/dashboard
   2. Go to Items & Orders > Items, open (or create) the item.
   3. Click "Share" (or "Get a link to sell online") — Square
      gives you a checkout link like https://square.link/u/abc123
   4. Paste that whole link as the squareLink value below.
   Every "Buy Now" button on the site sends the customer straight
   to that Square checkout page — Square handles the payment,
   this site never touches card info.

   HOW TO REMOVE A PRODUCT
   Delete its whole { ... }, block, or set available: false to
   keep it on the site as "sold out" / "coming soon" instead.

   IMAGES
   Drop product photos in the /images folder and point "image"
   at the filename, e.g. "images/fidget-cube-orange.jpg".
   Recommended: square-ish photos, at least 800x800px.
   ============================================================ */

const PRODUCTS = [
  {
    id: "Jack-o-Lantern_Box",
    name: "Jack-o-Lantern Box",
    category: "wood",          // wood | metal | apparel | graphics
    price: 15.00,
    image: "Assets/HomePage/placeholder-fidget-cube.svg",
    description: "Jack o Lantern Box",
    badge: null,   
    squareLink: null,
    available: true
  },
  {
    id: "fidget-infinity-cube",
    name: "Fidget Infinity Cube",
    category: "graphics",          // wood | metal | apparel | graphics
    price: 8.00,
    image: "Assets/HomePage/placeholder-fidget-cube.svg",
    description: "3D-printed infinity cube. Pick your color.",
    badge: "Bestseller",           // optional — remove this line for no badge
    squareLink: "https://square.link/u/REPLACE-ME",
    available: true
  },
  {
    id: "custom-led-clock",
    name: "Custom LED Clock",
    category: "wood",
    price: 45.00,
    image: "Assets/HomePage/placeholder-clock.svg",
    description: "Your design, laser-cut and backlit with LEDs. Describe what you want — we build it to order.",
    badge: "Made to order",
    squareLink: "https://square.link/u/REPLACE-ME",
    available: true
  },
  {
    id: "wine-bottle-cork",
    name: "Handmade Wine Bottle Cork",
    category: "wood",
    price: 14.00,
    image: "Assets/HomePage/placeholder-cork.svg",
    description: "Hand-turned on the lathe from hardwood offcuts. Each one is one of a kind.",
    squareLink: "https://square.link/u/REPLACE-ME",
    available: true
  },
  {
    id: "vine-coasters",
    name: "Vine Coasters (Set of 5)",
    category: "wood",
    price: 18.00,
    image: "Assets/HomePage/placeholder-coasters.svg",
    description: "Laser-cut lattice pattern, comes with a matching stand.",
    squareLink: "https://square.link/u/REPLACE-ME",
    available: true
  },
  {
    id: "metal-rose",
    name: "Steel Rose",
    category: "metal",
    price: 22.00,
    image: "Assets/HomePage/placeholder-metal-rose.svg",
    description: "Hand-welded from steel offcuts. Never wilts.",
    squareLink: "https://square.link/u/REPLACE-ME",
    available: true
  },
  {
    id: "custom-metal-sign",
    name: "Custom Metal Sign",
    category: "metal",
    price: 35.00,
    image: "Assets/HomePage/placeholder-metal-sign.svg",
    description: "Plasma-cut on our ArcLight CNC table. Send us your design or logo.",
    badge: "Made to order",
    squareLink: "https://square.link/u/REPLACE-ME",
    available: true
  },
  {
    id: "embroidered-patch",
    name: "Custom Embroidered Patch",
    category: "apparel",
    price: 6.00,
    image: "Assets/HomePage/placeholder-patch.svg",
    description: "Your design, stitched to order. Iron-on or sew-on backing.",
    squareLink: "https://square.link/u/REPLACE-ME",
    available: true
  },
  {
    id: "engraved-plaque",
    name: "Engraved Plaque",
    category: "wood",
    price: 20.00,
    image: "Assets/HomePage/placeholder-plaque.svg",
    description: "Solid hardwood, CNC-engraved text or artwork.",
    squareLink: "https://square.link/u/REPLACE-ME",
    available: false   // example of a sold-out / inactive item
  }
];
