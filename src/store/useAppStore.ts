// src/store/useAppStore.ts

import { create } from "zustand";
import type { Material, Transcript } from "../api/content";

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 3.5, 4] as const;

type SessionPath = {
  termName: string;
  courseName: string;
  sessionName: string;
};

interface AppState {
  currentSessionId: number | null;
  currentSessionPath: SessionPath | null;
  isSessionModalOpen: boolean;

  viewingMaterial: Material | null;
  playingMaterial: Material | null;
  activeNoteMaterial: Material | null;

  transcripts: Transcript[];
  isTranscriptLoading: boolean;

  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;

  mediaElement: HTMLMediaElement | null;
  subtitlePosition: "bottom" | "top";

  setCurrentSession: (sessionId: number, path: SessionPath) => void;
  clearCurrentSession: () => void;
  openSessionModal: () => void;
  closeSessionModal: () => void;

  setViewingMaterial: (material: Material | null) => void;
  setPlayingMaterial: (material: Material | null) => void;
  setActiveNoteMaterial: (material: Material | null) => void;

  setTranscripts: (items: Transcript[]) => void;
  setIsTranscriptLoading: (value: boolean) => void;

  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (value: boolean) => void;
  setPlaybackRate: (rate: number) => void;

  setMediaElement: (element: HTMLMediaElement | null) => void;
  setSubtitlePosition: (pos: "bottom" | "top") => void;
  toggleSubtitlePosition: () => void;

  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  skipBy: (delta: number) => void;
  increasePlaybackRate: () => void;
  decreasePlaybackRate: () => void;

  openMaterial: (material: Material) => void;
  resetPlaybackState: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentSessionId: null,
  currentSessionPath: null,
  isSessionModalOpen: true,

  viewingMaterial: null,
  playingMaterial: null,
  activeNoteMaterial: null,

  transcripts: [],
  isTranscriptLoading: false,

  currentTime: 0,
  duration: 0,
  isPlaying: false,
  playbackRate: 1,

  mediaElement: null,
  subtitlePosition: "bottom",

  setCurrentSession: (sessionId, path) =>
    set({
      currentSessionId: sessionId,
      currentSessionPath: path,
      isSessionModalOpen: false,

      viewingMaterial: null,
      playingMaterial: null,
      activeNoteMaterial: null,

      transcripts: [],
      isTranscriptLoading: false,

      currentTime: 0,
      duration: 0,
      isPlaying: false,
      playbackRate: 1,
    }),

  clearCurrentSession: () =>
    set({
      currentSessionId: null,
      currentSessionPath: null,
      isSessionModalOpen: true,

      viewingMaterial: null,
      playingMaterial: null,
      activeNoteMaterial: null,

      transcripts: [],
      isTranscriptLoading: false,

      currentTime: 0,
      duration: 0,
      isPlaying: false,
      playbackRate: 1,
    }),

  openSessionModal: () => set({ isSessionModalOpen: true }),

  closeSessionModal: () =>
    set((state) => {
      // currentSessionId가 없으면 강제 선택 모드이므로 닫히지 않게
      if (!state.currentSessionId) {
        return state;
      }
      return { isSessionModalOpen: false };
    }),

  setViewingMaterial: (material) => set({ viewingMaterial: material }),
  setPlayingMaterial: (material) => set({ playingMaterial: material }),
  setActiveNoteMaterial: (material) => set({ activeNoteMaterial: material }),

  setTranscripts: (items) => set({ transcripts: items }),
  setIsTranscriptLoading: (value) => set({ isTranscriptLoading: value }),

  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (value) => set({ isPlaying: value }),

  setPlaybackRate: (rate) => {
    const { mediaElement } = get();
    if (mediaElement) {
      mediaElement.playbackRate = rate;
    }
    set({ playbackRate: rate });
  },

  setMediaElement: (element) => set({ mediaElement: element }),

  setSubtitlePosition: (pos) => set({ subtitlePosition: pos }),

  toggleSubtitlePosition: () => {
    const { subtitlePosition } = get();
    set({ subtitlePosition: subtitlePosition === "bottom" ? "top" : "bottom" });
  },

  togglePlayPause: () => {
    const { mediaElement, isPlaying, playingMaterial } = get();
    if (!mediaElement || !playingMaterial) return;

    if (isPlaying) {
      mediaElement.pause();
    } else {
      mediaElement.play().catch((error) => {
        console.error("미디어 재생 실패:", error);
      });
    }
  },

  seekTo: (time) => {
    const { mediaElement } = get();
    if (!mediaElement) return;

    mediaElement.currentTime = time;
    set({ currentTime: time });
  },

  skipBy: (delta) => {
    const { mediaElement, duration } = get();
    if (!mediaElement) return;

    const nextTime = Math.max(
      0,
      Math.min(mediaElement.currentTime + delta, duration || 0)
    );

    mediaElement.currentTime = nextTime;
    set({ currentTime: nextTime });
  },

  increasePlaybackRate: () => {
    const { playbackRate } = get();
    const currentIndex = PLAYBACK_RATES.findIndex((rate) => rate === playbackRate);
    const nextIndex = Math.min(currentIndex + 1, PLAYBACK_RATES.length - 1);
    get().setPlaybackRate(PLAYBACK_RATES[nextIndex]);
  },

  decreasePlaybackRate: () => {
    const { playbackRate } = get();
    const currentIndex = PLAYBACK_RATES.findIndex((rate) => rate === playbackRate);
    const prevIndex = Math.max(currentIndex - 1, 0);
    get().setPlaybackRate(PLAYBACK_RATES[prevIndex]);
  },

  openMaterial: (material) =>
    set((state) => {
      if (material.type === "note") {
        return {
          activeNoteMaterial: material,
        };
      }

      if (material.type === "pdf") {
        return {
          viewingMaterial: material,
        };
      }

      if (material.type === "video") {
        return {
          viewingMaterial: material,
          playingMaterial: material,
          transcripts: [],
          isTranscriptLoading: false,
          currentTime: 0,
          duration: 0,
          isPlaying: false,
        };
      }

      const keepCurrentView =
        !!state.viewingMaterial &&
        (state.viewingMaterial.type === "pdf" ||
          state.viewingMaterial.type === "note");

      return {
        viewingMaterial: keepCurrentView ? state.viewingMaterial : material,
        playingMaterial: material,
        transcripts: [],
        isTranscriptLoading: false,
        currentTime: 0,
        duration: 0,
        isPlaying: false,
      };
    }),

  resetPlaybackState: () =>
    set({
      currentTime: 0,
      duration: 0,
      isPlaying: false,
    }),
}));