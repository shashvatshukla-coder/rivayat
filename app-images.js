const PRODUCT_IMAGE_MAP={
'electric-branch-hoodie':'/assets/products/electric-blue-hoodie.webp',
'flame-track-jacket':'/assets/products/ares-flame-jacket.webp',
'rose-static-panel-hoodie':'/assets/products/rose-noir-hoodie.webp',
'olive-faith-hoodie':'/assets/products/olive-faith-hoodie.webp',
'washed-blue-graphic-hoodie':'/assets/products/washed-blue-graphic-hoodie.webp',
'wave-navy-hoodie':'/assets/products/wave-navy-hoodie.webp',
'web-grey-zip-hoodie':'/assets/products/web-grey-zip-hoodie.webp',
'scarlet-spider-hoodie':'/assets/products/scarlet-spider-hoodie.webp',
'black-spider-zip-hoodie':'/assets/products/black-spider-zip-hoodie.webp',
'espresso-wide-cargo':'/assets/products/espresso-wide-cargo.webp',
'field-olive-utility-cargo':'/assets/products/olive-utility-cargo.webp',
'stone-utility-cargo':'/assets/products/stone-utility-cargo.webp',
'charcoal-city-wide-cargo':'/assets/products/charcoal-wide-cargo.webp',
'black-noir-utility-cargo':'/assets/products/black-utility-cargo.webp',
'sky-stripe-overshirt':'/assets/products/sky-stripe-shirt.webp',
'emerald-check-overshirt':'/assets/products/emerald-check-overshirt.webp',
'smoke-check-shirt':'/assets/products/shadow-check-shirt.webp',
'mint-graffiti-overshirt':'/assets/products/mint-graffiti-jacket.webp',
'alpine-print-overshirt':'/assets/products/alpine-print-overshirt.webp',
'blue-type-overshirt':'/assets/products/blue-script-overshirt.webp',
'block-grid-shirt':'/assets/products/block-grid-shirt.webp',
'split-red-denim-jacket':'/assets/products/split-red-black-jacket.webp',
'rust-utility-overshirt':'/assets/products/rust-utility-overshirt.webp'
};
const __rivayatLoadData=loadData;
loadData=async function(){await __rivayatLoadData();PRODUCTS=PRODUCTS.map(p=>({...p,image:PRODUCT_IMAGE_MAP[p.id]||p.image,gallery:PRODUCT_IMAGE_MAP[p.id]?[PRODUCT_IMAGE_MAP[p.id]]:(p.gallery||[])}));};
media=function(image,alt='',cls=''){if(String(image).startsWith('sprite:')){const [c,r]=image.slice(7).split(',').map(Number);return `<div class="sprite-media ${cls}" role="img" aria-label="${esc(alt)}" style="background-position:${c*25}% ${r*25}%"></div>`}return `<img class="product-img ${cls}" src="${esc(image||'')}" alt="${esc(alt)}" loading="lazy" decoding="async">`};
