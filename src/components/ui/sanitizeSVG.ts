import DOMPurify from 'dompurify';
export const sanitizeSVG = (svg: string | null): string => {
  if (!svg) return '';
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['style'],
  });
};
