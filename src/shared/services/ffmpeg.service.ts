import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import { promisify } from 'util';
import * as path from 'path';
import * as os from 'os';

const unlinkAsync = promisify(fs.unlink);

export interface TikTokStyleOptions {
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  backgroundOpacity?: number;
  position?: 'top' | 'center' | 'bottom';
  maxWordsPerLine?: number;
  lineSpacing?: number;
  marginVertical?: number;
  marginHorizontal?: number;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowOffset?: { x: number; y: number };
}

@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);
  async extractAudio(videoPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .save(outputPath)
        .on('end', () => resolve())
        .on('error', (err, stdout, stderr) => {
          console.error(`FFmpeg audio extraction error: ${err.message}`);
          console.error(`FFmpeg stdout: ${stdout}`);
          console.error(`FFmpeg stderr: ${stderr}`);
          reject(
            new InternalServerErrorException(
              `FFmpeg audio extraction failed: ${err.message}`,
            ),
          );
        });
    });
  }

  async burnSubtitles(
    videoPath: string,
    subtitlePath: string,
    outputPath: string,
    styleOptions?: TikTokStyleOptions,
  ): Promise<void> {
    this.logger.log(`Starting subtitle burn-in process`);
    this.logger.log(`Video path: ${videoPath}`);
    this.logger.log(`Subtitle path: ${subtitlePath}`);
    this.logger.log(`Output path: ${outputPath}`);

    // Check if subtitle file exists
    if (!fs.existsSync(subtitlePath)) {
      throw new InternalServerErrorException(`Subtitle file not found: ${subtitlePath}`);
    }

    // For ASS files, use the ass filter; for SRT files, use subtitles filter
    const isAssFile = subtitlePath.endsWith('.ass');
    const filter = isAssFile ? 
      `ass='${subtitlePath}'` : 
      this.buildTikTokSubtitleFilter(subtitlePath, styleOptions);

    this.logger.log(`Using filter: ${filter}`);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .videoFilters(filter)
        .save(outputPath)
        .on('start', (commandLine) => {
          this.logger.log(`FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          this.logger.log(`FFmpeg progress: ${progress.percent}% done`);
        })
        .on('end', () => {
          this.logger.log(`FFmpeg subtitle burn-in completed successfully`);
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          this.logger.error(`FFmpeg subtitle burn-in error: ${err.message}`);
          this.logger.error(`FFmpeg stdout: ${stdout}`);
          this.logger.error(`FFmpeg stderr: ${stderr}`);
          reject(
            new InternalServerErrorException(
              `FFmpeg subtitle burn-in failed: ${err.message}`,
            ),
          );
        });
    });
  }

  async burnTikTokStyleSubtitles(
    videoPath: string,
    subtitlePath: string,
    outputPath: string,
    styleOptions?: TikTokStyleOptions,
  ): Promise<void> {
    const defaultOptions: TikTokStyleOptions = {
      fontSize: 32,
      fontColor: 'white',
      fontFamily: 'Arial Black',
      strokeColor: 'black',
      strokeWidth: 3,
      backgroundColor: 'black',
      backgroundOpacity: 0.7,
      position: 'center',
      maxWordsPerLine: 3,
      lineSpacing: 1.2,
      marginVertical: 50,
      marginHorizontal: 40,
      shadowEnabled: true,
      shadowColor: 'black',
      shadowOffset: { x: 2, y: 2 },
    };

    const options = { ...defaultOptions, ...styleOptions };

    this.logger.log(`Starting TikTok-style subtitle burn-in process`);
    this.logger.log(`Video path: ${videoPath}`);
    this.logger.log(`Subtitle path: ${subtitlePath}`);
    this.logger.log(`Output path: ${outputPath}`);
    this.logger.log(`Style options: ${JSON.stringify(options, null, 2)}`);

    // Check if subtitle file exists
    if (!fs.existsSync(subtitlePath)) {
      throw new InternalServerErrorException(`Subtitle file not found: ${subtitlePath}`);
    }

    const filter = this.buildAdvancedTikTokFilter(subtitlePath, options);
    this.logger.log(`FFmpeg filter: ${filter}`);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .videoFilters(filter)
        .save(outputPath)
        .on('start', (commandLine) => {
          this.logger.log(`FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          this.logger.log(`FFmpeg progress: ${progress.percent}% done`);
        })
        .on('end', () => {
          this.logger.log(`FFmpeg TikTok-style subtitle burn-in completed successfully`);
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          this.logger.error(`FFmpeg TikTok-style subtitle burn-in error: ${err.message}`);
          this.logger.error(`FFmpeg stdout: ${stdout}`);
          this.logger.error(`FFmpeg stderr: ${stderr}`);
          reject(
            new InternalServerErrorException(
              `FFmpeg TikTok-style subtitle burn-in failed: ${err.message}`,
            ),
          );
        });
    });
  }

  private buildTikTokSubtitleFilter(subtitlePath: string, options?: TikTokStyleOptions): string {
    const defaultOptions: TikTokStyleOptions = {
      fontSize: 28,
      fontColor: 'white',
      fontFamily: 'Arial Bold',
      strokeColor: 'black',
      strokeWidth: 2,
      position: 'center',
      marginVertical: 50,
    };

    const style = { ...defaultOptions, ...options };
    
    // Basic TikTok-style filter with better styling
    return `subtitles='${subtitlePath}':force_style='` +
      `FontName=${style.fontFamily},` +
      `FontSize=${style.fontSize},` +
      `PrimaryColour=&H00FFFFFF,` +
      `OutlineColour=&H00000000,` +
      `BackColour=&H80000000,` +
      `Bold=1,` +
      `Outline=${style.strokeWidth},` +
      `Shadow=1,` +
      `Alignment=${this.getAlignment(style.position || 'center')},` +
      `MarginV=${style.marginVertical || 50}'`;
  }

  private buildAdvancedTikTokFilter(subtitlePath: string, options: TikTokStyleOptions): string {
    // More advanced filter for professional TikTok-style captions
    const alignment = this.getAlignment(options.position || 'center');
    const marginV = options.marginVertical || 50;
    const backgroundOpacity = options.backgroundOpacity || 0.7;
    
    return `subtitles='${subtitlePath}':force_style='` +
      `FontName=${options.fontFamily},` +
      `FontSize=${options.fontSize},` +
      `PrimaryColour=&H00FFFFFF,` +
      `SecondaryColour=&H00FF0000,` +
      `OutlineColour=&H00000000,` +
      `BackColour=&H${Math.floor(backgroundOpacity * 255).toString(16).padStart(2, '0')}000000,` +
      `Bold=1,` +
      `Italic=0,` +
      `Underline=0,` +
      `StrikeOut=0,` +
      `ScaleX=100,` +
      `ScaleY=100,` +
      `Spacing=0,` +
      `Angle=0,` +
      `BorderStyle=3,` +
      `Outline=${options.strokeWidth},` +
      `Shadow=${options.shadowEnabled ? 1 : 0},` +
      `Alignment=${alignment},` +
      `MarginL=${options.marginHorizontal},` +
      `MarginR=${options.marginHorizontal},` +
      `MarginV=${marginV}'`;
  }

  private getAlignment(position: string): number {
    switch (position) {
      case 'top':
        return 8; // Top center
      case 'center':
        return 5; // Middle center
      case 'bottom':
      default:
        return 2; // Bottom center
    }
  }

  async generateSrt(transcriptData: any, outputPath: string): Promise<void> {
    let srtContent = '';
    let counter = 1;

    for (const segment of transcriptData.segments) {
      const start = this.formatTime(segment.start);
      const end = this.formatTime(segment.end);
      const text = segment.text.trim();

      srtContent += `${counter}\n`;
      srtContent += `${start} --> ${end}\n`;
      srtContent += `${text}\n\n`;
      counter++;
    }

    await fs.promises.writeFile(outputPath, srtContent);
  }

  async generateTikTokStyleSrt(
    transcriptData: any, 
    outputPath: string, 
    maxWordsPerLine: number = 3
  ): Promise<void> {
    this.logger.log(`Generating TikTok-style SRT file at: ${outputPath}`);
    this.logger.log(`Max words per line: ${maxWordsPerLine}`);
    this.logger.log(`Transcript segments count: ${transcriptData.segments?.length || 0}`);
    
    let srtContent = '';
    let counter = 1;

    for (const segment of transcriptData.segments) {
      const start = this.formatTime(segment.start);
      const end = this.formatTime(segment.end);
      const text = segment.text.trim();
      
      // Split text into chunks for TikTok-style display
      const formattedText = this.formatTextForTikTok(text, maxWordsPerLine);

      srtContent += `${counter}\n`;
      srtContent += `${start} --> ${end}\n`;
      srtContent += `${formattedText}\n\n`;
      counter++;
    }

    this.logger.log(`Generated SRT content (first 500 chars): ${srtContent.substring(0, 500)}`);
    
    await fs.promises.writeFile(outputPath, srtContent);
    
    this.logger.log(`SRT file saved successfully to: ${outputPath}`);
  }

  private formatTextForTikTok(text: string, maxWordsPerLine: number): string {
    const words = text.split(' ');
    const lines: string[] = [];
    
    for (let i = 0; i < words.length; i += maxWordsPerLine) {
      const line = words.slice(i, i + maxWordsPerLine).join(' ');
      lines.push(line);
    }
    
    return lines.join('\n');
  }

  async downloadFromUrl(url: string, videoId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(os.tmpdir(), `${videoId}_retry.mp4`);
      ffmpeg(url)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err) =>
          reject(
            new InternalServerErrorException(
              `Failed to download video from URL: ${err.message}`,
            ),
          ),
        )
        .run();
    });
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds - Math.floor(seconds)) * 1000);

    return (
      `${String(hours).padStart(2, '0')}:` +
      `${String(minutes).padStart(2, '0')}:` +
      `${String(remainingSeconds).padStart(2, '0')},` +
      `${String(milliseconds).padStart(3, '0')}`
    );
  }

  async cleanupFile(filePath: string): Promise<void> {
    try {
      await unlinkAsync(filePath);
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
    }
  }

  async generateTikTokStyleAss(
    transcriptData: any,
    outputPath: string,
    styleOptions: TikTokStyleOptions = {}
  ): Promise<void> {
    const defaultOptions: TikTokStyleOptions = {
      fontSize: 24,
      fontColor: 'white',
      fontFamily: 'Arial',
      strokeColor: 'black',
      strokeWidth: 2,
      backgroundColor: 'black',
      backgroundOpacity: 0.8,
      position: 'bottom',
      maxWordsPerLine: 3,
      lineSpacing: 1.2,
      marginVertical: 50,
      marginHorizontal: 40,
      shadowEnabled: true,
      shadowColor: 'black',
      shadowOffset: { x: 2, y: 2 },
    };

    const options = { ...defaultOptions, ...styleOptions };
    
    this.logger.log(`Generating ASS file with style options: ${JSON.stringify(options, null, 2)}`);

    // Convert RGB colors to ASS format (&HBBGGRR)
    const primaryColor = this.rgbToAssColor(options.fontColor || 'white');
    const outlineColor = this.rgbToAssColor(options.strokeColor || 'black');
    const shadowColor = this.rgbToAssColor(options.shadowColor || 'black');
    const backColor = this.rgbToAssColor(options.backgroundColor || 'black', options.backgroundOpacity || 0.8);

    // ASS header with styling
    let assContent = `[Script Info]
Title: TikTok Style Captions
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${options.fontFamily},${options.fontSize},${primaryColor},${primaryColor},${outlineColor},${backColor},1,0,0,0,100,100,0,0,1,${options.strokeWidth},${options.shadowEnabled ? 1 : 0},${this.getAlignment(options.position || 'bottom')},${options.marginHorizontal},${options.marginHorizontal},${options.marginVertical},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // Add dialogue lines - use word-level timing for better subtitle display
    if (transcriptData.words && transcriptData.words.length > 0) {
      // Generate subtitles based on word timing for smoother display
      const words = transcriptData.words;
      const maxWordsPerLine = options.maxWordsPerLine || 3;
      
      for (let i = 0; i < words.length; i += maxWordsPerLine) {
        const wordChunk = words.slice(i, i + maxWordsPerLine);
        const start = this.formatAssTime(wordChunk[0].start);
        const end = this.formatAssTime(wordChunk[wordChunk.length - 1].end);
        const text = wordChunk.map(w => w.word).join(' ');
        
        assContent += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
      }
    } else {
      // Fallback to segment-based timing if words are not available
      for (const segment of transcriptData.segments) {
        const start = this.formatAssTime(segment.start);
        const end = this.formatAssTime(segment.end);
        const text = segment.text.trim();
        
        // Format text for TikTok-style display with word wrapping
        const formattedText = this.formatTextForTikTok(text, options.maxWordsPerLine || 3);
        
        assContent += `Dialogue: 0,${start},${end},Default,,0,0,0,,${formattedText}\n`;
      }
    }

    await fs.promises.writeFile(outputPath, assContent);
    
    // Debug: Log the dialogue lines for troubleshooting
    const dialogueLines = assContent.split('\n').filter(line => line.startsWith('Dialogue:'));
    this.logger.log(`Generated ${dialogueLines.length} dialogue lines`);
    if (dialogueLines.length > 0) {
      this.logger.log(`First dialogue line: ${dialogueLines[0]}`);
      this.logger.log(`Last dialogue line: ${dialogueLines[dialogueLines.length - 1]}`);
    }
    
    this.logger.log(`ASS file generated successfully: ${outputPath}`);
  }

  private rgbToAssColor(color: string, opacity: number = 1): string {
    // Convert common color names to hex
    const colorMap: { [key: string]: string } = {
      'white': 'FFFFFF',
      'black': '000000',
      'red': '0000FF',
      'green': '00FF00',
      'blue': 'FF0000',
      'yellow': '00FFFF',
      'cyan': 'FFFF00',
      'magenta': 'FF00FF',
    };

    let hex = color.replace('#', '');
    if (colorMap[color.toLowerCase()]) {
      hex = colorMap[color.toLowerCase()];
    }

    // Convert RGB to BGR for ASS format
    if (hex.length === 6) {
      const r = hex.substr(0, 2);
      const g = hex.substr(2, 2);
      const b = hex.substr(4, 2);
      const alpha = Math.floor((1 - opacity) * 255).toString(16).padStart(2, '0');
      return `&H${alpha}${b}${g}${r}`;
    }

    // Default to white if conversion fails
    const alpha = Math.floor((1 - opacity) * 255).toString(16).padStart(2, '0');
    return `&H${alpha}FFFFFF`;
  }

  private formatAssTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const centiseconds = Math.floor((remainingSeconds - Math.floor(remainingSeconds)) * 100);

    return (
      `${hours}:${String(minutes).padStart(2, '0')}:${String(Math.floor(remainingSeconds)).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`
    );
  }
}
