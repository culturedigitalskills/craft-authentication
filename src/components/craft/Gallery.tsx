"use client"
import { useState } from 'react'

type GalleryImage = {
  url: string
  alt?: string
}

type GalleryProps = {
  images: GalleryImage[]
}

export default function Gallery({ images }: GalleryProps) {
  const [selected, setSelected] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (!images?.length) return null

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* featured large image */}
        <div 
          className="w-full h-96 overflow-hidden rounded-lg cursor-zoom-in"
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={images[selected].url}
            alt={images[selected].alt ?? 'image'}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* thumbnail row */}
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <img
              key={index}
              src={image.url}
              alt={image.alt ?? `image ${index}`}
              onClick={() => setSelected(index)}
              className={`w-20 h-20 object-cover rounded-md cursor-pointer flex-shrink-0 transition-opacity
                ${selected === index
                  ? 'ring-2 ring-blue-500 opacity-100'
                  : 'opacity-60 hover:opacity-100'
                }`}
            />
          ))}
        </div>
      </div>

      {/* lightbox */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
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
              setSelected((prev) => (prev === 0 ? images.length - 1 : prev - 1))
            }}
          >
            ‹
          </button>

          {/* large image */}
          <img
            src={images[selected].url}
            alt={images[selected].alt ?? 'image'}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* next button */}
          <button
            className="absolute right-4 text-white text-4xl hover:text-gray-300 px-4"
            onClick={(e) => {
              e.stopPropagation()
              setSelected((prev) => (prev === images.length - 1 ? 0 : prev + 1))
            }}
          >
            ›
          </button>

          {/* image counter */}
          <p className="absolute bottom-4 text-white text-sm">
            {selected + 1} / {images.length}
          </p>
        </div>
      )}
    </>
  )
}