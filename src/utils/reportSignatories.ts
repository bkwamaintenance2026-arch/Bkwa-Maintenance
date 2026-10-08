import { ManpowerData, UserAccount } from '../types';

export interface ReportSignatories {
  pembuatName: string;
  pembuatJabatan: string;
  diperiksaName: string;
  diperiksaJabatan: string;
  diketahuiName: string;
  diketahuiJabatan: string;
  administrasiList: ManpowerData[];
  spvList: ManpowerData[];
  kabagList: ManpowerData[];
}

/**
 * Helper untuk menentukan penandatangan resmi laporan:
 * - Yang Membuat: Admin yang ditunjuk sesuai otoritas di Modul 2 Manpower (Jabatan Administrasi)
 * - Diperiksa Oleh: Otomatis mencari personil berjabatan SPV, jika tidak ada pilih "Kabag Workshop"
 * - Diketahui Oleh: Otomatis mencari personil berjabatan "Kabag Workshop"
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

  // 2. Filter personil berjabatan SPV (Supervisor)
  const spvList = manpowerList.filter((m) => {
    const j = (m.jabatan || '').toUpperCase().trim();
    return j === 'SPV' || j.includes('SPV') || j.includes('SUPERVISOR');
  });

  // 3. Filter personil berjabatan KABAG WORKSHOP
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

  // "Yang Membuat"
  let pembuatName = '';
  let pembuatJabatan = 'Administrasi';

  if (administrasiList.length > 0) {
    // Prioritaskan jika akun login saat ini cocok dengan personil Administrasi
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

  // "Diperiksa Oleh"
  let diperiksaName = '';
  let diperiksaJabatan = 'Supervisor Maintenance';

  if (spvList.length > 0) {
    diperiksaName = spvList[0].nama;
    diperiksaJabatan = spvList[0].jabatan || 'Supervisor Maintenance';
  } else if (kabagList.length > 0) {
    diperiksaName = kabagList[0].nama;
    diperiksaJabatan = kabagList[0].jabatan || 'Kabag Workshop';
  } else {
    diperiksaName = 'Supervisor Maintenance';
    diperiksaJabatan = 'Supervisor Maintenance';
  }

  // "Diketahui Oleh"
  let diketahuiName = '';
  let diketahuiJabatan = 'Kabag Workshop';

  if (kabagList.length > 0) {
    diketahuiName = kabagList[0].nama;
    diketahuiJabatan = kabagList[0].jabatan || 'Kabag Workshop';
  } else {
    diketahuiName = 'Kabag Workshop';
    diketahuiJabatan = 'Kabag Workshop';
  }

  return {
    pembuatName,
    pembuatJabatan,
    diperiksaName,
    diperiksaJabatan,
    diketahuiName,
    diketahuiJabatan,
    administrasiList,
    spvList,
    kabagList,
  };
}
