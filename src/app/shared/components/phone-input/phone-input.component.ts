import { Component, forwardRef, Input, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

export interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phone-input.component.html',
  styleUrl: './phone-input.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true,
    },
  ],
})
export class PhoneInputComponent implements ControlValueAccessor {
  @Input() placeholder = 'Phone number';

  isDropdownOpen = false;
  searchQuery = '';
  phoneNumber = '';
  selectedCountry: Country;

  countries: Country[] = [
    { name: 'Tunisia', code: 'tn', dialCode: '+216', flag: 'https://flagcdn.com/w40/tn.png' },
    { name: 'France', code: 'fr', dialCode: '+33', flag: 'https://flagcdn.com/w40/fr.png' },
    { name: 'United States', code: 'us', dialCode: '+1', flag: 'https://flagcdn.com/w40/us.png' },
    { name: 'United Kingdom', code: 'gb', dialCode: '+44', flag: 'https://flagcdn.com/w40/gb.png' },
    { name: 'Germany', code: 'de', dialCode: '+49', flag: 'https://flagcdn.com/w40/de.png' },
    { name: 'Spain', code: 'es', dialCode: '+34', flag: 'https://flagcdn.com/w40/es.png' },
    { name: 'Italy', code: 'it', dialCode: '+39', flag: 'https://flagcdn.com/w40/it.png' },
    { name: 'Belgium', code: 'be', dialCode: '+32', flag: 'https://flagcdn.com/w40/be.png' },
    { name: 'Switzerland', code: 'ch', dialCode: '+41', flag: 'https://flagcdn.com/w40/ch.png' },
    { name: 'Canada', code: 'ca', dialCode: '+1', flag: 'https://flagcdn.com/w40/ca.png' },
    { name: 'Morocco', code: 'ma', dialCode: '+212', flag: 'https://flagcdn.com/w40/ma.png' },
    { name: 'Algeria', code: 'dz', dialCode: '+213', flag: 'https://flagcdn.com/w40/dz.png' },
    { name: 'Libya', code: 'ly', dialCode: '+218', flag: 'https://flagcdn.com/w40/ly.png' },
    { name: 'Egypt', code: 'eg', dialCode: '+20', flag: 'https://flagcdn.com/w40/eg.png' },
    { name: 'Saudi Arabia', code: 'sa', dialCode: '+966', flag: 'https://flagcdn.com/w40/sa.png' },
    { name: 'United Arab Emirates', code: 'ae', dialCode: '+971', flag: 'https://flagcdn.com/w40/ae.png' },
    { name: 'Qatar', code: 'qa', dialCode: '+974', flag: 'https://flagcdn.com/w40/qa.png' },
    { name: 'Kuwait', code: 'kw', dialCode: '+965', flag: 'https://flagcdn.com/w40/kw.png' },
    { name: 'Jordan', code: 'jo', dialCode: '+962', flag: 'https://flagcdn.com/w40/jo.png' },
    { name: 'Lebanon', code: 'lb', dialCode: '+961', flag: 'https://flagcdn.com/w40/lb.png' },
    { name: 'Turkey', code: 'tr', dialCode: '+90', flag: 'https://flagcdn.com/w40/tr.png' },
    { name: 'Netherlands', code: 'nl', dialCode: '+31', flag: 'https://flagcdn.com/w40/nl.png' },
    { name: 'Portugal', code: 'pt', dialCode: '+351', flag: 'https://flagcdn.com/w40/pt.png' },
    { name: 'Austria', code: 'at', dialCode: '+43', flag: 'https://flagcdn.com/w40/at.png' },
    { name: 'Sweden', code: 'se', dialCode: '+46', flag: 'https://flagcdn.com/w40/se.png' },
    { name: 'Norway', code: 'no', dialCode: '+47', flag: 'https://flagcdn.com/w40/no.png' },
    { name: 'Denmark', code: 'dk', dialCode: '+45', flag: 'https://flagcdn.com/w40/dk.png' },
    { name: 'Finland', code: 'fi', dialCode: '+358', flag: 'https://flagcdn.com/w40/fi.png' },
    { name: 'Poland', code: 'pl', dialCode: '+48', flag: 'https://flagcdn.com/w40/pl.png' },
    { name: 'Russia', code: 'ru', dialCode: '+7', flag: 'https://flagcdn.com/w40/ru.png' },
    { name: 'China', code: 'cn', dialCode: '+86', flag: 'https://flagcdn.com/w40/cn.png' },
    { name: 'Japan', code: 'jp', dialCode: '+81', flag: 'https://flagcdn.com/w40/jp.png' },
    { name: 'South Korea', code: 'kr', dialCode: '+82', flag: 'https://flagcdn.com/w40/kr.png' },
    { name: 'India', code: 'in', dialCode: '+91', flag: 'https://flagcdn.com/w40/in.png' },
    { name: 'Australia', code: 'au', dialCode: '+61', flag: 'https://flagcdn.com/w40/au.png' },
    { name: 'Brazil', code: 'br', dialCode: '+55', flag: 'https://flagcdn.com/w40/br.png' },
    { name: 'Mexico', code: 'mx', dialCode: '+52', flag: 'https://flagcdn.com/w40/mx.png' },
    { name: 'Argentina', code: 'ar', dialCode: '+54', flag: 'https://flagcdn.com/w40/ar.png' },
    { name: 'South Africa', code: 'za', dialCode: '+27', flag: 'https://flagcdn.com/w40/za.png' },
    { name: 'Nigeria', code: 'ng', dialCode: '+234', flag: 'https://flagcdn.com/w40/ng.png' },
    { name: 'Kenya', code: 'ke', dialCode: '+254', flag: 'https://flagcdn.com/w40/ke.png' },
    { name: 'Senegal', code: 'sn', dialCode: '+221', flag: 'https://flagcdn.com/w40/sn.png' },
    { name: 'Ivory Coast', code: 'ci', dialCode: '+225', flag: 'https://flagcdn.com/w40/ci.png' },
    { name: 'Cameroon', code: 'cm', dialCode: '+237', flag: 'https://flagcdn.com/w40/cm.png' },
    { name: 'Greece', code: 'gr', dialCode: '+30', flag: 'https://flagcdn.com/w40/gr.png' },
    { name: 'Ireland', code: 'ie', dialCode: '+353', flag: 'https://flagcdn.com/w40/ie.png' },
    { name: 'Czech Republic', code: 'cz', dialCode: '+420', flag: 'https://flagcdn.com/w40/cz.png' },
    { name: 'Romania', code: 'ro', dialCode: '+40', flag: 'https://flagcdn.com/w40/ro.png' },
    { name: 'Hungary', code: 'hu', dialCode: '+36', flag: 'https://flagcdn.com/w40/hu.png' },
    { name: 'Ukraine', code: 'ua', dialCode: '+380', flag: 'https://flagcdn.com/w40/ua.png' },
  ];

  filteredCountries: Country[] = [];

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef) {
    this.selectedCountry = this.countries[0]; // Tunisia by default
    this.filteredCountries = [...this.countries];
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.searchQuery = '';
      this.filteredCountries = [...this.countries];
    }
  }

  filterCountries(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredCountries = this.countries.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.dialCode.includes(query) ||
        country.code.toLowerCase().includes(query)
    );
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.isDropdownOpen = false;
    this.updateValue();
  }

  onPhoneInput(): void {
    this.updateValue();
  }

  private updateValue(): void {
    const fullNumber = this.selectedCountry.dialCode + this.phoneNumber.replace(/^\s+/, '');
    this.onChange(fullNumber);
  }

  // ControlValueAccessor methods
  writeValue(value: string): void {
    if (value) {
      // Try to parse the country code from the value
      const country = this.countries.find((c) => value.startsWith(c.dialCode));
      if (country) {
        this.selectedCountry = country;
        this.phoneNumber = value.substring(country.dialCode.length).trim();
      } else {
        this.phoneNumber = value;
      }
    } else {
      this.phoneNumber = '';
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onBlur(): void {
    this.onTouched();
  }
}
