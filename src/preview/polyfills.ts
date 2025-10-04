// Polyfill Buffer for gray-matter in browser
import { Buffer } from 'buffer';

(window as any).Buffer = Buffer;
