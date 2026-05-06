import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Pipe({
  name: 'safeMap',
  standalone: true
})
export class SafeMapPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(address: string | undefined): SafeResourceUrl {
    if (!address) {
      return '';
    }
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.google.com/maps?q=${encodedAddress}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
