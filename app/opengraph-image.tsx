import { ImageResponse } from 'next/og';
import { ShareImage } from '@/lib/share-image';
export const alt = 'Skooby — Follow the blockchain trail';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() { return new ImageResponse(<ShareImage />, size); }
