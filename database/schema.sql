-- =====================================================================
-- Sistem Monitoring Kesehatan Ibu & Anak (Posyandu) — skema PostgreSQL
-- =====================================================================

CREATE TABLE posyandu (
  id              SERIAL PRIMARY KEY,
  nama            VARCHAR(100) NOT NULL,
  alamat          TEXT,
  desa            VARCHAR(100),
  kecamatan       VARCHAR(100),
  kabupaten_kota  VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kader (
  id              SERIAL PRIMARY KEY,
  posyandu_id     INTEGER NOT NULL REFERENCES posyandu(id) ON DELETE RESTRICT,
  nama            VARCHAR(100) NOT NULL,
  username        VARCHAR(30) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  no_hp           VARCHAR(15),
  role            VARCHAR(10) NOT NULL DEFAULT 'kader',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_kader_role CHECK (role IN ('admin', 'kader'))
);

CREATE TABLE ibu (
  id              SERIAL PRIMARY KEY,
  posyandu_id     INTEGER NOT NULL REFERENCES posyandu(id) ON DELETE RESTRICT,
  nik             CHAR(16) NOT NULL,
  nama            VARCHAR(100) NOT NULL,
  tanggal_lahir   DATE NOT NULL,
  alamat          TEXT NOT NULL,
  no_hp           VARCHAR(15),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT chk_ibu_nik CHECK (nik ~ '^[0-9]{16}$')
);

CREATE TABLE balita (
  id              SERIAL PRIMARY KEY,
  ibu_id          INTEGER NOT NULL REFERENCES ibu(id) ON DELETE RESTRICT,
  nik             CHAR(16),
  nama            VARCHAR(100) NOT NULL,
  jenis_kelamin   CHAR(1) NOT NULL,
  tanggal_lahir   DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT chk_balita_nik CHECK (nik IS NULL OR nik ~ '^[0-9]{16}$'),
  CONSTRAINT chk_balita_jk  CHECK (jenis_kelamin IN ('L', 'P'))
);

CREATE TABLE pemeriksaan_balita (
  id                 SERIAL PRIMARY KEY,
  balita_id          INTEGER NOT NULL REFERENCES balita(id) ON DELETE RESTRICT,
  kader_id           INTEGER NOT NULL REFERENCES kader(id) ON DELETE RESTRICT,
  tanggal_kunjungan  DATE NOT NULL,
  berat_badan        NUMERIC(4,2) NOT NULL,
  tinggi_badan       NUMERIC(4,1) NOT NULL,
  lingkar_kepala     NUMERIC(4,1),
  lila               NUMERIC(4,1),
  catatan            TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  CONSTRAINT chk_pb_bb   CHECK (berat_badan BETWEEN 0.5 AND 40),
  CONSTRAINT chk_pb_tb   CHECK (tinggi_badan BETWEEN 30 AND 130),
  CONSTRAINT chk_pb_lk   CHECK (lingkar_kepala IS NULL OR lingkar_kepala BETWEEN 25 AND 60),
  CONSTRAINT chk_pb_lila CHECK (lila IS NULL OR lila BETWEEN 5 AND 30)
);

CREATE TABLE pemeriksaan_ibu_hamil (
  id                     SERIAL PRIMARY KEY,
  ibu_id                 INTEGER NOT NULL REFERENCES ibu(id) ON DELETE RESTRICT,
  kader_id               INTEGER NOT NULL REFERENCES kader(id) ON DELETE RESTRICT,
  tanggal_kunjungan      DATE NOT NULL,
  usia_kehamilan_minggu  SMALLINT NOT NULL,
  berat_badan            NUMERIC(5,2) NOT NULL,
  tekanan_sistolik       SMALLINT NOT NULL,
  tekanan_diastolik      SMALLINT NOT NULL,
  lila                   NUMERIC(4,1),
  keluhan                TEXT,
  catatan                TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ,
  CONSTRAINT chk_pih_usia  CHECK (usia_kehamilan_minggu BETWEEN 1 AND 45),
  CONSTRAINT chk_pih_bb    CHECK (berat_badan BETWEEN 30 AND 200),
  CONSTRAINT chk_pih_sis   CHECK (tekanan_sistolik BETWEEN 60 AND 250),
  CONSTRAINT chk_pih_dia   CHECK (tekanan_diastolik BETWEEN 30 AND 150),
  CONSTRAINT chk_pih_td    CHECK (tekanan_diastolik < tekanan_sistolik),
  CONSTRAINT chk_pih_lila  CHECK (lila IS NULL OR lila BETWEEN 10 AND 60)
);

-- Keunikan hanya berlaku untuk data aktif (belum di-soft-delete)
CREATE UNIQUE INDEX uq_ibu_nik_aktif    ON ibu (nik) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_balita_nik_aktif ON balita (nik) WHERE deleted_at IS NULL AND nik IS NOT NULL;
CREATE UNIQUE INDEX uq_pb_per_tanggal   ON pemeriksaan_balita (balita_id, tanggal_kunjungan) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_pih_per_tanggal  ON pemeriksaan_ibu_hamil (ibu_id, tanggal_kunjungan) WHERE deleted_at IS NULL;

-- Indeks pencarian, riwayat, dan rekap
CREATE INDEX idx_kader_posyandu   ON kader (posyandu_id);
CREATE INDEX idx_ibu_posyandu     ON ibu (posyandu_id, nama);
CREATE INDEX idx_balita_ibu       ON balita (ibu_id);
CREATE INDEX idx_pb_tanggal       ON pemeriksaan_balita (tanggal_kunjungan);
CREATE INDEX idx_pb_kader         ON pemeriksaan_balita (kader_id);
CREATE INDEX idx_pih_tanggal      ON pemeriksaan_ibu_hamil (tanggal_kunjungan);
CREATE INDEX idx_pih_kader        ON pemeriksaan_ibu_hamil (kader_id);
