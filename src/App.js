import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

// ---- PromptPay QR — ใช้ promptpay.io (รับรองโดยธนาคารไทย) ----
function getPromptPayQRUrl(phone, amount, size = 240) {
  const clean = phone.replace(/\D/g, '');
  return `https://promptpay.io/${clean}/${amount}.png?s=${size}`;
}

function QRCode({ phone, amount, size = 240 }) {
  const [error, setError] = useState(false);
  const src = getPromptPayQRUrl(phone, amount, size);
  if (error) return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#999", textAlign: "center", padding: 16 }}>
      ไม่สามารถโหลด QR ได้<br/>กรุณาลองใหม่
    </div>
  );
  return <img src={src} width={size} height={size} alt="QR PromptPay" style={{ display: "block" }} onError={() => setError(true)} />;
}

// ---- Config ----
const PROMPTPAY    = "0860529870";
const ADMIN_SECRET = "345027";
const ZONES = {
  rin:  { label: "ห้องป้าริน",   rooms: [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,101,102,103] },
  luay: { label: "ห้องป้าหลวย", rooms: [1,2,3,4,5,6,7,8,9,10,11,12,13] },
};

// ---- Design tokens ----
const C = { accent:"#C8963E", accentLight:"#F5E6C8", dark:"#1A1208", mid:"#4A3820", light:"#FDF8F0" };
const S = {
  app:    { minHeight:"100vh", background:"linear-gradient(160deg,#FDF8F0 0%,#F5E6C8 50%,#EDD9A3 100%)", fontFamily:"'Sarabun',sans-serif", color:C.dark, display:"flex", flexDirection:"column", alignItems:"center" },
  header: { width:"100%", boxSizing:"border-box", padding:"18px 24px", background:C.dark, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 20px rgba(0,0,0,0.3)" },
  hTitle: { color:C.accent, fontSize:22, fontWeight:800, margin:0, userSelect:"none" },
  hSub:   { color:"#A08060", fontSize:13, marginTop:2 },
  backBtn:{ background:"none", border:"1px solid #555", color:"#AAA", borderRadius:8, padding:"6px 14px", fontSize:13, cursor:"pointer" },
  wrap:   { width:"100%", maxWidth:500, padding:"24px 20px", display:"flex", flexDirection:"column", gap:16, boxSizing:"border-box" },
  card:   { background:"#FFF", borderRadius:16, padding:20, boxShadow:"0 2px 16px rgba(200,150,62,0.12)", border:`1px solid ${C.accentLight}` },
  cTitle: { fontSize:16, fontWeight:700, color:C.mid, marginBottom:16 },
  label:  { fontSize:14, color:C.mid, marginBottom:8, display:"block", fontWeight:600 },
  input:  { width:"100%", padding:"14px 16px", borderRadius:12, border:`1.5px solid ${C.accentLight}`, fontSize:18, color:C.dark, background:C.light, outline:"none", boxSizing:"border-box", marginBottom:14 },
  btn:    { width:"100%", padding:16, borderRadius:12, border:"none", background:`linear-gradient(135deg,${C.accent},#A07030)`, color:"#FFF", fontSize:18, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px rgba(200,150,62,0.4)" },
  tabRow: { display:"flex", gap:8, marginBottom:14 },
  tab:  (on) => ({ flex:1, padding:12, borderRadius:12, cursor:"pointer", textAlign:"center", fontSize:15, border:`2px solid ${on?C.accent:C.accentLight}`, background:on?C.accentLight:"transparent", color:on?C.mid:"#AAA", fontWeight:on?700:400 }),
  ok:   { background:"#E8F5E9", color:"#2E7D32", borderRadius:10, padding:"12px 16px", fontSize:15, fontWeight:600, textAlign:"center", marginTop:8 },
  err:  { background:"#FFEBEE", color:"#C62828", borderRadius:10, padding:"12px 16px", fontSize:15, fontWeight:600, textAlign:"center", marginTop:8 },
  divider:{ height:1, background:C.accentLight, margin:"14px 0" },
  row:  { display:"flex", justifyContent:"space-between", fontSize:15, color:C.mid, marginBottom:8 },
  badge:{ background:C.dark, color:C.accent, borderRadius:12, padding:"8px 20px", fontWeight:700, fontSize:16, display:"inline-block" },
};

export default function App() {
  const [page, setPage]           = useState("tenant");
  const [roomData, setRoomData]   = useState([]);
  const [loading, setLoading]     = useState(false);

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

  const [secret, setSecret] = useState("");
  const [secErr, setSecErr] = useState(false);

  const [aZone,  setAZone]  = useState("rin");
  const [aRoom,  setARoom]  = useState("");
  const [aAmt,   setAAmt]   = useState("");
  const [aMonth, setAMonth] = useState("");
  const [aSaved, setASaved] = useState(false);
  const [aErr,   setAErr]   = useState("");

  const [tZone, setTZone] = useState("rin");
  const [tRoom, setTRoom] = useState("");
  const [tData, setTData] = useState(null);
  const [tErr,  setTErr]  = useState("");

  const thaiMonths = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  const now = new Date();
  const defMonth = `${thaiMonths[now.getMonth()]} ${now.getFullYear()+543}`;

  async function loadRooms() {
    setLoading(true);
    const { data, error } = await supabase.from("room_payments").select("*");
    if (!error && data) setRoomData(data);
    setLoading(false);
  }
  useEffect(() => { loadRooms(); }, []);

  async function doSave() {
    if (!aRoom || !aAmt) return;
    setAErr(""); setASaved(false);
    const payload = { zone: aZone, room: aRoom, amount: parseFloat(aAmt), month: aMonth || defMonth };
    const { error } = await supabase.from("room_payments").upsert(payload, { onConflict: "zone,room" });
    if (error) { setAErr("เกิดข้อผิดพลาด: " + error.message); return; }
    setASaved(true); setTimeout(() => setASaved(false), 2500);
    setARoom(""); setAAmt("");
    await loadRooms();
  }

  async function doDelete(zone, room) {
    await supabase.from("room_payments").delete().eq("zone", zone).eq("room", room);
    await loadRooms();
  }

  function doSearch() {
    if (!tRoom) return;
    const d = roomData.find(r => r.zone === tZone && String(r.room) === String(tRoom));
    if (d) { setTData(d); setTErr(""); }
    else   { setTData(null); setTErr("ยังไม่มียอดสำหรับห้องนี้\nกรุณาติดต่อเจ้าของหอพัก"); }
  }

  function doLogin() {
    if (secret === ADMIN_SECRET) { setSecErr(false); setSecret(""); setPage("admin"); }
    else { setSecErr(true); setSecret(""); }
  }

  // ===== TENANT =====
  if (page === "tenant") {
    return (
      <div style={S.app}>
        <div style={S.header}>
          <div onClick={handleLogoTap} style={{ cursor:"default" }}>
            <div style={S.hTitle}>🏠 ริน ห้องเช่า</div>
            <div style={S.hSub}>
              ชำระค่าเช่า
              {tapHint >= 2 && <span style={{ marginLeft:8, fontSize:11, color:"#666" }}>({5-tapHint} ครั้ง)</span>}
            </div>
          </div>
        </div>

        <div style={S.wrap}>
          <div style={S.card}>
            <div style={S.cTitle}>🔍 ค้นหายอดค่าเช่า</div>

            <label style={S.label}>โซนห้อง</label>
            <div style={S.tabRow}>
              {Object.entries(ZONES).map(([k,z]) => (
                <button key={k} style={S.tab(tZone===k)}
                  onClick={() => { setTZone(k); setTData(null); setTErr(""); setTRoom(""); }}>
                  {z.label}
                </button>
              ))}
            </div>

            <label style={S.label}>เลขห้องของคุณ</label>
            <input
              type="text" inputMode="numeric"
              placeholder={`เช่น ${ZONES[tZone].rooms.slice(0,3).join(", ")}...`}
              value={tRoom}
              onChange={e => { setTRoom(e.target.value); setTData(null); setTErr(""); }}
              onKeyDown={e => e.key==="Enter" && doSearch()}
              style={S.input}
            />
            <button style={S.btn} onClick={doSearch}>🔍 ดูยอดค่าเช่า</button>
            {tErr && <div style={S.err}>{tErr.split("\n").map((l,i) => <div key={i}>{l}</div>)}</div>}
          </div>

          {tData && (
            <div style={S.card}>
              <div style={{ textAlign:"center", marginBottom:14 }}>
                <span style={S.badge}>{ZONES[tData.zone].label} ห้อง {tData.room}</span>
                <div style={{ marginTop:10, fontSize:14, color:C.mid }}>{tData.month}</div>
              </div>
              <div style={S.divider}/>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, padding:"8px 0" }}>
                <div style={{ fontSize:14, color:C.mid }}>ยอดที่ต้องชำระ</div>
                <div style={{ fontSize:42, fontWeight:800, color:C.accent }}>฿{Number(tData.amount).toLocaleString()}</div>

                <div style={{ background:"#FFF", padding:14, borderRadius:18, boxShadow:"0 2px 24px rgba(0,0,0,0.12)", border:`3px solid ${C.accent}` }}>
                  <QRCode phone={PROMPTPAY} amount={Number(tData.amount)} size={240}/>
                </div>

                <div style={{ fontSize:14, color:C.mid, textAlign:"center", lineHeight:2 }}>
                  📱 สแกน QR ด้วยแอปธนาคาร<br/>รองรับ PromptPay ทุกธนาคาร
                </div>

                <div style={{ background:C.accentLight, borderRadius:12, padding:"12px 18px", fontSize:14, color:C.mid, width:"100%", boxSizing:"border-box" }}>
                  <div style={S.row}><span>เบอร์ PromptPay</span><span style={{fontWeight:700}}>{PROMPTPAY}</span></div>
                  <div style={S.row}><span>ชื่อบัญชี</span><span style={{fontWeight:700}}>ริน ห้องเช่า</span></div>
                  <div style={S.row}><span>ยอดเงิน</span><span style={{fontWeight:700, color:C.accent}}>฿{Number(tData.amount).toLocaleString()}</span></div>
                </div>

                <div style={{ background:"#FFF9E6", border:"1px solid #FFE082", borderRadius:12, padding:"12px 18px", fontSize:14, color:"#7B5800", width:"100%", boxSizing:"border-box", lineHeight:1.8 }}>
                  ⚠️ กรุณาตรวจสอบชื่อบัญชีและยอดเงิน<br/>ก่อนกดยืนยันการชำระเงินทุกครั้ง
                </div>
              </div>
            </div>
          )}
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
            <div style={S.hTitle}>🏠 ริน ห้องเช่า</div>
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
    const saved = [...roomData].sort((a,b) => {
      if (a.zone !== b.zone) return a.zone==="rin" ? -1 : 1;
      return parseInt(a.room) - parseInt(b.room);
    });
    return (
      <div style={S.app}>
        <div style={S.header}>
          <div>
            <div style={S.hTitle}>🏠 ริน ห้องเช่า</div>
            <div style={S.hSub}>จัดการยอดค่าเช่า</div>
          </div>
          <button style={S.backBtn} onClick={() => setPage("tenant")}>← ออก</button>
        </div>
        <div style={S.wrap}>
          <div style={S.card}>
            <div style={S.cTitle}>➕ กรอก / แก้ไขยอดค่าเช่า</div>

            <label style={S.label}>โซนห้อง</label>
            <div style={S.tabRow}>
              {Object.entries(ZONES).map(([k,z]) => (
                <button key={k} style={S.tab(aZone===k)} onClick={() => { setAZone(k); setARoom(""); }}>
                  {z.label}
                </button>
              ))}
            </div>

            <label style={S.label}>เลขห้อง</label>
            <input
              type="text" inputMode="numeric"
              placeholder={`เช่น ${ZONES[aZone].rooms.slice(0,3).join(", ")}...`}
              value={aRoom} onChange={e => setARoom(e.target.value)}
              style={S.input}
            />

            <label style={S.label}>ยอดที่ต้องชำระ (บาท)</label>
            <input
              type="number" inputMode="decimal" placeholder="เช่น 2500"
              value={aAmt} onChange={e => setAAmt(e.target.value)}
              style={S.input}
            />

            <label style={S.label}>เดือน (ค่าเริ่มต้น: {defMonth})</label>
            <input
              type="text" placeholder={defMonth}
              value={aMonth} onChange={e => setAMonth(e.target.value)}
              style={S.input}
            />

            <button style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} onClick={doSave} disabled={loading}>
              💾 บันทึกยอด
            </button>
            {aSaved && <div style={S.ok}>✅ บันทึกเรียบร้อยแล้ว</div>}
            {aErr   && <div style={S.err}>{aErr}</div>}
          </div>

          <div style={S.card}>
            <div style={S.cTitle}>
              📋 ยอดที่บันทึกแล้ว ({saved.length} ห้อง)
              {loading && <span style={{ fontSize:12, color:"#999", marginLeft:8 }}>กำลังโหลด...</span>}
            </div>
            {saved.length === 0 && !loading && (
              <div style={{ fontSize:14, color:"#999", textAlign:"center", padding:"16px 0" }}>ยังไม่มีข้อมูล</div>
            )}
            <div style={{ maxHeight:360, overflowY:"auto" }}>
              {saved.map((r,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${C.accentLight}`, paddingBottom:10, marginBottom:10 }}>
                  <div>
                    <span style={{ fontWeight:700 }}>{ZONES[r.zone].label} ห้อง {r.room}</span>
                    <span style={{ fontSize:12, color:"#999", marginLeft:6 }}>{r.month}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontWeight:700, color:C.accent }}>฿{Number(r.amount).toLocaleString()}</span>
                    <button
                      onClick={() => doDelete(r.zone, r.room)}
                      style={{ background:"none", border:"1px solid #FFCDD2", color:"#E53935", borderRadius:6, padding:"3px 10px", fontSize:12, cursor:"pointer" }}>
                      ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
