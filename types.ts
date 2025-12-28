
export type AspectRatio = "16:9" | "9:16" | "1:1" | "3:4" | "4:3";
export type Resolution = "720p" | "1080p";
export type ImageSize = "1K" | "2K" | "4K";

export type VeoModelName = 'veo-3.1-fast-generate-preview' | 'veo-3.1-generate-preview';
export type TaskMode = 'VIDEO' | 'IMAGE' | 'TEXT' | 'CODE' | 'SPEECH' | 'LIVE';

export interface GenerationStatus {
  isGenerating: boolean;
  message: string;
  progress: number;
}

export enum AppState {
  KEY_SELECTION = "KEY_SELECTION",
  GENERATOR = "GENERATOR"
}
