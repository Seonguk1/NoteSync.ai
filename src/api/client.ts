import axios from "axios";

// 1. Axios 기본 인스턴스 생성
export const apiClient = axios.create({
  baseURL: "http://127.0.0.1:8000/api/v1", // FastAPI 백엔드 주소
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // AI 처리 등 시간이 걸릴 수 있으므로 넉넉하게 30초 부여
});

// 2. 응답 인터셉터 (전역 에러 핸들링)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 모든 API 통신에서 에러가 나면 여기서 1차적으로 걸러집니다.
    console.error("🚨 [API Error]:", error.response?.data?.detail || error.message);
    return Promise.reject(error);
  }
);