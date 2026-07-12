import DOMPurify from 'dompurify';

export const sanitizeSVG = (svgString: string | null | undefined): string => {
  if (!svgString) return '';
  return DOMPurify.sanitize(svgString, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['style'], // Allow style tags for SVGs
  });
};

export const sanitizeHTML = (htmlString: string | null | undefined): string => {
  if (!htmlString) return '';
  return DOMPurify.sanitize(htmlString);
};
