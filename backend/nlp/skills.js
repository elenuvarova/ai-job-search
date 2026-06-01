// Gazetteer-based skill extractor — no API calls

const SKILL_DEFS = [
  // Programming
  { skill: "Python", re: /\bpython\b/i },
  { skill: "SQL", re: /\bsql\b/i },
  { skill: "R", re: /\bR\b(?!\+|#)/ },
  { skill: "Scala", re: /\bscala\b/i },
  { skill: "Java", re: /\bjava\b(?!script)/i },
  { skill: "JavaScript", re: /\bjavascript\b/i },
  { skill: "TypeScript", re: /\btypescript\b/i },
  { skill: "C++", re: /\bc\+\+\b/i },
  { skill: "Go", re: /\bgolang\b|\bgo\s+programming\b/i },
  // ML frameworks
  { skill: "PyTorch", re: /\bpytorch\b/i },
  { skill: "TensorFlow", re: /\btensorflow\b/i },
  { skill: "scikit-learn", re: /scikit[\s-]?learn|\bsklearn\b/i },
  { skill: "XGBoost", re: /\bxgboost\b/i },
  { skill: "LightGBM", re: /\blightgbm\b/i },
  { skill: "Keras", re: /\bkeras\b/i },
  { skill: "Hugging Face", re: /hugging\s*face|\btransformers\b.*library/i },
  // LLM / AI
  { skill: "LangChain", re: /\blangchain\b/i },
  { skill: "LlamaIndex", re: /\llamaindex\b|\bllama.?index\b/i },
  { skill: "RAG", re: /\brag\b|\bretrieval[\s-]?augmented\b/i },
  { skill: "Embeddings", re: /\bembeddings?\b/i },
  { skill: "Vector DB", re: /\bvector\s*(database|store|db)\b|\bpgvector\b|\bchroma\b|\bpinecone\b|\bweaviate\b|\bqdrant\b/i },
  { skill: "OpenAI API", re: /\bopenai\b/i },
  { skill: "Azure OpenAI", re: /azure\s+openai/i },
  // NLP
  { skill: "NLP", re: /\bnlp\b|\bnatural\s+language\s+processing\b/i },
  { skill: "spaCy", re: /\bspacy\b/i },
  { skill: "NLTK", re: /\bnltk\b/i },
  // Computer Vision
  { skill: "Computer Vision", re: /\bcomputer\s+vision\b|\bcv\b.*\bdeep\s+learning\b/i },
  { skill: "OpenCV", re: /\bopencv\b/i },
  // Data
  { skill: "Pandas", re: /\bpandas\b/i },
  { skill: "NumPy", re: /\bnumpy\b/i },
  { skill: "Spark", re: /\b(apache\s+)?spark\b/i },
  { skill: "Databricks", re: /\bdatabricks\b/i },
  { skill: "dbt", re: /\bdbt\b/i },
  { skill: "Airflow", re: /\bairflow\b/i },
  { skill: "Kafka", re: /\bkafka\b/i },
  { skill: "Snowflake", re: /\bsnowflake\b/i },
  { skill: "BigQuery", re: /\bbigquery\b/i },
  { skill: "Redshift", re: /\bredshift\b/i },
  // MLOps
  { skill: "Docker", re: /\bdocker\b/i },
  { skill: "Kubernetes", re: /\bkubernetes\b|\bk8s\b/i },
  { skill: "MLflow", re: /\bmlflow\b/i },
  { skill: "CI/CD", re: /\bci\/cd\b|\bdevops\b/i },
  { skill: "Kubeflow", re: /\bkubeflow\b/i },
  { skill: "Feature Store", re: /\bfeature\s+store\b|\bfeast\b|\btecton\b/i },
  // Cloud
  { skill: "AWS", re: /\baws\b|\bamazon\s+web\s+services\b/i },
  { skill: "GCP", re: /\bgcp\b|\bgoogle\s+cloud\b/i },
  { skill: "Azure", re: /\bazure\b/i },
  // Stats & methods
  { skill: "Statistics", re: /\bstatistics\b|\bstatistical\s+modeling\b/i },
  { skill: "A/B Testing", re: /\ba\/b\s+test|\bexperimentation\b/i },
  // Databases
  { skill: "PostgreSQL", re: /\bpostgresql\b|\bpostgres\b/i },
  { skill: "MongoDB", re: /\bmongodb\b/i },
];

export function extractSkills(description) {
  const text = description || "";
  return SKILL_DEFS
    .filter(({ re }) => re.test(text))
    .map(({ skill }) => ({ skill, confidence: 0.9 }));
}
