import { Component, Inject, OnInit, OnDestroy } from '@angular/core'
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser'
import { TranslateService } from '@ngx-translate/core'
import { EventService, MultilingualTranslationsService, WsEvents } from '@sunbird-cb/utils-v2'
import { jsPDF } from 'jspdf'

export interface NlwCertificateDialogData {
  action: string
  type: string         // 'API_DOCUMENT' | 'PDF' | 'IMAGE'
  title?: string
  url?: string
  api?: {
    url: string
    method: string
    headers?: { [key: string]: string }
    body?: any
    responseType?: string
    renderAs?: string    // 'SVG' | 'IMAGE' | 'HTML'
    withCredentials?: boolean
  }
}

@Component({
  selector: 'sb-uic-nlw-certificate-dialog',
  templateUrl: './nlw-certificate-dialog.component.html',
  styleUrls: ['./nlw-certificate-dialog.component.scss'],
  /* tslint:disable */
  host: { class: 'nlw-certificate-inner-dialog-panel' },
  /* tslint:enable */
})
export class NlwCertificateDialogComponent implements OnInit, OnDestroy {
  isLoading = true
  hasError = false
  errorMessage = ''

  svgContent: SafeHtml | null = null
  pdfUrl: SafeResourceUrl | null = null
  imageUrl: string | null = null

  // Raw SVG string for download
  private rawSvgString: string | null = null
  private objectUrl: string | null = null
  private svgWidth = 1820
  private svgHeight = 1000

  constructor(
    public dialogRef: MatDialogRef<NlwCertificateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NlwCertificateDialogData,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private events: EventService,
    private translate: TranslateService,
    private langtranslations: MultilingualTranslationsService,
  ) {
    this.langtranslations.languageSelectedObservable.subscribe(() => {
      if (localStorage.getItem('websiteLanguage')) {
        this.translate.setDefaultLang('en')
        const lang = localStorage.getItem('websiteLanguage')!
        this.translate.use(lang)
      }
    })
  }

  ngOnInit(): void {
    if (this.data.type === 'PDF' && this.data.url) {
      this.loadPdf(this.data.url)
    } else if (this.data.type === 'IMAGE' && this.data.url) {
      this.imageUrl = this.data.url
      this.isLoading = false
    } else if (this.data.type === 'API_DOCUMENT' && this.data.api) {
      this.callDynamicApi(this.data.api)
    } else {
      this.hasError = true
      this.errorMessage = 'Invalid configuration'
      this.isLoading = false
    }
  }

  private loadPdf(url: string): void {
    const pdfUrlWithZoom = url.includes('#') ? url : `${url}#zoom=20`
    this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrlWithZoom)
    this.isLoading = false
  }

  private callDynamicApi(apiConfig: NlwCertificateDialogData['api']): void {
    if (!apiConfig) { return }

    let headers = new HttpHeaders()
    if (apiConfig.headers) {
      Object.keys(apiConfig.headers).forEach(key => {
        headers = headers.set(key, apiConfig.headers![key])
      })
    }

    const options: any = { headers, withCredentials: apiConfig.withCredentials || false }
    if (apiConfig.responseType === 'blob') {
      options.responseType = 'blob'
    } else if (apiConfig.renderAs === 'SVG' || apiConfig.renderAs === 'HTML') {
      options.responseType = 'text'
    }

    let request$
    const method = (apiConfig.method || 'GET').toUpperCase()
    switch (method) {
      case 'POST':
        request$ = this.http.post(apiConfig.url, apiConfig.body || {}, options)
        break
      case 'PUT':
        request$ = this.http.put(apiConfig.url, apiConfig.body || {}, options)
        break
      default:
        request$ = this.http.get(apiConfig.url, options)
        break
    }

    request$.subscribe(
      (response: any) => this.renderResponse(response, apiConfig),
      (error: any) => {
        this.hasError = true
        this.errorMessage = 'Failed to load content. Please try again.'
        this.isLoading = false
        console.error('NLW Certificate Dialog API error:', error)
      }
    )
  }

  private renderResponse(response: any, apiConfig: NlwCertificateDialogData['api']): void {
    if (!apiConfig) { return }
    const renderAs = (apiConfig.renderAs || '').toUpperCase()

    if (apiConfig.responseType === 'blob' && response instanceof Blob) {
      if (renderAs === 'SVG') {
        const reader = new FileReader()
        reader.onload = () => {
          this.rawSvgString = this.cleanSvgString(reader.result as string)
          this.svgContent = this.sanitizer.bypassSecurityTrustHtml(this.rawSvgString)
          this.isLoading = false
        }
        reader.readAsText(response)
      } else if (renderAs === 'IMAGE') {
        this.objectUrl = URL.createObjectURL(response)
        this.imageUrl = this.objectUrl
        this.isLoading = false
      } else {
        this.objectUrl = URL.createObjectURL(response)
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${this.objectUrl}#zoom=20`)
        this.isLoading = false
      }
    } else if (typeof response === 'string') {
      if (renderAs === 'SVG' || renderAs === 'HTML') {
        this.rawSvgString = this.cleanSvgString(response)
        this.svgContent = this.sanitizer.bypassSecurityTrustHtml(this.rawSvgString)
      }
      this.isLoading = false
    } else {
      this.hasError = true
      this.errorMessage = 'Unsupported response format.'
      this.isLoading = false
    }
  }

  // ── Download methods ────────────────────────────────

  downloadSvg(): void {
    this.raiseDownloadTelemetry('svg')
    if (this.rawSvgString) {
      const cleanedSvg = this.cleanSvgString(this.rawSvgString)
      const blob = new Blob([cleanedSvg], { type: 'image/svg+xml;charset=utf-8' })
      this.triggerDownload(blob, 'NLW-Certificate.svg')
    } else if (this.imageUrl) {
      const a = document.createElement('a')
      a.href = this.imageUrl
      a.download = 'NLW-Certificate.svg'
      a.click()
    }
  }

  downloadPng(): void {
    this.raiseDownloadTelemetry('png')
    this.renderToCanvas((canvas: HTMLCanvasElement) => {
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png', 1.0)
      a.download = 'NLW-Certificate.png'
      a.click()
    })
  }

  downloadPdf(): void {
    this.raiseDownloadTelemetry('pdf')
    this.renderToCanvas((canvas: HTMLCanvasElement) => {
      const dataImg = canvas.toDataURL('image/png', 1.0)
      const imgRatio = canvas.width / canvas.height
      const orientation = imgRatio > 1 ? 'landscape' : 'portrait'
      const pdf = new jsPDF(orientation as any, 'px', 'a4')
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()
      const pdfRatio = pdfW / pdfH
      let imgW: number, imgH: number, offsetX: number, offsetY: number
      if (imgRatio > pdfRatio) {
        imgW = pdfW - 20
        imgH = imgW / imgRatio
        offsetX = 10
        offsetY = (pdfH - imgH) / 2
      } else {
        imgH = pdfH - 20
        imgW = imgH * imgRatio
        offsetX = (pdfW - imgW) / 2
        offsetY = 10
      }
      pdf.addImage(dataImg, 'PNG', offsetX, offsetY, imgW, imgH)
      pdf.save('NLW-Certificate.pdf')
    })
  }

  private renderToCanvas(callback: (canvas: HTMLCanvasElement) => void): void {
    if (this.rawSvgString) {
      let cleanedSvg = this.cleanSvgString(this.rawSvgString)
      // Ensure SVG has explicit width/height for proper canvas rendering
      // If SVG uses viewBox but no width/height, add them
      if (/<svg[^>]*viewBox/.test(cleanedSvg) && !/<svg[^>]*\bwidth=/.test(cleanedSvg)) {
        const vbMatch = cleanedSvg.match(/viewBox=["']\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)/)
        if (vbMatch) {
          this.svgWidth = Math.round(parseFloat(vbMatch[1]))
          this.svgHeight = Math.round(parseFloat(vbMatch[2]))
          cleanedSvg = cleanedSvg.replace(/<svg/, `<svg width="${this.svgWidth}" height="${this.svgHeight}"`)
        }
      }
      const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cleanedSvg)
      const img = new Image()
      img.onload = () => {
        const w = img.naturalWidth > 1 ? img.naturalWidth : this.svgWidth
        const h = img.naturalHeight > 1 ? img.naturalHeight : this.svgHeight
        const scale = 3
        const canvas = document.createElement('canvas')
        canvas.width = w * scale
        canvas.height = h * scale
        const ctx = canvas.getContext('2d')
        if (ctx) {
          // Fill white background so PNG is not transparent
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.scale(scale, scale)
          ctx.drawImage(img, 0, 0, w, h)
          callback(canvas)
        }
      }
      img.onerror = (err) => {
        console.error('SVG to canvas rendering failed:', err)
      }
      img.src = svgDataUrl
    } else if (this.imageUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || 1820
        canvas.height = img.naturalHeight || 1000
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          callback(canvas)
        }
      }
      img.onerror = (err) => {
        console.error('Image to canvas rendering failed:', err)
      }
      img.src = this.imageUrl
    }
  }

  private cleanSvgString(svg: string): string {
    // Strip BOM and any content before the XML declaration or SVG tag
    let cleaned = svg.replace(/^\uFEFF/, '').trim()
    const xmlDeclIndex = cleaned.indexOf('<?xml')
    const svgTagIndex = cleaned.indexOf('<svg')
    if (xmlDeclIndex > 0) {
      cleaned = cleaned.substring(xmlDeclIndex)
    } else if (xmlDeclIndex === -1 && svgTagIndex > 0) {
      cleaned = cleaned.substring(svgTagIndex)
    }
    // Extract width/height from the SVG for canvas sizing
    const widthMatch = cleaned.match(/<svg[^>]*\bwidth=["'](\d+)/)
    const heightMatch = cleaned.match(/<svg[^>]*\bheight=["'](\d+)/)
    if (widthMatch) { this.svgWidth = parseInt(widthMatch[1], 10) }
    if (heightMatch) { this.svgHeight = parseInt(heightMatch[1], 10) }
    return cleaned
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── Telemetry ───────────────────────────────────────

  private raiseDownloadTelemetry(format: string): void {
    this.events.raiseInteractTelemetry(
      {
        type: WsEvents.EnumInteractTypes.CLICK,
        id: 'download-nlw-certificate',
        subType: format,
      },
      {
        id: 'nlw-certificate',
        type: WsEvents.EnumInteractSubTypes.CERTIFICATE,
      }
    )
  }

  close(): void {
    this.dialogRef.close()
  }

  ngOnDestroy(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl)
    }
  }
}
