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
  diketahuiName: string;
  diketahuiJabatan: string;
  diperiksaName?: string;
  diperiksaJabatan?: string;
  administrasiList: ManpowerData[];
  kabagList: ManpowerData[];
  spvList?: ManpowerData[];
}

/**
 * Lembar Pengesahan Laporan FOG / Bahan Bakar & Pelumas (3 Pihak sesuai instruksi user):
 * 1. Petugas FOG = Yang membuat Laporan
 * 2. Petugas Inventory = Diperiksa oleh
 * 3. Kabag Workshop = Mengetahui & Menyetujui
 */
export interface FogReportSignatories {
  petugasFogName: string;
  petugasFogJabatan: string;
  petugasInventoryName: string;
  petugasInventoryJabatan: string;
  kabagWorkshopName: string;
  kabagWorkshopJabatan: string;
  fogList: ManpowerData[];
  inventoryList: ManpowerData[];
  kabagList: ManpowerData[];
  allManpowerList: ManpowerData[];
}

/**
 * Helper untuk menentukan penandatangan resmi Laporan Breakdown (2 Pihak):
 * 1. Administrasi = Dibuat Oleh (Otomatis dari Modul 2 Manpower)
 * 2. Kabag Workshop = Mengetahui & Menyetujui (Otomatis dari Modul 2 Manpower)
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

  // 2. Filter personil berjabatan KABAG WORKSHOP dari Modul 2
  const kabagList = manpowerList.filter((m) => {
    const j = (m.jabatan || '').toUpperCase().trim();
    return (
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

  // 1. Dibuat Oleh: Administrasi
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
  } else {
    pembuatName = 'Admin Workshop';
    pembuatJabatan = 'Administrasi';
  }

  // 2. Mengetahui & Menyetujui: Kabag Workshop
  let diketahuiName = '';
  let diketahuiJabatan = 'Kabag Workshop';

  if (kabagList.length > 0) {
    diketahuiName = kabagList[0].nama;
    diketahuiJabatan = kabagList[0].jabatan || 'Kabag Workshop';
  } else {
    diketahuiName = 'Kabag Workshop';
    diketahuiJabatan = 'Kabag Workshop';
  }

  // Opsional Diperiksa
  let diperiksaName = '';
  let diperiksaJabatan = 'Supervisor Maintenance';
  if (spvList.length > 0) {
    diperiksaName = spvList[0].nama;
    diperiksaJabatan = spvList[0].jabatan || 'Supervisor Maintenance';
  } else if (kabagList.length > 0) {
    diperiksaName = kabagList[0].nama;
    diperiksaJabatan = kabagList[0].jabatan || 'Kabag Workshop';
  }

  return {
    pembuatName,
    pembuatJabatan,
    diketahuiName,
    diketahuiJabatan,
    diperiksaName,
    diperiksaJabatan,
    administrasiList,
    kabagList,
    spvList,
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
  // 1. Filter personil PETUGAS FOG dari Modul 2
  const fogList = manpowerList.filter((m) => {
    const j = (m.jabatan || '').toUpperCase().trim();
    return (
      j === 'PETUGAS FOG' ||
      j.includes('FOG') ||
      j.includes('FUEL') ||
      j.includes('SOLAR') ||
      j.includes('LUBRICANT') ||
      j.includes('CHECKER')
    );
  });

  // 2. Filter personil PETUGAS INVENTORY dari Modul 2
  const inventoryList = manpowerList.filter((m) => {
    const j = (m.jabatan || '').toUpperCase().trim();
    return (
      j === 'PETUGAS INVENTORY' ||
      j.includes('INVENTORY') ||
      j.includes('GUDANG') ||
      j.includes('LOGISTIK') ||
      j.includes('MATERIAL') ||
      j.includes('SPAREPART')
    );
  });

  // 3. Filter personil KABAG WORKSHOP dari Modul 2
  const kabagList = manpowerList.filter((m) => {
    const j = (m.jabatan || '').toUpperCase().trim();
    return (
      j === 'KABAG WORKSHOP' ||
      j.includes('KABAG') ||
      j.includes('KEPALA BAGIAN') ||
      j.includes('HEAD WORKSHOP') ||
      j.includes('KEPALA BENGKEL')
    );
  });

  // 1. Yang Membuat Laporan: Petugas FOG
  let petugasFogName = '';
  let petugasFogJabatan = 'Petugas FOG';
  if (fogList.length > 0) {
    const currentMatch = currentUser
      ? fogList.find(
          (m) =>
            m.nama?.toLowerCase().trim() === currentUser.fullName?.toLowerCase().trim() ||
            m.noWa === currentUser.username
        )
      : undefined;
    const chosen = currentMatch || fogList[0];
    petugasFogName = chosen.nama;
    petugasFogJabatan = chosen.jabatan || 'Petugas FOG';
  } else if (currentUser?.fullName) {
    petugasFogName = currentUser.fullName;
    petugasFogJabatan = currentUser.jabatan || 'Petugas FOG';
  } else if (manpowerList.length > 0) {
    petugasFogName = manpowerList[0].nama;
    petugasFogJabatan = manpowerList[0].jabatan || 'Petugas FOG';
  } else {
    petugasFogName = 'Petugas FOG Lapangan';
    petugasFogJabatan = 'Petugas FOG';
  }

  // 2. Diperiksa Oleh: Petugas Inventory
  let petugasInventoryName = '';
  let petugasInventoryJabatan = 'Petugas Inventory';
  if (inventoryList.length > 0) {
    petugasInventoryName = inventoryList[0].nama;
    petugasInventoryJabatan = inventoryList[0].jabatan || 'Petugas Inventory';
  } else {
    // Cari personil administrasi atau manpower lainnya jika belum ada jabatan inventory khusus
    const adminOrAny = manpowerList.find((m) => {
      const j = (m.jabatan || '').toUpperCase().trim();
      return j === 'ADMINISTRASI' || j.includes('ADMIN');
    }) || manpowerList[1] || manpowerList[0];

    petugasInventoryName = adminOrAny ? adminOrAny.nama : 'Petugas Inventory';
    petugasInventoryJabatan = adminOrAny ? adminOrAny.jabatan || 'Petugas Inventory' : 'Petugas Inventory';
  }

  // 3. Mengetahui & Menyetujui: Kabag Workshop
  let kabagWorkshopName = 'Dodik Mariyadi';
  let kabagWorkshopJabatan = 'Kabag Workshop';
  const foundDodik = kabagList.find((m) => m.nama?.toLowerCase().includes('dodik') || m.nama?.toLowerCase().includes('mariyadi'));
  if (foundDodik) {
    kabagWorkshopName = foundDodik.nama;
    kabagWorkshopJabatan = foundDodik.jabatan || 'Kabag Workshop';
  } else if (kabagList.length > 0) {
    kabagWorkshopName = kabagList[0].nama;
    kabagWorkshopJabatan = kabagList[0].jabatan || 'Kabag Workshop';
  } else {
    kabagWorkshopName = 'Dodik Mariyadi';
    kabagWorkshopJabatan = 'Kabag Workshop';
  }

  return {
    petugasFogName,
    petugasFogJabatan,
    petugasInventoryName,
    petugasInventoryJabatan,
    kabagWorkshopName,
    kabagWorkshopJabatan,
    fogList,
    inventoryList,
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
    inventoryName = inventoryOrAny ? inventoryOrAny.nama : 'Staff Inventory';
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

