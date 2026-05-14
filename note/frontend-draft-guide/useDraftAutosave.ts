import {useEffect, useRef} from "react";
import {
  getPostDraft,
  getReplyDraft,
  savePostDraft,
  saveReplyDraft,
} from "./draftApi";
import type {PostDraftDTO, ReplyDraftDTO} from "./draftTypes";

// 게시글 초안을 복원하고 자동 저장한다.
export function usePostDraftAutosave(
  memberId: number,
  draft: PostDraftDTO,
  onLoad: (draft: PostDraftDTO) => void
) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    getPostDraft(memberId)
      .then((res) => {
        if (mounted && res.data) {
          onLoad(res.data);
        }
      })
      .catch(() => {
      });

    return () => {
      mounted = false;
    };
  }, [memberId, onLoad]);

  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      if (!draft.title && !draft.content) {
        return;
      }

      savePostDraft(memberId, draft).catch(() => {
      });
    }, 800);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [memberId, draft]);
}

// 댓글 초안을 복원하고 자동 저장한다.
export function useReplyDraftAutosave(
  memberId: number,
  draft: ReplyDraftDTO,
  onLoad: (draft: ReplyDraftDTO) => void
) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    getReplyDraft(memberId, draft.targetType, draft.targetId)
      .then((res) => {
        if (mounted && res.data) {
          onLoad(res.data);
        }
      })
      .catch(() => {
      });

    return () => {
      mounted = false;
    };
  }, [memberId, draft.targetType, draft.targetId, onLoad]);

  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      if (!draft.content) {
        return;
      }

      saveReplyDraft(memberId, draft).catch(() => {
      });
    }, 800);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [memberId, draft]);
}
