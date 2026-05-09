/**
 * Course Preview Video Component
 * Displays a preview video for the course with controls
 */

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CoursePreviewVideoProps {
  videoUrl?: string;
  thumbnailUrl?: string;
  title: string;
  duration?: string;
}

export function CoursePreviewVideo({ 
  videoUrl, 
  thumbnailUrl, 
  title,
  duration 
}: CoursePreviewVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (isPlaying) {
        v.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        await v.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Preview video play failed', err);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
  };

  const handleVideoWaiting = () => {
    setIsLoading(true);
  };

  const handleVideoPlaying = () => {
    setIsLoading(false);
  };

  // If no video URL, show placeholder
  if (!videoUrl) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="relative aspect-video bg-muted flex items-center justify-center">
            {thumbnailUrl ? (
              <img 
                src={thumbnailUrl} 
                alt={title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-8">
                <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Preview video coming soon
                </p>
              </div>
            )}
            <div className="absolute top-4 right-4">
              <Badge variant="secondary" className="bg-black/70 text-white">
                Preview
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const mimeType = (() => {
    const url = (videoUrl || '').toLowerCase();
    if (url.includes('.webm')) return 'video/webm';
    if (url.includes('.m3u8')) return 'application/x-mpegURL';
    return 'video/mp4';
  })();

  return (
    <Card>
      <CardContent className="p-0">
        <div className="relative aspect-video bg-black group">
          <video
            ref={videoRef}
            className="w-full h-full"
            poster={thumbnailUrl}
            preload="metadata"
            playsInline
            controls
            crossOrigin="anonymous"
            onLoadedData={handleVideoLoad}
            onWaiting={handleVideoWaiting}
            onPlaying={() => { setIsLoading(false); setIsPlaying(true); }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          >
            <source src={videoUrl} type={mimeType} />
            <source src={videoUrl} />
            Your browser does not support the video tag.
          </video>

          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-12 w-12 text-white animate-spin" />
            </div>
          )}

          {/* Preview Badge */}
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-black/70 text-white">
              Preview {duration && `• ${duration}`}
            </Badge>
          </div>

          {/* Play/Pause Overlay */}
          {!isPlaying && !isLoading && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
              onClick={handlePlayPause}
            >
              <div className="bg-primary rounded-full p-6 hover:scale-110 transition-transform">
                <Play className="h-12 w-12 text-white fill-white" />
              </div>
            </div>
          )}

          {/* Video Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayPause}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleMuteToggle}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>

              <div className="flex-1" />

              <Button
                variant="ghost"
                size="icon"
                onClick={handleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
