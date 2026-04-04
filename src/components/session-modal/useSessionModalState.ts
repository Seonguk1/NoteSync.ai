import { useEffect, useMemo, useState, useCallback } from "react";
import {
    createCourse,
    createSession,
    createTerm,
    deleteCourse,
    deleteSession,
    deleteTerm,
    getCourses,
    getSessions,
    getTerms,
    updateCourse,
    updateSession,
    updateTerm,
    type Course,
    type SessionItem,
    type Term,
} from "../../api/academic";
import { useAppStore } from "../../store/useAppStore";

export type EditableEntity = "term" | "course" | "session";

export type EditModalState = {
    open: boolean;
    mode: "create" | "rename";
    entity: EditableEntity;
    targetId: number | null;
    initialName: string;
};

export function useSessionModalState() {


    const isSessionModalOpen = useAppStore((state) => state.isSessionModalOpen);
    const currentSessionId = useAppStore((state) => state.currentSessionId);
    const closeSessionModal = useAppStore((state) => state.closeSessionModal);
    const setCurrentSession = useAppStore((state) => state.setCurrentSession);

    const [terms, setTerms] = useState<Term[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [sessions, setSessions] = useState<SessionItem[]>([]);

    const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

    const [openMenu, setOpenMenu] = useState<{
        entity: EditableEntity;
        id: number;
    } | null>(null);

    const [editModal, setEditModal] = useState<EditModalState>({
        open: false,
        mode: "create",
        entity: "term",
        targetId: null,
        initialName: "",
    });

    const [isLoadingTerms, setIsLoadingTerms] = useState(false);
    const [isLoadingCourses, setIsLoadingCourses] = useState(false);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const isMandatorySelection = !currentSessionId;
    const canClose = !isMandatorySelection;

    // 학기 선택이 바뀌면 강의/세션 선택 초기화 및 강의 목록 fetch
    useEffect(() => {
        if (!selectedTermId) {
            setCourses([]);
            setSelectedCourseId(null);
            setSessions([]);
            setSelectedSessionId(null);
            return;
        }
        fetchCourses(selectedTermId);
        setSelectedCourseId(null);
        setSessions([]);
        setSelectedSessionId(null);
    }, [selectedTermId]);

    // 강의 선택이 바뀌면 세션 선택 초기화 및 세션 목록 fetch
    useEffect(() => {
        if (!selectedCourseId) {
            setSessions([]);
            setSelectedSessionId(null);
            return;
        }
        fetchSessionsList(selectedCourseId);
        setSelectedSessionId(null);
    }, [selectedCourseId]);

    // 모달이 열릴 때마다 학기 목록을 자동으로 fetch
    useEffect(() => {
        if (!isSessionModalOpen) return;
        setErrorMessage("");
        fetchTerms();
    }, [isSessionModalOpen]);

    const selectedTerm = useMemo(
        () => terms.find((item) => item.id === selectedTermId) ?? null,
        [terms, selectedTermId]
    );
    const selectedCourse = useMemo(
        () => courses.find((item) => item.id === selectedCourseId) ?? null,
        [courses, selectedCourseId]
    );
    const selectedSession = useMemo(
        () => sessions.find((item) => item.id === selectedSessionId) ?? null,
        [sessions, selectedSessionId]
    );

    // 데이터 fetch 함수들
    const fetchTerms = useCallback(async () => {
        try {
            setIsLoadingTerms(true);
            const data = await getTerms();
            setTerms(data);
            if (!selectedTermId && data.length > 0) {
                setSelectedTermId(data[0].id);
            } else if (selectedTermId && !data.find((item) => item.id === selectedTermId)) {
                setSelectedTermId(data.length > 0 ? data[0].id : null);
            }
        } catch (error) {
            console.error("학기 목록 불러오기 실패:", error);
            setErrorMessage("학기 목록을 불러오지 못했습니다.");
        } finally {
            setIsLoadingTerms(false);
        }
    }, [selectedTermId]);

    const fetchCourses = useCallback(async (termId: number) => {
        try {
            setIsLoadingCourses(true);
            const data = await getCourses(termId);
            setCourses(data);
            if (!selectedCourseId && data.length > 0) {
                setSelectedCourseId(data[0].id);
            } else if (selectedCourseId && !data.find((item) => item.id === selectedCourseId)) {
                setSelectedCourseId(data.length > 0 ? data[0].id : null);
            }
        } catch (error) {
            console.error("강의 목록 불러오기 실패:", error);
            setErrorMessage("강의 목록을 불러오지 못했습니다.");
        } finally {
            setIsLoadingCourses(false);
        }
    }, [selectedCourseId]);

    const fetchSessionsList = useCallback(async (courseId: number) => {
        try {
            setIsLoadingSessions(true);
            const data = await getSessions(courseId);
            setSessions(data);
            if (!selectedSessionId && data.length > 0) {
                setSelectedSessionId(data[0].id);
            } else if (selectedSessionId && !data.find((item) => item.id === selectedSessionId)) {
                setSelectedSessionId(data.length > 0 ? data[0].id : null);
            }
        } catch (error) {
            console.error("세션 목록 불러오기 실패:", error);
            setErrorMessage("세션 목록을 불러오지 못했습니다.");
        } finally {
            setIsLoadingSessions(false);
        }
    }, [selectedSessionId]);

    // CRUD 핸들러 등은 기존 handleDelete, handleSaveEntity 등 그대로 export
    const handleDelete = useCallback(async (entity: EditableEntity, id: number, name: string) => {
        const ok = window.confirm(`'${name}' 항목을 삭제할까요?`);
        if (!ok) return;
        try {
            if (entity === "term") {
                await deleteTerm(id);
                if (selectedTermId === id) {
                    setSelectedTermId(null);
                    setSelectedCourseId(null);
                    setSelectedSessionId(null);
                }
                await fetchTerms();
            }
            if (entity === "course") {
                await deleteCourse(id);
                if (selectedCourseId === id) {
                    setSelectedCourseId(null);
                    setSelectedSessionId(null);
                }
                if (selectedTermId) {
                    await fetchCourses(selectedTermId);
                }
            }
            if (entity === "session") {
                await deleteSession(id);
                if (selectedSessionId === id) {
                    setSelectedSessionId(null);
                }
                if (selectedCourseId) {
                    await fetchSessionsList(selectedCourseId);
                }
            }
        } catch (error: any) {
            console.error("삭제 실패:", error);
            window.alert(error?.response?.data?.detail ?? "삭제에 실패했습니다.");
        }
    }, [selectedTermId, selectedCourseId, selectedSessionId, fetchTerms, fetchCourses, fetchSessionsList]);

    const handleSaveEntity = useCallback(async (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        try {
            if (editModal.mode === "create") {
                if (editModal.entity === "term") {
                    const created = await createTerm(trimmed);
                    await fetchTerms();
                    setSelectedTermId(created.id);
                }
                if (editModal.entity === "course") {
                    if (!selectedTermId) return;
                    const created = await createCourse(trimmed, selectedTermId);
                    await fetchCourses(selectedTermId);
                    setSelectedCourseId(created.id);
                }
                if (editModal.entity === "session") {
                    if (!selectedCourseId) return;
                    const created = await createSession(trimmed, selectedCourseId);
                    await fetchSessionsList(selectedCourseId);
                    setSelectedSessionId(created.id);
                }
            }
            if (editModal.mode === "rename" && editModal.targetId) {
                if (editModal.entity === "term") {
                    await updateTerm(editModal.targetId, trimmed);
                    await fetchTerms();
                }
                if (editModal.entity === "course") {
                    await updateCourse(editModal.targetId, trimmed);
                    if (selectedTermId) {
                        await fetchCourses(selectedTermId);
                    }
                }
                if (editModal.entity === "session") {
                    await updateSession(editModal.targetId, trimmed);
                    if (selectedCourseId) {
                        await fetchSessionsList(selectedCourseId);
                    }
                }
            }
            setEditModal((prev) => ({ ...prev, open: false }));
        } catch (error: any) {
            console.error("저장 실패:", error);
            window.alert(error?.response?.data?.detail ?? "저장에 실패했습니다.");
        }
    }, [editModal, selectedTermId, selectedCourseId, fetchTerms, fetchCourses, fetchSessionsList]);

    const isLoading = isLoadingTerms || isLoadingCourses || isLoadingSessions;

    return {
        // 상태
        isSessionModalOpen,
        currentSessionId,
        closeSessionModal,
        setCurrentSession,
        terms,
        courses,
        sessions,
        selectedTermId,
        setSelectedTermId,
        selectedCourseId,
        setSelectedCourseId,
        selectedSessionId,
        setSelectedSessionId,
        openMenu,
        setOpenMenu,
        editModal,
        setEditModal,
        isLoadingTerms,
        isLoadingCourses,
        isLoadingSessions,
        errorMessage,
        setErrorMessage,
        isMandatorySelection,
        canClose,
        selectedTerm,
        selectedCourse,
        selectedSession,
        // 함수
        fetchTerms,
        fetchCourses,
        fetchSessionsList,
        handleDelete,
        handleSaveEntity,
        isLoading,
    };
}
