import { ManpowerData, UserAccount } from '../types';

/**
 * Validasi Pelaporan Breakdown (2 Pihak sesuai instruksi user):
 * 1. Administrasi = Dibuat Oleh
 * 2. Kabag Workshop = Mengetahui & Menyetujui
 * (diperiksaName opsional untuk backwards compatibility)
 */
export interface ReportSignatories {
  pembuatName: string;
  pembuatJabatan: string;
  diperiksaName: string;
  diperiksaJabatan: string;
  disetujuiName: string;
  disetujuiJabatan: string;
  diketahuiName: string; // compatibility alias
  diketahuiJabatan: string; // compatibility alias
  administrasiList: ManpowerData[];
  kabagList: ManpowerData[];
  spvList?: ManpowerData[];
  allManpowerList: ManpowerData[];
}

/**
 * Lembar Pengesahan Laporan FOG / Bahan Bakar & Pelumas (3 Pihak seragam):
 * 1. Di Buat Oleh = Dropdown modul 2 jabatan administrasi
 * 2. Diperiksa Oleh = Dropdown modul 2 jabatan administrasi
 * 3. Disetujui Oleh = Kabag Workshop (Dodik Mariyadi)
 */
export interface FogReportSignatories {
  pembuatName: string;
  pembuatJabatan: string;
  diperiksaName: string;
  diperiksaJabatan: string;
  disetujuiName: string;
  disetujuiJabatan: string;
  petugasFogName: string; // compatibility alias
  petugasFogJabatan: string; // compatibility alias
  petugasInventoryName: string; // compatibility alias
  petugasInventoryJabatan: string; // compatibility alias
  kabagWorkshopName: string; // compatibility alias
  kabagWorkshopJabatan: string; // compatibility alias
  administrasiList: ManpowerData[];
  fogList: ManpowerData[];
  inventoryList: ManpowerData[];
  kabagList: ManpowerData[];
  allManpowerList: ManpowerData[];
}

/**
 * Helper untuk menentukan penandatangan resmi Laporan (3 Pihak Seragam):
 * 1. Di Buat Oleh = Dropdown Modul 2 Jabatan Administrasi
 * 2. Diperiksa Oleh = Dropdown Modul 2 Jabatan Administrasi
 * 3. Disetujui Oleh = Kabag Workshop (Dodik Mariyadi)
 */
export function resolveReportSignatories(
  manpowerList: ManpowerData[] = [],
  currentUser?: UserAccount
): ReportSignatories {
  // 1. Filter personil berjabatan ADMINISTRASI dari Modul 2
  const administrasiList = manpowerList.filter((m) => {
    const j = (m.jabatan || '').toUpperCase().trim();
    return j === 'ADMINISTRASI' || j.includes('ADMIN');
  });

  // 2. Filter personil berjabatan KABAG WORKSHOP dari Modul 2 (Prioritaskan Dodik Mariyadi)
  const kabagList = manpowerList.filter((m) => {
    const j = (m.jabatan || '').toUpperCase().trim();
    const n = (m.nama || '').toLowerCase().trim();
    return (
      n.includes('dodik') ||
      n.includes('mariyadi') ||
      j === 'KABAG WORKSHOP' ||
      j.includes('KABAG') ||
      j.includes('KEPALA BAGIAN') ||
      j.includes('HEAD WORKSHOP') ||
      j.includes('KEPALA BENGKEL')
    );
  });

  // Optional: SPV List jika dibutuhkan
  const spvList = manpowerList.filter((m) => {
    const j = (m.jabatan || '').toUpperCase().trim();
    return j === 'SPV' || j.includes('SPV') || j.includes('SUPERVISOR');
  });

  // 1. Di Buat Oleh: Dropdown Modul 2 Jabatan Administrasi
  let pembuatName = '';
  let pembuatJabatan = 'Administrasi';

  if (administrasiList.length > 0) {
    const currentAdminMatch = currentUser
      ? administrasiList.find(
          (m) =>
            m.nama?.toLowerCase().trim() === currentUser.fullName?.toLowerCase().trim() ||
            m.noWa === currentUser.username
        )
      : undefined;

    const chosen = currentAdminMatch || administrasiList[0];
    pembuatName = chosen.nama;
    pembuatJabatan = chosen.jabatan || 'Administrasi';
  } else if (currentUser?.fullName) {
    pembuatName = currentUser.fullName;
    pembuatJabatan = currentUser.jabatan || 'Administrasi';
  } else if (manpowerList.length > 0) {
    pembuatName = manpowerList[0].nama;
    pembuatJabatan = manpowerList[0].jabatan || 'Administrasi';
  } else {
    pembuatName = 'Admin Workshop';
    pembuatJabatan = 'Administrasi';
  }

  // 2. Diperiksa Oleh: Dropdown Modul 2 Jabatan Administrasi (ambil personil admin ke-2 atau berikutnya)
  let diperiksaName = '';
  let diperiksaJabatan = 'Administrasi';

  if (administrasiList.length > 1) {
    diperiksaName = administrasiList[1].nama;
    diperiksaJabatan = administrasiList[1].jabatan || 'Administrasi';
  } else if (administrasiList.length === 1) {
    diperiksaName = administrasiList[0].nama;
    diperiksaJabatan = administrasiList[0].jabatan || 'Administrasi';
  } else if (spvList.length > 0) {
    diperiksaName = spvList[0].nama;
    diperiksaJabatan = spvList[0].jabatan || 'Supervisor Maintenance';
  } else if (manpowerList.length > 1) {
    diperiksaName = manpowerList[1].nama;
    diperiksaJabatan = manpowerList[1].jabatan || 'Administrasi';
  } else {
    diperiksaName = 'Staff Administrasi';
    diperiksaJabatan = 'Administrasi';
  }

  // 3. Disetujui Oleh: Kabag Workshop (Dodik Mariyadi)
  let disetujuiName = 'Dodik Mariyadi';
  let disetujuiJabatan = 'Kabag Workshop';

  const foundDodik = kabagList.find(
    (m) => m.nama?.toLowerCase().includes('dodik') || m.nama?.toLowerCase().includes('mariyadi')
  );
  if (foundDodik) {
    disetujuiName = foundDodik.nama;
    disetujuiJabatan = foundDodik.jabatan || 'Kabag Workshop';
  } else if (kabagList.length > 0) {
    disetujuiName = kabagList[0].nama;
    disetujuiJabatan = kabagList[0].jabatan || 'Kabag Workshop';
  } else {
    disetujuiName = 'Dodik Mariyadi';
    disetujuiJabatan = 'Kabag Workshop';
  }

  return {
    pembuatName,
    pembuatJabatan,
    diperiksaName,
    diperiksaJabatan,
    disetujuiName,
    disetujuiJabatan,
    diketahuiName: disetujuiName,
    diketahuiJabatan: disetujuiJabatan,
    administrasiList,
    kabagList,
    spvList,
    allManpowerList: manpowerList,
  };
}

/**
 * Helper untuk menentukan penandatangan Lembar Pengesahan Laporan FOG (3 Pihak):
 * 1. Petugas FOG = yang membuat Laporan
 * 2. Petugas Inventory = Diperiksa oleh
 * 3. Kabag Workshop = Mengetahui & Menyetujui
 * Semuanya dibuat dropdown dari Modul 2 (Manpower)
 */
export function resolveFogSignatories(
  manpowerList: ManpowerData[] = [],
  currentUser?: UserAccount
): FogReportSignatories {
  // Filter personil berjabatan ADMINISTRASI dari Modul 2
  const administrasiList = manpowerList.filter((m) => {
    const j = (m.jabatan || '').toUpperCase().trim();
    return j === 'ADMINISTRASI' || j.includes('ADMIN');
  });

  // Filter personil berjabatan KABAG WORKSHOP dari Modul 2 (Prioritas Dodik Mariyadi)
  const kabagList = manpowerList.filter((m) => {
    const j = (m.jabatan || '').toUpperCase().trim();
    const n = (m.nama || '').toLowerCase().trim();
    return (
      n.includes('dodik') ||
      n.includes('mariyadi') ||
      j === 'KABAG WORKSHOP' ||
      j.includes('KABAG') ||
      j.includes('KEPALA BAGIAN') ||
      j.includes('HEAD WORKSHOP') ||
      j.includes('KEPALA BENGKEL')
    );
  });

  // 1. Di Buat Oleh: Dropdown Modul 2 Jabatan Administrasi
  let pembuatName = '';
  let pembuatJabatan = 'Administrasi';
  if (administrasiList.length > 0) {
    const currentMatch = currentUser
      ? administrasiList.find(
          (m) =>
            m.nama?.toLowerCase().trim() === currentUser.fullName?.toLowerCase().trim() ||
            m.noWa === currentUser.username
        )
      : undefined;
    const chosen = currentMatch || administrasiList[0];
    pembuatName = chosen.nama;
    pembuatJabatan = chosen.jabatan || 'Administrasi';
  } else if (currentUser?.fullName) {
    pembuatName = currentUser.fullName;
    pembuatJabatan = currentUser.jabatan || 'Administrasi';
  } else if (manpowerList.length > 0) {
    pembuatName = manpowerList[0].nama;
    pembuatJabatan = manpowerList[0].jabatan || 'Administrasi';
  } else {
    pembuatName = 'Staff Administrasi FOG';
    pembuatJabatan = 'Administrasi';
  }

  // 2. Diperiksa Oleh: Dropdown Modul 2 Jabatan Administrasi
  let diperiksaName = '';
  let diperiksaJabatan = 'Administrasi';
  if (administrasiList.length > 1) {
    diperiksaName = administrasiList[1].nama;
    diperiksaJabatan = administrasiList[1].jabatan || 'Administrasi';
  } else if (administrasiList.length === 1) {
    diperiksaName = administrasiList[0].nama;
    diperiksaJabatan = administrasiList[0].jabatan || 'Administrasi';
  } else if (manpowerList.length > 1) {
    diperiksaName = manpowerList[1].nama;
    diperiksaJabatan = manpowerList[1].jabatan || 'Administrasi';
  } else {
    diperiksaName = 'Staff Administrasi';
    diperiksaJabatan = 'Administrasi';
  }

  // 3. Disetujui Oleh: Kabag Workshop (Dodik Mariyadi)
  let disetujuiName = 'Dodik Mariyadi';
  let disetujuiJabatan = 'Kabag Workshop';
  const foundDodik = kabagList.find(
    (m) => m.nama?.toLowerCase().includes('dodik') || m.nama?.toLowerCase().includes('mariyadi')
  );
  if (foundDodik) {
    disetujuiName = foundDodik.nama;
    disetujuiJabatan = foundDodik.jabatan || 'Kabag Workshop';
  } else if (kabagList.length > 0) {
    disetujuiName = kabagList[0].nama;
    disetujuiJabatan = kabagList[0].jabatan || 'Kabag Workshop';
  } else {
    disetujuiName = 'Dodik Mariyadi';
    disetujuiJabatan = 'Kabag Workshop';
  }

  return {
    pembuatName,
    pembuatJabatan,
    diperiksaName,
    diperiksaJabatan,
    disetujuiName,
    disetujuiJabatan,
    petugasFogName: pembuatName,
    petugasFogJabatan: pembuatJabatan,
    petugasInventoryName: diperiksaName,
    petugasInventoryJabatan: diperiksaJabatan,
    kabagWorkshopName: disetujuiName,
    kabagWorkshopJabatan: disetujuiJabatan,
    administrasiList,
    fogList: administrasiList,
    inventoryList: administrasiList,
    kabagList,
    allManpowerList: manpowerList,
  };
}

/**
 * Validasi 3 Pihak Laporan Summary Penggunaan Oli Per Tipe/Kategori:
 * 1. PIC FOG - Pembuat laporan (Dropdown Manpower jabatan Administrasi)
 * 2. Inventory - Di Check Oleh (Dropdown Manpower jabatan Administrasi)
 * 3. Kabag Workshop - Disetujui Oleh (Dodik Mariyadi)
 */
export interface OilSummarySignatories {
  pembuatName?: string;
  pembuatJabatan?: string;
  diperiksaName?: string;
  diperiksaJabatan?: string;
  disetujuiName?: string;
  disetujuiJabatan?: string;
  picFogName: string;
  picFogJabatan: string;
  inventoryName: string;
  inventoryJabatan: string;
  kabagWorkshopName: string;
  kabagWorkshopJabatan: string;
  administrasiList: ManpowerData[];
  allManpowerList: ManpowerData[];
}

export function resolveOilSummarySignatories(
  manpowerList: ManpowerData[] = [],
  currentUser?: UserAccount
): OilSummarySignatories {
  // 1. Filter personil dengan jabatan Administrasi
  const administrasiList = manpowerList.filter((m) => {
    const j = (m.jabatan || '').toUpperCase().trim();
    return j === 'ADMINISTRASI' || j.includes('ADMIN');
  });

  // PIC FOG - Pembuat laporan (Dropdown Manpower jabatan Administrasi)
  let picFogName = '';
  let picFogJabatan = 'Administrasi';
  if (administrasiList.length > 0) {
    const match = currentUser
      ? administrasiList.find(
          (m) =>
            m.nama?.toLowerCase().trim() === currentUser.fullName?.toLowerCase().trim() ||
            m.noWa === currentUser.username
        )
      : undefined;
    const chosen = match || administrasiList[0];
    picFogName = chosen.nama;
    picFogJabatan = chosen.jabatan || 'Administrasi';
  } else if (currentUser?.fullName) {
    picFogName = currentUser.fullName;
    picFogJabatan = currentUser.jabatan || 'Administrasi';
  } else if (manpowerList.length > 0) {
    picFogName = manpowerList[0].nama;
    picFogJabatan = manpowerList[0].jabatan || 'Administrasi';
  } else {
    picFogName = 'Staff Administrasi FOG';
    picFogJabatan = 'Administrasi';
  }

  // Inventory - Di Check Oleh (Dropdown Manpower jabatan Administrasi)
  let inventoryName = '';
  let inventoryJabatan = 'Administrasi';
  if (administrasiList.length > 1) {
    inventoryName = administrasiList[1].nama;
    inventoryJabatan = administrasiList[1].jabatan || 'Administrasi';
  } else if (administrasiList.length === 1) {
    inventoryName = administrasiList[0].nama;
    inventoryJabatan = administrasiList[0].jabatan || 'Administrasi';
  } else {
    const inventoryOrAny = manpowerList.find((m) => {
      const j = (m.jabatan || '').toUpperCase().trim();
      return j.includes('INVENTORY') || j.includes('GUDANG');
    }) || manpowerList[0];
    inventoryName = inventoryOrAny ? inventoryOrAny.nama : 'Staff Administrasi';
    inventoryJabatan = inventoryOrAny ? inventoryOrAny.jabatan || 'Administrasi' : 'Administrasi';
  }

  // Kabag Workshop - Disetujui Oleh (Default: Dodik Mariyadi)
  let kabagWorkshopName = 'Dodik Mariyadi';
  let kabagWorkshopJabatan = 'Kabag Workshop';
  const foundDodik = manpowerList.find(
    (m) =>
      m.nama?.toLowerCase().includes('dodik') ||
      m.nama?.toLowerCase().includes('mariyadi') ||
      (m.jabatan || '').toUpperCase().includes('KABAG')
  );
  if (foundDodik) {
    kabagWorkshopName = foundDodik.nama;
    kabagWorkshopJabatan = foundDodik.jabatan || 'Kabag Workshop';
  }

  return {
    pembuatName: picFogName,
    pembuatJabatan: picFogJabatan,
    diperiksaName: inventoryName,
    diperiksaJabatan: inventoryJabatan,
    disetujuiName: kabagWorkshopName,
    disetujuiJabatan: kabagWorkshopJabatan,
    picFogName,
    picFogJabatan,
    inventoryName,
    inventoryJabatan,
    kabagWorkshopName,
    kabagWorkshopJabatan,
    administrasiList,
    allManpowerList: manpowerList,
  };
}

