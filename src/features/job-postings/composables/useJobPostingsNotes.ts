import { computed, ref, watch, type Ref } from "vue";

import {
  getJobPostingNotes,
  saveJobPostingNotes,
} from "@/features/job-postings/api/jobPostingsApi";
import type { JobPostingsItem } from "@/api/types";

function isNotesNonEmpty(text: string | null | undefined): boolean {
  return (text ?? "").trim().length > 0;
}

export function useJobPostingsNotes(params: {
  items: Ref<JobPostingsItem[]>;
  onError: (message: string) => void;
}) {
  const { items, onError } = params;

  const notesDialogVisible = ref(false);
  const notesEditUuid = ref<string | null>(null);
  const notesDraft = ref("");
  const notesLoadingUuid = ref<string | null>(null);
  const notesSaving = ref(false);
  const notesFilledByUuid = ref<Record<string, boolean>>({});

  function setNotesFilled(uuid: string, text: string | null | undefined) {
    notesFilledByUuid.value = {
      ...notesFilledByUuid.value,
      [uuid]: isNotesNonEmpty(text),
    };
  }

  async function prefetchNotesForItems(rows: JobPostingsItem[]) {
    if (rows.length === 0) return;
    const next = { ...notesFilledByUuid.value };
    await Promise.all(
      rows.map(async (row) => {
        try {
          const data = await getJobPostingNotes(row.uuid);
          next[row.uuid] = isNotesNonEmpty(data.text);
        } catch {
          next[row.uuid] = false;
        }
      }),
    );
    notesFilledByUuid.value = next;
  }

  watch(
    () => items.value.map((item) => item.uuid).join("|"),
    () => {
      void prefetchNotesForItems(items.value);
    },
    { immediate: true },
  );

  function discardNotesDialog() {
    notesDialogVisible.value = false;
    notesEditUuid.value = null;
    notesDraft.value = "";
  }

  async function openNotes(row: JobPostingsItem) {
    notesLoadingUuid.value = row.uuid;
    try {
      const data = await getJobPostingNotes(row.uuid);
      notesDraft.value = data.text ?? "";
      setNotesFilled(row.uuid, data.text);
      notesEditUuid.value = row.uuid;
      notesDialogVisible.value = true;
    } catch {
      onError("Не удалось загрузить заметку");
    } finally {
      notesLoadingUuid.value = null;
    }
  }

  async function saveNotes() {
    const id = notesEditUuid.value;
    if (!id) return;
    notesSaving.value = true;
    try {
      await saveJobPostingNotes(id, { text: notesDraft.value });
      setNotesFilled(id, notesDraft.value);
      discardNotesDialog();
    } catch {
      onError("Не удалось сохранить заметку");
    } finally {
      notesSaving.value = false;
    }
  }

  const hasAnyNotes = computed(() => notesFilledByUuid.value);

  return {
    notesDialogVisible,
    notesEditUuid,
    notesDraft,
    notesLoadingUuid,
    notesSaving,
    notesFilledByUuid: hasAnyNotes,
    openNotes,
    saveNotes,
    discardNotesDialog,
  };
}
