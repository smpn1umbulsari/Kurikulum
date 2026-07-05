
    CREATE TABLE assessments (
      id UUID PRIMARY KEY,
      judul VARCHAR(200) NOT NULL,
      created_by UUID REFERENCES gurus(id) ON DELETE RESTRICT
    );
  