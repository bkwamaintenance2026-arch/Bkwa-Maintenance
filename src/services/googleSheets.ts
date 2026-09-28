import { 
  AssetUnit, 
  ManpowerData, 
  BreakdownRecord, 
  SupplierRecord, 
  FuelStockInputRecord, 
  FuelTransferRecord, 
  OilStockInputRecord, 
  FuelDistributionRecord, 
  OilDistributionRecord,
  P2HRecord,
} from '../types';
import { getCachedAccessToken } from './googleAuth';

const SPREADSHEET_ID_STORAGE_KEY = 'bkwa_active_spreadsheet_id';
const LAST_SYNC_TIME_KEY = 'bkwa_last_sheets_sync_time';

export function getSavedSpreadsheetId(): string | null {
  try {
    return localStorage.getItem(SPREADSHEET_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSavedSpreadsheetId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(SPREADSHEET_ID_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(SPREADSHEET_ID_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Error saving spreadsheet id', e);
  }
}

export function getLastSyncTime(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_TIME_KEY);
  } catch {
    return null;
  }
}

export function setLastSyncTime(isoString: string): void {
  try {
    localStorage.setItem(LAST_SYNC_TIME_KEY, isoString);
  } catch (e) {
    console.error('Error saving last sync time', e);
  }
}

// Create a new Google Spreadsheet with all required sheets for BKWA
export async function createBkwaSpreadsheet(title = 'BKWA Maintenance & Inventory Database'): Promise<string> {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Sesi Google belum aktif. Silakan Login dengan Akun Google terlebih dahulu.');
  }

  const sheetTitles = [
    'Ringkasan_Dashboard',
    'Asset_Unit',
    'Manpower',
    'Breakdown_Maintenance',
    'Suplier_Distributor',
    'Stok_Masuk_Solar',
    'Transfer_Solar_FT',
    'Stok_Masuk_Oli',
    'Distribusi_Solar_Unit',
    'Distribusi_Oli_Unit',
    'Pemeriksaan_P2H_Unit',
  ];

  const createBody = {
    properties: {
      title,
    },
    sheets: sheetTitles.map((sheetTitle) => ({
      properties: {
        title: sheetTitle,
        gridProperties: {
          rowCount: 500,
          columnCount: 26,
          frozenRowCount: 1,
        },
      },
    })),
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gagal membuat Spreadsheet: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  setSavedSpreadsheetId(spreadsheetId);
  return spreadsheetId;
}

// Verifies if spreadsheet exists and has required sheets; if any sheet is missing, adds it
export async function verifyAndPrepareSpreadsheet(spreadsheetId: string): Promise<string[]> {
  const token = getCachedAccessToken();
  if (!token) throw new Error('Token Google Auth tidak ditemukan.');

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`Spreadsheet tidak ditemukan atau tidak memiliki izin akses (Status ${res.status}).`);
  }

  const data = await res.json();
  const existingSheets: string[] = (data.sheets || []).map((s: any) => s.properties?.title);

  const requiredSheets = [
    'Ringkasan_Dashboard',
    'Asset_Unit',
    'Manpower',
    'Breakdown_Maintenance',
    'Suplier_Distributor',
    'Stok_Masuk_Solar',
    'Transfer_Solar_FT',
    'Stok_Masuk_Oli',
    'Distribusi_Solar_Unit',
    'Distribusi_Oli_Unit'
  ];

  const missingSheets = requiredSheets.filter(title => !existingSheets.includes(title));

  if (missingSheets.length > 0) {
    const requests = missingSheets.map(title => ({
      addSheet: {
        properties: {
          title,
          gridProperties: { rowCount: 300, columnCount: 20, frozenRowCount: 1 }
        }
      }
    }));

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests })
    });
  }

  return [...existingSheets, ...missingSheets];
}

// Convert data to 2D array for Google Sheets
export function prepareAssetUnitSheetData(units: AssetUnit[]): any[][] {
  const headers = [
    'CN Unit (CN_NEW)',
    'Nama Alat',
    'Jenis Alat',
    'Class',
    'Lokasi Quarry',
    'Status Operasional',
    'Brand / Merk',
    'Serial Number Unit',
    'Model Unit',
    'Engine Model',
    'SN Engine',
    'Merk Engine',
    'Tanggal Registrasi',
    'Catatan Tambahan'
  ];

  const rows = units.map(u => [
    u.cnNew || '',
    u.namaAlat || '',
    u.jenis || '',
    u.classUnit || '',
    u.loc || '',
    u.status || '',
    u.brandMerk || '',
    u.snUnit || '',
    u.modelUnit || '',
    u.engineModel || '',
    u.snEngine || '',
    u.merkEngine || '',
    u.tanggalRegistrasi || '',
    u.catatan || ''
  ]);

  return [headers, ...rows];
}

export function prepareManpowerSheetData(manpower: ManpowerData[]): any[][] {
  const headers = [
    'NIK / ID Karyawan',
    'Nama Lengkap',
    'Jabatan / Posisi',
    'Status Karyawan',
    'Nomor Telepon / WA',
    'Tanggal Masuk Kerja',
    'Keterangan'
  ];

  const rows = manpower.map(m => [
    m.nik || '',
    m.nama || '',
    m.jabatan || '',
    m.statusKaryawan || '',
    m.noWa || '',
    m.tglMasukKerja || '',
    m.keterangan || ''
  ]);

  return [headers, ...rows];
}

export function prepareBreakdownSheetData(records: BreakdownRecord[]): any[][] {
  const headers = [
    'No Notifikasi',
    'No Unit (CN_NEW)',
    'Nama Alat',
    'Jenis Alat',
    'No Lama',
    'Tanggal Breakdown',
    'HM Saat Breakdown',
    'Lokasi',
    'Pelapor',
    'Jabatan Pelapor',
    'Komponen Kerusakan',
    'Detail Problem Awal',
    'Tanggal Mulai Pekerjaan (Start Job)',
    'Detail Kerusakan Perbaikan',
    'Progres Perbaikan',
    'Status Unit',
    'PIC Mekanik 1',
    'PIC Mekanik 2',
    'PIC Mekanik 3',
    'Sparepart & Jasa Digunakan',
    'Tanggal Selesai (Completed)',
    'Keterangan / Remark'
  ];

  const rows = records.map(b => {
    const sparepartsStr = (b.partsJasa || [])
      .map(p => `${p.jenis}: ${p.namaPart} (${p.partNumber || '-'}) Qty: ${p.qty} ${p.satuan}`)
      .join('; ');

    return [
      b.noNotifikasi || b.id,
      b.noUnit || '',
      b.namaAlat || '',
      b.jenis || '',
      b.noLama || '',
      b.tanggal || '',
      b.hm || '',
      b.lokasi || '',
      b.pelapor || '',
      b.jabatan || '',
      b.component || '',
      b.detailProblem || '',
      b.startJob || '',
      b.detailKerusakan || '',
      b.progress || '',
      b.statusUnit || '',
      b.pic1 || '',
      b.pic2 || '',
      b.pic3 || '',
      sparepartsStr,
      b.completedAt || '',
      b.remark || ''
    ];
  });

  return [headers, ...rows];
}

export function prepareSupplierSheetData(suppliers: SupplierRecord[]): any[][] {
  const headers = [
    'ID / Kode',
    'Nama Distributor / Vendor',
    'Alamat Perusahaan',
    'No Telp / WhatsApp',
    'Email Distributor',
    'Komoditas / Nama Barang'
  ];

  const rows = suppliers.map(s => [
    s.id,
    s.namaDistributor || '',
    s.alamat || '',
    s.noTelpWa || '',
    s.email || '',
    s.itemName || ''
  ]);

  return [headers, ...rows];
}

export function prepareFuelStockSheetData(records: FuelStockInputRecord[]): any[][] {
  const headers = [
    'Tanggal Input',
    'Jam Input',
    'Distributor / Supplier',
    'SN / Reff No (Surat Jalan)',
    'Plat Nomor Truk Tanki',
    'Nama Driver Truk Tanki',
    'Qty Supplier (Liter)',
    'Flowmeter Start',
    'Flowmeter End',
    'Actual Qty Flowmeter (Liter)',
    'Ukur Stick Sebelum (cm)',
    'Ukur Stick Sesudah (cm)',
    'PIC FOG Penerima',
    'Jabatan PIC FOG',
    'Catatan / Remark'
  ];

  const rows = records.map(r => [
    r.tanggal || '',
    r.jam || '',
    r.distributor || '',
    r.snReffNo || '',
    r.platNomor || '',
    r.driverName || '',
    r.qtySupplier || 0,
    r.flowmeterStart || 0,
    r.flowmeterEnd || 0,
    r.actualQtyFlowmeter || 0,
    r.hasilUkurStickSebelum || '',
    r.hasilUkurStickSesudah || '',
    r.picFogName || '',
    r.picFogJabatan || '',
    r.remark || ''
  ]);

  return [headers, ...rows];
}

export function prepareFuelTransferSheetData(records: FuelTransferRecord[]): any[][] {
  const headers = [
    'Tanggal Transfer',
    'Jam Transfer',
    'Nama Driver FT',
    'Jabatan Driver FT',
    'PIC FOG Pengawas',
    'Jabatan PIC FOG',
    'Flowmeter Start',
    'Flowmeter Stop',
    'Qty Ditransfer ke FT (Liter)',
    'Catatan / Remark'
  ];

  const rows = records.map(r => [
    r.tanggal || '',
    r.jam || '',
    r.namaDriverFt || '',
    r.driverFtJabatan || '',
    r.picFog || '',
    r.picFogJabatan || '',
    r.flowmeterStart || 0,
    r.flowmeterStop || 0,
    r.qty || 0,
    r.remark || ''
  ]);

  return [headers, ...rows];
}

export function prepareOilStockSheetData(records: OilStockInputRecord[]): any[][] {
  const headers = [
    'Tanggal Input',
    'Jam Input',
    'Distributor / Supplier',
    'Nama Pelumas / Oli',
    'Jumlah Qty',
    'Satuan (Ltr/Drum/Pail)',
    'PIC Gudang Material',
    'Jabatan PIC Gudang',
    'Catatan / Remark'
  ];

  const rows = records.map(r => [
    r.tanggal || '',
    r.jam || '',
    r.distributor || '',
    r.namaOli || '',
    r.qty || 0,
    r.satuan || 'Drum',
    r.picGudangMaterial || '',
    r.picGudangJabatan || '',
    r.remark || ''
  ]);

  return [headers, ...rows];
}

export function prepareFuelDistributionSheetData(records: FuelDistributionRecord[]): any[][] {
  const headers = [
    'No Bon',
    'Tanggal Pengisian',
    'Jam Pengisian',
    'CN Unit',
    'Nama Alat',
    'Nama Operator / Driver',
    'Jabatan Operator',
    'HM Saat Pengisian',
    'Flowmeter Start',
    'Flowmeter Stop',
    'Qty Pengisian Solar (Liter)',
    'Driver Fuel Truck',
    'PIC FOG Dispenser',
    'Lokasi Pengisian',
    'Catatan / Remark'
  ];

  const rows = records.map(r => [
    r.noBon || '',
    r.tanggal || '',
    r.jam || '',
    r.cnAlat || '',
    r.namaAlat || '',
    r.operatorName || '',
    r.operatorJabatan || '',
    r.hm || 0,
    r.flowmeterStart || 0,
    r.flowmeterStop || 0,
    r.qty || 0,
    r.driverFtName || '',
    r.picFogName || '',
    r.lokasi || '',
    r.remark || ''
  ]);

  return [headers, ...rows];
}

export function prepareOilDistributionSheetData(records: OilDistributionRecord[]): any[][] {
  const headers = [
    'No Bon',
    'Tanggal Pengisian',
    'Jam Pengisian',
    'No Unit (CN)',
    'Nama Alat',
    'HM Unit',
    'Jenis Oli / Pelumas',
    'Jumlah Qty',
    'Satuan',
    'Rincian Kerusakan / Alasan',
    'PIC Mekanik Pelaksana',
    'PIC Gudang Material',
    'Catatan / Remark'
  ];

  const rows = records.map(r => [
    r.noBon || '',
    r.tanggal || '',
    r.jam || '',
    r.noUnit || '',
    r.namaAlat || r.namaUnit || '',
    r.hmUnit || 0,
    r.jenisOli || '',
    r.qty || 0,
    r.satuan || 'Ltr',
    r.rincianKerusakan || '',
    r.picMekanik || '',
    r.picGudangMaterial || '',
    r.remark || ''
  ]);

  return [headers, ...rows];
}

export function prepareP2HSheetData(records: P2HRecord[]): any[][] {
  const headers = [
    'No P2H',
    'Tanggal Form',
    'Jam Form',
    'Nama Operator',
    'Jabatan Operator',
    'Jenis Alat',
    'No Unit (CN)',
    'Nama Alat',
    'HM / KM',
    '1. Oli Mesin',
    '2. Air Radiator',
    '3. Minyak Rem',
    '4. Sistem Hidrolik',
    '5. Tekanan & Baut Ban/Track',
    '6. Sistem Kemudi & Rem',
    '7. Lampu & Klakson',
    '8. APAR & Kotak P3K',
    '9. Kebersihan Kabin & Kaca',
    'Status Kelayakan',
    'Catatan / Temuan'
  ];

  const rows = records.map(r => {
    const getItem = (no: number) => r.items?.find(it => it.itemNo === no)?.status || 'OK';
    return [
      r.noP2H || '',
      r.tanggal || '',
      r.jam || '',
      r.operatorName || '',
      r.operatorJabatan || '',
      r.jenisAlat || '',
      r.noUnit || '',
      r.namaAlat || '',
      r.hmKm || 0,
      getItem(1),
      getItem(2),
      getItem(3),
      getItem(4),
      getItem(5),
      getItem(6),
      getItem(7),
      getItem(8),
      getItem(9),
      r.statusKelayakan === 'LAYAK_OPERASI' ? 'Layak Operasi' : 'Tidak Layak (Stop Operasi)',
      r.catatanUmum || ''
    ];
  });

  return [headers, ...rows];
}

export function prepareSummaryDashboardSheetData(stats: {
  totalUnits: number;
  readyUnits: number;
  breakdownUnits: number;
  totalManpower: number;
  activeBreakdowns: number;
  totalDistributionSolar: number;
  lastUpdated: string;
}): any[][] {
  return [
    ['DASHBOARD RINGKASAN DATA BKWA MAINTENANCE & QUARRY'],
    ['Terakhir Diperbarui', stats.lastUpdated],
    [''],
    ['METRIK UTAMA', 'NILAI', 'SATUAN'],
    ['Total Populasi Unit Asset', stats.totalUnits, 'Unit'],
    ['Unit Status Operasi / Standby', stats.readyUnits, 'Unit'],
    ['Unit Status Breakdown / Maintenance', stats.breakdownUnits, 'Unit'],
    ['Persentase Kesiapan Alat (PA)', stats.totalUnits > 0 ? `${Math.round((stats.readyUnits / stats.totalUnits) * 100)}%` : '0%', ''],
    ['Total Manpower Terdaftar', stats.totalManpower, 'Orang'],
    ['Kasus Breakdown Aktif', stats.activeBreakdowns, 'Kasus'],
    ['Total Distribusi Solar Tercatat', stats.totalDistributionSolar, 'Liter'],
    [''],
    ['Info Integrasi:', 'Otomatis tersinkronisasi dari Aplikasi BKWA Maintenance via Google Sheets API (Google Workspace)']
  ];
}

// Master function to sync all modules to the connected Google Spreadsheet
export async function syncAllDataToGoogleSheets(
  spreadsheetId: string,
  data: {
    units: AssetUnit[];
    manpower: ManpowerData[];
    breakdowns: BreakdownRecord[];
    suppliers: SupplierRecord[];
    fuelStocks: FuelStockInputRecord[];
    fuelTransfers: FuelTransferRecord[];
    oilStocks: OilStockInputRecord[];
    fuelDistributions: FuelDistributionRecord[];
    oilDistributions: OilDistributionRecord[];
    p2hRecords?: P2HRecord[];
  }
): Promise<{ success: boolean; syncedCount: number; timestamp: string }> {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Sesi Google Auth tidak aktif. Silakan lakukan Sign in with Google.');
  }

  // 1. Pastikan spreadsheet dan sheet tersedia
  await verifyAndPrepareSpreadsheet(spreadsheetId);

  // 2. Siapkan data tiap sheet
  const readyUnits = data.units.filter(u => u.status === 'OPERASI' || u.status === 'STANDBY').length;
  const breakdownUnits = data.units.filter(u => u.status === 'BREAKDOWN' || u.status === 'MAINTENANCE').length;
  const activeBreakdowns = data.breakdowns.filter(b => b.statusUnit !== 'READY').length;
  const totalFuelDist = data.fuelDistributions.reduce((acc, f) => acc + (f.qty || 0), 0);
  const p2hList = data.p2hRecords || [];

  const nowStr = new Date().toLocaleString('id-ID', { timeZoneName: 'short' });

  const sheetPayloads = [
    {
      range: 'Ringkasan_Dashboard!A1',
      values: prepareSummaryDashboardSheetData({
        totalUnits: data.units.length,
        readyUnits,
        breakdownUnits,
        totalManpower: data.manpower.length,
        activeBreakdowns,
        totalDistributionSolar: totalFuelDist,
        lastUpdated: nowStr
      })
    },
    {
      range: 'Asset_Unit!A1',
      values: prepareAssetUnitSheetData(data.units)
    },
    {
      range: 'Manpower!A1',
      values: prepareManpowerSheetData(data.manpower)
    },
    {
      range: 'Breakdown_Maintenance!A1',
      values: prepareBreakdownSheetData(data.breakdowns)
    },
    {
      range: 'Suplier_Distributor!A1',
      values: prepareSupplierSheetData(data.suppliers)
    },
    {
      range: 'Stok_Masuk_Solar!A1',
      values: prepareFuelStockSheetData(data.fuelStocks)
    },
    {
      range: 'Transfer_Solar_FT!A1',
      values: prepareFuelTransferSheetData(data.fuelTransfers)
    },
    {
      range: 'Stok_Masuk_Oli!A1',
      values: prepareOilStockSheetData(data.oilStocks)
    },
    {
      range: 'Distribusi_Solar_Unit!A1',
      values: prepareFuelDistributionSheetData(data.fuelDistributions)
    },
    {
      range: 'Distribusi_Oli_Unit!A1',
      values: prepareOilDistributionSheetData(data.oilDistributions)
    },
    {
      range: 'Pemeriksaan_P2H_Unit!A1',
      values: prepareP2HSheetData(p2hList)
    }
  ];

  // 3. Clear data lama di setiap sheet sebelum overwrite agar tidak tersisa baris lama
  for (const item of sheetPayloads) {
    const sheetName = item.range.split('!')[0];
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z500:clear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
  }

  // 4. Batch Update semua data ke Google Sheets
  const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: sheetPayloads
    })
  });

  if (!batchRes.ok) {
    const errText = await batchRes.text();
    throw new Error(`Gagal mengirim data ke Google Sheets: ${batchRes.status} ${errText}`);
  }

  setLastSyncTime(new Date().toISOString());

  const totalRecords = 
    data.units.length + 
    data.manpower.length + 
    data.breakdowns.length + 
    data.suppliers.length + 
    data.fuelStocks.length + 
    data.fuelTransfers.length + 
    data.oilStocks.length + 
    data.fuelDistributions.length + 
    data.oilDistributions.length +
    p2hList.length;

  return {
    success: true,
    syncedCount: totalRecords,
    timestamp: nowStr
  };
}

// Fitur Auto-Save Otomatis: Dipanggil setiap kali ada data yang diinput / diedit di aplikasi.
// Jika spreadsheet sudah terhubung & sesi Google aktif, data akan langsung otomatis tersinkron ke Google Sheets tanpa perlu klik tombol manual.
let isAutoSyncRunning = false;
let pendingAutoSync = false;

export async function triggerAutoSyncToGoogleSheets(customData?: {
  units?: AssetUnit[];
  manpower?: ManpowerData[];
  breakdowns?: BreakdownRecord[];
  suppliers?: SupplierRecord[];
  fuelStocks?: FuelStockInputRecord[];
  fuelTransfers?: FuelTransferRecord[];
  oilStocks?: OilStockInputRecord[];
  fuelDistributions?: FuelDistributionRecord[];
  oilDistributions?: OilDistributionRecord[];
  p2hRecords?: P2HRecord[];
}): Promise<boolean> {
  const spreadsheetId = getSavedSpreadsheetId();
  const token = getCachedAccessToken();
  if (!spreadsheetId || !token) {
    return false; // Belum terhubung, lewati
  }

  if (isAutoSyncRunning) {
    pendingAutoSync = true;
    return true;
  }

  try {
    isAutoSyncRunning = true;
    
    // Import helper storage dinamis untuk menghindari circular import jika ada
    const storage = await import('../utils/storage');
    const units = customData?.units || storage.getAllUnits();
    const manpower = customData?.manpower || storage.getAllManpower();
    const breakdowns = customData?.breakdowns || storage.getAllBreakdowns();
    const suppliers = customData?.suppliers || storage.getAllSuppliers();
    const fuelStocks = customData?.fuelStocks || storage.getAllFuelStockInputs();
    const fuelTransfers = customData?.fuelTransfers || storage.getAllFuelTransfers();
    const oilStocks = customData?.oilStocks || storage.getAllOilStockInputs();
    const fuelDistributions = customData?.fuelDistributions || storage.getAllFuelDistributions();
    const oilDistributions = customData?.oilDistributions || storage.getAllOilDistributions();
    const p2hRecords = customData?.p2hRecords || storage.getAllP2HRecords();

    await syncAllDataToGoogleSheets(spreadsheetId, {
      units,
      manpower,
      breakdowns,
      suppliers,
      fuelStocks,
      fuelTransfers,
      oilStocks,
      fuelDistributions,
      oilDistributions,
      p2hRecords
    });

    console.log('[Auto-Sync Realtime] Data berhasil diperbarui otomatis ke Google Sheets!');
    return true;
  } catch (err) {
    console.warn('[Auto-Sync Realtime] Gagal sinkronisasi otomatis ke Google Sheets:', err);
    return false;
  } finally {
    isAutoSyncRunning = false;
    if (pendingAutoSync) {
      pendingAutoSync = false;
      setTimeout(() => triggerAutoSyncToGoogleSheets(), 1000);
    }
  }
}

