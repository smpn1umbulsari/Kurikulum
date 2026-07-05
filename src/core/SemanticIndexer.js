import fs from 'fs';
import path from 'path';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'of',
  'in', 'for', 'on', 'with', 'at', 'by', 'from', 'this', 'that', 'these', 'those',
  'it', 'its', 'we', 'you', 'they', 'he', 'she', 'us', 'them', 'as', 'if', 'then',
  'else', 'when', 'where', 'why', 'how', 'who', 'which', 'what', 'can', 'will',
  'should', 'would', 'could', 'about', 'dan', 'yang', 'di', 'ke', 'dari', 'untuk',
  'pada', 'dengan', 'adalah', 'yaitu', 'bahwa', 'oleh', 'juga', 'untuk', 'akan'
]);

export class SemanticIndexer {
  constructor(contextEngine) {
    this.contextEngine = contextEngine;
    this.localDimension = 384;
    this.corpusStats = null; // cached { df, N } for local TF-IDF fallback
  }

  /**
   * Tokenize text into words, filter out stop words and short terms
   * @param {string} text 
   * @returns {string[]}
   */
  tokenize(text) {
    if (!text) return [];
    return text.toLowerCase()
      .replace(/[^a-z0-9_\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOP_WORDS.has(w));
  }

  /**
   * Check if a real API is available for generating embeddings
   * @returns {'gemini'|'openai'|'local'}
   */
  _detectEmbeddingProvider() {
    if (process.env.GEMINI_API_KEY) return 'gemini';
    if (process.env.OPENAI_API_KEY) return 'openai';
    return 'local';
  }

  /**
   * Generate an embedding vector for a piece of text (API or Local fallback)
   * @param {string} text 
   * @returns {Promise<number[]>}
   */
  async getEmbedding(text) {
    const provider = this._detectEmbeddingProvider();

    if (provider === 'gemini') {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/text-embedding-004',
              content: { parts: [{ text }] }
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.embedding && data.embedding.values) {
            return data.embedding.values;
          }
        }
        console.warn(`[SemanticIndexer] Gemini embedding call failed (${response.status}). Falling back to local...`);
      } catch (err) {
        console.warn('[SemanticIndexer] Gemini embedding error, falling back to local:', err.message);
      }
    } else if (provider === 'openai') {
      try {
        const apiKey = process.env.OPENAI_API_KEY;
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: text
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data[0] && data.data[0].embedding) {
            return data.data[0].embedding;
          }
        }
        console.warn(`[SemanticIndexer] OpenAI embedding call failed (${response.status}). Falling back to local...`);
      } catch (err) {
        console.warn('[SemanticIndexer] OpenAI embedding error, falling back to local:', err.message);
      }
    }

    // Local Fallback: TF-IDF Feature Hashing
    return this._generateLocalEmbedding(text);
  }

  /**
   * Build the document frequency (DF) cache from all files in workspace
   */
  _buildCorpusStats() {
    this.contextEngine.start();
    let rows = [];
    try {
      rows = this.contextEngine.db.prepare('SELECT path FROM files').all();
    } catch (e) {
      // MockDatabase or SQLite fail
      try {
        rows = Object.keys(this.contextEngine.db.store.files).map(p => ({ path: p }));
      } catch (err) {}
    }

    const df = Object.create(null);
    let N = 0;

    for (const r of rows) {
      const fullPath = path.join(this.contextEngine.workspacePath, r.path);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const uniqueTerms = new Set(this.tokenize(content));
          for (const term of uniqueTerms) {
            df[term] = (df[term] || 0) + 1;
          }
          N++;
        } catch (e) {}
      }
    }

    this.corpusStats = { df, N };
  }

  /**
   * Local sentence embedding via TF-IDF Feature Hashing (384 Dimensions)
   * @param {string} text 
   * @returns {number[]} L2 normalized vector
   */
  _generateLocalEmbedding(text) {
    if (!this.corpusStats) {
      this._buildCorpusStats();
    }

    const { df, N } = this.corpusStats || { df: Object.create(null), N: 0 };
    const vector = new Array(this.localDimension).fill(0);
    const terms = this.tokenize(text);

    if (terms.length === 0) {
      return vector;
    }

    // Term Frequency (TF)
    const tf = Object.create(null);
    for (const term of terms) {
      tf[term] = (tf[term] || 0) + 1;
    }

    for (const term in tf) {
      const dfValue = df[term] || 0;
      // IDF calculation
      const idf = Math.log((N + 1) / (dfValue + 1)) + 1.0;
      const tfIdfWeight = tf[term] * idf;

      // Hash term to index 0..localDimension
      let hash = 0;
      for (let i = 0; i < term.length; i++) {
        hash = (hash << 5) - hash + term.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      const idx = Math.abs(hash) % this.localDimension;
      vector[idx] += tfIdfWeight;
    }

    // Normalize to unit vector (L2 norm)
    let sumSq = 0;
    for (let i = 0; i < this.localDimension; i++) {
      sumSq += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sumSq);
    if (norm > 0) {
      for (let i = 0; i < this.localDimension; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  /**
   * Run semantic indexing across all files in the workspace (incremental)
   */
  async indexWorkspace() {
    this.contextEngine.start();
    let files = [];
    try {
      files = this.contextEngine.db.prepare('SELECT path, hash FROM files').all();
    } catch (e) {
      try {
        files = Object.values(this.contextEngine.db.store.files);
      } catch (err) {}
    }

    // Reset corpus stats so they are fresh for this indexing pass
    this.corpusStats = null;

    const provider = this._detectEmbeddingProvider();

    // If local mode, index all files in one pass since it's instant and TF-IDF relies on corpus DF
    if (provider === 'local') {
      this._buildCorpusStats();
      for (const f of files) {
        const fullPath = path.join(this.contextEngine.workspacePath, f.path);
        if (fs.existsSync(fullPath)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const vec = this._generateLocalEmbedding(content);
            this.contextEngine.saveEmbedding(f.path, f.hash, vec);
          } catch (e) {}
        }
      }
      return;
    }

    // If API mode, execute incrementally using cached embeddings
    for (const f of files) {
      const cached = this.contextEngine.getEmbedding(f.path, f.hash);
      if (cached) {
        continue; // Already indexed and hash hasn't changed
      }

      const fullPath = path.join(this.contextEngine.workspacePath, f.path);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const sliceText = content.slice(0, 15000);
          const vec = await this.getEmbedding(sliceText);
          this.contextEngine.saveEmbedding(f.path, f.hash, vec);
        } catch (e) {
          console.warn(`[SemanticIndexer] Error indexing file '${f.path}':`, e.message);
        }
      }
    }
  }

  /**
   * Query KNN for local semantic similarities
   * @param {string} query 
   * @param {number} topK 
   * @returns {Promise<Array<{ path: string, score: number }>>}
   */
  async search(query, topK = 5) {
    const queryVector = await this.getEmbedding(query);
    const allEmbeds = this.contextEngine.getAllEmbeddings();
    const results = [];

    for (const item of allEmbeds) {
      if (item.vector.length !== queryVector.length) {
        continue;
      }

      // Cosine similarity
      let score = 0;
      for (let i = 0; i < queryVector.length; i++) {
        score += queryVector[i] * item.vector[i];
      }

      results.push({
        path: item.path,
        score
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }
}
