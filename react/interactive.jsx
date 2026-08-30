import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

const runtime = window.RivayatRuntime || { apiBaseUrl: "https://rivayat.onrender.com" };

function readCatalogue() {
  return Array.isArray(window.RIVAYAT_PRODUCTS) ? window.RIVAYAT_PRODUCTS : [];
}

function safeImageUrl(value) {
  try {
    const url = new URL(String(value || ""), window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function productPath(product) {
  return `#/product/${encodeURIComponent(product.slug || product.id || "")}`;
}

function price(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function localSearch(query) {
  const term = query.toLowerCase();
  return readCatalogue().filter((product) => [product.name, product.category, product.color, product.description]
    .some((value) => String(value || "").toLowerCase().includes(term))).slice(0, 6);
}

function ProductThumb({ product }) {
  const image = safeImageUrl(product.image || product.gallery?.[0]);
  return image
    ? <img className="react-search-thumb" src={image} alt="" loading="lazy" />
    : <span className="react-search-thumb react-search-initials" aria-hidden="true">{String(product.name || "R").slice(0, 1)}</span>;
}

function LiveSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const shellRef = useRef(null);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      return undefined;
    }
    setOpen(true);
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`${runtime.apiBaseUrl}/search?q=${encodeURIComponent(term)}`, { headers: { Accept: "application/json" } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(data.products) || (data.source === "algolia" && !data.products.length)) throw new Error("Search fallback");
        if (!cancelled) setResults(data.products.slice(0, 6));
      } catch {
        if (!cancelled) setResults(localSearch(term));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 240);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!shellRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, []);

  function submit(event) {
    event.preventDefault();
    const term = query.trim();
    if (term) {
      window.dispatchEvent(new CustomEvent("rivayat:search", { detail: { query: term } }));
      setOpen(false);
      window.location.hash = `#/shop?q=${encodeURIComponent(term)}`;
    }
  }

  return <div className="react-search-shell" ref={shellRef}>
    <form className="react-search-form" onSubmit={submit} role="search">
      <span className="react-search-icon" aria-hidden="true">⌕</span>
      <input value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => query.trim() && setOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} placeholder="Search" aria-label="Search RIVAYAT products" />
    </form>
    {open && <div className="react-search-popover" role="listbox" aria-label="Search results">
      {loading && <p className="react-search-status">Searching the RIVAYAT catalogue...</p>}
      {!loading && results.map((product) => <a className="react-search-result" key={product.id || product.slug} href={productPath(product)} onClick={() => setOpen(false)}>
        <ProductThumb product={product} />
        <span className="react-search-result-copy"><strong>{product.name}</strong><small>{product.category || "RIVAYAT"}</small></span>
        <b>{price(product.price)}</b>
      </a>)}
      {!loading && !results.length && <p className="react-search-status">No matching pieces yet.</p>}
      {!loading && <button type="button" className="react-search-all" onClick={() => { const term = query.trim(); if (term) window.dispatchEvent(new CustomEvent("rivayat:search", { detail: { query: term } })); setOpen(false); window.location.hash = `#/shop${term ? `?q=${encodeURIComponent(term)}` : ""}`; }}>View all results</button>}
    </div>}
  </div>;
}

function readCartCount() {
  try {
    const cart = JSON.parse(window.localStorage.getItem("rivayat_cart") || "[]");
    return Array.isArray(cart) ? cart.reduce((sum, item) => sum + Number(item.qty || 0), 0) : 0;
  } catch {
    return 0;
  }
}

function LiveCartBadge() {
  const [count, setCount] = useState(readCartCount());
  useEffect(() => {
    const sync = () => setCount(readCartCount());
    const legacy = document.getElementById("cartCount");
    if (legacy) legacy.hidden = true;
    window.addEventListener("rivayat:state", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("rivayat:state", sync);
      window.removeEventListener("storage", sync);
      if (legacy) legacy.hidden = false;
    };
  }, []);
  return count > 0 ? <span className="react-cart-count">{count}</span> : null;
}

const searchRoot = document.getElementById("reactSearchRoot");
const cartRoot = document.getElementById("reactCartBadgeRoot");
if (searchRoot) createRoot(searchRoot).render(<LiveSearch />);
if (cartRoot) createRoot(cartRoot).render(<LiveCartBadge />);
window.RivayatReactMounted = true;
