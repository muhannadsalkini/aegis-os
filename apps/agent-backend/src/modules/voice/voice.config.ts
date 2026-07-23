/**
 * Voice Agent Configuration
 *
 * All model/voice constants are hardcoded here.
 * To swap providers or voices later, only this file needs to change.
 */

export const VOICE_CONFIG = {
  stt: {
    provider: 'deepgram' as const,
    model: 'nova-2',
    language: 'en-US',
    /** Silence (ms) after last Deepgram is_final before we close the utterance.
     *  500ms is enough — Deepgram's speechFinal handles real silence. The timer
     *  is only a safety fallback. Dropping from 2000 → 500 saves ~1.5s per turn. */
    silenceTimeoutMs: 500,
  },
  tts: {
    provider: 'elevenlabs' as const,
    /** George — clear, neutral, works well for short replies */
    voiceId: 'JBFqnCBsd6RMkjVDRZzb',
    modelId: 'eleven_turbo_v2_5',
    /** 16kHz PCM — smaller frames mean lower first-audio latency and less
     *  bandwidth; plenty for a speech-only voice. */
    outputFormat: 'pcm_16000' as const,
  },

} as const;

export type SttProvider = typeof VOICE_CONFIG.stt.provider;
export type TtsProvider = typeof VOICE_CONFIG.tts.provider;
