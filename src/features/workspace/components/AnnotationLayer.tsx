import React, { useEffect, useRef, useState } from "react";
import {
  getAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  Annotation as AnnotationType,
} from "../../../api/content";

type Props = {
  materialId?: number | null;
  pageNumber: number;
  scale?: number;
};

export const AnnotationLayer: React.FC<Props> = ({ materialId, pageNumber }) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationType[]>([]);

  // 생성 모드: 사용자가 빈 공간을 클릭해 새 어노테이션을 작성할 때 사용
  const [creating, setCreating] = useState<{
    x_rel: number;
    y_rel: number;
    leftPx: number;
    topPx: number;
  } | null>(null);
  const [creatingText, setCreatingText] = useState("");

  // 편집 모드: 기존 어노테이션을 클릭해 편집할 때 사용
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingPos, setEditingPos] = useState<{ x_rel: number; y_rel: number } | null>(null);
  // 편집 시 클릭 위치에 따라 커서(선택 시작 인덱스)를 설정하기 위한 상태
  const [editingSelectionStart, setEditingSelectionStart] = useState<number | null>(null);
  // 편집 시작 시 클릭한 픽셀 기반 앵커 (좌상단 기준)
  const [editingAnchor, setEditingAnchor] = useState<{ leftPx: number; topPx: number } | null>(null);
  // IME 조합 중인지 추적 (한글 입력 처리에 필요)
  const [isComposing, setIsComposing] = useState(false);

  // 드래그 상태: 편집 중인 어노테이션을 포인터로 이동할 때 사용
  const [dragging, setDragging] = useState<{ id: number; pointerId: number } | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const pointerCaptureElRef = useRef<Element | null>(null);
  // 드래그를 실제로 시작(임계거리 초과)하기 전까지 대기 상태를 저장
  const pendingDragRef = useRef<{
    startX: number;
    startY: number;
    annCenterX: number;
    annCenterY: number;
    pointerId: number;
  } | null>(null);

  // 초기 마운트/props 확인 로그 (디버그 가시성 향상)
  useEffect(() => {
    try {
      console.log("AnnotationLayer initialized", { materialId, pageNumber });
    } catch (e) {
      console.log("AnnotationLayer init log error:", e);
    }
  }, [materialId, pageNumber]);

  useEffect(() => {
    if (!materialId) return;
    getAnnotations(materialId)
      .then((items) => {
        try {
          // 디버그: 서버에서 받아온 텍스트와 문자 코드 검증
          console.log(
            "getAnnotations fetched:",
            items.map((it) => ({ id: it.id, text: it.text, codes: Array.from(it.text || "").map((c) => c.charCodeAt(0)) }))
          );
          // 원시 이스케이프가 보이도록 JSON stringify 출력 추가
          console.log("getAnnotations fetched raw:", JSON.stringify(items.map((it) => ({ id: it.id, text: it.text })), null, 2));
        } catch (e) {
          console.log("getAnnotations debug error:", e);
        }
        setAnnotations(items);
      })
      .catch((err) => console.error("getAnnotations error:", err));
  }, [materialId]);

  // 어노테이션이 렌더된 후 각 라벨의 계산된 스타일을 검사
  useEffect(() => {
    if (!overlayRef.current || !annotations || annotations.length === 0) return;
    try {
      annotations
        .filter((a) => a.page === pageNumber)
        .forEach((a) => {
          // label 요소(data-ann-label-id) 를 우선 탐색
          const labelEl = overlayRef.current!.querySelector(`[data-ann-label-id=\"${a.id}\"]`);
          const wrapperEl = overlayRef.current!.querySelector(`[data-ann-id=\"${a.id}\"]`);
          const elToInspect = (labelEl as Element) || (wrapperEl as Element);
          if (elToInspect) {
            const cs = getComputedStyle(elToInspect as Element);
            const rect = (elToInspect as Element).getBoundingClientRect();
            console.log("computedStyle for ann", a.id, {
              writingMode: (cs as any).writingMode || cs.getPropertyValue("writing-mode"),
              textOrientation: (cs as any).textOrientation || cs.getPropertyValue("text-orientation"),
              whiteSpace: cs.whiteSpace,
              width: cs.width,
              clientWidth: (elToInspect as Element).clientWidth,
              boundingRect: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              },
              transform: cs.transform,
              display: cs.display,
              innerText: (elToInspect as Element).textContent,
            });
          } else {
            console.log("no DOM element found for ann", a.id);
          }
        });
    } catch (e) {
      console.log("computed style debug error", e);
    }
  }, [annotations, pageNumber]);

  // 드래그 중 전역 포인터 이동/해제 처리
  useEffect(() => {
    if (!dragging) return;

    const onMove = (ev: PointerEvent) => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const rect = overlay.getBoundingClientRect();

      const offset = dragOffsetRef.current ?? { dx: 0, dy: 0 };
      const centerX = ev.clientX - offset.dx;
      const centerY = ev.clientY - offset.dy;

      let x_rel = (centerX - rect.left) / rect.width;
      let y_rel = (centerY - rect.top) / rect.height;
      x_rel = Math.max(0, Math.min(1, x_rel));
      y_rel = Math.max(0, Math.min(1, y_rel));

      setAnnotations((prev) => prev.map((a) => (a.id === dragging.id ? { ...a, x_rel, y_rel } : a)));
      if (editingId === dragging.id) {
        // 드래그 중에는 앵커가 있으면 픽셀 앵커를 갱신하여 입력 박스가 앵커 기준으로 따라오게 함
        if (editingAnchor) {
          const leftPx = centerX - rect.left;
          const topPx = centerY - rect.top;
          setEditingAnchor({ leftPx, topPx });
        } else {
          setEditingPos({ x_rel, y_rel });
        }
      }
      document.body.style.userSelect = "none";
    };

    const onUp = async (ev: PointerEvent) => {
      try {
        const overlay = overlayRef.current;
        if (!overlay) return;
        const rect = overlay.getBoundingClientRect();

        const offset = dragOffsetRef.current ?? { dx: 0, dy: 0 };
        const centerX = ev.clientX - offset.dx;
        const centerY = ev.clientY - offset.dy;

        let x_rel = (centerX - rect.left) / rect.width;
        let y_rel = (centerY - rect.top) / rect.height;
        x_rel = Math.max(0, Math.min(1, x_rel));
        y_rel = Math.max(0, Math.min(1, y_rel));

        // 로컬에 즉시 반영(낙관적 업데이트)하여 서버 지연/불일치로 인한 리셋을 방지
        setAnnotations((prev) => prev.map((a) => (a.id === dragging.id ? { ...a, x_rel, y_rel } : a)));
        if (editingId === dragging.id) {
          setEditingPos({ x_rel, y_rel });
        }
        // 드래그 완료 시 입력 박스는 상대 좌표로 전환
        setEditingAnchor(null);

        // 서버에 위치 저장 (비동기). 서버 값이 다르면 다시 보정합니다.
        try {
          const updated = await updateAnnotation(dragging.id, { x_rel, y_rel });
          setAnnotations((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          if (editingId === updated.id) {
            setEditingPos({ x_rel: updated.x_rel, y_rel: updated.y_rel });
          }
        } catch (err) {
          console.error("move update failed", err);
        }
      } catch (err) {
        console.error("move update failed", err);
      } finally {
        // 해제 및 정리
        if (pointerCaptureElRef.current) {
          try {
            pointerCaptureElRef.current.releasePointerCapture(dragging.pointerId);
          } catch (e) {
            // ignore
          }
          pointerCaptureElRef.current = null;
        }
        dragOffsetRef.current = null;
        setDragging(null);
        document.body.style.userSelect = "";
      }
    };

    const onCancel = () => {
      if (pointerCaptureElRef.current && dragging) {
        try {
          pointerCaptureElRef.current.releasePointerCapture(dragging.pointerId);
        } catch (e) {}
        pointerCaptureElRef.current = null;
      }
      dragOffsetRef.current = null;
      setDragging(null);
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      document.body.style.userSelect = "";
    };
  }, [dragging, editingId]);

  // 클릭으로 새 어노테이션 작성 시작
  const onOverlayClick = async (e: React.MouseEvent) => {
    if (!overlayRef.current) return;

    // 입력창이 현재 포커스인 경우: 먼저 현재 입력을 저장(commit)하고
    // 이후에 배경 클릭으로 새 생성 동작을 수행하도록 변경합니다.
    if (inputRef.current && document.activeElement === inputRef.current) {
      try {
        // 편집 중이면 편집 커밋, 생성 중이면 생성 커밋
        if (editingId !== null) {
          await commitEdit();
        } else if (creating) {
          await commitCreate();
        } else {
          inputRef.current.blur();
        }
      } catch (err) {
        console.error("overlay commit error:", err);
      }
    }

    // backdrop 자체를 클릭했을 때만 새 생성 시작
    if (e.target !== overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const x_rel = (e.clientX - rect.left) / rect.width;
    const y_rel = (e.clientY - rect.top) / rect.height;
    // 픽셀 좌표도 함께 저장하여 입력박스의 좌상단을 클릭 위치에 맞춥니다.
    const leftPx = e.clientX - rect.left;
    const topPx = e.clientY - rect.top;

    setCreating({ x_rel, y_rel, leftPx, topPx });
    setCreatingText("");
    setEditingId(null);
    setEditingPos(null);
  };

  // 편집 입력 래퍼에서 포인터 다운: 테두리(래퍼)를 클릭해 드래그 시작
  const handleEditWrapperPointerDown = (e: React.PointerEvent) => {
    // 편집 중인 어노테이션이 있어야 동작
    if (editingId === null) return;

    // 클릭 대상이 textarea 내부라면 드래그가 아닌 텍스트 편집 동작으로 처리
    if (inputRef.current && (inputRef.current === e.target || inputRef.current.contains(e.target as Node))) {
      return;
    }

    // IME 조합 중이면 드래그 시작 금지
    if (isComposing) return;

    e.stopPropagation();
    e.preventDefault();

    // 입력 유지(포커스 유지를 시도)
    try {
      inputRef.current?.focus();
    } catch (err) {
      // ignore
    }

    // 레퍼런스(오버레이) 기준에서 현재 어노테이션의 중심과 포인터 간 오프셋을 계산
    const overlay = overlayRef.current;
    if (!overlay) return;

    const ann = annotations.find((a) => a.id === editingId);
    if (!ann) return;

    const rect = overlay.getBoundingClientRect();
    const annCenterX = rect.left + ann.x_rel * rect.width;
    const annCenterY = rect.top + ann.y_rel * rect.height;

    // 드래그는 사용자가 실제로 포인터를 움직였을 때 시작합니다 (작은 클릭 이동은 드래그로 보지 않음)
    pendingDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      annCenterX,
      annCenterY,
      pointerId: e.pointerId,
    };

    // 포인터 캡처를 시도하여 로컬 포인터 무브를 안정적으로 관찰
    const el = e.currentTarget as Element;
    pointerCaptureElRef.current = el;
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {
      // 일부 브라우저/요소에서 실패할 수 있음
    }

    // 로컬 리스너: 임계거리(예: 6px)를 초과하면 실제 드래그로 간주해 드래그 상태를 시작
    const onLocalMove = (ev: PointerEvent) => {
      const pd = pendingDragRef.current;
      if (!pd || ev.pointerId !== pd.pointerId) return;
      const dx = ev.clientX - pd.startX;
      const dy = ev.clientY - pd.startY;
      const distSq = dx * dx + dy * dy;
      const thresholdSq = 6 * 6;
      if (distSq > thresholdSq) {
        // 실제 드래그 시작: 드래그 오프셋을 설정하고 전역 드래그 로직에 위임
        dragOffsetRef.current = { dx: ev.clientX - pd.annCenterX, dy: ev.clientY - pd.annCenterY };
        pendingDragRef.current = null;
        // 드래그 상태 시작
        setDragging({ id: editingId, pointerId: pd.pointerId });
        // 드래그 중 텍스트 선택 방지
        document.body.style.userSelect = "none";
        // 로컬 리스너 제거 (전역 useEffect에서 추가한 리스너가 동작)
        window.removeEventListener("pointermove", onLocalMove);
        window.removeEventListener("pointerup", onLocalUp);
      }
    };

    const onLocalUp = (ev: PointerEvent) => {
      const pd = pendingDragRef.current;
      if (pd && ev.pointerId === pd.pointerId) {
        // 클릭만 한 경우: 드래그 시작 안함. 포인터 캡처 해제 및 정리
        pendingDragRef.current = null;
        try {
          el.releasePointerCapture(ev.pointerId);
        } catch (e) {
          // ignore
        }
        pointerCaptureElRef.current = null;
      }
      window.removeEventListener("pointermove", onLocalMove);
      window.removeEventListener("pointerup", onLocalUp);
    };

    window.addEventListener("pointermove", onLocalMove);
    window.addEventListener("pointerup", onLocalUp);
  };

  // 기존 마커 클릭 → 편집 모드로 전환
  const onMarkerClick = async (e: React.MouseEvent, a: AnnotationType) => {
    e.stopPropagation();
    // 클릭 위치에 따른 캐럿(선택) 인덱스를 계산합니다.
    const computeClickCaretIndex = (clientX: number, clientY: number, annId: number, fallbackText?: string): number | null => {
      const overlay = overlayRef.current;
      if (!overlay) return null;
      const labelEl = overlay.querySelector(`[data-ann-label-id="${annId}"]`) as Element | null;
      if (!labelEl) return null;

      try {
        const doc: any = document as any;
        // 브라우저별 caret 위치 API 사용
        let startNode: Node | null = null;
        let offset = 0;
        if (doc.caretPositionFromPoint) {
          const pos = doc.caretPositionFromPoint(clientX, clientY);
          if (pos) {
            startNode = pos.offsetNode;
            offset = pos.offset;
          }
        } else if (doc.caretRangeFromPoint) {
          const range = doc.caretRangeFromPoint(clientX, clientY);
          if (range) {
            startNode = range.startContainer;
            offset = range.startOffset;
          }
        }

        if (startNode) {
          // 클릭한 노드가 라벨 내부인지 확인
          if (!labelEl.contains(startNode)) {
            const rect = (labelEl as HTMLElement).getBoundingClientRect();
            const xInside = clientX - rect.left;
            const text = labelEl.textContent || fallbackText || "";
            const approx = Math.round((xInside / rect.width) * text.length);
            return Math.max(0, Math.min(text.length, approx));
          }

          // 라벨 내부의 텍스트 노드들을 순회해 절대 오프셋을 계산
          let index = 0;
          const walker = document.createTreeWalker(labelEl, NodeFilter.SHOW_TEXT, null);
          let node: Node | null = walker.nextNode();
          while (node) {
            if (node === startNode) {
              return index + offset;
            }
            index += (node.textContent?.length) ?? 0;
            node = walker.nextNode();
          }

          const totalText = labelEl.textContent || fallbackText || "";
          return Math.max(0, Math.min(totalText.length, index + offset));
        }
      } catch (e) {
        console.warn("computeClickCaretIndex error", e);
      }

      // 최후의 수단: 경계 박스 기반 근사치
      const rect = (labelEl as HTMLElement).getBoundingClientRect();
      const xInside = clientX - rect.left;
      const text = labelEl.textContent || fallbackText || "";
      const approx = Math.round((xInside / rect.width) * text.length);
      return Math.max(0, Math.min(text.length, approx));
    };

    // 현재 입력에 포커스가 있다면, 먼저 저장(commit)하고 이후에 클릭한 마커 편집으로 전환
    const caretIdx = computeClickCaretIndex(e.clientX, e.clientY, a.id, a.text ?? "");

    if (inputRef.current && document.activeElement === inputRef.current) {
      try {
        if (editingId !== null) {
          await commitEdit();
        } else if (creating) {
          await commitCreate();
        } else {
          inputRef.current.blur();
        }
      } catch (err) {
        console.error("marker click commit error:", err);
      }

      // 저장 후 클릭한 마커로 포커스 이동(편집 모드로 전환)
      const overlayRect = overlayRef.current?.getBoundingClientRect();
      const leftPx = overlayRect ? e.clientX - overlayRect.left : 0;
      const topPx = overlayRect ? e.clientY - overlayRect.top : 0;
      setEditingId(a.id);
      setEditingText(a.text ?? "");
      setEditingPos({ x_rel: a.x_rel, y_rel: a.y_rel });
      setCreating(null);
      setCreatingText("");
      setEditingSelectionStart(caretIdx);
      setEditingAnchor({ leftPx, topPx });
      return;
    }

    // 포커스가 없을 때 바로 편집 모드로 전환: 클릭 위치를 앵커로 저장
    const overlayRect = overlayRef.current?.getBoundingClientRect();
    const leftPx = overlayRect ? e.clientX - overlayRect.left : 0;
    const topPx = overlayRect ? e.clientY - overlayRect.top : 0;
    setEditingId(a.id);
    setEditingText(a.text ?? "");
    setEditingPos({ x_rel: a.x_rel, y_rel: a.y_rel });
    setCreating(null);
    setCreatingText("");
    setEditingSelectionStart(caretIdx);
    setEditingAnchor({ leftPx, topPx });
  };

  // 주의: editingAnchor는 클릭 시 입력을 클릭 위치에 고정하기 위해 사용합니다.
  // 즉시 해제하면 앵커 동작이 사라지므로 자동 해제 로직은 제거했습니다.

  // 입력 엘리먼트에 포커스 및 캐럿 위치 설정
  useEffect(() => {
    if (creating || editingId !== null) {
      // next tick에 포커스
      setTimeout(() => {
        if (!inputRef.current) return;
        inputRef.current.focus();
        // 편집일 경우: 가능하면 클릭한 위치(또는 계산된 선택 시작)으로 캐럿을 이동
        if (editingId !== null) {
          const len = inputRef.current.value.length;
          let target = len;
          if (editingSelectionStart !== null) {
            target = Math.max(0, Math.min(len, editingSelectionStart));
          }
          try {
            inputRef.current.setSelectionRange(target, target);
          } catch (e) {
            inputRef.current.setSelectionRange(len, len);
          }
          // 일회성 값이므로 리셋
          setEditingSelectionStart(null);
        } else if (creating) {
          // 생성 모드: 클릭한 위치와 일치하도록 캐럿을 텍스트 시작으로 이동
          try {
            inputRef.current.setSelectionRange(0, 0);
          } catch (e) {
            // ignore
          }
        }
      }, 0);
    }
  }, [creating, editingId]);

  const commitCreate = async () => {
    if (!materialId || !creating) return;
    const text = creatingText.trim();
    if (!text) {
      setCreating(null);
      setCreatingText("");
      return;
    }

    try {
      console.log("commitCreate payload text:", text, Array.from(text).map((c) => c.charCodeAt(0)));
    } catch (e) {
      console.log("commitCreate debug error:", e);
    }

    try {
      const payload = {
        page: pageNumber,
        x_rel: creating.x_rel,
        y_rel: creating.y_rel,
        text,
      };
      const created = await createAnnotation(materialId, payload as any);
      // 보존용 UI 앵커를 추가하여 생성 직후 레이블이 클릭한 픽셀에 고정되도록 함
      const createdWithAnchor = { ...(created as any), uiAnchor: { leftPx: creating.leftPx, topPx: creating.topPx } } as any;
      setAnnotations((s) => [...s, createdWithAnchor]);
    } catch (err) {
      console.error("createAnnotation error:", err);
    } finally {
      setCreating(null);
      setCreatingText("");
    }
  };

  const commitEdit = async () => {
    const currentId = editingId;
    if (currentId === null) return;

    const text = editingText.trim();
    try {
      console.log("commitEdit text:", text, Array.from(text).map((c) => c.charCodeAt(0)));
    } catch (e) {
      console.log("commitEdit debug error:", e);
    }
    if (!text) {
      // 빈 텍스트면 해당 어노테이션을 삭제
      try {
        await deleteAnnotation(currentId);
        setAnnotations((prev) => prev.filter((a) => a.id !== currentId));
      } catch (err) {
        console.error("deleteAnnotation error:", err);
      } finally {
        setEditingId(null);
        setEditingText("");
        setEditingPos(null);
        setEditingAnchor(null);
      }
      return;
    }

    // 편집 시 사용하던 픽셀 앵커를 보존해 서버 응답 후에도 레이블을 동일한 픽셀 위치에 유지
    const preservedAnchor = editingAnchor ? { ...editingAnchor } : null;
    try {
      const updated = await updateAnnotation(currentId, { text });
      setAnnotations((prev) =>
        prev.map((a) => (a.id === updated.id ? ({ ...(updated as any), uiAnchor: preservedAnchor ?? (a as any).uiAnchor } as any) : a))
      );
    } catch (err) {
      console.error("updateAnnotation error:", err);
    } finally {
      setEditingId(null);
      setEditingText("");
      setEditingPos(null);
      setEditingAnchor(null);
    }
  };

  const handleInputBlur = async () => {
    // blur는 생성/편집 모두에서 저장 규칙을 트리거합니다
    if (editingId !== null) {
      await commitEdit();
    } else if (creating) {
      await commitCreate();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      // 취소
      setCreating(null);
      setCreatingText("");
      setEditingId(null);
      setEditingText("");
      setEditingPos(null);
    }
    // IME(한글) 조합 중에는 Enter를 처리하지 않음
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      // 강제 blur로 저장 트리거
      (e.target as HTMLTextAreaElement).blur();
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={onOverlayClick}
      data-testid="annotation-overlay"
      className="absolute left-0 top-0 w-full h-full z-40"
      style={{ pointerEvents: "auto", background: "transparent" }}
    >
      {/* existing annotations for this page */}
      {annotations
        .filter((a) => a.page === pageNumber)
        .map((a) => (
          <React.Fragment key={a.id}>
            <div
              data-ann-id={a.id}
              className="absolute cursor-pointer"
              style={{
                left: `${a.x_rel * 100}%`,
                top: `${a.y_rel * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
              title={a.text}
              onClick={(e) => onMarkerClick(e, a)}
            >
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* show text label above position when not editing; no background */}
                {a.text && editingId !== a.id && !(a as any).uiAnchor && (
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      bottom: "100%",
                      transform: "translate(-50%, -8px)",
                      padding: 0,
                      borderRadius: 0,
                      boxShadow: "none",
                      maxWidth: 260,
                      whiteSpace: "pre-wrap",
                      fontSize: 12,
                      display: "inline-block",
                      writingMode: "horizontal-tb",
                      // 최소 너비를 텍스트 길이에 따라 동적으로 설정하여
                      // 한 글자씩 세로로 줄바꿈되는 현상을 완화합니다.
                      minWidth: Math.min(260, Math.max(32, (a.text ? a.text.length : 1) * 12)),
                      // 한글은 단어 단위로 줄바꿈을 막아 글자별 줄바꿈을 피합니다.
                      wordBreak: "keep-all",
                      overflowWrap: "break-word",
                      textAlign: "left",
                      zIndex: 10,
                      background: "transparent",
                      color: "inherit",
                    }}
                    data-ann-label-id={a.id}
                  >
                    {a.text}
                  </div>
                )}

                {/* marker removed as requested (no orange dot) */}
              </div>
            </div>

            {/* pixel anchor가 설정된 경우, overlay 기준 픽셀 위치에 레이블을 렌더링합니다. 클릭/편집 시 위치 고정을 위해 사용됩니다. */}
            {(a as any).uiAnchor && a.text && editingId !== a.id && (
              <div
                data-ann-label-id={a.id}
                onClick={(e) => onMarkerClick(e as any, a)}
                style={{
                  position: "absolute",
                  left: (a as any).uiAnchor.leftPx + "px",
                  top: (a as any).uiAnchor.topPx + "px",
                  transform: "translate(0, 0)",
                  padding: 0,
                  maxWidth: 260,
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                  display: "inline-block",
                  writingMode: "horizontal-tb",
                  minWidth: Math.min(260, Math.max(32, (a.text ? a.text.length : 1) * 12)),
                  wordBreak: "keep-all",
                  overflowWrap: "break-word",
                  textAlign: "left",
                  zIndex: 10,
                  pointerEvents: "auto",
                  background: "transparent",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                {a.text}
              </div>
            )}
          </React.Fragment>
        ))}

      {/* creation input (버튼 없음, blur로 저장/취소) */}
      {creating && (
        <div
            className="absolute z-50 w-64 p-1"
            style={{
              // 클릭한 픽셀 위치에 입력박스의 좌상단이 오도록 설정합니다.
              left: creating.leftPx + "px",
              top: creating.topPx + "px",
              transform: "translate(0, 0)",
              minWidth: 220,
              background: "transparent",
            }}
            onClick={(e) => e.stopPropagation()}
          >
          <textarea
            ref={inputRef}
            value={creatingText}
            onChange={(e) => setCreatingText(e.target.value)}
            rows={3}
            placeholder="메모 입력"
              className="w-full resize-none border border-gray-200 bg-transparent p-1 text-sm outline-none focus:border-blue-400"
              style={{ textAlign: "left", direction: "ltr" }}
            onBlur={async () => {
              setIsComposing(false);
              await handleInputBlur();
            }}
            onKeyDown={handleInputKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
          />
        </div>
      )}

      {/* editing input (기존 어노테이션 편집) */}
      {editingId !== null && (editingPos || editingAnchor) && (
        <div
          className="absolute z-50 w-64 p-1"
          style={
            editingAnchor
              ? {
                  left: editingAnchor.leftPx + "px",
                  top: editingAnchor.topPx + "px",
                  transform: "translate(0, 0)",
                  minWidth: 220,
                  background: "transparent",
                }
              : {
                  left: `${editingPos!.x_rel * 100}%`,
                  top: `${editingPos!.y_rel * 100}%`,
                  transform: "translate(-50%, -120%)",
                  minWidth: 220,
                  background: "transparent",
                }
          }
          onPointerDown={handleEditWrapperPointerDown}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            ref={inputRef}
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            rows={3}
            placeholder="메모 편집"
            className="w-full resize-none border border-gray-200 bg-transparent p-1 text-sm outline-none focus:border-blue-400"
            onBlur={async () => {
              setIsComposing(false);
              await handleInputBlur();
            }}
            onKeyDown={handleInputKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
          />
        </div>
      )}
    </div>
  );
};

export default AnnotationLayer;
