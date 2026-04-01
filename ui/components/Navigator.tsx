'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTranslation } from 'react-i18next'
import { CheckIcon, MoreVerticalIcon, Trash2Icon } from 'lucide-react'
import { useDocumentsCountQuery, useThumbnailQuery } from '@/lib/query/hooks'
import { useDocumentMutations } from '@/lib/query/mutations'
import { useEditorUiStore } from '@/lib/stores/editorUiStore'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { flushTextBlockSync } from '@/lib/services/syncQueues'
import { cancelObjectUrlRevoke, revokeObjectUrlLater } from '@/lib/util'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export function Navigator() {
  const { data: totalPagesData = 0 } = useDocumentsCountQuery()
  const totalPages = totalPagesData ?? 0
  const documentsVersion = useEditorUiStore((state) => state.documentsVersion)
  const currentDocumentIndex = useEditorUiStore(
    (state) => state.currentDocumentIndex,
  )
  const setCurrentDocumentIndex = useEditorUiStore(
    (state) => state.setCurrentDocumentIndex,
  )
  const selectedDocumentIndices = useEditorUiStore(
    (state) => state.selectedDocumentIndices,
  )
  const setSelectedDocumentIndices = useEditorUiStore(
    (state) => state.setSelectedDocumentIndices,
  )
  const toggleDocumentSelection = useEditorUiStore(
    (state) => state.toggleDocumentSelection,
  )
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null,
  )
  const listRef = useRef<HTMLDivElement | null>(null)
  const indices = useMemo(
    () => Array.from({ length: totalPages }, (_, idx) => idx),
    [totalPages],
  )
  const rowVirtualizer = useVirtualizer({
    count: indices.length,
    getScrollElement: () => listRef.current,
    getItemKey: (index) => indices[index] ?? index,
    estimateSize: () => 320,
    overscan: 8,
    measureElement: (element) => element.getBoundingClientRect().height,
  })
  const { t } = useTranslation()

  useEffect(() => {
    rowVirtualizer.measure()
  }, [rowVirtualizer, totalPages, documentsVersion])

  const {
    deleteDocument,
    exportDocument,
    exportPsdDocument,
    processImage,
  } = useDocumentMutations()

  const handleSelect = (idx: number, event?: React.MouseEvent) => {
    if (event?.shiftKey && lastSelectedIndex !== null) {
      const min = Math.min(idx, lastSelectedIndex)
      const max = Math.max(idx, lastSelectedIndex)
      const nextSelection = new Set(selectedDocumentIndices)
      for (let i = min; i <= max; i++) {
        nextSelection.add(i)
      }
      setSelectedDocumentIndices(nextSelection)
    } else if (event?.metaKey || event?.ctrlKey) {
      toggleDocumentSelection(idx)
      setLastSelectedIndex(idx)
    } else {
      setSelectedDocumentIndices(new Set([idx]))
      setLastSelectedIndex(idx)
      void flushTextBlockSync()
        .catch(() => {})
        .finally(() => {
          setCurrentDocumentIndex(idx)
        })
    }
  }

  const getTargetIndices = (idx: number) => {
    if (selectedDocumentIndices.has(idx)) {
      return Array.from(selectedDocumentIndices)
    }
    return [idx]
  }

  const handleDelete = (idx: number) => {
    const targets = getTargetIndices(idx)
    for (const target of targets.reverse()) {
      void deleteDocument(target)
    }
  }

  const handleProcess = async (idx: number) => {
    // If we're clicking the context menu of an item that is selected,
    // processImage uses selectedDocumentIndices from store.
    // If it's not selected, we pass the idx to process only that item.
    if (selectedDocumentIndices.has(idx)) {
      await processImage()
    } else {
      await processImage(undefined, idx)
    }
  }

  const handleExport = async (idx: number) => {
    const targets = getTargetIndices(idx)
    for (const target of targets) {
      await exportDocument(target)
    }
  }

  const handleExportPsd = async (idx: number) => {
    const targets = getTargetIndices(idx)
    for (const target of targets) {
      await exportPsdDocument(target)
    }
  }

  return (
    <div
      data-testid='navigator-panel'
      data-total-pages={totalPages}
      className='bg-muted/50 flex h-full min-h-0 w-full flex-col border-r'
    >
      <div className='border-border border-b px-2 py-1.5'>
        <p className='text-muted-foreground text-xs tracking-wide uppercase'>
          {t('navigator.title')}
        </p>
        <p className='text-foreground text-xs font-semibold'>
          {totalPages
            ? t('navigator.pages', { count: totalPages })
            : t('navigator.empty')}
        </p>
      </div>

      <div className='text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 text-xs'>
        {totalPages > 0 ? (
          <span className='bg-secondary text-secondary-foreground px-2 py-0.5 font-mono text-[10px]'>
            #{currentDocumentIndex + 1}
          </span>
        ) : (
          <span>{t('navigator.prompt')}</span>
        )}
      </div>

      <ScrollArea className='min-h-0 flex-1' viewportRef={listRef}>
        <div className='p-2'>
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const idx = indices[virtualRow.index]
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: '6px',
                  }}
                >
                  <PagePreview
                    index={idx}
                    documentsVersion={documentsVersion}
                    selected={idx === currentDocumentIndex}
                    multiSelected={selectedDocumentIndices.has(idx)}
                    onSelect={(e) => handleSelect(idx, e)}
                    onDelete={(e) => {
                      e.stopPropagation()
                      handleDelete(idx)
                    }}
                    onProcess={(e) => {
                      e.stopPropagation()
                      handleProcess(idx)
                    }}
                    onExport={(e) => {
                      e.stopPropagation()
                      handleExport(idx)
                    }}
                    onExportPsd={(e) => {
                      e.stopPropagation()
                      handleExportPsd(idx)
                    }}
                    onToggleMultiSelect={(e) => {
                      e.stopPropagation()
                      toggleDocumentSelection(idx)
                      setLastSelectedIndex(idx)
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

type PagePreviewProps = {
  index: number
  documentsVersion: number
  selected: boolean
  multiSelected: boolean
  onSelect: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
  onProcess: (e: React.MouseEvent) => void
  onExport: (e: React.MouseEvent) => void
  onExportPsd: (e: React.MouseEvent) => void
  onToggleMultiSelect: (e: React.MouseEvent) => void
}

function PagePreview({
  index,
  documentsVersion,
  selected,
  multiSelected,
  onSelect,
  onDelete,
  onProcess,
  onExport,
  onExportPsd,
  onToggleMultiSelect,
}: PagePreviewProps) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState<string>()
  const {
    data: thumbnailBlob,
    isPending: loading,
    isError: error,
  } = useThumbnailQuery(index, documentsVersion)

  useLayoutEffect(() => {
    if (!thumbnailBlob) {
      setPreview(undefined)
      return
    }
    const url = URL.createObjectURL(thumbnailBlob)
    cancelObjectUrlRevoke(url)
    setPreview(url)
    return () => {
      revokeObjectUrlLater(url)
    }
  }, [thumbnailBlob])

  return (
    <div className='group relative'>
      <div className='absolute left-1 top-1 z-10 hidden group-hover:block data-[selected=true]:block' data-selected={multiSelected}>
        <Button
          variant='ghost'
          size='icon-xs'
          onClick={onToggleMultiSelect}
          className={`size-5 rounded border bg-background/80 shadow-sm ${multiSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent hover:text-foreground'}`}
        >
          <CheckIcon className='size-3.5' />
        </Button>
      </div>
      <Button
        variant='ghost'
        onClick={onSelect}
        data-testid={`navigator-page-${index}`}
        data-page-index={index}
        data-selected={selected}
        data-multi-selected={multiSelected}
        className='bg-card data-[selected=true]:border-primary data-[multi-selected=true]:border-primary/50 flex h-auto w-full flex-col gap-0.5 rounded border border-transparent p-1.5 text-left shadow-sm transition-colors'
      >
        {loading ? (
          <div className='bg-muted aspect-3/4 w-full animate-pulse rounded' />
        ) : error ? (
          <div className='bg-muted flex aspect-3/4 w-full items-center justify-center rounded'>
            <span className='text-muted-foreground text-[10px]'>?</span>
          </div>
        ) : preview ? (
          <img
            src={preview}
            alt={`Page ${index + 1}`}
            style={{ objectFit: 'contain' }}
            className='aspect-3/4 w-full rounded object-cover'
          />
        ) : (
          <div className='bg-muted aspect-3/4 w-full rounded' />
        )}
        <div className='text-muted-foreground flex flex-1 items-center text-xs'>
          <div className='text-foreground mx-auto flex text-center font-semibold'>
            {index + 1}
          </div>
        </div>
      </Button>

      <div className='absolute right-1 top-1 z-10 hidden group-hover:block'>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant='ghost'
              size='icon-xs'
              className='size-5 rounded bg-background/80 shadow-sm border border-border'
            >
              <MoreVerticalIcon className='size-3.5' />
            </Button>
          </PopoverTrigger>
          <PopoverContent align='end' className='w-40 p-1'>
            <div className='flex flex-col gap-1'>
              <Button variant='ghost' size='sm' className='justify-start text-xs' onClick={onProcess}>
                {t('menu.process')}
              </Button>
              <Button variant='ghost' size='sm' className='justify-start text-xs' onClick={onExport}>
                {t('menu.export')}
              </Button>
              <Button variant='ghost' size='sm' className='justify-start text-xs' onClick={onExportPsd}>
                {t('menu.exportPsd')}
              </Button>
              <Button variant='ghost' size='sm' className='justify-start text-xs text-destructive hover:bg-destructive/10 hover:text-destructive' onClick={onDelete}>
                {t('menu.delete')}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
