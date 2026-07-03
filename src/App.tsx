import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xcwfzuvyigqwrxmtswrd.supabase.co";
const SUPABASE_KEY = "sb_publishable_Jbc5OenfTO8AGUj_nyiA7g_dxJ5BACE";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const WAREHOUSES = ["Ajman Warehouse", "Al Quoz Warehouse", "Head Office"];

const CATEGORIES = {
  BATTERY: { label:"Battery", icon:"🔋", unit:"Pcs", lowThreshold:20, products:["AA","AAA","C","D"] },
  AEROSOL_REFILL: { label:"Aerosol Refill", icon:"🌸", unit:"Pcs", lowThreshold:20, products:["6th Sense","Harmony","Lavende","Odorxpert - Green Forest"] },
  AEROSOL_DISPENSER: { label:"Aerosol Dispenser", icon:"📦", unit:"Pcs", lowThreshold:20, products:["LED White Big","LED Black Small","LCD White","LCD Black"] },
  URINAL: { label:"Urinals", icon:"🚽", unit:"Pcs", lowThreshold:20, products:["Urinal Dispenser","Urinal Pouch"] },
  OIL_COMPONENTS: { label:"Oil Components", icon:"🧪", unit:"Ltrs", lowThreshold:50, products:["DPG","Alcohol"] },
  AROMA_DIFFUSER: { label:"Aroma Diffuser", icon:"🌀", unit:"Pcs", lowThreshold:20, products:["Scent Pro Medium","Scent Pro Large","Scent Pro Small","SC Mini","Hexascent","Nano Smart","Airslim","Airslim Pro","Scent Matrix","Edge","SC Magnet","Smart Small Diffuser","Aeromax Pro 100","Aeromax Pro 200","Aura Car Diffuser","Turbo Diffuser","Ecoscent","Dr. Care 200","Dr. Care 300","Dr. Care 500","Dr. Care 1000","Care Aroma 24/7","Care Aroma Scent Frame","Care Aroma Scentra","Care Aroma Glow Mist","Care Aroma Drive Mist"] },
  PURE_OIL: { label:"Pure Oil", icon:"💧", unit:"Ltrs", lowThreshold:15, products:[] },
  FINISHED_AROMA_OIL: { label:"Finished Aroma Oil", icon:"♻️", unit:"Ltrs", lowThreshold:1, products:[] }
};

const MACHINE_CODE_CATS = ["AEROSOL_DISPENSER", "URINAL", "AROMA_DIFFUSER"];
const MACHINE_CODE_PRODUCTS = { URINAL: ["Urinal Dispenser"] };

function needsMachineCode(categoryKey, productName) {
  if (!MACHINE_CODE_CATS.includes(categoryKey)) return false;
  if (categoryKey === "URINAL") return productName === "Urinal Dispenser";
  return true;
}

const SERVICE_PRODUCT_TYPES = [
  { key:"BATTERY", label:"🔋 Battery", products:["AA","AAA","C","D"], unit:"Pcs" },
  { key:"AEROSOL_REFILL", label:"🌸 Aerosol Refill", products:["6th Sense","Harmony","Lavende","Odorxpert - Green Forest"], unit:"Pcs" },
  { key:"AEROSOL_DISPENSER", label:"📦 Aerosol Dispenser", products:["LED White Big","LED Black Small","LCD White","LCD Black"], unit:"Pcs" },
  { key:"URINAL", label:"🚽 Urinal", products:["Urinal Dispenser","Urinal Pouch"], unit:"Pcs" },
  { key:"OIL_COMPONENTS", label:"🧪 Oil Components", products:["DPG","Alcohol"], unit:"Ltrs" },
  { key:"AROMA_DIFFUSER", label:"🌀 Aroma Diffuser", products:["Scent Pro Medium","Scent Pro Large","Scent Pro Small","SC Mini","Hexascent","Nano Smart","Airslim","Airslim Pro","Scent Matrix","Edge","SC Magnet","Smart Small Diffuser","Aeromax Pro 100","Aeromax Pro 200","Aura Car Diffuser","Turbo Diffuser","Ecoscent","Dr. Care 200","Dr. Care 300","Dr. Care 500","Dr. Care 1000","Care Aroma 24/7","Care Aroma Scent Frame","Care Aroma Scentra","Care Aroma Glow Mist","Care Aroma Drive Mist"], unit:"Pcs" },
  { key:"PURE_OIL", label:"💧 Pure Oil", products:[], unit:"Ltrs" },
  { key:"FINISHED_AROMA_OIL", label:"♻️ Finished Aroma Oil", products:[], unit:"Ltrs" },
];

const TABS = { LOG:"log", CUSTOMERS:"customers", STOCK:"stock", PUREOIL:"pureoil", FINISHEDAROMA:"finishedaroma", PURCHASE:"purchase", TRANSFER:"transfer", RETURNS:"returns", REPORT:"report" };
const LOG_PAGE_SIZE = 10;
const CUSTOMER_PAGE_SIZE = 15;
const LOW_STOCK_PAGE_SIZE = 10;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function thisMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function formatDate(d) {
  if (!d) return "—";
  const clean = String(d).split("T")[0];
  const [year,month,day] = clean.split("-");
  if (!year||!month||!day) return "—";
  return `${day} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(month)-1]} ${year}`;
}

function exportToCSV(filename, headers, rows) {
  const escapeCell = (val) => {
    const s = val===null||val===undefined ? "" : String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g,'""') + '"';
    }
    return s;
  };
  const csvLines = [headers.map(escapeCell).join(",")];
  rows.forEach(row => csvLines.push(row.map(escapeCell).join(",")));
  const csvContent = csvLines.join("\r\n");
  const blob = new Blob(["\ufeff"+csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const emptyProduct = { categoryKey:"BATTERY", productName:"AA", qty:"", machineCodes:[], condition:"new" };
const emptyCustomer = { name:"", location:"", machines:"" };

function ymKey(dateStr) { return String(dateStr).split("T")[0].slice(0,7); }
function dKey(dateStr) { return String(dateStr).split("T")[0]; }
function isAfterMonth(dateStr, monthKey) { return ymKey(dateStr) > monthKey; }
function isInMonth(dateStr, monthKey) { return ymKey(dateStr) === monthKey; }

function computeOpeningClosing({ stock, stockHistory, logs, categoryKey, categoryLabel, products, warehouse, monthKey, baselineDate }) {
  const warehousesToCheck = warehouse === "ALL" ? WAREHOUSES : [warehouse];
  const baselineMonth = baselineDate ? ymKey(baselineDate) : null;

  return products.map(productName => {
    let currentStock = 0;
    warehousesToCheck.forEach(wh => {
      currentStock += Number(stock[wh]?.[categoryKey]?.[productName]) || 0;
    });

    let afterIn = 0, afterOut = 0;
    let duringPurchasesReturns = 0, duringTransferIn = 0, duringTransferOut = 0, duringConsumed = 0;

    const isBeforeBaseline = (dateStr) => baselineDate && dKey(dateStr) < baselineDate;

    stockHistory.forEach(h => {
      if (h.category !== categoryLabel || h.item !== productName) return;
      if (isBeforeBaseline(h.date)) return;
      const inScope = warehousesToCheck.includes(h.warehouse) || (h.type==="transfer" && (warehousesToCheck.includes(h.from)||warehousesToCheck.includes(h.to)));
      if (!inScope) return;

      if (h.type === "transfer") {
        const fromIn = warehousesToCheck.includes(h.from);
        const toIn = warehousesToCheck.includes(h.to);
        let net = 0;
        if (toIn) net += Number(h.qty)||0;
        if (fromIn) net -= Number(h.qty)||0;
        if (isAfterMonth(h.date, monthKey)) {
          if (net > 0) afterIn += net; else afterOut += -net;
        } else if (isInMonth(h.date, monthKey)) {
          if (net > 0) duringTransferIn += net; else duringTransferOut += -net;
        }
      } else {
        const amt = Number(h.received)||0;
        if (isAfterMonth(h.date, monthKey)) {
          afterIn += amt;
        } else if (isInMonth(h.date, monthKey)) {
          duringPurchasesReturns += amt;
        }
      }
    });

    logs.forEach(l => {
      if (!warehousesToCheck.includes(l.warehouse)) return;
      if (isBeforeBaseline(l.date)) return;
      let prods = [];
      try { prods = JSON.parse(l.products||"[]"); } catch {}
      prods.forEach(p => {
        if (p.categoryKey !== categoryKey || p.productName !== productName) return;
        const amt = Number(p.qty)||0;
        if (isAfterMonth(l.date, monthKey)) {
          afterOut += amt;
        } else if (isInMonth(l.date, monthKey)) {
          duringConsumed += amt;
        }
      });
    });

    const closing = currentStock - afterIn + afterOut;
    const netDuringIn = duringPurchasesReturns + duringTransferIn;
    const netDuringOut = duringTransferOut + duringConsumed;
    const opening = closing - netDuringIn + netDuringOut;

    return {
      productName,
      opening: Math.round(opening*100)/100,
      purchasesReturns: Math.round(duringPurchasesReturns*100)/100,
      transferIn: Math.round(duringTransferIn*100)/100,
      transferOut: Math.round(duringTransferOut*100)/100,
      consumed: Math.round(duringConsumed*100)/100,
      closing: Math.round(closing*100)/100,
    };
  });
}

function ReportTab({ logs, customers, stock, stockHistory, pureOilProducts, isAdmin }) {
  const now = new Date();
  const [reportSubTab, setReportSubTab] = useState("stockreport");
  const [dailyReportDate, setDailyReportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reportMonth, setReportMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`);
  const [stockReportMonth, setStockReportMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`);
  const [stockReportWarehouse, setStockReportWarehouse] = useState("ALL");
  const [expandedCustomers, setExpandedCustomers] = useState({});
  const [customerUsageSearch, setCustomerUsageSearch] = useState("");
  const [customerUsagePage, setCustomerUsagePage] = useState(1);
  const CUSTOMER_USAGE_PAGE_SIZE = 15;

  const filtered = useMemo(() => {
    if (!reportMonth) return logs;
    return logs.filter(l => String(l.date).split("T")[0].startsWith(reportMonth));
  }, [logs, reportMonth]);

  const customerUsageList = useMemo(() => {
    const map: Record<string, {visits:number, rows:any[]}> = {};
    filtered.forEach((l:any) => {
      if (!map[l.customer]) map[l.customer] = { visits:0, rows:[] };
      map[l.customer].visits++;
      let prods = [];
      try { prods = JSON.parse(l.products||"[]"); } catch {}
      prods.forEach((p:any) => {
        map[l.customer].rows.push({
          date: l.date,
          category: CATEGORIES[p.categoryKey]?.label || p.categoryKey,
          product: p.productName,
          qty: Number(p.qty)||0,
          unit: CATEGORIES[p.categoryKey]?.unit || "",
        });
      });
    });
    Object.values(map).forEach((d:any) => {
      d.rows.sort((a:any,b:any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
    return Object.entries(map).sort((a,b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const filteredCustomerUsageList = useMemo(() => {
    if (!customerUsageSearch.trim()) return customerUsageList;
    const q = customerUsageSearch.trim().toLowerCase();
    return customerUsageList.filter(([name]) => name.toLowerCase().includes(q));
  }, [customerUsageList, customerUsageSearch]);

  const totalCustomerUsagePages = Math.ceil(filteredCustomerUsageList.length / CUSTOMER_USAGE_PAGE_SIZE) || 1;
  const paginatedCustomerUsageList = filteredCustomerUsageList.slice((customerUsagePage-1)*CUSTOMER_USAGE_PAGE_SIZE, customerUsagePage*CUSTOMER_USAGE_PAGE_SIZE);

  useEffect(() => { setCustomerUsagePage(1); }, [customerUsageSearch, reportMonth]);

  function toggleCustomer(name) {
    setExpandedCustomers(prev => ({ ...prev, [name]: !prev[name] }));
  }

  const PURE_OIL_BASELINE_DATE = "2026-06-12";

  const pureOilReport = useMemo(() => {
    if (reportSubTab !== "stockreport") return [];
    return computeOpeningClosing({
      stock, stockHistory, logs,
      categoryKey: "PURE_OIL", categoryLabel: CATEGORIES.PURE_OIL.label,
      products: pureOilProducts,
      warehouse: stockReportWarehouse,
      monthKey: stockReportMonth,
      baselineDate: PURE_OIL_BASELINE_DATE,
    }).filter(r => r.opening!==0 || r.closing!==0 || r.purchasesReturns!==0 || r.transferIn!==0 || r.transferOut!==0 || r.consumed!==0);
  }, [reportSubTab, stock, stockHistory, logs, pureOilProducts, stockReportWarehouse, stockReportMonth]);

  const PRODUCT_CONSUMPTION_OPTIONS = useMemo(() => {
    const opts = [];
    CATEGORIES.BATTERY.products.forEach(p => opts.push({ categoryKey:"BATTERY", productName:p, label:`🔋 ${p} (Battery)` }));
    CATEGORIES.AEROSOL_REFILL.products.forEach(p => opts.push({ categoryKey:"AEROSOL_REFILL", productName:p, label:`🌸 ${p} (Aerosol Refill)` }));
    opts.push({ categoryKey:"URINAL", productName:"Urinal Pouch", label:"🚽 Urinal Pouch" });
    return opts;
  }, []);

  const [consumptionProductKey, setConsumptionProductKey] = useState(`${PRODUCT_CONSUMPTION_OPTIONS[0]?.categoryKey}|${PRODUCT_CONSUMPTION_OPTIONS[0]?.productName}`);
  const [consumptionMonth, setConsumptionMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`);

  const productConsumptionRows = useMemo(() => {
    if (reportSubTab !== "productconsumption") return [];
    const [catKey, prodName] = consumptionProductKey.split("|");
    const rows = [];
    const list = consumptionMonth ? logs.filter(l => String(l.date).split("T")[0].startsWith(consumptionMonth)) : logs;
    list.forEach(l => {
      let prods = [];
      try { prods = JSON.parse(l.products||"[]"); } catch {}
      prods.forEach((p:any) => {
        if (p.categoryKey===catKey && p.productName===prodName) {
          rows.push({ date:l.date, customer:l.customer, warehouse:l.warehouse, qty:Number(p.qty)||0, technician:l.technician||"" });
        }
      });
    });
    rows.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return rows;
  }, [reportSubTab, consumptionProductKey, consumptionMonth, logs]);

  const productConsumptionTotal = useMemo(() => productConsumptionRows.reduce((s,r)=>s+r.qty,0), [productConsumptionRows]);
  const productConsumptionUnit = useMemo(() => {
    const [catKey] = consumptionProductKey.split("|");
    return CATEGORIES[catKey]?.unit || "";
  }, [consumptionProductKey]);

  return (
    <>
      <div style={{ display:"flex", gap:8, marginBottom:20, borderBottom:"1px solid #2a2000" }}>
        {[
          {key:"stockreport",label:"🧪 Pure Oil Opening/Closing"},
          {key:"customerusage",label:"👥 Customer Usage"},
          {key:"productconsumption",label:"🔋 Battery/Aerosol Consumption"},
          {key:"dailyreport",label:"📋 Daily Activity Report", adminOnly:true},
        ].filter(t => !t.adminOnly || isAdmin).map(t=>(
          <div key={t.key} onClick={()=>setReportSubTab(t.key)} style={{ cursor:"pointer", padding:"10px 18px", fontSize:13, fontWeight:600, color:reportSubTab===t.key?"#f5d060":"#7a6a30", borderBottom:reportSubTab===t.key?"2px solid #f5d060":"2px solid transparent" }}>{t.label}</div>
        ))}
      </div>

      {reportSubTab==="stockreport" && (
      <>
      <div style={{ display:"flex", gap:14, marginBottom:20, alignItems:"flex-end", flexWrap:"wrap" }}>
        <div><label>Select Month</label><input type="month" value={stockReportMonth} onChange={e=>setStockReportMonth(e.target.value)} style={{ width:200 }} /></div>
        <div><label>Warehouse</label>
          <select value={stockReportWarehouse} onChange={e=>setStockReportWarehouse(e.target.value)} style={{ width:200 }}>
            <option value="ALL">All Warehouses</option>
            {WAREHOUSES.map(w=><option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div style={{ marginLeft:"auto", alignSelf:"flex-end", fontSize:13, color:"#7a6a30" }}>{pureOilReport.length} products with movement</div>
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6, flexWrap:"wrap", gap:8 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#f5d060", textTransform:"uppercase", letterSpacing:1 }}>
          🧪 Pure Oil — Opening &amp; Closing Stock — {new Date(stockReportMonth+"-01").toLocaleString("en",{month:"long",year:"numeric"})} — {stockReportWarehouse==="ALL"?"All Warehouses":stockReportWarehouse}
        </div>
        <button className="btn btn-outline" disabled={pureOilReport.length===0} onClick={()=>exportToCSV(
          `pure_oil_opening_closing_${stockReportMonth}_${stockReportWarehouse.replace(/\s+/g,"_")}.csv`,
          ["Product","Opening (Ltrs)","Purchases/Returns (Ltrs)","Transfer In (Ltrs)","Transfer Out (Ltrs)","Consumed (Ltrs)","Closing (Ltrs)"],
          pureOilReport.map((r:any)=>[r.productName,r.opening,r.purchasesReturns,r.transferIn,r.transferOut,r.consumed,r.closing])
        )}>⬇ Download CSV</button>
      </div>
      <div style={{ fontSize:11, color:"#7a6a30", marginBottom:14 }}>
        Opening + Purchases/Returns + Transfer In − Transfer Out − Consumed = Closing. Figures in Litres.
        {stockReportMonth==="2026-06" && <><br/>📌 Opening stock for June 2026 reflects the stock count taken on 12 Jun 2026.</>}
      </div>
      <div style={{ background:"#0f0e00", border:"1px solid #3a2e10", borderRadius:14, overflow:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead style={{ background:"#0a0800", borderBottom:"1px solid #3a2e10" }}>
            <tr>{["#","Product","Opening","Purchases/Returns","Transfer In","Transfer Out","Consumed","Closing"].map(h=><th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {pureOilReport.length===0 && <tr><td colSpan={8} style={{ textAlign:"center", padding:40, color:"#5a4a20", fontSize:13 }}>No stock movement for Pure Oil in this period.</td></tr>}
            {pureOilReport.map((r,i) => (
              <tr key={r.productName} style={{ borderBottom:"1px solid #2a2000" }}>
                <td style={{ color:"#5a4a20" }}>{i+1}</td>
                <td style={{ fontWeight:600, color:"#f5e6b0" }}>{r.productName}</td>
                <td style={{ color:"#c9a84c" }}>{r.opening} Ltrs</td>
                <td style={{ color:"#4ade80" }}>{r.purchasesReturns>0?`+${r.purchasesReturns}`:r.purchasesReturns} Ltrs</td>
                <td style={{ color:"#4ade80" }}>{r.transferIn>0?`+${r.transferIn}`:r.transferIn} Ltrs</td>
                <td style={{ color:"#f97316" }}>{r.transferOut>0?`-${r.transferOut}`:r.transferOut} Ltrs</td>
                <td style={{ color:"#ef4444" }}>{r.consumed>0?`-${r.consumed}`:r.consumed} Ltrs</td>
                <td style={{ color:"#f5d060", fontWeight:700 }}>{r.closing} Ltrs</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}

      {reportSubTab==="customerusage" && (
      <>
      <div style={{ display:"flex", gap:14, marginBottom:20, alignItems:"flex-end", flexWrap:"wrap" }}>
        <div><label>Select Month</label><input type="month" value={reportMonth} onChange={e=>setReportMonth(e.target.value)} style={{ width:200 }} /></div>
        {reportMonth && <button onClick={()=>setReportMonth("")} style={{ cursor:"pointer", background:"transparent", border:"1px solid #c9a84c55", borderRadius:8, color:"#c9a84c", padding:"8px 14px", fontSize:13, fontFamily:"Poppins,sans-serif", fontWeight:600, alignSelf:"flex-end" }}>Show All</button>}
        <div style={{ flex:"1 1 220px", maxWidth:300 }}><label>Search Customer</label><input value={customerUsageSearch} onChange={e=>setCustomerUsageSearch(e.target.value)} placeholder="🔍 Search by customer name..." /></div>
        <div style={{ marginLeft:"auto", alignSelf:"flex-end", fontSize:13, color:"#7a6a30" }}>{filteredCustomerUsageList.length} of {customerUsageList.length} customers</div>
      </div>
      <div style={{ fontSize:14, fontWeight:700, color:"#f5d060", marginBottom:14, textTransform:"uppercase", letterSpacing:1 }}>
        👥 Customer Usage — {reportMonth ? new Date(reportMonth+"-01").toLocaleString("en",{month:"long",year:"numeric"}) : "All Time"}
      </div>
      {filteredCustomerUsageList.length===0 && (
        <div style={{ background:"#0f0e00", border:"1px solid #3a2e10", borderRadius:14, padding:40, textAlign:"center", color:"#5a4a20", fontSize:13 }}>{customerUsageList.length===0 ? "No service log entries found for this period." : "No customers match your search."}</div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {paginatedCustomerUsageList.map(([customerName, data]:[string,any]) => {
          const isOpen = !!expandedCustomers[customerName];
          return (
            <div key={customerName} style={{ background:"#0f0e00", border:"1px solid #3a2e10", borderRadius:14, overflow:"hidden" }}>
              <div onClick={()=>toggleCustomer(customerName)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", cursor:"pointer" }}>
                <div>
                  <span style={{ fontWeight:700, color:"#f5e6b0", fontSize:14 }}>{customerName}</span>
                  <span style={{ marginLeft:10, fontSize:12, color:"#7a6a30" }}>{data.visits} visit{data.visits!==1?"s":""} · {data.rows.length} item{data.rows.length!==1?"s":""} used</span>
                </div>
                <button className="btn btn-outline" style={{ fontSize:12 }} onClick={(e)=>{ e.stopPropagation(); toggleCustomer(customerName); }}>{isOpen ? "▲ Hide Usage" : "▼ Show Usage"}</button>
              </div>
              {isOpen && (
                <div style={{ borderTop:"1px solid #2a2000", padding:"0 18px 14px 18px" }}>
                  <div style={{ display:"flex", justifyContent:"flex-end", padding:"10px 0 6px" }}>
                    <button className="btn btn-outline" style={{ fontSize:11 }} disabled={data.rows.length===0} onClick={()=>exportToCSV(
                      `${customerName.replace(/[^a-z0-9]+/gi,"_")}_usage_${reportMonth||"all_time"}.csv`,
                      ["Date","Category","Product","Used"],
                      data.rows.map((r:any)=>[formatDate(r.date),r.category,r.product,`${r.qty} ${r.unit}`])
                    )}>⬇ Download CSV</button>
                  </div>
                  <div style={{ overflow:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead>
                        <tr>{["Date","Category","Product","Used"].map(h=><th key={h}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {data.rows.length===0 && <tr><td colSpan={4} style={{ textAlign:"center", padding:20, color:"#5a4a20" }}>No products logged for this customer.</td></tr>}
                        {data.rows.map((r:any,i:number) => (
                          <tr key={i}>
                            <td style={{ color:"#d4b96a", whiteSpace:"nowrap" }}>{formatDate(r.date)}</td>
                            <td><span style={{ fontSize:11, background:"#1a1500", color:"#c9a84c", border:"1px solid #3a2e1055", borderRadius:4, padding:"2px 8px" }}>{r.category}</span></td>
                            <td style={{ color:"#c9a84c" }}>{r.product}</td>
                            <td style={{ color:"#f5d060", fontWeight:700 }}>{r.qty} {r.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {filteredCustomerUsageList.length > 0 && totalCustomerUsagePages > 1 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:16, flexWrap:"wrap", gap:10 }}>
          <div style={{ fontSize:12, color:"#7a6a30" }}>
            Showing {(customerUsagePage-1)*CUSTOMER_USAGE_PAGE_SIZE+1}–{Math.min(customerUsagePage*CUSTOMER_USAGE_PAGE_SIZE, filteredCustomerUsageList.length)} of {filteredCustomerUsageList.length}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button className="btn btn-outline" style={{ fontSize:12 }} onClick={()=>setCustomerUsagePage(p=>Math.max(1,p-1))} disabled={customerUsagePage===1}>← Prev</button>
            {Array.from({length:Math.min(5,totalCustomerUsagePages)},(_,i)=>{
              let page = totalCustomerUsagePages<=5 ? i+1 : customerUsagePage<=3 ? i+1 : customerUsagePage>=totalCustomerUsagePages-2 ? totalCustomerUsagePages-4+i : customerUsagePage-2+i;
              return <button key={page} onClick={()=>setCustomerUsagePage(page)} style={{ cursor:"pointer", background:customerUsagePage===page?"linear-gradient(135deg,#f5d060,#c9a84c)":"transparent", color:customerUsagePage===page?"#000":"#c9a84c", border:`1px solid ${customerUsagePage===page?"#c9a84c":"#3a2e10"}`, borderRadius:8, padding:"6px 12px", fontSize:12, fontFamily:"Poppins,sans-serif", fontWeight:600, minWidth:34 }}>{page}</button>;
            })}
            <button className="btn btn-outline" style={{ fontSize:12 }} onClick={()=>setCustomerUsagePage(p=>Math.min(totalCustomerUsagePages,p+1))} disabled={customerUsagePage===totalCustomerUsagePages}>Next →</button>
          </div>
        </div>
      )}
      </>
      )}

      {reportSubTab==="dailyreport" && (() => {
        const W = "Al Quoz Warehouse";
        const dayLogs = logs.filter(l => String(l.date).split("T")[0] === dailyReportDate && l.warehouse === W);
        const dayPurchases = stockHistory.filter(h => h.type==="purchase" && String(h.date).split("T")[0] === dailyReportDate && h.warehouse === W);
        const dayReturns = stockHistory.filter(h => h.type==="return" && String(h.date).split("T")[0] === dailyReportDate && h.warehouse === W);

        // Build per-customer rows
        const customerMap: Record<string, any> = {};
        dayLogs.forEach(l => {
          if (!customerMap[l.customer]) customerMap[l.customer] = {
            technician: l.technician||"—",
            pureOil:[], components:[], battery:[], diffuser:[], finishedOil:[], aerosol:[], urinals:[],
          };
          let prods: any[] = [];
          try { prods = JSON.parse(l.products||"[]"); } catch {}
          prods.forEach((p:any) => {
            const name = p.productName || "?";
            const qty = Number(p.qty)||0;
            const unit = CATEGORIES[p.categoryKey]?.unit||"";
            const entry = `${name} - ${qty} ${unit}`.trim();
            if (p.categoryKey==="PURE_OIL") customerMap[l.customer].pureOil.push(entry);
            else if (p.categoryKey==="OIL_COMPONENTS") customerMap[l.customer].components.push(entry);
            else if (p.categoryKey==="BATTERY") customerMap[l.customer].battery.push(entry);
            else if (p.categoryKey==="AROMA_DIFFUSER") customerMap[l.customer].diffuser.push(`${name} - ${qty}`);
            else if (p.categoryKey==="FINISHED_AROMA_OIL") customerMap[l.customer].finishedOil.push(entry);
            else if (p.categoryKey==="AEROSOL_DISPENSER") customerMap[l.customer].aerosol.push(`${name} - ${qty} Pcs`);
            else if (p.categoryKey==="AEROSOL_REFILL") customerMap[l.customer].aerosol.push(`${name} - ${qty} Pcs (Refill)`);
            else if (p.categoryKey==="URINAL") customerMap[l.customer].urinals.push(entry);
          });
        });
        const customerRows = Object.entries(customerMap);

        // Return rows — customer in h.vendor, technician in h.technician
        const returnRows: any[] = [];
        dayReturns.forEach(h => {
          const custName = (h.vendor && h.vendor.trim()) ? h.vendor : "—";
          const techName = h.technician || "—";
          const entry = `${h.item||"?"} - ${h.received||0} ${h.unit||""}`;
          if (!returnRows.find(r => r.customer === custName)) {
            returnRows.push({ customer: custName, technician: techName, finishedOil:[], diffuser:[], aerosol:[] });
          }
          const row = returnRows.find(r => r.customer === custName);
          if (h.category==="Finished Aroma Oil") row.finishedOil.push(entry);
          else if (h.category==="Aroma Diffuser") row.diffuser.push(entry);
          else if (h.category==="Aerosol Dispenser"||h.category==="Aerosol Refill") row.aerosol.push(entry);
        });

        // Overall consumption — product-wise totals, only if qty > 0
        const consumptionMap: Record<string, {cat:string, qty:number, unit:string}> = {};
        dayLogs.forEach(l => {
          let prods: any[] = [];
          try { prods = JSON.parse(l.products||"[]"); } catch {}
          prods.forEach((p:any) => {
            const key = `${p.categoryKey}||${p.productName}`;
            const qty = Number(p.qty)||0;
            if (qty <= 0 || !p.productName) return;
            if (!consumptionMap[key]) consumptionMap[key] = {
              cat: CATEGORIES[p.categoryKey]?.label||p.categoryKey,
              qty: 0,
              unit: CATEGORIES[p.categoryKey]?.unit||"",
            };
            consumptionMap[key].qty += qty;
          });
        });
        const consumptionRows = Object.entries(consumptionMap)
          .map(([k,v]) => ({ product: k.split("||")[1], ...v }))
          .sort((a,b) => a.cat.localeCompare(b.cat));

        // PDF Generation using browser print
        function generatePDF() {
          const dateLabel = new Date(dailyReportDate+"T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});
          const cell = (txt:string) => `<td style="border:1px solid #000;padding:5px 8px;font-size:12px;vertical-align:top;white-space:pre-wrap;">${txt||""}</td>`;
          const th = (txt:string, w?:string) => `<th style="border:1px solid #000;padding:5px 8px;font-size:12px;background:#f0f0f0;font-weight:bold;${w?`width:${w};`:"}"}">${txt}</th>`;

          let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
          <title>Al Quoz Daily Report - ${dateLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
            h2 { font-size:14px; font-weight:bold; margin:24px 0 8px 0; }
            table { border-collapse:collapse; width:100%; margin-bottom:16px; }
            th,td { border:1px solid #000; padding:5px 8px; font-size:12px; vertical-align:top; }
            th { background:#f0f0f0; font-weight:bold; }
            .title { font-size:16px; font-weight:bold; text-align:center; margin-bottom:4px; }
            .subtitle { font-size:13px; text-align:center; margin-bottom:20px; color:#333; }
            @media print { body { margin:10mm; } }
          </style></head><body>
          <div class="title">AL QUOZ WAREHOUSE — DAILY REPORT</div>
          <div class="subtitle">${dateLabel}</div>

          <h2>1. CUSTOMER CONSUMPTION</h2>
          <table>
            <thead><tr>
              <th style="width:15%">Customer</th>
              <th style="width:12%">Pure Oil</th>
              <th style="width:12%">Components</th>
              <th style="width:10%">Battery</th>
              <th style="width:12%">Diffuser</th>
              <th style="width:13%">Finished Oil</th>
              <th style="width:13%">Aerosol</th>
              <th style="width:8%">Urinals</th>
              <th style="width:5%">Technician</th>
            </tr></thead>
            <tbody>`;

          if (customerRows.length === 0) {
            html += `<tr><td colspan="9" style="text-align:center;color:#666;">No service logs for this date.</td></tr>`;
          } else {
            customerRows.forEach(([cust, d]:any) => {
              html += `<tr>
                ${cell(cust)}
                ${cell(d.pureOil.join("\n"))}
                ${cell(d.components.join("\n"))}
                ${cell(d.battery.join("\n"))}
                ${cell(d.diffuser.join("\n"))}
                ${cell(d.finishedOil.join("\n"))}
                ${cell(d.aerosol.join("\n"))}
                ${cell(d.urinals.join("\n"))}
                ${cell(d.technician)}
              </tr>`;
            });
          }

          html += `</tbody></table>

          <h2>2. RETURN ENTRY</h2>
          <table>
            <thead><tr>
              <th style="width:20%">Customer</th>
              <th style="width:15%">Technician</th>
              <th style="width:22%">Finished Oil</th>
              <th style="width:22%">Diffuser</th>
              <th style="width:21%">Aerosol</th>
            </tr></thead>
            <tbody>`;

          if (returnRows.length === 0) {
            html += `<tr>${cell("No returns")}${cell("")}${cell("")}${cell("")}</tr>`;
          } else {
            returnRows.forEach(r => {
              html += `<tr>${cell(r.customer)}${cell(r.technician||"—")}${cell(r.finishedOil.join("\n") || "—")}${cell(r.diffuser.join("\n") || "—")}${cell(r.aerosol.join("\n") || "—")}</tr>`;
            });
          }

          html += `</tbody></table>

          <h2>3. PURCHASE</h2>
          <table>
            <thead><tr>
              <th style="width:33%">Vendor</th>
              <th style="width:34%">Item Name</th>
              <th style="width:33%">Quantity</th>
            </tr></thead>
            <tbody>`;

          if (dayPurchases.length === 0) {
            html += `<tr>${cell("")}${cell("")}${cell("")}</tr>`;
          } else {
            dayPurchases.forEach((h:any) => {
              html += `<tr>${cell(h.vendor||"—")}${cell(h.item||"?")}${cell(`${h.received||0} ${h.unit||""}`)}</tr>`;
            });
          }

          html += `</tbody></table>

          <h2>4. OVERALL CONSUMPTION</h2>
          <table>
            <thead><tr>
              <th style="width:40%">Category</th>
              <th style="width:40%">Product</th>
              <th style="width:20%">Total Qty</th>
            </tr></thead>
            <tbody>`;

          if (consumptionRows.length === 0) {
            html += `<tr><td colspan="3" style="text-align:center;color:#666;">No consumption recorded for this date.</td></tr>`;
          } else {
            consumptionRows.forEach(r => {
              html += `<tr>${cell(r.cat)}${cell(r.product)}${cell(`${Math.round(r.qty*100)/100} ${r.unit}`)}</tr>`;
            });
          }

          html += `</tbody></table>
          </body></html>`;

          const win = window.open("","_blank","width=900,height=700");
          if (win) {
            win.document.write(html);
            win.document.close();
            setTimeout(()=>{ win.focus(); win.print(); }, 500);
          }
        }

        const dateLabel = new Date(dailyReportDate+"T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});

        return (
          <>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"flex-end", gap:14, marginBottom:20, flexWrap:"wrap" }}>
            <div>
              <label>Select Date</label>
              <input type="date" value={dailyReportDate} onChange={e=>setDailyReportDate(e.target.value)} style={{ width:200 }} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#f5d060", textTransform:"uppercase", letterSpacing:1 }}>
                📋 Al Quoz Warehouse — {dateLabel}
              </div>
              <div style={{ fontSize:11, color:"#7a6a30", marginTop:2 }}>
                {dayLogs.length} service log{dayLogs.length!==1?"s":""} · {customerRows.length} customer{customerRows.length!==1?"s":""} · {dayPurchases.length} purchase{dayPurchases.length!==1?"s":""} · {dayReturns.length} return{dayReturns.length!==1?"s":""}
              </div>
            </div>
            <button className="btn btn-gold" onClick={generatePDF} style={{ display:"flex", alignItems:"center", gap:6 }}>
              🖨 Download PDF
            </button>
          </div>

          {/* SECTION 1: Customer Consumption */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#f5d060", marginBottom:10, letterSpacing:0.5 }}>1. CUSTOMER CONSUMPTION</div>
            <div style={{ background:"#0f0e00", border:"1px solid #3a2e10", borderRadius:12, overflow:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:900 }}>
                <thead style={{ background:"#0a0800" }}>
                  <tr>
                    {["Customer","Pure Oil","Components","Battery","Diffuser","Finished Oil","Aerosol","Urinals","Technician"].map(h=>(
                      <th key={h} style={{ padding:"8px 10px", fontSize:11, color:"#c9a84c", fontWeight:700, borderBottom:"1px solid #3a2e10", borderRight:"1px solid #2a2000", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customerRows.length===0 && (
                    <tr><td colSpan={9} style={{ textAlign:"center", padding:30, color:"#5a4a20", fontSize:13 }}>No service logs for this date.</td></tr>
                  )}
                  {customerRows.map(([cust, d]:any, i:number) => (
                    <tr key={cust} style={{ borderBottom:"1px solid #2a2000", background:i%2===0?"#0a0800":"#0f0e00" }}>
                      <td style={{ padding:"8px 10px", fontSize:11, fontWeight:600, color:"#f5e6b0", borderRight:"1px solid #2a2000", whiteSpace:"nowrap" }}>{cust}</td>
                      {[d.pureOil,d.components,d.battery,d.diffuser,d.finishedOil,d.aerosol,d.urinals].map((arr:string[],ci:number)=>(
                        <td key={ci} style={{ padding:"8px 10px", fontSize:11, color:"#f0e6c0", borderRight:"1px solid #2a2000", verticalAlign:"top" }}>
                          {arr.length===0 ? <span style={{ color:"#3a2e10" }}>—</span> : arr.map((e:string,ei:number)=>(
                            <div key={ei}>{e}</div>
                          ))}
                        </td>
                      ))}
                      <td style={{ padding:"8px 10px", fontSize:11, color:"#a78bfa", whiteSpace:"nowrap" }}>{d.technician}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2: Return Entry */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#f5d060", marginBottom:10, letterSpacing:0.5 }}>2. RETURN ENTRY</div>
            <div style={{ background:"#0f0e00", border:"1px solid #3a2e10", borderRadius:12, overflow:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead style={{ background:"#0a0800" }}>
                  <tr>
                    {["Customer","Technician","Finished Oil","Diffuser","Aerosol"].map(h=>(
                      <th key={h} style={{ padding:"8px 10px", fontSize:11, color:"#c9a84c", fontWeight:700, borderBottom:"1px solid #3a2e10", borderRight:"1px solid #2a2000", textAlign:"left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {returnRows.length===0 ? (
                    <tr>
                      {["","","",""].map((_, i)=>(
                        <td key={i} style={{ padding:"24px 10px", borderRight:"1px solid #2a2000", color:"#3a2e10", textAlign:"center", fontSize:11 }}>{i===0?"No returns":""}</td>
                      ))}
                    </tr>
                  ) : returnRows.map((r,i)=>(
                    <tr key={i} style={{ borderBottom:"1px solid #2a2000" }}>
                      <td style={{ padding:"8px 10px", fontSize:11, fontWeight:600, color:"#f5e6b0", borderRight:"1px solid #2a2000" }}>{r.customer}</td>
                      <td style={{ padding:"8px 10px", fontSize:11, color:"#a78bfa", borderRight:"1px solid #2a2000" }}>{r.technician||"—"}</td>
                      <td style={{ padding:"8px 10px", fontSize:11, color:"#f0e6c0", borderRight:"1px solid #2a2000", verticalAlign:"top" }}>{r.finishedOil.join("\n")||"—"}</td>
                      <td style={{ padding:"8px 10px", fontSize:11, color:"#f0e6c0", borderRight:"1px solid #2a2000", verticalAlign:"top" }}>{r.diffuser.join("\n")||"—"}</td>
                      <td style={{ padding:"8px 10px", fontSize:11, color:"#f0e6c0", verticalAlign:"top" }}>{r.aerosol.join("\n")||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: Purchase */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#f5d060", marginBottom:10, letterSpacing:0.5 }}>3. PURCHASE</div>
            <div style={{ background:"#0f0e00", border:"1px solid #3a2e10", borderRadius:12, overflow:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead style={{ background:"#0a0800" }}>
                  <tr>
                    {["Vendor","Item Name","Quantity"].map(h=>(
                      <th key={h} style={{ padding:"8px 10px", fontSize:11, color:"#c9a84c", fontWeight:700, borderBottom:"1px solid #3a2e10", borderRight:"1px solid #2a2000", textAlign:"left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dayPurchases.length===0 ? (
                    <tr>
                      {["","",""].map((_,i)=>(
                        <td key={i} style={{ padding:"24px 10px", borderRight:"1px solid #2a2000", color:"#3a2e10", textAlign:"center", fontSize:11 }}>{i===0?"No purchases":""}</td>
                      ))}
                    </tr>
                  ) : dayPurchases.map((h:any,i:number)=>(
                    <tr key={i} style={{ borderBottom:"1px solid #2a2000", background:i%2===0?"#0a0800":"#0f0e00" }}>
                      <td style={{ padding:"8px 10px", fontSize:11, color:"#f0e6c0", borderRight:"1px solid #2a2000" }}>{h.vendor||"—"}</td>
                      <td style={{ padding:"8px 10px", fontSize:11, fontWeight:600, color:"#f5e6b0", borderRight:"1px solid #2a2000" }}>{h.item||<span style={{ color:"#f87171" }}>⚠ BLANK</span>}</td>
                      <td style={{ padding:"8px 10px", fontSize:11, color:"#4ade80", fontWeight:700 }}>+{Math.round((h.received||0)*100)/100} {h.unit||""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: Overall Consumption */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#f5d060", marginBottom:6, letterSpacing:0.5 }}>4. OVERALL CONSUMPTION</div>
            <div style={{ fontSize:11, color:"#7a6a30", marginBottom:10 }}>Only products consumed today are shown. Products with 0 usage are excluded.</div>
            <div style={{ background:"#0f0e00", border:"1px solid #3a2e10", borderRadius:12, overflow:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead style={{ background:"#0a0800" }}>
                  <tr>
                    {["Category","Product","Total Qty"].map(h=>(
                      <th key={h} style={{ padding:"8px 10px", fontSize:11, color:"#c9a84c", fontWeight:700, borderBottom:"1px solid #3a2e10", borderRight:"1px solid #2a2000", textAlign:"left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {consumptionRows.length===0 ? (
                    <tr><td colSpan={3} style={{ textAlign:"center", padding:30, color:"#5a4a20", fontSize:13 }}>No consumption recorded for this date.</td></tr>
                  ) : consumptionRows.map((r,i)=>(
                    <tr key={i} style={{ borderBottom:"1px solid #2a2000", background:i%2===0?"#0a0800":"#0f0e00" }}>
                      <td style={{ padding:"8px 10px", fontSize:11, color:"#c9a84c", borderRight:"1px solid #2a2000" }}>{r.cat}</td>
                      <td style={{ padding:"8px 10px", fontSize:11, fontWeight:600, color:"#f5e6b0", borderRight:"1px solid #2a2000" }}>{r.product}</td>
                      <td style={{ padding:"8px 10px", fontSize:11, color:"#f5d060", fontWeight:700 }}>{Math.round(r.qty*100)/100} {r.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
        );
      })()}

            {reportSubTab==="productconsumption" && (
      <>
      <div style={{ display:"flex", gap:14, marginBottom:20, alignItems:"flex-end", flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 260px", maxWidth:340 }}>
          <label>Select Product</label>
          <select value={consumptionProductKey} onChange={e=>setConsumptionProductKey(e.target.value)}>
            {PRODUCT_CONSUMPTION_OPTIONS.map(o => <option key={`${o.categoryKey}|${o.productName}`} value={`${o.categoryKey}|${o.productName}`}>{o.label}</option>)}
          </select>
        </div>
        <div><label>Select Month</label><input type="month" value={consumptionMonth} onChange={e=>setConsumptionMonth(e.target.value)} style={{ width:200 }} /></div>
        {consumptionMonth && <button onClick={()=>setConsumptionMonth("")} style={{ cursor:"pointer", background:"transparent", border:"1px solid #c9a84c55", borderRadius:8, color:"#c9a84c", padding:"8px 14px", fontSize:13, fontFamily:"Poppins,sans-serif", fontWeight:600, alignSelf:"flex-end" }}>Show All</button>}
        <div style={{ marginLeft:"auto", alignSelf:"flex-end", fontSize:13, color:"#7a6a30" }}>{productConsumptionRows.length} log entries</div>
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, flexWrap:"wrap", gap:8 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#f5d060", textTransform:"uppercase", letterSpacing:1 }}>
          Total Consumed: <span style={{ color:"#4ade80" }}>{Math.round(productConsumptionTotal*100)/100} {productConsumptionUnit}</span> — {consumptionMonth ? new Date(consumptionMonth+"-01").toLocaleString("en",{month:"long",year:"numeric"}) : "All Time"}
        </div>
        <button className="btn btn-outline" disabled={productConsumptionRows.length===0} onClick={()=>exportToCSV(
          `${consumptionProductKey.split("|")[1].replace(/[^a-z0-9]+/gi,"_")}_consumption_${consumptionMonth||"all_time"}.csv`,
          ["Date","Customer","Warehouse","Technician","Qty Used"],
          productConsumptionRows.map((r:any)=>[formatDate(r.date),r.customer,r.warehouse,r.technician||"—",`${r.qty} ${productConsumptionUnit}`])
        )}>⬇ Download CSV</button>
      </div>
      <div style={{ background:"#0f0e00", border:"1px solid #3a2e10", borderRadius:14, overflow:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead style={{ background:"#0a0800", borderBottom:"1px solid #3a2e10" }}>
            <tr>{["#","Date","Customer","Warehouse","Technician","Qty Used"].map(h=><th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {productConsumptionRows.length===0 && <tr><td colSpan={6} style={{ textAlign:"center", padding:40, color:"#5a4a20", fontSize:13 }}>No usage found for this product in this period.</td></tr>}
            {productConsumptionRows.map((r:any,i:number) => (
              <tr key={i}>
                <td style={{ color:"#5a4a20" }}>{i+1}</td>
                <td style={{ color:"#d4b96a", whiteSpace:"nowrap" }}>{formatDate(r.date)}</td>
                <td style={{ fontWeight:600, color:"#f5e6b0" }}>{r.customer}</td>
                <td><span className="wh-badge">{r.warehouse||"—"}</span></td>
                <td style={{ color:"#a78bfa" }}>{r.technician||"—"}</td>
                <td style={{ color:"#f5d060", fontWeight:700 }}>{r.qty} {productConsumptionUnit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}
    </>
  );
}


export default function App() {
  const [authRole, setAuthRole] = useState(() => localStorage.getItem("sc_role") || null);
  const [authWarehouse, setAuthWarehouse] = useState(() => localStorage.getItem("sc_warehouse") || null);
  const [loginForm, setLoginForm] = useState({ role:"admin", password:"" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  async function handleLogin() {
    if (!loginForm.password) { setLoginError("Please enter a password."); return; }
    setLoginLoading(true); setLoginError("");
    const { data, error } = await supabase.from("app_roles").select("*").eq("role", loginForm.role).eq("password", loginForm.password).single();
    if (error || !data) {
      setLoginError("Incorrect password. Please try again.");
    } else {
      localStorage.setItem("sc_role", data.role);
      localStorage.setItem("sc_warehouse", data.warehouse || "");
      setAuthRole(data.role);
      setAuthWarehouse(data.warehouse || null);
      window.location.reload();
    }
    setLoginLoading(false);
  }

  function handleLogout() {
    localStorage.removeItem("sc_role");
    localStorage.removeItem("sc_warehouse");
    window.location.reload();
  }

  if (!authRole) {
    return (
      <div style={{ minHeight:"100vh", background:"#050400", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Poppins,sans-serif" }}>
        <div style={{ background:"#0a0800", border:"1px solid #c9a84c", borderRadius:20, padding:"40px 36px", width:"100%", maxWidth:400, boxShadow:"0 20px 60px rgba(0,0,0,0.8)" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:22, fontWeight:800, background:"linear-gradient(135deg,#f5d060,#c9a84c)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:2, textTransform:"uppercase" }}>Scentscircle</div>
            <div style={{ fontSize:11, color:"#c9a84c", marginTop:4, letterSpacing:2, textTransform:"uppercase", opacity:0.7 }}>Warehouse Stock</div>
          </div>
          <div style={{ display:"grid", gap:14 }}>
            <div>
              <label style={{ fontSize:11, color:"#c9a84c", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>Login As</label>
              <select value={loginForm.role} onChange={e=>setLoginForm(f=>({...f,role:e.target.value,password:""}))} style={{ width:"100%", marginTop:6 }}>
                <option value="admin">👑 Admin</option>
                <option value="office">🏢 Head Office</option>
                <option value="warehouse">🏭 Warehouse (Al Quoz)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:"#c9a84c", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>Password</label>
              <input type="password" value={loginForm.password} onChange={e=>setLoginForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Enter password..." style={{ width:"100%", marginTop:6 }} />
            </div>
            {loginError && <div style={{ fontSize:12, color:"#f87171", background:"#2d1515", border:"1px solid #f8717140", borderRadius:8, padding:"8px 12px" }}>{loginError}</div>}
            <button className="btn btn-gold" onClick={handleLogin} disabled={loginLoading} style={{ width:"100%", marginTop:4 }}>{loginLoading?"Checking...":"Login"}</button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = authRole === "admin";
  const isOffice = authRole === "office";
  const isWarehouse = authRole === "warehouse";
  const roleWarehouse = authWarehouse || null;
  const availableWarehouses = roleWarehouse ? [roleWarehouse] : WAREHOUSES;

  const [tab, setTab] = useState(TABS.LOG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState("synced");
  const [lastRefresh, setLastRefresh] = useState(null);

  const [logs, setLogs] = useState([]);
  const [stock, setStock] = useState({});
  const [stockByCondition, setStockByCondition] = useState({});
  const [customers, setCustomers] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [pureOilProducts, setPureOilProducts] = useState([]);
  const [productThresholds, setProductThresholds] = useState({});
  const [technicians, setTechnicians] = useState([]);

  const [selectedWarehouse, setSelectedWarehouse] = useState("Al Quoz Warehouse");
  const [stockFilterWarehouse, setStockFilterWarehouse] = useState(roleWarehouse || "Al Quoz Warehouse");
  const [purchaseFilterWarehouse, setPurchaseFilterWarehouse] = useState(roleWarehouse||"");

  const [showLogForm, setShowLogForm] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [editingHistory, setEditingHistory] = useState(null); // holds purchase history row being edited
  const [historyEditForm, setHistoryEditForm] = useState({ item:"", vendor:"", date:"", received:"" }); // holds the original log being edited
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [serviceDate, setServiceDate] = useState(today());
  const [logWarehouse, setLogWarehouse] = useState(roleWarehouse || "Al Quoz Warehouse");
  const [logProducts, setLogProducts] = useState([{ ...emptyProduct }]);
  const [logNotes, setLogNotes] = useState("");
  const [logTechnician, setLogTechnician] = useState("");

  const [showStockForm, setShowStockForm] = useState(false);
  const [stockForm, setStockForm] = useState({ categoryKey:"BATTERY", productName:"AA", qty:"", dateReceived:today(), vendor:"", warehouse:roleWarehouse||"Al Quoz Warehouse", condition:"new" });

  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [newProductForm, setNewProductForm] = useState({ categoryKey:"BATTERY", productName:"", warehouse:roleWarehouse||"Al Quoz Warehouse" });

  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferForm, setTransferForm] = useState({ fromWarehouse:"Al Quoz Warehouse", toWarehouse:"Ajman Warehouse", categoryKey:"BATTERY", productName:"AA", qty:"", date:today(), condition:"new" });

  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnForm, setReturnForm] = useState({ categoryKey:"FINISHED_AROMA_OIL", warehouse:roleWarehouse||"Al Quoz Warehouse", productName:"", qty:"", date:today(), customer:"", technician:"", notes:"", machineCodes:[] });
  const [returnProductSearch, setReturnProductSearch] = useState("");
  const [stockProductSearch, setStockProductSearch] = useState("");

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerForm, setCustomerForm] = useState({ ...emptyCustomer });
  const [editCustomerId, setEditCustomerId] = useState(null);

  const [filterMonth, setFilterMonth] = useState(thisMonthStr());
  const [filterDate, setFilterDate] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterLogWarehouse, setFilterLogWarehouse] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [lowStockPage, setLowStockPage] = useState(1);
  const [pureOilSearch, setPureOilSearch] = useState("");
  const [pureOilSort, setPureOilSort] = useState("name");
  const [finishedAromaSearch, setFinishedAromaSearch] = useState("");
  const [finishedAromaSort, setFinishedAromaSort] = useState("name");
  const [finishedAromaWarehouse, setFinishedAromaWarehouse] = useState(roleWarehouse || "Al Quoz Warehouse");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, stockRes, customersRes, historyRes, oilsRes, thresholdsRes, techRes] = await Promise.all([
        supabase.from("logs").select("*").order("created_at", { ascending: false }),
        supabase.from("stock").select("*"),
        supabase.from("customers").select("*"),
        supabase.from("stock_history").select("*").order("created_at", { ascending: false }),
        supabase.from("pure_oils").select("*").order("name", { ascending: true }),
        supabase.from("product_thresholds").select("*"),
        supabase.from("technicians").select("*").order("name", { ascending: true }),
      ]);

      if (logsRes.error) throw logsRes.error;
      if (stockRes.error) throw stockRes.error;
      if (customersRes.error) throw customersRes.error;
      if (historyRes.error) throw historyRes.error;
      if (oilsRes.error) throw oilsRes.error;

      const logsData = (logsRes.data || []).map(l => ({
        id: l.id, date: l.date, customer: l.customer, warehouse: l.warehouse || "",
        products: typeof l.products === "string" ? l.products : JSON.stringify(l.products || []),
        notes: l.notes || "", technician: l.technician || "",
      }));

      const stockObj = {};
      const stockByConditionObj = {};
      (stockRes.data || []).forEach(r => {
        const cond = r.condition || "new";
        if (!stockObj[r.warehouse]) stockObj[r.warehouse] = {};
        if (!stockObj[r.warehouse][r.category_key]) stockObj[r.warehouse][r.category_key] = {};
        stockObj[r.warehouse][r.category_key][r.product_name] = (Number(stockObj[r.warehouse][r.category_key][r.product_name])||0) + (Number(r.qty) || 0);

        if (!stockByConditionObj[r.warehouse]) stockByConditionObj[r.warehouse] = {};
        if (!stockByConditionObj[r.warehouse][r.category_key]) stockByConditionObj[r.warehouse][r.category_key] = {};
        if (!stockByConditionObj[r.warehouse][r.category_key][r.product_name]) stockByConditionObj[r.warehouse][r.category_key][r.product_name] = { new:0, used:0 };
        stockByConditionObj[r.warehouse][r.category_key][r.product_name][cond] = Number(r.qty) || 0;
      });

      const customersData = (customersRes.data || []).map(c => ({
        id: c.id, name: c.name, location: c.location || "", machines: c.machines || "",
      }));

      const historyData = (historyRes.data || []).map(h => ({
        id: h.id, date: h.date, warehouse: h.warehouse || "", category: h.category || "",
        item: h.item || "", vendor: h.vendor || "", stockInHand: Math.round((Number(h.stock_in_hand)||0)*100)/100,
        received: Math.round((Number(h.received)||0)*100)/100, closing: Math.round((Number(h.closing)||0)*100)/100, unit: h.unit || "",
        type: h.type || "purchase", from: h.from || "", to: h.to || "", qty: Number(h.qty) || 0,
      }));

      const oilsData = (oilsRes.data || []).map(o => o.name);

      const thresholdsMap = {};
      (thresholdsRes?.data || []).forEach(t => {
        thresholdsMap[`${t.category_key}|${t.product_name}`] = Number(t.threshold);
      });

      const techniciansData = (techRes?.data || []).map(t => t.name);

      setLogs(logsData);
      setStock(stockObj);
      setStockByCondition(stockByConditionObj);
      setCustomers(customersData);
      setStockHistory(historyData);
      setPureOilProducts(oilsData);
      setProductThresholds(thresholdsMap);
      setTechnicians(techniciansData);
      setLastRefresh(new Date());
      setSyncStatus("synced");
    } catch { setSyncStatus("error"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => { if (!saving) fetchData(); }, 120000);
    return () => clearInterval(interval);
  }, [fetchData, saving]);

  async function adjustStockAtomic(rows) {
    const results = [];
    for (const r of rows) {
      const { data, error } = await supabase.rpc("adjust_stock", {
        p_warehouse: r.warehouse, p_category_key: r.categoryKey, p_product_name: r.productName, p_delta: r.delta,
        p_condition: r.condition || "new",
      });
      if (error) throw error;
      results.push({ ...r, newQty: Number(data) });
    }
    return results;
  }

  function getStockQty(categoryKey, productName, warehouse) {
    const wh = warehouse || stockFilterWarehouse;
    const raw = Number(stock[wh]?.[categoryKey]?.[productName]) || 0;
    return Math.round(raw*100)/100;
  }

  function getLowThreshold(categoryKey, productName) {
    const override = productThresholds[`${categoryKey}|${productName}`];
    if (override !== undefined) return override;
    return CATEGORIES[categoryKey]?.lowThreshold ?? 0;
  }

  const NEW_USED_CATEGORIES = ["AROMA_DIFFUSER", "AEROSOL_DISPENSER"];

  function getConditionQty(categoryKey, productName, warehouse, condition) {
    const wh = warehouse || stockFilterWarehouse;
    const raw = Number(stockByCondition[wh]?.[categoryKey]?.[productName]?.[condition]) || 0;
    return Math.round(raw*100)/100;
  }

  const machineCodeStatus = useMemo(() => {
    const events = [];
    logs.forEach(l => {
      let prods = [];
      try { prods = JSON.parse(l.products||"[]"); } catch {}
      prods.forEach(p => {
        (p.machineCodes||[]).forEach(c => {
          const code = (c||"").trim();
          if (code) events.push({ code, date:l.date, ts:l.id||0, type:"given", product:p.productName, who:l.customer });
        });
      });
    });
    stockHistory.forEach(h => {
      (h.machineCodes||[]).forEach(c => {
        const code = (c||"").trim();
        if (code) events.push({ code, date:h.date, ts:h.id||0, type:"returned", product:h.item, who:h.vendor });
      });
    });
    events.sort((a,b) => {
      const d = String(a.date).localeCompare(String(b.date));
      if (d !== 0) return d;
      return (a.ts||0) - (b.ts||0);
    });
    const latestByCode = {};
    events.forEach(e => { latestByCode[e.code] = e; });
    return latestByCode;
  }, [logs, stockHistory]);

  function getLogRowAvailability(idx) {
    const p = logProducts[idx];
    if (!p) return 0;
    const isNewUsed = NEW_USED_CATEGORIES.includes(p.categoryKey);
    const condKey = isNewUsed ? (p.condition||"new") : "new";
    const base = isNewUsed ? getConditionQty(p.categoryKey, p.productName, logWarehouse, condKey) : getStockQty(p.categoryKey, p.productName, logWarehouse);
    // In edit mode: add back what the original log already deducted for this product
    // so the "available" reflects true available if this log's old deduction were reversed
    let oldQtyForThisProduct = 0;
    if (editingLog) {
      const oldProds = (() => { try { return JSON.parse(editingLog.products||"[]"); } catch { return []; } })();
      oldQtyForThisProduct = oldProds
        .filter(op => op.categoryKey === p.categoryKey && op.productName === p.productName &&
          (isNewUsed ? (op.condition||"new") === condKey : true))
        .reduce((s, op) => s + Number(op.qty||0), 0);
    }
    let reserved = 0;
    for (let i = 0; i < idx; i++) {
      const other = logProducts[i];
      if (!other) continue;
      const otherIsNewUsed = NEW_USED_CATEGORIES.includes(other.categoryKey);
      const otherCond = otherIsNewUsed ? (other.condition||"new") : "new";
      if (other.categoryKey === p.categoryKey && other.productName === p.productName && otherCond === condKey) {
        reserved += Number(other.qty||0);
      }
    }
    return Math.round((base + oldQtyForThisProduct - reserved)*100)/100;
  }

  function getProductsForCategory(categoryKey) {
    if (categoryKey==="PURE_OIL") return pureOilProducts;
    return SERVICE_PRODUCT_TYPES.find(c=>c.key===categoryKey)?.products||[];
  }

  const dynamicExtraProducts = useMemo(() => {
    const extras = {};
    Object.values(stock).forEach(catMap => {
      Object.entries(catMap || {}).forEach(([catKey, prodMap]) => {
        const staticList = catKey==="PURE_OIL" ? pureOilProducts : getProductsForCategory(catKey);
        Object.keys(prodMap || {}).forEach(prodName => {
          if (!staticList.includes(prodName)) {
            if (!extras[catKey]) extras[catKey] = [];
            if (!extras[catKey].includes(prodName)) extras[catKey].push(prodName);
          }
        });
      });
    });
    return extras;
  }, [stock, pureOilProducts]);

  const finishedAromaOilByWarehouse = useMemo(() => {
    const map = {};
    WAREHOUSES.forEach(wh => {
      map[wh] = Object.keys(stock[wh]?.FINISHED_AROMA_OIL || {});
    });
    return map;
  }, [stock]);

  function getFinishedAromaOilProducts(warehouse) {
    return finishedAromaOilByWarehouse[warehouse] || [];
  }

  const allLowStockItems = useMemo(() => {
    const items = [];
    Object.entries(CATEGORIES).forEach(([catKey, cat]) => {
      const products = catKey==="PURE_OIL" ? pureOilProducts : catKey==="FINISHED_AROMA_OIL" ? getFinishedAromaOilProducts(stockFilterWarehouse) : [...cat.products, ...(dynamicExtraProducts[catKey]||[])];
      products.forEach(p => {
        const qty = getStockQty(catKey, p, stockFilterWarehouse);
        if (qty < getLowThreshold(catKey, p)) items.push({ category:cat.label, name:p, qty, unit:cat.unit });
      });
    });
    return items;
  }, [stock, pureOilProducts, stockFilterWarehouse, dynamicExtraProducts, productThresholds]);

  const nonPureOilLowStockItems = useMemo(() => allLowStockItems.filter(item => item.category !== CATEGORIES.PURE_OIL.label), [allLowStockItems]);

  const displayedPureOils = useMemo(() => {
    let list = pureOilProducts.map(p => {
      const qty = getStockQty("PURE_OIL", p, stockFilterWarehouse);
      return { name: p, qty, isLow: qty < getLowThreshold("PURE_OIL", p) };
    });
    if (pureOilSearch.trim()) {
      const q = pureOilSearch.trim().toLowerCase();
      list = list.filter(item => item.name.toLowerCase().includes(q));
    }
    if (pureOilSort === "low") list = list.filter(item => item.isLow);
    else if (pureOilSort === "high") list = list.filter(item => !item.isLow);
    list = [...list].sort((a,b) => a.name.localeCompare(b.name));
    return list;
  }, [pureOilProducts, stock, stockFilterWarehouse, pureOilSearch, pureOilSort, productThresholds]);

  const displayedFinishedAromaOils = useMemo(() => {
    const products = getFinishedAromaOilProducts(finishedAromaWarehouse);
    let list = products.map(p => {
      const qty = getStockQty("FINISHED_AROMA_OIL", p, finishedAromaWarehouse);
      return { name: p, qty, isLow: qty < getLowThreshold("FINISHED_AROMA_OIL", p) };
    });
    if (finishedAromaSearch.trim()) {
      const q = finishedAromaSearch.trim().toLowerCase();
      list = list.filter(item => item.name.toLowerCase().includes(q));
    }
    if (finishedAromaWarehouse === "Head Office") {
      if (finishedAromaSort === "low") list = list.filter(item => item.isLow);
      else if (finishedAromaSort === "high") list = list.filter(item => !item.isLow);
    }
    list = [...list].sort((a,b) => a.name.localeCompare(b.name));
    return list;
  }, [stock, finishedAromaWarehouse, finishedAromaSearch, finishedAromaSort, productThresholds]);

  const totalLowStockPages = Math.ceil(nonPureOilLowStockItems.length / LOW_STOCK_PAGE_SIZE);
  const paginatedLowStock = nonPureOilLowStockItems.slice((lowStockPage-1)*LOW_STOCK_PAGE_SIZE, lowStockPage*LOW_STOCK_PAGE_SIZE);

  const filteredLogs = useMemo(() => {
    let list = [...logs];
    if (roleWarehouse) list = list.filter(l => l.warehouse === roleWarehouse);
    if (filterDate) list = list.filter(l => String(l.date).split("T")[0] === filterDate);
    if (filterCustomer) list = list.filter(l => l.customer === filterCustomer);
    if (filterLogWarehouse) list = list.filter(l => l.warehouse === filterLogWarehouse);
    return list;
  }, [logs, filterDate, filterCustomer, filterLogWarehouse, roleWarehouse]);

  const monthLogs = useMemo(() => {
    let list = filterMonth ? logs.filter(l => String(l.date).split("T")[0].startsWith(filterMonth)) : logs;
    if (roleWarehouse) list = list.filter(l => l.warehouse === roleWarehouse);
    return list;
  }, [logs, filterMonth, roleWarehouse]);

  const monthStats = useMemo(() => {
    const stats = { services:monthLogs.length, customers:new Set(monthLogs.map((l:any)=>l.customer)).size };
    const productTotals: Record<string,number> = {};
    monthLogs.forEach((l:any) => {
      try {
        JSON.parse(l.products||"[]").forEach((p:any) => {
          productTotals[p.categoryKey] = (productTotals[p.categoryKey]||0) + Number(p.qty);
        });
      } catch {}
    });
    return { ...stats, productTotals };
  }, [monthLogs]);

  const totalLogPages = Math.ceil(filteredLogs.length / LOG_PAGE_SIZE);
  const paginatedLogs = filteredLogs.slice((logPage-1)*LOG_PAGE_SIZE, logPage*LOG_PAGE_SIZE);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    return customers.filter(c => c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.location?.toLowerCase().includes(customerSearch.toLowerCase()));
  }, [customers, customerSearch]);
  const totalCustomerPages = Math.ceil(filteredCustomers.length / CUSTOMER_PAGE_SIZE);
  const paginatedCustomers = filteredCustomers.slice((customerPage-1)*CUSTOMER_PAGE_SIZE, customerPage*CUSTOMER_PAGE_SIZE);

  const filteredHistory = useMemo(() => {
    let list = stockHistory;
    if (roleWarehouse) list = list.filter(h => h.warehouse === roleWarehouse);
    if (purchaseFilterWarehouse) list = list.filter(h => h.warehouse === purchaseFilterWarehouse);
    return [...list].sort((a,b) => {
      const dateA = new Date(String(a.date).split("T")[0]).getTime();
      const dateB = new Date(String(b.date).split("T")[0]).getTime();
      if (dateB - dateA !== 0) return dateB - dateA;
      return Number(b.id) - Number(a.id);
    });
  }, [stockHistory, purchaseFilterWarehouse]);

  function addLogProduct() { setLogProducts(ps => [...ps, { ...emptyProduct }]); }
  function removeLogProduct(i) { setLogProducts(ps => ps.filter((_,idx)=>idx!==i)); }
  function updateLogProduct(i, field, val) {
    setLogProducts(ps => ps.map((p,idx) => {
      if (idx!==i) return p;
      const updated = { ...p, [field]:val };
      if (field==="categoryKey") {
        const prods = val==="FINISHED_AROMA_OIL" ? getFinishedAromaOilProducts(logWarehouse) : getAllProducts(val);
        updated.productName = prods[0]||"";
        updated.machineCodes = [];
        updated.condition = "new";
      }
      if (field==="productName") updated.machineCodes = [];
      if (field==="qty") {
        const num = parseInt(val)||0;
        if (needsMachineCode(p.categoryKey, field==="productName"?val:p.productName)) {
          const existing = p.machineCodes||[];
          updated.machineCodes = Array.from({length:num}, (_,i) => existing[i]||"");
        }
      }
      return updated;
    }));
  }
  function updateMachineCode(productIdx, codeIdx, val) {
    setLogProducts(ps => ps.map((p,idx) => {
      if (idx!==productIdx) return p;
      const codes = [...(p.machineCodes||[])];
      codes[codeIdx] = val;
      return { ...p, machineCodes:codes };
    }));
  }
  function getAllProducts(categoryKey) {
    if (categoryKey==="PURE_OIL") return pureOilProducts;
    const staticList = getProductsForCategory(categoryKey);
    const extra = dynamicExtraProducts[categoryKey] || [];
    return [...staticList, ...extra];
  }

  async function addNewProduct() {
    const categoryKey = newProductForm.categoryKey;
    const productName = newProductForm.productName.trim();
    if (!productName) { alert("⚠ Please enter a product name before saving."); return; }
    if (categoryKey === "PURE_OIL") {
      if (pureOilProducts.includes(productName)) { alert("This pure oil already exists."); return; }
      setPureOilProducts(p => [...p, productName]);
      try { await supabase.from("pure_oils").insert({ name: productName }); } catch {}
    } else {
      const targetWarehouses = newProductForm.warehouse === "ALL" ? WAREHOUSES : [newProductForm.warehouse];
      const alreadyExists = targetWarehouses.every(wh => Object.keys(stock[wh]?.[categoryKey]||{}).includes(productName));
      if (alreadyExists) { alert("This product already exists in this category for the selected warehouse(s)."); return; }
    }
    setSyncStatus("saving"); setSaving(true);
    try {
      const targetWarehouses = newProductForm.warehouse === "ALL" ? WAREHOUSES : [newProductForm.warehouse];
      const rows = targetWarehouses.map(wh => ({
        warehouse: wh, category_key: categoryKey, product_name: productName, qty: 0, condition: "new",
      }));
      const { error } = await supabase.from("stock").upsert(rows, { onConflict: "warehouse,category_key,product_name,condition" });
      if (error) throw error;
      setStock(prev => {
        const updated = JSON.parse(JSON.stringify(prev));
        targetWarehouses.forEach(wh => {
          if (!updated[wh]) updated[wh] = {};
          if (!updated[wh][categoryKey]) updated[wh][categoryKey] = {};
          if (updated[wh][categoryKey][productName] === undefined) updated[wh][categoryKey][productName] = 0;
        });
        return updated;
      });
      // Also init stockByCondition so availability checks work immediately
      setStockByCondition(prev => {
        const updated = JSON.parse(JSON.stringify(prev));
        targetWarehouses.forEach(wh => {
          if (!updated[wh]) updated[wh] = {};
          if (!updated[wh][categoryKey]) updated[wh][categoryKey] = {};
          if (!updated[wh][categoryKey][productName]) updated[wh][categoryKey][productName] = { new:0, used:0 };
        });
        return updated;
      });
      setSyncStatus("synced");
      setNewProductForm({ categoryKey:"BATTERY", productName:"", warehouse: isAdmin ? "ALL" : (roleWarehouse||"Al Quoz Warehouse") });
      setShowAddProductForm(false);
    } catch (err) {
      setSyncStatus("error");
      alert("⚠ Save Failed!\n\n" + (err?.message||""));
    }
    setSaving(false);
  }

  // Open the log form pre-filled for editing
  function openEditLog(log) {
    let prods = [];
    try { prods = JSON.parse(log.products||"[]"); } catch {}
    // Ensure every product has required fields
    const normalized = prods.map(p => ({
      categoryKey: p.categoryKey || "BATTERY",
      productName: p.productName || "",
      qty: String(p.qty || ""),
      machineCodes: p.machineCodes || [],
      condition: p.condition || "new",
    }));
    setEditingLog(log);
    setSelectedCustomer(log.customer || "");
    setServiceDate(String(log.date).split("T")[0]);
    setLogWarehouse(log.warehouse || (roleWarehouse || "Al Quoz Warehouse"));
    setLogProducts(normalized.length > 0 ? normalized : [{ ...emptyProduct }]);
    setLogNotes(log.notes || "");
    setLogTechnician(log.technician || "");
    setShowLogForm(true);
  }

  // Save an edited log: reverse old stock deductions, apply new ones
  function submitEditLog() {
    if (!selectedCustomer || logProducts.length === 0) return;
    if (!logTechnician) { alert("⚠ Please select the Technician Name before saving."); return; }

    // Same validation as submitLog
    const errors = [];
    const allCodesSeen = {};
    const reservedQty = {};
    logProducts.forEach(p => {
      const isNewUsed = NEW_USED_CATEGORIES.includes(p.categoryKey);
      const condKey = isNewUsed ? (p.condition||"new") : "new";
      const reserveKey = `${p.categoryKey}|${p.productName}|${condKey}`;
      const alreadyReserved = reservedQty[reserveKey] || 0;
      if (!p.qty || Number(p.qty) <= 0) { errors.push(`${p.productName||"(blank)"}: Quantity must be greater than 0.`); }
      if (!p.productName || !p.productName.trim()) { errors.push(`A product row has a blank name. Please select a product.`); }
      // For availability check: add back what OLD log took, then check against new qty
      // We calculate available as current stock + old qty for same product (since old deduction still in DB)
      const oldProds = (() => { try { return JSON.parse(editingLog.products||"[]"); } catch { return []; } })();
      const oldQtyForThisProduct = oldProds
        .filter(op => op.categoryKey === p.categoryKey && op.productName === p.productName &&
          (isNewUsed ? (op.condition||"new") === condKey : true))
        .reduce((s, op) => s + Number(op.qty||0), 0);
      const currentStock = isNewUsed
        ? getConditionQty(p.categoryKey, p.productName, logWarehouse, condKey)
        : getStockQty(p.categoryKey, p.productName, logWarehouse);
      const available = currentStock + oldQtyForThisProduct - alreadyReserved;
      if (p.productName && Number(p.qty) > 0 && Number(p.qty) > available) {
        const cat = CATEGORIES[p.categoryKey];
        errors.push(`${p.productName}: Need ${p.qty} ${cat?.unit} but only ${Math.max(0,available)} ${cat?.unit} available (including the ${oldQtyForThisProduct} currently deducted by this log)`);
      }
      reservedQty[reserveKey] = alreadyReserved + Number(p.qty||0);
      if (p.productName && needsMachineCode(p.categoryKey, p.productName) && Number(p.qty) > 0) {
        const codes = p.machineCodes || [];
        const relevant = Array.from({length: parseInt(p.qty)||0}, (_,ci) => (codes[ci]||"").trim());
        const invalid = relevant.filter(c => !c || c.length !== 9).length;
        if (invalid > 0) errors.push(`${p.productName}: All machine codes must be exactly 9 characters — ${invalid} invalid/missing`);
        const seenInRow = {};
        relevant.forEach(c => {
          if (!c) return;
          if (seenInRow[c]) errors.push(`${p.productName}: Duplicate machine code "${c}"`);
          seenInRow[c] = true;
          if (allCodesSeen[c]) errors.push(`Machine code "${c}" used more than once`);
          allCodesSeen[c] = p.productName;
        });
        // Only block on machine code if it's given to SOMEONE ELSE (not this same log)
        relevant.forEach(c => {
          if (!c) return;
          const latest = machineCodeStatus[c];
          if (latest && latest.type === "given" && latest.who !== editingLog.customer) {
            errors.push(`Machine code "${c}" is currently out with "${latest.who}" and hasn't been returned.`);
          }
        });
      }
    });
    if (errors.length > 0) { alert("⚠ Cannot Save!\n\n" + [...new Set(errors)].join("\n")); return; }

    setSyncStatus("saving"); setSaving(true);
    (async () => {
      try {
        const oldProds = (() => { try { return JSON.parse(editingLog.products||"[]"); } catch { return []; } })();

        // Step 1: Reverse OLD stock deductions (add back what was taken)
        const reverseRows = oldProds
          .filter(p => p.productName && Number(p.qty) > 0)
          .map(p => ({
            warehouse: editingLog.warehouse,
            categoryKey: p.categoryKey,
            productName: p.productName,
            delta: Number(p.qty), // positive = put back
            condition: NEW_USED_CATEGORIES.includes(p.categoryKey) ? (p.condition||"new") : "new",
          }));
        if (reverseRows.length > 0) await adjustStockAtomic(reverseRows);

        // Step 2: Apply NEW stock deductions
        const newRows = logProducts
          .filter(p => p.productName && Number(p.qty) > 0)
          .map(p => ({
            warehouse: logWarehouse,
            categoryKey: p.categoryKey,
            productName: p.productName,
            delta: -Number(p.qty),
            condition: NEW_USED_CATEGORIES.includes(p.categoryKey) ? (p.condition||"new") : "new",
          }));
        if (newRows.length > 0) await adjustStockAtomic(newRows);

        // Step 3: Update the log record in DB
        const { error } = await supabase.from("logs").update({
          date: serviceDate,
          customer: selectedCustomer,
          warehouse: logWarehouse,
          products: logProducts,
          notes: logNotes || null,
          technician: logTechnician || null,
        }).eq("id", editingLog.id);
        if (error) throw error;

        // Step 4: Update local logs state
        const updatedLog = {
          ...editingLog,
          date: serviceDate,
          customer: selectedCustomer,
          warehouse: logWarehouse,
          products: JSON.stringify(logProducts),
          notes: logNotes,
          technician: logTechnician,
        };
        setLogs(ls => ls.map(l => l.id === editingLog.id ? updatedLog : l));

        // Step 5: Refresh stock from DB to get authoritative values
        await fetchData();

        setSyncStatus("synced");
        setEditingLog(null);
        setSelectedCustomer(""); setLogProducts([{...emptyProduct}]); setLogNotes(""); setLogTechnician("");
        setShowLogForm(false);
        alert("✓ Log updated successfully. Stock has been adjusted.");
      } catch (err) {
        setSyncStatus("error");
        alert("⚠ Update Failed! Stock may be in an inconsistent state — please refresh and verify.\n\n" + (err?.message||""));
      }
      setSaving(false);
    })();
  }

  function submitLog() {
    if (!selectedCustomer || logProducts.length===0) return;
    if (!logTechnician) { alert("⚠ Please select the Technician Name before saving."); return; }
    const errors = [];
    const allCodesSeen = {};
    const reservedQty = {};
    logProducts.forEach(p => {
      const isNewUsed = NEW_USED_CATEGORIES.includes(p.categoryKey);
      const condKey = isNewUsed ? (p.condition||"new") : "new";
      const reserveKey = `${p.categoryKey}|${p.productName}|${condKey}`;
      const alreadyReserved = reservedQty[reserveKey] || 0;
      const available = (isNewUsed ? getConditionQty(p.categoryKey, p.productName, logWarehouse, condKey) : getStockQty(p.categoryKey, p.productName, logWarehouse)) - alreadyReserved;
      if (!p.qty || Number(p.qty) <= 0) {
        errors.push(`${p.productName}: Quantity must be greater than 0.`);
      }
      if (Number(p.qty) > available) {
        const cat = CATEGORIES[p.categoryKey];
        const condLabel = isNewUsed ? ` (${condKey==="used"?"Used":"New"})` : "";
        errors.push(`${p.productName}${condLabel}: Need ${p.qty} ${cat?.unit} but only ${Math.max(0,available)} available`);
      }
      reservedQty[reserveKey] = alreadyReserved + Number(p.qty||0);
      if (needsMachineCode(p.categoryKey, p.productName) && Number(p.qty) > 0) {
        const codes = p.machineCodes || [];
        const relevant = Array.from({length: parseInt(p.qty)||0}, (_,ci) => (codes[ci]||"").trim());
        const invalid = relevant.filter(c => !c || c.length !== 9).length;
        if (invalid > 0) errors.push(`${p.productName}: All machine codes must be exactly 9 characters — ${invalid} invalid/missing`);
        const seenInRow = {};
        relevant.forEach(c => {
          if (!c) return;
          if (seenInRow[c]) errors.push(`${p.productName}: Duplicate machine code "${c}"`);
          seenInRow[c] = true;
        });
        relevant.forEach(c => {
          if (!c) return;
          if (allCodesSeen[c]) errors.push(`Machine code "${c}" used more than once`);
          allCodesSeen[c] = p.productName;
        });
        relevant.forEach(c => {
          if (!c) return;
          const latest = machineCodeStatus[c];
          if (latest && latest.type === "given") {
            errors.push(`Machine code "${c}" is currently out with "${latest.who}" and hasn't been returned.`);
          }
        });
      }
    });
    if (errors.length > 0) { alert("⚠ Cannot Save!\n\n" + [...new Set(errors)].join("\n")); return; }
    const entry = { id:Date.now(), date:serviceDate, customer:selectedCustomer, warehouse:logWarehouse, products:JSON.stringify(logProducts), notes:logNotes, technician:logTechnician };
    setSyncStatus("saving"); setSaving(true);
    (async () => {
      try {
        const { error: logErr } = await supabase.from("logs").insert({
          id: entry.id, date: entry.date, customer: entry.customer, warehouse: entry.warehouse,
          products: JSON.parse(entry.products), notes: entry.notes || null, technician: entry.technician || null,
        });
        if (logErr) throw logErr;

        const deltaRows = logProducts.map(p => ({
          warehouse: logWarehouse, categoryKey: p.categoryKey, productName: p.productName, delta: -Number(p.qty||0),
          condition: NEW_USED_CATEGORIES.includes(p.categoryKey) ? (p.condition||"new") : "new",
        }));
        const results = await adjustStockAtomic(deltaRows);

        setStockByCondition(prev => {
          const updated = JSON.parse(JSON.stringify(prev));
          if (!updated[logWarehouse]) updated[logWarehouse] = {};
          results.forEach(r => {
            if (!updated[logWarehouse][r.categoryKey]) updated[logWarehouse][r.categoryKey] = {};
            if (!updated[logWarehouse][r.categoryKey][r.productName]) updated[logWarehouse][r.categoryKey][r.productName] = { new:0, used:0 };
            updated[logWarehouse][r.categoryKey][r.productName][r.condition] = r.newQty;
          });
          return updated;
        });
        setStock(prev => {
          const updated = JSON.parse(JSON.stringify(prev));
          if (!updated[logWarehouse]) updated[logWarehouse] = {};
          results.forEach(r => {
            if (!updated[logWarehouse][r.categoryKey]) updated[logWarehouse][r.categoryKey] = {};
            if (NEW_USED_CATEGORIES.includes(r.categoryKey)) {
              const newCond = r.condition === "new" ? r.newQty : (stockByCondition[logWarehouse]?.[r.categoryKey]?.[r.productName]?.new || 0);
              const usedCond = r.condition === "used" ? r.newQty : (stockByCondition[logWarehouse]?.[r.categoryKey]?.[r.productName]?.used || 0);
              updated[logWarehouse][r.categoryKey][r.productName] = newCond + usedCond;
            } else {
              updated[logWarehouse][r.categoryKey][r.productName] = r.newQty;
            }
          });
          return updated;
        });
        setLogs(l => [entry, ...l]);
        setSyncStatus("synced");
        setSelectedCustomer(""); setLogProducts([{...emptyProduct}]); setLogNotes(""); setLogTechnician(""); setShowLogForm(false);
      } catch (err) {
        setSyncStatus("error");
        alert("⚠ Save Failed!\n\n" + (err?.message||""));
      }
      setSaving(false);
    })();
  }

  function submitStock() {
    if (!stockForm.productName || !stockForm.productName.trim()) {
      alert("⚠ Please select a product before saving.");
      return;
    }
    if (!stockForm.qty || Number(stockForm.qty)<=0) {
      alert("⚠ Please enter a valid quantity greater than 0.");
      return;
    }
    const cat = CATEGORIES[stockForm.categoryKey];
    const addQty = Number(stockForm.qty);
    const isNewUsed = NEW_USED_CATEGORIES.includes(stockForm.categoryKey);
    const condition = isNewUsed ? (stockForm.condition||"new") : "new";
    const prevQtyForLog = isNewUsed ? getConditionQty(stockForm.categoryKey, stockForm.productName, stockForm.warehouse, condition) : getStockQty(stockForm.categoryKey, stockForm.productName, stockForm.warehouse);
    const historyEntry = { id:Date.now(), date:stockForm.dateReceived, warehouse:stockForm.warehouse, category:cat?.label||stockForm.categoryKey, item:stockForm.productName, vendor:stockForm.vendor, stockInHand:prevQtyForLog, received:addQty, closing:prevQtyForLog+addQty, unit:cat?.unit||"Pcs", type:"purchase", condition };
    setSyncStatus("saving"); setSaving(true);
    (async () => {
      try {
        const [result] = await adjustStockAtomic([{ warehouse:stockForm.warehouse, categoryKey:stockForm.categoryKey, productName:stockForm.productName, delta:addQty, condition }]);
        const { error } = await supabase.from("stock_history").insert({
          id: historyEntry.id, date: historyEntry.date, warehouse: historyEntry.warehouse,
          category: historyEntry.category, item: historyEntry.item, vendor: historyEntry.vendor || null,
          stock_in_hand: result.newQty - addQty, received: addQty, closing: result.newQty,
          unit: historyEntry.unit, type: historyEntry.type, condition: historyEntry.condition,
        });
        if (error) throw error;
        if (isNewUsed) {
          setStockByCondition(prev => {
            const updated = JSON.parse(JSON.stringify(prev));
            if (!updated[stockForm.warehouse]) updated[stockForm.warehouse] = {};
            if (!updated[stockForm.warehouse][stockForm.categoryKey]) updated[stockForm.warehouse][stockForm.categoryKey] = {};
            if (!updated[stockForm.warehouse][stockForm.categoryKey][stockForm.productName]) updated[stockForm.warehouse][stockForm.categoryKey][stockForm.productName] = { new:0, used:0 };
            updated[stockForm.warehouse][stockForm.categoryKey][stockForm.productName][condition] = result.newQty;
            return updated;
          });
          setStock(prev => {
            const updated = JSON.parse(JSON.stringify(prev));
            if (!updated[stockForm.warehouse]) updated[stockForm.warehouse] = {};
            if (!updated[stockForm.warehouse][stockForm.categoryKey]) updated[stockForm.warehouse][stockForm.categoryKey] = {};
            const otherCond = condition === "new" ? "used" : "new";
            const otherQty = stockByCondition[stockForm.warehouse]?.[stockForm.categoryKey]?.[stockForm.productName]?.[otherCond] || 0;
            updated[stockForm.warehouse][stockForm.categoryKey][stockForm.productName] = result.newQty + otherQty;
            return updated;
          });
        } else {
          setStock(prev => {
            const updated = JSON.parse(JSON.stringify(prev));
            if (!updated[stockForm.warehouse]) updated[stockForm.warehouse] = {};
            if (!updated[stockForm.warehouse][stockForm.categoryKey]) updated[stockForm.warehouse][stockForm.categoryKey] = {};
            updated[stockForm.warehouse][stockForm.categoryKey][stockForm.productName] = result.newQty;
            return updated;
          });
        }
        setStockHistory(h => [{ ...historyEntry, stockInHand: result.newQty - addQty, closing: result.newQty }, ...h]);
        setSyncStatus("synced");
        setStockForm({ categoryKey:"BATTERY", productName:"AA", qty:"", dateReceived:today(), vendor:"", warehouse:roleWarehouse||"Al Quoz Warehouse", condition:"new" });
        setStockProductSearch("");
        setShowStockForm(false);
      } catch (err) {
        setSyncStatus("error");
        alert("⚠ Save Failed!\n\n" + (err?.message||""));
      }
      setSaving(false);
    })();
  }

  function submitTransfer() {
    if (!transferForm.qty || Number(transferForm.qty)<=0) return;
    if (transferForm.fromWarehouse === transferForm.toWarehouse) { alert("From and To warehouse cannot be the same!"); return; }
    const from = transferForm.fromWarehouse;
    const to = transferForm.toWarehouse;
    const catKey = transferForm.categoryKey;
    const prod = transferForm.productName;
    const qty = Number(transferForm.qty);
    const isNewUsed = NEW_USED_CATEGORIES.includes(catKey);
    const condition = isNewUsed ? (transferForm.condition||"new") : "new";
    const available = isNewUsed ? getConditionQty(catKey, prod, from, condition) : getStockQty(catKey, prod, from);
    if (qty > available) { alert(`⚠ Only ${available} available in ${from}.`); return; }
    const transferEntry = { id:Date.now(), date:transferForm.date, type:"transfer", from, to, category:CATEGORIES[catKey]?.label||catKey, item:prod, qty, unit:CATEGORIES[catKey]?.unit||"Pcs", condition };
    setSyncStatus("saving"); setSaving(true);
    (async () => {
      try {
        const results = await adjustStockAtomic([
          { warehouse:from, categoryKey:catKey, productName:prod, delta:-qty, condition },
          { warehouse:to, categoryKey:catKey, productName:prod, delta:qty, condition },
        ]);
        const { error } = await supabase.from("stock_history").insert({
          id: transferEntry.id, date: transferEntry.date, type: "transfer",
          from: transferEntry.from, to: transferEntry.to, category: transferEntry.category,
          item: transferEntry.item, qty: transferEntry.qty, unit: transferEntry.unit, condition: transferEntry.condition,
        });
        if (error) throw error;
        if (isNewUsed) {
          setStockByCondition(prev => {
            const updated = JSON.parse(JSON.stringify(prev));
            results.forEach(r => {
              if (!updated[r.warehouse]) updated[r.warehouse] = {};
              if (!updated[r.warehouse][r.categoryKey]) updated[r.warehouse][r.categoryKey] = {};
              if (!updated[r.warehouse][r.categoryKey][r.productName]) updated[r.warehouse][r.categoryKey][r.productName] = { new:0, used:0 };
              updated[r.warehouse][r.categoryKey][r.productName][condition] = r.newQty;
            });
            return updated;
          });
          setStock(prev => {
            const updated = JSON.parse(JSON.stringify(prev));
            results.forEach(r => {
              if (!updated[r.warehouse]) updated[r.warehouse] = {};
              if (!updated[r.warehouse][r.categoryKey]) updated[r.warehouse][r.categoryKey] = {};
              const otherCond = condition === "new" ? "used" : "new";
              const otherQty = stockByCondition[r.warehouse]?.[r.categoryKey]?.[r.productName]?.[otherCond] || 0;
              updated[r.warehouse][r.categoryKey][r.productName] = r.newQty + otherQty;
            });
            return updated;
          });
        } else {
          setStock(prev => {
            const updated = JSON.parse(JSON.stringify(prev));
            results.forEach(r => {
              if (!updated[r.warehouse]) updated[r.warehouse] = {};
              if (!updated[r.warehouse][r.categoryKey]) updated[r.warehouse][r.categoryKey] = {};
              updated[r.warehouse][r.categoryKey][r.productName] = r.newQty;
            });
            return updated;
          });
        }
        setStockHistory(h => [transferEntry, ...h]);
        setSyncStatus("synced");
        setShowTransferForm(false);
        setTransferForm({ fromWarehouse:"Al Quoz Warehouse", toWarehouse:"Ajman Warehouse", categoryKey:"BATTERY", productName:"AA", qty:"", date:today(), condition:"new" });
      } catch (err) {
        setSyncStatus("error");
        alert("⚠ Transfer Failed!\n\n" + (err?.message||""));
      }
      setSaving(false);
    })();
  }

  function submitReturn() {
    if (!returnForm.customer) { alert("⚠ Please select a Customer before saving."); return; }
    if (!returnForm.technician) { alert("⚠ Please select a Technician before saving."); return; }
    if (!returnForm.productName) { alert("⚠ Please select or add a product first."); return; }
    if (!returnForm.qty || Number(returnForm.qty)<=0) { alert("⚠ Please enter a valid quantity."); return; }
    const wh = returnForm.warehouse;
    const catKey = returnForm.categoryKey;
    const prod = returnForm.productName;
    const qty = Number(returnForm.qty);
    const isNewUsed = NEW_USED_CATEGORIES.includes(catKey);
    const condition = isNewUsed ? "used" : "new";
    if (isNewUsed) {
      const codes = returnForm.machineCodes || [];
      const relevant = Array.from({length: Math.floor(qty)||0}, (_,ci) => (codes[ci]||"").trim());
      const invalid = relevant.filter(c => !c || c.length !== 9).length;
      if (invalid > 0) { alert(`⚠ Please enter all machine codes (exactly 9 characters each).`); return; }
      const seen = {};
      for (const c of relevant) {
        if (seen[c]) { alert(`⚠ Duplicate machine code "${c}".`); return; }
        seen[c] = true;
      }
      const suspicious = relevant.filter(c => c && (!machineCodeStatus[c] || machineCodeStatus[c].type !== "given"));
      if (suspicious.length > 0) {
        const proceed = confirm(`⚠ Code(s) ${suspicious.join(", ")} don't show as "given out". Continue anyway?`);
        if (!proceed) return;
      }
    }
    setSyncStatus("saving"); setSaving(true);
    (async () => {
      try {
        const [result] = await adjustStockAtomic([{ warehouse:wh, categoryKey:catKey, productName:prod, delta:qty, condition }]);
        const returnEntry = { id:Date.now(), date:returnForm.date, warehouse:wh, category:CATEGORIES[catKey]?.label||catKey, item:prod, vendor:returnForm.customer||"", customer:returnForm.customer||"", technician:returnForm.technician||"", stockInHand:result.newQty-qty, received:qty, closing:result.newQty, unit:CATEGORIES[catKey]?.unit||"Ltrs", type:"return", condition, machineCodes:isNewUsed?returnForm.machineCodes:undefined };
        const { error } = await supabase.from("stock_history").insert({
          id: returnEntry.id, date: returnEntry.date, warehouse: returnEntry.warehouse,
          category: returnEntry.category, item: returnEntry.item, vendor: returnEntry.vendor || null,
          stock_in_hand: returnEntry.stockInHand, received: returnEntry.received, closing: returnEntry.closing,
          unit: returnEntry.unit, type: returnEntry.type, condition: returnEntry.condition,
          machine_codes: isNewUsed ? returnForm.machineCodes : null,
        });
        if (error) throw error;
        if (isNewUsed) {
          setStockByCondition(prev => {
            const updated = JSON.parse(JSON.stringify(prev));
            if (!updated[wh]) updated[wh] = {};
            if (!updated[wh][catKey]) updated[wh][catKey] = {};
            if (!updated[wh][catKey][prod]) updated[wh][catKey][prod] = { new:0, used:0 };
            updated[wh][catKey][prod][condition] = result.newQty;
            return updated;
          });
          setStock(prev => {
            const updated = JSON.parse(JSON.stringify(prev));
            if (!updated[wh]) updated[wh] = {};
            if (!updated[wh][catKey]) updated[wh][catKey] = {};
            const newQty = stockByCondition[wh]?.[catKey]?.[prod]?.new || 0;
            updated[wh][catKey][prod] = newQty + result.newQty;
            return updated;
          });
        } else {
          setStock(prev => {
            const updated = JSON.parse(JSON.stringify(prev));
            if (!updated[wh]) updated[wh] = {};
            if (!updated[wh][catKey]) updated[wh][catKey] = {};
            updated[wh][catKey][prod] = result.newQty;
            return updated;
          });
        }
        setStockHistory(h => [returnEntry, ...h]);
        setSyncStatus("synced");
        setShowReturnForm(false);
        setReturnForm({ categoryKey:"FINISHED_AROMA_OIL", warehouse:roleWarehouse||"Al Quoz Warehouse", productName:"", qty:"", date:today(), customer:"", technician:"", notes:"", machineCodes:[] });
        setReturnProductSearch("");
      } catch (err) {
        setSyncStatus("error");
        alert("⚠ Return Save Failed!\n\n" + (err?.message||""));
      }
      setSaving(false);
    })();
  }

  function saveCustomer() {
    if (!customerForm.name.trim()) return;
    setSyncStatus("saving"); setSaving(true);
    if (editCustomerId!==null) {
      const updatedCustomer = { ...customerForm, id:editCustomerId };
      setCustomers(cs => cs.map(c => c.id===editCustomerId ? updatedCustomer : c));
      (async () => {
        try {
          const { error } = await supabase.from("customers").update({
            name: updatedCustomer.name, location: updatedCustomer.location || null, machines: updatedCustomer.machines || null,
          }).eq("id", editCustomerId);
          if (error) throw error;
          setSyncStatus("synced");
        } catch { setSyncStatus("error"); }
        setSaving(false);
      })();
      setEditCustomerId(null);
    } else {
      const newCustomer = { ...customerForm, id:Date.now() };
      setCustomers(cs => [...cs, newCustomer]);
      (async () => {
        try {
          const { error } = await supabase.from("customers").insert({
            id: newCustomer.id, name: newCustomer.name, location: newCustomer.location || null, machines: newCustomer.machines || null,
          });
          if (error) throw error;
          setSyncStatus("synced");
        } catch { setSyncStatus("error"); }
        setSaving(false);
      })();
    }
    setCustomerForm({ ...emptyCustomer }); setShowCustomerForm(false);
  }

  // Delete a service log entry (admin only) — also reverses the stock deduction
  async function deleteLog(log) {
    const products = (() => { try { return JSON.parse(log.products||"[]"); } catch { return []; } })();
    const productSummary = products.map(p => `${p.productName||"(blank)"} × ${Number(p.qty)||0}`).join(", ");
    const confirmed = confirm(
      `⚠ Delete this service log?\n\nDate: ${formatDate(log.date)}\nCustomer: ${log.customer}\nProducts: ${productSummary}\n\nThis will also RESTORE the stock that was deducted. This cannot be undone.`
    );
    if (!confirmed) return;
    setSyncStatus("saving"); setSaving(true);
    try {
      // Delete from DB first
      const { error } = await supabase.from("logs").delete().eq("id", log.id);
      if (error) throw error;
      // Restore stock for each product (reverse the deduction)
      const validProducts = products.filter(p => p.productName && Number(p.qty) > 0);
      if (validProducts.length > 0) {
        const deltaRows = validProducts.map(p => ({
          warehouse: log.warehouse,
          categoryKey: p.categoryKey,
          productName: p.productName,
          delta: Number(p.qty), // positive = restore
          condition: NEW_USED_CATEGORIES.includes(p.categoryKey) ? (p.condition||"new") : "new",
        }));
        try {
          const results = await adjustStockAtomic(deltaRows);
          // Update local stock state
          setStock(prev => {
            const updated = JSON.parse(JSON.stringify(prev));
            results.forEach(r => {
              if (!updated[log.warehouse]) updated[log.warehouse] = {};
              if (!updated[log.warehouse][r.categoryKey]) updated[log.warehouse][r.categoryKey] = {};
              updated[log.warehouse][r.categoryKey][r.productName] = r.newQty;
            });
            return updated;
          });
        } catch {
          // Stock restore failed — log still deleted, warn admin
          alert("⚠ Log deleted but stock could not be automatically restored. Please check stock levels manually.");
        }
      }
      // Remove from local logs state
      setLogs(ls => ls.filter(l => l.id !== log.id));
      setSyncStatus("synced");
    } catch (err) {
      setSyncStatus("error");
      alert("⚠ Delete Failed!\n\n" + (err?.message||""));
    }
    setSaving(false);
  }

  // Delete a blank/corrupt stock entry (admin only)
  async function deleteBlankStockEntry(warehouse, categoryKey, productName) {
    const displayName = productName || "(blank name)";
    const confirmed = confirm(
      `⚠ Delete this corrupt stock entry?\n\nWarehouse: ${warehouse}\nCategory: ${categoryKey}\nProduct: "${displayName}"\n\nThis removes the entry from stock. Cannot be undone.`
    );
    if (!confirmed) return;
    setSyncStatus("saving"); setSaving(true);
    try {
      const { error } = await supabase.from("stock")
        .delete()
        .eq("warehouse", warehouse)
        .eq("category_key", categoryKey)
        .eq("product_name", productName);
      if (error) throw error;
      // Remove from local stock state
      setStock(prev => {
        const updated = JSON.parse(JSON.stringify(prev));
        if (updated[warehouse]?.[categoryKey]) {
          delete updated[warehouse][categoryKey][productName];
        }
        return updated;
      });
      setStockByCondition(prev => {
        const updated = JSON.parse(JSON.stringify(prev));
        if (updated[warehouse]?.[categoryKey]) {
          delete updated[warehouse][categoryKey][productName];
        }
        return updated;
      });
      setSyncStatus("synced");
      alert(`✓ Deleted corrupt entry "${displayName}" from ${warehouse}.`);
    } catch (err) {
      setSyncStatus("error");
      alert("⚠ Delete Failed!\n\n" + (err?.message||""));
    }
    setSaving(false);
  }

  async function saveHistoryEdit() {
    if (!historyEditForm.item.trim()) { alert("⚠ Item name cannot be blank."); return; }
    if (!historyEditForm.received || Number(historyEditForm.received) <= 0) { alert("⚠ Received quantity must be greater than 0."); return; }

    const oldReceived = Number(editingHistory.received || 0);
    const newReceived = Number(historyEditForm.received);
    const delta = newReceived - oldReceived; // e.g. 100-90 = +10
    const oldItem = editingHistory.item || "";
    const newItem = historyEditForm.item.trim();
    const itemChanged = oldItem !== newItem;

    // Warn if item name changed AND qty changed — stock adjustment may be wrong
    if (itemChanged && delta !== 0) {
      const ok = confirm(
        `⚠ You changed both the item name and quantity.\n\n` +
        `Old: "${oldItem}" × ${oldReceived}\n` +
        `New: "${newItem}" × ${newReceived}\n\n` +
        `The stock difference (${delta > 0 ? "+" : ""}${delta}) will be applied to "${newItem}".\n` +
        `If this is correct, click OK. Otherwise click Cancel and edit separately.`
      );
      if (!ok) return;
    }

    setSaving(true); setSyncStatus("saving");
    try {
      // Step 1: Update the history record label
      const { error } = await supabase.from("stock_history").update({
        item: newItem,
        vendor: historyEditForm.vendor.trim() || null,
        date: historyEditForm.date,
        received: newReceived,
        closing: (editingHistory.stockInHand || 0) + newReceived,
      }).eq("id", editingHistory.id);
      if (error) throw error;

      // Step 2: If received qty changed, adjust the actual stock
      if (delta !== 0) {
        // Find the category key from the category label
        const catEntry = Object.entries(CATEGORIES).find(([,v]) => v.label === editingHistory.category);
        const categoryKey = catEntry ? catEntry[0] : null;
        if (categoryKey) {
          const condition = editingHistory.condition || "new";
          await adjustStockAtomic([{
            warehouse: editingHistory.warehouse,
            categoryKey,
            productName: newItem,
            delta, // positive = add more stock, negative = reduce
            condition,
          }]);
          // Refresh stock from DB to get accurate values
          await fetchData();
        } else {
          alert(`⚠ History label updated but could not find category "${editingHistory.category}" to adjust stock automatically. Please verify stock levels manually.`);
        }
      }

      // Step 3: Update local history state
      setStockHistory(h => h.map(row => row.id === editingHistory.id ? {
        ...row,
        item: newItem,
        vendor: historyEditForm.vendor.trim() || "",
        date: historyEditForm.date,
        received: newReceived,
        closing: (editingHistory.stockInHand || 0) + newReceived,
      } : row));

      setSyncStatus("synced");
      setEditingHistory(null);

      if (delta !== 0) {
        alert(`✓ Done! Stock adjusted by ${delta > 0 ? "+" : ""}${delta}. New stock reflects the corrected purchase quantity.`);
      }
    } catch(err) {
      setSyncStatus("error");
      alert("⚠ Update Failed! Stock may be inconsistent — please refresh and verify.\n\n" + (err?.message||""));
    }
    setSaving(false);
  }

  const syncColor = syncStatus==="synced"?"#c9a84c":syncStatus==="saving"?"#facc15":"#ef4444";
  const syncLabel = syncStatus==="synced"?"✓ Synced":syncStatus==="saving"?"⟳ Saving...":"✕ Sync Error";
  const lastRefreshStr = lastRefresh ? lastRefresh.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "";

  const statBoxes = [
    { label:"Services", value:monthStats.services, color:"#f5d060" },
    { label:"Aerosol Refill", value:monthStats.productTotals?.AEROSOL_REFILL||0, unit:"Nos", color:"#c9a84c" },
    { label:"Urinal Pouch", value:(()=>{ let t=0; monthLogs.forEach(l => { try { JSON.parse(l.products||"[]").forEach(p => { if(p.categoryKey==="URINAL"&&p.productName==="Urinal Pouch") t+=Number(p.qty||0); }); } catch {} }); return t; })(), unit:"Nos", color:"#fb923c" },
    { label:"Battery", value:monthStats.productTotals?.BATTERY||0, unit:"Nos", color:"#facc15" },
    { label:"DPG", value:Math.round((()=>{ let t=0; monthLogs.forEach(l => { try { JSON.parse(l.products||"[]").forEach(p => { if(p.categoryKey==="OIL_COMPONENTS"&&p.productName==="DPG") t+=Number(p.qty||0); }); } catch {} }); return t; })()*100)/100, unit:"Ltrs", color:"#4ade80" },
    { label:"Alcohol", value:Math.round((()=>{ let t=0; monthLogs.forEach(l => { try { JSON.parse(l.products||"[]").forEach(p => { if(p.categoryKey==="OIL_COMPONENTS"&&p.productName==="Alcohol") t+=Number(p.qty||0); }); } catch {} }); return t; })()*100)/100, unit:"Ltrs", color:"#7ec8e3" },
    { label:"Customers Served", value:monthStats.customers, color:"#f87171" },
  ];

  return (
    <div style={{ fontFamily:"'Poppins',sans-serif", background:"#050400", minHeight:"100vh", width:"100%", color:"#f0e6c0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; }
        ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-track{background:#0a0800} ::-webkit-scrollbar-thumb{background:#c9a84c;border-radius:3px}
        .card{background:#0f0e00;border:1px solid #3a2e10;border-radius:14px;transition:border-color 0.2s}
        .card:hover{border-color:#c9a84c44}
        .btn{cursor:pointer;border:none;border-radius:8px;font-family:'Poppins',sans-serif;font-weight:700;transition:all 0.15s;display:inline-flex;align-items:center;gap:6px}
        .btn-gold{background:linear-gradient(135deg,#f5d060,#c9a84c);color:#000;padding:10px 20px;font-size:14px}
        .btn-gold:hover{filter:brightness(1.1);transform:translateY(-1px);box-shadow:0 4px 15px #c9a84c55}
        .btn-outline{background:transparent;color:#c9a84c;padding:8px 14px;font-size:13px;border:1px solid #c9a84c55}
        .btn-outline:hover{background:#c9a84c15;border-color:#c9a84c}
        .btn-danger{background:#2d0f0f;color:#ffaaaa;padding:5px 10px;font-size:12px;border:1px solid #ef444440}
        .btn-danger:hover{background:#ef4444;color:#fff}
        .btn-transfer{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;padding:10px 18px;font-size:13px}
        input,select,textarea{background:#0f0e00;border:1px solid #3a2e10;border-radius:8px;color:#f0e6c0;font-family:'Poppins',sans-serif;font-size:14px;padding:10px 14px;width:100%;outline:none;transition:border-color 0.2s}
        input:focus,select:focus,textarea:focus{border-color:#c9a84c;box-shadow:0 0 0 2px #c9a84c22}
        input::placeholder,textarea::placeholder{color:#5a4a20}
        select option{background:#1a1500;color:#f0e6c0}
        label{font-size:11px;color:#c9a84c;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;display:block;margin-bottom:6px}
        .tab{cursor:pointer;padding:7px 12px;font-size:11px;font-weight:600;border-bottom:2px solid transparent;color:#7a6a30;transition:all 0.2s;white-space:nowrap}
        .tab.active{color:#f5d060;border-bottom-color:#c9a84c}
        .tab:hover{color:#c9a84c}
        .pulse{animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .slide-in{animation:slideIn 0.2s ease}
        @keyframes slideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .spin{animation:spin 1s linear infinite;display:inline-block}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .product-card{background:#1a1500;border:1px solid #3a2e10;border-radius:10px;padding:14px;margin-bottom:10px}
        th{color:#c9a84c !important;font-size:10px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;padding:6px 10px;text-align:left;white-space:nowrap}
        td{padding:5px 10px !important;font-size:11px;border-bottom:1px solid #2a2000;color:#f0e6c0;vertical-align:top}
        tr:last-child td{border-bottom:none}
        tr:hover td{background:#1a1500}
        .stock-box{background:#0f0e00;border:1px solid #3a2e10;border-radius:12px;padding:16px}
        .stock-box-inner{max-height:200px;overflow-y:auto}
        .pg-btn{cursor:pointer;background:transparent;border:1px solid #3a2e10;border-radius:8px;color:#c9a84c;padding:6px 12px;font-size:13px;font-family:'Poppins',sans-serif;font-weight:600}
        .pg-btn:disabled{opacity:0.3;cursor:not-allowed}
        .pg-btn.active{background:linear-gradient(135deg,#f5d060,#c9a84c);color:#000;border-color:#c9a84c}
        .wh-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#1a1500;border:1px solid #c9a84c44;color:#c9a84c}
        .machine-code-input{background:#0a0800;border:1px solid #3a2e10;border-radius:6px;color:#f0e6c0;font-family:'Poppins',sans-serif;font-size:12px;padding:6px 10px;width:100%;margin-bottom:4px}
        .divider{width:1px;height:20px;background:#3a2e10;margin:0 2px}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background:"linear-gradient(135deg,#0a0800,#1a1400,#0a0800)", borderBottom:"2px solid #c9a84c", padding:"8px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
        {/* LEFT — logo + title only */}
        <div style={{ display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
          <div style={{ width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#1a1200,#0a0800)", border:"1px solid #c9a84c", borderRadius:10, flexShrink:0 }}>
            <span style={{ fontSize:18, fontWeight:900, background:"linear-gradient(135deg,#f5d060,#c9a84c)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:1 }}>SC</span>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:800, background:"linear-gradient(135deg,#f5d060,#c9a84c,#f5d060)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:2, textTransform:"uppercase" }}>Scentscircle Warehouse Stock</div>
            <div style={{ fontSize:9, color:"#c9a84c", marginTop:1, fontWeight:500, letterSpacing:1.5, textTransform:"uppercase", opacity:0.8 }}>UAE Warehouse</div>
          </div>
        </div>

        {/* RIGHT — action btn | role | logout | divider | refresh | sync */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          {tab===TABS.LOG && <button className="btn btn-gold" onClick={() => setShowLogForm(true)} style={{ fontSize:12, padding:"6px 14px" }}>+ Log Service</button>}
          {tab===TABS.CUSTOMERS && <button className="btn btn-gold" onClick={() => { setCustomerForm({...emptyCustomer}); setEditCustomerId(null); setShowCustomerForm(true); }} style={{ fontSize:12, padding:"6px 14px" }}>+ Add Customer</button>}
          {tab===TABS.PURCHASE && <button className="btn btn-gold" onClick={() => setShowStockForm(true)} style={{ fontSize:12, padding:"6px 14px" }}>+ Add Stock</button>}
          {tab===TABS.TRANSFER && <button className="btn btn-transfer" onClick={() => setShowTransferForm(true)} style={{ fontSize:12, padding:"6px 14px" }}>⇄ New Transfer</button>}
          {tab===TABS.RETURNS && <button className="btn btn-gold" onClick={() => setShowReturnForm(true)} style={{ fontSize:12, padding:"6px 14px" }}>♻️ New Return</button>}
          {tab===TABS.STOCK && <button className="btn btn-gold" onClick={() => { setNewProductForm({ categoryKey:"BATTERY", productName:"", warehouse: isAdmin ? "ALL" : (roleWarehouse||"Al Quoz Warehouse") }); setShowAddProductForm(true); }} style={{ fontSize:11, padding:"6px 12px" }}>+ Add Product</button>}

          <div className="divider" />

          <span style={{ fontSize:10, background:isAdmin?"#1a1500":isOffice?"#0a1528":"#0f2d1a", color:isAdmin?"#f5d060":isOffice?"#60a5fa":"#4ade80", border:`1px solid ${isAdmin?"#c9a84c55":isOffice?"#60a5fa55":"#4ade8055"}`, borderRadius:20, padding:"3px 10px", fontWeight:700, textTransform:"uppercase", whiteSpace:"nowrap" }}>
            {isAdmin?"👑 Admin":isOffice?"🏢 Head Office":"🏭 Warehouse"}
          </span>

          <button onClick={handleLogout} style={{ cursor:"pointer", background:"transparent", border:"1px solid #c9a84c40", borderRadius:6, color:"#c9a84c", padding:"4px 10px", fontSize:10, fontFamily:"Poppins,sans-serif", fontWeight:600, whiteSpace:"nowrap" }}>Logout</button>

          <div className="divider" />

          <button className="btn btn-outline" onClick={fetchData} style={{ fontSize:11, padding:"6px 12px" }}>↻ Refresh</button>

          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            <span style={{ fontSize:10, color:syncColor, fontWeight:600, whiteSpace:"nowrap" }}>{syncLabel}</span>
            {lastRefreshStr && <span style={{ fontSize:10, color:"#7a6a30", whiteSpace:"nowrap" }}>· {lastRefreshStr}</span>}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ borderBottom:"1px solid #2a2000", display:"flex", padding:"0 12px", background:"#0a0800", overflowX:"auto" }}>
        {[
          { key:TABS.LOG, label:"📋 Service Log" },
          { key:TABS.CUSTOMERS, label:"👥 Customers" },
          { key:TABS.STOCK, label:"📦 Stock" },
          { key:TABS.PUREOIL, label:"💧 Pure Oil Stock" },
          { key:TABS.FINISHEDAROMA, label:"🧴 Finished Aroma Oil" },
          { key:TABS.PURCHASE, label:"🛒 Purchase" },
          { key:TABS.TRANSFER, label:"⇄ Transfer" },
          { key:TABS.RETURNS, label:"♻️ Returns" },
          { key:TABS.REPORT, label:"📊 Report", adminOnly:true },
        ].filter(t => !t.adminOnly || isAdmin).map(t => (
          <div key={t.key} className={`tab ${tab===t.key?"active":""}`} onClick={() => setTab(t.key)}>{t.label}</div>
        ))}
      </div>

      <div style={{ width:"100%", padding:"12px 14px" }}>
        {loading && (
          <div style={{ textAlign:"center", padding:60, color:"#c9a84c" }}>
            <div className="spin" style={{ fontSize:32, marginBottom:12 }}>⟳</div>
            <div style={{ fontSize:14, fontWeight:500 }}>Loading data...</div>
          </div>
        )}

        {!loading && <>

          {/* SERVICE LOG */}
          {tab===TABS.LOG && (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
                <label style={{ margin:0, fontSize:10 }}>Month (Stats):</label>
                <input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{ width:140, fontSize:11, padding:"4px 8px" }} />
                {filterMonth && <button className="btn btn-outline" onClick={()=>setFilterMonth("")} style={{ padding:"3px 8px", fontSize:10 }}>Show All</button>}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,minmax(90px,1fr))", gap:6, flex:1 }}>
                  {statBoxes.map(s => (
                    <div key={s.label} className="card" style={{ padding:"6px 8px", textAlign:"center" }}>
                      <div style={{ fontSize:8, color:"#c9a84c", fontWeight:600, letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:2 }}>{s.label}</div>
                      <div style={{ fontSize:16, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
                      {s.unit && <div style={{ fontSize:8, color:"#7a6a30" }}>{s.unit}</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap", alignItems:"flex-end" }}>
                <div><label style={{ fontSize:9 }}>Filter by Date</label><input type="date" value={filterDate} onChange={e=>{setFilterDate(e.target.value);setLogPage(1);}} style={{ width:140, fontSize:11, padding:"4px 8px" }} /></div>
                <div><label style={{ fontSize:9 }}>Filter by Customer</label><select value={filterCustomer} onChange={e=>{setFilterCustomer(e.target.value);setLogPage(1);}} style={{ width:180, fontSize:11, padding:"4px 8px" }}><option value="">All Customers</option>{customers.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                <div><label style={{ fontSize:9 }}>Filter by Warehouse</label><select value={filterLogWarehouse} onChange={e=>{setFilterLogWarehouse(e.target.value);setLogPage(1);}} style={{ width:160, fontSize:11, padding:"4px 8px" }}><option value="">All Warehouses</option>{availableWarehouses.map(w=><option key={w} value={w}>{w}</option>)}</select></div>
                {(filterDate||filterCustomer||filterLogWarehouse) && <button className="btn btn-outline" onClick={()=>{setFilterDate("");setFilterCustomer("");setFilterLogWarehouse("");setLogPage(1);}} style={{ alignSelf:"flex-end", padding:"4px 8px", fontSize:10 }}>✕ Clear</button>}
                <div style={{ alignSelf:"flex-end", marginLeft:"auto", fontSize:11, color:"#7a6a30" }}>{filteredLogs.length} records</div>
              </div>
              <div className="card" style={{ overflow:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
                  <thead style={{ background:"#0a0800", borderBottom:"1px solid #3a2e10" }}>
                    <tr><th>S.No</th><th>Date</th><th>Warehouse</th><th>Customer</th><th>Technician</th><th>Products Given</th>{isAdmin && <th>Action</th>}</tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.length===0 && <tr><td colSpan={6} style={{ textAlign:"center", padding:30, color:"#5a4a20" }}>No records found.</td></tr>}
                    {paginatedLogs.map((l,i) => {
                      let productList = [];
                      try { productList = JSON.parse(l.products||"[]"); } catch {}
                      const grouped = {};
                      productList.forEach(p => { if (!grouped[p.categoryKey]) grouped[p.categoryKey]=[]; grouped[p.categoryKey].push(p); });
                      // Detect broken entries: any product with blank name or zero qty
                      const hasBrokenEntry = productList.some(p => !p.productName || !p.productName.trim() || !p.qty || Number(p.qty)<=0);
                      return (
                        <tr key={l.id||i} style={{ background: hasBrokenEntry ? "#1a0a0a" : undefined }}>
                          <td style={{ color:"#5a4a20" }}>{(logPage-1)*LOG_PAGE_SIZE+i+1}</td>
                          <td style={{ color:"#d4b96a", whiteSpace:"nowrap" }}>{formatDate(l.date)}</td>
                          <td><span className="wh-badge">{l.warehouse||"—"}</span></td>
                          <td style={{ fontWeight:600, color:"#f5e6b0" }}>{l.customer}</td>
                          <td style={{ color:"#a78bfa" }}>{l.technician||"—"}</td>
                          <td>
                            {hasBrokenEntry && <div style={{ fontSize:10, color:"#f87171", background:"#2d1515", border:"1px solid #ef444440", borderRadius:4, padding:"2px 8px", marginBottom:3, display:"inline-block" }}>⚠ Broken entry — delete and re-log</div>}
                            {Object.entries(grouped).map(([catKey,prods]) => {
                              const cat = (CATEGORIES as any)[catKey];
                              const prodList = prods as any[];
                              return (
                                <div key={catKey} style={{ marginBottom:1 }}>
                                  <span style={{ fontWeight:700, color:"#c9a84c" }}>{cat?.icon} {cat?.label}: </span>
                                  {prodList.map((p:any,pi:number) => (
                                    <span key={pi}>
                                      <span style={{ color: (!p.productName||!p.qty||Number(p.qty)<=0) ? "#f87171" : "#f0e6c0", marginRight:4 }}>
                                        {p.productName||"⚠ BLANK NAME"}{p.condition && (p.categoryKey==="AROMA_DIFFUSER"||p.categoryKey==="AEROSOL_DISPENSER") && <span style={{ color:p.condition==="used"?"#a78bfa":"#4ade80", fontSize:10 }}> [{p.condition==="used"?"Used":"New"}]</span>} × {Number(p.qty)||"⚠ 0"} {cat?.unit}
                                      </span>
                                      {p.machineCodes && p.machineCodes.length > 0 && p.machineCodes.some((c:any)=>c) && (
                                        <span style={{ color:"#7ec8e3", fontSize:10 }}>[Codes: {p.machineCodes.filter((c:any)=>c).join(", ")}]</span>
                                      )}
                                      {pi < prodList.length-1 && <span style={{ color:"#5a4a20", marginRight:6 }}>, </span>}
                                    </span>
                                  ))}
                                </div>
                              );
                            })}
                          </td>
                          {isAdmin && (
                            <td style={{ whiteSpace:"nowrap" }}>
                              <div style={{ display:"flex", gap:4, flexWrap:"nowrap" }}>
                                <button className="btn btn-outline" style={{ fontSize:10, padding:"3px 8px" }} onClick={()=>openEditLog(l)} disabled={saving}>✎ Edit</button>
                                <button className="btn btn-danger" style={{ fontSize:10, padding:"3px 8px" }} onClick={()=>deleteLog(l)} disabled={saving}>🗑 Del</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalLogPages > 1 && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:12, flexWrap:"wrap", gap:10 }}>
                  <div style={{ fontSize:12, color:"#c9a84c" }}>Showing {(logPage-1)*LOG_PAGE_SIZE+1}–{Math.min(logPage*LOG_PAGE_SIZE,filteredLogs.length)} of {filteredLogs.length}</div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button className="pg-btn" onClick={()=>setLogPage(p=>Math.max(1,p-1))} disabled={logPage===1}>← Prev</button>
                    {Array.from({length:Math.min(5,totalLogPages)},(_,i)=>{ let page=totalLogPages<=5?i+1:logPage<=3?i+1:logPage>=totalLogPages-2?totalLogPages-4+i:logPage-2+i; return <button key={page} className={`pg-btn ${logPage===page?"active":""}`} onClick={()=>setLogPage(page)}>{page}</button>; })}
                    <button className="pg-btn" onClick={()=>setLogPage(p=>Math.min(totalLogPages,p+1))} disabled={logPage===totalLogPages}>Next →</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* CUSTOMERS */}
          {tab===TABS.CUSTOMERS && (
            <>
              <div style={{ display:"flex", gap:10, marginBottom:14, alignItems:"center", flexWrap:"wrap" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#f5d060", textTransform:"uppercase", letterSpacing:1 }}>👥 Aerosol Customers</div>
                <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
                  <input placeholder="Search customers..." value={customerSearch} onChange={e=>{setCustomerSearch(e.target.value);setCustomerPage(1);}} style={{ width:200, padding:"8px 12px", fontSize:12 }} />
                  <span style={{ fontSize:12, color:"#7a6a30", whiteSpace:"nowrap" }}>{filteredCustomers.length} customers</span>
                </div>
              </div>
              <div className="card" style={{ overflow:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead style={{ background:"#0a0800", borderBottom:"1px solid #3a2e10" }}>
                    <tr><th>#</th><th>Customer Name</th><th>Location</th><th>No. of Machines</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {paginatedCustomers.length===0 && <tr><td colSpan={5} style={{ textAlign:"center", padding:30, color:"#5a4a20" }}>No customers found.</td></tr>}
                    {paginatedCustomers.map((c,i) => (
                      <tr key={c.id||i}>
                        <td style={{ color:"#5a4a20" }}>{(customerPage-1)*CUSTOMER_PAGE_SIZE+i+1}</td>
                        <td style={{ fontWeight:600, color:"#f5e6b0" }}>{c.name}</td>
                        <td style={{ color:"#c9a84c" }}>{c.location||"—"}</td>
                        <td style={{ color:"#f5d060", fontWeight:700, textAlign:"center" }}>{c.machines||"—"}</td>
                        <td><button className="btn btn-outline" style={{ padding:"3px 10px", fontSize:11 }} onClick={()=>{setCustomerForm({name:c.name,location:c.location||"",machines:c.machines||""});setEditCustomerId(c.id);setShowCustomerForm(true);}}>Edit</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalCustomerPages > 1 && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:12, flexWrap:"wrap", gap:10 }}>
                  <div style={{ fontSize:12, color:"#c9a84c" }}>Showing {(customerPage-1)*CUSTOMER_PAGE_SIZE+1}–{Math.min(customerPage*CUSTOMER_PAGE_SIZE,filteredCustomers.length)} of {filteredCustomers.length}</div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button className="pg-btn" onClick={()=>setCustomerPage(p=>Math.max(1,p-1))} disabled={customerPage===1}>← Prev</button>
                    {Array.from({length:Math.min(5,totalCustomerPages)},(_,i)=>{ let page=totalCustomerPages<=5?i+1:customerPage<=3?i+1:customerPage>=totalCustomerPages-2?totalCustomerPages-4+i:customerPage-2+i; return <button key={page} className={`pg-btn ${customerPage===page?"active":""}`} onClick={()=>setCustomerPage(page)}>{page}</button>; })}
                    <button className="pg-btn" onClick={()=>setCustomerPage(p=>Math.min(totalCustomerPages,p+1))} disabled={customerPage===totalCustomerPages}>Next →</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STOCK */}
          {tab===TABS.STOCK && (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18, flexWrap:"wrap" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#f5d060", textTransform:"uppercase", letterSpacing:1 }}>📦 Stock Levels</div>
                <div style={{ marginLeft:"auto", display:"flex", gap:10, alignItems:"center" }}>
                  <label style={{ margin:0, whiteSpace:"nowrap" }}>Warehouse:</label>
                  <select value={stockFilterWarehouse} onChange={e=>{setStockFilterWarehouse(e.target.value);setLowStockPage(1);}} style={{ width:200 }}>
                    {availableWarehouses.map(w=><option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:18, marginBottom:24 }}>
                {Object.entries(CATEGORIES).filter(([catKey])=>catKey!=="PURE_OIL").map(([catKey,cat]) => {
                  const products = catKey==="FINISHED_AROMA_OIL" ? getFinishedAromaOilProducts(stockFilterWarehouse) : [...cat.products, ...(dynamicExtraProducts[catKey]||[])];
                  return (
                    <div key={catKey}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#f5d060", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>{cat.icon} {cat.label}</div>
                      <div className="stock-box">
                        <div className="stock-box-inner">
                          {products.length===0 && <div style={{ color:"#5a4a20", fontSize:12 }}>No items.</div>}
                          {products.map(p => {
                            const isNewUsed = NEW_USED_CATEGORIES.includes(catKey);
                            const qty = getStockQty(catKey, p, stockFilterWarehouse);
                            const low = qty < getLowThreshold(catKey, p);
                            if (isNewUsed) {
                              const newQty = getConditionQty(catKey, p, stockFilterWarehouse, "new");
                              const usedQty = getConditionQty(catKey, p, stockFilterWarehouse, "used");
                              return (
                                <div key={p} style={{ padding:"5px 0", borderBottom:"1px solid #2a2000" }}>
                                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                    <span style={{ color:"#f0e6c0", fontSize:12 }}>{p}</span>
                                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                      <span style={{ fontSize:13, fontWeight:700, color:low?"#ef4444":"#86efac" }}>{qty} {cat.unit}</span>
                                      {low && <span className="pulse" style={{ fontSize:9, background:"#2d0f0f", color:"#f87171", border:"1px solid #ef444440", borderRadius:20, padding:"1px 6px", fontWeight:700 }}>LOW</span>}
                                    </div>
                                  </div>
                                  <div style={{ display:"flex", gap:10, marginTop:2 }}>
                                    <span style={{ fontSize:10, color:"#4ade80" }}>🆕 New: {newQty}</span>
                                    <span style={{ fontSize:10, color:"#a78bfa" }}>♻️ Used: {usedQty}</span>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div key={p} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:"1px solid #2a2000" }}>
                                <span style={{ color:"#f0e6c0", fontSize:12 }}>{p}</span>
                                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                  <span style={{ fontSize:14, fontWeight:700, color:low?"#ef4444":"#86efac" }}>{qty} {cat.unit}</span>
                                  {low && <span className="pulse" style={{ fontSize:9, background:"#2d0f0f", color:"#f87171", border:"1px solid #ef444440", borderRadius:20, padding:"1px 6px", fontWeight:700 }}>LOW</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:"#f5d060", marginBottom:10, textTransform:"uppercase", letterSpacing:1 }}>⚠ Low Stock — {stockFilterWarehouse}</div>
              <div className="card" style={{ overflow:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead style={{ background:"#0a0800", borderBottom:"1px solid #3a2e10" }}>
                    <tr><th>S.No</th><th>Category</th><th>Product</th><th>Available Stock</th><th>Unit</th></tr>
                  </thead>
                  <tbody>
                    {paginatedLowStock.length===0 && <tr><td colSpan={5} style={{ textAlign:"center", padding:20, color:"#4ade80" }}>✅ All items sufficiently stocked!</td></tr>}
                    {paginatedLowStock.map((item,i) => {
                      const isBlank = !item.name || !item.name.trim();
                      return (
                        <tr key={(item.name||"blank")+i} style={{ background: isBlank ? "#1a0a0a" : undefined }}>
                          <td style={{ color:"#5a4a20" }}>{(lowStockPage-1)*LOW_STOCK_PAGE_SIZE+i+1}</td>
                          <td style={{ color:"#c9a84c" }}>{item.category}</td>
                          <td style={{ fontWeight:600, color: isBlank ? "#f87171" : "#f5e6b0" }}>{isBlank ? "⚠ BLANK NAME" : item.name}</td>
                          <td style={{ color:"#ef4444", fontWeight:700 }}>{item.qty}</td>
                          <td style={{ color:"#7a6a30" }}>{item.unit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalLowStockPages > 1 && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:12, flexWrap:"wrap", gap:10 }}>
                  <div style={{ fontSize:12, color:"#c9a84c" }}>{nonPureOilLowStockItems.length} low stock items</div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button className="pg-btn" onClick={()=>setLowStockPage(p=>Math.max(1,p-1))} disabled={lowStockPage===1}>← Prev</button>
                    {Array.from({length:Math.min(5,totalLowStockPages)},(_,i)=>{ let page=totalLowStockPages<=5?i+1:lowStockPage<=3?i+1:lowStockPage>=totalLowStockPages-2?totalLowStockPages-4+i:lowStockPage-2+i; return <button key={page} className={`pg-btn ${lowStockPage===page?"active":""}`} onClick={()=>setLowStockPage(page)}>{page}</button>; })}
                    <button className="pg-btn" onClick={()=>setLowStockPage(p=>Math.min(totalLowStockPages,p+1))} disabled={lowStockPage===totalLowStockPages}>Next →</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* PURE OIL */}
          {tab===TABS.PUREOIL && (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18, flexWrap:"wrap" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#f5d060", textTransform:"uppercase", letterSpacing:1 }}>💧 Pure Oil Stock</div>
                <div style={{ marginLeft:"auto", display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                  <label style={{ margin:0, whiteSpace:"nowrap" }}>Warehouse:</label>
                  <select value={stockFilterWarehouse} onChange={e=>setStockFilterWarehouse(e.target.value)} style={{ width:180 }}>
                    {availableWarehouses.map(w=><option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
                <input value={pureOilSearch} onChange={e=>setPureOilSearch(e.target.value)} placeholder="🔍 Search oil by name..." style={{ flex:"1 1 240px", maxWidth:340 }} />
                <div style={{ display:"flex", gap:6 }}>
                  {[{key:"name",label:"Show All"},{key:"low",label:"🔴 Low Stock Only"},{key:"high",label:"🟢 Sufficient Only"}].map(s=>(
                    <button key={s.key} onClick={()=>setPureOilSort(s.key)} style={{ cursor:"pointer", background:pureOilSort===s.key?"linear-gradient(135deg,#f5d060,#c9a84c)":"transparent", color:pureOilSort===s.key?"#000":"#c9a84c", border:`1px solid ${pureOilSort===s.key?"#c9a84c":"#3a2e10"}`, borderRadius:8, padding:"7px 14px", fontSize:12, fontFamily:"Poppins,sans-serif", fontWeight:600 }}>{s.label}</button>
                  ))}
                </div>
                <div style={{ marginLeft:"auto", fontSize:12, color:"#7a6a30" }}>{displayedPureOils.length} of {pureOilProducts.length} oils — {stockFilterWarehouse}</div>
              </div>
              <div className="card" style={{ overflow:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead style={{ background:"#0a0800", borderBottom:"1px solid #3a2e10" }}>
                    <tr><th>#</th><th>Fragrance Name</th><th>Stock</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {displayedPureOils.length===0 && <tr><td colSpan={4} style={{ textAlign:"center", padding:20, color:"#5a4a20" }}>No oils found.</td></tr>}
                    {displayedPureOils.map((item,i) => {
                      const isBlank = !item.name || !item.name.trim();
                      return (
                        <tr key={item.name||("blank-"+i)} style={{ background: isBlank ? "#1a0a0a" : undefined }}>
                          <td style={{ color:"#5a4a20" }}>{i+1}</td>
                          <td style={{ fontWeight:600, color: isBlank ? "#f87171" : "#f5e6b0" }}>
                            {isBlank ? "⚠ BLANK NAME — corrupt entry" : item.name}
                          </td>
                          <td style={{ fontWeight:700, color:item.isLow?"#ef4444":"#86efac" }}>{item.qty} Ltrs</td>
                          <td>
                            {isBlank
                              ? <span style={{ fontSize:9, background:"#2d1515", color:"#f87171", border:"1px solid #ef444440", borderRadius:20, padding:"2px 8px", fontWeight:700 }}>CORRUPT</span>
                              : item.isLow
                                ? <span className="pulse" style={{ fontSize:9, background:"#2d0f0f", color:"#f87171", border:"1px solid #ef444440", borderRadius:20, padding:"2px 8px", fontWeight:700 }}>LOW STOCK</span>
                                : <span style={{ fontSize:9, background:"#0f2d1a", color:"#86efac", border:"1px solid #86efac40", borderRadius:20, padding:"2px 8px", fontWeight:700 }}>OK</span>}
                          </td>
                          {isAdmin && isBlank && <td><button className="btn btn-danger" style={{ fontSize:10, padding:"3px 8px" }} onClick={()=>deleteBlankStockEntry(stockFilterWarehouse,"PURE_OIL",item.name)} disabled={saving}>🗑 Delete</button></td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* FINISHED AROMA OIL */}
          {tab===TABS.FINISHEDAROMA && (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18, flexWrap:"wrap" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#f5d060", textTransform:"uppercase", letterSpacing:1 }}>🧴 Finished Aroma Oil Stock</div>
                <div style={{ marginLeft:"auto", display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                  <label style={{ margin:0, whiteSpace:"nowrap" }}>Warehouse:</label>
                  <select value={finishedAromaWarehouse} onChange={e=>{ setFinishedAromaWarehouse(e.target.value); setFinishedAromaSort("name"); }} style={{ width:180 }}>
                    {availableWarehouses.map(w=><option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
                <input value={finishedAromaSearch} onChange={e=>setFinishedAromaSearch(e.target.value)} placeholder="🔍 Search oil by name..." style={{ flex:"1 1 240px", maxWidth:340 }} />
                {finishedAromaWarehouse === "Head Office" && (
                  <div style={{ display:"flex", gap:6 }}>
                    {[{key:"name",label:"Show All"},{key:"low",label:"🔴 Low Stock Only"},{key:"high",label:"🟢 Sufficient Only"}].map(s=>(
                      <button key={s.key} onClick={()=>setFinishedAromaSort(s.key)} style={{ cursor:"pointer", background:finishedAromaSort===s.key?"linear-gradient(135deg,#f5d060,#c9a84c)":"transparent", color:finishedAromaSort===s.key?"#000":"#c9a84c", border:`1px solid ${finishedAromaSort===s.key?"#c9a84c":"#3a2e10"}`, borderRadius:8, padding:"7px 14px", fontSize:12, fontFamily:"Poppins,sans-serif", fontWeight:600 }}>{s.label}</button>
                    ))}
                  </div>
                )}
                <div style={{ marginLeft:"auto", fontSize:12, color:"#7a6a30" }}>{displayedFinishedAromaOils.length} products — {finishedAromaWarehouse}</div>
              </div>
              <div className="card" style={{ overflow:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead style={{ background:"#0a0800", borderBottom:"1px solid #3a2e10" }}>
                    <tr><th>#</th><th>Product Name</th><th>Stock</th><th>Status</th>{isAdmin && <th>Action</th>}</tr>
                  </thead>
                  <tbody>
                    {displayedFinishedAromaOils.length===0 && <tr><td colSpan={4} style={{ textAlign:"center", padding:20, color:"#5a4a20" }}>No Finished Aroma Oils found.</td></tr>}
                    {displayedFinishedAromaOils.map((item,i) => {
                      const isBlank = !item.name || !item.name.trim();
                      return (
                        <tr key={item.name||("blank-"+i)} style={{ background: isBlank ? "#1a0a0a" : undefined }}>
                          <td style={{ color:"#5a4a20" }}>{i+1}</td>
                          <td style={{ fontWeight:600, color: isBlank ? "#f87171" : "#f5e6b0" }}>
                            {isBlank ? "⚠ BLANK NAME — corrupt entry" : item.name}
                          </td>
                          <td style={{ fontWeight:700, color:item.isLow?"#ef4444":"#86efac" }}>{item.qty} Ltrs</td>
                          <td>
                            {isBlank ? <span style={{ fontSize:9, background:"#2d1515", color:"#f87171", border:"1px solid #ef444440", borderRadius:20, padding:"2px 8px", fontWeight:700 }}>CORRUPT</span>
                              : finishedAromaWarehouse === "Head Office"
                                ? item.isLow
                                  ? <span className="pulse" style={{ fontSize:9, background:"#2d0f0f", color:"#f87171", border:"1px solid #ef444440", borderRadius:20, padding:"2px 8px", fontWeight:700 }}>LOW STOCK</span>
                                  : <span style={{ fontSize:9, background:"#0f2d1a", color:"#86efac", border:"1px solid #86efac40", borderRadius:20, padding:"2px 8px", fontWeight:700 }}>OK</span>
                                : <span style={{ fontSize:10, color:"#5a4a20" }}>—</span>}
                          </td>
                          {isAdmin && <td>{isBlank && <button className="btn btn-danger" style={{ fontSize:10, padding:"3px 8px" }} onClick={()=>deleteBlankStockEntry(finishedAromaWarehouse,"FINISHED_AROMA_OIL",item.name)} disabled={saving}>🗑 Delete</button>}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* PURCHASE */}
          {tab===TABS.PURCHASE && (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14, flexWrap:"wrap" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#f5d060", textTransform:"uppercase", letterSpacing:1 }}>🛒 Stock Purchase History</div>
                <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
                  <select value={purchaseFilterWarehouse} onChange={e=>setPurchaseFilterWarehouse(e.target.value)} style={{ width:200 }}>
                    {isAdmin && <option value="">All Warehouses</option>}
                    {availableWarehouses.map(w=><option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div className="card" style={{ overflow:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
                  <thead style={{ background:"#0a0800", borderBottom:"1px solid #3a2e10" }}>
                    <tr><th>S.No</th><th>Date</th><th>Warehouse</th><th>Category</th><th>Item</th><th>Vendor</th><th>Stock In Hand</th><th>Received</th><th>Closing</th>{isAdmin && <th>Action</th>}</tr>
                  </thead>
                  <tbody>
                    {filteredHistory.length===0 && <tr><td colSpan={9} style={{ textAlign:"center", padding:20, color:"#5a4a20" }}>No purchase history yet.</td></tr>}
                    {filteredHistory.map((h,i) => {
                      const isBlankItem = h.type==="purchase" && (!h.item || !h.item.trim());
                      return (
                        <tr key={h.id||i} style={{ background: isBlankItem ? "#1a0a0a" : undefined }}>
                          <td style={{ color:"#5a4a20" }}>{i+1}</td>
                          <td style={{ color:"#d4b96a", whiteSpace:"nowrap" }}>{formatDate(h.date)}</td>
                          <td><span className="wh-badge">{h.type==="transfer"?(h.from&&h.to?`${h.from}→${h.to}`:"Transfer"):(h.warehouse||"—")}</span></td>
                          <td style={{ color:"#c9a84c" }}>{h.category||"Transfer"}</td>
                          <td style={{ fontWeight:600, color: isBlankItem ? "#f87171" : "#f5e6b0" }}>{isBlankItem ? "⚠ BLANK — needs edit" : h.item}</td>
                          <td style={{ color:"#7a6a30" }}>{h.type==="transfer" ? "⇄ Transfer" : (h.vendor||"—")}</td>
                          <td style={{ textAlign:"center" }}>{Math.round(((h.stockInHand??h.qty)||0)*100)/100}</td>
                          <td style={{ color:"#4ade80", fontWeight:700, textAlign:"center" }}>{h.type==="transfer"?`⇄${h.qty}`:`+${Math.round((h.received||0)*100)/100}`}</td>
                          <td style={{ color:"#f5d060", fontWeight:700, textAlign:"center" }}>{Math.round(((h.closing??h.qty)||0)*100)/100}</td>
                          {isAdmin && h.type==="purchase" && (
                            <td>
                              <button className="btn btn-outline" style={{ fontSize:10, padding:"3px 8px", whiteSpace:"nowrap" }}
                                onClick={()=>{ setEditingHistory(h); setHistoryEditForm({ item:h.item||"", vendor:h.vendor||"", date:String(h.date).split("T")[0], received:String(h.received||"") }); }}
                                disabled={saving}>✎ Edit</button>
                            </td>
                          )}
                          {isAdmin && h.type!=="purchase" && <td></td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

      {/* EDIT PURCHASE HISTORY MODAL */}
      {editingHistory && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, backdropFilter:"blur(4px)" }}>
          <div className="card slide-in" onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:460, margin:16, padding:24, background:"#0a0800", border:"1px solid #c9a84c", maxHeight:"92vh", overflowY:"auto" }}>
            <div style={{ fontWeight:700, fontSize:17, marginBottom:18, color:"#f5d060" }}>✎ Edit Purchase Record</div>
            <div style={{ background:"#1a1200", border:"1px solid #facc1560", borderRadius:8, padding:"10px 14px", fontSize:11, color:"#facc15", marginBottom:16 }}>
              <div><strong>{editingHistory.warehouse}</strong> · <strong>{editingHistory.category}</strong></div>
              <div style={{ marginTop:6, display:"flex", gap:16, flexWrap:"wrap" }}>
                <span>Stock In Hand (before purchase): <strong>{Math.round(((editingHistory.stockInHand??0))*100)/100}</strong></span>
                <span>Original received: <strong>{Math.round((editingHistory.received||0)*100)/100}</strong></span>
              </div>
              {Number(historyEditForm.received) !== Number(editingHistory.received||0) && (
                <div style={{ marginTop:8, padding:"6px 10px", background:"#0a1a0a", border:"1px solid #4ade8040", borderRadius:6 }}>
                  📦 Stock will be adjusted by <strong style={{ color: Number(historyEditForm.received)>Number(editingHistory.received||0) ? "#4ade80" : "#f87171" }}>
                    {Number(historyEditForm.received)>Number(editingHistory.received||0)?"+":""}{Math.round((Number(historyEditForm.received)-Number(editingHistory.received||0))*100)/100}
                  </strong> units when saved.
                </div>
              )}
            </div>
            <div style={{ display:"grid", gap:12 }}>
              <div>
                <label>Item Name *</label>
                <input value={historyEditForm.item} onChange={e=>setHistoryEditForm(f=>({...f,item:e.target.value}))} placeholder="e.g. Blue Cherry" style={{ borderColor: !historyEditForm.item.trim() ? "#ef4444" : "#3a2e10" }} />
                {!historyEditForm.item.trim() && <div style={{ fontSize:10, color:"#f87171", marginTop:2 }}>Item name is required</div>}
              </div>
              <div>
                <label>Vendor</label>
                <input value={historyEditForm.vendor} onChange={e=>setHistoryEditForm(f=>({...f,vendor:e.target.value}))} placeholder="e.g. CENTIFLORA" />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label>Date Received</label>
                  <input type="date" value={historyEditForm.date} onChange={e=>setHistoryEditForm(f=>({...f,date:e.target.value}))} />
                </div>
                <div>
                  <label>Received Qty</label>
                  <input type="number" min="0" step="0.01" value={historyEditForm.received} onChange={e=>setHistoryEditForm(f=>({...f,received:e.target.value}))} placeholder="0" />
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18, justifyContent:"flex-end" }}>
              <button className="btn btn-outline" onClick={()=>setEditingHistory(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-gold" onClick={saveHistoryEdit} disabled={saving || !historyEditForm.item.trim()}>{saving?"Saving...":"✓ Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

          {/* TRANSFER */}
          {tab===TABS.TRANSFER && (
            <>
              <div style={{ fontSize:13, fontWeight:700, color:"#f5d060", marginBottom:16, textTransform:"uppercase", letterSpacing:1 }}>⇄ Inter-Warehouse Transfer History</div>
              <div className="card" style={{ overflow:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead style={{ background:"#0a0800", borderBottom:"1px solid #3a2e10" }}>
                    <tr><th>S.No</th><th>Date</th><th>From</th><th>To</th><th>Item</th><th>Qty</th></tr>
                  </thead>
                  <tbody>
                    {stockHistory.filter(h=>h.type==="transfer" && (!roleWarehouse || h.from===roleWarehouse || h.to===roleWarehouse)).length===0 && <tr><td colSpan={6} style={{ textAlign:"center", padding:20, color:"#5a4a20" }}>No transfers yet.</td></tr>}
                    {stockHistory.filter(h=>h.type==="transfer" && (!roleWarehouse || h.from===roleWarehouse || h.to===roleWarehouse)).map((h,i) => (
                      <tr key={h.id||i}>
                        <td style={{ color:"#5a4a20" }}>{i+1}</td>
                        <td style={{ color:"#d4b96a", whiteSpace:"nowrap" }}>{formatDate(h.date)}</td>
                        <td><span className="wh-badge">{h.from}</span></td>
                        <td><span className="wh-badge" style={{ borderColor:"#4ade8044", color:"#4ade80" }}>{h.to}</span></td>
                        <td style={{ fontWeight:600, color:"#f5e6b0" }}>{h.item}</td>
                        <td style={{ color:"#4ade80", fontWeight:700 }}>{h.qty} {h.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* RETURNS */}
          {tab===TABS.RETURNS && (
            <>
              <div style={{ fontSize:13, fontWeight:700, color:"#f5d060", marginBottom:16, textTransform:"uppercase", letterSpacing:1 }}>♻️ Finished Aroma Oil — Returns from Service</div>
              <div style={{ fontSize:12, color:"#7a6a30", marginBottom:16 }}>
                When the team returns from a service with leftover mixed/finished aroma oil, log it here. It's added to <strong style={{ color:"#c9a84c" }}>Finished Aroma Oil</strong> stock and can be reused in a future Service Log.
              </div>
              <div className="card" style={{ overflow:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead style={{ background:"#0a0800", borderBottom:"1px solid #3a2e10" }}>
                    <tr><th>S.No</th><th>Date</th><th>Warehouse</th><th>Item</th><th>Customer</th><th>Technician</th><th>Qty Returned</th><th>Closing Stock</th></tr>
                  </thead>
                  <tbody>
                    {stockHistory.filter(h=>h.type==="return" && (!roleWarehouse || h.warehouse===roleWarehouse)).length===0 && <tr><td colSpan={7} style={{ textAlign:"center", padding:20, color:"#5a4a20" }}>No returns logged yet.</td></tr>}
                    {stockHistory.filter(h=>h.type==="return" && (!roleWarehouse || h.warehouse===roleWarehouse)).map((h,i) => (
                      <tr key={h.id||i}>
                        <td style={{ color:"#5a4a20" }}>{i+1}</td>
                        <td style={{ color:"#d4b96a", whiteSpace:"nowrap" }}>{formatDate(h.date)}</td>
                        <td><span className="wh-badge">{h.warehouse}</span></td>
                        <td style={{ fontWeight:600, color:"#f5e6b0" }}>{h.item}</td>
                        <td style={{ fontWeight:600, color:"#f5e6b0" }}>{h.vendor||"—"}</td>
                        <td style={{ color:"#a78bfa" }}>{h.technician||"—"}</td>
                        <td style={{ color:"#4ade80", fontWeight:700 }}>+{h.received} {h.unit}</td>
                        <td style={{ fontWeight:700 }}>{h.closing} {h.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab===TABS.REPORT && <ReportTab logs={logs} customers={customers} stock={stock} stockHistory={stockHistory} pureOilProducts={pureOilProducts} isAdmin={isAdmin} />}
        </>}
      </div>

      {/* ── MODALS ── */}

      {/* LOG SERVICE MODAL */}
      {showLogForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(4px)" }}>
          <div className="card slide-in" onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:660, margin:16, padding:24, maxHeight:"92vh", overflowY:"auto", background:"#0a0800", border:"1px solid #c9a84c" }}>
            <div style={{ fontWeight:700, fontSize:17, marginBottom:18, color:"#f5d060" }}>{editingLog ? "✎ Edit Service Log" : "📋 Log Service Visit"}</div>
            {editingLog && (
              <div style={{ background:"#1a1200", border:"1px solid #facc1560", borderRadius:8, padding:"10px 14px", fontSize:11, color:"#facc15", marginBottom:4 }}>
                ✎ <strong>Edit Mode</strong> — You can fix any product, qty, or machine code below.
                The available stock shown already accounts for what this log previously deducted.
                On save, old stock deductions are reversed and new ones applied automatically.
              </div>
            )}
            <div style={{ display:"grid", gap:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                <div>
                  <label>Customer *</label>
                  <div style={{ position:"relative" }}>
                    <input placeholder="Type to search..." value={selectedCustomer} onChange={e=>setSelectedCustomer(e.target.value)} />
                    {selectedCustomer && !customers.find(c=>c.name===selectedCustomer) && customers.filter(c=>c.name?.toLowerCase().includes(selectedCustomer.toLowerCase())).length>0 && (
                      <div style={{ position:"absolute", top:"110%", left:0, right:0, background:"#1a1500", border:"1px solid #c9a84c", borderRadius:8, maxHeight:180, overflowY:"auto", zIndex:50 }}>
                        {customers.filter(c=>c.name?.toLowerCase().includes(selectedCustomer.toLowerCase())).slice(0,10).map(c=>(
                          <div key={c.id} onClick={()=>setSelectedCustomer(c.name)} style={{ padding:"7px 12px", cursor:"pointer", fontSize:12, color:"#f0e6c0", borderBottom:"1px solid #2a2000" }} onMouseEnter={e=>e.currentTarget.style.background="#2a1a00"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{c.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div><label>Service Date</label><input type="date" value={serviceDate} onChange={e=>setServiceDate(e.target.value)} /></div>
                <div><label>Warehouse</label><select value={logWarehouse} onChange={e=>setLogWarehouse(e.target.value)}>{availableWarehouses.map(w=><option key={w} value={w}>{w}</option>)}</select></div>
              </div>
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <label style={{ margin:0 }}>Product Entries</label>
                  <button className="btn btn-outline" onClick={addLogProduct} style={{ padding:"4px 10px", fontSize:11 }}>+ Add Product</button>
                </div>
                {logProducts.map((p,i) => (
                  <div key={i} className="product-card">
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <span style={{ fontSize:11, color:"#c9a84c", fontWeight:700 }}>PRODUCT {i+1}</span>
                      {logProducts.length>1 && <button className="btn btn-danger" onClick={()=>removeLogProduct(i)}>✕ Remove</button>}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns: NEW_USED_CATEGORIES.includes(p.categoryKey) ? "150px 1fr 110px 80px" : "150px 1fr 80px", gap:8 }}>
                      <div>
                        <label>Category</label>
                        <select value={p.categoryKey} onChange={e=>updateLogProduct(i,"categoryKey",e.target.value)}>
                          {SERVICE_PRODUCT_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label>Product</label>
                        {(()=>{ const prods = p.categoryKey==="FINISHED_AROMA_OIL" ? getFinishedAromaOilProducts(logWarehouse) : getAllProducts(p.categoryKey); return prods.length>0 ? (
                          <select value={p.productName} onChange={e=>updateLogProduct(i,"productName",e.target.value)}>
                            {prods.map(pr=><option key={pr} value={pr}>{pr}</option>)}
                          </select>
                        ) : (
                          <input value={p.productName} onChange={e=>updateLogProduct(i,"productName",e.target.value)} placeholder="Enter product name" />
                        ); })()}
                      </div>
                      {NEW_USED_CATEGORIES.includes(p.categoryKey) && (
                        <div>
                          <label>Condition</label>
                          <select value={p.condition||"new"} onChange={e=>updateLogProduct(i,"condition",e.target.value)}>
                            <option value="new">🆕 New</option>
                            <option value="used">♻️ Used</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label>Qty</label>
                        <input type="number" min="0" step="0.01" value={p.qty} onChange={e=>updateLogProduct(i,"qty",e.target.value)}
                          style={{ borderColor:Number(p.qty)>getLogRowAvailability(i)?"#ef4444":"#3a2e10" }} />
                        <div style={{ fontSize:9, marginTop:2, color:Number(p.qty)>getLogRowAvailability(i)?"#ef4444":"#7a6a30" }}>
                          {editingLog ? "Avail (after reversal):" : "Avail:"} {getLogRowAvailability(i)} {SERVICE_PRODUCT_TYPES.find(t=>t.key===p.categoryKey)?.unit}
                        </div>
                      </div>
                    </div>
                    {needsMachineCode(p.categoryKey, p.productName) && (!p.qty || Number(p.qty)<=0) && (
                        <div style={{ fontSize:10, color:"#facc15", background:"#1a1200", border:"1px solid #facc1540", borderRadius:6, padding:"4px 8px", marginTop:4 }}>
                          ⚠ Enter quantity above to show machine code fields
                        </div>
                      )}
                    {needsMachineCode(p.categoryKey, p.productName) && Number(p.qty)>0 && (
                      <div style={{ marginTop:10, background:"#0a0800", border:"1px solid #3a2e10", borderRadius:8, padding:"10px 12px" }}>
                        <div style={{ fontSize:10, color:"#c9a84c", fontWeight:700, marginBottom:6, textTransform:"uppercase" }}>🔧 Machine Codes ({p.productName}) — 9 characters required</div>
                        {Array.from({length:parseInt(p.qty)||0},(_,ci)=>{
                          const codeVal = (p.machineCodes||[])[ci]||"";
                          const isValid = codeVal.trim().length === 9;
                          const isPartial = codeVal.trim().length > 0 && codeVal.trim().length < 9;
                          return (
                            <div key={ci} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                              <span style={{ fontSize:10, color:"#7a6a30", minWidth:60 }}>Unit {ci+1}:</span>
                              <div style={{ flex:1, position:"relative" }}>
                                <input className="machine-code-input" value={codeVal} onChange={e=>updateMachineCode(i,ci,e.target.value)} placeholder={`Machine code ${ci+1} (9 chars)`} maxLength={9}
                                  style={{ borderColor: isValid?"#4ade80":isPartial?"#facc15":"#ef444488", color: isValid?"#4ade80":"#f0e6c0", paddingRight:30 }} />
                                <span style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", fontSize:10, fontWeight:700, color: isValid?"#4ade80":isPartial?"#facc15":"#ef4444" }}>
                                  {isValid ? "✓" : `${codeVal.length}/9`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div><label>Technician Name *</label><select value={logTechnician} onChange={e=>setLogTechnician(e.target.value)}><option value="">Select technician...</option>{technicians.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              <div><label>Notes (optional)</label><textarea value={logNotes} onChange={e=>setLogNotes(e.target.value)} placeholder="Any notes..." rows={2} style={{ resize:"vertical" }} /></div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18, justifyContent:"flex-end" }}>
              <button className="btn btn-outline" onClick={()=>{ setShowLogForm(false); setEditingLog(null); setSelectedCustomer(""); setLogProducts([{...emptyProduct}]); setLogNotes(""); setLogTechnician(""); }}>Cancel</button>
              <button className="btn btn-gold" onClick={editingLog ? submitEditLog : submitLog} disabled={saving}>{saving ? "Saving..." : editingLog ? "✓ Save Changes" : "Save Service Log"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD STOCK MODAL */}
      {showStockForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(4px)" }}>
          <div className="card slide-in" onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:500, margin:16, padding:24, background:"#0a0800", border:"1px solid #c9a84c" }}>
            <div style={{ fontWeight:700, fontSize:17, marginBottom:18, color:"#f5d060" }}>📦 Add Stock Purchase</div>
            <div style={{ display:"grid", gap:12 }}>
              <div><label>Warehouse</label><select value={stockForm.warehouse} onChange={e=>{ setStockForm(f=>({...f,warehouse:e.target.value,productName:""})); setStockProductSearch(""); }}>{availableWarehouses.map(w=><option key={w} value={w}>{w}</option>)}</select></div>
              <div><label>Category</label><select value={stockForm.categoryKey} onChange={e=>{ const newCat=e.target.value; const prods=newCat==="FINISHED_AROMA_OIL"?getFinishedAromaOilProducts(stockForm.warehouse):getAllProducts(newCat); setStockForm(f=>({...f,categoryKey:newCat,productName:prods[0]||"",condition:"new"})); setStockProductSearch(""); }}>{Object.entries(CATEGORIES).map(([k,c])=><option key={k} value={k}>{c.icon} {c.label}</option>)}</select></div>
              <div>
                <label>Product</label>
                {(()=>{ const prods=stockForm.categoryKey==="FINISHED_AROMA_OIL"?getFinishedAromaOilProducts(stockForm.warehouse):getAllProducts(stockForm.categoryKey); return prods.length>0?(
                  <div style={{ position:"relative" }}>
                    <input placeholder="🔍 Type to search products..." value={stockForm.productName || stockProductSearch}
                      onChange={e=>{ setStockProductSearch(e.target.value); setStockForm(f=>({...f,productName:""})); }} />
                    {(!stockForm.productName || stockProductSearch) && (() => {
                      const filtered = prods.filter(p=>p.toLowerCase().includes(stockProductSearch.toLowerCase()));
                      return (
                        <div style={{ position:"absolute", top:"110%", left:0, right:0, background:"#1a1500", border:"1px solid #c9a84c", borderRadius:8, maxHeight:240, overflowY:"auto", zIndex:50 }}>
                          <div style={{ padding:"4px 12px", fontSize:9, color:"#7a6a30", borderBottom:"1px solid #2a2000", position:"sticky", top:0, background:"#1a1500" }}>
                            {filtered.length} product{filtered.length!==1?"s":""} {filtered.length>10?"— scroll for more ↓":""}
                          </div>
                          {filtered.slice(0,50).map(p=>(
                            <div key={p} onClick={()=>{ setStockForm(f=>({...f,productName:p})); setStockProductSearch(""); }}
                              style={{ padding:"8px 12px", cursor:"pointer", fontSize:12, color:"#f0e6c0", borderBottom:"1px solid #2a2000" }}
                              onMouseEnter={e=>e.currentTarget.style.background="#2a1a00"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{p}</div>
                          ))}
                          {filtered.length===0 && (
                            <div style={{ padding:"8px 12px", fontSize:12, color:"#5a4a20" }}>No matches found.</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ):(
                  <input value={stockForm.productName} onChange={e=>setStockForm(f=>({...f,productName:e.target.value}))} placeholder="Enter product name" />
                ); })()}
              </div>
              {NEW_USED_CATEGORIES.includes(stockForm.categoryKey) && (
                <div><label>Condition</label><select value={stockForm.condition||"new"} onChange={e=>setStockForm(f=>({...f,condition:e.target.value}))}><option value="new">🆕 New</option><option value="used">♻️ Used</option></select></div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><label>Quantity ({CATEGORIES[stockForm.categoryKey]?.unit})</label><input type="number" min="0" step="0.01" value={stockForm.qty} onChange={e=>setStockForm(f=>({...f,qty:e.target.value}))} placeholder="0" /></div>
                <div><label>Date Received</label><input type="date" value={stockForm.dateReceived} onChange={e=>setStockForm(f=>({...f,dateReceived:e.target.value}))} /></div>
              </div>
              <div><label>Vendor Name</label><input value={stockForm.vendor} onChange={e=>setStockForm(f=>({...f,vendor:e.target.value}))} placeholder="Supplier / Vendor name..." /></div>
              {!stockForm.productName.trim() ? (
                <div style={{ background:"#2d1515", border:"1px solid #ef444440", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#f87171" }}>
                  ⚠ Please select a product from the list above before saving.
                </div>
              ) : (
                <div style={{ background:"#1a1500", border:"1px solid #3a2e10", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#c9a84c" }}>
                  <strong style={{ color:"#f5e6b0" }}>{stockForm.productName}</strong> — Current: <strong style={{ color:"#f5d060" }}>{(NEW_USED_CATEGORIES.includes(stockForm.categoryKey)?getConditionQty(stockForm.categoryKey,stockForm.productName,stockForm.warehouse,stockForm.condition||"new"):getStockQty(stockForm.categoryKey,stockForm.productName,stockForm.warehouse))} {CATEGORIES[stockForm.categoryKey]?.unit}</strong>
                  {" → "}After: <strong style={{ color:"#4ade80" }}>{(NEW_USED_CATEGORIES.includes(stockForm.categoryKey)?getConditionQty(stockForm.categoryKey,stockForm.productName,stockForm.warehouse,stockForm.condition||"new"):getStockQty(stockForm.categoryKey,stockForm.productName,stockForm.warehouse))+Number(stockForm.qty||0)} {CATEGORIES[stockForm.categoryKey]?.unit}</strong>
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18, justifyContent:"flex-end" }}>
              <button className="btn btn-outline" onClick={()=>setShowStockForm(false)}>Cancel</button>
              <button className="btn btn-gold" onClick={submitStock} disabled={saving || !stockForm.productName.trim()}>{saving?"Saving...":"Add to Stock"}</button>
            </div>
          </div>
        </div>
      )}

      {/* RETURN MODAL */}
      {showReturnForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(4px)" }}>
          <div className="card slide-in" onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:500, margin:16, padding:24, background:"#0a0800", border:"1px solid #c9a84c", maxHeight:"92vh", overflowY:"auto" }}>
            <div style={{ fontWeight:700, fontSize:17, marginBottom:18, color:"#f5d060" }}>♻️ Return Item to Stock</div>
            <div style={{ display:"grid", gap:12 }}>
              <div><label>Category</label>
                <select value={returnForm.categoryKey} onChange={e=>{ const cat=e.target.value; setReturnForm(f=>({...f, categoryKey:cat, productName:"", machineCodes:[]})); setReturnProductSearch(""); }}>
                  <option value="FINISHED_AROMA_OIL">🧴 Finished Aroma Oil</option>
                  <option value="AROMA_DIFFUSER">💨 Aroma Diffuser</option>
                  <option value="AEROSOL_DISPENSER">🌀 Aerosol Dispenser</option>
                </select>
              </div>
              <div><label>Warehouse</label><select value={returnForm.warehouse} onChange={e=>{ const wh=e.target.value; setReturnForm(f=>({...f,warehouse:wh,productName:""})); setReturnProductSearch(""); }}>{availableWarehouses.map(w=><option key={w} value={w}>{w}</option>)}</select></div>
              <div>
                <label>{CATEGORIES[returnForm.categoryKey]?.label || "Product"}</label>
                {(()=>{ const prods = returnForm.categoryKey==="FINISHED_AROMA_OIL" ? getFinishedAromaOilProducts(returnForm.warehouse) : getAllProducts(returnForm.categoryKey); return prods.length>0?(
                  <div style={{ position:"relative" }}>
                    <input placeholder="🔍 Type to search products..." value={returnForm.productName || returnProductSearch}
                      onChange={e=>{ setReturnProductSearch(e.target.value); setReturnForm(f=>({...f,productName:""})); }} />
                    {(!returnForm.productName || returnProductSearch) && (() => {
                      const filtered = prods.filter(p=>p.toLowerCase().includes(returnProductSearch.toLowerCase()));
                      return (
                        <div style={{ position:"absolute", top:"110%", left:0, right:0, background:"#1a1500", border:"1px solid #c9a84c", borderRadius:8, maxHeight:240, overflowY:"auto", zIndex:50 }}>
                          <div style={{ padding:"4px 12px", fontSize:9, color:"#7a6a30", borderBottom:"1px solid #2a2000", position:"sticky", top:0, background:"#1a1500" }}>
                            {filtered.length} product{filtered.length!==1?"s":""} {filtered.length>10?"— scroll for more ↓":""}
                          </div>
                          {filtered.slice(0,50).map(p=>(
                            <div key={p} onClick={()=>{ setReturnForm(f=>({...f,productName:p,machineCodes:[]})); setReturnProductSearch(""); }}
                              style={{ padding:"8px 12px", cursor:"pointer", fontSize:12, color:"#f0e6c0", borderBottom:"1px solid #2a2000" }}
                              onMouseEnter={e=>e.currentTarget.style.background="#2a1a00"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{p}</div>
                          ))}
                          {filtered.length===0 && <div style={{ padding:"10px 12px", fontSize:11, color:"#7a6a30" }}>No matches found.</div>}
                        </div>
                      );
                    })()}
                  </div>
                ):(
                  <div style={{ fontSize:12, color:"#f87171", background:"#2d1515", border:"1px solid #f8717140", borderRadius:8, padding:"10px 14px" }}>No products found. Add one first via Stock → + Add Product.</div>
                ); })()}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><label>Quantity Returned</label><input type="number" min="0" step="0.01" value={returnForm.qty} onChange={e=>{ const val=e.target.value; setReturnForm(f=>{ const num=parseInt(val)||0; const isNewUsed=NEW_USED_CATEGORIES.includes(f.categoryKey); const codes = isNewUsed ? Array.from({length:num},(_,i)=>f.machineCodes?.[i]||"") : f.machineCodes; return {...f,qty:val,machineCodes:codes}; }); }} placeholder="0" /></div>
                <div><label>Return Date</label><input type="date" value={returnForm.date} onChange={e=>setReturnForm(f=>({...f,date:e.target.value}))} /></div>
              </div>
              <div>
                <label>Customer Name *</label>
                <select value={returnForm.customer} onChange={e=>setReturnForm(f=>({...f,customer:e.target.value}))}
                  style={{ borderColor: !returnForm.customer ? "#ef4444" : "#3a2e10" }}>
                  <option value="">Select customer...</option>
                  {customers.map((c:any)=><option key={c.id||c.name} value={c.name}>{c.name}</option>)}
                </select>
                {!returnForm.customer && <div style={{ fontSize:10, color:"#f87171", marginTop:2 }}>Required — select the customer returning the item</div>}
              </div>
              <div>
                <label>Technician *</label>
                <select value={returnForm.technician} onChange={e=>setReturnForm(f=>({...f,technician:e.target.value}))}
                  style={{ borderColor: !returnForm.technician ? "#ef4444" : "#3a2e10" }}>
                  <option value="">Select technician...</option>
                  {technicians.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
                {!returnForm.technician && <div style={{ fontSize:10, color:"#f87171", marginTop:2 }}>Required — select who handled the return</div>}
              </div>
              {NEW_USED_CATEGORIES.includes(returnForm.categoryKey) && Number(returnForm.qty)>0 && (
                <div style={{ background:"#0a0800", border:"1px solid #3a2e10", borderRadius:8, padding:"10px 12px" }}>
                  <div style={{ fontSize:10, color:"#c9a84c", fontWeight:700, marginBottom:6, textTransform:"uppercase" }}>🔧 Machine Codes — 9 characters required</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    {Array.from({length: parseInt(returnForm.qty)||0}).map((_,ci) => (
                      <input key={ci} value={returnForm.machineCodes?.[ci]||""} maxLength={9}
                        onChange={e=>{ const codes=[...(returnForm.machineCodes||[])]; codes[ci]=e.target.value; setReturnForm(f=>({...f,machineCodes:codes})); }}
                        placeholder={`Code #${ci+1}`}
                        style={{ borderColor:(returnForm.machineCodes?.[ci]||"").length===9?"#3a2e10":"#ef4444" }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18, justifyContent:"flex-end" }}>
              <button className="btn btn-outline" onClick={()=>setShowReturnForm(false)}>Cancel</button>
              <button className="btn btn-gold" onClick={submitReturn} disabled={saving || !returnForm.productName || !returnForm.customer || !returnForm.technician}>{saving?"Saving...":"Add Return to Stock"}</button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransferForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(4px)" }}>
          <div className="card slide-in" onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:500, margin:16, padding:24, background:"#0a0800", border:"1px solid #3b82f6" }}>
            <div style={{ fontWeight:700, fontSize:17, marginBottom:18, color:"#60a5fa" }}>⇄ Inter-Warehouse Transfer</div>
            <div style={{ display:"grid", gap:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><label>From Warehouse</label><select value={transferForm.fromWarehouse} onChange={e=>setTransferForm(f=>({...f,fromWarehouse:e.target.value}))}>{WAREHOUSES.map(w=><option key={w} value={w}>{w}</option>)}</select></div>
                <div><label>To Warehouse</label><select value={transferForm.toWarehouse} onChange={e=>setTransferForm(f=>({...f,toWarehouse:e.target.value}))}>{WAREHOUSES.map(w=><option key={w} value={w}>{w}</option>)}</select></div>
              </div>
              <div><label>Category</label><select value={transferForm.categoryKey} onChange={e=>{ const newCat=e.target.value; const prods=newCat==="FINISHED_AROMA_OIL"?getFinishedAromaOilProducts(transferForm.fromWarehouse):getAllProducts(newCat); setTransferForm(f=>({...f,categoryKey:newCat,productName:prods[0]||"",condition:"new"})); }}>{Object.entries(CATEGORIES).map(([k,c])=><option key={k} value={k}>{c.icon} {c.label}</option>)}</select></div>
              <div><label>Product</label>{(()=>{ const prods=transferForm.categoryKey==="FINISHED_AROMA_OIL"?getFinishedAromaOilProducts(transferForm.fromWarehouse):getAllProducts(transferForm.categoryKey); return prods.length>0?<select value={transferForm.productName} onChange={e=>setTransferForm(f=>({...f,productName:e.target.value}))}>{prods.map(p=><option key={p} value={p}>{p}</option>)}</select>:<input value={transferForm.productName} onChange={e=>setTransferForm(f=>({...f,productName:e.target.value}))} placeholder="Enter product name" />; })()}</div>
              {NEW_USED_CATEGORIES.includes(transferForm.categoryKey) && (
                <div><label>Condition</label><select value={transferForm.condition||"new"} onChange={e=>setTransferForm(f=>({...f,condition:e.target.value}))}><option value="new">🆕 New</option><option value="used">♻️ Used</option></select></div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><label>Quantity</label><input type="number" min="0" step="0.01" value={transferForm.qty} onChange={e=>setTransferForm(f=>({...f,qty:e.target.value}))} placeholder="0" /></div>
                <div><label>Transfer Date</label><input type="date" value={transferForm.date} onChange={e=>setTransferForm(f=>({...f,date:e.target.value}))} /></div>
              </div>
              <div style={{ background:"#0a0f1a", border:"1px solid #3b82f655", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#60a5fa" }}>
                Available in {transferForm.fromWarehouse}: <strong style={{ color:"#f5d060" }}>{(NEW_USED_CATEGORIES.includes(transferForm.categoryKey)?getConditionQty(transferForm.categoryKey,transferForm.productName,transferForm.fromWarehouse,transferForm.condition||"new"):getStockQty(transferForm.categoryKey,transferForm.productName,transferForm.fromWarehouse))} {CATEGORIES[transferForm.categoryKey]?.unit}</strong>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18, justifyContent:"flex-end" }}>
              <button className="btn btn-outline" onClick={()=>setShowTransferForm(false)}>Cancel</button>
              <button className="btn btn-transfer" onClick={submitTransfer} disabled={saving}>{saving?"Transferring...":"Confirm Transfer"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {showAddProductForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(4px)" }}>
          <div className="card slide-in" onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:420, margin:16, padding:24, background:"#0a0800", border:"1px solid #c9a84c", maxHeight:"92vh", overflowY:"auto" }}>
            <div style={{ fontWeight:700, fontSize:17, marginBottom:18, color:"#f5d060" }}>📦 Add New Product</div>
            <div style={{ display:"grid", gap:12 }}>
              <div><label>Category</label><select value={newProductForm.categoryKey} onChange={e=>setNewProductForm(f=>({...f,categoryKey:e.target.value}))}>{Object.entries(CATEGORIES).map(([k,c])=><option key={k} value={k}>{c.icon} {c.label}</option>)}</select></div>
              <div><label>Product Name</label><input value={newProductForm.productName} onChange={e=>setNewProductForm(f=>({...f,productName:e.target.value}))} placeholder="e.g. AAA Premium, New Scent..." onKeyDown={e=>e.key==="Enter"&&addNewProduct()} /></div>
              <div><label>Warehouse</label>
                {isAdmin ? (
                  <select value={newProductForm.warehouse} onChange={e=>setNewProductForm(f=>({...f,warehouse:e.target.value}))}>
                    <option value="ALL">All Warehouses</option>
                    {availableWarehouses.map(w=><option key={w} value={w}>{w}</option>)}
                  </select>
                ) : (
                  <div style={{ padding:"8px 12px", background:"#1a1400", border:"1px solid #3a2e10", borderRadius:8, color:"#f5e6b0", fontSize:13 }}>
                    🏭 {roleWarehouse} <span style={{ fontSize:10, color:"#7a6a30", marginLeft:6 }}>(your warehouse)</span>
                  </div>
                )}
              </div>
              <div style={{ fontSize:11, color:"#7a6a30" }}>
                Adds <strong>{CATEGORIES[newProductForm.categoryKey]?.label}</strong> product with 0 stock in{" "}
                {newProductForm.warehouse==="ALL" ? `all ${WAREHOUSES.length} warehouses` : <strong style={{ color:"#c9a84c" }}>{newProductForm.warehouse}</strong>}.
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18, justifyContent:"flex-end" }}>
              <button className="btn btn-outline" onClick={()=>setShowAddProductForm(false)}>Cancel</button>
              <button className="btn btn-gold" onClick={addNewProduct} disabled={saving || !newProductForm.productName.trim()}>{saving?"Saving...":"Add Product"}</button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER MODAL */}
      {showCustomerForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(4px)" }}>
          <div className="card slide-in" onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:440, margin:16, padding:24, background:"#0a0800", border:"1px solid #c9a84c" }}>
            <div style={{ fontWeight:700, fontSize:17, marginBottom:18, color:"#f5d060" }}>{editCustomerId?"✎ Edit Customer":"+ Add Customer"}</div>
            <div style={{ display:"grid", gap:12 }}>
              <div><label>Customer Name *</label><input value={customerForm.name} onChange={e=>setCustomerForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Emaar Properties" /></div>
              <div><label>Location</label><input value={customerForm.location} onChange={e=>setCustomerForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Dubai Marina" /></div>
              <div><label>No. of Machines</label><input type="number" min="1" value={customerForm.machines} onChange={e=>setCustomerForm(f=>({...f,machines:e.target.value}))} placeholder="0" /></div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18, justifyContent:"flex-end" }}>
              <button className="btn btn-outline" onClick={()=>setShowCustomerForm(false)}>Cancel</button>
              <button className="btn btn-gold" onClick={saveCustomer} disabled={saving}>{saving?"Saving...":editCustomerId?"Save Changes":"Add Customer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
