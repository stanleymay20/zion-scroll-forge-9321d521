/**
 * Video Player Component
 * Advanced video player with controls, progress tracking, and closed captions
 */

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings,
  Subtitles,
  SkipForward,
  SkipBack
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  onComplete?: () => void;
  lectureId: string;
  enrollmentId: string;
}

export function VideoPlayer({ 
  videoUrl, 
  title, 
  onComplete,
  lectureId,
  enrollmentId 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showCaptions, setShowCaptions] = useState(false);
  const [watchedPercentage, setWatchedPercentage] = useState(0);

  // Track progress mutation
  const trackProgressMutation = useMutation({
    mutationFn: async (progress: number) => {
      const { error } = await supabase
        .from('lecture_progress')
        .upsert({
          enrollment_id: enrollmentId,
          lecture_id: lectureId,
          progress,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'enrollment_id,lecture_id'
        });
      
      if (error) throw error;
    }
  });

  // Update progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && isPlaying) {
        const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setWatchedPercentage(progress);
        
        // Track progress every 10%
        if (progress % 10 < 1) {
          trackProgressMutation.mutate(Math.floor(progress));
        }

        // Call onComplete when 90% watched
        if (progress >= 90 && onComplete) {
          onComplete();
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, onComplete]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
      if (newMuted) {
        setVolume(0);
      } else {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const changePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div 
          className="relative bg-black group"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          {/* Video Element */}
          <video
            ref={videoRef}
            className="w-full aspect-video"
            src={videoUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => {
              setIsPlaying(false);
              if (onComplete) onComplete();
            }}
            crossOrigin="anonymous"
          >
            {showCaptions && (
              <track
                kind="captions"
                src={`${videoUrl}.vtt`}
                srcLang="en"
                label="English"
                default
              />
            )}
          </video>

          {/* Video Controls Overlay */}
          <div 
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Progress Bar */}
            <div className="mb-4">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-white mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Play/Pause */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>

                {/* Skip Backward */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => skip(-10)}
                  className="text-white hover:bg-white/20"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                {/* Skip Forward */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => skip(10)}
                  className="text-white hover:bg-white/20"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>

                {/* Volume */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Slider
                    value={[volume]}
                    max={1}
                    step={0.1}
                    onValueChange={handleVolumeChange}
                    className="w-20"
                  />
                </div>

                {/* Time Display */}
                <span className="text-white text-sm ml-2">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Playback Speed */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={changePlaybackRate}
                  className="text-white hover:bg-white/20 text-xs"
                >
                  {playbackRate}x
                </Button>

                {/* Captions */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCaptions(!showCaptions)}
                  className={`text-white hover:bg-white/20 ${showCaptions ? 'bg-white/20' : ''}`}
                >
                  <Subtitles className="h-4 w-4" />
                </Button>

                {/* Settings */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                >
                  <Settings className="h-4 w-4" />
                </Button>

                {/* Fullscreen */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20"
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Play Button Overlay (when paused) */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                size="lg"
                onClick={togglePlay}
                className="rounded-full w-20 h-20 bg-primary/80 hover:bg-primary"
              >
                <Play className="h-10 w-10" />
              </Button>
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="p-4 border-t">
          <h3 className="font-medium">{title}</h3>
          <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
            <span>Progress: {Math.round(watchedPercentage)}%</span>
            <span>Duration: {formatTime(duration)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
