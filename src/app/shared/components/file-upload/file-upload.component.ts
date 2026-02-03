import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileUploadComponent),
      multi: true,
    },
  ],
})
export class FileUploadComponent implements ControlValueAccessor {
  @Input() label = 'Upload File';
  @Input() accept = '.pdf,.jpg,.jpeg,.png';
  @Input() maxSizeMB = 5;
  @Output() fileSelected = new EventEmitter<File>();
  @Output() uploadError = new EventEmitter<string>();

  fileName = '';
  fileUrl = '';
  error = '';
  disabled = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.fileUrl = value || '';
    if (value) {
      this.fileName = this.extractFileName(value);
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

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.error = '';

    // Validate file size
    const maxSizeBytes = this.maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      this.error = `File size exceeds ${this.maxSizeMB}MB limit`;
      this.uploadError.emit(this.error);
      input.value = '';
      return;
    }

    // Validate file type
    const allowedTypes = this.accept.split(',').map(t => t.trim().toLowerCase());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      this.error = `Invalid file type. Allowed: ${this.accept}`;
      this.uploadError.emit(this.error);
      input.value = '';
      return;
    }

    this.fileName = file.name;
    this.fileSelected.emit(file);
    this.onTouched();
  }

  setUrl(url: string): void {
    this.fileUrl = url;
    this.onChange(url);
  }

  clearFile(): void {
    this.fileName = '';
    this.fileUrl = '';
    this.error = '';
    this.onChange('');
  }

  private extractFileName(url: string): string {
    return url.split('/').pop() || 'Certificate';
  }

  get hasFile(): boolean {
    return !!this.fileName || !!this.fileUrl;
  }
}
