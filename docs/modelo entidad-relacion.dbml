// Esquema de Base de Datos para Consultoritas
// Proyecto: Gestión Documental e Inteligencia Artificial (RAG)

Table users {
  id uuid [pk]
  email varchar [unique, not null]
  role varchar // "Asesor", "SME", "Freelance"
  last_login timestamp
  created_at timestamp [default: `now()`]
}

Table business {
  id uuid [pk]
  name varchar [not null]
  tax_id varchar [unique, not null] // CIF/NIF
  sector varchar
  created_at timestamp [default: `now()`]
}

// Tabla intermedia para gestionar la multitenencia
Table user_business {
  id integer [pk, increment]
  user_id uuid [ref: > users.id]
  business_id uuid [ref: > business.id]
  role_in_business varchar // "Admin", "Editor", "Viewer"

  indexes {
    (user_id, business_id) [unique]
  }
}

Table documents {
  id uuid [pk]
  business_id uuid [ref: > business.id]
  file_name varchar
  storage_path varchar // Ruta en Supabase Storage
  status varchar // "Pendiente", "Procesado", "Error"
  doc_type varchar // "Factura", "Gasto", "Ingreso"
  uploaded_at timestamp [default: `now()`]
}

// Datos fiscales extraídos por el OCR (Gemini API)
Table invoice_data {
  id uuid [pk]
  document_id uuid [unique, ref: - documents.id]
  supplier_name varchar
  supplier_tax_id varchar
  issue_date date
  tax_base decimal(12,2)
  tax_rate decimal(5,2)
  total_amount decimal(12,2)
  currency varchar [default: "EUR"]
}

// Fragmentación de texto para el motor RAG
Table document_chunks {
  id uuid [pk]
  document_id uuid [ref: > documents.id]
  content_snippet text
  page_number integer
}

// Almacenamiento de vectores (pgvector)
Table vector_store {
  id uuid [pk]
  chunk_id uuid [unique, ref: - document_chunks.id]
  embedding "vector(768)" // Dimensión para Gemini Embeddings
}

Table conversations {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  title varchar
  created_at timestamp [default: `now()`]
}

Table messages {
  id uuid [pk]
  conversation_id uuid [ref: > conversations.id]
  role varchar // "User", "Assistant"
  content text
  metadata jsonb // Referencias a documentos o chunks
  sent_at timestamp [default: `now()`]
}
