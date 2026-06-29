/**
 * Caption Generation Service
 * Uses Whisper API for audio transcription and caption generation
 * Requirement 15.2
 */

import { CaptionRequest, CaptionResult, CaptionSegment } from '../types/accessibility.types';
import { AIGatewayService } from './AIGatewayService';
import logger from '../utils/logger';

export class CaptionGenerationService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Generate captions for video/audio using Whisper API
   */
  async generateCaptions(request: CaptionRequest): Promise<CaptionResult> {
    try {
      logger.info('Generating captions', { 
        hasVideoUrl: !!request.videoUrl,
        hasAudioUrl: !!request.audioUrl,
        language: request.language 
      });

      // Extract audio if video URL provided
      const audioSource = await this.prepareAudioSource(request);

      // Transcribe using Whisper API
      const transcription = await this.transcribeAudio(audioSource, request);

      // Identify speakers if requested
      const segments = request.includeSpeakerIdentification
        ? await this.identifySpeakers(transcription.segments)
        : transcription.segments;

      // Format captions
      const vttFormat = this.formatAsVTT(segments);
      const srtFormat = this.formatAsSRT(segments);
      const fullTranscript = segments.map(s => s.text).join(' ');

      return {
        segments,
        fullTranscript,
        vttFormat,
        srtFormat,
        confidence: transcription.confidence,
        language: request.language || 'en',
        speakers: this.extractUniqueSpeakers(segments)
      };
    } catch (error) {
      logger.error('Error generating captions', { error, request });
      throw new Error(`Failed to generate captions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Prepare audio source for transcription
   */
  private async prepareAudioSource(request: CaptionRequest): Promise<string | Buffer> {
    if (request.audioBuffer) {
      return request.audioBuffer;
    }

    if (request.audioUrl) {
      return request.audioUrl;
    }

    if (request.videoUrl) {
      // In production, extract audio from video
      // For now, assume video URL can be used directly
      logger.warn('Video URL provided, audio extraction not implemented');
      return request.videoUrl;
    }

    throw new Error('No audio source provided');
  }

  /**
   * Transcribe audio using Whisper API
   */
  private async transcribeAudio(
    audioSource: string | Buffer,
    request: CaptionRequest
  ): Promise<{ segments: CaptionSegment[]; confidence: number }> {
    try {
      // Call Whisper API through AI Gateway
      const response = await this.aiGateway.whisperTranscription({
        audio: audioSource,
        model: 'whisper-1',
        language: request.language,
        response_format: 'verbose_json',
        timestamp_granularities: ['segment']
      });

      // Parse Whisper response into segments
      const segments: CaptionSegment[] = response.segments?.map((seg: any) => ({
        startTime: seg.start,
        endTime: seg.end,
        text: seg.text.trim(),
        confidence: seg.confidence || 0.9
      })) || [];

      const avgConfidence = segments.length > 0
        ? segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length
        : 0.9;

      return {
        segments,
        confidence: avgConfidence
      };
    } catch (error) {
      logger.error('Error transcribing audio', { error });
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Identify speakers in the transcription using AI
   */
  private async identifySpeakers(segments: CaptionSegment[]): Promise<CaptionSegment[]> {
    try {
      // Use GPT-4 to identify speaker changes based on content and context
      const transcript = segments.map((seg, idx) => 
        `[${idx}] ${seg.text}`
      ).join('\n');

      const prompt = `Analyze this transcript and identify speaker changes. ` +
        `For each segment number, indicate if it's Speaker A, Speaker B, etc. ` +
        `Look for conversational cues, topic changes, and speaking patterns.\n\n` +
        `Transcript:\n${transcript}\n\n` +
        `Respond with JSON format: [{"segment": 0, "speaker": "Speaker A"}, ...]`;

      const response = await this.aiGateway.chatCompletion({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing conversations and identifying different speakers.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const speakerData = JSON.parse(response.choices[0]?.message?.content || '[]');

      // Apply speaker identification to segments
      return segments.map((seg, idx) => {
        const speakerInfo = speakerData.find((s: any) => s.segment === idx);
        return {
          ...seg,
          speaker: speakerInfo?.speaker
        };
      });
    } catch (error) {
      logger.warn('Could not identify speakers', { error });
      // Return segments without speaker identification
      return segments;
    }
  }

  /**
   * Format captions as WebVTT
   */
  private formatAsVTT(segments: CaptionSegment[]): string {
    let vtt = 'WEBVTT\n\n';

    segments.forEach((segment, index) => {
      const start = this.formatTimestamp(segment.startTime);
      const end = this.formatTimestamp(segment.endTime);
      const speaker = segment.speaker ? `<v ${segment.speaker}>` : '';
      
      vtt += `${index + 1}\n`;
      vtt += `${start} --> ${end}\n`;
      vtt += `${speaker}${segment.text}\n\n`;
    });

    return vtt;
  }

  /**
   * Format captions as SRT
   */
  private formatAsSRT(segments: CaptionSegment[]): string {
    let srt = '';

    segments.forEach((segment, index) => {
      const start = this.formatTimestamp(segment.startTime, true);
      const end = this.formatTimestamp(segment.endTime, true);
      const text = segment.speaker 
        ? `[${segment.speaker}] ${segment.text}`
        : segment.text;
      
      srt += `${index + 1}\n`;
      srt += `${start} --> ${end}\n`;
      srt += `${text}\n\n`;
    });

    return srt;
  }

  /**
   * Format timestamp for captions
   */
  private formatTimestamp(seconds: number, srtFormat: boolean = false): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    const separator = srtFormat ? ',' : '.';

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}${separator}${String(ms).padStart(3, '0')}`;
  }

  /**
   * Extract unique speakers from segments
   */
  private extractUniqueSpeakers(segments: CaptionSegment[]): string[] | undefined {
    const speakers = segments
      .map(seg => seg.speaker)
      .filter((speaker): speaker is string => !!speaker);

    if (speakers.length === 0) {
      return undefined;
    }

    return Array.from(new Set(speakers));
  }

  /**
   * Batch generate captions for multiple videos
   */
  async batchGenerateCaptions(requests: CaptionRequest[]): Promise<CaptionResult[]> {
    try {
      logger.info('Batch generating captions', { count: requests.length });

      const results = await Promise.all(
        requests.map(request => this.generateCaptions(request))
      );

      return results;
    } catch (error) {
      logger.error('Error in batch caption generation', { error });
      throw new Error(`Batch generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update existing captions with corrections
   */
  async updateCaptions(
    originalCaptions: CaptionResult,
    corrections: { segmentIndex: number; correctedText: string }[]
  ): Promise<CaptionResult> {
    try {
      const updatedSegments = [...originalCaptions.segments];

      corrections.forEach(correction => {
        if (updatedSegments[correction.segmentIndex]) {
          updatedSegments[correction.segmentIndex].text = correction.correctedText;
        }
      });

      return {
        ...originalCaptions,
        segments: updatedSegments,
        fullTranscript: updatedSegments.map(s => s.text).join(' '),
        vttFormat: this.formatAsVTT(updatedSegments),
        srtFormat: this.formatAsSRT(updatedSegments)
      };
    } catch (error) {
      logger.error('Error updating captions', { error });
      throw new Error(`Failed to update captions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default CaptionGenerationService;
