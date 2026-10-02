import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
const email = "demo@rekammedisku.test";
const password = "12341234";

if (!url || !publishable) {
  throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY required");
}

const sessionClient = createClient(url, publishable, { auth: { persistSession: false } });
const signInRes = await sessionClient.auth.signInWithPassword({ email, password });
if (signInRes.error) throw signInRes.error;

const userId = signInRes.data.user.id;
const now = new Date();
const iso = (daysAgo, hours = 8) => {
  const d = new Date(now.getTime() - daysAgo * 86400000);
  d.setHours(hours, 0, 0, 0);
  return d.toISOString();
};
const dateStr = (daysAgo) => iso(daysAgo).slice(0, 10);

// Get existing template
const templatesRes = await sessionClient
  .from("templates")
  .select("id, name")
  .eq("user_id", userId)
  .eq("is_system_owned", false)
  .eq("is_archived", false)
  .order("created_at", { ascending: true })
  .limit(1)
  .single();

if (templatesRes.error) throw templatesRes.error;
const templateId = templatesRes.data.id;

// Create Pediatrics rotation
const rotPediatrics = crypto.randomUUID();
const rotationRow = {
  id: rotPediatrics,
  user_id: userId,
  name: "Stase Ilmu Kesehatan Anak",
  specialty: "Pediatri",
  institution: "RSUP Dr. Sardjito",
  start_date: dateStr(18),
  end_date: dateStr(-50),
  status: "Selesai",
  follow_up_template_id: templateId,
  follow_up_template_version: 1,
};

const rotRes = await sessionClient.from("rotations").upsert([rotationRow], { onConflict: "id" }).select();
if (rotRes.error) throw rotRes.error;

// Pediatric patients
const patientDefs = [
  {
    name: "An. Aisha Zahra",
    age: 3,
    gender: "Perempuan",
    rm: "RM-ANAK-05201",
    room: "Bangsal Anak Flamboyan 2",
    bed: "2A",
    doctor: "dr. Lestari Sp.A",
    status: "Aktif",
    admission_date: dateStr(4),
    admission_complaint: "Demam tinggi mendadak hari ke-3, rewel, nafsu makan menurun, muntah 2x.",
    rotation_id: rotPediatrics,
  },
  {
    name: "An. Rafif Akbar",
    age: 7,
    gender: "Laki-laki",
    rm: "RM-ANAK-05208",
    room: "Bangsal Anak Flamboyan 3",
    bed: "3B",
    doctor: "dr. Lestari Sp.A",
    status: "Aktif",
    admission_date: dateStr(6),
    admission_complaint: "Sesak napas sejak 2 hari SMRS, batuk berdahak, demam ringan, riwayat asma.",
    rotation_id: rotPediatrics,
  },
  {
    name: "An. Zahra Amira",
    age: 5,
    gender: "Perempuan",
    rm: "RM-ANAK-05212",
    room: "Bangsal Anak Melati Anak 1",
    bed: "1C",
    doctor: "dr. Budi Sp.A(K)",
    status: "Aktif",
    admission_date: dateStr(3),
    admission_complaint: "Diare cair 5-6x/hari sejak 3 hari, muntah (+), lemas, turgor kulit menurun.",
    rotation_id: rotPediatrics,
  },
  {
    name: "An. Farhan Rizqi",
    age: 9,
    gender: "Laki-laki",
    rm: "RM-ANAK-05220",
    room: "Bangsal Anak Melati Anak 2",
    bed: "2D",
    doctor: "dr. Budi Sp.A(K)",
    status: "Aktif",
    admission_date: dateStr(2),
    admission_complaint: "Nyeri perut kanan bawah, mual, demam subfebris, BAB normal.",
    rotation_id: rotPediatrics,
  },
];

const patientRows = patientDefs.map((p) => ({
  ...p,
  user_id: userId,
  current_location_name: p.room,
}));

const patientsRes = await sessionClient.from("patients").insert(patientRows).select("id, name, rm");
if (patientsRes.error) throw patientsRes.error;
const patientMap = Object.fromEntries(patientsRes.data.map((p) => [p.name, p.id]));

// Follow-Ups (SOAP Pediatrics)
const followUpList = [
  {
    patientName: "An. Aisha Zahra",
    number: 1,
    daysAgo: 2,
    time: "08:00:00",
    s: "Demam hari ke-3 masih tinggi 39.2 °C, anak rewel menangis terus, tidak mau makan. Muntah 1x tadi pagi sedikit. Pipis masih lancar warna kuning pekat. BAB cair 2x kemarin, hari ini belum BAB.",
    o: "KU: Gelisah, GCS 15 (E4V5M6)\nBB: 12 kg | PB: 90 cm | Suhu: 38.9 °C | Nadi: 130 x/m | RR: 28 x/m | SpO2: 98%\nKepala: UUB datar, mata cekung (-/-)\nLeher: KGB tidak teraba\nThoraks: Cor S1-S2 normal takikardi. Pulmo vesikuler (+/+), rh (-/-), wh (-/-)\nAbdomen: Supel, hepar tidak teraba, bising usus (+) normal\nEkstremitas: Akral hangat, CRT < 2 detik, petekie (+) di paha kanan 5 bintik kecil, rumple leed (-)",
    a: "Demam Berdarah Dengue (DBD) Hari ke-3 (Fase Kritis) Grade I",
    p: "1. IVFD Ringer Laktat 10 tpm (maintenance anak 12 kg)\n2. Paracetamol sirup 120 mg / 6 jam PO k/p demam >38.5 °C\n3. Monitor tanda vital dan produksi urin tiap 4 jam\n4. Cek Darah Lengkap serial tiap 12 jam (Hb, Ht, Trombosit)\n5. Kompres hangat bila demam, hindari ibuprofen",
  },
  {
    patientName: "An. Aisha Zahra",
    number: 2,
    daysAgo: 1,
    time: "08:30:00",
    s: "Demam sudah turun sejak tadi pagi (H-4), anak sudah lebih tenang. Nafsu makan mulai membaik, mau minum air putih. Tidak muntah lagi. BAK cukup banyak jernih.",
    o: "KU: Baik, GCS 15\nSuhu: 36.7 °C | Nadi: 110 x/m | RR: 24 x/m | SpO2: 99%\nAbdomen: Supel, BU (+) normal\nEkstremitas: Akral hangat, CRT < 2 detik, petekie mulai memudar",
    a: "Demam Berdarah Dengue (DBD) Hari ke-4 (Fase Pemulihan) Grade I",
    p: "1. IVFD tapering bertahap ke 7 tpm\n2. Tingkatkan oral intake (ASI/susu formula, jus, air putih)\n3. Diet lunak sesuai toleransi\n4. Evaluasi DL sore; jika stabil boleh rawat jalan besok",
  },
  {
    patientName: "An. Rafif Akbar",
    number: 1,
    daysAgo: 3,
    time: "09:00:00",
    s: "Sesak napas mulai berkurang setelah nebulisasi kemarin malam. Batuk masih ada berdahak putih kental. Tidak demam sejak tadi malam. Nafsu makan biasa.",
    o: "KU: Sedang, GCS 15\nBB: 20 kg | Suhu: 36.8 °C | Nadi: 100 x/m | RR: 26 x/m | SpO2: 96% room air\nThoraks: Cor S1-S2 normal. Pulmo ekspirasi memanjang, wheezing ekspirasi (+/+) minimal, ronkhi (-/-)",
    a: "Asma Bronkiale Eksaserbasi Ringan-Sedang ec Trigger Infeksi Saluran Napas Atas (ISPA)",
    p: "1. O2 nasal kanul 2 lpm bila SpO2 < 95%\n2. Inhalasi Salbutamol + Ipratropium Bromide tiap 6 jam via nebulizer\n3. Prednison 1 mg/kgBB = 20 mg PO 1x1 pagi (5 hari)\n4. Ambroxol sirup 3x5 ml PO\n5. Edukasi kontrol asma rutin dan trigger avoidance",
  },
  {
    patientName: "An. Zahra Amira",
    number: 1,
    daysAgo: 1,
    time: "09:30:00",
    s: "Diare masih ada tapi frekuensi berkurang jadi 2x/hari, konsistensi mulai padat. Muntah sudah tidak ada sejak kemarin sore. Anak sudah mau makan bubur sedikit-sedikit. Pipis lancar.",
    o: "KU: Baik, GCS 15\nBB: 15 kg | Suhu: 36.5 °C | Nadi: 105 x/m | RR: 22 x/m\nMata: Cekung (-/-), air mata (+)\nMulut: Mukosa bibir lembab\nAbdomen: Supel, bising usus (+) normal, turgor kulit kembali cepat < 2 detik\nEkstremitas: Akral hangat, CRT < 2 detik",
    a: "Diare Akut ec Gastroenteritis Akut (GEA) Dehidrasi Ringan-Sedang Fase Rehidrasi",
    p: "1. IVFD Ringer Laktat 8 tpm (maintenance)\n2. Zinc sirup 20 mg 1x1 (10-14 hari)\n3. Probiotik sachet 2x1 dc\n4. Diet BRAT (banana, rice, applesauce, toast) bertahap\n5. Edukasi higienis mencuci tangan dan kebersihan makanan",
  },
  {
    patientName: "An. Farhan Rizqi",
    number: 1,
    daysAgo: 1,
    time: "10:00:00",
    s: "Nyeri perut kanan bawah masih terasa skala 5/10 terutama saat bergerak. Tidak demam sejak kemarin sore. BAB 1x konsistensi lunak. Mual minimal. Nafsu makan mulai membaik.",
    o: "KU: Sedang, GCS 15\nBB: 28 kg | Suhu: 36.9 °C | Nadi: 90 x/m | RR: 20 x/m\nAbdomen: Supel, bising usus (+) normal, nyeri tekan titik McBurney minimal (+), defens muskular (-), rovsing sign (-), psoas sign (-)\nEkstremitas: Akral hangat",
    a: "Observasi Nyeri Abdomen Kuadran Kanan Bawah ec Suspek Appendicitis Akut (Perbaikan Klinis)",
    p: "1. Observasi klinis ketat tiap 6 jam (nyeri, demam, leukosit)\n2. Puasa sementara, IVFD RL 10 tpm\n3. Inj. Ceftriaxone 1 g / 24 jam IV (hari ke-2)\n4. Paracetamol sirup k/p nyeri\n5. Evaluasi ulang bedah anak besok pagi; jika membaik trial diet cair bertahap",
  },
];

const savedFollowUps = [];
for (const f of followUpList) {
  const patientId = patientMap[f.patientName];
  const payload = {
    patient_id: patientId,
    number: f.number,
    date: dateStr(f.daysAgo),
    iso_date: dateStr(f.daysAgo),
    time: f.time,
    status: "Tersimpan",
    template_type: "Format SOAP Penyakit Dalam",
    template_id: templateId,
    template_version: 1,
    subjective: f.s,
    objective: f.o,
    assessment: f.a,
    plan: f.p,
    summary: `${f.patientName} - Follow-Up #${f.number}`,
    answers: {
      keluhan_utama: f.s.slice(0, 100),
      kesadaran: "Compos Mentis",
      tanda_vital: f.o.split("\n")[1] ?? "",
      edukasi: "Edukasi kondisi klinis kepada orangtua pasien terlampir di catatan SOAP.",
    },
    assessment_codes: [],
    planning: f.p,
    instruction: "Lapor residen/konsulen jaga jika ada kegawatan atau perburukan klinis anak.",
  };

  const saveRes = await sessionClient.rpc("save_follow_up_with_exams", {
    p_follow_up_id: null,
    p_expected_updated_at: null,
    p_follow_up: payload,
    p_supporting_exams: [],
  });

  if (saveRes.error) {
    console.error("Save follow-up error:", f.patientName, saveRes.error);
    throw saveRes.error;
  }
  savedFollowUps.push({ patientName: f.patientName, number: f.number, id: saveRes.data.followUpId });
}

// Supporting Exams
const examDefs = [
  {
    followUpIdx: 0,
    name: "Darah Lengkap Serial (H-3 DHF)",
    exam_type: "Laboratorium",
    exam_date: dateStr(2),
    result: "Hb: 11.8 g/dL, Ht: 38.2% (hemokonsentrasi), Leukosit: 2.800 /uL (leukopenia), Trombosit: 62.000 /uL (trombositopenia).",
  },
  {
    followUpIdx: 1,
    name: "Darah Lengkap Serial (H-4 DHF Evaluasi)",
    exam_type: "Laboratorium",
    exam_date: dateStr(1),
    result: "Hb: 11.0 g/dL, Ht: 34.5% (perbaikan plasma leakage), Leukosit: 4.200 /uL, Trombosit: 95.000 /uL (tren naik responsif).",
  },
  {
    followUpIdx: 2,
    name: "Foto Toraks PA Anak",
    exam_type: "Radiologi",
    exam_date: dateStr(3),
    result: "Corakan bronkovaskular meningkat bilateral. Hiperinflasi paru ringan. Cor dalam batas normal. Sinus costophrenicus tajam.",
  },
];

const examRows = examDefs.map((e) => ({
  user_id: userId,
  follow_up_id: savedFollowUps[e.followUpIdx].id,
  name: e.name,
  exam_type: e.exam_type,
  exam_date: e.exam_date,
  result: e.result,
  icon: "lab",
}));

const examsRes = await sessionClient.from("supporting_exams").insert(examRows).select("id");
if (examsRes.error) throw examsRes.error;

console.log("\n=========================================");
console.log("PEDIATRICS DATA ADDED TO DEMO ACCOUNT!");
console.log("=========================================");
console.log("Email       :", email);
console.log("Rotation    : Stase Ilmu Kesehatan Anak (RSUP Dr. Sardjito)");
console.log("Patients    :", patientDefs.length);
console.log("Follow-ups  :", savedFollowUps.length);
console.log("Exams       :", examRows.length);
console.log("=========================================\n");
