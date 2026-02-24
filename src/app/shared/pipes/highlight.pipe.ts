import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
  standalone: true,
})
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string | undefined | null, query: string): SafeHtml {
    if (!text) return '';
    if (!query || !query.trim()) return text;

    // Escape HTML special chars in source text first
    const safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Escape regex special chars in the query
    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const highlighted = safe.replace(
      new RegExp(escaped, 'gi'),
      match => `<mark class="search-highlight">${match}</mark>`,
    );

    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
}
