(function attachRivayatCatalogue(root, factory) {
  const catalogue = factory();
  if (typeof module === "object" && module.exports) module.exports = catalogue;
  if (root) root.RIVAYAT_CATALOGUE = catalogue;
})(typeof globalThis !== "undefined" ? globalThis : this, function buildRivayatCatalogue() {
  const sizes = ["S", "M", "L", "XL", "XXL"];
  const stock = { S: 12, M: 18, L: 18, XL: 12, XXL: 8 };
  const gradients = {
    blue: "linear-gradient(135deg,#0e6973,#bad9ce)",
    red: "linear-gradient(135deg,#7b1422,#f2bb16)",
    black: "linear-gradient(135deg,#111111,#565656)",
    white: "linear-gradient(135deg,#e8e6e1,#ffffff)",
    cream: "linear-gradient(135deg,#d9c5a4,#fff8ea)",
    green: "linear-gradient(135deg,#294b3d,#bad9ce)",
    pink: "linear-gradient(135deg,#b94f79,#f5d6df)",
    grey: "linear-gradient(135deg,#4b5157,#d7d9da)"
  };

  function product(id, name, category, color, price, mrp, image, bg, description) {
    return {
      id,
      slug: id,
      name,
      category,
      audience: category === "Women" ? "Women" : category === "Hoodies & Sweats" ? "Unisex" : "Men",
      color,
      badge: "New Arrival",
      mrp,
      price,
      sizes: [...sizes],
      inventory: { ...stock },
      rating: 0,
      reviews: 0,
      description,
      details: [
        "Official RIVAYAT catalogue item",
        "Original supplied product photograph - no recompression",
        "Size and stock are selectable before checkout",
        "Wash separately and follow the garment care label"
      ],
      image,
      gallery: [image],
      sizeChart: {
        S: "Chest 36-38 in",
        M: "Chest 38-40 in",
        L: "Chest 40-42 in",
        XL: "Chest 42-44 in",
        XXL: "Chest 44-46 in"
      },
      variants: [],
      legal: {
        material: "",
        care: "Follow the garment care label",
        manufacturer: "",
        manufacturerAddress: "",
        packer: "",
        packerAddress: "",
        importer: "",
        countryOfOrigin: "",
        netQuantity: "1 garment",
        marketedBy: ""
      },
      bg,
      art: /white|cream/i.test(color) ? "white" : "black",
      type: category === "Half Pants" ? "short" : "full",
      active: true
    };
  }

  return [
    product("india-blue-cricket-jersey", "India Blue Cricket Jersey", "Cricket Jerseys", "Royal Blue", 799, 1299, "/assets/products/final/jerseys/india_blue_cricket_jersey.png", gradients.blue, "A vivid India-inspired blue cricket jersey for match days, watch parties and everyday sport styling."),
    product("rcb-red-blue-cricket-jersey", "Red & Blue Cricket Fan Jersey", "Cricket Jerseys", "Red / Blue", 799, 1299, "/assets/products/final/jerseys/rcb_red_blue_jersey.png", gradients.red, "A high-energy red and blue cricket fan jersey with a relaxed, breathable fit."),
    product("india-white-cricket-jersey", "India White Cricket Jersey", "Cricket Jerseys", "White / Blue", 849, 1399, "/assets/products/final/jerseys/india_white_cricket_jersey.png", gradients.white, "A clean white India-inspired cricket jersey designed for a fresh stadium-to-street look."),

    product("juventus-half-black-white-fan-jersey", "Half Black & White Fan Jersey", "Football Jerseys", "Black / White", 799, 1299, "/assets/products/final/jerseys/juventus_half_black_white_jersey.png", gradients.black, "A graphic half-black, half-white football fan jersey with a bold split design."),
    product("juventus-pink-fan-jersey", "Pink Football Fan Jersey", "Football Jerseys", "Pink", 799, 1299, "/assets/products/final/jerseys/juventus_pink_jersey.png", gradients.pink, "A statement pink football fan jersey that brings club energy into everyday outfits."),
    product("manchester-city-black-fan-jersey", "Black City Football Fan Jersey", "Football Jerseys", "Black", 849, 1399, "/assets/products/final/jerseys/manchester_city_black_jersey.png", gradients.black, "A sleek black football fan jersey with a sharp technical-sport character."),
    product("ac-milan-white-fan-jersey", "White & Red Football Fan Jersey", "Football Jerseys", "White / Red", 799, 1299, "/assets/products/final/jerseys/ac_milan_white_jersey.png", gradients.white, "A white football fan jersey finished with red detailing for a clean match-day look."),
    product("juventus-striped-white-fan-jersey", "Striped White Football Fan Jersey", "Football Jerseys", "White / Black", 849, 1399, "/assets/products/final/jerseys/juventus_striped_white_jersey.png", gradients.white, "A classic striped white football fan jersey with an easy, relaxed silhouette."),
    product("liverpool-red-fan-jersey", "Red Football Fan Jersey", "Football Jerseys", "Red", 849, 1399, "/assets/products/final/jerseys/liverpool_red_jersey.png", gradients.red, "A deep-red football fan jersey made for high-energy match days and street styling."),
    product("ac-milan-red-black-fan-jersey", "Red & Black Football Fan Jersey", "Football Jerseys", "Red / Black", 799, 1299, "/assets/products/final/jerseys/ac_milan_red_black_jersey.png", gradients.red, "A red-and-black striped football fan jersey with a strong throwback attitude."),
    product("white-89-varsity-jersey", "White 89 Varsity Jersey", "Football Jerseys", "White / Black", 749, 1199, "/assets/products/final/jerseys/white-89-sport-jersey.png", gradients.white, "A white number 89 varsity jersey with star sleeve graphics and an oversized sport fit."),
    product("cream-club-sport-jersey", "Cream Club Sport Jersey", "Football Jerseys", "Cream / Navy", 799, 1299, "/assets/products/final/jerseys/cream-club-sport-jersey.png", gradients.cream, "A retro cream club-style football jersey with contrast navy accents."),
    product("cream-navy-club-jersey", "Cream & Navy Club Jersey", "Football Jerseys", "Cream / Navy", 849, 1399, "/assets/products/final/jerseys/cream-navy-club-jersey.png", gradients.cream, "A cream and navy club-style football jersey with a polished heritage finish."),
    product("cream-purple-club-jersey", "Cream & Purple Club Jersey", "Football Jerseys", "Cream / Purple", 799, 1299, "/assets/products/final/jerseys/cream-purple-club-jersey.png", gradients.cream, "A cream and purple fan jersey for playful match-day and casual styling."),
    product("white-heritage-club-jersey", "White Heritage Club Jersey", "Football Jerseys", "White / Black", 799, 1299, "/assets/products/final/jerseys/white-club-jersey.png", gradients.white, "A white heritage-style football jersey with a clean collar and classic contrast details."),

    product("blue-spotted-longline-top", "Blue Spotted Longline Top", "Women", "Indigo Blue", 899, 1499, "/assets/products/final/women/blue_spotted_top.png", gradients.blue, "An easy indigo longline top with a scattered print and relaxed everyday movement."),
    product("red-printed-kurti-set", "Red Printed Kurti Set", "Women", "Red / Ivory", 1299, 2199, "/assets/products/final/women/red_printed_kurti_set.png", gradients.red, "A coordinated red printed kurti look with an expressive traditional-meets-young silhouette."),
    product("white-floral-kurti", "White Floral Kurti", "Women", "White / Multi", 999, 1699, "/assets/products/final/women/white_floral_kurti.png", gradients.white, "A breezy white kurti finished with colourful floral embroidery for everyday occasions."),
    product("sky-blue-crop-hoodie", "Sky Blue Crop Hoodie", "Women", "Sky Blue", 999, 1599, "/assets/products/final/women/sky-crop-hoodie.png", gradients.blue, "A soft sky-blue cropped zip hoodie with an energetic varsity-inspired front."),
    product("grey-cape-sleeve-hoodie", "Grey Cape-Sleeve Hoodie", "Women", "Heather Grey", 899, 1499, "/assets/products/final/women/grey-cape-hoodie.png", gradients.grey, "A playful grey cropped hoodie with wide cape sleeves and an easy layered shape."),
    product("olive-crop-tee", "Olive Crop Tee", "Women", "Olive", 549, 899, "/assets/products/final/women/olive-crop-tee.png", gradients.green, "A minimal olive crop tee with a clean neckline and comfortable everyday drape."),
    product("rust-stripe-crop-polo", "Rust Stripe Crop Polo", "Women", "Ivory / Rust", 649, 999, "/assets/products/final/women/rust-striped-polo.png", gradients.cream, "A vintage-inspired striped crop polo with a rust collar and easy summer energy."),
    product("navy-chicago-crop-tee", "Navy Chicago Crop Tee", "Women", "Navy / White", 649, 999, "/assets/products/final/women/navy-chicago-crop-tee.png", gradients.blue, "A navy cropped sport tee with contrast collar styling and varsity lettering."),
    product("plaid-crop-overshirt", "Plaid Crop Overshirt", "Women", "Black / Tan", 999, 1599, "/assets/products/final/women/plaid-crop-overshirt.png", gradients.black, "A cropped black-and-tan plaid overshirt with volume sleeves and utility pocket detailing."),

    product("layered-plaid-hoodie-shirt", "Layered Plaid Hoodie Shirt", "Hoodies & Sweats", "Mustard / Blue", 1199, 1999, "/assets/products/final/unisex/layered-plaid-hoodie.png", gradients.cream, "A layered plaid shirt-and-hoodie look for easy transitional and winter styling."),
    product("colourblock-zip-hoodie", "Colourblock Zip Hoodie", "Hoodies & Sweats", "Grey / Multi", 1399, 2299, "/assets/products/final/unisex/colourblock-zip-hoodie.png", gradients.grey, "A bold colourblock zip hoodie combining graphic panels with a utility-inspired grey half."),

    product("blue-graphic-twin-short-set", "Blue Graphic Twin-Short Set", "Half Pants", "Sky Blue", 699, 1099, "/assets/products/final/shorts/blue_graphic_shorts_pair.png", gradients.blue, "A coordinated blue graphic short set with a relaxed summer and street-sport feel."),
    product("new-york-blue-graphic-shorts", "New York Blue Graphic Shorts", "Half Pants", "Washed Blue", 649, 999, "/assets/products/final/shorts/new_york_blue_shorts_1.png", gradients.blue, "Washed blue drawstring shorts with oversized New York graphics and an easy fit."),
    product("cherry-blossom-black-shorts", "Cherry Blossom Black Shorts", "Half Pants", "Black / Red", 699, 1099, "/assets/products/final/shorts/cherry_blossom_black_shorts.png", gradients.black, "Black drawstring shorts finished with red cherry blossom graphics."),
    product("black-statement-graphic-shorts", "Black Statement Graphic Shorts", "Half Pants", "Black / White", 649, 999, "/assets/products/final/shorts/black_graphic_shorts.png", gradients.black, "Black street shorts with high-contrast oversized graphic lettering."),

    product("chicago-grey-vneck-tee", "Chicago Grey V-Neck Tee", "T-Shirts", "Grey / White", 649, 999, "/assets/products/final/tshirts/chicago_grey_vneck_tshirt.png", gradients.grey, "A cropped grey V-neck sport tee layered over white sleeves for a varsity look."),
    product("chicago-23-cream-tee", "Chicago 23 Cream Tee", "T-Shirts", "Cream / Red", 699, 1099, "/assets/products/final/tshirts/chicago_23_cream_red_tshirt.png", gradients.cream, "A cream and red number 23 sport tee with an oversized retro silhouette.")
  ];
});
