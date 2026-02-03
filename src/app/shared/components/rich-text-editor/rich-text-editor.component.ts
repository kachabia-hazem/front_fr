import { Component, Input, forwardRef, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
})
export class RichTextEditorComponent implements ControlValueAccessor, AfterViewInit {
  @Input() placeholder = 'Start typing...';
  @Input() minLength = 0;
  @Input() maxLength = 2000;
  @Input() label = '';

  @ViewChild('editor') editorRef!: ElementRef<HTMLDivElement>;

  value = '';
  charCount = 0;
  disabled = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    if (this.value && this.editorRef) {
      this.editorRef.nativeElement.innerHTML = this.value;
      this.updateCharCount();
    }
  }

  writeValue(value: string): void {
    this.value = value || '';
    if (this.editorRef) {
      this.editorRef.nativeElement.innerHTML = this.value;
      this.updateCharCount();
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(): void {
    this.value = this.editorRef.nativeElement.innerHTML;
    this.updateCharCount();
    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();
  }

  private updateCharCount(): void {
    const text = this.editorRef?.nativeElement.textContent || '';
    this.charCount = text.length;
  }

  execCommand(command: string, value = ''): void {
    document.execCommand(command, false, value);
    this.editorRef.nativeElement.focus();
    this.onInput();
  }

  toggleHeading(): void {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const parentElement = range.commonAncestorContainer.parentElement;

      if (parentElement?.tagName === 'H3') {
        document.execCommand('formatBlock', false, 'p');
      } else {
        document.execCommand('formatBlock', false, 'h3');
      }
      this.onInput();
    }
  }

  toggleBold(): void {
    this.execCommand('bold');
  }

  toggleList(): void {
    this.execCommand('insertUnorderedList');
  }

  get isUnderMin(): boolean {
    return this.minLength > 0 && this.charCount < this.minLength;
  }

  get isOverMax(): boolean {
    return this.charCount > this.maxLength;
  }

  get charCountClass(): string {
    if (this.isOverMax) return 'error';
    if (this.isUnderMin) return 'warning';
    return '';
  }
}
