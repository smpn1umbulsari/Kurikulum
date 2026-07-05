
    CREATE TABLE gurus (
      id UUID PRIMARY KEY,
      nip VARCHAR(30) UNIQUE,
      nama VARCHAR(150) NOT NULL
    );
  