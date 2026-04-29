import { isPlatformBrowser } from '@angular/common';
import { Inject, Pipe, PipeTransform, PLATFORM_ID } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'linkify',
  standalone: true
})
export class LinkifyPipe implements PipeTransform {
  private readonly isBrowser: boolean;

  constructor(
    private readonly sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  transform(value: string | null | undefined): SafeHtml {
    const raw = String(value ?? '');
    if (!raw.trim()) {
      return '';
    }

    if (this.isBrowser && this.looksLikeHtml(raw)) {
      const linked = this.linkifyHtml(raw);
      return this.sanitizer.bypassSecurityTrustHtml(linked);
    }

    const linked = this.linkifyPlainText(raw);
    return this.sanitizer.bypassSecurityTrustHtml(linked);
  }

  private looksLikeHtml(value: string): boolean {
    return /<[^>]+>/.test(value);
  }

  private linkifyHtml(html: string): string {
    if (!this.isBrowser || typeof DOMParser === 'undefined') {
      return this.linkifyPlainText(html);
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const parent = node.parentElement;
      if (!parent) continue;
      const tag = parent.tagName.toLowerCase();
      if (tag === 'a' || tag === 'script' || tag === 'style') continue;
      textNodes.push(node);
    }

    for (const node of textNodes) {
      const original = node.textContent || '';
      if (!original.trim()) continue;
      const linked = this.linkifyPlainText(original);
      if (!linked.includes('<a ')) continue;
      const span = doc.createElement('span');
      span.innerHTML = linked;
      node.parentNode?.replaceChild(span, node);
    }

    return doc.body.innerHTML;
  }

  private linkifyPlainText(input: string): string {
    const markdownLinkRegex = /\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s)]+)\)/gi;
    let result = '';
    let lastIndex = 0;

    for (const match of input.matchAll(markdownLinkRegex)) {
      const matchIndex = match.index ?? 0;
      result += this.linkifyUrlsInText(input.slice(lastIndex, matchIndex));
      result += this.buildAnchor(match[2], match[1]);
      lastIndex = matchIndex + match[0].length;
    }

    result += this.linkifyUrlsInText(input.slice(lastIndex));
    return result;
  }

  private linkifyUrlsInText(text: string): string {
    const urlRegex = /((?:https?:\/\/|www\.)[^\s<]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<]*)?)/gi;
    let result = '';
    let lastIndex = 0;

    for (const match of text.matchAll(urlRegex)) {
      const matchIndex = match.index ?? 0;
      const url = match[0];
      result += this.escapeHtml(text.slice(lastIndex, matchIndex));

      const { cleanUrl, trailing } = this.trimTrailingPunctuation(url);
      if (this.isLikelyEmail(cleanUrl)) {
        result += this.escapeHtml(cleanUrl) + this.escapeHtml(trailing);
      } else {
        result += this.buildAnchor(cleanUrl, cleanUrl);
        result += this.escapeHtml(trailing);
      }
      lastIndex = matchIndex + url.length;
    }

    result += this.escapeHtml(text.slice(lastIndex));
    return result;
  }

  private trimTrailingPunctuation(url: string): { cleanUrl: string; trailing: string } {
    let cleanUrl = url;
    let trailing = '';

    while (/[),.;!?]$/.test(cleanUrl)) {
      trailing = cleanUrl.slice(-1) + trailing;
      cleanUrl = cleanUrl.slice(0, -1);
    }

    return { cleanUrl, trailing };
  }

  private buildAnchor(url: string, label: string): string {
    const href = this.normalizeHref(url);
    return `<a href="${this.escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(label)}</a>`;
  }

  private normalizeHref(url: string): string {
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('www.')) return `https://${url}`;
    if (this.isLikelyDomain(url)) return `https://${url}`;
    return url;
  }

  private isLikelyDomain(value: string): boolean {
    return /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/.*)?$/i.test(value);
  }

  private isLikelyEmail(value: string): boolean {
    return /\S+@\S+\.[a-z]{2,}/i.test(value);
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
