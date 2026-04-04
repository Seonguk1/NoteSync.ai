// src/api/content.ts
import { apiClient } from "./client";

export interface Material {
  id: number;
  type: "pdf" | "audio" | "video" | "note";
  original_name: string;
  relative_path?: string | null;
  file_url?: string | null;
  status: "READY" | "PROCESSING" | "COMPLETED" | "FAILED";
  created_at: string;
  session_id?: number | null;
}

export interface Transcript {
  id: number;
  material_id: number;
  start_time: number;
  end_time: number;
  content: string;
  is_edited: boolean;
}

export interface Keyword {
  id: number;
  word: string;
  session_id: number;
}

export interface Note {
  id: number;
  material_id: number;
  session_id?: number | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const getMaterials = async (sessionId: number): Promise<Material[]> => {
  const { data } = await apiClient.get<Material[]>(`/content/sessions/${sessionId}/materials`);
  return data;
};

export const uploadMaterial = async (sessionId: number, file: File): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post(`/content/sessions/${sessionId}/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

export interface MaterialUploadResponse {
  message: string;
  material_id: number;
  type: "pdf" | "audio" | "video" | "note";
  status?: "READY" | "BLOCKED" | "PROCESSING" | "COMPLETED" | "FAILED";
  batch_id?: string | null;
}

export const uploadMaterials = async (
  sessionId: number,
  files: File[]
): Promise<MaterialUploadResponse[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const { data } = await apiClient.post<MaterialUploadResponse[]>(
    `/content/sessions/${sessionId}/uploads`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return data;
};

export const updateMaterial = async (
  materialId: number,
  payload: { original_name?: string }
): Promise<Material> => {
  const { data } = await apiClient.patch<Material>(`/content/materials/${materialId}`, payload);
  return data;
};

export const deleteMaterial = async (materialId: number): Promise<{ message: string }> => {
  const { data } = await apiClient.delete<{ message: string }>(`/content/materials/${materialId}`);
  return data;
};

export const getTranscripts = async (materialId: number): Promise<Transcript[]> => {
  const { data } = await apiClient.get<Transcript[]>(`/content/materials/${materialId}/transcripts`);
  return data;
};


export const updateTranscript = async (transcriptId: number, content: string): Promise<Transcript> => {
  const { data } = await apiClient.put<Transcript>(`/content/transcripts/${transcriptId}`, {
    content,
  });
  return data;
};

export const getKeywords = async (sessionId: number): Promise<Keyword[]> => {
  const { data } = await apiClient.get<Keyword[]>(`/content/sessions/${sessionId}/keywords`);
  return data;
};

export const createNote = async (
  sessionId: number,
  payload: { title: string; content?: string }
): Promise<Note> => {
  const { data } = await apiClient.post<Note>(`/content/sessions/${sessionId}/notes`, payload);
  return data;
};

export const getNote = async (materialId: number): Promise<Note> => {
  const { data } = await apiClient.get<Note>(`/content/materials/${materialId}/note`);
  return data;
};

export const updateNote = async (
  materialId: number,
  payload: { title?: string; content?: string }
): Promise<Note> => {
  const { data } = await apiClient.put<Note>(`/content/materials/${materialId}/note`, payload);
  return data;
};


// -----------------------------
// Annotation (PDF inline notes)
// -----------------------------
export interface Annotation {
  id: number;
  material_id: number;
  page: number;
  x_rel: number;
  y_rel: number;
  w_rel?: number | null;
  h_rel?: number | null;
  text: string;
  type: string;
  author_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface AnnotationCreatePayload {
  page: number;
  x_rel: number;
  y_rel: number;
  w_rel?: number | null;
  h_rel?: number | null;
  text: string;
  type?: string;
  author_id?: number | null;
}

export interface AnnotationUpdatePayload {
  text?: string;
  x_rel?: number;
  y_rel?: number;
  w_rel?: number | null;
  h_rel?: number | null;
  type?: string;
}

export const getAnnotations = async (materialId: number): Promise<Annotation[]> => {
  const { data } = await apiClient.get<Annotation[]>(`/content/materials/${materialId}/annotations`);
  return data;
};

export const createAnnotation = async (
  materialId: number,
  payload: AnnotationCreatePayload
): Promise<Annotation> => {
  const { data } = await apiClient.post<Annotation>(`/content/materials/${materialId}/annotations`, payload);
  return data;
};

export const updateAnnotation = async (
  annotationId: number,
  payload: AnnotationUpdatePayload
): Promise<Annotation> => {
  const { data } = await apiClient.put<Annotation>(`/content/annotations/${annotationId}`, payload);
  return data;
};

export const deleteAnnotation = async (annotationId: number): Promise<{ message: string }> => {
  const { data } = await apiClient.delete<{ message: string }>(`/content/annotations/${annotationId}`);
  return data;
};