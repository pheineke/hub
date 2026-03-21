import { ReactNode } from 'react';
import { HelloWorldWidget } from './hello_world';
import { MediaDownloaderWidget } from './media_downloader';

export interface AppManifest {
  id: string;
  name: string;
  description: string;
  icon: string; // Using lucide-react icon names
  widget: () => JSX.Element;
}

export const appRegistry: Record<string, AppManifest> = {
  hello_world: {
    id: 'hello_world',
    name: 'Hello World',
    description: 'A basic counter tool to demonstrate the Hub modularity.',
    icon: 'Sparkles',
    widget: HelloWorldWidget
  },
  media_downloader: {
    id: 'media_downloader',
    name: 'Media Downloader',
    description: 'Download Spotify playlists, albums or YouTube videos in highest quality.',
    icon: 'Download',
    widget: MediaDownloaderWidget
  }
};
