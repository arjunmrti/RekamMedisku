import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY ?? secret;
const email = "demo@rekammedisku.test";
const password = "12341234";

if (!url || !secret) {
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
}

const admin = createClient(url, secret, { auth: { persistSession: false } });
const starterIds = {
  ipd: "00000000-0000-0000-0000-000000000212",
  bedah: "00000000-0000-0000-0000-000000000215",
  pediatri: "00000000-0000-0000-0000-000000000211",
};

const now = new Date();
const iso = (daysAgo, hours = 8) => {
  const d = new Date(now.getTime() - daysAgo * 86400000);
  d.setHours(hours, 0, 0, 0);
  return d.toISOString();
};
const dateStr = (daysAgo) => iso(daysAgo).slice(0, 10);

console.log("Preparing demo account:", email);

// 1. Ensure user exists in Auth
const usersRes = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (usersRes.error) throw usersRes.error;

let user = usersRes.data.users.find((u) => u.email === email);
if (user) {
  const deleted = await admin.auth.admin.deleteUser(user.id);
  if (deleted.error) throw deleted.error;
  user = null;
}
if (!user) {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  user = created.data.user;
} else {
  const updated = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (updated.error) throw updated.error;
}
const userId = user.id;

// Log in as user
const sessionClient = createClient(url, publishable, { auth: { persistSession: false } });
const signInRes = await sessionClient.auth.signInWithPassword({ email, password });
if (signInRes.error) throw signInRes.error;

// 2. Profile
await sessionClient.from("profiles").upsert({
  id: userId,
  name: "Muhammad Fadel",
});

// 3. Clone specialty starter templates
const cloneStarter = async (starterId, name) => {
  const cloned = await sessionClient.rpc("clone_system_follow_up_template", {
    p_template_id: starterId,
    p_name: name,
  });
  if (cloned.error) throw cloned.error;
  return cloned.data.templateId;
};
const templateIds = {
  ipd: await cloneStarter(starterIds.ipd, "Format SOAP Penyakit Dalam"),
  bedah: await cloneStarter(starterIds.bedah, "Format SOAP Bedah"),
  pediatri: await cloneStarter(starterIds.pediatri, "Format SOAP Pediatri"),
};

// 4. Rotations (Ilmu Penyakit Dalam = Aktif)
const rotInterna = crypto.randomUUID();
const rotBedah = crypto.randomUUID();
const rotPediatri = crypto.randomUUID();

const rotationRows = [
  {
    id: rotInterna,
    user_id: userId,
    name: "Stase Ilmu Penyakit Dalam",
    specialty: "Ilmu Penyakit Dalam",
    institution: "RSUP Dr. Sardjito",
    start_date: dateStr(21),
    end_date: dateStr(-40),
    status: "Aktif",
    follow_up_template_id: templateIds.ipd,
    follow_up_template_version: 1,
  },
  {
    id: rotBedah,
    user_id: userId,
    name: "Stase Ilmu Bedah",
    specialty: "Bedah",
    institution: "RSUD Sleman",
    start_date: dateStr(90),
    end_date: dateStr(22),
    status: "Selesai",
    follow_up_template_id: templateIds.bedah,
    follow_up_template_version: 1,
  },
  {
    id: rotPediatri,
    user_id: userId,
    name: "Stase Ilmu Kesehatan Anak",
    specialty: "Pediatri",
    institution: "RS PKU Muhammadiyah Yogyakarta",
    start_date: dateStr(150),
    end_date: dateStr(91),
    status: "Selesai",
    follow_up_template_id: templateIds.pediatri,
    follow_up_template_version: 1,
  },
];

const rotRes = await sessionClient.from("rotations").upsert(rotationRows, { onConflict: "id" }).select();
if (rotRes.error) throw rotRes.error;

// 5. Patients
const patientDefs = [
  {
    name: "Tn. Agus Prasetyo",
    age: 42,
    gender: "Laki-laki",
    rm: "RM-IPD-04128",
    room: "Bangsal Dahlia 2",
    bed: "2B",
    doctor: "dr. Hendra Sp.PD",
    status: "Aktif",
    admission_date: dateStr(5),
    admission_complaint: "Demam mendadak tinggi hari ke-4, mual hebat, nyeri persendian dan ulu hati.",
    rotation_id: rotInterna,
  },
  {
    name: "Ny. Sri Wahyuni",
    age: 56,
    gender: "Perempuan",
    rm: "RM-IPD-04135",
    room: "Bangsal Dahlia 3",
    bed: "3A",
    doctor: "dr. Hendra Sp.PD",
    status: "Aktif",
    admission_date: dateStr(8),
    admission_complaint: "Sesak napas saat berbaring, kedua tungkai bengkak, lemas sejak 1 minggu SMRS.",
    rotation_id: rotInterna,
  },
  {
    name: "Tn. Bambang Sutrisno",
    age: 63,
    gender: "Laki-laki",
    rm: "RM-IPD-04142",
    room: "Bangsal Melati 1",
    bed: "1C",
    doctor: "dr. Rina Sp.PD-KGH",
    status: "Aktif",
    admission_date: dateStr(4),
    admission_complaint: "Luka borok pada telapak kaki kanan bernanah, gula darah tidak terkontrol.",
    rotation_id: rotInterna,
  },
  {
    name: "Ny. Endang Lestari",
    age: 49,
    gender: "Perempuan",
    rm: "RM-IPD-04150",
    room: "Bangsal Melati 2",
    bed: "2A",
    doctor: "dr. Rina Sp.PD-KGH",
    status: "Aktif",
    admission_date: dateStr(3),
    admission_complaint: "Nyeri ulu hati seperti terbakar, mual muntah cairan asam 3 kali sehari.",
    rotation_id: rotInterna,
  },
  {
    name: "Tn. Rizky Pratama",
    age: 25,
    gender: "Laki-laki",
    rm: "RM-BDH-01021",
    room: "Bangsal Cempaka",
    bed: "04",
    doctor: "dr. Farhan Sp.B",
    status: "Aktif",
    admission_date: dateStr(28),
    admission_complaint: "Nyeri perut kanan bawah mendadak disertai demam dan mual.",
    rotation_id: rotBedah,
  },
  {
    name: "An. Dimas Aditya",
    age: 7,
    gender: "Laki-laki",
    rm: "RM-PED-02014",
    room: "Bangsal Kenanga",
    bed: "03",
    doctor: "dr. Nurul Sp.A",
    status: "Aktif",
    admission_date: dateStr(100),
    admission_complaint: "Diare cair frekuensi >5x sehari disertai demam dan muntah.",
    rotation_id: rotPediatri,
  },
];

const patientRows = patientDefs.map((p) => ({
  ...p,
  user_id: userId,
  current_location_name: p.room,
}));

const patientsRes = await sessionClient.from("patients").insert(patientRows).select("id, name, rm, rotation_id");
if (patientsRes.error) throw patientsRes.error;
const patientMap = Object.fromEntries(patientsRes.data.map((p) => [p.name, p.id]));

// 6. Follow-Ups (SOAP)
const followUpList = [
  {
    patientName: "Tn. Agus Prasetyo",
    number: 1,
    daysAgo: 2,
    time: "07:30:00",
    s: "Demam hari ke-4 turun tapi badan terasa sangat lemas. Mual (+), muntah 1x tadi pagi, nyeri ulu hati (+). Mimisan (-), gusi berdarah (-), BAK cukup lancar warna kuning pekat.",
    o: "KU: sedang, Kesadaran: Compos Mentis (GCS 15)\nTD: 105/70 mmHg | Nadi: 88 x/menit | RR: 20 x/menit | Suhu: 36.8 °C | SpO2: 98% room air\nKepala/Leher: Mata anemis (-/-), ikterik (-/-)\nThoraks: Cor S1-S2 murni reguler. Pulmo suara dasar vesikuler (+/+), rh (-/-), wh (-/-)\nAbdomen: Supel, bising usus (+) normal, nyeri tekan epigastrium (+), hepar/lien tidak teraba\nEkstremitas: Akral hangat, CRT < 2 detik, petekie (+ di ekstremitas atas)",
    a: "Dengue Hemorrhagic Fever (DHF) Grade II Hari ke-4 (Fase Kritis)",
    p: "1. IVFD Ringer Laktat 20 tpm (maintenance cairan ketat)\n2. Inj. Ranitidin 50 mg / 12 jam IV\n3. Inj. Ondansetron 4 mg / 8 jam IV (k/p mual hebat)\n4. Monitor ketat tanda syok (TD, nadi, akral, urin output per 6 jam)\n5. Cek lab Darah Lengkap serial tiap 12 jam (monitoring Hb, Ht, Trombosit)",
  },
  {
    patientName: "Tn. Agus Prasetyo",
    number: 2,
    daysAgo: 1,
    time: "08:00:00",
    s: "Demam sudah tidak ada (H-5). Rasa lemas berkurang, mual berkurang banyak, nafsu makan mulai membaik. Perdarahan spontan tidak ada. BAK banyak dan jernih.",
    o: "KU: sedang, Kesadaran: Compos Mentis (GCS 15)\nTD: 115/75 mmHg | Nadi: 80 x/menit reguler | RR: 18 x/menit | Suhu: 36.5 °C | SpO2: 99%\nAbdomen: Supel, bising usus (+) normal, nyeri tekan epigastrium berkurang minimal\nEkstremitas: Akral hangat, CRT < 2 detik, petekie mulai pudar, edema (-/-)",
    a: "Dengue Hemorrhagic Fever (DHF) Grade II Hari ke-5 (Fase Pemulihan / Convalescence)",
    p: "1. IVFD Ringer Laktat tapp-down bertahap ke 14 tpm\n2. Terapi oral: Antasida syr 3x1 C ac, Paracetamol tab k/p\n3. Tingkatkan intake cairan per oral (air putih, jus, oralit)\n4. Evaluasi DL sore ini, jika trombosit stabil persiapan rawat jalan",
  },
  {
    patientName: "Ny. Sri Wahyuni",
    number: 1,
    daysAgo: 4,
    time: "08:15:00",
    s: "Sesak napas saat tidur telentang (ortopnea +), tidur butuh 2-3 bantal. Kedua kaki bengkak sejak 5 hari lalu. Lemas dan mual di pagi hari. Riwayat HD reguler tiap Selasa & Jumat.",
    o: "KU: Lemah, GCS: 15\nTD: 160/95 mmHg | Nadi: 94 x/m | RR: 24 x/m | Suhu: 36.6 °C | SpO2: 96% nasal kanul 3 lpm\nLeher: JVP 5+3 cmH2O\nThoraks: Cor batas kiri melebar, gallop (-). Pulmo ronkhi basah halus basal bilateral (+/+)\nAbdomen: Supel, hepar teraba 2 jari BAC kenyal tumpul, ascites minimal (+)\nEkstremitas: Pitting edema bilateral tungkai bawah (+/+)",
    a: "CKD Stage V on HD regular + Congestive Heart Failure NYHA FC III ec HHD + Hipertensi Stage II",
    p: "1. O2 nasal kanul 3 lpm\n2. Posisi semi fowler\n3. Inj. Furosemide 40 mg IV bolus lambat\n4. Candesartan 8 mg 1x1 tab malam\n5. Pembatasan cairan maksimal 600 ml/24 jam + urine output\n6. Rencana hemodialisis cito dengan ultrafiltrasi 2.5 liter",
  },
  {
    patientName: "Ny. Sri Wahyuni",
    number: 2,
    daysAgo: 2,
    time: "08:30:00",
    s: "Pasca HD sesi kemarin sesak napas jauh berkurang, sudah bisa tidur 1 bantal. Bengkak di kaki berkurang. BAK sedikit warna teh.",
    o: "KU: sedang, GCS: 15\nTD: 135/85 mmHg | Nadi: 82 x/m | RR: 20 x/m | Suhu: 36.4 °C | SpO2: 98% room air\nThoraks: Pulmo ronkhi basah basal minimal (+/-), cor suara jantung normal\nEkstremitas: Pitting edema berkurang signifikan (+1/+1)",
    a: "CKD Stage V on HD regular (post HD toleransi baik) + CHF NYHA FC II terkontrol + HT terkontrol",
    p: "1. Terapi lanjut: Candesartan 8 mg 1x1, Amlodipine 10 mg 1x1 pagi, Asam Folat 3x1 mg, CaCO3 3x500 mg dc\n2. Pantau berat badan kering dan pembatasan asupan garam-cairan ketat\n3. Jadwal HD rutin selanjutnya hari Jumat",
  },
  {
    patientName: "Tn. Bambang Sutrisno",
    number: 1,
    daysAgo: 2,
    time: "09:00:00",
    s: "Luka di telapak kaki kanan masih mengeluarkan pus sedikit, bau berkurang setelah ganti verban kemarin. Nyeri skala 3/10. Badan tidak demam. Nafsu makan biasa.",
    o: "KU: Sedang, GCS: 15\nTD: 130/80 mmHg | Nadi: 84 x/m | RR: 18 x/m | Suhu: 36.9 °C\nStatus Lokalis Pedis Dextra (Plantar): Ulkus ukuran 4x3 cm, dasar jaringan granulasi 60%, slough 40%, pus minimal, eritema tepi luka < 1 cm, pulsasi a. dorsalis pedis teraba kuat.",
    a: "Diabetes Melitus Tipe 2 Obese + Ulkus Diabetikum Pedis Dextra Wagner II + Anemia Normositik",
    p: "1. Rawat luka (wound toilet) harian dengan saline normal 0.9% + tulle + kasa steril\n2. Inj. Ceftriaxone 2 g / 24 jam IV\n3. Inj. Metronidazole 500 mg / 8 jam IV drip\n4. Regulasi gula darah: Insulin Novorapid 3x8 unit sc (preprandial), Levemir 1x14 unit sc malam\n5. Edukasi non-weight bearing pada kaki kanan dan diet DM 1700 kkal",
  },
  {
    patientName: "Ny. Endang Lestari",
    number: 1,
    daysAgo: 1,
    time: "09:30:00",
    s: "Nyeri ulu hati terasa panas perih berkurang setelah diberi obat suntik. Mual sudah reda, muntah (-). Sudah bisa makan bubur halus sedikit-sedikit.",
    o: "KU: Baik, GCS: 15\nTD: 120/80 mmHg | Nadi: 78 x/m | RR: 18 x/m | Suhu: 36.6 °C\nAbdomen: Supel, bising usus (+) normal 6x/m, nyeri tekan epigastrium minimal (+), defens muskular (-)",
    a: "Dispepsia Sindrom ec Gastritis Akut + GERD",
    p: "1. Drip Omeprazole 40 mg / 12 jam IV\n2. Sukralfat sirup 3 x 1 sendok makan ac\n3. Diet lambung II (porsi kecil tapi sering, hindari pedas, asam, kopi, santan)\n4. Boleh rawat jalan besok jika toleransi oral baik",
  },
  {
    patientName: "Tn. Rizky Pratama",
    number: 1,
    daysAgo: 10,
    time: "10:00:00",
    s: "Post op hari ke-2, flatus (+), nyeri bekas operasi masih terasa skala 4/10 saat bergerak. Demam (-), mual (-). Sudah mulai mobilisasi duduk.",
    o: "KU: Baik, GCS: 15\nTD: 120/70 mmHg | Nadi: 80 x/m | RR: 18 x/m | Suhu: 36.7 °C\nAbdomen: Luka operasi transverse McBurney tertutup kassa bersih tanpa rembesan, BU (+) normal",
    a: "Post Appendectomy H-2 ec Appendicitis Akut Perforasi",
    p: "1. Diet bertahap lunak tinggi protein\n2. Inj. Ketorolac 30 mg / 8 jam IV k/p nyeri\n3. Inj. Ceftriaxone 1 g / 12 jam IV (hari ke-3)\n4. Mobilisasi jalan bertahap\n5. Evaluasi ganti verban besok",
  },
];

const coreObjectiveByPatient = {
  "Tn. Agus Prasetyo": { generalCondition: "Sedang", consciousness: "Compos Mentis", gcsEye: "4", gcsVerbal: "5", gcsMotor: "6", systolic: "115", diastolic: "75", pulse: "80", respiratoryRate: "18", temperature: "36.5", spo2: "99", oxygenVia: "Room air", weight: "70", height: "170", bmi: "24.2", nutritionStatus: "Baik", headNeck: "Konjungtiva tidak anemis, sklera tidak ikterik", thorax: "Cor reguler, pulmo vesikuler", abdomen: "Supel, nyeri tekan epigastrium minimal", extremities: "Akral hangat, CRT <2 detik", painNrs: "2", otherFindings: "Petekie memudar" },
  "Ny. Sri Wahyuni": { generalCondition: "Sedang", consciousness: "Compos Mentis", gcsEye: "4", gcsVerbal: "5", gcsMotor: "6", systolic: "135", diastolic: "85", pulse: "82", respiratoryRate: "20", temperature: "36.4", spo2: "98", oxygenVia: "Room air", weight: "62", height: "158", bmi: "24.8", nutritionStatus: "Cukup", headNeck: "JVP tidak meningkat", thorax: "Ronki basal minimal", abdomen: "Supel", extremities: "Edema tungkai +1/+1", painNrs: "1", otherFindings: "" },
  "Tn. Bambang Sutrisno": { generalCondition: "Sedang", consciousness: "Compos Mentis", gcsEye: "4", gcsVerbal: "5", gcsMotor: "6", systolic: "130", diastolic: "80", pulse: "84", respiratoryRate: "18", temperature: "36.9", spo2: "98", oxygenVia: "Room air", weight: "82", height: "168", bmi: "29.1", nutritionStatus: "Obesitas", headNeck: "Konjungtiva agak pucat", thorax: "Pulmo vesikuler", abdomen: "Supel", extremities: "Ulkus plantar pedis dextra 4x3 cm", painNrs: "3", otherFindings: "Pulsasi dorsalis pedis teraba" },
  "Ny. Endang Lestari": { generalCondition: "Baik", consciousness: "Compos Mentis", gcsEye: "4", gcsVerbal: "5", gcsMotor: "6", systolic: "120", diastolic: "80", pulse: "78", respiratoryRate: "18", temperature: "36.6", spo2: "99", oxygenVia: "Room air", weight: "55", height: "155", bmi: "22.9", nutritionStatus: "Baik", headNeck: "Tidak anemis", thorax: "Cor-pulmo dalam batas normal", abdomen: "Nyeri tekan epigastrium minimal", extremities: "Edema (-)", painNrs: "2", otherFindings: "" },
  "Tn. Rizky Pratama": { generalCondition: "Baik", consciousness: "Compos Mentis", gcsEye: "4", gcsVerbal: "5", gcsMotor: "6", systolic: "120", diastolic: "70", pulse: "80", respiratoryRate: "18", temperature: "36.7", spo2: "99", oxygenVia: "Room air", weight: "68", height: "172", bmi: "23.0", nutritionStatus: "Baik", headNeck: "Tidak anemis", thorax: "Pulmo vesikuler", abdomen: "Luka operasi bersih", extremities: "Akral hangat", painNrs: "4", otherFindings: "" },
  "An. Dimas Aditya": { generalCondition: "Sedang", consciousness: "Compos Mentis", gcsEye: "4", gcsVerbal: "5", gcsMotor: "6", systolic: "100", diastolic: "65", pulse: "110", respiratoryRate: "24", temperature: "38.2", spo2: "98", oxygenVia: "Room air", weight: "22", height: "118", bmi: "15.8", nutritionStatus: "Cukup", headNeck: "Mukosa bibir kering", thorax: "Vesikuler", abdomen: "Supel, bising usus meningkat", extremities: "CRT 2 detik", painNrs: "2", otherFindings: "Turgor sedikit menurun" },
};

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
    template_id: templateIds[f.templateKey ?? (f.patientName === "Tn. Rizky Pratama" ? "bedah" : "ipd")],
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
      edukasi: "Edukasi kondisi klinis kepada pasien dan keluarga terlampir di catatan SOAP.",
    },
    assessment_codes: [],
    planning: f.p,
    instruction: "Lapor residen/konsulen jaga jika ada kegawatan atau perburukan hemodinamik.",
    core_objective: coreObjectiveByPatient[f.patientName] ?? {},
  };

  const saveRes = await sessionClient.rpc("save_follow_up_with_exams", {
    p_follow_up_id: null,
    p_expected_updated_at: null,
    p_follow_up: payload,
    p_supporting_exams: [],
  });

  if (saveRes.error) {
    console.error("Save follow-up error for:", f.patientName, saveRes.error);
    throw saveRes.error;
  }
  savedFollowUps.push({
    patientName: f.patientName,
    number: f.number,
    id: saveRes.data.followUpId,
  });
}

// 7. Supporting Exams (Penunjang Lab, Rontgen, EKG)
const examDefs = [
  {
    followUpIdx: 0, // Tn. Agus Fu-1
    name: "Darah Lengkap Serial (H-4)",
    exam_type: "Laboratorium",
    exam_date: dateStr(2),
    result: "Hb: 14.2 g/dL, Ht: 44.5% (hemokonsentrasi), Leukosit: 3.200 /uL (leukopenia), Trombosit: 54.000 /uL (trombositopenia moderat).",
  },
  {
    followUpIdx: 1, // Tn. Agus Fu-2
    name: "Darah Lengkap Serial (H-5 Evaluasi)",
    exam_type: "Laboratorium",
    exam_date: dateStr(1),
    result: "Hb: 13.0 g/dL, Ht: 39.1% (resolusi plasma leakage), Leukosit: 4.900 /uL, Trombosit: 86.000 /uL (tren naik responsif terapi).",
  },
  {
    followUpIdx: 2, // Ny. Sri Fu-1
    name: "Foto Toraks PA Tegak",
    exam_type: "Radiologi",
    exam_date: dateStr(4),
    result: "Kardiomegali CTR 60%, elongasi aorta. Corakan vaskuler paru meningkat bilateral, cephalisasi (+), efusi pleura kanan minimal.",
  },
  {
    followUpIdx: 2, // Ny. Sri Fu-1
    name: "Kimia Darah Lengkap & Elektrolit",
    exam_type: "Laboratorium",
    exam_date: dateStr(4),
    result: "Ureum: 156 mg/dL, Kreatinin: 7.2 mg/dL, eGFR: 6.8 mL/min/1.73m2. Kalium: 5.4 mEq/L, Natrium: 136 mEq/L, Kalsium: 8.1 mg/dL.",
  },
  {
    followUpIdx: 4, // Tn. Bambang Fu-1
    name: "Gula Darah Serial & Kultur Pus Luka",
    exam_type: "Laboratorium",
    exam_date: dateStr(2),
    result: "GDS Puasa: 210 mg/dL, GDS 2 Jam PP: 284 mg/dL, HbA1c: 10.4%. Gram pus: Coccus Gram Positif berderet (sensitif ceftriaxone & meropenem).",
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
console.log("DEMO ACCOUNT CREATED SUCCESSFULLY!");
console.log("=========================================");
console.log("Email       :", email);
console.log("Password    :", password);
console.log("User ID     :", userId);
console.log("Stase Aktif : Stase Ilmu Penyakit Dalam (RSUP Dr. Sardjito)");
console.log("Rotations   :", rotationRows.length);
console.log("Patients    :", patientDefs.length);
console.log("Follow-ups  :", savedFollowUps.length);
console.log("Exams       :", examRows.length);
console.log("=========================================\n");
