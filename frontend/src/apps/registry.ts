import { ReactNode } from 'react';
import { HelloWorldWidget } from './hello_world';
import { SpotifyDownloaderWidget } from './spotify_downloader';

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
  spotify_downloader: {
    id: 'spotify_downloader',
    name: 'Spotify Downloader',
    description: 'Download entire Spotify playlists or albums in highest quality using Odesli/YT.',
    icon: 'Music',
    widget: SpotifyDownloaderWidget
  }
};
