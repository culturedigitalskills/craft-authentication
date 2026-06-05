"use client"
import { useState } from 'react'
import { Play } from 'lucide-react'
import { youtubeThumbnailUrl, youtubeEmbedUrl } from '@/lib/youtube'

type GalleryImage = {
  url: string
  alt?: string
}

type GalleryItem =
  | { kind: 'image'; url: string; alt?: string }
  | { kind: 'video'; youtubeId: string; alt?: string }

type GalleryProps = {
  images: GalleryImage[]
  videos?: string[]
}

export default function Gallery({ images, videos = [] }: GalleryProps) {
  const items: GalleryItem[] = [
    ...images.map<GalleryItem>(img => ({ kind: 'image', url: img.url, alt: img.alt })),
    ...videos.map<GalleryItem>(id => ({ kind: 'video', youtubeId: id })),
  ]

  const [selected, setSelected] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (!items.length) return null

  const current = items[selected]
  const renderTile = (item: GalleryItem) => {
    if (item.kind === 'video') {
      return (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={youtubeThumbnailUrl(item.youtubeId)}
            alt={item.alt ?? 'video thumbnail'}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/60 p-3">
              <Play className="h-6 w-6 fill-white text-white" />
            </div>
          </div>
        </>
      )
    }
    return (
      <img
        src={item.url}
        alt={item.alt ?? 'image'}
        className="absolute inset-0 h-full w-full object-cover hover:scale-105 transition-transform duration-300"
      />
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* featured large item */}
        <div
          className="relative w-full h-96 overflow-hidden rounded-lg cursor-zoom-in"
          onClick={() => setLightboxOpen(true)}
        >
          {renderTile(current)}
        </div>

        {/* thumbnail row */}
        <div className="flex gap-2 overflow-x-auto">
          {items.map((item, index) => (
            <div
              key={index}
              onClick={() => setSelected(index)}
              className={`relative w-20 h-20 rounded-md cursor-pointer flex-shrink-0 overflow-hidden transition-opacity
                ${selected === index
                  ? 'ring-2 ring-blue-500 opacity-100'
                  : 'opacity-60 hover:opacity-100'
                }`}
            >
              {item.kind === 'video' ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={youtubeThumbnailUrl(item.youtubeId)}
                    alt={`thumbnail ${index}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full bg-black/60 p-1">
                      <Play className="h-3 w-3 fill-white text-white" />
                    </div>
                  </div>
                </>
              ) : (
                <img
                  src={item.url}
                  alt={item.alt ?? `image ${index}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'oklch(0.08 0.01 250 / 0.8)' }}
          onClick={() => setLightboxOpen(false)}
        >
          {/* close button */}
          <button
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
            onClick={() => setLightboxOpen(false)}
          >
            ✕
          </button>

          {/* prev button */}
          <button
            className="absolute left-4 text-white text-4xl hover:text-gray-300 px-4"
            onClick={(e) => {
              e.stopPropagation()
              setSelected((prev) => (prev === 0 ? items.length - 1 : prev - 1))
            }}
          >
            ‹
          </button>

          {/* large item */}
          {current.kind === 'video' ? (
            <div
              className="relative w-full max-w-5xl aspect-video"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={youtubeEmbedUrl(current.youtubeId) + '?autoplay=1'}
                title="YouTube video"
                className="absolute inset-0 h-full w-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <img
              src={current.url}
              alt={current.alt ?? 'image'}
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {/* next button */}
          <button
            className="absolute right-4 text-white text-4xl hover:text-gray-300 px-4"
            onClick={(e) => {
              e.stopPropagation()
              setSelected((prev) => (prev === items.length - 1 ? 0 : prev + 1))
            }}
          >
            ›
          </button>

          {/* counter */}
          <p className="absolute bottom-4 text-white text-sm">
            {selected + 1} / {items.length}
          </p>
        </div>
      )}
    </>
  )
}
