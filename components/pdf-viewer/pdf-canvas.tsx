"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// pdfjs worker — served from public/ to comply with CSP
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfCanvasProps {
 url: string;
 currentPage: number;
 onPageCountReady: (count: number) => void;
 /** Called on click — passes (x%, y%) relative to the clicked page */
 onPageClick: (x: number, y: number, page: number) => void;
 containerRef: React.RefObject<HTMLDivElement | null>;
 /** Render all pages stacked vertically (default: false = single page) */
 allPages?: boolean;
}

export default function PdfCanvas({
 url,
 currentPage,
 onPageCountReady,
 onPageClick,
 containerRef,
 allPages = false,
}: PdfCanvasProps) {
 const [width, setWidth] = useState<number>(800);
 const [numPages, setNumPages] = useState<number>(1);
 const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
 const prevPageRef = useRef<number>(0);

 const onDocumentLoad = useCallback(
 ({ numPages: n }: { numPages: number }) => {
 setNumPages(n);
 onPageCountReady(n);
 if (containerRef.current) {
 setWidth(containerRef.current.clientWidth);
 }
 },
 [onPageCountReady, containerRef],
 );

 function handlePageClick(pageNumber: number) {
 return (e: React.MouseEvent<HTMLDivElement>) => {
 const rect = e.currentTarget.getBoundingClientRect();
 const x = ((e.clientX - rect.left) / rect.width) * 100;
 const y = ((e.clientY - rect.top) / rect.height) * 100;
 onPageClick(x, y, pageNumber);
 };
 }

 // Scroll to currentPage when it changes (all-pages mode)
 useEffect(() => {
 if (!allPages) return;

 // Only scroll when page actually changes
 if (currentPage !== prevPageRef.current) {
 prevPageRef.current = currentPage;

 const el = pageRefs.current.get(currentPage);
 if (el) {
 el.scrollIntoView({
 behavior: "smooth",
 block: "start",
 });
 }
 }
 }, [allPages, currentPage]); // Dependencies are safe here

 return (
 <Document
 file={url}
 onLoadSuccess={onDocumentLoad}
 loading={
 <div className="flex h-150 items-center justify-center text-sm text-zinc-400">
 Loading PDF…
 </div>
 }
 error={
 <div className="flex h-40 items-center justify-center text-sm text-red-500">
 Failed to load PDF.
 </div>
 }
 >
 {allPages ? (
 Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
 <div
 key={pageNum}
 ref={(el) => {
 if (el) pageRefs.current.set(pageNum, el);
 else pageRefs.current.delete(pageNum);
 }}
 onClick={handlePageClick(pageNum)}
 className="cursor-crosshair select-none border-b border-zinc-200 last:border-0"
 data-page={pageNum}
 >
 <Page
 pageNumber={pageNum}
 width={width}
 renderAnnotationLayer={false}
 renderTextLayer={false}
 />
 </div>
 ))
 ) : (
 <div
 onClick={handlePageClick(currentPage)}
 className="cursor-crosshair select-none"
 >
 <Page
 pageNumber={currentPage}
 width={width}
 renderAnnotationLayer={false}
 renderTextLayer={false}
 />
 </div>
 )}
 </Document>
 );
}
