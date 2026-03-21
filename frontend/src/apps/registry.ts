import { ReactNode } from 'react';
import { HelloWorldWidget } from './hello_world';
import { MediaDownloaderWidget } from './media_downloader';
import { PomodoroWidget } from './pomodoro';

export interface AppManifest {
  id: string;
  name: string;
  description: string;
  icon: string; // Using lucide-react icon names
  offlineCapable: boolean;
  widget: () => JSX.Element;
}

export const appRegistry: Record<string, AppManifest> = {
  hello_world: {
    id: 'hello_world',
    name: 'Hello World',
    description: 'A basic counter tool to demonstrate the Hub modularity.',
    icon: 'Sparkles',
    offlineCapable: true,
    widget: HelloWorldWidget
  },
  media_downloader: {
    id: 'media_downloader',
    name: 'Media Downloader',
    description: 'Download Spotify playlists, albums or YouTube videos in highest quality.',
    icon: 'Download',
    offlineCapable: false,
    widget: MediaDownloaderWidget
  },
  pomodoro: {
    id: 'pomodoro',
    name: 'Pomodoro Timer',
    description: 'A customizable timer to improve focus and productivity using the Pomodoro technique.',
    icon: 'Timer',
    offlineCapable: true,
    widget: PomodoroWidget
  }
};
