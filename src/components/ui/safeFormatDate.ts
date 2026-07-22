export const safeFormatDate = (dateVal: any, lang: string): string => {
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'No Date';
    return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'No Date';
  }
};
