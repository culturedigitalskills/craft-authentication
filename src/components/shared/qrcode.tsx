'use client';
import QR from 'qrcode';

import { type HTMLAttributes, useEffect, useRef, useState } from 'react';
import { oklch, formatHex } from 'culori';

export type QRCodeProps = HTMLAttributes<HTMLDivElement> & {
  margin: number;
  data: string;
  foreground?: string;
  background?: string;
  robustness?: 'L' | 'M' | 'Q' | 'H';
  /** Translated label for the download link. Falls back to English. */
  downloadLabel?: string;
  /** Filename for the downloaded SVG, without the extension. */
  downloadName?: string;
};

const oklchRegex = /oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)/;

const getOklch = (color: string, fallback: [number, number, number]) => {
  const oklchMatch = color.match(oklchRegex);

  if (!oklchMatch) {
    return { l: fallback[0], c: fallback[1], h: fallback[2] };
  }

  return {
    l: Number.parseFloat(oklchMatch[1]),
    c: Number.parseFloat(oklchMatch[2]),
    h: Number.parseFloat(oklchMatch[3]),
  };
};

/**
 * Resolve a caller-supplied colour to a hex string.
 *
 * Callers pass plain hex (the navy/paper palette), while the CSS custom
 * properties this falls back to are authored in oklch. Running hex through the
 * oklch parser silently discarded it and drew every code in the default
 * near-black on near-white.
 */
const toHex = (color: string, fallback: [number, number, number]) => {
  const trimmed = color.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) return trimmed;
  return formatHex(oklch({ mode: 'oklch', ...getOklch(trimmed, fallback) }));
};


export const QRCode = ({data,
  foreground,
  background,
  margin,
  robustness = 'L',
  downloadLabel = 'Download PNG',
  downloadName = 'qrcode',
  className,  ...props }: QRCodeProps) => {
    const [svg, setSVG] = useState<string | null>(null);
    const [png, setPNG] = useState<string | null>(null);
    useEffect(() => {
  
    const generateQR = async () => {
        try {

        const styles = getComputedStyle(document.documentElement);
        const foregroundColor =
            foreground ?? styles.getPropertyValue('--foreground');
        const backgroundColor =
            background ?? styles.getPropertyValue('--background');


        const color = {
            dark: toHex(foregroundColor, [0.21, 0.006, 285.885]),
            light: toHex(backgroundColor, [0.985, 0, 0]),
        };

        // On screen: SVG, so the code stays crisp at any size.
        const newSvg = await QR.toString(
            data, {
            type: 'svg',
            color,
            width: 200,
            errorCorrectionLevel: robustness,
            margin: margin,
            }
        );

        // To download: PNG at print resolution. PNG rather than JPEG because
        // JPEG is lossy and rings around the hard edges a QR code is made of,
        // which costs scan reliability at exactly the small printed sizes this
        // is meant for. 1024px stays sharp on a label or a card.
        const newPng = await QR.toDataURL(
            data, {
            type: 'image/png',
            color,
            width: 1024,
            errorCorrectionLevel: robustness,
            margin: margin,
            }
        );
        setPNG(newPng);



        


        setSVG(newSvg);
        } catch (err) {
        console.error(err);
        }
    };

    generateQR();
    }, [data, foreground, background, robustness, margin]);

  if (!svg) {
    return null;
  }
  const stringsvg = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return (
    <div className="flex flex-col items-center gap-4">
      <img src={stringsvg} alt="QR code" />
      {png && (
        <a href={png} download={`${downloadName}.png`} className="sc-btn sc-btn--primary justify-center">
          {downloadLabel}
        </a>
      )}
    </div>
  );
};

