import { set, get, del } from "idb-keyval";
import type { ExamMode } from "./exam-mode";

function audioKey(mode: ExamMode, questionId: number): string {
  return `opic_exam_${mode}_audio_${questionId}`;
}

export const saveAudio = async (
  mode: ExamMode,
  questionId: number,
  blob: Blob,
): Promise<void> => {
  try {
    await set(audioKey(mode, questionId), blob);
  } catch (error) {
    console.error("Failed to save audio to IndexedDB:", error);
    throw error;
  }
};

export const getAudio = async (
  mode: ExamMode,
  questionId: number,
): Promise<Blob | undefined> => {
  try {
    return await get<Blob>(audioKey(mode, questionId));
  } catch (error) {
    console.error("Failed to get audio from IndexedDB:", error);
    return undefined;
  }
};

export const deleteAudio = async (
  mode: ExamMode,
  questionId: number,
): Promise<void> => {
  try {
    await del(audioKey(mode, questionId));
  } catch (error) {
    console.error("Failed to delete audio from IndexedDB:", error);
  }
};

export const clearModeAudio = async (
  mode: ExamMode,
  questionIds: number[],
): Promise<void> => {
  await Promise.all(questionIds.map((id) => deleteAudio(mode, id)));
};
