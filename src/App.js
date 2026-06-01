import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

// ---- PromptPay QR ----
function getPromptPayQRUrl(phone, amount, size = 240) {
  const clean = phone.replace(/\D/g, '');
  return `https://promptpay.io/${clean}/${amount}.png?s=${size}`;
}

function QRCode({ phone, amount, size = 240 }) {
  const [error, setError] = useState(false);
  const src = getPromptPayQRUrl(phone, amount, size);
  if (error) return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#999", textAlign: "center", padding: 16 }}>
      ไม่สามารถโหลด QR ได้<br/>กรุณาลองใหม่
    </div>
  );
  return <img src={src} width={size} height={size} alt="QR PromptPay" style={{ display: "block" }} onError={() => setError(true)} />;
}

// ---- Google Sheets fetch ----
const SHEET_ID = "15ktYmmHn_7oPsulpi9cu8R1JoSYoS6mTKIzjg5VWpEg";
const SHEET_NAME = "WebData";

async function fetchSheetData() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)[1]);
  const table = json.table;
  if (!table || !table.rows) return [];

  // แมปหัวตารางตามลำดับคอลัมน์ (A=Zone, B=ห้อง, C=เดือน, D=ค่าห้อง, E=ค่าไฟ, F=ค่าน้ำ, G=ที่จอดรถ, H=ค่าขยะ, I=รวม)
  const COL_KEYS = ["Zone","ห้อง","เดือน","ค่าห้อง","ค่าไฟ","ค่าน้ำ","ที่จอดรถ","ค่าขยะ","รวม"];

  return table.rows
    .filter(row => row.c && row.c[0] && row.c[0].v)
    .map(row => {
      const obj = {};
      COL_KEYS.forEach((key, i) => {
        const cell = row.c[i];
        if (!cell || cell.v == null) { obj[key] = ""; return; }
        // จัดการ Date format
        if (typeof cell.v === "string" && cell.v.startsWith("Date(")) {
          obj[key] = cell.f || cell.v; // ใช้ formatted value ถ้ามี
        } else {
          obj[key] = cell.f != null ? String(cell.f) : String(cell.v);
        }
      });
      return obj;
    });
}

// ---- Line Notify ----
const LINE_TOKEN = "vAiPcfUQQZXZ64SY2qt3w6h+4nwwOpL/vNR6ILFYul7Xu52AzMGCrhmU/PlT1z2GoF1D+JVGrtsJrQTcUAtB0LidTQU4kkM6UUTrEWuURrycDmDSZN8dsrFmuULH9C/NucvUrCg0sAaAY2dP7CrpkgdB04t89/1O/w1cDnyilFU=";
const LINE_USER_ID = "Ue60d152d2b4fb9073904896bd0096b7a";
const WEB_URL = "https://rin-payment-zqpc.vercel.app";

async function sendLineMessage(message) {
  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LINE_TOKEN}`,
      },
      body: JSON.stringify({
        to: LINE_USER_ID,
        messages: [{ type: "text", text: message }],
      }),
    });
    return true;
  } catch(e) {
    return false;
  }
}
const PROMPTPAY    = "0860529870";
const ADMIN_SECRET = "345027";
const ZONES = {
  rin:  { label: "ห้องป้าริน",   rooms: [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,101,102,103] },
  luay: { label: "ห้องป้าหลวย", rooms: ["บ้าน",1,2,3,4,5,6,7,8,9,10,11,12] },
};

// ---- Design tokens (ตัวใหญ่ขึ้น เหมาะคนแก่) ----
const C = { accent:"#C8963E", accentLight:"#F5E6C8", dark:"#1A1208", mid:"#4A3820", light:"#FDF8F0" };
const S = {
  app:    { minHeight:"100vh", background:"linear-gradient(160deg,#FDF8F0 0%,#F5E6C8 50%,#EDD9A3 100%)", fontFamily:"'Sarabun',sans-serif", color:C.dark, display:"flex", flexDirection:"column", alignItems:"center" },
  header: { width:"100%", boxSizing:"border-box", padding:"20px 24px", background:C.dark, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 20px rgba(0,0,0,0.3)" },
  hTitle: { color:C.accent, fontSize:24, fontWeight:800, margin:0, userSelect:"none" },
  hSub:   { color:"#A08060", fontSize:14, marginTop:3 },
  backBtn:{ background:"none", border:"1px solid #555", color:"#AAA", borderRadius:8, padding:"8px 16px", fontSize:14, cursor:"pointer" },
  wrap:   { width:"100%", maxWidth:520, padding:"24px 20px", display:"flex", flexDirection:"column", gap:18, boxSizing:"border-box" },
  card:   { background:"#FFF", borderRadius:18, padding:24, boxShadow:"0 2px 16px rgba(200,150,62,0.12)", border:`1px solid ${C.accentLight}` },
  cTitle: { fontSize:18, fontWeight:700, color:C.mid, marginBottom:18 },
  label:  { fontSize:16, color:C.mid, marginBottom:8, display:"block", fontWeight:700 },
  input:  { width:"100%", padding:"16px 18px", borderRadius:14, border:`2px solid ${C.accentLight}`, fontSize:20, color:C.dark, background:C.light, outline:"none", boxSizing:"border-box", marginBottom:16 },
  btn:    { width:"100%", padding:18, borderRadius:14, border:"none", background:`linear-gradient(135deg,${C.accent},#A07030)`, color:"#FFF", fontSize:20, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px rgba(200,150,62,0.4)" },
  tabRow: { display:"flex", gap:10, marginBottom:16 },
  tab:  (on) => ({ flex:1, padding:14, borderRadius:14, cursor:"pointer", textAlign:"center", fontSize:16, border:`2px solid ${on?C.accent:C.accentLight}`, background:on?C.accentLight:"transparent", color:on?C.mid:"#AAA", fontWeight:on?700:400 }),
  ok:   { background:"#E8F5E9", color:"#2E7D32", borderRadius:12, padding:"14px 18px", fontSize:16, fontWeight:600, textAlign:"center", marginTop:10 },
  err:  { background:"#FFEBEE", color:"#C62828", borderRadius:12, padding:"14px 18px", fontSize:16, fontWeight:600, textAlign:"center", marginTop:10 },
  divider:{ height:1, background:C.accentLight, margin:"16px 0" },
  row:  { display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:17, color:C.mid, marginBottom:10, padding:"6px 0" },
  rowBorder: { display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:17, color:C.mid, marginBottom:10, padding:"10px 0", borderBottom:`1px solid ${C.accentLight}` },
  badge:{ background:C.dark, color:C.accent, borderRadius:12, padding:"10px 22px", fontWeight:700, fontSize:18, display:"inline-block" },
  totalRow: { display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:20, fontWeight:800, color:C.dark, marginTop:4, padding:"12px 0", borderTop:`2px solid ${C.accent}` },
};

// ---- รายการค่าใช้จ่าย (key ต้องตรงกับหัวตารางใน Google Sheets เป๊ะๆ) ----
const EXPENSE_LABELS = {
  "ค่าห้อง":   { label: "ค่าห้อง",   icon: "🏠" },
  "ค่าไฟ":     { label: "ค่าไฟฟ้า",  icon: "⚡" },
  "ค่าน้ำ":    { label: "ค่าน้ำ",     icon: "💧" },
  "ที่จอดรถ":  { label: "ที่จอดรถ",  icon: "🚗" },
  "ค่าขยะ":    { label: "ค่าขยะ",    icon: "🗑️" },
};

export default function App() {
  const [page, setPage]             = useState("zoneSelect");
  const [sheetData, setSheetData]   = useState([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetErr, setSheetErr]     = useState("");

  // tap-to-admin
  const tapCount = useRef(0);
  const tapTimer = useRef(null);
  const [tapHint, setTapHint] = useState(0);

  function handleLogoTap() {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCount.current >= 5) {
      tapCount.current = 0; setTapHint(0); setPage("adminLogin");
    } else {
      setTapHint(tapCount.current);
      tapTimer.current = setTimeout(() => { tapCount.current = 0; setTapHint(0); }, 2000);
    }
  }

  // โหลดข้อมูลจาก Google Sheets
  async function loadSheet() {
    setSheetLoading(true); setSheetErr("");
    try {
      const data = await fetchSheetData();
      setSheetData(data);
    } catch(e) {
      setSheetErr("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่");
    }
    setSheetLoading(false);
  }

  useEffect(() => { loadSheet(); }, []);

  // admin login
  const [secret, setSecret] = useState("");
  const [secErr, setSecErr] = useState(false);

  // admin form (Supabase — เก็บยอดรวม)
  const [aZone,  setAZone]  = useState("rin");
  const [aRoom,  setARoom]  = useState("");
  const [aAmt,   setAAmt]   = useState("");
  const [aMonth, setAMonth] = useState("");
  const [aSaved, setASaved] = useState(false);
  const [aErr,   setAErr]   = useState("");
  const [roomData, setRoomData] = useState([]);

  async function loadRooms() {
    const { data } = await supabase.from("room_payments").select("*");
    if (data) setRoomData(data);
  }
  useEffect(() => { loadRooms(); }, []);

  async function doSave() {
    if (!aRoom || !aAmt) return;
    setAErr(""); setASaved(false);
    const { error } = await supabase.from("room_payments").upsert(
      { zone: aZone, room: aRoom, amount: parseFloat(aAmt), month: aMonth || defMonth },
      { onConflict: "zone,room" }
    );
    if (error) { setAErr("เกิดข้อผิดพลาด: " + error.message); return; }
    setASaved(true); setTimeout(() => setASaved(false), 2500);
    setARoom(""); setAAmt("");
    await loadRooms();
  }

  async function doDelete(zone, room) {
    await supabase.from("room_payments").delete().eq("zone", zone).eq("room", room);
    await loadRooms();
  }

  const [lineSending, setLineSending] = useState(false);
  const [lineSent,    setLineSent]    = useState("");
  const [lineErr,     setLineErr]     = useState("");

  async function doSendBill(zone, room, amount, month) {
    setLineSending(true); setLineSent(""); setLineErr("");
    const zoneLabel = ZONES[zone].label;
    const link = `${WEB_URL}`;
    const msg =
`🏠 ป้าริน ห้องเช่า — แจ้งยอดค่าเช่า
━━━━━━━━━━━━━━━
📌 ${zoneLabel} ห้อง ${room}
📅 เดือน: ${month}
💰 ยอดที่ต้องชำระ: ฿${Number(amount).toLocaleString()}
━━━━━━━━━━━━━━━
🔗 กดลิงก์เพื่อชำระเงิน:
${link}

(เลือกโซน "${zoneLabel}" แล้วกรอกห้อง ${room})`;

    const ok = await sendLineMessage(msg);
    if (ok) { setLineSent(`ส่งบิลห้อง ${room} สำเร็จ!`); setTimeout(() => setLineSent(""), 3000); }
    else setLineErr("ส่ง Line ไม่สำเร็จ กรุณาลองใหม่");
    setLineSending(false);
  }
  const [tZone, setTZone] = useState("rin");
  const [tRoom, setTRoom] = useState("");
  const [tData, setTData] = useState(null);   // from Supabase (ยอดรวม)
  const [tSheet, setTSheet] = useState(null); // from Google Sheets (รายละเอียด)
  const [tErr,  setTErr]  = useState("");

  function doSearch() {
    if (!tRoom) return;
    // ค้นจาก Supabase ก่อน
    const d = roomData.find(r => r.zone === tZone && String(r.room) === String(tRoom));
    // ค้นจาก Google Sheets (Zone = "ป้าริน" หรือ "ป้าหลวย")
    const zoneLabel = tZone === "rin" ? "ริน" : "หลวย";
    const s = sheetData.find(r => r["Zone"] === zoneLabel && String(r["ห้อง"]) === String(tRoom));
    if (d || s) {
      setTData(d || null);
      setTSheet(s || null);
      setTErr("");
    } else {
      setTData(null); setTSheet(null);
      setTErr("ยังไม่มียอดสำหรับห้องนี้\nกรุณาติดต่อเจ้าของหอพัก");
    }
  }

  function doLogin() {
    if (secret === ADMIN_SECRET) { setSecErr(false); setSecret(""); setPage("admin"); }
    else { setSecErr(true); setSecret(""); }
  }

  const thaiMonths = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  const now = new Date();
  const defMonth = `${thaiMonths[now.getMonth()]} ${now.getFullYear()+543}`;

  // ยอดรวมและรายละเอียด
  const displayAmount = tData?.amount || (tSheet?.["รวม"] ? parseFloat(tSheet["รวม"]) : null);
  const displayMonth  = tData?.month || tSheet?.["เดือน"] || defMonth;

  // ===== TENANT (หน้าเดียว 2 โซน) =====
  if (page === "zoneSelect" || page === "tenant") {

    const ZoneCard = ({ zoneKey }) => {
      const [room, setRoom]   = useState("");
      const [data, setData]   = useState(null);
      const [sheet, setSheet] = useState(null);
      const [err, setErr]     = useState("");

      const zone = ZONES[zoneKey];
      const isBlue  = zoneKey === "rin";
      const hdColor = isBlue ? "#1565C0" : "#2E7D32";

      function search() {
        if (!room) return;
        const zoneLabel = zoneKey === "rin" ? "ริน" : "หลวย";
        const d = roomData.find(r => r.zone === zoneKey && String(r.room) === String(room));
        const s = sheetData.find(r => r["Zone"] === zoneLabel && String(r["ห้อง"]) === String(room));
        if (d || s) { setData(d||null); setSheet(s||null); setErr(""); }
        else { setData(null); setSheet(null); setErr("ยังไม่มียอดห้องนี้\nกรุณาติดต่อเจ้าของหอพัก"); }
      }

      const amt   = data?.amount || (sheet?.["รวม"] ? parseFloat(sheet["รวม"]) : null);
      const month = data?.month  || sheet?.["เดือน"] || defMonth;

      return (
        <div style={{ ...S.card, padding:0, overflow:"hidden" }}>
          {/* หัวการ์ด */}
          <div style={{ background:hdColor, padding:"14px 18px" }}>
            <div style={{ color:"#FFF", fontWeight:800, fontSize:18 }}>🏠 {zone.label}</div>
          </div>

          <div style={{ padding:"16px 18px" }}>
            <label style={S.label}>เลขห้องของคุณ</label>
            <input
              type="text"
              inputMode={zoneKey === "luay" ? "text" : "numeric"}
              placeholder={`เช่น ${zone.rooms.slice(0,3).join(", ")}...`}
              value={room}
              onChange={e => { setRoom(e.target.value); setData(null); setSheet(null); setErr(""); }}
              onKeyDown={e => e.key==="Enter" && search()}
              style={S.input}
            />
            <button
              style={{ ...S.btn, background:`linear-gradient(135deg,${hdColor},${isBlue?"#0D47A1":"#1B5E20"})`, boxShadow:`0 4px 14px ${isBlue?"rgba(21,101,192,0.4)":"rgba(46,125,50,0.4)"}` }}
              onClick={search}>
              🔍 ดูยอดค่าเช่า
            </button>
            {err && <div style={S.err}>{err.split("\n").map((l,i)=><div key={i}>{l}</div>)}</div>}
          </div>

          {/* ผลลัพธ์ */}
          {(data || sheet) && amt && (
            <div style={{ padding:"0 18px 18px" }}>
              <div style={S.divider}/>
              <div style={{ textAlign:"center", marginBottom:12 }}>
                <span style={{ ...S.badge, background:hdColor }}>{zone.label} ห้อง {room}</span>
                <div style={{ marginTop:8, fontSize:13, color:C.mid }}>{month}</div>
              </div>

              {sheet && (
                <div style={{ marginBottom:8 }}>
                  {Object.entries(EXPENSE_LABELS).map(([key, { label, icon }]) => {
                    const val = parseFloat(sheet[key]);
                    if (!val || val === 0) return null;
                    return (
                      <div key={key} style={S.rowBorder}>
                        <span style={{ fontSize:16 }}>{icon} {label}</span>
                        <span style={{ fontWeight:600, fontSize:16 }}>฿{val.toLocaleString()}</span>
                      </div>
                    );
                  })}
                  <div style={S.totalRow}>
                    <span>💰 ยอดรวม</span>
                    <span style={{ color:C.accent }}>฿{amt.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {!sheet && (
                <div style={{ textAlign:"center", marginBottom:12 }}>
                  <div style={{ fontSize:13, color:C.mid }}>ยอดที่ต้องชำระ</div>
                  <div style={{ fontSize:38, fontWeight:800, color:C.accent }}>฿{amt.toLocaleString()}</div>
                </div>
              )}

              <div style={S.divider}/>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
                <div style={{ fontSize:15, color:C.mid, fontWeight:600 }}>สแกน QR เพื่อชำระเงิน</div>
                <div style={{ background:"#FFF", padding:12, borderRadius:16, boxShadow:"0 2px 20px rgba(0,0,0,0.12)", border:`3px solid ${C.accent}` }}>
                  <QRCode phone={PROMPTPAY} amount={amt} size={220}/>
                </div>
                <div style={{ background:C.accentLight, borderRadius:12, padding:"12px 16px", fontSize:15, color:C.mid, width:"100%", boxSizing:"border-box" }}>
                  <div style={S.row}><span>PromptPay</span><span style={{fontWeight:700}}>{PROMPTPAY}</span></div>
                  <div style={S.row}><span>ชื่อบัญชี</span><span style={{fontWeight:700}}>ป้าริน ห้องเช่า</span></div>
                  <div style={S.row}><span>ยอดเงิน</span><span style={{fontWeight:800, color:C.accent, fontSize:17}}>฿{amt.toLocaleString()}</span></div>
                </div>
                <div style={{ background:"#FFF9E6", border:"1px solid #FFE082", borderRadius:12, padding:"12px 16px", fontSize:14, color:"#7B5800", width:"100%", boxSizing:"border-box", lineHeight:1.8 }}>
                  ⚠️ ตรวจสอบชื่อและยอดก่อนชำระทุกครั้ง
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div style={S.app}>
        <div style={S.header}>
          <div onClick={handleLogoTap} style={{ cursor:"default" }}>
            <div style={S.hTitle}>🏠 ป้าริน ห้องเช่า</div>
            <div style={S.hSub}>
              ชำระค่าเช่า
              {tapHint >= 2 && <span style={{ marginLeft:8, fontSize:12, color:"#666" }}>({5-tapHint} ครั้ง)</span>}
            </div>
          </div>
          {sheetLoading && <span style={{ color:"#888", fontSize:13 }}>กำลังโหลด...</span>}
        </div>

        <div style={S.wrap}>
          {sheetErr && <div style={S.err}>⚠️ {sheetErr} <button onClick={loadSheet} style={{ marginLeft:8, background:"none", border:"none", color:"#C62828", textDecoration:"underline", cursor:"pointer" }}>ลองใหม่</button></div>}
          <ZoneCard zoneKey="rin" />
          <ZoneCard zoneKey="luay" />
        </div>
      </div>
    );
  }

  // ===== ADMIN LOGIN =====
  if (page === "adminLogin") {
    return (
      <div style={S.app}>
        <div style={S.header}>
          <div>
            <div style={S.hTitle}>🏠 ป้าริน ห้องเช่า</div>
            <div style={S.hSub}>เข้าสู่ระบบผู้ดูแล</div>
          </div>
          <button style={S.backBtn} onClick={() => { setPage("tenant"); setSecret(""); setSecErr(false); }}>← กลับ</button>
        </div>
        <div style={S.wrap}>
          <div style={S.card}>
            <div style={S.cTitle}>🔐 ใส่รหัสผ่าน</div>
            <input
              type="password" inputMode="numeric"
              placeholder="รหัสผ่าน..."
              value={secret}
              onChange={e => { setSecret(e.target.value); setSecErr(false); }}
              onKeyDown={e => e.key==="Enter" && doLogin()}
              style={S.input}
            />
            {secErr && <div style={S.err}>❌ รหัสไม่ถูกต้อง</div>}
            <button style={S.btn} onClick={doLogin}>เข้าสู่ระบบ</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== ADMIN =====
  if (page === "admin") {
    const rinData  = sheetData.filter(r => r["Zone"] === "ริน");
    const luayData = sheetData.filter(r => r["Zone"] === "หลวย");

    const TableSection = ({ title, data, bgColor }) => (
      <div style={S.card}>
        <div style={{ ...S.cTitle, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>{title} ({data.length} ห้อง)</span>
        </div>
        {data.length === 0 ? (
          <div style={{ fontSize:14, color:"#999", textAlign:"center", padding:16 }}>ไม่มีข้อมูล</div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:C.dark, color:C.accent }}>
                  {["ห้อง","เดือน","ค่าห้อง","ค่าไฟ","ค่าน้ำ","ที่จอดรถ","ค่าขยะ","รวม"].map(h => (
                    <th key={h} style={{ padding:"8px 10px", textAlign:"center", whiteSpace:"nowrap", fontWeight:700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => {
                  const total = parseFloat(r["รวม"]) || 0;
                  return (
                    <tr key={i} style={{ background: i%2===0 ? bgColor : "#FFFFFF" }}>
                      <td style={{ padding:"8px 10px", textAlign:"center", fontWeight:700 }}>{r["ห้อง"]}</td>
                      <td style={{ padding:"8px 10px", textAlign:"center", color:"#888", fontSize:12 }}>{r["เดือน"]}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right" }}>{Number(r["ค่าห้อง"]||0).toLocaleString()}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right" }}>{Number(r["ค่าไฟ"]||0).toLocaleString()}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right" }}>{Number(r["ค่าน้ำ"]||0).toLocaleString()}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right" }}>{Number(r["ที่จอดรถ"]||0).toLocaleString()}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right" }}>{Number(r["ค่าขยะ"]||0).toLocaleString()}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:800, color:C.accent }}>฿{total.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );

    return (
      <div style={S.app}>
        <div style={S.header}>
          <div>
            <div style={S.hTitle}>🏠 ป้าริน ห้องเช่า</div>
            <div style={S.hSub}>หน้า Admin — ดูยอดทุกห้อง</div>
          </div>
          <button style={S.backBtn} onClick={() => setPage("tenant")}>← ออก</button>
        </div>
        <div style={S.wrap}>

          {/* Google Sheets status */}
          <div style={{ ...S.card, padding:"14px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:C.mid }}>📊 Google Sheets</div>
                <div style={{ fontSize:13, color:"#999", marginTop:2 }}>
                  {sheetLoading ? "กำลังโหลด..." : sheetErr ? "โหลดไม่สำเร็จ" : `โหลดแล้ว ${sheetData.length} ห้อง`}
                </div>
              </div>
              <button onClick={loadSheet} style={{ background:C.accentLight, border:`1px solid ${C.accent}`, color:C.mid, borderRadius:10, padding:"8px 16px", fontSize:14, cursor:"pointer", fontWeight:600 }}>
                🔄 รีโหลด
              </button>
            </div>
            {sheetErr && <div style={{ ...S.err, marginTop:10 }}>⚠️ {sheetErr}</div>}
          </div>

          {/* ตารางห้องป้าริน */}
          {!sheetLoading && <TableSection title="🏠 ห้องป้าริน" data={rinData} bgColor="F0F6FF" />}

          {/* ตารางห้องป้าหลวย */}
          {!sheetLoading && <TableSection title="🏠 ห้องป้าหลวย" data={luayData} bgColor="F0FFF4" />}

          {sheetLoading && (
            <div style={{ ...S.card, textAlign:"center", padding:32 }}>
              <div style={{ fontSize:16, color:"#999" }}>⏳ กำลังโหลดข้อมูลจาก Google Sheets...</div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return null;
}
