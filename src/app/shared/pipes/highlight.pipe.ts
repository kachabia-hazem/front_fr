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

    // Escape HTML special chars, then convert newlines to <br>
    const safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    if (!query || !query.trim()) return this.sanitizer.bypassSecurityTrustHtml(safe);

    // Escape regex special chars in the query
    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const highlighted = safe.replace(
      new RegExp(escaped, 'gi'),
      match => `<mark class="search-highlight">${match}</mark>`,
    );

    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
}
