// Semua tanggal bisnis berupa string 'YYYY-MM-DD' (WIB), jadi perbandingan string = perbandingan tanggal.

const todayWIB = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

// '2026-11-02', 5 → '2021-11-02'. Tanggal 29 Feb boleh "tidak ada"; hasilnya tetap benar untuk dibandingkan.
const kurangiTahun = (tanggal, tahun) =>
  `${Number(tanggal.slice(0, 4)) - tahun}${tanggal.slice(4)}`;

// '2026-02' → { awal: '2026-02-01', akhir: '2026-02-28' }
function rentangBulan(bulan) {
  const [y, m] = bulan.split('-').map(Number);
  const hariTerakhir = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { awal: `${bulan}-01`, akhir: `${bulan}-${String(hariTerakhir).padStart(2, '0')}` };
}

module.exports = { todayWIB, kurangiTahun, rentangBulan };
