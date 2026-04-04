// src/api/academic.ts

import { apiClient } from "./client";

export interface Term {
  id: number;
  name: string;
}

export interface Course {
  id: number;
  name: string;
  term_id?: number | null;
}

export interface SessionItem {
  id: number;
  name: string;
  course_id?: number | null;
}

export const getTerms = async (): Promise<Term[]> => {
  const { data } = await apiClient.get<Term[]>("/academic/terms");
  return data;
};

export const createTerm = async (name: string): Promise<Term> => {
  const { data } = await apiClient.post<Term>("/academic/terms", { name });
  return data;
};

export const updateTerm = async (termId: number, name: string): Promise<Term> => {
  const { data } = await apiClient.patch<Term>(`/academic/terms/${termId}`, { name });
  return data;
};

export const deleteTerm = async (termId: number): Promise<{ message: string }> => {
  const { data } = await apiClient.delete<{ message: string }>(`/academic/terms/${termId}`);
  return data;
};

export const getCourses = async (termId: number): Promise<Course[]> => {
  const { data } = await apiClient.get<Course[]>(`/academic/terms/${termId}/courses`);
  return data;
};

export const createCourse = async (name: string, termId: number): Promise<Course> => {
  const { data } = await apiClient.post<Course>("/academic/courses", {
    name,
    term_id: termId,
  });
  return data;
};

export const updateCourse = async (courseId: number, name: string): Promise<Course> => {
  const { data } = await apiClient.patch<Course>(`/academic/courses/${courseId}`, { name });
  return data;
};

export const deleteCourse = async (courseId: number): Promise<{ message: string }> => {
  const { data } = await apiClient.delete<{ message: string }>(`/academic/courses/${courseId}`);
  return data;
};

export const getSessions = async (courseId: number): Promise<SessionItem[]> => {
  const { data } = await apiClient.get<SessionItem[]>(`/academic/courses/${courseId}/sessions`);
  return data;
};

export const createSession = async (name: string, courseId: number): Promise<SessionItem> => {
  const { data } = await apiClient.post<SessionItem>("/academic/sessions", {
    name,
    course_id: courseId,
  });
  return data;
};

export const updateSession = async (sessionId: number, name: string): Promise<SessionItem> => {
  const { data } = await apiClient.patch<SessionItem>(`/academic/sessions/${sessionId}`, { name });
  return data;
};

export const deleteSession = async (sessionId: number): Promise<{ message: string }> => {
  const { data } = await apiClient.delete<{ message: string }>(`/academic/sessions/${sessionId}`);
  return data;
};