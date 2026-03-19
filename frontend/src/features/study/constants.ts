import type { BoardInfo, BoardMedia, TranscriptSegment } from "./types"

export const MOCK_BOARD_INFO: BoardInfo = {
  folder: "컴퓨터그래픽스",
  title: "Lecture 04: 2D 그래픽 - 컬러 모델",
  instructor: "Dr. Sarah Jenkins",
  recordedAtLabel: "2025.12.02",
  durationSeconds: 6024, // 1:40:24
}

export const MOCK_TRANSCRIPT: TranscriptSegment[] = [
  {
    id: 1,
    startSeconds: 242,
    timestampLabel: "04:02",
    text: "다음으로 RGB 모델에 대해 이야기해볼게요. 화면은 가산 혼합 방식을 사용한다는 걸 알고 계시죠.",
  },
  {
    id: 2,
    startSeconds: 255,
    timestampLabel: "04:15",
    text: "오늘은 컬러 모델을 배울 거고요, 특히 디지털 환경에서 가장 많이 사용되는 RGB와 CMYK의 차이점을 중점적으로 다루겠습니다.",
  },
  {
    id: 3,
    startSeconds: 278,
    timestampLabel: "04:38",
    text: "이 부분은 과제와 연관이 있으니 꼭 기억해 두시기 바랍니다. CMYK는 인쇄물 제작 시 기준이 되는 감산 혼합 방식입니다.",
  },
  {
    id: 4,
    startSeconds: 312,
    timestampLabel: "05:12",
    text: "Why does a color on your monitor look different when printed on paper? That's exactly why we study these models.",
  },
  {
    id: 5,
    startSeconds: 345,
    timestampLabel: "05:45",
    text: "Let's look at the gamut chart here. The visible spectrum is much larger than what any device can reproduce.",
  },
  {
    id: 6,
    startSeconds: 390,
    timestampLabel: "06:30",
    text: "인간이 빛에 대해서 우리가 어떤 지각을 갖게 되는데, 그 지각은 크게 세 가지 감각의 형태로써 뇌에 느껴지게 됩니다.",
  },
  {
    id: 7,
    startSeconds: 425,
    timestampLabel: "07:05",
    text: "예를 들어서 태양광을 생각해보면, 태양광은 여러 스펙트럼의 빛 에너지들로 구성이 되어 있는데 우리는 그것들을 백색광이라고 느끼게 됩니다.",
  },
  {
    id: 8,
    startSeconds: 480,
    timestampLabel: "08:00",
    text: "색의 삼원색인 빨강, 초록, 파랑을 적절히 조합하면 우리가 볼 수 있는 대부분의 색을 표현할 수 있습니다.",
  },
]

export const PLAYBACK_RATES = [0.25, 0.5, 1, 1.25, 1.5, 2, 2.5, 3, 4] as const
export type PlaybackRate = (typeof PLAYBACK_RATES)[number]

interface MockBoardDetail {
  boardInfo: BoardInfo
  media?: BoardMedia | null
  pdf?: BoardMedia | null
  transcript: TranscriptSegment[]
}

const MOCK_BOARD_DETAILS_BY_ID: Record<number, MockBoardDetail> = {
  101: {
    boardInfo: {
      folder: "Operating System",
      title: "Process Scheduling Techniques",
      instructor: "Prof. Minjun Kim",
      recordedAtLabel: "2023.10.24",
      durationSeconds: 2720,
    },
    transcript: MOCK_TRANSCRIPT,
    media: {
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      mimeType: "audio/mp3",
    },
    pdf: {
      url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      mimeType: "application/pdf",
    },
  },
  102: {
    boardInfo: {
      folder: "Operating System",
      title: "Memory Management Deep Dive",
      instructor: "Prof. Minjun Kim",
      recordedAtLabel: "2023.10.25",
      durationSeconds: 1935,
    },
    transcript: MOCK_TRANSCRIPT.map((item) => ({
      ...item,
      text: `메모리 관리: ${item.text}`,
    })),
  },
  103: {
    boardInfo: {
      folder: "Algorithm",
      title: "B-Trees and Indexing",
      instructor: "Prof. Seoyeon Park",
      recordedAtLabel: "2023.10.22",
      durationSeconds: 3480,
    },
    transcript: MOCK_TRANSCRIPT.map((item) => ({
      ...item,
      text: `인덱싱 강의: ${item.text}`,
    })),
  },
  104: {
    boardInfo: {
      folder: "Computer Architecture",
      title: "Cache Coherence Protocols",
      instructor: "Prof. Hyunwoo Lee",
      recordedAtLabel: "2023.10.20",
      durationSeconds: 2470,
    },
    transcript: MOCK_TRANSCRIPT.map((item) => ({
      ...item,
      text: `캐시 일관성: ${item.text}`,
    })),
  },
}

export function getMockBoardDetailById(rawId: string | undefined): MockBoardDetail {
  if (!rawId) {
    return {
      boardInfo: MOCK_BOARD_INFO,
      transcript: MOCK_TRANSCRIPT,
      media: {
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        mimeType: "audio/mp3",
      },
      pdf: {
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        mimeType: "application/pdf",
      },
    }
  }

  const id = Number(rawId)
  if (!Number.isFinite(id)) {
    return {
      boardInfo: MOCK_BOARD_INFO,
      transcript: MOCK_TRANSCRIPT,
      media: {
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        mimeType: "audio/mp3",
      },
      pdf: {
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        mimeType: "application/pdf",
      },
    }
  }

  return MOCK_BOARD_DETAILS_BY_ID[id] ?? {
    boardInfo: {
      ...MOCK_BOARD_INFO,
      title: `${MOCK_BOARD_INFO.title} (${id})`,
    },
    transcript: MOCK_TRANSCRIPT,
    media: {
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      mimeType: "audio/mp3",
    },
    pdf: {
      url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      mimeType: "application/pdf",
    },
  }
}
