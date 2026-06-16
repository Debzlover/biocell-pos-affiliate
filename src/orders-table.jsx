import { useState, useEffect, useCallback } from "react";

const STATUS_MAP = {
  0:  { label: "Pending",            color: "#92806A", bg: "#FAF7F2", dot: "#C4A882" },
  2:  { label: "Shipped",            color: "#1B5FA0", bg: "#EEF5FC", dot: "#4A90D9" },
  3:  { label: "Delivered",          color: "#2D6B35", bg: "#EDF7EE", dot: "#52A85C" },
  4:  { label: "Returning",          color: "#8B5200", bg: "#FEF6EC", dot: "#D4813A" },
  5:  { label: "Returned",           color: "#8B2500", bg: "#FEF0EC", dot: "#D45A3A" },
  6:  { label: "Canceled",           color: "#8B1A1A", bg: "#FCEAEA", dot: "#C94040" },
  9:  { label: "Waiting for Pickup", color: "#4A2FAF", bg: "#F0EFFE", dot: "#7B5EE8" },
  16: { label: "Payment Collected",  color: "#0E5E49", bg: "#E8F7F3", dot: "#28A882" },
};

const STORAGE_TOKEN = 'access_token';

const PAGE_SIZE = 30;

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC_J_L_kJ6VKj0t4GazWCr5laaKXxmxFzI",
  authDomain: "pos-pancake-ed530.firebaseapp.com",
  projectId: "pos-pancake-ed530",
  storageBucket: "pos-pancake-ed530.firebasestorage.app",
  messagingSenderId: "1096528605405",
  appId: "1:1096528605405:web:109b515266a7b22dc82b34",
};

function formatPrice(raw) {
  if (raw == null) return "₱0.00";
  const val = Number(raw) / 100;
  return "₱" + val.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getLatestStatus(statusHistory) {
  if (!statusHistory || statusHistory.length === 0) return null;
  return statusHistory[statusHistory.length - 1]?.status;
}

function getOrderDate(statusHistory) {
  if (!statusHistory || statusHistory.length === 0) return "—";
  const ts = statusHistory[0]?.updated_at;
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function StatusBadge({ code }) {
  const s = STATUS_MAP[code] ?? { label: `Status ${code}`, color: "#92806A", bg: "#FAF7F2", dot: "#C4A882" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 10px 4px 8px",
      borderRadius: 999,
      fontSize: 11.5,
      fontWeight: 600,
      letterSpacing: "0.02em",
      background: s.bg,
      color: s.color,
      whiteSpace: "nowrap",
      border: `1px solid ${s.dot}22`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function ItemsList({ items }) {
  if (!items || items.length === 0) return <span style={{ color: "#B0A898" }}>—</span>;
  return (
    <div>
      {items.map((item, i) => {
        const name = item.variation_info?.name ?? "Item";
        const qty = item.quantity ?? 1;
        return (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: i < items.length - 1 ? 4 : 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#2C2926", flex: 1, lineHeight: 1.4 }}>
              {name}
              {qty > 1 && <span style={{ color: "#92806A", fontWeight: 400 }}> ×{qty}</span>}
            </span>
            <span style={{ fontSize: 13, color: "#6B5F55", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
              {formatPrice(Number(item.variation_info?.retail_price ?? 0) * qty)}
            </span>
          </div>
        );
      })}
      <div style={{
        display: "flex", justifyContent: "space-between",
        marginTop: 8, paddingTop: 8,
        borderTop: "1px dashed #E8E2D9",
        fontSize: 13, fontWeight: 700, color: "#2C2926",
        fontVariantNumeric: "tabular-nums",
      }}>
        <span>Total</span>
        <span>{formatPrice(items.reduce((acc, item) => {
          return acc + Number(item.variation_info?.retail_price ?? 0) * (item.quantity ?? 1);
        }, 0))}</span>
      </div>
    </div>
  );
}

function Spinner({ size = 20, color = "#C4813A" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: "spin 0.7s linear infinite", display: "block" }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#E8E2D9" strokeWidth="2.5" />
      <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray="22 34" strokeLinecap="round" />
    </svg>
  );
}

function OrderCard({ order }) {
  const latestStatus = getLatestStatus(order.status_history);
  const date = getOrderDate(order.status_history);
  const name = order.shipping_address?.full_name ?? "—";
  const phone = order.bill_phone_number ?? order.shipping_address?.phone_number ?? "";
  const address = order.shipping_address?.full_address ?? "—";

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #EDE8E1",
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 10,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      {/* Card header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 14px", background: "#FAF8F5",
        borderBottom: "1px solid #EDE8E1",
      }}>
        <span style={{ fontFamily: "'DM Mono', 'Fira Mono', monospace", fontSize: 13, fontWeight: 600, color: "#92806A", letterSpacing: "0.04em" }}>
          #{order.display_id}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11.5, color: "#B0A898" }}>{date}</span>
          {latestStatus != null && <StatusBadge code={latestStatus} />}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "13px 14px" }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#2C2926", marginBottom: 2 }}>{name}</div>
          {phone && <div style={{ fontSize: 12.5, color: "#92806A" }}>{phone}</div>}
          <div style={{ fontSize: 12.5, color: "#B0A898", marginTop: 3, lineHeight: 1.4 }}>{address}</div>
        </div>

        <div style={{ borderTop: "1px solid #F0EBE3", paddingTop: 10 }}>
          <ItemsList items={order.items} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{
      textAlign: "center", padding: "4rem 2rem",
      color: "#B0A898",
    }}>
      <div style={{ fontSize: 42, marginBottom: 14, opacity: 0.6 }}>📦</div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>{message}</p>
      <p style={{ margin: "6px 0 0", fontSize: 13 }}>Try refreshing or check the affiliate code</p>
    </div>
  );
}

function PageButton({ active, disabled, onClick, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      minWidth: 36, height: 36,
      padding: "0 10px",
      borderRadius: 8,
      border: active ? "none" : "1px solid #EDE8E1",
      background: active ? "#C4813A" : "#FFFFFF",
      color: active ? "#FFFFFF" : disabled ? "#D4CBC0" : "#6B5F55",
      fontWeight: active ? 700 : 500,
      fontSize: 13.5,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.12s",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontFamily: "inherit",
    }}>
      {children}
    </button>
  );
}

export default function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [affParam, setAffParam] = useState(null);

  const totalPages = Math.ceil(totalEntries / PAGE_SIZE) || 1;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAffParam(params.get("aff"));
  }, []);

  useEffect(() => {
    async function initFirebase() {
      try {
        const token = localStorage.getItem(STORAGE_TOKEN);
        if (token) {
          setAccessToken(token);
          setLoading(false);
          return;
        }
        const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
        const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];
        const db = getFirestore(app);
        const tokenDoc = await getDoc(doc(db, "config", "y0vxz2w5M34ScY8MeVOx"));
        if (tokenDoc.exists()) {
          localStorage.setItem(STORAGE_TOKEN, tokenDoc.data().access_token);
          setAccessToken(tokenDoc.data().access_token);
        }
        else setTokenError("Access token not found.");
      } catch (e) {
        setTokenError("Could not connect: " + e.message);
      } finally {
        setLoading(false);
      }
    }
    initFirebase();
  }, []);

  const fetchOrders = useCallback(async (currentPage) => {
    if (!accessToken || !affParam) return;
    setFetching(true);
    setError(null);
    try {
      const url = `https://pos.pancake.vn/api/v1/shops/1636029687/orders/get_orders?access_token=${encodeURIComponent(accessToken)}&page_size=${PAGE_SIZE}&status=-1&page=${currentPage}&updateStatus=inserted_at&editorId=none&option_sort=inserted_at_desc&es_only=true`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ search: `aff=${affParam}` }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json = await res.json();
      setOrders(json.data ?? []);
      setTotalEntries(json.total_entries ?? 0);
    } catch (e) {
      setError("Failed to load orders. " + e.message);
    } finally {
      setFetching(false);
    }
  }, [accessToken, affParam]);

  useEffect(() => {
    if (accessToken && affParam) fetchOrders(page);
  }, [accessToken, affParam, page, fetchOrders]);

  // Loading / error screens
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 14, background: "#F7F4EF" }}>
      <Spinner size={36} />
      <span style={{ color: "#92806A", fontSize: 14 }}>Loading…</span>
    </div>
  );

  if (tokenError) return (
    <div style={{ padding: "2rem", maxWidth: 480, margin: "4rem auto", background: "#FEF0EC", border: "1px solid #F5C6B2", borderRadius: 14, color: "#8B2500", fontSize: 14, lineHeight: 1.6 }}>
      <strong>Connection error</strong><br />{tokenError}
    </div>
  );

  if (!affParam) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F7F4EF", color: "#92806A", fontSize: 14 }}>
      No affiliate code found in URL.
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", fontFamily: "'Inter', 'SF Pro Text', system-ui, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

        /* Desktop table layout */
        .desktop-table { display: none; }
        .mobile-cards { display: block; }

        @media (min-width: 700px) {
          .desktop-table { display: block; }
          .mobile-cards { display: none; }
        }

        .dt { width: 100%; border-collapse: collapse; }
        .dt th {
          padding: 10px 16px;
          background: #F0EBE3;
          color: #92806A;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          text-align: left;
          border-bottom: 1px solid #E4DDD3;
          white-space: nowrap;
        }
        .dt td {
          padding: 13px 16px;
          border-bottom: 1px solid #F0EBE3;
          vertical-align: top;
          font-size: 13.5px;
          color: #2C2926;
        }
        .dt tr:last-child td { border-bottom: none; }
        .dt tbody tr:hover td { background: #FBF9F6; }

        .refresh-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 8px 16px;
          background: #FFFFFF;
          border: 1px solid #E4DDD3;
          border-radius: 10px;
          font-size: 13.5px; font-weight: 600;
          color: #6B5F55;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.1s, border-color 0.1s;
        }
        .refresh-btn:hover { background: #F7F4EF; border-color: #D4CBC0; }
        .refresh-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "#FFFFFF",
        borderBottom: "1px solid #E8E2D9",
        padding: "16px 20px",
        position: "sticky", top: 0, zIndex: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#2C2926", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            Orders
          </h1>
          <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: "#FEF6EC", border: "1px solid #F0D9BB",
              borderRadius: 999, padding: "2px 9px",
              fontSize: 12, fontWeight: 600, color: "#8B5200",
            }}>
              <span style={{ fontFamily: "monospace" }}>{affParam}</span>
            </span>
            {totalEntries > 0 && (
              <span style={{ fontSize: 12.5, color: "#B0A898" }}>
                {totalEntries.toLocaleString()} orders
              </span>
            )}
          </div>
        </div>

        <button className="refresh-btn" onClick={() => fetchOrders(page)} disabled={fetching}>
          {fetching ? <Spinner size={15} color="#C4813A" /> : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          )}
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ margin: "16px 16px 0", padding: "12px 16px", background: "#FEF0EC", border: "1px solid #F5C6B2", borderRadius: 10, fontSize: 13.5, color: "#8B2500", lineHeight: 1.5 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "16px", maxWidth: 1100, margin: "0 auto" }}>

        {/* Mobile cards */}
        <div className="mobile-cards" style={{ position: "relative" }}>
          {fetching && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(247,244,239,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, borderRadius: 14, minHeight: 120 }}>
              <Spinner size={32} />
            </div>
          )}
          {!fetching && orders.length === 0 && !error
            ? <EmptyState message="No orders for this affiliate." />
            : orders.map(order => <OrderCard key={order.id} order={order} />)
          }
        </div>

        {/* Desktop table */}
        <div className="desktop-table">
          <div style={{
            background: "#FFFFFF",
            border: "1px solid #EDE8E1",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            position: "relative",
          }}>
            {fetching && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, borderRadius: 14 }}>
                <Spinner size={36} />
              </div>
            )}

            {!fetching && orders.length === 0 && !error
              ? <EmptyState message="No orders for this affiliate." />
              : (
                <div style={{ overflowX: "auto" }}>
                  <table className="dt">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Address</th>
                        <th>Items</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => {
                        const latestStatus = getLatestStatus(order.status_history);
                        return (
                          <tr key={order.id}>
                            <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5, color: "#92806A", fontWeight: 600, whiteSpace: "nowrap" }}>
                              #{order.display_id}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{order.shipping_address?.full_name ?? "—"}</div>
                              <div style={{ fontSize: 12, color: "#92806A", marginTop: 2 }}>
                                {order.bill_phone_number ?? order.shipping_address?.phone_number ?? ""}
                              </div>
                            </td>
                            <td style={{ maxWidth: 200, fontSize: 13, color: "#92806A", lineHeight: 1.45 }}>
                              {order.shipping_address?.full_address ?? "—"}
                            </td>
                            <td style={{ minWidth: 220 }}>
                              <ItemsList items={order.items} />
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              {latestStatus != null ? <StatusBadge code={latestStatus} /> : "—"}
                            </td>
                            <td style={{ fontSize: 12.5, color: "#B0A898", whiteSpace: "nowrap" }}>
                              {getOrderDate(order.status_history)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap", marginTop: 20 }}>
            <PageButton onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || fetching}>
              ← Prev
            </PageButton>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pg;
              if (totalPages <= 5) pg = i + 1;
              else if (page <= 3) pg = i + 1;
              else if (page >= totalPages - 2) pg = totalPages - 4 + i;
              else pg = page - 2 + i;
              return (
                <PageButton key={pg} active={pg === page} disabled={fetching} onClick={() => setPage(pg)}>
                  {pg}
                </PageButton>
              );
            })}

            {totalPages > 5 && page < totalPages - 2 && (
              <span style={{ color: "#C4BAB0", fontSize: 14 }}>…</span>
            )}
            {totalPages > 5 && (
              <PageButton active={page === totalPages} disabled={fetching} onClick={() => setPage(totalPages)}>
                {totalPages}
              </PageButton>
            )}

            <PageButton onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || fetching}>
              Next →
            </PageButton>
          </div>
        )}

        {totalPages > 1 && (
          <p style={{ textAlign: "center", fontSize: 12.5, color: "#B0A898", margin: "10px 0 0" }}>
            Page {page} of {totalPages}
          </p>
        )}
      </div>
    </div>
  );
}
